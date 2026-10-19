/** Shared world-space typography. Original canvas artwork; no new downloads.
 * Font loading is optional and bounded, so an unavailable face never blocks play. */
import * as THREE from "three";

export async function prepareWorldTypography(r) {
  const fonts = document.fonts;
  let timer;
  try {
    if (fonts)
      await Promise.race([
        Promise.all([
          fonts.load('600 64px "Barlow Condensed"'),
          fonts.load('700 64px "Barlow Condensed"'),
        ]).then(() => fonts.ready),
        new Promise((resolve) => {
          timer = setTimeout(resolve, 3000);
        }),
      ]);
  } catch (error) {
    console.warn("Outpost world text: using the installed font fallback.", error);
  } finally {
    clearTimeout(timer);
  }
  const loaded =
    !!fonts?.check('700 64px "Barlow Condensed"') &&
    [...fonts].some(
      (f) => f.family.replaceAll('"', "") === "Barlow Condensed" && f.status === "loaded",
    );
  r.worldTypography = {
    family: loaded
      ? '"Barlow Condensed", "Arial Narrow", sans-serif'
      : '"Arial Narrow", Arial, sans-serif',
    loaded,
  };
}

export function displayFont(r, size, weight = 700) {
  return `${weight} ${size}px ${r.worldTypography?.family || '"Arial Narrow", Arial, sans-serif'}`;
}

/** Fit by changing font size, never by fillText(maxWidth)'s glyph stretching. */
export function fitDisplay(r, c, text, size, width, min = size * 0.55) {
  let px = size;
  do {
    c.font = displayFont(r, px);
    if (c.measureText(text).width <= width) break;
    px -= 2;
  } while (px > min);
  return px;
}

/** Atlas cells can have a different aspect from their physical panel. Paint
 * in the panel's virtual coordinates so mapping the row does not stretch type. */
export function drawAtlasText(r, c, text, { y, width = 1024, height = 64, aspect, margin = 26 }) {
  const virtualHeight = width / aspect;
  c.save();
  c.translate(0, y);
  c.scale(1, height / virtualHeight);
  fitDisplay(r, c, text, virtualHeight * 0.6, width - margin * 2);
  c.textBaseline = "middle";
  c.fillText(text, margin, virtualHeight * 0.5);
  c.restore();
}

export function textTexture(r, canvas, name, { world = false, metadata } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.name = name;
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = r.renderer.capabilities.getMaxAnisotropy();
  if (metadata) t.userData.worldText = metadata;
  r.textures.add(t);
  if (world) r.worldTextures.add(t);
  return t;
}

/** Low-level self illumination preserves letter contrast, below bloom's HDR
 * threshold. Power loss still dims it; this is not an unlit white overlay. */
export function registerTextMaterial(r, material, intensity = 0.22) {
  material.userData.textEmission = intensity;
  (r.protocolSignMaterials ||= new Set()).add(material);
  return material;
}
export function signMaterial(r, texture, { world = true, intensity = 0.22 } = {}) {
  const material = (world ? r.protocolMaterial.bind(r) : r.material.bind(r))({
    map: texture,
    emissiveMap: texture,
    emissive: "#dce5df",
    emissiveIntensity: intensity,
    color: "#ffffff",
    roughness: 0.9,
    metalness: 0,
  });
  return registerTextMaterial(r, material, intensity);
}

export function makeProtocolSign(r, title, subtitle, color, size) {
  const [w, h] = size;
  const canvas = document.createElement("canvas");
  // 2× the previous 768px artwork is already denser than these panels' screen
  // coverage at 2–3m. Avoid duplicating 2K canvases for all 45 base labels.
  canvas.width = Math.min(r.profile.maxTextureSize, 1536);
  canvas.height = Math.min(r.profile.maxTextureSize, Math.round((canvas.width * h) / w));
  const c = canvas.getContext("2d"),
    W = canvas.width,
    H = canvas.height;
  c.fillStyle = "#18272b";
  c.fillRect(0, 0, W, H);
  c.fillStyle = color;
  c.fillRect(0, 0, Math.max(8, W * 0.014), H);
  const margin = W * 0.045,
    available = W - margin * 2;
  const text = title.toUpperCase(),
    sub = subtitle.toUpperCase();
  // Compact cabinet plates are one clear line rather than two illegible lines.
  const single = h < 0.5 || w / h > 8;
  // A compact plate can carry a long task name. Fit its complete title rather
  // than clipping at fitDisplay's normal minimum size after dropping line two.
  let titlePx = fitDisplay(r, c, text, H * (single ? 0.62 : 0.42), available, 1);
  const titleWidth = c.measureText(text).width;
  const subPx = Math.ceil(titlePx * 0.6);
  c.textBaseline = "middle";
  c.fillStyle = "#e3eee9";
  c.fillText(text, margin, H * (single ? 0.51 : 0.35));
  let secondary = false;
  if (!single && sub) {
    c.font = displayFont(r, subPx, 600);
    if (c.measureText(sub).width <= available) {
      c.fillStyle = color;
      c.fillText(sub, margin, H * 0.76);
      secondary = true;
    }
  }
  const metadata = {
    title,
    subtitle: secondary ? subtitle : "",
    font: r.worldTypography?.family,
    titlePx,
    titleWidth,
    availableWidth: available,
    subtitlePx: secondary ? subPx : 0,
    worldSize: size,
  };
  return signMaterial(r, textTexture(r, canvas, "Sign / " + title, { world: true, metadata }));
}
