import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { Arena, type ArenaState, type Input } from "../../../public/games/outpost-sim.js";

// HTTPS polling deliberately works on both Render and serverless deployments.
// Rooms live in the existing database, not a process-local host tab or socket.
type Member = {
  id: string;
  hash: string;
  name: string;
  team: number;
  lastSeen: number;
  inputAt: number;
  seq: number;
  input: Input;
};
type Room = {
  mode: "signal" | "duo";
  phase: "lobby" | "playing" | "ended";
  host: string;
  members: Member[];
  arena: ArenaState | null;
  updatedAt: number;
  nextName: number;
};
type Row = { version: number | string; state: Room };
export class OutpostError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const roomCode = () =>
  Array.from(randomBytes(6), (n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32]).join("");
const CODE = /^[A-Z2-9]{6}$/;
const TOKEN = /^[a-f0-9]{48}$/;
const rateState = globalThis as typeof globalThis & {
  __outpostCreateRate?: Map<string, { count: number; until: number }>;
};
function authorize(room: Room, id: unknown, token: unknown) {
  if (typeof id !== "string" || typeof token !== "string" || !TOKEN.test(token))
    throw new OutpostError("Room session is invalid. Join again.", 401);
  const member = room.members.find((m) => m.id === id);
  if (!member || !timingSafeEqual(Buffer.from(member.hash, "hex"), Buffer.from(sha(token), "hex")))
    throw new OutpostError("Room session is invalid. Join again.", 401);
  return member;
}
function publicRoom(code: string, room: Room) {
  return {
    code,
    mode: room.mode,
    phase: room.phase,
    host: room.host,
    members: room.members.map(({ id, name, team, lastSeen }) => ({
      id,
      name,
      team,
      connected: Date.now() - lastSeen < 20000,
    })),
    arena: room.arena
      ? { ...room.arena, entities: room.arena.entities.map((e) => ({ ...e, path: [] })) }
      : null,
  };
}
function inputOf(value: unknown): Input {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>,
    number = (k: string, limit: number) =>
      typeof v[k] === "number" && Number.isFinite(v[k])
        ? Math.max(-limit, Math.min(limit, v[k] as number))
        : 0;
  return {
    forward: number("forward", 1),
    strafe: number("strafe", 1),
    aim: number("aim", 100000),
    pitch: number("pitch", 1),
    sprint: v.sprint === true,
    fire: v.fire === true,
    reload: v.reload === true,
  };
}
function advance(room: Room, now: number) {
  if (room.phase !== "playing" || !room.arena) {
    room.updatedAt = now;
    return;
  }
  const arena = Arena.restore(room.arena);
  // Stop held movement/fire after a short silence; disconnects forfeit after
  // 20 seconds. Neither tab throttling nor a host leaving pauses everyone else.
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
  if (arena.state === "ended") room.phase = "ended";
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
    if (body.mode !== "signal" && body.mode !== "duo")
      throw new OutpostError("Choose Last Signal or Pair Ops.");
    const id = randomBytes(8).toString("hex"),
      token = randomBytes(24).toString("hex");
    const member: Member = {
      id,
      hash: sha(token),
      name: "Ranger 1",
      team: 0,
      lastSeen: now,
      inputAt: now,
      seq: -1,
      input: {},
    };
    const room: Room = {
      mode: body.mode,
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
      if (rows.length) return { ...publicRoom(code, room), id, token };
    }
    throw new OutpostError("Could not create a room. Try again.", 503);
  }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE.test(code)) throw new OutpostError("Enter a six-character room code.");
  const ops = ["join", "poll", "team", "start", "restart", "leave"];
  if (typeof body.op !== "string" || !ops.includes(body.op))
    throw new OutpostError("Unknown room action.");
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
    const now = Math.max(Date.now(), room.updatedAt);
    let member: Member;
    if (body.op === "join") {
      if (room.phase !== "lobby")
        throw new OutpostError(
          "This match has started. Join the next round or create a room.",
          409,
        );
      room.members = room.members.filter((m) => now - m.lastSeen < 20000);
      if (room.members.length >= 8) throw new OutpostError("Room is full.", 409);
      const team =
        room.mode === "duo"
          ? ([0, 1, 2, 3].find((t) => room.members.filter((m) => m.team === t).length < 2) ?? 0)
          : room.members.length;
      member = {
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
    advance(room, now);
    member.lastSeen = now;
    if (body.op === "poll") {
      const seq = typeof body.seq === "number" && Number.isSafeInteger(body.seq) ? body.seq : -1;
      if (seq > member.seq) {
        member.seq = seq;
        member.input = inputOf(body.input);
        member.inputAt = now;
        if (room.phase === "playing" && room.arena) {
          const arena = Arena.restore(room.arena),
            self = arena.entities.find((e) => e.id === member.id);
          // The packet can request a shot, never supply a target, damage or position.
          if (self && member.input.fire) {
            self.a = member.input.aim ?? self.a;
            self.pitch = member.input.pitch ?? 0;
            arena.shoot(self);
          }
          room.arena = arena.snapshot();
          if (arena.state === "ended") room.phase = "ended";
        }
      }
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
    if (body.op === "start" || body.op === "restart") {
      if (room.host !== member.id)
        throw new OutpostError("Only the room host can start a match.", 403);
      if (body.op === "restart") {
        if (room.phase !== "ended")
          throw new OutpostError("Finish this match before starting another.", 409);
        room.members = room.members.filter((m) => now - m.lastSeen < 20000);
        room.phase = "lobby";
        room.arena = null;
      } else {
        if (room.phase !== "lobby") throw new OutpostError("Match already started.", 409);
        room.members = room.members.filter((m) => now - m.lastSeen < 20000);
        room.arena = new Arena({
          mode: room.mode,
          humans: room.members.map(({ id, team, name }) => ({ id, team, name })),
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
        const arena = Arena.restore(room.arena);
        arena.detach(member.id);
        room.arena = arena.snapshot();
        if (arena.state === "ended") room.phase = "ended";
      }
      room.members = room.members.filter((m) => m !== member);
      if (room.host === member.id) room.host = room.members[0]?.id ?? "";
    }
    const updated =
      await sql`update outpost_room set state=${JSON.stringify(room)}::jsonb,version=version+1,expires_at=now()+interval '20 minutes' where code=${code} and version=${version} returning version`;
    if (updated.length)
      return {
        ...publicRoom(code, room),
        ...(body.op === "join" ? { id: joinedId, token: joinedToken } : {}),
      };
  }
  throw new OutpostError("Room is busy. Retrying…", 503);
}
