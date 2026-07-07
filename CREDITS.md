# Credits — Tiny Swords: Defend the Kingdom

## Art
| Asset | Author | License | URL |
|---|---|---|---|
| Tiny Swords (Free Pack) — units, buildings, terrain, FX | Pixel Frog | Free for personal & commercial use; **no redistribution/repackage** (even modified) | https://pixelfrog-assets.itch.io/tiny-swords |
| Vector UI Pack — UI (buttons, panels, bars, icons) | dobo_ui | Free for personal & commercial use; **no redistribution** | https://dobo-ui.itch.io/vector-ui-pack |

## Sprite notice (important)
Both packs' licenses forbid redistribution, so sprites are **not committed**:
- Raw packs are staged at `assets/ts-asset/` and `assets/vector-asset/` (gitignored).
- Curated sprites live in `assets/game/img/` (also gitignored).

**To make the game render**, download both free packs and copy the needed sprites into `assets/game/img/`:
- **Tiny Swords** → units, buildings, terrain, FX (`warrior-blue-run.png`, `castle-blue.png`, `tiles.png`, `dust.png`, …).
- **Vector UI Pack** → UI (`btn-blue.png`, `btn-blue-pressed.png`, `bar-base/fill.png`, `unitbar-base/fill.png`, `wood-table.png`, `icon-coin.png`, `panel-blue.png`, `card-blue.png`).

Texture keys in `assets/game/scene-preload.js` map 1:1 to `assets/game/img/<key>.png`. Full list in `docs/game-design.md`.

## Engine
- [Phaser 3.80](https://phaser.io) (MIT) — via jsDelivr CDN (ESM importmap). No build step.

## Audio
SFX are synthesized at runtime via the Web Audio API (no audio files). See `assets/game/sys-audio.js`.

## Attribution
Neither pack requires attribution, but it is appreciated — both credited here and in the README.
