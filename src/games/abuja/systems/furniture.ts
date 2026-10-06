// Furniture for rooms, in the game's cartoon style: front three-quarter view,
// a lighter top face, a darker front, bold outlines. Sizes are room pixels.

import { INK, tone } from "./character";

const LINE = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const thin = (c: string, w = 2) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const rect = (x: number, y: number, w: number, h: number, fill: string, r = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${LINE}/>`;
const shape = (d: string, fill: string) => `<path d="${d}" fill="${fill}" ${LINE}/>`;

const WOOD = "#8a5a33";
const WOOD_TOP = "#a8743f";
const WOOD_DARK = "#6b4426";
const METAL = "#c9ced6";
const SCREEN = "#1f2937";
const GOLD = "#f5b81c";

/** A box seen from the front and a little above: top face, front face. */
function box(x: number, y: number, w: number, h: number, depth: number, color = WOOD, top = WOOD_TOP): string {
  return rect(x, y + depth, w, h - depth, color, 3) + shape(`M${x} ${y + depth} L${x + 6} ${y} L${x + w - 6} ${y} L${x + w} ${y + depth} Z`, top);
}

function drawers(x: number, y: number, w: number, rows: number, rowH: number): string {
  let out = "";
  for (let i = 0; i < rows; i += 1) out += rect(x, y + i * rowH, w, rowH - 3, WOOD_DARK, 2) + `<circle cx="${x + w / 2}" cy="${y + i * rowH + rowH / 2 - 1.5}" r="1.8" fill="${GOLD}"/>`;
  return out;
}

const plantPot = (x: number, y: number, s = 1) =>
  shape(`M${x - 9 * s} ${y} L${x + 9 * s} ${y} L${x + 7 * s} ${y + 13 * s} L${x - 7 * s} ${y + 13 * s} Z`, "#f4ece0") +
  [-8, -3, 2, 7]
    .map((dx, i) => `<ellipse cx="${x + dx * s}" cy="${y - (8 + (i % 2) * 5) * s}" rx="${5 * s}" ry="${9 * s}" transform="rotate(${dx * 4} ${x + dx * s} ${y - 8 * s})" fill="${i % 2 ? "#2e7d32" : "#4caf50"}" ${LINE}/>`)
    .join("");

type Item = { w: number; h: number; draw: (accent: string) => string; /** Solid footprint at the bottom, as a fraction of height. */ foot?: number };

export const FURNITURE: Record<string, Item> = {
  bed: {
    w: 130,
    h: 96,
    foot: 0.75,
    draw: (a) =>
      rect(4, 4, 122, 34, WOOD, 6) +
      box(4, 30, 122, 58, 24, WOOD, WOOD_TOP) +
      shape("M10 34 L120 34 L122 60 L8 60 Z", "#f8fafc") +
      shape(`M8 46 L122 46 L124 66 L6 66 Z`, a) +
      rect(16, 26, 36, 14, "#ffffff", 7) +
      rect(70, 26, 36, 14, tone(a, 1.3), 7) +
      rect(4, 80, 8, 14, WOOD_DARK, 2) +
      rect(118, 80, 8, 14, WOOD_DARK, 2),
  },
  nightstand: {
    w: 46,
    h: 74,
    foot: 0.45,
    draw: () =>
      box(4, 34, 38, 38, 8) +
      drawers(9, 46, 28, 2, 12) +
      shape("M15 34 L31 34 L28 22 L18 22 Z", "#e5d3b3") +
      shape("M12 22 L34 22 L29 4 L17 4 Z", "#fdf3d1") +
      `<path d="M23 22 L23 34" ${thin(INK, 2)}/>`,
  },
  wardrobe: {
    w: 76,
    h: 128,
    foot: 0.25,
    draw: () =>
      box(4, 4, 68, 122, 10) +
      `<path d="M38 16 L38 124" ${thin(INK, 2)}/>` +
      `<circle cx="34" cy="70" r="2.2" fill="${GOLD}"/><circle cx="42" cy="70" r="2.2" fill="${GOLD}"/>` +
      rect(44, 22, 22, 70, "#cfe8f5", 2),
  },
  bookshelf: {
    w: 72,
    h: 124,
    foot: 0.25,
    draw: () => {
      let out = box(4, 4, 64, 118, 8);
      const colors = ["#c0392b", "#2c6fbb", "#e1a32c", "#2e7d32", "#7b3fc4", "#f4ece0"];
      for (let row = 0; row < 4; row += 1) {
        const y = 18 + row * 26;
        out += rect(9, y, 54, 22, WOOD_DARK, 1);
        for (let b = 0; b < 6; b += 1) out += rect(11 + b * 8.5, y + 4 + (b % 3), 6.5, 18 - (b % 3), colors[(b + row) % colors.length]!, 1);
      }
      return out;
    },
  },
  desk: {
    w: 110,
    h: 96,
    foot: 0.42,
    draw: () =>
      box(4, 48, 102, 44, 12) +
      drawers(74, 64, 26, 2, 13) +
      rect(10, 66, 6, 26, WOOD_DARK, 2) +
      // Monitor, keyboard, mug and a little plant.
      rect(30, 6, 46, 34, SCREEN, 4) +
      rect(34, 10, 38, 26, "#3b82f6", 2) +
      `<path d="M38 14 L52 14 M38 19 L60 19 M38 24 L48 24" ${thin("#dbeafe", 2)}/>` +
      rect(48, 40, 10, 10, METAL, 1) +
      rect(30, 52, 40, 6, "#e5e7eb", 2) +
      shape("M84 46 L94 46 L93 56 L85 56 Z", "#ffffff") +
      plantPot(20, 44, 0.6),
  },
  teacherdesk: {
    w: 104,
    h: 74,
    foot: 0.55,
    draw: () =>
      box(4, 28, 96, 44, 12) +
      drawers(10, 44, 26, 2, 13) +
      rect(44, 14, 26, 16, "#c0392b", 2) +
      rect(46, 8, 26, 8, "#2c6fbb", 2) +
      shape("M80 28 L90 28 L89 38 L81 38 Z", "#ffffff"),
  },
  chair: {
    w: 44,
    h: 70,
    foot: 0.35,
    draw: (a) => rect(8, 4, 28, 36, a, 8) + rect(6, 36, 32, 12, tone(a, 0.85), 5) + `<path d="M22 48 L22 60 M10 66 L34 66 M22 60 L10 66 M22 60 L34 66" ${thin(INK, 3)}/>`,
  },
  filing: {
    w: 50,
    h: 100,
    foot: 0.3,
    draw: () => box(4, 4, 42, 94, 8, "#94a3b8", "#cbd5e1") + [0, 1, 2, 3].map((i) => rect(10, 18 + i * 19, 30, 15, "#7c8ba1", 2) + `<path d="M20 ${25 + i * 19} L30 ${25 + i * 19}" ${thin(INK, 2)}/>`).join(""),
  },
  sofa: {
    w: 150,
    h: 80,
    foot: 0.6,
    draw: (a) =>
      rect(10, 6, 130, 40, tone(a, 0.85), 12) +
      rect(4, 30, 24, 44, a, 8) +
      rect(122, 30, 24, 44, a, 8) +
      rect(26, 40, 98, 32, tone(a, 1.12), 8) +
      `<path d="M75 42 L75 70" ${thin(INK, 2)}/>` +
      rect(36, 16, 26, 22, "#f4ece0", 8) +
      rect(88, 16, 26, 22, GOLD, 8),
  },
  tv: {
    w: 120,
    h: 104,
    foot: 0.35,
    draw: () =>
      rect(10, 4, 100, 58, SCREEN, 5) +
      rect(16, 10, 88, 46, "#0ea5e9", 2) +
      `<path d="M24 40 Q40 22 56 36 T92 26" ${thin("#e0f2fe", 3)}/>` +
      rect(54, 62, 12, 8, "#374151", 1) +
      box(4, 68, 112, 34, 8) +
      rect(14, 82, 40, 16, WOOD_DARK, 2) +
      rect(66, 82, 40, 16, WOOD_DARK, 2),
  },
  dining: {
    w: 140,
    h: 104,
    foot: 0.5,
    draw: () => {
      const back = (x: number) => rect(x, 6, 26, 34, WOOD_DARK, 4);
      return (
        back(24) +
        back(90) +
        box(10, 34, 120, 26, 12) +
        rect(16, 58, 7, 40, WOOD_DARK, 2) +
        rect(117, 58, 7, 40, WOOD_DARK, 2) +
        `<ellipse cx="50" cy="40" rx="12" ry="4" fill="#ffffff" ${LINE}/><ellipse cx="94" cy="40" rx="12" ry="4" fill="#ffffff" ${LINE}/>` +
        rect(2, 64, 22, 34, WOOD, 4) +
        rect(116, 64, 22, 34, WOOD, 4)
      );
    },
  },
  fridge: {
    w: 60,
    h: 124,
    foot: 0.25,
    draw: () => box(4, 4, 52, 118, 8, "#e5e7eb", "#f8fafc") + `<path d="M6 52 L54 52" ${thin(INK, 2)}/>` + rect(44, 22, 4, 22, METAL, 2) + rect(44, 62, 4, 30, METAL, 2),
  },
  stove: {
    w: 64,
    h: 86,
    foot: 0.4,
    draw: () =>
      box(4, 10, 56, 74, 12, "#f8fafc", "#e5e7eb") +
      [16, 30, 44].map((x) => `<ellipse cx="${x}" cy="17" rx="5" ry="2.5" fill="#374151"/>`).join("") +
      rect(10, 38, 44, 34, "#1f2937", 4) +
      rect(16, 44, 32, 22, "#f97316", 3),
  },
  sink: {
    w: 84,
    h: 92,
    foot: 0.45,
    draw: () =>
      box(4, 30, 76, 60, 12) +
      rect(10, 52, 30, 34, WOOD_DARK, 2) +
      rect(44, 52, 30, 34, WOOD_DARK, 2) +
      `<ellipse cx="42" cy="36" rx="18" ry="5" fill="#94a3b8" ${LINE}/>` +
      `<path d="M42 32 L42 14 Q42 8 50 8 L54 8" ${thin(INK, 5)}/><path d="M42 32 L42 14 Q42 8 50 8 L54 8" ${thin(METAL, 3)}/>`,
  },
  plant: { w: 40, h: 64, foot: 0.3, draw: () => plantPot(20, 48, 1.4) },
  rug: { w: 170, h: 70, draw: (a) => `<ellipse cx="85" cy="35" rx="82" ry="32" fill="${a}" ${LINE}/><ellipse cx="85" cy="35" rx="64" ry="22" fill="none" stroke="${tone(a, 1.3)}" stroke-width="4"/>` },
  schooldesk: {
    w: 70,
    h: 70,
    foot: 0.45,
    draw: () =>
      rect(10, 4, 50, 22, WOOD_DARK, 4) +
      box(4, 26, 62, 22, 10) +
      rect(8, 46, 6, 22, "#475569", 2) +
      rect(56, 46, 6, 22, "#475569", 2) +
      rect(22, 30, 18, 4, "#ffffff", 1),
  },
  counter: {
    w: 220,
    h: 92,
    foot: 0.55,
    draw: (a) =>
      rect(10, 4, 200, 30, "#cfe8f5", 3) +
      `<path d="M60 6 L60 32 M110 6 L110 32 M160 6 L160 32" ${thin(INK, 2)}/>` +
      box(4, 32, 212, 58, 12, a, tone(a, 1.25)) +
      rect(176, 22, 26, 14, SCREEN, 2),
  },
  shelf: {
    w: 120,
    h: 120,
    foot: 0.25,
    draw: () => {
      let out = box(4, 4, 112, 114, 8, "#cbd5e1", "#e2e8f0");
      const goods = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#eab308", "#f97316"];
      for (let row = 0; row < 3; row += 1) {
        const y = 22 + row * 32;
        out += `<path d="M8 ${y + 26} L112 ${y + 26}" ${thin(INK, 2.5)}/>`;
        for (let i = 0; i < 7; i += 1) out += rect(12 + i * 14, y + 6 + (i % 2) * 4, 11, 20 - (i % 2) * 4, goods[(i + row) % goods.length]!, 2);
      }
      return out;
    },
  },
  hospitalbed: {
    w: 130,
    h: 90,
    foot: 0.7,
    draw: () =>
      `<path d="M10 20 L10 84 M120 40 L120 84" ${thin("#94a3b8", 5)}/>` +
      rect(10, 10, 20, 34, "#e2e8f0", 4) +
      shape("M12 40 L120 40 L122 64 L10 64 Z", "#ffffff") +
      shape("M40 48 L122 48 L124 68 L38 68 Z", "#7dd3fc") +
      rect(14, 32, 30, 12, "#ffffff", 6) +
      `<circle cx="20" cy="84" r="5" fill="#374151"/><circle cx="114" cy="84" r="5" fill="#374151"/>`,
  },
  cooler: {
    w: 40,
    h: 104,
    foot: 0.3,
    draw: () => rect(14, 4, 14, 26, "#bfdbfe", 6) + box(4, 30, 32, 72, 8, "#e5e7eb", "#f8fafc") + rect(16, 46, 8, 6, "#3b82f6", 1) + rect(16, 56, 8, 6, "#ef4444", 1),
  },
  bench: { w: 140, h: 56, foot: 0.6, draw: (a) => rect(6, 4, 128, 20, tone(a, 0.85), 6) + box(4, 22, 132, 20, 8, a, tone(a, 1.2)) + rect(10, 40, 7, 14, "#475569", 2) + rect(123, 40, 7, 14, "#475569", 2) },
  speaker: {
    w: 50,
    h: 92,
    foot: 0.3,
    draw: () => box(4, 4, 42, 86, 6, "#27272a", "#3f3f46") + `<circle cx="25" cy="34" r="9" fill="#18181b" ${LINE}/><circle cx="25" cy="66" r="14" fill="#18181b" ${LINE}/><circle cx="25" cy="66" r="5" fill="#52525b"/>`,
  },
  balloons: {
    w: 70,
    h: 120,
    draw: () =>
      `<path d="M35 112 L22 50 M35 112 L35 40 M35 112 L50 52 M35 112 L28 70 M35 112 L44 72" ${thin(INK, 1.4)}/>` +
      [
        [22, 40, "#ef4444"],
        [48, 42, "#22c55e"],
        [35, 28, "#eab308"],
        [26, 62, "#3b82f6"],
        [46, 64, "#eab308"],
      ]
        .map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="12" ry="15" fill="${c}" ${LINE}/><ellipse cx="${Number(x) - 4}" cy="${Number(y) - 6}" rx="3" ry="5" fill="#ffffff" opacity="0.5"/>`)
        .join(""),
  },
  // Things on the walls.
  window: {
    w: 96,
    h: 76,
    draw: (a) =>
      rect(10, 8, 76, 58, "#bae6fd", 3) +
      `<path d="M48 8 L48 66 M10 37 L86 37" ${thin("#f8fafc", 4)}/><path d="M48 8 L48 66 M10 37 L86 37" ${thin(INK, 1.4)}/>` +
      shape("M4 4 L26 4 Q20 40 26 72 L4 72 Z", a) +
      shape("M92 4 L70 4 Q76 40 70 72 L92 72 Z", a) +
      rect(0, 0, 96, 8, WOOD_DARK, 2),
  },
  picture: { w: 56, h: 44, draw: (a) => rect(4, 4, 48, 36, WOOD, 3) + rect(10, 10, 36, 24, "#bfdbfe", 1) + shape("M10 34 L22 20 L30 28 L36 22 L46 34 Z", a) },
  clock: { w: 36, h: 36, draw: () => `<circle cx="18" cy="18" r="15" fill="#ffffff" ${LINE}/><path d="M18 18 L18 9 M18 18 L24 21" ${thin(INK, 2.4)}/>` },
  blackboard: { w: 200, h: 90, draw: () => rect(4, 4, 192, 76, WOOD, 4) + rect(12, 10, 176, 62, "#14532d", 2) + `<path d="M26 26 L80 26 M26 40 L110 40 M26 54 L64 54" ${thin("#e2e8f0", 2.4)}/><path d="M130 50 Q150 20 170 50" ${thin("#fde68a", 2.4)}/>` + rect(60, 78, 80, 8, WOOD_DARK, 2) },
  whiteboard: { w: 150, h: 80, draw: () => rect(4, 4, 142, 70, "#94a3b8", 4) + rect(10, 10, 130, 58, "#ffffff", 2) + `<path d="M22 50 L44 34 L64 42 L88 22 L112 30" ${thin("#16a34a", 3)}/><path d="M22 58 L130 58" ${thin(INK, 1.4)}/>` },
};

export type FurnitureId = keyof typeof FURNITURE;

export function furnitureSvg(id: string, accent: string, scale = 1): string {
  const item = FURNITURE[id]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${item.w + 4} ${item.h + 4}" width="${((item.w + 4) * scale).toFixed(1)}" height="${((item.h + 4) * scale).toFixed(1)}">${item.draw(accent)}</svg>`;
}
