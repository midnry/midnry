/** A presentation-only navigation aid anchored to the existing walking floor.
 * One instanced draw plus a destination ring: no lights, shadow passes, network
 * state or downloaded assets. Ordinary depth testing hides it behind cover. */
import * as THREE from "three";
import { navigationTrail } from "../../public/games/outpost-navigation.js";

const SCALE = 3,
  FLOOR = 0.065,
  CAPACITY = 40;
export class GroundTrail {
  constructor(r) {
    this.r = r;
    this.root = new THREE.Group();
    this.root.name = "Objective floor trail";
    r.scene.add(this.root);
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 128;
    const c = canvas.getContext("2d");
    c.fillStyle = "#162422";
    c.beginPath();
    c.roundRect(2, 2, 60, 124, 22);
    c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.roundRect(9, 8, 46, 112, 17);
    c.fill();
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.MeshBasicMaterial({
      color: "#b9eedb",
      map: this.texture,
      transparent: true,
      alphaTest: 0.2,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.geometry = new THREE.PlaneGeometry(0.26, 0.62).rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, CAPACITY);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 2;
    this.ringGeometry = new THREE.RingGeometry(0.25, 0.32, 32).rotateX(-Math.PI / 2);
    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: "#b9eedb",
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.ring = new THREE.Mesh(this.ringGeometry, this.ringMaterial);
    this.ring.renderOrder = 2;
    this.root.add(this.mesh, this.ring);
    this.root.visible = false;
    this.matrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Quaternion();
    this.axis = new THREE.Vector3(0, 1, 0);
    this.scale = new THREE.Vector3(1, 1, 1);
  }
  update(view, camera, takedown, now) {
    const g = this.r.g,
      nav = g.navigation,
      ui = g.protocolUI;
    const enabled =
      !!nav?.trail &&
      !!nav?.route &&
      nav.mapId === view?.mapId &&
      nav.roundId === view?.roundId &&
      !nav.line.hidden &&
      ui.visibleGameplay() &&
      !ui.hasDialogOpen() &&
      !ui.piloting &&
      !g.deathSequence &&
      !takedown &&
      camera.id === g.selfId &&
      camera.hp > 0 &&
      view?.state !== "ended" &&
      view?.protocol?.phase === "roam" &&
      !!view.protocol.self &&
      !view.protocol.self?.channel;
    this.root.visible = enabled;
    if (!enabled) {
      this.nextUpdate = 0;
      return;
    }
    const key = `${view.roundId}:${view.mapId}:${nav.route.goal.id}`;
    if (this.key === key && this.route === nav.route && now < this.nextUpdate) return;
    this.key = key;
    this.route = nav.route;
    this.nextUpdate = now + 100;
    this.samples = navigationTrail(view.level, camera, nav.route.path);
    const colour = nav.route.goal.priority < 10 ? "#ffd18c" : "#b9eedb";
    this.material.color.set(colour);
    this.ringMaterial.color.set(colour);
    this.mesh.count = Math.min(CAPACITY, this.samples.markers.length);
    for (let i = 0; i < this.mesh.count; i++) {
      const point = this.samples.markers[i];
      this.position.set(point.x * SCALE, FLOOR, point.y * SCALE);
      this.rotation.setFromAxisAngle(this.axis, -point.angle - Math.PI / 2);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.ring.visible = !!this.samples.end;
    if (this.ring.visible)
      this.ring.position.set(this.samples.end.x * SCALE, FLOOR, this.samples.end.y * SCALE);
  }
  dispose() {
    this.root.remove();
    this.mesh.dispose();
    this.geometry.dispose();
    this.ringGeometry.dispose();
    this.material.dispose();
    this.ringMaterial.dispose();
    this.texture.dispose();
  }
}
