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
const PORCELAIN = "#f4f6f8";
const WORN_PORCELAIN = "#ddd5c4";
const BATH_WOOD = "#5c3a24";
const WORN_WOOD = "#7a6249";

/** Rust or grime stains for the well-worn things. */
const rust = (x: number, y: number, r: number) => `<ellipse cx="${x}" cy="${y}" rx="${r * 1.4}" ry="${r}" fill="#8a4b22" opacity="0.55"/><ellipse cx="${x + r}" cy="${y + r * 0.8}" rx="${r * 0.6}" ry="${r * 0.5}" fill="#a0592a" opacity="0.5"/>`;

/** An ankara print: rows of bright diamonds on a dark ground. */
function ankara(x: number, y: number, w: number, h: number, accent: string): string {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3b1f4a"/>`;
  const size = 11;
  for (let row = 0; row * size < h; row += 1) {
    for (let col = 0; col * size < w; col += 1) {
      const cx = x + col * size + size / 2;
      const cy = y + row * size + size / 2;
      if (cx > x + w || cy > y + h) continue;
      const c = (row + col) % 3 === 0 ? accent : (row + col) % 3 === 1 ? "#e6a23c" : "#1e6fbf";
      out += `<path d="M${cx} ${cy - 4.5} L${cx + 4.5} ${cy} L${cx} ${cy + 4.5} L${cx - 4.5} ${cy} Z" fill="${c}"/>`;
    }
  }
  return out;
}

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
  // ── Things to decorate your own home with ──
  /** A standing lamp with a fabric shade. */
  floorlamp: {
    w: 44,
    h: 128,
    foot: 0.08,
    draw: (a) =>
      `<ellipse cx="22" cy="120" rx="15" ry="5" fill="${WOOD_DARK}" ${LINE}/>` +
      rect(20, 40, 4, 80, METAL, 1) +
      shape("M8 40 L36 40 L30 8 L14 8 Z", a) +
      `<path d="M12 33 L32 33" ${thin(tone(a, 1.3), 2)}/>` +
      `<ellipse cx="22" cy="42" rx="12" ry="3" fill="#fff4c2" opacity="0.9"/>`,
  },
  /** A brass wall light. */
  walllamp: {
    w: 34,
    h: 44,
    draw: () =>
      rect(13, 22, 8, 16, GOLD, 2) +
      shape("M5 22 L29 22 L23 4 L11 4 Z", "#fdf3d1") +
      `<ellipse cx="17" cy="23" rx="10" ry="2.5" fill="#fff7d6" opacity="0.9"/>`,
  },
  /** The National Mosque, the City Gate and Aso Rock: a print of the skyline. */
  poster: {
    w: 60,
    h: 76,
    draw: (a) =>
      rect(4, 4, 52, 68, "#1f2937", 3) +
      rect(8, 8, 44, 52, "#fde7c4", 1) +
      shape("M8 48 Q18 34 26 42 Q34 30 44 40 L52 36 L52 60 L8 60 Z", tone(a, 0.8)) +
      shape("M22 60 L24 38 L28 38 L30 60 Z M34 60 L36 38 L40 38 L42 60 Z", "#f8fafc") +
      rect(22, 34, 20, 5, "#f8fafc", 1) +
      `<circle cx="44" cy="18" r="5" fill="#f59e0b"/>` +
      `<text x="30" y="68" text-anchor="middle" font-family="Arial" font-weight="900" font-size="8" fill="#f8fafc">ABUJA</text>`,
  },
  clock: { w: 36, h: 36, draw: () => `<circle cx="18" cy="18" r="15" fill="#ffffff" ${LINE}/><path d="M18 18 L18 9 M18 18 L24 21" ${thin(INK, 2.4)}/>` },
  blackboard: { w: 200, h: 90, draw: () => rect(4, 4, 192, 76, WOOD, 4) + rect(12, 10, 176, 62, "#14532d", 2) + `<path d="M26 26 L80 26 M26 40 L110 40 M26 54 L64 54" ${thin("#e2e8f0", 2.4)}/><path d="M130 50 Q150 20 170 50" ${thin("#fde68a", 2.4)}/>` + rect(60, 78, 80, 8, WOOD_DARK, 2) },
  whiteboard: { w: 150, h: 80, draw: () => rect(4, 4, 142, 70, "#94a3b8", 4) + rect(10, 10, 130, 58, "#ffffff", 2) + `<path d="M22 50 L44 34 L64 42 L88 22 L112 30" ${thin("#16a34a", 3)}/><path d="M22 58 L130 58" ${thin(INK, 1.4)}/>` },
  // ── Bathrooms and bedrooms (middle-class and worn, after the sheets) ──
  toilet: {
    w: 62,
    h: 96,
    foot: 0.45,
    draw: () =>
      rect(8, 4, 46, 34, PORCELAIN, 6) + rect(4, 2, 54, 8, PORCELAIN, 3) + rect(14, 14, 10, 4, METAL, 2) +
      `<ellipse cx="31" cy="54" rx="26" ry="12" fill="${PORCELAIN}" ${LINE}/><ellipse cx="31" cy="54" rx="17" ry="7" fill="#dbe4ea" ${LINE}/>` +
      shape("M16 60 Q16 82 20 92 L42 92 Q46 82 46 60 Z", PORCELAIN),
  },
  toilet_poor: {
    w: 62,
    h: 96,
    foot: 0.45,
    draw: () =>
      rect(8, 4, 46, 34, WORN_PORCELAIN, 6) + shape("M30 4 L40 4 L38 14 L32 10 Z", "#5b4636") +
      `<ellipse cx="31" cy="54" rx="26" ry="12" fill="${WORN_PORCELAIN}" ${LINE}/><ellipse cx="31" cy="54" rx="17" ry="7" fill="#8a7a5c" ${LINE}/>` +
      shape("M16 60 Q16 82 20 92 L42 92 Q46 82 46 60 Z", WORN_PORCELAIN) +
      `<path d="M14 20 L20 26 L18 32 M40 66 L36 74 L40 82" ${thin("#5b4636", 1.6)}/>` + rust(10, 30, 3),
  },
  shower: {
    w: 96,
    h: 156,
    foot: 0.3,
    draw: () =>
      rect(4, 4, 88, 146, "#eef6f9", 3) +
      [20, 44, 68].map((x) => `<path d="M${x} 6 L${x} 120" ${thin("#cfdde4", 1.4)}/>`).join("") +
      `<path d="M30 14 L30 34 Q30 40 38 42" ${thin(INK, 4)}/><path d="M30 14 L30 34 Q30 40 38 42" ${thin(METAL, 2.4)}/><ellipse cx="38" cy="44" rx="7" ry="3" fill="${METAL}" ${LINE}/>` +
      rect(4, 124, 88, 26, "#f8fafc", 3) + `<rect x="42" y="132" width="12" height="5" rx="2" fill="#94a3b8"/>` +
      `<rect x="10" y="10" width="76" height="118" rx="3" fill="#bae6fd" opacity="0.25" stroke="${INK}" stroke-width="2"/><path d="M48 10 L48 128" ${thin(INK, 2)}/><path d="M18 30 L34 14 M58 70 L76 52" ${thin("#ffffff", 3)} opacity="0.7"/>`,
  },
  shower_poor: {
    w: 96,
    h: 156,
    foot: 0.3,
    draw: () =>
      rect(4, 120, 88, 30, "#9c9488", 3) + rect(40, 132, 12, 5, "#3f3a33", 2) +
      shape("M4 10 L28 8 L24 40 L30 70 L22 100 L30 124 L4 126 Z", "#3b6ea8") +
      shape("M92 10 L68 8 L72 44 L64 80 L74 104 L66 124 L92 126 Z", "#3b6ea8") +
      `<path d="M10 20 L18 60 M80 30 L74 70 M12 90 L22 110" ${thin("#2a4f7a", 2)}/>` +
      `<path d="M48 6 L48 30 Q48 36 56 38" ${thin(INK, 4)}/><path d="M48 6 L48 30 Q48 36 56 38" ${thin("#8a6a4a", 2.4)}/><ellipse cx="56" cy="40" rx="8" ry="3.5" fill="#8a6a4a" ${LINE}/>` +
      rust(52, 126, 4),
  },
  bathtub: {
    w: 156,
    h: 84,
    foot: 0.6,
    draw: () =>
      shape("M6 18 Q78 6 150 18 Q148 62 120 68 L36 68 Q8 62 6 18 Z", PORCELAIN) +
      `<ellipse cx="78" cy="20" rx="66" ry="9" fill="#dbeafe" ${LINE}/>` +
      `<path d="M30 68 L24 80 M126 68 L132 80" ${thin(INK, 6)}/><path d="M30 68 L24 80 M126 68 L132 80" ${thin("#9ca3af", 3.6)}/>`,
  },
  vanity: {
    w: 84,
    h: 104,
    foot: 0.5,
    draw: () =>
      `<path d="M42 30 L42 10 Q42 4 50 4 L54 4" ${thin(INK, 5)}/><path d="M42 30 L42 10 Q42 4 50 4 L54 4" ${thin(METAL, 3)}/>` +
      rect(4, 28, 76, 16, PORCELAIN, 4) + `<ellipse cx="42" cy="36" rx="20" ry="5" fill="#dbe4ea" ${LINE}/>` +
      box(8, 44, 68, 58, 4, BATH_WOOD, BATH_WOOD) + rect(14, 52, 56, 9, tone(BATH_WOOD, 0.85), 2) + rect(14, 64, 26, 34, tone(BATH_WOOD, 0.85), 2) + rect(44, 64, 26, 34, tone(BATH_WOOD, 0.85), 2),
  },
  towelshelf: {
    w: 74,
    h: 100,
    foot: 0.3,
    draw: (a) => {
      let out = box(4, 4, 66, 94, 8, BATH_WOOD, tone(BATH_WOOD, 1.2));
      for (let i = 0; i < 3; i += 1) out += rect(10, 18 + i * 26, 54, 22, tone(BATH_WOOD, 0.75), 1) + rect(14, 28 + i * 26, 26, 6, i === 2 ? "#e7dccb" : a, 2) + rect(14, 33 + i * 26, 26, 6, i === 2 ? "#e7dccb" : tone(a, 0.85), 2);
      return out + rect(46, 24, 10, 12, "#c2793a", 2);
    },
  },
  bathmirror: { w: 60, h: 92, draw: () => rect(4, 4, 52, 84, BATH_WOOD, 3) + rect(10, 10, 40, 72, "#dbeafe", 1) + `<path d="M16 40 L36 18 M22 70 L44 46" ${thin("#ffffff", 3)}/>` },
  mirror_broken: {
    w: 64,
    h: 104,
    draw: () => shape("M10 100 L6 20 L30 4 L44 30 L58 40 L56 100 Z", "#cfdbe3") + `<path d="M30 4 L28 40 L10 60 M28 40 L50 70 L56 100 M28 40 L44 30 M20 80 L36 60" ${thin("#7d8c96", 1.6)}/>`,
  },
  washer: {
    w: 84,
    h: 96,
    foot: 0.45,
    draw: () => box(4, 4, 76, 90, 10, PORCELAIN, "#ffffff") + rect(10, 18, 22, 6, "#cbd5e1", 2) + `<circle cx="58" cy="21" r="4" fill="#94a3b8"/>` + `<circle cx="42" cy="60" r="22" fill="#cbd5e1" ${LINE}/><circle cx="42" cy="60" r="14" fill="#475569" ${LINE}/><path d="M34 54 Q42 48 50 54" ${thin("#94a3b8", 2)}/>`,
  },
  heater: {
    w: 56,
    h: 124,
    foot: 0.25,
    draw: () =>
      `<path d="M22 14 L22 4 L36 4 L36 14" ${thin(INK, 5)}/><path d="M22 14 L22 4 L36 4 L36 14" ${thin(METAL, 3)}/>` +
      shape("M8 16 Q28 8 48 16 L48 112 Q28 120 8 112 Z", "#b8bec7") + rect(18, 30, 18, 14, "#64748b", 2) + rect(21, 33, 12, 5, "#86efac", 1) + rect(20, 86, 14, 12, "#64748b", 2),
  },
  heater_rusty: {
    w: 56,
    h: 124,
    foot: 0.25,
    draw: () =>
      `<path d="M22 14 L22 4 L36 4 L36 14" ${thin(INK, 5)}/><path d="M22 14 L22 4 L36 4 L36 14" ${thin("#8a6a4a", 3)}/>` +
      shape("M8 16 Q28 8 48 16 L48 112 Q28 120 8 112 Z", "#9ba1a8") + rect(18, 30, 18, 14, "#5b6470", 2) + rect(21, 33, 12, 5, "#6b8f5a", 1) + rust(14, 60, 6) + rust(38, 92, 5) + rust(30, 20, 3),
  },
  towelrail: {
    w: 64,
    h: 104,
    foot: 0.15,
    draw: (a) => `<path d="M10 100 L10 6 M54 100 L54 6 M10 30 L54 30 M10 56 L54 56 M10 80 L54 80" ${thin(INK, 5)}/><path d="M10 100 L10 6 M54 100 L54 6 M10 30 L54 30 M10 56 L54 56 M10 80 L54 80" ${thin(METAL, 3)}/>` + shape("M16 28 L46 28 L46 76 L16 76 Z", a) + `<path d="M16 66 L46 66" ${thin(tone(a, 0.7), 2)}/>`,
  },
  towelrail_poor: {
    w: 64,
    h: 104,
    foot: 0.15,
    draw: () => `<path d="M10 100 L10 14 M54 100 L54 14 M6 18 L58 18" ${thin(INK, 5)}/><path d="M10 100 L10 14 M54 100 L54 14 M6 18 L58 18" ${thin("#8a7560", 3)}/>` + shape("M14 18 L28 18 L30 52 L24 60 L20 50 L14 58 Z", "#b9a88f") + shape("M36 18 L48 18 L50 44 L44 50 L38 42 Z", "#a7907a") + rust(22, 34, 3),
  },
  basket: { w: 58, h: 64, foot: 0.4, draw: () => shape("M6 12 L52 12 L46 60 L12 60 Z", "#b07a45") + [22, 32, 42, 52].map((y) => `<path d="M8 ${y} L50 ${y}" ${thin("#8a5a33", 1.6)}/>`).join("") + `<ellipse cx="29" cy="12" rx="23" ry="5" fill="#8a5a33" ${LINE}/>` },
  basket_torn: { w: 58, h: 64, foot: 0.4, draw: () => shape("M6 12 L52 12 L46 60 L12 60 Z", "#9b7a52") + shape("M6 12 L20 14 L18 30 L26 40 L14 50 L8 40 Z", "#b9a27c") + shape("M40 14 L52 12 L48 36 L40 30 Z", "#b9a27c") + `<ellipse cx="29" cy="12" rx="23" ry="5" fill="#7a5c3a" ${LINE}/>` },
  wallshelf: { w: 96, h: 56, draw: (a) => rect(4, 38, 88, 8, BATH_WOOD, 2) + `<path d="M14 46 L14 54 L22 46 M80 46 L80 54 L72 46" ${thin(INK, 2)}/>` + rect(10, 26, 34, 6, "#e7dccb", 2) + rect(10, 31, 34, 7, a, 2) + plantPot(68, 28, 0.7) },
  washstand: {
    w: 104,
    h: 92,
    foot: 0.5,
    draw: () =>
      box(4, 34, 96, 20, 8, WORN_WOOD, tone(WORN_WOOD, 1.2)) + rect(10, 52, 7, 38, WORN_WOOD, 2) + rect(87, 52, 7, 38, WORN_WOOD, 2) + rect(14, 72, 76, 6, WORN_WOOD, 2) +
      `<ellipse cx="34" cy="34" rx="24" ry="8" fill="#a9b0b7" ${LINE}/><ellipse cx="34" cy="32" rx="18" ry="4" fill="#7b858e"/>` +
      shape("M62 8 L88 8 L85 36 L65 36 Z", "#8a6a4a") + `<path d="M62 10 Q75 -4 88 10" ${thin(INK, 1.6)}/>` + rust(70, 20, 3),
  },
  washboard: { w: 52, h: 84, draw: () => rect(6, 4, 40, 70, "#8a7560", 3) + rect(12, 14, 28, 52, "#b8bec7", 1) + [20, 26, 32, 38, 44, 50, 56].map((y) => `<path d="M12 ${y} L40 ${y}" ${thin("#7d858e", 1.6)}/>`).join("") + `<path d="M8 74 L4 82 M44 74 L48 82" ${thin(INK, 3)}/>` + rust(30, 40, 3) },
  bowl: { w: 74, h: 38, foot: 0.8, draw: () => shape("M4 10 Q37 2 70 10 L62 32 Q37 38 12 32 Z", "#a9b0b7") + `<ellipse cx="37" cy="10" rx="33" ry="7" fill="#7b858e" ${LINE}/>` + rust(50, 22, 3) },
  bucket: { w: 44, h: 50, foot: 0.6, draw: () => shape("M6 12 L38 12 L34 46 L10 46 Z", "#9ca3af") + `<ellipse cx="22" cy="12" rx="16" ry="4" fill="#6b7280" ${LINE}/><path d="M6 12 Q22 -6 38 12" ${thin(INK, 1.6)}/>` + rust(28, 30, 3) },
  broom: { w: 34, h: 114, draw: () => `<path d="M18 4 L16 74" ${thin(INK, 5)}/><path d="M18 4 L16 74" ${thin("#8a5a33", 3)}/>` + shape("M10 74 L22 74 L32 112 L2 112 Z", "#c9a96e") + [8, 14, 20, 26].map((x) => `<path d="M${x + 2} 80 L${x} 110" ${thin("#9a7a44", 1.2)}/>`).join("") },
  cinderplant: { w: 64, h: 70, foot: 0.4, draw: () => box(4, 34, 56, 34, 8, "#9ca3af", "#cbd5e1") + rect(12, 48, 14, 14, "#6b7280", 1) + rect(36, 48, 14, 14, "#6b7280", 1) + `<path d="M30 38 L22 10 M32 38 L34 4 M34 38 L46 14 M28 38 L16 22" ${thin("#5f7a3a", 2)}/>` },
  bed_ankara: {
    w: 134,
    h: 98,
    foot: 0.75,
    draw: (a) =>
      rect(4, 4, 126, 34, WOOD_DARK, 6) + box(4, 30, 126, 60, 24, WOOD_DARK, WOOD) +
      shape("M10 34 L124 34 L126 52 L8 52 Z", "#f1e8d8") + rect(16, 24, 34, 14, "#e7dccb", 7) + rect(84, 24, 34, 14, "#e7dccb", 7) + rect(40, 30, 22, 12, a, 4) + rect(66, 30, 22, 12, "#1e3a8a", 4) +
      shape("M8 44 L126 44 L128 70 L6 70 Z", "#8a5a1e") + ankara(10, 46, 116, 22, a) + rect(4, 82, 8, 14, WOOD_DARK, 2) + rect(122, 82, 8, 14, WOOD_DARK, 2),
  },
  bed_single: {
    w: 112,
    h: 94,
    foot: 0.72,
    draw: (a) =>
      `<path d="M8 10 L8 88 M26 14 L26 40 M44 14 L44 40 M62 14 L62 40" ${thin(INK, 6)}/><path d="M8 10 L8 88 M26 14 L26 40 M44 14 L44 40 M62 14 L62 40" ${thin(WORN_WOOD, 3.6)}/>` +
      rect(4, 8, 76, 10, WORN_WOOD, 3) + box(6, 36, 102, 48, 18, WORN_WOOD, tone(WORN_WOOD, 1.15)) +
      shape("M12 40 L104 40 L106 54 L10 54 Z", "#d6cbb5") + shape("M30 46 L106 46 L108 68 L28 68 Z", "#7a4a1e") + ankara(32, 48, 72, 18, a) + `<path d="M40 68 L44 74 M60 68 L58 75 M84 68 L88 74" ${thin(INK, 1.4)}/>` + rect(100, 76, 7, 16, WORN_WOOD, 2),
  },
  wardrobe_old: {
    w: 78,
    h: 128,
    foot: 0.25,
    draw: () => box(4, 4, 70, 120, 10, WORN_WOOD, tone(WORN_WOOD, 1.15)) + `<path d="M39 16 L39 120" ${thin(INK, 2)}/>` + rect(10, 20, 24, 96, tone(WORN_WOOD, 0.9), 2) + rect(44, 20, 24, 96, tone(WORN_WOOD, 0.9), 2) + `<circle cx="35" cy="70" r="2.2" fill="#3f3a33"/><circle cx="43" cy="70" r="2.2" fill="#3f3a33"/>` + `<path d="M14 40 L22 46 M56 90 L62 98" ${thin("#4a3a2a", 1.4)}/>`,
  },
  dresser: {
    w: 110,
    h: 132,
    foot: 0.4,
    draw: () =>
      rect(30, 4, 50, 56, WOOD_DARK, 3) + rect(36, 10, 38, 44, "#dbeafe", 1) + [8, 22, 36, 50].map((y) => `<circle cx="33" cy="${y + 2}" r="2.6" fill="#fde68a" stroke="${INK}" stroke-width="0.8"/><circle cx="77" cy="${y + 2}" r="2.6" fill="#fde68a" stroke="${INK}" stroke-width="0.8"/>`).join("") +
      box(4, 62, 102, 46, 10, WOOD_DARK, WOOD) + drawers(12, 78, 34, 2, 13) + drawers(64, 78, 34, 2, 13) + rect(20, 52, 8, 10, "#1f2937", 2) + rect(32, 54, 6, 8, "#f472b6", 2) + plantPot(92, 58, 0.5) +
      rect(30, 108, 40, 22, "#7a4a2a", 6),
  },
  armchair: { w: 76, h: 78, foot: 0.55, draw: () => rect(12, 6, 52, 40, "#7a4a2a", 10) + rect(4, 30, 18, 40, "#6b3f22", 7) + rect(54, 30, 18, 40, "#6b3f22", 7) + rect(18, 40, 40, 26, "#8b5a34", 6) + `<path d="M14 70 L14 76 M62 70 L62 76" ${thin(INK, 4)}/>` },
  fan: {
    w: 54,
    h: 118,
    foot: 0.12,
    draw: () => `<path d="M27 52 L27 106" ${thin(INK, 5)}/><path d="M27 52 L27 106" ${thin("#475569", 3)}/>` + `<ellipse cx="27" cy="108" rx="18" ry="6" fill="#475569" ${LINE}/>` + `<circle cx="27" cy="28" r="23" fill="#e2e8f0" ${LINE}/>` + [0, 72, 144, 216, 288].map((r) => `<ellipse cx="27" cy="17" rx="5" ry="10" transform="rotate(${r} 27 28)" fill="#64748b"/>`).join("") + `<circle cx="27" cy="28" r="4" fill="#1f2937"/>` + [8, 16, 24, 32, 40, 48].map((x) => `<path d="M${x} 10 L${x} 46" ${thin("#94a3b8", 0.8)}/>`).join(""),
  },
  fan_rusty: {
    w: 54,
    h: 118,
    foot: 0.12,
    draw: () => `<path d="M27 52 L27 106" ${thin(INK, 5)}/><path d="M27 52 L27 106" ${thin("#7a6650", 3)}/>` + `<ellipse cx="27" cy="108" rx="18" ry="6" fill="#7a6650" ${LINE}/>` + `<circle cx="27" cy="28" r="23" fill="#cfc6b6" ${LINE}/>` + [0, 72, 144, 216, 288].map((r) => `<ellipse cx="27" cy="17" rx="5" ry="10" transform="rotate(${r} 27 28)" fill="#6b5a46"/>`).join("") + `<circle cx="27" cy="28" r="4" fill="#3f3a33"/>` + rust(12, 102, 4) + `<path d="M40 108 Q50 110 52 100" ${thin(INK, 1.2)}/>`,
  },
  crt_bench: {
    w: 128,
    h: 96,
    foot: 0.45,
    draw: () =>
      box(4, 50, 120, 18, 8, WORN_WOOD, tone(WORN_WOOD, 1.15)) + rect(10, 66, 8, 28, WORN_WOOD, 2) + rect(110, 66, 8, 28, WORN_WOOD, 2) +
      rect(10, 8, 54, 46, "#6b6458", 6) + rect(16, 14, 34, 32, "#5d6b62", 8) + `<path d="M20 22 L30 18" ${thin("#ffffff", 2)} opacity="0.4"/><circle cx="56" cy="20" r="2.5" fill="#2a2620"/><circle cx="56" cy="30" r="2.5" fill="#2a2620"/>` +
      rect(72, 26, 42, 26, "#5b5248", 4) + `<circle cx="84" cy="40" r="7" fill="#3a332b" ${LINE}/><path d="M96 34 L108 34 M96 40 L108 40 M96 46 L108 46" ${thin("#a8a092", 1.4)}/><path d="M76 26 L70 8" ${thin(INK, 1.6)}/>`,
  },
  milkstool: {
    w: 56,
    h: 84,
    foot: 0.4,
    draw: () =>
      box(4, 40, 48, 14, 6, WORN_WOOD, tone(WORN_WOOD, 1.15)) + rect(8, 52, 6, 30, WORN_WOOD, 2) + rect(42, 52, 6, 30, WORN_WOOD, 2) + rect(12, 70, 32, 5, WORN_WOOD, 1) +
      shape("M10 40 L10 14 Q10 8 16 6 L20 6 Q26 8 26 14 L26 40 Z", "#f8fafc") + rect(13, 4, 10, 5, "#1d4ed8", 1) + rect(10, 18, 16, 10, "#1d4ed8", 1) + `<text x="18" y="26" font-family="Arial" font-size="5.5" font-weight="700" text-anchor="middle" fill="#ffffff">Peak</text>` +
      rect(30, 22, 18, 18, "#15803d", 2) + rect(30, 26, 18, 9, "#16a34a", 0) + `<text x="39" y="33" font-family="Arial" font-size="5.5" font-weight="700" text-anchor="middle" fill="#ffffff">MILO</text>`,
  },
  nightstand_phone: {
    w: 50,
    h: 78,
    foot: 0.45,
    draw: () =>
      box(4, 38, 42, 38, 8) + drawers(9, 50, 32, 2, 12) +
      shape("M10 38 L20 38 L18 26 L12 26 Z", "#e5d3b3") + shape("M7 26 L23 26 L20 12 L10 12 Z", "#fdf3d1") + `<path d="M15 26 L15 38" ${thin(INK, 2)}/>` +
      rect(26, 30, 9, 15, "#111827", 2) + rect(27.5, 32, 6, 10, "#38bdf8", 1) + `<circle cx="40" cy="38" r="3.5" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M40 33 L40 43" ${thin("#1f2937", 1.4)}/>`,
  },
  desk_laptop: {
    w: 110,
    h: 92,
    foot: 0.42,
    draw: () =>
      box(4, 44, 102, 44, 12) + drawers(74, 60, 26, 2, 13) + rect(10, 62, 6, 26, WOOD_DARK, 2) +
      shape("M28 16 L68 16 L70 42 L26 42 Z", "#374151") + shape("M31 19 L65 19 L66 39 L30 39 Z", "#60a5fa") + shape("M20 42 L76 42 L80 50 L16 50 Z", "#9ca3af") +
      `<path d="M34 24 L52 24 M34 29 L58 29 M34 34 L46 34" ${thin("#dbeafe", 1.8)}/>` +
      shape("M84 38 L94 38 L93 50 L85 50 Z", "#ffffff") + `<path d="M85 41 L91 41" ${thin("#6b4426", 3)}/>` + rect(8, 34, 16, 6, "#c0392b", 1) + rect(9, 29, 15, 5, "#2c6fbb", 1),
  },
  monstera: {
    w: 62,
    h: 92,
    foot: 0.3,
    draw: () =>
      shape("M14 62 L48 62 L44 88 L18 88 Z", "#1e3a8a") + `<path d="M16 70 L46 70 M18 80 L44 80" ${thin(GOLD, 2)}/><path d="M22 66 L26 74 L30 66 L34 74 L38 66 L42 74" ${thin("#ef4444", 1.4)}/>` +
      [
        [30, 22, -10],
        [16, 36, -40],
        [46, 36, 40],
        [24, 50, -20],
        [40, 50, 20],
      ]
        .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="12" ry="15" transform="rotate(${r} ${x} ${y})" fill="#2e7d32" ${LINE}/><path d="M${x} ${Number(y) - 10} L${x} ${Number(y) + 10}" ${thin("#1e5631", 1.6)}/>`)
        .join(""),
  },
  rug_ankara: { w: 170, h: 70, draw: (a) => shape("M10 10 L160 10 L166 62 L4 62 Z", "#3b2a20") + ankara(14, 14, 146, 44, a) + `<path d="M4 64 L4 68 M20 64 L20 68 M40 64 L40 68 M60 64 L60 68 M80 64 L80 68 M100 64 L100 68 M120 64 L120 68 M140 64 L140 68 M160 64 L160 68" ${thin("#7a5c3a", 1.4)}/>` },
  tvstand_flat: {
    w: 128,
    h: 104,
    foot: 0.35,
    draw: () =>
      rect(14, 4, 90, 54, "#111827", 4) + rect(18, 8, 82, 46, "#1f2937", 1) + `<path d="M28 40 L52 16" ${thin("#ffffff", 3)} opacity="0.15"/>` + rect(52, 58, 14, 8, "#374151", 1) +
      box(4, 64, 120, 38, 8, WOOD_DARK, WOOD) + rect(12, 78, 30, 20, tone(WOOD_DARK, 0.85), 2) + rect(86, 78, 30, 20, tone(WOOD_DARK, 0.85), 2) + rect(48, 78, 32, 9, "#1f2937", 1) + rect(48, 89, 32, 8, "#1f2937", 1) + plantPot(114, 58, 0.5),
  },
  walldoor: {
    w: 66,
    h: 104,
    draw: (a) => rect(4, 4, 58, 98, "#6b4426", 3) + rect(10, 10, 46, 92, a, 2) + rect(16, 18, 34, 30, tone(a, 0.88), 2) + rect(16, 56, 34, 38, tone(a, 0.88), 2) + `<circle cx="48" cy="56" r="3" fill="${GOLD}" stroke="${INK}" stroke-width="1"/>`,
  },
};

export type FurnitureId = keyof typeof FURNITURE;

export function furnitureSvg(id: string, accent: string, scale = 1): string {
  const item = FURNITURE[id]!;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${item.w + 4} ${item.h + 4}" width="${((item.w + 4) * scale).toFixed(1)}" height="${((item.h + 4) * scale).toFixed(1)}">${item.draw(accent)}</svg>`;
}
