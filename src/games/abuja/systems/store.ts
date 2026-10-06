import type { Background, Gender, GameState, Interest, Looks } from "./types";

// A tiny store: the whole game is one plain object, saved to localStorage.
// React reads it with useGame(); Phaser reads and writes it through the same API.

const SAVE_KEY = "abuja-hustle.save.v1";
export const AGE_KEY = "abuja-hustle.age-ok";

type Listener = () => void;

let state: GameState | null = null;
const listeners = new Set<Listener>();
let saveTimer: number | null = null;
let cloudTimer: number | null = null;
let cloudSaver: ((payload: string | null) => void) | null = null;

/** When signed in, the UI hands over a function that saves to the account. */
export function setCloudSaver(saver: ((payload: string | null) => void) | null): void {
  cloudSaver = saver;
}

export function getState(): GameState | null {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Change the game. The mutator edits a fresh copy, so React sees a new object. */
export function update(mutator: (draft: GameState) => void): void {
  if (!state) return;
  const draft = structuredClone(state);
  mutator(draft);
  state = draft;
  emit();
  scheduleSave();
}

export function replace(next: GameState | null): void {
  state = next;
  emit();
  if (next) scheduleSave();
}

function scheduleSave() {
  if (typeof window === "undefined") return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => writeSave(false), 300);
}

/** Save right now, on this device and (when signed in) to the account. */
export function flushSave(): void {
  if (typeof window === "undefined") return;
  if (saveTimer) window.clearTimeout(saveTimer);
  writeSave(true);
}

function writeSave(now: boolean) {
  saveTimer = null;
  if (!state) return;
  state.savedAt = Date.now();
  const payload = JSON.stringify(state);
  try {
    localStorage.setItem(SAVE_KEY, payload);
  } catch {
    /* storage full or blocked: the game keeps running */
  }
  if (cloudSaver) {
    if (cloudTimer) window.clearTimeout(cloudTimer);
    const saver = cloudSaver;
    if (now) saver(payload);
    else cloudTimer = window.setTimeout(() => saver(payload), 3000);
  }
}

export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameState;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function loadSave(): GameState | null {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
  if (cloudTimer) window.clearTimeout(cloudTimer);
  cloudSaver?.(null);
}

/** Keep whichever save is newer: this device's or the account's. */
export function newestSave(local: GameState | null, cloud: GameState | null): GameState | null {
  if (!local) return cloud;
  if (!cloud) return local;
  return (cloud.savedAt ?? 0) > (local.savedAt ?? 0) ? cloud : local;
}

export function newGame(input: { name: string; gender: Gender; background: Background; looks: Looks; interest: Interest }): GameState {
  const lapo = input.background === "lapo";
  const loveGender: Gender =
    input.interest === "women" ? "female" : input.interest === "men" ? "male" : Math.random() < 0.5 ? "female" : "male";
  return {
    version: 1,
    name: input.name,
    gender: input.gender,
    background: input.background,
    looks: input.looks,
    stage: "primary",
    chapter: null,
    scene: null,
    result: null,
    pendingNext: null,
    fixers: [],
    day: 1,
    slot: 0,
    age: 9,
    stats: {
      money: lapo ? 500 : 3000,
      usd: 0,
      energy: 100,
      health: lapo ? 85 : 95,
      stress: lapo ? 30 : 15,
      resilience: lapo ? 60 : 40,
      reputation: 5,
      heat: 0,
      network: lapo ? 3 : 8,
    },
    skills: {
      tech: 0,
      trade: lapo ? 5 : 2,
      hustle: lapo ? 15 : 5,
      education: lapo ? 5 : 10,
      driving: 0,
      trading: 0,
      content: 0,
    },
    flags: {},
    npcs: {},
    certs: {},
    job: null,
    loans: [],
    assets: [],
    postingState: null,
    district: lapo ? "nyanya" : "gwarinpa",
    pos: { x: 0, y: 0 },
    log: [],
    event: null,
    usedEvents: [],
    ending: null,
    toast: null,
    interest: input.interest,
    loveGender,
    partners: {},
    affairs: [],
    pregnancy: null,
    children: [],
    eventCtx: {},
    market: null,
    task: null,
  };
}

// ── Input shared between the DOM controls and Phaser ─────────────────────────

export const input = {
  /** Joystick vector, -1..1 on each axis. */
  x: 0,
  y: 0,
  /** Set to true for one frame to interact with the nearest place. */
  interact: false,
  /** The pause menu is open: the world stands still. */
  paused: false,
  /** How you move on screen: a joystick, or tapping where to go (keys always work). */
  controls: "joystick" as Controls,
};

export type Controls = "joystick" | "tap";
const CONTROLS_KEY = "abuja-hustle.controls";

/** Your saved choice; the joystick until you pick otherwise. */
export function loadControls(): Controls {
  try {
    const saved = localStorage.getItem(CONTROLS_KEY);
    if (saved === "joystick" || saved === "tap") return saved;
  } catch {
    /* storage blocked: use the joystick */
  }
  return "joystick";
}

export function saveControls(controls: Controls): void {
  input.controls = controls;
  try {
    localStorage.setItem(CONTROLS_KEY, controls);
  } catch {
    /* fine: it just won't be remembered */
  }
}

/** Something you can use: a place, a person, a story spot, a door, the way out of a room, or a thing in a room. */
export type NearThing = { kind: "place" | "person" | "beat" | "door" | "exit" | "item"; id: string; label: string };

type BusEvents = {
  teleport: { x: number; y: number };
  /** A ride across the city: the world animates the trip along the roads. */
  ride: { mode: "okada" | "keke" | "taxi" | "bus" | "car"; from: { x: number; y: number }; to: { x: number; y: number } };
  near: NearThing | null;
  interact: NearThing;
  blocked: string;
  /** Walk to the current goal: the story spot, or the next stop of a job. */
  goto: null;
  /** Camera controls from the buttons: zoom, or look around without moving. */
  camera: "in" | "out" | "explore" | "follow";
  /** The world tells the buttons whether you're looking around. */
  exploring: boolean;
  /** A room has finished loading (the loading screen can go). */
  roomReady: null;
  /** Open the kitchen screen: at home, from a market, or from the phone. */
  kitchen: { at: "home" | null; market: string | null; tab: "cook" | "shop" | "school" };
};
type Handler = (payload: never) => void;
const handlers = new Map<keyof BusEvents, Set<Handler>>();

export const bus = {
  on<K extends keyof BusEvents>(name: K, handler: (payload: BusEvents[K]) => void): () => void {
    const set = handlers.get(name) ?? new Set<Handler>();
    handlers.set(name, set);
    set.add(handler as Handler);
    return () => {
      set.delete(handler as Handler);
    };
  },
  emit<K extends keyof BusEvents>(name: K, payload: BusEvents[K]): void {
    handlers.get(name)?.forEach((handler) => (handler as (value: BusEvents[K]) => void)(payload));
  },
};
