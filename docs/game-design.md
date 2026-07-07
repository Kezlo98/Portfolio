# Game Design Document — Tiny Swords: Defend the Kingdom

**Status:** MVP (shipped) · **Version:** 1.0 · **Updated:** 2026-07-07
**Engine:** Phaser 3.80 (no-build, ESM via importmap) · **Art:** Tiny Swords (Free Pack) — Pixel Frog
**Source of truth for numbers:** [`data/battle.json`](../data/battle.json). This document is descriptive; if code and doc disagree, the code wins.

---

## 1. Overview

### Summary
*Defend the Kingdom* is a top-down, single-lane **castle wave-defense** game with lite-RTS economy. The player protects a blue castle on the left against eight escalating enemy waves marching from a portal on the right. The player does **not** control units directly — they spend gold to deploy Warriors and Archers, which then auto-march and auto-fight. Skill lives in **what** you build, **when**, and **how you manage gold**.

| | |
|---|---|
| **Platform** | Web (desktop + mobile browsers), served over HTTP (ESM/CORS require http, not `file://`) |
| **Tech** | HTML · vanilla JS (ESM) · Phaser 3.80 via jsDelivr CDN · Web Audio API (procedural SFX) |
| **Art** | Tiny Swords (Free Pack) — units, castle, terrain, UI, FX. Sprites gitignored (license); see `CREDITS.md` |
| **Audience** | Portfolio visitors, game-design-literate reviewers |
| **Session length** | ~90–120 seconds (target met — see §5) |
| **Viewport** | 1280×720, `Scale.FIT` + centered, pixel-art rendering |

### Controls
| Input | Action |
|---|---|
| `1` / `2` (or click button) | Arm **Warrior** / **Archer** |
| Click field (deploy zone) | Deploy the armed unit at that point |
| `Esc` | Pause / resume |
| `M` | Mute / unmute |
| Touch | Tap button → tap field (mobile) |

---

## 2. Design Pillars & Core Loop

### Core engagement loop
```
 OBSERVE threat ─▶ PLAN composition ─▶ DEPLOY units ─▶ WATCH combat ─▶ EARN gold ─▶ REPEAT (harder)
```
Per-wave emotional arc: **anticipation** (wave banner + prep timer) → **decision** (spend gold) → **spectacle** (march, clash, FX) → **reward** (bounty + wave bonus) → **escalation** (next wave harder).

### Design pillars
1. **Readable combat** — at a glance you see who is winning (castle HP bar, unit HP bars, dust on death, banners).
2. **Decisive economy** — gold is scarce enough that every deploy is a meaningful trade-off.
3. **Clear escalation** — each wave is visibly and numerically harder; color tiers telegraph tier shifts.
4. **Fair loss** — defeat comes from the castle HP reaching 0, always visible, always attributable to a deploy/economy choice (not RNG).

### Player fantasy
A general on a battlement — issuing one decision at a time, watching tiny soldiers hold the line against a rising tide. The castle HP bar is the ticking doomsday clock that makes every leak feel personal.

### Skill surface (and its limits)
Because units are uncontrollable post-deploy, skill is compressed into the deployment phase:

| Layer | Type | Where it lives | Risk |
|---|---|---|---|
| Composition | Strategic | Warrior vs Archer ratio | **MEDIUM** — Archer is currently under-tuned (§6) |
| Timing | Tactical | Deploy early (intercept far) vs late (conserve) | LOW — no explicit late-deploy penalty |
| Positioning | Tactical | (x, y) in deploy zone | LOW — y is cosmetic; combat ignores y (§3) |
| Economy | Strategic | Save vs spend, unit-cap management | LOW — passive floor prevents hard starvation |

> **#1 design risk (auto-battle genre):** if composition/timing/economy decisions don't *feel* meaningful, the game "plays itself." Mitigations are documented in §6 and §9.

---

## 3. Mechanics

### 3.1 Arena & win/lose
- **Castle** (blue): x=175, base y=560, **HP 1000**. Its `frontX` = 250 — enemies past this line attack the castle directly.
- **Portal** (enemy spawn): x=1170, y≈500. Enemies spawn at `portal.x + 20` and march left.
- **Lane**: nominal y=500 (±10 jitter on enemy spawn). Player units keep whatever y the player clicked (deploy zone y ∈ [300, 680]).
- **Win:** clear wave 8 with the castle alive.
- **Lose:** castle HP reaches 0.

### 3.2 Units (player) — `data/battle.json → units`
| Unit | Cost | HP | Dmg | AtkCd | DPS¹ | Range | Speed | Role |
|---|---|---|---|---|---|---|---|---|
| **Warrior** | 50g | 120 | 16 | 650ms | **24.6** | 34 (melee) | 46 px/s | Balanced / frontline |
| **Archer** | 60g | 60 | 20 | 950ms | **21.1** | 175 (ranged) | 38 px/s | Ranged DPS / backline |
| **Lancer** | 90g | 240 | 10 | 700ms | **14.3** | 32 (melee) | 30 px/s | Tank wall (highest EHP/gold) |

¹ `DPS = dmg / (atkCd/1000)`. Both units have **no armor** (EHP = HP).

### 3.3 Enemies — `data/battle.json → enemyBase` + `waves`
Base enemy: HP 70, dmg 10, atkCd 700ms (**DPS 14.3**), range 30, speed 36, warrior-type. Per-wave overrides apply `hpMul` and `speedMul`; color is cosmetic (no mechanical difference between red/purple/yellow/black — see §9).

### 3.4 Combat model (important — read before balancing)
- **Manual movement, no arcade physics on units.** Units translate along x at `speed` px/s; y is fixed at deploy/spawn.
- **Targeting = nearest foe by `|Δx|` within `range`.** Distance is **x-only** — a unit at y=350 and a foe at y=600 with the same x are considered adjacent. *Consequence: y-positioning is cosmetic; "formations" do not affect who fights whom.* (Code: `entity-unit.js → _findTarget`, annotated.)
- **No collision / separation.** Units overlap freely; there is no body-blocking, so a strict frontline/backline does not form mechanically — everyone within x-range of a foe fights.
- **No aggro spread.** Multiple units may target the same foe (focus-fire / overkill).
- **Melee** applies damage instantly on each attack-cooldown tick. **Ranged** spawns an arrow projectile (170 ms tween); damage applies on arrival only if the target is still alive and the game hasn't ended — so effective Archer DPS is marginally below the nominal 21.1.
- **FSM per unit:** `march → fight (foe in range) → die`. Player units with no target march right; they idle at the portal edge rather than walking off-screen.
- **Death:** dust burst (frozen under reduced-motion), bounty if enemy, sprite destroyed and removed from its group.

### 3.5 Deploy system
- **Arm** a unit type (button or `1`/`2`), then **click the deploy zone** (x ∈ [290, 470], y ∈ [300, 680]) to spawn it there at the clicked point.
- **Cost-gated:** unaffordable → flash "Need N gold"; button dims.
- **Unit cap:** 24 concurrent player units (`maxPlayerUnits`).
- Clicks outside the deploy zone (e.g. on HUD buttons) are ignored by the deploy handler.

---

## 4. Economy

### 4.1 Faucets (income)
| Source | Amount | Frequency | Est. total / game |
|---|---|---|---|
| Starting gold | 150 | once | 150 |
| Passive income | 6 / sec | continuous | ~420–480 |
| Kill bounty | 14 / kill | per enemy (114 total) | up to 1,596 |
| Wave-clear bonus | 70 / wave | per wave (×8) | 560 |
| **Total earnable** | | | **~2,725–2,785** |

### 4.2 Sinks (expenditure)
| Unit | Cost | Affordable from full economy |
|---|---|---|
| Warrior | 50g | ~54 (capped at 24 alive) |
| Archer | 60g | ~46 |
| Lancer | 90g | ~30 |

### 4.3 Income mix
- Kill bounty ≈ **57%** of income (dominant — correct: rewards active defense, drives the positive feedback loop).
- Wave bonus ≈ 20%, passive ≈ 16%, starting ≈ 5%.

### 4.4 Affordability pacing
- Warrior (50g): **8.3 s** of passive income; effectively ~5–6 s during combat once bounties flow.
- Archer (60g): **10 s** of passive — a reachable ranged pick. Lancer (90g): ~15 s — the premium frontline wall.

### 4.5 Snowball vs starvation
- **Snowball** (intended): more kills → more gold → more units → easier next wave.
- **Death-spiral risk** (mitigated): the 6/s passive + 70g wave bonus guarantees ≥94g of income per inter-wave gap even with zero kills — enough for ~1 warrior + change. This is the deliberate safety net that keeps a single bad wave from ending the run.

---

## 5. Wave Progression

### 5.1 The eight waves
| # | Color | Count | hpMul | Enemy HP | Total HP | speedMul | Enemy spd | Spawn int. | Spawn dur. |
|---|---|---|---|---|---|---|---|---|---|
| 1 | red | 6 | 1.0 | 70 | 420 | 1.00 | 36.0 | 1100ms | 5.5s |
| 2 | red | 9 | 1.2 | 84 | 756 | 1.05 | 37.8 | 1000ms | 8.0s |
| 3 | purple | 11 | 1.5 | 105 | 1,155 | 1.10 | 39.6 | 950ms | 9.5s |
| 4 | purple | 13 | 1.8 | 126 | 1,638 | 1.15 | 41.4 | 900ms | 10.8s |
| 5 | yellow | 15 | 2.2 | 154 | 2,310 | 1.20 | 43.2 | 850ms | 11.9s |
| 6 | yellow | 17 | 2.6 | 182 | 3,094 | 1.25 | 45.0 | 800ms | 12.8s |
| 7 | black | 19 | 3.0 | 210 | 3,990 | 1.25 | 45.0 | 760ms | 13.7s |
| 8 | black | 24 | 3.6 | 252 | 6,048 | 1.27 | 45.7 | 700ms | 16.8s |

Total enemies: **114**. Total enemy HP across the game: **~20,410**.

### 5.2 Curve analysis
- **Total HP scales ~14.4×** (420 → 6,048), roughly geometric — the right shape. The player's per-unit DPS is fixed, so they must scale army *size* ~5–6× via accumulated gold, which the economy supports (§4).
- **Wave 8 is a deliberate climax spike** (+52% HP, +26% count vs wave 7) — a "hold the line" finale. Good.
- **Spawn interval tightens** 1100→700 ms, increasing pressure independently of HP.
- **Speed scales modestly** (1.00→1.27×). Earlier builds let wave-7/8 enemies outrun Warriors; **speed is now capped** (1.25/1.27 → ≤46 px/s) so melee can re-engage. Lancers (30 px/s) are intentionally slow — they hold the line, not chase.

### 5.3 Pacing
- Initial prep: ~2.5 s. Inter-wave prep: ~4 s. Combat per wave: ~8–20 s.
- **Estimated session: 90–120 s** — appropriate for a portfolio piece (cf. Clash Royale's 3-min target; this game is simpler, so shorter is right).

### 5.4 Tier telegraphing
Color shifts (red→purple→yellow→black at waves 3/5/7) give a clear visual "tier up" cue with no mechanical change — appropriate for scope, but an opportunity for future enemy variety (§9).

---

## 6. Balance Analysis

### 6.1 Gold-efficiency (the core balance lens)
`gold-efficiency = stat / cost`:

| Stat | Warrior (50g) | Archer (60g) | Archer / Warrior |
|---|---|---|---|
| HP | 120 | 60 | 0.50× |
| DPS | 24.6 | 21.1 | 0.86× |
| Range | 34 | 175 | **5.15×** |
| **EHP / gold** | **2.40** | **1.00** | **0.42×** |
| **DPS / gold** | **0.49** | **0.35** | **0.71×** |

### 6.2 Time-to-kill (1v1 vs base enemy, HP 70 / DPS 14.3)
- **Warrior** kills enemy in 70/24.6 ≈ **2.8 s**; enemy kills warrior in 120/14.3 ≈ **8.4 s**. Warrior wins comfortably, ~3 enemies slain before falling.
- **Archer** kills enemy in 70/21.1 ≈ **3.3 s**; if unprotected, the enemy closes the 175 px gap (relative ~82 px/s) in ~2.1 s, then kills the Archer in 60/14.3 ≈ **4.2 s**. Archer barely trades 1-for-1 without a frontline.

### 6.3 Archer tuning (applied) — was gold-inefficient
The Warrior used to be strictly more gold-efficient than the Archer (less DPS/gold *and* EHP/gold; Archer's only edge was 5.15× range). **Fixed (2026-07-07):** Archer cost 80 → **60g** → EHP/gold 0.75→1.00, DPS/gold 0.26→0.35 (ratios now 0.42× / 0.71× vs Warrior — closer; range still costs some efficiency, intentionally). Archer is now a clear "ranged investment" rather than a trap pick.

### 6.4 Wave-8 survivability check
A Warrior kills a wave-8 enemy (HP 252) in 252/24.6 ≈ **10.2 s**. With 24 enemies spawning over 16.8 s and arriving in a stream, a static wall is heavily pressured. Wave-7/8 enemy speed is now **capped at ≤46 px/s** (equal to Warriors), so melee can re-engage passed enemies. Survivability depends on a deep army (Lancer front + Archer ranged DPS). **If playtesting shows wave 8 is unwinnable,** reduce wave-8 `count` to ~20 or `hpMul` to ~3.2.

### 6.5 Tuning policy
Balance lives in `data/battle.json`, not in code. Adjust there and re-play; no rebuild. Common levers: raise `economy.passivePerSec` / lower `enemyBase.hp` to ease; raise `waves[].count` / `enemyBase.dmg` to harden.

### 6.6 Other known design gaps (documented, not blocking)
- **x-only targeting** → formations are cosmetic; the Lancer "tanks" by being a high-HP frontliner that persists, not via aggro/taunt. (Future: 2D distance + collision would make frontline/backline real.)
- **No aggro spread** → units may overkill one foe; no taunt/spacing logic.
- **Waves 5–7 lack mechanical novelty** — only numbers scale. (Future: enemy types, §9.)
- **Late-deploy has no penalty** — timing skill is under-pressured.

---

## 7. UX & Accessibility

### 7.1 HUD (all in-canvas, depth 100000+)
- **Top-left:** gold counter on a wood-table panel.
- **Top-center:** `Wave n / 8`.
- **Top-right:** sound on/off indicator.
- **Bottom-center:** deploy buttons (Warrior 50g / Archer 60g / Lancer 90g); armed button swaps to its pressed texture; unaffordable buttons dim to 45% alpha.
- **Top-center (under wave):** live **kill-combo** counter ("COMBO ×n") when ≥2.
- **Deploy zone:** subtle rectangle; brightens when a unit is armed.

### 7.2 Feedback / "juice"
- **Screen shake** on castle hit (subtle) + wave start (medium) — respects `prefers-reduced-motion`.
- **Floating combat text**: "+Ng" gold pops on every enemy kill; "COMBO ×n +Ng" bonus pop every 5-chain.
- **Kill-combo meter**: chained kills within 2.5 s build a multiplier; every 5 = bonus gold (`combo×2`). Resets on timeout — the "playful" centerpiece + an aggression reward.
- **Hit flash**: damaged units tint-white 60 ms for readable combat.
- HP bars appear on units only when damaged; castle HP bar always visible.
- Death → dust particle burst; castle hit → explosion burst.
- Banner toasts on wave start / clear; flash toasts on deploy error.
- Procedural Web Audio SFX: deploy, spawn, hit, death, wave, win, lose (see `sys-audio.js`).

### 7.3 Accessibility & robustness
- `prefers-reduced-motion` → particle/FX frozen; title-card animations disabled.
- Mute (`M`), pause (`Esc`), touch input, `Scale.FIT` + center on any viewport.
- Fatal-asset overlay on loaderror (with a pointer to `CREDITS.md` if sprites are missing).
- Graceful boot: `play.html` wraps `startGame()` in try/catch with a fallback message.

---

## 8. Content Scope

**In scope (shipped):** 2 player unit types (Warrior, Archer), 1 enemy type × 4 cosmetic colors, 8 waves, gold economy, win/lose, pause/mute, mobile touch, procedural audio.

**Explicitly out of scope (by design — portfolio piece, KISS):** narrative/campaign, save/persistence, multiplayer, IAP, analytics, hand-authored levels (procedural scatter only), boss units, multiple lanes/maps.

**Art:** Tiny Swords (Free Pack) only — units (192 px frames), castle, terrain tileset, UI bars/buttons/wood-table, dust/explosion FX. No audio assets (procedural). See `CREDITS.md` for the license + sprite-setup caveat.

---

## 9. Future Considerations (documented, **not committed**)

Ranked by effort-to-value. Items 1–3 are config-only; 4–6 need new code.

| # | System | Effort | Value | Notes |
|---|---|---|---|---|
| 1 | **Score + star rating** | LOW | HIGH | Castle HP%, gold earned, clear time → 1–3 stars. Zero new mechanics, big replay incentive. |
| 2 | **Endless mode** | LOW | HIGH | After wave 8, keep looping waves with a growing multiplier. Pure config. |
| 3 | **Difficulty toggle** | LOW | MED | Normal (current) + Hard (faster spawn / less gold). Two config lines. |
| 4 | **Unit upgrade tier** | MED | HIGH | Spend 100g once: Warrior→Knight (more HP/dmg), Archer→Marksman (range/dmg). Unlocks mid-game. |
| 5 | **Enemy variety** | MED | MED | Wave 5+: "fast" (low HP, high spd/dps); wave 7+: "tank" (high HP, slow). Makes late waves mechanically distinct. |
| 6 | **Castle ability** | MED | MED | One active (e.g. Rally: +50% unit speed 5 s, cooldown). Adds micro-decisions mid-wave. |

**Not recommended:** multi-tier upgrade trees, skill trees — over-scoped for a portfolio piece.

---

## 10. Meta-Progression (Roguelite Layer)

A persistent meta layer between runs — profile (level/XP/gold), armory (equipment), skill tree, and a **Barracks** hub. Turns the 2-minute base game into a small roguelite. Persists via `localStorage` (key `tinySwordsMeta`, versioned, reset-on-corrupt). Logic/config: `assets/js/meta-profile.js`, `assets/js/barracks.js`, `data/meta.json`.

### Meta loop
`run → earn XP + bank 50% of gold → Barracks (buy gear / allocate skills) → Next Run (modifiers re-applied) → repeat.` First run goes title → battle → end → Barracks unlocks.

### Profile & XP
- `xp` is **cumulative** (single source of truth); level derived. Cap **10**.
- Curve: `xpForNext(n) = round(100 × 1.35^(n-1))` → ~3,964 XP to max.
- **Run scoring:** `xp = wavesCleared×25 + floor(goldEarned/20) + floor(castleHpPct×20)`; **banked gold = floor(goldEarned × 0.5)**.
- **Skill points:** 1 per level from 2–10 (= 9 total); `skillPoints = (level − 1) − allocated`.

| Level | XP to next |
|---|---|
| 1→2 | 100 |
| 3→4 | 182 |
| 5→6 | 332 |
| 7→8 | 604 |
| 9→10 | 1,101 |

### Armory (5 items, 3 slots, auto-equip best, no rarity)
| Item | Slot | Cost | Modifier |
|---|---|---|---|
| Iron Sword | weapon | 300g | +15% unit dmg |
| Steel Sword | weapon | 800g | +25% unit dmg |
| Leather Shield | armor | 250g | +15% unit HP |
| Iron Shield | armor | 700g | +25% unit HP |
| War Horn | standard | 500g | +20% start gold |

Buying adds to `owned`; the highest-modifier owned item per slot auto-equips (no manual equip/unequip UI — KISS).

### Skill tree (6 skills, 1 pt each, free respec)
| Skill | Effect | Applies to |
|---|---|---|
| Fortification | +10% castle HP | `castle.hp` |
| Swift March | +10% unit speed | `units.*.speed` |
| Iron Will | +10% unit HP | `units.*.hp` |
| Keen Edge | +10% unit damage | `units.*.dmg` |
| Treasury | +10% passive gold/s | `economy.passivePerSec` |
| Bounty Hunter | +15% kill bounty | `economy.killBounty` |

### Modifier math
**Additive within a category**, applied to a deep-cloned `battle.json` → `game.registry.battleCfg`. The battle scene consumes it unchanged — **zero edits to combat/economy logic**. Example: Iron Will (+10%) + Iron Shield (+25%) → +35% unit HP. Max-power ceiling ≈ **+35%** to unit stats — strong, but the 24-unit cap remains the real bottleneck, so a maxed player still needs sound deployment.

| Stat | Base | Maxed (all gear + skills) |
|---|---|---|
| Warrior HP | 120 | 162 (+35%) |
| Warrior dmg | 16 | 22 (+35%) |
| Archer dmg | 20 | 27 (+35%) |
| Castle HP | 1,000 | 1,100 (+10%) |
| Start gold | 150 | 180 (+20%) |

### Difficulty stance
Fixed 8 waves for v1. Meta makes runs **comfortable, not trivial** — the ~35% ceiling + 24-unit cap keep tactical play required. An "Elite Waves" toggle (Hades-style Heat) is the documented stretch goal (§9 #3), deferred.

### Persistence & robustness
- `localStorage["tinySwordsMeta"]`, schema `version`-ed; `load()` validates and resets to default on any parse/shape failure.
- Saved on every change (buy, allocate, respec, run end).
- The Barracks is a DOM overlay (`#barracks`); reached from the end-screen **Barracks** button via the game-level `to-barracks` event (survives scene restart). **Next Run** re-applies modifiers and restarts the battle scene.

### Tuning
All meta numbers live in `data/meta.json` (gear costs/mods, skill effects, XP curve, run-scoring weights, bank ratio). Adjust there — no code change.

---

## 11. Appendix

### 10.1 Formulas
- `DPS = dmg / (atkCd / 1000)`
- `EHP = HP` (no armor system)
- `gold-efficiency = stat / cost`
- Enemy per-wave HP = `enemyBase.hp × waves[i].hpMul`
- Wave spawn duration = `count × interval`

### 10.2 File architecture (`assets/game/`, each file <200 lines)
| File | Responsibility |
|---|---|
| `boot.js` | Phaser config (FIT 1280×720, pixelArt), scene registry, `startGame(mount)` |
| `scene-preload.js` | Load spritesheets + `battle.json`; fatal loaderror overlay |
| `scene-battle.js` | Orchestrator: ground/decor, castle, groups, economy, waves, input, HUD, overlays, audio |
| `entity-castle.js` | Castle sprite + HP bar; `takeDamage(n)`; emits `lose` |
| `entity-unit.js` | `Unit` (manual movement, FSM march→fight→die, x-only range targeting, HP bar) + `createAnims()` |
| `sys-economy.js` / `sys-waves.js` / `sys-fx.js` / `sys-audio.js` | Economy; wave spawner; particle/arrow FX; WebAudio SFX |
| `ui-hud.js` / `ui-overlay.js` | Gold/wave/deploy buttons; banner/flash/pause/win-lose overlays |
| `data/battle.json` | All tuning |

### 10.3 Sprite manifest (`assets/game/img/`, gitignored — see `CREDITS.md`)
Units (192 px frames): `warrior-{blue,red,purple,yellow,black}-{idle,run,attack1}.png`, `archer-blue-{idle,run,shoot}.png`, `lancer-blue-{idle,run,attack}.png` (320 px frames, directional Right-attack), `arrow.png`. `castle-blue.png` (320×256). `tiles.png` (576×384; 64 px grid, grass = frame 10). Decor: `bush.png` (128 strip), `tree.png` (256 strip), `rock.png`, `cloud.png`. UI (dobo_ui Vector UI Pack): `btn-blue{,-pressed}.png` (buttonAdvanced), `bar-{base,fill}.png` + `unitbar-{base,fill}.png` (progressBar), `wood-table.png` (panel), `icon-coin.png`, `panel-blue.png`, `card-blue.png` (Barracks DOM). FX (Tiny Swords): `dust.png`, `explosion.png`.

### 10.4 References
- Design theory: Schell *The Art of Game Design*; Schreiber *Game Design Workshop*; Sirlin *Playing to Win*.
- Genre: tower-defense postmortems; Clash Royale design (Supercell); RTS economy patterns (Age of Empires, Warcraft III).
- Internal research: [`plans/reports/researcher-260707-castle-defense-gameplay.md`](../plans/reports/researcher-260707-castle-defense-gameplay.md).

---

**Unresolved / open questions**
1. *Is wave 8 survivable with perfect play?* Enemy speed is now capped ≤ Warrior speed (§6.4); a full playtest should confirm the 24-enemy climax is winnable with a deep army (Lancer front + Archer DPS). Lever if not: reduce wave-8 `count`.
2. ~~Archer buff~~ — **applied** (cost 80→60g, §6.3). Resolved.
3. *Do formations matter?* Currently no (x-only targeting, no collision). Making y-positioning meaningful is a future combat-model change (§6.6), not a tuning tweak.
