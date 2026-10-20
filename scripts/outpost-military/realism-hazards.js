/** Last Signal hazards, presentation only: canister / sandbag / foam models,
 * short-lived effects (explosions, gas, healing, lightning, collapsing
 * cover), marked ground before a strike, and disaster weather and shake.
 * The rules live in public/games/outpost-hazards.js. */
import * as THREE from "three";

const SCALE = 3;
const COLORS = { red: "#c8352b", green: "#4f9a3a", pink: "#e276b8", blue: "#3f86d8" };
const EFFECTS = {
  blast: { color: "#ff9a3c", emissive: "#ff6a12", grow: 1, opacity: 0.55, glow: true },
  toxic: { color: "#7dbd4c", emissive: "#4d8a22", grow: 0.7, opacity: 0.5 },
  heal: { color: "#7fc3ff", emissive: "#3f86d8", grow: 0.6, opacity: 0.55, flat: true },
  foam: { color: "#f1a2d4", emissive: "#c0508e", grow: 0.5, opacity: 0.6 },
  debris: { color: "#a08a6a", emissive: "#3a2e20", grow: 0.9, opacity: 0.65 },
  lightning: {
    color: "#f4f6ff",
    emissive: "#cfe0ff",
    grow: 0.3,
    opacity: 0.9,
    bolt: true,
    glow: true,
  },
};

/** Model for a crate with a kind (supply crates keep the interactables kit). */
export function buildHazard(r, root, kind) {
  if (kind === "barrier") {
    // A short sandbag wall: three courses of rounded bags.
    const bag = r.hazardBag || (r.hazardBag = r.material({ color: "#a89470", roughness: 0.95 }));
    const geo = r.geo("sandbag", () => new THREE.SphereGeometry(0.5, 12, 8));
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 3 - (row === 2 ? 1 : 0); i++) {
        const m = r.mesh(
          root,
          geo,
          bag,
          [(i - (row === 2 ? 0.5 : 1)) * 0.62, 0.22 + row * 0.36, 0],
          [0.34, 0.2, 0.42],
        );
        m.rotation.y = (i + row) * 0.3;
      }
    root.scale.setScalar(1.6);
    return;
  }
  if (kind === "foam") {
    const foam =
      r.hazardFoam ||
      (r.hazardFoam = r.material({
        color: "#efa0cf",
        emissive: "#7a2e59",
        emissiveIntensity: 0.25,
        roughness: 0.55,
      }));
    const geo = r.geo("foam-lump", () => new THREE.SphereGeometry(1, 14, 10));
    for (const [x, y, z, s] of [
      [0, 0.9, 0, 1.05],
      [0.45, 1.6, 0.3, 0.75],
      [-0.4, 1.5, -0.35, 0.8],
      [0.1, 2.2, 0, 0.6],
    ])
      r.mesh(root, geo, foam, [x, y, z], [s * 1.25, s, s * 1.25]);
    return;
  }
  // Canister: a coloured gas cylinder with a white band and dark cap.
  const body =
    (r.hazardBody ||= {})[kind] ||
    (r.hazardBody[kind] = r.material({
      color: COLORS[kind],
      roughness: 0.42,
      metalness: 0.35,
      emissive: COLORS[kind],
      emissiveIntensity: 0.12,
    }));
  const band = r.hazardBand || (r.hazardBand = r.material({ color: "#f1efe7", roughness: 0.6 }));
  const cap =
    r.hazardCap || (r.hazardCap = r.material({ color: "#2b2f33", roughness: 0.5, metalness: 0.6 }));
  r.cylinder(root, body, [0, 0.62, 0], 0.36, 1.24, "y", 20);
  r.cylinder(root, band, [0, 0.8, 0], 0.365, 0.16, "y", 20);
  r.cylinder(root, cap, [0, 1.32, 0], 0.16, 0.18, "y", 14);
  r.cylinder(root, cap, [0, 0.03, 0], 0.37, 0.06, "y", 20);
}

export class HazardDressing {
  constructor(r) {
    this.r = r;
    this.effects = new Map();
    this.marks = new Map();
    this.flashUntil = 0;
  }
  update(t) {
    const r = this.r,
      a = r.g.arena;
    this.sync(
      this.effects,
      a.fx.filter((f) => EFFECTS[f.kind] && f.until > a.time),
      (f) => this.effect(f),
      (root, f) => {
        const spec = EFFECTS[f.kind],
          life = Math.max(0, Math.min(1, (f.until - a.time) / root.userData.duration));
        root.position.set(f.x * SCALE, spec.flat ? 0.08 : 0.4, f.y * SCALE);
        if (!spec.bolt) root.scale.setScalar(f.radius * SCALE * (spec.grow * (1 - life) + 0.35));
        for (const m of root.children) m.material.opacity = spec.opacity * Math.min(1, life * 2);
        if (f.kind === "lightning" && !this.seenBolts?.has(f.id)) {
          (this.seenBolts ||= new Set()).add(f.id);
          this.flashUntil = performance.now() + 140;
        }
      },
    );
    const strikes = a.disaster?.strikes || [];
    this.sync(
      this.marks,
      strikes,
      (s) => this.mark(s),
      (root, s) => {
        const total = s.kind === "storm" ? 1.6 : 1.4,
          left = Math.max(0, s.at - a.time),
          grown = 1 - left / total,
          still = r.motion.matches;
        root.position.set(s.x * SCALE, 0.04, s.y * SCALE);
        if (s.kind === "storm") {
          // Hologram flat on the ground: a spinning grid disc and a pulse
          // ring sweeping inwards, flickering faster as the strike nears.
          const [disc, pulse] = root.children,
            flicker = still ? 1 : 0.75 + 0.25 * Math.sin(t * (left < 0.5 ? 40 : 14));
          disc.rotation.z = still ? 0 : t * 1.6;
          disc.material.opacity = (0.45 + 0.45 * grown) * flicker;
          const sweep = still ? 0.5 : 1 - ((t * (left < 0.5 ? 2.5 : 1.2)) % 1);
          pulse.scale.setScalar(1.3 * SCALE * (0.2 + 0.8 * sweep));
          pulse.material.opacity = (0.3 + 0.5 * grown) * (1 - sweep * 0.5);
        } else {
          // Cracks spread out from the impact point and start to glow.
          const crack = root.children[0];
          crack.scale.setScalar(0.45 + 0.55 * Math.min(1, grown * 1.3));
          crack.material.opacity = 0.55 + 0.45 * grown;
          crack.material.emissiveIntensity =
            0.4 + (still ? 0.6 : 0.6 + 0.4 * Math.sin(t * 20)) * grown;
        }
      },
    );
    this.updateTerrain();
    this.updateStorm(t);
    this.updateHaze(t);
    this.updateShock();
  }
  sync(map, items, make, place) {
    const live = new Set();
    for (const item of items) {
      live.add(item.id);
      let root = map.get(item.id);
      if (!root) map.set(item.id, (root = make(item)));
      place(root, item);
    }
    for (const [id, root] of map)
      if (!live.has(id)) {
        this.r.dynamic.remove(root);
        root.traverse((o) => {
          if (o.isMesh) {
            o.material.dispose();
            this.r.materials.delete(o.material);
          }
        });
        map.delete(id);
      }
  }
  effect(f) {
    const r = this.r,
      spec = EFFECTS[f.kind],
      root = new THREE.Group();
    root.userData.duration = Math.max(0.45, f.until - r.g.arena.time);
    const mat = r.material({
      color: spec.color,
      emissive: spec.emissive,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: spec.opacity,
      depthWrite: false,
      roughness: 0.8,
      // Fire and lightning add light instead of painting a solid shell.
      blending: spec.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    if (spec.bolt) {
      // A jagged column of light from the sky to the strike point.
      let x = 0,
        z = 0;
      for (let i = 0; i < 6; i++) {
        const nx = (Math.random() - 0.5) * 1.6,
          nz = (Math.random() - 0.5) * 1.6;
        const seg = r.mesh(
          root,
          r.geo("bolt", () => new THREE.CylinderGeometry(1, 1, 1, 6)),
          mat,
          [(x + nx) / 2, 30 - i * 5 - 2.5, (z + nz) / 2],
          [0.12, 5.4, 0.12],
        );
        seg.rotation.z = Math.atan2(nx - x, 5) * -1;
        seg.castShadow = false;
        x = nx;
        z = nz;
      }
    } else if (spec.flat) {
      const ring = r.mesh(
        root,
        r.geo("hazard-ring", () => new THREE.RingGeometry(0.7, 1, 40)),
        mat,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.castShadow = false;
    } else {
      const ball = r.mesh(
        root,
        r.geo("hazard-ball", () => new THREE.SphereGeometry(1, 18, 12)),
        mat,
      );
      ball.castShadow = false;
      if (f.kind === "blast") {
        // A white-hot core inside the fireball.
        const core = r.mesh(
          root,
          r.geo("hazard-ball", () => new THREE.SphereGeometry(1, 18, 12)),
          r.material({
            color: "#fff3c4",
            emissive: "#ffe08a",
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
          [0, 0, 0],
          [0.45, 0.45, 0.45],
        );
        core.castShadow = false;
      }
    }
    r.dynamic.add(root);
    return root;
  }
  mark(s) {
    const r = this.r,
      root = new THREE.Group();
    const flat = (geo, mat, size) => {
      const m = r.mesh(root, geo, mat, [0, 0, 0], [size, size, size]);
      m.rotation.x = -Math.PI / 2;
      m.castShadow = m.receiveShadow = false;
      return m;
    };
    if (s.kind === "storm") {
      flat(
        r.geo("holo-disc", () => new THREE.CircleGeometry(1, 48)),
        new THREE.MeshBasicMaterial({
          map: holoDisc(),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          color: "#7fe6ff",
          side: THREE.DoubleSide,
        }),
        1.3 * SCALE,
      );
      flat(
        r.geo("holo-pulse", () => new THREE.RingGeometry(0.93, 1, 48)),
        new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          color: "#9ff0ff",
          side: THREE.DoubleSide,
        }),
        1.3 * SCALE,
      ).position.y = 0.01;
    } else {
      const crack = flat(
        r.geo("crack-plane", () => new THREE.PlaneGeometry(2, 2)),
        new THREE.MeshStandardMaterial({
          map: crackTexture(),
          transparent: true,
          depthWrite: false,
          roughness: 1,
          emissive: "#ff6a1e",
          emissiveMap: crackGlow(),
          emissiveIntensity: 0.4,
        }),
        1.3 * SCALE,
      );
      crack.rotation.z = (s.id % 7) * 0.9;
      r.materials.add(crack.material);
    }
    r.dynamic.add(root);
    return root;
  }
  /** The Red Haze edge: a glowing red curtain along the safe-zone square, so
   * you see it coming. It appears just before the haze starts, follows the
   * zone as it shrinks and glows harder the closer you are. */
  updateHaze(t) {
    const r = this.r,
      g = r.g,
      a = g.arena,
      z = a.zone,
      show = !["training", "protocol"].includes(g.mode) && !!z && a.time > z.delay - 3;
    if (!show) {
      if (this.haze) this.haze.visible = false;
      if (this.embers) this.embers.visible = false;
      return;
    }
    this.updateEmbers(t, z, a);
    const walls = (this.haze ||= this.makeHaze()),
      p = g.camera(),
      half = Math.max(0.05, z.half),
      length = half * 2 * SCALE,
      inside = half - Math.max(Math.abs(p.x - z.cx), Math.abs(p.y - z.cy)),
      near = Math.max(0, 1 - Math.abs(inside) / 4),
      rise = Math.min(1, (a.time - (z.delay - 3)) / 3),
      pulse = r.motion.matches ? 0 : Math.sin(t * 3) * 0.06;
    walls.visible = true;
    walls.children.forEach((wall, i) => {
      const side = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ][i];
      wall.position.set((z.cx + side[0] * half) * SCALE, 0, (z.cy + side[1] * half) * SCALE);
      wall.scale.x = length;
      wall.material.map.repeat.x = length / 9;
      wall.material.map.offset.x = r.motion.matches ? 0 : (t * 0.03 * (i % 2 ? 1 : -1)) % 1;
      wall.material.opacity = (0.4 + 0.5 * near + pulse) * rise;
    });
  }
  /** Inside the Red Haze: glowing red embers drift around you, so it reads
   * as a space you are standing in, not a line you crossed. */
  updateEmbers(t, z, a) {
    const r = this.r,
      p = r.g.camera(),
      outside = a.time > z.delay && Math.max(Math.abs(p.x - z.cx), Math.abs(p.y - z.cy)) > z.half;
    this.hazeIn = Math.max(0, Math.min(1, (this.hazeIn || 0) + (outside ? 0.04 : -0.06)));
    if (!this.hazeIn) {
      if (this.embers) this.embers.visible = false;
      return;
    }
    if (!this.embers) {
      const count = 260,
        pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++)
        pos.set([(Math.random() - 0.5) * 24, Math.random() * 6, (Math.random() - 0.5) * 24], i * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.embers = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color: "#ff5a3a",
          map: emberTexture(),
          alphaTest: 0.01,
          size: 0.12,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
          toneMapped: false,
        }),
      );
      this.embers.frustumCulled = false;
      r.scene.add(this.embers);
    }
    const e = this.embers;
    e.visible = true;
    e.position.set(p.x * SCALE, 0, p.y * SCALE);
    e.material.opacity = 0.85 * this.hazeIn;
    if (!r.motion.matches) {
      const pos = e.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + 0.012 + Math.sin(t * 2 + i) * 0.004;
        if (y > 6) y -= 6;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.7 + i * 1.3) * 0.006);
      }
      pos.needsUpdate = true;
    }
  }
  /** Electric arcs crackling over fighters still electrified by lightning
   * (your own shock shows on screen instead). Redrawn ~14 times a second. */
  updateShock() {
    const r = this.r,
      a = r.g.arena,
      self = r.g.camera(),
      shocked = a.entities.filter((e) => e.shockUntil > a.time && e.hp > 0 && e !== self);
    const now = performance.now(),
      redraw = now - (this.arcAt || 0) > 70;
    if (redraw) this.arcAt = now;
    this.sync(
      (this.arcs ||= new Map()),
      shocked.map((e) => ({ id: e.id, e })),
      () => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 2 * 30), 3));
        const lines = new THREE.LineSegments(
          geo,
          new THREE.LineBasicMaterial({
            color: "#9fd8ff",
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        lines.frustumCulled = false;
        const root = new THREE.Group();
        root.add(lines);
        r.dynamic.add(root);
        return root;
      },
      (root, { e }) => {
        root.position.set(e.x * SCALE, 0, e.y * SCALE);
        if (!redraw && root.userData.drawn) return;
        root.userData.drawn = true;
        // Three short jagged arcs at random heights around the body.
        const pos = root.children[0].geometry.attributes.position;
        let k = 0;
        for (let arc = 0; arc < 3; arc++) {
          let ang = Math.random() * Math.PI * 2,
            y = 0.3 + Math.random() * 1.5,
            px = Math.cos(ang) * 0.45,
            pz = Math.sin(ang) * 0.45;
          for (let seg = 0; seg < 10; seg++, k++) {
            ang += 0.35 + Math.random() * 0.3;
            const ny = y + (Math.random() - 0.5) * 0.35,
              rad = 0.38 + Math.random() * 0.18,
              nx = Math.cos(ang) * rad,
              nz = Math.sin(ang) * rad;
            pos.setXYZ(k * 2, px, y, pz);
            pos.setXYZ(k * 2 + 1, nx, ny, nz);
            px = nx;
            pz = nz;
            y = ny;
          }
        }
        pos.needsUpdate = true;
        root.children[0].material.opacity = 0.6 + Math.random() * 0.4;
      },
    );
  }
  makeHaze() {
    const r = this.r,
      root = new THREE.Group(),
      geo = new THREE.PlaneGeometry(1, 8);
    geo.translate(0, 4, 0);
    for (let i = 0; i < 4; i++) {
      const map = hazeTexture().clone();
      map.needsUpdate = true;
      const wall = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          map,
          color: "#ff3a2e",
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          fog: false,
          toneMapped: false,
        }),
      );
      wall.rotation.y = i % 2 ? Math.PI / 2 : 0;
      wall.renderOrder = 2;
      root.add(wall);
    }
    r.scene.add(root);
    return root;
  }
  /** Lasting ground damage, drawn as one instanced batch per kind: quake
   * cracks with buckled slabs, rubble from collapsed walls, scorch marks
   * and sand drifts. */
  updateTerrain() {
    const r = this.r,
      list = r.g.arena.terrain || [],
      key = list.length + ":" + list.map((t) => t.kind[0]).join("");
    if (key === this.terrainKey) return;
    this.terrainKey = key;
    const kinds = (this.terrain ||= this.makeTerrain()),
      m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler(),
      v = new THREE.Vector3(),
      sc = new THREE.Vector3(),
      counts = {};
    const put = (name, x, y, z, rx, ry, rz, sx, sy, sz) => {
      const mesh = kinds[name],
        i = (counts[name] = (counts[name] || 0) + 1) - 1;
      if (i >= mesh.instanceMatrix.count) return;
      mesh.setMatrixAt(
        i,
        m.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(sx, sy, sz)),
      );
    };
    for (const t of list) {
      const x = t.x * SCALE,
        z = t.y * SCALE,
        n = t.seed || 0,
        f = (k) => (((Math.sin(n * 12.99 + k * 78.2) * 43758.5453) % 1) + 1) % 1;
      if (t.kind === "crack") {
        put("crack", x, 0.03, z, -Math.PI / 2, 0, f(1) * 6.28, SCALE * 0.55, SCALE * 0.55, 1);
        // Uneven ground: two broken slabs lifted and tilted.
        for (let k = 0; k < 2; k++)
          put(
            "slab",
            x + (f(2 + k) - 0.5) * 1.6,
            0.02 + f(4 + k) * 0.1,
            z + (f(6 + k) - 0.5) * 1.6,
            (f(8 + k) - 0.5) * 0.6,
            f(10 + k) * 3,
            (f(12 + k) - 0.5) * 0.6,
            0.8 + f(14 + k) * 0.6,
            0.3,
            0.6 + f(16 + k) * 0.6,
          );
      } else if (t.kind === "rubble") {
        for (let k = 0; k < 4; k++)
          put(
            "rubble",
            x + (f(k) - 0.5) * 2.2,
            0.15 + f(k + 5) * 0.2,
            z + (f(k + 9) - 0.5) * 2.2,
            f(k + 3) * 3,
            f(k + 7) * 3,
            f(k + 11) * 3,
            0.5 + f(k + 13) * 0.6,
            0.35 + f(k + 15) * 0.4,
            0.5 + f(k + 17) * 0.6,
          );
      } else if (t.kind === "scorch")
        put("scorch", x, 0.025, z, -Math.PI / 2, 0, f(1) * 6.28, SCALE * 0.6, SCALE * 0.6, 1);
      else if (t.kind === "sand") {
        // A soft-edged sand patch on the ground with a low ridge in it,
        // half-sunk so it reads as piled on the floor, not resting on it.
        put("sandpatch", x, 0.022, z, -Math.PI / 2, 0, f(3) * 6.28, SCALE * 0.62, SCALE * 0.62, 1);
        put(
          "sand",
          x + (f(1) - 0.5) * 0.8,
          -0.06,
          z + (f(2) - 0.5) * 0.8,
          0,
          f(3) * 6.28,
          0,
          1.1 + f(4) * 0.4,
          0.2 + f(5) * 0.08,
          0.6 + f(6) * 0.3,
        );
      }
    }
    for (const [name, mesh] of Object.entries(kinds)) {
      mesh.count = Math.min(counts[name] || 0, mesh.instanceMatrix.count);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = mesh.count > 0;
    }
  }
  makeTerrain() {
    const r = this.r,
      make = (geo, mat, max, shadows) => {
        const mesh = new THREE.InstancedMesh(geo, mat, max);
        mesh.count = 0;
        mesh.castShadow = shadows;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        r.materials.add(mat);
        r.scene.add(mesh);
        return mesh;
      };
    const decal = (map, color) =>
      new THREE.MeshStandardMaterial({
        map,
        color,
        transparent: true,
        depthWrite: false,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
    return {
      crack: make(new THREE.PlaneGeometry(2, 2), decal(crackTexture(), "#ffffff"), 400, false),
      slab: make(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: "#3d3d40", roughness: 1, flatShading: true }),
        800,
        true,
      ),
      rubble: make(
        new THREE.DodecahedronGeometry(0.5, 0),
        new THREE.MeshStandardMaterial({ color: "#8a7f72", roughness: 1, flatShading: true }),
        1600,
        true,
      ),
      scorch: make(new THREE.PlaneGeometry(2, 2), decal(scorchTexture(), "#ffffff"), 400, false),
      sand: make(
        new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: "#b89e72", roughness: 1 }),
        400,
        false,
      ),
      sandpatch: make(new THREE.PlaneGeometry(2, 2), decal(sandTexture(), "#ffffff"), 400, false),
    };
  }
  /** A thunderstorm (rolling black clouds, rain, distant sheet lightning) or
   * a sandstorm sky, both fading in and out over the real sky. */
  updateStorm(t) {
    const r = this.r,
      d = r.g.arena.disaster,
      k = this.fade();
    if (!k) {
      if (this.storm) this.storm.root.visible = false;
      return;
    }
    const s = (this.storm ||= this.makeStorm()),
      now = performance.now(),
      still = r.motion.matches,
      storm = d.kind === "storm";
    s.root.visible = true;
    s.dome.material.map = storm ? s.clouds : null;
    if (s.dome.material.userData.kind !== d.kind) {
      s.dome.material.userData.kind = d.kind;
      s.dome.material.needsUpdate = true;
    }
    s.dome.material.opacity = k;
    s.rain.visible = storm;
    s.rain.material.opacity = 0.35 * k;
    if (!storm) {
      s.root.position.copy(r.camera.position);
      s.dome.material.color.set("#b39a72");
      return;
    }
    s.root.position.copy(r.camera.position);
    s.dome.rotation.y = still ? 0 : t * 0.012;
    s.clouds.offset.x = still ? 0 : t * 0.004;
    // Distant flashes between strikes (presentation only).
    if (!still && now > (this.nextSheet || 0)) {
      this.nextSheet = now + 1800 + Math.random() * 3200;
      this.sheetUntil = now + 90 + Math.random() * 120;
    }
    const lit = now < this.flashUntil ? 1 : now < (this.sheetUntil || 0) ? 0.55 : 0;
    s.dome.material.color.setRGB(1, 1, 1).multiplyScalar(1 + lit * 1.8);
    // Rain falls around the camera and wraps.
    const pos = s.rain.geometry.attributes.position,
      fall = Math.min(0.1, (now - (this.rainAt || now)) / 1000) * 34;
    this.rainAt = now;
    if (!still)
      for (let i = 0; i < pos.count; i += 2) {
        let y = pos.getY(i) - fall;
        if (y < -2) y += 18;
        pos.setY(i, y);
        pos.setY(i + 1, y + 0.9);
      }
    pos.needsUpdate = true;
  }
  makeStorm() {
    const r = this.r,
      root = new THREE.Group(),
      clouds = stormClouds();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 16),
      new THREE.MeshBasicMaterial({
        map: clouds,
        side: THREE.BackSide,
        toneMapped: false,
        fog: false,
        depthWrite: false,
        transparent: true,
      }),
    );
    dome.renderOrder = -1;
    root.add(dome);
    const count = 700,
      p = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30,
        y = Math.random() * 18 - 2,
        z = (Math.random() - 0.5) * 30;
      p.set([x, y, z, x + 0.12, y + 0.9, z], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const rain = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: "#a9bdd6",
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    rain.frustumCulled = false;
    root.add(rain);
    r.scene.add(root);
    return { root, dome, rain, clouds };
  }
  /** Storm light: the sun is hidden behind cloud, and lightning lights the
   * scene up for a moment. Scales this frame's lights and returns a function
   * that puts them back after rendering, so the day lighting's own easing
   * never compounds the change. */
  dim() {
    const r = this.r,
      a = r.g.arena,
      d = a.disaster;
    const k = d?.kind === "storm" ? this.fade() : 0;
    if (!k) return null;
    const now = performance.now(),
      lit = now < this.flashUntil ? 1 : now < (this.sheetUntil || 0) ? 0.4 : 0,
      saved = [r.sun.intensity, r.hemisphere.intensity, r.scene.environmentIntensity],
      mix = (to) => 1 + (to - 1) * k;
    r.sun.intensity *= mix(0.12 + lit * 0.5);
    r.hemisphere.intensity *= mix(0.75 + lit * 3);
    r.scene.environmentIntensity *= mix(0.35 + lit * 0.9);
    return () => {
      [r.sun.intensity, r.hemisphere.intensity, r.scene.environmentIntensity] = saved;
    };
  }
  /** How far the weather has rolled in, 0–1: it builds over the last two
   * seconds of the warning and first second of the disaster, and clears over
   * its last three seconds. Earthquakes have no weather. */
  fade() {
    const a = this.r.g.arena,
      d = a.disaster;
    if (!d || d.kind === "quake") return 0;
    const t = a.time,
      k = Math.min(1, Math.max(0, (t - (d.startAt - 2)) / 3), Math.max(0, (d.endAt - t) / 3));
    return t >= d.endAt ? 0 : k;
  }
  /** Target fog for the active disaster and how far to blend towards it. */
  weather() {
    const d = this.r.g.arena.disaster,
      k = this.fade();
    if (!k) return null;
    if (d.kind === "sandstorm") return { fog: "#b39a72", density: 0.09, k };
    const now = performance.now();
    return now < this.flashUntil
      ? { fog: "#c9d4ea", density: 0.014, k }
      : now < (this.sheetUntil || 0)
        ? { fog: "#4a5468", density: 0.028, k }
        : { fog: "#1d232d", density: 0.034, k };
  }
  /** Camera shake during an earthquake, and a stumbling sway when walking
   * over cracked, rubble-strewn or sandy ground (none with reduced motion). */
  shake(camera, t) {
    const a = this.r.g.arena,
      d = a.disaster,
      p = this.r.g.camera();
    if (this.r.motion.matches) return;
    const moved = Math.hypot(p.x - (this.lastX ?? p.x), p.y - (this.lastY ?? p.y));
    this.lastX = p.x;
    this.lastY = p.y;
    const footing = a.footing?.(p) ?? 1;
    if (footing < 1 && moved > 0.002 && p.hp > 0) {
      const k = (1 - footing) * 4;
      camera.position.y += Math.abs(Math.sin(t * 11)) * 0.05 * k - 0.03 * k;
      camera.rotation.z += Math.sin(t * 5.5) * 0.012 * k;
    }
    if (!d || d.kind !== "quake" || a.time < d.startAt || a.time >= d.endAt) return;
    const k = 0.06 * Math.min(1, (a.time - d.startAt) / 1.5, (d.endAt - a.time) / 1.5);
    camera.position.x += Math.sin(t * 47) * k;
    camera.position.y += Math.sin(t * 61 + 1) * k * 0.6;
    camera.rotation.z += Math.sin(t * 37) * k * 0.15;
  }
}

// Procedural textures, drawn once.
const canvasTexture = (w, h, draw) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};
const once = (fn) => {
  let value;
  return () => (value ||= fn());
};
// Jagged cracks branching out from the middle.
const crackLines = (c, w, color, width) => {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.strokeStyle = color;
  c.lineCap = "round";
  const branch = (x, y, angle, length, thick) => {
    if (thick < 0.6 || length < 8) return;
    c.lineWidth = thick * width;
    c.beginPath();
    c.moveTo(x, y);
    let px = x,
      py = y;
    for (let i = 0; i < 6; i++) {
      angle += (rand() - 0.5) * 0.7;
      px += Math.cos(angle) * (length / 6);
      py += Math.sin(angle) * (length / 6);
      c.lineTo(px, py);
      if (rand() < 0.3)
        branch(px, py, angle + (rand() < 0.5 ? 0.8 : -0.8), length * 0.5, thick * 0.6);
    }
    c.stroke();
  };
  for (let i = 0; i < 7; i++)
    branch(w / 2, w / 2, (i / 7) * Math.PI * 2 + rand() * 0.5, w * (0.32 + rand() * 0.14), 3.2);
};
const crackTexture = once(() =>
  canvasTexture(256, 256, (c, w) => crackLines(c, w, "#0f0c09", 3.4)),
);
const crackGlow = once(() =>
  canvasTexture(256, 256, (c, w) => {
    c.filter = "blur(3px)";
    crackLines(c, w, "#ffffff", 5.5);
  }),
);
const scorchTexture = once(() =>
  canvasTexture(128, 128, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2);
    g.addColorStop(0, "#0d0b0aee");
    g.addColorStop(0.45, "#1e1a17aa");
    g.addColorStop(1, "#1e1a1700");
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  }),
);
// Hologram disc: rings, ticks and a crosshair.
const holoDisc = once(() =>
  canvasTexture(256, 256, (c, w) => {
    const m = w / 2;
    c.strokeStyle = "#ffffff";
    for (const [r, lw, a] of [
      [124, 4, 1],
      [104, 2, 0.8],
      [70, 2, 0.6],
      [36, 3, 0.9],
    ]) {
      c.globalAlpha = a;
      c.lineWidth = lw;
      c.beginPath();
      c.arc(m, m, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 0.9;
    c.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        r0 = i % 2 ? 108 : 112;
      c.beginPath();
      c.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0);
      c.lineTo(m + Math.cos(a) * 122, m + Math.sin(a) * 122);
      c.stroke();
    }
    c.globalAlpha = 0.5;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(m - 104, m);
    c.lineTo(m + 104, m);
    c.moveTo(m, m - 104);
    c.lineTo(m, m + 104);
    c.stroke();
    const g = c.createRadialGradient(m, m, 0, m, m, 124);
    g.addColorStop(0, "#ffffff33");
    g.addColorStop(1, "#ffffff00");
    c.globalAlpha = 1;
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  }),
);
// Storm clouds: dark, heavy and lumpy, darker towards the horizon.
const stormClouds = once(() => {
  const tex = canvasTexture(1024, 512, (c, w, h) => {
    // Top of the canvas is straight up; the horizon is at about 0.5.
    const base = c.createLinearGradient(0, 0, 0, h * 0.55);
    base.addColorStop(0, "#0b0e13");
    base.addColorStop(1, "#262c36");
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // Heavy, lumpy cloud banks: lit grey-blue tops over near-black bellies.
    for (let i = 0; i < 1100; i++) {
      const x = rand() * w,
        y = h * 0.05 + rand() * h * 0.47,
        r = 16 + rand() * 60 * (0.5 + y / h),
        light = rand() < 0.35,
        g = c.createRadialGradient(x, y - r * 0.35, r * 0.1, x, y, r);
      if (light) {
        g.addColorStop(0, "rgba(120,130,150,0.55)");
        g.addColorStop(0.5, "rgba(70,78,94,0.35)");
      } else {
        g.addColorStop(0, "rgba(28,32,40,0.75)");
        g.addColorStop(0.6, "rgba(16,19,25,0.45)");
      }
      g.addColorStop(1, "rgba(16,19,25,0)");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // A sickly glow low on the horizon, below the clouds.
    const glow = c.createLinearGradient(0, h * 0.42, 0, h * 0.56);
    glow.addColorStop(0, "#3a4a5200");
    glow.addColorStop(0.7, "#4c5f5ccc");
    glow.addColorStop(1, "#1b2225ff");
    c.fillStyle = glow;
    c.fillRect(0, h * 0.42, w, h * 0.58);
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
});
// Red Haze curtain: bright at the ground, fading upwards, with drifting
// vertical wisps (tiles horizontally and scrolls upwards).
const hazeTexture = once(() => {
  const tex = canvasTexture(256, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "#ffffffee");
    g.addColorStop(0.08, "#ffffff99");
    g.addColorStop(0.5, "#ffffff40");
    g.addColorStop(1, "#ffffff00");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    let seed = 5;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    c.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 40; i++) {
      const x = rand() * w,
        width = 4 + rand() * 18;
      const gap = c.createLinearGradient(x - width, 0, x + width, 0);
      gap.addColorStop(0, "#00000000");
      gap.addColorStop(0.5, `rgba(0,0,0,${0.3 + rand() * 0.4})`);
      gap.addColorStop(1, "#00000000");
      c.fillStyle = gap;
      c.fillRect(x - width, 0, width * 2, h);
    }
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#ffffff";
    c.fillRect(0, h - 3, w, 3);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
});
// A soft round glow for each Red Haze ember.
const emberTexture = once(() =>
  canvasTexture(64, 64, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "#ffffffff");
    g.addColorStop(0.25, "#ffffffaa");
    g.addColorStop(1, "#ffffff00");
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
  }),
);
// Sand drift: a sandy patch that thins out to the edges.
const sandTexture = once(() =>
  canvasTexture(128, 128, (c, w) => {
    let seed = 3;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++) {
      const x = w / 2 + (rand() - 0.5) * w * 0.55,
        y = w / 2 + (rand() - 0.5) * w * 0.55,
        r = 8 + rand() * 22,
        g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(196,170,124,0.35)");
      g.addColorStop(1, "rgba(196,170,124,0)");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }),
);
