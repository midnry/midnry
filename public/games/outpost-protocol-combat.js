/** Last Stand is a phase of Blackout, shared by offline and server matches.
 * Public vote identities define combat sides; secret allegiances never do.
 * Existing raycasting, ammunition, reload, damage and collision remain in use.
 */
import { Arena } from "./outpost-sim.js";
import { weaponOf } from "./outpost-content.js";
export const LAST_STAND = Object.freeze({ preparation: 5, duration: 90 });

export function canFight(arena, entity) {
  const c = arena.protocol.combat;
  return (
    arena.state === "playing" &&
    arena.protocol.phase === "combat" &&
    c &&
    arena.time >= c.startsAt &&
    c.participants.includes(entity?.id) &&
    arena.active(entity)
  );
}
export function opponents(arena, a, b) {
  const c = arena.protocol.combat;
  return (
    !!c &&
    a !== b &&
    c.participants.includes(a?.id) &&
    c.participants.includes(b?.id) &&
    (a.id === c.targetId) !== (b.id === c.targetId)
  );
}
export function beginCombat(arena, target) {
  const participants = arena.entities.filter((e) => arena.active(e));
  if (!arena.active(target) || participants.length < 2) return false;
  arena.protocol.phase = "combat";
  arena.protocol.combat = {
    id: `last-stand-${arena.protocol.nextId++}`,
    targetId: target.id,
    participants: participants.map((e) => e.id),
    startsAt: arena.time + LAST_STAND.preparation,
    endsAt: arena.time + LAST_STAND.preparation + LAST_STAND.duration,
    result: null,
    resultUntil: null,
  };
  for (const e of participants) {
    const player = arena.privateFor(e);
    arena.clearPilot(e);
    player.channel = null;
    player.botGoal = null;
    // Same weapon and damage for both sides; no role-dependent buffs or skins.
    e.weapon = "carbine";
    e.damage = 40;
    e.ammo = weaponOf("carbine").mag;
    e.reloadUntil = 0;
    e.burst = null;
    e.shotAt = -10;
    e.attack = arena.time;
    e.path = [];
    e.nextPath = 0;
  }
  arena.addLog(
    `Last Stand: ${target.name} faces ${participants.length - 1} remaining patrols. Allegiance remains classified.`,
  );
  return true;
}
function recordLoss(arena, entity, source = null) {
  arena.returnCargo(entity);
  arena.clearPilot(entity);
  entity.eliminatedAt = arena.time;
  arena.privateFor(entity).channel = null;
  arena.protocol.bodies.push({
    id: `body-${arena.protocol.nextId++}`,
    victimId: entity.id,
    name: entity.name,
    x: entity.x,
    y: entity.y,
    reported: true,
    carriedBy: null,
    killerId: source?.id || null,
  });
}
export function combatDamage(arena, target, amount, source) {
  if (!canFight(arena, source) || !canFight(arena, target) || !opponents(arena, source, target))
    return;
  Arena.prototype.damage.call(arena, target, amount, source);
  if (!arena.active(target)) recordLoss(arena, target, source);
}
export function resolveCombat(arena) {
  const c = arena.protocol.combat;
  if (arena.protocol.phase !== "combat" || !c) return false;
  const target = arena.entities.find((e) => e.id === c.targetId),
    crew = arena.entities.filter(
      (e) => c.participants.includes(e.id) && e.id !== c.targetId && arena.active(e),
    );
  if (arena.active(target) && crew.length && arena.time < c.endsAt) return false;
  const expired = arena.active(target) && crew.length > 0;
  if (expired) {
    Arena.prototype.damage.call(arena, target, target.hp);
    recordLoss(arena, target);
  }
  c.result = expired
    ? `${target.name}'s Last Stand timed out. The patrol resumes the rescue.`
    : arena.active(target)
      ? `${target.name} survived the Last Stand. The rescue continues.`
      : `The patrol defeated ${target?.name || "the accused"}. Allegiance remains classified.`;
  c.resultUntil = arena.time + 6;
  for (const e of arena.entities) {
    e.ammo = 0;
    e.damage = 0;
    e.reloadUntil = 0;
    e.burst = null;
    e.path = [];
    e.nextPath = 0;
    const p = arena.privateFor(e);
    p.channel = null;
    p.botGoal = null;
    p.botNextThink = 0;
  }
  arena.protocol.phase = "roam";
  arena.addLog(c.result);
  return true;
}

/** Bots choose opponents by the public vote, obey sight/walls and reload. */
function botFight(arena, e, dt) {
  const rivals = arena.entities
    .filter((t) => arena.active(t) && opponents(arena, e, t))
    .sort((a, b) => Math.hypot(e.x - a.x, e.y - a.y) - Math.hypot(e.x - b.x, e.y - b.y));
  const target = rivals[0];
  if (!target) return;
  const d = Math.hypot(target.x - e.x, target.y - e.y),
    sees = d <= arena.sightRange() && arena.visible(e, target);
  if (sees) {
    e.a = Math.atan2(target.y - e.y, target.x - e.x) + Math.sin(arena.time * 4 + e.phase) * 0.03;
    e.pitch = 0;
    if (d > 2.2) arena.move(e, Math.cos(e.a) * 1.7 * dt, Math.sin(e.a) * 1.7 * dt);
    if (arena.time >= e.attack) {
      e.attack = arena.time + 0.38;
      arena.shoot(e);
    }
  } else {
    if (!e.path?.length || arena.time >= e.nextPath) {
      e.path = arena.pathTo(e, target);
      e.nextPath = arena.time + 0.9;
    }
    const point = e.path[0];
    if (!point) return;
    const length = Math.hypot(point.x - e.x, point.y - e.y);
    if (length < 0.12) {
      e.path.shift();
      return;
    }
    e.a = Math.atan2(point.y - e.y, point.x - e.x);
    e.pitch = 0;
    const step = Math.min(2.2 * dt, length);
    arena.move(e, ((point.x - e.x) / length) * step, ((point.y - e.y) / length) * step);
  }
}
export function advanceCombat(arena, dt, inputs) {
  if (resolveCombat(arena)) return;
  for (const e of arena.entities) {
    if (!canFight(arena, e)) continue;
    if (e.reloadUntil && arena.time >= e.reloadUntil) {
      e.ammo = weaponOf(e.weapon).mag;
      e.reloadUntil = 0;
    }
    if (e.bot) {
      botFight(arena, e, dt);
      continue;
    }
    const input = inputs[e.id] || {};
    if (Number.isFinite(input.aim)) e.a = Math.atan2(Math.sin(input.aim), Math.cos(input.aim));
    if (Number.isFinite(input.pitch)) e.pitch = Math.max(-1, Math.min(1, input.pitch));
    const axis = (n) => (Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0);
    let f = axis(input.forward),
      s = axis(input.strafe),
      length = Math.max(1, Math.hypot(f, s));
    f /= length;
    s /= length;
    arena.move(
      e,
      (Math.cos(e.a) * f - Math.sin(e.a) * s) * 2.6 * dt,
      (Math.sin(e.a) * f + Math.cos(e.a) * s) * 2.6 * dt,
    );
    if (input.reload) arena.reload(e);
    if (input.fire) arena.shoot(e);
  }
  resolveCombat(arena);
}
