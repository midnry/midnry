// @ts-nocheck
/** Authored character materials and distance-driven skeletal presentation. */
import * as THREE from "three";
import { ASSET_CACHE } from "../../public/games/outpost-asset-manifest.js";

const TARGET_HEIGHT = 1.82;
const TILE_METRES = 3;
const characterState = new WeakMap();
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.lerp;

function materialKind(material) {
  const name = (material.name || "").toLowerCase();
  if (/visor|lens|glass/.test(name)) return "visor";
  if (/skin|face|head/.test(name)) return "skin";
  if (/steel|chrome|metal/.test(name)) return "metal";
  return "uniform";
}

function configureMaterial(material, kind, r) {
  if (material.userData.riggedOperator) {
    material.userData.realismCharacterKind = kind;
    // Head 1 is the helmet/goggles and uses the body atlas. Head 2 is skin.
    // Preserve material names: /uniform|fabric/ is the gameplay dye contract.
    const skin = material.name === "Operator head 2";
    const response = skin ? r?.operatorResponse?.skin : r?.operatorResponse?.body;
    material.metalness = skin || !response ? 0 : 1;
    material.roughness = response ? 1 : skin ? 0.76 : 0.93;
    material.roughnessMap = response || null;
    material.metalnessMap = response && !skin ? response : null;
    const normal = response ? (skin ? 0.3 : 0.45) : 0.55;
    material.normalScale?.set(normal, normal);
    material.envMapIntensity = 0.35;
    material.needsUpdate = true;
    return;
  }
  if (material.userData.operatorMaterial) {
    material.userData.realismCharacterKind = kind;
    const fabric = r?.realismSurfaces?.fabric;
    if (material.name === "Scanned skin" && r?.faceColor) {
      material.map = r.faceColor;
      material.normalMap = r.faceNormal;
      material.roughnessMap = r.faceRough;
      material.normalScale = new THREE.Vector2(0.3, 0.3);
      material.roughness = 0.85;
    }
    if (/fabric|webbing/i.test(material.name) && fabric) {
      material.map = fabric.color;
      material.normalMap = fabric.normal;
      material.roughnessMap = fabric.roughness;
      material.normalScale = new THREE.Vector2(0.16, 0.16);
      material.roughness = 0.93;
      material.metalness = 0;
      // The source photograph is blue denim. Preserve its photographed weave
      // and seams without multiplying blue albedo into the khaki uniform. The
      // bounded luminance response represents the dyed cloth's actual albedo,
      // rather than changing scene exposure or adding a screen-space filter.
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
             vec4 clothPhoto = texture2D(map, vMapUv);
             float clothLuma = dot(clothPhoto.rgb, vec3(.2126,.7152,.0722));
             float clothResponse = clamp(clothLuma / .19, .60, 1.12);
             diffuseColor.rgb *= vec3(clothResponse);
             diffuseColor.a *= clothPhoto.a;
           #endif`,
        );
      };
      material.customProgramCacheKey = () => "outpost-photographed-khaki-v2";
    }
    material.envMapIntensity = /metal/i.test(material.name) ? 0.8 : 0.45;
    material.needsUpdate = true;
    return;
  }
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

/** Two small data maps, shared by all LODs/instances. The original colour and
 * normal atlases, silhouette, bones, eyewear fit and dye shader stay intact. */
export async function loadOperatorResponse(r) {
  const loader = new THREE.TextureLoader();
  r.operatorResponse = {};
  await Promise.all(
    [
      ["body", "body-orm"],
      ["skin", "skin-roughness"],
    ].map(async ([key, file]) => {
      const path = `textures/benchmark-operator-${file}.png`;
      try {
        const map = await loader.loadAsync(`/games/military/${path}?assetVersion=${ASSET_CACHE}`);
        if (r.disposed) {
          map.dispose();
          return;
        }
        map.colorSpace = THREE.NoColorSpace;
        map.flipY = false;
        map.anisotropy = Math.min(8, r.renderer.capabilities.getMaxAnisotropy());
        map.minFilter = THREE.LinearMipmapLinearFilter;
        map.generateMipmaps = true;
        r.textures.add(map);
        r.operatorResponse[key] = map;
      } catch (error) {
        if (r.disposed) return;
        // Optional polish must never enter assetErrors: the page intentionally
        // treats that list as fatal, even when the loader promise resolves.
        r.optionalAssetWarnings ||= [];
        r.optionalAssetWarnings.push(path);
        console.warn(
          "[Outpost] Optional operator response map unavailable; using original materials:",
          path,
          error,
        );
      }
    }),
  );
}

/** Prepare shared source resources once; every role uses the same uniform. */
export function prepareCharacterAsset(r, gltf) {
  gltf.scene.traverse((o) => {
    if (o.userData.riggedOperator) gltf.scene.userData.riggedOperator = true;
  });
  const materials = new Set();
  const textures = new Set();
  const anisotropy = Math.min(8, r.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    if (object.userData.operatorLOD === 1) object.visible = false;
    object.castShadow = true;
    object.receiveShadow = true;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      configureMaterial(
        material,
        material.userData.realismCharacterKind || materialKind(material),
        r,
      );
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
    if (object.isBone && object.name.replace(/[^a-z0-9]/gi, "").endsWith(suffix)) found = object;
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
  // glTF material primitives share bones. SkeletonUtils clones each primitive's
  // palette; reunite identical palettes so the renderer uploads one per actor,
  // without merging away separate materials or changing any bind transforms.
  const palettes = [];
  model.traverse((object) => {
    if (!object.isSkinnedMesh) return;
    const current = object.skeleton;
    const shared = palettes.find(
      (s) =>
        s.bones.length === current.bones.length &&
        s.bones.every(
          (bone, i) =>
            bone === current.bones[i] &&
            s.boneInverses[i].elements.every(
              (v, k) => Math.abs(v - current.boneInverses[i].elements[k]) < 1e-8,
            ),
        ),
    );
    if (shared && shared !== current) {
      current.dispose();
      object.skeleton = shared;
    } else if (!shared) palettes.push(current);
  });
  const clones = new Map();
  model.traverse((object) => {
    if (!object.isMesh) return;
    const copy = (source) => {
      if (!clones.has(source)) {
        const material = source.clone();
        configureMaterial(
          material,
          source.userData.realismCharacterKind || materialKind(source),
          r,
        );
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
    head: bone(model, "Head"),
    spine: bone(model, "Spine1"),
    hip: bone(model, "Hips"),
    leftKnee: bone(model, "LeftLeg"),
    rightKnee: bone(model, "RightLeg"),
    rightArm: bone(model, "RightArm"),
    leftArm: bone(model, "LeftArm"),
    rightElbow: bone(model, "RightForeArm"),
    leftElbow: bone(model, "LeftForeArm"),
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
  if (e.hp <= 0) return updateDeathPose(r, actor, state);
  if (state.capturedDeath) {
    actor.actions.Death.stop();
    state.capturedDeath = false;
    state.deadSample = null;
    actor.deathAnimated = false;
    actor.action = "";
    actor.actions.Idle.reset().setEffectiveWeight(1).play();
  }
  state.deathPose = null;
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
  const capturedCrouch = (e.crouching || e.slideUntil > r.g.time) && actor.actions.Crouch;
  // The bundled Walk and BackWalk clips are broken (a flying kick and a fall),
  // so every gait plays Run, slowed to the actual speed and reversed backwards.
  const next = capturedCrouch ? "Crouch" : moving ? "Run" : "Idle";
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
      moving && !capturedCrouch
        ? (backward ? -1 : 1) * clamp((speed * duration) / loopDistance, 0.25, 3)
        : 1,
    );
  }
  state.distance = 0;
  state.signedDistance = 0;
  const reloading = e.reloadUntil > r.g.time;
  if (actor.actions.Reload) {
    const layer = actor.actions.Reload;
    state.reloadWeight = smooth(state.reloadWeight || 0, reloading ? 1 : 0, 1 - Math.exp(-dt * 20));
    layer.enabled = true;
    layer.setEffectiveWeight(state.reloadWeight).setEffectiveTimeScale(0).play();
    if (reloading)
      layer.time = clamp(1 - (e.reloadUntil - r.g.time) / 1.4, 0, 1) * layer.getClip().duration;
  }
  if (actor.actions.Hit) {
    const layer = actor.actions.Hit,
      elapsed = r.g.time - (e.hit ?? -100);
    layer.enabled = true;
    layer
      .setEffectiveTimeScale(0)
      .setEffectiveWeight(
        elapsed >= 0 && elapsed < 0.35 ? Math.sin((elapsed / 0.35) * Math.PI) * 0.45 : 0,
      )
      .play();
    layer.time = clamp(elapsed / 0.35, 0, 1) * layer.getClip().duration;
  }
  actor.mixer.update(dt);
  const sliding = e.slideUntil > r.g.time,
    crouching = sliding || e.crouching;
  actor.model.position.y =
    state.baseY - (capturedCrouch ? 0 : sliding ? 0.45 : crouching ? 0.28 : 0);
  if (crouching && !capturedCrouch) {
    if (state.hip) state.hip.rotation.x += 0.22;
    if (state.leftKnee) state.leftKnee.rotation.x -= 0.7;
    if (state.rightKnee) state.rightKnee.rotation.x -= 0.65;
    if (state.spine) state.spine.rotation.x += 0.22;
  }
  const aim = clamp(Math.atan(e.pitch || 0), -0.65, 0.65),
    hit = Math.max(0, 1 - (r.g.time - e.hit) / 0.24);
  if (state.head) state.head.rotation.x += aim * 0.65;
  if (state.spine) {
    state.spine.rotation.x += aim * 0.22;
    state.spine.rotation.z += hit * 0.06;
  }
  const firing = r.g.time - e.shotAt < 0.16;
  if ((firing || reloading) && !actor.actions.Reload) {
    if (state.rightArm) state.rightArm.rotation.z -= 0.3;
    if (state.leftArm) state.leftArm.rotation.z += 0.28;
    if (state.rightElbow) state.rightElbow.rotation.x += 0.35;
    if (state.leftElbow) state.leftElbow.rotation.x += reloading ? 0.75 : 0.45;
  }
  actor.model.updateMatrixWorld(true);
  const yaw = actor.root.rotation.y;
  const turned =
    state.previousYaw !== null &&
    Math.abs(Math.atan2(Math.sin(yaw - state.previousYaw), Math.cos(yaw - state.previousYaw))) >
      0.2;
  state.previousYaw = yaw;
  if (!reduced)
    for (const leg of state.legs)
      plantFoot(
        actor.model,
        leg,
        actor.root.position.y,
        dt,
        moving,
        teleport || turned || crouching || actor.root.position.y > 0.05,
      );
  else for (const leg of state.legs) leg.planted = false;
  actor.model.updateMatrixWorld(true);
  return true;
}

/** A real dead pose is independent of mission time, which pauses offline.
 * Play a fully weighted captured fall, or bend a fully weighted idle fallback:
 * faded-out clips must never leave a corpse in its bind/T pose. No corpse IK.
 */
function updateDeathPose(r, actor, state) {
  const now = performance.now() / 1000,
    sample = Math.floor(now * 30);
  if (actor.actions.Death) {
    if (!state.capturedDeath) {
      actor.mixer.stopAllAction();
      state.capturedDeath = true;
      actor.actions.Death.reset().setEffectiveWeight(1).setEffectiveTimeScale(0).play();
      actor.action = "Dead";
      actor.deathAnimated = true;
      for (const leg of state.legs) leg.planted = false;
    }
    if (state.deadSample === sample) return false;
    state.deadSample = sample;
    const progress = r.motion?.matches ? 1 : clamp((now - (actor.deadAt ?? now)) / 0.85, 0, 1);
    actor.actions.Death.time = progress * actor.actions.Death.getClip().duration;
    actor.mixer.update(0);
    actor.model.position.y = state.baseY;
    actor.model.updateMatrixWorld(true);
    return true;
  }
  if (!state.deathPose) {
    actor.model.position.y = state.baseY;
    actor.mixer.stopAllAction();
    const idle = actor.actions.Idle;
    if (idle) {
      idle.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
      actor.mixer.update(0);
    }
    actor.action = "Dead";
    state.deathPose = [
      ["Spine", 0.22, 0, 0],
      ["Spine1", 0.18, 0, -0.12],
      ["Head", 0.25, 0.12, -0.1],
      ["LeftForeArm", 0.42, 0, 0.18],
      ["RightForeArm", 0.5, 0, -0.15],
      ["LeftUpLeg", 0.28, 0, 0.09],
      ["RightUpLeg", -0.1, 0, -0.08],
      ["LeftLeg", -0.48, 0, 0],
      ["RightLeg", -0.26, 0, 0],
    ]
      .map(([name, x, y, z]) => {
        const joint = bone(actor.model, name);
        return joint
          ? {
              joint,
              base: joint.quaternion.clone(),
              offset: new THREE.Euler(x, y, z),
              rotation: new THREE.Quaternion(),
            }
          : null;
      })
      .filter(Boolean);
    for (const leg of state.legs) leg.planted = false;
    state.deadSample = null;
  }
  if (state.deadSample === sample) return false;
  state.deadSample = sample;
  const progress = r.motion?.matches ? 1 : clamp((now - (actor.deadAt ?? now)) / 0.85, 0, 1);
  for (const pose of state.deathPose) {
    pose.rotation.setFromEuler(
      new THREE.Euler(pose.offset.x * progress, pose.offset.y * progress, pose.offset.z * progress),
    );
    pose.joint.quaternion.copy(pose.base).multiply(pose.rotation);
  }
  actor.model.updateMatrixWorld(true);
  return true;
}
