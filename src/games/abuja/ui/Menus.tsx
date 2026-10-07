import { useState } from "react";
import { PRESETS, type Look, type View } from "../systems/character";
import type { Background, GameState, Gender, Interest, Looks } from "../systems/types";
import { SLOTS_MAX, SLOT_IDS, type Slot } from "../systems/store";
import { naira } from "../systems/rules";
import { Avatar } from "./Avatar";
import { PaintedGallery } from "./Wardrobe";
import { autoOutfit, myLooks, youngPainted } from "../systems/painted";
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
          <p className="mt-5 text-sm text-sky-300">This game is for adults 18 and over. Come back when you're older.</p>
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

const STAGE_LABEL: Record<string, string> = { primary: "Primary school", secondary: "Secondary school", university: "University", nysc: "NYSC", adult: "Adult life", ended: "Life over" };

/** When a save was last played, in words. */
function ago(t?: number): string {
  if (!t) return "";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export function Title({
  saves,
  last,
  signedInAs,
  onNew,
  onContinue,
  onDelete,
}: {
  saves: (GameState | null)[];
  last: Slot;
  signedInAs: string | null;
  onNew: (slot: Slot) => void;
  onContinue: (slot: Slot) => void;
  onDelete: (slot: Slot) => void;
}) {
  const [confirm, setConfirm] = useState<Slot | null>(null);
  return (
    <Screen>
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm font-semibold tracking-[0.3em] text-sky-400 uppercase">A life sim · Abuja, Nigeria</p>
        <h1 className="mt-3 font-display text-6xl tracking-tight text-balance sm:text-7xl">Abuja Hustle</h1>
        <p className="mx-auto mt-4 max-w-sm text-pretty text-slate-300">
          No inheritance. No uncle in government. Just you, the city, and the dream of financial freedom.
        </p>
        <p className="mt-8 text-xs font-semibold tracking-widest text-slate-400 uppercase">Your lives · up to {SLOTS_MAX}</p>
        <ul className="mx-auto mt-3 grid max-w-md gap-2 text-left">
          {SLOT_IDS.map((slot) => {
            const s = saves[slot - 1] ?? null;
            return (
              <li key={slot} className={`rounded-2xl border p-3 ${s && slot === last ? "border-blue-400/60 bg-blue-500/10" : "border-white/10 bg-white/5"}`}>
                {s ? (
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 overflow-hidden rounded-full bg-sky-100/10">
                      <Avatar looks={myLooks(s)} crop="head" size={52} adult={s.age >= 18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        Age {Math.floor(s.age)} · {STAGE_LABEL[s.stage] ?? s.stage} · {naira(s.stats.money)}
                      </p>
                      <p className="text-[11px] text-slate-500">Slot {slot}{s.savedAt ? ` · played ${ago(s.savedAt)}` : ""}</p>
                    </div>
                    {confirm === slot ? (
                      <div className="flex shrink-0 flex-col gap-1">
                        <button type="button" className="min-h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white" onClick={() => (onDelete(slot), setConfirm(null))}>
                          Delete
                        </button>
                        <button type="button" className="min-h-9 rounded-lg bg-white/10 px-3 text-xs" onClick={() => setConfirm(null)}>
                          Keep
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" className={`${btnPrimary} min-h-10 px-3`} onClick={() => onContinue(slot)}>
                          Continue
                        </button>
                        <button type="button" className="min-h-10 rounded-xl px-2.5 text-slate-400 hover:bg-white/10 hover:text-red-300" onClick={() => setConfirm(slot)} aria-label={`Delete ${s.name}'s life`} title="Delete">
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">Slot {slot} · empty</p>
                    <button type="button" className={`${saves.some(Boolean) ? btnGhost : btnPrimary} min-h-10 px-3`} onClick={() => onNew(slot)}>
                      Start a new life
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {confirm ? <p className="mt-2 text-xs text-red-300">Deleting a life can't be undone.</p> : null}
        <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          {signedInAs ? (
            <p className="text-slate-300">
              ✓ Signed in as <span className="font-semibold text-slate-100">{signedInAs}</span>. Your progress saves to your account and follows
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
  onBack,
}: {
  onBack?: () => void;
  onDone: (input: { name: string; gender: Gender; background: Background; looks: Looks; interest: Interest }) => void;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [background, setBackground] = useState<Background>("lapo");
  const [interest, setInterest] = useState<Interest>("men");
  const [look, setLook] = useState<Look>(PRESETS.female);
  const [view, setView] = useState<View>("front");
  const [grown, setGrown] = useState(false);
  /** The painted outfit for 18 and over: picked here, or matched to your look. */
  const [painted, setPainted] = useState<string | undefined>(undefined);
  const build = gender === "female" ? "fem" : "masc";
  const grownOutfit = painted ?? autoOutfit({ ...look, build, outfit: look.topColor });
  const ready = name.trim().length >= 2;

  return (
    <Screen>
      <div className={`${panel} mx-auto w-full max-w-3xl p-5 sm:p-8`}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl tracking-tight">Who are you?</h1>
          {onBack ? (
            <button type="button" className={btnGhost} onClick={onBack}>
              ← Back
            </button>
          ) : null}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-3xl bg-gradient-to-b from-sky-200/20 to-transparent p-3">
              <Avatar looks={{ ...look, outfit: look.topColor, painted: grown ? grownOutfit : youngPainted({ build, painted: grownOutfit }, 8) }} size={150} view={view} adult={grown} />
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              <button type="button" className="min-h-9 rounded-full bg-white/10 px-3 text-xs hover:bg-white/15" onClick={() => setView(view === "front" ? "side" : view === "side" ? "back" : "front")}>
                ↻ Turn
              </button>
              <button type="button" aria-pressed={grown} className={`min-h-9 rounded-full px-3 text-xs ${grown ? "bg-blue-600 text-white" : "bg-white/10 hover:bg-white/15"}`} onClick={() => setGrown(!grown)}>
                {grown ? "Grown up (18+)" : "See me at 18+"}
              </button>
            </div>
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
                    setLook(PRESETS[item]);
                    setPainted(undefined);
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
              <p className="mb-2 text-sm text-slate-300">Your look from age 18 (you grow up in school uniform, then teen clothes)</p>
              <PaintedGallery
                key={build}
                build={build}
                fixedBuild
                value={grownOutfit}
                onChange={(id) => {
                  setPainted(id);
                  setGrown(true);
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
          onClick={() => onDone({ name: name.trim(), gender, background, looks: { ...look, outfit: look.topColor, ...(painted ? { painted } : {}) }, interest })}
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
      className={`h-10 rounded-full px-4 text-sm font-medium ${on ? "bg-blue-600 text-white" : "bg-white/10 text-slate-100 hover:bg-white/15"}`}
    >
      {children}
    </button>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[radial-gradient(ellipse_at_top,#11265c,#05070c_62%)] px-4 py-10 text-slate-100 sm:py-16">
      {children}
    </div>
  );
}
