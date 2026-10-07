// Shared types for Abuja Hustle. Content lives in ../data/*.json and follows
// these shapes, so new chapters, events, jobs and places need no code changes.

import type { Build, Look } from "./character";
import type { NegLife } from "./negotiate/types";
import type { Kitchen } from "./cooking/types";
import type { CityState } from "./city/sim";

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

/** How the player looks. `outfit` is the top colour; the rest came later, so older saves may lack them. */
export type Looks = { skin: string; hair: string; outfit: string } & Partial<Omit<Look, "skin" | "hair">>;

export type Interest = "women" | "men" | "both";
export type Personality = "calm" | "cunning" | "crazy";

export type Partner = {
  id: string;
  gender: Gender;
  affection: number;
  /** Hidden until enough hints are seen. */
  personality: Personality;
  hints: string[];
  status: "met" | "dating" | "engaged" | "married" | "ex";
  since: number;
  lastSeen: number;
  nepo: boolean;
};

export type Candle = { o: number; h: number; l: number; c: number };

export type Position = {
  id: string;
  asset: string;
  side: "long" | "short";
  margin: number;
  leverage: number;
  /** Naira exposure: margin × leverage. */
  notional: number;
  entry: number;
  day: number;
};

export type MarketState = {
  prices: Record<string, number>;
  candles: Record<string, Candle[]>;
  today: Record<string, Candle>;
  /** Hidden drift per asset that shifts over time; insight hints at it. */
  regime: Record<string, number>;
  balance: number;
  positions: Position[];
  history: { asset: string; side: "long" | "short"; pnl: number; day: number; leverage: number }[];
  /** A tip that comes true on the next tick: asset and move in percent. */
  pendingShock: { asset: string; pct: number } | null;
};

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
  /** The electricity hasn't been cut off. */
  powered?: boolean;
  /** Has (true) or lacks (false) a driver's licence. */
  license?: boolean;
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
  /** Relationship and pregnancy outcomes, handled in systems/romance.ts. */
  romance?: string;
  /** Instant price moves in the trading app, in percent. */
  market?: { asset: string; pct: number }[];
  /** Time slots this takes, for offers made in conversation. */
  time?: number;
  /** Fill up food or water (negative to lose some). */
  food?: number;
  water?: number;
  /** Wash your clothes. */
  wash?: boolean;
  /** Something bad you were seen doing: costs reputation and is remembered. */
  offense?: string;
  /** How you answer an EFCC invitation: "honour", "bribe" or "run". */
  efcc?: string;
  /** Learn a recipe (someone teaches you). */
  recipe?: string;
};

export type MapRect = { x: number; y: number; w: number; h: number; label?: string; color?: string; gapFrom?: number; gapTo?: number; kind?: "water" };

export type ChapterMap = {
  width: number;
  height: number;
  spawn: { x: number; y: number };
  zones: { name: string; x: number; y: number; w: number; h: number; color: string }[];
  solids: MapRect[];
  spots: Record<string, { x: number; y: number; label: string }>;
  beats: Record<string, string>;
};

export type PersonDef = {
  id: string;
  name: string;
  map: string;
  x?: number;
  y?: number;
  place?: string;
  dx?: number;
  dy?: number;
  color: string;
  /** Body shape once grown; children are drawn as kids even in adult chapters' maps. */
  build?: Build;
  kid?: boolean;
  /** Clothes and features that fit the character (the rest is varied but fixed). */
  look?: Partial<Look>;
  /** A story character: talking raises this relationship a little. */
  npc?: string;
  if?: Cond;
  lines: string[];
  talks?: { if?: Cond; text: string; choices: Choice[] }[];
};

export type TaskStep = { x: number; y: number; label: string; kind: "pickup" | "dropoff" | "customer" };

export type Task = {
  kind: "delivery" | "hawk" | "ride";
  app?: "zoom" | "ownprice";
  steps: TaskStep[];
  index: number;
  /** Real seconds allowed for the current step. */
  limit: number;
  stepStarted: number;
  earned: number;
  late: number;
  /** Ride-hailing: the agreed fare for the current passenger. */
  fare: number;
  rating: number[];
  haggle: { offer: number; passenger: string } | null;
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
  /** Different names by the character's own gender, for the love interest. */
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
  /** For "negotiate" actions: which deal; for "foodshop", which market. */
  deal?: string;
  /** Special handlers in the UI: sleep, work, apply, loans, hospital, japa. */
  kind?: "sleep" | "work" | "apply" | "loans" | "japa" | "meet" | "drive" | "doctor" | "paybill" | "unfreeze" | "efcc" | "drivetest" | "rentcar" | "buycar" | "bizapp" | "negotiate" | "kitchen" | "foodshop" | "cookclass";
  job?: string;
};

export type PlaceDef = {
  id: string;
  name: string;
  district: string;
  x: number;
  y: number;
  color: string;
  /** Emoji on the signpost. */
  icon?: string;
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

export type InjuryKind = "minor" | "dislocation" | "fracture";

/** A business the player owns: what it is, how far it has grown, and cash it has made. */
export type Business = { id: string; level: number; since: number; cash: number; lastVisit: number };

/** Everyday life added after launch. Older saves have none; see systems/life.ts. */
export type Life = {
  /** 100 = full, 0 = starving. */
  food: number;
  /** 100 = well watered, 0 = dehydrated. */
  water: number;
  /** Day the clothes were last washed. */
  washed: number;
  /** Recent money coming in, to spot amounts far outside the usual range. */
  credits: number[];
  /** Money held by the bank while it checks a suspicious credit. */
  frozen: { amount: number; day: number; dirty: boolean; proof?: string } | null;
  /** Unpaid hospital bills. */
  hospitalBill: number;
  /** `healsOn` is set once a doctor has treated it (or for cuts, which heal alone). */
  injury: { kind: InjuryKind; day: number; healsOn?: number } | null;
  /** Electricity: what's owed, and whether the light has been cut. */
  power: { owed: number; cut: boolean };
  license: boolean;
  car: "rented" | "owned" | null;
  /** A rented car goes back after this day. */
  carUntil: number;
  /** Behind the wheel on the map. */
  driving: boolean;
  /** An open EFCC case: when it started and how strong the evidence is. */
  efcc: { day: number; evidence: number } | null;
  businesses: Business[];
  /** Times caught doing something bad, for the Life app. */
  offenses: number;
  /** Negotiation skill, reputation, memories of people, and deals that are running. */
  neg?: NegLife;
};

export type GameState = {
  version: 1;
  /** When this save was last written, to pick the newer of device and account saves. */
  savedAt?: number;
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
  interest: Interest;
  /** The story love interest's gender, set from the MC's interest. */
  loveGender: Gender;
  partners: Record<string, Partner>;
  affairs: { with: string; partner: string; day: number }[];
  pregnancy: { partner: string; day: number; due: number | null; mc: boolean } | null;
  children: { name: string; born: number; with: string }[];
  /** Who or how much a forced event is about, for {partner} and {amount} in its text. */
  eventCtx: { partner?: string; amount?: number; asset?: string };
  market: MarketState | null;
  task: Task | null;
  /** Hunger, laundry, bills, driving and more. Missing in saves from before these existed. */
  life?: Life;
  /** Your kitchen, recipes, garden and food businesses. Created the first time you cook. */
  kitchen?: Kitchen;
  /** Property you own and buildings you've changed in the city. */
  city?: CityState;
};
