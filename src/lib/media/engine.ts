export type Probe = {
  duration: number;
  width: number;
  height: number;
  videoCodec: string | null;
  audioCodec: string | null;
  hasVideo: boolean;
  hasAudio: boolean;
  mime: string;
};

export type OutputKind = "mp4" | "mov" | "webm" | "m4a" | "mp3" | "wav";

export type JobSpec = {
  file: File;
  kind: OutputKind;
  filename: string;
  video?: {
    discard?: boolean;
    width?: number;
    height?: number;
    fit?: "contain" | "cover" | "fill";
    bitrate?: number;
    codec?: "avc" | "vp8" | "vp9";
    keyFrameInterval?: number;
  };
  audio?: {
    discard?: boolean;
    bitrate?: number;
    codec?: "aac" | "mp3" | "opus" | "pcm-s16";
  };
  onProgress?: (progress: number) => void;
  registerCancel?: (cancel: () => Promise<void>) => void;
};

const MIME: Record<OutputKind, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

function safeFilename(name: string, kind: OutputKind): string {
  const cleaned = name.replace(/[^\w.\- ()]+/g, "").trim() || "spool";
  const ext = `.${kind === "m4a" ? "m4a" : kind}`;
  return cleaned.toLowerCase().endsWith(ext) ? cleaned : `${cleaned}${ext}`;
}

function failureMessage(reasons: string[]): string {
  if (reasons.includes("undecodable_source_codec") || reasons.includes("unknown_source_codec")) {
    return "This browser can’t read that codec. Try an H.264 MP4.";
  }
  if (reasons.includes("no_encodable_target_codec")) {
    return "This browser can’t encode that format. MP4 is the reliable choice.";
  }
  return "Couldn’t process that file in this browser.";
}

async function ensureMp3Encoder(): Promise<void> {
  const { canEncodeAudio } = await import("mediabunny");
  if (await canEncodeAudio("mp3")) return;
  const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
  registerMp3Encoder();
}

export async function probeMedia(file: File): Promise<Probe> {
  const { Input, ALL_FORMATS, BlobSource } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    if (!(await input.canRead())) {
      throw new Error("Midnry can’t read that file. Try MP4, MOV, WebM, or WAV.");
    }
    const [video, audio, mime, metaDuration] = await Promise.all([
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
      input.getMimeType(),
      input.getDurationFromMetadata(),
    ]);
    const duration = metaDuration ?? (await input.computeDuration());
    const width = video ? await video.getDisplayWidth() : 0;
    const height = video ? await video.getDisplayHeight() : 0;
    const videoCodec = video ? await video.getCodec() : null;
    const audioCodec = audio ? await audio.getCodec() : null;
    return {
      duration: Number.isFinite(duration) ? duration : 0,
      width,
      height,
      videoCodec,
      audioCodec,
      hasVideo: Boolean(video),
      hasAudio: Boolean(audio),
      mime,
    };
  } finally {
    input.dispose();
  }
}

async function chooseAudioCodec(
  kind: OutputKind,
  preferred: NonNullable<JobSpec["audio"]>["codec"],
): Promise<NonNullable<JobSpec["audio"]>["codec"] | null> {
  if (!preferred) return null;
  const { canEncodeAudio } = await import("mediabunny");
  const fallbacks: NonNullable<JobSpec["audio"]>["codec"][] =
    kind === "wav"
      ? ["pcm-s16"]
      : kind === "mp3"
        ? ["mp3"]
        : kind === "webm"
          ? ["opus"]
          : ["aac", "mp3", "opus", "pcm-s16"];
  const order = [preferred, ...fallbacks.filter((codec) => codec !== preferred)];
  for (const codec of order) {
    if (!codec) continue;
    if (codec === "mp3") await ensureMp3Encoder();
    if (await canEncodeAudio(codec)) return codec;
  }
  return null;
}

async function prepareSpec(spec: JobSpec): Promise<JobSpec> {
  if (!spec.audio || spec.audio.discard || !spec.audio.codec) {
    if (spec.kind === "mp3" || spec.audio?.codec === "mp3") await ensureMp3Encoder();
    return spec;
  }
  const codec = await chooseAudioCodec(spec.kind, spec.audio.codec);
  if (!codec) throw new Error("This browser can’t encode that audio. Try WAV.");
  if (codec === spec.audio.codec) return spec;
  const next: JobSpec = { ...spec, audio: { ...spec.audio, codec } };
  if (spec.kind === "m4a" && codec === "mp3") {
    next.kind = "mp3";
    next.filename = spec.filename.replace(/\.m4a$/i, ".mp3");
  }
  return next;
}

export async function runJob(spec: JobSpec): Promise<File> {
  const prepared = await prepareSpec(spec);
  const mb = await import("mediabunny");

  const input = new mb.Input({
    source: new mb.BlobSource(prepared.file),
    formats: mb.ALL_FORMATS,
  });

  try {
    const target = new mb.BufferTarget();
    const format =
      prepared.kind === "mp4" || prepared.kind === "m4a"
        ? new mb.Mp4OutputFormat({ fastStart: "in-memory" })
        : prepared.kind === "mov"
          ? new mb.MovOutputFormat({ fastStart: "in-memory" })
          : prepared.kind === "webm"
            ? new mb.WebMOutputFormat()
            : prepared.kind === "mp3"
              ? new mb.Mp3OutputFormat()
              : new mb.WavOutputFormat();

    const output = new mb.Output({ format, target });
    const audioOnly = prepared.kind === "m4a" || prepared.kind === "mp3" || prepared.kind === "wav";
    const video = audioOnly ? { discard: true as const } : toVideoOptions(mb.Quality, prepared.video);
    const audio = toAudioOptions(mb.Quality, prepared.audio);

    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: "primary",
      showWarnings: false,
      ...(video ? { video } : {}),
      ...(audio ? { audio } : {}),
    });

    const lostAudio = conversion.discardedTracks.some(
      (entry) => entry.track.type === "audio" && entry.reason !== "discarded_by_user",
    );
    if (!conversion.isValid || (lostAudio && prepared.audio && !prepared.audio.discard)) {
      throw new Error(failureMessage(conversion.discardedTracks.map((track) => track.reason)));
    }

    conversion.onProgress = (progress) => {
      prepared.onProgress?.(Math.max(0, Math.min(1, progress)));
    };
    prepared.registerCancel?.(() => conversion.cancel());
    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer) throw new Error("The file finished empty. Try a shorter clip.");
    const bytes = new Uint8Array(buffer);
    return new File([bytes], safeFilename(prepared.filename, prepared.kind), {
      type: MIME[prepared.kind],
    });
  } catch (error) {
    if (error instanceof mb.ConversionCanceledError) {
      throw new Error("Canceled");
    }
    if (error instanceof Error && error.message === "Canceled") throw error;
    if (error instanceof Error && error.message) throw error;
    throw new Error("Couldn’t process that file.");
  } finally {
    input.dispose();
  }
}

function toVideoOptions(
  Quality: typeof import("mediabunny").Quality,
  video: JobSpec["video"],
) {
  if (!video) return undefined;
  if (video.discard) return { discard: true as const };
  return {
    ...(video.width ? { width: video.width } : {}),
    ...(video.height ? { height: video.height } : {}),
    ...(video.fit ? { fit: video.fit } : {}),
    ...(video.codec ? { codec: video.codec } : {}),
    ...(video.bitrate
      ? { quality: new Quality({ bitrate: video.bitrate, bitrateMode: "constant" as const }) }
      : {}),
    ...(video.keyFrameInterval ? { keyFrameInterval: video.keyFrameInterval } : {}),
  };
}

function toAudioOptions(
  Quality: typeof import("mediabunny").Quality,
  audio: JobSpec["audio"],
) {
  if (!audio) return undefined;
  if (audio.discard) return { discard: true as const };
  return {
    ...(audio.codec ? { codec: audio.codec } : {}),
    ...(audio.bitrate
      ? { quality: new Quality({ bitrate: audio.bitrate, bitrateMode: "constant" as const }) }
      : {}),
  };
}
