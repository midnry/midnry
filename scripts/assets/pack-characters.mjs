// Pack built Locker characters for the web: maps resized to 1024 px WebP,
// meshopt-compressed geometry (skins and clips kept).
// Run from a folder with glTF-Transform installed (copy this file there):
//   node <tools>/pack-characters.mjs id...   (cwd = repo root)
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, textureCompress, meshopt, resample } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptEncoder.ready;
io.registerDependencies({ "meshopt.encoder": MeshoptEncoder });
mkdirSync("public/games/military/models/characters", { recursive: true });
for (const id of process.argv.slice(2)) {
  const doc = await io.read(`assets-src/characters/built/${id}.glb`);
  await doc.transform(
    dedup(),
    resample(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024], quality: 84 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const out = `public/games/military/models/characters/${id}.glb`;
  await io.write(out, doc);
  console.log(id, (statSync(out).size / 1e6).toFixed(2), "MB");
}
