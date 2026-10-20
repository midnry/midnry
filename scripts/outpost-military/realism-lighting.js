/** Natural source lighting shared by the world and first-person equipment. */
import * as THREE from "three";
import { roofRoomAt } from "./architecture.js";
import { isAppleTouchDevice } from "./compatibility.js";

const SCALE = 3;

// Exponential adaptation stays consistent at 60/120Hz. A suspended tab cannot
// turn a gradual doorway transition into a sudden flash on its next frame.
export function lightingBlend(dt, initialized = true) {
  return initialized ? 1 - Math.exp(-Math.max(0, Math.min(0.1, dt || 0)) / 0.32) : 1;
}

export function initNaturalLighting(r) {
  if (r.naturalLighting) return;
  // A cached diffuse room probe approximates first-bounce illumination from
  // matte walls and ceiling fixtures. It adds no shadow/render camera passes.
  r.roomBounce = new THREE.LightProbe(new THREE.SphericalHarmonics3(), 1);
  r.scene.add(r.roomBounce);
  r.bakedRoomProbes = new Map();
  let weaponKey = null,
    weaponSky = null;
  for (const light of r.weaponScene.children) {
    if (light.isDirectionalLight && !weaponKey) weaponKey = light;
    if (light.isHemisphereLight && !weaponSky) weaponSky = light;
  }
  r.naturalLighting = {
    direction: new THREE.Vector3(-0.58, 0.68, -0.45).normalize(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    focus: new THREE.Vector3(),
    localDirection: new THREE.Vector3(),
    weaponKey,
    weaponSky,
    fixtureIndices: new Int32Array(r.protocolLights.length),
    fixtureDistances: new Float64Array(r.protocolLights.length),
    environment: null,
    metadata: null,
    decorRooms: null,
    rooms: [],
    roomId: null,
    inside: false,
    powerOut: false,
    span: 0,
    initialized: false,
    activeFixtures: new Int32Array(r.protocolLights.length).fill(-1),
    desiredFixtures: new Int32Array(r.protocolLights.length).fill(-1),
    assignedFixtures: new Uint8Array(r.protocolLights.length),
  };
  // A second, unrelated cool directional light is not a physical rim source.
  // Sky reflections still give silhouettes and metal their natural edge light.
  r.rim.intensity = 0;
  r.rim.visible = false;
  r.sun.color.set("#fff4df");
  r.hemisphere.color.set("#cad9e1");
  r.hemisphere.groundColor.set("#746c5c");
  // Phone GPUs (iPhone in particular) keep less shadow-depth precision, so
  // the default offsets left fine "shadow acne" stripes shimmering on flat
  // faces such as supply crates. Touch devices get a larger offset.
  const touch =
    (typeof navigator !== "undefined" && isAppleTouchDevice(navigator)) ||
    !!globalThis.matchMedia?.("(pointer: coarse)").matches;
  r.sun.shadow.bias = touch ? -0.0006 : -0.00012;
  r.sun.shadow.normalBias = touch ? 0.04 : 0.018;
  r.sun.shadow.radius = 1.5;
  r.renderer.toneMappingExposure = 0.92;
}

function calibrateEnvironment(r, state) {
  const environment = r.scene.environment;
  if (!environment || state.environment === environment) return;
  state.environment = environment;
  const image = environment.image,
    data = image?.data;
  if (!data || !image.width || !image.height) return;
  const half = environment.type === THREE.HalfFloatType;
  let brightest = 0,
    bestX = -1,
    bestY = -1;
  const stepX = Math.max(1, Math.floor(image.width / 96)),
    stepY = Math.max(1, Math.floor(image.height / 48));
  // Calibrate once from the existing linear HDR. Restrict the search to the
  // upper sky so a bright building or ground reflection cannot become a sun.
  for (let y = 0; y < image.height; y += stepY) {
    const v = environment.flipY ? 1 - (y + 0.5) / image.height : (y + 0.5) / image.height;
    const elevation = (v - 0.5) * Math.PI;
    if (elevation < 0.24 || elevation > 1.3) continue;
    for (let x = 0; x < image.width; x += stepX) {
      const index = (y * image.width + x) * 4;
      const red = half ? THREE.DataUtils.fromHalfFloat(data[index]) : data[index],
        green = half ? THREE.DataUtils.fromHalfFloat(data[index + 1]) : data[index + 1],
        blue = half ? THREE.DataUtils.fromHalfFloat(data[index + 2]) : data[index + 2];
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (Number.isFinite(luminance) && luminance > brightest) {
        brightest = luminance;
        bestX = x;
        bestY = y;
      }
    }
  }
  if (bestX < 0) return;
  const azimuth = ((bestX + 0.5) / image.width - 0.5) * Math.PI * 2,
    v = environment.flipY ? 1 - (bestY + 0.5) / image.height : (bestY + 0.5) / image.height,
    elevation = (v - 0.5) * Math.PI;
  state.direction.set(
    Math.cos(elevation) * Math.cos(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.sin(azimuth),
  );
}

export function updateNaturalLighting(r, protocolView, camera, dt = 1 / 60) {
  if (!r.naturalLighting) initNaturalLighting(r);
  const state = r.naturalLighting,
    options = r.g.academy.options,
    protocol = protocolView?.protocol,
    metadata = r.g.mode === "protocol" ? r.protocolMetadata?.() : null,
    decorRooms = r.realismDecor?.rooms,
    x = Number(camera?.x) * SCALE,
    z = Number(camera?.y) * SCALE;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  calibrateEnvironment(r, state);
  if (state.metadata !== metadata || state.decorRooms !== decorRooms) {
    state.metadata = metadata;
    state.decorRooms = decorRooms;
    state.rooms = [];
    for (const room of metadata?.rooms || []) state.rooms.push(room);
    for (const room of metadata?.corridors || []) state.rooms.push(room);
    for (const room of decorRooms || []) state.rooms.push(room);
  }
  let room = roofRoomAt(metadata, camera.x, camera.y);
  for (const candidate of state.rooms) {
    if (room) break;
    if (
      candidate.roofed !== false &&
      camera.x >= candidate.x &&
      camera.x < candidate.x + candidate.w &&
      camera.y >= candidate.y &&
      camera.y < candidate.y + candidate.h
    ) {
      room = candidate;
      break;
    }
  }
  const inside = !!room,
    powerOut = r.g.mode === "protocol" && Number(protocol?.sabotage?.powerUntil) > r.g.time,
    lighting = !!options.lighting,
    arrived = !!protocol?.mission?.vehicle?.arrived,
    // Night shift: moonlight outside, warm fixtures and lamp posts do the work.
    night = !!r.night?.active;
  state.inside = inside;
  state.roomId = room?.id || null;
  state.powerOut = powerOut;
  const blend = lightingBlend(dt, state.initialized);
  const adapt = (object, key, target) => {
    object[key] = state.initialized ? object[key] + (target - object[key]) * blend : target;
  };
  const probeKey = `${r.g.arena.mapId}:${room?.id || "outside"}`;
  let probe = r.bakedRoomProbes.get(probeKey);
  if (!probe) {
    probe = new THREE.SphericalHarmonics3();
    if (room) {
      const wall = new THREE.Color(r.g.arena.mapId === "medevac" ? "#b6bebc" : "#b7ad96");
      // Larger rooms lose more fixture energy to distance; wall albedo sets
      // the colour of the bounce instead of a universal white ambient boost.
      const energy = 0.17 / Math.sqrt(Math.max(1, (room.w * room.h) / 10));
      probe.coefficients[0].set(wall.r, wall.g, wall.b).multiplyScalar(energy);
      probe.coefficients[1].copy(probe.coefficients[0]).multiplyScalar(0.22);
    }
    r.bakedRoomProbes.set(probeKey, probe);
  }
  for (let i = 0; i < 9; i++) r.roomBounce.sh.coefficients[i].lerp(probe.coefficients[i], blend);
  adapt(r.roomBounce, "intensity", powerOut ? 0.06 : night ? (inside ? 0.85 : 0.2) : 1);
  r.sun.color.set(night ? "#9fb6e2" : "#ffeccf");
  r.hemisphere.color.set(night ? "#2e4468" : "#cad9e1");
  r.hemisphere.groundColor.set(night ? "#1d1914" : "#746c5c");
  r.rim.visible = false;
  r.rim.intensity = 0;
  // The sun remains outside a roofed room. Roofs and walls occlude it rather
  // than replacing it with arbitrary ambient illumination from every side.
  // Real roofs cast the shadow on capable devices. With shadows disabled,
  // approximate their shelter locally; never dim the outdoor sun/sky because
  // someone cut the electricity. This adds no mobile shadow passes. At night
  // the sun becomes moonlight.
  adapt(
    r.sun,
    "intensity",
    night
      ? inside && !options.shadows ? 0.12 : 0.32
      : inside && !options.shadows ? (powerOut ? 0.16 : 0.42) : lighting ? 3.1 : 2.05,
  );
  // Emergency bounce illumination leaves walls/doorways readable outside the
  // torch hotspot; fixtures still go dark and limited sight still applies.
  adapt(r.hemisphere, "intensity", inside ? (powerOut ? 0.09 : night ? 0.08 : 0.18) : night ? 0.12 : lighting ? 0.32 : 0.46);
  adapt(r.scene, "environmentIntensity", inside ? (powerOut ? 0.065 : night ? 0.07 : 0.2) : night ? 0.07 : 0.48);
  r.scene.backgroundIntensity = night ? 1 : 0.58;
  // Keep exposure independent of electrical state, including sky seen through
  // a window. Only walking between shelter and open air changes adaptation.
  adapt(r.renderer, "toneMappingExposure", night ? 1.08 : inside ? 0.96 : 0.91);

  const shadowSize = Math.min(
      r.profile?.maxShadowSize || 2048,
      r.g.academy.preset === "high" ? 2048 : 1024,
    ),
    // Stable shadow resolution across roof boundaries prevents texel jumps.
    span = 26;
  r.renderer.shadowMap.enabled = !!options.shadows;
  r.sun.castShadow = !!options.shadows;
  if (r.sun.shadow.mapSize.x !== shadowSize) {
    r.sun.shadow.mapSize.set(shadowSize, shadowSize);
    r.sun.shadow.map?.dispose();
    r.sun.shadow.map = null;
  }
  // World rebuilds also configure the sun camera. Restore the actual focused
  // frustum, even when the occupied room has the same cached span as before.
  if (state.span !== span || r.sun.shadow.camera.right !== span) {
    state.span = span;
    Object.assign(r.sun.shadow.camera, {
      left: -span,
      right: span,
      top: span,
      bottom: -span,
      near: 0.1,
      far: 145,
    });
    r.sun.shadow.camera.updateProjectionMatrix();
  }
  state.focus.set(x, 0.65, z);
  state.right.set(state.direction.z, 0, -state.direction.x).normalize();
  state.up.crossVectors(state.direction, state.right).normalize();
  const texel = (span * 2) / shadowSize,
    horizontal = state.focus.dot(state.right),
    vertical = state.focus.dot(state.up);
  state.focus.addScaledVector(state.right, Math.round(horizontal / texel) * texel - horizontal);
  state.focus.addScaledVector(state.up, Math.round(vertical / texel) * texel - vertical);
  r.sun.target.position.copy(state.focus);
  r.sun.position.copy(state.focus).addScaledVector(state.direction, 72);
  r.sun.target.updateMatrixWorld();

  state.fixtureIndices.fill(-1);
  state.fixtureDistances.fill(Infinity);
  // At night, lamp posts outside join the pool of real lights near the player.
  const lamps = night && r.night?.root.visible ? r.night.lamps : null;
  if (state.fixtureSource !== r.protocolFixtures || state.fixtureLamps !== lamps) {
    state.fixtureSource = r.protocolFixtures;
    state.fixtureLamps = lamps;
    state.fixtures = lamps?.length ? r.protocolFixtures.concat(lamps) : r.protocolFixtures;
  }
  const fixtures = state.fixtures;
  if (!powerOut)
    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i];
      if (fixture.arrivalOnly && !arrived) continue;
      const sameRoom =
        room &&
        fixture.x >= room.x * SCALE &&
        fixture.x < (room.x + room.w) * SCALE &&
        fixture.z >= room.y * SCALE &&
        fixture.z < (room.y + room.h) * SCALE;
      // Arrival fixtures are real lights in the receiving clinic visible through
      // the cargo window. Other rooms never leak their light through a wall.
      if (!sameRoom && !(arrived && fixture.arrivalOnly) && !(fixture.outdoor && !room)) continue;
      const dx = fixture.x - x,
        dz = fixture.z - z,
        distance = dx * dx + dz * dz + (sameRoom ? 0 : 80);
      if (distance > 360) continue;
      for (let slot = 0; slot < state.fixtureIndices.length; slot++)
        if (distance < state.fixtureDistances[slot]) {
          for (let next = state.fixtureIndices.length - 1; next > slot; next--) {
            state.fixtureDistances[next] = state.fixtureDistances[next - 1];
            state.fixtureIndices[next] = state.fixtureIndices[next - 1];
          }
          state.fixtureDistances[slot] = distance;
          state.fixtureIndices[slot] = i;
          break;
        }
    }
  // Keep a pooled light on its existing fixture when two nearby fixtures swap
  // distance order. Otherwise ordinary walking would unnecessarily dim both.
  state.desiredFixtures.fill(-1);
  state.assignedFixtures.fill(0);
  for (let i = 0; i < r.protocolLights.length; i++) {
    const slot = state.fixtureIndices.indexOf(state.activeFixtures[i]);
    if (state.activeFixtures[i] >= 0 && slot >= 0 && !state.assignedFixtures[slot]) {
      state.desiredFixtures[i] = state.activeFixtures[i];
      state.assignedFixtures[slot] = 1;
    }
  }
  for (let i = 0; i < r.protocolLights.length; i++)
    if (state.desiredFixtures[i] < 0)
      for (let slot = 0; slot < state.fixtureIndices.length; slot++)
        if (state.fixtureIndices[slot] >= 0 && !state.assignedFixtures[slot]) {
          state.desiredFixtures[i] = state.fixtureIndices[slot];
          state.assignedFixtures[slot] = 1;
          break;
        }
  for (let i = 0; i < r.protocolLights.length; i++) {
    const light = r.protocolLights[i],
      desired = state.desiredFixtures[i];
    // Fade an old pooled fixture out before relocating it to another room.
    if (!state.initialized || (state.activeFixtures[i] !== desired && light.intensity < 0.15)) {
      state.activeFixtures[i] = desired;
      light.intensity = 0;
    }
    const fixture = fixtures[state.activeFixtures[i]];
    light.visible = true;
    adapt(
      light,
      "intensity",
      fixture && state.activeFixtures[i] === desired && !powerOut
        ? fixture.intensity ?? (fixture.outdoor ? 34 : night ? (lighting ? 26 : 21) : lighting ? 22 : 18)
        : 0,
    );
    light.color.set(fixture?.color || (fixture?.outdoor ? "#ffbf7a" : night ? "#ffd6a6" : "#e2ebdf"));
    light.distance = fixture?.distance || (fixture?.outdoor ? 16 : 13);
    if (fixture) light.position.set(fixture.x, fixture.y, fixture.z);
  }

  adapt(r.weaponScene, "environmentIntensity", inside ? (powerOut ? 0.065 : night ? 0.08 : 0.22) : night ? 0.08 : 0.48);
  if (state.weaponSky) {
    state.weaponSky.color.copy(r.hemisphere.color);
    state.weaponSky.groundColor.copy(r.hemisphere.groundColor);
    adapt(state.weaponSky, "intensity", inside ? (powerOut ? 0.12 : night ? 0.14 : 0.28) : night ? 0.14 : 0.58);
  }
  if (state.weaponKey) {
    const fixture = fixtures[state.fixtureIndices[0]];
    if (fixture && inside)
      state.localDirection.set(fixture.x - x, fixture.y - 1.65, fixture.z - z).normalize();
    else state.localDirection.copy(state.direction);
    r.camera.updateMatrixWorld();
    state.localDirection.transformDirection(r.camera.matrixWorldInverse);
    state.weaponKey.position.lerp(state.localDirection.multiplyScalar(5), blend);
    state.weaponKey.color.lerp(fixture && inside ? r.protocolLights[0].color : r.sun.color, blend);
    adapt(state.weaponKey, "intensity", inside ? (powerOut ? 0.35 : 1.1) : night ? 0.45 : lighting ? 2.65 : 2.05);
  }
  state.initialized = true;
}
