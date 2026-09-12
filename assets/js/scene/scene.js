/* ============================================================
   Engine — renderer, quality tiers, environment interpolation,
   frame loop and the performance watchdog that degrades
   gracefully (and finally hands over to the image fallback).
   ============================================================ */

import * as THREE from "three";
import { World } from "./world.js";
import { Post } from "./post.js";
import { CameraRig } from "./camera.js";
import { SCENE } from "../config.js";

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const smooth = (a, b, x) => smoother(Math.min(1, Math.max(0, (x - a) / (b - a))));

export class Engine {
  constructor(canvas, { tier = 0, reduced = false, onReady, onFail } = {}) {
    this.canvas = canvas;
    this.tier = tier;
    this.reduced = reduced;
    this.onReady = onReady;
    this.onFail = onFail;
    this.alive = true;
    this.frames = 0;
    this.fpsAcc = 0;
    this.badWindows = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0d1215, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd9c6a8, 0.012);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

    this.world = new World(this.scene, SCENE.tiers[this.tier]);
    this.post = new Post(this.renderer, {
      bloom: SCENE.tiers[this.tier].bloom,
      samples: SCENE.tiers[this.tier].samples,
    });

    // pre-parse light keys
    this.L = SCENE.light.map(k => ({
      sun: new THREE.Vector3(...k.sun).normalize(),
      sunCol: new THREE.Color(k.sunCol),
      sunInt: k.sunInt,
      skyTop: new THREE.Color(k.skyTop),
      skyHor: new THREE.Color(k.skyHor),
      fog: new THREE.Color(k.fog),
      fogD: k.fogD,
      hemi: k.hemi,
      interior: k.interior,
      pool: k.pool,
      exposure: k.exposure,
      bloom: k.bloom,
    }));
    this.env = {
      sunDir: new THREE.Vector3(), sunCol: new THREE.Color(), skyTop: new THREE.Color(),
      skyHor: new THREE.Color(), sunInt: 3, hemi: 0.5, interior: 0, pool: 0,
      airflow: 0, wind: 1, exposure: 1, bloom: 0.6, fogD: 0.012, fogCol: new THREE.Color(),
    };

    // image-based lighting: the sky dome doubles as a tiny environment map,
    // refreshed whenever the chapter (time of day) changes
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(this.world.sky.geometry, this.world.sky.material));
    this.envChapter = -1;

    this.canvas.addEventListener("webglcontextlost", e => {
      e.preventDefault();
      this.shutdown("context lost");
    });

    this.clock = new THREE.Clock();
    this.time = 0;

    this.applyTier(this.tier);
    this.resize();
  }

  /* ---------- quality tiers ---------- */

  applyTier(t) {
    this.tier = t;
    const cfg = SCENE.tiers[Math.min(t, SCENE.tiers.length - 1)];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dpr));
    const shadowsOn = cfg.shadows > 0;
    if (this.renderer.shadowMap.enabled !== shadowsOn) {
      this.renderer.shadowMap.enabled = shadowsOn;
      this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    }
    if (shadowsOn) this.world.sun.shadow.mapSize.set(cfg.shadows, cfg.shadows);
    this.world.sun.castShadow = shadowsOn;
    this.post.setEnabled(cfg.bloom);
    this.post.setGrain(this.reduced ? 0 : 0.045);
    this.world.setWaterQuality(cfg.water);
    this.world.dust.visible = cfg.dust > 0;
    this.resize();
  }

  degrade() {
    if (this.tier >= SCENE.tiers.length - 1) { this.shutdown("performance"); return; }
    this.applyTier(this.tier + 1);
  }

  /* ---------- environment sampling ---------- */

  envAt(p) {
    const i = Math.min(Math.floor(p), this.L.length - 2);
    const t = smoother(Math.min(1, Math.max(0, p - i)));
    const a = this.L[i], b = this.L[i + 1], e = this.env;
    e.sunDir.lerpVectors(a.sun, b.sun, t).normalize();
    e.sunCol.copy(a.sunCol).lerp(b.sunCol, t);
    e.skyTop.copy(a.skyTop).lerp(b.skyTop, t);
    e.skyHor.copy(a.skyHor).lerp(b.skyHor, t);
    e.fogCol.copy(a.fog).lerp(b.fog, t);
    e.sunInt = a.sunInt + (b.sunInt - a.sunInt) * t;
    e.hemi = a.hemi + (b.hemi - a.hemi) * t;
    e.interior = a.interior + (b.interior - a.interior) * t;
    e.pool = a.pool + (b.pool - a.pool) * t;
    e.exposure = a.exposure + (b.exposure - a.exposure) * t;
    e.bloom = a.bloom + (b.bloom - a.bloom) * t;
    e.fogD = a.fogD + (b.fogD - a.fogD) * t;
    // airflow diagram lives in chapter 04
    e.airflow = smooth(2.15, 2.85, p) * (1 - smooth(4.15, 4.9, p));
    e.wind = 1 - 0.45 * smooth(5.5, 7, p);
    return e;
  }

  refreshEnvironment(p) {
    const ch = Math.min(Math.round(p), this.L.length - 1);
    if (ch === this.envChapter) return;
    this.envChapter = ch;
    try {
      const rt = this.pmrem.fromScene(this.envScene, 0.04, 0.1, 500);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt;
      this.scene.environment = rt.texture;
      this.scene.environmentIntensity = 0.5;
    } catch (e) { /* IBL is an enhancement only */ }
  }

  /* ---------- lifecycle ---------- */

  attachRig(rig) { this.rig = rig; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.resize(
      Math.floor(w * this.renderer.getPixelRatio()),
      Math.floor(h * this.renderer.getPixelRatio()),
    );
    if (this.rig) this.rig.recalc();
  }

  start() {
    const loop = () => {
      if (!this.alive) return;
      this.raf = requestAnimationFrame(loop);
      if (document.hidden) { this.clock.getDelta(); return; }

      const dt = Math.min(0.05, this.clock.getDelta());
      this.time += dt * (this.reduced ? 0 : 1);
      const motion = this.reduced ? 0 : 1;

      if (this.rig) this.rig.update(dt, this.time, motion);
      const p = this.rig ? this.rig.p : 0;
      const env = this.envAt(p);

      this.scene.fog.color.copy(env.fogCol);
      this.scene.fog.density = env.fogD;
      this.post.setExposure(env.exposure);
      this.post.setStrength(env.bloom);

      this.world.applyEnvironment(env);
      env.camPos = this.camera.position;
      this.world.update(dt, env, motion);
      this.refreshEnvironment(p);

      this.post.render(this.scene, this.camera, this.time);

      // watchdog
      this.frames++;
      this.fpsAcc += dt;
      if (this.fpsAcc >= SCENE.fpsWindowSec) {
        const fps = this.frames / this.fpsAcc;
        this.frames = 0; this.fpsAcc = 0;
        if (fps < SCENE.fpsFloor && this.time > 4) {
          if (++this.badWindows >= 2) { this.badWindows = 0; this.degrade(); }
        } else {
          this.badWindows = 0;
        }
      }

      if (!this.ready) {
        this.ready = true;
        this.onReady && this.onReady();
      }
    };
    loop();
  }

  shutdown(reason) {
    if (!this.alive) return;
    this.alive = false;
    cancelAnimationFrame(this.raf);
    try {
      this.post.dispose();
      this.world.dispose();
      this.renderer.dispose();
    } catch (e) { /* disposal is best-effort */ }
    this.onFail && this.onFail(reason);
  }
}
