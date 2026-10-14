/** Capture runs off the game thread. Mono speech is downsampled to 16 kHz,
 * with 80 ms bounded frames. The graph outputs silence: no mic monitoring. */
class OutpostVoiceCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = false;
    this.frame = new Int16Array(1280);
    this.index = this.phase = this.sum = this.count = 0;
    this.port.onmessage = (event) => {
      this.active = event.data === true;
      if (!this.active) this.index = this.phase = this.sum = this.count = 0;
    };
  }
  process(inputs, outputs) {
    for (const output of outputs) for (const channel of output) channel.fill(0);
    const input = inputs[0]?.[0];
    if (!this.active || !input) return true;
    for (const sample of input) {
      this.sum += sample;
      this.count++;
      this.phase += 16000 / sampleRate;
      if (this.phase < 1) continue;
      this.phase -= 1;
      this.frame[this.index++] = Math.round(
        Math.max(-1, Math.min(1, this.sum / this.count)) * 32767,
      );
      this.sum = this.count = 0;
      if (this.index === this.frame.length) {
        this.port.postMessage(this.frame.buffer, [this.frame.buffer]);
        this.frame = new Int16Array(1280);
        this.index = 0;
      }
    }
    return true;
  }
}
registerProcessor("outpost-voice-capture", OutpostVoiceCapture);
