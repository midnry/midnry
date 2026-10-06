import { randomLook, type Look } from "./character";
import { PEOPLE } from "./data";
import type { PersonDef } from "./types";

// Who looks like what: the world, the chat boxes and the story all draw a
// person from here, so Mama in the yard and Mama in a chat box are the same.

export type Person = { look: Look; adult: boolean };

export const seedOf = (id: string) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function personLook(p: PersonDef): Person {
  return {
    look: randomLook(seedOf(`${p.map}:${p.id}`), { topColor: p.color, glasses: false, headphones: false, ...(p.build ? { build: p.build } : {}), ...p.look }),
    adult: !p.kid,
  };
}

/** A story speaker by name: the person on this map if there is one, else anyone with that name, else a stranger. */
export function speakerLook(name: string, map?: string): Person {
  const clean = name.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
  const match = (p: PersonDef) => p.name.toLowerCase() === clean || p.name.toLowerCase().startsWith(`${clean} `);
  const p = PEOPLE.find((x) => x.map === map && match(x)) ?? PEOPLE.find(match);
  return p ? personLook(p) : { look: randomLook(seedOf(name)), adult: true };
}
