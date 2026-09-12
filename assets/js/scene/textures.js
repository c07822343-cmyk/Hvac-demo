/* ============================================================
   Procedural textures — drawn on <canvas> at runtime so the
   project ships zero heavy texture files and never 404s.
   ============================================================ */

import * as THREE from "three";

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

function toTexture(c, { repeat = 1, srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* fine lime-washed stucco */
export function stuccoTexture() {
  const s = 256, c = canvas(s), g = c.getContext("2d");
  g.fillStyle = "#e8dfcd";
  g.fillRect(0, 0, s, s);
  const img = g.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.9;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(180,168,146,${Math.random() * 0.05})`;
    g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, Math.random() * 9 + 2, 0, 7);
    g.fill();
  }
  return toTexture(c, { repeat: 3 });
}

/* honed travertine pavers with grout lines */
export function travertineTexture() {
  const s = 512, c = canvas(s), g = c.getContext("2d");
  g.fillStyle = "#cbbca2";
  g.fillRect(0, 0, s, s);
  const img = g.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] += n; img.data[i + 1] += n * 0.95; img.data[i + 2] += n * 0.8;
  }
  g.putImageData(img, 0, 0);
  // veining
  g.strokeStyle = "rgba(160,146,120,0.22)";
  for (let i = 0; i < 26; i++) {
    g.lineWidth = Math.random() * 1.6 + 0.3;
    g.beginPath();
    let x = Math.random() * s, y = Math.random() * s;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 90; y += (Math.random() - 0.3) * 40; g.lineTo(x, y); }
    g.stroke();
  }
  // paver joints
  g.strokeStyle = "rgba(90,82,68,0.5)";
  g.lineWidth = 3;
  g.strokeRect(0, 0, s, s);
  g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
  return toTexture(c, { repeat: 6 });
}

/* crushed limestone gravel */
export function gravelTexture() {
  const s = 256, c = canvas(s), g = c.getContext("2d");
  g.fillStyle = "#8f8a80";
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1400; i++) {
    const v = 120 + Math.random() * 90;
    g.fillStyle = `rgba(${v},${v - 4},${v - 12},${0.5 + Math.random() * 0.5})`;
    g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, Math.random() * 3 + 0.6, 0, 7);
    g.fill();
  }
  return toTexture(c, { repeat: 4 });
}

/* palm frond silhouette as alpha mask (white on black) */
export function frondAlphaTexture() {
  const w = 512, h = 128;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#fff";
  g.fillStyle = "#fff";
  // rachis
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, h / 2); g.quadraticCurveTo(w * 0.55, h / 2 - 6, w, h / 2 + 10); g.stroke();
  // leaflets
  const n = 46;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = t * w;
    const y = h / 2 - 6 * Math.sin(t * 2) + 10 * t * t;
    const len = (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.08))) * (h * 0.46);
    for (const sgn of [1, -1]) {
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + len * 0.35, y + sgn * len * 0.42, x + len * 0.86, y + sgn * len * 0.98);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* palm trunk rings */
export function trunkTexture() {
  const s = 128, c = canvas(s), g = c.getContext("2d");
  g.fillStyle = "#7c6a54";
  g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 7) {
    g.fillStyle = `rgba(60,48,36,${0.25 + Math.random() * 0.25})`;
    g.fillRect(0, y, s, 3 + Math.random() * 2);
    g.fillStyle = `rgba(190,172,140,${0.12 + Math.random() * 0.1})`;
    g.fillRect(0, y + 4, s, 2);
  }
  return toTexture(c, { repeat: 1 });
}

/* condenser side louvers */
export function louverTexture() {
  const s = 256, c = canvas(s), g = c.getContext("2d");
  g.fillStyle = "#565d61";
  g.fillRect(0, 0, s, s);
  for (let y = 4; y < s; y += 8) {
    g.fillStyle = "rgba(24,28,30,0.85)";
    g.fillRect(0, y, s, 4);
    g.fillStyle = "rgba(150,158,162,0.35)";
    g.fillRect(0, y + 4, s, 1.5);
  }
  return toTexture(c, { repeat: 2 });
}

/* soft round sprite for dust / air particles */
export function dustSprite() {
  const s = 64, c = canvas(s), g = c.getContext("2d");
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.32)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* interior plaster, slightly warmer than exterior stucco */
export function plasterTexture() {
  const s = 256, c = canvas(s), g = c.getContext("2d");
  g.fillStyle = "#d8ccb6";
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(150,138,116,${Math.random() * 0.05})`;
    g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, Math.random() * 26 + 6, 0, 7);
    g.fill();
  }
  return toTexture(c, { repeat: 2 });
}
