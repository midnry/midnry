import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createServer } from "vite";

// Load the actual TypeScript helpers without issuing SQL or replacing the
// database. This checks the full response envelope as well as the simulation
// view, so a later roster/settings change cannot accidentally reveal roles.
const root = fileURLToPath(new URL("../", import.meta.url));
let server, inputOf, publicRoom, lobbyMapOf, createArena;
before(async () => {
  server = await createServer({
    configFile: false,
    root,
    logLevel: "error",
    resolve: { alias: { "@": resolve(root, "src") } },
    server: { middlewareMode: true, ws: false, watch: null },
    appType: "custom",
  });
  ({ inputOf, publicRoom, lobbyMapOf } = await server.ssrLoadModule(
    "/src/games/outpost/rooms.server.ts",
  ));
  ({ createArena } = await server.ssrLoadModule("/public/games/outpost-protocol.js"));
});
after(async () => {
  await server?.close();
});

test("room input accepts only bounded protocol intent and ignores forged state", () => {
  const input = inputOf({
    forward: 10,
    strafe: -10,
    aim: Infinity,
    pitch: -2,
    interact: true,
    fire: "true",
    hp: 999,
    role: "infiltrator",
    progress: 100,
    protocolAction: {
      seq: 7,
      op: "chat",
      value: "  Check the generator room.  ",
      role: "infiltrator",
      damage: 999,
      bombState: "armed",
    },
  });
  assert.equal(input.forward, 1);
  assert.equal(input.strafe, -1);
  assert.equal(input.aim, 0);
  assert.equal(input.pitch, -1);
  assert.equal(input.interact, true);
  assert.equal(input.fire, false);
  assert.deepEqual(input.protocolAction, {
    seq: 7,
    op: "chat",
    value: "Check the generator room.",
  });
  assert.ok(!("role" in input));
  assert.ok(!("progress" in input));
  assert.ok(!("hp" in input));
});

test("room input drops malformed actions without disrupting movement", () => {
  const malformed = [
    { seq: -1, op: "meeting" },
    { seq: 1.5, op: "meeting" },
    { seq: Number.MAX_SAFE_INTEGER + 1, op: "meeting" },
    { seq: 1, op: "setRole", value: "infiltrator" },
    { seq: 1, op: "toString" },
    { seq: 1, op: "chat", value: "a".repeat(181) },
    { seq: 1, op: "chat", value: "bad\u0000message" },
    { seq: 1, op: "vote", target: "a".repeat(81) },
    { seq: 1, op: "vote", target: { id: "operator" } },
    { seq: 1, op: "wire", value: [1, 2, 3] },
    [],
  ];
  for (const action of malformed) {
    const input = inputOf({ forward: 0.25, protocolAction: action });
    assert.equal(input.forward, 0.25);
    assert.equal(input.protocolAction, undefined);
  }
  assert.deepEqual(inputOf(null), {});
  assert.deepEqual(inputOf([]), {});
});

test("vehicle input preserves pilot axes while dropping forged flight and mission state", () => {
  const input = inputOf({
    vehicleInput: {
      pitch: 10,
      steer: -10,
      autopilot: true,
      pilotId: "guest",
      progress: 1,
      altitude: 1,
      stability: 100,
      underControl: true,
    },
    mission: { phase: "delivered", patients: [{ hp: 100 }] },
    cargo: { supplyId: "trauma" },
    protocolAction: { seq: 4, op: "autopilot", underControl: true },
  });
  assert.deepEqual(input.vehicleInput, { pitch: 1, steer: -1 });
  assert.deepEqual(input.protocolAction, { seq: 4, op: "autopilot" });
  assert.ok(!("mission" in input));
  assert.ok(!("cargo" in input));
  assert.deepEqual(inputOf({ vehicleInput: { pitch: NaN, steer: Infinity } }).vehicleInput, {
    pitch: 0,
    steer: 0,
  });
  assert.deepEqual(inputOf({ vehicleInput: { pitch: "1", steer: null } }).vehicleInput, {
    pitch: 0,
    steer: 0,
  });
  assert.deepEqual(inputOf({ vehicleInput: { pitch: 0.3, steer: -0.6 } }).vehicleInput, {
    pitch: 0.3,
    steer: -0.6,
  });
  for (const value of [null, [], "autopilot", false])
    assert.equal(inputOf({ vehicleInput: value }).vehicleInput, undefined);
});

test("transport action intents remain bounded and cannot submit completion", () => {
  for (const op of ["helm", "release-helm", "autopilot", "disable-autopilot", "cargo-sabotage"]) {
    assert.deepEqual(
      inputOf({
        protocolAction: { seq: 8, op, target: "avionics", completed: true, duration: 0 },
      }).protocolAction,
      { seq: 8, op, target: "avionics" },
    );
    assert.equal(inputOf({ protocolAction: { seq: -1, op } }).protocolAction, undefined);
    assert.equal(
      inputOf({ protocolAction: { seq: 8, op, target: "x".repeat(81) } }).protocolAction,
      undefined,
    );
  }
  for (const op of ["departMission", "setPilot", "deliver", "setVehicle", "completeManifest"])
    assert.equal(inputOf({ protocolAction: { seq: 9, op } }).protocolAction, undefined);
});

test("mission transport cannot be chosen from any lobby or classic combat", () => {
  for (const mode of ["protocol", "signal", "duo"]) {
    assert.throws(() => lobbyMapOf(mode, "medevac"), /opens after loading/);
  }
  for (const mode of ["signal", "duo"]) {
    assert.throws(() => lobbyMapOf(mode, "breakwater"), /valid combat map/);
    assert.throws(() => lobbyMapOf(mode, "__proto__"), /valid combat map/);
    assert.equal(lobbyMapOf(mode, "estate"), "estate");
    assert.equal(lobbyMapOf(mode), "outpost");
  }
  assert.equal(lobbyMapOf("protocol"), "breakwater");
  assert.equal(lobbyMapOf("protocol", "estate"), "breakwater");
});

test("every room recipient gets only their own protocol role and no roster team", () => {
  const humans = ["host", "guest"].map((id, team) => ({ id, team, name: id, weapon: "rocket" }));
  const arena = createArena({ mode: "protocol", humans, random: () => 0.5 });
  const snapshot = arena.snapshot();
  const before = JSON.stringify(snapshot);
  const room = {
    mode: "protocol",
    mapId: "breakwater",
    phase: "playing",
    host: "host",
    updatedAt: Date.now(),
    nextName: 3,
    arena: snapshot,
    members: humans.map((h) => ({
      ...h,
      hash: "secret-session-hash",
      lastSeen: Date.now(),
      inputAt: Date.now(),
      seq: 100,
      input: { protocolAction: { seq: 100, op: "wire", value: "123" } },
    })),
  };
  for (const id of ["host", "guest", "missing-recipient"]) {
    const view = publicRoom("ABC234", room, id);
    const serialized = JSON.stringify(view);
    assert.equal(view.mapId, "breakwater");
    assert.ok(view.members.every((member) => !("team" in member)));
    assert.ok(view.members.every((member) => member.weapon === "carbine"));
    assert.ok(!serialized.includes("secret-session-hash"));
    assert.ok(!serialized.includes('"input"'));
    assert.ok(
      view.members.every(
        (member) => !("seq" in member) && !("input" in member) && !("hash" in member),
      ),
    );
    assert.ok(view.arena.entities.every((entity) => entity.path.length === 0));
    assert.ok(
      view.arena.entities
        .filter((entity) => entity.id !== id)
        .every((entity) => !("role" in entity)),
    );
    assert.ok(
      view.arena.entities
        .filter((entity) => entity.id !== id)
        .every((entity) => entity.team !== 0 && entity.team !== 1),
    );
    assert.ok(!view.arena.protocol.revealedRoles);
    if (id !== "missing-recipient")
      assert.ok(["operator", "infiltrator"].includes(view.arena.protocol.self.role));
    // Recipient copies must never mutate the private database snapshot.
    view.arena.entities[0].x = 999;
  }
  assert.equal(JSON.stringify(snapshot), before);
});

test("medical room envelope follows the flight map and keeps cargo and goals recipient private", () => {
  const humans = ["host", "guest"].map((id, team) => ({ id, team, name: id }));
  const arena = createArena({ mode: "protocol", humans, random: () => 0.5 });
  arena.protocol.players.host.cargo = { supplyId: "trauma", name: "HOST_PRIVATE_KIT" };
  arena.protocol.players.guest.cargo = { supplyId: "surgical", name: "GUEST_PRIVATE_KIT" };
  arena.protocol.players.host.botGoal = { id: "PRIVATE_CARGO_ROUTE", x: 8, y: 8 };
  arena.protocol.players.guest.botGoal = { id: "PRIVATE_HIDDEN_CHARGE_ROUTE", x: 3, y: 3 };
  const snapshot = arena.snapshot();
  assert.ok(snapshot.protocol.mission, "authoritative medical mission exists");
  // A persisted extension must not silently add secrets to a public mission.
  snapshot.protocol.mission.privateOwner = "PRIVATE_MISSION_OWNER";
  snapshot.protocol.mission.vehicle.privateRole = "PRIVATE_PILOT_ROLE";
  snapshot.protocol.mission.patients[0].privateHint = "PRIVATE_PATIENT_HINT";
  snapshot.mapId = "medevac";
  snapshot.protocol.mission.phase = "transport";
  const before = JSON.stringify(snapshot);
  const room = {
    mode: "protocol",
    mapId: "breakwater",
    phase: "playing",
    host: "host",
    updatedAt: Date.now(),
    nextName: 3,
    arena: snapshot,
    members: humans.map((h) => ({ ...h, weapon: "carbine", lastSeen: Date.now() })),
  };
  for (const id of ["host", "guest", "missing-recipient"]) {
    const view = publicRoom("ABC234", room, id);
    const serialized = JSON.stringify(view);
    assert.equal(view.mapId, "medevac");
    assert.equal(view.arena.mapId, "medevac");
    assert.equal(view.arena.protocol.mission.phase, "transport");
    assert.ok(Array.isArray(view.arena.protocol.mission.manifest));
    assert.ok(Array.isArray(view.arena.protocol.mission.patients));
    for (const secret of [
      "PRIVATE_CARGO_ROUTE",
      "PRIVATE_HIDDEN_CHARGE_ROUTE",
      "PRIVATE_MISSION_OWNER",
      "PRIVATE_PILOT_ROLE",
      "PRIVATE_PATIENT_HINT",
    ])
      assert.ok(!serialized.includes(secret), secret);
    assert.equal(view.arena.protocol.players, undefined);
    if (id === "missing-recipient") {
      assert.equal(view.arena.protocol.self, null);
      assert.ok(!serialized.includes("HOST_PRIVATE_KIT"));
      assert.ok(!serialized.includes("GUEST_PRIVATE_KIT"));
    } else {
      const own = id === "host" ? "HOST_PRIVATE_KIT" : "GUEST_PRIVATE_KIT";
      const other = id === "host" ? "GUEST_PRIVATE_KIT" : "HOST_PRIVATE_KIT";
      assert.equal(view.arena.protocol.self.cargo.name, own);
      assert.ok(!serialized.includes(other));
    }
    view.arena.protocol.mission.patients[0].hp = 999;
  }
  assert.equal(publicRoom("ABC234", { ...room, phase: "lobby" }, "host").mapId, "breakwater");
  assert.equal(JSON.stringify(snapshot), before);
});

test("sanitized client payload cannot skip collection, create cargo or claim flight control", () => {
  const arena = createArena({
    mode: "protocol",
    rolePreference: "operator",
    humans: [{ id: "host", name: "Host", team: 0 }],
    random: () => 0.5,
  });
  // Isolate the human request from bot actions; these still use the actual
  // authoritative simulation and its normal public input boundary.
  for (const entity of arena.entities) entity.bot = false;
  const before = JSON.parse(JSON.stringify(arena.protocol.mission));
  const input = inputOf({
    vehicleInput: { pitch: 100, steer: 100, pilotId: "host", autopilot: true, arrived: true },
    mission: { phase: "delivered", manifest: [{ id: "trauma", loaded: 999 }] },
    cargo: { supplyId: "trauma", name: "Forged kit" },
    protocolAction: { seq: 1, op: "helm", target: "host", completed: true },
  });
  arena.advance(0.05, { host: input });
  assert.equal(arena.mapId, "breakwater");
  assert.equal(arena.protocol.mission.phase, "base");
  assert.equal(arena.protocol.players.host.cargo, null);
  assert.deepEqual(arena.protocol.mission.manifest, before.manifest);
  assert.equal(arena.protocol.mission.vehicle.pilotId, null);
  assert.equal(arena.protocol.mission.vehicle.arrived, false);
  assert.equal(arena.protocol.mission.vehicle.progress, 0);
  assert.equal(arena.state, "playing");
});

test("classic room envelope retains duo teams and strips private paths", () => {
  const arena = createArena({ mode: "duo", humans: [{ id: "host", name: "Host", team: 0 }] });
  const room = {
    mode: "duo",
    mapId: "outpost",
    phase: "playing",
    host: "host",
    updatedAt: Date.now(),
    nextName: 2,
    arena: arena.snapshot(),
    members: [{ id: "host", name: "Host", team: 0, weapon: "scatter", lastSeen: Date.now() }],
  };
  room.arena.entities[0].path = [{ x: 15, y: 15 }];
  const view = publicRoom("ABC234", room, "host");
  assert.equal(view.members[0].team, 0);
  assert.equal(view.members[0].weapon, "scatter");
  assert.deepEqual(view.arena.entities[0].path, []);
  assert.equal(view.arena.entities[0].team, 0);
});
