import { useMemo } from "react";
import { building, ZONE_COLORS, ZONE_LABEL, type Zone } from "../systems/city/catalog";
import { LAKE, RAIL, ROADS } from "../systems/city/layout";
import { cityStats, lotInfo, lotsFor } from "../systems/city/sim";
import { DISTRICTS, WORLD } from "../systems/data";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";

const LEGEND: Zone[] = ["residential", "commercial", "industrial", "civic", "service", "park", "water", "road", "rail"];

/** The city at a glance: zones on a map, how it's doing, and the property you own. */
export function CityApp({ state }: { state: GameState }) {
  const lots = useMemo(() => lotsFor(state), [state]);
  const stats = cityStats(state);
  const owned = Object.entries(state.city?.lots ?? {}).filter(([, o]) => o.owned);
  const power = stats.power;
  return (
    <div>
      <div className="rounded-2xl bg-teal-700 p-4">
        <p className="font-display text-2xl">Abuja</p>
        <p className="text-sm opacity-90">
          About {stats.residents.toLocaleString("en")} residents · {stats.jobs.toLocaleString("en")} jobs · {stats.lots} buildings
        </p>
        <p className="mt-1 text-xs opacity-90">
          ⚡ Grid: {power.supply} MW for {power.demand} MW of demand{power.outage ? ` · ${Math.round(power.outage * 100)}% of areas lose power at night` : " · enough for everyone"}
        </p>
      </div>
      <svg viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} className="mt-3 w-full rounded-xl border border-white/10" role="img" aria-label="Zone map of the city">
        <rect width={WORLD.width} height={WORLD.height} fill="#1f2b1d" />
        {DISTRICTS.map((d) => (
          <g key={d.id}>
            <rect x={d.x} y={d.y} width={d.w} height={d.h} fill="#2d3b2a" stroke="#475569" strokeWidth={4} />
            <text x={d.x + 16} y={d.y + 46} fill="#cbd5e1" fontSize={40} fontWeight={700}>
              {d.name}
            </text>
          </g>
        ))}
        <ellipse cx={LAKE.x} cy={LAKE.y} rx={LAKE.rx} ry={LAKE.ry} fill={ZONE_COLORS.water} />
        {ROADS.xs.map((x) => (
          <rect key={`x${x}`} x={x - 24} y={0} width={48} height={WORLD.height} fill={ZONE_COLORS.road} />
        ))}
        {ROADS.ys.map((y) => (
          <rect key={`y${y}`} x={0} y={y - 24} width={WORLD.width} height={48} fill={ZONE_COLORS.road} />
        ))}
        <rect x={0} y={RAIL.y - 12} width={WORLD.width} height={24} fill={ZONE_COLORS.rail} />
        <path d={`M0 ${RAIL.y} L${WORLD.width} ${RAIL.y}`} stroke="#334155" strokeWidth={6} strokeDasharray="20 14" />
        {lots.map((l) => {
          const def = building(l.def)!;
          const mine = state.city?.lots[l.id]?.owned;
          return <rect key={l.id} x={l.x} y={l.y} width={l.w} height={l.h} rx={6} fill={ZONE_COLORS[def.zone]} stroke={mine ? "#ffffff" : "#0f172a"} strokeWidth={mine ? 10 : 3} opacity={0.9} />;
        })}
        {lots
          .filter((l) => building(l.def)!.category === "landmark")
          .map((l) => (
            <text key={`t${l.id}`} x={l.x + l.w / 2} y={l.y + l.h / 2 + 14} textAnchor="middle" fontSize={44}>
              ⭐
            </text>
          ))}
        <circle cx={state.pos.x} cy={state.pos.y} r={26} fill="#60a5fa" stroke="#ffffff" strokeWidth={8} />
      </svg>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
        {LEGEND.map((z) => (
          <li key={z} className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-sm" style={{ background: ZONE_COLORS[z] }} />
            {ZONE_LABEL[z]}
            {stats.by[z] ? <span className="text-slate-500">({stats.by[z]})</span> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">Tip: the 🗺️ explore button shows these zones over the streets.</p>

      <h3 className="mt-4 text-xs font-semibold tracking-widest text-slate-400 uppercase">Your property</h3>
      {!owned.length ? <p className="mt-1 text-sm text-slate-400">You don't own any buildings yet. Walk up to a house, shop or flat and look for the 🔑 Property section.</p> : null}
      <ul className="mt-2 grid gap-1.5">
        {owned.map(([id]) => {
          const info = lotInfo(state, id);
          if (!info) return null;
          return (
            <li key={id} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="font-semibold">{info.def.name}</span> <span className="text-xs text-slate-400">· {DISTRICTS.find((d) => d.id === info.lot.district)?.name} · level {info.level}</span>
              <span className="block text-xs text-slate-400">
                Worth {naira(info.value)} · rent {naira(info.rent)}/wk {info.power ? "" : "· no power"} {info.water ? "" : "· no water"}
              </span>
            </li>
          );
        })}
      </ul>
      {state.city?.rentTotal ? <p className="mt-2 text-xs text-emerald-300">Rent collected so far: {naira(state.city.rentTotal)}</p> : null}
    </div>
  );
}
