/* ============================================================
   The environment — one connected fictional Boca Raton property.
   Everything is procedural geometry: house, pool, palms, patio,
   condenser, air handler, ducts, vents, thermostat, airflow.
   ============================================================ */

import * as THREE from "three";
import {
  stuccoTexture, travertineTexture, gravelTexture, frondAlphaTexture,
  trunkTexture, louverTexture, dustSprite, plasterTexture,
} from "./textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class World {
  constructor(scene, tier) {
    this.scene = scene;
    this.tier = tier;
    this.time = 0;
    this.mats = [];
    this.geos = [];
    this.texs = [];
    this.sway = [];          // {obj, phase, amp} — wind-driven pivots

    this.texs.push(
      this.tStucco = stuccoTexture(),
      this.tTrav = travertineTexture(),
      this.tGravel = gravelTexture(),
      this.tFrond = frondAlphaTexture(),
      this.tTrunk = trunkTexture(),
      this.tLouver = louverTexture(),
      this.tDust = dustSprite(),
      this.tPlaster = plasterTexture(),
    );

    this._materials();
    this._sky();
    this._ground();
    this._house();
    this._interior();
    this._hvac();
    this._airflow();
    this._planting();
    this._dust();
    this._lights();
  }

  /* ---------- helpers ---------- */

  _m(mat) { this.mats.push(mat); return mat; }
  _g(geo) { this.geos.push(geo); return geo; }

  _mesh(geo, mat, x = 0, y = 0, z = 0, cast = true, receive = true) {
    const m = new THREE.Mesh(this._g(geo), this._m(mat));
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    this.scene.add(m);
    return m;
  }

  _box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }

  _materials() {
    this.mat = {
      stucco: this._m(new THREE.MeshStandardMaterial({ map: this.tStucco, color: 0xf2ead9, roughness: 0.94 })),
      plaster: this._m(new THREE.MeshStandardMaterial({ map: this.tPlaster, color: 0xe4d8c2, roughness: 0.95 })),
      fascia: this._m(new THREE.MeshStandardMaterial({ color: 0x161d22, roughness: 0.55, metalness: 0.15 })),
      mullion: this._m(new THREE.MeshStandardMaterial({ color: 0x11161a, roughness: 0.45, metalness: 0.5 })),
      teak: this._m(new THREE.MeshStandardMaterial({ color: 0x8a613a, roughness: 0.72 })),
      glass: this._m(new THREE.MeshStandardMaterial({
        color: 0x9fb8b4, roughness: 0.06, metalness: 0.1,
        transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
      })),
      travertine: this._m(new THREE.MeshStandardMaterial({ map: this.tTrav, color: 0xd9ccb4, roughness: 0.85 })),
      gravel: this._m(new THREE.MeshStandardMaterial({ map: this.tGravel, color: 0xb9b2a6, roughness: 1 })),
      sand: this._m(new THREE.MeshStandardMaterial({ color: 0xa8987c, roughness: 1 })),
      lawn: this._m(new THREE.MeshStandardMaterial({ color: 0x5c7154, roughness: 1 })),
      trunk: this._m(new THREE.MeshStandardMaterial({ map: this.tTrunk, color: 0xb09a7c, roughness: 0.9 })),
      frond: this._m(new THREE.MeshStandardMaterial({
        alphaMap: this.tFrond, color: 0x5d7a5c, roughness: 0.9,
        side: THREE.DoubleSide, alphaTest: 0.42,
      })),
      frondDark: this._m(new THREE.MeshStandardMaterial({
        alphaMap: this.tFrond, color: 0x0a1013, roughness: 1,
        side: THREE.DoubleSide, alphaTest: 0.4, transparent: true, opacity: 0.92, depthWrite: false,
      })),
      palmetto: this._m(new THREE.MeshStandardMaterial({ color: 0x4c6a50, roughness: 0.92, side: THREE.DoubleSide })),
      metal: this._m(new THREE.MeshStandardMaterial({ color: 0x5a6165, roughness: 0.42, metalness: 0.72 })),
      duct: this._m(new THREE.MeshStandardMaterial({ color: 0xb6bdc1, roughness: 0.34, metalness: 0.82 })),
      fabric: this._m(new THREE.MeshStandardMaterial({ color: 0xcfc6b6, roughness: 0.96 })),
      rug: this._m(new THREE.MeshStandardMaterial({ color: 0x2b3136, roughness: 1 })),
      floor: this._m(new THREE.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.5, metalness: 0.05 })),
      screen: this._m(new THREE.MeshStandardMaterial({ color: 0x0c1114, emissive: 0x8fc4bb, emissiveIntensity: 1.4, roughness: 0.4 })),
      cove: this._m(new THREE.MeshStandardMaterial({ color: 0x1a1208, emissive: 0xffb46b, emissiveIntensity: 0 })),
      bulb: this._m(new THREE.MeshStandardMaterial({ color: 0x1a1208, emissive: 0xffc38a, emissiveIntensity: 0 })),
    };
  }

  /* ---------- sky dome ---------- */

  _sky() {
    this.skyUni = {
      top: { value: new THREE.Color(0x7fa3b8) },
      hor: { value: new THREE.Color(0xe8d3b0) },
      sunDir: { value: V(0.55, 0.42, 0.72).normalize() },
      sunCol: { value: new THREE.Color(0xffd9a8) },
      haze: { value: 0.5 },
    };
    const sky = new THREE.Mesh(
      this._g(new THREE.SphereGeometry(220, 32, 16)),
      this._m(new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: this.skyUni,
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float haze;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, -1.0, 1.0);
            float t = pow(clamp(h * 1.15 + 0.12, 0.0, 1.0), 0.62);
            vec3 col = mix(hor, top, t);
            float sd = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += sunCol * (pow(sd, 220.0) * 1.6 + pow(sd, 12.0) * 0.22 * haze);
            col = mix(col, hor, smoothstep(0.06, -0.12, h) * 0.85);
            gl_FragColor = vec4(col, 1.0);
          }`,
      })),
    );
    sky.renderOrder = -10;
    this.sky = sky;
  }

  /* ---------- ground, patio, pool ---------- */

  _ground() {
    const ground = this._mesh(new THREE.PlaneGeometry(240, 240), this.mat.sand, 0, -0.04, 0, false, true);
    ground.rotation.x = -Math.PI / 2;

    const lawn = this._mesh(new THREE.PlaneGeometry(26, 16), this.mat.lawn, -4, -0.02, 12, false, true);
    lawn.rotation.x = -Math.PI / 2;
    const lawn2 = this._mesh(new THREE.PlaneGeometry(30, 12), this.mat.lawn, 4, -0.02, 20, false, true);
    lawn2.rotation.x = -Math.PI / 2;

    const patio = this._mesh(new THREE.PlaneGeometry(21, 9), this.mat.travertine, 0, 0.0, 6.4, false, true);
    patio.rotation.x = -Math.PI / 2;
    const walk = this._mesh(new THREE.PlaneGeometry(5, 8), this.mat.gravel, -10.2, -0.01, -2.4, false, true);
    walk.rotation.x = -Math.PI / 2;

    // pool basin + animated water
    this._mesh(this._box(4.4, 1.1, 6.4), this._m(new THREE.MeshStandardMaterial({ color: 0x16333a, roughness: 0.4 })), 0, -0.55, 6.5, false, true);
    this.waterUni = {
      time: { value: 0 },
      sunDir: { value: V(0.5, 0.4, 0.7).normalize() },
      sunCol: { value: new THREE.Color(0xffd9a8) },
      sky: { value: new THREE.Color(0x86a9bd) },
      deep: { value: new THREE.Color(0x12414a) },
      glow: { value: new THREE.Color(0xffb46b) },
      glowAmt: { value: 0 },
      wave: { value: 1 },
    };
    this.water = this._mesh(new THREE.PlaneGeometry(4.0, 6.0, 24, 24), this._m(new THREE.ShaderMaterial({
      uniforms: this.waterUni, transparent: true, fog: false,
      vertexShader: `
        uniform float time; uniform float wave;
        varying vec3 vN; varying vec3 vW; varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float w1 = sin(p.x * 3.1 + time * 0.9) * 0.012;
          float w2 = sin(p.y * 2.3 - time * 0.7) * 0.010;
          float w3 = sin((p.x + p.y) * 5.2 + time * 1.4) * 0.005;
          p.z += (w1 + w2 + w3) * wave;
          float dx = (cos(p.x * 3.1 + time * 0.9) * 3.1 * 0.012 + cos((p.x + p.y) * 5.2 + time * 1.4) * 5.2 * 0.005) * wave;
          float dy = (cos(p.y * 2.3 - time * 0.7) * 2.3 * 0.010 + cos((p.x + p.y) * 5.2 + time * 1.4) * 5.2 * 0.005) * wave;
          vN = normalize(mat3(modelMatrix) * vec3(-dx, -dy, 1.0));
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 sky; uniform vec3 deep; uniform vec3 glow; uniform float glowAmt;
        varying vec3 vN; varying vec3 vW; varying vec2 vUv;
        void main() {
          vec3 N = normalize(vN);
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 col = mix(deep, sky, fres * 0.9);
          vec3 R = reflect(-V, N);
          float spec = pow(max(dot(R, normalize(sunDir)), 0.0), 180.0);
          col += sunCol * spec * 1.4;
          col += glow * glowAmt * smoothstep(0.55, 1.0, vUv.y) * (0.35 + 0.3 * fres);
          gl_FragColor = vec4(col, 0.94);
        }`,
    })), 0, -0.06, 6.5, false, false);
    this.water.rotation.x = -Math.PI / 2;

    const coping = this._m(new THREE.MeshStandardMaterial({ color: 0xd6cab2, roughness: 0.8 }));
    for (const [w, d, x, z] of [[4.7, 0.35, 0, 3.35], [4.7, 0.35, 0, 9.65], [0.35, 6.6, -2.2, 6.5], [0.35, 6.6, 2.2, 6.5]]) {
      this._mesh(this._box(w, 0.12, d), coping, x, 0.03, z, false, true);
    }
  }

  /* ---------- the house ---------- */

  _house() {
    const H = 3.4;
    const stucco = this.mat.stucco;
    this._mesh(this._box(16, H, 0.3), stucco, 0, H / 2, -6);          // north
    this._mesh(this._box(0.3, H, 8), stucco, -8, H / 2, -2);          // west
    this._mesh(this._box(0.3, H, 8), stucco, 8, H / 2, -2);           // east
    this._mesh(this._box(4.2, H, 0.3), stucco, -5.9, H / 2, 2);       // south piers
    this._mesh(this._box(4.2, H, 0.3), stucco, 5.9, H / 2, 2);
    this._mesh(this._box(16, 0.5, 0.3), stucco, 0, H - 0.25, 2);      // south header

    // east wing with teak screen
    this._mesh(this._box(6, 3.0, 6), stucco, 11, 1.5, -2);
    for (let i = 0; i < 16; i++) {
      this._mesh(this._box(0.09, 2.6, 0.09), this.mat.teak, 8.4 + i * 0.36, 1.4, 1.05, true, false);
    }
    this._mesh(this._box(6.6, 0.28, 6.8), this.mat.fascia, 11, 3.12, -2);

    // roof slab with deep overhang + cove light strip
    this.roof = this._mesh(this._box(19.2, 0.34, 11.4), this.mat.fascia, 0, H + 0.17, -1.9);
    this.coveStrip = this._mesh(this._box(17.5, 0.05, 0.12), this.mat.cove, 0, H - 0.02, 3.6, false, false);

    // south glass wall + mullions
    const glass = this._mesh(new THREE.PlaneGeometry(7.6, 2.9), this.mat.glass, 0, 1.6, 1.98, false, false);
    glass.renderOrder = 5;
    for (let x = -3.8; x <= 3.81; x += 1.9) {
      this._mesh(this._box(0.09, 2.95, 0.12), this.mat.mullion, x, 1.6, 1.97, false, false);
    }
    this._mesh(this._box(7.7, 0.1, 0.16), this.mat.mullion, 0, 0.12, 1.97, false, false);
    const gw = this._mesh(new THREE.PlaneGeometry(2.4, 1.6), this.mat.glass, -7.98, 1.7, -1.5, false, false);
    gw.rotation.y = Math.PI / 2;
    gw.renderOrder = 5;

    // garden wall (west) — foreground for the LOCAL chapter
    this._mesh(this._box(0.35, 2.3, 11), stucco, -12.6, 1.15, 8.5);
    this._mesh(this._box(0.5, 0.1, 11.3), this.mat.fascia, -12.6, 2.34, 8.5, false, false);
  }

  /* ---------- interior ---------- */

  _interior() {
    const floor = this._mesh(new THREE.PlaneGeometry(15.6, 7.7), this.mat.floor, 0, 0.06, -1.9, false, true);
    floor.rotation.x = -Math.PI / 2;
    const ceil = this._mesh(new THREE.PlaneGeometry(15.6, 7.7), this.mat.plaster, 0, 3.34, -1.9, false, true);
    ceil.rotation.x = Math.PI / 2;

    const rug = this._mesh(new THREE.PlaneGeometry(4.6, 3.0), this.mat.rug, -0.5, 0.075, -1.6, false, true);
    rug.rotation.x = -Math.PI / 2;
    this._mesh(this._box(2.8, 0.42, 1.05), this.mat.fabric, -0.5, 0.28, -2.2);
    this._mesh(this._box(2.8, 0.55, 0.24), this.mat.fabric, -0.5, 0.72, -2.66);
    this._mesh(this._box(0.9, 0.34, 0.9), this.mat.travertine, -0.4, 0.24, -1.1);
    this._mesh(this._box(2.6, 0.6, 0.5), this.mat.teak, -3.6, 0.36, -5.5);

    // linear ceiling diffusers aligned with the duct branches
    const slot = this._m(new THREE.MeshStandardMaterial({ color: 0x14181b, roughness: 0.6 }));
    this.ventGlow = [];
    for (const x of [-3, 0, 3]) {
      this._mesh(this._box(0.22, 0.04, 3.2), slot, x, 3.3, -2.2, false, false);
      const g = this._mesh(new THREE.PlaneGeometry(0.26, 3.2), this._m(new THREE.MeshBasicMaterial({
        color: 0x9fd8ce, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      })), x, 3.27, -2.2, false, false);
      g.rotation.x = Math.PI / 2;
      this.ventGlow.push(g);
    }
    this._mesh(this._box(0.06, 0.7, 1.4), slot, 7.82, 2.5, -3.4, false, false); // return grille

    // sheer curtain lifted by supply air
    this.curtainUni = { time: { value: 0 }, amp: { value: 0.35 } };
    this.curtain = this._mesh(new THREE.PlaneGeometry(1.5, 2.7, 12, 16), this._m(new THREE.ShaderMaterial({
      uniforms: this.curtainUni, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      vertexShader: `
        uniform float time; uniform float amp;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float fall = smoothstep(0.5, -0.5, p.y);
          p.z += sin(p.y * 2.2 + time * 1.1) * 0.09 * amp * fall
               + sin(p.x * 5.0 - time * 0.8) * 0.05 * amp * fall;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float a = 0.34 * smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
          gl_FragColor = vec4(vec3(0.93, 0.91, 0.86), a);
        }`,
    })), -3.1, 1.62, 1.72, false, false);
    this.curtain.renderOrder = 6;

    this.bulbs = [];
    for (const [x, z] of [[-3, -1], [1, -2.5], [4.5, -3.5], [-5.5, -3.5]]) {
      this.bulbs.push(this._mesh(new THREE.SphereGeometry(0.06, 8, 6), this.mat.bulb, x, 3.28, z, false, false));
    }
  }

  /* ---------- HVAC equipment ---------- */

  _hvac() {
    this._mesh(this._box(0.12, 3.3, 2.6), this.mat.plaster, 5.4, 1.65, -4.6);   // closet wall
    this._mesh(this._box(2.6, 0.12, 2.6), this.mat.plaster, 6.7, 3.28, -4.6);   // closet header
    this._mesh(this._box(0.75, 1.5, 0.75), this.mat.metal, 6.9, 0.85, -4.6);    // air handler

    this._mesh(this._box(0.6, 0.5, 0.6), this.mat.duct, 6.9, 1.85, -4.6);       // plenum
    const trunk = this._mesh(new THREE.CylinderGeometry(0.2, 0.2, 10.4, 14), this.mat.duct, 1.7, 2.95, -4.6);
    trunk.rotation.z = Math.PI / 2;
    for (const x of [-3, 0, 3]) {
      const run = this._mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.5, 10), this.mat.duct, x, 2.95, -3.4);
      run.rotation.x = Math.PI / 2;
      this._mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 10), this.mat.duct, x, 3.1, -2.2);
    }
    const ret = this._mesh(new THREE.CylinderGeometry(0.26, 0.26, 4.4, 14), this.mat.duct, 6.2, 2.8, -3.4);
    ret.rotation.x = Math.PI / 2;

    this._mesh(this._box(0.05, 0.2, 0.14), this.mat.screen, -7.82, 1.42, -1.2, false, false); // thermostat

    // condenser, west side yard
    const [cx, cz] = [-10.4, -2.6];
    this._mesh(this._box(1.5, 0.12, 1.5), this.mat.gravel, cx, 0.06, cz, false, true);
    this._mesh(this._box(1.0, 0.86, 1.0), this._m(new THREE.MeshStandardMaterial({ map: this.tLouver, color: 0x8b9296, roughness: 0.5, metalness: 0.6 })), cx, 0.55, cz);
    this._mesh(this._box(1.04, 0.1, 1.04), this.mat.metal, cx, 1.02, cz);

    this.fan = new THREE.Group();
    this.fan.position.set(cx, 1.09, cz);
    this.fan.add(new THREE.Mesh(this._g(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10)), this._m(this.mat.metal)));
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(this._g(new THREE.BoxGeometry(0.36, 0.015, 0.13)), this._m(this.mat.metal));
      blade.position.x = 0.24;
      blade.rotation.y = 0.5;
      const pivot = new THREE.Group();
      pivot.rotation.y = (i / 3) * Math.PI * 2;
      pivot.add(blade);
      this.fan.add(pivot);
    }
    this.scene.add(this.fan);
    for (const r of [0.16, 0.3, 0.44]) {
      const ring = new THREE.Mesh(this._g(new THREE.TorusGeometry(r, 0.012, 6, 24)), this._m(this.mat.metal));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, 1.1, cz);
      this.scene.add(ring);
    }
    const line = this._mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), this._m(new THREE.MeshStandardMaterial({ color: 0x2a2d2f, roughness: 0.7 })), -9.1, 0.7, -2.6);
    line.rotation.z = Math.PI / 2;
  }
}

/* ---------- airflow visualization (appended) ---------- */

Object.assign(World.prototype, {
  _airflow() {
    this.flowUni = { time: { value: 0 }, mix_: { value: 0 } };
    const flowMat = (color, speed) => this._m(new THREE.ShaderMaterial({
      uniforms: {
        time: this.flowUni.time,
        mix_: this.flowUni.mix_,
        color: { value: new THREE.Color(color) },
        speed: { value: speed },
      },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float time; uniform float mix_; uniform vec3 color; uniform float speed;
        varying vec2 vUv;
        void main() {
          float f = fract(vUv.x * 7.0 - time * speed);
          float band = smoothstep(0.0, 0.18, f) * smoothstep(0.55, 0.25, f);
          float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
          gl_FragColor = vec4(color, band * edge * mix_ * 0.55);
        }`,
    }));

    const tube = (pts, radius, mat) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => V(p[0], p[1], p[2])));
      const m = new THREE.Mesh(this._g(new THREE.TubeGeometry(curve, 72, radius, 8, false)), mat);
      m.renderOrder = 8;
      this.scene.add(m);
      return m;
    };

    // supply: handler → trunk → branches → diffusers → room (cool)
    this.supplyMat = flowMat(0x8fd8ce, 0.55);
    tube([[6.9, 1.9, -4.6], [6.9, 2.6, -4.6], [4, 2.95, -4.6], [-2, 2.95, -4.6]], 0.13, this.supplyMat);
    for (const x of [-3, 0, 3]) {
      tube([[x, 2.95, -4.6], [x, 2.95, -2.6], [x, 3.05, -2.2], [x, 2.2, -1.6], [x, 1.4, -0.6]], 0.09, this.supplyMat);
    }
    // return: room → grille → handler (warm)
    this.returnMat = flowMat(0xe0a06a, 0.4);
    tube([[-1, 1.5, -1.5], [3, 1.9, -2.6], [6.5, 2.4, -3.2], [7.6, 2.5, -3.4], [7.2, 2.0, -4.2], [6.9, 1.6, -4.6]], 0.12, this.returnMat);
  },

  /* ---------- planting ---------- */

  _frondGeo() {
    if (this._frond) return this._frond;
    const seg = 7, w = 0.16, len = 2.6;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const x = t * len;
      const y = -Math.pow(t, 1.7) * 1.15;
      const half = w * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.12)));
      pos.push(x, y, -half, x, y, half);
      uv.push(t, 0, t, 1);
      if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    this._frond = this._g(g);
    return g;
  },

  _palm(x, z, h, lean, fronds) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const curve = new THREE.CatmullRomCurve3([
      V(0, 0, 0), V(lean * 0.3, h * 0.4, lean * 0.2), V(lean * 0.7, h * 0.75, lean * 0.45), V(lean, h, lean * 0.6),
    ]);
    const trunk = new THREE.Mesh(this._g(new THREE.TubeGeometry(curve, 12, 0.14, 7, false)), this._m(this.mat.trunk));
    trunk.castShadow = true;
    g.add(trunk);

    const crown = new THREE.Group();
    crown.position.set(lean, h, lean * 0.6);
    const geo = this._frondGeo();
    for (let i = 0; i < fronds; i++) {
      const f = new THREE.Mesh(geo, this._m(this.mat.frond));
      const a = (i / fronds) * Math.PI * 2 + Math.random() * 0.4;
      f.rotation.set(0, a, -0.55 + Math.random() * 0.5);
      f.scale.setScalar(0.85 + Math.random() * 0.5);
      f.castShadow = true;
      crown.add(f);
    }
    g.add(crown);
    this.sway.push({ obj: crown, phase: Math.random() * 7, amp: 0.028 });
    this.scene.add(g);
  },

  _palmetto(x, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const geo = this._g(new THREE.PlaneGeometry(1.1, 1.0, 1, 3));
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(geo, this._m(this.mat.palmetto));
      leaf.rotation.set(-0.5 - Math.random() * 0.5, (i / 7) * Math.PI * 2, 0);
      leaf.position.y = 0.42;
      leaf.scale.setScalar(s * (0.8 + Math.random() * 0.5));
      leaf.castShadow = true;
      g.add(leaf);
    }
    this.sway.push({ obj: g, phase: Math.random() * 7, amp: 0.02 });
    this.scene.add(g);
  },

  _hedge(x, z, w, d) {
    this._mesh(this._box(w, 0.55, d), this._m(new THREE.MeshStandardMaterial({ color: 0x46603f, roughness: 1 })), x, 0.28, z);
  },

  _planting() {
    const fr = this.tier.fronds;
    this._palm(-6.5, 7.0, 7.2, 0.8, fr);
    this._palm(-9.0, 4.2, 5.6, -0.6, fr);
    this._palm(5.6, 8.2, 8.0, -0.9, fr);
    this._palm(9.5, 5.4, 6.2, 0.7, fr);
    this._palm(-3.5, 12.5, 6.8, 0.5, fr);
    this._palm(13.5, 9.0, 7.4, -0.5, fr);
    this._palm(-16.0, 1.0, 8.4, 0.9, Math.max(6, fr - 4));
    this._palm(18.0, -1.0, 7.8, -0.8, Math.max(6, fr - 4));

    this._palmetto(-11.6, 6.0, 1.1);
    this._palmetto(-11.9, 9.5, 0.9);
    this._palmetto(-9.4, -1.4, 1.0);
    this._palmetto(-11.2, -3.6, 0.8);
    this._palmetto(3.4, 10.6, 1.0);
    this._palmetto(-4.6, 10.2, 0.85);
    this._palmetto(7.6, 3.4, 0.9);

    this._hedge(-6, 16.5, 8, 0.8);
    this._hedge(6, 17.5, 10, 0.8);
    this._hedge(-13.5, -6, 0.8, 8);

    // foreground fronds that brush the lens between chapters
    const fg1 = new THREE.Mesh(this._frondGeo(), this._m(this.mat.frondDark));
    fg1.position.set(4.6, 3.1, 16.5);
    fg1.rotation.set(0.2, -2.4, -2.5);
    fg1.scale.setScalar(2.6);
    fg1.renderOrder = 20;
    this.scene.add(fg1);
    this.sway.push({ obj: fg1, phase: 1.3, amp: 0.02 });

    const fg2 = new THREE.Mesh(this._frondGeo(), this._m(this.mat.frondDark));
    fg2.position.set(-6.4, 2.6, 9.6);
    fg2.rotation.set(0.1, 0.7, -2.9);
    fg2.scale.setScalar(2.2);
    fg2.renderOrder = 20;
    this.scene.add(fg2);
    this.sway.push({ obj: fg2, phase: 3.7, amp: 0.02 });
  },

  /* ---------- airborne particles ---------- */

  _dust() {
    const n = this.tier.dust;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = Math.random() * 6.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 44 + 4;
      seed[i] = Math.random();
    }
    const g = this._g(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    this.dustUni = {
      time: { value: 0 },
      tex: { value: this.tDust },
      opacity: { value: 0.3 },
      tint: { value: new THREE.Color(0xe8d9bd) },
    };
    this.dust = new THREE.Points(g, this._m(new THREE.ShaderMaterial({
      uniforms: this.dustUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float time;
        attribute float aSeed;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + time * (0.05 + aSeed * 0.07), 6.5);
          p.x += sin(time * 0.16 + aSeed * 21.0) * 0.7;
          p.z += cos(time * 0.13 + aSeed * 17.0) * 0.7;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          gl_PointSize = (26.0 / dist) * (0.6 + aSeed * 0.9);
          vA = smoothstep(2.0, 6.0, dist) * smoothstep(46.0, 26.0, dist);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D tex; uniform float opacity; uniform vec3 tint;
        varying float vA;
        void main() {
          float a = texture2D(tex, gl_PointCoord).a * vA * opacity;
          gl_FragColor = vec4(tint, a);
        }`,
    })));
    this.dust.renderOrder = 9;
    this.dust.frustumCulled = false;
  },

  /* ---------- lights ---------- */

  _lights() {
    this.sun = new THREE.DirectionalLight(0xffd9a8, 3.0);
    this.sun.position.set(30, 26, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -26;
    this.sun.shadow.camera.right = 26;
    this.sun.shadow.camera.top = 26;
    this.sun.shadow.camera.bottom = -26;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbcd4e0, 0x6b5f4c, 0.55);
    this.scene.add(this.hemi);

    this.innerLights = [];
    for (const [x, z] of [[-3, -1.5], [2, -3], [5.5, -4]]) {
      const p = new THREE.PointLight(0xffb46b, 0, 9, 2);
      p.position.set(x, 3.0, z);
      this.scene.add(p);
      this.innerLights.push(p);
    }
    this.poolLight = new THREE.PointLight(0x9fd8ce, 0, 7, 2);
    this.poolLight.position.set(0, -0.3, 6.5);
    this.scene.add(this.poolLight);
  },
});

/* ---------- per-frame behaviour (appended) ---------- */

Object.assign(World.prototype, {
  /* env: { sunDir:Vector3, sunCol:Color, sunInt, skyTop:Color, skyHor:Color,
            hemi, interior, pool, airflow, wind } — computed by scene.js */
  applyEnvironment(env) {
    this.sun.color.copy(env.sunCol);
    this.sun.intensity = env.sunInt;
    this.sun.position.copy(env.sunDir).multiplyScalar(60);
    this.sun.target.position.set(0, 1, 0);

    this.hemi.intensity = env.hemi;
    this.hemi.color.copy(env.skyTop);

    this.skyUni.top.value.copy(env.skyTop);
    this.skyUni.hor.value.copy(env.skyHor);
    this.skyUni.sunDir.value.copy(env.sunDir);
    this.skyUni.sunCol.value.copy(env.sunCol);

    this.waterUni.sunDir.value.copy(env.sunDir);
    this.waterUni.sunCol.value.copy(env.sunCol);
    this.waterUni.sky.value.copy(env.skyTop).lerp(env.skyHor, 0.5);
    this.waterUni.glowAmt.value = env.pool;

    for (const l of this.innerLights) l.intensity = env.interior * 5.5;
    this.poolLight.intensity = env.pool * 3.2;
    this.mat.cove.emissiveIntensity = env.interior * 3.4;
    this.mat.bulb.emissiveIntensity = env.interior * 2.6;
  },

  update(dt, env, motion) {
    this.time += dt * motion;
    const t = this.time;

    // condenser fan — spins with cooling load, idles at night
    this.fan.rotation.y += dt * motion * (2.2 + env.airflow * 9.0 + env.interior * 0.4);

    // wind sway on crowns, palmettos and foreground fronds
    const w = env.wind * motion;
    for (const s of this.sway) {
      s.obj.rotation.x = Math.sin(t * 0.5 + s.phase) * s.amp * w;
      s.obj.rotation.z = Math.cos(t * 0.37 + s.phase * 1.7) * s.amp * 1.3 * w;
    }

    this.waterUni.time.value = t;
    this.curtainUni.time.value = t;
    this.curtainUni.amp.value = 0.35 + env.airflow * 1.1;
    this.flowUni.time.value = t;
    this.flowUni.mix_.value = env.airflow;
    this.dustUni.time.value = t;
    this.dustUni.opacity.value = 0.18 + env.airflow * 0.1 + (1 - env.interior) * 0.14;

    for (const g of this.ventGlow) g.material.opacity = env.airflow * 0.45;
  },

  setWaterQuality(on) {
    this.waterUni.wave.value = on ? 1 : 0.15;
  },

  dispose() {
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
    for (const t of this.texs) t.dispose();
    this.scene.clear();
  },
});
