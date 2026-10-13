/** Shared cosmetic descriptions. These never alter damage, roles or positions. */
export const TAKEDOWNS = Object.freeze([
  { id: "back-stab", name: "Back stab", duration: 1900 },
  { id: "suppressed-shot", name: "Suppressed shot", duration: 1550 },
  { id: "back-breaker", name: "Back breaker", duration: 2100 },
  { id: "neck-breaker", name: "Neck breaker", duration: 1750 },
  { id: "suffocation", name: "Suffocation", duration: 2450 },
]);

/** Called by the authoritative simulation ONLY after a real fatal attack. */
export function recordVictimTakedown(arena, victim, source) {
  if (!source || victim.hp > 0 || arena.presentationOnly) return;
  const player = arena.privateFor(victim);
  player.deathScene = {
    id: `${arena.roundId}:${victim.id}:${victim.damageSeq || 0}`,
    kind: TAKEDOWNS[Math.min(4, Math.floor(arena.random() * 5))].id,
    at: arena.time,
  };
  // No killer ID, name, role, position or private camera is transmitted.
}

export function deathTiming(event, reducedMotion = false) {
  const description = TAKEDOWNS.find((item) => item.id === event?.kind);
  const takedown = description ? (reducedMotion ? 700 : description.duration) : 0;
  const fall = reducedMotion ? 350 : 1200;
  return { kind: description?.id || null, takedown, fall, total: takedown + fall };
}

export function deathFrame(sequence, now) {
  const elapsed = Math.max(0, now - sequence.at);
  return {
    stage: elapsed < sequence.takedownDuration ? "takedown" : "fall",
    takedown: sequence.takedownDuration ? Math.min(1, elapsed / sequence.takedownDuration) : 1,
    fall: Math.max(0, Math.min(1, (elapsed - sequence.takedownDuration) / sequence.fallDuration)),
    done: elapsed >= sequence.duration,
  };
}
