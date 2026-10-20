/** Last Signal battle music, synthesised live with Web Audio (no recordings,
 * nothing to download or license). A driving minor-key loop at 132 BPM with
 * three intensity levels that the game raises as the round heats up:
 *   0 · stalk  – pulsing bass, muffled kick, ticking hats
 *   1 · hunt   – four-on-the-floor kick, snare, rolling bass, arpeggio
 *   2 · fight  – everything, plus driving 16th hats, a high lead and stabs
 * Changes land on the next bar so the groove never stumbles. */

const BPM = 132;
const STEP = 60 / BPM / 4; // one 16th note
// i – VI – VII – v in D minor: Dm, Bb, C, Am (root, third, fifth as MIDI).
const CHORDS = [
  [50, 53, 57],
  [46, 50, 53],
  [48, 52, 55],
  [45, 48, 52],
];
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class BattleMusic {
  /** `ctx` is any BaseAudioContext; `out` the node the music feeds. */
  constructor(ctx, out) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    // A gentle compressor glues the layers and keeps peaks polite.
    this.glue = ctx.createDynamicsCompressor();
    this.glue.threshold.value = -18;
    this.glue.ratio.value = 3;
    this.bus.connect(this.glue).connect(out);
    const n = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, n, n);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.level = 0;
    this.wanted = 0;
    this.step = 0;
    this.nextAt = 0;
    this.playing = false;
  }
  /** Begin (or keep) playing, fading in over a second. */
  start() {
    if (this.playing) return;
    const t = this.ctx.currentTime;
    this.playing = true;
    this.step = 0;
    this.nextAt = t + 0.08;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(1, t, 0.35);
  }
  /** Fade out and stop scheduling. */
  stop(fade = 0.6) {
    if (!this.playing) return;
    this.playing = false;
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(0, t, fade / 3);
  }
  setIntensity(level) {
    this.wanted = Math.max(0, Math.min(2, level | 0));
  }
  /** Call often (every animation frame is fine): schedules ~0.2 s ahead. */
  pump() {
    if (!this.playing) return;
    const ahead = this.ctx.currentTime + 0.2;
    // After a stall (tab in background), skip ahead rather than catch up.
    if (this.nextAt < this.ctx.currentTime - 0.25) this.nextAt = this.ctx.currentTime + 0.05;
    while (this.nextAt < ahead) {
      this.play(this.step, this.nextAt);
      this.nextAt += STEP;
      this.step = (this.step + 1) % 64;
    }
  }
  /** Everything that sounds on one 16th step (64 steps = 4 bars). */
  play(step, t) {
    const beat = step % 16;
    if (beat === 0) this.level = this.wanted;
    const L = this.level,
      chord = CHORDS[Math.floor(step / 16)];
    // Drums.
    if (L >= 1 ? beat % 4 === 0 : beat === 0 || beat === 10) this.kick(t, L ? 1 : 0.7);
    if (L >= 1 && (beat === 4 || beat === 12)) this.snare(t, 0.55);
    if (L === 2 && step % 32 === 30) this.snare(t, 0.35);
    if (L === 2 && step % 32 === 31) this.snare(t, 0.45);
    if (L === 2 || beat % 2 === 0)
      this.hat(t, beat % 4 === 2 ? 0.16 : 0.08, beat % 8 === 6 && L >= 1);
    // Bass: off-beat pulse on the root, octave jump on the last eighth.
    const root = chord[0] - 12;
    if (L === 0 ? beat % 4 === 2 : beat % 2 === 1 || L === 2)
      this.bass(t, hz(beat === 14 || beat === 15 ? root + 12 : root), STEP * (L === 2 ? 0.9 : 1.6));
    // Arpeggio from intensity 1: chord tones climbing in 16ths.
    if (L >= 1) {
      const tones = [chord[0], chord[1], chord[2], chord[1] + 12];
      this.pluck(t, hz(tones[beat % 4] + 12), L === 2 ? 0.07 : 0.05);
    }
    // Fight: a high lead hook every other bar, and a chord stab on the 1.
    if (L === 2) {
      const hook = [0, null, 2, null, 1, null, 2, 3, null, 2, null, 1, 0, null, null, null];
      const h = hook[beat];
      if (step % 32 < 16 && h != null)
        this.lead(t, hz([chord[0], chord[1], chord[2], chord[0] + 12][h] + 24), STEP * 1.8);
      if (beat === 0) for (const note of chord) this.stab(t, hz(note + 12));
    }
    // A tension swell into each new 4-bar loop at fight intensity.
    if (L === 2 && step === 56) this.swell(t, STEP * 8);
  }
  voice(t, type, freq, gain, attack, decay, filter = null) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    let node = o;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(filter[0], t);
      if (filter[1]) f.frequency.exponentialRampToValueAtTime(filter[1], t + attack + decay);
      f.Q.value = filter[2] ?? 1;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return o;
  }
  noiseHit(t, gain, decay, type, freq) {
    const c = this.ctx,
      s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.noise;
    f.type = type;
    f.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    s.connect(f).connect(g).connect(this.bus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.02);
  }
  kick(t, gain) {
    const o = this.voice(t, "sine", 150, gain, 0.003, 0.28);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  }
  snare(t, gain) {
    this.noiseHit(t, gain, 0.16, "highpass", 1400);
    this.voice(t, "triangle", 190, gain * 0.5, 0.002, 0.08);
  }
  hat(t, gain, open) {
    this.noiseHit(t, gain, open ? 0.14 : 0.035, "highpass", 7000);
  }
  bass(t, freq, length) {
    this.voice(t, "sawtooth", freq, 0.22, 0.005, length, [900, 160, 4]);
  }
  pluck(t, freq, gain) {
    this.voice(t, "square", freq, gain, 0.004, 0.16, [2600, 700, 2]);
  }
  lead(t, freq, length) {
    const o = this.voice(t, "sawtooth", freq, 0.06, 0.02, length, [3200, 1200, 3]);
    o.detune.setValueAtTime(-8, t);
    this.voice(t, "sawtooth", freq, 0.05, 0.02, length, [3200, 1200, 3]).detune.setValueAtTime(
      9,
      t,
    );
  }
  stab(t, freq) {
    this.voice(t, "sawtooth", freq, 0.05, 0.005, 0.22, [2200, 500, 2]);
  }
  swell(t, length) {
    const c = this.ctx,
      s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.noise;
    s.loop = true;
    f.type = "bandpass";
    f.Q.value = 2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + length);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.05);
    s.connect(f).connect(g).connect(this.bus);
    s.start(t);
    s.stop(t + length + 0.1);
  }
  /** Render `bars` bars per intensity level into an offline context (for a
   * preview file). Returns the time rendered. */
  static score(ctx, out, barsPerLevel = 4) {
    const m = new BattleMusic(ctx, out);
    m.bus.gain.value = 1;
    let t = 0.05,
      step = 0;
    for (let level = 0; level <= 2; level++) {
      m.wanted = level;
      for (let i = 0; i < barsPerLevel * 16; i++, step = (step + 1) % 64, t += STEP)
        m.play(step, t);
    }
    return t;
  }
}

/** How tense the moment is: 0 calm, 1 closing in, 2 fighting for it. */
export function battleIntensity(g) {
  const a = g.arena,
    p = g.player;
  if (!a || !p) return 0;
  const alive = a.entities.filter((e) => e.hp > 0).length,
    d = a.disaster,
    disaster = d && a.time >= d.warnAt && a.time < d.endAt,
    hurt = p.hp > 0 && p.hp / p.maxHp < 0.35,
    recent = a.time - (p.hurtAt ?? -99) < 4 || a.time - (p.hitAt ?? -99) < 4;
  if (alive <= 3 || (p.lives === 0 && p.hp > 0) || hurt || (disaster && a.time >= d.startAt))
    return 2;
  if (alive <= 5 || a.time > a.zone.delay + 20 || disaster || recent) return 1;
  return 0;
}
