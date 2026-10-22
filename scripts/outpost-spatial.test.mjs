import test from "node:test";
import assert from "node:assert/strict";
import {
  spatialSound,
  voicePosition,
  encodeVoiceFrame,
  decodeVoiceFrame,
} from "../public/games/outpost-spatial-audio.js";
import { actorInView } from "./outpost-military/telemetry.js";
import { FrameBudget } from "../public/games/outpost-academy.js";
import { readMotionAsset } from "./outpost-military/motion-build.mjs";
test("direction, distance and walls affect sound without consulting roles", () => {
  const listener = { x: 0, y: 0, a: 0 };
  assert.ok(spatialSound(listener, { x: 1, y: 1 }).pan > 0);
  assert.ok(spatialSound(listener, { x: 1, y: -1 }).pan < 0);
  assert.ok(
    spatialSound(listener, { x: 2, y: 0 }).gain > spatialSound(listener, { x: 7, y: 0 }).gain,
  );
  assert.ok(
    spatialSound(listener, { x: 2, y: 0 }, false).cutoff <
      spatialSound(listener, { x: 2, y: 0 }, true).cutoff,
  );
  const view = {
    entities: [{ id: "friend", x: 2, y: 0, hp: 0 }],
    protocol: { phase: "discussion" },
  };
  assert.equal(voicePosition(view, "friend", listener).gain, 0);
  view.entities[0].hp = 100;
  assert.equal(voicePosition(view, "friend", listener).gain, 1);
  view.time = 1;
  view.protocol.sabotage = { commsUntil: 10 };
  view.entities[0].x = 20;
  assert.equal(voicePosition(view, "friend", listener).gain, 0);
  view.entities[0].departed = true;
  assert.equal(voicePosition(view, "friend", listener).gain, 0);
});
test("culling keeps a partly exposed silhouette and rejects solid occlusion/offscreen actors", () => {
  const open = () => Array.from({ length: 12 }, () => Array(12).fill(0)),
    camera = { x: 2.5, y: 5.5, a: 0 },
    entity = { x: 7.5, y: 5.5 };
  const wall = open();
  for (const y of [4, 5, 6, 7]) wall[y][5] = 1;
  assert.equal(actorInView({ level: wall }, camera, entity, true), false);
  const post = open();
  post[5][5] = 1;
  assert.equal(actorInView({ level: post }, camera, entity, true), false, "a 3 m pillar hides a body behind it");
  assert.equal(actorInView({ level: post }, camera, { x: 7.5, y: 6.25 }, true), true, "a shoulder past its edge shows");
  assert.equal(actorInView({ level: open() }, camera, entity, false), false, "outside the frustum");
});
test("GPU overload adapts resolution even when CPU submission is cheap", () => {
  const b = new FrameBudget();
  for (let i = 0; i < 180; i++) b.sample(2, (i * 1000) / 60, true, true, 13);
  assert.ok(b.scale < 1);
  assert.ok(b.work < 3);
  assert.equal(b.gpu, 13);
});
test("speech frames are bounded, endian explicit and preserve waveform samples", () => {
  const samples = Int16Array.from({ length: 1280 }, (_, i) =>
    Math.round(Math.sin(i * 0.12) * 28000),
  );
  const encoded = encodeVoiceFrame(samples),
    decoded = decodeVoiceFrame(encoded);
  assert.equal(encoded.length, 3416);
  assert.equal(decoded.length, 1280);
  for (let i = 0; i < 1280; i++) assert.equal(decoded[i], samples[i] / 32768);
  assert.equal(decodeVoiceFrame("x".repeat(40000)), null);
  assert.equal(decodeVoiceFrame("!".repeat(3416)), null);
  assert.equal(encodeVoiceFrame(new Int16Array(100)), null);
});
test("distant sculpt reduces triangles while preserving skin/UV attributes and close geometry", async () => {
  const { gltf } = await readMotionAsset("public/games/military/models/operator-v1.glb");
  const meshes = [];
  gltf.scene.traverse((o) => {
    if (o.isSkinnedMesh) meshes.push(o);
  });
  const full = meshes.filter((o) => o.userData.operatorLOD === 0),
    far = meshes.filter((o) => o.userData.operatorLOD === 1);
  assert.equal(full.length, far.length);
  assert.ok(full.length > 0);
  const count = (items) => items.reduce((n, o) => n + o.geometry.index.count, 0);
  assert.ok(count(far) < count(full) * 0.6);
  for (const distant of far)
    for (const name of ["position", "normal", "uv", "skinIndex", "skinWeight"]) {
      const close = full.find((o) => o.name === distant.name.replace(/_distant$/, ""));
      assert.ok(close);
      assert.deepEqual(
        distant.geometry.attributes[name].array,
        close.geometry.attributes[name].array,
        name,
      );
    }
});
