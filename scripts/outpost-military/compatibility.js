// GPU budgets change presentation only; simulation, aim and controls keep their resolution.
export function isAppleTouchDevice(device) {
  return (
    /iPad|iPhone|iPod/.test(device.userAgent || "") ||
    (/Mac/.test(device.platform || "") && device.maxTouchPoints > 1)
  );
}

export function graphicsProfile({
  appleTouch = false,
  safeMode = false,
  halfFloat = true,
  maxTextureSize = 4096,
} = {}) {
  return {
    safeMode,
    halfFloat,
    maxTextureSize,
    maxPixels: safeMode ? 600000 : appleTouch ? 1000000 : 2400000,
    // Extra Apple pixels are earned by the same measured adaptive headroom,
    // rather than allocating a full Retina buffer on every tablet at startup.
    headroomPixels: safeMode ? 600000 : appleTouch ? 1600000 : 2400000,
    maxShadowSize: Math.min(maxTextureSize, safeMode ? 512 : appleTouch ? 1024 : 4096),
    ambientOcclusion: !safeMode && !appleTouch && halfFloat,
    // The home lobby draws one character on a small stage, so it can afford
    // the screen's own density (up to 2×) where a match cannot.
    lobbyPixels: safeMode ? 600000 : appleTouch ? 2000000 : 2600000,
    reflections: !safeMode,
  };
}

export function renderSize(width, height, profile) {
  const scale = Math.min(
    1,
    Math.sqrt(profile.maxPixels / (width * height)),
    profile.maxTextureSize / Math.max(width, height),
  );
  return [Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale))];
}

/** 3D render buffer only. HUD projection/aim and CSS layout retain their
 * existing sizes. Never supersample above the physical display or GPU limits. */
/** Lowest automatic resolution scale. At the old 0.5 a phone drew the 3D
 * view at half its CSS width (195 px across on a 390 px phone): signs and
 * labels a step away were unreadable. Shared with FrameBudget. */
export const MIN_RENDER_SCALE = 0.75;
/** Phones render at 1.25 CSS pixels (never above the physical display):
 * sharper text than the old 1.0 without allocating a full 3× Retina buffer. */
export const PHONE_DENSITY = 1.25;

export function cinematicRenderSize(cssWidth, cssHeight, dpr, options, profile, scale = 1) {
  const density = Math.max(1, Math.min(2, Number.isFinite(dpr) ? dpr : 1));
  const physicalWidth = cssWidth * density;
  const adaptiveScale = options.adaptive ? Math.max(MIN_RENDER_SCALE, Math.min(1.5, scale)) : 1;
  // Extra desktop pixels must not silently quadruple a phone's fragment work
  // at startup: phones get a modest density, capped by the preset width.
  const phone = Math.min(cssWidth, cssHeight) < 600;
  const baseWidth = phone
    ? Math.min(physicalWidth, cssWidth * PHONE_DENSITY, options.militaryWidth || options.width)
    : options.militaryWidth || options.width;
  const width = Math.max(
    1,
    Math.min(physicalWidth, baseWidth * adaptiveScale),
  );
  const height = (width * cssHeight) / Math.max(1, cssWidth);
  const maxPixels = Math.min(
    profile.headroomPixels || profile.maxPixels,
    profile.maxPixels * Math.max(1, adaptiveScale) ** 2,
  );
  return renderSize(width, height, { ...profile, maxPixels });
}

/** Render buffer for the home lobby: the screen's density up to 2×, within
 * the profile's lobby pixel budget. A match is far heavier, so it keeps
 * cinematicRenderSize. Returns null where the lobby should simply use the
 * match buffer (Performance preset, safe mode). */
export function lobbyRenderSize(cssWidth, cssHeight, dpr, profile, preset) {
  if (preset === "performance" || profile.safeMode || !(cssWidth > 0 && cssHeight > 0)) return null;
  const density = Math.max(1, Math.min(2, Number.isFinite(dpr) ? dpr : 1));
  return renderSize(cssWidth * density, cssHeight * density, { ...profile, maxPixels: profile.lobbyPixels || profile.maxPixels });
}
