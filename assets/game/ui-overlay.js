// Overlays: transient banner, flash, pause panel, win/lose screen with Restart/Menu buttons.
const FONT = { fontFamily: "Nunito, sans-serif" };
const D = 100000; // overlay depth (above everything)

export class Overlay {
  constructor(scene) {
    this.scene = scene;
    const W = scene.cfg.viewport.w, H = scene.cfg.viewport.h;
    this.bannerTxt = scene.add.text(W / 2, 74, "", { ...FONT, fontStyle: "bold", fontSize: "30px", color: "#fff7d6" }).setOrigin(0.5).setDepth(D).setVisible(false);
    this.flashTxt = scene.add.text(W / 2, H / 2, "", { ...FONT, fontStyle: "bold", fontSize: "22px", color: "#ffd0d0", backgroundColor: "rgba(40,20,20,.85)", padding: { x: 14, y: 8 } }).setOrigin(0.5).setDepth(D).setVisible(false);
    this._panel = null;
  }

  banner(text, ms = 1300) {
    this.bannerTxt.setText(text).setVisible(true).setAlpha(1);
    this.scene.tweens.add({ targets: this.bannerTxt, alpha: 0, duration: ms, delay: 450, onComplete: () => this.bannerTxt.setVisible(false) });
  }

  flash(text) {
    this.flashTxt.setText(text).setVisible(true).setAlpha(1);
    this.scene.tweens.add({ targets: this.flashTxt, alpha: 0, duration: 900, onComplete: () => this.flashTxt.setVisible(false) });
  }

  pause(on) {
    if (on && !this._panel) {
      const s = this.scene, W = s.cfg.viewport.w, H = s.cfg.viewport.h;
      const g = s.add.graphics().setDepth(D - 1).fillStyle(0x10140a, 0.55).fillRect(0, 0, W, H);
      const t = s.add.text(W / 2, H / 2 - 16, "PAUSED", { ...FONT, fontStyle: "bold", fontSize: "48px", color: "#fff7d6" }).setOrigin(0.5).setDepth(D);
      s.add.text(W / 2, H / 2 + 30, "Esc to resume", { ...FONT, fontSize: "15px", color: "rgba(255,253,248,.85)" }).setOrigin(0.5).setDepth(D);
      const btn = this._btn(W / 2, H / 2 + 90, "Restart", () => { this._clearPause(); s.scene.restart(); });
      this._panel = { g, t, btn };
    } else if (!on) this._clearPause();
  }

  _clearPause() {
    if (!this._panel) return;
    this._panel.g.destroy();
    this._panel.t.destroy();
    this._panel.btn.forEach((o) => o.destroy());
    this._panel = null;
  }

  _btn(x, y, label, onClick) {
    const s = this.scene;
    const img = s.add.image(x, y, "btn-blue").setDisplaySize(160, 52).setInteractive({ useHandCursor: true }).setDepth(D);
    const t = s.add.text(x, y, label, { ...FONT, fontStyle: "bold", fontSize: "18px", color: "#fbf6ec" }).setOrigin(0.5).setDepth(D);
    img.on("pointerover", () => img.setTexture("btn-blue-pressed"));
    img.on("pointerout", () => img.setTexture("btn-blue"));
    img.on("pointerdown", onClick);
    return [img, t];
  }

  end(win, idx, earned, total) {
    const s = this.scene, W = s.cfg.viewport.w, H = s.cfg.viewport.h;
    const lr = s.registry.get("lastRun");
    s.add.graphics().setDepth(D - 1).fillStyle(0x10140a, 0.66).fillRect(0, 0, W, H);
    s.add.text(W / 2, H / 2 - 112, win ? "VICTORY!" : "DEFEAT", { ...FONT, fontStyle: "bold", fontSize: "58px", color: win ? "#9fe8a0" : "#ff9a9a" }).setOrigin(0.5).setDepth(D);
    s.add.text(W / 2, H / 2 - 50, win ? "The kingdom stands." : "The castle has fallen.", { ...FONT, fontSize: "19px", color: "#fbf6ec" }).setOrigin(0.5).setDepth(D);
    s.add.text(W / 2, H / 2 - 14, "Waves " + idx + " / " + total + "   ·   Gold earned " + Math.floor(earned) + "   ·   Kills " + (lr?.kills ?? 0), { ...FONT, fontSize: "16px", color: "#ffe9a8" }).setOrigin(0.5).setDepth(D);
    if (lr && typeof lr.xp === "number") {
      s.add.text(W / 2, H / 2 + 20, "+" + lr.xp + " XP   ·   +" + lr.bankedGold + "g banked", { ...FONT, fontStyle: "bold", fontSize: "18px", color: "#fff7d6" }).setOrigin(0.5).setDepth(D);
      if (lr.leveledUp) s.add.text(W / 2, H / 2 + 48, "LEVEL UP!  →  " + lr.newLevel, { ...FONT, fontStyle: "bold", fontSize: "20px", color: "#ffd66e" }).setOrigin(0.5).setDepth(D);
      if (lr.leveledUp && lr.pointsGained > 0) s.add.text(W / 2, H / 2 + 74, "+" + lr.pointsGained + " skill point" + (lr.pointsGained === 1 ? "" : "s") + " ready in the Barracks", { ...FONT, fontSize: "14px", color: "rgba(255,253,248,.85)" }).setOrigin(0.5).setDepth(D);
    }
    this._btn(W / 2 - 180, H / 2 + 104, "Retry", () => s.scene.restart());
    this._btn(W / 2, H / 2 + 104, "Barracks", () => s.game.events.emit("to-barracks"));
    this._btn(W / 2 + 180, H / 2 + 104, "Menu", () => { window.location.href = "index.html"; });
  }
}
