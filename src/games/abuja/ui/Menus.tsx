import { useState } from "react";
import { HAIRS, OUTFITS, SKINS } from "../systems/art";
import type { Background, Gender, Looks } from "../systems/types";
import { Avatar } from "./Avatar";
import { btnGhost, btnPrimary, panel } from "./theme";

export function AgeGate({ onPass }: { onPass: () => void }) {
  const [refused, setRefused] = useState(false);
  return (
    <Screen>
      <div className={`${panel} mx-auto max-w-md p-6 text-center`}>
        <p className="text-5xl">🔞</p>
        <h1 className="mt-3 font-display text-3xl">Mature audiences only</h1>
        <p className="mt-3 text-sm text-pretty text-stone-300">
          Abuja Hustle is satire for adults. It deals with money, debt, crime, relationships, pregnancy, death and violence. Nothing
          explicit, but it does not look away.
        </p>
        {refused ? (
          <p className="mt-5 text-sm text-amber-300">This game is for adults 18 and over. Come back when you're older.</p>
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

export function Title({ hasSave, onNew, onContinue }: { hasSave: boolean; onNew: () => void; onContinue: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Screen>
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm font-semibold tracking-[0.3em] text-amber-400 uppercase">A life sim · Abuja, Nigeria</p>
        <h1 className="mt-3 font-display text-6xl tracking-tight text-balance sm:text-7xl">Abuja Hustle</h1>
        <p className="mx-auto mt-4 max-w-sm text-pretty text-stone-300">
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
        <p className="mt-10 text-xs text-stone-500">
          All characters, parties, companies and lenders are fictional. Satire of systems, not of ordinary people.
        </p>
      </div>
    </Screen>
  );
}

export function Creator({ onDone }: { onDone: (input: { name: string; gender: Gender; background: Background; looks: Looks }) => void }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [background, setBackground] = useState<Background>("lapo");
  const [looks, setLooks] = useState<Looks>({ skin: SKINS[3]!, hair: "afro", outfit: OUTFITS[0]! });
  const ready = name.trim().length >= 2;

  return (
    <Screen>
      <div className={`${panel} mx-auto w-full max-w-3xl p-5 sm:p-8`}>
        <h1 className="font-display text-3xl tracking-tight">Who are you?</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-3xl bg-gradient-to-b from-amber-200/20 to-transparent p-3">
              <Avatar looks={looks} size={150} />
            </div>
            <p className="font-semibold">{name.trim() || "Your name"}</p>
            <p className="text-xs text-stone-400">{background === "lapo" ? "Lapo Baby" : "Average family"}</p>
          </div>
          <div className="grid gap-5">
            <label className="block">
              <span className="text-sm text-stone-300">Name</span>
              <input
                className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-base outline-none focus:border-amber-400"
                value={name}
                maxLength={20}
                placeholder="e.g. Chiamaka, Musa, Tobi"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <Pick label="Gender">
              {(["female", "male"] as const).map((item) => (
                <Chip key={item} on={gender === item} onClick={() => setGender(item)}>
                  {item === "female" ? "Woman" : "Man"}
                </Chip>
              ))}
            </Pick>
            <Pick label="Skin tone">
              {SKINS.map((skin) => (
                <button
                  key={skin}
                  type="button"
                  aria-label={`Skin tone ${skin}`}
                  aria-pressed={looks.skin === skin}
                  onClick={() => setLooks({ ...looks, skin })}
                  className={`size-10 rounded-full ring-offset-2 ring-offset-stone-900 ${looks.skin === skin ? "ring-2 ring-amber-400" : ""}`}
                  style={{ background: skin }}
                />
              ))}
            </Pick>
            <Pick label="Hairstyle">
              {HAIRS.map((hair) => (
                <Chip key={hair.id} on={looks.hair === hair.id} onClick={() => setLooks({ ...looks, hair: hair.id })}>
                  {hair.label}
                </Chip>
              ))}
            </Pick>
            <Pick label="Outfit">
              {OUTFITS.map((outfit) => (
                <button
                  key={outfit}
                  type="button"
                  aria-label={`Outfit colour ${outfit}`}
                  aria-pressed={looks.outfit === outfit}
                  onClick={() => setLooks({ ...looks, outfit })}
                  className={`size-10 rounded-xl ring-offset-2 ring-offset-stone-900 ${looks.outfit === outfit ? "ring-2 ring-amber-400" : ""}`}
                  style={{ background: outfit }}
                />
              ))}
            </Pick>
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
        <p className="mt-3 text-xs text-stone-500">Nepo Baby is not an option. That's the point.</p>
        <button
          type="button"
          className={`${btnPrimary} mt-6 w-full sm:w-auto`}
          disabled={!ready}
          onClick={() => onDone({ name: name.trim(), gender, background, looks })}
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
      className={`rounded-2xl border p-4 text-left transition ${on ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
    >
      <p className="font-display text-xl">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-stone-300">
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
      <p className="text-sm text-stone-300">{label}</p>
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
      className={`h-10 rounded-full px-4 text-sm font-medium ${on ? "bg-amber-400 text-stone-950" : "bg-white/10 text-stone-100 hover:bg-white/15"}`}
    >
      {children}
    </button>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[radial-gradient(ellipse_at_top,#3b2414,#14110f_60%)] px-4 py-10 text-stone-100 sm:py-16">
      {children}
    </div>
  );
}
