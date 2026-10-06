import type { Cat, Flavor, FoodTag, IngredientDef, Storage } from "./types";

// Every ingredient in the game. Prices are a standard-quality portion in
// Abuja markets; the economy, the season, tiers and events move them.
// `keeps` is days it stays good: pantry (cupboard or counter), fridge, freezer.

type Extra = Partial<Pick<IngredientDef, "season" | "tags" | "allergen" | "grow">>;

function I(
  id: string,
  name: string,
  icon: string,
  cat: Cat,
  price: number,
  keeps: Partial<Record<Storage, number>>,
  store: Storage,
  flavor: Partial<Flavor>,
  nutrition: number,
  origin: "local" | "imported" = "local",
  extra: Extra = {},
  space = 1,
): IngredientDef {
  return { id, name, icon, cat, price, keeps, store, flavor, nutrition, origin, space, ...extra };
}

const MEAT = { pantry: 1, fridge: 3, freezer: 60 };
const FISH = { pantry: 1, fridge: 2, freezer: 45 };
const LEAFY = { pantry: 2, fridge: 6 };
const VEG = { pantry: 5, fridge: 12 };
const FRUIT = { pantry: 5, fridge: 10, freezer: 60 };
const DAIRY = { pantry: 1, fridge: 8, freezer: 40 };
const DRY = { pantry: 180 };
const JAR = { pantry: 120, fridge: 240 };
const meat: FoodTag[] = ["meat"];
const sea: FoodTag[] = ["seafood"];

export const INGREDIENTS: IngredientDef[] = [
  // Proteins
  I("chicken", "Chicken", "🍗", "protein", 1200, MEAT, "fridge", { umami: 5, fat: 3 }, 8, "local", { tags: meat }),
  I("beef", "Beef", "🥩", "protein", 1100, MEAT, "fridge", { umami: 7, fat: 4 }, 7, "local", { tags: meat }),
  I("goat", "Goat meat", "🐐", "protein", 1400, MEAT, "fridge", { umami: 7, fat: 4 }, 7, "local", { tags: meat }),
  I("pork", "Pork", "🐖", "protein", 1000, MEAT, "fridge", { umami: 6, fat: 6 }, 6, "local", { tags: meat }),
  I("turkey", "Turkey", "🦃", "protein", 1800, MEAT, "fridge", { umami: 5, fat: 3 }, 8, "imported", { tags: meat, season: [11, 12] }),
  I("fish", "Fresh fish (tilapia)", "🐟", "protein", 900, FISH, "fridge", { umami: 5, fat: 2 }, 9, "local", { tags: sea, allergen: "fish" }),
  I("catfish", "Catfish", "🐟", "protein", 1300, FISH, "fridge", { umami: 6, fat: 3 }, 8, "local", { tags: sea, allergen: "fish" }),
  I("dried_fish", "Dried fish", "🐠", "protein", 700, { pantry: 60 }, "pantry", { umami: 8, salt: 4 }, 7, "local", { tags: sea, allergen: "fish" }),
  I("prawns", "Prawns", "🦐", "protein", 2500, FISH, "freezer", { umami: 6, sweet: 1 }, 8, "local", { tags: sea, allergen: "shellfish" }),
  I("crayfish", "Ground crayfish", "🦐", "season", 300, { pantry: 90 }, "pantry", { umami: 8, salt: 2 }, 6, "local", { allergen: "shellfish" }),
  I("eggs", "Eggs", "🥚", "protein", 150, { pantry: 10, fridge: 25 }, "fridge", { umami: 3, fat: 3 }, 8, "local", { allergen: "egg" }),
  I("beans", "Beans", "🫘", "protein", 250, DRY, "pantry", { umami: 2 }, 9, "local", { tags: ["vegetarian"] }),
  I("tofu", "Tofu", "🧈", "protein", 900, { fridge: 7 }, "fridge", { umami: 2 }, 8, "imported", { tags: ["vegetarian"] }),
  I("suya_beef", "Suya-cut beef", "🥩", "protein", 1300, MEAT, "fridge", { umami: 7, fat: 3 }, 7, "local", { tags: meat }),
  I("ponmo", "Ponmo (cow skin)", "🟫", "protein", 400, { pantry: 2, fridge: 5 }, "fridge", { umami: 2 }, 3, "local", { tags: meat }),
  I("snail", "Snail", "🐌", "protein", 2200, { fridge: 2, freezer: 30 }, "fridge", { umami: 6 }, 8, "local", { tags: ["luxury"] }),

  // Grains & starches
  I("rice", "Rice", "🍚", "grain", 250, DRY, "pantry", { umami: 1 }, 5),
  I("basmati", "Basmati rice", "🍚", "grain", 500, DRY, "pantry", { umami: 1 }, 5, "imported"),
  I("pasta", "Pasta", "🍝", "grain", 350, DRY, "pantry", {}, 5, "imported", { allergen: "gluten" }),
  I("noodles", "Noodles", "🍜", "grain", 200, DRY, "pantry", { salt: 3 }, 3, "local", { allergen: "gluten" }),
  I("potato", "Potatoes", "🥔", "grain", 300, { pantry: 25, fridge: 30 }, "pantry", {}, 6),
  I("sweet_potato", "Sweet potato", "🍠", "grain", 300, { pantry: 20 }, "pantry", { sweet: 3 }, 7),
  I("yam", "Yam", "🍠", "grain", 600, { pantry: 30 }, "pantry", { sweet: 1 }, 6, "local", { season: [8, 9, 10, 11] }),
  I("plantain", "Plantain", "🍌", "grain", 300, { pantry: 7, fridge: 10 }, "pantry", { sweet: 4 }, 6),
  I("cassava_flour", "Garri", "🥣", "grain", 150, DRY, "pantry", { sour: 2 }, 3),
  I("semovita", "Semovita", "🥣", "grain", 250, DRY, "pantry", {}, 4, "local", { allergen: "gluten" }),
  I("pounded_yam", "Pounded yam flour", "🥣", "grain", 400, DRY, "pantry", {}, 4),
  I("flour", "Flour", "🌾", "bakery", 200, DRY, "pantry", {}, 3, "imported", { allergen: "gluten" }),
  I("bread", "Bread", "🍞", "grain", 300, { pantry: 4, fridge: 7, freezer: 30 }, "pantry", { sweet: 1 }, 4, "local", { allergen: "gluten" }),
  I("couscous", "Couscous", "🥣", "grain", 400, DRY, "pantry", {}, 5, "imported", { allergen: "gluten" }),
  I("oats", "Oats", "🥣", "grain", 350, DRY, "pantry", { sweet: 1 }, 8, "imported"),
  I("corn", "Fresh corn", "🌽", "grain", 200, { pantry: 3, fridge: 6 }, "pantry", { sweet: 3 }, 6, "local", { season: [6, 7, 8, 9] }),
  I("tortilla", "Tortilla wraps", "🫓", "grain", 500, { pantry: 10, fridge: 20 }, "pantry", {}, 4, "imported", { allergen: "gluten" }),

  // Vegetables
  I("tomato", "Tomatoes", "🍅", "veg", 250, VEG, "pantry", { sour: 4, sweet: 2, umami: 2 }, 7, "local", { grow: { days: 10, yield: 6 } }),
  I("onion", "Onions", "🧅", "veg", 150, { pantry: 25, fridge: 30 }, "pantry", { sweet: 2, umami: 1 }, 5, "local", { grow: { days: 12, yield: 5 } }),
  I("pepper", "Tatashe (bell pepper)", "🫑", "veg", 200, VEG, "pantry", { sweet: 2 }, 7, "local", { grow: { days: 9, yield: 5 } }),
  I("scotch_bonnet", "Ata rodo (scotch bonnet)", "🌶️", "veg", 150, VEG, "pantry", { spice: 9 }, 5, "local", { tags: ["spicy"], grow: { days: 8, yield: 8 } }),
  I("carrot", "Carrots", "🥕", "veg", 200, { pantry: 8, fridge: 25 }, "fridge", { sweet: 3 }, 8),
  I("cabbage", "Cabbage", "🥬", "veg", 300, { pantry: 6, fridge: 20 }, "fridge", {}, 7),
  I("spinach", "Spinach (efo)", "🥬", "veg", 200, LEAFY, "fridge", {}, 10, "local", { grow: { days: 6, yield: 5 } }),
  I("ugu", "Ugu (pumpkin leaf)", "🍃", "veg", 200, LEAFY, "fridge", {}, 10, "local", { grow: { days: 7, yield: 5 } }),
  I("bitterleaf", "Bitterleaf", "🍃", "veg", 200, LEAFY, "fridge", { sour: 2 }, 9, "local", { grow: { days: 9, yield: 4 } }),
  I("okra", "Okra", "🥒", "veg", 200, { pantry: 3, fridge: 7 }, "fridge", {}, 8, "local", { grow: { days: 8, yield: 6 } }),
  I("lettuce", "Lettuce", "🥬", "veg", 400, { pantry: 1, fridge: 6 }, "fridge", {}, 7, "local", { grow: { days: 7, yield: 3 } }),
  I("cucumber", "Cucumber", "🥒", "veg", 200, { pantry: 4, fridge: 10 }, "fridge", {}, 6),
  I("garlic", "Garlic", "🧄", "veg", 150, { pantry: 40 }, "pantry", { umami: 2, spice: 1 }, 6, "imported"),
  I("ginger", "Ginger", "🫚", "veg", 150, { pantry: 20, fridge: 30 }, "pantry", { spice: 3 }, 6, "local", { grow: { days: 14, yield: 4 } }),
  I("mushroom", "Mushrooms", "🍄", "veg", 700, { pantry: 1, fridge: 6 }, "fridge", { umami: 5 }, 7, "imported"),
  I("green_beans", "Green beans", "🫛", "veg", 300, { pantry: 3, fridge: 8 }, "fridge", {}, 8),
  I("egusi", "Egusi (melon seed)", "🟡", "veg", 500, DRY, "pantry", { fat: 4, umami: 2 }, 7, "local", { allergen: "nuts" }),
  I("ogbono", "Ogbono", "🟤", "veg", 600, DRY, "pantry", { umami: 2 }, 6),
  I("scent_leaf", "Scent leaf", "🌿", "season", 100, LEAFY, "fridge", { spice: 1 }, 6, "local", { grow: { days: 6, yield: 6 } }),
  I("basil", "Basil", "🌿", "season", 300, LEAFY, "fridge", {}, 5, "imported", { grow: { days: 7, yield: 5 } }),

  // Fruits
  I("apple", "Apples", "🍎", "fruit", 400, FRUIT, "fridge", { sweet: 6, sour: 2 }, 7, "imported"),
  I("orange", "Oranges", "🍊", "fruit", 100, FRUIT, "pantry", { sweet: 5, sour: 4 }, 8, "local", { season: [11, 12, 1, 2] }),
  I("banana", "Bananas", "🍌", "fruit", 100, { pantry: 5, freezer: 60 }, "pantry", { sweet: 7 }, 7),
  I("mango", "Mangoes", "🥭", "fruit", 200, FRUIT, "pantry", { sweet: 8, sour: 1 }, 8, "local", { season: [3, 4, 5, 6] }),
  I("pineapple", "Pineapple", "🍍", "fruit", 600, FRUIT, "pantry", { sweet: 6, sour: 4 }, 8),
  I("watermelon", "Watermelon", "🍉", "fruit", 800, { pantry: 7, fridge: 10 }, "pantry", { sweet: 6 }, 6, "local", { season: [1, 2, 3, 4] }, 3),
  I("strawberry", "Strawberries", "🍓", "fruit", 1500, { pantry: 1, fridge: 5, freezer: 90 }, "fridge", { sweet: 6, sour: 3 }, 8, "imported", { tags: ["luxury"] }),
  I("lemon", "Lemons", "🍋", "fruit", 200, FRUIT, "fridge", { sour: 9 }, 6, "imported"),
  I("lime", "Limes", "🍋‍🟩", "fruit", 100, FRUIT, "fridge", { sour: 9 }, 6),
  I("coconut", "Coconut", "🥥", "fruit", 400, { pantry: 20 }, "pantry", { sweet: 3, fat: 5 }, 6),
  I("avocado", "Avocado", "🥑", "fruit", 400, { pantry: 4, fridge: 7 }, "pantry", { fat: 6 }, 9),

  // Dairy
  I("milk", "Milk", "🥛", "dairy", 400, DAIRY, "fridge", { sweet: 2, fat: 3 }, 7, "local", { allergen: "dairy" }),
  I("powdered_milk", "Powdered milk", "🥛", "dairy", 300, DRY, "pantry", { sweet: 2, fat: 3 }, 6, "imported", { allergen: "dairy" }),
  I("butter", "Butter", "🧈", "dairy", 600, { pantry: 3, fridge: 30, freezer: 120 }, "fridge", { fat: 9, salt: 1 }, 2, "imported", { allergen: "dairy" }),
  I("cheese", "Cheese", "🧀", "dairy", 1200, { fridge: 20, freezer: 90 }, "fridge", { fat: 6, salt: 4, umami: 4 }, 5, "imported", { allergen: "dairy" }),
  I("cream", "Cream", "🥛", "dairy", 900, { fridge: 7 }, "fridge", { fat: 8, sweet: 1 }, 3, "imported", { allergen: "dairy" }),
  I("yogurt", "Yogurt", "🥛", "dairy", 500, { fridge: 10 }, "fridge", { sour: 4, sweet: 2 }, 8, "local", { allergen: "dairy" }),

  // Seasonings
  I("salt", "Salt", "🧂", "season", 50, { pantry: 999 }, "pantry", { salt: 10 }, 0),
  I("sugar", "Sugar", "🍬", "season", 100, { pantry: 999 }, "pantry", { sweet: 10 }, 0),
  I("black_pepper", "Black pepper", "⚫", "season", 150, { pantry: 365 }, "pantry", { spice: 4 }, 1, "imported"),
  I("chili", "Dried chili", "🌶️", "season", 100, { pantry: 180 }, "pantry", { spice: 8 }, 1),
  I("curry", "Curry powder", "🟨", "season", 100, { pantry: 365 }, "pantry", { spice: 3, umami: 1 }, 1, "imported"),
  I("thyme", "Thyme", "🌿", "season", 100, { pantry: 365 }, "pantry", {}, 1, "imported"),
  I("paprika", "Paprika", "🟥", "season", 200, { pantry: 365 }, "pantry", { spice: 2, sweet: 1 }, 1, "imported"),
  I("herbs", "Mixed herbs", "🌿", "season", 200, { pantry: 365 }, "pantry", {}, 1, "imported"),
  I("stock", "Stock cubes", "🟫", "season", 50, { pantry: 365 }, "pantry", { salt: 8, umami: 8 }, 0),
  I("suya_spice", "Yaji (suya spice)", "🟠", "season", 300, { pantry: 120 }, "pantry", { spice: 7, umami: 3 }, 2, "local", { allergen: "nuts" }),
  I("pepper_soup_spice", "Pepper soup spice", "🟤", "season", 200, { pantry: 180 }, "pantry", { spice: 6 }, 2),
  I("locust_beans", "Iru (locust beans)", "🟤", "season", 200, { pantry: 30, fridge: 60 }, "pantry", { umami: 9, salt: 2 }, 4),
  I("cinnamon", "Cinnamon", "🟫", "season", 300, { pantry: 365 }, "pantry", { sweet: 3 }, 1, "imported"),
  I("vanilla", "Vanilla", "🍦", "season", 500, { pantry: 365 }, "pantry", { sweet: 4 }, 0, "imported"),

  // Cooking ingredients
  I("veg_oil", "Vegetable oil", "🫗", "pantry", 250, JAR, "pantry", { fat: 8 }, 1),
  I("olive_oil", "Olive oil", "🫒", "pantry", 900, JAR, "pantry", { fat: 8 }, 3, "imported"),
  I("palm_oil", "Palm oil", "🟧", "pantry", 300, JAR, "pantry", { fat: 8, umami: 1 }, 3),
  I("coconut_milk", "Coconut milk", "🥥", "pantry", 700, { pantry: 180, fridge: 4 }, "pantry", { sweet: 3, fat: 6 }, 4, "imported"),
  I("soy_sauce", "Soy sauce", "🍶", "pantry", 500, JAR, "pantry", { salt: 9, umami: 7 }, 1, "imported"),
  I("vinegar", "Vinegar", "🍶", "pantry", 300, { pantry: 999 }, "pantry", { sour: 9 }, 0, "imported"),
  I("honey", "Honey", "🍯", "pantry", 800, { pantry: 999 }, "pantry", { sweet: 9 }, 3),
  I("tomato_paste", "Tomato paste", "🥫", "pantry", 200, { pantry: 365, fridge: 7 }, "pantry", { sour: 3, sweet: 2, umami: 3 }, 4),
  I("baking_powder", "Baking powder", "🧪", "bakery", 150, { pantry: 365 }, "pantry", {}, 0, "imported"),
  I("yeast", "Yeast", "🧫", "bakery", 200, { pantry: 120, fridge: 180 }, "pantry", {}, 1, "imported"),
  I("chocolate", "Chocolate", "🍫", "bakery", 900, { pantry: 120 }, "pantry", { sweet: 8, fat: 5 }, 2, "imported", { tags: ["dessert"], allergen: "dairy" }),
  I("cocoa", "Cocoa powder", "🟫", "bakery", 600, { pantry: 365 }, "pantry", { sweet: 1 }, 3),
  I("groundnut", "Groundnuts", "🥜", "pantry", 200, { pantry: 90 }, "pantry", { fat: 5, umami: 2 }, 7, "local", { allergen: "nuts" }),
  I("mayonnaise", "Mayonnaise", "🫙", "pantry", 600, { pantry: 30, fridge: 60 }, "fridge", { fat: 8, sour: 2 }, 1, "imported", { allergen: "egg" }),

  // Drinks
  I("coffee", "Coffee beans", "☕", "drink", 900, { pantry: 120 }, "pantry", { sour: 2 }, 1, "imported"),
  I("tea", "Tea leaves", "🍵", "drink", 200, { pantry: 365 }, "pantry", {}, 2, "imported"),
  I("zobo_leaf", "Zobo leaves (hibiscus)", "🌺", "drink", 200, { pantry: 180 }, "pantry", { sour: 6 }, 5),
  I("kunu_millet", "Millet (for kunu)", "🌾", "drink", 200, DRY, "pantry", { sweet: 1 }, 5),
  I("soda", "Soft drinks", "🥤", "drink", 300, { pantry: 180 }, "pantry", { sweet: 8 }, 0),
  I("ice", "Ice", "🧊", "drink", 100, { freezer: 365, pantry: 0.3 }, "freezer", {}, 0),
];

export const ingredient = (id: string) => INGREDIENTS.find((i) => i.id === id);

export const CAT_LABEL: Record<Cat, string> = {
  protein: "Proteins",
  grain: "Grains & starches",
  veg: "Vegetables",
  fruit: "Fruits",
  dairy: "Dairy",
  season: "Seasonings",
  pantry: "Oils & pantry",
  bakery: "Baking",
  drink: "Drinks",
};

/** How a quality tier changes price and the quality you get. */
export const TIERS = {
  cheap: { label: "Cheap", price: 0.7, quality: [45, 62] as const },
  standard: { label: "Standard", price: 1, quality: [68, 80] as const },
  premium: { label: "Premium", price: 1.6, quality: [88, 97] as const },
  homegrown: { label: "Home-grown", price: 0, quality: [84, 95] as const },
};
