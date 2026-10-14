/** Rolling measurements from this browser's actual gameplay. Menu frames and
 * tab switches never inflate the reported gameplay FPS. No network upload. */
export class FrameDiagnostics {
  constructor() {
    this.frames = [];
    this.last = null;
    this.report = null;
    this.reportAt = 0;
  }
  sample(now, cpu, gpu, active) {
    if (!active) {
      this.last = null;
      return;
    }
    if (!Number.isFinite(now) || !Number.isFinite(cpu)) return;
    if (this.last !== null) {
      const interval = now - this.last;
      if (interval > 0 && interval < 2000) this.frames.push({ at: now, interval, cpu, gpu });
    }
    this.last = now;
    while (this.frames.length && (now - this.frames[0].at > 10000 || this.frames.length > 1440))
      this.frames.shift();
    if (this.frames.length < 20 || now - this.reportAt < 1000) return;
    this.reportAt = now;
    const sorted = this.frames.map((f) => f.interval).sort((a, b) => a - b);
    this.report = {
      fps: Math.round(
        1000 / (this.frames.reduce((s, f) => s + f.interval, 0) / this.frames.length),
      ),
      p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
      cpu: this.frames.reduce((s, f) => s + f.cpu, 0) / this.frames.length,
      gpu: Number.isFinite(gpu) ? gpu : null,
      samples: this.frames.length,
    };
  }
}
