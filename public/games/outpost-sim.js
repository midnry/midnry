/** Shared, DOM-free simulation for offline games and authoritative online rooms. */
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
import { LEVEL, MAPS, WEAPONS, mapOf, weaponOf } from "./outpost-content.js";
export { LEVEL, MAPS, WEAPONS, mapOf, weaponOf };
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
  easy: { speed: 0.7, reaction: 1.5, aim: 0.13, awareness: 5 },
  normal: { speed: 1, reaction: 1, aim: 0, awareness: 7 },
  hard: { speed: 1.25, reaction: 0.8, aim: 0, awareness: 9 },
};
export const difficultyOf = (id) => (Object.hasOwn(DIFFICULTIES, id) ? id : "normal");
export class Arena {
  constructor({
    mode = "training",
    mapId = "outpost",
    weapon = "carbine",
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
    this.level = mapOf(this.mapId).level.map((row) => [...row]);
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
    const spawns =
      this.mapId === "outpost"
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
    const teamSpawns =
      this.mapId === "outpost" ? TEAM_SPAWNS : [spawns[0], spawns[2], spawns[4], spawns[6]];
    const points = spawns.map((p) => [...p]);
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }
    this.entities = [];
    this.crates = [];
    this.cores = [];
    const seats = mode === "training" ? 7 : 8;
    const teamCounts = [0, 0, 0, 0];
    for (let i = 0; i < seats; i++) {
      const human = humans[i];
      const team = mode === "duo" ? (human?.team ?? teamCounts.findIndex((n) => n < 2)) : i;
      if (mode === "duo") teamCounts[team]++;
      const slot = mode === "duo" ? teamCounts[team] - 1 : 0;
      let [x, y] = mode === "duo" ? teamSpawns[team] : points[i];
      if (mode === "duo") x += slot * 0.8;
      if (mode === "training" && this.mapId === "outpost") {
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
      this.entities.push({
        id: human?.id ?? "bot" + i,
        name: human?.name ?? "Sentry " + i,
        team,
        bot: !human,
        x,
        y,
        a: mode === "training" ? -0.18 : Math.atan2(center - y, center - x),
        pitch: 0,
        weapon: weaponOf(
          human?.weapon ??
            (human ? weapon : mode === "training" ? "carbine" : Object.keys(WEAPONS)[i % 11]),
        ).id,
        charge: 0,
        cloakedUntil: 0,
        speedUntil: 0,
        poisonUntil: 0,
        poisonTick: 0,
        poisonSource: null,
        poisonDamage: 0,
        slowUntil: 0,
        sprinting: false,
        slideUntil: 0,
        slideCooldown: 0,
        slideHeld: false,
        slideDx: 0,
        slideDy: 0,
        damageSeq: 0,
        damageTotal: 0,
        damageAngle: null,
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
        ammo: weaponOf(
          human?.weapon ??
            (human ? weapon : mode === "training" ? "carbine" : Object.keys(WEAPONS)[i % 11]),
        ).mag,
        reloadUntil: 0,
        notice: "",
        noticeId: 0,
        kills: 0,
        damageDealt: 0,
        coresCollected: 0,
        placement: 0,
        eliminatedAt: null,
        respawns: mode === "duo" ? 2 : 0,
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
        mapOf(this.mapId).crates ?? [
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
          mapOf(this.mapId).crates
            ? [x, y]
            : this.mapId === "outpost"
              ? [x, y]
              : [Math.floor((x * size) / 16) + 0.5, Math.floor((y * size) / 16) + 0.5],
        )
        .filter(
          ([x, y]) =>
            !this.wall(x, y) && !this.entities.some((e) => Math.hypot(e.x - x, e.y - y) < 1),
        )
        .map(([x, y], i) => ({ id: "crate" + i, x, y, hp: 80, maxHp: 80, hit: -10 }));
    if (this.mapId !== "outpost")
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
      if (type || distance > max) {
        const u = side ? x + dx * distance : y + dy * distance;
        return { distance, type, side, u: u - Math.floor(u), mx, my };
      }
    }
    return { distance: max, type: 1, side: 0, u: 0, mx, my };
  }
  canMove(x, y, r = 0.2) {
    return (
      !this.wall(x - r, y - r) &&
      !this.wall(x + r, y - r) &&
      !this.wall(x - r, y + r) &&
      !this.wall(x + r, y + r) &&
      !this.crates.some(
        (c) => c.hp > 0 && Math.abs(x - c.x) < r + 0.32 && Math.abs(y - c.y) < r + 0.32,
      )
    );
  }
  move(e, dx, dy) {
    if (this.canMove(e.x + dx, e.y)) e.x += dx;
    if (this.canMove(e.x, e.y + dy)) e.y += dy;
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
        radius = e.id.startsWith("crate") ? 0.38 : 0.3;
      if (along <= 0 || across >= radius) continue;
      const entry = along - Math.sqrt(radius * radius - across * across);
      if (entry < nearest) {
        target = e;
        nearest = entry;
      }
    }
    return target;
  }
  visible(a, b) {
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
    if (this.mode === "duo" && source && source !== target && source.team === target.team) return;
    const actual = Math.min(target.hp, amount);
    target.hp = Math.max(0, target.hp - amount);
    if (!target.id.startsWith("crate")) {
      target.damageSeq = (target.damageSeq || 0) + 1;
      target.damageTotal = (target.damageTotal || 0) + actual;
      target.damageAngle = source ? Math.atan2(source.y - target.y, source.x - target.x) : null;
      target.cloakedUntil = 0;
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
      this.cores.push({ x: target.x, y: target.y });
      if (source) this.emit(source.id, "SUPPLY CRATE OPEN / COLLECT THE CORE");
      return;
    }
    if (source && source !== target) {
      source.kills++;
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
  effect(x, y, kind, radius = 1) {
    this.fx.push({ id: ++this.nextEffect, x, y, kind, radius, until: this.time + 0.45 });
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
        if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= radius) this.level[j][i] = 0;
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
    for (let i = 0; i < count; i++) {
      const a = e.a + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread * 2);
      const t = this.rayTarget(e, Math.cos(a), Math.sin(a), [...this.entities, ...this.crates]);
      if (!t) continue;
      const d = Math.hypot(t.x - e.x, t.y - e.y);
      if (d > range || Math.abs((e.pitch || 0) * d) > (t.id.startsWith("crate") ? 0.32 : 0.48))
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
      e.reloadUntil = this.time + 1.4;
      e.burst = null;
      this.emit(e.id, "RELOADING");
    }
  }
  shoot(e) {
    if (this.countdown > 0) return false;
    const w = weaponOf(e.weapon);
    if (
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
        const source = this.entities.find((e) => e.id === field.owner);
        if (!source) continue;
        for (const e of this.entities)
          if (
            e !== source &&
            e.hp > 0 &&
            !(this.mode === "duo" && e.team === source.team) &&
            Math.hypot(e.x - field.x, e.y - field.y) < field.radius &&
            this.visible(field, e)
          ) {
            e.slowUntil = this.time + 0.15;
            this.damage(e, field.damage * dt, source);
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
      parents = new Map([[key(sx, sy), null]]);
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
        if (
          this.crates.some((c) => c.hp > 0 && Math.floor(c.x) === nx && Math.floor(c.y) === ny) &&
          !(nx === tx && ny === ty)
        )
          continue;
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
      if (d > 0 && d < 10 && this.visible(bot, p)) {
        if (d > 1.25)
          this.move(bot, (dx / d) * dt * 0.55 * skill.speed, (dy / d) * dt * 0.55 * skill.speed);
        if (d < 6 && this.time > bot.attack) {
          bot.attack = this.time + 1.6 * skill.reaction;
          this.damage(p, d < 2 ? 9 : 4, bot);
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
    const foe = nearest(rivals.filter((e) => dist(e) < skill.awareness && this.visible(bot, e))),
      box = nearest(this.crates.filter((c) => c.hp > 0 && !this.outsideSafe(c))),
      core = nearest(this.cores.filter((c) => !this.outsideSafe(c)));
    let goal;
    if (this.outsideSafe(bot)) goal = { x: this.zone.cx, y: this.zone.cy };
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
    if (dist(goal) > stop) {
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
        if (d > 0.01)
          this.move(bot, (dx / d) * dt * 1.25 * skill.speed, (dy / d) * dt * 1.25 * skill.speed);
      }
    }
    const target = foe || (box && dist(box) < 3 && this.visible(bot, box) ? box : null);
    if (target && dist(target) < weaponOf(bot.weapon).range && this.time >= bot.attack) {
      bot.attack = this.time + Math.max(0.5, weaponOf(bot.weapon).cooldown) * skill.reaction;
      bot.a =
        Math.atan2(target.y - bot.y, target.x - bot.x) +
        Math.sin(this.time * 3 + bot.phase) * skill.aim;
      bot.pitch = 0;
      if (bot.charge >= 100) this.super(bot);
      this.shoot(bot);
    } else if (goal) bot.a = Math.atan2(goal.y - bot.y, goal.x - bot.x);
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
      if (Number.isFinite(input.pitch)) e.pitch = clamp(input.pitch, -1, 1);
      let f = clamp(Number(input.forward) || 0, -1, 1),
        s = clamp(Number(input.strafe) || 0, -1, 1);
      const len = Math.max(1, Math.hypot(f, s));
      f /= len;
      s /= len;
      const ca = Math.cos(e.a), sa = Math.sin(e.a);
      if (input.slide && !e.slideHeld && input.sprint && f > 0.2 &&
          this.time >= (e.slideCooldown || 0)) {
        e.slideUntil = this.time + 0.65;
        e.slideCooldown = this.time + 1.6;
        const direction = Math.hypot(f, s);
        e.slideDx = (ca * f - sa * s) / direction;
        e.slideDy = (sa * f + ca * s) / direction;
      }
      e.slideHeld = !!input.slide;
      const sliding = e.slideUntil > this.time;
      e.sprinting = !sliding && !!input.sprint && Math.hypot(f, s) > 0.1;
      const speed =
          (sliding ? 3 + 3 * ((e.slideUntil - this.time) / 0.65) : input.sprint ? 4 : 2.6) *
          (e.speedUntil > this.time ? 1.4 : 1) *
          (e.slowUntil > this.time ? 0.45 : 1);
      this.move(e, (sliding ? e.slideDx : ca * f - sa * s) * speed * dt,
        (sliding ? e.slideDy : sa * f + ca * s) * speed * dt);
      if (input.reload) this.reload(e);
      if (input.super) this.super(e);
      if (input.fire) this.shoot(e);
    }
    if (this.state === "ended") return;
    this.updateEffects(dt);
    if (this.mode !== "training") this.updateZone();
    for (const e of this.entities) {
      if (e.bot) this.updateRival(e, dt);
      if (this.mode !== "training") {
        this.collectCores(e);
        this.applyHaze(e, dt);
      }
    }
    this.checkResult();
  }
}
