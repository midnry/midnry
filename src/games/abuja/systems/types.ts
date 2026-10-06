// Shared types for Abuja Hustle. Content lives in ../data/*.json and follows
// these shapes, so new chapters, events, jobs and places need no code changes.

export type Background = "lapo" | "average";
export type Gender = "male" | "female";
export type Stage = "primary" | "secondary" | "university" | "nysc" | "adult" | "ended";

export type StatKey =
  | "money"
  | "usd"
  | "energy"
  | "health"
  | "stress"
  | "resilience"
  | "reputation"
  | "heat"
  | "network";

export type SkillKey = "tech" | "trade" | "hustle" | "education" | "driving" | "trading" | "content";

export type Looks = { skin: string; hair: string; outfit: string };

/** A condition on the current state. Every key given must hold. */
export type Cond = {
  stat?: StatKey;
  skill?: SkillKey;
  gte?: number;
  lte?: number;
  flag?: string;
  notFlag?: string;
  background?: Background;
  gender?: Gender;
  cert?: CertKey;
  noCert?: CertKey;
  npc?: string;
  rel?: number;
  job?: string | null;
  hasJob?: boolean;
  asset?: string;
  noAsset?: string;
  any?: Cond[];
};

export type CertKey = "waec" | "degree" | "nysc";

/** A change to the state. Several kinds can sit in one object. */
export type Effect = {
  stat?: StatKey;
  skill?: SkillKey;
  add?: number;
  flag?: string;
  set?: boolean | number | string;
  npc?: string;
  rel?: number;
  cert?: CertKey;
  log?: string;
  toast?: string;
  chance?: number;
  then?: Effect[];
  else?: Effect[];
  asset?: string;
  removeAsset?: string;
  job?: string | null;
  age?: number;
  ending?: EndingId;
};

export type Choice = {
  text: string;
  if?: Cond;
  /** Shown greyed out with this reason when `if` fails, instead of hidden. */
  lockedText?: string;
  effects?: Effect[];
  next?: string;
  /** Text shown after picking, before moving on. */
  result?: string;
};

export type Scene = {
  speaker?: string;
  text: string;
  /** Auto-route to the first matching branch instead of showing choices. */
  branch?: { if?: Cond; next: string }[];
  choices?: Choice[];
  /** Special screens handled by the UI, such as the NYSC fixers. */
  special?: "fixers";
  effects?: Effect[];
};

export type Chapter = {
  id: string;
  stage: Stage;
  title: string;
  age: number;
  start: string;
  scenes: Record<string, Scene>;
};

export type NpcDef = {
  id: string;
  name: string;
  /** Different names by the MC's gender, for the love interest. */
  nameByGender?: Record<Gender, string>;
  role: string;
  class: "nepo" | "lapo" | "ordinary" | "hustler" | "scammer" | "mentor" | "influencer" | "guru" | "relative";
  bio: string;
  color: string;
};

export type JobDef = {
  id: string;
  title: string;
  tier: "entry" | "mid" | "top";
  place: string;
  pay: number;
  salaried: boolean;
  requires: Cond[];
  requiresText: string;
  shift: Effect[];
};

export type ActionDef = {
  id: string;
  label: string;
  slots: number;
  energy: number;
  cost?: number;
  if?: Cond;
  lockedText?: string;
  effects: Effect[];
  text: string;
  /** Special handlers in the UI: sleep, work, apply, loans, hospital, japa. */
  kind?: "sleep" | "work" | "apply" | "loans" | "japa";
  job?: string;
};

export type PlaceDef = {
  id: string;
  name: string;
  district: string;
  x: number;
  y: number;
  color: string;
  blurb: string;
  /** Only shown when this holds, such as the right home for the background. */
  if?: Cond;
  actions: ActionDef[];
};

export type DistrictDef = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vibe: string;
  gate?: { if: Cond; message: string };
};

export type EventDef = {
  id: string;
  weight: number;
  if?: Cond;
  once?: boolean;
  title: string;
  text: string;
  choices: Choice[];
};

export type FixerDef = { name: string; line: string; color: string };

export type StateDef = { name: string; blurb: string; events: { text: string; effects: Effect[] }[] };

export type Loan = { id: string; principal: number; owed: number; weekly: number; nextDue: number; missed: number };

export type EndingId = "freedom" | "grass" | "jail" | "ninefive" | "broke" | "japa" | "cut";

export type GameState = {
  version: 1;
  name: string;
  gender: Gender;
  background: Background;
  looks: Looks;
  stage: Stage;
  chapter: string | null;
  scene: string | null;
  /** The result line of the last choice, shown before the next scene. */
  result: string | null;
  /** Where to go after the player reads `result`. */
  pendingNext: string | null;
  /** NYSC fixers on offer at camp, rolled once. */
  fixers: { name: string; line: string; color: string; stars: number; price: number }[];
  day: number;
  slot: number;
  age: number;
  stats: Record<StatKey, number>;
  skills: Record<SkillKey, number>;
  flags: Record<string, boolean | number | string>;
  npcs: Record<string, { rel: number; met: boolean; lastSeen: number }>;
  certs: Partial<Record<CertKey, boolean>>;
  job: string | null;
  loans: Loan[];
  assets: string[];
  postingState: string | null;
  district: string;
  pos: { x: number; y: number };
  log: { age: number; text: string }[];
  event: string | null;
  usedEvents: string[];
  ending: EndingId | null;
  toast: string | null;
};
