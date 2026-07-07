// Tiny Swords — preload. Loads sprites (Tiny Swords Free Pack, Pixel Frog) + battle.json.
// Spritesheet frame size 192 for units; decor 128/256; tileset 64. Fatal overlay on loaderror.
import * as Phaser from "phaser";

const IMG = "assets/game/img/";

export class PreloadScene extends Phaser.Scene {
  constructor() { super("preload"); }

  preload() {
    const ss = (k, f, fw) => this.load.spritesheet(k, IMG + f, { frameWidth: fw, frameHeight: fw });
    const im = (k, f) => this.load.image(k, IMG + f);

    // Player units (blue)
    ss("warrior-blue-idle", "warrior-blue-idle.png", 192);
    ss("warrior-blue-run", "warrior-blue-run.png", 192);
    ss("warrior-blue-attack1", "warrior-blue-attack1.png", 192);
    ss("archer-blue-idle", "archer-blue-idle.png", 192);
    ss("archer-blue-run", "archer-blue-run.png", 192);
    ss("archer-blue-shoot", "archer-blue-shoot.png", 192);
    // Lancer (blue) — 320px frames, directional Right-attack
    ss("lancer-blue-idle", "lancer-blue-idle.png", 320);
    ss("lancer-blue-run", "lancer-blue-run.png", 320);
    ss("lancer-blue-attack", "lancer-blue-attack.png", 320);
    // Enemy warriors (4 colors) — idle/run/attack only
    for (const c of ["red", "purple", "yellow", "black"]) {
      ss(`warrior-${c}-idle`, `warrior-${c}-idle.png`, 192);
      ss(`warrior-${c}-run`, `warrior-${c}-run.png`, 192);
      ss(`warrior-${c}-attack1`, `warrior-${c}-attack1.png`, 192);
    }
    // Projectile + buildings + FX + UI
    im("arrow", "arrow.png");
    im("castle-blue", "castle-blue.png");
    im("dust", "dust.png");
    im("explosion", "explosion.png");
    im("bar-base", "bar-base.png");       // BigBar — castle HP
    im("bar-fill", "bar-fill.png");
    im("unitbar-base", "unitbar-base.png"); // SmallBar — unit HP
    im("unitbar-fill", "unitbar-fill.png");
    im("wood-table", "wood-table.png");
    im("icon-coin", "icon-coin.png");
    im("btn-blue", "btn-blue.png");
    im("btn-blue-pressed", "btn-blue-pressed.png");
    // Decor + tileset
    im("rock", "rock.png");
    im("cloud", "cloud.png");
    ss("bush", "bush.png", 128);
    ss("tree", "tree.png", 256);
    ss("tiles", "tiles.png", 64);

    this.load.json("battle", "data/battle.json");

    this.load.on("loaderror", (file) => {
      this.add.rectangle(640, 360, 1280, 720, 0x1a1410).setDepth(999);
      this.add.text(640, 360, "Couldn't load asset: " + (file?.key ?? "unknown") +
        "\nIf sprites are missing, re-add Tiny Swords pack (see CREDITS.md).", {
        fontFamily: "Nunito, sans-serif", color: "#fbf6ec", fontSize: "22px", align: "center",
      }).setOrigin(0.5).setDepth(1000);
    });
  }

  create() { this.scene.start("battle"); }
}
