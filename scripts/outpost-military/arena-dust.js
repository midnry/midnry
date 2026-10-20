/** Dust Outpost art pass: a desert military compound. Presentation only; the
 * collision grid, routes and rules are unchanged.
 *
 * - Walls: modelled 3 m kit pieces instead of plain boxes, one per tile —
 *   HESCO sand-filled barriers (type 1), concrete blast blocks (type 2) and
 *   stacked military crates (type 3) — with ambient occlusion baked in.
 * - Ground: photographed desert gravel instead of asphalt.
 * - Props: small CC0 props (jerrycans, ammo boxes, drums, tyres…) hugging wall
 *   bases, kept under 0.6 m deep so they never read as cover in a lane.
 *
 * Assets load after the arena is already playable; until then the original
 * look stays. "High" quality loads 2K textures, everything else 1K.
 * Sources and licences: public/games/military/ATTRIBUTION.md. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const SCALE = 3;
const PIECES = { 1: "hesco", 2: "block", 3: "crates" };
// Props that may stand against a wall base, with their footprint depth (m).
const PROPS = [
  ["metal_jerrycan", 0.35],
  ["metal_jerrycan_green", 0.35],
  ["plastic_jerrycan", 0.35],
  ["ammo_box", 0.3],
  ["Barrel_01", 0.6],
  ["barrel_03", 0.6],
  ["old_tyre", 0.6],
  ["cardboard_box_01", 0.45],
  ["plastic_crate_03", 0.5],
  ["old_military_crate", 0.55],
];

export class DustStyle {
  constructor(r, asset, version) {
    this.r = r;
    this.asset = asset;
    this.version = version;
    this.ready = false;
    this.loading = null;
    this.instances = [];
  }
  /** The arena this style dresses. Training keeps the classic yard. */
  applies(id) {
    return id === "outpost" && this.r.g.mode !== "training";
  }
  owns(id, type) {
    return this.ready && this.applies(id) && !!PIECES[type];
  }
  /** Start loading (once). Resolves when the arena should be rebuilt. */
  load() {
    if (this.loading) return this.loading;
    const r = this.r,
      hd = r.g.academy?.preset === "high",
      url = (path) => `${this.asset}${path}?assetVersion=${this.version}`,
      loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
      textures = new THREE.TextureLoader();
    const tex = async (name, color = false, repeat = 1) => {
      const t = await textures.loadAsync(url(`textures/arena/${hd ? "hd/" : ""}${name}.jpg`));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat, repeat);
      t.anisotropy = r.renderer.capabilities.getMaxAnisotropy();
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      r.textures.add(t);
      r.worldTextures.add(t);
      return t;
    };
    const set = async (name, repeat) => ({
      map: await tex(`${name}-color`, true, repeat),
      normalMap: await tex(`${name}-normal`, false, repeat),
      roughnessMap: await tex(`${name}-roughness`, false, repeat),
    });
    this.loading = (async () => {
      const [kit, props, hesco, concrete, wood, ground] = await Promise.all([
        loader.loadAsync(url("models/arena-dust-kit-v1.glb")),
        loader.loadAsync(url("models/arena-dust-props-v1.glb")),
        set("hesco", 1),
        set("blast-concrete", 1),
        set("crate-wood", 1),
        set("desert-ground", 1),
      ]);
      const material = (opts) => {
        const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0, ...opts });
        m.userData.world = true;
        r.materials.add(m);
        return m;
      };
      const sandTop = await set("desert-sand", 1);
      this.materials = {
        fabric: material({ ...hesco, color: "#fff3df", normalScale: new THREE.Vector2(0.9, 0.9) }),
        sandtop: material({ ...sandTop, color: "#d9c39a" }),
        steel: material({ color: "#b4b8b2", metalness: 0.55, roughness: 0.4 }),
        concrete: material({ ...concrete, color: "#fff4e2", normalScale: new THREE.Vector2(0.8, 0.8) }),
        wood: material({ ...wood, color: "#b49a74" }),
        bracket: material({ color: "#3c4236", metalness: 0.5, roughness: 0.55 }),
      };
      // Kit pieces: one geometry per material, keyed by piece name.
      this.pieces = {};
      kit.scene.updateMatrixWorld(true);
      kit.scene.traverse((o) => {
        if (!o.isMesh) return;
        // The piece is the top-level node under the scene (hesco/block/crates).
        let top = o;
        while (top.parent && top.parent !== kit.scene) top = top.parent;
        const name = top.name;
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        // Baked occlusion is kept soft: contact shading, not a dark wash.
        const ao = g.getAttribute("color");
        if (ao) for (let i = 0; i < ao.count; i++) {
          const v = 0.55 + 0.45 * ao.getX(i);
          ao.setXYZ(i, v, v, v);
        }
        (this.pieces[name] ||= []).push({ geometry: g, material: this.materials[o.material.name] || this.materials.steel });
      });
      // Props: one group per asset, merged parts kept as separate meshes.
      this.props = new Map();
      for (const child of props.scene.children) {
        const id = child.name.split("/")[0];
        if (!this.props.has(id)) this.props.set(id, new THREE.Group());
        this.props.get(id).add(child.clone());
      }
      props.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.material.userData.world = true;
        }
      });
      this.groundSet = ground;
      this.ready = true;
    })().catch((error) => {
      r.assetErrors?.push?.(String(error));
      this.failed = true;
    });
    return this.loading;
  }
  /** Instanced kit walls for every tile of one wall type. */
  walls(type, tiles) {
    const parts = this.pieces?.[PIECES[type]];
    if (!parts) return [];
    const dummy = new THREE.Object3D();
    return parts.map(({ geometry, material }) => {
      const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
      tiles.forEach(([x, y], i) => {
        dummy.position.set((x + 0.5) * SCALE, 0, (y + 0.5) * SCALE);
        // Quarter turns break up the repetition of identical modules.
        dummy.rotation.set(0, (((x * 7 + y * 13) % 4) * Math.PI) / 2, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.tiles = tiles;
      mesh.userData.noRoomCull = true;
      return mesh;
    });
  }
  /** Desert gravel ground, tiled about every 2.5 m. */
  ground(material, n) {
    if (!this.groundSet) return;
    const repeat = (n * SCALE) / 2.5;
    for (const key of ["map", "normalMap", "roughnessMap"]) {
      const t = this.groundSet[key].clone();
      t.repeat.set(repeat, repeat);
      t.needsUpdate = true;
      this.r.textures.add(t);
      this.r.worldTextures.add(t);
      material[key] = t;
    }
    material.color.set("#efe3cb");
    material.normalScale.set(1, 1);
    material.needsUpdate = true;
  }
  /** Small props against wall bases. Deterministic, never inside a lane. */
  dress(root, level) {
    if (!this.props?.size) return;
    const n = level.length,
      open = (x, y) => level[y]?.[x] === 0;
    let seed = 1234;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const group = new THREE.Group();
    group.name = "Dust Outpost props";
    for (let y = 1; y < n - 1; y++)
      for (let x = 1; x < n - 1; x++) {
        if (!open(x, y) || rand() > 0.16) continue;
        const walls = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => !open(x + dx, y + dy));
        // Only along a single wall, in lanes at least two tiles wide.
        if (walls.length !== 1) continue;
        const [dx, dy] = walls[0];
        if (!open(x - dx, y - dy)) continue;
        const [id, depth] = PROPS[Math.floor(rand() * PROPS.length)];
        const source = this.props.get(id);
        if (!source) continue;
        const prop = source.clone();
        const along = (rand() - 0.5) * 0.6;
        const px = x + 0.5 + dx * (0.5 - depth / SCALE / 2 - 0.02) + (dy ? along : 0),
          py = y + 0.5 + dy * (0.5 - depth / SCALE / 2 - 0.02) + (dx ? along : 0);
        prop.position.set(px * SCALE, 0, py * SCALE);
        prop.rotation.y = Math.atan2(dx, dy) + (rand() - 0.5) * 0.6;
        group.add(prop);
      }
    root.add(group);
    return group;
  }
}
