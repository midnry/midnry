/** Preview-only 3D presentation. Arena retains every movement, damage and network rule. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";
const SCALE = 3,
  ASSET = "/games/military/",
  TAU = Math.PI * 2;
const PROFILES = {
  outpost: { floor: "#a69980", fog: "#bbc2c3", metal: "#788178" },
  testblock: { floor: "#8e958c", fog: "#b8c1c5", metal: "#75806e" },
  skyport: { floor: "#bbc0bf", fog: "#bccbd0", metal: "#8e999b" },
  freight: { floor: "#747d7d", fog: "#a5b3bd", metal: "#647269" },
  estate: { floor: "#c6bca5", fog: "#c4c1ba", metal: "#81867b" },
};
export class MilitaryRenderer {
  constructor(g, onProgress = () => {}) {
    this.g = g;
    this.onProgress = onProgress;
    this.disposed = false;
    this.actors = new Map();
    this.crates = new Map();
    this.cores = new Map();
    this.projectiles = new Map();
    this.fields = new Map();
    this.materials = new Set();
    this.geometries = new Map();
    this.textures = new Set();
    this.worldTextures = new Set();
    this.lastTime = 0;
    this.lastPose = -1;
    this.mapKey = "";
    this.wallKeys = "";
    this.seenShots = new Map();
    this.tracers = [];
    this.lastPreset = "";
    this.assetErrors = [];
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    // A high-performance, multisampled context is not available on every phone.
    // Retry on a fresh canvas so rejected attributes don't lock the next attempt.
    let canvas, context;
    for (const attributes of [
      { antialias: true, powerPreference: "default" },
      { antialias: false, powerPreference: "low-power" },
    ]) {
      canvas = document.createElement("canvas");
      context = canvas.getContext("webgl2", { ...attributes, alpha: false });
      if (context) break;
    }
    if (!context) throw new Error("This browser could not start WebGL 2 graphics.");
    this.renderer = new THREE.WebGLRenderer({ canvas, context });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.contextLost = (event) => {
      event.preventDefault();
      if (this.disposed) return;
      this.contextFailed = true;
      g.fallbackMilitary(new Error("The graphics context was lost."));
    };
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost);
    this.renderer.domElement.className = "mf-webgl";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:0;width:100%;height:100%;";
    g.shell.insertBefore(this.renderer.domElement, g.canvas);
    g.canvas.style.cssText = "position:relative;z-index:1;background:transparent";
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#b8c6d0");
    this.scene.fog = new THREE.FogExp2("#b8c6d0", 0.018);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.06, 260);
    this.camera.rotation.order = "YXZ";
    this.hemisphere = new THREE.HemisphereLight("#adbcd0", "#372b20", 0.55);
    this.scene.add(this.hemisphere);
    this.sun = new THREE.DirectionalLight("#ffddb0", 4.2);
    this.sun.position.set(-25, 38, -22);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -35,
      right: 35,
      top: 35,
      bottom: -35,
      near: 1,
      far: 140,
    });
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.rim = new THREE.DirectionalLight("#94b9e7", 1.15);
    this.rim.position.set(25, 15, 35);
    this.scene.add(this.rim);
    this.weaponScene = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(52, 1, 0.01, 10);
    this.weaponScene.add(new THREE.HemisphereLight("#e5ecf1", "#786852", 2));
    const key = new THREE.DirectionalLight("#fff0d7", 4);
    key.position.set(-2, 3, -4);
    this.weaponScene.add(key);
    this.rig = new THREE.Group();
    this.weaponScene.add(this.rig);
    this.flash = new THREE.PointLight("#ffdcb0", 0, 4);
    this.flash.position.set(0.22, -0.08, -0.95);
    this.weaponScene.add(this.flash);
    this.boxGeometry = this.geo("rounded", () => new RoundedBoxGeometry(1, 1, 1, 3, 0.025));
    this.wallGeometry = this.geo("wall", () => new RoundedBoxGeometry(1, 1, 1, 2, 0.008));
    // Cinematic processing stays separate from simulation and the accessible HUD.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new SSAOPass(this.scene, this.camera, 512, 512, 12);
    this.ao.kernelRadius = 0.7;
    this.ao.minDistance = 0.001;
    this.ao.maxDistance = 0.07;
    this.composer.addPass(this.ao);
    const hands = new RenderPass(this.weaponScene, this.weaponCamera);
    hands.clear = false;
    hands.clearDepth = true;
    this.composer.addPass(hands);
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){ vec4 c=texture2D(tDiffuse,vUv);
          // Subtle warm highlights, cool shadows, and lens falloff; no animated grain.
          float l=dot(c.rgb,vec3(.2126,.7152,.0722));
          c.rgb=mix(vec3(l),c.rgb,1.04);
          c.rgb*=mix(vec3(.90,.97,1.06),vec3(1.045,1.015,.97),smoothstep(.15,1.1,l));
          vec2 d=(vUv-.5)*vec2(1.,.75);
          c.rgb*=1.-.32*dot(d,d); gl_FragColor=c; }`,
    });
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.ready = this.loadAssets().then(() => {
      if (!this.disposed) {
        this.mapKey = "";
        this.updateWeapon();
      }
    });
    this.configure();
    this.resize();
  }
  geo(key, make) {
    if (!this.geometries.has(key)) this.geometries.set(key, make());
    return this.geometries.get(key);
  }
  material(options) {
    const m = new THREE.MeshStandardMaterial(options);
    this.materials.add(m);
    return m;
  }
  mesh(parent, geo, mat, position = [0, 0, 0], scale = [1, 1, 1]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...position);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(parent, mat, pos, scale) {
    return this.mesh(parent, this.boxGeometry, mat, pos, scale);
  }
  cylinder(parent, mat, pos, radius, length, axis = "z", segments = 24) {
    const geo = this.geo(
      "cylinder:" + segments,
      () => new THREE.CylinderGeometry(1, 1, 1, segments),
    );
    const m = this.mesh(parent, geo, mat, pos, [radius, length, radius]);
    if (axis === "z") m.rotation.x = Math.PI / 2;
    if (axis === "x") m.rotation.z = Math.PI / 2;
    return m;
  }
  async loadAssets() {
    let completed = 0;
    const complete = () => this.onProgress(++completed, 14);
    const loader = new THREE.TextureLoader();
    const load = async (path) => {
      try {
        const t = await loader.loadAsync(ASSET + path);
        if (this.disposed) {
          t.dispose();
          return null;
        }
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        this.textures.add(t);
        return t;
      } catch {
        this.assetErrors.push(path);
        return null;
      } finally {
        complete();
      }
    };
    const maps = await Promise.all(
      [
        "asphalt-color.jpg",
        "asphalt-normal.jpg",
        "asphalt-roughness.jpg",
        "metal-color.jpg",
        "metal-normal.jpg",
        "metal-roughness.jpg",
        "gun-color.jpg",
        "gun-normal.jpg",
        "gun-roughness.jpg",
        "glove-color.jpg",
        "glove-normal.jpg",
        "glove-roughness.jpg",
      ].map((name) => load("textures/" + name)),
    );
    [
      this.groundColor,
      this.groundNormal,
      this.groundRough,
      this.metalColor,
      this.metalNormal,
      this.metalRough,
      this.gunColor,
      this.gunNormal,
      this.gunRough,
      this.gloveColor,
      this.gloveNormal,
      this.gloveRough,
    ] = maps;
    if (this.gunColor) this.gunColor.colorSpace = THREE.SRGBColorSpace;
    if (this.gloveColor) this.gloveColor.colorSpace = THREE.SRGBColorSpace;
    if (this.groundColor) this.groundColor.colorSpace = THREE.SRGBColorSpace;
    if (this.metalColor) this.metalColor.colorSpace = THREE.SRGBColorSpace;
    await Promise.all([
      (async () => {
        try {
          const gltf = await new GLTFLoader().loadAsync(ASSET + "models/soldier.glb");
          if (this.disposed) {
            this.disposeObject(gltf.scene);
            return;
          }
          this.soldier = gltf;
          this.soldier.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (o.material) {
                o.material.roughness = 0.8;
                o.material.metalness = 0.1;
                this.materials.add(o.material);
              }
            }
          });
        } catch {
          this.assetErrors.push("soldier");
        } finally {
          complete();
        }
      })(),
      (async () => {
        try {
          const hdr = await new RGBELoader().loadAsync(ASSET + "sky.hdr");
          if (this.disposed) {
            hdr.dispose();
            return;
          }
          hdr.mapping = THREE.EquirectangularReflectionMapping;
          this.textures.add(hdr);
          this.scene.background = hdr;
          this.scene.environment = hdr;
          this.weaponScene.environment = hdr;
          this.scene.backgroundBlurriness = 0.015;
          this.scene.backgroundIntensity = 0.48;
          this.scene.environmentIntensity = 0.45;
        } catch {
          this.assetErrors.push("sky");
        } finally {
          complete();
        }
      })(),
    ]);
  }
  configure() {
    const preset = this.g.academy.preset,
      options = this.g.academy.options;
    if (this.lastPreset === preset + options.shadows + options.lighting) return;
    this.lastPreset = preset + options.shadows + options.lighting;
    this.renderer.shadowMap.enabled = options.shadows;
    const size = preset === "high" ? 4096 : preset === "performance" ? 1024 : 2048;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.intensity = options.lighting ? 4.2 : 1.7;
    this.hemisphere.intensity = options.lighting ? 0.55 : 1.3;
    this.ao.enabled = preset === "high" && options.shadows;
    this.grade.enabled = options.lighting;
    if (this.reflection) {
      this.reflection.visible = preset !== "performance";
      this.reflection
        .getRenderTarget()
        .setSize(preset === "high" ? 1024 : 512, preset === "high" ? 1024 : 512);
    }
  }
  resize() {
    if (this.disposed) return;
    const { w, h } = this.g;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    // Match the simulation's fixed horizontal 60-degree field of view.
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(Math.PI / 6) / (w / h)));
    this.camera.updateProjectionMatrix();
    this.weaponCamera.aspect = w / h;
    this.weaponCamera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(26)) / (w / h)),
    );
    this.weaponCamera.updateProjectionMatrix();
  }
  tileTexture(source, repeats) {
    if (!source) return null;
    const t = source.clone();
    t.repeat.set(repeats, repeats);
    t.needsUpdate = true;
    this.textures.add(t);
    this.worldTextures.add(t);
    return t;
  }
  clearWorld() {
    this.reflection?.dispose();
    this.world.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.userData.ownedGeometry) o.geometry.dispose();
    });
    for (const material of this.materials)
      if (material.userData.world) {
        material.dispose();
        this.materials.delete(material);
      }
    for (const texture of this.worldTextures) {
      texture.dispose();
      this.textures.delete(texture);
    }
    this.worldTextures.clear();
    this.world.clear();
    this.wallMeshes = null;
    this.fittings = [];
    this.fittingMaterial = null;
    this.reflection = null;
  }
  buildWorld() {
    const g = this.g,
      id = g.arena.mapId,
      profile = PROFILES[id] || PROFILES.outpost,
      n = g.level.length;
    this.clearWorld();
    this.mapKey = id;
    this.wallKeys = "";
    this.scene.fog.color.set(profile.fog);
    this.scene.fog.density = id === "freight" ? 0.021 : 0.012;
    const ground = this.material({
      color: profile.floor,
      map: this.tileTexture(this.groundColor, n / 3),
      normalMap: this.tileTexture(this.groundNormal, n / 3),
      roughnessMap: this.tileTexture(this.groundRough, n / 3),
      roughness: 0.65,
      normalScale: new THREE.Vector2(1.2, 1.2),
    });
    ground.userData.world = true;
    const floor = this.mesh(
      this.world,
      this.geo("floor", () => new THREE.PlaneGeometry(1, 1)),
      ground,
      [(n * SCALE) / 2, 0, (n * SCALE) / 2],
      [n * SCALE, n * SCALE, 1],
    );
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    this.wallMaterials = Array.from({ length: 7 }, (_, type) => {
      const colors = [
        "#8e948a",
        profile.metal,
        "#707f78",
        "#b0a489",
        "#84776b",
        "#909a9d",
        "#bcc2bd",
      ];
      const m = this.material({
        color: colors[type],
        map: this.metalColor,
        normalMap: this.metalNormal,
        roughnessMap: this.metalRough,
        roughness: 0.74,
        metalness: 0.45,
        normalScale: new THREE.Vector2(0.8, 0.8),
      });
      m.userData.world = true;
      return m;
    });
    this.rebuildWalls();
    const rail = this.material({ color: "#555c58", metalness: 0.7, roughness: 0.65 });
    rail.userData.world = true;
    for (let side = 0; side < 4; side++)
      for (let i = 0; i < n; i += 4) {
        const x = side === 0 ? 1 : side === 1 ? n - 1 : i + 1,
          z = side === 2 ? 1 : side === 3 ? n - 1 : i + 1;
        const pole = this.cylinder(this.world, rail, [x * SCALE, 4.8, z * SCALE], 0.055, 3.6, "y");
        pole.castShadow = false;
        const bar = this.box(this.world, rail, [x * SCALE, 6.55, z * SCALE], [1, 0.08, 0.08]);
        bar.castShadow = false;
        for (const dx of [-0.3, 0.3])
          this.box(this.world, rail, [x * SCALE + dx, 6.55, z * SCALE], [0.25, 0.18, 0.2]);
      }
    this.addLandmarks(id, n, rail);
    this.makePuddles(id, n);
    // World props stay non-colliding, just like the prior cosmetic scenery.
    const props =
      {
        outpost: [
          [1.5, 4.5],
          [14.5, 10.5],
        ],
        testblock: [
          [2.5, 7.5],
          [13.5, 7.5],
        ],
        skyport: [
          [7.5, 20.5],
          [17.5, 19.5],
        ],
        freight: [
          [1.5, 3.5],
          [10.5, 1.5],
        ],
        estate: [
          [5.5, 4.5],
          [15.5, 16.5],
        ],
      }[id] || [];
    for (const [x, z] of props) {
      const drum = this.cylinder(this.world, rail, [x * SCALE, 0.5, z * SCALE], 0.32, 1, "y", 32);
      for (const y of [0.2, 0.8])
        this.cylinder(drum, rail, [0, y - 0.5, 0], 1.03, 0.055, "y", 32).scale.set(
          0.34,
          0.055,
          0.34,
        );
    }
    this.sun.target.position.set((n * SCALE) / 2, 0, (n * SCALE) / 2);
    this.sun.position.set((n * SCALE) / 2 - 36, 24, (n * SCALE) / 2 - 18);
    this.sun.target.updateMatrixWorld();
  }
  rebuildWalls() {
    const g = this.g,
      key = g.level.map((row) => row.join("")).join("");
    if (key === this.wallKeys) return;
    this.wallKeys = key;
    if (this.wallMeshes) {
      for (const m of this.wallMeshes) {
        this.world.remove(m);
        m.dispose();
      }
    }
    for (const mesh of this.fittings || []) {
      this.world.remove(mesh);
      mesh.dispose();
    }
    this.fittings = [];
    if (this.fittingMaterial) {
      this.fittingMaterial.dispose();
      this.materials.delete(this.fittingMaterial);
    }
    this.wallMeshes = [];
    const dummy = new THREE.Object3D();
    for (let type = 1; type <= 6; type++) {
      const tiles = [];
      for (let y = 0; y < g.level.length; y++)
        for (let x = 0; x < g.level[y].length; x++) if (g.level[y][x] === type) tiles.push([x, y]);
      if (!tiles.length) continue;
      const mesh = new THREE.InstancedMesh(
        this.wallGeometry,
        this.wallMaterials[type],
        tiles.length,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      tiles.forEach(([x, y], i) => {
        dummy.position.set((x + 0.5) * SCALE, 1.5, (y + 0.5) * SCALE);
        dummy.scale.set(SCALE, 3, SCALE);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.world.add(mesh);
      this.wallMeshes.push(mesh);
    }
    this.wallFittings();
  }
  wallFittings() {
    // Small fittings hug existing collision walls; never obstruct an open lane.
    const steel = this.material({
      color: "#59615d",
      map: this.gunColor,
      normalMap: this.gunNormal,
      roughnessMap: this.gunRough,
      metalness: 0.8,
      roughness: 0.6,
    });
    steel.userData.world = true;
    this.fittingMaterial = steel;
    const panels = [],
      bolts = [];
    const level = this.g.level;
    for (let y = 0; y < level.length; y++)
      for (let x = 0; x < level[y].length; x++) {
        if (!level[y][x]) continue;
        for (const [dx, dz] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          if (level[y + dz]?.[x + dx] !== 0) continue;
          const cx = (x + 0.5) * SCALE + dx * (SCALE / 2 + 0.018),
            cz = (y + 0.5) * SCALE + dz * (SCALE / 2 + 0.018);
          for (const h of [0.1, 2.94])
            panels.push({ p: [cx, h, cz], s: dx ? [0.035, 0.06, SCALE] : [SCALE, 0.06, 0.035] });
          for (const offset of [-1.38, 1.38]) {
            panels.push({
              p: [cx + (dz ? offset : 0), 1.5, cz + (dx ? offset : 0)],
              s: dx ? [0.055, 2.9, 0.045] : [0.045, 2.9, 0.055],
            });
            for (const h of [0.3, 1.5, 2.7])
              bolts.push({
                p: [cx + (dz ? offset : 0) + dx * 0.03, h, cz + (dx ? offset : 0) + dz * 0.03],
                s: [0.06, 0.06, 0.06],
              });
          }
        }
      }
    const dummy = new THREE.Object3D();
    for (const items of [panels, bolts]) {
      const mesh = new THREE.InstancedMesh(
        this.geo("fitting-box", () => new THREE.BoxGeometry(1, 1, 1)),
        steel,
        items.length,
      );
      items.forEach(({ p, s }, i) => {
        dummy.position.set(...p);
        dummy.scale.set(...s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.world.add(mesh);
      this.fittings.push(mesh);
    }
  }
  addLandmarks(id, n, mat) {
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 256;
    const c = signCanvas.getContext("2d");
    c.fillStyle = "#c7c1ad";
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = "#464c47";
    c.font = "bold 76px monospace";
    c.fillText(id === "skyport" ? "GATE 07" : id === "freight" ? "CARGO 09" : "SECTOR 04", 22, 114);
    c.font = "24px monospace";
    c.fillText("MIDNRY / FIELD OPERATIONS", 22, 170);
    const tex = new THREE.CanvasTexture(signCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.add(tex);
    this.worldTextures.add(tex);
    const material = this.material({ map: tex, color: "#ffffff", roughness: 0.95 });
    material.userData.world = true;
    const signs = [];
    for (let y = 1; y < n - 1; y++)
      for (let x = 1; x < n - 1; x++)
        if (this.g.level[y][x] && !this.g.level[y + 1]?.[x] && signs.length < 18)
          signs.push([x, y]);
    for (const [x, z] of signs) {
      const plaque = this.mesh(
        this.world,
        this.geo("sign", () => new THREE.PlaneGeometry(1.5, 0.75)),
        material,
        [(x + 0.5) * SCALE, 1.8, (z + 1) * SCALE + 0.012],
      );
      plaque.castShadow = false;
    }
    if (id === "skyport") {
      const aluminum = this.material({ color: "#b8bebc", metalness: 0.5, roughness: 0.55 });
      aluminum.userData.world = true;
      const hullGeometry = new THREE.CylinderGeometry(
        4.5,
        4.5,
        42,
        48,
        1,
        true,
        -Math.PI / 2,
        Math.PI,
      );
      const fuselage = this.mesh(this.world, hullGeometry, aluminum, [20 * SCALE, 3, 11 * SCALE]);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.userData.ownedGeometry = true;
      aluminum.side = THREE.DoubleSide;
      this.box(this.world, aluminum, [20 * SCALE, 3.1, 11 * SCALE], [14, 0.12, 3]);
    }
    if (id === "estate") {
      const wreck = new THREE.Group();
      this.world.add(wreck);
      wreck.position.set(10 * SCALE, 0, 8.5 * SCALE);
      wreck.rotation.y = 0.5;
      this.box(wreck, mat, [0, 1.4, 0], [3, 2.3, 5]);
      this.box(wreck, mat, [0, 2.6, 0], [11, 0.07, 0.32]);
      this.box(wreck, mat, [0, 1.4, 4.6], [0.45, 0.65, 6]);
    }
  }
  makePuddles(id, n) {
    // One reflection camera covers the arena, with an irregular water mask.
    // This reflects moving characters and walls, rather than a painted highlight.
    const shader = {
      uniforms: THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
      vertexShader: Reflector.ReflectorShader.vertexShader
        .replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 wetUv;")
        .replace("vUv = textureMatrix", "wetUv = position.xy; vUv = textureMatrix"),
      fragmentShader: `uniform sampler2D tDiffuse; varying vec4 vUv; varying vec2 wetUv;
        #include <logdepthbuf_pars_fragment>
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        void main(){
          #include <logdepthbuf_fragment>
          float n=noise(wetUv*.22)+.28*noise(wetUv*.72);
          float mask=smoothstep(.49,.69,n);
          if(mask<.015) discard;
          vec2 uv=vUv.xy/vUv.w;
          vec2 ripple=vec2(noise(wetUv*5.),noise(wetUv*5.+17.))-.5;
          vec3 reflection=texture2D(tDiffuse,uv+ripple*.0015).rgb;
          gl_FragColor=vec4(reflection*vec3(.75,.83,.88),mask*.65);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    };
    const size = this.g.academy.preset === "high" ? 1024 : 512;
    const reflector = new Reflector(new THREE.PlaneGeometry(n * SCALE, n * SCALE), {
      textureWidth: size,
      textureHeight: size,
      clipBias: 0.003,
      multisample: 0,
      shader,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.set((n * SCALE) / 2, 0.014, (n * SCALE) / 2);
    reflector.material.transparent = true;
    reflector.material.depthWrite = false;
    reflector.userData.ownedGeometry = true;
    reflector.visible = this.g.academy.preset !== "performance";
    this.world.add(reflector);
    this.reflection = reflector;
    const draw = reflector.onBeforeRender.bind(reflector);
    reflector.onBeforeRender = (...args) => {
      if (this.scene.overrideMaterial) return;
      draw(...args);
    };
  }
  makeActor(e) {
    const root = new THREE.Group();
    this.dynamic.add(root);
    let model,
      mixer = null,
      actions = {};
    if (this.soldier) {
      model = cloneSkeleton(this.soldier.scene);
      mixer = new THREE.AnimationMixer(model);
      for (const clip of this.soldier.animations)
        if (clip.name !== "TPose") actions[clip.name] = mixer.clipAction(clip);
      actions.Idle?.play();
      mixer.update(0);
      model.updateMatrixWorld(true);
      model.traverse((o) => {
        if (o.isSkinnedMesh) {
          o.skeleton.update();
          o.computeBoundingBox();
        }
      });
      const bounds = new THREE.Box3().setFromObject(model),
        height = bounds.max.y - bounds.min.y,
        factor = 2.25 / height;
      model.scale.multiplyScalar(factor);
      model.position.y -= bounds.min.y * factor;
      model.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.color.set("#71776b");
          // Preserve the model's authored detail while suppressing its yellow armor tint.
          o.material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <map_fragment>",
              `#include <map_fragment>
               float fabricLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
               diffuseColor.rgb=mix(diffuseColor.rgb,vec3(fabricLuma),.85);`,
            );
          };
          o.castShadow = true;
          o.receiveShadow = true;
          this.materials.add(o.material);
        }
      });
      root.add(model);
    } else {
      model = new THREE.Group();
      root.add(model);
      const mat = this.material({ color: "#616454", roughness: 0.92 });
      this.mesh(
        model,
        this.geo("body", () => new THREE.CapsuleGeometry(0.3, 0.7, 8, 24)),
        mat,
        [0, 1.3, 0],
      );
      this.mesh(
        model,
        this.geo("head", () => new THREE.SphereGeometry(0.21, 24, 16)),
        mat,
        [0, 1.95, 0],
      );
      for (const x of [-0.18, 0.18])
        this.mesh(
          model,
          this.geo("leg", () => new THREE.CapsuleGeometry(0.12, 0.6, 6, 20)),
          mat,
          [x, 0.48, 0],
        );
    }
    const patch = this.material({
      color: e.team === this.g.player.team && this.g.mode === "duo" ? "#a2c8b1" : "#9b7465",
      roughness: 0.9,
    });
    this.box(root, patch, [0.32, 1.62, 0.05], [0.06, 0.15, 0.1]);
    const actor = {
      root,
      model,
      mixer,
      actions,
      action: "Idle",
      patch,
      x: e.x,
      y: e.y,
      lastSample: null,
      deadAt: null,
    };
    this.actors.set(e.id, actor);
    return actor;
  }
  updateActors(t) {
    const current = new Set();
    const camera = this.g.camera();
    const sample = Math.floor(t * 30) / 30;
    for (const e of this.g.arena.entities) {
      if (e.id === camera.id) continue;
      current.add(e.id);
      let a = this.actors.get(e.id);
      if (!a) a = this.makeActor(e);
      const moving = Math.hypot(e.x - a.x, e.y - a.y) > 0.001;
      a.patch.color.set(
        e.team === this.g.player.team && this.g.mode === "duo" ? "#a2c8b1" : "#9b7465",
      );
      const alive = e.hp > 0,
        cloaked = e.cloakedUntil > this.g.time && e.team !== this.g.player.team;
      const now = performance.now() / 1000;
      if (alive) a.deadAt = null;
      else if (a.deadAt === null) a.deadAt = now;
      const fall = alive ? 0 : Math.min(1, (now - a.deadAt) / 0.85);
      a.root.visible = (alive || now - a.deadAt < 2.5) &&
        (!cloaked || Math.hypot(e.x - camera.x, e.y - camera.y) < 1.3);
      const sliding = alive && e.slideUntil > this.g.time;
      a.root.scale.y = sliding ? 0.55 : 1;
      a.root.position.set(
        e.x * SCALE,
        Math.sin(Math.min(1, Math.max(0, ((e.jumpUntil || 0) - this.g.time) / 0.5)) * Math.PI) *
          SCALE,
        e.y * SCALE,
      );
      a.root.rotation.y = -Math.PI / 2 - e.a;
      const next =
        alive && moving && !this.motion.matches && !sliding
          ? (e.sprinting || e.speedUntil > this.g.time ? "Run" : "Walk") : "Idle";
      if (next !== a.action) {
        a.actions[a.action]?.fadeOut(0.12);
        a.actions[next]?.reset().fadeIn(0.12).play();
        a.action = next;
      }
      if (a.mixer && a.lastSample !== sample) {
        a.mixer.update(
          a.lastSample === null ? 0 : Math.max(0, Math.min(0.1, sample - a.lastSample)),
        );
        a.lastSample = sample;
      }
      a.x = e.x;
      a.y = e.y;
      // Short physical recoil and hit flinch layered on skeletal locomotion.
      const hit = Math.max(0, 1 - (this.g.time - e.hit) / 0.18);
      a.model.rotation.z = alive ? hit * 0.05 : this.motion.matches ? Math.PI / 2 : fall * 1.5;
    }
    for (const [id, a] of this.actors)
      if (!current.has(id)) {
        this.dynamic.remove(a.root);
        a.mixer?.stopAllAction();
        a.root.traverse((o) => {
          if (o.isMesh) {
            o.material.dispose();
            this.materials.delete(o.material);
          }
        });
        this.actors.delete(id);
      }
  }
  weaponMaterials() {
    const materials = {
      metal: this.material({
        color: "#555c59",
        map: this.gunColor,
        metalness: 0.85,
        roughness: 0.55,
        normalMap: this.gunNormal,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughnessMap: this.gunRough,
      }),
      polymer: this.material({ color: "#555344", metalness: 0.05, roughness: 0.88 }),
      steel: this.material({ color: "#5a6261", metalness: 0.9, roughness: 0.35 }),
      cloth: this.material({
        color: "#666b55",
        map: this.gloveColor,
        normalMap: this.gloveNormal,
        roughnessMap: this.gloveRough,
        roughness: 0.92,
      }),
      rubber: this.material({
        color: "#45483d",
        map: this.gloveColor,
        normalMap: this.gloveNormal,
        roughnessMap: this.gloveRough,
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughness: 0.9,
      }),
      skin: this.material({ color: "#b48a6d", roughness: 0.76 }),
    };
    Object.values(materials).forEach((m) => (m.userData.weapon = true));
    return materials;
  }
  hand(parent, x, y, z, m) {
    const arm = this.mesh(
      parent,
      this.geo("arm", () => new THREE.CapsuleGeometry(0.045, 0.34, 8, 24)),
      m.cloth,
      [x, y - 0.17, z + 0.15],
    );
    arm.rotation.x = -0.65;
    arm.rotation.z = x < 0 ? -0.28 : 0.12;
    this.box(parent, m.rubber, [x, y, z], [0.11, 0.075, 0.17]);
    for (let i = 0; i < 4; i++) {
      this.mesh(
        parent,
        this.geo("knuckle", () => new THREE.SphereGeometry(0.016, 16, 12)),
        m.cloth,
        [x - 0.04 + i * 0.025, y + 0.032, z + 0.018],
        [1, 0.55, 0.8],
      );
      const finger = this.mesh(
        parent,
        this.geo("finger", () => new THREE.CapsuleGeometry(0.011, 0.045, 6, 16)),
        m.rubber,
        [x - 0.04 + i * 0.025, y + 0.035, z - 0.045],
      );
      finger.rotation.x = Math.PI / 2;
    }
  }
  firearm(parent, m, kind = "rifle", offset = 0) {
    const gun = new THREE.Group();
    parent.add(gun);
    gun.position.x = offset;
    this.box(gun, m.metal, [0, 0, -0.52], [0.085, 0.1, 0.28]); // Receiver.
    this.box(gun, m.polymer, [0, -0.025, -0.31], [0.055, 0.075, 0.18]); // Adjustable stock.
    this.box(gun, m.rubber, [0, 0.015, -0.23], [0.065, 0.14, 0.035]);
    const grip = this.box(gun, m.polymer, [0, -0.1, -0.45], [0.042, 0.15, 0.07]);
    grip.rotation.x = -0.25;
    const mag = this.box(gun, m.metal, [0, -0.14, -0.58], [0.044, 0.19, 0.065]);
    mag.rotation.x = 0.16;
    this.box(gun, m.polymer, [0, -0.005, -0.76], [0.075, 0.085, 0.22]); // Vented handguard.
    for (let i = 0; i < 7; i++)
      this.box(gun, m.metal, [0, 0.052, -0.64 - i * 0.024], [0.077, 0.009, 0.01]);
    for (const x of [-0.039, 0.039])
      for (let i = 0; i < 5; i++)
        this.box(gun, m.metal, [x, 0, -0.7 - i * 0.028], [0.004, 0.021, 0.012]);
    for (const z of [-0.44, -0.54])
      for (const x of [-0.044, 0.044])
        this.cylinder(gun, m.steel, [x, 0.018, z], 0.006, 0.005, "x", 12);
    this.box(gun, m.rubber, [0.044, 0.014, -0.51], [0.006, 0.031, 0.065]); // Recessed ejection port.
    this.box(gun, m.steel, [0.047, 0.015, -0.46], [0.012, 0.014, 0.035]); // Charging lever.
    this.cylinder(gun, m.steel, [-0.045, -0.02, -0.43], 0.012, 0.008, "x", 16);
    for (let i = 0; i < 5; i++)
      this.box(gun, m.polymer, [0.024, -0.08 - i * 0.026, -0.58], [0.004, 0.008, 0.05]);
    this.cylinder(gun, m.metal, [0, 0.018, -0.935], 0.014, 0.18);
    this.cylinder(gun, m.metal, [0, 0.018, -1.036], 0.022, 0.035);
    this.cylinder(gun, m.rubber, [0, 0.018, -1.056], 0.012, 0.002);
    const guard = this.mesh(
      gun,
      this.geo("trigger", () => new THREE.TorusGeometry(0.028, 0.004, 8, 24)),
      m.metal,
      [0, -0.066, -0.48],
    );
    guard.rotation.y = Math.PI / 2;
    if (kind === "rifle" || kind === "burst") {
      this.box(gun, m.metal, [0, 0.07, -0.51], [0.065, 0.023, 0.075]);
      for (const x of [-0.035, 0.035])
        this.box(gun, m.metal, [x, 0.105, -0.51], [0.014, 0.08, 0.05]);
      this.box(gun, m.metal, [0, 0.143, -0.51], [0.08, 0.016, 0.05]);
      const glass = this.material({
        color: "#607b7a",
        transparent: true,
        opacity: 0.18,
        metalness: 0.6,
        roughness: 0.05,
      });
      this.box(gun, glass, [0, 0.108, -0.52], [0.054, 0.055, 0.002]);
    }
    if (kind === "shotgun") {
      mag.visible = false;
      this.cylinder(gun, m.metal, [0, -0.025, -0.82], 0.019, 0.36);
      this.box(gun, m.polymer, [0, -0.012, -0.81], [0.075, 0.08, 0.15]);
    }
    this.hand(gun, 0.032, -0.105, -0.445, m);
    this.hand(gun, -0.045, -0.058, -0.75, m);
    return gun;
  }
  updateWeapon(id = this.g.player.weapon) {
    if (id === this.weaponId) return;
    this.rig.traverse((o) => {
      if (o.isMesh) {
        if (o.userData.ownedGeometry) o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) {
          m.dispose();
          this.materials.delete(m);
        }
      }
    });
    for (const mat of this.materials)
      if (mat.userData.weapon) {
        mat.dispose();
        this.materials.delete(mat);
      }
    this.rig.clear();
    this.weaponId = id;
    const m = this.weaponMaterials();
    const firearms = ["carbine", "scatter", "twin", "breach"];
    if (firearms.includes(id)) {
      if (id === "twin") {
        for (const x of [-0.16, 0.16]) {
          const pistol = this.firearm(this.rig, m, "burst", x);
          pistol.scale.set(0.8, 0.8, 0.55);
        }
      } else this.firearm(this.rig, m, ["scatter", "breach"].includes(id) ? "shotgun" : "rifle");
    } else if (id === "rocket") {
      this.cylinder(this.rig, m.polymer, [0.02, 0, -0.62], 0.095, 0.66);
      this.cylinder(this.rig, m.metal, [0.02, 0, -0.96], 0.1, 0.03);
      this.cylinder(this.rig, m.rubber, [0.02, 0, -0.982], 0.078, 0.004);
      this.box(this.rig, m.metal, [0.02, 0.12, -0.65], [0.05, 0.12, 0.06]);
      this.box(this.rig, m.polymer, [0.02, -0.13, -0.45], [0.04, 0.17, 0.06]);
      this.hand(this.rig, 0.06, -0.13, -0.47, m);
      this.hand(this.rig, -0.045, -0.09, -0.77, m);
    } else if (id === "demo" || id === "shard") {
      for (const x of id === "demo" ? [-0.055, 0.055] : [0]) {
        this.cylinder(this.rig, m.polymer, [x, -0.07, -0.52], 0.055, 0.21, "y");
        this.box(this.rig, m.metal, [x, 0.045, -0.52], [0.06, 0.02, 0.045]);
        const ring = this.mesh(
          this.rig,
          this.geo("pin", () => new THREE.TorusGeometry(0.02, 0.003, 8, 24)),
          m.steel,
          [x, 0.065, -0.52],
        );
        ring.rotation.y = 0.3;
      }
      this.hand(this.rig, 0.02, -0.2, -0.5, m);
    } else if (id === "brawler") {
      this.hand(this.rig, -0.22, -0.03, -0.45, m);
      this.hand(this.rig, 0.12, -0.03, -0.45, m);
    } else {
      const count = id === "reaper" ? 1 : id === "veil" ? 4 : 3;
      for (let i = 0; i < count; i++) {
        const blade = new THREE.Group();
        this.rig.add(blade);
        blade.position.set((i - (count - 1) / 2) * 0.04, 0, -0.52);
        blade.rotation.z = (i - (count - 1) / 2) * 0.2;
        this.box(blade, m.rubber, [0, -0.13, 0], [0.023, 0.12, 0.022]);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              -0.015, -0.05, 0, 0.015, -0.05, 0, 0, 0.23, 0, -0.015, -0.05, 0.006, 0, 0.23, 0.006,
              0.015, -0.05, 0.006,
            ],
            3,
          ),
        );
        geometry.computeVertexNormals();
        const mesh = this.mesh(blade, geometry, m.steel);
        mesh.userData.ownedGeometry = true;
      }
      this.hand(this.rig, 0.005, -0.22, -0.48, m);
    }
    this.rig.position.set(id === "twin" || id === "brawler" ? 0.05 : 0.23, -0.2, 0);
    this.rig.rotation.set(0.02, -0.07, -0.025);
  }
  preview(c, id, width, height) {
    if (this.disposed || !this.soldier) return false;
    const key = id + ":" + width + ":" + height;
    this.previews ||= new Map();
    if (this.previews.has(key)) {
      c.drawImage(this.previews.get(key), 0, 0, width, height);
      return true;
    }
    this.previewTarget ||= new THREE.WebGLRenderTarget(256, 160);
    const target = this.previewTarget,
      oldTarget = this.renderer.getRenderTarget(),
      oldId = this.weaponId;
    const oldPosition = this.rig.position.clone(),
      oldRotation = this.rig.quaternion.clone();
    const oldAuto = this.renderer.autoClear,
      oldColor = this.renderer.getClearColor(new THREE.Color()),
      oldAlpha = this.renderer.getClearAlpha();
    this.updateWeapon(id);
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    const camera = new THREE.PerspectiveCamera(35, 256 / 160, 0.01, 10);
    camera.position.set(0.9, 0.3, 0.4);
    camera.lookAt(0, -0.04, -0.6);
    this.renderer.setRenderTarget(target);
    this.renderer.setClearColor("#26312c", 1);
    this.renderer.autoClear = true;
    this.renderer.render(this.weaponScene, camera);
    const pixels = new Uint8Array(256 * 160 * 4);
    this.renderer.readRenderTargetPixels(target, 0, 0, 256, 160, pixels);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext("2d"),
      image = ctx.createImageData(256, 160);
    for (let row = 0; row < 160; row++)
      image.data.set(pixels.subarray((159 - row) * 256 * 4, (160 - row) * 256 * 4), row * 256 * 4);
    ctx.putImageData(image, 0, 0);
    this.previews.set(key, canvas);
    this.renderer.setRenderTarget(oldTarget);
    this.renderer.setClearColor(oldColor, oldAlpha);
    this.renderer.autoClear = oldAuto;
    this.updateWeapon(oldId);
    this.rig.position.copy(oldPosition);
    this.rig.quaternion.copy(oldRotation);
    c.drawImage(canvas, 0, 0, width, height);
    return true;
  }
  updatePickups(t) {
    const crateMat =
      this.crateMaterial ||
      (this.crateMaterial = this.material({
        color: "#767869",
        roughness: 0.88,
        metalness: 0.12,
        map: this.metalColor,
      }));
    const latch =
      this.latchMaterial ||
      (this.latchMaterial = this.material({ color: "#bab5a1", roughness: 0.62, metalness: 0.8 }));
    const activeCrates = new Set();
    for (const e of this.g.crates) {
      if (e.hp <= 0) continue;
      activeCrates.add(e.id);
      let root = this.crates.get(e.id);
      if (!root) {
        root = new THREE.Group();
        this.dynamic.add(root);
        this.box(root, crateMat, [0, 0.9, 0], [1.85, 1.8, 1.85]);
        for (const x of [-0.6, 0.6]) {
          this.box(root, latch, [x, 0.9, 0.94], [0.055, 1.7, 0.025]);
          this.box(root, latch, [x, 1.83, 0], [0.055, 0.025, 1.7]);
        }
        this.box(root, latch, [0, 1.05, 0.95], [0.34, 0.13, 0.06]);
        this.crates.set(e.id, root);
      }
      root.position.set(e.x * SCALE, 0, e.y * SCALE);
    }
    for (const [id, root] of this.crates)
      if (!activeCrates.has(id)) {
        this.dynamic.remove(root);
        this.crates.delete(id);
      }
    const activeCores = new Set();
    for (let i = 0; i < this.g.cores.length; i++) {
      const e = this.g.cores[i],
        key = e.x + ":" + e.y + ":" + i;
      activeCores.add(key);
      let root = this.cores.get(key);
      if (!root) {
        root = new THREE.Group();
        this.dynamic.add(root);
        this.box(root, latch, [0, 0, 0], [0.28, 0.38, 0.2]);
        const glow = this.material({
          color: "#aac8b2",
          emissive: "#476651",
          emissiveIntensity: 0.7,
          metalness: 0.5,
          roughness: 0.3,
        });
        this.box(root, glow, [0, 0, 0.11], [0.18, 0.26, 0.025]);
        this.cores.set(key, root);
      }
      root.position.set(
        e.x * SCALE,
        0.5 + (this.motion.matches ? 0 : Math.sin(t * 2) * 0.06),
        e.y * SCALE,
      );
      root.rotation.y = this.motion.matches ? 0 : t * 0.5;
    }
    for (const [id, root] of this.cores)
      if (!activeCores.has(id)) {
        this.dynamic.remove(root);
        root.traverse((o) => {
          if (o.isMesh && o.material !== latch) {
            o.material.dispose();
            this.materials.delete(o.material);
          }
        });
        this.cores.delete(id);
      }
  }
  updateFields() {
    const current = new Set();
    for (const field of this.g.arena.fields) {
      current.add(field.id);
      let root = this.fields.get(field.id);
      if (!root) {
        root = new THREE.Group();
        this.dynamic.add(root);
        const warning = this.material({
          color: "#819e68",
          emissive: "#527938",
          emissiveIntensity: 0.7,
          transparent: true,
          opacity: 0.5,
          roughness: 0.4,
          depthWrite: false,
        });
        const ring = this.mesh(
          root,
          this.geo("field-ring", () => new THREE.RingGeometry(0.94, 1, 64)),
          warning,
        );
        ring.rotation.x = -Math.PI / 2;
        ring.castShadow = false;
        this.fields.set(field.id, root);
      }
      root.position.set(field.x * SCALE, 0.04, field.y * SCALE);
      root.scale.setScalar(field.radius * SCALE);
    }
    for (const [id, root] of this.fields)
      if (!current.has(id)) {
        this.dynamic.remove(root);
        root.traverse((o) => {
          if (o.isMesh) {
            o.material.dispose();
            this.materials.delete(o.material);
          }
        });
        this.fields.delete(id);
      }
  }
  updateProjectiles(t) {
    const mat =
      this.bulletMaterial ||
      (this.bulletMaterial = this.material({ color: "#c5ab71", metalness: 0.8, roughness: 0.32 }));
    const active = new Set();
    for (const p of this.g.arena.projectiles) {
      active.add(p.id);
      let mesh = this.projectiles.get(p.id);
      if (!mesh) {
        mesh = new THREE.Group();
        this.dynamic.add(mesh);
        if (p.kind === "rocket" || p.kind === "barrage") {
          this.cylinder(mesh, mat, [0, 0, 0], 0.065, 0.32, "z", 24);
          const nose = this.mesh(
            mesh,
            this.geo("rocket-nose", () => new THREE.ConeGeometry(0.065, 0.14, 24)),
            mat,
            [0, 0, -0.23],
          );
          nose.rotation.x = -Math.PI / 2;
          for (let i = 0; i < 4; i++) {
            const fin = this.box(mesh, mat, [0, 0, 0.13], [0.18, 0.015, 0.1]);
            fin.rotation.z = (i * Math.PI) / 2;
          }
        } else if (p.kind === "lob" || p.kind === "barrel") {
          for (const x of p.kind === "lob" ? [-0.06, 0.06] : [0]) {
            this.cylinder(mesh, mat, [x, 0, 0], p.kind === "barrel" ? 0.17 : 0.055, 0.23, "y", 20);
            this.box(mesh, mat, [x, 0.14, 0], [0.05, 0.04, 0.035]);
          }
        } else {
          // Solid knife profile for thrown blades; poison/spike trails stay separate.
          const blade = this.mesh(
            mesh,
            this.geo("projectile-blade", () => new THREE.ConeGeometry(0.06, 0.28, 4)),
            mat,
            [0, 0, -0.1],
          );
          blade.rotation.x = -Math.PI / 2;
          blade.scale.z = 0.15;
          this.cylinder(mesh, mat, [0, 0, 0.09], 0.021, 0.12, "z", 12);
        }
        this.projectiles.set(p.id, mesh);
      }
      mesh.position.set(p.x * SCALE, 1.5 + (p.height || 0) * SCALE, p.y * SCALE);
      mesh.rotation.set(0, -p.a - Math.PI / 2, 0);
    }
    for (const [id, m] of this.projectiles)
      if (!active.has(id)) {
        this.dynamic.remove(m);
        this.projectiles.delete(id);
      }
    // Cosmetic hitscan trajectories read shot timestamps and the authoritative ray.
    const seen = new Set();
    for (const e of this.g.arena.entities) {
      seen.add(e.id);
      if (this.seenShots.get(e.id) === e.shotAt) continue;
      this.seenShots.set(e.id, e.shotAt);
      if (
        t - e.shotAt < 0 ||
        t - e.shotAt > 0.15 ||
        !["carbine", "scatter", "twin", "breach"].includes(e.weapon)
      )
        continue;
      const hit = this.g.arena.cast(e.x, e.y, Math.cos(e.a), Math.sin(e.a));
      const length = Math.min(18, hit.distance) * SCALE;
      const line = this.mesh(
        this.dynamic,
        this.geo("tracer", () => new THREE.CylinderGeometry(0.007, 0.007, 1, 6)),
        this.tracerMaterial ||
          (this.tracerMaterial = this.material({
            color: "#e9c995",
            emissive: "#c9a56e",
            emissiveIntensity: 2,
          })),
        [
          e.x * SCALE + (Math.cos(e.a) * length) / 2,
          1.5,
          e.y * SCALE + (Math.sin(e.a) * length) / 2,
        ],
        [1, length, 1],
      );
      line.rotation.z = Math.PI / 2;
      line.rotation.y = -e.a;
      line.castShadow = false;
      this.tracers.push({ mesh: line, born: t });
    }
    this.tracers = this.tracers.filter((tracer) => {
      if (t - tracer.born < 0.075 && this.tracers.length <= 32) return true;
      this.dynamic.remove(tracer.mesh);
      return false;
    });
    for (const id of this.seenShots.keys()) if (!seen.has(id)) this.seenShots.delete(id);
  }
  render() {
    if (this.disposed) return false;
    this.configure();
    const g = this.g,
      t = g.animationTime;
    if (this.mapKey !== g.arena.mapId || this.loadedMap !== !!this.soldier) {
      this.loadedMap = !!this.soldier;
      for (const a of this.actors.values()) {
        this.dynamic.remove(a.root);
        a.mixer?.stopAllAction();
      }
      for (const a of this.actors.values())
        a.root.traverse((o) => {
          if (o.isMesh) {
            o.material.dispose();
            this.materials.delete(o.material);
          }
        });
      this.actors.clear();
      this.buildWorld();
    }
    this.rebuildWalls();
    const p = g.camera(),
      pitch = Math.atan(g.viewPitch / g.projection);
    const now = performance.now(),
      dt = Math.min(0.1, (now - (this.lastRenderAt || now)) / 1000),
      targetHeight = p.slideUntil > g.time ? 0.7 : 1.5;
    this.lastRenderAt = now;
    this.eyeHeight ??= 1.5;
    this.eyeHeight += (targetHeight - this.eyeHeight) * (1 - Math.exp(-dt * 18));
    const fall = this.motion.matches ? 0 : (g.deathProgress || 0) ** 2;
    this.camera.position.set(p.x * SCALE, g.deathSequence ? 1.5 - fall * 1.25 : this.eyeHeight, p.y * SCALE);
    this.camera.rotation.set(pitch - fall * 0.25, -p.a - Math.PI / 2, fall * 0.5, "YXZ");
    this.updateActors(t);
    this.updatePickups(t);
    this.updateFields();
    if (t < this.lastTime) {
      this.seenShots.clear();
      for (const tracer of this.tracers) {
        this.dynamic.remove(tracer.mesh);
      }
      this.tracers = [];
    }
    this.updateProjectiles(t);
    this.updateWeapon();
    const recoil = Math.max(0, 1 - (t - g.shotAt) / 0.16),
      reload = Math.max(0, Math.min(1, (g.reloadUntil - t) / 1.4));
    this.rig.position.y =
      -0.2 * Math.max(1, this.g.h / this.g.w) -
      (reload > 0 ? Math.sin(reload * Math.PI) * 0.25 : 0) +
      (this.motion.matches ? 0 : Math.sin(g.step) * 0.005);
    this.rig.position.y -= fall * 0.65;
    this.rig.position.z = recoil * 0.04;
    this.rig.rotation.x = 0.02 - recoil * 0.075;
    this.rig.rotation.z = -0.025 + Math.sin(reload * Math.PI) * 0.3;
    this.flash.intensity = recoil > 0.65 ? 3 : 0;
    this.rig.visible = g.player.hp > 0 || (!!g.deathSequence && g.deathProgress < 0.65);
    const outside =
      g.mode !== "training" &&
      g.time > g.zone.delay &&
      (Math.abs(p.x - g.zone.cx) > g.zone.half || Math.abs(p.y - g.zone.cy) > g.zone.half);
    this.scene.fog.color.set(outside ? "#827276" : PROFILES[g.arena.mapId].fog);
    this.scene.fog.density = outside ? 0.065 : 0.009;
    this.renderer.info.reset();
    if (g.academy.preset === "performance") {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.weaponScene, this.weaponCamera);
      this.renderer.autoClear = true;
    } else this.composer.render();
    this.lastTime = t;
    return true;
  }
  disposeObject(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m?.dispose();
      }
    });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const a of this.actors.values()) a.mixer?.stopAllAction();
    this.previewTarget?.dispose();
    this.composer.dispose();
    for (const pass of this.composer.passes) pass.dispose?.();
    this.clearWorld();
    for (const m of this.materials) m.dispose();
    for (const geo of this.geometries.values()) geo.dispose();
    for (const t of this.textures) t.dispose();
    if (this.soldier) this.disposeObject(this.soldier.scene);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.contextLost);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.actors.clear();
    this.materials.clear();
    this.textures.clear();
  }
}
