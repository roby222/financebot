import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve("static");
const files = readdirSync("static/js", { recursive: true })
  .filter((f) => f.endsWith(".js"))
  .map((f) => resolve("static/js", f));
const graph = new Map();
for (const file of [...files, resolve("proxy-worker/worker.js")]) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  const source = readFileSync(file, "utf8");
  assert.ok(
    !/\bon(?:click|change|mousedown)\s*=/.test(source),
    `Inline event handler in ${file}`,
  );
  const dependencies = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
    (m) => resolve(dirname(file), m[1]),
  );
  for (const dependency of dependencies)
    assert.ok(existsSync(dependency), `Missing import ${dependency}`);
  graph.set(file, dependencies);
}
const visited = new Set();
function visit(file, stack = []) {
  assert.ok(
    !stack.includes(file),
    `Circular import: ${[...stack, file].map((p) => p.replace(root + "/", "")).join(" -> ")}`,
  );
  if (visited.has(file)) return;
  for (const dep of graph.get(file) || []) visit(dep, [...stack, file]);
  visited.add(file);
}
for (const file of files) visit(file);
const html = readFileSync("static/index.html", "utf8");
assert.ok(
  !/<style\b|<script\s*>|\bon(?:click|change|mousedown)=/.test(html),
  "HTML must not contain embedded styles or scripts",
);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, "Duplicate HTML IDs");
for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:|data:)/.test(asset)) continue;
  assert.ok(
    !asset.startsWith("/"),
    "Assets must work under the GitHub Pages repository path",
  );
  assert.ok(existsSync(resolve(root, asset)), `Missing asset ${asset}`);
}
assert.ok(
  Array.isArray(JSON.parse(readFileSync("static/watchlist.json", "utf8"))),
);
console.log(
  `Source checks passed: ${files.length} modules, no circular imports, valid assets and HTML.`,
);
