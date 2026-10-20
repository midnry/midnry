/** Last Signal arena art passes. Presentation only; the collision grid,
 * routes and rules are unchanged.
 *
 * Per arena (ARENAS below):
 * - pieces: wall types drawn as modelled 3 m kit pieces instead of plain
 *   boxes, one per tile, with ambient occlusion baked in;
 * - walls: wall types that stay boxes (buildings with windows and roofs) but
 *   get the arena's photographed surface;
 * - ground: a photographed floor instead of asphalt;
 * - dressing: small CC0 props hugging wall bases, kept under ~0.65 m deep so
 *   they never read as cover in a lane.
 *
 * Dust Outpost loads behind the opening loading screen; the other arenas
 * follow in the background. If an arena's art is not ready when its round
 * starts, the original look shows and the arena rebuilds once it is. If it
 * fails, the original look stays. "High" quality loads 2K textures,
 * everything else 1K. Sources and licences: public/games/military/ATTRIBUTION.md. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { batchStaticByMaterial } from "./static-batches.js";

const SCALE = 3;

/** Texture sets are textures/arena/<set>-{color,normal,roughness}.jpg. */
export const ARENAS = {
  outpost: {
    kit: "arena-dust-kit-v1",
    props: "arena-dust-props-v1",
    pieces: { 1: "hesco", 2: "block", 3: "crates" },
    materials: {
      fabric: { set: "hesco", color: "#fff3df", normalScale: 0.9 },
      sandtop: { set: "desert-sand", color: "#d9c39a" },
      steel: { color: "#b4b8b2", metalness: 0.55, roughness: 0.4 },
      concrete: { set: "blast-concrete", color: "#fff4e2", normalScale: 0.8 },
      wood: { set: "crate-wood", color: "#b49a74" },
      bracket: { color: "#3c4236", metalness: 0.5, roughness: 0.55 },
    },
    ground: { set: "desert-ground", tile: 2.5, color: "#efe3cb" },
    walls: {},
    // [asset, depth against the wall (m), scale]
    dressing: [
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
    ],
  },
  estate: {
    kit: "arena-estate-kit-v1",
    props: "arena-estate-props-v1",
    pieces: { 2: "hedge", 3: "planter" },
    materials: {
      leaves: { set: "hedge", color: "#d9e6cc", normalScale: 1 },
      stone: { set: "estate-stone", color: "#fff8ee", normalScale: 0.7 },
      soil: { color: "#4a3a2c", roughness: 1 },
    },
    ground: { set: "estate-paving", tile: 3, color: "#f4ece0" },
    // Garden and compound walls in warm lime render; the villas paler; sheds
    // and the pool house washed peach.
    walls: {
      1: { set: "villa-plaster", color: "#f4e6d0", repeat: [1, 1] },
      4: { set: "villa-plaster", color: "#f3d9bb", repeat: [1, 1] },
      5: { set: "villa-plaster", color: "#fffaf2", repeat: [1, 1] },
    },
    dressing: [
      ["planter_box_01", 0.42],
      ["planter_box_02", 0.48],
      ["planter_box_03", 0.66],
      ["painted_wooden_bench", 0.5],
      ["ceramic_vase_01", 0.44, 2.2],
      ["planter_pot_clay", 0.5, 2],
      ["concrete_cat_statue", 0.4, 1.6],
    ],
  },
  skyport: {
    kit: "arena-skyport-kit-v1",
    props: "arena-skyport-props-v1",
    pieces: { 2: "uld", 3: "pallets" },
    materials: {
      aluminium: { set: "aluminium", color: "#ffffff", metalness: 0.75, normalScale: 0.6 },
      rail: { color: "#5d6266", metalness: 0.6, roughness: 0.5 },
      curtain: { color: "#2a5c96", roughness: 0.85 },
      strap: { color: "#e8b13a", roughness: 0.7 },
      cardboard: { set: "cardboard", color: "#ffffff" },
      wood: { set: "crate-wood", color: "#c9b089" },
      cone: { color: "#ff5a14", roughness: 0.55 },
      reflect: { color: "#f2f2f2", roughness: 0.35 },
      rubber: { color: "#1b1b1b", roughness: 0.9 },
    },
    ground: { set: "apron-concrete", tile: 6, color: "#f2f2ee" },
    // Airside and compound walls in poured concrete; the terminal in pale
    // cladding. The aircraft cabin (type 6) keeps its own look.
    walls: {
      1: { set: "apron-concrete", color: "#eceae4", repeat: [1, 1] },
      5: { set: "terminal-panel", color: "#ffffff", repeat: [1, 1] },
    },
    dressing: [
      ["prop-cone", 0.42],
      ["prop-cone", 0.42],
      ["vintage_suitcase", 0.3],
      ["WetFloorSign_01", 0.36],
      ["metal_trash_can", 0.56],
      ["utility_box_01", 0.45],
      ["plastic_crate_02", 0.42],
      ["cardboard_box_01", 0.5],
      ["concrete_road_barrier", 0.64],
    ],
  },
};

/** One arena's art: kit pieces, surfaces and props. */
class ArenaStyle {
  constructor(r, id, asset, version) {
    this.r = r;
    this.id = id;
    this.config = ARENAS[id];
    this.asset = asset;
    this.version = version;
    this.ready = false;
    this.failed = false;
    this.loading = null;
    this.sets = new Map();
  }
  /** Start loading (once). Resolves when the arena can be rebuilt. */
  load() {
    if (this.loading) return this.loading;
    const r = this.r,
      config = this.config,
      hd = r.g.academy?.preset === "high",
      url = (path) => `${this.asset}${path}?assetVersion=${this.version}`,
      loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
      textures = new THREE.TextureLoader();
    const tex = async (name, color) => {
      const t = await textures.loadAsync(url(`textures/arena/${hd ? "hd/" : ""}${name}.jpg`));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = r.renderer.capabilities.getMaxAnisotropy();
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      // Kept on the GPU across arena rebuilds; released with the renderer.
      t.userData.sharedSource = true;
      r.textures.add(t);
      return t;
    };
    const set = async (name) => {
      if (!this.sets.has(name))
        this.sets.set(
          name,
          Promise.all([tex(`${name}-color`, true), tex(`${name}-normal`), tex(`${name}-roughness`)]).then(
            ([map, normalMap, roughnessMap]) => ({ map, normalMap, roughnessMap }),
          ),
        );
      return this.sets.get(name);
    };
    const names = new Set(
      [
        ...Object.values(config.materials),
        ...Object.values(config.walls),
        config.ground,
      ]
        .map((m) => m.set)
        .filter(Boolean),
    );
    this.loading = (async () => {
      const [kit, props] = await Promise.all([
        loader.loadAsync(url(`models/${config.kit}.glb`)),
        loader.loadAsync(url(`models/${config.props}.glb`)),
        ...[...names].map(set),
      ]);
      const material = (spec) => {
        const m = new THREE.MeshStandardMaterial({
          vertexColors: true,
          metalness: spec.metalness ?? 0,
          roughness: spec.roughness ?? 1,
          color: spec.color,
        });
        if (spec.normalScale != null) m.normalScale.set(spec.normalScale, spec.normalScale);
        m.userData.world = true;
        r.materials.add(m);
        return m;
      };
      this.materials = {};
      for (const [name, spec] of Object.entries(config.materials)) {
        const m = material(spec);
        if (spec.set) Object.assign(m, await set(spec.set));
        this.materials[name] = m;
      }
      // Kit pieces: one geometry per material, keyed by piece name (the
      // top-level node). Pieces named prop-* are small props, not walls.
      this.pieces = {};
      this.props = new Map();
      kit.scene.updateMatrixWorld(true);
      kit.scene.traverse((o) => {
        if (!o.isMesh) return;
        let top = o;
        while (top.parent && top.parent !== kit.scene) top = top.parent;
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        // Baked occlusion is kept soft: contact shading, not a dark wash.
        const ao = g.getAttribute("color");
        if (ao)
          for (let i = 0; i < ao.count; i++) {
            const v = 0.55 + 0.45 * ao.getX(i);
            ao.setXYZ(i, v, v, v);
          }
        const part = { geometry: g, material: this.materials[o.material.name] || this.materials[Object.keys(this.materials)[0]] };
        if (top.name.startsWith("prop-")) {
          if (!this.props.has(top.name)) this.props.set(top.name, new THREE.Group());
          const mesh = new THREE.Mesh(g, part.material);
          mesh.castShadow = hd;
          this.props.get(top.name).add(mesh);
        } else (this.pieces[top.name] ||= []).push(part);
      });
      // Props: one group per asset, merged parts kept as separate meshes.
      // Their shadows cost a second pass of every triangle; only High pays it.
      props.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = hd;
          o.receiveShadow = true;
          o.material.userData.world = true;
        }
      });
      for (const child of props.scene.children) {
        const id = child.name.split("--")[0];
        if (!this.props.has(id)) this.props.set(id, new THREE.Group());
        this.props.get(id).add(child.clone());
      }
      this.wallMaterials = {};
      for (const [type, spec] of Object.entries(config.walls)) {
        const m = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 1, metalness: 0 });
        const textures = await set(spec.set);
        for (const key of ["map", "normalMap", "roughnessMap"]) {
          const t = textures[key].clone();
          t.repeat.set(...spec.repeat);
          t.userData.sharedSource = true;
          t.needsUpdate = true;
          r.textures.add(t);
          m[key] = t;
        }
        // A finished masonry/plaster surface: no steel panel fittings.
        m.userData.world = true;
        m.userData.realismSurface = true;
        r.materials.add(m);
        this.wallMaterials[type] = m;
      }
      this.groundSet = await set(config.ground.set);
      this.ready = true;
    })().catch((error) => {
      // Not an asset error: the classic arena is a complete fallback.
      console.warn(`Arena art unavailable (${this.id})`, error);
      this.failed = true;
    });
    return this.loading;
  }
}

/** All arena art passes; the renderer asks it by arena id. */
export class ArenaStyles {
  constructor(r, asset, version) {
    this.r = r;
    this.asset = asset;
    this.version = version;
    this.styles = new Map(Object.keys(ARENAS).map((id) => [id, new ArenaStyle(r, id, asset, version)]));
  }
  /** The arena's style when it has one (training keeps the classic yard). */
  of(id) {
    return this.r.g.mode === "training" ? null : this.styles.get(id) || null;
  }
  /** Woven sack cloth for sandbag barriers in every arena. Untextured tan
   * until the cloth texture arrives; kept for the renderer's lifetime. */
  sandbagMaterial() {
    if (this.sandbag) return this.sandbag;
    const r = this.r,
      m = new THREE.MeshStandardMaterial({ color: "#b39d78", vertexColors: true, roughness: 1, metalness: 0 });
    r.materials.add(m);
    const hd = r.g.academy?.preset === "high",
      loader = new THREE.TextureLoader(),
      url = (k) => `${this.asset}textures/arena/${hd ? "hd/" : ""}sandbag-${k}.jpg?assetVersion=${this.version}`;
    Promise.all(["color", "normal", "roughness"].map((k) => loader.loadAsync(url(k))))
      .then(([map, normalMap, roughnessMap]) => {
        for (const t of [map, normalMap, roughnessMap]) {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(2, 2);
          t.anisotropy = r.renderer.capabilities.getMaxAnisotropy();
          t.userData.sharedSource = true;
          r.textures.add(t);
        }
        map.colorSpace = THREE.SRGBColorSpace;
        Object.assign(m, { map, normalMap, roughnessMap });
        m.color.set("#ffffff");
        m.needsUpdate = true;
      })
      .catch(() => {});
    return (this.sandbag = m);
  }
  readyFor(id) {
    return !!this.of(id)?.ready;
  }
  load(id) {
    return this.styles.get(id)?.load();
  }
  owns(id, type) {
    const style = this.of(id);
    return !!(style?.ready && style.config.pieces[type]);
  }
  /** A themed box-wall material for this wall type, or null. */
  wallMaterial(id, type) {
    const style = this.of(id),
      m = (style?.ready && style.wallMaterials[type]) || null;
    // A world rebuild releases world materials; keep tracking ours.
    if (m) this.r.materials.add(m);
    return m;
  }
  /** Instanced kit pieces for every tile of one wall type. */
  walls(id, type, tiles) {
    const style = this.of(id),
      parts = style?.pieces?.[style.config.pieces[type]];
    if (!parts) return [];
    const dummy = new THREE.Object3D();
    return parts.map(({ geometry, material }) => {
      this.r.materials.add(material);
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
  /** The arena's photographed floor, tiled every `ground.tile` metres. */
  ground(id, material, n) {
    const style = this.of(id);
    if (!style?.groundSet) return;
    const { tile, color } = style.config.ground,
      repeat = (n * SCALE) / tile;
    // One tiled copy per arena, kept across rebuilds like the sources.
    style.groundTiles ||= Object.fromEntries(
      ["map", "normalMap", "roughnessMap"].map((key) => {
        const t = style.groundSet[key].clone();
        t.repeat.set(repeat, repeat);
        t.userData.sharedSource = true;
        t.needsUpdate = true;
        this.r.textures.add(t);
        return [key, t];
      }),
    );
    for (const key of ["map", "normalMap", "roughnessMap"]) {
      material[key] = style.groundTiles[key];
    }
    material.color.set(color);
    material.normalScale.set(1, 1);
    material.needsUpdate = true;
  }
  /** Small props against wall bases. Deterministic, never inside a lane. */
  dress(id, root, level) {
    const style = this.of(id);
    if (!style?.props?.size) return;
    const list = style.config.dressing,
      n = level.length,
      open = (x, y) => level[y]?.[x] === 0;
    let seed = 1234;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const group = new THREE.Group();
    group.name = "Arena props";
    for (let y = 1; y < n - 1; y++)
      for (let x = 1; x < n - 1; x++) {
        if (!open(x, y) || rand() > 0.13) continue;
        const walls = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => !open(x + dx, y + dy));
        // Only along a single wall, in lanes at least two tiles wide.
        if (walls.length !== 1) continue;
        const [dx, dy] = walls[0];
        if (!open(x - dx, y - dy)) continue;
        const [asset, depth, scale = 1] = list[Math.floor(rand() * list.length)];
        const source = style.props.get(asset);
        if (!source) continue;
        const prop = source.clone();
        prop.scale.setScalar(scale);
        const along = (rand() - 0.5) * 0.6;
        const px = x + 0.5 + dx * (0.5 - depth / SCALE / 2 - 0.02) + (dy ? along : 0),
          py = y + 0.5 + dy * (0.5 - depth / SCALE / 2 - 0.02) + (dx ? along : 0);
        prop.position.set(px * SCALE, 0, py * SCALE);
        prop.rotation.y = Math.atan2(dx, dy) + (rand() - 0.5) * 0.6;
        group.add(prop);
      }
    root.add(group);
    // Repeated props share geometry: draw each kind as one instanced batch.
    batchStaticByMaterial(group);
    return group;
  }
}
