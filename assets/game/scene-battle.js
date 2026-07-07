// Tiny Swords — battle scene. Orchestrates ground/decor, castle, economy, waves, units,
// deploy input, HUD, overlays, audio. Manual movement (no physics). update() drives eco + waves.
import * as Phaser from "phaser";
import { Castle } from "./entity-castle.js";
import { Economy } from "./sys-economy.js";
import { Waves } from "./sys-waves.js";
import { Fx } from "./sys-fx.js";
import { Unit, createAnims } from "./entity-unit.js";
import { Hud } from "./ui-hud.js";
import { Overlay } from "./ui-overlay.js";
import { Audio } from "./sys-audio.js";
import { applyRunResult, save as saveProfile } from "../js/meta-profile.js";

export class BattleScene extends Phaser.Scene {
  constructor() { super("battle"); }

  create() {
    const cfg = (this.cfg = this.registry.get("battleCfg") ?? this.cache.json.get("battle"));
    this.reduce = this.registry.get("reduceMotion");
    const W = cfg.viewport.w;
    this.paused = false;
    this.ended = false;
    this._armed = null;
    this.anims.resumeAll(); // game-global anim manager may be paused from a prior pause-restart
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;

    createAnims(this);
    this.fx = new Fx(this, this.reduce);
    this.audio = new Audio();

    this.add.tileSprite(W / 2, cfg.viewport.h / 2, W, cfg.viewport.h, "tiles", cfg.grassFrame).setDepth(-10);
    this._scatter();

    this.castle = new Castle(this, cfg.castle);
    this.portal = cfg.portal;
    this.add.image(cfg.portal.x, cfg.portal.y, "rock").setScale(1.3).setTint(0xd04545).setDepth(cfg.portal.y);

    this.players = this.add.group();
    this.enemies = this.add.group();

    this.eco = new Economy(this, cfg.economy);
    this.waves = new Waves(this, cfg, (w) => this._spawnEnemy(w));

    this.zoneGfx = this.add.graphics().setDepth(5000);
    this._drawZone(false);

    this.input.on("pointerdown", (p) => this._onPointer(p));
    const kb = this.input.keyboard;
    kb.addKey("ONE").on("down", () => this.arm("warrior"));
    kb.addKey("TWO").on("down", () => this.arm("archer"));
    kb.addKey("THREE").on("down", () => this.arm("lancer"));
    window.addEventListener("keydown", (this._winKey = (e) => {
      if (e.key === "Escape") this.togglePause();
      else if (e.key.toLowerCase() === "m") this._toggleMute();
    }));
    this.events.once("shutdown", () => { window.removeEventListener("keydown", this._winKey); this.audio.close(); });

    this.hud = new Hud(this, cfg);
    this.overlay = new Overlay(this);

    this.events.on("gold", (g) => this.hud.renderGold(g));
    this.events.on("wave-start", (n) => { this.hud.renderWave(n, cfg.waves.length); this.overlay.banner("Wave " + n); this.audio.play("wave"); if (!this.reduce) this.cameras.main.shake(220, 0.006); });
    this.events.on("wave-clear", (n) => { this.eco.bonus(cfg.economy.waveBonus); this.overlay.banner("Wave " + n + " cleared   +" + cfg.economy.waveBonus, 1500); });
    this.events.on("bounty", (x, y) => {
      this.eco.bounty(cfg.economy.killBounty);
      this.kills++;
      this.fx?.floatText?.(x, y - 22, "+" + cfg.economy.killBounty + "g", "#ffd66e");
      this._comboKill(x, y);
    });
    this.events.on("win", () => this._end(true));
    this.events.on("lose", () => this._end(false));
    this.events.on("sfx", (k) => this.audio.play(k));

    this.hud.renderGold(this.eco.gold);
    this.hud.renderWave(0, cfg.waves.length);
    this.time.delayedCall(1400, () => this.waves.start());
  }

  _scatter() {
    const items = [];
    for (let i = 0; i < 8; i++) items.push({ k: "tree", x: 80 + i * 160 + (i % 3) * 50, y: 332 + (i % 2) * 24, s: 0.46 });
    for (let i = 0; i < 9; i++) items.push({ k: "bush", x: 60 + i * 140 + (i % 2) * 60, y: (i % 2 ? 452 : 566), s: 0.55 });
    for (let i = 0; i < 6; i++) items.push({ k: "rock", x: 180 + i * 180 + (i % 2) * 70, y: 410 + (i % 3) * 80, s: 0.6 });
    for (const d of items) {
      const img = this.add.image(d.x, d.y, d.k).setOrigin(0.5, 0.9).setScale(d.s).setDepth(d.y);
      if (d.k !== "rock") img.setFrame(0); // tree/bush are animation strips -> first frame
    }
  }

  _drawZone(armed) {
    const z = this.cfg.deployZone;
    this.zoneGfx.clear();
    this.zoneGfx.fillStyle(armed ? 0x2b4a8a : 0x22335a, armed ? 0.24 : 0.10);
    this.zoneGfx.fillRect(z.xMin, z.yMin, z.xMax - z.xMin, z.yMax - z.yMin);
    this.zoneGfx.lineStyle(2, 0x6fa8dc, armed ? 0.85 : 0.30);
    this.zoneGfx.strokeRect(z.xMin, z.yMin, z.xMax - z.xMin, z.yMax - z.yMin);
  }

  _onPointer(p) {
    this.audio.resume(); // unlock audio on first gesture (browsers require a user gesture)
    if (this.paused || this.ended || !this._armed) return;
    const z = this.cfg.deployZone;
    if (p.worldX < z.xMin || p.worldX > z.xMax || p.worldY < z.yMin || p.worldY > z.yMax) return;
    this._deploy(this._armed, p.worldX, p.worldY);
  }

  _deploy(key, x, y) {
    const def = this.cfg.units[key];
    if (!def) return;
    if (this.players.getChildren().length >= this.cfg.maxPlayerUnits) { this.overlay.flash("Unit limit reached"); return; }
    if (!this.eco.canAfford(def.cost)) { this.overlay.flash("Need " + def.cost + " gold"); return; }
    this.eco.spend(def.cost);
    this.players.add(new Unit(this, x, y, def, "player", { foes: this.enemies }));
    this.audio.play("deploy");
  }

  _spawnEnemy(w) {
    const b = this.cfg.enemyBase;
    const def = { kind: b.kind, color: w.color, hp: Math.round(b.hp * w.hpMul), dmg: b.dmg, range: b.range, atkCd: b.atkCd, speed: b.speed * w.speedMul };
    const y = this.cfg.lane.y + (Math.random() * 2 - 1) * this.cfg.lane.jitter * 4;
    this.enemies.add(new Unit(this, this.portal.x + 20, y, def, "enemy", { foes: this.players, castle: this.castle }));
    this.audio.play("spawn");
  }

  arm(key) {
    if (this.paused || this.ended) return;
    this._armed = this._armed === key ? null : key;
    this.hud.setArmed(this._armed);
    this._drawZone(!!this._armed);
  }

  togglePause() {
    if (this.ended) return;
    this.paused = !this.paused;
    this.overlay.pause(this.paused);
    if (this.paused) { this.anims.pauseAll(); this.tweens.pauseAll(); } else { this.anims.resumeAll(); this.tweens.resumeAll(); }
  }

  _toggleMute() { this.hud.setMute(this.audio.toggleMute()); }

  _end(win) {
    if (this.ended) return;
    this.ended = true;
    this._armed = null;
    this._drawZone(false);
    this.anims.pauseAll();
    this.audio.play(win ? "win" : "lose");
    // meta: score the run into the persistent profile, then hand results to the end overlay
    const meta = this.registry.get("meta");
    const profile = meta ? this.registry.get("profile") : null;
    const wavesCleared = this.waves.idx;
    const base = { win, wavesCleared, goldEarned: this.eco.earned, kills: this.kills };
    if (meta && profile) {
      const res = applyRunResult(profile, { ...base, castleHpPct: this.castle.hp / this.castle.maxHp }, meta);
      saveProfile(profile);
      this.registry.set("profile", profile);
      this.registry.set("lastRun", { ...base, ...res });
    } else {
      this.registry.set("lastRun", base);
    }
    this.overlay.end(win, wavesCleared, this.eco.earned, this.waves.total);
  }

  _comboKill(x, y) {
    this.combo++;
    this.comboTimer = 2500;
    if (this.combo % 5 === 0) {
      const bonus = this.combo * 2;
      this.eco.bounty(bonus);
      this.fx?.floatText?.(x, y - 46, "COMBO x" + this.combo + "  +" + bonus + "g", "#ff8a3a");
    }
    this.hud?.setCombo?.(this.combo);
  }

  update(_t, delta) {
    if (this.paused || this.ended) return;
    this.eco.update(delta);
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) { this.combo = 0; this.hud.setCombo(0); }
    }
    const alive = this.enemies.getChildren().filter((u) => u.alive).length;
    this.waves.update(delta, alive);
  }
}
