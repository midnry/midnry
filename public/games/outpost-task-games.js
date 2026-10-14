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
    title = `Inspect ${stock?.name || "medical supplies"}`;
    steps = contents.map((label) =>
      choice(`Packing checklist: select ${label.toLowerCase()}.`, [
        label,
        "Damaged packaging",
        "Unlabelled loose item",
      ]),
    );
  } else if (context.kind === "flight-task" && context.target === "oxygen") {
    title = "Medical oxygen check";
    const target = 45 + Math.floor(random() * 4) * 5;
    steps = [
      choice("Check the supply connection before the gauge test.", [
        "Secure supply connection",
        "Disconnect supply",
        "Skip check",
      ]),
      {
        prompt: `Set the test gauge to ${target}% (±3%).`,
        range: { min: 0, max: 100, target, tolerance: 3 },
        answer: String(target),
      },
    ];
  } else if (context.kind === "flight-task" && context.target === "landing") {
    title = "Landing confirmation";
    const code = String(100 + Math.floor(random() * 900));
    steps = [
      choice(`Match the receiving station's beacon: ${code}.`, [
        code,
        String(Number(code) + 7),
        String(Number(code) + 13),
      ]),
      choice("Complete the landing handoff.", [
        "Confirm casualty station",
        "Return to base",
        "Cancel destination",
      ]),
    ];
  } else if (context.kind === "deliver") {
    title = "Casualty delivery";
    const patients = mission.patients
      .filter((p) => p.hp > 0 && !p.rescued)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    steps = patients
      .slice(0, 3)
      .map((patient, i) =>
        choice(`Delivery ${i + 1}: match the manifest to ${patient.name}.`, [
          patient.name,
          "Unassigned crate",
          "Return shipment",
        ]),
      );
    if (!steps.length)
      steps = [choice("Confirm the delivery manifest.", ["Confirm manifest", "Discard supplies"])];
  } else if (context.kind === "repair") {
    title = "System recovery";
    steps = [
      choice("Begin the maintenance sequence.", [
        "Isolate damaged circuit",
        "Energize damaged circuit",
        "Skip isolation",
      ]),
      choice("Restore the isolated connection.", [
        "Reseat protected connector",
        "Disconnect working link",
        "Bypass inspection",
      ]),
      choice("Finish the system test.", [
        "Run recovery check",
        "Leave circuit isolated",
        "Cancel repair",
      ]),
    ];
  } else {
    title = context.kind === "repair-cargo" ? "Cargo restraint repair" : "Secure trauma shipment";
    steps = [
      choice("Check the medical cargo restraints.", [
        "Latch the loose restraint",
        "Release all restraints",
        "Ignore loose pack",
      ]),
      choice("Finish the cargo inspection.", [
        "Verify seals and fastenings",
        "Remove inventory label",
        "Skip inspection",
      ]),
    ];
  }
  // Shuffle each labelled option; cues stay explicit and keyboard accessible.
  for (const step of steps)
    if (step.options) {
      for (let i = step.options.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [step.options[i], step.options[j]] = [step.options[j], step.options[i]];
      }
    }
  return { id, title, steps, index: 0, deadline: now + 36, nextAt: now + 0.35, feedback: "" };
}
export function taskStep(game, value, now) {
  if (!game || game.deadline < now || now < game.nextAt || game.index >= game.steps.length)
    return false;
  const step = game.steps[game.index];
  const valid = step.range
    ? /^\d{1,3}$/.test(value) && Math.abs(Number(value) - step.range.target) <= step.range.tolerance
    : value === step.answer;
  game.nextAt = now + 0.4;
  if (!valid) {
    game.feedback = "Check the instruction and try again.";
    return false;
  }
  game.index++;
  game.feedback =
    game.index === game.steps.length
      ? "Checks passed. Finishing the equipment cycle…"
      : "Check passed.";
  return true;
}
export function taskGameView(game) {
  if (!game) return null;
  const step = game.steps[game.index];
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
    complete: game.index >= game.steps.length,
  };
}
