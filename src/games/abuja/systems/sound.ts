// Abuja Hustle's sound: all of it made live with the Web Audio API, so there
// are no files to download. An Afrobeats-style groove (kick, log drum, shaker,
// clave and warm chord stabs over a four-chord vamp) that changes with where
// you are and the time of day; street ambience (traffic, horns, okada
// engines), night sounds (crickets, a distant generator), rain; and short
// effects for taps, money, the phone, doors and sirens.
//
// Browsers only allow sound after the player touches the page, so nothing
// plays until the first tap or key press. Choices are remembered per device.

export type Mood = "off" | "title" | "city" | "dusk" | "night" | "school" | "campus" | "inside" | "prison" | "ride";
export type Sfx = "tap" | "cash" | "spend" | "siren" | "phone" | "door" | "chime" | "error" | "notify";

const KEY = "abuja-hustle.sound";
type Settings = { music: boolean; sfx: boolean };

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
    return { music: raw.music !== false, sfx: raw.sfx !== false };
  } catch {
    return { music: true, sfx: true };
  }
}

const BPM = 104;
const STEP = 60 / BPM / 4;
/** Fmaj7 – G6 – Em7 – Am7, one bar each: the roots, and the chord tones for the stabs (Hz). */
const ROOTS = [43.65, 49.0, 41.2, 55.0];
const CHORDS = [
  [174.6, 220.0, 261.6, 329.6],
  [196.0, 246.9, 293.7, 329.6],
  [164.8, 196.0, 246.9, 293.7],
  [220.0, 261.6, 329.6, 392.0],
];
/** A little hook on top, some bars (scale degrees of A minor pentatonic, Hz). */
const HOOK = [659.3, 587.3, 523.3, 440.0, 523.3, 587.3];

type Parts = { kick: boolean; log: boolean; shaker: boolean; clave: boolean; chords: number; hook: boolean; cutoff: number; volume: number };
const PARTS: Record<Mood, Parts | null> = {
  off: null,
  title: { kick: true, log: true, shaker: true, clave: true, chords: 1, hook: true, cutoff: 5200, volume: 0.55 },
  city: { kick: true, log: true, shaker: true, clave: true, chords: 1, hook: true, cutoff: 5200, volume: 0.42 },
  dusk: { kick: true, log: true, shaker: true, clave: false, chords: 1, hook: false, cutoff: 2600, volume: 0.38 },
  night: { kick: true, log: true, shaker: false, clave: false, chords: 0.7, hook: false, cutoff: 1500, volume: 0.34 },
  school: { kick: false, log: false, shaker: true, clave: true, chords: 1, hook: true, cutoff: 6000, volume: 0.32 },
  campus: { kick: true, log: false, shaker: true, clave: true, chords: 1, hook: false, cutoff: 4200, volume: 0.36 },
  inside: { kick: true, log: true, shaker: false, clave: false, chords: 0.8, hook: false, cutoff: 750, volume: 0.32 },
  prison: { kick: false, log: false, shaker: false, clave: false, chords: 0.6, hook: false, cutoff: 650, volume: 0.3 },
  ride: { kick: true, log: true, shaker: true, clave: true, chords: 1, hook: true, cutoff: 4000, volume: 0.4 },
};

type Amb = { traffic: number; horns: boolean; okada: boolean; crickets: boolean; generator: boolean; birds: boolean; engine: boolean };
const AMB: Record<Mood, Amb | null> = {
  off: null,
  title: null,
  city: { traffic: 0.05, horns: true, okada: true, crickets: false, generator: false, birds: true, engine: false },
  dusk: { traffic: 0.045, horns: true, okada: true, crickets: true, generator: false, birds: false, engine: false },
  night: { traffic: 0.022, horns: false, okada: false, crickets: true, generator: true, birds: false, engine: false },
  school: { traffic: 0.015, horns: false, okada: false, crickets: false, generator: false, birds: true, engine: false },
  campus: { traffic: 0.025, horns: true, okada: true, crickets: false, generator: false, birds: true, engine: false },
  inside: { traffic: 0.008, horns: false, okada: false, crickets: false, generator: false, birds: false, engine: false },
  prison: { traffic: 0, horns: false, okada: false, crickets: true, generator: false, birds: false, engine: false },
  ride: { traffic: 0.04, horns: true, okada: false, crickets: false, generator: false, birds: false, engine: true },
};

class Engine {
  settings: Settings = { music: true, sfx: true };
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private amb!: GainNode;
  private fx!: GainNode;
  private noise!: AudioBuffer;
  private mood: Mood = "off";
  private parts: Parts | null = null;
  private ambience: Amb | null = null;
  private ducked = false;
  private step = 0;
  private nextAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private loops: { traffic?: { src: AudioBufferSourceNode; gain: GainNode }; rain?: { src: AudioBufferSourceNode; gain: GainNode }; hum?: { nodes: AudioScheduledSourceNode[]; gain: GainNode }; engine?: { nodes: AudioScheduledSourceNode[]; gain: GainNode } } = {};
  private raining = false;
  private nextHorn = 0;
  private nextChirp = 0;
  private nextBird = 0;
  private nextOkada = 0;
  private listening = false;

  /** Wait for the first touch or key press, then start the audio. Safe to call many times. */
  init() {
    if (typeof window === "undefined" || this.listening) return;
    this.listening = true;
    this.settings = load();
    const unlock = () => {
      this.ensure();
      void this.ctx?.resume();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  private ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    // A gentle limiter so stacked sounds never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 5000;
    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.musicFilter).connect(this.master);
    this.amb = ctx.createGain();
    this.amb.gain.value = 0.9;
    this.amb.connect(this.master);
    this.fx = ctx.createGain();
    this.fx.gain.value = this.settings.sfx ? 0.7 : 0;
    this.fx.connect(this.master);
    // Two seconds of noise, reused for shakers, traffic, rain and engines.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    this.nextAt = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 25);
    this.apply();
  }

  setMusic(on: boolean) {
    this.settings.music = on;
    this.save();
    this.apply();
  }

  setSfx(on: boolean) {
    this.settings.sfx = on;
    this.save();
    if (this.fx) this.fx.gain.value = on ? 0.7 : 0;
    this.apply();
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.settings));
    } catch {
      // Private mode: the choice lasts for this visit.
    }
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.apply();
  }

  /** Quieter while paused or a big screen is open. */
  duck(on: boolean) {
    if (on === this.ducked) return;
    this.ducked = on;
    this.apply();
  }

  setRain(on: boolean) {
    if (on === this.raining) return;
    this.raining = on;
    this.apply();
  }

  /** Bring every layer in line with the mood and the settings, with short fades. */
  private apply() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.parts = this.settings.music ? PARTS[this.mood] : null;
    const vol = this.parts ? this.parts.volume * (this.ducked ? 0.35 : 1) : 0;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(vol, t, 0.4);
    this.musicFilter.frequency.setTargetAtTime(this.parts?.cutoff ?? 5000, t, 0.5);
    // Ambience counts as sound effects: it goes with that switch.
    this.ambience = this.settings.sfx ? AMB[this.mood] : null;
    const a = this.ambience;
    this.amb.gain.setTargetAtTime(this.ducked ? 0.4 : 0.9, t, 0.3);
    this.loop("traffic", a ? a.traffic : 0, () => this.noiseLoop(320, "lowpass"));
    // Rain on the roof is quieter indoors.
    const rain = a && this.raining ? (this.mood === "inside" || this.mood === "prison" ? 0.02 : 0.07) : 0;
    this.loop("rain", rain, () => this.noiseLoop(1400, "highpass"));
    this.hum("hum", a?.generator ? 0.018 : 0, [50, 100], 260);
    this.hum("engine", a?.engine ? 0.035 : 0, [62, 124], 420);
  }

  private noiseLoop(freq: number, type: BiquadFilterType) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(f).connect(gain).connect(this.amb);
    src.start();
    return { src, gain };
  }

  private loop(name: "traffic" | "rain", level: number, make: () => { src: AudioBufferSourceNode; gain: GainNode }) {
    const ctx = this.ctx!;
    let l = this.loops[name];
    if (!l && level > 0) l = this.loops[name] = make();
    if (!l) return;
    l.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.6);
  }

  private hum(name: "hum" | "engine", level: number, freqs: number[], cutoff: number) {
    const ctx = this.ctx!;
    let h = this.loops[name];
    if (!h && level > 0) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      f.connect(gain).connect(this.amb);
      const nodes = freqs.map((hz, i) => {
        const o = ctx.createOscillator();
        o.type = i ? "sine" : "sawtooth";
        o.frequency.value = hz;
        // A slow wobble, like an engine that isn't quite steady.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.3 + i * 0.17;
        const depth = ctx.createGain();
        depth.gain.value = hz * 0.02;
        lfo.connect(depth).connect(o.frequency);
        lfo.start();
        o.connect(f);
        o.start();
        return o;
      });
      h = this.loops[name] = { nodes, gain };
    }
    if (h) h.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.8);
  }

  /** The scheduler: queue the next few sixteenth notes and ambient one-offs ahead of time. */
  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    while (this.nextAt < ctx.currentTime + 0.12) {
      if (this.parts) this.playStep(this.step, this.nextAt, this.parts);
      this.step = (this.step + 1) % 64;
      this.nextAt += STEP;
    }
    // If the tab was asleep, don't try to catch up on missed notes.
    if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + 0.05;
    this.ambientOneOffs(ctx.currentTime);
  }

  private playStep(step: number, t: number, p: Parts) {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const root = ROOTS[bar]!;
    const chord = CHORDS[bar]!;
    const sparse = this.mood === "night" || this.mood === "inside" || this.mood === "prison";
    if (p.kick && (s === 0 || s === 8 || (!sparse && s === 11))) this.kick(t, sparse ? 0.5 : 0.75);
    if (p.log && [0, 3, 7, 10, 14].includes(s)) this.logDrum(t, root * (s === 7 || s === 14 ? 4 : 2), s === 0 ? 0.55 : 0.38);
    if (p.shaker) this.shaker(t, s % 4 === 2 ? 0.16 : 0.07);
    if (p.clave && [0, 3, 6, 10, 12].includes(s)) this.click(t, 1750, 0.11);
    if (p.clave && (s === 4 || s === 12)) this.rim(t);
    const stabs = sparse ? (this.mood === "prison" ? [0] : [0, 6, 10]) : [0, 3, 6, 10, 13];
    if (p.chords && stabs.includes(s)) this.chord(t, chord, 0.05 * p.chords, sparse ? 0.9 : 0.28);
    if (p.hook && (bar === 1 || bar === 3) && s % 2 === 0 && s >= 8) {
      const note = HOOK[(s / 2 + bar) % HOOK.length]!;
      if ((s + bar) % 3 !== 0) this.pluck(t, note, 0.045);
    }
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private osc(type: OscillatorType, hz: number, t: number, peak: number, decay: number, out: AudioNode, attack = 0.005) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(hz, t);
    const g = ctx.createGain();
    this.env(g, t, peak, attack, decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return o;
  }

  private kick(t: number, v: number) {
    const o = this.osc("sine", 120, t, v, 0.32, this.music);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  }

  /** The amapiano-style log drum: a round tone that bends down. */
  private logDrum(t: number, hz: number, v: number) {
    const o = this.osc("sine", hz * 1.06, t, v, 0.34, this.music, 0.004);
    o.frequency.exponentialRampToValueAtTime(hz, t + 0.06);
    this.osc("triangle", hz * 2, t, v * 0.18, 0.12, this.music);
  }

  private noiseHit(t: number, v: number, decay: number, freq: number, type: BiquadFilterType, out: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, t, v, 0.002, decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + decay + 0.05);
  }

  private shaker(t: number, v: number) {
    this.noiseHit(t, v, 0.045, 7000, "highpass", this.music);
  }

  private click(t: number, hz: number, v: number) {
    this.osc("sine", hz, t, v, 0.04, this.music, 0.001);
  }

  private rim(t: number) {
    this.noiseHit(t, 0.14, 0.06, 2200, "bandpass", this.music);
  }

  /** A warm, electric-piano-ish stab: sine and triangle on each chord tone. */
  private chord(t: number, notes: number[], v: number, decay: number) {
    for (const hz of notes) {
      this.osc("triangle", hz, t, v, decay, this.music, 0.01);
      this.osc("sine", hz * 2, t, v * 0.35, decay * 0.6, this.music, 0.01);
    }
  }

  private pluck(t: number, hz: number, v: number) {
    this.osc("square", hz, t, v * 0.5, 0.16, this.music, 0.003);
    this.osc("sine", hz, t, v, 0.22, this.music, 0.003);
  }

  /** Horns, okadas buzzing past, crickets and birds, at random moments. */
  private ambientOneOffs(now: number) {
    const a = this.ambience;
    if (!a || !this.ctx) return;
    const out = this.amb;
    if (a.horns && now > this.nextHorn) {
      this.nextHorn = now + 4 + Math.random() * 9;
      const base = 380 + Math.random() * 140;
      const v = 0.018 + Math.random() * 0.02;
      const beeps = Math.random() < 0.5 ? 2 : 1;
      for (let i = 0; i < beeps; i += 1) {
        const t = now + 0.05 + i * 0.22;
        this.osc("square", base, t, v, 0.16, out, 0.01);
        this.osc("square", base * 1.26, t, v * 0.7, 0.16, out, 0.01);
      }
    }
    if (a.okada && now > this.nextOkada) {
      this.nextOkada = now + 7 + Math.random() * 12;
      const ctx = this.ctx;
      const t = now + 0.05;
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(85, t);
      o.frequency.linearRampToValueAtTime(130, t + 1.2);
      o.frequency.linearRampToValueAtTime(95, t + 2.4);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.03, t + 1.1);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.4);
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.8, t);
      pan.pan.linearRampToValueAtTime(0.8, t + 2.4);
      o.connect(f).connect(g).connect(pan).connect(out);
      o.start(t);
      o.stop(t + 2.5);
    }
    if (a.crickets && now > this.nextChirp) {
      this.nextChirp = now + 0.35 + Math.random() * 0.9;
      const hz = 4200 + Math.random() * 700;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) this.osc("sine", hz, now + 0.05 + i * 0.055, 0.012, 0.035, out, 0.004);
    }
    if (a.birds && now > this.nextBird) {
      this.nextBird = now + 3 + Math.random() * 8;
      const t = now + 0.05;
      for (let i = 0; i < 3; i += 1) {
        const o = this.osc("sine", 2600 + Math.random() * 900, t + i * 0.12, 0.012, 0.08, out, 0.005);
        o.frequency.exponentialRampToValueAtTime(3600 + Math.random() * 800, t + i * 0.12 + 0.07);
      }
    }
  }

  play(name: Sfx) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.01;
    const out = this.fx;
    switch (name) {
      case "tap":
        this.osc("sine", 1500, t, 0.05, 0.03, out, 0.001);
        break;
      case "cash":
        this.osc("square", 1318.5, t, 0.07, 0.09, out, 0.002);
        this.osc("square", 1760, t + 0.08, 0.08, 0.3, out, 0.002);
        this.noiseHit(t + 0.08, 0.05, 0.25, 6000, "highpass", out);
        break;
      case "spend":
        this.osc("triangle", 700, t, 0.08, 0.08, out, 0.002);
        this.osc("triangle", 470, t + 0.07, 0.08, 0.14, out, 0.002);
        break;
      case "siren": {
        const o = ctx.createOscillator();
        o.type = "sine";
        const g = ctx.createGain();
        for (let i = 0; i < 3; i += 1) {
          o.frequency.setValueAtTime(700, t + i * 0.6);
          o.frequency.linearRampToValueAtTime(1300, t + i * 0.6 + 0.3);
          o.frequency.linearRampToValueAtTime(700, t + i * 0.6 + 0.6);
        }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.07, t + 0.1);
        g.gain.setValueAtTime(0.07, t + 1.6);
        g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 1.85);
        break;
      }
      case "phone":
        this.osc("sine", 880, t, 0.08, 0.12, out, 0.003);
        this.osc("sine", 1318.5, t + 0.11, 0.08, 0.2, out, 0.003);
        break;
      case "notify":
        this.osc("triangle", 988, t, 0.07, 0.15, out, 0.003);
        this.osc("triangle", 1480, t + 0.09, 0.06, 0.22, out, 0.003);
        break;
      case "door":
        this.osc("sine", 95, t, 0.25, 0.18, out, 0.003);
        this.noiseHit(t, 0.08, 0.1, 500, "lowpass", out);
        break;
      case "chime":
        [523.3, 659.3, 784, 1046.5].forEach((hz, i) => this.osc("triangle", hz, t + i * 0.09, 0.07, 0.5, out, 0.004));
        break;
      case "error":
        this.osc("square", 196, t, 0.05, 0.14, out, 0.003);
        break;
    }
  }
}

export const sound = new Engine();
