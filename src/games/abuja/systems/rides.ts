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

/** About 250 map pixels to a kilometre. */
const PX_PER_KM = 250;

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
