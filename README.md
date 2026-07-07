# Portfolio

Static portfolio + a top-down castle wave-defense game (**Tiny Swords: Defend the Kingdom**) for **Son BIP** - indie developer building Shopify apps in public.
Pages: `index.html` (portfolio + Play CTA), `journey.html`, `finance.html`, `play.html` (the game).

No build step. ES modules, `fetch()` data, and Three.js 3D assets (`assets/models/*.glb`, `assets/hdri/*.hdr`) are blocked by CORS over `file://` — **serve over HTTP**.

## How to run

Pick any static server. From the project root:

**Python 3** (built-in):
```bash
python3 -m http.server 8000
```

**Node** (one-off, no install):
```bash
npx serve .
# or
npx http-server -p 8000
```

**VS Code**: install the *Live Server* extension → right-click `index.html` → *Open with Live Server*.

Then open <http://localhost:8000>.

## Structure

```
index.html, journey.html, finance.html, play.html   # portfolio pages + game (play.html)
assets/css/                               # ghibli.css (portfolio), arcade.css (3D)
assets/js/                                # game-lib.js (data/derive), atmosphere.js + reveal.js (PixiJS)
assets/game/                              # Phaser game: boot, scene-preload/battle, entity-castle/unit, sys-economy/waves/fx/audio, ui-hud/overlay, game.css, img/ (gitignored)
assets/ts-asset/                          # raw Tiny Swords pack (gitignored — license)
assets/img/  assets/hdri/  assets/models/ # images, HDRI env maps, GLB models
data/                                     # journey.json + finance.json + battle.json (game config) + CSV + favicon
docs/                                     # game-design.md (GDD)
```

## Game - Tiny Swords: Defend the Kingdom

`play.html` is a top-down castle wave-defense game (Phaser 3, no-build) built with the **Tiny Swords** asset pack (Pixel Frog). Defend the blue castle on the left against 8 escalating enemy waves (red → purple → yellow → black) marching from the right. Gold accrues passively + per kill; spend it to deploy Warriors (melee) and Archers (ranged), which auto-march and fight. Survive all 8 waves to win. All tuning lives in `data/battle.json`.

**Controls:** `1`/`2` arm Warrior/Archer, click the field to deploy, `Esc` pause, `M` mute. Touch supported.

**Meta-progression (roguelite):** runs earn XP + bank 50% of gold (persisted via `localStorage`). Between runs, the **Barracks** hub lets you buy equipment (3 slots) and allocate skills (6) — modifiers apply to the next run's stats. Level cap 10; ~15 runs to max. Config in `data/meta.json`; logic in `assets/js/meta-profile.js` + `assets/js/barracks.js`.

From the portfolio, `index.html` has a "Play the game" button; the game also runs standalone at `play.html`. See `CREDITS.md` (assets + sprite setup) and `docs/game-design.md` (design doc).

> **Sprites not included:** the Tiny Swords license forbids redistribution, so `assets/game/img/` is gitignored. To render the game, download the free pack and copy sprites in — see `CREDITS.md`.

## Tech

HTML · CSS · vanilla JS (ESM) · [Phaser 3](https://phaser.io) (game) + [PixiJS v8](https://pixijs.com) (portfolio atmosphere) + [Three.js](https://threejs.org) via CDN import maps. No install, no build.
