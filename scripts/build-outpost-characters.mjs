/** Locker characters: licensed Mixamo sculpts (scripts/assets/outpost-characters/
 * sources.json) on the operator's rig, with the operator's captured motion.
 * Step 1 (here): retarget the clips, trim dense meshes, keep the original maps
 *   → assets-src/characters/built/<id>.glb
 * Step 2 (scripts/assets/pack-characters.mjs, run where glTF-Transform is
 *   installed): 1024 px WebP maps, meshopt → public/games/military/models/characters/
 * Sources are fetched once into assets-src/characters/ and checked by hash.
 *   node scripts/build-outpost-characters.mjs [id...] */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { readMotionAsset, retargetMotion, unpackGlb, packGlb } from "./outpost-military/motion-build.mjs";
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};
const SRC = "assets-src/characters/",
  OUT = SRC + "built/",
  MOTION = "scripts/assets/outpost-operator/";
// Triangle budget per character: eight fighters share a phone's GPU.
const BUDGET = 16000;
const { characters } = JSON.parse(readFileSync("scripts/assets/outpost-characters/sources.json"));
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

// The operator's clips, retargeted onto each sculpt (same names as operator-v1).
const CLIPS = [
  ["Rifle_Aiming_Idle", "Idle"],
  ["Rifle_Walk", "Walk"],
  ["Rifle_Run", "Run"],
  ["Backwards_Rifle_Walk", "BackWalk"],
  ["Idle_Crouching_Aiming", "Crouch"],
  ["Reloading", "Reload"],
  ["Hit_Reaction", "Hit"],
  ["Death", "Death"],
];
const motions = [];
for (const [file, name] of CLIPS) motions.push([(await readMotionAsset(MOTION + file + ".glb")).gltf, name]);

/** Parse a source without its images (Node has no image decoder); materials
 * get index names so the original maps can be put back after export. */
async function readSculpt(bytes) {
  const raw = unpackGlb(bytes),
    json = structuredClone(raw.json);
  json.images = [];
  json.textures = [];
  (json.materials || []).forEach((m, i) => {
    m.name = `m${i}`;
    for (const key of ["normalTexture", "occlusionTexture", "emissiveTexture"]) delete m[key];
    delete m.pbrMetallicRoughness?.baseColorTexture;
    delete m.pbrMetallicRoughness?.metallicRoughnessTexture;
    delete m.extensions;
  });
  const packed = packGlb(json, raw.bin);
  const gltf = await new GLTFLoader().parseAsync(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength), "");
  return { gltf, raw };
}

/** Embed the source's colour, normal and glow maps on the exported materials. */
function restoreMaps(exported, raw) {
  const { json, bin } = unpackGlb(exported),
    chunks = [bin];
  let offset = bin.length;
  json.images = [];
  json.textures = structuredClone(raw.json.textures || []);
  json.samplers = structuredClone(raw.json.samplers || []);
  for (const image of raw.json.images || []) {
    const view = raw.json.bufferViews[image.bufferView],
      data = raw.bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    const pad = Buffer.alloc((4 - (offset % 4)) % 4);
    chunks.push(pad);
    offset += pad.length;
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length });
    chunks.push(data);
    offset += data.length;
    json.images.push({ name: image.name, mimeType: image.mimeType, bufferView: json.bufferViews.length - 1 });
  }
  for (const material of json.materials || []) {
    const old = raw.json.materials?.[Number(material.name.slice(1))];
    if (!old) continue;
    material.name = old.name || material.name;
    const pbr = (material.pbrMetallicRoughness ||= {});
    if (old.pbrMetallicRoughness?.baseColorTexture) pbr.baseColorTexture = structuredClone(old.pbrMetallicRoughness.baseColorTexture);
    if (old.pbrMetallicRoughness?.baseColorFactor) pbr.baseColorFactor = old.pbrMetallicRoughness.baseColorFactor;
    if (old.normalTexture) material.normalTexture = { ...old.normalTexture, scale: 0.8 };
    if (old.emissiveTexture) {
      material.emissiveTexture = structuredClone(old.emissiveTexture);
      material.emissiveFactor = old.emissiveFactor || [1, 1, 1];
    }
    if (old.alphaMode) material.alphaMode = old.alphaMode;
    if (old.alphaCutoff !== undefined) material.alphaCutoff = old.alphaCutoff;
    if (old.doubleSided) material.doubleSided = true;
    // Cloth and skin, not plastic: the game sets its own lighting response.
    pbr.metallicFactor = 0;
    pbr.roughnessFactor = 0.8;
    delete pbr.metallicRoughnessTexture;
  }
  json.buffers = [{ byteLength: offset }];
  return packGlb(json, Buffer.concat(chunks));
}

await MeshoptSimplifier.ready;
const report = [];
for (const c of characters) {
  if (only.length && !only.includes(c.id)) continue;
  const path = SRC + c.file;
  if (!existsSync(path)) {
    const response = await fetch(c.source);
    if (!response.ok) throw new Error(`Download failed: ${c.source}`);
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = readFileSync(path);
  if (createHash("sha256").update(bytes).digest("hex") !== c.sha256) throw new Error("Invalid character source: " + c.file);
  const { gltf, raw } = await readSculpt(bytes);
  const model = gltf.scene;
  // Same facing as operator-v1.
  model.rotation.y = Math.PI;
  model.userData.riggedOperator = true;
  model.userData.character = c.id;
  // Trim dense sculpts (index only: UVs, weights and the rig are untouched).
  const meshes = [];
  model.traverse((o) => o.isSkinnedMesh && meshes.push(o));
  const total = meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0),
    keep = Math.min(1, BUDGET / total);
  let triangles = 0;
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    if (keep < 1) {
      const index = Uint32Array.from(geometry.index.array);
      const [reduced] = MeshoptSimplifier.simplify(index, geometry.attributes.position.array, geometry.attributes.position.itemSize, Math.max(3, Math.floor((index.length * keep) / 3) * 3), 0.02, ["LockBorder"]);
      geometry.setIndex(new THREE.BufferAttribute(reduced, 1));
    }
    triangles += geometry.index.count / 3;
  }
  const animations = motions.map(([source, name]) => retargetMotion(model, source, name));
  const exported = await new GLTFExporter().parseAsync(model, { binary: true, animations, onlyVisible: true });
  const result = restoreMaps(Buffer.from(exported), raw);
  writeFileSync(OUT + c.id + ".glb", result);
  report.push({ id: c.id, triangles, sourceTriangles: total, bytes: result.length });
}
console.log(JSON.stringify(report, null, 1));
