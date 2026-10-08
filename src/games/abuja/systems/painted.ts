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

/** The player's own NYSC uniform art so far, by gender and skin tone (you-nysc-f-brown…). */
export const NYSC_ART = new Set<string>(["you-nysc-m-light", "you-nysc-m-brown", "you-nysc-f-light", "you-nysc-f-brown", "you-nysc-f-dark", "you-nysc-m-dark"]);

/** The player's own childhood art so far, by gender and skin tone (child at 9, teen at 15). */
export const KID_ART = new Set<string>(["you-k-m-light", "you-k-f-light", "you-k-f-brown", "you-k-f-dark", "you-k-m-brown", "you-k-m-dark"]);

/** Skin tone: from the chosen grown-up outfit, else from the drawn skin colour. */
export function toneOf(looks: Partial<Looks>): Tone {
  const m = /^you-[mf]-(light|brown|dark)-/.exec(looks.painted ?? "");
  if (m) return m[1] as Tone;
  const i = SKIN_TONES.indexOf(looks.skin ?? "");
  return i >= 0 ? (i <= 3 ? "light" : i <= 5 ? "brown" : "dark") : "brown";
}

/** The painted player as a child or teenager: their own art in their skin tone, else the school kids and teens. */
export function youngPainted(looks: Partial<Looks>, age: number): string {
  const girl = (looks.build ?? (looks.lashes ? "fem" : "masc")) === "fem";
  const own = `you-k-${girl ? "f" : "m"}-${toneOf(looks)}`;
  if (KID_ART.has(own)) return `${own}-${age < 13 ? "child" : "teen"}`;
  if (age < 13) return girl ? "crowd-schoolgirl" : "crowd-schoolboy";
  return girl ? "crowd-teengirl" : "crowd-teenboy";
}

/** Friends who grew up with you: their art at 9 and 15. */
export const YOUNG_FRIENDS: Record<string, { child?: string; teen?: string }> = {
  tunde: { child: "tunde-9", teen: "tunde-15" },
  slim: { child: "slim-9", teen: "slim-15" },
  bolaji: { teen: "bolaji-15" },
};

/** Every young painted id and its height against a grown-up. */
export const YOUNG_ART: { id: string; scale: number }[] = [
  ...[...KID_ART].flatMap((k) => [{ id: `${k}-child`, scale: 0.62 }, { id: `${k}-teen`, scale: 0.88 }]),
  ...[...NYSC_ART].map((id) => ({ id, scale: id.includes("-f-") ? 0.96 : 1.02 })),
  ...Object.values(YOUNG_FRIENDS).flatMap((f) => [...(f.child ? [{ id: f.child, scale: 0.62 }] : []), ...(f.teen ? [{ id: f.teen, scale: 0.9 }] : [])]),
];

/** The painted art the player wears at their age: school clothes when young, their chosen (or matched) outfit from 18. */
/** NYSC camp: everyone wears the uniform. Your own if it's been painted, else the corper's for women. */
export function nyscPainted(looks: Partial<Looks>): string | undefined {
  const girl = (looks.build ?? (looks.lashes ? "fem" : "masc")) === "fem";
  const own = `you-nysc-${girl ? "f" : "m"}-${toneOf(looks)}`;
  if (NYSC_ART.has(own)) return own;
  // Someone of the same gender in uniform, until your own tone is painted.
  const same = [...NYSC_ART].find((id) => id.startsWith(`you-nysc-${girl ? "f" : "m"}-`));
  return same ?? (girl ? "corper" : undefined);
}

export function playerPainted(state: Pick<GameState, "looks" | "age" | "stage"> | null): string | undefined {
  if (!state?.looks) return undefined;
  if ((state.age ?? 0) < 18) return youngPainted(state.looks, state.age ?? 0);
  if (state.stage === "nysc") {
    const uniform = nyscPainted(state.looks);
    if (uniform) return uniform;
  }
  const id = state.looks.painted;
  if (id && PAINTED_OUTFITS.some((o) => o.id === id)) return id;
  return autoOutfit(state.looks);
}

/** Any painted art id the interface can show as a portrait. */
export const isPaintedId = (id: string | undefined): id is string => Boolean(id && (PAINTED_OUTFITS.some((o) => o.id === id) || CROWD_PAINTED.some((c) => c.id === id) || YOUNG_ART.some((y) => y.id === id) || STORY_ART.some((y) => y.id === id)));

/** The player's looks with the painted art filled in, for portraits in the interface. */
export const myLooks = (state: Pick<GameState, "looks" | "age" | "stage">): Looks => ({ ...state.looks, painted: playerPainted(state) ?? DRAWN });

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
export const WALK_FRAMES = new Set<string>([
  "you-f-brown-1", "you-m-brown-1", "you-m-light-1", "you-m-light-2", "you-m-light-3", "you-m-light-4", "you-m-brown-2", "you-m-brown-3", "you-m-brown-4", "you-m-dark-1", "you-m-dark-2", "you-m-dark-3", "you-m-dark-4", "you-f-light-1", "you-f-light-2", "you-f-light-3", "you-f-light-4", "you-f-brown-2", "you-f-brown-3", "you-f-brown-4", "you-f-dark-1", "you-f-dark-2", "you-f-dark-3", "you-f-dark-4",
  // The player at school age and in NYSC uniform.
  "you-k-f-light-child",
  "you-k-f-light-teen",
  "you-k-f-brown-child",
  "you-k-f-brown-teen",
  "you-k-f-dark-child",
  "you-k-f-dark-teen",
  "you-k-m-light-child",
  "you-k-m-light-teen",
  "you-k-m-brown-child",
  "you-k-m-brown-teen",
  "you-k-m-dark-child",
  "you-k-m-dark-teen",
  "you-nysc-f-light",
  "you-nysc-f-brown",
  "you-nysc-f-dark",
  "you-nysc-m-light",
  "you-nysc-m-brown",
  "you-nysc-m-dark",
  // Friends and family.
  "mama",
  "daddy",
  "tunde",
  "tunde-9",
  "tunde-15",
  "slim",
  "slim-9",
  "slim-15",
  "bolaji",
  "bolaji-15",
  "okafor",
  "corper",
  "agbero",
  "civil_servant",
  "commandant",
  "felix",
  "frsc",
  "hawker",
  "headmaster",
]);

/** Named people from the school, university and camp chapters, with their heights against a grown-up. */
export const STORY_ART: { id: string; scale: number }[] = [
  { id: "mama", scale: 0.94 },
  { id: "daddy", scale: 1 },
  { id: "headmaster", scale: 1.01 },
  { id: "water_seller", scale: 1.02 },
  { id: "teacher", scale: 1 },
  { id: "roommate", scale: 0.99 },
  { id: "recruiter", scale: 1.03 },
  { id: "rotaract", scale: 0.94 },
  { id: "soldier", scale: 1.03 },
  { id: "commandant", scale: 1.02 },
  { id: "saed", scale: 0.95 },
  { id: "inspector", scale: 0.97 },
  { id: "mammy_seller", scale: 0.94 },
];
