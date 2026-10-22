// Study space (src/lib/study.ts, docs/phase3-plan.md 2.3, D5 and D6): copying the
// old Lab and Quiz documents in without deleting them, old links, spaced review,
// quiz scoring, references, share links (Pass to make, signed in to open,
// revoke, owner scoping) on PGLite with the real migrations, retention
// coverage, derived counts, and no references to the removed apps.
// Synthetic users only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { createJiti } from "jiti";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "./migration-plan.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@": join(root, "src") } });
const S = await jiti.import("../src/lib/study.ts");
const Sh = await jiti.import("../src/lib/study-shares.server.ts");
const D = await jiti.import("../src/lib/app-docs.server.ts");
const R = await jiti.import("../src/lib/retention.ts");
const { APP_ALIASES, aliasOf } = await jiti.import("../src/lib/app-aliases.ts");
const { mergedDoc, docTier } = await jiti.import("../src/lib/merged-docs.ts");
const { APPS, getApp, SITE_DESCRIPTION, includedNames } = await jiti.import("../src/lib/catalog.ts");
const { FREE_APPS, PASS_APPS, PLAN_SUMMARY, PASS_FEATURES } = await jiti.import("../src/lib/plans.ts");
const { getKit } = await jiti.import("../src/lib/kits.ts");
const search = await jiti.import("../src/lib/app-search.ts");
const { isUnreviewed, reviewNote } = await jiti.import("../src/lib/review-notes.ts");

const OLD = ["anatomy", "clinic-quiz", "law-drill", "quiz-maker", "lab-notes", "citations", "legal-cite", "formula-sheet"];
const stamp = { now: "2026-10-22T09:00:00.000Z", today: "2026-10-22" };
const counter = () => {
  let n = 0;
  return () => `id-${++n}`;
};

async function freshDb() {
  const pg = new PGlite();
  const dir = join(root, "migrations");
  for (const { name } of pendingMigrations(readdirSync(dir), [])) await pg.exec(readFileSync(join(dir, name), "utf8"));
  const sql = { query: async (text, params = []) => (await pg.query(text, params)).rows };
  for (const id of ["owner", "friend", "other"]) {
    await sql.query(`insert into "user" (id, name, email, "emailVerified") values ($1, $1, $2, true)`, [id, `${id}@example.test`]);
  }
  return { pg, sql };
}

// ------------------------------------------------------------------ copying old documents in

test("Lab and Quiz documents are copied in once, and the originals are only read", async () => {
  const { sql } = await freshDb();
  const lab = JSON.stringify({ values: { title: "Titration", aim: "Find the concentration", method: "Burette", results: "12.1 mL", end: "0.1 M" } });
  const quiz = JSON.stringify({ values: { topic: "Cells", questions: "1. What is a cell?\nA: the unit of life" } });
  await D.writeDoc(sql, "owner", "lab-notes", lab, 0);
  await D.writeDoc(sql, "owner", "quiz-maker", quiz, 0);

  const read = async (slug) => {
    const doc = await D.readDoc(sql, "owner", slug);
    return doc.payload ? JSON.parse(doc.payload) : undefined;
  };
  const sources = { "lab-notes": await read("lab-notes"), "quiz-maker": await read("quiz-maker") };
  const first = S.importOldDocs(S.emptyStudy(), sources, stamp, counter());
  assert.equal(first.changed, true);
  assert.deepEqual(first.copied, ["lab-notes", "quiz-maker"]);
  const note = first.doc.notes[0];
  assert.deepEqual([note.title, note.aim, note.method, note.results, note.end, note.from], ["Titration", "Find the concentration", "Burette", "12.1 mL", "0.1 M", "lab-notes"]);
  const draft = first.doc.quizzes[0];
  assert.equal(draft.title, "Cells (brought in)");
  assert.equal(draft.notes, "1. What is a cell?\nA: the unit of life", "the text is kept exactly as written");
  assert.deepEqual(draft.questions, [], "not split into questions");
  assert.deepEqual(first.doc.imported, { "lab-notes": true, "quiz-maker": true });

  // Saved into the Study space document; the old documents are unchanged and still there.
  await D.writeDoc(sql, "owner", "study", JSON.stringify(first.doc), 0);
  assert.equal((await D.readDoc(sql, "owner", "lab-notes")).payload, lab);
  assert.equal((await D.readDoc(sql, "owner", "quiz-maker")).payload, quiz);
  const rows = await sql.query(`select app_id from app_documents where user_id = 'owner' order by app_id`);
  assert.deepEqual(rows.map((row) => row.app_id), ["lab-notes", "quiz-maker", "study"]);

  // Running it again (another tab, a reload) adds nothing.
  const again = S.importOldDocs(S.normalizeStudy(JSON.parse((await D.readDoc(sql, "owner", "study")).payload)), sources, stamp, counter());
  assert.equal(again.changed, false);
  assert.equal(again.doc.notes.length, 1);
  assert.equal(again.doc.quizzes.length, 1);
  // Even if the marks were lost, a copy already marked `from` is not added twice.
  const lost = S.importOldDocs({ ...first.doc, imported: {} }, sources, stamp, counter());
  assert.equal(lost.doc.notes.length, 1);
  assert.equal(lost.doc.quizzes.length, 1);
});

test("copying in: nothing saved is marked done, an unreadable document is tried again", () => {
  const none = S.importOldDocs(S.emptyStudy(), { "lab-notes": undefined, "quiz-maker": { values: { topic: " " } } }, stamp, counter());
  assert.deepEqual(none.copied, []);
  assert.deepEqual(none.doc.imported, { "lab-notes": true, "quiz-maker": true });
  assert.equal(none.doc.notes.length + none.doc.quizzes.length, 0);
  const failed = S.importOldDocs(S.emptyStudy(), { "lab-notes": null, "quiz-maker": null }, stamp, counter());
  assert.equal(failed.changed, false, "a failed read is not marked, so the next visit tries again");
  const untitled = S.importOldDocs(S.emptyStudy(), { "lab-notes": { values: { aim: "x" } }, "quiz-maker": { values: { questions: "Q1" } } }, stamp, counter());
  assert.equal(untitled.doc.notes[0].title, "Lab write-up (brought in)");
  assert.equal(untitled.doc.quizzes[0].title, "Quiz (brought in)");
});

test("old study documents stay readable as free merged documents", () => {
  for (const slug of OLD) {
    assert.equal(mergedDoc(slug)?.tier, "free", slug);
    assert.equal(docTier(slug), "free", slug);
  }
  assert.deepEqual([...S.STUDY_OLD_DOCS], ["lab-notes", "quiz-maker"]);
  const fns = readFileSync(join(root, "src/lib/merged-docs.functions.ts"), "utf8");
  assert.doesNotMatch(fns, /writeDoc|delete from/, "the merged-document reader never writes");
});

// ------------------------------------------------------------------ aliases and catalogue

test("old links open the Study space on the right part", () => {
  const views = { anatomy: "cards", "clinic-quiz": "practice", "law-drill": "practice", "quiz-maker": "practice", "lab-notes": "notes", citations: "references", "legal-cite": "law", "formula-sheet": "formulas" };
  for (const [old, view] of Object.entries(views)) {
    assert.deepEqual(aliasOf(old), { to: "study", view }, old);
    assert.equal(getApp(old), undefined, `${old} left the catalogue`);
    assert.equal(getKit(old), undefined, `${old} is not a kit any more`);
  }
  // Every view an alias names is one the Study space opens (tabs, plus formulas and law).
  const tool = readFileSync(join(root, "src/components/tools/study/index.tsx"), "utf8");
  for (const view of Object.values(views)) assert.ok(S.isStudyView(view) || tool.includes(`view === "${view}"`), view);
  assert.deepEqual(search.mergedNameProblems(), []);
});

test("the Study space is one free app, and the counts are derived", () => {
  const study = getApp("study");
  assert.equal(study.name, "Study space");
  assert.equal(study.tier, "free");
  assert.equal(FREE_APPS.length + PASS_APPS.length, APPS.length);
  assert.equal(FREE_APPS.length, APPS.filter((app) => app.tier === "free").length);
  assert.match(PLAN_SUMMARY, new RegExp(`^${FREE_APPS.length} apps are free`));
  assert.match(SITE_DESCRIPTION, new RegExp(`${FREE_APPS.length} apps are free`));
  assert.equal(includedNames(), `all ${FREE_APPS.length} free apps`);
  assert.match(PASS_FEATURES.study, /share a deck or quiz|sharing a deck or quiz/);
  assert.equal(new Set(APPS.map((app) => app.slug)).size, APPS.length, "slugs are unique");
});

test("search: old names and study words find the Study space", () => {
  const index = search.createSearchIndex(search.catalogSearchInputs());
  const top = (q) => search.searchIndex(index, q).hits[0];
  for (const [q, note] of [
    ["anatomy", "The Anatomy deck is part of the Study space"],
    ["citations", "Citations is part of the Study space"],
    ["formula sheet", "Formulas is part of the Study space"],
    ["lab notes", "Lab is part of the Study space"],
    ["quiz", "Quiz is part of the Study space"],
  ]) {
    assert.equal(top(q)?.slug, "study", q);
    assert.equal(top(q).note, note, q);
  }
  for (const q of ["flashcards", "revision", "bibliography", "apa", "spaced repetition"]) assert.equal(top(q)?.slug, "study", q);
});

test("the sample medical and law sets carry their review notes and are never featured", () => {
  for (const id of ["anatomy", "clinic-quiz", "law-drill"]) {
    assert.ok(isUnreviewed(id), id);
    assert.match(reviewNote(id), /Not professionally reviewed yet/);
    assert.ok(S.starterDeck(id) || S.starterQuiz(id), id);
  }
  assert.equal(S.SAMPLE_LABEL, "Sample study questions");
  const cards = readFileSync(join(root, "src/components/tools/study/cards.tsx"), "utf8");
  const practice = readFileSync(join(root, "src/components/tools/study/practice.tsx"), "utf8");
  for (const ui of [cards, practice]) {
    assert.match(ui, /<ReviewNote from=\{starter\.id\}/, "each sample set shows its note");
    assert.match(ui, /SAMPLE_LABEL/);
    // Your own decks or quizzes come first; the samples sit below them.
    assert.ok(ui.indexOf(">Your ") > 0 && ui.indexOf(">Your ") < ui.indexOf("{SAMPLE_LABEL}"));
  }
  // Copies of a sample keep the note.
  const copy = S.copyStarterDeck(S.starterDeck("anatomy"), stamp, counter());
  assert.equal(copy.from, "anatomy");
  assert.equal(S.normalizeStudy({ decks: [copy] }).decks[0].from, "anatomy");
  // Not in goals, the finder or curated related apps.
  const quiz = readFileSync(join(root, "src/components/match-quiz.tsx"), "utf8");
  for (const id of ["anatomy", "clinic-quiz", "law-drill"]) assert.doesNotMatch(quiz, new RegExp(`"${id}"`));
});

// ------------------------------------------------------------------ spaced review

test("spaced review: knew it moves a card up a box, again brings it back today", () => {
  let state = S.reviewCard(undefined, "known", "2026-10-22");
  assert.deepEqual(state, { box: 1, due: "2026-10-23", seen: 1, last: "2026-10-22" });
  state = S.reviewCard(state, "known", "2026-10-23");
  assert.deepEqual([state.box, state.due], [2, "2026-10-26"]);
  state = S.reviewCard(state, "known", "2026-10-26");
  assert.deepEqual([state.box, state.due], [3, "2026-11-02"]);
  state = S.reviewCard(state, "again", "2026-11-02");
  assert.deepEqual(state, { box: 0, due: "2026-11-02", seen: 4, last: "2026-11-02" });
  // The top box repeats every 30 days.
  let top = { box: 5, due: "2026-01-31", seen: 9, last: "2026-01-01" };
  top = S.reviewCard(top, "known", "2026-01-31");
  assert.deepEqual([top.box, top.due], [5, "2026-03-02"], "month and leap-year safe");
  assert.equal(S.addDays("2026-12-31", 1), "2027-01-01");
});

test("spaced review: which cards are due, in what order, and the deck's numbers", () => {
  const cards = ["a", "b", "c", "d", "e"].map((id) => ({ id, front: id, back: id }));
  const states = {
    a: { box: 2, due: "2026-10-20", seen: 2, last: "2026-10-17" },
    b: { box: 0, due: "2026-10-22", seen: 1, last: "2026-10-22" },
    c: { box: 3, due: "2026-11-01", seen: 3, last: "2026-10-25" },
    d: { box: 1, due: "2026-10-19", seen: 1, last: "2026-10-18" },
  };
  assert.deepEqual(S.dueCards(cards, states, "2026-10-22").map((c) => c.id), ["b", "d", "a", "e"], "missed, then oldest due, then new");
  assert.deepEqual(S.deckStats(cards, states, "2026-10-22"), { total: 5, due: 4, known: 3, fresh: 1, nextDue: "2026-11-01" });
  assert.deepEqual(S.dueCards(cards, states, "2026-10-01").map((c) => c.id), ["e"], "only new cards before anything is due");

  let doc = S.emptyStudy();
  doc = S.recordReview(doc, "deck-1", "a", "known", "2026-10-22");
  doc = S.recordReview(doc, "starter:anatomy", "a1", "again", "2026-10-22");
  assert.equal(doc.progress["deck-1"].a.box, 1);
  assert.equal(doc.progress["starter:anatomy"].a1.box, 0);
  // Progress survives a save and a reload.
  const reloaded = S.normalizeStudy(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(reloaded.progress, doc.progress);
  assert.deepEqual(S.resetProgress(doc, "deck-1").progress, { "starter:anatomy": doc.progress["starter:anatomy"] });
});

// ------------------------------------------------------------------ quizzes

test("quiz scoring, playable questions and saved attempts", () => {
  const questions = [
    { id: "1", q: "One?", options: ["a", "b", "", "c"], answer: 3, why: "" },
    { id: "2", q: "Two?", options: ["x", "y"], answer: 0, why: "Because" },
    { id: "3", q: "", options: ["x", "y"], answer: 0, why: "" },
    { id: "4", q: "Four?", options: ["only", ""], answer: 0, why: "" },
    { id: "5", q: "Five?", options: ["p", ""], answer: 1, why: "" },
    { id: "6", q: "Six?", options: ["p", "q"], answer: 1, why: "" },
  ];
  assert.equal(S.questionProblem(questions[2]), "Write the question.");
  assert.equal(S.questionProblem(questions[3]), "Add at least two choices.");
  assert.equal(S.questionProblem({ ...questions[5], answer: 3 }), "Pick the right answer.");
  const ready = S.playable(questions);
  assert.deepEqual(ready.map((q) => q.id), ["1", "2", "6"]);
  assert.deepEqual(ready[0].options, ["a", "b", "c"], "empty choices are dropped");
  assert.equal(ready[0].answer, 2, "the right answer follows its choice");

  assert.deepEqual(S.scoreQuiz(ready, [2, 1, 1]), { score: 2, total: 3, percent: 67, missed: [1] });
  assert.deepEqual(S.scoreQuiz(ready, [2]), { score: 1, total: 3, percent: 33, missed: [1, 2] }, "unanswered counts as wrong");
  assert.deepEqual(S.scoreQuiz([], []), { score: 0, total: 0, percent: 0, missed: [] });

  const makeId = counter();
  let doc = S.emptyStudy();
  doc = S.recordAttempt(doc, "q1", S.scoreQuiz(ready, [0, 0, 0]), "2026-10-20T10:00:00Z", makeId);
  doc = S.recordAttempt(doc, "q1", S.scoreQuiz(ready, [2, 0, 1]), "2026-10-21T10:00:00Z", makeId);
  doc = S.recordAttempt(doc, "q1", S.scoreQuiz(ready, [2, 1, 0]), "2026-10-22T10:00:00Z", makeId);
  doc = S.recordAttempt(doc, "q1", { score: 0, total: 0, percent: 0, missed: [] }, "x", makeId);
  const summary = S.scoreSummary(doc.attempts, "q1");
  assert.equal(summary.count, 3, "an empty quiz is not recorded");
  assert.deepEqual([summary.last.score, summary.best.score], [1, 3]);
  // Saved and read back.
  assert.deepEqual(S.normalizeStudy(JSON.parse(JSON.stringify(doc))).attempts, doc.attempts);
  // Old attempts make room, but the best is kept.
  for (let i = 0; i < 30; i++) doc = S.recordAttempt(doc, "q1", S.scoreQuiz(ready, []), `t${i}`, makeId);
  const mine = doc.attempts.filter((a) => a.quizId === "q1");
  assert.equal(mine.length, S.LIMITS.attemptsPerQuiz + 1);
  assert.equal(S.scoreSummary(doc.attempts, "q1").best.score, 3);

  const text = S.quizText("Cells", ready, "Bring a pen.");
  assert.match(text, /^Cells\n\n1\. One\?\n   A\. a\n   B\. b\n   C\. c\n   Answer: C\. c/);
  assert.doesNotMatch(S.quizText("Cells", ready, "", false), /Answer:/);
});

// ------------------------------------------------------------------ references

test("references: the four styles, saved A to Z, and the law year once", () => {
  const paper = { author: "Adebayo, T.", year: "2024", title: "Study habits", source: "Lagos Journal" };
  assert.equal(S.formatReference("APA", paper), "Adebayo, T. (2024). Study habits. Lagos Journal.");
  assert.equal(S.formatReference("MLA", paper), 'Adebayo, T.. "Study habits." Lagos Journal, 2024.');
  assert.equal(S.formatReference("Chicago", paper), "Adebayo, T.. 2024. Study habits. Lagos Journal.");
  assert.equal(S.formatReference("Law", { parties: "Ade v Bello", year: "2024", volume: "5", report: "NWLR", part: "1925", page: "1", court: "SC" }), "Ade v Bello (2024) 5 NWLR (Pt. 1925) 1, SC");
  assert.equal(S.referenceReady("APA", { author: "A" }), false);
  assert.equal(S.referenceReady("Law", { parties: "A v B" }), true);

  const refs = [
    { id: "1", style: "APA", fields: { author: "Zed", title: "Z", source: "S", year: "2020" }, createdAt: "" },
    { id: "2", style: "Law", fields: { parties: "Bello v Ade", year: "2020" }, createdAt: "" },
    { id: "3", style: "MLA", fields: { author: "adams", title: "A", source: "S", year: "2021" }, createdAt: "" },
  ];
  assert.deepEqual(S.sortedReferences(refs).map((r) => r.ref.id), ["3", "2", "1"], "A to Z, ignoring case");
  assert.equal(S.referencesText(refs), 'References\n\nadams. "A." S, 2021.\nZed (2020). Z. S.\n\nTable of cases\n\nBello v Ade (2020)');
  // A saved list reads back (this is what makes references persist).
  const doc = S.normalizeStudy(JSON.parse(JSON.stringify({ references: refs })));
  assert.deepEqual(doc.references, refs);
});

test("a saved document is cleaned on read: limits, bad values and unknown sources", () => {
  const doc = S.normalizeStudy({
    decks: [{ id: "d", title: "x".repeat(500), cards: [{ id: "c", front: "f", back: "b" }, { id: "c", front: "g", back: "h" }], from: "evil" }],
    quizzes: [{ id: "q", questions: [{ q: "Q", options: ["a"], answer: 9 }] }],
    progress: { d: { c: { box: 99, due: "2026-10-22" }, bad: { box: 1, due: "tomorrow" } } },
    attempts: [{ id: "a", quizId: "q", score: 5, total: 2, at: "" }],
    references: [{ id: "r", style: "Harvard", fields: { author: "A", "<x>": "y" } }],
    imported: { "lab-notes": "yes" },
  });
  assert.equal(doc.decks[0].title.length, S.LIMITS.title);
  assert.equal(doc.decks[0].from, undefined);
  assert.notEqual(doc.decks[0].cards[0].id, doc.decks[0].cards[1].id, "duplicate card ids are made unique");
  assert.deepEqual(doc.quizzes[0].questions[0].options, ["a", ""]);
  assert.equal(doc.quizzes[0].questions[0].answer, 0);
  assert.deepEqual(Object.keys(doc.progress.d), ["c"]);
  assert.equal(doc.progress.d.c.box, S.INTERVALS.length - 1);
  assert.deepEqual(doc.attempts, [], "a score above the total is dropped");
  assert.deepEqual(doc.references[0], { id: "r", style: "APA", fields: { author: "A" }, createdAt: "" });
  assert.deepEqual(doc.imported, {});
  assert.deepEqual(S.normalizeStudy("nonsense"), S.emptyStudy());
});

// ------------------------------------------------------------------ share links

const deck = { id: "deck-1", title: "Bones", cards: [{ id: "c1", front: "Femur", back: "Thigh bone" }, { id: "c2", front: " ", back: "" }], createdAt: "x", updatedAt: "y" };
const quiz = { id: "quiz-1", title: "Cells", questions: [{ id: "q", q: "Unit of life?", options: ["Cell", "Atom", "", ""], answer: 0, why: "" }], notes: "", createdAt: "", updatedAt: "" };

test("share tokens are random, URL-safe and 32 characters", () => {
  const tokens = new Set(Array.from({ length: 200 }, () => S.newShareToken()));
  assert.equal(tokens.size, 200);
  for (const token of tokens) assert.ok(S.isShareToken(token), token);
  assert.equal(S.isShareToken("short"), false);
  assert.equal(S.isShareToken("x".repeat(31) + "!"), false);
  assert.equal(S.isShareToken(42), false);
});

test("making a link needs Midnry Pass; opening one needs only a signed-in account", async () => {
  const { sql } = await freshDb();
  const refused = await Sh.createShare(sql, "friend", false, "deck", deck);
  assert.deepEqual([refused.ok, refused.error], [false, "pass"]);
  assert.match(refused.message, /Midnry Pass/);
  assert.equal((await sql.query(`select count(*)::int as n from study_shares`))[0].n, 0, "nothing stored");

  const made = await Sh.createShare(sql, "owner", true, "deck", deck);
  assert.equal(made.ok, true);
  assert.ok(S.isShareToken(made.token));

  // Signed out: refused. Signed in (any account, free is enough): a read-only copy.
  assert.deepEqual(await Sh.openShare(sql, null, made.token), { ok: false, error: "sign-in" });
  assert.deepEqual(await Sh.openShare(sql, "", made.token), { ok: false, error: "sign-in" });
  const opened = await Sh.openShare(sql, "friend", made.token);
  assert.equal(opened.ok, true);
  assert.equal(opened.mine, false);
  assert.equal(opened.shared.kind, "deck");
  assert.deepEqual(opened.shared.item.cards.map((c) => c.front), ["Femur"], "empty cards are not shared");
  assert.doesNotMatch(JSON.stringify(opened), /owner|example\.test/, "no owner id, name or email");
  assert.equal((await Sh.openShare(sql, "owner", made.token)).mine, true);

  // The viewer saves a copy into their own space, with new ids.
  const copy = S.copyShared(S.emptyStudy(), opened.shared, stamp, counter());
  assert.equal(copy.doc.decks[0].source, "shared");
  assert.notEqual(copy.doc.decks[0].id, "deck-1");
  assert.equal(copy.doc.decks[0].cards[0].front, "Femur");

  // Unknown or malformed tokens.
  assert.deepEqual(await Sh.openShare(sql, "friend", S.newShareToken()), { ok: false, error: "not-found" });
  assert.deepEqual(await Sh.openShare(sql, "friend", "' or 1=1 --"), { ok: false, error: "not-found" });
});

test("one link per item: sharing again updates the copy behind the same link", async () => {
  const { sql } = await freshDb();
  const first = await Sh.createShare(sql, "owner", true, "quiz", quiz);
  const second = await Sh.createShare(sql, "owner", true, "quiz", { ...quiz, title: "Cells, v2" });
  assert.equal(second.token, first.token);
  assert.equal(second.updated, true);
  const opened = await Sh.openShare(sql, "friend", first.token);
  assert.equal(opened.shared.item.title, "Cells, v2");
  assert.deepEqual(opened.shared.item.questions[0].options, ["Cell", "Atom"]);
  // Two people sharing items with the same id get separate links.
  const theirs = await Sh.createShare(sql, "other", true, "quiz", quiz);
  assert.notEqual(theirs.token, first.token);
  // Nothing to share, or too much.
  assert.equal((await Sh.createShare(sql, "owner", true, "deck", { ...deck, id: "empty", cards: [] })).error, "invalid");
  assert.equal((await Sh.createShare(sql, "owner", true, "poll", deck)).error, "invalid");
});

test("revoke works, only for the owner, and lists are scoped to the owner", async () => {
  const { sql } = await freshDb();
  const made = await Sh.createShare(sql, "owner", true, "deck", deck);
  await Sh.createShare(sql, "other", true, "deck", { ...deck, title: "Someone else's" });
  assert.deepEqual((await Sh.listShares(sql, "owner")).map((s) => [s.kind, s.itemId, s.title]), [["deck", "deck-1", "Bones"]]);
  assert.deepEqual(await Sh.listShares(sql, "friend"), []);

  assert.equal(await Sh.revokeShare(sql, "friend", made.token), false, "someone else can't turn it off");
  assert.equal((await Sh.openShare(sql, "friend", made.token)).ok, true);
  assert.equal(await Sh.revokeShare(sql, "owner", made.token), true);
  assert.deepEqual(await Sh.openShare(sql, "friend", made.token), { ok: false, error: "not-found" });
  assert.equal(await Sh.revokeShare(sql, "owner", made.token), false, "already off");
  assert.equal((await Sh.listShares(sql, "other")).length, 1, "the other person's link is untouched");
  // Losing the Pass later: the owner can still turn links off (revoke never checks the Pass).
  assert.doesNotMatch(Sh.revokeShare.toString(), /canShare|hasPass/);
});

test("a closed account's links stop opening, and the purge deletes them", async () => {
  const { sql } = await freshDb();
  const made = await Sh.createShare(sql, "owner", true, "deck", deck);
  await sql.query(`insert into account_closure (user_id, closed_at) values ('owner', now())`);
  assert.deepEqual(await Sh.openShare(sql, "friend", made.token), { ok: false, error: "not-found" });
  for (const step of R.purgeSteps("owner", "deleted-x")) await sql.query(step.text, step.params);
  assert.equal((await sql.query(`select count(*)::int as n from study_shares`))[0].n, 0);
});

test("the share limit is enforced per owner", async () => {
  const { sql } = await freshDb();
  for (let i = 0; i < S.MAX_SHARES; i++) assert.equal((await Sh.createShare(sql, "owner", true, "deck", { ...deck, id: `d${i}` })).ok, true);
  const over = await Sh.createShare(sql, "owner", true, "deck", { ...deck, id: "one-more" });
  assert.equal(over.error, "limit");
  assert.equal((await Sh.createShare(sql, "owner", true, "deck", { ...deck, id: "d3", title: "update" })).ok, true, "updating an existing link still works");
});

test("server functions: authMiddleware on every one, Pass decided on the server", () => {
  const fns = readFileSync(join(root, "src/lib/study.functions.ts"), "utf8");
  const count = (re) => (fns.match(re) ?? []).length;
  assert.equal(count(/createServerFn\(/g), 4);
  assert.equal(count(/\.middleware\(\[authMiddleware\]\)/g), 4);
  assert.match(fns, /createShare\(sql, context\.userId, await canShare\(context\.userId\)/);
  assert.match(fns, /readIsAdmin\(userId\)/);
  assert.match(fns, /\.hasPass/);
  assert.doesNotMatch(fns, /data\.(userId|ownerId|canShare|hasPass)/, "never trusts the client for who or what");
});

// ------------------------------------------------------------------ retention, migration, removed slugs

test("study_shares is covered by retention and the migration is additive", () => {
  assert.deepEqual(R.USER_COLUMNS.study_shares, ["owner_id"]);
  assert.ok(R.purgeSteps("u", "a").some((s) => s.label === "study_shares" && /delete from study_shares where owner_id = \$1/.test(s.text)));
  const file = readdirSync(join(root, "migrations")).find((name) => /_study_shares\.sql$/.test(name));
  assert.ok(file, "migration exists");
  const text = readFileSync(join(root, "migrations", file), "utf8").replace(/--.*$/gm, "");
  assert.match(text, /create table if not exists study_shares/);
  assert.doesNotMatch(text, /\bdrop\b|\btruncate\b|delete from|alter table app_documents/i);
  const numbers = readdirSync(join(root, "migrations")).filter((name) => /^\d{4}_.*\.sql$/.test(name)).map((name) => name.slice(0, 4));
  assert.equal(new Set(numbers).size, numbers.length, "every migration number is used once");
});

test("no code links to the removed study apps except the alias, merged-document and search tables", () => {
  const allowed = new Set([
    "src/lib/app-aliases.ts",
    "src/lib/merged-docs.ts",
    "src/lib/app-search.ts",
    "src/lib/review-notes.ts", // sample sets keep their review notes by the old id
    "src/lib/study.ts", // the sample sets and the old documents copied in
    "src/lib/audience-tags.test.ts",
    "src/routeTree.gen.ts",
  ]);
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name)) files.push(path);
    }
  };
  walk(join(root, "src"));
  const pattern = new RegExp(`["'/](${OLD.join("|")})["'?]`);
  for (const path of files) {
    const rel = relative(root, path).split("\\").join("/");
    if (allowed.has(rel)) continue;
    const text = readFileSync(path, "utf8");
    const hit = text.match(pattern);
    assert.equal(hit, null, `${rel} still names ${hit?.[1]}`);
  }
  for (const old of OLD) assert.ok(Object.hasOwn(APP_ALIASES, old), `${old} keeps its old link`);
  // Shots for the new app exist; the sitemap is derived from the catalogue.
  for (const view of ["desktop", "phone"]) assert.ok(statSync(join(root, `public/shots/study/${view}.jpg`)).size > 10_000, view);
  const sitemap = readFileSync(join(root, "src/routes/sitemap[.]xml.ts"), "utf8");
  assert.match(sitemap, /APPS\.map\(\(app\) => `\/apps\/\$\{app\.slug\}`\)/);
});
