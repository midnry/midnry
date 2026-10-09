import * as Phaser from "phaser";
import { startSceneLoading, finishSceneLoading } from "./loading";
import { districtAt } from "../systems/data";
import { ROADS, roadRoute } from "../systems/citymap";
import { LANE, SIDEWALK, road, type Road } from "../systems/city/layout";
import { lotsFor } from "../systems/city/sim";
import { CAR_COLOR, frscSpots } from "../systems/drive";
import { lifeOf } from "../systems/life";
import { frsc } from "../systems/engine";
import { FLEET, KEKE_COLORS, OKADA_COLORS, TAXI_COLOR, vehicleKey, vehicleSvg, type VehicleStyle } from "../systems/vehicles";
import { bus, driveInput, getState, input } from "../systems/store";
import { lotKey, queueBuildings, queueVehicles } from "./art";
import { GAME_FONT } from "../ui/theme";
import { weatherOf, type Weather } from "../systems/weather";

// Driving yourself somewhere, seen from behind your car: the real route
// through Abuja's roads, laid out as a road ahead of you that bends at the
// junctions where you turn. Classic pseudo-3D: the road is a strip of
// segments projected towards the horizon, with scenery and traffic as
// sprites scaled by distance.

type Pt = { x: number; y: number };
export type DriveTrip = { from: Pt; to: Pt; name: string; ride?: "okada" | "keke" | "taxi" | "bus" };

/** Public transport: what you ride in, and how fast the driver likes to go (world units a second). */
const RIDES = {
  okada: { style: { kind: "okada", color: OKADA_COLORS.red } as VehicleStyle, cruise: 820, word: "okada" },
  keke: { style: { kind: "keke", color: KEKE_COLORS.yellow } as VehicleStyle, cruise: 540, word: "keke" },
  taxi: { style: { kind: "taxi", color: TAXI_COLOR } as VehicleStyle, cruise: 760, word: "taxi" },
  bus: { style: { kind: "bus", color: "#f5c518" } as VehicleStyle, cruise: 460, word: "bus" },
};

const SEG = 200; // length of a road segment, in world units
const PX = 6; // world units per map pixel along the route
const W = 18.75; // world units per map pixel across the road (a 32 px lane is 600 units)
const DRAW = 180; // segments drawn ahead
const FOV = 100;
const DEPTH = 1 / Math.tan(((FOV / 2) * Math.PI) / 180);
const CAM_H = 1150;
const MAX = 1000; // top speed, world units a second (about 120 km/h)
const KMH = 0.12;

type Sprite = { key: string; x: number; w: number };
type Leg = { a: Pt; b: Pt; road: Road; z0: number; z1: number; turn: number };
type Seg = {
  i: number;
  curve: number;
  y1: number;
  y2: number;
  road: Road;
  cross: boolean;
  ground: number;
  sprites: Sprite[];
  clip: number;
  p: { x1: number; y1: number; w1: number; x2: number; y2: number; w2: number; s1: number; s2: number; z: number };
};
type Car = { z: number; lane: number; speed: number; key: string; w: number; oncoming: boolean };

const C = {
  asphalt: [0x4b4b53, 0x505058],
  line: 0xf2efe6,
  yellow: 0xf2c230,
  grass: [0x5aa03f, 0x529838],
  concrete: [0xd2cab8, 0xc9c0ad],
  kerb: [0x23232a, 0xeeeeee],
  walk: [0xd9d1c1, 0xd0c7b6],
  ground: { dirt: [0xc9a26b, 0xc19a63], grass: [0x6aa84f, 0x63a049], paved: [0xd9cbb0, 0xd1c3a7], lawn: [0x5fae4a, 0x58a643] } as Record<string, number[]>,
};

/** The ground beside the road, by the district you're driving through. */
function groundOf(p: Pt): string {
  const d = districtAt(p.x, p.y)?.id ?? "";
  if (["kubwa", "deidei", "lugbe", "mpape", "karu", "nyanya"].includes(d)) return "dirt";
  if (["maitama", "asokoro", "katampe", "guzape", "threearms"].includes(d)) return "lawn";
  if (["wuse", "cbd", "utako", "garki"].includes(d)) return "paved";
  return "grass";
}

/** Half the width of your side of the road (median edge to kerb), and the median, in world units. */
const carriage = (r: Road) => ({ m: (r.median / 2) * W, c: (r.median / 2 + r.lanes * LANE) * W, lane: LANE * W });

export class DriveScene extends Phaser.Scene {
  private trip!: DriveTrip;
  private legs: Leg[] = [];
  private segs: Seg[] = [];
  private cars: Car[] = [];
  private g!: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private me!: Phaser.GameObjects.Image;
  private sky!: Phaser.GameObjects.TileSprite;
  private hills!: Phaser.GameObjects.TileSprite;
  private pos = 0;
  private speed = 0;
  private x = 0;
  private length = 0;
  private hudAt = 0;
  private bumpAt = 0;
  private frscZ: number | null = null;
  private arrived = false;
  private label!: Phaser.GameObjects.Text;
  private lastRoad: Road | null = null;
  private weather!: Weather;
  private rain: Phaser.GameObjects.TileSprite | null = null;
  private easeTo: number | null = null;
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
  /** The wheel, pedals and gear: the keyboard, or the on-screen controls. */
  private controls = { steer: 0, throttle: 0, brake: 0, reverse: false };
  /** Your headlights at night. */
  private beam: Phaser.GameObjects.Image | null = null;
  /** Scenery and traffic in moonlight (0 by day). */
  private nightTint = 0;

  /** A soft cone of light from the car up the road. */
  private beamTexture() {
    const key = "drive_beam";
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, 512, 384)!;
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(256, 384, 10, 256, 384, 380);
      g.addColorStop(0, "rgba(255,240,200,0.9)");
      g.addColorStop(0.5, "rgba(255,230,180,0.35)");
      g.addColorStop(1, "rgba(255,230,180,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(150, 384);
      ctx.lineTo(0, 0);
      ctx.lineTo(512, 0);
      ctx.lineTo(362, 384);
      ctx.closePath();
      ctx.fill();
      tex.refresh();
    }
    return key;
  }

  constructor() {
    super("drive");
  }

  init(trip: DriveTrip) {
    this.trip = trip;
    this.pos = 0;
    this.speed = 0;
    this.cars = [];
    this.pool = [];
    this.arrived = false;
    this.frscZ = null;
    this.lastRoad = null;
    this.easeTo = null;
    this.beam = null;
    this.nightTint = 0;
    Object.assign(driveInput, { steer: 0, throttle: 0, brake: 0, reverse: false, skip: false });
  }

  preload() {
    const ride = this.trip.ride ? RIDES[this.trip.ride] : null;
    startSceneLoading(this, ride ? `Riding the ${ride.word} to ${this.trip.name}` : `Driving to ${this.trip.name}`);
    queueVehicles(this);
    const mine = this.myStyle();
    const key = `${vehicleKey(mine)}_back`;
    if (!this.textures.exists(key)) {
      const url = URL.createObjectURL(new Blob([vehicleSvg(mine.kind, mine.color, "back", 2.4)], { type: "image/svg+xml" }));
      this.load.svg(key, url);
      this.load.once("complete", () => URL.revokeObjectURL(url));
    }
    this.buildTrack();
    // The buildings you'll pass.
    queueBuildings(this, this.roadside());
  }

  /** The route, turned into legs and road segments. */
  private buildTrack() {
    const route = roadRoute(this.trip.from, this.trip.to);
    const legs: Leg[] = [];
    let z = 0;
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1]!;
      const b = route[i]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 2) continue;
      const horizontal = Math.abs(b.y - a.y) < 0.5;
      const line = horizontal ? a.y : a.x;
      const known = horizontal ? ROADS.ys.includes(line) : ROADS.xs.includes(line);
      // The bits from the kerb to the door are driveways: a narrow street.
      const r = known ? road(horizontal ? "y" : "x", line) : road("x", -1);
      legs.push({ a, b, road: r, z0: z, z1: z + len * PX, turn: 0 });
      z += len * PX;
    }
    // Which way each turn goes (y grows downwards, so a positive cross product turns right).
    for (let i = 0; i < legs.length - 1; i++) {
      const p = legs[i]!;
      const n = legs[i + 1]!;
      const d1 = { x: Math.sign(p.b.x - p.a.x), y: Math.sign(p.b.y - p.a.y) };
      const d2 = { x: Math.sign(n.b.x - n.a.x), y: Math.sign(n.b.y - n.a.y) };
      p.turn = Math.sign(d1.x * d2.y - d1.y * d2.x);
    }
    this.legs = legs;
    this.length = Math.max(SEG * 40, z);
    const count = Math.ceil(this.length / SEG);
    const segs: Seg[] = [];
    let leg = 0;
    for (let i = 0; i < count; i++) {
      const zc = i * SEG;
      while (leg < legs.length - 1 && zc >= legs[leg]!.z1) leg++;
      const L = legs[leg] ?? legs[legs.length - 1]!;
      const t = L ? Math.min(1, Math.max(0, (zc - L.z0) / Math.max(1, L.z1 - L.z0))) : 0;
      const at = L ? { x: L.a.x + (L.b.x - L.a.x) * t, y: L.a.y + (L.b.y - L.a.y) * t } : this.trip.from;
      // Bend into the turn over the last stretch of the leg and the first of the next.
      let curve = 0;
      const nextTurn = L?.turn ?? 0;
      const toEnd = (L ? L.z1 : 0) - zc;
      if (nextTurn && toEnd < SEG * 14 && toEnd >= 0) curve = nextTurn * 5 * Math.sin(((SEG * 14 - toEnd) / (SEG * 14)) * Math.PI);
      // Rolling hills: Abuja sits among them.
      const hill = (k: number) => Math.sin(k / 37) * 700 + Math.sin(k / 11.3) * 160;
      segs.push({ i, curve, y1: hill(i), y2: hill(i + 1), road: L?.road ?? road("x", 690), cross: false, ground: 0, sprites: [], clip: 0, p: { x1: 0, y1: 0, w1: 0, x2: 0, y2: 0, w2: 0, s1: 0, s2: 0, z: 0 } });
      segs[i]!.ground = ["dirt", "grass", "paved", "lawn"].indexOf(groundOf(at));
    }
    // Junctions along the way: wherever another road crosses this one.
    for (const L of legs) {
      const horizontal = Math.abs(L.b.y - L.a.y) < 0.5;
      const lo = horizontal ? Math.min(L.a.x, L.b.x) : Math.min(L.a.y, L.b.y);
      const hi = horizontal ? Math.max(L.a.x, L.b.x) : Math.max(L.a.y, L.b.y);
      for (const c of horizontal ? ROADS.xs : ROADS.ys) {
        if (c < lo - 1 || c > hi + 1) continue;
        const along = Math.abs(c - (horizontal ? L.a.x : L.a.y)) * PX + L.z0;
        const half = (horizontal ? road("x", c) : road("y", c)).lanes * LANE * PX + 120;
        for (let z = along - half; z <= along + half; z += SEG) {
          const s = segs[Math.floor(z / SEG)];
          if (s) s.cross = true;
        }
      }
    }
    this.segs = segs;
    // Today's FRSC checkpoints, if one sits on the route.
    const spots = frscSpots(getState()?.day ?? 0);
    for (const L of legs) {
      for (const sp of spots) {
        const horizontal = Math.abs(L.b.y - L.a.y) < 0.5;
        const onLine = horizontal ? Math.abs(sp.y - L.a.y) < 2 && sp.x >= Math.min(L.a.x, L.b.x) && sp.x <= Math.max(L.a.x, L.b.x) : Math.abs(sp.x - L.a.x) < 2 && sp.y >= Math.min(L.a.y, L.b.y) && sp.y <= Math.max(L.a.y, L.b.y);
        if (onLine && this.frscZ == null) this.frscZ = L.z0 + Math.abs(horizontal ? sp.x - L.a.x : sp.y - L.a.y) * PX + SEG * 6;
      }
    }
  }

  /** Lots along the route, close enough to the road to see. */
  private roadside() {
    const lots = lotsFor(getState());
    return lots.filter((l) => {
      const cx = l.x + l.w / 2;
      const cy = l.y + l.h / 2;
      return this.legs.some((L) => {
        const horizontal = Math.abs(L.b.y - L.a.y) < 0.5;
        const within = horizontal ? cx >= Math.min(L.a.x, L.b.x) - 60 && cx <= Math.max(L.a.x, L.b.x) + 60 : cy >= Math.min(L.a.y, L.b.y) - 60 && cy <= Math.max(L.a.y, L.b.y) + 60;
        const off = horizontal ? Math.abs(cy - L.a.y) : Math.abs(cx - L.a.x);
        return within && off < (L.road.median / 2 + L.road.lanes * LANE + SIDEWALK) + 140;
      });
    });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#8fd0f5");
    this.makeSky();
    this.sky = this.add.tileSprite(0, 0, width, height * 0.6, "drive_sky").setOrigin(0).setScrollFactor(0).setDepth(0);
    this.hills = this.add.tileSprite(0, height * 0.5 - 140, width, 160, "drive_hills").setOrigin(0).setScrollFactor(0).setDepth(1);
    this.g = this.add.graphics().setDepth(2);
    // The weather on the road: rain streaks and a darker sky, or harmattan haze.
    const st = getState();
    this.weather = weatherOf(st?.day ?? 1, st?.slot ?? 0);
    const w = this.weather;
    if (w.wet || w.sky === "cloudy") this.sky.setTint(w.sky === "storm" ? 0x7d8794 : w.sky === "rain" ? 0x9aa6b2 : 0xc9d2da);
    if (w.wet && this.textures.exists("rainstreaks")) this.rain = this.add.tileSprite(0, 0, width, height, "rainstreaks").setOrigin(0).setScrollFactor(0).setDepth(999).setAlpha(w.sky === "storm" ? 0.95 : 0.75).setScale(1.4);
    if (w.sky === "haze") this.add.rectangle(0, 0, width, height, 0xd8c9a3, 0.22).setOrigin(0).setScrollFactor(0).setDepth(998);
    if (w.wet || w.sky === "haze") this.add.rectangle(0, 0, width, height, 0x1e293b, w.sky === "storm" ? 0.22 : w.sky === "haze" ? 0 : 0.12).setOrigin(0).setScrollFactor(0).setDepth(997);
    // Evening and night on the road: a darker world, stars, and your headlights on the tarmac ahead.
    const slot = Math.min(3, st?.slot ?? 0);
    if (slot >= 2) {
      const night = slot === 3;
      this.sky.setTint(night ? 0x1b2550 : 0xb07a8e);
      this.hills.setTint(night ? 0x232a48 : 0x8a6a80);
      this.add.rectangle(0, 0, width, height, night ? 0x040a22 : 0x3a1d4a, night ? 0.5 : 0.22).setOrigin(0).setScrollFactor(0).setDepth(996);
      this.nightTint = night ? 0x7884b4 : 0xd6b4c4;
      if (night) {
        const stars = this.add.graphics().setDepth(996.5).setScrollFactor(0);
        for (let i = 0; i < 70; i++) stars.fillStyle(0xffffff, 0.4 + Math.random() * 0.6).fillCircle(Math.random() * width, Math.random() * height * 0.42, Math.random() < 0.15 ? 1.6 : 0.9);
        stars.fillStyle(0xfdf6d8, 0.95).fillCircle(width * 0.78, height * 0.12, 16);
        this.beam = this.add.image(width / 2, height, this.beamTexture()).setOrigin(0.5, 1).setDepth(997.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55);
      }
    }
    this.placeScenery();
    this.spawnTraffic();
    const myKey = `${vehicleKey(this.myStyle())}_back`;
    this.me = this.add.image(width / 2, height - 30, myKey).setOrigin(0.5, 1).setDepth(1000);
    if (slot === 3) this.me.setTint(0x9aa6c8);
    this.label = this.add
      .text(width / 2, height * 0.18, "", { fontFamily: GAME_FONT, fontSize: "22px", fontStyle: "bold", color: "#ffffff", stroke: "#0b1f3d", strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(1001)
      .setScrollFactor(0);
    // Start in a middle lane of your side of the road.
    this.x = this.laneCentre(this.segs[0]!.road);
    this.keys = this.input.keyboard!.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D" }) as typeof this.keys;
    this.input.keyboard!.disableGlobalCapture();
    // No licence and no checkpoint on the way? FRSC might still be out.
    if (this.trip.ride) this.frscZ = null;
    else if (this.frscZ == null && !lifeOf(getState()!).license && Math.random() < 0.3) this.frscZ = this.length * (0.3 + Math.random() * 0.4);
    this.scale.on("resize", this.layout, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.layout, this));
    this.layout();
    finishSceneLoading(this);
    // Development only: lets automated browser tests read the car.
    if (import.meta.env.DEV) (window as unknown as { __drive?: unknown }).__drive = { state: () => ({ x: Math.round(this.x), speed: Math.round(this.speed), pos: Math.round(this.pos), length: Math.round(this.length) }), legs: () => this.legs.map((l) => [Math.round(l.z0), Math.round(l.z1), l.turn, l.road.name]), jump: (z: number) => void (this.pos = z) };
  }

  private layout() {
    const { width, height } = this.scale;
    this.sky?.setSize(width, height * 0.6);
    this.hills?.setPosition(0, height * 0.5 - 140).setSize(width, 160);
    this.label?.setPosition(width / 2, height * 0.18);
    if (this.me) {
      // On a phone the wheel and pedals take the bottom of the screen: the car sits above them.
      const phone = width < 640;
      const w = phone ? width * 0.44 : Math.min(width * 0.34, height * 0.42);
      this.me.setPosition(width / 2, this.carY());
      this.me.setScale(w / this.me.width);
      this.beam?.setPosition(width / 2, this.carY() - this.me.displayHeight * 0.55).setDisplaySize(w * 2.4, height * 0.5);
    }
  }

  /** Where your car sits on screen. */
  private carY() {
    const { width, height } = this.scale;
    return width < 640 ? height - 160 : height - Math.max(24, height * 0.06);
  }

  /** A painted sky, and hills on the horizon with Aso Rock and the city. */
  private makeSky() {
    if (!this.textures.exists("drive_sky")) {
      const t = this.textures.createCanvas("drive_sky", 1024, 512)!;
      const ctx = t.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#3d8fd6");
      grad.addColorStop(0.7, "#9fd3f2");
      grad.addColorStop(1, "#d9eef8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const [x, y, s] of [[120, 120, 1], [420, 80, 1.3], [700, 150, 0.9], [900, 70, 1.1]] as const) {
        for (const [dx, dy, r] of [[0, 0, 34], [36, -14, 40], [76, 0, 32], [40, 10, 30]] as const) {
          ctx.beginPath();
          ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      t.refresh();
    }
    if (!this.textures.exists("drive_hills")) {
      const t = this.textures.createCanvas("drive_hills", 1024, 160)!;
      const ctx = t.getContext();
      // Far hills.
      ctx.fillStyle = "#7fae8a";
      ctx.beginPath();
      ctx.moveTo(0, 160);
      for (let x = 0; x <= 1024; x += 16) ctx.lineTo(x, 110 - Math.sin(x / 90) * 22 - Math.sin(x / 37) * 8);
      ctx.lineTo(1024, 160);
      ctx.fill();
      // Aso Rock: a great bare granite dome.
      ctx.fillStyle = "#8a8f86";
      ctx.beginPath();
      ctx.moveTo(560, 160);
      ctx.bezierCurveTo(580, 40, 690, 20, 760, 70);
      ctx.bezierCurveTo(790, 90, 800, 130, 820, 160);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(620, 90);
      ctx.bezierCurveTo(650, 50, 700, 40, 730, 60);
      ctx.lineTo(700, 70);
      ctx.fill();
      // The skyline: towers in the hazy distance.
      ctx.fillStyle = "#9db3c4";
      for (const [x, w, h] of [[120, 24, 70], [150, 18, 50], [175, 30, 90], [212, 20, 60], [300, 26, 80], [332, 16, 45], [880, 22, 65], [908, 30, 85], [945, 18, 55]] as const) ctx.fillRect(x, 160 - h - 40, w, h + 40);
      // The National Mosque's dome and minarets.
      ctx.fillStyle = "#c9b27a";
      ctx.beginPath();
      ctx.arc(420, 128, 22, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(388, 80, 6, 50);
      ctx.fillRect(446, 80, 6, 50);
      // Near hills.
      ctx.fillStyle = "#5f9a5a";
      ctx.beginPath();
      ctx.moveTo(0, 160);
      for (let x = 0; x <= 1024; x += 16) ctx.lineTo(x, 140 - Math.sin(x / 140 + 1) * 14);
      ctx.lineTo(1024, 160);
      ctx.fill();
      t.refresh();
    }
  }

  /** Trees, lamps, bus stops and the buildings you pass, on both sides of the road. */
  private placeScenery() {
    const lots = this.roadside();
    const has = (k: string) => this.textures.exists(k);
    for (const s of this.segs) {
      const c = carriage(s.road);
      const edge = c.c + SIDEWALK * W;
      if (!s.cross) {
        if (s.i % 6 === 0 && has("lamp")) s.sprites.push({ key: "lamp", x: c.c + 220, w: 260 });
        if (s.i % 6 === 3 && s.road.kind === "expressway" && has("palm")) s.sprites.push({ key: "palm", x: 0, w: 420 });
        if (s.i % 9 === 4 && has("tree")) s.sprites.push({ key: "tree", x: -(edge + 600), w: 900 });
        if (s.i % 7 === 2 && has("tree3")) s.sprites.push({ key: "tree3", x: edge + 700, w: 820 });
        if (s.i % 23 === 11 && has("busstop")) s.sprites.push({ key: "busstop", x: c.c + 700, w: 900 });
        if (s.i % 31 === 17 && has("billboard0")) s.sprites.push({ key: `billboard${Math.floor(s.i / 31) % 3}`, x: edge + 1400, w: 1200 });
      }
    }
    // Buildings: each lot beside a leg, at its place along the road and on its side of it.
    for (const L of this.legs) {
      const horizontal = Math.abs(L.b.y - L.a.y) < 0.5;
      const dir = horizontal ? Math.sign(L.b.x - L.a.x) || 1 : Math.sign(L.b.y - L.a.y) || 1;
      for (const l of lots) {
        const key = lotKey(l);
        if (!has(key)) continue;
        const cx = l.x + l.w / 2;
        const cy = l.y + l.h / 2;
        const along = horizontal ? (cx - L.a.x) * dir : (cy - L.a.y) * dir;
        const length = (L.z1 - L.z0) / PX;
        if (along < 0 || along > length) continue;
        const across = horizontal ? cy - L.a.y : cx - L.a.x;
        // Your right-hand side: south when heading east, west when heading south.
        const right = horizontal ? Math.sign(across) * dir : -Math.sign(across) * dir;
        const off = Math.abs(across);
        if (off > L.road.median / 2 + L.road.lanes * LANE + SIDEWALK + 140) continue;
        const z = L.z0 + along * PX;
        const s = this.segs[Math.floor(z / SEG)];
        if (!s || s.cross) continue;
        s.sprites.push({ key, x: right * (off * W + 600), w: l.w * W * 1.15 });
      }
    }
  }

  private spawnTraffic() {
    const light = FLEET.filter((f) => !["firetruck", "mixer"].includes(f.kind));
    const r = new Phaser.Math.RandomDataGenerator([String(this.length)]);
    for (let z = SEG * 30; z < this.length; z += 2600 + r.between(0, 2400)) {
      const style = r.pick(light);
      const heavy = ["bus", "truck"].includes(style.kind);
      this.cars.push({ z, lane: heavy ? 9 : r.between(0, 2), speed: heavy ? 420 : 520 + r.between(0, 220), key: `${vehicleKey(style)}_back`, w: style.kind === "okada" ? 260 : heavy ? 620 : 520, oncoming: false });
    }
    for (let z = SEG * 20; z < this.length; z += 2000 + r.between(0, 2000)) {
      const style = r.pick(light);
      this.cars.push({ z, lane: r.between(0, 2), speed: -(600 + r.between(0, 300)), key: `${vehicleKey(style)}_front`, w: style.kind === "okada" ? 260 : ["bus", "truck"].includes(style.kind) ? 620 : 520, oncoming: true });
    }
  }

  /** The middle of your side of a road: the centre lane, or the one lane on a street. */
  private laneCentre(r: Road) {
    const c = carriage(r);
    return c.m + c.lane * (r.lanes > 1 ? 1.5 : 0.5);
  }

  /** World x of a car's lane on this stretch of road. */
  private laneX(car: Car, r: Road) {
    const c = carriage(r);
    const lane = Math.min(car.lane, r.lanes - 1);
    const x = c.m + c.lane * (lane + 0.5);
    return car.oncoming ? -x : x;
  }

  /** Your own car, or the public transport you're riding. */
  private myStyle(): VehicleStyle {
    return this.trip.ride ? RIDES[this.trip.ride].style : { kind: "car", color: CAR_COLOR };
  }

  /** As a passenger: the driver steers, keeps a steady speed and brakes for traffic. */
  private autopilot(dt: number) {
    const ride = RIDES[this.trip.ride!];
    const playerZ = CAM_H * DEPTH;
    const me = this.pos + playerZ;
    const seg = this.segAt(me);
    // Only a slower car close ahead, in the same lane, makes the driver brake.
    const ahead = this.cars.some((car) => !car.oncoming && car.z > me && car.z - me < 650 && car.speed < this.speed && Math.abs(this.laneX(car, this.segAt(car.z).road) - this.x) < 380);
    const drive = this.controls;
    drive.steer = 0;
    drive.reverse = false;
    drive.throttle = !ahead && this.speed < ride.cruise ? 1 : 0;
    drive.brake = ahead ? 0.4 : 0;
    // Okada riders change lanes for fun; everyone else holds their lane.
    if (this.trip.ride === "okada" && this.easeTo == null && Math.random() < dt * 0.4) {
      const c = carriage(seg.road);
      const lanes = Array.from({ length: seg.road.lanes }, (_, k) => c.m + c.lane * (k + 0.5));
      this.easeTo = lanes[Math.floor(Math.random() * lanes.length)]!;
    }
    if (ahead && this.trip.ride !== "bus" && this.easeTo == null && Math.random() < dt * 1.5) {
      const c = carriage(seg.road);
      const lanes = Array.from({ length: seg.road.lanes }, (_, k) => c.m + c.lane * (k + 0.5)).filter((l) => Math.abs(l - this.x) > c.lane * 0.5);
      if (lanes.length) this.easeTo = lanes[Math.floor(Math.random() * lanes.length)]!;
    }
  }

  private segAt(z: number) {
    return this.segs[Math.max(0, Math.min(this.segs.length - 1, Math.floor(z / SEG)))]!;
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const state = getState();
    const frozen = input.paused || Boolean(state?.event) || this.arrived;
    if (!frozen) this.step(dt);
    this.render();
    this.hud();
  }

  private step(dt: number) {
    if (driveInput.skip) {
      driveInput.skip = false;
      this.finish();
      return;
    }
    const k = this.keys;
    const kSteer = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const drive = this.controls;
    if (this.trip.ride) this.autopilot(dt);
    else {
      drive.steer = kSteer || driveInput.steer;
      drive.throttle = k.up.isDown || k.w.isDown ? 1 : driveInput.throttle;
      drive.brake = k.down.isDown || k.s.isDown ? 1 : driveInput.brake;
      drive.reverse = driveInput.reverse;
    }
    const playerZ = CAM_H * DEPTH;
    const seg = this.segAt(this.pos + playerZ);
    const c = carriage(seg.road);
    const pct = Math.abs(this.speed) / MAX;
    // Round a corner onto a road of a different width: ease into its lanes.
    if (seg.road !== this.lastRoad) {
      if (this.lastRoad && (this.x < c.m || this.x > c.c)) this.easeTo = this.laneCentre(seg.road);
      this.lastRoad = seg.road;
    }
    if (this.easeTo != null) {
      this.x += (this.easeTo - this.x) * Math.min(1, dt * 3);
      if (Math.abs(this.easeTo - this.x) < 10 || Math.abs(this.controls.steer) > 0) this.easeTo = null;
    }
    // Pedals: accelerate, brake, and reverse slowly in R.
    // Wet roads: ease off a little.
    const max = drive.reverse ? -240 : MAX * (this.weather.sky === "storm" ? 0.75 : this.weather.wet ? 0.85 : 1);
    if (this.rain) {
      this.rain.tilePositionY -= dt * 1100;
      this.rain.tilePositionX += dt * 200;
    }
    if (drive.throttle > 0) this.speed += (drive.reverse ? -300 : 420) * drive.throttle * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 160 * dt);
    if (drive.brake > 0) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 1400 * drive.brake * dt);
    // Off the tarmac (median, kerb or pavement) the car slows right down.
    const onRoad = (this.x > c.m - 80 && this.x < c.c + 80) || (this.x < -c.m + 80 && this.x > -c.c - 80) || (seg.road.median === 0 && Math.abs(this.x) < c.c + 80);
    const cap = onRoad ? max : Math.sign(max) * Math.min(Math.abs(max), 260);
    this.speed = drive.reverse ? Math.max(cap, Math.min(this.speed, 60)) : Math.min(cap, Math.max(-60, this.speed));
    // Steering: A / left steers left. Slow cars barely turn; fast ones turn quickly.
    this.x += drive.steer * dt * 2600 * Math.max(0.25, pct);
    // Hands off the wheel: the car settles into the nearest lane on your side of the road.
    if (!drive.steer && this.easeTo == null && this.speed > 60) {
      const lanes = Array.from({ length: seg.road.lanes }, (_, k) => c.m + c.lane * (k + 0.5));
      const target = lanes.reduce((best, l) => (Math.abs(l - this.x) < Math.abs(best - this.x) ? l : best), lanes[0]!);
      this.x += (target - this.x) * Math.min(1, dt * 1.2);
    }
    // A bend pulls you to the outside (a public-transport driver steers through it).
    if (!this.trip.ride) this.x -= seg.curve * pct * pct * dt * 450;
    this.x = Phaser.Math.Clamp(this.x, -c.c - SIDEWALK * W, c.c + SIDEWALK * W);
    this.pos = Phaser.Math.Clamp(this.pos + this.speed * dt, 0, this.length - playerZ - SEG);
    this.sky.tilePositionX += seg.curve * pct * 12 * dt * 60 * 0.1;
    this.hills.tilePositionX += seg.curve * pct * 12 * dt * 60 * 0.25;
    // Traffic moves on; bump into it and you slow right down.
    const me = this.pos + playerZ;
    for (const car of this.cars) {
      car.z += car.speed * dt;
      const cs = this.segAt(car.z);
      const cx = this.laneX(car, cs.road);
      if (Math.abs(car.z - me) < 260 && Math.abs(cx - this.x) < (car.w + 480) / 2) {
        if (this.time.now - this.bumpAt > 1500) {
          this.bumpAt = this.time.now;
          this.speed = car.oncoming ? 0 : Math.min(this.speed, car.speed * 0.6);
          this.cameras.main.shake(180, 0.008);
          bus.emit("driveBump", this.trip.ride ? "Your driver brakes hard and shouts at the car in front!" : car.oncoming ? "Wrong side of the road! Keep right." : "Bumped the car in front. Easy!");
        }
        if (!car.oncoming) car.z = me + 300;
      }
    }
    // FRSC flags you down at their checkpoint.
    if (this.frscZ != null && me > this.frscZ) {
      this.frscZ = null;
      frsc(true);
    }
    if (me >= this.length - SEG * 3) this.finish();
  }

  private finish() {
    if (this.arrived) return;
    this.arrived = true;
    this.label.setText(`📍 ${this.trip.name}`);
    this.time.delayedCall(700, () => bus.emit("driveDone", null));
  }

  private hud() {
    if (this.time.now - this.hudAt < 100) return;
    this.hudAt = this.time.now;
    const me = this.pos + CAM_H * DEPTH;
    const leg = this.legs.find((L) => me >= L.z0 && me < L.z1) ?? this.legs[this.legs.length - 1];
    const next = this.legs.find((L) => L.z0 > me);
    let at = this.trip.to;
    if (leg) {
      const t = Math.min(1, Math.max(0, (me - leg.z0) / Math.max(1, leg.z1 - leg.z0)));
      at = { x: leg.a.x + (leg.b.x - leg.a.x) * t, y: leg.a.y + (leg.b.y - leg.a.y) * t };
    }
    const turnLeg = leg && leg.turn ? leg : null;
    bus.emit("driveHud", {
      kmh: Math.round(Math.abs(this.speed) * KMH),
      left: Math.max(0, (this.length - me) / PX / 200),
      at,
      heading: leg ? { x: Math.sign(leg.b.x - leg.a.x), y: Math.sign(leg.b.y - leg.a.y) } : { x: 0, y: -1 },
      turn: turnLeg ? { dir: turnLeg.turn > 0 ? "right" : "left", road: next?.road.name || this.trip.name, metres: Math.max(0, Math.round((turnLeg.z1 - me) / PX / 0.2)) } : null,
      road: leg?.road.name ?? "",
      reverse: this.controls.reverse,
    });
  }

  private project(x: number, y: number, z: number, camX: number, camY: number, camZ: number) {
    const { width, height } = this.scale;
    const dz = Math.max(1, z - camZ);
    const s = DEPTH / dz;
    return { x: width / 2 + s * (x - camX) * (width / 2), y: height / 2 - s * (y - camY) * (height / 2), s };
  }

  private render() {
    const { width, height } = this.scale;
    const g = this.g;
    g.clear();
    this.used = 0;
    const base = this.segAt(this.pos);
    const pct = (this.pos % SEG) / SEG;
    const playerZ = CAM_H * DEPTH;
    const pseg = this.segAt(this.pos + playerZ);
    const ppct = ((this.pos + playerZ) % SEG) / SEG;
    const camY = CAM_H + pseg.y1 + (pseg.y2 - pseg.y1) * ppct;
    let maxy = height;
    let x = 0;
    let dx = -(base.curve * pct);
    const visible: Seg[] = [];
    for (let n = 0; n < DRAW; n++) {
      const s = this.segs[base.i + n];
      if (!s) break;
      const z1 = s.i * SEG;
      const z2 = z1 + SEG;
      const p1 = this.project(0, s.y1, z1, this.x - x, camY, this.pos);
      const p2 = this.project(0, s.y2, z2, this.x - x - dx, camY, this.pos);
      x += dx;
      dx += s.curve;
      s.clip = maxy;
      if (z1 - this.pos <= DEPTH * 10 || p2.y >= p1.y || p2.y >= maxy) continue;
      s.p = { x1: p1.x, y1: p1.y, w1: p1.s * (width / 2), x2: p2.x, y2: p2.y, w2: p2.s * (width / 2), s1: p1.s, s2: p2.s, z: z1 };
      this.drawSeg(g, s, width);
      maxy = p2.y;
      visible.push(s);
    }
    // Sprites and traffic, far to near.
    for (let k = visible.length - 1; k >= 0; k--) {
      const s = visible[k]!;
      for (const sp of s.sprites) this.sprite(sp.key, s, sp.x, sp.w, false);
      for (const car of this.cars) {
        if (car.z >= s.p.z && car.z < s.p.z + SEG && car.z > this.pos) this.sprite(car.key, s, this.laneX(car, s.road), car.w, true);
      }
    }
    for (let i = this.used; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
    // Your car: a little bob with speed, a lean into the steering.
    const bob = this.speed > 30 ? Math.sin(this.time.now / 60) * 1.5 : 0;
    this.me.setY(this.carY() + bob);
    this.me.setRotation(this.controls.steer * 0.04);
  }

  /** One slice of road: ground, pavements, kerbs, median and lanes, both carriageways. */
  private drawSeg(g: Phaser.GameObjects.Graphics, s: Seg, width: number) {
    const { x1, y1, w1, x2, y2, w2 } = s.p;
    const alt = Math.floor(s.i / 2) % 2;
    const ground = C.ground[["dirt", "grass", "paved", "lawn"][s.ground] ?? "grass"]!;
    g.fillStyle(ground[alt]!, 1).fillRect(0, y2 - 1, width, y1 - y2 + 2);
    // A band across the road between offsets a and b (world units from the centre line).
    const band = (a: number, b: number, color: number) => {
      const ax1 = x1 + a * w1;
      const bx1 = x1 + b * w1;
      const ax2 = x2 + a * w2;
      const bx2 = x2 + b * w2;
      // A pixel of overlap with the next slice, so no seams show between them.
      g.fillStyle(color, 1);
      g.fillTriangle(ax1, y1 + 1, bx1, y1 + 1, bx2, y2 - 1);
      g.fillTriangle(ax1, y1 + 1, bx2, y2 - 1, ax2, y2 - 1);
    };
    const c = carriage(s.road);
    const walk = SIDEWALK * W;
    if (s.cross) {
      // A junction: the crossing road runs off to both sides, with a zebra crossing where you enter and leave it.
      band(-c.c - walk - 9000, c.c + walk + 9000, C.asphalt[0]!);
      const edge = !this.segs[s.i - 1]?.cross || !this.segs[s.i + 1]?.cross;
      if (edge) for (let k = -c.c; k < c.c; k += 260) band(k, k + 130, C.line);
      return;
    }
    for (const side of [-1, 1]) {
      band(side * c.c, side * (c.c + walk), C.walk[alt]!);
      band(side * c.c, side * (c.c + 90), C.kerb[alt]!);
    }
    band(-c.c, c.c, C.asphalt[alt]!);
    if (c.m > 0) {
      band(-c.m, c.m, s.road.kind === "expressway" ? C.grass[alt]! : C.concrete[alt]!);
      for (const side of [-1, 1]) band(side * (c.m + 30), side * (c.m + 70), C.yellow);
    } else if (alt) band(-25, 25, C.line);
    // Lane lines, dashed, and a solid edge line by each kerb.
    if (alt) for (let k = 1; k < s.road.lanes; k++) for (const side of [-1, 1]) band(side * (c.m + c.lane * k) - 22, side * (c.m + c.lane * k) + 22, C.line);
    for (const side of [-1, 1]) band(side * (c.c - 110), side * (c.c - 80), C.line);
  }

  /** Draw a sprite standing on a segment, `x` world units from the centre line, `w` wide. */
  private sprite(key: string, s: Seg, x: number, w: number, vehicle: boolean) {
    if (!this.textures.exists(key)) return;
    let img = this.pool[this.used];
    if (!img) {
      img = this.add.image(0, 0, key).setOrigin(0.5, 1);
      this.pool.push(img);
    }
    this.used++;
    if (img.texture.key !== key) img.setTexture(key);
    const sx = s.p.x1 + x * s.p.w1;
    const dw = w * s.p.w1;
    if (dw < 1.5 || dw > this.scale.width * 3) return void img.setVisible(false);
    img.setVisible(true).setPosition(sx, s.p.y1).setScale(dw / img.width).setDepth(10 + (DRAW - (s.i - this.segAt(this.pos).i)) + (vehicle ? 0.5 : 0));
    if (this.nightTint) img.setTint(this.nightTint);
    else img.clearTint();
    // Hidden behind the brow of a hill.
    const top = s.p.y1 - img.displayHeight;
    if (top > s.clip) img.setVisible(false);
  }
}

