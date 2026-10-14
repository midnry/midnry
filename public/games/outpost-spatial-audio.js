/** Shared positional response for game effects and opt-in voice. No role data. */
export function spatialSound(listener, source, visible = true, range = 10) {
  const dx = source.x - listener.x,
    dy = source.y - listener.y,
    d = Math.hypot(dx, dy);
  if (!Number.isFinite(d) || d >= range) return { gain: 0, pan: 0, cutoff: 900 };
  const fade = (1 - d / range) ** 2;
  return {
    gain: fade * (visible ? 1 : 0.24),
    pan: Math.sin(Math.atan2(dy, dx) - (listener.a || 0)),
    cutoff: visible ? 10000 : 850,
  };
}
export function voicePosition(view, id, listener, visible = true) {
  const e = view?.entities?.find((e) => e.id === id),
    p = view?.protocol;
  if (!e || e.hp <= 0 || e.departed || !p) return { gain: 0, pan: 0, cutoff: 900 };
  if (["discussion", "vote"].includes(p.phase) && !(p.sabotage?.commsUntil > view.time))
    return { gain: 1, pan: 0, cutoff: 12000 };
  return spatialSound(listener, e, visible, 5.5);
}
/** Explicit little-endian wire format, bounded to one 80 ms speech frame. */
export function encodeVoiceFrame(samples) {
  if (samples.length !== 1280) return null;
  const bytes = new Uint8Array(2560),
    view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i], true);
  return btoa(String.fromCharCode(...bytes));
}
export function decodeVoiceFrame(pcm) {
  if (typeof pcm !== "string" || pcm.length !== 3416 || !/^[A-Za-z0-9+/]+={0,2}$/.test(pcm))
    return null;
  const raw = atob(pcm);
  if (raw.length !== 2560) return null;
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0)),
    view = new DataView(bytes.buffer),
    samples = new Float32Array(1280);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
}
