// Unit (Warrior/Archer, player blue + enemy colors). Manual movement, range-based combat.
// FSM: march -> fight (in range) -> die. HP bar shows when damaged.
import * as Phaser from "phaser";

// Tiny Swords frame counts per anim strip (192px frames).
const FRAMES = { warrior: { idle: 8, run: 6, atk: 4 }, archer: { idle: 6, run: 4, atk: 8 }, lancer: { idle: 12, run: 6, atk: 3 } };

export function createAnims(scene) {
  const m = (key, tex, n, loop) => {
    if (scene.anims.exists(key) || !scene.textures.exists(tex)) return;
    scene.anims.create({
      key,
      frameRate: 10,
      repeat: loop ? -1 : 0,
      frames: scene.anims.generateFrameNumbers(tex, { start: 0, end: n - 1 }),
    });
  };
  const colors = ["blue", "red", "purple", "yellow", "black"];
  for (const c of colors) {
    m(`warrior-${c}-idle`, `warrior-${c}-idle`, FRAMES.warrior.idle, true);
    m(`warrior-${c}-run`, `warrior-${c}-run`, FRAMES.warrior.run, true);
    m(`warrior-${c}-atk`, `warrior-${c}-attack1`, FRAMES.warrior.atk, true);
  }
  m(`archer-blue-idle`, `archer-blue-idle`, FRAMES.archer.idle, true);
  m(`archer-blue-run`, `archer-blue-run`, FRAMES.archer.run, true);
  m(`archer-blue-atk`, `archer-blue-shoot`, FRAMES.archer.atk, true);
  m(`lancer-blue-idle`, `lancer-blue-idle`, FRAMES.lancer.idle, true);
  m(`lancer-blue-run`, `lancer-blue-run`, FRAMES.lancer.run, true);
  m(`lancer-blue-atk`, `lancer-blue-attack`, FRAMES.lancer.atk, true);
}

export class Unit extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, def, side, opts = {}) {
    const color = side === "player" ? "blue" : def.color;
    super(scene, x, y, `${def.kind}-${color}-run`);
    scene.add.existing(this);
    this.setOrigin(0.5, 0.9).setScale(def.scale ?? 0.62).setDepth(y);

    this.def = def;
    this.side = side;
    this.color = color;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.dir = side === "player" ? 1 : -1; // player marches right, enemy left
    this.atkTimer = 0;
    this.alive = true;
    this.foes = opts.foes;
    this.castle = opts.castle;

    this.setFlipX(this.dir < 0); // assumes sprite faces right; flip enemies
    this.play(`${def.kind}-${color}-run`);

    // HP bar (SmallBar) hidden until damaged
    this.barW = 48;
    const by = y - 72;
    this.barBg = scene.add.image(x, by, "unitbar-base").setDisplaySize(this.barW, 9).setDepth(y + 0.1).setVisible(false);
    this.barFill = scene.add.image(x - this.barW / 2, by, "unitbar-fill")
      .setOrigin(0, 0.5).setDisplaySize(this.barW, 9).setDepth(y + 0.11).setVisible(false);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.alive) return;
    const s = this.scene;
    if (s.paused || s.ended) return;
    this.atkTimer -= delta;

    const k = `${this.def.kind}-${this.color}`;
    const target = this._findTarget();
    if (target) {
      this._play(`${k}-atk`);
      this.setFlipX(target.x < this.x);
      if (this.atkTimer <= 0) {
        this.atkTimer = this.def.atkCd;
        this._attack(target);
      }
    } else if (this.side === "player" && this.x >= s.portal.x - 30) {
      this._play(`${k}-idle`); // hold the line at the portal edge
    } else {
      this.x += this.dir * this.def.speed * (delta / 1000);
      this._play(`${k}-run`);
      this.setFlipX(this.dir < 0);
    }
    this._syncBar();
  }

  _findTarget() {
    let best = null;
    let bd = this.def.range;
    const arr = this.foes.getChildren();
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      if (!f || !f.alive) continue;
      const d = Math.abs(f.x - this.x); // x-only: single-lane design, y-jitter is cosmetic
      if (d <= bd) { bd = d; best = f; }
    }
    // enemies with no unit target attack the castle once they reach it
    if (!best && this.side === "enemy" && this.castle && this.castle.alive && this.x <= this.castle.frontX + this.def.range) {
      return this.castle;
    }
    return best;
  }

  _attack(target) {
    if (this.def.ranged) this.scene.fx.arrow(this.x + this.dir * 12, this.y - 26, target, this.def.dmg);
    else target.takeDamage(this.def.dmg);
  }

  takeDamage(n) {
    if (!this.alive) return;
    this.hp -= n;
    this.setTintFill(0xffffff); // hit flash
    this.scene.time.delayedCall(60, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.alive = false;
    this.scene.fx.burst(this.x, this.y - 22, "dust", 5);
    this.scene.events.emit("sfx", "death");
    this.barBg.destroy();
    this.barFill.destroy();
    if (this.side === "enemy") this.scene.events.emit("bounty", this.x, this.y);
    this.destroy();
  }

  _play(key) {
    if (this.anims.currentAnim?.key !== key) this.play(key);
  }

  _syncBar() {
    const damaged = this.hp < this.maxHp;
    const by = this.y - 72;
    this.barBg.setVisible(damaged).setPosition(this.x, by);
    this.barFill.setVisible(damaged).setPosition(this.x - this.barW / 2, by);
    if (damaged) this.barFill.displayWidth = this.barW * Math.max(0, this.hp / this.maxHp);
  }
}
