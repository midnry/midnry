import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TAKEDOWNS, deathTiming, deathFrame } from "../public/games/outpost-death.js";
import { ProtocolArena, protocolView, restoreArena } from "../public/games/outpost-protocol.js";
import { connectionAdvice, testConnection } from "../public/games/outpost-connection.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Vector3 } from "three";

test("five server-chosen takedowns are delivered only to their victim", () => {
  for (let i = 0; i < 5; i++) {
    const a = new ProtocolArena({
      humans: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}` })),
      rolePreference: "operator",
      random: () => 0.4,
    });
    const victim = a.entities[0],
      killer = a.entities.find((e) => e.team === 1);
    Object.assign(killer, { x: victim.x + 0.1, y: victim.y });
    a.privateFor(killer).killReadyAt = 0;
    a.random = () => i / 5 + 0.01;
    a.eliminate(killer, victim.id);
    assert.equal(victim.hp, 0);
    const state = a.snapshot();
    const view = protocolView(state, victim.id);
    assert.equal(view.protocol.self.deathScene.kind, TAKEDOWNS[i].id);
    assert.deepEqual(Object.keys(view.protocol.self.deathScene).sort(), ["at", "id", "kind"]);
    for (const other of a.entities.filter((e) => e !== victim)) {
      const publicView = protocolView(state, other.id);
      assert.equal(publicView.protocol.self.deathScene, null);
      for (const entity of publicView.entities) assert.equal(entity.deathScene, undefined);
    }
    const restored = restoreArena(state);
    assert.deepEqual(
      protocolView(restored.snapshot(), victim.id).protocol.self.deathScene,
      view.protocol.self.deathScene,
    );
  }
});
test("invalid/distant attacks never create a takedown or change living permissions", () => {
  const a = new ProtocolArena({ rolePreference: "operator", random: () => 0.4 }),
    v = a.entities[0],
    k = a.entities.find((e) => e.team === 1);
  a.privateFor(k).killReadyAt = 0;
  Object.assign(k, { x: 25.5, y: 24.5 });
  a.eliminate(k, v.id);
  assert.equal(v.hp, 100);
  assert.equal(protocolView(a.snapshot(), v.id).protocol.self.deathScene, null);
  a.detach(v.id);
  assert.equal(protocolView(a.snapshot(), v.id).protocol.self.deathScene, null);
});
test("takedown precedes fall, skip preserves fall, and reduced motion stays short", () => {
  for (const kind of TAKEDOWNS) {
    const timing = deathTiming({ kind: kind.id });
    const sequence = {
      at: 100,
      takedownDuration: timing.takedown,
      fallDuration: timing.fall,
      duration: timing.total,
    };
    const early = deathFrame(sequence, 100 + timing.takedown / 2);
    assert.equal(early.stage, "takedown");
    assert.equal(early.fall, 0);
    assert.equal(early.done, false);
    assert.equal(deathFrame(sequence, 100 + timing.takedown).stage, "fall");
    assert.equal(deathFrame(sequence, 100 + timing.total).done, true);
    assert.equal(deathTiming({ kind: kind.id }, true).total, 1050);
  }
  assert.deepEqual(deathTiming(null), { kind: null, takedown: 0, fall: 1200, total: 1200 });
});
test("connection advice warns on delay/jitter/failures even with high Mbps, never blocks play", () => {
  const good = connectionAdvice([31, 33, 32, 30, 34], 8);
  assert.equal(good.quality, "good");
  const lag = connectionAdvice([210, 390, 190, 440, 220], 300);
  assert.equal(lag.quality, "variable");
  assert.match(lag.advice, /available/);
  assert.equal(lag.allowed, undefined);
  assert.equal(connectionAdvice([45, 50, 44], 1).quality, "variable");
  assert.equal(connectionAdvice([], null).quality, "unknown");
  assert.match(connectionAdvice([], null).advice, /still play/);
});
test("bounded HTTP speed probe reads real bytes; save-data skips the download", async () => {
  let clock = 0;
  const requests = [];
  const fetcher = async (url) => {
    requests.push(url);
    clock += 40;
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(url.includes("download") ? 256 * 1024 : 12),
    };
  };
  const result = await testConnection({ fetcher, now: () => clock });
  assert.equal(result.latency, 40);
  assert.equal(result.jitter, 0);
  assert.ok(result.downloadMbps > 5);
  assert.equal(requests.filter((url) => url.includes("download")).length, 1);
  requests.length = 0;
  await testConnection({ fetcher, now: () => clock, saveData: true });
  assert.equal(
    requests.some((url) => url.includes("download")),
    false,
  );
});
test("new operator has real material groups, normalized skin weights, and retained animation", () => {
  const bytes = readFileSync("public/games/military/models/operator-v1.glb");
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  assert.ok(bytes.length < 8 * 1024 * 1024, "browser-sized model");
  const names = json.materials.map((m) => m.name);
  for (const name of [
    "Uniform fabric",
    "Scanned skin",
    "Equipment metal",
    "Lens glass",
    "Boot rubber",
  ])
    assert.ok(names.includes(name));
  assert.equal(json.images?.length || 0, 0, "no painted Vanguard atlas");
  assert.ok(json.animations.some((a) => a.name === "Idle"));
  assert.ok(json.animations.some((a) => a.name === "Walk"));
  for (const mesh of json.meshes)
    for (const p of mesh.primitives) {
      assert.ok(p.attributes.JOINTS_0 != null);
      assert.ok(p.attributes.WEIGHTS_0 != null);
    }
});

test("uniform sleeve surfaces have outward normals for physically correct lighting", async () => {
  const bytes = readFileSync("public/games/military/models/operator-v1.glb");
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "",
  );
  gltf.scene.updateMatrixWorld(true);
  let arm, elbow;
  const cloth = [];
  gltf.scene.traverse((object) => {
    if (object.isBone && object.name.endsWith("LeftArm")) arm = object;
    if (object.isBone && object.name.endsWith("LeftForeArm")) elbow = object;
    if (object.isSkinnedMesh && object.material.name === "Uniform fabric") cloth.push(object);
  });
  const a = arm.getWorldPosition(new Vector3()), b = elbow.getWorldPosition(new Vector3());
  const axis = b.clone().sub(a), lengthSquared = axis.lengthSq();
  let samples = 0, outward = 0;
  for (const mesh of cloth) {
    const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
    for (let i = 0; i < positions.count; i++) {
      const position = new Vector3().fromBufferAttribute(positions, i);
      const t = position.clone().sub(a).dot(axis) / lengthSquared;
      if (t < .3 || t > .7) continue;
      const radial = position.clone().sub(a.clone().addScaledVector(axis, t));
      if (radial.length() > .10 || radial.length() < .04) continue;
      const normal = new Vector3().fromBufferAttribute(normals, i);
      samples++;
      if (normal.dot(radial.normalize()) > .5) outward++;
    }
  }
  assert.ok(samples > 50, "sample the actual sleeve mesh");
  assert.ok(outward / samples > .95, "lighting normals must face out of the sleeve");
});
