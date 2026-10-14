import { modifierChoice } from "../../../public/games/outpost-variety.js";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import {
  MAPS,
  WEAPONS,
  OUTFITS,
  DIFFICULTIES,
  difficultyOf,
  type Difficulty,
  type ArenaState,
  type Input,
} from "../../../public/games/outpost-sim.js";
import {
  createArena,
  restoreArena,
  protocolView,
  type ProtocolArenaState,
} from "../../../public/games/outpost-protocol.js";

// Durable rooms support HTTP fallback and a single authoritative live runner.
// Private state stays in the database/runner; every response is recipient-filtered.
export type Member = {
  id: string;
  hash: string;
  name: string;
  team: number;
  weapon: string;
  outfit?: string;
  lastSeen: number;
  inputAt: number;
  seq: number;
  motionSeq?: number;
  input: Input;
};
export type Room = {
  difficulty?: Difficulty;
  /** Announce a removed player's role after Last Stand (host setting, default on). */
  reveal?: boolean;
  /** A locked match modifier id, or "random" (host setting). */
  modifier?: string;
  mode: "protocol" | "signal" | "duo";
  mapId: string;
  phase: "lobby" | "playing" | "ended";
  host: string;
  members: Member[];
  arena: ArenaState | null;
  updatedAt: number;
  nextName: number;
};
export type Row = { version: number | string; state: Room };
export class OutpostError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
/** Versioned checkpoints reject a second writer instead of overwriting a room. */
export async function loadRoomRecord(code: string): Promise<Row> {
  if (!CODE.test(code)) throw new OutpostError("Enter a six-character room code.");
  const sql = await getSql();
  const rows =
    await sql<Row>`select version,state from outpost_room where code=${code} and expires_at>now()`;
  if (!rows.length) throw new OutpostError("Room not found or expired. Create another room.", 404);
  return rows[0];
}
export async function saveRoomRecord(
  code: string,
  room: Room,
  version: number,
): Promise<number | null> {
  const sql = await getSql();
  const updated = await sql<{
    version: number;
  }>`update outpost_room set state=${JSON.stringify(room)}::jsonb,version=version+1,expires_at=now()+interval '20 minutes' where code=${code} and version=${version} returning version`;
  return updated.length ? Number(updated[0].version) : null;
}
function outfitId(value: unknown): string {
  if (value === undefined) return "ranger";
  if (typeof value !== "string" || !Object.hasOwn(OUTFITS, value))
    throw new OutpostError("Choose a valid outfit.");
  return value;
}
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const roomCode = () =>
  Array.from(randomBytes(6), (n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32]).join("");
const CODE = /^[A-Z2-9]{6}$/;
const TOKEN = /^[a-f0-9]{48}$/;
const ROOM_ACTIONS = new Set([
  "join",
  "poll",
  "resume",
  "team",
  "start",
  "restart",
  "leave",
  "settings",
  "loadout",
  "rematch",
]);
const rateState = globalThis as typeof globalThis & {
  __outpostCreateRate?: Map<string, { count: number; until: number }>;
};
export function authorize(room: Room, id: unknown, token: unknown) {
  if (typeof id !== "string" || typeof token !== "string" || !TOKEN.test(token))
    throw new OutpostError("Room session is invalid. Join again.", 401);
  const member = room.members.find((m) => m.id === id);
  if (!member || !timingSafeEqual(Buffer.from(member.hash, "hex"), Buffer.from(sha(token), "hex")))
    throw new OutpostError("Room session is invalid. Join again.", 401);
  return member;
}
// Full protocol state is database-only. Every response is generated for the
// authenticated recipient, including the create/join and leave responses.
export function publicRoom(code: string, room: Room, selfId: string) {
  const protocol = room.mode === "protocol";
  const arena = room.arena ? protocolView(room.arena, selfId) : null;
  return {
    code,
    serverAt: room.updatedAt,
    difficulty: room.difficulty || "normal",
    reveal: room.reveal !== false,
    modifier: modifierChoice(room.modifier),
    mode: room.mode,
    // The aircraft is reached by the authoritative mission transition, never
    // selected from a lobby. Keep the room envelope in sync with that map.
    mapId: protocol
      ? room.phase !== "lobby" && room.arena
        ? room.arena.mapId || "breakwater"
        : "breakwater"
      : room.mapId || "outpost",
    phase: room.phase,
    host: room.host,
    members: room.members.map(({ id, name, team, weapon, outfit, lastSeen }) => ({
      id,
      name,
      ...(protocol ? {} : { team }),
      weapon: protocol ? "carbine" : weapon || "carbine",
      outfit: protocol ? "ranger" : outfit || "ranger",
      connected: Date.now() - lastSeen < 20000,
    })),
    ack: room.members.find((m) => m.id === selfId)?.seq ?? -1,
    motionAck: room.members.find((m) => m.id === selfId)?.motionSeq ?? -1,
    arena: arena ? { ...arena, entities: arena.entities.map((e) => ({ ...e, path: [] })) } : null,
  };
}
const PROTOCOL_OPS = new Set([
  "task-begin",
  "task-step",
  "task-cancel",
  "report",
  "meeting",
  "eliminate",
  "sabotage",
  "vent",
  "vote",
  "chat",
  "wire",
  "drag",
  "helm",
  "release-helm",
  "autopilot",
  "cargo-sabotage",
  "disable-autopilot",
]);
// Mission maps have different spawn/objective rules from the combat arenas.
// The transport map is internal even in protocol lobbies: loading supplies is
// the only route to it, so clients cannot skip the gathering phase.
export function lobbyMapOf(mode: Room["mode"], value: unknown = undefined): string {
  if (value === "medevac")
    throw new OutpostError("The medevac route opens after loading the mission supplies.");
  if (mode === "protocol") return "breakwater";
  const mapId = value === undefined ? "outpost" : value;
  if (typeof mapId !== "string" || !Object.hasOwn(MAPS, mapId) || mapId === "breakwater")
    throw new OutpostError("Choose a valid combat map.");
  return mapId;
}
/** Public play is Blackout Protocol only; old clients cannot re-enable combat. */
export function playableModeOf(value: unknown = undefined): "protocol" {
  if (value === undefined || value === "protocol") return "protocol";
  throw new OutpostError(
    "Only Blackout Protocol is available. Update the game and create a new room.",
  );
}
// Only intent crosses this boundary: simulation decides roles, locations,
// progress, cooldowns and outcomes. Large strings and forged fields are dropped.
export function inputOf(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>,
    number = (k: string, limit: number) =>
      typeof v[k] === "number" && Number.isFinite(v[k])
        ? Math.max(-limit, Math.min(limit, v[k] as number))
        : 0;
  const input: Input = {
    forward: number("forward", 1),
    strafe: number("strafe", 1),
    aim: number("aim", 100000),
    pitch: number("pitch", 1),
    sprint: v.sprint === true,
    slide: v.slide === true,
    fire: v.fire === true,
    reload: v.reload === true,
    super: v.super === true,
    interact: v.interact === true,
  };
  const vehicle = v.vehicleInput;
  if (vehicle && typeof vehicle === "object" && !Array.isArray(vehicle)) {
    const axes = vehicle as Record<string, unknown>;
    const axis = (key: string) =>
      typeof axes[key] === "number" && Number.isFinite(axes[key])
        ? Math.max(-1, Math.min(1, axes[key] as number))
        : 0;
    input.vehicleInput = { pitch: axis("pitch"), steer: axis("steer") };
  }
  const action = v.protocolAction;
  if (action && typeof action === "object" && !Array.isArray(action)) {
    const a = action as Record<string, unknown>;
    const seq = a.seq;
    if (
      typeof seq === "number" &&
      Number.isSafeInteger(seq) &&
      seq >= 0 &&
      typeof a.op === "string" &&
      PROTOCOL_OPS.has(a.op)
    ) {
      // Reject malformed optional fields rather than truncating an entity ID or
      // silently submitting a different arming code than the player requested.
      const targetValid =
        a.target === undefined ||
        (typeof a.target === "string" &&
          a.target.length <= 80 &&
          !/[\u0000-\u001f\u007f]/.test(a.target));
      const valueValid =
        a.value === undefined ||
        (typeof a.value === "string" &&
          a.value.length <= 180 &&
          !/[\u0000-\u001f\u007f]/.test(a.value));
      if (targetValid && valueValid) {
        input.protocolAction = {
          seq,
          op: a.op,
          ...(typeof a.target === "string" ? { target: a.target.trim() } : {}),
          ...(typeof a.value === "string" ? { value: a.value.trim() } : {}),
        };
      }
    }
  }
  return input;
}
export function advanceRoom(room: Room, now: number) {
  if (room.phase !== "playing" || !room.arena) {
    room.updatedAt = now;
    return;
  }
  const arena = restoreArena(room.arena);
  // Stop held movement, interactions and flight axes after a short silence.
  // Disconnects forfeit after 20 seconds. Tab throttling or a host leaving
  // never pauses everyone else.
  for (const member of room.members) if (now - member.lastSeen > 20000) arena.detach(member.id);
  const inputs: Record<string, Input> = {};
  for (const member of room.members)
    inputs[member.id] = now - member.inputAt < 700 ? member.input : {};
  let remaining = Math.max(0, Math.min(2, (now - room.updatedAt) / 1000));
  while (remaining > 0.0001 && arena.state !== "ended") {
    const dt = Math.min(0.05, remaining);
    arena.advance(dt, inputs);
    remaining -= dt;
  }
  room.updatedAt = now;
  room.arena = arena.snapshot();
  for (const member of room.members) member.motionSeq = member.seq;
  if (arena.state === "ended") room.phase = "ended";
}
/** One transactional action core shared by HTTP and the WebSocket runner. */
export function applyRoomAction(
  room: Room,
  body: Record<string, unknown>,
  now: number,
  joinedId = randomBytes(8).toString("hex"),
  joinedToken = randomBytes(24).toString("hex"),
) {
  if (typeof body.op !== "string" || !ROOM_ACTIONS.has(body.op))
    throw new OutpostError("Unknown room action.");
  let member: Member;
  if (body.op === "join") {
    if (room.phase !== "lobby")
      throw new OutpostError("This match has started. Join the next round or create a room.", 409);
    room.members = room.members.filter((m) => now - m.lastSeen < 20000);
    if (room.members.length >= 8) throw new OutpostError("Room is full.", 409);
    const team =
      room.mode === "protocol"
        ? 0
        : room.mode === "duo"
          ? ([0, 1, 2, 3].find((t) => room.members.filter((m) => m.team === t).length < 2) ?? 0)
          : room.members.length;
    const weapon =
      room.mode === "protocol" ? "carbine" : body.weapon === undefined ? "carbine" : body.weapon;
    if (typeof weapon !== "string" || !Object.hasOwn(WEAPONS, weapon))
      throw new OutpostError("Choose a valid loadout.");
    member = {
      weapon,
      outfit: "ranger",
      id: joinedId,
      hash: sha(joinedToken),
      name: "Ranger " + room.nextName++,
      team,
      lastSeen: now,
      inputAt: now,
      seq: -1,
      input: {},
    };
    room.members.push(member);
  } else member = authorize(room, body.id, body.token);
  const oldHost = room.members.find((m) => m.id === room.host);
  if (!oldHost || now - oldHost.lastSeen > 20000)
    room.host = room.members.find((m) => now - m.lastSeen < 20000)?.id ?? member.id;
  advanceRoom(room, now);
  member.lastSeen = now;
  if (body.op === "poll") {
    const seq =
      typeof body.seq === "number" && Number.isSafeInteger(body.seq) && body.seq >= 0
        ? body.seq
        : -1;
    if (seq > member.seq) {
      member.seq = seq;
      member.input = inputOf(body.input);
      if (room.mode === "protocol") {
        // Only the server's voted combat phase unlocks weapon intentions.
        // A client-sent phase/target/damage never changes this decision.
        const fighting = (room.arena as ProtocolArenaState | null)?.protocol?.phase === "combat";
        if (!fighting) member.input.fire = member.input.reload = false;
        member.input.super = false;
      }
      member.inputAt = now;
      if (room.phase === "playing" && room.arena) {
        const arena = restoreArena(room.arena),
          self = arena.entities.find((e) => e.id === member.id);
        // The packet can request a shot, never supply a target, damage or position.
        if (self && (member.input.fire || member.input.super || member.input.reload)) {
          self.a = member.input.aim ?? self.a;
          self.pitch = member.input.pitch ?? 0;
          if (member.input.super) arena.super(self);
          member.input.super = false;
          if (member.input.fire) arena.shoot(self);
          if (member.input.reload) arena.reload(self);
        }
        room.arena = arena.snapshot();
        if (arena.state === "ended") room.phase = "ended";
      }
    }
  }
  if (body.op === "settings") {
    if (room.host !== member.id)
      throw new OutpostError("Only the host can choose match settings.", 403);
    if (room.phase !== "lobby")
      throw new OutpostError("Choose match settings before starting.", 409);
    if (body.mode !== undefined) {
      room.mode = playableModeOf(body.mode);
    }
    if (room.mode === "protocol") {
      room.mapId = lobbyMapOf(room.mode, body.mapId);
      for (const m of room.members) {
        m.team = 0;
        m.weapon = "carbine";
      }
    } else if (body.mapId !== undefined) {
      room.mapId = lobbyMapOf(room.mode, body.mapId);
    }
    if (body.difficulty !== undefined) {
      if (typeof body.difficulty !== "string" || !Object.hasOwn(DIFFICULTIES, body.difficulty))
        throw new OutpostError("Invalid bot difficulty.");
      room.difficulty = difficultyOf(body.difficulty);
    }
    if (body.reveal !== undefined) {
      if (typeof body.reveal !== "boolean") throw new OutpostError("Invalid reveal setting.");
      room.reveal = body.reveal;
    }
    if (body.modifier !== undefined) {
      if (typeof body.modifier !== "string" || modifierChoice(body.modifier) !== body.modifier)
        throw new OutpostError("Invalid match modifier.");
      room.modifier = body.modifier;
    }
  }
  if (body.op === "loadout") {
    if (room.phase !== "lobby") throw new OutpostError("Choose your loadout before starting.", 409);
    if (
      room.mode !== "protocol" &&
      (typeof body.weapon !== "string" || !Object.hasOwn(WEAPONS, body.weapon))
    )
      throw new OutpostError("Invalid loadout.");
    const outfit =
      room.mode === "protocol"
        ? "ranger"
        : body.outfit === undefined
          ? member.outfit || "ranger"
          : outfitId(body.outfit);
    member.weapon = room.mode === "protocol" ? "carbine" : (body.weapon as string);
    member.outfit = outfit;
  }
  if (body.op === "team") {
    if (room.phase !== "lobby" || room.mode !== "duo")
      throw new OutpostError("Teams can be changed in a Pair Ops lobby only.", 409);
    if (
      typeof body.team !== "number" ||
      !Number.isInteger(body.team) ||
      body.team < 0 ||
      body.team > 3
    )
      throw new OutpostError("Invalid team.");
    if (room.members.filter((m) => m.id !== member.id && m.team === body.team).length >= 2)
      throw new OutpostError("That pair is full.", 409);
    member.team = body.team;
  }
  if (body.op === "start" || body.op === "restart" || body.op === "rematch") {
    if (room.host !== member.id)
      throw new OutpostError("Only the room host can start a match.", 403);
    if (room.mode === "protocol") {
      room.mapId = "breakwater";
      for (const m of room.members) {
        m.team = 0;
        m.weapon = "carbine";
      }
    } else {
      room.mapId = lobbyMapOf(room.mode, room.mapId);
    }
    if (body.op === "rematch") {
      if (room.phase !== "ended")
        throw new OutpostError("Finish this match before starting another.", 409);
      room.members = room.members.filter((m) => now - m.lastSeen < 20000);
      room.arena = createArena({
        interactiveTasks: true,
        mode: room.mode,
        mapId: room.mapId || "outpost",
        difficulty: room.difficulty || "normal",
        revealRoles: room.reveal !== false,
        variety: true,
        modifier: modifierChoice(room.modifier),
        countdown: 2,
        humans: room.members.map(({ id, team, name, weapon, outfit }) => ({
          id,
          team,
          name,
          weapon: weapon || "carbine",
          outfit: outfit || "ranger",
        })),
      }).snapshot();
      room.phase = "playing";
    } else if (body.op === "restart") {
      if (room.phase !== "ended")
        throw new OutpostError("Finish this match before starting another.", 409);
      room.members = room.members.filter((m) => now - m.lastSeen < 20000);
      room.phase = "lobby";
      room.arena = null;
    } else {
      if (room.phase !== "lobby") throw new OutpostError("Match already started.", 409);
      room.members = room.members.filter((m) => now - m.lastSeen < 20000);
      room.arena = createArena({
        interactiveTasks: true,
        mode: room.mode,
        mapId: room.mapId || "outpost",
        difficulty: room.difficulty || "normal",
        revealRoles: room.reveal !== false,
        variety: true,
        modifier: modifierChoice(room.modifier),
        humans: room.members.map(({ id, team, name, weapon, outfit }) => ({
          id,
          team,
          name,
          weapon: weapon || "carbine",
          outfit: outfit || "ranger",
        })),
      }).snapshot();
      room.phase = "playing";
    }
    for (const m of room.members) {
      m.input = {};
      m.inputAt = now;
    }
    room.updatedAt = now;
  }
  if (body.op === "leave") {
    if (room.arena) {
      const arena = restoreArena(room.arena);
      arena.detach(member.id);
      room.arena = arena.snapshot();
      if (arena.state === "ended") room.phase = "ended";
    }
    room.members = room.members.filter((m) => m !== member);
    if (room.host === member.id) room.host = room.members[0]?.id ?? "";
  }
  return { id: member.id, ...(body.op === "join" ? { token: joinedToken } : {}) };
}

export async function roomAction(body: Record<string, unknown>, clientKey: string) {
  const sql = await getSql(),
    now = Date.now();
  if (body.op === "create") {
    const rates = (rateState.__outpostCreateRate ??= new Map());
    const key = sha(clientKey),
      rate = rates.get(key);
    if (rate && rate.until > now && rate.count >= 12)
      throw new OutpostError("Too many rooms. Try again in a minute.", 429);
    rates.set(key, {
      count: rate && rate.until > now ? rate.count + 1 : 1,
      until: rate && rate.until > now ? rate.until : now + 60000,
    });
    for (const [k, v] of rates) if (v.until < now) rates.delete(k);
    const mode = playableModeOf(body.mode);
    const difficulty = body.difficulty === undefined ? "normal" : body.difficulty;
    if (typeof difficulty !== "string" || !Object.hasOwn(DIFFICULTIES, difficulty))
      throw new OutpostError("Invalid bot difficulty.");
    const mapId = lobbyMapOf(mode, body.mapId);
    const weapon =
      mode === "protocol" ? "carbine" : body.weapon === undefined ? "carbine" : body.weapon;
    if (
      typeof mapId !== "string" ||
      !Object.hasOwn(MAPS, mapId) ||
      typeof weapon !== "string" ||
      !Object.hasOwn(WEAPONS, weapon)
    )
      throw new OutpostError("Choose a valid map and loadout.");
    const id = randomBytes(8).toString("hex"),
      token = randomBytes(24).toString("hex");
    const member: Member = {
      id,
      hash: sha(token),
      name: "Ranger 1",
      weapon,
      outfit: "ranger",
      team: 0,
      lastSeen: now,
      inputAt: now,
      seq: -1,
      input: {},
    };
    const room: Room = {
      mode,
      difficulty: difficultyOf(difficulty),
      mapId,
      phase: "lobby",
      host: id,
      members: [member],
      arena: null,
      updatedAt: now,
      nextName: 2,
    };
    await sql`delete from outpost_room where expires_at < now()`;
    const count = await sql<{ n: number }>`select count(*)::int as n from outpost_room`;
    if (count[0].n >= 1000) throw new OutpostError("Rooms are busy. Try again shortly.", 503);
    for (let i = 0; i < 4; i++) {
      const code = roomCode();
      const rows =
        await sql`insert into outpost_room (code,state,expires_at) values (${code},${JSON.stringify(room)}::jsonb,now()+interval '20 minutes') on conflict do nothing returning code`;
      if (rows.length) return { ...publicRoom(code, room, id), id, token };
    }
    throw new OutpostError("Could not create a room. Try again.", 503);
  }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE.test(code)) throw new OutpostError("Enter a six-character room code.");
  const ops = [
    "join",
    "poll",
    "resume",
    "team",
    "start",
    "restart",
    "leave",
    "settings",
    "loadout",
    "rematch",
  ];
  if (typeof body.op !== "string" || !ops.includes(body.op))
    throw new OutpostError("Unknown room action.");
  const live = (
    globalThis as typeof globalThis & {
      __outpostLiveActions?: Map<
        string,
        (body: Record<string, unknown>, key: string) => Promise<unknown>
      >;
    }
  ).__outpostLiveActions?.get(code);
  if (live) return live(body, clientKey);
  // Capability IDs are minted once per join, outside the compare-and-swap retry.
  const joinedId = randomBytes(8).toString("hex"),
    joinedToken = randomBytes(24).toString("hex");
  for (let attempt = 0; attempt < 12; attempt++) {
    const rows =
      await sql<Row>`select version,state from outpost_room where code=${code} and expires_at>now()`;
    if (!rows.length)
      throw new OutpostError("Room not found or expired. Create another room.", 404);
    const { version } = rows[0],
      room = rows[0].state;
    if (room.mode !== "protocol" && body.op !== "leave")
      throw new OutpostError(
        "This room uses a retired mode. Create a Blackout Protocol room.",
        409,
      );
    const result = applyRoomAction(
      room,
      body,
      Math.max(Date.now(), room.updatedAt),
      joinedId,
      joinedToken,
    );
    const updated =
      await sql`update outpost_room set state=${JSON.stringify(room)}::jsonb,version=version+1,expires_at=now()+interval '20 minutes' where code=${code} and version=${version} returning version`;
    if (updated.length)
      return {
        ...publicRoom(code, room, result.id),
        ...(["join", "resume"].includes(body.op as string)
          ? { id: result.id, token: body.op === "join" ? result.token : (body.token as string) }
          : {}),
      };
  }
  throw new OutpostError("Room is busy. Retrying…", 503);
}
