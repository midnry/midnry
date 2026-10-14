import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "vite";
import { resolve } from "node:path";
import { ProtocolArena } from "../public/games/outpost-protocol.js";
import {
  hydrateRoom,
  predictionAllowed,
  predictStep,
  MovementPrediction,
} from "../public/games/outpost-realtime.js";
let vite, LiveRoom, sameSocketOrigin;
test.before(async () => {
  vite = await createServer({
    configFile: false,
    resolve: { alias: { "@": resolve("src") } },
    server: { middlewareMode: true },
  });
  ({ LiveRoom, sameSocketOrigin } = await vite.ssrLoadModule(
    "/src/games/outpost/realtime.server.ts",
  ));
});
test.after(async () => {
  await vite?.close();
});
const token = "a".repeat(48),
  hash = createHash("sha256").update(token).digest("hex");
function fixture() {
  const a = new ProtocolArena({
    humans: Array.from({ length: 8 }, (_, i) => ({ id: "p" + i, name: "Patrol " + i })),
    rolePreference: "operator",
    random: () => 0.4,
  });
  const now = Date.now(),
    room = {
      mode: "protocol",
      mapId: "breakwater",
      phase: "playing",
      host: "p0",
      members: a.entities.map((e) => ({
        id: e.id,
        name: e.name,
        hash,
        team: 0,
        weapon: "carbine",
        seq: -1,
        input: {},
        inputAt: now,
        lastSeen: now,
      })),
      arena: a.snapshot(),
      updatedAt: now,
      nextName: 9,
    };
  const store = {
    writes: [],
    load: async () => ({ state: structuredClone(room), version: 1 }),
    save: async function (code, state, version) {
      this.writes.push(structuredClone(state));
      return version + 1;
    },
  };
  const runner = new LiveRoom("ABCDEF", { state: room, version: 1 }, store);
  const peer = () => {
    const sent = [],
      closed = [];
    return {
      sent,
      closed,
      bufferedAmount: 0,
      send: (s) => sent.push(JSON.parse(s)),
      close: (...x) => closed.push(x),
    };
  };
  return { runner, peer, store, a };
}
test("one fixed tick advances all players once; acceptance does not acknowledge unapplied movement", () => {
  const { runner: r, peer } = fixture(),
    s = r.attach(peer(), "p0", token),
    e = r.game.entities[0],
    x = e.x;
  r.input(s, { seq: 4, input: { forward: 1, aim: 0, x: 999, hp: 999, role: "infiltrator" } });
  assert.equal(r.response("p0").ack, -1);
  assert.equal(e.x, x);
  r.advance(r.last + 50);
  assert.ok(Math.abs(e.x - x - 0.09) < 0.001);
  assert.equal(r.response("p0").motionAck, 4);
  r.input(s, { seq: 3, input: { forward: -1 } });
  assert.equal(r.room.members[0].seq, 4);
  r.stop();
});
test("every socket receives only its private orders and public map deltas", () => {
  const { runner: r, peer } = fixture(),
    peers = [];
  for (const m of r.room.members) {
    const p = peer();
    peers.push(p);
    r.attach(p, m.id, token);
  }
  r.broadcast();
  r.broadcast();
  for (let i = 0; i < peers.length; i++) {
    const packets = peers[i].sent.filter((p) => p.type === "state"),
      first = packets[0],
      second = packets[1];
    assert.ok(first.room.arena.level);
    assert.equal(second.room.arena.level, undefined);
    assert.equal(first.room.arena.protocol.players, undefined);
    assert.equal(
      first.room.members.some((m) => m.hash || m.team !== undefined),
      false,
    );
    assert.ok(first.room.arena.protocol.self.role);
    assert.ok(
      first.room.arena.entities.filter((e) => e.id !== "p" + i).every((e) => e.team === -1),
    );
    assert.deepEqual(
      hydrateRoom(second.room, first.room, second.full).arena.level,
      first.room.arena.level,
    );
  }
  r.stop();
});
test("bad capabilities, cross-site upgrades and rejected control actions cannot change the room", async () => {
  const { runner: r, peer } = fixture();
  assert.throws(() => r.attach(peer(), "p0", "b".repeat(48)), /invalid/);
  const before = JSON.stringify(r.room);
  await assert.rejects(
    r.action({ op: "settings", code: "ABCDEF", id: "p1", token, mode: "duo" }),
    /Only the host/,
  );
  assert.equal(JSON.stringify(r.room), before);
  assert.equal(
    sameSocketOrigin(
      new Request("https://midnry.com/api/games/outpost/socket", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    sameSocketOrigin(
      new Request("http://internal/api/games/outpost/socket", {
        headers: { origin: "https://www.midnry.com", "x-forwarded-host": "www.midnry.com" },
      }),
    ),
    true,
  );
  r.stop();
});
test("reconnect preserves identity and dead operators cannot resume as living soldiers", async () => {
  const { runner: r, peer } = fixture(),
    p = peer(),
    s = r.attach(p, "p0", token);
  r.game.entities[0].hp = 0;
  r.snapshot();
  const result = await r.action({ op: "resume", code: "ABCDEF", id: "p0", token });
  assert.equal(result.id, "p0");
  assert.equal(result.arena.entities[0].hp, 0);
  r.detach(s);
  const next = r.attach(peer(), "p0", token);
  assert.equal(next.id, "p0");
  assert.equal(r.game.entities[0].hp, 0);
  r.stop();
});
test("voice signalling is limited to opted-in living neighbours or the living meeting", () => {
  const { runner: r, peer } = fixture(),
    p = peer(),
    q = peer(),
    s = r.attach(p, "p0", token),
    t = r.attach(q, "p1", token);
  s.voice = t.voice = true;
  Object.assign(r.game.entities[0], { x: 3.5, y: 5.5 });
  Object.assign(r.game.entities[1], { x: 4.5, y: 5.5 });
  assert.deepEqual(
    r.voicePeers(s).map((x) => x.id),
    ["p1"],
  );
  r.signal(s, { to: "p1", description: { type: "offer", sdp: "bounded test offer" } });
  assert.equal(q.sent.at(-1).from, "p0");
  const pcm = Buffer.alloc(2560).toString("base64");
  r.relayAudio(s, { targets: ["p1"], pcm });
  assert.equal(q.sent.at(-1).type, "voice-audio");
  assert.equal(q.sent.at(-1).pcm, pcm);
  const liveCount = q.sent.length;
  r.relayAudio(s, { targets: ["p1"], pcm: "a".repeat(15000) });
  assert.equal(q.sent.length, liveCount);
  r.game.protocol.phase = "discussion";
  Object.assign(r.game.entities[1], { x: 21.5, y: 7.5 });
  r.snapshot();
  assert.equal(r.voicePeers(s).length, 1, "living meeting uses shared radio");
  r.game.protocol.sabotage.commsUntil = r.game.time + 10;
  r.snapshot();
  assert.equal(r.voicePeers(s).length, 0, "jammed radio still requires ordinary proximity");
  r.game.entities[1].hp = 0;
  assert.deepEqual(r.voicePeers(s), []);
  const n = q.sent.length;
  r.signal(s, { to: "p1", description: { type: "offer", sdp: "x" } });
  r.relayAudio(s, { targets: ["p1"], pcm });
  assert.equal(q.sent.length, n);
  r.stop();
});
test("prediction uses the same collision, diagonal normalization and pace as the real server", () => {
  for (const input of [
    { forward: 1, aim: 0 },
    { forward: 1, strafe: 1, aim: 0.3, sprint: true },
    { forward: -1, aim: 0 },
  ]) {
    const a = new ProtocolArena({
      humans: [{ id: "p" }],
      rolePreference: "operator",
      random: () => 0.4,
    });
    for (const e of a.entities) e.bot = false;
    const copy = Object.assign(Object.create(Object.getPrototypeOf(a)), a);
    copy.entities = a.entities.map((e) => ({ ...e }));
    const e = copy.entities[0];
    predictStep(copy, e, input, 0.05);
    a.advance(0.05, { p: input });
    assert.ok(Math.abs(e.x - a.entities[0].x) < 0.0001 && Math.abs(e.y - a.entities[0].y) < 0.0001);
  }
});
test("prediction never completes tasks, spends ammunition or moves ghosts, meetings and pilots", () => {
  const { a } = fixture(),
    e = a.entities[0],
    before = JSON.stringify(a.protocol);
  predictStep(a, e, { forward: 1, interact: true, fire: true, aim: 0 }, 0.05);
  assert.equal(JSON.stringify(a.protocol), before);
  for (const phase of ["discussion", "vote"]) {
    a.protocol.phase = phase;
    assert.equal(predictionAllowed(a, e.id), false);
  }
  a.protocol.phase = "roam";
  a.protocol.mission.vehicle.pilotId = e.id;
  assert.equal(predictionAllowed(a, e.id), false);
  a.protocol.mission.vehicle.pilotId = null;
  e.hp = 0;
  assert.equal(predictionAllowed(a, e.id), false);
});
