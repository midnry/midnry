/** Reproducible offline asset build; original geometry with retained Mixamo rig. */
import { readFileSync, writeFileSync } from "node:fs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildOperatorAsset } from "./outpost-military/operator-asset.js";

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
  async readAsDataURL(blob) {
    this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
    this.onloadend?.();
  }
};
const input = readFileSync("public/games/military/models/soldier.glb");
const length = input.readUInt32LE(12),
  json = JSON.parse(input.subarray(20, 20 + length));
// Only the animation rig is retained; original painted atlases aren't exported.
json.images = [];
json.textures = [];
json.materials = [{ name: "source-body" }, { name: "source-visor" }];
const text = Buffer.from(JSON.stringify(json)),
  padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
text.copy(padded);
const binary = input.subarray(20 + length),
  source = Buffer.alloc(20 + padded.length + binary.length);
source.writeUInt32LE(0x46546c67, 0);
source.writeUInt32LE(2, 4);
source.writeUInt32LE(source.length, 8);
source.writeUInt32LE(padded.length, 12);
source.writeUInt32LE(0x4e4f534a, 16);
padded.copy(source, 20);
binary.copy(source, 20 + padded.length);
const gltf = await new GLTFLoader().parseAsync(
  source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength),
  "",
);
const headBytes = readFileSync("public/games/military/models/head-source.glb");
const head = await new GLTFLoader().parseAsync(
  headBytes.buffer.slice(headBytes.byteOffset, headBytes.byteOffset + headBytes.byteLength),
  "",
);
head.scene.updateMatrixWorld(true);
let headMesh;
head.scene.traverse((o) => {
  if (o.isMesh && !headMesh) headMesh = o;
});
buildOperatorAsset(gltf, headMesh);
const result = await new GLTFExporter().parseAsync(gltf.scene, {
  binary: true,
  animations: gltf.animations,
  onlyVisible: true,
});
writeFileSync("public/games/military/models/operator-v1.glb", Buffer.from(result));
console.log(
  JSON.stringify({
    operatorBytes: result.byteLength,
    clips: gltf.animations.map((c) => c.name),
    materials: "separate fabric, skin, equipment, glass",
    geometry: "original",
  }),
);
