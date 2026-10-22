// Apply's matching against a job advert (src/lib/apply/match.ts), the
// tailoring plan with per-change accept/revert (src/lib/apply/tailor.ts), and
// the saved document (src/lib/apply/doc.ts). Synthetic resumes and adverts only.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const M = await jiti.import("../src/lib/apply/match.ts");
const T = await jiti.import("../src/lib/apply/tailor.ts");
const D = await jiti.import("../src/lib/apply/doc.ts");
const { docLimit } = await jiti.import("../src/lib/doc-limits.ts");

const NOW = new Date("2026-10-01T00:00:00Z");

const ADVERT = `Frontend Engineer at Acme Health

Acme Health builds booking tools for clinics. Acme Health is growing fast.

Requirements
- 5+ years of experience building web applications
- Strong TypeScript and React skills
- Experience with design systems and accessibility
- Unit tests with Jest
- Experience with GraphQL APIs
- Bachelor's degree in Computer Science or a related field
- You will Excel at clear writing about the patient booking flow

Nice to have
- Kubernetes
- Storybook

You will own the patient booking flow end to end and partner with designers on the patient booking flow every week.`;

const RESUME = `José Müller
jose@example.test | +44 7700 900123

Summary
Frontend developer who ships accessible web apps.

Experience
Lead Developer, Shopco (Mar 2019 - Present)
- Ran weekly team meetings and hiring loops
- Organised the office move
- Built a React and TypeScript design system used by 6 teams
- Added accessibility audits to every release

Developer, Webby (2016 - 2019)
- Wrote marketing pages in jQuery
- Introduced Jest unit tests across the codebase

Skills
Skills: jQuery, Photoshop, React, TypeScript, Jest

Education
BSc Computer Science, University of Lagos`;

const byKey = (terms) => new Map(terms.map((term) => [term.key, term]));

// ── Term extraction ─────────────────────────────────────────────────────────

test("extraction: tools, skills, qualifications, years and repeated phrases", () => {
  const terms = byKey(M.extractTerms(ADVERT));
  for (const key of ["typescript", "react", "jest", "graphql", "kubernetes", "storybook"]) assert.equal(terms.get(key)?.kind, "tool", key);
  for (const key of ["design system", "accessibility", "apis"]) assert.equal(terms.get(key)?.kind, "skill", key);
  const degree = [...terms.values()].find((term) => term.kind === "qualification");
  assert.equal(degree?.label, "Bachelor’s degree in Computer Science");
  const years = [...terms.values()].find((term) => term.kind === "years");
  assert.equal(years?.years, 5);
  assert.equal(years?.label, "5+ years of experience building web applications");
  assert.equal(terms.get("patient booking flow")?.kind, "phrase", "a phrase used three times");
});

test("extraction: nice-to-have items are marked and weigh less", () => {
  const terms = byKey(M.extractTerms(ADVERT));
  assert.equal(terms.get("kubernetes").required, false);
  assert.equal(terms.get("react").required, true);
  assert.ok(terms.get("kubernetes").weight < terms.get("react").weight);
});

test("extraction: names, headings and ordinary capitalised words are not requirements", () => {
  const keys = M.extractTerms(ADVERT).map((term) => term.key);
  assert.ok(!keys.some((key) => key.includes("acme")), `the employer's name is not a phrase: ${keys}`);
  assert.ok(!keys.includes("requirements"), "the Requirements heading is not a skill");
  assert.ok(!keys.includes("excel"), "“Excel at” is not the spreadsheet");
  assert.ok(M.extractTerms("We use Excel and SQL daily for reporting. Our analysts know Excel well.").some((t) => t.key === "excel"));
});

test("extraction: an empty or short advert gives nothing; output is capped", () => {
  assert.deepEqual(M.extractTerms(""), []);
  const long = Array.from({ length: 60 }, (_, i) => `- ${["React", "Python", "Figma", "SQL", "Docker", "Jira"][i % 6]} and Tableau, Salesforce, HubSpot, Zendesk, Terraform`).join("\n");
  assert.ok(M.extractTerms(long).length <= 30);
});

test("extraction: spelling variants, aliases and plurals match the resume", () => {
  const terms = byKey(M.extractTerms("Strong prioritization and data visualization. Node.js, Kubernetes and PostgreSQL. Design systems."));
  assert.ok(M.findTerm("Led prioritisation for the roadmap", terms.get("prioritisation")));
  assert.ok(M.findTerm("Built data visualisations", terms.get("data visualisation")));
  assert.equal(M.findTerm("Ran services on k8s", terms.get("kubernetes")), "k8s");
  assert.equal(M.findTerm("Postgres and Redis", terms.get("postgresql")), "Postgres");
  assert.ok(M.findTerm("Maintained two design systems", terms.get("design system")));
  assert.equal(M.findTerm("Reactive programming", M.extractTerms("React and React.")[0]), null, "whole words only");
});

test("years: the union of the resume's date ranges, never more than it says", () => {
  assert.deepEqual(M.resumeYears("Acme 2016 - 2019\nShopco Mar 2019 – Present", NOW), { years: 10, source: "dates" });
  assert.deepEqual(M.resumeYears("A 2018 - 2020\nB 2019 - 2020", NOW), { years: 2, source: "dates" }, "overlap counted once");
  assert.deepEqual(M.resumeYears("No dates here", NOW), { years: 0, source: null });
  assert.deepEqual(M.resumeYears("Over 12 years of experience in sales. 2024 - 2025", NOW), { years: 12, source: "stated" });
});

// ── Scoring and ordering ────────────────────────────────────────────────────

test("scoring: a line scores the summed weight of the terms it contains", () => {
  const terms = M.extractTerms(ADVERT);
  const w = byKey(terms);
  const line = "- Built a React and TypeScript design system used by 6 teams";
  const { score, matched } = M.scoreLine(line, terms);
  assert.deepEqual(new Set(matched), new Set(["react", "typescript", "design system"]));
  assert.equal(score, w.get("react").weight + w.get("typescript").weight + w.get("design system").weight);
  assert.deepEqual(M.scoreLine("- Organised the office move", terms), { score: 0, matched: [] });
});

test("ordering: strongest evidence first in each bullet run; ties and zero scores keep their order", () => {
  const plan = T.planTailoring("Frontend Engineer", RESUME, ADVERT, NOW);
  const out = T.composeResume(plan).split("\n");
  const shopco = out.slice(out.findIndex((l) => l.startsWith("Lead Developer")) + 1).slice(0, 4);
  assert.deepEqual(shopco, [
    "- Built a React and TypeScript design system used by 6 teams",
    "- Added accessibility audits to every release",
    "- Ran weekly team meetings and hiring loops",
    "- Organised the office move",
  ]);
  const webby = out.slice(out.findIndex((l) => l.startsWith("Developer, Webby")) + 1).slice(0, 2);
  assert.deepEqual(webby, ["- Introduced Jest unit tests across the codebase", "- Wrote marketing pages in jQuery"]);
  assert.ok(out.includes("Skills: React, TypeScript, Jest, jQuery, Photoshop"), "matching skills lead the skills line");
  // Bullets never cross into another run.
  assert.ok(out.indexOf("- Wrote marketing pages in jQuery") > out.findIndex((l) => l.startsWith("Developer, Webby")));
});

test("coverage: covered terms cite a resume line; gaps are listed, not added", () => {
  const plan = T.planTailoring("Frontend Engineer", RESUME, ADVERT, NOW);
  const covered = byKey(plan.covered);
  assert.equal(covered.get("react").evidence, "- Built a React and TypeScript design system used by 6 teams");
  assert.ok(covered.has("degree-in:computer science"));
  assert.match([...covered.values()].find((c) => c.kind === "years").evidence, /about 10 years/);
  const missing = plan.missing.map((m) => m.key);
  for (const key of ["graphql", "kubernetes", "storybook", "apis"]) assert.ok(missing.includes(key), key);
  const out = T.composeResume(plan);
  for (const label of ["GraphQL", "Kubernetes", "Storybook"]) assert.ok(!out.includes(label), `${label} is not added`);
  // A resume without the years is not credited with them.
  const junior = T.planTailoring("Frontend Engineer", "Ada Example\n\nExperience\nShopco 2024 - Present\n- Built React apps", ADVERT, NOW);
  assert.ok(junior.missing.some((m) => m.kind === "years"));
});

test("role name only: works as before, with the role's keyword family", () => {
  const plan = T.planTailoring("Frontend Engineer", RESUME, "", NOW);
  assert.equal(plan.fromAdvert, false);
  assert.equal(plan.changes[0].text, "Frontend Engineer | TypeScript · React");
  assert.ok(plan.missing.every((m) => !["frontend", "engineer"].includes(m.key)), "the role's own words are not gaps");
  const { note, resume } = T.tailorResume("Frontend Engineer", RESUME);
  assert.match(note, /This role often asks for/);
  assert.ok(resume.includes("Frontend Engineer | TypeScript · React"));
});

// ── The no-invention guarantee ──────────────────────────────────────────────

/**
 * Every non-blank output line is a resume line, a skills line made of the same
 * items as one resume line, or the headline (the role, then terms found in the
 * resume). No resume line is dropped or duplicated.
 */
function assertNothingInvented(role, resume, output, label) {
  const inputs = resume.replace(/\r/g, "").split("\n");
  const pool = new Map();
  for (const line of inputs) if (line.trim()) pool.set(line, (pool.get(line) ?? 0) + 1);
  const items = (line) => line.replace(/^(\s*[^:,]{2,25}:\s*)/, "").split(",").map((p) => p.trim()).filter(Boolean).sort();
  const prefix = (line) => line.match(/^(\s*[^:,]{2,25}:\s*)/)?.[1] ?? "";
  let headlines = 0;
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    if (pool.get(line)) {
      pool.set(line, pool.get(line) - 1);
      continue;
    }
    const source = [...pool.entries()].find(([input, n]) => n > 0 && input.includes(",") && prefix(input) === prefix(line) && JSON.stringify(items(input)) === JSON.stringify(items(line)));
    if (source) {
      pool.set(source[0], source[1] - 1);
      continue;
    }
    assert.ok(line === role.trim() || line.startsWith(`${role.trim()} | `), `${label}: invented line ${JSON.stringify(line)}`);
    headlines += 1;
    const parts = line === role.trim() ? [] : line.slice(role.trim().length + 3).split(" · ");
    for (const part of parts) assert.ok(resume.toLowerCase().includes(part.toLowerCase()), `${label}: headline term ${JSON.stringify(part)} is not in the resume`);
  }
  assert.ok(headlines <= 1, `${label}: one headline at most`);
  for (const [line, n] of pool) assert.equal(n, 0, `${label}: dropped ${JSON.stringify(line)}`);
}

test("no invention: the example, with every combination of reverted changes", () => {
  const plan = T.planTailoring("Frontend Engineer", RESUME, ADVERT, NOW);
  const ids = plan.changes.map((c) => c.id);
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    const reverted = ids.filter((_, i) => mask & (1 << i));
    assertNothingInvented("Frontend Engineer", RESUME, T.composeResume(plan, reverted), `mask ${mask}`);
  }
});

// A small deterministic generator for many resumes and adverts.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const WORDS = ["React", "Python", "SQL", "Figma", "Excel", "Jira", "Salesforce", "stakeholder management", "user research", "budgeting", "patient care", "triage", "lesson planning", "Docker", "AWS", "Kubernetes", "customer service", "negotiation", "Tableau", "accessibility", "Go", "R", "C#", ".NET", "Node.js"];
const FILLER = ["Led", "Built", "Improved", "Ran", "Owned", "Supported", "the", "weekly", "team", "process", "with", "for", "clients", "across", "3 sites"];

test("no invention: 300 generated resumes and adverts, all changes and random reverts", () => {
  const random = rng(20261022);
  const pick = (list) => list[Math.floor(random() * list.length)];
  for (let round = 0; round < 300; round++) {
    const bullet = () => `${pick(["- ", "• ", "* ", "1. "])}${Array.from({ length: 3 + Math.floor(random() * 6) }, () => (random() < 0.3 ? pick(WORDS) : pick(FILLER))).join(" ")}`;
    const lines = ["Ada Ọlá Example", "ada@example.test", "", "Experience"];
    for (let job = 0; job < 1 + Math.floor(random() * 3); job++) {
      lines.push(`Role ${job}, Company ${job} (${2010 + job} - ${2012 + job})`);
      for (let b = 0; b < 1 + Math.floor(random() * 5); b++) lines.push(bullet());
      if (random() < 0.3) lines.push(bullet()); // duplicates are allowed
      lines.push("");
    }
    lines.push("Skills", `${random() < 0.5 ? "Tools: " : ""}${Array.from({ length: 4 }, () => pick(WORDS)).join(", ")}`);
    const resume = lines.join(random() < 0.2 ? "\r\n" : "\n");
    const advert = Array.from({ length: 4 + Math.floor(random() * 8) }, () => `- ${Math.floor(random() * 8)}+ years of experience with ${pick(WORDS)} and ${pick(WORDS)}; ${pick(FILLER)} ${pick(WORDS)}`).join("\n");
    const role = pick(["Data analyst", "Nurse", "Frontend engineer", "Account executive", "Teacher"]);
    const plan = T.planTailoring(role, resume, random() < 0.8 ? advert : "", NOW);
    const reverted = plan.changes.filter(() => random() < 0.4).map((c) => c.id);
    assertNothingInvented(role, resume, T.composeResume(plan), `round ${round}`);
    assertNothingInvented(role, resume, T.composeResume(plan, reverted), `round ${round} reverted`);
    // A missing term never appears in the output unless the resume had it.
    for (const gap of plan.missing) {
      if (gap.kind === "years" || gap.kind === "qualification") continue;
      const term = plan.terms.find((t) => t.key === gap.key);
      assert.equal(M.findTerm(T.composeResume(plan), term), null, `round ${round}: ${gap.key}`);
    }
  }
});

// ── Accept and revert ───────────────────────────────────────────────────────

test("accept/revert: one move, the headline, and everything", () => {
  const plan = T.planTailoring("Frontend Engineer", RESUME, ADVERT, NOW);
  const move = plan.changes.find((c) => c.kind === "move" && c.text.includes("accessibility audits"));
  const out = T.composeResume(plan, [move.id]).split("\n");
  const start = out.findIndex((l) => l.startsWith("Lead Developer")) + 1;
  assert.deepEqual(out.slice(start, start + 4), [
    "- Built a React and TypeScript design system used by 6 teams",
    "- Ran weekly team meetings and hiring loops",
    "- Organised the office move",
    "- Added accessibility audits to every release",
  ], "the reverted bullet goes back to its own place");
  assert.ok(!T.composeResume(plan, ["headline"]).includes("Frontend Engineer |"));
  const allOff = T.composeResume(plan, plan.changes.map((c) => c.id));
  assert.equal(allOff, RESUME, "reverting every change gives the resume back");
  const lines = T.composeLines(plan, [move.id]);
  assert.ok(lines.some((l) => l.change === "headline"));
  assert.ok(!lines.some((l) => l.change === move.id));
});

test("accept/revert on the saved document, with hand edits", () => {
  let doc = D.preparePacks(D.FALLBACK, { rolesText: "Frontend Engineer\nDesigner", resume: RESUME, adverts: { "frontend engineer": ADVERT } }, NOW);
  assert.equal(doc.packs.length, 2);
  const [fe, designer] = doc.packs;
  assert.equal(fe.v, 2);
  assert.equal(fe.advert, ADVERT.trim());
  assert.equal(designer.advert, "");
  const plan = D.planFor(doc, fe, NOW);
  doc = D.setChange(doc, "Frontend Engineer", "headline", false, NOW);
  assert.deepEqual(doc.packs[0].reverted, ["headline"]);
  assert.ok(!doc.packs[0].resume.includes("Frontend Engineer |"));
  assert.equal(doc.packs[0].resume, T.composeResume(plan, ["headline"]));
  assert.doesNotMatch(doc.packs[0].note, /Added a headline/);
  doc = D.setChange(doc, "Frontend Engineer", "headline", true, NOW);
  assert.deepEqual(doc.packs[0].reverted, []);
  assert.equal(doc.packs[0].resume, T.composeResume(plan));
  assert.deepEqual(D.setChange(doc, "Frontend Engineer", "move:999", false, NOW), doc, "unknown ids are ignored");

  // Edits are exported as written and pause accept/revert until discarded.
  doc = D.setChange(doc, "Frontend Engineer", "headline", false, NOW);
  doc = D.editText(doc, "Frontend Engineer", `${doc.packs[0].resume}\nReferences on request`);
  assert.equal(doc.packs[0].edited, true);
  assert.ok(doc.packs[0].resume.endsWith("References on request"));
  const frozen = D.setChange(doc, "Frontend Engineer", "headline", true, NOW);
  assert.equal(frozen.packs[0].resume, doc.packs[0].resume);
  doc = D.discardEdits(doc, "Frontend Engineer", NOW);
  assert.equal(doc.packs[0].edited, false);
  assert.equal(doc.packs[0].resume, T.composeResume(plan, ["headline"]), "discarding keeps the revert choices");

  // Preparing again with the same resume and advert keeps choices, edits and the tick.
  doc = D.editText(doc, "Frontend Engineer", "My own words");
  doc = D.setSubmitted(doc, "Frontend Engineer", true);
  const again = D.preparePacks(doc, { rolesText: doc.rolesText, resume: RESUME, adverts: D.advertsOf(doc) }, NOW);
  assert.deepEqual(again.packs[0], doc.packs[0]);
  // A different advert starts that role fresh.
  const changed = D.preparePacks(doc, { rolesText: doc.rolesText, resume: RESUME, adverts: { "frontend engineer": `${ADVERT}\nAlso Docker.` } }, NOW);
  assert.equal(changed.packs[0].edited, false);
  assert.deepEqual(changed.packs[0].reverted, []);
  assert.equal(changed.packs[0].submitted, false);
});

// ── Saved data ──────────────────────────────────────────────────────────────

test("old documents load unchanged", () => {
  const old = {
    rolesText: "Designer\nFrontend engineer",
    resume: RESUME,
    packs: [
      { role: "Designer", note: "Added a headline for Designer.", resume: `${RESUME}\n`, submitted: true },
      { role: "Frontend engineer", note: "Old note", resume: "Old tailored text", submitted: false },
    ],
  };
  const copy = JSON.parse(JSON.stringify(old));
  assert.deepEqual(D.normalizeDoc(copy), old);
  assert.deepEqual(copy, old, "not mutated");
  for (const pack of D.normalizeDoc(old).packs) assert.equal(D.isReviewable(pack), false);
  // Old packs are not touched by the new actions; the tick still works.
  assert.deepEqual(D.setChange(old, "Designer", "headline", false), old);
  assert.deepEqual(D.editText(old, "Designer", "x"), old);
  assert.equal(D.setSubmitted(old, "Frontend engineer", true).packs[1].submitted, true);
  assert.deepEqual(D.advertsOf(old), {});
  // Missing or broken fields fall back; broken packs are skipped as before.
  assert.deepEqual(D.normalizeDoc({ packs: [null, { role: 1 }, { role: "X", resume: "Y" }] }), { rolesText: "", resume: "", packs: [{ role: "X", resume: "Y" }] });
  assert.deepEqual(D.normalizeDoc(null), D.FALLBACK);
  // Preparing an old document again keeps the tick when the resume is the same.
  const upgraded = D.preparePacks(old, { rolesText: old.rolesText, resume: RESUME, adverts: {} }, NOW);
  assert.equal(upgraded.packs[0].submitted, true);
  assert.equal(upgraded.packs[0].v, 2);
});

test("new documents round-trip through JSON", () => {
  const doc = D.setChange(D.preparePacks(D.FALLBACK, { rolesText: "Frontend Engineer", resume: RESUME, adverts: { "frontend engineer": ADVERT } }, NOW), "Frontend Engineer", "headline", false, NOW);
  assert.deepEqual(D.normalizeDoc(JSON.parse(JSON.stringify(doc))), doc);
});

test("size: six long adverts and a long resume fit Apply's limit", () => {
  const resume = `Ada Example\n${"- Built React dashboards for clinics with SQL and Python, and wrote the docs. ".repeat(230)}`.slice(0, D.MAX_RESUME);
  const advert = `- 5+ years of experience with React, SQL, Python and Figma. "Quoted" text.\n`.repeat(200).slice(0, D.MAX_ADVERT);
  const roles = ["Analyst", "Engineer", "Designer", "Nurse", "Teacher", "Manager"];
  let doc = D.preparePacks(D.FALLBACK, { rolesText: roles.join("\n"), resume, adverts: Object.fromEntries(roles.map((r) => [r.toLowerCase(), advert])) }, NOW);
  for (const role of roles) doc = D.editText(doc, role, `${doc.packs[0].resume} edited`);
  const size = JSON.stringify(doc).length;
  assert.ok(size > 100_000, `the old 100,000 default would refuse this (${size})`);
  assert.ok(size < docLimit("apply"), `${size} < ${docLimit("apply")}`);
  assert.equal(docLimit("apply"), 300_000);
});
