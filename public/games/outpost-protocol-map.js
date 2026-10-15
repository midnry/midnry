/**
 * Breakwater Forward Base: the dedicated Blackout Protocol floor plan.
 *
 * Coordinates use the existing simulation's tile units, not world metres.
 * `rooms` describe walkable interior rectangles (their enclosing wall tiles
 * lie outside the rectangle). Doors, fixtures and objective sockets are
 * deliberately separated so a visible fixture never occupies a doorway.
 * All three routes connect without using infiltrator-only maintenance ducts.
 */
const SIZE = 28;
const level = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));

function fill(x, y, w, h, tile = 0) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) level[row][col] = tile;
  }
}

const rooms = [
  { id: "command", name: "Command / Operations", x: 3, y: 3, w: 5, h: 6, roofed: true },
  { id: "armory", name: "Armory", x: 12, y: 3, w: 4, h: 6, roofed: true },
  { id: "communications", name: "Communications / Radar", x: 20, y: 3, w: 5, h: 6, roofed: true },
  { id: "barracks", name: "Barracks / Mess Hall", x: 3, y: 13, w: 5, h: 3, roofed: true },
  { id: "courtyard", name: "Covered Supply Atrium", x: 12, y: 13, w: 4, h: 3, roofed: true },
  { id: "hangar", name: "Vehicle Hangar", x: 20, y: 13, w: 5, h: 7, roofed: true },
  { id: "generators", name: "Generators / Power", x: 3, y: 19, w: 5, h: 6, roofed: true },
  { id: "maintenance", name: "Maintenance Tunnels", x: 12, y: 19, w: 4, h: 6, roofed: true },
  { id: "ammo", name: "Medical / Supply Depot", x: 20, y: 23, w: 5, h: 2, roofed: true },
  { id: "perimeter", name: "Perimeter / South Gate", x: 1, y: 26, w: 26, h: 1, roofed: false },
  { id: "west-corridor", name: "West Service Corridor", x: 9, y: 2, w: 2, h: 24, roofed: true },
  { id: "east-corridor", name: "East Service Corridor", x: 17, y: 2, w: 2, h: 24, roofed: true },
  { id: "ops-corridor", name: "Operations Passage", x: 2, y: 10, w: 7, h: 2, roofed: true },
  { id: "central-corridor", name: "Central Passage", x: 11, y: 10, w: 6, h: 2, roofed: true },
  { id: "flight-corridor", name: "Flight Passage", x: 19, y: 10, w: 7, h: 2, roofed: true },
  { id: "power-corridor", name: "Power Passage", x: 2, y: 17, w: 7, h: 1, roofed: true },
  { id: "maintenance-corridor", name: "Maintenance Passage", x: 11, y: 17, w: 6, h: 1, roofed: true },
  { id: "depot-corridor", name: "Depot Passage", x: 19, y: 21, w: 7, h: 1, roofed: true },
  { id: "north-passage", name: "North Utility Passage", x: 9, y: 1, w: 10, h: 1, roofed: true },
];
for (const room of rooms) fill(room.x, room.y, room.w, room.h);
fill(1, 21, 1, 5); // Short, outdoor west gate approach.
fill(26, 21, 1, 5); // Short, outdoor east gate approach.

// Every main room has at least two exits. The split central circulation and
// southern service loop allow an operator to avoid an isolated corridor.
const doors = [
  [8, 6], [8, 7], [5, 9], [6, 9],                         // Command.
  [11, 5], [11, 6], [16, 7], [16, 8], [13, 9], [14, 9], // Armory.
  [19, 5], [19, 6], [22, 9], [23, 9],                    // Communications.
  [4, 12], [5, 12], [8, 14], [8, 15], [6, 16], [7, 16], // Barracks / mess.
  [13, 12], [14, 12], [11, 14], [11, 15],                // Courtyard.
  [16, 13], [16, 14], [13, 16], [14, 16],
  [22, 12], [23, 12], [19, 15], [19, 16],                // Vehicle hangar.
  [19, 18], [19, 19], [22, 20], [23, 20],
  [4, 18], [5, 18], [8, 21], [8, 22],                   // Generators.
  [5, 25], [6, 25], [2, 23],
  [13, 18], [14, 18], [11, 21], [11, 22],               // Maintenance.
  [16, 23], [16, 24], [13, 25], [14, 25],
  [21, 22], [22, 22], [19, 23], [19, 24],               // Ammunition depot.
  [22, 25], [23, 25], [25, 23],
];
for (const [x, y] of doors) level[y][x] = 0;

// Solid racks, vehicle footprint and alternating corridor baffles shorten
// sightlines. They are collision tiles rather than decorative obstructions.
fill(5, 4, 2, 1, 2);  // Operations table / storage.
fill(4, 7, 1, 1, 2);
fill(13, 5, 1, 2, 3); // Armory racks.
fill(22, 5, 2, 1, 5); // Radar equipment.
fill(5, 14, 1, 1, 4); // Mess-hall utility island.
fill(22, 15, 1, 3, 2); // Utility vehicle: renderer can replace this solid shell.
fill(20, 17, 1, 1, 2);
fill(5, 20, 1, 3, 3); // Generator bank: same solid footprint as its 3D prop.
fill(13, 21, 1, 1, 1);
fill(14, 23, 1, 1, 1);
fill(22, 24, 1, 1, 3);
for (const [x, y] of [[9, 7], [10, 15], [9, 20], [18, 6], [17, 14], [18, 23]]) {
  level[y][x] = 1;
}

const stations = [
  { id: "intel-upload", name: "Prepare the medical handover", kind: "intel", x: 4.5, y: 3.5, room: "command" },
  { id: "sensor-reset", name: "Verify perimeter sensors", kind: "sensors", x: 7.5, y: 8.5, room: "command" },
  { id: "armory-restock", name: "Inspect trauma-kit storage", kind: "armory", x: 12.5, y: 3.5, room: "armory" },
  { id: "ammo-audit", name: "Audit recovery-ration stores", kind: "ammo", x: 15.5, y: 8.5, room: "armory" },
  { id: "radio-link", name: "Restore the radio uplink", kind: "comms", x: 22.5, y: 3.5, room: "communications" },
  { id: "radar-calibration", name: "Calibrate coastal radar", kind: "radar", x: 24.5, y: 6.5, room: "communications" },
  { id: "barracks-supplies", name: "Check the medic lockers", kind: "supplies", x: 3.5, y: 13.5, room: "barracks" },
  { id: "mess-restock", name: "Check cold-chain IV fluids", kind: "supplies", x: 5.5, y: 15.5, room: "barracks" },
  { id: "vehicle-fuel", name: "Fuel the medevac transport", kind: "fuel", x: 20.5, y: 14.5, room: "hangar" },
  { id: "drone-check", name: "Confirm the evacuation route", kind: "drone", x: 24.5, y: 18.5, room: "hangar" },
  { id: "generator-reset", name: "Stabilize the generator controls", kind: "power", x: 3.5, y: 20.5, room: "generators" },
  { id: "coolant-test", name: "Check cold-storage power", kind: "generator", x: 7.5, y: 23.5, room: "generators" },
  { id: "tunnel-clear", name: "Clear a maintenance obstruction", kind: "route", x: 12.5, y: 19.5, room: "maintenance" },
  { id: "pump-service", name: "Verify sterile-fluid stores", kind: "maintenance", x: 15.5, y: 23.5, room: "maintenance" },
  { id: "depot-seal", name: "Seal surgical cargo", kind: "supply", x: 20.5, y: 23.5, room: "ammo" },
  { id: "gate-sensors", name: "Reset the south-gate sensors", kind: "perimeter", x: 24.5, y: 26.5, room: "perimeter" },
];

// These are fictional maintenance sockets. All are findable on foot and sit
// behind room walls/racks, so planting takes a genuine exposure risk. Sites
// are separate from task terminals: no terminal shares a socket's location.
const sites = [
  { id: "command-map-cache", name: "Map-room cable recess", x: 7.5, y: 3.5, room: "command" },
  { id: "command-conduit", name: "Operations conduit", x: 3.5, y: 8.5, room: "command" },
  { id: "armory-rear-rack", name: "Rear equipment recess", x: 15.5, y: 3.5, room: "armory" },
  { id: "armory-locker", name: "Locker service panel", x: 12.5, y: 8.5, room: "armory" },
  { id: "comms-uplink-tray", name: "Uplink cable tray", x: 20.5, y: 3.5, room: "communications" },
  { id: "comms-cablewell", name: "Radar cable well", x: 24.5, y: 8.5, room: "communications" },
  { id: "barracks-bed-locker", name: "Barracks service locker", x: 3.5, y: 15.5, room: "barracks" },
  { id: "mess-service-hatch", name: "Mess-hall service hatch", x: 7.5, y: 13.5, room: "barracks" },
  { id: "hangar-tool-recess", name: "Hangar tool recess", x: 20.5, y: 19.5, room: "hangar" },
  { id: "hangar-engine-crate", name: "Vehicle-bay utility cover", x: 24.5, y: 13.5, room: "hangar" },
  { id: "generator-coolant-duct", name: "Coolant duct cover", x: 7.5, y: 19.5, room: "generators" },
  { id: "generator-switch-alcove", name: "Switch-bank alcove", x: 3.5, y: 24.5, room: "generators" },
  { id: "maintenance-drain", name: "Lower tunnel drain", x: 12.5, y: 24.5, room: "maintenance" },
  { id: "maintenance-filter", name: "Ventilation filter cover", x: 15.5, y: 19.5, room: "maintenance" },
  { id: "ammo-storage-recess", name: "Depot storage recess", x: 24.5, y: 24.5, room: "ammo" },
];

const vents = [
  { id: "command-duct", name: "Command access duct", x: 3.5, y: 6.5, links: ["comms-duct", "maintenance-duct"] },
  { id: "comms-duct", name: "Radar access duct", x: 24.5, y: 4.5, links: ["command-duct", "hangar-duct", "armory-duct"] },
  { id: "hangar-duct", name: "Hangar access duct", x: 22.5, y: 19.5, links: ["comms-duct", "generator-duct"] },
  { id: "generator-duct", name: "Generator access duct", x: 4.5, y: 24.5, links: ["hangar-duct", "maintenance-duct"] },
  { id: "maintenance-duct", name: "Maintenance access duct", x: 15.5, y: 21.5, links: ["generator-duct", "command-duct", "armory-duct"] },
  { id: "armory-duct", name: "Armory access duct", x: 15.5, y: 6.5, links: ["maintenance-duct", "comms-duct"] },
];

/** Public manifest categories. Stock exists once per fixture, not per player. */
export const MEDICAL_SUPPLIES = [
  { id: "trauma", name: "Trauma kits", required: 4 },
  { id: "surgical", name: "Surgical packs", required: 2 },
  { id: "fluids", name: "IV fluids", required: 3 },
  { id: "nutrition", name: "Recovery supplements", required: 4 },
];

// Reuse existing, wall-mounted storage locations. Their original terminal IDs
// and positions stay intact; medical stock is independently identified so
// picking up one item cannot silently complete a different station task.
// The fixed layout below is the classic round (practice and tests). Matches
// with variety re-deal every cabinet each round, including the four extra
// cabinets that start empty here (see outpost-variety.js).
const medicalStock = [
  { id: "trauma-armory", supplyId: "trauma", name: "Armory locker", stock: 2, x: 12.5, y: 3.5, room: "armory" },
  { id: "trauma-barracks", supplyId: "trauma", name: "Barracks medic locker", stock: 2, x: 3.5, y: 13.5, room: "barracks" },
  { id: "surgical-command", supplyId: "surgical", name: "Operations cabinet", stock: 1, x: 4.5, y: 3.5, room: "command" },
  { id: "surgical-depot", supplyId: "surgical", name: "Depot cargo cabinet", stock: 1, x: 20.5, y: 23.5, room: "ammo" },
  { id: "fluids-mess", supplyId: "fluids", name: "Mess-hall cold cabinet", stock: 1, x: 5.5, y: 15.5, room: "barracks" },
  { id: "fluids-maintenance", supplyId: "fluids", name: "Maintenance reserve", stock: 2, x: 15.5, y: 23.5, room: "maintenance" },
  { id: "nutrition-armory", supplyId: "nutrition", name: "Armory stores", stock: 2, x: 15.5, y: 8.5, room: "armory" },
  { id: "nutrition-generator", supplyId: "nutrition", name: "Generator-room cache", stock: 2, x: 7.5, y: 23.5, room: "generators" },
  { id: "cabinet-comms", supplyId: "trauma", name: "Radio-room cabinet", stock: 0, x: 22.5, y: 3.5, room: "communications" },
  { id: "cabinet-sensors", supplyId: "fluids", name: "Sensor-bay cabinet", stock: 0, x: 7.5, y: 8.5, room: "command" },
  { id: "cabinet-tunnel", supplyId: "nutrition", name: "Tunnel cabinet", stock: 0, x: 12.5, y: 19.5, room: "maintenance" },
  { id: "cabinet-hangar", supplyId: "surgical", name: "Hangar fuel-bay cabinet", stock: 0, x: 20.5, y: 14.5, room: "hangar" },
];

export const PROTOCOL_MAP = {
  id: "breakwater",
  name: "Breakwater Forward Base",
  protocolOnly: true,
  tag: "BLACKOUT PROTOCOL / FORWARD BASE",
  description: "An enclosed coastal forward base. Command, barracks, radar and utility rooms link through narrow service corridors around a small supply courtyard.",
  level,
  theme: {
    sky: "#a7b7ba",
    floor: "#5b615e",
    sun: "#ffe5b7",
    walls: {
      1: ["#93958c", "#62685f", "#c4c6b9"],
      2: ["#5d6c66", "#384b44", "#87988a"],
      3: ["#82765a", "#554d38", "#b5a87f"],
      4: ["#85756a", "#594f49", "#b6a393"],
      5: ["#637782", "#3e515f", "#99adb4"],
      6: ["#bec4bc", "#87948b", "#e1e6dc"],
    },
  },
  rooms,
  spawns: [
    [3.5, 5.5], [14.5, 7.5], [21.5, 7.5], [4.5, 14.5],
    [23.5, 16.5], [6.5, 23.5], [13.5, 23.5], [14.5, 14.5],
  ],
  stations,
  sites,
  vents,
  emergency: { id: "operations-console", x: 6.5, y: 6.5 },
  supplies: medicalStock,
  loading: { id: "medevac-loading", name: "Medevac loading pad", x: 21.5, y: 18.5, room: "hangar" },
  // No breakable power boxes or automatic match pickups in this mode.
  crates: [],
  props: [
    { kind: "vehicle", x: 22.5, y: 16.5, w: 1, h: 3, solid: true, label: "UTILITY TRANSPORT" },
    { kind: "generator", x: 5.5, y: 21.5, w: 1, h: 3, solid: true, label: "GENERATOR BANK" },
  ],
  zones: rooms.map((room) => ({
    x: room.x, y: room.y, w: room.w, h: room.h,
    color: room.roofed === false ? "#777864" : "#65716c",
  })),
};

/**
 * The same round continues aboard a tactical medical transport. The compact
 * interior is a single collision deck: cockpit, passenger cabin, a side
 * avionics bay and an aft medical-cargo bay all connect on foot. Exterior
 * windows remain collision walls; the renderer substitutes transparent frames
 * for these wall cells, so looking outside never permits leaving the aircraft.
 */
const TRANSPORT_SIZE = 18;
const transportLevel = Array.from({ length: TRANSPORT_SIZE }, () => Array(TRANSPORT_SIZE).fill(1));
const transportRooms = [
  { id: "cockpit", name: "Flight Deck", x: 7, y: 2, w: 4, h: 2, roofed: true },
  { id: "cabin", name: "Operator Cabin", x: 7, y: 5, w: 4, h: 6, roofed: true },
  { id: "cargo", name: "Medical Cargo Bay", x: 7, y: 12, w: 4, h: 4, roofed: true },
  { id: "avionics", name: "Avionics / Power", x: 4, y: 6, w: 2, h: 4, roofed: true },
];
for (const room of transportRooms) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) transportLevel[y][x] = 0;
  }
}
const transportDoors = [[8, 4], [9, 4], [8, 11], [9, 11], [6, 7], [6, 8]];
for (const [x, y] of transportDoors) transportLevel[y][x] = 0;
// Seat and cargo geometry is reserved in collision data. The broad centre
// aisle and both bulkhead doors remain clear even with eight passengers.
transportLevel[9][7] = 4;
transportLevel[8][10] = 4;
transportLevel[14][7] = transportLevel[15][7] = 3;

const helm = { id: "medevac-helm", name: "Flight controls", kind: "helm", x: 8.5, y: 2.5, room: "cockpit", a: -Math.PI / 2 };
const avionics = { id: "medevac-avionics", name: "Autopilot avionics", kind: "avionics", x: 4.5, y: 6.5, room: "avionics" };
const cargo = { id: "medevac-cargo", name: "Medical cargo / aid delivery", kind: "cargo", x: 10.5, y: 15.5, room: "cargo" };

// Routine flight work is separate from aircraft sabotage/recovery. Each point
// is reachable from the cabin; no fixture occupies a door or collision prop.
export const AIRCRAFT_TASKS = Object.freeze([
  {
    id: "oxygen",
    name: "Test the medical oxygen supply",
    kind: "flight-task",
    x: 10.5,
    y: 9.5,
    room: "cabin",
    duration: 5,
    system: "power",
  },
  {
    id: "trauma",
    name: "Secure the trauma packs",
    kind: "flight-task",
    x: 9.5,
    y: 13.5,
    room: "cargo",
    duration: 6,
    system: null,
  },
  {
    id: "landing",
    name: "Confirm the landing coordinates",
    kind: "flight-task",
    x: 10.5,
    y: 5.5,
    room: "cabin",
    duration: 5,
    system: "comms",
  },
]);

export const TRANSPORT_MAP = {
  id: "medevac",
  name: "Lifeline Medevac",
  tag: "LIFELINE RUN / AIRBORNE TRANSPORT",
  description: "Escort the medical shipment through a connected aircraft cabin. Recover the flight controls from the cockpit and protect the cargo until aid reaches the wounded soldiers.",
  protocolOnly: true,
  missionOnly: true,
  level: transportLevel,
  theme: {
    ...PROTOCOL_MAP.theme,
    sky: "#9cb5c5",
    floor: "#657079",
    walls: {
      ...PROTOCOL_MAP.theme.walls,
      1: ["#b0b9b7", "#707f82", "#dce4df"],
      3: ["#8b947f", "#5a6751", "#b9c3a7"],
      4: ["#657682", "#3d515f", "#9baeb9"],
    },
  },
  rooms: transportRooms,
  corridors: [
    { id: "flight-bulkhead", name: "Flight-deck Access", x: 8, y: 4, w: 2, h: 1, roofed: true },
    { id: "cargo-bulkhead", name: "Cargo Access", x: 8, y: 11, w: 2, h: 1, roofed: true },
    { id: "avionics-access", name: "Avionics Access", x: 6, y: 7, w: 1, h: 2, roofed: true },
  ],
  helm,
  avionics,
  cargo,
  emergency: { id: "medevac-radio-assembly", name: "Cabin radio assembly", x: 7.5, y: 10.5, room: "cabin" },
  stations: [
    helm, avionics, cargo,
    ...AIRCRAFT_TASKS.filter(task=>task.id!=="landing"),
    { id: "medevac-radio", name: "Aircraft radio uplink", kind: "comms", x: 10.5, y: 5.5, room: "cabin" },
    { id: "medevac-power", name: "Aircraft power distribution", kind: "power", x: 5.5, y: 9.5, room: "avionics" },
  ],
  sites: [],
  vents: [],
  supplies: [],
  crates: [],
  spawns: [
    [8.5, 5.5], [9.5, 5.5], [7.5, 7.5], [10.5, 7.5],
    [8.5, 9.5], [9.5, 9.5], [8.5, 13.5], [9.5, 13.5],
  ],
  // x/y identify integer wall cells; dx/dy point into the interior. Width,
  // height and sill use tile units, like the floor plan (one tile = 3m in 3D).
  windows: [
    ...[7, 8, 9, 10].map((x) => ({ id: `cockpit-window-${x}`, x, y: 1, dx: 0, dy: 1, w: 0.84, h: 0.5, sill: 0.42 })),
    ...[6, 9, 13].map((y) => ({ id: `starboard-window-${y}`, x: 11, y, dx: -1, dy: 0, w: 0.62, h: 0.38, sill: 0.48 })),
    ...[5, 10, 13].map((y) => ({ id: `port-window-${y}`, x: 6, y, dx: 1, dy: 0, w: 0.62, h: 0.38, sill: 0.48 })),
  ],
  props: [
    { kind: "medevac-seat", x: 7.5, y: 9.5, w: 1, h: 1, solid: true, label: "CABIN SEAT" },
    { kind: "medevac-seat", x: 10.5, y: 8.5, w: 1, h: 1, solid: true, label: "CABIN SEAT" },
    { kind: "medical-cargo", x: 7.5, y: 15, w: 1, h: 2, solid: true, label: "MEDICAL CARGO" },
  ],
  zones: transportRooms.map((room) => ({ x: room.x, y: room.y, w: room.w, h: room.h, color: "#6f7e85" })),
};
