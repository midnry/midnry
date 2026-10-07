import type { Effect } from "../types";

// Every kind of building in the city, as data. To add a building, add an
// entry here: its art comes from `art` (a drawing style in buildingArt.ts,
// tinted with `palette`), and its place in the simulation from the numbers.
// Nothing else needs to change.

export type Zone = "residential" | "commercial" | "industrial" | "civic" | "service" | "park" | "water" | "road" | "rail";

export type Category = "residential" | "commercial" | "industrial" | "civic" | "utility" | "landmark" | "park";

/** What a building does for the city around it. */
export type Service = "power" | "water" | "waste" | "health" | "safety" | "fire" | "education" | "culture" | "transit";

/** The drawing style. Several buildings can share one (a shop and a pharmacy). */
export type ArtKind =
  | "house" | "bighouse" | "duplex" | "townhouse" | "apartment" | "highrise" | "villa"
  | "shop" | "restaurant" | "cafe" | "office" | "mall" | "supermarket" | "tower" | "cinema" | "hotel"
  | "factory" | "warehouse" | "plant" | "powerplant" | "construction" | "logistics"
  | "school" | "hospital" | "clinic" | "police" | "firestation" | "government" | "library" | "community"
  | "watertower" | "substation" | "waste" | "solar"
  | "stadium" | "museum" | "monument" | "skyscraper" | "mosque" | "church"
  | "park" | "playground" | "farm";

/** Something you can do at a building: costs time and energy, has effects (same as places). */
export type LotAction = { id: string; label: string; slots: number; energy: number; cost?: number; effects: Effect[]; text?: string; open?: boolean };

export type BuildingDef = {
  id: string;
  name: string;
  category: Category;
  zone: Zone;
  art: ArtKind;
  /** Footprint in grid cells (a cell is about 100 × 95 px). */
  cells: [number, number];
  floors: [number, number];
  /** Colour schemes for walls and roofs: the first is wall, the second roof or trim. */
  palette: [string, string][];
  /** People who live here, per floor (residential). */
  residents?: number;
  /** People who work here. */
  jobs?: number;
  /** Customers or visitors in a busy hour. */
  visitors?: number;
  /** Open from slot to slot (0 morning … 3 night). Missing means always open or not applicable. */
  hours?: [number, number];
  /** Naira a week the business takes in and spends, at level 1. */
  revenue?: number;
  costs?: number;
  /** Base value of the property, in naira. */
  value: number;
  /** Electricity and water it needs (units). */
  power: number;
  water: number;
  /** Smoke, noise and dirt it gives the area, 0–10. */
  pollution?: number;
  /** How much it makes the area attractive, 0–10 (parks, landmarks). */
  attract?: number;
  /** What it provides and how far (px). */
  provides?: { service: Service; radius: number; amount?: number }[];
  /** How many times it can be upgraded. */
  levels?: number;
  /** Can you buy it (and rent it out)? */
  forSale?: boolean;
  actions?: LotAction[];
  blurb: string;
};

const SAFE_PALETTES: [string, string][] = [
  ["#f1e4cc", "#b5523b"],
  ["#e9d5b7", "#5b6b7a"],
  ["#f5f0e6", "#7a4a2a"],
  ["#d8e3c6", "#8a3b2a"],
  ["#f3d8c2", "#3f5f8f"],
];
const CITY_PALETTES: [string, string][] = [
  ["#cfd8e3", "#2f4a6b"],
  ["#e7e2d6", "#4a5568"],
  ["#d9cbb5", "#6b4f3a"],
  ["#b9cde0", "#1e3a5f"],
];
const GLASS: [string, string][] = [
  ["#7fa6c8", "#1e3a5f"],
  ["#8fb7a8", "#24524a"],
  ["#9bb0d6", "#2b3a67"],
];

const rest = (stress: number): Effect[] => [{ stat: "stress", add: -stress }];

export const BUILDINGS: BuildingDef[] = [
  // ── Residential ──
  { id: "small_house", name: "Small house", category: "residential", zone: "residential", art: "house", cells: [1, 1], floors: [1, 1], palette: SAFE_PALETTES, residents: 4, value: 9_000_000, power: 1, water: 1, levels: 2, forSale: true, blurb: "A bungalow with a little yard, a mango tree and a generator out back." },
  { id: "big_house", name: "Family house", category: "residential", zone: "residential", art: "bighouse", cells: [1, 1], floors: [2, 2], palette: SAFE_PALETTES, residents: 3, value: 28_000_000, power: 2, water: 2, levels: 2, forSale: true, blurb: "Two floors, a gate and a boys' quarters." },
  { id: "duplex", name: "Duplex", category: "residential", zone: "residential", art: "duplex", cells: [1, 1], floors: [2, 2], palette: SAFE_PALETTES, residents: 4, value: 45_000_000, power: 2, water: 2, levels: 2, forSale: true, blurb: "Semi-detached duplex in an estate: two families, two front doors." },
  { id: "townhouse", name: "Townhouses", category: "residential", zone: "residential", art: "townhouse", cells: [1, 1], floors: [2, 3], palette: SAFE_PALETTES, residents: 3, value: 60_000_000, power: 3, water: 3, levels: 2, forSale: true, blurb: "A terrace of narrow town houses, each painted its own colour." },
  { id: "apartments", name: "Apartment block", category: "residential", zone: "residential", art: "apartment", cells: [1, 1], floors: [3, 5], palette: CITY_PALETTES, residents: 6, value: 120_000_000, power: 5, water: 5, levels: 3, forSale: true, blurb: "Flats with balconies, washing lines and satellite dishes." },
  { id: "highrise_apts", name: "High-rise apartments", category: "residential", zone: "residential", art: "highrise", cells: [1, 1], floors: [8, 14], palette: GLASS, residents: 8, value: 650_000_000, power: 12, water: 10, levels: 3, blurb: "A residential tower with a gym, a pool and a doorman." },
  { id: "villa", name: "Luxury villa", category: "residential", zone: "residential", art: "villa", cells: [2, 1], floors: [2, 3], palette: [["#f8f4ec", "#3b3b3e"], ["#efe6d6", "#7a4a2a"], ["#f4efe8", "#1e3a5f"]], residents: 2, value: 1_200_000_000, power: 8, water: 8, attract: 2, levels: 1, forSale: true, blurb: "Marble, a pool, high walls and armed guards. Maitama money." },

  // ── Commercial ──
  {
    id: "shop", name: "Corner shop", category: "commercial", zone: "commercial", art: "shop", cells: [1, 1], floors: [1, 2], palette: SAFE_PALETTES, jobs: 3, visitors: 12, hours: [0, 3], revenue: 180_000, costs: 110_000, value: 25_000_000, power: 2, water: 1, levels: 3, forSale: true,
    actions: [{ id: "snacks", label: "Buy a drink and snacks (₦800)", slots: 0, energy: 4, cost: 800, effects: [{ water: 25 }, { food: 10 }], open: true }],
    blurb: "Provisions, recharge cards, cold drinks and gossip.",
  },
  {
    id: "restaurant", name: "Restaurant", category: "commercial", zone: "commercial", art: "restaurant", cells: [1, 1], floors: [1, 2], palette: SAFE_PALETTES, jobs: 8, visitors: 25, hours: [1, 3], revenue: 600_000, costs: 420_000, value: 60_000_000, power: 4, water: 4, levels: 3, forSale: true,
    actions: [{ id: "eat", label: "Eat here (₦4,500)", slots: 1, energy: 6, cost: 4500, effects: [{ food: 65 }, { water: 20 }, ...rest(5)], open: true }],
    blurb: "Jollof, pepper soup and grills, with a TV showing the match.",
  },
  {
    id: "cafe", name: "Café", category: "commercial", zone: "commercial", art: "cafe", cells: [1, 1], floors: [1, 1], palette: SAFE_PALETTES, jobs: 4, visitors: 14, hours: [0, 2], revenue: 250_000, costs: 170_000, value: 35_000_000, power: 3, water: 2, levels: 3, forSale: true,
    actions: [{ id: "coffee", label: "Coffee and a pastry (₦3,000)", slots: 0, energy: 10, cost: 3000, effects: [{ food: 15 }, { water: 10 }, ...rest(3)], open: true }],
    blurb: "Flat whites, laptops and freelancers on video calls.",
  },
  { id: "office", name: "Office building", category: "commercial", zone: "commercial", art: "office", cells: [1, 1], floors: [4, 8], palette: CITY_PALETTES, jobs: 60, visitors: 10, hours: [0, 2], revenue: 2_500_000, costs: 1_900_000, value: 350_000_000, power: 10, water: 4, levels: 3, blurb: "Consultancies, NGOs, a law firm and a bank branch." },
  {
    id: "supermarket", name: "Supermarket", category: "commercial", zone: "commercial", art: "supermarket", cells: [2, 1], floors: [1, 1], palette: [["#f5f5f4", "#16a34a"], ["#f5f5f4", "#dc2626"], ["#f5f5f4", "#1d4ed8"]], jobs: 30, visitors: 60, hours: [0, 3], revenue: 3_200_000, costs: 2_600_000, value: 220_000_000, power: 8, water: 3, levels: 2,
    actions: [{ id: "groceries", label: "Stock up on groceries (₦6,000)", slots: 1, energy: 6, cost: 6000, effects: [{ food: 40 }, { water: 30 }], open: true }],
    blurb: "Aisles of imported cereal next to local garri. Air-conditioned.",
  },
  { id: "mall", name: "Shopping centre", category: "commercial", zone: "commercial", art: "mall", cells: [2, 1], floors: [2, 3], palette: [["#eef2f7", "#1e3a8a"], ["#f1ece4", "#7c2d12"]], jobs: 150, visitors: 200, hours: [0, 3], revenue: 15_000_000, costs: 11_000_000, value: 2_500_000_000, power: 20, water: 8, attract: 4, levels: 2, blurb: "Shops, a food court, a cinema and air-con for the whole afternoon." },
  { id: "business_tower", name: "Business tower", category: "commercial", zone: "commercial", art: "tower", cells: [1, 1], floors: [14, 24], palette: GLASS, jobs: 400, visitors: 30, hours: [0, 2], revenue: 20_000_000, costs: 15_000_000, value: 6_000_000_000, power: 30, water: 10, attract: 2, levels: 2, blurb: "Glass tower of oil companies, banks and telcos." },
  {
    id: "cinema", name: "Cinema and arcade", category: "commercial", zone: "commercial", art: "cinema", cells: [1, 1], floors: [2, 2], palette: [["#1f2937", "#e11d48"], ["#312e81", "#f59e0b"]], jobs: 20, visitors: 80, hours: [1, 3], revenue: 1_400_000, costs: 1_000_000, value: 180_000_000, power: 8, water: 2, attract: 3, levels: 2,
    actions: [{ id: "movie", label: "Watch a film (₦4,000)", slots: 1, energy: -4, cost: 4000, effects: [...rest(12), { stat: "network", add: 1 }], open: true }],
    blurb: "Nollywood premieres, popcorn and a games arcade.",
  },
  {
    id: "hotel", name: "Hotel", category: "commercial", zone: "commercial", art: "hotel", cells: [1, 1], floors: [6, 10], palette: [["#f1e4cc", "#7c2d12"], ["#e7e2d6", "#1e3a5f"]], jobs: 90, visitors: 60, revenue: 6_000_000, costs: 4_500_000, value: 900_000_000, power: 15, water: 15, attract: 3, levels: 2,
    actions: [{ id: "lounge", label: "Drinks at the hotel lounge (₦12,000)", slots: 1, energy: -2, cost: 12000, effects: [...rest(8), { stat: "network", add: 2 }], open: true }],
    blurb: "Conferences by day, weddings by night.",
  },

  // ── Industrial ──
  { id: "factory", name: "Factory", category: "industrial", zone: "industrial", art: "factory", cells: [2, 1], floors: [1, 2], palette: [["#c8b8a2", "#8a3b2a"], ["#b9c2c9", "#4b5563"]], jobs: 120, revenue: 9_000_000, costs: 7_500_000, value: 800_000_000, power: 25, water: 10, pollution: 7, levels: 3, blurb: "Plastics, noodles and roofing sheets. Shift changes at 6." },
  { id: "warehouse", name: "Warehouse", category: "industrial", zone: "industrial", art: "warehouse", cells: [2, 1], floors: [1, 1], palette: [["#9fb3c8", "#475569"], ["#c9bfa8", "#57534e"]], jobs: 25, revenue: 1_500_000, costs: 1_000_000, value: 250_000_000, power: 4, water: 1, pollution: 2, levels: 2, blurb: "Pallets of everything, and trucks backing in all day." },
  { id: "processing_plant", name: "Processing plant", category: "industrial", zone: "industrial", art: "plant", cells: [2, 1], floors: [1, 2], palette: [["#d1d5db", "#6b7280"]], jobs: 80, revenue: 7_000_000, costs: 5_800_000, value: 900_000_000, power: 30, water: 25, pollution: 6, levels: 2, blurb: "Grain silos, tanks and pipes: food processing for the whole FCT." },
  { id: "construction_yard", name: "Construction site", category: "industrial", zone: "industrial", art: "construction", cells: [1, 1], floors: [1, 3], palette: [["#d6c7a1", "#f59e0b"]], jobs: 40, value: 120_000_000, power: 3, water: 3, pollution: 4, blurb: "Another estate going up. Cranes, cement and Chinese engineers." },
  { id: "logistics", name: "Logistics depot", category: "industrial", zone: "industrial", art: "logistics", cells: [2, 1], floors: [1, 1], palette: [["#9fb3c8", "#334155"]], jobs: 60, revenue: 4_000_000, costs: 3_100_000, value: 600_000_000, power: 6, water: 2, pollution: 4, provides: [{ service: "transit", radius: 600 }], levels: 2, blurb: "The inland dry port: containers from Lagos sorted for the north." },

  // ── Civic and public ──
  {
    id: "school", name: "School", category: "civic", zone: "civic", art: "school", cells: [2, 1], floors: [2, 2], palette: [["#f3e3b5", "#2563eb"], ["#f1e4cc", "#16a34a"]], jobs: 40, visitors: 300, hours: [0, 1], value: 400_000_000, power: 5, water: 6, provides: [{ service: "education", radius: 700 }], levels: 2,
    actions: [{ id: "evening_class", label: "Evening class for adults (₦5,000)", slots: 1, energy: -10, cost: 5000, effects: [{ skill: "education", add: 2 }], open: true }],
    blurb: "Primary and secondary. Uniforms, assembly, and a headmaster with a cane.",
  },
  {
    id: "clinic", name: "Clinic", category: "civic", zone: "civic", art: "clinic", cells: [1, 1], floors: [1, 2], palette: [["#f8fafc", "#16a34a"]], jobs: 12, visitors: 20, value: 90_000_000, power: 4, water: 4, provides: [{ service: "health", radius: 450 }], levels: 2,
    actions: [{ id: "checkup", label: "See the nurse (₦6,000)", slots: 1, energy: -4, cost: 6000, effects: [{ stat: "health", add: 15 }, ...rest(2)], open: true }],
    blurb: "A neighbourhood clinic: malaria tests, drips and a long bench to wait on.",
  },
  { id: "hospital_bld", name: "Hospital", category: "civic", zone: "civic", art: "hospital", cells: [2, 1], floors: [3, 5], palette: [["#f8fafc", "#dc2626"]], jobs: 300, visitors: 120, value: 3_000_000_000, power: 25, water: 25, provides: [{ service: "health", radius: 1100 }], levels: 2, blurb: "Wards, theatres and an emergency bay with ambulances." },
  {
    id: "police", name: "Police station", category: "civic", zone: "civic", art: "police", cells: [1, 1], floors: [2, 2], palette: [["#dbe7f5", "#1e3a8a"]], jobs: 40, value: 150_000_000, power: 4, water: 2, provides: [{ service: "safety", radius: 650 }], levels: 2,
    actions: [{ id: "report", label: "Report a crime you saw", slots: 1, energy: -6, effects: [{ stat: "heat", add: -4 }, { stat: "reputation", add: 1 }], open: true }],
    blurb: "Divisional police station. Bring your own biro.",
  },
  { id: "fire_station", name: "Fire station", category: "civic", zone: "service", art: "firestation", cells: [1, 1], floors: [2, 2], palette: [["#f3e3d3", "#b91c1c"]], jobs: 30, value: 120_000_000, power: 3, water: 6, provides: [{ service: "fire", radius: 800 }], levels: 2, blurb: "Red engines ready to roll. Fires spread slower near here." },
  { id: "government", name: "Government secretariat", category: "civic", zone: "civic", art: "government", cells: [2, 1], floors: [3, 4], palette: [["#efe7d6", "#166534"]], jobs: 500, visitors: 80, hours: [0, 1], value: 5_000_000_000, power: 20, water: 10, attract: 2, levels: 1, blurb: "Ministries, files and civil servants who'll see you tomorrow." },
  {
    id: "library", name: "Public library", category: "civic", zone: "civic", art: "library", cells: [1, 1], floors: [2, 2], palette: [["#efe7d6", "#7c2d12"]], jobs: 10, visitors: 30, hours: [0, 2], value: 80_000_000, power: 3, water: 1, provides: [{ service: "education", radius: 500 }, { service: "culture", radius: 400 }], levels: 2,
    actions: [{ id: "study", label: "Study for free", slots: 1, energy: -10, effects: [{ skill: "education", add: 1 }, ...rest(1)], open: true }],
    blurb: "Quiet, cool and free. Exam season fills every chair.",
  },
  {
    id: "community", name: "Community centre", category: "civic", zone: "civic", art: "community", cells: [1, 1], floors: [1, 1], palette: [["#fde7c7", "#c2410c"], ["#e0f2fe", "#0369a1"]], jobs: 6, visitors: 40, hours: [0, 3], value: 60_000_000, power: 2, water: 2, attract: 1, provides: [{ service: "culture", radius: 450 }], levels: 2,
    actions: [{ id: "meeting", label: "Join a community meeting", slots: 1, energy: -6, effects: [{ stat: "network", add: 2 }, ...rest(3)], open: true }],
    blurb: "Town hall meetings, weddings, aerobics and church fundraisers.",
  },

  // ── Utilities ──
  { id: "power_plant", name: "Power station", category: "utility", zone: "industrial", art: "powerplant", cells: [2, 1], floors: [1, 1], palette: [["#d1d5db", "#7c2d12"]], jobs: 60, value: 8_000_000_000, power: 0, water: 20, pollution: 9, provides: [{ service: "power", radius: 3000, amount: 600 }], blurb: "Gas turbines feeding the grid. When it trips, the whole city knows." },
  { id: "solar_farm", name: "Solar farm", category: "utility", zone: "service", art: "solar", cells: [1, 1], floors: [1, 1], palette: [["#1e3a8a", "#94a3b8"]], jobs: 4, value: 400_000_000, power: 0, water: 0, provides: [{ service: "power", radius: 3000, amount: 80 }], blurb: "Panels in rows, quietly keeping the lights on." },
  { id: "substation", name: "Electricity substation", category: "utility", zone: "service", art: "substation", cells: [1, 1], floors: [1, 1], palette: [["#9ca3af", "#facc15"]], jobs: 3, value: 150_000_000, power: 0, water: 0, provides: [{ service: "power", radius: 650 }], blurb: "Transformers humming behind a fence. Danger: 33,000 volts." },
  { id: "water_tower", name: "Water tower", category: "utility", zone: "service", art: "watertower", cells: [1, 1], floors: [1, 1], palette: [["#60a5fa", "#1e3a8a"]], jobs: 2, value: 90_000_000, power: 1, water: 0, provides: [{ service: "water", radius: 650, amount: 120 }], blurb: "Keeps the taps running in the neighbourhood (most days)." },
  { id: "waste_depot", name: "Waste depot", category: "utility", zone: "service", art: "waste", cells: [1, 1], floors: [1, 1], palette: [["#a3a380", "#3f6212"]], jobs: 20, value: 80_000_000, power: 2, water: 1, pollution: 5, provides: [{ service: "waste", radius: 1200 }], blurb: "AEPB trucks bring the city's rubbish here to be sorted." },

  // ── Landmarks ──
  {
    id: "stadium", name: "National Stadium", category: "landmark", zone: "civic", art: "stadium", cells: [3, 2], floors: [1, 1], palette: [["#e5e7eb", "#16a34a"]], jobs: 80, visitors: 500, value: 20_000_000_000, power: 15, water: 10, attract: 9, provides: [{ service: "culture", radius: 900 }],
    actions: [{ id: "match", label: "Watch a Super Eagles match (₦3,000)", slots: 2, energy: -10, cost: 3000, effects: [...rest(15), { stat: "network", add: 2 }], open: true }],
    blurb: "60,000 seats. On match days the whole city is green and white.",
  },
  {
    id: "museum", name: "National Museum", category: "landmark", zone: "civic", art: "museum", cells: [2, 1], floors: [2, 2], palette: [["#efe7d6", "#57534e"]], jobs: 30, visitors: 60, hours: [0, 2], value: 4_000_000_000, power: 4, water: 2, attract: 7, provides: [{ service: "culture", radius: 700 }],
    actions: [{ id: "visit", label: "Visit the museum (₦1,000)", slots: 1, energy: -4, cost: 1000, effects: [{ skill: "education", add: 1 }, ...rest(6)], open: true }],
    blurb: "Nok terracottas, Benin bronzes and a school trip every morning.",
  },
  { id: "monument", name: "Unity Monument", category: "landmark", zone: "park", art: "monument", cells: [1, 1], floors: [1, 1], palette: [["#e5e7eb", "#16a34a"]], value: 1_000_000_000, power: 1, water: 1, attract: 8, actions: [{ id: "photo", label: "Take photos at the monument", slots: 0, energy: -2, effects: [{ skill: "content", add: 1 }, ...rest(2)] }], blurb: "A white obelisk and fountains for all 36 states. Tourists and wedding photos." },
  { id: "skyscraper", name: "Abuja Trade Tower", category: "landmark", zone: "commercial", art: "skyscraper", cells: [1, 1], floors: [30, 30], palette: [["#93c5fd", "#1e3a5f"]], jobs: 900, visitors: 100, value: 40_000_000_000, power: 40, water: 15, attract: 9, blurb: "The tallest tower in the north: a spire you can see from Nyanya." },
  { id: "mosque", name: "National Mosque", category: "landmark", zone: "civic", art: "mosque", cells: [2, 1], floors: [1, 1], palette: [["#f5f0e6", "#c49b2a"]], visitors: 300, value: 12_000_000_000, power: 6, water: 6, attract: 8, actions: [{ id: "pray", label: "Pray and reflect", slots: 1, energy: 0, effects: rest(10) }], blurb: "Gold dome and four minarets. Friday traffic is legendary." },
  { id: "church", name: "National Christian Centre", category: "landmark", zone: "civic", art: "church", cells: [2, 1], floors: [1, 1], palette: [["#f5f0e6", "#1e3a8a"]], visitors: 300, value: 12_000_000_000, power: 6, water: 4, attract: 8, actions: [{ id: "pray", label: "Pray and reflect", slots: 1, energy: 0, effects: rest(10) }], blurb: "A soaring white cathedral with a blue cross on top." },

  // ── Parks ──
  {
    id: "park", name: "Neighbourhood park", category: "park", zone: "park", art: "park", cells: [1, 1], floors: [1, 1], palette: [["#4ade80", "#166534"]], value: 0, power: 0, water: 1, attract: 4,
    actions: [{ id: "relax", label: "Relax on a bench", slots: 1, energy: 8, effects: rest(8) }],
    blurb: "Grass, a few benches and old men playing draughts.",
  },
  {
    id: "playground", name: "Playground", category: "park", zone: "park", art: "playground", cells: [1, 1], floors: [1, 1], palette: [["#4ade80", "#f97316"]], value: 0, power: 0, water: 0, attract: 3,
    actions: [{ id: "play", label: "Hang out at the playground", slots: 1, energy: 2, effects: [...rest(6), { stat: "network", add: 1 }] }],
    blurb: "Swings, a slide and a football pitch made of sand.",
  },
  { id: "farm", name: "Farmland", category: "park", zone: "park", art: "farm", cells: [2, 1], floors: [1, 1], palette: [["#84cc16", "#7c2d12"]], jobs: 6, value: 20_000_000, power: 0, water: 3, forSale: true, blurb: "Maize, yam and cassava on the city's edge." },
];

export const building = (id: string) => BUILDINGS.find((b) => b.id === id);

/** Zone colours for the map legend, from the sheet. */
export const ZONE_COLORS: Record<Zone, string> = {
  residential: "#facc15",
  commercial: "#3b82f6",
  industrial: "#f97316",
  civic: "#a855f7",
  service: "#22c55e",
  park: "#84cc16",
  water: "#38bdf8",
  road: "#4b5563",
  rail: "#9ca3af",
};

export const ZONE_LABEL: Record<Zone, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  civic: "Civic / Public",
  service: "Services and utilities",
  park: "Parks and recreation",
  water: "Water",
  road: "Roads",
  rail: "Railway",
};
