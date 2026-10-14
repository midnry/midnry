/**
 * Blackout Protocol: DOM-free, authoritative social-deduction simulation.
 * Shared by the offline game and server rooms. Clients send intentions only;
 * channels, roles, witnesses, charges, cooldowns and victories live here.
 */
import { Arena, clamp } from "./outpost-sim.js";
import { INTERACTIVE_TASKS, createTaskGame, taskStep, taskGameView } from "./outpost-task-games.js";
import { contributionsOf, recordContribution } from "./outpost-mission-progress.js";
import { recordVictimTakedown } from "./outpost-death.js";
import {
  PROTOCOL_MAP,
  TRANSPORT_MAP,
  MEDICAL_SUPPLIES,
  AIRCRAFT_TASKS,
} from "./outpost-protocol-map.js";
import { beginCombat, advanceCombat, combatDamage, canFight } from "./outpost-protocol-combat.js";
import { rememberObservation, chooseSuspect, strongestEvidence, nextStatement } from './outpost-protocol-ai.js';

export const PROTOCOL_RULES = Object.freeze({
  seats: 8,
  infiltrators: 2,
  tasksPerOperator: 3,
  taskDuration: 4.5,
  plantDuration: 8,
  wireWindow: 20,
  defuseDuration: 6,
  repairDuration: 5,
  chargesRequired: 3,
  fuseDuration: 75,
  matchDuration: 600,
  interactRange: 1.4,
  discoveryRange: 2.2,
  reportRange: 1.7,
  eliminateRange: 1.2,
  consoleRange: 1.2,
  killCooldown: 25,
  sabotageCooldown: 35,
  sabotageDuration: 40,
  ventCooldown: 10,
  discussionDuration: 15,
  voteDuration: 15,
  emergencyCooldown: 35,
  collectDuration: 4.5,
  loadDuration: 3,
  departDuration: 3,
  deliveryDuration: 4.5,
  autopilotSabotageDuration: 6,
  cargoSabotageDuration: 4.5,
  cargoRepairDuration: 6,
  recoveryDuration: 18,
  stabilizationDuration: 3,
});

const OPERATORS = "operator",
  INFILTRATORS = "infiltrator";
const ACTIONS = new Set([
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
  "disable-autopilot",
  "cargo-sabotage",
]);
const clone = (value) => JSON.parse(JSON.stringify(value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const finite = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);
const normalize = (text, limit) =>
  typeof text === "string"
    ? text
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit)
    : "";
const shuffle = (items, random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(clamp(finite(random(), 0.5), 0, 0.999999999) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Explicitly enumerate renderer fields. New private properties cannot silently
// enter room payloads when this module or the older combat simulation evolves.
const ENTITY_FIELDS = [
  "id",
  "name",
  "bot",
  "x",
  "y",
  "a",
  "pitch",
  "crouching",
  "hp",
  "maxHp",
  "weapon",
  "damage",
  "cores",
  "exposure",
  "hit",
  "shotAt",
  "ammo",
  "reloadUntil",
  "kills",
  "damageDealt",
  "coresCollected",
  "placement",
  "eliminatedAt",
  "respawns",
  "respawnAt",
  "phase",
  "departed",
  "charge",
  "cloakedUntil",
  "speedUntil",
  "poisonUntil",
  "slowUntil",
  "damageSeq",
  "damageTotal",
  "damageAngle",
  "hitSeq",
  "hitDamage",
  "hitTotal",
  "hitAt",
];

export class ProtocolArena extends Arena {
  constructor(options = {}) {
    const random = typeof options.random === "function" ? options.random : Math.random;
    const ids = new Set();
    const humans = (options.humans ?? [{ id: "player", team: 0 }])
      .slice(0, 8)
      .filter((human) => {
        if (!human || typeof human.id !== "string" || !human.id || ids.has(human.id)) return false;
        ids.add(human.id);
        return true;
      })
      .map((human) => ({
        ...human,
        name: normalize(human.name, 32) || "Operator",
        weapon: "carbine",
      }));
    // Super provides the established Entity/renderer shape. Our map, roles,
    // movement and rules replace combat-mode initialization completely.
    super({ ...options, humans, random, mode: "protocol", mapId: "outpost", weapon: "carbine" });
    this.mapId = PROTOCOL_MAP.id;
    this.level = PROTOCOL_MAP.level.map((row) => [...row]);
    this.crates = [];
    this.cores = [];
    this.projectiles = [];
    this.fields = [];
    const size = this.level.length;
    this.zone = {
      cx: size / 2,
      cy: size / 2,
      half: size,
      initialHalf: size,
      minHalf: size,
      delay: 1e9,
      duration: 1e9,
    };
    for (const e of this.entities) {
      if (e.bot && ids.has(e.id)) {
        let suffix = this.entities.indexOf(e);
        while (ids.has(`protocol-bot-${suffix}`)) suffix++;
        e.id = `protocol-bot-${suffix}`;
      }
      ids.add(e.id);
    }
    const seats = shuffle(
      this.entities.map((e) => e.id),
      random,
    );
    const first = humans[0]?.id;
    // This option is offline-only. The online room boundary never accepts it.
    if (first && [OPERATORS, INFILTRATORS].includes(options.rolePreference)) {
      seats.splice(seats.indexOf(first), 1);
      if (options.rolePreference === INFILTRATORS) seats.unshift(first);
      else seats.push(first);
    }
    this.interactiveTasks = options.interactiveTasks === true;
    const infiltrators = new Set(seats.slice(0, PROTOCOL_RULES.infiltrators));
    this.protocol = {
      version: 1,
      authoritative: true,
      phase: "roam",
      roundEndsAt: PROTOCOL_RULES.matchDuration,
      taskDone: 0,
      taskTotal: (8 - 2) * PROTOCOL_RULES.tasksPerOperator,
      armedCount: 0,
      detonateAt: null,
      sabotage: { powerUntil: 0, commsUntil: 0 },
      bodies: [],
      bombs: [],
      sites: clone(PROTOCOL_MAP.sites),
      stations: clone(PROTOCOL_MAP.stations),
      vents: clone(PROTOCOL_MAP.vents),
      emergency: clone(PROTOCOL_MAP.emergency),
      meeting: null,
      combat: null,
      log: [],
      self: null,
      players: Object.create(null),
      nextId: 1,
      emergencyReadyAt: 0,
      rngState: Math.floor(clamp(finite(random(), 0.5), 0, 0.999999999) * 0xffffffff) >>> 0 || 1,
      mission: this.newMedicalMission(),
    };
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      const [x, y] = PROTOCOL_MAP.spawns[i % PROTOCOL_MAP.spawns.length];
      Object.assign(e, {
        x,
        y,
        a: Math.atan2(size / 2 - y, size / 2 - x),
        hp: 100,
        maxHp: 100,
        team: infiltrators.has(e.id) ? 1 : 0,
        name:
          humans[i]?.name ?? ["Hale", "Voss", "Reed", "Sato", "Quinn", "Rook", "Mara", "Ash"][i],
        weapon: "carbine",
        damage: 0,
        ammo: 0,
        charge: 0,
        respawns: 0,
        respawnAt: 0,
        path: [],
        nextPath: 0,
        attack: 0,
        burst: null,
      });
      const assignments = shuffle(PROTOCOL_MAP.stations, random)
        .slice(0, 3)
        .map((station, j) => ({
          id: `${e.id}-assignment-${j}`,
          stationId: station.id,
          name: station.name,
          done: false,
        }));
      this.protocol.players[e.id] = {
        role: e.team === 1 ? INFILTRATORS : OPERATORS,
        tasks: assignments,
        actionSeq: -1,
        lastActionSeq: -1,
        channel: null,
        contributions: contributionsOf(),
        contributionEvents: [],
        killReadyAt: 12,
        sabotageReadyAt: 15,
        ventReadyAt: 0,
        emergenciesLeft: 1,
        chatReadyAt: 0,
        discoveredBombs: [],
        discoveredBodies: [],
        bodyMemory: {},
        observations: [],
        caseEvidence: [],
        activities: [],
        contacts: [],
        botDialogue: null,
        botGoal: null,
        botNextThink: 0,
        botRestUntil: 8 + this.random() * 14,
        botNextChat: 0,
        botVoteAt: 0,
        lastDamageSeq: e.damageSeq || 0,
        cargo: null,
        vehicleInput: { pitch: 0, steer: 0 },
      };
    }
    this.protocol.taskTotal = MEDICAL_SUPPLIES.reduce((sum, item) => sum + item.required, 0);
    this.addLog(
      "Lifeline Run: gather medical supplies, load the medevac and reach the wounded patrol.",
    );
  }

  static restore(data) {
    if (!data?.protocol || data.mode !== "protocol") return Arena.restore(data);
    const arena = Arena.restore(data);
    Object.setPrototypeOf(arena, ProtocolArena.prototype);
    // A public recipient snapshot can render and interpolate, but may never
    // invent teammates' roles or be used as an authoritative server simulation.
    arena.presentationOnly =
      data.protocol.authoritative !== true ||
      !data.protocol.players ||
      data.entities.length !== 8 ||
      !data.entities.every((e) => {
        const player = Object.hasOwn(data.protocol.players, e.id) && data.protocol.players[e.id];
        return (
          player &&
          [OPERATORS, INFILTRATORS].includes(player.role) &&
          Array.isArray(player.tasks) &&
          e.team === (player.role === INFILTRATORS ? 1 : 0)
        );
      });
    if (!arena.presentationOnly && !arena.protocol.mission) {
      // Readable rolling-deployment saves adopt the medical mission without
      // accepting recipient state or turning completed old tasks into cargo.
      arena.protocol.mission = arena.newMedicalMission();
      arena.protocol.mission.startedAt = arena.time;
      for (const player of Object.values(arena.protocol.players)) {
        player.cargo = null;
        player.vehicleInput = { pitch: 0, steer: 0 };
      }
    }
    // Rolling-deployment saves receive flight work; recipient views never
    // invent shared objectives or upgrade themselves to authoritative state.
    if (!arena.presentationOnly && !arena.protocol.mission.flightTasks)
      arena.protocol.mission.flightTasks = AIRCRAFT_TASKS.map((task) => ({ ...task, done: false }));
    return arena;
  }

  newMedicalMission() {
    return {
      version: 1,
      phase: "base",
      title: "Lifeline Run",
      interactiveTasks: this.interactiveTasks === true,
      flightTasks: AIRCRAFT_TASKS.map((task) => ({ ...task, done: false })),
      manifest: MEDICAL_SUPPLIES.map((item) => ({
        id: item.id,
        name: item.name,
        required: item.required,
        loaded: 0,
      })),
      supplyStock: clone(PROTOCOL_MAP.supplies),
      loading: clone(PROTOCOL_MAP.loading),
      patients: [70, 82, 94, 100].map((hp, i) => ({
        id: `patient-${i + 1}`,
        name: ["Corporal Mercer", "Sergeant Imani", "Specialist Vega", "Private Solis"][i],
        hp,
        maxHp: 100,
        decay: [0.22, 0.2, 0.18, 0.17][i],
        rescued: false,
      })),
      vehicle: {
        name: "Lifeline Medevac",
        autopilot: true,
        pilotId: null,
        progress: 0,
        duration: 120,
        altitude: 0.65,
        heading: 0,
        stability: 100,
        underControl: false,
        stableFor: 0,
        recoveryDeadline: null,
        disabledAt: null,
        arrived: false,
        cargoDamage: 0,
      },
      startedAt: 0,
      departedAt: null,
      deliveredAt: null,
    };
  }

  snapshot() {
    return { ...super.snapshot(), protocol: this.protocol };
  }

  random() {
    const p = this.protocol;
    p.rngState = (Math.imul(p.rngState, 1664525) + 1013904223) >>> 0;
    return p.rngState / 0x100000000;
  }

  addLog(text) {
    this.protocol.log.push({ id: this.protocol.nextId++, text });
    if (this.protocol.log.length > 12) this.protocol.log.shift();
  }

  privateFor(entity) {
    return this.protocol.players[entity.id];
  }
  active(entity) {
    return entity?.hp > 0 && !entity.departed;
  }
  near(a, b, radius) {
    return b && distance(a, b) <= radius && this.visible(a, b);
  }
  sightRange() {
    return this.protocol.sabotage.powerUntil > this.time ? 2.6 : 7;
  }
  sees(a, b) {
    return this.active(a) && this.near(a, b, this.sightRange());
  }
  outsideSafe() {
    return false;
  }
  updateZone() {}
  applyHaze() {}
  collectCores() {}
  shoot(entity) {
    if (canFight(this, entity)) Arena.prototype.shoot.call(this, entity);
  }
  super() {
    return false;
  }
  reload(entity) {
    if (canFight(this, entity)) Arena.prototype.reload.call(this, entity);
  }
  damage(target, amount, source) {
    combatDamage(this, target, amount, source);
  }

  finish(winner, reason) {
    if (this.state === "ended") return;
    this.state = "ended";
    this.winner = winner;
    this.protocol.phase = "result";
    this.protocol.resultReason = reason;
    for (const e of this.entities) {
      const p = this.privateFor(e);
      p.channel = null;
      e.placement = e.team === winner ? 1 : 2;
    }
    this.addLog(reason);
  }

  checkResult() {
    if (this.presentationOnly || this.state === "ended") return;
    const p = this.protocol;
    p.taskDone = p.mission.manifest.reduce((sum, item) => sum + item.loaded, 0);
    p.taskTotal = p.mission.manifest.reduce((sum, item) => sum + item.required, 0);
    p.armedCount = p.bombs.length;
    if (!this.entities.some((e) => e.team === 0 && this.active(e)))
      return this.finish(
        1,
        "The last rescue operator was lost. The wounded patrol never received aid.",
      );
    if (!p.mission.patients.some((patient) => patient.hp > 0 || patient.rescued))
      return this.finish(1, "All wounded soldiers died before the medical supplies arrived.");
    if (
      p.mission.phase === "base" &&
      p.detonateAt !== null &&
      p.armedCount === 3 &&
      this.time >= p.detonateAt
    )
      return this.loseCrew(
        "The base charges destroyed the rescue staging area and its remaining crew.",
      );
  }

  loseCrew(reason) {
    for (const entity of this.entities)
      if (entity.team === 0 && this.active(entity)) {
        this.returnCargo(entity);
        entity.hp = 0;
        entity.eliminatedAt = this.time;
        this.privateFor(entity).channel = null;
      }
    this.protocol.mission.vehicle.pilotId = null;
    this.finish(1, reason);
  }

  neededSupply(supplyId, excludeId = null) {
    const item = this.protocol.mission.manifest.find((item) => item.id === supplyId);
    if (!item) return 0;
    const carried = this.entities.filter(
      (entity) =>
        entity.id !== excludeId &&
        entity.team === 0 &&
        this.active(entity) &&
        this.privateFor(entity).cargo?.supplyId === supplyId,
    ).length;
    return Math.max(0, item.required - item.loaded - carried);
  }

  manifestComplete() {
    return this.protocol.mission.manifest.every((item) => item.loaded >= item.required);
  }

  flightTasksComplete() {
    return this.protocol.mission.flightTasks.every((task) => task.done);
  }

  returnCargo(entity) {
    const player = this.privateFor(entity),
      cargo = player.cargo;
    if (!cargo) return;
    if (player.role === OPERATORS && !cargo.fake) {
      const fixture =
        this.protocol.mission.supplyStock.find((stock) => stock.id === cargo.sourceId) ??
        this.protocol.mission.supplyStock.find((stock) => stock.supplyId === cargo.supplyId);
      if (fixture) fixture.stock++;
    }
    player.cargo = null;
  }

  departMission(entity) {
    if (this.presentationOnly) return false;
    const mission = this.protocol.mission;
    if (
      !this.active(entity) ||
      this.privateFor(entity).role !== OPERATORS ||
      mission.phase !== "base" ||
      !this.manifestComplete() ||
      !this.near(entity, mission.loading, PROTOCOL_RULES.interactRange)
    )
      return false;
    mission.phase = "transport";
    mission.departedAt = this.time;
    this.mapId = TRANSPORT_MAP.id;
    this.level = TRANSPORT_MAP.level.map((row) => [...row]);
    const size = this.level.length;
    this.zone = {
      cx: size / 2,
      cy: size / 2,
      half: size,
      initialHalf: size,
      minHalf: size,
      delay: 1e9,
      duration: 1e9,
    };
    this.protocol.stations = clone(TRANSPORT_MAP.stations);
    this.protocol.sites = clone(TRANSPORT_MAP.sites ?? []);
    this.protocol.vents = clone(TRANSPORT_MAP.vents ?? []);
    this.protocol.emergency = clone(TRANSPORT_MAP.emergency);
    this.protocol.bodies = [];
    this.protocol.bombs = [];
    this.protocol.armedCount = 0;
    this.protocol.detonateAt = null;
    this.protocol.meeting = null;
    this.protocol.sabotage = { powerUntil: 0, commsUntil: 0 };
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i],
        player = this.privateFor(e);
      [e.x, e.y] = TRANSPORT_MAP.spawns[i % TRANSPORT_MAP.spawns.length];
      e.a = -Math.PI / 2;
      e.path = [];
      e.nextPath = 0;
      player.channel = null;
      player.cargo = null;
      player.botGoal = null;
      player.botNextThink = 0;
      player.discoveredBodies = [];
      player.discoveredBombs = [];
      player.bodyMemory = {};
      player.vehicleInput = { pitch: 0, steer: 0 };
    }
    this.addLog("Medical manifest loaded. All living patrols have boarded Lifeline Medevac.");
    return true;
  }

  flightSafe() {
    const vehicle = this.protocol.mission.vehicle;
    return vehicle.altitude >= 0.5 && vehicle.altitude <= 0.85 && Math.abs(vehicle.heading) <= 0.18;
  }

  unsafeFlight(sabotaged = false) {
    const mission = this.protocol.mission,
      v = mission.vehicle;
    if (mission.phase !== "transport" || v.arrived) return;
    v.autopilot = false;
    v.underControl = false;
    v.stableFor = 0;
    v.altitude = Math.min(v.altitude, 0.38);
    v.heading = Math.max(v.heading, 0.48);
    v.stability = Math.min(v.stability, 35);
    v.disabledAt = this.time;
    if (sabotaged) v.recoveryIncident = `flight-${this.protocol.nextId++}`;
    v.recoveryDeadline = this.time + PROTOCOL_RULES.recoveryDuration;
  }

  clearPilot(entity) {
    const vehicle = this.protocol.mission.vehicle;
    if (vehicle.pilotId !== entity.id) return;
    vehicle.pilotId = null;
    if (!vehicle.autopilot && !vehicle.arrived) this.unsafeFlight();
  }

  updateMedical(dt, inputs) {
    if (this.presentationOnly) return;
    const mission = this.protocol.mission,
      vehicle = mission.vehicle;
    for (const patient of mission.patients)
      if (!patient.rescued && patient.hp > 0)
        patient.hp = Math.max(0, patient.hp - patient.decay * dt);
    if (mission.phase !== "transport" || vehicle.arrived || this.state === "ended") return;
    const pilot = this.entities.find((entity) => entity.id === vehicle.pilotId);
    if (
      vehicle.pilotId &&
      (!this.active(pilot) ||
        this.privateFor(pilot).role !== OPERATORS ||
        !this.near(pilot, TRANSPORT_MAP.helm, PROTOCOL_RULES.interactRange))
    ) {
      vehicle.pilotId = null;
      if (!vehicle.autopilot) this.unsafeFlight();
    }
    if (vehicle.autopilot) {
      vehicle.altitude = 0.65;
      vehicle.heading = 0;
      vehicle.stability = 100;
      vehicle.recoveryDeadline = null;
      vehicle.progress = Math.min(vehicle.duration, vehicle.progress + dt);
    } else {
      const validPilot =
        pilot && vehicle.pilotId === pilot.id && this.active(pilot) && pilot.team === 0;
      const intent = validPilot
        ? pilot.bot
          ? this.privateFor(pilot).vehicleInput
          : inputs[pilot.id]?.vehicleInput
        : null;
      const pitch = clamp(finite(intent?.pitch), -1, 1),
        steer = clamp(finite(intent?.steer), -1, 1);
      vehicle.altitude += pitch * 0.2 * dt;
      vehicle.heading += steer * 0.3 * dt;
      if (!vehicle.underControl) {
        vehicle.altitude -= 0.01 * dt;
        vehicle.heading += 0.008 * dt;
      }
      const safe = validPilot && this.flightSafe();
      if (safe) {
        vehicle.stableFor += dt;
        vehicle.stability = Math.min(100, vehicle.stability + 20 * dt);
        if (vehicle.stableFor >= PROTOCOL_RULES.stabilizationDuration) {
          vehicle.underControl = true;
          vehicle.recoveryDeadline = null; // Safe manual flight is a valid recovery.
        }
      } else {
        vehicle.stableFor = 0;
        vehicle.underControl = false;
        vehicle.stability = Math.max(0, vehicle.stability - 8 * dt);
        vehicle.recoveryDeadline ??= this.time + PROTOCOL_RULES.recoveryDuration;
      }
      if (vehicle.underControl && validPilot) {
        recordContribution(this.privateFor(pilot), "pilotSeconds", null, dt);
        vehicle.progress = Math.min(vehicle.duration, vehicle.progress + dt);
      }
      if (
        vehicle.altitude <= 0.08 ||
        vehicle.altitude >= 0.98 ||
        Math.abs(vehicle.heading) >= 0.98 ||
        (vehicle.recoveryDeadline !== null && this.time >= vehicle.recoveryDeadline)
      ) {
        this.loseCrew(
          "Lifeline Medevac crashed before the medical delivery. The rescue mission was lost.",
        );
        return;
      }
    }
    if (vehicle.progress >= vehicle.duration) {
      vehicle.arrived = true;
      vehicle.recoveryDeadline = null;
      this.addLog(
        "Lifeline Medevac reached the casualty station. Inspect the cargo and deliver the supplies.",
      );
    }
  }

  detach(id) {
    if (this.presentationOnly) return;
    const e = this.entities.find((entity) => entity.id === id);
    if (!e || e.departed) return;
    this.returnCargo(e);
    this.clearPilot(e);
    e.departed = true;
    e.hp = 0;
    e.eliminatedAt = this.time;
    const p = this.privateFor(e);
    p.channel = null;
    for (const body of this.protocol.bodies) if (body.carriedBy === id) body.carriedBy = null;
    this.addLog(`${e.name} left the operation.`);
    this.checkResult();
  }

  // Persist evidence at the moment it is seen. A bot's vote never consults a
  // hidden role, and an action through a wall does not become witness evidence.
  observe(kind, actor, subject = null) {
    if(kind==='task') {
      const own=this.privateFor(actor);own.activities||=[];
      own.activities.push({kind,room:this.roomAt(actor)?.name||'the corridor',at:this.time});
      if(own.activities.length>12)own.activities.shift();
    }
    for (const witness of this.entities) {
      if (witness === actor || witness === subject || !this.sees(witness, actor)) continue;
      if (subject && !this.sees(witness, subject)) continue;
      rememberObservation(this.privateFor(witness), {
        kind,
        actorId: actor.id,
        subjectId: subject?.id ?? null,
        at: this.time,
        room: this.roomAt(actor)?.name ?? "the corridor",
      });
    }
  }

  roomAt(point) {
    return (this.mapId === TRANSPORT_MAP.id ? TRANSPORT_MAP : PROTOCOL_MAP).rooms.find(
      (room) =>
        point.x >= room.x &&
        point.x < room.x + room.w &&
        point.y >= room.y &&
        point.y < room.y + room.h,
    );
  }

  discover(entity) {
    if (!this.active(entity)) return;
    const p = this.privateFor(entity);
    for (const bomb of this.protocol.bombs)
      if (this.near(entity, bomb, 2.2) && !p.discoveredBombs.includes(bomb.id))
        p.discoveredBombs.push(bomb.id);
    p.bodyMemory ??= {};
    for (const body of this.protocol.bodies)
      if (this.near(entity, body, this.sightRange())) {
        if (!p.discoveredBodies.includes(body.id)) p.discoveredBodies.push(body.id);
        p.bodyMemory[body.id] = { x: body.x, y: body.y };
      }
    p.discoveredBombs = p.discoveredBombs.filter((id) =>
      this.protocol.bombs.some((bomb) => bomb.id === id),
    );
  }

  eliminate(entity, targetId) {
    const player = this.privateFor(entity);
    const target = this.entities.find((e) => e.id === targetId);
    if (
      player.role !== INFILTRATORS ||
      !this.active(target) ||
      target.team === 1 ||
      player.killReadyAt > this.time ||
      !this.near(entity, target, PROTOCOL_RULES.eliminateRange) ||
      this.protocol.bodies.some((b) => b.carriedBy === entity.id)
    )
      return;
    this.observe("eliminate", entity, target);
    this.returnCargo(target);
    this.clearPilot(target);
    target.hp = 0;
    target.eliminatedAt = this.time;
    target.damageSeq++;
    target.damageTotal += 100;
    target.damageAngle = Math.atan2(entity.y - target.y, entity.x - target.x);
    target.hit = this.time;
    recordVictimTakedown(this, target, entity);
    this.privateFor(target).channel = null;
    player.channel = null;
    player.killReadyAt = this.time + PROTOCOL_RULES.killCooldown;
    entity.kills++;
    this.protocol.bodies.push({
      id: `body-${this.protocol.nextId++}`,
      victimId: target.id,
      name: target.name,
      x: target.x,
      y: target.y,
      reported: false,
      carriedBy: null,
      killerId: entity.id,
    });
    this.emit(entity.id, "Patrol eliminated. Keep your cover intact.");
    this.emit(
      target.id,
      "Your patrol was lost. Observe the rescue; living patrols cannot hear you.",
    );
  }

  startMeeting(entity, reason, body = null) {
    const p = this.protocol;
    if (p.phase !== "roam" || !this.active(entity)) return;
    if (
      p.mission.phase === "transport" &&
      !p.mission.vehicle.autopilot &&
      !p.mission.vehicle.arrived
    ) {
      this.emit(
        entity.id,
        "Restore autopilot before calling an assembly. The seated pilot must keep flight control.",
      );
      return;
    }
    if (body) body.reported = true;
    p.phase = "discussion";
    p.meeting = {
      id: `meeting-${p.nextId++}`,
      caller: entity.id,
      reason,
      discussionUntil: this.time + PROTOCOL_RULES.discussionDuration,
      voteUntil: this.time + PROTOCOL_RULES.discussionDuration + PROTOCOL_RULES.voteDuration,
      votes: {},
      messages: [],
      participants: this.entities.filter((e) => this.active(e)).map((e) => e.id),
      result: null,
    };
    for (const e of this.entities) {
      const player = this.privateFor(e);
      player.channel = null;
      player.botGoal = null;
      player.botNextChat = this.time + 1 + this.random() * 8;
      player.botDialogue={opened:false,sent:0,replied:[]};
      const proof=strongestEvidence(this.botMeetingContext(e));
      if(proof?.kind==='eliminate')player.botNextChat=this.time+.5+this.random()*1.3;
      player.botVoteAt = p.meeting.discussionUntil + 1 + this.random() * 7;
    }
    for (const b of p.bodies) b.carriedBy = null;
    this.addLog(`${entity.name} called a radio assembly: ${reason}`);
  }

  resolveMeeting() {
    const meeting = this.protocol.meeting;
    const tally = new Map();
    for (const [voterId, target] of Object.entries(meeting.votes)) {
      if (
        !meeting.participants.includes(voterId) ||
        !this.active(this.entities.find((e) => e.id === voterId))
      )
        continue;
      tally.set(target, (tally.get(target) ?? 0) + 1);
    }
    const choices = [...tally.entries()]
      .filter(([id]) => id !== "skip")
      .sort((a, b) => b[1] - a[1]);
    const [targetId, votes] = choices[0] ?? [null, 0];
    const target = this.entities.find((e) => e.id === targetId);
    const tied = choices[1]?.[1] === votes;
    const eligible = meeting.participants.filter((id) =>
      this.active(this.entities.find((e) => e.id === id)),
    ).length;
    // More than half the living assembly must agree. One vote and seven
    // abstentions cannot force the entire patrol into Last Stand.
    if (
      target &&
      this.active(target) &&
      votes > eligible / 2 &&
      votes > (tally.get("skip") ?? 0) &&
      !tied
    ) {
      beginCombat(this, target);
      meeting.result = `${target.name} faces ${eligible - 1} remaining patrols in Last Stand. Allegiance remains classified.`;
      this.addLog(meeting.result);
    } else {
      meeting.result = "No majority. The patrol returns to duty.";
      this.addLog(meeting.result);
    }
    meeting.resultUntil = this.time + 5;
    if (this.protocol.phase !== "combat") this.protocol.phase = "roam";
    this.checkResult();
  }

  action(entity, action) {
    if (!action || !Number.isSafeInteger(action.seq) || action.seq < 0 || !ACTIONS.has(action.op))
      return;
    const player = this.privateFor(entity);
    if (action.seq <= player.actionSeq) return;
    // Sequence consumption is independent of validity. An invalid distant
    // action cannot become valid later when a held network packet is retried.
    player.actionSeq = action.seq;
    player.lastActionSeq = action.seq;
    const targetId = normalize(action.target, 80);
    const value = normalize(action.value, 180);
    if (!this.active(entity)) return;
    const meeting = this.protocol.meeting;
    if (action.op === "chat") {
      if (
        this.protocol.phase !== "discussion" ||
        !value ||
        player.chatReadyAt > this.time ||
        !meeting?.participants.includes(entity.id)
      )
        return;
      player.chatReadyAt = this.time + 1;
      meeting.messages.push({
        id: this.protocol.nextId++,
        sender: entity.id,
        name: entity.name,
        text: value,
      });
      if (meeting.messages.length > 48) meeting.messages.shift();
      return;
    }
    if (action.op === "vote") {
      if (
        this.protocol.phase !== "vote" ||
        !meeting?.participants.includes(entity.id) ||
        Object.hasOwn(meeting.votes, entity.id)
      )
        return;
      if (
        targetId !== "skip" &&
        (!meeting.participants.includes(targetId) ||
          !this.active(this.entities.find((e) => e.id === targetId)))
      )
        return;
      meeting.votes[entity.id] = targetId;
      return;
    }
    if (this.protocol.phase !== "roam") return;
    if (action.op === "task-begin") {
      const context = this.context(entity);
      if (this.protocol.mission.interactiveTasks && context?.target === targetId && INTERACTIVE_TASKS.has(context.kind) && !player.channel)
        this.beginTask(entity, context);
      return;
    }
    if (action.op === "task-cancel") {
      if (player.channel?.challenge?.id === targetId) player.channel = null;
      return;
    }
    if (action.op === "task-step") {
      const channel = player.channel, context = this.context(entity);
      if (!channel?.challenge || channel.challenge.id !== targetId) return;
      if (!context || context.kind !== channel.kind || context.target !== channel.target || entity.departed || channel.damageSeq !== entity.damageSeq || distance(entity,channel.origin) > .06 || channel.challenge.deadline < this.time) {
        player.channel = null;
        return;
      }
      taskStep(channel.challenge, value, this.time);
      return;
    }
    if (action.op === "helm") {
      const v = this.protocol.mission.vehicle;
      if (
        player.role !== OPERATORS ||
        this.protocol.mission.phase !== "transport" ||
        v.arrived ||
        (v.pilotId && v.pilotId !== entity.id) ||
        !this.near(entity, TRANSPORT_MAP.helm, PROTOCOL_RULES.interactRange)
      )
        return;
      v.pilotId = entity.id;
      if (v.autopilot) {
        v.autopilot = false;
        v.underControl = false;
        v.stableFor = 0;
      }
      entity.x = TRANSPORT_MAP.helm.x;
      entity.y = TRANSPORT_MAP.helm.y;
      player.channel = null;
    } else if (action.op === "release-helm") {
      this.clearPilot(entity);
    } else if (action.op === "autopilot") {
      const v = this.protocol.mission.vehicle;
      if (
        player.role !== OPERATORS ||
        this.protocol.mission.phase !== "transport" ||
        v.pilotId !== entity.id ||
        !v.underControl ||
        !this.flightSafe() ||
        !this.near(entity, TRANSPORT_MAP.helm, PROTOCOL_RULES.interactRange)
      )
        return;
      if (v.recoveryIncident) recordContribution(player, "recoveries", v.recoveryIncident);
      v.recoveryIncident = null;
      v.autopilot = true;
      v.recoveryDeadline = null;
      v.disabledAt = null;
      v.stability = 100;
      this.addLog("Flight control stabilized. Autopilot restored by the seated pilot.");
    } else if (action.op === "disable-autopilot" || action.op === "cargo-sabotage") {
      // An optional button may request the contextual action, never complete
      // its required uninterrupted hold or bypass the sabotage cooldown.
      const expected = this.context(entity);
      if (player.role === INFILTRATORS && expected?.kind === action.op)
        this.emit(entity.id, "Hold the interaction control to complete this sabotage.");
    } else if (action.op === "report") {
      const body = this.protocol.bodies.find((b) => b.id === targetId && !b.reported);
      if (this.near(entity, body, PROTOCOL_RULES.reportRange))
        this.startMeeting(entity, `${body.name}'s patrol was found`, body);
    } else if (action.op === "meeting") {
      if (
        this.protocol.phase === 'roam' &&
        player.emergenciesLeft > 0 &&
        this.protocol.emergencyReadyAt <= this.time
      ) {
        // A working radio calls the patrol from anywhere. The wired console
        // remains a physical fallback when communications are jammed.
        if(this.protocol.sabotage.commsUntil>this.time&&!this.near(entity,this.protocol.emergency,PROTOCOL_RULES.consoleRange)) {
          this.emit(entity.id,'Radio jammed. Restore communications or use the emergency console.');return;
        }
        if (
          this.protocol.mission.phase === "transport" &&
          !this.protocol.mission.vehicle.autopilot &&
          !this.protocol.mission.vehicle.arrived
        )
          return;
        player.emergenciesLeft--;
        this.protocol.emergencyReadyAt = this.time + PROTOCOL_RULES.emergencyCooldown;
        this.startMeeting(entity, "Emergency assembly");
      }
    } else if (action.op === "eliminate") {
      this.eliminate(entity, targetId);
    } else if (action.op === "sabotage") {
      if (
        player.role !== INFILTRATORS ||
        player.sabotageReadyAt > this.time ||
        !["power", "comms"].includes(targetId)
      )
        return;
      const key = `${targetId}Until`;
      if (this.protocol.sabotage[key] > this.time) return;
      this.protocol.sabotage[key] = this.time + PROTOCOL_RULES.sabotageDuration;
      recordContribution(player, "sabotage", `${targetId}:${this.time}`);
      player.sabotageReadyAt = this.time + PROTOCOL_RULES.sabotageCooldown;
      player.channel = null;
      this.addLog(
        targetId === "power"
          ? "Base power interrupted. Restore the generator circuit."
          : "Radio link jammed. Restore the communications terminal.",
      );
    } else if (action.op === "vent") {
      if (
        player.role !== INFILTRATORS ||
        player.ventReadyAt > this.time ||
        this.protocol.bodies.some((b) => b.carriedBy === entity.id)
      )
        return;
      const source = this.protocol.vents.find((v) =>
        this.near(entity, v, PROTOCOL_RULES.consoleRange),
      );
      const destination = this.protocol.vents.find((v) => v.id === targetId);
      if (
        !source ||
        !destination ||
        !source.links.includes(destination.id) ||
        !this.canMove(destination.x, destination.y)
      )
        return;
      this.observe("vent", entity);
      entity.x = destination.x;
      entity.y = destination.y;
      entity.path = [];
      player.channel = null;
      player.ventReadyAt = this.time + PROTOCOL_RULES.ventCooldown;
      this.observe("vent", entity);
    } else if (action.op === "wire") {
      const channel = player.channel;
      if (player.role !== INFILTRATORS || channel?.kind !== "wire") return;
      const site = this.protocol.sites.find((s) => s.id === channel.target);
      if (
        channel.deadline < this.time ||
        !this.near(entity, site, PROTOCOL_RULES.interactRange) ||
        channel.damageSeq !== entity.damageSeq ||
        distance(entity, channel.origin) > 0.06 ||
        value !== channel.code ||
        !/^\d{3}$/.test(value) ||
        !this.availableSite(site, entity.id)
      ) {
        player.channel = null;
        this.emit(entity.id, "Arming sequence interrupted. Start the installation again.");
        return;
      }
      this.protocol.bombs.push({
        id: `charge-${this.protocol.nextId++}`,
        siteId: site.id,
        name: site.name,
        room: site.room,
        x: site.x,
        y: site.y,
        state: "armed",
        ownerId: entity.id,
        armedAt: this.time,
      });
      this.protocol.armedCount = this.protocol.bombs.length;
      recordContribution(player, "charges", site.id);
      player.channel = null;
      this.observe("plant", entity);
      if (this.protocol.bombs.length === 3) {
        this.protocol.detonateAt = this.time + PROTOCOL_RULES.fuseDuration;
        this.addLog(
          "Three linked charges detected. Find and disable a charge before the countdown expires.",
        );
      } else this.addLog("Security detected an active charge. Search concealed utility spaces.");
      this.emit(entity.id, `Charge armed: ${this.protocol.bombs.length}/3 distinct rooms.`);
    } else if (action.op === "drag") {
      if (player.role !== INFILTRATORS) return;
      const carried = this.protocol.bodies.find((b) => b.carriedBy === entity.id);
      if (carried) {
        carried.carriedBy = null;
        return;
      }
      const body = this.protocol.bodies.find(
        (b) => b.id === targetId && !b.reported && !b.carriedBy,
      );
      if (!this.near(entity, body, 1.1)) return;
      body.carriedBy = entity.id;
      player.channel = null;
      this.observe("drag", entity, body);
    }
  }

  availableSite(site, excludingId = null) {
    if (
      !site ||
      this.protocol.bombs.length >= 3 ||
      this.protocol.bombs.some((bomb) => bomb.siteId === site.id || bomb.room === site.room)
    )
      return false;
    return !Object.entries(this.protocol.players).some(
      ([id, player]) =>
        id !== excludingId &&
        ["plant", "wire"].includes(player.channel?.kind) &&
        this.protocol.sites.find((s) => s.id === player.channel.target)?.room === site.room,
    );
  }

  context(entity) {
    const player = this.privateFor(entity);
    if (
      this.protocol.phase !== "roam" ||
      !this.active(entity) ||
      this.protocol.mission.vehicle.pilotId === entity.id
    )
      return null;
    const mission = this.protocol.mission;
    const nearest = (list) =>
      list
        .filter((point) => this.near(entity, point, PROTOCOL_RULES.interactRange))
        .sort((a, b) => distance(entity, a) - distance(entity, b))[0];
    if (player.role === OPERATORS && this.active(entity)) {
      const bomb = nearest(this.protocol.bombs);
      if (bomb) return { kind: "defuse", target: bomb.id, duration: PROTOCOL_RULES.defuseDuration };
      const repair = nearest(
        this.protocol.stations.filter((station) => {
          const kind = /power|generator/.test(station.kind)
            ? "power"
            : /comms|radio|radar/.test(station.kind)
              ? "comms"
              : null;
          return kind && this.protocol.sabotage[`${kind}Until`] > this.time;
        }),
      );
      if (repair)
        return { kind: "repair", target: repair.id, duration: PROTOCOL_RULES.repairDuration };
      if (mission.phase === "base") {
        if (this.near(entity, mission.loading, PROTOCOL_RULES.interactRange)) {
          if (player.cargo)
            return {
              kind: "load",
              target: mission.loading.id,
              duration: PROTOCOL_RULES.loadDuration,
            };
          if (this.manifestComplete())
            return {
              kind: "depart",
              target: mission.loading.id,
              duration: PROTOCOL_RULES.departDuration,
            };
        }
        if (!player.cargo) {
          const supply = nearest(
            mission.supplyStock.filter(
              (stock) => stock.stock > 0 && this.neededSupply(stock.supplyId, entity.id) > 0,
            ),
          );
          if (supply)
            return { kind: "collect", target: supply.id, duration: PROTOCOL_RULES.collectDuration };
        }
      } else if (
        mission.phase === "transport" &&
        this.near(entity, TRANSPORT_MAP.cargo, PROTOCOL_RULES.interactRange)
      ) {
        if (mission.vehicle.cargoDamage > 0)
          return {
            kind: "repair-cargo",
            target: TRANSPORT_MAP.cargo.id,
            duration: PROTOCOL_RULES.cargoRepairDuration,
          };
        if (mission.vehicle.arrived && this.manifestComplete() && this.flightTasksComplete())
          return {
            kind: "deliver",
            target: TRANSPORT_MAP.cargo.id,
            duration: PROTOCOL_RULES.deliveryDuration,
          };
      }
    }
    if (player.role === INFILTRATORS) {
      if (!this.active(entity) || this.protocol.bodies.some((b) => b.carriedBy === entity.id))
        return null;
      const site = nearest(this.protocol.sites.filter((s) => this.availableSite(s, entity.id)));
      if (site) return { kind: "plant", target: site.id, duration: PROTOCOL_RULES.plantDuration };
      if (mission.phase === "transport" && player.sabotageReadyAt <= this.time) {
        if (
          !mission.vehicle.arrived &&
          mission.vehicle.autopilot &&
          this.near(entity, TRANSPORT_MAP.avionics, PROTOCOL_RULES.interactRange)
        )
          return {
            kind: "disable-autopilot",
            target: TRANSPORT_MAP.avionics.id,
            duration: PROTOCOL_RULES.autopilotSabotageDuration,
          };
        if (
          mission.vehicle.cargoDamage < 60 &&
          this.near(entity, TRANSPORT_MAP.cargo, PROTOCOL_RULES.interactRange)
        )
          return {
            kind: "cargo-sabotage",
            target: TRANSPORT_MAP.cargo.id,
            duration: PROTOCOL_RULES.cargoSabotageDuration,
          };
      }
      if (mission.phase === "base") {
        if (player.cargo && this.near(entity, mission.loading, PROTOCOL_RULES.interactRange))
          return {
            kind: "load",
            target: mission.loading.id,
            duration: PROTOCOL_RULES.loadDuration,
          };
        if (!player.cargo) {
          const supply = nearest(mission.supplyStock);
          if (supply)
            return { kind: "collect", target: supply.id, duration: PROTOCOL_RULES.collectDuration };
        }
      }
    }
    if (mission.phase === "transport") {
      const flightTask = nearest(
        mission.flightTasks.filter(
          (task) =>
            !task.done &&
            (!task.system || this.protocol.sabotage[`${task.system}Until`] <= this.time) &&
            (task.id !== "trauma" || mission.vehicle.cargoDamage === 0),
        ),
      );
      if (flightTask)
        return { kind: "flight-task", target: flightTask.id, duration: flightTask.duration };
    }
    const task =
      player.role === INFILTRATORS &&
      player.tasks.find(
        (task) =>
          !task.done &&
          this.near(
            entity,
            this.protocol.stations.find((station) => station.id === task.stationId),
            PROTOCOL_RULES.interactRange,
          ),
      );
    if (task && this.protocol.sabotage.commsUntil <= this.time)
      return {
        kind: "task",
        target: task.stationId,
        taskId: task.id,
        duration: PROTOCOL_RULES.taskDuration,
      };
    return null;
  }

  beginTask(entity, context) {
    const player = this.privateFor(entity);
    player.channel = { ...context, progress:0, origin:{x:entity.x,y:entity.y}, damageSeq:entity.damageSeq,
      challenge:createTaskGame(context, this.protocol.mission, `check-${this.protocol.nextId++}`, this.time, () => this.random()) };
  }

  channel(entity, held, moving, dt) {
    const player = this.privateFor(entity);
    let channel = player.channel;
    if (channel?.kind === "wire") {
      if (
        moving ||
        distance(entity, channel.origin) > 0.06 ||
        channel.damageSeq !== entity.damageSeq ||
        channel.deadline < this.time
      )
        player.channel = null;
      return;
    }
    const context = this.context(entity);
    if (
      (!held && !channel?.challenge) ||
      moving ||
      !context ||
      entity.departed ||
      (channel && channel.damageSeq !== entity.damageSeq)
    ) {
      player.channel = null;
      return;
    }
    if (channel?.challenge && (channel.kind !== context.kind || channel.target !== context.target || channel.challenge.deadline < this.time)) {
      player.channel = null;
      return;
    }
    if (!channel && this.protocol.mission.interactiveTasks && INTERACTIVE_TASKS.has(context.kind)) {
      this.beginTask(entity,context);
      channel = player.channel;
    }
    if (!channel || channel.kind !== context.kind || channel.target !== context.target)
      player.channel = channel = {
        ...context,
        progress: 0,
        origin: { x: entity.x, y: entity.y },
        damageSeq: entity.damageSeq,
      };
    if (distance(entity, channel.origin) > 0.06) {
      player.channel = null;
      return;
    }
    channel.progress = Math.min(channel.duration, channel.progress + dt);
    if (channel.progress < channel.duration || (channel.challenge && channel.challenge.index < channel.challenge.steps.length)) return;
    if (channel.kind === "plant") {
      channel.kind = "wire";
      channel.code = String(100 + Math.floor(this.random() * 900));
      channel.deadline = this.time + PROTOCOL_RULES.wireWindow;
      this.observe("plant", entity);
      return;
    }
    if (channel.kind === "collect") {
      const stock = this.protocol.mission.supplyStock.find((stock) => stock.id === channel.target);
      if (stock && !player.cargo) {
        if (
          player.role === OPERATORS &&
          stock.stock > 0 &&
          this.neededSupply(stock.supplyId, entity.id) > 0
        ) {
          stock.stock--;
          player.cargo = { id:`supply-${this.protocol.nextId++}`, supplyId: stock.supplyId, name: stock.name, sourceId: stock.id };
          this.emit(entity.id, "Medical supply secured. Carry it to the medevac loading pad.");
        } else if (player.role === INFILTRATORS) {
          player.cargo = { supplyId: stock.supplyId, name: stock.name, fake: true };
          recordContribution(player, "cover", `collect:${stock.id}`);
          this.emit(entity.id, "Collection cover maintained. The medical manifest is unchanged.");
        }
        this.observe("task", entity);
      }
    } else if (channel.kind === "load") {
      const cargo = player.cargo,
        item = cargo && this.protocol.mission.manifest.find((item) => item.id === cargo.supplyId);
      if (
        cargo &&
        player.role === OPERATORS &&
        !cargo.fake &&
        item &&
        item.loaded < item.required
      ) {
        item.loaded++;
        recordContribution(player, "supplies", cargo.id || `${cargo.supplyId}:${item.loaded}`);
        player.cargo = null;
        this.addLog("A medical supply was secured in the medevac cargo hold.");
      } else if (player.role === INFILTRATORS) player.cargo = null;
      else this.returnCargo(entity);
    } else if (channel.kind === "depart") {
      this.departMission(entity);
    } else if (channel.kind === "flight-task") {
      const task = this.protocol.mission.flightTasks.find((task) => task.id === channel.target);
      if (task && !task.done && player.role === OPERATORS) {
        task.done = true;
        recordContribution(player, "checks", `${task.id}:${this.time}`);
        this.observe("task", entity);
        this.addLog(`Aircraft duty completed: ${task.name}.`);
      } else if (player.role === INFILTRATORS) {
        recordContribution(player, "cover", `flight:${task?.id}`);
        this.emit(entity.id, "Flight-duty cover maintained. Shared preparation is unchanged.");
      }
    } else if (channel.kind === "disable-autopilot") {
      if (
        player.role === INFILTRATORS &&
        player.sabotageReadyAt <= this.time &&
        this.protocol.mission.vehicle.autopilot
      ) {
        this.unsafeFlight(true);
        recordContribution(player, "sabotage", `autopilot:${this.time}`);
        player.sabotageReadyAt = this.time + PROTOCOL_RULES.sabotageCooldown;
        this.observe("flight-sabotage", entity);
        this.addLog(
          "Autopilot disabled. A rescue operator must take the helm, stabilize the aircraft and restore it.",
        );
      }
    } else if (channel.kind === "cargo-sabotage") {
      if (player.role === INFILTRATORS && player.sabotageReadyAt <= this.time) {
        this.protocol.mission.vehicle.cargoDamage = Math.min(
          60,
          this.protocol.mission.vehicle.cargoDamage + 20,
        );
        recordContribution(player, "sabotage", `cargo:${this.time}`);
        const trauma = this.protocol.mission.flightTasks.find((task) => task.id === "trauma");
        if (trauma) trauma.done = false;
        player.sabotageReadyAt = this.time + PROTOCOL_RULES.sabotageCooldown;
        this.observe("cargo-sabotage", entity);
        this.addLog("Medical cargo damaged. Repair the cargo restraint system before delivery.");
      }
    } else if (channel.kind === "repair-cargo") {
      if (this.protocol.mission.vehicle.cargoDamage > 0) recordContribution(player, "repairs", `cargo:${this.time}`);
      this.protocol.mission.vehicle.cargoDamage = 0;
      this.addLog("Medical cargo repaired. Supplies are ready for delivery.");
    } else if (channel.kind === "deliver") {
      const mission = this.protocol.mission;
      if (
        player.role === OPERATORS &&
        mission.vehicle.arrived &&
        !mission.vehicle.cargoDamage &&
        this.manifestComplete() &&
        this.flightTasksComplete()
      ) {
        let rescued = 0;
        for (const patient of mission.patients)
          if (patient.hp > 0) {
            patient.rescued = true;
            patient.hp = Math.min(patient.maxHp, patient.hp + 30);
            rescued++;
          }
        if (rescued) {
          recordContribution(player, "patients", "delivery", rescued);
          mission.phase = "delivered";
          mission.deliveredAt = this.time;
          this.finish(
            0,
            `Medical supplies delivered. ${rescued} wounded ${rescued === 1 ? "soldier was" : "soldiers were"} rescued.`,
          );
        }
      }
    } else if (channel.kind === "defuse") {
      const bomb = this.protocol.bombs.find((b) => b.id === channel.target);
      this.protocol.bombs = this.protocol.bombs.filter((b) => b.id !== channel.target);
      this.protocol.armedCount = this.protocol.bombs.length;
      this.protocol.detonateAt = null;
      if (bomb) {
        recordContribution(player, "defuses", bomb.id);
        this.addLog("A patrol disabled a concealed charge. The linked countdown is stopped.");
        this.emit(entity.id, "Charge disabled. The linked countdown is stopped.");
      }
    } else if (channel.kind === "repair") {
      const station = this.protocol.stations.find((s) => s.id === channel.target);
      const kind = /power|generator/.test(station?.kind) ? "power" : "comms";
      if (this.protocol.sabotage[`${kind}Until`] > this.time) recordContribution(player, "repairs", `${kind}:${this.protocol.sabotage[`${kind}Until`]}`);
      this.protocol.sabotage[`${kind}Until`] = 0;
      this.addLog(`A patrol restored ${kind === "power" ? "base power" : "the radio link"}.`);
      this.emit(entity.id, "System restored. Continue your patrol.");
    } else {
      const task = player.tasks.find((t) => t.id === channel.taskId);
      if (task) task.done = true;
      this.observe("task", entity);
      this.emit(
        entity.id,
        player.role === OPERATORS
          ? "Assignment complete. Continue your patrol."
          : "Cover assignment completed. Keep your movements believable.",
      );
      player.botRestUntil = this.time + 5 + this.random() * 8;
    }
    player.channel = null;
    player.botGoal = null;
  }

  botAction(entity, op, target, value) {
    // Bots use exactly the same validators and code puzzle as human actions.
    this.action(entity, { seq: this.privateFor(entity).actionSeq + 1, op, target, value });
  }

  suspicion(entity) {
    return chooseSuspect(this.botMeetingContext(entity));
  }
  botMeetingContext(entity) {
    const player = this.privateFor(entity);
    const reported=this.protocol.bodies.filter(b=>b.reported).find(b=>this.protocol.meeting?.reason.includes(b.name));
    return {
      self: entity, player, time: this.time, room: this.roomAt(entity)?.name,
      // Only infiltrators know their own partner. No opponent roles enter the
      // reasoning module, even on the authoritative server.
      allies: player.role === INFILTRATORS
        ? this.entities.filter(e => e.id !== entity.id && e.team === 1).map(e => e.id) : [],
      entities: this.entities.map(e => ({id:e.id,name:e.name,hp:e.hp,departed:e.departed})),
      reportedBody:reported?{name:reported.name,room:this.roomAt(reported)?.name}:null,
      meeting: this.protocol.meeting,
    };
  }
  botMeeting(entity) {
    if (!this.active(entity)) return;
    const player=this.privateFor(entity), meeting=this.protocol.meeting;
    player.botDialogue ||= {opened:false,sent:0,replied:[]};
    if(this.protocol.phase === "discussion" && this.time >= player.botNextChat && this.time >= player.chatReadyAt) {
      const statement=nextStatement(this.botMeetingContext(entity));
      if(statement) {
        const before=meeting.messages.at(-1)?.id;
        this.botAction(entity,"chat",undefined,statement.text);
        if(meeting.messages.at(-1)?.id!==before&&meeting.messages.at(-1)?.sender===entity.id) {
          player.botDialogue.opened=true;
          player.botDialogue.sent++;
          if(statement.replyTo!=null)player.botDialogue.replied.push(statement.replyTo);
        }
      }
      player.botNextChat=this.time+(statement?1.8+this.random()*1.2:.6);
    }
    if(this.protocol.phase === "vote" && this.time >= player.botVoteAt && !Object.hasOwn(meeting.votes,entity.id))
      this.botAction(entity,"vote",this.suspicion(entity));
  }

  botNavigate(entity, goal, dt, stop = 0.8) {
    if (!goal || distance(entity, goal) <= stop) return false;
    if (this.time >= entity.nextPath || !entity.path.length) {
      entity.path = this.pathTo(entity, goal);
      entity.nextPath = this.time + 0.9;
    }
    let point = entity.path[0];
    if (point && distance(entity, point) < 0.15) {
      entity.path.shift();
      point = entity.path[0];
    }
    if (!point && this.visible(entity, goal)) point = goal;
    if (!point) return false;
    const d = distance(entity, point);
    if (d < 0.01) return false;
    const speed = entity.team === 1 ? 1.65 : entity.hp > 0 ? 1.2 : 1.35;
    entity.a = Math.atan2(point.y - entity.y, point.x - entity.x);
    this.move(
      entity,
      ((point.x - entity.x) / d) * Math.min(speed * dt, d),
      ((point.y - entity.y) / d) * Math.min(speed * dt, d),
    );
    return true;
  }

  botRoam(entity, dt) {
    const player = this.privateFor(entity);
    if (!this.active(entity)) return;
    const mission = this.protocol.mission,
      vehicle = mission.vehicle;
    if (mission.phase === "transport" && vehicle.pilotId === entity.id) {
      player.vehicleInput = {
        pitch: vehicle.altitude < 0.63 ? 1 : vehicle.altitude > 0.7 ? -1 : 0,
        steer: vehicle.heading > 0.05 ? -1 : vehicle.heading < -0.05 ? 1 : 0,
      };
      if (!vehicle.autopilot && vehicle.underControl) this.botAction(entity, "autopilot");
      if (vehicle.autopilot) this.botAction(entity, "release-helm");
      return;
    }
    this.discover(entity);
    if(this.time >= (player.nextObservationAt||0)) {
      player.nextObservationAt=this.time+1.2;
      player.contacts||=[];
      for(const other of this.entities)if(other!==entity&&this.sees(entity,other)) {
        player.contacts=player.contacts.filter(c=>c.id!==other.id);
        player.contacts.push({id:other.id,at:this.time,room:this.roomAt(other)?.name||'the corridor'});
      }
      player.contacts=player.contacts.filter(c=>this.time-c.at<120).slice(-12);
    }
    if (player.channel?.challenge) {
      const game = player.channel.challenge, step = game.steps[game.index];
      if (step && this.time >= game.nextAt) this.botAction(entity, "task-step", game.id, step.answer);
      this.channel(entity, false, false, dt);
      return;
    }
    if (this.active(entity)) {
      const body = this.protocol.bodies
        .filter((body) => !body.reported && this.near(entity, body, this.sightRange()))
        .sort((a, b) => distance(entity, a) - distance(entity, b))[0];
      if (
        body &&
        player.role === OPERATORS &&
        !(mission.phase === "transport" && !vehicle.autopilot && !vehicle.arrived)
      ) {
        player.channel = null;
        if (this.near(entity, body, PROTOCOL_RULES.reportRange))
          this.botAction(entity, "report", body.id);
        else this.botNavigate(entity, body, dt, 1.4);
        return;
      }
    }
    if (player.role === INFILTRATORS && this.active(entity)) {
      const target = this.entities.find(
        (e) =>
          e.team === 0 &&
          this.active(e) &&
          this.near(entity, e, 1.15) &&
          !this.entities.some(
            (witness) =>
              witness !== e &&
              witness !== entity &&
              this.active(witness) &&
              this.near(witness, entity, Math.min(4, this.sightRange())),
          ),
      );
      if (target && this.time >= player.killReadyAt) this.botAction(entity, "eliminate", target.id);
      if (mission.phase === "base" && this.time >= player.sabotageReadyAt && this.time > 25) {
        const kind = this.protocol.detonateAt !== null ? "comms" : "power";
        if (this.protocol.sabotage[`${kind}Until`] <= this.time)
          this.botAction(entity, "sabotage", kind);
      }
      if (player.channel?.kind === "wire") {
        // Authoritative bot code is its own pending arming puzzle, not a
        // privileged completion flag or access to another player's channel.
        this.botAction(entity, "wire", undefined, player.channel.code);
        return;
      }
    }
    if (
      player.role === INFILTRATORS &&
      this.time < player.botRestUntil &&
      this.protocol.detonateAt === null &&
      !player.channel
    )
      return;
    if (this.time >= player.botNextThink || !player.botGoal) {
      player.botNextThink = this.time + 1.2;
      let goal = null;
      if (player.role === OPERATORS && this.active(entity)) {
        if (mission.phase === "transport") {
          if (!vehicle.autopilot && !vehicle.pilotId && !vehicle.arrived) goal = TRANSPORT_MAP.helm;
          else if (vehicle.cargoDamage) goal = TRANSPORT_MAP.cargo;
          else
            goal =
              mission.flightTasks
                .filter(
                  (task) =>
                    !task.done &&
                    (!task.system || this.protocol.sabotage[`${task.system}Until`] <= this.time),
                )
                .sort((a, b) => distance(entity, a) - distance(entity, b))[0] ??
              TRANSPORT_MAP.cargo;
        }
        goal =
          this.protocol.bombs
            .filter((bomb) => player.discoveredBombs.includes(bomb.id))
            .sort((a, b) => distance(entity, a) - distance(entity, b))[0] ?? goal;
        goal ??= this.protocol.stations.find(
          (station) =>
            (/power|generator/.test(station.kind) &&
              this.protocol.sabotage.powerUntil > this.time) ||
            (/comms|radio|radar/.test(station.kind) &&
              this.protocol.sabotage.commsUntil > this.time),
        );
        if (!goal && mission.phase === "base") {
          if (player.cargo || this.manifestComplete()) goal = mission.loading;
          else
            goal = mission.supplyStock
              .filter(
                (stock) => stock.stock > 0 && this.neededSupply(stock.supplyId, entity.id) > 0,
              )
              .sort((a, b) => distance(entity, a) - distance(entity, b))[0];
        }
      }
      if (!goal && player.role === INFILTRATORS) {
        if (mission.phase === "transport" && player.sabotageReadyAt <= this.time)
          goal =
            vehicle.autopilot && !vehicle.arrived
              ? TRANSPORT_MAP.avionics
              : vehicle.cargoDamage < 60
                ? TRANSPORT_MAP.cargo
                : null;
        const choices = this.protocol.sites.filter((site) => this.availableSite(site, entity.id));
        choices.sort((a, b) => {
          const observers = (site) =>
            this.entities.filter(
              (e) =>
                e !== entity &&
                this.active(e) &&
                this.near(e, site, Math.min(4, this.sightRange())),
            ).length;
          return distance(entity, a) + observers(a) * 16 - distance(entity, b) - observers(b) * 16;
        });
        goal ??= choices[0];
      }
      if (!goal && player.role === INFILTRATORS) {
        const tasks = player.tasks.filter((task) => !task.done);
        const choices = tasks.map((task) =>
          this.protocol.stations.find((station) => station.id === task.stationId),
        );
        choices.splice(0, choices.length, ...choices.filter(Boolean));
        choices.sort((a, b) => distance(entity, a) - distance(entity, b));
        goal = choices[0];
      }
      // A finished patrol searches legitimate task rooms, without consulting
      // the hidden sockets or undiscovered bomb coordinates.
      if (!goal && this.active(entity))
        goal = this.protocol.stations[Math.floor(this.random() * this.protocol.stations.length)];
      player.botGoal = goal ? { id: goal.id, x: goal.x, y: goal.y } : null;
    }
    const goal = player.botGoal;
    const moving = this.botNavigate(entity, goal, dt);
    if (
      player.role === OPERATORS &&
      mission.phase === "transport" &&
      !vehicle.autopilot &&
      !vehicle.pilotId &&
      !vehicle.arrived &&
      this.near(entity, TRANSPORT_MAP.helm, PROTOCOL_RULES.interactRange)
    ) {
      this.botAction(entity, "helm");
      return;
    }
    const exposed =
      player.role === INFILTRATORS &&
      this.context(entity)?.kind === "plant" &&
      this.entities.some(
        (e) => e !== entity && e.team === 0 && this.active(e) && this.near(e, entity, 2.4),
      );
    this.channel(entity, !moving && !!goal && !exposed, moving, dt);
    if (
      !moving &&
      goal &&
      distance(entity, goal) <= 0.8 &&
      !this.context(entity) &&
      !player.channel
    )
      player.botGoal = null;
  }

  freezeDeadlines(dt) {
    const p = this.protocol;
    p.roundEndsAt += dt;
    if (p.detonateAt !== null) p.detonateAt += dt;
    if (p.emergencyReadyAt > this.time - dt) p.emergencyReadyAt += dt;
    for (const key of ["powerUntil", "commsUntil"])
      if (p.sabotage[key] > this.time - dt) p.sabotage[key] += dt;
    for (const player of Object.values(p.players))
      for (const key of ["killReadyAt", "sabotageReadyAt", "ventReadyAt"])
        if (player[key] > this.time - dt) player[key] += dt;
  }

  advance(dt, inputs = {}) {
    if (this.presentationOnly || this.state === "ended" || !Number.isFinite(dt) || dt <= 0) return;
    // Large elapsed gaps are advanced in bounded steps; they never complete a
    // channel in one packet or allow a player to tunnel through map walls.
    if (dt > 0.1) {
      const capped = Math.min(dt, 2);
      for (let remaining = capped; remaining > 1e-8; remaining -= 0.1)
        this.advance(Math.min(0.1, remaining), inputs);
      return;
    }
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      return;
    }
    for(const entity of this.entities)entity.crouching=false;
    this.time += dt;
    this.updateMedical(dt, inputs);
    this.checkResult();
    if (this.state === "ended") return;
    const wasMeeting = ["discussion", "vote", "combat"].includes(this.protocol.phase);
    if (wasMeeting) this.freezeDeadlines(dt);
    if (this.protocol.phase === "combat") {
      advanceCombat(this, dt, inputs);
      this.checkResult();
      return;
    }
    // Resolve one-shot actions before held interactions. Humans may report an
    // event immediately; entering a meeting cancels every pending installation.
    for (const entity of this.entities)
      if (!entity.bot && !entity.departed) {
        const input = inputs[entity.id] ?? {};
        if (
          this.protocol.mission.vehicle.pilotId !== entity.id &&
          Math.hypot(clamp(finite(input.forward), -1, 1), clamp(finite(input.strafe), -1, 1)) >
            0.025
        )
          this.privateFor(entity).channel = null;
        this.action(entity, input.protocolAction);
      }
    if (["discussion", "vote"].includes(this.protocol.phase)) {
      if (
        this.protocol.phase === "discussion" &&
        this.time >= this.protocol.meeting.discussionUntil
      )
        this.protocol.phase = "vote";
      for (const entity of this.entities) if (entity.bot) this.botMeeting(entity);
      if (this.time >= this.protocol.meeting.voteUntil) this.resolveMeeting();
      this.checkResult();
      return;
    }
    if (this.protocol.meeting?.resultUntil <= this.time) this.protocol.meeting = null;
    for (const entity of this.entities) {
      const player = this.privateFor(entity);
      if (entity.bot || !this.active(entity)) continue;
      const input = inputs[entity.id] ?? {};
      if (Number.isFinite(input.aim))
        entity.a = Math.atan2(Math.sin(input.aim), Math.cos(input.aim));
      if (Number.isFinite(input.pitch)) entity.pitch = clamp(input.pitch, -1, 1);
      let f = clamp(finite(input.forward), -1, 1),
        s = clamp(finite(input.strafe), -1, 1);
      if (this.protocol.mission.vehicle.pilotId === entity.id) {
        f = 0;
        s = 0;
      }
      const length = Math.max(1, Math.hypot(f, s));
      f /= length;
      s /= length;
      const moving = Math.hypot(f, s) > 0.025;
      const speed = input.sprint ? 2.6 : 1.8;
      this.move(
        entity,
        (Math.cos(entity.a) * f - Math.sin(entity.a) * s) * speed * dt,
        (Math.sin(entity.a) * f + Math.cos(entity.a) * s) * speed * dt,
      );
      // A pending puzzle is invalidated before its wire action can next be
      // accepted if the player tries to move, even against a blocking wall.
      this.channel(entity, input.interact === true, moving, dt);
      this.discover(entity);
    }
    for (const entity of this.entities) {
      if (this.protocol.phase !== "roam") break;
      if (entity.bot) this.botRoam(entity, dt);
    }
    for (const body of this.protocol.bodies)
      if (body.carriedBy) {
        const carrier = this.entities.find((e) => e.id === body.carriedBy);
        if (!this.active(carrier)) {
          body.carriedBy = null;
          continue;
        }
        const x = carrier.x - Math.cos(carrier.a) * 0.45,
          y = carrier.y - Math.sin(carrier.a) * 0.45;
        if (this.canMove(x, y, 0.1)) {
          body.x = x;
          body.y = y;
        }
      }
    // Visible working posture is shared for genuine and pretend work. It
    // exposes no channel kind, task progress, role or target; combat is upright.
    for(const entity of this.entities)
      entity.crouching=this.active(entity)&&this.protocol.phase==="roam"&&
        !!(this.privateFor(entity).channel||(!entity.bot&&inputs[entity.id]?.interact));
    this.checkResult();
  }
}

export function createArena(options = {}) {
  return options.mode === "protocol" ? new ProtocolArena(options) : new Arena(options);
}

export function restoreArena(data) {
  return data.mode === "protocol" ? ProtocolArena.restore(data) : Arena.restore(data);
}

/** A pure, deeply copied recipient view: never hand snapshot() to a client. */
export function protocolView(data, selfId) {
  if (!data?.protocol || data.mode !== "protocol") return clone(data);
  const p = data.protocol;
  const selfEntity = data.entities.find((e) => e.id === selfId);
  // Recipient data is already filtered; do not reinterpret neutral team -1 as
  // an operator or create missing assignments while presenting a server view.
  if (!p.players) return clone(data);
  const player = Object.hasOwn(p.players, selfId) ? p.players[selfId] : null;
  const isInfiltrator = player?.role === INFILTRATORS;
  const isLiving = selfEntity?.hp > 0 && !selfEntity.departed;
  const view = {};
  for (const key of [
    "mode",
    "difficulty",
    "countdown",
    "roundId",
    "mapId",
    "time",
    "state",
    "winner",
    "zone",
    "level",
    "nextEffect",
  ])
    view[key] = clone(data[key] ?? null);
  view.projectiles = [];
  view.fields = [];
  view.fx = [];
  view.crates = [];
  view.cores = [];
  view.entities = data.entities.map((entity) => {
    const value = {};
    for (const key of ENTITY_FIELDS) if (entity[key] !== undefined) value[key] = clone(entity[key]);
    value.team = entity.id === selfId ? entity.team : -1;
    if (entity.id === selfId) {
      value.notice = entity.notice ?? "";
      value.noticeId = entity.noticeId ?? 0;
    }
    value.path = [];
    value.nextPath = 0;
    value.attack = 0;
    // Individual kills are secret during the round. The outcome can reveal
    // them, but a scoreboard must not identify the killer while play continues.
    if (entity.id !== selfId && data.state !== "ended") value.kills = 0;
    return value;
  });
  const rayVisible = (point, range) => {
    if (!selfEntity || !isLiving || distance(selfEntity, point) > range) return false;
    // Same grid DDA as Arena, with no persisted simulation mutation.
    const observer = Object.create(Arena.prototype);
    observer.level = data.level;
    observer.crates = [];
    return observer.visible(selfEntity, point);
  };
  const sight = p.sabotage.powerUntil > data.time ? 2.6 : 7;
  const bombs = p.bombs
    .filter(
      (bomb) => isInfiltrator || player?.discoveredBombs.includes(bomb.id) || rayVisible(bomb, 2.2),
    )
    .map((bomb) => ({
      id: bomb.id,
      siteId: bomb.siteId,
      name: bomb.name,
      room: bomb.room,
      x: bomb.x,
      y: bomb.y,
      state: "armed",
      armedAt: bomb.armedAt,
    }));
  const bodies = p.bodies
    .filter(
      (body) =>
        body.reported ||
        body.killerId === selfId ||
        player?.bodyMemory?.[body.id] ||
        rayVisible(body, sight),
    )
    .map((body) => {
      const currentlyVisible = rayVisible(body, sight);
      const knownPosition =
        currentlyVisible || body.reported || isInfiltrator
          ? body
          : (player?.bodyMemory?.[body.id] ?? body);
      return {
        id: body.id,
        victimId: body.victimId,
        name: body.name,
        x: knownPosition.x,
        y: knownPosition.y,
        reported: body.reported,
        carriedBy:
          currentlyVisible || (isInfiltrator && body.carriedBy === selfId)
            ? (body.carriedBy ?? null)
            : null,
      };
    });
  const channel = player?.channel
    ? {
        kind: player.channel.kind,
        target: player.channel.target,
        progress: player.channel.progress,
        duration: player.channel.duration,
        ...(player.channel.challenge ? {challenge:taskGameView(player.channel.challenge)} : {}),
        ...(player.channel.kind === "wire"
          ? { code: player.channel.code, deadline: player.channel.deadline }
          : {}),
      }
    : null;
  const mission = p.mission;
  const publicMission = mission
    ? {
        version: mission.version,
        phase: mission.phase,
        title: mission.title,
        interactiveTasks: mission.interactiveTasks === true,
        flightTasks: (mission.flightTasks || []).map((task) => ({
          id: task.id,
          name: task.name,
          x: task.x,
          y: task.y,
          room: task.room,
          duration: task.duration,
          system: task.system,
          done: task.done,
        })),
        manifest: mission.manifest.map((item) => ({
          id: item.id,
          name: item.name,
          required: item.required,
          loaded: item.loaded,
        })),
        supplyStock: mission.supplyStock.map((stock) => ({
          id: stock.id,
          supplyId: stock.supplyId,
          name: stock.name,
          stock: stock.stock,
          x: stock.x,
          y: stock.y,
          room: stock.room,
        })),
        loading: {
          id: mission.loading.id,
          name: mission.loading.name,
          x: mission.loading.x,
          y: mission.loading.y,
          room: mission.loading.room,
        },
        patients: mission.patients.map((patient) => ({
          id: patient.id,
          name: patient.name,
          hp: patient.hp,
          maxHp: patient.maxHp,
          decay: patient.decay,
          rescued: patient.rescued,
        })),
        vehicle: Object.fromEntries(
          [
            "name",
            "autopilot",
            "pilotId",
            "progress",
            "duration",
            "altitude",
            "heading",
            "stability",
            "underControl",
            "stableFor",
            "recoveryDeadline",
            "disabledAt",
            "arrived",
            "cargoDamage",
          ].map((key) => [key, clone(mission.vehicle[key])]),
        ),
        startedAt: mission.startedAt,
        departedAt: mission.departedAt,
        deliveredAt: mission.deliveredAt,
      }
    : null;
  view.protocol = {
    phase: p.phase,
    roundEndsAt: p.roundEndsAt,
    taskDone: p.taskDone,
    taskTotal: p.taskTotal,
    armedCount: p.bombs.length,
    detonateAt: p.detonateAt,
    sabotage: clone(p.sabotage),
    bodies,
    bombs,
    sites: isInfiltrator ? clone(p.sites) : [],
    stations: clone(p.stations),
    vents: isInfiltrator ? clone(p.vents) : [],
    emergency: clone(p.emergency),
    emergencyReadyAt: p.emergencyReadyAt,
    meeting: p.meeting
      ? {
          id: p.meeting.id,
          caller: p.meeting.caller,
          reason: p.meeting.reason,
          discussionUntil: p.meeting.discussionUntil,
          voteUntil: p.meeting.voteUntil,
          votes: clone(p.meeting.votes),
          messages: clone(p.meeting.messages),
          result: p.meeting.result ?? null,
        }
      : null,
    log: clone(p.log),
    mission: publicMission,
    combat: p.combat
      ? {
          id: p.combat.id,
          targetId: p.combat.targetId,
          participants: [...p.combat.participants],
          startsAt: p.combat.startsAt,
          endsAt: p.combat.endsAt,
          result: p.combat.result,
          resultUntil: p.combat.resultUntil,
        }
      : null,
    self: player
      ? {
          role: player.role,
          deathScene: !isLiving && player.deathScene
            ? { id: player.deathScene.id, kind: player.deathScene.kind, at: player.deathScene.at }
            : null,
          tasks: clone(player.tasks),
          contributions: contributionsOf(player.contributions),
          channel,
          cargo: player.cargo ? { supplyId: player.cargo.supplyId, name: player.cargo.name } : null,
          ...(isInfiltrator
            ? {
                allies: data.entities
                  .filter((e) => e.id !== selfId && p.players[e.id]?.role === INFILTRATORS)
                  .map((e) => ({ id: e.id, name: e.name })),
              }
            : {}),
          actionSeq: player.actionSeq,
          lastActionSeq: player.actionSeq,
          killReadyAt: player.killReadyAt,
          sabotageReadyAt: player.sabotageReadyAt,
          ventReadyAt: player.ventReadyAt,
          emergenciesLeft: player.emergenciesLeft,
        }
      : null,
  };
  if (data.state === "ended") {
    view.protocol.revealedRoles = Object.fromEntries(
      Object.entries(p.players).map(([id, value]) => [id, value.role]),
    );
    view.protocol.resultReason = p.resultReason;
  }
  return view;
}
