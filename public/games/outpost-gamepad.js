/** Game controller support (Xbox, PlayStation, Switch Pro, MFi; anything the
 * browser reports with the standard mapping). In play it feeds the same
 * inputs as keyboard, mouse and touch, so the rules never change; in menus
 * and dialogs the D-pad or left stick moves focus, A selects and B goes back.
 *
 *   Left stick  move (or fly while at the helm)   Right stick  look
 *   A  interact (hold)    B  report body    X  ability    Y  emergency radio
 *   LB tactics            RB eliminate      RT fire (Last Stand)
 *   L3 / LT sprint        View  Info        Start  menu / resume
 *   D-pad left / right    switch player while spectating
 */
const BUTTON = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, L3: 10, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.2;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), summary, [role="tab"], [tabindex]:not([tabindex="-1"])';

const CSS = `
/* Controller glyphs on the action keys once a controller is in use. */
midnry-fps .mf-shell[data-input="pad"] .mf-protocol-actions .mf-protocol-hold { --mf-key: "A"; }
midnry-fps .mf-shell[data-input="pad"] .mf-protocol-actions .mf-protocol-report { --mf-key: "B"; }
midnry-fps .mf-shell[data-input="pad"] .mf-protocol-actions .mf-protocol-ability { --mf-key: "X"; }
midnry-fps .mf-shell[data-input="pad"] .mf-protocol-actions .mf-protocol-emergency { --mf-key: "Y"; }
midnry-fps .mf-shell[data-input="pad"] .mf-protocol-actions .mf-protocol-eliminate { --mf-key: "RB"; }
midnry-fps .mf-shell[data-input="pad"] .mf-protocol-actions .mf-protocol-openactions { --mf-key: "LB"; }
midnry-fps .mf-shell[data-input="pad"] .mf-protocol-actions button::after { border-radius: 50% !important; font-size: 12px !important; }
midnry-fps .mf-padtoast { position: absolute; z-index: 900; left: 50%; bottom: 26px; transform: translateX(-50%); max-width: calc(100% - 32px); padding: 10px 18px; border: 1px solid #ffffff2b; border-radius: 4px; background: #070b0ae8; color: #eef2ee; font: 600 15px var(--mf-display); letter-spacing: 0.04em; text-align: center; pointer-events: none; transition: opacity 0.3s; }
midnry-fps .mf-padtoast[hidden] { display: none; }
midnry-fps .mf-padtoast b { color: var(--mf-accent); }
`;

/** Buttons A may press without the player first moving onto them. */
const PRIMARY = ".mf-start, .mf-protocol-begin, .mf-task-stop, .mf-again, .mf-compat-recommend, button[type='submit'], .mf-confirm [value='cancel']";
const EXIT = /^(done|cancel|back|close|menu)$/i;
const axis = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * ((Math.abs(v) - DEAD) / (1 - DEAD)));

export class OutpostGamepad {
  constructor(g) {
    this.g = g;
    this.prev = [];
    this.held = new Set();
    this.drivingTouch = false;
    this.nextMove = 0;
    this.last = performance.now();
    this.style = document.createElement("style");
    this.style.textContent = CSS;
    this.toast = document.createElement("div");
    this.toast.className = "mf-padtoast";
    this.toast.hidden = true;
    this.toast.setAttribute("role", "status");
    g.shell.append(this.style, this.toast);
    this.onConnect = (event) => {
      if (event.gamepad?.mapping !== "standard" && event.gamepad?.mapping !== "") return;
      this.say("<b>Controller connected.</b> A interact · B report · X ability · Y radio · Start menu");
      this.ensureLoop();
    };
    this.onDisconnect = () => this.say("Controller disconnected.");
    window.addEventListener("gamepadconnected", this.onConnect);
    window.addEventListener("gamepaddisconnected", this.onDisconnect);
    // Mouse, touch or keyboard hand the glyphs back.
    this.onOther = (event) => {
      if (event.isTrusted) g.shell.removeAttribute("data-input");
    };
    for (const type of ["pointerdown", "keydown"]) g.shell.addEventListener(type, this.onOther, true);
    if (typeof navigator.getGamepads === "function" && [...navigator.getGamepads()].some(Boolean)) this.ensureLoop();
  }

  ensureLoop() {
    if (this.frame) return;
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.poll();
    };
    this.frame = requestAnimationFrame(loop);
  }

  say(html) {
    this.toast.innerHTML = html;
    this.toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast.hidden = true), 4000);
  }

  pad() {
    if (typeof navigator.getGamepads !== "function") return null;
    return [...navigator.getGamepads()].find((p) => p && p.connected) || null;
  }

  poll() {
    const g = this.g,
      pad = this.pad(),
      now = performance.now(),
      dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!pad) return this.release();
    const down = pad.buttons.map((b) => b.pressed || b.value > 0.5);
    const pressed = (i) => down[i] && !this.prev[i];
    const released = (i) => !down[i] && this.prev[i];
    const lx = axis(pad.axes[0] || 0),
      ly = axis(pad.axes[1] || 0),
      rx = axis(pad.axes[2] || 0),
      ry = axis(pad.axes[3] || 0);
    const active = down.some(Boolean) || lx || ly || rx || ry;
    if (active) g.shell.dataset.input = "pad";
    const dialog = [...g.root.querySelectorAll("dialog[open]")].pop();
    const menu = !g.$(".mf-modal")?.hidden;
    const playing = g.running && !menu && !dialog;
    if (playing) {
      this.lastDialog = null;
      this.play(pad, down, pressed, released, lx, ly, rx, ry, dt);
    }
    else {
      this.release();
      this.navigate(down, pressed, lx, ly, dialog, menu, now);
    }
    this.prev = down;
  }

  /** Hold a keyboard key for as long as a button is down. */
  hold(key, on) {
    const keys = this.g.keys;
    if (on && !this.held.has(key)) {
      this.held.add(key);
      keys.add(key);
    } else if (!on && this.held.has(key)) {
      this.held.delete(key);
      keys.delete(key);
    }
  }

  /** Tap a key through the same handlers the keyboard uses. */
  tap(key, target = this.g.shell) {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
  }

  play(pad, down, pressed, released, lx, ly, rx, ry, dt) {
    const g = this.g,
      ui = g.protocolUI;
    // Movement: the same channel as the on-screen joystick.
    if (lx || ly || this.drivingTouch) {
      g.touch.x = lx;
      g.touch.y = ly;
      this.drivingTouch = Boolean(lx || ly);
    }
    // At the helm the flight model reads W/A/S/D.
    const piloting = Boolean(ui?.piloting);
    this.hold("w", piloting && ly < -0.5);
    this.hold("s", piloting && ly > 0.5);
    this.hold("a", piloting && lx < -0.5);
    this.hold("d", piloting && lx > 0.5);
    // Look: a curved response, like most console shooters.
    if (rx || ry) g.applyLook(rx * Math.abs(rx) * 900 * dt, ry * Math.abs(ry) * 600 * dt);
    this.hold("shift", down[BUTTON.L3] || down[BUTTON.LT]);
    if (g.mode === "protocol") {
      this.hold("e", down[BUTTON.A]);
      if (pressed(BUTTON.A)) ui?.startEquipmentCheck?.();
      if (pressed(BUTTON.B)) this.tap("f");
    } else {
      // Last Signal: A jumps; B crouches (hold to lie down; while sprinting, slides).
      if (pressed(BUTTON.A)) g.requestJump?.();
      if (pressed(BUTTON.B)) g.stancePress?.();
      if (released(BUTTON.B)) g.stanceRelease?.();
    }
    if (pressed(BUTTON.X)) this.tap("q");
    if (pressed(BUTTON.Y)) g.mode === "protocol" ? this.tap("c") : g.requestSlide?.();
    if (pressed(BUTTON.RB)) this.tap("x");
    if (pressed(BUTTON.LB)) this.tap("b");
    if (pressed(BUTTON.RT)) {
      g.firing = true;
      g.shoot?.();
    }
    if (released(BUTTON.RT)) g.firing = false;
    if (pressed(BUTTON.VIEW)) g.$(".mf-protocol-infoopen")?.click();
    if (pressed(BUTTON.START)) this.tap("Escape");
    if (pressed(BUTTON.LEFT)) this.tap("ArrowLeft");
    if (pressed(BUTTON.RIGHT)) this.tap("ArrowRight");
  }

  release() {
    for (const key of [...this.held]) this.hold(key, false);
    if (this.drivingTouch) {
      this.g.touch.x = 0;
      this.g.touch.y = 0;
      this.drivingTouch = false;
    }
    if (this.g.firing && this.prev[BUTTON.RT]) this.g.firing = false;
  }

  /** Menus and dialogs: move focus spatially, A selects, B goes back. */
  navigate(down, pressed, lx, ly, dialog, menu, now) {
    const g = this.g;
    const scope = dialog || (menu ? g.$(".mf-modal") : null);
    if (!scope) return;
    let dx = (down[BUTTON.RIGHT] ? 1 : 0) - (down[BUTTON.LEFT] ? 1 : 0) + Math.sign(Math.abs(lx) > 0.6 ? lx : 0);
    let dy = (down[BUTTON.DOWN] ? 1 : 0) - (down[BUTTON.UP] ? 1 : 0) + Math.sign(Math.abs(ly) > 0.6 ? ly : 0);
    dx = Math.sign(dx);
    dy = Math.sign(dy);
    // A newly opened window starts on its main action.
    if (dialog && dialog !== this.lastDialog) {
      const start = this.first(dialog);
      if (start) start.focus({ focusVisible: true });
      // Never leave an automatically focused Cancel under the A button.
      else if (dialog.contains(document.activeElement)) document.activeElement.blur();
      this.autoFocused = start || null;
    }
    this.lastDialog = dialog || null;
    const current = g.root.activeElement || document.activeElement;
    const inside = current && scope.contains(current) ? current : null;
    if ((dx || dy) && now >= this.nextMove) {
      const fresh = !this.moving;
      this.nextMove = now + (fresh ? 320 : 140);
      this.moving = true;
      // A focused list box or slider takes left / right as a value change.
      if (dx && inside?.matches("select")) {
        const options = [...inside.options].filter((o) => !o.disabled);
        const at = options.indexOf(inside.selectedOptions[0]);
        const next = options[Math.max(0, Math.min(options.length - 1, at + dx))];
        if (next && next !== inside.selectedOptions[0]) {
          inside.value = next.value;
          inside.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } else if (dx && inside?.matches('input[type="range"]')) {
        if (dx > 0) inside.stepUp();
        else inside.stepDown();
        inside.dispatchEvent(new Event("input", { bubbles: true }));
        inside.dispatchEvent(new Event("change", { bubbles: true }));
      } else this.move(scope, inside, dx, dy);
    }
    if (!dx && !dy) {
      this.moving = false;
      this.nextMove = 0;
    }
    const pressed0 = (i) => pressed(i);
    // Equipment checks: A stops the needle wherever focus is.
    if (pressed0(BUTTON.A) && dialog?.matches(".mf-mission-task") && g.protocolUI?.taskPanel?.game?.kind === "needle") {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true, cancelable: true }));
      this.prev = down;
      return;
    }
    if (pressed0(BUTTON.A)) {
      // Nothing focused yet: A acts on the screen's main button, as on consoles.
      const target = inside || this.first(scope);
      if (target && !inside) target.focus({ focusVisible: true });
      // Unselected: only a main action is pressed; anything else is just selected.
      if (target && (inside || target.matches(PRIMARY)) && !(EXIT.test(target.textContent.trim()) && target !== this.chosen)) {
        if (target.matches('input[type="checkbox"]')) target.click();
        else if (target.matches("input:not([type]), input[type='text'], textarea")) target.focus();
        else target.click();
      }
    }
    if (pressed0(BUTTON.B)) this.back(dialog);
    if (pressed0(BUTTON.START)) {
      if (dialog) this.back(dialog);
      else g.$(".mf-start")?.click();
    }
    // Shoulder buttons switch settings sections.
    if (dialog && (pressed0(BUTTON.LB) || pressed0(BUTTON.RB))) {
      const tabs = [...dialog.querySelectorAll('[role="tab"]')];
      if (tabs.length) {
        const at = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
        const next = tabs[(at + (pressed0(BUTTON.RB) ? 1 : -1) + tabs.length) % tabs.length];
        next.click();
        next.focus({ focusVisible: true });
      }
    }
  }

  candidates(scope) {
    return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => {
      if (el.closest("[hidden], [inert]")) return false;
      const r = el.getBoundingClientRect(),
        cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    });
  }

  /** The screen's main action: never Cancel / Close unless it is all there is. */
  first(scope) {
    const list = this.candidates(scope);
    return list.find((el) => el.matches(PRIMARY)) || list.find((el) => !EXIT.test(el.textContent.trim())) || (scope.matches?.("dialog") ? null : list[0]);
  }

  move(scope, from, dx, dy) {
    const list = this.candidates(scope);
    if (!list.length) return;
    if (!from) return this.first(scope)?.focus({ focusVisible: true });
    const a = from.getBoundingClientRect(),
      ax = a.left + a.width / 2,
      ay = a.top + a.height / 2;
    let best = null,
      score = Infinity;
    for (const el of list) {
      if (el === from) continue;
      const b = el.getBoundingClientRect(),
        bx = b.left + b.width / 2,
        by = b.top + b.height / 2,
        ox = bx - ax,
        oy = by - ay;
      // Only candidates in the pressed direction; prefer straight lines.
      const along = dx ? ox * dx : oy * dy,
        across = dx ? Math.abs(oy) : Math.abs(ox);
      if (along <= 4) continue;
      const s = along + across * 2.2;
      if (s < score) {
        score = s;
        best = el;
      }
    }
    if (best) {
      this.chosen = best;
      best.focus({ focusVisible: true });
      best.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
  }

  /** B: close the topmost dialog through its own Done / Cancel / Back button. */
  back(dialog) {
    if (!dialog) {
      // The pause menu: B resumes, like Start.
      if (this.g.state === "playing") this.g.$(".mf-start")?.click();
      return;
    }
    const close = [...dialog.querySelectorAll("button")].find(
      (b) => !b.disabled && /^(done|cancel|back|close|menu)$/i.test(b.textContent.trim()),
    );
    if (close) close.click();
    else dialog.close();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.release();
    window.removeEventListener("gamepadconnected", this.onConnect);
    window.removeEventListener("gamepaddisconnected", this.onDisconnect);
    for (const type of ["pointerdown", "keydown"]) this.g.shell.removeEventListener(type, this.onOther, true);
    this.style.remove();
    this.toast.remove();
    clearTimeout(this.toastTimer);
  }
}
