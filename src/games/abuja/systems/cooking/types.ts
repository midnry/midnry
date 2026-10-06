// Shapes for cooking and food businesses. Content (ingredients, equipment,
// recipes, venue types) is data; the engine reads these shapes, so new
// cuisines and kit can be added without touching the code that cooks.

export type Cat = "protein" | "grain" | "veg" | "fruit" | "dairy" | "season" | "pantry" | "bakery" | "drink";
export type Storage = "pantry" | "fridge" | "freezer";
export type Tier = "cheap" | "standard" | "premium" | "homegrown";

/** Taste dimensions an ingredient adds and a dish aims for, each 0–10. */
export type Flavor = { spice: number; salt: number; sweet: number; sour: number; umami: number; fat: number };

export type IngredientDef = {
  id: string;
  name: string;
  icon: string;
  cat: Cat;
  /** Standard-tier price for one portion, in naira, before the market moves it. */
  price: number;
  /** Space one portion takes in storage. */
  space: number;
  /** Days it keeps in each kind of storage. Missing means it can't really go there. */
  keeps: Partial<Record<Storage, number>>;
  /** Where it's best kept. */
  store: Storage;
  origin: "local" | "imported";
  /** Months (1–12) when it's in season and cheaper; empty means all year. */
  season?: number[];
  flavor?: Partial<Flavor>;
  /** 0–10: how good it is for you. */
  nutrition: number;
  tags?: FoodTag[];
  /** Things people can be allergic to. */
  allergen?: "nuts" | "shellfish" | "dairy" | "gluten" | "egg" | "fish";
  /** Can be grown in a home garden. */
  grow?: { days: number; yield: number };
};

export type Method =
  | "boil" | "fry" | "deepfry" | "grill" | "roast" | "bake" | "steam" | "smoke" | "braise" | "stew" | "saute" | "simmer"
  | "pressure" | "slow" | "sousvide" | "ferment" | "blend" | "toast" | "brew" | "espresso" | "juice" | "freeze" | "raw";

export type Prep = "chop" | "mix" | "knead" | "marinate" | "peel" | "grate" | "pound";

export type FoodTag =
  | "spicy" | "sweet" | "healthy" | "fast" | "vegetarian" | "seafood" | "meat" | "dessert" | "luxury" | "cheap"
  | "local" | "foreign" | "comfort" | "breakfast" | "drink" | "baked" | "street";

export type Cuisine =
  | "Nigerian" | "West African" | "American" | "British" | "Italian" | "French" | "Japanese" | "Korean" | "Chinese"
  | "Indian" | "Mexican" | "Mediterranean" | "Middle Eastern" | "Fusion";

export type EquipKind = "heat" | "prep" | "storage" | "drink" | "bake" | "service" | "fixture" | "clean";

export type EquipTier = "basic" | "pro" | "luxury";

export type EquipStats = {
  price: number;
  /** 0–100: how fast it works. */
  speed: number;
  /** 0–100: how rarely it breaks. */
  reliability: number;
  /** Dishes at once (or storage space for storage). */
  capacity: number;
  /** 0–100: how much it lifts food quality. */
  quality: number;
  /** Naira of gas or electricity per use. */
  energy: number;
};

export type EquipmentDef = {
  id: string;
  name: string;
  icon: string;
  kind: EquipKind;
  /** Where it belongs: a home kitchen, a commercial one, or both. */
  scope: "home" | "pro" | "both";
  /** Cooking methods and prep it makes possible. */
  methods?: Method[];
  prep?: Prep[];
  /** Storage it adds. */
  storage?: Storage;
  /** A station in a commercial kitchen layout. */
  station?: "cold" | "prep" | "cook" | "plate" | "wash" | "drink" | "bake";
  /** Seats it adds for guests (dining tables). */
  seats?: number;
  tiers: Partial<Record<EquipTier, EquipStats>>;
  /** Only for these venue types (specialty kit). */
  for?: string[];
  blurb?: string;
};

export type Step =
  | { kind: "prep"; action: Prep; label: string }
  | { kind: "cook"; method: Method; temp: number; minutes: number; label: string }
  | { kind: "season"; label: string }
  | { kind: "plate"; label: string };

export type RecipeDef = {
  id: string;
  name: string;
  icon: string;
  cuisine: Cuisine;
  course: "main" | "side" | "breakfast" | "snack" | "soup" | "dessert" | "baked" | "drink";
  /** Ingredient ids, or "any:<category>" for any ingredient of that category. */
  needs: { id: string; qty: number }[];
  /** Nice to add; improve the dish if present. */
  extras?: string[];
  steps: Step[];
  /** The seasoning a good cook aims for. */
  target: Pick<Flavor, "spice" | "salt" | "sweet" | "sour">;
  /** 1 (anyone) to 5 (professional). */
  difficulty: number;
  /** Portions it makes. */
  serves: number;
  /** Typical price per portion when sold. */
  value: number;
  /** 0–100. */
  nutrition: number;
  tags: FoodTag[];
  /** What eating it does to you, per portion. */
  eat: { food?: number; water?: number; energy?: number; stress?: number; health?: number };
  /** How you can come to know it. */
  source: "basic" | "book" | "npc" | "experiment" | "secret" | "class";
  /** For source "npc" or "book": who or which book teaches it. */
  from?: string;
  blurb?: string;
};

/** A batch of one ingredient in storage. */
export type Lot = {
  id: string;
  ing: string;
  tier: Tier;
  qty: number;
  quality: number;
  bought: number;
  expires: number;
  storage: Storage;
};

/** A piece of kit you own. */
export type Owned = {
  uid: string;
  def: string;
  tier: EquipTier;
  /** 0–100: wear; low condition breaks more. */
  condition: number;
  /** 0–100. */
  clean: number;
  broken: boolean;
  /** Grid cell in a commercial kitchen layout. */
  cell?: number;
};

export type Scores = { taste: number; texture: number; presentation: number; freshness: number; nutrition: number; overall: number };

/** A cooked dish, eaten now or kept as leftovers. */
export type Dish = {
  id: string;
  recipe: string;
  name: string;
  icon: string;
  portions: number;
  scores: Scores;
  made: number;
  expires: number;
  /** The seasoning it was made with, for people's preferences. */
  flavor: Pick<Flavor, "spice" | "salt" | "sweet" | "sour">;
  tags: FoodTag[];
  signature?: string;
};

export type RecipeLevel = "known" | "learned" | "improved" | "mastered";

export type Knowledge = { level: RecipeLevel; cooked: number; best: number; total: number };

/** Your own version of a recipe. */
export type Custom = { id: string; base: string; name: string; flavor: Pick<Flavor, "spice" | "salt" | "sweet" | "sour">; signature: boolean; sold: number; fame: number };

export type SkillId = "cooking" | "baking" | "knife" | "seasoning" | "grilling" | "presentation" | "creation" | "management" | "nutrition" | "safety";

export type Plot = { crop: string | null; planted: number; watered: number; growth: number };

export type MarketEvent = { id: string; text: string; until: number; mult: Record<string, number> };

/** Results of the hands-on steps, 0–100 each, or null for quick mode. */
export type Performance = { prep: number[]; cook: number[]; season: Pick<Flavor, "spice" | "salt" | "sweet" | "sour">; plate: number; quick: boolean };

export type StaffRole = "head_chef" | "sous_chef" | "line_cook" | "prep_cook" | "baker" | "pastry_chef" | "dishwasher" | "barista" | "server" | "manager" | "driver";

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  skill: number;
  speed: number;
  accuracy: number;
  clean: number;
  stress: number;
  creativity: number;
  reliability: number;
  exp: number;
  salary: number;
};

export type MenuItem = { recipe: string; custom?: string; price: number; tier: Tier; active: boolean; sold: number; avg: number };

export type Review = { day: number; stars: number; text: string; who: string };

export type Venue = {
  id: string;
  type: string;
  name: string;
  district: string;
  opened: number;
  equipment: Owned[];
  menu: MenuItem[];
  staff: Staff[];
  stock: Lot[];
  clean: number;
  /** 0–100. */
  rating: number;
  /** Counts that decide what the place is known for. */
  known: Record<string, number>;
  reviews: Review[];
  delivery: boolean;
  /** Portion size multiplier, 0.8–1.4. */
  portion: number;
  /** Auto-restock from the supplier before services. */
  autoStock: boolean;
  services: number;
  /** The last few services, for the finances view. */
  ledger: { day: number; label: string; revenue: number; cost: number; customers: number; walkouts: number; waste: number }[];
  week: { revenue: number; cost: number };
  closedUntil: number;
  /** Health inspection history. */
  inspections: { day: number; passed: boolean; note: string }[];
};

export type Catering = {
  id: string;
  title: string;
  guests: number;
  /** Portions of each course needed. */
  needs: { course: "main" | "drink" | "dessert"; qty: number }[];
  pay: number;
  deadline: number;
  accepted: boolean;
  /** Portions ready so far, by course, and their average quality. */
  ready: Record<string, number>;
  quality: number;
};

export type Kitchen = {
  version: 1;
  equipment: Owned[];
  pantry: Lot[];
  leftovers: Dish[];
  clean: number;
  skills: Record<SkillId, number>;
  recipes: Record<string, Knowledge>;
  customs: Custom[];
  favorites: string[];
  garden: Plot[];
  waste: { day: number; what: string; value: number }[];
  market: MarketEvent[];
  /** Gas and electricity used cooking at home this week. */
  utilities: number;
  venues: Venue[];
  catering: Catering[];
  /** Festivals and competitions coming up. */
  events: { id: string; kind: "festival" | "competition"; title: string; day: number; theme?: string; prize: number; done: boolean }[];
  /** People who've eaten your food: their verdicts. */
  fans: Record<string, { meals: number; best: number; last: number }>;
};
