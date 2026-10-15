/**
 * Physical, static surface detail for the existing shooter collision maps.
 * Every wall detail stays inside its original solid tile. Recessed glazing
 * has an opaque back wall: it never exposes actors behind collision cover.
 * The only objects over clear floor are flush floor marks and ceiling fittings.
 */
import * as THREE from "three";
import { surfaceMaterial } from "./realism-surfaces.js";

const SCALE = 3;
const FACES = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

function wallKey(level) {
  return level.map((row) => row.join("")).join("");
}

/** Called once after world construction, then after actual cover changes. */
export function decorateRealisticEnvironment(r, id, n) {
  const level = r.g.level;
  const key = `${id}:${wallKey(level)}`;
  if (r.realismDecor?.key === key && r.realismDecor.group.parent === r.world) {
    return r.realismDecor;
  }
  r.realismDecor?.dispose();

  const group = new THREE.Group();
  group.name = "Realistic architecture / collision-preserving detail";
  r.world.add(group);
  const beforeTextures = new Set(r.worldTextures);
  const ownMaterials = new Set();
  const hidden = [];
  const extraFixtures = [];
  const lightMaterials = [];
  const classicRooms = [];
  const batches = new Map();
  const box = r.geo("realism-environment:box", () => new THREE.BoxGeometry(1, 1, 1));
  const plane = r.geo("realism-environment:plane", () => new THREE.PlaneGeometry(1, 1));
  const height = ["breakwater", "medevac"].includes(id) ? 3.5 : 3;
  const transforms = FACES.map(([dx, dz]) =>
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dx, dz)),
  );

  function own(material) {
    material.userData.world = true;
    ownMaterials.add(material);
    return material;
  }
  function substrate(name, options) {
    return own(surfaceMaterial(r, name, options));
  }
  const stone = substrate("concrete", {
    color: "#b3aea0",
    repeat: [1.5, 1],
    roughness: 0.93,
    normalStrength: 0.65,
  });
  const render = substrate("plaster", {
    color: id === "estate" ? "#d3cbbc" : "#babcb4",
    repeat: [1.5, 1],
    roughness: 0.9,
    normalStrength: 0.42,
  });
  const timber = substrate("wood", {
    color: "#61584a",
    repeat: [1, 2],
    roughness: 0.86,
    normalStrength: 0.45,
  });
  const steel = substrate("weaponMetal", {
    color: "#656d6c",
    roughness: 0.62,
    metalness: 0.8,
    normalStrength: 0.12,
  });
  const darkSteel = own(r.material({ color: "#404a4c", metalness: 0.5, roughness: 0.75 }));
  const glazing = own(
    r.material({ color: "#344a51", metalness: 0, roughness: 0.21, envMapIntensity: 1.05 }),
  );
  const floorMark = own(
    r.material({
      color: "#c4c2b2",
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const seal = own(r.material({ color: "#515752", roughness: 0.98 }));

  function add(
    geometry,
    material,
    position,
    scale,
    quaternion,
    shadows = true,
    persistent = false,
    structural = false,
  ) {
    const batchKey = `${geometry.uuid}:${material.uuid}:${shadows}:${persistent}:${structural}`;
    let batch = batches.get(batchKey);
    if (!batch) {
      batch = { geometry, material, matrices: [], shadows, persistent, structural };
      batches.set(batchKey, batch);
    }
    batch.matrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        quaternion || new THREE.Quaternion(),
        new THREE.Vector3(...scale),
      ),
    );
  }
  function face(x, y, index) {
    const [dx, dz] = FACES[index];
    return {
      x,
      y,
      index,
      dx,
      dz,
      position: [(x + 0.5 + dx * 0.5) * SCALE, 0, (y + 0.5 + dz * 0.5) * SCALE],
      quaternion: transforms[index],
    };
  }
  // Local z=0 is the original collision face; negative z is inside the wall.
  function atFace(f, material, u, v, depth, w, h, thickness, shadows = true, structural = false) {
    const p = new THREE.Vector3(u, v, depth).applyQuaternion(f.quaternion);
    p.x += f.position[0];
    p.z += f.position[2];
    add(box, material, [p.x, p.y, p.z], [w, h, thickness], f.quaternion, shadows, false, structural);
  }
  function paneAtFace(f, material, u, v, depth, w, h) {
    const p = new THREE.Vector3(u, v, depth).applyQuaternion(f.quaternion);
    add(
      plane,
      material,
      [p.x + f.position[0], p.y, p.z + f.position[2]],
      [w, h, 1],
      f.quaternion,
      false,
    );
  }
  function pipeAtFace(f, material, u, v, depth, radius, length, horizontal = false) {
    const p = new THREE.Vector3(u, v, depth).applyQuaternion(f.quaternion);
    const rotation = f.quaternion.clone();
    if (horizontal)
      rotation.multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
      );
    add(
      r.geo("realism-environment:utility-pipe", () => new THREE.CylinderGeometry(1, 1, 1, 12)),
      material,
      [p.x + f.position[0], p.y, p.z + f.position[2]],
      [radius, length, radius],
      rotation,
    );
  }
  function clearOriginalTile(x, y) {
    for (const mesh of r.wallMeshes || []) {
      const tiles = mesh.userData.tiles || [];
      const index = tiles.findIndex(([tx, ty]) => tx === x && ty === y);
      if (index < 0) continue;
      // Preserve the actual arena bounds before moving a hidden instance.
      // Otherwise Three's lazy sphere calculation would include y=-1000 and
      // turn a small wall batch into an unnecessarily enormous culling bound.
      if (!mesh.boundingSphere) mesh.computeBoundingSphere();
      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(index, matrix);
      hidden.push({ mesh, index, matrix: matrix.clone() });
      // Leave the geometry finite and outside the camera/shadow frusta. Zero
      // instance scales produce undefined normals on some mobile drivers.
      matrix.elements[13] = -1000;
      mesh.setMatrixAt(index, matrix);
      mesh.instanceMatrix.needsUpdate = true;
      return true;
    }
    return false;
  }
  function recess(f, type, industrial = false) {
    if (!clearOriginalTile(f.x, f.y)) return false;
    const body = r.wallMaterials[type];
    const depth = industrial ? 0.065 : 0.14;
    // Full-depth, opaque tile back. This guarantees the original simulation's
    // sightline remains blocked even at a steep angle through a window bay.
    atFace(f, body, 0, height / 2, -(SCALE + depth) / 2, SCALE, height, SCALE - depth, true, true);
    if (industrial) {
      const corrugation = r.geo("realism-environment:corrugated-sheet", () => {
        const geometry = new THREE.PlaneGeometry(1, 1, 120, 1);
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          positions.setZ(i, (Math.cos((positions.getX(i) + 0.5) * Math.PI * 24) - 1) * 0.025);
        }
        geometry.computeVertexNormals();
        return geometry;
      });
      const p = new THREE.Vector3(0, height / 2, -0.005).applyQuaternion(f.quaternion);
      add(
        corrugation,
        body,
        [p.x + f.position[0], p.y, p.z + f.position[2]],
        [SCALE, height - 0.16, 1],
        f.quaternion,
      );
      for (const v of [0.07, height - 0.07]) atFace(f, steel, 0, v, -0.03, SCALE, 0.12, 0.06);
      // Container door locking bars have plausible hardware dimensions.
      for (const u of [-0.86, 0.86]) {
        atFace(f, steel, u, height / 2, -0.025, 0.045, height - 0.42, 0.05);
        for (const v of [0.45, 1.45, height - 0.45])
          atFace(f, darkSteel, u, v, -0.019, 0.12, 0.09, 0.038);
      }
      return true;
    }
    const width = id === "skyport" ? 2.2 : 1.62;
    const windowHeight = id === "skyport" ? 1.56 : 1.32;
    const centre = id === "skyport" ? 1.77 : 1.76;
    const bottom = centre - windowHeight / 2;
    const top = centre + windowHeight / 2;
    atFace(f, body, 0, bottom / 2, -depth / 2, SCALE, bottom, depth);
    atFace(f, body, 0, (height + top) / 2, -depth / 2, SCALE, height - top, depth);
    for (const u of [-(SCALE + width) / 4, (SCALE + width) / 4]) {
      atFace(f, body, u, centre, -depth / 2, (SCALE - width) / 2, windowHeight, depth);
    }
    const frame = id === "testblock" ? timber : darkSteel;
    // Reveals are genuine geometry inside the wall, not a flat dark decal.
    for (const u of [-width / 2, width / 2])
      atFace(f, frame, u, centre, -0.06, 0.075, windowHeight, 0.12);
    for (const v of [bottom, top]) atFace(f, frame, 0, v, -0.06, width + 0.07, 0.07, 0.12);
    paneAtFace(f, glazing, 0, centre, -depth + 0.003, width - 0.065, windowHeight - 0.065);
    atFace(f, frame, 0, centre, -0.08, 0.033, windowHeight - 0.08, 0.06);
    atFace(f, stone, 0, bottom - 0.035, -0.065, width + 0.16, 0.07, 0.13);
    return true;
  }

  function skipTile(x, y) {
    return (
      r.protocolPropTile?.(x, y) || r.transportWindowTile?.(x, y) || r.transportHiddenWall?.(x, y)
    );
  }
  function wantsWindow(x, y, type) {
    if (id === "breakwater") return y >= 3 && y <= 15 && [2, 8, 19, 25].includes(x);
    if (id === "testblock") return [2, 4].includes(type) && y >= 4 && y <= 11;
    if (id === "skyport") return type === 5 && x >= 3 && x <= 14 && y >= 3 && y <= 11;
    if (id === "estate") return [1, 5].includes(type) && y >= 3 && y <= 7;
    return false;
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const type = level[y]?.[x];
      if (!type || skipTile(x, y)) continue;
      const exposed = FACES.map(([dx, dz], index) =>
        level[y + dz]?.[x + dx] === 0 ? index : -1,
      ).filter((index) => index >= 0);
      if (!exposed.length) continue;
      const straight = exposed.find((index) => {
        const [dx, dz] = FACES[index];
        return dx
          ? level[y - 1]?.[x] === type && level[y + 1]?.[x] === type
          : level[y]?.[x - 1] === type && level[y]?.[x + 1] === type;
      });
      if (id === "freight" && [2, 4].includes(type)) recess(face(x, y, exposed[0]), type, true);
      else if (straight !== undefined && wantsWindow(x, y, type) && (x + y) % 2 === 0) {
        recess(face(x, y, straight), type);
      }
      for (const index of exposed) {
        const f = face(x, y, index);
        const trim = id === "medevac" ? steel : id === "outpost" ? stone : render;
        // Mount trim 8 mm clear of the wall face. Sub-millimetre/coplanar
        // surfaces fight for depth at grazing angles while the camera moves.
        atFace(f, trim, 0, 0.13, -0.0045, SCALE, 0.24, 0.025, false);
        if (id !== "freight") atFace(f, trim, 0, height - 0.065, -0.006, SCALE, 0.12, 0.028, false);
        if (id === "outpost") {
          atFace(f, seal, 0, 1.05, 0.0045, SCALE, 0.012, 0.007, false);
          atFace(f, seal, 0, 2.08, 0.0045, SCALE, 0.012, 0.007, false);
        }
        if (id === "medevac") {
          // Hull seams are narrow rubber expansion joints rather than bright
          // outlines. Reinforcement follows actual aircraft wall bays.
          atFace(f, seal, 0, 2.62, 0.002, SCALE, 0.018, 0.012, false);
          for (const u of [-1.46, 1.46]) atFace(f, steel, u, 1.75, -0.012, 0.055, 3.36, 0.04);
        }
        const adjacentRoom =
          id === "breakwater" &&
          r.g.protocolMap?.rooms.find(
            (room) =>
              x + f.dx >= room.x &&
              x + f.dx < room.x + room.w &&
              y + f.dz >= room.y &&
              y + f.dz < room.y + room.h,
          );
        if (
          adjacentRoom &&
          ["generators", "maintenance", "communications"].includes(adjacentRoom.id)
        ) {
          // Conduits and junctions follow utility rooms, recessed into the
          // original wall. None consumes a playable floor tile.
          for (const u of [-0.62, -0.48]) pipeAtFace(f, darkSteel, u, 2.14, -0.014, 0.026, 2.26);
          pipeAtFace(f, steel, -0.55, 2.91, -0.014, 0.022, 1.4, true);
          if ((x + y) % 4 === 0) {
            atFace(f, darkSteel, -0.54, 2.35, -0.01, 0.19, 0.24, 0.05);
            atFace(f, seal, -0.54, 2.35, 0.022, 0.155, 0.205, 0.003);
          }
        }
      }
      if (id !== "medevac") {
        // Coping is over the existing wall footprint, never over a route.
        add(
          box,
          ["outpost", "estate"].includes(id) ? stone : steel,
          [(x + 0.5) * SCALE, height + 0.028, (y + 0.5) * SCALE],
          [SCALE, 0.055, SCALE],
        );
      }
    }
  }

  // Door jambs hug their existing solid neighbours. Headers are above the
  // original wall/roof line, so no human-height visibility is obstructed.
  for (const horizontal of [true, false]) {
    for (let line = 1; line < n - 1; line++) {
      for (let from = 1; from < n - 1; from++) {
        const cell = (a, b) => (horizontal ? level[a]?.[b] : level[b]?.[a]);
        if (cell(line, from) || !cell(line, from - 1)) continue;
        let end = from;
        while (end < n - 1 && cell(line, end) === 0) end++;
        const width = end - from;
        if (width < 1 || width > 2 || !cell(line, end) || cell(line, from - 1) !== cell(line, end))
          continue;
        if (
          !Array.from({ length: width }, (_, offset) => from + offset).every(
            (along) => cell(line - 1, along) === 0 && cell(line + 1, along) === 0,
          )
        )
          continue;
        const position = horizontal
          ? [(from + width / 2) * SCALE, 0, (line + 0.5) * SCALE]
          : [(line + 0.5) * SCALE, 0, (from + width / 2) * SCALE];
        const quaternion = horizontal ? transforms[0] : transforms[2];
        const f = { position, quaternion };
        for (const u of [-((width * SCALE) / 2 + 0.05), (width * SCALE) / 2 + 0.05]) {
          atFace(f, id === "testblock" ? timber : steel, u, height / 2, 0, 0.1, height, 0.16);
        }
        atFace(
          f,
          steel,
          0,
          ["breakwater", "medevac"].includes(id) ? 2.42 : height + 0.06,
          0,
          width * SCALE + 0.2,
          0.12,
          0.16,
        );
        from = end;
      }
    }
  }

  // Flat lane/pad markings retain the engine's exact walking floor. No kerb
  // geometry is added to an unblocked cell, including the shallow pool court.
  const floorQuaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2,
  );
  function floorRectangle(x, y, w, h, material = floorMark) {
    const minX = Math.max(0, Math.floor(x - w / 2)),
      maxX = Math.min(n - 1, Math.floor(x + w / 2));
    const minY = Math.max(0, Math.floor(y - h / 2)),
      maxY = Math.min(n - 1, Math.floor(y + h / 2));
    for (let yy = minY; yy <= maxY; yy++)
      for (let xx = minX; xx <= maxX; xx++) if (level[yy]?.[xx]) return;
    add(
      plane,
      material,
      [x * SCALE, id === "breakwater" || id === "medevac" ? 0.034 : 0.022, y * SCALE],
      [w * SCALE, h * SCALE, 1],
      floorQuaternion,
      false,
    );
  }
  if (id === "testblock") for (let y = 1.8; y < n - 1; y += 2.1) floorRectangle(8, y, 0.028, 0.85);
  if (id === "skyport") {
    for (let x = 2.3; x < 16; x += 2.5) floorRectangle(x, 14.2, 0.95, 0.03);
    for (const x of [5.2, 10.2, 15.2]) {
      floorRectangle(x, 20.4, 0.035, 2.2);
      floorRectangle(x + 2.1, 20.4, 0.035, 2.2);
      floorRectangle(x + 1.05, 21.5, 2.13, 0.035);
    }
  }
  if (id === "freight") {
    for (const x of [4, 8]) for (const y of [2.7, 5.3, 6.7, 9.3]) floorRectangle(x, y, 1.7, 0.025);
  }
  if (id === "breakwater") {
    const loading = r.g.protocolMap?.loading;
    if (loading)
      for (const x of [loading.x - 0.35, loading.x + 0.35])
        floorRectangle(x, loading.y, 0.028, 0.72);
  }
  if (id === "medevac") {
    for (let y = 5.5; y < 16; y += 1.7) {
      floorRectangle(8.02, y, 0.018, 0.55);
      floorRectangle(9.98, y, 0.018, 0.55);
    }
  }

  // Buildings keep their original shells and entrances. These roofs sit
  // above the collision wall height; their underside is a real ceiling,
  // not sky painted into an interior. The shapes follow existing footprints.
  const roofs =
    id === "testblock"
      ? [
          { id: "west-house", x: 3, y: 4, w: 4, h: 8, pitched: true, color: "#68736d" },
          { id: "east-house", x: 9, y: 4, w: 4, h: 8, pitched: true, color: "#747776" },
        ]
      : id === "estate"
        ? [
            { id: "west-villa", x: 3, y: 3, w: 5, h: 5, pitched: true, color: "#6f655a" },
            { id: "east-villa", x: 12, y: 3, w: 5, h: 5, pitched: true, color: "#626e73" },
          ]
        : id === "skyport"
          ? [
              { id: "terminal", x: 3, y: 3, w: 12, h: 9, pitched: false, color: "#92968f" },
              { id: "aircraft-cabin", x: 18, y: 4, w: 4, h: 14, aircraft: true },
            ]
          : [];
  for (const roof of roofs) {
    // Large cover destruction can remove a building's support. Avoid leaving
    // an entire roof floating after its shell has largely disappeared.
    let supports = 0;
    for (let y = roof.y; y < roof.y + roof.h; y++)
      for (let x = roof.x; x < roof.x + roof.w; x++) {
        if (
          (x === roof.x ||
            x === roof.x + roof.w - 1 ||
            y === roof.y ||
            y === roof.y + roof.h - 1) &&
          level[y]?.[x]
        )
          supports++;
      }
    if (supports < Math.max(4, (roof.w * 2 + roof.h * 2 - 4) * 0.35)) continue;
    const room = {
      id: roof.id,
      x: roof.x + 1,
      y: roof.y + 1,
      w: roof.w - 2,
      h: roof.h - 2,
      roofed: true,
    };
    classicRooms.push(room);
    const centreX = (roof.x + roof.w / 2) * SCALE,
      centreZ = (roof.y + roof.h / 2) * SCALE;
    // A down-facing interior plane shares the wall's top datum. It also
    // closes the cargo aircraft's ceiling under its existing curved shell.
    const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    add(
      plane,
      render,
      [centreX, height + 0.025, centreZ],
      [room.w * SCALE, room.h * SCALE, 1],
      down,
    );
    if (roof.aircraft) continue;
    const roofMaterial = substrate("weaponMetal", {
      color: roof.color,
      repeat: [roof.w, roof.h],
      roughness: 0.83,
      metalness: 0,
      normalStrength: 0.24,
    });
    const width = roof.w * SCALE,
      length = roof.h * SCALE;
    if (roof.pitched) {
      const rise = width * 0.175;
      const roofGeometry = r.geo("realism-environment:gable-roof", () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              -0.5, 0, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0.5, 0,
              0.5, 0.5, 0, -0.5,
            ],
            3,
          ),
        );
        geometry.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(
            [0, 0, 0, 1, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 1, 1, 1, 0],
            2,
          ),
        );
        geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
        geometry.computeVertexNormals();
        return geometry;
      });
      add(roofGeometry, roofMaterial, [centreX, height + 0.045, centreZ], [width, rise, length]);
      const gable = r.geo("realism-environment:gable-end", () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0], 3),
        );
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
        geometry.setIndex([0, 1, 2]);
        geometry.computeVertexNormals();
        return geometry;
      });
      add(gable, render, [centreX, height + 0.04, centreZ + length / 2], [width, rise, 1]);
      add(
        gable,
        render,
        [centreX, height + 0.04, centreZ - length / 2],
        [width, rise, 1],
        transforms[1],
      );
      add(box, steel, [centreX, height + rise + 0.04, centreZ], [0.11, 0.09, length]);
      for (const x of [centreX - width / 2 + 0.05, centreX + width / 2 - 0.05]) {
        add(box, steel, [x, height + 0.045, centreZ], [0.1, 0.11, length]);
      }
    } else {
      add(box, roofMaterial, [centreX, height + 0.13, centreZ], [width, 0.2, length]);
      // Low parapets and paired HVAC cabinets belong to the terminal roof.
      for (const z of [centreZ - length / 2 + 0.08, centreZ + length / 2 - 0.08])
        add(box, stone, [centreX, height + 0.43, z], [width, 0.4, 0.16]);
      for (const x of [centreX - width / 2 + 0.08, centreX + width / 2 - 0.08])
        add(box, stone, [x, height + 0.43, centreZ], [0.16, 0.4, length]);
      for (const x of [centreX - 5, centreX + 5]) {
        add(box, steel, [x, height + 0.78, centreZ - 2.5], [1.5, 1.1, 1.1]);
        for (let row = 0; row < 6; row++)
          add(box, darkSteel, [x, height + 0.38 + row * 0.14, centreZ - 1.945], [1.2, 0.07, 0.018]);
      }
    }
  }

  const map = id === "medevac" ? r.g.transportMap : id === "breakwater" ? r.g.protocolMap : null;
  const longRooms = (map?.rooms || []).filter(
    (room) => room.roofed !== false && room.w > 2 && room.h >= 5 && room.h > room.w * 1.15,
  );
  if (longRooms.length || classicRooms.length) {
    const lamp = own(
      r.material({
        color: "#e5e4dc",
        emissive: "#d3dddc",
        emissiveIntensity: 0.8,
        roughness: 0.68,
      }),
    );
    r.protocolLightMaterials.push(lamp);
    lightMaterials.push(lamp);
    for (const room of longRooms) {
      for (const offset of [1.35, room.h - 1.35]) {
        const x = (room.x + room.w / 2) * SCALE,
          z = (room.y + offset) * SCALE;
        add(box, steel, [x, 3.35, z], [1.24, 0.075, 0.32]);
        add(box, lamp, [x, 3.305, z], [1.08, 0.025, 0.26], undefined, false, true);
        const fixture = { x, y: 3.13, z };
        r.protocolFixtures.push(fixture);
        extraFixtures.push(fixture);
      }
    }
    for (const room of classicRooms) {
      const columns = room.w >= 8 ? 2 : 1;
      const rows = Math.max(1, Math.min(4, Math.ceil(room.h / 3.5)));
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const x = (room.x + (room.w * (col + 0.5)) / columns) * SCALE;
          const z = (room.y + (room.h * (row + 0.5)) / rows) * SCALE;
          add(box, steel, [x, height - 0.022, z], [1.2, 0.055, 0.32]);
          add(box, lamp, [x, height - 0.055, z], [1.06, 0.023, 0.26], undefined, false, true);
          const fixture = { x, y: height - 0.18, z };
          r.protocolFixtures.push(fixture);
          extraFixtures.push(fixture);
        }
    }
  }

  for (const batch of batches.values()) {
    if (!batch.matrices.length) continue;
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    mesh.name = "Instanced architectural detail";
    mesh.castShadow = batch.shadows;
    mesh.receiveShadow = true;
    if (batch.structural) mesh.userData.noRoomCull = true;
    // A floor-grid visibility test cannot decide whether an overhead light is
    // visible. Keep emitting faces in the draw list; geometry depth still hides
    // them behind walls, and protocol power state alone controls their emission.
    if (batch.persistent) {
      mesh.userData.noRoomCull = true;
      mesh.frustumCulled = false;
    }
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  const ownTextures = [...r.worldTextures].filter((texture) => !beforeTextures.has(texture));
  let disposed = false;
  const state = {
    group,
    key,
    rooms: classicRooms,
    diagnostics: {
      drawCalls: group.children.length,
      recessedTiles: hidden.length,
      extraFixtures: extraFixtures.length,
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const instance of hidden) {
        if (!r.wallMeshes?.includes(instance.mesh) || !instance.mesh.parent) continue;
        instance.mesh.setMatrixAt(instance.index, instance.matrix);
        instance.mesh.instanceMatrix.needsUpdate = true;
      }
      r.world.remove(group);
      group.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
      });
      group.clear();
      for (const material of ownMaterials) {
        material.dispose();
        r.materials.delete(material);
      }
      for (const texture of ownTextures) {
        texture.dispose();
        r.worldTextures.delete(texture);
        r.textures.delete(texture);
      }
      const fixtureSet = new Set(extraFixtures),
        lightSet = new Set(lightMaterials);
      r.protocolFixtures = r.protocolFixtures.filter((fixture) => !fixtureSet.has(fixture));
      r.protocolLightMaterials = r.protocolLightMaterials.filter(
        (material) => !lightSet.has(material),
      );
      if (r.realismDecor === state) r.realismDecor = null;
    },
  };
  r.realismDecor = state;
  return state;
}
