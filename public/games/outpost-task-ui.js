/** Compact equipment panel. Reads only the local recipient's challenge. */
export class MissionTaskPanel {
  constructor(ui) {
    this.ui = ui;
    this.dialog = ui.dialog("mf-mission-task", "Mission equipment check");
    this.dialog.innerHTML = `<div class="mf-protocol-dialoghead"><h2></h2><button type="button" class="mf-task-cancel">Cancel</button></div><p class="mf-task-step"></p><p class="mf-task-instruction"></p><div class="mf-task-choices"></div><form class="mf-task-gauge" hidden><label>Test gauge <output></output><input type="range" min="0" max="100" value="50" aria-label="Equipment test gauge"></label><button type="submit">Confirm gauge</button></form><p class="mf-task-feedback" role="status" aria-live="polite"></p><progress max="1" value="0" aria-label="Equipment cycle progress"></progress><p class="mf-task-safety"></p>`;
    this.style = document.createElement("style");
    this.style.textContent = `midnry-fps .mf-mission-task {width:min(400px,calc(100% - 28px));max-height:calc(100dvh - 36px);overflow:auto;padding:20px;border-radius:20px;} midnry-fps .mf-mission-task::backdrop {background:rgba(5,12,9,.38);} midnry-fps .mf-mission-task h2 {font-size:20px;margin:0;} midnry-fps .mf-mission-task .mf-task-choices {display:grid;gap:9px;} midnry-fps .mf-mission-task button {min-height:44px;white-space:normal;touch-action:manipulation;} midnry-fps .mf-mission-task .mf-task-choices button {text-align:left;width:100%;padding:11px 14px;} midnry-fps .mf-mission-task input[type=range] {width:100%;height:44px;touch-action:pan-x;accent-color:#c7deb4;} midnry-fps .mf-mission-task output {float:right;font-variant-numeric:tabular-nums;} midnry-fps .mf-mission-task progress {width:100%;height:8px;accent-color:#c7deb4;} midnry-fps .mf-mission-task .mf-task-safety {font-size:12px;line-height:1.5;margin-bottom:0;color:#c6d0ca;} midnry-fps .mf-mission-task .mf-task-step {font-size:12px;color:#c6d0ca;} midnry-fps .mf-mission-task .mf-task-feedback {min-height:20px;font-size:13px;}`;
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
    const input = this.dialog.querySelector("input");
    ui.g.on(input, "input", () => {
      this.dialog.querySelector("output").textContent = `${input.value}%`;
    });
    ui.g.on(this.dialog.querySelector("form"), "submit", (event) => {
      event.preventDefault();
      this.submit(input.value);
    });
  }
  submit(value) {
    if (!this.game || this.game.complete || this.ui.view.time < this.game.nextAt) return;
    this.pendingKey = this.key;
    this.ui.enqueue("task-step", this.game.id, value);
    for (const button of this.dialog.querySelectorAll("[data-task-choice],form button"))
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
      !this.ui.alive() ||
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
    const key = `${game.id}:${game.index}:${game.nextAt}:${game.feedback}`;
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
      (game.range ? form.querySelector("input") : choices.querySelector("button"))?.focus({
        preventScroll: true,
      });
    }
    for (const button of this.dialog.querySelectorAll("[data-task-choice],form button"))
      button.disabled = view.time < game.nextAt || this.pendingKey === key;
    this.dialog.querySelector(".mf-task-step").textContent =
      `${Math.min(game.total, game.index + 1)} / ${game.total} checks · ${Math.max(0, Math.ceil(game.deadline - view.time))}s remaining`;
    this.dialog.querySelector("progress").value = Math.min(
      1,
      view.protocol.self.channel.progress / view.protocol.self.channel.duration,
    );
    const vehicle = view.protocol.mission?.vehicle;
    this.dialog.querySelector(".mf-task-safety").textContent =
      vehicle &&
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
