/** Last Signal hazards: shootable canisters, breakable sandbag barriers and
 * one natural disaster per round (announced ahead). Shared, DOM-free rules;
 * the Arena keeps all state as plain data so online rooms can store it.
 *
 * Canisters and barriers live in `arena.crates` with a `kind`, so walls of
 * code that already handle crates (collision, bullets, blasts, rendering
 * hooks) treat them as solid, shootable objects. Supply crates have no kind. */

export const CANISTERS = {
  red: { name: "Explosive canister", hp: 20 },
  green: { name: "Toxic canister", hp: 20 },
  pink: { name: "Foam canister", hp: 20 },
  blue: { name: "Healing canister", hp: 20 },
};
export const BARRIER_HP = 160;
// Lasting ground damage. speed multiplies movement on that tile; rank decides
// which mark wins when two land on the same tile.
export const TERRAIN = {
  scorch: { speed: 1, rank: 0 },
  sand: { speed: 0.85, rank: 1 },
  crack: { speed: 0.8, rank: 2 },
  rubble: { speed: 0.75, rank: 3 },
};
export const FOAM = { hp: 70, life: 15 };

// One disaster per arena, themed to it.
export const DISASTERS = {
  sandstorm: {
    name: "Sandstorm",
    warn: "Visibility drops and everyone slows down",
    duration: 25,
  },
  storm: {
    name: "Lightning storm",
    warn: "Lightning hits marked ground: keep moving",
    duration: 22,
  },
  quake: {
    name: "Earthquake",
    warn: "Cover collapses where the ground is marked",
    duration: 15,
  },
};
// Calder Quay: a harbour thunderstorm (lightning) until its own storm surge.
export const DISASTER_OF = { outpost: "sandstorm", skyport: "storm", estate: "quake", quay: "storm" };
export const DISASTER_WARNING = 10; // seconds of warning before it starts
// Lightning leaves anyone it hits electrified: a smaller burn over a few
// seconds after the strike itself.
export const SHOCK = { seconds: 4, perSecond: 6 };
const STRIKE_DELAY = { storm: 1.6, quake: 1.4 }; // marked ground → impact

const COUNTS = {
  outpost: { canisters: 14, barriers: 10 },
  skyport: { canisters: 18, barriers: 14 },
  estate: { canisters: 16, barriers: 12 },
  quay: { canisters: 14, barriers: 8 },
};
const KINDS = ["red", "green", "red", "blue", "pink", "red", "green", "blue"];

/** Canisters against walls and barriers in open ground: the same layout
 * every round for an arena, clear of spawns, crates, corridors and the centre. */
export function placeHazards(level, mapId, spawns, crates) {
  const count = COUNTS[mapId];
  if (!count) return [];
  const n = level.length,
    open = (x, y) => level[y]?.[x] === 0,
    taken = [...crates.map((c) => [c.x, c.y])],
    far = (x, y, gap) => taken.every(([tx, ty]) => Math.hypot(tx - x, ty - y) >= gap),
    clearOfSpawns = (x, y) => spawns.every(([sx, sy]) => Math.hypot(sx - x, sy - y) >= 3),
    centre = n / 2;
  // A fixed shuffle per arena (not Math.random): everyone learns the layout.
  let seed = [...mapId].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 2147483647, 7);
  const tiles = [];
  for (let y = 2; y < n - 2; y++)
    for (let x = 2; x < n - 2; x++) if (open(x, y)) tiles.push([x, y]);
  for (let i = tiles.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const out = [];
  let canisters = 0,
    barriers = 0;
  for (const [x, y] of tiles) {
    const px = x + 0.5,
      py = y + 0.5;
    if (!clearOfSpawns(px, py) || Math.hypot(px - centre, py - centre) < 2.5) continue;
    const walls = [open(x - 1, y), open(x + 1, y), open(x, y - 1), open(x, y + 1)].filter(
        (o) => !o,
      ).length,
      corridor = (!open(x - 1, y) && !open(x + 1, y)) || (!open(x, y - 1) && !open(x, y + 1));
    let ring = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (open(x + i, y + j)) ring++;
    // Canisters stand against a wall, in lanes at least three tiles wide so
    // they never block the way.
    const wallSide = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ].find(([i, j]) => !open(x + i, y + j)),
      roomy =
        wallSide &&
        open(x - wallSide[0], y - wallSide[1]) &&
        open(x - 2 * wallSide[0], y - 2 * wallSide[1]);
    if (canisters < count.canisters && walls === 1 && roomy && !corridor && far(px, py, 2.5)) {
      const kind = KINDS[canisters % KINDS.length];
      out.push({
        id: `crate-can${canisters}`,
        x: px,
        y: py,
        kind,
        hp: CANISTERS[kind].hp,
        maxHp: CANISTERS[kind].hp,
        hit: -10,
      });
      taken.push([px, py]);
      canisters++;
    } else if (barriers < count.barriers && walls === 0 && ring >= 8 && far(px, py, 2.5)) {
      out.push({
        id: `crate-bar${barriers}`,
        x: px,
        y: py,
        kind: "barrier",
        hp: BARRIER_HP,
        maxHp: BARRIER_HP,
        hit: -10,
      });
      taken.push([px, py]);
      barriers++;
    }
    if (canisters >= count.canisters && barriers >= count.barriers) break;
  }
  return out;
}

/** The round's disaster: warned 10 s ahead, starting 30–55 s in. */
export function scheduleDisaster(mapId, random) {
  const kind = DISASTER_OF[mapId];
  if (!kind) return null;
  const startAt = Math.round(30 + random() * 25);
  return {
    kind,
    warnAt: startAt - DISASTER_WARNING,
    startAt,
    endAt: startAt + DISASTERS[kind].duration,
    strikes: [],
    nextStrike: startAt,
    count: 0,
  };
}

export const disasterActive = (arena, kind) => {
  const d = arena.disaster;
  return !!d && (!kind || d.kind === kind) && arena.time >= d.startAt && arena.time < d.endAt;
};

/** A canister that breaks: red explodes (and breaks nearby cover), green
 * leaves a toxic cloud, pink sets hardening foam, blue heals everyone near. */
export function burstCanister(arena, can, source) {
  const { x, y } = can;
  if (can.kind === "red") {
    arena.breakCover(x, y, 1.1);
    arena.blast(source, x, y, 70, 2.2, { knock: true });
  } else if (can.kind === "green") {
    arena.fields.push({
      id: ++arena.nextEffect,
      owner: source?.id ?? null,
      all: true,
      x,
      y,
      radius: 1.9,
      damage: 14,
      until: arena.time + 7,
      kind: "gas",
    });
    arena.effect(x, y, "toxic", 1.9, 0.8);
  } else if (can.kind === "pink") {
    // Foam fills the canister's tile and open neighbours nobody stands in.
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const fx = Math.floor(x) + dx + 0.5,
        fy = Math.floor(y) + dy + 0.5;
      if (arena.wall(fx, fy)) continue;
      if (
        arena.entities.some(
          (e) => e.hp > 0 && Math.abs(e.x - fx) < 0.75 && Math.abs(e.y - fy) < 0.75,
        )
      )
        continue;
      if (
        arena.crates.some((c) => c.hp > 0 && Math.abs(c.x - fx) < 0.5 && Math.abs(c.y - fy) < 0.5)
      )
        continue;
      arena.crates.push({
        id: `crate-foam${++arena.nextEffect}`,
        x: fx,
        y: fy,
        kind: "foam",
        hp: FOAM.hp,
        maxHp: FOAM.hp,
        hit: -10,
        until: arena.time + FOAM.life,
      });
    }
    arena.effect(x, y, "foam", 1.2, 0.6);
  } else if (can.kind === "blue") {
    for (const e of arena.entities)
      if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) < 1.9) arena.heal(e, 45);
    arena.effect(x, y, "heal", 1.9, 0.8);
  }
}

const roll = (arena, n) => {
  const v = Math.sin(arena.time * 91.17 + n * 12.9898 + arena.disaster.count * 3.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Advance the disaster: storms and quakes mark the ground, then strike. */
export function updateDisaster(arena, dt) {
  const d = arena.disaster;
  if (!d) return;
  for (const e of arena.entities)
    if (e.shockUntil > arena.time && e.hp > 0) arena.damage(e, SHOCK.perSecond * dt, null);
  for (let i = d.strikes.length - 1; i >= 0; i--) {
    const s = d.strikes[i];
    if (arena.time < s.at) continue;
    d.strikes.splice(i, 1);
    if (s.kind === "storm") {
      arena.effect(s.x, s.y, "lightning", 1.3, 0.5);
      const before = new Map(arena.entities.map((e) => [e, e.hp]));
      arena.blast(null, s.x, s.y, 45, 1.3);
      for (const e of arena.entities)
        if (e.hp > 0 && e.hp < before.get(e)) Object.assign(e, { shockUntil: arena.time + SHOCK.seconds, shockFrom: "storm" });
      // Lightning into water electrifies all of it (Calder Quay's canal).
      if (arena.inWater?.({ x: s.x, y: s.y })) arena.electrifyWater(s.x, s.y);
      else arena.addTerrain(s.x, s.y, "scorch");
    } else {
      // The ground splits and buckles; the cover beside it collapses.
      for (const [i, j] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (!arena.wall(s.x + i, s.y + j)) arena.addTerrain(s.x + i, s.y + j, "crack");
      arena.breakCover(s.x, s.y, 1.05);
      arena.effect(s.x, s.y, "debris", 1.3, 0.8);
      arena.blast(null, s.x, s.y, 30, 1.3);
    }
  }
  if (arena.time < d.startAt || arena.time >= d.endAt || arena.time < d.nextStrike) return;
  if (d.kind === "sandstorm") {
    // Sand piles up in drifts on open ground near fighters.
    d.count++;
    d.nextStrike = arena.time + 1.2;
    const living = arena.entities.filter((e) => e.hp > 0);
    const near = living[Math.floor(roll(arena, 2) * living.length)];
    if (!near) return;
    const x = near.x + (roll(arena, 3) - 0.5) * 8,
      y = near.y + (roll(arena, 4) - 0.5) * 8;
    if (x > 1 && y > 1 && !arena.wall(x, y)) arena.addTerrain(x, y, "sand");
    return;
  }
  // Strikes land on open ground near a living fighter; a quake's lands
  // beside cover, which collapses.
  const living = arena.entities.filter((e) => e.hp > 0 && !e.departed);
  if (!living.length) return;
  d.count++;
  d.nextStrike =
    arena.time + (d.kind === "storm" ? 1.1 + roll(arena, 1) * 0.8 : 0.8 + roll(arena, 1) * 0.4);
  const near = living[Math.floor(roll(arena, 2) * living.length)],
    n = arena.level.length;
  for (let tries = 0; tries < 16; tries++) {
    const a = roll(arena, 3 + tries) * Math.PI * 2,
      r =
        d.kind === "storm" ? 0.5 + roll(arena, 30 + tries) * 2.5 : 1 + roll(arena, 30 + tries) * 4,
      tx = Math.floor(near.x + Math.cos(a) * r),
      ty = Math.floor(near.y + Math.sin(a) * r);
    if (tx < 1 || ty < 1 || tx > n - 2 || ty > n - 2) continue;
    const water = arena.inWater?.({ x: tx + 0.5, y: ty + 0.5 });
    if (arena.level[ty][tx] !== 0 && !(water && d.kind === "storm")) continue;
    const beside = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([i, j]) => arena.level[ty + j]?.[tx + i] !== 0);
    if (d.kind === "quake" && !beside) continue;
    d.strikes.push({
      id: ++arena.nextEffect,
      kind: d.kind,
      x: tx + 0.5,
      y: ty + 0.5,
      at: arena.time + STRIKE_DELAY[d.kind],
    });
    return;
  }
}
