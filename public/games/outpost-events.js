/** Mid-match events for the base phase: something urgent every minute and a
 * half or so, up to three per round. Positions are base floor tiles. */
export const EVENT_KINDS = Object.freeze({
  fire: { name: "Fire", hold: 4, duration: 45, verb: "Put out the fire" },
  casualty: { name: "New casualty", hold: 3, duration: 50, verb: "Stabilise the casualty" },
  drop: { name: "Supply delivery", hold: 3, duration: 50, verb: "Unpack the delivery" },
  sandstorm: { name: "Sandstorm", hold: 0, duration: 40, verb: "" },
});

export const EVENT_SPOTS = Object.freeze({
  fire: [
    { x: 6.5, y: 13.5, room: "Barracks / Mess Hall" },
    { x: 23.5, y: 13.5, room: "Vehicle Hangar" },
    { x: 6.5, y: 19.5, room: "Generators / Power" },
    { x: 14.5, y: 4.5, room: "Armory" },
  ],
  casualty: [{ x: 13.5, y: 26.5, room: "Perimeter / South Gate" }],
  drop: [{ x: 12.5, y: 15.5, room: "Covered Supply Atrium" }],
});

/** Pick the next event without repeating the last kind. */
export function nextEvent(random, lastKind) {
  const kinds = Object.keys(EVENT_KINDS).filter((k) => k !== lastKind);
  const kind = kinds[Math.min(kinds.length - 1, Math.floor(random() * kinds.length))];
  const spots = EVENT_SPOTS[kind] || [null];
  return { kind, spot: spots[Math.min(spots.length - 1, Math.floor(random() * spots.length))] };
}
