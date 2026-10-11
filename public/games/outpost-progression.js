/** Device-local cosmetic progression. No combat stats or account data. */
export const FINISHES = [
  { id: "standard", name: "Field Issue", xp: 0, color: null },
  { id: "copper", name: "Copper Signal", xp: 200, color: "#cb8750" },
  { id: "glacier", name: "Glacier Ink", xp: 600, color: "#72bbd0" },
  { id: "nightfall", name: "Nightfall", xp: 1200, color: "#a78bce" },
];
const bounded = (value, max) =>
  Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
export function profileOf(data = {}) {
  const xp = bounded(data?.xp, 10000000);
  const skin = FINISHES.find((f) => f.id === data?.skin && f.xp <= xp)?.id || "standard";
  return {
    version: 1,
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
    milestones: Array.isArray(data?.milestones)
      ? data.milestones.filter((v) => ["first-three", "explorer"].includes(v))
      : [],
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
  for (const [id, complete, name] of [
    ["first-three", profile.matches >= 3, "Three rounds completed"],
    ["explorer", profile.weapons.length >= 3, "Three loadouts explored"],
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
