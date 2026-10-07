import { roadRoute, routeLength } from "./citymap";

// Getting around Abuja: hop on an okada, squeeze into a keke, flag a taxi, or
// wait for the bus. Fares go by how far the road trip is.

export type RideMode = "okada" | "keke" | "taxi" | "bus";

export const RIDE_INFO: Record<RideMode, { label: string; icon: string; blurb: string }> = {
  okada: { label: "Okada", icon: "🏍️", blurb: "Fastest through traffic. Hold on tight." },
  keke: { label: "Keke", icon: "🛺", blurb: "Cheap and cheerful. Shared seat, open sides." },
  taxi: { label: "Taxi", icon: "🚕", blurb: "Green-and-white comfort. Arrive calm." },
  bus: { label: "Bus", icon: "🚌", blurb: "Cheapest, but it takes a while." },
};

export const RIDE_MODES: RideMode[] = ["okada", "keke", "taxi", "bus"];

/**
 * Okada and keke have been banned from Abuja's city centre since 2006: they
 * only work the satellite towns and outer districts.
 */
export const CITY_CENTRE = new Set(["cbd", "wuse", "garki", "maitama", "asokoro", "threearms", "utako", "jabi", "wuye", "katampe", "guzape"]);

/** Why a ride can't take this trip, or null when it can. */
export function rideBan(mode: RideMode, fromDistrict: string, toDistrict: string): string | null {
  if (mode !== "okada" && mode !== "keke") return null;
  if (!CITY_CENTRE.has(fromDistrict) && !CITY_CENTRE.has(toDistrict)) return null;
  return `${RIDE_INFO[mode].label}s are banned in the city centre. Take a taxi or the bus.`;
}

/** About 160 map pixels to a kilometre: Nyanya to the CBD is roughly 15 km by road. */
const PX_PER_KM = 160;

const roundUp = (n: number) => Math.ceil(n / 50) * 50;

export function rideKm(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return routeLength(roadRoute(from, to)) / PX_PER_KM;
}

export function fare(mode: RideMode, from: { x: number; y: number }, to: { x: number; y: number }): number {
  const km = rideKm(from, to);
  if (mode === "bus") return 500;
  if (mode === "okada") return roundUp(300 + km * 150);
  if (mode === "keke") return roundUp(200 + km * 120);
  return roundUp(800 + km * 380);
}

/** Fuel for driving yourself there. */
export function fuelCost(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return roundUp(rideKm(from, to) * 180);
}
