import { useState } from "react";
import { ZONE_COLORS, ZONE_LABEL, type ArtKind } from "../systems/city/catalog";
import { lotInfo, redevelopCost, redevelopOptions, upgradeCost } from "../systems/city/sim";
import { buyProperty, lotAction, redevelopProperty, sellProperty, upgradeProperty } from "../systems/engine";
import type { RoomType } from "../systems/rooms";
import { naira, SLOTS } from "../systems/rules";
import type { GameState } from "../systems/types";
import { btnGhost, btnPrimary, panel } from "./theme";

const CATEGORY_ICON: Record<string, string> = { residential: "🏠", commercial: "🏪", industrial: "🏭", civic: "🏛️", utility: "⚡", landmark: "⭐", park: "🌳" };
const SERVICE_LABEL: Record<string, string> = { power: "⚡ Power", water: "💧 Water", waste: "🗑️ Waste", health: "🏥 Health", safety: "👮 Police", fire: "🚒 Fire", education: "🎓 Schools", culture: "🎭 Culture", transit: "🚚 Transit" };

/** Which rooms you can walk into, by building style. Homes only when they're yours. */
const INSIDE: Partial<Record<ArtKind, RoomType>> = {
  house: "home_poor",
  bighouse: "home_middle",
  duplex: "home_middle",
  townhouse: "home_middle",
  apartment: "home_middle",
  highrise: "home_middle",
  villa: "mansion",
  shop: "shop",
  supermarket: "shop",
  mall: "shop",
  restaurant: "shop",
  cafe: "shop",
  cinema: "hall",
  hotel: "hall",
  office: "office",
  tower: "office",
  government: "office",
  police: "office",
  library: "classroom",
  community: "hall",
  school: "classroom",
  clinic: "clinic",
  hospital: "clinic",
  museum: "hall",
  mosque: "hall",
  church: "hall",
};

/** A city building up close: what it is, who's in it, what it's worth, and what you can do. */
export function LotPanel({ state, lotId, onClose, onEnter }: { state: GameState; lotId: string; onClose: () => void; onEnter: (room: RoomType, name: string) => void }) {
  const info = lotInfo(state, lotId);
  const [rebuild, setRebuild] = useState(false);
  if (!info) return null;
  const { def } = info;
  const room = INSIDE[def.art];
  const home = def.category === "residential";
  const canEnter = room && (home ? info.owned : info.open);
  const hours = def.hours ? `${SLOTS[def.hours[0]]} to ${SLOTS[def.hours[1]]?.toLowerCase()}` : null;
  const late = state.slot >= SLOTS.length;
  return (
    <div className={`${panel} absolute inset-x-2 bottom-2 z-20 max-h-[66dvh] overflow-y-auto p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[27rem]`} role="dialog" aria-label={def.name}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl">
            {CATEGORY_ICON[def.category]} {def.name}
            {info.level > 1 ? <span className="ml-1 text-sm text-amber-300">{"★".repeat(info.level - 1)}</span> : null}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <span className="inline-block size-2.5 rounded-sm" style={{ background: ZONE_COLORS[def.zone] }} />
              {ZONE_LABEL[def.zone]}
            </span>
            {info.owned ? <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">🔑 Yours</span> : null}
            {hours ? <span className={info.open ? "text-emerald-300" : "text-amber-300"}>{info.open ? "Open now" : "Closed"} · {hours}</span> : null}
          </p>
          <p className="mt-1.5 text-sm text-slate-300 text-pretty">{def.blurb}</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-xl px-3 text-sm text-slate-300 hover:bg-white/10" aria-label="Close">
          ✕
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        {info.residents ? (
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-slate-400">Residents</dt>
            <dd className="text-base font-semibold">{info.residents}</dd>
          </div>
        ) : null}
        {info.jobs ? (
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-slate-400">Staff</dt>
            <dd className="text-base font-semibold">{info.jobs}</dd>
          </div>
        ) : null}
        {def.visitors ? (
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-slate-400">{def.category === "civic" ? "Visitors" : "Customers"} now</dt>
            <dd className="text-base font-semibold">{info.visitors}</dd>
          </div>
        ) : null}
        {info.value ? (
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-slate-400">Value</dt>
            <dd className="font-semibold text-emerald-300">{naira(info.value)}</dd>
          </div>
        ) : null}
        {info.rent ? (
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-slate-400">Rent</dt>
            <dd className="font-semibold">{naira(info.rent)}/wk</dd>
          </div>
        ) : null}
        {info.revenue ? (
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-slate-400">Takings</dt>
            <dd className="font-semibold">{naira(info.revenue)}/wk</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 ${info.power ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>{info.power ? "⚡ Power on" : "⚡ No power"}</span>
        <span className={`rounded-full px-2 py-0.5 ${info.water ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>{info.water ? "💧 Mains water" : "💧 No mains water"}</span>
        <span className={`rounded-full px-2 py-0.5 ${info.waste ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>{info.waste ? "🗑️ Rubbish collected" : "🗑️ No collection"}</span>
        {info.services
          .filter((x) => !["power", "water", "waste"].includes(x))
          .map((x) => (
            <span key={x} className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">
              {SERVICE_LABEL[x]}
            </span>
          ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {info.area} {info.pollution >= 2 ? `Pollution ${info.pollution}/10.` : ""} {info.attract >= 2 ? `Attractiveness ${info.attract}/10.` : ""}
      </p>
      {def.provides?.length ? <p className="mt-1 text-xs text-sky-200">Provides {def.provides.map((x) => SERVICE_LABEL[x.service] ?? x.service).join(", ")} to the area around it.</p> : null}

      <div className="mt-3 grid gap-2">
        {canEnter && room ? (
          <button type="button" className={btnPrimary} onClick={() => onEnter(room, def.name)}>
            🚪 Go inside
          </button>
        ) : null}
        {(def.actions ?? []).map((a) => {
          const closed = a.open && !info.open;
          return (
            <button
              key={a.id}
              type="button"
              disabled={closed || late || (a.cost ?? 0) > state.stats.money}
              onClick={() => lotAction(lotId, a.id)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-blue-400/60 hover:bg-white/10 disabled:opacity-45"
            >
              <span className="block text-sm font-semibold">{a.label}</span>
              <span className="block text-xs text-slate-400">{closed ? "🔒 Closed now" : [a.slots ? `${a.slots} slot${a.slots > 1 ? "s" : ""}` : "", a.energy < 0 ? `${a.energy} energy` : a.energy > 0 ? `+${a.energy} energy` : ""].filter(Boolean).join(" · ")}</span>
            </button>
          );
        })}
      </div>

      {def.forSale && !info.lot.place ? (
        <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-sm font-semibold">Property</p>
          {!info.owned ? (
            <>
              <p className="text-xs text-slate-400">Buy it and rent it out: tenants pay about {naira(info.rent)} a week, depending on the area.</p>
              <button type="button" className={`${btnPrimary} mt-2 w-full`} disabled={state.stats.money < info.value} onClick={() => buyProperty(lotId)}>
                Buy for {naira(info.value)}
              </button>
            </>
          ) : (
            <div className="grid gap-2">
              {info.level <= (def.levels ?? 1) ? (
                <button type="button" className={btnGhost} disabled={state.stats.money < upgradeCost(info)} onClick={() => upgradeProperty(lotId)}>
                  🛠️ Renovate to level {info.level + 1} · {naira(upgradeCost(info))}
                </button>
              ) : null}
              <button type="button" className={btnGhost} onClick={() => setRebuild(!rebuild)}>
                🏗️ Redevelop the plot
              </button>
              {rebuild ? (
                <ul className="grid gap-1.5">
                  {redevelopOptions(state, lotId).map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        disabled={state.stats.money < redevelopCost(b, state.day)}
                        onClick={() => redevelopProperty(lotId, b.id)}
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs disabled:opacity-45"
                      >
                        <span className="block font-semibold">{b.name}</span>
                        <span className="block text-slate-400">
                          {naira(redevelopCost(b, state.day))} · {b.blurb}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button type="button" className="text-xs text-red-300 underline" onClick={() => sellProperty(lotId)}>
                Sell for about {naira(Math.round(info.value * 0.92))}
              </button>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
