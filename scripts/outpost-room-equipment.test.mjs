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
  )
  .replace(
    "../../../public/games/outpost-protocol.js",
    pathToFileURL(resolve("public/games/outpost-protocol.js")).href,
  );
const modulePath = join(temporary, "rooms.mjs");
await writeFile(modulePath, source);
const { roomAction } = await import(pathToFileURL(modulePath).href);
const create = () => roomAction({ op: "create", mode: "protocol" }, "protocol-room-test");
const session = r => ({ code:r.code, id:r.id, token:r.token });
test("new rooms accept only Blackout Protocol and retired clients cannot switch modes", async () => {
  for (const mode of ["training","signal","duo","__proto__",null])
    await assert.rejects(roomAction({op:"create",mode},"old-client-"+mode),/Only Blackout Protocol/);
  const host = await create();
  assert.equal(host.mode,"protocol");
  assert.equal(host.mapId,"breakwater");
  const before = JSON.stringify(rooms.get(host.code));
  for (const mode of ["training","signal","duo"])
    await assert.rejects(roomAction({op:"settings",...session(host),mode},"host"),/Only Blackout Protocol/);
  assert.equal(JSON.stringify(rooms.get(host.code)),before);
});
test("Blackout rooms keep matching kits, private roles, bot-filled seats and authoritative rematches", async () => {
  const host = await create();
  const guest = await roomAction({op:"join",code:host.code,weapon:"rocket",outfit:"hazard"},"guest");
  assert.ok(guest.members.every(m=>m.weapon==="carbine"&&m.outfit==="ranger"));
  assert.ok(guest.members.every(m=>!("team" in m)));
  await assert.rejects(roomAction({op:"poll",...session(guest),id:host.id},"guest"),/session is invalid/);
  const started = await roomAction({op:"start",...session(host)},"host");
  assert.equal(started.arena.mode,"protocol");
  assert.equal(started.arena.entities.length,8);
  assert.equal(started.arena.entities.filter(e=>e.bot).length,6);
  assert.ok(started.arena.entities.every(e=>e.weapon==="carbine"));
  assert.ok(started.arena.protocol.self);
  assert.equal(started.arena.protocol.players,undefined);
  const saved=rooms.get(host.code); saved.state.phase="ended";saved.state.arena.state="ended";
  const rematch=await roomAction({op:"rematch",...session(host)},"host");
  assert.equal(rematch.mode,"protocol");assert.equal(rematch.arena.entities.length,8);
});
test.after(async () => {
  delete globalThis.__outpostEquipmentTestSql;
  await rm(temporary, { recursive: true, force: true });
});
