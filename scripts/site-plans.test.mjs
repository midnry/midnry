// The site's one plan description (src/lib/plans.ts) must agree with the
// access rule (canOpenApp) for every app in the catalogue.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { FREE_APPS, PASS_APPS, PLAN_SUMMARY, accessLabel } = await jiti.import("../src/lib/plans.ts");
const { APPS } = await jiti.import("../src/lib/catalog.ts");
const { canOpenApp } = await jiti.import("../src/lib/access.ts");

test("the plan description matches the access rule", () => {
  assert.equal(FREE_APPS.length + PASS_APPS.length, APPS.length);
  for (const app of FREE_APPS) assert.equal(canOpenApp(app, false), true, app.slug);
  for (const app of PASS_APPS) assert.equal(canOpenApp(app, false), false, app.slug);
  assert.match(PLAN_SUMMARY, new RegExp(`^${FREE_APPS.length} apps are free`));
  assert.equal(accessLabel("free"), "Free with an account");
  assert.equal(accessLabel("pass"), "Included with Midnry Pass");
});

test("the Pass finish named on the site is the game's Pass finish", async () => {
  const { PASS_EXTRAS } = await jiti.import("../src/lib/plans.ts");
  const { FINISHES } = await import("../public/games/outpost-finishes.js");
  const passFinishes = FINISHES.filter((finish) => finish.kind === "pass");
  assert.deepEqual(passFinishes.map((finish) => finish.name), [PASS_EXTRAS.outpostFinish.name]);
  assert.deepEqual(passFinishes[0].colors, [...PASS_EXTRAS.outpostFinish.colors]);
});
