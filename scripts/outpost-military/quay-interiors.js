/** Calder Quay interiors, dressed with Breakwater's scanned prop kit
 * (props-v1.glb: steel shelves, medical boxes, military crates, jerrycans,
 * drums, utility cabinets) and its wayfinding typography. Each building
 * gets its own floor, furniture against its inside walls, ceiling light
 * strips under the roof and a sign by its main door.
 *
 * Presentation only: props hug walls (no deeper than ~0.6 m), never stand
 * in a doorway or in front of one, and the collision grid is unchanged, so
 * a room's furniture never reads as cover the rules do not have. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { displayFont, fitDisplay } from "./world-text.js";

const SCALE = 3;
const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
/** Per building: floor colour, wall furniture (prop kits, cycled), sign. */
export const ROOMS = {
  radio: { floor: "#5a5f63", kits: ["cabinet", "shelf", "cabinet", "ammo"], sign: ["CALDER RADIO", "TRANSMITTER HALL"], accent: "#c43d2c" },
  police: { floor: "#3d4a57", kits: ["shelf", "crate", "cabinet", "shelf"], sign: ["POLICE POST", "EVIDENCE / CELLS"], accent: "#2f7cff" },
  fuel: { floor: "#6d6a63", kits: ["shelf", "jerrycan", "plasticCrate", "jerrycan"], sign: ["CALDER FUEL", "SHOP / SPARES"], accent: "#c43d2c" },
  market: { floor: "#7a6550", kits: ["plasticCrate", "crateOpen", "barrel", "plasticCrate"], sign: ["MARKET HALL", "FISH / PRODUCE"], accent: "#e8b23a" },
  substation: { floor: "#4f5559", kits: ["cabinet", "drum", "cabinet", "cabinet"], sign: ["DANGER", "HIGH VOLTAGE"], accent: "#e8b23a" },
  apartments: { floor: "#6b5a4c", kits: ["plasticCrate", "barrel", "crate"], sign: ["HARBOUR APARTMENTS", "LOBBY / STAIRS"], accent: "#8fb7a7" },
  clinic: { floor: "#d6dad4", kits: ["shelf", "medkit", "cabinet", "medkit"], sign: ["TOWN CLINIC", "TRIAGE / PHARMACY"], accent: "#d22b2b" },
  depot: { floor: "#5e5d58", kits: ["crate", "drum", "crateOpen", "jerrycan", "crate"], sign: ["RELIEF DEPOT", "SUPPLY / LOADING"], accent: "#e8b23a" },
};
const MAX_DEPTH = 0.6;

function seeded(x, y) {
  let s = (x * 73856093) ^ (y * 19349663);
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/** Wall slots inside a building: an interior tile beside one of the
 * building's own walls, not a doorway and not facing one. */
export function wallSlots(level, b) {
  const inside = (x, y) => x > b.x && x < b.x + b.w - 1 && y > b.y && y < b.y + b.h - 1;
  const ring = (x, y) => (x === b.x || x === b.x + b.w - 1 || y === b.y || y === b.y + b.h - 1) && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  const door = (x, y) => ring(x, y) && level[y]?.[x] === 0;
  const slots = [];
  for (let y = b.y + 1; y < b.y + b.h - 1; y++)
    for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
      if (level[y][x] !== 0) continue;
      // Keep tiles inside a doorway's line clear (walk in, walk out).
      if (SIDES.some(([dx, dy]) => door(x + dx, y + dy))) continue;
      for (const [dx, dy] of SIDES)
        if (ring(x + dx, y + dy) && level[y + dy][x + dx] !== 0 && inside(x, y)) slots.push({ x, y, dx, dy });
    }
  return slots;
}

export class QuayInteriors {
  constructor(r, level, buildings) {
    this.group = new THREE.Group();
    this.group.name = "Calder Quay interiors";
    this.owned = [];
    const own = (x) => (this.owned.push(x), x);
    const kit = r.propKit || {};
    const placements = new Map(); // kit name → matrices
    const floors = [],
      lights = [],
      signs = [];
    for (const b of buildings) {
      const room = ROOMS[b.id];
      if (!room) continue;
      // Floor: the interior rectangle, a shade apart from the street paving.
      floors.push({ b, color: room.floor });
      // Ceiling light strips along the room, under the roof line.
      const cx = (b.x + b.w / 2) * SCALE,
        cz = (b.y + b.h / 2) * SCALE,
        long = b.w >= b.h;
      for (const o of [-0.25, 0.25])
        lights.push({ p: [cx + (long ? 0 : o * (b.w - 2) * SCALE), 2.86, cz + (long ? o * (b.h - 2) * SCALE : 0)], s: long ? [(b.w - 2.4) * SCALE * 0.8, 0.05, 0.22] : [0.22, 0.05, (b.h - 2.4) * SCALE * 0.8] });
      // Furniture: every other wall slot, kits cycled per building.
      const slots = wallSlots(level, b);
      slots.forEach((slot, i) => {
        if (i % 2) return;
        const name = room.kits[(i / 2) % room.kits.length];
        const piece = kit[name];
        if (!piece) return;
        const random = seeded(slot.x * 3 + slot.dx, slot.y * 3 + slot.dy);
        // Scale down anything deeper than the limit; turn it to face the room.
        const depth = Math.min(piece.size.x, piece.size.z),
          fit = Math.min(1, MAX_DEPTH / Math.max(0.05, depth)),
          face = Math.atan2(-slot.dx, -slot.dy),
          turn = piece.size.x < piece.size.z ? face + Math.PI / 2 : face;
        const along = (random() - 0.5) * 0.9;
        const px = (slot.x + 0.5 + slot.dx * 0.5) * SCALE - slot.dx * (depth * fit) / 2 - slot.dx * 0.04 + (slot.dy ? along : 0),
          pz = (slot.y + 0.5 + slot.dy * 0.5) * SCALE - slot.dy * (depth * fit) / 2 - slot.dy * 0.04 + (slot.dx ? along : 0);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(px, 0, pz),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn),
          new THREE.Vector3(fit, fit, fit),
        );
        if (!placements.has(name)) placements.set(name, []);
        placements.get(name).push(m);
      });
      // Sign: on the inside face of the wall opposite the main door.
      signs.push({ b, room, slot: slots[0] });
    }
    // Props: one instanced mesh per kit part.
    for (const [name, matrices] of placements)
      for (const part of kit[name].parts) {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, matrices.length);
        matrices.forEach((m, i) => mesh.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, part.matrix)));
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.name = `Interior ${name}`;
        this.group.add(mesh);
      }
    this.propCount = [...placements.values()].reduce((n, m) => n + m.length, 0);
    // Floors: one mesh per colour.
    const byColor = new Map();
    for (const { b, color } of floors) {
      if (!byColor.has(color)) byColor.set(color, []);
      const q = new THREE.PlaneGeometry((b.w - 2) * SCALE, (b.h - 2) * SCALE).rotateX(-Math.PI / 2);
      byColor.get(color).push(q.translate((b.x + b.w / 2) * SCALE, 0.012, (b.y + b.h / 2) * SCALE));
    }
    for (const [color, geos] of byColor) {
      const merged = own(mergeAll(geos));
      const mesh = new THREE.Mesh(merged, own(new THREE.MeshStandardMaterial({ color, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -1 })));
      mesh.receiveShadow = true;
      mesh.name = "Interior floor";
      this.group.add(mesh);
    }
    // Light strips (glowing fittings, not real lights).
    const strip = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshBasicMaterial({ color: "#fff3dc", toneMapped: false })), lights.length);
    const dummy = new THREE.Object3D();
    lights.forEach(({ p, s }, i) => {
      dummy.position.set(...p);
      dummy.scale.set(...s);
      dummy.updateMatrix();
      strip.setMatrixAt(i, dummy.matrix);
    });
    strip.name = "Interior light strips";
    this.group.add(strip);
    // Signs: one canvas atlas, a row per building.
    const rows = signs.filter((s) => s.slot);
    if (rows.length) {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 128 * rows.length;
      const c = canvas.getContext("2d");
      rows.forEach(({ room }, i) => {
        const y = i * 128;
        c.fillStyle = "#1e2729";
        c.fillRect(0, y, 1024, 128);
        c.fillStyle = room.accent;
        c.fillRect(0, y, 16, 128);
        c.fillStyle = "#eef0ea";
        fitDisplay(r, c, room.sign[0], 64, 960);
        c.fillText(room.sign[0], 40, y + 66);
        c.fillStyle = "#9fb3ad";
        c.font = displayFont(r, 36, 600);
        c.fillText(room.sign[1], 40, y + 110);
      });
      const tex = own(new THREE.CanvasTexture(canvas));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const geos = rows.map(({ slot }, i) => {
        const g = new THREE.PlaneGeometry(2.2, 0.28);
        const uv = g.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (i + 1 - uv.getY(k)) / rows.length);
        g.rotateY(Math.atan2(-slot.dx, -slot.dy));
        return g.translate((slot.x + 0.5 + slot.dx * 0.49) * SCALE, 2.45, (slot.y + 0.5 + slot.dy * 0.49) * SCALE);
      });
      const mesh = new THREE.Mesh(own(mergeAll(geos)), own(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
      mesh.name = "Interior signs";
      this.group.add(mesh);
    }
  }
  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => o.isInstancedMesh && o.dispose());
    for (const x of this.owned) x.dispose?.();
  }
}

/** Merge and free the source geometries. */
function mergeAll(geos) {
  const merged = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  return merged;
}
