// Meta-progression: persistent profile (localStorage) + XP/level math + run scoring +
// modifier application. Phaser-agnostic pure logic. Key "tinySwordsMeta"; resets on corrupt.

export const META_VERSION = 1;
const KEY = "tinySwordsMeta";

// Fallbacks if data/meta.json fails to load.
const FB = {
  progression: { levelCap: 10, xpBase: 100, xpGrowth: 1.35, bankRatio: 0.5,
    runScoring: { perWave: 25, goldDivisor: 20, castleHpWeight: 20 } },
  gear: [], skills: [],
};

export function defaultProfile() {
  return {
    version: META_VERSION,
    xp: 0,                       // cumulative XP (single source of truth; level derived)
    gold: 0,                     // banked gold carried between runs
    owned: [],                   // gear ids owned
    gear: { weapon: null, armor: null, standard: null }, // equipped id per slot (best)
    skills: { fortification: false, swiftMarch: false, ironWill: false, keenEdge: false, treasury: false, bountyHunter: false },
    stats: { totalRuns: 0, totalWins: 0, totalKills: 0, totalGoldEarned: 0, highestWave: 0 },
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    return validate(JSON.parse(raw));
  } catch (e) { console.warn("[meta] load failed, resetting:", e); return defaultProfile(); }
}

export function save(profile) {
  try { profile.version = META_VERSION; localStorage.setItem(KEY, JSON.stringify(profile)); }
  catch (e) { console.warn("[meta] save failed:", e); }
}

export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }

function migrate(d, from) {
  // Schema migrations toward META_VERSION. Add a step per future version bump, e.g.:
  // if (from < 2) { d.gear.banner = d.gear.standard; delete d.gear.standard; }
  return d;
}

function validate(d) {
  const def = defaultProfile();
  if (!d || typeof d !== "object") return def;
  if (typeof d.version === "number" && d.version < META_VERSION) d = migrate(d, d.version);
  const skills = def.skills;
  if (d.skills) for (const k in skills) if (k in d.skills) skills[k] = !!d.skills[k];
  return {
    version: META_VERSION,
    xp: Math.max(0, num(d.xp)),
    gold: Math.max(0, Math.floor(num(d.gold))),
    owned: Array.isArray(d.owned) ? d.owned.filter((x) => typeof x === "string") : [],
    gear: { weapon: so(d?.gear?.weapon), armor: so(d?.gear?.armor), standard: so(d?.gear?.standard) },
    skills,
    stats: {
      totalRuns: ci(d?.stats?.totalRuns), totalWins: ci(d?.stats?.totalWins),
      totalKills: ci(d?.stats?.totalKills),
      totalGoldEarned: Math.max(0, Math.floor(num(d?.stats?.totalGoldEarned))),
      highestWave: ci(d?.stats?.highestWave),
    },
  };
}

// --- XP / level (xp is cumulative) ---
export function xpForNext(level, meta) {
  const p = meta?.progression || FB.progression;
  return Math.round(p.xpBase * Math.pow(p.xpGrowth, level - 1));
}
export function levelFromXp(xp, meta) {
  const cap = meta?.progression?.levelCap ?? FB.progression.levelCap;
  let lvl = 1, pool = xp, need = xpForNext(1, meta);
  while (lvl < cap && pool >= need) { pool -= need; lvl++; need = xpForNext(lvl, meta); }
  return lvl;
}
export function xpProgress(xp, meta) {
  const cap = meta?.progression?.levelCap ?? FB.progression.levelCap;
  let lvl = 1, pool = xp, need = xpForNext(1, meta);
  while (lvl < cap && pool >= need) { pool -= need; lvl++; need = xpForNext(lvl, meta); }
  return { level: lvl, into: pool, need, atCap: lvl >= cap };
}
export function skillPoints(p, meta) {
  const cap = meta?.progression?.levelCap ?? FB.progression.levelCap;
  const lvl = Math.min(cap, levelFromXp(p.xp, meta));
  const allocated = Object.values(p.skills).filter(Boolean).length;
  return Math.max(0, lvl - 1 - allocated);
}

// --- run scoring + apply ---
export function scoreRun(r, meta) {
  const s = meta?.progression?.runScoring || FB.progression.runScoring;
  const bankRatio = meta?.progression?.bankRatio ?? FB.progression.bankRatio;
  return {
    xp: (r.wavesCleared || 0) * s.perWave + Math.floor((r.goldEarned || 0) / s.goldDivisor) + Math.floor((r.castleHpPct || 0) * s.castleHpWeight),
    bankedGold: Math.floor((r.goldEarned || 0) * bankRatio),
  };
}
export function applyRunResult(p, r, meta) {
  const before = levelFromXp(p.xp, meta);
  const { xp, bankedGold } = scoreRun(r, meta);
  p.xp += xp;
  p.gold += bankedGold;
  const after = levelFromXp(p.xp, meta);
  p.stats.totalRuns++;
  if (r.win) p.stats.totalWins++;
  p.stats.totalKills += r.kills || 0;
  p.stats.totalGoldEarned += r.goldEarned || 0;
  p.stats.highestWave = Math.max(p.stats.highestWave, r.wavesCleared || 0);
  return { xp, bankedGold, leveledUp: after > before, newLevel: after, pointsGained: after - before };
}

// --- modifiers -> cloned, modified battle.json ---
export function computeModifiers(p, meta) {
  const gear = meta?.gear || [];
  const byId = (id) => gear.find((g) => g.id === id);
  const weapon = byId(p.gear.weapon), armor = byId(p.gear.armor), standard = byId(p.gear.standard);
  const s = p.skills;
  return {
    castleHp: s.fortification ? 0.10 : 0,
    unitSpeed: s.swiftMarch ? 0.10 : 0,
    unitHp: (s.ironWill ? 0.10 : 0) + (armor?.hpMod || 0),
    unitDmg: (s.keenEdge ? 0.10 : 0) + (weapon?.dmgMod || 0),
    startGold: standard?.goldMod || 0,
    passiveGold: s.treasury ? 0.10 : 0,
    killBounty: s.bountyHunter ? 0.15 : 0,
  };
}

export function applyMeta(baseCfg, p, meta) {
  const m = computeModifiers(p, meta);
  const cfg = clone(baseCfg);
  const r = Math.round;
  cfg.castle.hp = r(cfg.castle.hp * (1 + m.castleHp));
  cfg.economy.startGold = r(cfg.economy.startGold * (1 + m.startGold));
  cfg.economy.passivePerSec = +(cfg.economy.passivePerSec * (1 + m.passiveGold)).toFixed(1);
  cfg.economy.killBounty = r(cfg.economy.killBounty * (1 + m.killBounty));
  for (const k of Object.keys(cfg.units)) {
    cfg.units[k].hp = r(cfg.units[k].hp * (1 + m.unitHp));
    cfg.units[k].dmg = r(cfg.units[k].dmg * (1 + m.unitDmg));
    cfg.units[k].speed = r(cfg.units[k].speed * (1 + m.unitSpeed));
  }
  return cfg;
}

// --- gear + skill ops (mutate profile; caller saves) ---
export function buyGear(p, id, meta) {
  const g = (meta?.gear || []).find((x) => x.id === id);
  if (!g) return { ok: false, reason: "no-item" };
  if (p.owned.includes(id)) return { ok: false, reason: "owned" };
  if (p.gold < g.cost) return { ok: false, reason: "no-gold" };
  p.gold -= g.cost;
  p.owned.push(id);
  equipBest(p, meta);
  return { ok: true };
}

export function equipBest(p, meta) {
  const gear = meta?.gear || [];
  const best = (slot, key) => {
    const opts = gear.filter((g) => p.owned.includes(g.id) && g.slot === slot);
    return opts.length ? opts.reduce((a, b) => (b[key] > a[key] ? b : a)).id : null;
  };
  p.gear.weapon = best("weapon", "dmgMod");
  p.gear.armor = best("armor", "hpMod");
  p.gear.standard = best("standard", "goldMod");
}

// Meta-aware sanitization on load: sync skills to meta, drop invalid/duplicate owned gear, re-equip best.
// Guards against corrupt saves and forward-compat (skill/gear added or removed in meta.json).
export function reconcile(p, meta) {
  if (!meta) return p;
  const skillIds = new Set(meta.skills.map((s) => s.id));
  const skills = {};
  for (const id of skillIds) skills[id] = !!p.skills[id];
  p.skills = skills;
  const valid = new Set(meta.gear.map((g) => g.id));
  p.owned = [...new Set(p.owned.filter((id) => valid.has(id)))];
  equipBest(p, meta);
  return p;
}

export function allocateSkill(p, id, meta) {
  if (!(id in p.skills)) return { ok: false, reason: "no-skill" };
  if (p.skills[id]) return { ok: false, reason: "already" };
  if (skillPoints(p, meta) < 1) return { ok: false, reason: "no-points" };
  p.skills[id] = true;
  return { ok: true };
}

export function unallocateSkill(p, id) {
  if (!(id in p.skills)) return { ok: false, reason: "no-skill" };
  p.skills[id] = false;
  return { ok: true };
}

export function respec(p) { for (const k in p.skills) p.skills[k] = false; }

export function effectiveStats(baseCfg, p, meta) {
  const c = applyMeta(baseCfg, p, meta);
  return { units: c.units, castle: { hp: c.castle.hp }, economy: c.economy };
}

// --- helpers ---
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const ci = (v) => Math.max(0, Math.floor(num(v)));
const so = (v) => (typeof v === "string" && v ? v : null);
