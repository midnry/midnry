/** One room only: Breakwater's Medical / Supply Depot (map id "ammo").
 * Original authored architectural fittings, not production models. The map's
 * single solid rack tile is still opaque cover; all other additions hug walls,
 * sit flush on the floor, or clear 2.9 m above the unchanged walking grid. */
import * as THREE from "three";
import { surfaceMaterial } from "./realism-surfaces.js";
import { batchStaticByMaterial } from "./static-batches.js";

export const medicalDepotStorage = (x, y) => x === 22 && y === 24;

function signage(r) {
  if (r.medicalDepotAtlas) return r.medicalDepotAtlas;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  for (const [i, text] of [
    "MEDICAL DEPOT  /  SUPPLY CONTROL",
    "STERILE RESERVE  /  SEALED STORES",
    "COLD CHAIN  /  2–8°C",
    "KEEP CLEAR  /  RESUPPLY ROUTE",
  ].entries()) {
    c.fillStyle = "#243a36";
    c.fillRect(0, i * 64, 1024, 64);
    c.fillStyle = i === 3 ? "#b9aa77" : "#8fb7a7";
    c.fillRect(0, i * 64, 8, 64);
    c.fillStyle = "#e0e6dd";
    c.font = "600 32px Arial";
    c.textBaseline = "middle";
    c.fillText(text, 26, i * 64 + 33, 974);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, r.renderer.capabilities.getMaxAnisotropy());
  texture.name = "Original medical depot wayfinding atlas";
  r.textures.add(texture);
  r.medicalDepotAtlas = texture;
  return texture;
}

export function decorateMedicalDepot(r, id, ctx) {
  if (id !== "breakwater") return null;
  const room = r.g.protocolMap.rooms.find((v) => v.id === "ammo");
  if (!room) return null;
  const { add, box, plane, own, steel, darkSteel, seal, floorMark, warm, extraFixtures } = ctx;
  const paint = own(
    surfaceMaterial(r, "plaster", {
      color: "#cbd1c8",
      repeat: [1.5, 1],
      roughness: 0.94,
      normalStrength: 0.14,
    }),
  );
  // Matte impact strips reuse the existing rubber substrate/batch.
  const band = seal;
  const signMaterial = own(r.material({ map: signage(r), roughness: 0.9, metalness: 0 }));
  const signs = new THREE.Group();
  signs.name = "Medical depot / shared wayfinding";
  const records = [];
  function put(g, m, p, s, q = null, shadow = false, kind = "ceiling", face = null) {
    add(g, m, p, s, q, shadow);
    if (!g.boundingBox) g.computeBoundingBox();
    const bounds = g.boundingBox
      .clone()
      .applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(...p),
          q || new THREE.Quaternion(),
          new THREE.Vector3(...s),
        ),
      );
    records.push({ kind, p, min: bounds.min.toArray(), max: bounds.max.toArray(), face });
  }
  function sign(row, p, s, q, kind = "wall", face = null) {
    const g = r.geo("medical-depot:label:" + row, () => {
      const g = new THREE.PlaneGeometry(1, 1),
        uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, (3 - row + uv.getY(i)) / 4);
      return g;
    });
    const mesh = new THREE.Mesh(g, signMaterial);
    mesh.position.set(...p);
    mesh.scale.set(...s);
    if (q) mesh.quaternion.copy(q);
    mesh.receiveShadow = true;
    signs.add(mesh);
    mesh.updateMatrix();
    if (!g.boundingBox) g.computeBoundingBox();
    const bounds = g.boundingBox.clone().applyMatrix4(mesh.matrix);
    records.push({ kind, p, min: bounds.min.toArray(), max: bounds.max.toArray(), face });
  }
  const floorTurn = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2,
  );
  const pipe = r.geo(
    "realism-environment:utility-pipe",
    () => new THREE.CylinderGeometry(1, 1, 1, 12),
  );
  const alongX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);

  // Insulated services, duct joints and cable tray above the complete room.
  // Existing shared instance batches absorb these fittings without one draw
  // per elbow, bracket or cable. No extra point-light/shadow pool is created.
  for (const [z, radius] of [
    [69.38, 0.09],
    [69.74, 0.045],
  ]) {
    put(pipe, steel, [67.5, 3.18, z], [radius, 14.7, radius], alongX, true);
    for (let x = 60.5; x < 75; x += 1.5)
      put(box, seal, [x, 3.18, z], [0.045, radius * 2.2, radius * 2.2]);
  }
  put(box, darkSteel, [67.5, 3.24, 74.63], [14.7, 0.28, 0.4]);
  for (let x = 61; x < 75; x += 2.4) put(box, steel, [x, 3.24, 74.63], [0.04, 0.31, 0.44]);
  for (const z of [70.25, 70.73]) put(box, steel, [67.5, 3.1, z], [14.7, 0.08, 0.035]);
  for (let x = 60.3; x < 75; x += 0.65)
    put(box, darkSteel, [x, 3.065, 70.49], [0.035, 0.025, 0.51]);
  for (let x = 61.5; x < 75; x += 3) put(box, steel, [x, 3.4, 72], [0.065, 0.06, 5.8]);

  // Replace the generic tarp/rack dressing on this SAME solid tile. The
  // closed, tall core still blocks human-height sight through collision cover.
  if (r.g.level[24]?.[22]) {
    put(box, paint, [67.5, 1.72, 73.5], [2.84, 3.38, 2.84], null, true, "solid");
    put(box, darkSteel, [67.5, 0.11, 73.5], [2.9, 0.16, 2.9], null, false, "solid");
    put(plane, seal, [67.5, 0.033, 73.5], [2.98, 2.98, 1], floorTurn, false, "solid");
    for (const [dx, dz] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.atan2(dx, dz),
      );
      const at = (u, y, d) =>
        new THREE.Vector3(u, y, d)
          .applyQuaternion(q)
          .add(new THREE.Vector3(67.5 + dx * 1.5, 0, 73.5 + dz * 1.5))
          .toArray();
      for (const u of [-0.65, 0.65]) {
        put(box, steel, at(u, 1.6, -0.06), [1.19, 2.48, 0.025], q, false, "solid");
        for (const side of [-1, 1])
          put(
            box,
            darkSteel,
            at(u + side * 0.61, 1.6, -0.037),
            [0.025, 2.52, 0.02],
            q,
            false,
            "solid",
          );
        put(
          box,
          darkSteel,
          at(u + (u < 0 ? 0.4 : -0.4), 1.49, -0.028),
          [0.045, 0.3, 0.055],
          q,
          false,
          "solid",
        );
        put(box, band, at(u, 2.52, -0.035), [1.1, 0.17, 0.016], q, false, "solid");
      }
      for (let k = 0; k < 8; k++)
        put(
          box,
          seal,
          at(-0.89 + k * 0.255, 0.31, -0.034),
          [0.15, 0.024, 0.012],
          q,
          false,
          "solid",
        );
      sign(2, at(0, 3.08, -0.025), [2.48, 0.155, 1], q, "solid");
    }
  }
  // Floor paint follows the north lane and leaves every doorway clear.
  for (const [x, z, w, d] of [
    [67.5, 71.8, 2.7, 0.055],
    [65.83, 73.5, 0.055, 2.75],
    [69.17, 73.5, 0.055, 2.75],
  ])
    put(plane, floorMark, [x, 0.035, z], [w, d, 1], floorTurn, false, "floor");
  sign(3, [64.5, 0.039, 73.5], [2.1, 0.14, 1], floorTurn, "floor");

  // One warm task practical augments the room's existing cool ceiling lights.
  if (r.g.level[22]?.[24]) {
    put(box, darkSteel, [73.5, 2.34, 69.025], [0.73, 0.18, 0.045], null, false, "wall", {
      x: 24,
      y: 22,
      dx: 0,
      dz: 1,
    });
    put(box, warm, [73.5, 2.32, 69.055], [0.59, 0.085, 0.025], null, false, "wall", {
      x: 24,
      y: 22,
      dx: 0,
      dz: 1,
    });
    const fixture = { x: 73.5, y: 2.28, z: 69.24, color: "#ffd8ae", intensity: 5, distance: 6 };
    extraFixtures.push(fixture);
    r.protocolFixtures.push(fixture);
  }

  function handles(f) {
    return f.x + f.dx >= 20 && f.x + f.dx < 25 && f.y + f.dz >= 23 && f.y + f.dz < 25;
  }
  function face(f) {
    const at = (u, v, d) =>
      new THREE.Vector3(u, v, d)
        .applyQuaternion(f.quaternion)
        .add(new THREE.Vector3(f.position[0], 0, f.position[2]))
        .toArray();
    const anchor = { x: f.x, y: f.y, dx: f.dx, dz: f.dz };
    put(plane, paint, at(0, 1.76, 0.018), [2.96, 3.46, 1], f.quaternion, false, "wall", anchor);
    put(box, band, at(0, 0.24, 0.025), [2.96, 0.35, 0.03], f.quaternion, false, "wall", anchor);
    put(
      box,
      darkSteel,
      at(0, 0.065, 0.026),
      [2.96, 0.075, 0.025],
      f.quaternion,
      false,
      "wall",
      anchor,
    );
    for (const u of [-1.47, 1.47])
      put(box, steel, at(u, 1.78, 0.026), [0.035, 3.4, 0.025], f.quaternion, false, "wall", anchor);
    put(box, steel, at(0, 3.31, 0.025), [2.93, 0.04, 0.028], f.quaternion, false, "wall", anchor);
    if (f.y === 22 && f.x === 24)
      sign(1, at(0, 2.66, 0.055), [2.45, 0.16, 1], f.quaternion, "wall", anchor);
    if (f.y === 25 && f.x === 24)
      sign(0, at(0, 2.55, 0.055), [2.55, 0.16, 1], f.quaternion, "wall", anchor);
  }
  r.medicalDepotPresentation = { room: { ...room }, storageTile: [22, 24], records };
  return {
    handles,
    face,
    finish(group) {
      batchStaticByMaterial(signs, 32);
      group.add(signs);
    },
  };
}
