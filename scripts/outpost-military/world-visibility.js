import * as THREE from "three";

/** Conservative visibility of the collision grid. Rays keep the first wall,
 * neighbours preserve door frames and contact shadows, and windows stay open.
 * This is presentation only; it never changes the map or network simulation. */
export function visibleWorldCells(level, x, y, angle, fov, transparent = () => false) {
  const cells = new Set(),
    size = level.length;
  const mark = (cx, cy) => {
    if (cx >= 0 && cy >= 0 && cy < size && cx < level[cy].length) cells.add(cy * size + cx);
  };
  const rays = Math.ceil(size * 6);
  for (let i = 0; i <= rays; i++) {
    const a = angle - fov / 2 + (fov * i) / rays;
    const dx = Math.cos(a),
      dy = Math.sin(a);
    let cx = Math.floor(x),
      cy = Math.floor(y);
    const sx = dx < 0 ? -1 : 1,
      sy = dy < 0 ? -1 : 1;
    const stepX = Math.abs(1 / dx),
      stepY = Math.abs(1 / dy);
    let tx = (dx < 0 ? x - cx : cx + 1 - x) * stepX;
    let ty = (dy < 0 ? y - cy : cy + 1 - y) * stepY;
    for (let j = 0; j < size * 3; j++) {
      if (!level[cy] || cx < 0 || cx >= level[cy].length) break;
      mark(cx, cy);
      if (level[cy][cx] && !transparent(cx, cy)) break;
      if (tx < ty) {
        cx += sx;
        tx += stepX;
      } else {
        cy += sy;
        ty += stepY;
      }
    }
  }
  // Expand from the original set, rather than recursively spreading visibility.
  for (const key of [...cells]) {
    const cy = Math.floor(key / size),
      cx = key % size;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) mark(cx + ox, cy + oy);
  }
  for (let oy = -2; oy <= 2; oy++)
    for (let ox = -2; ox <= 2; ox++) mark(Math.floor(x) + ox, Math.floor(y) + oy);
  return cells;
}

export class WorldVisibility {
  constructor(renderer) {
    this.r = renderer;
    this.entries = [];
    this.dirty = true;
  }
  reset() {
    this.entries = [];
    this.dirty = true;
    this.last = null;
  }
  rebuild() {
    const r = this.r,
      size = r.g.level.length;
    // Restore our flags before measuring bounds. Dynamic parent visibility
    // (supply stock, arrival state) remains owned by the mission presentation.
    for (const entry of this.entries) if (entry.hidden) entry.mesh.layers.enable(0);
    this.entries = [];
    r.world.updateMatrixWorld(true);
    r.world.traverse((mesh) => {
      if (
        !mesh.isMesh ||
        mesh.isSkinnedMesh ||
        mesh.userData.noBatch ||
        mesh.userData.noRoomCull ||
        !mesh.visible
      )
        return;
      if (!mesh.layers.isEnabled(0)) return;
      if (mesh.isInstancedMesh) {
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
      } else if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const local = mesh.isInstancedMesh ? mesh.boundingBox : mesh.geometry.boundingBox;
      if (!local) return;
      const box = local.clone().applyMatrix4(mesh.matrixWorld);
      // Exterior terrain, reflections and radar towers must retain their sky
      // silhouette. Large continuous floor slabs stay under ordinary frustum culling.
      if (
        box.min.x < 0 ||
        box.min.z < 0 ||
        box.max.x > size * 3 ||
        box.max.z > size * 3 ||
        box.max.y > 3.8
      )
        return;
      const x0 = Math.max(0, Math.floor(box.min.x / 3 - 0.05));
      const y0 = Math.max(0, Math.floor(box.min.z / 3 - 0.05));
      const x1 = Math.min(size - 1, Math.floor(box.max.x / 3 + 0.05));
      const y1 = Math.min(size - 1, Math.floor(box.max.z / 3 + 0.05));
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 70) return;
      this.entries.push({ mesh, x0, y0, x1, y1, hidden: false });
    });
    this.dirty = false;
    this.last = null;
  }
  update(p, pitch, now) {
    const r = this.r;
    if (!["breakwater", "medevac"].includes(r.g.arena.mapId)) return;
    if (this.dirty) this.rebuild();
    if (
      this.last &&
      now - this.last.at < 100 &&
      Math.hypot(p.x - this.last.x, p.y - this.last.y) < 0.15 &&
      Math.abs(Math.atan2(Math.sin(p.a - this.last.a), Math.cos(p.a - this.last.a))) < 0.055 &&
      Math.abs(pitch - this.last.pitch) < 0.1
    )
      return;
    this.last = { x: p.x, y: p.y, a: p.a, pitch, at: now };
    // Keep hidden-room casters in the sun's shadow pass. Removing .visible
    // would make an unseen roof stop casting a visible courtyard shadow.
    // Main camera/reflections retain layer 0. The renderer includes layer 1
    // temporarily during Three's shadow pass, then restores the camera mask.
    const vertical = THREE.MathUtils.degToRad(r.camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * r.camera.aspect);
    const cells = visibleWorldCells(
      r.g.level,
      p.x,
      p.y,
      p.a,
      Math.abs(pitch) > 0.65 ? Math.PI * 2 : Math.min(Math.PI * 2, horizontal + 0.8),
      (x, y) =>
        r.protocolPropTile(x, y) || r.transportWindowTile(x, y) || r.transportHiddenWall(x, y),
    );
    let visible = 0;
    for (const entry of this.entries) {
      let show = false;
      for (let y = entry.y0; y <= entry.y1 && !show; y++)
        for (let x = entry.x0; x <= entry.x1; x++)
          if (cells.has(y * r.g.level.length + x)) {
            show = true;
            break;
          }
      // Parent visibility and dynamic stock visibility remain untouched.
      entry.mesh.layers.enable(1);
      if (show && entry.hidden) entry.mesh.layers.enable(0);
      if (!show && entry.mesh.layers.isEnabled(0)) {
        entry.mesh.layers.disable(0);
        entry.hidden = true;
      } else if (show) entry.hidden = false;
      if (show) visible++;
    }
    r.worldStats = { worldVisible: visible, worldCulled: this.entries.length - visible };
  }
}
