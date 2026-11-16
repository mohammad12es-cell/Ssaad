// Company registration in Armenia: the Three.js world. Everything here is a pure function of film time `t`
// (no clocks, no randomness), driven by the HyperFrames root timeline through a proxy tween.
import * as THREE from "three";
import { RoomEnvironment } from "./jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "./jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./jsm/postprocessing/OutputPass.js";

const T = window.__T, W = 1080, H = 1920;
const S = {}; T.scenes.forEach((s, i) => (S[s.id] = Object.assign({}, s, { i, t0: i ? s.start : 0, next: T.scenes[i + 1] ? T.scenes[i + 1].start : T.total })));
const c = (sid, j) => S[sid].caps[Math.min(j, S[sid].caps.length - 1)].start;
const at = (sid, j, f) => { const k = S[sid].caps[Math.min(j, S[sid].caps.length - 1)]; return k.start + f * (k.end - k.start); };

// ---------------------------------------------------------------- easing
const cl = (x) => Math.max(0, Math.min(1, x));
const pr = (t, t0, d) => cl((t - t0) / d);
const eo = (k) => 1 - Math.pow(1 - k, 3);
const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eb = (k) => { const a = 1.70158, b = a + 1; return k <= 0 ? 0 : 1 + b * Math.pow(k - 1, 3) + a * Math.pow(k - 1, 2); };
const ebn = (k) => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; };
const lerp = (a, b, k) => a + (b - a) * k;
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- renderer, scene, look
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = (() => { // brand background: forest-green radial glow + cloudy texture, generated deterministically
  const w = 360, h = 640, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
  const lin = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const A = lin("#0b2017"), B = lin("#163726"), C = lin("#24493a");
  const grid = (n, seed) => Array.from({ length: (n + 1) * (n * 2 + 1) }, (_, i) => hash(i * 7.31 + seed));
  const oct = [[5, 0.55, 1], [11, 0.3, 2], [27, 0.15, 3]].map(([n, a, s]) => ({ n, a, g: grid(n, s) }));
  const noise = (x, y) => oct.reduce((acc, o) => {
    const gx = x * o.n, gy = y * o.n * 2, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, R = o.n + 1;
    const q = (a, b) => o.g[(Math.min(b, o.n * 2)) * R + Math.min(a, o.n)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return acc + o.a * lerp(lerp(q(ix, iy), q(ix + 1, iy), sx), lerp(q(ix, iy + 1), q(ix + 1, iy + 1), sx), sy);
  }, 0);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, r = Math.hypot((u - 0.5) * 1.1, (v - 0.45) * 0.9), tl = Math.hypot((u - 0.15) / 0.9, (v - 0.04) / 0.55);
    let k = cl(1 - r / 0.85); const glow = cl(1 - tl) * 0.75, n = noise(u, v) - 0.5, gr = (hash(x * 13.7 + y * 91.3) - 0.5) * 0.05;
    const i = (y * w + x) * 4;
    for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.max(0, Math.min(255, lerp(lerp(A[ch], B[ch], k), C[ch], glow) * (1 + n * 0.32 + gr)));
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
})();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.72;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 80);
scene.add(new THREE.HemisphereLight(0xfff0d0, 0x0b2017, 0.5));
const key = new THREE.DirectionalLight(0xffe4b8, 1.65); key.position.set(-4, 7, 8); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fe8bd, 1.1); rim.position.set(6, 2, -5); scene.add(rim);

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.32, 0.45, 1.2); composer.addPass(bloom);
composer.addPass(new OutputPass());

function cam(p, l, fov = 30) { camera.position.copy(p); camera.lookAt(l); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); } }

// ---------------------------------------------------------------- materials & builders
const phys = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  gold: phys({ color: 0xf2c56b, metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
  goldSatin: std({ color: 0xdcab55, metalness: 1, roughness: 0.38 }),
  copper: std({ color: 0xe29a62, metalness: 1, roughness: 0.3 }),
  copperMatte: std({ color: 0xd38a4c, metalness: 0.2, roughness: 0.5 }),
  emerald: phys({ color: 0x23744c, metalness: 0.05, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }),
  emeraldDeep: phys({ color: 0x1d6343, metalness: 0.05, roughness: 0.3, clearcoat: 0.8 }),
  tile: std({ color: 0x1a4430, metalness: 0.25, roughness: 0.45 }),
  cream: phys({ color: 0xe3d4b6, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
  sage: std({ color: 0x86a58f, roughness: 0.6 }),
  dark: std({ color: 0x0b2218, roughness: 0.45, metalness: 0.1 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xfff0c0 }),
  sun: std({ color: 0xffc860, emissive: 0xffb340, emissiveIntensity: 1.6, roughness: 0.4 }),
  silver: phys({ color: 0xc9d2c4, metalness: 0.35, roughness: 0.35, clearcoat: 0.5 }),
};
const glass = (op = 0.2, color = 0xe6fff1) => phys({ color, transparent: true, opacity: op, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
const SPH = new THREE.SphereGeometry(1, 40, 24), CYL = new THREE.CylinderGeometry(1, 1, 1, 40), CONE = new THREE.ConeGeometry(1, 1, 32);
const RB = new Map();
const rbox = (w, h, d, r = 0.05) => { const k = [w, h, d, r].join(); if (!RB.has(k)) RB.set(k, new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.999)); return RB.get(k); };
function mesh(geo, mat, parent, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (typeof s === "number") m.scale.setScalar(s); else m.scale.set(...s); m.rotation.set(...r); if (parent) parent.add(m); return m;
}
const group = (parent, p = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); if (parent) parent.add(g); return g; };
const COIN = new THREE.LatheGeometry([[0, -0.045], [0.3, -0.045], [0.34, -0.018], [0.34, 0.018], [0.3, 0.045], [0.24, 0.045], [0.23, 0.035], [0, 0.035]].map(([x, y]) => new THREE.Vector2(x, y)), 56);
const shadowTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
const SHMAT = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
const shadow = (parent, x, y, z, sx, sz = sx) => mesh(new THREE.PlaneGeometry(1, 1), SHMAT, parent, [x, y + 0.005, z], [sx, sz, 1], [-Math.PI / 2, 0, 0]);
function canvasTex(w, h, draw) { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const flagTex = canvasTex(256, 256, (g) => { g.fillStyle = "#D90012"; g.fillRect(0, 0, 256, 86); g.fillStyle = "#0033A0"; g.fillRect(0, 86, 256, 85); g.fillStyle = "#F2A800"; g.fillRect(0, 171, 256, 85); });
function medallion(parent, r, faceMat, p = [0, 0, 0]) { // disc facing the camera with a gold rim
  const g = group(parent, p);
  mesh(CYL, M.gold, g, [0, 0, 0], [r, 0.12, r], [Math.PI / 2, 0, 0]); mesh(new THREE.CircleGeometry(r * 0.97, 64), faceMat, g, [0, 0, 0.062]);
  mesh(new THREE.TorusGeometry(1, 0.08, 16, 64), M.gold, g, [0, 0, 0.0], [r, r, r * 1.4]);
  return g;
}
function tube(points, radius, mat, parent, seg = 120, tension = 0.5) {
  const curve = points instanceof THREE.Curve ? points : new THREE.CatmullRomCurve3(points.map((p) => v3(...p)), false, "catmullrom", tension);
  const geo = new THREE.TubeGeometry(curve, seg, radius, 10, false);
  const m = mesh(geo, mat, parent); m.userData = { curve, seg, rad: 10 }; return m;
}
const drawTube = (m, k) => { m.visible = k > 0.001; m.geometry.setDrawRange(0, Math.floor(m.userData.seg * cl(k)) * m.userData.rad * 6); };
function arrowHead(parent, mat, s = 0.16) { const h = mesh(CONE, mat, parent, [0, 0, 0], [s, s * 2.2, s]); return h; }
function placeHead(h, curve, k) { const p = curve.getPointAt(cl(k)), tg = curve.getTangentAt(Math.min(0.999, Math.max(0.001, k))); h.position.copy(p); h.quaternion.setFromUnitVectors(v3(0, 1, 0), tg); }
function starShape(n, R, r) { const s = new THREE.Shape(); for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n + Math.PI / 2, k = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * k, Math.sin(a) * k) : s.moveTo(Math.cos(a) * k, Math.sin(a) * k); } s.closePath(); return s; }
const extrude = (shape, depth, bevel = 0.02) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
const SPARK = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 1); s.quadraticCurveTo(0.12, 0.12, 1, 0); s.quadraticCurveTo(0.12, -0.12, 0, -1); s.quadraticCurveTo(-0.12, -0.12, -1, 0); s.quadraticCurveTo(-0.12, 0.12, 0, 1); return s; })());
function sparkles(parent, pts, size = 0.12) { return pts.map((p, i) => { const m = mesh(SPARK, M.glow, parent, p, size); m.userData.ph = i * 1.37; return m; }); }
const twinkle = (arr, t, k = 1) => arr.forEach((m) => { const s = (0.55 + 0.45 * Math.sin(t * 5 + m.userData.ph)) * k; m.scale.setScalar(Math.max(1e-4, 0.13 * s)); m.rotation.z = t * 0.6 + m.userData.ph; });
const pop = (o, t, t0, d = 0.5, s = 1) => { const k = pr(t, t0, d); o.visible = k > 0; o.scale.setScalar(Math.max(1e-4, eb(k) * s)); return k; };
const hide = (...os) => os.forEach((o) => (o.visible = false));

// ---------------------------------------------------------------- HTML labels pinned to 3D points
const LBL = document.getElementById("labels"); const labels = [];
function label(text, cls = "") { const d = document.createElement("div"); d.className = "lbl " + cls; d.textContent = text; LBL.appendChild(d); const L = { d, p: new THREE.Vector3(), o: 0 }; labels.push(L); return L; }
const tmp = new THREE.Vector3();
function placeLabels() { labels.forEach((L) => { if (L.o <= 0.001) { L.d.style.opacity = 0; return; } tmp.copy(L.p).project(camera); L.d.style.opacity = L.o.toFixed(3); L.d.style.transform = `translate(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * H}px) translate(-50%, -50%) scale(${(0.85 + 0.15 * L.o).toFixed(3)})`; }); }
const lbl = (L, obj, off, o) => { obj.updateWorldMatrix(true, false); L.p.copy(off).applyMatrix4(obj.matrixWorld); L.o = o; };

// ---------------------------------------------------------------- shared props
const floor = mesh(new THREE.CircleGeometry(7, 64), std({ color: 0x0c2419, roughness: 0.6, metalness: 0.05, transparent: true, depthWrite: false, alphaMap: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }) }), scene, [0, -1.45, 0], 1, [-Math.PI / 2, 0, 0]);
const dust = (() => { const n = 70, pos = new Float32Array(n * 3); const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf3cf7d, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.45, depthWrite: false })); scene.add(pts); return { pts, pos, n }; })();
function updateDust(t) { for (let i = 0; i < dust.n; i++) { const sp = 0.05 + hash(i + 3) * 0.12, y0 = hash(i + 9) * 9; dust.pos[i * 3] = (hash(i) - 0.5) * 7 + Math.sin(t * 0.3 + i) * 0.15; dust.pos[i * 3 + 1] = ((y0 + t * sp) % 9) - 4.5; dust.pos[i * 3 + 2] = (hash(i + 5) - 0.5) * 5 - 1; } dust.pts.geometry.attributes.position.needsUpdate = true; }

// ---------------------------------------------------------------- shared builders (from the first IRAM film)
function coinStack(parent, n, x, y, z) { const g = group(parent, [x, y, z]); const coins = []; for (let j = 0; j < n; j++) coins.push(mesh(COIN, M.gold, g, [0, 0.045 + j * 0.095, 0], 1, [0, j * 0.7, 0])); g.userData.coins = coins; return g; }
function check(parent, p, r = 0.2) { const g = group(parent, p); mesh(CYL, M.gold, g, [0, 0, 0], [r, 0.06, r], [Math.PI / 2, 0, 0]);
  mesh(rbox(r * 0.55, r * 0.18, 0.05, 0.02), M.cream, g, [-r * 0.18, -r * 0.08, 0.04], 1, [0, 0, -0.8]); mesh(rbox(r * 0.95, r * 0.18, 0.05, 0.02), M.cream, g, [r * 0.14, r * 0.06, 0.04], 1, [0, 0, 0.9]); return g; }
function xmark(parent, p, r = 0.2) { const g = group(parent, p); mesh(CYL, M.tile, g, [0, 0, 0], [r, 0.05, r], [Math.PI / 2, 0, 0]);
  [0.785, -0.785].forEach((a) => mesh(rbox(r * 1.1, r * 0.2, 0.05, 0.02), M.sage, g, [0, 0, 0.04], 1, [0, 0, a])); return g; }
function pedestal(parent, p, r = 0.5) { const g = group(parent, p); mesh(CYL, M.tile, g, [0, -0.07, 0], [r, 0.14, r]); mesh(new THREE.TorusGeometry(r, 0.025, 10, 64), M.gold, g, [0, 0, 0], 1, [Math.PI / 2, 0, 0]); shadow(g, 0, -0.14, 0, r * 2.6); return g; }
function ribbon(curve, width, n, mat, parent, y = 0) {
  const pts = curve.getSpacedPoints(n), pos = [], idx = [];
  pts.forEach((p, i) => { const tg = curve.getTangentAt(i / n); const nx = -tg.z, nz = tg.x, L = Math.hypot(nx, nz) || 1; pos.push(p.x + (nx / L) * width / 2, y, p.z + (nz / L) * width / 2, p.x - (nx / L) * width / 2, y, p.z - (nz / L) * width / 2); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = mesh(geo, mat, parent); m.userData = { n }; return m; }
const drawRibbon = (m, k) => { m.visible = k > 0.001; m.geometry.setDrawRange(0, Math.floor(m.userData.n * cl(k)) * 6); };


// ---------------------------------------------------------------- builders for this film
const PAPER = phys({ color: 0xf3ead6, roughness: 0.6, clearcoat: 0.15 });
const INK = std({ color: 0x2c5a45, roughness: 0.6 });
const COPPER_GLOW = std({ color: 0xd38a4c, emissive: 0x6b2c0c, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.3 });
const WIN = std({ color: 0xf4d68c, emissive: 0xc8963e, emissiveIntensity: 0.55, roughness: 0.4 });
const ROAD = std({ color: 0x2c5f45, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });
const GOLD_ROAD = phys({ color: 0xf2c56b, metalness: 1, roughness: 0.25, side: THREE.DoubleSide, emissive: 0x3a2808 });

function sheet(parent, w = 1.2, h = 1.6, n = 6) { // a document: paper, title bar, text lines (filled right-to-left), gold seal
  const g = group(parent); mesh(rbox(w, h, 0.04, 0.03), PAPER, g);
  mesh(rbox(w * 0.55, 0.09, 0.02, 0.01), M.emerald, g, [w * 0.375 - w * 0.275, h / 2 - 0.2, 0.025]);
  const lines = [];
  for (let i = 0; i < n; i++) {
    const lw = w * (i % 3 === 2 ? 0.45 : 0.75), x0 = w * 0.375 - lw / 2;
    const L = mesh(rbox(lw, 0.045, 0.015, 0.01), INK, g, [x0, h / 2 - 0.4 - i * ((h - 0.75) / n), 0.025]); L.userData = { x0, w: lw }; lines.push(L);
  }
  g.userData = { lines, seal: medallion(g, Math.min(0.17, w * 0.13), M.goldSatin, [-w * 0.27, -h / 2 + 0.24, 0.04]) };
  return g;
}
function fillLines(doc, k) { const L = doc.userData.lines, n = L.length; L.forEach((m, i) => { const ki = cl(k * n - i); m.visible = ki > 0.001; m.scale.x = Math.max(1e-3, ki); m.position.x = m.userData.x0 + (m.userData.w / 2) * (1 - ki); }); }
function xCopper(parent, p, r = 0.3) { const g = group(parent, p); [0.785, -0.785].forEach((a) => mesh(rbox(r * 1.5, r * 0.32, 0.06, 0.03), COPPER_GLOW, g, [0, 0, 0], 1, [0, 0, a])); return g; }
// Persian question mark (؟): bowl on the left, tube + end caps + dot
const QCURVE = new THREE.CatmullRomCurve3([[0.27, 0.44], [0.24, 0.64], [0.05, 0.77], [-0.17, 0.72], [-0.28, 0.54], [-0.2, 0.37], [-0.04, 0.27], [0.0, 0.14], [0.0, 0.02]].map(([x, y]) => v3(x, y - 0.3, 0)));
const QGEO = new THREE.TubeGeometry(QCURVE, 48, 0.075, 12, false);
function qmark(parent, mat = M.gold, p = [0, 0, 0], s = 1) {
  const g = group(parent, p); g.scale.setScalar(s); const q = group(g);
  mesh(QGEO, mat, q); mesh(SPH, mat, q, [0.27, 0.14, 0], 0.075); mesh(SPH, mat, q, [0, -0.28, 0], 0.075); mesh(SPH, mat, q, [0, -0.47, 0], 0.09);
  return g;
}
function building(parent, w, h, d, mat = M.cream) {
  const g = group(parent); mesh(rbox(w, h, d, 0.04), mat, g, [0, h / 2, 0]);
  const cols = Math.max(2, Math.round(w / 0.24)), rows = Math.max(2, Math.round((h - 0.3) / 0.24));
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) mesh(rbox(0.1, 0.13, 0.02, 0.01), WIN, g, [(k - (cols - 1) / 2) * (w / cols), 0.36 + r * ((h - 0.5) / rows), d / 2 + 0.006]);
  mesh(rbox(w + 0.08, 0.06, d + 0.08, 0.02), M.gold, g, [0, h + 0.03, 0]); mesh(rbox(0.2, 0.26, 0.03, 0.02), M.emerald, g, [0, 0.13, d / 2 + 0.01]);
  return g;
}
function gavel(parent, p) { // pivot at the handle end, handle along +x, head axis vertical (flat face strikes down)
  const g = group(parent, p);
  mesh(CYL, M.cream, g, [0.52, 0, 0], [0.045, 1.0, 0.045], [0, 0, Math.PI / 2]); mesh(SPH, M.gold, g, [0, 0, 0], 0.065);
  mesh(CYL, M.emeraldDeep, g, [1.05, 0, 0], [0.17, 0.6, 0.17]); [-0.24, 0.24].forEach((y) => mesh(CYL, M.gold, g, [1.05, y, 0], [0.185, 0.05, 0.185]));
  mesh(CYL, M.gold, g, [1.05, 0, 0], [0.1, 0.62, 0.1], [0, 0, 0]);
  return g;
}
function ministry(parent, p) { // classical public building with an Armenian flag
  const g = group(parent, p);
  [[2.7, 0.12, 1.6], [2.5, 0.12, 1.45], [2.3, 0.12, 1.3]].forEach(([w, h, d], i) => mesh(rbox(w, h, d, 0.02), M.cream, g, [0, 0.06 + i * 0.12, 0]));
  mesh(rbox(1.95, 1.1, 0.5, 0.02), M.tile, g, [0, 0.91, -0.25]); mesh(rbox(0.36, 0.62, 0.03, 0.02), M.gold, g, [0, 0.67, 0.01]);
  for (let i = 0; i < 6; i++) mesh(CYL, M.cream, g, [-0.95 + i * 0.38, 0.91, 0.42], [0.075, 1.1, 0.075]);
  mesh(rbox(2.35, 0.17, 1.25, 0.02), M.cream, g, [0, 1.55, 0.05]); mesh(rbox(2.37, 0.04, 1.27, 0.01), M.gold, g, [0, 1.46, 0.05]);
  const tri = new THREE.Shape(); tri.moveTo(-1.15, 0); tri.lineTo(1.15, 0); tri.lineTo(0, 0.46); tri.closePath();
  mesh(extrude(tri, 1.1, 0.02), M.cream, g, [0, 1.64, -0.5]); mesh(rbox(0.5, 0.05, 0.02, 0.01), M.gold, g, [0, 1.8, 0.63]);
  const flag = group(g, [0, 1.95, 0]); mesh(CYL, M.gold, flag, [0, 0.38, 0], [0.025, 0.76, 0.025]); mesh(SPH, M.gold, flag, [0, 0.78, 0], 0.045);
  const cloth = mesh(new THREE.PlaneGeometry(0.56, 0.34, 12, 4), std({ map: flagTex, roughness: 0.6, side: THREE.DoubleSide }), flag, [0.29, 0.58, 0]);
  g.userData = { cloth, base: cloth.geometry.attributes.position.array.slice() };
  return g;
}
const waveCloth = (o, t) => { const c = o.userData.cloth, p = c.geometry.attributes.position, b = o.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3] + 0.3; p.setZ(i, Math.sin(x * 9 - t * 6) * 0.045 * x * 2); } p.needsUpdate = true; };
const shake = (t, t0, a = 0.08) => (t > t0 ? Math.exp(-(t - t0) * 8) * Math.sin((t - t0) * 55) * a : 0);
function ring(parent, mat) { const m = mesh(new THREE.TorusGeometry(1, 0.03, 8, 72), mat, parent, [0, 0, 0], 1, [Math.PI / 2, 0, 0]); return m; }
const RING_M = new THREE.MeshBasicMaterial({ color: 0xf4d68c, transparent: true, opacity: 1, depthWrite: false });
const RING_C = new THREE.MeshBasicMaterial({ color: 0xe29a62, transparent: true, opacity: 1, depthWrite: false });

// ================================================================= scenes
const SC = {};
const root = (id) => { const g = group(scene); g.visible = false; SC[id] = { g }; return g; };

// ---------- S1: a wrong registration -> stamped X -> fine ticket
{ const g = root("s1"), id = "s1";
  const doc = sheet(g, 1.5, 2.0, 7); doc.position.set(-0.3, 0.35, 0);
  const st = group(g), stIn = group(st); stIn.rotation.x = Math.PI / 2; // handle points at the camera
  mesh(CYL, M.copper, stIn, [0, 0.07, 0], [0.4, 0.14, 0.4]); mesh(CYL, M.dark, stIn, [0, 0.32, 0], [0.11, 0.36, 0.11]); mesh(SPH, M.copper, stIn, [0, 0.58, 0], [0.22, 0.17, 0.22]);
  const X = xCopper(doc, [0.02, -0.08, 0.05], 0.55);
  const ticket = group(g, [1.15, -0.8, 1.0]); mesh(rbox(1.08, 0.62, 0.02, 0.04), COPPER_GLOW, ticket, [0, 0, -0.012]); mesh(rbox(1.0, 0.54, 0.03, 0.03), PAPER, ticket);
  const Lfine = label("جریمه", "copper"), Ldoc = label("ثبت شرکت");
  const rings = [ring(g, RING_C), ring(g, RING_C)];
  const sp = sparkles(g, [[-1.7, 1.5, 0.4], [1.6, 1.1, 0.2], [1.35, 1.85, -0.5], [-1.3, -1.0, 0.8]]);
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b1 = c(id, 1), b2 = c(id, 2), hit = b1 + 0.32;
    cam(v3(Math.sin(lt * 0.25) * 0.7 + shake(t, hit, 0.06), 2.0 + shake(t, hit, 0.04), 13.6 - lt * 0.3), v3(0, 0.15, 0));
    pop(doc, t, t0 + 0.05, 0.6, 1); fillLines(doc, eo(pr(t, t0 + 0.35, 0.9)));
    doc.rotation.set(-0.04, 0.16 + Math.sin(t * 0.9) * 0.04, 0.03 + shake(t, hit, 0.05));
    lbl(Ldoc, doc, v3(0.25, 0.8, 0.06), pr(t, t0 + 0.45, 0.3) * (1 - pr(t, b1 - 0.1, 0.2)));
    const kin = eio(pr(t, b1 - 0.12, 0.44)), kout = eio(pr(t, hit + 0.12, 0.45));
    st.visible = kin > 0 && kout < 1;
    st.position.set(lerp(1.4, -0.28, kin) + kout * 1.6, lerp(1.7, 0.27, kin) + kout * 1.3, lerp(3.4, 0.06, kin) + kout * 2.2);
    const kx = pr(t, hit, 0.3); X.visible = kx > 0; X.scale.setScalar(Math.max(1e-4, eb(kx)));
    rings.forEach((r, i) => { const k = pr(t, hit + i * 0.1, 0.7); r.visible = k > 0 && k < 1; r.position.set(-0.28, 0.27, 0.05); r.rotation.set(0, 0, 0); r.scale.setScalar(0.3 + 1.6 * eo(k)); r.material.opacity = 1 - k; });
    const kt = pop(ticket, t, b2 - 0.05, 0.55, 1); ticket.rotation.set(-0.1, -0.25 + Math.sin(t * 1.5) * 0.08, -0.12 + Math.sin(t * 2.2) * 0.04);
    lbl(Lfine, ticket, v3(0, 0, 0.05), cl(kt * 2 - 0.6));
    twinkle(sp, t, pr(t, t0, 0.5));
  };
}

// ---------- S2: the iceberg: a name and a certificate are only the tip
{ const g = root("s2"), id = "s2";
  const ICE = std({ color: 0x9fc0ae, roughness: 0.55, metalness: 0.05, flatShading: true });
  const berg = (detail, seed) => { const geo = new THREE.IcosahedronGeometry(1, detail), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = v3(p.getX(i), p.getY(i), p.getZ(i)), h = hash(Math.round(v.x * 7) * 131 + Math.round(v.y * 7) * 17 + Math.round(v.z * 7) * 3 + seed); v.multiplyScalar(1 + (h - 0.5) * 0.4); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals(); return geo; };
  const bob = group(g);
  const tip = mesh(berg(1, 3), ICE, bob, [0, 0.2, 0], [0.7, 0.66, 0.56]);
  const body = mesh(berg(2, 9), ICE, bob, [0, -2.15, 0], [1.5, 1.7, 1.05]);
  mesh(new THREE.PlaneGeometry(14, 11), new THREE.MeshBasicMaterial({ map: canvasTex(4, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1f5c40"); gr.addColorStop(1, "#04110a"); x.fillStyle = gr; x.fillRect(0, 0, w, h); }) }), g, [0, -5.5, -4.5]);
  const water = mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x0f3a27, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }), g, [0, 0, 0], 1, [-Math.PI / 2, 0, 0]);
  const wl = mesh(new THREE.TorusGeometry(0.82, 0.02, 8, 72), M.gold, g, [0, 0.01, 0], [1, 0.75, 1], [Math.PI / 2, 0, 0]);
  const post = group(g, [-0.15, 0.58, 0.25]); mesh(CYL, M.gold, post, [0, 0.25, 0], [0.025, 0.5, 0.025]); const plate = mesh(rbox(0.95, 0.3, 0.05, 0.04), M.gold, post, [0, 0.62, 0]);
  const cert = sheet(g, 0.62, 0.82, 4); cert.position.set(0.55, 0.62, 0.35); cert.rotation.set(-0.08, -0.35, -0.14);
  const Lname = label("اسم شرکت", "gold"), Lcert = label("برگه‌ی ثبت");
  const deep = [["نوع شرکت", -1.0, -0.95], ["موضوع فعالیت", 0.95, -1.4], ["مدارک", -0.9, -1.95], ["مالیات و قانون", 0.85, -2.4]].map(([s, x, y]) => ({ L: label(s), p: v3(x, y, 1.1) }));
  const bub = []; for (let i = 0; i < 16; i++) bub.push({ m: mesh(SPH, glass(0.35), g), x: (hash(i + 40) - 0.5) * 4.4, z: (hash(i + 41) - 0.2) * 1.6, sp: 0.35 + hash(i + 42) * 0.4, r: 0.03 + hash(i + 43) * 0.05 });
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b1 = c(id, 1), b2 = c(id, 2), k = eio(pr(t, b2 + 0.1, 1.1));
    floor.visible = false;
    cam(v3(lerp(Math.sin(lt * 0.3) * 0.5, 0, k), lerp(1.6, -0.6, k), lerp(10.8, 13.4, k)), v3(0, lerp(0.35, -1.0, k), 0));
    bob.position.y = Math.sin(t * 1.1) * 0.035; bob.rotation.y = Math.sin(t * 0.4) * 0.12;
    const kp = pop(post, t, c(id, 1) - 0.05, 0.5, 1 - 0.999 * k); post.rotation.z = Math.sin(t * 1.7) * 0.05;
    lbl(Lname, plate, v3(0, 0, 0.05), cl(kp * 2 - 0.5) * (1 - cl(k * 3)));
    const kc = pop(cert, t, at(id, 2, 0.15), 0.5, 1 - 0.999 * k); fillLines(cert, eo(pr(t, at(id, 2, 0.15) + 0.2, 0.7)));
    lbl(Lcert, cert, v3(0, -0.6, 0.05), cl(kc * 2 - 0.5) * (1 - cl(k * 3)));
    deep.forEach((d, i) => lbl(d.L, g, d.p, pr(t, b2 + 0.75 + i * 0.15, 0.3)));
    bub.forEach((b, i) => { const y = -5 + ((lt * b.sp + hash(i + 44) * 5) % 4.8); b.m.visible = k > 0.2; b.m.position.set(b.x, y, b.z); b.m.scale.setScalar(b.r); });
    wl.scale.set(1 + Math.sin(t * 2) * 0.03, 0.75, 1);
  };
}

// ---------- S3: which company type fits your activity?
{ const g = root("s3"), id = "s3";
  const spec = [[-1.45, 0.7, 2.15, 0.6, "سهامی"], [0, 1.05, 1.4, 0.75, "مسئولیت محدود"], [1.45, 0.78, 0.9, 0.6, "نمایندگی"]];
  const B = spec.map(([x, w, h, d, name]) => { pedestal(g, [x, -1.3, 0], 0.62); const b = building(g, w, h, d); b.position.set(x, -1.3, 0); return { b, x, L: label(name) }; });
  const aw = group(B[2].b); for (let i = 0; i < 5; i++) mesh(rbox(0.16, 0.05, 0.28, 0.02), i % 2 ? M.cream : M.emerald, aw, [-0.32 + i * 0.16, 0.42, 0.38], 1, [0.45, 0, 0]);
  const you = group(g, [0, -1.35, 2.0]); mesh(SPH, M.gold, you, [0, 0.62, 0], 0.15); mesh(new THREE.CapsuleGeometry(0.15, 0.22, 6, 16), M.gold, you, [0, 0.28, 0]); mesh(CYL, M.tile, you, [0, 0.02, 0], [0.32, 0.04, 0.32]);
  const q = qmark(g, M.gold, [0, -0.15, 2.0], 0.55);
  const beam = mesh(CONE, new THREE.MeshBasicMaterial({ color: 0xf4d68c, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), g, [0, 0.55, 0], [0.62, 3.6, 0.62]);
  const spot = mesh(new THREE.CircleGeometry(0.66, 48), new THREE.MeshBasicMaterial({ color: 0xf4d68c, transparent: true, opacity: 0.55, depthWrite: false }), g, [0, -1.285, 0], 1, [-Math.PI / 2, 0, 0]);
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b1 = c(id, 1), b2 = c(id, 2);
    cam(v3(Math.sin(lt * 0.2) * 1.0, 2.4, 14.2 - lt * 0.15), v3(0, -0.1, 0));
    B.forEach(({ b, x, L }, i) => { const k = pr(t, b1 - 0.15 + i * 0.16, 0.55); b.visible = k > 0; b.scale.set(1, Math.max(1e-3, eb(k)), 1); lbl(L, g, v3(x, -1.62, 0.75), pr(t, b1 + 0.3 + i * 0.12, 0.3)); });
    const ks = pr(t, b2 - 0.1, 0.4), sx = 1.45 * Math.sin(Math.max(0, t - b2) * 2.3);
    beam.visible = spot.visible = ks > 0; beam.material.opacity = 0.08 * ks; spot.material.opacity = 0.5 * ks; beam.position.x = spot.position.x = sx;
    B.forEach(({ b, x }) => { const near = cl(1 - Math.abs(sx - x) / 0.7) * ks; b.position.y = -1.3 + near * 0.12; });
    pop(you, t, b2 - 0.05, 0.5, 1);
    pop(q, t, b2 + 0.3, 0.5, 0.55); q.rotation.y = Math.sin(t * 2) * 0.5; q.position.y = -0.15 + Math.sin(t * 2.4) * 0.06;
  };
}

// ---------- S4: activity subject + the information in your documents
{ const g = root("s4"), id = "s4";
  const bc = group(g, [-1.0, -0.75, 0.3]); mesh(rbox(1.05, 0.72, 0.36, 0.08), M.emerald, bc); mesh(rbox(1.07, 0.06, 0.38, 0.02), M.gold, bc, [0, 0.12, 0]);
  mesh(new THREE.TorusGeometry(0.18, 0.04, 10, 28, Math.PI), M.gold, bc, [0, 0.36, 0]); mesh(rbox(0.16, 0.12, 0.05, 0.02), M.gold, bc, [0, 0.12, 0.19]);
  shadow(g, -1.0, -1.45, 0.3, 1.6, 0.8);
  const qa = qmark(g, M.gold, [-1.0, 0.55, 0.3], 0.75);
  const docs = [0.2, 0, -0.2].map((r, i) => { const d = sheet(g, 0.95, 1.25, 5); d.position.set(0.95 + (i - 1) * 0.28, -0.35 + i * 0.03, 0.1 + i * 0.12); d.rotation.set(-0.05, -0.15, r); return d; });
  const qb = qmark(g, M.goldSatin, [1.25, 0.75, 0.6], 0.5);
  const Lact = label("موضوع فعالیت", "gold"), Ldoc = label("اطلاعات مدارک", "gold");
  const sp = sparkles(g, [[-1.8, 1.2, 0.2], [0.2, 1.4, -0.3], [1.9, -1.1, 0.6]]);
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0;
    cam(v3(Math.sin(lt * 0.22) * 0.9, 2.2, 13.8 - lt * 0.2), v3(0, -0.15, 0));
    const kb = pop(bc, t, c(id, 0) + 0.05, 0.55, 1); bc.rotation.y = 0.25 + Math.sin(t * 1.1) * 0.12; lbl(Lact, bc, v3(0, -0.62, 0.3), cl(kb * 2 - 0.6));
    pop(qa, t, c(id, 1) - 0.05, 0.5, 0.75); qa.rotation.y = Math.sin(t * 1.6) * 0.45; qa.position.y = 0.55 + Math.sin(t * 2.2) * 0.07;
    docs.forEach((d, i) => { pop(d, t, c(id, 2) - 0.05 + i * 0.12, 0.5, 1); fillLines(d, eo(pr(t, c(id, 3) - 0.1 + i * 0.15, 0.9))); });
    lbl(Ldoc, docs[1], v3(0, -0.85, 0.1), pr(t, c(id, 2) + 0.35, 0.3));
    pop(qb, t, c(id, 3) + 0.1, 0.5, 0.5); qb.rotation.y = -Math.sin(t * 1.4) * 0.45; qb.position.y = 0.75 + Math.sin(t * 2) * 0.06;
    twinkle(sp, t, pr(t, t0, 0.5));
  };
}

// ---------- S5: tax and legal obligations ... and a thousand more questions
{ const g = root("s5"), id = "s5";
  const sc = group(g, [-0.85, -1.4, 0.2]); mesh(CYL, M.tile, sc, [0, 0.05, 0], [0.42, 0.1, 0.42]); mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 48), M.gold, sc, [0, 0.1, 0], 1, [Math.PI / 2, 0, 0]);
  mesh(CYL, M.gold, sc, [0, 0.95, 0], [0.05, 1.7, 0.05]); mesh(SPH, M.gold, sc, [0, 1.85, 0], 0.08);
  const beamG = group(sc, [0, 1.72, 0]); mesh(rbox(1.5, 0.06, 0.06, 0.03), M.gold, beamG);
  const pans = [-0.7, 0.7].map((x) => { const p = group(sc); mesh(CYL, M.gold, p, [0, 0, 0], [0.3, 0.035, 0.3]); [0, 2.1, 4.2].forEach((a) => mesh(CYL, M.goldSatin, p, [Math.cos(a) * 0.2, 0.32, Math.sin(a) * 0.2], [0.008, 0.66, 0.008], [Math.sin(a) * 0.29, 0, -Math.cos(a) * 0.29])); return { p, x }; });
  const pct = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#e9c46a"; x.fillRect(0, 0, w, h); x.fillStyle = "#06140d"; x.font = "900 170px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("%", w / 2, h / 2 + 8); });
  const rc = sheet(g, 0.95, 1.45, 6); rc.position.set(1.0, -0.35, 0.0); rc.rotation.set(-0.05, -0.2, -0.06);
  const coin = medallion(g, 0.32, std({ map: pct, metalness: 0.6, roughness: 0.35 }), [1.35, -0.95, 0.55]);
  const Llaw = label("قانونی", "gold"), Ltax = label("مالیاتی", "gold");
  const swarm = group(g), Q = [];
  for (let i = 0; i < 70; i++) { const th = hash(i + 101) * 6.283, ph = Math.acos(2 * hash(i + 202) - 1), r = 1.3 + hash(i + 303) * 1.9;
    const m = qmark(swarm, [M.gold, M.goldSatin, M.cream, M.copper][i % 4], [0, 0, 0], 1); Q.push({ m, to: v3(Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r * 0.95, Math.sin(ph) * Math.sin(th) * r * 0.6), s: 0.22 + hash(i + 404) * 0.25, d: hash(i + 505) * 0.5 }); }
  const L1000 = label("+۱۰۰۰ سؤال", "gold");
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b2 = c(id, 2), out = eio(pr(t, b2 - 0.1, 0.45));
    cam(v3(Math.sin(lt * 0.2) * 0.8, 2.2, 13.8 - lt * 0.25), v3(0, -0.05, 0));
    const ks = pop(sc, t, c(id, 0) + 0.05, 0.55, 1 - 0.999 * out); const tilt = Math.sin(t * 1.7) * 0.13; beamG.rotation.z = tilt;
    pans.forEach(({ p, x }) => { p.position.set(x * Math.cos(tilt), 1.72 + x * Math.sin(tilt) - 0.66, 0); });
    lbl(Llaw, sc, v3(0, 2.15, 0), cl(ks * 2 - 0.6) * (1 - out));
    const kr = pop(rc, t, c(id, 0) + 0.35, 0.55, 1 - 0.999 * out); fillLines(rc, eo(pr(t, c(id, 0) + 0.6, 1.0)));
    pop(coin, t, c(id, 0) + 0.6, 0.5, 1 - 0.999 * out); coin.rotation.y = Math.sin(t * 1.8) * 0.6;
    lbl(Ltax, rc, v3(0, 0.95, 0.1), cl(kr * 2 - 0.6) * (1 - out));
    swarm.rotation.y = Math.max(0, t - b2) * 0.25;
    Q.forEach(({ m, to, s, d }, i) => { const k = pr(t, b2 + d * 0.6, 0.7); m.visible = k > 0; if (!m.visible) return; const e = eo(k);
      m.position.set(to.x * e, to.y * e + Math.sin(t * 2 + i) * 0.05, to.z * e); m.scale.setScalar(Math.max(1e-4, s * eb(cl(k * 1.6)))); m.rotation.set(Math.sin(t + i) * 0.3, Math.sin(t * 1.5 + i) * 0.6, Math.sin(t * 1.3 + i) * 0.25); });
    lbl(L1000, g, v3(0, -0.2, 2.6), pr(t, b2 + 0.5, 0.35));
  };
}

// ---------- S6: one wrong choice -> a chain of bigger and bigger trouble (dominoes)
{ const g = root("s6"), id = "s6";
  const N = 6, D = [];
  for (let i = 0; i < N; i++) {
    const s = 0.42 * Math.pow(1.4, i), x = -1.5 + i * 0.5 + i * i * 0.02, z = 1.3 - i * 0.62;
    const nx = -1.5 + (i + 1) * 0.5 + (i + 1) * (i + 1) * 0.02, nz = 1.3 - (i + 1) * 0.62, yaw = -Math.atan2(nz - z, nx - x);
    const th = 0.15 * s, h = s, w = 0.5 * s;
    const piv = group(g, [x, -1.45, z]); piv.rotation.y = yaw; const body = group(piv, [0, 0, 0]);
    mesh(rbox(th, h, w, 0.03 * s), i ? M.cream : COPPER_GLOW, body, [-th / 2, h / 2, 0]);
    mesh(rbox(th * 1.02, 0.02 * s + 0.01, w * 0.8, 0.005), M.gold, body, [-th / 2, h / 2, 0]);
    [-1, 1].forEach((side) => { const fx = -th / 2 + side * (th / 2 + 0.004); [[0.25, 0.18], [0.25, -0.18], [0.75, 0], [0.62, 0.18], [0.88, -0.18]].slice(0, 2 + (i % 3)).forEach(([py, pz]) => mesh(SPH, i ? M.dark : M.cream, body, [fx, h * py, w * pz], [0.012, 0.05 * s, 0.05 * s])); });
    D.push({ piv, body, s, h, last: i === N - 1 });
  }
  const xw = xCopper(g, [-1.5, -0.6, 1.3], 0.32);
  const dust = ring(g, RING_M), dust2 = ring(g, RING_M);
  const Lone = label("یه انتخاب", "copper"), Lbig = label("دردسر بزرگ", "warn");
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b1 = c(id, 1), b2 = c(id, 2);
    let tEnd = b2; D.forEach((d, i) => { d.t = b2 + 0.1 + i * 0.22; tEnd = d.t + 0.42; });
    cam(v3(0.9 + Math.sin(lt * 0.2) * 0.6 + shake(t, tEnd, 0.1), 2.4 + shake(t, tEnd, 0.07), 13.4 - lt * 0.2), v3(0.1, -0.35, -0.3));
    D.forEach((d, i) => { const kin = pr(t, t0 + 0.05 + i * 0.07, 0.5); d.piv.visible = kin > 0; d.piv.scale.setScalar(Math.max(1e-4, eb(kin)));
      const kf = pr(t, d.t, 0.42); d.body.rotation.z = -(d.last ? 1.5 : 0.95) * kf * kf; });
    D[0].piv.position.y = -1.45 + Math.max(0, Math.sin((t - c(id, 0)) * 6)) * 0.08 * pr(t, c(id, 0), 0.2) * (1 - pr(t, b2, 0.1));
    pop(xw, t, b1 + 0.1, 0.45, 1); xw.visible = xw.visible && t < b2 + 0.1; xw.position.y = -0.55 + Math.sin(t * 3) * 0.05;
    lbl(Lone, D[0].piv, v3(0, 0.9, 0), pr(t, c(id, 0) + 0.2, 0.3) * (1 - pr(t, b2, 0.25)));
    [dust, dust2].forEach((r, i) => { const k = pr(t, tEnd + i * 0.12, 0.8); r.visible = k > 0 && k < 1; r.position.set(1.0, -1.43, -1.8); r.scale.setScalar(0.4 + 2.4 * eo(k)); r.material.opacity = 1 - k; });
    lbl(Lbig, g, v3(0.9, 1.1, -1.6), pr(t, tEnd, 0.3));
  };
}

// ---------- S7: legal penalties (gavel)
{ const g = root("s7"), id = "s7";
  const blk = group(g, [0, -1.45, 0.6]); mesh(CYL, M.emeraldDeep, blk, [0, 0.08, 0], [0.55, 0.16, 0.55]); mesh(new THREE.TorusGeometry(0.55, 0.025, 8, 48), M.gold, blk, [0, 0.16, 0], 1, [Math.PI / 2, 0, 0]); shadow(blk, 0, 0, 0, 1.8);
  const gv = gavel(g, [-1.05, -0.99, 0.6]);
  const ticket = group(g, [0, -1.25, 0.6]); mesh(rbox(1.1, 0.02, 0.64, 0.04), COPPER_GLOW, ticket, [0, -0.012, 0]); mesh(rbox(1.02, 0.03, 0.56, 0.03), PAPER, ticket);
  const coins = [0, 1, 2, 3, 4].map((i) => ({ m: mesh(COIN, M.gold, g), a: i * 1.25 + 0.4, sp: 1.2 + hash(i + 7) * 0.8 }));
  const rings = [ring(g, RING_C), ring(g, RING_M), ring(g, RING_C)];
  const Lfine = label("جریمه‌ی قانونی", "copper");
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b1 = c(id, 1), hit = b1 + 0.05;
    cam(v3(Math.sin(lt * 0.25) * 0.7 + shake(t, hit, 0.1), 2.0 + shake(t, hit, 0.08), 10.4 - lt * 0.2), v3(0, -0.75, 0.3));
    pop(blk, t, t0 + 0.05, 0.5, 1); pop(gv, t, t0 + 0.15, 0.5, 1);
    const up = eio(pr(t, t0 + 0.3, 0.8)) * 0.95, down = pr(t, hit - 0.16, 0.16);
    gv.rotation.z = t < hit - 0.16 ? up + Math.sin(t * 3) * 0.04 : (t < hit ? lerp(0.95, 0, down * down) : Math.abs(Math.sin((t - hit) * 14)) * 0.14 * Math.exp(-(t - hit) * 6));
    rings.forEach((r, i) => { const k = pr(t, hit + i * 0.1, 0.75); r.visible = k > 0 && k < 1; r.position.set(0, -1.43, 0.6); r.scale.setScalar(0.5 + 2.2 * eo(k)); r.material.opacity = 1 - k; });
    const kt = eo(pr(t, hit + 0.05, 0.6)); ticket.visible = kt > 0; ticket.position.set(lerp(0, 0.35, kt), -1.25 + kt * 0.02, lerp(0.6, 1.9, kt)); ticket.rotation.set(-1.2 * kt, 0.3 * kt, -0.15 * kt);
    lbl(Lfine, ticket, v3(0, 0.03, 0), cl(kt * 2 - 0.8));
    coins.forEach(({ m, a, sp }) => { const k = Math.max(0, t - hit); m.visible = t > hit && k < 1.6; if (!m.visible) return; m.position.set(Math.cos(a) * k * sp, -1.2 + k * 2.4 - k * k * 2.6, 0.6 + Math.sin(a) * k * sp * 0.7); m.rotation.set(k * 6, k * 4, 0); });
  };
}

// ---------- S8: the path is clear -> official registration at the Ministry of Justice registry
{ const g = root("s8"), id = "s8";
  const base = group(g, [0, -1.45, 0]);
  const curve = new THREE.CatmullRomCurve3([v3(0.2, 0, 3.2), v3(-1.0, 0, 1.9), v3(0.9, 0, 0.5), v3(-0.6, 0, -0.8), v3(0, 0, -1.9)]);
  const road = ribbon(curve, 0.62, 140, ROAD, base, 0.01), gold = ribbon(curve, 0.16, 140, GOLD_ROAD, base, 0.025);
  const pins = [0.28, 0.55, 0.8].map((u, i) => { const p = curve.getPointAt(u), pin = group(base, [p.x + 0.42, 0, p.z]); mesh(CYL, M.gold, pin, [0, 0.3, 0], [0.025, 0.6, 0.025]); medallion(pin, 0.16, M.emerald, [0, 0.72, 0]); return { pin, L: label(["۱", "۲", "۳"][i], "gold") }; });
  const orb = group(base); mesh(SPH, M.glow, orb, [0, 0, 0], 0.12); orb.add(new THREE.PointLight(0xffd37a, 3, 3, 1.5));
  const mn = ministry(base, [0, 0, -2.9]); const ok = check(base, [-0.85, 2.3, -2.6], 0.22);
  const Lorg = label("سازمان ثبت اشخاص حقوقی", "gold");
  const sp = sparkles(base, [[-1.6, 2.6, -2.6], [1.7, 1.9, -2.2], [-1.2, 1.2, -1.6]]);
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b1 = c(id, 1), b2 = c(id, 2), mv = eio(pr(t, b2 - 0.2, 1.4));
    cam(v3(Math.sin(lt * 0.15) * 0.8, lerp(6.2, 3.4, mv), lerp(11.2, 8.4, mv)), v3(0, lerp(-0.9, 0.15, mv), lerp(-0.6, -2.2, mv)));
    const kr = pr(t, t0 + 0.05, 0.8); drawRibbon(road, eo(kr));
    const kg = eio(pr(t, b1 - 0.1, 1.6)); drawRibbon(gold, kg); orb.visible = kg > 0 && kg < 1; if (orb.visible) { orb.position.copy(curve.getPointAt(kg)); orb.position.y = 0.15; }
    pins.forEach(({ pin, L }, i) => { const k = pop(pin, t, b1 + 0.15 + i * 0.45, 0.45, 1); lbl(L, pin, v3(0, 0.72, 0.1), cl(k * 2 - 0.6)); });
    const kb = pr(t, b2 - 0.15, 0.7); mn.visible = kb > 0; mn.scale.set(1, Math.max(1e-3, eb(kb)), 1); waveCloth(mn, t);
    lbl(Lorg, mn, v3(0, 1.55, 0.72), pr(t, c(id, 3) - 0.05, 0.3));
    pop(ok, t, c(id, 4) + 0.35, 0.45, 1); ok.rotation.y = Math.sin(t * 2) * 0.35;
    twinkle(sp, t, pr(t, b2, 0.5));
  };
}

// ---------- S9: not "fast registration": first company, activity, structure
{ const g = root("s9"), id = "s9";
  const sw = group(g, [0, 0.15, 0.3]); mesh(new THREE.TorusGeometry(0.85, 0.09, 16, 64), M.gold, sw); mesh(CYL, M.cream, sw, [0, 0, -0.03], [0.82, 0.06, 0.82], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; mesh(rbox(0.04, i % 3 ? 0.08 : 0.15, 0.02, 0.01), M.dark, sw, [Math.sin(a) * 0.68, Math.cos(a) * 0.68, 0.01], 1, [0, 0, -a]); }
  mesh(CYL, M.gold, sw, [0, 1.0, 0], [0.09, 0.22, 0.09]); mesh(rbox(0.3, 0.1, 0.12, 0.04), M.gold, sw, [0, 1.15, 0]);
  const hand = group(sw, [0, 0, 0.03]); mesh(rbox(0.05, 0.62, 0.02, 0.02), M.copper, hand, [0, 0.27, 0]); mesh(CYL, M.copper, sw, [0, 0, 0.04], [0.07, 0.03, 0.07], [Math.PI / 2, 0, 0]);
  const xs = xCopper(g, [0, 0.15, 0.75], 0.75);
  const blocks = [[2.1, 0.5, 1.0, "شرکت"], [1.65, 0.5, 0.85, "فعالیت"], [1.2, 0.5, 0.7, "ساختار"]].map(([w, h, d, s], i) => {
    const b = group(g); mesh(rbox(w, h, d, 0.06), i === 1 ? M.emeraldDeep : M.emerald, b); mesh(rbox(w + 0.02, 0.05, d + 0.02, 0.02), M.gold, b, [0, h / 2 - 0.02, 0]);
    return { b, y: -1.2 + i * 0.52, d, L: label(s) }; });
  const star = mesh(extrude(starShape(5, 0.34, 0.15), 0.1, 0.03), M.gold, g, [0, 0.58, 0]);
  const sp = sparkles(g, [[-1.3, 0.9, 0.4], [1.3, 0.6, 0.3], [0.9, 1.5, -0.2], [-0.8, 1.6, -0.3]]);
  const Lfast = label("ثبت سریع", "warn");
  SC[id].update = (t) => {
    const t0 = S[id].t0, lt = t - t0, b1 = c(id, 1), b2 = c(id, 2), b3 = c(id, 3), b4 = c(id, 4), b5 = c(id, 5);
    cam(v3(Math.sin(lt * 0.18) * 1.0, 2.2, 13.6 - lt * 0.12), v3(0, -0.1, 0));
    const gone = eio(pr(t, b2 - 0.1, 0.45));
    const ks = pop(sw, t, t0 + 0.05, 0.55, 1 - 0.999 * gone); hand.rotation.z = -t * 9; sw.position.x = Math.sin(t * 40) * 0.015 * (1 - gone); sw.position.y = 0.15 + gone * 1.2;
    lbl(Lfast, sw, v3(0, -1.15, 0.1), cl(ks * 2 - 0.6) * (1 - gone));
    pop(xs, t, at(id, 1, 0.45), 0.45, 1 - 0.999 * gone);
    const drops = [b3, at(id, 3, 0.55), b4];
    blocks.forEach(({ b, y, d, L }, i) => { const k = pr(t, drops[i] - 0.1, 0.55); b.visible = k > 0; b.position.set(0, y + (1 - ebn(k)) * 3.2, 0); b.rotation.y = Math.sin(t * 0.6) * 0.15;
      lbl(L, b, v3(0, 0, d / 2 + 0.05), pr(t, drops[i] + 0.25, 0.3)); L.d.classList.toggle("gold", t > b5); });
    const kst = pop(star, t, b5 - 0.05, 0.55, 1); star.rotation.y = Math.sin(t * 1.5) * 0.5; star.position.y = 0.6 + Math.sin(t * 2) * 0.05;
    twinkle(sp, t, kst);
  };
}
// ---------- S10: CTA backdrop: floating gold coins and hearts
{ const g = root("s10"), id = "s10";
  const heart = (() => { const s = new THREE.Shape(); s.moveTo(0, -0.35); s.bezierCurveTo(-0.55, 0.0, -0.45, 0.5, 0, 0.25); s.bezierCurveTo(0.45, 0.5, 0.55, 0.0, 0, -0.35); return extrude(s, 0.12, 0.04); })();
  const coinM = std({ color: 0xc99a48, metalness: 1, roughness: 0.48 }); const coins = []; for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1; coins.push({ m: mesh(COIN, coinM, g), x: side * (1.75 + hash(i) * 0.5), y0: hash(i + 11) * 4 - 2, z: -1.5 - hash(i + 3) * 1.8, sp: 0.18 + hash(i + 5) * 0.15 }); }
  const hearts = []; for (let i = 0; i < 10; i++) hearts.push({ m: mesh(heart, i % 3 ? M.copper : M.gold, g), x: (hash(i + 21) - 0.5) * 3.4, z: 0.3 + hash(i + 23) * 0.8, d: i * 0.18 });
  SC[id].update = (t) => {
    const lt = t - S[id].t0, endVO = S[id].end;
    cam(v3(0, 0.6, 15), v3(0, 0, 0)); floor.visible = false;
    coins.forEach((o, i) => { o.m.visible = true; o.m.position.set(o.x, ((o.y0 + lt * o.sp + 2.2) % 4.4) - 2.2, o.z); o.m.rotation.set(1.2 + Math.sin(t + i) * 0.3, t * (0.8 + i * 0.05), 0); o.m.scale.setScalar(Math.max(1e-4, eo(pr(t, S[id].t0 + i * 0.08, 0.6)) * 0.7)); });
    hearts.forEach((h, i) => { const k = pr(t, endVO - 0.4 + h.d, 2.2); h.m.visible = k > 0 && k < 1; if (h.m.visible) { h.m.position.set(h.x + Math.sin(k * 6 + i) * 0.12, lerp(-1.4, 2.4, eo(k)), h.z); h.m.rotation.set(0, Math.sin(t * 2 + i) * 0.6, Math.sin(t + i) * 0.2); h.m.scale.setScalar(Math.max(1e-4, (k < 0.15 ? k / 0.15 : 1 - Math.max(0, k - 0.75) / 0.25) * 0.5)); } });
  };
}

// ---------------------------------------------------------------- frame
const order = T.scenes.map((s) => s.id);
window.__world = { scene, camera, SC, THREE };
export function frame(t) {
  let active = order[0]; for (const id of order) if (t >= S[id].t0) active = id;
  floor.visible = true; labels.forEach((L) => (L.o = 0));
  for (const id of order) SC[id].g.visible = id === active;
  const s = S[active], ex = pr(t, s.next - 0.3, 0.3);
  SC[active].g.scale.setScalar(1 - 0.12 * eio(ex)); SC[active].g.position.y = 0.35 * eio(ex);
  SC[active].update(t); updateDust(t);
  composer.render(); placeLabels();
}
