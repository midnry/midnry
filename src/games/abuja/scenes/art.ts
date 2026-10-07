import { GAME_FONT } from "../ui/theme";
import * as Phaser from "phaser";
import { characterParts, dims, lookKey, type LifeStage, type Look } from "../systems/character";
import { furnitureSvg } from "../systems/furniture";
import { building as buildingDef } from "../systems/city/catalog";
import { buildingArt } from "../systems/city/buildingArt";
import { lotLabel, type Lot } from "../systems/city/layout";
import { FLEET, vehicleBox, vehicleKey, vehicleSvg, vehicleSvgLeft, type VehicleKind, type VehicleStyle, type VehicleView } from "../systems/vehicles";

// Cartoon art drawn in code: bold dark outlines, flat colours, one shade.
// Every look is a texture key, so real sprite sheets can replace any of them
// later by loading images with the same keys before the world is built.

export const INK = 0x141414;
const LINE = 4;

export const hex = (value: string) => Phaser.Display.Color.HexStringToColor(value).color;

function shade(color: number, amount: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * amount)));
  return Phaser.Display.Color.GetColor(f(c.red), f(c.green), f(c.blue));
}

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Deterministic noise for tiles and prop placement. */
export function rand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Ground tiles (64×64, seamless enough at this scale) ─────────────────────

const TILES: Record<string, { base: number; dots: number[]; kind: "grass" | "dirt" | "grid" | "noise" | "water" | "planks" }> = {
  grass: { base: 0x5fae45, dots: [0x4f9a37, 0x72c254, 0x8bd16a], kind: "grass" },
  lawn: { base: 0x4fa64a, dots: [0x5cb956, 0x45943f], kind: "grass" },
  dirt: { base: 0xb98656, dots: [0xa77446, 0xc9996a, 0x8f6239], kind: "dirt" },
  sand: { base: 0xe2c48a, dots: [0xd4b277, 0xeed6a5], kind: "dirt" },
  pavement: { base: 0xc9c2b6, dots: [0xb7afa2], kind: "grid" },
  plaza: { base: 0xdcd3c3, dots: [0xcbc1af], kind: "grid" },
  floor: { base: 0xd8cdb8, dots: [0xc7bba4], kind: "grid" },
  asphalt: { base: 0x3d3b40, dots: [0x47454b, 0x343236], kind: "noise" },
  water: { base: 0x3a8fd1, dots: [0x5aa7e0, 0x2f7bb8], kind: "water" },
  wood: { base: 0xb98154, dots: [0x9c6a42, 0xc99267], kind: "planks" },
  carpet: { base: 0x9f1d2b, dots: [0xb4283a, 0x8a1724], kind: "noise" },
  concrete: { base: 0xb9b1a3, dots: [0xa79f90, 0xc9c2b5, 0x968e80], kind: "dirt" },
};

export function tileKey(name: string) {
  return `tile_${name}`;
}

function makeTiles(scene: Phaser.Scene) {
  for (const [name, t] of Object.entries(TILES)) {
    make(scene, tileKey(name), 64, 64, (g) => {
      g.fillStyle(t.base, 1).fillRect(0, 0, 64, 64);
      const r = rand(name.length * 977 + t.base);
      if (t.kind === "grass") {
        for (let i = 0; i < 26; i += 1) {
          g.fillStyle(t.dots[i % t.dots.length]!, 1);
          const x = r() * 60;
          const y = r() * 60;
          g.fillTriangle(x, y + 6, x + 2, y, x + 4, y + 6);
        }
      } else if (t.kind === "dirt") {
        for (let i = 0; i < 18; i += 1) {
          g.fillStyle(t.dots[i % t.dots.length]!, 1).fillCircle(r() * 64, r() * 64, 1 + r() * 2.2);
        }
      } else if (t.kind === "grid") {
        g.lineStyle(2, t.dots[0]!, 1).strokeRect(1, 1, 31, 31).strokeRect(33, 1, 30, 31).strokeRect(1, 33, 31, 30).strokeRect(33, 33, 30, 30);
      } else if (t.kind === "planks") {
        for (let y = 0; y < 64; y += 16) {
          g.fillStyle(t.dots[(y / 16) % 2]!, 0.55).fillRect(0, y, 64, 15);
          g.lineStyle(2, 0x6b4426, 0.8).lineBetween(0, y, 64, y);
          const off = (y / 16) % 2 ? 20 : 44;
          g.lineBetween(off, y, off, y + 16);
        }
      } else if (t.kind === "noise") {
        for (let i = 0; i < 40; i += 1) g.fillStyle(t.dots[i % t.dots.length]!, 1).fillRect(r() * 64, r() * 64, 2, 2);
      } else {
        g.lineStyle(2, t.dots[0]!, 0.8);
        for (let i = 0; i < 4; i += 1) {
          const x = r() * 50;
          const y = r() * 56;
          g.beginPath().moveTo(x, y).lineTo(x + 6, y - 2).lineTo(x + 12, y).strokePath();
        }
      }
    });
  }
}

// ── Characters: people drawn as SVG parts (systems/character.ts) ───────────

/** Texture pixels per drawing unit: crisp on phones without wasting memory. */
const RES = 1.5;

function makeShadow(scene: Phaser.Scene) {
  make(scene, "shadow", 48, 14, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(24, 7, 46, 12);
  });
}

// ── Vehicles (drawn as SVG in systems/vehicles.ts) ──────────────────────────

const VRES = 1.8;
/** Pixels per drawing unit on the map: a car is a bit longer than two people are tall. */
export const VEHICLE_SCALE: Record<VehicleKind, number> = { car: 0.4, taxi: 0.4, okada: 0.36, keke: 0.38, bus: 0.44, truck: 0.44, van: 0.4, ambulance: 0.41, police: 0.4, firetruck: 0.45, mixer: 0.44 };

/** Queue every vehicle texture (call from preload). */
export function queueVehicles(scene: Phaser.Scene) {
  const urls: string[] = [];
  for (const v of FLEET) {
    for (const view of ["side", "front", "back"] as const) {
      const key = `${vehicleKey(v)}_${view}`;
      if (scene.textures.exists(key)) continue;
      const url = URL.createObjectURL(new Blob([vehicleSvg(v.kind, v.color, view, VRES)], { type: "image/svg+xml" }));
      urls.push(url);
      scene.load.svg(key, url);
    }
    const left = vehicleSvgLeft(v.kind, v.color, VRES);
    const key = `${vehicleKey(v)}_sideL`;
    if (left && !scene.textures.exists(key)) {
      const url = URL.createObjectURL(new Blob([left], { type: "image/svg+xml" }));
      urls.push(url);
      scene.load.svg(key, url);
    }
  }
  if (urls.length) scene.load.once("complete", () => urls.forEach((url) => URL.revokeObjectURL(url)));
}

export type Vehicle = Phaser.GameObjects.Image & { style: VehicleStyle; view: VehicleView };

export function vehicle(scene: Phaser.Scene, x: number, y: number, style: VehicleStyle): Vehicle {
  const v = scene.add.image(x, y, `${vehicleKey(style)}_side`).setScale(VEHICLE_SCALE[style.kind] / VRES) as Vehicle;
  v.style = style;
  v.view = "front";
  faceVehicle(v, 1, 0);
  return v;
}

/** Show the side that faces the viewer: side on when driving across, front or back when driving down or up. */
export function faceVehicle(v: Vehicle, dx: number, dy: number) {
  const view: VehicleView = Math.abs(dx) >= Math.abs(dy) ? "side" : dy > 0 ? "front" : "back";
  // Facing left: a mirrored drawing, unless it has writing on it that would read backwards.
  const left = view === "side" && dx < 0;
  const key = `${vehicleKey(v.style)}_${view}`;
  const lettered = left && v.scene.textures.exists(`${key}L`);
  const texture = lettered ? `${key}L` : key;
  if (view !== v.view || v.texture.key !== texture) {
    v.view = view;
    v.setTexture(texture).setOrigin(0.5, vehicleBox(v.style.kind, view).groundY);
  }
  v.setFlipX(left && !lettered);
}

/** Who to draw: a look and a body (a grown-up, a kid, or a life stage). */
export type Person = { look: Look; adult: boolean; stage?: LifeStage };

const bodyOf = (p: Person): LifeStage => p.stage ?? (p.adult ? "adult" : "child");

/** Queue furniture textures for a room (call from preload). */
export function queueFurniture(scene: Phaser.Scene, items: { id: string; accent?: string }[]) {
  const urls: string[] = [];
  const queued = new Set<string>();
  for (const it of items) {
    const key = furnitureKey(it.id, it.accent);
    if (scene.textures.exists(key) || queued.has(key)) continue;
    queued.add(key);
    const url = URL.createObjectURL(new Blob([furnitureSvg(it.id, it.accent ?? "#1f6fd1", 1.6)], { type: "image/svg+xml" }));
    urls.push(url);
    scene.load.svg(key, url);
  }
  if (urls.length) scene.load.once("complete", () => urls.forEach((url) => URL.revokeObjectURL(url)));
}

export const furnitureKey = (id: string, accent?: string) => `furn_${id}_${(accent ?? "#1f6fd1").slice(1)}`;

// Grown-ups and teens are teen/young/adult/senior bodies of the same build, so they share textures where the shape is the same.
const bodyKey = (stage: LifeStage) => (stage === "child" ? "c" : stage === "teen" ? "t" : "a");
const charKey = (p: Person) => `ch_${lookKey(p.look)}${bodyKey(bodyOf(p))}`;
const PARTS = ["front", "back", "side", "arm", "leg", "legSide"] as const;

/** Queue the textures for these people in the scene's loader (call from preload). */
export function queueCharacters(scene: Phaser.Scene, people: Person[]) {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const person of people) {
    const key = charKey(person);
    if (seen.has(key) || scene.textures.exists(`${key}_front`)) continue;
    seen.add(key);
    const parts = characterParts(person.look, bodyOf(person), RES);
    for (const part of PARTS) {
      const url = URL.createObjectURL(new Blob([parts[part]], { type: "image/svg+xml" }));
      urls.push(url);
      scene.load.svg(`${key}_${part}`, url);
    }
  }
  if (urls.length) scene.load.once("complete", () => urls.forEach((url) => URL.revokeObjectURL(url)));
}

/** Add people after loading (a crowd that grows as you explore): textures arrive, then `ready` runs. */
/** Whether a person's textures are loaded yet. */
export const characterReady = (scene: Phaser.Scene, p: Person) => scene.textures.exists(`${charKey(p)}_front`);

export function loadCharacters(scene: Phaser.Scene, people: Person[], ready: () => void) {
  const missing = people.filter((p) => !scene.textures.exists(`${charKey(p)}_front`));
  if (!missing.length) return ready();
  queueCharacters(scene, missing);
  scene.load.once("complete", ready);
  scene.load.start();
}

type Facing = "front" | "back" | "side";

/** What a person is doing, for the animation. */
export type Motion = "idle" | "walk" | "run" | "jump" | "sit" | "wave" | "celebrate" | "interact" | "enter" | "exit";

export type Figure = Phaser.GameObjects.Container & {
  rig: Phaser.GameObjects.Container;
  legs: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  arms: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  armBack: Phaser.GameObjects.Image;
  upper: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  /** Height of the top of the head above the figure's position, in pixels (negative). */
  headTop: number;
  key: string;
  facing: Facing;
  dims: ReturnType<typeof dims>;
  unit: number;
  rigY: number;
  /** A one-off or held pose (waving, sitting…) that overrides walking until `until`. */
  action: { motion: Motion; started: number; until: number } | null;
};

const FEET = 10; // feet sit this many pixels below the figure's position
/** New bodies are drawn taller (natural proportions); this keeps people the same size on screen. */
const NORM = 0.72;

/** A person. `unit` is pixels per drawing unit: about 0.2 for people, smaller for crowds. */
export function figure(scene: Phaser.Scene, x: number, y: number, person: Person, opts: { name?: string; nameColor?: string; unit?: number } = {}): Figure {
  const unit = (opts.unit ?? 0.2) * NORM;
  const key = charKey(person);
  const d = dims(person.look, bodyOf(person));
  const img = (part: string, ox: number, oy: number) => scene.add.image(0, 0, `${key}_${part}`).setOrigin(ox, oy).setScale(1 / RES);
  const armBack = img("arm", 0.5, 4 / (d.armH + 4)).setTint(0xb8b8b8).setVisible(false);
  const legA = img("leg", 0.5, 0);
  const legB = img("leg", 0.5, 0);
  const upper = img("front", 0, 0).setPosition(-d.width / 2, d.torsoTop - d.hipY);
  const armA = img("arm", 0.5, 4 / (d.armH + 4));
  const armB = img("arm", 0.5, 4 / (d.armH + 4)).setFlipX(true);
  const rigY = FEET - d.legLen * unit;
  const rig = scene.add.container(0, rigY, [armBack, legA, legB, upper, armA, armB]).setScale(unit);
  const headTop = rigY + (d.headTop - d.hipY) * unit;
  const shadow = scene.add.image(0, FEET - 2, "shadow").setScale(unit * 2.4, unit * 2.2);
  const items: Phaser.GameObjects.GameObject[] = [shadow, rig];
  if (opts.name) {
    items.push(
      scene.add
        .text(0, headTop - 10, opts.name, {
          fontFamily: GAME_FONT,
          fontSize: "12px",
          fontStyle: "bold",
          color: opts.nameColor ?? "#ffffff",
          stroke: "#0b1726",
          strokeThickness: 4,
        })
        .setResolution(2)
        .setOrigin(0.5),
    );
  }
  const c = scene.add.container(x, y, items) as Figure;
  Object.assign(c, { rig, legs: [legA, legB], arms: [armA, armB], armBack, upper, shadow, headTop, key, dims: d, unit, rigY, action: null, facing: "side" });
  setFacing(c, "front");
  return c;
}

function setFacing(f: Figure, facing: Facing) {
  if (f.facing === facing) return;
  f.facing = facing;
  f.upper.setTexture(`${f.key}_${facing}`);
  const [a, b] = f.legs;
  const [la, ra] = f.arms;
  const d = f.dims;
  // Hips and shoulders, relative to the rig's origin (the middle of the hips).
  if (facing === "side") {
    a.setTexture(`${f.key}_legSide`).setPosition(-3, 0).setTint(0xcfcfcf);
    b.setTexture(`${f.key}_legSide`).setPosition(2, 0).clearTint();
    f.armBack.setVisible(true).setPosition(3, d.shoulderY - d.hipY);
    la.setVisible(false);
    ra.setVisible(true).setFlipX(false).setPosition(-1, d.shoulderY - d.hipY);
  } else {
    a.setTexture(`${f.key}_leg`).setFlipX(false).setPosition(-d.legX, 0).clearTint();
    b.setTexture(`${f.key}_leg`).setFlipX(true).setPosition(d.legX, 0).clearTint();
    f.armBack.setVisible(false);
    la.setVisible(true).setFlipX(facing === "back").setPosition(-d.shoulderX, d.shoulderY - d.hipY);
    ra.setVisible(true).setFlipX(facing !== "back").setPosition(d.shoulderX, d.shoulderY - d.hipY);
    f.rig.scaleX = Math.abs(f.rig.scaleX);
  }
}

/** Start a pose: `ms` long, or held (`hold`) until another pose or movement replaces it. */
export function pose(f: Figure, motion: Motion, time: number, ms = 1200) {
  f.action = { motion, started: time, until: time + ms };
  if (motion === "wave" || motion === "celebrate" || motion === "interact") {
    if (f.facing === "back") setFacing(f, "front");
  }
}

export function clearPose(f: Figure) {
  f.action = null;
}

/** Walk (or run, or stand) and face the way you're going; poses play on top. */
export function animateWalk(f: Figure, time: number, moving: boolean, dx: number, dy = 0, running = false) {
  if (moving) {
    if (f.action && f.action.motion !== "jump") f.action = null;
    if (Math.abs(dx) > 0.1 && Math.abs(dx) >= Math.abs(dy) * 0.8) setFacing(f, "side");
    else if (dy < -0.1) setFacing(f, "back");
    else if (dy > 0.1) setFacing(f, "front");
    if (f.facing === "side") {
      const sx = Math.abs(f.rig.scaleX);
      f.rig.scaleX = dx < 0 ? -sx : sx;
    }
  }
  if (f.action && time > f.action.until) f.action = null;
  const motion: Motion = f.action?.motion ?? (moving ? (running ? "run" : "walk") : "idle");
  animate(f, time, motion);
}

/** Set every part for a motion at this moment. Cheap: a handful of numbers per person per frame. */
function animate(f: Figure, time: number, motion: Motion) {
  const [a, b] = f.legs;
  const [la, ra] = f.arms;
  const d = f.dims;
  const side = f.facing === "side";
  const torsoY = d.torsoTop - d.hipY;
  const reset = () => {
    a.rotation = b.rotation = la.rotation = ra.rotation = f.armBack.rotation = 0;
    a.y = b.y = 0;
    a.scaleY = b.scaleY = 1 / RES;
    f.rig.rotation = 0;
    f.rig.y = f.rigY;
    f.upper.y = torsoY;
    f.alpha = 1;
    f.shadow.setScale(f.unit * 2.4, f.unit * 2.2);
  };
  reset();
  const t = (time - (f.action?.started ?? 0)) / 1000;
  switch (motion) {
    case "idle": {
      // Breathing.
      const br = Math.sin(time / 520) * 1.2;
      f.upper.y = torsoY + br;
      la.y = ra.y = d.shoulderY - d.hipY + br;
      la.rotation = side ? 0 : 0.04;
      ra.rotation = side ? 0 : -0.04;
      if (side) f.armBack.y = la.y;
      return;
    }
    case "walk":
    case "run":
    case "enter":
    case "exit": {
      const run = motion === "run";
      const ph = time / (run ? 62 : 92);
      const swing = Math.sin(ph);
      const bob = Math.abs(Math.sin(ph)) * (run ? 6 : 3.5);
      if (side) {
        a.rotation = swing * (run ? 0.75 : 0.45);
        b.rotation = -swing * (run ? 0.75 : 0.45);
        ra.rotation = swing * (run ? 0.9 : 0.4);
        f.armBack.rotation = -swing * (run ? 0.9 : 0.4);
        f.rig.rotation = run ? 0.12 * Math.sign(f.rig.scaleX || 1) : 0;
      } else {
        a.y = Math.min(0, swing * (run ? 10 : 6));
        b.y = Math.min(0, -swing * (run ? 10 : 6));
        la.rotation = swing * (run ? 0.35 : 0.18);
        ra.rotation = swing * (run ? 0.35 : 0.18);
      }
      f.upper.y = torsoY - bob;
      la.y = ra.y = d.shoulderY - d.hipY - bob;
      if (side) f.armBack.y = la.y;
      // Going in or out of a door: fade.
      if (motion === "enter") f.alpha = Math.max(0, 1 - t * 1.6);
      if (motion === "exit") f.alpha = Math.min(1, t * 1.6);
      return;
    }
    case "jump": {
      const dur = 0.55;
      const k = Math.min(1, t / dur);
      const h = Math.sin(k * Math.PI) * 26;
      f.rig.y = f.rigY - h;
      f.shadow.setScale(f.unit * 2.4 * (1 - h / 60), f.unit * 2.2 * (1 - h / 60));
      a.rotation = side ? 0.5 : 0.18;
      b.rotation = side ? -0.3 : -0.18;
      la.rotation = side ? 0 : 2.6;
      ra.rotation = side ? -2.4 : -2.6;
      return;
    }
    case "sit": {
      if (side) {
        a.rotation = b.rotation = -1.5;
        f.rig.y = f.rigY + (d.legLen - 14) * f.unit;
        ra.rotation = -0.5;
        f.armBack.rotation = -0.3;
      } else {
        a.scaleY = b.scaleY = 0.5 / RES;
        f.rig.y = f.rigY + d.legLen * 0.5 * f.unit;
        la.rotation = 0.25;
        ra.rotation = -0.25;
      }
      return;
    }
    case "wave": {
      const w = Math.sin(time / 120) * 0.35;
      if (side) ra.rotation = -2.5 + w;
      else {
        ra.rotation = -2.5 + w;
        la.rotation = 0.05;
      }
      return;
    }
    case "celebrate": {
      const hop = Math.abs(Math.sin(t * 7)) * 12;
      f.rig.y = f.rigY - hop;
      const w = Math.sin(time / 90) * 0.2;
      if (side) {
        ra.rotation = -2.8 + w;
        f.armBack.rotation = -2.6 - w;
      } else {
        la.rotation = 2.7 + w;
        ra.rotation = -2.7 - w;
      }
      return;
    }
    case "interact": {
      // Reaching out to a counter, a door, a hand.
      const reach = Math.min(1, t * 4);
      if (side) ra.rotation = -1.35 * reach;
      else ra.rotation = -0.9 * reach;
      f.upper.y = torsoY + reach * 2;
      return;
    }
  }
}

// ── City buildings (systems/city): one texture per look, plus its lit windows ─

const BRES = 1.5;

/** The texture for a lot's building: lots that look alike share one. */
export const lotKey = (l: Lot) => `bld_${l.def}_${l.w}x${l.h}_${l.floors}_${l.palette}_${l.seed % 3}${lotLabel(l) ? `_${lotLabel(l)!.replace(/\W/g, "")}` : ""}`;

function lotArt(l: Lot) {
  const def = buildingDef(l.def)!;
  const [wall, trim] = def.palette[l.palette % def.palette.length]!;
  return buildingArt(def.art, { w: l.w, h: l.h, floors: l.floors, wall, trim, seed: l.seed % 3, label: lotLabel(l) });
}

/** Queue every building texture for these lots (call from preload). */
export function queueBuildings(scene: Phaser.Scene, lots: Lot[]) {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const l of lots) {
    const key = lotKey(l);
    if (seen.has(key) || scene.textures.exists(key)) continue;
    seen.add(key);
    const art = lotArt(l);
    const scaled = (svg: string) => svg.replace(/width="([\d.]+)" height="([\d.]+)"/, (_m, w, h) => `width="${Math.round(Number(w) * BRES)}" height="${Math.round(Number(h) * BRES)}"`);
    for (const [k, svg] of [[key, art.svg], [`${key}_lit`, art.lights]] as const) {
      if (!svg) continue;
      const url = URL.createObjectURL(new Blob([scaled(svg)], { type: "image/svg+xml" }));
      urls.push(url);
      scene.load.svg(k, url);
    }
  }
  if (urls.length) scene.load.once("complete", () => urls.forEach((url) => URL.revokeObjectURL(url)));
}

/** Put a lot's building on the map. Returns the building and its night lights. */
export function placeBuilding(scene: Phaser.Scene, l: Lot) {
  const key = lotKey(l);
  const base = l.y + l.h;
  // Parks and farms are ground you walk on; buildings sort by where they meet the ground.
  const depth = l.solid ? 5 + base / 10000 : 3;
  const img = scene.add.image(l.x, base, key).setOrigin(0, 1).setScale(1 / BRES).setDepth(depth);
  const lit = scene.textures.exists(`${key}_lit`) ? scene.add.image(l.x, base, `${key}_lit`).setOrigin(0, 1).setScale(1 / BRES).setDepth(depth + 0.00001).setAlpha(0) : null;
  return { img, lit, top: base - img.displayHeight };
}

// ── Props ───────────────────────────────────────────────────────────────────

function makeProps(scene: Phaser.Scene) {
  // Leafy trees after the city sheet: dark outline, three greens, a branching trunk and a grass tuft.
  const canopy = (g: Phaser.GameObjects.Graphics, blobs: [number, number, number][]) => {
    g.fillStyle(INK, 1);
    for (const [x, y, r] of blobs) g.fillCircle(x, y, r + 3);
    g.fillStyle(0x1e5631, 1);
    for (const [x, y, r] of blobs) g.fillCircle(x, y, r);
    g.fillStyle(0x2e7d32, 1);
    for (const [x, y, r] of blobs) g.fillCircle(x - r * 0.18, y - r * 0.2, r * 0.74);
    g.fillStyle(0x4caf50, 1);
    for (const [x, y, r] of blobs) g.fillCircle(x - r * 0.35, y - r * 0.38, r * 0.34);
  };
  const trunk = (g: Phaser.GameObjects.Graphics, cx: number, top: number, base: number, w: number) => {
    g.fillStyle(0x000000, 0.22).fillEllipse(cx, base + 4, w * 7, 12);
    g.fillStyle(0x5d3a1a, 1);
    g.fillPoints([{ x: cx - w, y: base + 2 }, { x: cx - w * 0.45, y: top }, { x: cx + w * 0.45, y: top }, { x: cx + w, y: base + 2 }], true);
    g.lineStyle(3, INK, 1).strokePoints([{ x: cx - w, y: base + 2 }, { x: cx - w * 0.45, y: top }, { x: cx + w * 0.45, y: top }, { x: cx + w, y: base + 2 }], true);
    g.lineStyle(5, INK, 1).lineBetween(cx - 2, top + 14, cx - w * 2.2, top - 4).lineBetween(cx + 2, top + 10, cx + w * 2.4, top - 6);
    g.lineStyle(3, 0x5d3a1a, 1).lineBetween(cx - 2, top + 14, cx - w * 2.2, top - 4).lineBetween(cx + 2, top + 10, cx + w * 2.4, top - 6);
    g.fillStyle(0x3f9b3a, 1);
    for (let i = -3; i <= 3; i += 1) g.fillTriangle(cx + i * 6 - 3, base + 4, cx + i * 6, base - 6 - (i % 2 ? 0 : 4), cx + i * 6 + 3, base + 4);
  };
  make(scene, "tree", 100, 118, (g) => {
    trunk(g, 50, 62, 108, 7);
    canopy(g, [[50, 40, 27], [28, 52, 19], [72, 52, 19], [35, 28, 17], [65, 28, 17], [50, 62, 16], [20, 38, 11], [80, 38, 11]]);
  });
  make(scene, "tree2", 84, 132, (g) => {
    trunk(g, 42, 72, 122, 6);
    canopy(g, [[42, 34, 18], [31, 50, 16], [54, 48, 16], [42, 64, 15], [36, 20, 12], [50, 18, 11], [42, 8, 8]]);
  });
  make(scene, "tree3", 90, 96, (g) => {
    trunk(g, 45, 58, 86, 6);
    canopy(g, [[45, 40, 22], [26, 46, 15], [64, 46, 15], [45, 22, 16], [32, 28, 12], [58, 28, 12]]);
  });
  make(scene, "trafficlight", 26, 78, (g) => {
    g.fillStyle(0x000000, 0.2).fillEllipse(13, 74, 18, 6);
    g.fillStyle(0x8b2e1d, 1).fillRect(7, 62, 12, 12);
    g.lineStyle(2, INK, 1).strokeRect(7, 62, 12, 12);
    g.fillStyle(0x374151, 1).fillRect(11, 30, 4, 32);
    g.fillStyle(0x1f2937, 1).fillRoundedRect(3, 2, 20, 34, 5);
    g.lineStyle(2.5, INK, 1).strokeRoundedRect(3, 2, 20, 34, 5).strokeRect(11, 30, 4, 32);
    g.fillStyle(0x4b5563, 1).fillCircle(13, 10, 4.5).fillCircle(13, 19, 4.5).fillCircle(13, 28, 4.5);
  });
  // The lit lamp of a traffic light, tinted red, amber or green.
  make(scene, "signal", 12, 12, (g) => {
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 4.5);
  });
  make(scene, "palm", 72, 84, (g) => {
    g.fillStyle(0x000000, 0.22).fillEllipse(36, 76, 40, 12);
    g.fillStyle(0x8b5a2b, 1).fillRoundedRect(32, 36, 8, 40, 3);
    g.lineStyle(3, INK, 1).strokeRoundedRect(32, 36, 8, 40, 3);
    g.fillStyle(0x3f9b3a, 1);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      g.fillEllipse(36 + Math.cos(a) * 16, 30 + Math.sin(a) * 10, 30, 12);
    }
    g.fillStyle(0x8b5a2b, 1).fillCircle(36, 31, 6);
  });
  make(scene, "bush", 40, 28, (g) => {
    g.fillStyle(0x3e9a43, 1).fillCircle(12, 16, 10).fillCircle(28, 16, 10).fillCircle(20, 10, 10);
    g.lineStyle(3, INK, 1).strokeCircle(12, 16, 10).strokeCircle(28, 16, 10).strokeCircle(20, 10, 10);
    g.fillStyle(0x3e9a43, 1).fillCircle(20, 15, 10);
    g.fillStyle(0xf472b6, 1).fillCircle(14, 12, 2.5).fillCircle(26, 18, 2.5);
  });
  make(scene, "lamp", 24, 70, (g) => {
    g.fillStyle(0x000000, 0.2).fillEllipse(12, 66, 18, 6);
    g.fillStyle(0x4b5563, 1).fillRect(10, 14, 4, 52);
    g.fillStyle(0x9ca3af, 1).fillRoundedRect(3, 4, 18, 10, 4);
    g.fillStyle(0xfff7c2, 1).fillRect(6, 12, 12, 3);
    g.lineStyle(2, INK, 1).strokeRect(10, 14, 4, 52).strokeRoundedRect(3, 4, 18, 10, 4);
  });
  make(scene, "glow", 128, 128, (g) => {
    for (let r = 64; r > 0; r -= 8) g.fillStyle(0xffe9a3, 0.05).fillCircle(64, 64, r);
  });
  make(scene, "kiosk", 60, 60, (g) => {
    g.fillStyle(0x000000, 0.22).fillEllipse(30, 54, 50, 10);
    g.fillStyle(0x8b5a2b, 1).fillRect(12, 34, 36, 18);
    g.lineStyle(3, INK, 1).strokeRect(12, 34, 36, 18);
    g.fillStyle(0xef4444, 1).fillTriangle(30, 6, 4, 30, 56, 30);
    g.fillStyle(0xffffff, 1).fillTriangle(30, 6, 17, 30, 30, 30).fillTriangle(30, 6, 43, 30, 56, 30);
    g.lineStyle(3, INK, 1).strokeTriangle(30, 6, 4, 30, 56, 30);
  });
  make(scene, "tank", 30, 34, (g) => {
    g.fillStyle(INK, 1).fillRoundedRect(4, 4, 22, 26, 8);
    g.fillStyle(0x374151, 1).fillRoundedRect(7, 6, 8, 20, 4);
  });
  make(scene, "generator", 30, 24, (g) => {
    g.fillStyle(0xf59e0b, 1).fillRoundedRect(3, 4, 24, 16, 4);
    g.fillStyle(INK, 1).fillRect(7, 8, 8, 8);
    g.lineStyle(3, INK, 1).strokeRoundedRect(3, 4, 24, 16, 4);
  });
  make(scene, "flowers", 32, 20, (g) => {
    g.fillStyle(0x3e9a43, 1).fillRoundedRect(2, 8, 28, 10, 5);
    const colors = [0xf472b6, 0xfacc15, 0xffffff, 0xf87171];
    for (let i = 0; i < 6; i += 1) g.fillStyle(colors[i % 4]!, 1).fillCircle(5 + i * 4.5, 9 + (i % 2) * 4, 2.4);
    g.lineStyle(2, INK, 1).strokeRoundedRect(2, 8, 28, 10, 5);
  });
  make(scene, "barrier", 56, 18, (g) => {
    g.fillStyle(0xffffff, 1).fillRoundedRect(2, 4, 52, 10, 3);
    g.fillStyle(0xef4444, 1);
    for (let x = 6; x < 52; x += 14) g.fillRect(x, 4, 7, 10);
    g.lineStyle(3, INK, 1).strokeRoundedRect(2, 4, 52, 10, 3);
  });
  make(scene, "boat", 44, 22, (g) => {
    g.fillStyle(0xffffff, 1).fillEllipse(22, 11, 40, 16);
    g.fillStyle(0xef4444, 1).fillEllipse(22, 11, 24, 8);
    g.lineStyle(3, INK, 1).strokeEllipse(22, 11, 40, 16);
  });
}

export function makeArt(scene: Phaser.Scene) {
  makeTiles(scene);
  makeShadow(scene);
  makeProps(scene);
}

// ── Buildings (drawn per building, 2.5D: roof, front wall, door, windows) ───

export type BuildingOpts = { style?: "house" | "tower"; lights?: Phaser.GameObjects.Graphics; tall?: number };

/** Draws one building and returns it with the area its front covers (for fading when you walk behind it). */
export function building(
  scene: Phaser.Scene,
  s: { x: number; y: number; w: number; h: number; color?: string; label?: string },
  seed: number,
  opts: BuildingOpts = {},
): { g: Phaser.GameObjects.Graphics; face: { x: number; y: number; w: number; h: number } } {
  const g = scene.add.graphics();
  const r = rand(seed + 11);
  if (s.h < 22) {
    // Fences and low walls.
    g.fillStyle(0xd6d3d1, 1).fillRect(s.x, s.y, s.w, s.h);
    g.fillStyle(0xa8a29e, 1);
    for (let x = s.x; x < s.x + s.w; x += 24) g.fillRect(x, s.y - 4, 6, s.h + 4);
    g.lineStyle(3, INK, 1).strokeRect(s.x, s.y, s.w, s.h);
    return { g, face: { x: s.x, y: s.y, w: s.w, h: s.h } };
  }
  const base = s.y + s.h;
  g.setDepth(5 + base / 10000);
  const lit = (x: number, y: number, w: number, h: number) => {
    if (opts.lights && r() < 0.62) opts.lights.fillStyle(r() < 0.8 ? 0xffd97a : 0xfff3c4, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
  };

  if (opts.style === "tower") {
    // A tall city block seen from the front, like the sheet: stone or glass, a grid of windows, glass doors.
    const tall = opts.tall ?? 70 + Math.floor(r() * 90);
    const top = base - s.h - tall;
    const glass = r() < 0.35;
    const wall = glass ? 0x9db7c9 : [0xd8cfbf, 0xcfc6b6, 0xe2dccf, 0xbfb6a6][Math.floor(r() * 4)]!;
    const accent = hex(s.color ?? "#64748b");
    g.fillStyle(0x000000, 0.25).fillRect(s.x + 8, top + 10, s.w, base - top);
    g.fillStyle(wall, 1).fillRect(s.x, top, s.w, base - top);
    g.fillStyle(shade(wall, 0.85), 1).fillRect(s.x + s.w - 10, top, 10, base - top);
    // Rooftop: a parapet, a plant room and maybe an antenna.
    g.fillStyle(shade(wall, 1.12), 1).fillRect(s.x - 3, top - 6, s.w + 6, 8);
    g.lineStyle(2.5, INK, 1).strokeRect(s.x - 3, top - 6, s.w + 6, 8);
    const boxW = 18 + r() * 16;
    g.fillStyle(shade(wall, 0.8), 1).fillRect(s.x + s.w / 2 - boxW / 2, top - 18, boxW, 12);
    g.lineStyle(2, INK, 1).strokeRect(s.x + s.w / 2 - boxW / 2, top - 18, boxW, 12);
    if (r() < 0.5) g.lineStyle(2, INK, 1).lineBetween(s.x + s.w / 2 + 6, top - 18, s.x + s.w / 2 + 6, top - 34);
    // Windows.
    const ww = 9;
    const wh = 11;
    for (let wy = top + 10; wy < base - 30; wy += 17) {
      for (let wx = s.x + 7; wx < s.x + s.w - 14; wx += 14) {
        if (glass) {
          g.fillStyle(0x3d6d8c, 1).fillRect(wx, wy, ww + 3, wh + 4);
        } else {
          g.fillStyle(0x4f7fa0, 1).fillRect(wx, wy, ww, wh);
          g.fillStyle(0xbfe0f2, 0.7).fillRect(wx + 1, wy + 1, 3, wh - 2);
          g.lineStyle(1.5, INK, 0.9).strokeRect(wx, wy, ww, wh);
        }
        lit(wx, wy, glass ? ww + 3 : ww, glass ? wh + 4 : wh);
      }
    }
    if (glass) {
      g.lineStyle(1.5, 0xdbeaf3, 0.8);
      for (let x = s.x + 6; x < s.x + s.w - 6; x += 14) g.lineBetween(x - 2, top + 8, x - 2, base - 30);
    }
    // Ground floor: an awning in the district colour and glass doors.
    g.fillStyle(accent, 1).fillRect(s.x + 6, base - 30, s.w - 12, 6);
    g.lineStyle(2, INK, 1).strokeRect(s.x + 6, base - 30, s.w - 12, 6);
    g.fillStyle(0x2b3d4f, 1).fillRect(s.x + s.w / 2 - 12, base - 22, 24, 22);
    g.fillStyle(0x9fd5f5, 0.8).fillRect(s.x + s.w / 2 - 10, base - 20, 9, 20).fillRect(s.x + s.w / 2 + 1, base - 20, 9, 20);
    g.lineStyle(2, INK, 1).strokeRect(s.x + s.w / 2 - 12, base - 22, 24, 22);
    g.fillStyle(shade(wall, 0.7), 1).fillRect(s.x - 2, base - 3, s.w + 4, 4);
    g.lineStyle(LINE, INK, 1).strokeRect(s.x, top, s.w, base - top);
    if (s.label) labelOn(scene, s.x + s.w / 2, top + 20, s.label, base);
    return { g, face: { x: s.x, y: top - 34, w: s.w, h: base - top + 34 } };
  }

  // Houses and low blocks: a roof, a front wall with windows and a door.
  const roof = hex(s.color ?? "#9ca3af");
  const wallH = Math.min(26, Math.max(10, s.h * 0.32));
  const roofH = s.h - wallH;
  g.fillStyle(0x000000, 0.25).fillRoundedRect(s.x + 6, s.y + 8, s.w, s.h, 6);
  g.fillStyle(0xf1e6d0, 1).fillRect(s.x, s.y + roofH, s.w, wallH);
  g.fillStyle(0xd9ccb2, 1).fillRect(s.x, s.y + s.h - 4, s.w, 4);
  g.fillStyle(roof, 1).fillRoundedRect(s.x, s.y, s.w, roofH, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(shade(roof, 1.18), 1).fillRect(s.x + 4, s.y + 4, s.w - 8, 5);
  g.fillStyle(shade(roof, 0.82), 1).fillRect(s.x, s.y + roofH - 6, s.w, 6);
  const door = s.x + s.w / 2 - 8;
  for (let wx = s.x + 10; wx < s.x + s.w - 20; wx += 26) {
    if (Math.abs(wx - door) < 22) continue;
    const wy = s.y + roofH + 4;
    const wh = Math.max(5, wallH - 10);
    g.fillStyle(0x9fd5f5, 1).fillRect(wx, wy, 13, wh);
    g.lineStyle(2, INK, 1).strokeRect(wx, wy, 13, wh);
    lit(wx, wy, 13, wh);
  }
  g.fillStyle(0x7c4a24, 1).fillRect(door, s.y + s.h - Math.min(22, wallH), 16, Math.min(22, wallH));
  g.lineStyle(2, INK, 1).strokeRect(door, s.y + s.h - Math.min(22, wallH), 16, Math.min(22, wallH));
  g.lineStyle(LINE, INK, 1).strokeRoundedRect(s.x, s.y, s.w, s.h, 6);
  g.lineStyle(2, INK, 0.6).beginPath().moveTo(s.x, s.y + roofH).lineTo(s.x + s.w, s.y + roofH).strokePath();
  // Rooftop details: a black water tank and an AC unit, very Abuja.
  if (s.w > 60 && roofH > 30 && r() > 0.3) scene.add.image(s.x + 14 + r() * (s.w - 40), s.y + roofH / 2 - 2, "tank").setDepth(g.depth);
  if (s.w > 90 && roofH > 30 && r() > 0.4) {
    const ax = s.x + s.w - 34;
    const ay = s.y + 10;
    g.fillStyle(0xe5e7eb, 1).fillRect(ax, ay, 22, 14).lineStyle(2, INK, 1).strokeRect(ax, ay, 22, 14).strokeCircle(ax + 11, ay + 7, 4);
  }
  if (s.label) labelOn(scene, s.x + s.w / 2, s.y + roofH / 2, s.label, base);
  return { g, face: { x: s.x, y: s.y, w: s.w, h: s.h } };
}

function labelOn(scene: Phaser.Scene, x: number, y: number, text: string, base: number) {
  scene.add
    .text(x, y, text, { fontFamily: GAME_FONT, fontSize: "14px", fontStyle: "bold", color: "#ffffff", stroke: "#141414", strokeThickness: 4 })
    .setResolution(2)
    .setOrigin(0.5)
    .setDepth(5 + base / 10000 + 0.0001);
}

/** A signpost for a place you can enter: icon, name, and a glowing doormat. */
export function signpost(scene: Phaser.Scene, x: number, y: number, name: string, icon: string, color: number) {
  const mat = scene.add.ellipse(0, 26, 70, 22, color, 0.35).setStrokeStyle(3, color, 0.9);
  const post = scene.add.rectangle(0, -2, 6, 40, 0x6b4423).setStrokeStyle(2, INK);
  const board = scene.add.rectangle(0, -30, 46, 36, 0xfffbeb).setStrokeStyle(3, INK);
  const glyph = scene.add.text(0, -30, icon, { fontSize: "22px" }).setOrigin(0.5);
  const text = scene.add
    .text(0, 44, name, { fontFamily: GAME_FONT, fontSize: "14px", fontStyle: "bold", color: "#ffffff", stroke: "#141414", strokeThickness: 4 })
    .setResolution(2)
    .setOrigin(0.5, 0);
  scene.tweens.add({ targets: mat, scaleX: 1.15, scaleY: 1.15, alpha: 0.6, duration: 1000, yoyo: true, repeat: -1 });
  return scene.add.container(x, y, [mat, post, board, glyph, text]).setDepth(4);
}
