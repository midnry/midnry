/** Device-local cosmetic progression. No combat stats or account data. */
import { contributionsOf } from "./outpost-mission-progress.js";
export const FINISHES = [
  { id: "standard", name: "Field Issue", xp: 0, color: null },
  { id: "copper", name: "Copper Signal", xp: 200, color: "#cb8750" },
  { id: "glacier", name: "Glacier Ink", xp: 600, color: "#72bbd0" },
  { id: "nightfall", name: "Nightfall", xp: 1200, color: "#a78bce" },
];
/** Outfits unlock one per level, in this order; Field Ranger is always yours. */
export const OUTFIT_ORDER = [
  "ranger",
  "medic",
  "desert",
  "urban",
  "alpine",
  "engineer",
  "recon",
  "sentinel",
  "hazard",
  "shadow",
];
export const outfitLevel = (id) => Math.max(1, OUTFIT_ORDER.indexOf(id) + 1);
export const outfitUnlocked = (profile, id) =>
  OUTFIT_ORDER.includes(id) && 1 + Math.floor((profile?.xp || 0) / 150) >= outfitLevel(id);
/**
 * Daily and weekly challenges. Each counts progress from a finished round
 * (`gain` returns how much this round adds); progress resets each day or
 * week, and nothing is lost for days you don't play.
 */
const won = (r, role) => (r.won && (!role || r.role === role) ? 1 : 0);
const done = (r, key) => Math.floor(r.contributions?.[key] || 0);
export const DAILY_CHALLENGES = [
  { id: "rounds-3", text: "Finish 3 rounds", goal: 3, gain: () => 1 },
  { id: "win-op", text: "Win a round as an operator", goal: 1, gain: (r) => won(r, "operator") },
  { id: "win-inf", text: "Win a round as an infiltrator", goal: 1, gain: (r) => won(r, "infiltrator") },
  { id: "supplies-8", text: "Load 8 medical supplies", goal: 8, gain: (r) => done(r, "supplies") },
  { id: "checks-3", text: "Complete 3 aircraft checks", goal: 3, gain: (r) => done(r, "checks") },
  { id: "repair-2", text: "Repair or defuse 2 times", goal: 2, gain: (r) => done(r, "repairs") + done(r, "defuses") },
  { id: "rescue-6", text: "Rescue 6 patients", goal: 6, gain: (r) => Math.floor(r.rescued || 0) },
  { id: "pilot-15", text: "Fly the medevac by hand for 15 seconds", goal: 15, gain: (r) => done(r, "pilotSeconds") },
  { id: "sabotage-2", text: "Sabotage the base twice as an infiltrator", goal: 2, gain: (r) => done(r, "sabotage") },
  { id: "detective", text: "Vote for an infiltrator", goal: 1, gain: (r) => Math.min(1, Math.floor(r.correctVotes || 0)) },
];
export const WEEKLY_CHALLENGES = [
  { id: "w-wins-6", text: "Win 6 rounds", goal: 6, gain: (r) => won(r) },
  { id: "w-supplies-40", text: "Load 40 medical supplies", goal: 40, gain: (r) => done(r, "supplies") },
  { id: "w-rescue-20", text: "Rescue 20 patients", goal: 20, gain: (r) => Math.floor(r.rescued || 0) },
  { id: "w-inf-3", text: "Win 3 rounds as an infiltrator", goal: 3, gain: (r) => won(r, "infiltrator") },
  { id: "w-detective-4", text: "Vote for an infiltrator 4 times", goal: 4, gain: (r) => Math.floor(r.correctVotes || 0) },
];
export const DAILY_XP = 60,
  WEEKLY_XP = 250;
const hash = (text) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
/** The same three challenges for everyone on a given day. */
export function dailyChallenges(day) {
  const pool = [...DAILY_CHALLENGES];
  const picks = [];
  let h = hash(day);
  while (picks.length < 3) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    picks.push(pool.splice(h % pool.length, 1)[0]);
  }
  return picks;
}
export const weeklyChallenge = (week) => WEEKLY_CHALLENGES[hash(week) % WEEKLY_CHALLENGES.length];
/** Local calendar keys: "2026-10-14" and its ISO week "2026-W42". */
export function calendarKeys(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return { day, week: `${t.getUTCFullYear()}-W${pad(week)}` };
}
const progressOf = (value) =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value)
          .filter(([k, v]) => typeof k === "string" && k.length < 24 && Number.isFinite(v))
          .map(([k, v]) => [k, Math.max(0, Math.min(1000000, Math.floor(v)))]),
      )
    : {};
const bounded = (value, max) =>
  Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
export function profileOf(data = {}) {
  const xp = bounded(data?.xp, 10000000);
  const skin = FINISHES.find((f) => f.id === data?.skin && f.xp <= xp)?.id || "standard";
  return {
    version: 2,
    xp,
    skin,
    matches: bounded(data?.matches, 1000000),
    wins: bounded(data?.wins, 1000000),
    rounds: Array.isArray(data?.rounds)
      ? data.rounds.filter((v) => typeof v === "string").slice(-100)
      : [],
    weapons: Array.isArray(data?.weapons)
      ? [...new Set(data.weapons.filter((v) => typeof v === "string" && v.length < 24))].slice(
          0,
          11,
        )
      : [],
    challenges: {
      day: typeof data?.challenges?.day === "string" ? data.challenges.day.slice(0, 10) : "",
      daily: progressOf(data?.challenges?.daily),
      week: typeof data?.challenges?.week === "string" ? data.challenges.week.slice(0, 8) : "",
      weekly: progressOf(data?.challenges?.weekly),
    },
    record: Object.fromEntries(
      ["operator", "infiltrator"].map((role) => [
        role,
        {
          played: bounded(data?.record?.[role]?.played, 1000000),
          won: bounded(data?.record?.[role]?.won, 1000000),
        },
      ]),
    ),
    roles: Array.isArray(data?.roles)
      ? [...new Set(data.roles.filter((v) => v === "operator" || v === "infiltrator"))]
      : [],
    milestones: Array.isArray(data?.milestones)
      ? data.milestones.filter((v) =>
          ["first-three", "explorer", "supply-detail", "flight-ready", "lifeline"].includes(v),
        )
      : [],
    career: Object.fromEntries(
      [
        "supplies",
        "checks",
        "repairs",
        "patients",
        "recoveries",
        "defuses",
        "sabotage",
        "charges",
        "cover",
        "pilotSeconds",
      ].map((key) => [key, bounded(data?.career?.[key], 1000000)]),
    ),
  };
}
export function awardMatch(data, result) {
  const profile = profileOf(data);
  if (typeof result?.id !== "string" || !result.id || profile.rounds.includes(result.id))
    return { profile, xp: 0, bonuses: [], reason: "Reward already collected for this round." };
  if (result.practice || !Number.isFinite(result.seconds) || (!result.won && result.seconds < 15))
    return { profile, xp: 0, bonuses: [], reason: "Practice and short losses do not earn XP." };
  const before = profile.xp,
    bonuses = [];
  profile.matches++;
  if (result.won) profile.wins++;
  profile.rounds.push(String(result.id));
  profile.rounds = profile.rounds.slice(-100);
  if (!profile.weapons.includes(result.weapon)) profile.weapons.push(result.weapon);
  let xp =
    40 +
    Math.min(60, bounded(result.kills, 6) * 10) +
    Math.min(40, bounded(result.damage / 50, 40)) +
    Math.min(40, bounded(result.cores, 8) * 5) +
    (result.won ? 40 : 0);
  const mission = result.mode === "protocol";
  if (mission) {
    const c = contributionsOf(result.contributions);
    const work =
      result.role === "infiltrator"
        ? c.sabotage * 12 + c.charges * 24 + c.cover * 6
        : c.supplies * 6 +
          c.checks * 10 +
          c.repairs * 12 +
          c.defuses * 16 +
          c.patients * 24 +
          Math.floor(c.pilotSeconds / 10) * 4 +
          c.recoveries * 20;
    const teamRescue = result.role === "operator" ? bounded(result.rescued, 4) * 10 : 0;
    xp = 40 + (result.won ? 40 : 0) + Math.min(225, work) + teamRescue;
    for (const key of Object.keys(profile.career))
      profile.career[key] = Math.min(1000000, profile.career[key] + Math.floor(c[key]));
    if (["operator", "infiltrator"].includes(result.role) && !profile.roles.includes(result.role))
      profile.roles.push(result.role);
    if (["operator", "infiltrator"].includes(result.role)) {
      profile.record[result.role].played++;
      if (result.won) profile.record[result.role].won++;
    }
    // Daily and weekly challenges (progress resets with the calendar).
    const { day, week } = result.day && result.week ? result : calendarKeys();
    const ch = profile.challenges;
    if (ch.day !== day) Object.assign(ch, { day, daily: {} });
    if (ch.week !== week) Object.assign(ch, { week, weekly: {} });
    for (const [list, store, reward, label] of [
      [dailyChallenges(day), ch.daily, DAILY_XP, "Daily"],
      [[weeklyChallenge(week)], ch.weekly, WEEKLY_XP, "Weekly"],
    ])
      for (const c of list) {
        const before = store[c.id] || 0;
        if (before >= c.goal) continue;
        store[c.id] = Math.min(c.goal, before + Math.max(0, Math.floor(c.gain(result) || 0)));
        if (store[c.id] >= c.goal) {
          xp += reward;
          bonuses.push(`${label}: ${c.text} (+${reward} XP)`);
        }
      }
    if (work) bonuses.push("Mission contribution");
    if (teamRescue) bonuses.push("Team rescue");
  }
  for (const [id, complete, name] of [
    ["first-three", profile.matches >= 3, "Three rounds completed"],
    ["explorer", mission && profile.roles.length >= 2, "Played both sides"],
    ["supply-detail", mission && profile.career.supplies >= 13, "Medical supply detail"],
    ["flight-ready", mission && profile.career.checks >= 3, "Flight ready"],
    ["lifeline", mission && profile.career.patients >= 4, "Lifeline rescuer"],
  ]) {
    if (complete && !profile.milestones.includes(id)) {
      profile.milestones.push(id);
      xp += 50;
      bonuses.push(name);
    }
  }
  profile.xp = Math.min(10000000, before + xp);
  return { profile, xp: profile.xp - before, bonuses, reason: "" };
}
export const levelOf = (profile) => 1 + Math.floor(profile.xp / 150);
