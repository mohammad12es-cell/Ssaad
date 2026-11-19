// NEXO Oman reel: the 3D Oman passport and gold dust. Pure function of film time t (no clocks, no randomness).
import * as THREE from "three";
import { RoomEnvironment } from "./jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./jsm/geometries/RoundedBoxGeometry.js";

const W = 1080, H = 1920, TAU = Math.PI * 2;
const cl = (x) => Math.max(0, Math.min(1, x));
const pr = (t, t0, d) => cl((t - t0) / d);
const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eob = (k) => { const a = 1.4, b = a + 1; return 1 + b * Math.pow(k - 1, 3) + a * Math.pow(k - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- renderer (transparent: the HTML background shows through)
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
const UPP = (2 * 10 * Math.tan((15 * Math.PI) / 180)) / H; // world units per screen pixel at z = 0
const px = (x, y) => new THREE.Vector3((x - W / 2) * UPP, (H / 2 - y) * UPP, 0);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x0a1426, 0.7));
const key = new THREE.DirectionalLight(0xfff0d6, 1.6); key.position.set(3, 5, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fc2ff, 0.9); rim.position.set(-5, 2, -3); scene.add(rim);
const glint = new THREE.PointLight(0xfff2c8, 0, 6, 1.6); scene.add(glint);

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw) { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"); draw(g, w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { cv, draw }; return t; }
const redraw = (t) => { const cv = t.userData.cv, g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); t.userData.draw(g, cv.width, cv.height); t.needsUpdate = true; };
const leather = canvasTex(512, 716, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#5c121b"); gr.addColorStop(0.55, "#3f0a12"); gr.addColorStop(1, "#28060b");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const x = hash(i) * w, y = hash(i + 7.7) * h, a = 0.05 + hash(i + 3.3) * 0.07; g.fillStyle = hash(i + 1.1) > 0.5 ? `rgba(255,220,220,${a})` : `rgba(0,0,0,${a})`; g.fillRect(x, y, 1.6, 1.6); }
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h - 36);
});
function emblem(g, cx, cy, s) { // Oman national emblem, simplified: khanjar over two crossed swords
  g.save(); g.translate(cx, cy); g.scale(s, s); g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round";
  [1, -1].forEach((m) => {
    g.save(); g.scale(m, 1);
    g.lineWidth = 22; g.beginPath(); g.moveTo(-118, -120); g.quadraticCurveTo(30, -20, 150, 178); g.stroke();             // blade
    g.lineWidth = 9; g.beginPath(); g.moveTo(-104, -134); g.quadraticCurveTo(40, -38, 162, 166); g.stroke();
    g.lineWidth = 16; g.beginPath(); g.moveTo(-122, -124); g.lineTo(-168, -172); g.stroke();                               // grip
    g.lineWidth = 12; g.beginPath(); g.moveTo(-142, -98); g.lineTo(-96, -146); g.stroke();                                 // guard
    g.beginPath(); g.arc(-176, -180, 13, 0, TAU); g.fill();                                                                // pommel
    g.restore();
  });
  g.lineWidth = 30; g.beginPath(); g.moveTo(0, -176); g.lineTo(0, -92); g.stroke();                                         // khanjar handle
  g.lineWidth = 14; g.beginPath(); g.moveTo(-40, -190); g.lineTo(40, -190); g.stroke(); g.beginPath(); g.arc(0, -204, 14, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0, -86, 40, 13, 0, 0, TAU); g.fill();                                                           // collar
  g.lineWidth = 40; g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 46); g.quadraticCurveTo(0, 128, 74, 118); g.stroke();      // curved sheath
  g.beginPath(); g.arc(86, 112, 19, 0, TAU); g.fill();
  g.lineWidth = 9; g.beginPath(); g.moveTo(-112, -26); g.quadraticCurveTo(0, -6, 112, -26); g.stroke();                     // belt
  [-70, 70].forEach((x) => { g.beginPath(); g.arc(x, -20, 11, 0, TAU); g.stroke(); });
  g.restore();
}
const foil = canvasTex(1024, 1434, (g, w, h) => { // white = gold foil (used as alphaMap)
  g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.direction = "rtl"; g.font = "800 128px Vazirmatn, serif"; g.fillText("سلطنة عُمان", w / 2, 210);
  g.direction = "ltr"; g.font = "700 60px Cinzel, serif"; g.fillText("SULTANATE OF OMAN", w / 2, 340);
  emblem(g, w / 2, 735, 1.18);
  g.font = "700 92px Cinzel, serif"; g.fillText("PASSPORT", w / 2, 1140);
  g.strokeStyle = "#fff"; g.lineWidth = 9; const cx = w / 2, cy = 1268; g.beginPath(); g.roundRect(cx - 56, cy - 36, 112, 72, 14); g.stroke();
  g.beginPath(); g.moveTo(cx - 56, cy); g.lineTo(cx - 20, cy); g.moveTo(cx + 20, cy); g.lineTo(cx + 56, cy); g.moveTo(cx, cy - 36); g.lineTo(cx, cy - 14); g.moveTo(cx, cy + 14); g.lineTo(cx, cy + 36); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, 20, 14, 0, 0, TAU); g.stroke();
});
foil.colorSpace = THREE.NoColorSpace;
const pagesTex = canvasTex(64, 512, (g, w, h) => { g.fillStyle = "#efe6d1"; g.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 3) { g.fillStyle = `rgba(120,96,60,${0.12 + hash(i) * 0.12})`; g.fillRect(i, 0, 1, h); } });
let fontsDone = false;
try { document.fonts.load("700 60px Cinzel"); document.fonts.load("800 60px Vazirmatn"); } catch (e) {}
const fontsReady = () => { try { return document.fonts.check("700 60px Cinzel") && document.fonts.check("800 60px Vazirmatn", "سلطنة"); } catch (e) { return false; } };

// ---------------------------------------------------------------- the passport (pivot at its centre, cover faces +z)
const PW = 1.25, PH = 1.75;
const pass = new THREE.Group(); scene.add(pass);
const maroon = new THREE.MeshPhysicalMaterial({ color: 0x3e0b12, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: 0x7a2a30 });
const box = (w, h, d, r, mat, p) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); m.position.set(...p); pass.add(m); return m; };
box(PW - 0.05, PH - 0.05, 0.11, 0.01, new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.85 }), [0.01, 0, 0]);
box(PW, PH, 0.022, 0.035, maroon, [0, 0, 0.062]); box(PW, PH, 0.022, 0.035, maroon, [0, 0, -0.062]);
box(0.06, PH, 0.146, 0.03, maroon, [-PW / 2 + 0.02, 0, 0]);
const decal = (mat, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.04, PH - 0.04), mat); m.position.z = z; pass.add(m); return m; };
decal(new THREE.MeshPhysicalMaterial({ map: leather, roughness: 0.62, clearcoat: 0.3, clearcoatRoughness: 0.5, sheen: 0.25, sheenColor: 0x7a2a30, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }), 0.0735);
const foilMat = new THREE.MeshStandardMaterial({ color: 0xf0c66a, metalness: 1, roughness: 0.26, alphaMap: foil, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, envMapIntensity: 1.2 });
decal(foilMat, 0.0742);
const shadowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); scene.add(shadow);

// ---------------------------------------------------------------- gold dust
const dust = (() => {
  const n = 70, pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.35, "rgba(246,214,140,0.55)"); gr.addColorStop(1, "rgba(246,214,140,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, size: 0.07, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xf6d690 }));
  pts.frustumCulled = false; scene.add(pts); return { pos, n, pts };
})();
function updateDust(t) {
  for (let i = 0; i < dust.n; i++) {
    const z = -3 + hash(i + 5) * 5, hh = Math.tan((15 * Math.PI) / 180) * (10 - z), ww = hh * (W / H);
    const sp = 0.04 + hash(i + 3) * 0.08;
    dust.pos[i * 3] = (hash(i) * 2 - 1) * ww + Math.sin(t * 0.4 + i) * 0.06;
    dust.pos[i * 3 + 1] = ((((hash(i + 9) + t * sp) % 1) * 2 - 1) * hh);
    dust.pos[i * 3 + 2] = z;
  }
  dust.pts.geometry.attributes.position.needsUpdate = true;
  dust.pts.material.opacity = 0.7 * pr(t, 0, 0.8);
}

// ---------------------------------------------------------------- choreography: poses (screen px, scale, rotation) between beats
const P = (x, y, s, rx, ry, rz) => ({ x, y, s, rx, ry, rz });
const KEYS = [
  [0.15, P(1250, 1780, 1.0, 0.5, -2.6, 0.7)],    // off screen, lower right
  [1.15, P(540, 1310, 0.9, -0.12, -0.32, 0.05)], // lands: hero
  [3.45, P(540, 1310, 0.9, -0.12, -0.32, 0.05)],
  [4.25, P(225, 1560, 0.64, -0.05, 0.42, -0.24)], // tucks into the lower left (decoration zone)
  [12.0, P(225, 1560, 0.64, -0.05, 0.42, -0.24)],
  [12.8, P(540, 990, 0.6, -0.08, -0.25, 0.0)],    // centre of the CTA
];
const EASES = [eob, null, eio, null, eio];
function pose(t) {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1];
    if (t < t1) { const e = EASES[i] ? EASES[i](pr(t, t0, t1 - t0)) : 0; const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], e); return o; }
  }
  return KEYS[KEYS.length - 1][1];
}

window.__world = { scene, camera, pass };
export function frame(t) {
  if (!fontsDone && fontsReady()) { redraw(foil); fontsDone = true; }
  const p = pose(t), float = t > 1.15 ? 1 : pr(t, 0.9, 0.25);
  const pos = px(p.x, p.y + Math.sin(t * 1.7) * 10 * float);
  pass.position.copy(pos); pass.scale.setScalar(p.s);
  pass.rotation.set(p.rx + Math.sin(t * 1.1) * 0.04 * float, p.ry + Math.sin(t * 0.8) * 0.16 * float, p.rz);
  // a warm glint sweeps across the foil at the beats
  let gk = 0; [[1.2, 1.0], [2.7, 0.9], [9.6, 0.9], [13.1, 1.1]].forEach(([t0, d]) => { const k = pr(t, t0, d); if (k > 0 && k < 1) gk = Math.max(gk, Math.sin(Math.PI * k)); });
  const sw = ((t * 0.9) % 1);
  glint.intensity = 4 * gk; glint.position.set(pos.x + lerp(-1.4, 1.4, sw) * p.s, pos.y + lerp(1.0, -0.6, sw) * p.s, 1.4);
  shadow.position.set(pos.x + 0.15 * p.s, pos.y - 0.12 * p.s, -0.4); shadow.scale.set(2.2 * p.s, 2.8 * p.s, 1);
  updateDust(t);
  renderer.render(scene, camera);
}
