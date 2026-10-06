import * as Phaser from "phaser";
import { characterParts, dims, lookKey, type Look } from "../systems/character";
import { FLEET, vehicleBox, vehicleKey, vehicleSvg, type VehicleKind, type VehicleStyle, type VehicleView } from "../systems/vehicles";

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

const TILES: Record<string, { base: number; dots: number[]; kind: "grass" | "dirt" | "grid" | "noise" | "water" }> = {
  grass: { base: 0x5fae45, dots: [0x4f9a37, 0x72c254, 0x8bd16a], kind: "grass" },
  lawn: { base: 0x4fa64a, dots: [0x5cb956, 0x45943f], kind: "grass" },
  dirt: { base: 0xb98656, dots: [0xa77446, 0xc9996a, 0x8f6239], kind: "dirt" },
  sand: { base: 0xe2c48a, dots: [0xd4b277, 0xeed6a5], kind: "dirt" },
  pavement: { base: 0xc9c2b6, dots: [0xb7afa2], kind: "grid" },
  plaza: { base: 0xdcd3c3, dots: [0xcbc1af], kind: "grid" },
  floor: { base: 0xd8cdb8, dots: [0xc7bba4], kind: "grid" },
  asphalt: { base: 0x3d3b40, dots: [0x47454b, 0x343236], kind: "noise" },
  water: { base: 0x3a8fd1, dots: [0x5aa7e0, 0x2f7bb8], kind: "water" },
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

// ── Characters: chibi people drawn as SVG (systems/character.ts) ────────────

/** Texture pixels per drawing unit: crisp on phones without wasting memory. */
const RES = 1.1;

function makeShadow(scene: Phaser.Scene) {
  make(scene, "shadow", 48, 14, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(24, 7, 46, 12);
  });
}

// ── Vehicles (drawn as SVG in systems/vehicles.ts) ──────────────────────────

const VRES = 1.4;
/** Pixels per drawing unit on the map: a car is a bit longer than two people are tall. */
export const VEHICLE_SCALE: Record<VehicleKind, number> = { car: 0.4, taxi: 0.4, okada: 0.36, keke: 0.38, bus: 0.44 };

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
  if (view !== v.view) {
    v.view = view;
    v.setTexture(`${vehicleKey(v.style)}_${view}`).setOrigin(0.5, vehicleBox(v.style.kind, view).groundY);
  }
  v.setFlipX(view === "side" && dx < 0);
}

export type Person = { look: Look; adult: boolean };

const charKey = ({ look, adult }: Person) => `ch_${lookKey(look)}${adult ? "a" : "k"}`;

/** Queue the textures for these people in the scene's loader (call from preload). */
export function queueCharacters(scene: Phaser.Scene, people: Person[]) {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const person of people) {
    const key = charKey(person);
    if (seen.has(key) || scene.textures.exists(`${key}_front`)) continue;
    seen.add(key);
    const parts = characterParts(person.look, person.adult, RES);
    for (const part of ["front", "back", "side", "leg", "legSide"] as const) {
      const url = URL.createObjectURL(new Blob([parts[part]], { type: "image/svg+xml" }));
      urls.push(url);
      scene.load.svg(`${key}_${part}`, url);
    }
  }
  if (urls.length) scene.load.once("complete", () => urls.forEach((url) => URL.revokeObjectURL(url)));
}

type Facing = "front" | "back" | "side";

export type Figure = Phaser.GameObjects.Container & {
  rig: Phaser.GameObjects.Container;
  legs: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  upper: Phaser.GameObjects.Image;
  /** Height of the top of the head above the figure's position, in pixels (negative). */
  headTop: number;
  key: string;
  facing: Facing;
  dims: ReturnType<typeof dims>;
};

const FEET = 10; // feet sit this many pixels below the figure's position

/** A person. `unit` is pixels per drawing unit: about 0.2 for people, smaller for crowds. */
export function figure(scene: Phaser.Scene, x: number, y: number, person: Person, opts: { name?: string; nameColor?: string; unit?: number } = {}): Figure {
  const unit = opts.unit ?? 0.2;
  const key = charKey(person);
  const d = dims(person.look, person.adult);
  const legA = scene.add.image(0, 0, `${key}_leg`).setOrigin(0.5, 0).setScale(1 / RES);
  const legB = scene.add.image(0, 0, `${key}_leg`).setOrigin(0.5, 0).setScale(1 / RES);
  const upper = scene.add.image(-d.width / 2, -d.hipY + d.upperTop, `${key}_front`).setOrigin(0, 0).setScale(1 / RES);
  const rig = scene.add.container(0, FEET - d.legH * unit, [legA, legB, upper]).setScale(unit);
  const headTop = rig.y + (d.headTop - d.hipY) * unit;
  const items: Phaser.GameObjects.GameObject[] = [scene.add.image(0, FEET - 2, "shadow").setScale(unit * 2.2, unit * 2), rig];
  if (opts.name) {
    items.push(
      scene.add
        .text(0, headTop - 10, opts.name, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: opts.nameColor ?? "#ffffff",
          stroke: "#0b1726",
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );
  }
  const c = scene.add.container(x, y, items) as Figure;
  c.rig = rig;
  c.legs = [legA, legB];
  c.upper = upper;
  c.headTop = headTop;
  c.key = key;
  c.dims = d;
  c.facing = "side"; // so the first setFacing lays the legs out
  setFacing(c, "front");
  return c;
}

function setFacing(f: Figure, facing: Facing) {
  if (f.facing === facing) return;
  f.facing = facing;
  f.upper.setTexture(`${f.key}_${facing}`);
  const [a, b] = f.legs;
  if (facing === "side") {
    a.setTexture(`${f.key}_legSide`).setFlipX(false).setPosition(-3, 0).setTint(0xd8d8d8);
    b.setTexture(`${f.key}_legSide`).setFlipX(false).setPosition(1, 0).clearTint();
  } else {
    a.setTexture(`${f.key}_leg`).setFlipX(false).setPosition(-f.dims.legX + 1, 0).clearTint().setRotation(0);
    b.setTexture(`${f.key}_leg`).setFlipX(true).setPosition(f.dims.legX - 1, 0).clearTint().setRotation(0);
    f.rig.scaleX = Math.abs(f.rig.scaleX);
  }
}

/** Step animation: legs lift (or swing, side on), the body bobs, and the person faces where they walk. */
export function animateWalk(f: Figure, time: number, moving: boolean, dx: number, dy = 0) {
  if (moving) {
    if (Math.abs(dx) > 0.1 && Math.abs(dx) >= Math.abs(dy) * 0.8) setFacing(f, "side");
    else if (dy < -0.1) setFacing(f, "back");
    else if (dy > 0.1) setFacing(f, "front");
    if (f.facing === "side") {
      const sx = Math.abs(f.rig.scaleX);
      f.rig.scaleX = dx < 0 ? -sx : sx;
    }
  }
  const [a, b] = f.legs;
  const base = -f.dims.hipY + f.dims.upperTop;
  if (!moving) {
    a.y = b.y = 0;
    a.rotation = b.rotation = 0;
    f.upper.y = base;
    return;
  }
  const t = time / 85;
  if (f.facing === "side") {
    a.rotation = Math.sin(t) * 0.5;
    b.rotation = -Math.sin(t) * 0.5;
    a.y = b.y = 0;
  } else {
    a.y = Math.min(0, Math.sin(t) * 6);
    b.y = Math.min(0, -Math.sin(t) * 6);
  }
  f.upper.y = base - Math.abs(Math.sin(t)) * 4;
}

// ── Props ───────────────────────────────────────────────────────────────────

function makeProps(scene: Phaser.Scene) {
  make(scene, "tree", 72, 80, (g) => {
    g.fillStyle(0x000000, 0.22).fillEllipse(38, 70, 56, 16);
    g.fillStyle(0x6b4423, 1).fillRect(31, 48, 10, 22);
    g.lineStyle(3, INK, 1).strokeRect(31, 48, 10, 22);
    g.fillStyle(0x2f8a3b, 1).fillCircle(24, 36, 18).fillCircle(48, 36, 18).fillCircle(36, 22, 20);
    g.lineStyle(LINE, INK, 1).strokeCircle(24, 36, 18).strokeCircle(48, 36, 18).strokeCircle(36, 22, 20);
    g.fillStyle(0x2f8a3b, 1).fillCircle(24, 36, 15).fillCircle(48, 36, 15).fillCircle(36, 22, 17).fillCircle(36, 34, 16);
    g.fillStyle(0x47a952, 1).fillCircle(30, 18, 7).fillCircle(20, 32, 5);
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

export function building(scene: Phaser.Scene, s: { x: number; y: number; w: number; h: number; color?: string; label?: string }, seed: number) {
  const g = scene.add.graphics();
  const roof = hex(s.color ?? "#9ca3af");
  const wallH = Math.min(26, Math.max(10, s.h * 0.32));
  const roofH = s.h - wallH;
  if (s.h < 22) {
    // Fences and low walls.
    g.fillStyle(0xd6d3d1, 1).fillRect(s.x, s.y, s.w, s.h);
    g.fillStyle(0xa8a29e, 1);
    for (let x = s.x; x < s.x + s.w; x += 24) g.fillRect(x, s.y - 4, 6, s.h + 4);
    g.lineStyle(3, INK, 1).strokeRect(s.x, s.y, s.w, s.h);
    return g;
  }
  g.fillStyle(0x000000, 0.25).fillRoundedRect(s.x + 6, s.y + 8, s.w, s.h, 6);
  // Front wall.
  g.fillStyle(0xf1e6d0, 1).fillRect(s.x, s.y + roofH, s.w, wallH);
  g.fillStyle(0xd9ccb2, 1).fillRect(s.x, s.y + s.h - 4, s.w, 4);
  // Roof with a ridge line and a lighter edge.
  g.fillStyle(roof, 1).fillRoundedRect(s.x, s.y, s.w, roofH, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(shade(roof, 1.18), 1).fillRect(s.x + 4, s.y + 4, s.w - 8, 5);
  g.fillStyle(shade(roof, 0.82), 1).fillRect(s.x, s.y + roofH - 6, s.w, 6);
  // Windows and a door on the front wall.
  const r = rand(seed + 11);
  const door = s.x + s.w / 2 - 8;
  for (let wx = s.x + 10; wx < s.x + s.w - 20; wx += 26) {
    if (Math.abs(wx - door) < 22) continue;
    g.fillStyle(0x9fd5f5, 1).fillRect(wx, s.y + roofH + 4, 13, Math.max(5, wallH - 10));
    g.lineStyle(2, INK, 1).strokeRect(wx, s.y + roofH + 4, 13, Math.max(5, wallH - 10));
  }
  g.fillStyle(0x7c4a24, 1).fillRect(door, s.y + s.h - Math.min(22, wallH), 16, Math.min(22, wallH));
  g.lineStyle(2, INK, 1).strokeRect(door, s.y + s.h - Math.min(22, wallH), 16, Math.min(22, wallH));
  g.lineStyle(LINE, INK, 1).strokeRoundedRect(s.x, s.y, s.w, s.h, 6);
  g.lineStyle(2, INK, 0.6).beginPath().moveTo(s.x, s.y + roofH).lineTo(s.x + s.w, s.y + roofH).strokePath();
  // Rooftop details: a black water tank and an AC unit, very Abuja.
  const props: Phaser.GameObjects.GameObject[] = [g];
  if (s.w > 60 && roofH > 30 && r() > 0.3) props.push(scene.add.image(s.x + 14 + r() * (s.w - 40), s.y + roofH / 2 - 2, "tank"));
  if (s.w > 90 && roofH > 30 && r() > 0.4) {
    const ac = scene.add.graphics();
    const ax = s.x + s.w - 34;
    const ay = s.y + 10;
    ac.fillStyle(0xe5e7eb, 1).fillRect(ax, ay, 22, 14).lineStyle(2, INK, 1).strokeRect(ax, ay, 22, 14).strokeCircle(ax + 11, ay + 7, 4);
    props.push(ac);
  }
  if (s.label) {
    props.push(
      scene.add
        .text(s.x + s.w / 2, s.y + roofH / 2, s.label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#141414",
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );
  }
  return g;
}

/** A signpost for a place you can enter: icon, name, and a glowing doormat. */
export function signpost(scene: Phaser.Scene, x: number, y: number, name: string, icon: string, color: number) {
  const mat = scene.add.ellipse(0, 26, 70, 22, color, 0.35).setStrokeStyle(3, color, 0.9);
  const post = scene.add.rectangle(0, -2, 6, 40, 0x6b4423).setStrokeStyle(2, INK);
  const board = scene.add.rectangle(0, -30, 46, 36, 0xfffbeb).setStrokeStyle(3, INK);
  const glyph = scene.add.text(0, -30, icon, { fontSize: "22px" }).setOrigin(0.5);
  const text = scene.add
    .text(0, 44, name, { fontFamily: "system-ui, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#ffffff", stroke: "#141414", strokeThickness: 4 })
    .setOrigin(0.5, 0);
  scene.tweens.add({ targets: mat, scaleX: 1.15, scaleY: 1.15, alpha: 0.6, duration: 1000, yoyo: true, repeat: -1 });
  return scene.add.container(x, y, [mat, post, board, glyph, text]).setDepth(4);
}
