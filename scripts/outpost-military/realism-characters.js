// @ts-nocheck
/** Authored character materials and distance-driven skeletal presentation. */
import * as THREE from "three";

const TARGET_HEIGHT = 1.82;
const TILE_METRES = 3;
const characterState = new WeakMap();
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.lerp;

function materialKind(material) {
  const name = (material.name || "").toLowerCase();
  if (/visor|lens|glass/.test(name)) return "visor";
  if (/skin|face/.test(name)) return "skin";
  if (/steel|chrome|metal/.test(name)) return "metal";
  return "uniform";
}

function configureMaterial(material, kind) {
  // Retain the original atlas, its UVs, stitching, chipped paint and insignia.
  // The Vanguard body is a single material mixing cloth and painted plates;
  // it has no exposed skin atlas and cannot become a different sculpt here.
  material.color.setRGB(0.93, 0.93, 0.93);
  material.emissive?.setRGB(0, 0, 0);
  material.metalness = kind === "metal" ? 0.65 : 0;
  material.roughness = kind === "visor" ? 0.28 : kind === "skin" ? 0.65 : 0.84;
  material.envMapIntensity = kind === "visor" ? 0.75 : 0.65;
  material.normalScale?.set(kind === "visor" ? 0.4 : 0.72, kind === "visor" ? 0.4 : 0.72);
  material.userData.realismCharacterKind = kind;
  material.onBeforeCompile = () => {};
  material.customProgramCacheKey = () => `outpost-authored-character-${kind}-v1`;
  if (kind === "uniform") {
    material.onBeforeCompile = (shader) => {
      // Conservative atlas-specific material inference: warm painted plates
      // and olive cloth remain dielectric; only cool exposed fixtures reflect
      // as metal. Albedo is preserved, not replaced by a gray/color ramp.
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
         float characterLuma = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
         float characterWarm = smoothstep(.015,.07,diffuseColor.r-diffuseColor.b);
         float characterSteel = smoothstep(.008,.04,diffuseColor.b-diffuseColor.r)
           * smoothstep(.035,.10,characterLuma) * (1.-characterWarm);
         float characterDark = 1.-smoothstep(.008,.055,characterLuma);
         roughnessFactor = mix(mix(.88,.76,characterWarm),.48,characterSteel);
         roughnessFactor = mix(roughnessFactor,.94,characterDark);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
         metalnessFactor = characterSteel*.62;`,
      );
    };
  }
  material.needsUpdate = true;
}

/** Prepare shared source resources once; every role uses the same uniform. */
export function prepareCharacterAsset(r, gltf) {
  const materials = new Set();
  const textures = new Set();
  const anisotropy = Math.min(8, r.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      configureMaterial(material, materialKind(material));
      r.materials.add(material);
      for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) {
        const texture = material[key];
        if (!texture || textures.has(texture)) continue;
        textures.add(texture);
        texture.colorSpace = key === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
        r.textures.add(texture);
      }
    }
  });
  gltf.realismCharacterProfile = measureStride(gltf);
  r.characterProfile = gltf.realismCharacterProfile;
}

function bone(model, suffix) {
  let found = null;
  model.traverse((object) => {
    if (object.isBone && object.name.replace(/[^a-z]/gi, "").endsWith(suffix)) found = object;
  });
  return found;
}

function measureStride(gltf) {
  const model = gltf.scene;
  const mixer = new THREE.AnimationMixer(model);
  const idle = gltf.animations.find((clip) => clip.name === "Idle");
  if (idle) mixer.clipAction(idle).play();
  mixer.update(0);
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (object.isSkinnedMesh) {
      object.skeleton.update();
      object.computeBoundingBox();
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  const scale = TARGET_HEIGHT / Math.max(0.1, box.max.y - box.min.y);
  const foot = bone(model, "RightFoot");
  const point = new THREE.Vector3();
  const profile = { Walk: 1.45, Run: 2.25 };
  if (foot)
    for (const name of ["Walk", "Run"]) {
      const clip = gltf.animations.find((clip) => clip.name === name);
      if (!clip) continue;
      mixer.stopAllAction();
      mixer.clipAction(clip).play();
      const positions = [],
        velocities = [];
      let minY = Infinity;
      for (let i = 0; i <= 48; i++) {
        mixer.setTime((clip.duration * i) / 48);
        model.updateMatrixWorld(true);
        foot.getWorldPosition(point);
        positions.push({ x: point.x, y: point.y, z: point.z });
        minY = Math.min(minY, point.y);
      }
      for (let i = 1; i < positions.length; i++) {
        const a = positions[i - 1],
          b = positions[i];
        if (Math.max(a.y, b.y) < minY + 0.025) {
          const speed = Math.hypot(b.x - a.x, b.z - a.z) / (clip.duration / 48);
          if (speed > 0.1) velocities.push(speed);
        }
      }
      velocities.sort((a, b) => a - b);
      if (velocities.length)
        profile[name] = clamp(
          velocities[Math.floor(velocities.length / 2)] * clip.duration * scale,
          0.8,
          3.4,
        );
    }
  mixer.stopAllAction();
  if (idle) {
    mixer.clipAction(idle).play();
    mixer.update(0);
  }
  model.updateMatrixWorld(true);
  mixer.uncacheRoot(model);
  return profile;
}

function makeLeg(model, side) {
  const hip = bone(model, `${side}UpLeg`),
    knee = bone(model, `${side}Leg`),
    foot = bone(model, `${side}Foot`);
  if (!hip || !knee || !foot) return null;
  const leg = {
    hip,
    knee,
    foot,
    planted: false,
    plantAge: 0,
    anchor: new THREE.Vector3(),
    hipPoint: new THREE.Vector3(),
    kneePoint: new THREE.Vector3(),
    footPoint: new THREE.Vector3(),
    target: new THREE.Vector3(),
    ikTarget: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    bend: new THREE.Vector3(),
    wantedKnee: new THREE.Vector3(),
    current: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    parentRotation: new THREE.Quaternion(),
    rotation: new THREE.Quaternion(),
    worldRotation: new THREE.Quaternion(),
    footRotation: new THREE.Quaternion(),
  };
  foot.getWorldPosition(leg.footPoint);
  leg.contactHeight = leg.footPoint.y;
  return leg;
}

/** Clone only actor-owned materials; geometry/textures stay shared resources. */
export function finishActor(r, model, e) {
  const clones = new Map();
  model.traverse((object) => {
    if (!object.isMesh) return;
    const copy = (source) => {
      if (!clones.has(source)) {
        const material = source.clone();
        configureMaterial(material, source.userData.realismCharacterKind || materialKind(source));
        r.materials.add(material);
        clones.set(source, material);
      }
      return clones.get(source);
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(copy)
      : copy(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
  });
  model.updateMatrixWorld(true);
  const state = {
    previousX: e.x,
    previousY: e.y,
    distance: 0,
    signedDistance: 0,
    lastSample: null,
    speed: 0,
    baseY: model.position.y,
    previousYaw: null,
    legs: [makeLeg(model, "Left"), makeLeg(model, "Right")].filter(Boolean),
  };
  characterState.set(model, state);
  return state;
}

function rotateToward(leg, joint, endpoint, desired) {
  joint.getWorldPosition(leg.current);
  endpoint.getWorldPosition(leg.desired);
  leg.desired.sub(leg.current).normalize();
  leg.current.copy(desired).sub(joint.getWorldPosition(leg.target)).normalize();
  leg.rotation.setFromUnitVectors(leg.desired, leg.current);
  joint.getWorldQuaternion(leg.worldRotation);
  leg.worldRotation.premultiply(leg.rotation);
  joint.parent.getWorldQuaternion(leg.parentRotation).invert();
  joint.quaternion.copy(leg.parentRotation).multiply(leg.worldRotation);
}

function plantFoot(model, leg, ground, dt, moving, reset) {
  leg.hip.getWorldPosition(leg.hipPoint);
  leg.knee.getWorldPosition(leg.kneePoint);
  leg.foot.getWorldPosition(leg.footPoint);
  const contact = leg.footPoint.y <= ground + leg.contactHeight + 0.028;
  if (reset || !moving || !contact) {
    leg.planted = false;
    return;
  }
  if (!leg.planted) {
    leg.anchor.copy(leg.footPoint);
    leg.anchor.y = ground + leg.contactHeight;
    leg.planted = true;
    leg.plantAge = 0;
  }
  leg.plantAge += dt;
  if (leg.plantAge > 0.55 || leg.footPoint.distanceTo(leg.anchor) > 0.2) {
    leg.planted = false;
    return;
  }
  // Preserve authored knee articulation, correcting only short stance drift.
  leg.target.copy(leg.anchor).sub(leg.footPoint).clampLength(0, 0.09).add(leg.footPoint);
  const upper = leg.hipPoint.distanceTo(leg.kneePoint),
    lower = leg.kneePoint.distanceTo(leg.footPoint);
  const reach = clamp(
    leg.hipPoint.distanceTo(leg.target),
    Math.abs(upper - lower) + 0.001,
    upper + lower - 0.001,
  );
  leg.direction.copy(leg.target).sub(leg.hipPoint).normalize();
  leg.bend.copy(leg.kneePoint).sub(leg.hipPoint);
  leg.bend.addScaledVector(leg.direction, -leg.bend.dot(leg.direction));
  if (leg.bend.lengthSq() < 0.000001) {
    leg.planted = false;
    return;
  }
  leg.bend.normalize();
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const rise = Math.sqrt(Math.max(0, upper * upper - along * along));
  leg.wantedKnee
    .copy(leg.hipPoint)
    .addScaledVector(leg.direction, along)
    .addScaledVector(leg.bend, rise);
  leg.foot.getWorldQuaternion(leg.footRotation);
  // Cache the target because rotateToward uses shared working vectors.
  leg.ikTarget.copy(leg.target);
  rotateToward(leg, leg.hip, leg.knee, leg.wantedKnee);
  model.updateMatrixWorld(true);
  rotateToward(leg, leg.knee, leg.foot, leg.ikTarget);
  model.updateMatrixWorld(true);
  leg.foot.parent.getWorldQuaternion(leg.parentRotation).invert();
  leg.foot.quaternion.copy(leg.parentRotation).multiply(leg.footRotation);
}

/** Called every render; only skeletal changes occur on the 30 FPS sample. */
export function updateActorPresentation(r, actor, e, delta, sample) {
  const state = characterState.get(actor.model);
  if (!state || !actor.mixer) return false;
  const dx = e.x - state.previousX,
    dy = e.y - state.previousY;
  const travelled = Math.hypot(dx, dy) * TILE_METRES;
  state.previousX = e.x;
  state.previousY = e.y;
  const teleport = travelled > 3;
  if (!teleport) {
    state.distance += travelled;
    state.signedDistance += (dx * Math.cos(e.a || 0) + dy * Math.sin(e.a || 0)) * TILE_METRES;
  } else for (const leg of state.legs) leg.planted = false;
  if (state.lastSample === sample) return false;
  const dt = state.lastSample === null ? 0 : clamp(sample - state.lastSample, 0, 0.1);
  state.lastSample = sample;
  actor.lastSample = sample;
  const speed = dt > 0 ? state.distance / dt : 0;
  state.speed = smooth(state.speed, speed, 0.6);
  const reduced = r.motion?.matches;
  const moving = !reduced && state.speed > 0.15 && e.hp > 0 && !(e.slideUntil > r.g.time);
  const backward = state.signedDistance < -state.distance * 0.35;
  const next = moving ? (state.speed > 2.5 && !backward ? "Run" : "Walk") : "Idle";
  if (next !== actor.action) {
    actor.actions[actor.action]?.fadeOut(0.15);
    actor.actions[next]?.reset().fadeIn(0.15).play();
    actor.action = next;
  }
  const action = actor.actions[next];
  if (action) {
    const duration = action.getClip().duration;
    const loopDistance = r.characterProfile?.[next] || (next === "Run" ? 2.25 : 1.45);
    action.setEffectiveTimeScale(
      moving ? (backward ? -1 : 1) * clamp((speed * duration) / loopDistance, 0.25, 3) : 1,
    );
  }
  state.distance = 0;
  state.signedDistance = 0;
  actor.mixer.update(dt);
  actor.model.updateMatrixWorld(true);
  const yaw = actor.root.rotation.y;
  const turned =
    state.previousYaw !== null &&
    Math.abs(Math.atan2(Math.sin(yaw - state.previousYaw), Math.cos(yaw - state.previousYaw))) >
      0.2;
  state.previousYaw = yaw;
  if (!reduced && r.g.academy.preset !== "performance")
    for (const leg of state.legs)
      plantFoot(
        actor.model,
        leg,
        actor.root.position.y,
        dt,
        moving,
        teleport || turned || actor.root.position.y > 0.05,
      );
  else for (const leg of state.legs) leg.planted = false;
  actor.model.updateMatrixWorld(true);
  return true;
}
