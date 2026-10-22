/** Calder Quay landmarks, one per district, each readable from across the
 * town: the radio mast (tallest thing in town, red warning lights), the
 * Police Post's blue lamp, the fuel forecourt canopy and its lit price sign,
 * the Market Hall clock, the clinic's red crosses and the depot crane over
 * the slipway. Presentation only: everything stands on solid tiles or above
 * head height. Built from a few merged meshes and canvas textures. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const SCALE = 3;
const box = (w, h, d, x, y, z, ry = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  return g.translate(x, y, z);
};
/** A thin strut from a to b (world metres). */
const strut = (a, b, t = 0.08) => {
  const d = new THREE.Vector3().subVectors(b, a),
    g = new THREE.BoxGeometry(t, d.length(), t);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
};
const canvasTexture = (w, h, draw) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
/** Plane facing direction (dx, dy) on the face of wall tile (x, y). */
const facePlane = (geo, x, y, dx, dy, height) => {
  geo.rotateY(Math.atan2(dx, dy));
  return geo.translate((x + 0.5 + dx * 0.52) * SCALE, height, (y + 0.5 + dy * 0.52) * SCALE);
};

export class QuayLandmarks {
  constructor(r, L) {
    this.group = new THREE.Group();
    this.group.name = "Calder Quay landmarks";
    this.owned = [];
    const own = (x) => (this.owned.push(x), x);
    const steel = own(new THREE.MeshStandardMaterial({ color: "#c43d2c", roughness: 0.55, metalness: 0.6 })),
      grey = own(new THREE.MeshStandardMaterial({ color: "#59626a", roughness: 0.5, metalness: 0.7 })),
      yellow = own(new THREE.MeshStandardMaterial({ color: "#e8b23a", roughness: 0.5, metalness: 0.5 })),
      white = own(new THREE.MeshStandardMaterial({ color: "#efece6", roughness: 0.7 }));
    const add = (geos, material, name) => {
      const mesh = new THREE.Mesh(own(mergeGeometries(geos)), material);
      for (const g of geos) g.dispose();
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.name = name;
      this.group.add(mesh);
      return mesh;
    };
    this.glows = [];
    const glow = (color, size, x, y, z, name) => {
      const m = own(new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      const mesh = new THREE.Mesh(own(new THREE.SphereGeometry(size, 12, 8)), m);
      mesh.position.set(x, y, z);
      mesh.name = name;
      this.group.add(mesh);
      this.glows.push(mesh);
      return mesh;
    };

    // Radio mast: a tapering red-and-white lattice with warning lights.
    if (L.mast) {
      const cx = (L.mast.x + 0.5) * SCALE,
        cz = (L.mast.y + 0.5) * SCALE,
        H = L.mast.height,
        legs = [],
        bands = [];
      const corner = (h, i) => {
        const half = 1.1 - (0.75 * h) / H,
          a = (i * Math.PI) / 2 + Math.PI / 4;
        return new THREE.Vector3(cx + Math.cos(a) * half, h, cz + Math.sin(a) * half);
      };
      for (let i = 0; i < 4; i++) legs.push(strut(corner(0, i), corner(H, i), 0.14));
      for (let h = 0; h < H; h += 2) for (let i = 0; i < 4; i++) {
        legs.push(strut(corner(h, i), corner(h + 2, (i + 1) % 4), 0.06));
        (Math.floor(h / 4) % 2 ? bands : legs).push(strut(corner(h, i), corner(h, (i + 1) % 4), 0.08));
      }
      add(legs, steel, "Radio mast");
      // Indoors (the footing is inside the Radio Station) the mast rises from a
      // concrete plinth up through the roof, rather than girders in the room.
      add([box(2.6, 3.4, 2.6, cx, 1.7, cz)], own(new THREE.MeshStandardMaterial({ color: "#9b968c", roughness: 0.9 })), "Mast plinth");
      add(bands, white, "Radio mast bands");
      for (const h of [H * 0.5, H]) this.warning = glow("#ff2a1a", 0.22, cx, h + 0.2, cz, "Mast warning light");
      add([box(1.6, 0.9, 0.9, cx + 0.2, H * 0.7, cz)], grey, "Mast dish housing");
    }

    // Police Post: a blue lamp on a short roof post.
    if (L.policeLamp) {
      const x = (L.policeLamp.x + 0.5) * SCALE,
        z = (L.policeLamp.y + 0.5) * SCALE;
      add([box(0.16, 1.2, 0.16, x, 3.6, z)], grey, "Police lamp post");
      this.blue = glow("#2f7cff", 0.35, x, 4.35, z, "Police blue lamp");
    }

    // Fuel canopy over the forecourt, on four posts, with a lit price sign.
    if (L.canopy) {
      const c = L.canopy,
        x0 = c.x * SCALE,
        z0 = c.y * SCALE,
        w = c.w * SCALE,
        d = c.h * SCALE,
        H = c.height;
      add([box(w + 0.6, 0.5, d + 0.6, x0 + w / 2, H, z0 + d / 2)], white, "Fuel canopy");
      add([box(w + 0.62, 0.18, d + 0.62, x0 + w / 2, H - 0.18, z0 + d / 2)], steel, "Fuel canopy band");
      // Posts stand on the pump islands (solid tiles) so nobody walks into one.
      add(
        [box(0.25, H, 0.25, (18 + 0.5) * SCALE, H / 2, (4 + 0.5) * SCALE), box(0.25, H, 0.25, (20 + 0.5) * SCALE, H / 2, (4 + 0.5) * SCALE)],
        grey,
        "Fuel canopy posts",
      );
      const sign = own(
        canvasTexture(256, 96, (g, W, Hh) => {
          g.fillStyle = "#1c2329";
          g.fillRect(0, 0, W, Hh);
          g.fillStyle = "#c43d2c";
          g.fillRect(0, 0, W, 26);
          g.fillStyle = "#fff";
          g.font = "bold 20px sans-serif";
          g.fillText("CALDER FUEL", 12, 20);
          g.fillStyle = "#ffd25c";
          g.font = "bold 50px monospace";
          g.fillText(c.sign.split(" ")[1] || "", 40, 82);
        }),
      );
      const plane = new THREE.Mesh(
        own(new THREE.PlaneGeometry(2.4, 0.9)),
        own(new THREE.MeshBasicMaterial({ map: sign, toneMapped: false, side: THREE.DoubleSide })),
      );
      plane.position.set(x0 + w / 2, H + 0.75, z0 + d + 0.3);
      plane.name = "Fuel price sign";
      this.group.add(plane);
    }

    // Market Hall clock on the facade facing the square.
    if (L.clock) {
      const { x, y, dx, dy } = L.clock;
      const face = own(
        canvasTexture(128, 128, (g) => {
          g.fillStyle = "#f3ead7";
          g.beginPath();
          g.arc(64, 64, 60, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "#2b2622";
          g.lineWidth = 6;
          g.stroke();
          for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI) / 6;
            g.fillStyle = "#2b2622";
            g.fillRect(64 + Math.sin(a) * 48 - 3, 64 - Math.cos(a) * 48 - 3, 6, 6);
          }
          g.lineCap = "round";
          g.lineWidth = 7;
          g.beginPath();
          g.moveTo(64, 64);
          g.lineTo(64 + 26, 64 - 18);
          g.stroke();
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(64, 64);
          g.lineTo(64 - 6, 64 - 44);
          g.stroke();
        }),
      );
      const clock = new THREE.Mesh(own(facePlane(new THREE.CircleGeometry(0.75, 32), x, y, dx, dy, 3.4)), own(new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 })));
      clock.name = "Market Hall clock";
      this.group.add(clock);
      add([facePlane(new THREE.BoxGeometry(1.8, 1.8, 0.12), x, y, dx, dy, 3.4)], grey, "Clock housing");
    }

    // Clinic: red crosses on white panels.
    if (L.crosses?.length) {
      const cross = own(
        canvasTexture(128, 128, (g) => {
          g.fillStyle = "#f6f4ef";
          g.fillRect(0, 0, 128, 128);
          g.fillStyle = "#d22b2b";
          g.fillRect(44, 14, 40, 100);
          g.fillRect(14, 44, 100, 40);
        }),
      );
      const geos = L.crosses.map(({ x, y, dx, dy }) => facePlane(new THREE.PlaneGeometry(1.5, 1.5), x, y, dx, dy, 2.2));
      const mesh = new THREE.Mesh(own(mergeGeometries(geos)), own(new THREE.MeshBasicMaterial({ map: cross, toneMapped: false })));
      for (const g of geos) g.dispose();
      mesh.name = "Clinic red crosses";
      this.group.add(mesh);
    }

    // Depot crane: a yellow tower on the yard wall, its jib over the slipway.
    if (L.crane) {
      const cx = (L.crane.x + 0.5) * SCALE,
        cz = (L.crane.y + 0.5) * SCALE,
        H = L.crane.height,
        reach = L.crane.reach * SCALE,
        parts = [];
      for (const [ox, oz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]])
        parts.push(box(0.18, H, 0.18, cx + ox, H / 2, cz + oz));
      for (let h = 1.5; h < H; h += 1.5) parts.push(box(1.1, 0.1, 1.1, cx, h, cz));
      parts.push(box(1.6, 1.4, 1.6, cx, H + 0.7, cz)); // cab
      parts.push(box(reach, 0.5, 0.6, cx - reach / 2 + 0.5, H + 1.6, cz)); // jib
      parts.push(box(3, 0.5, 0.6, cx + 2, H + 1.6, cz)); // counter-jib
      parts.push(box(1.2, 1, 0.9, cx + 3, H + 1.1, cz)); // counterweight
      add(parts, yellow, "Depot crane");
      add([box(0.04, 8, 0.04, cx - reach + 1.2, H + 1.6 - 4, cz), box(0.7, 0.3, 0.7, cx - reach + 1.2, H + 1.6 - 8, cz)], grey, "Crane hook");
      glow("#ff2a1a", 0.18, cx - reach + 0.6, H + 2, cz, "Crane tip light");
    }
  }
  update(t, still) {
    // The blue lamp turns; warning lights blink.
    if (this.blue) this.blue.material.color.setHSL(0.61, 1, still ? 0.55 : 0.35 + 0.3 * (Math.sin(t * 6) > 0 ? 1 : 0));
    for (const g of this.glows) if (g !== this.blue) g.visible = still || Math.sin(t * 2.2) > -0.3;
  }
  dispose() {
    this.group.removeFromParent();
    for (const x of this.owned) x.dispose?.();
  }
}
