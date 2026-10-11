import { request } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const api = await request.newContext({ baseURL: base });
const members = [];
const auth = (m, op, extra = {}) => ({ op, code: m.code, id: m.id, token: m.token, ...extra });
async function call(body, status = 200) {
  const r = await api.post("/api/games/outpost", { data: body });
  const data = await r.json();
  assert.equal(r.status(), status, data.error);
  return data;
}
try {
  await call({ op: "create", mode: "duo", difficulty: "__proto__" }, 400);
  const host = await call({
    op: "create",
    mode: "duo",
    mapId: "freight",
    weapon: "rocket",
    difficulty: "easy",
  });
  members.push(host);
  // Sequential seats put the first guest alongside the host, with six opponents.
  for (let i = 0; i < 7; i++)
    members.push(await call({ op: "join", code: host.code, weapon: "venom" }));
  const guest = members[1];
  await call(auth(guest, "settings", { difficulty: "hard" }), 403);
  await call(auth(host, "settings", { difficulty: "toString" }), 400);
  assert.equal((await call(auth(host, "settings", { difficulty: "hard" }))).difficulty, "hard");
  await call(auth(host, "rematch"), 409);
  const started = await call(auth(host, "start"));
  assert.equal(started.arena.difficulty, "hard");
  await call(auth(host, "settings", { difficulty: "easy" }), 409);
  await call(auth(guest, "rematch"), 403);
  await call(auth(host, "rematch"), 409);
  for (const opponent of members.slice(2)) await call(auth(opponent, "leave"));
  const ended = await call(auth(host, "poll"));
  assert.equal(ended.phase, "ended");
  assert.equal(ended.arena.winner, 0);
  await call(auth(guest, "rematch"), 403);
  const next = await call(auth(host, "rematch"));
  assert.equal(next.phase, "playing");
  assert.equal(next.code, host.code);
  assert.equal(next.arena.countdown, 2);
  assert.equal(next.arena.time, 0);
  assert.equal(next.arena.difficulty, "hard");
  assert.equal(next.arena.mapId, "freight");
  assert.notEqual(next.arena.roundId, ended.arena.roundId);
  assert.equal(next.arena.entities.filter((e) => e.bot).length, 6);
  for (const m of [host, guest]) {
    const e = next.arena.entities.find((e) => e.id === m.id);
    assert.equal(e.team, 0);
    assert.equal(e.hp, 100);
    assert.equal(e.damageDealt, 0);
    assert.equal(e.weapon, m === host ? "rocket" : "venom");
  }
  const checked = await call(
    auth(host, "poll", { seq: 1, input: { fire: true, forward: 1, aim: 0 } }),
  );
  assert.equal(checked.arena.time, 0);
  assert.equal(
    checked.arena.entities.find((e) => e.id === host.id).ammo,
    next.arena.entities.find((e) => e.id === host.id).ammo,
  );
  console.log(
    "Online difficulty permissions, same-team rematch, round identity and countdown passed",
  );
} finally {
  for (const m of members)
    await api.post("/api/games/outpost", { data: auth(m, "leave") }).catch(() => {});
  await api.dispose();
}
