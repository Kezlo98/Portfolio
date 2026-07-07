// SONBIP.WORLD - Finance exhibit: coin pile (real balance) + $1M goal pillar.
import { ground, coin, pillar, labelSprite, flatMat, COLORS } from "./exhibit-lib.js";

export function buildFinance(world, { balance, goalPct }) {
  const { THREE: T, scene } = world;
  scene.add(ground(20, COLORS.ground));

  // goal pillar ($1,000,000) on the right
  const fillFrac = Math.max(0.004, goalPct / 100);
  const pg = pillar({ height: 9, fillPct: fillFrac, color: COLORS.lime, radius: 0.8 });
  pg.position.set(5.5, 0, -1); scene.add(pg);

  const goalLbl = labelSprite("$1,000,000", { color: "#c2f542", font: "bold 30px 'JetBrains Mono', monospace", w: 420 });
  goalLbl.position.set(5.5, 10.2, -1); goalLbl.scale.set(4.2, 1.25, 1); scene.add(goalLbl);
  const pctLbl = labelSprite(`${goalPct.toFixed(4)}% TO BOSS`, { color: "#9a9ab0", font: "bold 18px 'JetBrains Mono', monospace", w: 420 });
  pctLbl.position.set(5.5, 9.3, -1); pctLbl.scale.set(3.4, 1.0, 1); scene.add(pctLbl);

  // coin pile on the left: 1 coin per $1 of real balance (honest, capped)
  const n = Math.max(6, Math.min(60, Math.floor(balance || 6)));
  const coins = [];
  for (let i = 0; i < n; i++) {
    const c = coin(COLORS.amber, { r: 0.3 + Math.random() * 0.05, h: 0.12 });
    const layer = Math.floor(i / 6);
    const inLayer = i % 6;
    const ang = (inLayer / 6) * Math.PI * 2 + layer * 0.5;
    const rad = 1.0 + (layer % 2) * 0.45;
    c.position.set(-4.5 + Math.cos(ang) * rad, 0.25 + layer * 0.27, Math.sin(ang) * rad);
    c.rotation.z = Math.random() * Math.PI;
    c.castShadow = true;
    world.add(c, {
      onOver: (m) => { m.material.emissiveIntensity = 0.95; },
      onOut: (m) => { m.material.emissiveIntensity = 0.35; },
      onClick: (m) => { world.burst(m.position, { color: COLORS.amber, count: 12, speed: 3 }); },
    });
    coins.push(c);
  }
  const balLbl = labelSprite(`$${balance.toFixed(2)} GOLD`, { color: "#ffb020", font: "bold 28px 'JetBrains Mono', monospace", w: 360 });
  balLbl.position.set(-4.5, 2.6, 0); balLbl.scale.set(3.4, 1.0, 1); scene.add(balLbl);

  // link line from coin pile to pillar (the climb)
  const line = new T.Mesh(
    new T.TubeGeometry(
      new T.CatmullRomCurve3([new T.Vector3(-4.5, 1.2, 0), new T.Vector3(0, 3.5, -0.5), new T.Vector3(5.5, 6, -1)]),
      40, 0.04, 8, false
    ),
    flatMat(0x6a6a90, { emissive: COLORS.lime, ei: 0.25, transparent: true, opacity: 0.4 })
  );
  scene.add(line);

  world.focus([0, 4.5, 15], [0, 3.5, 0]);
  world.setAutoRotate(true);
  return { pillar: pg, coins };
}
