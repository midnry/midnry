// Characters in a chibi cartoon style: big round heads, big shiny eyes, chunky
// sneakers, hoodies and backpacks. Everything is drawn as SVG from a Look, so
// the game world (as textures) and the menus (as images) show the same person.

import type { Looks } from "./types";

// ── Options ─────────────────────────────────────────────────────────────────

export const SKIN_TONES = ["#f6d1b1", "#e3ac7f", "#c68652", "#9b5f35", "#7a4523", "#5a3018"];

export const HAIR_STYLES = [
  { id: "afro", label: "Afro" },
  { id: "lowcut", label: "Low cut" },
  { id: "hightop", label: "High top" },
  { id: "twists", label: "Twists" },
  { id: "cornrows", label: "Cornrows" },
  { id: "locs", label: "Locs" },
  { id: "bun", label: "Curly bun" },
  { id: "puffs", label: "Puffs" },
  { id: "curls", label: "Long curls" },
  { id: "braids", label: "Braids" },
  { id: "bald", label: "Bald" },
] as const;
export type HairId = (typeof HAIR_STYLES)[number]["id"];

export const HAIR_COLORS = ["#1f1410", "#3d2416", "#6b3a1e", "#8e3c16", "#c58a2f", "#6b1830"];

export const TOPS = [
  { id: "hoodie", label: "Hoodie" },
  { id: "tee", label: "T-shirt" },
  { id: "jacket", label: "Track jacket" },
  { id: "puffer", label: "Puffer" },
  { id: "kaftan", label: "Kaftan" },
  { id: "shirt", label: "Shirt" },
  { id: "tank", label: "Tank top" },
] as const;
export type TopId = (typeof TOPS)[number]["id"];

export const BOTTOMS = [
  { id: "cargo", label: "Cargo joggers" },
  { id: "jeans", label: "Jeans" },
  { id: "track", label: "Track pants" },
  { id: "shorts", label: "Shorts" },
] as const;
export type BottomId = (typeof BOTTOMS)[number]["id"];

export const SHOES = [
  { id: "sneakers", label: "Sneakers" },
  { id: "hightops", label: "High-tops" },
  { id: "slides", label: "Slides" },
] as const;
export type ShoeId = (typeof SHOES)[number]["id"];

export const HATS = [
  { id: "none", label: "None" },
  { id: "cap", label: "Cap" },
  { id: "beanie", label: "Beanie" },
  { id: "headband", label: "Headband" },
] as const;
export type HatId = (typeof HATS)[number]["id"];

/** Clothes colours: bright and friendly, plus neutrals. */
export const CLOTH_COLORS = [
  "#f7941d", // orange
  "#e8461f", // red
  "#f7a8c4", // pink
  "#f06c9b", // hot pink
  "#7b3fc4", // purple
  "#1f7fd6", // blue
  "#4c7a34", // green
  "#f4ece0", // cream
  "#cdbca6", // beige
  "#8f8780", // grey
  "#3b3b3e", // charcoal
  "#1b1b1d", // black
  "#4a6fa5", // denim
];

export type Look = {
  skin: string;
  hair: HairId;
  hairColor: string;
  top: TopId;
  topColor: string;
  bottom: BottomId;
  bottomColor: string;
  shoes: ShoeId;
  shoeColor: string;
  hat: HatId;
  hatColor: string;
  bag: boolean;
  bagColor: string;
  glasses: boolean;
  headphones: boolean;
  lashes: boolean;
};

const HAIR_IDS = HAIR_STYLES.map((h) => h.id) as readonly string[];

/** Fill in everything an older or partial save leaves out. */
export function fullLook(looks: Partial<Looks>): Look {
  const top = looks.topColor ?? looks.outfit ?? "#1f7fd6";
  return {
    skin: looks.skin ?? SKIN_TONES[3]!,
    hair: (HAIR_IDS.includes(looks.hair ?? "") ? looks.hair : "afro") as HairId,
    hairColor: looks.hairColor ?? HAIR_COLORS[0]!,
    top: looks.top ?? "hoodie",
    topColor: top,
    bottom: looks.bottom ?? "cargo",
    bottomColor: looks.bottomColor ?? "#1b1b1d",
    shoes: looks.shoes ?? "sneakers",
    shoeColor: looks.shoeColor ?? "#f7941d",
    hat: looks.hat ?? "none",
    hatColor: looks.hatColor ?? "#f7a8c4",
    bag: looks.bag ?? true,
    bagColor: looks.bagColor ?? "#3b3b3e",
    glasses: looks.glasses ?? false,
    headphones: looks.headphones ?? false,
    lashes: looks.lashes ?? false,
  };
}

/** Starting looks for the character creator, after the reference sheet. */
export const PRESETS: Record<"male" | "female", Look> = {
  male: fullLook({ skin: SKIN_TONES[3], hair: "afro", topColor: "#f4ece0", bottomColor: "#1b1b1d", shoeColor: "#f7941d", bagColor: "#1b1b1d", lashes: false }),
  female: fullLook({
    skin: SKIN_TONES[3],
    hair: "bun",
    hat: "headband",
    hatColor: "#f06c9b",
    topColor: "#f7a8c4",
    bottomColor: "#f4ece0",
    shoeColor: "#f7a8c4",
    bagColor: "#f7a8c4",
    lashes: true,
  }),
};

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length) % list.length]!;
}

/** A varied passer-by, the same every time for the same seed. */
export function randomLook(seed: number, overrides: Partial<Look> = {}): Look {
  let s = (seed % 2147483647) + 1;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const lashes = r() < 0.5;
  const hair = lashes ? pick(r, ["bun", "puffs", "curls", "braids", "afro", "locs"] as const) : pick(r, ["afro", "lowcut", "hightop", "twists", "cornrows", "locs", "bald"] as const);
  return {
    skin: pick(r, SKIN_TONES.slice(1)),
    hair,
    hairColor: r() < 0.8 ? HAIR_COLORS[0]! : pick(r, HAIR_COLORS),
    top: pick(r, ["hoodie", "tee", "jacket", "puffer", "kaftan", "shirt", "tank"] as const),
    topColor: pick(r, CLOTH_COLORS),
    bottom: pick(r, ["cargo", "jeans", "track", "shorts"] as const),
    bottomColor: pick(r, ["#1b1b1d", "#4a6fa5", "#cdbca6", "#3b3b3e", "#4c7a34", "#8f8780"]),
    shoes: pick(r, ["sneakers", "sneakers", "hightops", "slides"] as const),
    shoeColor: pick(r, CLOTH_COLORS),
    hat: r() < 0.7 ? "none" : pick(r, ["cap", "beanie", "headband"] as const),
    hatColor: pick(r, CLOTH_COLORS),
    bag: r() < 0.4,
    bagColor: pick(r, CLOTH_COLORS),
    glasses: r() < 0.12,
    headphones: r() < 0.1,
    lashes,
    ...overrides,
  };
}

/** A stable short key for a look, for texture names. */
export function lookKey(look: Look): string {
  const text = JSON.stringify(look);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// ── Colour helpers ──────────────────────────────────────────────────────────

export const INK = "#2a1810";

function rgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Darken (f < 1) or lighten (f > 1, mixed towards white). */
export function tone(hex: string, f: number): string {
  const [r, g, b] = rgb(hex);
  if (f <= 1) return toHex([r * f, g * f, b * f]);
  const t = f - 1;
  return toHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]);
}

function light(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  return r * 0.3 + g * 0.59 + b * 0.11 > 170;
}

// ── SVG pieces ──────────────────────────────────────────────────────────────

const LINE = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const thin = (color: string, w = 2) => `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const shape = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}" ${LINE} ${extra}/>`;

/** Bumpy, curly masses: outline every circle, then fill them all, so only the outside edge is inked. */
function blob(circles: [number, number, number][], fill: string): string {
  const outline = circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 1.3}" fill="${INK}"/>`).join("");
  const body = circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join("");
  return outline + body;
}

/** Little "c" curls for texture. */
function curls(points: [number, number][], color: string, size = 3): string {
  return points.map(([x, y]) => `<path d="M${x - size} ${y} q${size} -${size * 1.2} ${size * 2} 0" ${thin(color, 1.6)}/>`).join("");
}

function ring(cx: number, cy: number, rx: number, ry: number, from: number, to: number, step: number, r: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = from; a <= to + 0.01; a += step) {
    const rad = (a * Math.PI) / 180;
    out.push([+(cx + Math.cos(rad) * rx).toFixed(1), +(cy + Math.sin(rad) * ry).toFixed(1), r]);
  }
  return out;
}

const crown = (x: number, y: number, s = 1) =>
  `<path d="M${x - 5 * s} ${y + 3 * s} L${x - 5 * s} ${y - 2 * s} L${x - 2.5 * s} ${y + 0.5 * s} L${x} ${y - 3.5 * s} L${x + 2.5 * s} ${y + 0.5 * s} L${x + 5 * s} ${y - 2 * s} L${x + 5 * s} ${y + 3 * s} Z" fill="#f5b81c" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;

// Head geometry, shared by hair and hats.
const HEAD = { cx: 60, cy: 52, rx: 34, ry: 31 };
const HEAD_TOP = HEAD.cy - HEAD.ry;

type HairParts = { behind: string; front: string; back: string };

function hairParts(look: Look): HairParts {
  const c = look.hairColor;
  const dark = tone(c, c === HAIR_COLORS[0] ? 2.0 - 0.75 : 0.7);
  const tex = c === HAIR_COLORS[0] ? "#4a3428" : tone(c, 0.65);
  // A cap of hair hugging the top of the head, with a soft hairline.
  const cap = (hairline: number) =>
    shape(`M26 ${hairline + 14} Q23 ${HEAD_TOP - 2} 60 ${HEAD_TOP - 3} Q97 ${HEAD_TOP - 2} 94 ${hairline + 14} Q88 ${hairline + 2} 76 ${hairline} Q60 ${hairline - 4} 44 ${hairline} Q32 ${hairline + 2} 26 ${hairline + 14} Z`, c);
  const backCap = shape(`M26 62 Q22 ${HEAD_TOP - 3} 60 ${HEAD_TOP - 3} Q98 ${HEAD_TOP - 3} 94 62 Q78 76 60 76 Q42 76 26 62 Z`, c) + curls([[44, 36], [60, 30], [74, 40], [52, 52], [68, 56]], tex);
  const dots = (pts: [number, number][]) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${tex}"/>`).join("");

  switch (look.hair) {
    case "afro": {
      const mass = blob([[60, 36, 33], ...ring(60, 38, 36, 28, 160, 380, 20, 12)], c);
      return {
        behind: mass + curls([[38, 20], [54, 12], [72, 14], [86, 26], [30, 36], [92, 42]], tex),
        front: blob([[36, 34, 8], [46, 27, 9], [58, 24, 9], [70, 25, 9], [81, 30, 8], [88, 38, 6], [31, 41, 6]], c),
        back: mass + curls([[44, 30], [60, 22], [76, 32], [50, 50], [70, 52]], tex),
      };
    }
    case "lowcut":
      return { behind: "", front: cap(34) + dots([[40, 28], [50, 24], [60, 23], [70, 24], [80, 28], [45, 33], [75, 33], [60, 29]]), back: backCap };
    case "hightop": {
      const top = shape("M34 30 Q33 4 46 4 L74 4 Q87 4 86 30 Z", c) + curls([[44, 12], [56, 10], [68, 12], [78, 16], [50, 20], [64, 20], [74, 24]], tex, 2.5);
      return { behind: "", front: cap(34) + top + dots([[42, 30], [78, 30]]), back: backCap + top };
    }
    case "twists": {
      const spikes = ring(60, 46, 34, 32, 185, 355, 17, 0)
        .map(([x, y], i) => {
          const angle = 185 + i * 17 + 90;
          return `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="9" transform="rotate(${angle} ${x} ${y})" fill="${c}" ${LINE}/>`;
        })
        .join("");
      return { behind: spikes, front: cap(33) + curls([[44, 28], [56, 24], [68, 25], [78, 30]], tex, 2.2), back: spikes + backCap };
    }
    case "cornrows": {
      const rows = [36, 44, 52, 60, 68, 76, 84].map((x) => `<path d="M${x} 33 Q${60 + (x - 60) * 0.6} 24 ${60 + (x - 60) * 0.35} ${HEAD_TOP}" ${thin(dark, 2.4)} stroke-dasharray="3 2"/>`).join("");
      return { behind: "", front: cap(32) + rows, back: backCap + [44, 52, 60, 68, 76].map((x) => `<path d="M${x} 24 L${x} 70" ${thin(dark, 2.4)} stroke-dasharray="3 2"/>`).join("") };
    }
    case "locs": {
      const strand = (x: number, y: number, len: number) => `<rect x="${x - 4}" y="${y}" width="8" height="${len}" rx="4" fill="${c}" ${LINE}/><path d="M${x - 2} ${y + 6} l4 3 M${x - 2} ${y + 14} l4 3 M${x - 2} ${y + 22} l4 3" ${thin(tex, 1.3)}/>`;
      const hang = strand(24, 38, 46) + strand(31, 40, 50) + strand(89, 40, 50) + strand(96, 38, 46);
      return { behind: hang, front: cap(32) + [40, 50, 60, 70, 80].map((x) => strand(x, 18, 16)).join(""), back: hang + backCap + [36, 46, 56, 66, 76, 84].map((x) => strand(x, 40, 40)).join("") };
    }
    case "bun": {
      const mass = blob([[60, 42, 30], [30, 48, 13], [90, 48, 13], [33, 32, 12], [87, 32, 12], [26, 62, 9], [94, 62, 9]], c);
      const bun = blob([[60, 13, 10], [52, 12, 6], [68, 12, 6], [60, 6, 6]], c) + curls([[56, 12], [64, 10]], tex, 2.2);
      return { behind: mass + bun, front: cap(33) + blob([[40, 33, 7], [50, 29, 6]], c) + curls([[42, 33], [76, 30]], tex), back: mass + bun + curls([[44, 40], [60, 34], [76, 42]], tex) };
    }
    case "puffs": {
      const puff = (x: number) => blob(ring(x, 24, 11, 11, 0, 345, 30, 7.5).concat([[x, 24, 11]]), c) + curls([[x - 4, 22], [x + 4, 27]], tex, 2.4);
      const ties = `<rect x="29" y="29" width="9" height="6" rx="3" fill="${look.hatColor}" ${LINE}/><rect x="82" y="29" width="9" height="6" rx="3" fill="${look.hatColor}" ${LINE}/>`;
      const part = `<path d="M60 ${HEAD_TOP - 2} L60 31" ${thin(tex, 1.6)}/>`;
      return { behind: puff(24) + puff(96), front: cap(32) + part + ties, back: puff(24) + puff(96) + backCap + ties };
    }
    case "curls": {
      const mass = blob([[60, 44, 32], ...[40, 56, 72, 88, 100].flatMap((y) => [[24, y, 11] as [number, number, number], [96, y, 11] as [number, number, number]]), [34, 30, 13], [86, 30, 13]], c);
      return {
        behind: mass + curls([[24, 60], [24, 84], [96, 70], [96, 94], [30, 100], [90, 102]], tex),
        front: blob([[34, 36, 8], [44, 29, 9], [56, 25, 9], [70, 26, 8], [82, 31, 7], [27, 52, 7], [93, 52, 7], [26, 66, 7], [94, 66, 7]], c) + curls([[27, 54], [93, 64]], tex, 2.4),
        back: mass + blob([[60, 60, 30], [44, 80, 14], [76, 80, 14]], c) + curls([[48, 46], [66, 52], [52, 74], [70, 82]], tex),
      };
    }
    case "braids": {
      const braid = (x: number, y: number, len: number) => {
        let marks = "";
        for (let by = y + 5; by < y + len - 4; by += 6) marks += `<path d="M${x - 3} ${by} L${x} ${by + 3} L${x + 3} ${by}" ${thin(tex, 1.2)}/>`;
        return `<rect x="${x - 3.5}" y="${y}" width="7" height="${len}" rx="3.5" fill="${c}" ${LINE}/>${marks}<circle cx="${x}" cy="${y + len + 2}" r="2.6" fill="${look.hatColor}" stroke="${INK}" stroke-width="1"/>`;
      };
      const hang = braid(24, 40, 62) + braid(31, 44, 62) + braid(89, 44, 62) + braid(96, 40, 62);
      const part = `<path d="M60 ${HEAD_TOP - 2} L60 30" ${thin(tex, 1.6)}/>`;
      return { behind: hang, front: cap(31) + part, back: hang + backCap + [44, 52, 60, 68, 76].map((x) => braid(x, 56, 52)).join("") };
    }
    case "bald":
    default:
      return { behind: "", front: `<ellipse cx="48" cy="30" rx="9" ry="4.5" fill="#ffffff" opacity="0.28"/>`, back: `<ellipse cx="60" cy="34" rx="12" ry="6" fill="#ffffff" opacity="0.22"/>` };
  }
}

function headShape(look: Look): string {
  const shade = tone(look.skin, 0.84);
  return (
    `<circle cx="27" cy="58" r="8" fill="${look.skin}" ${LINE}/><circle cx="93" cy="58" r="8" fill="${look.skin}" ${LINE}/>` +
    `<path d="M26 58 q2 -3 4 0 M90 58 q2 -3 4 0" ${thin(shade, 1.6)}/>` +
    `<ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${HEAD.rx}" ry="${HEAD.ry}" fill="${look.skin}" ${LINE}/>`
  );
}

function face(look: Look): string {
  const eye = (x: number) =>
    `<ellipse cx="${x}" cy="60" rx="6.3" ry="7.8" fill="#2c140a"/>` +
    `<ellipse cx="${x}" cy="62" rx="4.4" ry="5.2" fill="#5e2f12"/>` +
    `<circle cx="${x + 2.2}" cy="57" r="2.5" fill="#fff"/><circle cx="${x - 2.2}" cy="63.5" r="1.1" fill="#fff"/>`;
  const lashes = look.lashes ? `<path d="M39.5 55 l-3 -2.5 M80.5 55 l3 -2.5 M40.5 53 l-2.2 -3.2 M79.5 53 l2.2 -3.2" ${thin(INK, 1.6)}/>` : "";
  return (
    `<ellipse cx="48" cy="38" rx="10" ry="5" fill="#fff" opacity="0.14"/>` +
    `<path d="M40 48.5 q6 -3.5 11 -0.5 M69 48 q5 -3 11 0.5" ${thin(INK, 2.4)}/>` +
    eye(46) +
    eye(74) +
    lashes +
    `<ellipse cx="37" cy="70" rx="5.5" ry="3.2" fill="#ff6b5a" opacity="0.38"/><ellipse cx="83" cy="70" rx="5.5" ry="3.2" fill="#ff6b5a" opacity="0.38"/>` +
    `<path d="M58 67 q2 1.6 4 0" ${thin(tone(look.skin, 0.62), 1.6)}/>` +
    `<path d="M51 72 Q60 84 69 72 Z" fill="#6e1d10" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M52.4 72.6 Q60 75.4 67.6 72.6 L67 74.4 Q60 76.8 53 74.4 Z" fill="#fff"/>` +
    `<path d="M55 78.4 Q60 75.6 65 78.4 Q60 81.6 55 78.4 Z" fill="#ff8a7a"/>`
  );
}

function hat(look: Look, view: "front" | "back"): string {
  const c = look.hatColor;
  const d = tone(c, 0.78);
  switch (look.hat) {
    case "cap": {
      const dome = shape("M25 42 Q24 8 60 8 Q96 8 95 42 Z", c) + `<path d="M60 9 L60 40" ${thin(d, 1.6)}/><circle cx="60" cy="9" r="2.6" fill="${d}" ${LINE}/>`;
      if (view === "back") return dome + `<path d="M48 42 Q60 34 72 42" fill="${d}" ${LINE}/>`;
      return dome + crown(60, 26, 1.2) + shape("M22 40 Q60 31 98 40 Q101 48 94 48 Q60 41 26 48 Q19 48 22 40 Z", d);
    }
    case "beanie": {
      const ribs = [34, 44, 54, 66, 76, 86].map((x) => `<path d="M${x} ${x < 60 ? 40 - (60 - x) / 6 : 40 - (x - 60) / 6} Q${60 + (x - 60) * 0.7} 16 ${60 + (x - 60) * 0.4} 8" ${thin(d, 1.4)}/>`).join("");
      const cuff = shape("M22 38 Q60 30 98 38 L98 50 Q60 42 22 50 Z", d) + [30, 38, 46, 54, 62, 70, 78, 86, 92].map((x) => `<path d="M${x} ${38 - (x < 60 ? (x - 22) / 9 : (98 - x) / 9)} l0 10" ${thin(tone(c, 0.65), 1.3)}/>`).join("");
      return shape("M24 44 Q22 4 60 4 Q98 4 96 44 Z", c) + ribs + cuff;
    }
    case "headband": {
      const band = `<path d="M26 44 Q60 12 94 44" ${thin(INK, 10)}/><path d="M26 44 Q60 12 94 44" ${thin(c, 6.4)}/>`;
      const bow = view === "front" ? shape("M78 24 L66 14 Q62 22 66 30 Z", c) + shape("M80 24 L92 12 Q97 20 92 30 Z", c) + `<circle cx="79" cy="24" r="4" fill="${d}" ${LINE}/>` : "";
      return band + bow;
    }
    default:
      return "";
  }
}

function extras(look: Look, view: "front" | "back"): string {
  let out = "";
  if (look.headphones) {
    out += `<path d="M22 54 Q22 10 60 10 Q98 10 98 54" ${thin(INK, 8)}/><path d="M22 54 Q22 10 60 10 Q98 10 98 54" ${thin("#9aa0a6", 4.4)}/>`;
    out += `<rect x="14" y="44" width="15" height="24" rx="7" fill="#2e2e33" ${LINE}/><rect x="91" y="44" width="15" height="24" rx="7" fill="#2e2e33" ${LINE}/>`;
    out += `<rect x="17" y="50" width="5" height="12" rx="2.5" fill="${look.hatColor}"/><rect x="98" y="50" width="5" height="12" rx="2.5" fill="${look.hatColor}"/>`;
  }
  if (look.glasses && view === "front") {
    out += `<rect x="35" y="52" width="22" height="15" rx="6" fill="#18181b" ${LINE}/><rect x="63" y="52" width="22" height="15" rx="6" fill="#18181b" ${LINE}/>`;
    out += `<path d="M57 57 Q60 54 63 57" ${thin(INK, 2.4)}/><path d="M39 56 l6 0 M67 56 l6 0" ${thin("#ffffff", 2)} opacity="0.55"/>`;
  }
  return out;
}

// ── Tops ────────────────────────────────────────────────────────────────────

const BODY = "M34 84 Q60 78 86 84 L90 121 Q60 127 30 121 Z";
const SLEEVE_L = "M35 85 Q24 89 21 114 L32 116 Q34 101 39 94 Z";
const SLEEVE_R = "M85 85 Q96 89 99 114 L88 116 Q86 101 81 94 Z";
const SHORT_L = "M35 85 Q25 88 23 99 L34 101 Q35 95 39 92 Z";
const SHORT_R = "M85 85 Q95 88 97 99 L86 101 Q85 95 81 92 Z";

function hands(look: Look): string {
  return `<circle cx="26.5" cy="118" r="6.6" fill="${look.skin}" ${LINE}/><circle cx="93.5" cy="118" r="6.6" fill="${look.skin}" ${LINE}/>`;
}

function bareArms(look: Look): string {
  return shape("M24 97 L34 99 L32 115 L22 114 Z", look.skin) + shape("M96 97 L86 99 L88 115 L98 114 Z", look.skin);
}

function topParts(look: Look, view: "front" | "back"): string {
  const c = look.topColor;
  const d = tone(c, light(c) ? 0.84 : 0.76);
  const hi = tone(c, 1.25);
  const logo = view === "front" ? crown(60, 99, 1.1) : "";
  const cuffs = shape("M20.6 110 L32.4 112 L32 117 L20.4 115 Z", d) + shape("M99.4 110 L87.6 112 L88 117 L99.6 115 Z", d);
  const neck = shape("M53 76 L67 76 L67 86 L53 86 Z", look.skin);
  switch (look.top) {
    case "tee":
      return neck + bareArms(look) + shape(SHORT_L, c) + shape(SHORT_R, c) + shape(BODY, c) + (view === "front" ? `<path d="M51 82 Q60 89 69 82" ${thin(d, 2.6)}/>` + logo : "") + hands(look);
    case "tank":
      return (
        shape("M36 84 Q60 78 84 84 L88 121 Q60 127 32 121 Z", look.skin) +
        bareArms(look) +
        shape("M24 92 Q28 84 36 84 L38 96 Z", look.skin) +
        shape("M96 92 Q92 84 84 84 L82 96 Z", look.skin) +
        shape(view === "front" ? "M41 85 L46 83 L50 91 Q60 95 70 91 L74 83 L79 85 L88 121 Q60 127 32 121 Z" : "M41 85 L46 83 L50 88 Q60 90 70 88 L74 83 L79 85 L88 121 Q60 127 32 121 Z", c) +
        hands(look)
      );
    case "jacket": {
      const stripes = `<path d="M27 92 L23.5 111 M93 92 L96.5 111" ${thin("#ffffff", 2.4)}/>`;
      const zip = view === "front" ? `<path d="M60 86 L60 123" ${thin(d, 2.2)}/><rect x="57.6" y="96" width="4.8" height="7" rx="1.5" fill="#d9d9d9" stroke="${INK}" stroke-width="1"/>` : "";
      return neck + shape(SLEEVE_L, c) + shape(SLEEVE_R, c) + stripes + cuffs + shape(BODY, c) + zip + shape("M47 79 L73 79 L71 88 Q60 85 49 88 Z", d) + (view === "front" ? crown(72, 95, 0.8) : "") + hands(look);
    }
    case "puffer": {
      const quilt = [93, 104, 115].map((y) => `<path d="M30 ${y} Q60 ${y + 4} 90 ${y}" ${thin(d, 1.8)}/>`).join("");
      const puffL = "M33 84 Q20 88 18 115 L33 117 Q34 102 40 93 Z";
      const puffR = "M87 84 Q100 88 102 115 L87 117 Q86 102 80 93 Z";
      return (
        shape(puffL, c) +
        shape(puffR, c) +
        `<path d="M21 100 L35 101 M99 100 L85 101" ${thin(d, 1.8)}/>` +
        shape("M30 84 Q60 75 90 84 L94 123 Q60 129 26 123 Z", c) +
        quilt +
        (view === "front" ? `<path d="M60 84 L60 125" ${thin(d, 2)}/>` : "") +
        shape("M45 76 Q60 72 75 76 L74 89 Q60 86 46 89 Z", hi) +
        hands(look)
      );
    }
    case "kaftan": {
      const gold = "#e7b53c";
      const trim =
        view === "front"
          ? `<path d="M50 82 Q60 92 70 82" ${thin(gold, 2.6)}/><path d="M60 90 L60 116" ${thin(gold, 2.2)}/><path d="M56 94 l4 3 l4 -3 M56 101 l4 3 l4 -3 M56 108 l4 3 l4 -3" ${thin(gold, 1.6)}/>`
          : `<path d="M50 81 Q60 86 70 81" ${thin(gold, 2.4)}/>`;
      return neck + shape(SLEEVE_L, c) + shape(SLEEVE_R, c) + `<path d="M21 110 L32 112 M99 110 L88 112" ${thin(gold, 2)}/>` + shape("M34 84 Q60 78 86 84 L90 133 Q60 137 30 133 Z", c) + trim + hands(look);
    }
    case "shirt": {
      const front =
        view === "front"
          ? shape("M48 79 L60 88 L52 93 Z", hi) + shape("M72 79 L60 88 L68 93 Z", hi) + [95, 103, 111].map((y) => `<circle cx="60" cy="${y}" r="1.6" fill="${d}"/>`).join("") + `<rect x="66" y="94" width="11" height="10" rx="2" fill="none" stroke="${d}" stroke-width="1.8"/>`
          : shape("M46 80 Q60 86 74 80 L72 86 Q60 90 48 86 Z", hi);
      return neck + shape(SLEEVE_L, c) + shape(SLEEVE_R, c) + cuffs + shape(BODY, c) + front + hands(look);
    }
    case "hoodie":
    default: {
      const front =
        view === "front"
          ? shape("M41 83 Q60 99 79 83 Q74 80 66 80 Q60 86 54 80 Q46 80 41 83 Z", d) +
            `<path d="M54.5 88 L53.5 102 M65.5 88 L66.5 102" ${thin(hi, 2)}/><circle cx="53.4" cy="103.5" r="1.8" fill="${hi}" stroke="${INK}" stroke-width="0.8"/><circle cx="66.6" cy="103.5" r="1.8" fill="${hi}" stroke="${INK}" stroke-width="0.8"/>` +
            `<path d="M44 108 L76 108 L79 121 Q60 124 41 121 Z" fill="${d}" opacity="0.55"/><path d="M44 108 L76 108 L79 121 M41 121 L44 108" ${thin(INK, 1.6)}/>` +
            crown(60, 97, 0.85)
          : shape("M40 82 Q60 76 80 82 Q80 104 60 106 Q40 104 40 82 Z", d) + `<path d="M46 86 Q60 96 74 86" ${thin(tone(c, 0.62), 1.6)}/>`;
      return neck + shape(SLEEVE_L, c) + shape(SLEEVE_R, c) + cuffs + shape(BODY, c) + front + hands(look);
    }
  }
}

function bagBehind(look: Look): string {
  if (!look.bag) return "";
  const c = look.bagColor;
  return shape("M22 92 Q22 84 34 84 L86 84 Q98 84 98 92 L98 118 Q98 124 90 124 L30 124 Q22 124 22 118 Z", c) + `<path d="M50 80 Q60 70 70 80" ${thin(INK, 5)}/><path d="M50 80 Q60 70 70 80" ${thin(tone(c, 0.8), 2.4)}/>`;
}

function bagStraps(look: Look): string {
  if (!look.bag) return "";
  const d = tone(look.bagColor, 0.8);
  return shape("M37 84 L44 84 Q42 98 44 110 L38 110 Q35 96 37 84 Z", d) + shape("M83 84 L76 84 Q78 98 76 110 L82 110 Q85 96 83 84 Z", d) + `<rect x="37" y="100" width="8" height="5" rx="1.5" fill="#cfcfcf" stroke="${INK}" stroke-width="1"/><rect x="75" y="100" width="8" height="5" rx="1.5" fill="#cfcfcf" stroke="${INK}" stroke-width="1"/>`;
}

function bagOnBack(look: Look): string {
  if (!look.bag) return "";
  const c = look.bagColor;
  const d = tone(c, 0.8);
  return (
    shape("M36 92 Q36 82 48 82 L72 82 Q84 82 84 92 L84 122 Q84 128 76 128 L44 128 Q36 128 36 122 Z", c) +
    shape("M42 106 L78 106 L78 122 Q78 124 74 124 L46 124 Q42 124 42 122 Z", d) +
    `<path d="M40 94 Q60 88 80 94" ${thin(INK, 1.8)}/><circle cx="66" cy="93" r="1.8" fill="#cfcfcf" stroke="${INK}" stroke-width="0.8"/>` +
    crown(60, 115, 0.8)
  );
}

// ── Legs and shoes (one leg, drawn for the left; mirror it for the right) ──

export const LEG_BOX = { w: 30, h: 56 };

function legInner(look: Look): string {
  const c = look.bottomColor;
  const d = tone(c, light(c) ? 0.82 : 0.72);
  const hi = tone(c, 1.3);
  let pants = "";
  switch (look.bottom) {
    case "jeans":
      pants = shape("M5 0 L25 0 L25.5 41 L4.5 41 Z", c) + `<path d="M9 2 L8.5 39" ${thin(hi, 1.5)}/><path d="M5 37 L25.5 37" ${thin(d, 1.6)}/>`;
      break;
    case "track":
      pants = shape("M5 0 L25 0 L23 35 L7 35 Z", c) + shape("M7 33 L23 33 L22.5 41 L7.5 41 Z", d) + `<path d="M7.4 1 L8.6 33" ${thin("#ffffff", 2.2)}/>`;
      break;
    case "shorts":
      pants = shape("M8 15 L22 15 L21 41 L9 41 Z", look.skin) + shape("M8.6 34 L21.4 34 L21 41 L9 41 Z", "#f4f4f4") + shape("M4 0 L26 0 L25 19 L5 19 Z", c) + `<path d="M5 16 L25 16" ${thin(d, 1.6)}/>`;
      break;
    case "cargo":
    default:
      pants = shape("M5 0 L25 0 L23.5 34 L6.5 34 Z", c) + shape("M6.5 32.5 L23.5 32.5 L23 41 L7 41 Z", d) + shape("M4.4 12 L11 12 L11 23 L5.2 23 Z", d) + `<path d="M4.6 15.5 L11 15.5" ${thin(INK, 1)}/>`;
      break;
  }
  const s = look.shoeColor;
  const sd = tone(s, light(s) ? 0.8 : 0.7);
  const swoosh = light(s) ? tone(s, 0.55) : "#ffffff";
  let shoe = "";
  switch (look.shoes) {
    case "hightops":
      shoe =
        shape("M3 38 Q2 22 9 21 L21 21 Q28 22 27 38 Z", s) +
        `<path d="M9 24 L21 28 M21 24 L9 28 M9 29 L21 33 M21 29 L9 33" ${thin(light(s) ? INK : "#ffffff", 1.2)}/><circle cx="23" cy="34" r="2.6" fill="${swoosh}" opacity="0.9"/>` +
        shape("M1 37 L29 37 Q30 43.5 26 44 L4 44 Q0 43.5 1 37 Z", "#fbfbf8") +
        `<path d="M2 40.5 L28 40.5" ${thin(sd, 1.4)}/>`;
      break;
    case "slides":
      shoe = shape("M8 29 L22 29 L23.5 39 L6.5 39 Z", look.skin) + shape("M4 31 L26 31 L26 37 L4 37 Z", s) + shape("M2 38 L28 38 Q29 43 26 43.5 L4 43.5 Q1 43 2 38 Z", sd);
      break;
    case "sneakers":
    default:
      shoe =
        shape("M2 38 Q1 27 9.5 26.5 L20.5 26.5 Q29 27 28 38 Z", s) +
        `<path d="M5.5 35 Q15 38 24.5 31" ${thin(swoosh, 2.4)}/><path d="M11 29 L19 29 M11.5 31.5 L18.5 31.5" ${thin(light(s) ? INK : "#ffffff", 1.2)}/>` +
        shape("M1 37 L29 37 Q30 43.5 26 44 L4 44 Q0 43.5 1 37 Z", "#fbfbf8") +
        `<path d="M2 40.5 L28 40.5" ${thin(sd, 1.4)}/>`;
      break;
  }
  return pants + `<g transform="translate(0 10)">${shoe}</g>`;
}

// ── Assembly ────────────────────────────────────────────────────────────────

/** The upper body (head, hair, arms, top), drawn from y = -4 (room for buns and hats). */
export const UPPER_BOX = { w: 120, h: 142, top: -4 };
/** Where the legs attach; the feet end at HIP_Y + LEG_BOX.h. */
export const HIP_Y = 112;

function upperInner(look: Look, view: "front" | "back"): string {
  const hair = hairParts(look);
  if (view === "back") {
    return topParts(look, "back") + headShape(look) + hair.back + hat(look, "back") + extras(look, "back") + bagOnBack(look);
  }
  const hideFringe = look.hat === "cap" || look.hat === "beanie";
  return hair.behind + bagBehind(look) + topParts(look, "front") + bagStraps(look) + headShape(look) + face(look) + (hideFringe ? "" : hair.front) + hat(look, "front") + extras(look, "front");
}

function doc(viewBox: string, inner: string, width?: number, height?: number): string {
  const size = width && height ? ` width="${width}" height="${height}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size}>${inner}</svg>`;
}

/** The parts the game animates: upper body front and back, and one leg. */
export function characterParts(look: Look, scale = 1) {
  return {
    front: doc(`0 ${UPPER_BOX.top} ${UPPER_BOX.w} ${UPPER_BOX.h}`, upperInner(look, "front"), UPPER_BOX.w * scale, UPPER_BOX.h * scale),
    back: doc(`0 ${UPPER_BOX.top} ${UPPER_BOX.w} ${UPPER_BOX.h}`, upperInner(look, "back"), UPPER_BOX.w * scale, UPPER_BOX.h * scale),
    leg: doc(`0 0 ${LEG_BOX.w} ${LEG_BOX.h}`, legInner(look), LEG_BOX.w * scale, LEG_BOX.h * scale),
  };
}

const VIEWS = {
  full: "0 -4 120 176",
  head: "12 -4 96 96",
  top: "12 72 96 64",
  legs: "26 118 68 52",
};

/** The whole person standing, or a close-up crop for menus. */
export function characterSvg(look: Look, view: keyof typeof VIEWS = "full", side: "front" | "back" = "front"): string {
  const legs =
    `<ellipse cx="60" cy="166" rx="30" ry="4" fill="#000" opacity="0.18"/>` +
    `<g transform="translate(34 ${HIP_Y})">${legInner(look)}</g>` +
    `<g transform="translate(86 ${HIP_Y}) scale(-1 1)">${legInner(look)}</g>`;
  return doc(VIEWS[view], legs + upperInner(look, side));
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
