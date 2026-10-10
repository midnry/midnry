import { useState } from "react";
import { IELTS, IELTS_FEE, ROUTES, bandText, chance, ieltsPaper, missing, type RouteId } from "../systems/japa";
import { japaApply, japaIelts, japaLeave, japaReset } from "../systems/engine";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { btnGhost, btnPrimary } from "./theme";

/** Planning your move abroad: routes, the IELTS, the application and the airport. */
export function JapaApp({ state }: { state: GameState }) {
  const j = state.japa ?? { route: null, ielts: 0, status: "none" as const, decisionDay: 0, tries: 0 };
  const [testing, setTesting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (testing) return <IeltsTest state={state} onDone={() => setTesting(false)} />;
  const active = j.route ? ROUTES[j.route] : null;
  return (
    <div className="grid gap-3 text-sm">
      {state.toast ? <p className="rounded-xl bg-white/10 p-3 font-semibold">{state.toast}</p> : null}

      {j.status === "applied" && active ? (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3">
          <p className="font-bold">
            {active.icon} Waiting for the decision: {active.name}
          </p>
          <p className="mt-1 text-xs text-slate-300">Expected in about {Math.max(1, j.decisionDay - state.day)} day(s). Sleep and check back.</p>
        </div>
      ) : null}
      {j.status === "approved" && active ? (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-3">
          <p className="font-bold">✅ Approved: {active.city}</p>
          <p className="mt-1 text-xs text-slate-300">
            {j.route === "agent" ? "Papers from Uncle Dayo. If you go, you go on borrowed luck." : "Your visa is in your passport."} The flight costs {naira(active.ticket)}. Leaving ends this life in Abuja.
          </p>
          {confirmLeave ? (
            <div className="mt-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3" role="alertdialog" aria-label="Leave Abuja?">
              <p className="font-semibold">Leave for good?</p>
              <p className="mt-1 text-xs text-slate-300">This ends {state.name}'s life in Abuja and shows how the story ended. You can't come back to this life.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" className={`${btnGhost} min-h-11`} onClick={() => setConfirmLeave(false)} autoFocus>
                  Stay a bit longer
                </button>
                <button type="button" className={`${btnPrimary} min-h-11`} onClick={() => japaLeave()}>
                  ✈️ Yes, leave
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={`${btnPrimary} mt-2 min-h-11 w-full`} onClick={() => setConfirmLeave(true)}>
              ✈️ Buy the ticket and go
            </button>
          )}
        </div>
      ) : null}
      {j.status === "refused" || j.status === "scammed" ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-3">
          <p className="font-bold">{j.status === "scammed" ? "📵 Scammed by the agent" : "❌ Visa refused"}</p>
          <button type="button" className={`${btnGhost} mt-2 min-h-10 w-full`} onClick={() => japaReset()}>
            Start again
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p>
            <span className="text-slate-400">IELTS:</span> <b>{bandText(j.ielts)}</b>
          </p>
          <button type="button" className={`${btnGhost} min-h-10 px-3 text-xs`} onClick={() => setTesting(true)} disabled={state.stats.money < IELTS_FEE}>
            📝 Sit the IELTS · {naira(IELTS_FEE)}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Degree: {state.certs.degree ? "✓" : "✗"} · In the bank: {naira(state.stats.money)}
        </p>
      </div>

      {(Object.keys(ROUTES) as RouteId[]).map((id) => {
        const r = ROUTES[id];
        const need = missing(state, id);
        const busy = j.status === "applied" || j.status === "approved";
        return (
          <div key={id} className={`rounded-2xl border p-3 ${id === "agent" ? "border-amber-400/30 bg-amber-400/5" : "border-white/10 bg-white/5"}`}>
            <p className="font-bold">
              {r.icon} {r.name}
            </p>
            <p className="text-xs text-slate-400">To {r.city}</p>
            <p className="mt-1 text-xs text-pretty text-slate-300">{r.blurb}</p>
            <ul className="mt-2 grid gap-0.5 text-xs">
              {r.degree ? <li>{state.certs.degree ? "✓" : "✗"} Degree</li> : null}
              {r.ielts ? (
                <li>
                  {j.ielts >= r.ielts ? "✓" : "✗"} IELTS {bandText(r.ielts)}
                </li>
              ) : null}
              {r.funds ? <li>{state.stats.money >= r.funds + r.fee ? "✓" : "✗"} Proof of funds {naira(r.funds)}</li> : null}
              <li>
                Fee {naira(r.fee)}
                {r.ticket ? ` · flight ${naira(r.ticket)}` : ""}
              </li>
              {!need.length ? <li className="text-emerald-300">Your chances: about {Math.round(chance(state, id) * 100)}%</li> : null}
            </ul>
            <button type="button" className={`${id === "agent" ? btnGhost : btnPrimary} mt-2 min-h-10 w-full`} disabled={busy || need.length > 0} onClick={() => japaApply(id)}>
              {need.length ? "Not ready yet" : id === "agent" ? "Pay Uncle Dayo" : "Apply"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Eight questions; the band follows from how many you get right. */
function IeltsTest({ state, onDone }: { state: GameState; onDone: () => void }) {
  const [paper] = useState(() => ieltsPaper());
  const [answers, setAnswers] = useState<(number | null)[]>(() => paper.map(() => null));
  const done = answers.every((a) => a !== null);
  return (
    <div className="grid gap-3 text-sm">
      <p className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">
        IELTS Academic, at the test centre in Wuse 2. Eight questions. Fee {naira(IELTS_FEE)}, one time slot. {state.skills.education >= 40 ? "Your schooling gives you an edge." : ""}
      </p>
      <ol className="grid gap-3">
        {paper.map((qi, n) => {
          const q = IELTS[qi]!;
          return (
            <li key={qi} className="rounded-xl bg-white/5 p-3">
              <p className="font-semibold">
                {n + 1}. {q.q}
              </p>
              <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label={`Question ${n + 1}`}>
                {q.options.map((o, oi) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={answers[n] === oi}
                    onClick={() => setAnswers((a) => a.map((x, i) => (i === n ? oi : x)))}
                    className={`min-h-10 rounded-lg border px-3 text-left text-sm ${answers[n] === oi ? "border-sky-400 bg-sky-400/15" : "border-white/10 bg-black/20 hover:bg-white/10"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={`${btnGhost} min-h-11`} onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className={`${btnPrimary} min-h-11`}
          disabled={!done}
          onClick={() => {
            japaIelts(paper.filter((qi, n) => IELTS[qi]!.answer === answers[n]).length);
            onDone();
          }}
        >
          Submit the paper
        </button>
      </div>
    </div>
  );
}
