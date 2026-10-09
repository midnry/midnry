import { clamp, naira } from "./rules";
import { layLowBlocks } from "./justice";
import type { GameState } from "./types";

// Phones: everyone starts on a cheap Kpakpa. Better phones look different,
// lay out their home screen differently, and the expensive ones say something
// about you: buying one raises your reputation, and the flagships keep
// polishing it every week you carry them. Brands are fictional.

export type PhoneId = "kpakpa" | "sparkle" | "nova" | "pear" | "fold";
export type Layout = "list" | "grid3" | "grid4" | "dock" | "fold";

export const PHONES: Record<PhoneId, {
  name: string;
  price: number;
  /** Reputation the day you buy it, and every week you carry it. */
  rep: number;
  weekly: number;
  blurb: string;
  layout: Layout;
  look: { frame: string; screen: string; bar: string; icon: string; width: string };
}> = {
  kpakpa: {
    name: "Kpakpa C2", price: 0, rep: 0, weekly: 0, layout: "list",
    blurb: "Indestructible, two SIMs, a torch, and a battery that lasts a week. Nobody is impressed.",
    look: { frame: "rounded-[1.25rem] border-4 border-zinc-600 bg-zinc-900", screen: "bg-zinc-900", bar: "bg-zinc-800 border-b border-zinc-700", icon: "rounded-md", width: "max-w-sm" },
  },
  sparkle: {
    name: "Sparkle 9", price: 95_000, rep: 2, weekly: 0, layout: "grid3",
    blurb: "Big screen, bigger speakers, a camera with a 'beauty' mode you can't turn off.",
    look: { frame: "rounded-[2rem] border-2 border-sky-400/40 bg-gradient-to-b from-sky-950 to-indigo-950", screen: "bg-gradient-to-b from-sky-900/60 to-indigo-950", bar: "border-b border-white/10", icon: "rounded-full", width: "max-w-md" },
  },
  nova: {
    name: "Nova X Pro", price: 380_000, rep: 5, weekly: 0, layout: "grid4",
    blurb: "Glass back, fast everything, and a camera that makes Abuja traffic look cinematic.",
    look: { frame: "rounded-[2.25rem] border border-white/20 bg-black", screen: "bg-gradient-to-br from-emerald-950 via-black to-slate-900", bar: "border-b border-white/5", icon: "rounded-2xl", width: "max-w-md" },
  },
  pear: {
    name: "Pear 15 Pro Max", price: 1_800_000, rep: 10, weekly: 1, layout: "dock",
    blurb: "Titanium, a dynamic notch, and the logo everyone at the owambe looks for.",
    look: { frame: "rounded-[2.75rem] border-[3px] border-stone-300/70 bg-stone-950 shadow-[0_0_0_6px_rgba(120,113,108,0.35)]", screen: "bg-gradient-to-b from-amber-200/20 via-stone-900 to-black", bar: "", icon: "rounded-[1.1rem]", width: "max-w-md" },
  },
  fold: {
    name: "Fold Z6", price: 2_600_000, rep: 15, weekly: 2, layout: "fold",
    blurb: "It opens like a book. Wealthy people unfold it slowly in meetings, just so you notice.",
    look: { frame: "rounded-[1.75rem] border-2 border-violet-300/40 bg-violet-950", screen: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950", bar: "border-b border-white/10", icon: "rounded-xl", width: "max-w-2xl" },
  },
};

export const PHONE_IDS = Object.keys(PHONES) as PhoneId[];

export type Phones = { owned: PhoneId[]; current: PhoneId };

export function phones(s: GameState): Phones {
  s.phones ??= { owned: ["kpakpa"], current: "kpakpa" };
  return s.phones;
}

export const currentPhone = (s: GameState) => PHONES[s.phones?.current ?? "kpakpa"];

export function buyPhone(s: GameState, id: PhoneId): string {
  const p = phones(s);
  const def = PHONES[id];
  if (p.owned.includes(id)) return useStored(s, id);
  if (s.stats.money < def.price) return `The ${def.name} costs ${naira(def.price)}. You don't have it.`;
  const quiet = layLowBlocks(s, "spend", def.price);
  if (quiet) return quiet;
  s.stats.money -= def.price;
  p.owned.push(id);
  p.current = id;
  s.stats.reputation = clamp(s.stats.reputation + def.rep);
  return `📱 You unbox a ${def.name} (${naira(def.price)}).${def.rep ? ` People notice: reputation +${def.rep}.` : ""}`;
}

function useStored(s: GameState, id: PhoneId): string {
  phones(s).current = id;
  return `You switch to your ${PHONES[id].name}.`;
}

export const switchPhone = (s: GameState, id: PhoneId) => (phones(s).owned.includes(id) ? useStored(s, id) : "");

/** Every week, a flagship keeps your image polished. */
export function weeklyPhone(s: GameState): string | null {
  const def = currentPhone(s);
  if (!def.weekly) return null;
  s.stats.reputation = clamp(s.stats.reputation + def.weekly);
  return `Your ${def.name} keeps turning heads: reputation +${def.weekly}.`;
}
