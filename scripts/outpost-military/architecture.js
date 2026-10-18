/** Presentation-only roof coverage. Collision and mission layouts stay intact. */
const layouts = new WeakMap();
const key = (x, y) => `${x},${y}`;

export function roofLayout(map) {
  if (!map) return { cells: new Map() };
  if (layouts.has(map)) return layouts.get(map);
  const cells = new Map(), outdoors = new Set();
  const rooms = [...(map.rooms || []), ...(map.corridors || [])];
  for (const room of rooms)
    for (let y = room.y; y < room.y + room.h; y++)
      for (let x = room.x; x < room.x + room.w; x++) {
        if (room.roofed === false) outdoors.add(key(x, y));
        else cells.set(key(x, y), room);
      }
  for (const tile of outdoors) cells.delete(tile);
  // Door thresholds lie between room rectangles. Cover one adjacent walkable
  // cell, using the original seeds only: never spread a roof over a courtyard
  // or recursively down an outdoor approach. Retain the adjoining room's light
  // probe so stepping into its doorway doesn't become an outdoor exposure cut.
  for (const [tile, room] of [...cells]) {
    const [x, y] = tile.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = key(x + dx, y + dy);
      if (map.level?.[y + dy]?.[x + dx] === 0 && !outdoors.has(next) && !cells.has(next))
        cells.set(next, room);
    }
  }
  const layout = { cells };
  layouts.set(map, layout);
  return layout;
}

export function roofRoomAt(map, x, y) {
  return roofLayout(map).cells.get(key(Math.floor(x), Math.floor(y))) || null;
}
