/** Only the eliminated client's presentation can show or skip this scene. */
export class VictimDeathUI {
  constructor(g) {
    this.g = g;
    this.style = document.createElement("style");
    this.style.textContent = `
      midnry-fps .mf-deathskip { position:absolute;z-index:15;left:calc(16px + var(--mf-safe-left));bottom:calc(16px + var(--mf-safe-bottom));min-height:44px;padding:10px 16px;background:#18232eee;color:#edf2f5;border:1px solid #8496a8;border-radius:12px;font:600 13px var(--mf-body);touch-action:manipulation; }
      midnry-fps .mf-deathskip[hidden] { display:none !important; }
      midnry-fps .mf-deathskip:focus-visible { outline:3px solid #b9d8f0;outline-offset:3px; }
      midnry-fps .mf-shell[data-death-stage="takedown"] :is(.mf-damage,.mf-hitmark,.mf-toast) { display:none !important; }
    `;
    this.skip = document.createElement("button");
    this.skip.className = "mf-deathskip";
    this.skip.hidden = true;
    this.skip.textContent = "Skip takedown";
    g.shell.append(this.style, this.skip);
    g.on(this.skip, "click", () => g.skipTakedown());
  }
  update() {
    this.g.shell.dataset.deathStage = this.g.deathStage || "";
    this.skip.hidden = this.g.deathStage !== "takedown" || !this.g.deathSequence;
  }
  dispose() {
    this.style.remove();
    this.skip.remove();
  }
}
