import type { PlayEvent } from "../play.functions";
import type { GameState } from "../systems/types";

// Anonymous play counts: how far lives get, which endings people reach and
// how long loading takes on real phones. One random id per device; no names,
// no emails, nothing typed. Sent in small batches.

const DEVICE_KEY = "abuja-hustle.device";
const SENT_KEY = "abuja-hustle.sent";
let queue: PlayEvent[] = [];
let timer: number | null = null;

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "private-mode-device";
  }
}

async function flush() {
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, 30);
  try {
    const { logPlay } = await import("../play.functions");
    await logPlay({ data: { device: deviceId(), events } });
  } catch {
    // Counts are best-effort; the game never waits on them.
  }
  if (queue.length) schedule();
}

function schedule() {
  if (timer == null && typeof window !== "undefined") timer = window.setTimeout(flush, 15_000);
}

if (typeof window !== "undefined") window.addEventListener("pagehide", () => void flush());

export function track(kind: PlayEvent["kind"], label = "", num?: number) {
  if (typeof window === "undefined") return;
  queue.push({ kind, label, num });
  schedule();
}

/** Track once per life (by a key), even across reloads. */
export function trackOnce(state: GameState, key: string, kind: PlayEvent["kind"], label = "", num?: number) {
  const life = `${state.name}|${state.background}|${state.gender}|${state.flags.generation ?? 1}`;
  const id = `${life}|${key}`;
  try {
    const sent = new Set<string>(JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]"));
    if (sent.has(id)) return;
    sent.add(id);
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent].slice(-400)));
  } catch {
    // Private mode: may count twice, which is fine.
  }
  track(kind, label, num);
}

/** When the player tapped Continue or started a life, for the loading time. */
let loadStart: number | null = null;
export const markLoadStart = () => {
  loadStart = performance.now();
};
export function markPlayable() {
  if (loadStart == null) return;
  track("load", "", Math.round(performance.now() - loadStart));
  loadStart = null;
}
