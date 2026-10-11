export type Input = {
  forward?: number;
  strafe?: number;
  aim?: number;
  pitch?: number;
  sprint?: boolean;
  fire?: boolean;
  reload?: boolean;
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
  maxHp: number;
  damage: number;
  cores: number;
  exposure: number;
  hit: number;
  shotAt: number;
  ammo: number;
  reloadUntil: number;
  kills: number;
  respawns: number;
  respawnAt: number;
  phase: number;
  attack: number;
  nextPath: number;
  path: { x: number; y: number }[];
  departed: boolean;
};
export type Crate = { id: string; x: number; y: number; hp: number; maxHp: number; hit: number };
export type ArenaState = {
  mode: string;
  time: number;
  state: string;
  winner: number | null;
  zone: { half: number; delay: number; duration: number; minHalf: number };
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
    humans?: { id: string; team: number; name?: string }[];
    random?: () => number;
  });
  static restore(data: ArenaState): Arena;
  mode: string;
  time: number;
  state: string;
  winner: number | null;
  entities: Entity[];
  events: { id: string; text: string }[];
  snapshot(): ArenaState;
  advance(dt: number, inputs?: Record<string, Input>): void;
  shoot(e: Entity): void;
  detach(id: string): void;
}
