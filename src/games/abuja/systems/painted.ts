import { SKIN_TONES, fullLook } from "./character";
import type { GameState, Looks } from "./types";

// Hand-painted art (public/abuja/people). Named city people have their own
// sheets; the player can wear one of the painted outfits from the wardrobe.

export type Tone = "light" | "brown" | "dark";
export type PaintedOutfit = { id: string; build: "masc" | "fem"; tone: Tone; label: string };

export const TONES: { id: Tone; label: string; swatch: string }[] = [
  { id: "light", label: "Light brown", swatch: "#c68a5e" },
  { id: "brown", label: "Brown", swatch: "#9c6038" },
  { id: "dark", label: "Dark", swatch: "#5a3420" },
];

const MASC = ["Hoodie and cargos", "Shirt and jeans", "Senator wear", "Smart blazer"];
const FEM = ["Hoodie and wide-legs", "Tee and jeans", "Ankara dress", "Office blazer"];

/** Outfits with art so far; women's sheets are added as they arrive. */
const READY: Record<"masc" | "fem", Tone[]> = { masc: ["light", "brown", "dark"], fem: ["light", "brown", "dark"] };

export const PAINTED_OUTFITS: PaintedOutfit[] = (["masc", "fem"] as const).flatMap((build) =>
  READY[build].flatMap((tone) => (build === "masc" ? MASC : FEM).map((label, i) => ({ id: `you-${build === "masc" ? "m" : "f"}-${tone}-${i + 1}`, build, tone, label }))),
);

/** `looks.painted` set to this means the player chose the mix-and-match drawn look. */
export const DRAWN = "none";

/** The painted outfit closest to a drawn look: same build, nearest skin tone, a similar kind of top. */
export function autoOutfit(looks: Looks): string | undefined {
  const look = fullLook(looks);
  const i = SKIN_TONES.indexOf(look.skin);
  const tone: Tone = i >= 0 ? (i <= 3 ? "light" : i <= 5 ? "brown" : "dark") : "brown";
  const top = look.top;
  const n = ["kaftan", "dress"].includes(top) ? 3 : ["blazer", "jacket"].includes(top) ? 4 : ["tee", "tank", "shirt"].includes(top) ? 2 : 1;
  const id = `you-${look.build === "fem" ? "f" : "m"}-${tone}-${n}`;
  return PAINTED_OUTFITS.some((o) => o.id === id) ? id : undefined;
}

/** The painted outfit the player wears (grown-ups only): their choice, or one matched to their look. */
export function playerPainted(state: Pick<GameState, "looks" | "age"> | null): string | undefined {
  if (!state?.looks || (state.age ?? 0) < 18) return undefined;
  const id = state.looks.painted;
  if (id === DRAWN) return undefined;
  if (id && PAINTED_OUTFITS.some((o) => o.id === id)) return id;
  return autoOutfit(state.looks);
}

/** The player's looks with the painted outfit filled in, for portraits in the interface. */
export const myLooks = (state: Pick<GameState, "looks" | "age">): Looks => ({ ...state.looks, painted: playerPainted(state) ?? DRAWN });

// ── Passers-by ──────────────────────────────────────────────────────────────

export type CrowdStage = "child" | "teen" | "young" | "adult" | "senior";

/** Painted people for the crowd, by gender and the life stages they can stand in for. `scale` is height against a grown-up. */
export const CROWD_PAINTED: { id: string; gender: "male" | "female"; stages: CrowdStage[]; scale: number }[] = [
  { id: "crowd-office", gender: "male", stages: ["young", "adult"], scale: 1.02 },
  { id: "crowd-student", gender: "male", stages: ["young"], scale: 1 },
  { id: "crowd-market", gender: "female", stages: ["adult"], scale: 0.95 },
  { id: "crowd-nurse", gender: "female", stages: ["young", "adult"], scale: 0.96 },
  { id: "crowd-schoolboy", gender: "male", stages: ["child"], scale: 0.62 },
  { id: "crowd-schoolgirl", gender: "female", stages: ["child"], scale: 0.62 },
  { id: "crowd-teenboy", gender: "male", stages: ["teen"], scale: 0.88 },
  { id: "crowd-teengirl", gender: "female", stages: ["teen"], scale: 0.86 },
  { id: "crowd-littleboy", gender: "male", stages: ["child"], scale: 0.55 },
  { id: "crowd-littlegirl", gender: "female", stages: ["child"], scale: 0.55 },
  { id: "crowd-footballer", gender: "male", stages: ["teen"], scale: 0.9 },
  { id: "crowd-fashion", gender: "female", stages: ["young"], scale: 0.97 },
  { id: "crowd-tech", gender: "male", stages: ["young", "adult"], scale: 1 },
  { id: "crowd-banker", gender: "female", stages: ["young", "adult"], scale: 0.96 },
  { id: "crowd-mother", gender: "female", stages: ["young"], scale: 0.95 },
  { id: "crowd-hijab", gender: "female", stages: ["young", "adult"], scale: 0.96 },
  { id: "crowd-labourer", gender: "male", stages: ["young", "adult"], scale: 1.02 },
  { id: "crowd-security", gender: "male", stages: ["adult"], scale: 1.02 },
  { id: "crowd-trader", gender: "male", stages: ["adult"], scale: 1 },
  { id: "crowd-hairdresser", gender: "female", stages: ["young", "adult"], scale: 0.95 },
  { id: "crowd-pastorwife", gender: "female", stages: ["adult"], scale: 0.97 },
  { id: "crowd-olderman", gender: "male", stages: ["adult", "senior"], scale: 1 },
  { id: "crowd-grandpa", gender: "male", stages: ["senior"], scale: 0.97 },
  { id: "crowd-grandma", gender: "female", stages: ["senior"], scale: 0.92 },
];

/** A painted passer-by for someone of this age and gender, or none yet (they stay drawn). */
export function crowdPainted(gender: "male" | "female", stage: CrowdStage, seed: number): string | undefined {
  const options = CROWD_PAINTED.filter((c) => c.gender === gender && c.stages.includes(stage));
  return options.length ? options[seed % options.length]!.id : undefined;
}

/** Painted people with hand-drawn walk cycles: 4 frames per view (<id>-walk-<view>-<n>.png). Others step by cut-out legs. */
export const WALK_FRAMES = new Set<string>(["you-f-brown-1"]);
