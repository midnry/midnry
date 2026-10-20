// Renders the Last Signal battle music offline (4 bars at each intensity:
// stalk, hunt, fight) to screenshots/qa/music-preview.wav and prints the
// loudness of each part. Then checks it plays in a real round.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("screenshots/qa", { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() =>
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })),
);
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
const out = await p.evaluate(async () => {
  const { BattleMusic } = await import("/games/outpost-music.js");
  const rate = 44100,
    bars = 4,
    seconds = (60 / 132) * 4 * bars * 3 + 1;
  const ctx = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate);
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  gain.connect(ctx.destination);
  BattleMusic.score(ctx, gain, bars);
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0),
    part = Math.floor(rate * (60 / 132) * 4 * bars),
    rms = [0, 1, 2].map((k) => {
      let s = 0;
      for (let i = k * part; i < (k + 1) * part; i++) s += L[i] * L[i];
      return Math.sqrt(s / part).toFixed(3);
    });
  let peak = 0;
  for (const v of L) peak = Math.max(peak, Math.abs(v));
  // 16-bit WAV.
  const n = L.length,
    data = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, t) => [...t].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  data.setUint32(4, 36 + n * 4, true);
  str(8, "WAVEfmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 2, true);
  data.setUint32(24, rate, true);
  data.setUint32(28, rate * 4, true);
  data.setUint16(32, 4, true);
  data.setUint16(34, 16, true);
  str(36, "data");
  data.setUint32(40, n * 4, true);
  const R = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
  }
  return {
    rms,
    peak: peak.toFixed(2),
    seconds: seconds.toFixed(1),
    b64: await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.readAsDataURL(new Blob([data.buffer]));
    }),
  };
});
writeFileSync("screenshots/qa/music-preview.wav", Buffer.from(out.b64, "base64"));
console.log(
  "preview",
  JSON.stringify({ seconds: out.seconds, rmsByLevel: out.rms, peak: out.peak }),
);
// In a real round: the music starts, follows the intensity and stops on death.
await p.waitForFunction(
  () => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled,
  null,
  { timeout: 180000 },
);
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(800);
await p.click(".mf-start");
await p.waitForTimeout(8000);
const live = await p.evaluate(async () => {
  const g = document.querySelector("midnry-fps").engine,
    r = g.retention,
    m = r.audio.score;
  const before = { state: r.audio.ctx?.state, playing: m?.playing, level: m?.wanted };
  g.arena.entities.slice(1, 6).forEach((e) => (e.hp = 0));
  await new Promise((res) => setTimeout(res, 1500));
  const fight = m?.wanted;
  g.player.lives = 0;
  g.player.shieldUntil = 0;
  g.arena.damage(g.player, 9999, null);
  await new Promise((res) => setTimeout(res, 4000));
  return { ...before, fightLevel: fight, afterDeath: m?.playing };
});
console.log("in game", JSON.stringify(live));
console.log("errors", errs);
await b.close();
