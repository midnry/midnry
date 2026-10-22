/** Canal water and street lamps for arenas whose MAPS entry lists
 * `seeThrough` tile types (Calder Quay's canal). Those tiles block walking
 * but not sight or shots (outpost-sim.js `cast`), so they are drawn as open
 * water at ground level, never as wall blocks: a reflective surface with
 * slow ripples, low stone kerbs where quay meets water, plank decks and
 * railings on the bridges, and lamp posts on the kerbs and wall brackets
 * at the junctions. Everything is instanced or merged into a few meshes;
 * lamps are glowing fittings with painted light pools, not real lights. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { floodDistance, SURGE } from "../../public/games/outpost-hazards.js";

const SCALE = 3;
const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Ripple normal map: a few soft sine bands, tileable. */
function rippleTexture() {
  const size = 128,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2,
        v = (y / size) * Math.PI * 2;
      const nx = 0.5 * Math.cos(u * 3 + v) + 0.3 * Math.cos(u * 5 - v * 2),
        ny = 0.5 * Math.cos(v * 4 - u) + 0.3 * Math.cos(v * 2 + u * 3);
      const i = (y * size + x) * 4;
      data[i] = 128 + nx * 40;
      data[i + 1] = 128 + ny * 40;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Soft round light pool for the ground under a lamp. */
function poolTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d"),
    grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "#ffd9a0ff");
  grad.addColorStop(0.5, "#ffb86655");
  grad.addColorStop(1, "#ff9a4000");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class CanalWater {
  /** @param r the MilitaryRenderer; `types` the see-through tile types;
   * `lamps` wall brackets as [x, y, dx, dy] (wall tile, facing the street). */
  constructor(r, level, types, lamps = [], culverts = []) {
    this.r = r;
    this.group = new THREE.Group();
    this.group.name = "Canal water, bridges and street lamps";
    this.owned = [];
    const own = (x) => (this.owned.push(x), x);
    const water = (x, y) => types.includes(level[y]?.[x]);
    const floor = (x, y) => level[y]?.[x] === 0;
    const tiles = [];
    for (let y = 0; y < level.length; y++) for (let x = 0; x < level[y].length; x++) if (water(x, y)) tiles.push([x, y]);
    if (!tiles.length) return;

    // Water: one merged surface just above the arena floor.
    this.ripples = own(rippleTexture());
    this.ripples.repeat.set(level.length / 2, level.length / 2);
    this.waterMaterial = own(
      new THREE.MeshStandardMaterial({
        color: "#1d4a5a",
        roughness: 0.16,
        metalness: 0.05,
        normalMap: this.ripples,
        normalScale: new THREE.Vector2(0.12, 0.12),
        envMapIntensity: 0.9,
      }),
    );
    const quads = tiles.map(([x, y]) => {
      const q = new THREE.PlaneGeometry(SCALE, SCALE);
      q.rotateX(-Math.PI / 2);
      // World-space UVs so the ripples run continuously across tiles.
      const uv = q.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i)) / level.length, (y + 1 - uv.getY(i)) / level.length);
      q.translate((x + 0.5) * SCALE, 0.035, (y + 0.5) * SCALE);
      return q;
    });
    // Storm surge floodwater: one sheet per step out from the water (shown as
    // the flood rises); the same water surface, laid over the paving.
    this.floodRings = [];
    const reach = floodDistance(level, (t) => types.includes(t));
    for (let k = 1; k <= SURGE.reach; k++) {
      const ring = [];
      for (let y = 0; y < level.length; y++)
        for (let x = 0; x < level.length; x++)
          if (reach[y][x] === k) {
            const q = new THREE.PlaneGeometry(SCALE, SCALE).rotateX(-Math.PI / 2);
            const uv = q.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i)) / level.length, (y + 1 - uv.getY(i)) / level.length);
            ring.push(q.translate((x + 0.5) * SCALE, 0, (y + 0.5) * SCALE));
          }
      if (!ring.length) continue;
      const mesh = new THREE.Mesh(own(mergeGeometries(ring)), this.waterMaterial);
      for (const q of ring) q.dispose();
      mesh.visible = false;
      mesh.receiveShadow = true;
      mesh.name = `Floodwater ${k}`;
      this.floodRings.push({ k, mesh });
      this.group.add(mesh);
    }
    const surface = new THREE.Mesh(own(mergeGeometries(quads)), this.waterMaterial);
    surface.receiveShadow = true;
    surface.name = "Canal surface";
    this.group.add(surface);
    for (const q of quads) q.dispose();

    // Kerbs where floor meets water; bridges get plank decks and railings.
    const stone = own(new THREE.MeshStandardMaterial({ color: "#8d8577", roughness: 0.85 }));
    const plank = own(new THREE.MeshStandardMaterial({ color: "#7a5a3c", roughness: 0.8 }));
    const rail = own(new THREE.MeshStandardMaterial({ color: "#2f3436", roughness: 0.5, metalness: 0.7 }));
    const kerbs = [],
      decks = [],
      rails = [],
      lampSpots = [];
    const bridge = (x, y) => floor(x, y) && SIDES.some(([dx, dy]) => water(x + dx, y + dy) && water(x - dx, y - dy));
    for (let y = 0; y < level.length; y++)
      for (let x = 0; x < level[y].length; x++) {
        if (!floor(x, y)) continue;
        const onBridge = bridge(x, y);
        if (onBridge) decks.push([x, y]);
        for (const [dx, dy] of SIDES) {
          if (!water(x + dx, y + dy)) continue;
          // The edge between this floor tile and the water, on the water side.
          const cx = (x + 0.5 + dx * 0.5) * SCALE,
            cz = (y + 0.5 + dy * 0.5) * SCALE,
            along = dx ? [0.3, 0.32, SCALE] : [SCALE, 0.32, 0.3];
          kerbs.push({ p: [cx + dx * 0.15, 0.16, cz + dy * 0.15], s: along });
          if (onBridge) {
            rails.push({ p: [cx + dx * 0.1, 1.0, cz + dy * 0.1], s: dx ? [0.06, 0.06, SCALE] : [SCALE, 0.06, 0.06] });
            for (const o of [-1.4, 0, 1.4])
              rails.push({ p: [cx + dx * 0.1 + (dy ? o : 0), 0.58, cz + dy * 0.1 + (dx ? o : 0)], s: [0.07, 0.84, 0.07] });
          } else if ((x * 7 + y * 3) % 5 === 0) lampSpots.push({ x: cx + dx * 0.2, z: cz + dy * 0.2 });
        }
      }
    // A lamp at each end of every bridge.
    for (const [x, y] of decks)
      for (const [dx, dy] of SIDES) {
        // (dx, dy) leads off the bridge onto the quay: light that end on
        // each side that has water.
        if (!floor(x + dx, y + dy) || bridge(x + dx, y + dy)) continue;
        for (const [px, py] of [[dy, dx], [-dy, -dx]])
          if (water(x + px, y + py))
            lampSpots.push({ x: (x + 0.5 + dx * 0.4 + px * 0.47) * SCALE, z: (y + 0.5 + dy * 0.4 + py * 0.47) * SCALE, bridge: true });
      }
    const instanced = (items, material, name) => {
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(r.geo("canal-box", () => new THREE.BoxGeometry(1, 1, 1)), material, items.length),
        dummy = new THREE.Object3D();
      items.forEach(({ p, s }, i) => {
        dummy.position.set(...p);
        dummy.scale.set(...s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.name = name;
      this.group.add(mesh);
    };
    instanced(kerbs, stone, "Quay kerbs");
    // Culvert mouths: a dark arch with a steel frame in the quay wall beside
    // each mouth (swim there and dive to come up in the linked water).
    const arches = [],
      frames = [],
      walls = [];
    for (const [ax, ay, bx, by] of culverts)
      for (const [x, y] of [
        [ax, ay],
        [bx, by],
      ]) {
        const side = SIDES.find(([dx, dy]) => floor(x + dx, y + dy)) || [0, -1];
        // On the quay edge: a stone headwall, its dark opening facing the water.
        const ex = (x + 0.5 + side[0] * 0.5) * SCALE,
          ez = (y + 0.5 + side[1] * 0.5) * SCALE,
          along = (w, h, d) => (side[0] ? [d, h, w] : [w, h, d]);
        walls.push({ p: [ex + side[0] * 0.25, 0.45, ez + side[1] * 0.25], s: along(2.2, 0.9, 0.5) });
        arches.push({ p: [ex - side[0] * 0.02, 0.28, ez - side[1] * 0.02], s: along(1.3, 0.5, 0.06) });
        frames.push({ p: [ex - side[0] * 0.04, 0.56, ez - side[1] * 0.04], s: along(1.45, 0.07, 0.08) });
      }
    instanced(walls, stone, "Culvert headwalls");
    instanced(arches, own(new THREE.MeshBasicMaterial({ color: "#05080a" })), "Culvert mouths");
    instanced(frames, rail, "Culvert frames");
    instanced(
      decks.map(([x, y]) => ({ p: [(x + 0.5) * SCALE, 0.05, (y + 0.5) * SCALE], s: [SCALE, 0.06, SCALE] })),
      plank,
      "Bridge decks",
    );
    instanced(rails, rail, "Bridge railings");

    // Street lamps: posts on the kerbs and bridge ends, brackets on walls.
    this.lampMaterial = own(new THREE.MeshBasicMaterial({ color: "#ffd59a", toneMapped: false }));
    const posts = [],
      heads = [],
      pools = [];
    const spots = lampSpots.filter((s, i) => s.bridge || i % 2 === 0);
    for (const { x, z } of spots) {
      posts.push({ p: [x, 2.1, z], s: [0.12, 4.2, 0.12] });
      heads.push({ p: [x, 4.12, z], s: [0.3, 0.14, 0.3] });
      pools.push([x, z]);
    }
    for (const [tx, ty, dx, dy] of lamps) {
      const x = (tx + 0.5 + dx * 0.5) * SCALE + dx * 0.35,
        z = (ty + 0.5 + dy * 0.5) * SCALE + dy * 0.35;
      posts.push({ p: [x - dx * 0.2, 3.1, z - dy * 0.2], s: dx ? [0.5, 0.08, 0.08] : [0.08, 0.08, 0.5] });
      heads.push({ p: [x, 2.95, z], s: [0.36, 0.16, 0.36] });
      pools.push([x + dx * 0.6, z + dy * 0.6]);
    }
    instanced(posts, rail, "Lamp posts");
    instanced(heads, this.lampMaterial, "Lamp heads");
    this.lampCount = heads.length;
    if (pools.length) {
      const poolMat = own(
        new THREE.MeshBasicMaterial({ map: own(poolTexture()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.25 }),
      );
      this.poolMaterial = poolMat;
      const geo = own(new THREE.PlaneGeometry(4.5, 4.5).rotateX(-Math.PI / 2));
      const mesh = new THREE.InstancedMesh(geo, poolMat, pools.length),
        dummy = new THREE.Object3D();
      pools.forEach(([x, z], i) => {
        dummy.position.set(x, 0.06, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.name = "Lamp light pools";
      mesh.renderOrder = 2;
      this.group.add(mesh);
    }
    this.tiles = tiles.length;
  }
  /** Slow ripples; lamps brighten as the light falls. */
  update(t, still, night = 0, live = false, flood = 0, powerOut = false) {
    if (this.lampMaterial) this.lampMaterial.color.set(powerOut ? "#2a2620" : "#ffd59a");
    // Floodwater spreads out a step at a time and rises a little as it comes.
    for (const { k, mesh } of this.floodRings || []) {
      const depth = Math.max(0, Math.min(1, flood - k + 1));
      mesh.visible = depth > 0.05;
      mesh.position.y = 0.02 + 0.12 * depth;
    }
    if (this.ripples && !still) this.ripples.offset.set((t * 0.012) % 1, (t * 0.007) % 1);
    // Electrified water flickers blue-white.
    if (this.waterMaterial) {
      const flash = live ? (still ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * 37) * Math.sin(t * 11))) : 0;
      this.waterMaterial.emissive.setRGB(0.35 * flash, 0.75 * flash, 1.0 * flash);
      this.waterMaterial.emissiveIntensity = live ? 1.4 : 0;
    }
    if (this.poolMaterial) this.poolMaterial.opacity = powerOut ? 0 : 0.18 + 0.6 * night;
  }
  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => o.isInstancedMesh && o.dispose());
    for (const x of this.owned) x.dispose?.();
  }
}
