import { useState, type ReactNode } from "react";
import {
  BEARDS,
  BOTTOMS,
  CLOTH_COLORS,
  EARRINGS,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  SHOES,
  SKIN_TONES,
  TOPS,
  randomLook,
  type Look,
} from "../systems/character";
import { Avatar } from "./Avatar";

const TABS = [
  { id: "hair", label: "Hair", icon: "💇🏾" },
  { id: "top", label: "Top", icon: "👕" },
  { id: "bottom", label: "Bottoms", icon: "👖" },
  { id: "shoes", label: "Shoes", icon: "👟" },
  { id: "extras", label: "Extras", icon: "🎒" },
  { id: "body", label: "Face & body", icon: "🙂" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Dress-up: pick hair, clothes, shoes and accessories, with live previews. */
export function Dresser({ look, adult = false, onChange }: { look: Look; adult?: boolean; onChange: (look: Look) => void }) {
  const [tab, setTab] = useState<Tab>("hair");
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Customise">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${tab === item.id ? "bg-blue-600 text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"}`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(randomLook(Math.floor(Math.random() * 1e9), { lashes: look.lashes, skin: look.skin, build: look.build }))}
          className="ml-auto flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 text-sm hover:bg-white/15"
          aria-label="Random outfit"
        >
          🎲 <span className="hidden sm:inline">Surprise me</span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4" role="tabpanel">
        {tab === "hair" ? (
          <>
            <Grid>
              {HAIR_STYLES.map((h) => (
                <Tile key={h.id} on={look.hair === h.id} label={h.label} onClick={() => set({ hair: h.id })}>
                  <Avatar adult={adult} looks={{ ...look, hair: h.id, hat: "none", headphones: false, glasses: false }} crop="head" size={64} />
                </Tile>
              ))}
            </Grid>
            <Swatches label="Hair colour" colors={HAIR_COLORS} value={look.hairColor} onPick={(hairColor) => set({ hairColor })} />
          </>
        ) : null}

        {tab === "top" ? (
          <>
            <Grid>
              {TOPS.map((t) => (
                <Tile key={t.id} on={look.top === t.id} label={t.label} onClick={() => set({ top: t.id })}>
                  <Avatar adult={adult} looks={{ ...look, top: t.id, bag: false }} crop="top" size={72} />
                </Tile>
              ))}
            </Grid>
            <Swatches label="Colour" colors={CLOTH_COLORS} value={look.topColor} onPick={(topColor) => set({ topColor })} />
          </>
        ) : null}

        {tab === "bottom" ? (
          <>
            <Grid>
              {BOTTOMS.map((b) => (
                <Tile key={b.id} on={look.bottom === b.id} label={b.label} onClick={() => set({ bottom: b.id })}>
                  <Avatar adult={adult} looks={{ ...look, bottom: b.id }} crop="legs" size={70} />
                </Tile>
              ))}
            </Grid>
            <Swatches label="Colour" colors={CLOTH_COLORS} value={look.bottomColor} onPick={(bottomColor) => set({ bottomColor })} />
          </>
        ) : null}

        {tab === "shoes" ? (
          <>
            <Grid>
              {SHOES.map((s) => (
                <Tile key={s.id} on={look.shoes === s.id} label={s.label} onClick={() => set({ shoes: s.id })}>
                  <Avatar adult={adult} looks={{ ...look, shoes: s.id }} crop="legs" size={70} />
                </Tile>
              ))}
            </Grid>
            <Swatches label="Colour" colors={CLOTH_COLORS} value={look.shoeColor} onPick={(shoeColor) => set({ shoeColor })} />
          </>
        ) : null}

        {tab === "extras" ? (
          <>
            <Grid>
              {HATS.map((h) => (
                <Tile key={h.id} on={look.hat === h.id} label={h.label} onClick={() => set({ hat: h.id })}>
                  <Avatar adult={adult} looks={{ ...look, hat: h.id }} crop="head" size={64} />
                </Tile>
              ))}
            </Grid>
            <Swatches label="Hat, bow and hair-tie colour" colors={CLOTH_COLORS} value={look.hatColor} onPick={(hatColor) => set({ hatColor })} />
            <div className="flex flex-wrap gap-2">
              <Toggle on={look.bag} onClick={() => set({ bag: !look.bag })}>
                🎒 Backpack
              </Toggle>
              <Toggle on={look.glasses} onClick={() => set({ glasses: !look.glasses })}>
                🕶️ Sunglasses
              </Toggle>
              <Toggle on={look.headphones} onClick={() => set({ headphones: !look.headphones })}>
                🎧 Headphones
              </Toggle>
            </div>
            {look.bag ? <Swatches label="Backpack colour" colors={CLOTH_COLORS} value={look.bagColor} onPick={(bagColor) => set({ bagColor })} /> : null}
          </>
        ) : null}

        {tab === "body" ? (
          <>
            <Swatches label="Skin tone" colors={SKIN_TONES} value={look.skin} onPick={(skin) => set({ skin })} round />
            <div className="flex flex-wrap gap-2">
              <Toggle on={look.lashes} onClick={() => set({ lashes: !look.lashes })}>
                Eyelashes
              </Toggle>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-sm font-semibold">Grown-up look</p>
              <p className="mt-0.5 text-xs text-slate-400">Shows from age 18, when you grow up.</p>
              <p className="mt-3 mb-1.5 text-xs text-slate-400">Body</p>
              <div className="flex flex-wrap gap-2">
                <Toggle on={look.build === "masc"} onClick={() => set({ build: "masc" })}>
                  Broad
                </Toggle>
                <Toggle on={look.build === "fem"} onClick={() => set({ build: "fem" })}>
                  Curvy
                </Toggle>
              </div>
              <p className="mt-3 mb-1.5 text-xs text-slate-400">Facial hair</p>
              <Grid>
                {BEARDS.map((b) => (
                  <Tile key={b.id} on={look.beard === b.id} label={b.label} onClick={() => set({ beard: b.id })}>
                    <Avatar adult looks={{ ...look, beard: b.id, hat: "none", glasses: false, headphones: false }} crop="head" size={60} />
                  </Tile>
                ))}
              </Grid>
              <p className="mt-3 mb-1.5 text-xs text-slate-400">Earrings</p>
              <div className="flex flex-wrap gap-2">
                {EARRINGS.map((e) => (
                  <Toggle key={e.id} on={look.earrings === e.id} onClick={() => set({ earrings: e.id })}>
                    {e.label}
                  </Toggle>
                ))}
              </div>
              <p className="mt-3 mb-1.5 text-xs text-slate-400">More</p>
              <div className="flex flex-wrap gap-2">
                <Toggle on={look.chain} onClick={() => set({ chain: !look.chain })}>
                  📿 Chain
                </Toggle>
                <Toggle on={look.watch} onClick={() => set({ watch: !look.watch })}>
                  ⌚ Watch
                </Toggle>
                <Toggle on={look.noseRing} onClick={() => set({ noseRing: !look.noseRing })}>
                  Nose ring
                </Toggle>
                <Toggle on={look.tattoos} onClick={() => set({ tattoos: !look.tattoos })}>
                  Tattoos
                </Toggle>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{children}</div>;
}

function Tile({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs transition ${on ? "border-blue-400 bg-blue-400/15" : "border-white/10 bg-white/[0.06] hover:bg-white/10"}`}
    >
      <span className="flex h-16 items-center justify-center overflow-hidden">{children}</span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function Swatches({ label, colors, value, onPick, round }: { label: string; colors: string[]; value: string; onPick: (color: string) => void; round?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onPick(c)}
            className={`size-9 border border-white/20 ring-offset-2 ring-offset-[#0d1220] ${round ? "rounded-full" : "rounded-lg"} ${value === c ? "ring-2 ring-blue-400" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3 text-sm transition ${on ? "border-blue-400 bg-blue-400/15 text-sky-200" : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}
