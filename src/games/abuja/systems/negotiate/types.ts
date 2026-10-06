// Shapes for the negotiation engine. One engine runs every kind of deal:
// buying and selling businesses, cars, rent, salaries, suppliers, loans,
// settlements and trades. Each deal is a list of terms on two sides.

/** How a person bargains. Every counterparty has two or three of these. */
export type Trait = "greedy" | "desperate" | "proud" | "practical" | "friendly" | "stubborn" | "risky" | "cautious";

/** What you can say during persuasion (and, a few of them, while bargaining). */
export type Approach = "friendly" | "confident" | "aggressive" | "logical" | "mutual" | "urgency" | "concession" | "probe";

export type Bluff = "rival" | "final" | "walk";

export type Quality = "excellent" | "good" | "fair" | "poor" | "terrible";

export type TermKind = "money" | "asset" | "service" | "obligation" | "future" | "contract" | "item" | "favor";

/**
 * One thing that changes hands. `side` is who gives it.
 * Fixed terms are worth `value`; adjustable ones are worth `amount × mult`
 * (or a percentage of another term when `pctOf` is set).
 */
export type Term = {
  id: string;
  side: "player" | "npc";
  kind: TermKind;
  label: string;
  detail?: string;
  included: boolean;
  /** Part of every version of this deal: can't be removed. */
  locked?: boolean;
  /** Bookkeeping only (a base for percentages, a fair reference): never shown. */
  hidden?: boolean;
  /** Adjustable terms: the current amount and its range. */
  amount?: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: "naira" | "naira/week" | "percent" | "weeks";
  /** Naira per unit of amount (e.g. 12 weeks of rent). */
  mult?: number;
  /** For percentages: the term the percent applies to. */
  pctOf?: string;
  /** Market value in naira of a fixed term. */
  value: number;
  /** How much the counterparty cares, relative to market value. Hidden. */
  npcWeight: number;
  /** How much it's really worth to you, relative to market value. */
  playerWeight?: number;
};

export type Line = { who: "you" | "them" | "note"; text: string; tone?: "good" | "bad" | "neutral" };

/** A deal in progress. Lives in the save so a reload picks up mid-conversation. */
export type Negotiation = {
  deal: string;
  npc: string;
  title: string;
  stage: "persuade" | "bargain" | "done";
  terms: Term[];
  /** The main adjustable money term: counteroffers move this one. */
  price: string;
  /** Fair market value of what's being traded, for deal quality. */
  market: number;
  /** What you think the market value is: close, but not exact. */
  estimate: number;
  // Hidden from the player.
  reservation: number;
  aspiration: number;
  urgency: number;
  skill: number;
  wealth: number;
  traits: Trait[];
  npcAlt: boolean;
  playerAlt: boolean;
  patience: number;
  maxPatience: number;
  resistance: number;
  anger: number;
  // Persuasion.
  progress: number;
  required: number;
  attempts: number;
  used: Partial<Record<Approach, number>>;
  revealed: string[];
  // Bargaining.
  rounds: number;
  counter: Record<string, { included: boolean; amount?: number }> | null;
  finalClaim: number | null;
  claimedRival: boolean;
  walkedOnce: boolean;
  log: Line[];
  outcome: { quality: Quality; agreed: boolean; summary: string } | null;
};

export type NpcMemory = {
  rel: number;
  deals: number;
  insults: number;
  bluffsCaught: number;
  exploited: number;
  known: Trait[];
  refuseUntil: number;
  last?: Quality;
};

export type NegRep = { fair: number; ruthless: number; generous: number; difficult: number; untrustworthy: number; business: number };

export type Opportunity = { deal: string; npc: string; bonus: number; until: number; text: string };

export type NegLife = {
  /** Your negotiation skill, grown by negotiating. */
  skill: number;
  rep: NegRep;
  npcs: Record<string, NpcMemory>;
  opportunities: Opportunity[];
  /** A manager you've hired to run your businesses. */
  staff: { name: string; salary: number; since: number } | null;
  /** A supplier agreement: cheaper stock for your businesses until a day. */
  supplier: { discount: number; until: number } | null;
  /** Weekly rent you negotiated with your landlord, if any. */
  rent: number | null;
  /** Rent paid in advance up to this day. */
  rentPrepaidUntil?: number;
  history: { day: number; deal: string; npc: string; quality: Quality | "walked" | "failed" }[];
  active: Negotiation | null;
};
