import type { EquipmentDef, EquipStats, EquipTier, Method, Prep, Storage } from "./types";

// Kitchen equipment. Every item comes in up to three tiers; better kit is
// faster, breaks less, holds more, lifts food quality and costs more to buy
// (and sometimes to run). Methods and prep say what a piece makes possible.

/** Tier stats from a base price, capacity and energy. */
function tiers(price: number, capacity = 1, energy = 0, only?: EquipTier[]): Partial<Record<EquipTier, EquipStats>> {
  const all: Record<EquipTier, EquipStats> = {
    basic: { price, speed: 60, reliability: 70, capacity, quality: 50, energy },
    pro: { price: Math.round(price * 3.5), speed: 85, reliability: 90, capacity: Math.max(capacity + 1, Math.round(capacity * 2)), quality: 75, energy: Math.round(energy * 1.3) },
    luxury: { price: Math.round(price * 9), speed: 98, reliability: 98, capacity: Math.max(capacity + 2, Math.round(capacity * 3)), quality: 95, energy: Math.round(energy * 1.5) },
  };
  const keep = only ?? (["basic", "pro", "luxury"] as EquipTier[]);
  return Object.fromEntries(keep.map((t) => [t, all[t]])) as Partial<Record<EquipTier, EquipStats>>;
}

type Opt = { methods?: Method[]; prep?: Prep[]; storage?: Storage; station?: EquipmentDef["station"]; seats?: number; for?: string[]; blurb?: string };

function E(id: string, name: string, icon: string, kind: EquipmentDef["kind"], scope: EquipmentDef["scope"], t: EquipmentDef["tiers"], o: Opt = {}): EquipmentDef {
  return { id, name, icon, kind, scope, tiers: t, ...o };
}

const HOME: EquipTier[] = ["basic", "pro", "luxury"];
const ONE: EquipTier[] = ["basic"];

export const EQUIPMENT: EquipmentDef[] = [
  // ── Basic home kit ──
  E("kerosene_stove", "Kerosene stove", "🔥", "heat", "home", tiers(6000, 1, 120, ONE), { methods: ["boil", "fry", "stew", "simmer", "saute", "steam"], station: "cook", blurb: "One burner, smoky, reliable enough." }),
  E("gas_cooker", "Gas cooker", "🔥", "heat", "home", tiers(45000, 2, 100), { methods: ["boil", "fry", "stew", "simmer", "saute", "braise", "steam", "roast", "bake"], station: "cook", blurb: "Burners on top, an oven below." }),
  E("frying_pan", "Frying pan", "🍳", "heat", "both", tiers(4000, 1, 0), { methods: ["fry", "saute", "toast"] }),
  E("saucepan", "Saucepan", "🥘", "heat", "both", tiers(3500, 1, 0), { methods: ["boil", "simmer"] }),
  E("pot", "Cooking pot", "🍲", "heat", "both", tiers(5000, 1, 0), { methods: ["boil", "stew", "braise", "simmer", "steam"] }),
  E("stockpot", "Stockpot", "🍲", "heat", "both", tiers(12000, 3, 0), { methods: ["boil", "stew", "simmer"] }),
  E("knife", "Chef's knife", "🔪", "prep", "both", tiers(3000), { prep: ["chop", "peel"] }),
  E("cutting_board", "Cutting board", "🪵", "prep", "both", tiers(1500), { prep: ["chop"] }),
  E("mixing_bowl", "Mixing bowls", "🥣", "prep", "both", tiers(2000), { prep: ["mix", "marinate"] }),
  E("measuring_cups", "Measuring cups", "🥛", "prep", "both", tiers(1500, 1, 0, ONE), { blurb: "Precise measures: fewer mistakes when baking." }),
  E("measuring_spoons", "Measuring spoons", "🥄", "prep", "both", tiers(1000, 1, 0, ONE), { blurb: "Seasoning lands closer to where you aim." }),
  E("spatula", "Spatula", "🥄", "prep", "both", tiers(800, 1, 0, ONE)),
  E("wooden_spoon", "Wooden spoon", "🥄", "prep", "both", tiers(500, 1, 0, ONE), { prep: ["mix"] }),
  E("whisk", "Whisk", "🥄", "prep", "both", tiers(1200, 1, 0, ONE), { prep: ["mix"] }),
  E("tongs", "Tongs", "🥢", "prep", "both", tiers(1000, 1, 0, ONE)),
  E("colander", "Colander", "🥣", "prep", "both", tiers(1500, 1, 0, ONE)),
  E("grater", "Grater", "🧀", "prep", "both", tiers(1200, 1, 0, ONE), { prep: ["grate"] }),
  E("peeler", "Peeler", "🥔", "prep", "both", tiers(800, 1, 0, ONE), { prep: ["peel"] }),
  E("mortar", "Mortar and pestle", "🪨", "prep", "both", tiers(3500, 1, 0, ["basic", "pro"]), { prep: ["pound", "grate"] }),
  E("blender", "Blender", "🌀", "prep", "both", tiers(15000, 1, 30), { methods: ["blend"], prep: ["pound"] }),
  E("microwave", "Microwave", "📟", "heat", "home", tiers(40000, 1, 40), { methods: ["steam"], blurb: "Reheats leftovers properly." }),
  E("toaster", "Toaster", "🍞", "heat", "home", tiers(12000, 1, 20), { methods: ["toast"] }),
  E("kettle", "Kettle", "🫖", "drink", "both", tiers(8000, 1, 15), { methods: ["brew"] }),
  E("fridge", "Fridge", "🧊", "storage", "home", tiers(180000, 25, 60), { storage: "fridge", blurb: "Keeps meat, fish and vegetables fresh for days." }),
  E("freezer", "Chest freezer", "❄️", "storage", "home", tiers(220000, 30, 70), { storage: "freezer", methods: ["freeze"], blurb: "Keeps meat and fish for weeks." }),
  E("cabinets", "Kitchen cabinets", "🗄️", "fixture", "home", tiers(60000, 20, 0), { storage: "pantry" }),
  E("pantry_shelf", "Pantry shelves", "🗄️", "fixture", "both", tiers(20000, 12, 0), { storage: "pantry" }),

  // ── Advanced home kit ──
  E("food_processor", "Food processor", "⚙️", "prep", "both", tiers(45000, 2, 25), { methods: ["blend"], prep: ["chop", "grate", "mix"], blurb: "Chops in seconds: prep is faster and neater." }),
  E("stand_mixer", "Stand mixer", "🥣", "bake", "both", tiers(90000, 1, 30), { prep: ["mix", "knead"], blurb: "Kneads dough perfectly." }),
  E("air_fryer", "Air fryer", "🌬️", "heat", "home", tiers(55000, 1, 40), { methods: ["deepfry", "roast", "bake"], blurb: "Crispy without much oil: healthier fried food." }),
  E("rice_cooker", "Rice cooker", "🍚", "heat", "home", tiers(30000, 2, 30), { methods: ["boil", "steam"] }),
  E("pressure_cooker", "Pressure cooker", "♨️", "heat", "both", tiers(35000, 1, 40), { methods: ["pressure", "stew", "boil"], blurb: "Tough meat and beans in a fraction of the time." }),
  E("slow_cooker", "Slow cooker", "🍲", "heat", "home", tiers(30000, 1, 50), { methods: ["slow", "stew", "braise"] }),
  E("electric_grill", "Electric grill", "♨️", "heat", "home", tiers(40000, 1, 50), { methods: ["grill", "toast"] }),
  E("coffee_maker", "Coffee machine", "☕", "drink", "both", tiers(60000, 1, 20), { methods: ["brew"] }),
  E("espresso_machine", "Espresso machine", "☕", "drink", "both", tiers(350000, 1, 40), { methods: ["espresso", "brew"], station: "drink" }),
  E("ice_maker", "Ice maker", "🧊", "drink", "both", tiers(80000, 2, 40), { methods: ["freeze"] }),
  E("juicer", "Juicer", "🍊", "drink", "both", tiers(30000, 1, 15), { methods: ["juice"] }),
  E("waffle_maker", "Waffle maker", "🧇", "bake", "home", tiers(20000, 1, 25), { methods: ["bake"] }),
  E("sandwich_press", "Sandwich press", "🥪", "heat", "both", tiers(18000, 1, 25), { methods: ["toast", "grill"] }),
  E("deep_fryer", "Deep fryer", "🍟", "heat", "both", tiers(45000, 2, 60), { methods: ["deepfry"], station: "cook" }),
  E("sous_vide", "Sous-vide machine", "🌡️", "heat", "both", tiers(120000, 2, 40, ["pro", "luxury"]), { methods: ["sousvide"], blurb: "Perfectly cooked meat, every time." }),
  E("home_oven", "Built-in oven", "🔲", "bake", "home", tiers(250000, 2, 80), { methods: ["bake", "roast"] }),
  E("kitchen_island", "Kitchen island", "🏝️", "fixture", "home", tiers(400000, 1, 0, ["pro", "luxury"]), { seats: 3, prep: ["chop", "mix", "knead"], blurb: "More space to prep, and somewhere for friends to sit." }),
  E("dining_table", "Dining table", "🍽️", "fixture", "home", tiers(80000, 1, 0), { seats: 4, blurb: "Seats guests for dinner. Better tables impress more." }),
  E("counters", "Better counters", "🪨", "fixture", "home", tiers(150000, 1, 0, ["pro", "luxury"]), { blurb: "Granite or marble: cleaner kitchen, better plating." }),

  // ── Restaurant kit ──
  E("com_stove", "Commercial stove", "🔥", "heat", "pro", tiers(450000, 4, 300), { methods: ["boil", "fry", "stew", "simmer", "saute", "braise", "steam"], station: "cook" }),
  E("com_oven", "Commercial oven", "🔲", "bake", "pro", tiers(700000, 4, 350), { methods: ["bake", "roast"], station: "bake" }),
  E("convection_oven", "Convection oven", "🔲", "bake", "pro", tiers(900000, 5, 300), { methods: ["bake", "roast"], station: "bake" }),
  E("pizza_oven", "Pizza oven", "🍕", "bake", "pro", tiers(1200000, 4, 350), { methods: ["bake"], station: "bake", for: ["restaurant", "food_truck", "fine_dining"] }),
  E("grill", "Charcoal grill", "♨️", "heat", "both", tiers(60000, 3, 150), { methods: ["grill", "roast", "smoke"], station: "cook" }),
  E("flat_top", "Flat-top griddle", "♨️", "heat", "pro", tiers(550000, 6, 250), { methods: ["fry", "grill", "toast", "saute"], station: "cook" }),
  E("com_fryer", "Commercial deep fryer", "🍟", "heat", "pro", tiers(400000, 6, 300), { methods: ["deepfry"], station: "cook" }),
  E("salamander", "Salamander grill", "♨️", "heat", "pro", tiers(600000, 3, 250), { methods: ["grill", "toast"], station: "cook" }),
  E("com_microwave", "Commercial microwave", "📟", "heat", "pro", tiers(250000, 3, 120), { methods: ["steam"], station: "plate" }),
  E("steam_oven", "Steam oven", "♨️", "heat", "pro", tiers(1400000, 4, 300), { methods: ["steam", "bake", "roast"], station: "cook" }),
  E("combi_oven", "Combi oven", "🔲", "heat", "pro", tiers(2500000, 6, 400, ["pro", "luxury"]), { methods: ["steam", "bake", "roast", "braise", "sousvide"], station: "cook", blurb: "Does almost everything, consistently." }),
  E("com_fridge", "Commercial refrigerator", "🧊", "storage", "pro", tiers(600000, 60, 150), { storage: "fridge", station: "cold" }),
  E("walkin_fridge", "Walk-in refrigerator", "🚪", "storage", "pro", tiers(2500000, 200, 400, ["pro", "luxury"]), { storage: "fridge", station: "cold" }),
  E("walkin_freezer", "Walk-in freezer", "❄️", "storage", "pro", tiers(3000000, 200, 450, ["pro", "luxury"]), { storage: "freezer", station: "cold" }),
  E("com_freezer", "Commercial freezer", "❄️", "storage", "pro", tiers(500000, 60, 150), { storage: "freezer", station: "cold" }),
  E("dry_store", "Dry storage racks", "🗄️", "storage", "pro", tiers(150000, 80, 0), { storage: "pantry", station: "cold" }),
  E("wine_store", "Wine storage", "🍷", "storage", "pro", tiers(800000, 40, 100, ["pro", "luxury"]), { storage: "fridge", station: "drink", for: ["fine_dining", "restaurant"] }),
  E("prep_table", "Steel prep table", "🔪", "prep", "pro", tiers(120000, 2, 0), { prep: ["chop", "mix", "knead", "marinate", "peel", "grate"], station: "prep" }),
  E("com_sink", "Commercial sink", "🚰", "clean", "pro", tiers(150000, 1, 20), { station: "wash", blurb: "Keeps the kitchen clean between services." }),
  E("dishwasher", "Dishwasher", "🫧", "clean", "both", tiers(400000, 2, 80), { station: "wash", blurb: "Clean plates fast: less work for staff, cleaner kitchen." }),
  E("com_processor", "Commercial food processor", "⚙️", "prep", "pro", tiers(350000, 4, 60), { methods: ["blend"], prep: ["chop", "grate", "mix", "pound"], station: "prep" }),
  E("com_blender", "Commercial blender", "🌀", "prep", "pro", tiers(200000, 3, 40), { methods: ["blend", "juice"], station: "drink" }),
  E("com_mixer", "Commercial stand mixer", "🥣", "bake", "pro", tiers(500000, 3, 60), { prep: ["mix", "knead"], station: "bake" }),
  E("meat_grinder", "Meat grinder", "🥩", "prep", "pro", tiers(200000, 2, 40), { prep: ["chop", "pound"], station: "prep" }),
  E("meat_slicer", "Meat slicer", "🔪", "prep", "pro", tiers(350000, 2, 30), { prep: ["chop"], station: "prep" }),
  E("dough_mixer", "Dough mixer", "🌀", "bake", "pro", tiers(650000, 4, 80), { prep: ["knead", "mix"], station: "bake" }),
  E("proofer", "Proofing cabinet", "🗄️", "bake", "pro", tiers(500000, 6, 60), { methods: ["ferment"], station: "bake", blurb: "Bread rises evenly every time." }),
  E("ice_machine", "Ice machine", "🧊", "drink", "pro", tiers(700000, 6, 120), { methods: ["freeze"], station: "drink" }),
  E("com_coffee", "Commercial coffee machine", "☕", "drink", "pro", tiers(600000, 4, 100), { methods: ["brew"], station: "drink" }),
  E("com_espresso", "Commercial espresso machine", "☕", "drink", "pro", tiers(1800000, 4, 150), { methods: ["espresso", "brew"], station: "drink" }),
  E("juice_machine", "Juice machine", "🍊", "drink", "pro", tiers(400000, 4, 60), { methods: ["juice"], station: "drink" }),
  E("bar_station", "Bar station", "🍸", "drink", "pro", tiers(900000, 4, 40), { methods: ["blend", "juice"], station: "drink", for: ["restaurant", "fine_dining", "bar"] }),
  E("display_fridge", "Display refrigerator", "🧊", "storage", "pro", tiers(450000, 30, 120), { storage: "fridge", station: "plate", blurb: "Shows off cakes and drinks: more impulse buys." }),
  E("food_warmer", "Food warmer", "🔆", "service", "pro", tiers(250000, 6, 80), { station: "plate", blurb: "Hot food waits without spoiling: faster service." }),
  E("heat_lamps", "Heat lamps", "💡", "service", "pro", tiers(120000, 4, 50), { station: "plate" }),
  E("pass", "Plating pass", "🍽️", "service", "pro", tiers(200000, 4, 0), { station: "plate", blurb: "Where plates are finished and checked." }),

  // ── Specialty ──
  E("tandoor", "Tandoor", "🏺", "heat", "pro", tiers(900000, 3, 250), { methods: ["roast", "bake", "grill"], station: "cook", for: ["restaurant", "fine_dining", "food_truck"] }),
  E("wok_station", "Wok station", "🥘", "heat", "pro", tiers(700000, 3, 300), { methods: ["fry", "saute", "steam", "deepfry"], station: "cook" }),
  E("sushi_counter", "Sushi counter", "🍣", "prep", "pro", tiers(1500000, 3, 60, ["pro", "luxury"]), { prep: ["chop"], methods: ["raw"], station: "prep", for: ["restaurant", "fine_dining"] }),
  E("pasta_machine", "Pasta machine", "🍝", "prep", "both", tiers(80000, 2, 20), { prep: ["knead"], station: "prep" }),
  E("donut_fryer", "Donut fryer", "🍩", "heat", "pro", tiers(450000, 4, 200), { methods: ["deepfry"], station: "bake", for: ["bakery", "cafe", "food_truck"] }),
  E("deck_oven", "Bakery deck oven", "🔲", "bake", "pro", tiers(1600000, 8, 400), { methods: ["bake"], station: "bake", for: ["bakery", "cafe", "fine_dining"] }),
  E("tempering", "Chocolate tempering machine", "🍫", "bake", "pro", tiers(900000, 2, 60, ["pro", "luxury"]), { prep: ["mix"], station: "bake", for: ["bakery", "fine_dining", "dessert"] }),
  E("smoker", "Smoker", "💨", "heat", "pro", tiers(500000, 4, 150), { methods: ["smoke", "roast"], station: "cook" }),
  E("bbq_pit", "Suya and BBQ pit", "🔥", "heat", "both", tiers(90000, 6, 120), { methods: ["grill", "smoke", "roast"], station: "cook", blurb: "Open-flame grilling: suya, asun, bole." }),
  E("rotisserie", "Rotisserie", "🍗", "heat", "pro", tiers(650000, 6, 200), { methods: ["roast"], station: "cook" }),
  E("crepe_maker", "Crepe machine", "🥞", "heat", "pro", tiers(250000, 2, 80), { methods: ["fry", "bake"], station: "bake", for: ["cafe", "dessert", "food_truck"] }),
  E("gelato", "Gelato machine", "🍨", "drink", "pro", tiers(1800000, 3, 150, ["pro", "luxury"]), { methods: ["freeze"], station: "drink", for: ["cafe", "dessert", "fine_dining"] }),
  E("com_griddle", "Commercial griddle", "♨️", "heat", "pro", tiers(400000, 5, 220), { methods: ["fry", "toast", "grill"], station: "cook" }),
  E("mortar_pro", "Electric yam pounder", "🪨", "prep", "both", tiers(70000, 2, 40), { prep: ["pound"], station: "prep", blurb: "Smooth pounded yam without the arm ache." }),
];

export const equipment = (id: string) => EQUIPMENT.find((e) => e.id === id);

export const TIER_LABEL: Record<EquipTier, string> = { basic: "Basic", pro: "Professional", luxury: "Luxury" };

export function stats(id: string, tier: EquipTier): EquipStats | undefined {
  return equipment(id)?.tiers[tier];
}
