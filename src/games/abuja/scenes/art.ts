import * as Phaser from "phaser";
import { HAIR_COLOR, SKINS } from "../systems/art";

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

// ── Characters: bean bodies, tinted per outfit ──────────────────────────────

export const HAIR_STYLES = ["lowcut", "afro", "braids", "cornrows", "bun", "bald"] as const;

function makeCharacters(scene: Phaser.Scene) {
  // Body: white so it can be tinted to any outfit; shading in greys survives the tint.
  make(scene, "bean", 64, 72, (g) => {
    g.fillStyle(0xbfbfbf, 1).fillRoundedRect(4, 30, 14, 26, 6); // backpack
    g.lineStyle(LINE, INK, 1).strokeRoundedRect(4, 30, 14, 26, 6);
    g.fillStyle(0xffffff, 1).fillRoundedRect(12, 12, 40, 54, 20);
    g.fillStyle(0xd9d9d9, 1).fillRoundedRect(36, 18, 13, 44, { tl: 0, tr: 16, bl: 0, br: 16 });
    g.lineStyle(LINE, INK, 1).strokeRoundedRect(12, 12, 40, 54, 20);
  });
  make(scene, "leg", 16, 14, (g) => {
    g.fillStyle(0xffffff, 1).fillRoundedRect(2, 1, 12, 11, 5);
    g.lineStyle(3, INK, 1).strokeRoundedRect(2, 1, 12, 11, 5);
  });
  // Face window (the "visor"), tinted to skin tone.
  make(scene, "visor", 40, 28, (g) => {
    g.fillStyle(0xffffff, 1).fillRoundedRect(3, 3, 34, 22, 11);
    g.fillStyle(0xe6e6e6, 1).fillRoundedRect(22, 6, 12, 16, { tl: 0, tr: 8, bl: 0, br: 8 });
    g.lineStyle(3, INK, 1).strokeRoundedRect(3, 3, 34, 22, 11);
  });
  make(scene, "eyes", 24, 12, (g) => {
    g.fillStyle(INK, 1).fillCircle(5, 6, 3.4).fillCircle(17, 6, 3.4);
    g.fillStyle(0xffffff, 1).fillCircle(6, 5, 1.2).fillCircle(18, 5, 1.2);
  });
  make(scene, "shadow", 48, 14, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(24, 7, 46, 12);
  });
  const hair = hex(HAIR_COLOR);
  for (const style of HAIR_STYLES) {
    make(scene, `hair_${style}`, 56, 34, (g) => {
      g.fillStyle(hair, 1);
      g.lineStyle(3, INK, 1);
      if (style === "afro") {
        g.fillCircle(28, 20, 15).strokeCircle(28, 20, 15);
        g.fillCircle(16, 22, 9).fillCircle(40, 22, 9);
      } else if (style === "lowcut") {
        g.fillRoundedRect(12, 18, 32, 12, { tl: 12, tr: 12, bl: 0, br: 0 });
      } else if (style === "cornrows") {
        g.fillRoundedRect(12, 16, 32, 14, { tl: 12, tr: 12, bl: 0, br: 0 });
        g.lineStyle(2, 0x3a2a22, 1);
        for (let x = 18; x <= 38; x += 6) g.beginPath().moveTo(x, 18).lineTo(x, 29).strokePath();
      } else if (style === "braids") {
        g.fillRoundedRect(12, 16, 32, 14, { tl: 12, tr: 12, bl: 0, br: 0 });
        g.fillRoundedRect(8, 20, 7, 14, 3).fillRoundedRect(41, 20, 7, 14, 3);
      } else if (style === "bun") {
        g.fillRoundedRect(12, 18, 32, 12, { tl: 12, tr: 12, bl: 0, br: 0 });
        g.fillCircle(28, 10, 8).strokeCircle(28, 10, 8);
      } else {
        g.fillStyle(0xffffff, 0.35).fillEllipse(22, 26, 8, 4);
      }
    });
  }
}

export type Figure = Phaser.GameObjects.Container & { legs?: Phaser.GameObjects.Image[]; bodyParts?: Phaser.GameObjects.Container };

/** A bean character. Skin and hair default from a seed, so crowds look varied. */
export function figure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: { outfit: number; skin?: number; hair?: string; seed?: number; name?: string; nameColor?: string; scale?: number },
): Figure {
  const seed = opts.seed ?? Math.floor(x * 7 + y * 13);
  const skin = opts.skin ?? hex(SKINS[seed % SKINS.length]!);
  const hair = opts.hair ?? HAIR_STYLES[seed % HAIR_STYLES.length]!;
  const legL = scene.add.image(-9, 30, "leg").setTint(shade(opts.outfit, 0.8));
  const legR = scene.add.image(9, 30, "leg").setTint(shade(opts.outfit, 0.8));
  const parts = scene.add.container(0, 0, [
    scene.add.image(0, -4, "bean").setTint(opts.outfit),
    scene.add.image(4, -12, "visor").setTint(skin),
    scene.add.image(5, -12, "eyes"),
    scene.add.image(0, -38, `hair_${hair}`),
  ]);
  const items: Phaser.GameObjects.GameObject[] = [scene.add.image(0, 36, "shadow"), legL, legR, parts];
  if (opts.name) {
    items.push(
      scene.add
        .text(0, -68, opts.name, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: opts.nameColor ?? "#ffffff",
          stroke: "#141414",
          strokeThickness: 5,
        })
        .setOrigin(0.5),
    );
  }
  const c = scene.add.container(x, y, items) as Figure;
  c.legs = [legL, legR];
  c.bodyParts = parts;
  c.setScale(opts.scale ?? 0.7);
  return c;
}

/** Step animation: legs swing and the body bobs while moving; face the way you walk. */
export function animateWalk(f: Figure, time: number, moving: boolean, dx: number) {
  if (!f.legs || !f.bodyParts) return;
  if (dx < -0.1) f.bodyParts.scaleX = -1;
  if (dx > 0.1) f.bodyParts.scaleX = 1;
  if (moving) {
    const t = time / 90;
    f.legs[0]!.y = 30 + Math.sin(t) * 4;
    f.legs[1]!.y = 30 - Math.sin(t) * 4;
    f.bodyParts.y = -Math.abs(Math.sin(t)) * 3;
  } else {
    f.legs[0]!.y = 30;
    f.legs[1]!.y = 30;
    f.bodyParts.y = 0;
  }
}

// ── Vehicles (top-down, facing right) ───────────────────────────────────────

function makeVehicles(scene: Phaser.Scene) {
  make(scene, "car", 64, 36, (g) => {
    g.fillStyle(0x000000, 0.25).fillRoundedRect(6, 8, 56, 26, 9);
    g.fillStyle(INK, 1).fillRoundedRect(10, 2, 10, 6, 2).fillRoundedRect(42, 2, 10, 6, 2).fillRoundedRect(10, 28, 10, 6, 2).fillRoundedRect(42, 28, 10, 6, 2);
    g.fillStyle(0xffffff, 1).fillRoundedRect(4, 6, 54, 24, 9);
    g.fillStyle(0xd0d0d0, 1).fillRoundedRect(20, 9, 22, 18, 5);
    g.fillStyle(0x9fd5f5, 1).fillRoundedRect(40, 9, 9, 18, 3).fillRoundedRect(15, 10, 6, 16, 2);
    g.fillStyle(0xfff3a0, 1).fillCircle(56, 10, 2.5).fillCircle(56, 26, 2.5);
    g.lineStyle(3, INK, 1).strokeRoundedRect(4, 6, 54, 24, 9);
  });
  make(scene, "danfo", 76, 38, (g) => {
    g.fillStyle(0x000000, 0.25).fillRoundedRect(6, 8, 68, 28, 8);
    g.fillStyle(0xf5b915, 1).fillRoundedRect(3, 5, 68, 28, 8);
    g.fillStyle(INK, 1).fillRect(8, 16, 56, 5);
    g.fillStyle(0x9fd5f5, 1).fillRoundedRect(58, 9, 9, 20, 3);
    g.fillStyle(0xe5a50f, 1).fillRoundedRect(12, 8, 40, 7, 3);
    g.lineStyle(3, INK, 1).strokeRoundedRect(3, 5, 68, 28, 8);
  });
  make(scene, "keke", 46, 34, (g) => {
    g.fillStyle(0x000000, 0.25).fillEllipse(24, 22, 40, 22);
    g.fillStyle(INK, 1).fillCircle(8, 6, 4).fillCircle(8, 28, 4).fillCircle(40, 17, 4);
    g.fillStyle(0x16a34a, 1).fillRoundedRect(4, 7, 34, 20, 8);
    g.fillStyle(0xfacc15, 1).fillRoundedRect(8, 9, 22, 16, 5);
    g.fillStyle(0x9fd5f5, 1).fillRoundedRect(30, 10, 6, 14, 2);
    g.lineStyle(3, INK, 1).strokeRoundedRect(4, 7, 34, 20, 8);
  });
  make(scene, "okada", 40, 24, (g) => {
    g.fillStyle(INK, 1).fillCircle(6, 12, 5).fillCircle(34, 12, 5);
    g.fillStyle(0xdc2626, 1).fillRoundedRect(8, 8, 24, 8, 4);
    g.fillStyle(0x7c3aed, 1).fillCircle(18, 12, 7);
    g.lineStyle(3, INK, 1).strokeCircle(18, 12, 7).strokeRoundedRect(8, 8, 24, 8, 4);
  });
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
  makeCharacters(scene);
  makeVehicles(scene);
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
