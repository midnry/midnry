/** Original illustrated anime atlases with a procedural loading fallback.
 * Presentation only: never mutates Arena entities or authoritative match rules. */
import { weaponOf } from "./outpost-content.js";
const TAU = Math.PI * 2;
// Tight source bounds measured from alpha; source artwork stays untouched.
const ATLASES = [
  {
    name: "ember",
    width: 1224,
    height: 1285,
    frames: [
      [75, 5, 177, 342],
      [364, 5, 201, 344],
      [690, 4, 162, 347],
      [986, 5, 165, 344],
      [80, 351, 189, 304],
      [364, 352, 176, 302],
      [691, 354, 195, 301],
      [968, 354, 185, 300],
      [75, 661, 198, 289],
      [364, 660, 182, 288],
      [656, 663, 199, 285],
      [988, 661, 197, 291],
      [53, 951, 223, 323],
      [380, 952, 183, 321],
      [616, 956, 271, 317],
      [935, 1063, 266, 210],
    ],
  },
  {
    name: "nomad",
    width: 1224,
    height: 1285,
    frames: [
      [67, 5, 197, 347],
      [369, 5, 201, 347],
      [671, 5, 178, 347],
      [969, 6, 203, 345],
      [69, 358, 194, 310],
      [370, 361, 188, 299],
      [670, 361, 226, 306],
      [970, 359, 213, 306],
      [56, 672, 219, 286],
      [370, 662, 209, 296],
      [671, 676, 226, 285],
      [991, 677, 218, 286],
      [35, 955, 271, 321],
      [361, 959, 221, 318],
      [615, 970, 282, 305],
      [936, 1056, 279, 221],
    ],
  },
  {
    name: "thorn",
    width: 1224,
    height: 1285,
    frames: [
      [65, 4, 225, 347],
      [371, 5, 205, 346],
      [671, 6, 159, 348],
      [961, 4, 240, 349],
      [49, 354, 238, 304],
      [350, 354, 242, 304],
      [655, 354, 242, 304],
      [954, 359, 239, 298],
      [34, 661, 270, 295],
      [351, 658, 250, 298],
      [665, 659, 234, 297],
      [964, 658, 236, 300],
      [12, 951, 358, 321],
      [372, 956, 216, 316],
      [627, 962, 286, 315],
      [930, 1036, 286, 235],
    ],
  },
  {
    name: "backs",
    width: 1448,
    height: 1086,
    frames: [
      [43, 3, 253, 356],
      [423, 4, 246, 354],
      [804, 3, 238, 356],
      [1206, 4, 207, 353],
      [38, 362, 298, 361],
      [413, 362, 289, 352],
      [780, 363, 288, 359],
      [1143, 363, 296, 353],
      [12, 728, 324, 350],
      [396, 726, 314, 350],
      [764, 726, 328, 353],
      [1121, 723, 320, 351],
    ],
  },
];
const RIGS = [
  {
    name: "Ember Scout",
    coat: "#a45746",
    light: "#d59470",
    dark: "#513747",
    skin: "#dbad86",
    shade: "#986c69",
    hair: "#273747",
    metal: "#b0abb1",
  },
  {
    name: "Iron Nomad",
    coat: "#436b78",
    light: "#77a0a4",
    dark: "#263f55",
    skin: "#a57559",
    shade: "#614851",
    hair: "#252c3a",
    metal: "#c3a36e",
  },
  {
    name: "Thorn Warden",
    coat: "#657863",
    light: "#a9af7d",
    dark: "#344b52",
    skin: "#d0b59b",
    shade: "#8a797b",
    hair: "#344e4d",
    metal: "#c3b798",
  },
];
const hash = (value) => [...value].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
export class Characters {
  constructor(g) {
    this.g = g;
    this.cache = new Map();
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.reset();
    this.atlases = ATLASES.map((spec) => ({
      ...spec,
      image: new Image(),
      loaded: false,
      cells: new Map(),
    }));
    // Decode once per instance. A procedural fallback keeps play usable on load failure.
    this.ready = Promise.allSettled(
      this.atlases.map(async (atlas) => {
        atlas.image.src = new URL(`./characters/${atlas.name}-atlas.webp`, import.meta.url).href;
        await atlas.image.decode();
        atlas.loaded = true;
        this.clearCache();
      }),
    );
  }
  reset() {
    this.observed = new Map();
    this.lastTime = -1;
    this.round = null;
  }
  clearCache() {
    this.cache.clear();
  }
  observe() {
    const g = this.g;
    if (g.time < this.lastTime || this.round !== g.arena.roundId) this.reset();
    this.lastTime = g.time;
    this.round = g.arena.roundId;
    for (const e of g.combatants()) {
      const old = this.observed.get(e.id);
      this.observed.set(e.id, {
        x: e.x,
        y: e.y,
        hp: e.hp,
        movingUntil:
          old && Math.hypot(e.x - old.x, e.y - old.y) > 0.002
            ? g.time + 0.18
            : old?.movingUntil || 0,
        deathAt: e.hp <= 0 ? (old?.hp > 0 ? g.time : (old?.deathAt ?? -100)) : null,
      });
    }
  }
  defeatedVisible(e) {
    const at = this.observed.get(e.id)?.deathAt;
    return e.hp <= 0 && at != null && this.g.time - at < 0.9;
  }
  pose(e) {
    const g = this.g,
      old = this.observed.get(e.id),
      moving = old?.movingUntil > g.time;
    let state = "idle",
      frame = 0;
    if (e.hp <= 0) {
      state = "down";
      frame = this.motion.matches
        ? 4
        : Math.min(4, Math.floor((g.time - (old?.deathAt ?? g.time)) * 6));
    } else if (g.time - e.hit >= 0 && g.time - e.hit < 0.22) {
      state = "hit";
      frame = Math.min(1, Math.floor((g.time - e.hit) * 10));
    } else if (e.reloadUntil > g.time) {
      state = "reload";
      frame = Math.min(5, Math.floor((1 - (e.reloadUntil - g.time) / 1.4) * 6));
    } else if (g.time - e.shotAt >= 0 && g.time - e.shotAt < 0.22) {
      state = "fire";
      frame = Math.min(2, Math.floor((g.time - e.shotAt) * 14));
    } else if (moving) {
      state = "walk";
      frame = Math.floor(g.time * (e.speedUntil > g.time ? 14 : 9) + (e.phase || 0)) % 8;
    } else frame = Math.floor(g.time * 2 + (e.phase || 0)) % 4;
    if (this.motion.matches && state !== "down") frame = 0;
    const camera = g.camera(),
      angle = Math.atan2(camera.y - e.y, camera.x - e.x) - e.a;
    const direction = ((Math.round(angle / (TAU / 8)) % 8) + 8) % 8;
    return { state, frame, direction };
  }
  sprite(e, override) {
    const g = this.g,
      w = weaponOf(e.weapon),
      p = override || this.pose(e);
    const role = ["poison", "shard", "lob", "blades", "dash"].includes(w.kind)
      ? 2
      : ["rocket", "melee", "shotgun"].includes(w.kind)
        ? 1
        : 0;
    const variant = this.atlases[role].loaded ? 0 : hash(e.id) % 3,
      ally = g.mode === "duo" && e.team === g.player.team;
    const density = g.academy.preset === "high" ? 2 : g.academy.preset === "performance" ? 1 : 1.5;
    const key = `${this.motion.matches}:${density}:${role}:${variant}:${ally}:${w.id}:${p.state}:${p.frame}:${p.direction}`;
    if (this.cache.has(key)) {
      const image = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, image);
      return image;
    }
    const image = document.createElement("canvas");
    image.width = 192 * density;
    image.height = 288 * density;
    const c = image.getContext("2d");
    c.scale(density, density);
    if (this.atlases[role].loaded) this.paintAtlas(c, role, ally, w, p);
    else this.paint(c, RIGS[role], role, variant, ally, w, p);
    // LRU bounds memory even with eight angles, loadouts and animation states.
    if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, image);
    return image;
  }
  // Extract a sprite lazily. Keep only its connected silhouette, removing tiny
  // neighboring-frame fragments where the illustrated atlas has uneven gutters.
  atlasCell(atlas, index) {
    if (atlas.cells.has(index)) return atlas.cells.get(index);
    const [x, y, width, height] = atlas.frames[index];
    const image = document.createElement("canvas");
    image.width = width;
    image.height = height;
    const ctx = image.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(atlas.image, x, y, width, height, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height),
      data = pixels.data;
    const marks = new Uint16Array(width * height),
      queue = new Int32Array(width * height);
    let label = 0,
      largest = 0,
      count = 0;
    for (let i = 0; i < marks.length; i++) {
      if (marks[i] || data[i * 4 + 3] < 16) continue;
      label++;
      let start = 0,
        end = 1;
      queue[0] = i;
      marks[i] = label;
      while (start < end) {
        const at = queue[start++],
          px = at % width;
        for (let direction = 0; direction < 4; direction++) {
          const next =
            direction === 0
              ? px > 0
                ? at - 1
                : -1
              : direction === 1
                ? px < width - 1
                  ? at + 1
                  : -1
                : direction === 2
                  ? at - width
                  : at + width;
          if (next < 0 || next >= marks.length || marks[next] || data[next * 4 + 3] < 16) continue;
          marks[next] = label;
          queue[end++] = next;
        }
      }
      if (end > count) {
        count = end;
        largest = label;
      }
    }
    for (let i = 0; i < marks.length; i++) {
      if (marks[i] !== largest) data[i * 4 + 3] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
    atlas.cells.set(index, image);
    return image;
  }
  paintAtlas(c, role, ally, weapon, p) {
    const back = [3, 4, 5].includes(p.direction),
      side = [2, 6].includes(p.direction);
    const neutral = back ? 3 : side ? 2 : p.direction === 0 ? 0 : 1;
    let atlas = this.atlases[role],
      index = neutral;
    const moving = p.state === "walk" && !this.motion.matches;
    if (moving) {
      if (back && this.atlases[3].loaded) {
        atlas = this.atlases[3];
        index = role * 4 + (p.frame % 4);
      } else if (!back) index = (p.direction === 0 ? 4 : 8) + (p.frame % 4);
    } else if (!back) {
      if (p.state === "fire") index = ["melee", "dash"].includes(weapon.kind) ? 13 : 12;
      if (p.state === "reload") index = p.frame === 0 || p.frame === 5 ? neutral : 13;
      if (p.state === "hit") index = 14;
    }
    if (p.state === "down") {
      atlas = this.atlases[role];
      index = p.frame === 0 ? 14 : 15;
    }
    const source = this.atlasCell(atlas, index),
      rect = atlas.frames[index];
    const base = atlas.frames[atlas.name === "backs" ? role * 4 : 0];
    // One fixed scale per rig: crouching/run frames retain their natural height.
    const scale = 236 / base[3];
    const mirror = p.direction >= 5;
    const breathe =
      !this.motion.matches && p.state === "idle" ? Math.sin((p.frame * Math.PI) / 2) * 0.003 : 0;
    const kick =
      p.state === "fire" ? (2 - p.frame) * 1.2 : p.state === "hit" ? (p.frame ? 1 : -2) : 0;
    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.translate(96 + kick, 271);
    if (mirror) c.scale(-1, 1);
    c.scale(1, 1 + breathe);
    // Center the pelvis at the cell center, rather than centering trailing scarves.
    const cellWidth = atlas.width / 4,
      column = index % 4;
    const dx = (rect[0] - (column + 0.5) * cellWidth) * scale;
    c.drawImage(source, dx, -source.height * scale, source.width * scale, source.height * scale);
    if (p.state === "hit") {
      c.globalCompositeOperation = "source-atop";
      c.fillStyle = p.frame ? "#fff3ce20" : "#fff3ce55";
      c.fillRect(-96, -288, 192, 288);
      c.globalCompositeOperation = "source-over";
    }
    // A compact loadout badge and teammate stripe preserve combat readability.
    if (p.state !== "down") {
      c.fillStyle = ally ? "#71ebd5" : weapon.color;
      c.strokeStyle = "#18222b";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-30, -145);
      c.lineTo(-24, -150);
      c.lineTo(-18, -145);
      c.lineTo(-24, -140);
      c.closePath();
      c.fill();
      c.stroke();
    }
    c.restore();
  }
  paint(c, r, role, variant, ally, w, p) {
    const phase = (p.frame / 8) * TAU,
      walk = p.state === "walk" && !this.motion.matches;
    const step = walk ? Math.sin(phase) : 0,
      lift = walk ? Math.abs(Math.cos(phase)) * 2 : 0;
    const breathe =
      p.state === "idle" && !this.motion.matches ? Math.sin((p.frame / 4) * TAU) * 1.3 : 0;
    const recoil = p.state === "fire" ? (2 - p.frame) * 2 : 0,
      flinch = p.state === "hit" ? (p.frame ? 2 : -5) : 0;
    const back = [3, 4, 5].includes(p.direction),
      profile = [2, 6].includes(p.direction),
      quarter = [1, 3, 5, 7].includes(p.direction);
    const ink = "#202833",
      accent = ally ? "#72dfc5" : "#efa068";
    const poly = (pts, fill, width = 2) => {
      c.fillStyle = fill;
      c.strokeStyle = ink;
      c.lineWidth = width;
      c.lineJoin = "round";
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
      if (width) c.stroke();
    };
    const line = (pts, color = ink, width = 1.5) => {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = "round";
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    };
    const ellipse = (x, y, rx, ry, fill, width = 1.5) => {
      c.fillStyle = fill;
      c.strokeStyle = ink;
      c.lineWidth = width;
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, TAU);
      c.fill();
      if (width) c.stroke();
    };
    const limb = (a, b, width, color) => {
      line([a, b], ink, width + 4);
      line([a, b], color, width);
      line(
        [
          [a[0] - 2, a[1]],
          [b[0] - 2, b[1]],
        ],
        r.light,
        2,
      );
    };
    c.save();
    if (p.state === "down") {
      const t = p.frame / 4;
      c.translate(96 + t * 44, 275);
      c.rotate(-t * 1.45);
      c.scale(1 - t * 0.48, 1 - t * 0.48);
      c.translate(-96, -275);
    }
    c.translate(96, 0);
    if (p.direction >= 5) c.scale(-1, 1);
    c.scale(profile ? 0.67 : quarter ? 0.86 : 1, 1);
    c.translate(-96, 0);
    // Coat tails lag behind the gait, with different silhouettes for each rig.
    poly(
      [
        [62, 145],
        [126, 143],
        [137 + step * 4, 219],
        [109, 205],
        [95, 217],
        [76, 210],
        [54 - step * 5, 226],
      ],
      r.dark,
      3,
    );
    poly(
      [
        [63, 155],
        [82, 161],
        [75 - step * 3, 207],
        [58 - step * 5, 220],
      ],
      r.coat,
      1,
    );
    line(
      [
        [120, 158],
        [128 + step * 3, 200],
        [122, 208],
      ],
      r.light,
      2,
    );
    for (const side of [-1, 1]) {
      const stride = step * side,
        hip = [96 + side * 15, 183],
        knee = [96 + side * 17 + stride * 9, 222 - Math.max(0, stride) * 7],
        ankle = [96 + side * 19 + stride * 13, 260 - Math.max(0, stride) * 9];
      limb(hip, knee, 19, "#394756");
      limb(knee, ankle, 15, "#3f4c58");
      poly(
        [
          [knee[0] - 9, knee[1] - 6],
          [knee[0] + 9, knee[1] - 5],
          [knee[0] + 8, knee[1] + 8],
          [knee[0] - 7, knee[1] + 9],
        ],
        r.metal,
        1.5,
      );
      poly(
        [
          [ankle[0] - 9, ankle[1] - 8],
          [ankle[0] + 8, ankle[1] - 8],
          [ankle[0] + 12, ankle[1] + 8],
          [ankle[0] - 12, ankle[1] + 11],
          [ankle[0] - 15, ankle[1] + 5],
        ],
        "#28323e",
        2,
      );
      line(
        [
          [ankle[0] - 8, ankle[1] + 6],
          [ankle[0] + 9, ankle[1] + 5],
        ],
        "#a9947e",
        2,
      );
      for (let i = 0; i < 3; i++)
        line(
          [
            [ankle[0] - 4, ankle[1] - 5 + i * 3],
            [ankle[0] + 4, ankle[1] - 5 + i * 3],
          ],
          "#7f878b",
          1,
        );
    }
    c.save();
    c.translate(flinch - recoil * 0.3, breathe - lift);
    const wide = role === 1 ? 8 : 0;
    // Layered cloth, directional shadow planes and individually stitched lapels.
    poly(
      [
        [59 - wide, 103],
        [80, 95],
        [111, 95],
        [135 + wide, 105],
        [128 + wide, 150],
        [119, 187],
        [72, 187],
        [62, 149],
      ],
      r.coat,
      3,
    );
    poly(
      [
        [101, 100],
        [133 + wide, 108],
        [127 + wide, 157],
        [116, 182],
        [99, 174],
      ],
      r.dark,
      0,
    );
    poly(
      [
        [62 - wide, 108],
        [78, 100],
        [82, 147],
        [72, 173],
        [65, 148],
      ],
      r.light,
      0,
    );
    poly(
      [
        [81, 94],
        [107, 94],
        [108, 131],
        [87, 158],
        [81, 120],
      ],
      "#34414f",
      2,
    );
    poly(
      [
        [77, 96],
        [88, 104],
        [90, 121],
        [83, 139],
        [70, 108],
      ],
      r.light,
      1.5,
    );
    poly(
      [
        [110, 96],
        [124, 103],
        [111, 141],
        [98, 126],
      ],
      r.coat,
      1.5,
    );
    line(
      [
        [75, 103],
        [83, 118],
        [77, 133],
      ],
      "#ecd0a5",
      1,
    );
    line(
      [
        [120, 106],
        [111, 126],
        [106, 134],
      ],
      r.light,
      1,
    );
    // Painted scuffs and hatch marks follow fabric planes rather than random noise.
    for (let i = 0; i < 16; i++) {
      const x = 63 + ((i * 13 + variant * 7) % 63),
        y = 112 + ((i * 17) % 63);
      line(
        [
          [x, y],
          [x + 3 + (i % 3), y - 2],
        ],
        i % 3 ? r.light : r.dark,
        0.7,
      );
    }
    poly(
      [
        [69, 168],
        [123, 168],
        [120, 184],
        [72, 184],
      ],
      "#634c48",
      2,
    );
    poly(
      [
        [92, 169],
        [107, 169],
        [107, 182],
        [92, 182],
      ],
      r.metal,
      1.5,
    );
    poly(
      [
        [96, 172],
        [103, 172],
        [103, 178],
        [96, 178],
      ],
      "#37414b",
      1,
    );
    poly(
      [
        [64, 152],
        [80, 150],
        [82, 167],
        [63, 169],
      ],
      "#5b5353",
      1.5,
    );
    line(
      [
        [66, 156],
        [77, 155],
      ],
      "#c7aa81",
      1.5,
    );
    poly(
      [
        [114, 151],
        [130, 154],
        [128, 168],
        [113, 165],
      ],
      r.dark,
      1.5,
    );
    line(
      [
        [116, 154],
        [126, 157],
      ],
      r.light,
      1,
    );
    if (back) {
      poly(
        [
          [75, 106],
          [119, 106],
          [125, 158],
          [111, 168],
          [78, 158],
        ],
        "#34434e",
        2,
      );
      poly(
        [
          [81, 110],
          [110, 112],
          [116, 148],
          [82, 146],
        ],
        r.coat,
        1,
      );
      line(
        [
          [86, 114],
          [85, 142],
        ],
        r.light,
        2,
      );
      ellipse(103, 152, 4, 4, r.metal, 1);
    }
    if (role === 1) {
      for (const side of [-1, 1]) {
        const x = 96 + side * (34 + wide);
        poly(
          [
            [x - 16, 103],
            [x + 10, 101],
            [x + 17, 113],
            [x + 12, 127],
            [x - 16, 120],
          ],
          r.metal,
          2,
        );
        line(
          [
            [x - 12, 108],
            [x + 7, 107],
          ],
          "#f0d6a0",
          2,
        );
        for (let i = 0; i < 3; i++) ellipse(x - 6 + i * 6, 116, 1.4, 1.4, "#4d535a", 0);
      }
    }
    if (role === 2) {
      for (let i = 0; i < 3; i++) {
        poly(
          [
            [65 + i * 13, 173],
            [73 + i * 13, 173],
            [75 + i * 13, 187],
            [64 + i * 13, 189],
          ],
          "#477c78",
          1.5,
        );
        line(
          [
            [67 + i * 13, 176],
            [67 + i * 13, 184],
          ],
          "#b2e5bf",
          1.5,
        );
      }
    }
    // Neck, scarf and facial planes use warm highlights against cool shadows.
    poly(
      [
        [85, 82],
        [107, 82],
        [109, 102],
        [95, 109],
        [81, 98],
      ],
      r.shade,
      2,
    );
    poly(
      [
        [80, 91],
        [110, 90],
        [119, 104],
        [101, 117],
        [76, 105],
      ],
      role === 2 ? "#9a8978" : "#b56755",
      2,
    );
    line(
      [
        [82, 97],
        [105, 98],
        [111, 102],
      ],
      "#e0ad81",
      2,
    );
    poly(
      [
        [77, 102],
        [82, 100],
        [87 + step * 3, 127],
        [82 + step * 4, 147],
        [75, 137],
      ],
      "#b56e62",
      1,
    );
    c.save();
    c.translate(flinch * 0.3, 0);
    ellipse(74, 66, 6, 10, r.shade, 1);
    ellipse(116, 66, 6, 10, r.shade, 1);
    poly(
      [
        [76, 44],
        [91, 35],
        [111, 43],
        [117, 63],
        [111, 82],
        [97, 91],
        [81, 83],
        [73, 62],
      ],
      r.skin,
      2.2,
    );
    poly(
      [
        [100, 40],
        [111, 45],
        [116, 64],
        [109, 83],
        [97, 90],
        [96, 76],
        [104, 65],
      ],
      r.shade,
      0,
    );
    poly(
      [
        [79, 48],
        [89, 43],
        [98, 46],
        [89, 57],
        [78, 59],
      ],
      "#edc9a0",
      0,
    );
    poly(
      [
        [77, 69],
        [87, 73],
        [88, 81],
        [82, 80],
      ],
      "#b98379",
      0,
    );
    if (back) {
      poly(
        [
          [73, 43],
          [87, 33],
          [106, 36],
          [118, 47],
          [116, 74],
          [106, 84],
          [83, 80],
          [73, 65],
        ],
        r.hair,
        2,
      );
      for (let i = 0; i < 9; i++)
        line(
          [
            [78 + i * 4, 47],
            [80 + i * 4, 66 + (i % 3) * 3],
          ],
          i % 2 ? "#547072" : "#253747",
          1,
        );
    } else {
      const blink = p.state === "hit" || (p.state === "idle" && p.frame === 3 && variant === 1);
      for (const x of profile ? [105] : [83, 105]) {
        line(
          [
            [x - 6, 59],
            [x + 5, 58],
          ],
          r.hair,
          2,
        );
        if (blink)
          line(
            [
              [x - 5, 66],
              [x + 4, 65],
            ],
            ink,
            1.5,
          );
        else {
          poly(
            [
              [x - 5, 64],
              [x + 1, 62],
              [x + 5, 65],
              [x + 1, 68],
              [x - 5, 67],
            ],
            "#e1d9c0",
            0.8,
          );
          ellipse(x + 1, 65, 2, 2.5, ally ? "#7fbda8" : "#7099ac", 0.7);
          ellipse(x + 1, 65, 1, 1.6, ink, 0);
          ellipse(x, 64, 0.7, 0.7, "#fff4d5", 0);
        }
      }
      line(
        [
          [95, 61],
          [92, 72],
          [97, 74],
        ],
        "#76545d",
        1.2,
      );
      line(
        [
          [91, 79],
          [99, 79],
          [102, 77],
        ],
        "#734f5a",
        1,
      );
      line(
        [
          [94, 83],
          [99, 83],
        ],
        "#e8bf93",
        1,
      );
      if (profile)
        poly(
          [
            [112, 59],
            [126, 69],
            [112, 73],
          ],
          r.skin,
          1,
        );
      if (role === 0) {
        poly(
          [
            [71, 49],
            [76, 34],
            [94, 28],
            [113, 32],
            [118, 48],
            [104, 43],
            [88, 42],
            [75, 62],
          ],
          r.hair,
          2,
        );
        poly(
          [
            [77, 35],
            [93, 28],
            [110, 32],
            [104, 39],
            [82, 43],
          ],
          "#556976",
          0,
        );
        for (let i = 0; i < 8; i++)
          line(
            [
              [79 + i * 4, 37],
              [73 + i * 4, 49],
            ],
            i % 2 ? "#6b7a88" : r.hair,
            1,
          );
        line(
          [
            [108, 47],
            [111, 57],
          ],
          "#374650",
          3,
        );
      } else if (role === 1) {
        poly(
          [
            [75, 49],
            [73, 41],
            [82, 31],
            [108, 33],
            [117, 43],
            [113, 48],
            [104, 43],
            [85, 43],
          ],
          r.hair,
          2,
        );
        for (let i = 0; i < 7; i++) ellipse(78 + i * 5, 37 + (i % 2) * 3, 4, 4, r.hair, 1);
        line(
          [
            [86, 84],
            [97, 89],
            [108, 82],
          ],
          "#594650",
          3,
        );
        line(
          [
            [79, 72],
            [83, 75],
          ],
          "#e0b19a",
          1,
        );
      } else {
        poly(
          [
            [70, 50],
            [77, 33],
            [95, 27],
            [115, 37],
            [119, 56],
            [109, 45],
            [98, 39],
            [89, 52],
            [78, 55],
            [75, 74],
          ],
          r.hair,
          2,
        );
        poly(
          [
            [80, 34],
            [94, 28],
            [109, 36],
            [91, 38],
            [77, 49],
          ],
          "#6c8c78",
          0,
        );
        line(
          [
            [79, 40],
            [76, 65],
          ],
          "#94ae8f",
          1.5,
        );
        line(
          [
            [109, 39],
            [114, 52],
          ],
          "#8ba184",
          1,
        );
        line(
          [
            [81, 73],
            [86, 75],
          ],
          "#62796d",
          1.2,
        );
      }
      // Small earrings, scars and face paint give close encounters readable detail.
      ellipse(75, 75, 2, 3, r.metal, 1);
      if (variant === 2)
        line(
          [
            [107, 69],
            [110, 77],
          ],
          "#ead1ba",
          1.2,
        );
    }
    c.restore();
    // Arms have shoulder, elbow and wrist joints; reload lifts the magazine hand.
    const load = p.state === "reload" ? Math.sin((p.frame / 5) * Math.PI) * 19 : 0;
    const leftShoulder = [63 - wide, 112],
      rightShoulder = [131 + wide, 113];
    const leftElbow = [58 - wide + step * 2, 145],
      leftHand = [90 - load * 0.5, 144 + load];
    const rightElbow = [137 + wide, 142 - recoil],
      rightHand = [119 - recoil, 138 - recoil];
    limb(leftShoulder, leftElbow, 18, r.coat);
    limb(leftElbow, leftHand, 13, r.dark);
    limb(rightShoulder, rightElbow, 18, r.coat);
    limb(rightElbow, rightHand, 13, r.dark);
    ellipse(leftHand[0], leftHand[1], 7, 6, r.skin, 1.3);
    ellipse(rightHand[0], rightHand[1], 7, 6, r.skin, 1.3);
    line(
      [
        [rightElbow[0] - 4, rightElbow[1] - 5],
        [rightElbow[0] + 3, rightElbow[1] - 3],
      ],
      r.metal,
      3,
    );
    poly(
      [
        [55 - wide, 112],
        [66 - wide, 110],
        [68 - wide, 123],
        [57 - wide, 125],
      ],
      accent,
      1,
    );
    line(
      [
        [58 - wide, 115],
        [64 - wide, 114],
      ],
      "#e9e2b9",
      1.2,
    );
    c.save();
    c.translate(-recoil, -recoil * 0.5);
    if (["rifle", "burst", "shotgun", "rocket"].includes(w.kind)) {
      poly(
        [
          [82, 128],
          [138, 128],
          [151, 137],
          [139, 146],
          [103, 146],
          [96, 155],
          [88, 151],
          [89, 144],
          [78, 141],
        ],
        "#3c4b58",
        2,
      );
      poly(
        [
          [125, 130],
          [165, 130],
          [168, 136],
          [163, 143],
          [125, 140],
        ],
        r.metal,
        1.5,
      );
      line(
        [
          [93, 133],
          [122, 132],
        ],
        w.color,
        4,
      );
      if (w.kind === "rocket")
        poly(
          [
            [130, 123],
            [172, 122],
            [177, 129],
            [173, 145],
            [132, 147],
          ],
          "#687a7b",
          2,
        );
      if (w.kind === "shotgun")
        line(
          [
            [112, 144],
            [139, 145],
          ],
          "#b08b68",
          5,
        );
      if (p.state === "fire" && p.frame === 0 && !this.motion.matches)
        poly(
          [
            [171, 130],
            [182, 121],
            [179, 132],
            [190, 135],
            [178, 139],
            [183, 150],
            [169, 141],
          ],
          "#ffdda3",
          1,
        );
    } else if (["blades", "poison", "dash"].includes(w.kind)) {
      poly(
        [
          [111, 142],
          [151, 108],
          [143, 133],
          [117, 153],
        ],
        "#b4c5c3",
        1.5,
      );
      line(
        [
          [117, 142],
          [140, 124],
        ],
        w.color,
        2,
      );
      if (p.state === "fire" && !this.motion.matches)
        line(
          [
            [138, 97],
            [161, 119],
            [163, 144],
          ],
          "#a7d4c38c",
          3,
        );
    } else if (w.kind === "melee") {
      poly(
        [
          [105, 130],
          [121, 125],
          [130, 136],
          [123, 149],
          [107, 147],
        ],
        r.metal,
        2,
      );
      ellipse(120, 136, 4, 4, w.color, 1);
    } else {
      ellipse(108, 136, 11, 12, w.color, 2);
      line(
        [
          [105, 127],
          [102, 138],
        ],
        "#e5e1b9",
        2,
      );
    }
    if (p.state === "reload")
      poly(
        [
          [leftHand[0] - 5, leftHand[1] + 1],
          [leftHand[0] + 5, leftHand[1] + 1],
          [leftHand[0] + 7, leftHand[1] + 17],
          [leftHand[0] - 4, leftHand[1] + 16],
        ],
        r.metal,
        1.5,
      );
    c.restore();
    c.restore();
    c.restore();
  }
}
