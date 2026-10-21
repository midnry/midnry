/** Act III dressing: Saint Brigid Field Hospital. Ward stretchers with the
 * four wounded, an IV pole and a status lamp each; the medevac's cargo
 * stacked by its ramp (one case per crate still waiting); a diesel generator
 * that goes dark when it is cut; field-hospital floodlights. Only public
 * mission data drives it: patient vitals and needs, crates on the ramp and
 * the power state. Contamination is never shown. */
import * as THREE from "three";
import { buildMedicalCase } from "./interactables.js";

const SCALE = 3;

export function buildHospital(r, root, map, { steel, paint, rubber, lamp }) {
  const fabric = r.protocolMaterial({ color: "#5d6b56", roughness: 0.95, metalness: 0 });
  const sheet = r.protocolMaterial({ color: "#d7dbd2", roughness: 0.92, metalness: 0 });
  const skin = r.protocolMaterial({ color: "#a9785a", roughness: 0.8, metalness: 0 });
  const blood = r.protocolMaterial({ color: "#6d1f1b", roughness: 0.7, metalness: 0 });
  r.hospitalBeds = [];
  for (const bed of map.beds || []) {
    const group = new THREE.Group();
    group.position.set(bed.x * SCALE, 0, bed.y * SCALE);
    root.add(group);
    // Field stretcher on folding legs, lengthwise along the ward.
    r.box(group, steel, [0, 0.74, 0], [0.82, 0.06, 2.3]);
    r.box(group, fabric, [0, 0.8, 0], [0.74, 0.08, 2.15]);
    for (const dx of [-0.36, 0.36]) for (const dz of [-1, 1]) r.box(group, steel, [dx, 0.37, dz], [0.05, 0.74, 0.05]);
    // The patient: body under a blanket, head on a roll.
    const body = new THREE.Group();
    group.add(body);
    r.box(body, sheet, [0, 0.95, 0.25], [0.6, 0.22, 1.45]);
    r.box(body, blood, [0.08, 1.07, 0.05], [0.24, 0.02, 0.3]);
    const head = r.mesh(body, r.geo("hospital-head", () => new THREE.SphereGeometry(0.16, 16, 12)), skin, [0, 1.0, -0.72]);
    head.userData.noBatch = true;
    r.box(body, sheet, [0, 0.9, -0.72], [0.5, 0.12, 0.3]);
    // A drawn sheet over the face when a patient is lost.
    const shroud = r.box(group, sheet, [0, 1.02, -0.4], [0.62, 0.2, 2.0]);
    shroud.userData.noBatch = true;
    shroud.visible = false;
    // IV pole and bag.
    r.cylinder(group, steel, [0.55, 1.05, -0.8], 0.02, 2.1, "y", 8);
    r.box(group, sheet, [0.55, 1.95, -0.8], [0.16, 0.24, 0.05]);
    // Status lamp: amber waiting, teal treating, green stable, red critical.
    const statusMat = new THREE.MeshStandardMaterial({ color: "#ffb54a", emissive: "#ffb54a", emissiveIntensity: 1.6, roughness: 0.4 });
    r.materials.add(statusMat);
    const status = r.mesh(group, r.geo("hospital-status", () => new THREE.SphereGeometry(0.075, 12, 8)), statusMat, [0.55, 2.25, -0.8]);
    status.userData.noBatch = true;
    r.hospitalBeds.push({ id: bed.id, head, shroud, status, statusMat });
  }
  // The cargo by the ramp: one case per crate on the ramp (nine slots).
  r.hospitalCrates = [];
  if (map.ramp) {
    for (let i = 0; i < 9; i++) {
      const col = i % 3,
        row = Math.floor(i / 3);
      const c = buildMedicalCase(r, root, [(map.ramp.x + 0.55) * SCALE + col * 0.86, 0.21 + row * 0.42, (map.ramp.y - 0.35) * SCALE], true);
      r.hospitalCrates.push(c);
    }
    // Ramp floor marking.
    const marking = r.protocolMaterial({ color: "#c9b46a", roughness: 0.85 });
    for (const dz of [-0.9, 0.9]) r.box(root, marking, [map.ramp.x * SCALE, 0.04, map.ramp.y * SCALE + dz], [2.4, 0.018, 0.05]);
  }
  // Triage check table.
  if (map.triage) {
    const t = new THREE.Group();
    t.position.set(map.triage.x * SCALE, 0, map.triage.y * SCALE);
    root.add(t);
    r.box(t, steel, [0, 0.9, 0], [1.5, 0.05, 0.8]);
    for (const dx of [-0.68, 0.68]) for (const dz of [-0.32, 0.32]) r.box(t, steel, [dx, 0.45, dz], [0.05, 0.9, 0.05]);
    r.box(t, sheet, [0, 0.94, 0], [1.3, 0.02, 0.6]);
    buildMedicalCase(r, t, [-0.35, 1.13, 0], false);
  }
  // Generator: a diesel set whose panel lamp follows the power state.
  const gen = map.stations?.find((s) => s.kind === "power");
  if (gen) {
    const g = new THREE.Group();
    g.position.set(gen.x * SCALE, 0, (gen.y - 0.6) * SCALE);
    root.add(g);
    r.box(g, paint, [0, 0.75, 0], [2.4, 1.5, 1.2]);
    r.box(g, rubber, [0, 0.08, 0], [2.6, 0.16, 1.4]);
    r.cylinder(g, steel, [0.9, 1.9, 0.2], 0.08, 0.8, "y", 12);
    r.hospitalPower = new THREE.MeshStandardMaterial({ color: "#7cff9a", emissive: "#4dff7a", emissiveIntensity: 1.8 });
    r.materials.add(r.hospitalPower);
    const light = r.box(g, r.hospitalPower, [0, 1.1, 0.61], [0.4, 0.14, 0.02]);
    light.userData.noBatch = true;
  }
  // Floodlights on poles at the landing zone and the ward entrance.
  for (const [x, y] of [[2.6, 5.6], [9.4, 16.4], [11.6, 13.6]]) {
    r.cylinder(root, steel, [x * SCALE, 2.6, y * SCALE], 0.06, 5.2, "y", 8);
    r.box(root, lamp, [x * SCALE, 5.25, y * SCALE], [0.6, 0.22, 0.32]);
  }
  r.protocolLightMaterials.push(lamp);
}

const COLORS = { waiting: "#ffb54a", treating: "#45d6c2", stable: "#6dff8a", critical: "#ff4a3a" };

export function updateHospital(r, mission, view, now) {
  const h = mission?.hospital;
  if (!h || !r.hospitalBeds) return;
  const onRamp = h.crates.filter((c) => c.at === "ramp").length;
  r.hospitalCrates?.forEach((c, i) => (c.visible = i < onRamp));
  const powered = !(view?.protocol?.sabotage?.powerUntil > view?.time);
  if (r.hospitalPower) {
    r.hospitalPower.emissiveIntensity = powered ? 1.8 : 0;
    r.hospitalPower.color.set(powered ? "#7cff9a" : "#3a2b28");
  }
  const blink = r.motion.matches ? 1 : 0.6 + 0.4 * Math.sin(now * 6);
  for (const bed of r.hospitalBeds) {
    const patient = mission.patients.find((pt) => pt.bed === bed.id);
    if (!patient) continue;
    const lost = patient.hp <= 0;
    bed.shroud.visible = lost;
    bed.head.visible = !lost;
    bed.status.visible = !lost;
    const started = patient.given ? patient.given.length > 0 : (patient.needs?.length ?? 2) < 2;
    const state = patient.rescued ? "stable" : patient.hp <= 25 ? "critical" : started ? "treating" : "waiting";
    bed.statusMat.color.set(COLORS[state]);
    bed.statusMat.emissive.set(COLORS[state]);
    bed.statusMat.emissiveIntensity = (powered ? 1.6 : 0.4) * (state === "critical" ? blink : 1);
  }
}
