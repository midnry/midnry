// Pack downloaded Poly Haven props into one GLB: each asset becomes a named
// top-level node, textures resized and re-encoded as WebP, meshes deduplicated.
// Run from a folder with glTF-Transform installed (copy this file there):
//   node <tools>/pack-props.mjs out.glb <maxTex> id...   (cwd = repo root)
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, textureCompress, weld, mergeDocuments, unpartition, simplify, quantize, meshopt } from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
const [out, max = "1024", ...ids] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(`assets-src/polyhaven/${ids[0]}/1k/${ids[0]}_1k.gltf`);
const name = (d, id) => {
  const scene = d.getRoot().getDefaultScene() || d.getRoot().listScenes()[0];
  for (const n of scene.listChildren()) n.setName(id + (scene.listChildren().length > 1 ? "/" + n.getName() : ""));
};
name(doc, ids[0]);
for (const id of ids.slice(1)) {
  const d = await io.read(`assets-src/polyhaven/${id}/1k/${id}_1k.gltf`);
  name(d, id);
  const map = mergeDocuments(doc, d);
  // Move the merged scene's nodes into the main scene.
  const [main, extra] = doc.getRoot().listScenes();
  for (const n of extra.listChildren()) main.addChild(n);
  extra.dispose();
}
// Props stay small on screen: simplify to ~12% of the source triangles,
// within a small geometric error so silhouettes hold.
await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
await doc.transform(dedup(), weld());
await doc.transform(
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.12, error: 0.002, lockBorder: false }),
  prune(),
  unpartition(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [Number(max), Number(max)], quality: 82 }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
io.registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await io.write(out, doc);
const bytes = (await import("node:fs")).statSync(out).size;
console.log(out, (bytes / 1e6).toFixed(2), "MB", doc.getRoot().listScenes()[0].listChildren().map((n) => n.getName()).join(", "));
