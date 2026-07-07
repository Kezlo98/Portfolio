// Procedural SFX via WebAudio (no files needed). play(key) + toggleMute().
// AudioContext resumes on first user gesture (Play button), so no autoplay-block.
const TONES = {
  deploy: { f: 520, type: "square",   d: 0.08 },
  spawn:  { f: 200, type: "sawtooth", d: 0.10 },
  hit:    { f: 150, type: "square",   d: 0.06 },
  death:  { f: 90,  type: "sawtooth", d: 0.12 },
  wave:   { f: 660, type: "triangle", d: 0.25, up: 990 },
  win:    { f: 660, type: "triangle", d: 0.6,  up: 1320 },
  lose:   { f: 320, type: "sawtooth", d: 0.7,  down: 90 },
};

export class Audio {
  constructor() { this.muted = false; this.ctx = null; }

  _ac() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  }

  play(key) {
    if (this.muted) return;
    const c = TONES[key];
    if (!c) return;
    try {
      const ac = this._ac();
      if (ac.state === "suspended") ac.resume();
      const now = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = c.type;
      o.frequency.setValueAtTime(c.f, now);
      if (c.up) o.frequency.exponentialRampToValueAtTime(c.up, now + c.d);
      if (c.down) o.frequency.exponentialRampToValueAtTime(c.down, now + c.d);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + c.d);
      o.connect(g).connect(ac.destination);
      o.start(now);
      o.stop(now + c.d + 0.03);
    } catch (e) { /* audio is non-critical */ }
  }

  resume() { try { if (this._ac().state === "suspended") this._ac().resume(); } catch (e) {} }
  close() { if (this.ctx) { try { this.ctx.close(); } catch (e) {} this.ctx = null; } }

  toggleMute() { this.muted = !this.muted; return this.muted; }
}
