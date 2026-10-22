// Writing studio (docs/phase3-plan.md D3, D4, D9): the 15 AI writing apps as
// modes of one free app. Rules in src/lib/studio.ts, storage in
// src/lib/studio.server.ts (run against PGLite with every migration applied),
// the Word file in src/lib/studio-docx.ts. Synthetic users only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { crc32 as zlibCrc32 } from "node:zlib";
import { createJiti } from "jiti";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "./migration-plan.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@": join(root, "src") } });
const S = await jiti.import("../src/lib/studio.ts");
const store = await jiti.import("../src/lib/studio.server.ts");
const D = await jiti.import("../src/lib/app-docs.server.ts");
const docx = await jiti.import("../src/lib/studio-docx.ts");
const { APP_ALIASES, aliasOf } = await jiti.import("../src/lib/app-aliases.ts");
const { MERGED_DOCS, docTier } = await jiti.import("../src/lib/merged-docs.ts");
const { APPS, getApp } = await jiti.import("../src/lib/catalog.ts");
const { KITS } = await jiti.import("../src/lib/kits.ts");
const { FREE_APPS, PASS_APPS, PLAN_SUMMARY, PASS_FEATURES } = await jiti.import("../src/lib/plans.ts");
const { aiDailyLimit, aiDay, AI_DAILY_DEFAULTS } = await jiti.import("../src/lib/ai-allowance.ts");
const { WRITERS } = await jiti.import("../src/lib/writers/index.ts");
const { USER_COLUMNS, purgeSteps } = await jiti.import("../src/lib/retention.ts");
const src = (path) => readFileSync(join(root, path), "utf8");

const OLD = ["cold-email", "ad-copy", "captions", "listing", "letters", "lesson", "remarks", "outliner", "digest", "explainer", "bug-scan", "case-brief", "contract-scan", "soap-note", "readme"];

async function freshDb(users = ["u1"]) {
  const pg = new PGlite();
  for (const { name } of pendingMigrations(readdirSync(join(root, "migrations")), [])) await pg.exec(readFileSync(join(root, "migrations", name), "utf8"));
  const sql = { query: async (text, params = []) => (await pg.query(text, params)).rows };
  for (const id of users) await sql.query(`insert into "user" (id, name, email, "emailVerified") values ($1, $1, $2, true)`, [id, `${id}@example.test`]);
  return { pg, sql };
}

const NOW = "2026-10-22T09:00:00.000Z";
const draftOf = (mode, id, values = { name: "Ada" }) => ({ ...S.blankDraft(mode, id, NOW), values });

// ---------------------------------------------------------------- Modes

test("15 modes, one per old writing app, each with its quick writer and AI rules", () => {
  assert.deepEqual([...S.MODE_SLUGS].sort(), [...OLD].sort());
  assert.equal(new Set(S.MODES.map((mode) => mode.view)).size, 15, "views are unique");
  const aiSpecs = src("src/lib/ai-write.server.ts");
  for (const mode of S.MODES) {
    assert.ok(WRITERS[mode.slug], `${mode.slug} keeps its fields and quick writer`);
    assert.ok(aiSpecs.includes(`"${mode.slug}": {`) || aiSpecs.includes(`\n  ${mode.slug}: {`), `${mode.slug} keeps its AI prompt`);
    assert.ok(S.MODE_GROUPS.includes(mode.group));
    assert.match(mode.view, /^[a-z][a-z-]{0,23}$/, "a valid ?view=");
  }
  assert.equal(S.modeBySlug("soap-note").name, "SOAP notes");
  assert.equal(S.modeBySlug("readme").ext, "md");
});

// ---------------------------------------------------------------- Aliases and old documents

test("old links go to the studio, in the right mode", () => {
  for (const mode of S.MODES) {
    assert.deepEqual(aliasOf(mode.slug), { to: "write", view: mode.view }, mode.slug);
    assert.equal(S.modeByView(APP_ALIASES[mode.slug].view).slug, mode.slug);
  }
  assert.equal(getApp("write").tier, "free");
  assert.equal(getApp("write").name, "Writing studio");
});

test("old documents stay readable, free, and are never removed from the list", () => {
  for (const slug of OLD) {
    assert.deepEqual(MERGED_DOCS[slug]?.tier, "free", slug);
    assert.equal(docTier(slug), "free", `${slug} stays loadable by loadMergedDoc and loadDoc`);
  }
});

test("migration copies each old document's boxes once, and never changes or deletes the original", async () => {
  const { sql } = await freshDb(["u1", "u2"]);
  const outreach = JSON.stringify({ values: { name: "Eunice", me: "Eunice. I am a videographer", them: "Ruth, event planner", offer: "film your events" } });
  const soap = JSON.stringify({ values: { s: "Headache for two days" } });
  await D.writeDoc(sql, "u1", "cold-email", outreach, 0);
  await D.writeDoc(sql, "u1", "soap-note", soap, 0);
  await D.writeDoc(sql, "u1", "captions", JSON.stringify({ values: { product: "  " } }), 0); // nothing typed
  await D.writeDoc(sql, "u2", "letters", JSON.stringify({ values: { to: "The Manager" } }), 0); // someone else's

  assert.equal(await store.importOldDocs(sql, "u1", NOW), 2);
  const list = await store.draftIndex(sql, "u1");
  assert.deepEqual(list.map((row) => row.title).sort(), ["Outreach (brought in)", "SOAP notes (brought in)"]);
  const copied = await store.readDraft(sql, "u1", S.importedId("cold-email"));
  assert.deepEqual(copied.draft.values, JSON.parse(outreach).values, "every box, including the old 'me' box");
  assert.equal(copied.draft.from, "cold-email");
  assert.deepEqual(copied.draft.pieces, [], "the old apps never saved their written text");

  // The originals are exactly as they were.
  assert.equal((await D.readDoc(sql, "u1", "cold-email")).payload, outreach);
  assert.equal((await D.readDoc(sql, "u1", "soap-note")).payload, soap);
  assert.equal((await D.readDoc(sql, "u1", "cold-email")).revision, 1, "not rewritten");

  // Once only: a second open adds nothing, even after the copy is deleted.
  assert.equal(await store.importOldDocs(sql, "u1", NOW), 0);
  await store.deleteDraft(sql, "u1", S.importedId("cold-email"));
  assert.equal(await store.importOldDocs(sql, "u1", NOW), 0);
  assert.equal((await D.readDoc(sql, "u1", "cold-email")).payload, outreach, "deleting the copy keeps the original");
  const { settings } = await store.readSettings(sql, "u1");
  assert.deepEqual(Object.keys(settings.imported).sort(), [...OLD].sort(), "every old app was looked at once");
  assert.equal(settings.notice, 2, "the 'brought in' message stays until dismissed (a second open still shows it)");

  // Other people's documents are theirs alone.
  assert.equal((await store.draftIndex(sql, "u1")).some((row) => row.mode === "letters"), false);
  assert.equal(await store.importOldDocs(sql, "u2", NOW), 1);
});

// ---------------------------------------------------------------- History caps

test("history caps: 20 per mode free, 500 with the Pass or as an admin; SOAP keeps one unless history is on", () => {
  assert.equal(S.FREE_HISTORY, 20);
  assert.equal(S.PASS_HISTORY, 500);
  assert.equal(S.historyCap("cold-email", { hasPass: false }), 20);
  assert.equal(S.historyCap("cold-email", { hasPass: true }), 500);
  assert.equal(S.historyCap("cold-email", { hasPass: false, isAdmin: true }), 500);
  assert.equal(S.historyCap("soap-note", { hasPass: true }), 1, "history is off by default for SOAP notes");
  assert.equal(S.historyCap("soap-note", { hasPass: false, soapHistory: true }), 20);
  assert.match(PASS_FEATURES.write, /500/);
  assert.match(PASS_FEATURES.write, /20/);
});

test("at the cap a new draft is refused and nothing is dropped; existing drafts still save", async () => {
  const { sql } = await freshDb();
  const cap = 3;
  for (let i = 0; i < cap; i++) assert.equal((await store.saveDraft(sql, "u1", draftOf("ad-copy", `draft-${i}x`), { cap, baseRevision: 0 })).ok, true);
  const refused = await store.saveDraft(sql, "u1", draftOf("ad-copy", "draft-new"), { cap, baseRevision: 0 });
  assert.deepEqual(refused, { ok: false, error: "full", cap, count: cap });
  assert.equal(await store.countDrafts(sql, "u1", "ad-copy"), cap, "none was dropped to make room");
  // Another mode has its own room; an existing draft keeps saving at the cap.
  assert.equal((await store.saveDraft(sql, "u1", draftOf("captions", "draft-cap"), { cap, baseRevision: 0 })).ok, true);
  const edited = await store.saveDraft(sql, "u1", draftOf("ad-copy", "draft-0x", { product: "Shea butter" }), { cap, baseRevision: 1 });
  assert.equal(edited.ok, true);
  assert.equal(edited.revision, 2);
  // A Pass that lapses: more drafts than the free cap stay, all readable.
  for (let i = 0; i < 25; i++) await store.saveDraft(sql, "u1", draftOf("letters", `letter-${i}x`), { cap: S.PASS_HISTORY, baseRevision: 0 });
  const free = S.historyCap("letters", { hasPass: false });
  assert.deepEqual(await store.saveDraft(sql, "u1", draftOf("letters", "letter-new"), { cap: free, baseRevision: 0 }), { ok: false, error: "full", cap: 20, count: 25 });
  assert.equal(await store.countDrafts(sql, "u1", "letters"), 25);
});

test("two tabs: a stale save is refused, not overwritten; a deleted draft says so", async () => {
  const { sql } = await freshDb();
  await store.saveDraft(sql, "u1", draftOf("lesson", "lesson-1", { topic: "Fractions" }), { cap: 20, baseRevision: 0 });
  assert.equal((await store.saveDraft(sql, "u1", draftOf("lesson", "lesson-1", { topic: "A" }), { cap: 20, baseRevision: 1 })).ok, true);
  assert.deepEqual(await store.saveDraft(sql, "u1", draftOf("lesson", "lesson-1", { topic: "B" }), { cap: 20, baseRevision: 1 }), { ok: false, error: "conflict", revision: 2 });
  assert.equal((await store.readDraft(sql, "u1", "lesson-1")).draft.values.topic, "A");
  await store.deleteDraft(sql, "u1", "lesson-1");
  assert.deepEqual(await store.saveDraft(sql, "u1", draftOf("lesson", "lesson-1"), { cap: 20, baseRevision: 2 }), { ok: false, error: "gone" });
});

test("drafts are checked and kept to their limits", () => {
  const ok = S.cleanDraft({ ...draftOf("readme", "readme-1"), pieces: [{ title: "README.md", text: "# Hi" }], by: "ai", writtenAt: NOW });
  assert.equal(ok.ok, true);
  assert.equal(ok.draft.by, "ai");
  assert.deepEqual(S.cleanDraft({ ...draftOf("nope", "abc123") }), { ok: false, error: "invalid" }, "unknown mode");
  assert.deepEqual(S.cleanDraft({ ...draftOf("readme", "../x") }), { ok: false, error: "invalid" }, "bad id");
  assert.deepEqual(S.cleanDraft({ ...draftOf("digest", "big-one"), values: { text: "x".repeat(S.FIELD_MAX + 1) } }), { ok: false, error: "too_large" });
  assert.deepEqual(S.cleanDraft({ ...draftOf("digest", "big-two"), source: "x".repeat(S.SOURCE_MAX + 1) }), { ok: false, error: "too_large" });
  const huge = { ...draftOf("digest", "big-three"), values: Object.fromEntries("abcdefghij".split("").map((k) => [`k${k}`, "x".repeat(12_000)])) };
  assert.deepEqual(S.cleanDraft(huge), { ok: false, error: "too_large" }, `a draft is at most ${S.DRAFT_LIMIT} characters`);
  assert.equal(S.cleanDraft({ ...draftOf("readme", "readme-2"), by: "ai" }).draft.by, null, "nothing written yet");
  assert.equal(S.autoTitle("cold-email", { name: "Eunice", them: "Ruth" }), "Eunice");
  assert.equal(S.autoTitle("cold-email", {}), "Outreach draft");
  assert.equal(S.draftFileName("Ruth, event planner!", "txt"), "ruth-event-planner.txt");
  assert.equal(S.draftFileName("", "docx"), "draft.docx");
  assert.equal(S.draftText([{ title: "Email 1", text: "Hi" }, { title: "Email 2", text: "Hello" }]), "Email 1\nHi\n\nEmail 2\nHello");
});

// ---------------------------------------------------------------- Pass extras

test("house style: a Pass extra, enforced on the server", async () => {
  assert.equal(S.studioExtrasOpen(false), false);
  assert.equal(S.studioExtrasOpen(true), true);
  assert.equal(S.studioExtrasOpen(false, true), true, "admins, as for every Pass feature");
  const style = S.cleanStyle({ tone: "formal", use: "our customers, handmade", avoid: "cheap, guaranteed", signoff: "Kind regards, Ada", extra: "x" });
  assert.deepEqual(style, { tone: "formal", use: "our customers, handmade", avoid: "cheap, guaranteed", signoff: "Kind regards, Ada" });
  assert.equal(S.cleanStyle({ tone: "shouty" }).tone, "", "unknown tones are dropped");
  assert.equal(S.cleanStyle({ use: "x".repeat(900) }).use.length, S.STYLE_MAX);
  const instruction = S.styleInstruction(style);
  assert.match(instruction, /formal and polished/);
  assert.match(instruction, /Never use these words or phrases: cheap, guaranteed/);
  assert.match(instruction, /not facts/);
  assert.equal(S.styleInstruction(S.EMPTY_STYLE), "");
  assert.deepEqual(S.styleCheck("A cheap, Guaranteed deal. Cheaply made.", style), ["cheap", "guaranteed"]);
  assert.deepEqual(S.styleCheck("Nothing to see", style), []);

  // Server: saving a style needs the Pass; the AI reads the saved style itself, only with the Pass.
  const fns = src("src/lib/studio.functions.ts");
  assert.match(fns, /if \(data\.style !== undefined && !person\.extras\) return \{ ok: false, error: "pass" \}/);
  assert.match(fns, /style: person\.extras \? settings\.style : EMPTY_STYLE/, "not sent back without the Pass");
  const ai = src("src/lib/ai-write.functions.ts");
  assert.match(ai, /if \(data\.style && hasPass\)/);
  assert.match(ai, /readSettings\(sql, context\.userId\)/, "the style comes from the database, never the browser");
  // Word download and the history cap are checked on the server too.
  assert.match(fns, /if \(!person\.extras\) return \{ ok: false, error: "pass" \}/);
  assert.match(fns, /historyCap\(cleaned\.draft\.mode, \{ hasPass: person\.hasPass, isAdmin: person\.isAdmin/);

  const { sql } = await freshDb();
  await store.updateSettings(sql, "u1", (s) => ({ ...s, style }));
  assert.deepEqual((await store.readSettings(sql, "u1")).settings.style, style);
});

function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, "end of central directory");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = {};
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    assert.equal(view.getUint32(offset, true), 0x04034b50, `${name} local header`);
    const localName = view.getUint16(offset + 26, true);
    const data = bytes.subarray(offset + 30 + localName, offset + 30 + localName + size);
    assert.equal(zlibCrc32(data) >>> 0, crc, `${name} CRC`);
    files[name] = new TextDecoder().decode(data);
    at += 46 + nameLength;
  }
  return files;
}

test("Word (.docx): a valid zip of the parts Word needs, with the text escaped", () => {
  assert.equal(docx.crc32(new TextEncoder().encode("123456789")), 0xcbf43926, "standard CRC-32 check value");
  const bytes = docx.buildDocx({
    title: "Ruth & Co <offer>",
    pieces: [
      { title: "Email 1", text: "Subject: Hi\n\nDear Ruth,\nCafé “quotes” & more" },
      { title: "Email 2", text: "Second\u0001 one" },
    ],
    created: new Date(NOW),
  });
  const files = unzip(bytes);
  assert.deepEqual(Object.keys(files).sort(), ["[Content_Types].xml", "_rels/.rels", "docProps/core.xml", "word/_rels/document.xml.rels", "word/document.xml", "word/styles.xml"]);
  const doc = files["word/document.xml"];
  assert.match(doc, /Ruth &amp; Co &lt;offer&gt;/);
  assert.match(doc, /Café “quotes” &amp; more/);
  assert.match(doc, /<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Email 2/);
  assert.doesNotMatch(doc, /\u0001/, "characters XML forbids are removed");
  assert.match(files["[Content_Types].xml"], /wordprocessingml\.document\.main\+xml/);
  assert.match(files["docProps/core.xml"], /2026-10-22T09:00:00Z/);
  // Every part is well formed enough to have one root and matching paragraph tags.
  assert.equal((doc.match(/<w:p>/g) ?? []).length, (doc.match(/<\/w:p>/g) ?? []).length);
});

// ---------------------------------------------------------------- Catalogue

test("catalogue: one free studio instead of 15 apps, counts still derived", () => {
  for (const slug of OLD) assert.equal(getApp(slug), undefined, `${slug} left the catalogue`);
  assert.equal(KITS.some((kit) => kit.kind === "write"), false);
  assert.equal(APPS.filter((app) => app.slug === "write").length, 1);
  assert.equal(FREE_APPS.length, APPS.filter((app) => app.tier === "free").length);
  assert.equal(FREE_APPS.length + PASS_APPS.length, APPS.length);
  assert.ok(PLAN_SUMMARY.startsWith(`${FREE_APPS.length} apps are free`));
  assert.ok(getApp("scratch") && getApp("scratch").tier === "pass", "Scratch stays a separate Pass app (D9)");
  const sitemap = src("src/routes/sitemap[.]xml.ts");
  assert.doesNotMatch(sitemap, /cold-email|soap-note|case-brief/, "the sitemap lists the catalogue, not old slugs");
});

test("no live references to the removed writing apps' slugs", () => {
  // Where the old slugs must stay: aliases, kept documents, search's old names, the studio's
  // modes, the AI rules and quick writers, the review list, and the tests about them.
  const allowed = new Set([
    "src/lib/app-aliases.ts",
    "src/lib/merged-docs.ts",
    "src/lib/app-search.ts",
    "src/lib/studio.ts",
    "src/lib/ai-write.server.ts",
    "src/lib/ai-write.functions.ts",
    "src/lib/review-notes.ts",
    "src/lib/audience-tags.test.ts",
    // The Study space's writing shortcuts link to old slugs on purpose: the alias opens the studio mode.
    "src/components/tools/study/index.tsx",
  ]);
  const walk = (dir) =>
    readdirSync(join(root, dir)).flatMap((name) => {
      const path = `${dir}/${name}`;
      if (statSync(join(root, path)).isDirectory()) return path.includes("games") || path.endsWith("writers") ? [] : walk(path);
      return /\.(ts|tsx)$/.test(name) && !name.endsWith("routeTree.gen.ts") ? [path] : [];
    });
  const pattern = new RegExp(`["'\`](${OLD.join("|")})["'\`]`);
  const found = walk("src")
    .filter((path) => !allowed.has(path))
    .flatMap((path) => src(path).split("\n").map((line, i) => ({ path, line: i + 1, text: line })))
    .filter((row) => pattern.test(row.text) && !/^\s*(\/\/|\*)/.test(row.text));
  // The studio screen names SOAP notes' slug for its history switch only (via SOAP_SLUG).
  assert.deepEqual(found.map((row) => `${row.path}:${row.line}: ${row.text.trim()}`), []);
});

test("accounts: drafts go with the account", () => {
  assert.deepEqual(USER_COLUMNS.writing_drafts, ["user_id"]);
  assert.ok(purgeSteps("u1", "anon").some((step) => /delete from writing_drafts where user_id = \$1/.test(step.text)));
});

// ---------------------------------------------------------------- AI allowance

test("the AI allowance is unchanged: 5 free, 30 with Pass, none for admins, GMT day, one shared counter", () => {
  assert.deepEqual(AI_DAILY_DEFAULTS, { free: 5, pass: 30 });
  assert.equal(aiDailyLimit({}, { admin: false, hasPass: false }), 5);
  assert.equal(aiDailyLimit({}, { admin: false, hasPass: true }), 30);
  assert.equal(aiDailyLimit({}, { admin: true, hasPass: false }), null);
  assert.equal(aiDailyLimit({ AI_DAILY_FREE: "8", AI_DAILY_PASS: "40" }, { admin: false, hasPass: false }), 8);
  assert.equal(aiDailyLimit({ AI_DAILY_FREE: "8", AI_DAILY_PASS: "40" }, { admin: false, hasPass: true }), 40);
  assert.equal(aiDailyLimit({ AI_DAILY_FREE: "nonsense" }, { admin: false, hasPass: false }), 5);
  assert.equal(aiDailyLimit({ AI_DAILY_FREE: "-1" }, { admin: false, hasPass: false }), 5);
  assert.equal(aiDay(new Date("2026-10-22T23:30:00Z")), "2026-10-22", "00:30 in Lagos still counts as the 22nd");
  assert.equal(aiDay(new Date("2026-10-23T00:00:00Z")), "2026-10-23", "resets at 1 am Nigeria time");
  const fn = src("src/lib/ai-write.functions.ts");
  assert.match(fn, /select count from ai_writes where user_id = \$\{context\.userId\} and used_on = \$\{today\}/, "one counter per account per day, not per mode");
  assert.match(fn, /if \(!result\.ok\) return result;\n\s+await sql`\n\s+insert into ai_writes/, "counted only when the AI succeeds");
  for (const slug of S.MODE_SLUGS) assert.match(fn, new RegExp(`"${slug}"`), `${slug} is an AI writer`);
  assert.match(S.allowanceLine({ ai: true, limit: 5, left: 3, hasPass: false }), /^3 of 5 AI writes left today/);
  assert.match(S.allowanceLine({ ai: true, limit: 5, left: 0, hasPass: false }), /quick writer still writes every mode/);
  assert.match(S.allowanceLine({ ai: false, limit: 5, left: 5, hasPass: false }), /quick writer/);
  // The source box goes to the AI under the long-mode cap.
  assert.match(src("src/lib/ai-write.server.ts"), /source\.slice\(0, 14_000\)/);
  assert.equal(S.SOURCE_TO_AI, 14_000);
});
