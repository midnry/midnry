export const COMPRESS_PRESETS = [
  {
    id: "small",
    name: "Small",
    note: "720p · 1.5 Mbps",
    maxLong: 1280,
    videoBps: 1_500_000,
    audioBps: 96_000,
  },
  {
    id: "balanced",
    name: "Balanced",
    note: "1080p · 4 Mbps",
    maxLong: 1920,
    videoBps: 4_000_000,
    audioBps: 128_000,
  },
  {
    id: "crisp",
    name: "Crisp",
    note: "1080p · 8 Mbps",
    maxLong: 1920,
    videoBps: 8_000_000,
    audioBps: 192_000,
  },
  {
    id: "high",
    name: "High",
    note: "1080p · 12 Mbps",
    maxLong: 1920,
    videoBps: 12_000_000,
    audioBps: 256_000,
  },
] as const;

export type CompressPresetId = (typeof COMPRESS_PRESETS)[number]["id"];

function even(n: number): number {
  const rounded = Math.max(2, Math.round(n));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

export function fitKeep(width: number, height: number, maxLong: number) {
  const long = Math.max(width, height) || 1;
  const scale = long > maxLong ? maxLong / long : 1;
  return {
    width: even(width * scale),
    height: even(height * scale),
  };
}
