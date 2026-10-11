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
