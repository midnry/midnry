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
  { id: "blazer", label: "Blazer" },
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

/** Grown-up extras: they only show from age 18. */
export const BEARDS = [
  { id: "none", label: "Clean" },
  { id: "stubble", label: "Stubble" },
  { id: "mustache", label: "Mustache" },
  { id: "goatee", label: "Goatee" },
  { id: "full", label: "Full beard" },
] as const;
export type BeardId = (typeof BEARDS)[number]["id"];

export const EARRINGS = [
  { id: "none", label: "None" },
  { id: "studs", label: "Studs" },
  { id: "hoops", label: "Hoops" },
] as const;
export type EarringId = (typeof EARRINGS)[number]["id"];

export type Build = "masc" | "fem";

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
  "#ffffff", // white
  "#1e3a8a", // navy
  "#16a34a", // naija green
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
  /** Grown-up body shape. */
  build: Build;
  beard: BeardId;
  earrings: EarringId;
  noseRing: boolean;
  chain: boolean;
  watch: boolean;
  tattoos: boolean;
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
    build: looks.build ?? (looks.lashes ? "fem" : "masc"),
    beard: looks.beard ?? "none",
    earrings: looks.earrings ?? "none",
    noseRing: looks.noseRing ?? false,
    chain: looks.chain ?? false,
    watch: looks.watch ?? false,
    tattoos: looks.tattoos ?? false,
  };
}

/** Starting looks for the character creator, after the reference sheet. */
export const PRESETS: Record<"male" | "female", Look> = {
  male: fullLook({ skin: SKIN_TONES[3], hair: "afro", topColor: "#f4ece0", bottomColor: "#1b1b1d", shoeColor: "#f7941d", bagColor: "#1b1b1d", lashes: false, build: "masc", beard: "full", watch: true }),
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
    build: "fem",
    earrings: "hoops",
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
  const lashes = overrides.build ? overrides.build === "fem" : r() < 0.5;
  const hair = lashes ? pick(r, ["bun", "puffs", "curls", "braids", "afro", "locs"] as const) : pick(r, ["afro", "lowcut", "hightop", "twists", "cornrows", "locs", "bald"] as const);
  return {
    skin: pick(r, SKIN_TONES.slice(1)),
    hair,
    hairColor: r() < 0.8 ? HAIR_COLORS[0]! : pick(r, HAIR_COLORS),
    top: pick(r, ["hoodie", "tee", "jacket", "puffer", "kaftan", "blazer", "shirt", "tank"] as const),
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
    build: lashes ? "fem" : "masc",
    beard: lashes ? "none" : pick(r, ["none", "none", "stubble", "mustache", "goatee", "full"] as const),
    earrings: r() < (lashes ? 0.7 : 0.15) ? pick(r, ["studs", "hoops"] as const) : "none",
    noseRing: r() < 0.08,
    chain: r() < 0.25,
    watch: r() < 0.35,
    tattoos: r() < 0.15,
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

// ── Side view of the head (facing right; mirror it to face left) ───────────

type HairSide = { behind: string; front: string; overEar: boolean };

function hairSide(look: Look): HairSide {
  const c = look.hairColor;
  const tex = c === HAIR_COLORS[0] ? "#4a3428" : tone(c, 0.65);
  const cap = shape("M86 33 Q82 17 58 18 Q29 20 27 50 Q27 67 38 77 Q45 72 47 63 Q48 46 62 38 Q75 33 86 33 Z", c);
  const dots = (pts: [number, number][]) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${tex}"/>`).join("");
  const strand = (x: number, y: number, len: number, w: number) =>
    `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${len}" rx="${w / 2}" fill="${c}" ${LINE}/><path d="M${x - 2} ${y + 8} l4 3 M${x - 2} ${y + 18} l4 3 M${x - 2} ${y + 28} l4 3" ${thin(tex, 1.2)}/>`;
  switch (look.hair) {
    case "afro":
      return {
        behind: blob([[54, 36, 33], ...ring(54, 38, 36, 28, 140, 400, 20, 12)], c) + curls([[34, 22], [50, 12], [30, 44], [70, 14]], tex),
        front: blob([[68, 22, 9], [78, 26, 9], [86, 34, 6]], c),
        overEar: false,
      };
    case "lowcut":
      return { behind: "", front: cap + dots([[40, 30], [52, 25], [66, 24], [76, 28], [36, 44], [44, 56]]), overEar: false };
    case "hightop":
      return { behind: "", front: cap + shape("M36 30 Q34 4 48 4 L72 4 Q86 4 84 30 Z", c) + curls([[46, 12], [60, 10], [72, 14], [52, 22], [66, 22]], tex, 2.5), overEar: false };
    case "twists": {
      const spikes = ring(56, 46, 34, 32, 150, 345, 16, 0)
        .map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="9" transform="rotate(${150 + i * 16 + 90} ${x} ${y})" fill="${c}" ${LINE}/>`)
        .join("");
      return { behind: spikes, front: cap, overEar: false };
    }
    case "cornrows":
      return { behind: "", front: cap + [26, 32, 38, 44].map((y) => `<path d="M82 ${y + 8} Q60 ${y - 6} 34 ${y + 16}" ${thin(tex, 2.2)} stroke-dasharray="3 2"/>`).join(""), overEar: false };
    case "locs":
      return { behind: strand(34, 40, 56, 8) + strand(42, 44, 56, 8) + strand(50, 46, 50, 8), front: cap + strand(62, 18, 14, 8) + strand(74, 22, 12, 8), overEar: true };
    case "bun":
      return {
        behind: blob([[52, 44, 28], [36, 50, 13], [40, 34, 12]], c) + blob([[44, 13, 10], [37, 12, 6], [50, 10, 6]], c),
        front: cap + blob([[74, 30, 7]], c),
        overEar: false,
      };
    case "puffs":
      return { behind: blob(ring(34, 22, 11, 11, 0, 345, 30, 7.5).concat([[34, 22, 11]]), c), front: cap + `<rect x="40" y="28" width="9" height="6" rx="3" fill="${look.hatColor}" ${LINE}/>`, overEar: false };
    case "curls":
      return {
        behind: blob([[52, 44, 30], [34, 60, 12], [34, 76, 12], [36, 92, 11], [46, 100, 10], [40, 30, 13]], c) + curls([[32, 70], [36, 90], [44, 100]], tex),
        front: cap + blob([[54, 23, 9], [66, 24, 9], [77, 29, 8], [44, 62, 8], [46, 74, 8]], c),
        overEar: true,
      };
    case "braids": {
      const braid = (x: number, y: number, len: number) => {
        let marks = "";
        for (let by = y + 5; by < y + len - 4; by += 6) marks += `<path d="M${x - 3} ${by} L${x} ${by + 3} L${x + 3} ${by}" ${thin(tex, 1.2)}/>`;
        return `<rect x="${x - 3.5}" y="${y}" width="7" height="${len}" rx="3.5" fill="${c}" ${LINE}/>${marks}<circle cx="${x}" cy="${y + len + 2}" r="2.6" fill="${look.hatColor}" stroke="${INK}" stroke-width="1"/>`;
      };
      return { behind: braid(34, 40, 64) + braid(41, 44, 62) + braid(48, 46, 58), front: cap, overEar: true };
    }
    case "bald":
    default:
      return { behind: "", front: `<ellipse cx="66" cy="30" rx="9" ry="4.5" fill="#ffffff" opacity="0.28"/>`, overEar: false };
  }
}

function earSide(look: Look): string {
  return `<ellipse cx="49" cy="59" rx="6.5" ry="8" fill="${look.skin}" ${LINE}/><path d="M51 55.5 q-4 3.5 0 7" ${thin(tone(look.skin, 0.8), 1.6)}/>`;
}

function faceSide(look: Look): string {
  return (
    `<ellipse cx="70" cy="36" rx="9" ry="4.5" fill="#fff" opacity="0.14"/>` +
    `<path d="M73 48 q6 -3.4 11 0" ${thin(INK, 2.4)}/>` +
    `<ellipse cx="80" cy="60" rx="5.4" ry="7.8" fill="#2c140a"/><ellipse cx="80.6" cy="62" rx="3.8" ry="5.2" fill="#5e2f12"/>` +
    `<circle cx="82.2" cy="57" r="2.3" fill="#fff"/><circle cx="78.4" cy="63.5" r="1" fill="#fff"/>` +
    (look.lashes ? `<path d="M84.5 54.5 l3 -2.4 M83.5 52.6 l2.2 -3" ${thin(INK, 1.6)}/>` : "") +
    `<ellipse cx="77" cy="71" rx="5" ry="3" fill="#ff6b5a" opacity="0.38"/>` +
    `<path d="M80 73 Q86 80.5 91 72 Z" fill="#6e1d10" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`
  );
}

function headSide(look: Look): string {
  // The nose pokes just past the cheek; draw it before the head so only the tip shows.
  return shape("M88 58 Q97.5 62 89 68 Z", look.skin) + `<ellipse cx="60" cy="52" rx="32" ry="31" fill="${look.skin}" ${LINE}/>`;
}

function hatSide(look: Look): string {
  const c = look.hatColor;
  const d = tone(c, 0.78);
  switch (look.hat) {
    case "cap":
      return shape("M27 44 Q26 8 60 8 Q91 8 92 40 Z", c) + shape("M84 35 Q103 33 109 40 Q105 47 86 44 Z", d) + `<circle cx="58" cy="9" r="2.6" fill="${d}" ${LINE}/>` + crown(76, 25, 1);
    case "beanie":
      return shape("M26 46 Q24 4 60 4 Q95 4 94 44 Z", c) + shape("M24 38 Q60 30 96 35 L96 47 Q60 42 24 50 Z", d) + [44, 56, 68, 80].map((x) => `<path d="M${x} 33 Q${x - 2} 18 ${x - 6} 8" ${thin(d, 1.4)}/>`).join("");
    case "headband":
      return `<path d="M38 44 Q60 14 88 34" ${thin(INK, 10)}/><path d="M38 44 Q60 14 88 34" ${thin(c, 6.4)}/>` + shape("M38 40 L26 30 Q22 38 26 46 Z", c) + `<circle cx="38" cy="40" r="4" fill="${d}" ${LINE}/>`;
    default:
      return "";
  }
}

// ── Grown-up details: beards and jewellery (head coordinates) ──────────────

const GOLD = "#e6b53a";

function beardArt(look: Look, view: "front" | "side"): string {
  if (look.beard === "none") return "";
  const c = look.hairColor;
  if (view === "side") {
    const jaw = `<path d="M50 58 Q46 88 72 89 Q92 86 94 68 L89 66 Q86 77 74 79 Q60 78 55 62 Z" fill="${c}" ${look.beard === "stubble" ? 'opacity="0.35"' : LINE}/>`;
    const stache = `<path d="M81 69.5 Q87 66.5 91.5 69 Q87 71.5 81 71 Z" fill="${c}" stroke="${INK}" stroke-width="1.3"/>`;
    if (look.beard === "stubble") return `<g clip-path="url(#head)">${jaw}</g>`;
    if (look.beard === "mustache") return stache;
    if (look.beard === "goatee") return stache + shape("M80 80 Q86 88 92 78 Q87 82 80 80 Z", c);
    return `<g clip-path="url(#head)">${jaw}</g>` + stache;
  }
  const jaw = `<path d="M27 56 Q28 92 60 92 Q92 92 93 56 L88 58 Q87 74 72 79 Q60 82 48 79 Q33 74 32 58 Z" fill="${c}" ${look.beard === "stubble" ? 'opacity="0.32"' : ""}/>`;
  const stache = `<path d="M48.5 70.5 Q54 65.5 60 68.8 Q66 65.5 71.5 70.5 Q66 72.5 60 71 Q54 72.5 48.5 70.5 Z" fill="${c}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
  const tuft = shape("M47 80 Q60 96 73 80 Q60 87 47 80 Z", c);
  if (look.beard === "stubble") return `<g clip-path="url(#head)">${jaw}</g>`;
  if (look.beard === "mustache") return stache;
  if (look.beard === "goatee") return stache + shape("M52 82 Q60 93 68 82 Q60 86 52 82 Z", c);
  return `<g clip-path="url(#head)">${jaw}</g><ellipse cx="60" cy="52" rx="34" ry="31" fill="none" ${LINE}/>` + tuft + stache;
}

function jewellery(look: Look, view: "front" | "back" | "side"): string {
  let out = "";
  const ring = (x: number, y: number) =>
    look.earrings === "hoops" ? `<circle cx="${x}" cy="${y + 3.5}" r="4.2" fill="none" stroke="${GOLD}" stroke-width="1.9"/>` : `<circle cx="${x}" cy="${y}" r="2.3" fill="${GOLD}" stroke="${INK}" stroke-width="0.8"/>`;
  if (look.earrings !== "none") out += view === "side" ? ring(49, 67) : ring(27, 66) + ring(93, 66);
  if (look.noseRing && view === "front") out += `<path d="M62.4 67.6 a2.4 2.4 0 1 1 -2.4 2.6" ${thin(GOLD, 1.5)}/>`;
  if (look.noseRing && view === "side") out += `<circle cx="91.5" cy="66.5" r="2.3" fill="none" stroke="${GOLD}" stroke-width="1.4"/>`;
  return out;
}

// ── Body frames: a kid, a grown man, a grown woman ─────────────────────────

type Frame = {
  /** Head scale and centre (the head is drawn at (60, 52) and moved here). */
  k: number;
  hy: number;
  /** Shoulder line and hem of the top. */
  top: number;
  hem: number;
  /** Half-widths at the shoulders, the hem and (for curvy builds) the waist. */
  sh: number;
  hip: number;
  waist: number;
  hand: { x: number; y: number; r: number };
  /** Hip height where the legs attach, and the length of the trousers. */
  hipY: number;
  pants: number;
  legX: number;
};

const FRAMES: Record<"kid" | "masc" | "fem", Frame> = {
  kid: { k: 1, hy: 52, top: 84, hem: 121, sh: 26, hip: 30, waist: 0, hand: { x: 33.5, y: 118, r: 6.6 }, hipY: 112, pants: 41, legX: 11 },
  masc: { k: 0.74, hy: 42, top: 72, hem: 136, sh: 30, hip: 26, waist: 0, hand: { x: 37, y: 140, r: 5.6 }, hipY: 128, pants: 68, legX: 10 },
  fem: { k: 0.74, hy: 42, top: 73, hem: 126, sh: 23, hip: 24, waist: 17, hand: { x: 31, y: 132, r: 5 }, hipY: 120, pants: 74, legX: 9 },
};

export function frameFor(look: Look, adult: boolean): Frame {
  return adult ? FRAMES[look.build] : FRAMES.kid;
}

const n = (v: number) => +v.toFixed(1);

/** Move the head art (drawn at its own size around (60, 52)) onto the body. */
function placeHead(f: Frame, inner: string): string {
  if (f.k === 1 && f.hy === 52) return inner;
  return `<g transform="translate(${n(60 - 60 * f.k)} ${n(f.hy - 52 * f.k)}) scale(${f.k})">${inner}</g>`;
}

// ── Tops ────────────────────────────────────────────────────────────────────

function tops(look: Look, f: Frame, view: "front" | "back" | "side"): string {
  const c = look.topColor;
  const d = tone(c, light(c) ? 0.84 : 0.76);
  const hi = tone(c, 1.25);
  const { top, hem } = f;
  const Y = (t: number) => n(top + (hem - top) * t);
  const kaftanDrop = f.k === 1 ? 12 : 22;
  const style = look.top;
  const extra = style === "puffer" ? 4 : 0;
  const bottom = hem + (style === "kaftan" ? kaftanDrop : 0);
  const skinTorso = style === "tank";
  const shortSleeves = style === "tee";
  const bareFrom = style === "tank" ? 0 : shortSleeves ? 0.42 : 1;
  const headBottom = f.hy + 31 * f.k;
  const nw = f.k === 1 ? 7 : 5.5;
  const neck = shape(`M${60 - nw} ${n(headBottom - 8)} L${60 + nw} ${n(headBottom - 8)} L${60 + nw} ${top + 3} L${60 - nw} ${top + 3} Z`, look.skin);
  const hand = (x: number) => `<circle cx="${n(x)}" cy="${f.hand.y}" r="${f.hand.r}" fill="${look.skin}" ${LINE}/>`;
  const ink = (t: string) => (look.tattoos ? t : "");

  if (view === "side") {
    const hs = n(f.sh * 0.58 + extra);
    const body = `M${n(60 - hs)} ${top} Q60 ${top - 5} ${n(60 + hs)} ${top + 1} Q${n(60 + hs + 3)} ${Y(0.5)} ${n(60 + hs + 1)} ${bottom} Q60 ${bottom + 4} ${n(60 - hs - 1)} ${bottom} Q${n(60 - hs - 3)} ${Y(0.5)} ${n(60 - hs)} ${top} Z`;
    let out = neck + shape(skinTorso ? body : body, skinTorso ? look.skin : c);
    if (skinTorso) {
      const crop = look.build === "fem" && f.k !== 1 ? Y(0.62) : bottom;
      out += shape(`M${n(60 - hs + 2)} ${top + 3} L${n(60 + hs - 2)} ${top + 4} Q${n(60 + hs + 3)} ${Y(0.4)} ${n(60 + hs + 1)} ${crop} L${n(60 - hs - 1)} ${crop} Q${n(60 - hs - 3)} ${Y(0.4)} ${n(60 - hs + 2)} ${top + 3} Z`, c);
    }
    if (style === "hoodie") out += shape(`M${n(60 - hs - 2)} ${top - 2} Q${n(60 - hs - 6)} ${top + 12} ${n(60 - hs + 6)} ${top + 14} Q${n(60 - hs + 10)} ${top + 4} ${n(60 - hs + 4)} ${top - 3} Z`, d);
    if (style === "puffer") out += [0.3, 0.6, 0.85].map((t) => `<path d="M${n(60 - hs)} ${Y(t)} Q60 ${Y(t) + 3} ${n(60 + hs)} ${Y(t)}" ${thin(d, 1.8)}/>`).join("");
    if (style === "kaftan") out += `<path d="M${n(60 + hs - 4)} ${top + 2} L${n(60 + hs - 2)} ${Y(0.7)}" ${thin(GOLD, 2.2)}/>`;
    if (style === "blazer") out += shape(`M${n(60 + hs - 1)} ${top + 1} L${n(60 + hs - 7)} ${Y(0.42)} L${n(60 + hs + 1)} ${Y(0.42)} Z`, "#f8fafc");
    if (style === "shirt") out += shape(`M${n(60 + hs - 10)} ${top - 2} L${n(60 + hs - 1)} ${top + 2} L${n(60 + hs - 6)} ${top + 6} Z`, hi);
    // One arm, in front of the body.
    const sx = 60;
    const sy = top + 2;
    const hx = 60.5;
    const hy = f.hand.y;
    const at = (t: number) => ({ x: n(sx + (hx - sx) * t), y: n(sy + (hy - 4 - sy) * t) });
    const end = at(bareFrom);
    if (bareFrom > 0) out += shape(`M${sx - 6} ${sy} Q${sx} ${sy - 4} ${sx + 7} ${sy + 1} L${end.x + 6} ${end.y} L${end.x - 6} ${end.y} Z`, c);
    if (bareFrom < 1) out += shape(`M${end.x - 5} ${end.y - 1} L${end.x + 5} ${end.y - 1} L${hx + 5} ${hy - 3} L${hx - 5} ${hy - 3} Z`, look.skin) + ink(`<path d="M${hx - 2} ${hy - 16} q3 3 0 6 M${hx + 1} ${hy - 12} l2 2" ${thin("#2a3b4d", 1.5)}/>`);
    if (bareFrom === 1 && style !== "kaftan") out += shape(`M${hx - 6.5} ${hy - 9} L${hx + 6.5} ${hy - 9} L${hx + 6} ${hy - 3} L${hx - 6} ${hy - 3} Z`, d);
    out += hand(hx);
    if (look.watch) out += `<rect x="${hx - 5}" y="${hy - 10}" width="10" height="4.6" rx="1.6" fill="#1f2937" stroke="${INK}" stroke-width="0.9"/><circle cx="${hx + 2}" cy="${hy - 7.7}" r="1.4" fill="${GOLD}"/>`;
    if (look.chain && f.k !== 1) out += `<path d="M${n(60 + hs - 3)} ${top} Q${n(60 + hs)} ${top + 9} ${n(60 + hs - 1)} ${top + 12}" ${thin(GOLD, 1.8)}/>`;
    return out;
  }

  // Front and back share the silhouette.
  const L = 60 - f.sh - extra;
  const R = 60 + f.sh + extra;
  const HL = 60 - f.hip - extra;
  const HR = 60 + f.hip + extra;
  const body =
    f.waist && !extra
      ? `M${L} ${top} Q60 ${top - 6} ${R} ${top} Q${60 + f.waist} ${Y(0.55)} ${HR} ${bottom} Q60 ${bottom + 6} ${HL} ${bottom} Q${60 - f.waist} ${Y(0.55)} ${L} ${top} Z`
      : `M${L} ${top} Q60 ${top - 6} ${R} ${top} L${HR} ${bottom} Q60 ${bottom + 6} ${HL} ${bottom} Z`;
  const arm = (s: 1 | -1) => {
    const S = { x: 60 + s * (f.sh + extra - 1), y: top + 1 };
    const H = { x: 60 + s * f.hand.x, y: f.hand.y - 3 };
    const at = (t: number) => ({ x: n(S.x + (H.x - S.x) * t), y: n(S.y + (H.y - S.y) * t) });
    const E = at(bareFrom);
    let out = "";
    if (bareFrom < 1) {
      const A = at(bareFrom === 0 ? 0.05 : bareFrom);
      out += shape(`M${n(A.x - 5)} ${A.y} L${n(A.x + 5)} ${n(A.y + 1)} L${n(H.x + 5)} ${n(H.y + 1)} L${n(H.x - 5)} ${H.y} Z`, look.skin);
      out += ink(`<path d="M${n(H.x - 2)} ${n(H.y - 14)} q3 3 0 6 M${n(H.x + 1)} ${n(H.y - 9)} l2 2 M${n(A.x)} ${n(A.y + 6)} l3 2" ${thin("#2a3b4d", 1.5)}/>`);
      if (bareFrom === 0) out += shape(`M${n(S.x - s * 4)} ${top - 2} Q${n(S.x + s * 7)} ${top - 3} ${n(S.x + s * 7)} ${top + 9} L${n(S.x - s * 2)} ${top + 7} Z`, look.skin);
    }
    if (bareFrom > 0) {
      const bow = 10 + extra;
      out += shape(`M${S.x} ${S.y} Q${n(S.x + s * bow)} ${S.y + 5} ${n(E.x + s * 5.5)} ${n(E.y - 1)} L${n(E.x - s * 5.5)} ${n(E.y + 1)} Q${n(S.x - s * 1)} ${n(S.y + 16 * bareFrom)} ${n(S.x - s * 5)} ${S.y + 9} Z`, c);
      if (bareFrom === 1) {
        const q = at(0.86);
        out += style === "kaftan" ? `<path d="M${n(q.x + s * 5.5)} ${q.y} L${n(q.x - s * 5.5)} ${n(q.y + 2)}" ${thin(GOLD, 2)}/>` : shape(`M${n(q.x + s * 6)} ${n(q.y - 1)} L${n(q.x - s * 6)} ${n(q.y + 1)} L${n(H.x - s * 6)} ${n(H.y + 2)} L${n(H.x + s * 6)} ${H.y} Z`, style === "blazer" ? "#f8fafc" : d);
      }
      if (style === "jacket") out += `<path d="M${n(S.x + s * 7)} ${S.y + 8} L${n(H.x + s * 3.5)} ${n(H.y - 6)}" ${thin("#ffffff", 2.4)}/>`;
      if (style === "puffer") out += `<path d="M${n(at(0.5).x + s * 6)} ${at(0.5).y} L${n(at(0.5).x - s * 6)} ${n(at(0.5).y + 1)}" ${thin(d, 1.8)}/>`;
    }
    out += hand(H.x);
    return out;
  };

  let out = neck;
  if (skinTorso) {
    out += shape(`M${L + 2} ${top} Q60 ${top - 6} ${R - 2} ${top} L${HR - 2} ${bottom} Q60 ${bottom + 6} ${HL + 2} ${bottom} Z`, look.skin);
  }
  out += arm(-1) + arm(1);
  if (skinTorso) {
    const crop = look.build === "fem" && f.k !== 1 ? Y(0.6) : bottom;
    const cut = view === "front" ? `L${60 - nw - 3} ${top - 1} L${60 - nw + 1} ${top + 7} Q60 ${top + 11} ${60 + nw - 1} ${top + 7} L${60 + nw + 3} ${top - 1}` : `L${60 - nw - 3} ${top - 1} L${60 - nw + 1} ${top + 4} Q60 ${top + 6} ${60 + nw - 1} ${top + 4} L${60 + nw + 3} ${top - 1}`;
    out += shape(`M${L + 6} ${top + 1} L${60 - nw - 6} ${top - 1} ${cut} L${R - 6} ${top + 1} L${R - 4} ${Y(0.3)} L${crop === bottom ? HR : 60 + f.waist + 2} ${crop} Q60 ${crop + (crop === bottom ? 6 : 3)} ${crop === bottom ? HL : 60 - f.waist - 2} ${crop} L${L + 4} ${Y(0.3)} Z`, c);
  } else {
    out += shape(body, c);
  }
  if (look.chain && f.k !== 1 && view === "front") out += `<path d="M${60 - nw - 2} ${top - 2} Q60 ${top + 16} ${60 + nw + 2} ${top - 2}" ${thin(GOLD, 1.8)}/>` + crown(60, top + 15, 0.55);
  if (look.watch) out += `<rect x="${n(60 - f.hand.x - 5)}" y="${f.hand.y - 12}" width="10" height="4.6" rx="1.6" fill="#1f2937" stroke="${INK}" stroke-width="0.9"/><circle cx="${n(60 - f.hand.x)}" cy="${f.hand.y - 9.7}" r="1.4" fill="${GOLD}"/>`;
  if (view === "back") {
    if (style === "hoodie") out += shape(`M${60 - 20} ${top - 2} Q60 ${top - 8} ${60 + 20} ${top - 2} Q${60 + 20} ${Y(0.55)} 60 ${Y(0.58)} Q${60 - 20} ${Y(0.55)} ${60 - 20} ${top - 2} Z`, d);
    if (style === "kaftan") out += `<path d="M${60 - 10} ${top - 3} Q60 ${top + 2} ${60 + 10} ${top - 3}" ${thin(GOLD, 2.4)}/>`;
    if (style === "shirt" || style === "blazer") out += shape(`M${60 - 14} ${top - 4} Q60 ${top + 2} ${60 + 14} ${top - 4} L${60 + 12} ${top + 2} Q60 ${top + 6} ${60 - 12} ${top + 2} Z`, style === "blazer" ? tone(c, 0.7) : hi);
    if (style === "puffer") out += [0.3, 0.6, 0.85].map((t) => `<path d="M${HL + 2} ${Y(t)} Q60 ${Y(t) + 4} ${HR - 2} ${Y(t)}" ${thin(d, 1.8)}/>`).join("");
    return out;
  }
  const logo = crown(60, Y(0.42), f.k === 1 ? 1.1 : 0.9);
  switch (style) {
    case "tee":
      out += `<path d="M${60 - 9} ${top - 2} Q60 ${top + 5} ${60 + 9} ${top - 2}" ${thin(d, 2.6)}/>` + logo;
      break;
    case "jacket":
      out += `<path d="M60 ${top + 2} L60 ${bottom + 2}" ${thin(d, 2.2)}/><rect x="57.6" y="${Y(0.3)}" width="4.8" height="7" rx="1.5" fill="#d9d9d9" stroke="${INK}" stroke-width="1"/>` + shape(`M${60 - 13} ${top - 5} L${60 + 13} ${top - 5} L${60 + 11} ${top + 4} Q60 ${top + 1} ${60 - 11} ${top + 4} Z`, d) + crown(72, Y(0.3), 0.8);
      break;
    case "puffer":
      out += [0.25, 0.55, 0.85].map((t) => `<path d="M${HL + 2} ${Y(t)} Q60 ${Y(t) + 4} ${HR - 2} ${Y(t)}" ${thin(d, 1.8)}/>`).join("") + `<path d="M60 ${top} L60 ${bottom + 3}" ${thin(d, 2)}/>` + shape(`M${60 - 15} ${top - 8} Q60 ${top - 12} ${60 + 15} ${top - 8} L${60 + 14} ${top + 5} Q60 ${top + 2} ${60 - 14} ${top + 5} Z`, hi);
      break;
    case "kaftan":
      out += `<path d="M${60 - 10} ${top - 2} Q60 ${top + 8} ${60 + 10} ${top - 2}" ${thin(GOLD, 2.6)}/><path d="M60 ${top + 6} L60 ${Y(0.85)}" ${thin(GOLD, 2.2)}/>` + [0.28, 0.48, 0.68].map((t) => `<path d="M56 ${Y(t)} l4 3 l4 -3" ${thin(GOLD, 1.6)}/>`).join("");
      break;
    case "shirt":
      out += shape(`M${60 - 12} ${top - 5} L60 ${top + 4} L${60 - 8} ${top + 9} Z`, hi) + shape(`M${60 + 12} ${top - 5} L60 ${top + 4} L${60 + 8} ${top + 9} Z`, hi) + [0.3, 0.52, 0.74].map((t) => `<circle cx="60" cy="${Y(t)}" r="1.6" fill="${d}"/>`).join("") + `<rect x="${60 + 6}" y="${Y(0.27)}" width="11" height="10" rx="2" fill="none" stroke="${d}" stroke-width="1.8"/>`;
      break;
    case "blazer":
      out +=
        shape(`M${60 - 10} ${top - 3} L60 ${Y(0.48)} L${60 + 10} ${top - 3} Z`, "#f8fafc") +
        shape(`M58.4 ${top + 1} L61.6 ${top + 1} L62.6 ${Y(0.36)} L60 ${Y(0.44)} L57.4 ${Y(0.36)} Z`, "#9b1c2c") +
        shape(`M${60 - 12} ${top - 4} L${60 - 4} ${Y(0.5)} L${60 - 14} ${Y(0.3)} Z`, tone(c, 0.7)) +
        shape(`M${60 + 12} ${top - 4} L${60 + 4} ${Y(0.5)} L${60 + 14} ${Y(0.3)} Z`, tone(c, 0.7)) +
        [0.62, 0.78].map((t) => `<circle cx="60" cy="${Y(t)}" r="1.7" fill="${tone(c, 0.6)}"/>`).join("");
      break;
    case "tank":
      break;
    case "hoodie":
    default:
      out +=
        shape(`M${60 - 19} ${top - 1} Q60 ${top + 15} ${60 + 19} ${top - 1} Q${60 + 14} ${top - 4} ${60 + 6} ${top - 4} Q60 ${top + 2} ${60 - 6} ${top - 4} Q${60 - 14} ${top - 4} ${60 - 19} ${top - 1} Z`, d) +
        `<path d="M54.5 ${top + 4} L53.5 ${top + 18} M65.5 ${top + 4} L66.5 ${top + 18}" ${thin(hi, 2)}/><circle cx="53.4" cy="${top + 19.5}" r="1.8" fill="${hi}" stroke="${INK}" stroke-width="0.8"/><circle cx="66.6" cy="${top + 19.5}" r="1.8" fill="${hi}" stroke="${INK}" stroke-width="0.8"/>` +
        `<path d="M${60 - 16} ${Y(0.64)} L${60 + 16} ${Y(0.64)} L${60 + 19} ${bottom} Q60 ${bottom + 3} ${60 - 19} ${bottom} Z" fill="${d}" opacity="0.55"/><path d="M${60 - 16} ${Y(0.64)} L${60 + 16} ${Y(0.64)} L${60 + 19} ${bottom} M${60 - 19} ${bottom} L${60 - 16} ${Y(0.64)}" ${thin(INK, 1.6)}/>` +
        crown(60, top + 13, 0.85);
      break;
  }
  return out;
}

// ── Backpacks ───────────────────────────────────────────────────────────────

function bag(look: Look, f: Frame, part: "behind" | "straps" | "back" | "side"): string {
  if (!look.bag) return "";
  const c = look.bagColor;
  const d = tone(c, 0.8);
  const { top, hem } = f;
  const w = f.sh + (f.k === 1 ? 12 : 6);
  switch (part) {
    case "behind":
      return shape(`M${60 - w} ${top + 8} Q${60 - w} ${top} ${60 - w + 12} ${top} L${60 + w - 12} ${top} Q${60 + w} ${top} ${60 + w} ${top + 8} L${60 + w} ${hem - 3} Q${60 + w} ${hem + 3} ${60 + w - 8} ${hem + 3} L${60 - w + 8} ${hem + 3} Q${60 - w} ${hem + 3} ${60 - w} ${hem - 3} Z`, c);
    case "straps": {
      const len = (hem - top) * 0.68;
      const L = 60 - f.sh + 3;
      const R = 60 + f.sh - 3;
      return (
        shape(`M${L} ${top} L${L + 7} ${top} Q${L + 5} ${n(top + len * 0.55)} ${L + 7} ${n(top + len)} L${L + 1} ${n(top + len)} Q${L - 2} ${n(top + len * 0.5)} ${L} ${top} Z`, d) +
        shape(`M${R} ${top} L${R - 7} ${top} Q${R - 5} ${n(top + len * 0.55)} ${R - 7} ${n(top + len)} L${R - 1} ${n(top + len)} Q${R + 2} ${n(top + len * 0.5)} ${R} ${top} Z`, d) +
        `<rect x="${L}" y="${n(top + len * 0.62)}" width="8" height="5" rx="1.5" fill="#cfcfcf" stroke="${INK}" stroke-width="1"/><rect x="${R - 8}" y="${n(top + len * 0.62)}" width="8" height="5" rx="1.5" fill="#cfcfcf" stroke="${INK}" stroke-width="1"/>`
      );
    }
    case "back": {
      const b = Math.min(hem + 7, top + 50);
      return (
        shape(`M36 ${top + 8} Q36 ${top - 2} 48 ${top - 2} L72 ${top - 2} Q84 ${top - 2} 84 ${top + 8} L84 ${b - 6} Q84 ${b} 76 ${b} L44 ${b} Q36 ${b} 36 ${b - 6} Z`, c) +
        shape(`M42 ${n(b - 22)} L78 ${n(b - 22)} L78 ${b - 6} Q78 ${b - 4} 74 ${b - 4} L46 ${b - 4} Q42 ${b - 4} 42 ${b - 6} Z`, d) +
        `<path d="M40 ${top + 10} Q60 ${top + 4} 80 ${top + 10}" ${thin(INK, 1.8)}/><circle cx="66" cy="${top + 9}" r="1.8" fill="#cfcfcf" stroke="${INK}" stroke-width="0.8"/>` +
        crown(60, b - 13, 0.8)
      );
    }
    case "side": {
      const back = 60 - f.sh * 0.58;
      const b = Math.min(hem + 4, top + 46);
      return (
        shape(`M${n(back - 14)} ${top + 8} Q${n(back - 14)} ${top + 2} ${n(back - 6)} ${top + 2} L${n(back + 4)} ${top + 2} L${n(back + 4)} ${b} L${n(back - 8)} ${b} Q${n(back - 15)} ${b} ${n(back - 15)} ${b - 6} Z`, c) +
        shape(`M${n(back - 16)} ${n(b - 18)} L${n(back - 10)} ${n(b - 18)} L${n(back - 10)} ${b - 3} L${n(back - 16)} ${b - 3} Z`, d) +
        shape(`M${n(back + 2)} ${top + 1} Q${n(back + 14)} ${top - 2} ${n(back + 18)} ${top + 4} L${n(back + 16)} ${top + 8} Q${n(back + 12)} ${top + 3} ${n(back + 3)} ${top + 7} Z`, d)
      );
    }
  }
}

// ── Legs and shoes (one leg; mirror the front one for the right leg) ───────

export const LEG_W = 32;

function legInner(look: Look, f: Frame, view: "front" | "side"): string {
  const c = look.bottomColor;
  const d = tone(c, light(c) ? 0.82 : 0.72);
  const hi = tone(c, 1.3);
  const P = f.pants;
  let pants = "";
  switch (look.bottom) {
    case "jeans":
      pants = shape(`M5 0 L25 0 L25.5 ${P} L4.5 ${P} Z`, c) + `<path d="M9 2 L8.5 ${P - 2}" ${thin(hi, 1.5)}/><path d="M5 ${P - 4} L25.5 ${P - 4}" ${thin(d, 1.6)}/>`;
      break;
    case "track":
      pants = shape(`M5 0 L25 0 L23 ${P - 6} L7 ${P - 6} Z`, c) + shape(`M7 ${P - 8} L23 ${P - 8} L22.5 ${P} L7.5 ${P} Z`, d) + `<path d="M7.4 1 L8.6 ${P - 8}" ${thin("#ffffff", 2.2)}/>`;
      break;
    case "shorts": {
      const S = n(P * 0.44);
      pants = shape(`M8 ${S - 4} L22 ${S - 4} L21 ${P} L9 ${P} Z`, look.skin) + shape(`M8.6 ${P - 7} L21.4 ${P - 7} L21 ${P} L9 ${P} Z`, "#f4f4f4") + shape(`M4 0 L26 0 L25 ${S} L5 ${S} Z`, c) + `<path d="M5 ${S - 3} L25 ${S - 3}" ${thin(d, 1.6)}/>`;
      if (look.tattoos && f.k !== 1) pants += `<path d="M13 ${S + 6} q3 3 0 6 q-3 3 0 6" ${thin("#2a3b4d", 1.4)}/>`;
      break;
    }
    case "cargo":
    default:
      pants =
        shape(`M5 0 L25 0 L23.5 ${P - 7} L6.5 ${P - 7} Z`, c) +
        shape(`M6.5 ${n(P - 8.5)} L23.5 ${n(P - 8.5)} L23 ${P} L7 ${P} Z`, d) +
        shape(`M${view === "side" ? 12 : 4.4} ${n(P * 0.29)} L${view === "side" ? 19 : 11} ${n(P * 0.29)} L${view === "side" ? 19 : 11} ${n(P * 0.56)} L${view === "side" ? 12 : 5.2} ${n(P * 0.56)} Z`, d);
      break;
  }
  const s = look.shoeColor;
  const sd = tone(s, light(s) ? 0.8 : 0.7);
  const swoosh = light(s) ? tone(s, 0.55) : "#ffffff";
  const laces = light(s) ? INK : "#ffffff";
  const sole = `M1 37 L29 37 Q30 43.5 26 44 L4 44 Q0 43.5 1 37 Z`;
  const soleSide = `M2 37 L31 37 Q32.5 43.5 28 44 L5 44 Q1 43.5 2 37 Z`;
  let shoe = "";
  if (view === "side") {
    switch (look.shoes) {
      case "hightops":
        shoe = shape("M4 38 Q3 21 10 21 L17 21 Q18 30 28 33 Q31.5 35 30.5 38 Z", s) + `<path d="M11 25 L17 29 M11 29 L17 33" ${thin(laces, 1.2)}/><circle cx="10" cy="33" r="2.4" fill="${swoosh}"/>` + shape(soleSide, "#fbfbf8") + `<path d="M3 40.5 L30 40.5" ${thin(sd, 1.4)}/>`;
        break;
      case "slides":
        shoe = shape("M7 29 L18 29 Q27 33 29 38 L6 38 Z", look.skin) + shape("M9 30.5 L20 30.5 L23 36.5 L8 36.5 Z", s) + shape("M2 38 L31 38 Q32 43 28 43.5 L5 43.5 Q1 43 2 38 Z", sd);
        break;
      case "sneakers":
      default:
        shoe = shape("M3 38 Q3 27.5 10 27 L17 27 Q21 31 28 33 Q31.5 35 30.5 38 Z", s) + `<path d="M7 35 Q17 38 27 34" ${thin(swoosh, 2.4)}/><path d="M15 28.5 L19 31 M17.5 27.5 L21.5 30" ${thin(laces, 1.2)}/>` + shape(soleSide, "#fbfbf8") + `<path d="M3 40.5 L30 40.5" ${thin(sd, 1.4)}/>`;
        break;
    }
  } else {
    switch (look.shoes) {
      case "hightops":
        shoe = shape("M3 38 Q2 22 9 21 L21 21 Q28 22 27 38 Z", s) + `<path d="M9 24 L21 28 M21 24 L9 28 M9 29 L21 33 M21 29 L9 33" ${thin(laces, 1.2)}/><circle cx="23" cy="34" r="2.6" fill="${swoosh}" opacity="0.9"/>` + shape(sole, "#fbfbf8") + `<path d="M2 40.5 L28 40.5" ${thin(sd, 1.4)}/>`;
        break;
      case "slides":
        shoe = shape("M8 29 L22 29 L23.5 39 L6.5 39 Z", look.skin) + shape("M4 31 L26 31 L26 37 L4 37 Z", s) + shape("M2 38 L28 38 Q29 43 26 43.5 L4 43.5 Q1 43 2 38 Z", sd);
        break;
      case "sneakers":
      default:
        shoe = shape("M2 38 Q1 27 9.5 26.5 L20.5 26.5 Q29 27 28 38 Z", s) + `<path d="M5.5 35 Q15 38 24.5 31" ${thin(swoosh, 2.4)}/><path d="M11 29 L19 29 M11.5 31.5 L18.5 31.5" ${thin(laces, 1.2)}/>` + shape(sole, "#fbfbf8") + `<path d="M2 40.5 L28 40.5" ${thin(sd, 1.4)}/>`;
        break;
    }
  }
  return pants + `<g transform="translate(0 ${P - 31})">${shoe}</g>`;
}

// ── Assembly ────────────────────────────────────────────────────────────────

export type View = "front" | "back" | "side";

const HEAD_CLIP = `<defs><clipPath id="head"><ellipse cx="60" cy="52" rx="34" ry="31"/></clipPath></defs>`;

/** Head art in its own coordinates; `behind` goes before the body (long hair, afros). */
function headArt(look: Look, view: View, adult: boolean): { behind: string; main: string } {
  const beard = adult ? beardArt(look, view === "side" ? "side" : "front") : "";
  const bling = adult ? jewellery(look, view) : "";
  if (view === "side") {
    const hair = hairSide(look);
    const hideFront = look.hat === "cap" || look.hat === "beanie";
    const ear = earSide(look);
    const headphones = look.headphones ? `<path d="M49 52 Q48 8 68 10" ${thin(INK, 8)}/><path d="M49 52 Q48 8 68 10" ${thin("#9aa0a6", 4.4)}/><rect x="41" y="47" width="16" height="23" rx="7" fill="#2e2e33" ${LINE}/>` : "";
    const glasses = look.glasses ? `<rect x="71" y="52" width="18" height="15" rx="6" fill="#18181b" ${LINE}/><path d="M71 57 L54 56" ${thin(INK, 2)}/>` : "";
    return {
      behind: hair.behind,
      main: headSide(look) + beard + faceSide(look) + (hideFront ? "" : hair.front) + (hair.overEar && !hideFront ? "" : ear) + hatSide(look) + headphones + glasses + bling,
    };
  }
  const hair = hairParts(look);
  if (view === "back") return { behind: "", main: headShape(look) + hair.back + hat(look, "back") + extras(look, "back") + bling };
  const hideFringe = look.hat === "cap" || look.hat === "beanie";
  return { behind: hair.behind, main: headShape(look) + beard + face(look) + (hideFringe ? "" : hair.front) + hat(look, "front") + extras(look, "front") + bling };
}

function upperInner(look: Look, view: View, adult: boolean): string {
  const f = frameFor(look, adult);
  const head = headArt(look, view, adult);
  const clip = adult && look.beard !== "none" ? HEAD_CLIP : "";
  const behind = head.behind ? placeHead(f, head.behind) : "";
  const main = placeHead(f, head.main);
  if (view === "back") return clip + tops(look, f, "back") + main + bag(look, f, "back");
  if (view === "side") return clip + behind + tops(look, f, "side") + bag(look, f, "side") + main;
  return clip + behind + bag(look, f, "behind") + tops(look, f, "front") + bag(look, f, "straps") + main;
}

/** Sizes of the parts for a body, in drawing units. */
export function dims(look: Look, adult: boolean) {
  const f = frameFor(look, adult);
  const bottom = Math.max(f.hem + (look.top === "kaftan" ? (f.k === 1 ? 12 : 22) : 0) + 8, f.hand.y + f.hand.r + 4);
  return { upperTop: -4, upperH: Math.ceil(bottom + 4), width: 120, hipY: f.hipY, legW: LEG_W, legH: f.pants + 15, legX: f.legX, headTop: f.hy - 56 * f.k };
}

function doc(viewBox: string, inner: string, width?: number, height?: number): string {
  const size = width && height ? ` width="${n(width)}" height="${n(height)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size}>${inner}</svg>`;
}

/** The parts the game animates: upper body from three sides, and one leg from the front and the side. */
export function characterParts(look: Look, adult: boolean, scale = 1) {
  const f = frameFor(look, adult);
  const d = dims(look, adult);
  const upper = (view: View) => doc(`0 ${d.upperTop} ${d.width} ${d.upperH}`, upperInner(look, view, adult), d.width * scale, d.upperH * scale);
  const leg = (view: "front" | "side") => doc(`0 0 ${LEG_W} ${d.legH}`, legInner(look, f, view), LEG_W * scale, d.legH * scale);
  return { front: upper("front"), back: upper("back"), side: upper("side"), leg: leg("front"), legSide: leg("side"), dims: d };
}

export type Crop = "full" | "head" | "top" | "legs";

/** The whole person standing, or a close-up crop for menus. */
export function characterSvg(look: Look, opts: { crop?: Crop; view?: View; adult?: boolean } = {}): string {
  const adult = opts.adult ?? false;
  const view = opts.view ?? "front";
  const crop = opts.crop ?? "full";
  const f = frameFor(look, adult);
  const d = dims(look, adult);
  const feet = f.hipY + d.legH;
  const legs =
    view === "side"
      ? `<g transform="translate(${60 - 18} ${f.hipY}) rotate(-8 16 0)">${legInner(look, f, "side")}</g><g transform="translate(${60 - 14} ${f.hipY}) rotate(8 16 0)">${legInner(look, f, "side")}</g>`
      : `<g transform="translate(${60 - f.legX - 15} ${f.hipY})">${legInner(look, f, "front")}</g><g transform="translate(${60 + f.legX + 15} ${f.hipY}) scale(-1 1)">${legInner(look, f, "front")}</g>`;
  const shadow = `<ellipse cx="60" cy="${feet - 2}" rx="30" ry="4" fill="#000" opacity="0.18"/>`;
  const headSize = 96 * f.k;
  const boxes: Record<Crop, string> = {
    full: `0 -4 120 ${feet + 6}`,
    head: `${n(60 - headSize / 2)} ${n(f.hy - 56 * f.k)} ${n(headSize)} ${n(headSize)}`,
    top: `${n(60 - (f.sh + 22))} ${f.top - 12} ${n((f.sh + 22) * 2)} ${n(Math.max(64, f.hem - f.top + 24))}`,
    legs: `${n(60 - 34)} ${f.hipY + f.pants - 30} 68 52`,
  };
  return doc(boxes[crop], shadow + legs + upperInner(look, view, adult));
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
