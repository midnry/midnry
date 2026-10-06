import { useState } from "react";
import { trade } from "../systems/engine";
import { ASSETS, LEVERAGE, asset, equity, insight, pnl } from "../systems/market";
import { naira } from "../systems/rules";
import type { Candle, GameState, MarketState } from "../systems/types";
import { btnGhost, btnPrimary } from "./theme";

const KINDS = [
  { id: "forex", label: "Forex" },
  { id: "crypto", label: "Crypto" },
  { id: "stock", label: "NGX stocks" },
] as const;

function price(value: number): string {
  if (value >= 1000) return value.toLocaleString("en", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("en", { maximumFractionDigits: 4 });
  return value.toPrecision(4);
}

function change(m: MarketState, id: string): number {
  const candles = m.candles[id] ?? [];
  const prev = candles[candles.length - 1]?.c ?? m.prices[id]!;
  return (m.prices[id]! / prev - 1) * 100;
}

/** The in-game trading app: fictional assets, real-feeling risk. */
export function Trade({ state }: { state: GameState }) {
  const m = state.market;
  const [selected, setSelected] = useState("USDNGN");
  const [tab, setTab] = useState<"market" | "positions" | "account">("market");
  if (!m) return <p className="text-sm text-emerald-100/65">The trading app opens in adulthood.</p>;
  const eq = equity(m);
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 p-4">
        <p className="text-sm opacity-80">Trading account</p>
        <p className="text-2xl font-bold tabular-nums">{naira(eq)}</p>
        <p className="text-xs opacity-80">
          Cash {naira(m.balance)} · {m.positions.length} open {m.positions.length === 1 ? "position" : "positions"}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" role="tablist">
        {(["market", "positions", "account"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`min-h-9 rounded-lg text-sm capitalize ${tab === item ? "bg-white/15 font-semibold" : "text-emerald-100/65"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "market" ? <Market state={state} m={m} selected={selected} onSelect={setSelected} /> : null}
      {tab === "positions" ? <Positions state={state} m={m} /> : null}
      {tab === "account" ? <Account state={state} m={m} /> : null}
      <p className="mt-5 text-[11px] text-emerald-100/45">Fictional assets. Prices move as you spend time and with the news. Leverage multiplies wins and losses.</p>
    </div>
  );
}

function Market({ state, m, selected, onSelect }: { state: GameState; m: MarketState; selected: string; onSelect: (id: string) => void }) {
  const a = asset(selected)!;
  const read = insight(state, selected);
  return (
    <div className="mt-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {KINDS.map((kind) =>
          ASSETS.filter((item) => item.kind === kind.id).map((item) => {
            const pct = change(m, item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left ${selected === item.id ? "border-indigo-400 bg-indigo-500/15" : "border-white/10 bg-white/5"}`}
              >
                <span className="block text-[10px] text-emerald-100/65 uppercase">{kind.label}</span>
                <span className="block text-sm font-semibold">{item.name}</span>
                <span className={`block text-xs tabular-nums ${pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                </span>
              </button>
            );
          }),
        )}
      </div>
      <Chart candles={[...(m.candles[a.id] ?? []).slice(-39), m.today[a.id]!]} />
      {read ? (
        <p className="mt-2 rounded-lg bg-white/5 p-2 text-xs text-emerald-50/80">
          📈 {read.text} <span className="text-emerald-100/45">(Trading skill {state.skills.trading}: about {read.confidence}% reliable)</span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-emerald-100/45">Reach Trading skill 15 to start reading the charts. Every closed trade teaches you.</p>
      )}
      <OrderForm state={state} m={m} assetId={a.id} />
    </div>
  );
}

function Chart({ candles }: { candles: Candle[] }) {
  const [mode, setMode] = useState<"candles" | "line">("candles");
  const [hover, setHover] = useState<number | null>(null);
  const W = 340;
  const H = 170;
  const pad = 6;
  const hi = Math.max(...candles.map((c) => c.h));
  const lo = Math.min(...candles.map((c) => c.l));
  const span = hi - lo || hi * 0.01 || 1;
  const y = (v: number) => pad + ((hi - v) / span) * (H - pad * 2);
  const slot = W / candles.length;
  const shown = hover != null ? candles[hover] : candles[candles.length - 1];
  return (
    <div className="mt-3 rounded-xl bg-black/30 p-2">
      <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-100/65">
        <span className="tabular-nums">
          {hover != null ? `Day −${candles.length - 1 - hover}` : "Today"} · O {price(shown!.o)} H {price(shown!.h)} L {price(shown!.l)} C {price(shown!.c)}
        </span>
        <span className="flex gap-1">
          {(["candles", "line"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} className={`rounded px-2 py-0.5 ${mode === item ? "bg-white/15 text-white" : ""}`}>
              {item === "candles" ? "Candles" : "Line"}
            </button>
          ))}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 w-full touch-none"
        role="img"
        aria-label="Price chart"
        onPointerMove={(event) => {
          const box = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(Math.max(0, Math.min(candles.length - 1, Math.floor(((event.clientX - box.left) / box.width) * candles.length))));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} stroke="rgba(255,255,255,0.07)" />
        ))}
        {mode === "line" ? (
          <polyline
            fill="none"
            stroke="#818cf8"
            strokeWidth={2}
            strokeLinejoin="round"
            points={candles.map((c, i) => `${i * slot + slot / 2},${y(c.c)}`).join(" ")}
          />
        ) : (
          candles.map((c, i) => {
            const up = c.c >= c.o;
            const color = up ? "#34d399" : "#f87171";
            const x = i * slot + slot / 2;
            const top = y(Math.max(c.o, c.c));
            const bodyH = Math.max(1.5, Math.abs(y(c.o) - y(c.c)));
            return (
              <g key={i} opacity={hover != null && hover !== i ? 0.55 : 1}>
                <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
                <rect x={x - slot * 0.32} y={top} width={slot * 0.64} height={bodyH} rx={1} fill={color} />
              </g>
            );
          })
        )}
        {hover != null ? <line x1={hover * slot + slot / 2} x2={hover * slot + slot / 2} y1={0} y2={H} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" /> : null}
      </svg>
      <div className="flex justify-between text-[10px] tabular-nums text-emerald-100/45">
        <span>Low {price(lo)}</span>
        <span>High {price(hi)}</span>
      </div>
    </div>
  );
}

function OrderForm({ state, m, assetId }: { state: GameState; m: MarketState; assetId: string }) {
  const [amount, setAmount] = useState("10000");
  const [leverage, setLeverage] = useState<number>(1);
  const value = Number(amount.replace(/[,₦\s]/g, "")) || 0;
  const a = asset(assetId)!;
  return (
    <div className="mt-3 rounded-xl border border-white/10 p-3">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">{a.name}</p>
        <p className="text-lg font-bold tabular-nums">{price(m.prices[assetId]!)}</p>
      </div>
      <label className="mt-2 block text-xs text-emerald-100/65">
        Amount from trading cash (you have {naira(m.balance)})
        <input
          inputMode="numeric"
          className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-base text-white outline-none focus:border-indigo-400"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <p className="mt-2 text-xs text-emerald-100/65">Leverage</p>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {LEVERAGE.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={leverage === item}
            onClick={() => setLeverage(item)}
            className={`min-h-9 rounded-lg text-sm ${leverage === item ? (item >= 5 ? "bg-red-500 text-white" : "bg-indigo-500 text-white") : "bg-white/5"}`}
          >
            {item}×
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-emerald-100/65">
        Exposure {naira(value * leverage)}.{" "}
        {leverage > 1 ? `A ${Math.round(90 / leverage)}% move against you wipes this trade out.` : "No leverage: you can't lose more than you put in."}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`${btnPrimary} bg-emerald-500 hover:bg-emerald-400`}
          disabled={value < 1000 || value > m.balance}
          onClick={() => trade({ kind: "open", asset: assetId, side: "long", margin: value, leverage })}
        >
          Buy (long)
        </button>
        <button
          type="button"
          className={`${btnPrimary} bg-red-500 text-white hover:bg-red-400`}
          disabled={value < 1000 || value > m.balance}
          onClick={() => trade({ kind: "open", asset: assetId, side: "short", margin: value, leverage })}
        >
          Sell (short)
        </button>
      </div>
      {m.balance < 1000 ? <p className="mt-2 text-xs text-green-300">Deposit money in the Account tab to start trading.</p> : null}
      {state.flags.bolaji_connect ? <p className="mt-2 text-[11px] text-emerald-100/45">Bolaji sometimes passes on "small gist" about stocks. Nepo privilege.</p> : null}
    </div>
  );
}

function Positions({ state, m }: { state: GameState; m: MarketState }) {
  return (
    <div className="mt-3">
      {m.positions.length === 0 ? <p className="text-sm text-emerald-100/65">No open positions.</p> : null}
      <div className="grid gap-2">
        {m.positions.map((p) => {
          const result = pnl(m, p);
          const pct = (result / p.margin) * 100;
          return (
            <div key={p.id} className="rounded-xl bg-white/5 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {asset(p.asset)?.name}{" "}
                  <span className={`text-xs ${p.side === "long" ? "text-emerald-400" : "text-red-400"}`}>
                    {p.side === "long" ? "LONG" : "SHORT"} {p.leverage}×
                  </span>
                </p>
                <p className={`font-bold tabular-nums ${result >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {result >= 0 ? "+" : ""}
                  {naira(result)}
                </p>
              </div>
              <p className="text-xs text-emerald-100/65">
                In {naira(p.margin)} at {price(p.entry)} · now {price(m.prices[p.asset]!)} · {pct >= 0 ? "+" : ""}
                {pct.toFixed(1)}%
              </p>
              <button type="button" className={`${btnGhost} mt-2 min-h-9 w-full`} onClick={() => trade({ kind: "close", id: p.id })}>
                Close position
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-5 font-semibold">History</p>
      {m.history.length === 0 ? <p className="mt-1 text-sm text-emerald-100/65">No closed trades yet.</p> : null}
      <ul className="mt-2 space-y-1 text-sm">
        {m.history.slice(0, 15).map((h, index) => (
          <li key={`${h.day}-${index}`} className="flex justify-between gap-2">
            <span className="text-emerald-50/80">
              Day {h.day} · {asset(h.asset)?.name} {h.side} {h.leverage}×
            </span>
            <span className={`tabular-nums ${h.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {h.pnl >= 0 ? "+" : ""}
              {naira(h.pnl)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-emerald-100/45">Trading skill: {state.skills.trading}</p>
    </div>
  );
}

function Account({ state, m }: { state: GameState; m: MarketState }) {
  const [amount, setAmount] = useState("20000");
  const value = Number(amount.replace(/[,₦\s]/g, "")) || 0;
  return (
    <div className="mt-3">
      <p className="text-sm text-emerald-50/80">
        Wallet {naira(state.stats.money)} · Trading cash {naira(m.balance)}
      </p>
      <input
        inputMode="numeric"
        className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-base outline-none focus:border-indigo-400"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        aria-label="Amount"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className={btnPrimary} disabled={value <= 0} onClick={() => trade({ kind: "deposit", amount: value })}>
          Deposit
        </button>
        <button type="button" className={btnGhost} disabled={value <= 0 || m.balance <= 0} onClick={() => trade({ kind: "withdraw", amount: value })}>
          Withdraw
        </button>
      </div>
      <p className="mt-4 text-xs text-emerald-100/45">
        Trading money counts toward your net worth. Borrowing from QuickKash to trade with leverage is the fastest way to the Broke ending.
      </p>
    </div>
  );
}
