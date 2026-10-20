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
        const left = Math.max(0, s.at - a.time),
          pulse = r.motion.matches
            ? 0.8
            : 0.55 + 0.45 * Math.abs(Math.sin(t * (left < 0.6 ? 18 : 9)));
        root.position.set(s.x * SCALE, 0.05, s.y * SCALE);
        root.children[0].material.opacity = pulse;
        root.children[1].material.opacity = 0.15 + (1 - left / 1.6) * 0.3;
      },
    );
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
      root = new THREE.Group(),
      color = s.kind === "storm" ? "#fff2a8" : "#ff8a3d";
    const ring = r.mesh(
      root,
      r.geo("strike-ring", () => new THREE.RingGeometry(0.82, 1, 40)),
      r.material({
        color,
        emissive: color,
        emissiveIntensity: 1.4,
        transparent: true,
        depthWrite: false,
      }),
    );
    const fill = r.mesh(
      root,
      r.geo("strike-fill", () => new THREE.CircleGeometry(0.82, 40)),
      r.material({
        color: "#ff3b2f",
        emissive: "#ff3b2f",
        emissiveIntensity: 0.8,
        transparent: true,
        depthWrite: false,
      }),
    );
    for (const m of [ring, fill]) {
      m.rotation.x = -Math.PI / 2;
      m.castShadow = false;
    }
    root.scale.setScalar(1.3 * SCALE);
    r.dynamic.add(root);
    return root;
  }
  /** Fog / sky for the active disaster, or null. */
  weather() {
    const a = this.r.g.arena,
      d = a.disaster;
    if (!d || a.time < d.startAt || a.time >= d.endAt) return null;
    if (d.kind === "sandstorm") return { fog: "#b39a72", density: 0.09, sky: true };
    if (d.kind === "storm")
      return performance.now() < this.flashUntil
        ? { fog: "#dfe6f2", density: 0.012, sky: true }
        : { fog: "#3c4452", density: 0.03, sky: true };
    return null;
  }
  /** Camera shake during an earthquake (none with reduced motion). */
  shake(camera, t) {
    const a = this.r.g.arena,
      d = a.disaster;
    if (
      this.r.motion.matches ||
      !d ||
      d.kind !== "quake" ||
      a.time < d.startAt ||
      a.time >= d.endAt
    )
      return;
    const k = 0.06 * Math.min(1, (a.time - d.startAt) / 1.5, (d.endAt - a.time) / 1.5);
    camera.position.x += Math.sin(t * 47) * k;
    camera.position.y += Math.sin(t * 61 + 1) * k * 0.6;
    camera.rotation.z += Math.sin(t * 37) * k * 0.15;
  }
}
