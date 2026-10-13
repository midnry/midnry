/** Natural source lighting shared by the world and first-person equipment. */
import * as THREE from "three";

const SCALE = 3;

export function initNaturalLighting(r) {
  if (r.naturalLighting) return;
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
  };
  // A second, unrelated cool directional light is not a physical rim source.
  // Sky reflections still give silhouettes and metal their natural edge light.
  r.rim.intensity = 0;
  r.rim.visible = false;
  r.sun.color.set("#fff4df");
  r.hemisphere.color.set("#cad9e1");
  r.hemisphere.groundColor.set("#746c5c");
  r.sun.shadow.bias = -0.00012;
  r.sun.shadow.normalBias = 0.018;
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

export function updateNaturalLighting(r, protocolView, camera) {
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
  let room = null;
  for (const candidate of state.rooms) {
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
    arrived = !!protocol?.mission?.vehicle?.arrived;
  state.inside = inside;
  state.roomId = room?.id || null;
  state.powerOut = powerOut;
  r.rim.visible = false;
  r.rim.intensity = 0;
  // The sun remains outside a roofed room. Roofs and walls occlude it rather
  // than replacing it with arbitrary ambient illumination from every side.
  r.sun.intensity = powerOut ? 0.16 : lighting ? 3.1 : 2.05;
  // Emergency bounce illumination leaves walls/doorways readable outside the
  // torch hotspot; fixtures still go dark and limited sight still applies.
  r.hemisphere.intensity = powerOut ? 0.09 : inside ? 0.18 : lighting ? 0.32 : 0.46;
  r.scene.environmentIntensity = powerOut ? 0.065 : inside ? 0.2 : 0.48;
  r.scene.backgroundIntensity = powerOut ? 0.13 : 0.58;
  r.renderer.toneMappingExposure = powerOut ? 0.92 : inside ? 0.96 : 0.91;

  const shadowSize = Math.min(
      r.profile?.maxShadowSize || 2048,
      r.g.academy.preset === "high" ? 2048 : 1024,
    ),
    span = inside ? 18 : 26;
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
  const fixtures = r.protocolFixtures;
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
      if (!sameRoom && !(arrived && fixture.arrivalOnly)) continue;
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
  for (let i = 0; i < r.protocolLights.length; i++) {
    const light = r.protocolLights[i],
      fixture = fixtures[state.fixtureIndices[i]];
    light.visible = true;
    light.intensity = fixture && !powerOut ? (lighting ? 22 : 18) : 0;
    light.color.set("#e2ebdf");
    light.distance = 13;
    if (fixture) light.position.set(fixture.x, fixture.y, fixture.z);
  }

  r.weaponScene.environmentIntensity = powerOut ? 0.065 : inside ? 0.22 : 0.48;
  if (state.weaponSky) {
    state.weaponSky.color.copy(r.hemisphere.color);
    state.weaponSky.groundColor.copy(r.hemisphere.groundColor);
    state.weaponSky.intensity = powerOut ? 0.12 : inside ? 0.28 : 0.58;
  }
  if (state.weaponKey) {
    const fixture = fixtures[state.fixtureIndices[0]];
    if (fixture && inside)
      state.localDirection.set(fixture.x - x, fixture.y - 1.65, fixture.z - z).normalize();
    else state.localDirection.copy(state.direction);
    r.camera.updateMatrixWorld();
    state.localDirection.transformDirection(r.camera.matrixWorldInverse);
    state.weaponKey.position.copy(state.localDirection).multiplyScalar(5);
    state.weaponKey.color.copy(fixture && inside ? r.protocolLights[0].color : r.sun.color);
    state.weaponKey.intensity = powerOut ? 0.35 : inside ? 1.1 : lighting ? 2.65 : 2.05;
  }
}
