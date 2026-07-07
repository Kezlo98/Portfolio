// Particle + projectile FX. burst() = explosion/dust puff; arrow() = homing-ish projectile.
import * as Phaser from "phaser";

export class Fx {
  constructor(scene, reduce) {
    this.scene = scene;
    this.reduce = reduce;
  }

  // one-shot particle burst of `tex` (dust/explosion) at x,y
  burst(x, y, tex, count = 4) {
    if (this.reduce) return;
    const p = this.scene.add.particles(x, y, tex, {
      speed: { min: 30, max: 110 },
      lifespan: 480,
      scale: { start: 0.55, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: "ADD",
      quantity: count,
      emitting: false,
    }).setDepth(9000);
    p.explode(count, x, y);
    this.scene.time.delayedCall(600, () => p.destroy());
  }

  // floating combat text (e.g. "+14g"): tween up + fade
  floatText(x, y, text, color = "#ffe9a8") {
    const t = this.scene.add.text(x, y, text, { fontFamily: "ui-monospace, Menlo, monospace", fontSize: "16px", color, fontStyle: "bold" }).setOrigin(0.5).setDepth(9000);
    this.scene.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 700, ease: "Cubic.out", onComplete: () => t.destroy() });
  }

  // archer arrow: tweens to target, applies damage on arrival if still alive
  arrow(x, y, target, dmg) {
    const a = this.scene.add.image(x, y, "arrow").setScale(0.85).setDepth(y + 1);
    a.setRotation(Phaser.Math.Angle.Between(x, y, target.x, target.y));
    this.scene.tweens.add({
      targets: a,
      x: target.x,
      y: target.y - 24,
      duration: 170,
      onComplete: () => {
        a.destroy();
        if (target && target.alive && !this.scene.ended) target.takeDamage(dmg);
      },
    });
  }
}
