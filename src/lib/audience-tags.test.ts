import { test } from "node:test";
import assert from "node:assert/strict";
import { KITS } from "./kits.ts";
import { FIELD_TAGS, GENERAL_APPS, TAG_OVERRIDES } from "./audience-tags.ts";
import { defaultTagOf, isSection, isTag, parseTags } from "./sections.ts";

const BUILT_IN = ["scratch","split", "ledger", "invoice", "glyph", "contrast", "compressor", "planner", "apply", "tasks", "cycle", "study", "write"];
const SLUGS = new Set([...BUILT_IN, ...KITS.map((kit) => kit.slug)]);

test("every override names a real app and real tags", () => {
  for (const [slug, tags] of Object.entries(TAG_OVERRIDES)) {
    assert.ok(SLUGS.has(slug), `unknown app ${slug}`);
    assert.ok(tags.length > 0, `${slug} has no tags`);
    for (const tag of tags) assert.ok(isTag(tag), `${slug}: unknown tag ${tag}`);
  }
});

test("every kit gets at least one tag", () => {
  for (const kit of KITS) {
    assert.ok(TAG_OVERRIDES[kit.slug] || defaultTagOf(kit.section), `${kit.slug} has no tag`);
  }
});

test("general apps are real and carry their own tags", () => {
  for (const slug of GENERAL_APPS) {
    assert.ok(SLUGS.has(slug), `unknown app ${slug}`);
    assert.ok(TAG_OVERRIDES[slug]?.length, `${slug} is general but only has its section's tag`);
  }
});

test("Remind is found under Everyday, Professionals and Students, not only Developers", () => {
  assert.ok(GENERAL_APPS.has("tasks"));
  for (const tag of ["everyday", "professionals", "students"] as const) {
    assert.ok(TAG_OVERRIDES.tasks.includes(tag), `Remind is missing ${tag}`);
  }
});

test("Quote and Proposal live inside Invoice, which keeps the business and professional tags", () => {
  for (const slug of ["quote", "proposal"]) {
    assert.ok(!SLUGS.has(slug), `${slug} is still a separate app`);
    assert.equal(TAG_OVERRIDES[slug], undefined, `${slug} still has its own tags`);
  }
  assert.deepEqual(TAG_OVERRIDES.invoice, ["business", "professionals"]);
});

test("apps merged into another app carry no tags of their own", () => {
  for (const slug of ["budget", "pocket", "client-terms", "price-list", "produce", "qr-menu"]) {
    assert.ok(!SLUGS.has(slug), `${slug} should have left the catalogue`);
    assert.equal(TAG_OVERRIDES[slug], undefined, `${slug} still has tags`);
  }
});

test("the Study space holds the eight study apps, and is shelved under their subjects", () => {
  for (const slug of ["anatomy", "clinic-quiz", "law-drill", "quiz-maker", "lab-notes", "citations", "legal-cite", "formula-sheet"]) {
    assert.ok(!SLUGS.has(slug), `${slug} should have left the catalogue`);
    assert.equal(TAG_OVERRIDES[slug], undefined, `${slug} still has tags`);
  }
  assert.deepEqual(TAG_OVERRIDES.study, ["students", "professionals"]);
  assert.ok(!GENERAL_APPS.has("study"), "a subject app, not a general one");
  for (const section of FIELD_TAGS.study) assert.ok(isSection(section), `unknown subject ${section}`);
  for (const section of ["medicine", "law", "arts", "engineering", "teaching"]) assert.ok(FIELD_TAGS.study.includes(section), section);
});

test("the Writing studio holds the 15 AI writing apps, for every audience and their subjects", () => {
  const modes = ["cold-email", "ad-copy", "captions", "listing", "letters", "lesson", "remarks", "outliner", "digest", "explainer", "bug-scan", "case-brief", "contract-scan", "soap-note", "readme"];
  for (const slug of modes) {
    assert.ok(!SLUGS.has(slug), `${slug} should have left the catalogue`);
    assert.equal(TAG_OVERRIDES[slug], undefined, `${slug} still has tags`);
  }
  assert.deepEqual(TAG_OVERRIDES.write, ["business", "professionals", "students", "everyday"]);
  assert.ok(!GENERAL_APPS.has("write"), "listed on the subject shelves its modes came from");
  for (const section of FIELD_TAGS.write) assert.ok(isSection(section), `unknown subject ${section}`);
  for (const section of ["law", "computing", "arts", "teaching", "clinic", "developers", "practice"]) assert.ok(FIELD_TAGS.write.includes(section), section);
});

test("stored tags parse back cleanly", () => {
  assert.deepEqual(parseTags("everyday, students,bogus,students"), ["students", "everyday"]);
  assert.deepEqual(parseTags(null), []);
});
