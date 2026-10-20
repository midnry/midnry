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
import { weaponOf, OUTFITS, mapOf } from "./outpost-sim.js";
import { standingsHTML } from "./outpost-series.js";
import { BattleMusic, battleIntensity } from "./outpost-music.js";
import { spatialSound } from "./outpost-spatial-audio.js";
import { recordMatch } from "./outpost-account.js";
import { finishOf, naira, drawFinish } from "./outpost-finishes.js";
import { OutpostStore } from "./outpost-store.js";
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
/** Gesture-unlocked procedural audio; each game instance owns and closes its context. */
class FieldAudio {
  constructor() {
    const p = read("midnry-outpost-audio");
    this.volume = Number.isFinite(p?.volume) ? Math.max(0, Math.min(1, p.volume)) : 0.35;
    this.muted = Boolean(p?.muted);
    this.music = Number.isFinite(p?.music) ? Math.max(0, Math.min(1, p.music)) : 0.6;
    this.voices = 0;
  }
  unlock() {
    if (this.ctx?.state === "closed") return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.ctx ??= new Audio();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.level();
        const n = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, n, n);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      void this.ctx.resume().catch(() => {});
    } catch {}
  }
  level() {
    if (this.master)
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.025);
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
    this.hiss(0.045, 0.055 * gain, Math.min(cutoff, metal ? 1100 : 420), pan);
    this.tone(metal ? 120 : 70, 0.055, 0.045 * gain, pan, "sine", 35);
  }
  result(won) {
    for (const [i, n] of (won ? [440, 554, 659] : [220, 165]).entries())
      this.tone(n, 0.25, 0.13, 0, "triangle", n * (1 + i * 0.04));
  }
  destroy() {
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
      `<section class="mf-results" hidden aria-label="Match results"><h2>ROUND DEBRIEF</h2><div class="mf-resultstats"></div><div class="mf-seriesboard" hidden></div><p class="mf-earned" role="status"></p><button class="mf-again">PLAY AGAIN →</button><p class="mf-againnote"></p><button class="mf-tomenu">Main menu</button></section>`,
    );
    g.$(".mf-network").insertAdjacentHTML(
      "beforebegin",
      `<details class="mf-retention"><summary>PLAYER EXPERIENCE / <span class="mf-level"></span></summary><label>Bot difficulty<select class="mf-difficulty" aria-label="Bot difficulty"><option value="easy">Easy · relaxed reactions</option><option value="normal" selected>Normal · standard combat</option><option value="hard">Hard · faster, more alert</option></select></label><p>Health and weapon damage stay the same. Online, the host chooses before starting.</p><label>Your name<input class="mf-playername" maxlength="16" autocomplete="nickname" spellcheck="false" placeholder="Shown above your head"></label><label><input class="mf-reveal" type="checkbox" checked> Reveal roles when someone is voted out</label><label>Match modifier<select class="mf-modifier" aria-label="Match modifier"><option value="random">Random each match</option>${MODIFIERS.map((m) => `<option value="${m.id}">${m.name}</option>`).join("")}</select></label><label>Sound volume<input class="mf-volume" aria-label="Sound volume" type="range" min="0" max="100" value="35"></label><label>Music volume<input class="mf-music" aria-label="Music volume" type="range" min="0" max="100" value="60"></label><label><input class="mf-mute" type="checkbox"> Mute sound</label><button class="mf-lockeropen">RANGER LOCKER →</button></details>`,
    );
    g.shell.insertAdjacentHTML(
      "beforeend",
      `<div class="mf-countdown" hidden role="status" aria-live="polite"></div><dialog class="mf-locker" aria-label="Ranger locker"><div class="mf-lockerhead"><b>RANGER LOCKER</b><button class="mf-lockerclose">BACK</button></div><div class="mf-lockerbody"></div></dialog>`,
    );
    g.$(".mf-volume").value = String(this.audio.volume * 100);
    g.$(".mf-mute").checked = this.audio.muted;
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
      if (!e.target.matches(".mf-finish")) return;
      const finish = FINISHES.find((f) => f.id === e.target.value && f.xp <= this.profile.xp);
      if (finish) {
        this.profile.skin = finish.id;
        write("midnry-outpost-profile", this.profile);
        this.lockerContents();
      }
    });
    g.on(g.$(".mf-lockerbody"), "click", (e) => {
      const tile = e.target.closest("[data-finish]");
      if (tile) {
        const finish = finishOf(tile.dataset.finish);
        if (this.finishUsable(finish)) {
          this.profile.skin = finish.id;
          write("midnry-outpost-profile", this.profile);
          this.lockerContents();
          this.g.$(`[data-finish="${finish.id}"]`)?.focus({ preventScroll: true });
        } else if (finish.kind === "premium") this.store.buy(finish.id);
        else if (finish.kind === "pass") (window.top || window).location.assign("/pricing");
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
        again.textContent = "REMATCH →";
        note.textContent = "Same mode, arena, loadout and difficulty. A two-second countdown starts the next round.";
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
    const earned = awardMatch(this.profile, summary);
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
      ["Damage dealt", summary.damage],
      ["Survived", `${summary.seconds}s`],
      ["Cores collected", summary.cores],
      ["Level", levelOf(this.profile)],
    ];
    g.$(".mf-resultstats").innerHTML = stats
      .map(([label, value]) => `<div><small>${label}</small><strong>${value}</strong></div>`)
      .join("");
    g.$(".mf-earned").textContent = earned.xp
      ? `+${earned.xp} XP · ${earned.bonuses.length ? earned.bonuses.join(" · ") : "Every completed round counts."}`
      : earned.reason || "Reward already collected for this round.";
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
    this.g.$(".mf-lockerbody").innerHTML =
      `<h2>Level ${levelOf(p)} / ${p.xp} XP</h2><p>${p.matches} completed rounds · ${p.wins} victories</p><progress max="150" value="${p.xp % 150}" aria-label="Progress to next level"></progress><p>${150 - (p.xp % 150)} XP to the next level. ${next ? `${Math.max(0, next.xp - p.xp)} XP to ${next.name}.` : "All XP finishes unlocked."}</p>${this.finishGrid()}<h3>Today's challenges · +${DAILY_XP} XP each</h3>${this.challengeStatus()
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
                : `Buy · ${naira(f.price)}`;
      const locked = !usable && f.kind === "xp";
      return `<button type="button" class="mf-finishtile${on ? " is-on" : ""}${usable ? "" : " is-locked"}" data-finish="${f.id}" aria-pressed="${on}" ${locked ? "disabled" : ""}><canvas width="96" height="96" aria-hidden="true"></canvas><strong>${escapeText(f.name)}</strong><small>${escapeText(f.blurb || (f.kind === "xp" ? "Earned with XP." : ""))}</small><span class="mf-finishstate">${state}</span></button>`;
    }).join("");
    return `<h3>Weapon finishes</h3><p>Your gun in first person. Looks only, never stats.</p><div class="mf-finishgrid">${tiles}</div><p class="mf-storestatus" role="status" aria-live="polite">${escapeText(store.message || (store.ready || store.signedIn === null ? "" : store.signedIn === false ? "Sign in with your Midnry account to buy finishes." : "The store is opening soon."))}</p>`;
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
  locker() {
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
      const now = performance.now();
      if (stage === 2 && now - (this.weatherAt || 0) > (d.kind === "quake" ? 450 : 800)) {
        this.weatherAt = now;
        if (d.kind === "sandstorm") this.audio.hiss(0.9, 0.08, 900);
        if (d.kind === "quake") this.audio.tone(46, 0.5, 0.2, 0, "sawtooth", 32);
      }
    }
    // Electrified: a dry electric crackle until it wears off.
    const self = g.player;
    if (self?.hp > 0 && self.shockUntil > a.time && performance.now() - (this.crackleAt || 0) > 140) {
      this.crackleAt = performance.now();
      this.audio.hiss(0.06, 0.1, 5200);
      if (Math.random() < 0.4) this.audio.tone(1800, 0.03, 0.04, 0, "square", 600);
    }
    this.fxHeard ||= new Set();
    for (const f of a.fx) {
      if (this.fxHeard.has(f.id)) continue;
      this.fxHeard.add(f.id);
      const dist = Math.hypot(f.x - p.x, f.y - p.y);
      if (f.kind === "lightning") {
        this.audio.hiss(0.7, 0.22, 500);
        this.audio.tone(70, 0.7, 0.2, 0, "sawtooth", 30);
      } else if (dist < 14 && (f.kind === "blast" || f.kind === "debris")) {
        const v = Math.max(0.15, 1 - dist / 14);
        this.audio.hiss(0.45, 0.2 * v, f.kind === "blast" ? 1200 : 600);
        this.audio.tone(80, 0.35, 0.18 * v, 0, "sawtooth", 35);
      } else if (dist < 10 && f.kind === "heal") this.audio.tone(520, 0.3, 0.08, 0, "sine", 880);
      else if (dist < 10 && f.kind === "toxic") this.audio.hiss(0.6, 0.1, 2600);
    }
    if (this.fxHeard.size > 400) this.fxHeard = new Set(a.fx.map((f) => f.id));
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
