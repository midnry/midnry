/** Fit the pinned SWAT source's existing goggles to the eyes, before LODs.
 * This is an offline mesh edit: textures, skinning and runtime cost stay intact.
 */
import { MathUtils } from 'three';

export function fitOperatorGoggles(model) {
  const mesh = model.getObjectByName('Soldier_head_1');
  if (!mesh?.isSkinnedMesh) throw new Error('Missing source helmet for goggle fitting');
  if (mesh.userData.gogglesPosition === 'eyes') return;
  const geometry = mesh.geometry, position = geometry.attributes.position;
  const normal = geometry.attributes.normal, indices = geometry.index.array;
  const parents = Array.from({ length: position.count }, (_, i) => i);
  const find = i => parents[i] === i ? i : parents[i] = find(parents[i]);
  const join = (a, b) => { parents[find(a)] = find(b); };
  for (let i = 0; i < indices.length; i += 3) {
    join(indices[i], indices[i + 1]); join(indices[i], indices[i + 2]);
  }
  // Keep UV islands separate here. Welding coincident seam vertices would
  // join the elastic band to the helmet shell, moving the helmet with it.
  const islands = new Map();
  for (let i = 0; i < position.count; i++) {
    const id = find(i);
    if (!islands.has(id)) islands.set(id, []);
    islands.get(id).push(i);
  }
  const eyewear = [...islands.values()].filter(part => part.every(i => position.getY(i) > 1.67)
    // Two small helmet mounting panels close the shell beneath the strap.
    // Keep those in place; they are not part of the movable eyewear.
    && !(part.length === 8 && part.some(i => Math.abs(position.getX(i)) < .08)));
  const vertices = eyewear.flat();
  if (vertices.length !== 408) throw new Error('Source eyewear topology changed; refit goggles before building');
  const band = new Set(eyewear.filter(part => part.some(i => position.getZ(i) < -.1)).flat());
  const angle = .8, scale = .9, c = Math.cos(angle), s = Math.sin(angle);
  for (const i of vertices) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const dy = (y - 1.731) * scale, dz = (z - .075) * scale;
    // Preserve the band's rear anchor and lower its front onto the buckles.
    // The rigid frame seats its nose recess above the bridge of the nose.
    const weight = band.has(i) ? MathUtils.smoothstep(z, .005, .032) : 1;
    position.setXYZ(i, MathUtils.lerp(x, x * scale, weight),
      MathUtils.lerp(y, 1.653 + c * dy - s * dz, weight),
      MathUtils.lerp(z, .104 + s * dy + c * dz, weight));
    const ny = normal.getY(i), nz = normal.getZ(i);
    normal.setXYZ(i, normal.getX(i), c * ny - s * nz, s * ny + c * nz);
  }
  // Only the flexible band's normals need rebuilding; retain the sculpted
  // shell/frame normals and hard edges everywhere else.
  const shaped = geometry.clone(); shaped.computeVertexNormals();
  for (const i of band) normal.copyAt(i, shaped.attributes.normal, i);
  shaped.dispose();
  position.needsUpdate = normal.needsUpdate = true;
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  mesh.userData.gogglesPosition = 'eyes';
}
