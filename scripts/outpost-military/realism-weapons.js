/** Material and close-view geometry polish; simulation and weapon poses stay unchanged. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function ownedTexture(r, source, repeat = 1) {
  if (!source) return null;
  const texture = source.clone();
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  texture.userData.weapon = true;
  r.weaponTextures ||= new Set();
  r.weaponTextures.add(texture);
  r.textures.add(texture);
  return texture;
}

function weaponMaterial(r, options) {
  const material = r.material(options);
  material.userData.weapon = true;
  return material;
}

/** Same material keys as the renderer's firearm builders. */
export function weaponMaterials(r, firstPerson = true) {
  const fabric = r.realismSurfaces?.fabric;
  const finish = r.realismSurfaces?.weaponMetal;
  const texture = (source, repeat) =>
    firstPerson ? ownedTexture(r, source, repeat) : source || null;
  const materials = {
    // The former gun texture is diamond-tread industrial flooring. It cannot
    // describe a precision receiver: use the correct coating/metal response.
    metal: weaponMaterial(r, {
      color: "#414747",
      metalness: 0.72,
      roughness: 0.43,
      normalMap: texture(finish?.normal, 6),
      roughnessMap: texture(finish?.roughness, 6),
      normalScale: new THREE.Vector2(.055,.055),
    }),
    polymer: weaponMaterial(r, {
      color: "#41463c",
      metalness: 0,
      roughness: 0.74,
    }),
    steel: weaponMaterial(r, {
      color: "#889293",
      metalness: 1,
      roughness: 0.3,
      normalMap: texture(finish?.normal, 6),
      normalScale: new THREE.Vector2(.04,.04),
    }),
    cloth: weaponMaterial(r, {
      color: "#707665",
      metalness: 0,
      roughness: 0.92,
      map: texture(fabric?.color, 2.4),
      normalMap: texture(fabric?.normal, 2.4),
      roughnessMap: texture(fabric?.roughness, 2.4),
      normalScale: new THREE.Vector2(0.22, 0.22),
    }),
    rubber: weaponMaterial(r, {
      color: "#252c28",
      metalness: 0,
      roughness: 0.87,
    }),
    skin: weaponMaterial(r, {
      color: "#a77961",
      metalness: 0,
      roughness: 0.66,
    }),
  };
  // Leather belongs on palm reinforcement, rather than on every cloth surface
  // or the firearm's rubber butt-pad. All source textures stay renderer-owned.
  const palm = weaponMaterial(r, {
    color: "#606754",
    metalness: 0,
    roughness: 0.78,
    map: texture(r.gloveColor, 1.8),
    normalMap: texture(r.gloveNormal, 1.8),
    roughnessMap: texture(r.gloveRough, 1.8),
    normalScale: new THREE.Vector2(0.14, 0.14),
  });
  for (const material of [...Object.values(materials), palm])
    material.userData.weapon = firstPerson;
  if (firstPerson) {
    r.realismGlovePalm = palm;
    r.realismWeaponMaterials = materials;
  }
  return materials;
}

function segment(r, parent, material, start, end, radius) {
  const a = new THREE.Vector3(...start),
    b = new THREE.Vector3(...end);
  const direction = b.sub(a),
    length = direction.length();
  const mesh = r.mesh(
    parent,
    r.geo("realism-hand-bone", () => new THREE.CylinderGeometry(1, 1, 1, 12)),
    material,
    start.map((value, index) => (value + end[index]) / 2),
    [radius, length, radius],
  );
  // Rounded joints cover the shaft ends without elongating each finger tip.
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function ellipsoid(r, parent, material, position, scale) {
  return r.mesh(
    parent,
    r.geo("realism-hand-joint", () => new THREE.SphereGeometry(1, 20, 14)),
    material,
    position,
    scale,
  );
}

/** Anatomical palm, three finger phalanges, opposing thumb and tapered cuff. */
export function buildRealisticHand(r, parent, x, y, z, m) {
  const hand = new THREE.Group();
  hand.position.set(x, y, z);
  hand.name = "realistic-gloved-hand";
  parent.add(hand);
  const leather = r.realismGlovePalm || m.rubber;
  const thumbSide = x < 0 ? 1 : -1;
  const sleeveGeometry = r.geo(
    "realism-tapered-sleeve",
    () =>
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.029, 0),
          new THREE.Vector2(0.033, 0.025),
          new THREE.Vector2(0.04, 0.14),
          new THREE.Vector2(0.043, 0.28),
          new THREE.Vector2(0.043, 0.34),
          new THREE.Vector2(0, 0.34),
        ],
        24,
      ),
  );
  const sleeve = r.mesh(hand, sleeveGeometry, m.cloth, [0, -0.014, 0.054]);
  sleeve.rotation.x = Math.PI / 2 + 0.43;
  sleeve.rotation.z = x < 0 ? -0.1 : 0.09;
  sleeve.scale.x = 1.04;
  // Real gloves are rounded volumes; the thumb's thenar area gives the palm
  // its asymmetric shape instead of the previous rectangular mitten.
  ellipsoid(r, hand, leather, [0, 0, -0.001], [0.045, 0.027, 0.06]);
  ellipsoid(r, hand, m.cloth, [0, 0.022, 0.004], [0.041, 0.012, 0.055]);
  ellipsoid(r, hand, leather, [thumbSide * 0.031, -0.004, 0.008], [0.024, 0.025, 0.037]);
  const cuff = r.mesh(
    hand,
    r.geo("realism-glove-cuff", () => new THREE.TorusGeometry(0.031, 0.005, 8, 24)),
    m.rubber,
    [0, -0.01, 0.052],
    [1.05, 0.83, 1],
  );
  cuff.rotation.x = -0.15;
  // Four independently sized fingers curl around the existing grip/handguard.
  // Each connected segment has a rounded joint, unlike parallel straight rods.
  const fingers = [
    { x: -0.031, length: 0.043, radius: 0.01 },
    { x: -0.011, length: 0.048, radius: 0.011 },
    { x: 0.012, length: 0.044, radius: 0.0105 },
    { x: 0.031, length: 0.033, radius: 0.009 },
  ];
  for (const finger of fingers) {
    const a = [finger.x, 0.022, -0.033];
    const b = [finger.x, 0.011, -0.033 - finger.length];
    const c = [finger.x, -0.016, b[2] - 0.005];
    const d = [finger.x, -0.028, b[2] + 0.013];
    segment(r, hand, m.cloth, a, b, finger.radius);
    segment(r, hand, leather, b, c, finger.radius * 0.92);
    segment(r, hand, leather, c, d, finger.radius * 0.8);
    ellipsoid(r, hand, m.cloth, a, [finger.radius * 1.2, finger.radius * 0.8, finger.radius]);
    ellipsoid(r, hand, leather, b, [finger.radius, finger.radius, finger.radius]);
    ellipsoid(r, hand, leather, c, [
      finger.radius * 0.88,
      finger.radius * 0.88,
      finger.radius * 0.88,
    ]);
  }
  const thumb = [
    [thumbSide * 0.034, 0.004, 0.022],
    [thumbSide * 0.061, 0.01, -0.009],
    [thumbSide * 0.04, 0.025, -0.04],
  ];
  segment(r, hand, m.cloth, thumb[0], thumb[1], 0.014);
  segment(r, hand, leather, thumb[1], thumb[2], 0.011);
  ellipsoid(r, hand, leather, thumb[1], [0.013, 0.013, 0.013]);
  // A narrow closure strap and stitch seam have material depth but no outlines.
  r.box(hand, m.rubber, [thumbSide * 0.027, 0.01, 0.04], [0.034, 0.006, 0.026]);
  r.box(hand, m.cloth, [thumbSide * 0.027, 0.014, 0.04], [0.027, 0.003, 0.017]);
  return hand;
}

function etchedMaterial(r, id) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, 512, 96);
  c.fillStyle = "#b8bdb8";
  c.font = "500 35px ui-monospace, monospace";
  c.textBaseline = "middle";
  const names = {
    carbine: "VX-7",
    scatter: "SCATTER",
    breach: "BREACH",
    twin: "TWIN",
    rocket: "ROCKET",
    demo: "DEMO",
    shard: "SHARD",
  };
  c.fillText(`OZ  ${names[id] || id.toUpperCase()}`, 10, 37);
  c.font = "20px ui-monospace, monospace";
  c.fillText("FIELD ISSUE / 0147", 12, 77);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.weapon = true;
  r.weaponTextures ||= new Set();
  r.weaponTextures.add(texture);
  r.textures.add(texture);
  return weaponMaterial(r, {
    map: texture,
    color: "#b1b7b2",
    metalness: 0.35,
    roughness: 0.65,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
  });
}

function label(r, parent, material, position, width = 0.12, height = 0.022) {
  const mesh = r.mesh(
    parent,
    r.geo("realism-etch-plane", () => new THREE.PlaneGeometry(1, 1)),
    material,
    position,
    [width, height, 1],
  );
  mesh.rotation.y = -Math.PI / 2;
  mesh.castShadow = false;
}

function firearmDetails(r, gun, m, id, etch) {
  // Receiver seam, selector detent, bolt head and milled thumb recesses.
  r.box(gun, m.rubber, [-0.0432, -0.03, -0.526], [0.0013, 0.0016, 0.23]);
  for (const z of [-0.61, -0.424]) {
    const screw = r.cylinder(gun, m.steel, [-0.0438, -0.012, z], 0.0045, 0.0018, "x", 12);
    r.box(gun, m.rubber, [-0.0452, -0.012, z], [0.0005, 0.0012, 0.004]);
    screw.castShadow = false;
  }
  const selector = r.box(gun, m.steel, [-0.051, -0.02, -0.431], [0.004, 0.006, 0.022]);
  selector.rotation.x = 0.45;
  label(r, gun, etch, [-0.0435, 0.017, -0.545], 0.125, 0.024);
  const magazinePlate = r.box(gun, m.rubber, [0, -0.237, -0.595], [0.05, 0.013, 0.075]);
  magazinePlate.rotation.x = 0.16;
  magazinePlate.visible = !["scatter", "breach"].includes(id);
  // Small control and attachment details sit on the existing silhouette.
  r.cylinder(gun, m.steel, [0, 0.018, -0.86], 0.017, 0.022, "z", 20);
  for (const z of [-0.969, -1.024]) r.cylinder(gun, m.metal, [0, 0.018, z], 0.0153, 0.006, "z", 20);
  if (["scatter", "breach"].includes(id)) {
    for (let i = 0; i < 5; i++)
      r.box(gun, m.rubber, [0, 0.028, -0.753 - i * 0.023], [0.059, 0.002, 0.004]);
  } else {
    const dial = r.cylinder(gun, m.metal, [-0.052, 0.107, -0.51], 0.012, 0.017, "x", 20);
    r.cylinder(gun, m.steel, [-0.062, 0.107, -0.51], 0.009, 0.002, "x", 16);
    dial.receiveShadow = true;
  }
}

/** Static components share pose; merging preserves recoil and reload transforms. */
export function batchWeapon(r, root = r.rig) {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(),
    originals = [],
    mergedMaterials = new Set();
  root.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.visible || mesh.material.transparent || Array.isArray(mesh.material))
      return;
    // Hidden shotgun magazines must not reappear when converted to one mesh.
    for (let parent = mesh.parent; parent && parent !== root; parent = parent.parent)
      if (!parent.visible || parent.userData.weaponMoving) return;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2),
      );
    for (const key of Object.keys(geometry.attributes))
      if (!["position", "normal", "uv"].includes(key)) geometry.deleteAttribute(key);
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    if (!buckets.has(mesh.material)) buckets.set(mesh.material, []);
    buckets.get(mesh.material).push(geometry);
    originals.push(mesh);
  });
  for (const [material, geometries] of buckets) {
    const geometry = mergeGeometries(geometries, false);
    for (const temporary of geometries) temporary.dispose();
    if (!geometry) continue;
    mergedMaterials.add(material);
    const mesh = r.mesh(root, geometry, material);
    mesh.userData.ownedGeometry = true;
    mesh.userData.weaponBatch = true;
  }
  for (const mesh of originals) {
    if (!mergedMaterials.has(mesh.material)) continue;
    mesh.parent.remove(mesh);
    if (mesh.userData.ownedGeometry) mesh.geometry.dispose();
  }
}

export function finishWeapon(r, id) {
  const m = r.realismWeaponMaterials;
  if (!m) return;
  const etch = etchedMaterial(r, id);
  if (id === "carbine") {
    label(r, r.rig, etch, [-0.0315, 0.025, -0.512], 0.09, 0.018);
    batchWeapon(r);
    return;
  }
  if (["carbine", "scatter", "breach", "twin"].includes(id)) {
    for (const gun of [...r.rig.children].filter(
      (child) => child.isGroup && child.name !== "realistic-gloved-hand",
    ))
      firearmDetails(r, gun, m, id, etch);
  } else if (id === "rocket") {
    for (const z of [-0.38, -0.71, -0.91])
      r.cylinder(r.rig, m.metal, [0.02, 0, z], 0.097, 0.018, "z", 24);
    label(r, r.rig, etch, [-0.078, 0.015, -0.62], 0.14, 0.026);
  } else if (["demo", "shard"].includes(id)) {
    for (const x of id === "demo" ? [-0.055, 0.055] : [0]) {
      for (const y of [-0.14, -0.075, -0.015])
        r.cylinder(r.rig, m.rubber, [x, y, -0.52], 0.056, 0.007, "y", 24);
      label(r, r.rig, etch, [x - 0.056, -0.08, -0.52], 0.055, 0.025);
    }
  } else if (id !== "brawler") {
    const bladeGeometry = r.geo("realism-beveled-blade", () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.015, -0.05);
      shape.lineTo(0.015, -0.05);
      shape.lineTo(0, 0.23);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, {
        depth: 0.006,
        bevelEnabled: true,
        bevelThickness: 0.0006,
        bevelSize: 0.0006,
        bevelSegments: 1,
        steps: 1,
      });
    });
    r.rig.traverse((mesh) => {
      if (mesh.isMesh && mesh.userData.ownedGeometry && mesh.material === m.steel) {
        mesh.geometry.dispose();
        mesh.geometry = bladeGeometry;
        mesh.userData.ownedGeometry = false;
      }
    });
  }
  batchWeapon(r);
}
