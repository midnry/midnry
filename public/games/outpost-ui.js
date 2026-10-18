/** Menu layout and previews only. All gameplay stays in the shared simulation. */
import { mapOf, weaponOf } from "./outpost-content.js";
export class MenuUI {
  constructor(g) {
    this.g = g;
    const panel = g.$(".mf-panel"),
      modes = g.$(".mf-modes"),
      learn = g.$(".mf-learn");
    g.$("h1").innerHTML = "Outpost <em>Zero.</em>";
    g.$(".mf-eyebrow").textContent = "MIDNRY / TACTICAL OPERATIONS";
    this.playChoice = new URLSearchParams(location.search).has("room") ? "online" : "offline";
    modes.setAttribute("aria-label", "Play Blackout Protocol");
    modes.innerHTML = '<button class="mf-offlinechoice" data-play="offline" aria-pressed="true">Offline<small>Play with bots on this device</small></button><button class="mf-onlinechoice" data-play="online" aria-pressed="false">Online<small>Play with friends</small></button>';
    g.$(".mf-boot").hidden = true;
    // The old field guide covers retired combat modes; "How to play" in the
    // menu opens the Blackout Protocol manual instead.
    g.$(".mf-guide").hidden = true;
    g.$(".mf-graphics").textContent = "Settings";
    // The locker holds outfits and progress; it opens from the menu.
    g.$(".mf-lockeropen").textContent = "Locker";
    g.$(".mf-learn .mf-graphics").before(g.$(".mf-lockeropen"));
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
    modes.after(g.$(".mf-start"));
    const help = document.createElement("details");
    help.className = "mf-controlshelp";
    help.innerHTML = "<summary>Controls & shortcuts</summary>";
    const instructions = g.$(".mf-help");
    instructions.innerHTML =
      "<b>Touch:</b> left stick to move; drag the right side to aim; the action button interacts.<br><b>Keyboard:</b> WASD to move, mouse to aim, hold E to interact. F reports, C calls a meeting. Esc or P opens the menu.";
    help.append(instructions);
    panel.append(help);
    const network = g.$(".mf-network");
    g.$(".mf-codeinput").setAttribute("autocapitalize", "characters");
    g.$(".mf-codeinput").setAttribute("autocomplete", "off");
    g.$(".mf-codeinput").spellcheck = false;
    network.id = "outpost-room-" + Math.random().toString(36).slice(2);
    g.$(".mf-onlinechoice").setAttribute("aria-controls", network.id);
    network.querySelector("summary").textContent = "Online room";
    network.querySelector("p").textContent = "Create a Blackout Protocol room or enter a friend's code. The host starts; smart bots fill unused seats. Online missions continue while menus are open.";
    network.insertAdjacentHTML("afterbegin", '<p class="mf-roomformat"></p>');
    modes.after(network);
    for (const button of modes.querySelectorAll("[data-play]"))
      g.on(button, "click", () => this.choosePlay(button.dataset.play));
    g.on(network, "toggle", () => this.refresh());
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
    const difficulty = g.$(".mf-difficulty").closest("label");
    difficulty.nextElementSibling?.remove();
    difficulty.remove();
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
      if (
        !g.militaryLoaded ||
        event.key !== "Tab" ||
        g.$(".mf-modal").hidden ||
        event.target.closest("dialog")
      )
        return;
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
      ? "Online play continues while Settings is open. Smart bots fill unused seats."
      : "Offline Blackout Protocol pauses while Settings is open.";
    g.$(".mf-settings").showModal();
  }
  choosePlay(choice) {
    const g = this.g;
    if (choice === "offline" && g.online) {
      this.confirm("Leave online mission?", "You will leave this room and start an offline Blackout Protocol mission with smart bots.", "Play offline", confirmed => {
        if (!confirmed) return;
        g.leaveOnline(); this.playChoice = "offline"; g.reset(); this.refresh();
      });
      return;
    }
    this.playChoice = choice;
    this.refresh();
    if (choice === "online") g.$(".mf-codeinput").focus({ preventScroll: true });
  }
  refresh() {
    this.syncAccessibility();
    const g = this.g, map = mapOf(g.mapId), weapon = weaponOf(g.weapon), network = g.$(".mf-network");
    if (g.online) this.playChoice = "online";
    for (const button of g.root.querySelectorAll("[data-play]"))
      button.setAttribute("aria-pressed", String(button.dataset.play === this.playChoice));
    network.hidden = this.playChoice !== "online";
    network.open = this.playChoice === "online";
    g.$(".mf-onlinechoice").setAttribute("aria-expanded", String(network.open));
    g.$(".mf-roomformat").textContent = "Blackout Protocol" + (g.online ? " · Room " + g.online.code : " · Friends + smart bots");
    g.$(".mf-copy").textContent = "Gather medical supplies, protect the medevac flight and save wounded soldiers. Hidden infiltrators sabotage the rescue.";
    g.protocolUI?.refreshMenu();
    if (!g.online && this.playChoice === "online") {
      g.$(".mf-start").disabled = true;
      g.$(".mf-start").textContent = "CREATE OR JOIN A ROOM";
    } else if (!g.online) {
      g.$(".mf-start").disabled = !g.militaryLoaded;
      if (g.state === "fresh") g.$(".mf-start").textContent = "PLAY →";
    }
    g.$(".mf-maphint").textContent = map.tag;
    g.$(".mf-weaponhint").textContent = `${weapon.kind} · ${weapon.mag} rounds`;
    // Polling may refresh the menu ten times a second; redraw only on selection changes.
    const key = `${map.id}:${weapon.id}:${Boolean(g.militaryLoaded)}:${Boolean(g.militaryError)}`;
    if (key === this.previewKey) return;
    this.previewKey = key;
    this.mapPreview(map);
    this.weaponPreview(weapon);
  }
  mapPreview(map) {
    const canvas = this.g.$(".mf-mappreview"),
      c = canvas.getContext("2d"),
      size = 104 / map.level.length,
      left = 68;
    canvas.setAttribute("aria-label", `${map.name} tactical floor plan`);
    // This is a navigation schematic, independent of the realistic world view.
    c.fillStyle = "#18252a";
    c.fillRect(0, 0, 240, 112);
    c.fillStyle = "#4f686d";
    c.fillRect(left, 4, 104, 104);
    map.level.forEach((row, y) =>
      row.forEach((tile, x) => {
        if (!tile) return;
        c.fillStyle = tile === 1 ? "#9aa9a4" : "#768b88";
        c.fillRect(left + x * size, 4 + y * size, size, size);
      }),
    );
  }
  weaponPreview(w) {
    const canvas = this.g.$(".mf-weaponpreview"),
      c = canvas.getContext("2d");
    canvas.setAttribute("aria-label", `${w.name} realistic 3D weapon preview`);
    c.fillStyle = "#18252a";
    c.fillRect(0, 0, 240, 112);
    if (this.g.militaryLoaded && this.g.military?.preview(c, w.id, 240, 112)) return;
    // Asset loading or unavailable WebGL never substitutes illustrated weapons.
    const unavailable = this.g.militaryError || this.g.military?.disposed;
    c.fillStyle = "#cad4d0";
    c.textAlign = "center";
    c.font = "13px system-ui, sans-serif";
    c.fillText(unavailable ? "3D preview unavailable" : "Loading 3D armory…", 120, 57);
    canvas.setAttribute(
      "aria-label",
      `${w.name}: ${unavailable ? "3D preview unavailable" : "loading 3D weapon preview"}`,
    );
  }
}
