// SONBIP.WORLD - shared 3D primitives. PBR materials (glass / metal / emissive) tuned for the HDRI + bloom pipeline.
import * as THREE from "three";

export const COLORS = {
  lime: 0xc2f542, mag: 0xff2e6c, amber: 0xffb020, cyan: 0x34d8ff, vio: 0x8b5cf6,
  gold: 0xffc94d, ground: 0x161622, ground2: 0x202035,
};

export function flatMat(color, { emissive = 0x000000, ei = 0, metalness = 0.05, roughness = 0.55, transparent = false, opacity = 1 } = {}) {
  return new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: ei, metalness, roughness,
    transparent, opacity,
  });
}

// floating island disc + glowing edge rings
export function ground(radius = 22, color = COLORS.ground) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.04, 1.1, 64),
    new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6 })
  );
  disc.position.y = -0.55; disc.receiveShadow = true; g.add(disc);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.985, 0.07, 12, 96),
    new THREE.MeshStandardMaterial({ color: COLORS.lime, emissive: COLORS.lime, emissiveIntensity: 2.2, roughness: 0.3 })
  );
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.62, 0.03, 8, 72),
    new THREE.MeshStandardMaterial({ color: 0x8aa0c8, emissive: 0x2a3a5a, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.5 })
  );
  ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.03; g.add(ring2);
  return g;
}

// glass gem (transmission + emissive -> luminous crystal, bloom picks up the glow)
export function crystal(color, { size = 0.8, ei = 0.55 } = {}) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 0),
    new THREE.MeshPhysicalMaterial({
      color, metalness: 0, roughness: 0.08,
      transmission: 0.85, thickness: 0.6, ior: 2.1,
      emissive: color, emissiveIntensity: ei,
      clearcoat: 1, clearcoatRoughness: 0.08,
      attenuationColor: color, attenuationDistance: 0.8,
    })
  );
  m.castShadow = true;
  return m;
}

// large luminous core crystal (home centerpiece)
export function coreCrystal(color = COLORS.lime, { size = 1.35 } = {}) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 0),
    new THREE.MeshPhysicalMaterial({
      color, metalness: 0, roughness: 0.04,
      transmission: 0.7, thickness: 1.4, ior: 2.3,
      emissive: color, emissiveIntensity: 0.9,
      clearcoat: 1, clearcoatRoughness: 0.05,
      attenuationColor: color, attenuationDistance: 1.0,
    })
  );
  m.castShadow = true;
  return m;
}

// gold coin (metal + clearcoat -> real metallic sheen from the HDRI)
export function coin(color = COLORS.gold, { r = 0.34, h = 0.12 } = {}) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, 26),
    new THREE.MeshPhysicalMaterial({
      color, metalness: 1, roughness: 0.24,
      emissive: 0x3a2400, emissiveIntensity: 0.5,
      clearcoat: 0.7, clearcoatRoughness: 0.25,
    })
  );
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  return m;
}

// goal pillar: glass tube + emissive lime fill + tick rings
export function pillar({ height = 8, fillPct = 0, color = COLORS.lime, radius = 0.7 } = {}) {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 40, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xaab4d6, metalness: 0.1, roughness: 0.08,
      transmission: 0.85, thickness: 0.4, ior: 1.4,
      transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      clearcoat: 1, clearcoatRoughness: 0.05,
    })
  );
  tube.position.y = height / 2; g.add(tube);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3c, metalness: 0.5, roughness: 0.4 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.4, 0.4, 40), baseMat);
  g.add(base);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, 0.3, 40), baseMat);
  cap.position.y = height + 0.1; g.add(cap);
  const fillH = Math.max(0.04, height * fillPct);
  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, fillH, 32),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.4, roughness: 0.3 })
  );
  fill.position.y = fillH / 2; g.add(fill);
  for (let p = 0.25; p < 1; p += 0.25) {
    const tick = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.02, 0.02, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0x5a5a76, metalness: 0.7, roughness: 0.4, transparent: true, opacity: 0.8 })
    );
    tick.rotation.x = Math.PI / 2; tick.position.y = height * p; g.add(tick);
  }
  g.userData = { fill, height };
  return g;
}

// floating canvas-text label as a sprite (billboard). depthTest off so it stays readable.
export function labelSprite(text, { color = "#c2f542", font = "bold 30px 'JetBrains Mono', monospace", w = 360 } = {}) {
  const cvs = document.createElement("canvas");
  cvs.width = w; cvs.height = Math.round(w * 0.3);
  const x = cvs.getContext("2d");
  x.font = font; x.textAlign = "center"; x.textBaseline = "middle";
  x.shadowColor = color; x.shadowBlur = 16;
  x.fillStyle = color;
  x.fillText(text, cvs.width / 2, cvs.height / 2);
  const tex = new THREE.CanvasTexture(cvs); tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(4.5, 1.35, 1);
  sp.renderOrder = 10;
  return sp;
}
