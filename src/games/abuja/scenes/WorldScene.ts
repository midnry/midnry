import * as Phaser from "phaser";
import { DISTRICTS, MAPS, PLACES, WORLD, districtAt } from "../systems/data";
import { LAKE, ROADS, blocked, freePoint, sizeOf, solidsFor } from "../systems/citymap";
import { bump, checkpoint, currentBeat, mapIdFor, peopleOn, personAt, personKey, savePosition, taskReach } from "../systems/engine";
import { check } from "../systems/rules";
import { bus, getState, input, subscribe } from "../systems/store";
import { findPath, type Point } from "../systems/path";
import type { GameState, MapRect, PersonDef } from "../systems/types";
import { fullLook, lookKey, randomLook, type Look } from "../systems/character";
import { INK, animateWalk, building, figure, makeArt, queueCharacters, rand, signpost, tileKey, type Figure, type Person } from "./art";

const SPEED = 230;
const NEAR = 105;
const RADIUS = 14;
const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const LINE = 4;
const title = (scene: Phaser.Scene, x: number, y: number, text: string, size = 14, fill = "#ffffff") =>
  scene.add
    .text(x, y, text, { fontFamily: "system-ui, sans-serif", fontSize: `${size}px`, fontStyle: "bold", color: fill, stroke: "#141414", strokeThickness: Math.max(4, size / 4) })
    .setOrigin(0.5, 0);
const seedOf = (id: string) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

// Who's who: the same person always looks the same.
const personOf = (p: PersonDef): Person => ({
  look: randomLook(seedOf(`${p.map}:${p.id}`), { topColor: p.color, glasses: false, headphones: false, ...(p.build ? { build: p.build } : {}), ...p.look }),
  adult: !p.kid,
});
const playerOf = (state: GameState | null): Person => ({ look: fullLook(state?.looks ?? {}), adult: (state?.age ?? 0) >= 18 });
const WALKERS: Person[] = Array.from({ length: 8 }, (_, i) => ({ look: randomLook(i * 131 + 7), adult: i % 4 !== 3 }));
const POLICE_LOOK: Look = randomLook(4242, {
  top: "shirt",
  topColor: "#1e3a8a",
  bottom: "jeans",
  bottomColor: "#1b1b1d",
  shoes: "sneakers",
  shoeColor: "#1b1b1d",
  hat: "cap",
  hatColor: "#1b1b1d",
  bag: false,
  glasses: false,
  headphones: false,
  build: "masc",
});
const POLICE: Person = { look: POLICE_LOOK, adult: true };

/** Ground texture for each district of the city. */
const DISTRICT_TILE: Record<string, string> = {
  kubwa: "dirt",
  gwarinpa: "grass",
  maitama: "lawn",
  asokoro: "lawn",
  jabi: "grass",
  wuse: "pavement",
  cbd: "plaza",
  garki: "pavement",
  lugbe: "dirt",
  nyanya: "dirt",
};

/** Ground texture for a chapter zone, from its name. */
function zoneTile(name: string): string {
  if (/pitch|field|sports/i.test(name)) return "grass";
  if (/parade/i.test(name)) return "sand";
  if (/market|street|corner|junction/i.test(name)) return "dirt";
  if (/hall|clinic|gate/i.test(name)) return "plaza";
  if (/home|hostel/i.test(name)) return "lawn";
  if (/school|faculty/i.test(name)) return "pavement";
  return "grass";
}

/** Which props grow on which ground. */
const PROPS_ON: Record<string, string[]> = {
  grass: ["tree", "tree", "palm", "bush", "flowers"],
  lawn: ["tree", "palm", "bush", "flowers", "flowers"],
  dirt: ["palm", "kiosk", "generator", "bush", "tree"],
  sand: ["palm", "bush", "kiosk"],
  pavement: ["bush", "flowers", "palm", "kiosk", "generator"],
  plaza: ["flowers", "bush", "palm"],
};

/** Where the player stood when the scene redraws in place (say, after a change of outfit). */
let carry: { mapId: string; x: number; y: number } | null = null;

type Near = { kind: "place" | "person" | "beat"; id: string; label: string };
type Interactable = Near & { x: number; y: number };

/**
 * The walkable world: the city of Abuja in adulthood, or a small map for each
 * story chapter. Art comes from ./art (cartoon textures drawn in code), so
 * real sprites can replace it later without touching game logic.
 */
export class WorldScene extends Phaser.Scene {
  private mapId = "city";
  private solids: MapRect[] = [];
  private player!: Figure;
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "e" | "space", Phaser.Input.Keyboard.Key>;
  /** Waypoints for tap-to-walk and "Go to". */
  private path: Point[] = [];
  private near: Near | null = null;
  private lastSave = 0;
  private lastBlocked = 0;
  private placeMarkers: { id: string; marker: Phaser.GameObjects.Container }[] = [];
  private people: (Interactable & { body: Figure; home: { x: number; y: number }; vx: number; vy: number })[] = [];
  private walkers: { sprite: Figure; axis: "x" | "y"; speed: number }[] = [];
  private cars: { body: Phaser.GameObjects.Image; axis: "x" | "y"; speed: number }[] = [];
  private police: { officer: Figure; barrier: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private glows: Phaser.GameObjects.Image[] = [];
  private boat: Phaser.GameObjects.Image | null = null;
  private beatMarker!: Phaser.GameObjects.Container;
  private taskMarker!: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Triangle;
  private night!: Phaser.GameObjects.Rectangle;
  private unsub: (() => void) | null = null;
  private lookId = "";
  private offs: (() => void)[] = [];

  constructor() {
    super("world");
  }

  preload() {
    const state = getState();
    const mapId = state ? mapIdFor(state) : "city";
    const people: Person[] = [playerOf(state)];
    if (state) people.push(...peopleOn(state, mapId).map(personOf));
    if (mapId === "city") people.push(...WALKERS, POLICE);
    queueCharacters(this, people);
    // Drawing everyone takes a moment on slower phones: say so instead of showing a blank screen.
    const note = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Getting Abuja ready…", { fontFamily: "system-ui, sans-serif", fontSize: "16px", fontStyle: "bold", color: "#ffffff" })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.load.on("progress", (p: number) => note.setText(`Getting Abuja ready… ${Math.round(p * 100)}%`));
    this.load.once("complete", () => note.destroy());
  }

  create() {
    const state = getState();
    this.mapId = state ? mapIdFor(state) : "city";
    makeArt(this);
    // A copy: trees and stalls add their own small solids for this scene only.
    this.solids = [...solidsFor(this.mapId)];
    this.placeMarkers = [];
    this.people = [];
    this.walkers = [];
    this.cars = [];
    this.police = [];
    this.glows = [];
    this.boat = null;
    const { width, height } = sizeOf(this.mapId);
    this.cameras.main.setBackgroundColor(this.mapId === "city" ? "#0b1726" : "#0d1b2e");

    this.drawPeople();
    if (this.mapId === "city") this.drawCity();
    else this.drawChapterMap();

    const start = this.startPoint();
    this.player = this.makePlayer(start.x, start.y);
    this.beatMarker = this.makeMarker(0x22c55e, "!");
    this.taskMarker = this.makeMarker(0x38bdf8, "★");
    this.arrow = this.add.triangle(0, 0, 0, -12, 9, 8, -9, 8, 0x22c55e).setDepth(20).setVisible(false);
    this.night = this.add.rectangle(0, 0, 4000, 4000, 0x0b1330, 0).setOrigin(0).setScrollFactor(0).setDepth(30);

    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.fitZoom();
    this.scale.on("resize", this.fitZoom, this);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D", e: "E", space: "SPACE" }) as typeof this.keys;
    kb.disableGlobalCapture();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.walkTo({ x: pointer.worldX, y: pointer.worldY }));

    this.offs.push(
      bus.on("teleport", ({ x, y }) => {
        if (this.mapId !== "city") return;
        this.player.setPosition(x, y);
        this.path = [];
      }),
      bus.on("goto", () => {
        const state = getState();
        if (!state) return;
        const step = this.mapId === "city" ? state.task?.steps[state.task.index] : undefined;
        const goal = step ?? currentBeat(state)?.spot;
        if (goal) this.walkTo(goal);
      }),
    );
    // Restart when the story moves to another map; refresh markers on other changes.
    this.lookId = this.lookIdOf(state);
    this.unsub = subscribe(() => {
      const next = getState();
      if (!next) return;
      if (mapIdFor(next) !== this.mapId) {
        this.scene.restart();
        return;
      }
      // New outfit from the wardrobe: redraw the world with the new look, right here.
      // Turning 18 swaps in the grown-up body the same way.
      const lookId = this.lookIdOf(next);
      if (lookId !== this.lookId) {
        this.lookId = lookId;
        carry = { mapId: this.mapId, x: this.player.x, y: this.player.y };
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

  private lookIdOf(state: GameState | null) {
    const me = playerOf(state);
    return `${lookKey(me.look)}${me.adult ? "a" : "k"}`;
  }

  private startPoint() {
    const state = getState();
    const kept = carry;
    carry = null;
    if (kept?.mapId === this.mapId) return { x: kept.x, y: kept.y };
    if (this.mapId !== "city") return MAPS[this.mapId]!.spawn;
    // Older saves may stand where the lake or a building now is.
    if (state?.pos.x) return freePoint(state.pos.x, state.pos.y, this.solids);
    return { x: PLACES[0]!.x, y: PLACES[0]!.y + 95 };
  }

  /** Can the player stand here? Walls, the map edge and locked districts say no. */
  private standable(x: number, y: number, pad = 0): boolean {
    const { width, height } = sizeOf(this.mapId);
    if (x < RADIUS || y < RADIUS || x > width - RADIUS || y > height - RADIUS) return false;
    if (blocked(x, y, RADIUS + pad, this.solids)) return false;
    if (this.mapId === "city") {
      const d = districtAt(x, y);
      const state = getState();
      if (d?.gate && state && !check(state, d.gate.if)) return false;
    }
    return true;
  }

  /** Find a way around buildings and fences to a point, then walk it. */
  private walkTo(goal: Point) {
    const { width, height } = sizeOf(this.mapId);
    const route = findPath({ x: this.player.x, y: this.player.y }, goal, width, height, (x, y) => this.standable(x, y, 3));
    // No way through (say, a locked district): walk straight and let the wall explain.
    this.path = route ?? [goal];
  }

  private fitZoom() {
    const { width, height } = this.scale;
    const small = Math.min(width, height);
    this.cameras.main.setZoom(small < 520 ? 0.78 : small < 800 ? 0.92 : 1);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  private drawCity() {
    // Paving under everything, so corners between districts aren't bare.
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, tileKey("pavement")).setOrigin(0);
    for (const d of DISTRICTS) {
      this.add.tileSprite(d.x, d.y, d.w, d.h, tileKey(DISTRICT_TILE[d.id] ?? "grass")).setOrigin(0);
      const g = this.add.graphics();
      if (d.gate) g.fillStyle(color(d.color), 0.14).fillRect(d.x, d.y, d.w, d.h);
      g.lineStyle(4, color(d.color), 0.55).strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
    }
    this.drawLake();
    this.drawRoads();
    this.drawSolids();
    this.drawPlaces();
    this.drawProps(260);
    this.drawLamps();
    this.spawnTraffic();
    // District names sit above the scenery.
    for (const d of DISTRICTS) title(this, d.x + 18, d.y + 12, `${d.name}${d.gate ? " 🔒" : ""}`, 22).setOrigin(0, 0).setDepth(3);
  }

  private drawLake() {
    const g = this.add.graphics();
    g.fillStyle(0xe2c48a, 1).fillEllipse(LAKE.x, LAKE.y, LAKE.rx * 2 + 44, LAKE.ry * 2 + 40);
    g.lineStyle(3, INK, 0.5).strokeEllipse(LAKE.x, LAKE.y, LAKE.rx * 2 + 44, LAKE.ry * 2 + 40);
    g.fillStyle(0x3a8fd1, 1).fillEllipse(LAKE.x, LAKE.y, LAKE.rx * 2, LAKE.ry * 2);
    g.fillStyle(0x5aa7e0, 1).fillEllipse(LAKE.x - 20, LAKE.y - 14, LAKE.rx * 1.4, LAKE.ry * 1.2);
    g.lineStyle(LINE, INK, 1).strokeEllipse(LAKE.x, LAKE.y, LAKE.rx * 2, LAKE.ry * 2);
    g.lineStyle(2, 0xd6ecfa, 0.8);
    const r = rand(77);
    for (let i = 0; i < 9; i += 1) {
      const x = LAKE.x - LAKE.rx * 0.6 + r() * LAKE.rx * 1.1;
      const y = LAKE.y - LAKE.ry * 0.5 + r() * LAKE.ry;
      g.beginPath().moveTo(x, y).lineTo(x + 8, y - 3).lineTo(x + 16, y).strokePath();
    }
    this.boat = this.add.image(LAKE.x, LAKE.y, "boat").setDepth(2);
    title(this, LAKE.x, LAKE.y + LAKE.ry + 26, "Jabi Lake", 15).setDepth(3);
  }

  private drawRoads() {
    const { width, height } = WORLD;
    const g = this.add.graphics();
    // Sidewalks with a dark kerb line.
    g.fillStyle(0xd6d0c4, 1);
    ROADS.xs.forEach((x) => g.fillRect(x - 36, 0, 72, height));
    ROADS.ys.forEach((y) => g.fillRect(0, y - 36, width, 72));
    ROADS.xs.forEach((x) => this.add.tileSprite(x - 24, 0, 48, height, tileKey("asphalt")).setOrigin(0));
    ROADS.ys.forEach((y) => this.add.tileSprite(0, y - 24, width, 48, tileKey("asphalt")).setOrigin(0));
    const m = this.add.graphics();
    m.lineStyle(3, INK, 0.7);
    ROADS.xs.forEach((x) => {
      m.beginPath().moveTo(x - 24, 0).lineTo(x - 24, height).strokePath();
      m.beginPath().moveTo(x + 24, 0).lineTo(x + 24, height).strokePath();
    });
    ROADS.ys.forEach((y) => {
      m.beginPath().moveTo(0, y - 24).lineTo(width, y - 24).strokePath();
      m.beginPath().moveTo(0, y + 24).lineTo(width, y + 24).strokePath();
    });
    // Re-pave the junctions so kerb lines don't cross them.
    for (const x of ROADS.xs) for (const y of ROADS.ys) this.add.tileSprite(x - 23, y - 23, 46, 46, tileKey("asphalt")).setOrigin(0);
    const near = (v: number, list: number[]) => list.some((c) => Math.abs(v - c) < 50);
    const lines = this.add.graphics();
    lines.fillStyle(0xf5f5f4, 0.85);
    ROADS.xs.forEach((x) => {
      for (let y = 0; y < height; y += 44) if (!near(y + 11, ROADS.ys)) lines.fillRect(x - 1.5, y, 3, 22);
    });
    ROADS.ys.forEach((y) => {
      for (let x = 0; x < width; x += 44) if (!near(x + 11, ROADS.xs)) lines.fillRect(x, y - 1.5, 22, 3);
    });
    // Zebra crossings on every side of each junction.
    lines.fillStyle(0xffffff, 0.9);
    for (const x of ROADS.xs) {
      for (const y of ROADS.ys) {
        for (let i = -20; i <= 16; i += 8) {
          lines.fillRect(x + i, y - 44, 5, 14).fillRect(x + i, y + 30, 5, 14);
          lines.fillRect(x - 44, y + i, 14, 5).fillRect(x + 30, y + i, 14, 5);
        }
      }
    }
  }

  private drawSolids() {
    this.solids.forEach((s, i) => {
      if (s.kind !== "water") building(this, s, i * 31 + Math.round(s.x));
    });
  }

  private drawChapterMap() {
    const map = MAPS[this.mapId]!;
    for (const z of map.zones) {
      this.add.tileSprite(z.x, z.y, z.w, z.h, tileKey(zoneTile(z.name))).setOrigin(0);
      this.add.graphics().lineStyle(4, color(z.color), 0.6).strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
    }
    // Footpaths crossing the map.
    this.add.tileSprite(0, map.height / 2 - 22, map.width, 44, tileKey("sand")).setOrigin(0);
    this.add.tileSprite(map.width / 2 - 22, 0, 44, map.height, tileKey("sand")).setOrigin(0);
    const g = this.add.graphics().lineStyle(3, INK, 0.45);
    g.strokeRect(-4, map.height / 2 - 22, map.width + 8, 44).strokeRect(map.width / 2 - 22, -4, 44, map.height + 8);
    this.drawSolids();
    this.drawProps(70);
    for (const z of map.zones) title(this, z.x + 18, z.y + 12, z.name, 20).setOrigin(0, 0).setDepth(3);
    for (const spot of Object.values(map.spots)) title(this, spot.x, spot.y + 30, spot.label, 13).setAlpha(0.85).setDepth(3);
  }

  /** Trees, bushes, stalls and generators, scattered the same way every visit. */
  private drawProps(count: number) {
    const { width, height } = sizeOf(this.mapId);
    const r = rand(this.mapId.length * 1013 + count);
    const city = this.mapId === "city";
    const map = MAPS[this.mapId];
    const keep: { x: number; y: number }[] = city
      ? [...PLACES.map((p) => ({ x: p.x, y: p.y + 20 })), ...this.people.map((p) => p.home)]
      : [...Object.values(map!.spots), map!.spawn, ...this.people.map((p) => p.home)];
    let placed = 0;
    for (let i = 0; i < count * 4 && placed < count; i += 1) {
      const x = 40 + r() * (width - 80);
      const y = 50 + r() * (height - 90);
      const pick = r();
      if (blocked(x, y, 40, this.solids)) continue;
      if (city) {
        if (ROADS.xs.some((rx) => Math.abs(x - rx) < 70) || ROADS.ys.some((ry) => Math.abs(y - ry) < 70)) continue;
        if (Math.hypot((x - LAKE.x) / (LAKE.rx + 50), (y - LAKE.y) / (LAKE.ry + 50)) < 1) continue;
      } else if (Math.abs(x - width / 2) < 60 || Math.abs(y - height / 2) < 60) continue;
      if (keep.some((k) => Math.hypot(k.x - x, k.y - y) < 120)) continue;
      const ground = city ? DISTRICT_TILE[districtAt(x, y)?.id ?? ""] ?? "grass" : zoneTile(map!.zones.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)?.name ?? "");
      const options = PROPS_ON[ground] ?? PROPS_ON.grass!;
      const key = options[Math.floor(pick * options.length)]!;
      const img = this.add.image(x, y, key).setOrigin(0.5, 0.9).setDepth(5 + y / 10000);
      if (key === "tree" || key === "palm") img.setScale(0.8 + r() * 0.35);
      // Big things are solid at their base, so you walk around them.
      if (key === "tree" || key === "palm" || key === "kiosk") this.solids.push({ x: x - 9, y: y - 10, w: 18, h: 12 });
      placed += 1;
    }
  }

  private drawLamps() {
    const lamp = (x: number, y: number) => {
      if (blocked(x, y, 12, this.solids)) return;
      this.add.image(x, y, "lamp").setOrigin(0.5, 0.95).setDepth(5 + y / 10000);
      this.glows.push(this.add.image(x, y - 58, "glow").setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
    };
    const clear = (v: number, list: number[]) => list.every((c) => Math.abs(v - c) > 70);
    for (const x of ROADS.xs) for (let y = 80; y < WORLD.height; y += 340) if (clear(y, ROADS.ys)) lamp(x + 32, y);
    for (const y of ROADS.ys) for (let x = 120; x < WORLD.width; x += 380) if (clear(x, ROADS.xs)) lamp(x, y - 30);
  }

  private drawPlaces() {
    for (const p of PLACES) {
      const marker = signpost(this, p.x, p.y, p.name, p.icon ?? "📍", color(p.color));
      this.placeMarkers.push({ id: p.id, marker });
    }
  }

  private drawPeople() {
    const state = getState();
    if (!state) return;
    for (const p of peopleOn(state, this.mapId)) {
      const at = personAt(p);
      const body = figure(this, at.x, at.y, personOf(p), { name: p.name });
      body.setDepth(5 + at.y / 10000);
      const bubble = this.add.text(14, body.headTop - 4, "💬", { fontSize: "16px" });
      body.add(bubble);
      this.tweens.add({ targets: bubble, y: body.headTop - 10, duration: 800, yoyo: true, repeat: -1 });
      this.people.push({ kind: "person", id: personKey(p), label: p.name, x: at.x, y: at.y, body, home: at, vx: 0, vy: 0 });
    }
  }

  private spawnTraffic() {
    for (let i = 0; i < 26; i += 1) {
      const axis = i % 2 ? "x" : "y";
      const side = i % 4 < 2 ? 1 : -1;
      const line = (axis === "x" ? ROADS.ys[i % ROADS.ys.length]! : ROADS.xs[i % ROADS.xs.length]!) + side * 31;
      const pos = Math.random() * (axis === "x" ? WORLD.width : WORLD.height);
      const sprite = figure(this, axis === "x" ? pos : line, axis === "x" ? line : pos, WALKERS[i % WALKERS.length]!, { unit: 0.3 });
      this.walkers.push({ sprite, axis, speed: (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 25) });
    }
    const paints = [0xe11d48, 0x2563eb, 0xf8fafc, 0x16a34a, 0x0f172a, 0x9ca3af];
    const kinds = ["car", "danfo", "car", "keke", "okada", "car"];
    for (let i = 0; i < 18; i += 1) {
      const axis = i % 2 ? "x" : "y";
      const key = kinds[i % kinds.length]!;
      const lane = (i % 4 < 2 ? -1 : 1) * 11;
      const roadLine = axis === "x" ? ROADS.ys[i % ROADS.ys.length]! : ROADS.xs[i % ROADS.xs.length]!;
      const pos = Math.random() * (axis === "x" ? WORLD.width : WORLD.height);
      const speed = (lane < 0 ? -1 : 1) * (110 + Math.random() * 90);
      const body = this.add
        .image(axis === "x" ? pos : roadLine + lane, axis === "x" ? roadLine + lane : pos, key)
        .setScale(key === "okada" ? 0.75 : 0.68)
        .setRotation(axis === "x" ? (speed > 0 ? 0 : Math.PI) : speed > 0 ? Math.PI / 2 : -Math.PI / 2)
        .setDepth(6);
      if (key === "car") body.setTint(paints[i % paints.length]!);
      this.cars.push({ body, axis, speed });
    }
  }

  private makePlayer(x: number, y: number) {
    const me = figure(this, x, y, playerOf(getState()), { name: "YOU", nameColor: "#4ade80", unit: 0.52 });
    const halo = this.add.ellipse(0, 20, 50, 17, 0x4ade80, 0.25).setStrokeStyle(3, 0xffffff, 0.95);
    me.addAt(halo, 0);
    this.tweens.add({ targets: halo, scaleX: 1.15, scaleY: 1.15, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    return me;
  }


  private makeMarker(tint: number, glyph: string) {
    const ring = this.add.circle(0, 0, 34, tint, 0.2).setStrokeStyle(3, tint, 1);
    const sign = this.add
      .text(0, -62, glyph, { fontFamily: "system-ui", fontSize: "28px", fontStyle: "bold", color: "#ffffff", stroke: "#07152b", strokeThickness: 3, backgroundColor: Phaser.Display.Color.IntegerToColor(tint).rgba, padding: { x: 8, y: 2 } })
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
        const barrier = this.add.image(x, y, "barrier").setDepth(7);
        const officer = figure(this, x + 34, y - 34, POLICE, { name: "POLICE", nameColor: "#93c5fd" });
        officer.setDepth(5 + (y - 34) / 10000);
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
    const glow = this.mapId !== "city" ? 0 : [0, 0, 0.25, 0.5][Math.min(state.slot, 3)]!;
    this.glows.forEach((g) => g.setAlpha(glow));
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const state = getState();
    if (!state || input.paused) return;
    this.moveTraffic(dt, time);
    const paused = state.event || state.ending || state.task?.haggle || (state.chapter && (state.result || !currentBeat(state)));
    if (paused) {
      animateWalk(this.player, time, false, 0);
      return;
    }

    let vx = input.x;
    let vy = input.y;
    const k = this.keys;
    if (k.left.isDown || k.a.isDown) vx -= 1;
    if (k.right.isDown || k.d.isDown) vx += 1;
    if (k.up.isDown || k.w.isDown) vy -= 1;
    if (k.down.isDown || k.s.isDown) vy += 1;
    if (vx || vy) this.path = [];
    else {
      while (this.path.length && Math.hypot(this.path[0]!.x - this.player.x, this.path[0]!.y - this.player.y) < 8) this.path.shift();
      const next = this.path[0];
      if (next) {
        const dx = next.x - this.player.x;
        const dy = next.y - this.player.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(1, dist / (SPEED * dt));
        vx = (dx / dist) * step;
        vy = (dy / dist) * step;
      }
    }
    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    const fromX = this.player.x;
    const fromY = this.player.y;
    if (vx || vy) this.move(vx * SPEED * dt, vy * SPEED * dt, time);
    const moved = this.player.x !== fromX || this.player.y !== fromY;
    animateWalk(this.player, time, moved, this.player.x - fromX, this.player.y - fromY);
    this.player.setDepth(5 + this.player.y / 10000 + 0.5);

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
    else this.path = [];
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
    this.arrow.setFillStyle(step ? 0x38bdf8 : 0x22c55e);
  }

  private moveTraffic(dt: number, time: number) {
    if (this.boat) {
      const t = time / 9000;
      this.boat.setPosition(LAKE.x + Math.cos(t) * LAKE.rx * 0.55, LAKE.y + Math.sin(t) * LAKE.ry * 0.5);
      this.boat.setFlipX(Math.sin(t) > 0);
    }
    for (const w of this.walkers) {
      const max = w.axis === "x" ? WORLD.width : WORLD.height;
      const next = (w.axis === "x" ? w.sprite.x : w.sprite.y) + w.speed * dt;
      const wrapped = next < 0 ? max : next > max ? 0 : next;
      if (w.axis === "x") w.sprite.x = wrapped;
      else w.sprite.y = wrapped;
      w.sprite.setDepth(5 + w.sprite.y / 10000);
      animateWalk(w.sprite, time, true, w.axis === "x" ? w.speed : 0, w.axis === "y" ? w.speed : 0);
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
      const ok = Math.hypot(nx - p.home.x, ny - p.home.y) < 40 && !blocked(nx, ny, 10, this.solids);
      if (ok) p.body.setPosition(nx, ny);
      p.body.setDepth(5 + p.body.y / 10000);
      animateWalk(p.body, time + p.home.x, ok, p.vx, p.vy);
    }
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0b1726",
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true },
    scene: [WorldScene],
    input: { keyboard: true, touch: true },
  });
}
