import { bizDef, bizValue } from "../business";
import { life } from "../life";
import { addLog, addStat } from "../rules";
import type { Business, GameState } from "../types";
import type { Negotiation, Term } from "./types";

// Every negotiable deal in the game. A deal says who you're dealing with,
// what's on the table (terms on both sides, valued by the market and by the
// other person's own priorities) and what happens when you agree.
// To add a deal: write a setup and an apply. The engine does the rest.

export type DealSetup = {
  terms: Term[];
  /** The adjustable term counteroffers move. */
  price: string;
  /** Fair market value of the exchange, for deal quality. */
  market: number;
  /** 0–1: how soon they need this done. */
  urgency: number;
  /** They have someone else to deal with. */
  npcAlt: boolean;
  /** You genuinely have someone else to deal with (so claiming it isn't a bluff). */
  playerAlt: boolean;
  /** There's a published going rate, so you know the market value exactly. */
  known?: boolean;
  intro: string;
};

export type DealDef = {
  id: string;
  npc: string;
  title: string;
  icon: string;
  /** Where you'd normally have this conversation. */
  where: string;
  blurb: string;
  /** Why it isn't possible right now, or null. */
  available: (s: GameState) => string | null;
  setup: (s: GameState) => DealSetup;
  /** Carry out the agreed terms. Returns a summary line. */
  apply: (s: GameState, n: Negotiation) => string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** The economy that moves every price. */
export function economy(s: GameState) {
  const usd = s.market?.prices.USDNGN ?? 1550;
  const agro = s.market?.prices.AGRO ?? 95;
  return {
    /** Prices creep up over time. */
    inflation: 1 + 0.12 * (s.day / 28),
    /** A weaker naira makes imported things (cars, fabric) dearer. */
    naira: usd / 1550,
    /** How well food businesses are doing. */
    food: agro / 95,
  };
}

const round = (x: number, to = 1000) => Math.round(x / to) * to;
const adult = (s: GameState) => (s.stage !== "adult" || s.chapter ? "Not until you're grown and living in Abuja." : null);
const T = (t: Omit<Term, "included"> & { included?: boolean }): Term => ({ included: false, ...t });
const get = (n: Negotiation, id: string) => n.terms.find((t) => t.id === id);
const on = (n: Negotiation, id: string) => Boolean(get(n, id)?.included);
const amt = (n: Negotiation, id: string) => get(n, id)?.amount ?? 0;
const pay = (s: GameState, x: number) => {
  s.stats.money -= Math.round(x);
};
/** Money in from a sale: a normal bank credit, so large ones can trigger the bank's checks. */
const receive = (s: GameState, x: number) => addStat(s, "money", Math.round(x));
/** A balance paid in weekly instalments, using the loan book. */
const instalments = (s: GameState, label: string, owed: number, weeks: number) => {
  s.loans.push({ id: `${label}-${s.day}-${s.loans.length}`, principal: owed, owed, weekly: Math.ceil(owed / weeks), nextDue: s.day + 7, missed: 0 });
};
const myBiz = (s: GameState): Business[] => s.life?.businesses ?? [];
const owns = (s: GameState, id: string) => myBiz(s).some((b) => b.id === id);
const addBiz = (s: GameState, id: string, level: number, cash: number) => {
  life(s).businesses.push({ id, level, since: s.day, cash, lastVisit: s.day });
};

/** Weekly stock a business buys, for supplier deals. */
function stockSpend(s: GameState): number {
  let total = 0;
  for (const b of myBiz(s)) {
    const def = bizDef(b.id);
    if (!def || (b.id !== "mama_put" && b.id !== "minimart")) continue;
    total += ((def.weekly[0] + def.weekly[1]) / 2) * b.level * 2.5;
  }
  return round(total);
}

const BASE_RENT: Record<string, number> = { lapo: 8000, average: 15000 };
const MARKET_SALARY = 9000;

// ── Deals ────────────────────────────────────────────────────────────────────

export const DEALS: DealDef[] = [
  {
    id: "buy_minimart",
    npc: "emeka",
    title: "Buy Emeka's mini-mart",
    icon: "🏪",
    where: "CAC Registry & Business Centre (Garki)",
    blurb: "A mini-mart in Wuse that has seen better days. The owner needs out.",
    available: (s) => adult(s) ?? (owns(s, "minimart") ? "You already own a mini-mart." : null),
    setup: (s) => {
      const e = economy(s);
      const market = round(520_000 * e.inflation * (0.9 + 0.1 * e.food), 10_000);
      const debts = round(150_000 * e.inflation, 10_000);
      return {
        market,
        price: "price",
        urgency: 0.7,
        npcAlt: false,
        playerAlt: false,
        intro: `On the table: Emeka's mini-mart in Wuse. Similar shops sell for about ₦${round(market, 50_000).toLocaleString("en")}. It owes suppliers ₦${debts.toLocaleString("en")}.`,
        terms: [
          T({ id: "shop", side: "npc", kind: "asset", label: "Emeka's mini-mart", detail: "Level 1, struggling but well located", locked: true, included: true, value: market, npcWeight: 0.95 }),
          T({ id: "price", side: "player", kind: "money", label: "Cash", unit: "naira", amount: round(market * 0.75, 10_000), min: 0, max: round(market * 2, 10_000), step: 10_000, included: true, locked: true, value: 0, npcWeight: 1.1 }),
          T({ id: "debts", side: "player", kind: "obligation", label: "Take over its supplier debts", detail: `₦${debts.toLocaleString("en")} owed to suppliers`, value: debts, npcWeight: 1.4 }),
          T({ id: "staff", side: "player", kind: "service", label: "Keep his two staff on", detail: "He worries about them", value: 40_000, npcWeight: 1.6, playerWeight: 0.5 }),
          T({ id: "split", side: "npc", kind: "contract", label: "Half now, half over 4 weeks", detail: "Instalments help your cash flow", value: 0, amount: 6, min: 6, max: 6, unit: "percent", pctOf: "price", npcWeight: 1.6 }),
          T({ id: "train", side: "npc", kind: "service", label: "He trains you for two weeks", value: 30_000, npcWeight: 0.5 }),
        ],
      };
    },
    apply: (s, n) => {
      const price = amt(n, "price");
      const half = on(n, "split") ? Math.round(price / 2) : price;
      pay(s, half);
      if (on(n, "split")) instalments(s, "emeka", price - half, 4);
      addBiz(s, "minimart", 1, on(n, "debts") ? -get(n, "debts")!.value : 0);
      if (on(n, "train")) s.skills.trade = Math.min(100, s.skills.trade + 4);
      addLog(s, `Bought Emeka's mini-mart for ₦${price.toLocaleString("en")}.`);
      return `You now own the mini-mart. ₦${half.toLocaleString("en")} paid${on(n, "split") ? `, ₦${(price - half).toLocaleString("en")} over four weeks` : ""}${on(n, "debts") ? ", and its debts are yours" : ""}.`;
    },
  },
  {
    id: "buy_canteen",
    npc: "rakiya",
    title: "Buy Hajia Rakiya's canteen",
    icon: "🍛",
    where: "CAC Registry & Business Centre (Garki)",
    blurb: "A busy Mama Put with loyal customers. She's retiring to Kano.",
    available: (s) => adult(s) ?? (owns(s, "mama_put") ? "You already run a canteen." : null),
    setup: (s) => {
      const e = economy(s);
      const market = round(200_000 * e.inflation * e.food, 5000);
      return {
        market,
        price: "price",
        urgency: 0.3,
        npcAlt: true,
        playerAlt: false,
        intro: `On the table: Hajia Rakiya's canteen in Garki, already at level 2. Canteens like it go for about ₦${round(market, 10_000).toLocaleString("en")}. Her nephew is also interested.`,
        terms: [
          T({ id: "canteen", side: "npc", kind: "asset", label: "The canteen (level 2)", locked: true, included: true, value: market, npcWeight: 1.05 }),
          T({ id: "price", side: "player", kind: "money", label: "Cash", unit: "naira", amount: round(market * 0.8, 5000), min: 0, max: round(market * 2, 5000), step: 5000, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "recipes", side: "npc", kind: "item", label: "Her recipes and the 'Mama Rakiya' name", value: 40_000, npcWeight: 0.6 }),
          T({ id: "meals", side: "player", kind: "favor", label: "Free meals for her whenever she visits", value: 15_000, npcWeight: 2.2 }),
          T({ id: "split", side: "npc", kind: "contract", label: "Pay over 4 weeks", value: 0, amount: 6, min: 6, max: 6, unit: "percent", pctOf: "price", npcWeight: 1.8 }),
        ],
      };
    },
    apply: (s, n) => {
      const price = amt(n, "price");
      if (on(n, "split")) instalments(s, "rakiya", price, 4);
      else pay(s, price);
      addBiz(s, "mama_put", 2, 0);
      if (on(n, "recipes")) s.stats.reputation = Math.min(100, s.stats.reputation + 3);
      addLog(s, `Bought Hajia Rakiya's canteen for ₦${price.toLocaleString("en")}.`);
      return `The canteen is yours, at level 2.${on(n, "recipes") ? " Customers love that the recipes stayed." : ""}`;
    },
  },
  {
    id: "buy_logistics",
    npc: "adebayo",
    title: "Buy Chief Adebayo's logistics company",
    icon: "🚚",
    where: "CAC Registry & Business Centre (Garki)",
    blurb: "Three vans, a warehouse lease and contracts with online sellers.",
    available: (s) => adult(s) ?? (owns(s, "logistics") ? "You already own a logistics company." : s.stats.network < 30 ? "Chief Adebayo only sells to people with Network 30+." : null),
    setup: (s) => {
      const e = economy(s);
      const market = round(3_200_000 * e.inflation * (0.8 + 0.2 * e.naira), 50_000);
      const vanLoans = round(600_000 * e.inflation, 10_000);
      return {
        market,
        price: "price",
        urgency: 0.2,
        npcAlt: true,
        playerAlt: false,
        intro: `On the table: Chief Adebayo's logistics company. Similar firms trade at about ₦${round(market, 100_000).toLocaleString("en")}. Two vans still have loans on them.`,
        terms: [
          T({ id: "company", side: "npc", kind: "asset", label: "The logistics company", locked: true, included: true, value: market, npcWeight: 0.97 }),
          T({ id: "price", side: "player", kind: "money", label: "Cash", unit: "naira", amount: round(market * 0.75, 50_000), min: 0, max: round(market * 2, 50_000), step: 50_000, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "share", side: "player", kind: "future", label: "10% of profits for 6 months", detail: "He bets on your success", value: round(market * 0.08, 10_000), npcWeight: 1.5 }),
          T({ id: "vans", side: "player", kind: "obligation", label: "Take over the van loans", detail: `₦${vanLoans.toLocaleString("en")}`, value: vanLoans, npcWeight: 1.1 }),
          T({ id: "clients", side: "npc", kind: "item", label: "His client list", value: round(market * 0.12, 10_000), npcWeight: 0.8 }),
        ],
      };
    },
    apply: (s, n) => {
      const price = amt(n, "price");
      pay(s, price);
      if (on(n, "vans")) instalments(s, "vans", get(n, "vans")!.value, 12);
      addBiz(s, "logistics", on(n, "clients") ? 2 : 1, 0);
      if (on(n, "share")) instalments(s, "adebayo-share", get(n, "share")!.value, 24);
      addLog(s, `Bought a logistics company from Chief Adebayo for ₦${price.toLocaleString("en")}.`);
      return `You own a logistics company${on(n, "clients") ? " with his client list (level 2)" : ""}.${on(n, "share") ? " His profit share is paid weekly." : ""}`;
    },
  },
  {
    id: "sell_business",
    npc: "adebayo",
    title: "Sell one of your businesses",
    icon: "💼",
    where: "CAC Registry & Business Centre (Garki)",
    blurb: "Chief Adebayo buys businesses that make money. Yours might be one.",
    available: (s) => adult(s) ?? (myBiz(s).length ? null : "You don't own a business to sell."),
    setup: (s) => {
      const b = [...myBiz(s)].sort((x, y) => bizValue(y) - bizValue(x))[0]!;
      const def = bizDef(b.id)!;
      const e = economy(s);
      const market = round(Math.max(50_000, bizValue({ ...b, cash: 0 }) * e.inflation * (b.cash < 0 ? 0.9 : 1.05)), 10_000);
      return {
        market,
        price: "price",
        urgency: 0.15,
        npcAlt: true,
        playerAlt: s.stats.network >= 50,
        intro: `Chief Adebayo is interested in your ${def.name} (level ${b.level}). Businesses like it fetch about ₦${round(market, 10_000).toLocaleString("en")}.`,
        terms: [
          T({ id: "biz", side: "player", kind: "asset", label: `Your ${def.name} (level ${b.level})`, detail: b.id, locked: true, included: true, value: market, npcWeight: 1.1 }),
          T({ id: "price", side: "npc", kind: "money", label: "Cash", unit: "naira", amount: round(market * 1.3, 10_000), min: 0, max: round(market * 3, 10_000), step: 10_000, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "consult", side: "player", kind: "service", label: "You consult for 4 weeks after the sale", value: round(market * 0.06, 5000), npcWeight: 1.4, playerWeight: 0.6 }),
          T({ id: "noncompete", side: "player", kind: "contract", label: "No competing business for a year", value: round(market * 0.08, 5000), npcWeight: 1.3, playerWeight: 0.3 }),
        ],
      };
    },
    apply: (s, n) => {
      const id = get(n, "biz")!.detail!;
      const b = myBiz(s).find((x) => x.id === id);
      const price = amt(n, "price");
      const cash = Math.max(0, b?.cash ?? 0);
      life(s).businesses = myBiz(s).filter((x) => x.id !== id);
      receive(s, price + cash);
      if (on(n, "consult")) s.slot = Math.min(3, s.slot + 1);
      addLog(s, `Sold a business to Chief Adebayo for ₦${price.toLocaleString("en")}.`);
      return `Sold for ₦${price.toLocaleString("en")}${cash ? ` (plus ₦${cash.toLocaleString("en")} of its cash)` : ""}.`;
    },
  },
  {
    id: "buy_car",
    npc: "danjuma",
    title: "Buy a Tokunbo Corolla",
    icon: "🚗",
    where: "Berger Tokunbo Car Mart (Lugbe)",
    blurb: "A 2012 Toyota Corolla, 'first body'. Prices follow the dollar.",
    available: (s) => adult(s) ?? (s.life?.car === "owned" ? "You already own a car." : null),
    setup: (s) => {
      const e = economy(s);
      const market = round(3_300_000 * e.inflation * e.naira, 50_000);
      return {
        market,
        price: "price",
        urgency: 0.25,
        npcAlt: true,
        playerAlt: true,
        intro: `The Corolla on the lot. With the naira at ₦${Math.round(s.market?.prices.USDNGN ?? 1550).toLocaleString("en")}/$, cars like it sell for about ₦${round(market, 100_000).toLocaleString("en")}. There are other dealers on this road.`,
        terms: [
          T({ id: "car", side: "npc", kind: "asset", label: "2012 Toyota Corolla", locked: true, included: true, value: market, npcWeight: 0.94 }),
          T({ id: "price", side: "player", kind: "money", label: "Cash", unit: "naira", amount: round(market * 0.8, 50_000), min: 0, max: round(market * 2, 50_000), step: 50_000, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "service", side: "npc", kind: "service", label: "A year of free servicing", value: 250_000, npcWeight: 0.5 }),
          T({ id: "tyres", side: "npc", kind: "item", label: "Four new tyres", value: 140_000, npcWeight: 0.6 }),
          T({ id: "split", side: "npc", kind: "contract", label: "Pay over 8 weeks", value: 0, amount: 8, min: 8, max: 8, unit: "percent", pctOf: "price", npcWeight: 1.4 }),
          T({ id: "review", side: "player", kind: "favor", label: "Post a glowing review online", value: 20_000, npcWeight: 3, playerWeight: 0.1 }),
        ],
      };
    },
    apply: (s, n) => {
      const price = amt(n, "price");
      const l = life(s);
      if (on(n, "split")) instalments(s, "car", price, 8);
      else pay(s, price);
      l.car = "owned";
      if (!s.assets.includes("car")) s.assets.push("car");
      if (on(n, "service")) s.flags.car_service = s.day + 28;
      addLog(s, `Bought a Toyota Corolla for ₦${price.toLocaleString("en")}.`);
      return `The Corolla is yours. Tap 🚗 Drive on the map.${on(n, "tyres") ? " New tyres too." : ""}`;
    },
  },
  {
    id: "rent",
    npc: "bello",
    title: "Negotiate your rent",
    icon: "🏠",
    where: "Your home",
    blurb: "Mrs. Bello reviews rents with inflation. Get ahead of it.",
    available: (s) => adult(s) ?? (s.flags.rent_talk_day === s.day ? "You already spoke to her today." : null),
    setup: (s) => {
      const e = economy(s);
      const current = s.life?.neg?.rent ?? BASE_RENT[s.background] ?? 10_000;
      const marketRent = round((BASE_RENT[s.background] ?? 10_000) * e.inflation, 500);
      s.flags.rent_talk_day = s.day;
      return {
        market: marketRent * 12,
        price: "rent",
        known: true,
        urgency: 0.35,
        npcAlt: true,
        playerAlt: false,
        intro: `You pay ₦${current.toLocaleString("en")} a week. Similar places nearby now go for about ₦${marketRent.toLocaleString("en")}. This sets your rent for the next 12 weeks.`,
        terms: [
          T({ id: "home", side: "npc", kind: "asset", label: "Your home for the next 12 weeks", locked: true, included: true, value: marketRent * 12, npcWeight: 1 }),
          T({ id: "rent", side: "player", kind: "money", label: "Weekly rent", unit: "naira/week", amount: current, mult: 12, min: 0, max: marketRent * 3, step: 500, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "upfront", side: "player", kind: "contract", label: "Pay 12 weeks upfront", detail: "She hates chasing rent", value: round(marketRent * 12 * 0.04), npcWeight: 3.5 }),
          T({ id: "roof", side: "player", kind: "service", label: "Fix the leaking roof yourself", value: 30_000, npcWeight: 1.6 }),
          T({ id: "paint", side: "npc", kind: "service", label: "She repaints the flat", value: 50_000, npcWeight: 0.8, playerWeight: 0.6 }),
        ],
      };
    },
    apply: (s, n) => {
      const neg = life(s).neg!;
      const rent = amt(n, "rent");
      neg.rent = rent;
      if (on(n, "upfront")) {
        pay(s, rent * 12);
        neg.rentPrepaidUntil = s.day + 84;
      }
      if (on(n, "roof")) pay(s, get(n, "roof")!.value);
      return `Your rent is now ₦${rent.toLocaleString("en")} a week${on(n, "upfront") ? ", paid 12 weeks ahead" : ""}.`;
    },
  },
  {
    id: "hire_manager",
    npc: "blessing",
    title: "Hire a manager",
    icon: "🧑‍💼",
    where: "Your phone",
    blurb: "A manager keeps your businesses running when you can't check in.",
    available: (s) => adult(s) ?? (!myBiz(s).length ? "You need a business to manage first." : s.life?.neg?.staff ? "Blessing already works for you. You can renegotiate her salary." : null),
    setup: (s) => {
      const e = economy(s);
      const salary = round(MARKET_SALARY * e.inflation, 500);
      const profit = myBiz(s).reduce((sum, b) => sum + ((bizDef(b.id)?.weekly[0] ?? 0) + (bizDef(b.id)?.weekly[1] ?? 0)) / 2 * b.level, 0);
      return {
        market: salary * 12,
        price: "salary",
        known: true,
        urgency: 0.55,
        npcAlt: false,
        playerAlt: false,
        intro: `Blessing wants a stable job managing your businesses. Managers in Abuja earn about ₦${salary.toLocaleString("en")} a week.`,
        terms: [
          T({ id: "work", side: "npc", kind: "service", label: "Manages your businesses (12 weeks)", detail: "No more losses when you're away", locked: true, included: true, value: salary * 12, npcWeight: 1 }),
          T({ id: "salary", side: "player", kind: "money", label: "Weekly salary", unit: "naira/week", amount: round(salary * 0.7, 500), mult: 12, min: 0, max: salary * 4, step: 500, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "share", side: "player", kind: "future", label: "5% of business profits", value: round(profit * 12 * 0.05, 500), npcWeight: 0.6 }),
          T({ id: "contract", side: "player", kind: "contract", label: "Written contract with notice period", value: 15_000, npcWeight: 3, playerWeight: 0.2 }),
          T({ id: "saturdays", side: "npc", kind: "service", label: "She works Saturdays too", value: round(salary * 2, 500), npcWeight: 1.2 }),
        ],
      };
    },
    apply: (s, n) => {
      const neg = life(s).neg!;
      neg.staff = { name: "Blessing Okon", salary: amt(n, "salary") + (on(n, "share") ? Math.round(get(n, "share")!.value / 12) : 0), since: s.day };
      return `Blessing starts on Monday at ₦${amt(n, "salary").toLocaleString("en")} a week${on(n, "share") ? " plus a profit share" : ""}. Your businesses no longer suffer when you're away.`;
    },
  },
  {
    id: "manager_salary",
    npc: "blessing",
    title: "Renegotiate Blessing's salary",
    icon: "🧑‍💼",
    where: "Your phone",
    blurb: "She's been working hard, and prices keep rising. She wants to talk.",
    available: (s) => adult(s) ?? (!s.life?.neg?.staff ? "You haven't hired a manager." : s.day - (s.life.neg.staff.since ?? 0) < 14 ? "She only started recently." : null),
    setup: (s) => {
      const e = economy(s);
      const salary = round(MARKET_SALARY * e.inflation, 500);
      const current = s.life!.neg!.staff!.salary;
      return {
        market: salary * 12,
        price: "salary",
        known: true,
        urgency: 0.4,
        npcAlt: s.stats.reputation < 40,
        playerAlt: false,
        intro: `Blessing earns ₦${current.toLocaleString("en")} a week. The going rate is about ₦${salary.toLocaleString("en")}. If talks go badly, she may quit.`,
        terms: [
          T({ id: "work", side: "npc", kind: "service", label: "Keeps managing your businesses", locked: true, included: true, value: salary * 12, npcWeight: 1 }),
          T({ id: "salary", side: "player", kind: "money", label: "Weekly salary", unit: "naira/week", amount: current, mult: 12, min: 0, max: salary * 4, step: 500, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "bonus", side: "player", kind: "money", label: "One-off bonus", value: round(salary * 2, 500), npcWeight: 1.3 }),
          T({ id: "title", side: "player", kind: "favor", label: "Promote her to General Manager", value: 5000, npcWeight: 4, playerWeight: 0.1 }),
        ],
      };
    },
    apply: (s, n) => {
      const neg = life(s).neg!;
      neg.staff = { ...neg.staff!, salary: amt(n, "salary"), since: s.day };
      if (on(n, "bonus")) pay(s, get(n, "bonus")!.value);
      return `Blessing's new salary: ₦${amt(n, "salary").toLocaleString("en")} a week.${on(n, "title") ? " She loves the new title." : ""}`;
    },
  },
  {
    id: "supplier",
    npc: "sani",
    title: "Supplier agreement",
    icon: "📦",
    where: "Kubwa Village Market",
    blurb: "Cheaper stock for your canteen and mini-mart, if you commit to volume.",
    available: (s) => adult(s) ?? (!owns(s, "mama_put") && !owns(s, "minimart") ? "You need a canteen or mini-mart that buys stock." : null),
    setup: (s) => {
      const weekly = Math.max(20_000, stockSpend(s));
      const stock = weekly * 8;
      return {
        market: round(stock * 0.25),
        price: "discount",
        known: true,
        urgency: 0.3,
        npcAlt: true,
        playerAlt: true,
        intro: `Your businesses buy about ₦${weekly.toLocaleString("en")} of stock a week. Alhaji Sani's usual markup is around 10%. This deal runs 8 weeks.`,
        terms: [
          T({ id: "orders", side: "npc", kind: "item", label: "8 weeks of stock at list price", locked: true, included: true, value: stock, npcWeight: 0.9, playerWeight: 0.92 }),
          T({ id: "payment", side: "player", kind: "money", label: "Payment for the stock", locked: true, included: true, value: stock, npcWeight: 1, playerWeight: 1 }),
          T({ id: "discount", side: "npc", kind: "money", label: "Discount on stock", unit: "percent", amount: 15, min: 0, max: 30, step: 0.5, pctOf: "base", included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "commit", side: "player", kind: "contract", label: "Commit to 8 weeks of orders", value: round(stock * 0.02), npcWeight: 2.5, playerWeight: 0.3 }),
          T({ id: "cod", side: "player", kind: "contract", label: "Pay cash on delivery", value: round(stock * 0.015), npcWeight: 1.6, playerWeight: 0.5 }),
          T({ id: "credit", side: "npc", kind: "contract", label: "30 days' credit", value: round(stock * 0.02), npcWeight: 1.4 }),
          T({ id: "base", side: "player", kind: "money", label: "", hidden: true, locked: true, included: false, value: 0, amount: stock, npcWeight: 0 }),
        ],
      };
    },
    apply: (s, n) => {
      const neg = life(s).neg!;
      const d = amt(n, "discount");
      neg.supplier = { discount: d / 100, until: s.day + 56 };
      return `Alhaji Sani gives you ${d}% off stock for the next 8 weeks. Your canteen and mini-mart profits go up.`;
    },
  },
  {
    id: "loan",
    npc: "felix",
    title: "Negotiate a QuickKash loan",
    icon: "💸",
    where: "QuickKash Microfinance (Wuse)",
    blurb: "Bigger than the app offers, if you can talk the rate down.",
    available: (s) => adult(s) ?? (s.loans.length >= 3 ? "You already have three loans." : null),
    setup: (s) => {
      const amount = s.stats.reputation >= 40 ? 500_000 : 250_000;
      return {
        market: round(amount * 0.25),
        price: "interest",
        known: true,
        urgency: 0.45,
        npcAlt: true,
        playerAlt: false,
        intro: `A ₦${amount.toLocaleString("en")} loan over 8 weeks. QuickKash usually charges about 20% on loans like this.`,
        terms: [
          T({ id: "cash", side: "npc", kind: "money", label: `Loan of ₦${amount.toLocaleString("en")}`, locked: true, included: true, value: amount, npcWeight: 1 }),
          T({ id: "repay", side: "player", kind: "obligation", label: "Repay the loan", locked: true, included: true, value: amount, npcWeight: 0.85 }),
          T({ id: "interest", side: "player", kind: "money", label: "Interest", unit: "percent", amount: 12, min: 0, max: 80, step: 0.5, pctOf: "principal", included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "collateral", side: "player", kind: "asset", label: "Your car as collateral", value: round(amount * 0.3), npcWeight: 1, playerWeight: 0.2 }),
          T({ id: "longer", side: "npc", kind: "contract", label: "16 weeks to repay instead of 8", value: round(amount * 0.05), npcWeight: 1.3 }),
          T({ id: "fair", side: "npc", kind: "money", label: "", hidden: true, locked: true, included: true, value: round(amount * 0.2), npcWeight: 0 }),
          T({ id: "principal", side: "npc", kind: "money", label: "", hidden: true, locked: true, included: false, value: 0, amount, npcWeight: 0 }),
        ],
      };
    },
    apply: (s, n) => {
      const amount = get(n, "cash")!.value;
      const rate = amt(n, "interest") / 100;
      const weeks = on(n, "longer") ? 16 : 8;
      const owed = Math.round(amount * (1 + rate));
      s.loans.push({ id: `nego-${s.day}`, principal: amount, owed, weekly: Math.ceil(owed / weeks), nextDue: s.day + 7, missed: 0 });
      s.stats.money += amount;
      if (on(n, "collateral")) s.flags.car_collateral = true;
      return `₦${amount.toLocaleString("en")} credited at ${amt(n, "interest")}% interest. You owe ₦${owed.toLocaleString("en")} over ${weeks} weeks.`;
    },
  },
  {
    id: "hospital_bill",
    npc: "uche",
    title: "Settle your hospital bill",
    icon: "🏥",
    where: "Garki General Hospital",
    blurb: "Hospitals would rather have some cash now than chase you for months.",
    available: (s) => adult(s) ?? (!(s.life?.hospitalBill ?? 0) ? "You don't owe the hospital anything." : null),
    setup: (s) => {
      const bill = s.life!.hospitalBill;
      return {
        market: bill,
        price: "payment",
        known: true,
        urgency: 0.55,
        npcAlt: false,
        playerAlt: false,
        intro: `You owe Garki General Hospital ₦${bill.toLocaleString("en")}. It's the end of the month and the accountant needs to close her books.`,
        terms: [
          T({ id: "clear", side: "npc", kind: "contract", label: "Your hospital bill cleared in full", locked: true, included: true, value: bill, npcWeight: 1 }),
          T({ id: "payment", side: "player", kind: "money", label: "Payment today", unit: "naira", amount: round(bill * 0.5, 500), min: 0, max: bill, step: 500, included: true, locked: true, value: 0, npcWeight: 1.3 }),
          T({ id: "letter", side: "player", kind: "favor", label: "Write a thank-you letter to the hospital board", value: 3000, npcWeight: 4, playerWeight: 0.1 }),
        ],
      };
    },
    apply: (s, n) => {
      const pay2 = amt(n, "payment");
      pay(s, pay2);
      const was = life(s).hospitalBill;
      life(s).hospitalBill = 0;
      return `Paid ₦${pay2.toLocaleString("en")} and your ₦${was.toLocaleString("en")} bill is cleared.`;
    },
  },
  {
    id: "fabric",
    npc: "bose",
    title: "Buy fabric wholesale to resell",
    icon: "🧵",
    where: "Wuse Market",
    blurb: "Ten bales of Holland wax. Buy well and you'll sell at a profit.",
    available: (s) => adult(s) ?? (s.flags.fabric_day === s.day ? "Iya Bose has no more bales today." : null),
    setup: (s) => {
      const e = economy(s);
      const market = round(250_000 * e.inflation * e.naira, 5000);
      return {
        market,
        price: "price",
        urgency: 0.4,
        npcAlt: true,
        playerAlt: true,
        intro: `Ten bales of Holland wax. Retailers pay about ₦${round(market, 10_000).toLocaleString("en")} for this many, and you can resell for more. Other traders sell bales too.`,
        terms: [
          T({ id: "bales", side: "npc", kind: "item", label: "Ten bales of Holland wax", locked: true, included: true, value: market, npcWeight: 0.95 }),
          T({ id: "price", side: "player", kind: "money", label: "Cash", unit: "naira", amount: round(market * 0.7, 5000), min: 0, max: market * 2, step: 5000, included: true, locked: true, value: 0, npcWeight: 1 }),
          T({ id: "extra", side: "npc", kind: "item", label: "Two extra bales", value: round(market * 0.2, 1000), npcWeight: 0.75 }),
          T({ id: "loyal", side: "player", kind: "future", label: "Promise to buy from her again", value: round(market * 0.05, 1000), npcWeight: 1.6, playerWeight: 0.2 }),
        ],
      };
    },
    apply: (s, n) => {
      const price = amt(n, "price");
      pay(s, price);
      s.flags.fabric_day = s.day;
      const value = get(n, "bales")!.value + (on(n, "extra") ? get(n, "extra")!.value : 0);
      const sold = Math.round(value * (1.1 + Math.random() * 0.25) * (1 + s.skills.trade / 400));
      s.stats.money += sold;
      s.skills.trade = Math.min(100, s.skills.trade + 2);
      return `You resell the fabric through the week for ₦${sold.toLocaleString("en")}: ${sold - price >= 0 ? "a profit" : "a loss"} of ₦${Math.abs(sold - price).toLocaleString("en")}.`;
    },
  },
];

export const deal = (id: string) => DEALS.find((d) => d.id === id);
