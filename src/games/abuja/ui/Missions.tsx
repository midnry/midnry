import { useEffect, useState } from "react";
import { RANKS, rankOf } from "../systems/milestones";
import { FREEDOM_TARGET } from "../systems/rules";
import { PATHS, PATH_IDS, nextStep, progress, type PathId } from "../systems/missions";
import { MIN_STAKE, fixtures, type Pick } from "../systems/betting";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { choosePath, placeBet, refreshMissions, setBetLimit, skipPaths } from "../systems/engine";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

function PathList({ state, onPick }: { state: GameState; onPick: (p: PathId) => void }) {
  return (
    <div className="grid gap-2">
      {PATH_IDS.map((id) => {
        const p = PATHS[id];
        const mine = state.missions?.path === id;
        return (
          <button key={id} type="button" onClick={() => onPick(id)} className={`rounded-xl border p-3 text-left text-sm ${mine ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
            <span className="flex justify-between font-bold">
              <span>
                {p.icon} {p.name}
              </span>
              <span className="text-xs text-slate-400">
                {progress(state, id)}/{p.steps.length}
              </span>
            </span>
            <span className="block text-xs text-slate-300">{p.pitch}</span>
            <span className={`block text-xs ${id === "fast" || id === "betting" ? "text-rose-300" : "text-amber-300"}`}>{p.risk}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Arriving in Abuja as an adult: how do you want to make it? */
export function PathChooser({ state }: { state: GameState }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" role="dialog" aria-label="Your path to financial freedom" style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} flex max-h-[92dvh] w-full max-w-md flex-col text-slate-100`}>
        <div className="border-b border-white/10 p-4">
          <p className="text-lg font-extrabold">🎯 How will you make it in Abuja?</p>
          <p className="text-sm text-slate-400">Pick a path to financial freedom. The game will point you at the opportunities for it. You can change your mind later in Missions.</p>
        </div>
        <div className="overflow-y-auto p-4">
          <PathList state={state} onPick={(p) => choosePath(p)} />
          <button type="button" className={`${btnGhost} mt-3 min-h-11 w-full`} onClick={() => skipPaths()}>
            Decide later
          </button>
        </div>
      </div>
    </div>
  );
}

export function MissionsApp({ state }: { state: GameState }) {
  useEffect(() => {
    refreshMissions();
  }, []);
  const [changing, setChanging] = useState(!state.missions?.path);
  const path = state.missions?.path ?? null;
  const next = nextStep(state);
  return (
    <div className="grid gap-4 text-sm">
      {state.toast ? <p className="rounded-xl bg-white/10 p-3 font-semibold">{state.toast}</p> : null}
      <RankLadder state={state} />
      {path && !changing ? (
        <>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs text-slate-400">Your path</p>
            <p className="text-lg font-extrabold">
              {PATHS[path].icon} {PATHS[path].name}
            </p>
            <p className="text-xs text-amber-300">{PATHS[path].risk}</p>
          </div>
          <ol className="grid gap-2">
            {PATHS[path].steps.map((st, i) => {
              const done = state.missions?.done.includes(`${path}:${st.id}`);
              const current = next?.index === i;
              return (
                <li key={st.id} className={`rounded-xl border p-3 ${current ? "border-amber-400 bg-amber-500/10" : "border-white/10 bg-white/5"} ${done ? "opacity-60" : ""}`}>
                  <p className="font-semibold">
                    {done ? "✅" : current ? "👉" : "⬜"} {st.text}
                    {st.reward ? <span className="ml-1 text-xs text-emerald-300">+{naira(st.reward)}</span> : null}
                  </p>
                  {!done ? <p className="mt-1 text-xs text-slate-400">{st.hint}</p> : null}
                </li>
              );
            })}
          </ol>
          <button type="button" className={`${btnGhost} min-h-11`} onClick={() => setChanging(true)}>
            Change path
          </button>
        </>
      ) : (
        <>
          <p className="text-slate-300">Pick a path. Finished steps stay finished if you switch.</p>
          <PathList
            state={state}
            onPick={(p) => {
              choosePath(p);
              setChanging(false);
            }}
          />
        </>
      )}
    </div>
  );
}

/** OddsNaija: fictional football, real house edge. */
export function OddsApp({ state }: { state: GameState }) {
  const [slip, setSlip] = useState<{ fixture: string; pick: Pick }[]>([]);
  const [stake, setStake] = useState(1000);
  const [limit, setLimit] = useState(20000);
  const today = fixtures(state.day);
  const b = state.betting;
  const odds = slip.reduce((n, sel) => n * (today.find((f) => f.id === sel.fixture)?.odds[sel.pick] ?? 1), 1);
  const toggle = (fixture: string, pick: Pick) =>
    setSlip((cur) => {
      const rest = cur.filter((x) => x.fixture !== fixture);
      if (cur.some((x) => x.fixture === fixture && x.pick === pick)) return rest;
      return [...rest, { fixture, pick }].slice(-3);
    });
  if (state.chapter || state.stage !== "adult") return <p className="text-slate-300">18+ only.</p>;
  return (
    <div className="grid gap-4 text-sm">
      {state.toast ? <p className="rounded-xl bg-white/10 p-3 font-semibold">{state.toast}</p> : null}
      <p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-200">Fictional clubs. The odds pay less than the real chances: over time, the bookie wins. Only bet what you can afford to lose.</p>
      <div className="grid gap-2">
        {today.map((f) => (
          <div key={f.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-semibold">
              {f.home} <span className="text-slate-400">v</span> {f.away}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["home", "draw", "away"] as Pick[]).map((k) => {
                const on = slip.some((x) => x.fixture === f.id && x.pick === k);
                return (
                  <button key={k} type="button" onClick={() => toggle(f.id, k)} className={`min-h-11 rounded-lg border text-xs font-bold ${on ? "border-emerald-400 bg-emerald-500/20" : "border-white/10 bg-white/5"}`}>
                    {k === "home" ? "1" : k === "draw" ? "X" : "2"} · {f.odds[k].toFixed(2)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="font-semibold">Bet slip {slip.length > 1 ? `(accumulator ×${slip.length})` : ""}</p>
        <p className="text-xs text-slate-400">{slip.length ? `Odds ${odds.toFixed(2)} · win ${naira(Math.round(stake * odds))}` : "Tap up to three results."}</p>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="stake">
            Stake
          </label>
          <input id="stake" type="number" min={MIN_STAKE} step={500} value={stake} onChange={(e) => setStake(Math.max(0, Number(e.target.value) || 0))} className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-2" />
        </div>
        <button
          type="button"
          disabled={!slip.length || stake < MIN_STAKE || stake > state.stats.money}
          className={`${btnPrimary} mt-2 min-h-11 w-full disabled:opacity-50`}
          onClick={() => {
            placeBet(slip, stake);
            setSlip([]);
          }}
        >
          Place bet
        </button>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="font-semibold">Weekly limit</p>
        <p className="text-xs text-slate-400">{b?.limit != null ? `Set: ${naira(b.limit)} a week (${naira(b.weekStaked)} used this week).` : "No limit set."}</p>
        <div className="mt-2 flex gap-2">
          <input type="number" min={1000} step={1000} value={limit} onChange={(e) => setLimit(Math.max(0, Number(e.target.value) || 0))} className="min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-2" aria-label="Weekly limit" />
          <button type="button" className={`${btnGhost} min-h-10 shrink-0 px-3`} onClick={() => setBetLimit(limit)}>
            Set
          </button>
        </div>
      </div>
      {b?.bets.length ? (
        <div>
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Your bets · staked {naira(b.staked)} · won {naira(b.won)}</p>
          <ul className="mt-2 grid gap-1">
            {b.bets.slice(0, 10).map((x) => (
              <li key={x.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                <span className={x.status === "won" ? "text-emerald-300" : x.status === "lost" ? "text-rose-300" : "text-slate-300"}>
                  {x.status === "open" ? "⏳" : x.status === "won" ? "✅" : "❌"} {naira(x.stake)} → {naira(x.payout)}
                </span>
                <span className="block text-slate-400">{x.legs.map((l) => l.label).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** The ranks on the way to financial freedom, with where you are now. */
function RankLadder({ state }: { state: GameState }) {
  const r = rankOf(state);
  const pct = Math.round(r.progress * 100);
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-bold">
          {r.icon} {r.title}
        </p>
        <p className="text-xs text-slate-400">{naira(r.worth)} of {naira(FREEDOM_TARGET)}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <ol className="mt-3 grid grid-cols-6 gap-1 text-center text-[10px] leading-tight">
        {RANKS.map((k) => (
          <li key={k.id} className={r.worth >= k.at ? "text-amber-200" : "text-slate-500"}>
            <span className={`mx-auto mb-0.5 flex size-7 items-center justify-center rounded-full text-sm ${r.worth >= k.at ? "bg-amber-400/20" : "bg-white/5 grayscale"}`} aria-hidden>
              {k.icon}
            </span>
            {k.title}
          </li>
        ))}
        <li className={r.worth >= FREEDOM_TARGET ? "text-emerald-300" : "text-slate-500"}>
          <span className="mx-auto mb-0.5 flex size-7 items-center justify-center rounded-full bg-white/5 text-sm" aria-hidden>
            🕊️
          </span>
          Free
        </li>
      </ol>
      {r.next ? <p className="mt-2 text-xs text-slate-400">Next: {r.next.title} at {naira(r.next.at)}.</p> : null}
    </div>
  );
}
