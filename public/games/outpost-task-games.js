/** Small, deterministic equipment checks. The simulation owns the sequence,
 * timing and completion; UI packets contain only a challenge ID and a choice. */
export const INTERACTIVE_TASKS = new Set([
  "collect",
  "flight-task",
  "repair",
  "repair-cargo",
  "deliver",
]);
const choice = (prompt, labels, answer = 0) => ({
  prompt,
  options: labels.map((label, i) => ({ id: String(i), label })),
  answer: String(answer),
});

// Skill steps. The simulation keeps the canonical answer (bots and replays
// use it); players must earn it. A miss costs time and re-deals the step.
const COLORS = ["red", "green", "blue", "yellow"];
/** Stop a sweeping needle inside a narrow band. */
const needle = (prompt, random, width = 18) => {
  const from = 12 + Math.floor(random() * (88 - width - 12));
  return { kind: "needle", prompt, zone: { from, to: from + width }, period: 1.8, answer: String(from + width / 2) };
};
/** A code flashes for a moment, then must be typed from memory. */
const memoryCode = (prompt, random, length = 4) => {
  let code = "";
  for (let i = 0; i < length; i++) code += String(Math.floor(random() * 10));
  return { kind: "code", prompt, code, reveal: 2.2, answer: code };
};
/** A colour sequence flashes, then must be repeated in order. */
const sequence = (prompt, random, length = 4) => {
  const seq = Array.from({ length }, () => COLORS[Math.floor(random() * COLORS.length)][0]).join("");
  return { kind: "sequence", prompt, seq, reveal: 2.6, answer: seq };
};
const SKILLS = { needle, code: memoryCode, sequence };
/** A fresh copy of a skill step with new values (after a miss). */
function redeal(step, random) {
  const make = SKILLS[step.kind];
  return make ? make(step.prompt, random, step.kind === "needle" ? step.zone.to - step.zone.from : (step.code || step.seq).length) : step;
}
export function createTaskGame(context, mission, id, now, random = Math.random) {
  let title, steps;
  if (context.kind === "collect") {
    const stock = mission.supplyStock.find((s) => s.id === context.target);
    const contents = {
      trauma: ["Sealed trauma kit", "Sterile dressings", "Medical inventory label"],
      surgical: ["Sealed surgical pack", "Sterile instrument case", "Medical inventory label"],
      fluids: ["Sealed IV fluid pack", "Protected supply tubing", "Medical inventory label"],
      nutrition: ["Recovery supplement pack", "Unbroken packaging seal", "Medical inventory label"],
    }[stock?.supplyId] || ["Sealed medical pack", "Intact packaging", "Medical inventory label"];
    title = `Collect ${stock?.name || "medical supplies"}`;
    steps = [
      random() < 0.5
        ? needle(`Steady the ${contents[0].toLowerCase()} as you lift it: stop the needle in the green band.`, random)
        : memoryCode("Log the batch number. It shows for a moment, then type it from memory.", random),
    ];
  } else if (context.kind === "flight-task" && context.target === "oxygen") {
    title = "Medical oxygen check";
    const target = 45 + Math.floor(random() * 4) * 5;
    steps = [
      needle("Crack the oxygen valve open: stop the needle in the green band.", random, 16),
      {
        prompt: `Set the test gauge to ${target}% (±3%).`,
        range: { min: 0, max: 100, target, tolerance: 3 },
        answer: String(target),
      },
    ];
  } else if (context.kind === "flight-task" && context.target === "landing") {
    title = "Landing confirmation";
    steps = [memoryCode("The casualty station flashes its beacon code. Type it back to confirm landing.", random)];
  } else if (context.kind === "deliver") {
    title = "Casualty delivery";
    const patients = mission.patients
      .filter((p) => p.hp > 0 && !p.rescued)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    // Triage: who is fading fastest? Read the vitals and treat them first.
    steps = patients.length > 1
      ? [
          choice(
            "Triage: treat the patient with the lowest vitals first.",
            patients.slice(0, 4).map((patient) => `${patient.name} · ${Math.ceil(patient.hp)}%`),
          ),
        ]
      : patients.map((patient) => choice(`Hand the aid to ${patient.name}.`, [patient.name, "Return shipment"]));
    if (!steps.length)
      steps = [choice("Confirm the delivery manifest.", ["Confirm manifest", "Discard supplies"])];
  } else if (context.kind === "ghost") {
    title = "Remote support";
    // Two quick skill checks of different kinds, never the same twice.
    const kinds = ["needle", "code", "sequence"];
    const first = kinds[Math.floor(random() * 3) % 3];
    const second = kinds.filter((k) => k !== first)[Math.floor(random() * 2) % 2];
    const make = {
      needle: () => needle("Hold the radio on the medics' channel: stop the needle in the green band.", random),
      code: () => memoryCode("Relay the field code. It shows for a moment, then type it from memory.", random),
      sequence: () => sequence("Patch the relay: press the lights in the order they flash.", random),
    };
    steps = [make[first](), make[second]()];
  } else if (context.kind === "repair") {
    title = "System recovery";
    steps = [sequence("Reconnect the wires in the order they light up.", random)];
  } else {
    title = context.kind === "repair-cargo" ? "Cargo restraint repair" : "Secure trauma shipment";
    steps = [needle("Ratchet the restraint tight: stop the needle in the green band.", random, 16)];
  }
  // Shuffle each labelled option; cues stay explicit and keyboard accessible.
  for (const step of steps)
    if (step.options) {
      for (let i = step.options.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [step.options[i], step.options[j]] = [step.options[j], step.options[i]];
      }
    }
  const nextAt = now + 0.35;
  for (const step of steps) if (step.reveal) step.revealUntil = nextAt + step.reveal;
  return { id, title, steps, index: 0, deadline: now + 36, nextAt, feedback: "" };
}
export function taskStep(game, value, now, random = Math.random) {
  if (!game || game.deadline < now || now < game.nextAt || game.index >= game.steps.length)
    return false;
  const step = game.steps[game.index];
  const text = typeof value === "string" ? value : "";
  const valid = step.range
    ? /^\d{1,3}$/.test(text) && Math.abs(Number(text) - step.range.target) <= step.range.tolerance
    : step.kind === "needle"
      ? /^\d{1,3}(\.\d+)?$/.test(text) && Number(text) >= step.zone.from && Number(text) <= step.zone.to
      : text === step.answer;
  game.nextAt = now + 0.4;
  if (!valid) {
    if (step.kind) {
      // A miss costs time and deals a new needle band, code or sequence.
      game.nextAt = now + 1.2;
      const fresh = redeal(step, random);
      if (fresh.reveal) fresh.revealUntil = game.nextAt + fresh.reveal;
      game.steps[game.index] = fresh;
      game.feedback =
        step.kind === "needle" ? "Missed the band. Steady… try again." : "That's not it. Watch again.";
    } else game.feedback = "Check the instruction and try again.";
    return false;
  }
  game.index++;
  const next = game.steps[game.index];
  if (next?.reveal) next.revealUntil = game.nextAt + next.reveal;
  game.feedback =
    game.index === game.steps.length
      ? "Checks passed. Finishing the equipment cycle…"
      : "Check passed.";
  return true;
}
export function taskGameView(game, now = 0) {
  if (!game) return null;
  const step = game.steps[game.index];
  const showing = Boolean(step?.reveal) && now < step.revealUntil;
  return {
    id: game.id,
    title: game.title,
    index: game.index,
    total: game.steps.length,
    deadline: game.deadline,
    nextAt: game.nextAt,
    feedback: game.feedback,
    prompt: step?.prompt || "Equipment checks passed.",
    options: step?.options?.map((o) => ({ ...o })) || [],
    range: step?.range ? { ...step.range } : null,
    kind: step?.kind ?? null,
    zone: step?.zone ? { ...step.zone } : null,
    period: step?.period ?? null,
    length: step?.code?.length ?? step?.seq?.length ?? null,
    revealUntil: step?.revealUntil ?? null,
    // The secret is only in the view while it is on display.
    code: showing && step.code ? step.code : null,
    seq: showing && step.seq ? step.seq : null,
    complete: game.index >= game.steps.length,
  };
}
