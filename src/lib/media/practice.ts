export async function makePracticeClip(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn’t draw a practice clip.");

  const canvasStream = canvas.captureStream(30);
  const audioCtx = new AudioContext();
  await audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const dest = audioCtx.createMediaStreamDestination();
  osc.type = "sine";
  osc.frequency.setValueAtTime(196, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(247, audioCtx.currentTime + 2.2);
  gain.gain.value = 0.06;
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  const mixed = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
    ? "video/webm;codecs=vp8,opus"
    : "video/webm";
  const recorder = new MediaRecorder(mixed, { mimeType: mime, videoBitsPerSecond: 2_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start();

  const started = performance.now();
  await new Promise<void>((resolve) => {
    const draw = () => {
      const t = (performance.now() - started) / 1000;
      const shift = (t / 2.2) * canvas.height;
      ctx.fillStyle = "#0c0c0d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#232328";
      ctx.fillRect(0, shift * 0.35, canvas.width, 220);
      ctx.fillStyle = "#d7dde6";
      ctx.fillRect(80, 180 + Math.sin(t * 3) * 24, canvas.width - 160, 18);
      ctx.fillStyle = "#b7c3d0";
      ctx.fillRect(80, 980, 28, 160);
      ctx.fillRect(canvas.width - 108, 980, 28, 160);
      ctx.fillStyle = "#f3f3f4";
      ctx.fillRect(108, 1036, canvas.width - 216, 48);
      ctx.fillStyle = "#f3f3f4";
      ctx.font = "600 64px Georgia, serif";
      ctx.fillText("Spool", 80, 640);
      ctx.fillStyle = "#a5a5ae";
      ctx.font = "400 28px sans-serif";
      ctx.fillText("Practice clip", 80, 700);
      if (t < 2.15) requestAnimationFrame(draw);
      else resolve();
    };
    draw();
  });

  recorder.stop();
  await stopped;
  osc.stop();
  mixed.getTracks().forEach((track) => track.stop());
  await audioCtx.close();

  const blob = new Blob(chunks, { type: "video/webm" });
  if (blob.size < 1000) throw new Error("The practice clip came out empty.");
  return new File([blob], "practice-clip.webm", { type: "video/webm" });
}
