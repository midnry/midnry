import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
  );
const modulePath = join(temporary, "rooms.mjs");
await writeFile(modulePath, source);
const { roomAction } = await import(pathToFileURL(modulePath).href);
const create = () =>
  roomAction({ op: "create", mode: "duo", weapon: "carbine", outfit: "ranger" }, "equipment-test");
const session = (r) => ({ code: r.code, id: r.id, token: r.token });
test("room uniforms validate on create, join and loadout without altering a rejected request", async () => {
  await assert.rejects(
    roomAction(
      { op: "create", mode: "duo", weapon: "carbine", outfit: "fake" },
      "invalid-equipment",
    ),
    /valid outfit/,
  );
  const host = await create();
  await assert.rejects(
    roomAction({ op: "join", code: host.code, weapon: "rocket", outfit: "__proto__" }, "guest"),
    /valid outfit/,
  );
  assert.equal(rooms.get(host.code).state.members.length, 1);
  const guest = await roomAction(
    { op: "join", code: host.code, weapon: "rocket", outfit: "hazard" },
    "guest",
  );
  assert.equal(guest.members.find((m) => m.id === guest.id).outfit, "hazard");
  for (const outfit of [
    "ranger",
    "desert",
    "urban",
    "medic",
    "recon",
    "engineer",
    "alpine",
    "sentinel",
    "shadow",
    "hazard",
  ]) {
    const response = await roomAction(
      { op: "loadout", ...session(host), weapon: "veil", outfit },
      "host",
    );
    assert.equal(response.members.find((m) => m.id === host.id).outfit, outfit);
  }
  const before = JSON.stringify(rooms.get(host.code));
  await assert.rejects(
    roomAction({ op: "loadout", ...session(host), weapon: "rocket", outfit: "invalid" }, "host"),
    /valid outfit/,
  );
  assert.equal(JSON.stringify(rooms.get(host.code)), before);
  await assert.rejects(
    roomAction(
      { op: "loadout", ...session(guest), id: host.id, weapon: "rocket", outfit: "medic" },
      "guest",
    ),
    /session is invalid/,
  );
});
test("authoritative start and rematch retain human uniforms and varied bot equipment", async () => {
  const host = await create(),
    guest = await roomAction(
      { op: "join", code: host.code, weapon: "rocket", outfit: "hazard" },
      "guest",
    );
  await roomAction({ op: "loadout", ...session(host), weapon: "reaper", outfit: "medic" }, "host");
  const started = await roomAction({ op: "start", ...session(host) }, "host");
  assert.equal(started.arena.entities.find((e) => e.id === host.id).outfit, "medic");
  assert.equal(started.arena.entities.find((e) => e.id === guest.id).weapon, "rocket");
  assert.equal(started.arena.entities.find((e) => e.id === guest.id).outfit, "hazard");
  const bots = started.arena.entities.filter((e) => e.bot);
  assert.equal(new Set(bots.map((e) => e.weapon)).size, bots.length);
  assert.equal(new Set(bots.map((e) => e.outfit)).size, bots.length);
  await assert.rejects(
    roomAction({ op: "loadout", ...session(host), weapon: "carbine", outfit: "urban" }, "host"),
    /before starting/,
  );
  const saved = rooms.get(host.code);
  saved.state.phase = "ended";
  saved.state.arena.state = "ended";
  const rematch = await roomAction({ op: "rematch", ...session(host) }, "host");
  assert.equal(rematch.arena.entities.find((e) => e.id === host.id).outfit, "medic");
  assert.equal(rematch.arena.entities.find((e) => e.id === guest.id).outfit, "hazard");
});
test.after(async () => {
  delete globalThis.__outpostEquipmentTestSql;
  await rm(temporary, { recursive: true, force: true });
});
