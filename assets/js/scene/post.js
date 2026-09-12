/* ============================================================
   Minimal cinematic post stack: bright-pass → separable blur
   → composite (ACES tonemap + bloom + vignette + grain).
   Hand-rolled on purpose: no addon dependencies, full control,
   and it can be switched off entirely on low-power devices.
   ============================================================ */

import * as THREE from "three";

const VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Post {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.enabled = opts.bloom !== false;
    this.strength = opts.strength ?? 0.6;

    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true };
    if (opts.samples) rtOpts.samples = opts.samples;
    this.rtScene = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    this.rtA = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rtB = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });

    this.fsScene = new THREE.Scene();
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.fsScene.add(this.quad);

    this.matBright = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, threshold: { value: 0.72 } },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D tSrc; uniform float threshold;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tSrc, vUv).rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor = vec4(c * smoothstep(threshold, threshold + 0.35, l), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });

    this.matBlur = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, texel: { value: new THREE.Vector2() } },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D tSrc; uniform vec2 dir; uniform vec2 texel;
        varying vec2 vUv;
        void main() {
          vec2 o = dir * texel;
          vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
          c += (texture2D(tSrc, vUv + o * 1.3846).rgb + texture2D(tSrc, vUv - o * 1.3846).rgb) * 0.3162162;
          c += (texture2D(tSrc, vUv + o * 3.2308).rgb + texture2D(tSrc, vUv - o * 3.2308).rgb) * 0.0702702;
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });

    this.matComp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null },
        strength: { value: this.strength }, exposure: { value: 1.0 },
        time: { value: 0 }, grain: { value: 0.05 }, vignette: { value: 0.32 },
      },
      vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D tScene; uniform sampler2D tBloom;
        uniform float strength; uniform float exposure; uniform float time;
        uniform float grain; uniform float vignette;
        varying vec2 vUv;
        vec3 aces(vec3 x) {
          return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
        }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          vec3 c = texture2D(tScene, vUv).rgb * exposure;
          c += texture2D(tBloom, vUv).rgb * strength;
          c = aces(c);
          vec2 q = vUv - 0.5;
          c *= 1.0 - vignette * dot(q, q) * 1.9;
          c += (hash(vUv * 913.0 + fract(time) * 61.0) - 0.5) * grain;
          c = pow(max(c, 0.0), vec3(0.4545));
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
  }

  resize(w, h) {
    this.rtScene.setSize(w, h);
    const qw = Math.max(2, Math.floor(w / 4)), qh = Math.max(2, Math.floor(h / 4));
    this.rtA.setSize(qw, qh);
    this.rtB.setSize(qw, qh);
    this.matBlur.uniforms.texel.value.set(1 / qw, 1 / qh);
  }

  _pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.fsScene, this.fsCam);
  }

  render(scene, camera, time) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(scene, camera);

    if (this.enabled) {
      this.matBright.uniforms.tSrc.value = this.rtScene.texture;
      this._pass(this.matBright, this.rtA);
      this.matBlur.uniforms.tSrc.value = this.rtA.texture;
      this.matBlur.uniforms.dir.value.set(1, 0);
      this._pass(this.matBlur, this.rtB);
      this.matBlur.uniforms.tSrc.value = this.rtB.texture;
      this.matBlur.uniforms.dir.value.set(0, 1);
      this._pass(this.matBlur, this.rtA);

      this.matComp.uniforms.tScene.value = this.rtScene.texture;
      this.matComp.uniforms.tBloom.value = this.rtA.texture;
      this.matComp.uniforms.time.value = time;
    } else {
      this.matComp.uniforms.tScene.value = this.rtScene.texture;
      this.matComp.uniforms.tBloom.value = this.rtA.texture;
      this.matComp.uniforms.strength.value = 0;
    }
    this.matComp.uniforms.strength.value = this.enabled ? this.strength : 0;
    this._pass(this.matComp, null);
  }

  setEnabled(on) { this.enabled = on; }
  setExposure(e) { this.matComp.uniforms.exposure.value = e; }
  setStrength(s) { this.strength = s; }
  setGrain(g) { this.matComp.uniforms.grain.value = g; }

  dispose() {
    this.rtScene.dispose(); this.rtA.dispose(); this.rtB.dispose();
    this.matBright.dispose(); this.matBlur.dispose(); this.matComp.dispose();
    this.quad.geometry.dispose();
  }
}
