import { HOMES, place } from "./data";
import { arrivalOf } from "./citymap";
import { life, lifeOf } from "./life";
import { addLog, clamp, naira } from "./rules";
import { report } from "./news";
import * as BK from "./banking";
import type { GameState } from "./types";

// Arrest, court and prison. An arrest with a charge goes to court: pick a
// lawyer, maybe try to "settle" the court (never guaranteed), plead, and hear
// the verdict. A sentence is served in the custodial centre day by day, cut
// by good behaviour, or escaped through a hard plan. Life means life, unless
// an appeal, a pardon or an escape says otherwise. Fraud leaves evidence you
// can destroy (losing what it gave you) or wait out by laying low.

export type ChargeId = "theft" | "fraud" | "cyber" | "grand" | "escape";
export type LawyerId = "legal_aid" | "private" | "senior" | "nepo";

export const CHARGES: Record<ChargeId, { name: string; sev: number; days: [number, number] | null; settle: number; restitution: number }> = {
  theft: { name: "Stealing", sev: 1, days: [7, 14], settle: 150_000, restitution: 0 },
  fraud: { name: "Obtaining by false pretence (419)", sev: 2, days: [21, 45], settle: 600_000, restitution: 0.3 },
  cyber: { name: "Cybercrime and money laundering", sev: 3, days: [60, 120], settle: 2_000_000, restitution: 0.5 },
  grand: { name: "Grand fraud and economic sabotage", sev: 4, days: null, settle: 6_000_000, restitution: 0.8 },
  escape: { name: "Escaping lawful custody", sev: 3, days: [45, 60], settle: 3_000_000, restitution: 0 },
};

export const LAWYERS: Record<LawyerId, { name: string; blurb: string; fee: number; skill: number; settle: number }> = {
  legal_aid: { name: "Legal Aid Council lawyer", blurb: "Free, overworked, meets you five minutes before court.", fee: 0, skill: 0.08, settle: 0 },
  private: { name: "Private lawyer", blurb: "Competent, reads the file, files the right motions.", fee: 250_000, skill: 0.22, settle: 0.08 },
  senior: { name: "Senior Advocate (SAN)", blurb: "Silk, a convoy, and friends on the bench.", fee: 1_200_000, skill: 0.38, settle: 0.15 },
  nepo: { name: "Waziri Chambers", blurb: "Aminu's family chambers. Free, because you're a friend of the family.", fee: 0, skill: 0.35, settle: 0.2 },
};

/** Game days a life sentence becomes when an appeal or a plea deal commutes it. */
const COMMUTED = 180;
/** Days a fugitive must stay free before the case goes cold. */
const COLD_AFTER = 45;

export type CourtCase = {
  charge: ChargeId;
  day: number;
  evidence: number;
  lawyer: LawyerId | null;
  /** Tried to settle the court: "ok" struck out, "failed" the judge noticed. */
  settled?: "failed";
  /** Days still owed from an escaped sentence (null: it was life). */
  owed?: number | null;
};

export type Prison = {
  charge: ChargeId;
  since: number;
  /** Days of the sentence; null is life. */
  sentence: number | null;
  served: number;
  behaviour: number;
  suspicion: number;
  plan: { rota: boolean; tool: boolean; disguise: boolean; warder: boolean };
  solitary: number;
  attempts: number;
  /** Earned in the workshop, paid out on release. */
  wages: number;
  lastAppeal?: number;
  pardonTried?: boolean;
  /** Once-a-day things: the nurse, a meal per slot. */
  today: { day: number; nurse: boolean; meals: number };
};

export type Justice = {
  case: CourtCase | null;
  prison: Prison | null;
  fugitive: { since: number; cold: number } | null;
  record: { day: number; charge: ChargeId; outcome: string }[];
  /** Evidence items destroyed or cooled since the last offence. */
  cleared: string[];
  layLow: { since: number; until: number; items: string[] } | null;
};

export function justice(s: GameState): Justice {
  s.justice ??= { case: null, prison: null, fugitive: null, record: [], cleared: [], layLow: null };
  return s.justice;
}

export const jailed = (s: GameState) => Boolean(s.justice?.prison);
export const onTrial = (s: GameState) => Boolean(s.justice?.case);
export const fugitive = (s: GameState) => Boolean(s.justice?.fugitive);
export const layingLow = (s: GameState) => Boolean(s.justice?.layLow && s.justice.layLow.until > s.day);

const roll = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

// ── Arrest and charge ────────────────────────────────────────────────────────

/** What you'd be charged with right now, or null if there's nothing to charge. */
export function chargeFor(s: GameState): ChargeId | null {
  const e = lifeOf(s).efcc?.evidence ?? 0;
  const offences = lifeOf(s).offenses;
  if (s.flags.fraud) {
    if (e >= 130 && offences >= 6) return "grand";
    if (e >= 80 || s.flags.yahoo) return "cyber";
    return "fraud";
  }
  if (s.flags.arrest_theft || Number(s.stats.heat) >= 90) return "theft";
  return null;
}

/** Arrested: open a court case. Returns the line to show. */
export function arrest(s: GameState, charge: ChargeId, owed?: number | null): string {
  const j = justice(s);
  s.flags.arrested = false;
  s.flags.arrest_theft = false;
  j.layLow = null;
  const e = lifeOf(s).efcc?.evidence ?? 0;
  j.case = { charge, day: s.day, evidence: charge === "escape" ? 100 : Math.max(e, charge === "theft" ? 50 : 60), lawyer: null, owed };
  life(s).driving = false;
  report(s, { tag: "Crime", icon: "🚓", you: true, headline: `Abuja resident arraigned for ${CHARGES[charge].name.toLowerCase()}`, body: `${s.name} was arraigned this morning. The prosecution says it has "overwhelming evidence". The defence says the evidence "will not stand".` });
  addLog(s, `Arrested and charged with ${CHARGES[charge].name.toLowerCase()}.`);
  return `🚓 Arrested. You're charged with ${CHARGES[charge].name}. Your case is in court: choose a lawyer.`;
}

export function hireLawyer(s: GameState, id: LawyerId): string {
  const c = justice(s).case;
  if (!c) return "";
  const l = LAWYERS[id];
  const fee = l.fee * CHARGES[c.charge].sev;
  if (id === "nepo" && !s.flags.nepo_lawyer) return "You don't know anyone who'd do this for free.";
  if (s.stats.money < fee) return `You can't afford ${l.name} (${naira(fee)}).`;
  s.stats.money -= fee;
  c.lawyer = id;
  return fee ? `You pay ${naira(fee)} and ${l.name} takes your case.` : `${l.name} takes your case.`;
}

/** Try to "settle" the court. Expensive, and never guaranteed. */
export function settleCourt(s: GameState): { ok: boolean; line: string } {
  const c = justice(s).case;
  if (!c || c.settled) return { ok: false, line: "That door has closed." };
  const price = CHARGES[c.charge].settle;
  if (s.stats.money < price) return { ok: false, line: `Your lawyer says it will take ${naira(price)}. You don't have it.` };
  s.stats.money -= price;
  const lawyer = LAWYERS[c.lawyer ?? "legal_aid"];
  const chance = clamp(0.3 + lawyer.settle + (s.flags.nepo_bench ? 0.15 : 0) - CHARGES[c.charge].sev * 0.04, 0.05, 0.8);
  if (Math.random() < chance) {
    const line = `The case is struck out "for want of diligent prosecution". The file goes missing. You walk out of the courtroom free.`;
    release(s, "Case struck out");
    j(s).record.unshift({ day: s.day, charge: c.charge, outcome: "Struck out" });
    return { ok: true, line };
  }
  c.settled = "failed";
  c.evidence += 15;
  s.stats.heat = Math.min(100, s.stats.heat + 10);
  return { ok: false, line: `${naira(price)} gone. The judge reports the approach and the prosecution adds it to the file. The sentence will be heavier if you're convicted.` };
}

const j = justice;

export type Verdict = { free: boolean; line: string };

/** Plead and hear the verdict. */
export function plead(s: GameState, guilty: boolean): Verdict {
  const jj = justice(s);
  const c = jj.case;
  if (!c) return { free: true, line: "" };
  const ch = CHARGES[c.charge];
  const lawyer = LAWYERS[c.lawyer ?? "legal_aid"];
  const penalty = c.settled === "failed" ? 1.3 : 1;
  const base = (): number | null => {
    if (c.charge === "escape") return c.owed === null ? null : (c.owed ?? 0) + roll(...ch.days!);
    return ch.days ? roll(...ch.days) : null;
  };
  if (!guilty) {
    const chance = clamp(lawyer.skill + 0.5 - c.evidence / 300 - ch.sev * 0.06, 0.03, 0.85);
    if (Math.random() < chance) {
      jj.record.unshift({ day: s.day, charge: c.charge, outcome: "Acquitted" });
      release(s, "Acquitted");
      s.stats.reputation = clamp(s.stats.reputation - 3);
      return { free: true, line: `Not guilty! ${lawyer.name} tears the evidence apart. The judge discharges and acquits you.` };
    }
  }
  let days = base();
  let commuted = false;
  if (days === null && (guilty || ((c.lawyer === "senior" || c.lawyer === "nepo") && Math.random() < 0.25))) {
    days = COMMUTED;
    commuted = true;
  }
  if (days !== null) days = Math.round(days * penalty * (guilty && !commuted ? 0.6 : 1));
  // Restitution: the court takes back what fraud made.
  const take = Math.round(Math.max(0, s.stats.money) * ch.restitution);
  s.stats.money -= take;
  const l = life(s);
  const frozen = l.frozen?.dirty ? l.frozen.amount : 0;
  if (frozen) l.frozen = null;
  const lost = BK.leave(s, "Dismissed after a criminal conviction");
  if (s.job) s.job = null;
  jj.case = null;
  jj.prison = {
    charge: c.charge,
    since: s.day,
    sentence: days,
    served: 0,
    behaviour: 50,
    suspicion: 0,
    plan: { rota: false, tool: false, disguise: false, warder: false },
    solitary: 0,
    attempts: 0,
    wages: 0,
    today: { day: s.day, nurse: false, meals: 0 },
  };
  jj.record.unshift({ day: s.day, charge: c.charge, outcome: days === null ? "Life imprisonment" : `${days} days` });
  l.efcc = null;
  s.flags.fraud = false;
  s.stats.heat = 0;
  s.stats.reputation = clamp(s.stats.reputation - 15);
  s.flags.ex_con = true;
  addLog(s, days === null ? "Sentenced to life imprisonment." : `Sentenced to ${days} days in custody.`);
  report(s, { tag: "Crime", icon: "⚖️", you: true, headline: days === null ? `Life sentence for Abuja ${ch.sev >= 3 ? "fraudster" : "convict"}` : `Abuja resident jailed for ${days} days`, body: `The court found ${s.name} guilty of ${ch.name.toLowerCase()}.${take ? ` ${naira(take)} was ordered forfeited.` : ""}` });
  const sentence = days === null ? "LIFE IMPRISONMENT" : `${days} days${commuted ? " (your life sentence was commuted on a plea deal)" : ""}`;
  return {
    free: false,
    line: [
      guilty ? "You plead guilty. The judge notes your remorse." : "Guilty. The judge doesn't look up from the file.",
      `Sentence: ${sentence}.`,
      take ? `${naira(take)} forfeited as restitution.` : "",
      frozen ? `Your frozen ${naira(frozen)} is forfeited.` : "",
      lost ? "Your bank dismisses you." : "",
      "You're taken to the custodial centre at Kuje.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/** Leave custody (acquitted, struck out, released or appealed): case closed, back home. */
function release(s: GameState, why: string) {
  const jj = justice(s);
  jj.case = null;
  jj.prison = null;
  life(s).efcc = null;
  s.flags.fraud = false;
  s.stats.heat = Math.min(s.stats.heat, 10);
  goHome(s);
  addLog(s, `${why}.`);
}

function goHome(s: GameState) {
  const home = place(HOMES[s.background])!;
  s.pos = { ...arrivalOf(home) };
  s.district = home.district;
}

// ── Prison life ──────────────────────────────────────────────────────────────

export type PrisonAct =
  | "exercise" | "intel" | "eat" | "laundry" | "work" | "tool" | "study" | "lawbooks"
  | "pray" | "nurse" | "lawyer" | "visit" | "connection" | "warder";

export const ACTS: Record<PrisonAct, { label: string; where: string; energy: number; slots: number }> = {
  exercise: { label: "Exercise in the yard", where: "Yard", energy: -12, slots: 1 },
  intel: { label: "Listen to the old-timers", where: "Yard", energy: -4, slots: 1 },
  eat: { label: "Eat in the mess hall", where: "Mess hall", energy: 0, slots: 0 },
  laundry: { label: "Laundry duty", where: "Mess hall", energy: -10, slots: 1 },
  work: { label: "Work a shift in the workshop", where: "Workshop", energy: -18, slots: 1 },
  tool: { label: "Pocket a tool", where: "Workshop", energy: -4, slots: 1 },
  study: { label: "Study", where: "Library", energy: -6, slots: 1 },
  lawbooks: { label: "Read law books for your appeal", where: "Library", energy: -6, slots: 1 },
  pray: { label: "Chapel and mosque", where: "Chapel", energy: 0, slots: 1 },
  nurse: { label: "See the nurse", where: "Infirmary", energy: 0, slots: 1 },
  lawyer: { label: "See your lawyer about an appeal", where: "Visiting room", energy: -4, slots: 1 },
  visit: { label: "Family visit", where: "Visiting room", energy: 0, slots: 1 },
  connection: { label: "Call in a connection", where: "Visiting room", energy: 0, slots: 1 },
  warder: { label: "Bribe a warder", where: "Visiting room", energy: 0, slots: 1 },
};

export const WARDER_PRICE = 400_000;
export const APPEAL_FEE = 500_000;

export function prisonStatus(s: GameState): { left: number | null; release: number | null; remission: boolean } {
  const p = s.justice?.prison;
  if (!p) return { left: null, release: null, remission: false };
  if (p.sentence === null) return { left: null, release: null, remission: false };
  const remission = p.behaviour >= 60;
  const target = remission ? Math.ceil(p.sentence * (2 / 3)) : p.sentence;
  return { left: Math.max(0, target - p.served), release: p.since + target, remission };
}

/** One activity in prison. `took` is false when nothing happened (no time passes). */
export function prisonAct(s: GameState, act: PrisonAct): { line: string; took: boolean } {
  const line = doAct(s, act);
  const took = !blocked.has(line);
  blocked.clear();
  return { line, took };
}

/** Lines that refuse an activity, so it costs no time. */
const blocked = new Set<string>();
const no = (line: string) => {
  blocked.add(line);
  return line;
};

function doAct(s: GameState, act: PrisonAct): string {
  const p = s.justice?.prison;
  if (!p) return no("");
  if (p.today.day !== s.day) p.today = { day: s.day, nurse: false, meals: 0 };
  if (p.solitary > 0 && act !== "eat") return no(`Solitary confinement: ${p.solitary} more day${p.solitary === 1 ? "" : "s"} in a cell with no window. Sleep it off.`);
  const st = s.stats;
  const r = Math.random();
  switch (act) {
    case "exercise":
      st.health = clamp(st.health + 6);
      st.stress = clamp(st.stress - 6);
      p.behaviour = clamp(p.behaviour + 1);
      return "Push-ups, laps of the yard, a game of football with a deflated ball. You feel stronger.";
    case "intel":
      p.suspicion = clamp(p.suspicion + 8);
      if (p.plan.rota) return "Old Baba Musa repeats what you already know: the warders change shift at 2 a.m., and the floodlight by the east wall flickers.";
      if (r < 0.45) {
        p.plan.rota = true;
        return "🗝️ Baba Musa, twelve years in, leans over: \"Shift change is at 2. The east floodlight sweeps slow when the generator is low.\" You have the guard rota.";
      }
      return "The old-timers talk about everything except what you need. One of them watches you too closely.";
    case "eat":
      if (p.today.meals >= 2) return no("The mess is closed. You had your two meals today.");
      p.today.meals += 1;
      life(s).food = clamp(life(s).food + 55);
      life(s).water = clamp(life(s).water + 50);
      return "Beans, a ladle of pap and a sachet of water. It fills the hole.";
    case "laundry":
      p.behaviour = clamp(p.behaviour + 2);
      if (!p.plan.disguise && r < 0.35) {
        p.plan.disguise = true;
        p.suspicion = clamp(p.suspicion + 15);
        return "🧥 A warder's spare uniform comes through the wash with no name tag. You fold it into your mattress.";
      }
      return "Hours of other people's uniforms in a steaming room. The warders note you worked hard.";
    case "work":
      p.behaviour = clamp(p.behaviour + 3);
      p.wages += 1500;
      s.skills.trade = clamp(s.skills.trade + 1);
      return "A shift making school desks in the workshop: ₦1,500 into your prison account, paid out when you leave.";
    case "tool":
      if (p.plan.tool) return no("You already have a hacksaw blade hidden. Don't get greedy.");
      p.suspicion = clamp(p.suspicion + 20);
      if (r < 0.5) {
        p.plan.tool = true;
        return "🪚 A hacksaw blade slides into your sandal. Nobody counts them twice.";
      }
      p.solitary = 3;
      p.behaviour = clamp(p.behaviour - 20);
      return "The workshop warder counts the blades. One is short, and it's in your sandal. Three days in solitary.";
    case "study":
      s.skills.education = clamp(s.skills.education + 2);
      p.behaviour = clamp(p.behaviour + 2);
      return "The prison library: donated textbooks and a dictionary missing the letter Q. You learn something anyway.";
    case "lawbooks":
      s.flags.appeal_prep = Math.min(3, Number(s.flags.appeal_prep ?? 0) + 1);
      return `You read case law until your eyes ache. Appeal preparation ${s.flags.appeal_prep}/3.`;
    case "pray":
      st.stress = clamp(st.stress - 15);
      p.behaviour = clamp(p.behaviour + 3);
      return "The chaplain and the imam share a small hall. You sit, you breathe, you feel a little lighter.";
    case "nurse":
      if (p.today.nurse) return no("The nurse has seen you today. \"Come back tomorrow.\"");
      p.today.nurse = true;
      st.health = clamp(st.health + 20);
      return "The nurse checks you over and hands you two paracetamol and a lecture about water. Health +20.";
    case "lawyer":
      return appeal(s);
    case "visit": {
      st.stress = clamp(st.stress - 20);
      const n = s.npcs.tunde;
      if (n?.met) n.rel = clamp(n.rel + 3);
      return "Family comes with a cooler of jollof and news from outside. Your mother doesn't cry until she thinks you can't see.";
    }
    case "connection":
      return pardon(s);
    case "warder":
      if (p.plan.warder) return no("Warder Ikechukwu already 'knows nothing' about your plans.");
      if (st.money < WARDER_PRICE) return no(`It will take ${naira(WARDER_PRICE)}. You don't have it.`);
      st.money -= WARDER_PRICE;
      if (r < 0.7) {
        p.plan.warder = true;
        return `💸 ${naira(WARDER_PRICE)} changes hands. Warder Ikechukwu will be "on a toilet break" when the time comes.`;
      }
      p.solitary = 5;
      p.behaviour = 0;
      p.suspicion = clamp(p.suspicion + 30);
      return `The warder pockets ${naira(WARDER_PRICE)} and reports you anyway. Five days in solitary.`;
  }
}

/** Appeal: once every 14 days, needs money; reading law books helps. */
function appeal(s: GameState): string {
  const p = s.justice!.prison!;
  if (p.lastAppeal && s.day - p.lastAppeal < 14) return no(`Your lawyer says the Court of Appeal won't hear you again until day ${p.lastAppeal + 14}.`);
  if (s.stats.money < APPEAL_FEE) return no(`An appeal costs ${naira(APPEAL_FEE)} in filing and fees. You don't have it.`);
  s.stats.money -= APPEAL_FEE;
  p.lastAppeal = s.day;
  const prep = Number(s.flags.appeal_prep ?? 0);
  s.flags.appeal_prep = 0;
  const chance = 0.1 + prep * 0.07 + (s.flags.nepo_bench ? 0.1 : 0) + (p.behaviour >= 70 ? 0.05 : 0);
  if (Math.random() < chance) {
    if (p.sentence === null) {
      p.sentence = COMMUTED;
      return "⚖️ The Court of Appeal commutes your life sentence to 180 days. For the first time, there's a date.";
    }
    const cut = Math.round(p.sentence * 0.5);
    p.sentence = Math.max(p.served + 1, p.sentence - cut);
    return `⚖️ Appeal allowed in part: ${cut} days off your sentence.`;
  }
  return `Appeal dismissed. ${naira(APPEAL_FEE)} gone. ${prep < 3 ? "Your lawyer says better preparation might help next time." : "The judges were not moved."}`;
}

/** A pardon through a well-connected friend. Once. */
function pardon(s: GameState): string {
  const p = s.justice!.prison!;
  if (p.pardonTried) return no("You've already called in that favour. Nobody picks up twice.");
  const bolaji = s.npcs.bolaji?.rel ?? 0;
  const friend = Object.entries(s.npcs).find(([id, n]) => (id === "bolaji" || id.startsWith("nepo_")) && n.met && n.rel >= 60);
  if (!friend) return no("You have nobody with that kind of reach. Nepo friends who like you could help one day.");
  p.pardonTried = true;
  const chance = p.sentence === null ? 0.25 : 0.4;
  if (Math.random() < chance + (bolaji >= 80 ? 0.1 : 0)) {
    const left = p.sentence;
    release(s, "Released on a pardon");
    s.flags.pardoned = true;
    return `🕊️ Your name appears on the Independence Day pardon list. Nobody can explain how.${left === null ? " Life imprisonment, gone with one signature." : ""} You're free.`;
  }
  return "Your connection 'tried'. The list came out without your name.";
}

/** Prison night: called instead of the normal night. Returns lines to show. */
export function prisonNight(s: GameState): string[] {
  const p = s.justice?.prison;
  if (!p) return [];
  const lines: string[] = [];
  p.served += 1;
  if (p.solitary > 0) {
    p.solitary -= 1;
    s.stats.stress = clamp(s.stats.stress + 6);
  }
  p.suspicion = clamp(p.suspicion - 5);
  // Cell search: the more you've been up to, the likelier.
  if (p.suspicion > 35 && Math.random() < p.suspicion / 160) {
    const found = (["tool", "disguise"] as const).filter((k) => p.plan[k]);
    if (found.length) {
      for (const k of found) p.plan[k] = false;
      p.solitary = 2;
      p.behaviour = clamp(p.behaviour - 15);
      lines.push(`🔦 Midnight cell search. They find your ${found.map((k) => (k === "tool" ? "hacksaw blade" : "warder's uniform")).join(" and ")}. Two days in solitary.`);
    } else lines.push("🔦 Midnight cell search. They turn your mattress over and find nothing.");
    p.suspicion = clamp(p.suspicion - 20);
  }
  if (Math.random() < 0.06) {
    s.stats.health = clamp(s.stats.health - 10);
    lines.push("A fight breaks out in the cell over a bucket of water. You take an elbow to the face.");
  }
  const { left } = prisonStatus(s);
  if (left !== null && left <= 0) {
    const wages = p.wages;
    s.stats.money += wages;
    const charge = p.charge;
    release(s, "Released from custody");
    justice(s).record.unshift({ day: s.day, charge, outcome: "Served the sentence" });
    lines.push(`🔓 Release day. The gate opens onto the Kuje road. ${wages ? `Your workshop wages, ${naira(wages)}, are paid out. ` : ""}You're free, with a record.`);
  }
  return lines;
}

// ── Escape ───────────────────────────────────────────────────────────────────

/** How much each preparation helps the three stages (0 none → 1 lots). */
export function escapeEdge(s: GameState): { light: number; fence: number; run: number } {
  const plan = s.justice?.prison?.plan;
  return {
    light: (plan?.rota ? 0.5 : 0) + (plan?.warder ? 0.5 : 0),
    fence: plan?.tool ? 1 : 0,
    run: (plan?.disguise ? 0.6 : 0) + (plan?.warder ? 0.2 : 0),
  };
}

export function escapeResult(s: GameState, ok: boolean, stage: string): string {
  const p = s.justice?.prison;
  if (!p) return "";
  p.attempts += 1;
  if (ok) {
    const owed = p.sentence === null ? null : Math.max(0, p.sentence - p.served);
    justice(s).prison = null;
    justice(s).fugitive = { since: s.day, cold: s.day + COLD_AFTER };
    s.flags.escape_owed = owed === null ? -1 : owed;
    s.stats.heat = 80;
    // You hide in a friend's room in Nyanya, not at home.
    const hide = place("tunde_place") ?? place(HOMES[s.background])!;
    s.pos = { ...arrivalOf(hide) };
    s.district = hide.district;
    addLog(s, "Escaped from Kuje custodial centre.");
    report(s, { tag: "Crime", icon: "🚨", you: true, headline: "Inmate escapes Kuje custodial centre", body: `Police have declared ${s.name} wanted after a night escape. Anyone with information should contact the nearest station.` });
    return `🏃 You're over the wall and into the bush, then a bus, then Tunde's room in Nyanya. You're a fugitive: police are looking for you for ${COLD_AFTER} days. Lay low.`;
  }
  p.plan = { rota: p.plan.rota, tool: false, disguise: false, warder: false };
  p.solitary = 7;
  p.behaviour = 0;
  p.suspicion = 60;
  if (p.sentence !== null) p.sentence += 60;
  return `🚨 Caught at the ${stage}. Seven days in solitary${p.sentence !== null ? " and 60 days added to your sentence" : ""}. Your tools and uniform are confiscated.`;
}

/** Give up: accept life in prison (ends the game). */
export function acceptLife(s: GameState): boolean {
  return Boolean(s.justice?.prison && s.justice.prison.sentence === null);
}

/** Every night as a fugitive: maybe they find you. Returns true if recaptured. */
export function fugitiveNight(s: GameState): string | null {
  const f = s.justice?.fugitive;
  if (!f) return null;
  if (s.day >= f.cold) {
    justice(s).fugitive = null;
    s.flags.escape_owed = 0;
    s.stats.heat = 30;
    return "📁 The manhunt has gone cold. The police have new cases and fewer fuel allowances. You can breathe, carefully.";
  }
  s.stats.heat = Math.max(s.stats.heat, 60);
  const chance = layingLow(s) ? 0.03 : 0.09;
  if (Math.random() < chance) {
    justice(s).fugitive = null;
    const owed = Number(s.flags.escape_owed ?? 0);
    return arrest(s, "escape", owed < 0 ? null : owed);
  }
  return null;
}

/** Turn yourself in: back to court with the escape charge, but a lighter view of you. */
export function surrenderFugitive(s: GameState): string {
  if (!justice(s).fugitive) return "";
  justice(s).fugitive = null;
  const owed = Number(s.flags.escape_owed ?? 0);
  const line = arrest(s, "escape", owed < 0 ? null : Math.round(owed * 0.8));
  justice(s).case!.evidence = 70;
  return `You walk into the station and give your name. ${line}`;
}

// ── Evidence ─────────────────────────────────────────────────────────────────

export type EvidenceItem = { id: string; name: string; weight: number; perk: string | null; how: string; cost: (s: GameState) => number };

export const EVIDENCE: (EvidenceItem & { has: (s: GameState) => boolean; lose: (s: GameState) => void })[] = [
  {
    id: "laptop", name: "Laptop full of client chats and scripts", weight: 30,
    perk: "Yahoo clients keep coming to you (big romance-scam jobs)", how: "Wipe and burn the laptop",
    cost: () => 60_000, has: (s) => Boolean(s.flags.yahoo || s.flags.yahoo_intro),
    lose: (s) => { s.flags.yahoo = false; s.flags.yahoo_intro = false; },
  },
  {
    id: "certificate", name: "Fake degree certificate on file", weight: 20,
    perk: "Your degree certificate (jobs and bank roles that need a degree)", how: "Pay the connect to pull the file, and stop using the certificate",
    cost: () => 150_000, has: (s) => Boolean(s.flags.fake_degree),
    lose: (s) => { s.flags.fake_degree = false; s.certs.degree = false; },
  },
  {
    id: "slim", name: "Slim's SIM cards and OTP logs", weight: 25,
    perk: "Slim keeps bringing you 'formats' (SIM-swap jobs)", how: "Cut Slim off and dump the SIMs in the Jabi Lake",
    cost: () => 30_000, has: (s) => Boolean(s.flags.fraud) && (s.npcs.slim?.rel ?? 0) >= 30,
    lose: (s) => { if (s.npcs.slim) s.npcs.slim.rel = Math.min(s.npcs.slim.rel, 0); s.flags.cut_slim = true; },
  },
  {
    id: "frozen", name: "Flagged money in your frozen account", weight: 30,
    perk: "The frozen money itself", how: "Abandon the money: let the bank keep it",
    cost: () => 0, has: (s) => Boolean(lifeOf(s).frozen?.dirty),
    lose: (s) => { life(s).frozen = null; },
  },
  {
    id: "stash", name: "Stolen goods in your room", weight: 10,
    perk: "Things you could still sell to a fence", how: "Dump the stolen goods",
    cost: () => 0, has: (s) => (s.stash?.length ?? 0) > 0,
    lose: (s) => { s.stash = []; },
  },
  {
    id: "transfers", name: "Transfer trail through your account", weight: 35,
    perk: null, how: "Wash the trail through a bureau de change (costs 15% of your money)",
    cost: (s) => Math.max(20_000, Math.round(Math.max(0, s.stats.money) * 0.15)), has: (s) => Boolean(s.flags.fraud),
    lose: () => {},
  },
];

/** Evidence that still exists (not destroyed or cooled). */
export function evidenceItems(s: GameState) {
  const done = new Set(justice(s).cleared);
  const low = new Set(layingLow(s) ? (s.justice?.layLow?.items ?? []) : []);
  return EVIDENCE.filter((e) => e.has(s) && !done.has(e.id)).map((e) => ({ ...e, cooling: low.has(e.id), price: e.cost(s) }));
}

function lowerEvidence(s: GameState, by: number) {
  const l = life(s);
  if (l.efcc) {
    l.efcc.evidence = Math.max(0, l.efcc.evidence - by);
    if (l.efcc.evidence <= 0) l.efcc = null;
  }
  s.stats.heat = Math.max(0, s.stats.heat - Math.round(by / 3));
  // With nothing left to find, the fraud is behind you.
  if (!evidenceItems(s).some((e) => !e.cooling)) {
    if (!layingLow(s)) s.flags.fraud = false;
  }
}

/** Destroy one piece of evidence: lower the case, lose the perk it gave. */
export function clearEvidence(s: GameState, id: string): string {
  const e = evidenceItems(s).find((x) => x.id === id);
  if (!e) return "";
  if (onTrial(s) || jailed(s)) return "Too late for that: it's already in the court file.";
  if (s.stats.money < e.price) return `That costs ${naira(e.price)}. You don't have it.`;
  s.stats.money -= e.price;
  // Sometimes the cover-up becomes the story.
  if (Math.random() < (s.flags.nepo_fixer ? 0.04 : 0.12)) {
    const l = life(s);
    l.efcc = { day: l.efcc?.day ?? s.day, evidence: (l.efcc?.evidence ?? 0) + 15 };
    s.stats.heat = Math.min(100, s.stats.heat + 10);
    return `The person you paid to "${e.how.toLowerCase()}" talks. The EFCC adds tampering with evidence to your file.`;
  }
  e.lose(s);
  justice(s).cleared.push(e.id);
  lowerEvidence(s, e.weight);
  return `${e.how}: done.${e.perk ? ` You lose: ${e.perk.toLowerCase()}.` : ""} The evidence against you drops.`;
}

/** Keep the perks but lay low: no fraud, no flashing money, for 14 days. */
export function startLayLow(s: GameState): string {
  const items = evidenceItems(s).filter((e) => e.perk);
  if (!items.length && !fugitive(s)) return "There's nothing you need to hide from right now.";
  justice(s).layLow = { since: s.day, until: s.day + 14, items: items.map((e) => e.id) };
  return `🤫 You go quiet for 14 days: no fraud, no big spending, no posting your life online. ${items.length ? `If you hold it, you keep ${items.map((e) => e.perk!.toLowerCase()).join("; ")}.` : ""}`;
}

export function stopLayLow(s: GameState): string {
  if (!justice(s).layLow) return "";
  justice(s).layLow = null;
  return "You stop laying low. The evidence stays where it was.";
}

/** Each night: laying low cools evidence; finishing it clears the perk items without losing them. */
export function layLowNight(s: GameState): string | null {
  const ll = s.justice?.layLow;
  if (!ll) return null;
  const l = life(s);
  if (l.efcc) l.efcc.evidence = Math.max(0, l.efcc.evidence - 3);
  s.stats.heat = Math.max(0, s.stats.heat - 2);
  if (s.day < ll.until) return null;
  justice(s).layLow = null;
  const items = EVIDENCE.filter((e) => ll.items.includes(e.id));
  justice(s).cleared.push(...items.map((e) => e.id));
  lowerEvidence(s, Math.round(items.reduce((n, e) => n + e.weight, 0) * 0.8));
  s.flags.fraud = false;
  return `🤫 Two quiet weeks. Nobody's asking about you any more.${items.length ? ` You kept ${items.map((e) => e.perk!.toLowerCase()).join("; ")}, but use them and the heat comes back.` : ""}`;
}

/** A new fraud undoes the cooling: the evidence is fresh again. */
export function freshFraud(s: GameState) {
  if (!s.justice) return;
  s.justice.cleared = s.justice.cleared.filter((id) => id === "certificate" || id === "frozen");
  if (s.justice.layLow) s.justice.layLow = null;
}

/** Things laying low forbids: big purchases and fraud. */
export function layLowBlocks(s: GameState, what: "fraud" | "spend" | "post", amount = 0): string | null {
  if (!layingLow(s)) return null;
  if (what === "fraud") return null;
  if (what === "spend" && amount < 500_000) return null;
  return what === "spend" ? "You're laying low. Buying something that big now would put your name back in the file." : "You're laying low. No posting your life online for now.";
}
