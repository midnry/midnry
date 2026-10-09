import { useEffect, useState } from "react";
import { romance, syncRomance } from "../systems/engine";
import { ROMANCE, cost, partnerName, person, revealed } from "../systems/romance";
import { naira } from "../systems/rules";
import type { GameState, Partner } from "../systems/types";
import { btnGhost, btnPrimary } from "./theme";

const STATUS: Record<Partner["status"], string> = {
  met: "Talking",
  dating: "Dating",
  engaged: "Engaged",
  married: "Married",
  ex: "Ex",
};

const TRAIT: Record<Partner["personality"], { label: string; tone: string }> = {
  calm: { label: "Calm", tone: "bg-emerald-500/20 text-emerald-300" },
  cunning: { label: "Cunning", tone: "bg-orange-500/20 text-orange-300" },
  crazy: { label: "Crazy", tone: "bg-red-500/20 text-red-300" },
};

/** Linkup: the MC's relationships. Adults only; intimacy is always off-screen. */
export function Linkup({ state }: { state: GameState }) {
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (state.npcs.love?.met && !state.partners.love) syncRomance();
  }, [state.npcs.love?.met, state.partners.love]);
  const people = Object.values(state.partners).sort((a, b) => (a.status === "ex" ? 1 : 0) - (b.status === "ex" ? 1 : 0) || b.affection - a.affection);

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-pink-600 to-rose-900 p-4">
        <p className="font-display text-2xl">Linkup</p>
        <p className="text-sm opacity-90">Talk, date, commit. Everyone here is over 18.</p>
      </div>
      {state.pregnancy ? (
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm">
          👶 {state.pregnancy.due ? `A baby is on the way, due around day ${state.pregnancy.due}.` : "Something big is about to happen."}
        </p>
      ) : null}
      {state.children.length ? (
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm">
          Children: {state.children.map((child) => child.name).join(", ")} · {naira(state.children.length * ROMANCE.childWeeklyCost)} a week
        </p>
      ) : null}
      {people.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          Nobody yet. Meet people at Jabi Lake Mall, the Wuse Tech Hub, Zuma Capital Bank, or Bolaji's mansion: choose “Talk to someone new”.
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {people.map((p) => (
            <PartnerCard key={p.id} state={state} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerCard({ state, p, open, onToggle }: { state: GameState; p: Partner; open: boolean; onToggle: () => void }) {
  const name = partnerName(state, p.id);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const known = revealed(p);
  const others = Object.values(state.partners).some((other) => other.id !== p.id && ["dating", "engaged", "married"].includes(other.status));
  return (
    <div className={`rounded-xl border ${open ? "border-pink-400/60" : "border-white/10"} bg-white/5`}>
      <button type="button" className="flex w-full items-center gap-3 p-3 text-left" onClick={onToggle} aria-expanded={open}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500 font-bold text-slate-950">{name.charAt(0)}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {name} {p.nepo ? <span className="text-xs text-sky-300">· Nepo Baby</span> : null}
          </span>
          <span className="block text-xs text-slate-400">
            {STATUS[p.status]} · {known ? TRAIT[p.personality].label : `Personality: ${p.hints.length}/3 clues`}
          </span>
        </span>
        <span className="text-xs tabular-nums text-pink-300">♥ {p.affection}</span>
      </button>
      {open ? (
        <div className="border-t border-white/10 p-3 text-sm">
          <p className="text-slate-400">{person(p.id)?.blurb}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-pink-400" style={{ width: `${p.affection}%` }} />
          </div>
          {known ? (
            <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${TRAIT[p.personality].tone}`}>
              You know who they are now: {TRAIT[p.personality].label}
            </p>
          ) : null}
          {p.hints.length ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {p.hints.map((hint) => (
                <li key={hint}>🔎 {hint}</li>
              ))}
            </ul>
          ) : null}
          {p.status === "ex" ? (
            <p className="mt-3 text-xs text-slate-500">It's over.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`${btnGhost} min-h-10`} onClick={() => romance({ kind: "text", id: p.id })}>
                  💬 Text
                </button>
                <button type="button" className={`${btnGhost} min-h-10`} onClick={() => romance({ kind: "gift", id: p.id })}>
                  🎁 Gift {naira(cost(state, p.id, ROMANCE.gift.cost))}
                </button>
              </div>
              <p className="text-xs text-slate-400">Go on a date (1 time slot)</p>
              <div className="grid gap-2">
                {ROMANCE.dates.map((d) => (
                  <button key={d.id} type="button" className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-semibold bg-white/10 hover:bg-white/15" onClick={() => romance({ kind: "date", id: p.id, date: d.id })}>
                    <span>{d.name}</span>
                    <span className="shrink-0 tabular-nums font-normal text-slate-400">{naira(cost(state, p.id, d.cost))}</span>
                  </button>
                ))}
              </div>
              {p.status === "met" ? (
                <button type="button" className={`${btnPrimary} min-h-10`} onClick={() => romance({ kind: "ask", id: p.id })}>
                  Ask {name} out{others ? " (you're already with someone)" : ""}
                </button>
              ) : null}
              {p.status === "dating" ? (
                <button type="button" className={`${btnPrimary} min-h-10`} onClick={() => romance({ kind: "propose", id: p.id })}>
                  💍 Propose
                </button>
              ) : null}
              {p.status === "engaged"
                ? ROMANCE.weddings.map((w) => (
                    <button key={w.id} type="button" className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500" onClick={() => romance({ kind: "wed", id: p.id, wedding: w.id })}>
                      <span>{w.name}</span>
                      <span className="shrink-0 tabular-nums">{naira(cost(state, p.id, w.cost))}</span>
                    </button>
                  ))
                : null}
              <details className="rounded-xl bg-black/20 p-2">
                <summary className="cursor-pointer text-xs text-slate-300">Spend the night</summary>
                <p className="mt-2 text-xs text-slate-400">
                  Only if they want to. Fade to black. Without protection there is a real chance of pregnancy.
                  {others && p.status === "met" ? " You're in a relationship: this would be cheating." : ""}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`${btnGhost} min-h-10`} onClick={() => romance({ kind: "night", id: p.id, safe: true })}>
                    With protection (₦1,500)
                  </button>
                  <button type="button" className={`${btnGhost} min-h-10`} onClick={() => romance({ kind: "night", id: p.id, safe: false })}>
                    Without
                  </button>
                </div>
              </details>
              {p.status !== "met" && !confirmEnd ? (
                <button type="button" className="min-h-10 text-xs text-red-300 underline" onClick={() => setConfirmEnd(true)}>
                  {p.status === "married" ? "Divorce" : "Break up"}
                </button>
              ) : null}
              {confirmEnd ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-300">{p.status === "married" ? "Divorce costs money and peace. Sure?" : `End things with ${name}?`}</span>
                  <button
                    type="button"
                    className="min-h-9 rounded-lg bg-red-500 px-3 font-semibold text-white"
                    onClick={() => {
                      romance({ kind: "breakup", id: p.id });
                      setConfirmEnd(false);
                    }}
                  >
                    Yes
                  </button>
                  <button type="button" className="min-h-9 rounded-lg px-3" onClick={() => setConfirmEnd(false)}>
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
