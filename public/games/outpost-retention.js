import { FINISHES, profileOf, awardMatch, levelOf } from "./outpost-progression.js";
import { weaponOf, OUTFITS } from "./outpost-sim.js";
import { spatialSound } from "./outpost-spatial-audio.js";
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
    write("midnry-outpost-audio", { volume: this.volume, muted: this.muted });
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
export class Retention {
  constructor(g) {
    this.g = g;
    this.profile = profileOf(read("midnry-outpost-profile"));
    this.audio = new FieldAudio();
    this.seen = new Map();
    this.reset();
    g.$(".mf-modes").insertAdjacentHTML(
      "beforebegin",
      `<section class="mf-results" hidden aria-label="Match results"><h2>ROUND DEBRIEF</h2><div class="mf-resultstats"></div><p class="mf-earned" role="status"></p><button class="mf-again">PLAY AGAIN →</button><p class="mf-againnote"></p></section>`,
    );
    g.$(".mf-network").insertAdjacentHTML(
      "beforebegin",
      `<details class="mf-retention"><summary>PLAYER EXPERIENCE / <span class="mf-level"></span></summary><label>Bot difficulty<select class="mf-difficulty" aria-label="Bot difficulty"><option value="easy">Easy · relaxed reactions</option><option value="normal" selected>Normal · standard combat</option><option value="hard">Hard · faster, more alert</option></select></label><p>Health and weapon damage stay the same. Online, the host chooses before starting.</p><label>Sound volume<input class="mf-volume" aria-label="Sound volume" type="range" min="0" max="100" value="35"></label><label><input class="mf-mute" type="checkbox"> Mute sound</label><button class="mf-lockeropen">RANGER LOCKER →</button></details>`,
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
    g.on(g.$(".mf-again"), "click", () => this.again());
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
    this.summary = null;
    if (this.g.$(".mf-results")) this.g.$(".mf-results").hidden = true;
  }
  menu() {
    const g = this.g;
    if (!g.$(".mf-difficulty")) return;
    g.$(".mf-difficulty").value = g.difficulty || "normal";
    g.$(".mf-difficulty").disabled = Boolean(
      g.online && (g.online.host !== g.selfId || g.online.phase !== "lobby"),
    );
    g.$(".mf-level").textContent = `LEVEL ${levelOf(this.profile)} · ${this.profile.xp} XP`;
    if (this.summary) {
      const waiting = g.online && (g.online.phase !== "ended" || g.online.host !== g.selfId);
      g.$(".mf-again").disabled = Boolean(waiting);
      g.$(".mf-again").textContent = waiting ? "WAITING FOR HOST" : "PLAY AGAIN →";
      g.$(".mf-againnote").textContent = g.online
        ? "Same room, teams and loadouts. The host starts the rematch; use the deployment button to return to the lobby."
        : "Same mode, arena, loadout and difficulty. A two-second countdown starts the next round.";
    }
  }
  finish(won) {
    const g = this.g;
    if (g.academy?.active) return;
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
    const earned = awardMatch(this.profile, summary);
    this.profile = earned.profile;
    write("midnry-outpost-profile", this.profile);
    this.summary = summary;
    g.$(".mf-results").hidden = false;
    g.$(".mf-results h2").textContent = won ? "VICTORY / ROUND DEBRIEF" : "ROUND DEBRIEF";
    const stats = [
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
      if (g.online.host === g.selfId && g.online.phase === "ended") g.onlineAction("rematch");
      return;
    }
    g.reset();
    g.arena.countdown = 2;
    g.start();
  }
  lockerContents() {
    const focused = document.activeElement?.dataset?.outfit;
    const p = this.profile,
      next = FINISHES.find((f) => f.xp > p.xp);
    this.g.$(".mf-lockerbody").innerHTML =
      `<h2>Level ${levelOf(p)} / ${p.xp} XP</h2><p>${p.matches} completed rounds · ${p.wins} victories</p><progress max="150" value="${p.xp % 150}" aria-label="Progress to next level"></progress><p>${150 - (p.xp % 150)} XP to the next level. ${next ? `${Math.max(0, next.xp - p.xp)} XP to ${next.name}.` : "All weapon finishes unlocked."}</p><label>Weapon finish<select class="mf-finish" aria-label="Weapon finish">${FINISHES.map((f) => `<option value="${f.id}" ${f.id === p.skin ? "selected" : ""} ${f.xp > p.xp ? "disabled" : ""}>${f.name}${f.xp > p.xp ? ` · ${f.xp} XP` : ""}</option>`).join("")}</select></label><div class="mf-finishpreview" style="--finish:${this.finishColor() || "#4a6873"}">${FINISHES.find((f) => f.id === p.skin).name}</div><h3>Uniforms / ${Object.keys(OUTFITS).length}</h3><p>All outfits are available now. AI combatants wear the same uniforms. Outfits change appearance only.${this.g.online && this.g.online.phase !== "lobby" ? " Choose your outfit in the next lobby." : " Choose yours here or in the deployment menu."}</p><div class="mf-outfitgrid">${Object.values(
        OUTFITS,
      )
        .map(
          (o) =>
            `<button class="mf-outfitcard" data-outfit="${o.id}" aria-label="Wear ${o.name}" aria-pressed="${this.g.outfit === o.id}" ${this.g.online && this.g.online.phase !== "lobby" ? "disabled" : ""}><img src="/games/outfits/${o.id}.webp?v=skins-20261011" alt="${o.name} outfit" loading="lazy" width="240" height="320"><strong>${o.name}</strong><small>${o.description}</small></button>`,
        )
        .join(
          "",
        )}</div><h3>Optional challenges</h3><p>Complete three rounds: ${Math.min(3, p.matches)}/3 · ${p.milestones.includes("first-three") ? "Reward earned" : "50 bonus XP"}</p><p>Finish rounds with three loadouts: ${Math.min(3, p.weapons.length)}/3 · ${p.milestones.includes("explorer") ? "Reward earned" : "50 bonus XP"}</p><p>XP rewards completed matches and victories. Boot Camp and losses under 15 seconds do not earn XP. All rewards change appearance only. There are no streak penalties or purchases.</p><p>Progress is saved on this browser and device. Clearing browser data removes it; it does not sync between devices.</p>`;
    if (focused) this.g.$(`[data-outfit="${focused}"]`)?.focus({ preventScroll: true });
  }
  locker() {
    if (this.g.running) this.g.pause();
    this.lockerContents();
    this.g.$(".mf-locker").showModal();
  }
  finishColor() {
    return FINISHES.find((f) => f.id === this.profile.skin && f.xp <= this.profile.xp)?.color;
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
  }
  destroy() {
    this.audio.destroy();
  }
}
const pAlive = (g) => g.player?.hp > 0;
