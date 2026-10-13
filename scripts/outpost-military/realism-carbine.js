/** Actual receiver, curved magazine, sights and independently moving hardware. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
const smooth = (x) => {
  x = THREE.MathUtils.clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};
const phase = (x, a, b) => smooth((x - a) / (b - a));

export function buildCarbine(r, parent, m, hands = true) {
  m.polymer.color.set("#343b34");
  m.metal.color.set("#343c3d");
  m.metal.metalness = 0.3;
  m.metal.roughness = 0.54;
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
  let supportHand;
  if (hands) {
    r.hand(gun, 0.032, -0.105, -0.442, m);
    supportHand = r.hand(gun, -0.044, -0.056, -0.757, m);
    supportHand.userData.weaponMoving = true;
  }
  const parts = { magazine, bolt, handle, supportHand };
  gun.userData.carbineParts = parts;
  parent.userData.carbine = gun;
  return gun;
}

export function animateCarbine(gun, reload, recoil) {
  const parts = gun?.userData.carbineParts;
  if (!parts) return;
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
