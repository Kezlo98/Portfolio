// Tiny Swords — Phaser 3 boot (no-build, ESM via importmap). Top-down, manual movement.
// export startGame(mount) -> Phaser.Game. play.html wraps this in a title screen + Play gate.
import * as Phaser from "phaser";
import { PreloadScene } from "./scene-preload.js";
import { BattleScene } from "./scene-battle.js";
import { load as loadProfile, applyMeta, reconcile, save as saveProfile } from "../js/meta-profile.js";

// export startGame(mount) -> Phaser.Game. Loads battle.json + meta.json, the persistent
// profile, and stores baseCfg/meta/profile/battleCfg(modified) on the registry for scenes.
export async function startGame(mount) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [battleRes, metaRes] = await Promise.all([
    fetch("data/battle.json").then((r) => r.json()).catch(() => null),
    fetch("data/meta.json").then((r) => r.json()).catch(() => null),
  ]);
  const baseCfg = battleRes || { viewport: { w: 1280, h: 720 }, castle: { hp: 1000 }, economy: {}, units: {} };
  const meta = metaRes || null;
  const W = baseCfg.viewport?.w ?? 1280;
  const H = baseCfg.viewport?.h ?? 720;

  const profile = loadProfile();
  if (meta) { reconcile(profile, meta); saveProfile(profile); } // sanitize + persist (corrupt/future saves)

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: mount,
    backgroundColor: "#3a5a34",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    render: { antialias: true, pixelArt: true },
    scene: [PreloadScene, BattleScene],
  });
  game.registry.set("reduceMotion", reduce);
  game.registry.set("baseCfg", baseCfg);
  game.registry.set("meta", meta);
  game.registry.set("profile", profile);
  game.registry.set("battleCfg", applyMeta(baseCfg, profile, meta));
  return game;
}
