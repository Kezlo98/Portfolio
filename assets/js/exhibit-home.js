// SONBIP.WORLD - Home exhibit: Superman-styled hero (CC0 RobotExpressive) + glass skill gems.
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ground, crystal, labelSprite, COLORS } from "./exhibit-lib.js";

export function buildHome(world, { stats }) {
  const { THREE: T, scene } = world;
  scene.add(ground(20));

  // pedestal (metallic - catches HDRI reflections)
  const ped = new T.Mesh(
    new T.CylinderGeometry(2.0, 2.5, 0.9, 8),
    new T.MeshStandardMaterial({ color: COLORS.ground2, metalness: 0.6, roughness: 0.35, flatShading: true })
  );
  ped.position.y = 0.45; ped.castShadow = true; ped.receiveShadow = true; scene.add(ped);

  // hero turntable (robot + cape + emblem spin together)
  const hero = new T.Group();
  hero.position.set(0, 0.9, 0);
  scene.add(hero);

  new GLTFLoader().load("assets/models/RobotExpressive.glb", (gltf) => {
    const rob = gltf.scene;
    // recolor superman-style: blue suit, keep emissive (eye/visor) glowing red
    rob.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      const hasEm = m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05;
      o.material = new T.MeshStandardMaterial({
        color: hasEm ? 0x101018 : 0x1d4ed8,
        emissive: hasEm ? 0xff3b3b : 0x000000,
        emissiveIntensity: hasEm ? 1.5 : 0,
        metalness: 0.25, roughness: 0.5,
      });
      o.castShadow = true;
    });
    const box = new T.Box3().setFromObject(rob);
    const size = new T.Vector3(); box.getSize(size);
    rob.scale.setScalar(2.6 / (size.y || 1));
    const lb = new T.Box3().setFromObject(rob); // recompute after scale
    rob.position.y = -lb.min.y; // feet rest on hero origin (= pedestal top, world 0.9)
    hero.add(rob);

    // red cape (draped plane) behind the shoulders, shoulders-to-calves
    const capeGeo = new T.PlaneGeometry(1.5, 1.9, 1, 6);
    const p = capeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -0.15 - Math.max(0, -y) * 0.5); }
    capeGeo.computeVertexNormals();
    const cape = new T.Mesh(capeGeo, new T.MeshStandardMaterial({
      color: 0xd62828, emissive: 0x3a0808, emissiveIntensity: 0.45, roughness: 0.6, metalness: 0.1, side: T.DoubleSide,
    }));
    cape.position.set(0, 1.15, -0.32);
    hero.add(cape);

    // chest emblem: yellow diamond, red border, "SB" monogram (hero crest without the trademarked S)
    const emblem = new T.Mesh(
      new T.PlaneGeometry(0.72, 0.72),
      new T.MeshStandardMaterial({ map: emblemTex(T), transparent: true, emissive: 0x554400, emissiveIntensity: 0.6, roughness: 0.5 })
    );
    emblem.position.set(0, 1.6, 0.42);
    hero.add(emblem);

    // idle animation (breathing hero)
    if (gltf.animations && gltf.animations.length) {
      const mixer = new T.AnimationMixer(rob);
      const clip = gltf.animations.find((a) => /idle|wave/i.test(a.name)) || gltf.animations[0];
      mixer.clipAction(clip).play();
      world.addUpdatable((dt) => { if (!world.reduce) mixer.update(dt); });
    }
  }, undefined, (e) => console.warn("hero model load failed", e));

  // slow turntable so the cape revolves
  world.addUpdatable((dt) => { if (!world.reduce) hero.rotation.y += 0.25 * dt; });

  // name + role labels above the hero
  const name = labelSprite("SON BIP", { color: "#facc15", font: "bold 46px 'Chakra Petch', sans-serif", w: 460 });
  name.position.set(0, 4.4, 0); name.scale.set(5.8, 1.7, 1); scene.add(name);
  const role = labelSprite("INDIE DEV // SHOPIFY APP CRAFTER", { color: "#9fb0d8", font: "bold 20px 'JetBrains Mono', monospace", w: 620 });
  role.position.set(0, 3.7, 0); role.scale.set(5.2, 1.5, 1); scene.add(role);

  // glass skill gems orbiting the hero
  const gems = [];
  stats.forEach((s, i) => {
    const a = (i / stats.length) * Math.PI * 2 + Math.PI / 4;
    const rad = 4.8;
    const gem = crystal(s.hex, { size: 0.58, ei: 0.55 });
    gem.position.set(Math.cos(a) * rad, 1.8 + (i % 2) * 0.7, Math.sin(a) * rad);
    gem.userData.spin = 0.3 + i * 0.05;
    world.float(gem, 0.26, 0.8 + i * 0.12, i);
    const hex = "#" + s.hex.toString(16).padStart(6, "0");
    world.add(gem, {
      onOver: (m) => { m.material.emissiveIntensity = 1.4; m.scale.setScalar(1.18); },
      onOut: (m) => { m.material.emissiveIntensity = 0.55; m.scale.setScalar(1); },
      onClick: (m) => { world.burst(m.position, { color: s.hex, count: 20 }); s.onSelect && s.onSelect(s); },
    });
    const lbl = labelSprite(s.label, { color: hex, font: "bold 20px 'JetBrains Mono', monospace" });
    lbl.position.copy(gem.position); lbl.position.y += 1.0; lbl.scale.set(2.6, 0.78, 1); scene.add(lbl);
    gems.push(gem);
  });

  world.focus([0, 2.6, 12], [0, 2.0, 0]);
  return { hero, gems };
}

// hero emblem canvas texture: yellow diamond + red border + SB monogram (no trademarked S)
function emblemTex(T) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.translate(64, 64);
  x.rotate(Math.PI / 4);
  x.fillStyle = "#facc15"; x.strokeStyle = "#d62828"; x.lineWidth = 10;
  x.fillRect(-42, -42, 84, 84); x.strokeRect(-42, -42, 84, 84);
  x.rotate(-Math.PI / 4);
  x.fillStyle = "#b91c1c"; x.font = "bold 42px 'Chakra Petch', sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText("SB", 0, 4);
  return new T.CanvasTexture(c);
}
