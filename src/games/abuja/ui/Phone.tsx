import { useState } from "react";
import { LOANS, NPCS, PLACES, district } from "../systems/data";
import { borrow, callContact, orderMeal, jobStatus, quitJob, repay, retire, travel } from "../systems/engine";
import { ASSET_NAMES, END_AGE, FREEDOM_TARGET, USD_RATE, check, debt, naira, netWorth, npcName } from "../systems/rules";
import { RIDE_INFO, RIDE_MODES, fare, rideKm } from "../systems/rides";
import { deleteSave, replace } from "../systems/store";
import type { GameState } from "../systems/types";
import { DELIVERY_FEE, MENU, hungerWord, lifeOf, thirstWord } from "../systems/life";
import { Linkup } from "./Linkup";
import { btnGhost, btnPrimary } from "./theme";
import { Trade } from "./Trade";
import { WardrobePanel } from "./Wardrobe";

export type PhoneApp = "home" | "food" | "wallet" | "loans" | "jobs" | "contacts" | "map" | "stats" | "settings" | "linkup" | "trade" | "wardrobe";

const APPS: { id: PhoneApp; label: string; icon: string; tint: string }[] = [
  { id: "wallet", label: "Wallet", icon: "💳", tint: "bg-blue-600" },
  { id: "food", label: "ChopNow", icon: "🍲", tint: "bg-amber-600" },
  { id: "trade", label: "Trade", icon: "📈", tint: "bg-indigo-600" },
  { id: "linkup", label: "Linkup", icon: "💗", tint: "bg-pink-600" },
  { id: "loans", label: "QuickKash", icon: "💸", tint: "bg-red-600" },
  { id: "jobs", label: "Jobs", icon: "💼", tint: "bg-sky-600" },
  { id: "contacts", label: "Contacts", icon: "👥", tint: "bg-violet-600" },
  { id: "map", label: "Rides", icon: "🛺", tint: "bg-blue-600" },
  { id: "stats", label: "Life", icon: "📊", tint: "bg-teal-600" },
  { id: "wardrobe", label: "Wardrobe", icon: "👕", tint: "bg-orange-500" },
  { id: "settings", label: "Settings", icon: "⚙️", tint: "bg-slate-600" },
];

const SOON = ["Tiklok", "Instaflex", "Zoom ride-hailing", "Elections", "Inheritance"];

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
          {app === "food" ? <FoodApp state={state} /> : null}
          {app === "loans" ? <Loans state={state} /> : null}
          {app === "jobs" ? <Jobs state={state} /> : null}
          {app === "contacts" ? <Contacts state={state} /> : null}
          {app === "map" ? <MapApp state={state} onDone={onClose} /> : null}
          {app === "stats" ? <Life state={state} /> : null}
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
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 p-5">
        <p className="text-sm opacity-80">Naira balance</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{naira(state.stats.money)}</p>
        <p className="mt-3 text-sm opacity-80">USD: ${state.stats.usd.toLocaleString("en")} (≈ {naira(state.stats.usd * USD_RATE)})</p>
      </div>
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
      <p className="mt-6 text-xs text-slate-500">Weekly bills: rent, food, transport and data leave your account every 7 days.</p>
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
      {(["entry", "mid", "top"] as const).map((tier) => (
        <div key={tier} className="mb-5">
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{tier === "entry" ? "Entry" : tier === "mid" ? "Mid-level" : "Top"}</p>
          <div className="mt-2 grid gap-2">
            {list
              .filter((item) => item.def.tier === tier)
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
          </div>
        );
      })}
      <p className="mt-2 text-xs text-slate-500">Friends you don't see or call for three weeks drift away.</p>
    </div>
  );
}

function MapApp({ state, onDone }: { state: GameState; onDone: () => void }) {
  const [query, setQuery] = useState("");
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
      <p className="mt-2 text-xs text-slate-400">Pick where to go, then how: okada, keke or taxi get you there now. The bus is cheapest but takes a time slot.</p>
      <div className="mt-3 grid gap-2">
        {shown.map((p) => {
          const d = district(p.district);
          const locked = d?.gate && !check(state, d.gate.if);
          const to = { x: p.x, y: p.y + 95 };
          return (
            <div key={p.id} className="rounded-xl bg-white/5 p-3">
              <p className="font-semibold">
                {p.name} {locked ? "🔒" : ""}
              </p>
              <p className="text-xs text-slate-400">
                {d?.name} · {rideKm(state.pos, to).toFixed(1)} km
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {RIDE_MODES.map((mode) => {
                  const cost = fare(mode, state.pos, to);
                  return (
                    <button
                      key={mode}
                      type="button"
                      title={RIDE_INFO[mode].blurb}
                      aria-label={`${RIDE_INFO[mode].label} to ${p.name} for ${naira(cost)}`}
                      disabled={state.stats.money < cost}
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
                      <span className="font-normal text-slate-300">{naira(cost)}</span>
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
  return (
    <div>
      <Row label="Age" value={`${Math.floor(state.age)} (ends at ${END_AGE})`} />
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
