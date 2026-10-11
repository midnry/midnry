/** Illustrated first-person rigs and cosmetic ammunition. Never changes match rules. */
import { weaponOf } from "./outpost-content.js";
const TAU = Math.PI * 2;
export const WEAPON_ART = [
  "carbine",
  "scatter",
  "twin",
  "breach",
  "shard",
  "veil",
  "venom",
  "brawler",
  "reaper",
  "rocket",
  "demo",
];
export class WeaponArt {
  constructor(g) {
    this.g = g;
    this.cells = new Map();
    this.ammunition = new Map();
    this.image = new Image();
    this.loaded = false;
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.reset();
    this.ready = new Promise((resolve) => {
      this.image.onload = () => {
        this.loaded = true;
        if (!g.abort.signal.aborted && g.ui) {
          g.ui.previewKey = null;
          g.ui.refresh();
        }
        resolve(true);
      };
      this.image.onerror = () => resolve(false); // Existing procedural rigs remain a fallback.
      this.image.src = new URL("./weapons/arsenal-atlas.webp", import.meta.url).href;
    });
  }
  reset() {
    this.lastTime = -1;
    this.seen = new Map();
    this.tracers = [];
  }
  cell(id) {
    id = weaponOf(id).id;
    if (!this.loaded) return null;
    if (this.cells.has(id)) return this.cells.get(id);
    const index = Math.max(0, WEAPON_ART.indexOf(id)),
      cw = this.image.width / 4,
      ch = this.image.height / 3;
    const cell = document.createElement("canvas");
    cell.width = Math.ceil(cw);
    cell.height = Math.ceil(ch);
    const c = cell.getContext("2d", { willReadFrequently: true });
    c.drawImage(this.image, (index % 4) * cw, Math.floor(index / 4) * ch, cw, ch, 0, 0, cw, ch);
    // Trim transparent gutters once. Paired pistols/gauntlets retain both hands.
    const pixels = c.getImageData(0, 0, cell.width, cell.height);
    const data = pixels.data;
    // Ignore small disconnected fragments crossing an atlas gutter. Keep both
    // full-sized hands in paired rigs; this runs once per weapon, never per frame.
    const visited = new Uint8Array(cell.width * cell.height),
      groups = [];
    for (let start = 0; start < visited.length; start++) {
      if (visited[start] || data[start * 4 + 3] <= 40) continue;
      const group = [start];
      visited[start] = 1;
      for (let cursor = 0; cursor < group.length; cursor++) {
        const n = group[cursor],
          x = n % cell.width;
        const neighbors = [n - cell.width, n + cell.width];
        if (x > 0) neighbors.push(n - 1);
        if (x + 1 < cell.width) neighbors.push(n + 1);
        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next] || data[next * 4 + 3] <= 40)
            continue;
          visited[next] = 1;
          group.push(next);
        }
      }
      groups.push(group);
    }
    const largest = Math.max(1, ...groups.map((group) => group.length));
    for (const group of groups)
      if (group.length < largest * 0.18) for (const n of group) data[n * 4 + 3] = 0;
    c.putImageData(pixels, 0, 0);
    let left = cell.width,
      top = cell.height,
      right = 0,
      bottom = 0;
    for (let y = 0; y < cell.height; y++)
      for (let x = 0; x < cell.width; x++)
        if (data[(y * cell.width + x) * 4 + 3] > 40) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    const result = document.createElement("canvas");
    result.width = Math.max(1, right - left + 1);
    result.height = Math.max(1, bottom - top + 1);
    result
      .getContext("2d")
      .drawImage(cell, left, top, result.width, result.height, 0, 0, result.width, result.height);
    this.cells.set(id, result);
    return result;
  }
  preview(c, id, width, height) {
    const image = this.cell(id);
    if (!image) return false;
    const scale = Math.min((width - 12) / image.width, (height - 8) / image.height);
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(
      image,
      (width - image.width * scale) / 2,
      height - image.height * scale,
      image.width * scale,
      image.height * scale,
    );
    c.restore();
    return true;
  }
  draw() {
    const g = this.g,
      image = this.cell(g.player.weapon);
    if (!image) return false;
    const c = g.ctx,
      w = weaponOf(g.player.weapon),
      t = g.animationTime;
    const recoil = Math.max(0, 1 - (t - g.shotAt) / 0.16);
    const remaining = g.reloadUntil - t,
      reload = remaining > 0 ? Math.sin(Math.min(1, remaining / 1.4) * Math.PI) : 0;
    const swinging = ["melee", "dash", "blades", "poison", "lob", "shard"].includes(w.kind);
    const bob = this.motion.matches ? 0 : Math.sin(g.step) * 2;
    const height = Math.min(g.h * 0.54, g.w * 0.86),
      scale = height / image.height;
    const center = w.kind === "burst" || w.kind === "melee" ? 0.5 : 0.6;
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.translate(
      g.w * center + bob + (swinging ? recoil * g.w * 0.055 : 0),
      g.h + 3 + reload * height * 0.55 + recoil * height * 0.06,
    );
    c.rotate((swinging ? -recoil * 0.18 : -recoil * 0.035) + reload * 0.12);
    c.drawImage(image, (-image.width * scale) / 2, -height, image.width * scale, height);
    // A sleeve patch preserves the selected cosmetic finish without recoloring the painting.
    const finish = g.retention?.finishColor();
    if (finish) {
      c.fillStyle = finish;
      c.strokeStyle = "#101720";
      c.lineWidth = 2;
      c.fillRect(-height * 0.22, -height * 0.1, height * 0.08, height * 0.026);
      c.strokeRect(-height * 0.22, -height * 0.1, height * 0.08, height * 0.026);
    }
    c.restore();
    // Muzzle flashes remain separate from the artwork and are specific to firearm type.
    if (!swinging && recoil > 0.5) {
      const flash = (x, y, r) => {
        c.save();
        c.translate(x, y);
        c.fillStyle = "#ffbd56";
        c.strokeStyle = "#3b251f";
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i * TAU) / 12,
            s = i % 2 ? r * 0.28 : r;
          if (i) c.lineTo(Math.cos(a) * s, Math.sin(a) * s);
          else c.moveTo(Math.cos(a) * s, Math.sin(a) * s);
        }
        c.closePath();
        c.fill();
        c.stroke();
        c.restore();
      };
      if (w.kind === "burst") {
        flash(g.w * 0.39, g.h - height * 0.86, height * 0.065 * recoil);
        flash(g.w * 0.61, g.h - height * 0.86, height * 0.065 * recoil);
      } else
        flash(
          g.w * center - height * 0.3,
          g.h - height * 0.86,
          height * (w.kind === "shotgun" ? 0.11 : 0.075) * recoil,
        );
    }
    return true;
  }
  observe() {
    const g = this.g,
      time = g.animationTime;
    if (g.time < this.lastTime) this.reset();
    this.lastTime = g.time;
    for (const e of g.arena.entities) {
      const old = this.seen.get(e.id);
      this.seen.set(e.id, e.shotAt);
      if (e.shotAt < 0 || e.shotAt === old || time - e.shotAt > 0.3) continue;
      const w = weaponOf(e.weapon);
      if (!["rifle", "burst", "shotgun"].includes(w.kind)) continue;
      const count = w.kind === "shotgun" ? w.pellets : 1;
      for (let i = 0; i < count; i++) {
        const a = e.a + (count > 1 ? (i / (count - 1) - 0.5) * w.spread * 2 : 0),
          dx = Math.cos(a),
          dy = Math.sin(a);
        const wall = g.arena.cast(e.x, e.y, dx, dy),
          target = g.arena.rayTarget(e, dx, dy, [...g.arena.entities, ...g.arena.crates]);
        const range = Math.max(
          0.05,
          Math.min(
            w.range,
            wall.distance - 0.05,
            target ? Math.hypot(target.x - e.x, target.y - e.y) : Infinity,
          ),
        );
        this.tracers.push({
          x: e.x,
          y: e.y,
          a,
          range,
          pitch: e.pitch || 0,
          born: time,
          kind: w.kind,
        });
      }
    }
    this.tracers = this.tracers.filter((e) => time - e.born < 0.16).slice(-64);
  }
  // Cached ammunition art has a pointed silhouette, metal facets and comic ink.
  ammo(kind) {
    if (this.ammunition.has(kind)) return this.ammunition.get(kind);
    const s = document.createElement("canvas");
    s.width = s.height = 96;
    const c = s.getContext("2d");
    c.translate(48, 48);
    c.lineJoin = "round";
    c.lineWidth = 4;
    c.strokeStyle = "#101720";
    const poly = (points, fill) => {
      c.fillStyle = fill;
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
      c.stroke();
    };
    if (["rifle", "burst", "shotgun"].includes(kind)) {
      const length = kind === "rifle" ? 36 : kind === "burst" ? 25 : 14;
      poly(
        [
          [-length, -9],
          [length - 12, -9],
          [length, 0],
          [length - 12, 9],
          [-length, 9],
        ],
        kind === "shotgun" ? "#dca075" : "#e6b951",
      );
      poly(
        [
          [length - 12, -9],
          [length, 0],
          [length - 12, 9],
        ],
        "#cc7957",
      );
      c.strokeStyle = "#fff0ba";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-length + 5, -4);
      c.lineTo(length - 14, -4);
      c.stroke();
    } else if (kind === "rocket" || kind === "barrage") {
      poly(
        [
          [-35, -20],
          [-21, -11],
          [-21, 11],
          [-35, 20],
        ],
        "#368b92",
      );
      poly(
        [
          [-24, -12],
          [17, -12],
          [37, 0],
          [17, 12],
          [-24, 12],
        ],
        "#e6ba68",
      );
      poly(
        [
          [17, -12],
          [37, 0],
          [17, 12],
        ],
        "#eb714d",
      );
      poly(
        [
          [-26, -8],
          [-43, -3],
          [-35, 0],
          [-43, 5],
          [-26, 8],
        ],
        "#ffbd54",
      );
    } else if (kind === "blades" || kind === "poison" || kind === "spike") {
      poly(
        [
          [-34, -6],
          [-10, -6],
          [12, -17],
          [37, 0],
          [12, 17],
          [-10, 6],
          [-34, 6],
        ],
        kind === "poison" ? "#80d67a" : kind === "spike" ? "#a6d96c" : "#b4a5e9",
      );
      c.strokeStyle = "#edfff3";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-7, 0);
      c.lineTo(29, 0);
      c.stroke();
      c.strokeStyle = "#25363b";
      for (let x = -30; x <= -16; x += 7) {
        c.beginPath();
        c.moveTo(x, -5);
        c.lineTo(x, 5);
        c.stroke();
      }
    } else if (kind === "lob" || kind === "barrel") {
      if (kind === "barrel") {
        poly(
          [
            [-25, -28],
            [25, -28],
            [31, 0],
            [25, 28],
            [-25, 28],
            [-31, 0],
          ],
          "#d58742",
        );
        c.fillStyle = "#263c43";
        c.fillRect(-27, -17, 54, 8);
        c.fillRect(-27, 11, 54, 8);
      } else
        for (const y of [-10, 10])
          poly(
            [
              [-29, y - 8],
              [25, y - 8],
              [31, y],
              [25, y + 8],
              [-29, y + 8],
            ],
            "#cf6551",
          );
      c.strokeStyle = "#e9d799";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(22, -12);
      c.quadraticCurveTo(41, -29, 28, -34);
      c.stroke();
      poly(
        [
          [27, -42],
          [30, -35],
          [38, -34],
          [30, -31],
          [26, -25],
          [24, -33],
          [19, -36],
        ],
        "#ffdb65",
      );
    } else if (kind === "shard") {
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16,
          r = i % 2 ? 20 : 37;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      poly(pts, "#72b86c");
      poly(
        [
          [-15, -16],
          [14, -17],
          [23, 0],
          [12, 19],
          [-18, 15],
          [-23, -1],
        ],
        "#adcf7b",
      );
    } else if (kind === "echo") {
      poly(
        [
          [-38, -20],
          [-11, -6],
          [0, -20],
          [12, -6],
          [38, -20],
          [23, 14],
          [9, 9],
          [0, 21],
          [-9, 9],
          [-23, 14],
        ],
        "#b397e1",
      );
    } else {
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16,
          r = i % 2 ? 17 : 38;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      poly(pts, kind === "toxic" ? "#9bdc72" : "#ffbf63");
      poly(
        [
          [-8, -15],
          [17, -9],
          [10, 16],
          [-13, 12],
        ],
        "#fff0b2",
      );
    }
    this.ammunition.set(kind, s);
    return s;
  }
  glyph(c, kind, x, y, radius, angle = 0, alpha = 1) {
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, alpha));
    c.translate(x, y);
    c.rotate(angle);
    const s = this.ammo(kind);
    c.drawImage(s, -radius, -radius, radius * 2, radius * 2);
    c.restore();
  }
  combat(point) {
    const g = this.g,
      c = g.ctx,
      time = g.animationTime;
    for (const e of this.tracers) {
      const fraction = Math.min(1, (time - e.born) / 0.12),
        d = Math.max(0.18, e.range * fraction);
      if (d > e.range) continue;
      const x = e.x + Math.cos(e.a) * d,
        y = e.y + Math.sin(e.a) * d,
        height = 0.5 + e.pitch * d;
      const head = point(x, y, height),
        tail = point(
          e.x + Math.cos(e.a) * Math.max(0.1, d - 0.5),
          e.y + Math.sin(e.a) * Math.max(0.1, d - 0.5),
          height,
        );
      if (!head) continue;
      const angle = tail ? Math.atan2(head.y - tail.y, head.x - tail.x) : e.a - g.camera().a;
      if (tail) {
        c.save();
        c.strokeStyle = e.kind === "burst" ? "#9bd9ee" : "#f7d487";
        c.globalAlpha = 0.65;
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(tail.x, tail.y);
        c.lineTo(head.x, head.y);
        c.stroke();
        c.restore();
      }
      this.glyph(
        c,
        e.kind,
        head.x,
        head.y,
        Math.max(2.5, Math.min(16, (g.projection * 0.065) / head.z)),
        angle,
      );
    }
    for (const e of g.arena.projectiles) {
      const v = point(e.x, e.y, (e.height || 0) + (e.kind === "barrage" ? 0.01 : 0.4));
      if (!v) continue;
      if (e.kind === "barrage") {
        c.save();
        c.strokeStyle = "#ffa55d";
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(
          v.x,
          v.y,
          Math.min(100, g.projection / v.z),
          Math.min(25, (g.projection / v.z) * 0.25),
          0,
          0,
          TAU,
        );
        c.stroke();
        c.restore();
        continue;
      }
      const next = point(
        e.x + Math.cos(e.a || 0) * 0.15,
        e.y + Math.sin(e.a || 0) * 0.15,
        (e.height || 0) + 0.4,
      );
      const angle =
        e.kind === "blades" && !this.motion.matches
          ? time * 12 + e.id
          : next
            ? Math.atan2(next.y - v.y, next.x - v.x)
            : (e.a || 0) - g.camera().a;
      const size = ["rocket", "shard", "lob", "barrel"].includes(e.kind) ? 0.17 : 0.09;
      this.glyph(
        c,
        e.kind,
        v.x,
        v.y,
        Math.max(3, Math.min(58, (g.projection * size) / v.z)),
        angle,
      );
    }
    for (const e of g.arena.fx) {
      const v = point(e.x, e.y, 0.4);
      if (!v) continue;
      const radius = Math.max(3, Math.min(120, (g.projection * (e.radius || 0.07)) / v.z));
      this.glyph(c, e.kind, v.x, v.y, radius, e.id * 0.7, (e.until - time) / 0.45);
    }
  }
}
