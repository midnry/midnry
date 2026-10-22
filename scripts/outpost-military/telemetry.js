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

/** Is the line from (x0, y0) to (x1, y1) free of view-blocking wall tiles?
 * Grid DDA in tile units, with no range cap (the simulation's cast stops at
 * 32 tiles, which hid rivals across the 36-tile Skyport). */
export function clearSightLine(level, x0, y0, x1, y1, seeThrough = () => false) {
  const dx = x1 - x0,
    dy = y1 - y0,
    d = Math.hypot(dx, dy);
  if (d < 1e-6) return true;
  const ux = dx / d,
    uy = dy / d;
  let mx = Math.floor(x0),
    my = Math.floor(y0);
  const blocks = (x, y) => {
    const v = level[y]?.[x];
    return v === undefined || (!!v && !seeThrough(x, y));
  };
  if (blocks(mx, my)) return false;
  const ddx = Math.abs(1 / (ux || 1e-12)),
    ddy = Math.abs(1 / (uy || 1e-12)),
    sx = ux < 0 ? -1 : 1,
    sy = uy < 0 ? -1 : 1;
  let tx = (ux < 0 ? x0 - mx : mx + 1 - x0) * ddx,
    ty = (uy < 0 ? y0 - my : my + 1 - y0) * ddy;
  for (let i = 0; i < 4096; i++) {
    let t;
    if (tx < ty) {
      mx += sx;
      t = tx;
      tx += ddx;
    } else {
      my += sy;
      t = ty;
      ty += ddy;
    }
    if (t >= d) return true;
    if (blocks(mx, my)) return false;
  }
  return true;
}

/** Actor culling sphere (metres): centred at mid-body, it covers a standing
 * operator's head and feet, a prone body's length and the rifle muzzle. */
export const ACTOR_SPHERE_HEIGHT = 0.9,
  ACTOR_SPHERE_RADIUS = 1.3;

/** Character half-width used for silhouette rays (tiles; 1 tile = 3 m),
 * generous enough to cover a shoulder, an outstretched rifle and a lean. */
export const ACTOR_HALF_WIDTH = 0.3;

/** Presentation-only actor culling. An actor is skipped only when its body
 * sphere is outside the camera frustum (`inFrustum`, from three's
 * Frustum.intersectsSphere) or every line from the eye (and a small head
 * offset) to its body (centre and both sides) is blocked by a full-height
 * wall. Crates, sandbags, canisters and furniture (`seeThrough`) are lower
 * than eye height and never hide a body: the depth buffer handles them.
 * Simulation and recipient privacy are never changed by this test. */
export function actorInView(arena, camera, entity, inFrustum, seeThrough = () => false) {
  if (!inFrustum) return false;
  const distance = Math.hypot(entity.x - camera.x, entity.y - camera.y);
  if (distance < 0.65) return true;
  const level = arena.level;
  if (!level) return true;
  // Perpendicular to the line of sight.
  const px = -(entity.y - camera.y) / distance,
    py = (entity.x - camera.x) / distance;
  for (const eye of [0, -0.12, 0.12])
    for (const side of [0, -ACTOR_HALF_WIDTH, ACTOR_HALF_WIDTH])
      if (
        clearSightLine(
          level,
          camera.x + px * eye,
          camera.y + py * eye,
          entity.x + px * side,
          entity.y + py * side,
          seeThrough,
        )
      )
        return true;
  return false;
}

/** Fog shared by the renderer and the fairness tests (THREE.FogExp2 density,
 * per metre). Inside the Red Haze; a sandstorm at full gust. */
export const HAZE_FOG_DENSITY = 0.075;
export const SANDSTORM_FOG = Object.freeze({ base: 0.075, gust: 0.035 });

/** How far (tiles) a player can still make out a body through FogExp2 of
 * this density: where the fog covers `cover` (default 75%) of its colour. */
export function fogVisibility(density, cover = 0.75) {
  return Math.sqrt(-Math.log(1 - cover)) / density / 3;
}
