import { useState } from "react";
import { fullLook } from "../systems/character";
import { changeLooks } from "../systems/engine";
import type { GameState } from "../systems/types";
import { Avatar } from "./Avatar";
import { PAINTED_OUTFITS, TONES, playerPainted, type Tone } from "../systems/painted";
import { btnGhost, btnPrimary } from "./theme";

/** Change your style any time: same person, new fit. */
export function WardrobePanel({ state, onDone }: { state: GameState; onDone: () => void }) {
  const look = fullLook(state.looks);
  const [painted, setPainted] = useState<string>(() => playerPainted(state) ?? "");
  const adult = state.age >= 18;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-3xl bg-gradient-to-b from-sky-200/20 to-transparent p-2">
          <Avatar looks={{ ...state.looks, painted }} size={120} adult={adult} />
        </div>
        <p className="text-sm font-semibold">{state.name}</p>
      </div>
      <div className="min-w-0">
        {adult ? (
          <PaintedGallery build={look.build} value={painted} onChange={setPainted} fixedBuild />
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">{state.age < 13 ? "School uniform for now." : "Teen clothes for now."} You choose your own outfits from age 18.</p>
        )}
        <div className="mt-4 flex gap-2">
          {adult ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                changeLooks(look, painted);
                onDone();
              }}
            >
              Save outfit
            </button>
          ) : null}
          <button type="button" className={btnGhost} onClick={onDone}>
            {adult ? "Cancel" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hand-painted outfits: choose a build, a skin tone, then an outfit. */
export function PaintedGallery({ build, value, onChange, fixedBuild }: { build: "masc" | "fem"; value?: string; onChange: (id: string) => void; fixedBuild?: boolean }) {
  const current = PAINTED_OUTFITS.find((o) => o.id === value);
  const [b, setB] = useState<"masc" | "fem">(fixedBuild ? build : (current?.build ?? build));
  const [tone, setTone] = useState<Tone>(current?.tone ?? "brown");
  const options = PAINTED_OUTFITS.filter((o) => o.build === b && o.tone === tone);
  const builds = fixedBuild ? [] : (["masc", "fem"] as const).filter((x) => PAINTED_OUTFITS.some((o) => o.build === x));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-sm font-semibold">🎨 Painted outfits</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {builds.length > 1
          ? builds.map((x) => (
              <button key={x} type="button" onClick={() => setB(x)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${b === x ? "bg-blue-600 text-white" : "bg-white/10 text-slate-200"}`}>
                {x === "masc" ? "Man" : "Woman"}
              </button>
            ))
          : null}
        {TONES.filter((t) => PAINTED_OUTFITS.some((o) => o.build === b && o.tone === t.id)).map((t) => (
          <button key={t.id} type="button" onClick={() => setTone(t.id)} aria-label={t.label} title={t.label} className={`size-8 rounded-full border-2 ${tone === t.id ? "border-white" : "border-transparent"}`} style={{ background: t.swatch }} />
        ))}
      </div>
      {options.length ? (
        <ul className="mt-3 grid grid-cols-4 gap-2">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onChange(o.id)}
                aria-pressed={value === o.id}
                className={`flex w-full flex-col items-center rounded-xl border p-1.5 text-[11px] leading-tight ${value === o.id ? "border-blue-400 bg-blue-500/20" : "border-white/10 bg-black/20 hover:bg-white/10"}`}
              >
                <img src={`/abuja/people/${o.id}-front.png`} alt="" className="h-24 w-auto object-contain" draggable={false} />
                <span className="mt-1 text-center">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Painted outfits for this look are coming soon.</p>
      )}
    </section>
  );
}
