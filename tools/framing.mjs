/* Composition QA without a GPU: project each chapter's subject
   through its camera key and confirm it lands inside the frame.
   Run: npm run framing                                            */
import * as THREE from "three";
import { SCENE } from "../assets/js/config.js";

const subjects = [
  [0, ["house", 0, 1.7, -2], ["pool", 0, 0, 8]],
  [1, ["sofa", -0.5, 0.7, -2.2], ["curtain", -3.1, 1.6, 1.7]],
  [2, ["condenser", -10.4, 0.7, -2.6], ["west wall", -8, 1.6, -2]],
  [3, ["air handler", 6.9, 1.2, -4.6], ["trunk duct", 1.7, 2.95, -4.6], ["diffuser", 0, 3.2, -2.2]],
  [4, ["condenser", -10.4, 0.8, -2.6]],
  [5, ["house", 0, 2, -2], ["garden wall", -12.6, 2.3, 8.5]],
  [6, ["house", 0, 2, -2], ["pool", 0, 0, 6.5]],
  [7, ["house", 0, 2, -2], ["wing", 11, 1.5, -2]],
];

const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 400);
let bad = 0;

for (const [i, ...list] of subjects) {
  const k = SCENE.keys[i];
  cam.position.set(...k.pos);
  cam.lookAt(new THREE.Vector3(...k.look));
  cam.fov = k.fov;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  for (const [name, x, y, z] of list) {
    const v = new THREE.Vector3(x, y, z).project(cam);
    const behind = v.z > 1;
    const out = behind || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15;
    if (out) bad++;
    console.log(
      `  ch0${i} ${name.padEnd(12)} ndc(${v.x.toFixed(2)}, ${v.y.toFixed(2)}) ${behind ? "BEHIND" : out ? "OUT OF FRAME" : "in frame"}`,
    );
  }
  // camera sanity: above ground, not inside the pool basin
  const p = cam.position;
  if (p.y < 0.3) { bad++; console.log(`  ch0${i} camera below ground`); }

  const insideHouse = p.x > -8 && p.x < 8 && p.z > -6 && p.z < 2;
  if (i === 3) {
    if (!insideHouse || p.y > 3.2) { bad++; console.log(`  ch03 camera not inside the great room`); }
  } else if (insideHouse) {
    bad++; console.log(`  ch0${i} camera inside the house volume`);
  }
}

/* the comfort shot must look *through* the south glass wall */
{
  const k = SCENE.keys[1];
  const from = new THREE.Vector3(...k.pos);
  const to = new THREE.Vector3(-0.5, 0.7, -2.2); // sofa
  const t = (2 - from.z) / (to.z - from.z);
  const hit = from.clone().lerp(to, t);
  const throughGlass = t > 0 && t < 1 && Math.abs(hit.x) < 3.8 && hit.y > 0.15 && hit.y < 3.05;
  if (!throughGlass) { bad++; console.log("  ch01 sightline misses the glass wall"); }
  else console.log(`  ch01 sightline crosses glass at x=${hit.x.toFixed(2)} y=${hit.y.toFixed(2)}`);
}

console.log(bad ? `framing: ${bad} issue(s)` : "framing: every chapter subject is in frame");
process.exit(bad ? 1 : 0);
