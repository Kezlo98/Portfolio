// Gold economy. Passive trickle (delta-based) + spend/bounty. Emits "gold" on change.
export class Economy {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.gold = cfg.startGold;
    this.earned = 0;
    this.acc = 0;
  }

  update(delta) {
    this.acc += delta;
    while (this.acc >= 1000) {
      this.acc -= 1000;
      this.gold += this.cfg.passivePerSec;
      this.earned += this.cfg.passivePerSec;
      this._changed();
    }
  }

  canAfford(n) { return this.gold >= n; }

  spend(n) {
    if (this.gold < n) return false;
    this.gold -= n;
    this._changed();
    return true;
  }

  bounty(n) {
    this.gold += n;
    this.earned += n;
    this._changed();
  }

  bonus(n) { this.bounty(n); }

  _changed() { this.scene.events.emit("gold", this.gold); }
}
