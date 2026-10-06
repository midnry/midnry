import { life, lifeOf } from "./life";
import type { GameState, InjuryKind } from "./types";

// Road accidents, the hospital and its bills, and the electricity bill.

export type HitBy = "car" | "taxi" | "okada" | "keke" | "bus";

export const INJURY: Record<InjuryKind, { name: string; health: number; bill: number; heal: number; line: string }> = {
  minor: { name: "cuts and bruises", health: 10, bill: 8000, heal: 0, line: "Cuts and bruises. Painful, but you'll live." },
  dislocation: { name: "a dislocated shoulder", health: 22, bill: 45000, heal: 3, line: "Your shoulder pops out of place. The pain is white-hot." },
  fracture: { name: "a fractured leg", health: 38, bill: 180000, heal: 10, line: "You hear a crack. Your leg is broken." },
};

/** Chance a vehicle actually hits you (otherwise it's a near miss), and how bad it is. */
const HIT: Record<HitBy, { hit: number; odds: [InjuryKind | "death", number][] }> = {
  okada: { hit: 0.3, odds: [["minor", 0.72], ["dislocation", 0.17], ["fracture", 0.105], ["death", 0.005]] },
  keke: { hit: 0.3, odds: [["minor", 0.66], ["dislocation", 0.2], ["fracture", 0.13], ["death", 0.01]] },
  car: { hit: 0.35, odds: [["minor", 0.5], ["dislocation", 0.22], ["fracture", 0.26], ["death", 0.02]] },
  taxi: { hit: 0.35, odds: [["minor", 0.5], ["dislocation", 0.22], ["fracture", 0.26], ["death", 0.02]] },
  bus: { hit: 0.4, odds: [["minor", 0.35], ["dislocation", 0.22], ["fracture", 0.38], ["death", 0.05]] },
};

const NAMES: Record<HitBy, string> = { okada: "an okada", keke: "a keke", car: "a car", taxi: "a taxi", bus: "a danfo bus" };

/** What happens when traffic catches you: nothing, an injury, or the worst. */
export function rollHit(by: HitBy): { kind: InjuryKind | "death" | null; who: string } {
  const table = HIT[by] ?? HIT.car;
  if (Math.random() > table.hit) return { kind: null, who: NAMES[by] };
  let roll = Math.random();
  for (const [kind, p] of table.odds) {
    roll -= p;
    if (roll <= 0) return { kind, who: NAMES[by] };
  }
  return { kind: "minor", who: NAMES[by] };
}

/** An injury that still needs a doctor or is still healing. Cuts heal on their own. */
export function injured(s: GameState): InjuryKind | null {
  const inj = lifeOf(s).injury;
  if (!inj) return null;
  if (inj.healsOn != null && s.day >= inj.healsOn) return null;
  return inj.kind;
}

/** Heavy work is off the table with a bad injury. */
export function tooHurtFor(s: GameState, energyCost: number): string | null {
  const kind = injured(s);
  if (!kind || kind === "minor") return null;
  if (energyCost > -20) return null;
  return `With ${INJURY[kind].name} you can't do heavy work. ${lifeOf(s).injury?.healsOn != null ? "Let it heal." : "See a doctor at Garki General Hospital."}`;
}

export function hurt(s: GameState, kind: InjuryKind): string {
  const l = life(s);
  const info = INJURY[kind];
  s.stats.health = Math.max(1, s.stats.health - info.health);
  // A worse injury replaces a lighter one.
  const rank: InjuryKind[] = ["minor", "dislocation", "fracture"];
  if (!l.injury || rank.indexOf(kind) >= rank.indexOf(l.injury.kind) || (l.injury.healsOn != null && s.day >= l.injury.healsOn)) {
    l.injury = { kind, day: s.day, healsOn: kind === "minor" ? s.day + 2 : undefined };
  }
  return info.line;
}

/** Each night: injuries that haven't been seen by a doctor get worse; healed ones clear. */
export function nightlyHealth(s: GameState): string[] {
  const l = life(s);
  const inj = l.injury;
  if (!inj) return [];
  if (inj.healsOn != null) {
    if (s.day >= inj.healsOn) {
      l.injury = null;
      return inj.kind === "minor" ? [] : [`Your ${INJURY[inj.kind].name.replace(/^an? /, "")} has healed. You can work properly again.`];
    }
    return [];
  }
  const loss = inj.kind === "fracture" ? 6 : 3;
  s.stats.health = Math.max(1, s.stats.health - loss);
  s.stats.stress = Math.min(100, s.stats.stress + 4);
  return [`Untreated ${INJURY[inj.kind].name} is getting worse (health -${loss}). Go to Garki General Hospital.`];
}

/** See a doctor about an injury. Pay what you can; the rest goes on your hospital bill. */
export function treat(s: GameState): string {
  const l = life(s);
  const inj = l.injury;
  if (!inj || (inj.healsOn != null && s.day >= inj.healsOn)) return "The doctor checks you over. \"You're fine. Go home.\"";
  if (inj.healsOn != null && inj.kind !== "minor") return "Your treatment is done. It just needs time to heal.";
  const info = INJURY[inj.kind];
  const paid = Math.min(info.bill, Math.max(0, s.stats.money));
  s.stats.money -= paid;
  const owed = info.bill - paid;
  l.hospitalBill += owed;
  s.stats.health = Math.min(100, s.stats.health + Math.round(info.health * 0.6));
  l.injury = { ...inj, healsOn: s.day + Math.max(1, info.heal) };
  const care =
    inj.kind === "fracture"
      ? `They set the bone and put your leg in a POP cast. It will take ${info.heal} days to heal.`
      : inj.kind === "dislocation"
        ? `A nurse holds you down and the doctor pops your shoulder back. Rest it for ${info.heal} days.`
        : "They clean the wounds and give you a tetanus injection.";
  const money = owed ? `You paid ₦${paid.toLocaleString("en")}. ₦${owed.toLocaleString("en")} is on your hospital bill.` : `Bill: ₦${info.bill.toLocaleString("en")}, paid.`;
  return `${care} ${money}`;
}

export function payHospital(s: GameState): string {
  const l = life(s);
  if (!l.hospitalBill) return "You don't owe the hospital anything.";
  const amount = Math.min(l.hospitalBill, Math.max(0, s.stats.money));
  if (!amount) return "You have no money to pay with.";
  s.stats.money -= amount;
  l.hospitalBill -= amount;
  return l.hospitalBill ? `Paid ₦${amount.toLocaleString("en")} to the hospital. Still owing ₦${l.hospitalBill.toLocaleString("en")}.` : "Hospital bill fully paid. The accountant almost smiles.";
}

// ── Electricity ──────────────────────────────────────────────────────────────

/** This week's electricity: more for a flat with appliances, and it varies. */
export function powerBill(s: GameState): number {
  const base = s.background === "lapo" ? 3000 : 7000;
  return Math.round((base + Math.random() * base * 0.6) / 100) * 100;
}

/** Weekly: the bill is paid if you can; if last week's is still unpaid, the light goes. */
export function weeklyPower(s: GameState): string[] {
  const l = life(s);
  const bill = powerBill(s);
  const out: string[] = [];
  if (l.power.owed > 0 && !l.power.cut) {
    l.power.cut = true;
    out.push("AEDC has disconnected your light for an unpaid bill. Pay in the Bills app to reconnect.");
  }
  if (s.stats.money >= bill + l.power.owed && !l.power.cut) {
    s.stats.money -= bill;
    out.push(`Electricity: ₦${bill.toLocaleString("en")}.`);
  } else {
    l.power.owed += bill;
    if (!l.power.cut) out.push(`You couldn't pay this week's electricity (₦${bill.toLocaleString("en")}). Pay it before next week or they'll cut you off.`);
  }
  return out;
}

export function payPower(s: GameState): string {
  const l = life(s);
  if (!l.power.owed) return "Your electricity is fully paid.";
  const fee = l.power.cut ? 2000 : 0;
  const total = l.power.owed + fee;
  if (s.stats.money < total) return `You need ₦${total.toLocaleString("en")} to clear it${fee ? ", reconnection fee included" : ""}.`;
  s.stats.money -= total;
  l.power.owed = 0;
  const was = l.power.cut;
  l.power.cut = false;
  return was ? `Paid ₦${total.toLocaleString("en")} with the reconnection fee. Up NEPA! The light is back.` : `Paid ₦${total.toLocaleString("en")}. You're up to date.`;
}
