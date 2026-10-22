// App search (src/lib/app-search.ts): names, merged apps, synonyms, ranking and typos.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const search = await jiti.import("../src/lib/app-search.ts");
const { APPS, getApp } = await jiti.import("../src/lib/catalog.ts");
const { APP_ALIASES } = await jiti.import("../src/lib/app-aliases.ts");

const index = search.createSearchIndex(search.catalogSearchInputs());
const find = (query) => search.searchIndex(index, query);
const slugs = (query) => find(query).hits.map((hit) => hit.slug);
const hit = (query, slug) => find(query).hits.find((item) => item.slug === slug);

test("invoice: Invoice first, then Agreement and other apps for getting paid", () => {
  const found = slugs("invoice");
  assert.equal(found[0], "invoice");
  assert.equal(found[1], "service-terms", `Agreement second (${found.join(", ")})`);
  for (const slug of ["catalog", "ledger"]) assert.ok(found.includes(slug), `${slug} in ${found.join(", ")}`);
  assert.equal(hit("invoice", "invoice").why, undefined, "the name says why");
  assert.equal(hit("invoice", "service-terms").why, "Matches: invoice");
  assert.deepEqual(slugs("invoices"), found, "plurals find the same apps");
  assert.equal(slugs("send an invoice")[0], "invoice", "filler words are ignored");
});

test("old app names find the app that holds them now, with a note", () => {
  const cases = [
    ["quote", "invoice", "Quotes are part of Invoice"],
    ["quotes", "invoice", "Quotes are part of Invoice"],
    ["proposal", "invoice", "Proposals are part of Invoice"],
    ["budget", "ledger", "Budget is part of Ledger"],
    ["pocket", "ledger", "Pocket is part of Ledger"],
    ["kanban", "tasks", "Board is part of Remind"],
    ["board", "tasks", "Board is part of Remind"],
    ["focus timer", "tasks", "The Focus timer (Pulse) is part of Remind"],
    ["pomodoro", "tasks", "The Focus timer (Pulse) is part of Remind"],
    ["habits", "tasks", "Habits are part of Remind"],
    ["client terms", "service-terms", "Client terms are part of Agreement"],
    ["price list", "catalog", "Prices are part of Catalog"],
    ["crop prices", "farm-sales", "Crop prices are part of Farm sales"],
    ["qr menu", "menu", "QR menu is part of Menu"],
  ];
  for (const [query, slug, note] of cases) {
    const outcome = find(query);
    assert.equal(outcome.partial, false, query);
    assert.equal(outcome.hits[0]?.slug, slug, `${query} → ${outcome.hits.map((h) => h.slug).join(", ")}`);
    assert.equal(outcome.hits[0].note, note, query);
  }
  // Quotes and proposals also bring the rest of the client-work apps, below Invoice.
  assert.ok(slugs("quote").includes("service-terms"));
});

test("everyday words", () => {
  assert.equal(slugs("todo")[0], "tasks");
  assert.equal(slugs("to-do")[0], "tasks");
  assert.equal(slugs("reminder")[0], "tasks");
  assert.equal(slugs("cv")[0], "apply");
  assert.equal(slugs("resume")[0], "apply");
  assert.equal(slugs("job application")[0], "apply");
  assert.equal(slugs("expenses")[0], "ledger");
  assert.equal(slugs("spending")[0], "ledger");
  assert.equal(slugs("period")[0], "cycle");
  assert.equal(slugs("menstrual")[0], "cycle");
  assert.equal(slugs("qr")[0], "menu");
  assert.equal(slugs("recipe")[0], "recipes");
  assert.deepEqual(slugs("json").slice(0, 2), ["json-fmt", "glyph"]);
  assert.equal(hit("period", "cycle").why, undefined, "Cycle's pitch already says period");
});

test("ranking: exact name, then name prefix, then synonyms, then pitch, then details", () => {
  // "recipe": Recipes (the name) > Recipe cost (a word of the name) > Menu (a synonym).
  const recipe = slugs("recipe");
  assert.deepEqual(recipe.slice(0, 3), ["recipes", "recipe-cost", "menu"]);
  // A name prefix beats a synonym.
  const inv = find("invo").hits;
  assert.equal(inv[0].slug, "invoice");
  // Synonyms beat pitch and blurb text; pitch beats features and guide.
  const notes = find("notes").hits;
  // Notes (SOAP) is a Writing studio mode now, so Scratch leads the "note" synonyms.
  assert.equal(notes[0].slug, "scratch");
  const writing = notes.findIndex((h) => h.slug === "write");
  const fromDetails = notes.findIndex((h) => !["scratch", "write", "study", "memoir"].includes(h.slug));
  assert.ok(writing > 0 && writing < fromDetails, "synonym before plain text matches");
  for (let i = 1; i < notes.length; i++) assert.ok(notes[i - 1].points >= notes[i].points, "sorted by points");
  // Deterministic: the same query gives the same order every time.
  assert.deepEqual(slugs("money"), slugs("money"));
  assert.deepEqual(slugs("money"), search.searchApps(search.catalogSearchInputs(), "money").hits.map((h) => h.slug));
});

test("typos of 5+ letter words are forgiven", () => {
  assert.equal(slugs("invioce")[0], "invoice");
  assert.ok(slugs("invioce").includes("service-terms"));
  assert.equal(hit("invioce", "service-terms").why, "Matches: invoice", "the reason shows the word it understood");
  assert.equal(slugs("remnid")[0], "tasks");
  assert.equal(slugs("ledgr")[0], "ledger");
  assert.equal(slugs("pomodro")[0], "tasks");
  assert.equal(slugs("budegt")[0], "ledger");
  // A correctly spelled word never pulls in look-alikes.
  assert.deepEqual(slugs("remind"), ["tasks"]);
});

test("short queries stay precise: no typo matching under 5 letters", () => {
  assert.deepEqual(slugs("cv"), ["apply", "write"]);
  assert.deepEqual(slugs("tsk"), [], "3-letter typo finds nothing");
  assert.deepEqual(slugs("ledr"), [], "4-letter typo finds nothing");
  assert.deepEqual(slugs("qr"), ["menu"]);
  assert.equal(slugs("tax")[0], "paye");
  for (const h of find("tax").hits) assert.ok(h.slug === "paye" || h.why?.includes("tax"), `${h.slug} really mentions tax`);
  assert.equal(search.editDistance("invioce", "invoice"), 1);
  assert.equal(search.editDistance("abc", "xyz", 1), 2);
});

test("nonsense finds nothing; empty queries return nothing", () => {
  assert.deepEqual(slugs("zzqxv"), []);
  assert.deepEqual(slugs("   "), []);
  assert.equal(find("").words.length, 0);
});

test("several words: apps matching every word come first, else the closest matches", () => {
  const both = find("farm prices");
  assert.equal(both.partial, false);
  assert.equal(both.hits[0].slug, "farm-sales");
  const loose = find("invoice zzqxv");
  assert.equal(loose.partial, true);
  assert.equal(loose.hits[0].slug, "invoice");
});

test("every catalogue app is found first by its own name", () => {
  for (const app of APPS) {
    const outcome = find(app.name);
    const top = outcome.hits.filter((h) => h.points === outcome.hits[0].points).map((h) => h.slug);
    assert.ok(top.includes(app.slug), `${app.name} → ${outcome.hits.slice(0, 3).map((h) => h.slug).join(", ")}`);
    // Only apps with the very same name can tie with it.
    for (const slug of top) assert.equal(getApp(slug).name.toLowerCase(), app.name.toLowerCase(), `${app.name} ties with ${slug}`);
  }
});

test("every alias and synonym points at a real app", () => {
  assert.deepEqual(search.mergedNameProblems(), []);
  for (const [old, alias] of Object.entries(APP_ALIASES)) {
    assert.ok(getApp(alias.to), `${old} → ${alias.to}`);
    assert.equal(getApp(old), undefined, `${old} has no catalogue entry any more`);
  }
  for (const merged of Object.values(search.MERGED_NAMES)) assert.ok(getApp(merged.to), merged.to);
  for (const group of search.SYNONYM_GROUPS) for (const slug of group.apps) assert.ok(getApp(slug), `synonym app ${slug}`);
});

test("community apps (name, blurb and pitch only) are searchable", () => {
  const items = [
    ...search.catalogSearchInputs(),
    { slug: "kanban-pro", name: "Kanban Pro", blurb: "Cards in columns.", pitch: "Cards in columns." },
  ];
  const found = search.searchApps(items, "kanban").hits.map((h) => h.slug);
  assert.deepEqual(found.slice(0, 2), ["kanban-pro", "tasks"]);
});
