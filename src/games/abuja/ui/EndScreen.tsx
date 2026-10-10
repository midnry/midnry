import { myLooks } from "../systems/painted";
import { ENDINGS, job } from "../systems/data";
import { naira, netWorth } from "../systems/rules";
import { partnerName } from "../systems/romance";
import { deleteSave, replace } from "../systems/store";
import type { GameState } from "../systems/types";
import { Avatar } from "./Avatar";
import { Screen } from "./Menus";
import { btnGhost, btnPrimary, panel } from "./theme";
import { childGender, inheritance } from "../systems/family";
import { startHeir } from "../systems/engine";
import { bizDef, bizWorth } from "../systems/business";
import { ShareLife } from "./Fame";

export function EndScreen({ state, signedIn = false }: { state: GameState; signedIn?: boolean }) {
  const ending = ENDINGS[state.ending ?? "broke"];
  const familyBiz = (state.life?.businesses ?? []).map((b) => `the ${bizDef(b.id)?.name ?? "business"} (level ${b.level})`);
  const ownsProperty = Object.values(state.city?.lots ?? {}).some((l) => l.owned);
  const certs = [state.certs.waec && "WAEC", state.certs.degree && "Degree", state.certs.nysc && "NYSC"].filter(Boolean).join(", ") || "None";
  return (
    <Screen>
      <div className={`${panel} mx-auto max-w-2xl overflow-hidden`}>
        <div className="p-6 sm:p-8" style={{ background: `linear-gradient(135deg, ${ending.color}55, transparent 70%)` }}>
          <p className="text-xs font-semibold tracking-[0.3em] text-slate-300 uppercase">
            The end of {state.name}'s story{Number(state.flags.generation ?? 1) > 1 ? ` · Generation ${state.flags.generation}` : ""}
          </p>
          <h1 className="mt-2 font-display text-5xl tracking-tight">{ending.title}</h1>
          <p className="mt-4 text-lg text-pretty text-slate-200">{ending.text}</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <Avatar looks={myLooks(state)} size={110} adult={state.age >= 18} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-slate-400">Started as</dt>
            <dd>{state.background === "lapo" ? "Lapo Baby" : "Average family"}</dd>
            <dt className="text-slate-400">Age</dt>
            <dd>{Math.floor(state.age)}</dd>
            <dt className="text-slate-400">Net worth</dt>
            <dd className="font-semibold">{naira(netWorth(state))}</dd>
            <dt className="text-slate-400">Last job</dt>
            <dd>{job(state.job)?.title ?? "None"}</dd>
            <dt className="text-slate-400">Certificates</dt>
            <dd>{certs}</dd>
            <dt className="text-slate-400">Network</dt>
            <dd>{state.stats.network}</dd>
          </dl>
        </div>
        {Object.keys(state.partners).length || state.children.length ? (
          <div className="border-t border-white/10 p-6 sm:p-8">
            <h2 className="font-display text-2xl">Family and love</h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-300">
              {Object.values(state.partners)
                .filter((p) => p.status !== "met")
                .map((p) => (
                  <li key={p.id}>
                    {partnerName(state, p.id)}: {p.status === "ex" ? "ex" : p.status} ({p.personality})
                  </li>
                ))}
              {state.children.map((child) => (
                <li key={child.name}>
                  Child: {child.name}, with {partnerName(state, child.with)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="border-t border-white/10 p-6 sm:p-8">
          <h2 className="font-display text-2xl">The moments that decided it</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            {state.log.map((item) => (
              <li key={item.text}>
                <span className="text-slate-500">Age {item.age} · </span>
                {item.text}
              </li>
            ))}
          </ol>
          <ShareLife state={state} signedIn={signedIn} />
          {state.children.length ? (
            <div className="mt-8 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
              <p className="font-display text-xl">Continue the family story</p>
              <p className="mt-1 text-sm text-slate-300">
                Live on as one of your children, born into this family. They inherit {naira(inheritance(netWorth(state) - bizWorth(state)))}, held in trust until they turn 18.
                {familyBiz.length || ownsProperty ? ` A manager runs ${[familyBiz.join(", "), ownsProperty ? "the family property" : ""].filter(Boolean).join(" and ")} until then, and it's theirs at 18.` : ""}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {state.children.map((c) => (
                  <button key={c.name} type="button" className={`${btnPrimary} min-h-11`} onClick={() => startHeir(state, c.name)}>
                    {childGender(c) === "female" ? "👧" : "👦"} Live as {c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className={`${state.children.length ? btnGhost : btnPrimary} mt-6`}
            onClick={() => {
              deleteSave();
              replace(null);
            }}
          >
            Live another life
          </button>
        </div>
      </div>
    </Screen>
  );
}
