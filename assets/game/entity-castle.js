// Player castle (blue). HP bar above. Emits "lose" at 0 HP. takeDamage(n) is the hit API.
import * as Phaser from "phaser";

export class Castle {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.alive = true;
    this.frontX = cfg.frontX; // enemies past this x attack the castle

    this.spr = scene.add.image(cfg.x, cfg.y, "castle-blue")
      .setOrigin(0.5, 1).setScale(cfg.scale).setDepth(cfg.y);

    // HP bar (BigBar) floating above the keep
    this.barW = 280;
    const by = cfg.y - this.spr.displayHeight - 26;
    this.barBg = scene.add.image(cfg.x, by, "bar-base").setDisplaySize(this.barW, 26).setDepth(cfg.y + 0.5);
    this.barFill = scene.add.image(cfg.x - this.barW / 2, by, "bar-fill")
      .setOrigin(0, 0.5).setDisplaySize(this.barW, 26).setDepth(cfg.y + 0.6);
    this._render();
  }

  takeDamage(n) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - n);
    this._render();
    this.scene.fx.burst(this.spr.x + (Math.random() * 60 - 30), this.cfg.y - 40, "explosion", 3);
    if (!this.scene.reduce) this.scene.cameras.main.shake(120, 0.004);
    this.scene.events.emit("sfx", "hit");
    if (this.hp <= 0) {
      this.alive = false;
      this.scene.events.emit("lose");
    }
  }

  _render() {
    const pct = this.hp / this.maxHp;
    this.barFill.displayWidth = this.barW * pct;
    this.barFill.setTint(pct < 0.3 ? 0xff5555 : 0xffffff); // low-HP danger tint
  }
}
