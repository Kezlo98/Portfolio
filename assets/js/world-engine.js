// SONBIP.WORLD - Three.js engine core (no build, ESM via importmap).
// PBR: HDRI environment reflections. Post: bloom. Reduced-motion safe.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function createWorld(canvas, {
  hdri = "assets/hdri/royal_esplanade_1k.hdr",
  fog = 0x070710, fogNear = 18, fogFar = 75,
  cameraPos = [0, 6, 16], target = [0, 1, 0],
  bloomStrength = 0.65, bloomRadius = 0.5, bloomThreshold = 0.82,
} = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  // updateStyle=true is REQUIRED so the canvas CSS size = viewport (not the drawing-buffer / attribute size).
  renderer.setSize(innerWidth, innerHeight, true);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(fog, fogNear, fogFar);
  scene.add(makeStars());

  // HDRI environment for PBR reflections + image-based lighting (async, non-blocking).
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    new RGBELoader().load(hdri, (tex) => {
      scene.environment = pmrem.fromEquirectangular(tex).texture;
      tex.dispose(); pmrem.dispose();
    });
  } catch (e) { console.warn("HDRI env unavailable, continuing without PBR reflections", e); }

  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 220);
  camera.position.set(...cameraPos);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduce;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 32;
  controls.maxPolarAngle = Math.PI * 0.52; // stay above ground
  controls.target.set(...target);

  // lights (kept modest - the HDRI carries most of the lighting now)
  scene.add(new THREE.HemisphereLight(0xbfc8ff, 0x0a0a12, 0.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const c = sun.shadow.camera;
  c.near = 1; c.far = 60; c.left = -26; c.right = 26; c.top = 26; c.bottom = -26;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc2f542, 0.6);
  rim.position.set(-8, 4, -8);
  scene.add(rim);

  // postprocessing: bloom gives emissive accents (lime crystals, pillar fill) a premium glow
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), bloomStrength, bloomRadius, bloomThreshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // interaction registry + raycaster
  const interactives = [];
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;
  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
  }
  function topHit(e) {
    setPointer(e);
    const hits = ray.intersectObjects(interactives.map((i) => i.mesh), false);
    return hits[0]?.object ?? null;
  }
  canvas.addEventListener("pointermove", (e) => {
    const m = topHit(e);
    if (m !== hovered) {
      hovered?.userData.__i?.onOut?.(hovered);
      hovered = m;
      hovered?.userData.__i?.onOver?.(hovered);
      canvas.style.cursor = hovered ? "pointer" : "grab";
    }
  });
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return; // a drag, not a click
    const m = topHit(e);
    interactives.find((i) => i.mesh === m)?.onClick?.(m);
  });

  // eased camera focus (juice)
  let focusGoal = null;
  function focus(pos, look = [0, 1, 0]) {
    focusGoal = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) };
  }
  function tickFocus(dt) {
    if (!focusGoal) return;
    const k = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(focusGoal.pos, k);
    controls.target.lerp(focusGoal.look, k);
  }

  // particle burst (coin pop) - simple, pooled, cleaned up
  const particles = [];
  const burstGeo = new THREE.SphereGeometry(0.16, 6, 6);
  function burst(pos, { count = 14, color = 0xc2f542, speed = 4 } = {}) {
    if (reduce) return;
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.4 });
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(burstGeo, mat);
      p.position.copy(pos);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.25, Math.random() - 0.5).normalize();
      p.userData = { v: dir.multiplyScalar(speed * (0.5 + Math.random())), life: 1, spin: (Math.random() - 0.5) * 8 };
      scene.add(p);
      particles.push(p);
    }
  }

  // render loop
  let autoRotate = false;
  let last = performance.now();
  let raf = 0;
  let running = true;
  const updatables = [];
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduce) scene.traverse((o) => {
      const f = o.userData.float;
      if (f) o.position.y = o.userData.baseY + Math.sin(now * 0.001 * f.speed + (f.phase || 0)) * f.amp;
      if (o.userData.spin) o.rotation.y += o.userData.spin * dt;
    });
    controls.autoRotate = !reduce && autoRotate;
    controls.autoRotateSpeed = 0.35;
    tickFocus(dt);
    for (const u of updatables) u(dt, now);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.userData.v.y -= 9.8 * dt;
      p.position.addScaledVector(p.userData.v, dt);
      p.rotation.y += p.userData.spin * dt;
      p.userData.life -= dt * 0.9;
      p.scale.setScalar(Math.max(0, p.userData.life));
      if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }
    controls.update();
    composer.render();
  }
  function start() { if (running) return; running = true; last = performance.now(); frame(last); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  frame(last);

  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, true);
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth, innerHeight);
  });

  return {
    THREE, scene, camera, renderer, composer, controls, reduce,
    add(mesh, { onOver, onOut, onClick, label } = {}) {
      if (onOver || onOut || onClick) {
        mesh.userData.__i = { onOver, onOut, onClick, label };
        interactives.push({ mesh, onOver, onOut, onClick });
      }
      scene.add(mesh);
      return mesh;
    },
    float(mesh, amp = 0.25, speed = 1, phase = 0) {
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.float = { amp, speed, phase };
      return mesh;
    },
    focus, burst,
    addUpdatable(fn) { updatables.push(fn); return fn; },
    setAutoRotate(v) { autoRotate = v; },
    dispose() { stop(); controls.dispose(); composer.dispose(); renderer.dispose(); },
  };
}

function makeStars() {
  const n = 380;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 60 + Math.random() * 40;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.7 + 4;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xdde6ff, size: 0.34, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false });
  return new THREE.Points(g, m);
}
