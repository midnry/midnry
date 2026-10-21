/** Home lobby: your Locker character on a lit platform, holding
 * your carbine in its Locker finish. A small scene of its own (one actor,
 * a platform and an atmospheric backdrop), drawn by the shared renderer only
 * while the home menu is open; the arena is never built for it.
 * Two empty squad pads flank the operator (the menu draws their "+").
 * Drag sideways to turn the operator; it eases back to a three-quarter view. */
import * as THREE from "three";
import { updateWeaponGrip } from "./realism-grips.js";
import { CHARACTERS } from "../../public/games/outpost-characters.js";

const sky = /* glsl */ `
varying vec3 vDir;
uniform float time;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  // Dusk: deep teal overhead, ember glow on the horizon behind the platform.
  vec3 top = vec3(0.035, 0.06, 0.07), mid = vec3(0.09, 0.12, 0.12), horizon = vec3(0.55, 0.24, 0.1);
  vec3 c = mix(horizon, mid, smoothstep(0.47, 0.6, h));
  c = mix(c, top, smoothstep(0.6, 0.95, h));
  // A low red haze wall far behind.
  float haze = exp(-pow((h - 0.5) * 9.0, 2.0)) * (0.55 + 0.45 * sin(d.x * 7.0 + time * 0.15) * sin(d.z * 5.0 - time * 0.1));
  c += vec3(0.5, 0.06, 0.04) * haze * 0.45;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export class LobbyStage {
  constructor(r) {
    this.r = r;
    const mobile = r.mobileDevice;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog("#1a1512", 9, 26);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    this.owned = [];
    const own = (x) => (this.owned.push(x), x);
    // Backdrop dome.
    this.skyMaterial = own(
      new THREE.ShaderMaterial({
        vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: sky,
        uniforms: { time: { value: 0 } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.scene.add(new THREE.Mesh(own(new THREE.SphereGeometry(40, 32, 16)), this.skyMaterial));
    // Ground: dark wet concrete fading into the fog.
    const ground = new THREE.Mesh(
      own(new THREE.CircleGeometry(30, 48)),
      own(new THREE.MeshStandardMaterial({ color: "#14181a", roughness: 0.55, metalness: 0.2 })),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Platforms: the centre one for you, two smaller squad pads.
    const steel = own(new THREE.MeshStandardMaterial({ color: "#2b3134", roughness: 0.38, metalness: 0.85 }));
    const top = own(new THREE.MeshStandardMaterial({ color: "#3b4245", roughness: 0.6, metalness: 0.4 }));
    this.ringMaterial = own(new THREE.MeshBasicMaterial({ color: "#ffc857", toneMapped: false, fog: false }));
    const padGeo = own(new THREE.CylinderGeometry(1, 1.06, 0.16, 64)),
      capGeo = own(new THREE.CylinderGeometry(0.94, 0.94, 0.02, 64)),
      ringGeo = own(new THREE.TorusGeometry(1.03, 0.012, 8, 96));
    this.pads = [];
    for (const [x, z, s] of [
      // Squad pads just behind yours, tucked in at its sides.
      [0, 0, 0.85],
      [-1.32, -0.35, 0.62],
      [1.32, -0.35, 0.62],
    ]) {
      const pad = new THREE.Group();
      pad.position.set(x, 0, z);
      pad.scale.setScalar(s);
      const base = new THREE.Mesh(padGeo, steel);
      base.position.y = 0.08;
      base.castShadow = base.receiveShadow = true;
      const cap = new THREE.Mesh(capGeo, top);
      cap.position.y = 0.17;
      cap.receiveShadow = true;
      const ring = new THREE.Mesh(ringGeo, this.ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.165;
      pad.add(base, cap, ring);
      this.scene.add(pad);
      this.pads.push(pad);
    }
    // Light: warm key and rim, cool fill, and a spotlight on the operator.
    this.scene.add(new THREE.HemisphereLight("#9fb4c0", "#2a1d14", 0.55));
    const key = new THREE.SpotLight("#ffe2b8", 60, 14, 0.5, 0.6, 1.4);
    key.position.set(2.2, 5.5, 3.5);
    key.target.position.set(0, 1, 0);
    key.castShadow = !mobile;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    this.scene.add(key, key.target);
    const rim = new THREE.DirectionalLight("#ff8a4a", 2.4);
    rim.position.set(-2, 3, -5);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight("#7fa6c4", 0.6);
    fill.position.set(-4, 2, 3);
    this.scene.add(fill);
    // Drifting dust in the light.
    const count = mobile ? 120 : 260,
      dust = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) dust.set([(Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 4], i * 3);
    const dustGeo = own(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    this.dust = new THREE.Points(
      dustGeo,
      own(new THREE.PointsMaterial({ color: "#ffd9a0", size: 0.025, transparent: true, opacity: 0.55, depthWrite: false })),
    );
    this.scene.add(this.dust);
    this.turn = 0;
    this.spin = 0;
    this.key = "";
  }
  /** (Re)build the operator when the character, gun or finish changes. */
  operator() {
    const r = this.r,
      g = r.g,
      finish = g.retention?.weaponFinish?.() || "standard",
      id = g.character || "operator",
      ready = id === "operator" || !!r.characterAssets?.get(id),
      key = `${id}:${ready}:${finish}:${!!r.weaponKit}`;
    if (!ready) r.loadCharacter(id);
    if (!r.soldier || key === this.key) return;
    // Keep the current figure on stage until the chosen character arrives.
    if (!ready && this.actor) return;
    this.key = key;
    this.clearActor();
    // Your Locker character, holding the gun in its Locker finish.
    r.thirdPersonFinish = finish;
    this.actor = this.figure("lobby-operator", id, 0);
    r.thirdPersonFinish = null;
  }
  /** One figure on a pad (0: yours, 1 and 2: the squad pads). */
  figure(key, character, pad) {
    const r = this.r,
      actor = r.makeActor({ id: key, character, outfit: r.g.outfit, weapon: "carbine", team: 0, x: 0, y: 0 });
    r.actors.delete(key);
    actor.root.removeFromParent();
    const at = this.pads[pad];
    actor.root.position.set(at.position.x, 0.18 * at.scale.y, at.position.z);
    actor.root.scale.setScalar(pad ? 0.92 : 1);
    actor.root.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.scene.add(actor.root);
    return actor;
  }
  /** Friends in your online room stand on the squad pads, in their characters. */
  squad() {
    const r = this.r,
      net = r.g.online,
      mates = net?.phase === "lobby" ? (net.members || []).filter((m) => m.id !== r.g.selfId).slice(0, 2) : [],
      wanted = mates.map((m) => m.character || "operator");
    for (const id of wanted) if (id !== "operator") r.loadCharacter(id);
    const ready = wanted.every((id) => id === "operator" || r.characterAssets?.has(id)),
      key = mates.map((m, i) => `${m.id}:${wanted[i]}`).join("|") + `:${ready}:${!!r.soldier}`;
    if (key === this.squadKey || !r.soldier) return;
    this.squadKey = key;
    for (const a of this.mates || []) this.clearActor(a);
    this.mates = mates.map((m, i) => this.figure(`lobby-mate-${i}`, wanted[i], i + 1));
  }
  clearActor(a = this.actor) {
    if (!a) return;
    a.mixer?.stopAllAction();
    a.mixer?.uncacheRoot(a.model);
    a.model.traverse((o) => {
      if (o.isSkinnedMesh) o.skeleton.dispose();
    });
    a.root.removeFromParent();
    for (const m of [...(a.ownedMaterials || []), ...(a.equipmentMaterials || [])]) {
      m.dispose();
      this.r.materials.delete(m);
    }
    if (a === this.actor) this.actor = null;
  }
  /** Drag to turn (pixels); the operator eases back when released. */
  drag(dx) {
    this.spin += dx * 0.01;
  }
  render(now) {
    const r = this.r,
      t = now / 1000,
      still = r.motion.matches;
    this.operator();
    this.squad();
    // Last Signal dresses the bots as the other characters: fetch them now.
    if (r.g.mode === "signal" && !this.fetched) {
      this.fetched = true;
      for (const c of CHARACTERS) r.loadCharacter(c.id);
    }
    const w = r.renderer.domElement.clientWidth || 1,
      h = r.renderer.domElement.clientHeight || 1,
      aspect = w / h,
      portrait = aspect < 0.9;
    this.camera.aspect = aspect;
    // The menu's stage box (.mf-stagebox) says where the operator and pads
    // stand on screen: fit them to it and shift the view so they sit in it.
    const box = !this.cardShot && this.stageRect(),
      canvas = r.renderer.domElement;
    if (box) {
      const at = canvas.getBoundingClientRect(),
        bx = box.left - at.left,
        by = box.top - at.top,
        // The pads span about 4 m across (their outer edges may crop);
        // pads to head about 2.4 m.
        visible = Math.max((2.4 * h) / box.height, (3.6 * h) / box.width),
        fov = 30,
        distance = visible / 2 / Math.tan((fov * Math.PI) / 360);
      this.camera.fov = fov;
      this.camera.position.set(0, 1.1 + distance * 0.12, distance);
      this.camera.lookAt(0, 1.1, 0);
      this.camera.setViewOffset(w, h, w / 2 - (bx + box.width / 2), h / 2 - (by + box.height / 2), w, h);
    } else {
      this.camera.clearViewOffset();
      // Portrait (phones): the operator fills the upper part of the screen,
      // above the menu sheet. Landscape: centred between the side panels.
      this.camera.fov = portrait ? 40 : 30;
      this.camera.position.set(0, portrait ? 1.6 : 1.5, portrait ? 10 : 9);
      this.camera.lookAt(0, portrait ? -0.35 : 1.15, 0);
    }
    // Locker card art (scripts/capture-outpost-characters.mjs): head to knees.
    if (this.cardShot) {
      this.camera.fov = 30;
      this.camera.position.set(0, 1.3, 4.6);
      this.camera.lookAt(0, 1.02, 0);
    }
    this.camera.updateProjectionMatrix();
    this.skyMaterial.uniforms.time.value = still ? 0 : t;
    for (const actor of [this.actor, ...(this.mates || [])]) {
      if (!actor) continue;
      // Idle, captured motion at 30 Hz.
      const idle = actor.actions.Idle;
      if (idle) {
        idle.play().setEffectiveWeight(1).setEffectiveTimeScale(0);
        idle.time = still ? 0 : t % idle.getClip().duration;
        actor.mixer.update(0);
      }
      // A three-quarter view, chest towards you (the aiming idle turns the body);
      // only your own figure turns with a drag.
      const mine = actor === this.actor;
      actor.root.rotation.y =
        Math.PI + (this.cardShot ? 0.4 : 0.25) + (mine ? this.spin : 0) + (still || this.cardShot ? 0 : Math.sin(t * 0.35) * 0.06);
      // Gear and the rifle follow the pose, as in a match.
      r.updateSkinParts(actor);
      if (actor.equipment && !updateWeaponGrip(actor, 0) && actor.weaponAnchor) {
        actor.root.updateMatrixWorld(true);
        actor.weaponAnchor.getWorldPosition(actor.equipment.position);
        actor.root.worldToLocal(actor.equipment.position);
      }
    }
    this.spin *= 0.94;
    if (!still) {
      const p = this.dust.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) + 0.0025;
        if (y > 4) y = 0;
        p.setY(i, y);
      }
      p.needsUpdate = true;
      this.ringMaterial.color.setRGB(1, 0.78 + Math.sin(t * 1.6) * 0.06, 0.34);
    }
    this.scene.environment = r.scene.environment;
    this.scene.environmentIntensity = 0.35;
    this.placeSquad(w, h);
    const renderer = r.renderer;
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
    return true;
  }
  /** The menu's stage box on screen, when it is laid out. */
  stageRect() {
    const box = this.r.g.$?.(".mf-stagebox"),
      rect = box?.getBoundingClientRect();
    if (!rect || rect.width < 40 || rect.height < 40) return null;
    // Its padding keeps room for chips laid over the stage's edges.
    const css = getComputedStyle(box),
      top = parseFloat(css.paddingTop) || 0,
      bottom = parseFloat(css.paddingBottom) || 0,
      height = rect.height - top - bottom;
    return height > 40 ? { left: rect.left, top: rect.top + top, width: rect.width, height } : null;
  }
  /** Pin the menu's squad "+" buttons over the two side pads and each pad's
   * name label on its front edge. The squad layer may scroll with the menu,
   * so positions are relative to it. */
  placeSquad(w, h) {
    const squad = this.r.g.$?.(".mf-squad");
    if (!squad || squad.hidden) return;
    const v = new THREE.Vector3(),
      at = this.r.renderer.domElement.getBoundingClientRect(),
      layer = squad.getBoundingClientRect(),
      dx = at.left - layer.left,
      dy = at.top - layer.top;
    const pin = (node, x, y, z) => {
      v.set(x, y, z).project(this.camera);
      node.style.setProperty("--x", `${(((v.x + 1) / 2) * w + dx).toFixed(1)}px`);
      node.style.setProperty("--y", `${(((1 - v.y) / 2) * h + dy).toFixed(1)}px`);
    };
    squad.querySelectorAll("[data-invite]").forEach((b, i) => {
      const pad = this.pads[i + 1];
      // Above the pad's inner half, clear of the cards at the screen sides.
      if (pad) pin(b, pad.position.x * 0.78, 0.85, pad.position.z);
    });
    squad.querySelectorAll("[data-pad]").forEach((label) => {
      const pad = this.pads[Number(label.dataset.pad)];
      if (pad) pin(label, pad.position.x, 0.06, pad.position.z + 1.04 * pad.scale.z);
    });
  }
  dispose() {
    this.clearActor();
    for (const a of this.mates || []) this.clearActor(a);
    for (const x of this.owned) x.dispose();
    this.scene.clear();
  }
}
