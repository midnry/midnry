// Vehicles in the same cartoon style as the people: bold outlines, flat colour,
// a crown badge. Each is drawn from the front, the side (facing right; mirror
// it for left) and the back, so traffic shows the side that faces you.

import { INK, tone } from "./character";

export type VehicleKind = "car" | "taxi" | "okada" | "keke" | "bus" | "truck" | "van" | "ambulance" | "police" | "firetruck" | "mixer";

/** Which everyday vehicle a working one counts as when it hits you. */
export const HIT_AS: Record<VehicleKind, "car" | "taxi" | "okada" | "keke" | "bus"> = { car: "car", taxi: "taxi", okada: "okada", keke: "keke", bus: "bus", truck: "bus", van: "car", ambulance: "car", police: "car", firetruck: "bus", mixer: "bus" };
export type VehicleView = "side" | "front" | "back";

export const CAR_COLORS = { yellow: "#f5b316", black: "#1f2023", white: "#f3f4f6", red: "#d92d20", blue: "#1f6fd1", gray: "#9aa0a6", green: "#2e9e3e" };
export const OKADA_COLORS = { yellow: "#f5b316", black: "#2a2b2e", red: "#d92d20", blue: "#1f6fd1", green: "#2e9e3e" };
export const KEKE_COLORS = { yellow: "#f5c518", blue: "#1f6fd1", green: "#2e9e3e" };
/** Abuja's cabs: green with a white band. */
export const TAXI_COLOR = "#16a34a";

const LINE = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const thin = (c: string, w = 2) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const shape = (d: string, fill: string) => `<path d="${d}" fill="${fill}" ${LINE}/>`;
const GLASS = "#22313f";
const TRIM = "#1d1e21";
const GOLD = "#f5b81c";

const crown = (x: number, y: number, s = 1) =>
  `<path d="M${x - 5 * s} ${y + 3 * s} L${x - 5 * s} ${y - 2 * s} L${x - 2.5 * s} ${y + 0.5 * s} L${x} ${y - 3.5 * s} L${x + 2.5 * s} ${y + 0.5 * s} L${x + 5 * s} ${y - 2 * s} L${x + 5 * s} ${y + 3 * s} Z" fill="${GOLD}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`;

function wheelSide(x: number, y: number, r: number, rim = "#c9ccd1"): string {
  const spokes = [0, 72, 144, 216, 288]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      return `M${x} ${y} L${(x + Math.cos(rad) * r * 0.58).toFixed(1)} ${(y + Math.sin(rad) * r * 0.58).toFixed(1)}`;
    })
    .join(" ");
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#1b1b1e" ${LINE}/><circle cx="${x}" cy="${y}" r="${(r * 0.62).toFixed(1)}" fill="${rim}" stroke="${INK}" stroke-width="1.4"/><path d="${spokes}" ${thin("#5b5f66", 1.6)}/><circle cx="${x}" cy="${y}" r="${(r * 0.18).toFixed(1)}" fill="#3a3d42"/>`;
}

const shadow = (cx: number, y: number, rx: number) => `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="5" fill="#000" opacity="0.22"/>`;

/** A helmeted okada rider (side, front or back). */
function rider(view: VehicleView, jacket = "#2f3a4a", helmet = "#e8e8e8"): string {
  if (view === "side") {
    return (
      `<path d="M50 34 L62 48 L58 62" ${thin(INK, 9)}/><path d="M50 34 L62 48 L58 62" ${thin("#2b2f36", 6)}/>` +
      shape("M42 8 Q44 2 52 2 L64 2 Q70 4 70 12 L68 36 L46 36 Q40 32 42 8 Z", jacket) +
      `<path d="M64 12 L88 22" ${thin(INK, 8)}/><path d="M64 12 L88 22" ${thin(jacket, 5)}/>` +
      `<circle cx="58" cy="-8" r="12.5" fill="${helmet}" ${LINE}/><path d="M60 -12 Q70 -12 70 -4 L62 -3 Z" fill="${GLASS}" stroke="${INK}" stroke-width="1.4"/>`
    );
  }
  const back = view === "back";
  return (
    shape("M20 14 Q20 6 30 6 L50 6 Q60 6 60 14 L58 40 L22 40 Z", jacket) +
    (back ? "" : `<path d="M22 16 L6 28 M58 16 L74 28" ${thin(INK, 7)}/><path d="M22 16 L6 28 M58 16 L74 28" ${thin(jacket, 4.4)}/>`) +
    `<circle cx="40" cy="-6" r="13" fill="${helmet}" ${LINE}/>` +
    (back ? "" : `<rect x="31" y="-10" width="18" height="8" rx="4" fill="${GLASS}" stroke="${INK}" stroke-width="1.4"/>`)
  );
}

// ── Cars (SUV) and taxis ────────────────────────────────────────────────────

function car(color: string, view: VehicleView, taxi: boolean): string {
  const d = tone(color, 0.78);
  const hi = tone(color, 1.2);
  const roof = color === CAR_COLORS.black ? "#3a3b40" : TRIM;
  const sign = (cx: number, y: number) => `<rect x="${cx - 13}" y="${y}" width="26" height="9" rx="2.5" fill="#fef08a" ${LINE}/><text x="${cx}" y="${y + 7}" font-family="Arial, sans-serif" font-size="6.6" font-weight="700" text-anchor="middle" fill="${INK}">TAXI</text>`;
  if (view === "side") {
    return (
      shadow(90, 82, 80) +
      shape("M14 70 L14 46 Q14 40 22 38 L40 36 L54 14 Q57 10 64 10 L126 10 Q133 10 137 15 L152 36 Q166 39 166 50 L166 62 Q166 70 158 70 Z", color) +
      shape("M54 14 Q57 10 64 10 L126 10 Q133 10 137 15 L139 18 L52 18 Z", roof) +
      shape("M58 21 L91 21 L91 36 L46 36 Z", GLASS) +
      shape("M97 21 L131 21 L145 36 L97 36 Z", GLASS) +
      `<path d="M62 33 L74 23 M104 33 L114 23" ${thin("#ffffff", 2)} opacity="0.35"/>` +
      `<path d="M94 38 L94 58 M56 38 L52 58" ${thin(d, 1.8)}/><rect x="98" y="42" width="9" height="3" rx="1.5" fill="${d}"/><rect x="60" y="42" width="9" height="3" rx="1.5" fill="${d}"/>` +
      (taxi ? `<rect x="15" y="47" width="150" height="6" fill="#ffffff"/><path d="M15 47 L165 47 M15 53 L165 53" ${thin(INK, 1.2)}/>` + sign(96, 1) : "") +
      shape("M14 58 L166 58 L166 62 Q166 70 158 70 L14 70 Z", TRIM) +
      `<path d="M24 70 A20 20 0 0 1 64 70 Z M114 70 A20 20 0 0 1 154 70 Z" fill="${TRIM}"/>` +
      shape("M151 40 L165 44 L163 49 L149 46 Z", "#e4f4ff") +
      shape("M14 41 L21 40 L21 49 L14 49 Z", "#e5342a") +
      shape("M138 26 L146 25 L147 31 L140 32 Z", d) +
      wheelSide(44, 68, 15) +
      wheelSide(134, 68, 15) +
      `<path d="M30 40 L140 40" ${thin(hi, 1.6)} opacity="0.7"/>`
    );
  }
  const front = view === "front";
  const wheels = `<rect x="12" y="62" width="16" height="18" rx="4" fill="#1b1b1e" ${LINE}/><rect x="82" y="62" width="16" height="18" rx="4" fill="#1b1b1e" ${LINE}/>`;
  const body = shape("M10 70 L10 44 Q10 36 20 34 L28 14 Q30 8 38 8 L72 8 Q80 8 82 14 L90 34 Q100 36 100 44 L100 70 Z", color) + shape("M28 14 Q30 8 38 8 L72 8 Q80 8 82 14 L82.6 16 L27.4 16 Z", roof);
  const mirrors = shape("M10 30 L2 28 L2 35 L10 36 Z", d) + shape("M100 30 L108 28 L108 35 L100 36 Z", d);
  if (front) {
    return (
      shadow(55, 82, 50) +
      wheels +
      body +
      mirrors +
      shape("M31 18 L79 18 L86 34 L24 34 Z", GLASS) +
      `<path d="M36 30 L46 20 M58 30 L66 22" ${thin("#ffffff", 2)} opacity="0.35"/>` +
      shape("M14 40 L36 42 L34 49 L14 47 Z", "#e4f4ff") +
      shape("M96 40 L74 42 L76 49 L96 47 Z", "#e4f4ff") +
      `<path d="M16 41 L34 43 M94 41 L76 43" ${thin("#7cc4ff", 1.6)}/>` +
      shape("M38 45 L72 45 L70 56 L40 56 Z", TRIM) +
      `<path d="M42 49 L68 49 M42 52.5 L68 52.5" ${thin("#4b4f57", 1.2)}/>` +
      crown(55, 50, 1.1) +
      shape("M10 59 L100 59 L100 70 L10 70 Z", TRIM) +
      `<rect x="44" y="61" width="22" height="6" rx="1.5" fill="#f8fafc" stroke="${INK}" stroke-width="1"/>` +
      (taxi ? sign(55, -2) : "")
    );
  }
  return (
    shadow(55, 82, 50) +
    wheels +
    body +
    mirrors +
    shape("M30 18 L80 18 L85 32 L25 32 Z", GLASS) +
    `<path d="M14 38 L96 38" ${thin(INK, 6)}/><path d="M14 38 L96 38" ${thin("#e5342a", 3.6)}/>` +
    shape("M12 36 L28 36 L28 44 L12 44 Z", "#e5342a") +
    shape("M98 36 L82 36 L82 44 L98 44 Z", "#e5342a") +
    crown(55, 45, 1) +
    `<rect x="42" y="50" width="26" height="8" rx="1.5" fill="#f8fafc" stroke="${INK}" stroke-width="1.1"/>` +
    shape("M10 60 L100 60 L100 70 L10 70 Z", TRIM) +
    `<ellipse cx="34" cy="68" rx="4" ry="2.4" fill="#9aa0a6" stroke="${INK}" stroke-width="1"/><ellipse cx="76" cy="68" rx="4" ry="2.4" fill="#9aa0a6" stroke="${INK}" stroke-width="1"/>` +
    (taxi ? sign(55, -2) : "")
  );
}

// ── Okada (motorbike, with its rider) ───────────────────────────────────────

function okada(color: string, view: VehicleView): string {
  const d = tone(color, 0.75);
  if (view === "side") {
    return (
      shadow(66, 82, 58) +
      wheelSide(28, 66, 16, color) +
      wheelSide(104, 66, 16, color) +
      `<path d="M92 30 L104 66" ${thin(INK, 6)}/><path d="M92 30 L104 66" ${thin("#c9ccd1", 3.6)}/>` +
      shape("M50 44 L78 44 L80 60 L54 62 Z", "#3a3d42") +
      `<path d="M62 58 Q40 62 14 56" ${thin(INK, 7)}/><path d="M62 58 Q40 62 14 56" ${thin("#c9ccd1", 4.6)}/>` +
      shape("M14 46 Q22 40 40 42 L40 50 Q26 50 16 54 Z", color) +
      shape("M44 36 Q50 24 72 26 L88 30 L82 44 L48 46 Z", color) +
      `<path d="M52 32 Q66 28 80 32" ${thin(tone(color, 1.3), 2)}/>` +
      shape("M26 36 Q38 28 56 32 L54 40 L30 42 Z", "#1d1e21") +
      shape("M86 22 L100 20 L104 34 L92 38 Z", d) +
      shape("M100 26 L106 27 L105 33 L100 33 Z", "#e4f4ff") +
      `<path d="M86 22 L90 14 L84 12" ${thin(INK, 3)}/>` +
      crown(66, 37, 0.8) +
      rider("side")
    );
  }
  const front = view === "front";
  return (
    shadow(40, 82, 22) +
    `<rect x="33" y="52" width="14" height="28" rx="6" fill="#1b1b1e" ${LINE}/>` +
    rider(view) +
    shape("M24 40 Q24 30 40 30 Q56 30 56 40 L52 58 L28 58 Z", color) +
    (front
      ? shape("M30 34 L50 34 L48 46 L32 46 Z", "#e4f4ff") + `<path d="M4 26 L76 26" ${thin(INK, 4)}/><circle cx="4" cy="22" r="4" fill="${d}" ${LINE}/><circle cx="76" cy="22" r="4" fill="${d}" ${LINE}/>` + crown(40, 52, 0.7)
      : shape("M32 40 L48 40 L47 46 L33 46 Z", "#e5342a") + `<rect x="31" y="49" width="18" height="7" rx="1.5" fill="#f8fafc" stroke="${INK}" stroke-width="1"/>`)
  );
}

// ── Keke (tricycle) ─────────────────────────────────────────────────────────

function keke(color: string, view: VehicleView): string {
  const d = tone(color, 0.78);
  if (view === "side") {
    return (
      shadow(76, 84, 66) +
      shape("M14 6 Q14 2 22 2 L116 2 Q126 2 128 8 L130 14 L14 14 Z", TRIM) +
      `<path d="M20 14 L20 46 M122 14 L136 48" ${thin(INK, 5)}/><path d="M20 14 L20 46 M122 14 L136 48" ${thin(TRIM, 3)}/>` +
      shape("M122 16 L132 40 L120 42 L114 18 Z", "#bfe3f5") +
      shape("M30 32 L68 32 L68 46 L30 46 Z", "#7a4a2b") +
      shape("M30 20 L36 20 L36 34 L30 34 Z", "#6a3f24") +
      // The driver up front.
      shape("M92 22 Q92 16 100 16 L106 16 Q112 18 112 24 L110 44 L94 44 Z", "#2f6f3e") +
      `<circle cx="102" cy="10" r="8.5" fill="#7a4523" ${LINE}/><path d="M95 7 Q102 0 109 7 Z" fill="#1f1410"/>` +
      shape("M12 74 L12 50 Q12 44 20 44 L112 44 Q124 44 130 50 L142 62 L142 72 L120 76 Z", color) +
      `<path d="M14 58 L140 58" ${thin(d, 2)}/>` +
      shape("M136 52 L144 54 L143 60 L136 59 Z", "#e4f4ff") +
      shape("M12 50 L18 50 L18 58 L12 58 Z", "#e5342a") +
      crown(74, 52, 1.1) +
      wheelSide(42, 74, 12) +
      wheelSide(130, 74, 11)
    );
  }
  const front = view === "front";
  return (
    shadow(45, 84, 40) +
    `<rect x="6" y="66" width="12" height="16" rx="3" fill="#1b1b1e" ${LINE}/><rect x="72" y="66" width="12" height="16" rx="3" fill="#1b1b1e" ${LINE}/>` +
    shape("M8 6 Q8 2 16 2 L74 2 Q82 2 82 6 L82 14 L8 14 Z", TRIM) +
    `<path d="M12 14 L12 40 M78 14 L78 40" ${thin(INK, 5)}/><path d="M12 14 L12 40 M78 14 L78 40" ${thin(TRIM, 3)}/>` +
    (front ? shape("M16 15 L74 15 L72 38 L18 38 Z", "#bfe3f5") + `<circle cx="45" cy="26" r="7" fill="#7a4523" ${LINE}/><path d="M38 23 Q45 16 52 23 Z" fill="#1f1410"/>` : shape("M14 15 L76 15 L76 40 L14 40 Z", TRIM) + shape("M30 20 L60 20 L60 30 L30 30 Z", "#bfe3f5")) +
    shape("M10 40 L80 40 Q84 40 84 46 L82 68 L8 68 L6 46 Q6 40 10 40 Z", color) +
    (front
      ? `<circle cx="22" cy="50" r="6" fill="#fdf6d8" ${LINE}/><circle cx="68" cy="50" r="6" fill="#fdf6d8" ${LINE}/>` + crown(45, 50, 1.1) + `<rect x="39" y="60" width="12" height="22" rx="4" fill="#1b1b1e" ${LINE}/>`
      : shape("M12 46 L20 46 L20 58 L12 58 Z", "#e5342a") + shape("M70 46 L78 46 L78 58 L70 58 Z", "#e5342a") + `<rect x="34" y="52" width="22" height="9" rx="1.5" fill="#f8fafc" stroke="${INK}" stroke-width="1"/>` + crown(45, 47, 0.9))
  );
}

// ── Bus (yellow and black, the city's workhorse) ────────────────────────────

function cityBus(color: string, view: VehicleView): string {
  if (view === "side") {
    const windows = [30, 62, 94, 126].map((x) => shape(`M${x} 14 L${x + 26} 14 L${x + 26} 34 L${x} 34 Z`, GLASS)).join("");
    return (
      shadow(100, 84, 92) +
      shape("M10 74 L10 14 Q10 4 22 4 L176 4 Q190 4 192 16 L196 40 L196 70 Q196 76 188 76 Z", color) +
      windows +
      shape("M160 14 L184 14 L192 40 L160 40 Z", GLASS) +
      `<path d="M10 46 L196 46" ${thin(INK, 7)}/><path d="M10 46 L196 46" ${thin("#1d1e21", 5)}/><path d="M10 56 L196 56" ${thin(INK, 4)}/>` +
      shape("M190 50 L197 52 L197 58 L190 57 Z", "#e4f4ff") +
      crown(100, 64, 1.2) +
      wheelSide(46, 74, 14) +
      wheelSide(160, 74, 14)
    );
  }
  const front = view === "front";
  return (
    shadow(50, 84, 46) +
    `<rect x="8" y="64" width="16" height="18" rx="4" fill="#1b1b1e" ${LINE}/><rect x="76" y="64" width="16" height="18" rx="4" fill="#1b1b1e" ${LINE}/>` +
    shape("M6 72 L6 12 Q6 2 18 2 L82 2 Q94 2 94 12 L94 72 Z", color) +
    shape(front ? "M12 10 L88 10 L88 38 L12 38 Z" : "M16 10 L84 10 L84 30 L16 30 Z", GLASS) +
    `<path d="M6 46 L94 46" ${thin(INK, 7)}/><path d="M6 46 L94 46" ${thin("#1d1e21", 5)}/>` +
    (front ? `<circle cx="18" cy="58" r="5" fill="#e4f4ff" ${LINE}/><circle cx="82" cy="58" r="5" fill="#e4f4ff" ${LINE}/>` : shape("M10 52 L18 52 L18 64 L10 64 Z", "#e5342a") + shape("M82 52 L90 52 L90 64 L82 64 Z", "#e5342a")) +
    crown(50, 58, 1.1)
  );
}

// ── Working vehicles: trucks, vans, emergency and construction ──────────────

type Work = { body: string; cab: string; label: string; labelColor: string; lights?: [string, string]; drum?: boolean; long: number };

const WORK: Partial<Record<VehicleKind, (color: string) => Work>> = {
  truck: (c) => ({ body: "#f3f4f6", cab: c, label: "LOGISTICS", labelColor: c, long: 200 }),
  van: (c) => ({ body: c, cab: c, label: "CHOPNOW", labelColor: "#ffffff", long: 160 }),
  ambulance: () => ({ body: "#f8fafc", cab: "#f8fafc", label: "AMBULANCE", labelColor: "#dc2626", lights: ["#ef4444", "#3b82f6"], long: 170 }),
  police: () => ({ body: "#f8fafc", cab: "#1e3a8a", label: "POLICE", labelColor: "#1e3a8a", lights: ["#ef4444", "#3b82f6"], long: 150 }),
  firetruck: () => ({ body: "#dc2626", cab: "#dc2626", label: "FIRE SERVICE", labelColor: "#ffffff", lights: ["#ef4444", "#facc15"], long: 210 }),
  mixer: () => ({ body: "#9ca3af", cab: "#f59e0b", label: "CEMENT", labelColor: "#1f2937", drum: true, long: 200 }),
};

function workVehicle(kind: VehicleKind, color: string, view: VehicleView): string {
  const w = WORK[kind]!(color);
  const L = w.long;
  const cabD = tone(w.cab, 0.78);
  const bodyD = tone(w.body, 0.82);
  const lightbar = (x: number, y: number, len: number) => (w.lights ? `<rect x="${x}" y="${y}" width="${len / 2}" height="6" rx="2" fill="${w.lights[0]}" ${LINE}/><rect x="${x + len / 2}" y="${y}" width="${len / 2}" height="6" rx="2" fill="${w.lights[1]}" ${LINE}/>` : "");
  if (view === "side") {
    const cabX = L - 50;
    const box = w.drum
      ? shape(`M18 30 Q14 12 40 10 L${cabX - 16} 14 Q${cabX - 4} 30 ${cabX - 16} 50 L40 54 Q14 52 18 30 Z`, w.body) + `<path d="M40 14 L50 50 M70 12 L80 52 M100 12 L110 52" ${thin(bodyD, 2.4)}/>`
      : kind === "police"
        ? ""
        : shape(`M10 70 L10 10 Q10 4 16 4 L${cabX - 2} 4 L${cabX - 2} 70 Z`, w.body) + `<text x="${kind === "ambulance" ? (cabX + 44) / 2 : (cabX + 8) / 2}" y="36" font-family="Arial, sans-serif" font-size="${kind === "ambulance" ? 11 : 13}" font-weight="800" text-anchor="middle" fill="${w.labelColor}">${w.label}</text>` + `<path d="M10 54 L${cabX - 2} 54" ${thin(bodyD, 3)}/>`;
    if (kind === "police") return car("#f8fafc", "side", false).replace(/<\/svg>/, "") + `<rect x="15" y="46" width="150" height="8" fill="${w.cab}"/><text x="96" y="53" font-family="Arial, sans-serif" font-size="7" font-weight="800" text-anchor="middle" fill="#fff">POLICE</text>` + lightbar(78, 3, 24);
    return (
      shadow(L / 2, 84, L / 2 - 8) +
      box +
      shape(`M${cabX} 70 L${cabX} 20 Q${cabX} 12 ${cabX + 10} 12 L${L - 18} 12 Q${L - 8} 14 ${L - 4} 30 L${L} 44 L${L} 66 Q${L} 70 ${L - 6} 70 Z`, w.cab) +
      shape(`M${cabX + 8} 18 L${L - 18} 18 Q${L - 12} 22 ${L - 8} 36 L${cabX + 8} 36 Z`, GLASS) +
      `<path d="M${cabX} 54 L${L} 54" ${thin(cabD, 2.4)}/>` +
      shape(`M${L - 6} 44 L${L} 46 L${L} 52 L${L - 6} 51 Z`, "#e4f4ff") +
      lightbar(cabX + 8, 4, 30) +
      shape(`M6 62 L${L + 2} 62 L${L + 2} 72 L6 72 Z`, TRIM) +
      wheelSide(36, 72, 13) +
      (L > 180 ? wheelSide(66, 72, 13) : "") +
      wheelSide(L - 28, 72, 13) +
      (kind === "ambulance" ? `<rect x="24" y="18" width="10" height="26" fill="#dc2626"/><rect x="16" y="26" width="26" height="10" fill="#dc2626"/>` : "")
    );
  }
  const front = view === "front";
  return (
    shadow(55, 84, 50) +
    `<rect x="10" y="64" width="16" height="18" rx="4" fill="#1b1b1e" ${LINE}/><rect x="84" y="64" width="16" height="18" rx="4" fill="#1b1b1e" ${LINE}/>` +
    shape("M8 74 L8 12 Q8 2 20 2 L90 2 Q102 2 102 12 L102 74 Z", front ? w.cab : w.body) +
    (front ? shape("M16 10 L94 10 L94 36 L16 36 Z", GLASS) : kind === "mixer" ? shape("M22 6 Q55 -6 88 6 L88 40 Q55 50 22 40 Z", w.body) : `<path d="M55 6 L55 70" ${thin(bodyD, 2)}/>`) +
    lightbar(30, -6, 50) +
    (front
      ? `<circle cx="20" cy="54" r="6" fill="#fdf6d8" ${LINE}/><circle cx="90" cy="54" r="6" fill="#fdf6d8" ${LINE}/><rect x="36" y="46" width="38" height="14" rx="2" fill="${TRIM}" ${LINE}/>`
      : shape("M12 52 L20 52 L20 64 L12 64 Z", "#e5342a") + shape("M90 52 L98 52 L98 64 L90 64 Z", "#e5342a")) +
    `<text x="55" y="${front ? 72 : 30}" font-family="Arial, sans-serif" font-size="${w.label.length > 8 ? 7 : 9}" font-weight="800" text-anchor="middle" fill="${front ? "#ffffff" : w.labelColor}">${w.label}</text>`
  );
}

// ── Assembly ────────────────────────────────────────────────────────────────

/** Drawing boxes: x, y, width, height, and where the wheels touch the ground. */
const BOXES: Record<VehicleKind, Record<VehicleView, [number, number, number, number]>> = {
  car: { side: [0, -14, 180, 100], front: [-4, -14, 118, 100], back: [-4, -14, 118, 100] },
  taxi: { side: [0, -14, 180, 100], front: [-4, -14, 118, 100], back: [-4, -14, 118, 100] },
  okada: { side: [0, -24, 132, 110], front: [-4, -24, 88, 110], back: [-4, -24, 88, 110] },
  keke: { side: [0, -4, 152, 92], front: [0, -4, 90, 92], back: [0, -4, 90, 92] },
  bus: { side: [0, -4, 202, 92], front: [0, -4, 100, 92], back: [0, -4, 100, 92] },
  truck: { side: [0, -8, 206, 96], front: [0, -10, 110, 96], back: [0, -10, 110, 96] },
  van: { side: [0, -8, 166, 96], front: [0, -10, 110, 96], back: [0, -10, 110, 96] },
  ambulance: { side: [0, -8, 176, 96], front: [0, -10, 110, 96], back: [0, -10, 110, 96] },
  police: { side: [0, -14, 180, 100], front: [0, -10, 110, 96], back: [0, -10, 110, 96] },
  firetruck: { side: [0, -8, 216, 96], front: [0, -10, 110, 96], back: [0, -10, 110, 96] },
  mixer: { side: [0, -8, 206, 96], front: [0, -10, 110, 96], back: [0, -10, 110, 96] },
};
const GROUND: Record<VehicleKind, number> = { car: 82, taxi: 82, okada: 82, keke: 84, bus: 84, truck: 84, van: 84, ambulance: 84, police: 82, firetruck: 84, mixer: 84 };

export function vehicleSvg(kind: VehicleKind, color: string, view: VehicleView, scale = 1): string {
  const [x, y, w, h] = BOXES[kind][view];
  const inner = WORK[kind] ? workVehicle(kind, color, view) : kind === "car" || kind === "taxi" ? car(color, view, kind === "taxi") : kind === "okada" ? okada(color, view) : kind === "keke" ? keke(color, view) : cityBus(color, view);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${(w * scale).toFixed(1)}" height="${(h * scale).toFixed(1)}">${inner}</svg>`;
}

/**
 * The side view facing left, for vehicles with writing on them: the body is
 * mirrored but the lettering still reads the right way round.
 */
export function vehicleSvgLeft(kind: VehicleKind, color: string, scale = 1): string | null {
  const [x, y, w, h] = BOXES[kind].side;
  const inner = WORK[kind] ? workVehicle(kind, color, "side") : kind === "car" || kind === "taxi" ? car(color, "side", kind === "taxi") : kind === "okada" ? okada(color, "side") : kind === "keke" ? keke(color, "side") : cityBus(color, "side");
  if (!inner.includes("<text")) return null;
  const unflipped = inner.replace(/<text x="([\d.]+)"[^>]*>[^<]*<\/text>/g, (t, tx: string) => `<g transform="translate(${Number(tx) * 2} 0) scale(-1 1)">${t}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${(w * scale).toFixed(1)}" height="${(h * scale).toFixed(1)}"><g transform="translate(${2 * x + w} 0) scale(-1 1)">${unflipped}</g></svg>`;
}

/** Size of a view in drawing units, and the ground line as a fraction of its height (for the sprite origin). */
export function vehicleBox(kind: VehicleKind, view: VehicleView) {
  const [, y, w, h] = BOXES[kind][view];
  return { w, h, groundY: (GROUND[kind] - y) / h };
}

export type VehicleStyle = { kind: VehicleKind; color: string };

/** Every vehicle the city uses: traffic picks from these. */
export const FLEET: VehicleStyle[] = [
  ...Object.values(CAR_COLORS).map((color) => ({ kind: "car" as const, color })),
  { kind: "taxi", color: TAXI_COLOR },
  { kind: "okada", color: OKADA_COLORS.red },
  { kind: "okada", color: OKADA_COLORS.blue },
  { kind: "okada", color: OKADA_COLORS.yellow },
  { kind: "keke", color: KEKE_COLORS.yellow },
  { kind: "keke", color: KEKE_COLORS.green },
  { kind: "bus", color: "#f5c518" },
  { kind: "truck", color: "#1d4ed8" },
  { kind: "truck", color: "#dc2626" },
  { kind: "van", color: "#f59e0b" },
  { kind: "van", color: "#16a34a" },
  { kind: "ambulance", color: "#f8fafc" },
  { kind: "police", color: "#1e3a8a" },
  { kind: "firetruck", color: "#dc2626" },
  { kind: "mixer", color: "#f59e0b" },
];

export const vehicleKey = (v: VehicleStyle) => `veh_${v.kind}_${v.color.slice(1)}`;
