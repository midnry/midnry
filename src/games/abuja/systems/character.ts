// Characters after the character sheet: natural proportions (about seven
// heads tall for grown-ups, four and a half for kids), soft cel shading and
// clean dark outlines. Everything is drawn as SVG from a Look, so the game
// world (as textures) and the menus (as images) show the same person.
//
// The world animates people from separate parts: the torso with the head,
// one arm and one leg (mirrored for the other side). Poses like waving,
// running or sitting are rotations of those parts, so every character gets
// every animation without extra art.
//
// Everything a person can wear or look like is data in the lists below. Add
// a hairstyle, a top or a hat by adding an entry (and, for new shapes, a
// case in the matching drawing function).

import type { Looks } from "./types";

// ── Options ─────────────────────────────────────────────────────────────────

/** Eight tones, light to deep, after the sheet. */
export const SKIN_TONES = ["#f3d2bb", "#e6b48f", "#d29a6e", "#b97b4f", "#9c6038", "#7d4a2a", "#603620", "#46261a"];

/** Who an option suits. Everyone can pick anything; this only sets the order and random looks. */
type For = "any" | "masc" | "fem";
/** Which age group it's for: kids and grown-ups have their own collections. */
type Ages = "all" | "adult" | "kid";

/**
 * Hair as data. `kind` decides the outline; `hang` is how far hair falls
 * below the head (in head units), and `tex` the texture drawn on top.
 */
type HairDef = {
  id: string;
  label: string;
  for: For;
  length: "none" | "short" | "medium" | "long";
  type: "coily" | "curly" | "wavy" | "straight" | "braided" | "locs";
  kind: "cap" | "afro" | "tall" | "bun" | "puffs" | "hang" | "ponytail" | "bob" | "none";
  /** Hairline height on the forehead (head units, 0 = eye level, -19 = top of head). */
  line?: number;
  /** Extra height above the head. */
  lift?: number;
  hang?: number;
  tex?: "dots" | "waves" | "rows" | "curls" | "strands" | "twists" | "locs" | "braids" | "none";
  part?: boolean;
};

export const HAIR_STYLES = [
  { id: "buzz", label: "Buzz cut", for: "masc", length: "short", type: "coily", kind: "cap", line: -11, lift: 0.5, tex: "dots" },
  { id: "lowcut", label: "Low cut", for: "masc", length: "short", type: "coily", kind: "cap", line: -11, lift: 1.5, tex: "dots" },
  { id: "fade", label: "Curly top fade", for: "masc", length: "short", type: "coily", kind: "cap", line: -11, lift: 5, tex: "curls" },
  { id: "waves", label: "360 waves", for: "masc", length: "short", type: "wavy", kind: "cap", line: -11, lift: 1.5, tex: "waves" },
  { id: "afro", label: "Afro", for: "any", length: "medium", type: "coily", kind: "afro", line: -10, lift: 9, tex: "curls" },
  { id: "hightop", label: "High top", for: "masc", length: "medium", type: "coily", kind: "tall", line: -11, lift: 14, tex: "curls" },
  { id: "twists", label: "Twists", for: "any", length: "medium", type: "coily", kind: "cap", line: -11, lift: 5, tex: "twists" },
  { id: "sidepart", label: "Side part", for: "masc", length: "short", type: "wavy", kind: "cap", line: -11, lift: 4, tex: "strands", part: true },
  { id: "cornrows", label: "Cornrows", for: "any", length: "medium", type: "braided", kind: "cap", line: -12, lift: 1, tex: "rows" },
  { id: "locs", label: "Locs", for: "any", length: "long", type: "locs", kind: "hang", line: -11, lift: 2, hang: 30, tex: "locs" },
  { id: "bun", label: "Curly bun", for: "fem", length: "medium", type: "curly", kind: "bun", line: -12, lift: 2, tex: "curls" },
  { id: "puffs", label: "Puffs", for: "fem", length: "medium", type: "coily", kind: "puffs", line: -12, lift: 1, tex: "curls", part: true },
  { id: "curls", label: "Long curls", for: "fem", length: "long", type: "curly", kind: "hang", line: -12, lift: 4, hang: 34, tex: "curls" },
  { id: "wavy", label: "Long waves", for: "fem", length: "long", type: "wavy", kind: "hang", line: -12, lift: 3, hang: 50, tex: "waves", part: true },
  { id: "braids", label: "Box braids", for: "fem", length: "long", type: "braided", kind: "hang", line: -12, lift: 2, hang: 48, tex: "braids", part: true },
  { id: "straight", label: "Long straight", for: "fem", length: "long", type: "straight", kind: "hang", line: -12, lift: 2, hang: 40, tex: "strands", part: true },
  { id: "ponytail", label: "Ponytail", for: "fem", length: "long", type: "wavy", kind: "ponytail", line: -12, lift: 1.5, hang: 26, tex: "strands" },
  { id: "bob", label: "Bob", for: "fem", length: "medium", type: "straight", kind: "bob", line: -9, lift: 3, hang: 14, tex: "strands" },
  { id: "pixie", label: "Pixie cut", for: "fem", length: "short", type: "wavy", kind: "cap", line: -9, lift: 3, tex: "strands", part: true },
  { id: "bald", label: "Bald", for: "masc", length: "none", type: "straight", kind: "none" },
] as const satisfies readonly HairDef[];
export type HairId = (typeof HAIR_STYLES)[number]["id"];
const hairDef = (id: string): HairDef => (HAIR_STYLES as readonly HairDef[]).find((h) => h.id === id) ?? HAIR_STYLES[1];

/** Black, browns, caramel, blonde, red, burgundy, grey and a dyed blue. */
export const HAIR_COLORS = ["#1f1410", "#3d2416", "#6b3a1e", "#a8693a", "#d8b46a", "#b8361f", "#6b1830", "#a9a9a9", "#7aa7d9"];

export const TOPS = [
  { id: "hoodie", label: "Hoodie", ages: "all", sleeve: "long" },
  { id: "ziphoodie", label: "Open hoodie", ages: "all", sleeve: "long" },
  { id: "tee", label: "T-shirt", ages: "all", sleeve: "short" },
  { id: "shirt", label: "Shirt", ages: "all", sleeve: "long" },
  { id: "jacket", label: "Track jacket", ages: "all", sleeve: "long" },
  { id: "puffer", label: "Puffer", ages: "all", sleeve: "puffy" },
  { id: "sweater", label: "Sweater", ages: "all", sleeve: "long" },
  { id: "blazer", label: "Blazer", ages: "adult", sleeve: "long" },
  { id: "kaftan", label: "Kaftan", ages: "all", sleeve: "wide" },
  { id: "tank", label: "Tank top", ages: "all", sleeve: "none" },
  { id: "dress", label: "Dress", ages: "all", sleeve: "short" },
] as const;
export type TopId = (typeof TOPS)[number]["id"];

export const BOTTOMS = [
  { id: "cargo", label: "Cargo pants", ages: "all" },
  { id: "jeans", label: "Wide jeans", ages: "all" },
  { id: "track", label: "Track pants", ages: "all" },
  { id: "shorts", label: "Shorts", ages: "all" },
  { id: "skirt", label: "Skirt", ages: "all" },
  { id: "overalls", label: "Dungarees", ages: "kid" },
] as const;
export type BottomId = (typeof BOTTOMS)[number]["id"];

export const SHOES = [
  { id: "sneakers", label: "Sneakers" },
  { id: "hightops", label: "High-tops" },
  { id: "slides", label: "Slides" },
  { id: "boots", label: "Boots" },
  { id: "flats", label: "Flats" },
] as const;
export type ShoeId = (typeof SHOES)[number]["id"];

export const HATS = [
  { id: "none", label: "None", ages: "all" },
  { id: "cap", label: "Cap", ages: "all" },
  { id: "beanie", label: "Beanie", ages: "all" },
  { id: "headband", label: "Headband or bow", ages: "all" },
  { id: "bucket", label: "Bucket hat", ages: "all" },
  { id: "kufi", label: "Kufi", ages: "adult" },
  { id: "gele", label: "Gele", ages: "adult" },
] as const;
export type HatId = (typeof HATS)[number]["id"];

export const BEARDS = [
  { id: "none", label: "None" },
  { id: "stubble", label: "Stubble" },
  { id: "mustache", label: "Moustache" },
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

export const BAGS = [
  { id: "backpack", label: "Backpack" },
  { id: "crossbody", label: "Cross-body bag" },
  { id: "tote", label: "Tote bag" },
] as const;
export type BagId = (typeof BAGS)[number]["id"];

// Faces: each feature is its own choice.
export const FACE_SHAPES = [
  { id: "oval", label: "Oval" },
  { id: "round", label: "Round" },
  { id: "square", label: "Square" },
  { id: "heart", label: "Heart" },
] as const;
export const EYES = [
  { id: "almond", label: "Almond" },
  { id: "round", label: "Round" },
  { id: "hooded", label: "Hooded" },
  { id: "wide", label: "Wide" },
  { id: "narrow", label: "Narrow" },
] as const;
export const BROWS = [
  { id: "soft", label: "Soft" },
  { id: "thick", label: "Thick" },
  { id: "arched", label: "Arched" },
  { id: "straight", label: "Straight" },
] as const;
export const NOSES = [
  { id: "button", label: "Button" },
  { id: "broad", label: "Broad" },
  { id: "narrow", label: "Narrow" },
] as const;
export const MOUTHS = [
  { id: "smile", label: "Smile" },
  { id: "neutral", label: "Calm" },
  { id: "full", label: "Full lips" },
  { id: "grin", label: "Grin" },
] as const;
export type FaceShape = (typeof FACE_SHAPES)[number]["id"];
export type EyeId = (typeof EYES)[number]["id"];
export type BrowId = (typeof BROWS)[number]["id"];
export type NoseId = (typeof NOSES)[number]["id"];
export type MouthId = (typeof MOUTHS)[number]["id"];

export type Build = "masc" | "fem";

/** Clothes colours: the sheet's denims, blacks and soft brights. */
export const CLOTH_COLORS = [
  "#1b1b1d", // black
  "#3b3b3e", // charcoal
  "#8f8780", // grey
  "#f4f1ea", // off-white
  "#cdbca6", // beige
  "#6a83a8", // light denim
  "#3f5f8f", // denim
  "#1e3a8a", // navy
  "#1f7fd6", // blue
  "#f39ab6", // pink
  "#e8461f", // red
  "#f7941d", // orange
  "#e9c46a", // mustard
  "#4c7a34", // olive
  "#16a34a", // naija green
  "#7b3fc4", // purple
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
  bagStyle: BagId;
  bagColor: string;
  /** Sunglasses. */
  glasses: boolean;
  /** Clear reading or everyday glasses. */
  specs: boolean;
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
  faceShape: FaceShape;
  eyes: EyeId;
  brows: BrowId;
  nose: NoseId;
  mouth: MouthId;
};

const ids = (list: readonly { id: string }[]) => list.map((x) => x.id) as readonly string[];
const valid = <T extends string>(list: readonly { id: string }[], value: string | undefined, fallback: T): T => (value && ids(list).includes(value) ? (value as T) : fallback);

/** Fill in everything an older or partial save leaves out. Old looks keep working. */
export function fullLook(looks: Partial<Looks> | Partial<Look>): Look {
  const l = looks as Partial<Look> & { outfit?: string };
  const top = l.topColor ?? l.outfit ?? "#1f7fd6";
  const build: Build = l.build ?? (l.lashes ? "fem" : "masc");
  return {
    skin: l.skin ?? SKIN_TONES[4]!,
    hair: valid<HairId>(HAIR_STYLES, l.hair, "afro"),
    hairColor: l.hairColor ?? HAIR_COLORS[0]!,
    top: valid<TopId>(TOPS, l.top, "hoodie"),
    topColor: top,
    bottom: valid<BottomId>(BOTTOMS, l.bottom, "cargo"),
    bottomColor: l.bottomColor ?? "#1b1b1d",
    shoes: valid<ShoeId>(SHOES, l.shoes, "sneakers"),
    shoeColor: l.shoeColor ?? "#f4f1ea",
    hat: valid<HatId>(HATS, l.hat, "none"),
    hatColor: l.hatColor ?? "#f39ab6",
    bag: l.bag ?? false,
    bagStyle: valid<BagId>(BAGS, l.bagStyle, "backpack"),
    bagColor: l.bagColor ?? "#3b3b3e",
    glasses: l.glasses ?? false,
    specs: l.specs ?? false,
    headphones: l.headphones ?? false,
    lashes: l.lashes ?? build === "fem",
    build,
    beard: valid<BeardId>(BEARDS, l.beard, "none"),
    earrings: valid<EarringId>(EARRINGS, l.earrings, "none"),
    noseRing: l.noseRing ?? false,
    chain: l.chain ?? false,
    watch: l.watch ?? false,
    tattoos: l.tattoos ?? false,
    faceShape: valid<FaceShape>(FACE_SHAPES, l.faceShape, "oval"),
    eyes: valid<EyeId>(EYES, l.eyes, "almond"),
    brows: valid<BrowId>(BROWS, l.brows, build === "fem" ? "arched" : "thick"),
    nose: valid<NoseId>(NOSES, l.nose, "broad"),
    mouth: valid<MouthId>(MOUTHS, l.mouth, "smile"),
  };
}

/** Grown-up looks from the sheet: black open hoodie and cargos; white tank and wide jeans. */
export const ADULT_PRESETS: Record<"male" | "female", Look> = {
  male: fullLook({ skin: SKIN_TONES[5], hair: "fade", top: "ziphoodie", topColor: "#1b1b1d", bottom: "cargo", bottomColor: "#1b1b1d", shoeColor: "#f4f1ea", build: "masc", beard: "stubble", brows: "thick", lashes: false }),
  female: fullLook({ skin: SKIN_TONES[4], hair: "wavy", top: "tank", topColor: "#f4f1ea", bottom: "jeans", bottomColor: "#6a83a8", shoeColor: "#f4f1ea", build: "fem", lashes: true, brows: "arched", mouth: "full", earrings: "studs" }),
};

/** Starting looks for the character creator (you start as a kid): the sheet's navy hoodie and shorts; pink hoodie, shorts and puffs. */
export const PRESETS: Record<"male" | "female", Look> = {
  male: fullLook({ skin: SKIN_TONES[5], hair: "afro", top: "hoodie", topColor: "#1e3a8a", bottom: "shorts", bottomColor: "#3b3b3e", shoeColor: "#f4f1ea", build: "masc", brows: "soft", lashes: false, mouth: "smile" }),
  female: fullLook({ skin: SKIN_TONES[4], hair: "puffs", hatColor: "#f39ab6", top: "hoodie", topColor: "#f39ab6", bottom: "shorts", bottomColor: "#a9c7e8", shoeColor: "#f39ab6", build: "fem", lashes: true, brows: "soft", mouth: "smile" }),
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
  const fem = overrides.build ? overrides.build === "fem" : r() < 0.5;
  const build: Build = fem ? "fem" : "masc";
  const hairs = (HAIR_STYLES as readonly HairDef[]).filter((h) => h.for === "any" || h.for === build).map((h) => h.id as HairId);
  const tops = fem ? (["tee", "tank", "hoodie", "ziphoodie", "dress", "shirt", "kaftan", "sweater", "jacket", "blazer"] as const) : (["tee", "hoodie", "ziphoodie", "shirt", "jacket", "puffer", "kaftan", "blazer", "sweater", "tank"] as const);
  const top = pick(r, tops);
  return {
    skin: pick(r, SKIN_TONES.slice(2)),
    hair: pick(r, hairs),
    hairColor: r() < 0.78 ? HAIR_COLORS[0]! : pick(r, HAIR_COLORS.slice(0, 7)),
    top,
    topColor: pick(r, CLOTH_COLORS),
    bottom: fem ? pick(r, ["jeans", "cargo", "skirt", "jeans", "track", "shorts"] as const) : pick(r, ["cargo", "jeans", "track", "shorts", "jeans"] as const),
    bottomColor: pick(r, ["#1b1b1d", "#3f5f8f", "#6a83a8", "#cdbca6", "#3b3b3e", "#4c7a34", "#8f8780"]),
    shoes: pick(r, ["sneakers", "sneakers", "hightops", "slides", fem ? "flats" : "boots"] as const),
    shoeColor: pick(r, ["#f4f1ea", "#1b1b1d", "#f4f1ea", ...CLOTH_COLORS]),
    hat: r() < 0.72 ? "none" : pick(r, fem ? (["headband", "gele", "cap", "bucket"] as const) : (["cap", "beanie", "kufi", "bucket"] as const)),
    hatColor: pick(r, CLOTH_COLORS),
    bag: r() < 0.35,
    bagStyle: pick(r, ["backpack", "crossbody", "tote"] as const),
    bagColor: pick(r, CLOTH_COLORS),
    glasses: r() < 0.08,
    specs: r() < 0.12,
    headphones: r() < 0.08,
    lashes: fem,
    build,
    beard: fem ? "none" : pick(r, ["none", "none", "stubble", "mustache", "goatee", "full"] as const),
    earrings: r() < (fem ? 0.7 : 0.12) ? pick(r, ["studs", "hoops"] as const) : "none",
    noseRing: r() < 0.06,
    chain: r() < 0.2,
    watch: r() < 0.3,
    tattoos: r() < 0.12,
    faceShape: pick(r, ["oval", "round", "square", "heart"] as const),
    eyes: pick(r, ["almond", "round", "hooded", "wide", "narrow"] as const),
    brows: pick(r, fem ? (["arched", "soft", "straight"] as const) : (["thick", "straight", "soft"] as const)),
    nose: pick(r, ["button", "broad", "broad", "narrow"] as const),
    mouth: pick(r, ["smile", "neutral", "full", "grin"] as const),
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

// ── Life stages ─────────────────────────────────────────────────────────────

export type LifeStage = "child" | "teen" | "young" | "adult" | "senior";

/** The life stage at an age. */
export function stageOf(age: number): LifeStage {
  return age < 13 ? "child" : age < 18 ? "teen" : age < 30 ? "young" : age < 60 ? "adult" : "senior";
}

/** Older call sites pass `adult: boolean`; newer ones pass a stage. */
export type Body = boolean | LifeStage;
const stageFrom = (b: Body): LifeStage => (b === true ? "adult" : b === false ? "child" : b);

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

/** The cel-shade colour for a fill: one step darker. */
const shadeOf = (c: string) => tone(c, light(c) ? 0.84 : 0.74);

// ── SVG helpers ─────────────────────────────────────────────────────────────

const n = (v: number) => +v.toFixed(1);
const LINE = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const edge = (color: string, w = 1.6) => `stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const thin = (color: string, w = 1.6) => `fill="none" ${edge(color, w)}`;
const shape = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}" ${LINE} ${extra}/>`;
const flat = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
const GOLD = "#e6b53a";

/** Bumpy masses (afros, curls): ink every circle, then fill them all, so only the outside edge is outlined. */
function blob(circles: [number, number, number][], fill: string): string {
  return circles.map(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r + 1.1)}" fill="${INK}"/>`).join("") + circles.map(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}"/>`).join("");
}

function ring(cx: number, cy: number, rx: number, ry: number, from: number, to: number, step: number, r: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = from; a <= to + 0.01; a += step) {
    const rad = (a * Math.PI) / 180;
    out.push([cx + Math.cos(rad) * rx, cy + Math.sin(rad) * ry, r]);
  }
  return out;
}

// ── Heads (local coordinates: centre (0, 0), about 31 wide and 38 tall) ───

const H = { rx: 15.5, ry: 19 };

function facePath(shapeId: FaceShape): string {
  switch (shapeId) {
    case "round":
      return "M0 -19 C10 -19 16.5 -11 16.5 -1 C16.5 10 9.5 18 0 18 C-9.5 18 -16.5 10 -16.5 -1 C-16.5 -11 -10 -19 0 -19 Z";
    case "square":
      return "M0 -19 C10 -19 15.5 -12 15.5 -3 L15 7 C14.5 14 10 18.5 3 19 L-3 19 C-10 18.5 -14.5 14 -15 7 L-15.5 -3 C-15.5 -12 -10 -19 0 -19 Z";
    case "heart":
      return "M0 -19 C11 -19 16.5 -11 16 -2 C15.5 7 9 15 0 19.5 C-9 15 -15.5 7 -16 -2 C-16.5 -11 -11 -19 0 -19 Z";
    case "oval":
    default:
      return "M0 -19 C10 -19 15.5 -11 15.5 -1 C15.5 10 9 19 0 19 C-9 19 -15.5 10 -15.5 -1 C-15.5 -11 -10 -19 0 -19 Z";
  }
}

/** Side profile facing right: forehead, nose, lips and chin. */
function profilePath(shapeId: FaceShape): string {
  const jaw = shapeId === "square" ? "L12 14 Q9 19 2 19" : shapeId === "round" ? "Q12 18 2 18.5" : "Q11 18.5 3 19";
  return `M-1 -19 C9 -19 14.5 -13 14.5 -6 L15 -1 L19 5 L15.2 7 L15.6 9.5 L14.6 11 L15 13 ${jaw} L-4 18 C-12 17 -16 9 -16 -1 C-16 -12 -10 -19 -1 -19 Z`;
}

function eyesFront(look: Look): string {
  const lid = INK;
  const iris = "#3a2214";
  const one = (x: number, flip: 1 | -1) => {
    const e = look.eyes;
    const w = e === "wide" ? 4.4 : e === "narrow" ? 3.6 : 4;
    const h = e === "round" ? 2.8 : e === "narrow" ? 1.5 : e === "wide" ? 2.6 : 2.1;
    const ox = e === "wide" ? x + flip * 0.6 : x;
    let s = `<path d="M${n(ox - w)} 0 Q${ox} ${n(-h * 1.3)} ${n(ox + w)} 0 Q${ox} ${n(h)} ${n(ox - w)} 0 Z" fill="#fbf7f2"/>`;
    s += `<circle cx="${ox}" cy="${n(-h * 0.1)}" r="${n(Math.min(2.2, h + 0.4))}" fill="${iris}"/><circle cx="${n(ox + 0.7)}" cy="${n(-h * 0.45)}" r="0.65" fill="#fff"/>`;
    s += `<path d="M${n(ox - w - 0.3)} 0.2 Q${ox} ${n(-h * 1.45)} ${n(ox + w + 0.3)} 0.2" ${thin(lid, e === "hooded" ? 2 : 1.4)}/>`;
    if (e === "hooded") s += `<path d="M${n(ox - w)} -1.6 Q${ox} ${n(-h * 1.6 - 1)} ${n(ox + w)} -1.6" ${thin(tone(look.skin, 0.7), 1.1)}/>`;
    if (look.lashes) s += `<path d="M${n(ox + flip * (w + 0.2))} -0.4 l${flip * 1.6} -1.2 M${n(ox + flip * (w - 1.4))} ${n(-h * 0.9)} l${flip * 1.2} -1.5" ${thin(lid, 1)}/>`;
    return s;
  };
  return one(-6.2, -1) + one(6.2, 1);
}

function browsFront(look: Look): string {
  const c = look.hairColor === HAIR_COLORS[7] ? "#8a8a8a" : tone(look.hairColor === HAIR_COLORS[0] ? "#2a1810" : look.hairColor, 0.8);
  const w = look.brows === "thick" ? 2.2 : look.brows === "soft" ? 1.3 : 1.6;
  const path = (x: number, f: 1 | -1) =>
    look.brows === "arched"
      ? `M${n(x - f * 4)} -5 Q${n(x + f * 0.5)} -8.6 ${n(x + f * 4.4)} -5.6`
      : look.brows === "straight"
        ? `M${n(x - f * 4)} -5.6 L${n(x + f * 4.2)} -6.2`
        : `M${n(x - f * 4)} -5.2 Q${x} -7.4 ${n(x + f * 4.3)} -6`;
  return `<path d="${path(-6.4, -1)}" ${thin(c, w)}/><path d="${path(6.4, 1)}" ${thin(c, w)}/>`;
}

function noseFront(look: Look): string {
  const d = tone(look.skin, 0.66);
  if (look.nose === "button") return `<path d="M-1.6 7.2 Q0 8.4 1.6 7.2" ${thin(d, 1.3)}/><circle cx="-1.6" cy="6.6" r="0.5" fill="${d}"/><circle cx="1.6" cy="6.6" r="0.5" fill="${d}"/>`;
  if (look.nose === "narrow") return `<path d="M0.6 0 L1.4 6.4 Q0 7.6 -1.4 6.6" ${thin(d, 1.2)}/>`;
  return `<path d="M-3.4 6.2 Q-3.8 8.4 -1.4 8.3 Q0 9 1.4 8.3 Q3.8 8.4 3.4 6.2" ${thin(d, 1.4)}/><path d="M-0.8 1 Q-1.6 4 -2.6 5.6" ${thin(tone(look.skin, 0.82), 1)}/>`;
}

function mouthFront(look: Look): string {
  const lip = tone(look.skin, look.build === "fem" ? 0.62 : 0.7);
  const lipHi = tone(lip, 1.15);
  const y = 12.6;
  switch (look.mouth) {
    case "grin":
      return `<path d="M-5 ${y - 0.6} Q0 ${y + 5.6} 5 ${y - 0.6} Z" fill="#5a1a10" stroke="${INK}" stroke-width="1"/><path d="M-4.2 ${y - 0.3} Q0 ${y + 1.4} 4.2 ${y - 0.3} L4 ${y + 0.6} Q0 ${y + 2} -4 ${y + 0.6} Z" fill="#fff"/>`;
    case "full":
      return flat(`M-5 ${y} Q-2.4 ${y - 2.4} 0 ${y - 1.2} Q2.4 ${y - 2.4} 5 ${y} Q2.6 ${y + 3.4} 0 ${y + 3.2} Q-2.6 ${y + 3.4} -5 ${y} Z`, lip) + `<path d="M-5 ${y} Q0 ${y + 0.8} 5 ${y}" ${thin(tone(lip, 0.7), 1)}/><path d="M-2 ${y + 1.8} Q0 ${y + 2.4} 2 ${y + 1.8}" ${thin(lipHi, 0.8)}/>`;
    case "neutral":
      return flat(`M-3.8 ${y} Q0 ${y - 1.4} 3.8 ${y} Q0 ${y + 2} -3.8 ${y} Z`, lip) + `<path d="M-3.8 ${y} L3.8 ${y}" ${thin(tone(lip, 0.65), 1)}/>`;
    case "smile":
    default:
      return flat(`M-4.6 ${y - 0.8} Q0 ${y - 1.2} 4.6 ${y - 0.8} Q0 ${y + 3.6} -4.6 ${y - 0.8} Z`, lip) + `<path d="M-4.6 ${y - 0.8} Q0 ${y + 1.8} 4.6 ${y - 0.8}" ${thin(tone(lip, 0.6), 1.1)}/>`;
  }
}

function beardFront(look: Look): string {
  if (look.beard === "none") return "";
  const c = look.hairColor;
  const alpha = look.beard === "stubble" ? ' opacity="0.3"' : "";
  const stache = `<path d="M-5.4 10.6 Q-2.6 8.6 0 9.6 Q2.6 8.6 5.4 10.6 Q2.6 11.6 0 10.8 Q-2.6 11.6 -5.4 10.6 Z" fill="${c}"/>`;
  const jaw = `<path d="M-15 2 Q-14 14 -6 18 Q0 20.5 6 18 Q14 14 15 2 L13 2 Q12 11 5.5 14.5 Q0 16 -5.5 14.5 Q-12 11 -13 2 Z" fill="${c}"${alpha}/>`;
  if (look.beard === "stubble") return jaw + `<path d="M-5 10.8 Q0 9.2 5 10.8" ${thin(c, 1.6)} opacity="0.35"/>`;
  if (look.beard === "mustache") return stache;
  if (look.beard === "goatee") return stache + flat("M-3.2 15.6 Q0 20.5 3.2 15.6 Q0 17 -3.2 15.6 Z", c);
  return jaw + stache + flat("M-4 15.8 Q0 21 4 15.8 Q0 17.6 -4 15.8 Z", c);
}

function earsFront(look: Look): string {
  const d = tone(look.skin, 0.8);
  return `<ellipse cx="-15.6" cy="1.5" rx="2.6" ry="4" fill="${look.skin}" ${LINE}/><ellipse cx="15.6" cy="1.5" rx="2.6" ry="4" fill="${look.skin}" ${LINE}/><path d="M-15.4 0 q-1 1.6 0 3 M15.4 0 q1 1.6 0 3" ${thin(d, 0.9)}/>`;
}

function jewelleryFront(look: Look): string {
  let out = "";
  const ear = (x: number) => (look.earrings === "hoops" ? `<circle cx="${x}" cy="7.4" r="2.4" fill="none" stroke="${GOLD}" stroke-width="1.1"/>` : `<circle cx="${x}" cy="5.6" r="1.1" fill="${GOLD}" stroke="${INK}" stroke-width="0.5"/>`);
  if (look.earrings !== "none") out += ear(-15.8) + ear(15.8);
  if (look.noseRing) out += `<path d="M2.4 7.4 a1.3 1.3 0 1 1 -1.3 1.4" ${thin(GOLD, 0.9)}/>`;
  return out;
}

function glassesFront(look: Look): string {
  let out = "";
  if (look.specs) out += `<rect x="-11" y="-3.4" width="9" height="6.4" rx="2.4" fill="#ffffff" fill-opacity="0.18" ${edge(INK, 1.2)}/><rect x="2" y="-3.4" width="9" height="6.4" rx="2.4" fill="#ffffff" fill-opacity="0.18" ${edge(INK, 1.2)}/><path d="M-2 -0.6 Q0 -2 2 -0.6" ${thin(INK, 1.1)}/>`;
  if (look.glasses) out += `<path d="M-11.5 -3 L-1.6 -3 L-2.2 2.4 Q-6.6 4.6 -10.8 2.4 Z M1.6 -3 L11.5 -3 L10.8 2.4 Q6.6 4.6 2.2 2.4 Z" fill="#18181b" ${edge(INK, 1.2)}/><path d="M-1.6 -2 L1.6 -2" ${thin(INK, 1.2)}/><path d="M-9 -1.6 l3 0 M4 -1.6 l3 0" ${thin("#ffffff", 0.9)} opacity="0.5"/>`;
  return out;
}

// Hair, from the data above. Each view builds the same style from the same numbers.

type HairArt = { behind: string; front: string };

function hairTex(def: HairDef, color: string, area: "top" | "side"): string {
  const t = color === HAIR_COLORS[0] ? "#4a3428" : tone(color, light(color) ? 0.75 : 0.62);
  const hi = tone(color, color === HAIR_COLORS[0] ? 2.2 : 1.25);
  switch (def.tex) {
    case "dots":
      return [[-8, -15], [-2, -17], [5, -16], [10, -13], [-11, -10], [0, -13], [7, -11]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.55" fill="${t}"/>`).join("");
    case "waves":
      return [-20, -17, -14].map((y) => `<path d="M-9 ${y + 2} q3 -1.6 6 0 t6 0 t6 0" ${thin(hi, 0.8)} opacity="0.45"/>`).join("");
    case "rows":
      return [-9, -4.5, 0, 4.5, 9].map((x) => `<path d="M${x} -11 Q${n(x * 0.6)} -17 ${n(x * 0.3)} -21" ${thin(t, 1.4)} stroke-dasharray="1.6 1.2"/>`).join("");
    case "curls":
      return [[-9, -16], [-3, -19], [4, -18], [10, -14], [-12, -11], [0, -14], [7, -12]].map(([x, y]) => `<path d="M${x - 1.4} ${y} q1.4 -1.6 2.8 0" ${thin(t, 0.9)}/>`).join("");
    case "twists":
      return [-10, -5, 0, 5, 10].map((x) => `<path d="M${x} -12 l1 -2.4 l-1 -2.4 l1 -2.4" ${thin(t, 0.9)}/>`).join("");
    case "strands":
      return `<path d="M-8 -17 Q-3 -12 -2 -9 M2 -18 Q6 -13 8 -10 M-12 -12 Q-10 -8 -11 -4" ${thin(t, 0.9)}/><path d="M-5 -19 Q0 -20 5 -19" ${thin(hi, 1)} opacity="0.6"/>`;
    default:
      return "";
  }
}

/** Hair seen from the front. */
function hairFront(look: Look): HairArt {
  const def = hairDef(look.hair);
  const c = look.hairColor;
  if (def.kind === "none") return { behind: "", front: `<ellipse cx="-5" cy="-14" rx="5" ry="2.4" fill="#fff" opacity="0.22"/>` };
  const line = def.line ?? -11;
  const lift = def.lift ?? 2;
  const top = -19 - lift;
  const cap = (extra = 0) =>
    shape(`M-16.6 ${line + 7} C-18.2 ${top + 6} -10 ${top - extra} 0 ${top - extra} C10 ${top - extra} 18.2 ${top + 6} 16.6 ${line + 7} Q13 ${line - 1} 6 ${line - 1.5} Q0 ${line - 2.5} -6 ${line - 1.5} Q-13 ${line - 1} -16.6 ${line + 7} Z`, c);
  const partLine = def.part ? `<path d="M${def.id === "sidepart" || def.id === "pixie" ? -5 : 0} ${top + 1} L${def.id === "sidepart" || def.id === "pixie" ? -4 : 0} ${line - 1}" ${thin(tone(c, 0.6), 1)}/>` : "";
  const tex = hairTex(def, c, "top");
  // Hair falling past the face, behind the head and shoulders.
  const fall = (len: number, width: number) => {
    const y = 6 + len;
    if (def.tex === "curls" || def.type === "coily")
      return blob([[0, -6, 20], ...[-1, 6, 14, 22, 30, 38, 46].filter((v) => v < y).flatMap((yy) => [[-15 - width * 0.3, yy, 8] as [number, number, number], [15 + width * 0.3, yy, 8] as [number, number, number]])], c);
    if (def.tex === "braids" || def.tex === "locs") {
      let s = "";
      const xs = [-19, -15, -11, 11, 15, 19];
      for (const x of xs) {
        s += `<rect x="${x - 2}" y="-6" width="4" height="${n(y + 6)}" rx="2" fill="${c}" ${LINE}/>`;
        for (let yy = -2; yy < y - 2; yy += 4) s += `<path d="M${x - 1.6} ${yy} l1.6 1.6 l1.6 -1.6" ${thin(tone(c, 0.6), 0.7)}/>`;
      }
      return s;
    }
    const wave = def.tex === "waves";
    const edge = (side: 1 | -1) => {
      const x0 = side * 16;
      const x1 = side * (16 + width);
      if (!wave) return `L${n(x1)} ${y}`;
      let p = "";
      for (let yy = 4; yy <= y; yy += 10) p += ` Q${n(x1 + side * 3)} ${yy - 5} ${n(x1)} ${yy}`;
      return p + ` L${n(x1)} ${y}`;
    };
    return shape(`M-16 -6 C-18 -14 -12 -20 0 -20 C12 -20 18 -14 16 -6 ${edge(1)} Q${n(8 + width / 2)} ${y + 4} 0 ${y + 2} Q${n(-8 - width / 2)} ${y + 4} ${n(-16 - width)} ${y} ${wave ? "" : ""} Z`, c) + `<path d="M-12 ${y - 6} Q-14 10 -16 0 M12 ${y - 6} Q14 10 16 0" ${thin(tone(c, 0.65), 0.9)}/>`;
  };
  switch (def.kind) {
    case "afro": {
      const mass = blob([[0, -8, 22], ...ring(0, -6, 23, 18, 150, 390, 18, 8)], c);
      return { behind: mass, front: blob([[-12, -12, 5], [-6, -15, 5.5], [0, -16, 5.5], [6, -15, 5.5], [12, -12, 5]], c) + tex };
    }
    case "tall":
      return { behind: "", front: cap() + shape(`M-12 ${top + 2} L-12 ${top - 12} Q-12 ${top - 15} -9 ${top - 15} L9 ${top - 15} Q12 ${top - 15} 12 ${top - 12} L12 ${top + 2} Z`, c) + tex };
    case "bun":
      return { behind: blob([[0, top - 6, 7], [-5, top - 4, 4.5], [5, top - 4, 4.5]], c), front: cap() + tex };
    case "puffs": {
      const puff = (x: number) => blob([[x, -15, 7.5], ...ring(x, -15, 7, 7, 0, 330, 30, 3.4)], c);
      const tie = (x: number) => `<rect x="${x - 2.4}" y="-13.6" width="4.8" height="3.2" rx="1.6" fill="${look.hatColor}" ${edge(INK, 0.8)}/>`;
      return { behind: puff(-17) + puff(17), front: cap() + partLine + tie(-12.6) + tie(12.6) + tex };
    }
    case "hang":
      return { behind: fall(def.hang ?? 30, def.tex === "waves" ? 6 : 3), front: cap() + partLine + tex + (def.tex === "strands" || def.tex === "waves" ? shape(`M-16.4 ${line + 6} Q-17.5 4 -15 12 L-13.2 4 Q-12.5 -3 -10 ${line + 1} Z`, c) + shape(`M16.4 ${line + 6} Q17.5 4 15 12 L13.2 4 Q12.5 -3 10 ${line + 1} Z`, c) : "") };
    case "ponytail":
      return { behind: "", front: cap(-1) + `<path d="M-14 ${line + 4} Q-8 -18 0 -19" ${thin(tone(c, 0.65), 0.9)}/>` + tex };
    case "bob": {
      const h = def.hang ?? 14;
      return {
        behind: shape(`M-18 ${h} Q-20 -4 -16 -12 Q-10 -21 0 -21 Q10 -21 16 -12 Q20 -4 18 ${h} Q12 ${h + 3} 8 ${h} L-8 ${h} Q-12 ${h + 3} -18 ${h} Z`, c),
        front: shape(`M-16 ${line + 10} Q-17 ${top + 2} 0 ${top} Q17 ${top + 2} 16 ${line + 10} Q10 ${line - 1} 2 ${line + 2} Q-8 ${line - 2} -16 ${line + 10} Z`, c) + tex,
      };
    }
    case "cap":
    default:
      return { behind: def.id === "twists" ? blob(ring(0, -9, 17, 14, 160, 380, 22, 3.2), c) : "", front: cap() + partLine + tex };
  }
}

/** Hair seen from behind. */
function hairBack(look: Look): string {
  const def = hairDef(look.hair);
  const c = look.hairColor;
  if (def.kind === "none") return `<ellipse cx="0" cy="-10" rx="6" ry="3" fill="#fff" opacity="0.2"/>`;
  const lift = def.lift ?? 2;
  const top = -19 - lift;
  const t = tone(c, 0.65);
  const back = shape(`M-16.4 4 C-18 ${top + 4} -10 ${top} 0 ${top} C10 ${top} 18 ${top + 4} 16.4 4 Q12 13 0 14 Q-12 13 -16.4 4 Z`, c);
  const hang = (len: number) => {
    const y = 6 + len;
    if (def.tex === "curls" || def.type === "coily") return blob([[0, 0, 19], ...[6, 14, 22, 30, 38, 46].filter((v) => v < y).flatMap((yy) => [[-12, yy, 9] as [number, number, number], [0, yy + 2, 9] as [number, number, number], [12, yy, 9] as [number, number, number]])], c);
    if (def.tex === "braids" || def.tex === "locs") {
      let s = back;
      for (const x of [-15, -10, -5, 0, 5, 10, 15]) s += `<rect x="${x - 2}" y="2" width="4" height="${y}" rx="2" fill="${c}" ${LINE}/>`;
      return s;
    }
    return shape(`M-17 -4 C-18 ${top + 4} -10 ${top} 0 ${top} C10 ${top} 18 ${top + 4} 17 -4 L${def.tex === "waves" ? 21 : 18.5} ${y} Q0 ${y + 5} ${def.tex === "waves" ? -21 : -18.5} ${y} Z`, c) + `<path d="M-6 0 Q-7 ${y / 2} -8 ${y - 2} M5 2 Q6 ${y / 2} 7 ${y - 2}" ${thin(t, 0.9)}/>`;
  };
  switch (def.kind) {
    case "afro":
      return blob([[0, -6, 22], ...ring(0, -4, 23, 18, 0, 345, 18, 8)], c);
    case "tall":
      return back + shape(`M-12 ${top + 2} L-12 ${top - 12} L12 ${top - 12} L12 ${top + 2} Z`, c);
    case "bun":
      return back + blob([[0, top - 5, 7]], c);
    case "puffs":
      return back + blob([[-17, -15, 7.5], [17, -15, 7.5]], c) + `<path d="M0 ${top} L0 10" ${thin(t, 1)}/>`;
    case "hang":
      return hang(def.hang ?? 30);
    case "ponytail":
      return back + shape(`M-3 -2 Q-6 14 -2 ${def.hang ?? 26} Q0 ${(def.hang ?? 26) + 4} 3 ${def.hang ?? 26} Q6 14 3 -2 Z`, c) + `<rect x="-2.6" y="-4" width="5.2" height="3.4" rx="1.6" fill="${look.hatColor}" ${edge(INK, 0.8)}/>`;
    case "bob":
      return shape(`M-18 ${def.hang ?? 14} Q-20 -4 -16 -12 Q-10 -21 0 -21 Q10 -21 16 -12 Q20 -4 18 ${def.hang ?? 14} Q0 ${(def.hang ?? 14) + 4} -18 ${def.hang ?? 14} Z`, c);
    case "cap":
    default:
      return back + (def.tex === "rows" ? [-9, -4.5, 0, 4.5, 9].map((x) => `<path d="M${x} ${top + 2} L${x} 12" ${thin(t, 1.4)} stroke-dasharray="1.6 1.2"/>`).join("") : def.id === "twists" ? blob(ring(0, -6, 16, 14, 180, 360, 20, 3), c) : "");
  }
}

/** Hair from the side (facing right): the back of the head and whatever hangs. */
function hairSide(look: Look): HairArt {
  const def = hairDef(look.hair);
  const c = look.hairColor;
  if (def.kind === "none") return { behind: "", front: `<ellipse cx="2" cy="-14" rx="5" ry="2.4" fill="#fff" opacity="0.22"/>` };
  const lift = def.lift ?? 2;
  const top = -19 - lift;
  const line = def.line ?? -11;
  const cap = shape(`M12 ${line} Q14 ${top + 4} 2 ${top} Q-14 ${top} -17 -6 Q-18 6 -12 12 Q-7 10 -6 4 Q-6 -5 0 ${line + 2} Q6 ${line - 1} 12 ${line} Z`, c);
  const tex = hairTex(def, c, "side");
  switch (def.kind) {
    case "afro":
      return { behind: blob([[-4, -8, 22], ...ring(-4, -6, 23, 18, 120, 420, 18, 8)], c), front: blob([[8, -14, 5.5], [13, -10, 4.5]], c) };
    case "tall":
      return { behind: "", front: cap + shape(`M-10 ${top + 2} L-10 ${top - 12} L10 ${top - 12} L10 ${top + 2} Z`, c) };
    case "bun":
      return { behind: blob([[-6, top - 5, 7]], c), front: cap + tex };
    case "puffs":
      return { behind: blob([[-10, -16, 7.5]], c), front: cap + `<rect x="-6.6" y="-15" width="4.8" height="3.2" rx="1.6" fill="${look.hatColor}" ${edge(INK, 0.8)}/>` };
    case "hang": {
      const y = 6 + (def.hang ?? 30);
      const lock =
        def.tex === "braids" || def.tex === "locs"
          ? [-14, -10, -6].map((x) => `<rect x="${x - 2}" y="-4" width="4" height="${y}" rx="2" fill="${c}" ${LINE}/>`).join("")
          : def.tex === "curls"
            ? blob([[-8, 0, 13], [-12, 14, 9], [-12, 26, 9], [-10, 36, 8]].filter(([, yy]) => yy! < y) as [number, number, number][], c)
            : shape(`M-2 -16 Q-17 -14 -18 0 L-16 ${y} Q-8 ${y + 3} -3 ${y - 2} L-4 6 Z`, c);
      return { behind: lock, front: cap + tex };
    }
    case "ponytail":
      return { behind: shape(`M-14 -8 Q-24 4 -20 ${def.hang ?? 26} Q-17 ${(def.hang ?? 26) + 3} -15 ${def.hang ?? 26} Q-17 6 -10 -6 Z`, c), front: cap };
    case "bob":
      return { behind: "", front: shape(`M12 ${line} Q14 ${top + 3} 2 ${top} Q-15 ${top} -18 -6 Q-19 6 -16 ${def.hang ?? 14} L-6 ${def.hang ?? 14} Q-6 0 0 ${line + 2} Q6 ${line - 1} 12 ${line} Z`, c) };
    case "cap":
    default:
      return { behind: def.id === "twists" ? blob(ring(-3, -8, 17, 14, 150, 330, 22, 3.2), c) : "", front: cap + tex };
  }
}

function hatArt(look: Look, view: "front" | "back" | "side"): string {
  const c = look.hatColor;
  const d = shadeOf(c);
  const side = view === "side";
  switch (look.hat) {
    case "cap":
      if (side) return shape("M-16 -6 Q-17 -24 0 -24 Q14 -24 15 -8 Z", c) + shape("M12 -10 Q24 -11 27 -6 Q24 -3 12 -5 Z", d);
      return shape("M-17 -6 Q-17 -25 0 -25 Q17 -25 17 -6 Z", c) + `<path d="M0 -25 L0 -7" ${thin(d, 1)}/>` + (view === "front" ? shape("M-15 -7 Q0 -12 15 -7 Q16 -3 12 -3 Q0 -7 -12 -3 Q-16 -3 -15 -7 Z", d) : `<path d="M-6 -6 Q0 -10 6 -6" fill="${d}" ${LINE}/>`);
    case "beanie":
      return shape(side ? "M-17 -4 Q-17 -27 -1 -27 Q15 -27 15 -6 Z" : "M-17 -4 Q-17 -27 0 -27 Q17 -27 17 -4 Z", c) + shape(side ? "M-17.5 -9 Q0 -13 15.5 -10 L15.5 -4 Q0 -7 -17.5 -2 Z" : "M-17.5 -9 Q0 -13 17.5 -9 L17.5 -2 Q0 -6 -17.5 -2 Z", d) + `<circle cx="${side ? -1 : 0}" cy="-28" r="3" fill="${d}" ${LINE}/>`;
    case "headband":
      return side ? `<path d="M10 -12 Q0 -22 -14 -12" ${thin(INK, 5)}/><path d="M10 -12 Q0 -22 -14 -12" ${thin(c, 3)}/>` : `<path d="M-15.5 -9 Q0 -24 15.5 -9" ${thin(INK, 5)}/><path d="M-15.5 -9 Q0 -24 15.5 -9" ${thin(c, 3)}/>` + (view === "front" ? shape("M6 -17 L0 -22 Q-1 -18 0 -14 Z", c) + shape("M7 -17 L13 -23 Q15 -18 13 -13 Z", c) + `<circle cx="6.5" cy="-17.2" r="2" fill="${d}" ${LINE}/>` : "");
    case "bucket":
      return shape(side ? "M-15 -8 Q-15 -26 -1 -26 Q13 -26 13 -8 Z" : "M-14 -8 Q-14 -26 0 -26 Q14 -26 14 -8 Z", c) + shape(side ? "M-21 -9 Q0 -14 21 -9 Q22 -4 18 -4 Q0 -8 -18 -4 Q-22 -4 -21 -9 Z" : "M-22 -8 Q0 -14 22 -8 Q23 -3 19 -3 Q0 -7 -19 -3 Q-23 -3 -22 -8 Z", d);
    case "kufi":
      return shape(side ? "M-15 -10 Q-15 -26 -1 -26 Q13 -26 13 -10 Z" : "M-15 -10 Q-15 -26 0 -26 Q15 -26 15 -10 Z", c) + `<path d="${side ? "M-13 -14 L11 -14 M-10 -19 L8 -19" : "M-13 -14 L13 -14 M-10 -19 L10 -19"}" ${thin(GOLD, 1)}/>`;
    case "gele":
      return blob(side ? [[-4, -24, 11], [-14, -18, 8], [6, -22, 8], [-6, -32, 7]] : [[0, -25, 12], [-13, -20, 8], [13, -20, 8], [-6, -33, 7], [7, -32, 6]], c) + `<path d="${side ? "M-14 -18 Q-4 -30 8 -22" : "M-12 -18 Q0 -32 12 -18 M-6 -28 Q2 -20 8 -30"}" ${thin(d, 1.4)}/>`;
    default:
      return "";
  }
}

function headphonesArt(look: Look, view: "front" | "back" | "side"): string {
  if (!look.headphones) return "";
  if (view === "side") return `<path d="M-1 0 Q-2 -26 6 -20" ${thin(INK, 4)}/><path d="M-1 0 Q-2 -26 6 -20" ${thin("#9aa0a6", 2.4)}/><rect x="-6" y="-4" width="9" height="12" rx="4" fill="#2e2e33" ${LINE}/>`;
  return `<path d="M-17 2 Q-18 -27 0 -27 Q18 -27 17 2" ${thin(INK, 4)}/><path d="M-17 2 Q-18 -27 0 -27 Q18 -27 17 2" ${thin("#9aa0a6", 2.4)}/><rect x="-21" y="-4" width="7" height="12" rx="3.5" fill="#2e2e33" ${LINE}/><rect x="14" y="-4" width="7" height="12" rx="3.5" fill="#2e2e33" ${LINE}/>`;
}

/** The whole head in one view, split into what goes behind the body and what goes on top. */
function headArt(look: Look, view: View, grown: boolean): HairArt {
  const shadow = tone(look.skin, 0.86);
  const covers = look.hat === "beanie" || look.hat === "bucket" || look.hat === "kufi" || look.hat === "gele";
  if (view === "back") {
    return { behind: "", front: earsFront(look) + `<path d="${facePath(look.faceShape)}" fill="${look.skin}" ${LINE}/>` + hairBack(look) + hatArt(look, "back") + headphonesArt(look, "back") };
  }
  if (view === "side") {
    const hair = hairSide(look);
    const face =
      `<path d="${profilePath(look.faceShape)}" fill="${look.skin}" ${LINE}/>` +
      `<path d="M14.5 -6 L15 -1" ${thin(shadow, 0.8)}/>` +
      // Eye, brow, nostril, lips.
      `<path d="M6.4 -1.2 Q9 -3 11.2 -1.2 Q9 0.8 6.4 -1.2 Z" fill="#fbf7f2"/><circle cx="9.6" cy="-1.1" r="1.3" fill="#3a2214"/><path d="M6.2 -1 Q9 -3.4 11.4 -1.4" ${thin(INK, 1.2)}/>` +
      (look.lashes ? `<path d="M11.2 -1.6 l1.4 -1.2" ${thin(INK, 0.9)}/>` : "") +
      `<path d="M5.8 -6 Q9.4 -8 12.6 -6.4" ${thin(tone(look.hairColor === HAIR_COLORS[0] ? "#2a1810" : look.hairColor, 0.8), look.brows === "thick" ? 2 : 1.4)}/>` +
      `<path d="M15.8 6.4 Q17 7.4 16 8" ${thin(tone(look.skin, 0.66), 1)}/>` +
      `<path d="M14.6 11 L16 12 L14.8 12.6" fill="${tone(look.skin, look.build === "fem" ? 0.62 : 0.7)}" ${edge(tone(look.skin, 0.6), 0.8)}/>` +
      `<ellipse cx="-3.5" cy="1.5" rx="2.4" ry="3.6" fill="${look.skin}" stroke="${INK}" stroke-width="1.4"/><path d="M-3.2 0.2 q-1 1.4 0 2.6" ${thin(tone(look.skin, 0.75), 0.8)}/>`;
    const beard =
      grown && look.beard !== "none"
        ? `<path d="M-3 6 Q-2 17 4 19 Q12 19 14.5 13 L15 10.6 Q11 11 9 13 Q4 13 1 6 Z" fill="${look.hairColor}"${look.beard === "stubble" ? ' opacity="0.3"' : ""}/>` + (look.beard === "mustache" || look.beard === "goatee" ? `<path d="M11.8 9.4 Q14.6 9 16 10.4" ${thin(look.hairColor, 1.6)}/>` : "")
        : "";
    const ear = look.earrings !== "none" && grown ? (look.earrings === "hoops" ? `<circle cx="-2" cy="7.8" r="2.4" fill="none" stroke="${GOLD}" stroke-width="1.1"/>` : `<circle cx="-2" cy="6" r="1.1" fill="${GOLD}"/>`) : "";
    const specs = look.specs ? `<rect x="6" y="-4" width="7" height="6" rx="2.2" fill="#fff" fill-opacity="0.2" ${edge(INK, 1.1)}/><path d="M6 -2 L-1 -2" ${thin(INK, 1)}/>` : "";
    const shades = look.glasses ? `<path d="M6 -3.4 L13.6 -3.4 L13 2 Q9.4 3.6 6.4 2 Z" fill="#18181b" ${edge(INK, 1.1)}/><path d="M6 -2.4 L-1 -2.4" ${thin(INK, 1)}/>` : "";
    return { behind: hair.behind, front: face + beard + (covers ? "" : hair.front) + ear + hatArt(look, "side") + headphonesArt(look, "side") + specs + shades };
  }
  const hair = hairFront(look);
  const face =
    earsFront(look) +
    `<path d="${facePath(look.faceShape)}" fill="${look.skin}" ${LINE}/>` +
    // A soft shadow down one side of the face.
    `<path d="M9 -15 C14 -10 15.6 -3 15 3 C14 10 10 16 4 18.4 C11 12 13 3 9 -15 Z" fill="${shadow}" opacity="0.7"/>` +
    eyesFront(look) +
    browsFront(look) +
    noseFront(look) +
    mouthFront(look) +
    (grown ? beardFront(look) + jewelleryFront(look) : "");
  return { behind: hair.behind, front: face + (covers ? "" : hair.front) + hatArt(look, "front") + headphonesArt(look, "front") + glassesFront(look) };
}

// ── Bodies ──────────────────────────────────────────────────────────────────

/** Where everything sits on a body, in drawing units. The figure is 120 wide; feet are at hipY + legLen. */
type Frame = {
  stage: LifeStage;
  /** Head centre and scale (heads are drawn at 1 = a grown-up head). */
  hx: number;
  hy: number;
  hk: number;
  /** Shoulder line and half-width; waist; hem of a normal top. */
  sy: number;
  sh: number;
  neck: number;
  waistY: number;
  waist: number;
  hemY: number;
  hip: number;
  /** Where the legs hang from, how far apart, how long and how wide. */
  hipY: number;
  legX: number;
  legLen: number;
  legW: number;
  armLen: number;
  armW: number;
  hand: number;
};

const FRAMES: Record<string, Frame> = {
  // Proportions after the game's style guide: a slightly larger head (about a sixth of the height), slim tapered limbs.
  "adult-masc": { stage: "adult", hx: 60, hy: 26.5, hk: 1.2, sy: 61, sh: 31.9, neck: 6.8, waistY: 112, waist: 25.3, hemY: 152, hip: 26.4, hipY: 145, legX: 11.6, legLen: 150, legW: 22.6, armLen: 98, armW: 15.4, hand: 6.8 },
  "adult-fem": { stage: "adult", hx: 60, hy: 27.5, hk: 1.15, sy: 61, sh: 25.3, neck: 5.5, waistY: 108, waist: 18.2, hemY: 144, hip: 27.5, hipY: 140, legX: 10.5, legLen: 150, legW: 19.8, armLen: 92, armW: 12.1, hand: 5.7 },
  "teen-masc": { stage: "teen", hx: 60, hy: 25.5, hk: 1.22, sy: 60, sh: 27.5, neck: 6.2, waistY: 106, waist: 22.6, hemY: 140, hip: 24.2, hipY: 134, legX: 10.5, legLen: 132, legW: 20.4, armLen: 88, armW: 13.2, hand: 5.9 },
  "teen-fem": { stage: "teen", hx: 60, hy: 26.5, hk: 1.17, sy: 60, sh: 23.1, neck: 5.3, waistY: 104, waist: 17.6, hemY: 134, hip: 24.2, hipY: 130, legX: 9.9, legLen: 132, legW: 18.2, armLen: 84, armW: 11.6, hand: 5.3 },
  child: { stage: "child", hx: 60, hy: 29, hk: 1.36, sy: 64, sh: 22.0, neck: 5.3, waistY: 96, waist: 20.9, hemY: 118, hip: 22.0, hipY: 112, legX: 9.4, legLen: 80, legW: 18.2, armLen: 58, armW: 12.1, hand: 5.5 },
};

export function frameFor(look: Look, body: Body): Frame {
  const stage = stageFrom(body);
  if (stage === "child") return FRAMES.child!;
  if (stage === "teen") return FRAMES[`teen-${look.build}`]!;
  return { ...FRAMES[`adult-${look.build}`]!, stage };
}

const grownUp = (f: Frame) => f.stage !== "child";

/** How far a top reaches: kaftans and dresses go past the hips. */
function topBottom(look: Look, f: Frame): number {
  if (look.top === "dress") return n(f.hipY + f.legLen * 0.42);
  if (look.top === "kaftan") return n(f.hipY + f.legLen * 0.3);
  if (look.top === "tank" && look.build === "fem" && grownUp(f)) return f.waistY - 2;
  if (look.top === "puffer") return f.hemY - 4;
  return f.hemY;
}

/** The bottom half's waist piece, under the top: hips and seat, so legs join cleanly. */
function pelvis(look: Look, f: Frame, view: View): string {
  const c = look.bottomColor;
  const d = shadeOf(c);
  const w = view === "side" ? f.hip * 0.62 : f.hip;
  const y0 = f.waistY - 4;
  const y1 = f.hipY + 10;
  if (look.top === "dress") return "";
  if (look.bottom === "skirt") {
    const len = f.hipY + f.legLen * (grownUp(f) ? 0.36 : 0.32);
    const flare = w + 8;
    return shape(`M${n(60 - w)} ${y0} L${n(60 + w)} ${y0} L${n(60 + flare)} ${n(len)} Q60 ${n(len + 4)} ${n(60 - flare)} ${n(len)} Z`, c) + `<path d="M${n(60 + w - 4)} ${y0 + 4} L${n(60 + flare - 4)} ${n(len - 2)}" ${thin(d, 3)}/>` + `<path d="M${n(60 - 6)} ${y0 + 6} L${n(60 - 9)} ${n(len - 2)} M${n(60 + 6)} ${y0 + 6} L${n(60 + 9)} ${n(len - 2)}" ${thin(d, 1)}/>`;
  }
  let out = shape(`M${n(60 - w)} ${y0} L${n(60 + w)} ${y0} L${n(60 + w + 1)} ${y1} L${n(60 - w - 1)} ${y1} Z`, c);
  out += flat(`M${n(60 + w - 6)} ${y0 + 2} L${n(60 + w - 1)} ${y0 + 2} L${n(60 + w)} ${y1 - 2} L${n(60 + w - 6)} ${y1 - 2} Z`, d);
  if (view !== "side") out += `<path d="M60 ${y0 + 3} L60 ${y1 - 4}" ${thin(d, 1)}/>`;
  if (look.bottom === "overalls") {
    // A bib and straps over the top.
    const by = f.sy + 18;
    if (view !== "side") out += shape(`M${60 - 11} ${by} L${60 + 11} ${by} L${60 + 13} ${y0 + 4} L${60 - 13} ${y0 + 4} Z`, c) + `<rect x="${60 - 5}" y="${by + 6}" width="10" height="7" rx="1.5" fill="${d}" ${edge(INK, 1)}/>`;
    out += `<path d="M${60 - (view === "side" ? 3 : 10)} ${by} L${60 - (view === "side" ? 6 : 14)} ${f.sy}" ${thin(c, 3.2)}/>` + (view === "side" ? "" : `<path d="M${60 + 10} ${by} L${60 + 14} ${f.sy}" ${thin(c, 3.2)}/><circle cx="${60 - 10}" cy="${by + 1}" r="1.4" fill="${GOLD}"/><circle cx="${60 + 10}" cy="${by + 1}" r="1.4" fill="${GOLD}"/>`);
  }
  return out;
}

/** The top: shirt, hoodie, dress… seen from the front, back or side. */
function topArt(look: Look, f: Frame, view: View): string {
  const c = look.topColor;
  const d = shadeOf(c);
  const hi = tone(c, 1.18);
  const style = look.top;
  const bottom = topBottom(look, f);
  const side = view === "side";
  const puff = style === "puffer" ? 3 : 0;
  const sh = (side ? f.sh * 0.55 : f.sh) + puff;
  const wa = (side ? f.waist * 0.62 : f.waist) + puff;
  const hm = (side ? f.hip * 0.66 : style === "dress" || style === "kaftan" ? f.hip + 6 : f.hip) + puff;
  const top = f.sy;
  const bare = style === "tank";
  const neckW = f.neck;
  // Neck and the skin of the chest, under every top.
  let out = shape(`M${n(60 - neckW)} ${n(f.hy + 14 * f.hk)} L${n(60 + neckW)} ${n(f.hy + 14 * f.hk)} L${n(60 + neckW + 1)} ${top + 4} L${n(60 - neckW - 1)} ${top + 4} Z`, look.skin);
  out += flat(`M${n(60 - neckW)} ${n(f.hy + 16 * f.hk)} L${n(60 + neckW)} ${n(f.hy + 16 * f.hk)} L${n(60 + neckW)} ${n(f.hy + 20 * f.hk)} Q60 ${n(f.hy + 23 * f.hk)} ${n(60 - neckW)} ${n(f.hy + 20 * f.hk)} Z`, tone(look.skin, 0.8));
  const torso = `M${n(60 - sh)} ${top + 2} Q60 ${top - 4} ${n(60 + sh)} ${top + 2} Q${n(60 + sh + 1)} ${top + 16} ${n(60 + wa)} ${f.waistY} L${n(60 + hm)} ${bottom} Q60 ${bottom + 3} ${n(60 - hm)} ${bottom} L${n(60 - wa)} ${f.waistY} Q${n(60 - sh - 1)} ${top + 16} ${n(60 - sh)} ${top + 2} Z`;
  if (bare) {
    // A tank top: skin shoulders, straps and a scoop neck.
    out += shape(torso, look.skin);
    const st = n(sh * 0.55);
    out += shape(`M${n(60 - st - 4)} ${top - 1} L${n(60 - st + 1)} ${top - 1} Q60 ${top + 12} ${n(60 + st - 1)} ${top - 1} L${n(60 + st + 4)} ${top - 1} L${n(60 + wa + 0.5)} ${f.waistY} L${n(60 + hm)} ${bottom} Q60 ${bottom + 3} ${n(60 - hm)} ${bottom} L${n(60 - wa - 0.5)} ${f.waistY} Z`, c);
    if (view === "back") out += flat(`M${n(60 - st)} ${top + 2} Q60 ${top + 6} ${n(60 + st)} ${top + 2} L${n(60 + st)} ${top} L${n(60 - st)} ${top} Z`, c);
    out += flat(`M${n(60 + wa - 5)} ${f.waistY - 20} L${n(60 + wa)} ${f.waistY} L${n(60 + hm)} ${bottom} L${n(60 + hm - 5)} ${bottom} Z`, d);
    return out;
  }
  out += shape(torso, c);
  // Cel shade down one side, light catching the other.
  out += flat(`M${n(60 + sh - 6)} ${top + 6} Q${n(60 + sh)} ${top + 16} ${n(60 + wa)} ${f.waistY} L${n(60 + hm)} ${bottom - 1} L${n(60 + hm - 7)} ${bottom - 1} L${n(60 + wa - 6)} ${f.waistY} Z`, d);
  out += `<path d="M${n(60 - sh + 3)} ${top + 6} Q${n(60 - sh + 1)} ${top + 16} ${n(60 - wa + 2)} ${f.waistY} L${n(60 - hm + 2)} ${bottom - 3} L${n(60 - hm + 6)} ${bottom - 3} L${n(60 - wa + 6)} ${f.waistY} Q${n(60 - sh + 5)} ${top + 16} ${n(60 - sh + 7)} ${top + 6} Z" fill="${hi}" opacity="0.55"/>`;
  out += `<path d="M${n(60 - sh + 4)} ${top + 2} Q60 ${top - 2} ${n(60 + sh - 4)} ${top + 2}" fill="none" stroke="${hi}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
  if (side) {
    if (style === "hoodie" || style === "ziphoodie") out += shape(`M${n(60 - sh - 3)} ${top - 2} Q${n(60 - sh - 7)} ${top + 12} ${n(60 - sh + 4)} ${top + 12} Q${n(60 - sh + 6)} ${top + 2} ${n(60 - sh + 2)} ${top - 3} Z`, d);
    if (style === "kaftan") out += `<path d="M${n(60 + sh - 3)} ${top + 4} L${n(60 + hm - 2)} ${bottom - 6}" ${thin(GOLD, 1.4)}/>`;
    if (style === "puffer") out += [0.3, 0.55, 0.8].map((t) => `<path d="M${n(60 - sh)} ${n(top + (bottom - top) * t)} Q60 ${n(top + (bottom - top) * t + 2)} ${n(60 + sh)} ${n(top + (bottom - top) * t)}" ${thin(d, 1.2)}/>`).join("");
    if (look.chain && grownUp(f)) out += `<path d="M${n(60 + 3)} ${top} Q${n(60 + 6)} ${top + 10} ${n(60 + 4)} ${top + 14}" ${thin(GOLD, 1.3)}/>`;
    return out;
  }
  const front = view === "front";
  const Y = (t: number) => n(top + (bottom - top) * t);
  switch (style) {
    case "hoodie":
      out += front
        ? shape(`M${n(60 - neckW - 6)} ${top - 1} Q60 ${top + 10} ${n(60 + neckW + 6)} ${top - 1} Q${n(60 + neckW + 3)} ${top + 4} 60 ${top + 5} Q${n(60 - neckW - 3)} ${top + 4} ${n(60 - neckW - 6)} ${top - 1} Z`, d) +
          `<path d="M${60 - 3} ${top + 5} L${60 - 4} ${top + 18} M${60 + 3} ${top + 5} L${60 + 4} ${top + 18}" ${thin("#f4f1ea", 1.3)}/>` +
          shape(`M${n(60 - wa + 5)} ${Y(0.62)} L${n(60 + wa - 5)} ${Y(0.62)} L${n(60 + wa - 2)} ${Y(0.88)} L${n(60 - wa + 2)} ${Y(0.88)} Z`, d)
        : shape(`M${n(60 - 14)} ${top - 2} Q60 ${top - 6} ${n(60 + 14)} ${top - 2} Q${n(60 + 15)} ${top + 18} 60 ${top + 22} Q${n(60 - 15)} ${top + 18} ${n(60 - 14)} ${top - 2} Z`, d);
      out += `<path d="M${n(60 - hm + 1)} ${bottom - 5} L${n(60 + hm - 1)} ${bottom - 5}" ${thin(d, 1.4)}/>`;
      break;
    case "ziphoodie":
      if (front) {
        // Open at the front over a white tee, like the sheet.
        out += flat(`M${n(60 - 8)} ${top + 2} L${n(60 + 8)} ${top + 2} L${n(60 + 9)} ${bottom} L${n(60 - 9)} ${bottom} Z`, "#f4f1ea");
        out += `<path d="M${n(60 - 6)} ${top + 1} Q60 ${top + 6} ${n(60 + 6)} ${top + 1}" ${thin(tone("#f4f1ea", 0.8), 1.2)}/>`;
        out += `<path d="M${n(60 - 8)} ${top + 2} L${n(60 - 9)} ${bottom} M${n(60 + 8)} ${top + 2} L${n(60 + 9)} ${bottom}" ${thin(INK, 2)}/>`;
        out += `<path d="M${n(60 - 8.6)} ${top + 4} L${n(60 - 9.4)} ${bottom - 2} M${n(60 + 8.6)} ${top + 4} L${n(60 + 9.4)} ${bottom - 2}" ${thin("#9ca3af", 0.9)} stroke-dasharray="1.2 1.2"/>`;
        out += shape(`M${n(60 - neckW - 7)} ${top - 1} Q${n(60 - neckW - 2)} ${top + 6} ${n(60 - 8)} ${top + 5} L${n(60 - 7)} ${top - 2} Z`, d) + shape(`M${n(60 + neckW + 7)} ${top - 1} Q${n(60 + neckW + 2)} ${top + 6} ${n(60 + 8)} ${top + 5} L${n(60 + 7)} ${top - 2} Z`, d);
        out += `<path d="M${n(60 - wa + 3)} ${Y(0.7)} L${n(60 - 12)} ${Y(0.72)} M${n(60 + wa - 3)} ${Y(0.7)} L${n(60 + 12)} ${Y(0.72)}" ${thin(d, 1.4)}/>`;
      } else out += shape(`M${n(60 - 14)} ${top - 2} Q60 ${top - 6} ${n(60 + 14)} ${top - 2} Q${n(60 + 15)} ${top + 18} 60 ${top + 22} Q${n(60 - 15)} ${top + 18} ${n(60 - 14)} ${top - 2} Z`, d);
      out += `<path d="M${n(60 - hm + 1)} ${bottom - 5} L${n(60 + hm - 1)} ${bottom - 5}" ${thin(d, 1.4)}/>`;
      break;
    case "tee":
      if (front) out += `<path d="M${n(60 - neckW - 2)} ${top} Q60 ${top + 8} ${n(60 + neckW + 2)} ${top}" ${thin(d, 1.6)}/>`;
      break;
    case "shirt":
      if (front)
        out +=
          shape(`M${n(60 - neckW - 4)} ${top - 1} L60 ${top + 8} L${n(60 - neckW + 1)} ${top + 9} Z`, hi) +
          shape(`M${n(60 + neckW + 4)} ${top - 1} L60 ${top + 8} L${n(60 + neckW - 1)} ${top + 9} Z`, hi) +
          `<path d="M60 ${top + 8} L60 ${bottom - 2}" ${thin(d, 1.2)}/>` +
          [0.3, 0.5, 0.7].map((t) => `<circle cx="61.6" cy="${Y(t)}" r="0.9" fill="${d}"/>`).join("") +
          `<rect x="${n(60 + sh * 0.35)}" y="${Y(0.18)}" width="8" height="7" rx="1" fill="none" ${edge(d, 1)}/>`;
      break;
    case "jacket":
      out += `<path d="M60 ${top + 4} L60 ${bottom - 1}" ${thin(INK, 1.6)}/>`;
      if (front) out += `<path d="M${n(60 - neckW - 4)} ${top} L60 ${top + 4} L${n(60 + neckW + 4)} ${top}" ${thin(hi, 2.4)}/>`;
      out += `<path d="M${n(60 - sh + 2)} ${top + 4} L${n(60 - hm + 1)} ${bottom - 3} M${n(60 + sh - 2)} ${top + 4} L${n(60 + hm - 1)} ${bottom - 3}" ${thin("#ffffff", 1.6)} opacity="0.85"/>`;
      break;
    case "puffer":
      out += [0.25, 0.47, 0.69].map((t) => `<path d="M${n(60 - sh)} ${Y(t)} Q60 ${Y(t) + 2.5} ${n(60 + sh)} ${Y(t)}" ${thin(d, 1.4)}/>`).join("");
      out += shape(`M${n(60 - neckW - 5)} ${top - 4} L${n(60 + neckW + 5)} ${top - 4} L${n(60 + neckW + 6)} ${top + 4} L${n(60 - neckW - 6)} ${top + 4} Z`, c) + (front ? `<path d="M60 ${top - 4} L60 ${bottom}" ${thin(d, 1.4)}/>` : "");
      break;
    case "sweater":
      out += `<path d="M${n(60 - hm + 1)} ${bottom - 5} L${n(60 + hm - 1)} ${bottom - 5}" ${thin(d, 2.2)}/>` + (front ? `<path d="M${n(60 - neckW - 2)} ${top} Q60 ${top + 7} ${n(60 + neckW + 2)} ${top}" ${thin(d, 2.6)}/>` : "");
      break;
    case "blazer":
      if (front) {
        out += flat(`M${n(60 - 8)} ${top + 1} L${n(60 + 8)} ${top + 1} L60 ${Y(0.5)} Z`, "#f4f1ea");
        out += `<path d="M${n(60 - 8)} ${top + 1} L60 ${Y(0.5)} L${n(60 + 8)} ${top + 1}" ${thin(INK, 1.4)}/>`;
        out += shape(`M${n(60 - 8)} ${top + 1} L${n(60 - 13)} ${top + 4} L${n(60 - 6)} ${Y(0.3)} Z`, d) + shape(`M${n(60 + 8)} ${top + 1} L${n(60 + 13)} ${top + 4} L${n(60 + 6)} ${Y(0.3)} Z`, d);
        out += `<path d="M60 ${Y(0.5)} L60 ${bottom - 1}" ${thin(INK, 1.2)}/><circle cx="61.6" cy="${Y(0.62)}" r="1" fill="${INK}"/>`;
      }
      break;
    case "kaftan":
      if (front) out += `<path d="M${n(60 - neckW - 3)} ${top} Q60 ${top + 9} ${n(60 + neckW + 3)} ${top} M60 ${top + 6} L60 ${Y(0.35)}" ${thin(GOLD, 1.6)}/><path d="M${n(60 - 5)} ${top + 10} l5 3 l5 -3 M${n(60 - 5)} ${top + 16} l5 3 l5 -3" ${thin(GOLD, 1)}/>`;
      out += `<path d="M${n(60 - hm + 2)} ${bottom - 4} L${n(60 + hm - 2)} ${bottom - 4}" ${thin(GOLD, 1.2)}/>`;
      break;
    case "dress":
      out += `<path d="M${n(60 - wa)} ${f.waistY} Q60 ${f.waistY + 3} ${n(60 + wa)} ${f.waistY}" ${thin(d, 1.6)}/>` + [-0.5, 0, 0.5].map((k) => `<path d="M${n(60 + wa * k)} ${f.waistY + 4} L${n(60 + hm * k * 1.2)} ${bottom - 3}" ${thin(d, 1)}/>`).join("");
      if (front) out += `<path d="M${n(60 - neckW - 3)} ${top} Q60 ${top + 9} ${n(60 + neckW + 3)} ${top}" ${thin(d, 1.4)}/>`;
      break;
  }
  if (front && look.chain && grownUp(f)) out += `<path d="M${n(60 - neckW - 1)} ${top + 1} Q60 ${top + 14} ${n(60 + neckW + 1)} ${top + 1}" ${thin(GOLD, 1.4)}/><circle cx="60" cy="${top + 9}" r="1.8" fill="${GOLD}"/>`;
  return out;
}

/** Bags: straps in front, the bag itself behind (or on the back from behind). */
function bagArt(look: Look, f: Frame, view: View, layer: "behind" | "front"): string {
  if (!look.bag) return "";
  const c = look.bagColor;
  const d = shadeOf(c);
  const y = f.sy + 4;
  if (look.bagStyle === "crossbody") {
    if (layer === "behind" && view !== "back") return "";
    const strap = view === "side" ? `<path d="M${60 - 4} ${y - 2} L${60 + 6} ${f.waistY}" ${thin(INK, 3)}/><path d="M${60 - 4} ${y - 2} L${60 + 6} ${f.waistY}" ${thin(d, 1.8)}/>` : `<path d="M${n(60 - f.sh + 6)} ${y - 3} L${n(60 + f.waist - 2)} ${f.waistY + 2}" ${thin(INK, 3)}/><path d="M${n(60 - f.sh + 6)} ${y - 3} L${n(60 + f.waist - 2)} ${f.waistY + 2}" ${thin(d, 1.8)}/>`;
    const bx = view === "side" ? 60 + 2 : 60 + f.waist - 6;
    return strap + `<rect x="${n(bx)}" y="${f.waistY - 2}" width="14" height="10" rx="2.5" fill="${c}" ${LINE}/>`;
  }
  if (look.bagStyle === "tote") {
    if (layer !== "front" || view === "back") return "";
    const bx = view === "side" ? 60 - 6 : 60 + f.sh - 2;
    return `<path d="M${n(bx + 2)} ${y + 2} L${n(bx + 4)} ${f.waistY}" ${thin(c, 2)}/>` + `<rect x="${n(bx - 2)}" y="${f.waistY - 4}" width="16" height="18" rx="2" fill="${c}" ${LINE}/>`;
  }
  // Backpack.
  const bw = f.sh * 1.25;
  const bh = (f.hemY - f.sy) * 0.62;
  if (view === "back") return layer === "front" ? `<rect x="${n(60 - bw / 2)}" y="${y + 2}" width="${n(bw)}" height="${n(bh)}" rx="7" fill="${c}" ${LINE}/><rect x="${n(60 - bw / 3)}" y="${n(y + bh * 0.5)}" width="${n((bw * 2) / 3)}" height="${n(bh * 0.4)}" rx="4" fill="${d}" ${LINE}/>` : "";
  if (view === "side") return layer === "front" ? `<rect x="${n(60 - f.sh * 0.55 - 14)}" y="${y + 2}" width="16" height="${n(bh)}" rx="6" fill="${c}" ${LINE}/><path d="M${n(60 - f.sh * 0.3)} ${y} L${n(60 - f.sh * 0.1)} ${n(y + bh * 0.8)}" ${thin(d, 2.4)}/>` : "";
  return layer === "front" ? `<path d="M${n(60 - f.sh + 7)} ${y - 2} L${n(60 - f.sh + 9)} ${n(y + bh * 0.85)} M${n(60 + f.sh - 7)} ${y - 2} L${n(60 + f.sh - 9)} ${n(y + bh * 0.85)}" ${thin(INK, 3.4)}/><path d="M${n(60 - f.sh + 7)} ${y - 2} L${n(60 - f.sh + 9)} ${n(y + bh * 0.85)} M${n(60 + f.sh - 7)} ${y - 2} L${n(60 + f.sh - 9)} ${n(y + bh * 0.85)}" ${thin(c, 2)}/>` : "";
}

// ── Arms (one arm hanging from the shoulder; the world mirrors it) ─────────

export const ARM_BOX = 30;

function armInner(look: Look, f: Frame): string {
  const top = (TOPS as readonly { id: string; sleeve: string }[]).find((t) => t.id === look.top);
  const sleeve = top?.sleeve ?? "long";
  const c = look.topColor;
  const d = shadeOf(c);
  const w = f.armW + (sleeve === "puffy" ? 3 : sleeve === "wide" ? 5 : 0);
  const L = f.armLen;
  const cx = ARM_BOX / 2;
  const handY = L - f.hand;
  const arm = (from: number, to: number, fill: string, width: number, taper = 1.5) =>
    shape(`M${n(cx - width / 2)} ${from} Q${n(cx - width / 2 - 1)} ${n((from + to) / 2)} ${n(cx - width / 2 + taper)} ${to} L${n(cx + width / 2 - taper)} ${to} Q${n(cx + width / 2 + 1)} ${n((from + to) / 2)} ${n(cx + width / 2)} ${from} Q${cx} ${from - 4} ${n(cx - width / 2)} ${from} Z`, fill);
  let out = "";
  const skinTo = handY - f.hand * 0.6;
  if (sleeve === "none") out += arm(0, skinTo, look.skin, f.armW - 2);
  else if (sleeve === "short") {
    out += arm(0, skinTo, look.skin, f.armW - 2.5);
    out += arm(0, n(L * 0.32), c, w + 1, 0) + `<path d="M${n(cx - w / 2 - 0.5)} ${n(L * 0.32 - 3)} L${n(cx + w / 2 + 0.5)} ${n(L * 0.32 - 3)}" ${thin(d, 1)}/>`;
  } else {
    out += arm(0, skinTo, c, w, sleeve === "wide" ? -2 : 1.5);
    out += flat(`M${n(cx + w / 2 - 4)} 4 L${n(cx + w / 2)} 6 L${n(cx + w / 2 - (sleeve === "wide" ? -2 : 1.5))} ${n(skinTo - 1)} L${n(cx + w / 2 - 5)} ${n(skinTo - 1)} Z`, d);
    const cuff = look.top === "blazer" ? "#f4f1ea" : look.top === "kaftan" ? GOLD : d;
    out += shape(`M${n(cx - w / 2 + 1)} ${n(skinTo - 5)} L${n(cx + w / 2 - 1)} ${n(skinTo - 5)} L${n(cx + w / 2 - 1.5)} ${n(skinTo)} L${n(cx - w / 2 + 1.5)} ${n(skinTo)} Z`, cuff);
    if (sleeve === "puffy") out += [0.33, 0.62].map((t) => `<path d="M${n(cx - w / 2)} ${n(L * t)} Q${cx} ${n(L * t + 2)} ${n(cx + w / 2)} ${n(L * t)}" ${thin(d, 1.1)}/>`).join("");
    if (look.top === "jacket") out += `<path d="M${n(cx + w / 2 - 3)} 4 L${n(cx + w / 2 - 3)} ${n(skinTo - 6)}" ${thin("#ffffff", 1.4)}/>`;
  }
  // Hand.
  out += `<ellipse cx="${cx}" cy="${n(handY)}" rx="${n(f.hand * 0.82)}" ry="${n(f.hand)}" fill="${look.skin}" ${LINE}/>`;
  if (look.watch && grownUp(f)) out += `<rect x="${n(cx - f.armW / 2 + 1)}" y="${n(skinTo - 2.5)}" width="${n(f.armW - 2)}" height="3.4" rx="1.2" fill="#1f2937" stroke="${INK}" stroke-width="0.6"/>`;
  if (look.tattoos && grownUp(f) && (sleeve === "none" || sleeve === "short")) out += `<path d="M${cx - 2} ${n(L * 0.5)} q3 3 0 6 q-3 3 0 6" ${thin("#2a3b4d", 1)}/>`;
  return out;
}

// ── Legs (one leg from the hip; the world mirrors it) ──────────────────────

export const LEG_BOX = 40;

function legInner(look: Look, f: Frame, view: "front" | "side"): string {
  const cx = LEG_BOX / 2;
  const L = f.legLen;
  const shoeH = grownUp(f) ? 13 : 10;
  const ankle = L - shoeH;
  const c = look.bottomColor;
  const d = shadeOf(c);
  const baggy = look.bottom === "cargo" || look.bottom === "jeans" ? 3 : 0;
  const w = f.legW + baggy;
  const skinW = f.legW * 0.62;
  let out = "";
  const column = (from: number, to: number, fill: string, wTop: number, wBot: number) => shape(`M${n(cx - wTop / 2)} ${from} L${n(cx + wTop / 2)} ${from} L${n(cx + wBot / 2)} ${to} L${n(cx - wBot / 2)} ${to} Z`, fill);
  const dressLike = look.top === "dress" || look.bottom === "skirt";
  if (dressLike || look.bottom === "shorts") {
    const knee = look.bottom === "shorts" ? n(L * 0.36) : 0;
    out += column(0, ankle + 2, look.skin, skinW + 2, skinW - 1);
    out += flat(`M${n(cx + skinW / 2 - 2)} 0 L${n(cx + skinW / 2 + 1)} 0 L${n(cx + skinW / 2 - 0.5)} ${ankle} L${n(cx + skinW / 2 - 3)} ${ankle} Z`, tone(look.skin, 0.86));
    if (look.bottom === "shorts" && !dressLike) out += column(0, knee, c, w, w + 2) + `<path d="M${n(cx - w / 2 - 1)} ${knee - 3} L${n(cx + w / 2 + 1)} ${knee - 3}" ${thin(d, 1)}/>`;
    if (!grownUp(f) && look.bottom === "shorts") out += column(n(ankle - 10), ankle + 1, "#f4f1ea", skinW, skinW);
  } else {
    // Long trousers: wide at the bottom for cargos and wide jeans, with a stacked hem.
    // Tapered from hip to ankle: slim for jeans and track pants, a little looser for cargos.
    const flare = (w * (look.bottom === "cargo" ? 0.9 : look.bottom === "overalls" ? 0.86 : 0.78)) - w;
    out += column(0, ankle + 1, c, w, w + flare);
    out += flat(`M${n(cx + w / 2 - 6)} 0 L${n(cx + w / 2)} 0 L${n(cx + (w + flare) / 2)} ${ankle} L${n(cx + (w + flare) / 2 - 5)} ${ankle} Z`, d);
    out += `<path d="M${n(cx - w / 2 + 1.5)} 3 L${n(cx - w / 2 + 5)} 3 L${n(cx - (w + flare) / 2 + 4.5)} ${n(ankle - 2)} L${n(cx - (w + flare) / 2 + 1.5)} ${n(ankle - 2)} Z" fill="${tone(c, 1.16)}" opacity="0.6"/>`;
    // A soft knee crease.
    out += `<path d="M${n(cx - w * 0.3)} ${n(L * 0.48)} Q${cx} ${n(L * 0.5)} ${n(cx + w * 0.25)} ${n(L * 0.47)}" fill="none" stroke="${d}" stroke-width="1" opacity="0.7"/>`;
    if (look.bottom === "cargo") {
      const py = n(L * 0.32);
      const px = view === "side" ? cx - 4 : cx - w / 2 - 1;
      out += shape(`M${n(px)} ${py} L${n(px + 11)} ${py} L${n(px + 11)} ${n(py + 18)} L${n(px)} ${n(py + 18)} Z`, d) + `<path d="M${n(px)} ${n(py + 5)} L${n(px + 11)} ${n(py + 5)}" ${thin(INK, 1)}/>`;
      out += `<path d="M${n(cx - (w + flare) / 2)} ${n(ankle - 8)} Q${cx} ${n(ankle - 5)} ${n(cx + (w + flare) / 2)} ${n(ankle - 8)}" ${thin(d, 1.2)}/>`;
    }
    if (look.bottom === "jeans") out += `<path d="M${n(cx - w / 2 + 3)} 2 L${n(cx - (w + flare) / 2 + 3)} ${n(ankle - 2)}" ${thin(tone(c, 1.25), 1)}/><path d="M${n(cx - (w + flare) / 2)} ${n(ankle - 3)} L${n(cx + (w + flare) / 2)} ${n(ankle - 3)}" ${thin(d, 1.4)}/>`;
    if (look.bottom === "track") out += `<path d="M${n(view === "side" ? cx : cx - w / 2 + 2)} 2 L${n(view === "side" ? cx : cx - (w - 3) / 2 + 2)} ${n(ankle - 2)}" ${thin("#ffffff", 1.6)}/>`;
  }
  // Shoes. Side view points right.
  const s = look.shoeColor;
  const sd = shadeOf(s);
  const sole = "#f4f1ea";
  const ty = ankle - 2;
  const fw = (grownUp(f) ? 26 : 22) * (look.shoes === "boots" ? 1.05 : 1);
  if (view === "side") {
    const len = grownUp(f) ? 33 : 26;
    const x0 = cx - 9;
    switch (look.shoes) {
      case "slides":
        out += shape(`M${n(x0 + 2)} ${n(ty + 4)} L${n(x0 + len * 0.55)} ${n(ty + 4)} Q${n(x0 + len)} ${n(ty + 7)} ${n(x0 + len)} ${n(ty + shoeH - 2)} L${n(x0)} ${n(ty + shoeH - 2)} Z`, look.skin) + shape(`M${n(x0 + 4)} ${n(ty + 6)} L${n(x0 + len * 0.7)} ${n(ty + 6)} L${n(x0 + len * 0.75)} ${n(ty + 10)} L${n(x0 + 4)} ${n(ty + 10)} Z`, s);
        break;
      case "boots":
        out += shape(`M${n(x0)} ${n(ty - 10)} L${n(x0 + 15)} ${n(ty - 10)} L${n(x0 + 16)} ${n(ty + 3)} Q${n(x0 + len)} ${n(ty + 4)} ${n(x0 + len)} ${n(ty + shoeH - 2)} L${n(x0)} ${n(ty + shoeH - 2)} Z`, s) + `<path d="M${n(x0 + 4)} ${n(ty - 5)} L${n(x0 + 12)} ${n(ty - 5)} M${n(x0 + 4)} ${n(ty)} L${n(x0 + 13)} ${n(ty)}" ${thin(sd, 1)}/>`;
        break;
      case "flats":
        out += shape(`M${n(x0 + 1)} ${n(ty + 4)} Q${n(x0 + len * 0.6)} ${n(ty + 2)} ${n(x0 + len - 2)} ${n(ty + 6)} Q${n(x0 + len)} ${n(ty + shoeH - 2)} ${n(x0 + len - 4)} ${n(ty + shoeH - 2)} L${n(x0)} ${n(ty + shoeH - 2)} Z`, s);
        break;
      default: {
        const tall = look.shoes === "hightops" ? 8 : 0;
        out += shape(`M${n(x0)} ${n(ty - tall)} L${n(x0 + 15)} ${n(ty - tall)} Q${n(x0 + 17)} ${n(ty + 2)} ${n(x0 + len - 6)} ${n(ty + 4)} Q${n(x0 + len)} ${n(ty + 6)} ${n(x0 + len)} ${n(ty + shoeH - 4)} L${n(x0)} ${n(ty + shoeH - 4)} Z`, s);
        out += `<path d="M${n(x0 + 9)} ${n(ty + 4)} Q${n(x0 + 17)} ${n(ty + 7)} ${n(x0 + len - 4)} ${n(ty + 6)}" ${thin(light(s) ? sd : "#ffffff", 1.4)}/>`;
        out += `<path d="M${n(x0 + 14)} ${n(ty + 1)} l3 2 M${n(x0 + 17)} ${n(ty)} l3 2" ${thin(light(s) ? INK : "#ffffff", 0.8)}/>`;
      }
    }
    if (look.shoes !== "slides" && look.shoes !== "boots" && look.shoes !== "flats") out += shape(`M${n(x0 - 0.5)} ${n(ty + shoeH - 4)} L${n(x0 + len + 0.5)} ${n(ty + shoeH - 4)} Q${n(x0 + len + 1)} ${n(ty + shoeH + 0.5)} ${n(x0 + len - 3)} ${n(ty + shoeH + 0.5)} L${n(x0 + 1)} ${n(ty + shoeH + 0.5)} Q${n(x0 - 1)} ${n(ty + shoeH)} ${n(x0 - 0.5)} ${n(ty + shoeH - 4)} Z`, sole);
    else out += shape(`M${n(x0 - 0.5)} ${n(ty + shoeH - 2)} L${n(x0 + len + 0.5)} ${n(ty + shoeH - 2)} L${n(x0 + len)} ${n(ty + shoeH + 0.5)} L${n(x0)} ${n(ty + shoeH + 0.5)} Z`, sd);
    return out;
  }
  const x0 = cx - fw / 2;
  switch (look.shoes) {
    case "slides":
      out += shape(`M${n(x0 + 3)} ${n(ty + 3)} L${n(x0 + fw - 3)} ${n(ty + 3)} L${n(x0 + fw - 1)} ${n(ty + shoeH - 2)} L${n(x0 + 1)} ${n(ty + shoeH - 2)} Z`, look.skin) + shape(`M${n(x0 + 1)} ${n(ty + 5)} L${n(x0 + fw - 1)} ${n(ty + 5)} L${n(x0 + fw - 1)} ${n(ty + 9)} L${n(x0 + 1)} ${n(ty + 9)} Z`, s);
      break;
    case "boots":
      out += shape(`M${n(x0 + 2)} ${n(ty - 8)} L${n(x0 + fw - 2)} ${n(ty - 8)} L${n(x0 + fw)} ${n(ty + shoeH - 2)} L${n(x0)} ${n(ty + shoeH - 2)} Z`, s);
      break;
    case "flats":
      out += shape(`M${n(x0 + 2)} ${n(ty + 4)} Q${cx} ${n(ty + 1)} ${n(x0 + fw - 2)} ${n(ty + 4)} L${n(x0 + fw - 1)} ${n(ty + shoeH - 2)} L${n(x0 + 1)} ${n(ty + shoeH - 2)} Z`, s);
      break;
    default: {
      const tall = look.shoes === "hightops" ? 7 : 0;
      out += shape(`M${n(x0 + 2)} ${n(ty - tall)} L${n(x0 + fw - 2)} ${n(ty - tall)} Q${n(x0 + fw + 1)} ${n(ty + 4)} ${n(x0 + fw)} ${n(ty + shoeH - 4)} L${n(x0)} ${n(ty + shoeH - 4)} Q${n(x0 - 1)} ${n(ty + 4)} ${n(x0 + 2)} ${n(ty - tall)} Z`, s);
      out += `<path d="M${n(cx - 4)} ${n(ty + 1)} L${n(cx + 4)} ${n(ty + 1)} M${n(cx - 4)} ${n(ty + 3.5)} L${n(cx + 4)} ${n(ty + 3.5)}" ${thin(light(s) ? INK : "#ffffff", 0.8)}/>`;
      out += `<path d="M${n(x0 + 3)} ${n(ty + 6)} Q${cx} ${n(ty + 8)} ${n(x0 + fw - 3)} ${n(ty + 4)}" ${thin(light(s) ? sd : "#ffffff", 1.2)}/>`;
    }
  }
  out += shape(`M${n(x0 - 0.5)} ${n(ty + shoeH - 4)} L${n(x0 + fw + 0.5)} ${n(ty + shoeH - 4)} L${n(x0 + fw)} ${n(ty + shoeH + 0.5)} L${n(x0)} ${n(ty + shoeH + 0.5)} Z`, look.shoes === "slides" || look.shoes === "boots" || look.shoes === "flats" ? sd : sole);
  return out;
}

// ── Assembly ────────────────────────────────────────────────────────────────

export type View = "front" | "back" | "side";

/** The head placed on the body. */
function placeHead(f: Frame, inner: string): string {
  return `<g transform="translate(${f.hx} ${f.hy}) scale(${f.hk})">${inner}</g>`;
}

/** The torso texture: head, hair, neck, top and the waist of the bottoms. */
function torsoInner(look: Look, view: View, f: Frame): string {
  const head = headArt(look, view, grownUp(f));
  const behind = head.behind ? placeHead(f, head.behind) : "";
  const main = placeHead(f, head.front);
  if (view === "back") return pelvis(look, f, "back") + topArt(look, f, "back") + main + bagArt(look, f, "back", "front");
  if (view === "side") return behind + bagArt(look, f, "side", "behind") + pelvis(look, f, "side") + topArt(look, f, "side") + bagArt(look, f, "side", "front") + main;
  return behind + bagArt(look, f, "front", "behind") + pelvis(look, f, "front") + topArt(look, f, "front") + bagArt(look, f, "front", "front") + main;
}

/** Sizes of the parts for a body, in drawing units. Pivots: shoulders at (60 ± shoulderX, shoulderY), hips at (60 ± legX, hipY). */
export function dims(look: Look, body: Body) {
  const f = frameFor(look, body);
  const headTop = n(f.hy - (19 + 16) * f.hk);
  const bottom = Math.max(topBottom(look, f), look.bottom === "skirt" ? f.hipY + f.legLen * 0.38 : 0, f.hipY + 12) + 6;
  return {
    stage: f.stage,
    width: 120,
    torsoTop: headTop,
    torsoH: n(bottom - headTop),
    shoulderX: n(f.sh - f.armW * 0.45),
    shoulderY: f.sy + 2,
    hipY: f.hipY,
    legX: f.legX,
    legLen: f.legLen,
    legBox: LEG_BOX,
    legH: f.legLen + 3,
    armBox: ARM_BOX,
    armH: f.armLen + 2,
    headTop,
    height: f.hipY + f.legLen,
  };
}

function doc(viewBox: string, inner: string, width?: number, height?: number): string {
  const size = width && height ? ` width="${n(width)}" height="${n(height)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size}>${inner}</svg>`;
}

/** The parts the game animates: the torso from three sides, one arm, and one leg from the front and side. */
export function characterParts(look: Look, body: Body, scale = 1) {
  const f = frameFor(look, body);
  const d = dims(look, body);
  const torso = (view: View) => doc(`0 ${d.torsoTop} ${d.width} ${d.torsoH}`, torsoInner(look, view, f), d.width * scale, d.torsoH * scale);
  const leg = (view: "front" | "side") => doc(`0 0 ${LEG_BOX} ${d.legH}`, legInner(look, f, view), LEG_BOX * scale, d.legH * scale);
  const arm = doc(`0 -4 ${ARM_BOX} ${d.armH + 4}`, armInner(look, f), ARM_BOX * scale, (d.armH + 4) * scale);
  return { front: torso("front"), back: torso("back"), side: torso("side"), arm, leg: leg("front"), legSide: leg("side"), dims: d };
}

export type Crop = "full" | "head" | "top" | "legs";
export type Pose = "stand" | "wave" | "celebrate" | "sit";

/** The viewBox for a crop, shared with the menus so images keep their shape. */
export function cropBox(look: Look, body: Body, crop: Crop): { x: number; y: number; w: number; h: number } {
  const f = frameFor(look, body);
  const d = dims(look, body);
  const feet = d.height + 6;
  switch (crop) {
    case "head": {
      const s = 52 * f.hk;
      return { x: n(60 - s / 2), y: n(f.hy - s * 0.58), w: n(s), h: n(s) };
    }
    case "top":
      return { x: n(60 - f.sh - 18), y: f.sy - 14, w: n((f.sh + 18) * 2), h: n(Math.max(70, topBottom(look, f) - f.sy + 24)) };
    case "legs":
      return { x: 60 - 32, y: n(f.hipY + f.legLen * 0.55), w: 64, h: n(f.legLen * 0.45 + 6) };
    case "full":
    default:
      return { x: 0, y: d.headTop - 8, w: 120, h: n(feet - d.headTop + 8) };
  }
}

/** The whole person standing (or posing), or a close-up crop for menus. */
export function characterSvg(look: Look, opts: { crop?: Crop; view?: View; adult?: boolean; stage?: LifeStage; pose?: Pose } = {}): string {
  const body: Body = opts.stage ?? opts.adult ?? false;
  const view = opts.view ?? "front";
  const pose = opts.pose ?? "stand";
  const f = frameFor(look, body);
  const d = dims(look, body);
  const legFront = legInner(look, f, "front");
  const legSide = legInner(look, f, "side");
  const sit = pose === "sit";
  const legs =
    view === "side"
      ? sit
        ? `<g transform="translate(${60 - LEG_BOX / 2 + 2} ${f.hipY - 4}) rotate(-86 ${LEG_BOX / 2} 0)">${legSide}</g>`
        : `<g transform="translate(${60 - LEG_BOX / 2 - 3} ${f.hipY}) rotate(7 ${LEG_BOX / 2} 0)" opacity="0.92">${legSide}</g><g transform="translate(${60 - LEG_BOX / 2 + 2} ${f.hipY}) rotate(-7 ${LEG_BOX / 2} 0)">${legSide}</g>`
      : `<g transform="translate(${60 - f.legX - LEG_BOX / 2} ${f.hipY}) ${sit ? "scale(1 0.55)" : ""}">${legFront}</g><g transform="translate(${60 + f.legX + LEG_BOX / 2} ${f.hipY}) scale(-1 ${sit ? 0.55 : 1})">${legFront}</g>`;
  const arm = armInner(look, f);
  const sx = d.shoulderX;
  const armAt = (side: 1 | -1, deg: number) => `<g transform="translate(${n(60 + side * sx)} ${d.shoulderY}) rotate(${deg}) translate(${-ARM_BOX / 2} 0)${side === 1 ? "" : ""}">${arm}</g>`;
  const rightUp = pose === "wave" ? -150 : pose === "celebrate" ? -160 : 0;
  const leftUp = pose === "celebrate" ? 160 : 0;
  const arms =
    view === "side"
      ? { back: `<g opacity="0.85">${armAt(1, sit ? -20 : 8)}</g>`, front: armAt(1, sit ? -30 : -6) }
      : { back: "", front: armAt(-1, leftUp || 6) + armAt(1, rightUp || -6) };
  const shadow = `<ellipse cx="60" cy="${d.height - 1}" rx="26" ry="4" fill="#000" opacity="0.16"/>`;
  const box = cropBox(look, body, opts.crop ?? "full");
  // Sitting: on a seat from the front (thighs foreshortened), on the floor from the side.
  const lift = sit ? (view === "side" ? f.legLen - f.legW * 0.6 : f.legLen * 0.45) : 0;
  const bodyArt = `<g transform="translate(0 ${n(lift)})">${legs}${arms.back}${torsoInner(look, view, f)}${arms.front}</g>`;
  return doc(`${box.x} ${box.y} ${box.w} ${box.h}`, (opts.crop === "full" || !opts.crop ? shadow : "") + bodyArt);
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
