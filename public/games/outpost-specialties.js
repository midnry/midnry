/** Specialties: one per player per match, dealt from the arena's seeded
 * random(). Operators get a detective skill, infiltrators a deception skill. */
export const SPECIALTIES = Object.freeze({
  medic: { id: "medic", name: "Medic", team: 0, uses: Infinity, cooldown: 0, text: "Examine a body (stand next to it and press Ability) to learn roughly when they died." },
  engineer: { id: "engineer", name: "Engineer", team: 0, uses: 0, cooldown: 0, text: "Passive: when power or radio is sabotaged, you learn which room it was done from." },
  security: { id: "security", name: "Security", team: 0, uses: 2, cooldown: 45, text: "Check cameras twice per match: see who is in the room of the latest attack or sabotage." },
  forger: { id: "forger", name: "Forger", team: 1, uses: 1, cooldown: 0, text: "Once per match, plant a fake smudge clue on everyone's case board that points at two operators." },
  ghost: { id: "ghost", name: "Ghost", team: 1, uses: 0, cooldown: 0, text: "Passive: you leave no footprints after an attack." },
});

/** Deal specialties: operators share medic/engineer/security as evenly as
 * possible; each infiltrator gets forger or ghost. */
export function dealSpecialties(entities, random) {
  const pick = (list, i) => list[i % list.length];
  const order = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.floor(random() * (i + 1)));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const crew = order(["medic", "engineer", "security"]),
    spies = order(["forger", "ghost"]);
  let c = 0,
    s = 0;
  const result = {};
  for (const e of order(entities)) result[e.id] = e.team === 1 ? pick(spies, s++) : pick(crew, c++);
  return result;
}
