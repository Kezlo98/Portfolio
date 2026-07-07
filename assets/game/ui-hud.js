// HUD: gold panel (top-left), wave counter (top-center), mute state (top-right),
// deploy buttons (bottom-center). Buttons dim when unaffordable; swap to pressed texture when armed.
const FONT = { fontFamily: "Nunito, sans-serif" };

export class Hud {
  constructor(scene, cfg) {
    this.scene = scene;
    const W = cfg.viewport.w, H = cfg.viewport.h;

    this.goldPanel = scene.add.image(20, 18, "wood-table").setOrigin(0, 0).setDisplaySize(220, 56).setDepth(100000);
    scene.add.image(44, 46, "icon-coin").setDisplaySize(30, 30).setDepth(100001);
    scene.add.text(66, 24, "GOLD", { ...FONT, fontSize: "11px", color: "#7a5a2a", fontStyle: "bold" }).setDepth(100001);
    this.goldTxt = scene.add.text(140, 48, "0", { ...FONT, fontSize: "24px", color: "#3a3122", fontStyle: "bold" }).setOrigin(0.5).setDepth(100001);

    this.waveTxt = scene.add.text(W / 2, 34, "Wave 0 / 0", { ...FONT, fontSize: "22px", color: "#fbf6ec", fontStyle: "bold" }).setOrigin(0.5).setDepth(100001);
    this.comboTxt = scene.add.text(W / 2, 62, "", { ...FONT, fontSize: "18px", color: "#ff8a3a", fontStyle: "bold" }).setOrigin(0.5).setDepth(100001).setVisible(false);
    this.muteTxt = scene.add.text(W - 22, 32, "SOUND ON", { ...FONT, fontSize: "12px", color: "rgba(255,253,248,.85)" }).setOrigin(1, 0).setDepth(100001);

    const defs = [
      { key: "warrior", label: "Warrior", cost: cfg.units.warrior.cost },
      { key: "archer", label: "Archer", cost: cfg.units.archer.cost },
      { key: "lancer", label: "Lancer", cost: cfg.units.lancer?.cost ?? 90 },
    ];
    this.buttons = {};
    const n = defs.length, gap = 175;
    defs.forEach((d, i) => {
      const x = W / 2 - (n - 1) * gap / 2 + i * gap;
      const img = scene.add.image(x, H - 48, "btn-blue").setDisplaySize(138, 84)
        .setInteractive({ useHandCursor: true }).setDepth(100000);
      scene.add.text(x, H - 64, d.label, { ...FONT, fontSize: "16px", color: "#fffdf8", fontStyle: "bold" }).setOrigin(0.5).setDepth(100001);
      scene.add.text(x, H - 34, d.cost + "g", { ...FONT, fontSize: "13px", color: "#ffe9a8" }).setOrigin(0.5).setDepth(100001);
      img.on("pointerdown", () => scene.arm(d.key));
      this.buttons[d.key] = { img, cost: d.cost };
    });

    scene.add.text(W / 2, H - 92, "Press 1 / 2 / 3 to arm, then click the field.   Esc pause · M mute", {
      ...FONT, fontSize: "12px", color: "rgba(255,253,248,.82)",
    }).setOrigin(0.5).setDepth(100001);
  }

  renderGold(n) {
    this.goldTxt.setText(String(Math.floor(n)));
    for (const k in this.buttons) {
      const b = this.buttons[k];
      b.img.setAlpha(this.scene.eco.canAfford(b.cost) ? 1 : 0.45);
    }
  }

  renderWave(n, total) { this.waveTxt.setText("Wave " + n + " / " + total); }

  setArmed(key) {
    for (const k in this.buttons) this.buttons[k].img.setTexture(k === key ? "btn-blue-pressed" : "btn-blue");
  }

  setMute(m) { this.muteTxt.setText(m ? "SOUND OFF" : "SOUND ON"); }

  setCombo(n) {
    if (n >= 2) this.comboTxt.setText("COMBO ×" + n).setVisible(true);
    else this.comboTxt.setVisible(false);
  }
}
