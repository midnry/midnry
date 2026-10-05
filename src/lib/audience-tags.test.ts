import { test } from "node:test";
import assert from "node:assert/strict";
import { KITS } from "./kits.ts";
import { TAG_OVERRIDES } from "./audience-tags.ts";
import { defaultTagOf, isTag, parseTags } from "./sections.ts";

const BUILT_IN = ["scratch", "pulse", "split", "ledger", "board", "invoice", "glyph", "habits", "contrast", "compressor", "planner", "apply", "tasks", "cycle"];
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

test("stored tags parse back cleanly", () => {
  assert.deepEqual(parseTags("everyday, students,bogus,students"), ["students", "everyday"]);
  assert.deepEqual(parseTags(null), []);
});
