import { myLooks } from "../systems/painted";
import { chapter } from "../systems/data";
import { choose, continueStory, payFixer, pickSport } from "../systems/engine";
import { fill, lockReason, naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { HOUSES, SPORTS, bracket, intelligence, sportOf, sportOptions, strength } from "../systems/tournament";
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
            <Avatar looks={myLooks(state)} size={52} crop="head" adult={state.age >= 18} />
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
                <ChatBubble name={speaker} looks={speakerLook(speaker, state.chapter ?? undefined, scene.speaker === "{love}" ? state.loveGender : undefined).look} adult={speakerLook(speaker, state.chapter ?? undefined, scene.speaker === "{love}" ? state.loveGender : undefined).adult} painted={speakerLook(speaker, state.chapter ?? undefined, scene.speaker === "{love}" ? state.loveGender : undefined).painted}>
                  {fill(state, scene.text)}
                </ChatBubble>
              ) : (
                <p className="text-lg leading-relaxed text-pretty">{fill(state, scene.text)}</p>
              )}
              {scene.special === "fixers" ? <Fixers state={state} /> : null}
              {scene.special === "tourney" ? <SportPicker state={state} /> : null}
              {scene.special === "bracket" || scene.special === "tourney" ? <Bracket state={state} /> : null}
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

/** The interhouse football bracket: semi-finals, the final and the match for third. */
function Bracket({ state }: { state: GameState }) {
  const b = bracket(state);
  const played = Boolean(b.semi);
  const iWon = b.semi === "won";
  const finalists = played ? [iWon ? b.mine : b.semiRival, b.otherWinner] : [null, null];
  const thirds = played ? [iWon ? b.semiRival : b.mine, b.otherLoser] : [null, null];
  // If you went out in the semi, the final between the others is settled when your third-place match is.
  const champion = b.final ? (b.final === "won" ? b.mine : b.otherWinner) : b.third ? b.neutralChampion : null;
  const Team = ({ id, win, me }: { id: string | null; win?: boolean; me?: boolean }) => (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${win ? "bg-emerald-500/20 font-bold" : "bg-white/5"} ${me ? "ring-1 ring-amber-300/70" : ""}`}>
      <span className="size-3 shrink-0 rounded-full border border-white/40" style={{ background: id ? HOUSES[id]?.color : "transparent" }} aria-hidden />
      <span className="truncate">{id ? HOUSES[id]?.name : "To be decided"}</span>
      {me ? <span className="ml-auto text-[10px] font-bold text-amber-300 uppercase">You</span> : null}
    </div>
  );
  const semiWinner = played ? (iWon ? b.mine : b.semiRival) : null;
  return (
    <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-3" aria-label={`Tournament bracket: ${SPORTS[sportOf(state)].name}`}>
      <p className="text-xs font-bold tracking-wide text-amber-300 uppercase sm:col-span-3">
        {SPORTS[sportOf(state)].icon} Inter-house {SPORTS[sportOf(state)].name}
      </p>
      <div className="grid gap-2">
        <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Semi-finals</p>
        <div className="grid gap-1">
          <Team id={b.mine} me win={semiWinner === b.mine} />
          <Team id={b.semiRival} win={semiWinner === b.semiRival} />
        </div>
        <div className="grid gap-1">
          <Team id={b.other[0]} win={played && b.otherWinner === b.other[0]} />
          <Team id={b.other[1]} win={played && b.otherWinner === b.other[1]} />
        </div>
      </div>
      <div className="grid content-start gap-2">
        <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Final 🏆</p>
        <div className="grid gap-1">
          <Team id={finalists[0]} me={finalists[0] === b.mine} win={Boolean(champion) && champion === finalists[0]} />
          <Team id={finalists[1]} win={Boolean(champion) && champion === finalists[1]} />
        </div>
      </div>
      <div className="grid content-start gap-2">
        <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Third place 🥉</p>
        <div className="grid gap-1">
          <Team id={thirds[0]} me={thirds[0] === b.mine} win={b.third === "won" && thirds[0] === b.mine} />
          <Team id={thirds[1]} win={b.third === "lost" && thirds[1] === b.otherLoser} />
        </div>
      </div>
    </div>
  );
}

/** The house captain's pick: your best sport by strength or brains, and any others you're good enough to ask for. */
function SportPicker({ state }: { state: GameState }) {
  const { best, options } = sportOptions(state);
  const current = sportOf(state);
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        <span>
          💪 Strength <b className="tabular-nums text-white">{strength(state)}</b>
        </span>
        <span>
          🧠 Intelligence <b className="tabular-nums text-white">{intelligence(state)}</b>
        </span>
      </div>
      <p className="mt-2 text-sm text-pretty">
        The captain picked you for <b>{SPORTS[best].icon} {SPORTS[best].name}</b>: {SPORTS[best].reason}.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Your sport">
        {options.map((o) => {
          const sp = SPORTS[o.id];
          const on = current === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!o.open}
              title={o.open ? undefined : sp.locked}
              onClick={() => pickSport(o.id)}
              className={`rounded-xl border p-2 text-left text-xs transition disabled:opacity-45 ${on ? "border-amber-300 bg-amber-300/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
            >
              <span className="block text-lg leading-none" aria-hidden>
                {sp.icon}
              </span>
              <span className="mt-1 block font-bold first-letter:uppercase">{sp.name}</span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-emerald-400" style={{ width: `${o.fit}%` }} />
              </span>
              <span className="mt-1 block text-[10px] text-slate-400">{o.open ? (o.id === best ? "Captain's pick" : "You can ask") : "Not picked"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
