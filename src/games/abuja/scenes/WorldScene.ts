import * as Phaser from "phaser";
import { DISTRICTS, MAPS, PLACES, WORLD, districtAt } from "../systems/data";
import { LAKE, ROADS, blocked, freePoint, roadRoute, sizeOf, solidsFor } from "../systems/citymap";
import { FLEET, HIT_AS, KEKE_COLORS, OKADA_COLORS, TAXI_COLOR, type VehicleStyle } from "../systems/vehicles";
import type { RideMode } from "../systems/rides";
import { personLook } from "../systems/peoplelook";
import { roomForBuilding } from "../systems/rooms";
import { RoomScene } from "./RoomScene";
import { isDirty } from "../systems/life";
import { injured, type HitBy } from "../systems/health";
import { CAR_COLOR, frscSpots, isDriving } from "../systems/drive";
import { bump, checkpoint, frsc, fuel, currentBeat, mapIdFor, peopleOn, personAt, personKey, savePosition, taskReach } from "../systems/engine";
import { check } from "../systems/rules";
import { bus, getState, input, subscribe } from "../systems/store";
import { findPath, type Point } from "../systems/path";
import type { GameState, MapRect } from "../systems/types";
import { lotDoor } from "../systems/city/layout";
import { drawBridge, drawMedians, drawRail, drawStreetFurniture, makeDecorTextures, zoneOverlay } from "./cityDecor";
import { lotsFor } from "../systems/city/sim";
import { building as buildingInfo } from "../systems/city/catalog";
import { fullLook, lookKey, randomLook, stageOf, type Look } from "../systems/character";
import { INK, animateWalk, pose, building, placeBuilding, queueBuildings, faceVehicle, figure, makeArt, queueCharacters, queueVehicles, rand, signpost, tileKey, vehicle, type Figure, type Person, type Vehicle } from "./art";

const SPEED = 230;
const ZOOM_KEY = "abuja-hustle.zoom";
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 3;
const NEAR = 105;
const RADIUS = 14;
const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const LINE = 4;
const title = (scene: Phaser.Scene, x: number, y: number, text: string, size = 14, fill = "#ffffff") =>
  scene.add
    .text(x, y, text, { fontFamily: "system-ui, sans-serif", fontSize: `${size}px`, fontStyle: "bold", color: fill, stroke: "#141414", strokeThickness: Math.max(4, size / 4) })
    .setResolution(2)
    .setOrigin(0.5, 0);

// Who's who: the same person always looks the same.
const personOf = personLook;
const playerOf = (state: GameState | null): Person => ({ look: fullLook(state?.looks ?? {}), adult: (state?.age ?? 0) >= 18, stage: stageOf(state?.age ?? 0) });
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
  grass: ["tree", "tree2", "tree3", "palm", "bush", "flowers"],
  lawn: ["tree", "tree3", "palm", "bush", "flowers", "flowers"],
  dirt: ["palm", "kiosk", "generator", "bush", "tree3"],
  sand: ["palm", "bush", "kiosk"],
  pavement: ["bush", "flowers", "palm", "kiosk", "generator"],
  plaza: ["flowers", "bush", "palm"],
};

/** Each district has its own look between the buildings. */
const DISTRICT_PROPS: Record<string, string[]> = {
  maitama: ["palm", "tree", "flowers", "flowers", "bush", "fence"],
  asokoro: ["palm", "tree", "flowers", "rock", "boulders", "bush"],
  cbd: ["palm", "flowers", "bush", "bench", "bin"],
  wuse: ["kiosk", "bush", "palm", "bin", "generator", "kiosk"],
  garki: ["tree3", "kiosk", "palm", "bush", "bin"],
  jabi: ["palm", "tree", "flowers", "bush", "pond", "grass"],
  gwarinpa: ["tree", "bush", "flowers", "palm", "grass", "fence"],
  kubwa: ["rock", "boulders", "tree", "tree2", "grass", "grass"],
  nyanya: ["kiosk", "generator", "tree3", "rock", "bin", "grass"],
  lugbe: ["barrel", "rock", "tree3", "generator", "barrel", "grass"],
};

/** Where the player stood when the scene redraws in place (say, after a change of outfit). */
let carry: { mapId: string; x: number; y: number } | null = null;

type Near = { kind: "place" | "person" | "beat" | "door" | "lot"; id: string; label: string };
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
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "e" | "space" | "shift" | "j", Phaser.Input.Keyboard.Key>;
  /** Money and the last message, to spot good news worth celebrating. */
  private lastMoney: number | null = null;
  private lastToast: string | null = null;
  private waved = new Map<string, number>();
  /** Waypoints for tap-to-walk and "Go to". */
  private path: Point[] = [];
  private near: Near | null = null;
  private lastSave = 0;
  private lastBlocked = 0;
  private placeMarkers: { id: string; marker: Phaser.GameObjects.Container }[] = [];
  private people: (Interactable & { body: Figure; home: { x: number; y: number }; vx: number; vy: number })[] = [];
  private walkers: { sprite: Figure; axis: "x" | "y"; speed: number }[] = [];
  private cars: { body: Vehicle; axis: "x" | "y"; speed: number; kind: HitBy }[] = [];
  /** The ride you're on: your vehicle, the road route and how far along it you are. */
  private riding: { car: Vehicle; tag: Phaser.GameObjects.Text; route: { x: number; y: number }[]; leg: number; speed: number; drop: { x: number; y: number } } | null = null;
  private police: { officer: Figure; barrier: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private glows: Phaser.GameObjects.Image[] = [];
  /** Windows that light up after dark (above the night shade). */
  private windowLights: Phaser.GameObjects.Graphics | null = null;
  /** Tall buildings fade when you walk behind them. */
  private towers: { g: Phaser.GameObjects.Components.Alpha; face: { x: number; y: number; w: number; h: number }; base: number }[] = [];
  /** Lit windows of the city's buildings, faded in at night. */
  private nightWindows: Phaser.GameObjects.Image[] = [];
  private signals: { img: Phaser.GameObjects.Image; x: number; y: number; axis: "x" | "y" }[] = [];
  private boat: Phaser.GameObjects.Image | null = null;
  private beatMarker!: Phaser.GameObjects.Container;
  private taskMarker!: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Triangle;
  private night!: Phaser.GameObjects.Rectangle;
  private unsub: (() => void) | null = null;
  private lookId = "";
  private rail: { update: (time: number) => void } | null = null;
  private seats: { x: number; y: number }[] = [];
  private zones: Phaser.GameObjects.Graphics | null = null;
  private stillSince = 0;
  private cityId = "";
  /** The story moved to another map while you were inside a building: rebuild when you come out. */
  private pendingRestart = false;
  /** Looking around the map: the camera is free and the player stays put. */
  private exploring = false;
  private pinch: { dist: number; zoom: number } | null = null;
  private offs: (() => void)[] = [];
  /** Stains and flies on the player when their clothes haven't been washed. */
  private grime: Phaser.GameObjects.Container | null = null;
  /** Your own car on the map while you drive, its YOU tag, and distance not yet paid for in fuel. */
  private myCar: Vehicle | null = null;
  private myCarTag: Phaser.GameObjects.Text | null = null;
  private driven = 0;
  /** FRSC road safety checkpoints, and the day they were set up for. */
  private frscPosts: { officer: Figure; barrier: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private frscDay = -1;

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
    if (mapId === "city") {
      queueVehicles(this);
      queueBuildings(this, lotsFor(state));
    }
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
    makeDecorTextures(this);
    this.rail = null;
    this.seats = [];
    this.zones = null;
    // A copy: trees and stalls add their own small solids for this scene only.
    this.solids = [...solidsFor(this.mapId)];
    this.placeMarkers = [];
    this.people = [];
    this.walkers = [];
    this.cars = [];
    this.police = [];
    this.frscPosts = [];
    this.frscDay = -1;
    this.myCar = null;
    this.myCarTag = null;
    this.driven = 0;
    this.riding = null;
    this.towers = [];
    this.nightWindows = [];
    this.signals = [];
    this.windowLights = this.add.graphics().setDepth(31).setAlpha(0);
    this.exploring = false;
    this.pinch = null;
    this.glows = [];
    this.boat = null;
    const { width, height } = sizeOf(this.mapId);
    this.cameras.main.setBackgroundColor(this.mapId === "city" ? "#07090f" : "#0a0d16");

    this.drawPeople();
    if (this.mapId === "city") this.drawCity();
    else this.drawChapterMap();

    const start = this.startPoint();
    this.player = this.makePlayer(start.x, start.y);
    this.beatMarker = this.makeMarker(0x3b82f6, "!");
    this.taskMarker = this.makeMarker(0x38bdf8, "★");
    this.arrow = this.add.triangle(0, 0, 0, -12, 9, 8, -9, 8, 0x3b82f6).setDepth(20).setVisible(false);
    this.night = this.add.rectangle(0, 0, 4000, 4000, 0x0b1330, 0).setOrigin(0).setScrollFactor(0).setDepth(30);

    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.fitZoom();
    this.scale.on("resize", this.fitZoom, this);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D", e: "E", space: "SPACE", shift: "SHIFT", j: "J" }) as typeof this.keys;
    kb.disableGlobalCapture();
    // Tap to walk; while exploring, drag to look around. Two fingers (or the mouse wheel) zoom.
    this.input.addPointer(1);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.exploring || input.controls !== "tap" || (this.input.pointer1.isDown && this.input.pointer2.isDown)) return;
      this.walkTo({ x: pointer.worldX, y: pointer.worldY });
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const [a, b] = [this.input.pointer1, this.input.pointer2];
      if (a.isDown && b.isDown) {
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (!this.pinch) this.pinch = { dist, zoom: this.cameras.main.zoom };
        else this.setZoom((this.pinch.zoom * dist) / Math.max(1, this.pinch.dist));
        this.path = [];
        return;
      }
      if (this.exploring && pointer.isDown) {
        const cam = this.cameras.main;
        cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
        cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
      }
    });
    this.input.on("pointerup", () => {
      if (!this.input.pointer1.isDown || !this.input.pointer2.isDown) this.pinch = null;
    });
    this.input.on("wheel", (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.setZoom(this.cameras.main.zoom * (dy > 0 ? 0.9 : 1.1)));

    this.offs.push(
      bus.on("teleport", ({ x, y }) => {
        if (this.mapId !== "city") return;
        this.player.setPosition(x, y);
        this.path = [];
      }),
      bus.on("ride", ({ mode, to }) => this.startRide(mode, to)),
      bus.on("camera", (action) => {
        if (action === "in") this.setZoom(this.cameras.main.zoom * 1.25);
        if (action === "out") this.setZoom(this.cameras.main.zoom / 1.25);
        if (action === "explore") this.setExploring(true);
        if (action === "follow") this.setExploring(false);
      }),
      bus.on("goto", () => {
        this.setExploring(false);
        const state = getState();
        if (!state) return;
        const step = this.mapId === "city" ? state.task?.steps[state.task.index] : undefined;
        const goal = step ?? currentBeat(state)?.spot;
        if (goal) this.walkTo(goal);
      }),
    );
    // Restart when the story moves to another map; refresh markers on other changes.
    this.lookId = this.lookIdOf(state);
    this.cityId = this.cityIdOf(state);
    this.unsub = subscribe(() => {
      const next = getState();
      if (!next) return;
      if (mapIdFor(next) !== this.mapId) {
        if (this.scene.isSleeping()) this.pendingRestart = true;
        else this.scene.restart();
        return;
      }
      // A building was rebuilt, or you bought one: redraw the city here.
      const cityId = this.cityIdOf(next);
      if (this.mapId === "city" && cityId !== this.cityId) {
        this.cityId = cityId;
        carry = { mapId: this.mapId, x: this.player.x, y: this.player.y };
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
    // Back outside after visiting a room.
    this.events.on("wake", () => {
      if (this.pendingRestart) {
        this.pendingRestart = false;
        this.scene.restart();
        return;
      }
      this.near = null;
      bus.emit("near", null);
      this.refresh();
    });
    this.events.once("shutdown", () => {
      this.events.off("wake");
      this.unsub?.();
      this.unsub = null;
      this.offs.forEach((off) => off());
      this.offs = [];
      this.scale.off("resize", this.fitZoom, this);
    });
    this.refresh();
    this.pendingRestart = false;
    this.near = null;
    bus.emit("near", null);
    // Development only: lets automated browser tests move the player.
    if (import.meta.env.DEV) (window as unknown as { __abuja?: unknown }).__abuja = { place: (x: number, y: number) => this.player.setPosition(x, y), hit: (by: HitBy) => bump(by) };
  }

  private cityIdOf(state: GameState | null) {
    return Object.entries(state?.city?.lots ?? {})
      .map(([id, o]) => `${id}:${o.def ?? ""}:${o.owned ? 1 : 0}`)
      .join("|");
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

  /** Close enough that everyone is easy to see; your own zoom (buttons, pinch, wheel) is remembered. */
  private fitZoom() {
    const { width, height } = this.scale;
    const small = Math.min(width, height);
    const fallback = small < 520 ? 1.45 : small < 800 ? 1.4 : 1.5;
    let saved = 0;
    try {
      saved = Number(localStorage.getItem(ZOOM_KEY)) || 0;
    } catch {
      /* storage blocked: use the default */
    }
    this.cameras.main.setZoom(Phaser.Math.Clamp(saved || fallback, MIN_ZOOM, MAX_ZOOM));
  }

  private setZoom(zoom: number) {
    const z = Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.cameras.main.setZoom(z);
    try {
      localStorage.setItem(ZOOM_KEY, z.toFixed(2));
    } catch {
      /* fine: it just won't be remembered */
    }
  }

  private setExploring(on: boolean) {
    if (this.exploring === on) return;
    this.zones?.setVisible(on);
    this.exploring = on;
    this.path = [];
    if (on) this.cameras.main.stopFollow();
    else if (!this.riding) this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    bus.emit("exploring", on);
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
    drawBridge(this);
    this.drawRoads();
    drawMedians(this);
    this.rail = drawRail(this);
    this.drawSolids();
    this.drawPlaces();
    const lots = lotsFor(getState());
    this.seats = drawStreetFurniture(this, this.solids, lots).seats;
    this.zones = zoneOverlay(this, lots);
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
    if (this.mapId === "city") {
      // The city's buildings, from the zoned layout (systems/city).
      const state = getState();
      for (const l of lotsFor(state)) {
        const b = placeBuilding(this, l);
        if (state?.city?.lots[l.id]?.owned) this.add.text(l.x + l.w - 6, l.y + l.h - 4, "🔑", { fontSize: "14px" }).setOrigin(1, 1).setDepth(5 + (l.y + l.h) / 10000 + 0.0001);
        if (b.lit) this.nightWindows.push(b.lit);
        // Walk behind a building and it fades so you can still see yourself.
        if (l.solid) this.towers.push({ g: { setAlpha: (a: number) => (b.img.setAlpha(a), b.lit?.setAlpha(Math.min(a, b.lit.alpha)), b.img) } as unknown as Phaser.GameObjects.Components.Alpha, face: { x: l.x, y: b.top, w: l.w, h: l.y + l.h - b.top }, base: l.y + l.h });
      }
      return;
    }
    this.solids.forEach((s, i) => {
      if (s.kind === "water") return;
      building(this, s, i * 31 + Math.round(s.x), { style: "house" });
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
      const options = (city ? DISTRICT_PROPS[districtAt(x, y)?.id ?? ""] : undefined) ?? PROPS_ON[ground] ?? PROPS_ON.grass!;
      const key = options[Math.floor(pick * options.length)]!;
      const img = this.add.image(x, y, key).setOrigin(0.5, 0.9).setDepth(5 + y / 10000);
      const isTree = key.startsWith("tree") || key === "palm" || key === "boulders";
      if (isTree) img.setScale(key.startsWith("tree") ? 0.85 + r() * 0.3 : 0.8 + r() * 0.35);
      // Big things are solid at their base, so you walk around them.
      if (isTree || key === "kiosk" || key === "pond") this.solids.push({ x: x - 9, y: y - 10, w: 18, h: 12 });
      placed += 1;
    }
  }

  private drawLamps() {
    const lamp = (x: number, y: number) => {
      if (blocked(x, y, 12, this.solids)) return;
      this.add.image(x, y, "lamp").setOrigin(0.5, 0.95).setDepth(5 + y / 10000);
      this.glows.push(this.add.image(x, y - 58, "glow").setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc46b).setAlpha(0));
    };
    const clear = (v: number, list: number[]) => list.every((c) => Math.abs(v - c) > 70);
    for (const x of ROADS.xs) for (let y = 80; y < WORLD.height; y += 340) if (clear(y, ROADS.ys)) lamp(x + 32, y);
    for (const y of ROADS.ys) for (let x = 120; x < WORLD.width; x += 380) if (clear(x, ROADS.xs)) lamp(x, y - 30);
    // A traffic light on the corner of every junction.
    for (const x of ROADS.xs) {
      for (const y of ROADS.ys) {
        for (const [px, py, axis] of [[x + 33, y - 32, "x"]] as const) {
          if (blocked(px, py, 8, this.solids)) continue;
          this.add.image(px, py, "trafficlight").setOrigin(0.5, 0.95).setDepth(5 + py / 10000);
          const img = this.add.image(px, py - 64, "signal").setDepth(5 + py / 10000 + 0.00001);
          this.signals.push({ img, x: px, y: py, axis });
        }
      }
    }
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
      const sprite = figure(this, axis === "x" ? pos : line, axis === "x" ? line : pos, WALKERS[i % WALKERS.length]!, { unit: 0.17 });
      this.walkers.push({ sprite, axis, speed: (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 25) });
    }
    for (let i = 0; i < 26; i += 1) {
      const axis = i % 2 ? "x" : "y";
      const style = FLEET[(i * 7) % FLEET.length]!;
      const lane = (i % 4 < 2 ? -1 : 1) * 11;
      const roadLine = axis === "x" ? ROADS.ys[i % ROADS.ys.length]! : ROADS.xs[i % ROADS.xs.length]!;
      const pos = Math.random() * (axis === "x" ? WORLD.width : WORLD.height);
      const heavy = style.kind === "bus" || style.kind === "truck" || style.kind === "mixer" || style.kind === "firetruck";
      const speed = (lane < 0 ? -1 : 1) * (heavy ? 75 + Math.random() * 15 : style.kind === "ambulance" || style.kind === "police" ? 170 + Math.random() * 40 : 110 + Math.random() * 90);
      const body = vehicle(this, axis === "x" ? pos : roadLine + lane, axis === "x" ? roadLine + lane : pos, style);
      faceVehicle(body, axis === "x" ? speed : 0, axis === "y" ? speed : 0);
      this.cars.push({ body, axis, speed, kind: HIT_AS[style.kind] });
    }
  }

  private makePlayer(x: number, y: number) {
    const me = figure(this, x, y, playerOf(getState()), { name: "YOU", nameColor: "#60a5fa", unit: 0.22 });
    const halo = this.add.ellipse(0, 9, 32, 11, 0x60a5fa, 0.25).setStrokeStyle(2.5, 0xffffff, 0.95);
    me.addAt(halo, 0);
    this.tweens.add({ targets: halo, scaleX: 1.15, scaleY: 1.15, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    this.grime = this.makeGrime(me);
    me.add(this.grime);
    return me;
  }

  /** Brown stains on the clothes, stink lines and flies buzzing around: you need a wash. */
  private makeGrime(me: Figure) {
    const hip = me.rig.y;
    const top = me.headTop;
    const chest = hip - (hip - top) * 0.42;
    const stains = [
      this.add.ellipse(-4, chest, 9, 7, 0x5b3a1e, 0.85),
      this.add.ellipse(5, chest + 7, 7, 5, 0x6b4423, 0.85),
      this.add.ellipse(-2, hip - 1, 10, 4, 0x5b3a1e, 0.75),
    ];
    const stink = [-9, 0, 9].map((dx, i) => {
      const line = this.add
        .text(dx, top - 6, "~", { fontFamily: "system-ui, sans-serif", fontSize: "13px", fontStyle: "bold", color: "#86a83a" })
        .setOrigin(0.5)
        .setAlpha(0);
      this.tweens.add({ targets: line, y: top - 22, alpha: { from: 0.95, to: 0 }, duration: 1300, delay: i * 420, repeat: -1 });
      return line;
    });
    const flies = [0, 1, 2].map((i) => {
      const fly = this.add.text(0, 0, "🪰", { fontSize: "10px" }).setOrigin(0.5);
      const orbit = { a: (i * Math.PI * 2) / 3 };
      this.tweens.add({
        targets: orbit,
        a: orbit.a + Math.PI * 2,
        duration: 1100 + i * 300,
        repeat: -1,
        onUpdate: () => fly.setPosition(Math.cos(orbit.a) * (14 + i * 3), top + 4 + Math.sin(orbit.a * 2) * 7),
      });
      return fly;
    });
    return this.add.container(0, 0, [...stains, ...stink, ...flies]).setVisible(false);
  }


  private makeMarker(tint: number, glyph: string) {
    const ring = this.add.circle(0, 0, 34, tint, 0.2).setStrokeStyle(3, tint, 1);
    const sign = this.add
      .text(0, -62, glyph, { fontFamily: "system-ui", fontSize: "28px", fontStyle: "bold", color: "#ffffff", stroke: "#05070c", strokeThickness: 3, backgroundColor: Phaser.Display.Color.IntegerToColor(tint).rgba, padding: { x: 8, y: 2 } })
      .setOrigin(0.5);
    this.tweens.add({ targets: sign, y: -72, duration: 600, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: ring, scale: 1.3, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    return this.add.container(0, 0, [ring, sign]).setDepth(9).setVisible(false);
  }

  // ── State-driven updates ────────────────────────────────────────────────────

  private refresh() {
    const state = getState();
    if (!state) return;
    // Good news: the player celebrates.
    const now = this.time.now;
    if (this.player && this.lastMoney != null && state.stats.money - this.lastMoney >= 20000 && !state.event) pose(this.player, "celebrate", now, 1500);
    if (this.player && state.toast && state.toast !== this.lastToast && /^(🎉|🏆|💡|✅|📖|🌱)/u.test(state.toast)) pose(this.player, "celebrate", now, 1500);
    this.lastMoney = state.stats.money;
    this.lastToast = state.toast;
    for (const { id, marker } of this.placeMarkers) {
      const def = PLACES.find((p) => p.id === id);
      marker.setVisible(check(state, (def as { if?: never })?.if));
    }
    this.grime?.setVisible(isDirty(state));
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
    // FRSC sets up at different junctions each day.
    if (this.mapId === "city" && this.frscDay !== state.day) {
      this.frscPosts.forEach((p) => {
        p.officer.destroy();
        p.barrier.destroy();
      });
      this.frscDay = state.day;
      this.frscPosts = frscSpots(state.day).map(({ x, y }) => {
        const barrier = this.add.image(x + 30, y + 30, "barrier").setDepth(7);
        const officer = figure(this, x + 64, y + 4, POLICE, { name: "FRSC", nameColor: "#fde047" });
        officer.setDepth(5 + (y + 4) / 10000);
        return { officer, barrier, x: x + 30, y: y + 30 };
      });
    }
    if (!wantPolice && this.police.length) {
      this.police.forEach((p) => {
        p.officer.destroy();
        p.barrier.destroy();
      });
      this.police = [];
    }
    const alpha = this.mapId !== "city" ? 0 : [0, 0.06, 0.24, 0.62][Math.min(state.slot, 3)]!;
    this.night.setFillStyle(state.slot === 2 ? 0x7c2d12 : 0x050b24, alpha);
    const glow = this.mapId !== "city" ? 0 : [0, 0, 0.2, 0.4][Math.min(state.slot, 3)]!;
    this.glows.forEach((g) => g.setAlpha(glow));
    this.windowLights?.setAlpha(this.mapId !== "city" ? 0 : [0, 0, 0.45, 0.95][Math.min(state.slot, 3)]!);
    const lit = this.mapId !== "city" ? 0 : [0, 0, 0.55, 1][Math.min(state.slot, 3)]!;
    this.nightWindows.forEach((l) => l.setAlpha(lit));
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const state = getState();
    if (!state || input.paused) return;
    this.moveTraffic(dt, time);
    this.rail?.update(time);
    if (this.riding) {
      this.driveRide(dt);
      return;
    }
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
    if (this.exploring) {
      // The joystick and keys glide the camera instead of walking.
      const cam = this.cameras.main;
      const pan = (650 / cam.zoom) * dt;
      cam.scrollX += vx * pan;
      cam.scrollY += vy * pan;
      vx = 0;
      vy = 0;
    }
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
    // A bad injury slows you down: a cast or a sling. A car is much faster.
    const hurt = injured(state);
    const driving = this.mapId === "city" && isDriving(state);
    // Run with Shift, a joystick pushed all the way, or a long tap-to-walk trip.
    const far = this.path.length > 0 && Math.hypot(this.path[this.path.length - 1]!.x - this.player.x, this.path[this.path.length - 1]!.y - this.player.y) > 320;
    const running = !driving && !hurt && (k.shift.isDown || Math.hypot(input.x, input.y) > 0.95 || far);
    const pace = driving ? SPEED * 2.6 : SPEED * (hurt === "fracture" ? 0.45 : hurt === "dislocation" ? 0.75 : running ? 1.55 : 1);
    if (Phaser.Input.Keyboard.JustDown(k.j) && !driving) pose(this.player, "jump", time, 560);
    if (vx || vy) this.move(vx * pace * dt, vy * pace * dt, time);
    const moved = this.player.x !== fromX || this.player.y !== fromY;
    this.showCar(driving, this.player.x - fromX, this.player.y - fromY);
    // Stand still by a bench and you sit down.
    if (moved) this.stillSince = time;
    else if (time - this.stillSince > 1500 && this.player.action?.motion !== "sit" && !driving && this.seats.some((p) => Math.hypot(p.x - this.player.x, p.y - this.player.y) < 26)) pose(this.player, "sit", time, 1e9);
    animateWalk(this.player, time, moved, this.player.x - fromX, this.player.y - fromY, running);
    this.player.setDepth(5 + this.player.y / 10000 + 0.5);

    this.checkNear();
    if (Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.space) || input.interact) {
      input.interact = false;
      if (this.near) {
        // Reach for the door or counter; wave to people.
        pose(this.player, this.near.kind === "person" ? "wave" : "interact", time, 800);
        if (this.near.kind === "person") {
          const who = this.people.find((p) => p.id === this.near!.id);
          if (who) pose(who.body, "wave", time, 1100);
        }
        bus.emit("interact", this.near);
      }
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
    // City buildings: walk up to the front to look around or go in.
    if (this.mapId === "city") {
      for (const l of lotsFor(state)) {
        if (l.place) continue;
        const door = lotDoor(l);
        if (Math.abs(door.x - this.player.x) > 120 || Math.abs(door.y - this.player.y) > 120) continue;
        options.push({ kind: "lot", id: l.id, label: buildingInfo(l.def)?.name ?? "Building", x: door.x, y: door.y + 8 });
      }
    }
    // Story-chapter buildings you can walk into: their door is in the middle of the front wall.
    if (this.mapId !== "city") {
      for (const s of MAPS[this.mapId]?.solids ?? []) {
        if (s.label && s.h >= 22 && roomForBuilding(s.label)) options.push({ kind: "door", id: s.label, label: s.label, x: s.x + s.w / 2, y: s.y + s.h + 16 });
      }
    }
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
    if (isDriving(getState()!)) {
      for (const p of this.frscPosts) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 90) {
          frsc();
          break;
        }
      }
      return;
    }
    for (const car of this.cars) {
      if (Math.abs(car.body.x - this.player.x) < 24 && Math.abs(car.body.y - this.player.y) < 24) {
        const away = car.axis === "x" ? { x: 0, y: this.player.y < car.body.y ? -44 : 44 } : { x: this.player.x < car.body.x ? -44 : 44, y: 0 };
        const nx = this.player.x + away.x;
        const ny = this.player.y + away.y;
        if (!blocked(nx, ny, RADIUS, this.solids)) this.player.setPosition(nx, ny);
        bump(car.kind);
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

  /** Behind the wheel: the car stands in for you, and fuel is paid by distance. */
  private showCar(driving: boolean, dx: number, dy: number) {
    if (!driving) {
      if (this.myCar) {
        this.myCar.destroy();
        this.myCarTag?.destroy();
        this.myCar = null;
        this.myCarTag = null;
        if (!this.riding) this.player.setVisible(true);
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      }
      return;
    }
    if (!this.myCar) {
      this.myCar = vehicle(this, this.player.x, this.player.y, { kind: "car", color: CAR_COLOR });
      this.myCarTag = this.add
        .text(0, 0, "YOU", { fontFamily: "system-ui, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#60a5fa", stroke: "#05070c", strokeThickness: 4 })
        .setResolution(2)
        .setOrigin(0.5);
      this.player.setVisible(false);
    }
    const car = this.myCar;
    if (dx || dy) faceVehicle(car, dx, dy);
    car.setPosition(this.player.x, this.player.y).setDepth(5 + this.player.y / 10000 + 0.5);
    this.myCarTag!.setPosition(car.x, car.y - car.displayHeight * car.originY - 8).setDepth(car.depth);
    this.driven += Math.hypot(dx, dy);
    if (this.driven >= 400) {
      fuel(this.driven);
      this.driven = 0;
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
    this.arrow.setFillStyle(step ? 0x38bdf8 : 0x3b82f6);
  }

  // ── Rides ─────────────────────────────────────────────────────────────────

  private startRide(mode: RideMode | "car", to: { x: number; y: number }) {
    if (this.mapId !== "city") return;
    this.finishRide();
    // Driving there yourself: the car on the map becomes the ride.
    if (this.myCar) {
      this.myCar.destroy();
      this.myCarTag?.destroy();
      this.myCar = null;
      this.myCarTag = null;
    }
    const style: VehicleStyle =
      mode === "car" ? { kind: "car", color: CAR_COLOR } : mode === "taxi" ? { kind: "taxi", color: TAXI_COLOR } : mode === "okada" ? { kind: "okada", color: OKADA_COLORS.red } : mode === "keke" ? { kind: "keke", color: KEKE_COLORS.yellow } : { kind: "bus", color: "#f5c518" };
    // You hop in at the nearest road and get dropped at the roadside closest to where you're going.
    const full = roadRoute({ x: this.player.x, y: this.player.y }, to);
    const route = full.length > 2 ? full.slice(1, -1) : [to];
    const curb = route[route.length - 1]!;
    const away = Math.hypot(to.x - curb.x, to.y - curb.y);
    const step = Math.min(40, away);
    const drop = away > 1 ? { x: curb.x + ((to.x - curb.x) / away) * step, y: curb.y + ((to.y - curb.y) / away) * step } : curb;
    const car = vehicle(this, route[0]!.x, route[0]!.y, style).setDepth(9);
    const tag = this.add
      .text(car.x, car.y, "YOU", { fontFamily: "system-ui, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#60a5fa", stroke: "#05070c", strokeThickness: 4 })
      .setResolution(2)
      .setOrigin(0.5)
      .setDepth(9);
    this.setExploring(false);
    this.player.setVisible(false);
    this.path = [];
    this.near = null;
    bus.emit("near", null);
    this.cameras.main.startFollow(car, true, 0.12, 0.12);
    const speed = mode === "bus" ? 420 : mode === "keke" ? 560 : mode === "okada" ? 720 : 640;
    this.riding = { car, tag, route, leg: 1, speed, drop: blocked(drop.x, drop.y, RADIUS, this.solids) ? freePoint(drop.x, drop.y, this.solids) : drop };
  }

  private driveRide(dt: number) {
    const ride = this.riding!;
    let budget = ride.speed * dt;
    while (budget > 0 && ride.leg < ride.route.length) {
      const target = ride.route[ride.leg]!;
      const dx = target.x - ride.car.x;
      const dy = target.y - ride.car.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) faceVehicle(ride.car, dx, dy);
      if (dist <= budget) {
        ride.car.setPosition(target.x, target.y);
        budget -= dist;
        ride.leg += 1;
      } else {
        ride.car.setPosition(ride.car.x + (dx / dist) * budget, ride.car.y + (dy / dist) * budget);
        budget = 0;
      }
    }
    ride.tag.setPosition(ride.car.x, ride.car.y - ride.car.displayHeight * ride.car.originY - 8);
    if (ride.leg >= ride.route.length) this.finishRide();
  }

  private finishRide() {
    const ride = this.riding;
    if (!ride) return;
    this.riding = null;
    const end = ride.drop;
    ride.car.destroy();
    ride.tag.destroy();
    this.player.setPosition(end.x, end.y).setVisible(true);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    savePosition(end.x, end.y, districtAt(end.x, end.y)?.id ?? getState()?.district ?? "");
  }

  private moveTraffic(dt: number, time: number) {
    // Lights cycle: one direction goes while the other waits.
    const phase = Math.floor(time / 1000) % 10;
    for (const s of this.signals) {
      const go = (phase < 5) === (s.axis === "x");
      const amber = phase === 4 || phase === 9;
      const [dy, tint] = amber ? [-55, 0xf59e0b] : go ? [-46, 0x22c55e] : [-64, 0xef4444];
      s.img.setY(s.y + dy).setTint(tint);
    }
    // See yourself through a tall building when you walk behind it.
    for (const t of this.towers) {
      const behind = this.player.visible && this.player.x > t.face.x - 6 && this.player.x < t.face.x + t.face.w + 6 && this.player.y > t.face.y && this.player.y < t.base;
      t.g.setAlpha(behind ? 0.45 : 1);
    }
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
      car.body.setDepth(5 + car.body.y / 10000);
    }
    for (const p of this.people) {
      // People you know wave when you come close (now and then, not every step).
      if (this.player && Math.hypot(p.body.x - this.player.x, p.body.y - this.player.y) < 80 && (this.waved.get(p.id) ?? -1e9) < time - 25000) {
        this.waved.set(p.id, time);
        pose(p.body, "wave", time, 1300);
      }
      if (Math.random() < 0.01) {
        p.vx = (Math.random() - 0.5) * 30;
        p.vy = (Math.random() - 0.5) * 30;
      }
      const nx = p.body.x + p.vx * dt;
      const ny = p.body.y + p.vy * dt;
      const ok = !p.body.action && Math.hypot(nx - p.home.x, ny - p.home.y) < 40 && !blocked(nx, ny, 10, this.solids);
      if (ok) p.body.setPosition(nx, ny);
      p.body.setDepth(5 + p.body.y / 10000);
      animateWalk(p.body, time, ok, p.vx, p.vy);
    }
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#05070c",
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true },
    scene: [WorldScene, RoomScene],
    input: { keyboard: true, touch: true },
  });
}
