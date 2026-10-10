import romanceJson from "../data/relationships.json";
import { babyName } from "./family";
import { withoutBankCheck } from "./bank";
import { addLog, addStat, clamp, naira } from "./rules";
import type { Gender, GameState, Partner, Personality } from "./types";

// Relationships for adults (18+). Intimacy is always fade-to-black. Pregnancy,
// termination and violence are written with weight, never as jokes.

type Person = { id: string; where: string | null; names: Record<Gender, string>; nepo: boolean; blurb: string };

export const ROMANCE = romanceJson as unknown as {
  people: Person[];
  personalities: Record<Personality, { weight: number; hints: string[] }>;
  dates: { id: string; name: string; cost: number; affection: number }[];
  gift: { cost: number; affection: number };
  nepoMultiplier: number;
  pregnancyChance: { protected: number; unprotected: number };
  weddings: { id: string; name: string; cost: number; reputation: number; text: string; /** Money guests spray per point of your network. */ spray: number; /** Needs the introduction ceremony first. */ intro: boolean }[];
  introduction: { cost: number; list: string[] };
  childNames: string[];
  childWeeklyCost: number;
};

export const person = (id: string) => ROMANCE.people.find((item) => item.id === id);

export function partnerName(s: GameState, id: string): string {
  if (id === "emeka") return "Emeka D";
  const p = person(id);
  const gender = s.partners[id]?.gender ?? s.loveGender;
  return p?.names[gender] ?? id;
}

function rollPersonality(): Personality {
  const r = Math.random();
  const { calm, cunning } = ROMANCE.personalities;
  return r < calm.weight ? "calm" : r < calm.weight + cunning.weight ? "cunning" : "crazy";
}

function rollGender(s: GameState): Gender {
  return s.interest === "women" ? "female" : s.interest === "men" ? "male" : Math.random() < 0.5 ? "female" : "male";
}

/** The current partner the MC is committed to, if any. */
export function committed(s: GameState): Partner | undefined {
  return Object.values(s.partners).find((p) => p.status === "dating" || p.status === "engaged" || p.status === "married");
}

export function cost(s: GameState, id: string, base: number): number {
  return Math.round(base * (s.partners[id]?.nepo ? ROMANCE.nepoMultiplier : 1));
}

function ensureLove(s: GameState) {
  // The university love interest joins the dating list if they were met in the story.
  if (s.npcs.love?.met && !s.partners.love) {
    s.partners.love = {
      id: "love",
      gender: s.loveGender,
      affection: Math.max(15, s.npcs.love.rel),
      personality: rollPersonality(),
      hints: [],
      status: "met",
      since: s.day,
      lastSeen: s.day,
      nepo: false,
    };
  }
}

export function syncPeople(s: GameState) {
  ensureLove(s);
}

/** Meet someone new at a place. Returns a toast. */
export function meet(s: GameState, placeId: string): string {
  ensureLove(s);
  const options = ROMANCE.people.filter((p) => p.where === placeId && !s.partners[p.id]);
  const pick = options[0];
  if (!pick) return "You chat with a few people, but nobody new really clicks today.";
  const gender = rollGender(s);
  s.partners[pick.id] = {
    id: pick.id,
    gender,
    affection: 10,
    personality: rollPersonality(),
    hints: [],
    status: "met",
    since: s.day,
    lastSeen: s.day,
    nepo: pick.nepo,
  };
  addLog(s, `Met ${partnerName(s, pick.id)}.`);
  return `You get talking to ${partnerName(s, pick.id)}. ${pick.blurb} You swap numbers. Find them in Linkup on your phone.`;
}

function hint(s: GameState, p: Partner): string | null {
  const pool = ROMANCE.personalities[p.personality].hints.filter((line) => !p.hints.includes(line));
  if (!pool.length || Math.random() > 0.45) return null;
  const line = pool[0]!;
  p.hints.push(line);
  return line;
}

export function revealed(p: Partner): boolean {
  return p.hints.length >= 3;
}

function touch(s: GameState, p: Partner, amount: number) {
  p.affection = clamp(p.affection + amount);
  p.lastSeen = s.day;
}

export function textPartner(s: GameState, id: string): string {
  const p = s.partners[id];
  if (!p || p.status === "ex") return "";
  if (s.flags[`texted_${id}`] === s.day) return `You already texted ${partnerName(s, id)} today. Don't be clingy.`;
  s.flags[`texted_${id}`] = s.day;
  touch(s, p, 2);
  return `You text ${partnerName(s, id)}. Voice notes, memes, a "have you eaten?". Warm.`;
}

export function goOnDate(s: GameState, id: string, dateId: string): string {
  const p = s.partners[id];
  const d = ROMANCE.dates.find((item) => item.id === dateId);
  if (!p || !d || p.status === "ex") return "";
  const price = cost(s, id, d.cost);
  if (s.stats.money < price) return `You need ${naira(price)} for that date.`;
  addStat(s, "money", -price);
  addStat(s, "stress", -8);
  const boost = p.nepo && d.cost < 100000 ? Math.round(d.affection / 2) : d.affection;
  touch(s, p, boost);
  const seen = hint(s, p);
  const nepoLine = p.nepo && d.cost < 100000 ? ` ${partnerName(s, id)} looks around like they've never been anywhere this cheap.` : "";
  return `${d.name} with ${partnerName(s, id)} (${naira(price)}).${nepoLine}${seen ? ` You notice something: ${seen}` : ""}`;
}

export function giveGift(s: GameState, id: string): string {
  const p = s.partners[id];
  if (!p || p.status === "ex") return "";
  const price = cost(s, id, ROMANCE.gift.cost);
  if (s.stats.money < price) return `A gift ${partnerName(s, id)} would like costs ${naira(price)}.`;
  addStat(s, "money", -price);
  touch(s, p, ROMANCE.gift.affection);
  return `You give ${partnerName(s, id)} a gift (${naira(price)}). They post it on their Story.`;
}

export function askOut(s: GameState, id: string): string {
  const p = s.partners[id];
  if (!p || p.status !== "met") return "";
  if (p.affection < 30) return `${partnerName(s, id)} laughs: "Slow down. Let's get to know each other first." (Needs affection 30.)`;
  const current = committed(s);
  p.status = "dating";
  p.since = s.day;
  touch(s, p, 5);
  addLog(s, `Started dating ${partnerName(s, id)}.`);
  if (current) {
    s.affairs.push({ with: id, partner: current.id, day: s.day });
    return `${partnerName(s, id)} says yes. You are now dating two people. ${partnerName(s, current.id)} doesn't know. Yet.`;
  }
  return `${partnerName(s, id)} says yes. It's official. Your WhatsApp status says so.`;
}

export function propose(s: GameState, id: string): string {
  const p = s.partners[id];
  if (!p || p.status !== "dating") return "";
  if (p.affection < 75 || s.day - p.since < 28) return `It's too soon. (Needs affection 75 and at least four weeks together.)`;
  p.status = "engaged";
  touch(s, p, 10);
  addLog(s, `Got engaged to ${partnerName(s, id)}.`);
  return `On one knee at Jabi Lake. ${partnerName(s, id)} says YES. Someone films it. It gets 40k views.`;
}

/** The introduction: you and your family visit theirs with the list. Needed before a church or traditional wedding. */
export const introduced = (s: GameState, id: string) => Boolean(s.flags[`intro_${id}`]);

export function introduce(s: GameState, id: string): string {
  const p = s.partners[id];
  if (!p || p.status !== "engaged" || introduced(s, id)) return "";
  const price = cost(s, id, ROMANCE.introduction.cost);
  if (s.stats.money < price) return `The list comes to ${naira(price)}. You don't have it yet.`;
  addStat(s, "money", -price);
  addStat(s, "reputation", 3);
  s.flags[`intro_${id}`] = true;
  touch(s, p, 6);
  addLog(s, `Introduction ceremony with ${partnerName(s, id)}'s family.`);
  const list = ROMANCE.introduction.list;
  return `Your family arrives at theirs with ${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}. The elders pray, argue about the goat, and finally say yes. (${naira(price)})`;
}

export function wed(s: GameState, id: string, weddingId: string): string {
  const p = s.partners[id];
  const w = ROMANCE.weddings.find((item) => item.id === weddingId);
  if (!p || !w || p.status !== "engaged") return "";
  if (w.intro && !introduced(s, id)) return "Both families expect the introduction first. Do that, then the wedding.";
  const price = cost(s, id, w.cost);
  if (s.stats.money < price) return `You need ${naira(price)} for that wedding.`;
  addStat(s, "money", -price);
  addStat(s, "reputation", w.reputation);
  if (weddingId === "full") addStat(s, "network", 10);
  p.status = "married";
  touch(s, p, 10);
  addLog(s, `Married ${partnerName(s, id)} (${w.name.toLowerCase()}).`);
  // On the dance floor, guests spray money: more friends, more naira.
  const sprayed = Math.min(Math.round(price * 0.7), Math.round((s.stats.network * w.spray + s.stats.reputation * w.spray * 0.3) / 1000) * 1000);
  if (sprayed > 0) {
    withoutBankCheck(() => addStat(s, "money", sprayed));
    return `${w.text} On the dance floor, guests spray ${naira(sprayed)} in crisp notes. The children collecting them are suspiciously well organised.`;
  }
  return w.text;
}

export function breakUp(s: GameState, id: string): string {
  const p = s.partners[id];
  if (!p || p.status === "ex" || p.status === "met") return "";
  const wasMarried = p.status === "married";
  p.status = "ex";
  p.affection = 5;
  addStat(s, "stress", wasMarried ? 20 : 8);
  if (wasMarried) addStat(s, "money", -Math.round(Math.max(0, s.stats.money) * 0.3));
  s.affairs = s.affairs.filter((a) => a.partner !== id && a.with !== id);
  addLog(s, wasMarried ? `Divorced ${partnerName(s, id)}.` : `Broke up with ${partnerName(s, id)}.`);
  return wasMarried ? "The divorce is long, expensive and sad. Lawyers take their share; so does the settlement." : `You end things with ${partnerName(s, id)}.`;
}

/** Spend the night together: always fade-to-black, and only with consent. */
export function intimacy(s: GameState, id: string, safe: boolean): string {
  const p = s.partners[id];
  if (!p || p.status === "ex") return "";
  const together = p.status !== "met";
  if (!together && p.affection < 40) return `${partnerName(s, id)} isn't ready for that. Respect it.`;
  if (together && p.affection < 25) return `${partnerName(s, id)} isn't in the mood. Things have been distant lately.`;
  if (safe) {
    if (s.stats.money < 1500) return "You need ₦1,500 for protection from the pharmacy.";
    addStat(s, "money", -1500);
  }
  const current = committed(s);
  if (current && current.id !== id) s.affairs.push({ with: id, partner: current.id, day: s.day });
  touch(s, p, 5);
  addStat(s, "stress", -10);
  if (!s.pregnancy && Math.random() < (safe ? ROMANCE.pregnancyChance.protected : ROMANCE.pregnancyChance.unprotected)) {
    s.pregnancy = { partner: id, day: s.day, due: null, mc: s.gender === "female" };
    s.flags.pregnancy_pending = s.day + 10;
  }
  return `Later that night, the lights go off. (What happens stays between you and ${partnerName(s, id)}.)`;
}

// ── Weekly upkeep and forced events ─────────────────────────────────────────

/** Weekly: neglect, billing, affairs coming to light, partners cheating, child costs. Returns an event id to fire, if any. */
export function weeklyRomance(s: GameState): string | null {
  syncPeople(s);
  for (const p of Object.values(s.partners)) {
    if (p.status === "ex") continue;
    if (s.day - p.lastSeen > 10) p.affection = clamp(p.affection - 4);
  }
  if (s.children.length) {
    const childCost = s.children.length * ROMANCE.childWeeklyCost;
    addStat(s, "money", -childCost);
    addStat(s, "stress", 2 * s.children.length);
  }
  // Affairs come to light.
  for (const affair of s.affairs) {
    const partner = s.partners[affair.partner];
    if (!partner || partner.status === "ex") continue;
    if (Math.random() < 0.22) {
      s.eventCtx = { partner: partner.id };
      return `caught_${partner.personality}`;
    }
  }
  const current = committed(s);
  if (current) {
    const cheat = (0.02 + (current.affection < 40 ? 0.06 : 0)) * (current.personality === "cunning" ? 2 : 1);
    if (Math.random() < cheat) {
      s.eventCtx = { partner: current.id };
      return "partner_cheated";
    }
    if (current.status !== "married" && Math.random() < 0.3) {
      const amount = cost(s, current.id, 15000 + Math.round(Math.random() * 3) * 10000);
      s.eventCtx = { partner: current.id, amount };
      return "billing";
    }
  }
  return null;
}

/** Daily: pregnancy news and due dates. */
export function dailyRomance(s: GameState): string | null {
  const pressure = Number(s.flags.family_pressure ?? 0);
  if (pressure && s.day >= pressure) {
    s.flags.family_pressure = 0;
    const preg = s.pregnancy;
    const partner = preg ? s.partners[preg.partner] : undefined;
    if (preg && partner && partner.status !== "married" && partner.status !== "ex") {
      s.eventCtx = { partner: preg.partner };
      return "family_pressure";
    }
  }
  const preg = s.pregnancy;
  if (!preg) return null;
  if (preg.due == null && Number(s.flags.pregnancy_pending ?? 0) <= s.day) {
    s.flags.pregnancy_pending = 0;
    s.eventCtx = { partner: preg.partner };
    return "pregnant";
  }
  if (preg.due != null && s.day >= preg.due) {
    s.eventCtx = { partner: preg.partner };
    return "birth";
  }
  return null;
}

export function pregnancyText(s: GameState): string {
  const preg = s.pregnancy;
  if (!preg) return "";
  const name = partnerName(s, preg.partner);
  return preg.mc
    ? `You are pregnant. ${name} is the father. Your hands are shaking as you hold the test. This changes everything: money, work, family, your body, your whole future.`
    : `${name} calls, voice unsteady: "I'm pregnant." The line goes quiet. This changes everything for both of you.`;
}

function endWith(s: GameState, id: string, text: string) {
  const p = s.partners[id];
  if (p) {
    p.status = "ex";
    p.affection = 0;
  }
  s.affairs = s.affairs.filter((a) => a.partner !== id);
  addLog(s, text);
}

/** Outcomes for relationship events. Returns extra lines to show. */
export function romanceEffect(s: GameState, name: string): string[] {
  const id = s.eventCtx.partner ?? s.pregnancy?.partner ?? "";
  const who = id ? partnerName(s, id) : "";
  const p = s.partners[id];
  const out: string[] = [];
  switch (name) {
    case "pay_billing":
      addStat(s, "money", -(s.eventCtx.amount ?? 0));
      if (p) touch(s, p, 4);
      break;
    case "refuse_billing":
      if (p) p.affection = clamp(p.affection - 6);
      break;
    case "caught_calm":
      endWith(s, id, `${who} found out about cheating and quietly left.`);
      addStat(s, "network", -4);
      addStat(s, "stress", 12);
      break;
    case "caught_cunning": {
      const hits = [
        () => {
          addStat(s, "reputation", -20);
          out.push(`${who} posts screenshots of everything on Chirp. It trends. Your boss sees it.`);
        },
        () => {
          const loss = Math.round(Math.max(0, s.stats.money) * 0.35);
          addStat(s, "money", -loss);
          out.push(`${who} empties the joint "savings" you set up: ${naira(loss)} gone.`);
        },
        () => {
          if (s.npcs.tunde) s.npcs.tunde.rel = clamp(s.npcs.tunde.rel - 20);
          addStat(s, "stress", 15);
          out.push(`${who} starts seeing one of your closest friends. On purpose. Everyone knows.`);
        },
      ].sort(() => Math.random() - 0.5);
      hits[0]!();
      hits[1]!();
      endWith(s, id, `${who} found out about cheating and took revenge.`);
      break;
    }
    case "caught_crazy_hide":
    case "caught_crazy_face": {
      const face = name === "caught_crazy_face";
      addStat(s, "money", -120000);
      out.push(`${who} destroys your car windows and phone. Repairs: ₦120,000.`);
      if (face || Math.random() < 0.3) {
        addStat(s, "health", -35);
        addStat(s, "money", -50000);
        out.push("You are hurt badly and spend days in hospital (₦50,000).");
        if (Math.random() < (face ? 0.05 : 0.02)) {
          addLog(s, `Killed in a violent attack by ${who} after they discovered an affair.`);
          s.ending = "cut";
        }
      }
      addStat(s, "stress", 20);
      addStat(s, "reputation", -8);
      endWith(s, id, `${who} found out about cheating. It turned violent.`);
      break;
    }
    case "forgive":
      if (p) p.affection = 30;
      addStat(s, "stress", 15);
      break;
    case "end_after_cheat":
      endWith(s, id, `Left ${who} after they cheated.`);
      addStat(s, "stress", 10);
      break;
    case "keep":
      if (s.pregnancy) {
        s.pregnancy.due = s.day + 21;
        addLog(s, `Decided to keep the baby with ${who}.`);
        if (p && p.status !== "married") s.flags.family_pressure = s.day + 5;
        if (p && p.status !== "married" && p.personality !== "calm" && Math.random() < 0.3) {
          endWith(s, id, `${who} disappeared after the pregnancy news.`);
          out.push(`${who} stops answering. Their number is switched off. You are on your own with this.`);
        }
      }
      break;
    case "consider_termination":
      s.flags.force_event = "clinic";
      break;
    case "terminate_safe":
    case "terminate_unsafe": {
      const unsafe = name === "terminate_unsafe";
      const preg = s.pregnancy;
      s.pregnancy = null;
      if (!preg) break;
      const complication = Math.random() < (unsafe ? 0.35 : 0.05);
      if (preg.mc) {
        if (complication) {
          addStat(s, "health", -45);
          addStat(s, "money", -80000);
          out.push("There are complications. You end up in emergency care at Garki General Hospital (₦80,000). Recovery is slow.");
          if (Math.random() < (unsafe ? 0.08 : 0.003)) {
            addLog(s, "Died from complications after an unsafe abortion.");
            s.ending = "cut";
            break;
          }
        }
        addStat(s, "stress", 18);
        addLog(s, unsafe ? "Ended a pregnancy at a backstreet clinic." : "Ended a pregnancy with a licensed doctor.");
      } else {
        addStat(s, "stress", 15);
        if (complication) {
          out.push(`${who} has complications and is hospitalised. You sit by the bed every night. Something between you has changed.`);
          if (p) p.affection = clamp(p.affection - 30);
          addStat(s, "stress", 15);
        }
        addLog(s, `${who} ended a pregnancy.`);
      }
      out.push("It stays with you, quietly, for a long time.");
      break;
    }
    case "marry_court":
      if (p) {
        p.status = "married";
        addLog(s, `Married ${who} at the court registry under family pressure.`);
      }
      break;
    case "refuse_pressure":
      addLog(s, "Refused to be pressured into marriage.");
      break;
    case "birth": {
      const preg = s.pregnancy;
      s.pregnancy = null;
      if (!preg) break;
      const gender = Math.random() < 0.5 ? "female" : "male";
      const name = babyName(gender, s.children.map((c) => c.name));
      s.children.push({ name, born: s.day, with: preg.partner, gender, grades: 50 });
      addStat(s, "reputation", 5);
      addStat(s, "stress", 10);
      addLog(s, `Became a parent: ${name} was born.`);
      out.push(`You name the baby ${name}. Every week now costs ${naira(ROMANCE.childWeeklyCost)} more, and every week is worth it.`);
      break;
    }
    default:
      break;
  }
  return out;
}
