// Sound mix: the audio buses, their settings levels, ducking under gunfire
// and alerts, the Combat sound intensity modes, mute, and the Settings →
// Sound controls on a phone. Headless, so it inspects the audio graph through
// FieldAudio.mixState() rather than listening. The software GPU draws the
// match at about one frame a second, and the cues are frame-driven, so the
// ducking checks sample the graph every 20 ms for as long as it takes to
// see a trigger come and go.
//   node scripts/qa/sound-mix.mjs   (dev server on :8080)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";

const S = "screenshots/qa/sound";
mkdirSync(S, { recursive: true });
const URL = "http://127.0.0.1:8080/games/outpost-zero.html";
const BUSES = ["weapons", "hits", "alerts", "ui", "world", "music", "voice"];
const fails = [];
const ok = (c, m) => (console.log(`${c ? "PASS" : "FAIL"} ${m}`), c || fails.push(m));
const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const watch = (page, errs) => {
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
};
const engine = () => document.querySelector("midnry-fps").engine;

// ---------------------------------------------------------------- a match
{
  const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(),
    errs = [];
  watch(p, errs);
  // Known slider positions so the expected bus levels are exact; the
  // performance preset so the software GPU draws as many frames as it can.
  await p.addInitScript(() => {
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
    localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset: "performance", options: { adaptive: false } }));
    localStorage.setItem("midnry-outpost-audio", JSON.stringify({ volume: 0.5, muted: false, music: 0.6, effects: 0.8, alerts: 1, combat: "full" }));
  });
  await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
  await pickGame(p, "signal", { timeout: 60000 });
  await play(p, { timeout: 60000 });
  await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000 });
  // The Play click was the user gesture that unlocks audio.
  await p.waitForFunction(() => document.querySelector("midnry-fps").engine.retention.audio.ctx?.state === "running", null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const mix = () => p.evaluate(() => document.querySelector("midnry-fps").engine.retention.audio.mixState());
  const m0 = await mix();
  ok(m0.running, "audio context is running after the Play gesture (not before)");
  ok(BUSES.every((bus) => m0.buses[bus] && m0.buses[bus].gain != null), `all seven buses exist (${Object.keys(m0.buses).join(", ")})`);
  ok(near(m0.masterLevel, 0.5 * 1.7) && near(m0.master, 0.85), `master = volume × loudness (${m0.master?.toFixed(3)})`);
  ok(near(m0.buses.weapons.level, 0.8) && near(m0.buses.world.level, 0.64) && near(m0.buses.ui.level, 0.68), "Effects 80% scales weapons, world and ui");
  ok(near(m0.buses.music.level, 0.33), `Music 60% × 0.55 trim = 0.33 (${m0.buses.music.level.toFixed(3)})`);
  ok(near(m0.buses.alerts.level, 1.25) && near(m0.buses.voice.level, 1), "alerts and voice are not touched by Effects");
  const settled = BUSES.filter((bus) => m0.buses[bus].duckDb === 0 && !near(m0.buses[bus].gain, m0.buses[bus].level, 0.03));
  ok(settled.length === 0, `live bus gains match their levels when nothing ducks (${settled.join(", ") || "all settled"})`);
  ok(Array.isArray(m0.ducking), "mixState reports active ducking triggers");

  // Sample the graph every 20 ms while an action runs in the game, until
  // `trigger` has been seen active and then released (or `ms` is up).
  //  fire   : the fire input → sim shoot → shotAt → retention observe →
  //           audio.shot on the weapons bus (the game's own path).
  //  damage : a rival takes a life → the lost-life cue on the alerts bus.
  const sample = (action, trigger, ms) =>
    p.evaluate(
      async ([action, trigger, ms]) => {
        const g = document.querySelector("midnry-fps").engine,
          a = g.retention.audio,
          me = () => g.arena.entities.find((e) => e.id === g.selfId),
          out = [],
          t0 = performance.now();
        if (action === "fire") g.firing = true;
        if (action === "damage") {
          const self = me(),
            rival = g.arena.entities.find((e) => e !== self && e.hp > 0);
          self.shieldUntil = 0;
          g.arena.damage(self, 999, rival);
        }
        let seen = false;
        while (performance.now() - t0 < ms) {
          const m = a.mixState(),
            on = m.ducking.includes(trigger);
          out.push({ t: Math.round(performance.now() - t0), ctx: +a.ctx.currentTime.toFixed(3), holds: { ...a.holds }, music: m.buses.music.gain, world: m.buses.world.gain, weapons: m.buses.weapons.gain, ducking: m.ducking, voices: m.voices, shotAt: me()?.shotAt, on, running: g.running, hp: Math.round(me()?.hp ?? -1) });
          seen ||= on;
          // Stop once the trigger has come and gone again (a few samples
          // after, so the release ramp shows), unless we are watching for
          // it never to appear.
          if (seen && !on && out.filter((s) => s.on).length >= 3 && out.slice(-20).every((s) => !s.on)) break;
          await new Promise((r) => setTimeout(r, 20));
        }
        g.firing = false;
        return out;
      },
      [action, trigger, ms],
    );
  const burst = await sample("fire", "weapons", 25000);
  const shots = new Set(burst.map((s) => s.shotAt)).size - 1,
    musicMin = Math.min(...burst.map((s) => s.music)),
    worldMin = Math.min(...burst.map((s) => s.world)),
    ducked = burst.filter((s) => s.on).length;
  ok(shots > 0, `the player fired (${shots} shots registered over ${burst.length} samples)`);
  ok(ducked > 0, `weapons trigger is active during the burst (${ducked} samples)`);
  ok(musicMin < m0.buses.music.level * 0.72 && musicMin > m0.buses.music.level * 0.5, `music dips about 4 dB under gunfire (${musicMin.toFixed(3)} of ${m0.buses.music.level.toFixed(3)})`);
  ok(worldMin < m0.buses.world.level * 0.8 && worldMin > m0.buses.world.level * 0.6, `world dips about 3 dB under gunfire (${worldMin.toFixed(3)} of ${m0.buses.world.level.toFixed(3)})`);
  await p.waitForTimeout(1600);
  const m1 = await mix();
  ok(!m1.ducking.includes("weapons") && near(m1.buses.music.gain, m1.buses.music.level, 0.02), `music recovers after the burst (${m1.buses.music.gain.toFixed(3)} → ${m1.buses.music.level.toFixed(3)})`);

  // An alert through the game's own path: losing a life plays the alerts
  // cue (outpost-zero.html). Alerts pull music 6 dB, world 5 dB, weapons 3 dB.
  const alert = await sample("damage", "alerts", 40000);
  const alerted = alert.filter((s) => s.on);
  const dump = (name, rows) => console.log(`  ${name}: ` + JSON.stringify(rows.map((s) => ({ t: s.t, ctx: s.ctx, holds: s.holds, music: +s.music.toFixed(3), weapons: +s.weapons.toFixed(3), on: s.on, running: s.running, hp: s.hp }))));
  if (!alerted.length) dump("alert samples of note", alert.filter((s, i) => s.on || s.music < 0.3 || s.weapons < 0.79 || (i && s.t - alert[i - 1].t > 200)).slice(0, 12));
  ok(alerted.length > 0, `the lost-life cue activates the alerts trigger (${alerted.length} samples)`);
  const aMusic = Math.min(...alert.map((s) => s.music)),
    aWeapons = Math.min(...alert.map((s) => s.weapons));
  ok(aMusic < m0.buses.music.level * 0.6, `music dips about 6 dB under an alert (${aMusic.toFixed(3)} of ${m0.buses.music.level.toFixed(3)})`);
  ok(aWeapons < m0.buses.weapons.level * 0.8, `weapons dip about 3 dB under an alert (${aWeapons.toFixed(3)} of ${m0.buses.weapons.level.toFixed(3)})`);
  // Let the round resume after the life-lost hold before the next checks.
  await p.waitForFunction(() => !document.querySelector(".mf-lifelost.mf-on") && document.querySelector("midnry-fps").engine.running, null, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(800);

  // Combat sound intensity: Off silences weapons and hits, keeps alerts.
  const off = await p.evaluate(() => {
    const a = document.querySelector("midnry-fps").engine.retention.audio;
    a.combat = "off";
    a.level();
    const m = a.mixState(),
      v0 = a.voices;
    // Same calls the game makes: a shot must not even start a voice; an
    // alert tone must.
    a.shot("carbine", 0, 1, 10000, true);
    const v1 = a.voices;
    a.tone(440, 0.3, 0.12, 0, "triangle", 440, "alerts");
    const v2 = a.voices;
    return { levels: Object.fromEntries(Object.entries(m.buses).map(([k, v]) => [k, v.level])), shotVoices: v1 - v0, alertVoices: v2 - v1, saved: JSON.parse(localStorage.getItem("midnry-outpost-audio")).combat };
  });
  ok(off.levels.weapons === 0 && off.levels.hits === 0, "Off: weapons and hits buses sit at zero");
  ok(near(off.levels.alerts, 1.25) && near(off.levels.voice, 1) && near(off.levels.world, 0.64), "Off: alerts, voice and world keep their levels");
  ok(off.shotVoices === 0 && off.alertVoices === 1, `Off: a shot starts no voice, an alert does (${off.shotVoices}, ${off.alertVoices})`);
  ok(off.saved === "off", "Off is saved with the other sound settings");
  await p.waitForTimeout(600);
  // Fire again with combat Off: the trigger must never show up, so this
  // runs its full window (long enough for several frames) rather than
  // stopping early.
  const offBurst = await sample("fire", "weapons", 12000);
  const offShots = new Set(offBurst.map((s) => s.shotAt)).size - 1;
  ok(offShots > 0 && !offBurst.some((s) => s.on) && offBurst.every((s) => s.weapons < 0.001), `Off: firing (${offShots} shots) keeps the weapons bus silent and never ducks the music`);
  if (offBurst.some((s) => s.on || s.weapons >= 0.001)) dump("off samples of note", offBurst.filter((s) => s.on || s.weapons >= 0.001).slice(0, 12));
  const reduced = await p.evaluate(() => {
    const a = document.querySelector("midnry-fps").engine.retention.audio;
    a.combat = "reduced";
    a.level();
    const m = a.mixState();
    return { weapons: m.buses.weapons.level, hits: m.buses.hits.level };
  });
  ok(near(reduced.weapons, 0.4) && near(reduced.hits, 0.46), `Reduced halves weapons and hits (${reduced.weapons.toFixed(2)}, ${reduced.hits.toFixed(2)})`);

  // Mute still covers everything (master), and comes back.
  const muted = await p.evaluate(async () => {
    const a = document.querySelector("midnry-fps").engine.retention.audio;
    a.combat = "full";
    a.setSound(false);
    await new Promise((r) => setTimeout(r, 250));
    const m = a.mixState();
    a.setSound(true);
    await new Promise((r) => setTimeout(r, 250));
    return { off: m.master, on: a.mixState().master, soundOn: a.soundOn(), voice: m.buses.voice.gain };
  });
  ok(muted.off < 0.01 && muted.on > 0.8 && muted.soundOn, `mute drops master to ${muted.off.toFixed(3)} and restores ${muted.on.toFixed(3)}`);
  ok(near(muted.voice, 1), "voice bus stays at level under mute: master is the one mute for everything");
  ok(errs.length === 0, `no page or console errors in the match (${errs.join(" | ")})`);
  await p.context().close();
}

// ------------------------------------------------- Settings → Sound, phone
{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(),
    errs = [];
  watch(p, errs);
  await p.addInitScript(() => localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true })));
  await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(() => document.querySelector(".mf-modal.mf-lobby") && document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, { timeout: 240000 });
  await p.locator('[data-go="settings"]:visible').first().click({ timeout: 60000 });
  await p.waitForTimeout(600);
  const combat = p.locator(".mf-combatsound");
  if (!(await combat.isVisible())) {
    for (const tab of await p.locator(".mf-settingsnav button").all()) {
      await tab.click();
      await p.waitForTimeout(250);
      if (await combat.isVisible()) break;
    }
  }
  const tabs = await p.locator(".mf-settingsnav button").allTextContents();
  ok(tabs.some((t) => /sound/i.test(t)), `Settings has a Sound tab (${tabs.join(" · ")})`);
  const shown = {};
  for (const [name, selector] of [["Master", ".mf-volume"], ["Effects", ".mf-effects"], ["Music", ".mf-music"], ["Alerts", ".mf-alerts"], ["Combat intensity", ".mf-combatsound"], ["Mute", ".mf-mute"]])
    shown[name] = await p.locator(selector).isVisible();
  ok(Object.values(shown).every(Boolean), `Sound controls shown at 390 px: ${JSON.stringify(shown)}`);
  ok(await p.locator(".mf-settings").evaluate((e) => e.scrollWidth <= e.clientWidth + 1), "no horizontal overflow in the Settings dialog");
  await p.locator(".mf-volume").scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${S}/settings-sound-390.png` });
  await p.locator(".mf-effects").fill("50");
  await p.locator(".mf-alerts").fill("70");
  await combat.selectOption("reduced");
  const applied = await p.evaluate(() => {
    const a = document.querySelector("midnry-fps").engine.retention.audio,
      m = a.mixState();
    return { saved: JSON.parse(localStorage.getItem("midnry-outpost-audio")), weapons: m.buses.weapons.level, alerts: m.buses.alerts.level, hits: m.buses.hits.level };
  });
  ok(applied.saved.effects === 0.5 && applied.saved.alerts === 0.7 && applied.saved.combat === "reduced", `sliders and intensity are saved in midnry-outpost-audio (${JSON.stringify(applied.saved)})`);
  ok(near(applied.weapons, 0.25) && near(applied.alerts, 0.875) && near(applied.hits, 0.2875), `levels follow the controls: weapons ${applied.weapons.toFixed(3)}, alerts ${applied.alerts.toFixed(3)}`);
  await combat.selectOption("off");
  const offLevels = await p.evaluate(() => {
    const m = document.querySelector("midnry-fps").engine.retention.audio.mixState();
    return [m.buses.weapons.level, m.buses.hits.level, m.buses.alerts.level];
  });
  ok(offLevels[0] === 0 && offLevels[1] === 0 && offLevels[2] > 0, "Off from the control silences weapons and hits, keeps alerts");
  await combat.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${S}/settings-sound-390-off.png` });
  // Master and mute through the real controls, saved in the same record;
  // then exiting the component closes the context and disposes the buses.
  await p.locator(".mf-volume").fill("25");
  await p.locator(".mf-mute").check();
  const master = await p.evaluate(() => {
    const a = document.querySelector("midnry-fps").engine.retention.audio,
      saved = JSON.parse(localStorage.getItem("midnry-outpost-audio"));
    return { volume: a.volume, muted: a.muted, soundOn: a.soundOn(), saved: { volume: saved.volume, muted: saved.muted }, master: a.mixState().masterLevel };
  });
  ok(master.volume === 0.25 && master.muted && !master.soundOn && master.saved.volume === 0.25 && master.saved.muted && master.master === 0, `master slider and mute still work and save (${JSON.stringify(master)})`);
  const torn = await p.evaluate(async () => {
    const el = document.querySelector("midnry-fps"),
      a = el.engine.retention.audio,
      ctx = a.ctx,
      state = ctx?.state;
    el.engine.destroy();
    for (let i = 0; i < 50 && ctx.state !== "closed"; i++) await new Promise((r) => setTimeout(r, 100));
    return { before: state, after: ctx.state, buses: a.buses, keepAlive: a.keepAlive.length, timer: a.duckTimer };
  });
  ok(torn.before === "running" && torn.after === "closed" && torn.buses === null && torn.keepAlive === 0 && torn.timer === 0, `exit closes the audio context and disposes the buses (${JSON.stringify(torn)})`);
  ok(errs.length === 0, `no page or console errors in Settings (${errs.join(" | ")})`);
  await p.context().close();
}
await b.close();
console.log(fails.length ? `${fails.length} FAILED` : "ALL PASS");
process.exit(fails.length ? 1 : 0);
