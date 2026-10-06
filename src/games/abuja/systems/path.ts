// Route finding for tap-to-walk and "Go to": A* over a coarse grid, then
// straightened so the walk looks natural instead of zig-zagging cell to cell.

export type Point = { x: number; y: number };

const SQRT2 = Math.SQRT2;

class Heap {
  private items: { id: number; f: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(id: number, f: number) {
    const a = this.items;
    a.push({ id, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.f <= a[i]!.f) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0]!.id;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]!.f < a[m]!.f) m = l;
        if (r < a.length && a[r]!.f < a[m]!.f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

/** Is the straight walk from a to b clear? */
export function lineClear(a: Point, b: Point, isFree: (x: number, y: number) => boolean, step = 8): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.ceil(dist / step);
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    if (!isFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/**
 * Waypoints from `from` to `to` (excluding the start), or null when there is
 * no way there. If `to` is inside a wall, the route ends at the nearest open
 * spot instead.
 */
export function findPath(from: Point, to: Point, width: number, height: number, isFree: (x: number, y: number) => boolean, cell = 20): Point[] | null {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const known = new Int8Array(cols * rows); // 0 unknown, 1 free, 2 blocked
  const center = (id: number): Point => ({ x: ((id % cols) + 0.5) * cell, y: (Math.floor(id / cols) + 0.5) * cell });
  const free = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
    const id = r * cols + c;
    if (!known[id]) {
      const p = center(id);
      known[id] = isFree(p.x, p.y) ? 1 : 2;
    }
    return known[id] === 1;
  };
  const cellOf = (p: Point) => ({ c: Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell))), r: Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell))) });

  const start = cellOf(from);
  let goal = cellOf(to);
  let goalExact = isFree(to.x, to.y);
  if (!free(goal.c, goal.r)) {
    // Nearest open cell to the goal, searching outward ring by ring.
    let found: { c: number; r: number } | null = null;
    for (let ring = 1; ring <= 10 && !found; ring += 1) {
      let best = Infinity;
      for (let dc = -ring; dc <= ring; dc += 1) {
        for (let dr = -ring; dr <= ring; dr += 1) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
          const c = goal.c + dc;
          const r = goal.r + dr;
          const d = Math.hypot(dc, dr);
          if (d < best && free(c, r)) {
            best = d;
            found = { c, r };
          }
        }
      }
    }
    if (!found) return null;
    goal = found;
    goalExact = false;
  }
  const startId = start.r * cols + start.c;
  const goalId = goal.r * cols + goal.c;
  const finish = goalExact ? to : center(goalId);
  if (lineClear(from, finish, isFree)) return [finish];

  const g = new Float32Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const h = (id: number) => {
    const dc = Math.abs((id % cols) - goal.c);
    const dr = Math.abs(Math.floor(id / cols) - goal.r);
    return Math.max(dc, dr) + (SQRT2 - 1) * Math.min(dc, dr);
  };
  const open = new Heap();
  g[startId] = 0;
  open.push(startId, h(startId));
  let reached = false;
  while (open.size) {
    const id = open.pop();
    if (closed[id]) continue;
    closed[id] = 1;
    if (id === goalId) {
      reached = true;
      break;
    }
    const c = id % cols;
    const r = Math.floor(id / cols);
    for (let dc = -1; dc <= 1; dc += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        if (!dc && !dr) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (!free(nc, nr)) continue;
        // No cutting corners past a wall.
        if (dc && dr && (!free(c + dc, r) || !free(c, r + dr))) continue;
        const nid = nr * cols + nc;
        const cost = g[id]! + (dc && dr ? SQRT2 : 1);
        if (cost < g[nid]!) {
          g[nid] = cost;
          came[nid] = id;
          open.push(nid, cost + h(nid));
        }
      }
    }
  }
  if (!reached) return null;

  const cells: Point[] = [];
  for (let id = goalId; id !== -1 && id !== startId; id = came[id]!) cells.unshift(center(id));
  if (cells.length) cells[cells.length - 1] = finish;
  else cells.push(finish);
  // Straighten: from each point, jump to the farthest waypoint in plain sight.
  const out: Point[] = [];
  let at = from;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !lineClear(at, cells[j]!, isFree)) j -= 1;
    out.push(cells[j]!);
    at = cells[j]!;
    i = j + 1;
  }
  return out;
}
