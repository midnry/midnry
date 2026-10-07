import { GAME_FONT } from "../ui/theme";
import * as Phaser from "phaser";
import { ZONE_COLORS } from "../systems/city/catalog";
import { building } from "../systems/city/catalog";
import { LAKE, RAIL, ROADS, type Lot } from "../systems/city/layout";
import { WORLD } from "../systems/data";
import type { MapRect } from "../systems/types";
import { INK, rand } from "./art";

// The city between the buildings: expressway medians, the light rail, a
// bridge over Jabi Lake, bus stops, benches, bins, billboards and street
// signs, and rocks, ponds and grass. Drawn in the same outlined style as
// everything else.

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

const ADS = [
  { text: "ZOOM RIDES", bg: 0x1d4ed8 },
  { text: "NAIJA TELECOM", bg: 0x16a34a },
  { text: "QUICKKASH 5 MINS", bg: 0xdc2626 },
  { text: "CHOPNOW", bg: 0xf59e0b },
  { text: "VOTE WISELY", bg: 0x7c3aed },
];

export function makeDecorTextures(scene: Phaser.Scene) {
  make(scene, "bench", 30, 18, (g) => {
    g.fillStyle(0x000000, 0.2).fillEllipse(15, 15, 28, 5);
    g.fillStyle(0x8b5a2b, 1).fillRect(2, 4, 26, 4).fillRect(2, 9, 26, 3);
    g.fillStyle(0x374151, 1).fillRect(4, 12, 2, 5).fillRect(24, 12, 2, 5);
    g.lineStyle(1.5, INK, 1).strokeRect(2, 4, 26, 4).strokeRect(2, 9, 26, 3);
  });
  make(scene, "bin", 14, 20, (g) => {
    g.fillStyle(0x000000, 0.2).fillEllipse(7, 18, 12, 4);
    g.fillStyle(0x15803d, 1).fillRect(2, 5, 10, 13);
    g.fillStyle(0x166534, 1).fillRect(1, 3, 12, 3);
    g.lineStyle(1.5, INK, 1).strokeRect(2, 5, 10, 13).strokeRect(1, 3, 12, 3);
  });
  make(scene, "busstop", 50, 46, (g) => {
    g.fillStyle(0x000000, 0.2).fillEllipse(25, 43, 46, 6);
    g.fillStyle(0x1e3a8a, 1).fillRect(3, 6, 44, 6);
    g.fillStyle(0x9fd5f5, 0.55).fillRect(5, 12, 40, 22);
    g.fillStyle(0x374151, 1).fillRect(4, 12, 2, 30).fillRect(44, 12, 2, 30);
    g.fillStyle(0x8b5a2b, 1).fillRect(10, 30, 30, 4);
    g.lineStyle(1.5, INK, 1).strokeRect(3, 6, 44, 6).strokeRect(5, 12, 40, 22);
    g.fillStyle(0xfacc15, 1).fillCircle(46, 6, 5);
    g.lineStyle(1.5, INK, 1).strokeCircle(46, 6, 5);
  });
  ADS.forEach((ad, i) =>
    make(scene, `billboard${i}`, 64, 60, (g) => {
      g.fillStyle(0x000000, 0.2).fillEllipse(32, 57, 40, 6);
      g.fillStyle(0x4b5563, 1).fillRect(20, 28, 4, 30).fillRect(40, 28, 4, 30);
      g.fillStyle(ad.bg, 1).fillRect(2, 2, 60, 28);
      g.fillStyle(0xffffff, 0.9).fillRect(6, 20, 52, 3);
      g.lineStyle(2, INK, 1).strokeRect(2, 2, 60, 28);
    }),
  );
  make(scene, "rock", 30, 22, (g) => {
    g.fillStyle(0x000000, 0.18).fillEllipse(15, 19, 28, 6);
    g.fillStyle(0x9ca3af, 1).fillEllipse(12, 12, 20, 16).fillEllipse(20, 14, 14, 11);
    g.fillStyle(0xd1d5db, 1).fillEllipse(9, 9, 8, 5);
    g.lineStyle(1.5, INK, 1).strokeEllipse(12, 12, 20, 16).strokeEllipse(20, 14, 14, 11);
  });
  make(scene, "boulders", 56, 40, (g) => {
    g.fillStyle(0x000000, 0.18).fillEllipse(28, 36, 52, 8);
    for (const [x, y, rx, ry] of [[18, 22, 16, 14], [36, 24, 15, 12], [27, 13, 12, 10]] as const) {
      g.fillStyle(0xa8a29e, 1).fillEllipse(x, y, rx * 2, ry * 2);
      g.lineStyle(1.5, INK, 1).strokeEllipse(x, y, rx * 2, ry * 2);
    }
    g.fillStyle(0xd6d3d1, 1).fillEllipse(23, 10, 8, 4);
  });
  make(scene, "grass", 22, 14, (g) => {
    g.fillStyle(0x3f9b3a, 1);
    for (let i = 0; i < 6; i++) g.fillTriangle(2 + i * 3.4, 13, 4 + i * 3.4, 2 + (i % 2) * 3, 6 + i * 3.4, 13);
  });
  make(scene, "pond", 70, 40, (g) => {
    g.fillStyle(0x6b7280, 1).fillEllipse(35, 20, 68, 36);
    g.fillStyle(0x38bdf8, 1).fillEllipse(35, 20, 60, 29);
    g.fillStyle(0x7dd3fc, 1).fillEllipse(28, 16, 26, 10);
    g.lineStyle(1.5, INK, 1).strokeEllipse(35, 20, 68, 36);
    g.fillStyle(0x16a34a, 1).fillCircle(48, 24, 3).fillCircle(20, 26, 2.5);
  });
  make(scene, "streetsign", 44, 38, (g) => {
    g.fillStyle(0x374151, 1).fillRect(20, 12, 3, 26);
    g.fillStyle(0x15803d, 1).fillRect(2, 2, 40, 11);
    g.lineStyle(1.5, INK, 1).strokeRect(2, 2, 40, 11);
  });
  make(scene, "barrel", 14, 18, (g) => {
    g.fillStyle(0x1d4ed8, 1).fillRect(2, 2, 10, 15);
    g.fillStyle(0x1e40af, 1).fillRect(2, 6, 10, 2).fillRect(2, 11, 10, 2);
    g.lineStyle(1.5, INK, 1).strokeRect(2, 2, 10, 15);
  });
  make(scene, "fence", 48, 14, (g) => {
    g.fillStyle(0xd6d3d1, 1);
    for (let x = 2; x < 46; x += 6) g.fillRect(x, 2, 3, 11);
    g.fillRect(0, 5, 48, 2).fillRect(0, 9, 48, 2);
    g.lineStyle(1, INK, 0.8).strokeRect(0, 5, 48, 2).strokeRect(0, 9, 48, 2);
  });
  make(scene, "train", 220, 40, (g) => {
    for (let c = 0; c < 3; c++) {
      const x = 2 + c * 72;
      g.fillStyle(0x000000, 0.25).fillRect(x + 2, 32, 66, 6);
      g.fillStyle(0xf5f5f4, 1).fillRoundedRect(x, 6, 68, 28, 6);
      g.fillStyle(0x16a34a, 1).fillRect(x, 24, 68, 5);
      g.fillStyle(0x1e3a5f, 1);
      for (let w = 0; w < 5; w++) g.fillRect(x + 6 + w * 12, 11, 8, 9);
      g.lineStyle(2, INK, 1).strokeRoundedRect(x, 6, 68, 28, 6);
    }
  });
}

/** Grass medians with palms between the paired roads: Abuja's expressways. */
export function drawMedians(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(1.5);
  const pairs = (list: number[]) => list.flatMap((a, i) => list.slice(i + 1).filter((b) => b - a <= 120).map((b) => [a, b] as const));
  const r = rand(4242);
  for (const [a, b] of pairs(ROADS.ys)) {
    const top = a + 37;
    const h = b - a - 74;
    if (h < 10) continue;
    g.fillStyle(0x4f9a37, 1).fillRect(0, top, WORLD.width, h);
    g.lineStyle(2, 0xd6d0c4, 1).strokeRect(-2, top, WORLD.width + 4, h);
    for (let x = 30; x < WORLD.width; x += 90) if (ROADS.xs.every((rx) => Math.abs(rx - x) > 70)) scene.add.image(x + r() * 20, top + h / 2 + 4, r() < 0.5 ? "palm" : "bush").setOrigin(0.5, 0.85).setScale(0.55).setDepth(5 + (top + h) / 10000);
  }
  for (const [a, b] of pairs(ROADS.xs)) {
    const left = a + 37;
    const w = b - a - 74;
    if (w < 10) continue;
    g.fillStyle(0x4f9a37, 1).fillRect(left, 0, w, WORLD.height);
    g.lineStyle(2, 0xd6d0c4, 1).strokeRect(left, -2, w, WORLD.height + 4);
    for (let y = 40; y < WORLD.height; y += 100) if (ROADS.ys.every((ry) => Math.abs(ry - y) > 70)) scene.add.image(left + w / 2, y + r() * 20, r() < 0.5 ? "palm" : "bush").setOrigin(0.5, 0.85).setScale(0.55).setDepth(5 + y / 10000);
  }
}

/** The light rail: track, a station and a tunnel mouth, and a train that comes and goes. */
export function drawRail(scene: Phaser.Scene) {
  const y = RAIL.y;
  const g = scene.add.graphics().setDepth(1.6);
  g.fillStyle(0x9a8f7f, 1).fillRect(0, y - 16, WORLD.width, 32);
  g.fillStyle(0x6b5b45, 1);
  for (let x = 0; x < WORLD.width; x += 12) g.fillRect(x, y - 12, 6, 24);
  g.lineStyle(3, 0x4b5563, 1).lineBetween(0, y - 7, WORLD.width, y - 7).lineBetween(0, y + 7, WORLD.width, y + 7);
  g.lineStyle(2, INK, 0.5).lineBetween(0, y - 17, WORLD.width, y - 17);
  // Level crossings where the roads cross the line.
  g.fillStyle(0x3d3b40, 1);
  for (const x of ROADS.xs) g.fillRect(x - 24, y - 16, 48, 32);
  g.fillStyle(0xffffff, 0.9);
  for (const x of ROADS.xs) for (let i = 0; i < 4; i++) g.fillRect(x - 22 + i * 12, y - 20, 6, 3);
  // Station: a platform and a canopy.
  const s = RAIL.station;
  g.fillStyle(0xd6d3d1, 1).fillRect(s.x - 90, y - 30, 180, 12);
  g.lineStyle(2, INK, 1).strokeRect(s.x - 90, y - 30, 180, 12);
  const canopy = scene.add.graphics().setDepth(5 + (y - 20) / 10000);
  canopy.fillStyle(0x16a34a, 1).fillRect(s.x - 80, y - 58, 160, 10);
  canopy.fillStyle(0x374151, 1).fillRect(s.x - 70, y - 48, 3, 20).fillRect(s.x + 67, y - 48, 3, 20);
  canopy.lineStyle(2, INK, 1).strokeRect(s.x - 80, y - 58, 160, 10);
  scene.add.text(s.x, y - 53, "METRO · GARKI", { fontFamily: GAME_FONT, fontSize: "9px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5).setResolution(2).setDepth(canopy.depth + 0.0001);
  // Tunnel mouth at the east end.
  const t = scene.add.graphics().setDepth(5 + (y + 16) / 10000);
  t.fillStyle(0x78716c, 1).fillRect(WORLD.width - 40, y - 36, 40, 52);
  t.fillStyle(0x1c1917, 1).fillRoundedRect(WORLD.width - 34, y - 26, 34, 42, { tl: 14, tr: 0, bl: 0, br: 0 });
  t.lineStyle(2, INK, 1).strokeRect(WORLD.width - 40, y - 36, 40, 52);
  const train = scene.add.image(-240, y - 4, "train").setOrigin(0, 0.5).setDepth(5 + (y + 10) / 10000);
  return {
    /** Move the train: in from the west, a stop at the station, on into the tunnel. */
    update(time: number) {
      const cycle = 46000;
      const k = (time % cycle) / cycle;
      const stopAt = s.x - 110;
      let x: number;
      if (k < 0.35) x = -240 + (stopAt + 240) * (k / 0.35);
      else if (k < 0.45) x = stopAt;
      else x = stopAt + (WORLD.width + 20 - stopAt) * ((k - 0.45) / 0.55);
      train.x = x;
      train.setVisible(x < WORLD.width - 30);
    },
  };
}

/** A footbridge across Jabi Lake (the lake's solid has a gap for it). */
export function drawBridge(scene: Phaser.Scene) {
  const y = LAKE.y;
  const x0 = LAKE.x - LAKE.rx - 30;
  const x1 = LAKE.x + LAKE.rx + 30;
  const g = scene.add.graphics().setDepth(3.5);
  g.fillStyle(0x000000, 0.2).fillRect(x0, y + 12, x1 - x0, 8);
  g.fillStyle(0xb98154, 1).fillRect(x0, y - 14, x1 - x0, 28);
  g.fillStyle(0x9c6a42, 1);
  for (let x = x0; x < x1; x += 10) g.fillRect(x, y - 14, 2, 28);
  g.lineStyle(2, INK, 1).strokeRect(x0, y - 14, x1 - x0, 28);
  const rail = scene.add.graphics().setDepth(5 + (y + 14) / 10000);
  rail.lineStyle(3, 0xf5f5f4, 1).lineBetween(x0, y - 14, x1, y - 14).lineBetween(x0, y + 14, x1, y + 14);
  rail.lineStyle(1.5, INK, 1).lineBetween(x0, y - 16, x1, y - 16).lineBetween(x0, y + 16, x1, y + 16);
  for (let x = x0; x <= x1; x += 24) rail.lineStyle(2, 0xf5f5f4, 1).lineBetween(x, y - 22, x, y - 14).lineBetween(x, y + 14, x, y + 8);
  for (const x of [x0 + 40, (x0 + x1) / 2, x1 - 40]) scene.add.image(x, y - 14, "lamp").setOrigin(0.5, 0.95).setScale(0.8).setDepth(5 + (y - 14) / 10000);
}

/** Things to see and use along the streets. Returns benches (you can sit on them) and new solids. */
export function drawStreetFurniture(scene: Phaser.Scene, solids: MapRect[], lots: Lot[]): { seats: { x: number; y: number }[]; stops: { x: number; y: number }[] } {
  const seats: { x: number; y: number }[] = [];
  /** Where people stand to wait for the bus. */
  const stops: { x: number; y: number }[] = [];
  const r = rand(9090);
  const clearOf = (x: number, y: number, rad: number) => !solids.some((s) => x > s.x - rad && x < s.x + s.w + rad && y > s.y - rad && y < s.y + s.h + rad) && !lots.some((l) => x > l.x - rad && x < l.x + l.w + rad && y > l.y - 20 && y < l.y + l.h + rad);
  const awayFromJunction = (v: number, list: number[]) => list.every((c) => Math.abs(v - c) > 90);
  const put = (key: string, x: number, y: number, scale = 1, solid?: { w: number; h: number }) => {
    if (!clearOf(x, y, 10)) return false;
    scene.add.image(x, y, key).setOrigin(0.5, 0.95).setScale(scale).setDepth(5 + y / 10000);
    if (solid) solids.push({ x: x - solid.w / 2, y: y - solid.h, w: solid.w, h: solid.h });
    return true;
  };
  let ad = 0;
  let k = 0;
  // Along every road, on the sidewalk: a rotation of bus stop, bench, bin and billboard.
  const kinds = ["busstop", "bench", "bin", "billboard", "bench", "sign"] as const;
  for (const x of ROADS.xs) {
    for (let y = 170; y < WORLD.height - 60; y += 230) {
      if (!awayFromJunction(y, ROADS.ys) || Math.abs(y - RAIL.y) < 60) continue;
      for (const side of [-1, 1] as const) {
        const kind = kinds[k++ % kinds.length]!;
        const px = x + side * 31;
        if (kind === "bench" && put("bench", px, y, 0.9)) seats.push({ x: px, y: y + 6 });
        if (kind === "bin") put("bin", px, y);
        if (kind === "busstop" && put("busstop", x + side * 52, y + 10, 0.8, { w: 34, h: 8 })) stops.push({ x: x + side * 31, y: y + 16 });
        if (kind === "billboard") {
          const bx = x + side * 60;
          if (put(`billboard${ad % ADS.length}`, bx, y, 0.9, { w: 40, h: 8 })) {
            scene.add.text(bx, y - 41, ADS[ad % ADS.length]!.text, { fontFamily: GAME_FONT, fontSize: "7px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5).setResolution(2).setDepth(5 + y / 10000 + 0.0001);
            ad += 1;
          }
        }
      }
    }
  }
  for (const y of ROADS.ys) {
    for (let x = 140; x < WORLD.width - 60; x += 260) {
      if (!awayFromJunction(x, ROADS.xs)) continue;
      for (const side of [-1, 1] as const) {
        const kind = kinds[k++ % kinds.length]!;
        const py = y + side * 31 + (side > 0 ? 8 : 0);
        if (kind === "bench" && put("bench", x, py, 0.9)) seats.push({ x, y: py + 6 });
        if (kind === "bin") put("bin", x + 20, py);
        if (kind === "busstop" && put("busstop", x, y + side * 50 + (side > 0 ? 16 : 0), 0.8, { w: 34, h: 8 })) stops.push({ x: x + 24, y: y + side * 31 + (side > 0 ? 14 : 0) });
      }
    }
  }
  // Street name signs at junctions.
  const NAMES = ["Ahmadu Bello Way", "Shehu Shagari Way", "Herbert Macaulay Way", "Independence Ave", "Constitution Ave", "Aminu Kano Cres", "Tafawa Balewa Way", "Adetokunbo Ademola Cres", "Ibrahim Babangida Way"];
  let ni = 0;
  for (const x of ROADS.xs) {
    for (const y of ROADS.ys) {
      const sx = x - 36;
      const sy = y - 36;
      if (!clearOf(sx, sy, 4)) continue;
      scene.add.image(sx, sy, "streetsign").setOrigin(0.5, 1).setScale(1.25, 1).setDepth(5 + sy / 10000);
      scene.add.text(sx, sy - 26, NAMES[ni++ % NAMES.length]!, { fontFamily: GAME_FONT, fontSize: "6.5px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5).setResolution(3).setDepth(5 + sy / 10000 + 0.0001);
    }
  }
  // Parks get benches you can sit on too.
  for (const l of lots) {
    const def = building(l.def);
    if (def?.art === "park") seats.push({ x: l.x + l.w * 0.26, y: l.y + l.h - l.h * 0.35 + 8 }, { x: l.x + l.w * 0.71, y: l.y + l.h - l.h * 0.55 + 8 });
  }
  void r;
  return { seats, stops };
}

/** Coloured zones over the map, shown while you explore. */
export function zoneOverlay(scene: Phaser.Scene, lots: Lot[]) {
  const g = scene.add.graphics().setDepth(29).setVisible(false);
  for (const l of lots) {
    const def = building(l.def);
    if (!def) continue;
    const c = Phaser.Display.Color.HexStringToColor(ZONE_COLORS[def.zone]).color;
    g.fillStyle(c, 0.32).fillRect(l.x - 4, l.y - 4, l.w + 8, l.h + 8);
    g.lineStyle(2, c, 0.9).strokeRect(l.x - 4, l.y - 4, l.w + 8, l.h + 8);
  }
  g.fillStyle(Phaser.Display.Color.HexStringToColor(ZONE_COLORS.rail).color, 0.35).fillRect(0, RAIL.y - 18, WORLD.width, 36);
  return g;
}
