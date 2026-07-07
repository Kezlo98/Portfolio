// Barracks: DOM meta hub between runs. Reads/writes the persistent profile (meta-profile.js),
// re-applies modifiers to game.registry.battleCfg on every change, and restarts the battle on Next Run.
// Entry: the end-screen "Barracks" button emits the game-level "to-barracks" event (survives restart).
import { save, buyGear, allocateSkill, unallocateSkill, respec, skillPoints, applyMeta, effectiveStats, xpProgress, levelFromXp } from "./meta-profile.js";

let game = null;

export function initBarracks(g) {
  game = g;
  game.events.on("to-barracks", openBarracks);
}

const profile = () => game.registry.get("profile");
const meta = () => game.registry.get("meta");
const baseCfg = () => game.registry.get("baseCfg");

export function openBarracks() {
  if (!game) return;
  if (!meta()) { window.location.href = "index.html"; return; }
  render();
  document.getElementById("barracks").hidden = false;
  document.getElementById("game").style.visibility = "hidden";
}

function nextRun() {
  game.registry.set("battleCfg", applyMeta(baseCfg(), profile(), meta()));
  save(profile());
  document.getElementById("barracks").hidden = true;
  document.getElementById("game").style.visibility = "";
  game.scene.getScene("battle").scene.restart();
}

function render() {
  const p = profile(), m = meta(), base = baseCfg();
  const xp = xpProgress(p.xp, m);
  const pts = skillPoints(p, m);
  const eff = effectiveStats(base, p, m);
  const pct = xp.atCap ? 100 : Math.round((xp.into / xp.need) * 100);
  document.getElementById("barracks").innerHTML = `
    <div class="bk">
      <header class="bk-head">
        <h2>Barracks</h2>
        <div class="bk-level">
          <span class="bk-lvl">Lv ${levelFromXp(p.xp, m)}</span>
          <div class="bk-xpbar"><div class="bk-xpfill" style="width:${pct}%"></div></div>
          <span class="bk-xptext">${xp.atCap ? "MAX LEVEL" : xp.into + " / " + xp.need + " XP"}</span>
        </div>
        <span class="bk-gold"><img class="bk-coin" src="assets/game/img/icon-coin.png" alt=""> ${p.gold} <em>gold</em></span>
      </header>
      <p class="bk-life">Runs ${p.stats.totalRuns} · Wins ${p.stats.totalWins} · Kills ${p.stats.totalKills} · Best wave ${p.stats.highestWave}/8</p>
      <div class="bk-cols">
        <section class="bk-col"><h3>Armory</h3>${renderGear(p, m)}</section>
        <section class="bk-col"><h3>Skills <span class="bk-pts">${pts} free</span></h3>${renderSkills(p, m, pts)}<button class="bk-respec" data-act="respec">Reset skills</button></section>
        <section class="bk-col"><h3>Field Guide</h3>${renderStats(base, eff)}</section>
      </div>
      <footer class="bk-foot">
        <button class="bk-btn bk-next" data-act="next">Next Run ▶</button>
        <button class="bk-btn bk-menu" data-act="menu">Menu</button>
      </footer>
    </div>`;
  wire();
}

function renderGear(p, m) {
  return m.gear.map((g) => {
    const owned = p.owned.includes(g.id);
    const equipped = p.gear[g.slot] === g.id;
    const afford = p.gold >= g.cost;
    const btn = equipped
      ? `<button class="bk-g-btn equipped" disabled>Equipped</button>`
      : owned ? `<button class="bk-g-btn owned" disabled>Owned</button>`
      : afford ? `<button class="bk-g-btn" data-buy="${g.id}">Buy · ${g.cost}g</button>`
      : `<button class="bk-g-btn locked" disabled>${g.cost}g</button>`;
    return `<div class="bk-gear${equipped ? " eq" : ""}">
      <div class="bk-g-name">${g.name} <span class="bk-g-slot">${g.slot}</span></div>
      <div class="bk-g-desc">${g.desc}</div>${btn}</div>`;
  }).join("");
}

function renderSkills(p, m, pts) {
  return m.skills.map((s) => {
    const on = p.skills[s.id];
    const btn = on
      ? `<button class="bk-s-btn on" data-unalloc="${s.id}">✓ Active</button>`
      : pts > 0 ? `<button class="bk-s-btn" data-alloc="${s.id}">Unlock</button>`
      : `<button class="bk-s-btn locked" disabled>${levelFromXp(p.xp, m) <= 1 ? "Need level" : "No free points"}</button>`;
    return `<div class="bk-skill${on ? " on" : ""}"><div class="bk-s-name">${s.name}</div><div class="bk-s-desc">${s.desc}</div>${btn}</div>`;
  }).join("");
}

function renderStats(base, eff) {
  const dps = (u) => Math.round((u.dmg / (u.atkCd / 1000)) * 10) / 10;
  const row = (label, b, e) => `<div class="bk-st"><span>${label}</span><span>${b}${b !== e ? ` → <b>${e}</b>` : ""}</span></div>`;
  const w = base.units.warrior, we = eff.units.warrior, a = base.units.archer, ae = eff.units.archer;
  return `<h4>Warrior</h4>${row("HP", w.hp, we.hp)}${row("Damage", w.dmg, we.dmg)}${row("DPS", dps(w), dps(we))}${row("Speed", w.speed, we.speed)}`
    + `<h4>Archer</h4>${row("HP", a.hp, ae.hp)}${row("Damage", a.dmg, ae.dmg)}${row("DPS", dps(a), dps(ae))}${row("Range", a.range, ae.range)}`
    + `<h4>Castle · Economy</h4>${row("Castle HP", base.castle.hp, eff.castle.hp)}${row("Start gold", base.economy.startGold, eff.economy.startGold)}${row("Passive/s", base.economy.passivePerSec, eff.economy.passivePerSec)}${row("Kill bounty", base.economy.killBounty, eff.economy.killBounty)}`;
}

function wire() {
  const sec = document.getElementById("barracks");
  const rerender = () => { save(profile()); render(); };
  sec.querySelector("[data-act=next]").onclick = nextRun;
  sec.querySelector("[data-act=menu]").onclick = () => { window.location.href = "index.html"; };
  sec.querySelector("[data-act=respec]").onclick = () => { respec(profile()); rerender(); };
  sec.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => { buyGear(profile(), b.dataset.buy, meta()); rerender(); });
  sec.querySelectorAll("[data-alloc]").forEach((b) => b.onclick = () => { allocateSkill(profile(), b.dataset.alloc, meta()); rerender(); });
  sec.querySelectorAll("[data-unalloc]").forEach((b) => b.onclick = () => { unallocateSkill(profile(), b.dataset.unalloc); rerender(); });
}
