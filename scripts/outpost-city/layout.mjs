/**
 * Proposed "mini city" base for Blackout Protocol (design draft, not wired
 * into the game). Working name: Calder Quay.
 *
 * Same conventions as public/games/outpost-protocol-map.js:
 *  - one tile = 3 m, x grows east, y grows south, points use tile units;
 *  - collision stays a square tile grid (0 = walkable, 1..6 = solid);
 *  - every point of interest sits on a walkable tile.
 *
 * The grid is authored as characters so the plan can be read at a glance.
 * `collisionLevel()` turns it into the numbers the engine already uses; the
 * one new tile type is 7 = water (blocks walking, NOT sight) which needs a
 * small engine change before the canal can ship (see docs/mini-city-plan.md).
 */
export const SIZE = 34;

// Character legend. `tile` is the engine tile type it would compile to.
export const LEGEND = {
  "#": { name: "Building / solid block", tile: 1, kind: "building" },
  ".": { name: "Street / alley", tile: 0, kind: "street" },
  ":": { name: "Plaza / forecourt paving", tile: 0, kind: "plaza" },
  '"': { name: "Park / garden", tile: 0, kind: "park" },
  "=": { name: "Bridge", tile: 0, kind: "bridge" },
  "H": { name: "Helipad / landing zone", tile: 0, kind: "helipad" },
  "~": { name: "Canal water (new tile 7: blocks walking, not sight)", tile: 7, kind: "water" },
  "T": { name: "Tree / planter (solid, blocks sight)", tile: 4, kind: "tree" },
  "S": { name: "Market stall / kiosk (solid)", tile: 2, kind: "stall" },
  "F": { name: "Clock memorial (solid)", tile: 2, kind: "stall" },
  "V": { name: "Parked truck / container (solid)", tile: 3, kind: "vehicle" },
  "P": { name: "Fuel pump island (solid)", tile: 5, kind: "metal" },
  "M": { name: "Radio mast footing (solid)", tile: 5, kind: "metal" },
};

// Lowercase letters are roofed building interiors (walkable).
export const BUILDINGS = {
  r: { id: "radio", name: "Radio Station", landmark: "Radio tower (tallest thing in town)" },
  p: { id: "police", name: "Police Post", landmark: "Blue lamp, siren on the roof" },
  m: { id: "market-hall", name: "Market Hall", landmark: "Glass roof, clock over the door" },
  f: { id: "fuel", name: "Fuel Station Shop", landmark: "Canopy with a big lit price sign" },
  s: { id: "substation", name: "Power Substation", landmark: "Humming transformer yard" },
  a: { id: "apartments", name: "Harbour Apartments", landmark: "Five-storey block, washing lines" },
  c: { id: "clinic", name: "Town Clinic", landmark: "Red cross, ambulance bay" },
  d: { id: "depot", name: "Relief Depot / Warehouse", landmark: "Big sliding doors, crane" },
  g: { id: "garage", name: "Garage Workshop", landmark: "Roll-up door, tyre stack" },
  k: { id: "cold-store", name: "Ice & Cold Store", landmark: "Frosted windows, fan units" },
};

const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill("#"));
const fill = (x, y, w, h, ch) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = ch;
};
const put = (cells, ch) => { for (const [x, y] of cells) grid[y][x] = ch; };
// A building: wall ring + interior + door cells.
const building = (x, y, w, h, ch, doors) => {
  fill(x, y, w, h, "#");
  fill(x + 1, y + 1, w - 2, h - 2, ch);
  put(doors, ch);
};

// ---- Streets and open spaces (outdoor) ----------------------------------
fill(1, 1, 15, 1, ".");   // Ridge Lane (north edge, narrow)
fill(8, 1, 1, 17, ".");   // Mill Lane: tight north-south alley
fill(16, 1, 2, 19, ".");  // Harbour Avenue: the long north-south avenue
fill(1, 8, 15, 2, ".");   // Tower Road (2 wide) …
fill(18, 6, 14, 2, ".");  // … Dock Road is offset one row: the two never line up
fill(32, 1, 1, 18, ".");  // Seawall Walk (east edge)
fill(18, 1, 8, 5, ":");   // Fuel-station forecourt
fill(1, 10, 7, 8, '"');   // Lantern Park
fill(16, 9, 8, 8, ":");   // Market Square
fill(9, 15, 7, 1, ".");   // Fish Alley (1 wide) into the square
fill(12, 16, 1, 2, ".");  // dog-leg down to the quay
fill(24, 15, 8, 1, ".");  // Canal Row
fill(28, 16, 1, 2, ".");

// ---- Canal, quays and bridges -------------------------------------------
fill(1, 18, 32, 1, ".");  // North quay
fill(12, 19, 11, 1, "."); // wider quay where the canal bends south
fill(1, 19, 11, 2, "~");  // canal, west reach
fill(12, 20, 11, 2, "~"); // canal, middle reach (bent one row south)
fill(23, 19, 10, 2, "~"); // canal, east reach
fill(1, 21, 11, 1, ".");  // South quay (west)
fill(23, 21, 10, 1, "."); // South quay (east)
fill(1, 22, 32, 1, ".");  // South quay (full width)
fill(4, 19, 2, 2, "=");   // Mill footbridge
fill(16, 20, 2, 2, "=");  // Avenue Bridge (the main crossing)
fill(28, 19, 2, 2, "=");  // Dock bridge

// ---- South side ---------------------------------------------------------
fill(9, 23, 1, 10, ".");  // Laundry Alley
fill(9, 28, 14, 2, ".");  // Hospital Road
fill(22, 23, 11, 10, ":"); // Depot yard / landing zone apron
fill(26, 28, 4, 4, "H");  // Helipad
fill(2, 28, 6, 4, '"');   // Apartment back courtyard (enclosed garden)

// ---- Buildings (interiors are walkable and roofed) -----------------------
building(1, 2, 7, 6, "r", [[4, 7], [7, 4]]);            // Radio Station
put([[5, 4], [5, 3]], "M");                             // mast footing inside
building(9, 2, 7, 6, "p", [[12, 7], [15, 4], [9, 5]]);  // Police Post
building(26, 1, 6, 5, "f", [[26, 3], [28, 5]]);         // Fuel shop
building(9, 10, 7, 5, "m", [[12, 10], [15, 12], [11, 14], [13, 14]]); // Market Hall
building(24, 8, 7, 7, "s", [[24, 11], [27, 14], [27, 8]]); // Substation
building(1, 23, 8, 5, "a", [[4, 23], [8, 25], [3, 27], [6, 27]]); // Apartments lobby
building(10, 23, 11, 5, "c", [[15, 23], [10, 25], [14, 27], [18, 27], [20, 25]]); // Clinic
building(23, 23, 6, 5, "d", [[25, 23], [28, 25], [25, 27], [23, 25]]); // Depot
building(10, 30, 6, 3, "g", [[12, 30], [15, 31]]);       // Garage (back wall = town edge)
building(16, 30, 7, 3, "k", [[19, 30], [16, 31]]);       // Cold store
fill(1, 28, 1, 4, "#"); fill(8, 28, 1, 4, "#");          // courtyard walls
fill(2, 32, 6, 1, "#");
put([[8, 30]], '"');                                    // courtyard gate to Laundry Alley
put([[21, 25]], ":");                                   // clinic ambulance bay through to the depot yard

// ---- Solid dressing that also shapes sightlines -------------------------
put([[16, 12], [17, 12]], "F");                        // clock memorial: splits the avenue view
put([[19, 10], [22, 10], [19, 14], [22, 14], [20, 16]], "S"); // market stalls
put([[2, 11], [5, 12], [3, 15], [6, 16], [1, 17]], "T");    // park trees
put([[20, 3], [23, 3]], "P");                          // fuel pumps
put([[31, 24], [31, 25], [23, 31], [24, 31], [31, 31]], "V"); // containers / trucks
put([[13, 1], [11, 9], [30, 7]], "#");                  // pinch points: blind nook, narrowed road
put([[19, 7]], "T");                                   // street tree at the Dock Road jog
put([[3, 21], [7, 21]], "T");                          // quay planters (west)
put([[13, 19], [21, 19]], "T");                        // quay planters (middle bend)

export const GRID = grid.map((row) => row.join(""));

/** Numeric collision level, same shape as PROTOCOL_MAP.level. */
export function collisionLevel() {
  return grid.map((row) => row.map((ch) => (BUILDINGS[ch] ? 0 : LEGEND[ch].tile)));
}

// ---- Named areas (rectangles, like PROTOCOL_MAP.rooms) -------------------
// Irregular buildings and streets are several rectangles sharing one name.
export const AREAS = [
  { id: "radio", name: "Radio Station", x: 2, y: 3, w: 5, h: 4, roofed: true },
  { id: "police", name: "Police Post", x: 10, y: 3, w: 5, h: 4, roofed: true },
  { id: "fuel", name: "Fuel Station Shop", x: 27, y: 2, w: 4, h: 3, roofed: true },
  { id: "market-hall", name: "Market Hall", x: 10, y: 11, w: 5, h: 3, roofed: true },
  { id: "substation", name: "Power Substation", x: 25, y: 9, w: 5, h: 5, roofed: true },
  { id: "apartments", name: "Harbour Apartments", x: 2, y: 24, w: 6, h: 3, roofed: true },
  { id: "clinic", name: "Town Clinic", x: 11, y: 24, w: 9, h: 3, roofed: true },
  { id: "depot", name: "Relief Depot", x: 24, y: 24, w: 4, h: 3, roofed: true },
  { id: "garage", name: "Garage Workshop", x: 11, y: 31, w: 4, h: 1, roofed: true },
  { id: "cold-store", name: "Ice & Cold Store", x: 17, y: 31, w: 5, h: 1, roofed: true },
  { id: "forecourt", name: "Fuel Forecourt", x: 18, y: 1, w: 8, h: 5, roofed: false },
  { id: "square", name: "Market Square", x: 16, y: 9, w: 8, h: 8, roofed: false },
  { id: "park", name: "Lantern Park", x: 1, y: 10, w: 7, h: 8, roofed: false },
  { id: "courtyard", name: "Apartment Courtyard", x: 2, y: 28, w: 6, h: 4, roofed: false },
  { id: "lz", name: "Depot Yard / Landing Zone", x: 22, y: 28, w: 11, h: 5, roofed: false },
  { id: "avenue", name: "Harbour Avenue", x: 16, y: 1, w: 2, h: 8, roofed: false },
  { id: "quay", name: "Canal Quays", x: 1, y: 18, w: 32, h: 5, roofed: false },
];

// ---- Mission sockets (same ids/kinds as Breakwater where one exists) -------
// Each Breakwater station keeps its id and kind, so the rules, bots and tests
// treat it the same; only the place and wording change.
export const STATIONS = [
  { id: "intel-upload", from: "Command", name: "Prepare the medical handover", kind: "intel", x: 12.5, y: 24.5, room: "clinic" },
  { id: "sensor-reset", from: "Command", name: "Check the street cameras", kind: "sensors", x: 13.5, y: 3.5, room: "police" },
  { id: "armory-restock", from: "Armory", name: "Inspect the riot-kit lockers", kind: "armory", x: 10.5, y: 3.5, room: "police" },
  { id: "ammo-audit", from: "Armory", name: "Audit market food stores", kind: "ammo", x: 14.5, y: 11.5, room: "market-hall" },
  { id: "radio-link", from: "Comms", name: "Restore the radio uplink", kind: "comms", x: 2.5, y: 3.5, room: "radio" },
  { id: "radar-calibration", from: "Comms", name: "Align the mast antenna", kind: "radar", x: 6.5, y: 5.5, room: "radio" },
  { id: "barracks-supplies", from: "Barracks", name: "Check the stairwell first-aid point", kind: "supplies", x: 2.5, y: 24.5, room: "apartments" },
  { id: "mess-restock", from: "Barracks", name: "Check cold-chain IV fluids", kind: "supplies", x: 20.5, y: 31.5, room: "cold-store" },
  { id: "vehicle-fuel", from: "Hangar", name: "Fill the medevac fuel bowser", kind: "fuel", x: 21.5, y: 4.5, room: "forecourt" },
  { id: "drone-check", from: "Hangar", name: "Confirm the evacuation route", kind: "drone", x: 31.5, y: 29.5, room: "lz" },
  { id: "generator-reset", from: "Generators", name: "Stabilize the substation controls", kind: "power", x: 25.5, y: 9.5, room: "substation" },
  { id: "coolant-test", from: "Generators", name: "Check cold-storage power", kind: "generator", x: 17.5, y: 31.5, room: "cold-store" },
  { id: "tunnel-clear", from: "Maintenance", name: "Clear rubble from Fish Alley", kind: "route", x: 10.5, y: 15.5, room: "Fish Alley" },
  { id: "pump-service", from: "Maintenance", name: "Run the canal pump", kind: "maintenance", x: 2.5, y: 18.5, room: "quay" },
  { id: "depot-seal", from: "Depot", name: "Seal surgical cargo", kind: "supply", x: 26.5, y: 24.5, room: "depot" },
  { id: "gate-sensors", from: "Perimeter", name: "Reset the seawall sensors", kind: "perimeter", x: 32.5, y: 12.5, room: "Seawall Walk" },
];

// 12 cabinets like Breakwater (8 stocked in the classic deal + 4 empty that
// variety rounds can re-deal). Stock counts match the current manifest.
export const SUPPLIES = [
  { id: "trauma-police", supplyId: "trauma", name: "Police first-aid locker", stock: 2, x: 11.5, y: 6.5, room: "police" },
  { id: "trauma-apartments", supplyId: "trauma", name: "Stairwell medic box", stock: 1, x: 6.5, y: 24.5, room: "apartments" },
  { id: "surgical-clinic", supplyId: "surgical", name: "Clinic theatre cabinet", stock: 1, x: 18.5, y: 25.5, room: "clinic" },
  { id: "surgical-depot", supplyId: "surgical", name: "Depot cargo cabinet", stock: 1, x: 24.5, y: 26.5, room: "depot" },
  { id: "fluids-cold", supplyId: "fluids", name: "Cold-store IV rack", stock: 1, x: 21.5, y: 31.5, room: "cold-store" },
  { id: "fluids-clinic", supplyId: "fluids", name: "Clinic fluid fridge", stock: 1, x: 11.5, y: 26.5, room: "clinic" },
  { id: "nutrition-market", supplyId: "nutrition", name: "Market dry stores", stock: 1, x: 10.5, y: 11.5, room: "market-hall" },
  { id: "nutrition-fuel", supplyId: "nutrition", name: "Fuel-shop shelves", stock: 1, x: 29.5, y: 2.5, room: "fuel" },
  { id: "cabinet-radio", supplyId: "trauma", name: "Radio-room cabinet", stock: 0, x: 3.5, y: 6.5, room: "radio" },
  { id: "cabinet-substation", supplyId: "fluids", name: "Substation crew cabinet", stock: 0, x: 29.5, y: 12.5, room: "substation" },
  { id: "cabinet-garage", supplyId: "nutrition", name: "Garage cabinet", stock: 0, x: 11.5, y: 31.5, room: "garage" },
  { id: "cabinet-park", supplyId: "surgical", name: "Park kiosk cabinet", stock: 0, x: 4.5, y: 10.5, room: "park" },
];

export const LOADING = { id: "medevac-loading", name: "Medevac loading pad", x: 25.5, y: 29.5, room: "lz" };
export const EMERGENCY = { id: "operations-console", name: "Town siren post", x: 21.5, y: 12.5, room: "square" };

// Sabotage sockets (15, never on a station tile).
export const SITES = [
  { id: "radio-cable-tray", name: "Mast cable tray", x: 6.5, y: 3.5, room: "radio" },
  { id: "radio-rack", name: "Transmitter rack", x: 2.5, y: 6.5, room: "radio" },
  { id: "police-evidence", name: "Evidence-room recess", x: 14.5, y: 6.5, room: "police" },
  { id: "fuel-tank-hatch", name: "Underground tank hatch", x: 24.5, y: 1.5, room: "forecourt" },
  { id: "fuel-back-office", name: "Shop back office", x: 30.5, y: 4.5, room: "fuel" },
  { id: "market-cellar", name: "Market cellar hatch", x: 10.5, y: 13.5, room: "market-hall" },
  { id: "substation-transformer", name: "Transformer housing", x: 29.5, y: 9.5, room: "substation" },
  { id: "substation-switchgear", name: "Switchgear cabinet", x: 25.5, y: 13.5, room: "substation" },
  { id: "park-bandstand", name: "Bandstand service panel", x: 6.5, y: 13.5, room: "park" },
  { id: "apartments-boiler", name: "Boiler-room door", x: 7.5, y: 26.5, room: "apartments" },
  { id: "courtyard-meter", name: "Courtyard meter box", x: 2.5, y: 31.5, room: "courtyard" },
  { id: "clinic-oxygen", name: "Oxygen manifold", x: 19.5, y: 24.5, room: "clinic" },
  { id: "garage-pit", name: "Inspection pit cover", x: 14.5, y: 31.5, room: "garage" },
  { id: "depot-crane", name: "Crane control box", x: 27.5, y: 24.5, room: "depot" },
  { id: "bridge-junction", name: "Bridge junction box", x: 18.5, y: 19.5, room: "quay" },
];

// Infiltrator-only storm drains (Breakwater's maintenance ducts).
export const VENTS = [
  { id: "radio-drain", name: "Tower Road drain", x: 3.5, y: 9.5, links: ["fuel-drain", "market-drain"] },
  { id: "fuel-drain", name: "Dock Road drain", x: 26.5, y: 7.5, links: ["radio-drain", "depot-drain", "square-drain"] },
  { id: "depot-drain", name: "Depot yard drain", x: 30.5, y: 27.5, links: ["fuel-drain", "apartments-drain"] },
  { id: "apartments-drain", name: "Laundry Alley drain", x: 9.5, y: 31.5, links: ["depot-drain", "market-drain"] },
  { id: "market-drain", name: "Fish Alley drain", x: 14.5, y: 15.5, links: ["apartments-drain", "radio-drain", "square-drain"] },
  { id: "square-drain", name: "Market Square drain", x: 22.5, y: 16.5, links: ["market-drain", "fuel-drain"] },
];

export const SPAWNS = [
  [4.5, 8.5], [12.5, 8.5], [21.5, 2.5], [4.5, 14.5],
  [19.5, 11.5], [27.5, 22.5], [6.5, 29.5], [15.5, 28.5],
];

// Mid-match events (outpost-events.js EVENT_SPOTS) moved into the city.
export const EVENT_SPOTS = {
  fire: [
    { x: 12.5, y: 12.5, room: "Market Hall" },
    { x: 27.5, y: 3.5, room: "Fuel Station Shop" },
    { x: 4.5, y: 25.5, room: "Harbour Apartments" },
    { x: 13.5, y: 31.5, room: "Garage Workshop" },
  ],
  casualty: [{ x: 16.5, y: 21.5, room: "Avenue Bridge" }],
  drop: [{ x: 20.5, y: 12.5, room: "Market Square" }],
};

// Visual-only dressing over tile collision (no gameplay effect).
export const DRESSING = {
  // Diagonal / curved facades drawn over a staircase of solid tiles. The
  // visible facade stays on or outside the collision edge, never inside an
  // open tile, so nobody walks into an invisible corner.
  chamfers: [
    { at: [15, 10], corner: "ne", note: "Market Hall corner entrance" },
    { at: [24, 8], corner: "nw", note: "Substation angled gate" },
    { at: [10, 23], corner: "nw", note: "Clinic rounded corner" },
    { at: [20, 23], corner: "ne", note: "Clinic ambulance bay" },
    { at: [1, 7], corner: "sw", note: "Radio Station" },
    { at: [31, 5], corner: "se", note: "Fuel shop" },
  ],
  streetLamps: [[8.5, 4.5], [8.5, 12.5], [16.2, 4.5], [17.8, 16.5], [23.5, 9.2], [12.5, 18.5], [22.5, 18.5], [5, 22.6], [27, 22.6], [9.5, 25.5], [15.5, 29.5], [23.5, 29.5], [32.5, 6.5], [4.5, 9]],
};

export const LANDMARKS = [
  { label: "RADIO TOWER", x: 5.5, y: 3.5, glyph: "tower" },
  { label: "POLICE", x: 12.5, y: 4.8, glyph: "badge" },
  { label: "FUEL", x: 28.5, y: 3.2, glyph: "fuel" },
  { label: "MARKET HALL", x: 12.5, y: 12.2, glyph: "hall" },
  { label: "SUBSTATION", x: 27.5, y: 11.2, glyph: "bolt" },
  { label: "APARTMENTS", x: 4.8, y: 25.2, glyph: "flats" },
  { label: "CLINIC", x: 15.5, y: 25.2, glyph: "cross" },
  { label: "DEPOT", x: 26, y: 25.2, glyph: "crate" },
  { label: "GARAGE", x: 13, y: 32.55, glyph: null },
  { label: "COLD STORE", x: 19.5, y: 32.55, glyph: null },
];

export const STREET_NAMES = [
  { label: "HARBOUR AVENUE", x: 17, y: 6, vertical: true },
  { label: "MILL LANE", x: 8.5, y: 13, vertical: true },
  { label: "TOWER ROAD", x: 4.5, y: 8.9 },
  { label: "DOCK ROAD", x: 23.5, y: 6.9 },
  { label: "FISH ALLEY", x: 12.5, y: 15.6, small: true },
  { label: "SEAWALL WALK", x: 32.5, y: 9, vertical: true, small: true },
  { label: "HOSPITAL ROAD", x: 15.5, y: 29 },
  { label: "LAUNDRY ALLEY", x: 9.5, y: 28, vertical: true, small: true },
  { label: "MARKET SQUARE", x: 20, y: 15.4 },
  { label: "LANTERN PARK", x: 4, y: 16.6 },
  { label: "CANAL", x: 9, y: 20 },
  { label: "AVENUE BRIDGE", x: 17, y: 22.6, small: true },
];

export const DISTRICTS = [
  { label: "OLD TOWN", x: 6, y: 0.7 },
  { label: "HARBOUR SIDE", x: 26, y: 15.2 },
  { label: "SOUTH BANK", x: 4.5, y: 32.7 },
];

export const CITY = {
  id: "calder-quay",
  name: "Calder Quay (working name)",
  size: SIZE,
  grid: GRID,
  areas: AREAS,
  stations: STATIONS,
  supplies: SUPPLIES,
  sites: SITES,
  vents: VENTS,
  spawns: SPAWNS,
  loading: LOADING,
  emergency: EMERGENCY,
  eventSpots: EVENT_SPOTS,
};
