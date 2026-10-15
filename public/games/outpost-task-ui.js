/** Compact equipment panel. Reads only the local recipient's challenge. */
export class MissionTaskPanel {
  constructor(ui) {
    this.ui = ui;
    this.dialog = ui.dialog("mf-mission-task", "Mission equipment check");
    this.dialog.innerHTML = `<div class="mf-protocol-dialoghead"><h2></h2><button type="button" class="mf-task-cancel">Cancel</button></div><p class="mf-task-step"></p><p class="mf-task-instruction"></p><div class="mf-task-choices"></div><div class="mf-task-skill" hidden></div><form class="mf-task-gauge" hidden><label>Test gauge <output></output><input type="range" min="0" max="100" value="50" aria-label="Equipment test gauge"></label><button type="submit">Confirm gauge</button></form><p class="mf-task-feedback" role="status" aria-live="polite"></p><progress max="1" value="0" aria-label="Equipment cycle progress"></progress><p class="mf-task-safety"></p>`;
    this.style = document.createElement("style");
    this.style.textContent = `midnry-fps .mf-mission-task {width:min(400px,calc(100% - 28px));max-height:calc(100dvh - 36px);overflow:auto;padding:20px;border-radius:20px;} midnry-fps .mf-mission-task::backdrop {background:rgba(5,12,9,.38);} midnry-fps .mf-mission-task h2 {font-size:20px;margin:0;} midnry-fps .mf-mission-task .mf-task-choices {display:grid;gap:9px;} midnry-fps .mf-mission-task button {min-height:44px;white-space:normal;touch-action:manipulation;} midnry-fps .mf-mission-task .mf-task-choices button {text-align:left;width:100%;padding:11px 14px;} midnry-fps .mf-mission-task input[type=range] {width:100%;height:44px;touch-action:pan-x;accent-color:#c7deb4;} midnry-fps .mf-mission-task output {float:right;font-variant-numeric:tabular-nums;} midnry-fps .mf-mission-task progress {width:100%;height:8px;accent-color:#c7deb4;} midnry-fps .mf-mission-task .mf-task-safety {font-size:12px;line-height:1.5;margin-bottom:0;color:#c6d0ca;} midnry-fps .mf-mission-task .mf-task-step {font-size:12px;color:#c6d0ca;} midnry-fps .mf-mission-task .mf-task-feedback {min-height:20px;font-size:13px;}
midnry-fps .mf-task-skill {display:grid;gap:12px;margin:6px 0 4px;}
midnry-fps .mf-task-needlebar {position:relative;height:46px;border-radius:12px;background:#26332d;border:1px solid #8a9a8c66;overflow:hidden;}
midnry-fps .mf-task-zone {position:absolute;top:0;bottom:0;background:#5fbf7a;opacity:.85;}
midnry-fps .mf-task-needle {position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:#fff3c4;box-shadow:0 0 8px #ffe08a;}
midnry-fps .mf-mission-task .mf-task-stop {min-height:52px;font-weight:800;letter-spacing:.08em;background:#e8c35a !important;color:#1a1608 !important;border:0;border-radius:12px;}
midnry-fps .mf-task-flash {display:flex;justify-content:center;gap:8px;min-height:58px;align-items:center;font:800 34px/1 ui-monospace,monospace;letter-spacing:.2em;color:#fff3c4;}
midnry-fps .mf-task-flash.mf-task-hidden {color:#8fa197;}
midnry-fps .mf-task-chip {width:40px;height:40px;border-radius:10px;border:2px solid #0006;}
midnry-fps .mf-task-keys {display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
midnry-fps .mf-task-keys button {min-height:48px;font:700 20px var(--mf-body);border-radius:10px;}
midnry-fps .mf-task-wires {display:grid;grid-template-columns:1fr 1fr;gap:8px;}
midnry-fps .mf-task-wires button {min-height:56px;border-radius:12px;border:2px solid #0006;font:800 14px var(--mf-body);color:#0b0f0c;}
midnry-fps .mf-mission-task [data-wire="r"] {background:#e2604f !important;}
midnry-fps .mf-mission-task [data-wire="g"] {background:#5fbf7a !important;}
midnry-fps .mf-mission-task [data-wire="b"] {background:#5d9ee8 !important;}
midnry-fps .mf-mission-task [data-wire="y"] {background:#e8c35a !important;}
midnry-fps .mf-mission-task .mf-task-wires button {color:#0b0f0c !important;}
midnry-fps .mf-mission-task .mf-task-wires button:disabled {opacity:.55;}
@media (prefers-reduced-motion: reduce) {midnry-fps .mf-task-needle {box-shadow:none;}}`;
    ui.g.shell.append(this.style);
    ui.g.on(this.dialog.querySelector(".mf-task-cancel"), "click", () => this.cancel());
    ui.g.on(this.dialog, "cancel", (event) => {
      event.preventDefault();
      this.cancel();
    });
    ui.g.on(this.dialog.querySelector(".mf-task-choices"), "click", (event) => {
      const button = event.target.closest("[data-task-choice]");
      if (button && !button.disabled) this.submit(button.dataset.taskChoice);
    });
    const skill = this.dialog.querySelector(".mf-task-skill");
    ui.g.on(skill, "click", (event) => {
      const button = event.target.closest("button");
      if (!button || button.disabled) return;
      if (button.matches(".mf-task-stop")) this.stopNeedle();
      else if (button.dataset.key) this.press(button.dataset.key);
      else if (button.dataset.wire) this.press(button.dataset.wire);
    });
    ui.g.on(this.dialog, "keydown", (event) => {
      const kind = this.game?.kind;
      if (!kind) return;
      if (kind === "needle" && (event.code === "Space" || event.key === "e" || event.key === "E" || event.key === "Enter")) {
        event.preventDefault();
        this.stopNeedle();
      } else if (kind === "code" && /^[0-9]$/.test(event.key)) this.press(event.key);
      else if (kind === "code" && event.key === "Backspace") this.press("del");
      else if (kind === "sequence" && /^[rgby]$/i.test(event.key)) this.press(event.key.toLowerCase());
    });
    const input = this.dialog.querySelector("input");
    ui.g.on(input, "input", () => {
      this.dialog.querySelector("output").textContent = `${input.value}%`;
    });
    ui.g.on(this.dialog.querySelector("form"), "submit", (event) => {
      event.preventDefault();
      this.submit(input.value);
    });
  }
  /** The needle sweeps 0→100→0 once per period, on this device's clock. */
  needlePosition() {
    const period = (this.game?.period || 1.5) * 1000;
    const phase = ((performance.now() - this.needleStart) % period) / period;
    return phase < 0.5 ? phase * 200 : (1 - phase) * 200;
  }
  animateNeedle() {
    cancelAnimationFrame(this.needleFrame);
    const needle = this.dialog.querySelector(".mf-task-needle");
    if (!needle || this.game?.kind !== "needle" || !this.dialog.open) return;
    needle.style.left = `${this.needlePosition()}%`;
    this.needleFrame = requestAnimationFrame(() => this.animateNeedle());
  }
  stopNeedle() {
    if (this.game?.kind !== "needle") return;
    const at = this.needlePosition();
    cancelAnimationFrame(this.needleFrame);
    const needle = this.dialog.querySelector(".mf-task-needle");
    if (needle) needle.style.left = `${at}%`;
    this.submit(at.toFixed(1));
  }
  /** A digit, a wire colour or "del", for code and sequence steps. */
  press(key) {
    const game = this.game;
    if (!game || game.code || game.seq || this.ui.view.time < game.nextAt) return;
    if (key === "del") this.entry = this.entry.slice(0, -1);
    else if (this.entry.length < (game.length || 4)) this.entry += key;
    this.drawEntry();
    if (this.entry.length >= (game.length || 4)) this.submit(this.entry);
  }
  drawEntry() {
    const flash = this.dialog.querySelector(".mf-task-flash");
    if (!flash || !this.game) return;
    const length = this.game.length || 4;
    flash.replaceChildren();
    flash.classList.add("mf-task-hidden");
    if (this.game.kind === "code") flash.textContent = this.entry.padEnd(length, "•");
    else
      for (let i = 0; i < length; i++) {
        const chip = document.createElement("span");
        chip.className = "mf-task-chip";
        if (this.entry[i]) chip.dataset.wire = this.entry[i];
        else chip.style.background = "#26332d";
        flash.append(chip);
      }
  }
  /** Build the controls for a skill step: needle, keypad or wire buttons. */
  drawSkill(game) {
    const skill = this.dialog.querySelector(".mf-task-skill");
    skill.hidden = !game.kind;
    skill.replaceChildren();
    cancelAnimationFrame(this.needleFrame);
    if (!game.kind) return;
    const WIRES = { r: "Red", g: "Green", b: "Blue", y: "Yellow" };
    if (game.kind === "needle") {
      const touch = matchMedia("(pointer: coarse)").matches;
      skill.innerHTML = `<div class="mf-task-needlebar" aria-hidden="true"><span class="mf-task-zone"></span><i class="mf-task-needle"></i></div><button type="button" class="mf-task-stop">${touch ? "STOP" : "STOP · Space"}</button>`;
      const zone = skill.querySelector(".mf-task-zone");
      zone.style.left = `${game.zone.from}%`;
      zone.style.width = `${game.zone.to - game.zone.from}%`;
      this.needleStart = performance.now();
      this.animateNeedle();
      skill.querySelector("button").focus({ preventScroll: true });
      return;
    }
    const flash = document.createElement("div");
    flash.className = "mf-task-flash";
    flash.setAttribute("aria-live", "polite");
    skill.append(flash);
    const secret = game.code || game.seq;
    if (secret) {
      if (game.code) flash.textContent = game.code;
      else
        for (const c of game.seq) {
          const chip = document.createElement("span");
          chip.className = "mf-task-chip";
          chip.dataset.wire = c;
          chip.setAttribute("aria-label", WIRES[c]);
          flash.append(chip);
        }
      const note = document.createElement("p");
      note.textContent = "Memorise it…";
      skill.append(note);
      return;
    }
    this.drawEntry();
    const pad = document.createElement("div");
    if (game.kind === "code") {
      pad.className = "mf-task-keys";
      for (const key of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0"]) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.key = key;
        b.textContent = key === "del" ? "⌫" : key;
        if (key === "del") b.setAttribute("aria-label", "Delete");
        pad.append(b);
      }
    } else {
      pad.className = "mf-task-wires";
      for (const [c, name] of Object.entries(WIRES)) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.wire = c;
        b.textContent = `${name} · ${c.toUpperCase()}`;
        pad.append(b);
      }
    }
    skill.append(pad);
    pad.querySelector("button")?.focus({ preventScroll: true });
  }
  submit(value) {
    if (!this.game || this.game.complete || this.ui.view.time < this.game.nextAt) return;
    this.pendingKey = this.key;
    this.ui.enqueue("task-step", this.game.id, value);
    for (const button of this.dialog.querySelectorAll("[data-task-choice],form button,.mf-task-skill button"))
      button.disabled = true;
  }
  cancel() {
    if (this.game) {
      this.cancelled = this.game.id;
      this.ui.enqueue("task-cancel", this.game.id);
    }
    this.close();
    this.ui.g.shell.focus({ preventScroll: true });
  }
  close() {
    cancelAnimationFrame(this.needleFrame);
    if (this.dialog.open) this.dialog.close();
    this.key = "";
    this.pendingKey = null;
  }
  update(view, gameplay) {
    const game = view?.protocol?.self?.channel?.challenge;
    this.game = game;
    if (
      !gameplay ||
      !game ||
      view.protocol.phase !== "roam" ||
      (!this.ui.alive() && view.protocol.self.channel?.kind !== "ghost") ||
      game.id === this.cancelled ||
      this.ui.brief.open ||
      this.ui.guide.open ||
      this.ui.focus?.info.open
    ) {
      this.close();
      return;
    }
    if (!this.dialog.open) {
      this.dialog.showModal();
      this.ui.releaseMouse();
      this.key = "";
    }
    const key = `${game.id}:${game.index}:${game.nextAt}:${game.feedback}:${game.code ?? ""}${game.seq ?? ""}`;
    if (key !== this.key) {
      this.key = key;
      this.dialog.querySelector("h2").textContent = game.title;
      this.dialog.querySelector(".mf-task-instruction").textContent = game.prompt;
      this.dialog.querySelector(".mf-task-feedback").textContent = game.feedback;
      const choices = this.dialog.querySelector(".mf-task-choices");
      choices.replaceChildren();
      for (const option of game.options) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.taskChoice = option.id;
        button.textContent = option.label;
        choices.append(button);
      }
      const form = this.dialog.querySelector("form");
      form.hidden = !game.range;
      form.querySelector("button").disabled = false;
      if (game.range) {
        const input = form.querySelector("input");
        input.min = game.range.min;
        input.max = game.range.max;
        input.value = "50";
        this.dialog.querySelector("output").textContent = "50%";
      }
      this.entry = "";
      this.drawSkill(game);
      if (!game.kind)
        (game.range ? form.querySelector("input") : choices.querySelector("button"))?.focus({
          preventScroll: true,
        });
    }
    for (const button of this.dialog.querySelectorAll("[data-task-choice],form button,.mf-task-skill button"))
      button.disabled = view.time < game.nextAt || this.pendingKey === key;
    this.dialog.querySelector(".mf-task-step").textContent =
      `${Math.min(game.total, game.index + 1)} / ${game.total} checks · ${Math.max(0, Math.ceil(game.deadline - view.time))}s remaining`;
    this.dialog.querySelector("progress").value = Math.min(
      1,
      view.protocol.self.channel.progress / view.protocol.self.channel.duration,
    );
    const vehicle = view.protocol.mission?.vehicle;
    this.dialog.querySelector(".mf-task-safety").textContent = !this.ui.alive()
      ? "Remote support from the radio room. A meeting interrupts this check."
      : vehicle &&
      !vehicle.autopilot &&
      !vehicle.underControl &&
      !vehicle.arrived &&
      view.protocol.mission.phase === "transport"
        ? "Flight emergency: cancel this check if you need to take the cockpit helm."
        : "Stay at the equipment. Movement, damage or a meeting interrupts this check. The mission continues while you work.";
  }
  reset() {
    this.close();
    this.cancelled = null;
    this.game = null;
  }
  dispose() {
    this.close();
    this.dialog.remove();
    this.style.remove();
  }
}
