import { useState } from "react";
import { CityApp } from "./CityApp";
import { LOANS, NPCS, PLACES, district } from "../systems/data";
import { borrow, business, callContact, driveTo, negotiate, orderMeal, payBill, jobStatus, quitJob, repay, retire, travel } from "../systems/engine";
import { arrivalOf } from "../systems/citymap";
import { SocialApp } from "./Social";
import { ago, memoriesOf, TONE_ICON } from "../systems/memory";
import { olderNews, todaysNews, type NewsTag, type Story } from "../systems/news";
import { MONTHS, SEASON_NAMES, seasonOf, monthOf } from "../systems/weather";
import { ASSET_NAMES, END_AGE, FREEDOM_TARGET, USD_RATE, check, debt, naira, netWorth, npcName } from "../systems/rules";
import { RIDE_INFO, RIDE_MODES, fare, fuelCost, rideBan, rideKm } from "../systems/rides";
import { rainSurge, weatherOf } from "../systems/weather";
import { hasCar } from "../systems/drive";
import { BUSINESSES, bizDef, canStart, growWhy, upgradeCost } from "../systems/business";
import { DEALS, QUALITY_LABEL, blocked, repLabel } from "../systems/negotiate/core";
import { person, TRAIT_INFO } from "../systems/negotiate/people";
import { deleteSave, replace } from "../systems/store";
import type { GameState } from "../systems/types";
import { REVIEW_DAYS } from "../systems/bank";
import { INJURY, injured } from "../systems/health";
import { DELIVERY_FEE, MENU, daysUnwashed, hungerWord, isDirty, lifeOf, thirstWord } from "../systems/life";
import { Linkup } from "./Linkup";
import { btnGhost, btnPrimary } from "./theme";
import { Trade } from "./Trade";
import { WardrobePanel } from "./Wardrobe";

export type PhoneApp = "home" | "food" | "bills" | "business" | "deals" | "wallet" | "loans" | "jobs" | "contacts" | "map" | "stats" | "settings" | "linkup" | "trade" | "wardrobe" | "kitchen" | "city" | "news" | "social" | "careers";

const APPS: { id: PhoneApp; label: string; icon: string; tint: string }[] = [
  { id: "wallet", label: "Wallet", icon: "💳", tint: "bg-blue-600" },
  { id: "news", label: "Abuja Daily", icon: "📰", tint: "bg-stone-600" },
  { id: "social", label: "Instaflex", icon: "📸", tint: "bg-fuchsia-600" },
  { id: "food", label: "ChopNow", icon: "🍲", tint: "bg-amber-600" },
  { id: "kitchen", label: "Kitchen", icon: "🍳", tint: "bg-orange-600" },
  { id: "bills", label: "Bills", icon: "🧾", tint: "bg-cyan-700" },
  { id: "business", label: "Business", icon: "🏪", tint: "bg-lime-700" },
  { id: "deals", label: "Deals", icon: "🤝", tint: "bg-emerald-700" },
  { id: "trade", label: "Trade", icon: "📈", tint: "bg-indigo-600" },
  { id: "linkup", label: "Linkup", icon: "💗", tint: "bg-pink-600" },
  { id: "loans", label: "QuickKash", icon: "💸", tint: "bg-red-600" },
  { id: "jobs", label: "Jobs", icon: "💼", tint: "bg-sky-600" },
  { id: "careers", label: "Bank Careers", icon: "🏦", tint: "bg-blue-800" },
  { id: "contacts", label: "Contacts", icon: "👥", tint: "bg-violet-600" },
  { id: "map", label: "Rides", icon: "🛺", tint: "bg-blue-600" },
  { id: "stats", label: "Life", icon: "📊", tint: "bg-teal-600" },
  { id: "city", label: "City", icon: "🏙️", tint: "bg-teal-700" },
  { id: "wardrobe", label: "Wardrobe", icon: "👕", tint: "bg-orange-500" },
  { id: "settings", label: "Settings", icon: "⚙️", tint: "bg-slate-600" },
];

const SOON = ["Zoom ride-hailing", "Elections", "Inheritance"];

export function Phone({ state, app, onApp, onClose }: { state: GameState; app: PhoneApp; onApp: (app: PhoneApp) => void; onClose: () => void }) {
  const current = APPS.find((item) => item.id === app);
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-white/15 bg-[#05070c] text-slate-100 shadow-2xl sm:h-[min(48rem,92dvh)] sm:rounded-[2.5rem]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Phone"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          {app === "home" ? (
            <span className="text-sm text-slate-400">Day {state.day}</span>
          ) : (
            <button type="button" className="min-h-11 rounded-xl px-2 text-sm" onClick={() => onApp("home")}>
              ‹ Home
            </button>
          )}
          <p className="font-semibold">{current?.label ?? "Phone"}</p>
          <button type="button" className="min-h-11 rounded-xl px-3 text-sm" onClick={onClose} aria-label="Close phone">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {app === "home" ? <Home onApp={onApp} /> : null}
          {app === "wallet" ? <Wallet state={state} /> : null}
          {app === "news" ? <NewsApp state={state} /> : null}
          {app === "social" ? <SocialApp state={state} /> : null}
          {app === "food" ? <FoodApp state={state} /> : null}
          {app === "bills" ? <Bills state={state} /> : null}
          {app === "business" ? <BusinessApp state={state} /> : null}
          {app === "deals" ? <DealsApp state={state} onClose={onClose} /> : null}
          {app === "loans" ? <Loans state={state} /> : null}
          {app === "jobs" ? <Jobs state={state} /> : null}
          {app === "contacts" ? <Contacts state={state} /> : null}
          {app === "map" ? <MapApp state={state} onDone={onClose} /> : null}
          {app === "stats" ? <Life state={state} /> : null}
          {app === "city" ? <CityApp state={state} /> : null}
          {app === "settings" ? <Settings /> : null}
          {app === "linkup" ? <Linkup state={state} /> : null}
          {app === "trade" ? <Trade state={state} /> : null}
          {app === "wardrobe" ? <WardrobePanel state={state} onDone={() => onApp("home")} /> : null}
        </div>
      </div>
    </div>
  );
}

function Home({ onApp }: { onApp: (app: PhoneApp) => void }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4">
        {APPS.map((item) => (
          <button key={item.id} type="button" onClick={() => onApp(item.id)} className="flex flex-col items-center gap-1.5 text-xs">
            <span className={`flex size-14 items-center justify-center rounded-2xl text-2xl ${item.tint}`} aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-8 text-xs text-slate-500">Coming in the next updates: {SOON.join(", ")}.</p>
    </div>
  );
}

function DealsApp({ state, onClose }: { state: GameState; onClose: () => void }) {
  const neg = state.life?.neg;
  const rep = repLabel(neg?.rep);
  const opps = (neg?.opportunities ?? []).filter((o) => o.until >= state.day);
  const contacts = Object.entries(neg?.npcs ?? {});
  const start = (id: string) => {
    negotiate(id);
    onClose();
  };
  return (
    <div>
      <div className="rounded-2xl bg-emerald-700 p-4">
        <p className="font-display text-2xl">Deals</p>
        <p className="text-sm opacity-90">Every price in Abuja is negotiable. Persuade first, then bargain.</p>
        <p className="mt-2 text-sm">
          Your reputation: <span className="font-semibold">{rep.label}</span>
        </p>
        <p className="text-xs opacity-80">{rep.blurb}</p>
      </div>
      {neg?.staff || neg?.supplier || neg?.rent ? (
        <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm">
          <p className="font-semibold">Running arrangements</p>
          {neg.rent ? <p className="text-slate-300">🏠 Rent: {naira(neg.rent)} a week{(neg.rentPrepaidUntil ?? 0) >= state.day ? `, prepaid to day ${neg.rentPrepaidUntil}` : ""}</p> : null}
          {neg.staff ? <p className="text-slate-300">🧑‍💼 {neg.staff.name}: {naira(neg.staff.salary)} a week</p> : null}
          {neg.supplier && neg.supplier.until >= state.day ? <p className="text-slate-300">📦 Supplier discount {Math.round(neg.supplier.discount * 1000) / 10}% until day {neg.supplier.until}</p> : null}
        </div>
      ) : null}
      {opps.length ? (
        <div className="mt-3 grid gap-2">
          {opps.map((o) => (
            <button key={o.deal} type="button" onClick={() => start(o.deal)} className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-left text-sm">
              <span className="font-semibold">⭐ {DEALS.find((d) => d.id === o.deal)?.title}</span>
              <span className="block text-xs text-slate-300">{o.text} Until day {o.until}.</span>
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-5 font-semibold">Open deals</p>
      <div className="mt-2 grid gap-2">
        {DEALS.map((d) => {
          const why = blocked(state, d.id);
          if (why && /already|don't own|You need|haven't hired|only started/.test(why) && !/won't|refuses/.test(why)) return null;
          return (
            <button key={d.id} type="button" disabled={Boolean(why)} onClick={() => start(d.id)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left disabled:opacity-50">
              <span className="block font-semibold">
                {d.icon} {d.title}
              </span>
              <span className="block text-xs text-slate-400">{d.blurb}</span>
              <span className="mt-1 block text-[11px] text-slate-500">
                {person(d.npc)?.name} · {d.where}
              </span>
              {why ? <span className="mt-1 block text-xs text-amber-300">🔒 {why}</span> : null}
            </button>
          );
        })}
      </div>
      {contacts.length ? (
        <>
          <p className="mt-5 font-semibold">People you've negotiated with</p>
          <div className="mt-2 grid gap-2">
            {contacts.map(([id, m]) => {
              const who = person(id);
              if (!who) return null;
              return (
                <div key={id} className="rounded-xl bg-white/5 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{who.name}</p>
                    <p className={`text-xs ${m.rel >= 20 ? "text-emerald-300" : m.rel <= -20 ? "text-red-300" : "text-slate-400"}`}>{m.rel >= 50 ? "Friendly" : m.rel >= 20 ? "Warm" : m.rel > -20 ? "Neutral" : m.rel > -50 ? "Cold" : "Hostile"}</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {m.known.length ? m.known.map((t) => `${TRAIT_INFO[t].icon} ${TRAIT_INFO[t].label}`).join(" · ") : "You haven't figured them out yet."}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {m.deals} deal{m.deals === 1 ? "" : "s"}
                    {m.last ? ` · last: ${QUALITY_LABEL[m.last].toLowerCase()}` : ""}
                    {m.bluffsCaught ? ` · caught you bluffing ${m.bluffsCaught}×` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function BusinessApp({ state }: { state: GameState }) {
  const mine = lifeOf(state).businesses;
  return (
    <div>
      <div className="rounded-2xl bg-lime-700 p-4">
        <p className="font-display text-2xl">Your businesses</p>
        <p className="text-sm opacity-90">Start small. Check in often. Grow when you can. The big leagues take months.</p>
        <p className="mt-2 text-xs opacity-80">{state.flags.cac ? "✅ Registered with CAC" : "Not registered with CAC yet: do it at the CAC office in Garki."}</p>
        <p className="mt-1 text-xs opacity-80">🍳 Restaurants, cafés, food trucks and catering: run them hands-on from the Kitchen app.</p>
      </div>
      {mine.length ? (
        <div className="mt-4 grid gap-3">
          {mine.map((b) => {
            const def = bizDef(b.id)!;
            const why = growWhy(state, b);
            const away = state.day - b.lastVisit;
            return (
              <div key={b.id} className="rounded-xl bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    {def.icon} {def.name} <span className="font-normal text-slate-400">· level {b.level}</span>
                  </p>
                  <p className={`tabular-nums font-semibold ${b.cash < 0 ? "text-red-400" : "text-emerald-400"}`}>{naira(b.cash)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Open since day {b.since} · {away === 0 ? "you checked in today" : `last check-in ${away} day${away > 1 ? "s" : ""} ago`}
                  {away > 7 ? <span className="text-red-400"> · profits are falling</span> : null}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <button type="button" className={`${btnGhost} min-h-9 px-2 text-xs`} onClick={() => business({ kind: "visit", id: b.id })}>
                    Check in
                  </button>
                  <button type="button" className={`${btnGhost} min-h-9 px-2 text-xs`} disabled={b.cash <= 0} onClick={() => business({ kind: "collect", id: b.id })}>
                    Take profit
                  </button>
                  <button type="button" className={`${btnPrimary} min-h-9 px-2 text-xs`} disabled={Boolean(why)} onClick={() => business({ kind: "grow", id: b.id })}>
                    Grow
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{why ? `Grow: ${why}` : `Grow to level ${b.level + 1}: ${naira(upgradeCost(def, b.level))}`}</p>
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="mt-5 font-semibold">Start a business</p>
      <div className="mt-2 grid gap-2">
        {BUSINESSES.filter((def) => !mine.some((b) => b.id === def.id)).map((def) => {
          const why = canStart(state, def);
          return (
            <button
              key={def.id}
              type="button"
              disabled={Boolean(why)}
              onClick={() => business({ kind: "start", id: def.id })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left disabled:opacity-50"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {def.icon} {def.name}
                </span>
                <span className="tabular-nums text-sm">{naira(def.start)}</span>
              </span>
              <span className="mt-0.5 block text-xs text-slate-400">{def.blurb}</span>
              <span className="mt-1 block text-xs text-slate-300">
                About {naira(def.weekly[0])}–{naira(def.weekly[1])} a week at first
              </span>
              {why ? <span className="mt-1 block text-xs text-amber-300">🔒 {why}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Bills({ state }: { state: GameState }) {
  const l = lifeOf(state);
  const hurt = injured(state);
  const rent = state.background === "lapo" ? 8000 : 15000;
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">⚡ Electricity (AEDC)</p>
          <p className={`text-sm font-semibold ${l.power.cut ? "text-red-400" : "text-emerald-400"}`}>{l.power.cut ? "Disconnected" : "Connected"}</p>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {l.power.owed ? `You owe ${naira(l.power.owed)}${l.power.cut ? " plus a ₦2,000 reconnection fee" : ""}.` : "Paid up. The bill comes every week with rent."}
        </p>
        {l.power.cut ? <p className="mt-1 text-xs text-slate-400">Without light you can't study, learn online or use the washing machine at home.</p> : null}
        {l.power.owed ? (
          <button type="button" className={`${btnPrimary} mt-3 w-full`} onClick={() => payBill("power")}>
            Pay {naira(l.power.owed + (l.power.cut ? 2000 : 0))}
          </button>
        ) : null}
      </div>
      <div className="rounded-2xl bg-white/5 p-4">
        <p className="font-semibold">🏥 Garki General Hospital</p>
        <p className="mt-1 text-sm text-slate-400">{l.hospitalBill ? `Unpaid bill: ${naira(l.hospitalBill)}. It counts as debt.` : "No hospital bills."}</p>
        {hurt ? (
          <p className="mt-1 text-sm text-red-400">
            Injury: {INJURY[hurt].name}
            {l.injury?.healsOn != null ? ` (treated, heals on day ${l.injury.healsOn})` : " (not treated yet: see a doctor)"}
          </p>
        ) : null}
        {l.hospitalBill ? (
          <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={() => payBill("hospital")}>
            Pay what you can
          </button>
        ) : null}
      </div>
      <div className="rounded-2xl bg-white/5 p-4 text-sm">
        <p className="font-semibold">🏠 Every week, automatically</p>
        <p className="mt-1 text-slate-400">
          Rent {naira(rent)}, transport and data {naira(4500)}, electricity, and any QuickKash repayment due.
        </p>
      </div>
    </div>
  );
}

function FoodApp({ state }: { state: GameState }) {
  const l = lifeOf(state);
  return (
    <div>
      <div className="rounded-2xl bg-amber-600 p-4">
        <p className="font-display text-2xl">ChopNow</p>
        <p className="text-sm opacity-90">Food to your door, anywhere in Abuja. Delivery {naira(DELIVERY_FEE)}.</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/5 p-2">
          🍲 {hungerWord(l.food)} <span className="text-slate-400">({l.food})</span>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          💧 {thirstWord(l.water)} <span className="text-slate-400">({l.water})</span>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {MENU.map((meal) => {
          const total = meal.price + DELIVERY_FEE;
          return (
            <button
              key={meal.id}
              type="button"
              disabled={state.stats.money < total}
              onClick={() => orderMeal(meal.id)}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/10 disabled:opacity-45"
            >
              <span className="text-2xl" aria-hidden>
                {meal.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{meal.name}</span>
                <span className="block text-xs text-slate-400">
                  {meal.from} · {[meal.food ? `+${meal.food} food` : "", meal.water ? `+${meal.water} water` : ""].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="tabular-nums text-sm font-semibold">{naira(meal.price)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">Cheaper: cook at home, eat at a buka in the market, or buy pure water from any kiosk.</p>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function Wallet({ state }: { state: GameState }) {
  const worth = netWorth(state);
  const frozen = lifeOf(state).frozen;
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 p-5">
        <p className="text-sm opacity-80">Naira balance</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{naira(state.stats.money)}</p>
        <p className="mt-3 text-sm opacity-80">USD: ${state.stats.usd.toLocaleString("en")} (≈ {naira(state.stats.usd * USD_RATE)})</p>
      </div>
      {frozen ? (
        <div className="mt-3 rounded-2xl border border-red-400/40 bg-red-500/15 p-3 text-sm">
          <p className="font-semibold text-red-300">🔒 {naira(frozen.amount)} frozen by Zuma Capital Bank</p>
          <p className="mt-1 text-slate-300">
            Since day {frozen.day}.{" "}
            {frozen.dirty
              ? "The bank linked it to fraud and told the EFCC."
              : frozen.proof
                ? `Take your BVN and the ${frozen.proof} to Bankers' Row in the CBD: they can release it on the spot.`
              : state.day - frozen.day < REVIEW_DAYS
                ? `Compliance is reviewing it. Go to Bankers' Row in the CBD from day ${frozen.day + REVIEW_DAYS}.`
                : "The review is done. Go to Bankers' Row in the CBD to get it released."}
          </p>
        </div>
      ) : null}
      <div className="mt-4">
        <Row label="Debt" value={naira(debt(state))} tone={debt(state) ? "text-red-400" : ""} />
        <Row label="Net worth" value={naira(worth)} />
        <Row label="Freedom target" value={naira(FREEDOM_TARGET)} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, (worth / FREEDOM_TARGET) * 100))}%` }} />
      </div>
      <p className="mt-6 font-semibold">Assets</p>
      {state.assets.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {state.assets.map((id) => (
            <li key={id}>• {ASSET_NAMES[id] ?? id}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">No assets yet. Land, houses and cars come later. A POS stand is a start.</p>
      )}
      <p className="mt-6 text-xs text-slate-500">Weekly bills: rent, transport, data and electricity leave your account every 7 days. See the Bills app.</p>
    </div>
  );
}

function Loans({ state }: { state: GameState }) {
  return (
    <div>
      <div className="rounded-2xl bg-red-600 p-4">
        <p className="font-display text-2xl">QuickKash</p>
        <p className="text-sm opacity-90">Fast loans. No collateral. No wahala.*</p>
        <p className="mt-2 text-[11px] opacity-75">*{LOANS.note} Missed payments add {LOANS.missedPenalty * 100}% and we message your contacts.</p>
      </div>
      <p className="mt-5 font-semibold">Borrow</p>
      <div className="mt-2 grid gap-2">
        {LOANS.offers.map((offer, index) => {
          const ok = check(state, offer.requires);
          const owed = Math.round(offer.amount * (1 + offer.interest));
          return (
            <button
              key={offer.amount}
              type="button"
              disabled={!ok}
              onClick={() => borrow(index)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left disabled:opacity-45"
            >
              <span className="block font-semibold">{naira(offer.amount)} now</span>
              <span className="block text-xs text-slate-400">
                {ok
                  ? `Repay ${naira(owed)} over ${offer.weeks} weeks (${naira(Math.ceil(owed / offer.weeks))}/week) · ${Math.round(offer.interest * 100)}% interest`
                  : `🔒 Needs ${offer.requires.stat} ${offer.requires.gte}`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-6 font-semibold">Your loans</p>
      {state.loans.length ? (
        <div className="mt-2 grid gap-2">
          {state.loans.map((loan) => (
            <div key={loan.id} className="rounded-xl bg-white/5 p-3 text-sm">
              <p className="font-semibold">
                Owing {naira(loan.owed)} <span className="font-normal text-slate-400">(borrowed {naira(loan.principal)})</span>
              </p>
              <p className="text-xs text-slate-400">
                {naira(loan.weekly)} due day {loan.nextDue}
                {loan.missed ? ` · ${loan.missed} missed` : ""}
              </p>
              <button type="button" className={`${btnGhost} mt-2 min-h-9`} onClick={() => repay(loan.id)}>
                Repay what you can
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">No loans. Mr. Felix misses you.</p>
      )}
    </div>
  );
}

function Jobs({ state }: { state: GameState }) {
  const list = jobStatus(state);
  return (
    <div>
      {state.job ? (
        <div className="mb-4 rounded-2xl bg-sky-700 p-4">
          <p className="text-sm opacity-80">Current job</p>
          <p className="font-display text-2xl">{list.find((item) => item.current)?.def.title}</p>
          <p className="text-sm opacity-90">Go to the workplace and choose “Work a shift”.</p>
          <button type="button" className={`${btnGhost} mt-3 min-h-9`} onClick={quitJob}>
            Resign
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-300">No job yet. Walk to a workplace and apply in person.</p>
      )}
      <p className="mb-4 rounded-xl bg-blue-900/40 p-3 text-sm text-slate-200">
        🏦 Banking careers (44 fictional employers) live in the <b>Bank Careers</b> app and at Bankers' Row in the CBD.
      </p>
      {(["entry", "mid", "top"] as const).map((tier) => (
        <div key={tier} className="mb-5">
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{tier === "entry" ? "Entry" : tier === "mid" ? "Mid-level" : "Top"}</p>
          <div className="mt-2 grid gap-2">
            {list
              .filter((item) => item.def.tier === tier && (item.def.id !== "bank_staff" || item.current))
              .map(({ def, ok, current }) => (
                <div key={def.id} className={`rounded-xl border p-3 text-sm ${current ? "border-sky-400" : "border-white/10"} bg-white/5`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{def.title}</p>
                    <p className="tabular-nums text-emerald-400">{naira(def.pay)}/shift</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {ok ? "✅" : "🔒"} {def.requiresText}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Apply at: {PLACES.find((p) => p.id === def.place)?.name}</p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Contacts({ state }: { state: GameState }) {
  const met = NPCS.filter((def) => state.npcs[def.id]?.met);
  if (!met.length) return <p className="text-sm text-slate-400">No contacts yet.</p>;
  return (
    <div className="grid gap-2">
      {met.map((def) => {
        const entry = state.npcs[def.id]!;
        return (
          <div key={def.id} className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-slate-950" style={{ background: def.color }}>
                {npcName(state, def.id).charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{npcName(state, def.id)}</p>
                <p className="text-xs text-slate-400">
                  {def.role} · {def.class === "nepo" ? "Nepo Baby" : def.class === "lapo" ? "Lapo Baby" : def.class}
                </p>
              </div>
              <button type="button" className={`${btnGhost} min-h-9 px-3`} onClick={() => callContact(def.id)}>
                Call
              </button>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violet-400" style={{ width: `${entry.rel}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{def.bio}</p>
            <Remembers state={state} who={def.id} />
          </div>
        );
      })}
      <p className="mt-2 text-xs text-slate-500">People remember what you do for them, and to them. Friends you don't see or call for three weeks drift away.</p>
    </div>
  );
}

const TAG_TINT: Record<NewsTag, string> = {
  Weather: "bg-sky-500/20 text-sky-200",
  Markets: "bg-emerald-500/20 text-emerald-200",
  City: "bg-amber-500/20 text-amber-200",
  Crime: "bg-red-500/20 text-red-200",
  Business: "bg-lime-500/20 text-lime-200",
  People: "bg-violet-500/20 text-violet-200",
  Politics: "bg-orange-500/20 text-orange-200",
};
const SERIF = { fontFamily: "Newsreader, Georgia, 'Times New Roman', serif" };

function StoryCard({ story, lead }: { story: Story; lead?: boolean }) {
  return (
    <article className={`rounded-xl p-3 ${story.you ? "bg-amber-400/10 ring-1 ring-amber-300/30" : "bg-white/5"}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
        <span className={`rounded-full px-2 py-0.5 ${TAG_TINT[story.tag]}`}>{story.tag}</span>
        {story.you ? <span className="text-amber-200">About you</span> : null}
      </div>
      <h3 className={`mt-2 leading-snug font-semibold text-slate-50 ${lead ? "text-xl" : "text-base"}`} style={SERIF}>
        <span aria-hidden className="mr-1.5">{story.icon}</span>
        {story.headline}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{story.body}</p>
    </article>
  );
}

function NewsApp({ state }: { state: GameState }) {
  const today = todaysNews(state);
  const older = olderNews(state);
  return (
    <div>
      <header className="border-b border-white/15 pb-3 text-center">
        <p className="text-2xl font-bold tracking-tight" style={SERIF}>
          Abuja Daily
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Day {state.day} · {MONTHS[monthOf(state.day)]} · {SEASON_NAMES[seasonOf(state.day)]}
        </p>
      </header>
      <div className="mt-3 grid gap-2">
        {today.map((story, i) => (
          <StoryCard key={story.id} story={story} lead={i === 0} />
        ))}
      </div>
      {older.length ? (
        <>
          <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">From the archive</p>
          <div className="grid gap-2">
            {older.map((story) => (
              <div key={story.id} className="rounded-xl bg-white/5 p-3 text-sm">
                <p className="text-xs text-slate-500">Day {story.day}</p>
                <p className="font-semibold" style={SERIF}>
                  {story.icon} {story.headline}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** What a contact remembers about you, the weightiest first. */
function Remembers({ state, who }: { state: GameState; who: string }) {
  const list = [...memoriesOf(state, who)].sort((a, b) => b.weight - a.weight || b.day - a.day).slice(0, 4);
  if (!list.length) return null;
  return (
    <ul className="mt-2 grid gap-1 border-t border-white/10 pt-2 text-xs text-slate-300" aria-label="They remember">
      {list.map((m) => (
        <li key={m.what} className="flex gap-2">
          <span aria-hidden>{TONE_ICON[m.tone]}</span>
          <span className="min-w-0 flex-1">{m.what}</span>
          {m.weight < 3 ? <span className="shrink-0 text-slate-500">{ago(state, m.day)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function MapApp({ state, onDone }: { state: GameState; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const canDrive = hasCar(state) && injured(state) !== "fracture";
  const shown = PLACES.filter((p) => check(state, (p as { if?: never }).if)).filter((p) =>
    `${p.name} ${district(p.district)?.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div>
      <input
        className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 outline-none focus:border-blue-400"
        placeholder="Search places"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p className="mt-2 text-xs text-slate-400">Pick where to go, then how: okada, keke or taxi get you there now. The bus is cheapest but takes a time slot. Okadas and kekes are banned in the city centre.{rainSurge(weatherOf(state.day, state.slot)) > 1 ? " It's raining: fares are up." : ""}</p>
      <div className="mt-3 grid gap-2">
        {shown.map((p) => {
          const d = district(p.district);
          const unwelcome = d?.gate && !check(state, d.gate.if);
          const surge = rainSurge(weatherOf(state.day, state.slot));
          const locked = unwelcome && d?.gate?.hard;
          const to = arrivalOf(p);
          return (
            <div key={p.id} className="rounded-xl bg-white/5 p-3">
              <p className="font-semibold">
                {p.name} {locked ? "🔒" : unwelcome ? "🛡️" : ""}
              </p>
              <p className="text-xs text-slate-400">
                {d?.name} · {rideKm(state.pos, to).toFixed(1)} km
              </p>
              {canDrive ? (
                <button
                  type="button"
                  disabled={state.stats.money < fuelCost(state.pos, to)}
                  className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
                  onClick={() => {
                    driveTo(p.id);
                    onDone();
                  }}
                >
                  🚗 Drive yourself · fuel {naira(fuelCost(state.pos, to))}
                </button>
              ) : null}
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {RIDE_MODES.map((mode) => {
                  const cost = fare(mode, state.pos, to, surge);
                  const banned = rideBan(mode, state.district, p.district);
                  return (
                    <button
                      key={mode}
                      type="button"
                      title={banned ?? RIDE_INFO[mode].blurb}
                      aria-label={banned ? `${RIDE_INFO[mode].label}: ${banned}` : `${RIDE_INFO[mode].label} to ${p.name} for ${naira(cost)}`}
                      disabled={state.stats.money < cost || Boolean(banned)}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[11px] leading-tight font-semibold transition disabled:opacity-40 ${mode === "taxi" ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white/10 hover:bg-white/15"}`}
                      onClick={() => {
                        travel(p.id, mode);
                        onDone();
                      }}
                    >
                      <span className="text-lg" aria-hidden>
                        {RIDE_INFO[mode].icon}
                      </span>
                      {RIDE_INFO[mode].label}
                      <span className="font-normal text-slate-300">{banned ? "Banned here" : naira(cost)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Life({ state }: { state: GameState }) {
  const certs = [state.certs.waec && "WAEC", state.certs.degree && "Degree", state.certs.nysc && "NYSC"].filter(Boolean).join(", ") || "None";
  const l = lifeOf(state);
  const unwashed = daysUnwashed(state);
  return (
    <div>
      <Row label="Age" value={`${Math.floor(state.age)} (ends at ${END_AGE})`} />
      <Row label="Food" value={`${hungerWord(l.food)} (${l.food})`} tone={l.food < 25 ? "text-red-400" : ""} />
      <Row label="Water" value={`${thirstWord(l.water)} (${l.water})`} tone={l.water < 25 ? "text-red-400" : ""} />
      <Row label="Clothes" value={isDirty(state) ? `Dirty (${unwashed} days unwashed)` : unwashed ? "Clean, worn once" : "Fresh"} tone={isDirty(state) ? "text-red-400" : ""} />
      {injured(state) ? <Row label="Injury" value={INJURY[injured(state)!].name} tone="text-red-400" /> : null}
      {l.offenses ? <Row label="Times caught misbehaving" value={String(l.offenses)} tone="text-red-400" /> : null}
      <Row label="Background" value={state.background === "lapo" ? "Lapo Baby" : "Average family"} />
      <Row label="Certificates" value={certs} />
      <Row label="Network" value={String(state.stats.network)} />
      <Row label="Reputation" value={String(state.stats.reputation)} />
      <Row label="Resilience" value={String(state.stats.resilience)} />
      <Row label="Heat (police attention)" value={String(state.stats.heat)} tone={state.stats.heat >= 40 ? "text-red-400" : ""} />
      <p className="mt-5 font-semibold">Skills</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {Object.entries(state.skills).map(([key, value]) => (
          <div key={key} className="rounded-xl bg-white/5 p-2">
            <div className="flex justify-between text-xs capitalize">
              <span>{key}</span>
              <span>{value}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-teal-400" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 font-semibold">Moments that shaped you</p>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
        {state.log.slice(-12).map((item) => (
          <li key={item.text}>
            <span className="text-slate-500">Age {item.age}:</span> {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Settings() {
  const [confirm, setConfirm] = useState<"retire" | "delete" | null>(null);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-slate-300">Your game saves automatically on this device.</p>
      {confirm === "retire" ? (
        <button type="button" className={btnPrimary} onClick={retire}>
          Yes, see how my life ends
        </button>
      ) : (
        <button type="button" className={btnGhost} onClick={() => setConfirm("retire")}>
          Skip to the end of my life
        </button>
      )}
      {confirm === "delete" ? (
        <button
          type="button"
          className={`${btnGhost} ring-1 ring-red-400`}
          onClick={() => {
            deleteSave();
            replace(null);
          }}
        >
          Yes, delete this life
        </button>
      ) : (
        <button type="button" className={btnGhost} onClick={() => setConfirm("delete")}>
          Delete save and start over
        </button>
      )}
    </div>
  );
}
