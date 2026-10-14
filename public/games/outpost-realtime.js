/** Same-origin room transport, bounded local movement prediction and recovery.
 * The server owns health, shots, roles, channels, flight and match outcomes. */
const SESSION = "midnry-outpost-session-v1";
export function hydrateRoom(room, previous, full = true) {
  if (!room?.arena || full) return room;
  if (
    !previous?.arena ||
    room.arena.mapId !== previous.arena.mapId ||
    room.arena.roundId !== previous.arena.roundId
  )
    throw Error("Room map needs a fresh snapshot.");
  return { ...room, arena: { ...room.arena, level: previous.arena.level } };
}
const alive = (e) => !!e && e.hp > 0 && !e.departed;
export function predictionAllowed(arena, id) {
  const e = arena.entities.find((e) => e.id === id),
    p = arena.protocol;
  if (!alive(e) || arena.state === "ended" || arena.countdown > 0 || !p) return false;
  if (p.mission?.vehicle.pilotId === id) return false;
  return p.phase === "roam" || (p.phase === "combat" && p.combat?.startsAt <= arena.time);
}
/** Presentation only: reuse the real collision grid, never advance simulation. */
export function predictStep(arena, e, input, dt, time = arena.time) {
  let f = Math.max(-1, Math.min(1, input.forward || 0)),
    s = Math.max(-1, Math.min(1, input.strafe || 0));
  const length = Math.max(1, Math.hypot(f, s));
  f /= length;
  s /= length;
  const a = Number.isFinite(input.aim) ? input.aim : e.a,
    ca = Math.cos(a),
    sa = Math.sin(a);
  const combat = arena.protocol.phase === "combat";
  const dx = ca * f - sa * s,
    dy = sa * f + ca * s,
    speed = combat ? 2.6 : input.sprint ? 2.6 : 1.8;
  e.a = a;
  arena.move(e, dx * speed * dt, dy * speed * dt);
}
export class MovementPrediction {
  constructor(g) {
    this.g = g;
    this.history = [];
    this.correction = { x: 0, y: 0 };
  }
  reset() {
    this.history.length = 0;
    this.correction.x = this.correction.y = 0;
    this.key = null;
  }
  reconcile(arena, old, ack) {
    const e = arena.entities.find((e) => e.id === this.g.selfId),
      key = arena.roundId + ":" + arena.mapId;
    if (
      !e ||
      !old ||
      key !== this.key ||
      !predictionAllowed(arena, e.id) ||
      Math.hypot(e.x - old.x, e.y - old.y) > 2
    ) {
      this.reset();
      this.key = key;
      return;
    }
    this.history = this.history.filter((h) => h.seq > ack);
    for (const h of this.history) predictStep(arena, e, h.input, h.dt, h.time);
    this.correction = { x: e.x - old.x, y: e.y - old.y };
    e.x = old.x;
    e.y = old.y;
  }
  step(input, dt) {
    const g = this.g,
      net = g.online,
      e = g.player,
      now = performance.now();
    if (
      !net ||
      !g.running ||
      now - (net.lastSnapshotAt || 0) > 750 ||
      !predictionAllowed(g.arena, g.selfId)
    )
      return;
    dt = Math.min(0.05, Math.max(0, dt));
    const time = g.visualTime ?? g.time;
    const movement = {
      forward: input.forward,
      strafe: input.strafe,
      aim: input.aim,
      sprint: input.sprint,
      slide: input.slide,
    };
    predictStep(g.arena, e, movement, dt, time);
    this.history.push({ seq: net.seq + 1, input: movement, dt, time });
    if (this.history.length > 240) this.history.shift();
    const k = 1 - Math.exp(-dt * 18),
      before = { x: e.x, y: e.y };
    g.arena.move(e, this.correction.x * k, this.correction.y * k);
    this.correction.x -= e.x - before.x;
    this.correction.y -= e.y - before.y;
  }
}

export class RoomTransport {
  constructor(g) {
    this.g = g;
    this.ready = false;
    this.attempts = 0;
    this.pending = new Map();
    this.sent = [];
    this.requestId = 0;
    this.prediction = new MovementPrediction(g);
    this.panel = document.createElement("details");
    this.panel.className = "mf-liveconnection";
    this.panel.innerHTML =
      '<summary>Online connection</summary><p class="mf-livestatus" role="status">Offline play needs no connection.</p><p>Your seat and private orders are retained during brief connection interruptions. The match keeps running.</p>';
    g.protocolUI.focus.info.append(this.panel);
    this.status = this.panel.querySelector(".mf-livestatus");
    this.resume = document.createElement("button");
    this.resume.className = "mf-resumeroom";
    this.resume.textContent = "Resume previous room";
    this.resume.style.cssText = "min-height:44px;width:100%;margin-top:8px";
    g.$(".mf-connectrow").after(this.resume);
    this.refreshResume();
    g.on(this.resume, "click", () => {
      const saved = this.readSession();
      if (saved) void g.connectOnline("resume", saved);
    });
    g.on(document, "visibilitychange", () => {
      if (document.hidden) {
        g.keys.clear();
        g.touch = { x: 0, y: 0 };
        g.firing = false;
        g.protocolUI.held = false;
        g.pendingShot = 0;
        g.pendingReload = false;
        g.pendingSlide = false;
        g.protocolUI.actions.length = 0;
      }
    });
  }
  readSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION));
      return /^[A-Z2-9]{6}$/.test(s?.code) &&
        /^[a-f0-9]{48}$/.test(s?.token) &&
        typeof s.id === "string"
        ? s
        : null;
    } catch {
      return null;
    }
  }
  refreshResume() {
    const s = this.readSession();
    this.resume.hidden = !s || !!this.g.online;
    if (s) this.resume.textContent = "Resume room " + s.code;
  }
  save() {
    const n = this.g.online;
    if (!n) return;
    try {
      sessionStorage.setItem(
        SESSION,
        JSON.stringify({ code: n.code, id: n.id, token: n.token, seq: n.seq }),
      );
    } catch {}
    this.refreshResume();
  }
  connect(net) {
    this.stop(false);
    this.net = net;
    this.attempts = 0;
    this.prediction.reset();
    this.save();
    this.open();
    this.sendTimer = setInterval(() => this.sendInput(), 50);
    this.heartbeat = setInterval(() => this.ping(), 3000);
    this.storageTimer = setInterval(() => this.save(), 1000);
  }
  open() {
    if (this.g.online !== this.net || this.stopped) return;
    if (typeof WebSocket === "undefined") {
      this.fallback();
      return;
    }
    const url = new URL("/api/games/outpost/socket", location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    let socket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.fallback();
      return;
    }
    this.socket = socket;
    this.state("Connecting to your room…");
    this.authTimer = setTimeout(() => {
      if (!this.ready) socket.close();
    }, 5000);
    socket.onopen = () =>
      socket.send(
        JSON.stringify({
          type: "hello",
          code: this.net.code,
          id: this.net.id,
          token: this.net.token,
        }),
      );
    socket.onmessage = (event) => {
      if (this.socket !== socket || this.g.online !== this.net) return;
      try {
        this.receive(JSON.parse(event.data));
      } catch {
        socket.close(1002, "Fresh snapshot needed");
      }
    };
    socket.onclose = () => {
      if (this.socket !== socket || this.stopped) return;
      clearTimeout(this.authTimer);
      this.ready = false;
      this.prediction.reset();
      this.g.voice?.disconnect();
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(Error("Connection interrupted. Your room is recovering."));
      }
      this.pending.clear();
      this.g.pendingShot = 0;
      this.g.pendingReload = false;
      this.g.pendingSlide = false;
      this.g.keys.clear();
      this.g.touch = { x: 0, y: 0 };
      this.g.firing = false;
      this.g.pendingSuper = false;
      this.g.protocolUI.held = false;
      this.g.protocolUI.actions.length = 0;
      this.fallback();
      this.attempts++;
      this.retry = setTimeout(
        () => this.open(),
        Math.min(15000, 1000 * 2 ** Math.min(this.attempts, 4)),
      );
    };
    socket.onerror = () => {};
  }
  state(text) {
    if (this.status.textContent !== text) this.status.textContent = text;
  }
  fallback() {
    this.state("Recovering connection · online play continues when updates arrive.");
    if (this.g.online === this.net) this.g.scheduleRoomPoll(100);
  }
  receive(packet) {
    const g = this.g,
      n = this.net;
    if (packet.type === "ready") {
      clearTimeout(this.authTimer);
      this.ready = true;
      this.attempts = 0;
      n.errors = 0;
      n.seq = Math.max(n.seq, packet.room.ack ?? -1);
      clearTimeout(g.roomTimer);
      g.roomRequestAbort?.abort();
      this.lastRoom = packet.room;
      n.lastSnapshotAt = performance.now();
      g.applyRoom(packet.room);
      this.prediction.key = g.arena.roundId + ":" + g.arena.mapId;
      g.voice?.setIceServers(packet.iceServers);
      g.voice?.sync();
      if (g.voice?.enabled) this.send({ type: "voice", enabled: true });
      this.ping();
      this.state("Connected · live room updates");
    } else if (packet.type === "state") {
      const room = hydrateRoom(packet.room, this.lastRoom, packet.full);
      this.lastRoom = room;
      n.lastSnapshotAt = performance.now();
      g.applyRoom(room);
      this.acknowledge(room.ack);
      g.voice?.sync();
    } else if (packet.type === "reply") {
      const p = this.pending.get(packet.requestId);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(packet.requestId);
        g.applyRoom(packet.room);
        p.resolve(packet.room);
      }
    } else if (packet.type === "pong") {
      if (Number.isFinite(packet.at)) {
        this.rtt = Math.round(performance.now() - packet.at);
        this.state("Connected · " + this.rtt + " ms roundtrip");
      }
    } else if (packet.type === "voice-peers") g.voice?.peersChanged(packet.peers);
    else if (packet.type === "rtc") void g.voice?.signal(packet);
    else if (packet.type === "voice-audio") g.voice?.receiveAudio(packet);
    else if (packet.type === "error") {
      this.state(packet.message);
      if (packet.requestId) {
        const p = this.pending.get(packet.requestId);
        if (p) {
          clearTimeout(p.timer);
          this.pending.delete(packet.requestId);
          p.reject(Error(packet.message));
        }
      }
    } else if (packet.type === "notice") this.state(packet.message);
  }
  send(packet) {
    if (
      !this.ready ||
      this.socket?.readyState !== WebSocket.OPEN ||
      this.socket.bufferedAmount > 65536
    )
      return false;
    this.socket.send(JSON.stringify(packet));
    return true;
  }
  ping() {
    if (this.ready) this.send({ type: "ping", at: performance.now() });
  }
  sendInput() {
    const g = this.g,
      n = this.net;
    if (!this.ready || g.online !== n) return;
    const input =
      g.running && !document.hidden
        ? g.controls()
        : { forward: 0, strafe: 0, aim: g.player.a, pitch: 0, fire: false, reload: false };
    const seq = n.seq + 1,
      record = {
        seq,
        shot: g.pendingShot || 0,
        reload: g.pendingReload,
        super: g.pendingSuper,
        slide: g.pendingSlide,
      };
    if (this.send({ type: "input", seq, input })) {
      n.seq = seq;
      this.sent.push(record);
      if (this.sent.length > 80) this.sent.shift();
    }
  }
  acknowledge(ack) {
    if (!Number.isSafeInteger(ack)) return;
    const sent = this.sent.filter((s) => s.seq <= ack);
    this.sent = this.sent.filter((s) => s.seq > ack);
    if (!sent.length) return;
    const g = this.g;
    g.pendingShot = Math.max(0, (g.pendingShot || 0) - Math.max(...sent.map((s) => s.shot)));
    if (sent.some((s) => s.reload)) g.pendingReload = false;
    if (sent.some((s) => s.super)) g.pendingSuper = false;
    if (sent.some((s) => s.slide)) g.pendingSlide = false;
  }
  action(op, extra) {
    const requestId = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(Error("Room request timed out. Reconnecting…"));
      }, 6000);
      this.pending.set(requestId, { resolve, reject, timer });
      if (!this.send({ type: "action", requestId, body: { op, ...extra } })) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(Error("Connection is recovering."));
      }
    });
  }
  stop(clearSession = false) {
    this.stopped = true;
    clearInterval(this.sendTimer);
    clearInterval(this.heartbeat);
    clearInterval(this.storageTimer);
    clearTimeout(this.retry);
    clearTimeout(this.authTimer);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.ready = false;
    this.sent = [];
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(Error("Left room."));
    }
    this.pending.clear();
    if (clearSession)
      try {
        sessionStorage.removeItem(SESSION);
      } catch {}
    this.stopped = false;
  }
  dispose() {
    this.stop(false);
    this.panel.remove();
    this.resume.remove();
  }
}
