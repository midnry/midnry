import assert from "node:assert/strict";
import test from "node:test";
import { PROTOCOL_MAP as map, TRANSPORT_MAP, MEDICAL_SUPPLIES } from "../public/games/outpost-protocol-map.js";
import { mapOf } from "../public/games/outpost-content.js";

const size = map.level.length;
const tileAt = (point) => map.level[Math.floor(point.y)]?.[Math.floor(point.x)];
const roomById = new Map(map.rooms.map((room) => [room.id, room]));
const points = [
  ...map.spawns.map(([x, y]) => ({ x, y })),
  ...map.stations, ...map.sites, ...map.vents, ...map.supplies, map.loading, map.emergency,
];

test("Breakwater is sealed and every contextual target is reachable on foot", () => {
  assert.ok(size >= 26 && size <= 30);
  assert.ok(map.level.every((row) => row.length === size));
  for (let edge = 0; edge < size; edge++) {
    assert.notEqual(map.level[0][edge], 0);
    assert.notEqual(map.level[size - 1][edge], 0);
    assert.notEqual(map.level[edge][0], 0);
    assert.notEqual(map.level[edge][size - 1], 0);
  }
  const start = map.spawns[0].map(Math.floor);
  const queue = [start];
  const reached = new Set([start.join(",")]);
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const key = `${nx},${ny}`;
      if (map.level[ny]?.[nx] === 0 && !reached.has(key)) {
        reached.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  assert.equal(reached.size, map.level.flat().filter((tile) => tile === 0).length,
    "An isolated floor pocket would strand an operator or hide an impossible objective");
  for (const point of points) {
    assert.equal(tileAt(point), 0, `${point.id ?? "spawn"} occupies a collision wall`);
    assert.ok(reached.has(`${Math.floor(point.x)},${Math.floor(point.y)}`),
      `${point.id ?? "spawn"} is inaccessible without infiltrator duct travel`);
  }
});

test("Three separate rooms can hold findable sockets without reusing a task terminal", () => {
  assert.ok(map.sites.length >= 9);
  assert.ok(new Set(map.sites.map((site) => site.room)).size >= 3);
  assert.equal(new Set(map.sites.map((site) => site.id)).size, map.sites.length);
  for (const fixture of [...map.stations, ...map.sites]) {
    const room = roomById.get(fixture.room);
    assert.ok(room, `Unknown room for ${fixture.id}`);
    assert.ok(fixture.x >= room.x && fixture.x < room.x + room.w);
    assert.ok(fixture.y >= room.y && fixture.y < room.y + room.h);
    const x = Math.floor(fixture.x), y = Math.floor(fixture.y);
    assert.ok([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
      .some(([nx, ny]) => map.level[ny]?.[nx] > 0), `${fixture.id} needs a wall-mounted fixture`);
  }
  for (const site of map.sites) {
    assert.ok(map.stations.every((station) => station.x !== site.x || station.y !== site.y));
  }
  assert.equal(map.spawns.length, 8);
  assert.ok(map.stations.some((station) => station.kind === "power"));
  assert.ok(map.stations.some((station) => station.kind === "comms"));
});

test("Maintenance duct destinations exist and link in both directions", () => {
  const vents = new Map(map.vents.map((vent) => [vent.id, vent]));
  assert.equal(vents.size, map.vents.length);
  for (const vent of map.vents) {
    assert.ok(vent.links.length >= 2);
    for (const link of vent.links) {
      assert.ok(vents.has(link), `${vent.id} has an unknown destination`);
      assert.ok(vents.get(link).links.includes(vent.id), `${vent.id} has a one-way duct`);
    }
  }
});

test("Detailed equipment props stay on their declared collision footprint", () => {
  for (const floorPlan of [map, TRANSPORT_MAP]) {
    for (const prop of floorPlan.props.filter((entry) => entry.solid)) {
      const x = Math.floor(prop.x - prop.w / 2 + 0.5);
      const y = Math.floor(prop.y - prop.h / 2 + 0.5);
      for (let row = y; row < y + prop.h; row++) {
        for (let col = x; col < x + prop.w; col++) {
          assert.ok(floorPlan.level[row]?.[col] > 0, `${prop.kind} intrudes into a walkable lane`);
        }
      }
    }
  }
});

test("Medical stores contain the complete public manifest without duplicate stock IDs", () => {
  assert.equal(MEDICAL_SUPPLIES.reduce((total, item) => total + item.required, 0), 13);
  assert.equal(new Set(MEDICAL_SUPPLIES.map((item) => item.id)).size, MEDICAL_SUPPLIES.length);
  assert.equal(new Set(map.supplies.map((fixture) => fixture.id)).size, map.supplies.length);
  const categories = new Set(MEDICAL_SUPPLIES.map((item) => item.id));
  for (const fixture of map.supplies) {
    assert.ok(categories.has(fixture.supplyId), `${fixture.id} references unknown medical cargo`);
    // The classic layout leaves the extra variety cabinets empty.
    assert.ok(Number.isInteger(fixture.stock) && fixture.stock >= 0 && fixture.stock <= 2);
    const room = roomById.get(fixture.room);
    assert.ok(room && fixture.x >= room.x && fixture.x < room.x + room.w);
    assert.ok(fixture.y >= room.y && fixture.y < room.y + room.h);
    assert.ok(map.stations.some((station) => station.x === fixture.x && station.y === fixture.y),
      `${fixture.id} should reuse a collision-tested storage terminal`);
  }
  for (const category of MEDICAL_SUPPLIES) {
    assert.equal(map.supplies.filter((fixture) => fixture.supplyId === category.id)
      .reduce((total, fixture) => total + fixture.stock, 0), category.required);
  }
  assert.equal(map.loading.id, "medevac-loading");
  assert.equal(map.loading.room, "hangar");
  assert.ok(mapOf("medevac") === TRANSPORT_MAP);
  assert.equal(TRANSPORT_MAP.missionOnly, true);
  assert.equal(TRANSPORT_MAP.protocolOnly, true);
});

test("Every aircraft fixture, passenger spawn and deck is connected through ordinary doors", () => {
  const plan = TRANSPORT_MAP;
  const side = plan.level.length;
  assert.ok(plan.level.every((row) => row.length === side));
  for (let edge = 0; edge < side; edge++) {
    assert.ok(plan.level[0][edge] > 0 && plan.level[side - 1][edge] > 0);
    assert.ok(plan.level[edge][0] > 0 && plan.level[edge][side - 1] > 0);
  }
  const roomIds = new Set(plan.rooms.map((room) => room.id));
  for (const required of ["cockpit", "cabin", "cargo", "avionics"]) assert.ok(roomIds.has(required));
  const start = plan.spawns[0].map(Math.floor);
  const queue = [start], reached = new Set([start.join(",")]);
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const key = `${nx},${ny}`;
      if (plan.level[ny]?.[nx] === 0 && !reached.has(key)) {
        reached.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  assert.equal(reached.size, plan.level.flat().filter((tile) => tile === 0).length);
  for (const fixture of [...plan.stations, plan.helm, plan.avionics, plan.cargo, plan.emergency,
    ...plan.spawns.map(([x, y]) => ({ x, y }))]) {
    assert.equal(plan.level[Math.floor(fixture.y)]?.[Math.floor(fixture.x)], 0);
    assert.ok(reached.has(`${Math.floor(fixture.x)},${Math.floor(fixture.y)}`));
  }
  assert.equal(new Set(plan.spawns.map((point) => point.join(","))).size, 8);
  assert.equal(plan.sites.length, 0, "Abandoned base-charge sockets must not appear in the aircraft");
  assert.equal(plan.vents.length, 0);
  assert.ok(plan.stations.some((station) => station.kind === "power"));
  assert.ok(plan.stations.some((station) => station.kind === "comms"));
});

test("Aircraft landscape windows keep the exterior sealed while facing a walkable interior", () => {
  const plan = TRANSPORT_MAP;
  for (const window of plan.windows) {
    assert.ok(Number.isInteger(window.x) && Number.isInteger(window.y));
    assert.ok(plan.level[window.y]?.[window.x] > 0,
      `${window.id} would let a passenger walk outside the aircraft`);
    assert.equal(Math.abs(window.dx) + Math.abs(window.dy), 1);
    assert.equal(plan.level[window.y + window.dy]?.[window.x + window.dx], 0);
    assert.ok(window.w > 0 && window.w <= 1);
    assert.ok(window.h > 0 && window.sill >= 0 && window.h + window.sill <= 1.16);
  }
});
