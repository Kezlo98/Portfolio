// SONBIP.WORLD - Journey exhibit: ascending 3D level path of milestone quest nodes.
import { ground, crystal, labelSprite, flatMat, COLORS } from "./exhibit-lib.js";

export function buildJourney(world, { milestones, onSelect }) {
  const { THREE: T, scene } = world;
  scene.add(ground(20, COLORS.ground));

  // map milestones to ascending 3D points (final boss = highest, locked)
  const pts = milestones.map((m, i) => {
    const t = milestones.length === 1 ? 0.5 : i / (milestones.length - 1);
    return {
      m, i, future: !!m.future,
      x: (t - 0.5) * 13 + Math.sin(i * 1.3) * 2.4,
      z: Math.cos(i * 1.1) * 3.6,
      y: 1.4 + i * 1.25,
    };
  });

  // glowing path ribbon through the nodes
  const curve = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(p.x, p.y - 0.95, p.z)));
  const tube = new T.Mesh(
    new T.TubeGeometry(curve, 80, 0.07, 8, false),
    flatMat(COLORS.lime, { emissive: COLORS.lime, ei: 0.5, transparent: true, opacity: 0.65 })
  );
  scene.add(tube);

  // quest nodes
  const nodes = [];
  pts.forEach((p) => {
    const color = p.future ? COLORS.mag : COLORS.lime;
    const node = crystal(color, { size: 0.62, ei: p.future ? 0.85 : 0.5 });
    node.position.set(p.x, p.y, p.z);
    node.userData.spin = 0.35 + p.i * 0.05;
    world.float(node, 0.2, 0.7, p.i * 0.7);

    // small pad under each node
    const pad = new T.Mesh(new T.CylinderGeometry(0.7, 0.85, 0.3, 6), flatMat(COLORS.ground2));
    pad.position.set(p.x, p.y - 1.05, p.z); pad.castShadow = true; scene.add(pad);

    world.add(node, {
      onOver: (m) => { m.material.emissiveIntensity = 1.4; m.scale.setScalar(1.18); },
      onOut: (m) => { m.material.emissiveIntensity = p.future ? 0.85 : 0.5; m.scale.setScalar(1); },
      onClick: (m) => {
        world.burst(m.position, { color, count: 20 });
        world.focus([p.x, p.y + 2, p.z + 5.5], [p.x, p.y, p.z]);
        onSelect && onSelect(p);
      },
    });

    const lbl = labelSprite(`LV.${p.i + 1}`, { color: p.future ? "#ff2e6c" : "#c2f542", font: "bold 20px 'Press Start 2P', monospace", w: 220 });
    lbl.position.set(p.x, p.y + 1.1, p.z); lbl.scale.set(1.7, 0.6, 1); scene.add(lbl);

    nodes.push({ node, ...p });
  });

  // frame the whole path
  world.focus([0, 7, 19], [0, 4, 0]);
  return { nodes };
}
