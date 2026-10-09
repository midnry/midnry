import { ACTS, PROFILE, allowance, band } from "../systems/emeka";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { emekaAct, emekaMeet } from "../systems/engine";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

/** Emeka D walks into your secondary school. */
export function EmekaMeet() {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" role="dialog" aria-label="Meet Emeka D" style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} w-full max-w-md p-4 text-slate-100`}>
        <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">💎 New student</p>
        <p className="mt-1 text-lg font-extrabold">{PROFILE.name}</p>
        <p className="text-xs text-slate-400">{PROFILE.family}</p>
        <p className="mt-3 text-sm text-slate-200">{PROFILE.intro}</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className={`${btnPrimary} min-h-11`} onClick={() => emekaMeet("friend")} autoFocus>
            "Sit. I'm friendly."
          </button>
          <button type="button" className={`${btnGhost} min-h-11`} onClick={() => emekaMeet("interest")}>
            💌 Let him know you like him
          </button>
          <button type="button" className={`${btnGhost} min-h-11`} onClick={() => emekaMeet("ignore")}>
            Look away
          </button>
        </div>
      </div>
    </div>
  );
}

/** Time with Emeka, and the option to tell him how you feel. */
export function EmekaPanel({ state }: { state: GameState }) {
  const e = state.emeka;
  if (!e || e.met < 0) return <p className="text-sm text-slate-300">You haven't met Emeka D.</p>;
  const b = band(state);
  const dating = e.stage === "dating";
  if (e.ignored)
    return (
      <div className="grid gap-3 text-sm">
        {state.toast ? <p className="rounded-xl bg-white/10 p-3 font-semibold">{state.toast}</p> : null}
        <p className="rounded-2xl bg-white/5 p-3">
          <b>{PROFILE.name}</b> is ignoring you. The last thing he said was "cheap copy".
        </p>
      </div>
    );
  return (
    <div className="grid gap-3 text-sm">
      {state.toast ? <p className="rounded-xl bg-white/10 p-3 font-semibold">{state.toast}</p> : null}
      <div className="rounded-2xl bg-white/5 p-3">
        <p className="font-bold">
          {PROFILE.name} {dating ? <span className="text-pink-300">· your boyfriend 💕</span> : <span className="text-slate-400">· {e.stage === "friends" ? "friend" : "classmate"}</span>}
        </p>
        <p className="text-xs text-slate-400">{PROFILE.family}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/10">
          <div className="h-full bg-pink-400" style={{ width: `${e.rel}%` }} />
        </div>
        {dating ? <p className="mt-2 text-xs text-emerald-300">Allowance: {naira(allowance(state))} {b === "adult" ? "every week" : "every few days"}. Nepo boyfriend perks.</p> : null}
      </div>
      <div className="grid gap-2">
        {ACTS[b].map((a) => (
          <button key={a.id} type="button" className={`${btnGhost} min-h-11`} onClick={() => emekaAct(a.id)}>
            {a.label}
          </button>
        ))}
        {!dating ? (
          <button type="button" className={`${btnPrimary} min-h-11`} onClick={() => emekaAct("ask")}>
            💌 {b === "school" ? "Pass him a 'Do you like me?' note" : "Tell him how you feel"}
          </button>
        ) : null}
      </div>
      {b === "school" ? <p className="text-[11px] text-slate-500">Secondary school romance is notes, walks and dates home before curfew. Nothing more.</p> : null}
    </div>
  );
}

/** A small sheet around the panel, for the story years. */
export function EmekaSheet({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`${panel} max-h-[88dvh] w-full max-w-md overflow-y-auto p-4 text-slate-100`} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-label="Emeka D" style={{ fontFamily: GAME_FONT }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-lg font-extrabold">💌 Emeka D</p>
          <button type="button" className="min-h-11 rounded-xl px-3 text-sm" onClick={onClose} aria-label="Close Emeka D">
            ✕
          </button>
        </div>
        <EmekaPanel state={state} />
      </div>
    </div>
  );
}
