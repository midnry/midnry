const CODEC_NAMES: Record<string, string> = {
  avc: "H.264",
  hevc: "H.265",
  vp9: "VP9",
  vp8: "VP8",
  av1: "AV1",
  aac: "AAC",
  opus: "Opus",
  mp3: "MP3",
};

export function codecName(codec: string | null | undefined): string {
  if (!codec) return "";
  return CODEC_NAMES[codec] ?? codec.toUpperCase();
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;
  const units = ["KB", "MB", "GB"] as const;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 10 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function stemName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "clip";
  return base.slice(0, 48);
}

export function savedPercent(before: number, after: number): number | null {
  if (before <= 0 || after >= before) return null;
  return Math.round((1 - after / before) * 100);
}
