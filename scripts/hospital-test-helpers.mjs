// Act III for tests: one operator carries crates from the ramp and treats
// the wounded until the round ends (or nothing more can be done).
import { HOSPITAL_MAP } from "../public/games/outpost-protocol-map.js";
import { HOSPITAL_RULES, patientNeeds } from "../public/games/outpost-hospital.js";

export function treatAll(arena, e) {
  const hold = (seconds) => {
    for (let t = 0; t < seconds; t += 0.05) arena.advance(0.05, { [e.id]: { interact: true } });
  };
  const place = (p) => Object.assign(e, { x: p.x, y: p.y, path: [] });
  for (let i = 0; i < 40 && arena.state !== "ended"; i++) {
    const player = arena.privateFor(e);
    if (!player.cargo) {
      place(HOSPITAL_MAP.ramp);
      hold(HOSPITAL_RULES.unloadDuration + 0.1);
      if (!player.cargo) return;
    }
    const patient = arena.protocol.mission.patients.find(
      (pt) => pt.hp > 0 && !pt.rescued && patientNeeds(pt).includes(player.cargo.supplyId),
    );
    if (!patient) return;
    place(HOSPITAL_MAP.beds.find((b) => b.id === patient.bed));
    hold(HOSPITAL_RULES.treatDuration + 0.1);
  }
}
