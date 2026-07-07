// SONBIP - Ghibli atmosphere (PixiJS v8, ESM, no build).
// Procedural soft clouds + glowing pollen; leaves on journey, fireflies on finance.
// Free + attribution-free textures generated on offscreen canvas, matched to the palette.
// Fixed canvas behind content. Reduced-motion: single static frame. Tab-hidden: paused.
import { Application, Container, Sprite, Texture } from "pixi.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = () => innerWidth < 768;
const rand = (a, b) => a + Math.random() * (b - a);

// soft radial glow texture (clouds, pollen, fireflies) and a leaf shape
function glow(inner, outer, size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = size / 2, ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(x, x, 0, x, x, x);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}
function leafTex(color) {
  const s = 48, c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.42);
  ctx.bezierCurveTo(s * 0.36, -s * 0.26, s * 0.36, s * 0.30, 0, s * 0.42);
  ctx.bezierCurveTo(-s * 0.36, s * 0.30, -s * 0.36, -s * 0.26, 0, -s * 0.42);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,40,20,.22)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(0, s * 0.4); ctx.stroke();
  return Texture.from(c);
}

export async function mountAtmosphere({ page = "home", canvas } = {}) {
  const app = new Application();
  await app.init({
    canvas, backgroundAlpha: 0, antialias: true,
    resolution: Math.min(2, devicePixelRatio || 1), autoDensity: true,
    resizeTo: window,
  });
  Object.assign(canvas.style, { position: "fixed", inset: "0", zIndex: "1", pointerEvents: "none" });

  const cloudLayer = new Container(), fx = new Container();
  app.stage.addChild(cloudLayer, fx);
  const W = () => app.screen.width, H = () => app.screen.height;

  const cloudT = glow("rgba(255,255,255,.95)", "rgba(255,255,255,0)", 128);
  const moteT = glow("rgba(255,232,170,.95)", "rgba(255,210,120,0)", 32);
  const fireT = glow("rgba(255,206,96,.95)", "rgba(255,170,40,0)", 32);
  const leaves = ["#e0a04a", "#c8553d", "#5c9156", "#d98a3a"].map(leafTex);

  // soft drifting clouds (replace the old CSS cloud divs)
  const clouds = [];
  for (let i = 0; i < (small() ? 2 : 4); i++) {
    const s = new Sprite(cloudT);
    s.anchor.set(0.5); s.scale.set(rand(2.4, 4.4)); s.alpha = rand(0.5, 0.8);
    s.x = rand(0, W()); s.y = rand(H() * 0.04, H() * 0.40);
    s.vx = rand(0.04, 0.12); s.phase = rand(0, 6.28);
    cloudLayer.addChild(s); clouds.push(s);
  }

  // page-specific particles
  const parts = [];
  const add = (tex, kind, n, cfg) => {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5); s.scale.set(cfg.sc());
      s.x = cfg.x(); s.y = cfg.y(); s.base = s.x; s.bx = s.x; s.by = s.y;
      s.vx = cfg.vx(); s.vy = cfg.vy(); s.rot = cfg.rot ? cfg.rot() : 0;
      s.phase = rand(0, 6.28); s.amp = cfg.amp(); s.kind = kind;
      fx.addChild(s); parts.push(s);
    }
  };
  const mote = (n) => add(moteT, "mote", n, {
    sc: () => rand(0.5, 1.4), x: () => rand(0, W()), y: () => rand(0, H()),
    vx: () => rand(-0.2, 0.2), vy: () => rand(-0.5, -0.18), amp: () => rand(8, 26),
  });
  if (page === "home") mote(small() ? 22 : 50);
  if (page === "journey") {
    mote(small() ? 14 : 40);
    const ln = small() ? 6 : 14;
    for (let i = 0; i < ln; i++) add(leaves[i % leaves.length], "leaf", 1, {
      sc: () => rand(0.4, 0.9), x: () => rand(0, W()), y: () => rand(-H() * 0.3, H()),
      vx: () => rand(-0.3, 0.3), vy: () => rand(0.5, 1.1), rot: () => rand(-0.03, 0.03), amp: () => rand(14, 34),
    });
  }
  if (page === "finance") {
    mote(small() ? 16 : 46);
    add(fireT, "fire", small() ? 8 : 18, {
      sc: () => rand(0.6, 1.3), x: () => rand(0, W()), y: () => rand(0, H()),
      vx: () => rand(-0.15, 0.15), vy: () => rand(-0.15, 0.15), amp: () => rand(10, 22),
    });
  }

  // pointer parallax (eased inside the ticker; no scroll listeners)
  let px = 0, py = 0, cx = 0, cy = 0;
  addEventListener("pointermove", (e) => {
    px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  const step = (dt) => {
    const f = dt / 16.6667;
    cx += (px - cx) * 0.04; cy += (py - cy) * 0.04;
    cloudLayer.x = -cx * 40; cloudLayer.y = -cy * 26;
    fx.x = -cx * 16; fx.y = -cy * 10;
    for (const s of clouds) {
      s.x += s.vx * f;
      if (s.x - s.width / 2 > W()) s.x = -s.width / 2;
      s.phase += 0.004 * f; s.y += Math.sin(s.phase) * 0.12 * f;
    }
    for (const s of parts) {
      s.phase += 0.02 * f;
      if (s.kind === "fire") {
        s.bx += s.vx * f; s.by += s.vy * f;
        if (s.bx < 0 || s.bx > W()) s.vx *= -1;
        if (s.by < 0 || s.by > H()) s.vy *= -1;
        s.x = s.bx + Math.sin(s.phase) * s.amp;
        s.y = s.by + Math.cos(s.phase * 0.8) * s.amp;
        s.alpha = 0.3 + (Math.sin(s.phase * 2) * 0.5 + 0.5) * 0.6;
      } else {
        s.base += s.vx * f;
        s.x = s.base + Math.sin(s.phase) * s.amp;
        s.y += s.vy * f; s.rotation += s.rot * f;
        if (s.kind === "mote") {
          if (s.y < -20) { s.y = H() + 20; s.base = rand(0, W()); }
          s.alpha = 0.45 + Math.sin(s.phase * 1.3) * 0.3;
        } else if (s.y > H() + 30) { s.y = -30; s.base = rand(0, W()); }
      }
    }
  };

  if (reduce) app.render();
  else {
    app.ticker.add((t) => step(t.deltaMS));
    document.addEventListener("visibilitychange", () => app.ticker[document.hidden ? "stop" : "start"]());
  }
  return app;
}
