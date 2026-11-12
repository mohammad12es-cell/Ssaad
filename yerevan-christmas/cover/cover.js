// Cover art for the Yerevan Christmas reel, in the IRAM CO. cover style: green textured ground, gold
// metallic props with a soft bloom, waving Armenian flag. Variant "b" puts the presenter in front.
import * as THREE from "three";
import { RoomEnvironment } from "../assets/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "../assets/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "../assets/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../assets/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../assets/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../assets/jsm/postprocessing/OutputPass.js";

const V = new URLSearchParams(location.search).get("v") || "a";
document.body.classList.add("v-" + V);
const W = 1080, H = 1920, lerp = (a, b, k) => a + (b - a) * k, cl = (x) => Math.max(0, Math.min(1, x));
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const wx = (px) => (px / W - 0.5) * 4.52, wy = (py) => (0.5 - py / H) * 8.04;

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = (() => { // brand ground: deep green, lighter sweep top-left and bottom-right, cloudy grain
  const w = 360, h = 640, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
  const A = [9, 30, 21], B = [20, 58, 40], C = [40, 86, 62];
  const grid = (n, s) => Array.from({ length: (n + 1) * (n * 2 + 1) }, (_, i) => hash(i * 7.31 + s));
  const oct = [[4, 0.55, 1], [10, 0.3, 2], [26, 0.15, 3]].map(([n, a, s]) => ({ n, a, g: grid(n, s) }));
  const noise = (x, y) => oct.reduce((acc, o) => { const gx = x * o.n, gy = y * o.n * 2, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, R = o.n + 1;
    const q = (a, b) => o.g[Math.min(b, o.n * 2) * R + Math.min(a, o.n)], sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return acc + o.a * lerp(lerp(q(ix, iy), q(ix + 1, iy), sx), lerp(q(ix, iy + 1), q(ix + 1, iy + 1), sx), sy); }, 0);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, k = cl(1 - Math.hypot((u - 0.5) * 1.1, (v - 0.5) * 0.8) / 0.9);
    const sweep = Math.max(0, 1 - Math.abs((u - 0.05) - (v - 0.02) * 0.9) / 0.12) * cl(1 - v * 2.2) + Math.max(0, 1 - Math.abs((u - 0.95) + (v - 0.92) * 0.7) / 0.1) * cl((v - 0.6) * 3) * 0.7;
    const n = noise(u, v) - 0.5, gr = (hash(x * 13.7 + y * 91.3) - 0.5) * 0.05, i = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) img.data[i + c] = Math.max(0, Math.min(255, lerp(lerp(A[c], B[c], k), C[c], sweep * 0.5) * (1 + n * 0.3 + gr)));
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8;
scene.add(new THREE.HemisphereLight(0xfff0d0, 0x0b2017, 0.5));
const key = new THREE.DirectionalLight(0xffe4b8, 1.9); key.position.set(-4, 6, 8); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fe8bd, 1.1); rim.position.set(5, 2, -4); scene.add(rim);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60); camera.position.set(0, 0, 15); camera.lookAt(0, 0, 0);

const phys = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
const M = { gold: phys({ color: 0xf2c56b, metalness: 1, roughness: 0.2, clearcoat: 0.4 }), copper: std({ color: 0xe29a62, metalness: 1, roughness: 0.3 }),
  emerald: phys({ color: 0x23744c, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }), emeraldDeep: phys({ color: 0x1a5a3c, roughness: 0.35, clearcoat: 0.8 }),
  cream: phys({ color: 0xeee2c8, roughness: 0.5, clearcoat: 0.3 }), red: phys({ color: 0xb3262e, roughness: 0.45, clearcoat: 0.5 }), dark: std({ color: 0x0b2218, roughness: 0.45 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xfff2c2 }) };
const SPH = new THREE.SphereGeometry(1, 40, 24), CYL = new THREE.CylinderGeometry(1, 1, 1, 48), CONE = new THREE.ConeGeometry(1, 1, 48);
const mesh = (geo, mat, parent, p = [0, 0, 0], s = 1, r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); typeof s === "number" ? m.scale.setScalar(s) : m.scale.set(...s); m.rotation.set(...r); parent.add(m); return m; };
const group = (parent, p = [0, 0, 0], s = 1) => { const g = new THREE.Group(); g.position.set(...p); g.scale.setScalar(s); parent.add(g); return g; };
const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99);
function starShape(n, R, r) { const s = new THREE.Shape(); for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n + Math.PI / 2, k = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * k, Math.sin(a) * k) : s.moveTo(Math.cos(a) * k, Math.sin(a) * k); } s.closePath(); return s; }
const extrude = (shape, depth, bevel = 0.02) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 20 });

function tree(parent, p, s) { const g = group(parent, p, s);
  [[0.66, 0.78, 0.0], [0.54, 0.7, 0.5], [0.42, 0.6, 0.95], [0.29, 0.5, 1.35]].forEach(([r, h, y], i) => mesh(CONE, i % 2 ? M.emeraldDeep : M.emerald, g, [0, y + h / 2, 0], [r, h, r]));
  mesh(CYL, M.dark, g, [0, -0.12, 0], [0.12, 0.3, 0.12]);
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => { const u = i / 59, a = u * Math.PI * 7 + 0.6, r = lerp(0.64, 0.12, u); return v3(Math.cos(a) * r, 0.12 + u * 1.65, Math.sin(a) * r); })), 260, 0.014, 6), M.gold, g);
  for (let i = 0; i < 18; i++) { const u = 0.06 + (i / 18) * 0.84, a = i * 2.39, r = lerp(0.6, 0.14, u) + 0.02; mesh(SPH, i % 3 === 0 ? M.copper : M.gold, g, [Math.cos(a) * r, 0.1 + u * 1.7, Math.sin(a) * r], 0.052); }
  mesh(extrude(starShape(5, 0.2, 0.085), 0.05, 0.015), M.gold, g, [0, 2.0, -0.03]); mesh(SPH, M.glow, g, [0, 2.0, 0.03], 0.06); return g; }
function gift(parent, p, s, body, rib, ry) { const g = group(parent, p); g.rotation.y = ry;
  mesh(rbox(s, s * 0.85, s, 0.03), body, g); mesh(rbox(s * 1.02, s * 0.87, s * 0.16, 0.01), rib, g); mesh(rbox(s * 0.16, s * 0.87, s * 1.02, 0.01), rib, g);
  [-1, 1].forEach((d) => mesh(new THREE.TorusGeometry(s * 0.15, s * 0.045, 10, 28), rib, g, [d * s * 0.13, s * 0.5, 0], 1, [0, 0, d * 0.6])); return g; }
const SPK = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 1); s.quadraticCurveTo(0.12, 0.12, 1, 0); s.quadraticCurveTo(0.12, -0.12, 0, -1); s.quadraticCurveTo(-0.12, -0.12, -1, 0); s.quadraticCurveTo(-0.12, 0.12, 0, 1); return s; })());
function flag(parent, p, w, h) { // waving Armenian flag cloth
  const tex = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 300; const g = c.getContext("2d"); [["#D90012", 0], ["#0033A0", 100], ["#F2A800", 200]].forEach(([col, y]) => { g.fillStyle = col; g.fillRect(0, y, 512, 100); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const geo = new THREE.PlaneGeometry(w, h, 60, 30), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), u = (x / w) + 0.5; pos.setZ(i, Math.sin(u * 7.2 + y * 1.4) * 0.15 * (0.3 + u) + Math.sin(u * 3 - 0.5) * 0.06); pos.setY(i, y + Math.sin(u * 6.3) * 0.05); }
  geo.computeVertexNormals(); return mesh(geo, phys({ map: tex, roughness: 0.5, sheen: 0.6, sheenRoughness: 0.4, side: THREE.DoubleSide }), parent, p, 1, [0.08, -0.3, 0]); }

// ---------------- layout
const root = group(scene);
if (V === "a") {
  tree(root, [0, wy(1462), 0], 0.76);
  gift(root, [-0.74, wy(1445), 0.25], 0.34, M.emerald, M.gold, 0.5); gift(root, [0.76, wy(1450), 0.2], 0.3, M.red, M.gold, -0.4);
  gift(root, [-0.36, wy(1462), 0.45], 0.22, M.cream, M.red, -0.2); gift(root, [0.4, wy(1465), 0.5], 0.2, M.emeraldDeep, M.gold, 0.7);
  flag(root, [0, wy(1642), 0], 1.75, 0.85);
} else {
  tree(root, [wx(250), wy(1460), -0.8], 1.25);
  gift(root, [wx(150), wy(1500), 0.5], 0.44, M.emerald, M.gold, 0.5); gift(root, [wx(330), wy(1560), 1.0], 0.34, M.red, M.gold, -0.4);
}
[[180, 1210], [900, 1180], [120, 1650], [960, 1560], [540, 1130], [300, 1080], [800, 1700]].forEach(([x, y], i) => { const m = mesh(SPK, M.glow, root, [wx(x), wy(y), 1.2], 0.07 + hash(i) * 0.06); m.rotation.z = hash(i + 3); });
const n = 160, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { sp[i * 3] = (hash(i) - 0.5) * 5; sp[i * 3 + 1] = (hash(i + 9) - 0.5) * 8.6; sp[i * 3 + 2] = (hash(i + 5) - 0.5) * 3; }
const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfbf3df, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false })));

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.45, 0.5, 1.05)); composer.addPass(new OutputPass());
document.fonts.ready.then(() => { composer.render(); requestAnimationFrame(() => (window.__ready = true)); });
