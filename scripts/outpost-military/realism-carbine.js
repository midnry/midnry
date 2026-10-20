/** Actual receiver, curved magazine, sights and independently moving hardware. */
import * as THREE from "three";
import {updateRiggedHand} from './realism-hands.js';
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
const smooth = (x) => {
  x = THREE.MathUtils.clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};
const phase = (x, a, b) => smooth((x - a) / (b - a));

/** Modelled weapons (models/weapons-v2.glb, scripts/assets/kit-weapons.py):
 * { carbine: { body: [{ geometry, material }], magazine: […], … } }, from
 * nodes named <weapon>--<part>. Each
 * geometry is in the weapon rig's space; baked occlusion is softened. */
export function prepareWeaponKit(gltf) {
  const kit = {};
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    let top = o;
    while (top.parent && top.parent !== gltf.scene) top = top.parent;
    const [weapon, part] = top.name.split("--");
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const ao = geometry.getAttribute("color");
    if (ao)
      for (let i = 0; i < ao.count; i++) {
        const v = 0.5 + 0.5 * ao.getX(i);
        ao.setXYZ(i, v, v, v);
      }
    ((kit[weapon] ||= {})[part] ||= []).push({ geometry, material: o.material.name });
  });
  return kit;
}

/** Weapon finishes for modelled parts: the shared weapon materials, with
 * the model's baked occlusion. */
function kitMaterials(r, m, hands) {
  const withAO = (base) => {
    const c = base.clone();
    c.vertexColors = true;
    c.userData.weapon = hands;
    r.materials.add(c);
    return c;
  };
  const glass = r.material({
    color: "#5f7a80",
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    envMapIntensity: 1.2,
  });
  glass.userData.weapon = hands;
  const reticle = r.material({ color: "#ff3a2a", emissive: "#ff2010", emissiveIntensity: 3 });
  reticle.userData.weapon = hands;
  // Cerakote is a smooth ceramic coat: keep the photographed roughness and
  // fine relief, but not the grimy colour photo, which reads as stone.
  const cerakote = withAO(m.metal);
  cerakote.map = null;
  cerakote.color.set("#222624");
  cerakote.roughness = 0.75;
  cerakote.needsUpdate = true;
  return {
    cerakote,
    polymer: withAO(m.polymer),
    steel: withAO(m.steel),
    rubber: withAO(m.rubber),
    glass,
    reticle,
    shell: r.material({ color: "#9b2b22", roughness: 0.45, metalness: 0 }),
    brass: r.material({ color: "#b8924a", roughness: 0.3, metalness: 1 }),
  };
}

function addKitPart(root, parts, materials, offset) {
  for (const { geometry, material } of parts || []) {
    const mesh = new THREE.Mesh(geometry, materials[material] || materials.cerakote);
    // Already one mesh per finish, with baked shading the batcher would drop.
    mesh.userData.modelled = true;
    if (offset) mesh.position.copy(offset).negate();
    mesh.castShadow = mesh.receiveShadow = material !== "glass" && material !== "reticle";
    root.add(mesh);
  }
}

function buildModelledCarbine(r, parent, m, hands, kit) {
  const gun = new THREE.Group();
  gun.name = "VX-7 / modelled field carbine";
  parent.add(gun);
  const materials = kitMaterials(r, m, hands);
  addKitPart(gun, kit.body, materials);
  addKitPart(gun, kit.glass, materials);
  const magazine = new THREE.Group();
  magazine.name = "Removable curved magazine";
  magazine.userData.weaponMoving = true;
  magazine.position.set(0, -0.067, -0.568);
  gun.add(magazine);
  addKitPart(magazine, kit.magazine, materials, magazine.position);
  const bolt = new THREE.Group();
  bolt.userData.weaponMoving = true;
  gun.add(bolt);
  addKitPart(bolt, kit.bolt, materials);
  const handle = new THREE.Group();
  handle.userData.weaponMoving = true;
  gun.add(handle);
  addKitPart(handle, kit.handle, materials);
  let supportHand, firingHand;
  if (hands) {
    firingHand = r.hand(gun, 0.032, -0.105, -0.442, m);
    firingHand.userData.weaponMoving = true;
    supportHand = r.hand(gun, -0.044, -0.056, -0.757, m);
    supportHand.userData.weaponMoving = true;
  }
  gun.userData.carbineParts = { magazine, bolt, handle, supportHand, firingHand };
  parent.userData.carbine = gun;
  return gun;
}

/** Pump shotgun (Sunburst, Gatebreaker): the pump racks after each shot;
 * Gatebreaker carries a toothed breaching muzzle. */
export function buildModelledShotgun(r, parent, m, hands, breacher) {
  const kit = r.weaponKit.shotgun,
    materials = kitMaterials(r, m, hands);
  for (const k of ["shell", "brass"]) materials[k].userData.weapon = hands;
  const gun = new THREE.Group();
  gun.name = "Pump shotgun";
  parent.add(gun);
  addKitPart(gun, kit.body, materials);
  if (breacher) addKitPart(gun, kit.breacher, materials);
  const pump = new THREE.Group();
  pump.userData.weaponMoving = true;
  gun.add(pump);
  addKitPart(pump, kit.pump, materials);
  let supportHand, firingHand;
  if (hands) {
    firingHand = r.hand(gun, 0.032, -0.105, -0.442, m);
    firingHand.userData.weaponMoving = true;
    // The support hand rides on the pump.
    supportHand = r.hand(pump, -0.044, -0.056, -0.757, m);
    supportHand.userData.weaponMoving = true;
  }
  gun.userData.carbineParts = { pump, supportHand, firingHand };
  parent.userData.carbine = gun;
  return gun;
}

/** Twinwire: a pair of striker pistols whose slides kick back on each shot. */
export function buildModelledPistols(r, parent, m, hands) {
  const kit = r.weaponKit.pistol,
    materials = kitMaterials(r, m, hands);
  const pair = new THREE.Group();
  pair.name = "Paired pistols";
  parent.add(pair);
  const slides = [],
    grips = [];
  for (const x of [-0.19, 0.19]) {
    const pistol = new THREE.Group();
    // Held at arm's length, a little forward of the old pistol boxes.
    pistol.position.set(x, -0.02, -0.12);
    pistol.scale.setScalar(0.9);
    // Muzzles converge on the crosshair and the guns roll outward a little,
    // so each pistol shows its outer flank instead of its back.
    pistol.rotation.set(0, Math.sign(x) * 0.2, -Math.sign(x) * 0.22);
    pair.add(pistol);
    addKitPart(pistol, kit.frame, materials);
    const slide = new THREE.Group();
    slide.userData.weaponMoving = true;
    pistol.add(slide);
    addKitPart(slide, kit.slide, materials);
    slides.push(slide);
    if (hands) {
      const hand = r.hand(pistol, 0.025, -0.1, -0.45, m);
      hand.userData.weaponMoving = true;
      grips.push(hand);
    }
  }
  pair.userData.carbineParts = { slides, grips };
  parent.userData.carbine = pair;
  return pair;
}

export function buildCarbine(r, parent, m, hands = true) {
  m.polymer.color.set("#343b34");
  m.metal.color.set("#343c3d");
  m.metal.metalness = 0.3;
  // Photographed roughness modulates this coating; its dark substrate must
  // not turn the whole receiver into polished metal.
  m.metal.roughness = 0.9;
  if (r.weaponKit?.carbine) return buildModelledCarbine(r, parent, m, hands, r.weaponKit.carbine);
  const gun = new THREE.Group();
  gun.name = "VX-7 / machined field carbine";
  parent.add(gun);
  const rounded = (root, material, pos, size, key = "carbine:receiver") =>
    r.mesh(
      root,
      r.geo(key, () => new RoundedBoxGeometry(1, 1, 1, 2, 0.055)),
      material,
      pos,
      size,
    );
  rounded(gun, m.metal, [0, 0.006, -0.512], [0.061, 0.068, 0.238]);
  rounded(gun, m.metal, [0, -0.035, -0.499], [0.059, 0.062, 0.192]);
  rounded(gun, m.polymer, [0, -0.01, -0.275], [0.045, 0.055, 0.192]);
  rounded(gun, m.rubber, [0, -0.004, -0.174], [0.056, 0.124, 0.021]);
  r.cylinder(gun, m.steel, [0, 0.021, -0.37], 0.012, 0.16, "z", 24);
  const grip = rounded(gun, m.polymer, [0, -0.109, -0.446], [0.035, 0.13, 0.061]);
  grip.rotation.x = -0.25;
  // Guard and visible trigger have distinct volumes, with an open finger space.
  const guard = r.mesh(
    gun,
    r.geo("carbine:trigger-guard", () => new THREE.TorusGeometry(0.022, 0.003, 8, 28)),
    m.metal,
    [0, -0.069, -0.485],
    [1, 0.72, 1],
  );
  guard.rotation.y = Math.PI / 2;
  r.cylinder(gun, m.steel, [0, -0.064, -0.476], 0.0025, 0.021, "y", 12).rotation.x = -0.22;
  rounded(gun, m.polymer, [0, 0.013, -0.744], [0.063, 0.064, 0.229]);
  for (let i = 0; i < 7; i++)
    for (const sign of [-1, 1])
      rounded(gun, m.rubber, [sign * 0.032, 0.008, -0.655 - i * 0.027], [0.001, 0.022, 0.017]);
  for (let i = 0; i < 20; i++)
    rounded(gun, m.metal, [0, 0.055, -0.419 - i * 0.022], [0.047, 0.006, 0.009]);
  r.cylinder(gun, m.steel, [0, 0.019, -0.93], 0.01, 0.177, "z", 24);
  r.cylinder(gun, m.metal, [0, 0.019, -1.029], 0.017, 0.033, "z", 24);
  r.cylinder(gun, m.rubber, [0, 0.019, -1.047], 0.008, 0.002, "z", 20);
  // Folding front sight, rear aperture and separate coated optic glass.
  rounded(gun, m.metal, [0, 0.09, -0.878], [0.025, 0.066, 0.022]);
  r.box(gun, m.steel, [0, 0.127, -0.878], [0.003, 0.009, 0.003]);
  for (const x of [-0.025, 0.025]) rounded(gun, m.metal, [x, 0.105, -0.512], [0.012, 0.071, 0.034]);
  rounded(gun, m.metal, [0, 0.14, -0.512], [0.065, 0.011, 0.035]);
  rounded(gun, m.metal, [0, 0.066, -0.512], [0.06, 0.013, 0.049]);
  const glass = r.material({
    color: "#728c8c",
    metalness: 0,
    roughness: 0.08,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    envMapIntensity: 1,
  });
  glass.userData.weapon = hands;
  r.mesh(
    gun,
    r.geo("carbine:optic-pane", () => new THREE.PlaneGeometry(0.043, 0.049)),
    glass,
    [0, 0.108, -0.523],
  );
  const magazine = new THREE.Group();
  magazine.name = "Removable curved magazine";
  magazine.userData.weaponMoving = true;
  magazine.position.set(0, -0.067, -0.568);
  gun.add(magazine);
  const geo = r.geo("carbine:curved-magazine", () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.03, 0);
    shape.lineTo(0.028, 0);
    shape.quadraticCurveTo(0.05, -0.1, 0.084, -0.2);
    shape.lineTo(0.018, -0.202);
    shape.quadraticCurveTo(-0.01, -0.105, -0.03, 0);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.037,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 12,
    });
    g.rotateY(-Math.PI / 2);
    g.translate(0.0185, 0, 0);
    return g;
  });
  r.mesh(magazine, geo, m.metal);
  for (const x of [-0.02, 0.02])
    for (let i = 0; i < 3; i++)
      rounded(
        magazine,
        m.rubber,
        [x, -0.052 - i * 0.044, 0.014 + i * 0.014],
        [0.0015, 0.033, 0.014],
      );
  rounded(magazine, m.rubber, [0, -0.205, 0.051], [0.043, 0.009, 0.068]);
  const bolt = new THREE.Group();
  bolt.userData.weaponMoving = true;
  gun.add(bolt);
  rounded(bolt, m.steel, [0.031, 0.009, -0.498], [0.0019, 0.016, 0.075]);
  rounded(gun, m.rubber, [0.031, 0.012, -0.498], [0.001, 0.022, 0.081]);
  const handle = new THREE.Group();
  handle.userData.weaponMoving = true;
  gun.add(handle);
  rounded(handle, m.metal, [-0.028, 0.04, -0.421], [0.047, 0.009, 0.014]);
  let supportHand, firingHand;
  if (hands) {
    firingHand=r.hand(gun, 0.032, -0.105, -0.442, m);
    firingHand.userData.weaponMoving=true;
    supportHand = r.hand(gun, -0.044, -0.056, -0.757, m);
    supportHand.userData.weaponMoving = true;
  }
  const parts = { magazine, bolt, handle, supportHand, firingHand };
  gun.userData.carbineParts = parts;
  parent.userData.carbine = gun;
  return gun;
}

export function animateCarbine(gun, reload, recoil) {
  const parts = gun?.userData.carbineParts;
  if (!parts) return;
  const time=performance.now()/1000;
  updateRiggedHand(parts.firingHand,reload,time);
  updateRiggedHand(parts.supportHand,reload,time);
  for (const hand of parts.grips || []) updateRiggedHand(hand, reload, time);
  // Shotgun: rack the pump back and forward as the recoil settles.
  if (parts.pump) parts.pump.position.z = Math.sin(recoil * Math.PI) * 0.075;
  // Pistols: the slides kick back with the shot.
  for (const slide of parts.slides || []) slide.position.z = recoil * 0.035;
  if (!parts.magazine) return;
  const t = 1 - reload,
    remove = reload > 0 ? phase(t, 0.12, 0.4) * (1 - phase(t, 0.61, 0.82)) : 0;
  parts.magazine.position.y = -0.067 - remove * 0.24;
  parts.magazine.position.x = -remove * 0.065;
  parts.magazine.rotation.z = -remove * 0.2;
  parts.magazine.visible = !(reload > 0 && t > 0.42 && t < 0.6);
  const cycle = reload > 0 ? Math.sin(phase(t, 0.84, 0.99) * Math.PI) : 0;
  parts.bolt.position.z = recoil * 0.024 + cycle * 0.03;
  parts.handle.position.z = cycle * 0.055;
  if (parts.supportHand) {
    parts.supportHand.position.set(
      -0.044 - remove * 0.055,
      -0.056 - remove * 0.14,
      -0.757 + remove * 0.18,
    );
    parts.supportHand.rotation.x = remove * 0.25;
  }
}
