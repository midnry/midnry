import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView, restoreArena } from "../public/games/outpost-protocol.js";
import { HOSPITAL_MAP } from "../public/games/outpost-protocol-map.js";
import { HOSPITAL_RULES, enterHospital, patientNeeds } from "../public/games/outpost-hospital.js";
import { treatAll } from "./hospital-test-helpers.mjs";

// A crew landed at the field hospital: one human operator, nobody else moves.
const landed = (options = {}) => {
  const a = new ProtocolArena({ rolePreference: "operator", ...options });
  for (const e of a.entities) e.bot = false;
  for (const item of a.protocol.mission.manifest) item.loaded = item.required;
  const me = a.entities[0];
  Object.assign(me, { x: a.protocol.mission.loading.x, y: a.protocol.mission.loading.y });
  assert.equal(a.departMission(me), true);
  enterHospital(a);
  return a;
};
const crew = (a) => a.entities.find((e) => e.team === 0);
const spy = (a) => a.entities.find((e) => e.team === 1);
const hold = (a, e, seconds) => {
  for (let t = 0; t < seconds; t += 0.05) a.advance(0.05, { [e.id]: { interact: true } });
};
const place = (e, p) => Object.assign(e, { x: p.x, y: p.y, path: [] });
const bed = (patient) => HOSPITAL_MAP.beds.find((b) => b.id === patient.bed);

test("landing switches to the field hospital: walkable spawns, a crate per loaded unit, two needs per patient", () => {
  const a = landed(),
    m = a.protocol.mission;
  assert.equal(a.mapId, "hospital");
  assert.equal(m.phase, "hospital");
  assert.ok(a.entities.every((e) => a.canMove(e.x, e.y)));
  assert.equal(m.hospital.crates.length, 9);
  assert.ok(m.patients.every((pt) => pt.needs.length === 2 && pt.bed));
  // The needs are dealt from the actual cargo, so every patient is treatable.
  const stock = {};
  for (const c of m.hospital.crates) stock[c.supplyId] = (stock[c.supplyId] || 0) + 1;
  for (const pt of m.patients) for (const id of pt.needs) assert.ok(stock[id]-- > 0);
  for (const p of [HOSPITAL_MAP.ramp, HOSPITAL_MAP.triage, ...HOSPITAL_MAP.beds, ...HOSPITAL_MAP.stations])
    assert.ok(a.canMove(p.x, p.y), p.id);
});

test("an operator unloads, treats and saves the wounded; the mission reads delivered", () => {
  const a = landed(),
    me = crew(a);
  treatAll(a, me);
  assert.equal(a.state, "ended");
  assert.equal(a.winner, 0);
  assert.equal(a.protocol.mission.phase, "delivered");
  assert.equal(a.protocol.mission.patients.filter((pt) => pt.rescued).length, 4);
  // The infiltrators are still free: the rescue is compromised, not perfect.
  assert.equal(a.protocol.ending.id, "compromised");
});

test("a contaminated crate is caught at triage, or harms the patient it is given to", () => {
  const a = landed(),
    me = crew(a),
    bad = spy(a),
    h = a.protocol.mission.hospital;
  a.privateFor(bad).tamperReadyAt = 0;
  place(bad, HOSPITAL_MAP.ramp);
  assert.equal(a.context(bad).kind, "tamper");
  hold(a, bad, HOSPITAL_RULES.tamperDuration + 0.1);
  const tampered = h.crates.filter((c) => c.tampered);
  assert.equal(tampered.length, 1);
  // The crew cannot see which one.
  const view = protocolView(a.snapshot(), me.id);
  assert.equal(JSON.stringify(view.protocol.mission.hospital).includes("tamper"), false);
  // Checked at triage: discarded, and everyone hears about it.
  for (const c of h.crates) if (!c.tampered) c.at = "used";
  place(me, HOSPITAL_MAP.ramp);
  hold(a, me, HOSPITAL_RULES.unloadDuration + 0.1);
  assert.equal(a.privateFor(me).cargo.crateId, tampered[0].id);
  place(me, HOSPITAL_MAP.triage);
  assert.equal(a.context(me).kind, "verify");
  hold(a, me, HOSPITAL_RULES.verifyDuration + 0.1);
  assert.equal(a.privateFor(me).cargo, null);
  assert.equal(tampered[0].at, "discarded");
  assert.equal(h.contaminated, 1);
  assert.ok(a.protocol.log.some((l) => /contaminated/i.test(l.text)));

  // Given unchecked instead: the patient is harmed and the crate is spent.
  const b = landed(),
    me2 = crew(b),
    hb = b.protocol.mission.hospital,
    patient = b.protocol.mission.patients[0],
    crate = hb.crates.find((c) => c.supplyId === patientNeeds(patient)[0]);
  crate.tampered = true;
  for (const c of hb.crates) if (c !== crate) c.at = "used";
  place(me2, HOSPITAL_MAP.ramp);
  hold(b, me2, HOSPITAL_RULES.unloadDuration + 0.1);
  const before = patient.hp;
  place(me2, bed(patient));
  hold(b, me2, HOSPITAL_RULES.treatDuration + 0.1);
  assert.ok(patient.hp < before - HOSPITAL_RULES.contaminatedHarm + 1);
  assert.equal(patient.given.length, 0);
});

test("an infiltrator's treatment wastes the crate; a cut generator stops treatment until repaired", () => {
  const a = landed(),
    bad = spy(a),
    me = crew(a),
    m = a.protocol.mission,
    patient = m.patients[0];
  a.privateFor(bad).tamperReadyAt = a.time + 999;
  place(bad, HOSPITAL_MAP.ramp);
  hold(a, bad, HOSPITAL_RULES.unloadDuration + 0.1);
  const crate = m.hospital.crates.find((c) => c.id === a.privateFor(bad).cargo.crateId);
  const target = m.patients.find((pt) => patientNeeds(pt).includes(crate.supplyId));
  place(bad, bed(target));
  assert.equal(a.context(bad).kind, "treat");
  hold(a, bad, HOSPITAL_RULES.treatDuration + 0.1);
  assert.equal(crate.at, "used");
  assert.equal(target.given.length, 0);
  // Power cut: no treatment, the generator is a repair.
  a.protocol.sabotage.powerUntil = a.time + 40;
  place(me, HOSPITAL_MAP.ramp);
  hold(a, me, HOSPITAL_RULES.unloadDuration + 0.1);
  const mine = m.patients.find((pt) => patientNeeds(pt).includes(a.privateFor(me).cargo.supplyId));
  place(me, bed(mine));
  assert.equal(a.context(me), null);
  place(me, HOSPITAL_MAP.stations[0]);
  assert.equal(a.context(me).kind, "repair");
  hold(a, me, 8);
  assert.ok(a.protocol.sabotage.powerUntil <= a.time);
  place(me, bed(mine));
  assert.equal(a.context(me).kind, "treat");
  void patient;
});

test("the deadline ends the round; fewer than two saved is a failed rescue", () => {
  const a = landed(),
    m = a.protocol.mission;
  a.time = m.hospital.deadline + 0.01;
  a.advance(0.05, {});
  assert.equal(a.state, "ended");
  assert.equal(a.winner, 1);
  assert.equal(a.protocol.ending.id, "failed");
  assert.match(a.protocol.resultReason, /move on/);
});

test("stopping every infiltrator at the hospital no longer ends it: the patients decide", () => {
  const a = landed(),
    m = a.protocol.mission;
  for (const e of a.entities) if (e.team === 1) e.hp = 0;
  a.advance(0.05, {});
  assert.equal(a.state, "playing");
  a.time = m.hospital.deadline + 0.01;
  a.advance(0.05, {});
  assert.equal(a.winner, 1);
  assert.equal(a.protocol.ending.id, "pyrrhic");
});

test("a perfect rescue: everyone saved, infiltrators stopped, no crew lost", () => {
  const a = landed(),
    me = crew(a);
  for (const e of a.entities) if (e.team === 1) e.hp = 0;
  treatAll(a, me);
  assert.equal(a.winner, 0);
  assert.equal(a.protocol.ending.id, "perfect");
  const view = protocolView(a.snapshot(), me.id);
  assert.equal(view.protocol.ending.title, "Perfect Rescue");
});

test("the hospital survives an authoritative save and reload, mid-carry", () => {
  const a = landed(),
    me = crew(a);
  a.protocol.authoritative = true;
  place(me, HOSPITAL_MAP.ramp);
  hold(a, me, HOSPITAL_RULES.unloadDuration + 0.1);
  const b = restoreArena(JSON.parse(JSON.stringify(a.snapshot())));
  assert.equal(b.presentationOnly, false);
  assert.equal(b.mapId, "hospital");
  assert.ok(b.privateFor(me).cargo.crateId);
  treatAll(b, b.entities.find((e) => e.id === me.id));
  assert.equal(b.winner, 0);
});

test("a five-seat Quick shift restores as a live simulation, not a frozen view", () => {
  const a = new ProtocolArena({ rolePreference: "operator", shift: "quick" });
  a.protocol.authoritative = true;
  assert.equal(a.entities.length, 5);
  const b = restoreArena(JSON.parse(JSON.stringify(a.snapshot())));
  assert.equal(b.presentationOnly, false);
});

test("bots run the whole hospital: unload, treat and finish", () => {
  const a = new ProtocolArena({ humans: [], random: () => 0.4 });
  for (const e of a.entities) if (e.team === 1) e.bot = false;
  for (let t = 0; t < 520 && a.state !== "ended"; t += 0.05) a.advance(0.05, {});
  assert.equal(a.winner, 0);
  assert.equal(a.protocol.mission.phase, "delivered");
  assert.ok(a.protocol.mission.patients.filter((pt) => pt.rescued).length >= 2);
});
