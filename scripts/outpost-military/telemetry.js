/** Nonblocking GPU timings. Unsupported/disjoint readings are omitted. No
 * gl.finish, readPixels or synchronous fences in the gameplay frame loop. */
export class RenderTelemetry {
  constructor(renderer) {
    this.renderer = renderer;
    this.gl = renderer.getContext();
    this.ext = this.gl.getExtension("EXT_disjoint_timer_query_webgl2");
    this.pending = [];
    this.frame = 0;
    this.gpuMs = null;
    renderer.info.autoReset = false;
  }
  begin() {
    const gl = this.gl,
      ext = this.ext;
    if (!ext) return;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    while (
      this.pending.length &&
      (disjoint || gl.getQueryParameter(this.pending[0], gl.QUERY_RESULT_AVAILABLE))
    ) {
      const q = this.pending.shift();
      if (!disjoint) {
        const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        if (Number.isFinite(ms) && ms >= 0)
          this.gpuMs = this.gpuMs === null ? ms : this.gpuMs * 0.8 + ms * 0.2;
      }
      gl.deleteQuery(q);
    }
    if (disjoint) this.gpuMs = null;
    if (++this.frame % 4 || this.pending.length >= 8) return;
    this.active = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, this.active);
  }
  end() {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }
  dispose() {
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.active);
    }
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending = [];
  }
}

/** Conservative silhouette test prevents corner-peeking pop-in. Simulation
 * and recipient privacy are never changed by visibility or detail budgets. */
export function actorInView(arena, camera, entity, horizontalFov) {
  const distance = Math.hypot(entity.x - camera.x, entity.y - camera.y);
  if (distance < 0.65) return true;
  const angle = Math.atan2(entity.y - camera.y, entity.x - camera.x) - camera.a;
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
  if (Math.abs(wrapped) > horizontalFov / 2 + Math.atan2(0.35, distance)) return false;
  if (arena.visible(camera, entity)) return true;
  const dx = -Math.sin(camera.a) * 0.22,
    dy = Math.cos(camera.a) * 0.22;
  return (
    arena.visible(camera, { x: entity.x + dx, y: entity.y + dy }) ||
    arena.visible(camera, { x: entity.x - dx, y: entity.y - dy })
  );
}
