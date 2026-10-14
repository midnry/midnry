import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { initNaturalLighting, updateNaturalLighting } from "./outpost-military/realism-lighting.js";

function fixture(twoLights = false) {
  const scene = new THREE.Scene(),
    weaponScene = new THREE.Scene();
  weaponScene.add(new THREE.DirectionalLight(), new THREE.HemisphereLight());
  const r = {
    scene,
    weaponScene,
    renderer: { toneMappingExposure: 1, shadowMap: {} },
    sun: new THREE.DirectionalLight(),
    rim: new THREE.DirectionalLight(),
    hemisphere: new THREE.HemisphereLight(),
    camera: new THREE.PerspectiveCamera(),
    protocolLights: [new THREE.PointLight()],
    protocolFixtures: [{ x: 3, y: 2.5, z: 3 }],
    g: {
      mode: "protocol",
      time: 0,
      arena: { mapId: "breakwater" },
      academy: { preset: "performance", options: { lighting: true, shadows: true } },
    },
    protocolMetadata: () => meta,
  };
  const meta = { rooms: [{ id: "room", x: 0, y: 0, w: 2, h: 2 }] };
  if (twoLights) {
    r.protocolLights.push(new THREE.PointLight());
    r.protocolFixtures.push({ x: 4.8, y: 2.5, z: 3 });
  }
  initNaturalLighting(r);
  return r;
}
const view = { protocol: { sabotage: { powerUntil: 0 } } };
test("nearby fixtures keep their light pool when walking reverses distance order", () => {
  const r = fixture(true);
  updateNaturalLighting(r, view, { x: 0.2, y: 1 }, 1 / 60);
  const positions = r.protocolLights.map((l) => l.position.toArray());
  updateNaturalLighting(r, view, { x: 1.9, y: 1 }, 1 / 60);
  assert.deepEqual(
    r.protocolLights.map((l) => l.position.toArray()),
    positions,
  );
  assert.ok(r.protocolLights.every((l) => l.intensity === 22));
});
test("doorway lighting fades monotonically without shadow extent or light-position jumps", () => {
  const r = fixture();
  updateNaturalLighting(r, view, { x: 1, y: 1 }, 1 / 60);
  assert.equal(r.scene.environmentIntensity, 0.2);
  const span = r.sun.shadow.camera.right,
    initial = r.protocolLights[0].intensity;
  updateNaturalLighting(r, view, { x: 3, y: 1 }, 1 / 120);
  assert.ok(r.scene.environmentIntensity > 0.2 && r.scene.environmentIntensity < 0.23);
  assert.ok(r.protocolLights[0].intensity > 0 && r.protocolLights[0].intensity < initial);
  let previous = r.scene.environmentIntensity;
  for (let i = 0; i < 120; i++) {
    updateNaturalLighting(r, view, { x: 3, y: 1 }, 1 / 120);
    assert.ok(r.scene.environmentIntensity >= previous && r.scene.environmentIntensity <= 0.48);
    previous = r.scene.environmentIntensity;
    assert.equal(r.sun.shadow.camera.right, span);
  }
  assert.ok(r.scene.environmentIntensity > 0.46);
});
test("60Hz and 120Hz transitions match; blackout still fades to emergency illumination", () => {
  const a = fixture(),
    b = fixture();
  for (const r of [a, b]) updateNaturalLighting(r, view, { x: 1, y: 1 }, 1 / 60);
  for (let i = 0; i < 60; i++) updateNaturalLighting(a, view, { x: 3, y: 1 }, 1 / 60);
  for (let i = 0; i < 120; i++) updateNaturalLighting(b, view, { x: 3, y: 1 }, 1 / 120);
  assert.ok(Math.abs(a.scene.environmentIntensity - b.scene.environmentIntensity) < 1e-10);
  const dark = { protocol: { sabotage: { powerUntil: 40 } } };
  for (let i = 0; i < 180; i++) updateNaturalLighting(a, dark, { x: 1, y: 1 }, 1 / 60);
  assert.ok(Math.abs(a.scene.environmentIntensity - 0.065) < 0.001);
  assert.ok(Math.abs(a.hemisphere.intensity - 0.09) < 0.001);
  assert.ok(a.protocolLights.every((l) => l.intensity < 0.01));
});
