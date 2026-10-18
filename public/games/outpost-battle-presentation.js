/** Public vote identities only: preparation must never reveal secret roles. */
export function battlePreparation(view, selfId) {
  const c = view?.protocol?.combat;
  if (view?.state !== "playing" || view.protocol.phase !== "combat" || !c || view.time >= c.startsAt)
    return null;
  const living = view.entities.filter(e => c.participants.includes(e.id) && e.hp > 0 && !e.departed);
  const self = living.find(e => e.id === selfId), target = living.find(e => e.id === c.targetId);
  const patrols = living.filter(e => e.id !== c.targetId);
  if (!self || !target || !patrols.length) return null;
  return {
    id: c.id, target, patrol: patrols.find(e => e.id === selfId) || patrols[0],
    count: patrols.length, remaining: Math.max(0, c.startsAt - view.time),
    elapsed: Math.max(0, 5 - (c.startsAt - view.time)),
  };
}

/** Only a fresh authoritative acknowledgement can trigger a success notice. */
export function eliminationConfirmation(view) {
  const self = view?.protocol?.self, result = self?.lastElimination;
  if (self?.role !== "infiltrator" || !result || !Number.isSafeInteger(result.sequence) ||
    result.sequence < 1 || !Number.isFinite(result.at) || view.time < result.at || view.time - result.at > 4)
    return null;
  return result;
}
