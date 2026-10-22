/** Lobby backdrop to the owner's lobby concept (public/games/outpost-zero/
 * lobby-concept.webp): a desert sunset over an outpost. Low sun on the
 * right, lit clouds, flat-topped mesas, a far skyline of lit buildings and
 * towers, a dark hangar on the left (amber light strips, a red banner,
 * crates), a parked vehicle on the right and wet concrete that catches the
 * sunset. Everything is drawn in a handful of merged meshes so the lobby
 * stays cheap on phones. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Where the sun sits (from the stage, looking past the pads). */
export const LOBBY_SUN = new THREE.Vector3(0.24, 0.045, -1).normalize();

export const lobbySky = /* glsl */ `
varying vec3 vDir;
uniform float time;
uniform vec3 sun;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return v;
}
void main() {
  vec3 d = normalize(vDir);
  float s = max(dot(d, sun), 0.0);
  float y = d.y;
  // Sunset: violet-blue overhead, rose, then orange and gold at the horizon,
  // brightest under the sun.
  vec3 top = vec3(0.10, 0.10, 0.20), rose = vec3(0.42, 0.18, 0.20), orange = vec3(0.95, 0.42, 0.14), gold = vec3(1.0, 0.70, 0.32);
  vec3 c = mix(orange, rose, smoothstep(0.02, 0.2, y));
  c = mix(c, top, smoothstep(0.18, 0.55, y));
  c = mix(c, gold, pow(s, 8.0) * smoothstep(0.3, 0.0, y) * 0.8);
  // Clouds: broken streaks lit orange from below, darker away from the sun.
  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.1) * 0.9 + vec2(time * 0.004, 0.0);
    float n = fbm(uv * vec2(0.8, 2.4));
    float cloud = smoothstep(0.38, 0.62, n) * smoothstep(0.01, 0.07, y) * (1.0 - smoothstep(0.5, 0.85, y));
    // Undersides mauve, edges facing the sun bright orange.
    vec3 lit = mix(vec3(0.34, 0.13, 0.16), vec3(1.0, 0.5, 0.18), 0.25 + 0.75 * pow(s, 3.0));
    lit = mix(lit, vec3(0.20, 0.09, 0.14), smoothstep(0.6, 0.85, n) * 0.7);
    c = mix(c, lit, cloud * 0.95);
  }
  // Sun disc and glow.
  c += vec3(0.6, 0.22, 0.05) * pow(s, 40.0) + vec3(0.25, 0.07, 0.02) * pow(s, 8.0);
  c = mix(c, vec3(1.0, 0.82, 0.55), smoothstep(0.9990, 0.9995, s));
  // Keep the glow orange where it saturates (never yellow-green).
  c = min(c, vec3(1.0, 0.86, 0.62));
  // Mesas: flat-topped cliffs on the horizon, hazier towards the sun.
  float az = atan(d.x, -d.z);
  float shelf = smoothstep(0.42, 0.5, noise(vec2(az * 3.2, 1.7))) * 0.75 + smoothstep(0.55, 0.62, noise(vec2(az * 7.0, 4.2))) * 0.35;
  float ridge = 0.012 + 0.07 * shelf + 0.006 * noise(vec2(az * 40.0, 0.0));
  if (y < ridge) {
    vec3 rock = mix(vec3(0.17, 0.08, 0.10), vec3(0.50, 0.22, 0.12), pow(s, 4.0));
    // Haze thickens towards the foot of the cliffs.
    c = mix(rock, c, 0.12 + 0.35 * smoothstep(ridge, 0.0, y));
  }
  // Below the horizon: warm haze where the floor fades out.
  if (y < 0.0) c = mix(c, vec3(0.30, 0.15, 0.10), smoothstep(0.0, -0.08, y));
  // The palette above is authored in sRGB; the output stage expects linear.
  gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}`;

/** A canvas texture, sRGB, owned by the stage. */
function canvasTexture(own, w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const t = own(new THREE.CanvasTexture(canvas));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Box with UVs in metres (so a window texture tiles at a fixed size). */
function box(w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv,
    n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const side = Math.abs(n.getX(i)) > 0.5 ? d : w,
      up = Math.abs(n.getY(i)) > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * side, uv.getY(i) * up);
  }
  g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

/** Deterministic random so the skyline is the same every visit. */
function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export function buildLobbyBackdrop(scene, own, { mobile = false } = {}) {
  const rand = seeded(20261022);
  // Windows: dark facade with scattered warm lit panes, 4 m per tile.
  const windows = canvasTexture(own, 128, 128, (c, w, h) => {
    c.fillStyle = "#0d0b0c";
    c.fillRect(0, 0, w, h);
    const r = seeded(7);
    for (let y = 8; y < h; y += 32)
      for (let x = 6; x < w; x += 22) {
        const on = r() < 0.32;
        c.fillStyle = on ? (r() < 0.5 ? "#ffb35c" : "#ff8a3a") : "#161214";
        c.fillRect(x, y, 12, 14);
      }
  });
  windows.wrapS = windows.wrapT = THREE.RepeatWrapping;
  windows.repeat.set(0.45, 0.45);
  const facade = own(
    new THREE.MeshStandardMaterial({
      color: "#1a1416",
      roughness: 0.9,
      metalness: 0.1,
      emissive: "#ffffff",
      emissiveMap: windows,
      emissiveIntensity: 0.9,
    }),
  );
  const dark = own(new THREE.MeshStandardMaterial({ color: "#151214", roughness: 0.85, metalness: 0.25 }));
  const amber = own(new THREE.MeshBasicMaterial({ color: "#ffb04a", toneMapped: false }));

  // Far skyline: blocks and towers between the mesas and the stage.
  const far = [],
    towers = [];
  for (let i = 0; i < (mobile ? 22 : 34); i++) {
    const x = -70 + rand() * 140,
      z = -60 - rand() * 30;
    if (Math.abs(x - 44) < 10 && rand() < 0.7) continue; // keep the sun clear
    const w = 3 + rand() * 6,
      h = 1.5 + rand() * (rand() < 0.2 ? 5 : 2.5),
      d = 3 + rand() * 5;
    far.push(box(w, h, d, x, h / 2, z, rand() * 0.4 - 0.2));
  }
  for (const [x, z, h] of [
    [-22, -66, 8],
    [-17, -70, 6],
    [34, -62, 10],
    [40, -68, 7],
    [8, -78, 5.5],
  ]) {
    towers.push(box(0.6, h, 0.6, x, h / 2, z), box(1.6, 0.5, 1.6, x, h, z), box(1, 1.6, 1, x, h + 1.05, z));
    for (let y = 1.6; y < h; y += 1.8) towers.push(box(1.3, 0.14, 1.3, x, y, z));
  }
  scene.add(new THREE.Mesh(own(mergeGeometries(far)), facade));
  scene.add(new THREE.Mesh(own(mergeGeometries(towers)), dark));

  // The hangar on the left: a tall dark wall with an overhang, ribs and
  // amber light strips, and crates stacked in front.
  const hangar = [],
    strips = [];
  hangar.push(box(1.2, 11, 18, -7.2, 5.5, -13));
  hangar.push(box(6, 0.8, 20, -5.2, 10.6, -12.5)); // roof overhang
  for (let z = -21; z <= -5; z += 3) {
    hangar.push(box(0.5, 10.2, 0.6, -6.4, 5.1, z));
    strips.push(box(0.08, 1.4, 0.16, -6.1, 4.4 + (Math.abs(z) % 2) * 1.2, z + 0.9));
    strips.push(box(0.08, 0.6, 0.16, -6.1, 1.6, z + 0.9));
  }
  const crates = [];
  for (const [x, z, s, stack] of [
    [-5.6, -9, 0.75, 2],
    [-5.0, -7.6, 0.6, 1],
    [-5.7, -12, 0.7, 2],
    [-4.8, -13.4, 0.55, 1],
    [-5.6, -16, 0.65, 2],
  ])
    for (let k = 0; k < stack; k++) crates.push(box(s * 1.4, s * 0.9, s, x, s * 0.45 + k * s * 0.9, z, 0.1 * k));
  scene.add(new THREE.Mesh(own(mergeGeometries(hangar)), dark));
  scene.add(new THREE.Mesh(own(mergeGeometries(crates)), own(new THREE.MeshStandardMaterial({ color: "#1d1c1c", roughness: 0.7, metalness: 0.5 }))));
  scene.add(new THREE.Mesh(own(mergeGeometries(strips)), amber));
  // Red banner with the outpost mark, hanging from the overhang.
  const banner = canvasTexture(own, 128, 320, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#7c1316");
    grad.addColorStop(1, "#4a0a0d");
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#c9b48a";
    c.lineWidth = 6;
    c.beginPath();
    c.arc(w / 2, h * 0.42, 38, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#c9b48a";
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2,
        r = i % 2 ? 9 : 30;
      c.lineTo(w / 2 + Math.cos(a) * r, h * 0.42 + Math.sin(a) * r);
    }
    c.fill();
    c.fillStyle = "#00000055";
    for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 3, h);
  });
  const flag = new THREE.Mesh(
    own(new THREE.PlaneGeometry(1.6, 4)),
    own(new THREE.MeshStandardMaterial({ map: banner, roughness: 0.95, side: THREE.DoubleSide, emissive: "#3a0606", emissiveIntensity: 0.4 })),
  );
  flag.position.set(-6.0, 4.4, -9.5);
  flag.rotation.y = Math.PI / 2;
  scene.add(flag);

  // A parked armoured vehicle on the right, in silhouette with small lights.
  const truck = [];
  truck.push(box(4.6, 1.3, 2.2, 0, 1.15, 0), box(2.2, 1.0, 2.0, -0.9, 2.2, 0), box(1.6, 0.25, 0.25, 1.2, 2.5, 0));
  for (const x of [-1.5, 0, 1.5]) for (const z of [-1.15, 1.15]) truck.push(box(0.9, 0.9, 0.35, x, 0.45, z));
  const truckGeo = mergeGeometries(truck);
  truckGeo.scale(0.8, 0.8, 0.8);
  truckGeo.rotateY(-0.5);
  truckGeo.translate(9, 0, -24);
  scene.add(new THREE.Mesh(own(truckGeo), dark));

  // Lamps: amber points across the yard (the concept's warm specks).
  const lamps = [],
    lampGeo = [];
  for (let i = 0; i < (mobile ? 10 : 18); i++) {
    const x = -30 + rand() * 60,
      z = -22 - rand() * 30,
      h = 0.8 + rand() * 1.8;
    lamps.push(x, h, z);
    lampGeo.push(box(0.1, h, 0.1, x, h / 2, z));
  }
  scene.add(new THREE.Mesh(own(mergeGeometries(lampGeo)), dark));
  const glow = canvasTexture(own, 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#ffffffff");
    g.addColorStop(0.25, "#ffd08a99");
    g.addColorStop(1, "#ff8a3a00");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const lampPoints = new THREE.BufferGeometry();
  lampPoints.setAttribute("position", new THREE.Float32BufferAttribute(lamps, 3));
  scene.add(
    new THREE.Points(
      own(lampPoints),
      own(new THREE.PointsMaterial({ map: glow, color: "#ffb35c", size: 1.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })),
    ),
  );

  // Wet concrete: the sunset's reflection, a long warm streak on the floor
  // between the stage and the sun, plus a broad glow.
  const streak = canvasTexture(own, 64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffb05a00");
    g.addColorStop(0.35, "#ff9a4a88");
    g.addColorStop(1, "#ff7a3a00");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const s = c.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, "#000000ff");
    s.addColorStop(0.5, "#00000000");
    s.addColorStop(1, "#000000ff");
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = s;
    c.fillRect(0, 0, w, h);
  });
  const reflection = new THREE.Mesh(
    own(new THREE.PlaneGeometry(22, 64)),
    own(new THREE.MeshBasicMaterial({ map: streak, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.9 })),
  );
  reflection.rotation.x = -Math.PI / 2;
  reflection.rotation.z = -Math.atan2(LOBBY_SUN.x, -LOBBY_SUN.z);
  reflection.position.set(LOBBY_SUN.x * 30, 0.01, LOBBY_SUN.z * 30);
  scene.add(reflection);
}
