/** Release preflight: validate the actual self-hosted files before publishing. */
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const checked = new Set();
function visit(path) {
  path = resolve(path);
  if (checked.has(path)) return;
  assert.ok(existsSync(path), `Missing release file: ${path}`);
  assert.ok(statSync(path).size > 0, `Empty release file: ${path}`);
  checked.add(path);
  if (!/\.(?:js|mjs|html)$/.test(path)) return;
  const source = readFileSync(path, "utf8");
  assert.doesNotMatch(source, /^<{7}|^={7}|^>{7}/m, `Unresolved merge: ${path}`);
  for (const [, dependency] of source.matchAll(/(?:from\s*|import\s*\(\s*)["'`]([^"'`]+)["'`]/g)) {
    if (!dependency.startsWith(".")) continue;
    visit(resolve(dirname(path), dependency.split("?")[0]));
  }
}
visit("public/games/outpost-zero.html");
visit("public/games/outpost-military.js");
for (const path of ["public/games/military/models/soldier.glb", "public/games/military/sky.hdr", "public/games/military/lifeline-mission.png"])
  visit(path);
for (const asset of JSON.parse(readFileSync("public/games/military/realism-assets.json", "utf8"))) {
  visit(asset.path);
  const bytes = readFileSync(asset.path);
  assert.equal(bytes.length, asset.bytes, `Incorrect asset length: ${asset.path}`);
  assert.equal(createHash("md5").update(bytes).digest("hex"), asset.md5, `Incorrect asset: ${asset.path}`);
}
for (const directory of ["public/games/loading", "public/games/arsenal", "public/games/outfits", "public/games/military/textures"])
  for (const file of readdirSync(directory)) visit(resolve(directory, file));
console.log(JSON.stringify({ releaseFiles: "passed", checked: checked.size, photographicTextures: 18, mergeMarkers: "absent" }));
