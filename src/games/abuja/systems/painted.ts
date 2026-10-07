import type { GameState } from "./types";

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
const READY: Record<"masc" | "fem", Tone[]> = { masc: ["light", "brown", "dark"], fem: [] };

export const PAINTED_OUTFITS: PaintedOutfit[] = (["masc", "fem"] as const).flatMap((build) =>
  READY[build].flatMap((tone) => (build === "masc" ? MASC : FEM).map((label, i) => ({ id: `you-${build === "masc" ? "m" : "f"}-${tone}-${i + 1}`, build, tone, label }))),
);

/** The painted outfit the player is wearing, if any (grown-ups only). */
export function playerPainted(state: Pick<GameState, "looks" | "age"> | null): string | undefined {
  const id = state?.looks?.painted;
  return id && (state?.age ?? 0) >= 18 && PAINTED_OUTFITS.some((o) => o.id === id) ? id : undefined;
}
