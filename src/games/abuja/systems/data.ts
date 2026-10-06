// Typed access to the JSON content. Add content in ../data; no code changes needed.
import chaptersJson from "../data/chapters.json";
import npcsJson from "../data/npcs.json";
import locationsJson from "../data/locations.json";
import jobsJson from "../data/jobs.json";
import eventsJson from "../data/events.json";
import fixersJson from "../data/fixers.json";
import statesJson from "../data/states.json";
import endingsJson from "../data/endings.json";
import loansJson from "../data/loans.json";
import mapsJson from "../data/maps.json";
import peopleJson from "../data/people.json";
import type {
  Background,
  Chapter,
  ChapterMap,
  PersonDef,
  Cond,
  DistrictDef,
  EndingId,
  EventDef,
  FixerDef,
  JobDef,
  NpcDef,
  PlaceDef,
  StateDef,
} from "./types";

export const CHAPTERS = chaptersJson as unknown as Chapter[];
export const NPCS = npcsJson as unknown as NpcDef[];
export const WORLD = locationsJson.world;
export const HOMES = locationsJson.homes as Record<Background, string>;
export const DISTRICTS = locationsJson.districts as unknown as DistrictDef[];
export const PLACES = locationsJson.places as unknown as PlaceDef[];
export const JOBS = jobsJson as unknown as JobDef[];
export const EVENTS = eventsJson as unknown as EventDef[];
export const FIXERS = fixersJson as FixerDef[];
export const POSTING_STATES = statesJson as unknown as StateDef[];
export const ENDINGS = endingsJson as Record<EndingId, { title: string; text: string; color: string }>;
export const LOANS = loansJson as {
  lender: string;
  note: string;
  offers: { amount: number; interest: number; weeks: number; requires: Cond }[];
  missedPenalty: number;
};

export const MAPS = mapsJson as unknown as Record<string, ChapterMap>;
export const PEOPLE = (peopleJson as unknown as { people: PersonDef[] }).people;

export const chapter = (id: string) => CHAPTERS.find((item) => item.id === id);
export const place = (id: string) => PLACES.find((item) => item.id === id);
export const job = (id: string | null | undefined) => JOBS.find((item) => item.id === id);
export const npc = (id: string) => NPCS.find((item) => item.id === id);
export const district = (id: string) => DISTRICTS.find((item) => item.id === id);

export function districtAt(x: number, y: number): DistrictDef | undefined {
  return DISTRICTS.find((d) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h);
}
