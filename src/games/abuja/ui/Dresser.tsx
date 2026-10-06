import { useState, type ReactNode } from "react";
import {
  BOTTOMS,
  CLOTH_COLORS,
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
  { id: "body", label: "Face", icon: "🙂" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Dress-up: pick hair, clothes, shoes and accessories, with live previews. */
export function Dresser({ look, onChange }: { look: Look; onChange: (look: Look) => void }) {
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
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${tab === item.id ? "bg-pine text-white" : "bg-ink/10 text-ink hover:bg-ink/15"}`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(randomLook(Math.floor(Math.random() * 1e9), { lashes: look.lashes, skin: look.skin }))}
          className="ml-auto flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-ink/10 px-3 text-sm hover:bg-ink/15"
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
                  <Avatar looks={{ ...look, hair: h.id, hat: "none", headphones: false, glasses: false }} view="head" size={64} />
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
                  <Avatar looks={{ ...look, top: t.id, bag: false }} view="top" size={72} />
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
                  <Avatar looks={{ ...look, bottom: b.id }} view="legs" size={70} />
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
                  <Avatar looks={{ ...look, shoes: s.id }} view="legs" size={70} />
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
                  <Avatar looks={{ ...look, hat: h.id }} view="head" size={64} />
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
      className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-xs transition ${on ? "border-pine bg-pine/15" : "border-line bg-ink/[0.03] hover:bg-ink/10"}`}
    >
      <span className="flex h-16 items-center justify-center overflow-hidden">{children}</span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function Swatches({ label, colors, value, onPick, round }: { label: string; colors: string[]; value: string; onPick: (color: string) => void; round?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onPick(c)}
            className={`size-9 border border-line ring-offset-2 ring-offset-white ${round ? "rounded-full" : "rounded-lg"} ${value === c ? "ring-2 ring-pine" : ""}`}
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
      className={`min-h-10 rounded-full border px-3 text-sm transition ${on ? "border-pine bg-pine/15 text-pine" : "border-line bg-ink/5 text-ink-soft hover:bg-ink/10"}`}
    >
      {children}
    </button>
  );
}
