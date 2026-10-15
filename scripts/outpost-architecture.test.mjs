import test from "node:test";
import assert from "node:assert/strict";
import { PROTOCOL_MAP, TRANSPORT_MAP } from "../public/games/outpost-protocol-map.js";
import { roofLayout, roofRoomAt } from "./outpost-military/architecture.js";
import { WorldVisibility } from "./outpost-military/world-visibility.js";
import * as THREE from "three";

test("interior roofs cover door gaps and the supply atrium; the exterior perimeter stays outdoors", () => {
  const before = JSON.stringify(PROTOCOL_MAP);
  for (const map of [PROTOCOL_MAP, TRANSPORT_MAP]) {
    const { cells } = roofLayout(map);
    for (const room of [...map.rooms, ...(map.corridors || [])])
      for (let y = room.y; y < room.y + room.h; y++)
        for (let x = room.x; x < room.x + room.w; x++)
          assert.equal(cells.has(`${x},${y}`), room.roofed !== false, `${room.id}: ${x},${y}`);
  }
  for (const [x, y] of [[8, 6], [8, 7], [5, 9], [11, 5], [19, 5], [4, 12], [22, 12], [13, 18]])
    assert.ok(roofRoomAt(PROTOCOL_MAP, x + 0.5, y + 0.5), `door: ${x},${y}`);
  assert.equal(roofRoomAt(PROTOCOL_MAP, 14.5, 14.5)?.id, "courtyard");
  assert.equal(roofRoomAt(PROTOCOL_MAP, 14.5, 26.5), null);
  assert.equal(roofRoomAt(PROTOCOL_MAP, 1.5, 21.5), null);
  assert.equal(JSON.stringify(PROTOCOL_MAP), before);
  assert.equal(roofLayout(PROTOCOL_MAP), roofLayout(PROTOCOL_MAP), "coverage is cached");
});

test("wall shells and roofs stay drawable while hidden-room details are still culled", () => {
  const world = new THREE.Group(), level = Array.from({ length: 20 }, () => Array(20).fill(1));
  level[2][2] = level[15][15] = 0;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(3, 3.5, 3), new THREE.MeshBasicMaterial());
  shell.position.set(46.5, 1.75, 46.5);
  shell.userData.noRoomCull = true;
  const detail = shell.clone();
  detail.userData = {};
  world.add(shell, detail);
  const r = { world, g: { level, arena: { mapId: "breakwater" } },
    camera: new THREE.PerspectiveCamera(60, 1), protocolPropTile: () => false,
    transportWindowTile: () => false, transportHiddenWall: () => false };
  new WorldVisibility(r).update({ x: 2.5, y: 2.5, a: 0 }, 0.8, 0);
  assert.equal(shell.layers.isEnabled(0), true);
  assert.equal(shell.frustumCulled, true);
  assert.equal(detail.layers.isEnabled(0), false);
  assert.equal(detail.layers.isEnabled(1), true, "shadow caster remains available");
  assert.ok(r.worldStats.worldCulled > 0);
});
