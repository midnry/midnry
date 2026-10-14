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
