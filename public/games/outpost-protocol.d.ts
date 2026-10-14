import { Arena, type ArenaState, type Difficulty, type Entity, type Input } from "./outpost-sim.js";

export type ProtocolRole = "operator" | "infiltrator";
export type ProtocolPhase = "roam" | "discussion" | "vote" | "combat" | "result";
export type ProtocolTask = { id: string; stationId: string; name: string; done: boolean };
export type ProtocolStation = {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  room: string;
};
export type ProtocolSite = { id: string; name: string; x: number; y: number; room: string };
export type ProtocolVent = { id: string; name: string; x: number; y: number; links: string[] };
export type ProtocolChannel = {
  kind:
    | "task"
    | "plant"
    | "wire"
    | "defuse"
    | "repair"
    | "collect"
    | "load"
    | "depart"
    | "deliver"
    | "repair-cargo"
    | "flight-task"
    | "disable-autopilot"
    | "cargo-sabotage";
  target: string;
  progress: number;
  duration: number;
  challenge?: {
    id: string;
    title: string;
    index: number;
    total: number;
    deadline: number;
    nextAt: number;
    feedback: string;
    prompt: string;
    options: { id: string; label: string }[];
    range: { min: number; max: number; target: number; tolerance: number } | null;
    complete: boolean;
  };
  code?: string;
  deadline?: number;
};
export type ProtocolSelf = {
  role: ProtocolRole;
  contributions?: Record<string, number>;
  deathScene?: { id: string; kind: string; at: number } | null;
  tasks: ProtocolTask[];
  channel: ProtocolChannel | null;
  actionSeq: number;
  lastActionSeq: number;
  killReadyAt: number;
  sabotageReadyAt: number;
  ventReadyAt: number;
  emergenciesLeft: number;
  allies?: { id: string; name: string }[];
  cargo: { supplyId: string; name: string } | null;
};
export type MedicalMission = {
  version: 1;
  phase: "base" | "transport" | "delivered";
  title: string;
  interactiveTasks?: boolean;
  flightTasks: {
    id: string;
    name: string;
    x: number;
    y: number;
    room: string;
    duration: number;
    system: string | null;
    done: boolean;
  }[];
  manifest: { id: string; name: string; required: number; loaded: number }[];
  supplyStock: {
    id: string;
    supplyId: string;
    name: string;
    stock: number;
    x: number;
    y: number;
    room: string;
  }[];
  loading: { id: string; name: string; x: number; y: number; room: string };
  patients: {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    decay: number;
    rescued: boolean;
  }[];
  vehicle: {
    name: string;
    autopilot: boolean;
    pilotId: string | null;
    progress: number;
    duration: number;
    altitude: number;
    heading: number;
    stability: number;
    underControl: boolean;
    stableFor: number;
    recoveryDeadline: number | null;
    disabledAt: number | null;
    arrived: boolean;
    cargoDamage: number;
  };
  startedAt: number;
  departedAt: number | null;
  deliveredAt: number | null;
};
export type ProtocolMeeting = {
  id: string;
  caller: string;
  reason: string;
  discussionUntil: number;
  voteUntil: number;
  votes: Record<string, string>;
  messages: { id: number; sender: string; name: string; text: string }[];
  result?: string | null;
};
export type PublicProtocolState = {
  [key: string]: unknown;
  phase: ProtocolPhase;
  roundEndsAt: number;
  taskDone: number;
  taskTotal: number;
  armedCount: number;
  detonateAt: number | null;
  sabotage: { powerUntil: number; commsUntil: number };
  bodies: {
    id: string;
    victimId: string;
    name: string;
    x: number;
    y: number;
    reported: boolean;
    carriedBy?: string | null;
  }[];
  bombs: {
    id: string;
    siteId: string;
    name: string;
    room: string;
    x: number;
    y: number;
    state: "armed";
    armedAt: number;
  }[];
  sites: ProtocolSite[];
  stations: ProtocolStation[];
  vents: ProtocolVent[];
  emergency: { id?: string; x: number; y: number };
  meeting: ProtocolMeeting | null;
  combat: {
    id: string;
    targetId: string;
    participants: string[];
    startsAt: number;
    endsAt: number;
    result: string | null;
    resultUntil: number | null;
  } | null;
  log: { id: number; text: string }[];
  self: ProtocolSelf | null;
  revealedRoles?: Record<string, ProtocolRole>;
  resultReason?: string;
  mission: MedicalMission;
};
export type ProtocolState = PublicProtocolState & {
  self: null;
  authoritative: true;
  version: number;
  players: Record<
    string,
    ProtocolSelf & {
      discoveredBombs: string[];
      discoveredBodies: string[];
      observations: {
        kind: string;
        actorId: string;
        subjectId: string | null;
        at: number;
        room: string;
      }[];
      [key: string]: unknown;
    }
  >;
  [key: string]: unknown;
};
export type ProtocolArenaState = ArenaState & { protocol: ProtocolState };
export type ProtocolViewState = ArenaState & { protocol: PublicProtocolState };
export type ProtocolOptions = {
  /** New rounds opt in; saved rooms without this flag retain their old tasks. */
  interactiveTasks?: boolean;
  mode?: string;
  difficulty?: Difficulty;
  countdown?: number;
  mapId?: string;
  weapon?: string;
  humans?: { id: string; team?: number; name?: string; weapon?: string }[];
  random?: () => number;
  /** Accepted only for local games; online rooms ignore role preferences. */
  rolePreference?: ProtocolRole | "random";
};
export const PROTOCOL_RULES: Readonly<
  Record<
    | "seats"
    | "infiltrators"
    | "tasksPerOperator"
    | "taskDuration"
    | "plantDuration"
    | "wireWindow"
    | "defuseDuration"
    | "repairDuration"
    | "chargesRequired"
    | "fuseDuration"
    | "matchDuration"
    | "interactRange"
    | "discoveryRange"
    | "reportRange"
    | "eliminateRange"
    | "consoleRange"
    | "killCooldown"
    | "sabotageCooldown"
    | "sabotageDuration"
    | "ventCooldown"
    | "discussionDuration"
    | "voteDuration"
    | "emergencyCooldown"
    | "collectDuration"
    | "loadDuration"
    | "departDuration"
    | "deliveryDuration"
    | "autopilotSabotageDuration"
    | "cargoSabotageDuration"
    | "cargoRepairDuration"
    | "recoveryDuration"
    | "stabilizationDuration",
    number
  >
>;
export class ProtocolArena extends Arena {
  constructor(options?: ProtocolOptions);
  static restore(data: ArenaState): Arena;
  protocol: ProtocolState;
  presentationOnly?: boolean;
  snapshot(): ProtocolArenaState;
  advance(dt: number, inputs?: Record<string, Input>): void;
  checkResult(): void;
  detach(id: string): void;
  departMission(entity: Entity): boolean;
  manifestComplete(): boolean;
  flightTasksComplete(): boolean;
  context(entity: Entity):
    | (Pick<ProtocolChannel, "kind" | "target" | "duration"> & {
        taskId?: string;
      })
    | null;
}
export function createArena(options?: ProtocolOptions): Arena;
export function restoreArena(data: ArenaState): Arena;
export function protocolView(data: ArenaState, selfId: string): ProtocolViewState;
