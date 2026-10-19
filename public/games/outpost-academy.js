/** Scoped learning UI and procedural materials. No globals or external assets. */
import { MAPS, WEAPONS } from "./outpost-content.js";
export const PRESETS = {
  performance: {
    adaptive: true,
    width: 720,
    militaryWidth: 720,
    texture: 128,
    floor: 6,
    distance: 10,
    shadows: false,
    lighting: false,
  },
  balanced: {
    adaptive: true,
    width: 960,
    militaryWidth: 1280,
    texture: 256,
    floor: 3,
    distance: 18,
    shadows: true,
    lighting: true,
  },
  high: {
    adaptive: true,
    width: 1440,
    militaryWidth: 1920,
    texture: 512,
    floor: 2,
    distance: 28,
    shadows: true,
    lighting: true,
  },
};
const STEPS = [
  [
    "Move through the range",
    "WASD / left joystick: walk two tiles. Hold Shift or toggle SPRINT to run. C / Ctrl / SLIDE triggers a forward sprint slide.",
  ],
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
      for (const key of ["shadows", "lighting", "adaptive"])
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
      // Mission help must preserve the rescue instead of switching it into
      // the separate shooting-range tutorial and discarding its progress.
      if (game.mode === "protocol" && game.protocolUI) {
        game.protocolUI.showGuide();
        return;
      }
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
    game.shell.insertAdjacentHTML(
      "beforeend",
      `<dialog class="mf-weaponinspect" aria-label="Weapon inspection"><button aria-label="Close weapon inspection">BACK</button><h2></h2><img width="960" height="600"><p></p></dialog>`,
    );
    game.on(game.$(".mf-weaponinspect button"), "click", () => game.$(".mf-weaponinspect").close());
    game.on(game.$(".mf-weaponinspect"), "keydown", (e) => e.stopPropagation());
    game.on(game.$(".mf-bookbody"), "click", (e) => {
      const button = e.target.closest("[data-inspect]");
      if (!button) return;
      const w = WEAPONS[button.dataset.inspect];
      if (!w) return;
      const dialog = game.$(".mf-weaponinspect"),
        image = dialog.querySelector("img");
      dialog.querySelector("h2").textContent = w.name;
      image.src = `/games/arsenal/${w.id}.webp`;
      image.alt = `${w.name} full-size weapon`;
      dialog.querySelector("p").textContent = w.description;
      dialog.showModal();
    });
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
    const candidate = { preset: this.preset, options: { ...this.options } };
    if (e.target.matches("[data-preset]")) {
      candidate.preset = e.target.value;
      candidate.options = { ...PRESETS[candidate.preset] };
    } else if (["shadows", "lighting", "adaptive"].includes(e.target.dataset.option)) {
      candidate.options[e.target.dataset.option] = e.target.checked;
    } else return;
    if (this.g.ui)
      this.g.ui.confirmGraphics(
        candidate,
        target,
        e.target.matches("[data-preset]")
          ? "[data-preset]"
          : `[data-option="${e.target.dataset.option}"]`,
      );
    else this.commitGraphics(candidate, target);
  }
  commitGraphics(candidate, target) {
    const game = this.g;
    this.preset = candidate.preset;
    this.options = { ...candidate.options };
    this.settings(target);
    this.materials.clear();
    this.floorKey = null;
    if (game.budget) game.budget.scale = 1;
    game.boxSprite = game.coreSprite = null;
    game.propSprites?.clear();
    game.art?.clearCache();
    game.characters?.clearCache();
    game.environment?.clearCache();
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
    if (kind === "guide" && g.mode === "protocol" && g.protocolUI) {
      g.protocolUI.showGuide();
      return;
    }
    if (g.running) g.pause();
    this.returnFocus = document.activeElement;
    if (kind === "graphics") this.settings();
    else {
      g.$(".mf-bookbody").innerHTML =
        `<p class="mf-bookintro">KNOW YOUR GROUND. KNOW YOUR GEAR.</p><p>WASD / left stick moves. Mouse / right-side drag aims. Click, Space or FIRE shoots. Shift / SPRINT runs; Ctrl or SLIDE slides while sprinting forward. R reloads; Q uses a fully charged ability. Escape or P opens the menu. Damage flashes red; below 30% health, vitals pulse. Hit markers confirm damage.</p><h2>Match rules</h2><p>Blackout Protocol / Lifeline Run: gather and load 13 medical items at Breakwater, then fly Lifeline Medevac to wounded soldiers. Save at least one surviving patient by delivering aid. A sabotaged autopilot requires an operator at the helm to trim flight level and course for three seconds before restoring it. Patients and flight safety keep advancing during meetings. Use the Blackout Protocol manual for the full cargo, rescue and flight controls.</p><p>Field Ops: eliminate six sentries. Last Signal: eight combatants, one survivor. Supply Crates drop Charge Cores (+25 max health, +8 power rating; scales weapon damage). Red Haze closes after 12 seconds and hurts more the longer you stay outside. Pair Ops: four pairs, no friendly fire, two returns each after 8 seconds while your partner lives. Losing both partners ends your team.</p><p>Online: create or join a room, share its invite, pick a loadout and team, then the host deploys. Bots fill empty seats. The host selects the map before starting. <b>Online matches keep running while reading this guide.</b></p><h2>Arenas / ${Object.values(MAPS).filter((map) => !["breakwater", "medevac"].includes(map.id)).length}</h2><div class="mf-guidegrid">${Object.values(
          MAPS,
        )
          .filter((map) => !["breakwater", "medevac"].includes(map.id))
          .map(
            (m) =>
              `<article><canvas class="mf-mapdiagram" data-map="${m.id}" aria-label="${m.name} overhead layout"></canvas><h3>${m.name}</h3><small>${m.tag}</small><p>${m.description}</p></article>`,
          )
          .join(
            "",
          )}</div><h2>Arsenal / ${Object.keys(WEAPONS).length}</h2><p>Stats below are base damage per projectile or melee hit, before distance falloff, splash or cores. A pellet/burst attack can land several hits. All loadouts reload in 1.4 seconds; ability charge comes from damage, not time.</p><p>Tap any weapon image to inspect the full-size view. AI opponents can carry every loadout, including launchers and melee weapons.</p><div class="mf-guidegrid mf-arsenalgrid">${Object.values(
          WEAPONS,
        )
          .map(
            (w) =>
              `<article style="--kit:${w.color}"><button class="mf-inspectweapon" data-inspect="${w.id}" aria-label="Inspect ${w.name}"><img class="mf-weaponportrait" src="/games/arsenal/${w.id}.webp" alt="${w.name} weapon" width="960" height="600" loading="lazy"><span>Inspect weapon ↗</span></button><h3>${w.name}</h3><small>${w.kind.toUpperCase()} · ${w.mag} ROUNDS</small><p>${w.description}</p><dl><dt>Base hit</dt><dd>${w.damage}${w.pellets ? " × " + w.pellets : ""}</dd><dt>Range</dt><dd>${w.range} tiles</dd><dt>Attack interval</dt><dd>${w.cooldown}s</dd><dt>Charged ability</dt><dd>${w.super}</dd></dl></article>`,
          )
          .join("")}</div>`;
      for (const canvas of g.root.querySelectorAll("[data-map]")) {
        const map = MAPS[canvas.dataset.map],
          size = map.level.length;
        canvas.width = canvas.height = 192;
        const c = canvas.getContext("2d"),
          tile = 192 / size;
        c.fillStyle = "#4f686d";
        c.fillRect(0, 0, 192, 192);
        map.level.forEach((row, y) =>
          row.forEach((v, x) => {
            if (v) {
              c.fillStyle = v === 1 ? "#9aa9a4" : "#768b88";
              c.fillRect(x * tile, y * tile, tile, tile);
            }
          }),
        );
      }
    }
    g.$(".mf-book").showModal();
  }
  settings(target = this.g.$(".mf-bookbody")) {
    const shadowSize = this.preset === "high" ? 4096 : this.preset === "performance" ? 1024 : 2048;
    target.innerHTML = `<p class="mf-bookintro">CINEMATIC GRAPHICS</p><p>Realistic materials, dynamic lighting and wet-surface reflections. High increases rendering cost; choose Performance if your device gets warm or play feels slow.</p><label class="mf-setting">Graphics preset<select data-preset aria-label="Graphics preset">${Object.keys(
      PRESETS,
    )
      .map(
        (k) =>
          `<option value="${k}" ${k === this.preset ? "selected" : ""}>${k[0].toUpperCase() + k.slice(1)}</option>`,
      )
      .join(
        "",
      )}</select></label><p>${this.g.military ? this.options.militaryWidth : this.options.width}px base render width · ${shadowSize}px shadow maps${this.preset === "performance" ? " · streamlined lighting" : " · cinematic finishing"}</p><p class="mf-perfstatus">120 FPS target · 30 FPS animation</p><label class="mf-setting"><span>Automatic resolution for 120 FPS</span><input type="checkbox" data-option="adaptive" ${this.options.adaptive ? "checked" : ""}></label><p>Resolution adapts to rendering cost and can increase when sustained headroom is measured. Actual FPS depends on your device and display refresh rate. Turn this off to keep the selected render resolution.</p><label class="mf-setting"><span>Dynamic and contact shadows</span><input type="checkbox" data-option="shadows" ${this.options.shadows ? "checked" : ""}></label><label class="mf-setting"><span>Cinematic material lighting</span><input type="checkbox" data-option="lighting" ${this.options.lighting ? "checked" : ""}></label><p>Photographic color, normal and roughness maps add surface detail. Anisotropic filtering keeps angled textures clear. High adds mirror reflections in wet ground, screen-space contact shadows and larger shadow maps. Preferences are saved on this device.</p>`;
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
      const illustrated = this.g.environment?.wall(c, map, type, side, n, this.options.lighting);
      if (!illustrated) {
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
      step = Math.ceil(this.options.floor / (g.budget?.scale || 1));
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
    const ground = g.environment?.loaded ? g.environment.ground(map) : null;
    const key = `${map.id}:${g.w}:${g.h}:${p.x}:${p.y}:${p.a}:${horizon}:${step}:${this.options.lighting}:${g.environment?.revision}:${g.mode}:${g.time > g.zone.delay ? g.zone.half : 0}`;
    if (this.floorKey === key) {
      c.save();
      c.imageSmoothingEnabled = !!ground;
      c.drawImage(this.floorCanvas, 0, 0, g.w, g.h);
      c.restore();
      return;
    }
    this.floorKey = key;
    const data = this.floorPixels.data;
    data.fill(0);
    const rgb = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    const base = rgb(map.theme.floor),
      zones = map.zones.map((z, i) => ({ ...z, rgb: rgb(z.color), material: i + 1 }));
    const hazeActive = g.mode !== "training" && g.time > g.zone.delay,
      zoneMinX = g.zone.cx - g.zone.half,
      zoneMaxX = g.zone.cx + g.zone.half,
      zoneMinY = g.zone.cy - g.zone.half,
      zoneMaxY = g.zone.cy + g.zone.half;
    const ca = Math.cos(p.a),
      sa = Math.sin(p.a),
      plane = g.viewPlane;
    for (let row = Math.max(0, Math.ceil((horizon + step) / step)); row < height; row++) {
      const y = row * step,
        d = (g.projection * 0.5) / (y - horizon);
      if (d > 32) continue;
      const lod = ground
        ? Math.max(
            0,
            Math.min(
              ground[0].length - 1,
              Math.floor(Math.log2((ground[0][0].size * d * step) / (g.projection * 2))),
            ),
          )
        : 0;
      const fog = Math.min(0.72, Math.max(0, (d - 4) * 0.025));
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
            hazeActive && (fx < zoneMinX || fx > zoneMaxX || fy < zoneMinY || fy > zoneMaxY),
          i = (row * width + col) * 4;
        if (ground) {
          // Two world tiles per painted repeat. Distance mipmaps suppress shimmer.
          const material = ground[zone?.material || 0] || ground[0],
            level = material[lod];
          const tx = Math.floor(((((fx * 0.5) % 1) + 1) % 1) * level.size),
            ty = Math.floor(((((fy * 0.5) % 1) + 1) % 1) * level.size),
            ti = (ty * level.size + tx) * 4;
          const light = this.options.lighting ? 0.92 : 1;
          let r = level.pixels[ti] * light * (1 - fog) + base[0] * fog,
            green = level.pixels[ti + 1] * light * (1 - fog) + base[1] * fog,
            b = level.pixels[ti + 2] * light * (1 - fog) + base[2] * fog;
          // Existing cargo-lane markings stay useful against the painted concrete.
          if (map.id === "freight" && zone && (u < 0.07 || v < 0.07)) {
            r = r * 0.3 + 161;
            green = green * 0.3 + 123;
            b = b * 0.3 + 39;
          }
          data[i] = haze ? r * 0.64 + 65.16 : r;
          data[i + 1] = haze ? green * 0.64 + 12.24 : green;
          data[i + 2] = haze ? b * 0.64 + 28.8 : b;
        } else {
          const factor = haze ? shade * 0.64 : shade;
          data[i] = color[0] * factor + (haze ? 65.16 : 0);
          data[i + 1] = color[1] * factor + (haze ? 12.24 : 0);
          data[i + 2] = color[2] * factor + (haze ? 28.8 : 0);
        }
        data[i + 3] = 255;
      }
    }
    this.floorContext.putImageData(this.floorPixels, 0, 0);
    c.save();
    c.imageSmoothingEnabled = !!ground;
    c.drawImage(this.floorCanvas, 0, 0, g.w, g.h);
    c.restore();
  }
}

/** Display cadence stays on requestAnimationFrame. Work adapts toward an 8.3ms budget. */
export class FrameBudget {
  constructor() {
    this.target = 120;
    this.scale = 1;
    this.work = 0;
    this.fps = 0;
    this.samples = 0;
    this.windowStart = null;
    this.windowFrames = 0;
    this.cooldown = 0;
    this.slowFrames = 0;
    this.headroomFrames = 0;
  }
  sample(cost, now, active, adaptive = true, gpuMs = null, maxScale = 1) {
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(now)) return false;
    if (this.windowStart === null || now - this.windowStart > 2000) {
      this.windowStart = now;
      this.windowFrames = 0;
    } else this.windowFrames++;
    if (now - this.windowStart >= 500) {
      this.fps = Math.round((this.windowFrames * 1000) / (now - this.windowStart));
      this.windowFrames = 0;
      this.windowStart = now;
    }
    this.work = this.samples ? this.work * 0.9 + cost * 0.1 : cost;
    this.gpu = Number.isFinite(gpuMs) && gpuMs >= 0 ? gpuMs : null;
    const renderingCost = Math.max(this.work, this.gpu || 0);
    this.samples++;
    this.cooldown++;
    if (active && Math.max(cost, this.gpu || 0) > 7.5) this.slowFrames++;
    if (!adaptive) {
      this.headroomFrames = 0;
      const changed = this.scale !== 1;
      this.scale = 1;
      return changed;
    }
    const ceiling = Math.max(1, Math.min(1.5, Number.isFinite(maxScale) ? maxScale : 1));
    if (this.scale > ceiling) { this.scale = ceiling; return true; }
    if (!active) { this.headroomFrames = 0; return false; }
    // Count fast gameplay samples, not time spent in a cheap loading/menu view.
    // A spike restarts the upward hold even when the EMA still looks cheap.
    this.headroomFrames = Math.max(cost, this.gpu || 0) < 3.2 && renderingCost < 3.2 && this.slowFrames === 0
      ? this.headroomFrames + 1 : 0;
    if (this.samples < 60) return false;
    const previous = this.scale;
    if ((renderingCost > 6.8 || this.slowFrames >= 3) && this.cooldown >= 60) {
      this.scale = Math.max(0.5, Math.round(this.scale * 0.9 * 100) / 100);
      this.cooldown = 0;
      this.slowFrames = 0;
    } else if (this.headroomFrames >= 480 && this.cooldown >= 480 &&
      // Above the base cap, cheap CPU submission alone is not GPU headroom.
      // Without timer queries require near-target measured display cadence.
      (this.scale < 1 || this.gpu !== null || this.fps >= 110 || ceiling === 1)) {
      this.scale = Math.min(ceiling, Math.round((this.scale + 0.08) * 100) / 100);
      this.cooldown = 0;
      this.headroomFrames = 0;
    }
    if (this.cooldown % 60 === 0) this.slowFrames = 0;
    return Math.abs(this.scale - previous) > 0.001;
  }
}
