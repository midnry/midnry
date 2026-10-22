/**
 * Draws the mini-city plan and the current Breakwater base in one top-down
 * style, from map data only (no game code is changed or run).
 *
 *   node scripts/outpost-city/render.mjs
 *
 * Writes docs/mini-city-plan.svg, docs/mini-city-plan.png and
 * docs/current-map.png. PNGs are rendered with Playwright's Chromium.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { PROTOCOL_MAP } from "../../public/games/outpost-protocol-map.js";
import * as City from "./layout.mjs";
import { layoutStats } from "./stats.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const T = 26;            // pixels per tile (same for both maps, so sizes compare)
const PAD = 56;          // margin around the map
const LEGEND_W = 340;
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";

const COLORS = {
  building: "#4a5058", buildingEdge: "#2f343a",
  interior: "#f2eadb", corridor: "#dccdb0",
  street: "#c9cac5", plaza: "#e8dcbf", park: "#a8cf8e", water: "#69a5d6",
  bridge: "#b38c5c", helipad: "#d6dadf",
  tree: "#4f8f45", stall: "#d9893b", vehicle: "#3d5a80", metal: "#8a949c", prop: "#7d6b55",
  spawn: "#2f6fdb", task: "#e8b923", supply: "#2e9e5b", site: "#d1453b", vent: "#8b56c9",
  load: "#0fa3a3", emergency: "#c62828", lamp: "#ffd34d", text: "#1f2328",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const X = (x) => PAD + x * T, Y = (y) => PAD + 40 + y * T;

/* ---------- models: tile kinds + overlays, one per map -------------------- */
function cityModel() {
  const kinds = City.GRID.map((row) => [...row].map((ch) => (City.BUILDINGS[ch] ? "interior" : City.LEGEND[ch].kind)));
  const level = City.collisionLevel();
  return {
    title: "PROPOSED: Calder Quay — a mini city for Blackout Protocol",
    subtitle: "Same rules, same objectives — blocks, streets, a square, a park and a canal instead of rooms and corridors",
    size: City.SIZE, kinds,
    map: { level, loading: City.LOADING, supplies: City.SUPPLIES, stations: City.STATIONS },
    seeThrough: [7],
    stations: City.STATIONS, supplies: City.SUPPLIES, sites: City.SITES, vents: City.VENTS,
    spawns: City.SPAWNS, loading: City.LOADING, emergency: City.EMERGENCY,
    labels: [
      ...City.LANDMARKS.map((l) => ({ ...l, kind: "landmark" })),
      ...City.STREET_NAMES.map((l) => ({ ...l, kind: "street" })),
      ...City.DISTRICTS.map((l) => ({ ...l, kind: "district" })),
    ],
    chamfers: City.DRESSING.chamfers,
    lamps: City.DRESSING.streetLamps,
    sightlines: [
      { from: [17, 1.2], to: [17, 11.6], text: "long view" },
      { from: [17, 13.4], to: [17, 22], text: "long view" },
      { from: [9.6, 28.2], to: [21.6, 28.2], text: "" },
    ],
  };
}

function breakwaterModel() {
  const m = PROTOCOL_MAP, n = m.level.length;
  const corridor = (r) => /corridor|passage/.test(r.id);
  const kinds = m.level.map((row, y) => row.map((t, x) => {
    if (t === 1) return "building";
    if (t === 2 || t === 3 || t === 4) return "prop";
    if (t === 5 || t === 6) return "metal";
    const room = m.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    if (!room) {
      // Door cells between rooms are part of the interior; gate approaches are outside.
      if (x === 1 || x === n - 2 || y === n - 2) return "street";
      return "interior";
    }
    if (room.roofed === false) return "street";
    return corridor(room) ? "corridor" : "interior";
  }));
  const short = {
    "Command / Operations": "COMMAND", "Communications / Radar": "COMMS / RADAR", "Barracks / Mess Hall": "BARRACKS",
    "Covered Supply Atrium": "ATRIUM", "Vehicle Hangar": "HANGAR", "Generators / Power": "GENERATORS",
    "Maintenance Tunnels": "MAINTENANCE", "Medical / Supply Depot": "DEPOT", Armory: "ARMORY",
    "Perimeter / South Gate": "PERIMETER / SOUTH GATE",
  };
  const labels = m.rooms.filter((r) => short[r.name]).map((r) => ({
    label: short[r.name], x: r.x + r.w / 2, y: r.y + (r.h > 2 ? r.h / 2 - 0.6 : r.h / 2 + 0.25), kind: "landmark",
  }));
  for (const r of m.rooms.filter(corridor)) {
    const vertical = r.h > r.w;
    labels.push({ label: r.name.replace(" Service", "").toUpperCase(), x: r.x + r.w / 2, y: r.y + r.h / 2 + (vertical ? 0 : 0.2), kind: "street", vertical, small: true });
  }
  return {
    title: "CURRENT: Breakwater Forward Base (Blackout Protocol default)",
    subtitle: "Nine rectangular rooms on a 3 × 3 grid, linked by straight service corridors",
    size: n, kinds,
    map: m,
    seeThrough: [],
    stations: m.stations, supplies: m.supplies, sites: m.sites, vents: m.vents,
    spawns: m.spawns, loading: m.loading, emergency: m.emergency,
    labels: labels.filter((l) => !/NORTH UTILITY|OPERATIONS PASSAGE|FLIGHT PASSAGE|POWER PASSAGE|DEPOT PASSAGE|MAINTENANCE PASSAGE|CENTRAL PASSAGE/.test(l.label) || true),
    chamfers: [], lamps: [], sightlines: [],
    props: m.props,
  };
}

/* ---------- drawing ------------------------------------------------------- */
function tiles(model) {
  const out = [];
  const fill = { building: COLORS.building, interior: COLORS.interior, corridor: COLORS.corridor, street: COLORS.street,
    plaza: COLORS.plaza, park: COLORS.park, water: COLORS.water, bridge: COLORS.bridge, helipad: COLORS.helipad,
    tree: COLORS.park, stall: COLORS.plaza, vehicle: COLORS.plaza, metal: COLORS.metal, prop: COLORS.prop };
  model.kinds.forEach((row, y) => row.forEach((k, x) => {
    out.push(`<rect x="${X(x)}" y="${Y(y)}" width="${T + 0.4}" height="${T + 0.4}" fill="${fill[k]}"/>`);
  }));
  // Things that stand on the ground: trees, stalls, vehicles, pumps/mast.
  model.kinds.forEach((row, y) => row.forEach((k, x) => {
    const cx = X(x + 0.5), cy = Y(y + 0.5);
    if (k === "tree") out.push(`<circle cx="${cx}" cy="${cy}" r="${T * 0.46}" fill="${COLORS.tree}" stroke="#2f6a2a" stroke-width="1.5"/><circle cx="${cx - 3}" cy="${cy - 3}" r="${T * 0.18}" fill="#6fb062"/>`);
    if (k === "stall") out.push(`<rect x="${X(x) + 3}" y="${Y(y) + 3}" width="${T - 6}" height="${T - 6}" rx="3" fill="${COLORS.stall}" stroke="#8a4f17" stroke-width="1.2"/><path d="M${X(x) + 3} ${Y(y) + 9}h${T - 6}" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/>`);
    if (k === "vehicle") out.push(`<rect x="${X(x) + 2}" y="${Y(y) + 4}" width="${T - 4}" height="${T - 8}" rx="2" fill="${COLORS.vehicle}" stroke="#22344d"/>`);
    if (k === "water") {
      const right = model.kinds[y][x + 1] !== "water", left = model.kinds[y][x - 1] !== "water";
      if (!left && !right) out.push(`<path d="M${X(x)} ${cy - 2}q${T / 4} -4 ${T / 2} 0t${T / 2} 0" fill="none" stroke="#b9dbf3" stroke-width="1.2" opacity=".8"/>`);
    }
    if (k === "bridge") out.push(`<path d="M${X(x)} ${Y(y) + 1}h${T}M${X(x)} ${Y(y) + T - 1}h${T}" stroke="#6b4e2b" stroke-width="1"/>`);
  }));
  // Building edges: outline walkable/solid borders so blocks read as blocks.
  const solid = (k) => ["building", "metal"].includes(k);
  const edges = [];
  model.kinds.forEach((row, y) => row.forEach((k, x) => {
    if (!solid(k)) return;
    for (const [dx, dy, x1, y1, x2, y2] of [[0, -1, 0, 0, 1, 0], [0, 1, 0, 1, 1, 1], [-1, 0, 0, 0, 0, 1], [1, 0, 1, 0, 1, 1]]) {
      const nk = model.kinds[y + dy]?.[x + dx];
      if (nk && !solid(nk)) edges.push(`M${X(x + x1)} ${Y(y + y1)}L${X(x + x2)} ${Y(y + y2)}`);
    }
  }));
  out.push(`<path d="${edges.join("")}" stroke="${COLORS.buildingEdge}" stroke-width="2.2" fill="none" stroke-linecap="square"/>`);
  return out.join("\n");
}

function helipad(model) {
  const cells = [];
  model.kinds.forEach((row, y) => row.forEach((k, x) => { if (k === "helipad") cells.push([x, y]); }));
  if (!cells.length) return "";
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const cx = X((Math.min(...xs) + Math.max(...xs) + 1) / 2), cy = Y((Math.min(...ys) + Math.max(...ys) + 1) / 2);
  return `<circle cx="${cx}" cy="${cy}" r="${T * 1.7}" fill="none" stroke="#f4f4f4" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${T * 1.7}" fill="none" stroke="#e0a100" stroke-width="1.5" stroke-dasharray="6 5"/>
  <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="800" fill="#ffffff" stroke="#9aa1a8" stroke-width="1">H</text>`;
}

function chamfers(model) {
  return model.chamfers.map(({ at: [x, y], corner }) => {
    const pts = {
      ne: [[x, y], [x + 1, y], [x + 1, y + 1]], nw: [[x, y], [x + 1, y], [x, y + 1]],
      se: [[x + 1, y], [x + 1, y + 1], [x, y + 1]], sw: [[x, y], [x, y + 1], [x + 1, y + 1]],
    }[corner];
    const d = pts.map(([u, v], i) => `${i ? "L" : "M"}${X(u)} ${Y(v)}`).join("") + "Z";
    const diag = { ne: [pts[0], pts[2]], nw: [pts[1], pts[2]], se: [pts[0], pts[2]], sw: [pts[0], pts[2]] }[corner];
    return `<path d="${d}" fill="#7fae6a" opacity=".9"/><path d="M${X(diag[0][0])} ${Y(diag[0][1])}L${X(diag[1][0])} ${Y(diag[1][1])}" stroke="#ffffff" stroke-width="2.4" stroke-dasharray="4 3"/>`;
  }).join("\n");
}

function lamps(model) {
  return model.lamps.map(([x, y]) => `<circle cx="${X(x)}" cy="${Y(y)}" r="9" fill="${COLORS.lamp}" opacity=".22"/><circle cx="${X(x)}" cy="${Y(y)}" r="2.6" fill="#f2b705" stroke="#6b5000" stroke-width=".8"/>`).join("");
}

function sightlines(model) {
  return model.sightlines.map(({ from, to, text }) => {
    const [x1, y1] = from, [x2, y2] = to;
    const mid = [(x1 + x2) / 2, (y1 + y2) / 2];
    return `<path d="M${X(x1)} ${Y(y1)}L${X(x2)} ${Y(y2)}" stroke="#1d4f91" stroke-width="2" stroke-dasharray="8 5" marker-start="url(#arrow)" marker-end="url(#arrow)" opacity=".75"/>` +
      (text ? `<text x="${X(mid[0]) + 18}" y="${Y(mid[1])}" font-family="${FONT}" font-size="10" font-style="italic" fill="#1d4f91" transform="rotate(90 ${X(mid[0]) + 18} ${Y(mid[1])})" text-anchor="middle">${esc(text)}</text>` : "");
  }).join("\n");
}

function ventLinks(model) {
  const byId = Object.fromEntries(model.vents.map((v) => [v.id, v]));
  const done = new Set(), out = [];
  for (const v of model.vents) for (const id of v.links) {
    const key = [v.id, id].sort().join("|");
    if (done.has(key) || !byId[id]) continue;
    done.add(key);
    const a = byId[id];
    const mx = (v.x + a.x) / 2 + (a.y - v.y) * 0.12, my = (v.y + a.y) / 2 - (a.x - v.x) * 0.12;
    out.push(`<path d="M${X(v.x)} ${Y(v.y)}Q${X(mx)} ${Y(my)} ${X(a.x)} ${Y(a.y)}" fill="none" stroke="${COLORS.vent}" stroke-width="1.4" stroke-dasharray="2 4" opacity=".55"/>`);
  }
  return out.join("");
}

const marker = {
  spawn: (x, y, n) => `<circle cx="${X(x)}" cy="${Y(y)}" r="8.5" fill="${COLORS.spawn}" stroke="#fff" stroke-width="1.6"/><text x="${X(x)}" y="${Y(y) + 3.6}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="700" fill="#fff">${n}</text>`,
  task: (x, y) => `<path d="M${X(x)} ${Y(y) - 8}L${X(x) + 8} ${Y(y)}L${X(x)} ${Y(y) + 8}L${X(x) - 8} ${Y(y)}Z" fill="${COLORS.task}" stroke="#6b5200" stroke-width="1.3"/>`,
  supply: (x, y, stock) => `<rect x="${X(x) - 8}" y="${Y(y) - 8}" width="16" height="16" rx="3" fill="${stock ? COLORS.supply : "#ffffff"}" stroke="${COLORS.supply}" stroke-width="1.8"/><path d="M${X(x) - 4.5} ${Y(y)}h9M${X(x)} ${Y(y) - 4.5}v9" stroke="${stock ? "#fff" : COLORS.supply}" stroke-width="2.4"/>`,
  site: (x, y) => `<path d="M${X(x)} ${Y(y) - 7}L${X(x) + 7} ${Y(y) + 6}L${X(x) - 7} ${Y(y) + 6}Z" fill="${COLORS.site}" stroke="#fff" stroke-width="1.2"/>`,
  vent: (x, y) => `<circle cx="${X(x)}" cy="${Y(y)}" r="7" fill="#fff" stroke="${COLORS.vent}" stroke-width="2.4"/><path d="M${X(x) - 4} ${Y(y)}h8M${X(x)} ${Y(y) - 4}v8" stroke="${COLORS.vent}" stroke-width="1.4"/>`,
  load: (x, y) => `<circle cx="${X(x)}" cy="${Y(y)}" r="14" fill="${COLORS.load}" stroke="#fff" stroke-width="2.5"/><text x="${X(x)}" y="${Y(y) + 3.5}" text-anchor="middle" font-family="${FONT}" font-size="7.5" font-weight="800" fill="#fff">LOAD</text>`,
  emergency: (x, y) => `<circle cx="${X(x)}" cy="${Y(y)}" r="11" fill="${COLORS.emergency}" stroke="#fff" stroke-width="2.2"/><text x="${X(x)}" y="${Y(y) + 5}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="900" fill="#fff">!</text>`,
};

// Supplies and stations can share a tile in Breakwater (a stocked locker at a
// task terminal). Nudge overlapping markers apart so both stay readable.
function spread(points) {
  const seen = new Map();
  return points.map((p) => {
    const key = `${Math.floor(p.x)},${Math.floor(p.y)}`, n = seen.get(key) || 0;
    seen.set(key, n + 1);
    const off = [[0, 0], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]][n] || [0, 0];
    return { ...p, x: p.x + off[0], y: p.y + off[1] };
  });
}

function markers(model) {
  const out = [ventLinks(model)];
  const all = spread([
    ...model.supplies.map((p) => ({ ...p, t: "supply" })),
    ...model.stations.map((p) => ({ ...p, t: "task" })),
    ...model.sites.map((p) => ({ ...p, t: "site" })),
    ...model.vents.map((p) => ({ ...p, t: "vent" })),
  ]);
  for (const p of all) out.push(marker[p.t](p.x, p.y, p.stock));
  out.push(marker.load(model.loading.x, model.loading.y));
  out.push(marker.emergency(model.emergency.x, model.emergency.y));
  model.spawns.forEach(([x, y], i) => out.push(marker.spawn(x, y, i + 1)));
  return out.join("\n");
}

function labels(model) {
  return model.labels.map((l) => {
    const size = l.kind === "district" ? 13 : l.kind === "landmark" ? 11.5 : l.small ? 8.5 : 9.5;
    const weight = l.kind === "street" ? 600 : 800;
    const fill = l.kind === "district" ? "#5b6470" : l.kind === "street" ? "#3b4048" : COLORS.text;
    const rot = l.vertical ? ` transform="rotate(-90 ${X(l.x)} ${Y(l.y)})"` : "";
    const spacing = l.kind === "district" ? 4 : 0.6;
    return `<text x="${X(l.x)}" y="${Y(l.y)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${fill}" stroke="#ffffff" stroke-width="3" stroke-opacity=".8" paint-order="stroke"${rot}>${esc(l.label)}</text>`;
  }).join("\n");
}

function scaleBar(model) {
  const y = Y(model.size) + 30, x = X(0);
  const seg = (i) => `<rect x="${x + i * 5 * T}" y="${y}" width="${5 * T}" height="8" fill="${i % 2 ? "#ffffff" : "#2b3036"}" stroke="#2b3036"/>`;
  return `${seg(0)}${seg(1)}
  <text x="${x}" y="${y + 24}" font-family="${FONT}" font-size="11" fill="#2b3036">0</text>
  <text x="${x + 5 * T}" y="${y + 24}" font-family="${FONT}" font-size="11" fill="#2b3036" text-anchor="middle">15 m</text>
  <text x="${x + 10 * T}" y="${y + 24}" font-family="${FONT}" font-size="11" fill="#2b3036" text-anchor="middle">30 m (10 tiles)</text>
  <g transform="translate(${X(model.size) - 20} ${y + 6})"><path d="M0 -14L7 6L0 1L-7 6Z" fill="#2b3036"/><text x="0" y="20" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" fill="#2b3036">N</text></g>`;
}

function legend(model, stats, x0, y0) {
  const rows = [];
  let y = y0;
  const head = (t) => { rows.push(`<text x="${x0}" y="${y}" font-family="${FONT}" font-size="13" font-weight="800" fill="${COLORS.text}">${esc(t)}</text>`); y += 20; };
  const swatch = (fill, text, extra = "") => { rows.push(`<rect x="${x0}" y="${y - 11}" width="18" height="14" rx="2" fill="${fill}" stroke="#555" stroke-width=".6"/>${extra}<text x="${x0 + 28}" y="${y}" font-family="${FONT}" font-size="11.5" fill="${COLORS.text}">${esc(text)}</text>`); y += 19; };
  const icon = (svg, text) => { rows.push(`<g transform="translate(${x0 + 9 - PAD} ${y - 4 - PAD - 40})">${svg}</g><text x="${x0 + 28}" y="${y}" font-family="${FONT}" font-size="11.5" fill="${COLORS.text}">${esc(text)}</text>`); y += 21; };
  head("GROUND");
  const present = new Set(model.kinds.flat());
  if (present.has("building")) swatch(COLORS.building, "Building / solid wall");
  if (present.has("interior")) swatch(COLORS.interior, "Indoors (roofed, walkable)");
  if (present.has("corridor")) swatch(COLORS.corridor, "Service corridor (roofed)");
  if (present.has("street")) swatch(COLORS.street, model.size > 30 ? "Street / alley (outdoors)" : "Outdoor gate path");
  if (present.has("plaza")) swatch(COLORS.plaza, "Square / forecourt / yard");
  if (present.has("park")) swatch(COLORS.park, "Park / garden");
  if (present.has("water")) swatch(COLORS.water, "Canal (no walking, can see across)");
  if (present.has("bridge")) swatch(COLORS.bridge, "Bridge");
  if (present.has("tree")) swatch(COLORS.tree, "Tree / stall / truck (solid cover)");
  if (present.has("prop")) swatch(COLORS.prop, "Racks, vehicle, furniture (solid)");
  if (model.chamfers.length) swatch("#7fae6a", "Angled facade (looks, not collision)");
  y += 8;
  head("GAMEPLAY");
  icon(marker.spawn(0, 0, "1"), "Start positions (8 players)");
  icon(`<circle cx="${PAD}" cy="${PAD + 40}" r="8.5" fill="${COLORS.load}" stroke="#fff" stroke-width="1.6"/>`, "Medevac loading pad (bring supplies here)");
  icon(marker.supply(0, 0, 1), "Supply cabinet (stocked at start)");
  icon(marker.supply(0, 0, 0), "Spare cabinet (filled in variety rounds)");
  icon(marker.task(0, 0), "Task station (16)");
  icon(marker.site(0, 0), "Sabotage socket for charges (15)");
  icon(marker.vent(0, 0), `${model.size > 30 ? "Storm drain" : "Maintenance duct"} (infiltrators only)`);
  icon(marker.emergency(0, 0), model.size > 30 ? "Town siren: call a meeting" : "Operations console: call a meeting");
  if (model.lamps.length) icon(`<circle cx="${PAD}" cy="${PAD + 40}" r="7" fill="${COLORS.lamp}" opacity=".4"/><circle cx="${PAD}" cy="${PAD + 40}" r="2.6" fill="#f2b705"/>`, "Street lamp (night readability)");
  if (model.sightlines.length) icon(`<path d="M${PAD - 9} ${PAD + 40}h18" stroke="#1d4f91" stroke-width="2" stroke-dasharray="5 3"/>`, "Long sightline");
  y += 8;
  head("MEASURED (from the map data)");
  const m = (t) => Math.round(t * 3);
  const line = (t) => { rows.push(`<text x="${x0}" y="${y}" font-family="${FONT}" font-size="11.5" fill="${COLORS.text}">${esc(t)}</text>`); y += 17; };
  line(`Map: ${stats.size} × ${stats.size} tiles (${stats.size * 3} m square)`);
  line(`Walkable floor: ${stats.floor} tiles`);
  line(`All floor reachable on foot: ${stats.reachable ? "yes" : "NO"}`);
  line(`Walk pad → cabinets: avg ${m(stats.supplyWalkAvg)} m, max ${m(stats.supplyWalkMax)} m`);
  line(`Walk pad → tasks: avg ${m(stats.stationWalkAvg)} m`);
  line(`Farthest spot from the pad: ${m(stats.farthest)} m`);
  line(`Longest straight open line: ${stats.longestStraight} tiles`);
  line(`Exposure: a spot sees ~${Math.round(stats.exposure)} floor tiles`);
  line(`  within normal sight (7 tiles)`);
  return rows.join("\n");
}

function svgFor(model) {
  const stats = layoutStats(model.map, { seeThrough: model.seeThrough });
  const mapW = model.size * T, width = PAD * 2 + mapW + LEGEND_W, height = Math.max(PAD * 2 + 40 + mapW + 50, 760);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#1d4f91"/></marker></defs>
<rect width="${width}" height="${height}" fill="#f7f5f0"/>
<text x="${PAD}" y="34" font-family="${FONT}" font-size="20" font-weight="800" fill="${COLORS.text}">${esc(model.title)}</text>
<text x="${PAD}" y="56" font-family="${FONT}" font-size="12.5" fill="#4a515a">${esc(model.subtitle)}</text>
<g>${tiles(model)}</g>
<g>${helipad(model)}</g>
<g>${chamfers(model)}</g>
<g>${lamps(model)}</g>
<g>${sightlines(model)}</g>
<g>${labels(model)}</g>
<g>${markers(model)}</g>
<rect x="${X(0)}" y="${Y(0)}" width="${mapW}" height="${mapW}" fill="none" stroke="#2b3036" stroke-width="1.5"/>
${scaleBar(model)}
${legend(model, stats, PAD * 2 + mapW - 10, Y(0) + 6)}
</svg>`;
  return { svg, width, height, stats };
}

async function main() {
  const city = svgFor(cityModel());
  const current = svgFor(breakwaterModel());
  writeFileSync(path.join(ROOT, "docs/mini-city-plan.svg"), city.svg);
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  try {
    for (const [out, item] of [["docs/mini-city-plan.png", city], ["docs/current-map.png", current]]) {
      const page = await browser.newPage({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1.5 });
      await page.setContent(`<!doctype html><html><body style="margin:0">${item.svg}</body></html>`);
      await page.screenshot({ path: path.join(ROOT, out), clip: { x: 0, y: 0, width: item.width, height: item.height } });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const fmt = (s) => ({ ...s, supplyWalkAvg: +s.supplyWalkAvg.toFixed(1), stationWalkAvg: +s.stationWalkAvg.toFixed(1), exposure: +s.exposure.toFixed(1) });
  console.log(JSON.stringify({ city: fmt(city.stats), breakwater: fmt(current.stats) }, null, 1));
}

main().catch((error) => { console.error(error); process.exit(1); });
