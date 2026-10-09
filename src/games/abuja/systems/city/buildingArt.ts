import type { ArtKind } from "./catalog";

// Buildings drawn after the building sheet, in the game's own view: seen
// from above and a little in front, so you see the roof, the front wall and
// one side. Each drawing is SVG sized to the lot's footprint; tall buildings
// rise above it. A second, matching drawing holds only the lit windows, so
// the city can light up at night with one fade.
//
// Coordinates: x across the lot (0…w), y down, with the front of the lot at
// y = H (the image's bottom) and the footprint occupying the bottom h pixels.

export type BuildingArtOpts = { w: number; h: number; floors: number; wall: string; trim: string; seed: number; label?: string };
export type BuildingArt = { svg: string; lights: string; width: number; height: number };

// Warm dark outlines, not black: the game's style guide.
const INK = "#2b1d14";
const SW = 1.3;

/** Shared paint for every building: soft light from the top left, glass that reflects the sky, a faint grain. */
const DEFS = `<defs>
<linearGradient id="wallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1a0f08" stop-opacity="0.2"/></linearGradient>
<linearGradient id="sideShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a0f08" stop-opacity="0.04"/><stop offset="1" stop-color="#1a0f08" stop-opacity="0.22"/></linearGradient>
<linearGradient id="roofShade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a0f08" stop-opacity="0.12"/><stop offset="1" stop-color="#fff" stop-opacity="0.18"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7eefb"/><stop offset="0.45" stop-color="#8cc2e6"/><stop offset="1" stop-color="#4f86b3"/></linearGradient>
<linearGradient id="ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0f08" stop-opacity="0.32"/><stop offset="1" stop-color="#1a0f08" stop-opacity="0"/></linearGradient>
<pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="2" r="0.45" fill="#1a0f08" opacity="0.12"/><circle cx="5" cy="5.5" r="0.4" fill="#fff" opacity="0.18"/><circle cx="5.5" cy="1" r="0.35" fill="#1a0f08" opacity="0.08"/></pattern>
</defs>`;

function rgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function hexOf([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
/** Darker (f < 1) or lighter (f > 1). */
export function shade(hex: string, f: number): string {
  const [r, g, b] = rgb(hex);
  if (f <= 1) return hexOf([r * f, g * f, b * f]);
  const t = f - 1;
  return hexOf([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]);
}

function rng(seed: number): () => number {
  let s = (Math.abs(seed) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const n = (v: number) => +v.toFixed(1);

/** A drawing in progress: parts and lit windows. */
class Pic {
  parts: string[] = [];
  lights: string[] = [];
  constructor(
    public W: number,
    public H: number,
    public r: () => number,
  ) {}
  add(s: string) {
    this.parts.push(s);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, fill: string, o: { rx?: number; line?: boolean; op?: number } = {}) {
    return this.add(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${o.rx ? ` rx="${o.rx}"` : ""} fill="${fill}"${o.op != null ? ` opacity="${o.op}"` : ""}${o.line === false ? "" : ` stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"`}/>`);
  }
  poly(pts: [number, number][], fill: string, line = true) {
    return this.add(`<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" fill="${fill}"${line ? ` stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"` : ""}/>`);
  }
  path(d: string, fill: string, line = true, extra = "") {
    return this.add(`<path d="${d}" fill="${fill}"${line ? ` stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"` : ""} ${extra}/>`);
  }
  line(x1: number, y1: number, x2: number, y2: number, color = INK, w = 1.2) {
    return this.add(`<path d="M${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`);
  }
  circle(x: number, y: number, r: number, fill: string, line = true) {
    return this.add(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}"${line ? ` stroke="${INK}" stroke-width="${SW}"` : ""}/>`);
  }
  ellipse(x: number, y: number, rx: number, ry: number, fill: string, line = true) {
    return this.add(`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${line ? ` stroke="${INK}" stroke-width="${SW}"` : ""}/>`);
  }
  text(x: number, y: number, t: string, size: number, fill = "#ffffff", weight = 800) {
    return this.add(`<text x="${n(x)}" y="${n(y)}" font-family="Nunito, Arial Rounded MT Bold, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="middle">${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`);
  }
  /** A lit window for the night overlay. */
  light(x: number, y: number, w: number, h: number) {
    if (this.r() < 0.62) this.lights.push(`<rect x="${n(x + 0.6)}" y="${n(y + 0.6)}" width="${n(w - 1.2)}" height="${n(h - 1.2)}" fill="${this.r() < 0.8 ? "#ffd97a" : "#fff3c4"}"/>`);
  }
}

/** An oblique box: front wall from (x, yb) up by F, receding D up and S right. Returns the roof's corners. */
function box(p: Pic, x: number, yb: number, W: number, F: number, D: number, S: number, wall: string, roof: string) {
  const side = shade(wall, 0.78);
  const pts = (q: [number, number][]) => q.map(([a, b]) => `${n(a)},${n(b)}`).join(" ");
  // A soft shadow cast on the ground to the right, and darker ground where the wall meets it.
  p.add(`<polygon points="${pts([[x + W, yb], [x + W + 10, yb], [x + W + S + 10, yb - D], [x + W + S, yb - D]])}" fill="#1a0f08" opacity="0.16"/>`);
  p.add(`<rect x="${n(x - 1)}" y="${n(yb)}" width="${n(W + 2)}" height="4" fill="url(#ao)"/>`);
  const sidePts: [number, number][] = [[x + W, yb], [x + W + S, yb - D], [x + W + S, yb - D - F], [x + W, yb - F]];
  p.poly(sidePts, side);
  p.add(`<polygon points="${pts(sidePts)}" fill="url(#sideShade)"/>`);
  p.rect(x, yb - F, W, F, wall);
  p.add(`<rect x="${n(x)}" y="${n(yb - F)}" width="${n(W)}" height="${n(F)}" fill="url(#grain)"/><rect x="${n(x)}" y="${n(yb - F)}" width="${n(W)}" height="${n(F)}" fill="url(#wallShade)"/>`);
  // A plinth along the foot of the wall.
  const plinth = Math.min(4, F * 0.12);
  p.add(`<rect x="${n(x + 0.6)}" y="${n(yb - plinth)}" width="${n(W - 1.2)}" height="${n(plinth - 0.6)}" fill="${shade(wall, 0.72)}"/>`);
  const roofPts: [number, number][] = [[x, yb - F], [x + W, yb - F], [x + W + S, yb - F - D], [x + S, yb - F - D]];
  p.poly(roofPts, roof);
  p.add(`<polygon points="${pts(roofPts)}" fill="url(#roofShade)"/>`);
  // Parapet edge catching the light.
  p.line(x + 1, yb - F - 0.8, x + W - 1, yb - F - 0.8, shade(roof, 1.35), 1.1);
  return { top: yb - F, back: yb - F - D };
}

/** Ground for the lot: grass or paving, with a kerb. */
function ground(p: Pic, w: number, h: number, fill: string) {
  const H = p.H;
  p.poly([[1, H - 1], [w - 1, H - 1], [w - 1, H - h + 3], [1, H - h + 3]], fill, false);
  p.add(`<path d="M1 ${n(H - 1)} L${n(w - 1)} ${n(H - 1)}" stroke="${shade(fill, 0.75)}" stroke-width="2"/>`);
}

function bush(p: Pic, x: number, y: number, s = 1) {
  p.circle(x - 4 * s, y, 4.5 * s, "#2f8f46");
  p.circle(x + 4 * s, y, 4.5 * s, "#2f8f46");
  p.circle(x, y - 3 * s, 5 * s, "#3fae5a");
}

function tree(p: Pic, x: number, y: number, s = 1) {
  p.rect(x - 1.5 * s, y - 8 * s, 3 * s, 9 * s, "#6b4423");
  p.circle(x, y - 13 * s, 8 * s, "#2f8f46");
  p.circle(x - 3 * s, y - 15 * s, 4 * s, "#4cbb63", false);
}

function palm(p: Pic, x: number, y: number) {
  p.path(`M${x} ${y} Q${x + 2} ${y - 12} ${x + 1} ${y - 22}`, "none", false, `stroke="#7c5a2e" stroke-width="3"`);
  for (const [dx, dy] of [[-9, -2], [9, -1], [-6, -7], [7, -7], [0, -9]]) p.path(`M${x + 1} ${y - 22} Q${x + 1 + dx * 0.6} ${y - 26 + dy * 0.4} ${x + 1 + dx} ${y - 20 + dy}`, "none", false, `stroke="#2f8f46" stroke-width="3" stroke-linecap="round"`);
}

/** A grid of windows on a front wall. */
function windows(p: Pic, x: number, y: number, W: number, F: number, rows: number, o: { ww?: number; wh?: number; glass?: string; gap?: number; skipDoor?: number; band?: boolean } = {}) {
  const ww = o.ww ?? 6;
  const wh = o.wh ?? 7;
  const glass = o.glass ?? "#8ec5e8";
  const fh = F / rows;
  for (let row = 0; row < rows; row++) {
    const wy = y + row * fh + (fh - wh) / 2;
    if (o.band) {
      p.rect(x + 3, wy, W - 6, wh, glass);
      p.light(x + 3, wy, W - 6, wh);
      continue;
    }
    const cols = Math.max(1, Math.floor((W - 4) / (ww + (o.gap ?? 5))));
    const step = (W - 4) / cols;
    for (let c = 0; c < cols; c++) {
      const wx = x + 2 + c * step + (step - ww) / 2;
      if (o.skipDoor != null && row === rows - 1 && Math.abs(wx + ww / 2 - o.skipDoor) < 9) continue;
      // Framed glass with a sill and a sky reflection.
      p.rect(wx, wy, ww, wh, o.glass ? glass : "url(#glass)", { line: false });
      p.add(`<rect x="${n(wx)}" y="${n(wy)}" width="${n(ww)}" height="${n(wh)}" fill="none" stroke="#f6f1e7" stroke-width="0.9"/><rect x="${n(wx - 0.4)}" y="${n(wy - 0.4)}" width="${n(ww + 0.8)}" height="${n(wh + 0.8)}" fill="none" stroke="${INK}" stroke-width="0.5" opacity="0.7"/>`);
      p.add(`<path d="M${n(wx + 0.8)} ${n(wy + wh * 0.7)} L${n(wx + ww * 0.7)} ${n(wy + 0.8)}" stroke="#ffffff" stroke-width="1" opacity="0.5"/>`);
      p.rect(wx - 0.8, wy + wh, ww + 1.6, 1.2, "#efe8da", { line: false });
      p.light(wx, wy, ww, wh);
    }
  }
}

function door(p: Pic, cx: number, yb: number, w = 8, h = 11, fill = "#7c4a24") {
  p.rect(cx - w / 2 - 1.2, yb - h - 1.2, w + 2.4, h + 1.2, "#efe8da", { line: false });
  p.rect(cx - w / 2 - 2, yb - 1, w + 4, 2, "#cfc6b5", { line: false });
  p.rect(cx - w / 2, yb - h, w, h, fill);
  p.rect(cx - w / 2 + 1.2, yb - h + 1.2, w - 2.4, h * 0.4, shade(fill, 1.2), { line: false, op: 0.6 });
  p.circle(cx + w / 2 - 2, yb - h / 2, 0.7, "#e6b53a", false);
}

function sign(p: Pic, cx: number, y: number, text: string, bg: string, fg = "#ffffff", size = 6) {
  const w = text.length * size * 0.66 + 6;
  p.rect(cx - w / 2, y - size * 0.75, w, size * 1.5, bg, { rx: 1.5 });
  p.text(cx, y + 0.3, text, size, fg);
}

function awning(p: Pic, x: number, y: number, w: number, a: string, b = "#ffffff") {
  const stripes = Math.max(3, Math.round(w / 6));
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) p.poly([[x + i * sw, y], [x + (i + 1) * sw, y], [x + (i + 1) * sw + 1.5, y + 6], [x + i * sw + 1.5, y + 6]], i % 2 ? b : a, false);
  p.add(`<path d="M${n(x)} ${n(y)} L${n(x + w)} ${n(y)} L${n(x + w + 1.5)} ${n(y + 6)} L${n(x + 1.5)} ${n(y + 6)} Z" fill="none" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>`);
}

function tank(p: Pic, x: number, y: number) {
  p.rect(x - 4, y - 6, 8, 7, "#1f1f22", { rx: 2.5 });
  p.rect(x - 2.5, y - 8, 5, 2.2, "#2d2d31", { rx: 1 });
}

function acUnit(p: Pic, x: number, y: number) {
  p.rect(x, y, 9, 6, "#e5e7eb");
  p.circle(x + 4.5, y + 3, 1.8, "#9ca3af", false);
}

function flag(p: Pic, x: number, y: number) {
  p.line(x, y, x, y - 22, "#6b7280", 1.2);
  p.rect(x, y - 22, 4, 6, "#16a34a", { line: false });
  p.rect(x + 4, y - 22, 4, 6, "#ffffff", { line: false });
  p.rect(x + 8, y - 22, 4, 6, "#16a34a", { line: false });
}

function car(p: Pic, x: number, y: number, c: string) {
  p.rect(x, y - 5, 14, 6, c, { rx: 2 });
  p.rect(x + 3, y - 8, 8, 4, shade(c, 1.25), { rx: 1.5 });
  p.circle(x + 3, y + 1, 1.6, "#111", false);
  p.circle(x + 11, y + 1, 1.6, "#111", false);
}

function pitchedRoof(p: Pic, x: number, top: number, W: number, D: number, S: number, color: string) {
  const ridgeY = top - D * 0.5 - 7;
  p.poly([[x - 3, top + 1], [x + W + 3, top + 1], [x + W + S * 0.5 - 2, ridgeY], [x + S * 0.5 + 2, ridgeY]], shade(color, 0.86));
  p.poly([[x + W + 3, top + 1], [x + W + S + 2, top - D], [x + W + S * 0.5 - 2, ridgeY]], shade(color, 0.7));
  p.poly([[x + S * 0.5 + 2, ridgeY], [x + W + S * 0.5 - 2, ridgeY], [x + W + S + 2, top - D], [x + S - 2, top - D]], color);
  for (let i = 1; i < 4; i++) p.line(x - 3 + (W + 6) * (i / 4), top + 1, x + S * 0.5 + 2 + (W - 4) * (i / 4), ridgeY, shade(color, 0.7), 0.7);
}

// ── Each building kind ──────────────────────────────────────────────────────

type Draw = (p: Pic, o: BuildingArtOpts) => void;

/** Shared layout: the building's front edge, depth and lean for a footprint. */
function frame(o: BuildingArtOpts, H: number, inset = 6) {
  const D = Math.max(18, o.h * 0.62);
  const S = Math.min(16, D * 0.35);
  const yb = H - inset;
  const x = inset;
  const W = o.w - inset * 2 - S;
  return { D, S, yb, x, W };
}

const DRAW: Record<ArtKind, Draw> = {
  house: (p, o) => {
    ground(p, o.w, o.h, "#7cc46a");
    const { D, S, yb, x, W } = frame(o, p.H, 10);
    const F = 18;
    box(p, x, yb, W, F, D * 0.85, S, o.wall, o.trim);
    pitchedRoof(p, x, yb - F, W, D * 0.85, S, o.trim);
    door(p, x + W / 2, yb, 7, 11);
    windows(p, x + 2, yb - F + 3, W / 2 - 6, 9, 1, { ww: 6, wh: 6 });
    windows(p, x + W / 2 + 4, yb - F + 3, W / 2 - 6, 9, 1, { ww: 6, wh: 6 });
    if (p.r() < 0.6) tank(p, x + W - 6, yb - F - D * 0.6);
    bush(p, x + 2, yb + 4, 0.8);
    if (p.r() < 0.6) tree(p, o.w - 8, p.H - 4, 0.9);
    p.add(`<path d="M2 ${p.H - 3} L${o.w - 2} ${p.H - 3}" stroke="#9ca3af" stroke-width="1.6" stroke-dasharray="1.5 2"/>`);
  },
  bighouse: (p, o) => {
    ground(p, o.w, o.h, "#7cc46a");
    const { D, S, yb, x, W } = frame(o, p.H, 8);
    const F = 30;
    box(p, x, yb, W, F, D * 0.8, S, o.wall, o.trim);
    pitchedRoof(p, x, yb - F, W, D * 0.8, S, o.trim);
    windows(p, x, yb - F + 2, W, F - 4, 2, { ww: 6, wh: 7, skipDoor: x + W / 2 });
    door(p, x + W / 2, yb, 8, 12);
    p.rect(x + W / 2 - 10, yb - F / 2 - 1, 20, 3, shade(o.wall, 0.7));
    p.rect(0, p.H - 9, o.w, 6, "#d6d3d1", { rx: 1 });
    p.rect(o.w / 2 - 9, p.H - 10, 18, 7, "#374151");
  },
  duplex: (p, o) => {
    ground(p, o.w, o.h, "#7cc46a");
    const { D, S, yb, x, W } = frame(o, p.H, 7);
    const F = 30;
    box(p, x, yb, W, F, D * 0.8, S, o.wall, o.trim);
    pitchedRoof(p, x, yb - F, W / 2, D * 0.8, S * 0.5, o.trim);
    pitchedRoof(p, x + W / 2, yb - F, W / 2, D * 0.8, S * 0.5, shade(o.trim, 1.15));
    p.line(x + W / 2, yb, x + W / 2, yb - F, INK, 1.2);
    windows(p, x, yb - F + 2, W, F - 4, 2, { ww: 6, wh: 7 });
    door(p, x + W * 0.25, yb, 6, 10);
    door(p, x + W * 0.75, yb, 6, 10);
    car(p, x + 4, p.H - 2, ["#dc2626", "#2563eb", "#e5e7eb", "#111827"][Math.floor(p.r() * 4)]!);
  },
  townhouse: (p, o) => {
    ground(p, o.w, o.h, "#a3a3a3");
    const { D, S, yb, x, W } = frame(o, p.H, 5);
    const F = 14 + o.floors * 11;
    const units = 3;
    const uw = W / units;
    const colours = [o.wall, shade(o.trim, 1.6), shade(o.wall, 0.9)];
    for (let i = 0; i < units; i++) {
      const ux = x + i * uw;
      box(p, ux, yb, uw, F, D * 0.75, i === units - 1 ? S : 0.01, colours[i % 3]!, shade(o.trim, 0.9 + i * 0.08));
      windows(p, ux, yb - F + 2, uw, F - 4, o.floors, { ww: 5, wh: 7, skipDoor: ux + uw / 2 });
      door(p, ux + uw / 2, yb, 6, 10, shade(o.trim, 0.8));
    }
    for (let i = 0; i < units; i++) p.poly([[x + i * uw, yb - F], [x + (i + 1) * uw, yb - F], [x + (i + 0.5) * uw, yb - F - 8]], shade(o.trim, 0.8));
  },
  apartment: (p, o) => {
    ground(p, o.w, o.h, "#b9b3a7");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 14 + o.floors * 12;
    const { back } = box(p, x, yb, W, F, D * 0.75, S, o.wall, shade(o.wall, 0.86));
    windows(p, x, yb - F + 3, W, F - 6, o.floors, { ww: 6, wh: 7, skipDoor: x + W / 2 });
    // Balconies with washing lines.
    for (let f = 1; f < o.floors; f++) {
      const by = yb - F + 3 + ((F - 6) / o.floors) * f - 1;
      p.rect(x + 3, by, W - 6, 2.2, shade(o.wall, 0.65), { line: false });
      if (p.r() < 0.5) p.line(x + 6, by - 3, x + 18, by - 3, ["#ef4444", "#3b82f6", "#facc15"][f % 3]!, 1.3);
    }
    door(p, x + W / 2, yb, 9, 11, "#334155");
    tank(p, x + 10, back + 10);
    tank(p, x + W - 4, back + 12);
    p.ellipse(x + W / 2 + S / 2, back + 6, 4, 2.5, "#e5e7eb");
  },
  highrise: (p, o) => {
    ground(p, o.w, o.h, "#b9b3a7");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 14 + o.floors * 10;
    const { back } = box(p, x, yb, W, F, D * 0.75, S, o.wall, shade(o.trim, 1.2));
    for (let f = 0; f < o.floors; f++) {
      const wy = yb - F + 4 + f * 10;
      p.rect(x + 3, wy, W - 6, 6, shade(o.wall, 0.82), { line: false });
      for (let c = 0; c < 5; c++) p.light(x + 4 + c * ((W - 8) / 5), wy, (W - 8) / 5 - 1, 6);
    }
    for (let c = 1; c < 5; c++) p.line(x + 3 + c * ((W - 6) / 5), yb - F + 2, x + 3 + c * ((W - 6) / 5), yb - 12, "#e2e8f0", 0.8);
    p.rect(x + W / 2 - 8, yb - 11, 16, 11, "#334155");
    p.rect(x + 8, back + 4, W - 16, D * 0.4, "#38bdf8", { rx: 2 });
  },
  villa: (p, o) => {
    ground(p, o.w, o.h, "#86cf72");
    const { D, S, yb, x } = frame(o, p.H, 8);
    const F = 30;
    const W1 = o.w * 0.48;
    box(p, x, yb - 8, W1, F, D * 0.7, S * 0.6, o.wall, o.trim);
    windows(p, x, yb - 8 - F + 2, W1, F - 4, 2, { ww: 8, wh: 9, glass: "#9ad0f0" });
    door(p, x + W1 / 2, yb - 8, 9, 13, "#3f2a1a");
    p.rect(x + W1 + S + 10, yb - D * 0.6, o.w * 0.3, D * 0.45, "#38bdf8", { rx: 3 });
    p.rect(x + W1 + S + 12, yb - D * 0.6 + 2, o.w * 0.3 - 4, 3, "#bae6fd", { line: false, rx: 1 });
    palm(p, o.w - 12, p.H - 10);
    palm(p, x + W1 + 6, p.H - 6);
    p.rect(0, p.H - 6, o.w, 5, "#f5f5f4");
    p.rect(o.w * 0.62, p.H - 8, 20, 7, "#1f2937");
  },
  shop: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 16 + (o.floors - 1) * 12;
    box(p, x, yb, W, F, D * 0.75, S, o.wall, shade(o.wall, 0.85));
    p.rect(x + 4, yb - 12, W - 8, 11, "#9fd5f5");
    p.light(x + 4, yb - 12, W - 8, 11);
    awning(p, x + 2, yb - 17, W - 4, o.trim);
    sign(p, x + W / 2, yb - F + 5, o.label ?? ["PROVISIONS", "SUPA STORES", "MINI MART", "PHARMACY"][Math.floor(p.r() * 4)]!, o.trim, "#fff", 5);
    if (o.floors > 1) windows(p, x, yb - F + 9, W, 10, 1, { ww: 6, wh: 6 });
    p.rect(x + W - 6, yb - 5, 6, 5, "#ef4444");
  },
  restaurant: (p, o) => {
    ground(p, o.w, o.h, "#d6cfc2");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 18 + (o.floors - 1) * 12;
    box(p, x, yb - 6, W, F, D * 0.65, S, o.wall, shade(o.trim, 0.9));
    p.rect(x + 3, yb - 18, W - 6, 10, "#fcd34d");
    p.light(x + 3, yb - 18, W - 6, 10);
    awning(p, x + 1, yb - 6 - F + 6, W - 2, "#16a34a");
    sign(p, x + W / 2, yb - F - 3, o.label ?? ["MAMA'S KITCHEN", "SUYA SPOT", "THE GRILL", "BUKA"][Math.floor(p.r() * 4)]!, "#7c2d12", "#fde68a", 5);
    for (const tx of [x + 6, x + W / 2, x + W - 6]) {
      p.ellipse(tx, p.H - 4, 4, 1.6, "#78350f");
      p.path(`M${tx - 7} ${p.H - 12} Q${tx} ${p.H - 18} ${tx + 7} ${p.H - 12} Z`, "#ef4444");
      p.line(tx, p.H - 12, tx, p.H - 4, "#6b7280", 0.8);
    }
  },
  cafe: (p, o) => {
    ground(p, o.w, o.h, "#d6cfc2");
    const { D, S, yb, x, W } = frame(o, p.H, 8);
    const F = 18;
    box(p, x, yb - 4, W, F, D * 0.7, S, o.wall, shade(o.trim, 0.9));
    p.rect(x + 3, yb - 16, W - 6, 11, "#9fd5f5");
    p.light(x + 3, yb - 16, W - 6, 11);
    awning(p, x + 1, yb - 4 - F + 1, W - 2, o.trim, "#fef3c7");
    sign(p, x + W / 2, yb - F - 10, o.label ?? "CAFÉ", "#3f2a1a", "#fde68a", 6);
    p.circle(x + W - 4, yb - F - 10, 3.5, "#fef3c7");
    for (const tx of [x + 8, x + W - 8]) {
      p.circle(tx, p.H - 4, 2.6, "#ffffff");
      p.rect(tx - 5, p.H - 6, 2, 3, "#78350f", { line: false });
      p.rect(tx + 3, p.H - 6, 2, 3, "#78350f", { line: false });
    }
  },
  office: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 14 + o.floors * 11;
    const { back } = box(p, x, yb, W, F, D * 0.75, S, o.wall, shade(o.wall, 0.8));
    windows(p, x, yb - F + 3, W, F - 15, o.floors - 1, { band: true, glass: "#5b8db8", wh: 6 });
    p.rect(x + W / 2 - 9, yb - 12, 18, 12, "#7fb0d4");
    p.rect(x + W / 2 - 13, yb - 14, 26, 3, o.trim);
    acUnit(p, x + 6, back + 6);
    acUnit(p, x + W - 10, back + 8);
    sign(p, x + W / 2, yb - F + 2, o.label ?? "", o.trim, "#fff", 5);
  },
  supermarket: (p, o) => {
    ground(p, o.w, o.h, "#9ca3af");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 22;
    box(p, x, yb - 14, W, F, D * 0.55, S, o.wall, shade(o.wall, 0.85));
    p.rect(x + 6, yb - 14 - 14, W - 12, 13, "#9fd5f5");
    p.light(x + 6, yb - 28, W - 12, 13);
    p.rect(x, yb - 14 - F, W, 7, o.trim, { line: true });
    p.text(x + W / 2, yb - 14 - F + 3.6, o.label ?? "SUPERMART", 6, "#ffffff");
    for (let i = 0; i < 4; i++) car(p, x + 6 + i * 22, p.H - 3, ["#dc2626", "#e5e7eb", "#2563eb", "#111827"][i]!);
    for (let i = 0; i < 6; i++) p.line(x + 2 + i * 22, p.H - 1, x + 2 + i * 22, p.H - 10, "#f5f5f4", 1);
  },
  mall: (p, o) => {
    ground(p, o.w, o.h, "#9ca3af");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 16 + o.floors * 11;
    const { back } = box(p, x, yb - 10, W, F, D * 0.6, S, o.wall, shade(o.wall, 0.86));
    windows(p, x, yb - 10 - F + 12, W, F - 24, o.floors - 1, { band: true, glass: "#7fb0d4", wh: 7 });
    p.rect(x + W / 2 - 18, yb - 10 - F + 4, 36, F - 4, "#9fd5f5");
    p.light(x + W / 2 - 18, yb - 10 - F + 4, 36, F - 4);
    p.rect(x + W / 2 - 22, yb - 10 - F - 4, 44, 10, o.trim);
    p.text(x + W / 2, yb - 10 - F + 1, o.label ?? "MALL", 7, "#ffffff");
    for (const fx of [x + 6, x + W - 10]) flag(p, fx, yb - 10);
    p.rect(x + 10, back + 4, W * 0.3, D * 0.25, "#c7d2fe", { rx: 2 });
    for (let i = 0; i < 6; i++) car(p, x + 6 + i * 26, p.H - 2, ["#dc2626", "#e5e7eb", "#2563eb", "#111827", "#16a34a", "#f59e0b"][i]!);
  },
  bank: (p, o) => {
    ground(p, o.w, o.h, "#cfc7b8");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const base = yb - 12, podium = 30;
    const tx = x + W * 0.16, tw = W * 0.68;
    const tb = base - podium - 4, tf = Math.max(4, o.floors - 2) * 10;
    box(p, x, base, W, podium, D * 0.65, S, o.wall, shade(o.wall, 1.15));
    // Set-back curtain-wall tower, with individual framed panes and night lights.
    box(p, tx, tb, tw, tf, D * 0.45, S * 0.65, o.trim, shade(o.trim, 1.25));
    windows(p, tx, tb - tf + 2, tw, tf - 4, Math.max(4, o.floors - 2), { ww: 5, wh: 6, gap: 3 });
    p.rect(tx - 1, tb - tf - 2, tw + 2, 3, shade(o.wall, 1.1));
    for (let row = 0; row < Math.max(4, o.floors - 2); row++) {
      const sy = tb - tf + 3 + row * 10;
      p.poly([[tx + tw + 2, sy], [tx + tw + S * 0.65 - 1, sy - D * 0.45 + 3], [tx + tw + S * 0.65 - 1, sy - D * 0.45 + 8], [tx + tw + 2, sy + 5]], "url(#glass)");
    }
    // Stone courses, tall lobby glazing and a double glass entrance.
    for (let j = 1; j < 4; j++) p.line(x + 1, base - j * 7, x + W - 1, base - j * 7, shade(o.wall, 0.87), 0.5);
    for (const q of [0.09, 0.73]) {
      const wx = x + W * q;
      p.rect(wx, base - 21, W * 0.18, 19, "url(#glass)");
      p.light(wx, base - 21, W * 0.18, 19);
    }
    const cx = x + W / 2;
    door(p, cx, base, 16, 19, "#80b4c6");
    p.line(cx, base - 18, cx, base - 1, o.trim, 1.2);
    p.line(cx - 2, base - 10, cx - 2, base - 6, "#f3e8c9", 1);
    p.line(cx + 2, base - 10, cx + 2, base - 6, "#f3e8c9", 1);
    p.light(cx - 8, base - 19, 8, 18); p.light(cx, base - 19, 8, 18);
    for (const q of [0.04, 0.3, 0.66, 0.94]) {
      const col = x + W * q - 2;
      p.rect(col - 1, base - 23, 6, 3, shade(o.wall, 1.25));
      p.rect(col, base - 20, 4, 18, shade(o.wall, 1.18));
      p.line(col + 1, base - 19, col + 1, base - 3, "#fff6e5", 0.7);
      p.rect(col - 1, base - 3, 6, 3, shade(o.wall, 0.92));
    }
    sign(p, cx, base - 27, o.label ?? "BANKERS' ROW", o.trim, "#fff3db", Math.min(4.5, (W - 8) / ((o.label ?? "BANKERS' ROW").length * 0.66)));
    // Four independent blank brand plaques, with abstract marks only.
    ["#596c7b", "#916653", "#67714d", "#776482"].forEach((c, i) => {
      const px = x + 3 + i * ((W - 6) / 4);
      p.rect(px, base - 36, (W - 10) / 4, 5, c, { rx: 1 });
      p.circle(px + (W - 10) / 8, base - 33.5, 1.1, "#eee4cc", false);
    });
    for (let step = 0; step < 3; step++) p.rect(cx - 14 - step * 3, base + step * 3, 28 + step * 6, 3, shade(o.wall, 1.12 - step * 0.09));
    for (const px of [x + 5, x + W - 5]) {
      flag(p, px, yb - 1);
      p.rect(px - 4, yb - 5, 8, 5, shade(o.wall, 0.9));
      bush(p, px, yb - 7, 0.45);
    }
    box(p, x + W + 2, yb - 1, 8, 12, 6, 2, o.wall, o.trim);
    p.rect(x + W + 3, yb - 11, 6, 5, "url(#glass)");
    p.light(x + W + 3, yb - 11, 6, 5);
  },
  tower: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 8);
    const F = 16 + o.floors * 9;
    const { back } = box(p, x, yb, W, F, D * 0.7, S, o.wall, shade(o.trim, 1.3));
    for (let f = 0; f < o.floors; f++) {
      const wy = yb - F + 6 + f * 9;
      p.rect(x + 2, wy, W - 4, 5, shade(o.wall, 0.75), { line: false });
      for (let c = 0; c < 4; c++) p.light(x + 3 + c * ((W - 6) / 4), wy, (W - 6) / 4 - 1, 5);
    }
    p.add(`<path d="M${n(x + W * 0.2)} ${n(yb - F)} L${n(x + W * 0.2)} ${n(yb - 12)}" stroke="#e0f2fe" stroke-width="1" opacity="0.7"/>`);
    p.rect(x + W / 2 - 9, yb - 12, 18, 12, "#334155");
    p.line(x + W / 2 + S / 2, back + D * 0.3, x + W / 2 + S / 2, back - 22, "#475569", 1.4);
    p.circle(x + W / 2 + S / 2, back - 23, 1.6, "#ef4444", false);
    sign(p, x + W / 2, yb - F + 4, o.label ?? "", o.trim, "#fff", 5);
  },
  cinema: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 34;
    box(p, x, yb, W, F, D * 0.75, S, o.wall, shade(o.wall, 0.8));
    p.rect(x + 4, yb - F + 4, W - 8, 10, o.trim);
    p.text(x + W / 2, yb - F + 9.4, o.label ?? "CINEMA", 7, "#fff");
    for (let i = 0; i < 10; i++) p.circle(x + 5 + i * ((W - 10) / 9), yb - F + 16, 1, "#fde68a", false);
    p.rect(x + 6, yb - 15, 10, 13, "#f472b6");
    p.rect(x + W - 16, yb - 15, 10, 13, "#60a5fa");
    p.rect(x + W / 2 - 7, yb - 12, 14, 12, "#fcd34d");
    p.light(x + W / 2 - 7, yb - 12, 14, 12);
  },
  hotel: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 16 + o.floors * 10;
    box(p, x, yb, W, F, D * 0.75, S, o.wall, shade(o.trim, 1.1));
    windows(p, x, yb - F + 4, W, F - 18, o.floors - 1, { ww: 5, wh: 6, glass: "#93c5fd" });
    p.rect(x + W - 8, yb - F + 6, 6, 30, o.trim);
    p.add(`<text x="${n(x + W - 5)}" y="${n(yb - F + 21)}" font-family="system-ui,sans-serif" font-size="5" font-weight="800" fill="#fde68a" text-anchor="middle" writing-mode="tb">HOTEL</text>`);
    p.rect(x + W / 2 - 14, yb - 16, 28, 4, o.trim);
    p.rect(x + W / 2 - 8, yb - 12, 16, 12, "#fcd34d");
    p.light(x + W / 2 - 8, yb - 12, 16, 12);
    for (const fx of [x + 4, x + 10, x + 16]) flag(p, fx, yb + 2);
  },
  factory: (p, o) => {
    ground(p, o.w, o.h, "#a8a29e");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 26;
    box(p, x, yb, W, F, D * 0.7, S, o.wall, shade(o.wall, 0.8));
    // Sawtooth roof.
    const teeth = 5;
    for (let i = 0; i < teeth; i++) {
      const tx = x + S * 0.3 + (i * (W + S * 0.4)) / teeth;
      p.poly([[tx, yb - F], [tx + (W / teeth) * 0.8, yb - F - 12], [tx + W / teeth, yb - F]], shade(o.trim, 0.9 + (i % 2) * 0.1));
      p.rect(tx + 2, yb - F - 8, W / teeth - 6, 4, "#9fd5f5", { line: false });
    }
    for (let i = 0; i < 4; i++) p.rect(x + 6 + i * ((W - 12) / 4), yb - 14, (W - 12) / 4 - 6, 14, "#6b7280");
    windows(p, x, yb - F + 2, W, 8, 1, { ww: 6, wh: 5 });
    for (const cx of [x + W * 0.75, x + W * 0.88]) {
      p.rect(cx, yb - F - 40, 7, 36, "#9a3412");
      p.rect(cx, yb - F - 34, 7, 3, "#f5f5f4", { line: false });
      p.circle(cx + 4, yb - F - 46, 6, "#d1d5db", false);
      p.circle(cx + 9, yb - F - 52, 5, "#e5e7eb", false);
    }
  },
  warehouse: (p, o) => {
    ground(p, o.w, o.h, "#a8a29e");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 22;
    box(p, x, yb - 8, W, F, D * 0.62, S, o.wall, o.trim);
    for (let i = 1; i < 12; i++) p.line(x + (i * W) / 12, yb - 8, x + (i * W) / 12, yb - 8 - F, shade(o.wall, 0.8), 0.7);
    p.path(`M${x} ${yb - 8 - F} Q${x + W / 2 + S / 2} ${yb - 8 - F - D * 0.62 - 16} ${x + W + S} ${yb - 8 - F - D * 0.62}`, "none", true);
    for (let i = 0; i < 3; i++) p.rect(x + 8 + i * ((W - 16) / 3), yb - 8 - 15, (W - 16) / 3 - 8, 15, "#9ca3af");
    p.rect(x + 10, p.H - 10, 26, 9, "#f5f5f4");
    p.rect(x + 36, p.H - 8, 8, 7, "#dc2626");
  },
  plant: (p, o) => {
    ground(p, o.w, o.h, "#a8a29e");
    const { S, yb, x, W } = frame(o, p.H, 6);
    box(p, x, yb, W * 0.45, 18, 16, S * 0.5, o.wall, shade(o.wall, 0.8));
    windows(p, x, yb - 16, W * 0.45, 12, 1, { ww: 5, wh: 5 });
    for (let i = 0; i < 3; i++) {
      const cx = x + W * 0.55 + i * 18;
      p.rect(cx, yb - 46, 14, 44, "#e5e7eb");
      p.ellipse(cx + 7, yb - 46, 7, 3, "#f5f5f4");
      p.line(cx, yb - 30, cx + 14, yb - 30, "#9ca3af", 0.8);
    }
    p.ellipse(x + W * 0.25, yb - 30, 10, 6, "#d1d5db");
    p.line(x + W * 0.45, yb - 12, x + W * 0.55, yb - 12, "#6b7280", 2.4);
    p.line(x + W * 0.45, yb - 6, x + W, yb - 6, "#f59e0b", 1.6);
  },
  powerplant: (p, o) => {
    ground(p, o.w, o.h, "#a8a29e");
    const { S, yb, x, W } = frame(o, p.H, 6);
    // Cooling tower.
    const cx = x + W * 0.28;
    p.path(`M${cx - 20} ${yb} Q${cx - 10} ${yb - 35} ${cx - 14} ${yb - 64} L${cx + 14} ${yb - 64} Q${cx + 10} ${yb - 35} ${cx + 20} ${yb} Z`, "#d6d3d1");
    p.ellipse(cx, yb - 64, 14, 4, "#a8a29e");
    p.circle(cx - 4, yb - 74, 9, "#f5f5f4", false);
    p.circle(cx + 8, yb - 82, 8, "#e7e5e4", false);
    box(p, x + W * 0.52, yb, W * 0.32, 26, 18, S * 0.5, o.wall, shade(o.wall, 0.8));
    for (const sx of [x + W * 0.88, x + W * 0.94]) {
      p.rect(sx, yb - 62, 6, 60, "#f5f5f4");
      for (let k = 0; k < 4; k++) p.rect(sx, yb - 62 + k * 14, 6, 5, o.trim, { line: false });
    }
  },
  construction: (p, o) => {
    ground(p, o.w, o.h, "#c8b48a");
    const { D, S, yb, x, W } = frame(o, p.H, 8);
    const F = 14 + o.floors * 12;
    // A concrete frame going up.
    for (let f = 0; f <= o.floors; f++) p.rect(x, yb - 2 - f * 12, W, 2.4, "#a8a29e");
    for (let c = 0; c <= 4; c++) p.rect(x + (c * (W - 3)) / 4, yb - F, 3, F, "#a8a29e");
    p.poly([[x + W, yb - F], [x + W + S, yb - F - D * 0.5], [x + W + S, yb - D * 0.5], [x + W, yb]], "#d6d3d1");
    // Tower crane.
    const cx = x + W * 0.7;
    p.rect(cx, yb - F - 46, 4, F + 44, "#f59e0b");
    p.line(cx - 40, yb - F - 44, cx + 22, yb - F - 44, "#f59e0b", 3);
    p.line(cx - 34, yb - F - 44, cx - 34, yb - F - 20, "#6b7280", 0.8);
    p.rect(cx - 38, yb - F - 20, 8, 5, "#6b7280");
    p.rect(cx + 14, yb - F - 46, 8, 6, "#78716c");
    p.rect(0, p.H - 6, o.w, 5, "#f59e0b", { op: 0.9 });
    p.add(`<path d="M0 ${p.H - 3.5} L${o.w} ${p.H - 3.5}" stroke="#1c1917" stroke-width="2" stroke-dasharray="4 4"/>`);
  },
  logistics: (p, o) => {
    ground(p, o.w, o.h, "#9ca3af");
    const { S, yb, x, W } = frame(o, p.H, 6);
    const cols = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2"];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) box(p, x + c * (W / 5.4), yb - r * 9, W / 5.4 - 2, 8, 6, 3, cols[(r * 5 + c) % cols.length]!, shade(cols[(r * 5 + c) % cols.length]!, 1.2));
    p.rect(x + W * 0.1, yb - 52, 3, 50, "#1e3a8a");
    p.rect(x + W * 0.9, yb - 52, 3, 50, "#1e3a8a");
    p.rect(x + W * 0.1, yb - 54, W * 0.8 + 3, 4, "#1e40af");
    p.rect(x + W * 0.45, yb - 50, 8, 6, "#64748b");
    box(p, x + W + S - 30, yb, 24, 14, 10, 4, "#e5e7eb", "#94a3b8");
  },
  school: (p, o) => {
    ground(p, o.w, o.h, "#7cc46a");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 30;
    box(p, x, yb - 12, W * 0.7, F, D * 0.55, S, o.wall, o.trim);
    windows(p, x, yb - 12 - F + 3, W * 0.7, F - 6, 2, { ww: 7, wh: 7, skipDoor: x + W * 0.35 });
    door(p, x + W * 0.35, yb - 12, 10, 12, "#1e3a8a");
    sign(p, x + W * 0.35, yb - 12 - F - 4, o.label ?? "SCHOOL", o.trim, "#fff", 5.5);
    flag(p, x + W * 0.78, yb - 4);
    // Football pitch in the yard.
    const px = x + W * 0.74;
    p.rect(px, yb - 26, W * 0.26, 22, "#4ade80");
    p.rect(px + 2, yb - 24, W * 0.26 - 4, 18, "none");
    p.line(px + W * 0.13, yb - 24, px + W * 0.13, yb - 6, "#ffffff", 0.8);
  },
  hospital: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 14 + o.floors * 11;
    const { back } = box(p, x, yb - 6, W, F, D * 0.65, S, o.wall, "#e5e7eb");
    windows(p, x, yb - 6 - F + 4, W, F - 18, o.floors - 1, { ww: 6, wh: 6, glass: "#bfdbfe" });
    p.rect(x + W / 2 - 12, yb - 6 - 14, 24, 14, "#9fd5f5");
    p.rect(x + W / 2 - 16, yb - 6 - 17, 32, 4, "#dc2626");
    p.rect(x + 10, yb - 6 - F - 10, 14, 14, "#ffffff");
    p.rect(x + 15, yb - 6 - F - 8, 4, 10, "#dc2626", { line: false });
    p.rect(x + 12, yb - 6 - F - 5, 10, 4, "#dc2626", { line: false });
    sign(p, x + W / 2 + 8, yb - 6 - F + 4, o.label ?? "HOSPITAL", "#dc2626", "#fff", 5.5);
    p.circle(x + W * 0.7 + S * 0.5, back + D * 0.3, 7, "#9ca3af");
    p.text(x + W * 0.7 + S * 0.5, back + D * 0.3 + 0.3, "H", 7, "#fff");
    p.rect(x + W - 22, p.H - 9, 18, 8, "#ffffff");
    p.rect(x + W - 22, p.H - 7, 18, 2, "#dc2626", { line: false });
  },
  clinic: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 8);
    const F = 14 + o.floors * 10;
    box(p, x, yb, W, F, D * 0.7, S, o.wall, "#e5e7eb");
    windows(p, x, yb - F + 3, W, F - 15, Math.max(1, o.floors - 1), { ww: 6, wh: 6, glass: "#bfdbfe" });
    door(p, x + W / 2, yb, 10, 11, "#9fd5f5");
    p.rect(x + W / 2 - 6, yb - F - 12, 12, 12, "#16a34a");
    p.rect(x + W / 2 - 1.5, yb - F - 10, 3, 8, "#fff", { line: false });
    p.rect(x + W / 2 - 4, yb - F - 7.5, 8, 3, "#fff", { line: false });
    sign(p, x + W / 2, yb - 14, o.label ?? "CLINIC", "#16a34a", "#fff", 4.5);
  },
  police: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 30;
    box(p, x, yb - 6, W, F, D * 0.7, S, o.wall, shade(o.trim, 1.3));
    windows(p, x, yb - 6 - F + 10, W, F - 12, 2, { ww: 6, wh: 6, skipDoor: x + W / 2 });
    p.rect(x, yb - 6 - F, W, 8, o.trim);
    p.text(x + W / 2, yb - 6 - F + 4.2, o.label ?? "POLICE", 6, "#fff");
    door(p, x + W / 2, yb - 6, 10, 12, "#1e3a8a");
    p.rect(x + 4, p.H - 9, 18, 8, "#1e3a8a");
    p.rect(x + 4, p.H - 7, 18, 2, "#fff", { line: false });
    p.rect(x + 11, p.H - 11, 4, 2, "#ef4444", { line: false });
  },
  firestation: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 30;
    box(p, x, yb, W * 0.75, F, D * 0.7, S * 0.5, o.wall, shade(o.trim, 1.2));
    for (let i = 0; i < 2; i++) p.rect(x + 4 + i * (W * 0.75 - 8) / 2, yb - 18, (W * 0.75 - 8) / 2 - 4, 18, i ? "#b91c1c" : "#991b1b");
    p.rect(x, yb - F, W * 0.75, 7, o.trim);
    p.text(x + W * 0.375, yb - F + 3.8, o.label ?? "FIRE SERVICE", 5, "#fff");
    box(p, x + W * 0.75 + S * 0.5, yb, W * 0.2, 52, 10, 4, o.wall, o.trim);
    windows(p, x + W * 0.75 + S * 0.5, yb - 50, W * 0.2, 30, 3, { ww: 4, wh: 5 });
  },
  government: (p, o) => {
    ground(p, o.w, o.h, "#d6d3d1");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 14 + o.floors * 11;
    const { back } = box(p, x, yb - 8, W, F, D * 0.6, S, o.wall, shade(o.wall, 0.85));
    windows(p, x, yb - 8 - F + 4, W, F - 8, o.floors, { ww: 5, wh: 7 });
    // Portico: columns and a pediment.
    const px = x + W / 2 - 22;
    for (let i = 0; i < 6; i++) p.rect(px + i * 8.4, yb - 8 - 22, 3.4, 22, "#f5f5f4");
    p.poly([[px - 4, yb - 8 - 22], [px + 48, yb - 8 - 22], [px + 22, yb - 8 - 32]], "#f5f5f4");
    p.rect(px - 6, yb - 8, 56, 3, "#e7e5e4");
    p.rect(px - 10, yb - 5, 64, 3, "#d6d3d1");
    p.ellipse(x + W / 2 + S / 2, back + 4, 12, 9, o.trim);
    flag(p, x + W / 2 + S / 2, back - 4);
    sign(p, x + W / 2, yb - 8 - F + 1, o.label ?? "", o.trim, "#fff", 5);
  },
  library: (p, o) => {
    ground(p, o.w, o.h, "#d6d3d1");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 30;
    box(p, x, yb - 6, W, F, D * 0.7, S, o.wall, shade(o.trim, 1.1));
    for (let i = 0; i < 5; i++) p.rect(x + 6 + i * ((W - 12) / 4) - 2, yb - 6 - 22, 4, 22, "#f5f5f4");
    p.poly([[x + 2, yb - 6 - 22], [x + W - 2, yb - 6 - 22], [x + W / 2, yb - 6 - F - 4]], "#f5f5f4");
    sign(p, x + W / 2, yb - 6 - F + 2, o.label ?? "LIBRARY", o.trim, "#fff", 4.5);
    p.rect(x + W / 2 - 5, yb - 6 - 14, 10, 14, "#fcd34d");
    p.light(x + W / 2 - 5, yb - 20, 10, 14);
  },
  community: (p, o) => {
    ground(p, o.w, o.h, "#7cc46a");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 20;
    box(p, x, yb - 6, W, F, D * 0.7, S, o.wall, o.trim);
    windows(p, x, yb - 6 - F + 3, W, F - 6, 1, { ww: 8, wh: 8, skipDoor: x + W / 2 });
    door(p, x + W / 2, yb - 6, 12, 12, o.trim);
    sign(p, x + W / 2, yb - 6 - F - 4, o.label ?? "COMMUNITY CENTRE", o.trim, "#fff", 4.2);
    for (let i = 0; i < 5; i++) p.circle(x + 6 + i * ((W - 12) / 4), yb - 6 - F + 1, 1.4, ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ec4899"][i]!, false);
  },
  watertower: (p, o) => {
    ground(p, o.w, o.h, "#a3a3a3");
    const cx = o.w / 2;
    const yb = p.H - 8;
    for (const dx of [-12, -4, 4, 12]) p.line(cx + dx, yb, cx + dx * 0.6, yb - 40, "#1e3a8a", 2);
    p.line(cx - 12, yb - 20, cx + 12, yb - 20, "#1e3a8a", 1.2);
    p.rect(cx - 16, yb - 66, 32, 26, o.wall, { rx: 6 });
    p.ellipse(cx, yb - 66, 16, 5, shade(o.wall, 1.2));
    p.rect(cx - 16, yb - 58, 32, 3, o.trim, { line: false });
    p.text(cx, yb - 50, "WATER", 5, "#fff");
  },
  substation: (p, o) => {
    ground(p, o.w, o.h, "#bdb7aa");
    const { S, yb, x, W } = frame(o, p.H, 6);
    for (let i = 0; i < 3; i++) box(p, x + 6 + i * (W / 3), yb - 6, W / 3 - 10, 14, 10, 4, "#9ca3af", "#6b7280");
    for (const px of [x + 4, x + W]) {
      p.line(px, yb, px + 4, yb - 46, "#6b7280", 1.6);
      p.line(px + 8, yb, px + 4, yb - 46, "#6b7280", 1.6);
      p.line(px - 4, yb - 40, px + 12, yb - 40, "#6b7280", 1.4);
    }
    p.path(`M${x + 4} ${yb - 40} Q${x + W / 2} ${yb - 30} ${x + W + 4} ${yb - 40}`, "none", false, `stroke="#1f2937" stroke-width="0.8"`);
    p.add(`<path d="M2 ${p.H - 3} L${o.w - 2} ${p.H - 3} M2 ${p.H - 3} L2 ${p.H - o.h + 6} M${o.w - 2} ${p.H - 3} L${o.w - 2} ${p.H - o.h + 6}" stroke="#57534e" stroke-width="1.4" stroke-dasharray="2 1.5" fill="none"/>`);
    p.rect(o.w / 2 - 6, p.H - 12, 12, 7, "#facc15");
    p.text(o.w / 2, p.H - 8.4, "⚡", 6, "#1c1917");
    void S;
  },
  waste: (p, o) => {
    ground(p, o.w, o.h, "#a8a29e");
    const { yb, x, W } = frame(o, p.H, 6);
    for (let i = 0; i < 3; i++) p.path(`M${x + i * 24} ${yb - 4} Q${x + 10 + i * 24} ${yb - 22 - (i % 2) * 6} ${x + 22 + i * 24} ${yb - 4} Z`, ["#78716c", "#a16207", "#57534e"][i]!);
    for (let i = 0; i < 3; i++) box(p, x + W * 0.55 + i * 12, yb, 10, 8, 6, 3, "#16a34a", "#15803d");
    p.rect(x + 4, p.H - 10, 24, 9, "#65a30d");
    p.rect(x + 28, p.H - 9, 7, 8, "#e5e7eb");
  },
  solar: (p, o) => {
    ground(p, o.w, o.h, "#a3a3a3");
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) p.poly([[6 + c * ((o.w - 8) / 4), p.H - 8 - r * 14], [6 + (c + 1) * ((o.w - 8) / 4) - 3, p.H - 8 - r * 14], [9 + (c + 1) * ((o.w - 8) / 4) - 3, p.H - 16 - r * 14], [9 + c * ((o.w - 8) / 4), p.H - 16 - r * 14]], "#1e40af");
  },
  stadium: (p, o) => {
    ground(p, o.w, o.h, "#7cc46a");
    const cx = o.w / 2;
    const cy = p.H - o.h / 2 - 6;
    const rx = o.w / 2 - 8;
    const ry = o.h / 2 - 6;
    p.ellipse(cx, cy + 6, rx, ry, "#9ca3af");
    p.ellipse(cx, cy, rx, ry, "#e5e7eb");
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      p.line(cx + Math.cos(a) * rx * 0.72, cy + Math.sin(a) * ry * 0.72, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, "#9ca3af", 0.8);
    }
    p.ellipse(cx, cy, rx * 0.72, ry * 0.72, "#16a34a");
    p.rect(cx - rx * 0.5, cy - ry * 0.45, rx, ry * 0.9, "#22c55e", { line: false });
    p.add(`<rect x="${n(cx - rx * 0.5)}" y="${n(cy - ry * 0.45)}" width="${n(rx)}" height="${n(ry * 0.9)}" fill="none" stroke="#fff" stroke-width="1"/><path d="M${n(cx)} ${n(cy - ry * 0.45)} L${n(cx)} ${n(cy + ry * 0.45)}" stroke="#fff" stroke-width="1"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(ry * 0.15)}" fill="none" stroke="#fff" stroke-width="1"/>`);
    for (const [fx, fy] of [[cx - rx * 0.8, cy - ry * 0.8], [cx + rx * 0.8, cy - ry * 0.8], [cx - rx * 0.8, cy + ry * 0.6], [cx + rx * 0.8, cy + ry * 0.6]] as const) {
      p.line(fx, fy, fx, fy - 26, "#6b7280", 1.4);
      p.rect(fx - 5, fy - 30, 10, 5, "#fef9c3");
    }
  },
  museum: (p, o) => {
    ground(p, o.w, o.h, "#d6d3d1");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 30;
    box(p, x, yb - 10, W, F, D * 0.6, S, o.wall, shade(o.wall, 0.85));
    const cols = 8;
    for (let i = 0; i < cols; i++) p.rect(x + 6 + i * ((W - 12) / (cols - 1)) - 2, yb - 10 - 24, 4, 24, "#f5f5f4");
    p.poly([[x - 2, yb - 10 - 24], [x + W + 2, yb - 10 - 24], [x + W / 2, yb - 10 - F - 10]], "#f5f5f4");
    p.rect(x - 4, yb - 10, W + 8, 4, "#e7e5e4");
    p.rect(x - 8, yb - 6, W + 16, 4, "#d6d3d1");
    sign(p, x + W / 2, yb - 10 - F + 3, o.label ?? "NATIONAL MUSEUM", "#57534e", "#fde68a", 4.5);
    p.rect(x + 8, yb - 30, 6, 16, "#b91c1c");
    p.rect(x + W - 14, yb - 30, 6, 16, "#b91c1c");
  },
  monument: (p, o) => {
    ground(p, o.w, o.h, "#d6d3d1");
    const cx = o.w / 2;
    const yb = p.H - 10;
    p.ellipse(cx, yb, o.w / 2 - 6, o.h / 3, "#bae6fd");
    p.ellipse(cx, yb, o.w / 2 - 14, o.h / 3 - 6, "#7dd3fc", false);
    p.rect(cx - 9, yb - 8, 18, 8, "#e5e7eb");
    p.poly([[cx - 6, yb - 8], [cx + 6, yb - 8], [cx + 3, yb - 78], [cx - 3, yb - 78]], "#f5f5f4");
    p.poly([[cx - 3, yb - 78], [cx + 3, yb - 78], [cx, yb - 86]], "#f5f5f4");
    p.line(cx + 2, yb - 10, cx + 1, yb - 74, "#d6d3d1", 1);
    for (const fx of [cx - 20, cx + 20]) {
      p.circle(fx, yb - 2, 3, "#e0f2fe", false);
      p.circle(fx, yb - 6, 2, "#ffffff", false);
    }
  },
  skyscraper: (p, o) => {
    ground(p, o.w, o.h, "#c9c2b6");
    const { D, S, yb, x, W } = frame(o, p.H, 8);
    const F = 16 + o.floors * 8;
    const { back } = box(p, x, yb, W, F, D * 0.7, S, o.wall, shade(o.trim, 1.4));
    for (let f = 0; f < o.floors; f++) {
      const wy = yb - F + 4 + f * 8;
      p.rect(x + 2, wy, W - 4, 4.5, shade(o.wall, 0.72), { line: false });
      for (let c = 0; c < 4; c++) p.light(x + 3 + c * ((W - 6) / 4), wy, (W - 6) / 4 - 1, 4.5);
    }
    // Crown and spire.
    const tx = x + W / 2 + S / 2;
    p.poly([[x + 4, yb - F], [x + W - 4, yb - F], [tx + 6, back - 18], [tx - 6, back - 18]], shade(o.wall, 1.15));
    p.line(tx, back - 18, tx, back - 64, "#cbd5e1", 2.4);
    p.circle(tx, back - 66, 2, "#ef4444", false);
    p.rect(x + W / 2 - 10, yb - 13, 20, 13, "#1e293b");
  },
  mosque: (p, o) => {
    ground(p, o.w, o.h, "#e7e5e4");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 26;
    box(p, x + W * 0.15, yb - 6, W * 0.7, F, D * 0.6, S, o.wall, shade(o.wall, 0.9));
    for (let i = 0; i < 5; i++) p.path(`M${x + W * 0.2 + i * (W * 0.12)} ${yb - 6} L${x + W * 0.2 + i * (W * 0.12)} ${yb - 20} Q${x + W * 0.25 + i * (W * 0.12)} ${yb - 26} ${x + W * 0.3 + i * (W * 0.12)} ${yb - 20} L${x + W * 0.3 + i * (W * 0.12)} ${yb - 6}`, "#a5b4fc");
    const dx = x + W / 2 + S / 2;
    p.path(`M${dx - 22} ${yb - 6 - F} Q${dx - 22} ${yb - 6 - F - 34} ${dx} ${yb - 6 - F - 38} Q${dx + 22} ${yb - 6 - F - 34} ${dx + 22} ${yb - 6 - F} Z`, o.trim);
    p.line(dx, yb - 6 - F - 38, dx, yb - 6 - F - 48, "#c49b2a", 1.4);
    for (const mx of [x + 4, x + W - 4]) {
      p.rect(mx - 3, yb - 76, 6, 72, o.wall);
      p.poly([[mx - 3, yb - 76], [mx + 3, yb - 76], [mx, yb - 88]], o.trim);
      p.rect(mx - 4.5, yb - 54, 9, 3, o.trim);
    }
  },
  church: (p, o) => {
    ground(p, o.w, o.h, "#e7e5e4");
    const { D, S, yb, x, W } = frame(o, p.H, 6);
    const F = 34;
    box(p, x, yb - 6, W, F, D * 0.6, S, o.wall, shade(o.trim, 1.6));
    for (let i = 0; i < 6; i++) p.path(`M${x + 8 + i * ((W - 16) / 5) - 3} ${yb - 14} L${x + 8 + i * ((W - 16) / 5) - 3} ${yb - 28} Q${x + 8 + i * ((W - 16) / 5)} ${yb - 33} ${x + 8 + i * ((W - 16) / 5) + 3} ${yb - 28} L${x + 8 + i * ((W - 16) / 5) + 3} ${yb - 14} Z`, "#93c5fd");
    const tx = x + W / 2;
    p.poly([[tx - 14, yb - 6 - F], [tx + 14, yb - 6 - F], [tx, yb - 6 - F - 54]], o.wall);
    p.line(tx, yb - 6 - F - 54, tx, yb - 6 - F - 68, o.trim, 2.4);
    p.line(tx - 5, yb - 6 - F - 63, tx + 5, yb - 6 - F - 63, o.trim, 2.4);
    p.path(`M${tx - 7} ${yb - 6} L${tx - 7} ${yb - 20} Q${tx} ${yb - 28} ${tx + 7} ${yb - 20} L${tx + 7} ${yb - 6} Z`, "#7c4a24");
  },
  park: (p, o) => {
    ground(p, o.w, o.h, "#6fc35e");
    const H = p.H;
    p.path(`M0 ${H - o.h * 0.4} Q${o.w * 0.5} ${H - o.h * 0.75} ${o.w} ${H - o.h * 0.45}`, "none", false, `stroke="#e7d9b8" stroke-width="5" stroke-linecap="round"`);
    p.path(`M${o.w * 0.4} ${H} Q${o.w * 0.45} ${H - o.h * 0.4} ${o.w * 0.6} ${H - o.h + 4}`, "none", false, `stroke="#e7d9b8" stroke-width="4" stroke-linecap="round"`);
    for (let i = 0; i < 4; i++) tree(p, 8 + p.r() * (o.w - 16), H - 6 - p.r() * (o.h - 20), 0.8 + p.r() * 0.3);
    p.rect(o.w * 0.2, H - o.h * 0.35, 12, 3, "#92400e");
    p.rect(o.w * 0.65, H - o.h * 0.55, 12, 3, "#92400e");
    for (let i = 0; i < 6; i++) p.circle(6 + p.r() * (o.w - 12), H - 4 - p.r() * (o.h - 10), 1.4, ["#f472b6", "#facc15", "#fff"][i % 3]!, false);
  },
  playground: (p, o) => {
    ground(p, o.w, o.h, "#6fc35e");
    const H = p.H;
    p.ellipse(o.w * 0.3, H - o.h * 0.45, o.w * 0.18, o.h * 0.2, "#fde68a");
    p.line(o.w * 0.6, H - 10, o.w * 0.6, H - 34, "#dc2626", 2);
    p.line(o.w * 0.85, H - 10, o.w * 0.85, H - 34, "#dc2626", 2);
    p.line(o.w * 0.6, H - 34, o.w * 0.85, H - 34, "#dc2626", 2);
    p.line(o.w * 0.68, H - 34, o.w * 0.68, H - 16, "#6b7280", 0.8);
    p.line(o.w * 0.77, H - 34, o.w * 0.77, H - 16, "#6b7280", 0.8);
    p.rect(o.w * 0.66, H - 16, 5, 2, "#1d4ed8");
    p.rect(o.w * 0.75, H - 16, 5, 2, "#1d4ed8");
    p.poly([[o.w * 0.15, H - 10], [o.w * 0.3, H - 30], [o.w * 0.34, H - 30], [o.w * 0.2, H - 10]], "#3b82f6");
    p.line(o.w * 0.32, H - 30, o.w * 0.32, H - 10, "#f59e0b", 1.6);
    tree(p, o.w - 8, H - o.h + 22, 0.8);
  },
  farm: (p, o) => {
    ground(p, o.w, o.h, "#8b6f47");
    const H = p.H;
    for (let i = 0; i < 9; i++) {
      const y = H - 4 - i * ((o.h - 8) / 9);
      p.add(`<path d="M4 ${n(y)} L${n(o.w - 26)} ${n(y)}" stroke="${i % 3 === 0 ? "#65a30d" : i % 3 === 1 ? "#84cc16" : "#4d7c0f"}" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 2"/>`);
    }
    box(p, o.w - 24, H - 8, 16, 12, 10, 4, "#b91c1c", "#7f1d1d");
    p.rect(o.w - 6, H - 30, 6, 22, "#d6d3d1", { rx: 3 });
  },
};

/** Draw a building. The image's bottom-left sits at the lot's bottom-left corner. */
export function buildingArt(kind: ArtKind, o: BuildingArtOpts): BuildingArt {
  // Tall buildings and towers need room above their footprint.
  const rise: Partial<Record<ArtKind, number>> = {
    bank: 44 + o.floors * 10, tower: 20 + o.floors * 9, skyscraper: 90 + o.floors * 8, highrise: 18 + o.floors * 10, hotel: 20 + o.floors * 10, office: 16 + o.floors * 11, apartment: 16 + o.floors * 12,
    hospital: 30 + o.floors * 11, government: 40 + o.floors * 11, factory: 60, powerplant: 70, construction: 70 + o.floors * 12, logistics: 46, plant: 40, mosque: 80, church: 80, monument: 80,
    watertower: 60, substation: 44, stadium: 30, museum: 40, school: 30, firestation: 50, townhouse: 30 + o.floors * 11, bighouse: 34, duplex: 34, house: 24, villa: 30,
  };
  const H = Math.ceil(o.h + (rise[kind] ?? 30));
  const p = new Pic(o.w, H, rng(o.seed));
  DRAW[kind](p, o);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.w} ${H}" width="${o.w}" height="${H}">${DEFS}${p.parts.join("")}</svg>`;
  const lights = p.lights.length ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.w} ${H}" width="${o.w}" height="${H}">${p.lights.join("")}</svg>` : "";
  return { svg, lights, width: o.w, height: H };
}
