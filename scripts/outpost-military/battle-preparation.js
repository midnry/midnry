/** Local staged equipment check during the server's existing five-second lock.
 * Uses public accused/patrol identities, never private allegiances or positions.
 * Reuses the renderer and 30Hz captured motion; no extra canvas or render loop.
 */
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { finishActor } from "./realism-characters.js";
import { updateWeaponGrip } from "./realism-grips.js";
import { animateCarbine } from "./realism-carbine.js";
import { battlePreparation } from "../../public/games/outpost-battle-presentation.js";

const smooth = x => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export class BattlePreparation {
  constructor(r) {
    this.r = r;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#10191e");
    this.camera = new THREE.PerspectiveCamera(45, 1, .1, 30);
    this.scene.add(new THREE.HemisphereLight("#c8d8de", "#514a3c", .9));
    const key = new THREE.DirectionalLight("#ffedcf", 3.2);
    key.position.set(-3, 5, -4); this.scene.add(key);
    const fill = new THREE.DirectionalLight("#a5c1cf", .8);
    fill.position.set(3, 3, 1); this.scene.add(fill);
    this.floorMaterial = new THREE.MeshStandardMaterial({ color: "#28312f", roughness: .95 });
    this.floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floor = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; this.scene.add(floor);
    this.actors = [];
  }
  makeOperator(entity, side) {
    const r = this.r, before = new Set(r.materials), model = clone(r.soldier.scene);
    const root = new THREE.Group(); root.add(model); this.scene.add(root);
    const mixer = new THREE.AnimationMixer(model), actions = {};
    for (const clip of r.soldier.animations) actions[clip.name] = mixer.clipAction(clip);
    actions.Idle?.play(); mixer.update(0); model.updateMatrixWorld(true);
    model.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
    const bounds = new THREE.Box3().setFromObject(model), factor = 1.82 / Math.max(.1, bounds.max.y - bounds.min.y);
    model.scale.multiplyScalar(factor); model.position.y -= bounds.min.y * factor;
    finishActor(r, model, entity); r.dyeUniform(model, entity.color);
    // The detailed LOD alone is sufficient for this short close-up.
    model.traverse(o => { if (o.isSkinnedMesh && o.userData.operatorLOD !== undefined) o.visible = o.userData.operatorLOD === 0; });
    const actor = { root, model, mixer, actions, baseY: model.position.y };
    r.equipActor(actor, { ...entity, weapon: "carbine" });
    // This camera faces +Z, so positive world X is the left side of the screen.
    root.position.x = side ? -.62 : .62; root.rotation.y = side ? .18 : -.18;
    actor.materials = [...r.materials].filter(m => !before.has(m));
    return actor;
  }
  clearActors() {
    for (const actor of this.actors) {
      actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.model);
      actor.model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.dispose(); });
      actor.root.removeFromParent();
      for (const material of actor.materials) { material.dispose(); this.r.materials.delete(material); }
    }
    this.actors = [];
  }
  update(view) {
    const r = this.r, state = battlePreparation(view, r.g.selfId);
    this.active = !!state && r.g.protocolUI?.visibleGameplay() && !r.g.protocolUI.hasDialogOpen() && !r.g.deathSequence;
    if (!this.active || !r.soldier) return false;
    const key = `${view.roundId}:${state.id}:${state.target.id}:${state.patrol.id}`;
    if (this.id !== key) {
      this.clearActors(); this.id = key; this.lastSample = null;
      this.actors = [this.makeOperator(state.target, 0), this.makeOperator(state.patrol, 1)];
    }
    this.scene.environment = r.scene.environment; this.scene.environmentIntensity = .3;
    const aspect = r.camera.aspect;
    this.camera.aspect = aspect;
    // Reserve horizontal room for the rifle and outstretched reload hand on
    // portrait screens, rather than cropping the left soldier's equipment.
    this.camera.position.set(.25, 1.24, -Math.max(4.3, 1.6 / (Math.tan(Math.PI / 8) * aspect)));
    this.camera.lookAt(.25, 1.07, 0); this.camera.updateProjectionMatrix();
    // Interpolate presentation between online snapshots just like locomotion.
    // Eligibility and unlock time still come solely from the server view.
    const interpolation = THREE.MathUtils.clamp(r.g.animationTime - view.time, 0, .15);
    const visualElapsed = Math.min(4.999, state.elapsed + interpolation);
    const sample = Math.floor((view.time + interpolation) * 30);
    if (sample === this.lastSample) return true;
    this.lastSample = sample;
    this.actors.forEach((actor, i) => {
      const elapsed = visualElapsed - i * .15, progress = THREE.MathUtils.clamp(elapsed / 3.8, 0, 1);
      const weight = r.motion.matches ? 0 : smooth((elapsed - .15) / .4) * (1 - smooth((elapsed - 3.65) / .65));
      for (const [name, amount] of [["Idle", 1 - weight], ["Reload", weight]]) {
        const action = actor.actions[name]; if (!action) continue;
        action.play().setEffectiveWeight(amount).setEffectiveTimeScale(0);
        action.time = name === "Reload" ? progress * action.getClip().duration : 0;
      }
      actor.mixer.update(0); actor.model.position.y = actor.baseY; actor.root.updateMatrixWorld(true);
      const reload = weight > .01 ? (1 - progress) * weight : 0;
      updateWeaponGrip(actor, reload);
      animateCarbine(actor.equipment.userData.carbine, reload, 0);
    });
    return true;
  }
  dispose() {
    this.clearActors(); this.floorMaterial.dispose(); this.floorGeometry.dispose();
    this.scene.clear();
  }
}
