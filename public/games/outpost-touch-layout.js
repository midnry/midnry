/** Touch layout editor: players drag the on-screen controls to where their
 * thumbs rest, in the lobby or in a paused match (Settings → Controls →
 * Edit touch layout).
 *
 * How a position is stored. Each control keeps its default corner anchor
 * (the thumb cluster hangs off the bottom-right corner, the joystick off the
 * bottom-left) and we only save how far the player moved it from the default
 * spot, in standard-size pixels, per orientation. The HUD stylesheet
 * (outpost-signal-hud.js) reads those as --mf-<control>-dx / -dy inside its
 * existing formula: `calc((14px + var(--mf-fire-dx, 0px)) * var(--mf-btnk) +
 * var(--mf-safe-right))`. Corner offsets survive the things that change a
 * phone's viewport: the browser bar hiding and showing, a notch inset, a
 * different phone of a similar size: a thumb's reach is a fixed distance from
 * the corner, not a fraction of the screen. Normalised fractions would drift
 * on every address-bar toggle and push buttons out of reach on tablets. Being
 * inside the size multiplication means the Touch button size setting scales
 * a custom layout around its corner as one unit, exactly as it scales the
 * default layout, so no new overlaps appear when the size changes.
 *
 * The maths (overlap guard, clamping, orientation key, drag → offsets) is in
 * pure functions so scripts/outpost-touch-layout.test.mjs can cover them. */
export const LAYOUT_KEY = "midnry-outpost-touch-layout";
/** Minimum breathing room between two controls, in screen pixels. */
export const GAP = 8;
/** Keep a control this far inside the safe area, in screen pixels. */
export const EDGE = 4;
/** Saved offsets beyond this are nonsense (a corrupted or hand-edited store). */
const LIMIT = 4000;
/** Draggable controls: their node and the horizontal edge they hang off. */
export const CONTROLS = Object.freeze({
  fire: { selector: ".mf-touch .mf-fire", anchor: "right", label: "Fire" },
  reload: { selector: ".mf-touch .mf-reload", anchor: "right", label: "Reload" },
  stance: { selector: ".mf-touch .mf-stance", anchor: "right", label: "Crouch" },
  jump: { selector: ".mf-touch .mf-jump", anchor: "right", label: "Jump" },
  scope: { selector: ".mf-touch .mf-scope", anchor: "right", label: "Aim" },
  stick: { selector: ".mf-touch .mf-stick", anchor: "left", label: "Joystick" },
});
/** Fixed HUD pieces a control may not cover: the special move and the two cards. */
export const OBSTACLES = Object.freeze([".mf-super", ".mf-bottom .mf-stat:first-child", ".mf-bottom .mf-ammo"]);

/** Layouts are kept per orientation: thumbs rest elsewhere when the phone turns. */
export function orientationKey(width, height) {
  return width > height ? "landscape" : "portrait";
}

/** Mirrors the stylesheet's --mf-btnk: phones and short landscape screens cap
 * the size setting at the standard size so nothing overlaps. */
export function buttonScale(setting, compact) {
  const value = Number.isFinite(setting) && setting > 0 ? setting : 1;
  return compact ? Math.min(value, 1) : value;
}

const rectOf = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

/** Moves a rectangle the least distance that puts it inside the bounds. A
 * control wider than the bounds pins to the left/top so it is still reachable. */
export function clampRect(rect, bounds) {
  const left = Math.max(bounds.left, Math.min(bounds.right - rect.width, rect.left)),
    top = Math.max(bounds.top, Math.min(bounds.bottom - rect.height, rect.top));
  return rectOf(left, top, rect.width, rect.height);
}

/** True when two rectangles are closer than the gap (touching counts). */
export function overlaps(a, b, gap = GAP) {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

/** The first rectangle in `others` that the candidate would crowd, or null. */
export function blockedBy(rect, others, gap = GAP) {
  for (const other of others) if (other && other.width > 0 && other.height > 0 && overlaps(rect, other, gap)) return other;
  return null;
}

/** The viewport minus the safe-area insets and a small edge margin. */
export function safeBounds(width, height, insets = {}, edge = EDGE) {
  const inset = (k) => (Number.isFinite(insets[k]) ? insets[k] : 0);
  return { left: inset("left") + edge, top: inset("top") + edge, right: width - inset("right") - edge, bottom: height - inset("bottom") - edge };
}

/** Turns a drag into saved offsets. `start` is where the control began (its
 * rectangle and the offsets it already had); `moved` is where its top-left
 * corner is now. Offsets are in standard-size pixels, hence the divide by the
 * size factor. A right-anchored button moving right has a smaller `right`,
 * and anything moving down has a smaller `bottom`, hence the signs. */
export function offsetsFromMove(anchor, start, moved, scale = 1) {
  const k = scale > 0 ? scale : 1,
    sx = anchor === "right" ? -1 : 1;
  return { dx: start.dx + (sx * (moved.left - start.left)) / k, dy: start.dy - (moved.top - start.top) / k };
}

const tidy = (n) => Math.round(n * 10) / 10;

/** Keeps only known controls with finite, sane offsets; anything else is dropped. */
export function sanitizeLayout(saved) {
  const layout = { portrait: {}, landscape: {} };
  for (const key of Object.keys(layout)) {
    const source = saved?.[key];
    if (!source || typeof source !== "object") continue;
    for (const id of Object.keys(CONTROLS)) {
      const entry = source[id];
      if (!entry || !Number.isFinite(entry.dx) || !Number.isFinite(entry.dy)) continue;
      if (Math.abs(entry.dx) > LIMIT || Math.abs(entry.dy) > LIMIT) continue;
      layout[key][id] = { dx: tidy(entry.dx), dy: tidy(entry.dy) };
    }
  }
  return layout;
}

/** The CSS custom properties for one orientation's layout; controls without a
 * saved spot get null so a previous value is removed. */
export function layoutVariables(positions = {}) {
  const vars = {};
  for (const id of Object.keys(CONTROLS)) {
    const entry = positions[id];
    vars[`--mf-${id}-dx`] = entry ? `${tidy(entry.dx)}px` : null;
    vars[`--mf-${id}-dy`] = entry ? `${tidy(entry.dy)}px` : null;
  }
  return vars;
}

const CSS = `
midnry-fps .mf-layoutedit { position: absolute; inset: 0; z-index: 30; display: none; }
midnry-fps .mf-shell.mf-layout-editing > .mf-layoutedit { display: block; }
midnry-fps .mf-layoutedit .mf-layoutdim { position: absolute; inset: 0; background: #060908c8; }
/* The touch controls (and the HUD pieces they must not cover) rise above the
   dim and stay visible even in the lobby, which otherwise hides them. */
midnry-fps .mf-shell.mf-layout-editing > :is(.mf-touch, .mf-super, .mf-bottom) { display: block !important; visibility: visible !important; z-index: 31; }
midnry-fps .mf-shell.mf-layout-editing > .mf-bottom { display: flex !important; }
/* The weapon card is hidden in the lobby; show it so the editor keeps the same
   spot free that the match will need. */
midnry-fps .mf-shell.mf-layout-editing > .mf-bottom .mf-ammo { display: block !important; }
midnry-fps .mf-shell.mf-layout-editing > :is(.mf-super, .mf-bottom) { opacity: 0.5 !important; }
midnry-fps .mf-shell.mf-layout-editing > .mf-touch :is(button, .mf-stick) { opacity: 1 !important; outline: 2px dashed #ffffff8c; outline-offset: 5px; transition: none !important; }
midnry-fps .mf-shell.mf-layout-editing > .mf-touch .mf-layout-dragging { outline: 3px solid var(--mf-accent, #ffc857); outline-offset: 5px; }
midnry-fps .mf-shell.mf-layout-editing > .mf-touch .mf-layout-invalid { outline: 3px solid #ff4a3d; background: #5a1512d9 !important; }
/* Every pointer lands on this layer, so no button fires while editing. */
midnry-fps .mf-layoutedit .mf-layoutdrag { position: absolute; inset: 0; z-index: 32; touch-action: none; cursor: grab; }
midnry-fps .mf-layoutedit .mf-layouthint { position: absolute; z-index: 33; left: 50%; top: calc(14px + var(--mf-safe-top, 0px)); transform: translateX(-50%); display: grid; gap: 10px; justify-items: center; width: min(340px, calc(100% - 32px)); padding: 12px 14px; border: 1px solid #ffffff2e; border-radius: 12px; background: #0b1015f2; color: #f2f4f1; text-align: center; font: 600 14px/1.4 var(--mf-body, sans-serif); box-shadow: 0 8px 28px #0009; }
midnry-fps .mf-layoutedit .mf-layouthint p { margin: 0; }
midnry-fps .mf-layoutedit .mf-layouthint p b { color: var(--mf-accent, #ffc857); }
midnry-fps .mf-layoutedit .mf-layoutnote { min-height: 1.4em; font-size: 12px; color: #ffb6a7; }
midnry-fps .mf-layoutedit .mf-layoutbuttons { display: flex; gap: 10px; }
midnry-fps .mf-layoutedit .mf-layoutbuttons button { min-width: 112px; min-height: 44px; padding: 0 16px; border: 1px solid #ffffff3d; border-radius: 3px; background: #ffffff0a; color: #eef2ee; font: 600 15px var(--mf-display, sans-serif); letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; }
/* Gold like the other primary buttons; the theme's generic button rules would
   otherwise paint it dark. */
midnry-fps .mf-shell .mf-layoutedit .mf-layoutdone { background: var(--mf-accent, #ffc857) !important; border-color: var(--mf-accent, #ffc857) !important; color: #151b24 !important; }
midnry-fps .mf-layoutedit .mf-layoutbuttons button:focus-visible { outline: 2px solid var(--mf-accent, #ffc857); outline-offset: 2px; }
@media (max-height: 500px) {
  midnry-fps .mf-layoutedit .mf-layouthint { grid-template-columns: 1fr auto; text-align: left; width: min(520px, calc(100% - 32px)); padding: 10px 14px; }
  midnry-fps .mf-layoutedit .mf-layoutnote { grid-column: 1 / -1; min-height: 0; }
  midnry-fps .mf-layoutedit .mf-layoutnote:empty { display: none; }
}
`;

export class TouchLayout {
  constructor() {
    this.layout = { portrait: {}, landscape: {} };
    this.editing = false;
    this.drag = null;
  }

  /** Reads the saved layout, builds the (hidden) editor and applies the layout. */
  attach(g) {
    this.g = g;
    try {
      this.layout = sanitizeLayout(JSON.parse(localStorage.getItem(LAYOUT_KEY)));
    } catch {
      /* Storage can be unavailable in an embedded or private browser. */
    }
    const shell = g.shell;
    this.style = document.createElement("style");
    this.style.dataset.outpostTouchLayout = "";
    this.style.textContent = CSS;
    this.root = document.createElement("div");
    this.root.className = "mf-layoutedit";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "Edit touch layout");
    this.root.innerHTML =
      '<div class="mf-layoutdim"></div><div class="mf-layoutdrag" aria-hidden="true"></div><div class="mf-layouthint"><p><b>Drag a control</b> to where your thumb rests. Controls keep a small gap and stay on screen.</p><p class="mf-layoutnote" role="status" aria-live="polite"></p><div class="mf-layoutbuttons"><button type="button" class="mf-layoutreset">Reset</button><button type="button" class="mf-layoutdone">Done</button></div></div>';
    shell.append(this.style, this.root);
    const drag = this.root.querySelector(".mf-layoutdrag");
    g.on(drag, "pointerdown", (e) => this.pointerDown(e));
    g.on(drag, "pointermove", (e) => this.pointerMove(e));
    g.on(drag, "pointerup", (e) => this.pointerUp(e));
    g.on(drag, "pointercancel", (e) => this.pointerUp(e, true));
    g.on(this.root.querySelector(".mf-layoutdone"), "click", () => this.exit());
    g.on(this.root.querySelector(".mf-layoutreset"), "click", () => this.reset());
    // Escape leaves the editor; Tab stays on its two buttons; nothing else
    // reaches the game (or the menu's focus trap) while it is open.
    g.on(this.root, "keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        this.exit();
      } else if (e.key === "Tab") {
        e.preventDefault();
        const buttons = [...this.root.querySelectorAll(".mf-layoutbuttons button")],
          index = buttons.indexOf(document.activeElement);
        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus({ preventScroll: true });
      }
    });
    // The game's abort controller ends every listener on exit; end the observer too.
    g.abort?.signal?.addEventListener("abort", () => this.observer?.disconnect(), { once: true });
    // A rotation changes which layout applies. Watch the game's own box (like
    // the renderer does): the window's resize event is not reliable here.
    this.orientation = this.currentOrientation();
    const turned = () => {
      const next = this.currentOrientation();
      if (next === this.orientation) return;
      this.orientation = next;
      this.apply();
      if (this.editing) this.note(`${next === "landscape" ? "Landscape" : "Portrait"} layout.`);
    };
    if (typeof ResizeObserver === "function") {
      this.observer = new ResizeObserver(turned);
      this.observer.observe(shell);
    }
    g.on(window, "resize", turned);
    this.apply();
  }

  /** Portrait or landscape, from the game's own box (it may sit in a frame). */
  currentOrientation() {
    const r = this.g.shell.getBoundingClientRect();
    return orientationKey(r.width || innerWidth, r.height || innerHeight);
  }

  /** Writes the current orientation's offsets to the shell as CSS variables. */
  apply() {
    const shell = this.g?.shell;
    if (!shell) return;
    for (const [name, value] of Object.entries(layoutVariables(this.layout[this.currentOrientation()])))
      if (value === null) shell.style.removeProperty(name);
      else shell.style.setProperty(name, value);
  }

  save() {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(this.layout));
    } catch {}
  }

  /** Whether the editor makes sense right now: touch controls on screen, and
   * not inside a Blackout Protocol match (that mode keeps its own fixed layout;
   * the lobby is fine whatever game is selected, the arena layout is shown). */
  available() {
    const g = this.g,
      touch = g?.$(".mf-touch");
    if (!touch || (g.mode === "protocol" && g.state !== "fresh")) return false;
    return getComputedStyle(touch).display !== "none" || matchMedia("(pointer: coarse)").matches;
  }

  /** Opens the editor over a dimmed screen; a running match pauses first. */
  enter() {
    const g = this.g;
    if (!g || this.editing) return;
    g.$(".mf-settings")?.close?.();
    if (g.running) g.pause();
    this.editing = true;
    // The HUD class positions the controls; the lobby may not have set it yet.
    this.borrowedHud = !g.shell.classList.contains("mf-sighud");
    if (this.borrowedHud) g.shell.classList.add("mf-sighud");
    g.shell.classList.add("mf-layout-editing");
    this.note("");
    this.root.querySelector(".mf-layoutdone").focus({ preventScroll: true });
  }

  /** Closes the editor and returns to Settings, where the player came from. */
  exit(reopen = true) {
    const g = this.g;
    if (!g || !this.editing) return;
    this.pointerUp(null, true);
    this.editing = false;
    g.shell.classList.remove("mf-layout-editing");
    if (this.borrowedHud) g.shell.classList.remove("mf-sighud");
    this.borrowedHud = false;
    this.save();
    if (reopen) g.ui?.settings?.();
  }

  /** Forgets the current orientation's layout; the other orientation keeps its own. */
  reset() {
    this.layout[this.currentOrientation()] = {};
    this.save();
    this.apply();
    this.note("Default layout restored.");
  }

  note(text) {
    const node = this.root?.querySelector(".mf-layoutnote");
    if (node) node.textContent = text;
  }

  /** Current geometry of every control and obstacle, relative to the shell. */
  measure() {
    const g = this.g,
      origin = g.shell.getBoundingClientRect(),
      rel = (node) => {
        const r = node.getBoundingClientRect();
        return rectOf(r.left - origin.left, r.top - origin.top, r.width, r.height);
      },
      controls = {},
      obstacles = [];
    for (const [id, spec] of Object.entries(CONTROLS)) {
      const node = g.$(spec.selector);
      if (node && node.getClientRects().length) controls[id] = { node, rect: rel(node) };
    }
    for (const selector of OBSTACLES) {
      const node = g.$(selector);
      if (node && node.getClientRects().length) obstacles.push(rel(node));
    }
    // The hint card sits above the controls: a control dragged under it would vanish.
    const hint = this.root?.querySelector(".mf-layouthint");
    if (this.editing && hint) obstacles.push(rel(hint));
    const style = getComputedStyle(g.root),
      inset = (side) => parseFloat(style.getPropertyValue(`--mf-safe-${side}`)) || 0,
      insets = { top: inset("top"), right: inset("right"), bottom: inset("bottom"), left: inset("left") };
    return { origin, controls, obstacles, bounds: safeBounds(origin.width, origin.height, insets) };
  }

  /** The size factor the stylesheet applies (see buttonScale). */
  scale() {
    return buttonScale(this.g.aimSettings?.values?.buttons ?? 1, matchMedia("(max-width: 599px), (max-height: 500px)").matches);
  }

  pointerDown(e) {
    if (!this.editing || this.drag) return;
    const geometry = this.measure(),
      x = e.clientX - geometry.origin.left,
      y = e.clientY - geometry.origin.top;
    // A little slack around each control helps fingers; the nearest wins.
    let hit = null,
      best = Infinity;
    for (const [id, { node, rect }] of Object.entries(geometry.controls)) {
      const dx = Math.max(rect.left - x, 0, x - rect.right),
        dy = Math.max(rect.top - y, 0, y - rect.bottom),
        distance = Math.hypot(dx, dy);
      if (distance <= 12 && distance < best) {
        best = distance;
        hit = { id, node, rect };
      }
    }
    if (!hit) return;
    e.preventDefault();
    const others = Object.entries(geometry.controls)
      .filter(([id]) => id !== hit.id)
      .map(([, c]) => c.rect)
      .concat(geometry.obstacles);
    const saved = this.layout[this.currentOrientation()][hit.id] || { dx: 0, dy: 0 };
    this.drag = {
      id: hit.id,
      node: hit.node,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      start: { ...hit.rect, dx: saved.dx, dy: saved.dy },
      others,
      bounds: geometry.bounds,
      scale: this.scale(),
      invalid: false,
      current: { dx: saved.dx, dy: saved.dy },
    };
    hit.node.classList.add("mf-layout-dragging");
    e.currentTarget.setPointerCapture?.(e.pointerId);
    this.note(`Moving ${CONTROLS[hit.id].label}.`);
  }

  pointerMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    e.preventDefault();
    // Slide the control with the finger but never past the safe area.
    const wanted = rectOf(d.start.left + (e.clientX - d.startX), d.start.top + (e.clientY - d.startY), d.start.width, d.start.height),
      rect = clampRect(wanted, d.bounds),
      blocked = blockedBy(rect, d.others, GAP);
    d.current = offsetsFromMove(CONTROLS[d.id].anchor, d.start, rect, d.scale);
    this.setOffsets(d.id, d.current);
    const invalid = blocked !== null;
    if (invalid !== d.invalid) {
      d.invalid = invalid;
      d.node.classList.toggle("mf-layout-invalid", d.invalid);
      this.note(d.invalid ? `${CONTROLS[d.id].label}: too close to another control. Let go to snap back.` : `Moving ${CONTROLS[d.id].label}.`);
    }
  }

  pointerUp(e, cancel = false) {
    const d = this.drag;
    if (!d || (e && e.pointerId !== d.pointerId)) return;
    this.drag = null;
    d.node.classList.remove("mf-layout-dragging", "mf-layout-invalid");
    const orientation = this.currentOrientation();
    if (cancel || d.invalid) {
      // Snap back to the last valid spot.
      this.apply();
      if (d.invalid) this.note(`${CONTROLS[d.id].label} snapped back: controls need a small gap.`);
      return;
    }
    const final = { dx: tidy(d.current.dx), dy: tidy(d.current.dy) };
    if (final.dx === 0 && final.dy === 0) delete this.layout[orientation][d.id];
    else this.layout[orientation][d.id] = final;
    this.save();
    this.apply();
    this.note(`${CONTROLS[d.id].label} placed.`);
  }

  /** Live preview while dragging: the stylesheet moves the real control. */
  setOffsets(id, { dx, dy }) {
    const shell = this.g.shell;
    shell.style.setProperty(`--mf-${id}-dx`, `${tidy(dx)}px`);
    shell.style.setProperty(`--mf-${id}-dy`, `${tidy(dy)}px`);
  }
}
