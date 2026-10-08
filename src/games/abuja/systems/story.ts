import { PEOPLE, PLACES } from "./data";
import { check } from "./rules";
import type { Cond, GameState } from "./types";

// The Capital: the grown-up story, told in acts on top of the open city.
// Story scenes are events (data/events.json, ids starting "cap_") that the
// night schedules with the `story` effect; conversations with story
// characters (data/people.json) move it on with flags. This file knows what
// you're meant to be doing next, so the HUD and the map arrow can point
// there, and starts Act One once you've settled into adult life.

export type Objective = { if: Cond; text: string; person?: string; place?: string };

export const ACT_ONE = "The Capital · Act One";

/** In order: the first whose condition holds is what you should do now. */
const OBJECTIVES: Objective[] = [
  { if: { flag: "cap_invited", notFlag: "cap_met_senator" }, text: "Find Bolaji at his family's mansion in Maitama", person: "bolaji" },
  { if: { flag: "cap_meet", notFlag: "cap_briefed" }, text: "Meet Halima Bello at Jabi Lake Mall", person: "halima" },
  { if: { flag: "cap_briefed", notFlag: "cap_site" }, text: "Find Baba Yakubu at the Guzape Hills site", person: "yakubu" },
  { if: { flag: "cap_liaison", notFlag: "cap_site", any: [{ flag: "cap_blocked" }, { notFlag: "cap_halima" }] }, text: "Visit the Guzape Hills site as the Senator's liaison", person: "yakubu" },
];

/** Where the story wants you, if anywhere: shown on the HUD with an arrow to it. */
export function storyGoal(s: GameState): { text: string; spot: { x: number; y: number; label: string }; person: boolean } | null {
  if (s.stage !== "adult" || s.chapter || s.flags.cap_done) return null;
  const goal = OBJECTIVES.find((o) => check(s, o.if));
  if (!goal) return null;
  if (goal.person) {
    const p = PEOPLE.find((x) => x.map === "city" && x.id === goal.person);
    if (!p) return null;
    const at = p.place ? PLACES.find((pl) => pl.id === p.place) : undefined;
    const x = at ? at.x + (p.dx ?? 95) : (p.x ?? 0);
    const y = at ? at.y + (p.dy ?? -10) : (p.y ?? 0);
    return { text: goal.text, spot: { x, y: y + 30, label: p.name }, person: true };
  }
  const pl = PLACES.find((x) => x.id === goal.place);
  return pl ? { text: goal.text, spot: { x: pl.x, y: pl.y + 60, label: pl.name }, person: false } : null;
}

/**
 * At night: the story scene that's due tomorrow morning, if any. Act One
 * begins on your second morning as an adult in the city. Returns true when
 * it set the morning's event.
 */
export function storyEvent(s: GameState): boolean {
  if (s.stage !== "adult" || s.chapter) return false;
  const next = s.flags.story_next;
  if (typeof next === "string" && next && s.day >= Number(s.flags.story_day ?? 0)) {
    s.flags.story_next = "";
    s.event = next;
    return true;
  }
  if (!s.flags.cap_started) {
    s.flags.cap_start_day ??= s.day;
    if (s.day >= Number(s.flags.cap_start_day) + 1) {
      s.flags.cap_started = true;
      s.event = "cap_invite";
      return true;
    }
  }
  return false;
}
