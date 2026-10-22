/**
 * Calder Quay as a Last Signal arena (grey box): a small harbour town
 * trimmed from the mini-city plan (docs/mini-city-plan.md,
 * scripts/outpost-city/layout.mjs) to 30 × 30 tiles for combat.
 *
 * - Market Square sits at the centre, so the Red Haze closes on it.
 * - The eight edge spawns (outpost-sim.js) land on open street: Ridge Lane
 *   (north), the Seawall Walk (east), Hospital Road and the courtyard
 *   (south) and Lantern Park (west).
 * - The canal crosses the south of town and bends one row in the middle;
 *   three bridges (Mill, Avenue, Dock) are the only ways across.
 * - Buildings are walk-in shells with doorways; stalls, trees, pumps and
 *   parked trucks are street cover.
 *
 * Tile types (1 tile = 3 m): 0 floor, 1 building wall, 2 stall / memorial,
 * 3 truck / container, 4 tree / planter, 5 pump / mast, 6 canal.
 * The canal cannot be blasted open (QUAY_UNBREAKABLE).
 */
export const QUAY_SIZE = 30;
export const QUAY_UNBREAKABLE = [6];

const LEGEND = { "#": 1, ".": 0, ":": 0, '"': 0, "=": 0, _: 0, S: 2, F: 2, V: 3, T: 4, P: 5, M: 5, "~": 6 };

function plan() {
  const n = QUAY_SIZE,
    g = Array.from({ length: n }, () => Array(n).fill("#"));
  const fill = (x, y, w, h, ch) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = ch;
  };
  const put = (cells, ch) => {
    for (const [x, y] of cells) g[y][x] = ch;
  };
  // A walk-in building: wall ring, interior floor ("_"), doorways.
  const building = (x, y, w, h, doors) => {
    fill(x, y, w, h, "#");
    fill(x + 1, y + 1, w - 2, h - 2, "_");
    put(doors, "_");
  };

  // ---- North: Ridge Lane, Old Town, fuel forecourt -----------------------
  fill(1, 1, 28, 2, "."); // Ridge Lane (spawns at its ends and middle)
  fill(9, 3, 1, 7, "."); // Mill Lane: one-tile alley
  fill(15, 3, 2, 8, "."); // Harbour Avenue, north half
  fill(17, 3, 5, 4, ":"); // fuel forecourt
  fill(28, 3, 1, 15, "."); // Seawall Walk (east edge)
  building(2, 3, 6, 5, [[4, 7], [7, 5]]); // Radio Station
  put([[4, 5]], "M"); // mast footing
  building(10, 3, 5, 5, [[12, 7], [14, 5], [10, 5]]); // Police Post
  building(22, 3, 6, 4, [[22, 5], [24, 6]]); // Fuel shop
  put([[18, 4], [20, 4]], "P"); // fuel pumps
  fill(1, 8, 8, 2, "."); // Tower Road (west)
  fill(10, 8, 5, 2, "."); // … past the police post
  fill(17, 7, 11, 2, "."); // Dock Road, offset one row from Tower Road
  put([[19, 7]], "T"); // street tree at the jog
  put([[17, 8]], "V"); // parked truck: Tower Road and Dock Road never form one line
  put([[7, 2], [21, 2]], "T"); // planters on Ridge Lane

  // ---- Middle: Lantern Park, Market Hall, Market Square, Substation -----
  fill(1, 10, 6, 7, '"'); // Lantern Park
  put([[2, 11], [5, 12], [3, 14], [5, 16]], "T"); // park trees (keep x 1 open for the west spawn)
  building(7, 10, 6, 6, [[9, 10], [12, 13], [7, 12], [10, 15]]); // Market Hall
  fill(13, 10, 8, 8, ":"); // Market Square (the haze closes here)
  put([[15, 11], [16, 11]], "F"); // clock memorial splits the avenue view
  put([[18, 12], [13, 16], [19, 16], [17, 14]], "S"); // market stalls
  building(21, 9, 6, 7, [[21, 12], [24, 9], [24, 15], [26, 13]]); // Substation
  fill(27, 9, 1, 9, "."); // service lane behind the substation
  fill(1, 17, 12, 1, "."); // Fish Alley into the square
  put([[10, 16]], "."); // … and up to the Market Hall's back door
  fill(21, 16, 7, 2, "."); // Canal Row

  // ---- The canal, quays and bridges --------------------------------------
  fill(1, 18, 28, 1, "."); // north quay
  fill(1, 19, 10, 2, "~"); // west reach
  fill(11, 19, 9, 1, "."); // wider quay where the canal bends south
  fill(11, 20, 9, 2, "~"); // middle reach, one row further south
  fill(20, 19, 9, 2, "~"); // east reach
  fill(1, 21, 10, 1, "."); // south quay (west)
  fill(20, 21, 9, 1, "."); // south quay (east)
  fill(1, 22, 28, 1, "."); // south quay, full width
  fill(4, 19, 2, 2, "="); // Mill footbridge
  fill(15, 20, 2, 2, "="); // Avenue Bridge
  fill(24, 19, 2, 2, "="); // Dock bridge
  put([[7, 21], [22, 21], [8, 18], [22, 18], [13, 22]], "T"); // quay planters break the long views
  put([[21, 17]], "S"); // net store at the end of Canal Row

  // ---- South: apartments, clinic, depot yard ----------------------------
  building(1, 23, 7, 4, [[4, 23], [7, 25], [3, 26]]); // Harbour Apartments
  fill(1, 27, 7, 2, '"'); // courtyard (south-west spawn)
  fill(8, 23, 1, 6, "."); // Laundry Alley
  building(9, 23, 9, 4, [[12, 23], [9, 25], [14, 26], [17, 24]]); // Clinic
  fill(9, 27, 11, 2, "."); // Hospital Road (south spawn)
  building(19, 23, 6, 4, [[21, 23], [19, 25], [22, 26]]); // Relief Depot
  fill(18, 23, 1, 4, "."); // Ambulance Lane between the clinic and the depot
  fill(25, 23, 4, 6, ":"); // depot yard
  fill(20, 27, 5, 2, ":");
  put([[27, 24], [27, 25], [21, 28]], "V"); // parked trucks and a container
  put([[12, 27]], "S"); // bus shelter on Hospital Road
  return g;
}

export const QUAY_PLAN = plan().map((row) => row.join(""));
export const QUAY_LEVEL = plan().map((row) => row.map((ch) => LEGEND[ch]));

/** Supply crates: one per district, a few on the routes between. */
export const QUAY_CRATES = [
  [3.5, 2.5],
  [11.5, 4.5],
  [19.5, 5.5],
  [25.5, 4.5],
  [5.5, 8.5],
  [24.5, 7.5],
  [3.5, 13.5],
  [9.5, 12.5],
  [14.5, 13.5],
  [18.5, 17.5],
  [23.5, 12.5],
  [6.5, 18.5],
  [26.5, 21.5],
  [3.5, 24.5],
  [12.5, 25.5],
  [21.5, 24.5],
  [17.5, 27.5],
];

/** Ground colours for the minimap and academy diagrams. */
export const QUAY_ZONES = [
  { x: 13, y: 10, w: 8, h: 8, color: "#6d6457" }, // Market Square paving
  { x: 1, y: 10, w: 6, h: 7, color: "#5f7a4a" }, // Lantern Park
  { x: 1, y: 27, w: 7, h: 2, color: "#5f7a4a" }, // courtyard
  { x: 25, y: 23, w: 4, h: 6, color: "#5d6266" }, // depot yard
];
