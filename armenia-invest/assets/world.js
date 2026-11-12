// Armenia investment film: the Three.js world. Everything here is a pure function of film time `t`
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

// ---------------------------------------------------------------- animals and objects (primitives, cream clay + gold)
function cow(parent) { const g = group(parent);
  mesh(new THREE.CapsuleGeometry(0.2, 0.42, 8, 20), M.cream, g, [0, 0.46, 0], 1, [0, 0, Math.PI / 2]);
  [[-0.1, 0.56, 0.16, 0.09], [0.12, 0.42, 0.18, 0.07], [-0.24, 0.4, -0.17, 0.08], [0.08, 0.6, -0.17, 0.07]].forEach(([x, y, z, r]) => mesh(SPH, M.dark, g, [x, y, z], [r, r, r * 0.45]));
  [[-0.2, 0.1], [-0.2, -0.1], [0.18, 0.1], [0.18, -0.1]].forEach(([x, z]) => { mesh(CYL, M.cream, g, [x, 0.17, z], [0.05, 0.3, 0.05]); mesh(CYL, M.dark, g, [x, 0.03, z], [0.052, 0.05, 0.052]); });
  mesh(rbox(0.27, 0.27, 0.27, 0.08), M.cream, g, [0.42, 0.6, 0]); mesh(rbox(0.16, 0.14, 0.24, 0.06), M.copperMatte, g, [0.55, 0.52, 0]);
  [-1, 1].forEach((s) => { mesh(CONE, M.gold, g, [0.42, 0.8, s * 0.1], [0.03, 0.12, 0.03], [s * 0.5, 0, 0]); mesh(SPH, M.cream, g, [0.4, 0.68, s * 0.17], [0.05, 0.035, 0.08]); mesh(SPH, M.dark, g, [0.55, 0.65, s * 0.07], 0.028); });
  mesh(CYL, M.cream, g, [-0.43, 0.42, 0], [0.018, 0.3, 0.018], [0, 0, -0.5]); return g; }
function sheep(parent) { const g = group(parent);
  [[-0.13, 0.13, 0.08], [-0.13, 0.13, -0.08], [0.12, 0.13, 0.08], [0.12, 0.13, -0.08]].forEach(([x, y, z]) => mesh(CYL, M.dark, g, [x, y, z], [0.035, 0.28, 0.035]));
  [[-0.18, 0.48, 0, 0.17], [0, 0.56, 0, 0.18], [0.16, 0.5, 0, 0.16], [-0.06, 0.42, 0.11, 0.16], [0.06, 0.42, -0.11, 0.16], [-0.08, 0.5, -0.12, 0.15], [0.08, 0.5, 0.12, 0.15], [-0.28, 0.44, 0, 0.12]].forEach(([x, y, z, r]) => mesh(SPH, M.cream, g, [x, y, z], r));
  mesh(SPH, M.dark, g, [0.33, 0.54, 0], [0.12, 0.15, 0.11]); mesh(SPH, M.cream, g, [0.31, 0.68, 0], 0.075);
  [-1, 1].forEach((s) => { mesh(SPH, M.dark, g, [0.28, 0.6, s * 0.14], [0.04, 0.025, 0.08], [s * 0.4, 0, 0]); mesh(SPH, M.cream, g, [0.42, 0.57, s * 0.055], 0.022); }); return g; }
function hen(parent) { const g = group(parent);
  [-1, 1].forEach((s) => { mesh(CYL, M.gold, g, [0.02, 0.11, s * 0.06], [0.015, 0.2, 0.015]); mesh(SPH, M.sage, g, [-0.02, 0.42, s * 0.19], [0.17, 0.11, 0.04], [0, 0, -0.3]); mesh(SPH, M.dark, g, [0.28, 0.7, s * 0.07], 0.022); });
  mesh(SPH, M.cream, g, [0, 0.42, 0], [0.27, 0.24, 0.21]); mesh(SPH, M.cream, g, [0.2, 0.67, 0], 0.13);
  [[0.15, 0.82], [0.21, 0.84], [0.27, 0.81]].forEach(([x, y]) => mesh(SPH, M.copperMatte, g, [x, y, 0], 0.045));
  mesh(CONE, M.gold, g, [0.35, 0.66, 0], [0.04, 0.1, 0.04], [0, 0, -Math.PI / 2]); mesh(SPH, M.copperMatte, g, [0.3, 0.58, 0], [0.03, 0.05, 0.03]);
  [-0.5, 0, 0.5].forEach((a) => mesh(CONE, M.sage, g, [-0.27, 0.56, a * 0.08], [0.06, 0.24, 0.025], [a * 0.4, 0, 0.75])); return g; }
function duck(parent) { const g = group(parent);
  mesh(SPH, M.cream, g, [0, 0.3, 0], [0.32, 0.19, 0.21]); mesh(CONE, M.cream, g, [-0.32, 0.38, 0], [0.09, 0.2, 0.08], [0, 0, 1.1]);
  mesh(CYL, M.cream, g, [0.18, 0.48, 0], [0.07, 0.24, 0.07]); mesh(SPH, M.cream, g, [0.2, 0.64, 0], 0.12);
  mesh(SPH, M.gold, g, [0.33, 0.61, 0], [0.11, 0.032, 0.06]);
  [-1, 1].forEach((s) => { mesh(SPH, M.sage, g, [-0.03, 0.34, s * 0.19], [0.2, 0.1, 0.04], [0, 0, 0.2]); mesh(SPH, M.dark, g, [0.27, 0.67, s * 0.07], 0.022); });
  mesh(new THREE.TorusGeometry(0.42, 0.012, 8, 48), M.goldSatin, g, [0, 0.12, 0], [1, 1, 0.5], [Math.PI / 2, 0, 0]); return g; }
function fish(parent, scale = 1) { const g = group(parent); const body = group(g); body.scale.setScalar(scale);
  mesh(SPH, M.silver, body, [0, 0, 0], [0.92, 0.3, 0.2]); mesh(SPH, M.sage, body, [0.02, 0.1, 0], [0.86, 0.19, 0.185]);
  mesh(SPH, std({ color: 0xe48a6a, emissive: 0x6a2a16, roughness: 0.4 }), body, [0.0, -0.02, 0], [0.8, 0.075, 0.205]);
  for (let i = 0; i < 12; i++) mesh(SPH, M.dark, body, [-0.45 + i * 0.09, 0.1 + (i % 3) * 0.035, (i % 2 ? 1 : -1) * 0.17], 0.018);
  [-1, 1].forEach((s) => { mesh(SPH, M.dark, body, [-0.7, 0.04, s * 0.13], 0.045); mesh(SPH, M.glow, body, [-0.72, 0.055, s * 0.165], 0.012); });
  const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(0.42, 0.3); finShape.quadraticCurveTo(0.3, 0, 0.42, -0.3); finShape.lineTo(0, 0);
  const tail = group(body, [0.82, 0, 0]); mesh(new THREE.ShapeGeometry(finShape), phys({ color: 0xd8dccf, roughness: 0.4, side: THREE.DoubleSide }), tail);
  const dorsal = new THREE.Shape(); dorsal.moveTo(-0.2, 0); dorsal.quadraticCurveTo(0, 0.26, 0.2, 0.02); dorsal.lineTo(-0.2, 0);
  mesh(new THREE.ShapeGeometry(dorsal), phys({ color: 0x9fb8a2, roughness: 0.5, side: THREE.DoubleSide }), body, [0.05, 0.26, 0]);
  g.userData.tail = tail; return g; }
function truck(parent) { const g = group(parent);
  mesh(rbox(1.0, 0.62, 0.6, 0.06), M.emerald, g, [0.25, 0.47, 0]); mesh(rbox(1.02, 0.05, 0.62, 0.02), M.gold, g, [0.25, 0.8, 0]);
  mesh(rbox(0.44, 0.5, 0.58, 0.08), M.cream, g, [-0.52, 0.38, 0]); mesh(rbox(0.05, 0.22, 0.5, 0.02), M.dark, g, [-0.74, 0.47, 0]);
  [-0.52, 0.05, 0.48].forEach((x) => [-1, 1].forEach((s) => { mesh(CYL, M.dark, g, [x, 0.14, s * 0.3], [0.14, 0.1, 0.14], [Math.PI / 2, 0, 0]); mesh(CYL, M.gold, g, [x, 0.14, s * 0.355], [0.06, 0.02, 0.06], [Math.PI / 2, 0, 0]); }));
  return g; }
function shop(parent) { const g = group(parent);
  mesh(rbox(0.9, 0.55, 0.6, 0.05), M.cream, g, [0, 0.28, 0]); mesh(rbox(0.22, 0.32, 0.04, 0.02), M.emerald, g, [0, 0.17, 0.31]);
  mesh(rbox(0.2, 0.16, 0.03, 0.02), M.dark, g, [0.27, 0.34, 0.31]); mesh(rbox(0.2, 0.16, 0.03, 0.02), M.dark, g, [-0.27, 0.34, 0.31]);
  for (let i = 0; i < 6; i++) mesh(rbox(0.16, 0.05, 0.3, 0.02), i % 2 ? M.cream : M.emerald, g, [-0.4 + i * 0.16, 0.62, 0.26], 1, [0.45, 0, 0]);
  mesh(rbox(0.98, 0.06, 0.66, 0.02), M.gold, g, [0, 0.58, 0]); return g; }
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

// ================================================================= scenes
const SC = {};
const root = (id) => { const g = group(scene); g.visible = false; SC[id] = { g }; return g; };

// ---------- S1: gold & dollar -> limited profit -> steady dollar income
{ const g = root("s1"), id = "s1";
  const barGeo = (() => { const geo = new RoundedBoxGeometry(0.95, 0.34, 0.5, 4, 0.05); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.78); p.setZ(i, p.getZ(i) * 0.8); } geo.computeVertexNormals(); return geo; })();
  const bars = group(g, [-1.05, -1.1, 0.3]); const B = [[-0.5, 0.17, 0], [0.5, 0.17, 0], [0, 0.51, 0]].map((p) => mesh(barGeo, M.gold, bars, p)); shadow(bars, 0, -0.01, 0, 2.4, 1.3);
  const billTex = canvasTex(512, 240, (x, w, h) => { x.fillStyle = "#2f8a5c"; x.fillRect(0, 0, w, h); x.strokeStyle = "#e9c46a"; x.lineWidth = 8; x.strokeRect(18, 18, w - 36, h - 36); x.lineWidth = 3; x.strokeRect(34, 34, w - 68, h - 68); x.fillStyle = "#0b2017"; x.beginPath(); x.arc(w / 2, h / 2, 74, 0, 7); x.fill(); x.fillStyle = "#f0c76e"; x.font = "900 110px Vazirmatn, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("$", w / 2, h / 2 + 6); [[70, 70], [w - 70, h - 70]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 18, 0, 7); x.fill(); }); });
  const bill = group(g, [1.05, 0.15, 0.4]); mesh(rbox(1.55, 0.72, 0.04, 0.03), M.emeraldDeep, bill); mesh(new THREE.PlaneGeometry(1.5, 0.7), std({ map: billTex, roughness: 0.55 }), bill, [0, 0, 0.022]);
  const zig = tube([[-2.1, 0.0, -0.8], [-1.6, 0.9, -0.8], [-1.1, 0.1, -0.8], [-0.55, 1.15, -0.8], [0.0, 0.25, -0.8], [0.6, 1.3, -0.8], [1.15, 0.35, -0.8], [1.7, 1.05, -0.8], [2.2, 0.55, -0.8]], 0.035, M.sage, g, 160, 0.05);
  const lid = group(g, [0, 3, 0]); mesh(rbox(4.3, 0.09, 1.6, 0.04), glass(0.28, 0xfff4da), lid); [-0.82, 0.82].forEach((z) => mesh(rbox(4.3, 0.1, 0.06, 0.03), M.gold, lid, [0, 0, z])); [-2.15, 2.15].forEach((x) => mesh(rbox(0.06, 0.1, 1.6, 0.03), M.gold, lid, [x, 0, 0]));
  const capL = label("سقف سود", "warn");
  const stacks = [-1.6, -0.8, 0, 0.8, 1.6].map((x, k) => coinStack(g, k + 2, x, -1.35, 0.2)); const stShadow = shadow(g, 0, -1.35, 0.2, 4.6, 1.4);
  const rise = tube([[-1.95, -0.85, 0.75], [-0.9, -0.45, 0.75], [0.15, 0.05, 0.75], [1.15, 0.62, 0.75], [1.95, 1.25, 0.75]], 0.055, M.gold, g, 140);
  const head = arrowHead(g, M.gold, 0.13); const glowSp = sparkles(g, [[-1.9, 1.2, 0.8], [1.95, -0.2, 0.9], [0.4, 1.45, 0.6], [-0.6, 0.6, 1.2]]);
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b2 = c(id, 2), b3 = c(id, 3);
    cam(v3(Math.sin(lt * 0.12) * 1.2, 2.3, 15.2 - lt * 0.12), v3(0, 0.05, 0));
    const out = pr(t, b3 - 0.15, 0.35); const k1 = pr(t, c(id, 1) - 0.2, 0.6);
    B.forEach((m, i) => { const k = pr(t, c(id, 1) - 0.2 + i * 0.12, 0.5); m.visible = k > 0 && out < 1; m.scale.setScalar(Math.max(1e-4, eb(k) * (1 - out))); m.position.y = (i < 2 ? 0.17 : 0.51) + Math.sin(t * 3.2 + i) * 0.05 * k1 * (1 - pr(t, b2, 0.4)); });
    const kb = pr(t, c(id, 1) + 0.25, 0.6); bill.visible = kb > 0 && out < 1; bill.scale.setScalar(Math.max(1e-4, eb(kb) * (1 - out)));
    bill.rotation.set(-0.15 + Math.sin(t * 2.1) * 0.12, -0.35 + Math.sin(t * 1.3) * 0.25, 0.1 + Math.sin(t * 2.6) * 0.08); bill.position.y = 0.15 + Math.sin(t * 2.4) * 0.12;
    drawTube(zig, eo(pr(t, c(id, 0), 1.6)) * (1 - out)); zig.scale.y = lerp(1, 0.42, eio(pr(t, b2 + 0.25, 0.5))); zig.position.y = lerp(0, -0.35, eio(pr(t, b2 + 0.25, 0.5)));
    const kl = pr(t, b2, 0.8); lid.visible = kl > 0 && out < 1; lid.position.y = lerp(3.2, 0.95, ebn(kl)); lid.scale.setScalar(Math.max(1e-4, 1 - out));
    lbl(capL, lid, v3(1.35, 0.32, 0.8), cl((kl - 0.6) / 0.3) * (1 - out));
    stacks.forEach((st, k) => st.userData.coins.forEach((cn, j) => { const kk = pr(t, b3 + 0.05 + k * 0.14 + j * 0.05, 0.4); cn.visible = kk > 0; cn.position.y = 0.045 + j * 0.095 + (1 - ebn(kk)) * 1.6; }));
    stShadow.visible = t > b3; const kr = eo(pr(t, b3 + 0.5, 1.1)); drawTube(rise, kr); head.visible = kr > 0.02; if (head.visible) placeHead(head, rise.userData.curve, kr);
    glowSp.forEach((m) => (m.visible = t > b3 + 1.3)); twinkle(glowSp, t, pr(t, b3 + 1.3, 0.4));
  };
}

// ---------- S2: livestock around an Armenia map pin
{ const g = root("s2"), id = "s2";
  const pin = group(g, [0, -0.25, 0.2]);
  const pinGeo = new THREE.LatheGeometry([[0, -0.95], [0.08, -0.72], [0.26, -0.35], [0.46, 0.0], [0.56, 0.3], [0.55, 0.55], [0.46, 0.8], [0.28, 0.97], [0, 1.03]].map(([x, y]) => new THREE.Vector2(x, y)), 64);
  mesh(pinGeo, M.cream, pin); medallion(pin, 0.36, std({ map: flagTex, roughness: 0.5 }), [0, 0.45, 0.52]); shadow(pin, 0, -1.0, 0, 1.4, 0.8);
  const orbit = group(g, [0, -0.25, 0]); const dots = []; for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; dots.push(mesh(SPH, M.goldSatin, orbit, [Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75], 0.025)); } orbit.rotation.x = 0.18;
  const spots = [[1.25, 0.55, -0.3, cow, "گاو"], [-1.25, 0.55, -0.3, sheep, "گوسفند"], [1.25, -1.0, 0.5, hen, "مرغ"], [-1.25, -1.0, 0.5, duck, "سایر پرندگان"]];
  const P = spots.map(([x, y, z, make, name]) => { const p = pedestal(g, [x, y, z], 0.48); const a = make(p); a.scale.setScalar(0.95); a.position.y = 0.0; a.rotation.y = x > 0 ? -0.6 : -2.55; return { p, a, L: label(name) }; });
  const armL = label("ارمنستان", "gold");
  SC[id].update = (t) => {
    const lt = t - S[id].t0; cam(v3(Math.sin(lt * 0.1) * 1.6, 2.6, 15.0), v3(0, -0.2, 0));
    const kp = pr(t, S[id].t0 + 0.05, 0.8); pin.visible = kp > 0; pin.position.y = -0.25 + (1 - ebn(kp)) * 2.5 + Math.sin(t * 1.8) * 0.04; pin.rotation.y = Math.sin(t * 0.9) * 0.35;
    orbit.visible = true; orbit.rotation.y = t * 0.25; orbit.scale.setScalar(Math.max(1e-4, eo(pr(t, S[id].t0, 0.7))));
    const times = [at(id, 0, 0.3), at(id, 0, 0.52), at(id, 0, 0.74), at(id, 1, 0.1)];
    P.forEach(({ p, a, L }, i) => { const k = pop(p, t, times[i], 0.55); a.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.04 * k; lbl(L, p, v3(0, -0.34, 0.5), cl((k - 0.5) * 2)); });
    lbl(armL, pin, v3(0, -1.2, 0.3), cl(pr(t, at(id, 1, 0.5), 0.3)));
  };
}

// ---------- S3: big land + affordable feed -> attractive opportunity
{ const g = root("s3"), id = "s3";
  const land = group(g, [0, -1.0, 0]); const landIn = group(land); landIn.rotation.y = -0.32;
  mesh(rbox(3.7, 0.12, 2.5, 0.05), M.gold, landIn, [0, -0.06, 0]); mesh(rbox(3.6, 0.22, 2.4, 0.06), M.tile, landIn, [0, 0.06, 0]);
  for (let i = 0; i < 8; i++) mesh(rbox(3.3, 0.08, 0.2, 0.04), i % 2 ? M.emeraldDeep : M.emerald, landIn, [0, 0.2, -1.0 + i * 0.285]);
  [[-1.5, -0.95], [-1.2, -1.0], [1.45, -0.98]].forEach(([x, z], i) => { mesh(CYL, M.sage, landIn, [x, 0.38, z], [0.04, 0.3, 0.04]); mesh(SPH, M.emerald, landIn, [x, 0.62 + i * 0.03, z], 0.2 + i * 0.03); });
  shadow(land, 0, -0.12, 0, 5.2, 3.6);
  const dimA = group(g, [0, -0.1, 1.5]); mesh(CYL, M.gold, dimA, [0, 0, 0], [0.025, 3.6, 0.025], [0, 0, Math.PI / 2]); [-1, 1].forEach((s) => mesh(CONE, M.gold, dimA, [s * 1.85, 0, 0], [0.07, 0.16, 0.07], [0, 0, -s * Math.PI / 2]));
  const sack = group(g, [1.15, -0.95, 0.5]); const sackIn = group(sack, [0, 0.47, 0]);
  const sackGeo = new THREE.LatheGeometry([[0, -0.47], [0.3, -0.46], [0.42, -0.34], [0.47, -0.06], [0.43, 0.22], [0.31, 0.38], [0.16, 0.45], [0.12, 0.5], [0.2, 0.62], [0.0, 0.64]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
  mesh(sackGeo, M.cream, sackIn, [0, 0, 0], [1, 1, 0.78]); mesh(new THREE.TorusGeometry(0.13, 0.03, 10, 32), M.gold, sackIn, [0, 0.47, 0], [1, 0.78, 1], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.475, 0.47, 0.24, 48, 1, true), M.emerald, sackIn, [0, -0.06, 0], [1, 1, 0.8]);
  for (let i = 0; i < 9; i++) mesh(SPH, M.goldSatin, sack, [-0.45 + (i % 5) * 0.2, 0.03, 0.42 + Math.floor(i / 5) * 0.12], [0.05, 0.03, 0.035]);
  shadow(sack, 0, 0, 0.1, 1.5, 1.1);
  const tag = group(sackIn, [0.12, 0.45, 0.16]); mesh(CYL, M.cream, tag, [0.22, -0.22, 0], [0.008, 0.45, 0.008], [0, 0, 0.8]);
  const tagTex = canvasTex(256, 160, (x, w, h) => { x.fillStyle = "#0b2017"; x.font = "900 96px Vazirmatn, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("%", w / 2 + 14, h / 2 + 4); x.fillStyle = "#0b2017"; x.beginPath(); x.moveTo(48, 50); x.lineTo(48, 108); x.lineTo(30, 90); x.moveTo(48, 108); x.lineTo(66, 90); x.lineWidth = 12; x.strokeStyle = "#0b2017"; x.lineCap = "round"; x.stroke(); });
  const tagBody = group(tag, [0.5, -0.48, 0]); mesh(rbox(0.5, 0.32, 0.04, 0.05), M.gold, tagBody); mesh(new THREE.PlaneGeometry(0.46, 0.29), new THREE.MeshBasicMaterial({ map: tagTex, transparent: true }), tagBody, [0, 0, 0.022]);
  const feedL = label("خوراک دام");
  const medal = group(g, [0, 0.0, 1.0]); const medIn = group(medal);
  mesh(extrude(starShape(18, 0.92, 0.8), 0.1, 0.03), M.gold, medIn, [0, 0, -0.05]); mesh(CYL, M.gold, medIn, [0, 0, 0.1], [0.7, 0.08, 0.7], [Math.PI / 2, 0, 0]); mesh(new THREE.CircleGeometry(0.64, 64), M.emeraldDeep, medIn, [0, 0, 0.141]);
  mesh(extrude(starShape(5, 0.42, 0.18), 0.06, 0.02), M.gold, medIn, [0, 0.0, 0.15]);
  const sp = sparkles(g, [[-1.4, 1.1, 1.2], [1.4, 0.9, 1.1], [-1.2, -0.9, 1.3], [1.3, -0.8, 1.4], [0.1, 1.45, 1.0]]);
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b1 = c(id, 1), b2 = c(id, 2);
    cam(v3(-0.6 + lt * 0.1, 4.2, 14.4), v3(0, -0.35, 0));
    const kl = eo(pr(t, c(id, 0) + 0.05, 0.9)); land.visible = kl > 0; landIn.scale.set(Math.max(1e-4, lerp(0.2, 1, kl)), 1, Math.max(1e-4, lerp(0.3, 1, kl)));
    const kd = eb(pr(t, c(id, 0) + 0.6, 0.6)); dimA.visible = kd > 0 && t < b1; dimA.scale.set(Math.max(1e-4, kd), 1, 1);
    const m1 = eio(pr(t, b1 - 0.1, 0.6)), m2 = eio(pr(t, b2 - 0.1, 0.6));
    land.position.set(lerp(0, -0.95, m1), lerp(-1.0, -0.95, m1) - m2 * 0.15, lerp(0, -0.4, m1) - m2 * 1.6); land.scale.setScalar(lerp(1, 0.6, m1));
    const ks = pr(t, b1, 0.85); sack.visible = ks > 0; sack.position.set(1.15, -0.95 + (1 - ebn(ks)) * 3.2 - m2 * 0.1, 0.5 - m2 * 1.8); sack.rotation.y = -0.4 + Math.sin(t * 0.8) * 0.1;
    tag.rotation.z = Math.sin((t - b1) * 6) * 0.5 * Math.exp(-Math.max(0, t - b1 - 0.6) * 1.6) * (t > b1 + 0.6 ? 1 : 0);
    lbl(feedL, sackIn, v3(0, -0.06, 0.5), cl(pr(t, b1 + 0.7, 0.3)) * (1 - m2));
    const km = pr(t, b2 + 0.05, 0.7); medal.visible = km > 0; medal.scale.setScalar(Math.max(1e-4, eb(km) * 1.05)); medIn.rotation.y = lerp(-2.4, 0, eo(km)) + Math.sin(t * 1.2) * 0.25; medIn.rotation.z = -t * 0.15;
    sp.forEach((m) => (m.visible = km > 0.5)); twinkle(sp, t, cl((km - 0.5) * 2));
  };
}

// ---------- S4: domestic market + export arcs to neighbouring countries
{ const g = root("s4"), id = "s4";
  const hub = medallion(g, 0.5, std({ map: flagTex, roughness: 0.5 }), [0, 0.0, 0.3]);
  const shopG = group(g, [0, -1.45, 0.7]); const sh = shop(shopG); sh.rotation.y = -0.25; shadow(shopG, 0, 0, 0, 1.6, 1.0);
  const pole = mesh(CYL, M.gold, g, [0, -0.65, 0.5], [0.025, 0.33, 0.025]);
  const homeL = label("بازار داخلی");
  const targets = [[1.75, 0.95, -0.4], [0.7, 1.25, -0.8], [-0.7, 1.25, -0.8], [-1.75, 0.95, -0.4]];
  const globes = targets.map((p) => { const gl = group(g, p); mesh(SPH, M.emerald, gl, [0, 0, 0], 0.3); mesh(new THREE.SphereGeometry(0.305, 14, 9), new THREE.MeshStandardMaterial({ color: 0xf0c46a, metalness: 1, roughness: 0.3, wireframe: true }), gl); mesh(new THREE.TorusGeometry(0.36, 0.014, 8, 48), M.gold, gl, [0, 0, 0], 1, [1.3, 0, 0]); return gl; });
  const arcs = targets.map(([x, y, z]) => { const curve = new THREE.QuadraticBezierCurve3(v3(0, 0.5, 0.3), v3(x * 0.55, y + 1.0, z * 0.3 + 0.3), v3(x, y, z)); return tube(curve, 0.02, M.goldSatin, g, 80); });
  const crates = []; arcs.forEach((a, i) => [0, 1].forEach((r) => crates.push({ m: mesh(rbox(0.15, 0.15, 0.15, 0.03), M.gold, g), a, i, r })));
  const dc = mesh(rbox(0.16, 0.16, 0.16, 0.03), M.gold, g);
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b0 = c(id, 0), b1 = c(id, 1);
    cam(v3(Math.sin(lt * 0.15) * 1.4, 2.0, 14.8), v3(0, -0.05, 0));
    const kh = pop(hub, t, S[id].t0 + 0.05, 0.6, 1); hub.rotation.y = Math.sin(t * 1.1) * 0.3; hub.position.y = Math.sin(t * 1.6) * 0.04;
    pole.visible = t > b0 + 0.1; pole.scale.y = Math.max(1e-4, 0.33 * eo(pr(t, b0 + 0.1, 0.4))); pole.position.y = -0.5 - pole.scale.y / 2;
    pop(shopG, t, b0 + 0.3, 0.55); lbl(homeL, shopG, v3(0.95, 0.3, 0.2), cl(pr(t, b0 + 0.6, 0.3)));
    const kd = pr(t, b0 + 0.7, 0.7); dc.visible = kd > 0 && kd < 1; dc.position.set(0, lerp(-0.5, -0.9, eio(kd)), 0.6); dc.rotation.y = t * 2;
    arcs.forEach((a, i) => drawTube(a, eo(pr(t, b1 + i * 0.1, 0.7))));
    globes.forEach((gl, i) => { pop(gl, t, b1 + 0.45 + i * 0.1, 0.5); gl.rotation.y = t * 0.6 + i; gl.position.y = targets[i][1] + Math.sin(t * 1.4 + i) * 0.05; });
    crates.forEach(({ m, a, i, r }) => { const u = pr(t, b1 + 0.75 + i * 0.16 + r * 1.25, 1.05); m.visible = u > 0 && u < 1; if (m.visible) { m.position.copy(a.userData.curve.getPointAt(eio(u))); m.rotation.set(t * 2, t * 1.5, 0); m.scale.setScalar(1 - Math.max(0, u - 0.85) * 4); } });
  };
}

// ---------- S5: modern greenhouse, orchard & crops, high capacity gauge
{ const g = root("s5"), id = "s5";
  const row = group(g); const gh = group(row, [0, -1.25, 0]); const ghIn = group(gh); ghIn.rotation.y = -0.55;
  mesh(rbox(2.7, 0.12, 2.6, 0.04), M.tile, ghIn, [0, 0.06, 0]); mesh(rbox(2.78, 0.05, 2.68, 0.02), M.gold, ghIn, [0, 0.0, 0]);
  const ribs = []; for (let i = 0; i < 6; i++) ribs.push(mesh(new THREE.TorusGeometry(1.2, 0.028, 8, 40, Math.PI), M.gold, ghIn, [0, 0.12, -1.1 + i * 0.44]));
  const longs = [0.45, 1.0, 1.57, 2.14, 2.69].map((a) => mesh(CYL, M.goldSatin, ghIn, [Math.cos(a) * 1.2, 0.12 + Math.sin(a) * 1.2, 0], [0.018, 2.2, 0.018], [Math.PI / 2, 0, 0]));
  const glassM = glass(0, 0xeafff2); mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 40, 1, true, -Math.PI / 2, Math.PI), glassM, ghIn, [0, 0.12, 0], 1, [-Math.PI / 2, 0, 0]);
  const sprouts = []; for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const s = group(ghIn, [-0.75 + r * 0.5, 0.12, -0.9 + k * 0.36]); mesh(CONE, M.emerald, s, [0, 0.12, 0], [0.07, 0.24, 0.07]); mesh(SPH, M.emerald, s, [0, 0.22, 0], 0.07); sprouts.push(s); }
  shadow(gh, 0, 0, 0, 4.2, 3.4);
  const wheat = group(row, [0.25, -1.3, 0.3]); const stalks = []; for (let i = 0; i < 6; i++) { const s = group(wheat, [(i - 2.5) * 0.13, 0, (i % 2) * 0.12]); mesh(CYL, M.goldSatin, s, [0, 0.45, 0], [0.012, 0.9, 0.012]); for (let j = 0; j < 6; j++) [-1, 1].forEach((sd) => mesh(SPH, M.gold, s, [sd * 0.035, 0.7 + j * 0.06, 0], [0.025, 0.045, 0.025], [0, 0, -sd * 0.5])); stalks.push(s); }
  const tree = group(row, [1.35, -1.3, 0.1]); mesh(CYL, M.sage, tree, [0, 0.4, 0], [0.07, 0.8, 0.07]); mesh(CYL, M.sage, tree, [0.12, 0.7, 0], [0.035, 0.35, 0.035], [0, 0, -0.7]);
  [[0, 1.05, 0, 0.42], [-0.3, 0.9, 0.1, 0.32], [0.3, 0.92, -0.05, 0.34], [0.05, 1.3, 0, 0.3]].forEach(([x, y, z, r]) => mesh(SPH, M.emerald, tree, [x, y, z], r));
  const fruits = [[-0.25, 1.05, 0.33], [0.2, 1.2, 0.32], [0.38, 0.9, 0.25], [-0.42, 0.85, 0.2], [0.05, 0.85, 0.42], [0.25, 1.45, 0.15], [-0.15, 1.4, 0.2], [0.45, 1.1, 0.1]].map((p) => mesh(SPH, M.copper, tree, p, 0.065));
  shadow(tree, 0, 0, 0, 1.4, 1.0);
  const gauge = group(g, [0, -0.95, 0.6]); mesh(new THREE.TorusGeometry(0.95, 0.13, 14, 64, Math.PI), M.tile, gauge);
  const segs = []; for (let i = 0; i < 26; i++) { const a = Math.PI - (i + 0.5) / 26 * Math.PI; segs.push(mesh(rbox(0.1, 0.26, 0.08, 0.03), M.gold, gauge, [Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.1], 1, [0, 0, a - Math.PI / 2])); }
  const needle = group(gauge, [0, 0, 0.18]); mesh(rbox(0.06, 0.78, 0.05, 0.025), M.cream, needle, [0, 0.39, 0]); mesh(CYL, M.gold, gauge, [0, 0, 0.16], [0.1, 0.08, 0.1], [Math.PI / 2, 0, 0]);
  const capL = label("ظرفیت بالا", "gold");
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b1 = c(id, 1), b2 = c(id, 2);
    cam(v3(0.8 - lt * 0.12, 3.4, 14.6), v3(0, -0.4, 0));
    const k0 = pr(t, c(id, 0), 1.0); gh.visible = k0 > 0; ribs.forEach((r, i) => { const k = pr(t, c(id, 0) + i * 0.08, 0.45); r.visible = k > 0; r.scale.setScalar(Math.max(1e-4, eb(k))); });
    longs.forEach((l, i) => { const k = eo(pr(t, c(id, 0) + 0.5 + i * 0.06, 0.4)); l.visible = k > 0; l.scale.y = Math.max(1e-4, 2.2 * k); });
    glassM.opacity = 0.2 * pr(t, c(id, 0) + 0.7, 0.5);
    sprouts.forEach((s, i) => { const k = pr(t, c(id, 0) + 0.9 + i * 0.025, 0.45); s.visible = k > 0; s.scale.set(1, Math.max(1e-4, eb(k)), 1); });
    const m1 = eio(pr(t, b1 - 0.15, 0.6)); gh.position.set(lerp(0, -1.2, m1), -1.25, lerp(0, -0.3, m1)); gh.scale.setScalar(lerp(1, 0.56, m1));
    stalks.forEach((s, i) => { const k = pr(t, b1 + 0.15 + i * 0.07, 0.5); s.visible = k > 0; s.scale.set(1, Math.max(1e-4, eo(k)), 1); });
    const kt = pr(t, b1 + 0.3, 0.6); tree.visible = kt > 0; tree.scale.setScalar(Math.max(1e-4, eb(kt))); fruits.forEach((f, i) => pop(f, t, b1 + 0.8 + i * 0.07, 0.35, 0.065));
    const m2 = eio(pr(t, b2 - 0.15, 0.6)); row.position.set(0, m2 * 1.75, -m2 * 1.0); row.scale.setScalar(lerp(1, 0.78, m2));
    const kg = pr(t, b2 + 0.1, 0.5); gauge.visible = kg > 0; gauge.scale.setScalar(Math.max(1e-4, eb(kg)));
    const fill = eo(pr(t, b2 + 0.35, 1.2)) * 0.86; segs.forEach((s, i) => (s.visible = i / 26 < fill));
    needle.rotation.z = lerp(Math.PI / 2, Math.PI / 2 - Math.PI * 0.86, eo(pr(t, b2 + 0.35, 1.2)));
    lbl(capL, gauge, v3(0, -0.32, 0.2), cl(pr(t, b2 + 0.9, 0.3)));
  };
}

// ---------- S6: good climate, four seasons, easy production & export
{ const g = root("s6"), id = "s6";
  const wheelWrap = group(g, [0, 0.1, 0]); const sun = group(wheelWrap); mesh(SPH, M.sun, sun, [0, 0, 0], 0.5);
  const rays = group(sun); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(rbox(0.07, 0.24, 0.07, 0.03), M.gold, rays, [Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0], 1, [0, 0, a - Math.PI / 2]); }
  const cloud = group(g, [0.7, -0.2, 0.9]); [[0, 0, 0, 0.34], [0.35, 0.1, 0, 0.4], [0.72, -0.02, 0, 0.3], [0.36, -0.12, 0.1, 0.34]].forEach(([x, y, z, r]) => mesh(SPH, M.cream, cloud, [x, y, z], r));
  const wheel = group(wheelWrap); const mats = [M.emerald, M.gold, M.copper, M.sage]; const quads = [];
  const icon = [
    (p) => { const f = group(p); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mesh(SPH, M.cream, f, [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0], [0.08, 0.08, 0.04]); } mesh(SPH, M.gold, f, [0, 0, 0.03], 0.07); return f; },
    (p) => { const f = group(p); mesh(SPH, M.sun, f, [0, 0, 0], 0.12); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mesh(rbox(0.035, 0.09, 0.035, 0.015), M.cream, f, [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0], 1, [0, 0, a - Math.PI / 2]); } return f; },
    (p) => { const f = group(p); mesh(SPH, M.cream, f, [0, 0, 0], [0.1, 0.2, 0.04], [0, 0, -0.6]); mesh(CYL, M.copper, f, [0, 0, 0.04], [0.01, 0.36, 0.01], [0, 0, -0.6]); return f; },
    (p) => { const f = group(p); [0, 1.047, 2.094].forEach((a) => mesh(rbox(0.04, 0.4, 0.04, 0.015), M.cream, f, [0, 0, 0], 1, [0, 0, a])); return f; },
  ];
  for (let k = 0; k < 4; k++) { const q = group(wheel); q.rotation.z = (k * Math.PI) / 2 + 0.04; mesh(new THREE.TorusGeometry(1.25, 0.3, 18, 40, Math.PI / 2 - 0.08), mats[k], q);
    const am = (k * Math.PI) / 2 + Math.PI / 4; const ic = icon[k](wheel); ic.position.set(Math.cos(am) * 1.25, Math.sin(am) * 1.25, 0.33); quads.push({ q, ic }); }
  const line = group(g, [0.35, -1.2, 0.4]); mesh(rbox(3.6, 0.12, 0.6, 0.05), M.dark, line, [0.2, 0.42, 0]); [-1, 1].forEach((s) => mesh(rbox(3.6, 0.08, 0.04, 0.02), M.gold, line, [0.2, 0.5, s * 0.31]));
  const rollers = []; for (let i = 0; i < 11; i++) rollers.push(mesh(CYL, M.goldSatin, line, [-1.4 + i * 0.32, 0.3, 0], [0.07, 0.64, 0.07], [Math.PI / 2, 0, 0]));
  [-1.5, 1.9].forEach((x) => mesh(rbox(0.1, 0.36, 0.5, 0.03), M.tile, line, [x, 0.18, 0])); shadow(line, 0.2, 0, 0, 4.4, 1.2);
  const crates = []; for (let i = 0; i < 6; i++) crates.push(mesh(rbox(0.3, 0.3, 0.3, 0.04), M.goldSatin, line));
  const tr = group(g, [-1.45, -1.2, 0.4]); truck(tr); tr.rotation.y = -0.25; shadow(tr, 0, 0, 0, 2.0, 1.0);
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b1 = c(id, 1), b2 = c(id, 2), b3 = c(id, 3);
    cam(v3(Math.sin(lt * 0.12) * 1.2, 2.2, 15), v3(0, -0.1, 0));
    pop(sun, t, c(id, 0) + 0.05, 0.6, 1); sun.scale.multiplyScalar(lerp(1, 0.62, eio(pr(t, b1 - 0.1, 0.5)))); rays.rotation.z = t * 0.6;
    const kc = pr(t, c(id, 0) + 0.3, 0.8), kx = pr(t, b1 - 0.15, 0.4); cloud.visible = kc > 0 && kx < 1; cloud.position.set(lerp(2.6, 0.55, eo(kc)) + kx * 2.5, -0.25 + Math.sin(t * 1.3) * 0.04, 0.9);
    quads.forEach(({ q, ic }, k) => { const kk = pr(t, at(id, 1, 0.1) + k * 0.14, 0.5); q.visible = ic.visible = kk > 0; q.scale.setScalar(Math.max(1e-4, eb(kk))); ic.scale.setScalar(Math.max(1e-4, eb(pr(t, at(id, 1, 0.1) + k * 0.14 + 0.2, 0.4)))); ic.rotation.z = -wheel.rotation.z; });
    wheel.rotation.z = Math.max(0, t - b1) * 0.35;
    const mv = eio(pr(t, b2, 0.6)); wheelWrap.position.set(0, lerp(0.1, 0.95, mv), lerp(0, -0.6, mv)); wheelWrap.scale.setScalar(lerp(1, 0.62, mv));
    const kl = eo(pr(t, b2 + 0.3, 0.6)); line.visible = kl > 0; line.position.x = lerp(4.5, 0.35, kl); rollers.forEach((r) => (r.rotation.y = t * 4));
    const ktr = pr(t, b2 + 0.4, 0.8), kout = pr(t, Math.max(b3 + 1.3, S[id].next - 1.0), 0.9); tr.visible = ktr > 0; tr.position.x = lerp(-4.5, -1.15, eo(ktr)) - easeInQ(kout) * 4;
    crates.forEach((m, i) => { const u = pr(t, b2 + 0.7 + i * 0.4, 1.35); m.visible = u > 0 && u < 1; m.position.set(lerp(1.85, -0.95, u), 0.63, 0); m.rotation.y = 0.3; });
  };
}
function easeInQ(k) { return k * k; }

// ---------- S7: trout farming underwater -> growth arrow
{ const g = root("s7"), id = "s7";
  const water = mesh(new THREE.PlaneGeometry(14, 20), new THREE.MeshBasicMaterial({ map: canvasTex(8, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#2c7a5c"); gr.addColorStop(0.35, "#17533c"); gr.addColorStop(1, "#08261a"); x.fillStyle = gr; x.fillRect(0, 0, w, h); }) }), g, [0, 0, -4]);
  const rayM = new THREE.MeshBasicMaterial({ map: canvasTex(64, 8, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(220,255,235,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.25 });
  const rays = [-1.8, -0.6, 0.7, 1.9].map((x, i) => mesh(new THREE.PlaneGeometry(0.9 + i * 0.2, 12), rayM, g, [x, 1.5, -3], 1, [0, 0, 0.25 - i * 0.05]));
  const hero = fish(g, 1.25), fA = fish(g, 0.7), fB = fish(g, 0.55);
  const bubbles = []; for (let i = 0; i < 16; i++) bubbles.push(mesh(SPH, glass(0.35, 0xeafff5), g, [0, 0, 0], 0.04 + hash(i) * 0.05));
  const grow = tube([[-1.9, -1.4, 0.6], [-1.0, -0.7, 0.6], [-0.4, -0.95, 0.6], [0.5, 0.1, 0.6], [1.0, -0.1, 0.6], [1.9, 1.1, 0.6]], 0.075, M.gold, g, 160, 0.02);
  const head = arrowHead(g, M.gold, 0.17);
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b1 = c(id, 1), b3 = c(id, 3);
    floor.visible = false; cam(v3(Math.sin(lt * 0.2) * 0.6, 0.4, 14.5), v3(0, 0.0, 0));
    rays.forEach((r, i) => { r.rotation.z = 0.25 - i * 0.05 + Math.sin(t * 0.6 + i) * 0.05; r.material.opacity = 0.25; });
    const swim = (f, x, y, z, ry = 0) => { f.position.set(x, y, z); f.rotation.set(0, ry, Math.sin(t * 2.5 + x) * 0.05); f.userData.tail.rotation.y = Math.sin(t * 12 + x) * 0.45; };
    swim(fA, lerp(3.5, -3.5, pr(t, S[id].t0 + 0.2, 6.0)), 0.55, -1.6, 0.25); swim(fB, lerp(3.5, -3.5, pr(t, at(id, 0, 0.2), 5.0)), -1.0, -1.2, 0.2);
    const hin = eo(pr(t, b1 - 0.1, 1.2)), hout = easeInQ(pr(t, b3 - 0.15, 1.0));
    swim(hero, lerp(4.0, 0.15, hin) - hout * 4.5, -0.15 + Math.sin(t * 1.7) * 0.08, 0.6, -0.15 + Math.sin(t * 1.1) * 0.08); hero.visible = hin > 0 && hout < 1;
    bubbles.forEach((b, i) => { const sp = 0.5 + hash(i + 2) * 0.5, y = ((hash(i + 7) * 4 + (t - S[id].t0) * sp) % 4) - 1.7; b.position.set((hash(i + 1) - 0.5) * 4.2 + Math.sin(t * 2 + i) * 0.06, y, -0.3 + hash(i + 4) * 1.2); });
    const kg = eo(pr(t, b3 + 0.15, 1.1)); drawTube(grow, kg); head.visible = kg > 0.02; if (head.visible) placeHead(head, grow.userData.curve, kg);
  };
}

// ---------- S8: water resources, high demand -> very attractive opportunity (emerald gem)
{ const g = root("s8"), id = "s8";
  const prof = []; for (let i = 0; i <= 18; i++) { const th = -Math.PI / 2 + (i / 18) * (Math.PI / 2 + 0.55); prof.push([0.78 * Math.cos(th), -0.25 + 0.78 * Math.sin(th)]); }
  const [lx, ly] = prof[prof.length - 1]; for (let i = 1; i <= 10; i++) { const u = i / 10; prof.push([(1 - u) * (1 - u) * lx + 2 * (1 - u) * u * 0.22 + 0, (1 - u) * (1 - u) * ly + 2 * (1 - u) * u * 0.75 + u * u * 1.05]); }
  prof[prof.length - 1][0] = 0;
  const rAt = (y) => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) { const [x0, y0] = prof[i - 1], [x1, y1] = prof[i]; return lerp(x0, x1, (y - y0) / ((y1 - y0) || 1)); } return 0; };
  const dropGeo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64);
  const drop = group(g, [0, -0.15, 0.4]); mesh(dropGeo, glass(0.22, 0xf0fff6), drop);
  const plane = new THREE.Plane(v3(0, -1, 0), 0); const liqM = phys({ color: 0x2f8a5c, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92, clippingPlanes: [plane], side: THREE.DoubleSide });
  mesh(dropGeo, liqM, drop, [0, 0, 0], 0.93); const surface = mesh(new THREE.CircleGeometry(1, 48), phys({ color: 0x4fb07f, roughness: 0.1, clearcoat: 1 }), drop, [0, 0, 0], 1, [-Math.PI / 2, 0, 0]);
  shadow(drop, 0, -1.05, 0, 1.8, 1.0);
  const chart = group(g, [0.95, -1.4, 0.3]); mesh(rbox(2.4, 0.06, 0.6, 0.03), M.tile, chart, [0, 0.03, 0]); shadow(chart, 0, 0, 0, 3, 1.2);
  const hs = [0.5, 0.82, 1.15, 1.5, 1.95]; const bars = hs.map((h, i) => { const geo = rbox(0.32, h, 0.32, 0.05).clone(); geo.translate(0, h / 2, 0); return mesh(geo, i === 4 ? M.copper : M.gold, chart, [-0.9 + i * 0.45, 0.06, 0]); });
  const dL = label("داخلی"), eL = label("صادراتی", "copper");
  const gem = group(g, [0, -0.05, 1.2]); const gemIn = group(gem);
  mesh(new THREE.LatheGeometry([[0, -0.66], [0.68, 0.22], [0.64, 0.3], [0.36, 0.58], [0, 0.58]].map(([x, y]) => new THREE.Vector2(x, y)), 10), phys({ color: 0x2f9a64, emissive: 0x0b3b24, metalness: 0.05, roughness: 0.06, clearcoat: 1, flatShading: true }), gemIn);
  mesh(new THREE.TorusGeometry(0.69, 0.035, 10, 64), M.gold, gemIn, [0, 0.24, 0], 1, [Math.PI / 2, 0, 0]);
  const halo = mesh(extrude(starShape(22, 1.25, 1.12), 0.04, 0.01), M.goldSatin, g, [0, -0.05, 0.2]);
  const sp = sparkles(g, [[-1.3, 1.0, 1.4], [1.25, 0.8, 1.5], [1.1, -1.0, 1.6], [-1.2, -0.9, 1.5], [0.2, 1.35, 1.3]]);
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b1 = c(id, 1), b2 = c(id, 2), tg = at(id, 3, 0.4);
    cam(v3(Math.sin(lt * 0.14) * 1.2, 2.1, 14.8), v3(0, -0.1, 0));
    const kd = pr(t, c(id, 0), 0.6); drop.visible = kd > 0; const m1 = eio(pr(t, b1 - 0.15, 0.6)), m3 = eio(pr(t, tg - 0.1, 0.6));
    drop.position.set(lerp(0, -1.25, m1), lerp(-0.15, -0.55, m1), lerp(0.4, 0.2, m1) - m3 * 2.2); drop.scale.setScalar(Math.max(1e-4, eb(kd) * lerp(1, 0.6, m1) * (1 - m3))); drop.visible = kd > 0 && m3 < 1;
    drop.rotation.y = t * 0.4; const ly = lerp(-1.0, 0.42, eo(pr(t, c(id, 0) + 0.3, 1.6)));
    drop.updateMatrixWorld(true); plane.constant = tmp.set(0, ly, 0).applyMatrix4(drop.matrixWorld).y; surface.position.y = ly; surface.scale.setScalar(Math.max(1e-4, rAt(ly / 0.93) * 0.93));
    chart.visible = t > b1 - 0.1 && m3 < 1; chart.position.z = 0.3 - m3 * 2.2; chart.scale.setScalar(Math.max(1e-4, eo(pr(t, b1 - 0.1, 0.4)) * (1 - m3)));
    bars.forEach((b, i) => { const k = i < 4 ? pr(t, b1 + 0.15 + i * 0.12, 0.55) : pr(t, b2 + 0.1, 0.7); b.visible = k > 0; b.scale.set(1, Math.max(1e-4, eb(k)), 1); });
    lbl(dL, chart, v3(-0.25, -0.22, 0.4), cl(pr(t, b1 + 0.6, 0.3)) * (1 - m3)); lbl(eL, chart, v3(0.9, -0.22, 0.4), cl(pr(t, b2 + 0.3, 0.3)) * (1 - m3));
    const kg = pr(t, tg, 0.7); gem.visible = kg > 0; gem.scale.setScalar(Math.max(1e-4, eb(kg) * 1.15)); gemIn.rotation.y = t * 0.9; gemIn.rotation.x = 0.25 + Math.sin(t) * 0.08;
    halo.visible = kg > 0; halo.scale.setScalar(Math.max(1e-4, eo(kg))); halo.rotation.z = t * 0.2;
    sp.forEach((m) => (m.visible = kg > 0.4)); twinkle(sp, t, cl((kg - 0.4) * 2));
  };
}

// ---------- S9: amount doesn't matter -> the right path matters
{ const g = root("s9"), id = "s9";
  const base = group(g, [0, -1.25, 0.4]); mesh(rbox(3.7, 0.1, 1.3, 0.04), M.tile, base); mesh(rbox(3.78, 0.04, 1.38, 0.02), M.gold, base, [0, -0.05, 0]); shadow(base, 0, -0.06, 0, 5, 2.2);
  const st = [[1.25, 2, "کم"], [0, 4, "متوسط"], [-1.25, 7, "زیاد"]].map(([x, n, name]) => { const s = coinStack(base, n, x, 0.05, 0); return { s, n, L: label(name), ok: check(base, [x + 0.42, 0.05 + n * 0.095 + 0.25, 0.1], 0.17) }; });
  const roads = group(g, [0, 0, 0]); const ground = mesh(new THREE.CircleGeometry(9, 64), floor.material, roads, [0, -0.01, -1], 1, [-Math.PI / 2, 0, 0]);
  const trunkC = new THREE.LineCurve3(v3(0, 0, 3.0), v3(0, 0, 1.0));
  const ends = [v3(-1.7, 0, -2.2), v3(0, 0, -2.6), v3(1.7, 0, -2.2)];
  const brC = ends.map((e) => new THREE.CubicBezierCurve3(v3(0, 0, 1.0), v3(0, 0, 0.1), v3(e.x * 0.9, 0, e.z * 0.35), e));
  const roadM = std({ color: 0x2c5f45, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });
  ribbon(trunkC, 0.7, 20, roadM, roads, 0.01); const br = brC.map((cv) => ribbon(cv, 0.55, 60, roadM, roads, 0.012));
  const good = new THREE.CurvePath(); good.add(trunkC); good.add(brC[2]);
  const goldR = ribbon(good, 0.2, 120, phys({ color: 0xf2c56b, metalness: 1, roughness: 0.25, side: THREE.DoubleSide, emissive: 0x3a2808 }), roads, 0.03);
  const orb = group(roads); mesh(SPH, M.glow, orb, [0, 0, 0], 0.13); const orbL = new THREE.PointLight(0xffd37a, 3, 3, 1.5); orb.add(orbL);
  const flag = group(roads, [1.7, 0, -2.2]); mesh(CYL, M.gold, flag, [0, 0.6, 0], [0.03, 1.2, 0.03]); mesh(SPH, M.gold, flag, [0, 1.22, 0], 0.05);
  const cloth = mesh(new THREE.PlaneGeometry(0.62, 0.38, 12, 4), phys({ color: 0xf0c46a, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), flag, [0.33, 1.0, 0]); const clothBase = cloth.geometry.attributes.position.array.slice();
  const flagOk = check(flag, [0, 1.6, 0], 0.18);
  const xs = [xmark(roads, [-1.7, 0.45, -2.2], 0.24), xmark(roads, [0, 0.45, -2.6], 0.24)];
  SC[id].update = (t) => {
    const lt = t - S[id].t0, b1 = c(id, 1), b2 = c(id, 2), go = at(id, 2, 0.7);
    const mv = eio(pr(t, b2 - 0.2, 1.0));
    cam(v3(lerp(Math.sin(lt * 0.15) * 1.2, -0.2 + Math.max(0, t - b2) * 0.12, mv), lerp(2.2, 7.6, mv), lerp(14.8, 11.6, mv)), v3(0, lerp(-0.2, -1.3, mv), lerp(0, -0.9, mv)));
    floor.visible = mv < 0.5;
    base.visible = mv < 0.98; base.position.set(0, -1.25 + mv * 0.3, 0.4 + mv * 6);
    st.forEach(({ s, n, L, ok }, k) => { s.userData.coins.forEach((cn, j) => { const kk = pr(t, c(id, 0) + 0.15 + k * 0.25 + j * 0.05, 0.4); cn.visible = kk > 0; cn.position.y = 0.045 + j * 0.095 + (1 - ebn(kk)) * 1.4; }); pop(ok, t, at(id, 1, 0.3) + k * 0.15, 0.45, 1); ok.rotation.y = Math.sin(t * 2 + k) * 0.3; lbl(L, s, v3(0, -0.22, 0.6), cl(pr(t, c(id, 0) + 0.4 + k * 0.1, 0.3)) * (1 - mv)); });
    roads.visible = mv > 0.02; roads.position.y = -1.45;
    br.forEach((b, i) => { drawRibbon(b, eo(pr(t, b2 + 0.4 + i * 0.08, 0.6))); });
    const kg = eio(pr(t, go, 1.1)); drawRibbon(goldR, kg); orb.visible = kg > 0 && kg < 1; if (orb.visible) { orb.position.copy(good.getPointAt(kg)); orb.position.y = 0.16; }
    pop(flag, t, go + 0.95, 0.5, 1); const p = cloth.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = clothBase[i * 3] + 0.31; p.setZ(i, Math.sin(x * 9 - t * 6) * 0.05 * x * 2); } p.needsUpdate = true;
    pop(flagOk, t, go + 1.25, 0.45, 1); flagOk.rotation.y = Math.sin(t * 2) * 0.4;
    xs.forEach((x, i) => { pop(x, t, b2 + 0.95 + i * 0.1, 0.4, 1); x.lookAt(camera.position); });
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
