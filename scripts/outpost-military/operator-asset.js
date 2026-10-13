/** Original contemporary operator geometry, bound to the existing animation rig.
 * Dimensions are metres. Uniform folds, carrier, pouches, helmet, hands and
 * facial volumes are real geometry; no Vanguard armor atlas is used.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export function buildOperatorAsset(gltf, headSource) {
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  let source;
  const old = [];
  model.traverse((o) => {
    if (o.isMesh) old.push(o);
    if (o.isSkinnedMesh && !source) source = o;
  });
  const skeleton = source.skeleton;
  const bones = skeleton.bones;
  const index = (name) => bones.findIndex((b) => b.name.replace(/[^a-z]/gi, "").endsWith(name));
  const point = (name) => bones[index(name)].getWorldPosition(new THREE.Vector3());
  const parts = new Map();
  const definitions = [
    ["Uniform fabric", "#a49c82", 0, 0.92],
    ["Carrier webbing", "#8e8168", 0, 0.94],
    ["Skin", "#a67c62", 0, 0.63],
    ["Helmet composite", "#867e66", 0, 0.92],
    ["Glove leather", "#424a3d", 0, 0.84],
    ["Boot rubber", "#272d29", 0, 0.94],
    ["Equipment metal", "#727c7b", 0.8, 0.42],
    ["Lens glass", "#5f7475", 0, 0.13],
    ["Eye sclera", "#b7b0a3", 0, 0.65],
    ["Iris", "#302920", 0, 0.62],
  ];
  const materials = definitions.map(([name, color, metalness, roughness]) => {
    const m = new THREE.MeshStandardMaterial({ name, color, metalness, roughness });
    m.userData.operatorMaterial = true;
    return m;
  });
  materials[7].transparent = true;
  materials[7].opacity = 0.36;
  materials[7].depthWrite = false;
  function add(geometry, material, boneName, weights) {
    const count = geometry.attributes.position.count;
    const ids = new Uint16Array(count * 4),
      values = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const entries = weights ? weights(i) : [[index(boneName), 1]];
      for (let j = 0; j < entries.length; j++) {
        ids[i * 4 + j] = Math.max(0, entries[j][0]);
        values[i * 4 + j] = entries[j][1];
      }
    }
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(values, 4));
    if (!geometry.index) geometry = geometry.clone();
    else geometry = geometry.toNonIndexed();
    for (const key of Object.keys(geometry.attributes))
      if (!["position", "normal", "uv", "skinIndex", "skinWeight"].includes(key))
        geometry.deleteAttribute(key);
    if (!parts.has(material)) parts.set(material, []);
    parts.get(material).push(geometry);
  }
  function volume(pos, size, material, boneName, rounded = true) {
    const geo = rounded
      ? new RoundedBoxGeometry(...size, 3, Math.min(...size) * 0.26)
      : new THREE.SphereGeometry(1, 20, 12);
    if (!rounded) geo.scale(...size);
    geo.translate(...pos);
    add(geo, material, boneName);
  }
  function sphere(pos, size, material, boneName) {
    volume(pos, size, material, boneName, false);
  }
  function limb(startName, endName, r1, r2, material) {
    const start = point(startName),
      end = point(endName),
      dir = end.clone().sub(start).normalize();
    const sleeveHead = /^(Left|Right)Arm$/.test(startName);
    if (sleeveHead) start.addScaledVector(dir, -.036);
    const across = new THREE.Vector3(0, 0, 1).cross(dir).normalize();
    const depth = dir.clone().cross(across).normalize();
    const steps = startName.includes("Hand") ? 4 : 24,
      sides = startName.includes("Hand") ? 10 : 20,
      positions = [],
      uv = [],
      indices = [];
    for (let k = 0; k <= steps; k++)
      for (let j = 0; j <= sides; j++) {
        const t = k / steps,
          a = (j / sides) * Math.PI * 2;
        const isCloth = material === 0;
        // Broad sleeve/trouser folds follow the limb and gather towards the
        // elbow/knee/cuff. Their millimetre-scale relief is geometry, not noise.
        const gather = Math.exp(-Math.pow((t - .83) / .16, 2));
        const crease = Math.sin(t * 25 + Math.sin(a) * 1.6) * .0045
          + Math.sin(t * 44 - a * 2) * gather * .003;
        const fold = isCloth ? crease * Math.sin(Math.PI * t) : 0;
        const radius = THREE.MathUtils.lerp(r1, r2, t) + Math.sin(Math.PI * t) * .006 + fold;
        const p = start
          .clone()
          .lerp(end, t)
          .addScaledVector(across, Math.cos(a) * radius)
          .addScaledVector(depth, Math.sin(a) * radius * 0.93);
        positions.push(...p.toArray());
        uv.push(j / sides, t * 2);
        if (k < steps && j < sides) {
          const q = k * (sides + 1) + j;
          // The basis follows the bone direction, so angular then longitudinal
          // winding faces outwards. Inward normals made cloth read as plastic.
          indices.push(q, q + 1, q + sides + 1, q + 1, q + sides + 2, q + sides + 1);
        }
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    add(geo, material, null, (i) => {
      const t = Math.floor(i / (sides + 1)) / steps;
      const f = THREE.MathUtils.smoothstep(t, 0.65, 1);
      const shoulderWeight = sleeveHead ? .5 * (1 - THREE.MathUtils.smoothstep(t, 0, .22)) : 0;
      return [
        [index(startName), 1 - f - shoulderWeight],
        [index(endName), f],
        ...(sleeveHead ? [[index("Spine2"), shoulderWeight]] : []),
      ];
    });
  }
  // Tailored torso: restrained shoulders and waist, open collar at the neck.
  const rings = [
      [0.90, 0.142, 0.094],
      [0.95, 0.147, 0.101],
      [0.98, 0.145, 0.093],
      [1.04, 0.15, 0.099],
      [1.12, 0.156, 0.105],
      [1.23, 0.165, 0.115],
      [1.34, 0.185, 0.12],
      [1.43, 0.197, 0.109],
      [1.48, 0.16, 0.1],
      [1.53, 0.065, 0.065],
    ],
    p = [],
    u = [],
    idx = [];
  for (let k = 0; k < rings.length; k++)
    for (let j = 0; j <= 36; j++) {
      const [y, w, d] = rings[k],
        a = (j / 36) * Math.PI * 2;
      const fold = Math.sin(a * 6 + y * 24) * .0035;
      p.push(Math.cos(a) * (w + fold), y, Math.sin(a) * (d + fold) + 0.027);
      u.push(j / 36, (y - 0.98) * 3);
      if (k < rings.length - 1 && j < 36) {
        const q = k * 37 + j;
        idx.push(q, q + 37, q + 1, q + 1, q + 37, q + 38);
      }
    }
  const torso = new THREE.BufferGeometry();
  torso.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  torso.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2));
  torso.setIndex(idx);
  torso.computeVertexNormals();
  add(torso, 0, null, (i) => {
    const y = p[i * 3 + 1];
    const f = THREE.MathUtils.smoothstep(y, 1.08, 1.42);
    return [
      [index("Hips"), 1 - f],
      [index("Spine2"), f],
    ];
  });
  // Front/back fabric plate bags and restrained MOLLE loops, no painted plates.
  volume([0, 1.315, -0.112], [0.284, 0.285, 0.045], 1, "Spine2");
  volume([0, 1.325, 0.175], [0.282, 0.28, 0.045], 1, "Spine2");
  for (const x of [-0.103, 0, 0.103]) {
    volume([x, 1.235, -0.15], [0.078, 0.132, 0.051], 1, "Spine2");
    volume([x, 1.291, -0.179], [0.061, 0.027, 0.006], 0, "Spine2");
  }
  for (const y of [1.345, 1.389, 1.433])
    for (const x of [-0.096, -0.048, 0, 0.048, 0.096])
      volume([x, y, -0.139], [0.035, 0.009, 0.0035], 0, "Spine2");
  for (const x of [-0.124, 0.124]) volume([x, 1.448, 0.021], [0.037, 0.065, 0.277], 1, "Spine2");
  volume([0, 1.016, 0.025], [0.322, 0.041, 0.22], 4, "Hips");
  volume([0.014, 1.017, -0.096], [0.037, 0.028, 0.009], 6, "Hips");
  for (const side of ["Left", "Right"]) {
    limb(side + "Arm", side + "ForeArm", 0.077, 0.058, 0);
    limb(side + "ForeArm", side + "Hand", 0.06, 0.039, 0);
    limb(side + "UpLeg", side + "Leg", 0.10, 0.073, 0);
    limb(side + "Leg", side + "Foot", 0.074, 0.052, 0);
    const thigh = point(side + "UpLeg").lerp(point(side + "Leg"), 0.35);
    volume(
      [thigh.x + (side === "Left" ? -0.059 : 0.059), thigh.y, thigh.z],
      [0.046, 0.125, 0.11],
      0,
      side + "UpLeg",
    );
    const knee = point(side + "Leg");
    volume([knee.x, knee.y - 0.012, knee.z - 0.068], [0.10, 0.119, 0.014], 1, side + "Leg");
    const foot = point(side + "Foot"),
      toe = point(side + "ToeBase");
    // A continuous boot upper replaces the disconnected ankle block and toe
    // sphere. Skinning along the forefoot preserves its bend at toe-off.
    const bootRings = [
      [.018, .056, .134, foot.z - .085],
      [.045, .060, .139, foot.z - .084],
      [.077, .057, .125, foot.z - .073],
      [.111, .052, .085, foot.z - .025],
      [.155, .048, .060, foot.z],
      [.205, .050, .061, foot.z],
    ];
    const bootP = [], bootUV = [], bootIndex = [], bootSides = 24;
    for (let k = 0; k < bootRings.length; k++) {
      const [y, xr, zr, z] = bootRings[k];
      for (let j = 0; j <= bootSides; j++) {
        const a = j / bootSides * Math.PI * 2;
        bootP.push(foot.x + Math.cos(a) * xr, y, z + Math.sin(a) * zr);
        bootUV.push(j / bootSides, y * 5);
        if (k < bootRings.length - 1 && j < bootSides) {
          const n = k * (bootSides + 1) + j;
          bootIndex.push(n, n + bootSides + 1, n + 1, n + 1, n + bootSides + 1, n + bootSides + 2);
        }
      }
    }
    const boot = new THREE.BufferGeometry();
    boot.setAttribute("position", new THREE.Float32BufferAttribute(bootP, 3));
    boot.setAttribute("uv", new THREE.Float32BufferAttribute(bootUV, 2));
    boot.setIndex(bootIndex);
    boot.computeVertexNormals();
    add(boot, 4, null, (i) => {
      const toeWeight = THREE.MathUtils.smoothstep(-bootP[i * 3 + 2], .025, .13)
        * (1 - THREE.MathUtils.smoothstep(bootP[i * 3 + 1], .077, .15));
      return [[index(side + "Foot"), 1 - toeWeight], [index(side + "ToeBase"), toeWeight]];
    });
    const soleShape = new THREE.Shape();
    soleShape.absellipse(0, 0, 0.056, 0.112, 0, Math.PI * 2, false, 0);
    const sole = new THREE.ExtrudeGeometry(soleShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 20,
    });
    sole.rotateX(-Math.PI / 2);
    sole.translate(foot.x, 0.004, toe.z + 0.055);
    const solePosition = sole.attributes.position;
    add(sole, 5, null, (i) => {
      const f = THREE.MathUtils.smoothstep(-solePosition.getZ(i), 0.01, 0.12);
      return [
        [index(side + "Foot"), 1 - f],
        [index(side + "ToeBase"), f],
      ];
    });
    for (let k = 0; k < 5; k++)
      volume(
        [foot.x, 0.087 - k * 0.006, toe.z + 0.032 + k * 0.018],
        [0.061, 0.003, 0.004],
        1,
        side + "Foot",
      );
    // Rigged palm and individual finger joints use the source's actual bones.
    const hand = point(side + "Hand"),
      sign = side === "Left" ? -1 : 1;
    sphere([hand.x + sign * 0.042, hand.y, hand.z], [0.052, 0.023, 0.043], 4, side + "Hand");
    for (const finger of ["Thumb", "Index", "Middle", "Ring", "Pinky"]) {
      for (let k = 1; k <= 2; k++) {
        const a = side + "Hand" + finger + k,
          b = side + "Hand" + finger + (k + 1);
        if (index(a) >= 0 && index(b) >= 0)
          limb(a, b, finger === "Thumb" ? 0.011 : 0.008, finger === "Thumb" ? 0.009 : 0.006, 4);
      }
    }
  }
  const head = point("Head"),
    hx = head.x,
    hy = head.y + 0.105,
    hz = head.z;
  if (headSource) {
    materials[2].name = "Scanned skin";
    materials[2].color.set("#ffffff");
    const full = headSource.geometry.clone().applyMatrix4(headSource.matrixWorld).toNonIndexed();
    full.computeBoundingBox();
    // The scan includes a shoulder bust. Remove it below the neck, then use
    // actual head/ear width for scale rather than shrinking the whole bust.
    const cutoff = full.boundingBox.min.y + (full.boundingBox.max.y - full.boundingBox.min.y) * 0.3;
    const kept = [];
    for (let i = 0; i < full.attributes.position.count; i += 3)
      if ([0, 1, 2].every((k) => full.attributes.position.getY(i + k) >= cutoff))
        kept.push(i, i + 1, i + 2);
    const geometry = new THREE.BufferGeometry();
    for (const key of ["position", "normal", "uv"]) {
      const old = full.attributes[key];
      if (!old) continue;
      const data = [];
      for (const i of kept)
        for (let k = 0; k < old.itemSize; k++) data.push(old.array[i * old.itemSize + k]);
      geometry.setAttribute(key, new THREE.Float32BufferAttribute(data, old.itemSize));
    }
    full.dispose();
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox,
      centre = bounds.getCenter(new THREE.Vector3());
    const factor = 0.194 / (bounds.max.x - bounds.min.x);
    geometry.translate(-centre.x, -centre.y, -centre.z);
    geometry.scale(factor, factor, factor);
    geometry.rotateY(Math.PI);
    geometry.computeBoundingBox();
    geometry.translate(hx, head.y + 0.196 - geometry.boundingBox.max.y, hz - 0.012);
    const positions = geometry.attributes.position;
    add(geometry, 2, null, (i) => {
      const f = THREE.MathUtils.smoothstep(positions.getY(i), 1.54, 1.61);
      return [
        [index("Neck"), 1 - f],
        [index("Head"), f],
      ];
    });
  } else {
    sphere([hx, hy, hz], [0.084, 0.105, 0.085], 2, "Head");
    sphere([hx, hy - 0.06, hz - 0.008], [0.068, 0.051, 0.067], 2, "Head");
    sphere([hx, hy - 0.007, hz - 0.086], [0.012, 0.027, 0.021], 2, "Head");
    sphere([hx, hy - 0.028, hz - 0.088], [0.018, 0.011, 0.02], 2, "Head");
    for (const sign of [-1, 1]) {
      sphere([hx + sign * 0.082, hy - 0.005, hz], [0.014, 0.025, 0.011], 2, "Head");
      sphere([hx + sign * 0.028, hy + 0.014, hz - 0.077], [0.013, 0.0045, 0.004], 8, "Head");
      sphere([hx + sign * 0.028, hy + 0.014, hz - 0.081], [0.0035, 0.0035, 0.0012], 9, "Head");
      sphere([hx + sign * 0.041, hy - 0.019, hz - 0.068], [0.031, 0.021, 0.018], 2, "Head");
    }
    volume([hx, hy - 0.05, hz - 0.073], [0.031, 0.0035, 0.006], 2, "Head");
  }
  // A fitted collar/neck and shoulder caps close the joints of the tailored
  // uniform; arms never reveal an open tube when reaching or kneeling.
  if (!headSource) sphere([hx, 1.547, hz + 0.01], [0.045, 0.049, 0.046], 2, "Neck");
  // Sleeve heads blend into the chest rig; no exposed ball-shaped joint caps.
  const helmet = new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.61);
  helmet.scale(0.106, 0.118, 0.122);
  helmet.translate(hx, hy + 0.025, hz + 0.007);
  add(helmet, 3, "Head");
  for (const sign of [-1, 1]) {
    volume([hx + sign * 0.102, hy + 0.028, hz], [0.009, 0.018, 0.084], 6, "Head");
    volume([hx + sign * 0.082, hy - 0.014, hz], [0.019, 0.047, 0.027], 4, "Head");
    // Separate glass lens and gasket; smaller than the exposed face.
    volume([hx + sign * 0.037, hy - 0.012, hz - 0.087], [0.067, 0.031, 0.009], 4, "Head");
    volume([hx + sign * 0.037, hy - 0.012, hz - 0.093], [0.057, 0.022, 0.003], 7, "Head");
  }
  volume([hx, hy - 0.014, hz - 0.09], [0.016, 0.012, 0.013], 4, "Head");
  // A compact radio is separate equipment, not a painted chest rectangle.
  volume([-0.119, 1.425, -0.17], [0.041, 0.082, 0.023], 4, "Spine2");
  volume([-0.117, 1.488, -0.171], [0.004, 0.08, 0.004], 4, "Spine2");
  for (const mesh of old) mesh.removeFromParent();
  skeleton.calculateInverses();
  const ordered = [],
    used = [];
  for (const [material, geometries] of parts) {
    ordered.push(mergeGeometries(geometries, false));
    used.push(materials[material]);
    for (const g of geometries) g.dispose();
  }
  const merged = mergeGeometries(ordered, true);
  for (const g of ordered) g.dispose();
  // Share identical indexed vertices without erasing UV seams, normals or
  // skin weights. Detailed heads need not repeat a vertex for every triangle.
  const geometry = mergeVertices(merged, 1e-5);
  merged.dispose();
  const mesh = new THREE.SkinnedMesh(geometry, used);
  mesh.name = "FieldOperator / fabric skin equipment";
  model.add(mesh);
  model.updateMatrixWorld(true);
  mesh.bind(skeleton);
  mesh.normalizeSkinWeights();
  model.userData.originalOperator = true;
  return gltf;
}
