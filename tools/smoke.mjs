/* Headless smoke test (no browser needed):
   - boots main.js in jsdom
   - verifies the no-WebGL fallback path activates
   - verifies reveals, menu, chapter rail and form behaviour
   Run: npm test                                                */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { JSDOM } from "jsdom";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

const dom = new JSDOM(html, { url: "http://localhost:8080/", pretendToBeVisual: true });
const { window } = dom;

window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
window.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
  unobserve() {} disconnect() {} takeRecords() { return []; }
};

global.window = window;
global.document = window.document;
global.IntersectionObserver = window.IntersectionObserver;
global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log("  ok  " + label); } else { fail++; console.error("  FAIL " + label); } };

await import("../assets/js/main.js");
window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
await new Promise(r => setTimeout(r, 60));

const body = window.document.body;
ok(body.classList.contains("webgl-off"), "no-WebGL fallback engages in headless env");
ok(!body.classList.contains("is-booting"), "boot veil lifted");
ok(window.document.querySelectorAll(".reveal.is-in, .display.is-in").length > 10, "reveals activate");

// backgrounds get attached for fallback
const bg = window.document.querySelector('.scene-bg[data-bg]');
ok(/url\(/.test(bg.style.backgroundImage || ""), "chapter backdrops attach in fallback mode");

// menu
const burger = window.document.querySelector("#burger");
burger.click();
ok(!window.document.querySelector("#menu").hidden, "mobile menu opens");
ok(burger.getAttribute("aria-expanded") === "true", "burger aria-expanded true");
window.document.querySelector("#menu a").click();
ok(window.document.querySelector("#menu").hidden, "menu closes on link click");

// form validation + demo submission
const form = window.document.querySelector("#serviceForm");
form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
ok(window.document.querySelectorAll(".field-error").length >= 3, "empty form reports errors");
window.document.querySelector("#f-name").value = "Jordan Reyes";
window.document.querySelector("#f-phone").value = "(561) 555-0148";
window.document.querySelector("#f-email").value = "j@example.com";
window.document.querySelector("#f-service").value = "AC Repair";
form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
const status = window.document.querySelector("#formStatus").textContent;
ok(/demo only/i.test(status), "valid form returns demo-only confirmation");

// camera rig maths (module level, no DOM rendering)
const { CameraRig } = await import("../assets/js/scene/camera.js");
const { SCENE } = await import("../assets/js/config.js");
const THREE = await import("three");
const sections = [...window.document.querySelectorAll("main .chapter")];
Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
const cam = new THREE.PerspectiveCamera(40, 1.6, 0.1, 400);
const rig = new CameraRig(cam, SCENE.keys, sections, SCENE.camera);
rig.setScroll(0); rig.snap();
const p0 = cam.position.clone();
rig.target = 4; rig.update(0.5, 1, 1);
ok(p0.distanceTo(cam.position) > 0.01, "camera moves between keys");
ok(Number.isFinite(cam.position.x + cam.position.y + cam.position.z), "camera pose finite");

console.log(fail ? `smoke: ${fail} failure(s), ${pass} passed` : `smoke: all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
