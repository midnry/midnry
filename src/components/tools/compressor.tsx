import { useEffect, useMemo, useRef, useState } from "react";
import { Button, cn } from "@/components/ui";
import { ToolFrame } from "@/components/tools/shared";
import { probeMedia, runJob, type Probe } from "@/lib/media/engine";
import { makePracticeClip } from "@/lib/media/practice";
import { COMPRESS_PRESETS, fitKeep, type CompressPresetId } from "@/lib/media/profiles";
import { codecName, formatBytes, formatDuration, savedPercent, stemName } from "@/lib/media/format";

type Clip = { file: File; probe: Probe };

export function CompressorTool() {
  const [clip, setClip] = useState<Clip | null>(null);
  const [presetId, setPresetId] = useState<CompressPresetId>("balanced");
  const [busy, setBusy] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "run" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<File | null>(null);
  const cancelRef = useRef<(() => Promise<void>) | null>(null);
  const token = useRef(0);
  const preset = COMPRESS_PRESETS.find((item) => item.id === presetId) ?? COMPRESS_PRESETS[1];

  const estimate = useMemo(() => {
    if (!clip?.probe.hasVideo || clip.probe.duration <= 0 || !preset) return null;
    const audio = clip.probe.hasAudio ? preset.audioBps : 0;
    return ((preset.videoBps + audio) * clip.probe.duration) / 8;
  }, [clip, preset]);

  async function take(file: File | undefined) {
    if (!file) return;
    setBusy("Reading the file…");
    setPickError(null);
    try {
      const probe = await probeMedia(file);
      if (!probe.hasVideo) throw new Error("That file has no picture. Choose a video.");
      setClip({ file, probe });
      token.current += 1;
      void cancelRef.current?.();
      setStatus("idle");
      setResult(null);
      setError(null);
      setProgress(0);
    } catch (caught) {
      setPickError(caught instanceof Error ? caught.message : "Couldn’t read that file.");
    } finally {
      setBusy(null);
    }
  }

  async function practice() {
    setBusy("Making a 2-second practice clip…");
    setPickError(null);
    try {
      await take(await makePracticeClip());
    } catch (caught) {
      setPickError(caught instanceof Error ? caught.message : "Couldn’t make a practice clip.");
      setBusy(null);
    }
  }

  async function compress() {
    if (!clip?.probe.hasVideo || !preset) return;
    const my = ++token.current;
    setStatus("run");
    setProgress(0);
    setError(null);
    setResult(null);
    const size = fitKeep(clip.probe.width, clip.probe.height, preset.maxLong);
    try {
      const file = await runJob({
        file: clip.file,
        kind: "mp4",
        filename: `${stemName(clip.file.name)}.mp4`,
        video: { ...size, bitrate: preset.videoBps, codec: "avc", keyFrameInterval: 2 },
        audio: clip.probe.hasAudio ? { codec: "aac", bitrate: preset.audioBps } : undefined,
        onProgress: (value) => {
          if (token.current === my) setProgress(value);
        },
        registerCancel: (cancel) => {
          cancelRef.current = cancel;
        },
      });
      if (token.current !== my) return;
      setResult(file);
      setStatus("done");
      setProgress(1);
    } catch (caught) {
      if (token.current !== my) return;
      const message = caught instanceof Error ? caught.message : "Couldn’t process that file.";
      if (message === "Canceled") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setError(message);
    }
  }

  return (
    <ToolFrame slug="compressor">
      <div className="flex max-w-xl flex-col gap-4">
        <ClipField clip={clip} busy={busy} error={pickError} onTake={take} onPractice={practice} />
        <div className="grid grid-cols-2 gap-2">
          {COMPRESS_PRESETS.map((item) => {
            const active = item.id === presetId;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPresetId(item.id)}
                className={cn(
                  "rounded-2xl px-3 py-3 text-left",
                  active ? "bg-pine text-paper" : "bg-card text-ink shadow-line",
                )}
              >
                <span className="block text-sm font-medium">{item.name}</span>
                <span className={cn("mt-1 block text-sm", active ? "text-paper/75" : "text-muted")}>{item.note}</span>
              </button>
            );
          })}
        </div>
        {estimate !== null ? (
          <p className="text-sm tabular-nums text-muted">About {formatBytes(estimate)} after audio.</p>
        ) : null}
        <Button tone="primary" onClick={() => void compress()} disabled={!clip?.probe.hasVideo || status === "run"}>
          Compress to MP4
        </Button>
        <Result
          status={status}
          progress={progress}
          error={error}
          result={result}
          before={clip?.file.size}
          onCancel={() => void cancelRef.current?.()}
        />
      </div>
    </ToolFrame>
  );
}

function ClipField({
  clip,
  busy,
  error,
  onTake,
  onPractice,
}: {
  clip: Clip | null;
  busy: string | null;
  error: string | null;
  onTake: (file: File | undefined) => void;
  onPractice: () => void;
}) {
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!clip) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(clip.file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [clip]);

  return (
    <div className="flex flex-col gap-4">
      <label
        className={cn("block rounded-2xl bg-card p-4 shadow-line", over && "outline outline-2 outline-pine")}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          onTake(event.dataTransfer.files[0]);
        }}
      >
        <input
          className="sr-only"
          type="file"
          accept="video/*,.mkv,.mov,.mp4,.webm,.m4v"
          onChange={(event) => {
            onTake(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <span className="block font-medium">{clip ? clip.file.name : "Choose a video"}</span>
        <span className="mt-1 block text-sm text-muted">{busy ?? "Stays on this device. Nothing is uploaded."}</span>
      </label>
      <Button tone="quiet" onClick={onPractice} disabled={Boolean(busy)}>
        Use a practice clip
      </Button>
      {error ? <p className="text-sm text-fail">{error}</p> : null}
      {clip && url ? (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line">
            {[
              ["Length", formatDuration(clip.probe.duration)],
              ["Size", formatBytes(clip.file.size)],
              ["Frame", `${clip.probe.width}×${clip.probe.height}`],
              ["Codec", [codecName(clip.probe.videoCodec), codecName(clip.probe.audioCodec)].filter(Boolean).join(" · ") || "—"],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-3 py-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 truncate text-sm font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <video src={url} controls playsInline className="max-h-96 w-full rounded-2xl bg-card object-contain" />
        </>
      ) : null}
    </div>
  );
}

function Result({
  status,
  progress,
  error,
  result,
  before,
  onCancel,
}: {
  status: "idle" | "run" | "done" | "error";
  progress: number;
  error: string | null;
  result: File | null;
  before?: number;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    if (!result) {
      setUrl(null);
      setCanShare(false);
      return;
    }
    const next = URL.createObjectURL(result);
    setUrl(next);
    setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [result] }));
    return () => URL.revokeObjectURL(next);
  }, [result]);

  if (status === "idle") return null;
  const percent = Math.round(progress * 100);
  const saved = result && before ? savedPercent(before, result.size) : null;

  function download() {
    if (!result || !url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = result.name;
    link.click();
  }

  async function share() {
    if (!result) return;
    setShareNote(null);
    try {
      await navigator.share({ files: [result], title: result.name });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setShareNote("Couldn’t open the share sheet. Download the file instead.");
    }
  }

  return (
    <section className="rounded-2xl bg-card p-4 shadow-line" aria-live="polite">
      {status === "run" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">Working on this device</p>
            <p className="text-sm tabular-nums text-muted">{percent}%</p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-pine" style={{ width: `${percent}%` }} />
          </div>
          <Button tone="quiet" onClick={onCancel}>
            Stop
          </Button>
        </div>
      ) : null}
      {status === "error" && error ? <p className="text-sm text-fail">{error}</p> : null}
      {status === "done" && result ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">{result.name}</p>
            <p className="mt-1 text-sm tabular-nums text-muted">
              {before ? `${formatBytes(before)} → ${formatBytes(result.size)}` : formatBytes(result.size)}
              {saved !== null ? ` · ${saved}% smaller` : ""}
            </p>
          </div>
          {url ? <video src={url} controls playsInline className="max-h-96 w-full rounded-2xl bg-paper-2 object-contain" /> : null}
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" onClick={download}>
              Download
            </Button>
            {canShare ? (
              <Button tone="quiet" onClick={() => void share()}>
                Share
              </Button>
            ) : null}
          </div>
          {shareNote ? <p className="text-sm text-muted">{shareNote}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
