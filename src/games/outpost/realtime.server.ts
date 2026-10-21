import type { Peer, Hooks } from "crossws";
import { createHmac } from "node:crypto";
import {
  applyRoomAction,
  advanceRoom,
  authorize,
  inputOf,
  publicRoom,
  loadRoomRecord,
  saveRoomRecord,
  OutpostError,
  type Room,
  type Row,
  type Member,
} from "./rooms.server";
import { restoreArena, type ProtocolArenaState } from "../../../public/games/outpost-protocol.js";

const STEP = 50,
  CHECKPOINT = 500;
/** Standard optional TURN relay; only expiring credentials go to members. */
export function voiceIceServers(id: string) {
  const servers: Record<string, unknown>[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const urls = (process.env.OUTPOST_TURN_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^turns?:\S+$/.test(s));
  const secret = process.env.OUTPOST_TURN_SECRET;
  if (urls.length && secret) {
    const username = Math.floor(Date.now() / 1000 + 600) + ":" + id;
    servers.push({
      urls,
      username,
      credential: createHmac("sha1", secret).update(username).digest("base64"),
    });
  }
  return servers;
}
type Session = {
  id: string;
  token: string;
  peer: Peer;
  lastStatic: string;
  voice: boolean;
  audioAt?: number;
  audioCount?: number;
};
type Store = {
  load: (code: string) => Promise<Row>;
  save: (code: string, room: Room, version: number) => Promise<number | null>;
};
const state = globalThis as typeof globalThis & {
  __outpostLiveActions?: Map<
    string,
    (body: Record<string, unknown>, key: string) => Promise<unknown>
  >;
  __outpostLiveRooms?: Map<string, Promise<LiveRoom>>;
};
const rooms = (state.__outpostLiveRooms ||= new Map());
const handlers = (state.__outpostLiveActions ||= new Map());

/** A connected room simulates once at 20 Hz, not once per HTTP request/player.
 * SQL checkpoints run off the tick path. Private state is never broadcast. */
export class LiveRoom {
  room: Room;
  version: number;
  game: ReturnType<typeof restoreArena> | null;
  sessions = new Map<string, Session>();
  timer: ReturnType<typeof setInterval> | null = null;
  emptyTimer: ReturnType<typeof setTimeout> | null = null;
  last = Date.now();
  accumulator = 0;
  tick = 0;
  closed = false;
  lastSave = 0;
  applied = new Map<string, number>();
  saving: Promise<void> | null = null;
  queue: Promise<unknown> = Promise.resolve();
  constructor(
    readonly code: string,
    row: Row,
    readonly store: Store = { load: loadRoomRecord, save: saveRoomRecord },
  ) {
    this.room = row.state;
    advanceRoom(this.room, Date.now());
    this.version = Number(row.version);
    this.game = this.room.arena ? restoreArena(this.room.arena) : null;
    for (const m of this.room.members) this.applied.set(m.id, m.motionSeq ?? m.seq);
  }
  snapshot() {
    if (this.game) this.room.arena = this.game.snapshot();
    return this.room;
  }
  start() {
    handlers.set(this.code, (body: Record<string, unknown>) => this.action(body));
    this.timer = setInterval(() => this.advance(Date.now()), STEP);
    this.timer.unref?.();
  }
  advance(now: number) {
    if (this.closed) return;
    this.accumulator += Math.min(200, Math.max(0, now - this.last));
    this.last = now;
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      this.tick++;
      if (this.game && this.room.phase === "playing") {
        const inputs: Record<string, ReturnType<typeof inputOf>> = {};
        for (const member of this.room.members) {
          if (now - member.lastSeen > 20000) this.game.detach(member.id);
          inputs[member.id] = now - member.inputAt < 700 ? member.input : {};
        }
        this.game.advance(STEP / 1000, inputs);
        if (this.game.state === "ended") this.room.phase = "ended";
      }
      this.room.updatedAt = now;
      for (const m of this.room.members) {
        this.applied.set(m.id, m.seq);
        m.motionSeq = m.seq;
      }
    }
    this.snapshot();
    this.broadcast();
    if (now - this.lastSave >= CHECKPOINT) void this.checkpoint();
  }
  attach(peer: Peer, id: unknown, token: unknown) {
    if (this.closed) throw new OutpostError("Room is reconnecting.", 503);
    if (this.emptyTimer) {
      clearTimeout(this.emptyTimer);
      this.emptyTimer = null;
    }
    const member = authorize(this.room, id, token);
    if (Date.now() - member.lastSeen > 20000 && this.game) this.game.detach(member.id);
    if (this.sessions.has(member.id))
      this.sessions.get(member.id)!.peer.close(4001, "Session resumed elsewhere");
    member.lastSeen = Date.now();
    member.input = {};
    member.inputAt = member.lastSeen;
    const session = { id: member.id, token: token as string, peer, lastStatic: "", voice: false };
    this.sessions.set(member.id, session);
    return session;
  }
  touch(session: Session) {
    const m = this.room.members.find((m) => m.id === session.id);
    if (m) m.lastSeen = Date.now();
    return m;
  }
  input(session: Session, packet: Record<string, unknown>) {
    const m = this.touch(session);
    if (!m) return;
    const seq = packet.seq;
    if (typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0 || seq <= m.seq) return;
    m.seq = seq;
    m.input = inputOf(packet.input);
    m.inputAt = Date.now();
    const combat = (this.room.arena as ProtocolArenaState | null)?.protocol?.phase === "combat";
    if (!combat) m.input.fire = m.input.reload = false;
    m.input.super = false;
  }
  /** Rare lobby/rematch operations reuse exactly the validated HTTP action core.
   * Work on a copy: a rejected action cannot partially alter the live match. */
  action(body: Record<string, unknown>): Promise<unknown> {
    const work = this.queue
      .catch(() => {})
      .then(async () => {
        if (this.closed) throw new OutpostError("Room is reconnecting. Try again.", 503);
        if (body.op === "poll") {
          const member = authorize(this.room, body.id, body.token);
          const session = this.sessions.get(member.id) || {
            id: member.id,
            token: body.token as string,
            peer: null as unknown as Peer,
            lastStatic: "",
            voice: false,
          };
          this.input(session, body);
          return this.response(member.id);
        }
        this.snapshot();
        const next = structuredClone(this.room),
          now = Date.now();
        next.updatedAt = now;
        const result = applyRoomAction(next, body, now);
        this.room = next;
        this.game = next.arena ? restoreArena(next.arena) : null;
        const payload = {
          ...this.response(result.id),
          ...(["join", "resume"].includes(body.op as string)
            ? { id: result.id, token: body.op === "join" ? result.token : body.token }
            : {}),
        };
        if (body.op === "leave") this.sessions.get(result.id)?.peer.close(1000, "Left room");
        this.broadcast();
        await this.checkpoint(true);
        return payload;
      });
    this.queue = work;
    return work;
  }
  response(id: string) {
    return {
      ...publicRoom(this.code, this.room, id),
      ack: this.applied.get(id) ?? -1,
      motionAck: this.applied.get(id) ?? -1,
    };
  }
  broadcast() {
    for (const session of this.sessions.values()) {
      if (session.peer.bufferedAmount > 512 * 1024) {
        session.peer.close(1013, "Connection catching up");
        continue;
      }
      const payload = this.response(session.id),
        arena = payload.arena;
      // Map collision grids are identical for every frame until the map/round
      // changes. Omit only that public field; replace all private orders in full.
      const key = arena
        ? arena.roundId + ":" + arena.mapId + ":" + JSON.stringify(arena.level)
        : "lobby";
      const full = key !== session.lastStatic;
      session.lastStatic = key;
      if (arena && !full) delete (arena as Partial<typeof arena>).level;
      session.peer.send(JSON.stringify({ type: "state", tick: this.tick, full, room: payload }));
      if (this.tick % 10 === 0)
        session.peer.send(JSON.stringify({ type: "voice-peers", peers: this.voicePeers(session) }));
    }
  }
  eligible(id: string) {
    const e = this.game?.entities.find((e) => e.id === id);
    return this.room.phase === "playing" && !!e && e.hp > 0 && !e.departed;
  }
  voicePeers(session: Session) {
    if (!session.voice || !this.eligible(session.id)) return [];
    const self = this.game!.entities.find((e) => e.id === session.id)!;
    const protocol = (this.room.arena as ProtocolArenaState)?.protocol;
    const meeting =
      ["discussion", "vote"].includes(protocol.phase) &&
      !(protocol.sabotage.commsUntil > this.game!.time);
    return [...this.sessions.values()]
      .filter((s) => s.id !== session.id && s.voice && this.eligible(s.id))
      .filter((s) => {
        const e = this.game!.entities.find((e) => e.id === s.id)!;
        const d = Math.hypot(e.x - self.x, e.y - self.y);
        return meeting || (d < 5.5 && (d < 2.5 || this.game!.visible(self, e)));
      })
      .map((s) => ({ id: s.id, name: this.room.members.find((m) => m.id === s.id)!.name }));
  }
  signal(session: Session, packet: Record<string, unknown>) {
    if (typeof packet.to !== "string" || !this.voicePeers(session).some((p) => p.id === packet.to))
      return;
    const to = this.sessions.get(packet.to);
    if (!to) return;
    const payload: Record<string, unknown> = { type: "rtc", from: session.id };
    const d = packet.description as Record<string, unknown> | undefined,
      c = packet.candidate as Record<string, unknown> | undefined;
    if (
      d &&
      ["offer", "answer"].includes(d.type as string) &&
      typeof d.sdp === "string" &&
      d.sdp.length <= 12000
    )
      payload.description = { type: d.type, sdp: d.sdp };
    else if (c && typeof c.candidate === "string" && c.candidate.length <= 1500)
      payload.candidate = {
        candidate: c.candidate,
        sdpMid: typeof c.sdpMid === "string" ? c.sdpMid.slice(0, 80) : null,
        sdpMLineIndex: Number.isInteger(c.sdpMLineIndex) ? c.sdpMLineIndex : null,
      };
    else return;
    to.peer.send(JSON.stringify(payload));
  }
  /** Bounded speech fallback for networks without a direct/relayed RTC path.
   * Peer IDs select among the live authoritative roster; they grant no access. */
  relayAudio(session: Session, packet: Record<string, unknown>) {
    if (
      typeof packet.pcm !== "string" ||
      packet.pcm.length !== 3416 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(packet.pcm) ||
      !Array.isArray(packet.targets) ||
      packet.targets.length > 7
    )
      return;
    const bytes = Buffer.from(packet.pcm, "base64");
    if (bytes.length !== 2560) return;
    const now = Date.now();
    if (now - (session.audioAt || 0) >= 1000) {
      session.audioAt = now;
      session.audioCount = 0;
    }
    session.audioCount = (session.audioCount || 0) + 1;
    if (session.audioCount > 20) return;
    const targets = new Set(packet.targets.filter((id) => typeof id === "string"));
    const frame = JSON.stringify({ type: "voice-audio", from: session.id, pcm: packet.pcm });
    for (const peer of this.voicePeers(session)) {
      const target = this.sessions.get(peer.id);
      if (target && targets.has(peer.id) && target.peer.bufferedAmount < 16 * 1024)
        target.peer.send(frame);
    }
  }
  checkpoint(force = false): Promise<void> {
    if (this.saving) return force ? this.saving.then(() => this.checkpoint(true)) : this.saving;
    if (this.closed) return Promise.resolve();
    this.lastSave = Date.now();
    const copy = structuredClone(this.snapshot()),
      version = this.version;
    this.saving = this.store
      .save(this.code, copy, version)
      .then((v) => {
        if (v == null) {
          this.stop();
          for (const s of this.sessions.values()) s.peer.close(1012, "Room moved; reconnect");
        } else this.version = v;
      })
      .catch(() => {
        for (const s of this.sessions.values())
          s.peer.send(
            JSON.stringify({
              type: "notice",
              message: "Saving connection interrupted. Reconnecting…",
            }),
          );
        this.stop();
        for (const s of this.sessions.values()) s.peer.close(1012, "Retry connection");
      })
      .finally(() => {
        this.saving = null;
      });
    return this.saving;
  }
  detach(session: Session) {
    if (this.sessions.get(session.id) !== session) return;
    this.sessions.delete(session.id);
    const m = this.room.members.find((m) => m.id === session.id);
    if (m) {
      m.input = {};
      m.inputAt = 0;
    }
    if (!this.sessions.size) {
      void this.checkpoint();
      this.emptyTimer = setTimeout(() => {
        if (!this.sessions.size)
          void this.checkpoint(true).finally(() => {
            if (!this.sessions.size) this.stop();
          });
      }, 20500);
      this.emptyTimer.unref?.();
    }
  }
  stop() {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    if (this.emptyTimer) clearTimeout(this.emptyTimer);
    handlers.delete(this.code);
    rooms.delete(this.code);
  }
}
async function roomFor(code: string, id: unknown, token: unknown) {
  let promise = rooms.get(code);
  if (!promise) {
    promise = loadRoomRecord(code).then((row) => {
      authorize(row.state, id, token);
      if (row.state.mode !== "protocol" && row.state.mode !== "signal")
        throw new OutpostError("This room uses a retired mode. Create a new room.", 409);
      const room = new LiveRoom(code, row);
      room.start();
      return room;
    });
    rooms.set(code, promise);
    promise.catch(() => rooms.delete(code));
  }
  return promise;
}
export function sameSocketOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      request.headers.get("host") ||
      new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
type Connection = {
  room?: LiveRoom;
  session?: Session;
  authenticating?: boolean;
  authTimer?: ReturnType<typeof setTimeout>;
  rateAt: number;
  count: number;
};
const connections = new WeakMap<Peer, Connection>();
export const socketHooks: Partial<Hooks> = {
  upgrade(request) {
    if (!sameSocketOrigin(request))
      return new Response("Cross-site request rejected.", { status: 403 });
  },
  open(peer) {
    const c: Connection = { rateAt: Date.now(), count: 0 };
    c.authTimer = setTimeout(() => peer.close(4401, "Join a room first"), 5000);
    connections.set(peer, c);
  },
  async message(peer, message) {
    const c = connections.get(peer);
    if (!c) return;
    if (Date.now() - c.rateAt > 1000) {
      c.rateAt = Date.now();
      c.count = 0;
    }
    const text = message.text();
    if (text.length > 16384 || ++c.count > 120) {
      peer.close(1008, "Message limit");
      return;
    }
    let requestId: unknown;
    try {
      const packet = JSON.parse(text);
      if (!packet || typeof packet !== "object" || Array.isArray(packet)) return;
      if (Number.isSafeInteger(packet.requestId) && packet.requestId >= 0)
        requestId = packet.requestId;
      if (!c.session) {
        if (
          packet.type !== "hello" ||
          typeof packet.code !== "string" ||
          c.room ||
          c.authenticating
        )
          return;
        c.authenticating = true;
        const room = await roomFor(packet.code.trim().toUpperCase(), packet.id, packet.token);
        c.room = room;
        const session = room.attach(peer, packet.id, packet.token);
        c.session = session;
        clearTimeout(c.authTimer);
        peer.send(
          JSON.stringify({
            type: "ready",
            room: room.response(session.id),
            iceServers: voiceIceServers(session.id),
          }),
        );
        room.broadcast();
        return;
      }
      c.room!.touch(c.session);
      if (packet.type === "input") c.room!.input(c.session, packet);
      else if (packet.type === "ping") peer.send(JSON.stringify({ type: "pong", at: packet.at }));
      else if (packet.type === "voice") {
        c.session.voice = packet.enabled === true;
        c.room!.broadcast();
      } else if (packet.type === "rtc") c.room!.signal(c.session, packet);
      else if (packet.type === "voice-audio") c.room!.relayAudio(c.session, packet);
      else if (packet.type === "action") {
        const result = await c.room!.action({
          ...packet.body,
          code: c.room!.code,
          id: c.session.id,
          token: c.session.token,
        });
        peer.send(JSON.stringify({ type: "reply", requestId: packet.requestId, room: result }));
      }
    } catch (error) {
      const status = error instanceof OutpostError ? error.status : 503;
      peer.send(
        JSON.stringify({
          type: "error",
          ...(requestId !== undefined ? { requestId } : {}),
          status,
          message:
            error instanceof OutpostError ? error.message : "Connection interrupted. Retrying…",
        }),
      );
      if (!c.session) peer.close(4401, "Room session invalid");
    }
  },
  close(peer) {
    const c = connections.get(peer);
    if (c?.authTimer) clearTimeout(c.authTimer);
    if (c?.session) c.room?.detach(c.session);
    connections.delete(peer);
  },
};
