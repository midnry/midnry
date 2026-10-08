import { useEffect, useMemo, useState } from "react";
import { BedDouble, Brush, Lamp, Package, Sofa, Sparkles, SquareDashed, Tv, X } from "lucide-react";
import { CATALOGUE, FLOORS, WALL_COLOURS, WALL_PRICE, buyDecor, isFixed, paintWall, relayFloor, roomLayout, sellDecor, sellPrice, type DecorCategory } from "../systems/decor";
import { FURNITURE, furnitureSvg } from "../systems/furniture";
import type { RoomInfo } from "../systems/rooms";
import { naira } from "../systems/rules";
import { bus } from "../systems/store";
import type { GameState } from "../systems/types";
import { btnGhost, btnPrimary, panel } from "./theme";

type Section = "room" | "furniture" | "decor" | "lighting" | "rugs" | "storage" | "walls";

const SECTIONS: { id: Section; label: string; icon: typeof Sofa }[] = [
  { id: "furniture", label: "Furniture", icon: Sofa },
  { id: "decor", label: "Decor", icon: Sparkles },
  { id: "lighting", label: "Lighting", icon: Lamp },
  { id: "rugs", label: "Rugs", icon: SquareDashed },
  { id: "storage", label: "Storage", icon: Package },
  { id: "walls", label: "Wall & Floor", icon: Brush },
  { id: "room", label: "In this room", icon: BedDouble },
];

const FURNITURE_TABS: { id: DecorCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "beds", label: "Beds" },
  { id: "sofas", label: "Sofas" },
  { id: "tables", label: "Tables" },
  { id: "electronics", label: "TV & more" },
];

/** A furniture picture for the catalogue, from the same drawing the room uses. */
function thumb(id: string, accent?: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(furnitureSvg(id, accent ?? "#1f6fd1", 1))}`;
}

const NAMES: Record<string, string> = Object.fromEntries(CATALOGUE.map((c) => [c.id, c.name]));
const nameOf = (id: string) => NAMES[id] ?? id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Decorate your own room: buy, place, move and sell furniture; paint the walls; lay a floor. */
export function DecorPanel({ state, info, onClose }: { state: GameState; info: RoomInfo; onClose: () => void }) {
  const [section, setSection] = useState<Section>("furniture");
  const [tab, setTab] = useState<DecorCategory | "all">("all");
  const [accents, setAccents] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<number | null>(null);
  /** On a phone the catalogue can fold away so you can see the room and drag things. */
  const [folded, setFolded] = useState(false);
  const layout = roomLayout(state, info);

  useEffect(() => {
    bus.emit("decorEdit", true);
    const off = bus.on("decorPick", (i) => setPicked(i));
    return () => {
      off();
      bus.emit("decorEdit", false);
    };
  }, []);

  const items = useMemo(() => {
    if (section === "furniture") return CATALOGUE.filter((c) => ["beds", "sofas", "tables", "electronics"].includes(c.cat) && (tab === "all" || c.cat === tab));
    return CATALOGUE.filter((c) => c.cat === section);
  }, [section, tab]);

  const pickedItem = picked != null ? layout.items[picked] : undefined;
  const pick = (i: number | null) => {
    setPicked(i);
    bus.emit("decorPick", i);
  };

  const catalogue = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((c) => {
        const accent = accents[c.id] ?? c.accents?.[0]?.color;
        const short = state.stats.money < c.price;
        return (
          <div key={c.id} className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="flex h-20 items-end justify-center">
              <img src={thumb(c.id, accent)} alt="" className="max-h-20 max-w-full object-contain" />
            </div>
            <p className="mt-1 text-[13px] leading-tight font-semibold">{c.name}</p>
            <p className="text-xs text-amber-300">{naira(c.price)}</p>
            {c.accents ? (
              <div className="mt-1 flex gap-1" role="radiogroup" aria-label={`${c.name} colour`}>
                {c.accents.map((a) => (
                  <button
                    key={a.color}
                    type="button"
                    role="radio"
                    aria-checked={accent === a.color}
                    aria-label={a.name}
                    title={a.name}
                    onClick={() => setAccents({ ...accents, [c.id]: a.color })}
                    className={`size-5 rounded-full border-2 ${accent === a.color ? "border-white" : "border-white/20"}`}
                    style={{ background: a.color }}
                  />
                ))}
              </div>
            ) : null}
            <button type="button" disabled={short} className={`${btnPrimary} mt-2 min-h-9 px-2 py-1 text-xs disabled:opacity-40`} onClick={() => buyDecor(info.type, c.id, accent)}>
              {short ? `Need ${naira(c.price)}` : "Buy & place"}
            </button>
          </div>
        );
      })}
    </div>
  );

  const walls = (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Wall colour · {naira(WALL_PRICE)}</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {WALL_COLOURS.map((w) => (
            <button
              key={w.color}
              type="button"
              disabled={state.stats.money < WALL_PRICE || layout.wall === w.color}
              onClick={() => paintWall(info.type, w.color)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs disabled:opacity-60 ${layout.wall === w.color ? "border-amber-300" : "border-white/10"}`}
            >
              <span className="h-8 w-full rounded-md border border-black/20" style={{ background: w.color }} />
              {w.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">Floor</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {FLOORS.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={state.stats.money < f.price || layout.floor === f.id}
              onClick={() => relayFloor(info.type, f.id)}
              className={`rounded-xl border p-2 text-left text-xs disabled:opacity-60 ${layout.floor === f.id ? "border-amber-300" : "border-white/10"}`}
            >
              <span className="block text-sm font-semibold">{f.name}</span>
              {layout.floor === f.id ? "In this room" : f.price ? naira(f.price) : "Free"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const inRoom = (
    <div className="grid gap-1.5">
      <p className="text-xs text-slate-400">Tap a piece in the room, or here, to pick it. Drag it in the room to move it.</p>
      {layout.items.map((it, i) =>
        isFixed(it.id) || !FURNITURE[it.id] ? null : (
          <button
            key={`${it.id}-${i}`}
            type="button"
            onClick={() => pick(i)}
            className={`flex items-center gap-2 rounded-xl border p-1.5 text-left text-sm ${picked === i ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/5"}`}
          >
            <img src={thumb(it.id, it.accent)} alt="" className="h-9 w-12 object-contain" />
            <span className="flex-1">{nameOf(it.id)}</span>
            <span className="text-xs text-slate-400">{sellPrice(it) ? naira(sellPrice(it)) : ""}</span>
          </button>
        ),
      )}
    </div>
  );

  const body = section === "walls" ? walls : section === "room" ? inRoom : catalogue;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-end sm:flex-row sm:items-stretch sm:justify-between sm:p-3" role="dialog" aria-label="Customize your room">
      {/* Categories: a column on the left on a computer, a row of tabs on a phone. */}
      <nav className={`${panel} pointer-events-auto hidden w-52 flex-col gap-1.5 p-3 sm:flex`}>
        <p className="mb-1 flex items-center gap-2 font-display text-xl">
          <Tv className="size-5 text-amber-300" aria-hidden /> Customize
        </p>
        <p className="mb-2 text-sm text-emerald-300">{naira(state.stats.money)}</p>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold ${section === s.id ? "bg-amber-400 text-slate-900" : "bg-white/5 hover:bg-white/10"}`}
          >
            <s.icon className="size-4" aria-hidden /> {s.label}
          </button>
        ))}
        <button type="button" className={`${btnGhost} mt-auto`} onClick={onClose}>
          Done
        </button>
      </nav>

      <div className="pointer-events-auto flex max-h-[48dvh] w-full flex-col sm:max-h-none sm:w-[26rem]">
        {pickedItem && !isFixed(pickedItem.id) ? (
          <div className={`${panel} mb-2 flex items-center gap-2 p-2.5`}>
            <img src={thumb(pickedItem.id, pickedItem.accent)} alt="" className="h-10 w-12 object-contain" />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{nameOf(pickedItem.id)}</span>
              <span className="block text-xs text-slate-400">Drag it in the room to move it.</span>
            </p>
            <button
              type="button"
              className={`${btnGhost} min-h-9 px-3 py-1 text-xs`}
              onClick={() => {
                sellDecor(info.type, picked!);
                pick(null);
              }}
            >
              {sellPrice(pickedItem) ? `Sell ${naira(sellPrice(pickedItem))}` : "Remove"}
            </button>
            <button type="button" aria-label="Unpick" className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => pick(null)}>
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
        <div className={`${panel} flex min-h-0 flex-1 flex-col rounded-b-none p-3 sm:rounded-b-2xl`}>
          {/* Phone: the sections as a scrolling row, and a Done button. */}
          <div className="mb-2 flex items-center gap-2 sm:hidden">
            <p className="font-display text-lg">Customize</p>
            <p className="text-sm text-emerald-300">{naira(state.stats.money)}</p>
            <button type="button" className={`${btnGhost} ml-auto min-h-9 px-3 py-1 text-sm`} aria-expanded={!folded} onClick={() => setFolded(!folded)}>
              {folded ? "Show shop" : "Hide"}
            </button>
            <button type="button" className={`${btnPrimary} min-h-9 px-4 py-1 text-sm`} onClick={onClose}>
              Done
            </button>
          </div>
          <div className={`mb-2 gap-1.5 overflow-x-auto pb-1 sm:hidden ${folded ? "hidden" : "flex"}`}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${section === s.id ? "bg-amber-400 text-slate-900" : "bg-white/10"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {section === "furniture" ? (
            <div className={`mb-2 gap-1.5 overflow-x-auto pb-1 ${folded ? "hidden sm:flex" : "flex"}`}>
              {FURNITURE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === t.id ? "bg-amber-400 text-slate-900" : "bg-white/10"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className={`min-h-0 flex-1 overflow-y-auto ${folded ? "hidden sm:block" : ""}`}>{body}</div>
        </div>
      </div>
    </div>
  );
}

