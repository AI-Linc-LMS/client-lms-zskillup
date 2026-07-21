/**
 * Audio-presence detection for proctoring — flags sustained voice-level audio
 * (someone dictating answers, the candidate reading aloud, background voices).
 * Pure Web Audio (no model): RMS over the mic's time-domain data, requiring the
 * level to hold above a threshold for `sustainMs` so a single cough or key-clack
 * doesn't trigger. Conservative by design — false positives erode trust in the
 * whole system.
 */
export class AudioProctor {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private aboveSince: number | null = null;

  constructor(
    /** RMS (0-1) above which audio counts as voice-level. */
    private readonly threshold = 0.12,
    /** Must hold above threshold this long before it's a violation. */
    private readonly sustainMs = 1500,
  ) {}

  /** Attach to a stream's audio track. Returns false if there's no audio to watch. */
  start(stream: MediaStream): boolean {
    if (stream.getAudioTracks().length === 0) return false;
    try {
      const Ctx: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.source.connect(this.analyser);
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  /** True once voice-level audio has been sustained past the threshold. */
  sampleVoiceActive(): boolean {
    if (!this.analyser || !this.data) return false;
    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      const x = (this.data[i] - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / this.data.length);
    const now = Date.now();
    if (rms > this.threshold) {
      if (this.aboveSince === null) this.aboveSince = now;
      return now - this.aboveSince >= this.sustainMs;
    }
    this.aboveSince = null;
    return false;
  }

  stop(): void {
    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.data = null;
    this.aboveSince = null;
  }
}
