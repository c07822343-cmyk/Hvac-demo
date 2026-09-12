/* CSS lint: parse every stylesheet and report syntax errors plus
   declarations the parser drops. Run: npm run css                */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import * as csstree from "css-tree";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const files = ["fonts", "tokens", "base", "layout", "components", "sections", "motion"];
let problems = 0;

for (const name of files) {
  const file = `assets/css/${name}.css`;
  const css = readFileSync(resolve(root, file), "utf8");
  const errors = [];
  const ast = csstree.parse(css, {
    positions: true,
    onParseError: (e) => errors.push(e.message),
  });

  // declarations the parser could not make sense of
  csstree.walk(ast, {
    visit: "Declaration",
    enter(node) {
      // custom properties are always "raw" by spec — not an error
      if (node.value.type === "Raw" && !node.property.startsWith("--")) {
        errors.push(`unparsed value: ${node.property}: ${csstree.generate(node.value)}`);
      }
    },
  });

  // balanced custom property usage is checked cross-file below

  if (errors.length) {
    problems += errors.length;
    console.error(`  ${file}:`);
    for (const e of errors) console.error("    " + e);
  }
}

// cross-file token check: every var(--x) used anywhere must exist in tokens.css
const tokens = readFileSync(resolve(root, "assets/css/tokens.css"), "utf8");
const tokenNames = new Set([...tokens.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]));
for (const name of files) {
  const css = readFileSync(resolve(root, `assets/css/${name}.css`), "utf8");
  for (const m of css.matchAll(/var\((--[\w-]+)(?:,([^)]+))?\)/g)) {
    if (!tokenNames.has(m[1]) && !m[2] && !css.match(new RegExp(`^\\s*${m[1]}\\s*:`, "m"))) {
      problems++;
      console.error(`  assets/css/${name}.css: unknown token ${m[1]}`);
    }
  }
}

console.log(problems ? `css: ${problems} problem(s)` : `css: ${files.length} stylesheets parse clean, all tokens resolve`);
process.exit(problems ? 1 : 0);
