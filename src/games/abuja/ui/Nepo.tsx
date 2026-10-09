import { NEPO, NEPO_IDS, favourState, type NepoId } from "../systems/nepo";
import { naira } from "../systems/rules";
import { place } from "../systems/data";
import type { GameState } from "../systems/types";
import { nepoFavour, nepoHang, nepoMeet } from "../systems/engine";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

/** Bumping into a nepo friend: how do you play it? */
export function NepoMeet({ state }: { state: GameState }) {
  const id = state.nepoMeet as NepoId | null | undefined;
  if (!id || !NEPO[id]) return null;
  const n = NEPO[id];
  const kid = Boolean(state.chapter);
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" role="dialog" aria-label={`Meet ${n.name}`} style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} w-full max-w-md p-4 text-slate-100`}>
        <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">💎 A nepo friend?</p>
        <p className="mt-1 text-lg font-extrabold">{n.name}</p>
        <p className="text-xs text-slate-400">{n.family}</p>
        <p className="mt-3 text-sm text-slate-200">{n.intro}</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={`${btnPrimary} min-h-11`} onClick={() => nepoMeet("real")} autoFocus>
            Just be yourself
          </button>
          <button type="button" className={`${btnGhost} min-h-11`} onClick={() => nepoMeet("flex")}>
            Show off to fit in ({naira(kid ? 2_000 : 25_000)})
          </button>
          <button type="button" className={`${btnGhost} min-h-11`} onClick={() => nepoMeet("ask")}>
            Ask for a favour straight away
          </button>
          <button type="button" className={`${btnGhost} min-h-11`} onClick={() => nepoMeet("brush")}>
            Brush them off
          </button>
        </div>
      </div>
    </div>
  );
}

/** The phone app: your well-connected friends and what they can do. */
export function ConnectsApp({ state }: { state: GameState }) {
  const mine = NEPO_IDS.filter((id) => state.npcs[id]?.met);
  const unmet = NEPO_IDS.filter((id) => !state.npcs[id]?.met);
  return (
    <div className="grid gap-4 text-sm">
      {state.toast ? <p className="rounded-xl bg-white/10 p-3 font-semibold">{state.toast}</p> : null}
      <p className="text-slate-400">Friends with powerful families. Their favours open doors money can't, but each one costs some of the friendship.</p>
      {mine.length ? (
        mine.map((id) => {
          const n = NEPO[id];
          const rel = state.npcs[id]!.rel;
          return (
            <div key={id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-baseline justify-between">
                <p className="font-bold">{n.name}</p>
                <span className="text-xs text-slate-400">Relationship {rel}</span>
              </div>
              <p className="text-xs text-slate-400">{n.family}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/10">
                <div className="h-full bg-sky-400" style={{ width: `${Math.max(0, rel)}%` }} />
              </div>
              <button type="button" className={`${btnGhost} mt-3 min-h-10 w-full`} onClick={() => nepoHang(id)} disabled={state.stats.money < n.hangout.price}>
                {n.hangout.label} ({naira(n.hangout.price)})
              </button>
              <div className="mt-2 grid gap-2">
                {n.favours.map((f) => {
                  const st = favourState(state, id, f);
                  return (
                    <button key={f.id} type="button" disabled={!st.ok} onClick={() => nepoFavour(id, f.id)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-left disabled:opacity-50">
                      <span className="block font-semibold">{f.label}</span>
                      <span className="block text-xs text-slate-400">{f.detail}</span>
                      <span className="block text-xs text-amber-300">{st.ok ? `Costs ${f.cost} relationship` : st.why}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <p className="rounded-xl bg-white/5 p-3 text-slate-300">No nepo friends yet. You bump into them at school, at camp, and around town: the mall, the CBD, the tech hub, owambes.</p>
      )}
      {unmet.length ? (
        <div>
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Where people like that hang out</p>
          <ul className="mt-2 grid gap-1 text-xs text-slate-400">
            {unmet.map((id) => (
              <li key={id}>• {NEPO[id].family.replace(/^(Only child|Grandson|Daughter|Nephew) of /, "The family of ")}: try {NEPO[id].haunts.map((h) => place(h)?.name ?? h).join(", ")}.</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
