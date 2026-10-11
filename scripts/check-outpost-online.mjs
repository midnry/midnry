import { chromium, request } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
const api = await request.newContext({ baseURL: base });
const sessions = [];
async function call(body, status = 200) {
  const r = await api.post("/api/games/outpost", { data: body });
  const data = await r.json();
  assert.equal(r.status(), status, data.error);
  return data;
}
const auth = (m, op, extra = {}) => ({ op, code: m.code, id: m.id, token: m.token, ...extra });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const host = await call({ op: "create", mode: "duo" });
  sessions.push(host);
  const joins = await Promise.all(
    Array.from({ length: 7 }, () => call({ op: "join", code: host.code })),
  );
  sessions.push(...joins);
  const guest = joins[0];
  assert.equal(guest.members.length >= 2, true);
  await call({ op: "join", code: host.code }, 409);
  await call(auth(guest, "start"), 403);
  await call(auth(guest, "settings", { mapId: "estate" }), 403);
  await call(auth(host, "settings", { mapId: "__proto__" }), 400);
  await call(auth(guest, "loadout", { weapon: "toString" }), 400);
  await call(auth(host, "settings", { mapId: "testblock" }));
  await call(auth(guest, "loadout", { weapon: "scatter" }));
  await call({ ...auth(host, "poll"), token: "0".repeat(48) }, 401);
  await call(auth(joins[1], "team", { team: 0 }), 409);
  const started = await call(auth(host, "start"));
  assert.equal(started.arena.entities.length, 8);
  assert.equal(started.arena.entities.filter((e) => e.bot).length, 0);
  await call({ op: "join", code: host.code }, 409);
  assert.equal(started.arena.mapId, "testblock");
  assert.equal(started.arena.entities.find((e) => e.id === guest.id).weapon, "scatter");
  await call(auth(host, "settings", { mapId: "outpost" }), 409);
  await call(auth(guest, "loadout", { weapon: "carbine" }), 409);
  const self = started.arena.entities.find((e) => e.id === host.id);
  const checked = await call(
    auth(host, "poll", {
      seq: 1,
      input: { x: 999, y: 999, hp: 999, damage: 999, forward: 0, aim: self.a },
    }),
  );
  const actual = checked.arena.entities.find((e) => e.id === host.id);
  assert.equal(actual.hp, 100);
  assert.equal(actual.damage, 40);
  assert.equal(actual.x, self.x);
  assert.ok(!JSON.stringify(checked).includes('"hash"'));
  assert.ok(!JSON.stringify(checked).includes(host.token));
  console.log("API permission checks passed");
  const transferred = await call(auth(host, "leave"));
  assert.notEqual(transferred.host, host.id);
  // Separate desktop and mobile sessions exercise the actual room UI and input.
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const errors = [];
  for (const p of [desktop, mobile]) p.on("pageerror", (e) => errors.push(e.message));
  console.log("Opening desktop room");
  await desktop.goto(base + "/games/outpost-zero.html");
  await desktop.locator('[data-mode="duo"]').click();
  await desktop.locator(".mf-mapselect").selectOption("skyport");
  await desktop.locator(".mf-weaponselect").selectOption("rocket");
  await desktop.locator("summary").click();
  await desktop.locator(".mf-create").click();
  await desktop.waitForFunction(() => document.querySelector("midnry-fps").engine.online?.code);
  console.log("Desktop room created");
  const code = await desktop.locator(".mf-roomcode").innerText();
  await mobile.goto(base + "/games/outpost-zero.html?room=" + code);
  assert.ok(await mobile.locator("details").evaluate((e) => e.open));
  assert.equal(await mobile.locator(".mf-codeinput").inputValue(), code);
  await mobile.locator(".mf-weaponselect").selectOption("venom");
  await mobile.locator(".mf-join").click();
  await mobile.waitForFunction(
    () => document.querySelector("midnry-fps").engine.online?.members.length === 2,
  );
  await desktop.waitForFunction(
    () => document.querySelector("midnry-fps").engine.online?.members.length === 2,
  );
  assert.equal(await mobile.locator(".mf-start").isDisabled(), true);
  assert.equal(await mobile.locator(".mf-mapselect").inputValue(), "skyport");
  assert.equal(await mobile.locator(".mf-mapselect").isDisabled(), true);
  await desktop.locator(".mf-mapselect").selectOption("freight");
  await mobile.waitForFunction(
    () => document.querySelector("midnry-fps").engine.mapId === "freight",
  );
  console.log("Both players joined");
  await desktop.locator(".mf-start").click();
  for (const p of [desktop, mobile])
    await p.waitForFunction(
      () => document.querySelector("midnry-fps").engine.online?.phase === "playing",
    );
  console.log("Both clients started");
  const one = await desktop.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    return {
      id: g.selfId,
      team: g.player.team,
      weapon: g.player.weapon,
      mag: g.player.ammo,
      mapId: g.arena.mapId,
      ids: g.arena.entities.map((e) => e.id),
    };
  });
  const two = await mobile.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    return {
      id: g.selfId,
      team: g.player.team,
      weapon: g.player.weapon,
      mag: g.player.ammo,
      mapId: g.arena.mapId,
      ids: g.arena.entities.map((e) => e.id),
    };
  });
  assert.equal(one.weapon, "rocket");
  assert.equal(two.weapon, "venom");
  assert.equal(one.mapId, "freight");
  assert.equal(two.mapId, "freight");
  assert.notEqual(one.id, two.id);
  assert.equal(one.team, two.team);
  assert.deepEqual(one.ids, two.ids);
  await mobile.locator(".mf-fire").tap();
  await mobile.waitForFunction(() => document.querySelector("midnry-fps").engine.player.ammo < 9);
  await desktop.waitForFunction(
    (id) =>
      document.querySelector("midnry-fps").engine.arena.entities.find((e) => e.id === id).ammo < 9,
    two.id,
  );
  await desktop.evaluate(() => document.querySelector("midnry-fps").engine.pause());
  const before = await desktop.evaluate(() => document.querySelector("midnry-fps").engine.time);
  await desktop.waitForTimeout(400);
  assert.ok(
    await desktop.evaluate((t) => document.querySelector("midnry-fps").engine.time > t, before),
  );
  mkdirSync("/workspace/screenshots", { recursive: true });
  await desktop.screenshot({ path: "/workspace/screenshots/outpost-online-desktop.png" });
  await mobile.evaluate(() => document.querySelector("midnry-fps").engine.pause());
  await mobile.screenshot({ path: "/workspace/screenshots/outpost-online-mobile.png" });
  await desktop.locator(".mf-leave").click();
  await mobile.waitForFunction(() => {
    const g = document.querySelector("midnry-fps").engine;
    return g.online.host === g.selfId;
  });
  await mobile.locator(".mf-leave").click();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      permissions: "passed",
      concurrentEightPlayerLobby: "passed",
      serverAuthority: "passed",
      desktopMobileRoom: "passed",
      inputReplication: "passed",
      hostTransfer: "passed",
      onlineMenuContinuity: "passed",
      runtimeErrors: errors,
    }),
  );
} catch (error) {
  for (const page of browser.contexts().flatMap((c) => c.pages()))
    console.error(
      await page
        .evaluate(() => {
          const g = document.querySelector("midnry-fps")?.engine;
          return {
            url: location.href,
            phase: g?.online?.phase,
            running: g?.running,
            status: document.querySelector(".mf-netstatus")?.textContent,
            ammo: g?.player?.ammo,
          };
        })
        .catch(() => ({})),
    );
  throw error;
} finally {
  for (const m of sessions)
    await api.post("/api/games/outpost", { data: auth(m, "leave") }).catch(() => {});
  await browser.close();
  await api.dispose();
}
