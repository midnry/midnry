import * as Phaser from "phaser";

// Night in the city: real darkness with light cut out of it. A render texture
// the size of the camera view is filled with deep blue every frame, then soft
// holes are erased where light falls (street lamps, kiosks, signposts,
// headlights, the glow around you) and through every lit window. A second,
// additive layer adds warm halos, beams and tail lights on top.

/** A pool of light on the ground: erased from the dark, plus an optional halo. */
export type Light = {
  x: number;
  y: number;
  /** Radius in world pixels, and how much darkness it removes (0–1). */
  r: number;
  a: number;
  /** Squash for pools on the ground (0.5 = twice as wide as tall). */
  sy?: number;
  /** Rotation in radians (headlight beams). */
  rot?: number;
  /** Stretch along the rotation (beams). */
  sx?: number;
  /** A coloured halo on top: tint, strength and its own radius. */
  glow?: number;
  ga?: number;
  gr?: number;
};

/** Darkness is drawn at this fraction of the screen's resolution: it's soft anyway. */
const RES = 0.5;
const R = 64;

/** A white radial gradient: the shape of every light. */
function softCanvas(tint = "255,255,255"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = R * 2;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, `rgba(${tint},1)`);
  g.addColorStop(0.35, `rgba(${tint},0.85)`);
  g.addColorStop(0.7, `rgba(${tint},0.3)`);
  g.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, R * 2, R * 2);
  return c;
}

const rgb = (c: number) => `${(c >> 16) & 255},${(c >> 8) & 255},${c & 255}`;
let seq = 0;

export class NightLight {
  private darkTex: Phaser.Textures.CanvasTexture;
  private glowTex: Phaser.Textures.CanvasTexture;
  private dark: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private soft = softCanvas();
  private tinted = new Map<number, HTMLCanvasElement>();
  private tween: Phaser.Tweens.Tween | null = null;
  private keys: string[];
  /** How dark it is now (0 day … ~0.9 deep night), eased towards the target. */
  level = 0;
  color = 0x060b22;

  constructor(private scene: Phaser.Scene) {
    seq += 1;
    this.keys = [`nl_dark_${seq}`, `nl_glow_${seq}`];
    this.darkTex = scene.textures.createCanvas(this.keys[0]!, 16, 16)!;
    this.glowTex = scene.textures.createCanvas(this.keys[1]!, 16, 16)!;
    this.dark = scene.add.image(0, 0, this.keys[0]!).setOrigin(0).setDepth(30).setVisible(false);
    this.glow = scene.add.image(0, 0, this.keys[1]!).setOrigin(0).setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    scene.events.once("shutdown", () => this.destroy());
  }

  /** Fade to a new darkness and colour. */
  set(level: number, color: number, instant = false) {
    this.color = color;
    this.tween?.stop();
    if (instant || Math.abs(level - this.level) < 0.01) {
      this.level = level;
      return;
    }
    this.tween = this.scene.tweens.add({ targets: this, level, duration: 1600, ease: "Sine.easeInOut" });
  }

  private tint(c: number) {
    let t = this.tinted.get(c);
    if (!t) this.tinted.set(c, (t = softCanvas(rgb(c))));
    return t;
  }

  /** Draw this frame's darkness and light. Windows are cut out through their own lit pictures. */
  render(lights: Light[], windows: Phaser.GameObjects.Image[]) {
    const show = this.level > 0.01;
    this.dark.setVisible(show);
    this.glow.setVisible(show);
    if (!show) return;
    const v = this.scene.cameras.main.worldView;
    const ox = Math.floor(v.x) - 2;
    const oy = Math.floor(v.y) - 2;
    const w = Math.ceil(v.width) + 4;
    const h = Math.ceil(v.height) + 4;
    const cw = Math.max(16, Math.ceil(w * RES));
    const ch = Math.max(16, Math.ceil(h * RES));
    if (this.darkTex.width !== cw || this.darkTex.height !== ch) {
      this.darkTex.setSize(cw, ch);
      this.glowTex.setSize(cw, ch);
    }
    for (const img of [this.dark, this.glow]) img.setPosition(ox, oy).setDisplaySize(w, h);
    const inView = (l: Light) => {
      const r = l.r * Math.max(1, l.sx ?? 1);
      return l.x + r > ox && l.x - r < ox + w && l.y + r > oy && l.y - r < oy + h;
    };
    const place = (ctx: CanvasRenderingContext2D, src: CanvasImageSource, l: Light, r: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.translate((l.x - ox) * RES, (l.y - oy) * RES);
      if (l.rot) ctx.rotate(l.rot);
      ctx.scale(l.sx ?? 1, l.sy ?? 1);
      const d = r * RES;
      ctx.drawImage(src, -d, -d, d * 2, d * 2);
      ctx.restore();
    };

    // The dark, then holes where the light falls.
    const dc = this.darkTex.getContext();
    dc.globalCompositeOperation = "source-over";
    dc.globalAlpha = 1;
    dc.clearRect(0, 0, cw, ch);
    dc.fillStyle = `rgba(${rgb(this.color)},${this.level})`;
    dc.fillRect(0, 0, cw, ch);
    dc.globalCompositeOperation = "destination-out";
    for (const l of lights) if (inView(l)) place(dc, this.soft, l, l.r, l.a);
    for (const win of windows) {
      if (!win.visible || win.alpha < 0.05) continue;
      const ww = win.displayWidth;
      const wh = win.displayHeight;
      const top = win.y - wh;
      if (win.x + ww < ox || win.x > ox + w || win.y < oy || top > oy + h) continue;
      const src = win.texture.getSourceImage() as CanvasImageSource;
      dc.globalAlpha = Math.min(1, win.alpha);
      dc.drawImage(src, (win.x - ox) * RES, (top - oy) * RES, ww * RES, wh * RES);
    }
    dc.globalCompositeOperation = "source-over";
    dc.globalAlpha = 1;
    this.darkTex.refresh();

    // Warm halos, beams and tail lights on top.
    const gc = this.glowTex.getContext();
    gc.globalCompositeOperation = "source-over";
    gc.clearRect(0, 0, cw, ch);
    gc.globalCompositeOperation = "lighter";
    const strength = Math.min(1, this.level * 1.3);
    for (const l of lights) if (l.glow && inView(l)) place(gc, this.tint(l.glow), l, l.gr ?? l.r * 0.6, (l.ga ?? 0.5) * strength);
    gc.globalCompositeOperation = "source-over";
    this.glowTex.refresh();
  }

  destroy() {
    this.tween?.stop();
    this.dark.destroy();
    this.glow.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}

/** Power cuts: some nights a district loses NEPA light; houses with a generator keep going. */
const OUTAGE: Record<string, number> = {
  nyanya: 0.55, karu: 0.55, deidei: 0.6, mpape: 0.6, kubwa: 0.45, lugbe: 0.5, apo: 0.4, lokogoma: 0.35,
  gwarinpa: 0.3, garki: 0.25, wuse: 0.2, wuye: 0.25, utako: 0.2, jabi: 0.15,
  maitama: 0.05, asokoro: 0.05, cbd: 0.03, guzape: 0.05, katampe: 0.05, threearms: 0,
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Is this district in darkness tonight? */
export const outage = (district: string, day: number) => hash(`nepa:${district}:${day}`) < (OUTAGE[district] ?? 0.25);
/** Does this building have a generator? Richer areas more often. */
export const generator = (lotId: string, district: string) => hash(`gen:${lotId}`) < ((OUTAGE[district] ?? 0.25) > 0.3 ? 0.3 : 0.6);
