import { choiceOdds, oddsText } from "../systems/odds";
import type { Effect } from "../systems/types";

/** "🎲 30% risk" or "🎲 40% chance" under a choice that rolls the dice. */
export function OddsTag({ effects }: { effects?: Effect[] }) {
  const o = choiceOdds(effects);
  if (!o) return null;
  return (
    <span
      className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${o.risk ? "bg-rose-400/15 text-rose-200" : "bg-emerald-400/15 text-emerald-200"}`}
      title={o.risk ? `There's about a ${o.pct}% chance this goes wrong.` : `There's about a ${o.pct}% chance this pays off.`}
    >
      {oddsText(o)}
    </span>
  );
}
