import { ROADS, road } from "./city/layout";
import { injured } from "./health";
import { life, lifeOf } from "./life";
import type { GameState } from "./types";
import { fuelSurge } from "./cityEvents";

// Driving: a licence from the driving school, a car to drive (rented or
// bought), fuel, and FRSC road safety checkpoints.

export const LESSON_GAIN = 8;
export const TEST_MIN = 40;
export const RENT_DAYS = 3;
export const CAR_PRICE = 3_500_000;
/** Naira of fuel per map pixel driven (about ₦180 a kilometre). */
export const FUEL_PER_PX = 0.9;
export const CAR_COLOR = "#1f6fd1";

export function hasCar(s: GameState): boolean {
  const l = lifeOf(s);
  return l.car === "owned" || (l.car === "rented" && s.day <= l.carUntil);
}

export function isDriving(s: GameState): boolean {
  return Boolean(lifeOf(s).driving) && hasCar(s) && !s.chapter;
}

/** The FRSC driving test: the better you drive, the better your chances. */
export function drivingTest(s: GameState): string {
  const l = life(s);
  if (l.license) return "You already have your licence. The examiner waves you away.";
  const skill = s.skills.driving;
  if (skill < TEST_MIN) return `The examiner checks your record: "Driving ${skill}? Come back after more lessons. You need ${TEST_MIN}."`;
  const chance = Math.min(0.95, 0.45 + (skill - TEST_MIN) / 80);
  if (Math.random() < chance) {
    l.license = true;
    return "You reverse into the bay without touching a single cone. The examiner nods. Your FRSC driver's licence is ready. 🪪";
  }
  return "You stall twice on the hill start and forget to check your mirrors. \"Failed. Book again.\" More lessons will help.";
}

export function rentCar(s: GameState): string {
  const l = life(s);
  if (l.car === "owned") return "You already have your own car.";
  // Today counts as the first day; renting again extends a rental you still have.
  l.carUntil = (l.car === "rented" && l.carUntil >= s.day ? l.carUntil : s.day - 1) + RENT_DAYS;
  l.car = "rented";
  return `A tidy Toyota Camry, yours until day ${l.carUntil}. Tap 🚗 Drive on the map to get behind the wheel.${l.license ? "" : " Careful: FRSC will want to see a licence."}`;
}

export function buyCar(s: GameState): string {
  const l = life(s);
  if (l.car === "owned") return "You already own a car.";
  l.car = "owned";
  if (!s.assets.includes("car")) s.assets.push("car");
  return `The dealer hands you the keys to a 2012 Toyota Corolla, "Tokunbo, first body". Tap 🚗 Drive on the map.${l.license ? "" : " Get a licence at the driving school before FRSC catches you."}`;
}

/** Get in or out of the car. Returns a line, or null when it worked silently. */
export function toggleDriving(s: GameState): string {
  const l = life(s);
  if (l.driving) {
    l.driving = false;
    return "You park and get out.";
  }
  if (!hasCar(s)) return l.car === "rented" ? "Your rental is over. The car has gone back to the dealer." : "You don't have a car. Rent or buy one at the car mart in Lugbe.";
  if (injured(s) === "fracture") return "You can't drive with your leg in a cast.";
  l.driving = true;
  return l.license ? "You start the engine. Abuja roads, here we come. 🚗" : "You start the engine without a licence. Pray you don't meet FRSC. 🚗";
}

/** Fuel for the distance just driven. Stops the car when the money runs out. */
export function useFuel(s: GameState, px: number): string | null {
  const cost = Math.round(px * FUEL_PER_PX * fuelSurge(s));
  if (cost <= 0) return null;
  if (s.stats.money < cost) {
    life(s).driving = false;
    return "The fuel light comes on and you can't afford more. You park by the road.";
  }
  s.stats.money -= cost;
  return null;
}

/** Each night: a rental that has run out goes back. */
export function nightlyCar(s: GameState): string[] {
  const l = life(s);
  if (l.car === "rented" && s.day > l.carUntil) {
    l.car = null;
    l.driving = false;
    return ["Your rental car has gone back to the dealer."];
  }
  return [];
}

/** FRSC stop: only when you're driving, once a day. Returns the event to open. */
export function frscStop(s: GameState, onTrip = false): string | null {
  if (!(onTrip || isDriving(s)) || s.flags.frsc_day === s.day || s.event) return null;
  s.flags.frsc_day = s.day;
  return lifeOf(s).license ? "frsc_ok" : "frsc_nolicense";
}

/** Where FRSC sets up today: different junctions on different days. */
export function frscSpots(day: number): { x: number; y: number }[] {
  // Junctions where an expressway meets another big road.
  const big = (axis: "x" | "y", at: number) => road(axis, at).kind !== "street";
  const all = ROADS.xs.flatMap((x) => ROADS.ys.filter((y) => big("x", x) && big("y", y) && (road("x", x).kind === "expressway" || road("y", y).kind === "expressway")).map((y) => ({ x, y })));
  return [all[day % all.length]!, all[(day + 3) % all.length]!];
}
