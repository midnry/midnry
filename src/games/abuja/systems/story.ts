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
export const ACT_TWO = "The Capital · Act Two";

/** Days after Act One ends before Act Two's first scene. */
const ACT_TWO_AFTER = 5;

/** In order: the first whose condition holds is what you should do now. */
const ACT_ONE_GOALS: Objective[] = [
  { if: { flag: "cap_invited", notFlag: "cap_met_senator" }, text: "Find Bolaji at his family's mansion in Maitama", person: "bolaji" },
  { if: { flag: "cap_meet", notFlag: "cap_briefed" }, text: "Meet Halima Bello at Jabi Lake Mall", person: "halima" },
  { if: { flag: "cap_briefed", notFlag: "cap_site" }, text: "Find Baba Yakubu at the Guzape Hills site", person: "yakubu" },
  { if: { flag: "cap_liaison", notFlag: "cap_site", any: [{ flag: "cap_blocked" }, { notFlag: "cap_halima" }] }, text: "Visit the Guzape Hills site as the Senator's liaison", person: "yakubu" },
];

// Act Two, the Kubwa road: the Senator's ₦4.2bn road that was never built.
// If Act One left you on the right side of the story (you exposed Guzape,
// warned Bolaji, quit, or stayed out), Halima pulls you into the next
// investigation and the Senator's fixer tries to buy you off. If you took his
// money, you go deeper: a company in your name, a bag for the delegates, and
// the EFCC closing in.
const ACT_TWO_GOALS: Objective[] = [
  { if: { flag: "cap2_meet", notFlag: "cap2_briefed" }, text: "Meet Halima at Jabi Lake Mall about the Kubwa road", person: "halima" },
  { if: { flag: "cap2_briefed", notFlag: "cap2_drive" }, text: "Find Engineer Okolo at Kubwa Village Market", person: "okolo" },
  { if: { flag: "cap2_fixer", notFlag: "cap2_signed" }, text: "Meet Alhaji Mustapha at the Federal Ministry of Contracts", person: "mustapha" },
  { if: { flag: "cap2_bag", notFlag: "cap2_delivered" }, text: "Take the bag to Hon. Dauda at the Asokoro Owambe Hall", person: "dauda" },
];

/** Which act you're in, and what it wants you to do now. */
function objective(s: GameState): { act: string; goal: Objective } | null {
  if (!s.flags.cap_done) {
    const goal = ACT_ONE_GOALS.find((o) => check(s, o.if));
    return goal ? { act: ACT_ONE, goal } : null;
  }
  if (s.flags.cap2_done) return null;
  const goal = ACT_TWO_GOALS.find((o) => check(s, o.if));
  return goal ? { act: ACT_TWO, goal } : null;
}

/** You took the Senator's side in Act One: Act Two takes you inside. */
export const deepIn = (s: GameState) => Boolean(s.flags.cap_sold || s.flags.cap_senator_man);

/** Act Two's first scene, by how Act One ended. */
function actTwoOpener(s: GameState): string {
  if (deepIn(s)) return "cap2_call";
  if (s.flags.cap_truth) return "cap2_police";
  if (s.flags.cap_bolaji) return "cap2_bolaji";
  return "cap2_tip";
}

/** Where the story wants you, if anywhere: shown on the HUD with an arrow to it. */
export function storyGoal(s: GameState): { act: string; text: string; spot: { x: number; y: number; label: string }; person: boolean } | null {
  if (s.stage !== "adult" || s.chapter) return null;
  const now = objective(s);
  if (!now) return null;
  const { act, goal } = now;
  if (goal.person) {
    const p = PEOPLE.find((x) => x.map === "city" && x.id === goal.person);
    if (!p) return null;
    const at = p.place ? PLACES.find((pl) => pl.id === p.place) : undefined;
    const x = at ? at.x + (p.dx ?? 95) : (p.x ?? 0);
    const y = at ? at.y + (p.dy ?? -10) : (p.y ?? 0);
    return { act, text: goal.text, spot: { x, y: y + 30, label: p.name }, person: true };
  }
  const pl = PLACES.find((x) => x.id === goal.place);
  return pl ? { act, text: goal.text, spot: { x: pl.x, y: pl.y + 60, label: pl.name }, person: false } : null;
}

/**
 * At night: the story scene that's due tomorrow morning, if any. Act One
 * begins on your second morning as an adult in the city, Act Two five days
 * after Act One ends. Returns true when it set the morning's event.
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
    return false;
  }
  if (s.flags.cap_done && !s.flags.cap2_started) {
    s.flags.cap2_start_day ??= s.day;
    if (s.day >= Number(s.flags.cap2_start_day) + ACT_TWO_AFTER) {
      s.flags.cap2_started = true;
      s.event = actTwoOpener(s);
      return true;
    }
  }
  return false;
}
