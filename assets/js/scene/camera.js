/* ============================================================
   Scroll-driven camera rig.
   Chapter sections in the DOM define the timeline: the camera
   sits on key i when chapter i begins and glides to key i+1 as
   the next chapter approaches. Normal scrolling only — no
   hijacking, no locking, no interaction required.
   ============================================================ */

import * as THREE from "three";

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

export class CameraRig {
  constructor(camera, keys, sections, opts = {}) {
    this.camera = camera;
    this.keys = keys.map(k => ({
      pos: new THREE.Vector3(...k.pos),
      look: new THREE.Vector3(...k.look),
      fov: k.fov,
    }));
    this.sections = sections;       // HTMLElement[], one per key (last key = hold)
    this.damping = opts.damping ?? 4.2;
    this.breath = opts.breath ?? 0.05;
    this.parallax = opts.parallax ?? 0.2;

    this.p = 0;                     // smoothed key-space position
    this.target = 0;
    this.cur = { pos: this.keys[0].pos.clone(), look: this.keys[0].look.clone(), fov: this.keys[0].fov };
    this.pointer = { x: 0, y: 0 };
    this.marks = [];
    this.recalc();
  }

  /* measure chapter boundaries in document scroll space */
  recalc() {
    const y = window.scrollY;
    this.marks = this.sections.map(el => el.getBoundingClientRect().top + y);
    this.end = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    // final hold: last section bottom
    const last = this.sections[this.sections.length - 1];
    this.lastEnd = last.getBoundingClientRect().bottom + y - window.innerHeight * 0.5;
  }

  setScroll(y) {
    const m = this.marks;
    let p = this.keys.length - 1;
    for (let i = 0; i < m.length - 1; i++) {
      if (y >= m[i] && y < m[i + 1]) {
        const u = (y - m[i]) / Math.max(1, m[i + 1] - m[i]);
        p = i + smoother(u);
        break;
      }
    }
    if (y < m[0]) p = 0;
    if (y >= m[m.length - 1]) {
      const u = Math.min(1, (y - m[m.length - 1]) / Math.max(1, this.lastEnd - m[m.length - 1]));
      p = (m.length - 1) + smoother(u) * 0.999;
    }
    this.target = THREE.MathUtils.clamp(p, 0, this.keys.length - 1.001);
  }

  setPointer(x, y) { this.pointer.x = x; this.pointer.y = y; }

  /* motion = 0 freezes ambient drift (reduced motion) */
  update(dt, time, motion) {
    const k = this.damping;
    const f = motion > 0 ? 1 - Math.exp(-k * dt) : 1;
    this.p = lerp(this.p, this.target, f);

    const i = Math.min(Math.floor(this.p), this.keys.length - 2);
    const t = THREE.MathUtils.clamp(this.p - i, 0, 1);
    const a = this.keys[i], b = this.keys[i + 1];

    this.cur.pos.lerpVectors(a.pos, b.pos, t);
    this.cur.look.lerpVectors(a.look, b.look, t);
    this.cur.fov = lerp(a.fov, b.fov, t);

    // ambient breathing + pointer parallax, applied in camera space
    const br = motion > 0 ? this.breath : 0;
    const px = this.pointer.x * this.parallax * motion;
    const py = this.pointer.y * this.parallax * 0.6 * motion;

    this.camera.position.copy(this.cur.pos);
    this.camera.position.x += Math.sin(time * 0.21) * br + px;
    this.camera.position.y += Math.sin(time * 0.17 + 1.4) * br * 0.7 + py * 0.5;
    this.camera.lookAt(this.cur.look);

    if (Math.abs(this.camera.fov - this.cur.fov) > 0.01) {
      this.camera.fov = this.cur.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /* snap straight to the current scroll pose (first frame / fallback) */
  snap() {
    this.p = this.target;
    const i = Math.min(Math.floor(this.p), this.keys.length - 2);
    const t = THREE.MathUtils.clamp(this.p - i, 0, 1);
    this.cur.pos.lerpVectors(this.keys[i].pos, this.keys[i + 1].pos, t);
    this.cur.look.lerpVectors(this.keys[i].look, this.keys[i + 1].look, t);
    this.camera.position.copy(this.cur.pos);
    this.camera.lookAt(this.cur.look);
    this.camera.fov = this.keys[i].fov;
    this.camera.updateProjectionMatrix();
  }
}
