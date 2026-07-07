// Wave spawner. Timed enemy spawns per wave def; escalates color red->purple->yellow->black.
// Emits: wave-prep, wave-start(n), wave-clear(n), win (after last wave cleared with none alive).
export class Waves {
  constructor(scene, cfg, spawn) {
    this.scene = scene;
    this.list = cfg.waves;
    this.spawn = spawn;
    this.idx = 0;
    this.between = true;
    this.timer = 2500; // initial prep
    this.acc = 0;
    this.spawned = 0;
    this.done = false;
  }

  start() {
    this.between = true;
    this.timer = 2500;
    this.scene.events.emit("wave-prep", 1);
  }

  beginWave() {
    this.between = false;
    this.acc = 0;
    this.spawned = 0;
    this.scene.events.emit("wave-start", this.idx + 1);
  }

  update(delta, enemiesAlive) {
    if (this.done) return;
    if (this.between) {
      this.timer -= delta;
      if (this.timer <= 0 && this.idx < this.list.length) this.beginWave();
      return;
    }
    const w = this.list[this.idx];
    if (this.spawned < w.count) {
      this.acc += delta;
      if (this.acc >= w.interval) {
        this.acc -= w.interval;
        this.spawn(w);
        this.spawned++;
      }
    } else if (enemiesAlive === 0) {
      this.scene.events.emit("wave-clear", this.idx + 1);
      this.idx++;
      if (this.idx >= this.list.length) {
        this.done = true;
        this.scene.events.emit("win");
      } else {
        this.between = true;
        this.timer = 4000;
      }
    }
  }

  get total() { return this.list.length; }
}
