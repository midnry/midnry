/** Cosmetic presentation only: never writes match entities, input or collision rules. */
import { mapOf, weaponOf } from "./outpost-sim.js";
const TAU = Math.PI * 2;
const DECOR = {
  outpost: [
    [1.5, 4.5, "cactus"],
    [14.5, 10.5, "antenna"],
    [2.5, 9.5, "drums"],
    [13.5, 2.5, "rubble"],
    [1.5, 12.5, "cactus"],
  ],
  testblock: [
    [1.5, 3.5, "planter"],
    [14.5, 12.5, "planter"],
    [2.5, 7.5, "mailbox"],
    [13.5, 7.5, "mailbox"],
    [5.5, 5.5, "lamp"],
  ],
  skyport: [
    [5.5, 10.5, "cart"],
    [4.5, 4.5, "planter"],
    [17.5, 19.5, "cone"],
    [16.5, 4.5, "beacon"],
    [7.5, 8.5, "cart"],
  ],
  freight: [
    [1.5, 3.5, "drums"],
    [10.5, 7.5, "pallet"],
    [1.5, 10.5, "cone"],
    [10.5, 1.5, "beacon"],
  ],
  estate: [
    [14.5, 11.5, "palm"],
    [5.5, 4.5, "planter"],
    [11.5, 9.5, "rubble"],
    [15.5, 16.5, "chair"],
    [2.5, 9.5, "palm"],
  ],
};
export class ComicArt {
  constructor(g) {
    this.g = g;
    this.cache = new Map();
    this.reset();
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
  }
  reset() {
    this.particles = [];
    this.marks = [];
    this.actors = new Map();
    this.effects = new Set();
    this.tiles = null;
    this.lastTime = -1;
    this.map = null;
    this.shot = -10;
    this.weaponParticles = [];
  }
  clearCache() {
    this.cache.clear();
  }
  extras() {
    const g = this.g;
    return (DECOR[g.arena.mapId] || [])
      .filter(([x, y]) => !g.arena.wall(x, y))
      .map(([x, y, kind]) => ({
        x,
        y,
        kind,
        label: kind,
        size: kind === "palm" || kind === "antenna" ? 1.35 : kind === "cone" ? 0.35 : 0.65,
        aspect: kind === "cart" || kind === "chair" || kind === "pallet" ? 1.15 : 0.8,
      }));
  }
  interior(map, p) {
    return (
      (map.id === "skyport" && p.x > 3 && p.x < 14 && p.y > 3 && p.y < 11) ||
      (map.id === "testblock" &&
        p.y > 4 &&
        p.y < 11 &&
        ((p.x > 3 && p.x < 6) || (p.x > 9 && p.x < 12))) ||
      (map.id === "estate" &&
        p.y > 3 &&
        p.y < 7 &&
        ((p.x > 3 && p.x < 7) || (p.x > 12 && p.x < 16)))
    );
  }
  background(map, p, horizon) {
    const g = this.g,
      c = g.ctx,
      w = g.w,
      t = this.motion.matches ? 0 : g.animationTime;
    c.save();
    c.lineWidth = 2;
    c.strokeStyle = "#26323e";
    // Cel clouds and parallax silhouettes give each setting a recognizable horizon.
    for (let i = 0; i < 4; i++) {
      const x = ((((i * 0.29 - p.a * 0.12 + t * 0.0007) % 1) + 1) % 1) * w,
        y = horizon * (0.18 + (i % 2) * 0.18);
      c.fillStyle = "#ffe7b466";
      c.beginPath();
      c.ellipse(x, y, w * 0.07, Math.max(4, horizon * 0.024), 0, 0, TAU);
      c.fill();
    }
    const offset = ((((p.a / TAU) % 1) + 1) % 1) * w;
    const skyline = (x, y, width, height, color) => {
      c.fillStyle = color;
      c.fillRect((x - offset + w * 2) % (w * 1.2), y, width, height);
    };
    if (map.id === "skyport") {
      skyline(w * 0.15, horizon - 100, w * 0.045, 100, "#526879");
      skyline(w * 0.13, horizon - 112, w * 0.085, 24, "#243d51");
      skyline(w * 0.6, horizon - 30, w * 0.3, 30, "#596d78");
      const x = ((((t * 0.007 - p.a * 0.08) % 1) + 1) % 1) * w;
      c.fillStyle = "#263d51";
      c.beginPath();
      c.moveTo(x, horizon * 0.3);
      c.lineTo(x + 40, horizon * 0.3 + 3);
      c.lineTo(x + 20, horizon * 0.3 - 10);
      c.lineTo(x + 28, horizon * 0.3 + 3);
      c.lineTo(x + 10, horizon * 0.3 + 12);
      c.closePath();
      c.fill();
    } else if (map.id === "freight") {
      for (let i = 0; i < 3; i++) {
        const x = (w * (0.12 + i * 0.35) - offset + w * 2) % w;
        c.strokeStyle = "#344b55";
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x, horizon);
        c.lineTo(x, horizon - 100);
        c.lineTo(x + 75, horizon - 100);
        c.lineTo(x + 75, horizon - 35);
        c.stroke();
      }
    } else if (map.id === "testblock") {
      skyline(w * 0.65, horizon - 90, 16, 90, "#715b63");
      skyline(w * 0.61, horizon - 110, 70, 28, "#b97967");
    } else if (map.id === "estate") {
      for (let i = 0; i < 3; i++)
        skyline(w * (i * 0.32), horizon - 40 - i * 7, w * 0.14, 60, "#8c6b73");
    }
    if (this.interior(map, p)) {
      c.fillStyle = "#24303a";
      c.fillRect(0, 0, w, horizon);
      c.strokeStyle = "#111c27";
      c.lineWidth = 3;
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(w * 0.5 + i * w * 0.3, 0);
        c.lineTo(w * 0.5 + i * w * 0.04, horizon);
        c.stroke();
      }
      c.fillStyle = "#ffe2a5";
      c.fillRect(w * 0.35, horizon * 0.23, w * 0.3, Math.max(3, horizon * 0.04));
    }
    c.restore();
  }
  decorate(c, map, type, n) {
    // Painted facades remain tied to real wall surfaces, rather than floating overlays.
    c.save();
    c.scale(n / 256, n / 256);
    c.lineWidth = 3;
    c.strokeStyle = "#101720";
    c.strokeStyle = "#101720b0";
    c.beginPath();
    c.moveTo(0, 43);
    c.bezierCurveTo(80, 68, 160, 30, 256, 53);
    c.stroke();
    if (map.id === "freight") {
      c.fillStyle = "#13273540";
      for (let x = 8; x < 256; x += 16) c.fillRect(x, 15, 3, 225);
      c.fillStyle = "#e6d8ad";
      c.fillRect(28, 78, 95, 30);
      c.fillStyle = "#15222e";
      c.font = "bold 15px monospace";
      c.fillText("MR / 09", 34, 99);
      c.fillStyle = "#f3bd49";
      c.fillRect(162, 182, 50, 23);
      c.fillStyle = "#101720";
      c.font = "bold 10px monospace";
      c.fillText("CAUTION", 165, 198);
    } else if (map.id === "skyport") {
      c.fillStyle = "#13394d";
      c.fillRect(32, 62, 192, 60);
      c.strokeRect(32, 62, 192, 60);
      c.fillStyle = "#91d9e1";
      c.fillRect(36, 66, 182, 7);
      for (let x = 64; x < 224; x += 48) {
        c.fillStyle = "#d0e0df";
        c.fillRect(x, 62, 5, 60);
      }
      c.fillStyle = "#132d40";
      c.fillRect(48, 155, 160, 27);
      c.fillStyle = "#f9e9be";
      c.font = "bold 12px monospace";
      c.fillText(type === 6 ? "SKYLINE AIR" : "GATES 07 →", 61, 173);
    } else if (map.id === "testblock" && [2, 4].includes(type)) {
      c.fillStyle = "#efdcbc";
      c.fillRect(21, 62, 214, 100);
      c.strokeRect(21, 62, 214, 100);
      c.fillStyle = "#19394e";
      c.fillRect(32, 72, 192, 76);
      c.fillStyle = "#79afb7";
      c.beginPath();
      c.moveTo(36, 76);
      c.lineTo(92, 76);
      c.lineTo(36, 140);
      c.fill();
      c.fillStyle = "#efdcbc";
      c.fillRect(121, 68, 7, 87);
      c.fillRect(26, 108, 204, 5);
    } else {
      c.strokeStyle = "#10172080";
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(175 + i * 4, 170);
        c.lineTo(165 + i * 4, 192);
        c.stroke();
      }
      c.fillStyle = "#eadbad";
      c.fillRect(20, 172, 55, 34);
      c.fillStyle = "#101720";
      c.font = "bold 11px monospace";
      c.fillText(map.id === "estate" ? "VILLA" : "SECTOR", 23, 187);
      c.fillText("04", 36, 200);
    }
    c.restore();
  }
  scenery(prop) {
    const density = this.g.academy.preset === "high" ? 3 : 2,
      key = `prop:${prop.kind}:${density}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const s = document.createElement("canvas");
    s.width = 128 * density;
    s.height = 160 * density;
    const c = s.getContext("2d");
    c.scale(density, density);
    c.lineWidth = 4;
    c.strokeStyle = "#101720";
    c.lineJoin = "round";
    const poly = (pts, color) => {
      c.fillStyle = this.g.academy.materialFill(c, color, pts);
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
      c.stroke();
    };
    const box = (x, y, w, h, color) =>
      poly(
        [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
        color,
      );
    const ellipse = (x, y, rx, ry, color) => {
      c.fillStyle = color;
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, TAU);
      c.fill();
      c.stroke();
    };
    const plant = () => {
      for (let i = 0; i < 5; i++)
        poly(
          [
            [64, 112],
            [18 + i * 20, 55 + (i % 2) * 14],
            [55 + i * 3, 86],
          ],
          i % 2 ? "#729951" : "#4c7661",
        );
    };
    if (prop.kind === "cactus") {
      box(49, 46, 30, 103, "#5f9f72");
      box(24, 72, 25, 22, "#5f9f72");
      box(22, 48, 14, 45, "#5f9f72");
      box(79, 97, 25, 18, "#5f9f72");
      box(95, 72, 14, 41, "#5f9f72");
      c.strokeStyle = "#d6d997";
      c.lineWidth = 2;
      for (let y = 60; y < 139; y += 14) {
        c.beginPath();
        c.moveTo(58, y);
        c.lineTo(64, y - 6);
        c.stroke();
      }
    } else if (prop.kind === "palm") {
      poly(
        [
          [58, 151],
          [63, 48],
          [75, 48],
          [76, 151],
        ],
        "#a57b51",
      );
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7;
        poly(
          [
            [68, 46],
            [68 + Math.cos(a) * 53, 46 + Math.sin(a) * 34],
            [68 + Math.cos(a + 0.4) * 35, 46 + Math.sin(a + 0.4) * 25],
          ],
          i % 2 ? "#3e7e64" : "#75aa67",
        );
      }
    } else if (prop.kind === "planter") {
      plant();
      poly(
        [
          [33, 103],
          [95, 103],
          [85, 149],
          [43, 149],
        ],
        "#b77156",
      );
      box(29, 99, 70, 12, "#e3b583");
    } else if (prop.kind === "cone") {
      poly(
        [
          [64, 72],
          [89, 142],
          [39, 142],
        ],
        "#f58a48",
      );
      poly(
        [
          [50, 110],
          [78, 110],
          [83, 125],
          [45, 125],
        ],
        "#f3e8cb",
      );
      box(27, 142, 74, 9, "#384a51");
    } else if (prop.kind === "drums") {
      for (let x of [13, 67]) {
        box(x, 78, 47, 66, x === 13 ? "#bd7257" : "#45777b");
        ellipse(x + 23, 78, 23, 7, "#d8b786");
        box(x, 97, 47, 5, "#21353f");
        box(x, 131, 47, 5, "#21353f");
        c.fillStyle = "#f1c55b";
        c.fillRect(x + 14, 109, 18, 13);
      }
    } else if (prop.kind === "cart") {
      box(17, 111, 94, 10, "#7799a2");
      box(21, 74, 38, 36, "#b76f57");
      box(60, 65, 37, 46, "#718ba6");
      box(27, 55, 27, 18, "#e9ba6b");
      c.beginPath();
      c.moveTo(103, 111);
      c.lineTo(103, 44);
      c.lineTo(116, 44);
      c.stroke();
      ellipse(29, 135, 11, 11, "#24353f");
      ellipse(96, 135, 11, 11, "#24353f");
    } else if (prop.kind === "pallet") {
      for (let i = 0; i < 4; i++) box(13, 91 + i * 13, 100, 10, "#b78a5f");
      box(20, 75, 40, 14, "#7d9c97");
      box(63, 60, 41, 29, "#cc8e55");
    } else if (prop.kind === "rubble") {
      for (let i = 0; i < 6; i++)
        poly(
          [
            [12 + i * 16, 147],
            [20 + i * 15, 107 + (i % 3) * 11],
            [40 + i * 13, 145],
          ],
          i % 2 ? "#9d806c" : "#5b6266",
        );
    } else if (prop.kind === "chair") {
      poly(
        [
          [28, 111],
          [35, 60],
          [83, 67],
          [92, 121],
        ],
        "#efceb1",
      );
      box(27, 117, 68, 10, "#5c777c");
      box(28, 126, 9, 28, "#3f555e");
      box(84, 126, 9, 28, "#3f555e");
    } else if (prop.kind === "mailbox") {
      box(59, 99, 9, 53, "#485e66");
      box(26, 70, 77, 30, "#c88972");
      c.fillStyle = "#e9dcae";
      c.fillRect(43, 79, 39, 6);
      box(97, 54, 9, 34, "#e47c59");
    } else if (prop.kind === "lamp" || prop.kind === "beacon") {
      box(58, 45, 12, 106, "#4d6874");
      box(38, 38, 52, 20, "#f7d279");
      box(32, 32, 64, 8, "#344653");
    } else if (prop.kind === "antenna") {
      box(61, 23, 7, 129, "#657984");
      for (let y = 40; y < 125; y += 23) box(35, y, 59, 4, "#9dabac");
      ellipse(66, 19, 7, 7, "#f28360");
    }
    this.cache.set(key, s);
    return s;
  }
  burst(x, y, height, color, count = 9) {
    const g = this.g,
      n = g.academy.preset === "performance" ? Math.min(4, count) : count,
      cap = g.academy.preset === "high" ? 160 : 80;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + g.time;
      this.particles.push({
        x,
        y,
        h: height,
        vx: Math.cos(a) * (0.3 + (i % 3) * 0.25),
        vy: Math.sin(a) * (0.3 + (i % 3) * 0.25),
        vh: 0.3 + (i % 4) * 0.2,
        born: g.time,
        life: 0.5 + (i % 4) * 0.14,
        color,
      });
    }
    if (this.particles.length > cap) this.particles.splice(0, this.particles.length - cap);
  }
  observe() {
    const g = this.g,
      t = g.time;
    if (this.map !== g.arena.mapId || t < this.lastTime) {
      this.reset();
      this.map = g.arena.mapId;
    }
    for (const e of [...g.arena.entities, ...g.crates]) {
      const old = this.actors.get(e.id);
      if (old && e.hp < old.hp && e.id !== g.selfId)
        this.burst(
          e.x,
          e.y,
          0.45,
          e.id.startsWith("crate") ? "#dfaa66" : "#ffd584",
          e.hp <= 0 ? 16 : 6,
        );
      const moving = old && Math.hypot(e.x - old.x, e.y - old.y) > 0.002;
      this.actors.set(e.id, {
        hp: e.hp,
        x: e.x,
        y: e.y,
        movingUntil: moving ? t + 0.15 : old?.movingUntil || 0,
      });
    }
    for (const fx of g.arena.fx)
      if (!this.effects.has(fx.id)) {
        this.effects.add(fx.id);
        if (fx.kind === "blast") this.burst(fx.x, fx.y, 0.1, "#f59a56", 24);
      }
    if (this.effects.size > 160) this.effects = new Set(g.arena.fx.map((f) => f.id));
    if (this.tiles)
      g.level.forEach((row, y) =>
        row.forEach((v, x) => {
          if (!v && this.tiles[y]?.[x]) this.burst(x + 0.5, y + 0.5, 0.3, "#bc9a77", 18);
        }),
      );
    this.tiles = g.level.map((row) => row.slice());
    const p = g.player,
      w = weaponOf(p.weapon);
    if (p.shotAt !== this.shot && p.shotAt >= 0) {
      const fresh = t - p.shotAt < 0.25;
      if (fresh) {
        if (["rifle", "burst", "shotgun"].includes(w.kind)) {
          this.weaponParticles.push({ born: t, kind: "shell", color: "#efc572" });
          const dx = Math.cos(p.a),
            dy = Math.sin(p.a),
            target = g.arena.rayTarget(p, dx, dy, [...g.enemies, ...g.crates]);
          if (!target) {
            const hit = g.arena.cast(p.x, p.y, dx, dy),
              x = p.x + dx * (hit.distance - 0.06),
              y = p.y + dy * (hit.distance - 0.06);
            if (hit.distance <= w.range) {
              this.burst(x, y, 0.5, hit.type === 1 ? "#e6c99f" : "#ffde76", 5);
              this.marks.push({
                x,
                y,
                h: 0.5 - p.pitch * hit.distance,
                mx: hit.mx,
                my: hit.my,
                born: t,
              });
              if (this.marks.length > 24) this.marks.shift();
            }
          }
        }
        if (!["melee", "dash"].includes(w.kind))
          this.weaponParticles.push({ born: t, kind: "smoke", color: "#dce4dd" });
      }
      this.shot = p.shotAt;
    }
    this.particles = this.particles.filter((p) => t - p.born < p.life);
    this.marks = this.marks.filter((m) => t - m.born < 18 && g.arena.wall(m.mx + 0.5, m.my + 0.5));
    this.weaponParticles = this.weaponParticles.filter((p) => t - p.born < 0.65).slice(-16);
    this.lastTime = t;
  }
  project(x, y, height = 0) {
    const g = this.g,
      p = g.camera(),
      dx = x - p.x,
      dy = y - p.y,
      ca = Math.cos(p.a),
      sa = Math.sin(p.a),
      z = dx * ca + dy * sa;
    if (z < 0.15) return null;
    const sx = g.w * 0.5 + ((-dx * sa + dy * ca) * g.projection) / z;
    if (sx < 0 || sx >= g.w || z > g.depth[Math.floor(sx)] + 0.12) return null;
    return { x: sx, y: g.h * 0.5 + g.viewPitch + (g.projection * (0.5 - height)) / z, z };
  }
  effectsWorld() {
    const g = this.g,
      c = g.ctx,
      t = g.animationTime;
    c.save();
    for (const m of this.marks) {
      const v = this.project(m.x, m.y, m.h);
      if (!v) continue;
      const r = Math.min(12, (g.projection * 0.018) / v.z);
      c.globalAlpha = Math.max(0, Math.min(1, (18 - (t - m.born)) / 3));
      c.fillStyle = "#121c27";
      c.beginPath();
      c.arc(v.x, v.y, r, 0, TAU);
      c.fill();
      c.strokeStyle = "#1c2932";
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.9;
        c.beginPath();
        c.moveTo(v.x, v.y);
        c.lineTo(v.x + Math.cos(a) * r * 2, v.y + Math.sin(a) * r * 2);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
    for (const q of this.particles) {
      const age = t - q.born,
        travel = this.motion.matches ? 0 : age,
        h = q.h + q.vh * travel - travel * travel * 0.7,
        v = this.project(q.x + q.vx * travel, q.y + q.vy * travel, Math.max(0.015, h));
      if (!v) continue;
      const r = Math.max(1, Math.min(11, (g.projection * 0.024) / v.z));
      c.globalAlpha = Math.max(0, 1 - age / q.life);
      c.fillStyle = q.color;
      c.strokeStyle = "#101720";
      c.lineWidth = 1;
      c.fillRect(v.x - r, v.y - r, r * 2, r * 2);
      c.strokeRect(v.x - r, v.y - r, r * 2, r * 2);
    }
    for (const fx of g.arena.fx.filter((f) => f.kind === "blast")) {
      const age = 1 - Math.max(0, (fx.until - t) / 0.45),
        v = this.project(fx.x, fx.y, 0.12);
      if (!v) continue;
      c.globalAlpha = (1 - age) * 0.65;
      c.strokeStyle = "#ffdb86";
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(
        v.x,
        v.y,
        Math.min(g.w, (g.projection * fx.radius * (0.3 + age * 0.7)) / v.z),
        Math.min(g.h, (g.projection * fx.radius * 0.14) / v.z),
        0,
        0,
        TAU,
      );
      c.stroke();
    }
    // Sparse world-space motes freeze with offline pause; Red Haze has its own palette.
    if (!this.motion.matches && g.academy.preset !== "performance")
      for (let i = 0; i < 14; i++) {
        const n = g.level.length,
          x = 1 + ((i * 2.31 + t * 0.025) % (n - 2)),
          y = 1 + ((i * 4.17 + t * 0.013) % (n - 2));
        if (g.arena.wall(x, y)) continue;
        const v = this.project(x, y, 0.3 + (i % 5) * 0.12 + Math.sin(t + i) * 0.03);
        if (!v) continue;
        c.globalAlpha = 0.4;
        c.fillStyle =
          g.mode !== "training" && g.animationTime > g.zone.delay && g.outsideSafe({ x, y })
            ? "#ed799d"
            : "#fff0bd";
        c.fillRect(v.x, v.y, Math.max(1, 3 / v.z), Math.max(1, 3 / v.z));
      }
    // Warning lights pulse only where their billboard is visible.
    for (const e of this.extras().filter((e) => ["beacon", "antenna", "lamp"].includes(e.kind))) {
      const v = this.project(e.x, e.y, e.size * 0.77);
      if (v && (this.motion.matches || Math.sin(t * 3) > 0)) {
        c.globalAlpha = 0.5;
        c.fillStyle = "#ffe29d";
        c.beginPath();
        c.arc(v.x, v.y, Math.max(2, (5 * g.projection) / g.w / v.z), 0, TAU);
        c.fill();
      }
    }
    c.restore();
  }
  lighting() {
    const g = this.g;
    if (!g.academy.options.lighting) return;
    const c = g.ctx,
      p = g.camera(),
      inside = this.interior(mapOf(g.arena.mapId), p);
    c.save();
    const light = c.createLinearGradient(0, 0, g.w, g.h);
    light.addColorStop(0, inside ? "#17455c35" : "#ffd18414");
    light.addColorStop(1, inside ? "#061d322a" : "#081e3219");
    c.fillStyle = light;
    c.fillRect(0, 0, g.w, g.h);
    c.restore();
  }
  weaponBefore() {
    const g = this.g,
      c = g.ctx,
      p = g.player,
      w = weaponOf(p.weapon);
    this.weaponSaved = true;
    c.save();
    if (this.motion.matches) return;
    const r = p.reloadUntil ? Math.max(0, Math.min(1, (p.reloadUntil - g.animationTime) / 1.4)) : 0,
      progress = 1 - r;
    if (r) {
      const lean = Math.sin(progress * Math.PI);
      c.translate(g.w * 0.04 * lean, 0);
      c.rotate(0.055 * lean);
    }
    if (["melee", "dash"].includes(w.kind)) {
      const recoil = Math.max(0, 1 - (g.animationTime - p.shotAt) * 5);
      c.translate(-g.w * 0.08 * recoil, -g.h * 0.045 * recoil);
    }
  }
  weaponAfter() {
    const g = this.g,
      c = g.ctx,
      p = g.player,
      w = weaponOf(p.weapon);
    if (this.weaponSaved) {
      c.restore();
      this.weaponSaved = false;
    }
    c.save();
    const scale = Math.min(g.w / 900, g.h / 550) * 1.2,
      remaining = p.reloadUntil
        ? Math.max(0, Math.min(1, (p.reloadUntil - g.animationTime) / 1.4))
        : 0;
    if (remaining && !this.motion.matches) {
      const phase = 1 - remaining,
        lift = Math.sin(phase * Math.PI),
        x = g.w * 0.56 - scale * 90,
        y = g.h + scale * 50 - lift * scale * 190;
      c.translate(x, y);
      c.rotate(-0.2 + 0.45 * phase);
      c.fillStyle = "#c18c62";
      c.strokeStyle = "#101720";
      c.lineWidth = 5 * scale;
      c.fillRect(-18 * scale, 0, 45 * scale, 90 * scale);
      c.strokeRect(-18 * scale, 0, 45 * scale, 90 * scale);
      c.save();
      c.scale(scale, scale);
      c.fillStyle = w.color;
      if (w.kind === "rocket") {
        c.beginPath();
        c.moveTo(4, -63);
        c.lineTo(20, -33);
        c.lineTo(20, 25);
        c.lineTo(-12, 25);
        c.lineTo(-12, -33);
        c.closePath();
        c.fill();
        c.stroke();
      } else if (w.kind === "shard") {
        c.beginPath();
        c.ellipse(4, -18, 26, 31, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = "#f5dfab";
        for (let i = 0; i < 4; i++) c.fillRect(-14 + i * 11, -30, 3, 20);
      } else if (w.kind === "lob" || w.kind === "shotgun") {
        for (let i = 0; i < (w.kind === "lob" ? 2 : 3); i++) {
          c.fillStyle = w.kind === "lob" ? "#db7855" : w.color;
          c.fillRect(-17 + i * 17, -43, 12, 49);
          c.strokeRect(-17 + i * 17, -43, 12, 49);
          c.fillStyle = "#f4d390";
          c.fillRect(-17 + i * 17, -2, 12, 8);
        }
      } else if (["melee", "dash"].includes(w.kind)) {
        c.fillRect(-16, -14, 41, 29);
        c.strokeRect(-16, -14, 41, 29);
        c.strokeStyle = "#c3f8df";
        c.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.moveTo(-12, -8 + i * 8);
          c.lineTo(21, -8 + i * 8);
          c.stroke();
        }
      } else if (["blades", "poison"].includes(w.kind)) {
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.moveTo(-13 + i * 16, -54);
          c.lineTo(-20 + i * 16, 9);
          c.lineTo(-6 + i * 16, 9);
          c.closePath();
          c.fill();
          c.stroke();
        }
      } else {
        c.fillStyle = "#334c59";
        c.fillRect(-14, -45, 36, 75);
        c.strokeRect(-14, -45, 36, 75);
        c.fillStyle = w.color;
        c.fillRect(-10, -35, 28, 7);
      }
      c.restore();
      c.restore();
      c.save();
    }
    if (!this.motion.matches)
      for (const q of this.weaponParticles) {
        const age = g.animationTime - q.born;
        if (q.kind === "shell") {
          const x = g.w * 0.65 + age * g.w * 0.35,
            y = g.h * 0.69 - age * g.h * 0.32 + age * age * g.h * 0.7;
          c.save();
          c.translate(x, y);
          c.rotate(age * 14);
          c.fillStyle = q.color;
          c.strokeStyle = "#101720";
          c.lineWidth = 1;
          c.fillRect(-4, -2, 9 * scale, 4 * scale);
          c.strokeRect(-4, -2, 9 * scale, 4 * scale);
          c.restore();
        } else {
          c.globalAlpha = Math.max(0, 1 - age / 0.65) * 0.22;
          c.fillStyle = q.color;
          c.beginPath();
          c.ellipse(
            g.w * 0.59 + Math.sin(age * 9) * 8,
            g.h - scale * 265 - age * 40,
            (6 + age * 17) * scale,
            (8 + age * 25) * scale,
            -0.3,
            0,
            TAU,
          );
          c.fill();
        }
      }
    c.restore();
  }
}
