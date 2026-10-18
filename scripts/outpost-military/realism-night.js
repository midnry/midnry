/** Night shift: the same base after dark. A starry dusk sky, moonlight, warm
 * lamp posts that pool light on the ground, and glowing signs that bloom.
 * Presentation only; the simulation's night rule is a shorter sight range. */
import * as THREE from "three";

const SCALE = 3;

export const isNightShift = (view) => view?.protocol?.match?.modifier === "night-shift";

/** Lamp posts on the base's open-air ground: [tile x, tile y, head direction x, z].
 * Poles stand against a wall so nobody walks through them. */
const LAMPS = [
  [3.5, 26.88, 0, -1], [9.5, 26.88, 0, -1], [17.5, 26.88, 0, -1], [24.5, 26.88, 0, -1], // Perimeter road.
  [1.12, 22.5, 1, 0], [26.88, 22.5, -1, 0], // Gate approaches.
];
/** Glowing signs: [tile x, tile y, text, colour, width]. Mounted on the nearest wall. */
const SIGNS = [
  [15.5, 15.5, "MEDEVAC ▸", "#ffb347", 2.4],
  [12.5, 13.5, "✚ MEDICAL", "#ff5a5a", 2.4],
  [13.5, 26.5, "SOUTH GATE", "#59d7ff", 2.6],
  [24.5, 26.5, "OPEN 24H", "#ff6fb5", 1.8],
];

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  // Equirectangular: the top of the image is straight up, the middle the horizon.
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#03060d");
  sky.addColorStop(0.32, "#0b1730");
  sky.addColorStop(0.47, "#1f3b5c");
  sky.addColorStop(0.5, "#2b4a63");
  sky.addColorStop(0.53, "#0c1219");
  sky.addColorStop(1, "#050608");
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);
  // A faint city glow low on one side of the horizon.
  const glow = g.createRadialGradient(700, 250, 10, 700, 250, 260);
  glow.addColorStop(0, "#5a4a5a88");
  glow.addColorStop(1, "#5a4a5a00");
  g.fillStyle = glow;
  g.fillRect(0, 120, 1024, 160);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Small, dim stars: bright ones would bloom into blobs.
  for (let i = 0; i < 700; i++) {
    const x = rand() * 1024,
      y = rand() * 230;
    g.fillStyle = `rgba(220,230,255,${0.12 + rand() * 0.35})`;
    g.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function poolTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const pool = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  pool.addColorStop(0, "rgba(255,255,255,1)");
  pool.addColorStop(0.35, "rgba(255,255,255,0.45)");
  pool.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = pool;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function signTexture(text, color) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 512, 128);
  g.font = "700 76px 'Barlow Condensed', 'Arial Narrow', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  // Tube glow, then a bright core: bloom does the rest.
  g.shadowColor = color;
  g.shadowBlur = 22;
  g.fillStyle = color;
  g.fillText(text, 256, 66);
  g.shadowBlur = 0;
  g.fillStyle = "#ffffff";
  g.globalAlpha = 0.55;
  g.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class NightDressing {
  constructor(r) {
    this.r = r;
    this.active = false;
    this.sky = skyTexture();
    this.pool = poolTexture();
    this.textures = [this.sky, this.pool];
    this.materials = [];
    this.geometries = [];
    this.root = new THREE.Group();
    this.root.visible = false;
    this.root.name = "night-dressing";
    r.scene.add(this.root);
    /** Lamp heads in world units, offered to the pooled point lights at night. */
    this.lamps = [];
    this.mapId = null;
    this.flicker = null;
  }
  material(make) {
    const m = make();
    this.materials.push(m);
    return m;
  }
  build(mapId) {
    this.mapId = mapId;
    this.root.clear();
    this.lamps = [];
    if (mapId !== "breakwater") return;
    const pole = this.material(() => new THREE.MeshStandardMaterial({ color: "#2b2f31", roughness: 0.6, metalness: 0.7 }));
    const bulb = this.material(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd9a3").multiplyScalar(6) }));
    const pool = this.material(
      () =>
        new THREE.MeshBasicMaterial({
          map: this.pool,
          color: new THREE.Color("#ffb46a").multiplyScalar(0.55),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        }),
    );
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 4.2, 10),
      armGeo = new THREE.BoxGeometry(0.7, 0.06, 0.08),
      headGeo = new THREE.BoxGeometry(0.42, 0.08, 0.22),
      poolGeo = new THREE.PlaneGeometry(1, 1);
    this.geometries.push(poleGeo, armGeo, headGeo, poolGeo);
    for (const [tx, ty, dx, dz] of LAMPS) {
      const x = tx * SCALE,
        z = ty * SCALE,
        length = Math.hypot(dx, dz) || 1,
        ux = dx / length,
        uz = dz / length,
        hx = x + ux * 0.6,
        hz = z + uz * 0.6,
        yaw = Math.atan2(-uz, ux);
      const post = new THREE.Mesh(poleGeo, pole);
      post.position.set(x, 2.1, z);
      const arm = new THREE.Mesh(armGeo, pole);
      arm.position.set(x + ux * 0.32, 4.15, z + uz * 0.32);
      arm.rotation.y = yaw;
      const head = new THREE.Mesh(headGeo, bulb);
      head.position.set(hx, 4.08, hz);
      head.rotation.y = yaw;
      const light = new THREE.Mesh(poolGeo, pool);
      light.rotation.x = -Math.PI / 2;
      light.scale.setScalar(7.5);
      light.position.set(hx, 0.03, hz);
      for (const mesh of [post, arm, head, light]) {
        mesh.castShadow = false;
        mesh.userData.noRoomCull = true;
        this.root.add(mesh);
      }
      this.lamps.push({ x: hx, y: 3.9, z: hz, outdoor: true });
    }
    const panel = this.material(() => new THREE.MeshStandardMaterial({ color: "#14181b", roughness: 0.5, metalness: 0.4 }));
    for (const [tx, ty, text, color, width] of SIGNS) {
      const mount = this.r.protocolMount(tx, ty, 2.75);
      const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.62, 0.06), panel);
      this.geometries.push(back.geometry);
      back.position.z = 0.04;
      const texture = signTexture(text, color);
      this.textures.push(texture);
      const glow = this.material(
        () =>
          new THREE.MeshBasicMaterial({
            map: texture,
            color: new THREE.Color("#ffffff").multiplyScalar(3.2),
            transparent: true,
            depthWrite: false,
          }),
      );
      const face = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), glow);
      this.geometries.push(face.geometry);
      face.position.z = 0.08;
      mount.add(back, face);
      mount.traverse((o) => (o.userData.noRoomCull = true));
      this.root.add(mount);
      // One sign buzzes now and then, like an old tube.
      if (text === "OPEN 24H") this.flicker = glow;
    }
  }
  /** Turn the dressing on or off for this frame. Returns whether night is active. */
  update(view, mapId, time) {
    const night = isNightShift(view);
    if (night && this.mapId !== mapId) this.build(mapId);
    this.active = night;
    this.root.visible = night && mapId === "breakwater";
    if (this.flicker && night) {
      const buzz = Math.sin(time * 37) > 0.93 || (time % 7.3 < 0.18 && Math.sin(time * 90) > 0);
      this.flicker.color.setScalar(buzz ? 0.6 : 3.2);
    }
    return night;
  }
  dispose() {
    this.r.scene.remove(this.root);
    for (const item of [...this.textures, ...this.materials, ...this.geometries]) item.dispose();
  }
}
