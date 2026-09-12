/* ============================================================
   AERIS HVAC — scene configuration
   Everything artistic/technical about the 3D layer lives here.
   Camera + light "keys" are parallel arrays: index i is the pose
   held at the START of chapter i. Index 8 is the final hold.
   Coordinates: +X east, +Y up, +Z south (street side).
   ============================================================ */

export const SCENE = {
  /* pixel-ratio caps and effect flags per quality tier */
  tiers: [
    { name: "high",   dpr: 2.0,  shadows: 2048, bloom: true,  samples: 4, dust: 900, fronds: 14, water: true  },
    { name: "medium", dpr: 1.5,  shadows: 1024, bloom: true,  samples: 2, dust: 380, fronds: 10, water: true  },
    { name: "low",    dpr: 1.0,  shadows: 0,    bloom: false, samples: 0, dust: 140, fronds: 8,  water: false },
  ],

  /* frames per second below which we step down a tier (checked twice) */
  fpsFloor: 27,
  fpsWindowSec: 2.5,

  camera: {
    /* damped follow — cinematic lag. 1 = instant (reduced motion) */
    damping: 4.2,
    /* idle breathing + pointer parallax amplitudes */
    breath: 0.055,
    parallax: 0.22,
  },

  /* ---- camera keys (one per chapter start + final hold) ---- */
  keys: [
    { pos: [  5.5, 2.50, 24.0], look: [-1.0, 2.20, -1.0], fov: 40 }, // 01 arrival
    { pos: [ -2.6, 1.65,  8.6], look: [-0.6, 1.50, -2.5], fov: 45 }, // 02 comfort
    { pos: [ -7.6, 1.90,  7.4], look: [-6.4, 1.30, -2.0], fov: 42 }, // 03 services
    { pos: [ -1.4, 1.55, -0.6], look: [ 3.6, 2.62, -4.6], fov: 53 }, // 04 system (inside)
    { pos: [ -8.6, 1.20, -1.2], look: [-10.4, 0.85, -2.6], fov: 34 }, // 05 craft (condenser)
    { pos: [-14.5, 1.50, 13.5], look: [ 1.5, 2.40, -1.5], fov: 48 }, // 06 local
    { pos: [  0.8, 1.90, 16.5], look: [ 0.0, 2.10, -2.0], fov: 42 }, // 07 afterlight
    { pos: [  7.0, 2.70, 20.0], look: [-1.5, 2.00, -2.0], fov: 40 }, // 08 contact
    { pos: [  7.6, 2.55, 20.8], look: [-1.6, 1.95, -2.0], fov: 40 }, //    hold
  ],

  /* ---- light / atmosphere keys, parallel to camera keys ---- */
  light: [
    { sun: [ 0.55, 0.42, 0.72], sunCol: 0xffd9a8, sunInt: 3.0, skyTop: 0x7fa3b8, skyHor: 0xe8d3b0, fog: 0xd9c6a8, fogD: 0.012, hemi: 0.55, interior: 0.15, pool: 0.0, exposure: 1.06, bloom: 0.55 },
    { sun: [ 0.35, 0.36, 0.87], sunCol: 0xffcf9a, sunInt: 2.8, skyTop: 0x86a9bd, skyHor: 0xecd7b4, fog: 0xdcc9ab, fogD: 0.013, hemi: 0.52, interior: 0.35, pool: 0.0, exposure: 1.05, bloom: 0.55 },
    { sun: [ 0.15, 0.30, 0.94], sunCol: 0xffc98f, sunInt: 2.6, skyTop: 0x84a6ba, skyHor: 0xebd3ae, fog: 0xdac6a6, fogD: 0.014, hemi: 0.50, interior: 0.30, pool: 0.0, exposure: 1.04, bloom: 0.55 },
    { sun: [ 0.10, 0.30, 0.95], sunCol: 0xffc98f, sunInt: 2.2, skyTop: 0x7d9cb0, skyHor: 0xe6cda6, fog: 0xd6c3a6, fogD: 0.016, hemi: 0.46, interior: 0.80, pool: 0.0, exposure: 1.00, bloom: 0.50 },
    { sun: [-0.25, 0.22, 0.95], sunCol: 0xffb877, sunInt: 2.6, skyTop: 0x7d9cb2, skyHor: 0xf0cfa4, fog: 0xdfc39c, fogD: 0.015, hemi: 0.46, interior: 0.50, pool: 0.0, exposure: 1.02, bloom: 0.60 },
    { sun: [-0.50, 0.16, 0.85], sunCol: 0xffa865, sunInt: 2.4, skyTop: 0x6f92ab, skyHor: 0xf2c793, fog: 0xe0bd93, fogD: 0.016, hemi: 0.42, interior: 0.70, pool: 0.2, exposure: 1.02, bloom: 0.65 },
    { sun: [-0.60, 0.06, 0.80], sunCol: 0xff8f5a, sunInt: 0.8, skyTop: 0x24405c, skyHor: 0xd98a5e, fog: 0x2c3d4c, fogD: 0.020, hemi: 0.26, interior: 1.00, pool: 1.0, exposure: 1.00, bloom: 0.80 },
    { sun: [-0.40, 0.30, 0.60], sunCol: 0x9db8d0, sunInt: 0.4, skyTop: 0x101c28, skyHor: 0x2a3a48, fog: 0x16212b, fogD: 0.024, hemi: 0.20, interior: 1.00, pool: 1.0, exposure: 0.96, bloom: 0.90 },
    { sun: [-0.40, 0.28, 0.60], sunCol: 0x93aec8, sunInt: 0.35, skyTop: 0x0d1822, skyHor: 0x24333f, fog: 0x131d26, fogD: 0.026, hemi: 0.18, interior: 1.00, pool: 1.0, exposure: 0.95, bloom: 0.90 },
  ],

  /* world layout constants (kept in sync with world.js) */
  world: {
    houseX: [-8, 8],
    houseZ: [-6, 2],
    wallH: 3.4,
    poolX: [-2, 2],
    poolZ: [3.5, 9.5],
    condenser: [-10.4, -2.6],
  },
};

/* Business copy that ALSO appears in markup lives in index.html.
   This block is only used by the 3D layer + form select defaults. */
export const BUSINESS = {
  name: "AERIS HVAC",
  city: "Boca Raton, Florida",
  phone: "(561) 555-0148",
  email: "hello@aeris-hvac-demo.com",
  fictional: true,
};
