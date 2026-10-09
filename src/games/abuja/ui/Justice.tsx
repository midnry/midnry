import { useState } from "react";
import * as JU from "../systems/justice";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { acceptLifeSentence, courtHire, courtPlead, courtSettle, endLayLow, escapeDone, evidenceClear, layLow, prisonSleepNow, turnIn } from "../systems/engine";
import { Escape } from "./Escape";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

const strength = (e: number) => (e >= 120 ? "Overwhelming" : e >= 90 ? "Strong" : e >= 60 ? "Solid" : "Thin");

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-label={title} style={{ fontFamily: GAME_FONT }}>
      <div className={`${panel} flex max-h-[92dvh] w-full max-w-lg flex-col text-slate-100`}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-lg font-extrabold">{title}</p>
          {onClose ? (
            <button type="button" className="min-h-11 rounded-xl px-3 text-sm" onClick={onClose} aria-label={`Close ${title}`}>
              ✕
            </button>
          ) : null}
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

// ── The court ────────────────────────────────────────────────────────────────

export function Court({ state }: { state: GameState }) {
  const c = state.justice?.case;
  if (!c) return null;
  const ch = JU.CHARGES[c.charge];
  const sentence = c.charge === "escape" ? (c.owed === null ? "Back to life imprisonment, plus more" : `What you still owed${c.owed ? ` (${c.owed} days)` : ""}, plus 45–60 days`) : ch.days ? `${ch.days[0]}–${ch.days[1]} days` : "Life imprisonment";
  return (
    <Sheet title="⚖️ High Court, Abuja">
      {state.toast ? <p className="mb-3 rounded-xl bg-white/10 p-3 text-sm font-semibold">{state.toast}</p> : null}
      <p className="text-sm text-slate-400">The State v. {state.name}</p>
      <p className="mt-1 text-lg font-bold">{ch.name}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-xs text-slate-400">Evidence</p>
          <p className="font-bold">{strength(c.evidence)}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-xs text-slate-400">If convicted</p>
          <p className="font-bold">{sentence}</p>
        </div>
      </div>

      <p className="mt-4 text-xs font-bold tracking-wide text-slate-400 uppercase">1 · Your lawyer</p>
      <div className="mt-2 grid gap-2">
        {(Object.keys(JU.LAWYERS) as JU.LawyerId[])
          .filter((id) => id !== "nepo" || state.flags.nepo_lawyer)
          .map((id) => {
            const l = JU.LAWYERS[id];
            const fee = l.fee * ch.sev;
            const mine = c.lawyer === id;
            return (
              <button
                key={id}
                type="button"
                disabled={Boolean(c.lawyer) || state.stats.money < fee}
                onClick={() => courtHire(id)}
                className={`rounded-xl border p-3 text-left text-sm disabled:opacity-60 ${mine ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
              >
                <span className="flex justify-between font-bold">
                  <span>{l.name}</span>
                  <span>{fee ? naira(fee) : "Free"}</span>
                </span>
                <span className="block text-xs text-slate-400">{l.blurb}</span>
                {mine ? <span className="text-xs font-bold text-emerald-300">Your lawyer</span> : null}
              </button>
            );
          })}
      </div>

      <p className="mt-4 text-xs font-bold tracking-wide text-slate-400 uppercase">2 · Settle the court? (optional)</p>
      <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-sm">
        <p>
          Your lawyer can try to make the case "go away" for <b>{naira(ch.settle)}</b>. It is never guaranteed: if the judge refuses, the money is gone and the sentence gets heavier.
        </p>
        <button type="button" disabled={Boolean(c.settled) || state.stats.money < ch.settle} onClick={() => courtSettle()} className={`${btnGhost} mt-2 min-h-11 w-full disabled:opacity-50`}>
          {c.settled ? "The judge refused" : `Try to settle (${naira(ch.settle)})`}
        </button>
      </div>

      <p className="mt-4 text-xs font-bold tracking-wide text-slate-400 uppercase">3 · Your plea</p>
      {!c.lawyer ? <p className="mt-1 text-xs text-amber-300">Without a lawyer you'll get Legal Aid.</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className={`${btnPrimary} min-h-12`} onClick={() => courtPlead(false)}>
          Not guilty: go to trial
        </button>
        <button type="button" className={`${btnGhost} min-h-12`} onClick={() => courtPlead(true)}>
          Guilty: a lighter sentence
        </button>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">A trial can end in acquittal, but conviction carries the full sentence. Pleading guilty cuts it by about 40% (and turns life into 180 days).</p>
    </Sheet>
  );
}

// ── Prison ───────────────────────────────────────────────────────────────────

export type PrisonView = "status" | "bunk" | "escape";

export function PrisonPanel({ state, view, onClose }: { state: GameState; view: PrisonView; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const p = state.justice?.prison;
  if (!p) return null;
  if (running)
    return (
      <Escape
        edge={JU.escapeEdge(state)}
        onDone={(ok, stage) => {
          setRunning(false);
          escapeDone(ok, stage);
          onClose();
        }}
      />
    );
  const st = JU.prisonStatus(state);
  const life = p.sentence === null;
  const plan = [
    { ok: p.plan.rota, label: "Guard rota", how: "Listen to the old-timers in the yard" },
    { ok: p.plan.tool, label: "Hacksaw blade", how: "Pocket a tool in the workshop" },
    { ok: p.plan.disguise, label: "Warder's uniform", how: "Laundry duty in the mess hall" },
    { ok: p.plan.warder, label: "A warder who looks away", how: `Bribe a warder in the visiting room (${naira(JU.WARDER_PRICE)})` },
  ];
  return (
    <Sheet title={view === "escape" ? "🧱 The east wall" : view === "bunk" ? "🛏️ Your bunk" : "📋 Your sentence"} onClose={onClose}>
      {state.toast ? <p className="mb-3 rounded-xl bg-white/10 p-3 text-sm font-semibold">{state.toast}</p> : null}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-xs text-slate-400">Sentence</p>
          <p className="font-bold">{life ? "Life" : `${p.sentence} days`}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-xs text-slate-400">{life ? "Served" : "Days left"}</p>
          <p className="font-bold">{life ? `${p.served} days` : `${st.left}`}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-xs text-slate-400">Behaviour</p>
          <p className="font-bold">{p.behaviour}/100</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-xs text-slate-400">Workshop wages</p>
          <p className="font-bold">{naira(p.wages)}</p>
        </div>
      </div>
      {!life ? <p className="mt-2 text-xs text-slate-400">{st.remission ? "Good behaviour: a third off your sentence. Keep it at 60 or more." : "Get your behaviour to 60 for a third off (work, study, chapel, exercise)."}</p> : <p className="mt-2 text-xs text-amber-300">Life means life, unless an appeal (visiting room), a pardon from a powerful friend, or the east wall says otherwise.</p>}
      {p.solitary ? <p className="mt-2 rounded-xl bg-rose-500/10 p-2 text-sm text-rose-200">In solitary for {p.solitary} more day{p.solitary === 1 ? "" : "s"}.</p> : null}

      {view === "bunk" ? (
        <div className="mt-4 grid gap-2">
          <button type="button" className={`${btnPrimary} min-h-12`} onClick={() => prisonSleepNow(1)}>
            Sleep until morning
          </button>
          <button type="button" className={`${btnGhost} min-h-12`} onClick={() => prisonSleepNow(7)}>
            Keep your head down for a week (meals, work, yard)
          </button>
          {life ? (
            <button type="button" className={`${btnGhost} min-h-12 text-rose-200`} onClick={() => acceptLifeSentence()}>
              Accept your fate (ends your story)
            </button>
          ) : null}
        </div>
      ) : null}

      {view === "escape" || view === "status" ? (
        <div className="mt-4">
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Escape plan</p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {plan.map((x) => (
              <li key={x.label} className="flex items-start gap-2">
                <span>{x.ok ? "✅" : "⬜"}</span>
                <span>
                  <b>{x.label}</b>
                  {x.ok ? null : <span className="block text-xs text-slate-400">{x.how}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">Suspicion {p.suspicion}/100. The higher it is, the likelier a cell search finds what you've hidden.</p>
          {view === "escape" ? (
            <>
              <p className="mt-3 text-sm text-amber-200">Three hard stages: the floodlight, the fence and the bush. Each piece of the plan makes one easier. Get caught and it's solitary{life ? "" : ", 60 more days"} and the plan is lost.</p>
              <button type="button" disabled={p.solitary > 0 || state.slot < 2} className={`${btnPrimary} mt-3 min-h-12 w-full disabled:opacity-50`} onClick={() => setRunning(true)}>
                {p.solitary > 0 ? "Not from solitary" : state.slot < 2 ? "Wait for night (after the evening count)" : "Go over the wall tonight"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}

// ── The Legal app ────────────────────────────────────────────────────────────

export function LegalApp({ state }: { state: GameState }) {
  const j = state.justice;
  const items = JU.evidenceItems(state);
  const efcc = state.life?.efcc;
  const low = JU.layingLow(state) ? j?.layLow : null;
  return (
    <div className="grid gap-4 text-sm">
      {j?.fugitive ? (
        <div className="rounded-2xl bg-rose-900/60 p-4">
          <p className="font-bold">🚨 Wanted</p>
          <p className="mt-1 text-slate-200">Police are looking for you until day {j.fugitive.cold}. Lay low to make it harder for them, or turn yourself in for a lighter view.</p>
          <button type="button" className={`${btnGhost} mt-3 min-h-11 w-full`} onClick={() => turnIn()}>
            Turn yourself in
          </button>
        </div>
      ) : null}
      <div className="rounded-2xl bg-white/5 p-4">
        <p className="font-bold">📁 Your file</p>
        <p className="mt-1 text-slate-300">{efcc ? `There's an open EFCC case. Evidence: ${strength(efcc.evidence)} (${efcc.evidence}).` : state.flags.fraud ? "No open case yet, but there's evidence out there." : "No open case."}</p>
        <p className="mt-1 text-xs text-slate-400">Heat {state.stats.heat}/100</p>
      </div>
      {low ? (
        <div className="rounded-2xl bg-sky-900/50 p-4">
          <p className="font-bold">🤫 Laying low until day {low.until}</p>
          <p className="mt-1 text-slate-300">No fraud jobs, no big purchases, no posting your life online. When it ends, the evidence cools and you keep your perks.</p>
          <button type="button" className={`${btnGhost} mt-3 min-h-10 w-full`} onClick={() => endLayLow()}>
            Stop laying low
          </button>
        </div>
      ) : null}
      <div>
        <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Evidence against you</p>
        {items.length ? (
          <div className="mt-2 grid gap-2">
            {items.map((e) => (
              <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="font-semibold">{e.name}</p>
                {e.perk ? <p className="text-xs text-amber-300">Destroying it costs you: {e.perk}</p> : null}
                {e.cooling ? (
                  <p className="mt-1 text-xs text-sky-300">Cooling while you lay low.</p>
                ) : (
                  <button type="button" disabled={state.stats.money < e.price || Boolean(j?.case)} className={`${btnGhost} mt-2 min-h-10 w-full disabled:opacity-50`} onClick={() => evidenceClear(e.id)}>
                    {e.how}
                    {e.price ? ` (${naira(e.price)})` : ""}
                  </button>
                )}
              </div>
            ))}
            {!low ? (
              <div className="rounded-xl border border-sky-400/30 bg-sky-500/5 p-3">
                <p className="text-xs text-slate-300">Want to keep the perks? Lay low for 14 days instead: the evidence cools without destroying anything.</p>
                <button type="button" className={`${btnPrimary} mt-2 min-h-10 w-full`} onClick={() => layLow()}>
                  Lay low for 14 days
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-slate-400">Nothing that could hurt you. Keep it that way.</p>
        )}
        <p className="mt-2 text-[11px] text-slate-500">Destroying evidence isn't safe: whoever you pay might talk.</p>
      </div>
      <div>
        <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Criminal record</p>
        {j?.record.length ? (
          <ul className="mt-2 grid gap-1">
            {j.record.map((r, n) => (
              <li key={n} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                <span>{JU.CHARGES[r.charge].name}</span>
                <span className="text-slate-400">
                  {r.outcome} · day {r.day}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-slate-400">Clean.</p>
        )}
      </div>
    </div>
  );
}
