import { SCHOOLS, childAge, childGender, childStage, parentAge, parents, weeklyFees, type SchoolTier } from "../systems/family";
import { changeSchool, helpHomework, visitParents } from "../systems/engine";
import { committed, partnerName } from "../systems/romance";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { btnGhost, btnPrimary } from "./theme";

const STAGE_LABEL = { baby: "Baby", toddler: "Toddler", primary: "Primary school", secondary: "Secondary school", grown: "Grown up" } as const;

/** Your family: partner, children (school, grades, homework) and your parents (health, bond, a visit). */
export function FamilyApp({ state }: { state: GameState }) {
  const partner = committed(state);
  const p = state.parents ?? parents(structuredClone(state));
  return (
    <div className="grid gap-3 text-sm">
      {state.toast ? <p className="rounded-xl bg-white/10 p-3 font-semibold">{state.toast}</p> : null}

      <section className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-bold tracking-wide text-pink-300 uppercase">Partner</p>
        <p className="mt-1">{partner ? `${partnerName(state, partner.id)} · ${partner.status}` : "Single. Linkup is on your phone."}</p>
      </section>

      <section className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-bold tracking-wide text-sky-300 uppercase">Children</p>
        {state.children.length === 0 ? <p className="mt-1 text-slate-400">No children yet.</p> : null}
        <ul className="mt-2 grid gap-2">
          {state.children.map((c) => {
            const age = childAge(state, c);
            const stage = childStage(age);
            return (
              <li key={c.name} className="rounded-xl bg-black/20 p-3">
                <p className="font-bold">
                  {childGender(c) === "female" ? "👧" : "👦"} {c.name} <span className="font-normal text-slate-400">· {age} · {STAGE_LABEL[stage]}</span>
                </p>
                <p className="text-xs text-slate-400">With {partnerName(state, c.with)}</p>
                {c.school && !c.grown ? (
                  <>
                    <p className="mt-1 text-xs text-slate-300">
                      {SCHOOLS[c.school].name} · {naira(weeklyFees(c.school))} a week
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10" role="progressbar" aria-label={`${c.name}'s grades`} aria-valuenow={c.grades ?? 50} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full bg-emerald-400" style={{ width: `${c.grades ?? 50}%` }} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" className={`${btnGhost} min-h-10 text-xs`} onClick={() => helpHomework(c.name)}>
                        📚 Help with homework
                      </button>
                      <select
                        className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-2 text-xs"
                        value={c.school}
                        onChange={(e) => changeSchool(c.name, e.target.value as SchoolTier)}
                        aria-label={`Change ${c.name}'s school`}
                      >
                        {(Object.keys(SCHOOLS) as SchoolTier[]).map((t) => (
                          <option key={t} value={t}>
                            {SCHOOLS[t].name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}
                {c.grown ? <p className="mt-1 text-xs text-emerald-300">Living their own life{(c.grades ?? 50) >= 60 ? ", and sending money home now and then" : ""}.</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl bg-white/5 p-3">
        <p className="text-xs font-bold tracking-wide text-amber-300 uppercase">Your parents</p>
        <ul className="mt-2 grid gap-1">
          {(["mum", "dad"] as const).map((who) => (
            <li key={who} className="flex items-center justify-between gap-2">
              <span>
                {who === "mum" ? "Mum" : "Dad"} · {p[who].alive ? `${parentAge(state, who)}` : "passed away"}
              </span>
              {p[who].alive ? (
                <span className="flex w-24 items-center gap-1 text-[10px] text-slate-400">
                  Health
                  <span className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
                    <span className="block h-full bg-rose-400" style={{ width: `${p[who].health}%` }} />
                  </span>
                </span>
              ) : (
                <span aria-hidden>🕊️</span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">How close you are: {p.bond >= 70 ? "very close" : p.bond >= 40 ? "close" : "strained"}. They'll call when they need help (the black tax). Visiting keeps them well.</p>
        {p.mum.alive || p.dad.alive ? (
          <button type="button" className={`${btnPrimary} mt-2 min-h-10 w-full`} onClick={() => visitParents()}>
            🏠 Visit them (1 time slot)
          </button>
        ) : null}
      </section>
    </div>
  );
}
