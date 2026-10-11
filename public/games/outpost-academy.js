/** Scoped learning UI and procedural materials. No globals or external assets. */
import { MAPS, WEAPONS } from "./outpost-content.js";
export const PRESETS = {
  performance: {
    width: 720,
    texture: 128,
    floor: 6,
    distance: 10,
    shadows: false,
    lighting: false,
  },
  balanced: { width: 960, texture: 256, floor: 3, distance: 18, shadows: true, lighting: true },
  high: { width: 1440, texture: 512, floor: 2, distance: 28, shadows: true, lighting: true },
};
const STEPS = [
  ["Move through the range", "WASD / left joystick: walk two tiles. Shift sprints."],
  [
    "Aim and fire",
    "Mouse / drag the right side to aim. Click, Space or FIRE: destroy the stationary sentry ahead.",
  ],
  [
    "Reload your weapon",
    "Press R or the R touch button. Wait for the magazine to refill. Reserves are unlimited.",
  ],
  ["Break a Supply Crate", "Shoot the orange crate ahead. It drops a mint Charge Core."],
  [
    "Collect your Charge Core",
    "Walk into the mint core. Each gives +25 maximum health and +8 power rating for this match.",
  ],
  [
    "Use your charged ability",
    "Q / the ability button: fire Overdrive. This lesson fills your meter; in matches, dealing damage charges it.",
  ],
  [
    "Ready for deployment",
    "Last Signal: last survivor wins. Red Haze starts after 12 seconds; follow the mint minimap square. Pair Ops: protect your partner to keep your two 8-second returns. Online menus do not pause the match.",
  ],
];
export class Academy {
  constructor(game) {
    this.g = game;
    this.materials = new Map();
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem("midnry-outpost-graphics"));
    } catch {}
    this.preset = PRESETS[saved?.preset] ? saved.preset : "balanced";
    this.options = { ...PRESETS[this.preset] };
    if (saved?.options)
      for (const key of ["shadows", "lighting"])
        if (typeof saved.options[key] === "boolean") this.options[key] = saved.options[key];
    const menu = game.$(".mf-panel");
    menu.insertAdjacentHTML(
      "beforeend",
      `<div class="mf-learn"><button class="mf-boot">BOOT CAMP →</button><button class="mf-guide">FIELD GUIDE</button><button class="mf-graphics">GRAPHICS</button><button class="mf-endboot" hidden>EXIT BOOT CAMP</button><button class="mf-skipboot" hidden>SKIP LESSON</button></div>`,
    );
    game.shell.insertAdjacentHTML(
      "beforeend",
      `<aside class="mf-lesson" hidden aria-live="polite"><small></small><b></b><p></p><div><button class="mf-lesson-next">SKIP STEP</button><button class="mf-lesson-exit">EXIT TRAINING</button></div></aside><dialog class="mf-book" aria-label="Outpost field guide"><div class="mf-bookhead"><b>OUTPOST / FIELD MANUAL</b><button class="mf-bookclose">BACK</button></div><div class="mf-bookbody"></div></dialog>`,
    );
    game.on(game.$(".mf-boot"), "click", () => {
      if (game.online) {
        game.$(".mf-kitnote").textContent =
          "Leave your online room before starting offline Boot Camp.";
        return;
      }
      this.begin();
    });
    game.on(game.$(".mf-guide"), "click", () => this.open("guide"));
    game.on(game.$(".mf-graphics"), "click", () =>
      game.ui ? game.ui.settings() : this.open("graphics"),
    );
    game.on(game.$(".mf-bookclose"), "click", () => game.$(".mf-book").close());
    game.on(game.$(".mf-endboot"), "click", () => this.finish());
    game.on(game.$(".mf-skipboot"), "click", () => (this.step === 6 ? this.finish() : this.next()));
    game.on(game.$(".mf-lesson-exit"), "click", () => this.finish());
    game.on(game.$(".mf-lesson-next"), "click", () =>
      this.step === 6 ? this.finish() : this.next(),
    );
    // Modal dialog supplies native focus containment and Escape dismissal.
    game.on(game.$(".mf-book"), "keydown", (e) => e.stopPropagation());
    game.on(game.$(".mf-bookbody"), "change", (e) => this.applySetting(e));
  }
  // Both the field-guide fallback and unified settings use the same controls.
  applySetting(e, target = this.g.$(".mf-bookbody")) {
    const game = this.g;
    if (e.target.matches("[data-preset]")) {
      this.preset = e.target.value;
      this.options = { ...PRESETS[this.preset] };
      this.settings(target);
    } else if (e.target.dataset.option) this.options[e.target.dataset.option] = e.target.checked;
    else return;
    this.materials.clear();
    game.sprite = game.allySprite = game.boxSprite = game.coreSprite = null;
    game.propSprites?.clear();
    game.art?.clearCache();
    game.resize();
    try {
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: this.preset, options: this.options }),
      );
    } catch {}
  }

  open(kind) {
    const g = this.g;
    if (g.running) g.pause();
    this.returnFocus = document.activeElement;
    if (kind === "graphics") this.settings();
    else {
      g.$(".mf-bookbody").innerHTML =
        `<p class="mf-bookintro">KNOW YOUR GROUND. KNOW YOUR GEAR.</p><p>WASD / left stick moves. Mouse / right-side drag aims. Click, Space or FIRE shoots. R reloads; Q uses a fully charged ability. Escape or P opens the menu. Damage flashes red; below 30% health, vitals pulse. Hit markers confirm damage.</p><h2>Match rules</h2><p>Field Ops: eliminate six sentries. Last Signal: eight combatants, one survivor. Supply Crates drop Charge Cores (+25 max health, +8 power rating; scales weapon damage). Red Haze closes after 12 seconds and hurts more the longer you stay outside. Pair Ops: four pairs, no friendly fire, two returns each after 8 seconds while your partner lives. Losing both partners ends your team.</p><p>Online: create or join a room, share its invite, pick a loadout and team, then the host deploys. Bots fill empty seats. The host selects the map before starting. <b>Online matches keep running while reading this guide.</b></p><h2>Arenas / ${Object.keys(MAPS).length}</h2><div class="mf-guidegrid">${Object.values(
          MAPS,
        )
          .map(
            (m) =>
              `<article><canvas class="mf-mapdiagram" data-map="${m.id}" aria-label="${m.name} overhead layout"></canvas><h3>${m.name}</h3><small>${m.tag}</small><p>${m.description}</p></article>`,
          )
          .join(
            "",
          )}</div><h2>Arsenal / ${Object.keys(WEAPONS).length}</h2><p>Stats below are base damage per projectile or melee hit, before distance falloff, splash or cores. A pellet/burst attack can land several hits. All loadouts reload in 1.4 seconds; ability charge comes from damage, not time.</p><div class="mf-guidegrid">${Object.values(
          WEAPONS,
        )
          .map(
            (w) =>
              `<article style="--kit:${w.color}"><h3>${w.name}</h3><small>${w.kind.toUpperCase()} · ${w.mag} ROUNDS</small><p>${w.description}</p><dl><dt>Base hit</dt><dd>${w.damage}${w.pellets ? " × " + w.pellets : ""}</dd><dt>Range</dt><dd>${w.range} tiles</dd><dt>Attack interval</dt><dd>${w.cooldown}s</dd><dt>Charged ability</dt><dd>${w.super}</dd></dl></article>`,
          )
          .join("")}</div>`;
      for (const canvas of g.root.querySelectorAll("[data-map]")) {
        const map = MAPS[canvas.dataset.map],
          size = map.level.length;
        canvas.width = canvas.height = 192;
        const c = canvas.getContext("2d"),
          tile = 192 / size;
        c.fillStyle = map.theme.floor;
        c.fillRect(0, 0, 192, 192);
        for (const z of map.zones) {
          c.fillStyle = z.color;
          c.fillRect(z.x * tile, z.y * tile, z.w * tile, z.h * tile);
        }
        map.level.forEach((row, y) =>
          row.forEach((v, x) => {
            if (v) {
              c.fillStyle = map.theme.walls[v]?.[0] || "#111";
              c.fillRect(x * tile, y * tile, tile, tile);
              c.strokeStyle = "#101720";
              c.lineWidth = 1;
              c.strokeRect(x * tile, y * tile, tile, tile);
            }
          }),
        );
      }
    }
    g.$(".mf-book").showModal();
  }
  settings(target = this.g.$(".mf-bookbody")) {
    target.innerHTML = `<p class="mf-bookintro">INK, STEEL & SUNLIGHT</p><p>Sharpen the comic artwork without changing the bold colors and black outlines. High increases rendering cost; choose Performance if your device gets warm or play feels slow.</p><label class="mf-setting">Graphics preset<select data-preset aria-label="Graphics preset">${Object.keys(
      PRESETS,
    )
      .map(
        (k) =>
          `<option value="${k}" ${k === this.preset ? "selected" : ""}>${k[0].toUpperCase() + k.slice(1)}</option>`,
      )
      .join(
        "",
      )}</select></label><p>${this.options.texture} texel materials · up to ${this.options.width}px render width · floor sampling every ${this.options.floor}px · scenery range ${this.options.distance} tiles</p><label class="mf-setting"><span>Defined contact shadows</span><input type="checkbox" data-option="shadows" ${this.options.shadows ? "checked" : ""}></label><label class="mf-setting"><span>Cel material lighting</span><input type="checkbox" data-option="lighting" ${this.options.lighting ? "checked" : ""}></label><p>Texture resolution sharpens mortar, scuffs and metal seams. Distance-filtered texture levels reduce shimmer on angled walls and floors. Detail distance keeps scenery visible farther away. Contact shadows ground characters and crates; material lighting adds stepped highlights and dark recesses. These are Canvas effects, rather than GPU anisotropic filtering, screen-space shadows or shader settings. Preferences are saved on this device.</p>`;
  }
  begin() {
    const g = this.g;
    if (this.active) this.finish();
    this.previous = { mode: g.mode, mapId: g.mapId, weapon: g.weapon };
    g.mode = "training";
    g.mapId = "outpost";
    g.weapon = "carbine";
    g.reset();
    this.active = true;
    this.step = -1;
    g.$(".mf-endboot").hidden = g.$(".mf-skipboot").hidden = false;
    // Only this isolated practice arena changes AI/result rules. Server rules stay intact.
    g.arena.updateRival = () => {};
    g.arena.checkResult = () => {};
    g.enemies = g.enemies.slice(0, 1);
    g.player.x = 2.5;
    g.player.y = 2.5;
    g.player.a = 0;
    const target = g.enemies[0];
    target.x = 6.5;
    target.y = 2.5;
    target.name = "Practice sentry";
    this.next();
    g.start();
  }
  next() {
    if (!this.active) return;
    const g = this.g,
      p = g.player;
    this.step++;
    this.startPosition = { x: p.x, y: p.y };
    this.travel = 0;
    this.reloadSeen = false;
    if (this.step === 1) {
      p.x = 2.5;
      p.y = 2.5;
      p.a = 0;
      g.viewPitch = 0;
    }
    if (this.step === 3) {
      p.x = 2.5;
      p.y = 2.5;
      p.a = 0;
      g.viewPitch = 0;
      g.crates = [{ id: "crate-practice", x: 5.5, y: 2.5, hp: 80, maxHp: 80, hit: -10 }];
    }
    if (this.step === 5) p.charge = 100;
    const panel = g.$(".mf-lesson");
    panel.hidden = false;
    panel.querySelector("small").textContent = `BOOT CAMP / ${this.step + 1} OF ${STEPS.length}`;
    panel.querySelector("b").textContent = STEPS[this.step][0];
    panel.querySelector("p").textContent = STEPS[this.step][1];
    g.$(".mf-lesson-next").textContent = this.step === 6 ? "FINISH →" : "SKIP STEP";
    if (!matchMedia("(pointer:coarse)").matches)
      panel.querySelector("p").textContent += " Press P to release the mouse for these buttons.";
  }
  update() {
    if (!this.active) return;
    const g = this.g,
      p = g.player;
    this.travel += Math.hypot(p.x - this.startPosition.x, p.y - this.startPosition.y);
    this.startPosition = { x: p.x, y: p.y };
    g.arena.collectCores(p);
    if (this.step === 2 && p.reloadUntil) this.reloadSeen = true;
    if (
      (this.step === 0 && this.travel >= 2) ||
      (this.step === 1 && g.enemies[0].hp <= 0) ||
      (this.step === 2 && this.reloadSeen && !p.reloadUntil) ||
      (this.step === 3 && g.crates[0]?.hp <= 0) ||
      (this.step === 4 && p.cores > 0) ||
      (this.step === 5 && p.charge < 100)
    )
      this.next();
  }
  finish() {
    const g = this.g;
    this.active = false;
    g.$(".mf-lesson").hidden = true;
    g.$(".mf-endboot").hidden = g.$(".mf-skipboot").hidden = true;
    if (this.previous) Object.assign(g, this.previous);
    this.previous = null;
    g.reset();
    g.pause();
    for (const button of g.root.querySelectorAll(".mf-mode"))
      button.setAttribute("aria-pressed", String(button.dataset.mode === g.mode));
    g.$(".mf-boot").focus();
  }
  /** Cached power-of-two comic materials with mip levels for distant strips. */
  materialFill(c, color, points) {
    if (!this.options.lighting || !/^#[0-9a-f]{6}$/i.test(color)) return color;
    const ys = points.map((p) => p[1]),
      top = Math.min(...ys),
      bottom = Math.max(...ys);
    if (bottom === top) return color;
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    const shade = (f) => `rgb(${rgb.map((v) => Math.round(Math.min(255, v * f))).join(",")})`;
    const gradient = c.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, shade(1.3));
    gradient.addColorStop(0.18, shade(1.3));
    gradient.addColorStop(0.181, color);
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(0.701, shade(0.65));
    gradient.addColorStop(1, shade(0.65));
    return gradient;
  }
  wallTexture(map, type, side, size) {
    const key = [map.id, type, side, this.options.texture, this.options.lighting].join(":");
    if (!this.materials.has(key)) {
      const n = this.options.texture,
        cvs = document.createElement("canvas");
      cvs.width = cvs.height = n;
      const c = cvs.getContext("2d"),
        colors = map.theme.walls[type] || map.theme.walls[1];
      c.fillStyle = colors[side ? 1 : 0];
      c.fillRect(0, 0, n, n);
      if (this.options.lighting) {
        c.fillStyle = colors[2];
        c.fillRect(0, 0, n, n * 0.13);
        c.fillStyle = "#10172025";
        c.fillRect(0, n * 0.72, n, n * 0.28);
      }
      // Reproducible ink hatching, mortar, bolt heads and highlights.
      for (let row = 0; row < 4; row++) {
        c.fillStyle = "#101720";
        c.fillRect(0, (row * n) / 4, n, Math.max(1, n / 128));
        const offset = row % 2 ? n / 4 : 0;
        for (let col = 0; col < 3; col++) {
          const x = ((col * n) / 2 + offset) % n,
            y = (row * n) / 4;
          c.fillStyle = "#10172080";
          c.fillRect(x, y, n / 160, n / 4);
          c.fillStyle = colors[2];
          c.fillRect(x + n * 0.03, y + n * 0.025, n * 0.3, n / 160);
          c.fillStyle = "#101720";
          c.fillRect(x + n * 0.03, y + n * 0.06, n / 100, n / 100);
        }
      }
      for (let i = 0; i < 130; i++) {
        const x = (((i * 73 + 19) % 257) / 257) * n,
          y = (((i * 113 + 41) % 251) / 251) * n;
        c.strokeStyle = i % 3 ? "#10172030" : colors[2];
        c.lineWidth = n / 512;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + n * 0.015, y + n * 0.006);
        c.stroke();
      }
      this.g.art?.decorate(c, map, type, n);
      const levels = [cvs];
      while (levels.at(-1).width > 8) {
        const prev = levels.at(-1),
          next = document.createElement("canvas");
        next.width = next.height = prev.width / 2;
        next.getContext("2d").drawImage(prev, 0, 0, next.width, next.height);
        levels.push(next);
      }
      this.materials.set(key, levels);
    }
    const levels = this.materials.get(key),
      lod = Math.max(
        0,
        Math.min(
          levels.length - 1,
          Math.floor(Math.log2(this.options.texture / Math.max(8, size))),
        ),
      );
    return levels[lod];
  }
  floor(map, p, horizon) {
    const g = this.g,
      c = g.ctx,
      step = this.options.floor;
    const width = Math.ceil(g.w / step),
      height = Math.ceil(g.h / step);
    if (
      !this.floorCanvas ||
      this.floorCanvas.width !== width ||
      this.floorCanvas.height !== height
    ) {
      this.floorCanvas = document.createElement("canvas");
      this.floorCanvas.width = width;
      this.floorCanvas.height = height;
      this.floorContext = this.floorCanvas.getContext("2d");
      this.floorPixels = this.floorContext.createImageData(width, height);
    }
    const data = this.floorPixels.data;
    data.fill(0);
    const rgb = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    const base = rgb(map.theme.floor),
      zones = map.zones.map((z) => ({ ...z, rgb: rgb(z.color) }));
    const ca = Math.cos(p.a),
      sa = Math.sin(p.a),
      plane = Math.tan(Math.PI / 6);
    for (let row = Math.max(0, Math.ceil((horizon + step) / step)); row < height; row++) {
      const y = row * step,
        d = (g.projection * 0.5) / (y - horizon);
      if (d > 32) continue;
      for (let col = 0; col < width; col++) {
        const q = ((2 * col * step) / g.w - 1) * plane,
          fx = p.x + (ca - sa * q) * d,
          fy = p.y + (sa + ca * q) * d;
        const zone = zones.find((z) => fx >= z.x && fy >= z.y && fx < z.x + z.w && fy < z.y + z.h),
          color = zone?.rgb || base;
        const u = fx - Math.floor(fx),
          v = fy - Math.floor(fy),
          seam = Math.min(u, v, 1 - u, 1 - v);
        let shade = seam < 0.025 && d < 18 ? 0.55 : 1;
        if (d < 8 && seam >= 0.025)
          shade += (Math.floor(fx * 48) * 17 + Math.floor(fy * 48) * 31) % 13 < 3 ? 0.12 : -0.025;
        if (this.options.lighting && seam < 0.065 && seam >= 0.025 && d < 12) shade += 0.15;
        const haze =
            g.mode !== "training" && g.time > g.zone.delay && g.outsideSafe({ x: fx, y: fy }),
          i = (row * width + col) * 4;
        for (let k = 0; k < 3; k++)
          data[i + k] = haze ? color[k] * shade * 0.64 + [181, 34, 80][k] * 0.36 : color[k] * shade;
        data[i + 3] = 255;
      }
    }
    this.floorContext.putImageData(this.floorPixels, 0, 0);
    c.drawImage(this.floorCanvas, 0, 0, g.w, g.h);
  }
}
