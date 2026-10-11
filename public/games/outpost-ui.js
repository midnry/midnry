/** Menu layout and previews only. All gameplay stays in the shared simulation. */
import { mapOf, weaponOf } from "./outpost-content.js";
export class MenuUI {
  constructor(g) {
    this.g = g;
    const panel = g.$(".mf-panel"),
      modes = g.$(".mf-modes"),
      learn = g.$(".mf-learn");
    g.$("h1").innerHTML = "Outpost <em>Zero.</em>";
    g.$(".mf-eyebrow").textContent = "MIDNRY / FIELD OPERATIONS";
    const practice = g.$('[data-mode="training"]');
    practice.textContent = "Practice";
    for (const [id, title, detail] of [
      ["signal", "Play Solo", "You + 7 rivals"],
      ["duo", "Play Duo", "You + an AI partner"],
    ]) {
      const button = g.$(`[data-mode="${id}"]`);
      button.innerHTML = `${title}<small>${detail}</small>`;
      button.setAttribute("aria-label", title);
    }
    modes.insertAdjacentHTML(
      "beforeend",
      '<button class="mf-onlinechoice" aria-label="Play Online" aria-expanded="false" aria-controls="outpost-room">Play Online<small>Invite your friends</small></button>',
    );
    // Reuse the existing buttons and listeners, so keyboard and touch share behavior.
    learn.prepend(practice);
    g.$(".mf-boot").textContent = "Tutorial";
    g.$(".mf-guide").textContent = "Field Guide";
    g.$(".mf-graphics").textContent = "Settings";
    learn.append(g.$(".mf-lockeropen"));
    g.$(".mf-lockeropen").textContent = "Locker";
    const level = g.$(".mf-level");
    level.classList.add("mf-progresslabel");
    panel.append(level);
    const kit = g.$(".mf-kit"),
      notes = document.createElement("details");
    notes.className = "mf-kitnotes";
    notes.innerHTML = "<summary>About this map & weapon</summary>";
    for (const selector of [".mf-mapinfo", ".mf-weaponinfo", ".mf-kitnote"])
      notes.append(g.$(selector));
    kit.after(notes);
    for (const [type, selector] of [
      ["map", ".mf-mapselect"],
      ["weapon", ".mf-weaponselect"],
    ]) {
      const label = g.$(selector).closest("label");
      label.firstChild.textContent = type === "map" ? "Map" : "Weapon";
      label.insertAdjacentHTML(
        "beforeend",
        `<canvas class="mf-preview mf-${type}preview" width="240" height="112" role="img"></canvas><small class="mf-${type}hint"></small>`,
      );
    }
    notes.after(g.$(".mf-start"));
    const help = document.createElement("details");
    help.className = "mf-controlshelp";
    help.innerHTML = "<summary>Controls & shortcuts</summary>";
    const instructions = g.$(".mf-help");
    instructions.innerHTML =
      "<b>Touch:</b> left stick to move; drag the right side to aim. SPRINT toggles sprinting; SLIDE slides while moving forward. FIRE shoots, R reloads, and the ability button uses your charged super.<br><b>Keyboard:</b> WASD to move, mouse to aim, click or Space to fire. R reloads, Q uses your super, Hold Shift to sprint; press C or Ctrl while sprinting forward to slide. Esc or P opens the menu.";
    help.append(instructions);
    panel.append(help);
    const network = g.$(".mf-network");
    g.$(".mf-codeinput").setAttribute("autocapitalize", "characters");
    g.$(".mf-codeinput").setAttribute("autocomplete", "off");
    g.$(".mf-codeinput").spellcheck = false;
    network.id = "outpost-room-" + Math.random().toString(36).slice(2);
    g.$(".mf-onlinechoice").setAttribute("aria-controls", network.id);
    network.querySelector("summary").textContent = "Online room";
    network.querySelector("p").textContent =
      "Create a room or enter a friend's code. The host starts; bots fill empty seats. Choose Solo or Duo above before creating a room. Online matches keep running while menus are open.";
    network.insertAdjacentHTML("afterbegin", '<p class="mf-roomformat"></p>');
    // Online options are grouped near the play choices and remain collapsible.
    modes.after(network);
    g.on(g.$(".mf-onlinechoice"), "click", () => {
      if (g.mode === "training" && !g.online) g.$('[data-mode="signal"]').click();
      network.open = !network.open;
      this.refresh();
      if (network.open) g.$(g.online ? ".mf-copyinvite" : ".mf-codeinput").focus();
    });
    g.on(network, "toggle", () => this.refresh());
    for (const button of modes.querySelectorAll(".mf-mode"))
      g.on(button, "click", () => {
        if (!g.online) network.open = false;
      });
    g.shell.insertAdjacentHTML(
      "beforeend",
      '<dialog class="mf-settings" aria-label="Settings"><div class="mf-settingshead"><h2>Settings</h2><button class="mf-settingsclose">Done</button></div><div class="mf-settingsbody"><h3>Camera & aim</h3><div class="mf-aimsettings"></div><h3>Gameplay & sound</h3><div class="mf-experience"></div><h3>Graphics</h3><div class="mf-graphicsettings"></div><p class="mf-settingsnotice"></p></div></dialog>',
    );
    g.aimSettings.mount(g.$(".mf-aimsettings"));
    const controls = document.createElement("div");
    controls.className = "mf-retention";
    const old = g.$("details.mf-retention");
    for (const child of [...old.children]) if (child.tagName !== "SUMMARY") controls.append(child);
    g.$(".mf-experience").append(controls);
    old.remove();
    g.on(g.$(".mf-settingsclose"), "click", () => g.$(".mf-settings").close());
    g.on(g.$(".mf-settings"), "keydown", (e) => e.stopPropagation());
    g.on(g.$(".mf-graphicsettings"), "change", (e) =>
      g.academy.applySetting(e, g.$(".mf-graphicsettings")),
    );
    g.$(".mf-fire").setAttribute("aria-label", "Fire weapon");
    g.$(".mf-reload").setAttribute("aria-label", "Reload weapon");
    learn.insertAdjacentHTML("afterend", '<button class="mf-exit">Exit Game</button>');
    g.shell.insertAdjacentHTML(
      "beforeend",
      '<dialog class="mf-confirm" aria-label="Confirm action"><h2></h2><p></p><form method="dialog"><button value="cancel" autofocus>Cancel</button><button class="mf-confirmapply" value="apply">Apply changes</button></form></dialog>',
    );
    g.on(g.$(".mf-exit"), "click", () => this.confirmExit());
    g.on(g.$(".mf-confirm"), "keydown", (e) => e.stopPropagation());
    g.on(g.$(".mf-confirm"), "close", () => {
      const pending = this.pendingConfirmation;
      this.pendingConfirmation = null;
      pending?.(g.$(".mf-confirm").returnValue === "apply");
    });
    this.setupAccessibility();
    this.refresh();
  }
  setupAccessibility() {
    const g = this.g;
    // These device-local UI preferences never alter match rules or graphics presets.
    this.accessibility = { textScale: 1, contrast: false };
    try {
      const saved = JSON.parse(localStorage.getItem("midnry-outpost-accessibility"));
      if ([1, 1.5, 2].includes(saved?.textScale)) this.accessibility.textScale = saved.textScale;
      if (typeof saved?.contrast === "boolean") this.accessibility.contrast = saved.contrast;
    } catch {
      /* Storage can be unavailable in an embedded/private browser. */
    }
    g.$(".mf-experience").insertAdjacentHTML(
      "afterend",
      `<h3>Accessibility</h3><label class="mf-setting">Menu text size<select class="mf-textsize" aria-label="Menu text size"><option value="1">Standard · 100%</option><option value="1.5">Large · 150%</option><option value="2">Extra large · 200%</option></select></label><label class="mf-setting"><span>Higher UI contrast</span><input class="mf-contrast" type="checkbox"></label><p>Text size and contrast are saved on this device. System Reduce Motion reduces decorative animation and camera shake. Combat uses visual aiming; menus and match status provide screen-reader text.</p>`,
    );
    g.$(".mf-textsize").value = String(this.accessibility.textScale);
    g.$(".mf-contrast").checked = this.accessibility.contrast;
    for (const selector of [".mf-textsize", ".mf-contrast"])
      g.on(g.$(selector), "change", () => {
        this.accessibility.textScale = Number(g.$(".mf-textsize").value);
        this.accessibility.contrast = g.$(".mf-contrast").checked;
        this.applyAccessibility();
        try {
          localStorage.setItem("midnry-outpost-accessibility", JSON.stringify(this.accessibility));
        } catch {}
      });
    this.applyAccessibility();
    const id = "outpost-access-" + Math.random().toString(36).slice(2);
    g.shell.insertAdjacentHTML(
      "beforeend",
      `<p id="${id}" class="mf-sr-only">Visual first-person shooter. Keyboard: WASD moves, left and right arrows aim, Space fires, R reloads, Q uses your ability, and Escape or P opens the menu. Touch: left joystick moves and dragging the right side aims.</p><div class="mf-sr-only mf-accessannounce" role="status" aria-live="polite" aria-atomic="true"></div>`,
    );
    g.shell.setAttribute("aria-label", "Outpost Zero game controls");
    g.shell.setAttribute("aria-describedby", id);
    g.canvas.setAttribute("role", "img");
    g.canvas.setAttribute("aria-describedby", id);
    g.$(".mf-stick").setAttribute(
      "aria-label",
      "Touch movement joystick; keyboard alternative: WASD",
    );
    g.$(".mf-pause").setAttribute("aria-label", "Open game menu");
    g.$(".mf-pause").title = "Open game menu (Esc or P)";
    g.$(".mf-confirm").querySelector("p").id = id + "-confirm";
    g.$(".mf-confirm").setAttribute("aria-describedby", id + "-confirm");
    g.$(".mf-controlshelp").insertAdjacentHTML(
      "beforebegin",
      '<p class="mf-accessstatus" hidden></p>',
    );
    // In the menu, keep keyboard focus out of the underlying combat controls.
    // Native nested dialogs handle their own focus containment and Escape key.
    g.on(g.shell, "keydown", (event) => {
      if (event.key !== "Tab" || g.$(".mf-modal").hidden || event.target.closest("dialog")) return;
      const items = [
        ...g.$(".mf-modal").querySelectorAll("button, select, input, summary, a[href]"),
      ].filter((e) => !e.disabled && e.getClientRects().length && !e.closest("[hidden]"));
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || !items.includes(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !items.includes(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    });
  }
  applyAccessibility() {
    this.g.root.style.setProperty("--mf-text-scale", this.accessibility.textScale);
    this.g.shell.classList.toggle("mf-large-text", this.accessibility.textScale > 1);
    this.g.shell.classList.toggle("mf-high-contrast", this.accessibility.contrast);
  }
  syncAccessibility() {
    const g = this.g,
      menu = !g.$(".mf-modal").hidden;
    for (const selector of [".mf-top", ".mf-touch", ".mf-super"]) g.$(selector).inert = menu;
    if (this.menuVisible !== menu) {
      this.menuVisible = menu;
      g.$(".mf-accessannounce").textContent = menu
        ? "Game menu open. " + (g.online ? "Online match continues." : "Offline game paused.")
        : "Match active. Escape or P opens the game menu.";
    }
    const status = g.$(".mf-accessstatus"),
      p = g.player;
    status.hidden = g.state === "fresh";
    status.textContent = `Match status: ${Math.ceil(p.hp)} of ${Math.ceil(p.maxHp)} health. ${p.ammo} rounds. ${p.kills || 0} eliminations. ${g.enemies.filter((e) => e.hp > 0).length} other combatants alive.`;
  }
  confirm(title, message, action, callback) {
    const g = this.g,
      dialog = g.$(".mf-confirm");
    if (g.running) g.pause();
    this.pendingConfirmation = callback;
    dialog.returnValue = "cancel";
    dialog.setAttribute("aria-label", title);
    dialog.querySelector("h2").textContent = title;
    dialog.querySelector("p").textContent = message;
    g.$(".mf-confirmapply").textContent = action;
    dialog.showModal();
  }
  confirmGraphics(candidate, target, selector) {
    const a = this.g.academy;
    this.confirm(
      "Apply graphics changes?",
      `${a.preset} → ${candidate.preset}. Contact shadows: ${candidate.options.shadows ? "on" : "off"}. Material lighting: ${candidate.options.lighting ? "on" : "off"}. Automatic resolution: ${candidate.options.adaptive ? "on" : "off"}. Higher quality can reduce performance.`,
      "Apply changes",
      (accepted) => {
        if (accepted) a.commitGraphics(candidate, target);
        else a.settings(target);
        // Rebuilding the graphics controls must preserve keyboard focus.
        target.querySelector(selector)?.focus({ preventScroll: true });
      },
    );
  }
  confirmExit() {
    const g = this.g;
    this.confirm(
      "Exit game?",
      g.online
        ? "Leaving forfeits your player and leaves the online room. Hosting transfers to another player. Completed cosmetic rewards stay saved on this browser."
        : "Return to Midnry? Any unfinished round will end. Completed cosmetic rewards stay saved on this browser.",
      "Exit to Midnry",
      (accepted) => {
        if (accepted) this.exitGame();
      },
    );
  }
  exitGame() {
    const g = this.g;
    g.destroy();
    g.root.engine = null;
    g.root.innerHTML =
      '<div class="mf-exited"><h1>Session ended.</h1><p>Thanks for playing Outpost Zero.</p><a href="/" target="_top">Back to Midnry →</a></div>';
    if (window.parent === window) window.location.assign("/");
    else window.parent.postMessage({ type: "midnry-outpost-exit" }, location.origin);
  }
  settings() {
    const g = this.g;
    if (g.running) g.pause();
    g.retention.menu();
    g.academy.settings(g.$(".mf-graphicsettings"));
    g.$(".mf-settingsnotice").textContent = g.online
      ? "Online play continues while Settings is open. Only the host can change bot difficulty in the lobby."
      : "Offline matches pause while Settings is open. Changing difficulty starts a fresh round.";
    g.$(".mf-settings").showModal();
  }
  refresh() {
    this.syncAccessibility();
    const g = this.g,
      map = mapOf(g.mapId),
      weapon = weaponOf(g.weapon);
    for (const button of g.root.querySelectorAll(".mf-mode"))
      button.setAttribute("aria-pressed", String(button.dataset.mode === g.mode));
    g.$(".mf-onlinechoice").setAttribute("aria-expanded", String(g.$(".mf-network").open));
    g.$(".mf-roomformat").textContent =
      `${g.mode === "duo" ? "Duo · teams of two" : "Solo · every player for themselves"}${g.online ? " · Room " + g.online.code : ""}`;
    if (!g.online && g.state === "fresh")
      g.$(".mf-start").textContent =
        g.mode === "training" ? "START PRACTICE →" : `START ${g.mode === "duo" ? "DUO" : "SOLO"} →`;
    if (!g.online && g.state === "fresh")
      g.$(".mf-copy").textContent =
        g.mode === "duo"
          ? "Team up with an AI partner. Protect each other and be the last pair standing."
          : g.mode === "signal"
            ? "Outlast seven rivals. Collect Charge Cores and stay ahead of the Red Haze."
            : "A low-pressure range: eliminate six sentries. Try Tutorial for guided lessons.";
    g.$(".mf-boot").disabled = Boolean(g.online);
    g.$('[data-mode="signal"] small').textContent = g.online
      ? "Last player standing"
      : "You + 7 rivals";
    g.$('[data-mode="duo"] small').textContent = g.online ? "Teams of two" : "You + an AI partner";
    g.$(".mf-maphint").textContent = map.tag;
    g.$(".mf-weaponhint").textContent = `${weapon.kind} · ${weapon.mag} rounds`;
    // Polling may refresh the menu ten times a second; redraw only on selection changes.
    const key = `${map.id}:${weapon.id}`;
    if (key === this.previewKey) return;
    this.previewKey = key;
    this.mapPreview(map);
    this.weaponPreview(weapon);
  }
  mapPreview(map) {
    const canvas = this.g.$(".mf-mappreview"),
      c = canvas.getContext("2d");
    canvas.setAttribute("aria-label", `${map.name} overhead map preview`);
    c.fillStyle = map.theme.floor;
    c.fillRect(0, 0, 240, 112);
    const size = 104 / map.level.length,
      left = 68;
    for (const zone of map.zones) {
      c.fillStyle = zone.color;
      c.fillRect(left + zone.x * size, 4 + zone.y * size, zone.w * size, zone.h * size);
    }
    map.level.forEach((row, y) =>
      row.forEach((v, x) => {
        if (!v) return;
        c.fillStyle = map.theme.walls[v]?.[0] || "#263543";
        c.fillRect(left + x * size, 4 + y * size, size, size);
        c.strokeStyle = "#101720";
        c.lineWidth = 1;
        c.strokeRect(left + x * size, 4 + y * size, size, size);
      }),
    );
  }
  weaponPreview(w) {
    const canvas = this.g.$(".mf-weaponpreview"),
      c = canvas.getContext("2d");
    canvas.setAttribute("aria-label", `${w.name} ${w.kind} weapon illustration`);
    c.fillStyle = "#253543";
    c.fillRect(0, 0, 240, 112);
    if (this.g.militaryLoaded && this.g.military.preview(c, w.id, 240, 112)) return;
    if (this.g.weapons?.preview(c, w.id, 240, 112)) return;
    const shape = (points) => {
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
      c.stroke();
    };
    c.lineWidth = 4;
    c.strokeStyle = "#101720";
    c.fillStyle = w.color;
    if (["shard", "lob"].includes(w.kind)) {
      c.beginPath();
      c.arc(120, 59, 29, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#ffd16b";
      shape([
        [113, 23],
        [128, 23],
        [132, 36],
        [110, 36],
      ]);
      c.fillStyle = "#101720";
      c.fillRect(102, 52, 36, 8);
    } else if (["blades", "poison", "dash"].includes(w.kind)) {
      shape([
        [67, 77],
        [171, 27],
        [147, 68],
        [89, 87],
      ]);
      c.fillStyle = "#e5d7ac";
      shape([
        [83, 72],
        [156, 35],
        [140, 63],
      ]);
    } else if (w.kind === "melee") {
      shape([
        [74, 35],
        [153, 35],
        [173, 70],
        [158, 90],
        [86, 90],
        [66, 65],
      ]);
      c.fillStyle = "#ffd16b";
      for (let i = 0; i < 3; i++) {
        c.fillRect(83 + i * 24, 45, 16, 16);
        c.strokeRect(83 + i * 24, 45, 16, 16);
      }
    } else {
      shape([
        [49, 44],
        [180, 44],
        [192, 57],
        [178, 70],
        [113, 70],
        [106, 93],
        [87, 89],
        [88, 69],
        [49, 73],
      ]);
      c.fillStyle = "#a9bac0";
      shape([
        [153, 47],
        [209, 47],
        [209, 61],
        [153, 61],
      ]);
      c.fillStyle = "#ffd16b";
      c.fillRect(72, 49, 40, 8);
      if (w.kind === "shotgun") {
        c.fillStyle = "#73564a";
        shape([
          [115, 62],
          [165, 62],
          [158, 78],
          [112, 78],
        ]);
      }
      if (w.kind === "rocket") {
        c.fillStyle = w.color;
        shape([
          [149, 36],
          [215, 36],
          [220, 48],
          [215, 72],
          [149, 72],
        ]);
      }
      if (w.kind === "burst") {
        c.fillStyle = w.color;
        shape([
          [51, 24],
          [104, 24],
          [112, 36],
          [85, 42],
          [77, 56],
          [62, 53],
          [62, 40],
          [51, 40],
        ]);
      }
    }
  }
}
