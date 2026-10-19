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
export function cinematicRenderSize(cssWidth, cssHeight, dpr, options, profile, scale = 1) {
  const density = Math.max(1, Math.min(2, Number.isFinite(dpr) ? dpr : 1));
  const physicalWidth = cssWidth * density;
  const adaptiveScale = options.adaptive ? Math.max(0.5, Math.min(1.5, scale)) : 1;
  // Phones retain the pre-Retina default in either orientation. Extra desktop
  // pixels must not silently quadruple a phone's fragment work at startup.
  const phone = Math.min(cssWidth, cssHeight) < 600;
  const baseWidth = phone
    ? Math.min(cssWidth, options.width)
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
