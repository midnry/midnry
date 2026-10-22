// Phase 3 quick fixes (docs/phase3-plan.md, D1, D2, D8, D10): wording that keeps
// its promises, no scam verdict, the "not professionally reviewed" note, the
// finder leaving unreviewed tools out, Shifts hours, "Add to Remind" text, and
// old saved rows still loading.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { KITS, getKit, legalCitation, bubbleFrames } = await jiti.import("../src/lib/kits.ts");
const { UNREVIEWED, reviewNote, isUnreviewed } = await jiti.import("../src/lib/review-notes.ts");
const scam = await jiti.import("../src/lib/scam-signs.ts");
const records = await jiti.import("../src/lib/records.ts");
const { parseTask } = await jiti.import("../src/lib/remind/parse.ts");
const { addParam } = await jiti.import("../src/lib/remind/pass-views.ts");
const { SECTIONS } = await jiti.import("../src/lib/sections.ts");
const { PASS_FEATURES } = await jiti.import("../src/lib/plans.ts");
const search = await jiti.import("../src/lib/app-search.ts");

const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const KIT_UI = src("src/components/tools/kit.tsx");
const VERDICT = /(this|it) (is|looks like|seems like) (a |an )?(scam|safe|fake)|is a scam|is safe\b|is not a scam/i;

// ---------------------------------------------------------------- D1: no scam verdict

test("Scam check: no verdict string anywhere it could show", () => {
  const strings = [
    ...scam.SCAM_SIGNS.flatMap((sign) => [sign.label, sign.meaning, sign.todo]),
    ...[0, 1, 2, 5].map(scam.scamHeadline),
    scam.SCAM_FOOTNOTE,
    ...scam.CLAIM_QUESTIONS,
    ...["scam-check", "rumor-check"].flatMap((slug) => {
      const kit = getKit(slug);
      return [kit.blurb, kit.note ?? "", ...kit.features, ...kit.guide];
    }),
  ];
  for (const text of strings) assert.doesNotMatch(text, VERDICT, text);
  assert.doesNotMatch(KIT_UI, /looks like a scam/i, "the old verdict is gone from the screen code");
  const scamUi = KIT_UI.slice(KIT_UI.indexOf("function Scam()"), KIT_UI.indexOf("function Claims()"));
  assert.doesNotMatch(scamUi, /bg-fail|text-fail/, "no red verdict styling");
});

test("Scam check lists each sign with what it means and what to do", () => {
  const found = scam.scamSigns("URGENT: your account has been blocked. Send the OTP to verify your account at bit.ly/x");
  assert.deepEqual(found.map((sign) => sign.id), ["pressure", "code", "link", "threat"]);
  for (const sign of found) {
    assert.ok(sign.label && sign.meaning && sign.todo, sign.id);
  }
  assert.equal(scam.scamHeadline(found.length), "Warning signs found: 4");
  assert.match(scam.scamHeadline(0), /does not prove/);
  assert.equal(scam.scamSigns("See you at church on Sunday.").length, 0);
});

test("Claims shows only its questions, not the scam checker", () => {
  assert.equal(scam.CLAIM_QUESTIONS.length, 4);
  assert.match(KIT_UI, /kit\.slug === "rumor-check" \? <Claims \/> : <Scam \/>/);
  const claims = KIT_UI.slice(KIT_UI.indexOf("function Claims()"), KIT_UI.indexOf("function Mood("));
  assert.doesNotMatch(claims, /scamSigns|scamHeadline|SCAM_/);
});

// ---------------------------------------------------------------- D1: promises kept or removed

test("broken promises are fixed or removed", () => {
  const text = (slug) => {
    const kit = getKit(slug);
    return [kit.blurb, ...kit.features, ...kit.guide].join(" ");
  };
  assert.doesNotMatch(text("circuit"), /series|parallel/i);
  assert.doesNotMatch(text("quiz-maker"), /draft some|from a topic/i);
  assert.equal(new Set(getKit("quiz-maker").features).size, getKit("quiz-maker").features.length, "no feature listed twice");
  assert.doesNotMatch(text("creative-brief"), /generate|tighter version/i);
  assert.doesNotMatch(text("solver"), /the missing value/i);
  assert.match(text("solver"), /one way/i);
  assert.match(text("shifts"), /hours/i);
  assert.match(text("algo"), /comparisons/i);
});

test("the two Brief apps have distinct names, and search finds both", () => {
  assert.equal(getKit("case-brief").name, "Case brief");
  assert.equal(getKit("creative-brief").name, "Creative brief");
  const names = KITS.map((kit) => kit.name);
  assert.equal(new Set(names).size, names.length, "every kit name is unique");
  const index = search.createSearchIndex(search.catalogSearchInputs());
  const found = search.searchIndex(index, "brief").hits.map((hit) => hit.slug);
  for (const slug of ["case-brief", "creative-brief"]) assert.ok(found.includes(slug), `${slug} in ${found.join(", ")}`);
});

test("Algo counts comparisons", () => {
  const frames = bubbleFrames([5, 1, 4, 2]);
  const last = frames[frames.length - 1];
  assert.deepEqual(last.list, [1, 2, 4, 5]);
  assert.equal(last.swaps, 4);
  assert.equal(last.comparisons, 6, "3 + 2 + 1 for four numbers");
  assert.deepEqual(frames[0], { list: [5, 1, 4, 2], comparisons: 0, swaps: 0 });
  const sorted = bubbleFrames([1, 2, 3]);
  assert.equal(sorted[sorted.length - 1].comparisons, 2, "an already sorted list stops after one pass");
});

test("law Cite: volume, part, page and court boxes, and the year once", () => {
  const values = { parties: "Ade v Bello", year: "2024", volume: "5", report: "NWLR", part: "1925", page: "1", court: "SC" };
  assert.equal(legalCitation(values), "Ade v Bello (2024) 5 NWLR (Pt. 1925) 1, SC");
  assert.equal(legalCitation({ parties: "Ade v Bello", year: "2024", report: "[2024] 5 NWLR" }), "Ade v Bello [2024] 5 NWLR", "an old-style report keeps one year");
  assert.equal(legalCitation({ parties: "Ade v Bello", year: "2024", part: "Pt. 7" }), "Ade v Bello (2024) (Pt. 7)");
  for (const word of ["volume", "court"]) assert.ok(KIT_UI.includes(`f("${word}"`), `${word} box exists`);
});

test("section blurbs no longer name apps that moved", () => {
  const blurb = (id) => SECTIONS.find((section) => section.id === id).blurb;
  assert.doesNotMatch(blurb("marketing"), /proposal/i);
  assert.doesNotMatch(blurb("books"), /budget/i);
  assert.match(blurb("law"), /Case briefs/);
  assert.match(blurb("creatives"), /Creative briefs/);
  assert.match(PASS_FEATURES.tasks, /reminder emails at a task's time/);
});

// ---------------------------------------------------------------- D2: not reviewed

const LISTED = ["dose", "dose-ref", "clinic-quiz", "anatomy", "symptom-log", "paye", "clauses", "contract-scan", "service-terms", "law-drill"];

test("every listed medical, tax and legal tool carries the review note, with the right professional", () => {
  assert.deepEqual(Object.keys(UNREVIEWED).sort(), [...LISTED].sort());
  const who = { dose: "a pharmacist or doctor", "dose-ref": "a pharmacist or doctor", "clinic-quiz": "a doctor", anatomy: "a doctor", "symptom-log": "a doctor", paye: "an accountant", clauses: "a lawyer", "contract-scan": "a lawyer", "service-terms": "a lawyer", "law-drill": "a lawyer" };
  for (const slug of LISTED) {
    assert.ok(getKit(slug), `${slug} is a kit, so KitTool shows the note`);
    assert.equal(reviewNote(slug), `Not professionally reviewed yet. Check with ${who[slug]} before relying on this.`);
  }
  assert.equal(reviewNote("units"), undefined);
  assert.match(KIT_UI, /reviewNote\(kit\.slug\)/, "KitTool renders the note");
  assert.match(src("src/components/showcase.tsx"), /reviewNote\(app\.slug\)/, "the signed-out page shows it too");
});

test("nothing claims these tools were checked or validated", () => {
  for (const slug of LISTED) {
    const kit = getKit(slug);
    const text = [kit.blurb, kit.note ?? "", ...kit.features, ...kit.guide].join(" ");
    assert.doesNotMatch(text, /\b(validated|verified|approved|reviewed by|checked by)\b/i, slug);
  }
});

test("the finder never suggests an unreviewed tool, and the dose option is gone", () => {
  const quiz = src("src/components/match-quiz.tsx");
  const tasks = quiz.slice(quiz.indexOf("const TASKS"), quiz.indexOf("const MAX_RESULTS"));
  const slugs = [...tasks.matchAll(/apps: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]));
  assert.ok(slugs.length > 40, "parsed the task list");
  for (const slug of slugs) assert.ok(!isUnreviewed(slug), `${slug} is suggested by the finder`);
  assert.doesNotMatch(tasks, /dose|checking a dose/i);
  assert.match(quiz, /APPS\.filter\(\(app\) => !isUnreviewed\(app\.slug\)\)/, "typed words never match them");
  assert.match(quiz, /getApp\(slug\) && !isUnreviewed\(slug\)/, "ranking drops them");
});

test("not featured in goals or related apps, still found by search", async () => {
  const { GOALS } = await jiti.import("../src/lib/goals.ts");
  for (const goal of GOALS) assert.ok(!isUnreviewed(goal.target), goal.target);
  const show = src("src/components/showcase.tsx");
  const related = [...show.slice(show.indexOf("const RELATED"), show.indexOf("const SAVES")).matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(related.some(isUnreviewed), "a curated list names one (Agreement), so the filter matters");
  assert.match(show, /\.filter\(\(slug\) => !isUnreviewed\(slug\)\)/);
  const index = search.createSearchIndex(search.catalogSearchInputs());
  for (const [query, slug] of [["dose", "dose"], ["paye", "paye"], ["clauses", "clauses"], ["symptoms", "symptom-log"]]) {
    assert.ok(search.searchIndex(index, query).hits.some((hit) => hit.slug === slug), `search "${query}" finds ${slug}`);
  }
});

// ---------------------------------------------------------------- D8: Shifts hours, Add to Remind

test("Shifts hours: day, night and odd inputs", () => {
  assert.equal(records.shiftHours("07:00", "19:00"), 12);
  assert.equal(records.shiftHours("19:00", "07:00"), 12, "a night shift runs past midnight");
  assert.equal(records.shiftHours("08:30", "17:00"), 8.5);
  assert.equal(records.shiftHours("7am", "3:30pm"), 8.5, "old free-text times still count");
  assert.equal(records.shiftHours("22:00", "22:00"), 24);
  assert.equal(records.shiftHours("", "19:00"), null);
  assert.equal(records.shiftHours("morning", "19:00"), null);
  assert.equal(records.shiftHours("25:00", "19:00"), null);
  assert.equal(records.hoursLabel(8.5), "8.5 h");
  const rows = [
    { date: "2026-10-19", start: "07:00", end: "19:00", where: "Ward 3" },
    { date: "2026-10-22", start: "19:00", end: "07:00" },
    { date: "2026-10-26", start: "08:00", end: "16:00" },
    { date: "Mon", start: "x", end: "y" },
  ];
  assert.deepEqual(records.shiftTotals(rows, "2026-10-22"), { total: 32, week: 24, counted: 3 });
  assert.deepEqual(records.weekOf("2026-10-25"), { from: "2026-10-19", to: "2026-10-25" }, "Sunday ends the week");
});

test("Add to Remind text, and Remind reads it to the right date", () => {
  const today = "2026-10-22";
  const cases = [
    ["bill-watch", { name: "Electricity", amount: "12000", dueOn: "2026-11-25" }, "Pay Electricity bill (12,000) on 25 Nov 2026", { title: "Pay Electricity bill (12,000)", due: "2026-11-25", time: "", recur: "none" }],
    ["bill-watch", { name: "Water bill", dueOn: "2026-11-03" }, "Pay Water bill on 3 Nov 2026", { title: "Pay Water bill", due: "2026-11-03", time: "", recur: "none" }],
    ["bill-watch", { name: "NEPA", amount: "5000", due: "1st" }, "Pay NEPA bill (5,000) every 1st", { title: "Pay NEPA bill (5,000)", due: "2026-11-01", time: "", recur: "monthday:1" }],
    ["visits", { who: "Dr Bello", where: "General Hospital", date: "2026-10-24", time: "10:00" }, "Visit Dr Bello at General Hospital on 24 Oct 2026 at 10am", { title: "Visit Dr Bello at General Hospital", due: "2026-10-24", time: "10:00", recur: "none" }],
    ["visits", { who: "Dr Bello", when: "Fri 10am" }, "Visit Dr Bello Fri 10am", { title: "Visit Dr Bello", due: "2026-10-23", time: "10:00", recur: "none" }],
    ["shifts", { date: "2026-10-24", start: "07:00", end: "19:00", where: "Ward 3" }, "Shift at Ward 3 on 24 Oct 2026 at 7am until 7pm", { title: "Shift at Ward 3 until 7pm", due: "2026-10-24", time: "07:00", recur: "none" }],
    ["shifts", { date: "2026-10-24", start: "19:30", end: "07:30", where: "ICU #2 @night" }, "Shift at ICU 2 night on 24 Oct 2026 at 7:30pm until 7:30am", { title: "Shift at ICU 2 night until 7:30am", due: "2026-10-24", time: "19:30", recur: "none" }],
  ];
  for (const [slug, row, text, parsed] of cases) {
    assert.equal(records.remindText(slug, row), text);
    const got = parseTask(text, today);
    assert.deepEqual({ title: got.title, due: got.due, time: got.time, recur: got.recur }, parsed, text);
    assert.equal(got.project, "", "no accidental #project");
    assert.deepEqual(got.labels, [], "no accidental @label");
  }
  assert.deepEqual([...records.REMIND_APPS], ["bill-watch", "visits", "shifts"]);
});

test("?add= is cleaned, capped and optional", () => {
  assert.equal(addParam("  Pay rent\non 25 Nov 2026 "), "Pay rent on 25 Nov 2026");
  assert.equal(addParam("x".repeat(400)).length, 300);
  assert.equal(addParam(""), undefined);
  assert.equal(addParam(42), undefined);
  const route = src("src/routes/apps/$slug.tsx");
  assert.match(route, /const add = addParam\(search\.add\)/);
  assert.match(route, /const view = viewParam\(search\.view\)/, "?view= still works");
  const quick = src("src/components/tools/remind/quick-add.tsx");
  assert.match(quick, /Nothing is added until you do/);
  assert.doesNotMatch(quick.slice(quick.indexOf("useEffect(() => {"), quick.indexOf("function submit")), /onAdd\(/, "pre-filling never adds a task by itself");
});

// ---------------------------------------------------------------- Old rows still load

test("old saved rows load unchanged: legacy boxes stay, new boxes are added", () => {
  const field = (slug, id) => getKit(slug).fields.find((item) => item.id === id);
  // Bills: old rows saved { name, amount, due: "1st" }.
  assert.equal(field("bill-watch", "due").legacy, true);
  assert.equal(field("bill-watch", "dueOn").kind, "date");
  for (const id of ["name", "amount"]) assert.ok(field("bill-watch", id), id);
  // Visits: old rows saved { who, where, when }.
  assert.equal(field("visits", "when").legacy, true);
  assert.equal(field("visits", "date").kind, "date");
  assert.equal(field("visits", "time").kind, "time");
  // Shifts: same ids as before, now with date and time boxes.
  assert.deepEqual(getKit("shifts").fields.map((item) => item.id), ["date", "start", "end", "where"]);
  // The list shows a legacy box whenever the row has it, and edits keep fields the form doesn't show.
  assert.match(KIT_UI, /fields\.filter\(\(field\) => !field\.legacy \|\| values\[field\.id\]\?\.trim\(\)\)/);
  assert.match(KIT_UI, /\.\.\.\(editing != null \? rows\[editing\] : \{\}\)/);
  // Old free-text rows still give a sensible reminder line, and an old Shifts date still reads.
  assert.equal(records.remindText("bill-watch", { name: "Rent", due: "end of month" }), "Pay Rent bill end of month");
  assert.equal(records.prettyDay("2026-10-04"), "4 Oct 2026");
  assert.equal(records.prettyDay("Mon"), "");
  assert.equal(records.prettyDay("2026-02-30"), "");
});

// ---------------------------------------------------------------- D10: reset time

test("AI allowance wording states the real reset time", () => {
  const server = src("src/lib/ai-write.functions.ts");
  assert.match(server, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/, "the day is the GMT date");
  assert.doesNotMatch(KIT_UI, /resets tomorrow/);
  assert.match(KIT_UI, /reset at 1 am Nigeria time \(midnight GMT\)/);
  assert.match(src("src/routes/privacy.tsx"), /1 am Nigeria time/);
});
