/** Release preflight: validate the actual self-hosted files before publishing. */
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
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
visit("public/games/military/models/operator-v1.glb");
visit("public/games/military/models/head-source.glb");
visit("public/games/military/HEAD-SCAN-LICENSE.txt");
const { ASSET_FILES } = await import("../public/games/outpost-asset-manifest.js");
for(const file of ASSET_FILES){
  const path=resolve("public"+file.url);visit(path);const bytes=readFileSync(path);
  assert.equal(bytes.length,file.bytes,`Incorrect cache asset length: ${file.url}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),file.sha256,`Incorrect cache asset checksum: ${file.url}`);
}
for (const asset of JSON.parse(readFileSync("public/games/military/realism-assets.json", "utf8"))) {
  visit(asset.path);
  const bytes = readFileSync(asset.path);
  assert.equal(bytes.length, asset.bytes, `Incorrect asset length: ${asset.path}`);
  assert.equal(createHash("md5").update(bytes).digest("hex"), asset.md5, `Incorrect asset: ${asset.path}`);
}
for (const directory of ["public/games/loading", "public/games/arsenal", "public/games/outfits", "public/games/military/textures"])
  for (const file of readdirSync(directory)) visit(resolve(directory, file));
// Checking source files alone cannot detect a stale preview/deployment output.
// Supply the hosting build's public directory to verify the actual artefacts.
const builtPublic = process.argv[2] ? resolve(process.argv[2]) : null;
if (builtPublic) {
  assert.ok(existsSync(builtPublic), `Missing built public directory: ${builtPublic}`);
  const publicRoot = resolve("public");
  for (const source of checked) {
    const file = relative(publicRoot, source);
    assert.ok(!file.startsWith(".."), `Release dependency is outside public: ${source}`);
    const built = resolve(builtPublic, file);
    assert.ok(existsSync(built), `Missing built release file: ${file}`);
    const checksum = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
    assert.equal(checksum(built), checksum(source), `Stale built release file: ${file}`);
  }
}
console.log(JSON.stringify({ releaseFiles: "passed", checked: checked.size, builtFiles: builtPublic ? "matched source" : "not requested", photographicTextures: 18, mergeMarkers: "absent" }));
