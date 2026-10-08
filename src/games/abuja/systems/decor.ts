import { HOMES } from "./data";
import { FURNITURE } from "./furniture";
import { LAYOUTS, ROOM, type RoomInfo, type RoomItem, type RoomLayout, type RoomType } from "./rooms";
import { addStat, naira } from "./rules";
import { update } from "./store";
import type { GameState } from "./types";

// Decorating your own home: buy furniture, place it where you like, sell it
// back, and repaint the walls or relay the floor. Only your own living room
// and bedroom; the kitchen, doors and bathroom fittings stay where they are.

export type DecorCategory = "beds" | "sofas" | "tables" | "electronics" | "decor" | "lighting" | "rugs" | "storage";

export type DecorDef = { id: string; name: string; cat: DecorCategory; price: number; accents?: { name: string; color: string }[] };

const COLOURS = {
  blue: { name: "Blue", color: "#1f6fd1" },
  green: { name: "Green", color: "#166534" },
  grey: { name: "Grey", color: "#6b7280" },
  mustard: { name: "Mustard", color: "#ca8a04" },
  red: { name: "Red", color: "#b91c1c" },
  cream: { name: "Cream", color: "#e8d9b5" },
};

/** What the furniture shop sells, in naira. */
export const CATALOGUE: DecorDef[] = [
  { id: "bed_single", name: "Single bed", cat: "beds", price: 45_000, accents: [COLOURS.blue, COLOURS.green, COLOURS.grey] },
  { id: "bed", name: "Double bed", cat: "beds", price: 95_000, accents: [COLOURS.blue, COLOURS.green, COLOURS.red, COLOURS.grey] },
  { id: "bed_ankara", name: "Ankara double bed", cat: "beds", price: 130_000, accents: [COLOURS.mustard, COLOURS.green, COLOURS.red] },
  { id: "sofa", name: "Sofa", cat: "sofas", price: 110_000, accents: [COLOURS.green, COLOURS.grey, COLOURS.blue, COLOURS.mustard] },
  { id: "armchair", name: "Armchair", cat: "sofas", price: 45_000 },
  { id: "milkstool", name: "Stool", cat: "sofas", price: 6_000 },
  { id: "dining", name: "Dining table", cat: "tables", price: 70_000 },
  { id: "desk", name: "Desk with computer", cat: "tables", price: 160_000 },
  { id: "chair", name: "Chair", cat: "tables", price: 12_000, accents: [COLOURS.blue, COLOURS.red, COLOURS.green] },
  { id: "nightstand", name: "Bedside lamp table", cat: "tables", price: 18_000 },
  { id: "tvstand_flat", name: "Flat-screen TV", cat: "electronics", price: 240_000 },
  { id: "tv", name: "TV on a stand", cat: "electronics", price: 120_000 },
  { id: "speaker", name: "Speaker", cat: "electronics", price: 30_000 },
  { id: "fan", name: "Standing fan", cat: "electronics", price: 25_000 },
  { id: "plant", name: "Potted plant", cat: "decor", price: 6_000 },
  { id: "monstera", name: "Big plant", cat: "decor", price: 15_000 },
  { id: "picture", name: "Painting", cat: "decor", price: 8_000, accents: [COLOURS.green, COLOURS.red, COLOURS.blue] },
  { id: "poster", name: "Abuja print", cat: "decor", price: 5_000, accents: [COLOURS.green, COLOURS.blue] },
  { id: "clock", name: "Wall clock", cat: "decor", price: 6_000 },
  { id: "floorlamp", name: "Floor lamp", cat: "lighting", price: 18_000, accents: [COLOURS.cream, COLOURS.mustard, COLOURS.green] },
  { id: "walllamp", name: "Wall light", cat: "lighting", price: 9_000 },
  { id: "rug", name: "Round rug", cat: "rugs", price: 20_000, accents: [COLOURS.red, COLOURS.blue, COLOURS.green, COLOURS.mustard] },
  { id: "rug_ankara", name: "Ankara rug", cat: "rugs", price: 35_000, accents: [COLOURS.green, COLOURS.red, COLOURS.blue] },
  { id: "wardrobe", name: "Wardrobe", cat: "storage", price: 75_000 },
  { id: "dresser", name: "Dresser with mirror", cat: "storage", price: 55_000 },
  { id: "bookshelf", name: "Bookshelf", cat: "storage", price: 35_000 },
  { id: "wallshelf", name: "Wall shelf", cat: "storage", price: 10_000, accents: [COLOURS.green, COLOURS.blue] },
];

export const catalogueItem = (id: string) => CATALOGUE.find((c) => c.id === id);

/** Hang on the wall rather than stand on the floor. */
export const ON_WALL = new Set(["window", "picture", "clock", "blackboard", "whiteboard", "walldoor", "bathmirror", "wallshelf", "walllamp", "poster"]);
/** Built in: doors and the kitchen stay where they are. */
const FIXED = new Set(["walldoor", "window", "sink", "stove", "fridge", "bucket", "broom"]);
export const isFixed = (id: string) => FIXED.has(id);

export const WALL_COLOURS: { name: string; color: string }[] = [
  { name: "Sand", color: "#f3e2c3" },
  { name: "Cream", color: "#f7f1e3" },
  { name: "Sky", color: "#cfe3f2" },
  { name: "Mint", color: "#d4ecd9" },
  { name: "Peach", color: "#f6d3bf" },
  { name: "Lilac", color: "#e1d6ef" },
  { name: "Olive", color: "#cbd3a4" },
  { name: "Grey", color: "#d9cfbd" },
];
export const WALL_PRICE = 15_000;
export const FLOORS: { id: RoomLayout["floor"]; name: string; price: number }[] = [
  { id: "wood", name: "Wooden floor", price: 60_000 },
  { id: "tile", name: "Tiles", price: 45_000 },
  { id: "carpet", name: "Carpet", price: 35_000 },
  { id: "concrete", name: "Bare concrete", price: 0 },
];

/** Your own living room or bedroom, outside the story chapters. */
export function isMyRoom(s: GameState | null, info: RoomInfo | null): boolean {
  if (!s || !info || s.chapter) return false;
  if (!(info.type.startsWith("home_") || info.type.startsWith("bedroom_"))) return false;
  return info.placeId === HOMES[s.background];
}

type RoomDecor = { wall?: string; floor?: RoomLayout["floor"]; items: (RoomItem & { paid?: number })[] };

/** A room as it looks now: the default layout, with your changes. */
export function roomLayout(s: GameState | null, info: RoomInfo): RoomLayout {
  const base = LAYOUTS[info.type];
  const mine = isMyRoom(s, info) ? s?.decor?.[info.type] : undefined;
  if (!mine) return base;
  return { ...base, wall: mine.wall ?? base.wall, floor: mine.floor ?? base.floor, items: mine.items };
}

/** Your changes to a room, starting from its default layout the first time. */
function decorOf(s: GameState, type: RoomType): RoomDecor {
  s.decor ??= {};
  s.decor[type] ??= { items: LAYOUTS[type].items.map((it) => ({ ...it })) };
  return s.decor[type]!;
}

const toast = (s: GameState, text: string) => {
  s.toast = text;
};

/** Where an item may stand: whole on the floor, or hung on the back wall. */
export function clampItem(id: string, x: number, y: number): { x: number; y: number } {
  const def = FURNITURE[id]!;
  const { w, h, wall } = ROOM;
  const nx = Math.round(Math.max(4, Math.min(w - def.w - 4, x)));
  if (ON_WALL.has(id)) return { x: nx, y: Math.round(Math.max(6, Math.min(wall - def.h - 12, y))) };
  // Its foot on the floor, clear of the doorway at the bottom.
  const top = Math.max(wall - def.h * 0.75, Math.min(h - 40 - def.h, y));
  return { x: nx, y: Math.round(top) };
}

/** A free-ish spot for something new: the middle of the floor, or a gap on the wall. */
function spotFor(id: string, items: RoomItem[]): { x: number; y: number } {
  const def = FURNITURE[id]!;
  if (ON_WALL.has(id)) {
    for (let x = 220; x < ROOM.w - def.w; x += 40) {
      if (!items.some((it) => ON_WALL.has(it.id) && x < it.x + FURNITURE[it.id]!.w && it.x < x + def.w)) return clampItem(id, x, 24);
    }
    return clampItem(id, 240, 24);
  }
  // On the floor: the free patch nearest the middle of the room, clear of what's already there.
  const feet = items
    .filter((it) => !ON_WALL.has(it.id) && !it.id.startsWith("rug") && FURNITURE[it.id])
    .map((it) => ({ x: it.x, y: it.y + FURNITURE[it.id]!.h * 0.25, w: FURNITURE[it.id]!.w, h: FURNITURE[it.id]!.h * 0.75 }));
  const mid = { x: ROOM.w / 2 - def.w / 2, y: ROOM.h / 2 - def.h / 2 + 30 };
  let best = clampItem(id, mid.x, mid.y);
  let bestD = Infinity;
  for (let y = ROOM.wall - def.h * 0.6; y < ROOM.h - 40 - def.h; y += 16) {
    for (let x = 8; x < ROOM.w - def.w - 8; x += 16) {
      const me = { x, y: y + def.h * 0.25, w: def.w, h: def.h * 0.75 };
      // Keep the doorway at the bottom clear.
      if (x < ROOM.door.x + 50 && x + def.w > ROOM.door.x - 50 && me.y + me.h > ROOM.h - 90) continue;
      if (feet.some((f) => me.x < f.x + f.w + 6 && f.x < me.x + me.w + 6 && me.y < f.y + f.h + 6 && f.y < me.y + me.h + 6)) continue;
      const d = Math.hypot(x - mid.x, y - mid.y);
      if (d < bestD) [best, bestD] = [clampItem(id, x, y), d];
    }
  }
  return best;
}

export function buyDecor(type: RoomType, id: string, accent?: string) {
  update((s) => {
    const item = catalogueItem(id);
    if (!item) return;
    if (s.stats.money < item.price) return toast(s, `You need ${naira(item.price)} for the ${item.name.toLowerCase()}.`);
    const d = decorOf(s, type);
    addStat(s, "money", -item.price);
    d.items.push({ id, ...spotFor(id, d.items), accent, paid: item.price });
    toast(s, `🛋️ ${item.name} bought for ${naira(item.price)}. Drag it where you want it.`);
  });
}

export function moveDecor(type: RoomType, index: number, x: number, y: number) {
  update((s) => {
    const d = decorOf(s, type);
    const it = d.items[index];
    if (!it || isFixed(it.id)) return;
    Object.assign(it, clampItem(it.id, x, y));
  });
}

/** Sell something back for half what you paid; what came with the house goes for a little. */
export function sellDecor(type: RoomType, index: number) {
  update((s) => {
    const d = decorOf(s, type);
    const it = d.items[index];
    if (!it || isFixed(it.id)) return;
    const back = sellPrice(it);
    d.items.splice(index, 1);
    if (back) addStat(s, "money", back);
    toast(s, back ? `Sold for ${naira(back)}.` : "Taken out of the room.");
  });
}

export function sellPrice(it: RoomItem & { paid?: number }): number {
  if (it.paid) return Math.round(it.paid / 2);
  const item = catalogueItem(it.id);
  return item ? Math.round(item.price / 5) : 0;
}

export function paintWall(type: RoomType, color: string) {
  update((s) => {
    if (s.stats.money < WALL_PRICE) return toast(s, `Painting costs ${naira(WALL_PRICE)}.`);
    addStat(s, "money", -WALL_PRICE);
    decorOf(s, type).wall = color;
    toast(s, `🎨 Fresh paint, ${naira(WALL_PRICE)}.`);
  });
}

export function relayFloor(type: RoomType, floor: RoomLayout["floor"]) {
  update((s) => {
    const f = FLOORS.find((x) => x.id === floor);
    if (!f) return;
    if (s.stats.money < f.price) return toast(s, `${f.name} costs ${naira(f.price)}.`);
    addStat(s, "money", -f.price);
    decorOf(s, type).floor = floor;
    toast(s, f.price ? `${f.name} laid for ${naira(f.price)}.` : "Back to bare concrete.");
  });
}
