/** Private, round-scoped contribution ledger. Only validated world changes call
 * recordContribution; client packets cannot submit totals or unlock rewards. */
export const CONTRIBUTION_CAPS = Object.freeze({
  supplies: 13,
  checks: 6,
  repairs: 8,
  patients: 4,
  pilotSeconds: 120,
  recoveries: 3,
  defuses: 6,
  sabotage: 8,
  charges: 3,
  cover: 6,
  remote: 5,
});
export function contributionsOf(data) {
  return Object.fromEntries(
    Object.entries(CONTRIBUTION_CAPS).map(([key, max]) => [
      key,
      Number.isFinite(data?.[key]) ? Math.max(0, Math.min(max, data[key])) : 0,
    ]),
  );
}
export function recordContribution(player, kind, event, amount = 1) {
  if (!player || !Object.hasOwn(CONTRIBUTION_CAPS, kind) || !Number.isFinite(amount) || amount <= 0)
    return;
  player.contributions = contributionsOf(player.contributions);
  player.contributionEvents ||= [];
  const key = event == null ? null : `${kind}:${event}`;
  if (key && player.contributionEvents.includes(key)) return;
  if (key) player.contributionEvents.push(key);
  player.contributions[kind] = Math.min(
    CONTRIBUTION_CAPS[kind],
    player.contributions[kind] + amount,
  );
}
