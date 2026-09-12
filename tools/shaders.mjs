/* GLSL lint: parse every inline shader and cross-check varyings
   between vertex/fragment stages (missing varyings are link-time
   errors a browser would only report at runtime).
   Run: npm run shaders                                            */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import * as P from "@shaderfrog/glsl-parser";

const parse = P.parser ? P.parser.parse : P.parse;
const root = resolve(dirname(new URL(import.meta.url).pathname), "..");

const files = ["assets/js/scene/world.js", "assets/js/scene/post.js"];
let problems = 0, count = 0;
const varyingRe = /varying\s+\w+\s+(\w+)\s*;/g;

for (const f of files) {
  const src = readFileSync(resolve(root, f), "utf8");
  const blocks = [...src.matchAll(/(vertexShader|fragmentShader):\s*`([\s\S]*?)`/g)]
    .map(m => [m[1], m[2]]);

  for (const m of src.matchAll(/const\s+[A-Z][A-Z0-9_]*\s*=\s*`([\s\S]*?)`/g)) {
    blocks.push(["const", m[1]]);
  }

  for (const [, code] of blocks) {
    count++;
    try { parse(code); } catch (e) {
      problems++;
      console.error(`  SYNTAX ${f}: ${e.message.split("\n")[0]}`);
    }
  }

  for (let i = 0; i + 1 < blocks.length; i++) {
    if (blocks[i][0] !== "vertexShader" || blocks[i + 1][0] !== "fragmentShader") continue;
    const vSrc = blocks[i][1], fSrc = blocks[i + 1][1];
    const vv = new Set([...vSrc.matchAll(varyingRe)].map(m => m[1]));
    const fv = new Set([...fSrc.matchAll(varyingRe)].map(m => m[1]));
    for (const v of vv) if (!fv.has(v)) { problems++; console.error(`  VARYING ${f}: "${v}" in vertex but not fragment`); }
    for (const v of fv) if (!vv.has(v)) { problems++; console.error(`  VARYING ${f}: "${v}" in fragment but not vertex`); }
  }
}

console.log(problems ? `shaders: ${problems} problem(s) across ${count} shaders` : `shaders: ${count} shaders parse clean, varyings matched`);
process.exit(problems ? 1 : 0);
