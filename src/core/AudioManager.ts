import { Save } from './SaveManager';

/**
 * Tiny Web Audio synthesizer — no audio files needed.
 * Every game sound is a short envelope on an oscillator (or filtered noise).
 */
class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = Save.muted;

  /** Must be called from a user gesture at least once (browser autoplay policy). */
  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    Save.setMuted(this.muted);
    return this.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol = 1, slideTo?: number) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 1, cutoff = 2000) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }

  uiClick()   { this.tone(660, 0.07, 'square', 0.5); }
  start()     { this.tone(440, 0.1, 'sawtooth', 0.6); this.tone(660, 0.12, 'sawtooth', 0.6); setTimeout(() => this.tone(880, 0.18, 'sawtooth', 0.7), 90); }
  slice(pitchStep = 0) {
    // Rising pitch with combo count makes streaks audibly satisfying.
    const base = 520 * Math.pow(1.06, Math.min(pitchStep, 12));
    this.tone(base, 0.09, 'triangle', 0.8, base * 1.8);
    this.noise(0.06, 0.25, 5000);
  }
  critical()  { this.tone(1200, 0.12, 'square', 0.6, 2000); this.tone(1600, 0.15, 'sine', 0.5); }
  combo(n: number) {
    [0, 4, 7].forEach((s, i) => setTimeout(() => this.tone(600 * Math.pow(2, (s + Math.min(n, 8)) / 12), 0.1, 'square', 0.5), i * 45));
  }
  miss()      { this.tone(300, 0.2, 'sawtooth', 0.4, 150); }
  crack()     { this.tone(1400, 0.08, 'triangle', 0.5, 700); this.noise(0.08, 0.3, 7000); }
  clang()     { this.tone(2400, 0.05, 'square', 0.5); this.tone(1800, 0.18, 'triangle', 0.6, 900); this.noise(0.1, 0.4, 6000); }
  fizzle()    { this.noise(0.12, 0.35, 2500); this.tone(180, 0.15, 'sawtooth', 0.3, 90); }
  bomb()      { this.noise(0.5, 1.0, 900); this.tone(90, 0.5, 'sawtooth', 0.9, 40); }
  fail()      { this.tone(330, 0.25, 'sawtooth', 0.6, 220); setTimeout(() => this.tone(220, 0.4, 'sawtooth', 0.6, 110), 220); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'square', 0.55), i * 110));
  }
  tick()      { this.tone(880, 0.05, 'sine', 0.35); }
}

export const Audio = new AudioManagerImpl();
