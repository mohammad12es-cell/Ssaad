// IRAM CO. "One door, three keys": the Three.js world. Everything is a pure function of film time `t`
// (no clocks, no randomness), driven by the HyperFrames root timeline through a proxy tween.
import * as THREE from "three";
import { RoomEnvironment } from "./jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "./jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./jsm/postprocessing/OutputPass.js";

const T = window.__T, W = 1080, H = 1920, AN = T.anchors;
const S = {}; T.scenes.forEach((s, i) => (S[s.id] = Object.assign({}, s, { i, next: T.scenes[i + 1] ? T.scenes[i + 1].start : T.total })));

// ---------------------------------------------------------------- math
const cl = (x) => Math.max(0, Math.min(1, x));
const pr = (t, t0, d) => cl((t - t0) / d);
const eo = (k) => 1 - Math.pow(1 - k, 3);
const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const ess = (k) => k * k * (3 - 2 * k);
const eb = (k) => { const a = 1.70158, b = a + 1; return k <= 0 ? 0 : 1 + b * Math.pow(k - 1, 3) + a * Math.pow(k - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- renderer, scene, look
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

function canvasTex(w, h, draw, repeat) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// value noise on a grid, deterministic
function noiseField(seed) {
  const g = (i, j) => hash(i * 57.13 + j * 113.7 + seed * 19.31);
  return (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(g(ix, iy), g(ix + 1, iy), sx), lerp(g(ix, iy + 1), g(ix + 1, iy + 1), sx), sy); };
}

const scene = new THREE.Scene();
// dusk sky behind the wall: deep brand green at the top to warm apricot at the horizon
scene.background = canvasTex(64, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#08251a"); gr.addColorStop(0.45, "#1f4a3a"); gr.addColorStop(0.78, "#b9785a"); gr.addColorStop(1, "#e9b47c");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200); scene.add(camera);
scene.add(new THREE.HemisphereLight(0xffe7cc, 0x2a1d1a, 0.7));
const key = new THREE.DirectionalLight(0xffd9a8, 1.7); key.position.set(-6, 9, 9); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fe6c4, 0.55); rim.position.set(7, 4, 3); scene.add(rim);
const doorLight = new THREE.PointLight(0xffd28a, 0, 30, 1.6); doorLight.position.set(0, 2.6, -2.5); scene.add(doorLight);

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.55, 1.05); composer.addPass(bloom);
composer.addPass(new OutputPass());

const LOOK = new THREE.Vector3();
function cam(p, l) { camera.position.copy(p); LOOK.copy(l); camera.lookAt(l); }

// ---------------------------------------------------------------- materials
const phys = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
// Yerevan pink tuff: warm blotchy stone with block joints, generated deterministically
const tuffTex = canvasTex(512, 512, (g, w, h) => {
  const n1 = noiseField(1), n2 = noiseField(2), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, n = n1(u * 9, v * 9) * 0.6 + n2(u * 31, v * 31) * 0.4, pit = hash(x * 7.7 + y * 13.1) > 0.985 ? -38 : 0;
    const by = Math.floor(v * 4), bx = (u * 2 + (by % 2) * 0.5) % 1, joint = (v * 4) % 1 < 0.025 || bx < 0.012 ? -46 : 0;
    const i = (y * w + x) * 4, k = (n - 0.5) * 46 + pit + joint;
    img.data[i] = 196 + k; img.data[i + 1] = 138 + k * 0.85; img.data[i + 2] = 118 + k * 0.8; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, [0.18, 0.18]);
const basaltTex = canvasTex(256, 256, (g, w, h) => {
  const n1 = noiseField(5), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (n1(x / 18, y / 18) - 0.5) * 30 + (hash(x * 3.1 + y * 7.9) - 0.5) * 16, i = (y * w + x) * 4;
    img.data[i] = 78 + k; img.data[i + 1] = 72 + k; img.data[i + 2] = 74 + k; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}, [0.35, 0.35]);
const M = {
  tuff: std({ map: tuffTex, roughness: 0.92, metalness: 0 }),
  tuffDark: std({ map: tuffTex, color: 0xb98a80, roughness: 0.95 }),
  basalt: std({ map: basaltTex, roughness: 0.85 }),
  gold: phys({ color: 0xf2c56b, metalness: 1, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.15 }),
  goldSatin: std({ color: 0xdcab55, metalness: 1, roughness: 0.38 }),
  emerald: phys({ color: 0x1f6b47, metalness: 0.05, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 }),
  emeraldDeep: phys({ color: 0x154d33, metalness: 0.05, roughness: 0.36, clearcoat: 0.9, clearcoatRoughness: 0.22 }),
  hole: std({ color: 0x050807, roughness: 1 }),
  glass: phys({ color: 0xdff3ea, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
  sand: std({ color: 0xf0cf8e, roughness: 0.9 }),
  red: std({ color: 0xc23a2a, roughness: 0.4, emissive: 0xc23a2a, emissiveIntensity: 0.6 }),
};
const SPH = new THREE.SphereGeometry(1, 32, 20), CYL = new THREE.CylinderGeometry(1, 1, 1, 48), CONE = new THREE.ConeGeometry(1, 1, 48);
const RB = new Map();
const rbox = (w, h, d, r = 0.03) => { const k = [w, h, d, r].join(); if (!RB.has(k)) RB.set(k, new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.999)); return RB.get(k); };
function mesh(geo, mat, parent, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); typeof s === "number" ? m.scale.setScalar(s) : m.scale.set(...s); m.rotation.set(...r);
  if (parent) parent.add(m); return m;
}
const group = (parent, p = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); if (parent) parent.add(g); return g; };
const extrude = (shape, depth, bevel = 0.02, seg = 3) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 40 });
// arch outline: straight sides of height `hs`, semicircle of radius w/2 on top, bottom at y=0
function archPath(p, w, hs, cw = false) {
  const r = w / 2;
  if (!cw) { p.moveTo(-r, 0); p.lineTo(r, 0); p.lineTo(r, hs); p.absarc(0, hs, r, 0, Math.PI, false); p.lineTo(-r, 0); }
  else { p.moveTo(-r, 0); p.lineTo(-r, hs); p.absarc(0, hs, r, Math.PI, 0, true); p.lineTo(r, 0); p.lineTo(-r, 0); }
  return p;
}
const archShape = (w, hs) => archPath(new THREE.Shape(), w, hs);
const radial = (stops) => canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const HALO = radial([[0, "rgba(255,214,140,0.9)"], [0.35, "rgba(255,196,110,0.3)"], [1, "rgba(255,190,110,0)"]]);
const REDHALO = radial([[0, "rgba(255,80,60,0.9)"], [0.4, "rgba(230,60,40,0.3)"], [1, "rgba(230,60,40,0)"]]);
function halo(parent, p, s, map = HALO) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); m.position.set(...p); m.scale.set(s, s, 1); parent.add(m); return m; }

// ---------------------------------------------------------------- HTML labels pinned to 3D points
const LBL = document.getElementById("labels"); const labels = [];
function label(html, cls = "") { const d = document.createElement("div"); d.className = "lbl " + cls; d.innerHTML = html; LBL.appendChild(d); const L = { d, p: new THREE.Vector3(), o: 0, s: 1 }; labels.push(L); return L; }
const tmp = new THREE.Vector3();
function placeLabels() {
  labels.forEach((L) => {
    if (L.o <= 0.001) { if (L.d.style.opacity !== "0") L.d.style.opacity = 0; return; }
    tmp.copy(L.p).project(camera);
    L.d.style.opacity = L.o.toFixed(3);
    L.d.style.transform = `translate(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * H}px) translate(-50%, -50%) scale(${((0.8 + 0.2 * eo(L.o)) * L.s).toFixed(3)})`;
  });
}

// ---------------------------------------------------------------- the wall, the arch, the steps, the plaza
const OPEN_W = 3.0, OPEN_HS = 3.7, WALL_D = 1.1;            // door opening: 3.0 wide, top of arch at 3.7 + 1.5 = 5.2
const world = group(scene);
{
  const s = new THREE.Shape(); s.moveTo(-14, -0.7); s.lineTo(14, -0.7); s.lineTo(14, 7.75); s.lineTo(-14, 7.75); s.lineTo(-14, -0.7);
  s.holes.push(archPath(new THREE.Path(), OPEN_W, OPEN_HS, true));
  mesh(extrude(s, WALL_D, 0), M.tuff, world, [0, 0, -WALL_D]);
  // cornice line along the wall
  mesh(rbox(28, 0.28, 0.32, 0.04), M.tuffDark, world, [0, 7.4, 0.12]);
  mesh(rbox(28, 0.12, 0.2, 0.03), M.goldSatin, world, [0, 7.18, 0.12]);
}
// portal: a deep tuff arch frame with a gold inlay ring and a keystone
const portal = group(world, [0, 0, 0]);
{
  const fr = archShape(4.5, OPEN_HS); fr.holes.push(archPath(new THREE.Path(), OPEN_W + 0.02, OPEN_HS, true));
  mesh(extrude(fr, 0.34, 0.05), M.tuffDark, portal, [0, 0, -0.02]);
  const inl = archShape(3.62, OPEN_HS); inl.holes.push(archPath(new THREE.Path(), 3.42, OPEN_HS, true));
  mesh(extrude(inl, 0.06, 0.012), M.goldSatin, portal, [0, 0.0, 0.36]);
  mesh(extrude(new THREE.Shape([v3(-0.32, 0, 0), v3(0.32, 0, 0), v3(0.24, -0.62, 0), v3(-0.24, -0.62, 0)].map((p) => new THREE.Vector2(p.x, p.y))), 0.42, 0.03), M.tuff, portal, [0, OPEN_HS + 2.28, -0.02]);
  mesh(SPH, M.gold, portal, [0, OPEN_HS + 1.98, 0.44], [0.09, 0.09, 0.04]);
  // carved panel above the arch for the sign
  mesh(rbox(4.6, 1.0, 0.16, 0.06), M.tuffDark, portal, [0, OPEN_HS + 3.05, 0.06]);
  mesh(rbox(4.75, 0.06, 0.2, 0.02), M.goldSatin, portal, [0, OPEN_HS + 2.53, 0.08]);
  mesh(rbox(4.75, 0.06, 0.2, 0.02), M.goldSatin, portal, [0, OPEN_HS + 3.57, 0.08]);
}
// steps and plaza
mesh(rbox(7.2, 0.3, 1.6, 0.05), M.basalt, world, [0, -0.15, 0.8]);
mesh(rbox(9.0, 0.3, 1.9, 0.05), M.basalt, world, [0, -0.45, 1.55]);
const plaza = mesh(new THREE.PlaneGeometry(80, 60), std({ map: canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#6b5150"; g.fillRect(0, 0, w, h); const n = noiseField(9);
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const k = (n(x / 20, y / 20) - 0.5) * 36; g.fillStyle = `rgb(${110 + k},${84 + k},${82 + k})`; g.fillRect(x, y, 2, 2); }
  g.strokeStyle = "rgba(40,24,24,0.55)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); }
}, [14, 10]), roughness: 0.9 }), world, [0, -0.6, 30], 1, [-Math.PI / 2, 0, 0]);

// ---------------------------------------------------------------- beyond the door: a sunlit Yerevan with Ararat
const beyond = group(scene, [0, 0, 0]);
const yerevanTex = canvasTex(900, 1600, (g, w, h) => {
  const base = h * 0.66, n1 = noiseField(21), n2 = noiseField(22);
  const sky = g.createLinearGradient(0, 0, 0, base);
  sky.addColorStop(0, "#4f8fb3"); sky.addColorStop(0.55, "#86b6cf"); sky.addColorStop(0.82, "#e9d6b4"); sky.addColorStop(1, "#ffd59a");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.7, base - h * 0.06, 0, w * 0.7, base - h * 0.06, w * 0.6); sun.addColorStop(0, "rgba(255,246,220,0.9)"); sun.addColorStop(1, "rgba(255,236,190,0)");
  g.fillStyle = sun; g.fillRect(0, 0, w, h);
  // mountain silhouette as a height profile with noise on the ridges: Masis (big) and Sis (small)
  const ridge = (x) => { const u = x / w;
    const big = Math.max(0, 1 - Math.pow(Math.abs(u - 0.6) / 0.5, 1.5)) * h * 0.25, small = Math.max(0, 1 - Math.pow(Math.abs(u - 0.2) / 0.22, 1.4)) * h * 0.12;
    return Math.max(big, small) + (n1(u * 30, 0) - 0.5) * h * 0.006; };
  for (let x = 0; x < w; x++) {
    const top = base - ridge(x), u = x / w;
    const lit = cl(0.55 + 0.6 * (u - 0.6));
    for (let y = Math.floor(top); y < base + 2; y++) {
      const d = (y - top) / Math.max(1, ridge(x)), snowLine = 0.3 + (n2(u * 14, 0.5) - 0.5) * 0.08 + (n2(u * 60, y / 80) - 0.5) * 0.03;
      const snow = d < snowLine, k = (n1(u * 60, y / 25) - 0.5) * 18;
      const sh = u < 0.6 ? 1 - (0.6 - u) * 0.9 : 1, c = snow ? [252 * sh + k * 0.3, 253 * sh + k * 0.3, 255] : [118 + 40 * lit + k, 134 + 34 * lit + k, 160 + 20 * lit + k];
      const haze = cl((y - (base - h * 0.08)) / (h * 0.08)) * 0.75;
      g.fillStyle = `rgb(${lerp(c[0], 250, haze) | 0},${lerp(c[1], 222, haze) | 0},${lerp(c[2], 190, haze) | 0})`; g.fillRect(x, y, 1, 1);
    }
  }
  // the pink-tuff city in three depths: far (pale), middle, near (warm), with lit windows and a few trees
  const rows = [[base - 30, "#e7b9a2", "#f0cbb6", 0.55, 0.7], [base + 10, "#d69a83", "#e2ab91", 0.8, 0.9], [base + 55, "#b87a68", "#c98a76", 1.1, 1]];
  rows.forEach(([y0, c1, c2, sc, op], r) => {
    let x = -20, i = r * 100;
    while (x < w) { const bw = (38 + hash(i) * 70) * sc, bh = (40 + hash(i + 50) * 150) * sc;
      g.globalAlpha = op; g.fillStyle = i % 2 ? c1 : c2; g.fillRect(x, y0 - bh, bw, bh + h);
      g.fillStyle = "rgba(90,50,40,0.25)"; g.fillRect(x + bw - 5 * sc, y0 - bh, 5 * sc, bh + h);
      g.fillStyle = "rgba(255,244,214,0.8)";
      for (let rr = 0; rr < bh / (22 * sc) - 1; rr++) for (let c = 0; c < bw / (16 * sc) - 1; c++) if (hash(i * 31 + rr * 7 + c) > 0.5) g.fillRect(x + (6 + c * 16) * sc, y0 - bh + (8 + rr * 22) * sc, 7 * sc, 10 * sc);
      if (r === 2 && hash(i * 3) > 0.55) { g.fillStyle = "#4f7d4c"; g.beginPath(); g.arc(x + bw * 0.5, y0 - 8, 26, 0, TAU); g.fill(); }
      x += bw + 3; i++; }
  });
  g.globalAlpha = 1; g.fillStyle = "#8f5c50"; g.fillRect(0, base + 55, w, h);
});
mesh(new THREE.PlaneGeometry(18, 32), new THREE.MeshBasicMaterial({ map: yerevanTex, fog: false }), beyond, [0, 5.4, -34]);
const beyondFloor = mesh(new THREE.PlaneGeometry(40, 34), std({ color: 0xc9917c, map: tuffTex, roughness: 0.9 }), beyond, [0, -0.02, -18.1], 1, [-Math.PI / 2, 0, 0]);

// ---------------------------------------------------------------- the door (single leaf, hinge on the left)
const hinge = group(world, [-OPEN_W / 2 + 0.03, 0, -0.55]);
const door = group(hinge, [OPEN_W / 2 - 0.03, 0, 0]);
{
  const leaf = archShape(OPEN_W - 0.06, OPEN_HS);
  mesh(extrude(leaf, 0.16, 0.02), M.emerald, door, [0, 0.02, -0.08]);
  // raised panels and gold trim
  const trim = archShape(2.6, OPEN_HS - 0.1); trim.holes.push(archPath(new THREE.Path(), 2.46, OPEN_HS - 0.1, true));
  mesh(extrude(trim, 0.03, 0.01), M.goldSatin, door, [0, 0.22, 0.1]);
  mesh(rbox(0.9, 1.5, 0.06, 0.04), M.emeraldDeep, door, [-0.72, 0.95, 0.1]);
  mesh(rbox(0.9, 1.5, 0.06, 0.04), M.emeraldDeep, door, [0.72, 0.95, 0.1]);
  mesh(rbox(0.9, 1.9, 0.06, 0.04), M.emeraldDeep, door, [-0.72, 3.05, 0.1]);
  mesh(rbox(0.9, 1.9, 0.06, 0.04), M.emeraldDeep, door, [0.72, 3.05, 0.1]);
  // a vertical gold spine that carries the three locks
  mesh(rbox(0.5, 3.6, 0.05, 0.05), M.goldSatin, door, [0, 2.45, 0.1]);
  // studs
  for (let r = 0; r < 7; r++) for (const sx of [-1.28, 1.28]) mesh(SPH, M.gold, door, [sx, 0.35 + r * 0.55, 0.1], [0.045, 0.045, 0.03]);
}
// the three locks: gold plate, keyhole, glow ring + halo
const LOCK_Y = [3.75, 2.65, 1.55];
const locks = LOCK_Y.map((y, i) => {
  const g = group(door, [0, y, 0.15]);
  mesh(CYL, M.gold, g, [0, 0, 0], [0.33, 0.06, 0.33], [Math.PI / 2, 0, 0]);
  mesh(CYL, M.hole, g, [0, 0.05, 0.035], [0.07, 0.02, 0.07], [Math.PI / 2, 0, 0]);
  mesh(rbox(0.07, 0.16, 0.02, 0.01), M.hole, g, [0, -0.04, 0.035]);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd889, transparent: true, opacity: 0 });
  const ring = mesh(new THREE.TorusGeometry(0.38, 0.022, 16, 64), ringMat, g, [0, 0, 0.03]);
  const glow = halo(g, [0, 0, 0.1], 1.6), red = halo(g, [0, 0, 0.12], 1.4, REDHALO);
  return { g, ring, ringMat, glow, red, y };
});
// keys: gold key with an emblem in the bow (0 building = company, 1 briefcase = work, 2 graduation cap = study)
function makeKey(kind) {
  const K = group(scene), body = group(K);
  mesh(CYL, M.gold, body, [0, 0, -0.42], [0.05, 0.86, 0.05], [Math.PI / 2, 0, 0]);
  mesh(rbox(0.06, 0.16, 0.08, 0.01), M.gold, body, [0, -0.09, -0.74]);
  mesh(rbox(0.06, 0.11, 0.07, 0.01), M.gold, body, [0, -0.07, -0.6]);
  mesh(CYL, M.gold, body, [0, 0, 0.02], [0.09, 0.06, 0.09], [Math.PI / 2, 0, 0]);
  const bow = group(body, [0, 0, 0.3]);
  mesh(new THREE.TorusGeometry(0.27, 0.05, 20, 64), M.gold, bow, [0, 0, 0]);
  if (kind === 0) {
    [[-0.1, 0.2, 0.3], [0.0, 0.3, 0.38], [0.1, 0.16, 0.26]].forEach(([x, w2, h2], i) => { const hgt = [0.22, 0.32, 0.18][i];
      mesh(rbox(0.085, hgt, 0.07, 0.01), M.gold, bow, [x, -0.12 + hgt / 2, 0]);
      for (let r = 0; r < Math.floor(hgt / 0.07); r++) mesh(rbox(0.035, 0.03, 0.01, 0.004), M.hole, bow, [x, -0.07 + r * 0.07, 0.04]); });
  } else if (kind === 1) {
    mesh(rbox(0.3, 0.2, 0.07, 0.03), M.gold, bow, [0, -0.04, 0]);
    mesh(new THREE.TorusGeometry(0.055, 0.018, 10, 24, Math.PI), M.gold, bow, [0, 0.06, 0]);
    mesh(rbox(0.3, 0.02, 0.075, 0.005), M.hole, bow, [0, -0.02, 0.005]);
  } else {
    mesh(rbox(0.3, 0.3, 0.03, 0.01), M.gold, bow, [0, 0.04, 0], 1, [0, 0, Math.PI / 4]);
    mesh(CYL, M.gold, bow, [0, -0.09, 0], [0.09, 0.1, 0.06], [Math.PI / 2, 0, 0]);
    mesh(CYL, M.goldSatin, bow, [0.12, -0.05, 0.03], [0.008, 0.16, 0.008]);
    mesh(SPH, M.gold, bow, [0.12, -0.14, 0.03], 0.022);
  }
  const shine = halo(K, [0, 0, 0.32], 1.2);
  K.visible = false;
  return { K, body, shine };
}
const keys = [0, 1, 2].map(makeKey);

// ---------------------------------------------------------------- money and time going to waste
const coins = Array.from({ length: 16 }, (_, i) => {
  const c = group(scene); mesh(CYL, M.gold, c, [0, 0, 0], [0.2, 0.04, 0.2]); mesh(CYL, M.goldSatin, c, [0, 0.021, 0], [0.15, 0.005, 0.15]);
  c.visible = false; return { c, x: (hash(i * 3.3) - 0.5) * 5.2, z: 0.8 + hash(i * 5.1) * 2.2, d: hash(i * 9.7) * 0.9, sp: 2 + hash(i) * 4 };
});
const glassGroup = group(scene, [2.55, 4.6, 1.6]);
{
  mesh(CYL, M.goldSatin, glassGroup, [0, 0.62, 0], [0.42, 0.06, 0.42]); mesh(CYL, M.goldSatin, glassGroup, [0, -0.62, 0], [0.42, 0.06, 0.42]);
  mesh(CONE, M.glass, glassGroup, [0, 0.3, 0], [0.34, 0.6, 0.34], [Math.PI, 0, 0]); mesh(CONE, M.glass, glassGroup, [0, -0.3, 0], [0.34, 0.6, 0.34]);
  for (const a of [0, 2.1, 4.2]) mesh(CYL, M.goldSatin, glassGroup, [Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36], [0.02, 1.24, 0.02]);
}
const sandTop = mesh(CONE, M.sand, glassGroup, [0, 0.22, 0], [0.26, 0.4, 0.26], [Math.PI, 0, 0]);
const sandBot = mesh(CONE, M.sand, glassGroup, [0, -0.48, 0], [0.26, 0.2, 0.26]);
glassGroup.visible = false;

// ---------------------------------------------------------------- labels
const L = {
  sign: label("اقامت ارمنستان", "sign"),
  pick: [0, 1, 2].map((i) => label(["شرکت", "کار", "تحصیل"][i], "pick")),
};

// ---------------------------------------------------------------- camera path (one continuous take)
// poses: [camera position, look-at]; the camera eases from pose to pose at each beat
const P = {
  wide: [v3(0, 2.3, 24), v3(0, 1.65, 0)],
  hookIn: [v3(0, 2.2, 22), v3(0, 1.75, 0)],
  k1: [v3(1.6, 4.1, 9.0), v3(0.05, 3.0, 0)],
  k1c: [v3(0.9, 3.9, 6.8), v3(0.0, 3.0, 0)],
  k2: [v3(-1.5, 2.75, 7.3), v3(0.05, 1.85, 0)],
  k3: [v3(1.5, 1.7, 7.3), v3(-0.05, 0.75, 0)],
  pull: [v3(0, 2.3, 23.5), v3(0, 1.65, 0)],
  door: [v3(0, 2.7, 8.5), v3(0, 2.6, -4)],
  through: [v3(0, 2.6, -6), v3(0, 3.2, -34)],
  city: [v3(0, 2.9, -10), v3(0, 4.6, -34)],
};
const poseAt = (t) => {
  const keysT = [
    [0, P.wide], [S.hook.next - 0.4, P.hookIn],
    [S.key1.start + 0.9, P.k1], [S.check.start + 0.8, P.k1c], [S.check.next - 0.1, P.k1c],
    [S.key2.start + 1.0, P.k2], [S.key2.next - 0.1, P.k2],
    [S.key3.start + 1.0, P.k3], [S.key3.next - 0.1, P.k3],
    [S.waste.start + 1.2, P.pull], [S.waste.next - 0.05, P.pull],
    [S.open.start + 1.0, P.door], [S.open.start + 2.6, P.through], [S.cta.start + 1.5, P.city], [T.total, P.city],
  ];
  let i = 0; while (i < keysT.length - 2 && t > keysT[i + 1][0]) i++;
  const [t0, a] = keysT[i], [t1, b] = keysT[i + 1], k = eio(pr(t, t0, Math.max(0.01, t1 - t0)));
  return [a[0].clone().lerp(b[0], k), a[1].clone().lerp(b[1], k)];
};

// ---------------------------------------------------------------- per-key choreography
// fly in from the side, face the door, slide into the lock, turn. key 0 jams at "alone", turns fully after "checked".
const KEYT = [
  { fly: AN.k1 - 0.1, ins: AN.path1 - 0.2, turn: AN.alone - 0.25, jam: true, done: AN.checked + 0.25, from: v3(4.5, 6, 4) },
  { fly: AN.k2 - 0.1, ins: AN.work, turn: AN.res2 - 0.1, done: AN.res2 + 0.4, from: v3(-4.5, 4.5, 4) },
  { fly: AN.k3 - 0.1, ins: AN.uni, turn: AN.easy - 0.1, done: AN.easy + 0.4, from: v3(4.5, 0.5, 4) },
];
const lockWorld = (i) => locks[i].g.getWorldPosition(new THREE.Vector3());
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function keyFrame(i, t) {
  const k = keys[i], kt = KEYT[i], Kg = k.K, lk = locks[i].g.position;
  if (t < kt.fly) { Kg.visible = false; return 0; }
  Kg.visible = true;
  // positions in the door's own space, so a seated key swings open with the door
  const front = lk.clone().add(v3(0, 0, 1.5)), seated = lk.clone().add(v3(0, 0, 0.62));
  const from = door.worldToLocal(kt.from.clone());
  const f = eo(pr(t, kt.fly, 1.0)), ins = eio(pr(t, kt.ins, 0.6));
  const pos = from.lerp(front, f);
  pos.y += Math.sin(f * Math.PI) * 0.6;
  pos.lerp(seated, ins);
  Kg.position.copy(door.localToWorld(pos));
  let turn = 0, shake = 0;
  if (kt.jam) {
    turn = 0.55 * eb(pr(t, kt.turn, 0.35));
    const jamOn = t > kt.turn + 0.25 && t < kt.done;
    if (jamOn) shake = Math.sin((t - kt.turn) * 46) * 0.05 * (1 - pr(t, kt.done - 0.5, 0.5));
    turn += (Math.PI / 2 - 0.55) * eio(pr(t, kt.done, 0.45));
  } else turn = (Math.PI / 2) * eio(pr(t, kt.turn, 0.5));
  _e.set(0, (1 - f) * (i === 1 ? -1 : 1) * 2.4, -turn + shake);
  door.getWorldQuaternion(_q); Kg.quaternion.copy(_q.multiply(new THREE.Quaternion().setFromEuler(_e)));
  k.shine.material.opacity = 0.55 * (1 - f) + 0.6 * Math.max(0, Math.sin(pr(t, kt.done - 0.1, 0.8) * Math.PI));
  return pr(t, kt.done, 0.4);
}

// ---------------------------------------------------------------- frame(t)
export function frame(t) {
  // door rattle on "none" (no way): the locked door shakes
  const rat = pr(t, AN.none - 0.05, 0.9);
  const op = eio(pr(t, S.open.start - 0.1, 1.6));
  hinge.rotation.y = Math.sin(rat * Math.PI * 7) * 0.018 * (1 - rat) * (rat > 0 ? 1 : 0) + op * 1.75;
  scene.updateMatrixWorld(true);
  // keys and locks
  const unlocked = [0, 1, 2].map((i) => keyFrame(i, t));
  locks.forEach((lk, i) => {
    const u = unlocked[i], kt = KEYT[i];
    const jam = kt.jam ? pr(t, kt.turn + 0.25, 0.15) * (1 - pr(t, kt.done - 0.1, 0.3)) : 0;
    lk.ringMat.opacity = 0.95 * u; lk.ringMat.color.setHex(0xffd889);
    lk.glow.material.opacity = 0.85 * u * (0.85 + 0.15 * Math.sin(t * 5 + i));
    lk.red.material.opacity = jam * (0.65 + 0.35 * Math.sin(t * 18));
  });
  // the "which route fits you?" sweep: the three locks pulse one after another, then all together
  const sweep = pr(t, AN.which - 0.1, 1.5), act = pr(t, AN.act - 0.05, 0.5);
  locks.forEach((lk, i) => { const ph = cl(1 - Math.abs(sweep * 3 - i - 0.5) * 1.6); lk.glow.scale.setScalar(1.6 + 1.1 * ph + 0.9 * Math.sin(act * Math.PI)); });
  // money and time: coins fall past the door, the hourglass turns and drains
  const mOn = t > AN.money - 0.2 && t < S.waste.next + 0.5;
  coins.forEach((c, i) => {
    const k = pr(t, AN.money - 0.15 + c.d, 2.2); c.c.visible = mOn && k > 0 && k < 1;
    c.c.position.set(c.x, lerp(8.5, -3, k * k), c.z); c.c.rotation.set(t * c.sp, t * c.sp * 0.7, 0.4);
  });
  const gIn = eb(pr(t, AN.time - 0.35, 0.5)), gOut = pr(t, AN.which - 0.2, 0.4);
  glassGroup.visible = gIn > 0 && gOut < 1; glassGroup.scale.setScalar(Math.max(0.001, gIn * (1 - gOut)));
  glassGroup.rotation.z = Math.PI * eio(pr(t, AN.time - 0.1, 0.5));
  const drain = pr(t, AN.time + 0.3, 1.8);
  sandTop.scale.set(0.26 * (1 - drain * 0.8), 0.4 * (1 - drain * 0.85) + 0.001, 0.26 * (1 - drain * 0.8));
  sandBot.scale.set(0.26, 0.2 + 0.3 * drain, 0.26);
  // the door opens on the free consultation; light pours in
  doorLight.intensity = 22 * op; bloom.strength = 0.35 + 0.3 * op * (1 - pr(t, S.open.start + 2.2, 1.0));
  renderer.toneMappingExposure = 1.0 + 0.1 * op * (1 - pr(t, S.open.start + 2.2, 1.2));
  // camera
  const [cp, cl2] = poseAt(t);
  const breathe = Math.sin(t * 0.6) * 0.06;
  cam(cp.add(v3(breathe, breathe * 0.5, 0)), cl2);
  // labels
  L.sign.p.set(0, OPEN_HS + 3.05, 0.3); L.sign.o = 1 - pr(t, AN.ways - 0.35, 0.3);
  L.sign.s = 1;
  L.pick.forEach((l, i) => {
    const lk = lockWorld(i); l.p.copy(lk).add(v3(0.95, 0, 0.3));
    l.o = pr(t, AN.which - 0.1 + i * 0.35, 0.3) * (1 - pr(t, S.waste.next - 0.3, 0.3));
    l.s = 1 + 0.25 * cl(1 - Math.abs(sweep * 3 - i - 0.5) * 1.6);
  });
  composer.render();
  placeLabels();
}

// the cover uses a still: `still({ t })`
export function still(o) { frame(o.t); }
