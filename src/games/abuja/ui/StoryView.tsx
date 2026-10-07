import { chapter } from "../systems/data";
import { choose, continueStory, payFixer } from "../systems/engine";
import { fill, lockReason, naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { speakerLook } from "../systems/peoplelook";
import { Avatar } from "./Avatar";
import { ChatBubble } from "./Chat";
import { Screen } from "./Menus";
import { btnGhost, btnPrimary, panel } from "./theme";

const STAGE_TINT: Record<string, string> = {
  primary: "from-sky-500/20",
  secondary: "from-emerald-500/20",
  university: "from-violet-500/20",
  nysc: "from-lime-500/25",
  adult: "from-sky-500/20",
};

export function StoryView({ state }: { state: GameState }) {
  return (
    <Screen>
      <StoryPanel state={state} />
    </Screen>
  );
}

/** The story card: a scene's text and choices, or the result of the last choice. */
export function StoryPanel({ state }: { state: GameState }) {
  const def = chapter(state.chapter ?? "");
  const scene = def?.scenes[state.scene ?? ""];
  if (!def || !scene) return null;
  const speaker = scene.speaker ? fill(state, scene.speaker) : null;

  return (
    <>
      <div className={`mx-auto max-w-2xl rounded-3xl bg-gradient-to-b ${STAGE_TINT[def.stage] ?? ""} to-transparent p-1`}>
        <div className={`${panel} p-5 sm:p-8`}>
          <div className="flex items-center gap-3">
            <Avatar looks={state.looks} size={52} crop="head" adult={state.age >= 18} />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest text-sky-400 uppercase">{def.title}</p>
              <p className="text-sm text-slate-400">
                {state.name} · age {Math.floor(state.age)} · {naira(state.stats.money)}
              </p>
            </div>
          </div>

          {state.result ? (
            <div className="mt-6">
              <p className="text-lg leading-relaxed whitespace-pre-line text-pretty">{state.result}</p>
              <button type="button" className={`${btnPrimary} mt-6`} onClick={continueStory} autoFocus>
                Continue
              </button>
            </div>
          ) : (
            <div className="mt-6">
              {speaker ? (
                <ChatBubble name={speaker} looks={speakerLook(speaker, state.chapter ?? undefined).look} adult={speakerLook(speaker, state.chapter ?? undefined).adult} painted={speakerLook(speaker, state.chapter ?? undefined).painted}>
                  {fill(state, scene.text)}
                </ChatBubble>
              ) : (
                <p className="text-lg leading-relaxed text-pretty">{fill(state, scene.text)}</p>
              )}
              {scene.special === "fixers" ? <Fixers state={state} /> : null}
              <div className="mt-6 grid gap-2">
                {(scene.choices ?? []).map((item) => {
                  const reason = lockReason(state, item);
                  const ok = !reason;
                  if (!ok && !item.lockedText && !reason?.startsWith("Needs ₦")) return null;
                  return (
                    <button
                      key={item.text}
                      type="button"
                      disabled={!ok}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-blue-400/60 hover:bg-white/10 disabled:opacity-45"
                      onClick={() => choose(item)}
                    >
                      <span className="font-medium">{fill(state, item.text)}</span>
                      {!ok ? <span className="mt-0.5 block text-xs text-slate-400">🔒 {reason}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Fixers({ state }: { state: GameState }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {state.fixers.map((fixer, index) => (
        <div key={fixer.name} className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-lg tracking-widest text-sky-400" aria-label={`${fixer.stars} out of 5 stars`}>
            {"★".repeat(fixer.stars)}
            <span className="text-slate-600">{"★".repeat(5 - fixer.stars)}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="size-8 rounded-full" style={{ background: fixer.color }} aria-hidden />
            <p className="font-semibold">{fixer.name}</p>
          </div>
          <p className="mt-2 text-sm text-slate-300 italic">“{fixer.line.replace("{price}", fixer.price.toLocaleString("en"))}”</p>
          <button
            type="button"
            className={`${btnGhost} mt-3 w-full`}
            disabled={state.stats.money < fixer.price}
            onClick={() => payFixer(index)}
          >
            Pay {naira(fixer.price)}
          </button>
        </div>
      ))}
      <p className="text-xs text-slate-500 sm:col-span-2">Paying a fixer is illegal. It adds a little Heat, whether it works or not.</p>
    </div>
  );
}
