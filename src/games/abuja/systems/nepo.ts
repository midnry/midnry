import { clamp, naira } from "./rules";
import { insiderTip } from "./market";
import { life } from "./life";
import type { GameState } from "./types";

// Nepo friends: children of the powerful, met by chance at school or around
// Abuja. They like you (or don't) like anyone else, but their favours open
// doors money can't: a referral, a lawyer, a file that goes quiet. Every
// favour costs some of the friendship, and none of them can be rushed.

export type NepoId = "nepo_temi" | "nepo_aminu" | "nepo_chioma" | "nepo_ibrahim" | "nepo_funmi";

type Favour = { id: string; label: string; needs: number; cost: number; every: number; detail: string; adult?: boolean };

export const NEPO: Record<NepoId, {
  name: string;
  family: string;
  /** Chapters where you might bump into them, and city places they hang around. */
  school: string[];
  haunts: string[];
  intro: string;
  hangout: { label: string; price: number };
  favours: Favour[];
}> = {
  nepo_temi: {
    name: "Temi Briggs",
    family: "Only child of (fictional) Chief Briggs of Delta Crest Oil",
    school: ["secondary"],
    haunts: ["jabi_mall", "asokoro_owambe", "oil_hq"],
    intro: "A convoy, a cooler of Capri-Sun and sunglasses indoors. Temi Briggs drops a phone and you pick it up. \"Thanks. Nobody ever picks anything up for me. They just wait for the driver.\"",
    hangout: { label: "Brunch at a Maitama lounge", price: 45_000 },
    favours: [
      { id: "oil", label: "Put in a word at Delta Crest", needs: 55, cost: 25, every: 999, detail: "Unlocks the oil & gas associate job (with a degree and NYSC).", adult: true },
      { id: "seed", label: "Ask for seed money for your business", needs: 75, cost: 35, every: 60, detail: "₦500,000 towards a business. Temi calls it 'small change'.", adult: true },
    ],
  },
  nepo_aminu: {
    name: "Aminu Waziri",
    family: "Grandson of a (fictional) retired Supreme Court justice",
    school: ["university"],
    haunts: ["cbd_tower", "ministry", "cac_office"],
    intro: "In the law faculty library, someone has taken the only copy of the book you need. Aminu Waziri slides it over. \"Grandpa wrote half of it anyway. Keep it.\"",
    hangout: { label: "Suya and arguments about politics", price: 15_000 },
    favours: [
      { id: "lawyer", label: "Ask about the family chambers", needs: 45, cost: 15, every: 999, detail: "Waziri Chambers will defend you for free if you're ever charged.", adult: true },
      { id: "bench", label: "Ask him to 'speak to some people' on the bench", needs: 75, cost: 30, every: 999, detail: "Better odds when settling a case or appealing a sentence.", adult: true },
    ],
  },
  nepo_chioma: {
    name: "Chioma Eze-Hart",
    family: "Daughter of a (fictional) retired bank chairman",
    school: ["university", "nysc"],
    haunts: ["cbd_bank", "wuse_plaza", "jabi_mall"],
    intro: "At the ATM queue, Chioma Eze-Hart's card is declined and she laughs about it. \"Daddy froze it again. Can you get me a Chapman? I'll pay you back in networking.\"",
    hangout: { label: "Cocktails at a Wuse 2 rooftop", price: 35_000 },
    favours: [
      { id: "bank", label: "A referral for a bank job", needs: 50, cost: 20, every: 30, detail: "Your next bank application skips the assessments and goes straight to interviews.", adult: true },
      { id: "tip", label: "Ask what her father's friends are buying", needs: 65, cost: 15, every: 21, detail: "A stock tip in the Trade app. Insider tips aren't always right.", adult: true },
    ],
  },
  nepo_ibrahim: {
    name: "Ibrahim Danladi",
    family: "Nephew of a (fictional) Customs Comptroller",
    school: ["nysc"],
    haunts: ["visa_agent", "garki_hub", "efcc_hq"],
    intro: "At camp, Ibrahim Danladi has a generator, a fan and a fridge in his hostel corner. \"Uncle sent it. You look hot. Sit.\" By the end of the week, half the platoon owes him a favour.",
    hangout: { label: "Pepper soup at a Garki joint", price: 12_000 },
    favours: [
      { id: "fixer", label: "Meet his 'fixer'", needs: 50, cost: 15, every: 999, detail: "Destroying evidence becomes much less likely to backfire.", adult: true },
      { id: "file", label: "Make a file go quiet", needs: 70, cost: 30, every: 30, detail: "Lowers the EFCC evidence against you by 30, without losing anything.", adult: true },
    ],
  },
  nepo_funmi: {
    name: "Funmi Ojo",
    family: "Daughter of a (fictional) fintech founder",
    school: ["secondary", "university"],
    haunts: ["tech_hub", "wuse_plaza"],
    intro: "Funmi Ojo is building an app during break time and nobody is helping. You ask what it does. Forty minutes later you're still talking about it.",
    hangout: { label: "A hackathon and shawarma", price: 10_000 },
    favours: [
      { id: "gig", label: "Ask for a contract at her dad's company", needs: 50, cost: 10, every: 21, detail: "₦400,000 for a short contract. Needs Tech 30.", adult: true },
      { id: "intro", label: "Ask for intros to investors", needs: 70, cost: 25, every: 999, detail: "+15 network: the right people now take your calls.", adult: true },
    ],
  },
};

export const NEPO_IDS = Object.keys(NEPO) as NepoId[];

export const met = (s: GameState, id: string) => Boolean(s.npcs[id]?.met);

/** Maybe bump into a nepo friend in this school chapter (called on scene changes). */
export function schoolBump(s: GameState): NepoId | null {
  if (!s.chapter || s.nepoMeet) return null;
  const options = NEPO_IDS.filter((id) => NEPO[id].school.includes(s.chapter!) && !met(s, id) && !s.flags[`brushed_${id}`]);
  if (!options.length || Math.random() > 0.1) return null;
  return options[Math.floor(Math.random() * options.length)]!;
}

/** Maybe bump into one at a place in town, once a day. */
export function townBump(s: GameState, placeId: string): NepoId | null {
  if (s.chapter || s.nepoMeet || s.stage !== "adult" || s.flags.nepo_bump_day === s.day) return null;
  const options = NEPO_IDS.filter((id) => NEPO[id].haunts.includes(placeId) && !met(s, id));
  if (!options.length) return null;
  s.flags.nepo_bump_day = s.day;
  if (Math.random() > 0.35) return null;
  return options[Math.floor(Math.random() * options.length)]!;
}

export type MeetChoice = "real" | "flex" | "ask" | "brush";

/** How you handle the first meeting. */
export function meet(s: GameState, how: MeetChoice): string {
  const id = s.nepoMeet as NepoId | undefined;
  s.nepoMeet = null;
  if (!id) return "";
  const n = NEPO[id];
  const first = n.name.split(" ")[0];
  const set = (rel: number) => (s.npcs[id] = { rel: clamp(rel), met: true, lastSeen: s.day });
  if (how === "brush") {
    s.flags[`brushed_${id}`] = true;
    return `You keep walking. ${first} shrugs: people usually come to them.`;
  }
  if (how === "ask") {
    set(5);
    return `You ask ${first} for a favour before you know their surname. They smile like they've seen this a hundred times. Relationship 5.`;
  }
  if (how === "flex") {
    const price = s.chapter ? 2_000 : 25_000;
    if (s.stats.money >= price) {
      s.stats.money -= price;
      set(20);
      return `You spend ${naira(price)} trying to look like you belong. ${first} notices, and is amused rather than impressed. Relationship 20.`;
    }
    set(5);
    return `You try to show off with money you don't have. ${first} pays, which is worse. Relationship 5.`;
  }
  set(25);
  return `You're just yourself. ${first} laughs more than they have all month. You swap numbers. Relationship 25.`;
}

/** Hang out: their tastes are expensive. */
export function hangOut(s: GameState, id: NepoId): string {
  const n = NEPO[id];
  const entry = s.npcs[id];
  if (!entry?.met) return "";
  if (s.flags[`nepo_hang_${id}`] === s.day) return `You already saw ${n.name.split(" ")[0]} today.`;
  if (s.stats.money < n.hangout.price) return `${n.hangout.label} costs about ${naira(n.hangout.price)}. You can't keep up today.`;
  s.stats.money -= n.hangout.price;
  s.flags[`nepo_hang_${id}`] = s.day;
  entry.rel = clamp(entry.rel + 8);
  entry.lastSeen = s.day;
  s.stats.network = clamp(s.stats.network + 1);
  return `${n.hangout.label} with ${n.name.split(" ")[0]} (${naira(n.hangout.price)}). Relationship ${entry.rel}.`;
}

export function favourState(s: GameState, id: NepoId, f: Favour): { ok: boolean; why: string } {
  const entry = s.npcs[id];
  const last = Number(s.flags[`nepo_fav_${id}_${f.id}`] ?? -1);
  if (!entry?.met) return { ok: false, why: "You haven't met." };
  if (f.adult && s.chapter) return { ok: false, why: "When you're grown." };
  if (f.every === 999 && last >= 0) return { ok: false, why: "Done." };
  if (last >= 0 && s.day - last < f.every) return { ok: false, why: `Again from day ${last + f.every}.` };
  if (entry.rel < f.needs) return { ok: false, why: `Needs relationship ${f.needs}.` };
  if (id === "nepo_funmi" && f.id === "gig" && s.skills.tech < 30) return { ok: false, why: "Needs Tech 30." };
  if (id === "nepo_temi" && f.id === "seed" && !(life(s).businesses?.length)) return { ok: false, why: "Start a business first." };
  if (id === "nepo_ibrahim" && f.id === "file" && !life(s).efcc) return { ok: false, why: "There's no file on you." };
  return { ok: true, why: "" };
}

/** Ask a favour: it costs some of the friendship. */
export function askFavour(s: GameState, id: NepoId, favour: string): { line: string; insider?: boolean } {
  const n = NEPO[id];
  const f = n.favours.find((x) => x.id === favour);
  if (!f) return { line: "" };
  const st = favourState(s, id, f);
  if (!st.ok) return { line: st.why };
  const entry = s.npcs[id]!;
  entry.rel = clamp(entry.rel - f.cost);
  s.flags[`nepo_fav_${id}_${f.id}`] = s.day;
  const first = n.name.split(" ")[0];
  switch (`${id}:${f.id}`) {
    case "nepo_temi:oil":
      s.flags.oil_connect = true;
      return { line: `${first} texts someone at Delta Crest while you watch. "Done. Apply at their HQ."` };
    case "nepo_temi:seed":
      s.stats.money += 500_000;
      return { line: `₦500,000 lands in your account. "For the business. Don't make it weird."` };
    case "nepo_aminu:lawyer":
      s.flags.nepo_lawyer = true;
      return { line: `${first} gives you a card from Waziri Chambers. "If anything ever happens, call this number before you call your mother."` };
    case "nepo_aminu:bench":
      s.flags.nepo_bench = true;
      return { line: `${first} goes quiet, then nods. "I'll mention your name at Sunday lunch." You don't ask who comes to Sunday lunch.` };
    case "nepo_chioma:bank":
      s.flags.bank_referral = true;
      return { line: `${first} sends an email to an HR head with you in copy. Your next bank application goes straight to interviews.` };
    case "nepo_chioma:tip": {
      const asset = insiderTip(s);
      return { line: `"Daddy's friends are buying ${asset} before the results." Check the Trade app.`, insider: true };
    }
    case "nepo_ibrahim:fixer":
      s.flags.nepo_fixer = true;
      return { line: `${first} introduces you to a quiet man called Alhaji Sule. "Anything you need to disappear, he does it properly."` };
    case "nepo_ibrahim:file": {
      const l = life(s);
      if (l.efcc) {
        l.efcc.evidence = Math.max(0, l.efcc.evidence - 30);
        if (l.efcc.evidence <= 0) l.efcc = null;
      }
      return { line: `Two days later, a petition against you is "misfiled". The EFCC file on you gets thinner.` };
    }
    case "nepo_funmi:gig":
      s.stats.money += 400_000;
      s.skills.tech = clamp(s.skills.tech + 2);
      return { line: `A two-week contract building dashboards: ₦400,000 and a line on your CV.` };
    case "nepo_funmi:intro":
      s.stats.network = clamp(s.stats.network + 15);
      return { line: `${first} adds you to a WhatsApp group with three VCs and a minister's special adviser. Network +15.` };
  }
  return { line: "" };
}
