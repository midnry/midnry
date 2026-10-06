import { useState } from "react";
import { grade, repairCost } from "../../systems/cooking/cook";
import { EQUIPMENT, equipment, stats, TIER_LABEL } from "../../systems/cooking/equipment";
import { ingredient } from "../../systems/cooking/ingredients";
import { capacity, price as foodPrice, SOURCES, used } from "../../systems/cooking/kitchen";
import { recipe, RECIPES } from "../../systems/cooking/recipes";
import type { EquipTier, Kitchen, Tier, Venue } from "../../systems/cooking/types";
import {
  candidates,
  canOpen,
  DISTRICT_FOOT,
  districtName,
  fairPrice,
  knownFor,
  layoutScore,
  ROLE_INFO,
  venueType,
  VENUE_TYPES,
  type ServiceReport,
} from "../../systems/cooking/venues";
import {
  addMenuItem,
  buyEquipment,
  buyFood,
  cateringAccept,
  cateringCook,
  cateringDeliver,
  competitionEnter,
  editMenu,
  festivalSell,
  fireStaff,
  hireStaff,
  moveVenueKit,
  openFoodVenue,
  repairEquipment,
  sellEquipment,
  setVenue,
  truckMove,
  venueDeepClean,
  venuePromote,
  venueSell,
  venueService,
} from "../../systems/engine";
import { naira, SLOTS } from "../../systems/rules";
import type { GameState } from "../../systems/types";
import { btnGhost, btnPrimary } from "../theme";

// Food businesses: open one, run services, and grow it.

const chip = (on: boolean) => `min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${on ? "bg-white text-slate-900" : "bg-white/10 text-slate-200"}`;
const label = "text-xs font-semibold tracking-widest text-slate-400 uppercase";

function Meter({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const starsOf = (rating: number) => Math.max(1, Math.min(5, Math.round((1 + rating / 25) * 10) / 10));

export function BusinessTab({ state, k, market }: { state: GameState; k: Kitchen; market: string | null }) {
  const [view, setView] = useState<"mine" | "open" | "catering" | "events">(k.venues.length ? "mine" : "open");
  const [venueId, setVenueId] = useState<string | null>(null);
  const v = k.venues.find((x) => x.id === venueId);
  if (v) return <VenueView state={state} k={k} v={v} onBack={() => setVenueId(null)} />;
  const offers = k.catering.length;
  const events = k.events.filter((e) => !e.done).length;
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button type="button" className={chip(view === "mine")} onClick={() => setView("mine")}>
          🏪 My businesses ({k.venues.length})
        </button>
        <button type="button" className={chip(view === "open")} onClick={() => setView("open")}>
          ➕ Open one
        </button>
        <button type="button" className={chip(view === "catering")} onClick={() => setView("catering")}>
          🍱 Catering{offers ? ` (${offers})` : ""}
        </button>
        <button type="button" className={chip(view === "events")} onClick={() => setView("events")}>
          🏆 Events{events ? ` (${events})` : ""}
        </button>
      </div>
      {view === "mine" ? (
        <div className="mt-3">
          {!k.venues.length ? <p className="text-sm text-slate-400">You don't run a food business yet. A street stall costs ₦60,000 to start.</p> : null}
          <ul className="grid grid-cols-1 gap-2">
            {k.venues.map((x) => {
              const t = venueType(x.type)!;
              const last = x.ledger[0];
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => setVenueId(x.id)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-blue-400/60">
                    <span className="text-3xl" aria-hidden>
                      {t.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{x.name}</span>
                      <span className="block text-xs text-slate-400">
                        {t.name} · {districtName(x.district)} · {x.services ? `${starsOf(x.rating)}★` : "new"} · {x.staff.length} staff
                      </span>
                      <span className="block text-xs text-slate-500">
                        This week: {naira(x.week.revenue)} in, {naira(x.week.cost)} out{last ? ` · last: ${last.label}` : ""}
                        {x.closedUntil > state.day ? ` · CLOSED until day ${x.closedUntil}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : view === "open" ? (
        <OpenVenue state={state} />
      ) : view === "catering" ? (
        <CateringView state={state} k={k} />
      ) : (
        <EventsView state={state} k={k} market={market} />
      )}
    </div>
  );
}

// ── Opening ──────────────────────────────────────────────────────────────────

function OpenVenue({ state }: { state: GameState }) {
  const [pick, setPick] = useState<string | null>(null);
  const [district, setDistrict] = useState(state.district in DISTRICT_FOOT ? state.district : "wuse");
  const [name, setName] = useState("");
  const t = pick ? venueType(pick) : undefined;
  if (t) {
    const why = canOpen(state, t.id);
    const place = DISTRICT_FOOT[district]!;
    return (
      <div className="mt-3">
        <button type="button" onClick={() => setPick(null)} className="mb-2 text-sm text-sky-300 hover:underline">
          ← All formats
        </button>
        <p className="font-display text-2xl">
          {t.icon} {t.name}
        </p>
        <p className="text-sm text-slate-300">{t.blurb}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs text-slate-400">To open</dt>
            <dd className="font-semibold text-emerald-300">{naira(t.cost)}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs text-slate-400">Rent</dt>
            <dd className="font-semibold">{naira(t.rent)}/week</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs text-slate-400">Seats</dt>
            <dd className="font-semibold">{t.seats || (t.delivery ? "Delivery only" : "Takeaway")}</dd>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <dt className="text-xs text-slate-400">Sells</dt>
            <dd className="font-semibold capitalize">{t.courses.slice(0, 4).join(", ")}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-500">Starter kit: {t.starter.map((id) => equipment(id)?.name.toLowerCase()).join(", ")}.</p>
        <label className="mt-3 block text-sm">
          <span className="text-slate-400">District</span>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#0d1220] px-3">
            {Object.keys(DISTRICT_FOOT).map((d) => (
              <option key={d} value={d}>
                {districtName(d)}: {DISTRICT_FOOT[d]!.foot >= 1.2 ? "very busy" : DISTRICT_FOOT[d]!.foot >= 1 ? "busy" : "quiet"}, {DISTRICT_FOOT[d]!.wealth >= 1.3 ? "rich" : DISTRICT_FOOT[d]!.wealth >= 1 ? "comfortable" : "budget"}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-xs text-slate-500">
          {place.wealth >= 1.3 ? "People here pay more, and expect more." : place.wealth < 0.9 ? "People here want value for money." : "A good mix of customers."}
        </p>
        <label className="mt-3 block text-sm">
          <span className="text-slate-400">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${state.name}'s ${t.name}`} maxLength={36} className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" />
        </label>
        {why ? <p className="mt-2 text-sm text-amber-200">🔒 {why}</p> : null}
        <button
          type="button"
          className={`${btnPrimary} mt-3 w-full`}
          disabled={Boolean(why)}
          onClick={() => {
            openFoodVenue(t.id, district, name);
            setPick(null);
          }}
        >
          Open for {naira(t.cost)}
        </button>
      </div>
    );
  }
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {VENUE_TYPES.map((x) => {
        const why = canOpen(state, x.id);
        return (
          <li key={x.id}>
            <button type="button" onClick={() => setPick(x.id)} className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-blue-400/60">
              <span className="text-2xl" aria-hidden>
                {x.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{x.name}</span>
                <span className="block text-xs text-emerald-300">
                  {naira(x.cost)} · {naira(x.rent)}/wk
                </span>
                <span className="block text-xs text-slate-400">{x.blurb}</span>
                {why && !why.startsWith("Needs ₦") ? <span className="block text-xs text-amber-200">🔒 {why}</span> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── One venue ────────────────────────────────────────────────────────────────

type VTab = "overview" | "menu" | "staff" | "kitchen" | "stock" | "reviews";

function VenueView({ state, k, v, onBack }: { state: GameState; k: Kitchen; v: Venue; onBack: () => void }) {
  const [tab, setTab] = useState<VTab>("overview");
  const t = venueType(v.type)!;
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-2 text-sm text-sky-300 hover:underline">
        ← My businesses
      </button>
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {t.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl">{v.name}</p>
          <p className="text-sm text-slate-400">
            {t.name} · {districtName(v.district)} · {v.services ? `${starsOf(v.rating)}★ (${v.services} services)` : "not opened yet"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ["overview", "📊 Overview"],
            ["menu", `📋 Menu (${v.menu.length})`],
            ["staff", `👥 Staff (${v.staff.length})`],
            ["kitchen", "🔪 Kitchen"],
            ["stock", "📦 Stock"],
            ["reviews", `⭐ Reviews (${v.reviews.length})`],
          ] as const
        ).map(([id, text]) => (
          <button key={id} type="button" className={chip(tab === id)} onClick={() => setTab(id)}>
            {text}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {tab === "overview" ? (
          <Overview state={state} k={k} v={v} onSold={onBack} />
        ) : tab === "menu" ? (
          <MenuView state={state} k={k} v={v} />
        ) : tab === "staff" ? (
          <StaffView state={state} v={v} />
        ) : tab === "kitchen" ? (
          <KitchenView state={state} v={v} />
        ) : tab === "stock" ? (
          <StockView state={state} v={v} />
        ) : (
          <ReviewsView v={v} />
        )}
      </div>
    </div>
  );
}

function Overview({ state, k, v, onSold }: { state: GameState; k: Kitchen; v: Venue; onSold: () => void }) {
  const t = venueType(v.type)!;
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [selling, setSelling] = useState(false);
  const slot = Math.min(3, state.slot);
  const done = v.ledger.some((l) => l.label === `${["Breakfast", "Lunch", "Dinner", "Late night"][slot]}, day ${state.day}`);
  const closed = v.closedUntil > state.day;
  const late = state.slot >= SLOTS.length;
  const canDelegate = v.staff.some((x) => x.role === "manager" || x.role === "head_chef");
  const tags = knownFor(v);
  const promo = (state.flags[`promo_${v.id}`] as number | undefined) ?? 0;
  const run = (you: boolean) => setReport(venueService(v.id, you));
  return (
    <div className="space-y-4">
      {t.id === "catering" ? (
        <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">A catering company doesn't serve walk-ins: it cooks for contracts. Find jobs under Catering.</p>
      ) : (
        <section className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-sm font-semibold">
            {closed ? `🚫 Closed by health inspectors until day ${v.closedUntil}` : late ? "Closed for the night" : `${["Breakfast", "Lunch", "Dinner", "Late night"][slot]} service`}
          </p>
          <p className="text-xs text-slate-400">
            {done ? "You've run this service. Come back for the next one." : `Busy-ness now: ${t.hours[slot]! >= 1.3 ? "rush hour" : t.hours[slot]! >= 1 ? "steady" : t.hours[slot]! >= 0.5 ? "quiet" : "dead"}.`}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnPrimary} disabled={closed || late || done} onClick={() => run(true)}>
              👩‍🍳 Work this service (1 slot)
            </button>
            <button type="button" className={btnGhost} disabled={closed || late || done || !canDelegate} onClick={() => run(false)}>
              🧑‍🍳 Let the staff run it
            </button>
          </div>
          {!canDelegate ? <p className="mt-1 text-[11px] text-slate-500">Hire a manager or head chef to run services without you. With a manager and a cook, dinner runs every night on its own.</p> : null}
        </section>
      )}
      {v.equipment.some((o) => o.broken) ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          ⚠️ Broken: {v.equipment.filter((o) => o.broken).map((o) => equipment(o.def)?.name.toLowerCase()).join(", ")}. Dishes that need it can't be made. Repair it under Kitchen{v.staff.some((x) => x.role === "manager") ? ", or your manager will before the next service" : ""}.
        </p>
      ) : null}
      {report ? <Report r={report} onClose={() => setReport(null)} /> : null}
      <section>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-xs text-slate-400">Rating</p>
            <p className="font-semibold">{v.services ? `${starsOf(v.rating)}★` : "–"}</p>
            <Meter value={v.rating} tone="bg-amber-400" />
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-xs text-slate-400">Hygiene</p>
            <p className="font-semibold">{Math.round(v.clean)}%</p>
            <Meter value={v.clean} tone={v.clean >= 60 ? "bg-emerald-400" : v.clean >= 40 ? "bg-amber-400" : "bg-red-500"} />
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-xs text-slate-400">This week</p>
            <p className={`font-semibold ${v.week.revenue - v.week.cost >= 0 ? "text-emerald-300" : "text-red-300"}`}>{naira(v.week.revenue - v.week.cost)}</p>
            <p className="text-[11px] text-slate-500">
              {naira(v.week.revenue)} in · {naira(v.week.cost)} out
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-xs text-slate-400">Weekly bills</p>
            <p className="font-semibold">{naira(t.rent + v.staff.reduce((a, x) => a + x.salary, 0))}</p>
            <p className="text-[11px] text-slate-500">rent + wages</p>
          </div>
        </div>
        {tags.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-400">Known for:</span>
            {tags.map((x) => (
              <span key={x} className={`rounded-full px-2 py-0.5 text-xs ${/Dirty|Slow|Overpriced|Small/.test(x) ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-200"}`}>
                {x}
              </span>
            ))}
          </div>
        ) : null}
        {v.inspections[0] ? <p className="mt-2 text-xs text-slate-500">Last inspection (day {v.inspections[0].day}): {v.inspections[0].note}</p> : null}
      </section>
      <section>
        <h3 className={label}>Settings</h3>
        <div className="mt-2 grid gap-2">
          {!t.delivery && t.id !== "catering" ? (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span>
                🛵 Delivery apps
                <span className="block text-[11px] text-slate-500">More orders; the apps take 22% (10% with your own rider).</span>
              </span>
              <input type="checkbox" className="size-5 accent-blue-500" checked={v.delivery} onChange={(e) => setVenue(v.id, { delivery: e.target.checked })} />
            </label>
          ) : null}
          <label className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <span>
              📦 Restock automatically
              <span className="block text-[11px] text-slate-500">Buys what each service needs from the wholesaler.</span>
            </span>
            <input type="checkbox" className="size-5 accent-blue-500" checked={v.autoStock} onChange={(e) => setVenue(v.id, { autoStock: e.target.checked })} />
          </label>
          <label className="block rounded-xl bg-white/5 px-3 py-2 text-sm">
            <span className="flex justify-between">
              <span>🍛 Portion size</span>
              <span className="tabular-nums text-slate-400">{Math.round(v.portion * 100)}%</span>
            </span>
            <input type="range" min={0.8} max={1.4} step={0.05} value={v.portion} onChange={(e) => setVenue(v.id, { portion: Number(e.target.value) })} className="w-full accent-blue-500" aria-label="Portion size" />
            <span className="text-[11px] text-slate-500">Bigger portions cost more but win fans; small ones save money and annoy people.</span>
          </label>
          {t.mobile ? (
            <label className="block rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span>🚚 Park the truck in</span>
              <select value={v.district} onChange={(e) => truckMove(v.id, e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#0d1220] px-3">
                {Object.keys(DISTRICT_FOOT).map((d) => (
                  <option key={d} value={d}>
                    {districtName(d)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button type="button" className={btnGhost} onClick={() => venueDeepClean(v.id)} disabled={v.clean >= 98}>
            🧽 Hire deep cleaners
          </button>
          <button type="button" className={btnGhost} onClick={() => venuePromote(v.id)} disabled={promo >= state.day}>
            📣 {promo >= state.day ? `Promotion runs to day ${promo}` : "Run a promotion"}
          </button>
        </div>
      </section>
      {v.ledger.length ? (
        <section>
          <h3 className={label}>Recent services</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 font-medium">Service</th>
                  <th className="font-medium">Served</th>
                  <th className="font-medium">Left</th>
                  <th className="font-medium">In</th>
                  <th className="font-medium">Out</th>
                </tr>
              </thead>
              <tbody>
                {v.ledger.slice(0, 8).map((l, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-1 pr-2">{l.label}</td>
                    <td>{l.customers}</td>
                    <td className={l.walkouts ? "text-amber-300" : ""}>{l.walkouts}</td>
                    <td className="text-emerald-300">{naira(l.revenue)}</td>
                    <td>{naira(l.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <section>
        {!selling ? (
          <button type="button" className="text-xs text-red-300 underline" onClick={() => setSelling(true)}>
            Sell this business
          </button>
        ) : (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm">
            <p>Sell {v.name} for about {naira(Math.round(t.cost * (0.35 + v.rating / 250)))}? Staff, stock and kit go with it.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  venueSell(v.id);
                  onSold();
                }}
              >
                Sell
              </button>
              <button type="button" className={btnGhost} onClick={() => setSelling(false)}>
                Keep it
              </button>
            </div>
          </div>
        )}
      </section>
      {k.venues.length > 1 ? null : null}
    </div>
  );
}

function Report({ r, onClose }: { r: ServiceReport; onClose: () => void }) {
  if (!r.ok) return <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">{r.text}</p>;
  const profit = (r.revenue ?? 0) - (r.cost ?? 0);
  return (
    <section className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{r.label}</p>
        <p className="text-lg">{r.stars ? `${r.stars}★` : ""}</p>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <dt className="text-slate-400">Served</dt>
          <dd className="text-lg font-semibold">{r.served}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Walked out</dt>
          <dd className={`text-lg font-semibold ${r.walkouts ? "text-amber-300" : ""}`}>{r.walkouts}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Wait</dt>
          <dd className="text-lg font-semibold">{r.wait}m</dd>
        </div>
        <div>
          <dt className="text-slate-400">Takings</dt>
          <dd className="font-semibold text-emerald-300">{naira(r.revenue ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Costs</dt>
          <dd className="font-semibold">{naira(r.cost ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">{profit >= 0 ? "Profit" : "Loss"}</dt>
          <dd className={`font-semibold ${profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>{naira(Math.abs(profit))}</dd>
        </div>
      </dl>
      <ul className="mt-2 space-y-0.5 text-xs">
        {r.items?.map((x) => (
          <li key={x.name} className="flex justify-between gap-2">
            <span className="truncate">
              {x.name}
              {x.ran_out ? <span className="text-amber-300"> · ran out</span> : null}
            </span>
            <span className="shrink-0 text-slate-400">
              {x.sold} sold · {x.sold ? grade(x.quality).toLowerCase() : "–"}
            </span>
          </li>
        ))}
      </ul>
      {r.notes?.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-100">
          {r.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      ) : null}
      {r.reviews?.length ? (
        <ul className="mt-2 space-y-1 text-xs">
          {r.reviews.map((x, i) => (
            <li key={i} className="rounded-lg bg-black/20 px-2 py-1">
              {"★".repeat(x.stars)}
              {"☆".repeat(5 - x.stars)} <span className="text-slate-400">{x.who}:</span> {x.text}
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="mt-2 text-xs text-sky-300 underline" onClick={onClose}>
        OK
      </button>
    </section>
  );
}

function MenuView({ state, k, v }: { state: GameState; k: Kitchen; v: Venue }) {
  const t = venueType(v.type)!;
  const [adding, setAdding] = useState("");
  const options = [
    ...RECIPES.filter((r) => k.recipes[r.id] && t.courses.includes(r.course)).map((r) => ({ key: r.id, recipe: r.id, custom: undefined as string | undefined, name: r.name })),
    ...k.customs.filter((c) => recipe(c.base) && t.courses.includes(recipe(c.base)!.course)).map((c) => ({ key: `c:${c.id}`, recipe: c.base, custom: c.id, name: `${c.signature ? "✨ " : ""}${c.name}` })),
  ].filter((o) => !v.menu.some((m) => m.recipe === o.recipe && m.custom === o.custom));
  return (
    <div>
      <p className="text-xs text-slate-500">
        A {t.name.toLowerCase()} sells {t.courses.join(", ")}. Customers here like {t.likes.join(", ")} food. Price near the fair price, or below it to pull crowds.
      </p>
      {!v.menu.length ? <p className="mt-3 text-sm text-amber-200">The menu is empty. Add dishes you know how to cook.</p> : null}
      <ul className="mt-3 grid grid-cols-1 gap-2">
        {v.menu.map((m) => {
          const r = recipe(m.recipe)!;
          const fair = fairPrice(r, t, v.district, state.day);
          const custom = m.custom ? k.customs.find((c) => c.id === m.custom) : undefined;
          const ratio = m.price / fair;
          return (
            <li key={`${m.recipe}-${m.custom ?? ""}`} className={`rounded-xl border p-3 ${m.active ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-70"}`}>
              <div className="flex items-start gap-2">
                <span className="text-2xl" aria-hidden>
                  {r.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{custom ? `${custom.signature ? "✨ " : ""}${custom.name}` : r.name}</p>
                  <p className="text-xs text-slate-400">
                    {m.sold ? `${m.sold} sold · ${grade(m.avg).toLowerCase()} (${m.avg})` : "Not sold yet"} · fair price {naira(fair)}
                  </p>
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" className="size-4 accent-blue-500" checked={m.active} onChange={(e) => editMenu(v.id, m.recipe, m.custom, { active: e.target.checked })} />
                  On
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl bg-black/20">
                  <button type="button" className="size-9 rounded-lg hover:bg-white/10" aria-label="Lower price" onClick={() => editMenu(v.id, m.recipe, m.custom, { price: m.price - Math.max(50, Math.round(fair / 20 / 50) * 50) })}>
                    −
                  </button>
                  <span className={`min-w-20 text-center text-sm font-semibold tabular-nums ${ratio > 1.3 ? "text-red-300" : ratio < 0.85 ? "text-amber-200" : "text-emerald-300"}`}>{naira(m.price)}</span>
                  <button type="button" className="size-9 rounded-lg hover:bg-white/10" aria-label="Raise price" onClick={() => editMenu(v.id, m.recipe, m.custom, { price: m.price + Math.max(50, Math.round(fair / 20 / 50) * 50) })}>
                    +
                  </button>
                </div>
                <select value={m.tier} onChange={(e) => editMenu(v.id, m.recipe, m.custom, { tier: e.target.value as Tier })} className="min-h-9 rounded-xl border border-white/15 bg-[#0d1220] px-2 text-xs" aria-label="Ingredient quality">
                  <option value="cheap">Cheap ingredients</option>
                  <option value="standard">Standard ingredients</option>
                  <option value="premium">Premium ingredients</option>
                </select>
                <button type="button" className="ml-auto min-h-9 rounded-lg px-2 text-xs text-slate-400 hover:bg-white/10" onClick={() => editMenu(v.id, m.recipe, m.custom, { remove: true })}>
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex gap-2">
        <select value={adding} onChange={(e) => setAdding(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-[#0d1220] px-3 text-sm" aria-label="Dish to add">
          <option value="">Add a dish you know…</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnPrimary}
          disabled={!adding}
          onClick={() => {
            const o = options.find((x) => x.key === adding);
            if (o) addMenuItem(v.id, o.recipe, o.custom);
            setAdding("");
          }}
        >
          Add
        </button>
      </div>
      {!options.length ? <p className="mt-2 text-xs text-slate-500">Learn more recipes that suit a {t.name.toLowerCase()} to grow the menu.</p> : null}
    </div>
  );
}

function StaffView({ state, v }: { state: GameState; v: Venue }) {
  const pool = candidates(state, v).filter((c) => !state.flags[`hired_${c.id}`]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const statRow = (name: string, value: number) => (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-[11px] text-slate-400">
      <span>{name}</span>
      <Meter value={value} tone="bg-blue-400" />
    </div>
  );
  return (
    <div className="space-y-4">
      <section>
        <h3 className={label}>Your team</h3>
        {!v.staff.length ? <p className="mt-2 text-sm text-slate-400">Nobody yet. You'll have to cook every service yourself.</p> : null}
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {v.staff.map((x) => (
            <li key={x.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold">{x.name}</p>
              <p className="text-xs text-slate-400">
                {ROLE_INFO[x.role].label} · skill {Math.round(x.skill)} · {naira(x.salary)}/wk · {x.exp} services
              </p>
              <div className="mt-1.5 grid gap-1">
                {statRow("Speed", x.speed)}
                {statRow("Reliable", x.reliability)}
                {statRow("Clean", x.clean)}
                <div className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-[11px] text-slate-400">
                  <span>Stress</span>
                  <Meter value={x.stress} tone={x.stress >= 70 ? "bg-red-500" : "bg-amber-400"} />
                </div>
              </div>
              {confirm === x.id ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="min-h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold"
                    onClick={() => {
                      fireStaff(v.id, x.id);
                      setConfirm(null);
                    }}
                  >
                    Let them go
                  </button>
                  <button type="button" className="min-h-9 rounded-lg bg-white/10 px-3 text-xs" onClick={() => setConfirm(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" className="mt-2 min-h-9 text-xs text-slate-400 underline" onClick={() => setConfirm(x.id)}>
                  Fire
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className={label}>Looking for work this week</h3>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pool.map((c) => (
            <li key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-slate-400">
                {ROLE_INFO[c.role].label} · skill {c.skill} · speed {c.speed} · reliability {c.reliability}
              </p>
              <p className="text-[11px] text-slate-500">{ROLE_INFO[c.role].blurb}</p>
              <button type="button" className={`${btnPrimary} mt-2 min-h-9 text-xs`} onClick={() => hireStaff(v.id, c.id)}>
                Hire · {naira(c.salary)}/wk
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">New people look for work every week. Wages are paid weekly with the rent.</p>
      </section>
    </div>
  );
}

function KitchenView({ state, v }: { state: GameState; v: Venue }) {
  const t = venueType(v.type)!;
  const [sel, setSel] = useState<string | null>(null);
  const [shop, setShop] = useState(false);
  const [station, setStation] = useState<string>("cook");
  const cells = t.grid.w * t.grid.h;
  const score = layoutScore(v);
  const placed = v.equipment.filter((o) => o.cell != null);
  const STATION_TONE: Record<string, string> = { cold: "bg-cyan-500/20", prep: "bg-lime-500/20", cook: "bg-orange-500/20", plate: "bg-violet-500/20", wash: "bg-sky-500/20", drink: "bg-pink-500/20", bake: "bg-amber-500/20" };
  return (
    <div className="space-y-4">
      <section>
        <div className="flex items-center justify-between">
          <h3 className={label}>Layout</h3>
          <span className={`text-xs ${score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-200" : "text-red-300"}`}>Flow {score}/100</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">Food should flow from cold storage → prep → cooking → plating, with washing near the line. Tap a station, then tap where it should go.</p>
        <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${t.grid.w}, minmax(0, 1fr))` }}>
          {Array.from({ length: cells }, (_, c) => {
            const o = placed.find((x) => x.cell === c);
            const def = o ? equipment(o.def) : undefined;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  if (sel && (!o || o.uid !== sel)) {
                    moveVenueKit(v.id, sel, c);
                    setSel(null);
                  } else setSel(o ? (sel === o.uid ? null : o.uid) : null);
                }}
                className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg border text-center ${o ? `${STATION_TONE[def?.station ?? ""] ?? "bg-white/10"} ${sel === o.uid ? "border-blue-400 ring-2 ring-blue-400" : "border-white/10"}` : sel ? "border-dashed border-blue-400/60 bg-blue-400/5" : "border-dashed border-white/10"}`}
                aria-label={o ? `${def?.name}${o.broken ? ", broken" : ""}` : `Empty space ${c + 1}`}
              >
                {o ? (
                  <>
                    <span className="text-lg leading-none" aria-hidden>
                      {o.broken ? "⚠️" : def?.icon}
                    </span>
                    <span className="mt-0.5 line-clamp-2 px-0.5 text-[9px] leading-tight text-slate-300">{def?.name}</span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
          {Object.entries(STATION_TONE).map(([k2, tone]) => (
            <span key={k2} className="flex items-center gap-1">
              <span className={`inline-block size-3 rounded ${tone}`} />
              {k2}
            </span>
          ))}
        </div>
      </section>
      <section>
        <h3 className={label}>Equipment</h3>
        <ul className="mt-2 grid grid-cols-1 gap-1.5">
          {v.equipment.map((o) => {
            const def = equipment(o.def);
            const st = stats(o.def, o.tier);
            return (
              <li key={o.uid} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-sm">
                <span aria-hidden>{def?.icon}</span>
                <span className="min-w-0 flex-1 truncate">
                  {def?.name} <span className="text-xs text-slate-400">· {TIER_LABEL[o.tier]} · {Math.round(o.condition)}%</span>
                  {o.broken ? <span className="ml-1 text-xs font-semibold text-red-300">BROKEN</span> : null}
                </span>
                {o.broken || o.condition < 70 ? (
                  <button type="button" className="min-h-9 rounded-lg bg-white/10 px-2 text-xs" onClick={() => repairEquipment(o.uid, v.id)}>
                    {o.broken ? "Repair" : "Service"} {naira(repairCost(o))}
                  </button>
                ) : null}
                <button type="button" className="min-h-9 rounded-lg px-2 text-xs text-slate-400 hover:bg-white/10" onClick={() => sellEquipment(o.uid, v.id)}>
                  Sell {naira(Math.round((st?.price ?? 0) * (o.broken ? 0.1 : 0.35 * (o.condition / 100))))}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <button type="button" className={btnGhost} onClick={() => setShop(!shop)}>
          {shop ? "Close the catalogue" : "🛒 Buy commercial equipment"}
        </button>
        {shop ? (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1.5">
              {["cold", "prep", "cook", "bake", "drink", "plate", "wash"].map((x) => (
                <button key={x} type="button" className={chip(station === x)} onClick={() => setStation(x)}>
                  {x}
                </button>
              ))}
            </div>
            <ul className="mt-2 grid grid-cols-1 gap-2">
              {EQUIPMENT.filter((e) => e.scope !== "home" && e.station === station && (!e.for || e.for.includes(t.id))).map((e) => (
                <li key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <p className="text-sm font-semibold">
                    {e.icon} {e.name}
                  </p>
                  {e.blurb ? <p className="text-[11px] text-slate-500">{e.blurb}</p> : null}
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(["basic", "pro", "luxury"] as EquipTier[]).map((tier) => {
                      const st = e.tiers[tier];
                      if (!st) return <span key={tier} />;
                      return (
                        <button key={tier} type="button" disabled={state.stats.money < st.price} onClick={() => buyEquipment(e.id, tier, v.id)} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-left text-xs disabled:opacity-40">
                          <span className="block font-semibold">{TIER_LABEL[tier]}</span>
                          <span className="block text-emerald-300">{naira(st.price)}</span>
                          <span className="block text-[10px] text-slate-500">
                            ×{st.capacity} · speed {st.speed}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StockView({ state, v }: { state: GameState; v: Venue }) {
  const src = SOURCES.find((x) => x.id === "sani")!;
  const needs = [...new Set(v.menu.flatMap((m) => recipe(m.recipe)?.needs.map((n) => n.id) ?? []))];
  const [qty, setQty] = useState(10);
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Storage: cupboard {Math.round(used(v.stock, "pantry"))}/{capacity(v.equipment, "pantry")} · fridge {Math.round(used(v.stock, "fridge"))}/{capacity(v.equipment, "fridge")} · freezer{" "}
        {Math.round(used(v.stock, "freezer"))}/{capacity(v.equipment, "freezer")}. {v.autoStock ? "Restocking automatically before each service." : "Auto-restock is off: buy stock yourself."}
      </p>
      <section>
        <h3 className={label}>In stock</h3>
        {!v.stock.length ? <p className="mt-2 text-sm text-slate-500">Empty.</p> : null}
        <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {v.stock.map((l) => (
            <li key={l.id} className="rounded-lg bg-white/5 px-2 py-1.5 text-xs">
              {ingredient(l.ing)?.icon} {l.qty} × {ingredient(l.ing)?.name}
              <span className="block text-[10px] text-slate-500">
                {l.tier} · {Math.max(0, Math.ceil(l.expires - state.day))}d left
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className={label}>Order from {src.name}</h3>
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="min-h-9 rounded-xl border border-white/15 bg-[#0d1220] px-2 text-xs" aria-label="Quantity">
            {[5, 10, 20, 40].map((n) => (
              <option key={n} value={n}>
                × {n}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{src.blurb}</p>
        <ul className="mt-2 grid grid-cols-1 gap-1.5">
          {needs.map((id) => {
            const p = foodPrice(state, id, "standard", src);
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 text-sm">
                <span aria-hidden>{ingredient(id)?.icon}</span>
                <span className="min-w-0 flex-1 truncate">{ingredient(id)?.name}</span>
                <span className="text-xs text-slate-400">{naira(p)} each</span>
                <button type="button" className={`${btnPrimary} min-h-9 px-2 text-xs`} disabled={state.stats.money < p * qty} onClick={() => buyFood("sani", id, "standard", qty, v.id)}>
                  {naira(p * qty)}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ReviewsView({ v }: { v: Venue }) {
  if (!v.reviews.length) return <p className="text-sm text-slate-400">No reviews yet. Run some services.</p>;
  return (
    <ul className="grid grid-cols-1 gap-2">
      {v.reviews.map((x, i) => (
        <li key={i} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <p>
            <span className="text-amber-300">
              {"★".repeat(x.stars)}
              {"☆".repeat(5 - x.stars)}
            </span>{" "}
            <span className="text-xs text-slate-400">
              {x.who} · day {x.day}
            </span>
          </p>
          <p className="mt-1 text-slate-200">{x.text}</p>
        </li>
      ))}
    </ul>
  );
}

// ── Catering ─────────────────────────────────────────────────────────────────

function CateringView({ state, k }: { state: GameState; k: Kitchen }) {
  const [where, setWhere] = useState(k.venues[0]?.id ?? "");
  const [dish, setDish] = useState<Record<string, string>>({});
  if (!k.venues.length) return <p className="mt-3 text-sm text-slate-400">Catering requests come to people who run a food business. Open one first (a catering company gets the most).</p>;
  if (!k.catering.length) return <p className="mt-3 text-sm text-slate-400">No catering requests right now. New ones come in every week.</p>;
  return (
    <div className="mt-3 space-y-3">
      <label className="block text-sm">
        <span className="text-slate-400">Cook at</span>
        <select value={where} onChange={(e) => setWhere(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#0d1220] px-3">
          {k.venues.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      {k.catering.map((c) => {
        const done = c.needs.every((n) => (c.ready[n.course] ?? 0) >= n.qty);
        return (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-semibold">{c.title}</p>
            <p className="text-xs text-slate-400">
              {c.guests} guests · {naira(c.pay)} · due day {c.deadline} ({Math.max(0, c.deadline - state.day)} days)
            </p>
            {!c.accepted ? (
              <>
                <p className="mt-1 text-xs text-slate-300">They need: {c.needs.map((n) => `${n.qty} ${n.course === "main" ? "main portions" : `${n.course}s`}`).join(", ")}.</p>
                <button type="button" className={`${btnPrimary} mt-2 min-h-9 text-xs`} onClick={() => cateringAccept(c.id)}>
                  Accept the job
                </button>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                {c.needs.map((n) => {
                  const options = RECIPES.filter((r) => k.recipes[r.id] && (n.course === "drink" ? r.course === "drink" : n.course === "dessert" ? r.course === "dessert" || r.course === "baked" : !["drink", "dessert", "baked"].includes(r.course)));
                  const pick = dish[`${c.id}-${n.course}`] ?? options[0]?.id ?? "";
                  const ready = c.ready[n.course] ?? 0;
                  return (
                    <div key={n.course} className="rounded-lg bg-black/20 p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize">{n.course}</span>
                        <span className={ready >= n.qty ? "text-emerald-300" : "text-slate-400"}>
                          {ready}/{n.qty}
                        </span>
                      </div>
                      <Meter value={(ready / n.qty) * 100} tone="bg-emerald-400" />
                      {ready < n.qty ? (
                        <div className="mt-1.5 flex gap-2">
                          <select value={pick} onChange={(e) => setDish({ ...dish, [`${c.id}-${n.course}`]: e.target.value })} className="min-h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0d1220] px-2 text-xs" aria-label={`Dish for ${n.course}`}>
                            {options.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                          <button type="button" className={`${btnGhost} min-h-9 px-2 text-xs`} disabled={!pick || !where || state.slot >= SLOTS.length} onClick={() => cateringCook(c.id, where, pick)}>
                            Cook (1 slot)
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {c.quality ? <p className="text-xs text-slate-400">Quality so far: {grade(c.quality).toLowerCase()} ({c.quality})</p> : null}
                <button type="button" className={`${btnPrimary} min-h-9 text-xs`} disabled={!done} onClick={() => cateringDeliver(c.id)}>
                  Deliver and get paid
                </button>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-slate-500">Each cooking session buys what's missing from the wholesaler and cooks as much as your team can manage. Miss a deadline and your reputation suffers.</p>
    </div>
  );
}

// ── Festivals and competitions ───────────────────────────────────────────────

function EventsView({ state, k, market }: { state: GameState; k: Kitchen; market: string | null }) {
  const [dish, setDish] = useState<Record<string, string>>({});
  const events = k.events.filter((e) => !e.done).sort((a, b) => a.day - b.day);
  if (!events.length) return <p className="mt-3 text-sm text-slate-400">No food events coming up. Festivals and competitions are announced every week or two.</p>;
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2">
      {events.map((e) => {
        const today = e.day === state.day;
        const pick = dish[e.id] ?? k.leftovers[0]?.id ?? "";
        return (
          <li key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-semibold">
              {e.kind === "festival" ? "🎪" : "🏆"} {e.title}
            </p>
            <p className="text-xs text-slate-400">
              Day {e.day}
              {today ? " · TODAY" : e.day < state.day ? " · missed" : ` · in ${e.day - state.day} days`}
              {e.prize ? ` · prize ${naira(e.prize)}` : ""}
            </p>
            {e.kind === "competition" ? (
              <>
                <p className="mt-1 text-xs text-slate-300">Theme: {e.theme}. Cook your best dish, then bring it to the Abuja Culinary Academy on the day. Judges taste for flavour, presentation and creativity.</p>
                {today ? (
                  market === "academy" ? (
                    <div className="mt-2 flex gap-2">
                      <select value={pick} onChange={(ev) => setDish({ ...dish, [e.id]: ev.target.value })} className="min-h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0d1220] px-2 text-xs" aria-label="Your entry">
                        {k.leftovers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.scores.overall})
                          </option>
                        ))}
                      </select>
                      <button type="button" className={`${btnPrimary} min-h-9 px-3 text-xs`} disabled={!pick} onClick={() => competitionEnter(e.id, pick)}>
                        Enter
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-200">It's today! Go to the Abuja Culinary Academy in Wuse with a cooked dish.</p>
                  )
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-slate-300">Huge crowds all day. Everything you've cooked at home goes on your stall (₦5,000 stall fee, takes the afternoon).</p>
                {today ? (
                  <button type="button" className={`${btnPrimary} mt-2 min-h-9 text-xs`} disabled={!k.leftovers.length || state.slot >= SLOTS.length} onClick={() => festivalSell(e.id)}>
                    Sell at the festival ({k.leftovers.reduce((a, d) => a + d.portions, 0)} portions)
                  </button>
                ) : null}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
