import * as Phaser from "phaser";
import { DISTRICTS, MAPS, PLACES, WORLD, districtAt } from "../systems/data";
import { HAIR_COLOR } from "../systems/art";
import { ROADS, blocked, sizeOf, solidsFor } from "../systems/citymap";
import { bump, checkpoint, currentBeat, mapIdFor, peopleOn, personAt, personKey, savePosition, taskReach } from "../systems/engine";
import { check } from "../systems/rules";
import { bus, getState, input, subscribe } from "../systems/store";
import type { MapRect } from "../systems/types";

const SPEED = 230;
const NEAR = 105;
const RADIUS = 14;
const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const label = (scene: Phaser.Scene, x: number, y: number, text: string, size = 14, fill = "#fafaf9") =>
  scene.add
    .text(x, y, text, { fontFamily: "system-ui, sans-serif", fontSize: `${size}px`, color: fill, backgroundColor: "#000000aa", padding: { x: 5, y: 2 } })
    .setOrigin(0.5, 0);

type Near = { kind: "place" | "person" | "beat"; id: string; label: string };
type Interactable = Near & { x: number; y: number };

/**
 * The walkable world: the city of Abuja in adulthood, or a small map for each
 * story chapter. All visuals are placeholder shapes, so sprites can replace
 * them later without touching game logic.
 */
export class WorldScene extends Phaser.Scene {
  private mapId = "city";
  private solids: MapRect[] = [];
  private player!: Phaser.GameObjects.Container;
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "e" | "space", Phaser.Input.Keyboard.Key>;
  private target: Phaser.Math.Vector2 | null = null;
  private near: Near | null = null;
  private lastSave = 0;
  private lastBlocked = 0;
  private placeMarkers: { id: string; marker: Phaser.GameObjects.Container }[] = [];
  private people: (Interactable & { body: Phaser.GameObjects.Container; home: { x: number; y: number }; vx: number; vy: number })[] = [];
  private walkers: { sprite: Phaser.GameObjects.Arc; axis: "x" | "y"; speed: number }[] = [];
  private cars: { body: Phaser.GameObjects.Rectangle; axis: "x" | "y"; speed: number }[] = [];
  private police: { officer: Phaser.GameObjects.Container; barrier: Phaser.GameObjects.Rectangle; x: number; y: number }[] = [];
  private beatMarker!: Phaser.GameObjects.Container;
  private taskMarker!: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Triangle;
  private night!: Phaser.GameObjects.Rectangle;
  private unsub: (() => void) | null = null;
  private offs: (() => void)[] = [];

  constructor() {
    super("world");
  }

  create() {
    const state = getState();
    this.mapId = state ? mapIdFor(state) : "city";
    this.solids = solidsFor(this.mapId);
    this.placeMarkers = [];
    this.people = [];
    this.walkers = [];
    this.cars = [];
    this.police = [];
    const { width, height } = sizeOf(this.mapId);
    this.cameras.main.setBackgroundColor(this.mapId === "city" ? "#1b1712" : "#1d1a14");

    if (this.mapId === "city") this.drawCity();
    else this.drawChapterMap();
    this.drawPeople();

    const start = this.startPoint();
    this.player = this.makePlayer(start.x, start.y);
    this.beatMarker = this.makeMarker(0xfbbf24, "!");
    this.taskMarker = this.makeMarker(0x22d3ee, "★");
    this.arrow = this.add.triangle(0, 0, 0, -12, 9, 8, -9, 8, 0xfbbf24).setDepth(20).setVisible(false);
    this.night = this.add.rectangle(0, 0, 4000, 4000, 0x0b1330, 0).setOrigin(0).setScrollFactor(0).setDepth(30);

    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.fitZoom();
    this.scale.on("resize", this.fitZoom, this);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D", e: "E", space: "SPACE" }) as typeof this.keys;
    kb.disableGlobalCapture();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });

    this.offs.push(
      bus.on("teleport", ({ x, y }) => {
        if (this.mapId !== "city") return;
        this.player.setPosition(x, y);
        this.target = null;
      }),
    );
    // Restart when the story moves to another map; refresh markers on other changes.
    this.unsub = subscribe(() => {
      const next = getState();
      if (!next) return;
      if (mapIdFor(next) !== this.mapId) {
        this.scene.restart();
        return;
      }
      this.refresh();
    });
    this.events.once("shutdown", () => {
      this.unsub?.();
      this.unsub = null;
      this.offs.forEach((off) => off());
      this.offs = [];
      this.scale.off("resize", this.fitZoom, this);
    });
    this.refresh();
    this.near = null;
    bus.emit("near", null);
    // Development only: lets automated browser tests move the player.
    if (import.meta.env.DEV) (window as unknown as { __abuja?: unknown }).__abuja = { place: (x: number, y: number) => this.player.setPosition(x, y) };
  }

  private startPoint() {
    const state = getState();
    if (this.mapId !== "city") return MAPS[this.mapId]!.spawn;
    if (state?.pos.x) return state.pos;
    return { x: PLACES[0]!.x, y: PLACES[0]!.y + 95 };
  }

  private fitZoom() {
    const { width, height } = this.scale;
    const small = Math.min(width, height);
    this.cameras.main.setZoom(small < 520 ? 0.78 : small < 800 ? 0.92 : 1);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  private drawCity() {
    const g = this.add.graphics();
    for (const d of DISTRICTS) {
      g.fillStyle(color(d.color), d.gate ? 0.3 : 0.2).fillRect(d.x, d.y, d.w, d.h);
      g.lineStyle(2, color(d.color), 0.6).strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
      label(this, d.x + 90, d.y + 10, `${d.name}${d.gate ? " 🔒" : ""}`, 20, "#fde68a").setAlpha(0.9);
    }
    this.drawRoads(g);
    this.drawSolids(g);
    this.drawPlaces();
    this.spawnTraffic();
  }

  private drawRoads(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x3a352f, 1);
    ROADS.xs.forEach((x) => g.fillRect(x - 22, 0, 44, WORLD.height));
    ROADS.ys.forEach((y) => g.fillRect(0, y - 22, WORLD.width, 44));
    g.fillStyle(0xfacc15, 0.55);
    ROADS.xs.forEach((x) => {
      for (let y = 0; y < WORLD.height; y += 40) g.fillRect(x - 1, y, 2, 20);
    });
    ROADS.ys.forEach((y) => {
      for (let x = 0; x < WORLD.width; x += 40) g.fillRect(x, y - 1, 20, 2);
    });
  }

  private drawSolids(g: Phaser.GameObjects.Graphics) {
    for (const s of this.solids) {
      const base = color(s.color ?? "#57534e");
      g.fillStyle(0x000000, 0.35).fillRoundedRect(s.x + 5, s.y + 7, s.w, s.h, Math.min(6, s.h / 2));
      g.fillStyle(base, 0.95).fillRoundedRect(s.x, s.y, s.w, s.h, Math.min(6, s.h / 2));
      if (s.h > 30 && s.w > 30) {
        g.fillStyle(0xffffff, 0.12).fillRoundedRect(s.x + 4, s.y + 4, s.w - 8, Math.min(14, s.h / 3), 4);
        g.fillStyle(0xfef3c7, 0.35);
        for (let wx = s.x + 12; wx < s.x + s.w - 12; wx += 22) g.fillRect(wx, s.y + s.h - 22, 10, 10);
      }
      if (s.label) label(this, s.x + s.w / 2, s.y + s.h / 2 - 9, s.label, 14);
    }
  }

  private drawChapterMap() {
    const map = MAPS[this.mapId]!;
    const g = this.add.graphics();
    for (const z of map.zones) {
      g.fillStyle(color(z.color), 0.28).fillRect(z.x, z.y, z.w, z.h);
      g.lineStyle(2, color(z.color), 0.6).strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
      label(this, z.x + 100, z.y + 10, z.name, 20, "#fde68a").setAlpha(0.9);
    }
    g.fillStyle(0x6b5b45, 0.5);
    g.fillRect(0, map.height / 2 - 20, map.width, 40);
    g.fillRect(map.width / 2 - 20, 0, 40, map.height);
    this.drawSolids(g);
    for (const spot of Object.values(map.spots)) label(this, spot.x, spot.y + 26, spot.label, 13, "#e7e5e4").setAlpha(0.7);
  }

  private drawPlaces() {
    for (const p of PLACES) {
      const c = color(p.color);
      const ring = this.add.circle(0, 0, 30, c, 0.18).setStrokeStyle(2, c, 0.9);
      const dot = this.add.circle(0, 0, 14, c, 1);
      const text = label(this, 0, 36, p.name, 15);
      const marker = this.add.container(p.x, p.y, [ring, dot, text]);
      this.tweens.add({ targets: ring, scale: 1.25, alpha: 0.4, duration: 1100, yoyo: true, repeat: -1 });
      this.placeMarkers.push({ id: p.id, marker });
    }
  }

  private figure(x: number, y: number, body: number, name?: string, nameColor = "#fafaf9") {
    const parts: Phaser.GameObjects.GameObject[] = [
      this.add.ellipse(0, 16, 26, 8, 0x000000, 0.35),
      this.add.circle(0, 6, 12, body),
      this.add.circle(0, -10, 8, 0x8d5524),
    ];
    if (name) parts.push(label(this, 0, -38, name, 12, nameColor));
    return this.add.container(x, y, parts).setDepth(8);
  }

  private drawPeople() {
    const state = getState();
    if (!state) return;
    for (const p of peopleOn(state, this.mapId)) {
      const at = personAt(p);
      const body = this.figure(at.x, at.y, color(p.color), p.name);
      const bubble = this.add.text(12, -30, "💬", { fontSize: "16px" });
      body.add(bubble);
      this.tweens.add({ targets: bubble, y: -36, duration: 800, yoyo: true, repeat: -1 });
      this.people.push({ kind: "person", id: personKey(p), label: p.name, x: at.x, y: at.y, body, home: at, vx: 0, vy: 0 });
    }
  }

  private spawnTraffic() {
    const tones = [0xf59e0b, 0x22c55e, 0x60a5fa, 0xf472b6, 0xa78bfa, 0xe5e7eb];
    for (let i = 0; i < 26; i += 1) {
      const axis = i % 2 ? "x" : "y";
      const line = axis === "x" ? ROADS.ys[i % ROADS.ys.length]! + 30 : ROADS.xs[i % ROADS.xs.length]! + 30;
      const pos = Math.random() * (axis === "x" ? WORLD.width : WORLD.height);
      const sprite = this.add.circle(axis === "x" ? pos : line, axis === "x" ? line : pos, 7, tones[i % tones.length]!, 0.9).setDepth(5);
      this.walkers.push({ sprite, axis, speed: (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 25) });
    }
    const vehicles = [
      { w: 40, h: 20, c: 0xe11d48 },
      { w: 40, h: 20, c: 0x2563eb },
      { w: 26, h: 18, c: 0xfacc15 }, // keke
      { w: 44, h: 22, c: 0xf59e0b }, // danfo
      { w: 20, h: 12, c: 0x111827 }, // okada
    ];
    for (let i = 0; i < 18; i += 1) {
      const axis = i % 2 ? "x" : "y";
      const v = vehicles[i % vehicles.length]!;
      const lane = (i % 4 < 2 ? -1 : 1) * 10;
      const roadLine = axis === "x" ? ROADS.ys[i % ROADS.ys.length]! : ROADS.xs[i % ROADS.xs.length]!;
      const pos = Math.random() * (axis === "x" ? WORLD.width : WORLD.height);
      const body = this.add
        .rectangle(axis === "x" ? pos : roadLine + lane, axis === "x" ? roadLine + lane : pos, axis === "x" ? v.w : v.h, axis === "x" ? v.h : v.w, v.c)
        .setStrokeStyle(2, 0x000000, 0.4)
        .setDepth(6);
      this.cars.push({ body, axis, speed: (lane < 0 ? -1 : 1) * (110 + Math.random() * 90) });
    }
  }

  private makePlayer(x: number, y: number) {
    const state = getState();
    const halo = this.add.circle(0, 0, 30, 0xfbbf24, 0.16).setStrokeStyle(3, 0xfbbf24, 0.9);
    const shadow = this.add.ellipse(0, 20, 34, 10, 0x000000, 0.35);
    const body = this.add.circle(0, 8, 16, color(state?.looks.outfit ?? "#1d4ed8"));
    const head = this.add.circle(0, -12, 11, color(state?.looks.skin ?? "#8d5524"));
    const hair = this.add.arc(0, -15, 11, 180, 360, false, color(HAIR_COLOR));
    const me = this.add
      .text(0, -48, "YOU", { fontFamily: "system-ui", fontSize: "13px", fontStyle: "bold", color: "#14110f", backgroundColor: "#fbbf24", padding: { x: 5, y: 2 } })
      .setOrigin(0.5);
    this.tweens.add({ targets: halo, scale: 1.15, duration: 700, yoyo: true, repeat: -1 });
    return this.add.container(x, y, [halo, shadow, body, head, hair, me]).setDepth(10).setScale(1.2);
  }

  private makeMarker(tint: number, glyph: string) {
    const ring = this.add.circle(0, 0, 34, tint, 0.2).setStrokeStyle(3, tint, 1);
    const sign = this.add
      .text(0, -62, glyph, { fontFamily: "system-ui", fontSize: "28px", fontStyle: "bold", color: "#14110f", backgroundColor: Phaser.Display.Color.IntegerToColor(tint).rgba, padding: { x: 8, y: 2 } })
      .setOrigin(0.5);
    this.tweens.add({ targets: sign, y: -72, duration: 600, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: ring, scale: 1.3, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    return this.add.container(0, 0, [ring, sign]).setDepth(9).setVisible(false);
  }

  // ── State-driven updates ────────────────────────────────────────────────────

  private refresh() {
    const state = getState();
    if (!state) return;
    for (const { id, marker } of this.placeMarkers) {
      const def = PLACES.find((p) => p.id === id);
      marker.setVisible(check(state, (def as { if?: never })?.if));
    }
    const beat = currentBeat(state);
    this.beatMarker.setVisible(Boolean(beat));
    if (beat) this.beatMarker.setPosition(beat.spot.x, beat.spot.y);
    const step = state.task?.steps[state.task.index];
    this.taskMarker.setVisible(Boolean(step) && this.mapId === "city");
    if (step) this.taskMarker.setPosition(step.x, step.y);

    // Police set up checkpoints when your Heat is high.
    const wantPolice = this.mapId === "city" && state.stats.heat >= 40;
    if (wantPolice && this.police.length === 0) {
      for (const [x, y] of [
        [1000, 1000],
        [1500, 600],
        [800, 500],
        [1600, 1100],
      ] as const) {
        const barrier = this.add.rectangle(x, y, 44, 10, 0xef4444).setStrokeStyle(2, 0xffffff).setDepth(7);
        const officer = this.figure(x + 30, y - 30, 0x1e3a8a, "POLICE", "#93c5fd");
        this.police.push({ officer, barrier, x, y });
      }
    }
    if (!wantPolice && this.police.length) {
      this.police.forEach((p) => {
        p.officer.destroy();
        p.barrier.destroy();
      });
      this.police = [];
    }
    const alpha = this.mapId !== "city" ? 0 : [0, 0.06, 0.2, 0.42][Math.min(state.slot, 3)]!;
    this.night.setFillStyle(state.slot === 2 ? 0x7c2d12 : 0x0b1330, alpha);
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const state = getState();
    if (!state) return;
    this.moveTraffic(dt);
    const paused = state.event || state.ending || state.task?.haggle || (state.chapter && (state.result || !currentBeat(state)));
    if (paused) return;

    let vx = input.x;
    let vy = input.y;
    const k = this.keys;
    if (k.left.isDown || k.a.isDown) vx -= 1;
    if (k.right.isDown || k.d.isDown) vx += 1;
    if (k.up.isDown || k.w.isDown) vy -= 1;
    if (k.down.isDown || k.s.isDown) vy += 1;
    if (vx || vy) this.target = null;
    else if (this.target) {
      const dx = this.target.x - this.player.x;
      const dy = this.target.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) this.target = null;
      else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }
    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    if (vx || vy) this.move(vx * SPEED * dt, vy * SPEED * dt, time);

    this.checkNear();
    if (Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.space) || input.interact) {
      input.interact = false;
      if (this.near) bus.emit("interact", this.near);
    }
    this.checkTask();
    this.checkStreet();
    this.pointArrow();
    if (this.mapId === "city" && time - this.lastSave > 2000) {
      this.lastSave = time;
      savePosition(this.player.x, this.player.y, districtAt(this.player.x, this.player.y)?.id ?? state.district);
    }
  }

  private move(dx: number, dy: number, time: number) {
    const { width, height } = sizeOf(this.mapId);
    const state = getState()!;
    const free = (x: number, y: number) => {
      if (x < RADIUS || y < RADIUS || x > width - RADIUS || y > height - RADIUS) return false;
      if (blocked(x, y, RADIUS, this.solids)) return false;
      if (this.mapId === "city") {
        const d = districtAt(x, y);
        if (d?.gate && !check(state, d.gate.if)) {
          if (time - this.lastBlocked > 2500) {
            this.lastBlocked = time;
            bus.emit("blocked", d.gate.message);
          }
          return false;
        }
      }
      return true;
    };
    // Slide along walls: try both axes, then each alone.
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (free(nx, ny)) this.player.setPosition(nx, ny);
    else if (free(nx, this.player.y)) this.player.setX(nx);
    else if (free(this.player.x, ny)) this.player.setY(ny);
    else this.target = null;
  }

  private checkNear() {
    const state = getState()!;
    const options: Interactable[] = [];
    for (const { id, marker } of this.placeMarkers) {
      if (marker.visible) options.push({ kind: "place", id, label: PLACES.find((p) => p.id === id)!.name, x: marker.x, y: marker.y });
    }
    for (const p of this.people) options.push({ kind: "person", id: p.id, label: p.label, x: p.body.x, y: p.body.y });
    const beat = currentBeat(state);
    if (beat) options.push({ kind: "beat", id: beat.key, label: beat.spot.label, x: beat.spot.x, y: beat.spot.y });
    let best: Interactable | null = null;
    let bestDist = NEAR;
    for (const o of options) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, o.x, o.y) - (o.kind === "beat" ? 30 : 0);
      if (dist < bestDist) {
        best = o;
        bestDist = dist;
      }
    }
    const changed = (best?.id ?? null) !== (this.near?.id ?? null);
    this.near = best ? { kind: best.kind, id: best.id, label: best.label } : null;
    if (changed) bus.emit("near", this.near);
  }

  private checkTask() {
    const state = getState()!;
    const step = state.task?.steps[state.task.index];
    if (!step || this.mapId !== "city") return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, step.x, step.y) < 48) taskReach();
  }

  private checkStreet() {
    if (this.mapId !== "city") return;
    for (const car of this.cars) {
      if (Math.abs(car.body.x - this.player.x) < 24 && Math.abs(car.body.y - this.player.y) < 24) {
        const away = car.axis === "x" ? { x: 0, y: this.player.y < car.body.y ? -44 : 44 } : { x: this.player.x < car.body.x ? -44 : 44, y: 0 };
        const nx = this.player.x + away.x;
        const ny = this.player.y + away.y;
        if (!blocked(nx, ny, RADIUS, this.solids)) this.player.setPosition(nx, ny);
        bump();
        break;
      }
    }
    for (const p of this.police) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 70) {
        checkpoint();
        break;
      }
    }
  }

  private pointArrow() {
    const state = getState()!;
    const beat = currentBeat(state);
    const step = this.mapId === "city" ? state.task?.steps[state.task.index] : undefined;
    const goal = step ?? beat?.spot;
    if (!goal) {
      this.arrow.setVisible(false);
      return;
    }
    const dx = goal.x - this.player.x;
    const dy = goal.y - this.player.y;
    this.arrow.setVisible(Math.hypot(dx, dy) > 140);
    const angle = Math.atan2(dy, dx);
    this.arrow.setPosition(this.player.x + Math.cos(angle) * 64, this.player.y + Math.sin(angle) * 64);
    this.arrow.setRotation(angle + Math.PI / 2);
    this.arrow.setFillStyle(step ? 0x22d3ee : 0xfbbf24);
  }

  private moveTraffic(dt: number) {
    for (const w of this.walkers) {
      const max = w.axis === "x" ? WORLD.width : WORLD.height;
      const next = (w.axis === "x" ? w.sprite.x : w.sprite.y) + w.speed * dt;
      const wrapped = next < 0 ? max : next > max ? 0 : next;
      if (w.axis === "x") w.sprite.x = wrapped;
      else w.sprite.y = wrapped;
    }
    for (const car of this.cars) {
      const max = (car.axis === "x" ? WORLD.width : WORLD.height) + 60;
      const next = (car.axis === "x" ? car.body.x : car.body.y) + car.speed * dt;
      const wrapped = next < -60 ? max : next > max ? -60 : next;
      if (car.axis === "x") car.body.x = wrapped;
      else car.body.y = wrapped;
    }
    for (const p of this.people) {
      if (Math.random() < 0.01) {
        p.vx = (Math.random() - 0.5) * 30;
        p.vy = (Math.random() - 0.5) * 30;
      }
      const nx = p.body.x + p.vx * dt;
      const ny = p.body.y + p.vy * dt;
      if (Math.hypot(nx - p.home.x, ny - p.home.y) < 40 && !blocked(nx, ny, 10, this.solids)) p.body.setPosition(nx, ny);
    }
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#1b1712",
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true },
    scene: [WorldScene],
    input: { keyboard: true, touch: true },
  });
}
