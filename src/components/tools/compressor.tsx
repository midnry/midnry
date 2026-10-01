import { useEffect, useState } from "react";
import { Button, fieldClass } from "@/components/ui";
import { ToolFrame } from "@/components/tools/shared";

type Preset = "small" | "balanced" | "clear";

const PRESETS: Record<Preset, { label: string; scale: number; maxEdge: number; bits: number }> = {
  small: { label: "Small", scale: 0.5, maxEdge: 854, bits: 700_000 },
  balanced: { label: "Balanced", scale: 0.72, maxEdge: 1280, bits: 1_400_000 },
  clear: { label: "Clear", scale: 1, maxEdge: 1920, bits: 2_800_000 },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset>("balanced");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  async function compress() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    try {
      const blob = await squeeze(file, preset, setProgress);
      setResult({ url: URL.createObjectURL(blob), size: blob.size });
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not compress that video.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolFrame slug="compressor">
      <div className="max-w-xl space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Video</span>
          <input
            type="file"
            accept="video/*"
            className={fieldClass}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setError(null);
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Size</span>
          <select
            className={fieldClass}
            value={preset}
            onChange={(event) => setPreset(event.target.value as Preset)}
          >
            {(Object.keys(PRESETS) as Preset[]).map((id) => (
              <option key={id} value={id}>
                {PRESETS[id].label}
              </option>
            ))}
          </select>
        </label>
        {file ? (
          <p className="text-sm text-muted">
            {file.name} · {formatBytes(file.size)}
          </p>
        ) : null}
        {progress !== null ? (
          <p className="text-sm text-pine">Compressing… {Math.round(progress * 100)}%</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-fail">
            {error}
          </p>
        ) : null}
        <Button tone="primary" disabled={!file || busy} onClick={() => void compress()}>
          {busy ? "Working…" : "Compress"}
        </Button>
        {result && file ? (
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-sm">
              {formatBytes(file.size)} → {formatBytes(result.size)}
              {file.size > 0 ? ` · ${Math.round((1 - result.size / file.size) * 100)}% smaller` : ""}
            </p>
            <a
              href={result.url}
              download={file.name.replace(/\.[^.]+$/, "") + "-small.webm"}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-pine underline"
            >
              Download WebM
            </a>
          </div>
        ) : null}
        <p className="text-sm text-pretty text-muted">
          It runs in this browser, so a long video takes about as long as it plays. The smaller file is WebM.
        </p>
      </div>
    </ToolFrame>
  );
}

function squeeze(file: File, preset: Preset, onProgress: (value: number) => void): Promise<Blob> {
  const spec = PRESETS[preset];
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true;
    video.src = url;

    const fail = (message: string) => {
      URL.revokeObjectURL(url);
      reject(new Error(message));
    };

    video.onerror = () => fail("This browser could not read that video.");
    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        fail("That video has no length to compress.");
        return;
      }
      const ratio = Math.min(spec.scale, spec.maxEdge / Math.max(video.videoWidth, video.videoHeight, 1));
      const width = Math.max(2, Math.round(video.videoWidth * ratio));
      const height = Math.max(2, Math.round(video.videoHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width - (width % 2);
      canvas.height = height - (height % 2);
      const ctx = canvas.getContext("2d");
      const capture = canvas.captureStream(30);
      if (!ctx || !capture) {
        fail("This browser cannot re-encode video.");
        return;
      }
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";
      if (!mime) {
        fail("This browser cannot write a WebM file.");
        return;
      }
      const recorder = new MediaRecorder(capture, { mimeType: mime, videoBitsPerSecond: spec.bits });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => fail("Compression stopped.");
      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        resolve(new Blob(chunks, { type: mime }));
      };

      const draw = () => {
        if (video.ended || video.paused) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        onProgress(Math.min(0.99, video.currentTime / duration));
        requestAnimationFrame(draw);
      };
      video.onended = () => {
        onProgress(1);
        if (recorder.state !== "inactive") recorder.stop();
      };
      recorder.start(250);
      void video.play().then(draw).catch(() => fail("Playback was blocked."));
    };
  });
}
