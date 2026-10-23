/** Home lobby: your Locker character on a lit platform, holding
 * your carbine in its Locker finish. A small scene of its own (one actor,
 * a platform and an atmospheric backdrop), drawn by the shared renderer only
 * while the home menu is open; the arena is never built for it.
 * Two empty squad pads flank the operator (the menu draws their "+").
 * Drag sideways to turn the operator; it eases back to a three-quarter view. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { updateWeaponGrip } from "./realism-grips.js";
import { lobbyRenderSize } from "./compatibility.js";
import { CHARACTERS } from "../../public/games/outpost-characters.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildLobbyBackdrop, buildLobbyFloor, lobbySky, LOBBY_SUN, LOBBY_TRUCK } from "./lobby-backdrop.js";

export class LobbyStage {
  constructor(r) {
    this.r = r;
    const mobile = r.mobileDevice;
    this.scene = new THREE.Scene();
    // Warm sunset haze; far enough that the outpost skyline still reads.
    this.scene.fog = new THREE.Fog("#6a321e", 16, 115);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 260);
    this.owned = [];
    const own = (x) => (this.owned.push(x), x);
    // Backdrop dome: the sunset sky, clouds and mesas of the lobby concept.
    this.skyMaterial = own(
      new THREE.ShaderMaterial({
        vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: lobbySky,
        uniforms: { time: { value: 0 }, sun: { value: LOBBY_SUN } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.scene.add(new THREE.Mesh(own(new THREE.SphereGeometry(200, 32, 16)), this.skyMaterial));
    // Reflections and soft light come from this sunset sky, not the arena's
    // blue daylight map (which made the operator look cold and grey here).
    try {
      const pmrem = new THREE.PMREMGenerator(r.renderer),
        skyOnly = new THREE.Scene();
      skyOnly.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.skyMaterial));
      this.environment = own(pmrem.fromScene(skyOnly, 0.035).texture);
      skyOnly.children[0].geometry.dispose();
      pmrem.dispose();
    } catch {
      this.environment = null;
    }
    // Ground: wet concrete slabs that catch the sunset and the lamps.
    buildLobbyFloor(this.scene, own, { mobile });
    this.standIns = buildLobbyBackdrop(this.scene, own, { mobile });
    this.own = own;
    // Platforms: the centre one for you, two smaller squad pads.
    // Heavy dark steel pads with a matte, slightly worn top (the concept's
    // display plinths); the amber rim is the only bright part.
    const steel = own(new THREE.MeshStandardMaterial({ color: "#1e2326", roughness: 0.34, metalness: 0.9 }));
    const top = own(new THREE.MeshStandardMaterial({ color: "#2a2f32", roughness: 0.72, metalness: 0.25 }));
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
    this.scene.add(new THREE.HemisphereLight("#c79a86", "#2a1d14", 0.35));
    const key = new THREE.SpotLight("#ffe2b8", 60, 14, 0.5, 0.6, 1.4);
    key.position.set(2.2, 5.5, 3.5);
    key.target.position.set(0, 1, 0);
    // One character on stage: a real shadow is affordable on phones too
    // (it still follows the Shadows setting).
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 3;
    key.shadow.bias = -0.0004;
    this.scene.add(key, key.target);
    // Rim from the low sun behind the stage, on the right.
    const rim = new THREE.DirectionalLight("#ff8a4a", 2.6);
    rim.position.copy(LOBBY_SUN).multiplyScalar(6).setY(2.5);
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
    // Contact shadow: a soft dark pool where the boots meet the pad, so a
    // figure sits on it even with shadows off or on the cheapest setting.
    const pool = document.createElement("canvas");
    pool.width = pool.height = 128;
    const pc = pool.getContext("2d"),
      pg = pc.createRadialGradient(64, 64, 0, 64, 64, 64);
    pg.addColorStop(0, "rgba(0,0,0,0.85)");
    pg.addColorStop(0.45, "rgba(0,0,0,0.5)");
    pg.addColorStop(1, "rgba(0,0,0,0)");
    pc.fillStyle = pg;
    pc.fillRect(0, 0, 128, 128);
    this.contactMaterial = own(
      new THREE.MeshBasicMaterial({ map: own(new THREE.CanvasTexture(pool)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    this.contactGeometry = own(new THREE.PlaneGeometry(1, 1));
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
    // The contact shadow lies on the pad's top, under the boots.
    const contact = new THREE.Mesh(this.contactGeometry, this.contactMaterial);
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(at.position.x, 0.175 * at.scale.y, at.position.z + 0.04);
    contact.scale.set(0.95, 0.75, 1).multiplyScalar(pad ? 0.92 : 1);
    contact.renderOrder = 1;
    this.scene.add(contact);
    actor.contact = contact;
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
    a.contact?.removeFromParent();
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
  /** The modelled set (Blender: scripts/assets/lobby-set.py): the hangar
   * side and the parked truck, with baked contact shading. It replaces the
   * simple stand-ins once it has loaded; a failed load keeps them. */
  loadSet() {
    if (this.setLoading) return;
    const style = this.r.arenaStyle;
    if (!style?.asset) return;
    this.setLoading = new GLTFLoader()
      .loadAsync(`${style.asset}models/lobby-set-v1.glb?assetVersion=${style.version}`)
      .then((gltf) => {
        if (this.disposed) return;
        const spec = {
          steel: { color: "#3b3936", roughness: 0.48, metalness: 0.75 },
          cladding: { color: "#4e4740", roughness: 0.5, metalness: 0.55 },
          concrete: { color: "#6f6760", roughness: 0.92, metalness: 0 },
          interior: { color: "#3a2a1c", roughness: 0.9, metalness: 0, emissive: "#ff9a4a", emissiveIntensity: 0.35 },
          hazard: { color: "#c9952c", roughness: 0.6, metalness: 0.2 },
          lamp: { color: "#ffd9a8", roughness: 0.4, metalness: 0, emissive: "#ffb062", emissiveIntensity: 3.2 },
          glass: { color: "#141a1d", roughness: 0.08, metalness: 0.9 },
          olive: { color: "#4a4b35", roughness: 0.62, metalness: 0.3 },
          canvas: { color: "#5b5540", roughness: 0.95, metalness: 0 },
          rubber: { color: "#1b1b1b", roughness: 0.9, metalness: 0 },
          chrome: { color: "#9a9a96", roughness: 0.25, metalness: 1 },
          grille: { color: "#2c2c2a", roughness: 0.55, metalness: 0.8 },
        };
        const made = new Map();
        const material = (name) => {
          if (!made.has(name)) made.set(name, this.own(new THREE.MeshStandardMaterial({ vertexColors: true, ...(spec[name] || spec.steel) })));
          return made.get(name);
        };
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return;
          // Baked occlusion kept soft: contact shading, not a dark wash.
          const ao = o.geometry.getAttribute("color");
          if (ao) for (let i = 0; i < ao.count; i++) ao.setXYZ(i, 0.45 + 0.55 * ao.getX(i), 0.45 + 0.55 * ao.getY(i), 0.45 + 0.55 * ao.getZ(i));
          this.own(o.geometry);
          o.material = material(o.material?.name || "steel");
          o.castShadow = o.receiveShadow = true;
        });
        const truck = gltf.scene.getObjectByName("truck");
        if (truck) {
          truck.position.set(LOBBY_TRUCK.x, 0, LOBBY_TRUCK.z);
          truck.rotation.y = LOBBY_TRUCK.turn;
        }
        this.scene.add(gltf.scene);
        for (const mesh of this.standIns || []) mesh.visible = false;
      })
      .catch(() => {
        /* The simple stand-ins stay. */
      });
  }
  /** Real scanned props (the Dust Outpost set, already cached for the
   * arena) dressed along the hangar wall and around the vehicle, once they
   * have loaded. Placed by hand, clear of the stage and the pads. */
  dress() {
    if (this.dressed) return;
    const props = this.r.arenaStyle?.of?.("outpost")?.props;
    if (!props?.size) return;
    this.dressed = true;
    const group = new THREE.Group();
    group.name = "Lobby props";
    // [asset, x, z, turn, scale, y] (metres; the stage is at the origin, the
    // hangar wall at x = -7.2, the vehicle near (8, -17)).
    for (const [id, x, z, turn = 0, scale = 1, y = 0] of [
      // Hangar foot, left: a crate stack, ammo boxes, fuel and a compressor.
      ["old_military_crate", -5.3, -6.6, 0.25],
      ["old_military_crate", -5.45, -6.75, 0.1, 1, 0.62],
      ["ammo_box", -4.55, -6.1, 0.9],
      ["metal_jerrycan_green", -4.2, -7.3, -0.4],
      ["metal_jerrycan", -4.45, -7.55, 0.3],
      ["Barrel_01", -5.6, -9.0],
      ["barrel_03", -4.9, -9.5, 1.2],
      ["Barrel_01", -5.55, -10.1, 2.1],
      ["old_military_compressor", -5.0, -12.4, 1.3],
      ["industrial_pastic_container", -5.3, -15.2, 0.2],
      ["plastic_crate_03", -4.6, -16.3, 0.6],
      ["cardboard_box_01", -4.3, -13.7, 0.4],
      // Right: a barrier line by the yard, fuel by the vehicle, a spare tyre.
      ["concrete_road_barrier", 4.6, -8.8, -0.35],
      ["concrete_road_barrier_02", 6.4, -9.6, -0.55],
      ["barrel_03", 6.2, -13.0, 0.4],
      ["Barrel_01", 6.9, -12.6, 1.4],
      ["metal_jerrycan", 5.8, -12.4, 2.4],
      ["old_tyre", 7.4, -14.2, 0.9],
      ["ammo_box", 5.2, -10.7, -0.3],
    ]) {
      const source = props.get(id);
      if (!source) continue;
      const prop = source.clone();
      prop.position.set(x, y, z);
      prop.rotation.y = turn;
      prop.scale.setScalar(scale);
      prop.traverse((o) => {
        if (o.isMesh) o.castShadow = o.receiveShadow = true;
      });
      group.add(prop);
    }
    this.scene.add(group);
  }
  render(now) {
    const r = this.r,
      t = now / 1000,
      still = r.motion.matches;
    this.loadSet();
    this.dress();
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
        // A tall screen (phone portrait) gets a wider lens so the camera
        // comes closer: the hangar and gantry stay in frame and the far skyline
        // isn't magnified behind the operator.
        fov = portrait ? 44 : 30,
        distance = visible / 2 / Math.tan((fov * Math.PI) / 360);
      this.camera.fov = fov;
      // Nearly level, at chest height (the concept's framing): the horizon
      // falls about the operator's hips and the sky fills the upper half,
      // instead of a high camera that showed mostly bare floor.
      this.camera.position.set(0, 1.1 + distance * 0.035, distance);
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
    // Through the lobby's finishing pass (linear light), the rings are
    // brighter than white so they glow like the concept's pad rims.
    const glow = !!this.composer;
    if (glow) this.ringMaterial.color.multiplyScalar(2.4);
    this.scene.environment = this.environment || r.scene.environment;
    this.scene.environmentIntensity = this.environment ? 0.85 : 0.35;
    this.placeSquad(w, h);
    this.present(w, h);
    if (glow) this.ringMaterial.color.multiplyScalar(1 / 2.4);
    return true;
  }
  /** Draw the stage: at the screen's density (up to 2×), multisampled, with
   * a little glow on the lamps and rims, tone mapped like a match. The
   * Performance preset and safe mode keep the plain, cheaper path. */
  present(w, h) {
    const r = this.r,
      renderer = r.renderer,
      size = r.composer && lobbyRenderSize(w, h, window.devicePixelRatio, r.profile, r.g.academy?.preset);
    if (!size) {
      if (r.lobbySized) {
        r.lobbySized = false;
        r.resize();
      }
      renderer.setRenderTarget(null);
      renderer.render(this.scene, this.camera);
      return;
    }
    const [bw, bh] = size,
      canvas = renderer.domElement;
    if (canvas.width !== bw || canvas.height !== bh) renderer.setSize(bw, bh, false);
    // The match puts its own (smaller) buffer back before it next draws.
    r.lobbySized = true;
    if (!this.composer) {
      const samples = Math.min(r.offscreenSamples || 0, renderer.capabilities.maxSamples || 0, 4);
      this.target = new THREE.WebGLRenderTarget(1, 1, { type: r.profile.halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType, samples });
      this.composer = new EffectComposer(renderer, this.target);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      // Glow is a desktop and High-preset extra; phones keep their battery.
      if (!r.mobileDevice || r.g.academy?.preset === "high") {
        // Threshold above the sky's brightest part: only lamps, rims and the sun glow.
        this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.45, 1.05);
        this.composer.addPass(this.bloom);
      }
      this.composer.addPass(new OutputPass());
    }
    if (this.composerSize !== bw + "x" + bh) {
      this.composerSize = bw + "x" + bh;
      this.composer.setSize(bw, bh);
    }
    // Neutral tone mapping keeps the authored sunset hues (filmic curves
    // turned its oranges a washed-out yellow).
    const curve = renderer.toneMapping;
    renderer.toneMapping = THREE.NeutralToneMapping;
    this.composer.render();
    renderer.toneMapping = curve;
  }
  /** How far the menu column is scrolled (phones: one scrolling column). */
  menuScroll() {
    return this.r.g.$?.(".mf-modal")?.scrollTop || 0;
  }
  /** The menu's stage box on screen, when it is laid out, as it sits with
   * the menu scrolled to the top: the stage (operator and backdrop) stays
   * still while the menu scrolls over it, instead of chasing the scroll a
   * frame late (it juddered on phones). */
  stageRect() {
    const box = this.r.g.$?.(".mf-stagebox"),
      rect = box?.getBoundingClientRect();
    if (!rect || rect.width < 40 || rect.height < 40) return null;
    const scrolled = this.menuScroll();
    // Its padding keeps room for chips laid over the stage's edges.
    const css = getComputedStyle(box),
      top = parseFloat(css.paddingTop) || 0,
      bottom = parseFloat(css.paddingBottom) || 0,
      height = rect.height - top - bottom;
    return height > 40 ? { left: rect.left, top: rect.top + scrolled + top, width: rect.width, height } : null;
  }
  /** Pin the menu's squad "+" buttons over the two side pads and each pad's
   * name label on its front edge. The squad layer may scroll with the menu,
   * so positions are relative to it. */
  placeSquad(w, h) {
    const squad = this.r.g.$?.(".mf-squad");
    if (!squad || squad.hidden) return;
    // The pads stay still while the menu scrolls; their "+" buttons and
    // names fade out once the menu moves rather than float over the cards.
    const away = this.menuScroll() > 12;
    if (squad.classList.contains("mf-scrolledaway") !== away) squad.classList.toggle("mf-scrolledaway", away);
    if (away) return;
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
    this.disposed = true;
    this.composer?.dispose();
    this.bloom?.dispose();
    this.target?.dispose();
    if (this.r.lobbySized) {
      this.r.lobbySized = false;
      this.r.resize();
    }
    this.clearActor();
    for (const a of this.mates || []) this.clearActor(a);
    for (const x of this.owned) x.dispose();
    this.scene.clear();
  }
}
