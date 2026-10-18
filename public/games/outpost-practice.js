/** Offline-only rehearsal. Scenario fixtures live in a separate local arena;
 * every successful drill still goes through ProtocolArena's real validators.
 * This module is never imported by the room server or accepted as room input. */
import { ProtocolArena } from "./outpost-protocol.js";
import { PROTOCOL_MAP, TRANSPORT_MAP } from "./outpost-protocol-map.js";

export const PRACTICE_STEPS = Object.freeze([
  {
    id: "pack",
    title: "Pack a medical kit",
    hint: "Follow the ground trail to the medic locker. Press E or the action button, then pass the quick skill check.",
    detail:
      "Move with WASD or the left joystick; aim with the mouse or a right-side drag. This rehearsal needs one trauma kit. In a live mission the crew gathers all 9 items. Wrong answers can be corrected.",
  },
  {
    id: "load",
    title: "Load the medevac",
    hint: "Carry the kit to the hangar. Hold E or Load until the progress bar finishes.",
    detail:
      "You carry one medical item at a time. Moving or taking damage interrupts a hold. Follow the ground trail; Info opens the map.",
  },
  {
    id: "defuse",
    title: "Disable a located charge",
    hint: "A training charge is in the hangar tool recess. Get close, then hold Disable charge for six seconds.",
    detail:
      "This inert exercise charge has no countdown. Real infiltrators need three charges in separate rooms. Navigation only reveals charges your operator has located.",
  },
  {
    id: "report",
    title: "Report a fallen patrol",
    hint: "Approach the training casualty. Press F or Report to open a radio assembly.",
    detail:
      "The hangar casualty is a rehearsal fixture. Reporting cancels pending tasks. In real matches, share what you actually saw; uniforms never identify allegiance.",
  },
  {
    id: "vote",
    title: "Discuss and vote",
    hint: "Use the radio, then select a vote after the discussion timer ends. The training patrol will vote Skip.",
    detail:
      "A majority sends the accused into Last Stand against every other survivor. Ties or Skip return the crew to duty. This exercise demonstrates a vote without forcing combat.",
  },
  {
    id: "board",
    title: "Board the aircraft",
    hint: "Return to the loading pad and hold Board the medevac.",
    detail:
      "All living players board together. The reduced training manifest is ready; the real mission requires every medical item.",
  },
  {
    id: "oxygen",
    title: "Test aircraft oxygen",
    hint: "Follow the ground trail to the oxygen panel. Stop the valve needle in the green band, then set the test gauge.",
    detail:
      "Flight has routine work as well as sabotage. The training crew handles restraints and landing checks while you test oxygen. Flight progress waits during this drill.",
  },
  {
    id: "pilot",
    title: "Recover sabotaged autopilot",
    hint: "Reach the cockpit, Take helm, then use W to climb and A to steer left. Hold both safe bands for three seconds; Restore autopilot.",
    detail:
      "On touch, use the four flight buttons. Keep altitude at 50–85% and heading within ±18%. Autopilot is unavailable until a seated operator stabilizes the aircraft. If you crash, retry this drill.",
  },
]);

/** The infiltrator's side: five short drills on the real validators. */
export const INFILTRATOR_STEPS = Object.freeze([
  {
    id: "fake",
    title: "Blend in at a wall panel",
    hint: "The wall panel in front of you is your cover assignment. Walk up to it and hold E or the action button until it finishes.",
    detail:
      "Cover checks make you look busy. Careful: a real pickup removes a case from a cabinet, and sharp operators notice when someone works and nothing changes.",
  },
  {
    id: "eliminate",
    title: "Eliminate an isolated operator",
    hint: "A training operator is right in front of you. Press X or Eliminate while nobody else is watching.",
    detail:
      "Eliminations recharge for 25 seconds. A body stays where it falls until someone reports it, and anyone who saw you will remember.",
  },
  {
    id: "vent",
    title: "Escape through a hatch",
    hint: "You are standing on a maintenance hatch. Press B for Tactics and pick a linked exit.",
    detail:
      "Hatches link distant rooms. Only infiltrators can use them, and leaving a crime scene fast is half the job.",
  },
  {
    id: "sabotage",
    title: "Cut the power",
    hint: "Press B for Tactics, then choose Cut power.",
    detail:
      "Darkness shrinks everyone's sight to a few metres for 40 seconds, unless an operator repairs the generators first.",
  },
  {
    id: "plant",
    title: "Arm a base charge",
    hint: "A concealed socket is right in front of you. Walk up, hold E for eight seconds, then type the three-digit arming code.",
    detail:
      "Three charges in three different rooms start a 75-second countdown. Operators can still find and disable one.",
  },
]);

/** Which drills a track runs. */
export const PRACTICE_TRACKS = Object.freeze({ operator: PRACTICE_STEPS, infiltrator: INFILTRATOR_STEPS });

export class PracticeMission {
  constructor(index = 0, track = "operator") {
    this.track = PRACTICE_TRACKS[track] ? track : "operator";
    this.steps = PRACTICE_TRACKS[this.track];
    this.arena = new ProtocolArena({ interactiveTasks: true, rolePreference: this.track });
    this.selfId = "player";
    this.index = Math.max(0, Math.min(this.steps.length - 1, index));
    this.complete = false;
    this.failed = false;
    const a = this.arena,
      p = a.protocol,
      m = p.mission;
    // Quiet rehearsal participants cannot complete the player's exercises.
    // Normal offline smart AI and all online room rules remain unchanged.
    for (const e of a.entities) e.bot = false;
    for (const patient of m.patients) patient.decay = 0;
    if (this.track === "infiltrator") {
      this.prepare(true);
      return;
    }
    for (const item of m.manifest) item.required = item.id === "trauma" ? 1 : 0;
    this.stock = m.supplyStock.find((s) => s.id === "trauma-barracks");
    m.supplyStock = m.supplyStock.filter((s) => s.id === this.stock.id);
    this.stock.stock = 1;
    if (this.index >= 1) {
      this.stock.stock = 0;
      if (this.index === 1)
        a.privateFor(this.player).cargo = {
          id: "training-kit",
          sourceId: this.stock.id,
          supplyId: "trauma",
          name: "Trauma kit",
        };
      else m.manifest.find((i) => i.id === "trauma").loaded = 1;
    }
    this.prepare(true);
  }
  get player() {
    return this.arena.entities.find((e) => e.id === this.selfId);
  }
  get step() {
    return this.steps[this.index];
  }
  /** A walkable spot about `distance` tiles from a point (wall fixtures sit in walls). */
  near(point, distance = 1.2) {
    for (let r = distance; r <= distance + 1.5; r += 0.5)
      for (let k = 0; k < 8; k++) {
        const angle = (k * Math.PI) / 4,
          x = point.x + Math.cos(angle) * r,
          y = point.y + Math.sin(angle) * r;
        if (this.arena.canMove(x, y)) return { x, y, a: angle + Math.PI };
      }
    return { x: point.x, y: point.y };
  }
  input(input) {
    // Keep departure locked until the base drills finish. This filters a local
    // intention; it cannot complete or bypass any authoritative action.
    if (this.step?.id !== "board" && this.arena.context(this.player)?.kind === "depart")
      return { ...input, interact: false };
    return input;
  }
  place(point) {
    Object.assign(this.player, { x: point.x, y: point.y, a: point.a ?? 0 });
  }
  prepare(retry = false) {
    const a = this.arena,
      p = a.protocol,
      m = p.mission;
    if (this.track === "infiltrator") return this.prepareInfiltrator(retry);
    if (this.step.id === "pack") this.place({ x: this.stock.x + 2, y: this.stock.y });
    if (this.step.id === "load" && retry) this.place(m.loading);
    if (this.step.id === "defuse") {
      const site = PROTOCOL_MAP.sites.find((s) => s.id === "hangar-tool-recess");
      p.bombs = [
        { ...site, id: "training-charge", siteId: site.id, state: "armed", ownerId: null },
      ];
      p.armedCount = 1;
      if (retry) this.place({ x: site.x + 1, y: site.y });
      a.discover(this.player);
    }
    if (["report", "vote"].includes(this.step.id)) {
      const victim = a.entities.find((e) => e.id !== this.selfId && e.team === 0),
        site = PROTOCOL_MAP.sites.find((s) => s.id === "hangar-tool-recess");
      victim.hp = 0;
      Object.assign(victim, { x: site.x, y: site.y });
      if (!p.bodies.length)
        p.bodies.push({
          id: "training-body",
          victimId: victim.id,
          name: victim.name,
          x: site.x,
          y: site.y,
          reported: false,
          carriedBy: null,
        });
      if (retry) this.place({ x: site.x + 1, y: site.y });
      a.discover(this.player);
      if (this.step.id === "vote" && retry)
        a.startMeeting(this.player, "Training radio assembly", p.bodies[0]);
    }
    if (this.step.id === "board" && retry) this.place(m.loading);
    if (["oxygen", "pilot"].includes(this.step.id)) {
      if (m.phase === "base") {
        this.place(m.loading);
        a.departMission(this.player);
      }
      for (const task of m.flightTasks)
        task.done = task.id !== "oxygen" || this.step.id === "pilot";
      m.vehicle.progress = 0;
      if (this.step.id === "oxygen" && retry)
        this.place(m.flightTasks.find((t) => t.id === "oxygen"));
      if (this.step.id === "pilot") {
        a.unsafeFlight(true);
        // Start the recovery drill just outside the cockpit. The player must
        // still take the helm, steer, stabilize and restore autopilot themselves.
        this.place({ x: TRANSPORT_MAP.helm.x, y: TRANSPORT_MAP.helm.y + 2, a: -Math.PI / 2 });
      }
    }
  }
  prepareInfiltrator(retry) {
    const a = this.arena,
      p = a.protocol,
      self = a.privateFor(this.player);
    const id = this.step.id;
    if (id === "fake") {
      // Use a panel clear of supply cabinets and charge sockets (both take priority).
      const clear = (st, list, r) => !list.some((o) => Math.hypot(o.x - st.x, o.y - st.y) < r);
      const station =
        p.stations.find((st) => clear(st, p.mission.supplyStock, 0.5) && clear(st, p.sites, 2.6)) ??
        p.stations[0];
      const task = self.tasks[0];
      Object.assign(task, { stationId: station.id, name: station.name, done: false });
      this.place(this.near(station, 2));
    }
    if (id === "eliminate") {
      self.killReadyAt = 0;
      // An open spot, the target 0.8 tiles further out, the player facing them.
      const spot = this.near(PROTOCOL_MAP.emergency, 1.5),
        out = spot.a - Math.PI;
      let tx = spot.x + Math.cos(out) * 0.8,
        ty = spot.y + Math.sin(out) * 0.8;
      if (!a.canMove(tx, ty)) [tx, ty] = [spot.x, spot.y];
      this.place({ x: tx === spot.x ? spot.x - Math.cos(out) * 0.8 : spot.x, y: ty === spot.y ? spot.y - Math.sin(out) * 0.8 : spot.y, a: out });
      const target = a.entities.find((e) => e.team === 0 && e.hp > 0);
      this.target = target.id;
      Object.assign(target, { x: tx, y: ty, hp: 100 });
    }
    if (id === "vent") {
      self.ventReadyAt = 0;
      const vent = p.vents[0];
      this.ventFrom = vent.id;
      this.place({ x: vent.x, y: vent.y });
    }
    if (id === "sabotage") {
      self.sabotageReadyAt = 0;
      p.sabotage.powerUntil = p.sabotage.commsUntil = 0;
    }
    if (id === "plant") {
      p.bombs = [];
      p.armedCount = 0;
      p.detonateAt = null;
      const site = p.sites[0];
      this.place(this.near(site, retry ? 1 : 2));
    }
  }
  update() {
    if (this.complete || this.failed) return false;
    const a = this.arena,
      p = a.protocol,
      m = p.mission,
      self = a.privateFor(this.player);
    if (a.state === "ended") {
      this.failed = true;
      this.failureReason =
        (p.resultReason || "The drill ended.") + " Restart this drill to try again.";
      return true;
    }
    if (
      this.step.id === "vote" &&
      p.phase === "roam" &&
      p.meeting?.result &&
      !Object.hasOwn(p.meeting.votes, this.selfId)
    ) {
      this.failed = true;
      this.failureReason =
        "The voting timer ended before you voted. Restart this drill to rehearse the radio assembly again.";
      return true;
    }
    if (this.step.id === "oxygen") m.vehicle.progress = 0;
    if (this.step.id === "vote" && p.phase === "vote")
      for (const e of a.entities)
        if (e.id !== this.selfId && e.hp > 0 && !Object.hasOwn(p.meeting.votes, e.id))
          a.action(e, { seq: a.privateFor(e).actionSeq + 1, op: "vote", target: "skip" });
    const vent = p.vents.find((v) => v.id !== this.ventFrom && Math.hypot(v.x - this.player.x, v.y - this.player.y) < 0.3);
    const passed = {
      fake: self.tasks.some((t) => t.done),
      eliminate: a.entities.find((e) => e.id === this.target)?.hp === 0,
      vent: Boolean(vent),
      sabotage: (p.sabotage.powerUntil > a.time || p.sabotage.commsUntil > a.time) && self.contributions.sabotage > 0,
      plant: p.bombs.some((b) => b.ownerId === this.selfId),
      pack: !!self.cargo,
      load: m.manifest.find((i) => i.id === "trauma").loaded === 1,
      defuse: !p.bombs.some((b) => b.id === "training-charge") && self.contributions.defuses > 0,
      report:
        !!p.meeting &&
        p.meeting.caller === this.selfId &&
        p.bodies.some((b) => b.id === "training-body" && b.reported),
      vote:
        p.phase === "roam" && !!p.meeting?.result && Object.hasOwn(p.meeting.votes, this.selfId),
      board: m.phase === "transport",
      oxygen: m.flightTasks.find((t) => t.id === "oxygen").done,
      pilot: m.vehicle.autopilot && self.contributions.recoveries > 0,
    }[this.step.id];
    if (!passed) return false;
    if (++this.index === this.steps.length) {
      this.complete = true;
      return true;
    }
    this.prepare();
    return true;
  }
}

/** Small coach chip; fuller instructions and exits live inside existing Info. */
export class ProtocolPractice {
  constructor(g) {
    this.g = g;
    this.active = false;
    this.startButton = document.createElement("button");
    this.startButton.className = "mf-practice-start";
    this.startButton.textContent = "Practice";
    g.protocolUI.menu.append(this.startButton);
    this.style = document.createElement("style");
    this.style.textContent = `
      midnry-fps .mf-practice-coach{position:absolute;z-index:5;top:calc(70px + var(--mf-safe-top));left:14px;width:min(400px,calc(100% - 28px));min-height:44px;padding:8px 12px;text-align:left;border:1px solid #c6d5b2;border-radius:12px;background:#14221fec;color:#edf5e6;font:600 12px/1.35 var(--mf-body)}
      midnry-fps .mf-practice-coach small{display:block;font:400 12px/1.4 var(--mf-body);color:#c5d3c0;margin-top:3px}
      midnry-fps .mf-practice-details button{width:100%;min-height:44px;margin:5px 0}
      midnry-fps .mf-practice-chooser{width:min(420px,calc(100% - 28px));padding:20px;border-radius:18px;border:1px solid #8a9a8c66;background:#13201b;color:#eef4ea;font:14px/1.45 var(--mf-body)}
      midnry-fps .mf-practice-chooser::backdrop{background:rgba(5,12,9,.55)}
      midnry-fps .mf-practice-chooser h2{margin:0 0 6px;font-size:20px}
      midnry-fps .mf-practice-chooser button{display:block;width:100%;min-height:52px;margin:8px 0 0;text-align:left;padding:10px 14px;border-radius:12px;border:1px solid #8f9d7a;background:#2c3d28;color:#eef5e6;font:600 14px/1.35 var(--mf-body)}
      midnry-fps .mf-practice-chooser button small{display:block;font-weight:400;color:#c5d3c0}
      midnry-fps .mf-practice-chooser .mf-practice-cancel{text-align:center;background:#24302b}
      midnry-fps .mf-practice-details[hidden],midnry-fps .mf-practice-coach[hidden],midnry-fps .mf-practice-start[hidden]{display:none!important}
      midnry-fps .mf-practicing.mf-protocol-piloting .mf-practice-coach{display:none}
      @media(pointer:coarse),(max-width:700px){midnry-fps .mf-practice-coach{max-width:calc(100% - 28px)}}
    `;
    g.shell.append(this.style);
    this.coach = document.createElement("button");
    this.coach.className = "mf-practice-coach";
    this.coach.hidden = true;
    this.coach.setAttribute("aria-haspopup", "dialog");
    this.coach.innerHTML = "<b></b><small>Tap for instructions</small>";
    g.shell.append(this.coach);
    this.details = document.createElement("section");
    this.details.className = "mf-practice-details";
    this.details.hidden = true;
    this.details.innerHTML =
      '<h3></h3><p class="mf-practice-hint"></p><p class="mf-practice-explanation"></p><button class="mf-practice-retry">Restart this drill</button><button class="mf-practice-exit">Leave practice · fresh offline mission</button>';
    g.protocolUI.focus.info.prepend(this.details);
    // Track chooser: operator or infiltrator, with saved progress.
    this.chooser = document.createElement("dialog");
    this.chooser.className = "mf-practice-chooser";
    this.chooser.setAttribute("aria-label", "Choose a practice track");
    this.chooser.innerHTML =
      '<h2>Practice</h2><p>Short guided drills on the real rules. Finish a track once for +75 XP.</p><button data-track="operator"></button><button data-track="infiltrator"></button><button class="mf-practice-cancel">Back</button>';
    g.shell.append(this.chooser);
    g.on(this.chooser, "keydown", (e) => e.stopPropagation());
    g.on(this.chooser, "click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      this.chooser.close();
      if (button.dataset.track) this.start(this.saved(button.dataset.track), button.dataset.track);
    });
    g.on(this.startButton, "click", () => this.choose());
    g.on(this.coach, "click", () => g.protocolUI.focus.open());
    g.on(this.details.querySelector(".mf-practice-retry"), "click", () => this.retry());
    g.on(this.details.querySelector(".mf-practice-exit"), "click", () => this.exit(true));
  }
  available() {
    return (
      !this.g.online &&
      !this.g.connecting &&
      this.g.ui.playChoice !== "online" &&
      this.g.militaryLoaded
    );
  }
  /** Saved drill index for a track (0 when finished or never started). */
  saved(track) {
    try {
      const data = JSON.parse(localStorage.getItem("midnry-outpost-practice") || "{}");
      const index = Number(data?.[track]);
      return Number.isInteger(index) && index > 0 && index < PRACTICE_TRACKS[track].length ? index : 0;
    } catch {
      return 0;
    }
  }
  save(track, index) {
    try {
      const data = JSON.parse(localStorage.getItem("midnry-outpost-practice") || "{}");
      data[track] = index;
      localStorage.setItem("midnry-outpost-practice", JSON.stringify(data));
    } catch {}
  }
  choose() {
    if (!this.available()) return;
    const done = this.g.retention?.profile?.milestones || [];
    for (const [track, label, blurb] of [
      ["operator", "Operator", "Collect, load, defuse, report, vote, board, fly"],
      ["infiltrator", "Infiltrator", "Blend in, eliminate, use hatches, sabotage, arm charges"],
    ]) {
      const steps = PRACTICE_TRACKS[track],
        at = this.saved(track),
        finished = done.includes(`practice-${track}`);
      const button = this.chooser.querySelector(`[data-track="${track}"]`);
      button.innerHTML = "";
      button.append(`${label} · ${steps.length} drills${at ? ` · resume at ${at + 1}` : finished ? " · ✅ done" : " · +75 XP"}`);
      const small = document.createElement("small");
      small.textContent = blurb;
      button.append(small);
    }
    this.chooser.showModal();
    this.chooser.querySelector("[data-track]").focus({ preventScroll: true });
  }
  start(index = 0, track = this.mission?.track || "operator") {
    if (!this.available()) return false;
    const g = this.g;
    const preference = this.preference ?? g.rolePreference;
    g.reset();
    this.preference = preference;
    g.rolePreference = track;
    this.active = true;
    this.mission = new PracticeMission(index, track);
    g.arena = this.mission.arena;
    g.mapId = g.arena.mapId;
    g.protocolCache = null;
    g.protocolUI.briefRound = g.arena.roundId;
    g.shell.classList.add("mf-practicing");
    g.updateKit();
    g.start();
    g.protocolUI.update(true);
    this.refresh();
    return true;
  }
  retry() {
    if (this.active)
      this.start(
        this.mission.index >= this.mission.steps.length ? 0 : this.mission.index,
        this.mission.track,
      );
  }
  reset() {
    this.active = false;
    this.mission = null;
    this.title = null;
    this.coach.hidden = this.details.hidden = true;
    this.g.shell.classList.remove("mf-practicing");
    if (this.preference != null) {
      this.g.rolePreference = this.preference;
      this.preference = null;
    }
  }
  exit(deploy = false) {
    this.g.reset();
    if (deploy) this.g.start();
  }
  update() {
    if (!this.active) return;
    if (this.g.online || this.g.arena !== this.mission.arena) {
      this.reset();
      return;
    }
    if (this.mission.update()) {
      this.g.protocolCache = null;
      // Remember where this track got to; finishing it pays once.
      this.save(this.mission.track, this.mission.complete ? 0 : this.mission.index);
      if (this.mission.complete) this.g.retention?.awardPractice?.(this.mission.track);
      if (this.mission.complete || this.mission.failed) {
        this.g.protocolUI.focus.open();
      }
    }
    this.refresh();
  }
  filterInput(input) {
    return this.active && !this.g.online ? this.mission.input(input) : input;
  }
  refresh() {
    const g = this.g,
      m = this.mission;
    this.startButton.hidden = !!g.online || g.ui.playChoice === "online";
    this.startButton.disabled = !this.available();
    this.details.hidden = !this.active;
    this.coach.hidden =
      !this.active ||
      !g.running ||
      g.protocolUI.hasDialogOpen() ||
      !g.protocolUI.focus.urgent.hidden ||
      ["discussion", "vote"].includes(g.arena.protocol.phase);
    if (!this.active) return;
    if (m.step?.id !== "board" && g.protocolUI.nearby?.context?.kind === "depart") {
      g.protocolUI.holdButton.disabled = true;
      g.protocolUI.holdButton.firstChild.textContent = "Finish base drills first";
    }
    const title = m.complete
      ? "Practice complete"
      : m.failed
        ? "Drill paused · try again"
        : `${m.track === "infiltrator" ? "Infiltrator" : "Operator"} ${m.index + 1}/${m.steps.length} · ${m.step.title}`;
    // Coaching text changes per drill, rather than forcing layout every frame.
    if (this.title === title) return;
    this.title = title;
    this.coach.querySelector("b").textContent = title;
    const cue = {
      pack: "Follow trail · E / action to inspect",
      load: "Follow trail · hold Load",
      defuse: "Follow trail · hold Disable charge",
      report: "Approach casualty · F / Report",
      vote: "Discuss, then vote",
      board: "Follow trail · hold Board",
      oxygen: "Follow trail · E / action to test",
      pilot: "Take helm · stabilize · restore autopilot",
      fake: "Walk to the panel ahead · hold E",
      eliminate: "X / Eliminate the training operator",
      vent: "B · Tactics · pick a hatch exit",
      sabotage: "B · Tactics · Cut power",
      plant: "Walk to the socket ahead · hold E · type the code",
    };
    this.coach.querySelector("small").textContent =
      (cue[m.step?.id] || "Ready to deploy") + " · Tap for help";
    this.details.querySelector("h3").textContent = title;
    this.details.querySelector(".mf-practice-hint").textContent =
      m.failureReason ||
      m.step?.hint ||
      `All ${m.steps.length} drills completed. Deploy when you are ready.`;
    this.details.querySelector(".mf-practice-explanation").textContent =
      m.step?.detail ||
      "Live matches restore the full medical manifest, patient timers and smart AI. Finishing a track once earns 75 XP; practice never changes an online room.";
    this.details.querySelector(".mf-practice-retry").textContent = m.complete
      ? "Replay guided practice"
      : "Restart this drill";
  }
  dispose() {
    this.reset();
    this.style.remove();
    this.startButton.remove();
    this.chooser.remove();
    this.coach.remove();
    this.details.remove();
  }
}
