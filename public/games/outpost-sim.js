/** Shared, DOM-free simulation for offline games and authoritative online rooms. */
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
import { ADS, applyStanceInput, canAim, airborne, botStance, jumpPhase, JUMP, lowCover, pitchTo, setStance, settling, speedOf, spotRange, stanceOf, verticalHit } from "./outpost-stance.js";
import { LEVEL, MAPS, WEAPONS, mapOf, weaponOf, OUTFITS, outfitOf } from "./outpost-content.js";
// Health recovery: starts this many seconds after the last damage taken,
// then restores this fraction of maximum health per second.
export const REGEN_DELAY = 5;
export const REGEN_RATE = 0.12;
// Last Signal pacing (measured in simulation: rounds ~23s -> ~1 min).
// A start shield, three lives each, 60% weapon damage and bots that back off
// to heal keep 8 fighters from ending a round in seconds.
export const SIGNAL = Object.freeze({
  shield: 8,
  lives: 3,
  damage: 0.6,
  retreatAt: 0.45,
  respawnShield: 3,
  // Last life: an adrenaline rush on redeploy (faster movement and reloads
  // for `rush` seconds), then harder hits and earlier health recovery.
  rush: 6,
  rushReload: 0.6,
  lastStand: 1.15,
  lastRegenDelay: 3,
});
/** Canal water (Calder Quay): swimming, diving through culverts and
 * electrified water. Lightning that strikes water, or a fighter still
 * crackling from a strike who touches it, electrifies every connected
 * water (culverts link them) for `shock` seconds; anyone in the water takes
 * `perSecond` damage. Diving takes `dive` seconds, out of sight and out of
 * reach of shots, and surfaces at the culvert's other mouth. */
export const WATER = Object.freeze({ shock: 3, perSecond: 14, dive: 1.5, mouth: 0.85 });
/** How far (tiles) bots can spot a rival when fog limits what a player can
 * see. Must not exceed the player's own view through the renderer's fog
 * (fogVisibility in scripts/outpost-military/telemetry.js, checked by
 * scripts/outpost-visibility.test.mjs): Red Haze fog ≈ 5.2 tiles, a sandstorm
 * at full gust ≈ 3.6 tiles. */
export const SIGHT = Object.freeze({ haze: 5, sandstorm: 3.5 });
export { LEVEL, MAPS, WEAPONS, mapOf, weaponOf, OUTFITS, outfitOf };
import {
  TERRAIN,
  CANISTERS,
  placeHazards,
  scheduleDisaster,
  burstCanister,
  updateDisaster,
  disasterActive,
  floodLevel,
  floodDistance,
  SURGE,
} from "./outpost-hazards.js";
const SPAWNS = [
  [2.5, 2.5],
  [8.5, 2.5],
  [13.5, 2.5],
  [13.5, 8.5],
  [13.5, 13.5],
  [8.5, 13.5],
  [2.5, 13.5],
  [2.5, 8.5],
];
const TEAM_SPAWNS = [
  [2.5, 2.5],
  [13.5, 2.5],
  [13.5, 13.5],
  [2.5, 13.5],
];
export const DIFFICULTIES = {
  easy: { speed: 0.7, reaction: 1.5, aim: 0.13, awareness: 5, dodge: 0.2 },
  normal: { speed: 1, reaction: 1, aim: 0, awareness: 7, dodge: 0.45 },
  hard: { speed: 1.25, reaction: 0.8, aim: 0, awareness: 9, dodge: 0.7 },
};
// Half-width of a crate-like object's solid square, in tiles, matching its
// model: supply crates, slim canisters, sandbag walls and foam.
const footprint = (c) => (CANISTERS[c.kind] ? 0.14 : c.kind ? 0.42 : 0.32);
export const difficultyOf = (id) => (Object.hasOwn(DIFFICULTIES, id) ? id : "normal");
export class Arena {
  constructor({
    mode = "training",
    mapId = "outpost",
    weapon = "carbine",
    outfit = "ranger",
    humans = [{ id: "player", team: 0 }],
    random = Math.random,
    difficulty = "normal",
    countdown = 0,
  } = {}) {
    this.mode = mode;
    this.difficulty = difficultyOf(difficulty);
    this.countdown = clamp(Number(countdown) || 0, 0, 3);
    this.roundId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    this.mapId = mapOf(mapId).id;
    this.projectiles = [];
    this.fields = [];
    this.fx = [];
    this.nextEffect = 0;
    this.time = 0;
    this.state = "playing";
    this.winner = null;
    this.events = [];
    const map = mapOf(this.mapId),
      classic = mode === "training" && !!map.trainingLevel;
    this.level = (classic ? map.trainingLevel : map.level).map((row) => [...row]);
    const size = this.level.length,
      center = size / 2;
    this.zone = {
      half: center - 1,
      initialHalf: center - 1,
      cx: center,
      cy: center,
      delay: 12,
      duration: 150,
      minHalf: 0.6,
    };
    if (mode !== "training")
      for (let y = center - 1; y <= center; y++)
        for (let x = center - 1; x <= center; x++) this.level[y][x] = 0;
    const spawns = classic
        ? SPAWNS
        : [
            [2.5, 2.5],
            [center, 1.5],
            [size - 2.5, 2.5],
            [size - 1.5, center],
            [size - 2.5, size - 2.5],
            [center, size - 1.5],
            [2.5, size - 2.5],
            [1.5, center],
          ];
    const teamSpawns = classic ? TEAM_SPAWNS : [spawns[0], spawns[2], spawns[4], spawns[6]];
    const points = spawns.map((p) => [...p]);
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }
    this.entities = [];
    this.crates = [];
    this.cores = [];
    const shuffled = (items) => {
      const pool = [...items];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    };
    const botWeapons = shuffled(Object.keys(WEAPONS)),
      botOutfits = shuffled(Object.keys(OUTFITS));
    let botIndex = 0;
    const seats = mode === "training" ? 7 : 8;
    const teamCounts = [0, 0, 0, 0];
    for (let i = 0; i < seats; i++) {
      const human = humans[i];
      const team = mode === "duo" ? (human?.team ?? teamCounts.findIndex((n) => n < 2)) : i;
      if (mode === "duo") teamCounts[team]++;
      const slot = mode === "duo" ? teamCounts[team] - 1 : 0;
      let [x, y] = mode === "duo" ? teamSpawns[team] : points[i];
      if (mode === "duo") x += slot * 0.8;
      if (classic) {
        const training = [
          [3.5, 13.5],
          [11.5, 12.5],
          [7.5, 11.5],
          [12.5, 7.5],
          [5.5, 5.5],
          [9.5, 2.5],
          [2.5, 2.5],
        ];
        [x, y] = training[i];
      }
      const loadout = weaponOf(human?.weapon ?? (human ? weapon : botWeapons[botIndex])).id;
      const uniform = outfitOf(human?.outfit ?? (human ? outfit : botOutfits[botIndex])).id;
      if (!human) botIndex++;
      this.entities.push({
        id: human?.id ?? "bot" + i,
        name: human?.name ?? "Sentry " + i,
        team,
        bot: !human,
        x,
        y,
        a: mode === "training" ? -0.18 : Math.atan2(center - y, center - x),
        pitch: 0,
        weapon: loadout,
        outfit: uniform,
        // Locker character (online Last Signal); looks only.
        ...(human?.character ? { character: String(human.character) } : {}),
        charge: 0,
        cloakedUntil: 0,
        speedUntil: 0,
        poisonUntil: 0,
        poisonTick: 0,
        poisonSource: null,
        poisonDamage: 0,
        slowUntil: 0,
        sprinting: false,
        stance: "stand",
        stanceAt: 0,
        jumpAt: -10,
        slideUntil: 0,
        slideCooldown: 0,
        slideHeld: false,
        slideDx: 0,
        slideDy: 0,
        damageSeq: 0,
        damageTotal: 0,
        damageAngle: null,
        // Where recent damage came from, for the HUD's direction arcs: the
        // last few hits as {x, y, at, seq}; x/y are null for haze, water and
        // other hazards with no attacker. Presentation only; no rule reads it.
        damageFrom: [],
        hitSeq: 0,
        hitDamage: 0,
        hitTotal: 0,
        hitAt: -10,
        burst: null,
        hp: mode === "training" && !human ? 120 : 100,
        maxHp: mode === "training" && !human ? 120 : 100,
        damage: human ? 40 : 16,
        cores: 0,
        exposure: 0,
        hit: -10,
        shotAt: -10,
        ammo: weaponOf(loadout).mag,
        reloadUntil: 0,
        notice: "",
        noticeId: 0,
        kills: 0,
        damageDealt: 0,
        coresCollected: 0,
        placement: 0,
        eliminatedAt: null,
        respawns: mode === "duo" ? 2 : 0,
        lives: mode === "signal" ? SIGNAL.lives - 1 : 0,
        shieldUntil: mode === "signal" ? SIGNAL.shield : 0,
        respawnAt: 0,
        phase: i * 1.3,
        attack: 1 + i * 0.2,
        nextPath: 0,
        path: [],
        departed: false,
      });
    }
    if (mode !== "training")
      this.crates = (
        map.crates ?? [
          [4.5, 2.5],
          [11.5, 2.5],
          [5.5, 5.5],
          [10.5, 5.5],
          [2.5, 6.5],
          [13.5, 6.5],
          [4.5, 9.5],
          [11.5, 9.5],
          [5.5, 12.5],
          [10.5, 12.5],
          [7.5, 6.5],
          [8.5, 9.5],
        ]
      )
        .map(([x, y]) =>
          map.crates ? [x, y] : [Math.floor((x * size) / 16) + 0.5, Math.floor((y * size) / 16) + 0.5],
        )
        .filter(
          ([x, y]) =>
            !this.wall(x, y) && !this.entities.some((e) => Math.hypot(e.x - x, e.y - y) < 1),
        )
        .map(([x, y], i) => ({ id: "crate" + i, x, y, hp: 80, maxHp: 80, hit: -10 }));
    // Last Signal and Pair Ops: shootable canisters and sandbag barriers;
    // Last Signal also gets one natural disaster per round.
    this.disaster = null;
    this.terrain = null;
    if (mode === "signal" || mode === "duo") {
      // Lasting ground damage: rubble, quake cracks, scorch marks, sand drifts.
      this.terrain = [];
      this.crates.push(...placeHazards(this.level, this.mapId, spawns, this.crates));
      if (mode === "signal") this.disaster = scheduleDisaster(this.mapId, random);
    }
    if (!classic)
      for (const e of this.entities) {
        const point = this.pathTo(e, { x: this.zone.cx, y: this.zone.cy })[0];
        if (point) e.a = Math.atan2(point.y - e.y, point.x - e.x);
      }
  }
  static restore(data) {
    const arena = Object.create(Arena.prototype);
    Object.assign(arena, data);
    arena.events = [];
    // Old rooms remain readable during a rolling deployment.
    arena.mapId ??= "outpost";
    arena.projectiles ??= [];
    arena.fields ??= [];
    arena.fx ??= [];
    arena.nextEffect ??= 0;
    arena.difficulty = difficultyOf(arena.difficulty);
    arena.countdown ??= 0;
    arena.roundId ??= `legacy-${arena.mapId}-${arena.entities.map((e) => e.id).join("-")}-${arena.time}`;
    arena.disaster ??= null;
    arena.terrain ??= null;
    arena.zone.cx ??= arena.level.length / 2;
    arena.zone.cy ??= arena.level.length / 2;
    arena.zone.initialHalf ??= arena.level.length / 2 - 1;
    for (const e of arena.entities) {
      e.weapon ??= "carbine";
      e.damageDealt ??= 0;
      e.coresCollected ??= e.cores || 0;
      e.placement ??= 0;
      e.eliminatedAt ??= null;
      e.charge ??= 0;
      e.outfit = outfitOf(e.outfit).id;
      e.damageSeq ??= 0;
      e.damageTotal ??= 0;
      e.hitSeq ??= 0;
      e.hitAt ??= -10;
    }

    return arena;
  }
  snapshot() {
    return {
      mode: this.mode,
      difficulty: this.difficulty,
      countdown: this.countdown,
      roundId: this.roundId,
      mapId: this.mapId,
      projectiles: this.projectiles,
      fields: this.fields,
      fx: this.fx,
      nextEffect: this.nextEffect,
      time: this.time,
      state: this.state,
      winner: this.winner,
      zone: this.zone,
      level: this.level,
      entities: this.entities,
      crates: this.crates,
      cores: this.cores,
      disaster: this.disaster,
      terrain: this.terrain,
      waterShockUntil: this.waterShockUntil || 0,
    };
  }
  emit(id, text) {
    const entity = this.entities.find((e) => e.id === id);
    if (entity) {
      entity.notice = text;
      entity.noticeId++;
    }
    this.events.push({ id, text });
    if (this.events.length > 16) this.events.shift();
  }
  combatants() {
    return this.entities;
  }
  outsideSafe(e) {
    return (
      Math.abs(e.x - this.zone.cx) > this.zone.half || Math.abs(e.y - this.zone.cy) > this.zone.half
    );
  }
  updateZone() {
    this.zone.half =
      this.zone.initialHalf -
      (this.zone.initialHalf - this.zone.minHalf) *
        clamp((this.time - this.zone.delay) / this.zone.duration, 0, 1);
  }
  wall(x, y) {
    return this.level[Math.floor(y)]?.[Math.floor(x)] ?? 1;
  }
  cast(x, y, dx, dy, max = 32) {
    let mx = Math.floor(x),
      my = Math.floor(y),
      side = 0;
    const ddx = Math.abs(1 / (dx || 1e-12)),
      ddy = Math.abs(1 / (dy || 1e-12)),
      sx = dx < 0 ? -1 : 1,
      sy = dy < 0 ? -1 : 1;
    let tx = (dx < 0 ? x - mx : mx + 1 - x) * ddx,
      ty = (dy < 0 ? y - my : my + 1 - y) * ddy,
      distance = 0;
    for (let i = 0; i < 128; i++) {
      if (tx < ty) {
        mx += sx;
        distance = tx;
        tx += ddx;
        side = 0;
      } else {
        my += sy;
        distance = ty;
        ty += ddy;
        side = 1;
      }
      const type = this.level[my]?.[mx] ?? 1;
      // Water (a map's `seeThrough` tiles) stops feet, not sight or shots.
      if ((type && !this.seeThrough(type)) || distance > max) {
        const u = side ? x + dx * distance : y + dy * distance;
        return { distance, type, side, u: u - Math.floor(u), mx, my };
      }
    }
    return { distance: max, type: 1, side: 0, u: 0, mx, my };
  }
  /** Tile types you can see and shoot across but not walk on (canal water). */
  seeThrough(type) {
    // Cached per map: cast() asks this for every wall a ray meets.
    if (this.seeThroughMap !== this.mapId || !this.seeThroughTypes) {
      this.seeThroughMap = this.mapId;
      this.seeThroughTypes = mapOf(this.mapId).seeThrough || [];
    }
    return this.seeThroughTypes.length > 0 && this.seeThroughTypes.includes(type);
  }
  /** Solid for movement? Water is solid unless `swim` (players may swim). */
  blocks(x, y, swim = false) {
    const type = this.wall(x, y);
    return !!type && !(swim && this.seeThrough(type));
  }
  /** Is this fighter in the water (its centre over a water tile)? */
  inWater(e) {
    const type = this.level[Math.floor(e.y)]?.[Math.floor(e.x)];
    return !!type && this.seeThrough(type);
  }
  canMove(x, y, r = 0.2, over = false, swim = false) {
    return (
      !this.blocks(x - r, y - r, swim) &&
      !this.blocks(x + r, y - r, swim) &&
      !this.blocks(x - r, y + r, swim) &&
      !this.blocks(x + r, y + r, swim) &&
      !this.crates.some(
        (c) =>
          c.hp > 0 &&
          !(over && lowCover(c)) &&
          Math.abs(x - c.x) < r + footprint(c) &&
          Math.abs(y - c.y) < r + footprint(c),
      )
    );
  }
  move(e, dx, dy) {
    if (e.diveUntil > this.time) return;
    // Last Signal players may swim; bots keep to the streets and bridges.
    // Blackout Protocol has no swimming: water is a wall to everyone there.
    const swim = !e.bot && this.mode !== "protocol";
    // A jump clears low cover; landing on it, you can still step off.
    const over = airborne(e, this.time) || !this.canMove(e.x, e.y, 0.2, false, swim);
    if (this.canMove(e.x + dx, e.y, 0.2, over, swim)) e.x += dx;
    if (this.canMove(e.x, e.y + dy, 0.2, over, swim)) e.y += dy;
  }
  /** Swim stance in water, standing again on the quay; dives through
   * culverts; the electrified-water rule. Runs every step for everyone. */
  updateWater(dt) {
    const map = mapOf(this.mapId);
    if (!map.seeThrough) return;
    for (const e of this.entities) {
      if (e.hp <= 0) continue;
      if (e.diveUntil && this.time >= e.diveUntil) {
        Object.assign(e, { x: e.diveTo.x, y: e.diveTo.y, diveUntil: 0, diveTo: null });
        this.effect(e.x, e.y, "splash", 0.8, 0.6);
      }
      const wet = this.inWater(e);
      if (wet && stanceOf(e) !== "swim") {
        setStance(e, "swim", this.time);
        Object.assign(e, { ads: false, sprinting: false, slideUntil: 0, jumpAt: -10 });
        this.effect(e.x, e.y, "splash", 0.7, 0.5);
      } else if (!wet && stanceOf(e) === "swim") setStance(e, "stand", this.time);
      // A fighter still crackling from a lightning strike electrifies the water
      // (floodwater too).
      if (this.wet(e) && e.shockUntil > this.time && e.shockFrom !== "water") this.electrifyWater(e.x, e.y);
    }
    if (!(this.waterShockUntil > this.time)) return;
    for (const e of this.entities)
      if (e.hp > 0 && this.wet(e)) {
        this.damage(e, WATER.perSecond * dt, null);
        if (e.hp > 0 && !(e.shockUntil > this.time)) Object.assign(e, { shockUntil: this.time + 1, shockFrom: "water" });
      }
  }
  electrifyWater(x, y) {
    if (!(this.waterShockUntil > this.time)) this.effect(x, y, "electric-water", 2, WATER.shock);
    this.waterShockUntil = this.time + WATER.shock;
  }
  /** A swimmer at a culvert mouth dives through to its other end. */
  dive(e) {
    if (stanceOf(e) !== "swim" || e.diveUntil > this.time) return false;
    for (const [ax, ay, bx, by] of mapOf(this.mapId).culverts || [])
      for (const [from, to] of [
        [[ax, ay], [bx, by]],
        [[bx, by], [ax, ay]],
      ])
        if (Math.hypot(e.x - (from[0] + 0.5), e.y - (from[1] + 0.5)) < WATER.mouth) {
          e.diveUntil = this.time + WATER.dive;
          e.diveTo = { x: to[0] + 0.5, y: to[1] + 0.5 };
          this.effect(e.x, e.y, "splash", 0.9, 0.6);
          return true;
        }
    return false;
  }
  /** Near a culvert mouth (for the HUD's Dive prompt). */
  atCulvert(e) {
    return (
      stanceOf(e) === "swim" &&
      (mapOf(this.mapId).culverts || []).some(([ax, ay, bx, by]) =>
        [[ax, ay], [bx, by]].some(([x, y]) => Math.hypot(e.x - (x + 0.5), e.y - (y + 0.5)) < WATER.mouth),
      )
    );
  }
  rayTarget(origin, dx, dy, targets) {
    let nearest = this.cast(origin.x, origin.y, dx, dy).distance,
      target = null;
    for (const e of targets) {
      if (e.hp <= 0 || e === origin) continue;
      const ex = e.x - origin.x,
        ey = e.y - origin.y,
        along = ex * dx + ey * dy,
        across = Math.abs(ex * dy - ey * dx),
        radius = e.id.startsWith("crate") ? footprint(e) + 0.06 : 0.3;
      if (along <= 0 || across >= radius) continue;
      const entry = along - Math.sqrt(radius * radius - across * across);
      if (entry < nearest) {
        target = e;
        nearest = entry;
      }
    }
    return target;
  }
  /** Can `bot` spot rival `e`? Never further than a player could see in the
   * same conditions: awareness by difficulty, the rival's stance, fog (a
   * sandstorm, or either of them inside the Red Haze), and a clear line past
   * walls and crates. */
  spots(bot, e, awareness = DIFFICULTIES[difficultyOf(this.difficulty)].awareness) {
    let range = Math.min(awareness, spotRange(e, this.time));
    if (disasterActive(this, "sandstorm")) range = Math.min(range, SIGHT.sandstorm);
    if (this.mode === "signal" && this.time > this.zone.delay && (this.outsideSafe(bot) || this.outsideSafe(e)))
      range = Math.min(range, SIGHT.haze);
    return Math.hypot(e.x - bot.x, e.y - bot.y) < range && this.visible(bot, e);
  }
  visible(a, b) {
    // A diver is under the water, out of sight.
    if (b.diveUntil > this.time || a.diveUntil > this.time) return false;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy);
    if (d < 0.01) return true;
    if (this.cast(a.x, a.y, dx / d, dy / d).distance < d - 0.2) return false;
    const hit = this.rayTarget(
      a,
      dx / d,
      dy / d,
      this.crates.filter((c) => c !== b),
    );
    return !hit || Math.hypot(hit.x - a.x, hit.y - a.y) > d - 0.4;
  }
  damage(target, amount, source = null) {
    if (target.hp <= 0 || !Number.isFinite(amount) || amount <= 0) return;
    // Underwater in a culvert: no weapon reaches a diver (electricity still does).
    if (source && target.diveUntil > this.time) return;
    if (this.mode === "duo" && source && source !== target && source.team === target.team) return;
    if (this.mode === "signal" && !target.id.startsWith("crate")) {
      if (target.shieldUntil > this.time) return;
      if (source && source !== target)
        amount *= SIGNAL.damage * (source.lives === 0 ? SIGNAL.lastStand : 1);
    }
    const actual = Math.min(target.hp, amount);
    target.hp = Math.max(0, target.hp - amount);
    if (!target.id.startsWith("crate")) {
      target.damageSeq = (target.damageSeq || 0) + 1;
      target.damageTotal = (target.damageTotal || 0) + actual;
      target.damageAngle = source ? Math.atan2(source.y - target.y, source.x - target.x) : null;
      // Remember each hit's origin (not only the last one, so two attackers
      // in one tick both show on the HUD). Capped so snapshots stay small.
      // Self-inflicted damage (own field, own blast) has no direction either.
      const own = !source || source === target;
      (target.damageFrom ||= []).push({
        x: own ? null : source.x,
        y: own ? null : source.y,
        at: this.time,
        seq: target.damageSeq,
      });
      if (target.damageFrom.length > 6) target.damageFrom.splice(0, target.damageFrom.length - 6);
      target.cloakedUntil = 0;
      target.hurtAt = this.time;
    }
    if (source && source !== target) {
      if (!target.id.startsWith("crate")) source.damageDealt = (source.damageDealt || 0) + actual;
      source.charge = clamp(
        (source.charge || 0) + actual * (target.id.startsWith("crate") ? 0.2 : 0.6),
        0,
        100,
      );
      source.hitSeq = (source.hitSeq || 0) + 1;
      source.hitDamage = actual;
      source.hitTotal = (source.hitTotal || 0) + actual;
      source.hitAt = this.time;
    }

    target.hit = this.time;
    if (target.hp > 0) return;
    if (target.id.startsWith("crate")) {
      if (target.kind) {
        if (CANISTERS[target.kind]) burstCanister(this, target, source);
        else this.effect(target.x, target.y, "debris", 0.8, 0.6);
        return;
      }
      this.cores.push({ x: target.x, y: target.y });
      if (source) this.emit(source.id, "SUPPLY CRATE OPEN / COLLECT THE CORE");
      return;
    }
    if (source && source !== target) {
      source.kills++;
      // Who went down, for the attacker's kill confirmation on the HUD. In
      // Last Signal a victim with lives left is only downed, not eliminated.
      source.lastKill = {
        seq: source.kills,
        name: target.name || "Rival",
        down: this.mode === "signal" && target.lives > 0 && !target.departed,
        at: this.time,
      };
      this.emit(source.id, "RIVAL ELIMINATED");
    }
    if (this.mode !== "training")
      for (let i = 0; i < target.cores; i++) this.cores.push({ x: target.x, y: target.y });
    target.cores = 0;
    target.maxHp = 100;
    target.damage = target.bot ? 16 : 40;
    target.exposure = 0;
    target.reloadUntil = 0;
    target.burst = null;
    target.charge = 0;
    target.poisonUntil = 0;
    target.cloakedUntil = 0;
    target.speedUntil = 0;
    target.slowUntil = 0;
    // Last Signal: a spare life redeploys you somewhere quiet, upgrades dropped.
    if (this.mode === "signal" && target.lives > 0 && !target.departed) {
      target.lives--;
      // Who took the life, for the "Life lost" screen (none: haze, disaster).
      target.downedBy = source && source !== target ? source.name : null;
      this.redeploy(target);
      if (target.lives) this.emit(target.id, "LIFE LOST / REDEPLOYED");
      else {
        target.speedUntil = target.adrenalineUntil = this.time + SIGNAL.rush;
        this.emit(target.id, "LAST LIFE / ADRENALINE RUSH");
      }
      return;
    }
    // Reserve a respawn only while a living teammate can keep this team in play.
    if (
      this.mode === "duo" &&
      target.respawns > 0 &&
      !target.departed &&
      this.entities.some((e) => e !== target && e.team === target.team && e.hp > 0)
    ) {
      target.respawns--;
      target.respawnAt = this.time + 8;
      this.emit(target.id, "TEAMMATE HOLDING / REDEPLOY IN 8s");
    } else target.respawnAt = 0;
  }
  collectCores(e) {
    if (e.hp <= 0) return;
    for (let i = this.cores.length - 1; i >= 0; i--) {
      const core = this.cores[i];
      if (Math.hypot(core.x - e.x, core.y - e.y) < 0.65 && this.visible(e, core)) {
        this.cores.splice(i, 1);
        e.cores++;
        e.coresCollected = (e.coresCollected || 0) + 1;
        e.maxHp += 25;
        this.heal(e, 25);
        e.damage += 8;
        this.emit(e.id, "+1 CHARGE CORE / HEALTH +25 · DAMAGE +8");
      }
    }
  }
  /** Movement multiplier from the weather: sandstorms slow everyone. */
  weather(e) {
    return (
      (disasterActive(this, "sandstorm") ? 0.85 : 1) *
      (e ? this.footing(e) : 1) *
      // Wading through a storm surge's floodwater.
      (e && this.floodedAt(e.x, e.y) ? SURGE.wade : 1)
    );
  }
  /** Is this floor tile under a storm surge's floodwater right now? */
  floodedAt(x, y) {
    const level = floodLevel(this);
    if (!level) return false;
    if (this.floodFor !== this.mapId || !this.floodMap) {
      this.floodFor = this.mapId;
      this.floodMap = floodDistance(mapOf(this.mapId).level, (t) => this.seeThrough(t));
    }
    const d = this.floodMap[Math.floor(y)]?.[Math.floor(x)];
    return d > 0 && d <= level + 0.001;
  }
  /** In the water: swimming, or wading in floodwater. */
  wet(e) {
    return this.inWater(e) || this.floodedAt(e.x, e.y);
  }
  /** Last Signal bots under fire sometimes slide sideways out of the line of
   * fire, like a player would (same slide speed, longer cooldown). */
  dodge(bot, skill) {
    if (bot.damageSeq === bot.dodgeSeen) return;
    bot.dodgeSeen = bot.damageSeq;
    if (bot.damageAngle == null || this.time < (bot.slideCooldown || 0) || bot.hp <= 0) return;
    const roll = (n) => {
      const v = Math.sin(bot.damageSeq * 12.9898 + bot.phase * 78.233 + n) * 43758.5453;
      return v - Math.floor(v);
    };
    if (roll(0) >= skill.dodge) return;
    // Sometimes a jump over the line of fire instead of a slide.
    if (roll(2) < 0.3 && stanceOf(bot) === "stand" && this.time >= (bot.jumpReadyAt ?? 0)) {
      bot.jumpAt = this.time;
      bot.jumpReadyAt = this.time + JUMP.duration + JUMP.cooldown;
      return;
    }
    const side = roll(1) < 0.5 ? 1 : -1;
    for (const s of [side, -side]) {
      const a = bot.damageAngle + (s * Math.PI) / 2,
        dx = Math.cos(a),
        dy = Math.sin(a);
      if (!this.canMove(bot.x + dx * 1.2, bot.y + dy * 1.2, 0.3)) continue;
      bot.slideUntil = this.time + 0.65;
      bot.slideCooldown = this.time + 2.4;
      bot.slideDx = dx;
      bot.slideDy = dy;
      return;
    }
  }
  /** A nearby open, safe tile no nearby rival can see, for a hurt bot to heal
   * behind. Kept while it stays hidden; searched again at most every second. */
  coverFrom(bot, threat, threats = [threat]) {
    const c = bot.cover,
      hidden = (p) => !threats.some((t) => this.visible(t, p));
    if (c && !c.none && !this.outsideSafe(c) && hidden(c)) return c;
    if (c && this.time < c.searched + 1) return null;
    bot.cover = null;
    let best = null,
      bestScore = Infinity;
    const bx = Math.floor(bot.x),
      by = Math.floor(bot.y),
      away = Math.hypot(bot.x - threat.x, bot.y - threat.y);
    for (let y = by - 6; y <= by + 6; y++)
      for (let x = bx - 6; x <= bx + 6; x++) {
        const p = { x: x + 0.5, y: y + 0.5 },
          d = Math.hypot(p.x - bot.x, p.y - bot.y);
        if (d > 6 || d + 4 >= bestScore || !this.canMove(p.x, p.y, 0.3) || this.outsideSafe(p))
          continue;
        // Prefer close cover that does not mean running past the threat.
        const score = d + 4 * Math.max(0, away - Math.hypot(p.x - threat.x, p.y - threat.y));
        if (score < bestScore && hidden(p)) (best = p), (bestScore = score);
      }
    bot.cover = { ...(best || { x: bot.x, y: bot.y, none: true }), searched: this.time };
    return best ? bot.cover : null;
  }
  /** Back to full health on the open, safe tile farthest from living rivals. */
  redeploy(e) {
    const rivals = this.entities.filter((v) => v !== e && v.hp > 0 && !v.departed);
    let best = null,
      bestScore = -1;
    for (let y = 1; y < this.level.length - 1; y++)
      for (let x = 1; x < this.level.length - 1; x++) {
        const p = { x: x + 0.5, y: y + 0.5 };
        if (!this.canMove(p.x, p.y) || this.outsideSafe(p)) continue;
        const score = Math.min(99, ...rivals.map((r) => Math.hypot(r.x - p.x, r.y - p.y)));
        if (score > bestScore) (best = p), (bestScore = score);
      }
    if (best) Object.assign(e, best);
    e.hp = e.maxHp;
    e.hurtAt = this.time;
    e.shieldUntil = this.time + SIGNAL.respawnShield;
    e.path = [];
  }
  /** Health recovers after a few seconds without taking damage, as in most
   * shooters. Not inside the Red Haze (its damage resets the timer) and at
   * a reduced rate while poisoned, through heal(). */
  recover(e, dt) {
    const delay = this.mode === "signal" && e.lives === 0 ? SIGNAL.lastRegenDelay : REGEN_DELAY;
    if (e.hp <= 0 || e.hp >= e.maxHp || this.time - (e.hurtAt ?? -Infinity) < delay) return;
    this.heal(e, e.maxHp * REGEN_RATE * dt);
  }
  applyHaze(e, dt) {
    if (e.hp <= 0) return;
    if (this.time > this.zone.delay && this.outsideSafe(e)) {
      e.exposure += dt;
      this.damage(e, (5 + (this.time - this.zone.delay) * 0.08 + e.exposure * 0.6) * dt);
    } else e.exposure = 0;
  }
  respawn(e) {
    const mate = this.entities.find((v) => v !== e && v.team === e.team && v.hp > 0);
    if (!mate || e.departed) {
      e.respawnAt = 0;
      return;
    }
    // Search near the teammate, with wall/crate collision and the safe zone checked.
    const candidates = [
      { x: mate.x + 0.55, y: mate.y },
      { x: mate.x - 0.55, y: mate.y },
      { x: mate.x, y: mate.y + 0.55 },
      { x: mate.x, y: mate.y - 0.55 },
    ];
    for (let radius = 0.25; radius <= 2; radius += 0.25)
      for (let a = 0; a < 6.28; a += Math.PI / 4)
        candidates.push({ x: mate.x + Math.cos(a) * radius, y: mate.y + Math.sin(a) * radius });
    const spot = candidates.find((p) => this.canMove(p.x, p.y) && !this.outsideSafe(p));
    if (!spot) {
      e.respawnAt = this.time + 0.5;
      return;
    }
    e.x = spot.x;
    e.y = spot.y;
    e.hp = 100;
    e.maxHp = 100;
    e.damage = e.bot ? 16 : 40;
    e.cores = 0;
    e.ammo = weaponOf(e.weapon).mag;
    e.respawnAt = 0;
    e.reloadUntil = 0;
    e.sprinting = false;
    e.stance = "stand";
    e.jumpAt = -10;
    e.slideUntil = 0;
    e.slideCooldown = 0;
    e.slideHeld = false;
    e.path = [];
    e.nextPath = 0;
    e.hit = -10;
    e.shotAt = -10;
    e.burst = null;
    e.charge = 0;
    e.poisonUntil = 0;
    e.cloakedUntil = 0;
    e.speedUntil = 0;
    e.slowUntil = 0;
    this.emit(e.id, "REDEPLOYED / COVER YOUR PARTNER");
  }
  detach(id) {
    const e = this.entities.find((v) => v.id === id);
    if (e) {
      e.departed = true;
      e.respawns = 0;
      e.respawnAt = 0;
      this.damage(e, e.hp);
      this.checkResult();
    }
  }
  teamAlive(team) {
    return this.entities.some((e) => e.team === team && e.hp > 0);
  }
  checkResult() {
    if (this.state === "ended") return;
    const teams = new Set(this.entities.filter((e) => e.hp > 0).map((e) => e.team));
    for (const e of this.entities) {
      if (e.respawnAt && !teams.has(e.team)) e.respawnAt = 0;
      if (!teams.has(e.team) && !e.placement) {
        e.placement = teams.size + 1;
        e.eliminatedAt = this.time;
      }
    }
    if (teams.size <= 1) {
      this.state = "ended";
      this.winner = teams.size ? [...teams][0] : null;
      for (const e of this.entities) if (e.team === this.winner) e.placement = 1;
    }
  }
  heal(e, amount) {
    if (e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + amount * (e.poisonUntil > this.time ? 0.35 : 1));
  }
  poison(e, source) {
    if (e.hp <= 0 || (this.mode === "duo" && e.team === source.team)) return;
    e.poisonUntil = this.time + 3;
    e.poisonTick = this.time + 0.6;
    e.poisonSource = source.id;
    e.poisonDamage = (6 * source.damage) / 40;
  }
  effect(x, y, kind, radius = 1, duration = 0.45) {
    this.fx.push({ id: ++this.nextEffect, x, y, kind, radius, until: this.time + duration });
    if (this.fx.length > 40) this.fx.shift();
  }
  // Perimeter walls stay sealed. Only interior cover within the blast is removed.
  breakCover(x, y, radius) {
    for (
      let j = Math.max(1, Math.floor(y - radius));
      j < Math.min(this.level.length - 1, y + radius);
      j++
    )
      for (
        let i = Math.max(1, Math.floor(x - radius));
        i < Math.min(this.level[0].length - 1, x + radius);
        i++
      )
        if (
          Math.hypot(i + 0.5 - x, j + 0.5 - y) <= radius &&
          this.level[j][i] &&
          !mapOf(this.mapId).unbreakable?.includes(this.level[j][i])
        ) {
          this.level[j][i] = 0;
          // Collapsed walls leave rubble you can cross, slowly.
          this.addTerrain(i + 0.5, j + 0.5, "rubble");
        }
  }
  /** Mark a floor tile with lasting ground damage (Last Signal / Pair Ops).
   * Rubble and cracks outrank sand and scorch on the same tile. */
  addTerrain(x, y, kind) {
    if (!this.terrain) return;
    const tx = Math.floor(x),
      ty = Math.floor(y),
      rank = TERRAIN[kind].rank,
      old = this.terrain.find((t) => Math.floor(t.x) === tx && Math.floor(t.y) === ty);
    if (old) {
      if (TERRAIN[old.kind].rank < rank) old.kind = kind;
      return;
    }
    if (this.terrain.length >= 400) return;
    this.terrain.push({ x: tx + 0.5, y: ty + 0.5, kind, seed: (tx * 73 + ty * 151) % 997 });
    this.terrainIndex = null;
  }
  /** Movement multiplier from ground damage under a fighter. */
  footing(e) {
    if (!this.terrain?.length) return 1;
    if (!this.terrainIndex || this.terrainIndex.size !== this.terrain.length) {
      this.terrainIndex = new Map(this.terrain.map((t) => [Math.floor(t.y) * 1000 + Math.floor(t.x), t]));
    }
    const t = this.terrainIndex.get(Math.floor(e.y) * 1000 + Math.floor(e.x));
    return t ? TERRAIN[t.kind].speed : 1;
  }
  blast(source, x, y, damage, radius, { destroy = false, knock = false, poison = false } = {}) {
    if (destroy) this.breakCover(x, y, radius);
    this.effect(x, y, poison ? "toxic" : "blast", radius);
    for (const e of [...this.entities, ...this.crates]) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (e === source || e.hp <= 0 || d > radius || !this.visible({ x, y }, e)) continue;
      const hp = e.hp;
      this.damage(e, damage * (1 - (0.45 * d) / radius), source);
      if (poison && hp !== e.hp && !e.id.startsWith("crate")) this.poison(e, source);
      if (knock && e.hp < hp && e.hp > 0 && !e.id.startsWith("crate"))
        this.move(e, ((e.x - x) / (d || 1)) * 0.8, ((e.y - y) / (d || 1)) * 0.8);
    }
  }
  aimPoint(e, range) {
    const ray = this.cast(e.x, e.y, Math.cos(e.a), Math.sin(e.a));
    const d = Math.max(0.1, Math.min(range, ray.distance - 0.3));
    return { x: e.x + Math.cos(e.a) * d, y: e.y + Math.sin(e.a) * d };
  }
  dash(e, distance, damage = 0, { destroy = false, heal = false } = {}) {
    const hit = new Set();
    e.cloakedUntil = 0;
    for (let d = 0; d < distance; d += 0.12) {
      const x = e.x + Math.cos(e.a) * 0.12,
        y = e.y + Math.sin(e.a) * 0.12;
      if (destroy) this.breakCover(x, y, 0.65);
      if (!this.canMove(x, y)) break;
      this.move(e, Math.cos(e.a) * 0.12, Math.sin(e.a) * 0.12);
      for (const rival of this.entities)
        if (
          rival !== e &&
          rival.hp > 0 &&
          !hit.has(rival.id) &&
          Math.hypot(rival.x - e.x, rival.y - e.y) < 0.85
        ) {
          const hp = rival.hp;
          this.damage(rival, damage, e);
          hit.add(rival.id);
          if (hp > rival.hp) {
            this.move(rival, Math.cos(e.a) * 0.65, Math.sin(e.a) * 0.65);
            if (heal) this.heal(e, (hp - rival.hp) * 0.35);
          }
        }
    }
  }
  // Vaults cross interior cover in the flat arena, and land only on walkable floor.
  leap(e, range, damage, { poison = false } = {}) {
    let spot = null;
    for (let d = 0.3; d <= range; d += 0.2) {
      const p = { x: e.x + Math.cos(e.a) * d, y: e.y + Math.sin(e.a) * d };
      if (this.canMove(p.x, p.y)) spot = p;
    }
    if (poison) {
      this.blast(e, e.x, e.y, (25 * e.damage) / 40, 2, { poison: true });
      for (let i = 0; i < 8; i++)
        this.projectile(e, (i * Math.PI) / 4, (10 * e.damage) / 40, "poison", 3, 10);
    }
    if (spot) {
      e.x = spot.x;
      e.y = spot.y;
    }
    this.blast(e, e.x, e.y, damage, 2, { poison });
    if (poison)
      for (let i = 0; i < 8; i++)
        this.projectile(e, (i * Math.PI) / 4, (10 * e.damage) / 40, "poison", 3, 10);
    e.speedUntil = this.time + 3;
  }
  projectile(e, angle, damage, kind, range, speed = 8, extra = {}) {
    this.projectiles.push({
      id: ++this.nextEffect,
      owner: e.id,
      x: e.x,
      y: e.y,
      a: angle,
      damage,
      kind,
      range,
      speed,
      until: this.time + range / speed + 0.2,
      ...extra,
    });
    if (this.projectiles.length > 100) this.projectiles.shift();
  }
  pellets(
    e,
    w,
    damage = w.damage,
    spread = w.spread,
    count = w.pellets,
    range = w.range,
    poison = false,
  ) {
    // Aiming down the sights tightens a spread (shotguns, twin pistols).
    if (e.ads) spread *= ADS.spread;
    for (let i = 0; i < count; i++) {
      const a = e.a + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread * 2);
      const t = this.rayTarget(e, Math.cos(a), Math.sin(a), [...this.entities, ...this.crates]);
      if (!t) continue;
      const d = Math.hypot(t.x - e.x, t.y - e.y);
      if (d > range) continue;
      // Height matters: crouched and prone fighters are smaller, lower targets.
      if (t.id.startsWith("crate") ? Math.abs((e.pitch || 0) * d) > 0.32 : !verticalHit(e, t, e.pitch, d, this.time))
        continue;
      const falloff =
        w.kind === "shotgun"
          ? Math.max(0.2, 1 - d / (range * 1.2))
          : w.kind === "blades"
            ? Math.max(0.25, 1 - d / (range * 1.25))
            : 1;
      const hp = t.hp;
      this.damage(t, ((damage * e.damage) / 40) * falloff, e);
      if (poison && t.hp < hp && !t.id.startsWith("crate")) this.poison(t, e);
    }
  }
  reload(e) {
    if (this.countdown > 0) return false;
    const w = weaponOf(e.weapon);
    if (e.hp > 0 && !e.reloadUntil && e.ammo < w.mag) {
      e.reloadUntil = this.time + 1.4 * (e.adrenalineUntil > this.time ? SIGNAL.rushReload : 1);
      e.burst = null;
      this.emit(e.id, "RELOADING");
    }
  }
  shoot(e) {
    if (this.countdown > 0) return false;
    const w = weaponOf(e.weapon);
    if (
      settling(e, this.time) ||
      stanceOf(e) === "swim" ||
      e.diveUntil > this.time ||
      e.hp <= 0 ||
      this.state === "ended" ||
      e.reloadUntil ||
      this.time - e.shotAt < w.cooldown ||
      e.burst
    )
      return;
    if (e.ammo <= 0) {
      this.reload(e);
      return;
    }
    e.ammo--;
    e.shotAt = this.time;
    e.cloakedUntil = 0;
    // Shots fired mid-jump wander a little.
    const phase = jumpPhase(e, this.time);
    if (phase !== null) e.a += Math.sin(this.time * 97 + (e.phase || 0)) * JUMP.wander * (e.ads ? 0.5 : 1);
    if (w.kind === "rifle") this.pellets(e, w, w.damage, 0, 1, w.range);
    else if (w.kind === "shotgun") this.pellets(e, w);
    else if (w.kind === "burst") {
      this.pellets(e, w, w.damage, 0, 1, w.range);
      e.burst = {
        remaining: 2,
        next: this.time + 0.075,
        damage: w.damage,
        range: w.range,
        spread: 0,
        free: false,
      };
    } else if (w.kind === "blades" || w.kind === "poison")
      for (let i = 0; i < w.pellets; i++)
        this.projectile(
          e,
          e.a + (i / (w.pellets - 1) - 0.5) * w.spread * 2,
          (w.damage * e.damage) / 40,
          w.kind,
          w.range,
          12,
        );
    else if (w.kind === "rocket" || w.kind === "shard")
      this.projectile(
        e,
        e.a,
        (w.damage * e.damage) / 40,
        w.kind,
        w.range,
        w.kind === "rocket" ? 9 : 6,
      );
    else if (w.kind === "lob") {
      const end = this.lobPoint(e, w.range);
      for (const side of [-0.22, 0.22])
        this.projectile(e, e.a, (w.damage * e.damage) / 40, "lob", w.range, 7, {
          endX: end.x - Math.sin(e.a) * side,
          endY: end.y + Math.cos(e.a) * side,
          startX: e.x,
          startY: e.y,
          started: this.time,
          until: this.time + 0.9,
          radius: 1.35,
        });
    } else if (w.kind === "melee" || w.kind === "dash") {
      if (w.kind === "dash") this.dash(e, 1.2, (w.damage * e.damage) / 40);
      const target = this.rayTarget(e, Math.cos(e.a), Math.sin(e.a), [
        ...this.entities,
        ...this.crates,
      ]);
      if (
        w.kind === "melee" &&
        target &&
        Math.hypot(target.x - e.x, target.y - e.y) < w.range &&
        this.visible(e, target)
      ) {
        const hp = target.hp;
        this.damage(target, (w.damage * e.damage) / 40, e);
        if (w.kind === "melee" && !target.id.startsWith("crate"))
          this.heal(e, (hp - target.hp) * 0.3);
      }
    }
    this.checkResult();
  }
  lobPoint(e, range) {
    let p = { x: e.x, y: e.y };
    for (let d = 0.5; d <= range; d += 0.25) {
      const x = e.x + Math.cos(e.a) * d,
        y = e.y + Math.sin(e.a) * d;
      if (x < 1 || y < 1 || x > this.level[0].length - 1 || y > this.level.length - 1) break;
      if (!this.wall(x, y)) p = { x, y };
    }
    return p;
  }
  super(e) {
    if (this.countdown > 0) return false;
    if (e.hp <= 0 || e.charge < 100 || this.state === "ended") return false;
    const w = weaponOf(e.weapon),
      power = e.damage / 40;
    e.charge = 0;
    e.burst = null;
    e.cloakedUntil = 0;
    this.emit(e.id, w.super.toUpperCase() + " / ACTIVATED");
    if (w.id === "scatter") {
      this.breakCover(e.x + Math.cos(e.a) * 2, e.y + Math.sin(e.a) * 2, 1.3);
      this.pellets(e, w, 24, 0.6, 9, 6);
      for (const t of this.entities)
        if (
          t !== e &&
          t.hp > 0 &&
          t.team !== e.team &&
          Math.hypot(t.x - e.x, t.y - e.y) < 4 &&
          Math.abs(
            Math.atan2(
              Math.sin(Math.atan2(t.y - e.y, t.x - e.x) - e.a),
              Math.cos(Math.atan2(t.y - e.y, t.x - e.x) - e.a),
            ),
          ) < 0.7 &&
          this.visible(e, t)
        )
          this.move(t, Math.cos(e.a), Math.sin(e.a));
      this.effect(e.x + Math.cos(e.a) * 2, e.y + Math.sin(e.a) * 2, "blast", 2);
    } else if (w.id === "breach") this.dash(e, 5, 75 * power, { destroy: true });
    else if (w.id === "carbine" || w.id === "twin") {
      e.burst = {
        remaining: w.id === "twin" ? 9 : 5,
        next: this.time,
        damage: w.id === "twin" ? 24 : 45,
        range: 22,
        spread: w.id === "twin" ? 0.24 : 0.04,
        free: true,
      };
    } else if (w.id === "shard") {
      const p = this.aimPoint(e, 5);
      this.fields.push({
        id: ++this.nextEffect,
        owner: e.id,
        ...p,
        radius: 2,
        damage: 18 * power,
        until: this.time + 5,
        kind: "bramble",
      });
    } else if (w.id === "veil") e.cloakedUntil = this.time + 5;
    else if (w.id === "venom") this.leap(e, 4, 35 * power, { poison: true });
    else if (w.id === "brawler") this.leap(e, 4, 65 * power);
    else if (w.id === "reaper") {
      this.dash(e, 3, 60 * power, { heal: true });
      for (let i = 0; i < 5; i++)
        this.projectile(e, e.a + (i - 2) * 0.14, 22 * power, "echo", 8, 10);
    } else if (w.id === "rocket") {
      const p = this.aimPoint(e, 8);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 0.4;
        this.projectiles.push({
          id: ++this.nextEffect,
          owner: e.id,
          x: p.x + Math.cos(a) * 0.8,
          y: p.y + Math.sin(a) * 0.8,
          endX: p.x + Math.cos(a) * 0.8,
          endY: p.y + Math.sin(a) * 0.8,
          kind: "barrage",
          damage: 45 * power,
          until: this.time + 0.45 + i * 0.2,
          radius: 1.5,
        });
      }
    } else if (w.id === "demo") {
      const p = this.lobPoint(e, 7);
      this.projectile(e, e.a, 120 * power, "barrel", 7, 7, {
        endX: p.x,
        endY: p.y,
        startX: e.x,
        startY: e.y,
        started: this.time,
        until: this.time + 1.1,
        radius: 2.3,
      });
    }
    this.checkResult();
    return true;
  }
  updateEffects(dt) {
    this.fx = this.fx.filter((f) => f.until > this.time);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i],
        source = this.entities.find((e) => e.id === p.owner);
      if (!source) {
        this.projectiles.splice(i, 1);
        continue;
      }
      const timed = ["lob", "barrel", "barrage"].includes(p.kind);
      if (timed) {
        if (p.started !== undefined) {
          const t = clamp((this.time - p.started) / (p.until - p.started), 0, 1);
          p.x = p.startX + (p.endX - p.startX) * t;
          p.y = p.startY + (p.endY - p.startY) * t;
          p.height = Math.sin(t * Math.PI) * 1.5;
        }
        if (this.time >= p.until) {
          this.blast(source, p.endX, p.endY, p.damage, p.radius, {
            destroy: p.kind === "barrel",
            knock: p.kind === "barrel",
          });
          this.projectiles.splice(i, 1);
        }
        continue;
      }
      const dx = Math.cos(p.a),
        dy = Math.sin(p.a),
        travel = p.speed * dt;
      const target = this.rayTarget(p, dx, dy, [
        ...this.entities.filter((e) => e !== source),
        ...this.crates,
      ]);
      const collided = target && Math.hypot(target.x - p.x, target.y - p.y) < travel + 0.4;
      const wall = this.cast(p.x, p.y, dx, dy).distance;
      const move = Math.min(travel, Math.max(0, wall - 0.03));
      p.x += dx * move;
      p.y += dy * move;
      p.range -= travel;
      if (collided || wall <= travel || p.range <= 0 || this.time >= p.until) {
        if (p.kind === "rocket" || p.kind === "shard") {
          this.blast(source, p.x, p.y, p.damage, p.kind === "rocket" ? 1.6 : 0.75);
          if (p.kind === "shard")
            for (let k = 0; k < 8; k++)
              this.projectile(
                { ...source, x: p.x, y: p.y },
                (k * Math.PI) / 4,
                (14 * source.damage) / 40,
                "spike",
                3,
                8,
              );
        } else if (collided) {
          const hp = target.hp;
          const fall =
            p.kind === "blades" ? Math.max(0.25, p.range / weaponOf(source.weapon).range) : 1;
          this.damage(target, p.damage * fall, source);
          if (target.hp < hp) {
            if (p.kind === "poison" && !target.id.startsWith("crate")) this.poison(target, source);
            if (p.kind === "echo" && !target.id.startsWith("crate"))
              this.heal(source, (hp - target.hp) * 0.4);
          }
        }
        this.effect(p.x, p.y, p.kind === "poison" ? "toxic" : "spark", 0.35);
        this.projectiles.splice(i, 1);
      }
    }
    for (const field of this.fields)
      if (field.until > this.time) {
        // Canister gas (`all`) hurts everyone inside, its shooter included.
        const source = this.entities.find((e) => e.id === field.owner) || null;
        if (!source && !field.all) continue;
        for (const e of this.entities)
          if (
            (field.all || e !== source) &&
            e.hp > 0 &&
            !(this.mode === "duo" && source && !field.all && e.team === source.team) &&
            Math.hypot(e.x - field.x, e.y - field.y) < field.radius &&
            this.visible(field, e)
          ) {
            e.slowUntil = this.time + 0.15;
            this.damage(e, field.damage * dt, source === e ? null : source);
          }
      }
    this.fields = this.fields.filter((f) => f.until > this.time);
    for (const e of this.entities) {
      if (e.hp <= 0) continue;
      if (
        e.cloakedUntil > this.time &&
        this.entities.some(
          (t) => t !== e && t.hp > 0 && t.team !== e.team && Math.hypot(t.x - e.x, t.y - e.y) < 1.3,
        )
      )
        e.cloakedUntil = 0;
      if (e.poisonUntil > this.time && this.time >= e.poisonTick) {
        const source = this.entities.find((v) => v.id === e.poisonSource);
        this.damage(e, e.poisonDamage || 6, source);
        e.poisonTick = this.time + 0.6;
      }
      if (e.burst && this.time >= e.burst.next) {
        const b = e.burst;
        if (e.ammo > 0 || b.free) {
          if (!b.free) e.ammo--;
          const old = e.a;
          e.a += Math.sin(b.remaining * 1.7) * b.spread;
          this.pellets(e, { kind: "burst" }, b.damage, 0, 1, b.range);
          e.a = old;
          e.shotAt = this.time;
          this.effect(e.x + Math.cos(e.a) * 0.5, e.y + Math.sin(e.a) * 0.5, "spark", 0.2);
        }
        b.remaining--;
        b.next = this.time + 0.075;
        if (b.remaining <= 0 || (!b.free && e.ammo <= 0)) e.burst = null;
      }
    }
  }
  pathTo(e, target) {
    const sx = Math.floor(e.x),
      sy = Math.floor(e.y),
      tx = Math.floor(target.x),
      ty = Math.floor(target.y),
      key = (x, y) => y * this.level[0].length + x;
    const queue = [[sx, sy]],
      parents = new Map([[key(sx, sy), null]]),
      blocked = new Set(
        // Canisters are slim enough to step around inside their tile.
        this.crates
          .filter((c) => c.hp > 0 && !CANISTERS[c.kind])
          .map((c) => key(Math.floor(c.x), Math.floor(c.y))),
      );
    let end = null;
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      if (x === tx && y === ty) {
        end = [x, y];
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = key(nx, ny);
        if (
          nx < 1 ||
          ny < 1 ||
          nx > this.level[0].length - 2 ||
          ny > this.level.length - 2 ||
          parents.has(k) ||
          this.wall(nx + 0.5, ny + 0.5)
        )
          continue;
        if (blocked.has(k) && !(nx === tx && ny === ty)) continue;
        parents.set(k, [x, y]);
        queue.push([nx, ny]);
      }
    }
    const path = [];
    while (end && !(end[0] === sx && end[1] === sy)) {
      path.unshift({ x: end[0] + 0.5, y: end[1] + 0.5 });
      end = parents.get(key(...end));
    }
    return path;
  }
  updateRival(bot, dt) {
    if (bot.hp <= 0 || bot.departed) return;
    const skill = DIFFICULTIES[difficultyOf(this.difficulty)];
    if (this.mode === "training") {
      const p = this.entities.find((e) => !e.bot);
      if (!p || p.hp <= 0) return;
      const dx = p.x - bot.x,
        dy = p.y - bot.y,
        d = Math.hypot(dx, dy);
      const w = weaponOf(bot.weapon);
      if (d > 0 && d < 10 && this.visible(bot, p)) {
        if (d > Math.min(2.1, w.range * 0.65))
          this.move(bot, (dx / d) * dt * 0.55 * skill.speed, (dy / d) * dt * 0.55 * skill.speed);
        bot.a = Math.atan2(dy, dx) + Math.sin(this.time * 3 + bot.phase) * skill.aim;
        bot.pitch = 0;
        if (d < w.range && this.time > bot.attack) {
          bot.attack = this.time + Math.max(1.6, w.cooldown) * skill.reaction;
          this.shoot(bot);
        }
      }
      return;
    }
    const rivals = this.entities.filter(
        (e) =>
          e !== bot &&
          e.hp > 0 &&
          e.team !== bot.team &&
          (!(e.cloakedUntil > this.time) || Math.hypot(e.x - bot.x, e.y - bot.y) < 1.3),
      ),
      dist = (e) => Math.hypot(e.x - bot.x, e.y - bot.y),
      nearest = (list) => [...list].sort((a, b) => dist(a) - dist(b))[0];
    // Spotting: awareness, stance, fog (sandstorm, Red Haze) and walls.
    const foe = nearest(rivals.filter((e) => this.spots(bot, e, skill.awareness))),
      box = nearest(this.crates.filter((c) => c.hp > 0 && !c.kind && !this.outsideSafe(c))),
      core = nearest(this.cores.filter((c) => !this.outsideSafe(c)));
    let goal;
    // Last Signal bots back off when badly hurt and come back once healed.
    if (this.mode === "signal") {
      if (bot.hp / bot.maxHp < SIGNAL.retreatAt) bot.retreating = true;
      else if (bot.hp / bot.maxHp > 0.9) bot.retreating = false;
    }
    const threat = bot.retreating && nearest(rivals.filter((e) => this.spots(bot, e, 6)));
    if (this.mode === "signal") this.dodge(bot, skill);
    const strike = this.disaster?.strikes.find((s) => Math.hypot(s.x - bot.x, s.y - bot.y) < 1.7);
    if (this.outsideSafe(bot)) goal = { x: this.zone.cx, y: this.zone.cy };
    else if (strike) {
      // Marked ground: step out of the strike.
      const n = this.level.length,
        d = Math.hypot(bot.x - strike.x, bot.y - strike.y) || 1;
      goal = {
        x: clamp(bot.x + ((bot.x - strike.x) / d) * 2.5, 1.5, n - 1.5),
        y: clamp(bot.y + ((bot.y - strike.y) / d) * 2.5, 1.5, n - 1.5),
      };
    } else if (threat) {
      const n = this.level.length;
      const threats = rivals.filter((e) => dist(e) < 8 && this.visible(e, bot));
      goal = this.coverFrom(bot, threat, threats) || {
        x: clamp(bot.x + (bot.x - threat.x) * 3, 1.5, n - 1.5),
        y: clamp(bot.y + (bot.y - threat.y) * 3, 1.5, n - 1.5),
      };
    } else if (bot.retreating)
      goal =
        bot.cover && !bot.cover.none && !this.outsideSafe(bot.cover)
          ? bot.cover
          : { x: bot.x, y: bot.y };
    else if (core && dist(core) < 4) goal = core;
    else if (foe) goal = foe;
    else if (box) goal = box;
    else goal = nearest(rivals) || { x: this.zone.cx, y: this.zone.cy };
    if (this.time >= bot.nextPath) {
      bot.path = this.pathTo(bot, goal);
      bot.nextPath = this.time + 0.65;
    }
    const stop =
      goal === foe ? Math.min(2.1, weaponOf(bot.weapon).range * 0.65) : goal === box ? 1.2 : 0.25;
    if (this.mode === "signal")
      botStance(this, bot, foe, {
        retreating: !!bot.retreating,
        moving: dist(goal) > stop + 0.6,
        outside: this.outsideSafe(bot),
        rifle: ["rifle", "burst"].includes(weaponOf(bot.weapon).kind),
      });
    const sliding = bot.slideUntil > this.time;
    if (sliding) {
      const speed =
        (3 + 3 * ((bot.slideUntil - this.time) / 0.65)) * (bot.speedUntil > this.time ? 1.4 : 1);
      this.move(bot, bot.slideDx * speed * dt, bot.slideDy * speed * dt);
    } else if (dist(goal) > stop) {
      let point = bot.path[0];
      if (point && dist(point) < 0.18) {
        bot.path.shift();
        point = bot.path[0];
      }
      if (!point && this.visible(bot, goal)) point = goal;
      if (point) {
        const dx = point.x - bot.x,
          dy = point.y - bot.y,
          d = Math.hypot(dx, dy);
        const boost = (bot.speedUntil > this.time ? 1.4 : 1) * this.weather(bot) * speedOf(bot);
        if (d > 0.01)
          this.move(
            bot,
            (dx / d) * dt * 1.25 * skill.speed * boost,
            (dy / d) * dt * 1.25 * skill.speed * boost,
          );
      }
    }
    // An explosive or toxic canister next to a rival is worth shooting instead.
    const trap =
      foe &&
      this.crates.find(
        (c) =>
          c.hp > 0 &&
          (c.kind === "red" || c.kind === "green") &&
          Math.hypot(c.x - foe.x, c.y - foe.y) < 1.5 &&
          Math.hypot(c.x - bot.x, c.y - bot.y) > 2.4 &&
          this.visible(bot, c),
      );
    const target =
      trap ||
      (bot.retreating && foe && dist(foe) > 2.2 ? null : foe) ||
      (box && dist(box) < 3 && this.visible(bot, box) ? box : null);
    if (target && dist(target) < weaponOf(bot.weapon).range && this.time >= bot.attack) {
      bot.attack = this.time + Math.max(0.5, weaponOf(bot.weapon).cooldown) * skill.reaction;
      bot.a =
        Math.atan2(target.y - bot.y, target.x - bot.x) +
        Math.sin(this.time * 3 + bot.phase) * skill.aim;
      // Aim at the target's height: low against prone, up at a jumper.
      bot.pitch = target.id.startsWith("crate") ? 0 : pitchTo(bot, target, dist(target), this.time);
      // Sights up for a long shot (shown on the bot; it is standing still to shoot).
      bot.ads = dist(target) > 6 && canAim(weaponOf(bot.weapon));
      if (bot.charge >= 100) this.super(bot);
      this.shoot(bot);
    } else if (goal) {
      bot.a = Math.atan2(goal.y - bot.y, goal.x - bot.x);
      bot.ads = false;
    }
    this.collectCores(bot);
  }
  advance(dt, inputs = {}) {
    if (this.state === "ended") return;
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      return;
    }
    this.time += dt;
    for (const e of this.entities) {
      if (e.respawnAt && this.time >= e.respawnAt) this.respawn(e);
      if (e.reloadUntil && this.time >= e.reloadUntil) {
        e.ammo = weaponOf(e.weapon).mag;
        e.reloadUntil = 0;
      }
      if (e.hp <= 0 || e.bot || e.departed) continue;
      const input = inputs[e.id] || {};
      if (Number.isFinite(input.aim)) e.a = Math.atan2(Math.sin(input.aim), Math.cos(input.aim));
      if (Number.isFinite(input.pitch)) e.pitch = clamp(input.pitch, -Math.tan(75 * Math.PI / 180), Math.tan(75 * Math.PI / 180));
      let f = clamp(Number(input.forward) || 0, -1, 1),
        s = clamp(Number(input.strafe) || 0, -1, 1);
      const len = Math.max(1, Math.hypot(f, s));
      f /= len;
      s /= len;
      const ca = Math.cos(e.a),
        sa = Math.sin(e.a);
      if (
        input.slide &&
        !e.slideHeld &&
        input.sprint &&
        f > 0.2 &&
        this.time >= (e.slideCooldown || 0)
      ) {
        e.slideUntil = this.time + 0.65;
        e.slideCooldown = this.time + 1.6;
        const direction = Math.hypot(f, s);
        e.slideDx = (ca * f - sa * s) / direction;
        e.slideDy = (sa * f + ca * s) / direction;
      }
      e.slideHeld = !!input.slide;
      if (stanceOf(e) === "swim") {
        // In the water the jump button dives at a culvert mouth.
        const press = !!input.jump && !e.jumpHeld;
        e.jumpHeld = !!input.jump;
        if (press) this.dive(e);
        e.slideUntil = 0;
      } else applyStanceInput(e, input, this.time, Math.hypot(f, s) > 0.1);
      const sliding = e.slideUntil > this.time;
      // Sprinting lowers the sights; aiming means walking.
      const swimming = stanceOf(e) === "swim";
      e.ads = !swimming && !!input.ads && canAim(weaponOf(e.weapon)) && !(input.sprint && Math.hypot(f, s) > 0.1) && !sliding;
      e.sprinting = !swimming && !sliding && !e.ads && !!input.sprint && Math.hypot(f, s) > 0.1 && stanceOf(e) === "stand";
      const speed =
        (sliding ? 3 + 3 * ((e.slideUntil - this.time) / 0.65) : (e.sprinting ? 4 : 2.6) * speedOf(e) * (e.ads ? ADS.speed : 1)) *
        (e.speedUntil > this.time ? 1.4 : 1) *
        (e.slowUntil > this.time ? 0.45 : 1) *
        this.weather(e);
      this.move(
        e,
        (sliding ? e.slideDx : ca * f - sa * s) * speed * dt,
        (sliding ? e.slideDy : sa * f + ca * s) * speed * dt,
      );
      if (input.reload) this.reload(e);
      if (input.super) this.super(e);
      if (input.fire) this.shoot(e);
    }
    if (this.state === "ended") return;
    this.updateEffects(dt);
    if (this.crates.some((c) => c.until <= this.time))
      this.crates = this.crates.filter((c) => !(c.until <= this.time));
    if (this.disaster) updateDisaster(this, dt);
    this.updateWater(dt);
    if (this.mode !== "training") this.updateZone();
    for (const e of this.entities) {
      if (e.bot) this.updateRival(e, dt);
      if (this.mode !== "training") {
        this.collectCores(e);
        this.applyHaze(e, dt);
        this.recover(e, dt);
      }
    }
    this.checkResult();
  }
}
