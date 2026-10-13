/**
 * Presentation-only spectator selection. Never changes selfId, simulation
 * entities or the recipient used to request private mission information.
 */
export class SpectatorSelection {
  constructor() { this.reset(); }
  reset() { this.targetId = null; }
  eligible(entity, selfId) {
    return entity.id !== selfId && entity.hp > 0 && !entity.departed;
  }
  target(entities, selfId) {
    const selected = entities.find(
      (entity) => entity.id === this.targetId && this.eligible(entity, selfId),
    );
    // Server snapshots replace entity objects; retain only the ID and resolve
    // the newest interpolated position each frame. Dead/departed targets fall
    // back immediately, with no polling request or scene rebuild.
    const target = selected || entities.find((entity) => this.eligible(entity, selfId));
    this.targetId = target?.id ?? null;
    return target || null;
  }
  cycle(entities, selfId, direction = 1) {
    const survivors = entities.filter((entity) => this.eligible(entity, selfId));
    if (!survivors.length) { this.reset(); return null; }
    const current = this.target(entities, selfId);
    const index = survivors.findIndex((entity) => entity.id === current?.id);
    const target = survivors[(index + (direction < 0 ? -1 : 1) + survivors.length) % survivors.length];
    this.targetId = target.id;
    return target;
  }
}

/** Compact keyboard/touch controls; all game actions remain tied to dead self. */
export class SpectatorUI {
  constructor(g) {
    this.g = g;
    this.selection = new SpectatorSelection();
    this.style = document.createElement("style");
    this.style.textContent = `
      midnry-fps .mf-spectator { position:absolute;z-index:8;left:50%;transform:translateX(-50%);bottom:calc(14px + var(--mf-safe-bottom));width:min(320px,calc(100% - 32px - var(--mf-safe-left) - var(--mf-safe-right)));display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:8px;padding:5px;border:1px solid #778a9b88;border-radius:14px;background:#0d1721ee;color:#eef3f6;font-family:system-ui; }
      midnry-fps .mf-spectator[hidden] { display:none !important; }
      midnry-fps .mf-spectator button { min-width:44px;min-height:44px;border:1px solid #73899c66;border-radius:10px;background:#253543;color:#fff;font-size:22px;touch-action:manipulation; }
      midnry-fps .mf-spectator button:disabled { opacity:.4; }
      midnry-fps .mf-spectator button:focus-visible { outline:3px solid #b9d8f0;outline-offset:2px; }
      midnry-fps .mf-spectator-label { min-width:0;text-align:center;line-height:1.25; }
      midnry-fps .mf-spectator-label small { display:block;font-size:10px;color:#c0cbd5; }
      midnry-fps .mf-spectator-label b { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px; }
      midnry-fps .mf-spectator-hint { grid-column:1/-1;text-align:center;color:#c0cbd5;font-size:10px;padding-bottom:2px; }
      midnry-fps .mf-protocol-spectating :is(.mf-touch,.mf-cross,.mf-protocol-actions,.mf-protocol-context,.mf-protocol-flight,.mf-protocol-flightpad,.mf-protocol-combatstats) { display:none !important; }
      @media(pointer:coarse),(max-width:700px) { midnry-fps .mf-spectator-hint { display:none; } }
    `;
    this.bar = document.createElement("div");
    this.bar.className = "mf-spectator";
    this.bar.hidden = true;
    this.bar.setAttribute("role", "group");
    this.bar.setAttribute("aria-label", "Spectator viewpoints");
    this.bar.innerHTML = '<button class="mf-spectator-prev" aria-label="Watch previous surviving player" title="Previous player (Left arrow)">‹</button><div class="mf-spectator-label" role="status" aria-live="polite" aria-atomic="true"><small>WATCHING · READ ONLY</small><b></b></div><button class="mf-spectator-next" aria-label="Watch next surviving player" title="Next player (Right arrow)">›</button><span class="mf-spectator-hint">← / → or [ / ] · switch viewpoint</span>';
    this.label = this.bar.querySelector("b");
    this.previous = this.bar.querySelector(".mf-spectator-prev");
    this.next = this.bar.querySelector(".mf-spectator-next");
    g.shell.append(this.style, this.bar);
    g.on(this.previous, "click", () => this.cycle(-1));
    g.on(this.next, "click", () => this.cycle(1));
    for (const button of [this.previous, this.next])
      g.on(button, "keydown", (event) => {
        // Keep native button activation when focused; the game's Space/fire
        // shortcut must not consume a keyboard user's spectator button press.
        if (event.key === " " || event.key === "Enter") event.stopPropagation();
      });
  }
  active() {
    const g = this.g;
    return g.mode === "protocol" && g.state === "playing" &&
      (g.player?.hp <= 0 || g.player?.departed) && !g.deathSequence &&
      g.arena.state !== "ended";
  }
  camera() {
    return this.active() ? this.selection.target(this.g.arena.entities, this.g.selfId) : null;
  }
  cycle(direction) {
    if (!this.active() || !this.g.running || this.g.protocolUI?.hasDialogOpen()) return;
    this.selection.cycle(this.g.arena.entities, this.g.selfId, direction);
    this.update();
  }
  update() {
    const g = this.g;
    g.shell.classList.toggle("mf-protocol-spectating", g.mode === "protocol" &&
      g.state === "playing" && (g.player?.hp <= 0 || g.player?.departed));
    const visible = this.active() && g.running && g.$(".mf-modal").hidden &&
      !g.protocolUI?.hasDialogOpen();
    this.bar.hidden = !visible;
    if (!visible) return;
    const target = this.camera();
    const survivors = g.arena.entities.filter((entity) => this.selection.eligible(entity, g.selfId));
    const text = target
      ? `${target.name || "Operator"} · ${survivors.findIndex((entity) => entity.id === target.id) + 1}/${survivors.length}`
      : "No surviving players";
    if (this.label.textContent !== text) this.label.textContent = text;
    this.previous.disabled = this.next.disabled = survivors.length < 2;
  }
  reset() {
    this.selection.reset();
    this.bar.hidden = true;
    this.g.shell.classList.remove("mf-protocol-spectating");
  }
  dispose() { this.reset(); this.bar.remove(); this.style.remove(); }
}
