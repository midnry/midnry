// Phase 2 merges (src/lib/merges.ts): aliases, non-destructive imports,
// read-only access for free users, Glyph's JSON tools, and the tier rule.
// Synthetic users only; PGLite for the saved-document round trip.
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
const M = await jiti.import("../src/lib/merges.ts");
const J = await jiti.import("../src/lib/json-tools.ts");
const L = await jiti.import("../src/lib/ledger.ts");
const D = await jiti.import("../src/lib/app-docs.server.ts");
const { APP_ALIASES, aliasOf } = await jiti.import("../src/lib/app-aliases.ts");
const { APPS, getApp } = await jiti.import("../src/lib/catalog.ts");
const { getKit } = await jiti.import("../src/lib/kits.ts");
const { canOpenApp } = await jiti.import("../src/lib/access.ts");
const { FREE_APPS, PASS_APPS, PLAN_SUMMARY } = await jiti.import("../src/lib/plans.ts");

async function freshDb() {
  const pg = new PGlite();
  const dir = join(root, "migrations");
  for (const { name } of pendingMigrations(readdirSync(dir), [])) await pg.exec(readFileSync(join(dir, name), "utf8"));
  return { pg, sql: { query: async (text, params = []) => (await pg.query(text, params)).rows } };
}

// ------------------------------------------------------------------ aliases

test("old links point at the new home, with the right view", () => {
  assert.deepEqual(aliasOf("budget"), { to: "ledger", view: "budget" });
  assert.deepEqual(aliasOf("pocket"), { to: "ledger", view: "pocket" });
  assert.deepEqual(aliasOf("client-terms"), { to: "service-terms" });
  assert.deepEqual(aliasOf("price-list"), { to: "catalog" });
  assert.deepEqual(aliasOf("produce"), { to: "farm-sales", view: "prices" });
  assert.deepEqual(aliasOf("qr-menu"), { to: "menu", view: "qr" });
  assert.equal(aliasOf("json-fmt"), undefined, "JSON stays its own free app");
  assert.equal(aliasOf("glyph"), undefined, "Glyph stays its own Pass app");
});

test("every alias leads to an app in the catalogue, and the old slug is gone", () => {
  for (const [old, alias] of Object.entries(APP_ALIASES)) {
    assert.ok(getApp(alias.to), `${old} → ${alias.to} is not an app`);
    assert.equal(getApp(old), undefined, `${old} is still in the catalogue`);
  }
});

test("views named by aliases exist in the receiving app", () => {
  assert.deepEqual(getKit("farm-sales").views.map((view) => view.id), ["sales", "prices"]);
  assert.ok(getKit("menu").qr, "Menu has its QR code section");
  assert.match(getKit("menu").qr.blurb, /does not host/);
});

// ------------------------------------------------------------------ tiers

test("tiers follow the rule: any Pass app makes the merge Pass, all free stays free", () => {
  for (const merge of M.MERGES) {
    const app = getApp(merge.into);
    assert.ok(app, merge.into);
    assert.equal(app.tier, M.mergedTier(merge), `${merge.into}`);
  }
  assert.equal(getApp("ledger").tier, "pass");
  for (const slug of ["service-terms", "catalog", "farm-sales", "menu", "json-fmt"]) assert.equal(getApp(slug).tier, "free", slug);
  assert.equal(getApp("glyph").tier, "pass");
});

test("plan counts stay derived from the catalogue", () => {
  assert.equal(FREE_APPS.length + PASS_APPS.length, APPS.length);
  assert.match(PLAN_SUMMARY, new RegExp(`^${FREE_APPS.length} apps are free`));
  for (const file of ["src/lib/plans.ts", "src/lib/catalog.ts", "src/routes/pricing.tsx", "src/components/home-plans.tsx"]) {
    const text = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(text, /\b(77|88)\b (free |apps|tools)|\b11 (Pass|more)/, file);
  }
});

// ------------------------------------------------------------------ read-only access

test("free users may read their old free-app data; Pass data still needs the Pass", async () => {
  for (const slug of ["budget", "pocket", "client-terms", "price-list", "produce"]) {
    assert.equal(M.oldDocTier(slug), "free", slug);
    assert.ok(M.isReadableOldDoc(slug), slug);
    // The same rule as every app: a free document opens without the Pass.
    assert.equal(canOpenApp({ tier: M.oldDocTier(slug) }, false), true, slug);
  }
  // …while the app that now holds Budget and Pocket is still locked for them.
  assert.equal(canOpenApp(getApp("ledger"), false), false);
  assert.equal(M.isReadableOldDoc("ledger"), false);
  assert.equal(M.isReadableOldDoc("qr-menu"), false, "QR menu never saved anything");
  // loadDoc/saveDoc agree: every merged-away slug keeps its old (free) tier there too.
  const { docTier } = await jiti.import("../src/lib/merged-docs.ts");
  for (const merge of M.MERGES) for (const [slug, tier] of Object.entries(merge.tiers)) if (slug !== merge.into) assert.equal(docTier(slug), tier, slug);
  const source = readFileSync(join(root, "src/lib/merged-docs.functions.ts"), "utf8");
  assert.doesNotMatch(source, /writeDoc|delete from|update app_documents/, "the old-document reader never writes");
});

// ------------------------------------------------------------------ imports

test("Budget and Pocket rows copy into Ledger once, with money in kept", () => {
  const rows = [
    { name: "Salary", amount: "250000", side: "income" },
    { name: "Rent", amount: "1,200.50", side: "cost" },
    { name: "Bad", amount: "abc", side: "cost" },
  ];
  let n = 0;
  const first = M.ledgerImport("budget", rows, [], "2026-10-21", () => `id${n++}`);
  assert.equal(first.entries.length, 2);
  assert.equal(first.skipped, 1);
  assert.deepEqual(first.entries[0], { id: "id0", label: "Salary", cents: 25_000_000, category: "Other", date: "2026-10-21", from: "budget#0", flow: "in" });
  assert.equal(first.entries[1].cents, 120_050);
  assert.equal(first.entries[1].flow, undefined, "costs are money out, like every older entry");
  const again = M.ledgerImport("budget", rows, first.entries, "2026-10-22", () => "x");
  assert.equal(again.entries.length, 0, "a second import adds nothing");
  assert.equal(again.already, 2);
  assert.equal(M.ledgerPending("pocket", rows, first.entries), 2, "Pocket is counted on its own");
  const csv = L.ledgerCsv(first.entries).split("\n");
  assert.equal(csv[0], "Date,What,Category,Amount,In or out");
  assert.equal(csv[1], "2026-10-21,Salary,Other,250000.00,In");
});

test("import copies into the new document and never touches the old one (PGLite)", async () => {
  const { sql } = await freshDb();
  const budget = JSON.stringify({ rows: [{ name: "Sales", amount: "500", side: "income" }, { name: "Fuel", amount: "120", side: "cost" }] });
  const prices = JSON.stringify({ rows: [{ item: "Shea butter", price: "3500" }] });
  const produce = JSON.stringify({ rows: [{ crop: "Maize", price: "800", when: "2026-09-01" }] });
  const terms = JSON.stringify({ values: { client: "Ada", job: "Logo design", fee: "50000", revisions: "3" } });
  await D.writeDoc(sql, "u-merge", "budget", budget, 0);
  await D.writeDoc(sql, "u-merge", "price-list", prices, 0);
  await D.writeDoc(sql, "u-merge", "produce", produce, 0);
  await D.writeDoc(sql, "u-merge", "client-terms", terms, 0);
  await D.writeDoc(sql, "u-merge", "catalog", JSON.stringify({ rows: [{ name: "Soap", price: "900", line: "" }] }), 0);
  await D.writeDoc(sql, "u-merge", "service-terms", JSON.stringify({ values: { client: "Bola", you: "Me" } }), 0);

  // Ledger
  const oldBudget = await D.readDoc(sql, "u-merge", "budget");
  const copied = M.ledgerImport("budget", M.rowsOf(oldBudget.payload), [], "2026-10-21", () => crypto.randomUUID());
  assert.deepEqual(await D.writeDoc(sql, "u-merge", "ledger", JSON.stringify({ entries: copied.entries }), 0), { ok: true, revision: 1 });
  assert.equal(L.asEntries(JSON.parse((await D.readDoc(sql, "u-merge", "ledger")).payload).entries).length, 2);

  // Catalog (Prices: item → name), appended after what was there
  const [catalogSpec] = M.KIT_IMPORTS.catalog;
  const catalogDoc = JSON.parse((await D.readDoc(sql, "u-merge", "catalog")).payload);
  const nextCatalog = M.importTrackerRows(catalogDoc, catalogSpec, M.rowsOf((await D.readDoc(sql, "u-merge", "price-list")).payload), "2026-10-21");
  assert.deepEqual(nextCatalog.rows, [{ name: "Soap", price: "900", line: "" }, { name: "Shea butter", price: "3500" }]);
  assert.deepEqual(nextCatalog.imported, { "price-list": "2026-10-21" });
  await D.writeDoc(sql, "u-merge", "catalog", JSON.stringify(nextCatalog), 1);

  // Farm sales: Crop prices go to the Price log view, sales untouched
  const [farmSpec] = M.KIT_IMPORTS["farm-sales"];
  const farm = M.importTrackerRows({ rows: [{ buyer: "Musa", crop: "Maize", amount: "4000" }] }, farmSpec, M.rowsOf(produce), "2026-10-21");
  assert.deepEqual(farm.rows, [{ buyer: "Musa", crop: "Maize", amount: "4000" }]);
  assert.deepEqual(farm.views.prices, [{ crop: "Maize", price: "800", when: "2026-09-01" }]);

  // Agreement: Terms fill only the empty fields (job → work); a filled field keeps its value and the old one is reported
  const [termsSpec] = M.KIT_IMPORTS["service-terms"];
  const agreement = M.importTemplateValues(JSON.parse((await D.readDoc(sql, "u-merge", "service-terms")).payload), termsSpec, M.valuesOf(terms), "2026-10-21");
  assert.deepEqual(agreement.doc.values, { client: "Bola", you: "Me", work: "Logo design", fee: "50000", revisions: "3" });
  assert.deepEqual(agreement.kept, [{ field: "client", old: "Ada" }]);
  assert.deepEqual(agreement.filled.sort(), ["fee", "revisions", "work"]);

  // The originals are exactly as they were.
  assert.deepEqual(await D.readDoc(sql, "u-merge", "budget"), { payload: budget, revision: 1 });
  assert.deepEqual(await D.readDoc(sql, "u-merge", "price-list"), { payload: prices, revision: 1 });
  assert.deepEqual(await D.readDoc(sql, "u-merge", "produce"), { payload: produce, revision: 1 });
  assert.deepEqual(await D.readDoc(sql, "u-merge", "client-terms"), { payload: terms, revision: 1 });
});

test("old rows read safely from odd documents", () => {
  assert.deepEqual(M.rowsOf(null), []);
  assert.deepEqual(M.rowsOf("not json"), []);
  assert.deepEqual(M.rowsOf('{"rows":[null,{"name":"A","amount":5},{"name":""}]}'), [{ name: "A", amount: "5" }]);
  assert.deepEqual(M.valuesOf('{"values":{"a":"x","b":"","c":3}}'), { a: "x" });
  assert.equal(M.rowsCsv([{ id: "name", label: "What" }], [{ name: 'Say "hi", ok' }]), 'What\n"Say ""hi"", ok"');
});

// ------------------------------------------------------------------ JSON and Glyph

test("the free JSON check names the line and column of the first error", () => {
  const bad = '{\n  "a": 1,\n  "b": }';
  const check = J.checkJson(bad);
  assert.equal(check.ok, false);
  assert.equal(check.problem.line, 3);
  assert.equal(check.problem.column, 8);
  assert.match(check.problem.message, /Expected a value/);
  assert.deepEqual(J.problemExcerpt(bad, check.problem), { line: '  "b": }', caret: "       ^" });
  assert.equal(J.findJsonProblem('{"a":1,}').message, "Remove the comma before “}”.");
  assert.match(J.findJsonProblem("{'a':1}").message, /double quotes/);
  assert.match(J.findJsonProblem('{"a":1').message, /Expected “,” or “}”/);
  assert.match(J.findJsonProblem('[1] x').message, /after the end/);
  assert.equal(J.findJsonProblem('{"a":[1,2,{"b":null}],"c":"\\u00e9"}'), null);
  assert.equal(J.checkJson('{"ok":true}').ok, true);
});

test("Glyph: minify, sort keys, JSON paths and the tree helpers", () => {
  const value = { b: 1, a: { d: [3, { z: 1, y: 2 }], c: "x" } };
  assert.equal(J.minifyJson(value), '{"b":1,"a":{"d":[3,{"z":1,"y":2}],"c":"x"}}');
  assert.equal(J.minifyJson(J.sortKeys(value)), '{"a":{"c":"x","d":[3,{"y":2,"z":1}]},"b":1}');
  assert.equal(J.jsonPath([]), "$");
  assert.equal(J.jsonPath(["items", 2, "price"]), "$.items[2].price");
  assert.equal(J.jsonPath(["odd key", 0]), '$["odd key"][0]');
  assert.deepEqual(J.valueAt(value, ["a", "d", 1, "y"]), 2);
  assert.equal(J.countLabel([1, 2]), "2 items");
  assert.equal(J.countLabel({ a: 1 }), "1 key");
  assert.deepEqual(J.childrenOf(["x"]), [[0, "x"]]);
  assert.equal(J.kindOf(null), "null");
});

test("Glyph handles large input: a 2 MB document parses, counts and checks quickly", () => {
  const big = JSON.stringify({ rows: Array.from({ length: 20_000 }, (_, i) => ({ id: i, name: `row ${i}`, tags: ["a", "b"], ok: i % 2 === 0 })) });
  assert.ok(big.length > 1_000_000 && big.length < J.GLYPH_MAX_INPUT);
  const started = Date.now();
  const check = J.checkJson(big);
  assert.equal(check.ok, true);
  assert.equal(J.countNodes(check.value, 3_001), 3_001, "counting stops at the cap");
  assert.equal(J.findJsonProblem(big), null);
  const broken = `${big.slice(0, -2)},}`;
  assert.equal(J.checkJson(broken).ok, false);
  assert.ok(Date.now() - started < 3_000, "fast enough for the page");
  assert.equal(J.TREE_PAGE, 200, "branches open 200 children at a time");
});

test("JSON and Glyph descriptions make the difference obvious", () => {
  const json = getApp("json-fmt");
  const glyph = getApp("glyph");
  assert.match(json.blurb, /free/i);
  assert.ok(!json.features.some((feature) => /minify/i.test(feature)), "minify is a Glyph feature");
  for (const word of [/tree/i, /path/i, /minify/i, /sort/i, /download/i, /large/i]) assert.ok(glyph.features.some((feature) => word.test(feature)), String(word));
});
