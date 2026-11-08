// Pip & Pebble 3D kit: shared world, characters, props, post-processing and camera helpers.
// Used by every 3D episode so characters stay identical across the series.
import * as THREE from "three";
import { EffectComposer } from "./jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./jsm/postprocessing/RenderPass.js";
import { BokehPass } from "./jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "./jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./jsm/postprocessing/OutputPass.js";

export { THREE };
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerp = (a, b, k) => a + (b - a) * k;
export const cl = (x) => Math.max(0, Math.min(1, x));
export const ease = (k) => k * k * (3 - 2 * k);
export const easeIn = (k) => k * k;

export function build({ canvas, night = false, W = 1440, H = 810 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = night ? 1.25 : 1.15;

  const scene = new THREE.Scene();
  const skyC = document.createElement("canvas"); skyC.width = 4; skyC.height = 256;
  { const g = skyC.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
    const stops = night ? ["#070a24", "#1b1f52", "#3a3478", "#5a4a8a"] : ["#3a2f7a", "#ff7b54", "#ffcf7a", "#ffe9b0"];
    [0, 0.45, 0.75, 1].forEach((p, i) => gr.addColorStop(p, stops[i])); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }
  const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  scene.fog = new THREE.Fog(night ? 0x241f55 : 0xffb98a, 10, 34);
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 120);

  scene.add(new THREE.HemisphereLight(night ? 0x6c74c9 : 0xffd9a8, night ? 0x1a2b3a : 0x3f7d3a, night ? 0.55 : 1.1));
  const sun = new THREE.DirectionalLight(night ? 0x9fb6ff : 0xffb070, night ? 1.3 : 3.2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); sun.shadow.radius = 5; sun.shadow.bias = -0.0005;
  scene.add(sun); scene.add(sun.target);
  const rim = new THREE.DirectionalLight(night ? 0x6f7bff : 0x9fb8ff, night ? 1.2 : 1.5); rim.position.set(14, 4, -8); scene.add(rim);

  const M = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.25, ...o });
  const SPH = new THREE.SphereGeometry(1, 48, 32);
  const mesh = (geo, mat, parent, pos = [0, 0, 0], scl = [1, 1, 1]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scl); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const white = M(0xffffff, { roughness: 0.15, clearcoat: 1 }), black = M(0x15142a, { roughness: 0.1, clearcoat: 1 });
  const gm = M(0x111111, { roughness: 0.05, clearcoat: 1 });

  // ---------- world ----------
  const ground = mesh(new THREE.CircleGeometry(70, 64), M(0x6fae45, { clearcoat: 0, roughness: 0.9 }), scene, [10, 0, 0]); ground.rotation.x = -Math.PI / 2;
  const path = mesh(new THREE.PlaneGeometry(90, 2.8), M(0xd2a86e, { clearcoat: 0, roughness: 1 }), scene, [10, 0.01, 0.3]); path.rotation.x = -Math.PI / 2;
  const trees = [];
  for (let i = 0; i < 16; i++) {
    const tr = new THREE.Group(); scene.add(tr); tr.position.set(-8 + i * 2.6, 0, -6.5 - (i % 3) * 1.6); trees.push(tr);
    mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 12), M(0x6b4a33, { clearcoat: 0 }), tr, [0, 0.8, 0]);
    mesh(SPH, M(i % 2 ? 0x2f6d3a : 0x3c7d3f, { clearcoat: 0, roughness: 0.8 }), tr, [0, 2.2, 0], [1.2, 1.4 + (i % 3) * 0.2, 1.2]);
  }
  const fc = [0xff8fb1, 0xffd166, 0xff6b6b, 0xb28dff];
  for (let i = 0; i < 22; i++) {
    const f = new THREE.Group(); scene.add(f); f.position.set(-4 + i * 1.35, 0, (i % 2 ? -2.6 : -1.8) + (i % 3) * 0.35);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), M(0x3fa34d), f, [0, 0.4, 0]);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; mesh(SPH, M(fc[i % 4]), f, [Math.cos(a) * 0.16, 0.85, Math.sin(a) * 0.16], [0.12, 0.06, 0.12]); }
    mesh(SPH, M(0xffe066), f, [0, 0.87, 0], [0.08, 0.06, 0.08]);
  }

  // ---------- Pip ----------
  const pip = new THREE.Group(); scene.add(pip);
  const green = M(0x5fcf6a), bellyM = M(0xc9f2a8);
  const pipBody = new THREE.Group(); pip.add(pipBody);
  mesh(SPH, green, pipBody, [0, 0.62, 0], [0.78, 0.62, 0.68]);
  mesh(SPH, bellyM, pipBody, [0, 0.5, 0.38], [0.52, 0.38, 0.34]);
  const lids = [], pipEyes = [];
  [-0.36, 0.36].forEach((x) => {
    const e = new THREE.Group(); pipBody.add(e); e.position.set(x, 1.12, 0.12);
    mesh(SPH, green, e, [0, 0, 0], [0.3, 0.3, 0.3]);
    const ball = new THREE.Group(); e.add(ball); pipEyes.push(ball);
    mesh(SPH, white, ball, [0, 0.02, 0.12], [0.24, 0.24, 0.22]);
    mesh(SPH, black, ball, [0, 0.02, 0.29], [0.12, 0.12, 0.08]);
    mesh(SPH, M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }), ball, [0.05, 0.08, 0.36], [0.035, 0.035, 0.02]);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.02, 0.12); e.add(lidPivot);
    mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), green, lidPivot, [0, 0, 0], [0.262, 0.262, 0.245]);
    lids.push(lidPivot);
  });
  [-0.5, 0.5].forEach((x) => mesh(SPH, M(0xff8fb1, { clearcoat: 0 }), pipBody, [x, 0.72, 0.5], [0.12, 0.07, 0.05]));
  const smile = mesh(new THREE.TorusGeometry(0.2, 0.035, 12, 40, Math.PI), black, pipBody, [0, 0.9, 0.66]); smile.rotation.z = Math.PI; smile.rotation.x = -0.35;
  const mouthO = mesh(SPH, black, pipBody, [0, 0.84, 0.64], [0.1, 0.12, 0.05]); mouthO.visible = false; // shocked "O" mouth
  [-0.45, 0.45].forEach((x) => mesh(SPH, green, pipBody, [x, 0.12, 0.35], [0.22, 0.12, 0.3]));

  // ---------- Pebble ----------
  const yellow = M(0xffd166), coral = M(0xff7b6b, { roughness: 0.25, clearcoat: 1 }), dark = M(0xc94f63);
  function makeShell(parent) {
    const sh = new THREE.Group(); parent.add(sh);
    mesh(SPH, coral, sh, [0, 0, 0], [0.55, 0.55, 0.42]);
    const pts = []; for (let i = 0; i <= 120; i++) { const a = i * 0.16, r = 0.46 - i * 0.0036; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.42 * Math.sqrt(Math.max(0, 1 - (r / 0.55) ** 2)) + 0.012)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.035, 8), dark, sh);
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((v) => new THREE.Vector3(v.x, v.y, -v.z))), 240, 0.035, 8), dark, sh);
    return sh;
  }
  const peb = new THREE.Group(); scene.add(peb);
  const pebBody = new THREE.Group(); peb.add(pebBody);
  mesh(new THREE.CapsuleGeometry(0.22, 1.1, 12, 24), yellow, pebBody, [0, 0.2, 0], [1, 0.8, 1.1]).rotation.z = Math.PI / 2;
  mesh(new THREE.CapsuleGeometry(0.2, 0.45, 12, 24), yellow, pebBody, [0.62, 0.5, 0]).rotation.z = -0.35;
  const pSmile = mesh(new THREE.TorusGeometry(0.09, 0.022, 10, 30, Math.PI), black, pebBody, [0.86, 0.62, 0]); pSmile.rotation.set(0, Math.PI / 2, Math.PI);
  const shell = makeShell(pebBody); shell.position.set(-0.15, 0.68, 0);
  const stalks = new THREE.Group(); pebBody.add(stalks); stalks.position.set(0.72, 0.78, 0);
  const eyeballs = [];
  [[-0.12, 0.1], [0.12, -0.1]].forEach(([z, tilt]) => {
    const s = new THREE.Group(); stalks.add(s); s.position.z = z; s.rotation.z = -0.25; s.rotation.x = tilt;
    mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 10), yellow, s, [0, 0.27, 0]);
    const eb = new THREE.Group(); eb.position.set(0, 0.58, 0); s.add(eb); eyeballs.push(eb);
    mesh(SPH, white, eb, [0, 0, 0], [0.13, 0.13, 0.13]); mesh(SPH, black, eb, [0.09, 0.01, 0], [0.06, 0.07, 0.07]);
  });
  const glasses = new THREE.Group(); stalks.add(glasses);
  [-0.15, 0.15].forEach((z) => mesh(new THREE.BoxGeometry(0.05, 0.17, 0.26), gm, glasses, [0.3, 0.57, z]));
  mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), gm, glasses, [0.3, 0.6, 0]);
  const glint = mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xffffff }), glasses, [0.34, 0.66, 0.2], [0.001, 0.001, 0.001]);

  const ball = new THREE.Group(); scene.add(ball); const ballShell = makeShell(ball);
  const fireM = [0xff5a1f, 0xffb347].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }));
  const fire = []; for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(SPH, fireM[i % 2]); scene.add(f); fire.push(f); }

  // ---------- mushroom house, table, lettuce ----------
  const house = new THREE.Group(); scene.add(house); house.position.set(22, 0, -1.6);
  mesh(new THREE.CylinderGeometry(1.1, 1.3, 2.0, 40), M(0xf3e2c8, { clearcoat: 0.2 }), house, [0, 1.0, 0]);
  const cap = mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M(0xe63946, { roughness: 0.25, clearcoat: 1 }), house, [0, 1.9, 0], [2.0, 1.4, 2.0]);
  [[0.8, 2.9, 1.1], [-0.9, 2.6, 1.2], [0.1, 3.2, 0.4], [1.5, 2.2, 0.6], [-1.4, 2.3, -0.2]].forEach((p) => mesh(SPH, M(0xffffff), house, p, [0.22, 0.12, 0.22]));
  const doorway = mesh(new THREE.PlaneGeometry(0.7, 1.15), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), house, [0, 0.62, 1.17]);
  const lettuce = new THREE.Group(); house.add(lettuce); lettuce.position.set(0, 0.05, 1.0);
  [[0, 0.18, 0], [-0.2, 0.14, 0.05], [0.2, 0.15, 0.02], [0, 0.36, 0.02]].forEach((p, i) => mesh(SPH, M([0x7ed957, 0x5fcf6a, 0x9be36f, 0x7ed957][i], { clearcoat: 0.4 }), lettuce, p, [0.2, 0.17, 0.18]));
  const doorHinge = new THREE.Group(); house.add(doorHinge); doorHinge.position.set(-0.36, 0, 1.2);
  mesh(new THREE.BoxGeometry(0.72, 1.18, 0.06), M(0x3fa3a8), doorHinge, [0.36, 0.6, 0]);
  mesh(SPH, M(0xffd166, { metalness: 0.6 }), doorHinge, [0.62, 0.6, 0.05], [0.04, 0.04, 0.04]);
  const doorLight = new THREE.PointLight(0xffd27a, 0, 6, 1.6); doorLight.position.set(0, 0.8, 1.6); house.add(doorLight);
  const table = new THREE.Group(); scene.add(table); table.position.set(21.2, 0, 1.5);
  mesh(new THREE.BoxGeometry(1.6, 0.08, 0.9), M(0x8a5a35, { clearcoat: 0.2 }), table, [0, 0.62, 0]);
  [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(([x, z]) => mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), M(0x7a4a2a), table, [x, 0.3, z]));
  mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.05, 40), white, table, [0, 0.69, 0]);
  const plateFood = new THREE.Group(); table.add(plateFood);
  [[0, 0.8, 0], [-0.13, 0.76, 0.05], [0.13, 0.77, -0.04], [0.02, 0.92, 0.0]].forEach((p, i) => mesh(SPH, M([0x7ed957, 0x5fcf6a, 0x9be36f, 0x7ed957][i], { clearcoat: 0.4 }), plateFood, p, [0.15, 0.12, 0.14]));

  // ---------- phone texture helper ----------
  const screenMat = (lines, bg = "#0f0f1c", tint = 0x9a9a9a) => {
    const c = document.createElement("canvas"); c.width = 300; c.height = 580; const g = c.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, 300, 580);
    if (lines) { g.fillStyle = "#fff"; g.beginPath(); g.roundRect(14, 60, 272, 130, 22); g.fill();
      g.fillStyle = "#2b2a6e"; g.font = "bold 28px sans-serif"; g.fillText(lines[0], 30, 112); g.fillStyle = "#555"; g.font = "20px sans-serif"; g.fillText(lines[1] || "", 30, 152); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, color: tint });
  };

  // ---------- dust ----------
  const dustM = new THREE.MeshStandardMaterial({ color: 0xead7b0, transparent: true, opacity: 0.7, roughness: 1 });
  const dust = []; for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(SPH, dustM.clone()); scene.add(d); dust.push(d); }
  function puffs(ox, oy, oz, t0, t, color) {
    dust.forEach((d, i) => { const dt = t - t0 - i * 0.03; if (dt < 0 || dt > 1.1) { d.visible = false; return; }
      d.visible = true; if (color) d.material.color.set(color); const a = (i * 2.4) % (Math.PI * 2);
      d.position.set(ox - dt * 0.9 * Math.cos(a) * 0.7, oy + 0.15 + dt * 0.5, oz + Math.sin(a) * 0.5 * dt);
      d.scale.setScalar(0.12 + dt * 0.4); d.material.opacity = 0.75 * (1 - dt / 1.1); });
  }

  // ---------- post ----------
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.004, maxblur: 0.008 }); composer.addPass(bokeh);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), night ? 0.7 : 0.45, 0.6, night ? 0.7 : 0.86));
  composer.addPass(new OutputPass());

  function cam(pos, look, fov = 32, ap = 0.004) {
    camera.position.copy(pos); camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix();
    bokeh.uniforms.focus.value = pos.distanceTo(look); bokeh.uniforms.aperture.value = ap;
    sun.position.copy(look).add(night ? v3(5, 7, 4) : v3(-6, 6, 5)); sun.target.position.copy(look);
  }

  function reset(t) {
    pip.visible = peb.visible = true; ball.visible = false; fire.forEach((f) => (f.visible = false)); dust.forEach((d) => (d.visible = false));
    pip.position.set(0, 0, 0); pip.rotation.set(0, 0.4, 0); pipBody.scale.set(1, 1, 1); pipBody.rotation.set(0, 0, 0); pipBody.position.set(0, 0, 0);
    lids.forEach((l) => (l.rotation.x = -1.6)); pipEyes.forEach((e) => e.scale.setScalar(1)); smile.visible = true; mouthO.visible = false;
    if (t % 2.6 < 0.1) lids.forEach((l) => (l.rotation.x = 0));
    peb.position.set(0, 0, 1.3); peb.rotation.set(0, -1.2, 0); peb.scale.setScalar(0.95); pebBody.scale.set(1, 1, 1); pebBody.rotation.set(0, 0, 0);
    eyeballs.forEach((e) => e.scale.setScalar(1)); glasses.position.y = 0; glint.scale.setScalar(0.001);
    stalks.rotation.z = Math.sin(t * 2.1) * 0.1;
    doorHinge.rotation.y = 0; doorLight.intensity = 0; lettuce.visible = true; doorway.visible = false; plateFood.visible = true;
  }

  return { THREE, renderer, scene, camera, composer, bokeh, sun, M, SPH, mesh, white, black, gm, green,
    trees, pip, pipBody, lids, pipEyes, smile, mouthO, peb, pebBody, shell, stalks, eyeballs, glasses, glint,
    ball, ballShell, fire, house, cap, doorway, lettuce, doorHinge, doorLight, table, plateFood, screenMat, puffs, cam, reset,
    render: () => composer.render() };
}
