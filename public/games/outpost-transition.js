/** A short loading screen whenever the 3D scene switches between the base
 * and the medevac (take-off, or a rematch after a flight). Rebuilding the
 * scene can freeze the page for a moment; the screen is painted first, the
 * rebuild happens behind it, and it fades once a few frames have rendered. */
const SCENES = {
  transport: {
    image: "loading/lz-hangar.webp",
    kicker: "Phase two / Medevac",
    title: "Taking off",
    copy: "Lifeline Medevac is lifting off. Keep autopilot safe and finish the aircraft duties.",
  },
  base: {
    image: "loading/lz-keyart.webp",
    kicker: "Breakwater forward base",
    title: "Preparing the base",
    copy: "Gather the medical supplies, load the medevac and watch who you trust.",
  },
};

const CSS = `
midnry-fps .mf-shell:has(.mf-transition:not([hidden]):not(.mf-out)) > :not(.mf-transition, canvas, style) { visibility: hidden !important; }
midnry-fps .mf-transition { position: absolute; inset: 0; z-index: 1000; display: grid; align-content: end; padding: 0 clamp(20px, 5vw, 64px) clamp(28px, 7vh, 72px); color: #f1f4ef; background: #070a09 center / cover no-repeat; opacity: 1; transition: opacity 0.35s ease; pointer-events: auto; }
midnry-fps .mf-transition[hidden] { display: none; }
midnry-fps .mf-transition.mf-out { opacity: 0; pointer-events: none; }
midnry-fps .mf-transition::before { content: ""; position: absolute; inset: 0; background: linear-gradient(0deg, #050706f2 0%, #05070699 38%, #05070622 70%), linear-gradient(90deg, #050706cc, #05070600 60%); }
midnry-fps .mf-transition > * { position: relative; max-width: 620px; margin: 0; }
midnry-fps .mf-transition small { font: 600 13px var(--mf-display); letter-spacing: 0.22em; text-transform: uppercase; color: var(--mf-accent); }
midnry-fps .mf-transition h2 { margin: 6px 0 8px; font: 800 clamp(40px, 7vw, 68px)/0.95 var(--mf-display); text-transform: uppercase; }
midnry-fps .mf-transition p { font: 400 16px/1.5 var(--mf-body); color: #d5ddd7; }
midnry-fps .mf-transition .mf-transbar { position: relative; height: 4px; width: min(420px, 100%); margin-top: 20px; overflow: hidden; background: #ffffff26; }
midnry-fps .mf-transition .mf-transbar i { position: absolute; inset: 0 auto 0 0; width: 35%; background: var(--mf-accent); animation: mf-transbar 1.1s ease-in-out infinite; }
@keyframes mf-transbar { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
@media (prefers-reduced-motion: reduce) { midnry-fps .mf-transition .mf-transbar i { animation: none; width: 100%; opacity: 0.6; } midnry-fps .mf-transition { transition: none; } }
`;

export class SceneTransition {
  constructor(g) {
    this.g = g;
    this.style = document.createElement("style");
    this.style.dataset.outpostTransition = "";
    this.style.textContent = CSS;
    this.el = document.createElement("section");
    this.el.className = "mf-transition";
    this.el.hidden = true;
    this.el.setAttribute("role", "status");
    this.el.setAttribute("aria-live", "polite");
    this.el.innerHTML = '<small></small><h2></h2><p></p><div class="mf-transbar" aria-hidden="true"><i></i></div>';
    g.shell.append(this.style, this.el);
    // Warm the images so the screen never appears empty.
    for (const scene of Object.values(SCENES)) new Image().src = scene.image;
    this.lastMap = null;
    this.pending = null;
    this.original = g.render.bind(g);
    g.render = (...args) => this.render(args);
  }

  render(args) {
    const g = this.g,
      map = g.mode === "protocol" && g.militaryLoaded ? g.arena?.mapId : null;
    if (map && this.lastMap && map !== this.lastMap && !this.pending) {
      this.lastMap = map;
      this.show(map);
      // Skip this frame so the loading screen paints before the rebuild.
      return undefined;
    }
    if (map) this.lastMap = map;
    const pending = this.pending;
    if (pending && !pending.ready && g.military?.prepareWorld) {
      // Build the new scene and compile its shaders in the background; the
      // loading screen keeps animating instead of the page freezing.
      pending.preparing ||= g.military
        .prepareWorld()
        .catch(() => {})
        .then(() => (pending.ready = true));
      return undefined;
    }
    const result = this.original(...args);
    if (this.pending && ++this.pending.frames >= 3 && performance.now() - this.pending.at > 900) this.hide();
    return result;
  }

  show(map) {
    const scene = map === this.g.transportMap?.id || /medevac|transport/.test(map) ? SCENES.transport : SCENES.base;
    this.el.style.backgroundImage = `url("${scene.image}")`;
    this.el.querySelector("small").textContent = scene.kicker;
    this.el.querySelector("h2").textContent = scene.title;
    this.el.querySelector("p").textContent = scene.copy;
    this.el.classList.remove("mf-out");
    this.el.hidden = false;
    this.pending = { at: performance.now(), frames: 0 };
    clearTimeout(this.timer);
    // Never strand the player behind the screen.
    this.timer = setTimeout(() => this.hide(), 12000);
  }

  hide() {
    if (!this.pending) return;
    this.pending = null;
    clearTimeout(this.timer);
    this.el.classList.add("mf-out");
    this.fade = setTimeout(() => {
      if (!this.pending) this.el.hidden = true;
    }, 400);
  }

  dispose() {
    clearTimeout(this.timer);
    clearTimeout(this.fade);
    if (this.original) this.g.render = this.original;
    this.style.remove();
    this.el.remove();
  }
}
