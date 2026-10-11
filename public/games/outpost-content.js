/** Original arena layouts and loadouts. Shared by the renderer and server. */
export const LEVEL = [
  "1111111111111111",
  "1000000000000001",
  "1000000000000001",
  "1000220000110001",
  "1000220000110001",
  "1000000000000001",
  "1000000000000001",
  "1000000330000001",
  "1000000330000001",
  "1000000000000001",
  "1001100000220001",
  "1001100000220001",
  "1000000000000001",
  "1000000000000001",
  "1000000000000001",
  "1111111111111111",
].map((row) => [...row].map(Number));

// All maps have sealed boundaries, readable lane connections, and a clear
// final safe zone. Houses/aircraft are walkable shells, not solid scenery.
function layout(size, build) {
  const tiles = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) =>
      x === 0 || y === 0 || x === size - 1 || y === size - 1 ? 1 : 0,
    ),
  );
  const block = (x, y, w, h, type = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) tiles[j][i] = type;
  };
  const shell = (x, y, w, h, type) => {
    block(x, y, w, 1, type);
    block(x, y + h - 1, w, 1, type);
    block(x, y, 1, h, type);
    block(x + w - 1, y, 1, h, type);
  };
  build(block, shell, tiles);
  for (let y = size / 2 - 1; y <= size / 2; y++)
    for (let x = size / 2 - 1; x <= size / 2; x++) tiles[y][x] = 0;
  return tiles;
}
const warm = {
  sky: "#f4cd87",
  floor: "#73564a",
  sun: "#ffe7a1",
  walls: {
    1: ["#d89045", "#ad6936", "#f7bf69"],
    2: ["#318e91", "#246269", "#65b7ae"],
    3: ["#d3a43d", "#9f7231", "#f4d46b"],
    4: ["#cf6a62", "#894649", "#ffa58a"],
    5: ["#5e7393", "#384b66", "#a4c6e5"],
    6: ["#d9e1df", "#98a7ad", "#f5faf6"],
  },
};
export const MAPS = {
  outpost: {
    id: "outpost",
    name: "Dust Outpost",
    tag: "CLASSIC / 16 × 16",
    description: "Sandstone cover and an open center.",
    level: LEVEL,
    theme: warm,
    props: [],
    zones: [],
  },
  testblock: {
    id: "testblock",
    name: "Test Block",
    crates: [
      [5.5, 2.5],
      [10.5, 2.5],
      [5.5, 13.5],
      [10.5, 13.5],
      [4.5, 5.5],
      [10.5, 5.5],
      [1.5, 10.5],
      [14.5, 10.5],
    ],
    tag: "COMPACT / THREE LANES",
    description:
      "Two colored test houses face a central street. Slip through doorways or circle the back gardens.",
    level: layout(16, (b, h, t) => {
      h(3, 4, 4, 8, 2);
      h(9, 4, 4, 8, 4);
      for (const x of [3, 6, 9, 12]) for (const y of [6, 9]) t[y][x] = 0;
      b(7, 4, 2, 1, 3);
      b(7, 11, 2, 1, 3);
    }),
    theme: { ...warm, sky: "#f4cb9b", floor: "#85756b" },
    props: [
      { x: 4.5, y: 13.5, kind: "dummy", label: "TEST SUBJECT" },
      { x: 11.5, y: 2.5, kind: "dummy", label: "TEST SUBJECT" },
    ],
    zones: [
      { x: 7, y: 1, w: 2, h: 14, color: "#514f55" },
      { x: 1, y: 1, w: 2, h: 14, color: "#657d4c" },
      { x: 13, y: 1, w: 2, h: 14, color: "#657d4c" },
    ],
  },
  skyport: {
    id: "skyport",
    name: "Skyport",
    tag: "LARGE / INTERIOR + APRON",
    description: "Boarding halls, baggage cover and an aircraft cabin connect to an open apron.",
    level: layout(24, (b, h, t) => {
      h(3, 3, 12, 9, 5);
      for (const x of [5, 9, 12]) t[11][x] = 0;
      for (const y of [5, 8]) t[y][14] = 0;
      b(7, 4, 1, 3, 2);
      b(10, 7, 3, 1, 2);
      h(18, 4, 4, 14, 6);
      for (const y of [7, 12, 15]) t[y][18] = 0;
      t[17][19] = 0;
      b(5, 16, 2, 3, 3);
      b(9, 17, 3, 1, 2);
      b(15, 19, 2, 2, 3);
    }),
    theme: {
      ...warm,
      sky: "#aad8e8",
      floor: "#687981",
      walls: { ...warm.walls, 1: ["#d0d9d5", "#899caa", "#eff8f3"] },
    },
    props: [
      { x: 5.5, y: 5.5, kind: "sign", label: "GATE 07" },
      { x: 20.5, y: 6.5, kind: "sign", label: "SKYLINE AIR" },
      { x: 7.5, y: 20.5, kind: "luggage", label: "BAGGAGE" },
    ],
    zones: [
      { x: 4, y: 4, w: 10, h: 7, color: "#718d9d" },
      { x: 19, y: 5, w: 2, h: 12, color: "#a6a9a3" },
      { x: 1, y: 13, w: 22, h: 9, color: "#586971" },
    ],
  },
  freight: {
    id: "freight",
    name: "Freight Rush",
    tag: "TINY / FAST ROTATIONS",
    description: "Container corners and a cross-shaped center keep every route close to combat.",
    level: layout(12, (b) => {
      b(3, 3, 2, 2, 2);
      b(7, 3, 2, 2, 4);
      b(3, 7, 2, 2, 4);
      b(7, 7, 2, 2, 2);
    }),
    theme: { ...warm, sky: "#c9c2a2", floor: "#59626b" },
    props: [{ x: 6, y: 2, kind: "sign", label: "PORT 9" }],
    zones: [
      { x: 5, y: 1, w: 2, h: 10, color: "#877842" },
      { x: 1, y: 5, w: 10, h: 2, color: "#877842" },
    ],
  },
  estate: {
    id: "estate",
    name: "Wreck Estate",
    tag: "MEDIUM / VILLA + CRASH SITE",
    description:
      "A downed rotorcraft anchors three connected lanes between villa rooms and a turquoise pool court.",
    level: layout(20, (b, h, t) => {
      h(3, 3, 5, 5, 1);
      h(12, 3, 5, 5, 5);
      for (const x of [3, 7, 12, 16]) t[5][x] = 0;
      for (const x of [5, 14]) t[7][x] = 0;
      b(9, 7, 2, 1, 3);
      b(9, 12, 2, 1, 3);
      b(3, 12, 2, 3, 1);
      b(16, 12, 1, 4, 2);
      b(6, 16, 3, 1, 1);
    }),
    theme: { ...warm, sky: "#e2b9a0", floor: "#816a64" },
    props: [
      { x: 10, y: 8.5, kind: "wreck", label: "DOWNED / 04" },
      { x: 14, y: 14, kind: "sign", label: "POOL COURT" },
    ],
    zones: [
      { x: 11, y: 12, w: 5, h: 4, color: "#34999f" },
      { x: 4, y: 4, w: 3, h: 3, color: "#a18d72" },
      { x: 13, y: 4, w: 3, h: 3, color: "#90949e" },
    ],
  },
};
// Damage is scaled by the combatant's power rating (40 for players). Charge
// Cores increase that rating, so every pellet, projectile and ability scales.
export const WEAPONS = {
  carbine: {
    id: "carbine",
    name: "VX–7 Carbine",
    kind: "rifle",
    damage: 40,
    mag: 24,
    cooldown: 0.14,
    range: 32,
    color: "#edb14f",
    super: "Overdrive",
    description: "Accurate automatic fire. Super: five-shot overdrive burst.",
  },
  scatter: {
    id: "scatter",
    name: "Sunburst",
    kind: "shotgun",
    damage: 14,
    pellets: 5,
    spread: 0.32,
    mag: 6,
    cooldown: 0.65,
    range: 6,
    color: "#ef865c",
    super: "Shockwave",
    description:
      "Wide pellet spread; lethal nearby. Super: heavy blast, knockback and cover break.",
  },
  twin: {
    id: "twin",
    name: "Twinwire",
    kind: "burst",
    damage: 15,
    mag: 18,
    cooldown: 0.52,
    range: 20,
    color: "#79c8eb",
    super: "Crossfire",
    description: "Three accurate shots per trigger. Super: nine-shot sweeping burst.",
  },
  breach: {
    id: "breach",
    name: "Gatebreaker",
    kind: "shotgun",
    damage: 15,
    pellets: 7,
    spread: 0.26,
    mag: 4,
    cooldown: 0.85,
    range: 3.6,
    color: "#e45845",
    super: "Breach Run",
    description: "Heavy close-range scattergun. Super: rush through cover and shove rivals.",
  },
  shard: {
    id: "shard",
    name: "Shardpod",
    kind: "shard",
    damage: 36,
    mag: 6,
    cooldown: 0.7,
    range: 8,
    color: "#85c877",
    super: "Bramble Field",
    description: "A thrown pod bursts into radial shards. Super: a damaging, slowing field.",
  },
  veil: {
    id: "veil",
    name: "Mirage",
    kind: "blades",
    damage: 18,
    pellets: 4,
    spread: 0.18,
    mag: 12,
    cooldown: 0.6,
    range: 8,
    color: "#b296e5",
    super: "Ghost Step",
    description:
      "Four spinning blades with close-range falloff. Super: cloak until you attack or approach a rival.",
  },
  venom: {
    id: "venom",
    name: "Viperfan",
    kind: "poison",
    damage: 14,
    pellets: 3,
    spread: 0.24,
    mag: 9,
    cooldown: 0.65,
    range: 10,
    color: "#a7d967",
    super: "Venom Vault",
    description:
      "Three toxic darts suppress healing. Super: leap with poison fans on departure and arrival.",
  },
  brawler: {
    id: "brawler",
    name: "Pulse Knuckles",
    kind: "melee",
    damage: 48,
    mag: 8,
    cooldown: 0.32,
    range: 1.4,
    color: "#e5799f",
    super: "Impact Leap",
    description: "Fast punches return some health on hit. Super: leap strike with a speed boost.",
  },
  reaper: {
    id: "reaper",
    name: "Rift Scythe",
    kind: "dash",
    damage: 50,
    mag: 6,
    cooldown: 0.45,
    range: 1.5,
    color: "#c6a1e2",
    super: "Echo Rush",
    description: "Dash-and-slash attacks. Super: rush with healing spectral projectiles.",
  },
  rocket: {
    id: "rocket",
    name: "Flare Launcher",
    kind: "rocket",
    damage: 58,
    mag: 4,
    cooldown: 0.9,
    range: 18,
    color: "#f19a48",
    super: "Skyfall",
    description: "Impact rockets splash around cover. Super: a marked five-rocket barrage.",
  },
  demo: {
    id: "demo",
    name: "Fusecaster",
    kind: "lob",
    damage: 26,
    mag: 4,
    cooldown: 1,
    range: 7,
    color: "#f1d068",
    super: "Big Bang",
    description: "Twin fuses arc over walls. Super: a heavy cover-breaking barrel with knockback.",
  },
};
export const mapOf = (id) => (Object.hasOwn(MAPS, id) ? MAPS[id] : MAPS.outpost);
export const weaponOf = (id) => (Object.hasOwn(WEAPONS, id) ? WEAPONS[id] : WEAPONS.carbine);
