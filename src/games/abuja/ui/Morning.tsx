import { useState } from "react";
import { dismissMorning } from "../systems/engine";
import type { GameState } from "../systems/types";
import { GAME_FONT, btnPrimary, panel } from "./theme";

// The morning summary: what happened overnight as a short list, the news
// that matters most first (good news, then warnings, then the rest), instead
// of one long paragraph where the important line gets lost.

const GOOD = /🎉|✅|👶|💍|👑|🏅|🎓|✉️|🎂|💸|🏢|💼|approved|is born|promot|passed|sent you|yours now|won /i;
const BAD = /❌|📵|🚓|⚠️|🗑️|arrest|starv|hungry|dehydrat|headache|frozen|fined|fine |stolen|thie|collapse|refused|lost|passed away|sealed|loss|owe|overdue|debt|bill|sick|injur|weak/i;

function rank(line: string): number {
  if (GOOD.test(line)) return 3;
  if (BAD.test(line)) return 2;
  return 1;
}

/** The line's own emoji if it starts with one, otherwise one for its kind. */
function iconFor(line: string, r: number): [string, string] {
  const m = line.match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u);
  if (m) return [m[1]!, line.slice(m[0].length)];
  return [r === 3 ? "✨" : r === 2 ? "⚠️" : "•", line];
}

export function MorningCard({ state }: { state: GameState }) {
  const [all, setAll] = useState(false);
  const m = state.morning;
  if (!m) return null;
  const items = m.items.map((text, i) => ({ text, i, r: rank(text) })).sort((a, b) => b.r - a.r || a.i - b.i);
  const shown = all ? items : items.slice(0, 5);
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-2 sm:inset-auto sm:top-24 sm:left-1/2 sm:-translate-x-1/2 sm:p-0" style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} w-full max-w-md p-4 text-slate-100 sm:w-[28rem]`} role="dialog" aria-label="Good morning">
        <p className="text-xs font-bold tracking-wide text-amber-300 uppercase">☀️ Good morning · Day {m.day}</p>
        {m.lead && !/Good morning/.test(m.lead) ? <p className="mt-1 text-sm text-slate-300">{m.lead}</p> : null}
        <ul className="mt-3 grid max-h-[45dvh] gap-2 overflow-y-auto">
          {shown.map(({ text, i, r }) => {
            const [icon, body] = iconFor(text, r);
            return (
              <li key={i} className={`flex gap-2.5 rounded-xl p-2.5 text-sm text-pretty ${r === 3 ? "bg-emerald-400/10" : r === 2 ? "bg-rose-400/10" : "bg-white/5"}`}>
                <span aria-hidden className="w-5 shrink-0 text-center">{icon}</span>
                <span>{body}</span>
              </li>
            );
          })}
        </ul>
        {items.length > shown.length ? (
          <button type="button" className="mt-2 min-h-10 w-full rounded-xl text-sm text-slate-300 hover:bg-white/5" onClick={() => setAll(true)}>
            And {items.length - shown.length} more
          </button>
        ) : null}
        <button type="button" className={`${btnPrimary} mt-3 min-h-11 w-full`} onClick={() => dismissMorning()} autoFocus>
          Start the day
        </button>
      </div>
    </div>
  );
}
