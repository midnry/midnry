import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { restoreArena } from "../public/games/outpost-protocol.js";
// Exercise the actual room handler, substituting only its SQL transport.
const rooms = new Map();
globalThis.__outpostEquipmentTestSql = async (strings, ...values) => {
  const query = strings.join("?");
  if (query.startsWith("delete")) return [];
  if (query.includes("count(*)")) return [{ n: rooms.size }];
  if (query.startsWith("insert")) {
    if (rooms.has(values[0])) return [];
    rooms.set(values[0], { version: 1, state: JSON.parse(values[1]) });
    return [{ code: values[0] }];
  }
  if (query.startsWith("select version")) {
    const row = rooms.get(values[0]);
    return row ? [JSON.parse(JSON.stringify(row))] : [];
  }
  if (query.startsWith("update")) {
    const row = rooms.get(values[1]);
    if (!row || row.version !== values[2]) return [];
    row.state = JSON.parse(values[0]);
    row.version++;
    return [{ version: row.version }];
  }
  throw Error("Unexpected SQL transport operation");
};
const temporary = await mkdtemp(join(tmpdir(), "outpost-room-equipment-"));
let source = ts.transpileModule(await readFile("src/games/outpost/rooms.server.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
source = source
  .replace(
    /import \{ getSql \} from ["']@\/lib\/db["'];/,
    "const getSql=async()=>globalThis.__outpostEquipmentTestSql;",
  )
  .replace(
    "../../../public/games/outpost-sim.js",
    pathToFileURL(resolve("public/games/outpost-sim.js")).href,
  )
  .replace(
    "../../../public/games/outpost-protocol.js",
    pathToFileURL(resolve("public/games/outpost-protocol.js")).href,
  )
  .replace(
    "../../../public/games/outpost-variety.js",
    pathToFileURL(resolve("public/games/outpost-variety.js")).href,
  );
const modulePath = join(temporary, "rooms.mjs");
await writeFile(modulePath, source);
const { roomAction } = await import(pathToFileURL(modulePath).href);
const create = () => roomAction({ op: "create", mode: "protocol" }, "protocol-room-test");
const session = (r) => ({ code: r.code, id: r.id, token: r.token });
test("new rooms accept only Blackout Protocol and retired clients cannot switch modes", async () => {
  for (const mode of ["training", "signal", "duo", "__proto__", null])
    await assert.rejects(
      roomAction({ op: "create", mode }, "old-client-" + mode),
      /Only Blackout Protocol/,
    );
  const host = await create();
  assert.equal(host.mode, "protocol");
  assert.equal(host.mapId, "breakwater");
  const before = JSON.stringify(rooms.get(host.code));
  for (const mode of ["training", "signal", "duo"])
    await assert.rejects(
      roomAction({ op: "settings", ...session(host), mode }, "host"),
      /Only Blackout Protocol/,
    );
  assert.equal(JSON.stringify(rooms.get(host.code)), before);
});
test("Blackout rooms keep matching kits, private roles, bot-filled seats and authoritative rematches", async () => {
  const host = await create();
  const guest = await roomAction(
    { op: "join", code: host.code, weapon: "rocket", outfit: "hazard" },
    "guest",
  );
  assert.ok(guest.members.every((m) => m.weapon === "carbine" && m.outfit === "ranger"));
  assert.ok(guest.members.every((m) => !("team" in m)));
  await assert.rejects(
    roomAction({ op: "poll", ...session(guest), id: host.id }, "guest"),
    /session is invalid/,
  );
  const started = await roomAction({ op: "start", ...session(host) }, "host");
  assert.equal(started.arena.mode, "protocol");
  assert.equal(started.arena.entities.length, 8);
  assert.equal(started.arena.entities.filter((e) => e.bot).length, 6);
  assert.ok(started.arena.entities.every((e) => e.weapon === "carbine"));
  assert.ok(started.arena.protocol.self);
  assert.equal(started.arena.protocol.players, undefined);
  const saved = rooms.get(host.code);
  saved.state.phase = "ended";
  saved.state.arena.state = "ended";
  const rematch = await roomAction({ op: "rematch", ...session(host) }, "host");
  assert.equal(rematch.mode, "protocol");
  assert.equal(rematch.arena.entities.length, 8);
});
test("authenticated online votes unlock Last Stand weapons only for opposing public sides", async () => {
  const host = await create(),
    members = [host];
  for (let i = 0; i < 7; i++)
    members.push(await roomAction({ op: "join", code: host.code }, `last-stand-${i}`));
  await roomAction({ op: "start", ...session(host) }, "host");
  const row = rooms.get(host.code),
    a = restoreArena(row.state.arena),
    e = a.entities.find((e) => e.id === host.id),
    target = a.entities.find((e) => e.id === members[1].id);
  for (const entity of a.entities) {
    entity.x = 14.5;
    entity.y = 14.5;
    entity.bot = false;
  }
  Object.assign(e, { x: a.protocol.emergency.x, y: a.protocol.emergency.y });
  a.entities.find((e) => e.id === members[7].id).hp = 0;
  // Rooms deal a random modifier; Radio silence would delay this meeting.
  a.protocol.emergencyReadyAt = 0;
  a.action(e, { seq: 0, op: "meeting" });
  a.protocol.phase = "vote";
  a.time = a.protocol.meeting.discussionUntil;
  row.state.arena = JSON.parse(JSON.stringify(a.snapshot()));
  for (const member of members.slice(0, 4)) {
    row.state.updatedAt = Date.now() - 60;
    await roomAction(
      {
        op: "poll",
        ...session(member),
        seq: 1,
        input: { protocolAction: { seq: 1, op: "vote", target: target.id } },
      },
      "vote",
    );
  }
  row.state.arena.protocol.meeting.voteUntil = row.state.arena.time + 0.001;
  row.state.updatedAt = Date.now() - 100;
  const combat = await roomAction({ op: "poll", ...session(host), seq: 2, input: {} }, "host");
  assert.equal(combat.arena.protocol.phase, "combat");
  assert.equal(combat.arena.protocol.combat.participants.length, 7);
  assert.equal(combat.arena.entities.find((e) => e.id === target.id).hp, 100);
  const state = row.state.arena,
    shooter = state.entities.find((e) => e.id === host.id),
    enemy = state.entities.find((e) => e.id === target.id),
    mate = state.entities.find((e) => e.id === members[2].id);
  Object.assign(shooter, { x: 3.5, y: 5.5, a: 0 });
  Object.assign(enemy, { x: 6.5, y: 5.5 });
  Object.assign(mate, { x: 4.5, y: 5.5 });
  const early = await roomAction(
    {
      op: "poll",
      ...session(host),
      seq: 3,
      input: { fire: true, aim: 0, damage: 999, target: target.id },
    },
    "host",
  );
  assert.equal(
    early.arena.entities.find((e) => e.id === target.id).hp,
    100,
    "countdown blocks firing",
  );
  row.state.arena.protocol.combat.startsAt = row.state.arena.time - 0.1;
  const friendly = await roomAction(
    { op: "poll", ...session(host), seq: 4, input: { fire: true, aim: 0 } },
    "host",
  );
  assert.equal(
    friendly.arena.entities.find((e) => e.id === mate.id).hp,
    100,
    "friendly crew cannot be damaged",
  );
  row.state.arena.entities.find((e) => e.id === mate.id).x = 14.5;
  for (let seq = 5; seq <= 7; seq++) {
    await new Promise((resolve) => setTimeout(resolve, 160));
    await roomAction({ op: "poll", ...session(host), seq, input: { fire: true, aim: 0 } }, "host");
  }
  row.state.updatedAt = Date.now() - 100;
  const resumed = await roomAction(
    {
      op: "poll",
      ...session(host),
      seq: 8,
      input: { fire: true, combat: { phase: "combat" }, hp: 999 },
    },
    "host",
  );
  assert.equal(resumed.arena.entities.find((e) => e.id === target.id).hp, 0);
  assert.equal(resumed.arena.protocol.phase, "roam");
  assert.equal(resumed.arena.entities.find((e) => e.id === host.id).ammo, 0);
  assert.equal(resumed.arena.protocol.players, undefined);
  assert.equal(resumed.arena.protocol.revealedRoles, undefined);
  assert.ok(resumed.arena.entities.filter((e) => e.id !== host.id).every((e) => e.team === -1));
});
test.after(async () => {
  delete globalThis.__outpostEquipmentTestSql;
  await rm(temporary, { recursive: true, force: true });
});
test("hosts lock a match modifier and the role reveal; guests and bad values are refused", async () => {
  const host = await create();
  const guest = await roomAction({ op: "join", code: host.code }, "settings-guest");
  await assert.rejects(
    roomAction({ op: "settings", ...session(guest), modifier: "rush" }, "settings-guest"),
    /Only the host/,
  );
  await assert.rejects(
    roomAction({ op: "settings", ...session(host), modifier: "chaos" }, "host"),
    /Invalid match modifier/,
  );
  await assert.rejects(
    roomAction({ op: "settings", ...session(host), reveal: "yes" }, "host"),
    /Invalid reveal/,
  );
  const set = await roomAction(
    { op: "settings", ...session(host), modifier: "rush", reveal: false },
    "host",
  );
  assert.equal(set.modifier, "rush");
  assert.equal(set.reveal, false);
  const started = await roomAction({ op: "start", ...session(host) }, "host");
  assert.equal(started.arena.protocol.match.modifier, "rush");
  assert.ok(started.arena.protocol.match.twist);
  assert.equal(started.arena.protocol.revealRoles, false);
  assert.ok(started.arena.protocol.mission.patients[0].decay > 0.22);
});
