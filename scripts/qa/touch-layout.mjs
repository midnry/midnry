// Touch layout editor (Settings → Controls → Edit touch layout) on a phone:
// drags the fire button to a free spot and once onto the jump button (red,
// snaps back), presses Done, reloads into a Last Signal match and checks the
// saved spot is applied, then rotates to landscape and checks that layout is
// independent (its own edit, portrait untouched).
//   node scripts/qa/touch-layout.mjs   (dev server on :8080; slow software GL)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
mkdirSync("screenshots/qa/touch", { recursive: true });
const shot = (name) => p.screenshot({ path: `screenshots/qa/touch/${name}.png` });
const errs = [],
  fails = [];
const ok = (c, m) => (console.log(`${c ? "PASS" : "FAIL"} ${m}`), c || fails.push(m));
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
// A returning player (no quick-start cards); the saved layout starts empty
// once per browser, so the reload later keeps what the test saved.
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true }));
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  if (!sessionStorage.getItem("touch-layout-qa")) {
    localStorage.removeItem("midnry-outpost-touch-layout");
    sessionStorage.setItem("touch-layout-qa", "1");
  }
});
const lobby = async () => {
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 240000 });
  await p.waitForTimeout(800);
};
// Settings opens from the lobby nav or the pause card; the editor button sits in Controls.
const openEditor = async () => {
  const go = p.locator('[data-go="settings"]:visible').first();
  await go.click({ timeout: 60000 });
  await p.waitForTimeout(500);
  const edit = p.locator(".mf-layoutopen");
  if (!(await edit.isVisible())) {
    for (const tab of await p.locator(".mf-settingsnav button").all()) {
      await tab.click();
      await p.waitForTimeout(250);
      if (await edit.isVisible()) break;
    }
  }
  ok(await edit.isVisible(), "Edit touch layout is shown under the touch controls settings");
  await edit.click();
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector(".mf-shell").classList.contains("mf-layout-editing") && !document.querySelector(".mf-settings").open), "the editor opens over a dimmed screen and Settings closes");
};
const rects = () =>
  p.evaluate(() => {
    const out = {};
    for (const [k, s] of Object.entries({ fire: ".mf-fire", reload: ".mf-reload", stance: ".mf-stance", jump: ".mf-jump", scope: ".mf-scope", stick: ".mf-stick", super: ".mf-super", health: ".mf-bottom .mf-stat:first-child", ammo: ".mf-bottom .mf-ammo", map: ".mf-top" })) {
      const r = document.querySelector(s)?.getBoundingClientRect();
      if (r && r.width) out[k] = { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
    }
    return out;
  });
// Real overlaps only: the default cluster sits 4–6px apart on purpose, while
// the editor asks for an 8px gap for anything the player places.
const crowded = (all, gap = 0) => {
  const names = Object.keys(all), bad = [];
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const a = all[names[i]], c = all[names[j]];
      if (a.l < c.r + gap && a.r + gap > c.l && a.t < c.b + gap && a.b + gap > c.t) bad.push(`${names[i]}×${names[j]}`);
    }
  return bad;
};
const vars = () =>
  p.evaluate(() => {
    const s = document.querySelector(".mf-shell").style;
    return { fireDx: s.getPropertyValue("--mf-fire-dx"), fireDy: s.getPropertyValue("--mf-fire-dy"), stickDx: s.getPropertyValue("--mf-stick-dx"), stickDy: s.getPropertyValue("--mf-stick-dy") };
  });
const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem("midnry-outpost-touch-layout") || "null"));
const mid = (r) => [(r.l + r.r) / 2, (r.t + r.b) / 2];
// A mouse drag (pointer events, like a desktop touch-screen laptop).
const mouseDrag = async ([x, y], [tx, ty]) => {
  await p.mouse.move(x, y);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(x + ((tx - x) * i) / 6, y + ((ty - y) * i) / 6);
  await p.waitForTimeout(150);
};
// A finger drag through Chromium's touch input, held until `release` is called.
const touchDragHold = async ([x, y], [tx, ty]) => {
  const cdp = await ctx.newCDPSession(p);
  const send = (type, px, py) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: px, y: py, id: 1 }] });
  await send("touchStart", x, y);
  for (let i = 1; i <= 6; i++) await send("touchMove", x + ((tx - x) * i) / 6, y + ((ty - y) * i) / 6);
  await p.waitForTimeout(200);
  return () => send("touchEnd", tx, ty);
};

await lobby();
await openEditor();
// The lobby hides the in-match buttons until a match starts; the editor shows
// them at their arena positions, so measure the defaults inside it.
const before = await rects();
console.log("default portrait", JSON.stringify(before));
ok(before.fire && before.stick && before.super && before.health, "the editor shows the touch controls and the HUD pieces they must not cover");
ok(crowded(before).length === 0, `default portrait layout keeps every control clear of the cards and the super button (${crowded(before).join(", ") || "none crowded"})`);
await shot("1-portrait-before");
// 1. Fire to a free spot straight above its cluster (above the jump button).
const fire0 = before.fire;
await mouseDrag(mid(fire0), [mid(fire0)[0], mid(fire0)[1] - 160]);
ok(await p.evaluate(() => document.querySelector(".mf-fire").classList.contains("mf-layout-dragging") && !document.querySelector(".mf-fire").classList.contains("mf-layout-invalid")), "a free spot shows the gold dragging outline, not the red one");
await p.mouse.up();
await p.waitForTimeout(200);
let r = await rects();
ok(Math.abs(r.fire.t - (fire0.t - 160)) <= 2 && Math.abs(r.fire.l - fire0.l) <= 2, `fire button moved up 160px (${JSON.stringify(r.fire)})`);
let v = await vars();
ok(v.fireDx === "0px" && v.fireDy === "160px", `the shell carries --mf-fire-dx/dy = ${v.fireDx}/${v.fireDy}`);
// 2. Fire dragged (by finger) onto the jump button: red while held, snaps back on release.
const release = await touchDragHold(mid(r.fire), mid(r.jump));
ok(await p.evaluate(() => document.querySelector(".mf-fire").classList.contains("mf-layout-invalid")), "dragging onto the jump button shows the red invalid state");
await shot("2-portrait-invalid-drag");
await release();
await p.waitForTimeout(200);
const back = await rects();
ok(Math.abs(back.fire.t - r.fire.t) <= 1 && Math.abs(back.fire.l - r.fire.l) <= 1, "releasing on an invalid spot snaps the button back");
// 3. A drag toward the bottom corner stops at the safe-area edge instead of leaving the screen.
await mouseDrag(mid(back.jump), [600, 1200]);
const clamped = await p.evaluate(() => document.querySelector(".mf-jump").getBoundingClientRect());
ok(clamped.right <= 390 - 4 + 0.5 && clamped.bottom <= 844 - 4 + 0.5, `a control cannot leave the safe area (jump at right ${Math.round(clamped.right)}, bottom ${Math.round(clamped.bottom)})`);
await p.mouse.up();
await p.waitForTimeout(150);
// That spot overlaps the reload button, so it snapped back too.
const afterClamp = await rects();
ok(Math.abs(afterClamp.jump.t - back.jump.t) <= 1, "the clamped spot overlapped Reload, so Jump snapped back");
await p.locator(".mf-layoutdone").click();
await p.waitForTimeout(400);
ok(await p.evaluate(() => !document.querySelector(".mf-shell").classList.contains("mf-layout-editing") && document.querySelector(".mf-settings").open), "Done closes the editor and returns to Settings");
let store = await saved();
ok(store?.portrait?.fire?.dx === 0 && store?.portrait?.fire?.dy === 160 && !store?.portrait?.jump, `portrait layout saved (${JSON.stringify(store)})`);
await p.locator(".mf-settingsclose").click();
// 4. Reload, start a Last Signal match, check the fire button sits at the saved spot in the real HUD.
await lobby();
v = await vars();
ok(v.fireDy === "160px", "the saved offset is applied on load");
await pickGame(p, "signal", { timeout: 60000 });
await p.waitForTimeout(800);
await play(p, { timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.running, null, { timeout: 180000 });
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  g.player.shieldUntil = 1e9;
});
await p.waitForTimeout(2500);
const match = await rects();
console.log("match portrait", JSON.stringify(match));
ok(Math.abs(match.fire.t - (fire0.t - 160)) <= 2, `in the match the fire button is 160px above its default (${JSON.stringify(match.fire)})`);
ok(crowded(match).length === 0, `nothing overlaps in the match HUD (${crowded(match).join(", ") || "none crowded"})`);
await shot("3-portrait-match-after-reload");
// 5. Landscape: its own layout. Nothing saved there yet, so the defaults show.
// Rotation: the editor notices through a ResizeObserver, delivered with the
// next rendered frame, and software GL frames here can take seconds.
const rotate = async (width, height) => {
  await p.setViewportSize({ width, height });
  const want = width > height ? "landscape" : "portrait";
  await p.waitForFunction((want) => document.querySelector("midnry-fps").engine.touchLayout.orientation === want, want, { timeout: 60000 });
  await p.waitForTimeout(300);
};
await rotate(844, 390);
v = await vars();
ok(v.fireDy === "" && v.fireDx === "", "rotating to landscape drops the portrait offsets (landscape has its own layout)");
const land = await rects();
console.log("default landscape", JSON.stringify(land));
ok(crowded(land).length === 0, `default landscape layout keeps every control clear (${crowded(land).join(", ") || "none crowded"})`);
// Pause, open Settings from the pause card and edit the landscape layout.
await p.locator(".mf-pause").click({ timeout: 30000 });
await p.waitForTimeout(600);
await openEditor();
ok(await p.evaluate(() => document.querySelector("midnry-fps").engine.running === false), "a match pauses while the layout is edited");
await shot("4-landscape-editing");
// The joystick 100px to the right (up would crowd the health card above it).
await mouseDrag(mid(land.stick), [mid(land.stick)[0] + 100, mid(land.stick)[1]]);
await p.mouse.up();
await p.waitForTimeout(200);
v = await vars();
ok(v.stickDx === "100px" && v.stickDy === "0px", `landscape joystick offsets ${v.stickDx}/${v.stickDy}`);
await shot("5-landscape-stick-moved");
await p.locator(".mf-layoutdone").click();
await p.waitForTimeout(300);
store = await saved();
ok(store?.landscape?.stick?.dx === 100 && store?.portrait?.fire?.dy === 160 && !store?.landscape?.fire, `landscape saved separately from portrait (${JSON.stringify(store)})`);
// 6. Reset clears only the current orientation.
await p.locator(".mf-layoutopen").click();
await p.waitForTimeout(300);
await p.locator(".mf-layoutreset").click();
await p.waitForTimeout(200);
store = await saved();
ok(Object.keys(store?.landscape || {}).length === 0 && store?.portrait?.fire?.dy === 160, "Reset clears the landscape layout and keeps portrait");
await p.locator(".mf-layoutdone").click();
await p.waitForTimeout(300);
await p.locator(".mf-settingsclose").click();
// Back to portrait: the fire offset returns.
await rotate(390, 844);
v = await vars();
ok(v.fireDy === "160px" && v.stickDx === "", `rotating back to portrait restores its layout (${JSON.stringify(v)})`);
console.log("page errors", errs);
ok(errs.length === 0, "no page errors");
await b.close();
console.log(fails.length ? `FAILED ${fails.length}` : "ALL PASS");
process.exit(fails.length ? 1 : 0);
