/** Corridor-only technical-art benchmark. Authored architectural primitives,
 * not production asset models. Collision and task coordinates remain untouched. */
import * as THREE from "three";
import { surfaceMaterial } from "./realism-surfaces.js";
import { batchStaticByMaterial } from "./static-batches.js";
export const BENCHMARK = { x0: 9, x1: 11, y0: 14, y1: 24, station: "coolant-test" };
export const benchmarkFace = (f) =>
  (f.x + f.dx >= 9 && f.x + f.dx < 11 && f.y + f.dz >= 14 && f.y + f.dz < 24) ||
  (f.x === 8 && f.y === 23 && f.dx === -1);

function atlas(r) {
  if (r.benchmarkAtlas) return r.benchmarkAtlas;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d"),
    labels = [
      "RATIONS  /  COLD STORAGE",
      "COLD STORAGE  →",
      "←  RATIONS     •     MEDICAL",
      "SERVICE ACCESS  •  C-07",
      "KEEP CLEAR   /   POWER",
      "AUTHORIZED PERSONNEL",
      "MAINTENANCE  →",
      "MEDICAL SUPPLY ROUTE",
    ];
  c.clearRect(0, 0, 1024, 512);
  labels.forEach((label, i) => {
    const y = i * 64;
    c.fillStyle = "#18262c";
    c.fillRect(0, y, 1024, 64);
    c.fillStyle = i === 4 ? "#d1b46b" : "#9dc9cb";
    c.fillRect(0, y, 8, 64);
    c.fillStyle = "#e7e5d9";
    c.font = "600 32px Arial";
    c.textBaseline = "middle";
    c.fillText(label, 29, y + 32);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, r.renderer.capabilities.getMaxAnisotropy());
  texture.userData.source = "Original benchmark signage atlas (authored canvas, not a photograph)";
  r.textures.add(texture);
  r.benchmarkAtlas = texture;
  return texture;
}
function labelGeometry(r, row) {
  return r.geo("benchmark:label:" + row, () => {
    const geo = new THREE.PlaneGeometry(1, 1),
      uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, (7 - row + uv.getY(i)) / 8);
    return geo;
  });
}

/** The caller's instanced batches also contain the original walls and trims;
 * reusing their geometries/materials adds instances, not per-fitting draws. */
export function decorateBenchmark(r, id, ctx) {
  if (id !== "breakwater") return null;
  const { add, box, plane, own, steel, darkSteel, seal, floorMark, extraFixtures, lightMaterials } =
    ctx;
  const concrete = own(
    surfaceMaterial(r, "concrete", {
      color: "#c0c3bf",
      repeat: [1.5, 1.5],
      roughness: 0.9,
      normalStrength: 0.24,
    }),
  );
  const signage = own(
    r.material({ map: atlas(r), color: "#ffffff", roughness: 0.88, metalness: 0 }),
  );
  const caution = own(r.material({ color: "#b4a367", roughness: 0.94, metalness: 0 }));
  const warm = own(
    r.material({ color: "#e9d6ad", emissive: "#ffcb89", emissiveIntensity: 0.85, roughness: 0.8 }),
  );
  lightMaterials.push(warm);
  r.protocolLightMaterials.push(warm);
  const horizontal = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2,
  );
  const tube = r.geo(
    "realism-environment:utility-pipe",
    () => new THREE.CylinderGeometry(1, 1, 1, 12),
  );
  const alongZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const records = [];
  const signs = new THREE.Group();
  signs.name = "Benchmark signs / shared atlas";
  const put = (geo, mat, p, s, q, shadow = false, kind = "ceiling") => {
    if (mat === signage) {
      const sign = new THREE.Mesh(geo, mat);
      sign.position.set(...p);
      sign.scale.set(...s);
      if (q) sign.quaternion.copy(q);
      sign.receiveShadow = true;
      signs.add(sign);
    } else add(geo, mat, p, s, q, shadow);
    // Retain measured authoring bounds for the corridor clearance check. These
    // are presentation diagnostics, never collision bodies or per-frame work.
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bounds = geo.boundingBox
      .clone()
      .applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(...p),
          q || new THREE.Quaternion(),
          new THREE.Vector3(...s),
        ),
      );
    records.push({ kind, p, s, min: bounds.min.toArray(), max: bounds.max.toArray() });
  };
  for (let y = 14; y < 24; y++)
    for (let x = 9; x < 11; x++)
      if (r.g.level[y][x] === 0) {
        put(
          plane,
          concrete,
          [(x + 0.5) * 3, 0.034, (y + 0.5) * 3],
          [3, 3, 1],
          horizontal,
          false,
          "floor",
        );
        // Flush, purposeful edge markings follow the clear route, never a barrier.
        if (x === 9 && y % 2 === 0)
          put(
            plane,
            floorMark,
            [27.36, 0.038, (y + 0.5) * 3],
            [0.055, 1.35, 1],
            horizontal,
            false,
            "floor",
          );
        if (y === 21)
          put(
            plane,
            caution,
            [(x + 0.5) * 3, 0.039, 63.3],
            [2.8, 0.08, 1],
            horizontal,
            false,
            "floor",
          );
      }
  put(labelGeometry(r, 4), signage, [28.5, 0.04, 64.05], [2, 0.29, 1], horizontal, false, "floor");
  // All runs clear the 1.82m soldier; their lowest surface is above 2.9m.
  for (const [x, radius] of [
    [27.62, 0.12],
    [28.03, 0.047],
    [31.25, 0.065],
  ]) {
    put(tube, steel, [x, 3.16, 57], [radius, 29.8, radius], alongZ, true);
    for (let z = 43.2; z < 72; z += 3)
      put(box, darkSteel, [x, 3.16, z], [radius * 2.3, radius * 2.3, 0.055], null, false);
  }
  // Galvanised ventilation duct and a real open cable tray with cross-rungs.
  put(box, darkSteel, [32.43, 3.19, 57], [0.5, 0.28, 29.8]);
  for (const x of [29.02, 29.6]) put(box, steel, [x, 3.11, 57], [0.035, 0.095, 29.8]);
  for (let z = 42.3; z < 72; z += 0.6) put(box, darkSteel, [29.31, 3.075, z], [0.61, 0.025, 0.035]);
  for (let z = 43.5; z < 72; z += 3) {
    put(box, steel, [30, 3.4, z], [5.9, 0.055, 0.08], null, true);
    for (const x of [29.09, 29.25, 29.43])
      put(tube, seal, [x, 3.12, z - 1.5], [0.013, 2.97, 0.013], alongZ);
  }
  // Wall practicals share the existing four/two-light pool; no new light types
  // or shadow cameras. Keep them in the same corridor as the receiving camera.
  for (const y of [16.5, 20.5, 23.1]) {
    const z = y * 3;
    put(box, darkSteel, [27.035, 2.78, z], [0.06, 0.22, 0.76], null, false, "wall");
    put(box, warm, [27.074, 2.76, z], [0.016, 0.11, 0.6], null, false, "wall");
    const fixture = { x: 27.22, y: 2.77, z, color: "#ffd2a0", intensity: 19, distance: 10 };
    extraFixtures.push(fixture);
    r.protocolFixtures.push(fixture);
  }
  function face(f) {
    // Every attachment is at the surface of an existing solid wall tile.
    const loc = (u, v, d) => {
      const p = new THREE.Vector3(u, v, d).applyQuaternion(f.quaternion);
      return [p.x + f.position[0], p.y, p.z + f.position[2]];
    };
    put(plane, concrete, loc(0, 1.76, 0.016), [3, 3.48, 1], f.quaternion, false, "wall");
    for (const u of [-1.43, 1.43])
      put(box, steel, loc(u, 1.75, 0.025), [0.065, 3.47, 0.035], f.quaternion, true, "wall");
    put(box, darkSteel, loc(0, 0.16, 0.025), [2.85, 0.25, 0.035], f.quaternion, false, "wall");
    put(box, steel, loc(0, 3.24, 0.024), [2.9, 0.065, 0.035], f.quaternion, false, "wall");
    // Recessed service panel lies entirely against solid cover, not in an exit.
    if (f.y === 19 && f.dx === 1) {
      put(box, darkSteel, loc(0, 1.48, 0.025), [1.35, 1.68, 0.045], f.quaternion, false, "wall");
      put(box, steel, loc(0, 1.48, 0.054), [1.22, 1.54, 0.016], f.quaternion, false, "wall");
      for (let i = 0; i < 7; i++)
        put(
          box,
          seal,
          loc(0, 1.16 + i * 0.07, 0.065),
          [0.92, 0.026, 0.008],
          f.quaternion,
          false,
          "wall",
        );
      put(
        labelGeometry(r, 3),
        signage,
        loc(0, 2.48, 0.057),
        [1.6, 0.1, 1],
        f.quaternion,
        false,
        "wall",
      );
    }
    if (f.x === 9 && f.y === 20) {
      put(box, steel, loc(0, 1.65, 0.035), [1.65, 2.65, 0.045], f.quaternion, false, "wall");
      for (let i = 0; i < 12; i++)
        put(
          box,
          seal,
          loc(0, 0.65 + i * 0.12, 0.064),
          [1.3, 0.04, 0.015],
          f.quaternion,
          false,
          "wall",
        );
      put(
        labelGeometry(r, 1),
        signage,
        loc(0, 3.02, 0.07),
        [2.5, 0.29, 1],
        f.quaternion,
        false,
        "wall",
      );
    } else if ([16, 20, 23].includes(f.y) && !(f.x === 8 && f.y === 23 && f.dx === -1))
      put(
        labelGeometry(r, f.y === 16 ? 2 : f.y === 20 ? 1 : 6),
        signage,
        loc(0, 2.55, 0.05),
        [2.5, 0.29, 1],
        f.quaternion,
        false,
        "wall",
      );
  }
  r.benchmarkCorridor = {
    tiles: BENCHMARK,
    records,
    photographs: "Existing Poly Haven CC0 concrete and metal; authored architectural fittings",
    drawPolicy: "instanced existing material batches",
  };
  return {
    materials: {warm},
    handles: benchmarkFace,
    face,
    finish(group) {
      // Different atlas rows have different UVs: merge those static quads once,
      // rather than paying one instanced draw for each label's row geometry.
      batchStaticByMaterial(signs, 32);
      group.add(signs);
    },
  };
}
