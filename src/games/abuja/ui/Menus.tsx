import { useState } from "react";
import { PRESETS, type Look } from "../systems/character";
import type { Background, Gender, Interest, Looks } from "../systems/types";
import { Avatar } from "./Avatar";
import { Dresser } from "./Dresser";
import { btnGhost, btnPrimary, panel } from "./theme";

export function AgeGate({ onPass }: { onPass: () => void }) {
  const [refused, setRefused] = useState(false);
  return (
    <Screen>
      <div className={`${panel} mx-auto max-w-md p-6 text-center`}>
        <p className="text-5xl">🔞</p>
        <h1 className="mt-3 font-display text-3xl">Mature audiences only</h1>
        <p className="mt-3 text-sm text-pretty text-slate-300">
          Abuja Hustle is satire for adults. It deals with money, debt, crime, relationships, pregnancy, death and violence. Nothing
          explicit, but it does not look away.
        </p>
        {refused ? (
          <p className="mt-5 text-sm text-blue-300">This game is for adults 18 and over. Come back when you're older.</p>
        ) : (
          <div className="mt-6 grid gap-2">
            <button type="button" className={btnPrimary} onClick={onPass}>
              I am 18 or older
            </button>
            <button type="button" className={btnGhost} onClick={() => setRefused(true)}>
              I am under 18
            </button>
          </div>
        )}
      </div>
    </Screen>
  );
}

export function Title({
  hasSave,
  signedInAs,
  onNew,
  onContinue,
}: {
  hasSave: boolean;
  signedInAs: string | null;
  onNew: () => void;
  onContinue: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Screen>
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm font-semibold tracking-[0.3em] text-blue-400 uppercase">A life sim · Abuja, Nigeria</p>
        <h1 className="mt-3 font-display text-6xl tracking-tight text-balance sm:text-7xl">Abuja Hustle</h1>
        <p className="mx-auto mt-4 max-w-sm text-pretty text-slate-300">
          No inheritance. No uncle in government. Just you, the city, and the dream of financial freedom.
        </p>
        <div className="mx-auto mt-8 grid max-w-xs gap-2">
          {hasSave ? (
            <button type="button" className={btnPrimary} onClick={onContinue}>
              Continue
            </button>
          ) : null}
          {hasSave && !confirm ? (
            <button type="button" className={btnGhost} onClick={() => setConfirm(true)}>
              New life
            </button>
          ) : (
            <button type="button" className={hasSave ? `${btnGhost} ring-1 ring-red-400` : btnPrimary} onClick={onNew}>
              {hasSave ? "Yes, start over (deletes your save)" : "Start a new life"}
            </button>
          )}
        </div>
        <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          {signedInAs ? (
            <p className="text-slate-300">
              ✓ Signed in as <span className="font-semibold text-white">{signedInAs}</span>. Your progress saves to your account and follows
              you to any device.
            </p>
          ) : (
            <>
              <p className="text-slate-300">Free to play. Sign in to save your progress to your account and continue on any device.</p>
              <a href="/login?intent=sign-in&next=/games/abuja-hustle" className={`${btnPrimary} mt-3 w-full`}>
                Sign in to save progress
              </a>
              <p className="mt-2 text-xs text-slate-500">Playing without signing in keeps your progress on this device only.</p>
            </>
          )}
        </div>
        <p className="mt-10 text-xs text-slate-500">
          All characters, parties, companies and lenders are fictional. Satire of systems, not of ordinary people.
        </p>
      </div>
    </Screen>
  );
}

export function Creator({
  onDone,
}: {
  onDone: (input: { name: string; gender: Gender; background: Background; looks: Looks; interest: Interest }) => void;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [background, setBackground] = useState<Background>("lapo");
  const [interest, setInterest] = useState<Interest>("men");
  const [look, setLook] = useState<Look>(PRESETS.female);
  const [dressed, setDressed] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");
  const ready = name.trim().length >= 2;

  return (
    <Screen>
      <div className={`${panel} mx-auto w-full max-w-3xl p-5 sm:p-8`}>
        <h1 className="font-display text-3xl tracking-tight">Who are you?</h1>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-3xl bg-gradient-to-b from-blue-200/20 to-transparent p-3">
              <Avatar looks={look} size={150} side={side} />
            </div>
            <button type="button" className="text-xs text-slate-400 underline-offset-2 hover:underline" onClick={() => setSide(side === "front" ? "back" : "front")}>
              ↻ {side === "front" ? "See the back" : "See the front"}
            </button>
            <p className="font-semibold">{name.trim() || "Your name"}</p>
            <p className="text-xs text-slate-400">{background === "lapo" ? "Lapo Baby" : "Average family"}</p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-5">
            <label className="block">
              <span className="text-sm text-slate-300">Name</span>
              <input
                className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-base outline-none focus:border-blue-400"
                value={name}
                maxLength={20}
                placeholder="e.g. Chiamaka, Musa, Tobi"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <Pick label="Gender">
              {(["female", "male"] as const).map((item) => (
                <Chip
                  key={item}
                  on={gender === item}
                  onClick={() => {
                    setGender(item);
                    setInterest(item === "female" ? "men" : "women");
                    // Until you start dressing up, the preview follows the choice.
                    if (!dressed) setLook(PRESETS[item]);
                  }}
                >
                  {item === "female" ? "Woman" : "Man"}
                </Chip>
              ))}
            </Pick>
            <Pick label="Romantically interested in (adult chapters only)">
              {(["men", "women", "both"] as const).map((item) => (
                <Chip key={item} on={interest === item} onClick={() => setInterest(item)}>
                  {item === "men" ? "Men" : item === "women" ? "Women" : "Both"}
                </Chip>
              ))}
            </Pick>
            <div>
              <p className="mb-2 text-sm text-slate-300">Style</p>
              <Dresser
                look={look}
                onChange={(next) => {
                  setLook(next);
                  setDressed(true);
                }}
              />
            </div>
          </div>
        </div>

        <h2 className="mt-8 font-display text-2xl">Where you start</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <BackgroundCard
            on={background === "lapo"}
            onClick={() => setBackground("lapo")}
            title="Lapo Baby"
            lines={["One room in Nyanya. Garri without sugar when things are tight.", "Very little money, hand-me-downs, frequent hardship.", "Higher Hustle. Stress hits you less hard."]}
          />
          <BackgroundCard
            on={background === "average"}
            onClick={() => setBackground("average")}
            title="Average family"
            lines={["Civil servant father, trader mother, a flat in Gwarinpa.", "Modest money, fewer hardships.", "Balanced stats."]}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">Nepo Baby is not an option. That's the point.</p>
        <button
          type="button"
          className={`${btnPrimary} mt-6 w-full sm:w-auto`}
          disabled={!ready}
          onClick={() => onDone({ name: name.trim(), gender, background, looks: { ...look, outfit: look.topColor }, interest })}
        >
          Begin life in Abuja
        </button>
      </div>
    </Screen>
  );
}

function BackgroundCard({ on, onClick, title, lines }: { on: boolean; onClick: () => void; title: string; lines: string[] }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${on ? "border-blue-400 bg-blue-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
    >
      <p className="font-display text-xl">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-slate-300">
        {lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </button>
  );
}

function Pick({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-slate-300">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-10 rounded-full px-4 text-sm font-medium ${on ? "bg-blue-600 text-white" : "bg-white/10 text-white hover:bg-white/15"}`}
    >
      {children}
    </button>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[radial-gradient(ellipse_at_top,#11265c,#05070c_60%)] px-4 py-10 text-white sm:py-16">
      {children}
    </div>
  );
}
