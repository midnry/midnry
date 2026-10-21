/** Disaster weather for Last Signal, presentation only (the rules live in
 * public/games/outpost-hazards.js and never read anything from here):
 *
 * - Sandstorm: a dust wall rolling in during the warning, layered dust sheets
 *   and ground drift moving with the wind, grit streaking past the camera.
 * - Lightning storm: slanted rain with splashes, wet ground, branching bolts
 *   with return strokes, an impact glow, sparks and smoke.
 * - Earthquake: dust trickling off walls, debris chunks and dust clouds where
 *   cover collapses, dust lifting from marked ground.
 *
 * Everything is a handful of draw calls: instanced billboards, one rain
 * line batch, one splash batch, point sprites and one instanced chunk mesh.
 * Phones get fewer particles. Reduced motion: no flicker, frozen rain/sand. */
import * as THREE from "three";

const SCALE = 3;
// Wind in tile coordinates (x, y). The sandstorm blows towards the sun, so a
// player facing the incoming dust wall has the sun behind them.
export const WIND = {
  sandstorm: { x: -0.894, y: -0.447, speed: 11 },
  storm: { x: -0.6, y: -0.8, speed: 4.5 },
};
const STRIKE_LIFE = 0.5; // lightning fx duration in the rules (arena.effect)
const BOLT_LINGER = 2.2; // seconds the impact glow and smoke outlive it

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => {
  v = clamp01(v);
  return v * v * (3 - 2 * v);
};

// A tileable fbm value-noise texture shared by every dust shader (128², grey).
let noiseTex;
function noiseTexture() {
  if (noiseTex) return noiseTex;
  const size = 128,
    data = new Uint8Array(size * size * 4),
    octaves = [
      [4, 0.45, 11],
      [8, 0.27, 23],
      [16, 0.16, 37],
      [32, 0.08, 53],
      [64, 0.04, 71],
    ].map(([period, amp, seed]) => {
      const grid = new Float32Array(period * period);
      let s = seed;
      for (let i = 0; i < grid.length; i++) grid[i] = (s = (s * 16807) % 2147483647) / 2147483647;
      return { period, amp, grid };
    });
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const { period: p, amp, grid } of octaves) {
        const fx = (x / size) * p,
          fy = (y / size) * p,
          ix = Math.floor(fx),
          iy = Math.floor(fy),
          tx = smooth(fx - ix),
          ty = smooth(fy - iy),
          at = (i, j) => grid[((iy + j) % p) * p + ((ix + i) % p)];
        v += amp * (at(0, 0) * (1 - tx) * (1 - ty) + at(1, 0) * tx * (1 - ty) + at(0, 1) * (1 - tx) * ty + at(1, 1) * tx * ty);
      }
      const c = Math.round(clamp01((v - 0.5) * 1.9 + 0.5) * 255);
      data.set([c, c, c, 255], (y * size + x) * 4);
    }
  noiseTex = new THREE.DataTexture(data, size, size);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.magFilter = THREE.LinearFilter;
  noiseTex.minFilter = THREE.LinearMipmapLinearFilter;
  noiseTex.generateMipmaps = true;
  noiseTex.needsUpdate = true;
  return noiseTex;
}
// Soft round sprite for sparks and falling dust.
let dotTex;
function dotTexture() {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d"),
    g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "#ffffffff");
  g.addColorStop(0.35, "#ffffff99");
  g.addColorStop(1, "#ffffff00");
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;

/** Camera-facing soft dust billboards, drawn instanced (one draw call). The
 * owner writes every live puff each frame with push(). */
class Puffs {
  constructor(r, capacity, { lit, shadow, near = 0.6, order = 1, density = 1 }) {
    const plane = new THREE.PlaneGeometry(1, 1),
      geo = new THREE.InstancedBufferGeometry();
    geo.index = plane.index;
    geo.setAttribute("position", plane.getAttribute("position"));
    geo.setAttribute("uv", plane.getAttribute("uv"));
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.data = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.data.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aPos", this.pos);
    geo.setAttribute("aData", this.data);
    geo.instanceCount = 0;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: noiseTexture() },
        uLit: { value: new THREE.Color(lit) },
        uShadow: { value: new THREE.Color(shadow) },
        uNear: { value: near },
        uOpacity: { value: 1 },
        uDensity: { value: density },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aPos; // world position, size
        attribute vec4 aData; // alpha, seed, rotation, shade
        uniform float uNear;
        varying vec2 vUv; varying float vAlpha; varying float vShade; varying vec3 vSpin;
        void main() {
          vUv = uv;
          vec4 mv = viewMatrix * vec4(aPos.xyz, 1.0);
          mv.xy += position.xy * aPos.w;
          vAlpha = aData.x * smoothstep(uNear, uNear * 2.5, -mv.z);
          vShade = aData.w;
          vSpin = vec3(cos(aData.z), sin(aData.z), aData.y);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uLit; uniform vec3 uShadow; uniform float uOpacity; uniform float uDensity;
        varying vec2 vUv; varying float vAlpha; varying float vShade; varying vec3 vSpin;
        void main() {
          vec2 d = vUv - 0.5;
          vec2 q = mat2(vSpin.x, vSpin.y, -vSpin.y, vSpin.x) * d;
          float n = texture2D(uMap, q * 0.55 + vSpin.z).r;
          float n2 = texture2D(uMap, q * 1.4 - vSpin.z * 1.7).r;
          float r = length(d) * 2.0;
          float a = (1.0 - smoothstep(0.15 + 0.45 * n, 1.0, r)) * (0.25 + 1.1 * n * n2) * uDensity * vAlpha * uOpacity;
          if (a < 0.004) discard;
          float light = clamp(vShade + d.y * 0.7 + (n2 - 0.5) * 0.7, 0.0, 1.0);
          gl_FragColor = vec4(mix(uShadow, uLit, light), min(a, 1.0));
          ${OUTPUT}
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.mesh.visible = false;
    r.scene.add(this.mesh);
    this.capacity = capacity;
    this.count = 0;
  }
  begin() {
    this.count = 0;
  }
  push(x, y, z, size, alpha, seed, rot, shade) {
    if (this.count >= this.capacity || alpha <= 0.003) return;
    const i = this.count++ * 4;
    this.pos.array[i] = x;
    this.pos.array[i + 1] = y;
    this.pos.array[i + 2] = z;
    this.pos.array[i + 3] = size;
    this.data.array[i] = alpha;
    this.data.array[i + 1] = seed;
    this.data.array[i + 2] = rot;
    this.data.array[i + 3] = shade;
  }
  end() {
    this.mesh.geometry.instanceCount = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count) {
      this.pos.needsUpdate = true;
      this.data.needsUpdate = true;
    }
  }
}

/** Short-lived point sprites (sparks, trickling dust), CPU-simulated. */
class Specks {
  constructor(r, capacity, { color, size, additive = false, opacity = 1 }) {
    this.capacity = capacity;
    this.list = [];
    const geo = new THREE.BufferGeometry();
    this.positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    this.positions.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", this.positions);
    geo.setDrawRange(0, 0);
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color,
        size,
        map: dotTexture(),
        transparent: true,
        opacity,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: !additive,
        fog: !additive,
      }),
    );
    this.points.frustumCulled = false;
    this.points.visible = false;
    r.scene.add(this.points);
  }
  add(p) {
    if (this.list.length < this.capacity) this.list.push(p);
  }
  update(dt, gravity, drag) {
    const arr = this.positions.array;
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.vy -= gravity * dt;
      const k = Math.exp(-drag * dt);
      p.vx *= k;
      p.vz *= k;
      if (p.vy < -p.terminal) p.vy = -p.terminal;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.life <= 0 || p.y < 0) {
        this.list[i] = this.list[this.list.length - 1];
        this.list.pop();
      }
    }
    for (const p of this.list) {
      arr[n * 3] = p.x;
      arr[n * 3 + 1] = p.y;
      arr[n * 3 + 2] = p.z;
      n++;
    }
    this.points.geometry.setDrawRange(0, n);
    this.points.visible = n > 0;
    if (n) this.positions.needsUpdate = true;
  }
}

/** A branching lightning channel as camera-facing ribbons: a jagged main
 * channel from the cloud base to the strike point, with forks. */
function boltGeometry(x, z, seed) {
  let s = seed % 2147483646 || 1;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647,
    segs = [];
  const jag = (a, b, disp, depth, out) => {
    if (!depth) return out.push([a, b]);
    const m = a.clone().lerp(b, 0.42 + rand() * 0.16);
    m.x += (rand() - 0.5) * disp;
    m.z += (rand() - 0.5) * disp;
    m.y += (rand() - 0.5) * disp * 0.25;
    jag(a, m, disp * 0.55, depth - 1, out);
    jag(m, b, disp * 0.55, depth - 1, out);
  };
  const top = new THREE.Vector3(x + (rand() - 0.5) * 30, 95, z + (rand() - 0.5) * 30),
    main = [];
  jag(top, new THREE.Vector3(x, 0, z), 26, 7, main);
  main.forEach(([a, b], i) => segs.push([a, b, 0.75, i / main.length, (i + 1) / main.length, 0]));
  // Forks leave the main channel and die out partway to the ground.
  for (let k = 0; k < 7; k++) {
    const i = Math.floor(main.length * (0.1 + rand() * 0.7)),
      start = main[i][0],
      t0 = i / main.length,
      ang = rand() * Math.PI * 2,
      len = 8 + rand() * 20,
      end = start
        .clone()
        .add(new THREE.Vector3(Math.cos(ang) * len * 0.8, -len * (0.5 + rand() * 0.6), Math.sin(ang) * len * 0.8));
    end.y = Math.max(end.y, 4);
    const fork = [];
    jag(start, end, len * 0.35, 4, fork);
    fork.forEach(([a, b], j) => segs.push([a, b, 0.32, t0 + (j / fork.length) * 0.25, t0 + ((j + 1) / fork.length) * 0.25, 1]));
    if (rand() < 0.6) {
      const f = fork[Math.floor(fork.length * (0.3 + rand() * 0.4))][0],
        tip = f.clone().add(new THREE.Vector3((rand() - 0.5) * 12, -4 - rand() * 8, (rand() - 0.5) * 12)),
        twig = [];
      tip.y = Math.max(tip.y, 3);
      jag(f, tip, 4, 3, twig);
      twig.forEach(([a, b]) => segs.push([a, b, 0.2, t0 + 0.2, t0 + 0.25, 1]));
    }
  }
  const n = segs.length,
    pos = new Float32Array(n * 12),
    dir = new Float32Array(n * 12),
    side = new Float32Array(n * 4),
    width = new Float32Array(n * 4),
    at = new Float32Array(n * 4),
    level = new Float32Array(n * 4),
    index = [];
  segs.forEach(([a, b, w, ta, tb, lv], i) => {
    const v = i * 4;
    for (const [k, p, sd, t] of [
      [0, a, -1, ta],
      [1, a, 1, ta],
      [2, b, 1, tb],
      [3, b, -1, tb],
    ]) {
      pos.set([p.x, p.y, p.z], (v + k) * 3);
      dir.set([b.x - a.x, b.y - a.y, b.z - a.z], (v + k) * 3);
      side[v + k] = sd;
      width[v + k] = w;
      at[v + k] = t;
      level[v + k] = lv;
    }
    index.push(v, v + 1, v + 2, v, v + 2, v + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
  geo.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  geo.setAttribute("aWidth", new THREE.BufferAttribute(width, 1));
  geo.setAttribute("aT", new THREE.BufferAttribute(at, 1));
  geo.setAttribute("aLevel", new THREE.BufferAttribute(level, 1));
  geo.setIndex(index);
  return geo;
}
const boltMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uReveal: { value: 1 },
      uMain: { value: 1 },
      uBranch: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aDir; attribute float aSide; attribute float aWidth; attribute float aT; attribute float aLevel;
      uniform float uReveal; uniform float uMain; uniform float uBranch;
      varying float vSide; varying float vI;
      void main() {
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        vec3 d = (modelViewMatrix * vec4(aDir, 0.0)).xyz;
        vec3 n = normalize(cross(d, p.xyz) + vec3(1e-5, 0.0, 0.0));
        // Wider with distance so far bolts never thin out to nothing.
        p.xyz += n * aSide * aWidth * (1.0 + max(0.0, -p.z - 25.0) * 0.012);
        vSide = aSide;
        vI = step(aT, uReveal) * mix(uMain, uBranch, aLevel);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      varying float vSide; varying float vI;
      void main() {
        float s = abs(vSide);
        float core = 1.0 - smoothstep(0.08, 0.28, s);
        float glow = exp(-s * s * 6.0);
        vec3 c = vec3(1.0, 0.98, 1.0) * core * 5.0 + vec3(0.45, 0.58, 1.0) * glow * 1.6;
        gl_FragColor = vec4(c * vI, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    // The ribbons face the camera whichever way they were wound.
    side: THREE.DoubleSide,
  });
/** Brightness of a strike `age` seconds after it lands: a stepped leader,
 * a blinding return stroke and two dimmer re-strikes along the same channel.
 * Reduced motion: one soft pulse, no flicker. */
export function strokeLevel(age, still) {
  if (age < 0 || age > STRIKE_LIFE) return 0;
  if (still) return 0.7 * (1 - age / STRIKE_LIFE);
  if (age < 0.045) return 0.35;
  let v = 0;
  for (const [at, amp] of [
    [0.045, 1],
    [0.16, 0.8],
    [0.27, 0.55],
  ])
    if (age >= at) v = Math.max(v, amp * Math.exp(-(age - at) * 20));
  return v + 0.08 * (1 - age / STRIKE_LIFE);
}

export class DisasterWeather {
  constructor(r) {
    this.r = r;
    this.mobile = r.mobileDevice;
    this.clock = 0;
    this.bolts = new Map();
    this.bursts = [];
    this.chunks = [];
    this.rubbleSeen = null;
  }
  /** Per frame, before rendering: `k` is how far the disaster's weather has
   * rolled in (HazardDressing.fade). */
  update(t, k) {
    const r = this.r,
      a = r.g.arena,
      d = a.disaster,
      now = performance.now(),
      dt = Math.min(0.1, (now - (this.at || now)) / 1000),
      still = r.motion.matches;
    this.at = now;
    if (!still) this.clock += dt;
    this.dt = dt;
    const kind = d?.kind;
    this.updateSandstorm(kind === "sandstorm" ? d : null, k, dt, still);
    this.updateRain(kind === "storm" ? d : null, dt, still);
    this.updateBolts(dt, still);
    this.updateQuake(kind === "quake" ? d : null, dt, still);
    this.updateBursts(dt);
  }
  // ---------------------------------------------------------------- sandstorm
  /** How close the dust wall is, 0 (not yet) – 1 (on you), and its opacity. */
  wall(d) {
    const t = this.r.g.arena.time;
    if (!d || t < d.warnAt || t > d.startAt + 1) return null;
    return {
      distance: Math.max(0, d.startAt - 0.6 - t) * 21 + 4,
      opacity: Math.min(smooth((t - d.warnAt) / 2), 1 - smooth((t - (d.startAt - 0.8)) / 1.4)),
    };
  }
  updateSandstorm(d, k, dt, still) {
    const r = this.r,
      wind = WIND.sandstorm,
      cam = r.camera.position,
      w = this.wall(d);
    // The rolling wall: a huge curved curtain of dust, lit by the sun on
    // its face and darker at its foot, closing in from upwind.
    if (w && w.opacity > 0.002) {
      const wall = (this.dustWall ||= this.makeDustWall()),
        R = 320;
      wall.visible = true;
      wall.position.set(cam.x + wind.x * (R - w.distance), -2, cam.z + wind.y * (R - w.distance));
      wall.rotation.y = Math.atan2(-wind.x, -wind.y);
      wall.scale.set(R, 110, R);
      const u = wall.material.uniforms;
      u.uTime.value = this.clock;
      u.uOpacity.value = w.opacity;
      u.uFog.value.copy(r.scene.fog.color);
      u.uHaze.value = clamp01(w.distance / 230) * 0.25;
    } else if (this.dustWall) this.dustWall.visible = false;
    // Inside the storm: dust sheets drifting downwind and sand skating
    // along the ground, wrapped in a box that follows the camera.
    const inside = r.naturalLighting?.inside ? 0.35 : 1;
    if (!d || k <= 0) {
      if (this.sand) this.sand.mesh.visible = false;
      if (this.grit) this.grit.visible = false;
      return;
    }
    const sand = (this.sand ||= new Puffs(r, this.mobile ? 28 : 70, {
      lit: "#e4c08a",
      shadow: "#6a4e31",
      near: 0.9,
    }));
    if (!this.sheets) {
      let s = 17;
      const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
      this.sheets = Array.from({ length: sand.capacity }, (_, i) => {
        const low = i % 3 === 0;
        return {
          x: rand() * 48,
          z: rand() * 48,
          y: low ? 0.25 + rand() * 0.5 : 1 + rand() * 7,
          size: low ? 2.5 + rand() * 3 : 6 + rand() * 9,
          speed: (low ? 1.35 : 0.75) + rand() * 0.4,
          seed: rand() * 10,
          shade: 0.1 + rand() * 0.8,
          alpha: low ? 0.42 : 0.28 + rand() * 0.22,
          spin: (rand() - 0.5) * 0.4,
        };
      });
    }
    const gust = this.gust(),
      half = 24,
      move = still ? 0 : wind.speed * (0.8 + gust * 0.5) * dt;
    sand.begin();
    for (const p of this.sheets) {
      p.x += wind.x * move * p.speed * SCALE * 0.34;
      p.z += wind.y * move * p.speed * SCALE * 0.34;
      p.seed += still ? 0 : dt * 0.02 * p.speed;
      const x = ((((p.x - cam.x + half) % (half * 2)) + half * 2) % (half * 2)) - half,
        z = ((((p.z - cam.z + half) % (half * 2)) + half * 2) % (half * 2)) - half,
        edge = 1 - smooth((Math.hypot(x, z) - half * 0.6) / (half * 0.4));
      sand.push(cam.x + x, p.y, cam.z + z, p.size, p.alpha * edge * k * inside * (0.75 + gust * 0.5), p.seed, p.seed * p.spin, p.shade);
    }
    sand.end();
    // Grit: short streaks whipping past close to the camera.
    const grit = (this.grit ||= this.makeGrit()),
      pos = grit.geometry.attributes.position,
      v = grit.userData.v;
    grit.visible = !still && inside === 1;
    grit.material.opacity = 0.34 * k * (0.6 + gust * 0.6);
    if (grit.visible) {
      const span = 9;
      for (let i = 0; i < v.length; i++) {
        const g = v[i];
        g.x += wind.x * g.speed * dt;
        g.z += wind.y * g.speed * dt;
        g.y += Math.sin(this.clock * 3 + i) * dt * 0.4;
        let x = g.x - cam.x,
          z = g.z - cam.z;
        if (g.fresh) {
          g.fresh = false;
          g.x = cam.x + (Math.random() - 0.5) * span * 2;
          g.z = cam.z + (Math.random() - 0.5) * span * 2;
        } else if (Math.abs(x) > span || Math.abs(z) > span) {
          // Re-enter on the upwind side.
          x = -wind.x * span * 0.9 + (Math.random() - 0.5) * span * 2 * Math.abs(wind.y);
          z = -wind.y * span * 0.9 + (Math.random() - 0.5) * span * 2 * Math.abs(wind.x);
          g.x = cam.x + x;
          g.z = cam.z + z;
          g.y = 0.1 + Math.random() * 2.6;
        }
        const len = g.speed * 0.014;
        pos.setXYZ(i * 2, g.x, g.y, g.z);
        pos.setXYZ(i * 2 + 1, g.x - wind.x * len, g.y + 0.01, g.z - wind.y * len);
      }
      pos.needsUpdate = true;
    }
  }
  /** Slow gusting, 0–1. */
  gust() {
    const c = this.clock;
    return clamp01(0.5 + 0.3 * Math.sin(c * 0.9) * Math.sin(c * 0.37 + 1.3) + 0.2 * Math.sin(c * 2.3 + 0.4));
  }
  makeDustWall() {
    const arc = 1.7,
      geo = new THREE.CylinderGeometry(1, 1, 1, 72, 1, true, -arc / 2, arc);
    geo.translate(0, 0.5, 0);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: noiseTexture() },
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uHaze: { value: 0 },
          uFog: { value: new THREE.Color() },
          uLit: { value: new THREE.Color("#e2b277") },
          uShade: { value: new THREE.Color("#7f5732") },
          uFoot: { value: new THREE.Color("#5c432b") },
          uArc: { value: arc * 320 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform float uTime; uniform float uOpacity; uniform float uHaze; uniform float uArc;
          uniform vec3 uFog; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uFoot;
          varying vec2 vUv;
          float n(vec2 p) { return texture2D(uMap, p).r; }
          void main() {
            // Metres along the front and up it, in 100 m texture tiles.
            vec2 p = vec2(vUv.x * uArc, vUv.y * 110.0) / 100.0;
            float h = vUv.y;
            // Billowing dust at three scales, boiling upwards.
            vec2 drift = vec2(-uTime * 0.008, -uTime * 0.03);
            float big = n(p * 0.45 + vec2(uTime * 0.004, -uTime * 0.012));
            float mid = n(p * 1.3 + drift);
            float fine = n(p * 3.7 + vec2(uTime * 0.01, -uTime * 0.07));
            float dens = big * 0.55 + mid * 0.3 + fine * 0.15;
            // A lumpy top edge: big domes with smaller ones on them.
            float top = 0.36 + 0.3 * n(vec2(p.x * 0.22 + uTime * 0.003, 0.13)) + 0.12 * n(vec2(p.x * 0.8, 0.57));
            float inside = top - h + (dens - 0.5) * 0.24;
            float a = smoothstep(0.0, 0.08, inside);
            // The ends of the arc thin out instead of stopping.
            a *= smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
            // Billows lit towards the top, deep folds and the churning
            // foot dark; the thin edge glows where the sun shines through.
            float light = clamp(0.22 + (h / top) * 0.42 + (big - 0.5) * 0.55 + (mid - 0.5) * 0.4 + (fine - 0.5) * 0.15 + (1.0 - smoothstep(0.0, 0.1, inside)) * 0.2, 0.0, 1.0);
            vec3 c = mix(uShade, uLit, light);
            c = mix(uFoot, c, smoothstep(0.02, 0.3, h + (mid - 0.5) * 0.12));
            c = mix(c, uFog, uHaze);
            gl_FragColor = vec4(c, clamp(a, 0.0, 1.0) * uOpacity);
            ${OUTPUT}
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.frustumCulled = false;
    mesh.renderOrder = -0.5;
    this.r.scene.add(mesh);
    return mesh;
  }
  makeGrit() {
    const count = this.mobile ? 110 : 240,
      geo = new THREE.BufferGeometry(),
      v = [];
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    for (let i = 0; i < count; i++)
      v.push({ x: 0, z: 0, y: 0.1 + Math.random() * 2.6, speed: 15 + Math.random() * 10, fresh: true });
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: "#cfa96f", transparent: true, opacity: 0.34, depthWrite: false }),
    );
    lines.frustumCulled = false;
    lines.userData.v = v;
    this.r.scene.add(lines);
    return lines;
  }
  // -------------------------------------------------------------------- storm
  /** Rain amount, 0–1: starts just before the storm, stops as it clears. */
  rainLevel(d) {
    const t = this.r.g.arena.time;
    if (!d || t >= d.endAt + 1) return 0;
    return Math.min(smooth((t - (d.startAt - 2.5)) / 3), 1 - smooth((t - (d.endAt - 3)) / 4));
  }
  /** How wet the ground is: soaks in over the first seconds, dries slowly. */
  wetness() {
    const d = this.r.g.arena.disaster,
      t = this.r.g.arena.time;
    if (d?.kind !== "storm") return 0;
    return Math.min(smooth((t - (d.startAt - 1)) / 7), 1 - smooth((t - d.endAt) / 12));
  }
  updateRain(d, dt, still) {
    const r = this.r,
      k = this.rainLevel(d),
      cam = r.camera.position;
    if (k <= 0) {
      if (this.rain) this.rain.visible = this.splash.visible = false;
      return;
    }
    if (!this.rain) this.makeRain();
    const inside = r.naturalLighting?.inside,
      ru = this.rain.material.uniforms,
      su = this.splash.material.uniforms,
      flash = this.flash();
    this.rain.visible = true;
    this.splash.visible = !inside;
    ru.uCam.value.copy(cam);
    ru.uTime.value = this.clock;
    ru.uOpacity.value = k * (inside ? 0.2 : 0.55) * (still ? 0.7 : 1);
    ru.uColor.value.setRGB(0.62, 0.68, 0.78).multiplyScalar(1 + flash * 2.5);
    su.uCam.value.copy(cam);
    su.uTime.value = this.clock;
    su.uOpacity.value = k * 0.6 * (1 + flash);
  }
  makeRain() {
    const r = this.r,
      count = this.mobile ? 1100 : 2600,
      box = 30,
      height = 20,
      base = new Float32Array(count * 6),
      end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * box,
        y = Math.random() * height,
        z = Math.random() * box;
      base.set([x, y, z, x, y, z], i * 6);
      end.set([0, 1], i * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(base, 3));
    geo.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    const wind = WIND.storm;
    this.rain = new THREE.LineSegments(
      geo,
      new THREE.ShaderMaterial({
        uniforms: {
          uCam: { value: new THREE.Vector3() },
          uTime: { value: 0 },
          uVel: { value: new THREE.Vector3(wind.x * wind.speed, -13, wind.y * wind.speed) },
          uBox: { value: box },
          uHeight: { value: height },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color() },
        },
        vertexShader: /* glsl */ `
          attribute float aEnd;
          uniform vec3 uCam; uniform float uTime; uniform vec3 uVel; uniform float uBox; uniform float uHeight;
          varying float vY; varying float vFade;
          void main() {
            float speed = 0.85 + 0.3 * fract(position.x * 7.13 + position.z * 3.7);
            vec3 p = position + uVel * uTime * speed;
            p.xz = mod(p.xz - uCam.xz + uBox * 0.5, uBox) - uBox * 0.5 + uCam.xz;
            p.y = mod(p.y, uHeight) + uCam.y - 4.0;
            // Each drop is a short motion-blurred streak along its fall.
            p -= normalize(uVel) * aEnd * (0.55 + 0.6 * fract(position.y * 5.31));
            vY = p.y;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            vFade = (1.0 - smoothstep(uBox * 0.25, uBox * 0.5, length(p.xz - uCam.xz)))
                  * smoothstep(0.25, 1.2, -mv.z) * (0.45 + 0.55 * fract(position.z * 9.7)) * (1.0 - aEnd * 0.6);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity; uniform vec3 uColor;
          varying float vY; varying float vFade;
          void main() {
            if (vY < 0.0) discard;
            gl_FragColor = vec4(uColor, uOpacity * vFade);
            ${OUTPUT}
          }`,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.rain.frustumCulled = false;
    r.scene.add(this.rain);
    // Splashes: rings opening on the ground around you, each re-placed at
    // random every cycle (all on the GPU).
    const plane = new THREE.PlaneGeometry(1, 1),
      geo2 = new THREE.InstancedBufferGeometry(),
      n = this.mobile ? 110 : 260,
      seeds = new Float32Array(n * 2);
    for (let i = 0; i < n * 2; i++) seeds[i] = Math.random();
    geo2.index = plane.index;
    geo2.setAttribute("position", plane.getAttribute("position"));
    geo2.setAttribute("uv", plane.getAttribute("uv"));
    geo2.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 2));
    geo2.instanceCount = n;
    this.splash = new THREE.Mesh(
      geo2,
      new THREE.ShaderMaterial({
        uniforms: {
          uCam: { value: new THREE.Vector3() },
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uRadius: { value: 11 },
        },
        vertexShader: /* glsl */ `
          attribute vec2 aSeed;
          uniform vec3 uCam; uniform float uTime; uniform float uRadius;
          varying vec2 vUv; varying float vPhase;
          float h(float v) { return fract(sin(v) * 43758.5453); }
          void main() {
            float cyc = uTime / (0.32 + aSeed.x * 0.2) + aSeed.y * 7.0;
            float id = floor(cyc);
            vPhase = fract(cyc);
            vec2 at = vec2(h(id * 12.9898 + aSeed.y * 78.233), h(id * 39.346 + aSeed.x * 11.135)) - 0.5;
            vec3 c = vec3(uCam.x + at.x * 2.0 * uRadius, 0.035, uCam.z + at.y * 2.0 * uRadius);
            float size = 0.06 + 0.2 * vPhase;
            vUv = uv;
            gl_Position = projectionMatrix * viewMatrix * vec4(c + vec3(position.x, 0.0, position.y) * size, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying vec2 vUv; varying float vPhase;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float ring = smoothstep(0.6, 0.85, d) * (1.0 - smoothstep(0.85, 1.0, d));
            float drop = (1.0 - smoothstep(0.0, 0.35, d)) * (1.0 - smoothstep(0.0, 0.25, vPhase));
            float a = (ring * (1.0 - vPhase) + drop) * uOpacity;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vec3(0.8, 0.85, 0.92), a);
            ${OUTPUT}
          }`,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
      }),
    );
    this.splash.frustumCulled = false;
    r.scene.add(this.splash);
  }
  /** Scene-wide lightning light, 0–1+, from every strike still glowing
   * (nearer strikes light the scene more). */
  flash() {
    const r = this.r,
      a = r.g.arena,
      p = r.g.camera(),
      still = r.motion.matches;
    let v = 0;
    for (const f of a.fx) {
      if (f.kind !== "lightning") continue;
      const age = a.time - (f.until - STRIKE_LIFE),
        near = 0.45 + 0.55 * clamp01(1 - Math.hypot(f.x - p.x, f.y - p.y) / 24);
      v = Math.max(v, strokeLevel(age, still) * near);
    }
    return v;
  }
  updateBolts(dt, still) {
    const r = this.r,
      a = r.g.arena;
    for (const f of a.fx) {
      if (f.kind !== "lightning" || this.bolts.has(f.id) || f.until <= a.time) continue;
      this.bolts.set(f.id, this.makeBolt(f));
    }
    for (const [id, b] of this.bolts) {
      const age = a.time - b.born;
      if (age < -0.05 || age > STRIKE_LIFE + BOLT_LINGER) {
        r.scene.remove(b.root);
        b.channel.geometry.dispose();
        b.channel.material.dispose();
        b.glow.material.dispose();
        this.bolts.delete(id);
        continue;
      }
      const level = strokeLevel(age, still),
        u = b.channel.material.uniforms;
      b.channel.visible = age <= STRIKE_LIFE;
      u.uReveal.value = still ? 1 : clamp01(age / 0.045);
      u.uMain.value = level;
      // Forks only carry the first stroke.
      u.uBranch.value = age < 0.045 ? 0.6 : age < 0.14 ? level : level * 0.25;
      // The ground where it hit glows white, then cools to orange embers.
      const cool = clamp01((age - 0.15) / BOLT_LINGER);
      b.glow.material.color
        .setRGB(0.75, 0.85, 1)
        .lerp(this.ember || (this.ember = new THREE.Color(1, 0.35, 0.08)), smooth(cool * 3))
        .multiplyScalar(Math.max(level * 2, (1 - cool) * 0.7));
      b.glow.scale.setScalar(SCALE * (age < 0.3 ? 1.5 : 0.7 + 0.8 * (1 - cool)));
      if (!b.smoked && age > 0.05) {
        b.smoked = true;
        const sparks = (this.sparks ||= new Specks(r, this.mobile ? 90 : 220, {
          color: "#d8ecff",
          size: 0.16,
          additive: true,
        }));
        for (let i = 0; i < (this.mobile ? 30 : 60); i++) {
          const ang = Math.random() * Math.PI * 2,
            sp = 2 + Math.random() * 7;
          sparks.add({
            x: b.x,
            y: 0.1,
            z: b.z,
            vx: Math.cos(ang) * sp,
            vy: 2 + Math.random() * 6,
            vz: Math.sin(ang) * sp,
            life: 0.3 + Math.random() * 0.6,
            terminal: 30,
          });
        }
        for (let i = 0; i < 4; i++)
          this.bursts.push(this.puff(b.x, 0.4, b.z, { size: 1.2, grow: 2.2, rise: 0.9, life: 2.6 + i * 0.3, alpha: 0.55, shade: 0.12, spread: 0.6 }));
      }
    }
    this.sparks?.update(dt, 14, 1.2);
  }
  makeBolt(f) {
    const r = this.r,
      root = new THREE.Group(),
      x = f.x * SCALE,
      z = f.y * SCALE,
      channel = new THREE.Mesh(boltGeometry(x, z, f.id * 7919 + 13), boltMaterial());
    channel.frustumCulled = false;
    channel.renderOrder = 3;
    root.add(channel);
    const glow = new THREE.Mesh(
      r.geo("strike-glow", () => new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2)),
      new THREE.MeshBasicMaterial({
        map: dotTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
    );
    glow.position.set(x, 0.05, z);
    root.add(glow);
    r.scene.add(root);
    return { root, channel, glow, x, z, born: f.until - STRIKE_LIFE };
  }
  // -------------------------------------------------------------- earthquake
  /** Earthquake strength, 0–1: a foreshock in the last seconds of the
   * warning, the main shaking, and a jolt from every collapse nearby. */
  quakeLevel() {
    const a = this.r.g.arena,
      d = a.disaster,
      p = this.r.g.camera();
    if (d?.kind !== "quake") return 0;
    const t = a.time;
    let v = 0;
    if (t >= d.startAt - 2.5 && t < d.startAt) v = 0.18 * smooth((t - (d.startAt - 2.5)) / 2.5);
    if (t >= d.startAt && t < d.endAt) v = 0.55 * Math.min(1, (t - d.startAt) / 1.2, (d.endAt - t) / 1.5) + 0.12 * Math.sin(t * 1.7) ** 2;
    for (const f of a.fx) {
      if (f.kind !== "debris") continue;
      const age = t - (f.until - 0.8);
      v += Math.max(0, 1 - Math.hypot(f.x - p.x, f.y - p.y) / 9) * Math.exp(-Math.max(0, age) * 3.5) * 0.7;
    }
    return clamp01(v);
  }
  updateQuake(d, dt, still) {
    const r = this.r,
      a = r.g.arena,
      cam = r.camera.position,
      level = d ? this.quakeLevel() : 0;
    // Dust trickling off the tops of walls near you while it shakes.
    const trickle = (this.trickle ||= new Specks(r, this.mobile ? 160 : 360, {
      color: "#8c7f6b",
      size: 0.28,
      opacity: 0.85,
    }));
    if (level > 0.05 && !r.naturalLighting?.inside) {
      if (!this.emitters || this.emitAt < a.time - 0.6 || this.emitAt > a.time) this.findEmitters();
      const rate = level * (this.mobile ? 110 : 240) * dt;
      for (let i = 0; i < rate && this.emitters.length; i++) {
        // Most of it pours from a few cracks along the wall tops (streams
        // that move every ~0.6 s), the rest sifts down anywhere.
        const stream = i % 4 !== 0,
          e = stream
            ? this.emitters[this.streams[i % this.streams.length]]
            : this.emitters[Math.floor(Math.random() * this.emitters.length)],
          along = stream ? e.stream + (Math.random() - 0.5) * 0.25 : (Math.random() - 0.5) * 2.6;
        trickle.add({
          x: e.x + e.ax * along + e.nx * 0.12,
          y: e.h - Math.random() * 0.3,
          z: e.z + e.az * along + e.nz * 0.12,
          vx: e.nx * 0.3,
          vy: -0.3,
          vz: e.nz * 0.3,
          life: 3,
          terminal: 2.4 + Math.random() * 1.5,
        });
      }
    }
    trickle.update(dt, 6, 0.8);
    // Marked ground lifts dust as it cracks.
    if (d && !still)
      for (const s of d.strikes) {
        if (Math.random() > dt * 9) continue;
        const ang = Math.random() * Math.PI * 2,
          rad = Math.random() * 1.6;
        this.bursts.push(
          this.puff(s.x * SCALE + Math.cos(ang) * rad, 0.15, s.y * SCALE + Math.sin(ang) * rad, {
            size: 0.5,
            grow: 1.4,
            rise: 0.7,
            life: 1.4,
            alpha: 0.45,
            shade: 0.55,
            spread: 0.2,
          }),
        );
      }
    // Collapses: any wall that turns to rubble (quake or blast) throws out
    // chunks and a rolling dust cloud; a quake impact also kicks up dust.
    const terrain = a.terrain || [];
    let count = 0;
    for (const t of terrain) if (t.kind === "rubble") count++;
    if (count === this.rubbleCount) return this.checkImpacts(a);
    this.rubbleCount = count;
    const rubble = terrain.filter((t) => t.kind === "rubble"),
      keys = rubble.map((t) => t.x + ":" + t.y);
    if (!this.rubbleSeen || keys.length < this.rubbleSeen.size) this.rubbleSeen = new Set(keys);
    else
      for (let i = 0; i < keys.length; i++)
        if (!this.rubbleSeen.has(keys[i])) {
          this.rubbleSeen.add(keys[i]);
          const near = Math.hypot(rubble[i].x * SCALE - cam.x, rubble[i].y * SCALE - cam.z) < 70;
          if (near) this.collapse(rubble[i].x * SCALE, rubble[i].y * SCALE, true);
        }
    this.checkImpacts(a);
  }
  checkImpacts(a) {
    this.impactSeen ||= new Set();
    for (const f of a.fx)
      if (f.kind === "debris" && !this.impactSeen.has(f.id)) {
        this.impactSeen.add(f.id);
        this.collapse(f.x * SCALE, f.y * SCALE, false);
      }
    if (this.impactSeen.size > 200) this.impactSeen = new Set(a.fx.map((f) => f.id));
  }
  findEmitters() {
    const r = this.r,
      a = r.g.arena,
      p = r.g.camera(),
      level = a.level,
      n = level.length,
      out = [];
    for (let y = Math.max(1, Math.floor(p.y) - 6); y <= Math.min(n - 2, Math.floor(p.y) + 6); y++)
      for (let x = Math.max(1, Math.floor(p.x) - 6); x <= Math.min(n - 2, Math.floor(p.x) + 6); x++) {
        if (!level[y][x]) continue;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          if (level[y + dy]?.[x + dx] === 0)
            out.push({
              x: (x + 0.5 + dx * 0.5) * SCALE,
              z: (y + 0.5 + dy * 0.5) * SCALE,
              nx: dx,
              nz: dy,
              ax: dy ? 1 : 0,
              az: dx ? 1 : 0,
              h: ["breakwater", "medevac", "hospital"].includes(a.mapId) ? 3.4 : 2.95,
            });
      }
    this.emitters = out;
    this.emitAt = a.time;
    // Pouring streams where you can see them: wall tops in front of you.
    const cam = r.camera.position,
      fx = Math.cos(p.a),
      fz = Math.sin(p.a),
      ahead = out.map((e, i) => i).filter((i) => (out[i].x - cam.x) * fx + (out[i].z - cam.z) * fz > 2),
      pool = ahead.length ? ahead : out.map((e, i) => i);
    this.streams = Array.from({ length: this.mobile ? 4 : 7 }, () => pool[Math.floor(Math.random() * pool.length)]);
    for (const e of out) e.stream = (Math.random() - 0.5) * 2.2;
  }
  /** Debris chunks and a dust cloud: `wall` for a collapsing wall tile,
   * otherwise ground splitting at a quake impact. */
  collapse(x, z, wall) {
    const m = this.mobile ? 0.5 : 1;
    for (let i = 0; i < Math.round((wall ? 12 : 5) * m); i++) {
      const ang = Math.random() * Math.PI * 2,
        sp = (wall ? 1.5 : 1) + Math.random() * 4;
      this.chunks.push({
        x: x + (Math.random() - 0.5) * (wall ? 2 : 1),
        y: wall ? 0.6 + Math.random() * 2.2 : 0.2,
        z: z + (Math.random() - 0.5) * (wall ? 2 : 1),
        vx: Math.cos(ang) * sp,
        vy: 2 + Math.random() * (wall ? 4 : 5),
        vz: Math.sin(ang) * sp,
        rx: Math.random() * 6,
        ry: Math.random() * 6,
        spin: (Math.random() - 0.5) * 14,
        size: (wall ? 0.18 : 0.1) + Math.random() * (wall ? 0.32 : 0.16),
        life: 2.6 + Math.random() * 1.2,
        age: 0,
      });
    }
    if (this.chunks.length > 140) this.chunks.splice(0, this.chunks.length - 140);
    for (let i = 0; i < Math.round((wall ? 9 : 5) * m); i++) {
      const ang = (i / 5) * Math.PI * 2 + Math.random();
      this.bursts.push(
        this.puff(x + Math.cos(ang) * 0.6, wall ? 0.3 + Math.random() * 2.5 : 0.3, z + Math.sin(ang) * 0.6, {
          size: wall ? 2.2 : 1.1,
          grow: wall ? 4.2 : 2.6,
          rise: wall ? 0.5 : 0.35,
          life: wall ? 4.2 + Math.random() * 1.5 : 2.6,
          alpha: wall ? 0.95 : 0.75,
          shade: 0.4 + Math.random() * 0.3,
          spread: wall ? 1.6 : 2.4,
          ang,
        }),
      );
    }
  }
  puff(x, y, z, { size, grow, rise, life, alpha, shade, spread, ang = Math.random() * 6.28 }) {
    return {
      x,
      y,
      z,
      vx: Math.cos(ang) * spread,
      vz: Math.sin(ang) * spread,
      size,
      grow,
      rise,
      life,
      age: 0,
      alpha,
      shade,
      seed: Math.random() * 10,
      rot: Math.random() * 6.28,
    };
  }
  updateBursts(dt) {
    const r = this.r;
    // Dust clouds and smoke.
    if (this.bursts.length) {
      const dust = (this.dust ||= new Puffs(r, this.mobile ? 90 : 180, {
        lit: "#b3a690",
        shadow: "#4a4238",
        near: 0.5,
        order: 2,
        density: 1.8,
      }));
      dust.begin();
      for (let i = this.bursts.length - 1; i >= 0; i--) {
        const b = this.bursts[i];
        b.age += dt;
        if (b.age >= b.life) {
          this.bursts.splice(i, 1);
          continue;
        }
        const k = Math.exp(-dt * 1.6);
        b.vx *= k;
        b.vz *= k;
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.y += b.rise * dt;
        const t = b.age / b.life;
        dust.push(b.x, b.y, b.z, b.size + b.grow * Math.sqrt(t), b.alpha * Math.min(1, b.age * 6) * (1 - t) ** 1.5, b.seed, b.rot + t * 0.6, b.shade);
      }
      dust.end();
    } else if (this.dust) this.dust.mesh.visible = false;
    // Debris chunks: thrown, tumbling, bouncing once and settling.
    if (!this.chunks.length && !this.chunkMesh) return;
    const mesh = (this.chunkMesh ||= (() => {
      const m = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: "#8f8577", roughness: 1, flatShading: true }),
        140,
      );
      m.frustumCulled = false;
      m.castShadow = false;
      m.receiveShadow = true;
      r.materials.add(m.material);
      r.scene.add(m);
      return m;
    })());
    const mat = (this.chunkMatrix ||= new THREE.Matrix4()),
      q = (this.chunkQ ||= new THREE.Quaternion()),
      e = (this.chunkE ||= new THREE.Euler()),
      v = (this.chunkV ||= new THREE.Vector3()),
      s = (this.chunkS ||= new THREE.Vector3());
    let n = 0;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.age += dt;
      if (c.age > c.life) {
        this.chunks.splice(i, 1);
        continue;
      }
      if (c.y > c.size * 0.5 || c.vy > 0) {
        c.vy -= 9.8 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        c.rx += c.spin * dt;
        c.ry += c.spin * 0.7 * dt;
        if (c.y < c.size * 0.5) {
          c.y = c.size * 0.5;
          c.vy = Math.abs(c.vy) > 2 ? -c.vy * 0.3 : 0;
          c.vx *= 0.45;
          c.vz *= 0.45;
          c.spin *= 0.4;
        }
      }
      const fade = Math.min(1, (c.life - c.age) / 0.6);
      mesh.setMatrixAt(n++, mat.compose(v.set(c.x, c.y, c.z), q.setFromEuler(e.set(c.rx, c.ry, 0)), s.setScalar(c.size * fade)));
    }
    mesh.count = n;
    mesh.visible = n > 0;
    mesh.instanceMatrix.needsUpdate = true;
  }
}
