/** The Lifeline Medevac: "Rescue Helicopter (low poly)" by blueskinrulez
 * (CC-BY 4.0, see ATTRIBUTION.md), repainted as an olive-drab medical
 * aircraft with red-cross markings. The rotor sits on its own pivot so the
 * renderer can spin it. Presentation only: the aircraft stays inside the
 * map's blocked vehicle footprint and never changes collision. */
import * as THREE from "three";

/** Overall length in world units, matching the previous placeholder. */
const LENGTH = 7.6;

const roleOf = (mesh) => {
  const material = mesh.material?.name || "";
  if (/Cylinder\.?004/.test(mesh.name) || /Cylinder\.?004/.test(mesh.parent?.parent?.name || "")) return "hub";
  if (material === "Material.004") return "blade";
  if (material === "Material.002") return "glass";
  if (material === "Material.001") return "skid";
  if (material === "Material.005") return "trim";
  return "body";
};

/** Bake the glTF into model-space parts: centred, resting on the floor and
 * scaled to the aircraft footprint. */
export function prepareMedevac(gltf) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const parts = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
    parts.push({ geometry, role: roleOf(o) });
  });
  const box = new THREE.Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    box.union(part.geometry.boundingBox);
  }
  const size = box.getSize(new THREE.Vector3()),
    centre = box.getCenter(new THREE.Vector3()),
    scale = LENGTH / Math.max(size.z, size.x);
  const fit = new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z));
  const rotorBox = new THREE.Box3(),
    bodyBox = new THREE.Box3();
  for (const part of parts) {
    part.geometry.applyMatrix4(fit);
    part.geometry.computeBoundingBox();
    part.geometry.computeVertexNormals();
    if (part.role === "blade" || part.role === "hub") rotorBox.union(part.geometry.boundingBox);
    if (part.role === "body") bodyBox.union(part.geometry.boundingBox);
  }
  const rotor = rotorBox.getCenter(new THREE.Vector3());
  rotor.y = rotorBox.max.y;
  // Gltf materials are replaced in-game.
  scene.traverse((o) => o.isMesh && o.material?.dispose?.());
  return { parts, rotor, body: bodyBox };
}

function crossTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#f1efe8";
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c8221c";
  g.fillRect(100, 40, 56, 176);
  g.fillRect(40, 100, 176, 56);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Build the aircraft into `root`; returns the rotor pivot to spin. */
export function buildMedevac(r, root, kit) {
  const mat = {
    body: r.protocolMaterial({ color: "#4b5443", roughness: 0.62, metalness: 0.25 }),
    trim: r.protocolMaterial({ color: "#3a4136", roughness: 0.55, metalness: 0.35 }),
    skid: r.protocolMaterial({ color: "#26292a", roughness: 0.45, metalness: 0.7 }),
    blade: r.protocolMaterial({ color: "#1d1f1f", roughness: 0.5, metalness: 0.4 }),
    hub: r.protocolMaterial({ color: "#2b2e2d", roughness: 0.4, metalness: 0.75 }),
    glass: r.protocolMaterial({ color: "#1b2a31", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82 }),
  };
  const pivot = new THREE.Group();
  pivot.position.copy(kit.rotor);
  root.add(pivot);
  for (const part of kit.parts) {
    const mesh = new THREE.Mesh(part.geometry, mat[part.role] || mat.body);
    mesh.castShadow = part.role !== "glass";
    mesh.receiveShadow = true;
    if (part.role === "blade" || part.role === "hub") {
      mesh.position.copy(kit.rotor).negate();
      mesh.userData.noBatch = true;
      pivot.add(mesh);
    } else root.add(mesh);
  }
  // Medical markings on both cabin sides and the belly-facing nose.
  r.medevacCross ||= crossTexture();
  const cross = new THREE.MeshStandardMaterial({ map: r.medevacCross, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
  const decal = r.geo("medevac-cross", () => new THREE.PlaneGeometry(0.95, 0.95));
  const b = kit.body,
    z = b.min.z + (b.max.z - b.min.z) * 0.5,
    y = b.min.y + (b.max.y - b.min.y) * 0.5;
  for (const side of [-1, 1]) {
    const mark = new THREE.Mesh(decal, cross);
    mark.position.set(side * (b.max.x + 0.02), y, z);
    mark.rotation.y = side * Math.PI / 2;
    mark.userData.noBatch = true;
    root.add(mark);
  }
  return pivot;
}
