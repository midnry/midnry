/** Scanned CC0 props (Poly Haven) dress the base's solid furniture tiles:
 * storage, racks, the mess island and radar equipment. Every prop stays
 * inside its tile, which remains solid in the simulation; a tarp-covered
 * cargo core taller than a player fills the middle so the visible cover
 * matches the collision grid. Presentation only. */
import * as THREE from "three";

const SCALE = 3;

/** Which nodes of props-v1.glb make up each kit. */
// Tiny latches, pins and rings are left out: invisible at play distance,
// but thousands of triangles across a stocked room.
const KITS = {
  crate: /^old_military_crate(_lid)?_a$/,
  crateOpen: /^old_military_crate(_lid|_cloth)?_b$/,
  jerrycan: /^metal_jerrycan_green_(body|cap)$/,
  drum: /^barrel_03$/,
  barrel: /^Barrel_02$/,
  medkit: /^medical_box(_lid)?$/,
  plasticCrate: /^plastic_crate_02$/,
  shelf: /^steel_frame_shelves_01$/,
  ammo: /^ammo_box$/,
  cabinet: /^utility_box_01/,
};
/** The shelf was authored at ten times real size. */
const KIT_SCALE = { shelf: 0.1 };

/** Turn the loaded glTF into reusable kits: parts with their geometry,
 * material and a transform that puts the kit's footprint centre at the
 * origin, resting on the floor. */
export function preparePropKit(gltf) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const kits = {};
  for (const [name, pattern] of Object.entries(KITS)) {
    const parts = [];
    scene.traverse((o) => {
      if (o.isMesh && pattern.test(o.name)) parts.push(o);
    });
    if (!parts.length) continue;
    const scale = new THREE.Matrix4().makeScale(...Array(3).fill(KIT_SCALE[name] || 1));
    const box = new THREE.Box3();
    for (const part of parts) {
      part.geometry.computeBoundingBox();
      box.union(part.geometry.boundingBox.clone().applyMatrix4(scale.clone().multiply(part.matrixWorld)));
    }
    const centre = box.getCenter(new THREE.Vector3());
    const recentre = new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z);
    kits[name] = {
      size: box.getSize(new THREE.Vector3()),
      parts: parts.map((part) => {
        part.material.userData.world = true;
        // The crate's open sides are hard-edged holes: a cut-out draws the
        // same and, unlike blending, lets every crate share one draw.
        if (part.material.transparent && part.material.map) {
          part.material.transparent = false;
          part.material.alphaTest = 0.5;
          part.material.depthWrite = true;
        }
        return {
          geometry: part.geometry,
          material: part.material,
          matrix: recentre.clone().multiply(scale).multiply(part.matrixWorld),
        };
      }),
    };
  }
  return kits;
}

function seeded(x, y) {
  let s = (x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * Dress every furniture tile. `isFurniture(x, y)` decides which solid tiles
 * get props; neighbours that are walls or furniture extend the core to the
 * tile edge so no gap opens between joined pieces.
 */
export function buildFurniture(r, root, level, isFurniture) {
  const kits = r.propKit;
  if (!kits) return 0;
  const tarp = r.protocolMaterial({ color: "#4a4e3c", roughness: 0.96, metalness: 0 });
  const strap = r.protocolMaterial({ color: "#1f2220", roughness: 0.8, metalness: 0.1 });
  const pallet = r.protocolMaterial({ color: "#6a5840", roughness: 0.9, metalness: 0 });
  const unit = r.geo("furniture-unit-box", () => new THREE.BoxGeometry(1, 1, 1));
  const tmp = new THREE.Object3D();
  const place = (kitName, x, y, z, yaw = 0) => {
    const kit = kits[kitName];
    if (!kit) return;
    tmp.position.set(x, y, z);
    tmp.rotation.set(0, yaw, 0);
    tmp.scale.setScalar(1);
    tmp.updateMatrix();
    for (const part of kit.parts) {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(tmp.matrix).multiply(part.matrix);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
  };
  const block = (material, cx, y, cz, w, h, d) => {
    const mesh = new THREE.Mesh(unit, material);
    mesh.position.set(cx, y + h / 2, cz);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  let tiles = 0;
  for (let ty = 0; ty < level.length; ty++)
    for (let tx = 0; tx < level[ty].length; tx++) {
      if (!isFurniture(tx, ty)) continue;
      tiles++;
      const type = level[ty][tx],
        random = seeded(tx, ty),
        cx = (tx + 0.5) * SCALE,
        cz = (ty + 0.5) * SCALE;
      // Core: tarp-covered cargo on a pallet. Joined to solid neighbours.
      const open = (dx, dz) => level[ty + dz]?.[tx + dx] === 0;
      const reach = (dx, dz) => (open(dx, dz) ? 0.95 : 1.5);
      const x0 = cx - reach(-1, 0),
        x1 = cx + reach(1, 0),
        z0 = cz - reach(0, -1),
        z1 = cz + reach(0, 1);
      block(pallet, (x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 0.14, z1 - z0);
      block(tarp, (x0 + x1) / 2, 0.14, (z0 + z1) / 2, x1 - x0 - 0.04, 2.15, z1 - z0 - 0.04);
      for (const s of [-0.45, 0.45]) {
        block(strap, (x0 + x1) / 2 + s * (x1 - x0) * 0.6, 0.14, (z0 + z1) / 2, 0.06, 2.17, z1 - z0);
      }
      // Dress each open face from the walkway's side.
      for (const [dx, dz] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        if (!open(dx, dz)) continue;
        const yaw = Math.atan2(dx, dz),
          tx2 = -dz,
          tz2 = dx,
          depth = 1.22;
        const at = (s, d = depth) => [cx + dx * d + tx2 * s, cz + dz * d + tz2 * s];
        const slots = [-0.85, 0, 0.85];
        for (const s of slots) {
          const pick = random();
          const [px, pz] = at(s);
          const jitter = (random() - 0.5) * 0.25;
          if (type === 3) {
            // Racks: steel shelving stocked with medical and ammo boxes.
            if (s === 0) continue;
            const [sx, sz] = at(s * 1.05, 1.24);
            place("shelf", sx, 0, sz, yaw);
            const shelfYaw = yaw + Math.PI / 2;
            for (const [level2, kit] of [
              [0.12, "plasticCrate"],
              [0.6, "medkit"],
              [1.07, random() < 0.5 ? "ammo" : "medkit"],
              [1.55, "medkit"],
            ])
              place(kit, sx + tx2 * 0.18 * (random() - 0.5), level2, sz + tz2 * 0.18 * (random() - 0.5), kit === "ammo" ? shelfYaw : yaw);
          } else if (type === 5) {
            // Radar equipment: electrical cabinets, a jerrycan for the generator.
            place(pick < 0.75 ? "cabinet" : "jerrycan", px, 0, pz, yaw);
          } else if (type === 4) {
            // Mess island: water barrels and stacked plastic crates.
            if (pick < 0.4) place("barrel", px, 0, pz, yaw + jitter);
            else {
              const n = 2 + Math.floor(random() * 3);
              for (let i = 0; i < n; i++) place("plasticCrate", px, i * 0.24, pz, yaw + (random() - 0.5) * 0.15);
            }
          } else {
            // Storage: stacked military crates, fuel cans and drums.
            if (pick < 0.5) {
              const n = 2 + Math.floor(random() * 2);
              for (let i = 0; i < n; i++) place("crate", px, i * 0.27, pz, yaw + (random() - 0.5) * 0.1);
              if (random() < 0.6) place("medkit", px, n * 0.27, pz, yaw + jitter);
            } else if (pick < 0.75) {
              place("jerrycan", px - tx2 * 0.2, 0, pz - tz2 * 0.2, yaw + jitter);
              place("jerrycan", px + tx2 * 0.2, 0, pz + tz2 * 0.2, yaw - jitter);
            } else place(random() < 0.5 ? "drum" : "crateOpen", px, 0, pz, yaw + jitter);
          }
        }
      }
    }
  return tiles;
}
