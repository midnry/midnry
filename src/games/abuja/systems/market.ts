import marketsJson from "../data/markets.json";
import { addSkill, addStat, naira } from "./rules";
import type { GameState, MarketState, Position } from "./types";

// The trading app. Prices of fictional assets move by a random walk with
// volatility and a hidden, shifting trend, and jump on in-game events.
// Each time slot is one tick; each day closes one candle.

export type AssetDef = { id: string; kind: "forex" | "crypto" | "stock"; name: string; price: number; volatility: number; trend: number };
export const ASSETS = (marketsJson as unknown as { assets: AssetDef[] }).assets;
export const asset = (id: string) => ASSETS.find((item) => item.id === id);
export const LEVERAGE = [1, 2, 5, 10] as const;
const HISTORY = 60;

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function step(a: AssetDef, price: number, drift: number, scale = 1): number {
  const ret = drift + a.volatility * scale * gauss();
  return Math.max(a.price * 0.0001, price * Math.exp(ret));
}

/** Create the market with 40 days of made-up history so the charts aren't empty. */
export function initMarket(): MarketState {
  const market: MarketState = { prices: {}, candles: {}, today: {}, regime: {}, balance: 0, positions: [], history: [], pendingShock: null };
  for (const a of ASSETS) {
    let price = a.price;
    const candles = [];
    for (let d = 0; d < 40; d += 1) {
      const o = price;
      let h = o;
      let l = o;
      for (let t = 0; t < 4; t += 1) {
        price = step(a, price, a.trend / 4, 0.5);
        h = Math.max(h, price);
        l = Math.min(l, price);
      }
      candles.push({ o, h, l, c: price });
    }
    market.candles[a.id] = candles;
    market.prices[a.id] = price;
    market.today[a.id] = { o: price, h: price, l: price, c: price };
    market.regime[a.id] = a.trend;
  }
  return market;
}

export function ensureMarket(s: GameState): MarketState {
  if (!s.market) s.market = initMarket();
  return s.market;
}

function setPrice(m: MarketState, id: string, price: number) {
  m.prices[id] = price;
  const t = m.today[id] ?? { o: price, h: price, l: price, c: price };
  m.today[id] = { o: t.o, h: Math.max(t.h, price), l: Math.min(t.l, price), c: price };
}

/** Advance prices by `n` time slots. Returns toasts for liquidations. */
export function tick(s: GameState, n: number): string[] {
  const m = s.market;
  if (!m || n <= 0) return [];
  for (let i = 0; i < n; i += 1) {
    for (const a of ASSETS) {
      let price = step(a, m.prices[a.id]!, (m.regime[a.id] ?? a.trend) / 4, 0.5);
      if (m.pendingShock?.asset === a.id) {
        price *= 1 + m.pendingShock.pct / 100;
        m.pendingShock = null;
      }
      setPrice(m, a.id, price);
    }
  }
  return liquidate(s);
}

/** End of day: close the candle and sometimes shift the hidden trend. */
export function closeDay(s: GameState): string[] {
  const m = s.market;
  if (!m) return [];
  for (const a of ASSETS) {
    const today = m.today[a.id]!;
    m.candles[a.id] = [...(m.candles[a.id] ?? []), today].slice(-HISTORY);
    const price = m.prices[a.id]!;
    m.today[a.id] = { o: price, h: price, l: price, c: price };
    if (Math.random() < 0.12) m.regime[a.id] = a.trend + (Math.random() - 0.5) * a.volatility * 0.8;
  }
  return liquidate(s);
}

/** Apply an in-game event to prices immediately. */
export function shock(s: GameState, moves: { asset: string; pct: number }[]) {
  const m = s.market;
  if (!m) return;
  for (const move of moves) {
    const price = m.prices[move.asset];
    if (price == null) continue;
    setPrice(m, move.asset, price * (1 + move.pct / 100));
  }
  liquidate(s).forEach((line) => (s.toast = `${s.toast ? `${s.toast} ` : ""}${line}`));
}

export function pnl(m: MarketState, p: Position): number {
  const price = m.prices[p.asset] ?? p.entry;
  const move = price / p.entry - 1;
  return Math.round(p.notional * move * (p.side === "long" ? 1 : -1));
}

export function equity(m: MarketState): number {
  return m.balance + m.positions.reduce((sum, p) => sum + p.margin + pnl(m, p), 0);
}

function liquidate(s: GameState): string[] {
  const m = s.market;
  if (!m) return [];
  const out: string[] = [];
  for (const p of [...m.positions]) {
    const value = p.margin + pnl(m, p);
    if (value <= p.margin * 0.1) {
      m.positions = m.positions.filter((item) => item.id !== p.id);
      m.balance += Math.max(0, value);
      m.history.unshift({ asset: p.asset, side: p.side, pnl: Math.max(0, value) - p.margin, day: s.day, leverage: p.leverage });
      addStat(s, "stress", 12);
      if (!s.flags.liquidated) s.flags.liquidated = true;
      out.push(`LIQUIDATED: your ${p.leverage}× ${p.side} on ${asset(p.asset)?.name} was wiped out (−${naira(p.margin)}).`);
    }
  }
  return out;
}

export function deposit(s: GameState, amount: number): string {
  const m = ensureMarket(s);
  const value = Math.floor(amount);
  if (value <= 0) return "Enter an amount.";
  if (s.stats.money < value) return `You only have ${naira(s.stats.money)} in your wallet.`;
  addStat(s, "money", -value);
  m.balance += value;
  return `Deposited ${naira(value)} into your trading account.`;
}

export function withdraw(s: GameState, amount: number): string {
  const m = ensureMarket(s);
  const value = Math.min(Math.floor(amount), Math.floor(m.balance));
  if (value <= 0) return "Nothing to withdraw. Close positions first.";
  m.balance -= value;
  addStat(s, "money", value);
  return `Withdrew ${naira(value)} to your wallet.`;
}

export function openPosition(s: GameState, assetId: string, side: "long" | "short", margin: number, leverage: number): string {
  const m = ensureMarket(s);
  const a = asset(assetId);
  const value = Math.floor(margin);
  if (!a) return "";
  if (value < 1000) return "The minimum trade is ₦1,000.";
  if (value > m.balance) return `Your trading balance is ${naira(m.balance)}. Deposit more first.`;
  if (m.positions.length >= 8) return "You have 8 open positions. Close one first.";
  m.balance -= value;
  m.positions.push({
    id: `${s.day}-${Date.now().toString(36)}-${m.positions.length}`,
    asset: assetId,
    side,
    margin: value,
    leverage,
    notional: value * leverage,
    entry: m.prices[assetId]!,
    day: s.day,
  });
  return `${side === "long" ? "Bought" : "Sold short"} ${a.name}: ${naira(value)} at ${leverage}×.`;
}

export function closePosition(s: GameState, id: string): string {
  const m = s.market;
  const p = m?.positions.find((item) => item.id === id);
  if (!m || !p) return "";
  const result = pnl(m, p);
  m.positions = m.positions.filter((item) => item.id !== id);
  m.balance += p.margin + result;
  m.history.unshift({ asset: p.asset, side: p.side, pnl: result, day: s.day, leverage: p.leverage });
  m.history = m.history.slice(0, 50);
  addSkill(s, "trading", 1);
  if (result > 0) addStat(s, "stress", -3);
  else addStat(s, "stress", 4);
  return `Closed ${asset(p.asset)?.name}: ${result >= 0 ? "+" : ""}${naira(result)}.`;
}

/** What the MC "reads" in a chart: right more often with more trading skill. */
export function insight(s: GameState, assetId: string): { text: string; confidence: number } | null {
  const m = s.market;
  const skill = s.skills.trading;
  if (!m || skill < 15) return null;
  const drift = m.regime[assetId] ?? 0;
  // Same read all day for an asset, so it does not flicker between renders.
  let hash = s.day * 31;
  for (const char of assetId) hash = (hash * 33 + char.charCodeAt(0)) % 100003;
  const correct = (hash % 1000) / 1000 < 0.5 + skill / 220;
  const up = (drift >= 0) === correct;
  return {
    text: up ? "Your read: buyers are in control. Leaning up." : "Your read: sellers are in control. Leaning down.",
    confidence: Math.round(50 + skill / 2.2),
  };
}

export function insiderTip(s: GameState): string {
  const m = ensureMarket(s);
  const pick = ASSETS.filter((a) => a.kind === "stock")[Math.floor(Math.random() * 4)]!;
  m.pendingShock = { asset: pick.id, pct: 10 + Math.round(Math.random() * 8) };
  s.eventCtx = { ...s.eventCtx, asset: pick.name };
  return pick.name;
}
