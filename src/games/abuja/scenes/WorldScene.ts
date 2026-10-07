import { startSceneLoading, finishSceneLoading } from "./loading";
import { GAME_FONT } from "../ui/theme";
import * as Phaser from "phaser";
import { DISTRICTS, MAPS, PLACES, WORLD, chapter, districtAt } from "../systems/data";
import { LAKE, ROADS, blocked, freePoint, roadRoute, sizeOf, solidsFor } from "../systems/citymap";
import { FLEET, HIT_AS, KEKE_COLORS, OKADA_COLORS, TAXI_COLOR, type VehicleStyle } from "../systems/vehicles";
import type { RideMode } from "../systems/rides";
import { personLook } from "../systems/peoplelook";
import { roomForBuilding } from "../systems/rooms";
import { RoomScene } from "./RoomScene";
import { isDirty } from "../systems/life";
import { injured, type HitBy } from "../systems/health";
import { CAR_COLOR, frscSpots, isDriving } from "../systems/drive";
import { bump, checkpoint, frsc, leftRichArea, shutOut, trespass, welcome, fuel, currentBeat, mapIdFor, peopleOn, personAt, personKey, savePosition, taskReach } from "../systems/engine";
import { check } from "../systems/rules";
import { bus, getState, input, subscribe } from "../systems/store";
import { findPath, type Point } from "../systems/path";
import type { GameState, MapRect } from "../systems/types";
import { lotDoor, type Lot } from "../systems/city/layout";
import { drawBridge, drawMedians, drawRail, drawStreetFurniture, makeDecorTextures, zoneOverlay } from "./cityDecor";
import { lotsFor } from "../systems/city/sim";
import { CityLife, crowdStarters } from "./cityLife";
import { playerPainted } from "../systems/painted";
import { building as buildingInfo } from "../systems/city/catalog";
import { fullLook, lookKey, randomLook, stageOf, type Look } from "../systems/character";
import { ChunkedGraphics, type CullBounds } from "./chunkedGraphics";
import { INK, animateWalk, pose, building, lotKey, placeBuilding, queueBuildings, faceVehicle, figure, makeArt, queueCharacters, queueVehicles, rand, signpost, tileKey, vehicle, type Figure, type Person, type Vehicle } from "./art";

// A brisk walk: a little over two body-lengths a second, as people move in a life sim.
// Running is about 1.7× that; cars travel separately at road speed.
const SPEED = 125;
const CAR_SPEED = 560;
// v2: the closer default camera from the style guide (an older saved zoom is ignored once).
const ZOOM_KEY = "abuja-hustle.zoom.v2";
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 3;
const NEAR = 105;
const RADIUS = 14;
const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const LINE = 4;
const title = (scene: Phaser.Scene, x: number, y: number, text: string, size = 14, fill = "#ffffff") =>
  scene.add
    .text(x, y, text, { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: "900", color: fill, stroke: "#1b2333", strokeThickness: Math.max(3, size / 5) })
    .setShadow(0, 2, "rgba(0,0,0,0.35)", 4, true, true)
    .setResolution(2)
    .setOrigin(0.5, 0);

// Who's who: the same person always looks the same.
const personOf = personLook;
const playerOf = (state: GameState | null): Person => ({ look: fullLook(state?.looks ?? {}), adult: (state?.age ?? 0) >= 18, stage: stageOf(state?.age ?? 0), painted: playerPainted(state) });
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
const POLICE: Person = { look: POLICE_LOOK, adult: true, painted: "police" };
const FRSC: Person = { look: POLICE_LOOK, adult: true, painted: "frsc" };

/** Ground texture for each district of the city. */
const DISTRICT_TILE: Record<string, string> = {
  // Poor: red laterite earth. Middle: grass and paving. Rich: clipped lawns.
  kubwa: "dirt",
  deidei: "dirt",
  lugbe: "dirt",
  mpape: "dirt",
  karu: "dirt",
  nyanya: "dirt",
  gwarinpa: "grass",
  jabi: "grass",
  wuye: "grass",
  lokogoma: "grass",
  apo: "sand",
  utako: "pavement",
  wuse: "pavement",
  garki: "pavement",
  cbd: "plaza",
  maitama: "lawn",
  asokoro: "lawn",
  katampe: "lawn",
  guzape: "lawn",
  threearms: "lawn",
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
  katampe: ["palm", "tree", "flowers", "bush", "rock", "boulders"],
  guzape: ["palm", "tree", "flowers", "rock", "bush"],
  threearms: ["palm", "tree", "flowers", "flowers", "boulders"],
  deidei: ["kiosk", "stall", "barrel", "generator", "rock", "grass"],
  mpape: ["rock", "boulders", "kiosk", "generator", "tree3", "grass"],
  karu: ["kiosk", "stall", "generator", "tree3", "bin", "grass"],
  wuye: ["tree", "bush", "planter", "palm", "bin"],
  utako: ["kiosk", "planter", "palm", "bin", "stall"],
  lokogoma: ["tree", "bush", "grass", "rock", "palm"],
  apo: ["barrel", "generator", "kiosk", "tree3", "rock"],
  maitama: ["palm", "tree", "flowers", "flowers", "bush", "fence"],
  asokoro: ["palm", "tree", "flowers", "rock", "boulders", "bush"],
  cbd: ["palm", "flowers", "bush", "bench", "bin"],
  wuse: ["kiosk", "stall", "bush", "palm", "planter", "bin"],
  garki: ["tree3", "kiosk", "stall", "palm", "bush", "planter"],
  jabi: ["palm", "tree", "flowers", "bush", "pond", "grass"],
  gwarinpa: ["tree", "bush", "flowers", "palm", "grass", "fence"],
  kubwa: ["rock", "boulders", "tree", "tree2", "grass", "grass"],
  nyanya: ["kiosk", "stall", "generator", "tree3", "rock", "grass"],
  lugbe: ["barrel", "rock", "tree3", "generator", "barrel", "grass"],
};

/** Where the player stood when the scene redraws in place (say, after a change of outfit). */
/** How far around you (each way) buildings must be drawn before the city opens. */
const NEAR_LOTS = 800;
/** The city is woken and put to sleep in blocks this size (see wakeBlocks). */
const BLOCK = 800;
const blockOf = (x: number, y: number) => `${Math.floor(x / BLOCK)}_${Math.floor(y / BLOCK)}`;
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
  private lastTrespass = 0;
  private lastCull = 0;
  private focus = { x: 0, y: 0 };
  private blocks = new Map<string, { lots: Lot[]; awake: boolean }>();
  private placed = new Map<string, { img: Phaser.GameObjects.Image; lit: Phaser.GameObjects.Image | null; key: Phaser.GameObjects.Text | null; tower: WorldScene["towers"][number] | null; texture: string }>();
  private litLevel = 0;
  private trespassIn: string | null = null;
  private placeMarkers: { id: string; marker: Phaser.GameObjects.Container }[] = [];
  private people: (Interactable & { body: Figure; home: { x: number; y: number }; vx: number; vy: number })[] = [];
  /** The city's people going about their day near the camera. */
  private life: CityLife | null = null;
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
  private sun!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
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
    startSceneLoading(this, mapId === "city" ? "Getting Abuja ready" : `Loading ${chapter(mapId)?.title ?? "your next chapter"}`);
    const people: Person[] = [playerOf(state)];
    if (state) people.push(...peopleOn(state, mapId).map(personOf));
    if (mapId === "city") people.push(...crowdStarters(state?.day ?? 0), POLICE, FRSC);
    queueCharacters(this, people);
    if (mapId === "city") {
      queueVehicles(this);
      // Only the buildings around you hold up the start; the rest load block by block (wakeBlocks).
      const at = carry?.mapId === mapId ? carry : state?.pos.x ? state.pos : { x: PLACES[0]!.x, y: PLACES[0]!.y };
      this.focus = { x: at.x, y: at.y };
      queueBuildings(this, lotsFor(state).filter((l) => Math.abs(l.x + l.w / 2 - at.x) < NEAR_LOTS && Math.abs(l.y + l.h / 2 - at.y) < NEAR_LOTS));
    }
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
    this.life = null;
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
    this.beatMarker = this.makeMarker(0x70d3ad, "!");
    this.taskMarker = this.makeMarker(0x38bdf8, "★");
    this.arrow = this.add.triangle(0, 0, 0, -12, 9, 8, -9, 8, 0x70d3ad).setDepth(20).setVisible(false);
    this.night = this.add.rectangle(0, 0, 4000, 4000, 0x0b1330, 0).setOrigin(0).setScrollFactor(0).setDepth(30);
    // Warm sunlight over everything by day, and a soft vignette to pull the eye to the middle.
    this.sun = this.add.rectangle(0, 0, 4000, 4000, 0xffc978, 0).setOrigin(0).setScrollFactor(0).setDepth(29.5);
    this.vignette = this.add.image(0, 0, this.makeVignette()).setOrigin(0).setScrollFactor(0).setDepth(29.6);
    this.sizeVignette();
    this.scale.on("resize", this.sizeVignette, this);

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
      // The game was torn down (back to the title): nothing left to update.
      if (!this.sys?.game || !this.scene) {
        this.unsub?.();
        this.unsub = null;
        return;
      }
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
      finishSceneLoading(this);
    });
    // Let go of the store and the bus when the scene stops, or when the whole game is torn down (back to the title).
    const cleanup = () => {
      this.events.off("wake");
      this.unsub?.();
      this.unsub = null;
      this.offs.forEach((off) => off());
      this.offs = [];
      this.scale?.off("resize", this.fitZoom, this);
      this.scale?.off("resize", this.sizeVignette, this);
    };
    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);
    this.pendingRestart = false;
    this.near = null;
    bus.emit("near", null);
    finishSceneLoading(this);
    // Development only: lets automated browser tests move the player.
    if (import.meta.env.DEV) (window as unknown as { __abuja?: unknown }).__abuja = { place: (x: number, y: number) => this.player.setPosition(x, y), at: () => [this.player.x, this.player.y], blocks: () => [this.placed.size, [...this.blocks.values()].filter((b) => b.awake).length, this.textures.getTextureKeys().filter((k) => k.startsWith("bld_")).length], fps: () => [Math.round(this.game.loop.actualFps), this.children.length, this.life?.count ?? 0], hit: (by: HitBy) => bump(by), crowd: () => this.life?.count ?? 0, crowdAt: () => this.life?.positions ?? [], me: () => { const c = this.cameras.main; return [(this.player.x - c.worldView.x) * c.zoom, (this.player.y - c.worldView.y) * c.zoom, c.zoom]; } };
  }

  private cityIdOf(state: GameState | null) {
    return Object.entries(state?.city?.lots ?? {})
      .map(([id, o]) => `${id}:${o.def ?? ""}:${o.owned ? 1 : 0}`)
      .join("|");
  }

  private lookIdOf(state: GameState | null) {
    const me = playerOf(state);
    return `${lookKey(me.look)}${me.adult ? "a" : "k"}${me.painted ?? ""}`;
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
      if (d && state && shutOut(state, d.id)) return false;
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
  /** A radial darkening at the screen edges, drawn once. */
  private makeVignette() {
    const key = "vignette";
    if (this.textures.exists(key)) return key;
    const canvas = this.textures.createCanvas(key, 512, 512)!;
    const ctx = canvas.getContext();
    const g = ctx.createRadialGradient(256, 256, 150, 256, 256, 362);
    g.addColorStop(0, "rgba(20,12,4,0)");
    g.addColorStop(1, "rgba(20,12,4,0.32)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    canvas.refresh();
    return key;
  }

  private sizeVignette() {
    this.vignette?.setDisplaySize(this.scale.width, this.scale.height);
  }

  private fitZoom() {
    const { width, height } = this.scale;
    const small = Math.min(width, height);
    const fallback = small < 520 ? 1.85 : small < 800 ? 1.9 : 2.05;
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
      // Gated estates get a faint wash of their colour; no hard borders between districts.
      if (d.gate) this.add.graphics().fillStyle(color(d.color), 0.1).fillRect(d.x, d.y, d.w, d.h);
    }
    this.drawLake();
    drawBridge(this);
    this.drawRoads();
    drawMedians(this);
    this.rail = drawRail(this);
    this.drawSolids();
    this.drawPlaces();
    const lots = lotsFor(getState());
    const furniture = drawStreetFurniture(this, this.solids, lots);
    this.seats = furniture.seats;
    this.life = new CityLife(this, lots, this.solids, furniture.stops, this.seats, sizeOf(this.mapId));
    this.zones = zoneOverlay(this, lots);
    this.drawStreetscape(lots);
    this.drawProps(260);
    this.drawLamps();
    this.spawnTraffic();
    // District names sit above the scenery.
    for (const d of DISTRICTS) title(this, d.x + 18, d.y + 12, `${d.name}${d.gate?.hard ? " 🔒" : d.gate ? " 🛡️" : ""}`, 22).setOrigin(0, 0).setDepth(3);
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
    // Sidewalks of small pale tiles either side of every road.
    ROADS.xs.forEach((x) => this.add.tileSprite(x - 38, 0, 76, height, tileKey("sidewalk")).setOrigin(0));
    ROADS.ys.forEach((y) => this.add.tileSprite(0, y - 38, width, 76, tileKey("sidewalk")).setOrigin(0));
    // The outer edge of the sidewalk: a soft line where it meets the block.
    const edge = this.add.graphics();
    edge.lineStyle(2, 0x8f8676, 0.45);
    ROADS.xs.forEach((x) => edge.lineBetween(x - 38, 0, x - 38, height).lineBetween(x + 38, 0, x + 38, height));
    ROADS.ys.forEach((y) => edge.lineBetween(0, y - 38, width, y - 38).lineBetween(0, y + 38, width, y + 38));
    // Asphalt.
    ROADS.xs.forEach((x) => this.add.tileSprite(x - 24, 0, 48, height, tileKey("asphalt")).setOrigin(0));
    ROADS.ys.forEach((y) => this.add.tileSprite(0, y - 24, width, 48, tileKey("asphalt")).setOrigin(0));
    // Kerbs: a pale concrete lip with a shadow on the road side.
    const kerb = this.add.graphics();
    const junction = (v: number, list: number[]) => list.some((c) => Math.abs(v - c) < 25);
    const run = (list: number[], max: number, draw: (a: number, b: number) => void) => {
      let from = 0;
      for (const c of [...list].sort((a, b) => a - b)) {
        draw(from, c - 24);
        from = c + 24;
      }
      draw(from, max);
    };
    ROADS.xs.forEach((x) =>
      run(ROADS.ys, height, (a, b) => {
        kerb.fillStyle(0x000000, 0.22).fillRect(x - 24, a, 3, b - a).fillRect(x + 21, a, 3, b - a);
        kerb.fillStyle(0xeae4d8, 1).fillRect(x - 28, a, 4, b - a).fillRect(x + 24, a, 4, b - a);
        kerb.fillStyle(0x9d9585, 1).fillRect(x - 25, a, 1, b - a).fillRect(x + 24, a, 1, b - a);
      }),
    );
    ROADS.ys.forEach((y) =>
      run(ROADS.xs, width, (a, b) => {
        kerb.fillStyle(0x000000, 0.22).fillRect(a, y - 24, b - a, 3).fillRect(a, y + 21, b - a, 3);
        kerb.fillStyle(0xeae4d8, 1).fillRect(a, y - 28, b - a, 4).fillRect(a, y + 24, b - a, 4);
        kerb.fillStyle(0x9d9585, 1).fillRect(a, y - 25, b - a, 1).fillRect(a, y + 24, b - a, 1);
      }),
    );
    // Re-pave the junctions over the sidewalk tiles.
    for (const x of ROADS.xs) for (const y of ROADS.ys) this.add.tileSprite(x - 24, y - 24, 48, 48, tileKey("asphalt")).setOrigin(0);
    const near = (v: number, list: number[]) => list.some((c) => Math.abs(v - c) < 50);
    // Tiled, so only the markings near the camera are drawn each frame.
    const lines = new ChunkedGraphics(this);
    // Centre dashes, and faint solid edge lines.
    lines.fillStyle(0xf8f6f0, 0.92);
    ROADS.xs.forEach((x) => {
      for (let y = 0; y < height; y += 44) if (!near(y + 11, ROADS.ys)) lines.fillRect(x - 1.5, y, 3, 22);
    });
    ROADS.ys.forEach((y) => {
      for (let x = 0; x < width; x += 44) if (!near(x + 11, ROADS.xs)) lines.fillRect(x, y - 1.5, 22, 3);
    });
    lines.fillStyle(0xf8f6f0, 0.35);
    ROADS.xs.forEach((x) => run(ROADS.ys, height, (a, b) => b - a > 60 && lines.fillRect(x - 19, a + 30, 1.5, b - a - 60).fillRect(x + 17.5, a + 30, 1.5, b - a - 60)));
    ROADS.ys.forEach((y) => run(ROADS.xs, width, (a, b) => b - a > 60 && lines.fillRect(a + 30, y - 19, b - a - 60, 1.5).fillRect(a + 30, y + 17.5, b - a - 60, 1.5)));
    // Zebra crossings on every side of each junction, with a stop line.
    lines.fillStyle(0xffffff, 0.88);
    for (const x of ROADS.xs) {
      for (const y of ROADS.ys) {
        for (let i = -20; i <= 16; i += 8) {
          lines.fillRect(x + i, y - 46, 5, 16).fillRect(x + i, y + 30, 5, 16);
          lines.fillRect(x - 46, y + i, 16, 5).fillRect(x + 30, y + i, 16, 5);
        }
        lines.fillRect(x - 22, y - 50, 44, 2).fillRect(x - 22, y + 48, 44, 2).fillRect(x - 50, y - 22, 2, 44).fillRect(x + 48, y - 22, 2, 44);
      }
    }
    // Storm drains along the kerbs, and the odd manhole cover.
    const d = new ChunkedGraphics(this);
    const grate = (gx: number, gy: number, vertical: boolean) => {
      const [w, h] = vertical ? [6, 16] : [16, 6];
      d.fillStyle(0x26262b, 1).fillRect(gx - w / 2, gy - h / 2, w, h);
      d.lineStyle(1, 0x6b6b72, 1).strokeRect(gx - w / 2, gy - h / 2, w, h);
      d.lineStyle(1, 0x55555c, 1);
      for (let k = -6; k <= 6; k += 3) vertical ? d.lineBetween(gx - 2, gy + k, gx + 2, gy + k) : d.lineBetween(gx + k, gy - 2, gx + k, gy + 2);
    };
    const r = rand(4242);
    ROADS.xs.forEach((x) => {
      for (let y = 120; y < height; y += 210) if (!junction(y, ROADS.ys) && !near(y, ROADS.ys)) grate(x + (r() < 0.5 ? -20 : 20), y, true);
    });
    ROADS.ys.forEach((y) => {
      for (let x = 120; x < width; x += 210) if (!junction(x, ROADS.xs) && !near(x, ROADS.xs)) grate(x, y + (r() < 0.5 ? -20 : 20), false);
    });
    for (let i = 0; i < 14; i += 1) {
      const vertical = i % 2 === 0;
      const line = vertical ? ROADS.xs[i % ROADS.xs.length]! : ROADS.ys[i % ROADS.ys.length]!;
      const along = 80 + r() * ((vertical ? height : width) - 160);
      if (near(along, vertical ? ROADS.ys : ROADS.xs)) continue;
      const [mx, my] = vertical ? [line + 10, along] : [along, line + 10];
      d.fillStyle(0x34343a, 1).fillCircle(mx, my, 6);
      d.lineStyle(1.2, 0x6b6b72, 1).strokeCircle(mx, my, 6).strokeCircle(mx, my, 3.5);
    }
  }

  private drawSolids() {
    if (this.mapId === "city") {
      // The city's buildings, from the zoned layout (systems/city), in blocks:
      // only the blocks around the camera are loaded (see wakeBlocks).
      this.blocks = new Map();
      this.placed = new Map();
      for (const l of lotsFor(getState())) {
        const key = blockOf(l.x + l.w / 2, l.y + l.h / 2);
        const block = this.blocks.get(key) ?? { lots: [], awake: false };
        block.lots.push(l);
        this.blocks.set(key, block);
      }
      this.wakeBlocks();
      return;
    }
    this.solids.forEach((s, i) => {
      if (s.kind === "water") return;
      building(this, s, i * 31 + Math.round(s.x), { style: "house" });
    });
  }

  /**
   * Skip drawing what's off screen. The city holds thousands of buildings, trees
   * and people; drawing them all every frame is what makes a big map slow. The
   * camera filter hides an object from the camera without touching its own
   * visibility, which the game uses for other things.
   */
  private cull() {
    const cam = this.cameras.main;
    const view = cam.worldView;
    const pad = 320;
    const [left, top, right, bottom] = [view.x - pad, view.y - pad, view.right + pad, view.bottom + pad];
    for (const o of this.children.list) {
      const g = o as Phaser.GameObjects.Image;
      if (g.scrollFactorX !== 1 || g.x == null) continue;
      // Containers report no size: give them a person-or-car sized box.
      const w = g.displayWidth || 200;
      const h = g.displayHeight || 200;
      const x0 = g.x - (g.displayWidth ? g.originX * w : w / 2);
      const y0 = g.y - (g.displayHeight ? g.originY * h : h / 2);
      // Graphics sit at 0,0 and draw anywhere: keep them, unless they're a tile of a ChunkedGraphics.
      if (o.type === "Graphics") {
        const b = (o as Phaser.GameObjects.Graphics & { cullBounds?: CullBounds }).cullBounds;
        if (b) g.cameraFilter = b.x > right || b.r < left || b.y > bottom || b.b < top ? cam.id : 0;
        continue;
      }
      const off = x0 > right || x0 + w < left || y0 > bottom || y0 + h < top;
      g.cameraFilter = off ? cam.id : 0;
    }
  }

  private placeLot(l: Lot) {
    if (this.placed.has(l.id)) return;
    const b = placeBuilding(this, l);
    const key = getState()?.city?.lots[l.id]?.owned ? this.add.text(l.x + l.w - 6, l.y + l.h - 4, "🔑", { fontSize: "14px" }).setOrigin(1, 1).setDepth(5 + (l.y + l.h) / 10000 + 0.0001) : null;
    if (b.lit) {
      b.lit.setAlpha(this.litLevel);
      this.nightWindows.push(b.lit);
    }
    // Walk behind a building and it fades so you can still see yourself.
    const tower = l.solid ? { g: { setAlpha: (a: number) => (b.img.setAlpha(a), b.lit?.setAlpha(Math.min(a, b.lit.alpha)), b.img) } as unknown as Phaser.GameObjects.Components.Alpha, face: { x: l.x, y: b.top, w: l.w, h: l.y + l.h - b.top }, base: l.y + l.h } : null;
    if (tower) this.towers.push(tower);
    this.placed.set(l.id, { img: b.img, lit: b.lit, key, tower, texture: lotKey(l) });
  }

  /** Take a building down and, when no other standing building uses its picture, free the picture too. */
  private removeLot(l: Lot) {
    const p = this.placed.get(l.id);
    if (!p) return;
    this.placed.delete(l.id);
    p.img.destroy();
    p.lit?.destroy();
    p.key?.destroy();
    if (p.lit) this.nightWindows = this.nightWindows.filter((w) => w !== p.lit);
    if (p.tower) this.towers = this.towers.filter((t) => t !== p.tower);
    if (![...this.placed.values()].some((o) => o.texture === p.texture)) {
      this.textures.remove(p.texture);
      if (this.textures.exists(`${p.texture}_lit`)) this.textures.remove(`${p.texture}_lit`);
    }
  }

  /**
   * The city is cut into blocks. Blocks around the camera are awake: their
   * buildings are loaded and drawn. Blocks well away go to sleep and give their
   * pictures back, so a phone only ever holds the part of Abuja you're in.
   * A ring of blocks between the two stops anything flickering in and out
   * as you walk along a block edge.
   */
  private wakeBlocks() {
    if (!this.blocks.size) return;
    const view = this.cameras.main.worldView;
    // Before the camera has a view (first frame), centre on where you start.
    const [cx, cy] = view.width ? [view.centerX, view.centerY] : [this.focus.x, this.focus.y];
    const [hw, hh] = view.width ? [view.width / 2, view.height / 2] : [600, 400];
    const wake = (bx: number, by: number) => Math.abs(bx * BLOCK + BLOCK / 2 - cx) <= hw + BLOCK && Math.abs(by * BLOCK + BLOCK / 2 - cy) <= hh + BLOCK;
    const keep = (bx: number, by: number) => Math.abs(bx * BLOCK + BLOCK / 2 - cx) <= hw + BLOCK * 1.5 && Math.abs(by * BLOCK + BLOCK / 2 - cy) <= hh + BLOCK * 1.5;
    const toLoad: Lot[] = [];
    for (const [id, block] of this.blocks) {
      const [bx, by] = id.split("_").map(Number) as [number, number];
      if (!block.awake && wake(bx, by)) {
        block.awake = true;
        for (const l of block.lots) {
          if (this.textures.exists(lotKey(l))) this.placeLot(l);
          else toLoad.push(l);
        }
      } else if (block.awake && !keep(bx, by)) {
        block.awake = false;
        block.lots.forEach((l) => this.removeLot(l));
      }
    }
    if (toLoad.length) this.loadLots(toLoad);
  }

  /** Load building pictures in the background, nearest first, and put each building up as it arrives. */
  private loadLots(lots: Lot[]) {
    const at = this.player ?? this.focus;
    lots.sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
    const waiting = new Map<string, Lot[]>();
    for (const l of lots) {
      const key = lotKey(l);
      waiting.set(key, [...(waiting.get(key) ?? []), l]);
    }
    const lit = queueBuildings(this, lots);
    // A building goes up once its picture, and its night-lights picture if it has one, are both in,
    // and only if its block is still awake by then.
    const loaded = (fileKey: string) => {
      const key = fileKey.replace(/_lit$/, "");
      const ready = waiting.get(key);
      if (!ready || !this.textures.exists(key) || (lit.has(key) && !this.textures.exists(`${key}_lit`))) return;
      waiting.delete(key);
      ready.filter((l) => this.blocks.get(blockOf(l.x + l.w / 2, l.y + l.h / 2))?.awake).forEach((l) => this.placeLot(l));
      if (!waiting.size) this.load.off("filecomplete", loaded);
    };
    this.load.on("filecomplete", loaded);
    this.events.once("shutdown", () => this.load.off("filecomplete", loaded));
    if (!this.load.isLoading()) this.load.start();
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
      if (isTree || key === "kiosk" || key === "stall" || key === "planter" || key === "pond") this.solids.push({ x: x - 9, y: y - 10, w: 18, h: 12 });
      placed += 1;
    }
  }

  /**
   * Along the edge of every block: street trees and planters, market stalls
   * around the markets, and cars parked in marked bays.
   */
  private drawStreetscape(lots: Lot[]) {
    const r = rand(5150);
    const onLot = (x: number, y: number, pad: number) => lots.some((l) => x > l.x - pad && x < l.x + l.w + pad && y > l.y - pad && y < l.y + l.h + pad);
    const nearPlace = (x: number, y: number, d: number) => PLACES.some((p) => Math.hypot(p.x - x, p.y - y + 10) < d);
    const free = (x: number, y: number, rad: number) => !blocked(x, y, rad, this.solids) && !onLot(x, y, rad) && !nearPlace(x, y, 70) && x > 30 && y > 30 && x < WORLD.width - 30 && y < WORLD.height - 30 && Math.hypot((x - LAKE.x) / (LAKE.rx + 60), (y - LAKE.y) / (LAKE.ry + 60)) > 1;
    const clearOfJunctions = (v: number, list: number[]) => list.every((c) => Math.abs(v - c) > 90);
    const paved = (x: number, y: number) => ["pavement", "plaza"].includes(DISTRICT_TILE[districtAt(x, y)?.id ?? ""] ?? "");
    const put = (key: string, x: number, y: number, scale = 1) => {
      this.add.image(x, y, key).setOrigin(0.5, 0.92).setScale(scale).setDepth(5 + y / 10000);
      this.solids.push({ x: x - 12 * scale, y: y - 8, w: 24 * scale, h: 10 });
    };
    // Parked cars: side on, in a white-lined bay just off the road.
    const bays = this.add.graphics().setDepth(1.5);
    const parked = FLEET.filter((f) => f.kind === "car" || f.kind === "taxi");
    let k = 0;
    for (const y of ROADS.ys) {
      for (let x = 110; x < WORLD.width - 80; x += 140) {
        if (!clearOfJunctions(x, ROADS.xs)) continue;
        for (const side of [-1, 1] as const) {
          const by = y + side * 58 + (side > 0 ? 12 : 0);
          if (ROADS.ys.some((o) => o !== y && Math.abs(o - by) < 130)) continue;
          if (r() < 0.45 || !free(x, by - 6, 40) || !free(x - 34, by - 6, 12) || !free(x + 34, by - 6, 12)) continue;
          bays.fillStyle(0x000000, 0.06).fillRect(x - 44, by - 22, 88, 30);
          bays.fillStyle(0xffffff, 0.75).fillRect(x - 44, by - 22, 2, 30).fillRect(x + 42, by - 22, 2, 30);
          const car = vehicle(this, x, by, parked[k++ % parked.length]!);
          faceVehicle(car, k % 2 ? 1 : -1, 0);
          car.setDepth(5 + by / 10000);
          this.solids.push({ x: x - 34, y: by - 14, w: 68, h: 16 });
        }
      }
    }
    // Trees and planters lining the streets of the paved districts, greenery elsewhere.
    for (const x of ROADS.xs) {
      for (let y = 90; y < WORLD.height - 40; y += 120) {
        if (!clearOfJunctions(y, ROADS.ys)) continue;
        for (const side of [-1, 1] as const) {
          const px = x + side * 52;
          if (!free(px, y, 18)) continue;
          const roll = r();
          if (paved(px, y)) put(roll < 0.5 ? "planter" : "tree3", px, y, roll < 0.5 ? 0.8 : 0.7);
          else if (roll < 0.6) put(roll < 0.3 ? "tree" : "bush", px, y, roll < 0.3 ? 0.7 : 0.9);
        }
      }
    }
    for (const y of ROADS.ys) {
      for (let x = 60; x < WORLD.width - 40; x += 120) {
        if (!clearOfJunctions(x, ROADS.xs)) continue;
        for (const side of [-1, 1] as const) {
          const py = y + side * 52 + (side > 0 ? 14 : 0);
          if (!free(x, py, 18)) continue;
          const roll = r();
          if (paved(x, py)) put(roll < 0.55 ? "planter" : "tree3", x, py, roll < 0.55 ? 0.8 : 0.7);
          else if (roll < 0.5) put(roll < 0.25 ? "tree" : "bush", x, py, roll < 0.25 ? 0.7 : 0.9);
        }
      }
    }
    // Markets spill out into the street: stalls around every market.
    for (const p of PLACES.filter((q) => /market/i.test(q.id))) {
      for (const [dx, dy] of [[-95, 40], [95, 40], [-95, -50], [95, -50], [0, 95]] as const) {
        const sx = p.x + dx;
        const sy = p.y + dy;
        if (blocked(sx, sy, 30, this.solids) || onLot(sx, sy, 24)) continue;
        this.add.image(sx, sy, "stall").setOrigin(0.5, 0.92).setScale(0.85).setDepth(5 + sy / 10000);
        this.solids.push({ x: sx - 26, y: sy - 10, w: 52, h: 12 });
      }
    }
  }

  private drawLamps() {
    const lamp = (x: number, y: number) => {
      if (blocked(x, y, 12, this.solids)) return;
      this.add.image(x, y, "lamp").setOrigin(0.5, 0.95).setDepth(5 + y / 10000);
      this.glows.push(this.add.image(x, y - 61, "glow").setDepth(31).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc46b).setAlpha(0));
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
      const bubble = this.add.image(p.name.length * 2.9 + 12, body.headTop - 10, "talkbubble").setOrigin(0, 1).setScale(0.8);
      body.add(bubble);
      this.tweens.add({ targets: bubble, y: body.headTop - 14, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.people.push({ kind: "person", id: personKey(p), label: p.name, x: at.x, y: at.y, body, home: at, vx: 0, vy: 0 });
    }
  }

  private spawnTraffic() {
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
    const halo = this.add.ellipse(0, 9, 34, 12, 0xbfdbfe, 0.28).setStrokeStyle(2, 0xffffff, 0.85);
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
        .text(dx, top - 6, "~", { fontFamily: GAME_FONT, fontSize: "13px", fontStyle: "bold", color: "#86a83a" })
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
      .text(0, -62, glyph, { fontFamily: "system-ui", fontSize: "28px", fontStyle: "bold", color: "#f7edda", stroke: "#05070c", strokeThickness: 3, backgroundColor: Phaser.Display.Color.IntegerToColor(tint).rgba, padding: { x: 8, y: 2 } })
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
        const officer = figure(this, x + 64, y + 4, FRSC, { name: "FRSC", nameColor: "#fde047" });
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
    // Golden morning, bright afternoon, orange evening; the vignette deepens at night.
    const slot = Math.min(state.slot, 3);
    this.sun.setFillStyle(slot === 2 ? 0xff9d4d : 0xffc978, this.mapId !== "city" ? 0.03 : [0.07, 0.045, 0.08, 0][slot]!);
    this.vignette.setAlpha([0.8, 0.7, 0.9, 1][slot]!);
    const glow = this.mapId !== "city" ? 0 : [0, 0, 0.2, 0.4][Math.min(state.slot, 3)]!;
    this.glows.forEach((g) => g.setAlpha(glow));
    this.windowLights?.setAlpha(this.mapId !== "city" ? 0 : [0, 0, 0.45, 0.95][Math.min(state.slot, 3)]!);
    const lit = this.mapId !== "city" ? 0 : [0, 0, 0.55, 1][Math.min(state.slot, 3)]!;
    this.litLevel = lit;
    this.nightWindows.forEach((l) => l.setAlpha(lit));
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const state = getState();
    if (!state || input.paused) return;
    this.moveTraffic(dt, time);
    this.rail?.update(time);
    if (time - this.lastCull > 200) {
      this.lastCull = time;
      this.cull();
      if (this.mapId === "city") this.wakeBlocks();
    }
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
    const pace = driving ? CAR_SPEED : SPEED * (hurt === "fracture" ? 0.5 : hurt === "dislocation" ? 0.75 : running ? 1.7 : 1);
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
    // A rich estate you don't belong in: you can walk in, but the longer you stay the likelier you're stopped.
    if (this.mapId === "city" && time - this.lastTrespass > 1000) {
      this.lastTrespass = time;
      const here = districtAt(this.player.x, this.player.y);
      const unwelcome = here && !welcome(state, here.id) ? here : null;
      if (unwelcome) {
        if (this.trespassIn !== unwelcome.id && unwelcome.gate) bus.emit("blocked", `⚠️ ${unwelcome.gate.message}`);
        this.trespassIn = unwelcome.id;
        trespass(unwelcome.id, driving);
      } else if (this.trespassIn) {
        this.trespassIn = null;
        leftRichArea();
      }
    }
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
        if (d?.gate && shutOut(state, d.id)) {
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
        .text(0, 0, "YOU", { fontFamily: GAME_FONT, fontSize: "12px", fontStyle: "bold", color: "#60a5fa", stroke: "#05070c", strokeThickness: 4 })
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
    this.arrow.setFillStyle(step ? 0x38bdf8 : 0x70d3ad);
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
      .text(car.x, car.y, "YOU", { fontFamily: GAME_FONT, fontSize: "12px", fontStyle: "bold", color: "#60a5fa", stroke: "#05070c", strokeThickness: 4 })
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
    const state = getState();
    if (this.life && state && this.player) this.life.update(time, dt, state, this.player);
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
