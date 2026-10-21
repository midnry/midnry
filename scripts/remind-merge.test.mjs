// Board, Pulse and Habits moved into Remind as Pass views. Remind stays free;
// the views open with Midnry Pass (or for admins); old links redirect; the old
// documents stay readable under their slugs with the Pass rule.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const V = await jiti.import("../src/lib/remind/pass-views.ts");
const { aliasOf, aliasesTo } = await jiti.import("../src/lib/app-aliases.ts");
const { APPS, getApp } = await jiti.import("../src/lib/catalog.ts");
const { PASS_APPS, PASS_FEATURES, PLAN_SUMMARY } = await jiti.import("../src/lib/plans.ts");
const { docTier } = await jiti.import("../src/lib/merged-docs.ts");

test("Remind stays free", () => {
  assert.equal(getApp("tasks")?.tier, "free");
});

test("Board, Focus and Habits open with the Pass or for an admin, and not otherwise", () => {
  assert.equal(V.passViewsOpen(false, false), false);
  assert.equal(V.passViewsOpen(true, false), true);
  assert.equal(V.passViewsOpen(false, true), true);
  assert.deepEqual(V.PASS_VIEW_KINDS, ["board", "focus", "habits"]);
  for (const kind of V.PASS_VIEW_KINDS) assert.ok(V.isPassView(kind));
  assert.equal(V.isPassView("today"), false);
  assert.equal(V.isPassView("toString"), false);
});

test("each Pass view reads the old app's document", () => {
  assert.equal(V.PASS_VIEWS.board.doc, "board");
  assert.equal(V.PASS_VIEWS.focus.doc, "pulse");
  assert.equal(V.PASS_VIEWS.habits.doc, "habits");
});

test("old documents keep the Pass rule on the server; Remind's own stays free", () => {
  for (const slug of ["board", "pulse", "habits"]) assert.equal(docTier(slug), "pass", slug);
  assert.equal(docTier("tasks"), "free");
  assert.equal(docTier("not-an-app"), undefined);
});

test("old links resolve to the right Remind view", () => {
  assert.deepEqual(aliasOf("board"), { to: "tasks", view: "board" });
  assert.deepEqual(aliasOf("pulse"), { to: "tasks", view: "focus" });
  assert.deepEqual(aliasOf("habits"), { to: "tasks", view: "habits" });
  assert.equal(aliasOf("tasks"), undefined);
  for (const old of ["board", "pulse", "habits"]) {
    const alias = aliasOf(old);
    assert.ok(getApp(alias.to), `${old} leads to a real app`);
    assert.equal(V.linkableView(alias.view), alias.view, `${old}'s view opens in Remind`);
    assert.ok(aliasesTo("tasks").includes(old));
  }
});

test("the merged apps left the catalogue and the counts follow", () => {
  for (const old of ["board", "pulse", "habits"]) assert.equal(getApp(old), undefined, old);
  assert.equal(PASS_APPS.length, APPS.filter((app) => app.tier === "pass").length);
  assert.match(PLAN_SUMMARY, new RegExp(`adds ${PASS_APPS.length} more tools`));
  assert.match(PASS_FEATURES.tasks, /Board/);
  assert.match(PASS_FEATURES.tasks, /Focus timer/);
  assert.match(PASS_FEATURES.tasks, /Habits/);
});

test("?view= accepts a short word and nothing else", () => {
  assert.equal(V.viewParam("board"), "board");
  assert.equal(V.viewParam("qr"), "qr");
  assert.equal(V.viewParam("BOARD"), undefined);
  assert.equal(V.viewParam("<script>"), undefined);
  assert.equal(V.viewParam(3), undefined);
  assert.equal(V.linkableView("project"), undefined);
});
