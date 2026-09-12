/* Static integrity check: every referenced asset must exist,
   every in-page anchor must resolve. Run: npm run check        */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
let bad = 0;
const miss = (m) => { bad++; console.error("  MISSING " + m); };

const html = readFileSync(resolve(root, "index.html"), "utf8");

// href/src attributes (skip anchors, mailto, tel)
for (const m of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) {
  const u = m[1];
  if (/^(https?:|mailto:|tel:)/.test(u)) continue;
  if (!existsSync(resolve(root, u))) miss(u);
}

// ids referenced by in-page anchors
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
for (const m of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(m[1])) miss("#" + m[1]);
}

// css url() references
for (const cssFile of ["fonts", "tokens", "base", "layout", "components", "sections", "motion"]) {
  const p = resolve(root, "assets/css", cssFile + ".css");
  const css = readFileSync(p, "utf8");
  for (const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    const u = m[1];
    if (/^(https?:|data:)/.test(u)) continue;
    if (!existsSync(resolve(dirname(p), u))) miss(cssFile + ".css -> " + u);
  }
}

// js import specifiers that are relative files
for (const f of ["assets/js/main.js", "assets/js/config.js", "assets/js/scene/scene.js", "assets/js/scene/world.js", "assets/js/scene/camera.js", "assets/js/scene/post.js", "assets/js/scene/textures.js"]) {
  const src = readFileSync(resolve(root, f), "utf8");
  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    if (!existsSync(resolve(root, dirname(f), m[1]))) miss(f + " -> " + m[1]);
  }
}

// data-bg attributes
for (const m of html.matchAll(/data-bg="([^"]+)"/g)) {
  if (!existsSync(resolve(root, m[1]))) miss(m[1]);
}

console.log(bad ? `check: ${bad} problem(s)` : "check: all referenced assets + anchors resolve");
process.exit(bad ? 1 : 0);
