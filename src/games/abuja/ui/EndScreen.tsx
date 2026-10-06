import { ENDINGS, job } from "../systems/data";
import { naira, netWorth } from "../systems/rules";
import { deleteSave, replace } from "../systems/store";
import type { GameState } from "../systems/types";
import { Avatar } from "./Avatar";
import { Screen } from "./Menus";
import { btnPrimary, panel } from "./theme";

export function EndScreen({ state }: { state: GameState }) {
  const ending = ENDINGS[state.ending ?? "broke"];
  const certs = [state.certs.waec && "WAEC", state.certs.degree && "Degree", state.certs.nysc && "NYSC"].filter(Boolean).join(", ") || "None";
  return (
    <Screen>
      <div className={`${panel} mx-auto max-w-2xl overflow-hidden`}>
        <div className="p-6 sm:p-8" style={{ background: `linear-gradient(135deg, ${ending.color}55, transparent 70%)` }}>
          <p className="text-xs font-semibold tracking-[0.3em] text-stone-300 uppercase">The end of {state.name}'s story</p>
          <h1 className="mt-2 font-display text-5xl tracking-tight">{ending.title}</h1>
          <p className="mt-4 text-lg text-pretty text-stone-200">{ending.text}</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <Avatar looks={state.looks} size={110} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-stone-400">Started as</dt>
            <dd>{state.background === "lapo" ? "Lapo Baby" : "Average family"}</dd>
            <dt className="text-stone-400">Age</dt>
            <dd>{Math.floor(state.age)}</dd>
            <dt className="text-stone-400">Net worth</dt>
            <dd className="font-semibold">{naira(netWorth(state))}</dd>
            <dt className="text-stone-400">Last job</dt>
            <dd>{job(state.job)?.title ?? "None"}</dd>
            <dt className="text-stone-400">Certificates</dt>
            <dd>{certs}</dd>
            <dt className="text-stone-400">Network</dt>
            <dd>{state.stats.network}</dd>
          </dl>
        </div>
        <div className="border-t border-white/10 p-6 sm:p-8">
          <h2 className="font-display text-2xl">The moments that decided it</h2>
          <ol className="mt-3 space-y-2 text-sm text-stone-300">
            {state.log.map((item) => (
              <li key={item.text}>
                <span className="text-stone-500">Age {item.age} · </span>
                {item.text}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={`${btnPrimary} mt-8`}
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
