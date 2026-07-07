// SONBIP.WORLD - data + game math (ES module). Replaces assets/js/app.js.
// All progression is derived from REAL content (journey.json + finance.json).

export async function loadJSON(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error(`loadJSON ${path}:`, e);
    return null;
  }
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
export const formatCurrency = (n) => usd.format(n);

export function formatDate(ds, endDS) {
  const f = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });
  const s = f.format(new Date(ds));
  return endDS ? `${s} - ${f.format(new Date(endDS))}` : s;
}

const MILLION = 1_000_000;

// Derive a small progression model from real data.
// level = completed milestones; xp = real income (honest, small).
export function deriveGame(journey, finance) {
  const now = Date.now();
  const ms = (journey?.milestones ?? []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const completed = ms.filter((m) => new Date(m.date) <= now);
  const future = ms.filter((m) => new Date(m.date) > now);
  const balance = finance?.summary?.balance ?? 0;
  const income = finance?.summary?.totalIncome ?? 0;
  const expenses = finance?.summary?.totalExpenses ?? 0;
  const toolFees = finance?.summary?.totalToolFees ?? 0;
  const level = Math.max(1, completed.length);
  return {
    milestones: ms, completed, future,
    level, xp: Math.max(0, Math.round(income)),
    balance, income, expenses, toolFees,
    goal: MILLION,
    goalPct: Math.min(100, (balance / MILLION) * 100),
    finalBoss: future[future.length - 1] ?? ms[ms.length - 1],
  };
}

// Countdown to the "final boss" date (default: millionaire 2028-01-01).
export function countdownTo(target = "2028-01-01T00:00:00") {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, done: true };
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
    done: false,
  };
}

// Loot-rarity mapping for tags (returns css class + three.js hex).
const RARITY = [
  { re: "shopify",       cls: "r-rare",     hex: 0x34d8ff },
  { re: "vibe",          cls: "r-epic",     hex: 0x8b5cf6 },
  { re: "intermediate",  cls: "r-uncommon", hex: 0xc2f542 },
  { re: "personal",      cls: "r-uncommon", hex: 0xc2f542 },
  { re: "family",        cls: "r-amber",    hex: 0xffb020 },
  { re: "flex",          cls: "r-boss",     hex: 0xff2e6c },
  { re: "beginner",      cls: "r-common",   hex: 0x9aa0b4 },
  { re: "learning",      cls: "r-common",   hex: 0x9aa0b4 },
];
export function rarity(tag = "") {
  const t = tag.toLowerCase();
  return RARITY.find((r) => t.includes(r.re)) ?? { cls: "r-common", hex: 0x9aa0b4 };
}

export const isFuture = (ds) => new Date(ds).getTime() > Date.now();

// Pad a number for countdown display.
export const pad2 = (n) => String(n).padStart(2, "0");
