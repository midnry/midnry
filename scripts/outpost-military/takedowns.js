/** Victim-only paired skeletal scenes. Never added to the multiplayer arena. */
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { finishActor } from "./realism-characters.js";

const ease = (x) => {
  x = THREE.MathUtils.clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};
const beat = (t, a, b) => ease((t - a) / (b - a));
function joint(model, name) {
  let result;
  model.traverse((o) => {
    if (o.isBone && o.name.replace(/[^a-z]/gi, "").endsWith(name)) result = o;
  });
  return result;
}

export class VictimTakedown {
  constructor(r) {
    this.r = r;
    this.root = new THREE.Group();
    this.root.name = "Private victim takedown";
    this.root.visible = false;
    r.scene.add(this.root);
    this.cameraPoint = new THREE.Vector3();
    this.lookPoint = new THREE.Vector3();
    this.hiddenActors = [];
  }
  makeHuman() {
    const r = this.r,
      model = clone(r.soldier.scene),
      before = new Set(r.materials);
    const mixer = new THREE.AnimationMixer(model);
    const clip = r.soldier.animations.find((c) => c.name === "Idle");
    if (clip) mixer.clipAction(clip).play();
    mixer.update(0);
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.skeleton.update();
        o.computeBoundingBox();
      }
    });
    const bounds = new THREE.Box3().setFromObject(model);
    const factor = 1.82 / Math.max(0.1, bounds.max.y - bounds.min.y);
    model.scale.multiplyScalar(factor);
    model.position.y -= bounds.min.y * factor;
    finishActor(r, model, { x: 0, y: 0 });
    const root = new THREE.Group();
    root.add(model);
    this.root.add(root);
    model.updateMatrixWorld(true);
    const bones = new Map();
    model.traverse((o) => {
      if (o.isBone) bones.set(o.name, { joint: o, base: o.quaternion.clone() });
    });
    return { root, model, mixer, bones, materials: [...r.materials].filter((m) => !before.has(m)) };
  }
  build() {
    this.victim = this.makeHuman();
    this.attacker = this.makeHuman();
    const r = this.r,
      before = new Set(r.materials),
      m = r.weaponMaterials(false);
    this.propMaterials = [...r.materials].filter((x) => !before.has(x));
    this.knife = new THREE.Group();
    this.root.add(this.knife);
    const blade = new THREE.Shape();
    blade.moveTo(-0.012, 0);
    blade.lineTo(0.012, 0);
    blade.lineTo(0.01, 0.16);
    blade.lineTo(0, 0.21);
    blade.lineTo(-0.01, 0.16);
    blade.closePath();
    const geo = r.geo(
      "takedown:steel-blade",
      () =>
        new THREE.ExtrudeGeometry(blade, {
          depth: 0.004,
          bevelEnabled: true,
          bevelSize: 0.0007,
          bevelThickness: 0.0007,
          bevelSegments: 2,
          steps: 1,
        }),
    );
    r.mesh(this.knife, geo, m.steel, [0, 0, 0]);
    r.cylinder(this.knife, m.rubber, [0, -0.044, 0], 0.012, 0.085, "y", 16);
    r.box(this.knife, m.metal, [0, -0.004, 0], [0.048, 0.009, 0.014]);
    this.pistol = new THREE.Group();
    this.root.add(this.pistol);
    r.box(this.pistol, m.metal, [0, 0.015, -0.06], [0.033, 0.035, 0.14]);
    r.box(this.pistol, m.polymer, [0, -0.033, -0.02], [0.028, 0.065, 0.037]).rotation.x = -0.18;
    r.cylinder(this.pistol, m.metal, [0, 0.017, -0.205], 0.017, 0.17, "z", 24);
    r.cylinder(this.pistol, m.rubber, [0, 0.017, -0.292], 0.013, 0.003, "z", 24);
    this.flash = r.mesh(
      this.pistol,
      r.geo("takedown:muzzle", () => new THREE.SphereGeometry(0.012, 12, 8)),
      r.material({ color: "#ffdba0", emissive: "#ffc578", emissiveIntensity: 2 }),
      [0, 0.017, -0.305],
    );
    this.propMaterials.push(this.flash.material);
  }
  resetHuman(human) {
    human.root.position.set(0, 0, 0);
    human.root.rotation.set(0, 0, 0);
    for (const value of human.bones.values()) value.joint.quaternion.copy(value.base);
  }
  bend(human, name, x = 0, y = 0, z = 0) {
    const bone = joint(human.model, name);
    if (!bone) return;
    bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
  }
  /** Two-bone hand reach in scene space, preserving a bent elbow. */
  reach(human, side, point) {
    const arm = joint(human.model, side + "Arm"),
      elbow = joint(human.model, side + "ForeArm"),
      hand = joint(human.model, side + "Hand");
    if (!arm || !elbow || !hand) return;
    this.root.updateMatrixWorld(true);
    const a = arm.getWorldPosition(new THREE.Vector3()),
      b = elbow.getWorldPosition(new THREE.Vector3()),
      c = hand.getWorldPosition(new THREE.Vector3());
    const target = new THREE.Vector3(...point).applyMatrix4(this.root.matrixWorld);
    const l1 = a.distanceTo(b),
      l2 = b.distanceTo(c),
      d = THREE.MathUtils.clamp(a.distanceTo(target), Math.abs(l1 - l2) + 0.005, l1 + l2 - 0.005);
    const dir = target.clone().sub(a).normalize();
    const bend = new THREE.Vector3(side === "Left" ? -0.35 : 0.35, -1, 0.35).transformDirection(
      this.root.matrixWorld,
    );
    bend.addScaledVector(dir, -bend.dot(dir)).normalize();
    const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const wanted = a
      .clone()
      .addScaledVector(dir, along)
      .addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
    const rotate = (j, end, p) => {
      const origin = j.getWorldPosition(new THREE.Vector3());
      const before = end.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
      const after = p.clone().sub(origin).normalize();
      const q = j
        .getWorldQuaternion(new THREE.Quaternion())
        .premultiply(new THREE.Quaternion().setFromUnitVectors(before, after));
      j.quaternion.copy(j.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(q);
      this.root.updateMatrixWorld(true);
    };
    rotate(arm, elbow, wanted);
    rotate(elbow, hand, target);
  }
  handProp(prop, side) {
    const hand = joint(this.attacker.model, side + "Hand");
    if (!hand) return;
    this.root.updateMatrixWorld(true);
    prop.position.copy(hand.getWorldPosition(new THREE.Vector3()));
    this.root.worldToLocal(prop.position);
  }
  update(g) {
    const active = g.deathStage === "takedown" && !!g.deathSequence?.kind;
    this.root.visible = active;
    this.restoreActors();
    if (!active || !this.r.soldier) return false;
    if (!this.victim) this.build();
    const sequence = g.deathSequence,
      t = this.r.motion.matches ? 0.52 : g.takedownProgress || 0,
      sample = Math.floor(t * sequence.takedownDuration * 0.03);
    const origin = sequence.origin;
    // Center the local paired scene within the victim's actual floor tile.
    // Presentation coordinates never move the body or attacker on the server.
    this.root.position.set((Math.floor(origin.x) + 0.5) * 3, 0, (Math.floor(origin.y) + 0.5) * 3);
    this.root.rotation.y = -origin.a - Math.PI / 2;
    if (this.sample !== sample || this.kind !== sequence.kind) {
      this.sample = sample;
      this.kind = sequence.kind;
      const v = this.victim,
        a = this.attacker;
      this.resetHuman(v);
      this.resetHuman(a);
      a.root.position.z = 0.42;
      const grab = beat(t, 0.08, 0.32),
        strike = beat(t, 0.38, 0.53),
        release = beat(t, 0.76, 1);
      this.knife.visible = sequence.kind === "back-stab";
      this.pistol.visible = sequence.kind === "suppressed-shot";
      this.flash.visible =
        sequence.kind === "suppressed-shot" && t > 0.45 && t < 0.5 && !this.r.motion.matches;
      const reduced = this.r.motion.matches;
      const amount = reduced ? 0.25 : 1;
      if (sequence.kind === "back-stab") {
        this.bend(v, "Spine", strike * 0.26 * amount);
        this.reach(a, "Left", [-0.12, 1.47, 0.01]);
        this.reach(a, "Right", [0.12, 1.12, 0.44 - strike * 0.22 + release * 0.18]);
        this.handProp(this.knife, "Right");
        this.knife.rotation.set(-Math.PI / 2, 0, 0.28);
      } else if (sequence.kind === "suppressed-shot") {
        a.root.position.set(0.05, 0, -0.72);
        a.root.rotation.y = Math.PI;
        this.reach(a, "Right", [0.03, 1.5, -0.42]);
        this.reach(a, "Left", [-0.025, 1.47, -0.43]);
        this.handProp(this.pistol, "Right");
        this.pistol.rotation.y = Math.PI;
        this.bend(v, "Spine1", -strike * 0.32 * amount);
        this.bend(v, "Head", -strike * 0.15 * amount);
      } else if (sequence.kind === "back-breaker") {
        a.root.position.z = 0.3;
        this.reach(a, "Left", [-0.13, 1.33, 0.0]);
        this.reach(a, "Right", [0.13, 1.16, 0.0]);
        v.root.position.y = grab * 0.12 * amount;
        v.root.rotation.x = -strike * 0.42 * amount;
        this.bend(v, "Spine1", -strike * 0.42 * amount);
        this.bend(v, "LeftUpLeg", grab * 0.32 * amount);
        this.bend(a, "LeftUpLeg", strike * 0.3 * amount);
        this.bend(a, "LeftLeg", -strike * 0.45 * amount);
      } else if (sequence.kind === "neck-breaker") {
        this.reach(a, "Left", [-0.065, 1.65, -0.015]);
        this.reach(a, "Right", [0.065, 1.56, -0.035]);
        this.bend(
          v,
          "Head",
          strike * 0.12 * amount,
          -strike * 0.6 * amount,
          strike * 0.28 * amount,
        );
        this.bend(v, "Spine2", strike * 0.12 * amount);
        this.reach(v, "Left", [-0.16, 1.53, -0.12]);
        this.reach(v, "Right", [0.12, 1.55, -0.12]);
      } else {
        this.reach(a, "Right", [0.04, 1.61, -0.055]);
        this.reach(a, "Left", [-0.1, 1.57, 0.0]);
        this.reach(v, "Left", [-0.08, 1.57, -0.1]);
        this.reach(v, "Right", [0.09, 1.55, -0.1]);
        this.bend(v, "Spine1", Math.sin(t * 22) * 0.04 * amount);
        this.bend(v, "Head", -0.13 * grab * amount);
      }
      this.root.updateMatrixWorld(true);
    }
    // A close shoulder/side view lets the victim see the paired action. Use a
    // clear camera tile; narrow corridors fall back to the closer side view.
    const options = [
      ...(sequence.kind === "back-stab" ? [[1.6, 1.65, 0.25]] : []),
      [1.1, 1.65, -1.28],
      [-1.1, 1.65, -1.28],
      [0.75, 1.7, 0.92],
      [-0.75, 1.7, 0.92],
      [0.46, 1.65, -0.42],
    ];
    for (const point of options) {
      this.cameraPoint.set(...point).applyMatrix4(this.root.matrixWorld);
      const row = g.level[Math.floor(this.cameraPoint.z / 3)],
        tile = row?.[Math.floor(this.cameraPoint.x / 3)];
      if (tile === 0) break;
    }
    this.lookPoint.set(0, 1.3, 0.04).applyMatrix4(this.root.matrixWorld);
    this.r.camera.position.copy(this.cameraPoint);
    this.r.camera.lookAt(this.lookPoint);
    for (const actor of this.r.actors.values()) {
      this.hiddenActors.push([actor.root, actor.root.visible]);
      actor.root.visible = false;
    }
    return true;
  }
  restoreActors() {
    for (const [root, visible] of this.hiddenActors) root.visible = visible;
    this.hiddenActors = [];
  }
  dispose() {
    this.restoreActors();
    this.root.removeFromParent();
    for (const h of [this.victim, this.attacker])
      if (h) {
        h.mixer.stopAllAction();
        h.model.traverse((o) => {
          if (o.isSkinnedMesh) o.skeleton.dispose();
        });
        for (const m of h.materials) {
          m.dispose();
          this.r.materials.delete(m);
        }
      }
    for (const m of this.propMaterials || []) {
      m.dispose();
      this.r.materials.delete(m);
    }
  }
}
