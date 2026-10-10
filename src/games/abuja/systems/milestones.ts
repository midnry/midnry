import { titleOf } from "./banking";
import { bizDef } from "./business";
import { job } from "./data";
import { partnerName } from "./romance";
import { ROUTES } from "./japa";
import { addStat, FREEDOM_TARGET, naira, netWorth } from "./rules";
import type { GameState } from "./types";

// The big moments of adult life, each one a full-screen celebration: climbing
// the ranks on the way to financial freedom (₦25m), and life's firsts (a job,
// a business, a car, a home of your own, a wedding, a baby, a promotion, a
// visa). One checker, run after every action and every night, so any part of
// the game that gets you there counts.

export type Tone = "gold" | "love" | "family" | "work" | "travel";
export type Celebration = { id: string; icon: string; title: string; text: string; tone: Tone };

/** Ranks on the way to ₦25m. Each comes with a little more standing in Abuja. */
export const RANKS: { at: number; id: string; title: string; icon: string; text: string; rep: number; network: number }[] = [
  { at: 100_000, id: "r1", title: "Hustler", icon: "🪙", text: "₦100,000 to your name. Small money, but it's yours, and it's working.", rep: 1, network: 1 },
  { at: 500_000, id: "r2", title: "Getting by", icon: "💵", text: "Half a million. Rent is no longer a monthly panic.", rep: 2, network: 2 },
  { at: 1_000_000, id: "r3", title: "Millionaire", icon: "💰", text: "You're a naira millionaire. Your aunties have started calling more often.", rep: 3, network: 3 },
  { at: 5_000_000, id: "r4", title: "Comfortable", icon: "🏡", text: "₦5 million. You choose where you eat now, not the other way round.", rep: 4, network: 4 },
  { at: 10_000_000, id: "r5", title: "Big Boss", icon: "👑", text: "₦10 million. People wait for you to arrive before the meeting starts.", rep: 5, network: 5 },
];

const NO_RANK = { title: "Starting out", icon: "🌱" };

/** Your rank now, and the next one. */
export function rankOf(s: GameState) {
  const nw = netWorth(s);
  let current: (typeof RANKS)[number] | null = null;
  for (const r of RANKS) if (nw >= r.at) current = r;
  const next = RANKS.find((r) => nw < r.at) ?? null;
  return { title: current?.title ?? NO_RANK.title, icon: current?.icon ?? NO_RANK.icon, next, worth: nw, progress: Math.max(0, Math.min(1, nw / FREEDOM_TARGET)) };
}

function celebrate(s: GameState, c: Celebration, quiet: boolean) {
  s.flags[`ms_${c.id}`] = true;
  if (quiet) return;
  s.celebrations = [...(s.celebrations ?? []), c].slice(-4);
}

const hit = (s: GameState, id: string) => Boolean(s.flags[`ms_${id}`]);

/** Check every milestone; queue celebrations for new ones. */
export function checkMilestones(s: GameState) {
  if (s.stage !== "adult" || s.chapter || s.ending) return;
  // The first check on an older life marks what's already done, without a burst of celebrations.
  const quiet = !s.flags.ms_v;
  s.flags.ms_v = 1;
  const nw = netWorth(s);

  for (const r of RANKS) {
    if (nw >= r.at && !hit(s, r.id)) {
      if (!quiet) {
        addStat(s, "reputation", r.rep);
        addStat(s, "network", r.network);
      }
      celebrate(s, { id: r.id, icon: r.icon, title: `New rank: ${r.title}`, text: `${r.text} Net worth ${naira(nw)}: ${Math.round((nw / FREEDOM_TARGET) * 100)}% of the way to financial freedom.`, tone: "gold" }, quiet);
    }
  }

  // Work.
  if ((s.job || s.banking?.job) && !hit(s, "job")) {
    const title = s.banking?.job ? titleOf(s.banking.job) : (job(s.job)?.title ?? "your first job");
    celebrate(s, { id: "job", icon: "💼", title: "You're hired!", text: `First day as ${title}. A salary with your name on it.`, tone: "work" }, quiet);
  }
  const grade = s.banking?.job?.grade ?? 0;
  const best = Number(s.flags.ms_grade ?? grade);
  if (s.banking?.job && grade > best) celebrate(s, { id: `grade${grade}`, icon: "📈", title: "Promoted!", text: `You're now ${titleOf(s.banking.job)}. A bigger desk, a bigger salary, and more people who want your job.`, tone: "work" }, quiet);
  if (s.banking?.job) s.flags.ms_grade = Math.max(best, grade);

  // Business.
  const biz = s.life?.businesses ?? [];
  if (biz.length && !hit(s, "biz")) {
    const def = bizDef(biz[0]!.id);
    celebrate(s, { id: "biz", icon: def?.icon ?? "🏪", title: "Open for business", text: `Your ${def?.name ?? "business"} is open. You're the oga now.`, tone: "work" }, quiet);
  }
  for (const b of biz) {
    for (const lvl of [2, 3]) {
      const id = `biz_${b.id}_${lvl}`;
      if (b.level >= lvl && !hit(s, id)) {
        const def = bizDef(b.id);
        celebrate(s, { id, icon: def?.icon ?? "🏪", title: lvl === 3 ? "As big as it gets" : "Growing!", text: `Your ${def?.name ?? "business"} reaches level ${lvl}. ${lvl === 3 ? "The top. People ask you for advice now." : "More staff, more customers, more profit."}`, tone: "work" }, quiet);
      }
    }
  }

  // Things you own.
  if (s.life?.car === "owned" && !hit(s, "car")) celebrate(s, { id: "car", icon: "🚗", title: "Your own car", text: "No more waiting for okadas in the rain. The aircon even works (mostly).", tone: "gold" }, quiet);
  if (Object.values(s.city?.lots ?? {}).some((l) => l.owned) && !hit(s, "property")) celebrate(s, { id: "property", icon: "🏠", title: "A property of your own", text: "Land and walls with your name on the papers. Rent comes to you now.", tone: "gold" }, quiet);

  // Love and family.
  for (const p of Object.values(s.partners)) {
    if (p.status === "married" && !hit(s, `wed_${p.id}`)) celebrate(s, { id: `wed_${p.id}`, icon: "💍", title: "Just married!", text: `You and ${partnerName(s, p.id)} are married. The jollof was perfect and the MC only got your name wrong twice.`, tone: "love" }, quiet);
  }
  if (s.emeka?.stage === "married" && !hit(s, "wed_emeka")) celebrate(s, { id: "wed_emeka", icon: "👑", title: "The wedding of the year", text: "You and Emeka D are married. Abuja will talk about it for years.", tone: "love" }, quiet);
  for (const c of s.children) {
    const id = `child_${c.name}`;
    if (!hit(s, id)) celebrate(s, { id, icon: "👶", title: `Welcome, ${c.name}!`, text: `${c.name} is born. Everything changes, and you wouldn't have it any other way.`, tone: "family" }, quiet);
  }

  // Leaving.
  const j = s.japa;
  if (j?.status === "approved" && j.route && !hit(s, `visa_${j.route}`)) {
    const r = ROUTES[j.route];
    celebrate(s, { id: `visa_${j.route}`, icon: "✈️", title: "Visa approved!", text: `${r.city} said yes. Open Japa on your phone when you're ready to buy the ticket.`, tone: "travel" }, quiet);
  }
}

/** Close the celebration on screen. */
export function nextCelebration(s: GameState) {
  s.celebrations = (s.celebrations ?? []).slice(1);
}
