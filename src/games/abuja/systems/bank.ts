import { life, lifeOf } from "./life";
import type { GameState } from "./types";

// The bank watches what comes into your account. A credit far above your
// usual range gets the account restricted until you explain it. If the money
// came from fraud, the bank tells the EFCC.

/** Credits smaller than this never raise an eyebrow. */
const FLOOR = 150_000;
/** How many times your usual credit counts as suspicious. */
const FACTOR = 6;
/** Days the bank takes to review a restriction. */
export const REVIEW_DAYS = 2;
export const UNFREEZE_FEE = 5000;

let quiet = 0;

/** Credits the bank expects (loans it can see, your own transfers): no checks. */
export function withoutBankCheck<T>(fn: () => T): T {
  quiet += 1;
  try {
    return fn();
  } finally {
    quiet -= 1;
  }
}

/** Your usual credit: the middle of your recent ones, with a sensible minimum. */
export function usualCredit(s: GameState): number {
  const recent = [...lifeOf(s).credits].sort((a, b) => a - b);
  const mid = recent.length ? recent[Math.floor(recent.length / 2)]! : 0;
  return Math.max(20_000, mid);
}

/**
 * Money arrives. If it's far outside your usual range the account is frozen
 * and the "bank_frozen" pop-up opens. Childhood chapters have no bank account.
 */
export function bankCredit(s: GameState, amount: number): boolean {
  if (quiet || amount < 1000 || s.chapter || s.stage !== "adult") return false;
  const l = life(s);
  const usual = usualCredit(s);
  l.credits = [...l.credits, amount].slice(-12);
  if (amount < FLOOR || amount < usual * FACTOR) return false;
  const dirty = Boolean(s.flags.fraud);
  const held = Math.max(0, s.stats.money);
  s.stats.money -= held;
  l.frozen = { amount: (l.frozen?.amount ?? 0) + held, day: l.frozen?.day ?? s.day, dirty: Boolean(l.frozen?.dirty) || dirty };
  if (dirty) openCase(s, 35);
  s.eventCtx = { ...s.eventCtx, amount: l.frozen.amount };
  s.flags.freeze_credit = amount;
  if (!s.event) s.event = "bank_frozen";
  return true;
}

/** At the bank: sort out the restriction. */
export function resolveFreeze(s: GameState): string {
  const l = life(s);
  const f = l.frozen;
  if (!f) return "Customer care checks your account. \"Everything is fine, sir/ma. No restriction.\"";
  const waited = s.day - f.day;
  if (waited < REVIEW_DAYS) return `"Your case is under review by compliance." Come back in ${REVIEW_DAYS - waited} day${REVIEW_DAYS - waited > 1 ? "s" : ""}.`;
  if (f.dirty) {
    openCase(s, 25);
    return "The compliance officer slides a letter across the desk: the funds are linked to fraud and have been reported to the EFCC. The money stays frozen. Your phone buzzes: an unknown number.";
  }
  if (s.stats.money < UNFREEZE_FEE) return `You need ₦${UNFREEZE_FEE.toLocaleString("en")} for the documentation fee (statements, affidavit).`;
  s.stats.money -= UNFREEZE_FEE;
  s.stats.money += f.amount;
  const line = `After an affidavit, two statements and a lot of waiting, the restriction is lifted. ₦${f.amount.toLocaleString("en")} is back in your account (₦${UNFREEZE_FEE.toLocaleString("en")} fees).`;
  l.frozen = null;
  return line;
}

/** The money you'd have if the bank let go: for net worth. */
export function frozenAmount(s: GameState): number {
  return lifeOf(s).frozen?.amount ?? 0;
}

// ── EFCC ─────────────────────────────────────────────────────────────────────

/** Open or strengthen an EFCC case. */
export function openCase(s: GameState, evidence: number) {
  const l = life(s);
  l.efcc = { day: l.efcc?.day ?? s.day, evidence: Math.min(150, (l.efcc?.evidence ?? 0) + evidence) };
}

export function caseStrength(s: GameState): number {
  return lifeOf(s).efcc?.evidence ?? 0;
}

/**
 * Each night with an open case: evidence piles up while you keep at it, and
 * cools off once you stop. A strong case brings an invitation from the EFCC.
 * Returns the event to show, if any.
 */
export function nightlyCase(s: GameState): string | null {
  const l = life(s);
  if (!l.efcc) {
    // Fraud you keep doing gets noticed sooner or later.
    if (s.flags.fraud && Math.random() < 0.15) openCase(s, 20);
    return null;
  }
  if (s.flags.fraud) l.efcc.evidence = Math.min(150, l.efcc.evidence + 4);
  else l.efcc.evidence = Math.max(0, l.efcc.evidence - 3);
  if (l.efcc.evidence <= 0) {
    l.efcc = null;
    return null;
  }
  if (l.efcc.evidence >= 50 && s.flags.efcc_invited !== s.day && Math.random() < 0.35) {
    s.flags.efcc_invited = s.day;
    return "efcc_invite";
  }
  return null;
}

/** Walk into the EFCC and confess: no prison, but you lose most of what fraud got you. */
export function surrender(s: GameState): string {
  const l = life(s);
  if (!s.flags.fraud && !l.efcc && !l.frozen?.dirty) return "The officer at the desk looks up. \"Oga, you never do anything. Go home.\"";
  const forfeit = Math.round(Math.max(0, s.stats.money) * 0.7) + (l.frozen?.dirty ? l.frozen.amount : 0);
  s.stats.money -= Math.round(Math.max(0, s.stats.money) * 0.7);
  if (l.frozen?.dirty) l.frozen = null;
  l.efcc = null;
  s.flags.fraud = false;
  s.stats.heat = 0;
  s.stats.reputation = Math.max(0, s.stats.reputation - 12);
  s.stats.stress = Math.min(100, s.stats.stress + 10);
  return `You sign a plea bargain. Restitution: ₦${forfeit.toLocaleString("en")} forfeited, your name in the papers, and a promise never to go back. No prison. You can breathe again.`;
}

/** Report a scam you've seen. Good for your name, once a week. */
export function reportScam(s: GameState): string {
  const key = Math.floor(s.day / 7);
  if (s.flags.reported_week === key) return "You already made a report this week. \"We are working on it.\"";
  s.flags.reported_week = key;
  s.stats.reputation = Math.min(100, s.stats.reputation + 3);
  s.stats.network = Math.min(100, s.stats.network + 1);
  return "You report a 'double your money' scheme going round WhatsApp. The officer takes notes and thanks you. Reputation +3.";
}

export function caseStatus(s: GameState): string {
  const l = lifeOf(s);
  if (!l.efcc) return "\"There is no case against you. Keep it that way.\"";
  const e = l.efcc.evidence;
  return e >= 80
    ? "The officer's face goes cold when your name comes up. \"Don't travel. We will call you.\""
    : e >= 50
      ? "\"You are a person of interest.\" Your stomach drops."
      : "\"There is a petition with your name. It's being looked into.\"";
}

/** Your answer to an EFCC invitation. */
export function answerEfcc(s: GameState, how: string): string[] {
  const l = life(s);
  const e = l.efcc?.evidence ?? 0;
  if (how === "honour") {
    if (e >= 90 || (s.flags.fraud && e >= 70)) {
      s.flags.arrested = true;
      s.flags.fraud = true;
      return ["They read you your rights in a small office in Jabi. The evidence is all there: chats, transfers, your laptop."];
    }
    l.efcc = e > 30 ? { day: l.efcc!.day, evidence: e - 30 } : null;
    s.stats.stress = Math.min(100, s.stats.stress + 12);
    const lost = l.frozen?.dirty ? l.frozen.amount : 0;
    if (lost) l.frozen = null;
    return [`Six hours of questions, then bail on self-recognition. "Don't let us see your name again."${lost ? ` The ₦${lost.toLocaleString("en")} frozen in your account is forfeited.` : ""}`];
  }
  if (how === "bribe") {
    if (Math.random() < 0.4) {
      l.efcc = e > 40 ? { day: l.efcc!.day, evidence: e - 40 } : null;
      return ["The 'consultant' makes some calls. Your file goes quiet. For now."];
    }
    openCase(s, 30);
    s.stats.heat = Math.min(100, s.stats.heat + 20);
    return ["The 'consultant' was an EFCC informant. Now they have that too."];
  }
  openCase(s, 10);
  s.stats.heat = Math.min(100, s.stats.heat + 25);
  s.stats.stress = Math.min(100, s.stats.stress + 15);
  return ["You switch off your phone and sleep at a friend's place in Mararaba. Running looks guilty."];
}
