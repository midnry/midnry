/**
 * Blackout Protocol, Act III: the field hospital.
 *
 * The medevac lands at Saint Brigid Field Hospital. Every unit of the loaded
 * manifest becomes a crate on the aircraft ramp. Each of the four wounded
 * needs two specific supplies (dealt from the cargo, one spare). Operators
 * carry a crate from the ramp, may check it at the triage table, and treat a
 * patient at their bed while the generator runs. Infiltrators can quietly
 * contaminate crates at the ramp, waste a crate on the wrong patient, cut the
 * generator or attack. The round ends when every living patient is treated,
 * every patient is lost, or the hospital deadline passes; at least two
 * patients treated (or all still alive on landing) is a rescue, and the
 * mission phase then reads "delivered". The result is graded from what
 * happened.
 *
 * Pure rules on a ProtocolArena (`a`); no rendering or DOM here.
 */
import { HOSPITAL_MAP } from "./outpost-protocol-map.js";
import { recordContribution } from "./outpost-mission-progress.js";

export const HOSPITAL_RULES = Object.freeze({
  /** Seconds at the hospital before the field surgeons move on. */
  deadline: { full: 110, quick: 75 },
  /** Patients that must be treated for the rescue to count. */
  rescueTarget: 2,
  unloadDuration: 3,
  verifyDuration: 3,
  treatDuration: 4,
  tamperDuration: 4,
  /** A contaminated supply hurts the patient it is given to. */
  contaminatedHarm: 18,
  /** Seconds between an infiltrator's crate tampering. */
  tamperCooldown: 25,
});

/** Graded endings, worked out from the round's record (see `hospitalEnding`). */
export const ENDINGS = Object.freeze({
  perfect: { title: "Perfect Rescue", crew: true },
  costly: { title: "Costly Victory", crew: true },
  compromised: { title: "Compromised Victory", crew: true },
  contained: { title: "Infiltrators Contained", crew: true },
  pyrrhic: { title: "Pyrrhic Victory", crew: false },
  failed: { title: "Failed Rescue", crew: false },
  infiltrators: { title: "Infiltrator Victory", crew: false },
});

const near = (a, entity, point, range = 1.4) => a.near(entity, point, range);

/** Land at the hospital: switch the map, lay out the cargo and the needs. */
export function enterHospital(a) {
  const p = a.protocol,
    mission = p.mission;
  mission.phase = "hospital";
  mission.deliveredAt = a.time;
  a.mapId = HOSPITAL_MAP.id;
  a.level = HOSPITAL_MAP.level.map((row) => [...row]);
  const size = a.level.length;
  a.zone = { cx: size / 2, cy: size / 2, half: size, initialHalf: size, minHalf: size, delay: 1e9, duration: 1e9 };
  p.stations = structuredClone(HOSPITAL_MAP.stations);
  p.sites = [];
  p.vents = [];
  p.emergency = structuredClone(HOSPITAL_MAP.emergency);
  p.bodies = [];
  p.bombs = [];
  p.armedCount = 0;
  p.detonateAt = null;
  p.meeting = null;
  p.sabotage = { powerUntil: 0, commsUntil: 0 };
  // One crate per loaded unit; cargo damage that was never repaired spoils one.
  const units = [];
  for (const item of mission.manifest)
    for (let i = 0; i < item.loaded; i++) units.push({ supplyId: item.id, name: item.name });
  const crates = units.map((u, i) => ({ id: `crate-${i + 1}`, supplyId: u.supplyId, name: u.name, at: "ramp", tampered: false, checked: false }));
  // Needs: deal the cargo out to the living wounded, two each, from a shuffle.
  const deck = crates.map((c) => c.supplyId);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(a.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  mission.patients.forEach((patient, i) => {
    patient.bed = HOSPITAL_MAP.beds[i]?.id ?? null;
    patient.needs = patient.hp > 0 ? deck.splice(0, 2) : [];
    patient.given = [];
  });
  mission.hospital = {
    crates,
    // Two saved is a rescue, or everyone still alive when the medevac lands.
    target: Math.min(HOSPITAL_RULES.rescueTarget, mission.patients.filter((pt) => pt.hp > 0).length),
    deadline: a.time + HOSPITAL_RULES.deadline[a.shift === "full" ? "full" : "quick"],
    startedAt: a.time,
    harmed: 0,
    wasted: 0,
    contaminated: 0,
  };
  for (let i = 0; i < a.entities.length; i++) {
    const e = a.entities[i],
      player = a.privateFor(e);
    [e.x, e.y] = HOSPITAL_MAP.spawns[i % HOSPITAL_MAP.spawns.length];
    e.a = 0;
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
    player.tamperReadyAt = a.time + 12;
  }
  a.addLog("Lifeline Medevac has landed at the field hospital. Unload the cargo and treat the wounded.");
  for (const e of a.entities)
    if (a.active(e)) a.emit(e.id, "Landed. Carry the supplies from the ramp to the ward beds.");
}

const remainingNeed = (patient) => {
  const left = [...patient.needs];
  for (const id of patient.given) {
    const i = left.indexOf(id);
    if (i >= 0) left.splice(i, 1);
  }
  return left;
};
export const patientNeeds = remainingNeed;

const bedOf = (id) => HOSPITAL_MAP.beds.find((b) => b.id === id);
const powered = (a) => a.protocol.sabotage.powerUntil <= a.time;

/** What the entity can do here, or null. Same shape as ProtocolArena.context. */
export function hospitalContext(a, entity, player, operator) {
  const mission = a.protocol.mission,
    h = mission.hospital;
  if (!h) return null;
  const cargo = player.cargo;
  if (near(a, entity, HOSPITAL_MAP.ramp)) {
    // An infiltrator with the chance tampers; otherwise carries like anyone.
    if (!operator && !cargo && player.tamperReadyAt <= a.time && h.crates.some((c) => c.at === "ramp" && !c.tampered))
      return { kind: "tamper", target: HOSPITAL_MAP.ramp.id, duration: HOSPITAL_RULES.tamperDuration };
    if (!cargo && h.crates.some((c) => c.at === "ramp"))
      return { kind: "unload", target: HOSPITAL_MAP.ramp.id, duration: HOSPITAL_RULES.unloadDuration };
  }
  if (cargo?.crateId) {
    const crate = h.crates.find((c) => c.id === cargo.crateId);
    if (crate && !crate.checked && near(a, entity, HOSPITAL_MAP.triage))
      return { kind: "verify", target: HOSPITAL_MAP.triage.id, duration: HOSPITAL_RULES.verifyDuration };
    if (crate && powered(a)) {
      const patient = mission.patients
        .filter((pt) => pt.hp > 0 && !pt.rescued && remainingNeed(pt).includes(crate.supplyId))
        .find((pt) => near(a, entity, bedOf(pt.bed)));
      if (patient) return { kind: "treat", target: patient.bed, duration: HOSPITAL_RULES.treatDuration };
    }
  }
  return null;
}

/** A finished hold at the hospital. */
export function completeHospital(a, entity, player, channel, operator) {
  const mission = a.protocol.mission,
    h = mission.hospital;
  if (!h) return;
  if (channel.kind === "unload") {
    if (player.cargo) return;
    // Take a crate someone still needs; else whatever is left.
    const wanted = new Set(mission.patients.filter((pt) => pt.hp > 0 && !pt.rescued).flatMap(remainingNeed));
    const carried = new Set(h.crates.filter((c) => c.at === "carried").map((c) => c.supplyId));
    const ramp = h.crates.filter((c) => c.at === "ramp");
    const crate = ramp.find((c) => wanted.has(c.supplyId) && !carried.has(c.supplyId)) ?? ramp.find((c) => wanted.has(c.supplyId)) ?? ramp[0];
    if (!crate) return;
    crate.at = "carried";
    crate.carrier = entity.id;
    player.cargo = { crateId: crate.id, supplyId: crate.supplyId, name: crate.name };
    a.emit(entity.id, `Carrying ${crate.name}. Take it to a patient who needs it.`);
  } else if (channel.kind === "tamper") {
    if (operator || player.tamperReadyAt > a.time) return;
    const options = h.crates.filter((c) => c.at === "ramp" && !c.tampered);
    if (!options.length) return;
    const crate = options[Math.floor(a.random() * options.length)];
    crate.tampered = true;
    crate.tamperedBy = entity.id;
    player.tamperReadyAt = a.time + HOSPITAL_RULES.tamperCooldown;
    recordContribution(player, "sabotage", `tamper:${crate.id}`);
    a.record(`${entity.name} contaminated a crate of ${crate.name.toLowerCase()} on the ramp.`, "secret", entity.id);
  } else if (channel.kind === "verify") {
    const crate = h.crates.find((c) => c.id === player.cargo?.crateId);
    if (!crate) return;
    crate.checked = true;
    if (crate.tampered) {
      crate.at = "discarded";
      player.cargo = null;
      h.contaminated++;
      a.addLog(`Triage found a contaminated crate of ${crate.name.toLowerCase()}. Someone tampered with the cargo.`);
      a.emit(entity.id, "Contaminated! The crate is discarded. Someone tampered with it at the ramp.");
      if (operator) recordContribution(player, "repairs", `verify:${crate.id}`);
    } else a.emit(entity.id, `${crate.name}: checked and safe.`);
  } else if (channel.kind === "treat") {
    const crate = h.crates.find((c) => c.id === player.cargo?.crateId),
      patient = a.protocol.mission.patients.find((pt) => pt.bed === channel.target);
    if (!crate || !patient || patient.hp <= 0 || patient.rescued || !powered(a)) return;
    player.cargo = null;
    crate.at = "used";
    crate.usedOn = patient.id;
    crate.usedBy = entity.id;
    if (!operator) {
      // Misrouted: the same posture and the crate is gone, but nothing helps.
      h.wasted++;
      a.record(`${entity.name} wasted ${crate.name.toLowerCase()} on ${patient.name}.`, "secret", entity.id);
      return;
    }
    if (crate.tampered) {
      h.harmed++;
      patient.hp = Math.max(0, patient.hp - HOSPITAL_RULES.contaminatedHarm);
      a.addLog(`${patient.name} reacted badly to contaminated ${crate.name.toLowerCase()}. The crate had been tampered with.`);
      return;
    }
    patient.given.push(crate.supplyId);
    recordContribution(player, "patients", `treat:${crate.id}`);
    if (!remainingNeed(patient).length) {
      patient.rescued = true;
      patient.hp = Math.min(patient.maxHp, patient.hp + 30);
      a.addLog(`${patient.name} is stable. ${entity.name} completed the treatment.`);
    } else a.addLog(`${entity.name} gave ${patient.name} ${crate.name.toLowerCase()}.`);
  }
}

/** A carried crate goes back to the ramp when its carrier is gone. */
export function dropHospitalCargo(a, entity, player) {
  const crate = a.protocol.mission.hospital?.crates.find((c) => c.id === player.cargo?.crateId);
  if (crate && crate.at === "carried") {
    crate.at = "ramp";
    delete crate.carrier;
  }
  player.cargo = null;
}

/** Per tick: the deadline and the end of the round. (A patient's decline
 * halves once treatment has begun; see ProtocolArena.updateMedical.) */
export function updateHospital(a) {
  const mission = a.protocol.mission,
    h = mission.hospital;
  if (!h || a.state === "ended") return;
  const living = mission.patients.filter((pt) => pt.hp > 0);
  const open = living.filter((pt) => !pt.rescued);
  const rescued = mission.patients.filter((pt) => pt.rescued).length;
  const outOfCargo = open.length && !h.crates.some((c) => ["ramp", "carried"].includes(c.at) && open.some((pt) => remainingNeed(pt).includes(c.supplyId)));
  if (!open.length || a.time >= h.deadline || outOfCargo) {
    const crew = rescued >= (h.target ?? HOSPITAL_RULES.rescueTarget);
    // A rescue completes the mission; the medevac's work is delivered.
    if (crew) mission.phase = "delivered";
    const why = !open.length
      ? living.length
        ? "Every surviving patient has been treated."
        : "No patient survived."
      : outOfCargo
        ? "The usable supplies ran out before every patient was treated."
        : "The field surgeons had to move on.";
    a.finish(
      crew ? 0 : 1,
      `${why} ${rescued} of ${mission.patients.length} wounded ${rescued === 1 ? "was" : "were"} saved.`,
    );
  }
}

/** The graded ending for a finished round (also for rounds that ended early). */
export function hospitalEnding(a) {
  const mission = a.protocol.mission,
    rescued = mission.patients.filter((pt) => pt.rescued).length,
    infiltrators = a.entities.filter((e) => e.team === 1),
    stopped = infiltrators.every((e) => !a.active(e)),
    crewLost = a.entities.filter((e) => e.team === 0 && !a.active(e)).length;
  let id;
  if (mission.phase === "hospital" || mission.phase === "delivered") {
    if (a.winner === 0) id = !stopped ? "compromised" : rescued === mission.patients.length && crewLost === 0 ? "perfect" : "costly";
    else id = stopped ? "pyrrhic" : "failed";
  } else id = a.winner === 0 ? "contained" : "infiltrators";
  return { id, title: ENDINGS[id].title, rescued, total: mission.patients.length, crewLost };
}

/** Bots: operators fetch, carry and treat; infiltrators blend in and tamper. */
export function hospitalBotGoal(a, entity, player, operator) {
  const mission = a.protocol.mission,
    h = mission.hospital;
  if (!h) return null;
  if (player.cargo?.crateId) {
    const crate = h.crates.find((c) => c.id === player.cargo.crateId);
    const patient = mission.patients.find((pt) => pt.hp > 0 && !pt.rescued && remainingNeed(pt).includes(crate?.supplyId));
    // Careful crews check a crate at triage first, more so once one was bad.
    if (operator && crate && !crate.checked && (player.checksCrates ??= a.random() < (h.contaminated ? 0.8 : 0.35)))
      return HOSPITAL_MAP.triage;
    if (patient && (operator || a.random() < 0.6)) return bedOf(patient.bed);
    return operator ? HOSPITAL_MAP.triage : bedOf(mission.patients[0].bed);
  }
  delete player.checksCrates;
  if (!operator && player.tamperReadyAt <= a.time) return HOSPITAL_MAP.ramp;
  if (h.crates.some((c) => c.at === "ramp")) return HOSPITAL_MAP.ramp;
  return null;
}
