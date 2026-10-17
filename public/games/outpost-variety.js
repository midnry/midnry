/** Match variety for Blackout Protocol: every round deals a different base.
 * Supply cabinets, live charge sockets and spawn points are reshuffled, and
 * each match draws one modifier and one mission twist. Everything is chosen
 * from the arena's own seeded random(), so authoritative restores replay it.
 */

/** One per match. Ids are stable: online rooms can lock one by id. */
export const MODIFIERS = Object.freeze([
  { id: "blackout", icon: "🔦", name: "Blackout start", text: "The base starts in darkness. Repair the generators, or wait 45 seconds for the backup." },
  { id: "radio-silence", icon: "📵", name: "Radio silence", text: "No emergency meetings for the first minute. Reported bodies still call one." },
  { id: "critical", icon: "🩸", name: "Critical patient", text: "One wounded soldier is fading twice as fast." },
  { id: "lone-wolf", icon: "🐺", name: "Lone wolf", text: "Only one infiltrator, but their eliminations recharge much faster." },
  { id: "short-supplies", icon: "📦", name: "Short supplies", text: "No spare stock: every medical item on the base is needed." },
  { id: "rush", icon: "⏱️", name: "Rush order", text: "Patients fade 25% faster, but the flight is shorter." },
  { id: "night-shift", icon: "🌙", name: "Night shift", text: "The rescue runs after dark. Lamps and signs light the base, and you see less far in the shadows." },
]);

/** How far a player can see: a blackout cuts it hard, night trims it. Shared by
 * the simulation (witnesses, bots) and the renderer (name tags). */
export function sightRange(protocol, time) {
  if (Number(protocol?.sabotage?.powerUntil) > time) return 2.6;
  return protocol?.match?.modifier === "night-shift" ? 5 : 7;
}

/** One per match, drawn separately from the modifier. */
export const TWISTS = Object.freeze([
  { id: "turbulence", icon: "🌪️", name: "Turbulence", text: "Halfway through the flight, a storm knocks out autopilot. Someone must take the helm." },
  { id: "priority", icon: "🧰", name: "Priority cargo", text: "Field medics need one extra item of a single kind." },
  { id: "headwind", icon: "🌬️", name: "Headwind", text: "A strong headwind makes the flight 25% longer." },
]);

export const modifierOf = (id) => MODIFIERS.find((m) => m.id === id) ?? null;
export const twistOf = (id) => TWISTS.find((t) => t.id === id) ?? null;

/** A valid modifier choice from a host or settings menu: an id or "random". */
export function modifierChoice(value) {
  return typeof value === "string" && modifierOf(value) ? value : "random";
}

const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

export function shuffled(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The match's modifier and twist. A locked modifier comes from the host. */
export function rollMatch(random, choice = "random") {
  const modifier = modifierOf(choice)?.id ?? pick(MODIFIERS, random).id;
  const twist = pick(TWISTS, random).id;
  return { modifier, twist };
}

/**
 * Fill the base's cabinets for this round. Each cabinet holds one kind of
 * item, at most two (the 3D cabinet shows two cases). `spare` extra items are
 * spread across random kinds so a wasted trip isn't always fatal.
 */
export function dealSupplies(random, cabinets, manifest, spare = 2) {
  const need = Object.fromEntries(manifest.map((item) => [item.id, item.required]));
  for (let i = 0; i < spare; i++) need[pick(manifest, random).id] += 1;
  // Chunks of two, splitting some into ones while cabinets allow it.
  const chunks = [];
  for (const [supplyId, count] of Object.entries(need)) {
    for (let left = count; left > 0; left -= 2) chunks.push({ supplyId, stock: Math.min(2, left) });
  }
  let free = cabinets.length - chunks.length;
  for (const chunk of shuffled(chunks, random)) {
    if (free <= 0) break;
    if (chunk.stock === 2 && random() < 0.45) {
      chunk.stock = 1;
      chunks.push({ supplyId: chunk.supplyId, stock: 1 });
      free--;
    }
  }
  if (chunks.length > cabinets.length) throw new Error("Not enough cabinets for the manifest.");
  const names = Object.fromEntries(manifest.map((item) => [item.id, item.name]));
  const order = shuffled(cabinets, random);
  return order.map((cabinet, i) => {
    const chunk = chunks[i];
    return {
      ...cabinet,
      supplyId: chunk?.supplyId ?? cabinet.supplyId,
      stock: chunk?.stock ?? 0,
      name: chunk ? `${names[chunk.supplyId]} · ${cabinet.name}` : cabinet.name,
    };
  });
}

/** One live charge socket per room, so infiltrators learn a new route each round. */
export function liveSites(random, sites) {
  const byRoom = new Map();
  for (const site of shuffled(sites, random)) if (!byRoom.has(site.room)) byRoom.set(site.room, site);
  return sites.filter((site) => byRoom.get(site.room) === site);
}
