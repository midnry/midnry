/** Visuals for mid-match events: flickering fire with real firelight, a
 * stretcher at the south gate, a delivery crate with a smoke flare. The
 * sandstorm is fog, applied by the renderer. Presentation only. */
import * as THREE from "three";
import { buildSupplyBox, buildMedicalCase } from "./interactables.js";

const SCALE = 3;

export class EventDressing {
  constructor(r) {
    this.r = r;
    this.root = new THREE.Group();
    this.root.name = "match-events";
    r.scene.add(this.root);
    this.items = new Map();
    this.materials = [];
    this.geometries = [];
    // One firelight, created up front so shaders never recompile mid-match.
    this.fireLight = new THREE.PointLight("#ff8a3c", 0, 9, 2);
    this.fireLight.visible = true;
    r.scene.add(this.fireLight);
  }
  mat(make) {
    const m = make();
    this.materials.push(m);
    return m;
  }
  geo(make) {
    const g = make();
    this.geometries.push(g);
    return g;
  }
  shared() {
    if (this.parts) return this.parts;
    this.parts = {
      flame: this.geo(() => new THREE.ConeGeometry(0.28, 1, 10, 1, true)),
      smoke: this.geo(() => new THREE.SphereGeometry(0.4, 10, 8)),
      box: this.geo(() => new THREE.BoxGeometry(1, 1, 1)),
      flameOuter: this.mat(
        () =>
          new THREE.MeshBasicMaterial({
            color: new THREE.Color("#ff6a1a").multiplyScalar(2.2),
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
      flameInner: this.mat(
        () =>
          new THREE.MeshBasicMaterial({
            color: new THREE.Color("#ffd27a").multiplyScalar(2.6),
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
      smokeMat: this.mat(
        () =>
          new THREE.MeshBasicMaterial({
            color: "#2a2724",
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
          }),
      ),
      flareSmoke: this.mat(
        () =>
          new THREE.MeshBasicMaterial({
            color: "#ff7a2e",
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
          }),
      ),
      canvas: this.mat(() => new THREE.MeshStandardMaterial({ color: "#5c6b4f", roughness: 0.9 })),
      blanket: this.mat(
        () => new THREE.MeshStandardMaterial({ color: "#7d2f2a", roughness: 0.95 }),
      ),
      pole: this.mat(
        () => new THREE.MeshStandardMaterial({ color: "#3b3f3e", roughness: 0.5, metalness: 0.6 }),
      ),
    };
    return this.parts;
  }
  build(ev) {
    const p = this.shared(),
      group = new THREE.Group();
    group.position.set(ev.x * SCALE, 0, ev.y * SCALE);
    const add = (geometry, material, pos, scale = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...pos);
      mesh.scale.set(...scale);
      mesh.userData.noRoomCull = true;
      group.add(mesh);
      return mesh;
    };
    const item = { group, flames: [], smoke: [], kind: ev.kind };
    if (ev.kind === "fire") {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2,
          d = i === 0 ? 0 : 0.35;
        item.flames.push(
          add(
            p.flame,
            i % 2 ? p.flameInner : p.flameOuter,
            [Math.cos(a) * d, 0.5, Math.sin(a) * d],
            [1, 1, 1],
          ),
        );
      }
      for (let i = 0; i < 4; i++) item.smoke.push(add(p.smoke, p.smokeMat, [0, 1.6 + i * 0.6, 0]));
    } else if (ev.kind === "casualty") {
      add(p.box, p.canvas, [0, 0.45, 0], [0.7, 0.06, 2]);
      for (const x of [-0.36, 0.36]) add(p.box, p.pole, [x, 0.45, 0], [0.05, 0.05, 2.4]);
      for (const z of [-0.8, 0.8])
        for (const x of [-0.3, 0.3]) add(p.box, p.pole, [x, 0.22, z], [0.04, 0.44, 0.04]);
      add(p.box, p.blanket, [0, 0.58, 0.15], [0.6, 0.2, 1.3]);
      add(p.box, p.canvas, [0, 0.58, -0.75], [0.3, 0.18, 0.3]);
    } else if (ev.kind === "drop") {
      const kit = this.r.propKit;
      const place = (name, x, y, z, yaw) => {
        if (name === "crate" || name === "crateOpen") {
          const size = kit?.[name]?.size || new THREE.Vector3(0.7, 0.35, 0.45);
          const mesh = buildSupplyBox(this.r, group, size.toArray());
          mesh.position.set(x, y, z);
          mesh.rotation.y = yaw;
          return;
        }
        if (name === "medkit") {
          const size = kit?.medkit?.size || new THREE.Vector3(0.78, 0.4, 0.26);
          const med = buildMedicalCase(this.r, group, [x, y + size.y / 2, z], true);
          med.scale.set(size.x / 0.78, size.y / 0.4, size.z / 0.26);
          med.rotation.y = yaw;
          return;
        }
        for (const part of kit?.[name]?.parts || []) {
          const mesh = new THREE.Mesh(part.geometry, part.material);
          const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
          mesh.matrixAutoUpdate = false;
          mesh.matrix.copy(m).multiply(part.matrix);
          group.add(mesh);
        }
      };
      place("crate", 0, 0, 0, 0.2);
      place("crate", 0, 0.27, 0, 0.35);
      place("crateOpen", 0.9, 0, 0.3, -0.4);
      place("medkit", 0.9, 0.3, 0.3, 0.1);
      for (let i = 0; i < 4; i++)
        item.smoke.push(add(p.smoke, p.flareSmoke, [-0.6, 0.4 + i * 0.55, 0]));
    }
    this.root.add(group);
    return item;
  }
  update(view, time) {
    const events = (view?.protocol?.events || []).filter((ev) => ev.x != null);
    const seen = new Set();
    let fire = null;
    for (const ev of events) {
      seen.add(ev.id);
      let item = this.items.get(ev.id);
      if (!item) this.items.set(ev.id, (item = this.build(ev)));
      item.flames.forEach((flame, i) => {
        const f =
          0.75 + Math.sin(time * (9 + i * 2.3) + i) * 0.18 + Math.sin(time * 23 + i * 5) * 0.08;
        flame.scale.set(0.9 + f * 0.25, 0.7 + f * 0.9, 0.9 + f * 0.25);
        flame.position.y = flame.scale.y * 0.5;
      });
      item.smoke.forEach((puff, i) => {
        const t = (time * 0.35 + i / item.smoke.length) % 1;
        puff.position.y = (item.kind === "drop" ? 0.4 : 1.4) + t * 2.6;
        puff.scale.setScalar(0.6 + t * 1.4);
        puff.material.opacity = (item.kind === "drop" ? 0.32 : 0.35) * (1 - t);
      });
      if (ev.kind === "fire") fire = ev;
    }
    for (const [id, item] of this.items)
      if (!seen.has(id)) {
        this.root.remove(item.group);
        this.items.delete(id);
      }
    this.fireLight.intensity = fire ? 26 + Math.sin(time * 17) * 5 + Math.sin(time * 41) * 3 : 0;
    if (fire) this.fireLight.position.set(fire.x * SCALE, 1.3, fire.y * SCALE);
  }
  dispose() {
    this.r.scene.remove(this.root, this.fireLight);
    for (const item of [...this.materials, ...this.geometries]) item.dispose();
  }
}
