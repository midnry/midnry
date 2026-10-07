import { GAME_FONT } from "../ui/theme";
import * as Phaser from "phaser";
import { CROWD_PAINTED, PAINTED_OUTFITS, WALK_FRAMES, YOUNG_ART } from "../systems/painted";
import { characterParts, dims, fullLook, lookKey, type LifeStage, type Look } from "../systems/character";
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

// The city's ground, painted: warm stone pavers, laterite earth, sun-warmed
// grass and worn asphalt. Each is a 128px seamless tile; anything drawn near
// an edge is drawn again on the other side so the tiles join cleanly.
const T = 128;
type Painter = (g: Phaser.GameObjects.Graphics, r: () => number) => void;
const wrap = (draw: (dx: number, dy: number) => void) => {
  for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) draw(dx, dy);
};
const blotches = (g: Phaser.GameObjects.Graphics, r: () => number, colors: number[], n: number, size: [number, number], alpha: number) => {
  for (let i = 0; i < n; i += 1) {
    const x = r() * T;
    const y = r() * T;
    const rad = size[0] + r() * (size[1] - size[0]);
    const c = colors[i % colors.length]!;
    wrap((dx, dy) => g.fillStyle(c, alpha).fillEllipse(x + dx, y + dy, rad * 2, rad * 1.5));
  }
};
const pavers = (g: Phaser.GameObjects.Graphics, r: () => number, base: number, grout: number, cell: number, stagger: boolean) => {
  g.fillStyle(grout, 1).fillRect(0, 0, T, T);
  for (let y = 0; y < T; y += cell) {
    const off = stagger && (y / cell) % 2 ? cell / 2 : 0;
    for (let x = -cell; x < T + cell; x += cell) {
      const tone = shade(base, 0.95 + r() * 0.1);
      const px = x + off;
      g.fillStyle(tone, 1).fillRect(px + 1.5, y + 1.5, cell - 3, cell - 3);
      g.fillStyle(0xffffff, 0.16).fillRect(px + 1.5, y + 1.5, cell - 3, 2);
      g.fillStyle(0x000000, 0.06).fillRect(px + 1.5, y + cell - 3.5, cell - 3, 2);
    }
  }
  for (let i = 0; i < 40; i += 1) g.fillStyle(shade(base, 0.8), 0.35).fillCircle(r() * T, r() * T, 0.7 + r() * 0.8);
};
const PAINTERS: Record<string, Painter> = {
  // Warm square pavers: the plazas and pedestrian blocks.
  pavement: (g, r) => pavers(g, r, 0xdcc8a6, 0xbfa883, 32, false),
  plaza: (g, r) => pavers(g, r, 0xe6d6b8, 0xcab792, 32, true),
  // Small pale tiles for the sidewalks.
  sidewalk: (g, r) => pavers(g, r, 0xd9d3c7, 0xb9b2a4, 16, false),
  concrete: (g, r) => {
    g.fillStyle(0xc9c1b2, 1).fillRect(0, 0, T, T);
    blotches(g, r, [0xbdb4a4, 0xd4ccbe], 14, [10, 26], 0.5);
    g.lineStyle(1.5, 0xa69d8c, 0.6).strokeRect(0, 0, T, T);
  },
  // Abuja's red laterite earth.
  dirt: (g, r) => {
    g.fillStyle(0xc4875a, 1).fillRect(0, 0, T, T);
    blotches(g, r, [0xb5774b, 0xd29a6c, 0xbd7f51], 22, [8, 22], 0.55);
    for (let i = 0; i < 46; i += 1) g.fillStyle(r() < 0.5 ? 0x8f5a35 : 0xe2b48a, 0.8).fillCircle(r() * T, r() * T, 0.8 + r() * 1.4);
  },
  sand: (g, r) => {
    g.fillStyle(0xe6cd98, 1).fillRect(0, 0, T, T);
    blotches(g, r, [0xdcc086, 0xefdcb0], 18, [8, 20], 0.55);
    for (let i = 0; i < 30; i += 1) g.fillStyle(0xc6a66e, 0.7).fillCircle(r() * T, r() * T, 0.8 + r());
  },
  // Sunny grass: soft light and shadow patches, then little blades.
  grass: (g, r) => {
    g.fillStyle(0x6db04a, 1).fillRect(0, 0, T, T);
    blotches(g, r, [0x5e9f3e, 0x7dbf56, 0x66a944], 26, [10, 26], 0.55);
    for (let i = 0; i < 90; i += 1) {
      const x = r() * T;
      const y = r() * T;
      g.lineStyle(1.4, r() < 0.5 ? 0x4f8d33 : 0x8fcc63, 0.9).lineBetween(x, y, x + (r() - 0.5) * 3, y - 3 - r() * 3);
    }
    for (let i = 0; i < 5; i += 1) g.fillStyle([0xfff4a3, 0xffffff, 0xf9a8d4][i % 3]!, 0.9).fillCircle(r() * T, r() * T, 1.3);
  },
  lawn: (g, r) => {
    g.fillStyle(0x63a845, 1).fillRect(0, 0, T, T);
    for (let x = 0; x < T; x += 32) g.fillStyle(0xffffff, 0.05).fillRect(x, 0, 16, T);
    blotches(g, r, [0x58993d, 0x71b852], 14, [10, 22], 0.35);
    for (let i = 0; i < 60; i += 1) {
      const x = r() * T;
      const y = r() * T;
      g.lineStyle(1.2, 0x4f8d33, 0.7).lineBetween(x, y, x + (r() - 0.5) * 2, y - 3 - r() * 2);
    }
  },
  // Worn asphalt: fine grit, faint patches and the odd crack.
  asphalt: (g, r) => {
    g.fillStyle(0x47474e, 1).fillRect(0, 0, T, T);
    blotches(g, r, [0x404047, 0x4e4e55], 10, [12, 28], 0.5);
    for (let i = 0; i < 160; i += 1) g.fillStyle(r() < 0.5 ? 0x5a5a62 : 0x37373d, 0.7).fillRect(r() * T, r() * T, 1.3, 1.3);
    for (let i = 0; i < 2; i += 1) {
      let x = r() * T;
      let y = r() * T;
      g.lineStyle(1, 0x2f2f34, 0.55).beginPath().moveTo(x, y);
      for (let k = 0; k < 4; k += 1) {
        x += (r() - 0.5) * 14;
        y += 4 + r() * 6;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
  },
};

function makeTiles(scene: Phaser.Scene) {
  for (const [name, paint] of Object.entries(PAINTERS)) make(scene, tileKey(name), T, T, (g) => paint(g, rand(name.length * 7919 + 31)));
  for (const [name, t] of Object.entries(TILES)) {
    if (PAINTERS[name]) continue;
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
  // A soft contact shadow: darker in the middle, feathered at the edge.
  make(scene, "shadow", 48, 14, (g) => {
    for (let i = 0; i < 5; i += 1) g.fillStyle(0x1a1208, 0.08).fillEllipse(24, 7, 46 - i * 7, 12 - i * 1.8);
  });
  // A speech bubble for people with something to say.
  make(scene, "talkbubble", 30, 26, (g) => {
    g.fillStyle(0x000000, 0.18).fillRoundedRect(3, 3, 26, 17, 8);
    g.fillStyle(0xffffff, 1).fillRoundedRect(1, 1, 26, 17, 8);
    g.fillTriangle(6, 16, 13, 16, 5, 24);
    g.lineStyle(2, INK, 1).strokeRoundedRect(1, 1, 26, 17, 8);
    g.fillStyle(0xffffff, 1).fillRect(7, 15, 6, 4);
    g.lineStyle(2, INK, 1).lineBetween(6, 18, 5, 24).lineBetween(5, 24, 13, 18);
    g.fillStyle(0x334155, 1).fillCircle(8, 9.5, 2).fillCircle(14, 9.5, 2).fillCircle(20, 9.5, 2);
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
export type Person = { look: Look; adult: boolean; stage?: LifeStage; painted?: string };

/**
 * Hand-painted characters (public/abuja/people/<id>-<view>.png): whole-body
 * images, one per view, animated by bobbing and leaning rather than by limbs.
 * `scale` is height relative to an average grown-up. Missing views fall back to the front.
 */
export const PAINTED: Record<string, { views: Facing[]; scale?: number }> = {
  suya: { views: ["front", "side", "back"], scale: 0.98 },
  pos_lady: { views: ["front", "side", "back"], scale: 0.94 },
  agbero: { views: ["front", "side", "back"], scale: 1.04 },
  okada: { views: ["front", "side", "back"] },
  police: { views: ["front", "side", "back"], scale: 1.02 },
  frsc: { views: ["front", "side", "back"] },
  hawker: { views: ["front", "side", "back"], scale: 0.95 },
  felix: { views: ["front", "side", "back"] },
  okafor: { views: ["front", "side", "back"], scale: 0.95 },
  corper: { views: ["front", "side", "back"], scale: 0.95 },
  prophet: { views: ["front", "side", "back"], scale: 1.03 },
  civil_servant: { views: ["front", "side", "back"] },
  tunde: { views: ["front", "side", "back"] },
  slim: { views: ["front", "side", "back"], scale: 0.98 },
  bolaji: { views: ["front", "side", "back"], scale: 1.01 },
};
for (const o of PAINTED_OUTFITS) PAINTED[o.id] = { views: ["front", "side", "back"], scale: o.build === "fem" ? 0.96 : 1.02 };
for (const c of CROWD_PAINTED) PAINTED[c.id] = { views: ["front", "side", "back"], scale: c.scale };
for (const y of YOUNG_ART) PAINTED[y.id] = { views: ["front", "side", "back"], scale: y.scale };
const paintedKey = (id: string, view: Facing) => `pt_${id}_${PAINTED[id]?.views.includes(view) ? view : "front"}`;

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
const charKey = (p: Person) => (p.painted && PAINTED[p.painted] ? `pt_${p.painted}` : `ch_${lookKey(p.look)}${bodyKey(bodyOf(p))}`);
const PARTS = ["front", "back", "side", "arm", "leg", "legSide"] as const;

/** Queue the textures for these people in the scene's loader (call from preload). */
export function queueCharacters(scene: Phaser.Scene, people: Person[]) {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const person of people) {
    const key = charKey(person);
    if (seen.has(key) || scene.textures.exists(`${key}_front`)) continue;
    seen.add(key);
    if (person.painted && PAINTED[person.painted]) {
      for (const view of PAINTED[person.painted]!.views) scene.load.image(`${key}_${view}`, `/abuja/people/${person.painted}-${view}.png`);
      if (WALK_FRAMES.has(person.painted))
        for (const view of ["front", "side", "back"]) for (let n = 1; n <= 4; n++) scene.load.image(`${key}_walk_${view}_${n}`, `/abuja/people/${person.painted}-walk-${view}-${n}.png`);
      continue;
    }
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
  /** Hand-painted people: their id, the image's base scale, and the pieces it's cut into. */
  painted?: string;
  bodyScale?: number;
  /** Showing hand-drawn walk frames right now. */
  walking?: boolean;
  parts?: { box: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; sideL: Phaser.GameObjects.Image; sideR: Phaser.GameObjects.Image; legL: Phaser.GameObjects.Image; legR: Phaser.GameObjects.Image };
};

const FEET = 10; // feet sit this many pixels below the figure's position
/** New bodies are drawn taller (natural proportions); this keeps people the same size on screen. */
const NORM = 0.8;

/** A person. `unit` is pixels per drawing unit: about 0.2 for people, smaller for crowds. */
export function figure(scene: Phaser.Scene, x: number, y: number, person: Person, opts: { name?: string; nameColor?: string; unit?: number } = {}): Figure {
  if (person.painted && PAINTED[person.painted] && scene.textures.exists(paintedKey(person.painted, "front"))) return paintedFigure(scene, x, y, person.painted, opts);
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
    const you = opts.name === "YOU";
    items.push(pill(scene, 0, headTop - (you ? 16 : 12), opts.name, { size: you ? 11 : 10, color: you ? "#ffffff" : (opts.nameColor ?? "#ffffff"), pointer: you ? 0x3b82f6 : undefined }));
  }
  const c = scene.add.container(x, y, items) as Figure;
  Object.assign(c, { rig, legs: [legA, legB], arms: [armA, armB], armBack, upper, shadow, headTop, key, dims: d, unit, rigY, action: null, facing: "side" });
  setFacing(c, "front");
  return c;
}

/** A hand-painted person: one image per view, standing on its feet at the figure's position. */
function paintedFigure(scene: Phaser.Scene, x: number, y: number, id: string, opts: { name?: string; nameColor?: string; unit?: number }): Figure {
  const unit = (opts.unit ?? 0.2) * NORM;
  // As tall as a drawn grown-up of the same unit.
  const ref = dims(fullLook({}), "adult");
  const height = (ref.height - ref.headTop) * unit * (PAINTED[id]!.scale ?? 1);
  // The painting is cut into pieces sharing one origin: the body above the hips,
  // each leg, and the strips beside the legs (hands, a hem). Legs then step on their own.
  const piece = () => scene.add.image(0, 0, paintedKey(id, "front")).setOrigin(0.5, 1);
  const body = piece();
  const k = height / body.height;
  const [sideL, sideR, legL, legR] = [piece(), piece(), piece(), piece()];
  const parts = { box: scene.add.container(0, 0, [sideL, sideR, legL, legR, body]), body, sideL, sideR, legL, legR };
  for (const img of [body, sideL, sideR, legL, legR]) img.setScale(k);
  const rig = scene.add.container(0, FEET, [parts.box]);
  const hidden = () => scene.add.image(0, 0, paintedKey(id, "front")).setVisible(false);
  const shadow = scene.add.image(0, FEET - 2, "shadow").setScale(unit * 2.6, unit * 2.2);
  const headTop = FEET - height;
  const items: Phaser.GameObjects.GameObject[] = [shadow, rig];
  if (opts.name) {
    const you = opts.name === "YOU";
    items.push(pill(scene, 0, headTop - (you ? 16 : 12), opts.name, { size: you ? 11 : 10, color: you ? "#ffffff" : (opts.nameColor ?? "#ffffff"), pointer: you ? 0x3b82f6 : undefined }));
  }
  const c = scene.add.container(x, y, items) as Figure;
  Object.assign(c, { rig, legs: [hidden(), hidden()], arms: [hidden(), hidden()], armBack: hidden(), upper: body, shadow, headTop, key: `pt_${id}`, dims: ref, unit, rigY: FEET, action: null, facing: "front", painted: id, bodyScale: k, parts });
  cutPainted(c);
  return c;
}

type Cut = { split: number; cx: number; l0: number; r1: number };
const cuts = new Map<string, Cut>();

/**
 * Where to cut a painting: the hip line (the top of the gap between the legs,
 * or just above the feet under a long robe), the middle between the legs, and
 * how far the legs reach either side. Worked out once per image from its pixels.
 */
function cutFor(scene: Phaser.Scene, key: string, side: boolean): Cut {
  const hit = cuts.get(key);
  if (hit) return hit;
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const w = src.width;
  const h = src.height;
  let cut: Cut = { split: Math.round(h * 0.6), cx: w / 2, l0: 0, r1: w };
  try {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(src, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const solid = (x: number, y: number) => data[(y * w + x) * 4 + 3]! > 110;
    // The middle between the feet, from the bottom rows.
    let sum = 0;
    let count = 0;
    for (let y = Math.floor(h * 0.92); y < h; y++) for (let x = 0; x < w; x++) if (solid(x, y)) (sum += x), (count += 1);
    const cx = count ? Math.round(sum / count) : Math.round(w / 2);
    // Legs' reach: the outermost solid pixels near the feet.
    let l0 = w;
    let r1 = 0;
    for (let y = Math.floor(h * 0.85); y < h; y++) for (let x = 0; x < w; x++) if (solid(x, y)) (l0 = Math.min(l0, x)), (r1 = Math.max(r1, x));
    let split = Math.round(h * (side ? 0.62 : 0.6));
    if (!side) {
      // Walk up from the feet while there's a gap in the middle with a leg either side.
      const gapAt = (y: number) => {
        if ([-2, -1, 0, 1, 2].some((d) => solid(Math.max(0, Math.min(w - 1, cx + d)), y))) return false;
        let left = false;
        let right = false;
        for (let d = 3; d < w * 0.22; d++) {
          if (cx - d >= 0 && solid(cx - d, y)) left = true;
          if (cx + d < w && solid(cx + d, y)) right = true;
        }
        return left && right;
      };
      let y = h - 3;
      let misses = 0;
      let top = h;
      while (y > h * 0.4) {
        if (gapAt(y)) (top = y), (misses = 0);
        else if (++misses > 3) break;
        y -= 1;
      }
      split = top < h * 0.95 ? top : Math.round(h * 0.93);
    }
    cut = { split, cx, l0: Math.max(0, l0 - 2), r1: Math.min(w, r1 + 3) };
  } catch {
    /* pixels unreadable: fall back to proportions */
  }
  cuts.set(key, cut);
  return cut;
}

/** Crop the pieces of a painted figure for its current view. */
function cutPainted(f: Figure) {
  const p = f.parts!;
  const key = paintedKey(f.painted!, f.facing);
  for (const img of [p.body, p.sideL, p.sideR, p.legL, p.legR]) img.setTexture(key);
  const w = p.body.frame.width;
  const h = p.body.frame.height;
  const c = cutFor(p.body.scene, key, f.facing === "side");
  const over = 3;
  p.body.setCrop(0, 0, w, c.split + over);
  p.legL.setCrop(c.l0, c.split, c.cx - c.l0, h - c.split);
  p.legR.setCrop(c.cx, c.split, c.r1 - c.cx, h - c.split);
  p.sideL.setCrop(0, c.split, c.l0, h - c.split);
  p.sideR.setCrop(c.r1, c.split, w - c.r1, h - c.split);
  p.legL.setPosition(0, 0);
  p.legR.setPosition(0, 0);
}

function setFacing(f: Figure, facing: Facing) {
  if (f.facing === facing) return;
  if (f.painted) {
    f.facing = facing;
    if (f.walking) f.walking = false, f.parts!.legL.setVisible(true), f.parts!.legR.setVisible(true), f.parts!.sideL.setVisible(true), f.parts!.sideR.setVisible(true);
    cutPainted(f);
    if (facing !== "side") f.rig.scaleX = Math.abs(f.rig.scaleX);
    return;
  }
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
  if (f.painted) return animatePainted(f, time, motion);
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

/** Painted people move as a whole: a bob and a sway to walk, hops to celebrate, a lean to reach. */
/** Switch a painted figure between its walk-cycle frames and its standing cut-out. Returns whether frames are in use. */
function walkFrames(f: Figure, on: boolean): boolean {
  const p = f.parts!;
  const has = on && p.body.scene.textures.exists(`pt_${f.painted}_walk_${f.facing}_1`);
  if (has === Boolean(f.walking)) return has;
  f.walking = has;
  if (has) {
    p.body.setCrop();
    for (const img of [p.sideL, p.sideR, p.legL, p.legR]) img.setVisible(false);
  } else {
    for (const img of [p.sideL, p.sideR, p.legL, p.legR]) img.setVisible(true);
    cutPainted(f);
  }
  return has;
}

function animatePainted(f: Figure, time: number, motion: Motion) {
  const p = f.parts!;
  const moving = motion === "walk" || motion === "run" || motion === "enter" || motion === "exit";
  if (!moving) walkFrames(f, false);
  const side = f.facing === "side";
  const dir = Math.sign(f.rig.scaleX || 1);
  // Height of the figure in world pixels, for sizing the steps.
  const tall = -f.headTop;
  f.rig.rotation = 0;
  f.rig.y = f.rigY;
  p.box.setScale(1, 1);
  p.legL.setPosition(0, 0);
  p.legR.setPosition(0, 0);
  f.alpha = 1;
  f.shadow.setScale(f.unit * 2.6, f.unit * 2.2);
  const t = (time - (f.action?.started ?? 0)) / 1000;
  switch (motion) {
    case "idle":
      // Breathing.
      p.box.setScale(1, 1 + Math.sin(time / 520) * 0.008);
      return;
    case "walk":
    case "run":
    case "enter":
    case "exit": {
      const run = motion === "run";
      if (walkFrames(f, true)) {
        // A hand-drawn walk cycle: four frames, faster when running.
        const n = (Math.floor(time / (run ? 95 : 140)) % 4) + 1;
        p.body.setTexture(`pt_${f.painted}_walk_${f.facing}_${n}`);
        f.rig.y = f.rigY - (n % 2 === 0 ? tall * 0.012 : 0);
        if (motion === "enter") f.alpha = Math.max(0, 1 - t * 1.6);
        if (motion === "exit") f.alpha = Math.min(1, t * 1.6);
        return;
      }
      const ph = time / (run ? 70 : 105);
      const swing = Math.sin(ph);
      if (side) {
        // Scissor: the front leg reaches forward as the back one pushes off, each lifting as it passes.
        const reach = tall * (run ? 0.07 : 0.045);
        p.legR.setPosition(swing * reach, -Math.max(0, swing) * tall * 0.03);
        p.legL.setPosition(-swing * reach, -Math.max(0, -swing) * tall * 0.03);
        f.rig.rotation = (run ? 0.07 : 0.02) * dir;
      } else {
        // One foot lifts, then the other, and the body sways over the planted one.
        const lift = tall * (run ? 0.09 : 0.06);
        p.legL.setPosition(0, -Math.max(0, swing) * lift);
        p.legR.setPosition(0, -Math.max(0, -swing) * lift);
        f.rig.rotation = swing * (run ? 0.04 : 0.022);
      }
      f.rig.y = f.rigY - Math.abs(Math.cos(ph)) * tall * (run ? 0.04 : 0.02);
      if (motion === "enter") f.alpha = Math.max(0, 1 - t * 1.6);
      if (motion === "exit") f.alpha = Math.min(1, t * 1.6);
      return;
    }
    case "jump": {
      const h = Math.sin(Math.min(1, t / 0.55) * Math.PI) * 26;
      f.rig.y = f.rigY - h;
      f.shadow.setScale(f.unit * 2.6 * (1 - h / 60), f.unit * 2.2 * (1 - h / 60));
      p.legL.setPosition(0, -h * 0.15);
      p.legR.setPosition(0, -h * 0.15);
      return;
    }
    case "sit":
      // Settled down: a little lower and wider.
      f.rig.y = f.rigY + 2;
      p.box.setScale(1.03, 0.86);
      return;
    case "wave":
      f.rig.rotation = Math.sin(time / 120) * 0.07;
      f.rig.y = f.rigY - Math.abs(Math.sin(time / 240)) * 2;
      return;
    case "celebrate": {
      const hop = Math.abs(Math.sin(t * 7)) * 12;
      f.rig.y = f.rigY - hop;
      f.rig.rotation = Math.sin(time / 90) * 0.06;
      p.legL.setPosition(0, -hop * 0.2);
      p.legR.setPosition(0, -hop * 0.2);
      return;
    }
    case "interact":
      f.rig.rotation = (side ? 0.12 * dir : 0) * Math.min(1, t * 4);
      p.box.setScale(1, 1 - Math.min(1, t * 4) * 0.03);
      return;
  }
}

// ── City buildings (systems/city): one texture per look, plus its lit windows ─

const BRES = 2.2;

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
  // Painted trees: a soft outline, shade underneath, light from the top left, a few leaf flecks.
  const OUT = 0x23361f;
  const canopy = (g: Phaser.GameObjects.Graphics, blobs: [number, number, number][], seed: number) => {
    const r = rand(seed);
    g.fillStyle(OUT, 1);
    for (const [x, y, rad] of blobs) g.fillCircle(x, y, rad + 2.2);
    g.fillStyle(0x2f6b2c, 1);
    for (const [x, y, rad] of blobs) g.fillCircle(x, y, rad);
    g.fillStyle(0x3f8a36, 1);
    for (const [x, y, rad] of blobs) g.fillCircle(x - rad * 0.12, y - rad * 0.16, rad * 0.84);
    g.fillStyle(0x56a744, 1);
    for (const [x, y, rad] of blobs) g.fillCircle(x - rad * 0.28, y - rad * 0.32, rad * 0.55);
    g.fillStyle(0x7cc65a, 0.9);
    for (const [x, y, rad] of blobs) g.fillCircle(x - rad * 0.4, y - rad * 0.45, rad * 0.24);
    for (let i = 0; i < 26; i += 1) {
      const [x, y, rad] = blobs[i % blobs.length]!;
      const a = r() * Math.PI * 2;
      const d = r() * rad * 0.8;
      g.fillStyle(r() < 0.5 ? 0x9bd774 : 0x2a5f28, 0.8).fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 4, 2.6);
    }
  };
  const trunk = (g: Phaser.GameObjects.Graphics, cx: number, top: number, base: number, w: number) => {
    // A soft round shadow on the ground under the crown.
    for (let i = 0; i < 4; i += 1) g.fillStyle(0x1a1208, 0.07).fillEllipse(cx + 4, base + 2, w * 9 - i * 9, 16 - i * 3);
    const pts = [{ x: cx - w, y: base + 2 }, { x: cx - w * 0.5, y: top }, { x: cx + w * 0.5, y: top }, { x: cx + w, y: base + 2 }];
    g.fillStyle(0x6b4423, 1).fillPoints(pts, true);
    g.fillStyle(0x8a5a32, 1).fillRect(cx - w * 0.5, top, w * 0.45, base - top);
    g.lineStyle(2, OUT, 1).strokePoints(pts, true);
    g.lineStyle(4.5, OUT, 1).lineBetween(cx - 2, top + 14, cx - w * 2.2, top - 4).lineBetween(cx + 2, top + 10, cx + w * 2.4, top - 6);
    g.lineStyle(2.5, 0x6b4423, 1).lineBetween(cx - 2, top + 14, cx - w * 2.2, top - 4).lineBetween(cx + 2, top + 10, cx + w * 2.4, top - 6);
    g.fillStyle(0x4f9a3a, 1);
    for (let i = -3; i <= 3; i += 1) g.fillTriangle(cx + i * 5 - 2.5, base + 4, cx + i * 5, base - 4 - (i % 2 ? 0 : 3), cx + i * 5 + 2.5, base + 4);
  };
  make(scene, "tree", 100, 118, (g) => {
    trunk(g, 50, 62, 108, 7);
    canopy(g, [[50, 40, 27], [28, 52, 19], [72, 52, 19], [35, 28, 17], [65, 28, 17], [50, 62, 16], [20, 38, 11], [80, 38, 11]], 11);
  });
  make(scene, "tree2", 84, 132, (g) => {
    trunk(g, 42, 72, 122, 6);
    canopy(g, [[42, 34, 18], [31, 50, 16], [54, 48, 16], [42, 64, 15], [36, 20, 12], [50, 18, 11], [42, 8, 8]], 23);
  });
  make(scene, "tree3", 90, 96, (g) => {
    trunk(g, 45, 58, 86, 6);
    canopy(g, [[45, 40, 22], [26, 46, 15], [64, 46, 15], [45, 22, 16], [32, 28, 12], [58, 28, 12]], 37);
  });
  // Traffic light: a slim dark pole and a hooded head (lamps lit by the "signal" sprite).
  make(scene, "trafficlight", 26, 78, (g) => {
    g.fillStyle(0x1a1208, 0.18).fillEllipse(13, 74, 16, 5);
    g.fillStyle(0x2b2f36, 1).fillRoundedRect(8, 68, 10, 6, 2);
    g.fillStyle(0x3a3f47, 1).fillRect(11.5, 34, 3, 36);
    g.fillStyle(0x1f2329, 1).fillRoundedRect(5, 3, 16, 32, 5);
    g.lineStyle(1.5, 0x0d0f12, 1).strokeRoundedRect(5, 3, 16, 32, 5);
    g.fillStyle(0x2d333b, 1).fillCircle(13, 10, 4.2).fillCircle(13, 19, 4.2).fillCircle(13, 28, 4.2);
    g.fillStyle(0x15181c, 1).fillRect(7, 5, 12, 1.5).fillRect(7, 14, 12, 1.5).fillRect(7, 23, 12, 1.5);
  });
  // The lit lamp of a traffic light, tinted red, amber or green.
  make(scene, "signal", 12, 12, (g) => {
    g.fillStyle(0xffffff, 0.35).fillCircle(6, 6, 5.5);
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 3.8);
  });
  make(scene, "palm", 72, 84, (g) => {
    for (let i = 0; i < 3; i += 1) g.fillStyle(0x1a1208, 0.08).fillEllipse(38, 78, 40 - i * 10, 11 - i * 2);
    g.fillStyle(0x8b5a2b, 1).fillRoundedRect(32, 34, 8, 44, 3);
    g.fillStyle(0xa8743f, 1).fillRect(33, 36, 3, 40);
    g.lineStyle(1.5, 0x6b4423, 1);
    for (let y = 40; y < 76; y += 6) g.lineBetween(32, y, 40, y + 2);
    g.lineStyle(2, OUT, 1).strokeRoundedRect(32, 34, 8, 44, 3);
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      const fx = 36 + Math.cos(a) * 16;
      const fy = 28 + Math.sin(a) * 9;
      g.fillStyle(OUT, 1).fillEllipse(fx, fy, 33, 13);
      g.fillStyle(i % 2 ? 0x3f8a36 : 0x4f9e3e, 1).fillEllipse(fx, fy, 30, 10);
      g.fillStyle(0x7cc65a, 0.8).fillEllipse(fx - Math.cos(a) * 3, fy - 2, 16, 3);
    }
    g.fillStyle(0x6b4423, 1).fillCircle(36, 29, 5.5);
    g.fillStyle(0xd4a017, 1).fillCircle(33, 33, 2.5).fillCircle(39, 33, 2.5);
  });
  make(scene, "bush", 40, 30, (g) => {
    for (let i = 0; i < 3; i += 1) g.fillStyle(0x1a1208, 0.08).fillEllipse(21, 26, 38 - i * 9, 7 - i);
    const b: [number, number, number][] = [[12, 17, 9], [28, 17, 9], [20, 11, 10]];
    g.fillStyle(OUT, 1);
    for (const [x, y, r] of b) g.fillCircle(x, y, r + 2);
    g.fillStyle(0x3a7f33, 1);
    for (const [x, y, r] of b) g.fillCircle(x, y, r);
    g.fillStyle(0x56a744, 1);
    for (const [x, y, r] of b) g.fillCircle(x - 2, y - 2, r * 0.65);
    g.fillStyle(0x86cc5f, 0.9);
    for (const [x, y, r] of b) g.fillCircle(x - 3, y - 4, r * 0.25);
    g.fillStyle(0xf472b6, 1).fillCircle(14, 13, 2.2).fillCircle(26, 19, 2.2).fillCircle(21, 8, 2);
    g.fillStyle(0xffffff, 0.8).fillCircle(13.5, 12.5, 0.8).fillCircle(25.5, 18.5, 0.8);
  });
  // Street lamp: a dark iron post with a lantern head, warm even by day.
  make(scene, "lamp", 26, 78, (g) => {
    for (let i = 0; i < 3; i += 1) g.fillStyle(0x1a1208, 0.09).fillEllipse(13, 74, 18 - i * 5, 6 - i);
    g.fillStyle(0x23272e, 1).fillRoundedRect(8, 68, 10, 7, 2);
    g.fillStyle(0x2f343c, 1).fillRect(11.5, 22, 3, 47);
    g.fillStyle(0x4b5260, 1).fillRect(12, 22, 1, 47);
    g.fillStyle(0x23272e, 1).fillRoundedRect(9, 19, 8, 4, 1);
    // Lantern.
    g.fillStyle(0x23272e, 1).fillTriangle(5, 8, 21, 8, 13, 1);
    g.fillStyle(0xffd27a, 1).fillRect(7, 8, 12, 11);
    g.fillStyle(0xfff3c4, 1).fillRect(9, 9, 4, 9);
    g.lineStyle(1.5, 0x15181c, 1).strokeRect(7, 8, 12, 11).lineBetween(13, 8, 13, 19);
    g.fillStyle(0x23272e, 1).fillRect(6, 18, 14, 2);
  });
  // Planter box: stone or wood, a shrub and flowers.
  make(scene, "planter", 52, 40, (g) => {
    for (let i = 0; i < 3; i += 1) g.fillStyle(0x1a1208, 0.09).fillEllipse(27, 37, 54 - i * 12, 7 - i);
    g.fillStyle(0x8a5a32, 1).fillRoundedRect(3, 20, 46, 16, 3);
    g.fillStyle(0xa8743f, 1).fillRect(5, 21, 42, 4);
    g.lineStyle(1, 0x6b4423, 1).lineBetween(3, 28, 49, 28);
    g.lineStyle(2, OUT, 1).strokeRoundedRect(3, 20, 46, 16, 3);
    const b: [number, number, number][] = [[12, 16, 8], [26, 12, 10], [40, 16, 8]];
    g.fillStyle(OUT, 1);
    for (const [x, y, r] of b) g.fillCircle(x, y, r + 1.8);
    g.fillStyle(0x3a7f33, 1);
    for (const [x, y, r] of b) g.fillCircle(x, y, r);
    g.fillStyle(0x5aae46, 1);
    for (const [x, y, r] of b) g.fillCircle(x - 2, y - 2, r * 0.6);
    const fl = [0xf472b6, 0xfacc15, 0xffffff, 0xfb7185, 0xf472b6];
    for (let i = 0; i < 9; i += 1) g.fillStyle(fl[i % fl.length]!, 1).fillCircle(7 + i * 4.6, 10 + ((i * 7) % 9), 2);
  });
  // Market stall: a striped awning, crates of fruit and vegetables.
  make(scene, "stall", 70, 64, (g) => {
    for (let i = 0; i < 3; i += 1) g.fillStyle(0x1a1208, 0.1).fillEllipse(36, 60, 66 - i * 14, 8 - i);
    g.fillStyle(0x6b4423, 1).fillRect(7, 18, 4, 40).fillRect(59, 18, 4, 40);
    // Table and crates.
    g.fillStyle(0x8a5a32, 1).fillRect(5, 38, 60, 16);
    g.fillStyle(0xa8743f, 1).fillRect(5, 38, 60, 4);
    g.lineStyle(2, OUT, 1).strokeRect(5, 38, 60, 16);
    const produce: [number, number][] = [[0xef4444, 13], [0xf59e0b, 27], [0x84cc16, 41], [0xfacc15, 55]];
    for (const [c, x] of produce) {
      g.fillStyle(0x6b4423, 1).fillRect(x - 6, 32, 13, 8);
      for (let k = 0; k < 4; k += 1) g.fillStyle(c, 1).fillCircle(x - 3 + (k % 2) * 6, 31 + Math.floor(k / 2) * 3, 3);
      g.fillStyle(0xffffff, 0.5).fillCircle(x - 4, 29.5, 1);
    }
    // Awning: green and white stripes with a scalloped edge.
    for (let i = 0; i < 8; i += 1) {
      g.fillStyle(i % 2 ? 0xf8fafc : 0x16a34a, 1).fillRect(2 + i * 8.25, 6, 8.25, 14);
      g.fillStyle(i % 2 ? 0xf8fafc : 0x16a34a, 1).fillCircle(6.1 + i * 8.25, 20, 4.1);
    }
    g.fillStyle(0x000000, 0.12).fillRect(2, 6, 66, 4);
    g.lineStyle(2, OUT, 1).strokeRect(2, 6, 66, 14);
  });
  make(scene, "glow", 128, 128, (g) => {
    for (let r = 64; r > 0; r -= 8) g.fillStyle(0xffe9a3, 0.05).fillCircle(64, 64, r);
  });
  // Roadside kiosk: a little hut with a corrugated roof and a hatch.
  make(scene, "kiosk", 60, 62, (g) => {
    for (let i = 0; i < 3; i += 1) g.fillStyle(0x1a1208, 0.1).fillEllipse(31, 58, 54 - i * 12, 8 - i);
    g.fillStyle(0x2f7fbf, 1).fillRect(12, 26, 36, 30);
    g.fillStyle(0x4c9bd6, 1).fillRect(12, 26, 8, 30);
    g.fillStyle(0x23272e, 1).fillRect(18, 32, 24, 12);
    g.fillStyle(0xfacc15, 1).fillRect(20, 34, 6, 8);
    g.fillStyle(0xef4444, 1).fillRect(28, 34, 6, 8);
    g.fillStyle(0xffffff, 1).fillRect(36, 34, 4, 8);
    g.fillStyle(0xd6c7a8, 1).fillRect(14, 44, 32, 4);
    g.lineStyle(2, OUT, 1).strokeRect(12, 26, 36, 30);
    g.fillStyle(0xb8bec7, 1).fillPoints([{ x: 4, y: 28 }, { x: 10, y: 12 }, { x: 50, y: 12 }, { x: 56, y: 28 }], true);
    g.lineStyle(1, 0x8b939e, 1);
    for (let x = 10; x < 52; x += 5) g.lineBetween(x, 13, x - 3, 27);
    g.lineStyle(2, OUT, 1).strokePoints([{ x: 4, y: 28 }, { x: 10, y: 12 }, { x: 50, y: 12 }, { x: 56, y: 28 }], true);
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

/**
 * A name in a dark rounded pill, the game's one style for names on the map:
 * people, places and the YOU marker. `pointer` adds a little arrow underneath.
 */
export function pill(scene: Phaser.Scene, x: number, y: number, text: string, opts: { size?: number; color?: string; pointer?: number } = {}) {
  const size = opts.size ?? 11;
  const label = scene.add
    .text(0, 0, text, { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: "900", color: opts.color ?? "#ffffff" })
    .setResolution(3)
    .setOrigin(0.5);
  const w = label.width + size * 1.3;
  const h = size + 9;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.22).fillRoundedRect(-w / 2, -h / 2 + 2, w, h, h / 2);
  g.fillStyle(0x141b2d, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(1, 0xffffff, 0.14).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  if (opts.pointer != null) g.fillStyle(opts.pointer, 1).fillTriangle(-5, h / 2 + 1, 5, h / 2 + 1, 0, h / 2 + 7);
  return scene.add.container(x, y, [g, label]);
}

/** A signpost for a place you can enter: a wooden board with its icon and name, and a soft glowing ring on the ground. */
export function signpost(scene: Phaser.Scene, x: number, y: number, name: string, icon: string, color: number) {
  void color;
  const W = 66;
  const ground = 24;
  // The name, printed on the board's lower band.
  const text = scene.add
    .text(0, 0, name, { fontFamily: GAME_FONT, fontSize: "8.5px", fontStyle: "900", color: "#fdf3dc", align: "center", wordWrap: { width: W - 10 }, lineSpacing: -2 })
    .setResolution(3)
    .setOrigin(0.5, 0);
  const band = Math.max(14, text.height + 5);
  const iconH = 28;
  const bottom = -6;
  const top = bottom - (6 + iconH + band);
  const g = scene.add.graphics();
  // Post and its contact shadow.
  g.fillStyle(0x000000, 0.25).fillEllipse(0, ground, 26, 7);
  g.fillStyle(0x5b3a1e, 1).fillRect(-4, bottom - 2, 8, ground - bottom + 2);
  g.fillStyle(0x7a4f2b, 1).fillRect(-4, bottom - 2, 3, ground - bottom + 2);
  g.lineStyle(2, INK, 1).strokeRect(-4, bottom - 2, 8, ground - bottom + 2);
  // Board: a wooden frame, a cream face for the icon and a dark band for the name.
  g.fillStyle(0x000000, 0.2).fillRoundedRect(-W / 2 + 3, top + 4, W, bottom - top, 7);
  g.fillStyle(0x6b4423, 1).fillRoundedRect(-W / 2, top, W, bottom - top, 7);
  g.fillStyle(0x8a5a32, 1).fillRoundedRect(-W / 2, top, W, 5, { tl: 7, tr: 7, bl: 0, br: 0 });
  g.fillStyle(0xf6ead2, 1).fillRoundedRect(-W / 2 + 5, top + 5, W - 10, iconH, 4);
  g.fillStyle(0xffffff, 0.35).fillRect(-W / 2 + 7, top + 7, W - 14, 4);
  g.fillStyle(0x4a2e17, 1).fillRoundedRect(-W / 2 + 5, top + 5 + iconH + 1, W - 10, band - 5, 3);
  g.lineStyle(2.5, INK, 1).strokeRoundedRect(-W / 2, top, W, bottom - top, 7);
  const glyph = scene.add.text(0, top + 5 + iconH / 2, icon, { fontSize: "18px" }).setOrigin(0.5);
  text.setPosition(0, top + 5 + iconH + 2);
  // The ring on the ground: soft gold glow, gently breathing.
  const ring = scene.add.graphics().setPosition(x, y + ground).setDepth(4.2);
  ring.fillStyle(0xffb547, 0.12).fillEllipse(0, 0, 58, 19);
  ring.lineStyle(8, 0xffa62b, 0.14).strokeEllipse(0, 0, 58, 19);
  ring.lineStyle(4.5, 0xffb547, 0.35).strokeEllipse(0, 0, 56, 18);
  ring.lineStyle(2, 0xffd27a, 0.95).strokeEllipse(0, 0, 54, 17);
  scene.tweens.add({ targets: ring, scaleX: 1.07, scaleY: 1.07, alpha: 0.7, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  // Boards stand a little taller than a person, no more.
  const c = scene.add.container(x, y, [g, glyph, text]).setScale(0.82).setDepth(5 + (y + ground) / 10000) as Phaser.GameObjects.Container & { ring: typeof ring };
  g.setPosition(0, ground * 0.22);
  glyph.y += ground * 0.22;
  text.y += ground * 0.22;
  c.ring = ring;
  const setVisible = c.setVisible.bind(c);
  c.setVisible = (v: boolean) => {
    ring.setVisible(v);
    return setVisible(v);
  };
  return c;
}
