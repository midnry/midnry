import type { Background, Gender, GameState, Looks } from "./types";

// A tiny store: the whole game is one plain object, saved to localStorage.
// React reads it with useGame(); Phaser reads and writes it through the same API.

const SAVE_KEY = "abuja-hustle.save.v1";
export const AGE_KEY = "abuja-hustle.age-ok";

type Listener = () => void;

let state: GameState | null = null;
const listeners = new Set<Listener>();
let saveTimer: number | null = null;

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
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    try {
      if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: the game keeps running */
    }
  }, 300);
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    return parsed?.version === 1 ? parsed : null;
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
}

export function newGame(input: { name: string; gender: Gender; background: Background; looks: Looks }): GameState {
  const lapo = input.background === "lapo";
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
  };
}

// ── Input shared between the DOM controls and Phaser ─────────────────────────

export const input = {
  /** Joystick vector, -1..1 on each axis. */
  x: 0,
  y: 0,
  /** Set to true for one frame to interact with the nearest place. */
  interact: false,
};

type BusEvents = {
  teleport: { x: number; y: number };
  near: string | null;
  blocked: string;
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
