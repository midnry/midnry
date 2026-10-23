/** Cinematic 3D presentation. Arena retains every movement, damage and network rule. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { loadRealismSurfaces, surfaceMaterial } from "./realism-surfaces.js";
import { initNaturalLighting, updateNaturalLighting } from "./realism-lighting.js";
import { decorateRealisticEnvironment } from "./realism-environment.js";
import { buildStationTerminal, buildMedicalCabinet, buildCabinetLabel, buildMedicalCase, buildSupplyBox, buildCharge, buildEmergencyConsole, updateChargePresentation } from './interactables.js';
import { medicalDepotStorage } from './room-medical-depot.js';
import { commandStorage } from './room-command-operations.js';
import { communicationsStorage } from './room-communications-radar.js';
import {
  prepareCharacterAsset,
  prepareLockerCharacter,
  loadOperatorResponse,
  finishActor,
  updateActorPresentation,
} from "./realism-characters.js";
import {
  weaponMaterials as realisticWeaponMaterials,
  buildRealisticHand,
  finishWeapon,
  batchWeapon,
} from "./realism-weapons.js";
import { buildCarbine, animateCarbine, prepareWeaponKit, buildModelledShotgun, buildModelledPistols } from "./realism-carbine.js";
import { PlayerIdentification } from "./realism-identification.js";
import {buildRiggedHand,disposeRiggedHands} from './realism-hands.js';
import {bindWeaponGrip,updateWeaponGrip} from './realism-grips.js';
import { outfitOf, weaponOf, mapOf } from "../../public/games/outpost-content.js";
import { CanalWater } from "./canal-water.js";
import { floodLevel } from "../../public/games/outpost-hazards.js";
import { QuayLandmarks } from "./quay-landmarks.js";
import { QuayInteriors } from "./quay-interiors.js";
import { skinPattern } from "../../public/games/outpost-skins.js";
import { VictimTakedown } from "./takedowns.js";
import { ASSET_CACHE, CHARACTER_CACHE } from "../../public/games/outpost-asset-manifest.js";
import { CHARACTERS, botCharacter } from "../../public/games/outpost-characters.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { sightRange } from "../../public/games/outpost-variety.js";
import { isAppleTouchDevice, graphicsProfile, cinematicRenderSize } from "./compatibility.js";
import { RenderTelemetry, actorInView, ACTOR_SPHERE_HEIGHT, ACTOR_SPHERE_RADIUS, HAZE_FOG_DENSITY } from "./telemetry.js";
import { batchStaticByMaterial } from "./static-batches.js";
import { WorldVisibility } from "./world-visibility.js";
import { roofLayout } from "./architecture.js";
import { GroundTrail } from "./ground-trail.js";
import { NightDressing } from "./realism-night.js";
import { prepareWorldTypography, makeProtocolSign, crispText } from './world-text.js';
import { prepareMedevac, buildMedevac } from "./realism-medevac.js";
import { buildHospital, updateHospital } from "./realism-hospital.js";
import { STANCE, stanceOf, jumpLift } from "../../public/games/outpost-stance.js";
import { HOSPITAL_MAP } from "../../public/games/outpost-protocol-map.js";
import { HazardDressing, buildHazard } from "./realism-hazards.js";
import { ArenaStyles } from "./arena-style.js";
import { SkyClouds } from "./sky-clouds.js";
import { LobbyStage } from "./lobby-stage.js";
import { EventDressing } from "./realism-events.js";
import { preparePropKit, buildFurniture } from "./realism-props.js";
import { BattlePreparation } from "./battle-preparation.js";
const SCALE = 3,
  ASSET = "/games/military/",
  TAU = Math.PI * 2;
/** Field of view while aiming down the sights, as a share of the normal
 * view: long guns zoom most, scatterguns and thrown weapons a little. */
// Distance (tiles, 1 tile = 3 m) beyond which a character uses its reduced
// mesh and 15 Hz animation. Was 6 (desktop) / 3.8 (phone): the swap was
// visible at mid range. The reduced mesh keeps 45% of the triangles and the
// full textures, so it is still a whole, readable body.
export const ACTOR_LOD_TILES = { desktop: 10, phone: 6.5 };
const ADS_ZOOM = { carbine: 0.6, twin: 0.7, rocket: 0.72, scatter: 0.85, breach: 0.88 };
/** Where the gun sits when aiming: the carbine's optic on the crosshair. */
const ADS_RIG = { carbine: { x: -0.008, y: 0.08 }, twin: { x: 0.05, y: 0.04 }, other: { x: 0.02, y: 0.05 } };
/** Each arena's daytime sky and light, over the one photographed sky:
 * how bright the photo shows (`intensity`), the drifting cloud layer
 * (`coverage`, `lit`, `shade`), the sun and sky-light colours, and a
 * subtle grade (`highlight` / `shadow` tints, `saturation`). Night, storms
 * and sandstorms override these as before. Fog density is unchanged, so
 * rivals stay as visible as they were. */
const DEFAULT_SKY = {
  // horizon / hazeAlpha / hazeHeight: the haze band the cloud layer draws
  // over the photograph's grey horizon (0 = none). sunElevation (degrees)
  // lowers or raises the photographed sun: long or short shadows.
  horizon: "#d4c8ad",
  hazeAlpha: 0,
  hazeHeight: 0.25,
  intensity: 0.58,
  coverage: 0.46,
  lit: [1.3, 1.26, 1.18],
  shade: "#bcc4cf",
  sun: "#ffeccf",
  skyLight: "#cad9e1",
  groundLight: "#746c5c",
  highlight: [1.025, 1.01, 0.98],
  shadow: [0.97, 1.0, 1.025],
  saturation: 1.0,
};
const SKIES = {
  // Dust Outpost: late-afternoon desert. Warm sun, a thinner, higher cloud
  // layer, sand-coloured haze and bounce light, a touch more saturation.
  outpost: {
    // zenith / horizonSky / sunGlow: the arena's own daytime sky, drawn over
    // the photograph (which still lights and reflects).
    zenith: "#6f93b6",
    horizonSky: "#eacba0",
    sunGlow: "#ffd29a",
    horizon: "#e0b985",
    hazeAlpha: 0.62,
    hazeHeight: 0.3,
    sunElevation: 30,
    intensity: 0.6,
    coverage: 0.3,
    lit: [1.36, 1.25, 1.06],
    shade: "#c4b7a6",
    sun: "#ffe4b8",
    skyLight: "#d6d0c2",
    groundLight: "#8a7558",
    highlight: [1.06, 1.01, 0.92],
    shadow: [0.96, 0.985, 1.02],
    saturation: 1.1,
  },
  // Skyport: clear coastal light, cooler and crisper, bigger clouds.
  skyport: {
    // zenith / horizonSky / sunGlow: the arena's own daytime sky, drawn over
    // the photograph (which still lights and reflects).
    zenith: "#5f8fc0",
    horizonSky: "#d6e1ea",
    sunGlow: "#fff1dc",
    horizon: "#cfdde8",
    hazeAlpha: 0.35,
    hazeHeight: 0.2,
    sunElevation: 48,
    intensity: 0.62,
    coverage: 0.52,
    lit: [1.3, 1.29, 1.26],
    shade: "#aab6c6",
    sun: "#fff3e0",
    skyLight: "#c6d8e6",
    groundLight: "#6f7072",
    highlight: [1.0, 1.01, 1.04],
    shadow: [0.97, 0.995, 1.03],
    saturation: 1.04,
  },
  // Wreck Estate: humid, hazy and soft; greener bounce from the gardens.
  estate: {
    // zenith / horizonSky / sunGlow: the arena's own daytime sky, drawn over
    // the photograph (which still lights and reflects).
    zenith: "#8aa3b8",
    horizonSky: "#dcd7cb",
    sunGlow: "#ffe9cc",
    horizon: "#d9d3c4",
    hazeAlpha: 0.5,
    hazeHeight: 0.28,
    sunElevation: 40,
    intensity: 0.56,
    coverage: 0.58,
    lit: [1.26, 1.25, 1.2],
    shade: "#b4b8bc",
    sun: "#fff0d8",
    skyLight: "#cdd6d6",
    groundLight: "#6b7558",
    highlight: [1.03, 1.015, 0.97],
    shadow: [0.975, 1.0, 1.01],
    saturation: 1.0,
  },
  // Calder Quay (Last Signal and the Blackout base): harbour evening,
  // amber light low on the water.
  quay: {
    // zenith / horizonSky / sunGlow: the arena's own daytime sky, drawn over
    // the photograph (which still lights and reflects).
    zenith: "#6a88aa",
    horizonSky: "#edc394",
    sunGlow: "#ffc98a",
    horizon: "#e2b98e",
    hazeAlpha: 0.6,
    hazeHeight: 0.32,
    sunElevation: 24,
    intensity: 0.58,
    coverage: 0.42,
    lit: [1.34, 1.22, 1.08],
    shade: "#b9aea6",
    sun: "#ffdfae",
    skyLight: "#d4cfc4",
    groundLight: "#7a6c5a",
    highlight: [1.05, 0.995, 0.93],
    shadow: [0.965, 0.99, 1.02],
    saturation: 1.06,
  },
};
SKIES.town = SKIES.quay;
const PROFILES = {
  outpost: { floor: "#a69980", fog: "#d9c6a0", metal: "#788178" },
  testblock: { floor: "#8e958c", fog: "#b8c1c5", metal: "#75806e" },
  skyport: { floor: "#bbc0bf", fog: "#bccbd0", metal: "#8e999b" },
  freight: { floor: "#747d7d", fog: "#a5b3bd", metal: "#647269" },
  estate: { floor: "#c6bca5", fog: "#cfc8b8", metal: "#81867b" },
  breakwater: { floor: "#b2a38c", fog: "#a8bdc4", metal: "#77858b" },
  medevac: { floor: "#7c888a", fog: "#b8c9d0", metal: "#92a1a3" },
  hospital: { floor: "#8f8466", fog: "#b9b8ac", metal: "#7d8580" },
  quay: { floor: "#a69980", fog: "#d2bda4", metal: "#788178" },
};
export class MilitaryRenderer {
  constructor(g, onProgress = () => {}, { safeMode = false } = {}) {
    this.g = g;
    this.onProgress = onProgress;
    this.disposed = false;
    this.actors = new Map();
    this.crates = new Map();
    this.cores = new Map();
    this.projectiles = new Map();
    this.fields = new Map();
    // These caches contain presentation objects only. Charges always come from
    // the recipient-safe view, never the authoritative match's private state.
    this.protocolCharges = new Map();
    this.protocolBodies = new Map();
    this.protocolFixtures = [];
    this.interactableInstances = [];
    this.protocolScreens = new Map();
    this.protocolLights = [];
    this.protocolLightMaterials = [];
    this.protocolPowerOut = false;
    this.medicalStocks = new Map();
    this.transportCargo = [];
    this.transportTerrain = null;
    this.transportInstrument = null;
    this.transportInstrumentKey = "";
    this.transportAlarm = null;
    this.medevacRotor = null;
    this.arrivalClinic = null;
    this.arrivalPatients = new Map();
    this.materials = new Set();
    this.geometries = new Map();
    this.textures = new Set();
    this.worldTextures = new Set();
    this.weaponTextures = new Set();
    this.lastTime = 0;
    this.lastPose = -1;
    this.mapKey = "";
    this.wallKeys = "";
    this.seenShots = new Map();
    this.tracers = [];
    this.lastPreset = "";
    this.assetErrors = [];
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.mobileDevice = matchMedia("(pointer: coarse)").matches;
    // A high-performance, multisampled context is not available on every phone.
    // Retry on a fresh canvas so rejected attributes don't lock the next attempt.
    const appleTouch = isAppleTouchDevice(navigator);
    let canvas, context;
    for (const attributes of [
      { antialias: !appleTouch && !safeMode, powerPreference: "default" },
      { antialias: false, powerPreference: "low-power" },
    ]) {
      canvas = document.createElement("canvas");
      context = canvas.getContext("webgl2", { ...attributes, alpha: false });
      if (context) break;
    }
    if (!context) throw new Error("This browser could not start WebGL 2 graphics.");
    this.renderer = new THREE.WebGLRenderer({ canvas, context });
    this.profile = graphicsProfile({
      appleTouch,
      safeMode,
      halfFloat:
        this.renderer.extensions.has("EXT_color_buffer_float") ||
        this.renderer.extensions.has("EXT_color_buffer_half_float"),
      maxTextureSize: this.renderer.capabilities.maxTextureSize,
    });
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
      this.contextUnavailable = true;
      g.handleMilitaryFailure?.("context-lost");
    };
    this.contextRestored = () => {
      if (this.disposed) return;
      this.contextUnavailable = false;
      g.retryMilitary?.();
    };
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLost);
    this.renderer.domElement.addEventListener("webglcontextrestored", this.contextRestored);
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
    // Far plane past the 36-tile (108 m) arenas' diagonal plus the skyline;
    // fog, not the far plane, sets how far you can see. Was 260 m.
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.06, 320);
    this.camera.rotation.order = "YXZ";
    this.hemisphere = new THREE.HemisphereLight("#adbcd0", "#372b20", 0.55);
    this.scene.add(this.hemisphere);
    this.sun = new THREE.DirectionalLight("#ffddb0", 4.2);
    this.sun.position.set(-25, 38, -22);
    this.clouds = new SkyClouds(this, { mobile: this.mobileDevice });
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
    // Reuse four nearest interior lights rather than allocating one light per
    // room. This keeps the large operating base affordable on mobile GPUs.
    const interiorLightCount = matchMedia("(pointer:coarse)").matches ? 2 : 4;
    for (let i = 0; i < interiorLightCount; i++) {
      const light = new THREE.PointLight("#c9e6eb", 0, 18, 2);
      // Keep the light roster stable. Zero intensity switches a fixture off
      // without compiling a different shader on every room/power transition.
      light.visible = true;
      this.scene.add(light);
      this.protocolLights.push(light);
    }
    this.protocolTorch = new THREE.SpotLight("#f3ecdc", 0, 16, 0.64, 0.5, 2);
    this.protocolTorch.castShadow = false;
    this.protocolTorch.visible = true;
    this.torchDirection = new THREE.Vector3();
    this.renderer.shadowMap.autoUpdate = false;
    // Three's shadow pass tests the viewing camera's layers. Include culled
    // static casters only for that pass, then restore the main/reflection view.
    // Render lists already contain layer-0 geometry, so hidden rooms stay out
    // of the color pass while their roofs still cast correct daylight shadows.
    const renderShadows = this.renderer.shadowMap.render.bind(this.renderer.shadowMap);
    this.renderer.shadowMap.render = (lights, scene, camera) => {
      const mask = camera.layers.mask;
      camera.layers.enable(1);
      try { return renderShadows(lights, scene, camera); }
      finally { camera.layers.mask = mask; }
    };
    this.scene.add(this.protocolTorch, this.protocolTorch.target);
    this.weaponScene = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(52, 1, 0.01, 10);
    this.weaponScene.add(new THREE.HemisphereLight("#e5ecf1", "#786852", 2));
    const key = new THREE.DirectionalLight("#fff0d7", 4);
    key.position.set(-2, 3, -4);
    this.weaponScene.add(key);
    this.weaponKey = key;
    initNaturalLighting(this);
    this.rig = new THREE.Group();
    this.weaponScene.add(this.rig);
    this.flash = new THREE.PointLight("#ffdcb0", 0, 4);
    this.flash.position.set(0.22, -0.08, -0.95);
    this.weaponScene.add(this.flash);
    this.boxGeometry = this.geo("rounded", () => new RoundedBoxGeometry(1, 1, 1, 3, 0.025));
    this.wallGeometry = this.geo("wall", () => new RoundedBoxGeometry(1, 1, 1, 2, 0.008));
    // Cinematic processing stays separate from simulation and the accessible HUD.
    if (!safeMode) {
      const target = new THREE.WebGLRenderTarget(1, 1, {
        type: this.profile.halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
      });
      this.composer = new EffectComposer(this.renderer, target);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      if (this.profile.ambientOcclusion) {
        this.ao = new SSAOPass(this.scene, this.camera, 512, 512, 12);
        this.ao.kernelRadius = 0.45;
        this.ao.minDistance = 0.001;
        this.ao.maxDistance = 0.045;
        this.composer.addPass(this.ao);
      }
      const hands = new RenderPass(this.weaponScene, this.weaponCamera);
      hands.clear = false;
      hands.clearDepth = true;
      this.composer.addPass(hands);
      // Glow from the sun, lamps and signs spills softly into the image.
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.55, 1.1);
      this.composer.addPass(this.bloom);
      this.fxaa = new ShaderPass(FXAAShader);
      this.composer.addPass(this.fxaa);
      // Film look: warm highlights, cool shadows, a little saturation, a soft
      // vignette and fine grain. Runs on linear light before tone mapping.
      this.grade = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          highlight: { value: new THREE.Vector3(1.05, 1.0, 0.9) },
          shadow: { value: new THREE.Vector3(0.94, 0.99, 1.06) },
          saturation: { value: 1.08 },
          vignette: { value: 0.22 },
          grain: { value: 0.025 },
          time: { value: 0 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 highlight; uniform vec3 shadow; uniform float saturation; uniform float vignette; uniform float grain; uniform float time; varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }
          void main(){
            vec4 source = texture2D(tDiffuse, vUv);
            vec3 c = source.rgb;
            float l = dot(c, vec3(.2126,.7152,.0722));
            float lift = smoothstep(0.0, 0.6, l);
            c *= mix(shadow, highlight, lift);
            c = mix(vec3(l), c, saturation);
            vec2 d = vUv - .5;
            c *= 1.0 - vignette * smoothstep(.25, .85, dot(d, d) * 2.2);
            c += (hash(vUv * 731.0) - .5) * grain * (0.15 + sqrt(max(l, 0.0)));
            gl_FragColor = vec4(max(c, 0.0), source.a);
          }`,
      });
      this.composer.addPass(this.grade);
      this.composer.addPass(new OutputPass());
    }
    // Arena art: Dust Outpost loads behind the opening loading screen, so a
    // match there never starts in the old look and swaps a moment later; the
    // other arenas follow in the background while players are in the menu.
    // A failure is not fatal: that arena keeps its classic look.
    this.arenaStyle = new ArenaStyles(this, ASSET, ASSET_CACHE);
    this.ready = Promise.all([this.loadAssets(),prepareWorldTypography(this),this.arenaStyle.load("outpost")]).then(() => {
      if (!this.disposed) {
        this.mapKey = "";
        this.updateWeapon();
        for (const id of ["estate", "skyport", "quay", "town"]) this.loadArenaStyle(id);
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
        const t = await loader.loadAsync(ASSET + path + "?assetVersion=" + ASSET_CACHE);
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
      loadRealismSurfaces(this),
      loadOperatorResponse(this),
      (async () => {
        // The medevac helicopter (CC-BY). Optional: the plain shape remains.
        try {
          const gltf = await new GLTFLoader().loadAsync(ASSET + "models/medevac-v1.glb?assetVersion=" + ASSET_CACHE);
          if (this.disposed) return;
          this.medevacKit = prepareMedevac(gltf);
          for (const part of this.medevacKit.parts) this.geometries.set(`medevac:${part.geometry.uuid}`, part.geometry);
          this.wallKeys = null;
        } catch {
          this.assetErrors.push("medevac");
        }
      })(),
      (async () => {
        // Modelled first-person weapons. Optional: the procedural ones remain.
        try {
          const gltf = await new GLTFLoader().loadAsync(ASSET + "models/weapons-v2.glb?assetVersion=" + ASSET_CACHE);
          if (this.disposed) return;
          this.weaponKit = prepareWeaponKit(gltf);
          for (const weapon of Object.values(this.weaponKit))
            for (const parts of Object.values(weapon))
              for (const { geometry } of parts) this.geometries.set(`weapon-kit:${geometry.uuid}`, geometry);
          // Rebuild the held weapon with the model.
          this.weaponId = null;
        } catch (error) {
          console.warn("Modelled weapons unavailable", error);
        }
      })(),
      (async () => {
        // Scanned CC0 props. Optional: without them the base keeps plain blocks.
        try {
          const gltf = await new GLTFLoader().loadAsync(ASSET + "models/props-v1.glb?assetVersion=" + ASSET_CACHE);
          if (this.disposed) {
            this.disposeObject(gltf.scene);
            return;
          }
          this.propScene = gltf.scene;
          gltf.scene.traverse((o) => {
            if (o.isMesh) {
              this.geometries.set(`prop:${o.uuid}`, o.geometry);
              for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"])
                if (o.material[key]) this.textures.add(o.material[key]);
              this.materials.add(o.material);
            }
          });
          this.propKit = preparePropKit(gltf);
          // Furniture tiles switch from wall blocks to props on the next build.
          this.wallKeys = null;
        } catch {
          this.assetErrors.push("props");
        }
      })(),
      (async () => {
        try {
          const gltf = await new GLTFLoader().loadAsync(ASSET + "models/operator-v1.glb?assetVersion=" + ASSET_CACHE);
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
          prepareCharacterAsset(this, gltf);
        } catch {
          this.assetErrors.push("soldier");
        } finally {
          complete();
        }
      })(),
      (async () => {
        try {
          // PMREM requires floating-point render targets. Keep direct cinematic lights
          // when the device cannot render those targets, rather than losing all 3D.
          if (!this.profile.halfFloat) return;
          const hdr = await new RGBELoader().loadAsync(ASSET + "sky.hdr?assetVersion=" + ASSET_CACHE);
          if (this.disposed) {
            hdr.dispose();
            return;
          }
          hdr.mapping = THREE.EquirectangularReflectionMapping;
          this.textures.add(hdr);
          this.scene.background = hdr;
          this.daySky = hdr;
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
    // Source materials also serve the destination's resting patients. Finish
    // their maps after the concurrently loaded cloth surfaces are available.
    if(this.soldier) prepareCharacterAsset(this,this.soldier);
  }
  configure() {
    const preset = this.g.academy.preset,
      options = this.g.academy.options;
    if (this.lastPreset === preset + options.shadows + options.lighting) return;
    this.lastPreset = preset + options.shadows + options.lighting;
    this.renderer.shadowMap.enabled = options.shadows;
    const size = Math.min(this.profile.maxShadowSize, preset === "high" ? 2048 : 1024);
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.intensity = options.lighting ? 4.2 : 1.7;
    this.hemisphere.intensity = options.lighting ? 0.55 : 1.3;
    if (this.ao) this.ao.enabled = preset === "high" && options.shadows;
    if (this.composer) {
      // Canvas antialiasing does not cover an offscreen composer. Resolve
      // actual geometry edges with WebGL 2 multisampling on its render targets.
      if (this.offscreenSamples === undefined) {
        const gl = this.renderer.getContext();
        const format =
          this.composer.renderTarget1.texture.type === THREE.HalfFloatType ? gl.RGBA16F : gl.RGBA8;
        const supported = gl.getInternalformatParameter(gl.RENDERBUFFER, format, gl.SAMPLES);
        this.offscreenSamples = supported?.length ? Math.max(...supported) : 0;
      }
      const samples = Math.min(
        this.offscreenSamples,
        this.renderer.capabilities.maxSamples || 0,
        preset === "high" ? 4 : preset === "balanced" ? 2 : 0,
      );
      this.fxaa.enabled = preset !== "performance" && samples === 0;
      for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
        if (target.samples !== samples) {
          target.dispose();
          target.samples = samples;
        }
      }
      // Balanced keeps lamp detail without paying for the bloom pyramid.
      this.grade.enabled = true;
      this.bloom.enabled = preset === "high";
    }
    if (this.reflection) {
      // Mirror puddles redraw the whole scene, so only High pays for them.
      this.reflection.visible = this.profile.reflections && preset === "high";
      this.reflection
        .getRenderTarget()
        .setSize(preset === "high" ? 1024 : 512, preset === "high" ? 1024 : 512);
    }
  }
  resize() {
    if (this.disposed) return;
    const { w, h } = this.g;
    const rect=this.g.shell.getBoundingClientRect();
    const [renderWidth, renderHeight] = cinematicRenderSize(rect.width,rect.height,window.devicePixelRatio,
      this.g.academy.options,this.profile,this.g.budget?.scale||1);
    this.renderer.setSize(renderWidth, renderHeight, false);
    this.composer?.setSize(renderWidth, renderHeight);
    this.fxaa?.uniforms.resolution.value.set(1 / renderWidth, 1 / renderHeight);
    this.camera.aspect = w / h;
    // Match the shared projection used by classic rendering and aim.
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(this.g.verticalFov / 2) * (this.adsZoom ?? 1)));
    this.camera.updateProjectionMatrix();
    this.weaponCamera.aspect = w / h;
    this.weaponCamera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(26)) / (w / h)),
    );
    this.weaponCamera.updateProjectionMatrix();
  }
  tileTexture(source, repeats) {
    if (!source) return null;
    // Reused across rebuilds; see cloneForWorld in realism-surfaces.js.
    const key = `${source.uuid}:${repeats}:${repeats}`;
    this.tiledTextures ||= new Map();
    if (this.tiledTextures.has(key)) return this.tiledTextures.get(key);
    const t = source.clone();
    t.repeat.set(repeats, repeats);
    t.needsUpdate = true;
    t.userData.sharedSource = true;
    this.tiledTextures.set(key, t);
    this.textures.add(t);
    this.worldTextures.add(t);
    return t;
  }
  clearWorld() {
    this.worldVisibility?.reset();
    this.reflection?.dispose();
    for (const patient of this.arrivalPatients.values()) {
      patient.mixer?.stopAllAction();
      patient.model.traverse((object) => {
        if (object.isSkinnedMesh) object.skeleton.dispose();
      });
    }
    this.arrivalPatients.clear();
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
      // Clones of the shared photographs keep their GPU upload, so switching
      // between base and medevac never re-uploads the same images. They are
      // released with the renderer (this.textures) instead.
      if (texture.userData.sharedSource) continue;
      texture.dispose();
      this.textures.delete(texture);
    }
    this.worldTextures.clear();
    this.world.clear();
    this.realismDecor = null;
    this.medicalDepotPresentation = null;
    this.commandOperationsPresentation = null;
    this.communicationsPresentation = null;
    this.wallMeshes = null;
    this.fittings = [];
    this.fittingMaterial = null;
    this.reflection = null;
    this.protocolFixtures = [];
    this.interactableInstances = [];
    this.protocolScreens.clear();
    this.protocolSignMaterials = new Set();
    this.protocolLightMaterials = [];
    this.protocolPowerOut = false;
    this.medicalStocks.clear();
    this.transportCargo = [];
    this.transportTerrain = null;
    this.transportInstrument = null;
    this.transportInstrumentKey = "";
    this.transportAlarm = null;
    this.medevacRotor = null;
    this.arrivalClinic = null;
    for (const light of this.protocolLights) {
      light.intensity = 0;
      light.visible = false;
    }
    this.protocolTorch.intensity = 0;
    this.protocolTorch.visible = false;
  }
  /** Load an arena's art; rebuild that arena if it is on screen when ready. */
  loadArenaStyle(id) {
    const style = this.arenaStyle.of(id);
    if (!style || style.ready || style.failed) return;
    style.load().then(() => {
      if (!this.disposed && style.ready && this.g.arena.mapId === id) this.mapKey = "";
    });
  }
  buildWorld() {
    this.lastShadowAt = 0;
    const g = this.g,
      id = g.arena.mapId,
      profile = PROFILES[id] || PROFILES.outpost,
      n = g.level.length;
    this.clearWorld();
    this.buildingWorld = true;
    this.mapKey = id;
    // Room art and fixtures follow the base this round plays (online rooms,
    // practice on Breakwater, the town by default).
    if (g.arena.base?.() && g.arena.base().id === id) g.protocolMap = g.arena.base();
    this.wallKeys = "";
    this.scene.fog.color.set(profile.fog);
    this.scene.fog.density = id === "freight" ? 0.021 : 0.012;
    // Asphalt belongs on the apron/street; its photographed aggregate stays
    // at a three metre repeat rather than swelling to nine metre stones.
    const ground = this.material({
      color: "#d7d4cd",
      map: this.tileTexture(this.groundColor, n),
      normalMap: this.tileTexture(this.groundNormal, n),
      roughnessMap: this.tileTexture(this.groundRough, n),
      roughness: 0.94,
      normalScale: new THREE.Vector2(0.38, 0.38),
      metalness: 0,
    });
    ground.userData.world = true;
    // Rain darkens and glosses it (HazardDressing.dim).
    this.groundMaterial = ground;
    const floor = this.mesh(
      this.world,
      this.geo("floor", () => new THREE.PlaneGeometry(1, 1)),
      ground,
      [(n * SCALE) / 2, 0, (n * SCALE) / 2],
      [n * SCALE, n * SCALE, 1],
    );
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    floor.visible = id !== "medevac";
    // Arena art passes preload with the renderer; should one still be
    // loading, the arena rebuilds once it is ready.
    const styled = this.arenaStyle.readyFor(id);
    if (styled) this.arenaStyle.ground(id, ground, n);
    else this.loadArenaStyle(id);
    this.wallMaterials = Array.from({ length: 7 }, (_, type) => {
      const themed = this.arenaStyle.wallMaterial(id, type);
      if (themed) return themed;
      const colors =
        id === "breakwater"
          ? ["#b7b4a8", "#a29882", "#7c9094", "#9b927d", "#747b73", "#a3aaa1", "#718086"]
          : id === "testblock"
            ? ["#b5b0a3", "#929689", "#78928d", "#7d8881", "#aa8374", "#b8b8ac", "#8f9998"]
            : id === "quay" || id === "town"
              ? // Grey box: brick town, painted stalls, trucks, trees, pumps, canal.
                ["#8e948a", "#9a7c68", "#7f8f7a", "#6f7a80", "#5b7a4a", "#8a8f92", "#2f5d6e"]
            : ["#8e948a", profile.metal, "#707f78", "#b0a489", "#84776b", "#909a9d", "#bcc2bd"];
      const substrates =
        id === "freight" || id === "medevac"
          ? ["concrete", "metal", "metal", "metal", "concrete", "metal", "metal"]
          : id === "breakwater"
            ? ["concrete", "plaster", "plaster", "concrete", "metal", "concrete", "metal"]
            : id === "testblock"
              ? ["concrete", "concrete", "plaster", "metal", "plaster", "plaster", "metal"]
              : ["concrete", "concrete", "plaster", "metal", "brick", "plaster", "metal"];
      const substrate = substrates[type];
      const m =
        substrate === "metal"
          ? this.material({
              color: colors[type],
              map: this.metalColor,
              normalMap: this.metalNormal,
              roughnessMap: this.metalRough,
              // Painted shipping panels are a dielectric coating over metal.
              roughness: 0.9,
              metalness: 0.06,
              normalScale: new THREE.Vector2(0.45, 0.45),
            })
          : surfaceMaterial(this, substrate, {
              color: colors[type],
              repeat: [1.5, 1.75],
              roughness: substrate === "plaster" ? 0.93 : 0.9,
              metalness: 0,
              normalStrength: substrate === "brick" ? 0.55 : 0.3,
            });
      m.userData.world = true;
      return m;
    });
    this.rebuildWalls();
    const rail = this.material({ color: "#555c58", metalness: 0.7, roughness: 0.65 });
    rail.userData.world = true;
    // The perimeter rail is ~120 small parts: batch them like other fixtures.
    const fence = new THREE.Group();
    this.world.add(fence);
    for (let side = 0; side < (id === "medevac" ? 0 : 4); side++)
      for (let i = 0; i < n; i += 4) {
        const x = side === 0 ? 1 : side === 1 ? n - 1 : i + 1,
          z = side === 2 ? 1 : side === 3 ? n - 1 : i + 1;
        const pole = this.cylinder(fence, rail, [x * SCALE, 4.8, z * SCALE], 0.055, 3.6, "y");
        pole.castShadow = false;
        const bar = this.box(fence, rail, [x * SCALE, 6.55, z * SCALE], [1, 0.08, 0.08]);
        bar.castShadow = false;
        for (const dx of [-0.3, 0.3])
          this.box(fence, rail, [x * SCALE + dx, 6.55, z * SCALE], [0.25, 0.18, 0.2]);
      }
    batchStaticByMaterial(fence);
    if (["breakwater", "medevac", "hospital"].includes(id) && this.protocolMetadata())
      this.buildProtocolBase(this.protocolMetadata());
    else {
      this.addLandmarks(id, n, rail);
      // Calder Quay as the Blackout base: the town's own art and interiors,
      // plus the mission fixtures (tasks, cabinets, sockets, drains, siren,
      // helipad). Its rooms are buildings and streets: no extra floors or ceilings.
      if (g.mode === "protocol" && mapOf(id).protocolOnly && this.protocolMetadata()) {
        const meta = this.protocolMetadata();
        this.buildProtocolBase({ ...meta, rooms: [], corridors: [] });
        // A painted helipad where the medevac lands (Market Square).
        if (meta.loading) {
          const c = document.createElement("canvas");
          c.width = c.height = 256;
          const x2 = c.getContext("2d");
          x2.strokeStyle = "#f2efe6";
          x2.lineWidth = 14;
          x2.beginPath();
          x2.arc(128, 128, 112, 0, Math.PI * 2);
          x2.stroke();
          x2.fillStyle = "#f2efe6";
          x2.fillRect(78, 64, 26, 128);
          x2.fillRect(152, 64, 26, 128);
          x2.fillRect(78, 116, 100, 24);
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          this.textures.add(tex);
          this.worldTextures.add(tex);
          const pad = this.mesh(
            this.world,
            this.geo("helipad", () => new THREE.PlaneGeometry(1, 1)),
            this.material({ map: tex, transparent: true, depthWrite: false, roughness: 0.9 }),
            [meta.loading.x * SCALE, 0.03, meta.loading.y * SCALE],
            [5.4, 5.4, 1],
          );
          pad.rotation.x = -Math.PI / 2;
          pad.castShadow = false;
          pad.receiveShadow = true;
        }
      }
    }
    if (styled) this.arenaStyle.dress(id, this.world, g.level);
    // Styled arenas are dry: no standing water on gravel, paving or apron.
    if (id !== "medevac" && !styled) this.makePuddles(id, n);
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
    for (const [x, z] of styled ? [] : props) {
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
    const shadowSpan = id === "breakwater" ? 48 : 35;
    Object.assign(this.sun.shadow.camera, {
      left: -shadowSpan,
      right: shadowSpan,
      top: shadowSpan,
      bottom: -shadowSpan,
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.buildingWorld = false;
    decorateRealisticEnvironment(this, id, n);
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
        for (let x = 0; x < g.level[y].length; x++)
          if (
            g.level[y][x] === type &&
            !this.waterTile(x, y) &&
            !this.protocolPropTile(x, y) &&
            !this.transportWindowTile(x, y) &&
            !this.transportHiddenWall(x, y)
          )
            tiles.push([x, y]);
      if (!tiles.length) continue;
      if (this.arenaStyle?.owns(g.arena.mapId, type)) {
        for (const mesh of this.arenaStyle.walls(g.arena.mapId, type, tiles)) {
          this.world.add(mesh);
          this.wallMeshes.push(mesh);
        }
        continue;
      }
      // Spatial batches can be culled behind opaque rooms instead of submitting
      // every wall in the base whenever one instance enters the camera frustum.
      const chunks = new Map();
      for (const tile of tiles) {
        const key = ["breakwater", "medevac", "hospital"].includes(g.arena.mapId) ? `${Math.floor(tile[0]/6)},${Math.floor(tile[1]/6)}` : "all";
        if (!chunks.has(key)) chunks.set(key, []);
        chunks.get(key).push(tile);
      }
      for (const tiles of chunks.values()) {
      const mesh = new THREE.InstancedMesh(
        // Continuous interior shells need square joins. Rounded individual
        // tiles leave beveled cracks at the ceiling and adjoining wall bays.
        ["breakwater", "medevac", "hospital"].includes(g.arena.mapId)
          ? this.geo("protocol-solid-wall", () => new THREE.BoxGeometry(1, 1, 1))
          : this.wallGeometry,
        this.wallMaterials[type],
        tiles.length,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.tiles = tiles;
      // A floor-level occlusion ray cannot safely hide the structural shell
      // when looking up or crossing a threshold. Normal frustum culling stays.
      mesh.userData.noRoomCull = true;
      // Per-tile colour (Calder Quay's districts) over the wall surface.
      const tint = mapOf(g.arena.mapId).wallTint,
        tintColor = new THREE.Color();
      tiles.forEach(([x, y], i) => {
        if (tint && type === 1) mesh.setColorAt(i, tintColor.set(tint(x, y)));
        const height = ["breakwater", "medevac", "hospital"].includes(g.arena.mapId) ? 3.5 : 3;
        dummy.position.set((x + 0.5) * SCALE, height / 2, (y + 0.5) * SCALE);
        dummy.scale.set(SCALE, height, SCALE);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.world.add(mesh);
      this.wallMeshes.push(mesh);
      }
    }
    // Building interiors (Calder Quay): Breakwater's prop kit once loaded.
    this.interiors?.dispose();
    this.interiors = null;
    if (mapOf(g.arena.mapId).buildings && this.propKit) {
      this.interiors = new QuayInteriors(this, this.visualLevel(), mapOf(g.arena.mapId).buildings);
      this.world.add(this.interiors.group);
    }
    this.landmarks?.dispose();
    this.landmarks = null;
    if (mapOf(g.arena.mapId).landmarks) {
      this.landmarks = new QuayLandmarks(this, mapOf(g.arena.mapId).landmarks);
      this.world.add(this.landmarks.group);
    }
    // Canal water (see-through tiles) is drawn at ground level, never as walls.
    this.canal?.dispose();
    this.canal = null;
    const water = mapOf(g.arena.mapId).seeThrough;
    if (water?.length) {
      this.canal = new CanalWater(this, g.level, water, mapOf(g.arena.mapId).lamps, mapOf(g.arena.mapId).culverts);
      this.world.add(this.canal.group);
    }
    if (this.worldVisibility) this.worldVisibility.dirty = true;
    this.wallFittings();
    if (!this.buildingWorld) decorateRealisticEnvironment(this, g.arena.mapId, g.level.length);
  }
  wallFittings() {
    // Small fittings hug existing collision walls; never obstruct an open lane.
    const steel = this.material({
      color: "#8b9390",
      map: this.realismSurfaces.weaponMetal.color,
      normalMap: this.realismSurfaces.weaponMetal.normal,
      roughnessMap: this.realismSurfaces.weaponMetal.roughness,
      metalness: 0.8,
      roughness: 0.68,
      normalScale: new THREE.Vector2(0.12, 0.12),
    });
    steel.userData.world = true;
    this.fittingMaterial = steel;
    const panels = [],
      bolts = [];
    const level = this.g.level;
    for (let y = 0; y < level.length; y++)
      for (let x = 0; x < level[y].length; x++) {
        if (
          !level[y][x] ||
          // Concrete and plaster have architectural joints, not black steel
          // outlines around every tile. Keep hardware on real panel walls.
          this.wallMaterials[level[y][x]]?.userData.realismSurface ||
          // Modelled arena kit pieces (hedges, containers…) carry their own detail.
          this.arenaStyle?.owns(this.g.arena.mapId, level[y][x]) ||
          this.waterTile(x, y) ||
          this.protocolPropTile(x, y) ||
          this.transportWindowTile(x, y) ||
          this.transportHiddenWall(x, y)
        )
          continue;
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
  protocolMetadata() {
    const id = this.g.arena.mapId;
    // The base the round actually plays (practice keeps Breakwater).
    return id === "medevac" ? this.g.transportMap : id === "hospital" ? HOSPITAL_MAP : this.g.arena?.base?.() || this.g.protocolMap;
  }
  transportWindowTile(x, y) {
    if (this.g.arena.mapId !== "medevac") return false;
    return this.transportWindows().some((window) => window.x === x && window.y === y);
  }
  transportWindows() {
    const windows = this.g.transportMap?.windows || [];
    // A delivery-side viewing window keeps the receiving clinic visible from
    // the cargo console; its wall cell retains the existing collision rule.
    if (windows.some((window) => window.x === 11 && window.y === 15)) return windows;
    return [...windows, { x: 11, y: 15, dx: -1, dy: 0, w: 0.84, h: 0.5, sill: 0.3 }];
  }
  /** Canal water: a see-through tile of this arena (outpost-sim.js `seeThrough`). */
  waterTile(x, y) {
    const types = mapOf(this.g.arena.mapId).seeThrough;
    return !!types && types.includes(this.g.level[y]?.[x]);
  }
  /** The tile grid as architecture sees it: water counts as open ground, so
   * trims, door frames and fittings treat the canal like a street. */
  visualLevel() {
    const level = this.g.level,
      types = mapOf(this.g.arena.mapId).seeThrough;
    if (!types?.length) return level;
    return level.map((row) => row.map((v) => (types.includes(v) ? 0 : v)));
  }
  transportHiddenWall(x, y) {
    if (this.g.arena.mapId !== "medevac") return false;
    const level = this.g.level;
    return ![
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ].some(([dx, dy]) => level[y + dy]?.[x + dx] === 0);
  }
  protocolPropTile(x, y) {
    if (!["breakwater", "medevac", "hospital"].includes(this.g.arena.mapId)) return false;
    return this.metadataPropTile(x, y) || this.furnitureTile(x, y) || (this.g.arena.mapId === 'breakwater' && (commandStorage(x,y) || communicationsStorage(x,y)));
  }
  /** Solid furniture tiles (storage, racks, mess island, radar) dressed with
   * scanned props once the prop kit has loaded; plain blocks otherwise. */
  furnitureTile(x, y) {
    return (
      this.g.arena.mapId === "breakwater" &&
      !!this.propKit &&
      [2, 3, 4, 5].includes(this.g.level[y]?.[x]) &&
      !this.metadataPropTile(x, y)
    );
  }
  metadataPropTile(x, y) {
    return (this.protocolMetadata()?.props || []).some(
      (prop) =>
        prop.solid &&
        ["vehicle", "generator", "medevac-seat", "medical-cargo", "medevac-parked"].includes(prop.kind) &&
        x >= prop.x - prop.w / 2 &&
        x < prop.x + prop.w / 2 &&
        y >= prop.y - prop.h / 2 &&
        y < prop.y + prop.h / 2,
    );
  }
  protocolMaterial(options) {
    const material = this.material(options);
    material.userData.world = true;
    return material;
  }
  protocolSign(title, subtitle = "BREAKWATER / FIELD OPERATIONS", color = "#81b7bd", size = [2.5,.73]) {
    return makeProtocolSign(this,title,subtitle,color,size);
  }
  // Mount a panel against the closest adjacent collision wall. Its maximum
  // protrusion is 0.10 tile, so an open corridor remains fully traversable.
  protocolMount(x, y, height = 1.25) {
    const tx = Math.floor(x),
      ty = Math.floor(y),
      level = this.g.level;
    const directions = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ];
    const [dx, dz] = directions.find(([a, b]) => level[ty + b]?.[tx + a]) || [0, -1];
    const root = new THREE.Group();
    root.position.set((tx + 0.5 + dx * 0.485) * SCALE, height, (ty + 0.5 + dz * 0.485) * SCALE);
    root.rotation.y = Math.atan2(-dx, -dz);
    return root;
  }
  batchProtocolStatic(root) {
    batchStaticByMaterial(root);
    if (this.worldVisibility) this.worldVisibility.dirty = true;
  }
  buildProtocolBase(map) {
    const root = new THREE.Group();
    this.world.add(root);
    const steel = surfaceMaterial(this, "weaponMetal", {
      color: "#656d6c",
      roughness: 0.62,
      metalness: 0.8,
      normalStrength: 0.12,
    });
    steel.userData.world = true;
    const paint = this.protocolMaterial({
      color: "#9da7a1",
      roughness: 0.88,
      metalness: 0,
    });
    const rubber = this.protocolMaterial({ color: "#263333", roughness: 0.96 });
    const amber = this.protocolMaterial({ color: "#c9aa67", roughness: 0.75 });
    const lamp = this.protocolMaterial({
      color: "#d3edf0",
      emissive: "#a5dae4",
      emissiveIntensity: 1.6,
      roughness: 0.6,
    });
    this.protocolLightMaterials.push(lamp);
    const ceiling = surfaceMaterial(this, "plaster", {
      color: "#c2c5bd",
      repeat: [1.5, 1.5],
      roughness: 0.94,
      metalness: 0,
      normalStrength: 0.14,
    });
    ceiling.userData.world = true;
    const rooms = [...(map.rooms || []), ...(map.corridors || [])];
    const roofTiles = roofLayout(map).cells.keys();
    for (const room of rooms) {
      if (room.roofed === false) continue;
      const roomFloor = surfaceMaterial(this, map.id === "medevac" ? "fabric" : "concrete", {
        color: room.id === 'ammo' ? '#acb4ad' : /maintenance|generat/.test(room.id || "") ? "#687570" : "#a0aaa3",
        repeat: [room.w * 1.5, room.h * 1.5],
        roughness: 0.94,
        metalness: 0,
        normalStrength: room.id === 'ammo' ? .14 : 0.2,
      });
      roomFloor.userData.world = true;
      const floor = this.mesh(
        root,
        this.geo("floor", () => new THREE.PlaneGeometry(1, 1)),
        roomFloor,
        [(room.x + room.w / 2) * SCALE, 0.026, (room.y + room.h / 2) * SCALE],
        [room.w * SCALE, room.h * SCALE, 1],
      );
      floor.rotation.x = -Math.PI / 2;
      floor.castShadow = false;
      // A ceiling and an overhead conduit make the interior read as a room,
      // instead of sky appearing above every corridor.
      this.cylinder(
        root,
        steel,
        [(room.x + room.w / 2) * SCALE, 3.28, (room.y + 0.22) * SCALE],
        0.065,
        room.w * SCALE,
        "x",
        16,
      );
      const spacing = room.w <= 2 ? 4 : 3;
      const axisLength = room.w <= 2 ? room.h : room.w;
      for (let k = 1.2; k < axisLength; k += spacing) {
        const x = (room.x + (room.w <= 2 ? room.w / 2 : k)) * SCALE,
          z = (room.y + (room.w <= 2 ? k : room.h / 2)) * SCALE;
        this.box(root, steel, [x, 3.36, z], [1.45, 0.1, 0.32]);
        const bulb = this.box(root, lamp, [x, 3.29, z], [1.22, 0.045, 0.26]);
        bulb.castShadow = false;
        // Elevated emitters can be visible above low collision-grid cover.
        // Floor-grid culling and subpixel strips made them blink while walking.
        // Electrical state alone changes their emission; depth still occludes walls.
        bulb.userData.noRoomCull = true;
        bulb.frustumCulled = false;
        this.protocolFixtures.push({ x, y: 3.08, z });
      }
      if (room.name && !(map.id === "medevac" && room.id === "cockpit")) {
        const signRoot = this.protocolMount(room.x + room.w / 2, room.y + 0.5, 2.6);
        // Corridors carry a steel rib (jambs + header) at every tile centre, and
        // a sign mounts at a tile centre: the header pierced it and the jamb
        // fought it for depth. Slide corridor signs half a tile along the wall,
        // between two ribs.
        if (map.corridors?.includes(room) || /corridor|passage|access|bulkhead/.test(room.id || "")) {
          const alongZ = Math.abs(Math.abs(signRoot.rotation.y) - Math.PI / 2) < 0.01;
          if (alongZ ? room.h >= 2 : room.w >= 2) signRoot.position[alongZ ? "z" : "x"] += SCALE / 2;
        }
        // Atrium's former north-centre mount floated across its open doorway.
        // This existing solid bay clears the jamb by 17cm and the ceiling pipe.
        if (map.id === 'breakwater' && room.id === 'courtyard') {
          signRoot.position.set(37.5,2.6,39.045);signRoot.rotation.y=0;
        }
        root.add(signRoot);
        const sign = this.mesh(
          signRoot,
          this.geo("protocol-sign", () => new THREE.PlaneGeometry(2.5, 0.73)),
          this.protocolSign(
            room.name,
            room.roofed === false ? "EXTERNAL AREA" : "AUTHORIZED PERSONNEL",
          ),
          [0, 0, 0.03],
        );
        sign.castShadow = false;
        sign.userData.noBatch = true;
      }
    }
    const roofChunks = new Map();
    for (const tile of roofTiles) {
      const [x,y] = tile.split(",").map(Number), key = `${Math.floor(x/6)},${Math.floor(y/6)}`;
      if (!roofChunks.has(key)) roofChunks.set(key, []);
      roofChunks.get(key).push(tile);
    }
    for (const roofTiles of roofChunks.values()) {
    const roof = new THREE.InstancedMesh(
      this.geo("protocol-roof", () => new THREE.BoxGeometry(1, 1, 1)),
      ceiling,
      roofTiles.length,
    );
    const dummy = new THREE.Object3D();
    let tileIndex = 0;
    for (const tile of roofTiles) {
      const [x, y] = tile.split(",").map(Number);
      dummy.position.set((x + 0.5) * SCALE, 3.58, (y + 0.5) * SCALE);
      // Adjacent opaque panels meet exactly. Overlap makes their bottom
      // surfaces fight for depth and creates flickering diagonal seams.
      dummy.scale.set(SCALE, 0.16, SCALE);
      dummy.updateMatrix();
      roof.setMatrixAt(tileIndex++, dummy.matrix);
    }
    roof.castShadow = roof.receiveShadow = true;
    roof.userData.noRoomCull = true;
    roof.name = "Continuous interior roof";
    root.add(roof);
    }
    for (const station of map.stations || []) {
      // The flight deck has its own low instrument console; a second generic
      // wall terminal would overlap it and obscure the pilot's windshield.
      if (map.id === "medevac" && station.kind === "helm") continue;
      const panel = this.protocolMount(station.x, station.y, 1.34);
      if (map.id === "medevac" && station.kind === "cargo") panel.position.z -= 1.1;
      root.add(panel);
      buildStationTerminal(this,panel,station);
    }
    // These neutral access covers are ordinary public map scenery. A cover
    // never signals whether it currently contains a hidden charge.
    for (const site of map.sites || []) {
      const cover = this.protocolMount(site.x, site.y, 0.58);
      root.add(cover);
      this.box(cover, paint, [0, 0, 0.055], [0.9, 0.8, 0.11]);
      this.box(cover, steel, [0.32, 0, 0.125], [0.035, 0.22, 0.025]);
      for (let i = 0; i < 5; i++)
        this.box(cover, rubber, [0, -0.22 + i * 0.105, 0.117], [0.52, 0.026, 0.018]);
    }
    for (const vent of map.vents || []) {
      const grate = new THREE.Group();
      grate.position.set(vent.x * SCALE, 0.045, vent.y * SCALE);
      root.add(grate);
      this.box(grate, steel, [0, 0, 0], [1.13, 0.045, 1.13]);
      this.box(grate, rubber, [0, 0.025, 0], [0.95, 0.015, 0.95]);
      for (let i = 0; i < 9; i++)
        this.box(grate, paint, [-0.41 + i * 0.103, 0.04, 0], [0.044, 0.025, 0.88]);
      for (const x of [-0.53, 0.53]) this.box(grate, amber, [x, 0.05, 0], [0.025, 0.01, 1.07]);
    }
    if (map.emergency) {
      const alarm = new THREE.Group();
      alarm.position.set(map.emergency.x * SCALE, 1.32, map.emergency.y * SCALE);
      root.add(alarm);
      buildEmergencyConsole(this,alarm);
    }
    for (const prop of map.props || []) {
      if (
        !prop.solid ||
        !["vehicle", "generator", "medevac-seat", "medical-cargo", "medevac-parked"].includes(prop.kind)
      )
        continue;
      const equipment = new THREE.Group();
      equipment.position.set(prop.x * SCALE, 0, prop.y * SCALE);
      root.add(equipment);
      if (prop.kind === "medevac-seat") {
        this.box(equipment, steel, [0, 0.35, 0], [1.36, 0.6, 1.4]);
        this.box(equipment, rubber, [0, 1.18, 0.38], [1.38, 1.36, 0.25]);
        this.box(equipment, rubber, [0, 0.69, -0.11], [1.4, 0.18, 1.24]);
        for (const x of [-0.67, 0.67])
          this.box(equipment, paint, [x, 0.87, -0.04], [0.095, 0.17, 1.18]);
      } else if (prop.kind === "medical-cargo") {
        for (const y of [0.45, 1.3])
          for (const z of [-1.35, 1.35]) {
            this.box(equipment, paint, [0, y, z], [2.15, 0.82, 2.36]);
            this.box(equipment, steel, [0, y + 0.43, z], [2.2, 0.045, 2.4]);
            this.box(equipment, lamp, [1.09, y, z], [0.026, 0.14, 0.36]);
          }
      } else if (prop.kind === "medevac-parked") {
        // Landed on the field hospital's landing zone, rotors winding down.
        this.buildMedevacExterior(equipment, paint, steel, rubber, lamp);
      } else if (prop.kind === "vehicle" && map.loading) {
        this.buildMedevacExterior(equipment, paint, steel, rubber, lamp);
      } else if (prop.kind === "vehicle") {
        this.box(equipment, paint, [0, 0.91, 0], [2.15, 0.9, 7.6]);
        this.box(equipment, steel, [0, 1.57, -2.1], [1.92, 1.13, 2.8]);
        this.box(equipment, rubber, [0, 1.72, -3.52], [1.65, 0.55, 0.045]);
        for (const x of [-1.05, 1.05])
          for (const z of [-2.4, 2.45])
            this.cylinder(equipment, rubber, [x, 0.52, z], 0.51, 0.24, "x", 24);
        for (const x of [-0.72, 0.72]) {
          this.box(equipment, lamp, [x, 0.95, -3.84], [0.29, 0.13, 0.035]);
          this.box(equipment, steel, [x, 1.45, 1.6], [0.07, 1.3, 3.7]);
        }
      } else {
        for (const z of [-2.55, 0, 2.55]) {
          this.box(equipment, steel, [0, 1.05, z], [2.25, 2.1, 2.15]);
          this.box(equipment, paint, [0, 2.12, z], [2.32, 0.16, 2.23]);
          for (let i = 0; i < 7; i++)
            this.box(equipment, rubber, [1.14, 0.63 + i * 0.18, z], [0.025, 0.09, 1.55]);
          this.cylinder(equipment, amber, [0, 2.52, z], 0.075, 0.65, "y", 16);
        }
      }
    }
    const communications = (map.rooms || []).find((room) => /communicat|radar/.test(room.id || ""));
    if (communications) {
      const x = (communications.x + communications.w / 2) * SCALE,
        z = (communications.y + communications.h / 2) * SCALE;
      this.cylinder(root, steel, [x, 6.5, z], 0.14, 5.8, "y", 24);
      for (const h of [4.2, 6, 7.8]) this.box(root, steel, [x, h, z], [3.8, 0.11, 0.11]);
      const dish = this.mesh(
        root,
        this.geo(
          "radar-dish",
          () => new THREE.SphereGeometry(1.25, 24, 12, 0, TAU, 0, Math.PI / 2),
        ),
        paint,
        [x, 8.8, z],
      );
      dish.rotation.x = Math.PI / 2;
      this.cylinder(root, amber, [x, 8.8, z + 0.8], 0.045, 1.1, "z", 12);
    }
    this.buildMedicalFixtures(map, root, { steel, paint, rubber, amber, lamp });
    if (map.id === "breakwater")
      buildFurniture(this, root, this.g.level, (x, y) => this.furnitureTile(x, y) && !medicalDepotStorage(x,y) && !commandStorage(x,y) && !communicationsStorage(x,y));
    if (map.id === "medevac")
      this.buildTransportInterior(map, root, { steel, paint, rubber, amber, lamp });
    if (map.id === "hospital") buildHospital(this, root, map, { steel, paint, rubber, lamp });
    this.batchProtocolStatic(root);
  }
  buildMedevacExterior(root, paint, steel, rubber, lamp) {
    if (this.medevacKit) {
      this.medevacRotor = buildMedevac(this, root, this.medevacKit);
      return;
    }
    // The fuselage stays inside the map's blocked vehicle footprint. Rotor
    // blades clear the walking/player head height and never change collision.
    this.mesh(
      root,
      this.geo("medevac-fuselage", () => new THREE.SphereGeometry(1, 32, 20)),
      paint,
      [0, 1.35, 0],
      [1.1, 0.96, 3.65],
    );
    const glass = this.protocolMaterial({
      color: "#253f48",
      metalness: 0,
      roughness: 0.12,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh(
      root,
      this.geo("medevac-canopy", () => new THREE.SphereGeometry(1, 32, 16)),
      glass,
      [0, 1.57, -2.52],
      [0.91, 0.66, 1.03],
    );
    for (const x of [-0.92, 0.92]) {
      this.box(root, steel, [x, 0.34, 0.3], [0.09, 0.11, 6.7]);
      for (const z of [-1.55, 2.05]) {
        const leg = this.box(root, steel, [x * 0.78, 0.68, z], [0.08, 0.85, 0.08]);
        leg.rotation.z = x < 0 ? 0.3 : -0.3;
      }
      this.box(root, rubber, [x * 1.13, 1.35, 0.3], [0.035, 0.76, 1.35]);
      this.box(root, lamp, [x * 0.68, 1.1, -3.25], [0.15, 0.1, 0.055]);
    }
    this.cylinder(root, steel, [0, 2.64, 0], 0.09, 0.47, "y", 24);
    const rotor = new THREE.Group();
    rotor.position.set(0, 2.94, 0);
    root.add(rotor);
    for (const angle of [0, Math.PI / 2]) {
      const blade = this.box(rotor, steel, [0, 0, 0], [6.4, 0.035, 0.21]);
      blade.rotation.y = angle;
      blade.userData.noBatch = true;
    }
    this.medevacRotor = rotor;
  }
  buildMedicalFixtures(map, root, materials) {
    const { steel, paint, lamp } = materials;
    const medicalCase = (parent, position, movable = false) => buildMedicalCase(this,parent,position,movable);
    for (const fixture of map.supplies || []) {
      const cabinet = this.protocolMount(fixture.x, fixture.y, 0.57);
      root.add(cabinet);
      buildMedicalCabinet(this,cabinet);
      const cases = [
        medicalCase(cabinet, [0, -0.23, 0.15], true),
        medicalCase(cabinet, [0, 0.23, 0.15], true),
      ];
      this.medicalStocks.set(fixture.id, cases);
      // This stock label shares the benchmark station's wall mount. Keep the
      // visual labels separated without moving either interaction/collision.
      const sharedStation = (map.stations || []).some(station => station.x === fixture.x && station.y === fixture.y);
      buildCabinetLabel(this,cabinet,fixture,sharedStation);
    }
    if (map.loading) {
      const pad = map.loading;
      const x = pad.x * SCALE,
        z = pad.y * SCALE;
      const marking = this.protocolMaterial({ color: "#abc6b9", roughness: 0.85 });
      for (const dx of [-0.75, 0.75])
        this.box(root, marking, [x + dx, 0.04, z], [0.035, 0.018, 1.6]);
      for (const dz of [-0.8, 0.8]) this.box(root, marking, [x, 0.04, z + dz], [1.5, 0.018, 0.035]);
      const labelRoot = this.protocolMount(pad.x, pad.y, 2.6);
      const label = this.mesh(
        labelRoot,
        this.geo("loading-label", () => new THREE.PlaneGeometry(2.8, 0.82)),
        this.protocolSign("LIFELINE MEDEVAC", "LOAD SUPPLIES / BOARD TO DEPART", "#a1c7b7",[2.8,.82]),
        [0, 0, 0.03],
      );
      label.userData.noBatch = true;
      root.add(labelRoot);
    }
    if (map.id === "medevac") {
      const room = (map.rooms || []).find((item) => item.id === "cargo");
      if (!room) return;
      // Fixed, wall-side cargo slots: public manifest counts control visibility.
      // No carried cargo, owner, allegiance or private objectives are inspected.
      for (let i = 0; i < 13; i++) {
        const column = i % 5,
          row = Math.floor(i / 5);
        const group = medicalCase(
          root,
          [
            (room.x + 0.65) * SCALE + column * 0.87,
            0.31 + row * 0.47,
            (room.y + room.h) * SCALE - 0.22,
          ],
          true,
        );
        this.transportCargo.push(group);
      }
      this.transportAlarm = this.protocolMaterial({
        color: "#89c6b5",
        emissive: "#457d71",
        emissiveIntensity: 0.75,
        roughness: 0.6,
      });
      const alarmRoot = this.protocolMount(map.avionics?.x || 4.5, map.avionics?.y || 6.5, 2.4);
      const alarm = this.box(alarmRoot, this.transportAlarm, [0, 0, 0.07], [0.38, 0.16, 0.07]);
      alarm.userData.noBatch = true;
      root.add(alarmRoot);
      this.protocolLightMaterials.push(lamp);
    }
  }
  buildTransportInterior(map, root, materials) {
    const { steel, paint, rubber } = materials;
    const glass = this.protocolMaterial({
      color: "#a6c7d2",
      metalness: 0.15,
      roughness: 0.08,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
    });
    for (const window of this.transportWindows()) {
      const nx = window.dx || 0,
        nz = window.dy || 0;
      const panel = new THREE.Group();
      panel.position.set(
        (window.x + 0.5 + nx * 0.5) * SCALE,
        0,
        (window.y + 0.5 + nz * 0.5) * SCALE,
      );
      panel.rotation.y = Math.atan2(nx, nz);
      root.add(panel);
      const width = (window.w || 0.84) * SCALE,
        height = (window.h || 0.5) * SCALE,
        sill = (window.sill || 0.42) * SCALE;
      this.box(panel, paint, [0, sill / 2, -0.05], [SCALE, sill, 0.16]);
      this.box(
        panel,
        paint,
        [0, (sill + height + 3.5) / 2, -0.05],
        [SCALE, 3.5 - sill - height, 0.16],
      );
      for (const x of [-(width + SCALE) / 4, (width + SCALE) / 4])
        this.box(panel, steel, [x, sill + height / 2, -0.02], [(SCALE - width) / 2, height, 0.2]);
      for (const y of [sill, sill + height])
        this.box(panel, steel, [0, y, 0.035], [width, 0.075, 0.08]);
      const pane = this.mesh(
        panel,
        this.geo("transport-glass", () => new THREE.PlaneGeometry(1, 1)),
        glass,
        [0, sill + height / 2, 0.025],
        [width, height, 1],
      );
      pane.castShadow = false;
    }
    const cabin = (map.rooms || []).find((room) => room.id === "cabin");
    if (cabin) {
      const fabric = surfaceMaterial(this, "fabric", {
        color: "#78857c",
        repeat: [2, 2],
        roughness: 0.96,
        metalness: 0,
        normalStrength: 0.2,
      });
      fabric.userData.world = true;
      // Folded troop seats hug the hull, leaving the actual walking lane clear.
      for (const side of [0, 1])
        for (let i = 0; i < 4; i++) {
          const seat = new THREE.Group();
          seat.position.set(
            (cabin.x + (side ? cabin.w - 0.12 : 0.12)) * SCALE,
            0,
            (cabin.y + 0.8 + i * 1.3) * SCALE,
          );
          seat.rotation.y = side ? -Math.PI / 2 : Math.PI / 2;
          root.add(seat);
          this.box(seat, steel, [0, 0.78, 0], [0.9, 1.4, 0.035]);
          this.box(seat, fabric, [0, 0.93, 0.05], [0.81, 0.77, 0.08]);
          this.box(seat, fabric, [0, 0.5, 0.12], [0.82, 0.08, 0.24]);
          this.box(seat, rubber, [0, 0.97, 0.11], [0.043, 0.73, 0.018]);
        }
    }
    if (map.helm) {
      const helm = this.protocolMount(map.helm.x, map.helm.y, 1.05);
      root.add(helm);
      this.box(helm, steel, [0, 0, 0.08], [1.48, 0.62, 0.16]);
      this.box(helm, rubber, [0, -0.35, 0.12], [1.5, 0.14, 0.22]);
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 320;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.add(texture);
      this.worldTextures.add(texture);
      const material = this.protocolMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: "#8caead",
        emissiveIntensity: 0.85,
        roughness: 0.6,
      });
      const screen = this.mesh(
        helm,
        this.geo("flight-instrument", () => new THREE.PlaneGeometry(1.34, 0.55)),
        material,
        [0, 0.06, 0.175],
      );
      screen.castShadow = false;
      screen.userData.noBatch = true;
      this.transportInstrument = { canvas, texture, material };
      for (const x of [-0.61, 0.61]) {
        this.cylinder(helm, steel, [x, -0.24, 0.24], 0.045, 0.09, "z", 16);
        this.box(helm, paint, [x, -0.38, 0.27], [0.06, 0.14, 0.04]);
      }
    }
    // A finite 3D heightfield moves beneath the aircraft. No object spawning,
    // physics changes, sprite landscapes or extra network state are involved.
    const terrain = new THREE.Group();
    this.world.add(terrain);
    const geometry = this.geo("medevac-terrain", () => {
      const mesh = new THREE.PlaneGeometry(620, 900, 44, 58);
      mesh.rotateX(-Math.PI / 2);
      const vertices = mesh.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i),
          z = vertices.getZ(i);
        const ridge = Math.max(0, Math.sin(x * 0.022 + Math.cos(z * 0.013) * 1.4));
        vertices.setY(
          i,
          ridge * ridge * 48 + Math.sin(z * 0.038 + x * 0.04) * 5 - Math.max(0, x - 110) * 0.45,
        );
      }
      mesh.computeVertexNormals();
      return mesh;
    });
    const earth = this.protocolMaterial({
      color: "#9c947e",
      map: this.tileTexture(this.groundColor, 16),
      normalMap: this.tileTexture(this.groundNormal, 16),
      roughness: 0.95,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });
    const land = this.mesh(terrain, geometry, earth, [-100, 0, 0]);
    land.castShadow = false;
    const seaMaterial = this.protocolMaterial({
      color: "#436f79",
      metalness: 0.18,
      roughness: 0.24,
      envMapIntensity: 0.8,
    });
    const sea = this.mesh(
      terrain,
      this.geo("floor", () => new THREE.PlaneGeometry(1, 1)),
      seaMaterial,
      [220, -1, 0],
      [440, 950, 1],
    );
    sea.rotation.x = -Math.PI / 2;
    sea.castShadow = false;
    this.transportTerrain = terrain;
    this.buildArrivalClinic(map, materials);
  }
  buildArrivalClinic(map, materials) {
    const clinic = new THREE.Group();
    clinic.visible = false;
    this.world.add(clinic);
    const { steel, paint } = materials;
    const ground = this.protocolMaterial({
      color: "#a6a38d",
      map: this.tileTexture(this.groundColor, 18),
      normalMap: this.tileTexture(this.groundNormal, 18),
      roughness: 0.94,
    });
    const apron = this.mesh(
      clinic,
      this.geo("floor", () => new THREE.PlaneGeometry(1, 1)),
      ground,
      [27, 0, 27],
      [210, 210, 1],
    );
    apron.rotation.x = -Math.PI / 2;
    apron.castShadow = false;
    const fabric = surfaceMaterial(this, "fabric", {
      color: "#71847b",
      repeat: [2, 3],
      roughness: 0.96,
      metalness: 0,
      normalStrength: 0.2,
    });
    fabric.userData.world = true;
    this.box(clinic, paint, [42.8, 3.9, 46.5], [11.2, 0.16, 10.3]);
    for (const x of [37.35, 48.25])
      for (const z of [41.5, 51.5]) this.box(clinic, steel, [x, 1.85, z], [0.11, 3.7, 0.11]);
    const slots = [];
    for (let i = 0; i < 4; i++) {
      const x = 39.5 + (i % 2) * 3.45,
        z = 44.6 + Math.floor(i / 2) * 3.8;
      slots.push({ x, z });
      this.box(clinic, steel, [x, 0.99, z], [0.84, 0.075, 2.57]);
      this.box(clinic, fabric, [x, 1.05, z], [0.77, 0.15, 2.42]);
      for (const dx of [-0.37, 0.37])
        for (const dz of [-0.99, 0.99]) {
          this.box(clinic, steel, [x + dx, 0.53, z + dz], [0.04, 0.91, 0.04]);
          this.cylinder(clinic, steel, [x + dx, 0.07, z + dz], 0.07, 0.035, "x", 16);
        }
      this.box(clinic, fabric, [x, 1.16, z + 0.82], [0.51, 0.16, 0.42]);
      // Wounded operators' helmeted heads and raised heels are supported by
      // actual pads, rather than an idle standing pose floating over a sheet.
      this.box(clinic, fabric, [x, 1.16, z - 0.94], [0.63, 0.12, 0.4]);
    }
    const sign = this.mesh(
      clinic,
      this.geo("clinic-sign", () => new THREE.PlaneGeometry(4.4, 0.9)),
      this.protocolSign("FIELD CLINIC", "MEDICAL CARGO / RECEIVING BAY", "#a9c6b7",[4.4,.9]),
      [46.9, 2.52, 46.5],
    );
    sign.rotation.y = -Math.PI / 2;
    sign.castShadow = false;
    this.arrivalClinic = { root: clinic, slots };
    this.batchProtocolStatic(clinic);
    for (const z of [44.6, 48.4])
      this.protocolFixtures.push({ x: 41.5, y: 3.55, z, arrivalOnly: true });
  }
  updateArrivalClinic(mission) {
    if (!this.arrivalClinic) return;
    const arrived = !!mission.vehicle?.arrived;
    this.arrivalClinic.root.visible = arrived;
    if (!arrived || !this.soldier) return;
    const patients = (mission.patients || []).slice(0, 4),
      ids = new Set(patients.map((patient) => patient.id));
    for (const [id, presentation] of this.arrivalPatients)
      if (!ids.has(id)) {
        presentation.mixer?.stopAllAction();
        presentation.root.parent?.remove(presentation.root);
        presentation.root.traverse((object) => {
          if (object.isSkinnedMesh) object.skeleton.dispose();
          if (object.isMesh) {
            for(const material of Array.isArray(object.material)?object.material:[object.material]){
              material.dispose();this.materials.delete(material);
            }
          }
        });
        this.arrivalPatients.delete(id);
      }
    for (const [index, patient] of patients.entries()) {
      let presentation = this.arrivalPatients.get(patient.id);
      const slot = this.arrivalClinic.slots[index];
      if (!presentation) {
        const temporaryId = "clinic-patient:" + patient.id;
        presentation = this.makeActor({ id: temporaryId, x: 0, y: 0, team: null });
        this.actors.delete(temporaryId);
        presentation.mixer?.stopAllAction();
        const resting=presentation.actions.Idle;
        if(resting){resting.reset().setEffectiveWeight(1).play();presentation.mixer.update(0);resting.paused=true;}
        if(presentation.equipment)presentation.equipment.visible=false;
        presentation.root.traverse((object) => {
          if (object.isMesh)for(const material of Array.isArray(object.material)?object.material:[object.material])material.userData.world = true;
        });
        this.arrivalClinic.root.add(presentation.root);
        presentation.root.rotation.set(Math.PI / 2, 0, 0);
        this.arrivalPatients.set(patient.id, presentation);
      }
      // Positions and patient status are purely the public destination scene.
      // Cloned skeletons share source geometry; uniforms never encode roles.
      presentation.root.position.set(slot.x, 1.4, slot.z - 1.1);
      presentation.root.visible = true;
      presentation.patch.color.set(patient.rescued ? "#afc4b2" : "#97a79b");
    }
  }
  updateMedicalMission(mission, animationTime) {
    if (!mission) return;
    for (const fixture of mission.supplyStock || []) {
      const cases = this.medicalStocks.get(fixture.id);
      if (cases)
        cases.forEach((object, i) => {
          object.visible = Number(fixture.stock) > i;
        });
    }
    if (this.medevacRotor)
      this.medevacRotor.rotation.y = this.motion.matches
        ? 0
        : (Math.floor(animationTime * 30) / 30) * 5;
    const loaded = (mission.manifest || []).reduce(
      (sum, entry) => sum + Math.max(0, Number(entry.loaded) || 0),
      0,
    );
    this.transportCargo.forEach((object, i) => {
      object.visible = i < loaded;
    });
    if (this.g.arena.mapId === "hospital")
      updateHospital(this, mission, { protocol: this.g.arena.protocol, time: this.g.arena.time }, animationTime);
    if (this.g.arena.mapId !== "medevac" || !mission.vehicle) return;
    const vehicle = mission.vehicle,
      altitude = THREE.MathUtils.clamp(Number(vehicle.altitude) || 0, 0, 1.5),
      heading = THREE.MathUtils.clamp(Number(vehicle.heading) || 0, -2, 2),
      progress = THREE.MathUtils.clamp(
        (Number(vehicle.progress) || 0) / Math.max(1, Number(vehicle.duration) || 120),
        0,
        1,
      ),
      alarm = !vehicle.autopilot && !vehicle.underControl;
    if (this.transportTerrain) {
      this.transportTerrain.position.set(
        (this.g.level.length * SCALE) / 2 - heading * 25,
        -31 - altitude * 40,
        -380 + progress * 150,
      );
      this.transportTerrain.rotation.y = -heading * 0.18;
      // The stationary landing apron replaces the airborne heightfield at
      // arrival, making the clinic and aircraft share the same ground plane.
      this.transportTerrain.visible = !vehicle.arrived;
    }
    this.updateArrivalClinic(mission);
    if (this.transportAlarm) {
      this.transportAlarm.color.set(alarm || vehicle.cargoDamage > 0 ? "#bc6758" : "#89c6b5");
      this.transportAlarm.emissive.set(alarm || vehicle.cargoDamage > 0 ? "#8e3326" : "#457d71");
      this.transportAlarm.emissiveIntensity = alarm ? 1 : 0.65;
    }
    if (!this.transportInstrument) return;
    const key = [
      Math.round(altitude * 100),
      Math.round(heading * 100),
      Math.round(progress * 100),
      !!vehicle.autopilot,
      !!vehicle.underControl,
      !!vehicle.arrived,
      Math.round(vehicle.cargoDamage || 0),
    ].join(":");
    if (key === this.transportInstrumentKey) return;
    this.transportInstrumentKey = key;
    const ctx = this.transportInstrument.canvas.getContext("2d");
    ctx.fillStyle = "#13262c";
    ctx.fillRect(0, 0, 768, 320);
    ctx.fillStyle = alarm ? "#e9aa8a" : "#a6d8cd";
    ctx.font = "600 36px system-ui, sans-serif";
    ctx.fillText(
      vehicle.arrived
        ? "FIELD CLINIC / LANDED"
        : vehicle.autopilot
          ? "LIFELINE / AUTOPILOT"
          : "LIFELINE / MANUAL CONTROL",
      25,
      51,
    );
    ctx.font = "22px monospace";
    ctx.fillStyle = "#d8e4dc";
    ctx.fillText("ALTITUDE", 28, 102);
    ctx.fillText("HEADING", 288, 102);
    ctx.fillText("ROUTE", 545, 102);
    ctx.font = "46px monospace";
    ctx.fillText(Math.round(altitude * 100) + "%", 28, 160);
    ctx.fillText((heading > 0 ? "+" : "") + Math.round(heading * 100), 288, 160);
    ctx.fillText(Math.round(progress * 100) + "%", 545, 160);
    ctx.fillStyle = "#355b60";
    ctx.fillRect(28, 199, 700, 10);
    ctx.fillStyle = alarm ? "#c78b6d" : "#87bcad";
    ctx.fillRect(28, 199, 700 * progress, 10);
    ctx.font = "24px monospace";
    ctx.fillText(
      alarm
        ? "RECOVER FLIGHT CONTROL"
        : vehicle.arrived
          ? "DELIVER MEDICAL CARGO"
          : "MEDICAL RESUPPLY / COASTAL ROUTE",
      28,
      264,
    );
    this.transportInstrument.texture.needsUpdate = true;
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
    const tex = crispText(this, new THREE.CanvasTexture(signCanvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.add(tex);
    this.worldTextures.add(tex);
    const material = this.material({ map: tex, color: "#ffffff", roughness: 0.95 });
    material.userData.world = true;
    const signs = [];
    for (let y = 1; y < n - 1; y++)
      for (let x = 1; x < n - 1; x++)
        if (
          this.g.level[y][x] &&
          !this.g.level[y + 1]?.[x] &&
          // Signs go on built walls, not on hedges, pallets or sandbags.
          !this.arenaStyle?.owns(id, this.g.level[y][x]) &&
          // Calder Quay has its own building signs (and its canal is not a wall).
          !mapOf(id).buildings &&
          signs.length < 18
        )
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
      const fuselage = this.mesh(this.world, hullGeometry, aluminum, [26 * SCALE, 3, 17 * SCALE]);
      fuselage.rotation.x = -Math.PI / 2;
      fuselage.userData.ownedGeometry = true;
      aluminum.side = THREE.DoubleSide;
      this.box(this.world, aluminum, [26 * SCALE, 3.1, 17 * SCALE], [14, 0.12, 3]);
    }
    if (id === "estate") {
      const wreck = new THREE.Group();
      this.world.add(wreck);
      wreck.position.set(16 * SCALE, 0, 14.5 * SCALE);
      wreck.rotation.y = 0.5;
      this.box(wreck, mat, [0, 1.4, 0], [3, 2.3, 5]);
      this.box(wreck, mat, [0, 2.6, 0], [11, 0.07, 0.32]);
      this.box(wreck, mat, [0, 1.4, 4.6], [0.45, 0.65, 6]);
    }
  }
  makePuddles(id, n) {
    if (!this.profile.reflections) return;
    if(id === "medevac") return; // Dry aircraft flooring is not a water mirror.
    const wetPixels=new Uint8Array(n*n*4);
    const roofs=roofLayout(id==="breakwater"?this.g.protocolMap:null).cells;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const roof=roofs.has(`${x},${y}`);
      const value=!this.g.level[y]?.[x]&&!roof?255:0,offset=(y*n+x)*4;
      wetPixels[offset]=wetPixels[offset+1]=wetPixels[offset+2]=value;wetPixels[offset+3]=255;
    }
    const wetAreas=new THREE.DataTexture(wetPixels,n,n,THREE.RGBAFormat);wetAreas.needsUpdate=true;
    wetAreas.magFilter=wetAreas.minFilter=THREE.NearestFilter;this.textures.add(wetAreas);this.worldTextures.add(wetAreas);
    // One reflection camera covers the arena, with an irregular water mask.
    // This reflects moving characters and walls, rather than a painted highlight.
    const shader = {
      uniforms: THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
      vertexShader: Reflector.ReflectorShader.vertexShader
        .replace(
          "varying vec4 vUv;",
          "varying vec4 vUv; varying vec2 wetUv; varying vec3 wetWorld;",
        )
        .replace(
          "vUv = textureMatrix",
          "wetUv = position.xy; wetWorld=(modelMatrix*vec4(position,1.0)).xyz; vUv = textureMatrix",
        ),
      fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D wetAreas; uniform float arenaMetres; varying vec4 vUv; varying vec2 wetUv; varying vec3 wetWorld;
        #include <logdepthbuf_pars_fragment>
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        void main(){
          #include <logdepthbuf_fragment>
          float n=noise(wetUv*.22)+.28*noise(wetUv*.72);
          float mask=smoothstep(.72,.91,n)*texture2D(wetAreas,wetWorld.xz/arenaMetres).r;
          if(mask<.015) discard;
          vec2 uv=vUv.xy/vUv.w;
          vec2 ripple=vec2(noise(wetUv*5.),noise(wetUv*5.+17.))-.5;
          vec3 reflection=texture2D(tDiffuse,uv+ripple*.0015).rgb;
          // Water is a dielectric: weak reflection straight down, stronger
          // at grazing angles. Keep the dry aggregate visible around pools.
          float facing=abs(normalize(cameraPosition-wetWorld).y);
          float fresnel=.02+.98*pow(1.-facing,5.);
          gl_FragColor=vec4(reflection,mask*clamp(fresnel,.025,.82));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    };
    shader.uniforms.wetAreas={value:wetAreas};shader.uniforms.arenaMetres={value:n*SCALE};
    const size = this.g.academy.preset === "high" ? 1024 : 512;
    const reflector = new Reflector(new THREE.PlaneGeometry(n * SCALE, n * SCALE), {
      textureWidth: size,
      textureHeight: size,
      clipBias: 0.003,
      multisample: 0,
      shader,
    });
    reflector.getRenderTarget().texture.type = this.profile.halfFloat
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.set((n * SCALE) / 2, 0.014, (n * SCALE) / 2);
    reflector.material.transparent = true;
    reflector.material.depthWrite = false;
    reflector.userData.ownedGeometry = true;
    reflector.visible = this.g.academy.preset === "high";
    this.world.add(reflector);
    this.reflection = reflector;
    const draw = reflector.onBeforeRender.bind(reflector);
    // Refresh the mirror every other frame; ripples hide the half-step.
    let frame = 0;
    reflector.onBeforeRender = (...args) => {
      if (this.scene.overrideMaterial) return;
      if (frame++ % 2 && reflector.userData.drawn) return;
      reflector.userData.drawn = true;
      draw(...args);
    };
  }
  /** Locker characters load on demand; "operator" is this.soldier. */
  loadCharacter(id) {
    if (!id || id === "operator" || !CHARACTERS.some((c) => c.id === id)) return Promise.resolve(null);
    this.characterAssets ||= new Map();
    this.characterLoads ||= new Map();
    if (this.characterAssets.has(id)) return Promise.resolve(this.characterAssets.get(id));
    if (!this.characterLoads.has(id))
      this.characterLoads.set(
        id,
        new GLTFLoader()
          .setMeshoptDecoder(MeshoptDecoder)
          .loadAsync(`${ASSET}models/characters/${id}.glb?v=${CHARACTER_CACHE}`)
          .then((gltf) => {
            if (this.disposed) {
              this.disposeObject(gltf.scene);
              return null;
            }
            prepareLockerCharacter(this, gltf);
            this.characterAssets.set(id, gltf);
            return gltf;
          })
          .catch((error) => {
            // Optional: the fighter keeps the operator sculpt.
            console.warn("[Outpost] Character unavailable:", id, error);
            return null;
          }),
      );
    return this.characterLoads.get(id);
  }
  /** Which Locker character an entity wears (null: the operator). In Last
   * Signal you wear yours and each bot a stable pick of the others. */
  characterFor(e) {
    let id = e.character;
    if (!id && this.g.mode === "signal" && (e.bot || !this.g.online)) {
      // Offline your pick is yours alone; online players' picks come with them.
      const mine = this.g.online ? null : this.g.character || "operator";
      // Online, every player sees the same bots: the round id is shared.
      this.characterSalt ??= Math.random().toString(36).slice(2, 8);
      const salt = this.g.online ? String(this.g.arena.roundId) : this.characterSalt;
      id =
        e.id === this.g.selfId
          ? mine
          : botCharacter(salt, this.g.arena.entities.filter((x) => x.bot).indexOf(e), mine);
    }
    return id && id !== "operator" ? id : null;
  }
  makeActor(e) {
    const before = new Set(this.materials);
    const root = new THREE.Group();
    this.dynamic.add(root);
    let model,
      mixer = null,
      actions = {};
    const wanted = this.characterFor(e),
      character = wanted ? this.characterAssets?.get(wanted) : null;
    if (wanted && !character) this.loadCharacter(wanted);
    const source = character || this.soldier;
    if (source) {
      model = cloneSkeleton(source.scene);
      mixer = new THREE.AnimationMixer(model);
      const idleClip=source.animations.find(c=>c.name==="Idle");
      for (const clip of source.animations) {
        if (clip.name === "TPose") continue;
        if (["Reload","Hit"].includes(clip.name) && idleClip) {
          const layer=clip.clone();layer.tracks=layer.tracks.filter(t=>/Spine|Neck|Head|Arm|Hand/.test(t.name));
          THREE.AnimationUtils.makeClipAdditive(layer,0,idleClip,30);
          actions[clip.name]=mixer.clipAction(layer);actions[clip.name].setEffectiveWeight(0);
        } else actions[clip.name]=mixer.clipAction(clip);
      }
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
        factor = 1.82 / height;
      model.scale.multiplyScalar(factor);
      model.position.y -= bounds.min.y * factor;
      finishActor(this, model, e);
      if (!character && !this.soldierLook()) {
        model.traverse((o) => {
          // Parts of one actor can share a material: patch each material once,
          // or the fabric shader declares its varyings twice and fails.
          if (o.isMesh && !o.material.userData.outfitFabric) {
            o.material.userData.outfitFabric = true;
            const uniform = outfitOf(e.outfit),
              texture = this.skinTexture(uniform);
            o.material.color.set("#ffffff");
            o.material.map ||= texture;
            o.geometry.computeBoundingBox();
            const bounds = o.geometry.boundingBox;
            const physicalShader = o.material.onBeforeCompile;
            o.material.onBeforeCompile = (shader) => {
              physicalShader(shader);
              shader.uniforms.fabricPattern = { value: texture };
              shader.uniforms.lowerPattern = {
                value:
                  uniform.id === "urban"
                    ? this.skinTexture({
                        ...uniform,
                        id: "urban-pants",
                        pattern: "woodland",
                        palette: ["#536548", "#7f8b61", "#354333", "#aba77d"],
                      })
                    : texture,
              };
              shader.uniforms.splitLegs = { value: uniform.id === "urban" };
              shader.uniforms.fabricHeight = {
                value: new THREE.Vector2(
                  bounds.min.y,
                  Math.max(0.001, bounds.max.y - bounds.min.y),
                ),
              };
              shader.vertexShader =
                "varying float vFabricHeight; uniform vec2 fabricHeight;\n" + shader.vertexShader;
              shader.vertexShader = shader.vertexShader.replace(
                "#include <begin_vertex>",
                "#include <begin_vertex>\nvFabricHeight=(position.y-fabricHeight.x)/fabricHeight.y;",
              );
              shader.fragmentShader =
                "uniform sampler2D fabricPattern; uniform sampler2D lowerPattern; uniform bool splitLegs; varying float vFabricHeight;\n" +
                shader.fragmentShader;
              shader.fragmentShader = shader.fragmentShader.replace(
                "#include <map_fragment>",
                `#include <map_fragment>
              float fabricLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
              vec3 pattern=texture2D(fabricPattern,vMapUv*2.0).rgb;
              if(splitLegs && vFabricHeight<.46) pattern=texture2D(lowerPattern,vMapUv*2.0).rgb;
              if(vFabricHeight<.105) pattern=vec3(.095,.115,.105);
              diffuseColor.rgb=pattern*(.72+fabricLuma*.28);`,
              );
            };
            o.material.customProgramCacheKey = () => "outpost-reference-physical-fabric-v2";
            o.castShadow = true;
            o.receiveShadow = true;
            this.materials.add(o.material);
          }
        });
      }
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
      color:
        this.g.mode === "protocol"
          ? "#97a79b"
          : e.team === this.g.player.team && this.g.mode === "duo"
            ? "#a2c8b1"
            : "#9b7465",
      roughness: 0.9,
    });
    if(!model.userData.riggedOperator)this.box(root, patch, [0.26, 1.33, 0.05], [0.045, 0.12, 0.085]);
    const actor = {
      root,
      model,
      outfit: outfitOf(e.outfit).id,
      weapon: e.weapon,
      mixer,
      actions,
      action: "Idle",
      patch,
      x: e.x,
      y: e.y,
      lastSample: null,
      deadAt: null,
    };
    // A Locker character is complete as modelled: no added gear or dye.
    if (character);
    else if (!this.soldierLook()) this.dressActor(actor, e);
    else this.dyeUniform(model, e.color);
    actor.dye = e.color || null;
    actor.wantedCharacter = wanted;
    actor.character = character ? wanted : null;
    this.equipActor(actor, e);
    actor.ownedMaterials = [...this.materials].filter((m) => !before.has(m));
    this.actors.set(e.id, actor);
    return actor;
  }
  mergeStatic(group) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(),
      batches = new Map();
    group.traverse((o) => {
      if (!o.isMesh) return;
      const geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geometry.applyMatrix4(o.matrixWorld).applyMatrix4(inverse);
      if (!geometry.attributes.uv)
        geometry.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(
            new Float32Array(geometry.attributes.position.count * 2),
            2,
          ),
        );
      const list = batches.get(o.material) || [];
      list.push(geometry);
      batches.set(o.material, list);
      if (o.userData.ownedGeometry) o.geometry.dispose();
    });
    group.clear();
    for (const [material, geometries] of batches) {
      const geometry = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.ownedGeometry = true;
      group.add(mesh);
    }
  }
  /**
   * Blackout Protocol keeps one uniform for everyone, dyed in each seat's
   * colour: only the blue cloth is recoloured (its weave and shading kept);
   * vests, straps, boots and skin keep their own colours. Colours never
   * reveal a role, they only make "I saw Red" possible.
   */
  /** Lifeline Run and Last Signal both use the plain soldier uniform. */
  soldierLook() {
    return this.g.mode === "protocol" || this.g.mode === "signal";
  }
  dyeUniform(model, color) {
    if (!color) return;
    const tint = new THREE.Color(color).lerp(new THREE.Color("#808080"), 0.1);
    model.traverse((o) => {
      if (!o.isMesh) return;
      for (const material of [].concat(o.material)) {
        if (!/uniform|fabric/i.test(material.name) || material.userData.playerDye) continue;
        material.userData.playerDye = { value: tint };
        const previous = material.onBeforeCompile;
        material.onBeforeCompile = (shader, renderer) => {
          previous?.call(material, shader, renderer);
          shader.uniforms.playerDye = material.userData.playerDye;
          shader.fragmentShader =
            "uniform vec3 playerDye;\n" +
            shader.fragmentShader.replace(
              "#include <map_fragment>",
              `#include <map_fragment>
              vec3 clothBase = diffuseColor.rgb;
              float clothLight = dot(clothBase, vec3(.2126, .7152, .0722));
              // The base cloth is a muted blue-grey: a small blue lead is enough.
              float clothBlue = smoothstep(.004, .045, clothBase.b - max(clothBase.r, clothBase.g));
              diffuseColor.rgb = mix(clothBase, playerDye * clamp(clothLight * 2.9, .06, 1.15), clothBlue);`,
            );
        };
        material.customProgramCacheKey = () => "outpost-player-dye-v2";
        material.needsUpdate = true;
      }
    });
  }
  disposeActor(a) {
    this.dynamic.remove(a.root);
    a.mixer?.stopAllAction();
    a.root.traverse((o) => {
      if (o.userData.ownedGeometry) o.geometry.dispose();
      if (o.isSkinnedMesh) o.skeleton.dispose();
    });
    for (const material of a.ownedMaterials || []) {
      material.dispose();
      this.materials.delete(material);
    }
  }
  equipActor(a, e) {
    a.grip = null;
    const m = this.weaponMaterials(false);
    a.equipmentMaterials = Object.values(m);
    const equipment = new THREE.Group();
    a.root.add(equipment);
    this.buildWeapon(equipment, e.weapon, m, false);
    if(e.weapon === "carbine") equipment.userData.carbine.position.z=.445;
    if(e.weapon === "carbine") batchWeapon(this, equipment);
    else this.mergeStatic(equipment);
    equipment.position.set(0.15, 1.25, -0.14);
    equipment.scale.setScalar(1.1);
    a.equipment = equipment;
    a.model.traverse((o) => {
      if (o.name.endsWith("RightHand")) a.weaponAnchor = o;
    });
    if(e.weapon==='carbine'&&a.model.userData.riggedOperator){equipment.scale.setScalar(1);bindWeaponGrip(a);}
  }
  skinTexture(outfit) {
    this.skinTextures ??= new Map();
    if (this.skinTextures.has(outfit.id)) return this.skinTextures.get(outfit.id);
    const texture = new THREE.CanvasTexture(skinPattern(outfit));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.add(texture);
    this.skinTextures.set(outfit.id, texture);
    return texture;
  }
  dressActor(a, e) {
    const outfit = outfitOf(e.outfit),
      texture = this.skinTexture(outfit),
      fabric = this.material({ color: "#ffffff", map: texture, roughness: 0.93 }),
      plate = this.material({
        color: "#ffffff",
        map: this.skinTexture({
          ...outfit,
          id: outfit.id + "-armor",
          pattern: "solid",
          palette: [outfit.armor],
        }),
        roughness: 0.8,
        metalness: 0.08,
      }),
      edge = this.material({ color: outfit.accent, roughness: 0.6, metalness: 0.15 }),
      dark = this.material({ color: "#283030", roughness: 0.83 }),
      stitch = this.material({
        color: new THREE.Color(outfit.armor).lerp(new THREE.Color("#d5d4c2"), 0.24),
        roughness: 0.95,
      }),
      glass = this.material({ color: "#263842", roughness: 0.16, metalness: 0.4 }),
      glow = this.material({
        color: outfit.accent,
        emissive: outfit.accent,
        emissiveIntensity:
          outfit.pattern === "circuit" || outfit.pattern === "fracture" ? 0.65 : 0.08,
        roughness: 0.45,
      });
    const gear = new THREE.Group();
    gear.name = "outfit-" + outfit.id;
    a.root.add(gear);
    a.skinParts = [];
    const part = (boneName) => {
      const group = new THREE.Group();
      gear.add(group);
      a.model.traverse((o) => {
        if (o.isBone && o.name.endsWith(boneName)) group.userData.anchor = o;
      });
      a.skinParts.push(group);
      return group;
    };
    const chest = part("Spine2"),
      head = part("Head"),
      leftArm = part("LeftArm"),
      rightArm = part("RightArm"),
      leftLeg = part("LeftLeg"),
      rightLeg = part("RightLeg");
    const box = (group, mat, p, s) => this.box(group, mat, p, s);
    const sphere = (group, mat, p, s) =>
      this.mesh(
        group,
        this.geo("skinSphere", () => new THREE.SphereGeometry(1, 24, 16)),
        mat,
        p,
        s,
      );
    const rounded = (group, mat, p, s) =>
      this.mesh(
        group,
        this.geo("skinRounded", () => new RoundedBoxGeometry(1, 1, 1, 2, 0.08)),
        mat,
        p,
        s,
      );
    // Modular carrier: plates, side straps, MOLLE rows and separate magazine pouches.
    rounded(chest, plate, [0, 1.48, -0.245], [0.51, 0.44, 0.1]);
    rounded(chest, dark, [0, 1.48, 0.24], [0.5, 0.44, 0.09]);
    for (const x of [-0.245, 0.245]) {
      box(chest, plate, [x, 1.62, 0.005], [0.095, 0.36, 0.44]);
      box(chest, dark, [x, 1.61, -0.24], [0.075, 0.09, 0.03]);
    }
    for (let j = 0; j < 4; j++)
      box(chest, stitch, [0, 1.57 - j * 0.065, -0.321], [0.43, 0.012, 0.012]);
    for (const x of [-0.175, 0, 0.175]) {
      rounded(chest, plate, [x, 1.23, -0.31], [0.13, 0.21, 0.075]);
      box(chest, dark, [x, 1.26, -0.372], [0.11, 0.025, 0.012]);
      box(chest, stitch, [x, 1.31, -0.37], [0.012, 0.035, 0.012]);
    }
    box(chest, dark, [0, 1.01, 0], [0.65, 0.08, 0.45]);
    for (const x of [-0.31, 0.31]) rounded(chest, plate, [x, 1.04, 0.05], [0.12, 0.16, 0.2]);
    rounded(chest, plate, [0, 1.46, 0.37], [0.4, 0.5, 0.22]);
    for (const x of [-0.11, 0.11]) box(chest, dark, [x, 1.46, 0.49], [0.035, 0.43, 0.015]);
    // Enclosed head silhouettes and dark protective goggles.
    if (outfit.head === "hood") {
      const shell = this.mesh(
        head,
        this.geo("angularHood", () => new THREE.SphereGeometry(1, 6, 6)),
        fabric,
        [0, 2.065, 0.035],
        [0.295, 0.335, 0.28],
      );
      shell.rotation.y = Math.PI / 6;
      rounded(head, dark, [0, 2.06, -0.252], [0.34, 0.29, 0.07]);
      rounded(head, plate, [0, 1.985, -0.303], [0.25, 0.15, 0.055]);
      box(head, edge, [0, 2.2, -0.235], [0.32, 0.028, 0.04]);
    } else {
      this.mesh(
        head,
        this.geo(
          "combatHelmet",
          () => new THREE.SphereGeometry(1, 24, 16, 0, TAU, 0, Math.PI * 0.6),
        ),
        fabric,
        [0, 2.09, 0.025],
        [0.275, 0.27, 0.275],
      );
      box(head, dark, [0, 2.16, -0.23], [0.36, 0.06, 0.08]);
      for (const x of [-0.255, 0.255]) {
        this.cylinder(head, plate, [x, 2.09, 0.02], 0.105, 0.065, "x", 16);
        this.cylinder(head, dark, [x * 1.07, 2.09, 0.02], 0.065, 0.07, "x", 16);
      }
      rounded(head, dark, [0, 2.095, -0.245], [0.35, 0.135, 0.065]);
      rounded(head, glass, [0, 2.1, -0.283], [0.29, 0.09, 0.018]);
      sphere(head, dark, [0, 1.975, -0.25], [0.145, 0.09, 0.085]);
      if (outfit.head === "respirator") {
        rounded(head, plate, [0, 1.99, -0.285], [0.22, 0.14, 0.07]);
        for (const x of [-0.165, 0.165])
          this.cylinder(head, dark, [x, 1.98, -0.285], 0.057, 0.055, "z", 16);
      }
      if (outfit.head === "visor") {
        rounded(head, glass, [0, 2.08, -0.31], [0.33, 0.18, 0.05]);
        box(head, glow, [0, 1.99, -0.34], [0.24, 0.015, 0.015]);
      }
    }
    for (const x of [-0.09, 0.09]) {
      const shine = box(head, stitch, [x, 2.125, -0.297], [0.09, 0.006, 0.006]);
      shine.rotation.z = -0.2;
    }
    for (const [x, arm, leg] of [
      [-0.38, leftArm, leftLeg],
      [0.38, rightArm, rightLeg],
    ]) {
      const shoulder = rounded(arm, plate, [x, 1.68, 0], [0.21, 0.17, 0.3]);
      shoulder.rotation.z = x < 0 ? -0.16 : 0.16;
      box(arm, edge, [x, 1.7, -0.166], [0.18, 0.025, 0.02]);
      rounded(leg, dark, [x * 0.47, 0.55, -0.075], [0.24, 0.25, 0.13]);
      rounded(leg, plate, [x * 0.47, 0.56, -0.153], [0.18, 0.18, 0.06]);
      box(leg, dark, [x * 0.47, 0.77, 0.01], [0.25, 0.045, 0.29]);
      rounded(leg, plate, [x * 0.69, 0.87, -0.015], [0.14, 0.25, 0.19]);
    }
    if (outfit.id === "urban") {
      sphere(chest, edge, [0, 1.57, -0.34], [0.07, 0.075, 0.013]);
      box(chest, edge, [0, 1.51, -0.35], [0.09, 0.045, 0.02]);
      for (const x of [-0.027, 0.027])
        sphere(chest, dark, [x, 1.585, -0.358], [0.02, 0.023, 0.012]);
      for (const x of [-0.025, 0, 0.025])
        box(chest, dark, [x, 1.505, -0.365], [0.008, 0.025, 0.008]);
    }
    if (outfit.id === "medic") {
      box(chest, edge, [0, 1.56, -0.348], [0.035, 0.14, 0.022]);
      box(chest, edge, [0, 1.56, -0.36], [0.14, 0.035, 0.022]);
      box(leftArm, edge, [-0.505, 1.65, 0], [0.02, 0.1, 0.12]);
    }
    if (outfit.id === "recon") {
      for (let i = 0; i < 5; i++) {
        const cone = this.mesh(
          rightArm,
          this.geo("skinSpike", () => new THREE.ConeGeometry(1, 1, 6)),
          dark,
          [0.4, 1.84, -0.12 + i * 0.06],
          [0.024, 0.16, 0.024],
        );
        cone.rotation.z = -0.25;
      }
      for (const x of [-0.17, 0.17]) box(chest, glow, [x, 1.53, -0.324], [0.018, 0.22, 0.014]);
      box(head, glow, [0, 2.09, -0.3], [0.24, 0.025, 0.022]);
    }
    if (outfit.id === "shadow") {
      for (const x of [-0.4, 0.4])
        box(x < 0 ? leftArm : rightArm, edge, [x, 1.68, -0.173], [0.21, 0.09, 0.025]);
      box(head, edge, [0, 2.12, -0.296], [0.29, 0.022, 0.018]);
    }
    if (outfit.pattern === "fracture") {
      for (const x of [-0.18, 0.18])
        box(x < 0 ? leftLeg : rightLeg, glow, [x, 0.55, -0.19], [0.013, 0.13, 0.015]);
      box(chest, glow, [0, 1.02, -0.24], [0.085, 0.04, 0.015]);
    }
    if (outfit.id === "engineer") {
      for (const x of [-0.12, 0.12]) {
        const brace = box(chest, edge, [x, 1.53, -0.334], [0.02, 0.22, 0.02]);
        brace.rotation.z = x < 0 ? -0.8 : 0.8;
      }
      box(chest, edge, [0.12, 1.75, 0.38], [0.025, 0.35, 0.025]);
    }
    if (outfit.id === "hazard")
      for (const x of [-0.13, 0.13])
        this.cylinder(chest, dark, [x, 1.47, 0.48], 0.085, 0.5, "y", 16);
    // Keep each rigid item with its animated body part, using its idle transform as the bind pose.
    a.root.updateMatrixWorld(true);
    const inverseRoot = a.root.matrixWorld.clone().invert();
    for (const group of a.skinParts) {
      this.mergeStatic(group);
      if (group.userData.anchor) {
        group.userData.inverseBind = new THREE.Matrix4()
          .multiplyMatrices(inverseRoot, group.userData.anchor.matrixWorld)
          .invert();
        group.matrixAutoUpdate = false;
      }
    }
    a.wardrobe = gear;
  }
  skinPortrait(id, width = 600, height = 800) {
    const ids = Array.isArray(id) ? id : [id];
    const actors = ids.map((outfit, i) => {
      const actor = this.makeActor({
        ...this.g.enemies[0],
        id: "portrait-" + outfit,
        outfit,
        weapon: "carbine",
      });
      actor.equipment.visible = false;
      actor.root.position.x = (i - (ids.length - 1) / 2) * 1.06;
      return actor;
    });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e1e4dc");
    scene.environment = this.scene.environment;
    scene.add(new THREE.HemisphereLight("#ffffff", "#8c9585", 3));
    const key = new THREE.DirectionalLight("#fff5e1", 4.5);
    key.position.set(-3, 5, -4);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#c5def3", 2);
    fill.position.set(4, 3, 2);
    scene.add(fill);
    actors.forEach((actor) => scene.add(actor.root));
    const camera = new THREE.OrthographicCamera(
      (-1.36 * width) / height,
      (1.36 * width) / height,
      1.36,
      -1.36,
      0.01,
      20,
    );
    camera.position.set(3.2, 2.15, -6.5);
    camera.lookAt(0, 1.16, 0);
    camera.updateMatrixWorld(true);
    const target = new THREE.WebGLRenderTarget(width, height);
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const oldTarget = this.renderer.getRenderTarget(),
      oldAuto = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(target);
    this.renderer.render(scene, camera);
    const pixels = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d"),
      image = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++)
      image.data.set(
        pixels.subarray((height - y - 1) * width * 4, (height - y) * width * 4),
        y * width * 4,
      );
    ctx.putImageData(image, 0, 0);
    this.renderer.setRenderTarget(oldTarget);
    this.renderer.autoClear = oldAuto;
    target.dispose();
    for (const actor of actors) {
      this.disposeActor(actor);
      this.actors.delete("portrait-" + actor.outfit);
    }
    return canvas.toDataURL("image/webp", 0.9);
  }
  updateSkinParts(a) {
    if (!a.skinParts) return;
    a.root.updateMatrixWorld(true);
    const inverseRoot = (a.inverseRoot ||= new THREE.Matrix4()).copy(a.root.matrixWorld).invert();
    for (const group of a.skinParts)
      if (group.userData.inverseBind) {
        group.matrix
          .multiplyMatrices(inverseRoot, group.userData.anchor.matrixWorld)
          .multiply(group.userData.inverseBind);
        group.matrixWorldNeedsUpdate = true;
      }
  }
  actorLodDistance() {
    return this.mobileDevice ? ACTOR_LOD_TILES.phone : ACTOR_LOD_TILES.desktop;
  }
  updateActors(t) {
    const current = new Set();
    const camera = this.g.camera();
    const sample = Math.floor(t * 30) / 30,
      farSample = Math.floor(t * 15) / 15;
    // Cull against the real view frustum (after shake, ADS zoom and aspect),
    // with a bounding sphere around the whole body, rather than a 2D cone.
    this.camera.updateMatrixWorld();
    const frustum = (this.actorFrustum ||= new THREE.Frustum()),
      sphere = (this.actorSphere ||= new THREE.Sphere());
    frustum.setFromProjectionMatrix(
      (this.actorFrustumMatrix ||= new THREE.Matrix4()).multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse,
      ),
    );
    const seeThrough = (x, y) =>
      this.waterTile(x, y) || this.protocolPropTile(x, y) || this.transportWindowTile(x, y) || this.transportHiddenWall(x, y);
    const lodDistance = this.actorLodDistance();
    this.actorStats={visible:0,culled:0,distant:0};
    for (const e of this.g.arena.entities) {
      current.add(e.id);
      if (e.id === camera.id) {
        // Retain an existing actor when switching POV: hide the watched body
        // without repeatedly disposing/rebuilding its skeleton and materials.
        const watched = this.actors.get(e.id);
        if (watched) watched.root.visible = false;
        continue;
      }
      let a = this.actors.get(e.id);
      const wanted = this.characterFor(e);
      if (
        a &&
        (a.outfit !== outfitOf(e.outfit).id ||
          a.weapon !== e.weapon ||
          a.wantedCharacter !== wanted ||
          // The character finished loading: swap the stand-in sculpt.
          (wanted && !a.character && this.characterAssets?.has(wanted)) ||
          (this.soldierLook() && !a.character && a.dye !== (e.color || null)))
      ) {
        this.disposeActor(a);
        this.actors.delete(e.id);
        a = null;
      }
      if (!a) a = this.makeActor(e);
      a.patch.color.set(
        this.soldierLook()
          ? "#97a79b"
          : e.team === this.g.player.team && this.g.mode === "duo"
            ? "#a2c8b1"
            : "#9b7465",
      );
      const alive = e.hp > 0,
        cloaked = e.cloakedUntil > this.g.time && e.team !== this.g.player.team;
      const now = performance.now() / 1000;
      if (alive) a.deadAt = null;
      else if (a.deadAt === null) a.deadAt = now;
      const fall = alive ? 0 : Math.min(1, (now - a.deadAt) / 0.85);
      a.root.visible =
        (alive || now - a.deadAt < 2.5) &&
        (!cloaked || Math.hypot(e.x - camera.x, e.y - camera.y) < 1.3) &&
        // A diver is under the water in a culvert.
        !(e.diveUntil > this.g.time);
      const sliding = alive && e.slideUntil > this.g.time;
      a.root.scale.y = 1;
      if (
        this.g.mode === "protocol" &&
        this.protocolPowerOut &&
        Math.hypot(e.x - camera.x, e.y - camera.y) > 2.6
      )
        a.root.visible = false;
      if (a.root.visible) {
        // Body sphere: feet to head (and a prone body's length), with the rifle.
        sphere.center.set(e.x * SCALE, ACTOR_SPHERE_HEIGHT + jumpLift(e, this.g.time) * SCALE, e.y * SCALE);
        sphere.radius = ACTOR_SPHERE_RADIUS;
        a.root.visible = actorInView(this.g.arena, camera, e, frustum.intersectsSphere(sphere), seeThrough);
      }
      const distance=Math.hypot(e.x-camera.x,e.y-camera.y),far=distance>lodDistance;
      // Small hysteresis avoids switching meshes repeatedly at the boundary.
      if(a.farDetail===undefined||Math.abs(distance-lodDistance)>.4)a.farDetail=far;
      a.detailMeshes ||= (()=>{const meshes=[];a.model.traverse(o=>{if(o.isSkinnedMesh&&o.userData.operatorLOD!==undefined)meshes.push(o);});return meshes;})();
      for(const mesh of a.detailMeshes)mesh.visible=mesh.userData.operatorLOD===(a.farDetail?1:0);
      if(a.root.visible){this.actorStats.visible++;if(a.farDetail)this.actorStats.distant++;}else this.actorStats.culled++;
      a.root.position.set(
        e.x * SCALE,
        Math.sin(Math.min(1, Math.max(0, ((e.jumpUntil || 0) - this.g.time) / 0.5)) * Math.PI) *
          SCALE -
          // Swimming: only head and shoulders above the water (the floor hides the rest).
          (alive && e.stance === "swim" ? 1.3 : 0),
        e.y * SCALE,
      );
      a.root.rotation.y = -Math.PI / 2 - e.a;
      const poseChanged =
        a.root.visible &&
        // Distant bodies (reduced mesh) animate at 15 Hz instead of 30 Hz:
        // the saving is in bone updates, never in hiding them.
        updateActorPresentation(this, a, e, Math.max(0, Math.min(0.1, t - this.lastTime)), a.farDetail ? farSample : sample);
      a.x = e.x;
      a.y = e.y;
      // Short physical recoil and hit flinch layered on skeletal locomotion.
      const hit = Math.max(0, 1 - (this.g.time - e.hit) / 0.18);
      a.model.rotation.z = 0;
      a.root.rotation.z = alive ? hit * 0.05 : a.deathAnimated ? 0 : this.motion.matches ? Math.PI / 2 : fall * 1.5;
      // Gear bindings are local to the skeleton. Root interpolation remains
      // full rate; expensive bone/gear transforms run only on a new 30Hz pose.
      if (poseChanged) this.updateSkinParts(a);
      if (a.equipment && a.root.visible) {
        if (poseChanged && updateWeaponGrip(a,Math.max(0,Math.min(1,(e.reloadUntil-this.g.time)/1.4)))) {
          // The palm binding and support IK follow the captured animation.
        } else if (a.weaponAnchor && poseChanged) {
          a.root.updateMatrixWorld(true);
          a.weaponAnchor.getWorldPosition(a.equipment.position);
          a.root.worldToLocal(a.equipment.position);
          a.equipment.position.z -= 0.05;
          if(e.weapon === "carbine") a.equipment.position.y += .10;
        } else if (!a.weaponAnchor)
          a.equipment.position.y =
            1.25 + (a.action !== "Idle" ? Math.sin(t * 7 + e.phase) * 0.025 : 0);
        if(!a.grip)a.equipment.rotation.x = t - e.shotAt < 0.15 ? -0.12 : 0;
        animateCarbine(a.equipment.userData.carbine,
          Math.max(0,Math.min(1,(e.reloadUntil-this.g.time)/1.4)),
          Math.max(0,1-(t-e.shotAt)/.16));
      }
    }
    for (const [id, a] of this.actors)
      if (!current.has(id)) {
        this.disposeActor(a);
        this.actors.delete(id);
      }
  }
  weaponMaterials(firstPerson = true) {
    const materials = realisticWeaponMaterials(this, firstPerson);
    if (!this.soldierLook()) {
      materials.cloth.map = this.skinTexture(outfitOf(this.g.camera().outfit));
      materials.cloth.color.set("#ffffff");
    }
    return materials;
  }
  hand(parent, x, y, z, m) {
    return buildRiggedHand(this,parent,x,y,z)||buildRealisticHand(this, parent, x, y, z, m);
  }
  firearm(parent, m, kind = "rifle", offset = 0, hands = true) {
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
    if (hands) this.hand(gun, 0.032, -0.105, -0.445, m);
    if (hands) this.hand(gun, -0.045, -0.058, -0.75, m);
    return gun;
  }
  updateWeapon(id = this.g.camera().weapon) {
    // Only your own gun wears your Locker finish (not one you spectate).
    const finish =
      this.g.camera() === this.g.player ? this.g.retention?.weaponFinish?.() || "standard" : "standard";
    if (id === this.weaponId && this.weaponOutfit === this.g.camera().outfit && finish === this.weaponFinish)
      return;
    this.weaponFinish = finish;
    disposeRiggedHands(this.rig);
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
    for (const texture of this.weaponTextures) {
      texture.dispose();
      this.textures.delete(texture);
    }
    this.weaponTextures.clear();
    this.weaponId = id;
    this.weaponOutfit = this.g.camera().outfit;
    const m = this.weaponMaterials();
    this.buildWeapon(this.rig, id, m);
    // Long guns sit in the lower right with receiver, optic and magazine in
    // view; paired and fist weapons stay centred.
    const centred = id === "twin" || id === "brawler";
    this.rig.position.set(centred ? 0.05 : 0.175, -0.2, 0);
    this.rigBase = {
      x: this.rig.position.x,
      z: centred ? 0 : 0.035,
      yaw: centred ? -0.07 : -0.045,
      // Paired pistols are short: lift them so slides and grips both show.
      y: id === "twin" ? 0.06 : 0,
    };
    this.rig.rotation.set(0.02, this.rigBase.yaw, -0.025);
    finishWeapon(this, id);
  }
  buildWeapon(parent, id, m, hands = true) {
    if(id === "carbine") { buildCarbine(this,parent,m,hands); return; }
    const hand = (...args) => {
      if (hands) this.hand(...args);
    };
    m.polymer.color.set(weaponOf(id).color).multiplyScalar(0.55);
    // Modelled shotguns and pistols when the weapon models have loaded.
    if (this.weaponKit?.shotgun && (id === "scatter" || id === "breach")) {
      buildModelledShotgun(this, parent, m, hands, id === "breach");
      return;
    }
    if (this.weaponKit?.pistol && id === "twin") {
      buildModelledPistols(this, parent, m, hands);
      return;
    }
    if (id === "venom") m.steel.color.set("#6eb75a");
    if (id === "veil") m.steel.color.set("#c6b6e0");
    const firearms = ["carbine", "scatter", "twin", "breach"];
    if (firearms.includes(id)) {
      if (id === "twin") {
        for (const x of [-0.16, 0.16]) {
          const pistol = new THREE.Group();
          parent.add(pistol);
          pistol.position.x = x;
          this.box(pistol, m.metal, [0, 0.015, -0.52], [0.055, 0.065, 0.26]);
          this.cylinder(pistol, m.steel, [0, 0.02, -0.66], 0.014, 0.03);
          const grip = this.box(pistol, m.polymer, [0, -0.1, -0.44], [0.048, 0.15, 0.07]);
          grip.rotation.x = -0.18;
          this.box(pistol, m.steel, [0, 0.057, -0.59], [0.012, 0.014, 0.025]);
          hand(pistol, 0.025, -0.1, -0.45, m);
        }
      } else {
        const gun = this.firearm(
          parent,
          m,
          ["scatter", "breach"].includes(id) ? "shotgun" : "rifle",
          0,
          hands,
        );
        if (id === "scatter") {
          gun.scale.z = 0.8;
          this.box(gun, m.polymer, [0, -0.015, -0.77], [0.12, 0.1, 0.2]);
        }
        if (id === "breach") {
          this.cylinder(gun, m.steel, [0.037, 0.018, -0.97], 0.025, 0.36);
          this.box(gun, m.metal, [0, -0.07, -0.58], [0.12, 0.15, 0.12]);
        }
      }
    } else if (id === "rocket") {
      this.cylinder(parent, m.polymer, [0.02, 0, -0.62], 0.095, 0.66);
      this.cylinder(parent, m.metal, [0.02, 0, -0.96], 0.1, 0.03);
      this.cylinder(parent, m.rubber, [0.02, 0, -0.982], 0.078, 0.004);
      this.box(parent, m.metal, [0.02, 0.12, -0.65], [0.05, 0.12, 0.06]);
      this.box(parent, m.polymer, [0.02, -0.13, -0.45], [0.04, 0.17, 0.06]);
      hand(parent, 0.06, -0.13, -0.47, m);
      hand(parent, -0.045, -0.09, -0.77, m);
    } else if (id === "demo" || id === "shard") {
      for (const x of id === "demo" ? [-0.055, 0.055] : [0]) {
        this.cylinder(parent, m.polymer, [x, -0.07, -0.52], 0.055, 0.21, "y");
        this.box(parent, m.metal, [x, 0.045, -0.52], [0.06, 0.02, 0.045]);
        const ring = this.mesh(
          parent,
          this.geo("pin", () => new THREE.TorusGeometry(0.02, 0.003, 8, 24)),
          m.steel,
          [x, 0.065, -0.52],
        );
        ring.rotation.y = 0.3;
      }
      hand(parent, 0.02, -0.2, -0.5, m);
    } else if (id === "brawler") {
      hand(parent, -0.22, -0.03, -0.45, m);
      hand(parent, 0.12, -0.03, -0.45, m);
      for (const x of [-0.22, 0.12]) {
        this.box(parent, m.metal, [x, 0, -0.49], [0.16, 0.12, 0.19]);
        this.box(parent, m.polymer, [x, 0.07, -0.49], [0.17, 0.045, 0.16]);
      }
    } else {
      const count = id === "reaper" ? 1 : id === "veil" ? 4 : 3;
      if (id === "reaper") {
        this.cylinder(parent, m.polymer, [0, -0.12, -0.52], 0.018, 0.65, "y");
        const shape = new THREE.Shape();
        shape.moveTo(-0.03, 0.26);
        shape.bezierCurveTo(0.12, 0.48, 0.38, 0.42, 0.47, 0.06);
        shape.bezierCurveTo(0.34, 0.26, 0.18, 0.29, -0.03, 0.26);
        const blade = this.mesh(
          parent,
          new THREE.ExtrudeGeometry(shape, {
            depth: 0.015,
            bevelEnabled: false,
            curveSegments: 12,
          }),
          m.steel,
          [0, 0, -0.52],
        );
        blade.userData.ownedGeometry = true;
      }
      for (let i = 0; i < count; i++) {
        const blade = new THREE.Group();
        parent.add(blade);
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
      hand(parent, 0.005, -0.22, -0.48, m);
    }
  }
  preview(c, id, width, height) {
    if (this.disposed || this.contextUnavailable || !this.soldier) return false;
    const key = id + ":" + width + ":" + height;
    this.previews ||= new Map();
    if (this.previews.has(key)) {
      c.drawImage(this.previews.get(key), 0, 0, width, height);
      return true;
    }
    const w = Math.min(1200, Math.max(480, width * 2)),
      h = Math.round((w * height) / width);
    const target = new THREE.WebGLRenderTarget(w, h),
      oldTarget = this.renderer.getRenderTarget(),
      oldAuto = this.renderer.autoClear;
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#334039");
    scene.environment = this.scene.environment;
    scene.add(new THREE.HemisphereLight("#ffffff", "#8b9c91", 3));
    const light = new THREE.DirectionalLight("#fff5df", 5);
    light.position.set(2, 3, 3);
    scene.add(light);
    const display = new THREE.Group();
    scene.add(display);
    const before = new Set(this.materials),
      m = this.weaponMaterials(false);
    this.buildWeapon(display, id, m, false);
    const box = new THREE.Box3().setFromObject(display),
      center = box.getCenter(new THREE.Vector3());
    const aspect = w / h;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
    camera.position.copy(center).add(new THREE.Vector3(2, 0.65, 1.1));
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    const projected = new THREE.Box3();
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z])
          projected.expandByPoint(
            new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse),
          );
    const span =
      Math.max(
        (projected.max.y - projected.min.y) / 2,
        (projected.max.x - projected.min.x) / (2 * aspect),
      ) * 1.18;
    camera.left = -span * aspect;
    camera.right = span * aspect;
    camera.top = span;
    camera.bottom = -span;
    camera.updateProjectionMatrix();
    this.renderer.setRenderTarget(target);
    this.renderer.autoClear = true;
    this.renderer.render(scene, camera);
    const pixels = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d"),
      image = ctx.createImageData(w, h);
    for (let row = 0; row < h; row++)
      image.data.set(pixels.subarray((h - 1 - row) * w * 4, (h - row) * w * 4), row * w * 4);
    ctx.putImageData(image, 0, 0);
    this.renderer.setRenderTarget(oldTarget);
    this.renderer.autoClear = oldAuto;
    target.dispose();
    display.traverse((o) => {
      if (o.userData.ownedGeometry) o.geometry.dispose();
    });
    for (const material of this.materials)
      if (!before.has(material)) {
        material.dispose();
        this.materials.delete(material);
      }
    this.previews.set(key, canvas);
    c.drawImage(canvas, 0, 0, width, height);
    return true;
  }
  updatePickups(t) {
    // Charge Cores keep the shared latch metal; the crates moved to the
    // interactables kit, but the cores and their disposal still use this.
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
        if (e.kind) buildHazard(this, root, e.kind);
        else buildSupplyBox(this,root);
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
    if (this.g.mode === "protocol" && this.g.arena.protocol?.phase !== "combat") {
      for (const projectile of this.projectiles.values()) this.dynamic.remove(projectile);
      for (const tracer of this.tracers) this.dynamic.remove(tracer.mesh);
      this.projectiles.clear();
      this.tracers = [];
      this.seenShots.clear();
      return;
    }
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
  removeProtocolObject(root, disposeMaterials = false) {
    this.dynamic.remove(root);
    if (!disposeMaterials) return;
    const materials = new Set();
    root.traverse((object) => {
      if (object.isSkinnedMesh) object.skeleton.dispose();
      if (object.isMesh)
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(material);
    });
    for (const material of materials) {
      material.dispose();
      this.materials.delete(material);
    }
  }
  clearProtocolDynamic() {
    for (const root of this.protocolCharges.values()) this.removeProtocolObject(root);
    for (const body of this.protocolBodies.values()) {
      body.mixer?.stopAllAction();
      this.removeProtocolObject(body.root, true);
    }
    this.protocolCharges.clear();
    this.defusingChargeId = null;
    this.lastChargeNotice = null;
    this.protocolBodies.clear();
    if (this.footprints) {
      this.footprints.count = 0;
      this.footprintKey = "";
    }
  }
  updateProtocol(view, camera) {
    const protocol = view?.protocol;
    if (this.g.mode !== "protocol" || !protocol) {
      this.clearProtocolDynamic();
      this.protocolPowerOut = false;
      for (const light of this.protocolLights) {
        light.intensity = 0;
        light.visible = true;
      }
      this.protocolTorch.intensity = 0;
      this.protocolTorch.visible = true;
      this.sun.intensity = this.g.academy.options.lighting ? 4.2 : 1.7;
      this.hemisphere.intensity = this.g.academy.options.lighting ? 0.55 : 1.3;
      this.rim.intensity = 1.15;
      this.scene.environmentIntensity = 0.45;
      return;
    }
    const powerOut = protocol.sabotage?.powerUntil > this.g.time;
    this.protocolPowerOut = powerOut;
    for (const material of this.protocolSignMaterials || []) {
      material.emissiveIntensity = material.userData.textEmission * (powerOut ? .16 : 1);
    }
    // Natural lighting owns these values; resetting them here defeats fading.
    for (const material of this.protocolLightMaterials) {
      // Preserve the diffuser's colour instead of clipping it into a white
      // patch. Real pooled lights supply illumination independently of bloom.
      material.emissiveIntensity = powerOut ? 0.035 : this.g.academy.preset === 'high' ? 1.6 : 1.0;
      // Night shift fixtures burn warm, matching the light they cast.
      material.color.set(powerOut ? "#414d4f" : this.night?.active ? "#ffe0b8" : "#d3edf0");
      material.userData.dayEmissive ??= material.emissive.getHex();
      if (this.night?.active) material.emissive.set("#ffcf96");
      else material.emissive.setHex(material.userData.dayEmissive);
    }
    const tasks = protocol.self?.tasks || [];
    for (const [id, material] of this.protocolScreens) {
      const task =
        protocol.mission?.flightTasks?.find(
          (item) => item.id === id || (item.id === "landing" && id === "medevac-radio"),
        ) || tasks.find((item) => item.stationId === id);
      material.emissiveIntensity = powerOut ? 0.015 : task && !task.done ? 0.9 : 0.4;
      material.color.set(powerOut ? "#233538" : task?.done ? "#659d80" : "#a0bdc0");
    }
    // Natural lighting already selects fixtures within the occupied room.
    // The stronger beam follows vertical aim as well as heading. It improves
    // surface visibility without extending the authoritative 2.6-tile sight.
    this.protocolTorch.intensity = powerOut ? 115 : 0;
    this.protocolTorch.visible = true;
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.torchDirection);
    this.protocolTorch.position.copy(this.camera.position);
    this.protocolTorch.position.y -= 0.14;
    this.protocolTorch.target.position
      .copy(this.protocolTorch.position)
      .addScaledVector(this.torchDirection, 12);
    this.protocolTorch.target.updateMatrixWorld();
    const chargeIds = new Set();
    const notice = this.g.player?.noticeId;
    const confirmedDefuse = notice !== this.lastChargeNotice && /^Charge disabled\./.test(this.g.player?.notice || '');
    const defusedId = confirmedDefuse ? this.defusingChargeId : null;
    this.lastChargeNotice = notice;
    this.defusingChargeId = protocol.self?.channel?.kind === 'defuse' ? protocol.self.channel.target : null;
    // Read only the public, already redacted list. Do not consult map sites,
    // authoritative protocol.players, private planted coordinates or roles.
    for (const charge of protocol.bombs || []) {
      if (!['armed','disabled'].includes(charge.state)) continue;
      chargeIds.add(charge.id);
      let root = this.protocolCharges.get(charge.id);
      if (!root) {
        root = new THREE.Group();
        this.dynamic.add(root);
        buildCharge(this,root);
        this.protocolCharges.set(charge.id, root);
      }
      updateChargePresentation(this,root,charge.state);
      root.position.set(charge.x * SCALE, 0.045, charge.y * SCALE);
      root.visible = !powerOut || Math.hypot(charge.x - camera.x, charge.y - camera.y) <= 2.2;
    }
    for (const [id, root] of this.protocolCharges)
      if (!chargeIds.has(id)) {
        // The protocol removes defused charges. Retain a short SAFE shell only
        // for a confirmed local defuse of an already-public object. Loss of
        // sight/redaction must never be inferred to mean a charge was disabled.
        if (id === defusedId) {
          updateChargePresentation(this,root,'disabled');
          root.userData.disabledUntil = this.g.time + 4;
        }
        if (root.userData.disabledUntil > this.g.time) continue;
        this.removeProtocolObject(root);
        this.protocolCharges.delete(id);
      }
    const bodyIds = new Set();
    for (const corpse of protocol.bodies || []) {
      bodyIds.add(corpse.id);
      let body = this.protocolBodies.get(corpse.id);
      if (!body) {
        // Reuse the same uniform and pose geometry as living participants.
        // No body tint or equipment reveals the victim's private allegiance.
        const tempId = "protocol-body:" + corpse.id;
        body = this.makeActor({ id: tempId, x: corpse.x, y: corpse.y, team: null });
        this.actors.delete(tempId);
        body.mixer?.stopAllAction();
        if(body.actions.Death){
          const action=body.actions.Death;action.reset().setEffectiveWeight(1).setEffectiveTimeScale(0).play();action.time=action.getClip().duration;body.mixer.update(0);
          body.root.updateMatrixWorld(true);body.model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
          body.corpseGround=.012-new THREE.Box3().setFromObject(body.model).min.y;
        }else body.root.rotation.set(0,0,-Math.PI/2);
        if(body.equipment)body.equipment.visible=false;
        this.protocolBodies.set(corpse.id, body);
      }
      body.victimId = corpse.victimId;
      body.root.position.set(corpse.x*SCALE,body.corpseGround??.3,corpse.y*SCALE);
      if(body.actions.Death)body.root.rotation.y=-Math.PI/2-(view.entities.find(e=>e.id===corpse.victimId)?.a||0);
      body.root.visible=(!powerOut||Math.hypot(corpse.x-camera.x,corpse.y-camera.y)<=2.2)&&!this.actors.get(corpse.victimId)?.root.visible;
    }
    for (const [id, body] of this.protocolBodies)
      if (!bodyIds.has(id)) {
        this.removeProtocolObject(body.root, true);
        this.protocolBodies.delete(id);
      }
    this.updateFootprints(protocol.bodies || []);
  }
  /** Clue: dark boot prints from a body along the attacker's first steps.
   * The view only carries trails for players who found that body. */
  updateFootprints(bodies) {
    if (!this.footprints) {
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, 0.07, 0.16, 0, Math.PI * 2);
      const geometry = new THREE.ShapeGeometry(shape, 10);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: "#4a3320", transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
      this.materials.add(material);
      this.geometries.set("protocol-footprint", geometry);
      this.footprints = new THREE.InstancedMesh(geometry, material, 160);
      this.footprints.count = 0;
      this.footprints.frustumCulled = false;
      this.footprints.userData.noRoomCull = true;
      this.scene.add(this.footprints);
    }
    const key = bodies.map((b) => `${b.id}:${b.trail?.length || 0}`).join("|");
    if (key === this.footprintKey) return;
    this.footprintKey = key;
    const dummy = new THREE.Object3D();
    let n = 0;
    for (const body of bodies) {
      const trail = body.trail || [];
      for (let i = 1; i < trail.length && n < 160; i++) {
        const a = trail[i - 1],
          b = trail[i],
          dx = (b.x - a.x) * SCALE,
          dz = (b.y - a.y) * SCALE,
          length = Math.hypot(dx, dz);
        if (length < 0.01) continue;
        const yaw = Math.atan2(dx, dz),
          side = [Math.cos(yaw), -Math.sin(yaw)];
        for (let d = 0.3; d < length && n < 160; d += 0.55) {
          const left = Math.floor(d / 0.55) % 2 ? 1 : -1;
          dummy.position.set(a.x * SCALE + (dx / length) * d + side[0] * 0.09 * left, 0.02, a.y * SCALE + (dz / length) * d + side[1] * 0.09 * left);
          dummy.rotation.set(0, yaw, 0);
          dummy.updateMatrix();
          this.footprints.setMatrixAt(n++, dummy.matrix);
        }
      }
    }
    this.footprints.count = n;
    this.footprints.instanceMatrix.needsUpdate = true;
  }
  hideCameraBody(camera) {
    // Takedown cleanup can restore actor visibility after updateActors. Enforce
    // first-person ownership again before drawing, including corpse models.
    const actor = this.actors.get(camera.id);
    if (actor) actor.root.visible = false;
    for (const body of this.protocolBodies.values())
      if (body.victimId === camera.id) body.root.visible = false;
  }
  /** The arena's daytime sky profile (SKIES), the default where none is set. */
  skyProfile() {
    return SKIES[this.g.arena?.mapId] || DEFAULT_SKY;
  }
  /** Day reads like late-afternoon sun; night swaps in a starry sky and
   * stronger glow so lamps and signs bloom. */
  updateCinematic(night, time) {
    if (this.daySky) {
      const sky = night ? this.night.sky : this.daySky;
      if (this.scene.background !== sky) {
        this.scene.background = sky;
        this.scene.backgroundBlurriness = night ? 0 : 0.015;
      }
    }
    if (!this.grade) return;
    const u = this.grade.uniforms;
    u.time.value = time % 100;
    // A subtle grade per arena (its sky profile) by day; one neutral grade
    // at night, where the lighting itself carries the difference.
    const sky = night ? DEFAULT_SKY : this.skyProfile();
    u.highlight.value.set(...sky.highlight);
    u.shadow.value.set(...sky.shadow);
    u.saturation.value = sky.saturation;
    u.vignette.value = .08;
    u.grain.value = .002;
    this.bloom.enabled = this.g.academy.preset === 'high';
    this.bloom.strength = .12;
    this.bloom.threshold = 1.35;
    this.bloom.radius = .35;
  }

  /** Rebuild the world when the arena moved to another map. */
  ensureWorld() {
    const g = this.g;
    if (this.mapKey === g.arena.mapId && this.loadedMap === !!this.soldier) return false;
    this.loadedMap = !!this.soldier;
    this.clearProtocolDynamic();
    for (const a of this.actors.values()) this.disposeActor(a);
    this.actors.clear();
    this.buildWorld();
    return true;
  }
  /** Build the next map and compile its shaders without blocking the page,
   * so a scene switch waits behind its loading screen instead of freezing
   * on the first draw. Resolves once the first frame can draw at once. */
  async prepareWorld() {
    if (this.disposed || this.contextUnavailable) return;
    this.configure();
    this.ensureWorld();
    this.rebuildWalls();
    if (!this.renderer.compileAsync) return;
    // Hidden overlays (the objective trail) are compiled too.
    const trail = (this.groundTrail ||= new GroundTrail(this)).root,
      shown = trail.visible;
    trail.visible = true;
    const compiling = this.renderer.compileAsync(this.scene, this.camera);
    trail.visible = shown;
    await compiling;
  }
  render() {
    if (this.disposed || this.contextUnavailable) return false;
    // The home lobby draws at a higher density (LobbyStage.present): put the
    // match's own render size back before the first match frame.
    if (this.lobbySized) {
      this.lobbySized = false;
      this.resize();
    }
    this.configure();
    const g = this.g,
      t = g.animationTime;
    this.ensureWorld();
    this.rebuildWalls();
    // Mission presentation needs 30Hz, whereas camera/actor root movement
    // stays full rate. Avoid rebuilding the deeply redacted recipient view
    // (hundreds of copied fields) on every 120Hz render.
    const rawProtocol = g.arena.protocol,
      projectionKey =
        g.mode === "protocol"
          ? `${rawProtocol.phase}:${rawProtocol.sabotage.powerUntil}:${rawProtocol.mission?.phase}:${rawProtocol.mission?.vehicle?.autopilot}:${rawProtocol.mission?.vehicle?.arrived}`
          : "none";
    if (
      this.frameProtocolArena !== g.arena ||
      this.frameProtocolKey !== projectionKey ||
      Math.abs(g.time - (this.frameProtocolTime ?? -1)) >= 1 / 30
    ) {
      this.frameProtocolArena = g.arena;
      this.frameProtocolKey = projectionKey;
      this.frameProtocolTime = g.time;
      this.frameProtocolView = g.mode === "protocol" ? g.protocolView?.() : null;
    }
    const p = g.camera(),
      pitch = g.cameraPitch,
      protocolView = this.frameProtocolView,
      seatedPilot =
        g.arena.mapId === "medevac" &&
        protocolView?.protocol?.mission?.vehicle?.pilotId === p.id;
    const now = performance.now(),
      dt = Math.min(0.1, (now - (this.lastRenderAt || now)) / 1000),
      // Eye height follows the stance (crouch, prone); a jump lifts it below.
      targetHeight = p.slideUntil > g.time ? 0.7 : p.crouching ? 1.17 : 1.65 + STANCE[stanceOf(p)].eye * SCALE;
    this.lastRenderAt = now;
    this.eyeHeight ??= 1.65;
    this.eyeHeight += (targetHeight - this.eyeHeight) * (1 - Math.exp(-dt * 18));
    const fall = this.motion.matches ? 0 : (g.deathProgress || 0) ** 2;
    this.camera.position.set(
      p.x * SCALE,
      g.deathSequence ? 1.65 - fall * 1.4 : this.eyeHeight + jumpLift(p, g.time) * SCALE,
      p.y * SCALE + (seatedPilot ? 0.85 : 0),
    );
    const motionScale = this.cameraMotionScale();
    this.camera.rotation.set(pitch - fall * 0.25 * motionScale, -p.a - Math.PI / 2, fall * 0.5 * motionScale, "YXZ");
    // Aiming down the sights: zoom in (more for long guns) and bring the gun
    // to the middle of the view. Aim math uses the look angle, not the FOV.
    this.adsBlend ??= 0;
    this.adsBlend += ((g.aiming ? 1 : 0) - this.adsBlend) * (this.motion.matches ? 1 : 1 - Math.exp(-dt * 14));
    if (this.adsBlend < 1e-3) this.adsBlend = 0;
    this.adsZoom = 1 - this.adsBlend * (1 - (ADS_ZOOM[this.weaponId] ?? 0.85));
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(g.verticalFov / 2) * this.adsZoom));
    if (Math.abs(this.camera.fov - fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    (this.hazards ||= new HazardDressing(this)).shake(this.camera, t);
    this.updateProtocol(protocolView, p);
    this.updateMedicalMission(protocolView?.protocol?.mission, t);
    const night = (this.night ||= new NightDressing(this)).update(protocolView, g.arena.mapId, t);
    this.updateCinematic(night, t);
    this.clouds.update(t, night, this.motion.matches);
    // Street lamps go out with the town's power (Blackout Protocol sabotage).
    this.canal?.update(t, this.motion.matches, night ? 1 : 0, g.arena.waterShockUntil > g.arena.time, floodLevel(g.arena), this.protocolPowerOut);
    this.landmarks?.update(t, this.motion.matches);
    if (g.mode === "protocol") (this.events ||= new EventDressing(this)).update(protocolView, t);
    updateNaturalLighting(this, protocolView, p, dt);
    const undim = g.mode !== "protocol" && (this.hazards ||= new HazardDressing(this)).dim();
    if (g.arena.mapId === "medevac" && motionScale > 0) {
      const heading = Number(protocolView?.protocol?.mission?.vehicle?.heading) || 0;
      this.camera.rotation.z = THREE.MathUtils.clamp(-heading * 0.055, -0.085, 0.085) * motionScale;
    }
    this.updateActors(t);
    const takedown = (this.takedown ||= new VictimTakedown(this)).update(g);
    (this.groundTrail ||= new GroundTrail(this)).update(protocolView, p, takedown, now);
    if (!takedown) this.hideCameraBody(p);
    this.camera.updateMatrixWorld(true);
    (this.worldVisibility ||= new WorldVisibility(this)).update(p, takedown ? 1 : pitch, now);
    (this.identification ||= new PlayerIdentification(this)).update(protocolView,p,takedown);
    // Mark only the publicly accused participant, within ordinary sight and
    // wall occlusion. This identifies combat's one opposing uniform without
    // revealing any secret role or leaving markers visible through walls.
    const marker = g.protocolUI?.combatMarker,
      battle = protocolView?.protocol?.phase === "combat" && protocolView.protocol.combat,
      accused = battle && g.arena.entities.find((e) => e.id === battle.targetId);
    if (marker) {
      let show =
        !takedown && !!accused &&
        accused.id !== p.id &&
        accused.hp > 0 &&
        Math.hypot(accused.x - p.x, accused.y - p.y) <= sightRange(protocolView.protocol, protocolView.time) &&
        g.arena.visible(p, accused);
      if (show) {
        const point = (this.markerPoint ||= new THREE.Vector3())
          .set(accused.x * SCALE, 2.06, accused.y * SCALE)
          .project(this.camera);
        show = point.z >= -1 && point.z <= 1 && Math.abs(point.x) < 1 && Math.abs(point.y) < 1;
        if (show) {
          marker.style.left = `${(point.x * 0.5 + 0.5) * 100}%`;
          marker.style.top = `${(-point.y * 0.5 + 0.5) * 100}%`;
          marker.textContent = accused.name;
        }
      }
      // The public accused highlight lives in the visible call sign. Retain
      // the old marker when names are disabled or its tighter framing hides it.
      marker.hidden = !show || (this.identification?.root.hidden === false && this.identification.labels.get(accused?.id)?.hidden === false);
    }
    this.updatePickups(t);
    this.updateFields();
    (this.hazards ||= new HazardDressing(this)).update(t);
    if (t < this.lastTime) {
      this.seenShots.clear();
      for (const tracer of this.tracers) {
        this.dynamic.remove(tracer.mesh);
      }
      this.tracers = [];
    }
    this.updateProjectiles(t);
    this.updateWeapon();
    const combat = protocolView?.protocol?.phase === "combat",
      // Kick: snaps back in the first ~20 ms, then settles with an ease-out
      // (a straight linear return read as a jolt). Visual only; firing and
      // aim are untouched.
      kickAge = (t - p.shotAt) / 0.16,
      recoil =
        g.mode === "protocol" && !combat ? 0 : !(kickAge >= 0 && kickAge < 1) ? 0 : kickAge < 0.12 ? kickAge / 0.12 : (1 - (kickAge - 0.12) / 0.88) ** 2,
      reload = Math.max(0, Math.min(1, (p.reloadUntil - t) / 1.4));
    // Reloads tilt the gun towards the camera (magazine well in view) rather
    // than dropping it out of frame, so the magazine change can be seen.
    const reloadTilt = reload > 0 ? Math.sin(reload * Math.PI) : 0;
    this.rig.position.y =
      -0.185 * Math.max(1, this.g.h / this.g.w) -
      (g.mode === "protocol" && !combat ? 0.075 : 0) -
      reloadTilt * 0.06 +
      (this.rigBase?.y || 0) +
      Math.sin(g.step) * 0.005 * motionScale;
    this.rig.position.y -= fall * 0.65;
    this.rig.position.z = (this.rigBase?.z || 0) + recoil * 0.04 + reloadTilt * 0.03;
    // Sights up: the gun slides toward the middle and rises a little.
    const ads = this.adsBlend || 0,
      sights = ADS_RIG[this.weaponId] || ADS_RIG.other;
    if (this.rigBase) this.rig.position.x = this.rigBase.x + (sights.x - this.rigBase.x) * ads;
    this.rig.position.y += ads * sights.y;
    // Sway: the gun lags a touch behind fast turns and settles (less in
    // the sights). Purely visual: the shot still goes where the camera looks.
    const turn = Math.atan2(Math.sin(p.a - (this.lastAim ?? p.a)), Math.cos(p.a - (this.lastAim ?? p.a)));
    this.lastAim = p.a;
    const swayTarget = dt > 0 ? THREE.MathUtils.clamp((turn / dt) * 0.012, -0.05, 0.05) * motionScale * (1 - ads * 0.7) : 0;
    this.sway = (this.sway || 0) + (swayTarget - (this.sway || 0)) * (1 - Math.exp(-dt * 12));
    this.rig.rotation.x = 0.02 - recoil * 0.075 + reloadTilt * 0.16;
    this.rig.rotation.y = (this.rigBase?.yaw ?? -0.07) * (1 - (this.adsBlend || 0)) + reloadTilt * 0.1 + this.sway;
    this.rig.position.x += this.sway * 0.12;
    this.rig.rotation.z = -0.025 + reloadTilt * 0.5;
    this.flash.intensity = recoil > 0.65 ? 3 : 0;
    animateCarbine(this.rig.userData.carbine,reload,recoil);
    this.rig.visible =
      (p.hp > 0 || (!!g.deathSequence && g.deathProgress < 0.65)) && !seatedPilot && !takedown;
    const outside =
      !["training", "protocol"].includes(g.mode) &&
      g.time > g.zone.delay &&
      (Math.abs(p.x - g.zone.cx) > g.zone.half || Math.abs(p.y - g.zone.cy) > g.zone.half);
    const sandstorm = g.mode === "protocol" && (protocolView?.protocol?.events || []).some((ev) => ev.kind === "sandstorm");
    // Last Signal disasters: sandstorm haze, or a dark storm lit by lightning.
    const weather = g.mode !== "protocol" && (this.hazards ||= new HazardDressing(this)).weather();
    this.scene.fog.color.set(
      sandstorm
        ? this.night?.active ? "#4a3f30" : "#b39a72"
        : this.night?.active
        ? "#121d2e"
        : outside
          ? "#9a2a22"
          : g.mode === "protocol" && g.arena.mapId === "breakwater"
            ? "#cdbb9c"
            : (PROFILES[g.arena.mapId] || PROFILES.outpost).fog,
    );
    // Electrical sabotage cannot change the weather or fill open air with
    // black fog. Interior darkness comes from unpowered fixtures and shelter.
    this.scene.fog.density = sandstorm
      ? this.naturalLighting?.inside ? 0.05 : 0.09
      : this.night?.active
      ? this.naturalLighting?.inside ? 0.01 : 0.026
      : outside
        ? HAZE_FOG_DENSITY
        : g.arena.mapId === "medevac" && !protocolView?.protocol?.mission?.vehicle?.arrived
          ? 0.002
          : 0.009;
    // Disasters blend in from the arena's own fog as they roll in.
    if (weather) {
      this.scene.fog.color.lerp((this.weatherFog ||= new THREE.Color()).set(weather.fog), weather.k);
      const density = this.naturalLighting?.inside ? weather.density * 0.55 : weather.density;
      this.scene.fog.density += (density - this.scene.fog.density) * weather.k;
    }
    // Blowing sand hides the sky too; the day sky returns next frame.
    if (sandstorm) this.scene.background = (this.sandSky ||= new THREE.Color()).copy(this.scene.fog.color);
    // A 30Hz shadow refresh matches visible skeletal animation. Reusing the
    // shadow texture between samples avoids a second full geometry pass at
    // 120Hz; camera and player movement continue on every animation frame.
    if (
      this.renderer.shadowMap.enabled &&
      (!this.lastShadowAt || now - this.lastShadowAt >= 1000 / 30)
    ) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastShadowAt = now;
    }
    this.renderer.info.reset();
    (this.telemetry ||= new RenderTelemetry(this.renderer)).begin();
    const preparing = protocolView?.protocol?.phase === "combat" && protocolView.time < protocolView.protocol.combat?.startsAt;
    const introduction = preparing && (this.battlePreparation ||= new BattlePreparation(this)).update(protocolView);
    if (!preparing && this.battlePreparation) this.battlePreparation.active = false;
    if (introduction) {
      this.identification.root.hidden = true;
      this.renderer.autoClear = true;
      this.renderer.render(this.battlePreparation.scene, this.battlePreparation.camera);
    } else if (!this.composer || g.academy.preset === "performance") {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.weaponScene, this.weaponCamera);
      this.renderer.autoClear = true;
    } else this.composer.render();
    if (undim) undim();
    this.telemetry.end();
    this.metrics={gpuMs:this.telemetry.gpuMs,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,...this.actorStats,...this.worldStats};
    this.takedown.restoreActors();
    if (!takedown) this.hideCameraBody(p);
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
  /** The home lobby (its own small scene) while the home menu is open. */
  /** Camera motion (Settings → Accessibility): 1 full, 0.4 reduced, 0 off.
   * System Reduce Motion is always off. Scales shake, sway, bob and roll. */
  cameraMotionScale() {
    if (this.motion.matches) return 0;
    const setting = this.g.cameraMotion;
    return setting === "off" ? 0 : setting === "reduced" ? 0.4 : 1;
  }
  renderLobby(now) {
    if (this.disposed || this.contextUnavailable || !this.soldier) return false;
    return (this.lobby ||= new LobbyStage(this)).render(now);
  }
  dispose() {
    this.lobby?.dispose();
    this.clouds?.dispose();
    if (this.disposed) return;
    this.disposed = true;
    this.telemetry?.dispose();
    this.groundTrail?.dispose();
    this.night?.dispose();
    this.events?.dispose();
    this.bloom?.dispose();
    this.identification?.dispose();
    this.takedown?.dispose();
    this.battlePreparation?.dispose();
    disposeRiggedHands(this.rig);
    for (const a of this.actors.values()) {
      a.mixer?.stopAllAction();
      a.model.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
    }
    this.clearProtocolDynamic();
    this.previewTarget?.dispose();
    this.composer?.dispose();
    for (const pass of this.composer?.passes || []) pass.dispose?.();
    this.clearWorld();
    for (const m of this.materials) m.dispose();
    for (const geo of this.geometries.values()) geo.dispose();
    for (const t of this.textures) t.dispose();
    if (this.soldier) this.disposeObject(this.soldier.scene);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.contextLost);
    this.renderer.domElement.removeEventListener("webglcontextrestored", this.contextRestored);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.actors.clear();
    this.materials.clear();
    this.textures.clear();
    this.weaponTextures.clear();
  }
}
