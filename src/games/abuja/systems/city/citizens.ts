import { randomLook, stageOf, type LifeStage, type Look } from "../character";
import { building } from "./catalog";
import { cityLots, type Lot } from "./layout";

// The people of the city. Nobody here is hand-written: households are
// generated from the homes on the map, adults get jobs at the buildings that
// employ people, children get the nearest school, and everyone follows a day
// that depends on their age, job and the day of the week. The same seed
// always gives the same city, so a person you meet tomorrow is still there.
//
// The data is small (a few numbers per person); looks and routes are worked
// out only for people near the camera, so the city can hold thousands.

export type Gender = "male" | "female";
export type Trait = "busy" | "social" | "homebody" | "outdoorsy" | "devout";

export type Activity = "home" | "work" | "school" | "shopping" | "eating" | "park" | "worship" | "visiting" | "clinic" | "errand";

export type Citizen = {
  id: string;
  name: string;
  /** Age at the start of the game; `ageOn` moves it forward. */
  age: number;
  gender: Gender;
  /** Seed for the look: the same person always looks the same. */
  seed: number;
  trait: Trait;
  occupation: string;
  household: string;
  /** Home lot, or `out:<town>` for people who commute in from the satellite towns. */
  home: string;
  /** Workplace or school (lot ids). */
  work?: string;
  school?: string;
};

/** Days in a year of city time: people grow up as the game goes on. */
const DAYS_PER_YEAR = 120;

export const ageOn = (c: Citizen, day: number) => c.age + Math.floor(day / DAYS_PER_YEAR);
export const stageOn = (c: Citizen, day: number): LifeStage => stageOf(ageOn(c, day));

const MALE = ["Chidi", "Emeka", "Musa", "Tunde", "Ifeanyi", "Yusuf", "Uche", "Segun", "Obinna", "Femi", "Ahmed", "Kunle", "Dayo", "Ibrahim", "Tobi", "Sani", "Kelechi", "Bayo", "Aliyu", "Nnamdi"];
const FEMALE = ["Aisha", "Ngozi", "Funmi", "Zainab", "Blessing", "Kemi", "Hauwa", "Amina", "Halima", "Grace", "Chioma", "Adaeze", "Fatima", "Ruth", "Bisi", "Hadiza", "Ifeoma", "Yetunde", "Maryam", "Esther"];
const SURNAMES = ["Okeke", "Bello", "Adeyemi", "Ibrahim", "Eze", "Lawal", "Okafor", "Danjuma", "Nwosu", "Abubakar", "Ogunleye", "Musa", "Uche", "Yakubu", "Olawale", "Garba", "Onyeka", "Adamu", "Ojo", "Suleiman"];

/** What people who work at each kind of building do. */
const JOBS: Record<string, string[]> = {
  shop: ["shop assistant", "shop owner"],
  restaurant: ["cook", "waiter", "restaurant owner"],
  cafe: ["barista"],
  office: ["accountant", "office worker", "lawyer", "IT support", "secretary"],
  supermarket: ["cashier", "shelf stacker", "store manager"],
  mall: ["sales assistant", "security guard", "cleaner"],
  business_tower: ["banker", "engineer", "manager", "consultant"],
  cinema: ["projectionist", "ticket seller"],
  hotel: ["receptionist", "chef", "housekeeper"],
  factory: ["machine operator", "factory supervisor"],
  warehouse: ["forklift driver", "storekeeper"],
  processing_plant: ["plant technician"],
  construction_yard: ["bricklayer", "site engineer", "labourer"],
  logistics: ["truck driver", "dispatcher", "delivery rider"],
  school: ["teacher", "head teacher"],
  clinic: ["nurse", "doctor"],
  hospital_bld: ["doctor", "nurse", "paramedic", "lab scientist"],
  police: ["police officer"],
  fire_station: ["firefighter"],
  government: ["civil servant", "permanent secretary", "clerk"],
  library: ["librarian"],
  community: ["community organiser"],
  power_plant: ["power engineer"],
  water_tower: ["water engineer"],
  waste_depot: ["sanitation worker"],
  substation: ["electrician"],
  solar_farm: ["solar technician"],
  stadium: ["groundskeeper"],
  museum: ["curator", "tour guide"],
  skyscraper: ["executive", "trader", "analyst"],
  farm: ["farmer"],
};

/** Senior roles go to people with some years behind them. */
const SENIOR = /head|manager|owner|permanent|executive|supervisor|chef|doctor|engineer|curator|lawyer/;
function jobFor(r: () => number, def: string, age: number) {
  const list = JOBS[def] ?? ["worker"];
  const job = pick(r, list);
  return SENIOR.test(job) && age < 30 ? (list.find((j) => !SENIOR.test(j)) ?? job) : job;
}

export function rng(seed: number) {
  let s = (Math.abs(seed) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
export const pick = <T>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)]!;
const centre = (l: Lot) => ({ x: l.x + l.w / 2, y: l.y + l.h / 2 });
const dist = (a: Lot, b: Lot) => Math.hypot(centre(a).x - centre(b).x, centre(a).y - centre(b).y);

/** Satellite towns people commute in from, by bus and train. */
export const TOWNS = ["Kubwa", "Nyanya", "Lugbe", "Karu", "Mararaba", "Gwagwalada", "Dutse", "Bwari"];
/** The share of each workplace's jobs filled by commuters (the city on the map is only the middle of Abuja). */
const COMMUTERS = 0.1;

export const isOut = (lot: string) => lot.startsWith("out:");

let cache: Citizen[] | null = null;
let byId: Map<string, Lot> | null = null;
const lotById = (id: string) => {
  byId ??= new Map(cityLots().map((l) => [l.id, l]));
  return byId.get(id);
};
/** The nearest few lots of some kinds to a lot, worked out once. */
const nearCache = new Map<string, string[]>();
function nearest(from: string, kinds: string[], k: number): string[] {
  const key = `${from}|${kinds.join(",")}|${k}`;
  let hit = nearCache.get(key);
  if (!hit) {
    const h = lotById(from);
    const options = h ? cityLots().filter((l) => kinds.includes(l.def)) : [];
    if (h) options.sort((a, b) => dist(a, h) - dist(b, h));
    hit = options.slice(0, k).map((l) => l.id);
    nearCache.set(key, hit);
  }
  return hit;
}

/** Everyone in the city, generated once from the map. */
export function citizens(): Citizen[] {
  if (cache) return cache;
  const lots = cityLots();
  const homes = lots.filter((l) => building(l.def)?.category === "residential");
  const workplaces = lots.filter((l) => (building(l.def)?.jobs ?? 0) > 0);
  const schools = lots.filter((l) => l.def === "school");
  const filled = new Map<string, number>();
  const out: Citizen[] = [];
  const jobsAt = new Map(workplaces.map((w) => [w.id, building(w.def)!.jobs ?? 0]));
  for (const home of homes) {
    const def = building(home.def)!;
    const r = rng(home.seed * 7 + 13);
    // Worked out once per home: workplaces by distance, and the nearest school.
    let byDistance: Lot[] | null = null;
    const nearestSchool = schools.length ? schools.reduce((a, b) => (dist(b, home) < dist(a, home) ? b : a)) : undefined;
    const people = Math.max(2, Math.round((def.residents ?? 3) * home.floors));
    let n = 0;
    let h = 0;
    while (n < people) {
      const household = `${home.id}-h${h++}`;
      const surname = pick(r, SURNAMES);
      // A household: one or two grown-ups, maybe kids, maybe a grandparent.
      const size = 1 + Math.floor(r() * 4);
      const members: { age: number; gender: Gender }[] = [];
      const parentAge = 24 + Math.floor(r() * 26);
      members.push({ age: parentAge, gender: r() < 0.5 ? "male" : "female" });
      if (size > 1 && r() < 0.75) members.push({ age: parentAge + Math.floor(r() * 7) - 3, gender: members[0]!.gender === "male" ? "female" : "male" });
      while (members.length < size) members.push({ age: r() < 0.15 ? 62 + Math.floor(r() * 18) : 4 + Math.floor(r() * 14), gender: r() < 0.5 ? "male" : "female" });
      for (const m of members) {
        if (n >= people) break;
        const seed = Math.floor(r() * 1e9);
        const first = pick(r, m.gender === "male" ? MALE : FEMALE);
        const c: Citizen = {
          id: `${household}-${n}`,
          name: `${first} ${surname}`,
          age: m.age,
          gender: m.gender,
          seed,
          trait: pick(r, ["busy", "social", "homebody", "outdoorsy", "devout"] as const),
          occupation: "",
          household,
          home: home.id,
        };
        const stage = stageOf(m.age);
        if (stage === "child" || stage === "teen") {
          const school = nearestSchool;
          c.school = school?.id;
          c.occupation = stage === "child" ? "pupil" : "secondary school student";
        } else if (stage === "senior") {
          c.occupation = "retired";
        } else if (r() < 0.85) {
          // A job somewhere with room, nearer is likelier.
          byDistance ??= [...workplaces].sort((a, b) => dist(a, home) - dist(b, home));
          const open: Lot[] = [];
          for (const w of byDistance) {
            if ((filled.get(w.id) ?? 0) < jobsAt.get(w.id)!) open.push(w);
            if (open.length === 6) break;
          }
          if (open.length) {
            // One of the nearest few with room: usually close, sometimes across town.
            const w = open[Math.floor(r() * r() * open.length)]!;
            filled.set(w.id, (filled.get(w.id) ?? 0) + 1);
            c.work = w.id;
            c.occupation = jobFor(r, w.def, m.age);
          } else c.occupation = "trader";
        } else c.occupation = pick(r, ["hustler", "job seeker", "freelancer", "stay-at-home parent"]);
        out.push(c);
        n += 1;
      }
    }
  }
  // Everyone else who works here comes in from the satellite towns.
  for (const w of workplaces) {
    const def = building(w.def)!;
    const r = rng(w.seed * 11 + 5);
    const count = Math.round((def.jobs ?? 0) * COMMUTERS);
    for (let i = 0; i < count; i += 1) {
      const gender: Gender = r() < 0.5 ? "male" : "female";
      const town = pick(r, TOWNS);
      const age = 19 + Math.floor(r() * 42);
      out.push({
        id: `${w.id}-c${i}`,
        name: `${pick(r, gender === "male" ? MALE : FEMALE)} ${pick(r, SURNAMES)}`,
        age,
        gender,
        seed: Math.floor(r() * 1e9),
        trait: pick(r, ["busy", "social", "homebody", "outdoorsy", "devout"] as const),
        occupation: jobFor(r, w.def, age),
        household: `out:${town}-${w.id}-${i}`,
        home: `out:${town}`,
        work: w.id,
      });
    }
  }
  cache = out;
  return out;
}

/** Who works at a building: the whole staff list. */
let staffCache: Map<string, Citizen[]> | null = null;
export function staffOf(lotId: string): Citizen[] {
  if (!staffCache) {
    staffCache = new Map();
    for (const c of citizens()) if (c.work) staffCache.set(c.work, [...(staffCache.get(c.work) ?? []), c]);
  }
  return staffCache.get(lotId) ?? [];
}

/** What someone looks like at their life stage: kids dress like kids, grown-ups like grown-ups. */
export function lookOf(c: Citizen, day: number): { look: Look; stage: LifeStage } {
  const stage = stageOn(c, day);
  const build = c.gender === "male" ? "masc" : "fem";
  const base = randomLook(c.seed, { build });
  if (stage === "child") {
    return { stage, look: { ...base, top: (["hoodie", "tee", "sweater"] as const)[c.seed % 3]!, bottom: c.gender === "female" && c.seed % 2 ? "skirt" : "shorts", beard: "none", earrings: "none", chain: false, watch: false, tattoos: false, glasses: false, hat: c.seed % 5 === 0 ? "cap" : "none", bag: true, bagStyle: "backpack" } };
  }
  if (stage === "senior") return { stage, look: { ...base, hairColor: "#a9a9a9", specs: true, top: c.seed % 2 ? "kaftan" : base.top } };
  if (stage === "teen") return { stage, look: { ...base, beard: "none", bag: true } };
  return { stage, look: base };
}

/** A small set of looks for the crowd, so the city doesn't need a texture per person. */
export const CROWD_LOOKS = 36;
export const crowdIndex = (c: Citizen) => c.seed % CROWD_LOOKS;

const SLOT_NAMES = ["morning", "afternoon", "evening", "night"];

/**
 * Where someone wants to be: their plan for this time of day. `beat` steps
 * through the slot (0, 1, 2…) so people who are out move between errands.
 */
export function planFor(c: Citizen, day: number, slot: number, beat: number): { activity: Activity; lot: string } {
  const stage = stageOn(c, day);
  const weekend = day % 7 >= 5;
  const r = rng(c.seed + day * 101 + slot * 13 + beat * 7);
  const home = { activity: "home" as Activity, lot: c.home };
  if (slot >= 3) return home;
  const anchor = isOut(c.home) ? (c.work ?? "") : c.home;
  const near = (kinds: string[], k = 4) => {
    const options = nearest(anchor, kinds, k);
    return options.length ? pick(r, options) : undefined;
  };
  const outing = (): { activity: Activity; lot: string } => {
    const roll = r();
    if (stage === "child" || stage === "teen") return { activity: "park", lot: near(["playground", "park"]) ?? c.home };
    if (c.trait === "devout" && (roll < 0.4 || (weekend && slot === 0))) return { activity: "worship", lot: near(["mosque", "church"], 2) ?? c.home };
    if (roll < 0.3) return { activity: "shopping", lot: near(["shop", "supermarket", "mall"]) ?? c.home };
    if (roll < 0.5) return { activity: "eating", lot: near(["restaurant", "cafe"]) ?? c.home };
    if (roll < 0.7 || c.trait === "outdoorsy") return { activity: "park", lot: near(["park", "playground", "monument"]) ?? c.home };
    if (roll < 0.78 && stage === "senior") return { activity: "clinic", lot: near(["clinic", "hospital_bld"], 2) ?? c.home };
    if (roll < 0.9 && c.trait === "social") return { activity: "visiting", lot: near(["small_house", "big_house", "duplex", "townhouse", "apartments", "highrise_apts", "villa"], 8) ?? c.home };
    return { activity: "errand", lot: near(["library", "community", "police", "government", "shop"]) ?? c.home };
  };
  if (!weekend) {
    if ((stage === "child" || stage === "teen") && c.school && slot <= 1) return { activity: "school", lot: c.school };
    if (c.work && slot <= 1) {
      const def = building(lotById(c.work)?.def ?? "");
      const hours = def?.hours ?? [0, 2];
      if (slot >= hours[0] && slot <= Math.min(1, hours[1])) return { activity: "work", lot: c.work };
    }
  }
  // Evening and weekends: most people are home, the rest are out.
  // Commuters mostly go home to their town; a few stay in town after work.
  const outChance = isOut(c.home) ? (weekend ? 0.08 : slot === 2 ? 0.15 : 0) : c.trait === "homebody" ? 0.2 : slot === 2 ? 0.45 : 0.6;
  return r() < outChance ? outing() : home;
}

export const ACTIVITY_LABEL: Record<Activity, string> = {
  home: "at home",
  work: "at work",
  school: "at school",
  shopping: "shopping",
  eating: "out to eat",
  park: "at the park",
  worship: "at prayers",
  visiting: "visiting friends",
  clinic: "at the clinic",
  errand: "running errands",
};

/** How long one "beat" of the day lasts in real time: people move on between errands. */
export const BEAT_MS = 25_000;
/** The beat now, on the same clock as the game loop. */
export const beatNow = () => Math.floor(performance.now() / BEAT_MS);

/** Who's connected to a building and where they are now: residents, staff, visitors. */
export function lotPeople(lotId: string, day: number, slot: number, beat = beatNow()) {
  const residents: { c: Citizen; plan: { activity: Activity; lot: string } }[] = [];
  const onShift: Citizen[] = [];
  const visitors: { c: Citizen; activity: Activity }[] = [];
  for (const c of citizens()) {
    const home = c.home === lotId;
    const works = c.work === lotId;
    const plan = planFor(c, day, Math.min(3, slot), beat);
    if (home) residents.push({ c, plan });
    if (plan.lot !== lotId) continue;
    if (works && plan.activity === "work") onShift.push(c);
    else if (!home) visitors.push({ c, activity: plan.activity });
  }
  return { residents, staff: staffOf(lotId), onShift, visitors };
}

/** Where someone is, in words. */
export function doing(c: Citizen, plan: { activity: Activity; lot: string }): string {
  if (isOut(plan.lot)) return `home in ${plan.lot.slice(4)}`;
  return ACTIVITY_LABEL[plan.activity];
}

/** People at a building now, for the building panel. */
export function peopleAt(lotId: string, day: number, slot: number, beat = 0) {
  return citizens().filter((c) => planFor(c, day, slot, beat).lot === lotId);
}

export const slotName = (slot: number) => SLOT_NAMES[Math.min(3, slot)]!;
