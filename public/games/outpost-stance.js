/**
 * Stances for the combat modes (Last Signal): stand, crouch, lie prone, and
 * jump. Shared by the simulation, the server and the bots, so a stance means
 * the same thing everywhere:
 *  - Height: shots are checked against the target's height. The aim's
 *    vertical offset at the target's distance (pitch × distance, in tiles)
 *    must land within the target's window around its centre. Crouching and
 *    lying prone lower the centre and shrink the window; a jump lifts it.
 *    The shooter's own eye height moves the same way.
 *  - Speed: crouched 60%, prone a 30% crawl; neither sprints.
 *  - Being seen: bots notice a prone fighter only close by (6.5 tiles) and
 *    a crouched one within 11, unless they have just fired.
 *  - Jumping (0.55 s, about 0.75 m) clears low cover: sandbag barriers and
 *    canisters. Shots fired mid-air wander a little.
 * Units are tiles (one tile is 3 m in the 3D world).
 */
export const STANCE = Object.freeze({
  stand: { speed: 1, centre: 0, eye: 0, window: 0.48, spot: Infinity },
  crouch: { speed: 0.6, centre: -0.12, eye: -0.13, window: 0.38, spot: 11 },
  prone: { speed: 0.3, centre: -0.42, eye: -0.45, window: 0.22, spot: 6.5 },
});
export const JUMP = Object.freeze({ duration: 0.55, height: 0.25, cooldown: 0.35, wander: 0.06 });
/** Getting down takes a moment before a prone fighter can shoot. */
export const PRONE_SETTLE = 0.35;
/** Seconds after firing during which a low stance does not hide you. */
const GIVEAWAY = 2;

export const stanceOf = (e) => (STANCE[e?.stance] ? e.stance : "stand");
/** 0..1 through the current jump, or null on the ground. */
export function jumpPhase(e, time) {
  const t = (time - (e.jumpAt ?? -10)) / JUMP.duration;
  return t >= 0 && t < 1 ? t : null;
}
export const airborne = (e, time) => jumpPhase(e, time) !== null;
/** Height of the jump arc above the ground, in tiles. */
export function jumpLift(e, time) {
  const t = jumpPhase(e, time);
  return t === null ? 0 : 4 * JUMP.height * t * (1 - t);
}
/** Vertical centre of a fighter's body relative to a standing one. */
export const centreOf = (e, time) => STANCE[stanceOf(e)].centre + jumpLift(e, time);
/** Eye height relative to a standing fighter's. */
export const eyeOf = (e, time) => STANCE[stanceOf(e)].eye + jumpLift(e, time);
export const windowOf = (e) => STANCE[stanceOf(e)].window;
export const speedOf = (e) => STANCE[stanceOf(e)].speed;
/** How far away a bot can notice this fighter. */
export function spotRange(e, time) {
  if (time - (e.shotAt ?? -10) < GIVEAWAY) return Infinity;
  return STANCE[stanceOf(e)].spot;
}
/** Does a shot at `pitch` (tan of the vertical angle) hit `target` at
 * distance `d`? (Crates keep their own fixed window.) */
export function verticalHit(shooter, target, pitch, d, time) {
  const offset = (pitch || 0) * d - (centreOf(target, time) - eyeOf(shooter, time));
  return Math.abs(offset) <= windowOf(target);
}
/** The pitch that aims at a target's centre from a shooter's eye. */
export const pitchTo = (shooter, target, d, time) => (d > 0 ? (centreOf(target, time) - eyeOf(shooter, time)) / d : 0);

/** A player's stance request and jump press (validated here, for any client). */
export function applyStanceInput(e, input, time, moving) {
  let want = STANCE[input.stance] ? input.stance : stanceOf(e);
  // Sprinting stands you up; so does a jump from the ground.
  if (input.sprint && moving) want = "stand";
  const jump = !!input.jump && !e.jumpHeld;
  e.jumpHeld = !!input.jump;
  if (jump && !airborne(e, time) && time >= (e.jumpReadyAt ?? 0) && !(e.slideUntil > time)) {
    want = "stand";
    e.jumpAt = time;
    e.jumpReadyAt = time + JUMP.duration + JUMP.cooldown;
  }
  // No lying down mid-air.
  if (airborne(e, time) && want !== "stand") want = "stand";
  setStance(e, want, time);
}
export function setStance(e, stance, time) {
  if (stanceOf(e) === stance) return;
  e.stance = stance;
  e.stanceAt = time;
}
/** A prone fighter who just got down cannot fire yet. */
export const settling = (e, time) => stanceOf(e) === "prone" && time - (e.stanceAt ?? -10) < PRONE_SETTLE;
/** Low cover a jumping fighter can clear. */
export const lowCover = (c) => c?.kind === "barrier" || ["red", "green", "blue", "pink"].includes(c?.kind);

/**
 * Bots choose a stance like a sensible player:
 *  - prone when hurt and hidden in cover, or when holding a long rifle line;
 *  - crouched while trading shots at mid range or behind a barrier;
 *  - standing to move fast, chase, or escape the Red Haze.
 * (Bots also jump over a line of fire: see Arena.dodge.)
 */
export function botStance(a, bot, foe, { retreating, moving, outside, rifle }) {
  const t = a.time,
    d = foe ? Math.hypot(foe.x - bot.x, foe.y - bot.y) : Infinity,
    hurt = bot.hp / bot.maxHp < 0.45;
  let want = "stand";
  if (outside || (moving && !retreating && d > 4)) want = "stand";
  else if (retreating && !moving && hurt) want = foe && d < 4 ? "crouch" : "prone";
  else if (foe && rifle && d > 7 && !moving) want = "prone";
  else if (foe && d > 2.5 && d < 9) want = "crouch";
  else if (!foe && !moving && hurt) want = "prone";
  // Commit for a moment so bots do not flicker between stances.
  if (want !== stanceOf(bot) && t - (bot.stanceAt ?? -10) > 1.2) setStance(bot, want, t);
}
