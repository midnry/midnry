import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Bake stationary fixture parts sharing a material into spatial batches.
 * Unlike geometry-only instancing, this also combines differently sized trims
 * and pipes. Photographic UVs, normals and each part's transform are retained.
 * Animated props, transparent glass and dynamic screens keep their own meshes. */
export function batchStaticByMaterial(root, tiles = 6) {
  root.updateMatrixWorld(true);
  const groups = new Map(),
    inverse = root.matrixWorld.clone().invert();
  root.traverse((object) => {
    if (
      !object.isMesh ||
      object.isSkinnedMesh ||
      object.isInstancedMesh ||
      object.userData.noBatch ||
      !object.visible ||
      Array.isArray(object.material) ||
      object.material.transparent ||
      Object.keys(object.geometry.morphAttributes).length ||
      object.matrixWorld.determinant() < 0
    )
      return;
    const p = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
    const signature =
      `${!!object.geometry.index}:` +
      Object.entries(object.geometry.attributes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, a]) => `${k}/${a.itemSize}/${a.normalized}/${a.array.constructor.name}`)
        .join(",");
    const key = `${object.material.uuid}:${Math.floor(p.x / (tiles * 3))}:${Math.floor(p.z / (tiles * 3))}:${object.castShadow}:${object.receiveShadow}:${!!object.userData.noRoomCull}:${object.frustumCulled}:${signature}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(object);
  });
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    // Most trims share the unit-box geometry. Preserve hardware instancing
    // for those parts instead of allocating duplicate vertex buffers.
    if (meshes.every((mesh) => mesh.geometry === meshes[0].geometry)) {
      const batch = new THREE.InstancedMesh(meshes[0].geometry, meshes[0].material, meshes.length);
      batch.castShadow = meshes[0].castShadow;
      batch.receiveShadow = meshes[0].receiveShadow;
      batch.userData.noRoomCull = !!meshes[0].userData.noRoomCull;
      batch.frustumCulled = meshes[0].frustumCulled;
      meshes.forEach((mesh, i) => {
        batch.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
        mesh.parent.remove(mesh);
      });
      batch.computeBoundingBox();
      batch.computeBoundingSphere();
      root.add(batch);
      continue;
    }
    const parts = meshes.map((mesh) =>
      mesh.geometry
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)),
    );
    const geometry = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const batch = new THREE.Mesh(geometry, meshes[0].material);
    batch.castShadow = meshes[0].castShadow;
    batch.receiveShadow = meshes[0].receiveShadow;
    batch.userData.noRoomCull = !!meshes[0].userData.noRoomCull;
    batch.frustumCulled = meshes[0].frustumCulled;
    batch.userData.ownedGeometry = true;
    for (const mesh of meshes) mesh.parent.remove(mesh);
    root.add(batch);
  }
}
