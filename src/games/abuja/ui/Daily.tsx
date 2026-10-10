import { CHALLENGES, LADDER, nextStreak, rewardFor, weeklyProgress } from "../systems/daily";
import { claimDailyGift, claimWeeklyChallenge } from "../systems/engine";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { GAME_FONT, btnPrimary, panel } from "./theme";

/** Today's gift: the seven-day ladder, your streak, and this week's challenge. */
export function DailyGift({ state, onClose }: { state: GameState; onClose: () => void }) {
  const streak = nextStreak(state);
  const slot = ((streak - 1) % LADDER.length) + 1;
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Daily gift" style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} w-full max-w-md p-5 text-slate-100`}>
        <p className="text-xs font-bold tracking-wide text-amber-300 uppercase">🎁 Daily gift</p>
        <p className="mt-1 text-2xl font-black">{streak > 1 ? `Day ${streak} in a row 🔥` : "Welcome back"}</p>
        <p className="mt-1 text-sm text-slate-300">Come back every day for a bigger gift. Miss a day and the streak starts again.</p>
        <ol className="mt-4 grid grid-cols-7 gap-1.5">
          {LADDER.map((_, i) => {
            const day = i + 1;
            const now = day === slot;
            const past = day < slot;
            return (
              <li
                key={day}
                className={`flex flex-col items-center rounded-xl px-0.5 py-2 text-center ${now ? "bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.45)]" : past ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-slate-300"}`}
              >
                <span className="text-[10px] font-bold uppercase">Day {day}</span>
                <span className="text-base" aria-hidden>
                  {past ? "✓" : day === 7 ? "💎" : "💵"}
                </span>
                <span className="text-[9px] leading-tight font-bold tabular-nums">{shortNaira(rewardFor(state, day))}</span>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className={`${btnPrimary} mt-4 min-h-12 w-full text-base`}
          onClick={() => {
            claimDailyGift();
            onClose();
          }}
          autoFocus
        >
          Collect {naira(rewardFor(state, streak))}
        </button>
        <WeeklyCard state={state} />
      </div>
    </div>
  );
}

const shortNaira = (n: number) => (n >= 1000 ? `₦${n % 1000 ? (n / 1000).toFixed(1) : n / 1000}k` : `₦${n}`);

/** This week's challenge and how far along you are. */
export function WeeklyCard({ state }: { state: GameState }) {
  const w = state.weekly;
  const p = weeklyProgress(state);
  if (!w || !p) return null;
  const c = CHALLENGES[w.id];
  const done = p.done >= p.goal;
  const money = w.id === "earn";
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
      <p className="text-[11px] font-bold tracking-wide text-sky-300 uppercase">Weekly challenge</p>
      <p className="mt-0.5 font-bold">
        {c.icon} {c.title(state)}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={p.goal} aria-valuenow={p.done}>
        <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${(p.done / p.goal) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-400 tabular-nums">
        {money ? `${naira(p.done)} of ${naira(p.goal)}` : `${p.done} of ${p.goal}`}
        {w.claimed ? " · Reward collected ✓" : ""}
      </p>
      {done && !w.claimed ? (
        <button type="button" className={`${btnPrimary} mt-2 min-h-11 w-full`} onClick={() => claimWeeklyChallenge()}>
          🏆 Collect the reward
        </button>
      ) : null}
    </div>
  );
}
