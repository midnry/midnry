import { randomLook, type Look } from "./character";
import { PEOPLE } from "./data";
import type { PersonDef } from "./types";
import { crowdPainted, type CrowdStage } from "./painted";

// Who looks like what: the world, the chat boxes and the story all draw a
// person from here, so Mama in the yard and Mama in a chat box are the same.

/** `painted`: id of hand-painted art, when the person has it. */
export type Person = { look: Look; adult: boolean; painted?: string };

export const seedOf = (id: string) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** People with their own hand-painted art: by id on any map, or `map:id` for one map only. */
const PAINTED_PEOPLE: Record<string, string> = {
  ...Object.fromEntries(["suya", "pos_lady", "agbero", "okada", "hawker", "felix", "okafor", "prophet", "civil_servant", "tunde", "slim", "bolaji", "corper"].map((id) => [`city:${id}`, id])),
  // The same people met earlier in life.
  "university:okafor": "okafor",
  "nysc:corper_friend": "corper",
};

/** Hand-painted art for someone with none of their own yet: a painted passer-by of their age and gender. */
function standIn(seed: number, gender: "male" | "female", stage: CrowdStage): string | undefined {
  return crowdPainted(gender, stage, seed) ?? crowdPainted(gender, "adult", seed);
}

const FEMININE = /\b(mrs|madam|miss|lady|woman|mama|aunty|auntie|mother|sister|queen|princess)\b/i;

export function personLook(p: PersonDef): Person {
  const look = randomLook(seedOf(`${p.map}:${p.id}`), { topColor: p.color, glasses: false, headphones: false, ...(p.build ? { build: p.build } : {}), ...p.look });
  const gender = (p.build ?? look.build) === "fem" ? "female" : "male";
  // Friends as children: primary-school kids, then secondary-school teens.
  const stage: CrowdStage = p.kid ? (p.map === "primary" ? "child" : "teen") : "adult";
  const own = p.kid ? undefined : (PAINTED_PEOPLE[`${p.map}:${p.id}`] ?? PAINTED_PEOPLE[p.id]);
  return { look, adult: !p.kid, painted: own ?? standIn(seedOf(`${p.map}:${p.id}`), gender, stage) };
}

/** A story speaker by name: the person on this map if there is one, else anyone with that name, else a stranger. */
export function speakerLook(name: string, map?: string, gender?: "male" | "female"): Person {
  const clean = name.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
  const match = (p: PersonDef) => p.name.toLowerCase() === clean || p.name.toLowerCase().startsWith(`${clean} `);
  const p = PEOPLE.find((x) => x.map === map && match(x)) ?? PEOPLE.find(match);
  if (p) return personLook(p);
  const g = gender ?? (FEMININE.test(name) ? "female" : "male");
  return { look: randomLook(seedOf(name), { build: g === "female" ? "fem" : "masc" }), adult: true, painted: standIn(seedOf(name), g, "adult") };
}
