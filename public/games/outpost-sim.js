/** Shared, DOM-free simulation for offline games and authoritative online rooms. */
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const LEVEL = [
  "1111111111111111",
  "1000000000000001",
  "1000000000000001",
  "1000220000110001",
  "1000220000110001",
  "1000000000000001",
  "1000000000000001",
  "1000000330000001",
  "1000000330000001",
  "1000000000000001",
  "1001100000220001",
  "1001100000220001",
  "1000000000000001",
  "1000000000000001",
  "1000000000000001",
  "1111111111111111",
].map((row) => [...row].map(Number));
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
export class Arena {
  constructor({
    mode = "training",
    humans = [{ id: "player", team: 0 }],
    random = Math.random,
  } = {}) {
    this.mode = mode;
    this.time = 0;
    this.state = "playing";
    this.winner = null;
    this.events = [];
    this.zone = { half: 7, delay: 12, duration: 150, minHalf: 0.6 };
    this.level = LEVEL.map((row) => [...row]);
    if (mode !== "training")
      for (let y = 7; y <= 8; y++) for (let x = 7; x <= 8; x++) this.level[y][x] = 0;
    const points = SPAWNS.map((p) => [...p]);
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
      let [x, y] = mode === "duo" ? TEAM_SPAWNS[team] : points[i];
      if (mode === "duo") x += slot * 0.8;
      if (mode === "training") {
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
        a: mode === "training" ? -0.18 : Math.atan2(8 - y, 8 - x),
        pitch: 0,
        hp: mode === "training" && !human ? 120 : 100,
        maxHp: mode === "training" && !human ? 120 : 100,
        damage: human ? 40 : 16,
        cores: 0,
        exposure: 0,
        hit: -10,
        shotAt: -10,
        ammo: 24,
        reloadUntil: 0,
        notice: "",
        noticeId: 0,
        kills: 0,
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
      this.crates = [
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
      ].map(([x, y], i) => ({ id: "crate" + i, x, y, hp: 80, maxHp: 80, hit: -10 }));
  }
  static restore(data) {
    const arena = Object.create(Arena.prototype);
    Object.assign(arena, data);
    arena.events = [];
    return arena;
  }
  snapshot() {
    return {
      mode: this.mode,
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
    return Math.abs(e.x - 8) > this.zone.half || Math.abs(e.y - 8) > this.zone.half;
  }
  updateZone() {
    this.zone.half =
      7 - (7 - this.zone.minHalf) * clamp((this.time - this.zone.delay) / this.zone.duration, 0, 1);
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
    target.hp = Math.max(0, target.hp - amount);
    target.hit = this.time;
    if (target.hp > 0) return;
    if (target.id.startsWith("crate")) {
      this.cores.push({ x: target.x, y: target.y });
      if (source) this.emit(source.id, "SUPPLY CRATE OPEN / COLLECT THE CORE");
      return;
    }
    if (source) {
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
        e.maxHp += 25;
        e.hp = Math.min(e.maxHp, e.hp + 25);
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
    e.ammo = 24;
    e.respawnAt = 0;
    e.reloadUntil = 0;
    e.path = [];
    e.nextPath = 0;
    e.hit = -10;
    e.shotAt = -10;
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
    for (const e of this.entities) if (e.respawnAt && !teams.has(e.team)) e.respawnAt = 0;
    if (teams.size <= 1) {
      this.state = "ended";
      this.winner = teams.size ? [...teams][0] : null;
    }
  }
  reload(e) {
    if (e.hp > 0 && !e.reloadUntil && e.ammo < 24) {
      e.reloadUntil = this.time + 1.4;
      this.emit(e.id, "RELOADING");
    }
  }
  shoot(e) {
    if (e.hp <= 0 || this.state === "ended" || e.reloadUntil || this.time - e.shotAt < 0.14) return;
    if (e.ammo <= 0) {
      this.reload(e);
      return;
    }
    e.ammo--;
    e.shotAt = this.time;
    const target = this.rayTarget(e, Math.cos(e.a), Math.sin(e.a), [
      ...this.entities,
      ...this.crates,
    ]);
    if (
      target &&
      Math.abs((e.pitch || 0) * Math.hypot(target.x - e.x, target.y - e.y)) <
        (target.id.startsWith("crate") ? 0.32 : 0.48)
    )
      this.damage(target, e.damage, e);
    this.checkResult();
  }
  pathTo(e, target) {
    const sx = Math.floor(e.x),
      sy = Math.floor(e.y),
      tx = Math.floor(target.x),
      ty = Math.floor(target.y),
      key = (x, y) => y * 16 + x;
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
          nx > 14 ||
          ny > 14 ||
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
    if (this.mode === "training") {
      const p = this.entities.find((e) => !e.bot);
      if (!p || p.hp <= 0) return;
      const dx = p.x - bot.x,
        dy = p.y - bot.y,
        d = Math.hypot(dx, dy);
      if (d > 0 && d < 10 && this.visible(bot, p)) {
        if (d > 1.25) this.move(bot, (dx / d) * dt * 0.55, (dy / d) * dt * 0.55);
        if (d < 6 && this.time > bot.attack) {
          bot.attack = this.time + 1.6;
          this.damage(p, d < 2 ? 9 : 4, bot);
        }
      }
      return;
    }
    const rivals = this.entities.filter((e) => e !== bot && e.hp > 0 && e.team !== bot.team),
      dist = (e) => Math.hypot(e.x - bot.x, e.y - bot.y),
      nearest = (list) => [...list].sort((a, b) => dist(a) - dist(b))[0];
    const foe = nearest(rivals.filter((e) => dist(e) < 7 && this.visible(bot, e))),
      box = nearest(this.crates.filter((c) => c.hp > 0 && !this.outsideSafe(c))),
      core = nearest(this.cores.filter((c) => !this.outsideSafe(c)));
    let goal;
    if (this.outsideSafe(bot)) goal = { x: 8, y: 8 };
    else if (core && dist(core) < 4) goal = core;
    else if (foe) goal = foe;
    else if (box) goal = box;
    else goal = nearest(rivals) || { x: 8, y: 8 };
    if (this.time >= bot.nextPath) {
      bot.path = this.pathTo(bot, goal);
      bot.nextPath = this.time + 0.65;
    }
    const stop = goal === foe ? 2.1 : goal === box ? 1.2 : 0.25;
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
        if (d > 0.01) this.move(bot, (dx / d) * dt * 1.25, (dy / d) * dt * 1.25);
      }
    }
    const target = foe || (box && dist(box) < 3 && this.visible(bot, box) ? box : null);
    if (target && dist(target) < 6 && this.time >= bot.attack) {
      bot.attack = this.time + 1.05;
      const dx = target.x - bot.x,
        dy = target.y - bot.y,
        d = Math.hypot(dx, dy);
      if (d > 0.01) {
        const hit = this.rayTarget(bot, dx / d, dy / d, [...this.entities, ...this.crates]);
        if (hit) this.damage(hit, bot.damage, bot);
      }
    }
    this.collectCores(bot);
  }
  advance(dt, inputs = {}) {
    if (this.state === "ended") return;
    this.time += dt;
    for (const e of this.entities) {
      if (e.respawnAt && this.time >= e.respawnAt) this.respawn(e);
      if (e.reloadUntil && this.time >= e.reloadUntil) {
        e.ammo = 24;
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
      const speed = input.sprint ? 4 : 2.6,
        ca = Math.cos(e.a),
        sa = Math.sin(e.a);
      this.move(e, (ca * f - sa * s) * speed * dt, (sa * f + ca * s) * speed * dt);
      if (input.reload) this.reload(e);
      if (input.fire) this.shoot(e);
    }
    if (this.state === "ended") return;
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
