export type ProtocolAction = { seq: number; op: string; target?: string; value?: string };
export type VehicleInput = { pitch: number; steer: number };
export type Input = {
  interact?: boolean;
  protocolAction?: ProtocolAction;
  vehicleInput?: VehicleInput;
  forward?: number;
  strafe?: number;
  aim?: number;
  pitch?: number;
  sprint?: boolean;
  slide?: boolean;
  /** Stance request (combat modes): stand, crouch or lie prone. */
  stance?: "stand" | "crouch" | "prone";
  /** Jump press (edge-triggered). */
  jump?: boolean;
  /** Aiming down the sights (held). */
  ads?: boolean;
  fire?: boolean;
  reload?: boolean;
  super?: boolean;
};
export type Entity = {
  id: string;
  name: string;
  team: number;
  bot: boolean;
  x: number;
  y: number;
  a: number;
  pitch: number;
  hp: number;
  sprinting?: boolean;
  stance?: "stand" | "crouch" | "prone";
  stanceAt?: number;
  ads?: boolean;
  jumpAt?: number;
  slideUntil?: number;
  crouching?: boolean;
  slideCooldown?: number;
  slideHeld?: boolean;
  slideDx?: number;
  slideDy?: number;
  maxHp: number;
  damage: number;
  cores: number;
  exposure: number;
  hit: number;
  shotAt: number;
  ammo: number;
  reloadUntil: number;
  kills: number;
  damageDealt: number;
  coresCollected: number;
  placement: number;
  eliminatedAt: number | null;
  respawns: number;
  respawnAt: number;
  phase: number;
  attack: number;
  nextPath: number;
  path: { x: number; y: number }[];
  departed: boolean;
  weapon: string;
  outfit?: string;
  charge: number;
  cloakedUntil: number;
  speedUntil: number;
  poisonUntil: number;
  slowUntil: number;
  damageSeq: number;
  damageTotal: number;
  damageAngle: number | null;
  hitSeq: number;
  hitDamage: number;
  hitAt: number;
};
export type Crate = { id: string; x: number; y: number; hp: number; maxHp: number; hit: number };
export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTIES: Record<
  Difficulty,
  { speed: number; reaction: number; aim: number; awareness: number }
>;
export function difficultyOf(id: string): Difficulty;
export type ArenaState = {
  protocol?: Record<string, unknown>;
  difficulty?: Difficulty;
  countdown?: number;
  roundId?: string;
  mode: string;
  mapId: string;
  projectiles: unknown[];
  fields: unknown[];
  fx: unknown[];
  nextEffect: number;
  time: number;
  state: string;
  winner: number | null;
  zone: {
    half: number;
    initialHalf: number;
    cx: number;
    cy: number;
    delay: number;
    duration: number;
    minHalf: number;
  };
  level: number[][];
  entities: Entity[];
  crates: Crate[];
  cores: { x: number; y: number }[];
};
export const LEVEL: number[][];
export function clamp(n: number, a: number, b: number): number;
export class Arena {
  constructor(options?: {
    mode?: string;
    difficulty?: Difficulty;
    countdown?: number;
    mapId?: string;
    weapon?: string;
    outfit?: string;
    humans?: { id: string; team: number; name?: string; weapon?: string; outfit?: string }[];
    random?: () => number;
  });
  static restore(data: ArenaState): Arena;
  mode: string;
  difficulty: Difficulty;
  countdown: number;
  roundId: string;
  time: number;
  state: string;
  winner: number | null;
  entities: Entity[];
  events: { id: string; text: string }[];
  snapshot(): ArenaState;
  canMove(x: number, y: number, r?: number): boolean;
  move(e: Entity, dx: number, dy: number): void;
  visible(a: Pick<Entity, "x" | "y">, b: Pick<Entity, "x" | "y">): boolean;
  advance(dt: number, inputs?: Record<string, Input>): void;
  shoot(e: Entity): void;
  reload(e: Entity): void;
  super(e: Entity): boolean;
  detach(id: string): void;
}

export type MapSpec = {
  id: string;
  name: string;
  tag: string;
  description: string;
  level: number[][];
  /** Smaller layout used by practice/academy (training mode) instead of `level`. */
  trainingLevel?: number[][];
  crates?: [number, number][];
  theme: Record<string, unknown>;
  props: unknown[];
  zones: unknown[];
  /** Blackout Protocol maps (bases, aircraft, hospital): never a combat arena. */
  protocolOnly?: boolean;
  /** Tile types you can see and shoot across but not walk on (water). */
  seeThrough?: number[];
  /** Tile types blasts never open. */
  unbreakable?: number[];
};
export type WeaponSpec = {
  id: string;
  name: string;
  kind: string;
  damage: number;
  mag: number;
  cooldown: number;
  range: number;
  color: string;
  super: string;
  description: string;
};
export const MAPS: Record<string, MapSpec>;
export const WEAPONS: Record<string, WeaponSpec>;
export function mapOf(id: string): MapSpec;
export function weaponOf(id: string): WeaponSpec;

export type Outfit = {
  id: string;
  name: string;
  primary: string;
  accent: string;
  gear: string;
  pattern: "woodland" | "digital" | "solid" | "circuit" | "fracture";
  palette: string[];
  armor: string;
  head: "helmet" | "hood" | "respirator" | "visor";
  description: string;
};
export const OUTFITS: Record<string, Outfit>;
export function outfitOf(id?: string): Outfit;
