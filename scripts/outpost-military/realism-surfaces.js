/**
 * Local photographed PBR substrates for the tactical presentation.
 * Source texture sets stay resident for the renderer's lifetime; per-world UV
 * clones are tracked separately so changing maps releases them with clearWorld.
 * Gameplay and roles never select a different material from these photographs.
 */
import * as THREE from "three";
import { ASSET_CACHE } from "../../public/games/outpost-asset-manifest.js";

const ROOT = "/games/military/textures/";
const SURFACES = Object.freeze({
  concrete: { roughness: 0.9, metalness: 0, normal: 0.25 },
  plaster: { roughness: 0.94, metalness: 0, normal: 0.22 },
  brick: { roughness: 0.93, metalness: 0, normal: 0.35 },
  fabric: { roughness: 0.96, metalness: 0, normal: 0.12 },
  wood: { roughness: 0.78, metalness: 0, normal: 0.2 },
  weaponMetal: { roughness: 0.44, metalness: 0.8, normal: 0.16 },
});
const CHANNELS = ["color", "normal", "roughness"];

/** Load all required maps locally. A failed photograph rejects readiness. */
export async function loadRealismSurfaces(r) {
  const loader = new THREE.TextureLoader();
  const sets = Object.create(null);
  const failures = [];
  const anisotropy = Math.min(8, r.renderer.capabilities.getMaxAnisotropy());

  await Promise.all(
    Object.keys(SURFACES).map(async (name) => {
      const maps = { color: null, normal: null, roughness: null };
      sets[name] = maps;
      await Promise.all(
        CHANNELS.map(async (channel) => {
          const path = `textures/realism-${name}-${channel}.jpg`;
          try {
            const texture = await loader.loadAsync(
              ROOT + `realism-${name}-${channel}.jpg?assetVersion=${ASSET_CACHE}`,
            );
            if (r.disposed) {
              texture.dispose();
              return;
            }
            // Diffuse photos contain sRGB color. Normal and roughness maps contain
            // linear data, so applying a display transfer function would distort PBR.
            texture.colorSpace = channel === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = anisotropy;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;
            texture.needsUpdate = true;
            r.textures.add(texture);
            maps[channel] = texture;
          } catch (error) {
            if (r.disposed) return;
            if (!r.assetErrors.includes(path)) r.assetErrors.push(path);
            failures.push(path);
          }
        }),
      );
    }),
  );

  if (r.disposed) return null;
  // Let the game's existing recovery UI handle missing assets. Replacing a
  // photograph with noise or a flat color would conceal an incomplete load.
  if (failures.length) {
    // The UI distinguishes missing files from an unsupported graphics device.
    // Exact failing paths remain in assetErrors for renderer diagnostics.
    throw new Error("assets-unavailable");
  }
  r.realismSurfaces = sets;
  return sets;
}

function cloneForWorld(r, source, u, v) {
  const texture = source.clone();
  texture.repeat.set(u, v);
  texture.needsUpdate = true;
  r.textures.add(texture);
  r.worldTextures.add(texture);
  return texture;
}

/**
 * Make a physically coherent substrate with independent, fixed UV tiling.
 * The caller supplies repeat in photograph tiles, not arbitrary frame scale.
 * Texture cloning preserves authored color space, filtering and anisotropy.
 */
export function surfaceMaterial(r, name, options = {}) {
  const defaults = SURFACES[name];
  const source = r.realismSurfaces?.[name];
  if (!defaults || !source || CHANNELS.some((channel) => !source[channel])) {
    throw new Error(`Realistic surface is unavailable: ${name}`);
  }
  const requested = options.repeat || [1, 1];
  const u = Number.isFinite(requested[0]) && requested[0] > 0 ? requested[0] : 1;
  const v = Number.isFinite(requested[1]) && requested[1] > 0 ? requested[1] : u;
  const strength = THREE.MathUtils.clamp(options.normalStrength ?? defaults.normal, 0, 0.8);
  const material = r.material({
    color: options.color ?? "#ffffff",
    map: cloneForWorld(r, source.color, u, v),
    normalMap: cloneForWorld(r, source.normal, u, v),
    roughnessMap: cloneForWorld(r, source.roughness, u, v),
    normalScale: new THREE.Vector2(strength, strength),
    roughness: THREE.MathUtils.clamp(options.roughness ?? defaults.roughness, 0, 1),
    metalness: THREE.MathUtils.clamp(options.metalness ?? defaults.metalness, 0, 1),
  });
  material.userData.world = true;
  material.userData.realismSurface = name;
  return material;
}
