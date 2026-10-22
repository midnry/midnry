import { MODIFIERS, modifierChoice } from "./outpost-variety.js";
import {
  FINISHES,
  profileOf,
  awardMatch,
  levelOf,
  calendarKeys,
  dailyChallenges,
  weeklyChallenge,
  DAILY_XP,
  WEEKLY_XP,
} from "./outpost-progression.js";
import { weaponOf, OUTFITS, mapOf, WEAPONS } from "./outpost-sim.js";
import { standingsHTML } from "./outpost-series.js";
import { BattleMusic, battleIntensity } from "./outpost-music.js";
import { spatialSound } from "./outpost-spatial-audio.js";
import { recordMatch } from "./outpost-account.js";
import { finishOf, money, drawFinish } from "./outpost-finishes.js";
import { CHARACTERS } from "./outpost-characters.js";
import { OutpostStore } from "./outpost-store.js";
/** Locker sections: what you carry, who you are, how it looks, how you're doing. */
const LOCKER_TABS = [
  ["loadout", "Loadout"],
  ["characters", "Characters"],
  ["finishes", "Finishes"],
  ["progress", "Progress"],
];
const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
/** The procedural sounds are mixed quiet; the master level lifts them so
 * the default volume is clearly audible on laptop and phone speakers. A
 * limiter after the master keeps the loudest moments from clipping. */
const LOUDNESS = 1.7;
/** Gesture-unlocked procedural audio; each game instance owns and closes its context. */
export class FieldAudio {
  constructor() {
    const p = read("midnry-outpost-audio");
    this.volume = Number.isFinite(p?.volume) ? Math.max(0, Math.min(1, p.volume)) : 0.35;
    this.muted = Boolean(p?.muted);
    this.music = Number.isFinite(p?.music) ? Math.max(0, Math.min(1, p.music)) : 0.6;
    this.voices = 0;
  }
  /** Create / resume the audio context. Browsers only allow this during a
   * user gesture (click, tap, key), so every gesture in the game calls it
   * until sound is running. */
  unlock() {
    if (this.ctx?.state === "closed") return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!this.ctx) {
        // iPhone / iPad: play through the ring/silent switch, like other
        // games (Safari 16.4+); older versions ignore this.
        try {
          if (navigator.audioSession) navigator.audioSession.type = "playback";
        } catch {}
        this.ctx = new Audio();
      }
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -4;
        this.limiter.knee.value = 2;
        this.limiter.ratio.value = 16;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.15;
        this.master.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
        this.level();
        const n = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, n, n);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state !== "running") {
        void this.ctx.resume().catch(() => {});
        // Safari / iOS unlock: start a silent one-sample buffer inside the
        // same gesture; without it the context can stay silent.
        const silent = this.ctx.createBufferSource();
        silent.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        silent.connect(this.ctx.destination);
        silent.start(0);
      }
    } catch {}
  }
  /** Sound is on: not muted and the volume above zero. */
  soundOn() {
    return !this.muted && this.volume > 0;
  }
  /** The sound on/off control: turning on also restores a zero volume. */
  setSound(on) {
    this.muted = !on;
    if (on && this.volume <= 0) this.volume = 0.35;
    this.unlock();
    this.level();
    this.onChange?.();
  }
  level() {
    if (this.master)
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * LOUDNESS, this.ctx.currentTime, 0.025);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.music * 0.55, this.ctx.currentTime, 0.05);
    write("midnry-outpost-audio", { volume: this.volume, muted: this.muted, music: this.music });
  }
  /** Last Signal battle music, through the master volume and its own level. */
  battle() {
    if (!this.master || this.ctx.state !== "running") return null;
    if (!this.score) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.music * 0.55;
      this.musicGain.connect(this.master);
      this.score = new BattleMusic(this.ctx, this.musicGain);
    }
    return this.score;
  }
  tone(frequency, duration = 0.1, gain = 0.12, pan = 0, type = "triangle", end = frequency) {
    const a = this.ctx;
    if (!a || a.state !== "running" || this.muted || !this.volume || gain <= 0 || this.voices >= 16)
      return;
    const source = a.createOscillator();
    source.type = type;
    source.frequency.setValueAtTime(frequency, a.currentTime);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, end), a.currentTime + duration);
    this.play(source, duration, gain, pan);
  }
  hiss(duration = 0.12, gain = 0.12, frequency = 1800, pan = 0) {
    const a = this.ctx;
    if (!a || a.state !== "running" || this.muted || !this.volume || gain <= 0 || this.voices >= 16)
      return;
    const source = a.createBufferSource();
    source.buffer = this.noise;
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    source.connect(filter);
    this.play(source, duration, gain, pan, filter);
  }
  /** Four seconds of white or brown (deep, rumbling) noise, made once: long
   * enough that looped weather never audibly repeats. */
  noiseOf(brown) {
    const key = brown ? "brownNoise" : "longNoise";
    if (!this[key]) {
      const a = this.ctx,
        n = a.sampleRate * 4,
        buffer = a.createBuffer(1, n, a.sampleRate),
        d = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const white = Math.random() * 2 - 1;
        d[i] = brown ? (last = (last + 0.02 * white) / 1.02) * 3.5 : white;
      }
      this[key] = buffer;
    }
    return this[key];
  }
  /** A filtered noise swell (gust, thunder, rumble, crumbling), optionally
   * starting `delay` seconds from now (thunder arrives after its flash). */
  swell({ delay = 0, attack = 0.2, duration = 1.5, gain = 0.1, frequency = 800, end = frequency, type = "lowpass", q = 0.7, pan = 0, brown = false }) {
    const a = this.ctx;
    if (!a || a.state !== "running" || this.muted || !this.volume || gain <= 0 || this.voices >= 16)
      return;
    const at = a.currentTime + Math.max(0, delay),
      source = a.createBufferSource(),
      filter = a.createBiquadFilter(),
      envelope = a.createGain(),
      panner = a.createStereoPanner();
    source.buffer = this.noiseOf(brown);
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequency, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(gain, at + Math.min(attack, duration * 0.8));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(panner);
    panner.connect(this.master);
    this.voices++;
    source.onended = () => {
      for (const node of [source, filter, envelope, panner]) node.disconnect();
      this.voices--;
    };
    source.start(at, Math.random() * 3);
    source.stop(at + duration + 0.05);
  }
  /** A looping weather sound (rain, wind, rumble) held at `gain` while it
   * keeps being asked for; it fades out by itself once it stops being asked
   * for (paused, round over, game closed), so it can never get stuck on. */
  bed(name, gain, frequency, { type = "lowpass", q = 0.7, brown = false } = {}) {
    const a = this.ctx;
    if (!a || a.state !== "running" || !this.master) return;
    this.beds ||= new Map();
    let b = this.beds.get(name);
    if (!b) {
      if (gain <= 0.001) return;
      const source = a.createBufferSource(),
        filter = a.createBiquadFilter(),
        level = a.createGain();
      source.buffer = this.noiseOf(brown);
      source.loop = true;
      filter.type = type;
      filter.Q.value = q;
      filter.frequency.value = frequency;
      level.gain.value = 0.0001;
      source.connect(filter);
      filter.connect(level);
      level.connect(this.master);
      source.start(0, Math.random() * 3);
      b = { source, filter, level };
      this.beds.set(name, b);
      this.bedWatch ||= setInterval(() => this.sweepBeds(), 250);
    }
    b.touched = performance.now();
    b.level.gain.setTargetAtTime(Math.max(0.0001, gain), a.currentTime, 0.25);
    b.filter.frequency.setTargetAtTime(frequency, a.currentTime, 0.3);
  }
  sweepBeds() {
    const now = performance.now(),
      a = this.ctx;
    for (const [name, b] of this.beds) {
      const idle = now - b.touched;
      if (idle > 300 && a.state === "running") b.level.gain.setTargetAtTime(0.0001, a.currentTime, 0.3);
      if (idle > 2500 || a.state === "closed") {
        try {
          b.source.stop();
        } catch {}
        for (const node of [b.source, b.filter, b.level]) node.disconnect();
        this.beds.delete(name);
      }
    }
    if (!this.beds.size) {
      clearInterval(this.bedWatch);
      this.bedWatch = 0;
    }
  }
  play(source, duration, gain, pan, out = source) {
    const a = this.ctx,
      envelope = a.createGain(),
      panner = a.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    envelope.gain.setValueAtTime(0.0001, a.currentTime);
    envelope.gain.linearRampToValueAtTime(gain, a.currentTime + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration);
    out.connect(envelope);
    envelope.connect(panner);
    panner.connect(this.master);
    this.voices++;
    source.onended = () => {
      source.disconnect();
      out !== source && out.disconnect();
      envelope.disconnect();
      panner.disconnect();
      this.voices--;
    };
    source.start();
    source.stop(a.currentTime + duration + 0.01);
  }
  shot(kind, pan = 0, gain = 1, cutoff = 10000) {
    const heavy = ["rocket", "lob", "shotgun"].includes(kind),
      melee = ["melee", "dash"].includes(kind);
    this.hiss(
      heavy ? 0.22 : 0.085,
      0.16 * gain,
      Math.min(cutoff, melee ? 700 : heavy ? 1300 : 3500),
      pan,
    );
    if (!melee)
      this.tone(heavy ? 95 : 220, heavy ? 0.2 : 0.09, 0.13 * gain, pan, "square", heavy ? 35 : 70);
  }
  step(pan = 0, gain = 1, metal = false, cutoff = 10000) {
    this.hiss(0.05, 0.075 * gain, Math.min(cutoff, metal ? 1400 : 900), pan);
    this.tone(metal ? 120 : 70, 0.055, 0.045 * gain, pan, "sine", 35);
  }
  result(won) {
    for (const [i, n] of (won ? [440, 554, 659] : [220, 165]).entries())
      this.tone(n, 0.25, 0.13, 0, "triangle", n * (1 + i * 0.04));
  }
  destroy() {
    clearInterval(this.bedWatch);
    this.bedWatch = 0;
    if (this.ctx) void this.ctx.close().catch(() => {});
  }
}
const escapeText = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export class Retention {
  constructor(g) {
    this.g = g;
    this.profile = profileOf(read("midnry-outpost-profile"));
    // Premium finishes: owned per account. Refresh the Locker and the held
    // gun whenever the answer changes.
    this.store = new OutpostStore(() => {
      if (g.$(".mf-locker")?.open) this.lockerContents();
    });
    this.store.refresh();
    this.store.confirmFromUrl().then(() => {
      if (this.store.justBought) this.locker();
    });
    this.audio = new FieldAudio();
    this.seen = new Map();
    this.reset();
    g.$(".mf-modes").insertAdjacentHTML(
      "beforebegin",
      `<section class="mf-results" hidden aria-label="Match results"><h2>ROUND DEBRIEF</h2><p class="mf-resultsub"></p><div class="mf-resultstats"></div><div class="mf-seriesboard" hidden></div><div class="mf-resultxp"><b class="mf-rxlevel"></b><span class="mf-rxbar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="150"><i class="mf-rxold"></i><i class="mf-rxnew"></i></span><small class="mf-rxnext"></small></div><p class="mf-earned" role="status"></p><button class="mf-again">PLAY AGAIN</button><button class="mf-tomenu">Lobby</button><p class="mf-againnote"></p></section>`,
    );
    g.$(".mf-network").insertAdjacentHTML(
      "beforebegin",
      `<details class="mf-retention"><summary>PLAYER EXPERIENCE / <span class="mf-level"></span></summary><label>Bot difficulty<select class="mf-difficulty" aria-label="Bot difficulty"><option value="easy">Easy · relaxed reactions</option><option value="normal" selected>Normal · standard combat</option><option value="hard">Hard · faster, more alert</option></select></label><p>Health and weapon damage stay the same. Online, the host chooses before starting.</p><label>Your name<input class="mf-playername" maxlength="16" autocomplete="nickname" spellcheck="false" placeholder="Shown above your head"></label><label><input class="mf-reveal" type="checkbox" checked> Reveal roles when someone is voted out</label><label>Match modifier<select class="mf-modifier" aria-label="Match modifier"><option value="random">Random each match</option>${MODIFIERS.map((m) => `<option value="${m.id}">${m.name}</option>`).join("")}</select></label><label>Sound volume<input class="mf-volume" aria-label="Sound volume" type="range" min="0" max="100" value="35"></label><label>Music volume<input class="mf-music" aria-label="Music volume" type="range" min="0" max="100" value="60"></label><label><input class="mf-mute" type="checkbox"> Mute sound</label><button class="mf-lockeropen">RANGER LOCKER →</button></details>`,
    );
    g.shell.insertAdjacentHTML(
      "beforeend",
      `<div class="mf-countdown" hidden role="status" aria-live="polite"></div><dialog class="mf-locker" aria-label="Locker"><div class="mf-lockerhead"><b>LOCKER</b><div class="mf-lockertabs" role="tablist" aria-label="Locker sections">${LOCKER_TABS.map(([id, label]) => `<button type="button" role="tab" data-ltab="${id}">${label}</button>`).join("")}</div><button class="mf-lockerclose mf-screenclose" aria-label="Close the locker (Esc)" title="Close (Esc)">✕</button></div><div class="mf-lockerbody" role="tabpanel"></div></dialog>`,
    );
    g.$(".mf-volume").value = String(this.audio.volume * 100);
    g.$(".mf-mute").checked = this.audio.muted;
    // The pause menu's sound button changes these too: keep Settings in step.
    this.audio.onChange = () => {
      g.$(".mf-volume").value = String(this.audio.volume * 100);
      g.$(".mf-mute").checked = this.audio.muted;
    };
    // Browsers start audio only from a user gesture inside the game: the
    // first click, tap or key anywhere (not only Play) turns sound on.
    const wake = () => {
      if (this.audio.ctx?.state !== "running") this.audio.unlock();
    };
    for (const type of ["pointerdown", "touchend", "keydown", "click"]) g.on(document, type, wake, { capture: true });
    // A visible hint while sound is blocked or switched off in a match.
    g.shell.insertAdjacentHTML(
      "beforeend",
      `<button type="button" class="mf-soundhint" hidden><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg><span></span></button><style>midnry-fps .mf-shell .mf-soundhint{all:unset;position:absolute;z-index:7;left:50%;top:calc(104px + var(--mf-safe-top,0px));transform:translateX(-50%);display:flex;align-items:center;gap:10px;min-height:44px;padding:0 18px;border:1px solid #ffc85799;border-radius:22px;background:#0a0f0de6;color:#fff;font:600 15px var(--mf-display,sans-serif);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 24px #0008;white-space:nowrap}midnry-fps .mf-shell .mf-soundhint[hidden]{display:none}midnry-fps .mf-shell .mf-soundhint svg{width:22px;height:22px;color:var(--mf-accent,#ffc857)}midnry-fps .mf-shell .mf-soundhint:focus-visible{outline:2px solid var(--mf-accent,#ffc857);outline-offset:2px}</style>`,
    );
    g.on(g.$(".mf-soundhint"), "click", (e) => {
      e.stopPropagation();
      this.audio.setSound(true);
      this.offHintUntil = 0;
      g.$(".mf-soundhint").hidden = true;
      g.homeMenu?.syncSound?.();
      if (g.running) g.shell.focus({ preventScroll: true });
    });
    g.on(g.$(".mf-volume"), "input", (e) => {
      this.audio.volume = Number(e.target.value) / 100;
      this.audio.unlock();
      this.audio.level();
    });
    g.$(".mf-music").value = String(this.audio.music * 100);
    g.on(g.$(".mf-music"), "input", (e) => {
      this.audio.music = Number(e.target.value) / 100;
      this.audio.unlock();
      this.audio.level();
    });
    g.on(g.$(".mf-mute"), "change", (e) => {
      this.audio.muted = e.target.checked;
      this.audio.unlock();
      this.audio.level();
    });
    g.on(g.$(".mf-difficulty"), "change", (e) => {
      if (g.online) g.onlineAction("settings", { difficulty: e.target.value });
      else {
        g.difficulty = e.target.value;
        g.reset();
      }
    });
    try {
      g.revealRoles = localStorage.getItem("midnry-outpost-reveal") !== "off";
    } catch {
      g.revealRoles = true;
    }
    g.$(".mf-reveal").checked = g.revealRoles;
    g.on(g.$(".mf-reveal"), "change", (e) => {
      if (g.online) return g.onlineAction("settings", { reveal: e.target.checked });
      g.revealRoles = e.target.checked;
      try {
        localStorage.setItem("midnry-outpost-reveal", g.revealRoles ? "on" : "off");
      } catch {}
      g.reset();
    });
    try {
      g.playerName = localStorage.getItem("midnry-outpost-name") || "";
    } catch {
      g.playerName = "";
    }
    g.$(".mf-playername").value = g.playerName;
    g.on(g.$(".mf-playername"), "keydown", (e) => e.stopPropagation());
    g.on(g.$(".mf-playername"), "change", (e) => {
      const name = e.target.value.replace(/[^\p{L}\p{N} ._'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);
      e.target.value = name;
      g.playerName = name;
      try {
        localStorage.setItem("midnry-outpost-name", name);
      } catch {}
      // Online, the lobby shows the new name; offline it applies next round.
      if (g.online?.phase === "lobby") g.onlineAction("loadout", { weapon: g.weapon, outfit: g.outfit, name });
    });
    try {
      g.modifier = modifierChoice(localStorage.getItem("midnry-outpost-modifier") || "random");
    } catch {
      g.modifier = "random";
    }
    g.$(".mf-modifier").value = g.modifier;
    g.on(g.$(".mf-modifier"), "change", (e) => {
      const value = modifierChoice(e.target.value);
      if (g.online) return g.onlineAction("settings", { modifier: value });
      g.modifier = value;
      try {
        localStorage.setItem("midnry-outpost-modifier", value);
      } catch {}
      g.reset();
    });
    g.on(g.$(".mf-again"), "click", () => this.again());
    // Leave the debrief for the full menu (mode, settings, lobby, exit).
    g.on(g.$(".mf-tomenu"), "click", () => {
      g.$(".mf-panel").classList.remove("mf-debrief");
      g.$(".mf-panel").scrollTop = 0;
      g.$(".mf-start")?.focus({ preventScroll: true });
    });
    g.on(g.$(".mf-lockeropen"), "click", () => this.locker());
    g.on(g.$(".mf-lockerclose"), "click", () => g.$(".mf-locker").close());
    g.on(g.$(".mf-locker"), "keydown", (e) => e.stopPropagation());
    g.on(g.$(".mf-lockerbody"), "change", (e) => {
      if (e.target.matches(".mf-adultcheck")) {
        this.store.setAdultConfirmed(e.target.checked);
        this.g.$(".mf-adultcheck")?.focus({ preventScroll: true });
        return;
      }
      if (!e.target.matches(".mf-finish")) return;
      const finish = FINISHES.find((f) => f.id === e.target.value && f.xp <= this.profile.xp);
      if (finish) {
        this.profile.skin = finish.id;
        write("midnry-outpost-profile", this.profile);
        this.lockerContents();
      }
    });
    // "Change operator" on the home card opens the Characters tab.
    g.root.addEventListener("click", (e) => {
      if (e.target.closest?.(".mf-opchar")) this.lockerTab = "characters";
      else if (e.target.closest?.('nav [data-go="locker"]')) this.lockerTab = "loadout";
    }, true);
    g.on(g.$(".mf-lockertabs"), "click", (e) => {
      const tab = e.target.closest("[data-ltab]");
      if (!tab) return;
      this.lockerTab = tab.dataset.ltab;
      this.lockerContents();
      tab.focus({ preventScroll: true });
    });
    g.on(g.$(".mf-lockerbody"), "click", (e) => {
      const gun = e.target.closest("[data-weapon]");
      if (gun) {
        g.chooseWeapon(gun.dataset.weapon);
        this.lockerContents();
        g.$(`[data-weapon="${gun.dataset.weapon}"]`)?.focus({ preventScroll: true });
        return;
      }
      const currency = e.target.closest("[data-currency]");
      if (currency) {
        this.store.setCurrency(currency.dataset.currency);
        this.lockerContents();
        this.g.$(`[data-currency="${currency.dataset.currency}"]`)?.focus({ preventScroll: true });
        return;
      }
      const tile = e.target.closest("[data-finish]");
      if (tile) {
        const finish = finishOf(tile.dataset.finish);
        if (this.finishUsable(finish)) {
          this.profile.skin = finish.id;
          write("midnry-outpost-profile", this.profile);
          this.lockerContents();
          this.g.$(`[data-finish="${finish.id}"]`)?.focus({ preventScroll: true });
        } else if (finish.kind === "premium") {
          // Buying needs the adult confirmation; point to it when unticked.
          const asked = this.store.adultConfirmed;
          this.store.buy(finish.id);
          if (!asked) this.g.$(".mf-adultcheck")?.focus();
        }
        else if (finish.kind === "pass") (window.top || window).location.assign("/pricing");
        return;
      }
      const hero = e.target.closest("[data-character]");
      if (hero) {
        g.chooseCharacter(hero.dataset.character);
        this.lockerContents();
        g.$(`[data-character="${hero.dataset.character}"]`)?.focus({ preventScroll: true });
        return;
      }
      const card = e.target.closest("[data-outfit]");
      if (card && !card.disabled) {
        g.chooseOutfit(card.dataset.outfit);
        g.$(`[data-outfit="${card.dataset.outfit}"]`)?.focus({ preventScroll: true });
      }
    });
    this.menu();
  }
  reset() {
    this.seen?.clear();
    this.clock = -1;
    this.stepDistance = 0;
    this.countBeat = 0;
    this.fxHeard = null;
    this.disasterStage = 0;
    this.summary = null;
    if (this.g.$(".mf-results")) this.g.$(".mf-results").hidden = true;
    this.g.$(".mf-panel")?.classList.remove("mf-debrief");
  }
  menu() {
    const g = this.g;
    // The difficulty picker is optional (the protocol menu removes it); the
    // level label and challenge count must refresh either way.
    const difficulty = g.$(".mf-difficulty");
    if (difficulty) {
      difficulty.value = g.difficulty || "normal";
      difficulty.disabled = Boolean(
        g.online && (g.online.host !== g.selfId || g.online.phase !== "lobby"),
      );
    }
    if (!g.$(".mf-level")) return;
    const today = this.challengeStatus();
    g.$(".mf-level").textContent = `LEVEL ${levelOf(this.profile)} · ${this.profile.xp} XP · Daily ${today.daily.filter((c) => c.done).length}/3`;
    if (this.summary) {
      const again = g.$(".mf-again"),
        note = g.$(".mf-againnote");
      if (g.online) {
        // Everyone can ask for a rematch and sees who is ready; the host's
        // tap starts it.
        const here = (g.online.members || []).filter((m) => m.connected !== false);
        const ready = here.filter((m) => m.ready).length;
        const mine = here.find((m) => m.id === g.selfId)?.ready === true;
        const ended = g.online.phase === "ended";
        again.disabled = !ended || mine;
        again.textContent = !ended ? "STARTING…" : mine ? `READY ✓ · ${ready}/${here.length}` : "REMATCH →";
        note.textContent = !ended
          ? "The next round is starting."
          : g.online.host === g.selfId
            ? `Same room and players. ${ready ? `${ready} of ${here.length} ready. ` : ""}Your tap starts the rematch for everyone.`
            : mine
              ? "You're in. The rematch starts when the host taps it."
              : `Same room and players. Tap to tell the host you're in${ready ? ` (${ready}/${here.length} ready)` : ""}.`;
      } else if (g.mode === "signal" && g.series?.rounds.length) {
        const series = g.series;
        again.disabled = false;
        again.textContent = series.done ? "NEW SERIES →" : `NEXT ROUND · ${mapOf(series.mapFor()).name.toUpperCase()} →`;
        note.textContent = series.done
          ? `Start a fresh ${series.rule.title.toLowerCase()} with the same loadout and difficulty.`
          : `Round ${series.round}${Number.isFinite(series.rule.maxRounds) ? ` of up to ${series.rule.maxRounds}` : ""}. A two-second countdown starts it.`;
      } else {
        again.disabled = false;
        again.textContent = "PLAY AGAIN";
        note.textContent = "Same game, loadout and difficulty. Starts after a two-second countdown.";
      }
    }
  }
  finish(won) {
    const g = this.g;
    if (g.academy?.active || g.practice?.active) return;
    const p = g.player;
    const summary = {
      id: g.arena.roundId,
      won,
      weapon: p.weapon,
      kills: p.kills || 0,
      damage: Math.round(p.damageDealt || 0),
      cores: p.coresCollected || 0,
      seconds: Math.floor(p.eliminatedAt ?? g.time),
      placement:
        p.placement ||
        (won
          ? 1
          : new Set(
              g
                .combatants()
                .filter((e) => e.hp > 0)
                .map((e) => e.team),
            ).size + 1),
      practice: false,
    };
    const missionView = g.mode === "protocol" ? g.protocolUI?.safeView()?.protocol : null;
    if (missionView?.self) {
      summary.mode = "protocol";
      summary.role = missionView.self.role;
      summary.contributions = missionView.self.contributions;
      summary.rescued = missionView.mission?.patients.filter(p => p.rescued).length || 0;
      summary.correctVotes = missionView.self.correctVotes || 0;
    }
    recordMatch({
      id: summary.id,
      mode: g.mode,
      map: g.arena.mapId,
      online: !!g.online,
      won: !!won,
      kills: summary.kills,
      damage: summary.damage,
      seconds: summary.seconds,
      placement: summary.placement,
      role: summary.role ?? null,
    });
    const before = this.profile.xp,
      earned = awardMatch(this.profile, summary);
    this.profile = earned.profile;
    write("midnry-outpost-profile", this.profile);
    this.summary = summary;
    g.$(".mf-results").hidden = false;
    g.$(".mf-results").classList.toggle("mf-lost", !won);
    g.$(".mf-results > h2").textContent = won ? "Victory" : "Defeat";
    // Last Signal series: who leads, and who took first once it is decided.
    const series = g.mode === "signal" && g.series?.rounds.length ? g.series : null,
      board = g.$(".mf-seriesboard");
    board.hidden = !series;
    if (series) {
      const champion = series.champion,
        last = series.rounds.at(-1),
        winner = last.winner && series.table[last.winner];
      g.$(".mf-results > h2").textContent = champion
        ? champion.id === g.selfId
          ? "Series won"
          : "Series over"
        : `Round ${series.rounds.length} · ${won ? "won" : "lost"}`;
      board.innerHTML = `<p class="mf-serieshead">${
        champion
          ? `<b>${champion.id === g.selfId ? "You take first place" : `${escapeText(champion.name)} takes first place`}</b> with ${champion.wins} win${champion.wins === 1 ? "" : "s"}.`
          : `<b>${winner ? (winner.id === g.selfId ? "You won" : `${escapeText(winner.name)} won`) : "Nobody won"}</b> round ${series.rounds.length} on ${mapOf(last.mapId).name}.`
      }</p>${standingsHTML(series, g.selfId)}`;
    }
    // The round's debrief replaces the menu until the player asks for it.
    g.$(".mf-panel").classList.add("mf-debrief");
    const c = summary.contributions || {};
    const stats = summary.mode === "protocol" ? summary.role === "infiltrator" ? [
      ["Sabotages",c.sabotage || 0], ["Charges armed",c.charges || 0], ["Cover checks",c.cover || 0],
      ["Mission time",`${summary.seconds}s`], ["Patients rescued",summary.rescued], ["Level",levelOf(this.profile)],
    ] : [
      ["Supplies loaded",c.supplies || 0], ["Aircraft checks",c.checks || 0], ["Repairs / defuses",`${c.repairs || 0} / ${c.defuses || 0}`],
      ["Safe piloting",`${Math.floor(c.pilotSeconds || 0)}s`], ["Patients rescued",summary.rescued], ["Level",levelOf(this.profile)],
    ] : [
      [
        "Placement",
        g.mode === "training"
          ? won
            ? "Complete"
            : "Incomplete"
          : `${g.mode === "duo" ? "Team " : ""}#${summary.placement}`,
      ],
      ["Eliminations", summary.kills],
      ["Damage", summary.damage],
      ["Survived", `${summary.seconds}s`],
      ["Cores", summary.cores],
      ["Level", levelOf(this.profile)],
    ];
    g.$(".mf-resultstats").innerHTML = stats
      .map(([label, value]) => `<div><small>${label}</small><strong>${value}</strong></div>`)
      .join("");
    g.$(".mf-earned").textContent = earned.xp
      ? `+${earned.xp} XP · ${earned.bonuses.length ? earned.bonuses.join(" · ") : "Every completed round counts."}`
      : /short losses/.test(earned.reason || "")
        ? "No XP this time: rounds under 15 seconds and practice don't count. Stay in the fight to earn XP."
        : earned.reason || "Reward already collected for this round.";
    // What the round was, and the XP bar filling from before to now.
    const modeName = summary.mode === "protocol" ? "Blackout Protocol" : g.mode === "duo" ? "Pair Ops" : g.mode === "training" ? "Training" : "Last Signal";
    g.$(".mf-resultsub").textContent = [
      modeName,
      mapOf(g.arena.mapId).name,
      summary.mode === "protocol" ? (summary.role === "infiltrator" ? "Infiltrator" : "Operator") : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const after = this.profile.xp,
      levelUp = levelOf(this.profile) > Math.floor(before / 150) + 1,
      from = levelUp ? 0 : before % 150,
      to = after % 150;
    g.$(".mf-rxlevel").textContent = `Level ${levelOf(this.profile)}${levelUp ? " · Level up!" : ""}`;
    g.$(".mf-rxnext").textContent = `${150 - to} XP to level ${levelOf(this.profile) + 1}`;
    const bar = g.$(".mf-rxbar");
    bar.setAttribute("aria-valuenow", String(to));
    bar.style.setProperty("--old", `${(from / 150) * 100}%`);
    bar.style.setProperty("--new", `${(from / 150) * 100}%`);
    g.$(".mf-resultxp").classList.toggle("mf-levelup", levelUp);
    // Fill after the card appears (instantly with reduced motion).
    requestAnimationFrame(() => requestAnimationFrame(() => bar.style.setProperty("--new", `${(to / 150) * 100}%`)));
    this.audio.result(won);
    this.menu();
    // Returning from a scrolled mobile deployment menu should reveal the debrief.
    const panel = g.$(".mf-panel"),
      results = g.$(".mf-results");
    panel.scrollTop += results.getBoundingClientRect().top - panel.getBoundingClientRect().top - 20;
    if (!g.$(".mf-again").disabled) g.$(".mf-again").focus({ preventScroll: true });
  }
  again() {
    const g = this.g;
    this.audio.unlock();
    if (g.online) {
      if (g.online.phase === "ended") g.onlineAction("ready");
      return;
    }
    g.reset();
    g.arena.countdown = 2;
    g.start();
  }
  lockerContents() {
    const focused = document.activeElement?.dataset?.outfit;
    const p = this.profile,
      next = FINISHES.find((f) => f.kind === "xp" && f.xp > p.xp);
    const tab = LOCKER_TABS.some(([id]) => id === this.lockerTab) ? this.lockerTab : "loadout";
    for (const b of this.g.root.querySelectorAll(".mf-lockertabs [data-ltab]")) {
      b.setAttribute("aria-selected", String(b.dataset.ltab === tab));
      b.tabIndex = b.dataset.ltab === tab ? 0 : -1;
    }
    const level = `<div class="mf-lockerlevel"><b>Level ${levelOf(p)}</b><span>${p.xp} XP · ${p.matches} rounds · ${p.wins} wins</span><progress max="150" value="${p.xp % 150}" aria-label="Progress to next level"></progress><small>${150 - (p.xp % 150)} XP to the next level${next ? ` · ${Math.max(0, next.xp - p.xp)} XP to ${next.name}` : ""}</small></div>`;
    if (tab !== "progress") {
      this.g.$(".mf-lockerbody").innerHTML =
        level + (tab === "loadout" ? this.loadoutGrid() : tab === "characters" ? this.characterGrid() : this.finishGrid());
      if (tab === "finishes") this.paintSwatches();
      if (focused) this.g.$(`[data-outfit="${focused}"]`)?.focus({ preventScroll: true });
      return;
    }
    this.g.$(".mf-lockerbody").innerHTML =
      `${level}<h3>Today's challenges · +${DAILY_XP} XP each</h3>${this.challengeStatus()
          .daily.map(
            (c) =>
              `<p>${c.done ? "✓ " : ""}${c.text} · ${c.progress}/${c.goal}</p><progress max="${c.goal}" value="${c.progress}" aria-label="${c.text}"></progress>`,
          )
          .join("")}<h3>This week · +${WEEKLY_XP} XP</h3>${(() => {
          const w = this.challengeStatus().weekly;
          return `<p>${w.done ? "✓ " : ""}${w.text} · ${w.progress}/${w.goal}</p><progress max="${w.goal}" value="${w.progress}" aria-label="${w.text}"></progress>`;
        })()}<h3>Your record</h3><p>Operator: ${p.record.operator.won} wins in ${p.record.operator.played} rounds · Infiltrator: ${p.record.infiltrator.won} wins in ${p.record.infiltrator.played} rounds</p><h3>Milestones</h3><p>Play both sides (operator and infiltrator): ${p.roles.length}/2 · ${p.milestones.includes("explorer") ? "Reward earned" : "50 bonus XP"}</p><p>Complete three rounds: ${Math.min(3, p.matches)}/3 · ${p.milestones.includes("first-three") ? "Reward earned" : "50 bonus XP"}</p><p>Load 13 medical supplies: ${Math.min(13,p.career.supplies)}/13 · ${p.milestones.includes("supply-detail") ? "Reward earned" : "50 bonus XP"}</p><p>Complete three aircraft checks: ${Math.min(3,p.career.checks)}/3 · ${p.milestones.includes("flight-ready") ? "Reward earned" : "50 bonus XP"}</p><p>Deliver aid to four patients: ${Math.min(4,p.career.patients)}/4 · ${p.milestones.includes("lifeline") ? "Reward earned" : "50 bonus XP"}</p><p>XP rewards completed missions, supplies loaded, equipment checks, repairs, defuses, safe piloting and rescues. Infiltrators earn mission credit for validated sabotage, charges and cover checks. Repeated collection without loading and idle time do not earn contribution XP. Losses under 15 seconds do not earn XP. All rewards and store finishes change appearance only. There are no streak penalties and nothing that helps you win is sold.</p><p>Progress is saved on this browser and device. Clearing browser data removes it; it does not sync between devices.</p>`;
    if (focused) this.g.$(`[data-outfit="${focused}"]`)?.focus({ preventScroll: true });
    this.paintSwatches();
  }
  /** XP finishes are earned on this device; store finishes per account. */
  finishUsable(finish) {
    return finish.kind === "xp" ? finish.xp <= this.profile.xp : this.store.owns(finish);
  }
  /** The finish the held gun wears (falls back when it is not usable). */
  weaponFinish() {
    const finish = finishOf(this.profile.skin);
    return this.finishUsable(finish) ? finish.id : "standard";
  }
  /** Loadout: every weapon as a card with plain stat bars and its special
   * move; the chosen one is what you carry into Last Signal. */
  loadoutGrid() {
    const g = this.g,
      mine = weaponOf(g.weapon).id,
      all = Object.values(WEAPONS),
      top = (k) => Math.max(...all.map(k));
    const bar = (label, v) => `<span class="mf-wstat"><em>${label}</em><i style="--v:${Math.round(Math.max(0.06, Math.min(1, v)) * 100)}%"></i></span>`;
    const KIND = { rifle: "Rifle", shotgun: "Scattergun", burst: "Burst rifle", shard: "Thrown", blades: "Blades", poison: "Darts", melee: "Melee", dash: "Melee", rocket: "Launcher", lob: "Thrown" };
    const cards = all
      .map((w) => {
        const on = w.id === mine,
          pellets = w.pellets || 1;
        return `<button type="button" class="mf-weaponcard${on ? " is-on" : ""}" data-weapon="${w.id}" aria-pressed="${on}"><span class="mf-wkind">${KIND[w.kind] || "Weapon"}</span><strong>${escapeText(w.name)}</strong>${bar("Damage", (w.damage * pellets) / top((x) => x.damage * (x.pellets || 1)))}${bar("Fire rate", top((x) => x.cooldown) ? Math.min(...all.map((x) => x.cooldown)) / w.cooldown : 0)}${bar("Range", w.range / top((x) => x.range))}${bar("Magazine", w.mag / top((x) => x.mag))}<small>Special · ${escapeText(w.super || "")}</small><span class="mf-wstate">${on ? "Equipped" : "Equip"}</span></button>`;
      })
      .join("");
    const note =
      g.mode === "protocol"
        ? "For Last Signal and Pair Ops. In Blackout Protocol everyone carries the VX–7 Carbine."
        : g.state === "playing" && g.arena?.time > 0 && g.arena.state === "playing"
          ? "Applies from your next round."
          : "What you carry into Last Signal.";
    const w = weaponOf(mine);
    return `<h3>Loadout</h3><p>${note}</p><div class="mf-weaponpick"><div class="mf-weapongrid">${cards}</div><aside class="mf-weaponinfo" aria-live="polite"><b>${escapeText(w.name)}</b><p>${escapeText(w.description || w.blurb || "")}</p></aside></div>`;
  }
  /** Characters: numbered portrait cards; the chosen one is in the lobby
   * and is who you play in Last Signal. */
  characterGrid() {
    const mine = this.g.character || "operator";
    const cards = CHARACTERS.map((c, i) => {
      const on = c.id === mine;
      return `<button type="button" class="mf-charcard${on ? " is-on" : ""}" data-character="${c.id}" aria-pressed="${on}" style="--mf-char:${c.accent}"><img src="menu/characters/${c.id}.webp" alt="" loading="lazy" width="240" height="320"><i aria-hidden="true">${String(i + 1).padStart(2, "0")}</i><strong>${escapeText(c.name)}</strong><small>${on ? "Equipped" : escapeText(c.role)}</small></button>`;
    }).join("");
    return `<h3>Characters</h3><p>Who you play in Last Signal, and who stands in your lobby. Looks only, never stats.</p><div class="mf-chargrid">${cards}</div>`;
  }
  finishGrid() {
    const p = this.profile,
      store = this.store,
      equipped = this.weaponFinish();
    const tiles = FINISHES.map((f) => {
      const usable = this.finishUsable(f),
        on = f.id === equipped;
      const state = on
        ? "Equipped"
        : usable
          ? "Equip"
          : f.kind === "xp"
            ? `Unlocks at ${f.xp} XP`
            : f.kind === "pass"
              ? "With Midnry Pass"
              : store.signedIn === false
                ? "Sign in to buy"
                : `Buy · ${money(f.price[store.currency], store.currency)}`;
      const locked = !usable && f.kind === "xp";
      return `<button type="button" class="mf-finishtile${on ? " is-on" : ""}${usable ? "" : " is-locked"}" data-finish="${f.id}" aria-pressed="${on}" ${locked ? "disabled" : ""}><canvas width="96" height="96" aria-hidden="true"></canvas><strong>${escapeText(f.name)}</strong><small>${escapeText(f.blurb || (f.kind === "xp" ? "Earned with XP." : ""))}</small><span class="mf-finishstate">${state}</span></button>`;
    }).join("");
    const pay = `<div class="mf-currency" role="group" aria-label="Pay in">${[
      ["NGN", "₦ Naira"],
      ["USD", "$ Dollars"],
    ]
      .map(([c, label]) => `<button type="button" data-currency="${c}" aria-pressed="${store.currency === c}">${label}</button>`)
      .join("")}</div>`;
    // Paying needs "18 or older, or a parent or guardian is paying" (the
    // server refuses a checkout without it). Shown while something is for sale.
    const forSale = store.signedIn === true && FINISHES.some((f) => f.kind === "premium" && !store.owns(f));
    const adult = forSale
      ? `<div class="mf-adult"><label><input type="checkbox" class="mf-adultcheck" id="mf-adultcheck"${store.adultConfirmed ? " checked" : ""} aria-required="true"${store.adultError ? ' aria-invalid="true" aria-describedby="mf-adulterr"' : ""}><span>I'm 18 or older, or a parent or guardian is paying.</span></label>${store.adultError ? `<p class="mf-adulterr" id="mf-adulterr" role="alert">Before paying, confirm you're 18 or older or that a parent or guardian is paying.</p>` : ""}</div>`
      : "";
    return `<h3>Weapon finishes</h3><p>Your gun in first person. Looks only, never stats.</p>${pay}${adult}<div class="mf-finishgrid">${tiles}</div><p class="mf-storestatus" role="status" aria-live="polite">${escapeText(store.message || (store.ready || store.signedIn === null ? "" : store.signedIn === false ? "Sign in with your Midnry account to buy finishes." : "The store is opening soon."))}</p>`;
  }
  paintSwatches() {
    for (const tile of this.g.root.querySelectorAll(".mf-finishtile")) {
      const canvas = tile.querySelector("canvas"),
        ctx = canvas.getContext("2d"),
        finish = finishOf(tile.dataset.finish);
      drawFinish(ctx, canvas.width, finish);
      if (finish.glow) {
        // Show the glow over the base, as it reads in game.
        const glow = document.createElement("canvas");
        glow.width = glow.height = canvas.width;
        drawFinish(glow.getContext("2d"), canvas.width, finish, "glow");
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(glow, 0, 0);
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }
  /** Today's and this week's challenges with progress. */
  challengeStatus() {
    const { day, week } = calendarKeys(),
      ch = this.profile.challenges || {};
    const row = (c, store) => {
      const progress = Math.min(c.goal, store?.[c.id] || 0);
      return { ...c, progress, done: progress >= c.goal };
    };
    return {
      daily: dailyChallenges(day).map((c) => row(c, ch.day === day ? ch.daily : {})),
      weekly: row(weeklyChallenge(week), ch.week === week ? ch.weekly : {}),
    };
  }
  /** Finishing a practice track pays 75 XP, once per track. */
  awardPractice(track) {
    const id = `practice-${track}`;
    if (!["operator", "infiltrator"].includes(track) || this.profile.milestones.includes(id)) return 0;
    this.profile.milestones.push(id);
    this.profile.xp += 75;
    write("midnry-outpost-profile", this.profile);
    this.menu();
    return 75;
  }
  locker(tab) {
    if (tab) this.lockerTab = tab;
    if (this.g.running) this.g.pause();
    this.store.refresh();
    this.lockerContents();
    this.g.$(".mf-locker").showModal();
  }
  finishColor() {
    const finish = finishOf(this.weaponFinish());
    return finish.id === "standard" ? null : finish.colors[0];
  }
  paint(color) {
    return this.finishColor() &&
      ["#273b49", "#4a6873", "#294450", "#273d49", weaponOf(this.g.player.weapon).color].includes(
        color,
      )
      ? this.finishColor()
      : color;
  }
  observe() {
    const g = this.g,
      t = g.time;
    if (t < this.clock) {
      this.seen.clear();
      this.stepDistance = 0;
    }
    this.clock = t;
    const countdown = g.arena.countdown || 0,
      banner = g.$(".mf-countdown");
    banner.hidden = countdown <= 0 || !g.running;
    banner.textContent = countdown > 0 ? `GET READY / ${Math.ceil(countdown)}` : "";
    if (countdown > 0) {
      const beat = Math.ceil(countdown);
      if (beat !== this.countBeat && g.running) {
        this.audio.tone(beat === 1 ? 660 : 440, 0.1, 0.12);
        this.countBeat = beat;
      }
    } else this.countBeat = 0;
    const listener = g.camera(),
      audible =
        (g.running || g.online?.phase === "playing" || g.spectator?.active()) &&
        listener.hp > 0 &&
        !g.deathSequence &&
        !document.hidden;
    for (const e of g.combatants()) {
      const old = this.seen.get(e.id);
      this.seen.set(e.id, {
        shot: e.shotAt,
        reload: e.reloadUntil,
        hp: e.hp,
        hit: e.hitSeq,
        cores: e.coresCollected,
        x: e.x,
        y: e.y,
        steps: old?.steps || 0,
        work: old?.work || 0,
      });
      if (!old || !audible) continue;
      const p = listener,
        dist = Math.hypot(e.x - p.x, e.y - p.y),
        pan = Math.sin(Math.atan2(e.y - p.y, e.x - p.x) - p.a);
      if (old.shot !== e.shotAt && t - e.shotAt < 0.25 && (e.id === p.id || dist < 10)) {
        const v = spatialSound(p, e, g.arena.visible(p, e));
        this.audio.shot(
          weaponOf(e.weapon).kind,
          e.id === p.id ? 0 : v.pan,
          e.id === p.id ? 1 : v.gain * 0.7,
          v.cutoff,
        );
      }
      const entry = this.seen.get(e.id),
        distance = Math.hypot(e.x - old.x, e.y - old.y);
      if (e.hp > 0 && distance < 0.5) {
        entry.steps += distance;
        if (entry.steps > 0.45) {
          const v = spatialSound(p, e, g.arena.visible(p, e), 6);
          this.audio.step(
            e.id === p.id ? 0 : v.pan,
            e.id === p.id ? 0.65 : v.gain,
            g.mapId === "medevac",
            v.cutoff,
          );
          entry.steps = 0;
        }
        // Real and pretend work share the public posture and generic sound.
        if (e.crouching && t - entry.work > 0.8) {
          const v = spatialSound(p, e, g.arena.visible(p, e), 4);
          this.audio.hiss(0.06, 0.04 * v.gain, Math.min(1600, v.cutoff), v.pan);
          entry.work = t;
        }
      }
      if (e.id === g.selfId) {
        if (e.reloadUntil !== old.reload) this.audio.hiss(0.07, 0.12, 600);
        if (e.hp < old.hp) this.audio.tone(90, 0.12, 0.18, 0, "sawtooth", 45);
        if (e.hitSeq !== old.hit) this.audio.tone(1100, 0.035, 0.045);
        if (e.coresCollected > old.cores) this.audio.tone(740, 0.17, 0.1, 0, "sine", 980);
      }
    }
    this.lastStand(g, audible);
    this.hazardSounds(g, audible);
    this.battleMusic(g);
    this.ambience(g, audible);
    this.soundHint(g);
  }
  /** A short rising cue when a match starts or resumes (so you know sound
   * works), and in Blackout Protocol a quiet base ambience (air handling
   * and a low generator hum) so the base is never silent. */
  ambience(g, audible) {
    const running = Boolean(g.running && g.state === "playing");
    if (running !== this.wasRunning) {
      this.wasRunning = running;
      if (running) {
        this.audio.tone(520, 0.16, 0.07, 0, "triangle", 880);
        this.offHintUntil = this.audio.soundOn() ? 0 : performance.now() + 7000;
      }
    }
    if (!audible || g.mode !== "protocol" || !g.running) return;
    this.audio.bed("base-air", 0.03, 900);
    this.audio.bed("base-hum", 0.06, 150, { brown: true });
  }
  /** "Sound is off" pill in a match: always while the browser still blocks
   * audio, and for a few seconds at the start when it is switched off. */
  soundHint(g) {
    const hint = g.$(".mf-soundhint");
    if (!hint) return;
    const a = this.audio,
      blocked = !a.ctx || a.ctx.state !== "running",
      off = !a.soundOn(),
      show = Boolean(g.running) && (blocked || (off && performance.now() < (this.offHintUntil || 0)));
    if (hint.hidden === show) hint.hidden = !show;
    if (!show) return;
    const touch = matchMedia("(pointer: coarse)").matches,
      // With the mouse captured the pill can't be clicked: point to the menu.
      text = off
        ? touch || document.pointerLockElement !== g.canvas
          ? `Sound is off · ${touch ? "tap" : "click"} to turn on`
          : "Sound is off · Esc, then Sound on"
        : `Sound is paused · ${touch ? "tap" : "click or press a key"} to turn on`;
    const label = hint.querySelector("span");
    if (label.textContent !== text) label.textContent = text;
  }
  /** Music plays during a Last Signal round you are in, and builds with the
   * tension; it fades out when you pause, die or the round ends. */
  battleMusic(g) {
    const live =
      g.mode === "signal" &&
      g.running &&
      g.state === "playing" &&
      g.player?.hp > 0 &&
      !g.deathSequence &&
      !document.hidden &&
      this.audio.music > 0;
    const music = live ? this.audio.battle() : this.audio.score;
    if (!music) return;
    if (!live) return music.stop();
    music.setIntensity(battleIntensity(g));
    music.start();
    music.pump();
  }
  /** Disaster siren and weather, explosions near you, thunder. Game-time
   * events are keyed by id so each plays once. */
  hazardSounds(g, audible) {
    const a = g.arena,
      d = a?.disaster,
      p = g.camera();
    if (!audible || g.mode !== "signal" || !a) return;
    if (d) {
      const t = a.time,
        stage = t >= d.endAt ? 3 : t >= d.startAt ? 2 : t >= d.warnAt ? 1 : 0;
      if (stage !== this.disasterStage) {
        if (stage === 1 || stage === 2)
          for (let i = 0; i < 3; i++)
            setTimeout(() => this.audio.tone(i % 2 ? 520 : 760, 0.32, 0.12, 0, "square", i % 2 ? 760 : 520), i * 340);
        this.disasterStage = stage;
      }
      this.weatherSounds(g, d);
    }
    // Electrified: a dry electric crackle until it wears off.
    const self = g.player;
    if (self?.hp > 0 && self.shockUntil > a.time && performance.now() - (this.crackleAt || 0) > 140) {
      this.crackleAt = performance.now();
      this.audio.hiss(0.06, 0.1, 5200);
      if (Math.random() < 0.4) this.audio.tone(1800, 0.03, 0.04, 0, "square", 600);
    }
    this.fxHeard ||= new Set();
    // A disaster's own blast (damage at a strike) sounds as thunder or a
    // collapse, not as an explosion.
    const disasterAt = new Set(
      a.fx.filter((f) => f.kind === "lightning" || f.kind === "debris").map((f) => f.x + ":" + f.y),
    );
    for (const f of a.fx) {
      if (this.fxHeard.has(f.id)) continue;
      this.fxHeard.add(f.id);
      const dist = Math.hypot(f.x - p.x, f.y - p.y),
        // Sound takes time to arrive: 3 m per tile at 343 m/s.
        delay = (dist * 3) / 343,
        pan = Math.sin(Math.atan2(f.y - p.y, f.x - p.x) - p.a) * 0.7;
      if (f.kind === "lightning") {
        // Close: a tearing crack, then the boom; far: a deep roll.
        const near = Math.max(0, 1 - dist / 10);
        if (near > 0)
          this.audio.swell({ delay, attack: 0.005, duration: 0.25, gain: 0.32 * near, frequency: 2600, type: "highpass", pan });
        this.audio.swell({ delay: delay + 0.03, attack: 0.02, duration: 1.8 + (1 - near) * 1.2, gain: 0.26 + 0.2 * near, frequency: 420, end: 55, brown: true, pan });
        this.audio.swell({ delay: delay + 0.3, attack: 0.6, duration: 3.6, gain: 0.16, frequency: 160, end: 45, brown: true, pan: -pan * 0.5 });
      } else if (f.kind === "debris") {
        // The ground splitting: a deep thud and stone crumbling.
        const v = Math.max(0.12, 1 - dist / 16);
        this.audio.swell({ delay, attack: 0.01, duration: 1.1, gain: 0.45 * v, frequency: 240, end: 45, brown: true, pan });
        this.audio.swell({ delay: delay + 0.05, attack: 0.08, duration: 1.6, gain: 0.13 * v, frequency: 1100, end: 280, type: "bandpass", q: 0.9, pan });
        for (let i = 0; i < 4; i++)
          setTimeout(() => this.audio.hiss(0.05, 0.05 * v, 2400, pan), (delay + 0.1 + Math.random() * 0.7) * 1000);
      } else if (f.kind === "blast" && disasterAt.has(f.x + ":" + f.y)) {
        continue;
      } else if (dist < 14 && f.kind === "blast") {
        const v = Math.max(0.15, 1 - dist / 14);
        this.audio.hiss(0.45, 0.2 * v, f.kind === "blast" ? 1200 : 600);
        this.audio.tone(80, 0.35, 0.18 * v, 0, "sawtooth", 35);
      } else if (dist < 10 && f.kind === "heal") this.audio.tone(520, 0.3, 0.08, 0, "sine", 880);
      else if (dist < 10 && f.kind === "toxic") this.audio.hiss(0.6, 0.1, 2600);
    }
    if (this.fxHeard.size > 400) this.fxHeard = new Set(a.fx.map((f) => f.id));
  }
  /** Weather you can hear: the sandstorm's roar building as its wall comes
   * in, then wind gusting and grit; rain (muffled indoors) and thunder
   * rolling in from distant flashes; an earthquake's deep rumble, from a
   * faint foreshock to the main shaking. Held beds fade out on their own
   * when this stops being called. */
  weatherSounds(g, d) {
    const au = this.audio,
      t = g.arena.time,
      now = performance.now(),
      hz = g.military?.hazards,
      inside = !!g.military?.naturalLighting?.inside,
      ramp = (v) => Math.max(0, Math.min(1, v)),
      fadeOut = ramp((d.endAt + 1 - t) / 4);
    if (t < d.warnAt || t > d.endAt + 1) return;
    if (d.kind === "sandstorm") {
      const coming = ramp((t - d.warnAt) / (d.startAt - d.warnAt)),
        on = t >= d.startAt - 0.5,
        gust = hz?.wx?.gust?.() ?? 0.5;
      // Distant roar of the wall, deepening and growing as it closes in.
      au.bed("roar", (on ? 0.12 : 0.02 + 0.2 * coming * coming) * fadeOut, on ? 320 : 140 + 260 * coming, { brown: true });
      if (on) {
        au.bed("wind", (0.07 + 0.11 * gust) * fadeOut * (inside ? 0.5 : 1), (inside ? 400 : 520) + 800 * gust, { type: "bandpass", q: 0.8 });
        if (now > (this.gustAt || 0)) {
          this.gustAt = now + 2200 + Math.random() * 3000;
          au.swell({ attack: 0.9, duration: 2.8, gain: 0.08 * fadeOut, frequency: 420, end: 1500, type: "bandpass", q: 1.1, pan: (Math.random() - 0.5) * 1.2 });
        }
        // Sand ticking on your gear.
        if (!inside && Math.random() < 0.18) au.hiss(0.025, 0.018 * fadeOut, 7000, (Math.random() - 0.5) * 1.6);
      }
    } else if (d.kind === "storm") {
      const rain = hz?.wx?.rainLevel?.(d) ?? ramp((t - d.startAt + 2) / 3) * fadeOut,
        wind = ramp((t - d.warnAt) / 6) * fadeOut;
      au.bed("storm-wind", 0.05 * wind, 380, { type: "bandpass", q: 0.6 });
      au.bed("rain", 0.16 * rain, inside ? 900 : 3200, { type: inside ? "lowpass" : "bandpass", q: 0.4 });
      au.bed("rain-body", 0.09 * rain, inside ? 260 : 700, { brown: true });
      // Thunder from the distant flashes, a few seconds behind them.
      const sheet = hz?.sheetAt;
      if (sheet && sheet !== this.sheetHeard) {
        this.sheetHeard = sheet;
        au.swell({ delay: 1.2 + Math.random() * 3, attack: 0.5, duration: 3.8, gain: 0.13, frequency: 190, end: 40, brown: true, pan: (Math.random() - 0.5) * 1.4 });
      }
    } else if (d.kind === "quake") {
      const level = hz?.quakeLevel?.() ?? (t >= d.startAt && t < d.endAt ? 0.6 : 0);
      au.bed("rumble", 0.5 * level + 0.03 * ramp((t - d.warnAt) / 10), 55 + 90 * level, { brown: true });
      // Things rattling and settling while it shakes.
      if (level > 0.3 && now > (this.rattleAt || 0)) {
        this.rattleAt = now + 300 + Math.random() * 700;
        au.swell({ attack: 0.02, duration: 0.35, gain: 0.05 * level, frequency: 1400 + Math.random() * 1200, type: "bandpass", q: 3, pan: (Math.random() - 0.5) * 1.6 });
      }
    }
  }
  /** Last Signal last life: a heartbeat (faster below 30% health) and a
   * rising rush when the adrenaline kicks in. Real time, so it keeps its
   * rhythm when the frame rate drops. */
  lastStand(g, audible) {
    const p = g.player;
    if (g.mode !== "signal" || !audible || !p || p.hp <= 0 || p.lives !== 0) return;
    if (p.adrenalineUntil !== this.rushSeen) {
      this.rushSeen = p.adrenalineUntil;
      if (p.adrenalineUntil > g.time) {
        this.audio.hiss(0.6, 0.16, 2400);
        this.audio.tone(180, 0.45, 0.1, 0, "sawtooth", 720);
      }
    }
    const now = performance.now(),
      gap = p.hp / p.maxHp < 0.3 ? 650 : 1000;
    if (now - (this.beatAt || 0) < gap) return;
    this.beatAt = now;
    this.audio.tone(62, 0.11, 0.22, 0, "sine", 40);
    setTimeout(() => this.audio.tone(55, 0.1, 0.15, 0, "sine", 38), 170);
  }
  destroy() {
    this.audio.destroy();
  }
}
const pAlive = (g) => g.player?.hp > 0;
