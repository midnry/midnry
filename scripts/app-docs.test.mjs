// Saved app documents (src/lib/app-docs.server.ts): compare-and-set saves on
// the revision column from migrations/0023, run against PGLite with every
// migration applied. Synthetic users only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createJiti } from "jiti";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "./migration-plan.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@": join(root, "src") } });
const D = await jiti.import("../src/lib/app-docs.server.ts");
const migrationsDir = join(root, "migrations");

async function freshDb({ upTo } = {}) {
  const pg = new PGlite();
  for (const { name } of pendingMigrations(readdirSync(migrationsDir), [])) {
    if (upTo && name > upTo) break;
    await pg.exec(readFileSync(join(migrationsDir, name), "utf8"));
  }
  return { pg, sql: { query: async (text, params = []) => (await pg.query(text, params)).rows } };
}

test("rows saved before the migration keep their payload and start at revision 0", async () => {
  const { pg, sql } = await freshDb({ upTo: "0022_creator_payouts.sql" });
  await pg.query(`insert into app_documents (user_id, app_id, payload) values ('u-old', 'ledger', '{"entries":[1]}')`);
  await pg.exec(readFileSync(join(migrationsDir, "0023_app_document_revision.sql"), "utf8"));
  // Running it twice is harmless.
  await pg.exec(readFileSync(join(migrationsDir, "0023_app_document_revision.sql"), "utf8"));
  assert.deepEqual(await D.readDoc(sql, "u-old", "ledger"), { payload: '{"entries":[1]}', revision: 0 });
  const saved = await D.writeDoc(sql, "u-old", "ledger", '{"entries":[1,2]}', 0);
  assert.deepEqual(saved, { ok: true, revision: 1 });
});

test("a missing document reads as revision 0 and the first save creates it", async () => {
  const { sql } = await freshDb();
  assert.deepEqual(await D.readDoc(sql, "u1", "board"), { payload: null, revision: 0 });
  assert.deepEqual(await D.writeDoc(sql, "u1", "board", "{}", 0), { ok: true, revision: 1 });
  assert.deepEqual(await D.writeDoc(sql, "u1", "board", '{"a":1}', 1), { ok: true, revision: 2 });
  assert.deepEqual(await D.readDoc(sql, "u1", "board"), { payload: '{"a":1}', revision: 2 });
});

test("two tabs: the stale save is refused and the newer payload is kept", async () => {
  const { sql } = await freshDb();
  await D.writeDoc(sql, "u2", "invoice", '{"v":"start"}', 0);
  const tabA = await D.readDoc(sql, "u2", "invoice");
  const tabB = await D.readDoc(sql, "u2", "invoice");
  assert.deepEqual(await D.writeDoc(sql, "u2", "invoice", '{"v":"A"}', tabA.revision), { ok: true, revision: 2 });
  assert.deepEqual(await D.writeDoc(sql, "u2", "invoice", '{"v":"B"}', tabB.revision), { ok: false, error: "conflict", revision: 2 });
  assert.equal((await D.readDoc(sql, "u2", "invoice")).payload, '{"v":"A"}');
  // Two first saves racing on an empty document: one wins, one conflicts.
  const first = await D.writeDoc(sql, "u2", "meds", '{"tab":1}', 0);
  const second = await D.writeDoc(sql, "u2", "meds", '{"tab":2}', 0);
  assert.equal(first.ok, true);
  assert.deepEqual(second, { ok: false, error: "conflict", revision: 1 });
});

test("an outdated client without a base revision may still make the first save, or save over a revision-0 row", async () => {
  const { pg, sql } = await freshDb();
  // No row yet: the first save is accepted and starts the row at revision 1.
  assert.deepEqual(await D.writeDoc(sql, "u3", "scratch", '{"x":1}'), { ok: true, revision: 1 });
  // A row from before revisions (revision 0) was never written by a
  // revision-aware client, so nothing newer can be lost: accepted.
  await pg.query(`insert into app_documents (user_id, app_id, payload, revision) values ('u3', 'ledger', '{"old":true}', 0)`);
  assert.deepEqual(await D.writeDoc(sql, "u3", "ledger", '{"old":false}'), { ok: true, revision: 1 });
  assert.deepEqual(await D.readDoc(sql, "u3", "ledger"), { payload: '{"old":false}', revision: 1 });
});

test("an outdated client saving after a modern client updated the row gets refresh-required and the row is unchanged", async () => {
  const { sql } = await freshDb();
  // A modern client saves (revision 0 → 1 → 2).
  assert.deepEqual(await D.writeDoc(sql, "u6", "ledger", '{"entries":["modern"]}', 0), { ok: true, revision: 1 });
  assert.deepEqual(await D.writeDoc(sql, "u6", "ledger", '{"entries":["modern","second"]}', 1), { ok: true, revision: 2 });
  // The outdated tab, which sends no revision, is refused and nothing is written.
  assert.deepEqual(await D.writeDoc(sql, "u6", "ledger", '{"entries":["legacy"]}'), { ok: false, error: "refresh_required", revision: 2 });
  assert.deepEqual(await D.readDoc(sql, "u6", "ledger"), { payload: '{"entries":["modern","second"]}', revision: 2 });
  // Even after the outdated client's own first save, its next revision-less save is refused.
  assert.deepEqual(await D.writeDoc(sql, "u6", "board", '{"a":1}'), { ok: true, revision: 1 });
  assert.deepEqual(await D.writeDoc(sql, "u6", "board", '{"a":2}'), { ok: false, error: "refresh_required", revision: 1 });
  assert.equal((await D.readDoc(sql, "u6", "board")).payload, '{"a":1}');
  // …and the modern client keeps saving with its revision.
  assert.deepEqual(await D.writeDoc(sql, "u6", "ledger", '{"entries":["modern","third"]}', 2), { ok: true, revision: 3 });
});

test("saves are scoped to one user and one app", async () => {
  const { sql } = await freshDb();
  await D.writeDoc(sql, "u4", "ledger", '{"mine":1}', 0);
  await D.writeDoc(sql, "u5", "ledger", '{"theirs":1}', 0);
  await D.writeDoc(sql, "u4", "board", '{"board":1}', 0);
  assert.equal((await D.readDoc(sql, "u4", "ledger")).payload, '{"mine":1}');
  assert.equal((await D.readDoc(sql, "u5", "ledger")).payload, '{"theirs":1}');
});
