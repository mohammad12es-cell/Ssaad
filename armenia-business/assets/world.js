// Bring your business to Armenia: the Three.js world. Everything here is a pure function of film time `t`
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
const ebn = (k) => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; };
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

const scene = new THREE.Scene();
scene.background = (() => { // brand background: forest-green radial glow + soft cloudy texture, generated deterministically
  const w = 360, h = 640, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
  const lin = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const A = lin("#081a12"), B = lin("#15372a"), C = lin("#245040");
  const grid = (n, seed) => Array.from({ length: (n + 1) * (n * 2 + 1) }, (_, i) => hash(i * 7.31 + seed));
  const oct = [[4, 0.6, 1], [9, 0.28, 2], [21, 0.12, 3]].map(([n, a, s]) => ({ n, a, g: grid(n, s) }));
  const noise = (x, y) => oct.reduce((acc, o) => {
    const gx = x * o.n, gy = y * o.n * 2, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, R = o.n + 1;
    const q = (a, b) => o.g[(Math.min(b, o.n * 2)) * R + Math.min(a, o.n)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return acc + o.a * lerp(lerp(q(ix, iy), q(ix + 1, iy), sx), lerp(q(ix, iy + 1), q(ix + 1, iy + 1), sx), sy);
  }, 0);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h, r = Math.hypot((u - 0.5) * 1.05, (v - 0.47) * 0.85);
    const k = cl(1 - r / 0.8), glow = Math.pow(cl(1 - Math.hypot((u - 0.5) / 0.6, (v - 0.47) / 0.38)), 2) * 0.8;
    const n = noise(u, v) - 0.5, gr = (hash(x * 13.7 + y * 91.3) - 0.5) * 0.035;
    const i = (y * w + x) * 4;
    for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.max(0, Math.min(255, lerp(lerp(A[ch], B[ch], k), C[ch], glow) * (1 + n * 0.22 + gr)));
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
})();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.62;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 120); scene.add(camera);
scene.add(new THREE.HemisphereLight(0xfff2d6, 0x0b2017, 0.55));
const key = new THREE.DirectionalLight(0xffe2b0, 1.55); key.position.set(-5, 9, 7); scene.add(key);
const rim = new THREE.DirectionalLight(0x9ff0c8, 0.9); rim.position.set(6, 3, -6); scene.add(rim);
const back = new THREE.DirectionalLight(0xffd27a, 0.7); back.position.set(-2, 4, -8); scene.add(back);

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.3, 0.5, 1.15); composer.addPass(bloom);
composer.addPass(new OutputPass());

const LOOK = new THREE.Vector3();
function cam(p, l, fov = 30) { camera.position.copy(p); LOOK.copy(l); camera.lookAt(l); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); } }
// orbit helper: camera at (yaw, pitch, dist) around a target
function orbit(tg, yaw, pitch, dist, fov = 30) {
  cam(v3(tg.x + Math.sin(yaw) * Math.cos(pitch) * dist, tg.y + Math.sin(pitch) * dist, tg.z + Math.cos(yaw) * Math.cos(pitch) * dist), tg, fov);
}

// ---------------------------------------------------------------- materials
const phys = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  gold: phys({ color: 0xf2c56b, metalness: 1, roughness: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
  goldSatin: std({ color: 0xdcab55, metalness: 1, roughness: 0.4 }),
  copper: std({ color: 0xd9905a, metalness: 0.9, roughness: 0.35 }),
  emerald: phys({ color: 0x23744c, metalness: 0.05, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
  emeraldDeep: phys({ color: 0x1a5c3d, metalness: 0.05, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.2 }),
  tile: phys({ color: 0x143f2c, metalness: 0.1, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.45, envMapIntensity: 0.45 }),
  cream: phys({ color: 0xead9b8, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
  creamHi: phys({ color: 0xf6ecd6, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
  sage: std({ color: 0x7fa287, roughness: 0.7 }),
  grass: std({ color: 0x3f8a58, roughness: 0.8 }),
  leaf: std({ color: 0x45a465, roughness: 0.6 }),
  soil: std({ color: 0x6a4f35, roughness: 0.9 }),
  wood: std({ color: 0xb98a5a, roughness: 0.7 }),
  card: std({ color: 0xc89d62, roughness: 0.85 }),
  dark: std({ color: 0x0b2218, roughness: 0.45, metalness: 0.1 }),
  ink: std({ color: 0x2c5a45, roughness: 0.6 }),
  win: std({ color: 0xf6dd98, emissive: 0xd9a246, emissiveIntensity: 0.3, roughness: 0.4 }),
  glass: phys({ color: 0xbfe8d2, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  water: phys({ color: 0x1f6f5e, metalness: 0.1, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.35, transparent: true, opacity: 0.92 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xfff0c0 }),
  smoke: std({ color: 0xf3ead6, roughness: 1, transparent: true, opacity: 0.85, depthWrite: false }),
};
const SPH = new THREE.SphereGeometry(1, 40, 24), CYL = new THREE.CylinderGeometry(1, 1, 1, 48), CONE = new THREE.ConeGeometry(1, 1, 40);
const RB = new Map();
const rbox = (w, h, d, r = 0.04) => { const k = [w, h, d, r].join(); if (!RB.has(k)) RB.set(k, new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.999)); return RB.get(k); };
function mesh(geo, mat, parent, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); typeof s === "number" ? m.scale.setScalar(s) : m.scale.set(...s); m.rotation.set(...r);
  if (parent) parent.add(m); return m;
}
const group = (parent, p = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); if (parent) parent.add(g); return g; };
function canvasTex(w, h, draw) { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const radial = (stops) => canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const SHMAT = new THREE.MeshBasicMaterial({ map: radial([[0, "rgba(0,0,0,0.6)"], [0.55, "rgba(0,0,0,0.25)"], [1, "rgba(0,0,0,0)"]]), transparent: true, depthWrite: false });
const PLANE = new THREE.PlaneGeometry(1, 1);
const shadow = (parent, x, y, z, sx, sz = sx) => mesh(PLANE, SHMAT, parent, [x, y + 0.004, z], [sx, sz, 1], [-Math.PI / 2, 0, 0]);
const HALO = radial([[0, "rgba(255,214,140,0.55)"], [0.4, "rgba(255,200,120,0.16)"], [1, "rgba(255,200,120,0)"]]);
function halo(parent, p, s, op = 1) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); m.position.set(...p); m.scale.set(s, s, 1); parent.add(m); return m; }
const flagTex = canvasTex(256, 168, (g) => { g.fillStyle = "#D90012"; g.fillRect(0, 0, 256, 56); g.fillStyle = "#0033A0"; g.fillRect(0, 56, 256, 56); g.fillStyle = "#F2A800"; g.fillRect(0, 112, 256, 56); });
const extrude = (shape, depth, bevel = 0.02, seg = 3) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 24 });
function poly(pts) { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; }
function circleShape(r, n = 48) { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, TAU, false); return s; }
function hexShape(r) { return poly(Array.from({ length: 6 }, (_, i) => [Math.cos(Math.PI / 2 + (i * Math.PI) / 3) * r, Math.sin(Math.PI / 2 + (i * Math.PI) / 3) * r])); }
const flat = (geo) => { geo.rotateX(-Math.PI / 2); return geo; }; // shape in XY extruded along +Z -> lying on the floor, extruded up

// ---------------------------------------------------------------- HTML labels pinned to 3D points
const LBL = document.getElementById("labels"); const labels = [];
function label(html, cls = "") { const d = document.createElement("div"); d.className = "lbl " + cls; d.innerHTML = html; LBL.appendChild(d); const L = { d, p: new THREE.Vector3(), o: 0 }; labels.push(L); return L; }
const tmp = new THREE.Vector3();
let LBL_FADE = 1;
function placeLabels() {
  labels.forEach((L) => {
    const o = L.o * LBL_FADE;
    if (o <= 0.001) { if (L.d.style.opacity !== "0") L.d.style.opacity = 0; return; }
    tmp.copy(L.p).project(camera);
    L.d.style.opacity = o.toFixed(3);
    L.d.style.transform = `translate(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * H}px) translate(-50%, -50%) scale(${(0.86 + 0.14 * eo(o)).toFixed(3)})`;
  });
}
const lbl = (L, obj, off, o) => { obj.updateWorldMatrix(true, false); L.p.copy(off).applyMatrix4(obj.matrixWorld); L.o = o; };

// ---------------------------------------------------------------- floating gold bokeh, attached to the camera
const bokeh = (() => {
  const n = 46, pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const tex = radial([[0, "rgba(255,236,190,1)"], [0.35, "rgba(255,214,140,0.5)"], [1, "rgba(255,214,140,0)"]]);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, color: 0xf6d690, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; camera.add(pts); return { pts, pos, n };
})();
function updateBokeh(t) {
  for (let i = 0; i < bokeh.n; i++) {
    const z = -(3 + hash(i + 5) * 12), hh = Math.tan((15 * Math.PI) / 180) * -z, ww = hh * (W / H);
    const sp = 0.03 + hash(i + 3) * 0.06, y0 = hash(i + 9);
    bokeh.pos[i * 3] = (hash(i) * 2 - 1) * ww * 1.1 + Math.sin(t * 0.25 + i) * 0.08;
    bokeh.pos[i * 3 + 1] = (((y0 + t * sp) % 1) * 2 - 1) * hh * 1.1;
    bokeh.pos[i * 3 + 2] = z;
  }
  bokeh.pts.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- shared builders
const SPARK = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 1); s.quadraticCurveTo(0.12, 0.12, 1, 0); s.quadraticCurveTo(0.12, -0.12, 0, -1); s.quadraticCurveTo(-0.12, -0.12, -1, 0); s.quadraticCurveTo(-0.12, 0.12, 0, 1); return s; })());
function sparkles(parent, pts, size = 0.13) { return pts.map((p, i) => { const m = mesh(SPARK, M.glow, parent, p, size); m.userData.ph = i * 1.37; m.userData.s = size; return m; }); }
const twinkle = (arr, t, k = 1) => arr.forEach((m) => { const s = (0.55 + 0.45 * Math.sin(t * 5 + m.userData.ph)) * k; m.visible = s > 0.01; m.scale.setScalar(Math.max(1e-4, m.userData.s * s)); m.rotation.z = t * 0.6 + m.userData.ph; m.quaternion.copy(camera.quaternion); m.rotateZ(t * 0.6 + m.userData.ph); });
const pop = (o, t, t0, d = 0.5, s = 1) => { const k = pr(t, t0, d); o.visible = k > 0; o.scale.setScalar(Math.max(1e-4, eb(k) * s)); return k; };
const shake = (t, t0, a = 0.08, f = 55, damp = 8) => (t > t0 ? Math.exp(-(t - t0) * damp) * Math.sin((t - t0) * f) * a : 0);

// coin: gold rim + faces with an embossed $
const COIN_FACE = canvasTex(256, 256, (g) => {
  const gr = g.createRadialGradient(100, 90, 10, 128, 128, 128); gr.addColorStop(0, "#fff0bf"); gr.addColorStop(0.6, "#e8bd62"); gr.addColorStop(1, "#b9863a");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#a87a34"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 104, 0, TAU); g.stroke();
  g.font = "900 170px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#fff3c9"; g.fillText("$", 132, 140); g.fillStyle = "#9c6e2c"; g.fillText("$", 128, 136);
});
const COIN_GEO = new THREE.CylinderGeometry(0.34, 0.34, 0.07, 56);
COIN_FACE.center.set(0.5, 0.5); COIN_FACE.rotation = -Math.PI / 2;
const COIN_FACE_B = COIN_FACE.clone(); COIN_FACE_B.wrapS = THREE.RepeatWrapping; COIN_FACE_B.repeat.set(-1, 1); COIN_FACE_B.rotation = Math.PI / 2; COIN_FACE_B.needsUpdate = true;
const coinFace = (map) => std({ map, metalness: 0.55, roughness: 0.3, color: 0xffffff, emissive: 0x3a2706, emissiveIntensity: 0.25 });
const COIN_MATS = [M.gold, coinFace(COIN_FACE), coinFace(COIN_FACE_B)];
function coin(parent, p = [0, 0, 0], s = 1) { const g = group(parent, p); g.scale.setScalar(s); mesh(COIN_GEO, COIN_MATS, g, [0, 0, 0], 1, [Math.PI / 2, 0, 0]); return g; } // face toward +z

// Persian question mark (؟): bowl on the left, tube + end caps + dot
const QCURVE = new THREE.CatmullRomCurve3([[0.27, 0.44], [0.24, 0.64], [0.05, 0.77], [-0.17, 0.72], [-0.28, 0.54], [-0.2, 0.37], [-0.04, 0.27], [0.0, 0.14], [0.0, 0.02]].map(([x, y]) => v3(x, y - 0.3, 0)));
const QGEO = new THREE.TubeGeometry(QCURVE, 64, 0.08, 16, false);
function qmark(parent, mat = M.gold, p = [0, 0, 0], s = 1) {
  const g = group(parent, p); g.scale.setScalar(s);
  mesh(QGEO, mat, g); mesh(SPH, mat, g, [0.27, 0.14, 0], 0.08); mesh(SPH, mat, g, [0, -0.28, 0], 0.08); mesh(SPH, mat, g, [0, -0.48, 0], 0.095);
  return g;
}
// gold check badge (faces +z)
function checkBadge(parent, p = [0, 0, 0], r = 0.2) {
  const g = group(parent, p); mesh(CYL, M.gold, g, [0, 0, 0], [r, 0.06, r], [Math.PI / 2, 0, 0]);
  mesh(rbox(r * 0.55, r * 0.2, 0.05, 0.02), M.creamHi, g, [-r * 0.2, -r * 0.08, 0.04], 1, [0, 0, -0.8]);
  mesh(rbox(r * 1.0, r * 0.2, 0.05, 0.02), M.creamHi, g, [r * 0.14, r * 0.08, 0.04], 1, [0, 0, 0.92]);
  return g;
}
// hex tile: bevelled emerald prism with a gold rim on top. Top surface at y = h.
const HEX_R = 0.64, HEX_H = 0.2;
const HEX_GEO = flat(extrude(hexShape(HEX_R - 0.03), HEX_H - 0.06, 0.03, 2)); HEX_GEO.translate(0, 0.03, 0);
const HEX_RIM = (() => { const s = hexShape(HEX_R + 0.005); s.holes.push(hexShape(HEX_R - 0.05)); const g = flat(extrude(s, 0.02, 0)); g.translate(0, HEX_H - 0.012, 0); return g; })();
function hexTile(parent, p = [0, 0, 0], mat = M.tile) { const g = group(parent, p); mesh(HEX_GEO, mat, g); mesh(HEX_RIM, M.gold, g); shadow(g, 0, 0, 0, HEX_R * 3.1); return g; }
// round pedestal, top at y = h
function pedestal(parent, p = [0, 0, 0], r = 0.7, h = 0.22) {
  const g = group(parent, p); mesh(CYL, M.tile, g, [0, h / 2, 0], [r, h, r]);
  mesh(new THREE.TorusGeometry(1, 0.02, 10, 80), M.gold, g, [0, h, 0], [r, r, r], [Math.PI / 2, 0, 0]);
  mesh(new THREE.TorusGeometry(1, 0.012, 8, 80), M.gold, g, [0, 0.03, 0], [r, r, r], [Math.PI / 2, 0, 0]);
  shadow(g, 0, 0, 0, r * 3.2); return g;
}
// expanding ground ring (shockwave / highlight)
const RING_GEO = new THREE.RingGeometry(0.94, 1, 72);
function ring(parent, p = [0, 0, 0], color = 0xf4d68c) { const m = mesh(RING_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), parent, p, 1, [-Math.PI / 2, 0, 0]); return m; }
function ringAt(m, t, t0, d = 0.7, r0 = 0.4, r1 = 1.4) { const k = pr(t, t0, d); m.visible = k > 0 && k < 1; m.scale.setScalar(lerp(r0, r1, eo(k))); m.material.opacity = (1 - k) * 0.9; }
// cloth for flags: a subdivided plane with a travelling wave
function flagCloth(parent, w, h, p) { const m = mesh(new THREE.PlaneGeometry(w, h, 24, 8), std({ map: flagTex, roughness: 0.6, side: THREE.DoubleSide }), parent, p); m.geometry.translate(w / 2, 0, 0); m.userData.base = m.geometry.attributes.position.array.slice(); m.userData.w = w; return m; }
function waveCloth(m, t, amp = 0.06) { const p = m.geometry.attributes.position, b = m.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3] / m.userData.w; p.setZ(i, Math.sin(x * 7 - t * 5.5 + b[i * 3 + 1] * 1.5) * amp * x * 1.6); } p.needsUpdate = true; m.geometry.computeVertexNormals(); }

// ================================================================= miniature businesses (base at y = 0, footprint ~0.95)
// each returns a group; g.userData.h = height (for the coin), g.userData.anim(t) = idle motion
const winRow = (g, n, w, y, z, ww = 0.1, wh = 0.13, mat = M.win) => { for (let k = 0; k < n; k++) mesh(rbox(ww, wh, 0.02, 0.01), mat, g, [(k - (n - 1) / 2) * (w / n), y, z]); };
const sideWin = (g, n, d, y, x, ww = 0.1, wh = 0.13) => { for (let k = 0; k < n; k++) mesh(rbox(0.02, wh, ww, 0.01), M.win, g, [x, y, (k - (n - 1) / 2) * (d / n)]); };

function mShop(parent) {
  const g = group(parent);
  mesh(rbox(0.8, 0.5, 0.56, 0.04), M.cream, g, [0, 0.25, 0]);
  mesh(rbox(0.44, 0.24, 0.02, 0.02), M.win, g, [0.1, 0.22, 0.285]);
  mesh(rbox(0.16, 0.32, 0.03, 0.02), M.emeraldDeep, g, [-0.25, 0.16, 0.285]);
  mesh(SPH, M.gold, g, [-0.2, 0.16, 0.305], 0.015);
  for (let i = 0; i < 6; i++) mesh(rbox(0.135, 0.022, 0.24, 0.01), i % 2 ? M.creamHi : M.emerald, g, [-0.338 + i * 0.135, 0.43, 0.36], 1, [0.5, 0, 0]);
  mesh(rbox(0.84, 0.07, 0.6, 0.03), M.emerald, g, [0, 0.535, 0]);
  mesh(rbox(0.5, 0.14, 0.05, 0.03), M.gold, g, [0, 0.66, 0.18]);
  mesh(rbox(0.36, 0.035, 0.02, 0.01), M.emeraldDeep, g, [0, 0.66, 0.21]);
  g.userData.h = 0.75; return g;
}
function mOffice(parent) {
  const g = group(parent);
  mesh(rbox(0.56, 1.02, 0.56, 0.04), M.creamHi, g, [0, 0.51, 0]);
  for (let r = 0; r < 5; r++) { winRow(g, 3, 0.5, 0.3 + r * 0.16, 0.285, 0.1, 0.1); sideWin(g, 3, 0.5, 0.3 + r * 0.16, 0.285, 0.1, 0.1); }
  mesh(rbox(0.22, 0.2, 0.03, 0.02), M.emeraldDeep, g, [0, 0.1, 0.285]);
  mesh(rbox(0.62, 0.06, 0.62, 0.02), M.gold, g, [0, 1.05, 0]);
  mesh(rbox(0.36, 0.12, 0.36, 0.03), M.emerald, g, [0, 1.14, 0]);
  mesh(CYL, M.gold, g, [0.08, 1.32, 0.05], [0.012, 0.26, 0.012]); mesh(SPH, M.gold, g, [0.08, 1.46, 0.05], 0.025);
  g.userData.h = 1.5; return g;
}
const CROSS_M = std({ color: 0x2f9a64, emissive: 0x1f7a4d, emissiveIntensity: 0.6, roughness: 0.4 });
function mClinic(parent) {
  const g = group(parent);
  mesh(rbox(0.84, 0.52, 0.6, 0.04), M.creamHi, g, [0, 0.26, 0]);
  mesh(rbox(0.88, 0.06, 0.64, 0.02), M.emerald, g, [0, 0.55, 0]);
  mesh(rbox(0.22, 0.3, 0.02, 0.02), M.glass, g, [0, 0.15, 0.305]); mesh(rbox(0.26, 0.04, 0.05, 0.02), M.emerald, g, [0, 0.33, 0.31]);
  [-0.27, 0.27].forEach((x) => mesh(rbox(0.16, 0.14, 0.02, 0.01), M.win, g, [x, 0.28, 0.305]));
  const sign = group(g, [0, 0.82, 0.1]); mesh(CYL, M.gold, sign, [0, -0.17, 0], [0.012, 0.16, 0.012]);
  mesh(CYL, M.creamHi, sign, [0, 0, 0], [0.18, 0.05, 0.18], [Math.PI / 2, 0, 0]); mesh(new THREE.TorusGeometry(0.18, 0.016, 8, 48), M.gold, sign);
  mesh(rbox(0.22, 0.07, 0.04, 0.015), CROSS_M, sign, [0, 0, 0.03]); mesh(rbox(0.07, 0.22, 0.04, 0.015), CROSS_M, sign, [0, 0, 0.03]);
  g.userData.h = 1.0; g.userData.anim = (t) => { sign.rotation.y = Math.sin(t * 1.4) * 0.35; }; return g;
}
const TOOTH = (() => { const s = poly([[0, 0], [0.29, 0], [0.29, 0.17]]); const geo = extrude(s, 0.56, 0.008, 1); geo.translate(0, 0, -0.28); return geo; })();
function mFactory(parent) {
  const g = group(parent);
  mesh(rbox(0.88, 0.36, 0.58, 0.03), M.cream, g, [0, 0.18, 0]);
  for (let i = 0; i < 3; i++) { mesh(TOOTH, M.emerald, g, [-0.435 + i * 0.29, 0.36, 0]); mesh(rbox(0.012, 0.15, 0.5, 0.004), M.win, g, [-0.435 + (i + 1) * 0.29 - 0.008, 0.44, 0]); }
  winRow(g, 4, 0.8, 0.17, 0.295, 0.12, 0.1);
  const puffs = [];
  [[-0.3, -0.12], [-0.12, -0.18]].forEach(([x, z], c) => {
    mesh(CYL, M.creamHi, g, [x, 0.6, z], [0.055, 0.5, 0.055]); mesh(CYL, M.gold, g, [x, 0.78, z], [0.062, 0.04, 0.062]);
    for (let i = 0; i < 3; i++) { const m = mesh(SPH, M.smoke.clone(), g, [x, 0.9, z], 0.05); m.userData = { x, z, ph: i / 3 + c * 0.17 }; puffs.push(m); }
  });
  g.userData.h = 1.05;
  g.userData.anim = (t) => puffs.forEach((m) => { const k = (t * 0.55 + m.userData.ph) % 1; m.position.set(m.userData.x + k * 0.12, 0.88 + k * 0.42, m.userData.z); m.scale.setScalar(0.04 + k * 0.08); m.material.opacity = 0.85 * (1 - k) * cl(k * 6); });
  return g;
}
const GEAR = (() => { const s = new THREE.Shape(), n = 10, R = 0.25, r = 0.2; for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * TAU, k = (i % 4 < 2) ? R : r; const x = Math.cos(a) * k, y = Math.sin(a) * k; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); s.holes.push((() => { const h = new THREE.Path(); h.absarc(0, 0, 0.07, 0, TAU, true); return h; })()); const geo = extrude(s, 0.06, 0.012, 2); geo.translate(0, 0, -0.03); return geo; })();
function mWorkshop(parent) {
  const g = group(parent);
  mesh(rbox(0.6, 0.46, 0.56, 0.04), M.cream, g, [0.14, 0.23, -0.02]);
  mesh(rbox(0.64, 0.06, 0.6, 0.02), M.emerald, g, [0.14, 0.49, -0.02]);
  mesh(rbox(0.36, 0.3, 0.02, 0.01), M.emeraldDeep, g, [0.14, 0.16, 0.265]);
  for (let i = 0; i < 4; i++) mesh(rbox(0.34, 0.012, 0.01, 0.004), M.dark, g, [0.14, 0.05 + i * 0.07, 0.277]);
  const gear = mesh(GEAR, M.gold, g, [-0.26, 0.42, 0.14]); const gear2 = mesh(GEAR, M.goldSatin, g, [-0.04, 0.68, 0.06], 0.55);
  mesh(CYL, M.gold, g, [-0.26, 0.21, 0.14], [0.02, 0.42, 0.02]);
  g.userData.h = 0.95; g.userData.anim = (t) => { gear.rotation.z = -t * 1.2; gear2.rotation.z = t * 1.2 / 0.55 + 0.16; }; return g;
}
const PIN = (() => { const pts = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI; pts.push(new THREE.Vector2(Math.sin(a) * 0.12, 0.2 + Math.cos(a) * 0.12)); } pts.push(new THREE.Vector2(0.02, 0.02)); pts.push(new THREE.Vector2(0, 0)); return new THREE.LatheGeometry(pts.reverse(), 40); })();
function mLand(parent) {
  const g = group(parent);
  const plot = flat(extrude(hexShape(0.5), 0.035, 0.01, 1)); mesh(plot, M.grass, g, [0, 0, 0]);
  const P = [[-0.32, -0.32], [0, -0.32], [0.32, -0.32], [0.32, 0], [0.32, 0.32], [0, 0.32], [-0.32, 0.32], [-0.32, 0]];
  P.forEach(([x, z]) => mesh(rbox(0.04, 0.17, 0.04, 0.01), M.creamHi, g, [x, 0.115, z]));
  [[0, -0.32, 0.64, 0], [0.32, 0, 0.64, 1], [0, 0.32, 0.64, 0], [-0.32, 0, 0.64, 1]].forEach(([x, z, L, rot]) => [0.1, 0.16].forEach((y) => mesh(rbox(rot ? 0.02 : L, 0.02, rot ? L : 0.02, 0.006), M.creamHi, g, [x, y, z])));
  for (let i = 0; i < 7; i++) mesh(SPH, M.leaf, g, [(hash(i + 40) - 0.5) * 0.5, 0.04, (hash(i + 50) - 0.5) * 0.5], [0.05, 0.03, 0.05]);
  const pin = group(g, [0, 0.12, 0]); mesh(PIN, M.gold, pin, [0, 0, 0], 1.3); mesh(SPH, M.creamHi, pin, [0, 0.26, 0.11], 0.04);
  const sh = shadow(g, 0, 0.04, 0, 0.35);
  g.userData.h = 0.6; g.userData.anim = (t) => { pin.position.y = 0.16 + Math.sin(t * 2.6) * 0.05; pin.rotation.y = Math.sin(t * 1.3) * 0.5; sh.scale.setScalar(0.35 - Math.sin(t * 2.6) * 0.05); }; return g;
}
const BLADE = (() => { const s = poly([[0, 0.02], [0.05, 0.05], [0.025, 0.4], [0.0, 0.42], [-0.012, 0.05]]); const geo = extrude(s, 0.018, 0.006, 1); return geo; })();
function mBeauty(parent) {
  const g = group(parent);
  mesh(rbox(0.78, 0.5, 0.56, 0.04), M.creamHi, g, [0, 0.25, 0]);
  mesh(rbox(0.82, 0.06, 0.6, 0.02), M.copper, g, [0, 0.53, 0]);
  const arch = new THREE.Shape(); arch.moveTo(-0.15, 0); arch.lineTo(0.15, 0); arch.lineTo(0.15, 0.18); arch.absarc(0, 0.18, 0.15, 0, Math.PI, false); arch.closePath();
  mesh(extrude(arch, 0.02, 0.006, 1), M.win, g, [0.12, 0.06, 0.28]); mesh(rbox(0.14, 0.3, 0.03, 0.02), M.emeraldDeep, g, [-0.24, 0.15, 0.28]);
  const sc = group(g, [0, 0.82, 0.08]); sc.scale.setScalar(0.95);
  const a = group(sc), b = group(sc);
  mesh(BLADE, M.gold, a, [0, 0, 0.012]); mesh(new THREE.TorusGeometry(0.075, 0.02, 10, 32), M.gold, a, [-0.045, -0.13, 0.02]);
  mesh(BLADE, M.gold, b, [0, 0, -0.012], [-1, 1, 1]); mesh(new THREE.TorusGeometry(0.075, 0.02, 10, 32), M.gold, b, [0.045, -0.13, -0.004]);
  mesh(SPH, M.creamHi, sc, [0, 0, 0.03], 0.022);
  mesh(CYL, M.gold, g, [0, 0.62, 0.08], [0.012, 0.16, 0.012]);
  g.userData.h = 1.25; g.userData.anim = (t) => { const o = 0.18 + 0.16 * Math.max(0, Math.sin(t * 4)); a.rotation.z = -o; b.rotation.z = o; sc.rotation.y = Math.sin(t * 0.9) * 0.3; }; return g;
}
function mSpa(parent) {
  const g = group(parent);
  mesh(CYL, M.wood, g, [0, 0.03, 0], [0.42, 0.06, 0.42]); mesh(new THREE.TorusGeometry(0.42, 0.012, 8, 64), M.gold, g, [0, 0.06, 0], 1, [Math.PI / 2, 0, 0]);
  const st = group(g, [-0.14, 0.06, -0.04]);
  [[0.2, 0.085, 0.18, M.emeraldDeep], [0.16, 0.075, 0.14, M.sage], [0.115, 0.065, 0.1, M.creamHi], [0.07, 0.05, 0.065, M.sage]].reduce((y, [rx, ry, rz, m]) => { mesh(SPH, m, st, [0, y + ry, 0], [rx, ry, rz]); return y + ry * 1.85; }, 0);
  const lotus = group(g, [0.2, 0.07, 0.12]);
  const petal = phys({ color: 0xf2d3b8, roughness: 0.5, clearcoat: 0.4 });
  mesh(CYL, M.leaf, lotus, [0, 0.005, 0], [0.16, 0.01, 0.16]);
  for (let ring2 = 0; ring2 < 2; ring2++) for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + ring2 * 0.45, r0 = ring2 ? 0.035 : 0.06; const p = mesh(SPH, petal, lotus, [Math.cos(a) * r0, 0.05 + ring2 * 0.015, Math.sin(a) * r0], [0.03, 0.06, 0.018]); p.rotation.set(0, -a + Math.PI / 2, 0); p.rotateX(ring2 ? -0.35 : -0.7); }
  mesh(SPH, M.gold, lotus, [0, 0.06, 0], 0.025);
  const leaf = group(g, [0.2, 0.06, -0.2]); for (let i = 0; i < 3; i++) { const s = mesh(CYL, M.leaf, leaf, [i * 0.05 - 0.05, 0.12 + i * 0.03, 0], [0.012, 0.24 + i * 0.06, 0.012]); s.rotation.z = (i - 1) * 0.18; }
  const glowS = halo(g, [0.2, 0.18, 0.12], 0.6, 0.5);
  g.userData.h = 0.55; g.userData.anim = (t) => { lotus.rotation.y = t * 0.4; glowS.material.opacity = 0.35 + 0.15 * Math.sin(t * 2); }; return g;
}
const VAULT = (() => { const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 40, 1, false, 0, Math.PI); geo.rotateZ(Math.PI / 2); geo.rotateX(Math.PI / 2); return geo; })();
function mWarehouse(parent) {
  const g = group(parent);
  mesh(rbox(0.9, 0.38, 0.6, 0.03), M.cream, g, [0, 0.19, -0.02]);
  mesh(VAULT, M.emerald, g, [0, 0.37, -0.02], [1, 0.55, 1.02]);
  mesh(rbox(0.36, 0.28, 0.02, 0.01), M.emeraldDeep, g, [-0.12, 0.14, 0.285]);
  for (let i = 0; i < 5; i++) mesh(rbox(0.34, 0.01, 0.01, 0.004), M.dark, g, [-0.12, 0.04 + i * 0.055, 0.297]);
  [[0.24, 0.07, 0.36, 0], [0.38, 0.07, 0.36, 0.2], [0.31, 0.21, 0.36, -0.15]].forEach(([x, y, z, r]) => { const b = mesh(rbox(0.14, 0.14, 0.14, 0.012), M.card, g, [x, y, z], 1, [0, r, 0]); mesh(rbox(0.145, 0.025, 0.145, 0.004), M.wood, b, [0, 0.0, 0]); });
  g.userData.h = 0.75; return g;
}
const ARC = new THREE.TorusGeometry(0.3, 0.012, 8, 40, Math.PI);
function mGreenhouse(parent) {
  const g = group(parent);
  mesh(rbox(0.88, 0.05, 0.62, 0.02), M.soil, g, [0, 0.025, 0]);
  const vault = new THREE.CylinderGeometry(0.3, 0.3, 0.82, 40, 1, true, 0, Math.PI); vault.rotateZ(Math.PI / 2); vault.rotateX(Math.PI / 2);
  mesh(vault, M.glass, g, [0, 0.05, 0]);
  for (let i = 0; i < 5; i++) mesh(ARC, M.gold, g, [-0.41 + i * 0.205, 0.05, 0], 1, [0, Math.PI / 2, 0]);
  mesh(rbox(0.82, 0.012, 0.012, 0.004), M.gold, g, [0, 0.35, 0]);
  const plants = [];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { const p = group(g, [-0.32 + i * 0.16, 0.05, r ? 0.1 : -0.1]); mesh(CYL, M.leaf, p, [0, 0.04, 0], [0.008, 0.08, 0.008]); mesh(SPH, i % 2 ? M.leaf : M.grass, p, [0, 0.1, 0], [0.055, 0.05, 0.055]); if (i % 2 === r) mesh(SPH, M.copper, p, [0.03, 0.11, 0.03], 0.018); plants.push(p); }
  g.userData.h = 0.6; g.userData.anim = (t) => plants.forEach((p, i) => (p.rotation.z = Math.sin(t * 1.5 + i) * 0.06)); return g;
}
function mFarm(parent) {
  const g = group(parent);
  mesh(rbox(0.86, 0.05, 0.86, 0.02), M.soil, g, [0, 0.025, 0]);
  const stalks = [];
  for (let r = 0; r < 4; r++) {
    mesh(rbox(0.8, 0.03, 0.08, 0.012), std({ color: 0x5a422c, roughness: 0.95 }), g, [0, 0.06, -0.3 + r * 0.2]);
    for (let i = 0; i < 6; i++) { if (r === 3 && i > 2) continue; const s = group(g, [-0.33 + i * 0.13, 0.07, -0.3 + r * 0.2]); mesh(CYL, M.goldSatin, s, [0, 0.08, 0], [0.007, 0.16, 0.007]); mesh(SPH, M.gold, s, [0, 0.18, 0], [0.022, 0.05, 0.022]); stalks.push(s); }
  }
  const tr = group(g, [0.26, 0.05, 0.3]); tr.rotation.y = -0.5;
  mesh(rbox(0.2, 0.1, 0.12, 0.02), M.emerald, tr, [0.02, 0.09, 0]); mesh(rbox(0.1, 0.12, 0.11, 0.02), M.creamHi, tr, [-0.05, 0.2, 0]); mesh(rbox(0.11, 0.015, 0.12, 0.006), M.emeraldDeep, tr, [-0.05, 0.265, 0]);
  [[-0.05, 0.07, 0.07, 0.07], [-0.05, 0.07, -0.07, 0.07], [0.1, 0.045, 0.065, 0.045], [0.1, 0.045, -0.065, 0.045]].forEach(([x, y, z, r]) => { mesh(CYL, M.dark, tr, [x, y, z], [r, 0.035, r], [Math.PI / 2, 0, 0]); mesh(CYL, M.gold, tr, [x, y, z + Math.sign(z) * 0.019], [r * 0.45, 0.004, r * 0.45], [Math.PI / 2, 0, 0]); });
  g.userData.h = 0.5; g.userData.anim = (t) => { stalks.forEach((s, i) => (s.rotation.z = Math.sin(t * 2 + i * 0.6) * 0.12)); tr.position.x = 0.26 + Math.sin(t * 0.8) * 0.03; }; return g;
}
const GABLE = (() => { const geo = extrude(poly([[-0.3, 0], [0.3, 0], [0, 0.2]]), 0.44, 0.01, 1); geo.translate(0, 0, -0.22); return geo; })();
function sheep(parent, p) {
  const g = group(parent, p); const wool = phys({ color: 0xf7f0e2, roughness: 0.9, sheen: 1, sheenColor: 0xffffff });
  [[0, 0.17, 0, 0.09], [0.07, 0.18, 0.02, 0.075], [-0.07, 0.18, -0.01, 0.075], [0.02, 0.23, 0, 0.07], [-0.03, 0.17, 0.05, 0.07], [0.03, 0.16, -0.05, 0.07]].forEach(([x, y, z, r]) => mesh(SPH, wool, g, [x, y, z], r));
  const head = group(g, [0.13, 0.2, 0]); mesh(SPH, M.dark, head, [0.03, 0, 0], [0.055, 0.045, 0.045]); mesh(SPH, M.dark, head, [0.0, 0.03, 0.045], [0.02, 0.012, 0.03]); mesh(SPH, M.dark, head, [0.0, 0.03, -0.045], [0.02, 0.012, 0.03]);
  [[0.06, 0.04], [0.06, -0.04], [-0.06, 0.04], [-0.06, -0.04]].forEach(([x, z]) => mesh(CYL, M.dark, g, [x, 0.05, z], [0.014, 0.1, 0.014]));
  g.userData.head = head; return g;
}
function mLivestock(parent) {
  const g = group(parent);
  mesh(rbox(0.5, 0.32, 0.44, 0.03), std({ color: 0xc8643f, roughness: 0.6 }), g, [-0.14, 0.16, -0.12]);
  mesh(GABLE, M.creamHi, g, [-0.14, 0.32, -0.12], [0.93, 1, 1.04]);
  mesh(rbox(0.2, 0.22, 0.02, 0.01), M.creamHi, g, [-0.14, 0.12, 0.105]);
  [0.8, -0.8].forEach((a) => mesh(rbox(0.25, 0.022, 0.012, 0.005), std({ color: 0xc8643f, roughness: 0.6 }), g, [-0.14, 0.12, 0.118], 1, [0, 0, a]));
  mesh(rbox(0.1, 0.1, 0.02, 0.01), M.creamHi, g, [-0.14, 0.38, 0.1]);
  const s1 = sheep(g, [0.22, 0, 0.18]); s1.rotation.y = -0.6; const s2 = sheep(g, [0.26, 0, -0.16]); s2.rotation.y = 2.4; s2.scale.setScalar(0.85);
  g.userData.h = 0.6; g.userData.anim = (t) => { s1.userData.head.rotation.z = -0.35 - 0.3 * Math.max(0, Math.sin(t * 1.7)); s2.userData.head.rotation.z = -0.3 - 0.3 * Math.max(0, Math.sin(t * 1.7 + 2)); }; return g;
}
const FISH = (() => { const s = new THREE.Shape(); s.moveTo(-0.13, 0); s.quadraticCurveTo(-0.02, 0.075, 0.1, 0.012); s.lineTo(0.17, 0.06); s.lineTo(0.15, 0); s.lineTo(0.17, -0.06); s.lineTo(0.1, -0.012); s.quadraticCurveTo(-0.02, -0.075, -0.13, 0); const geo = extrude(s, 0.03, 0.012, 2); geo.translate(0, 0, -0.015); return geo; })();
function mFish(parent) {
  const g = group(parent);
  mesh(new THREE.TorusGeometry(0.38, 0.05, 12, 56), M.creamHi, g, [0, 0.04, 0], [1, 1, 0.7], [Math.PI / 2, 0, 0]);
  const water = mesh(new THREE.CircleGeometry(0.37, 56), M.water, g, [0, 0.05, 0], 1, [-Math.PI / 2, 0, 0]);
  mesh(CYL, std({ color: 0x0f3a2a, roughness: 0.8 }), g, [0, 0.02, 0], [0.37, 0.03, 0.37]);
  const fish = group(g); mesh(FISH, M.gold, fish); mesh(SPH, M.dark, fish, [-0.085, 0.015, 0.02], 0.01);
  const rip = [ring(g, [0, 0.055, 0], 0xcfeee0), ring(g, [0, 0.055, 0], 0xcfeee0)];
  for (let i = 0; i < 3; i++) { const r = mesh(CYL, M.leaf, g, [-0.3 + i * 0.05, 0.16 + i * 0.02, -0.28], [0.01, 0.28 + i * 0.05, 0.01]); r.rotation.z = (i - 1) * 0.15; }
  g.userData.h = 0.65;
  g.userData.anim = (t) => {
    const P = 1.7, k = (t % P) / P, j = cl((k - 0.1) / 0.6);
    fish.visible = j > 0 && j < 1;
    const x = lerp(0.2, -0.2, j), y = 0.05 + Math.sin(Math.PI * j) * 0.42;
    fish.position.set(x, y, 0.02); fish.rotation.set(0, 0, Math.atan2(-Math.cos(Math.PI * j) * 0.42 * Math.PI, 0.4));
    rip[0].position.x = 0.2; rip[1].position.x = -0.2;
    const r0 = pr(k, 0.08, 0.4), r1 = pr(k, 0.7, 0.4);
    rip[0].visible = r0 > 0 && r0 < 1; rip[0].scale.setScalar(0.04 + r0 * 0.14); rip[0].material.opacity = (1 - r0) * 0.8;
    rip[1].visible = r1 > 0 && r1 < 1; rip[1].scale.setScalar(0.04 + r1 * 0.14); rip[1].material.opacity = (1 - r1) * 0.8;
  };
  return g;
}

// ================================================================= scenes
const SC = {};
const root = (id) => { const g = group(scene); g.visible = false; SC[id] = { g }; return g; };
const floorMat = std({ color: 0x0c271b, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.25, transparent: true, depthWrite: false, alphaMap: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#999"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }) });
const floorDisc = (parent, r, y = 0) => mesh(new THREE.CircleGeometry(r, 72), floorMat, parent, [0, y, 0], 1, [-Math.PI / 2, 0, 0]);

// ---------- hook: "what do you do in Iran? earn dollars from it here"
{ const g = root("hook"), id = "hook";
  floorDisc(g, 6);
  const ped = pedestal(g, [0, 0, 0], 0.88, 0.24);
  const bc = group(g, [0, 0.24, 0]);
  const leather = phys({ color: 0x1f6a45, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.3 });
  mesh(rbox(1.36, 0.6, 0.44, 0.07), leather, bc, [0, 0.3, 0]);
  mesh(rbox(1.38, 0.03, 0.46, 0.012), M.gold, bc, [0, 0.6, 0]);
  const lid = group(bc, [0, 0.6, -0.22]);
  mesh(rbox(1.36, 0.22, 0.44, 0.07), leather, lid, [0, 0.11, 0.22]);
  [-0.4, 0.4].forEach((x) => { mesh(rbox(0.12, 0.13, 0.04, 0.02), M.gold, bc, [x, 0.6, 0.235]); mesh(rbox(0.05, 0.04, 0.02, 0.01), M.dark, bc, [x, 0.585, 0.258]); });
  [-0.62, 0.62].forEach((x) => [0.08, 0.52].forEach((y) => mesh(rbox(0.1, 0.1, 0.46, 0.03), M.gold, bc, [x, y, 0])));
  const handle = new THREE.TorusGeometry(0.17, 0.035, 12, 32, Math.PI);
  mesh(handle, M.gold, lid, [0, 0.22, 0.22]); [-0.17, 0.17].forEach((x) => mesh(rbox(0.07, 0.04, 0.07, 0.015), M.gold, lid, [x, 0.23, 0.22]));
  const inner = mesh(rbox(1.24, 0.04, 0.34, 0.02), std({ color: 0xffd98a, emissive: 0xffb040, emissiveIntensity: 1.4 }), bc, [0, 0.58, 0]);
  const innerGlow = halo(bc, [0, 0.9, 0], 2.6, 0);
  const badge = group(bc, [0.47, 0.37, 0.235]);
  mesh(CYL, M.gold, badge, [0, 0, 0], [0.15, 0.04, 0.15], [Math.PI / 2, 0, 0]); mesh(new THREE.CircleGeometry(0.125, 48), std({ map: flagTex, roughness: 0.5 }), badge, [0, 0, 0.022]);
  const q = qmark(g, M.gold, [0, 1.62, 0.05], 0.95);
  const qGlow = halo(g, [0, 1.6, -0.2], 1.8, 0.5);
  const coins = []; for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * (i / 8)); coins.push({ c: coin(g, [0, 0, 0], 0.62), to: v3(Math.cos(a) * 1.25, 1.05 + Math.sin(a) * 0.75, -0.2 + hash(i + 3) * 0.3), d: i * 0.045 + hash(i) * 0.04 }); }
  const hero = coin(g, [0, 0, 0], 1.0); const heroGlow = halo(g, [0, 1.75, 0], 2.2, 0);
  const sp = sparkles(g, [[-1.15, 1.9, 0.3], [1.2, 1.6, 0.2], [-0.8, 0.5, 0.6], [0.95, 2.25, 0], [0.2, 2.4, 0.3]], 0.12);
  SC[id].update = (t) => {
    const s = S[id], lt = t;
    orbit(v3(0, 1.0, 0), 0.32 - 0.22 * eio(pr(t, 0, s.next)), 0.2, lerp(9.0, 8.3, eio(pr(t, 0, s.next))));
    const kin = eo(pr(t, 0.0, 0.8)); bc.position.y = 0.24 + (1 - kin) * -0.6; bc.scale.setScalar(0.85 + 0.15 * eb(pr(t, 0, 0.7)));
    bc.rotation.y = Math.sin(t * 0.8) * 0.06;
    const open = eio(pr(t, AN.dollar - 0.15, 0.45)); lid.rotation.x = -open * 1.85;
    inner.visible = open > 0.05; innerGlow.material.opacity = open * (0.38 + 0.08 * Math.sin(t * 6));
    pop(badge, t, AN.here + 0.02, 0.5, 1); badge.rotation.y = (1 - eo(pr(t, AN.here, 0.6))) * TAU;
    const qOut = eio(pr(t, AN.dollar - 0.3, 0.3));
    const kq = pop(q, t, 0.35, 0.55, 0.95 * (1 - 0.999 * qOut)); q.position.y = 1.62 + Math.sin(t * 2.2) * 0.06; q.rotation.y = Math.sin(t * 1.3) * 0.45;
    qGlow.material.opacity = 0.45 * cl(kq) * (1 - qOut);
    coins.forEach(({ c, to, d }, i) => {
      const k = pr(t, AN.dollar + 0.05 + d, 0.7); c.visible = k > 0;
      const e = eo(k), from = v3(0, 0.85, 0);
      c.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e) + Math.sin(Math.PI * e) * 0.5 + (k >= 1 ? Math.sin(t * 2 + i) * 0.04 : 0), lerp(from.z, to.z, e));
      c.rotation.set(0.3 * Math.sin(t + i), t * 3 + i, 0); c.scale.setScalar(0.62 * (0.3 + 0.7 * e));
    });
    const kh = pr(t, AN.dollar + 0.2, 0.8); hero.visible = kh > 0; const eh = eo(kh);
    hero.position.set(0, lerp(0.85, 1.62, eh) + (kh >= 1 ? Math.sin(t * 2) * 0.04 : 0), lerp(0, 0.35, eh)); hero.scale.setScalar(1.0 * (0.2 + 0.8 * eb(kh)));
    hero.rotation.set(0, (1 - eh) * TAU * 1.5 + Math.sin(t * 1.6) * 0.35, 0);
    heroGlow.position.copy(hero.position).add(v3(0, 0, -0.3)); heroGlow.material.opacity = 0.4 * eh;
    twinkle(sp, t, eo(pr(t, AN.dollar + 0.3, 0.6)));
  };
}

// ---------- city: every kind of business becomes one hex tile of a tidy miniature city; then Armenia + dollar income
{ const g = root("city"), id = "city";
  floorDisc(g, 9);
  const R = 0.71, w = Math.sqrt(3) * R, dz = 1.5 * R;
  const keys = ["shop", "office", "clinic", "factory", "workshop", "land", "beauty", "spa", "warehouse", "greenhouse", "farm", "livestock", "fish"];
  const makers = [mShop, mOffice, mClinic, mFactory, mWorkshop, mLand, mBeauty, mSpa, mWarehouse, mGreenhouse, mFarm, mLivestock, mFish];
  const pos = [[1.5, -1], [0.5, -1], [-0.5, -1], [-1.5, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [1.5, 1], [0.5, 1], [-0.5, 1], [-1.5, 1]].map(([x, z]) => v3(x * w, 0, z * dz));
  const yaws = [0.15, 0.1, 0, -0.15, -0.2, 0, 0.1, 0.2, 0.25, 0.2, 0, -0.1, -0.2];
  const ghostM = new THREE.MeshBasicMaterial({ color: 0xdcad58, transparent: true, opacity: 0, depthWrite: false });
  const ghosts = pos.map((p) => mesh(HEX_RIM, ghostM, g, [p.x, -HEX_H + 0.03, p.z]));
  const slots = keys.map((k, i) => {
    const tile = hexTile(g, [pos[i].x, 0, pos[i].z]); const m = makers[i](tile); m.position.y = HEX_H; m.rotation.y = yaws[i];
    const rg = ring(g, [pos[i].x, 0.02, pos[i].z]); const hl = halo(g, [pos[i].x, 0.5, pos[i].z], 2.2, 0);
    const c = coin(g, [pos[i].x, 0, pos[i].z], 0.5);
    return { tile, m, rg, hl, c, a: AN[k], p: pos[i] };
  });
  // flag of Armenia rising behind the city
  const flag = group(g, [0, 0, -2.55]);
  mesh(CYL, M.tile, flag, [0, 0.08, 0], [0.32, 0.16, 0.32]); mesh(new THREE.TorusGeometry(0.32, 0.02, 8, 48), M.gold, flag, [0, 0.16, 0], 1, [Math.PI / 2, 0, 0]);
  const pole = group(flag); mesh(CYL, M.gold, pole, [0, 1.4, 0], [0.035, 2.8, 0.035]); mesh(SPH, M.gold, pole, [0, 2.84, 0], 0.07);
  const cloth = flagCloth(pole, 1.35, 0.88, [0.035, 2.34, 0]);
  const flagGlow = halo(flag, [0.7, 2.3, -0.6], 3.2, 0);
  const sweep = ring(g, [0, 0.03, -2.55]);
  const focus = (t) => { // piecewise path through the tiles in the order they appear
    if (t <= slots[0].a) return slots[0].p.clone();
    for (let i = 0; i < slots.length - 1; i++) if (t < slots[i + 1].a) return slots[i].p.clone().lerp(slots[i + 1].p, eio(pr(t, slots[i].a + 0.05, slots[i + 1].a - slots[i].a)));
    return slots[slots.length - 1].p.clone();
  };
  SC[id].update = (t) => {
    // camera: glide along the newest tiles (smoothed), then pull up to the whole city, then tilt to the flag
    // focus: the newest tiles, weighted by recency (continuous, so the camera glides)
    const acc = v3(0, 0, 0); let ws = 0, age = 0;
    for (let i = slots.length - 1; i >= 0; i--) { const k = eo(pr(t, slots[i].a - 0.35, 0.7)); if (k <= 0) continue; const wgt = k * Math.exp(-0.85 * age); acc.addScaledVector(slots[i].p, wgt); ws += wgt; age += k; }
    if (ws > 0) acc.multiplyScalar(1 / ws); else acc.copy(slots[0].p);
    const nIn = slots.filter((s) => t > s.a).length;
    const ov = eio(pr(t, AN.nodiff - 0.35, 1.5)), fl = eio(pr(t, AN.arm - 0.5, 1.6));
    const tg = acc.clone().lerp(v3(0, 0.2, 0), ov).add(v3(0, 0.35 + 0.9 * fl, -0.4 * fl));
    const yaw = lerp(0.2 + Math.sin(t * 0.35) * 0.08, 0.42 - (t - AN.nodiff) * 0.045, ov);
    const pitch = lerp(lerp(0.62, 0.7, nIn / 13), 0.72, ov) - 0.3 * fl;
    const dist = lerp(lerp(8.4, 9.4, nIn / 13), 15.6, ov) - 0.4 * fl;
    // opening: a high view of the 13 empty lots, then swoop down to the first shop
    const iv = 1 - eio(pr(t, S[id].start + 0.15, 0.95));
    orbit(tg.lerp(v3(0, 0.1, 0.2), iv), lerp(yaw, 0.3, iv), lerp(pitch, 1.0, iv), lerp(dist, 21, iv));
    ghostM.opacity = 0.45 * eo(pr(t, S[id].start, 0.6));
    slots.forEach((s, i) => {
      ghosts[i].visible = t < s.a;
      const k = pr(t, s.a - 0.14, 0.5); s.tile.visible = k > 0;
      s.tile.position.y = -0.6 * (1 - eo(k)); s.tile.scale.setScalar(Math.max(1e-4, 0.7 + 0.3 * eo(k)));
      const km = pr(t, s.a - 0.04, 0.5); s.m.visible = km > 0; s.m.scale.setScalar(Math.max(1e-4, eb(km)));
      if (s.m.userData.anim) s.m.userData.anim(t + i * 0.37);
      ringAt(s.rg, t, s.a + 0.12, 0.7, 0.5, 1.35);
      const nxt = i < slots.length - 1 ? slots[i + 1].a : AN.nodiff;
      s.hl.material.opacity = 0.32 * eo(pr(t, s.a, 0.25)) * (1 - pr(t, nxt - 0.05, 0.4));
      // dollar income: a coin rises from every business
      const kc = pr(t, AN.income + 0.05 + i * 0.055, 0.6), h = s.m.userData.h + HEX_H;
      s.c.visible = kc > 0; s.c.position.set(s.p.x, h + 0.2 + eo(kc) * 0.45 + (kc >= 1 ? Math.sin(t * 2.2 + i) * 0.05 : 0), s.p.z);
      s.c.scale.setScalar(Math.max(1e-4, 0.55 * eb(kc))); s.c.rotation.set(0, t * 2.2 + i, 0);
    });
    const kf = pr(t, AN.arm - 0.35, 0.9); flag.visible = kf > 0; flag.scale.setScalar(Math.max(1e-4, eo(kf)));
    pole.position.y = -2.8 * (1 - eo(pr(t, AN.arm - 0.3, 1.0))); waveCloth(cloth, t, 0.07);
    flagGlow.material.opacity = 0.0;
    ringAt(sweep, t, AN.same - 0.1, 1.6, 0.3, 6.5);
  };
}

// ---------- find: "we find the right property for your budget and goal, to rent or to buy"
const KEY_BOW = (() => { const s = circleShape(0.42); const h = new THREE.Path(); [[0, 0.2], [0.2, 0.02], [0.13, 0.02], [0.13, -0.2], [-0.13, -0.2], [-0.13, 0.02], [-0.2, 0.02]].forEach(([x, y], i) => (i ? h.lineTo(x, y) : h.moveTo(x, y))); h.closePath(); s.holes.push(h); const geo = extrude(s, 0.1, 0.03, 3); geo.translate(0, 0, -0.05); return geo; })();
function goldKey(parent, p = [0, 0, 0], s = 1) { // bow (with a house-shaped cut-out) on the left, shaft along +x, bit hanging down
  const g = group(parent, p); g.scale.setScalar(s);
  mesh(KEY_BOW, M.gold, g, [-0.62, 0, 0]);
  mesh(CYL, M.gold, g, [0.2, 0, 0], [0.075, 1.15, 0.075], [0, 0, Math.PI / 2]); mesh(CYL, M.gold, g, [-0.18, 0, 0], [0.11, 0.1, 0.11], [0, 0, Math.PI / 2]);
  mesh(rbox(0.12, 0.26, 0.1, 0.03), M.gold, g, [0.66, -0.16, 0]); mesh(rbox(0.1, 0.18, 0.1, 0.03), M.gold, g, [0.47, -0.12, 0]);
  mesh(SPH, M.gold, g, [0.78, 0, 0], 0.08);
  return g;
}
function magnifier(parent) { // lens faces +z, handle to the lower right
  const g = group(parent);
  mesh(new THREE.TorusGeometry(0.42, 0.055, 16, 64), M.gold, g);
  mesh(new THREE.CircleGeometry(0.4, 48), phys({ color: 0xdff5ea, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), g);
  mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 48, 1.1), M.glow, g, [0, 0, 0.03], 1, [0, 0, 1.9]);
  const h = group(g, [0.34, -0.34, 0]); h.rotation.z = Math.PI / 4;
  mesh(CYL, M.gold, h, [0, -0.08, 0], [0.06, 0.16, 0.06]); mesh(CYL, M.emeraldDeep, h, [0, -0.38, 0], [0.075, 0.5, 0.075]); mesh(SPH, M.gold, h, [0, -0.64, 0], 0.08);
  return g;
}
{ const g = root("find"), id = "find";
  floorDisc(g, 7);
  const turn = group(g);
  mesh(CYL, M.tile, turn, [0, 0.1, 0], [2.5, 0.2, 2.5]); mesh(new THREE.TorusGeometry(2.5, 0.03, 10, 120), M.gold, turn, [0, 0.2, 0], 1, [Math.PI / 2, 0, 0]);
  mesh(new THREE.TorusGeometry(1.7, 0.012, 8, 100), M.goldSatin, turn, [0, 0.205, 0], 1, [Math.PI / 2, 0, 0]);
  shadow(g, 0, 0, 0, 6.2);
  const PS = [1.25, 1.25, 0.95];
  const props = [mShop, mWarehouse, mOffice].map((f, i) => { const a = (i * TAU) / 3, p = group(turn, [Math.sin(a) * 1.7, 0.2, Math.cos(a) * 1.7]); p.rotation.y = a; const m = f(p); m.scale.setScalar(PS[i]); return { p, m, a }; });
  const mag = magnifier(g); const pick = props[2];
  const pickRing = ring(g, [0, 0.24, 1.7]); const pickGlow = halo(g, [0, 1.0, 1.3], 2.8, 0);
  const badge = checkBadge(g, [0, 0, 0], 0.22);
  const key = goldKey(g, [0, 0, 0], 0.42);
  const sp = sparkles(g, [[-0.8, 1.9, 1.4], [0.75, 1.5, 1.5], [-0.6, 0.7, 1.9], [0.9, 2.2, 1.2]], 0.1);
  SC[id].update = (t) => {
    const s = S[id], t0 = s.start;
    orbit(v3(0, 0.9, 0.9), 0.06 * Math.sin(t * 0.4), 0.4, lerp(9.2, 8.4, eio(pr(t, t0, s.next - t0))));
    const kin = eo(pr(t, t0, 0.6)); turn.position.y = -0.4 * (1 - kin); turn.scale.setScalar(0.85 + 0.15 * kin);
    // turntable: shop -> warehouse -> office (the match) comes to the front
    const r1 = eio(pr(t, AN.budget - 0.25, 0.5)), r2 = eio(pr(t, AN.goal + 0.05, 0.5));
    turn.rotation.y = -(r1 + r2) * (TAU / 3);
    props.forEach((o, i) => { const k = pr(t, t0 + 0.1 + i * 0.12, 0.5); o.m.visible = k > 0;
      const front = (Math.cos(o.a + turn.rotation.y) + 1) / 2; // 1 = facing the camera
      o.m.scale.setScalar(Math.max(1e-4, eb(k) * PS[i] * lerp(0.5, 1, ess(front)))); if (o.m.userData.anim) o.m.userData.anim(t); });
    const found = eio(pr(t, AN.prop + 0.05, 0.45));
    pick.p.position.y = 0.2 + 0.18 * found + (found >= 1 ? Math.sin(t * 2) * 0.03 : 0);
    props.forEach((o, i) => { if (i !== 2) o.p.position.y = 0.2 - 0.06 * found; });
    // magnifier: scans the front property, then steps aside when the match is found
    const km = pr(t, AN.fit - 0.15, 0.5), away = eio(pr(t, AN.prop + 0.2, 0.55));
    mag.visible = km > 0 && away < 0.999; mag.scale.setScalar(Math.max(1e-4, eb(km) * 0.9 * (1 - away)));
    mag.position.set(0.3 + Math.sin(t * 2.4) * 0.1 + away * 0.9, 0.9 + Math.cos(t * 1.9) * 0.07 + away * 0.8, 2.55);
    mag.rotation.set(0.05, -0.15, Math.sin(t * 1.5) * 0.08);
    ringAt(pickRing, t, AN.prop + 0.15, 0.9, 0.6, 1.7);
    pickGlow.material.opacity = 0.55 * found;
    const kb = pop(badge, t, AN.prop + 0.45, 0.5, 1); badge.position.set(0.62, 1.75 + Math.sin(t * 2) * 0.04, 1.85); badge.rotation.y = (1 - eo(kb)) * TAU;
    const kk = pr(t, AN.found - 0.05, 0.6); key.visible = kk > 0; key.scale.setScalar(Math.max(1e-4, 0.42 * eb(kk)));
    key.position.set(-0.6, 0.7 + Math.sin(t * 2.3) * 0.05, 2.4); key.rotation.set(0.1, -0.5 + (1 - eo(kk)) * TAU + Math.sin(t * 1.4) * 0.25, -0.35);
    twinkle(sp, t, found);
  };
}

// ---------- steps: visit -> check -> negotiate -> contract -> launch, "we're with you"
const TAG_FACE = canvasTex(256, 192, (g) => {
  g.fillStyle = "#e9bf62"; g.fillRect(0, 0, 256, 192);
  g.font = "900 128px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#123a28"; g.fillText("%", 140, 100);
});
function priceTag(parent, p) { // tag pointing left, string hole on the left
  const g = group(parent, p); const s = poly([[-0.42, 0], [-0.24, 0.2], [0.34, 0.2], [0.34, -0.2], [-0.24, -0.2]]); const hole = new THREE.Path(); hole.absarc(-0.25, 0, 0.045, 0, TAU, true); s.holes.push(hole);
  const geo = extrude(s, 0.05, 0.02, 2); geo.translate(0, 0, -0.025); mesh(geo, M.gold, g);
  mesh(new THREE.PlaneGeometry(0.44, 0.32), std({ map: TAG_FACE, metalness: 0.5, roughness: 0.35 }), g, [0.06, 0, 0.047]);
  return g;
}
function clipboard(parent, p) {
  const g = group(parent, p);
  mesh(rbox(0.5, 0.64, 0.04, 0.03), M.wood, g); mesh(rbox(0.42, 0.54, 0.012, 0.01), M.creamHi, g, [0, -0.02, 0.025]);
  mesh(rbox(0.2, 0.07, 0.05, 0.02), M.gold, g, [0, 0.31, 0.03]);
  const checks = [];
  for (let i = 0; i < 3; i++) {
    mesh(rbox(0.07, 0.07, 0.01, 0.01), M.ink, g, [0.13, 0.15 - i * 0.15, 0.035]); mesh(rbox(0.2, 0.03, 0.01, 0.01), M.ink, g, [-0.05, 0.15 - i * 0.15, 0.035]);
    const c = group(g, [0.13, 0.15 - i * 0.15, 0.045]); mesh(rbox(0.045, 0.018, 0.012, 0.005), M.gold, c, [-0.018, -0.01, 0], 1, [0, 0, -0.8]); mesh(rbox(0.08, 0.018, 0.012, 0.005), M.gold, c, [0.015, 0.008, 0], 1, [0, 0, 0.9]); checks.push(c);
  }
  g.userData.checks = checks; return g;
}
function contract(parent, p) {
  const g = group(parent, p);
  mesh(rbox(0.5, 0.66, 0.02, 0.015), M.creamHi, g);
  mesh(rbox(0.28, 0.05, 0.012, 0.01), M.emerald, g, [0.06, 0.25, 0.015]);
  for (let i = 0; i < 4; i++) mesh(rbox(i === 3 ? 0.2 : 0.36, 0.025, 0.01, 0.008), M.ink, g, [i === 3 ? 0.08 : 0, 0.12 - i * 0.08, 0.015]);
  const sig = new THREE.CatmullRomCurve3([[-0.16, -0.2], [-0.12, -0.14], [-0.08, -0.22], [-0.03, -0.15], [0.0, -0.21], [0.05, -0.16], [0.1, -0.2], [0.16, -0.17]].map(([x, y]) => v3(x, y, 0.02)));
  const sigM = mesh(new THREE.TubeGeometry(sig, 80, 0.008, 6, false), M.ink, g); sigM.userData = { n: 80 };
  const pen = group(g, [0, 0, 0.08]); mesh(CYL, M.emeraldDeep, pen, [0, 0.2, 0], [0.025, 0.34, 0.025]); mesh(CONE, M.gold, pen, [0, 0.0, 0], [0.025, 0.07, 0.025], [Math.PI, 0, 0]); mesh(CYL, M.gold, pen, [0, 0.36, 0], [0.028, 0.03, 0.028]);
  pen.rotation.z = 0.5;
  g.userData = { sig, sigM, pen }; return g;
}
function rocket(parent, p) {
  const g = group(parent, p);
  const body = new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.15, 0.2], [0.14, 0.42], [0.09, 0.56], [0, 0.66]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  mesh(body, M.creamHi, g); mesh(CONE, M.gold, g, [0, 0.67, 0], [0.075, 0.14, 0.075]);
  mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 32), M.gold, g, [0, 0.4, 0.14]); mesh(new THREE.CircleGeometry(0.055, 32), std({ color: 0x9fd6c0, emissive: 0x2f8a5c, emissiveIntensity: 0.4, roughness: 0.1 }), g, [0, 0.4, 0.142]);
  for (let i = 0; i < 3; i++) { const f = group(g); f.rotation.y = (i * TAU) / 3; mesh(extrude(poly([[0, 0], [0.13, -0.03], [0.13, 0.08], [0, 0.22]]), 0.02, 0.006, 1), M.emerald, f, [0.12, 0.0, -0.01]); }
  const flame = mesh(CONE, std({ color: 0xffd27a, emissive: 0xffa030, emissiveIntensity: 2.2, transparent: true, opacity: 0.95 }), g, [0, -0.1, 0], [0.07, 0.22, 0.07], [Math.PI, 0, 0]);
  g.userData.flame = flame; return g;
}
function miniHouse(parent, p) {
  const g = group(parent, p);
  mesh(rbox(0.42, 0.3, 0.36, 0.03), M.creamHi, g, [0, 0.15, 0]); mesh(GABLE, M.emerald, g, [0, 0.3, 0], [0.8, 0.9, 0.9]);
  mesh(rbox(0.1, 0.17, 0.02, 0.01), M.emeraldDeep, g, [0.06, 0.085, 0.185]); mesh(rbox(0.09, 0.08, 0.02, 0.01), M.win, g, [-0.11, 0.17, 0.185]);
  return g;
}
{ const g = root("steps"), id = "steps";
  floorDisc(g, 14);
  const keys = ["visit", "check", "nego", "contract", "launch"], names = ["بازدید ملک", "بررسی شرایط", "مذاکره و تخفیف", "قرارداد", "راه‌اندازی"];
  const SP = [[0.9, -0.2], [-0.95, -2.4], [0.95, -4.6], [-0.95, -6.8], [0.6, -9.0]];
  // the road: emerald band with a gold centre line, through every station
  const curve = new THREE.CatmullRomCurve3([v3(1.6, 0, 3.2), v3(1.2, 0, 1.2), ...SP.map(([x, z]) => v3(x, 0, z)), v3(0.1, 0, -10.2)], false, "catmullrom", 0.5);
  const ribbonGeo = (w, y, n = 240) => { const pts = curve.getSpacedPoints(n), pos = [], idx = []; pts.forEach((pp, i) => { const tg = curve.getTangentAt(i / n); const nx = -tg.z, nz = tg.x, L = Math.hypot(nx, nz) || 1; pos.push(pp.x + (nx / L) * w / 2, y, pp.z + (nz / L) * w / 2, pp.x - (nx / L) * w / 2, y, pp.z - (nz / L) * w / 2); if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }); const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };
  mesh(ribbonGeo(0.78, 0.01), std({ color: 0x1d5a3e, roughness: 0.6, side: THREE.DoubleSide }), g);
  [0.36, -0.36].forEach((o) => { const e = mesh(ribbonGeo(0.04, 0.016), M.goldSatin, g); e.position.x = 0; e.userData.o = o; });
  const line = mesh(ribbonGeo(0.07, 0.02), std({ color: 0xf4d68c, emissive: 0xc8963e, emissiveIntensity: 0.7, roughness: 0.3, side: THREE.DoubleSide }), g);
  // gold edges: offset copies of the band edge
  g.children.filter((m) => m.userData.o !== undefined).forEach((m) => { const pos = m.geometry.attributes.position; const pts = curve.getSpacedPoints(240); pts.forEach((pp, i) => { const tg = curve.getTangentAt(i / 240); const nx = -tg.z, nz = tg.x, L = Math.hypot(nx, nz) || 1, o = m.userData.o; pos.setXYZ(i * 2, pp.x + (nx / L) * (o + 0.02), 0.016, pp.z + (nz / L) * (o + 0.02)); pos.setXYZ(i * 2 + 1, pp.x + (nx / L) * (o - 0.02), 0.016, pp.z + (nz / L) * (o - 0.02)); }); pos.needsUpdate = true; });
  const st = keys.map((k, i) => {
    const [x, z] = SP[i]; const ped = pedestal(g, [x, 0, z], 0.62, 0.22);
    const top = group(ped, [0, 0.22, 0]); const badge = checkBadge(ped, [0.5, 0.95, 0.3], 0.13); const rg = ring(ped, [0, 0.24, 0]);
    return { ped, top, badge, rg, a: AN[k], p: v3(x, 0, z) };
  });
  const house = miniHouse(st[0].top, [0, 0, 0]); house.scale.setScalar(1.5); const pin = group(st[0].top, [0, 0.95, 0]); mesh(PIN, M.gold, pin, [0, 0, 0], 1.4);
  const clip = clipboard(st[1].top, [0, 0.55, 0]); clip.scale.setScalar(1.35); clip.rotation.set(-0.2, 0.25, 0);
  const tag = priceTag(st[2].top, [0, 0.7, 0]); tag.scale.setScalar(1.35);
  const doc = contract(st[3].top, [0, 0.58, 0]); doc.scale.setScalar(1.35); doc.rotation.set(-0.2, -0.25, 0);
  const rk = rocket(st[4].top, [0, 0.02, 0]); rk.scale.setScalar(1.5);
  const puffs = []; for (let i = 0; i < 8; i++) puffs.push(mesh(SPH, M.smoke.clone(), st[4].top, [0, 0, 0], 0.05));
  const icons = [house, clip, tag, doc, rk], iconS = [1.5, 1.35, 1.35, 1.35, 1.5];
  icons.forEach((ic, i) => (ic.userData.s = iconS[i]));
  // the camera leaves a station only shortly before the next one is named
  const focus = (t) => { if (t <= st[0].a) return st[0].p.clone(); for (let i = 0; i < 4; i++) if (t < st[i + 1].a) { const d = Math.min(0.55, st[i + 1].a - st[i].a - 0.1); return st[i].p.clone().lerp(st[i + 1].p, eio(pr(t, st[i + 1].a - d - 0.05, d))); } return st[4].p.clone(); };
  SC[id].update = (t) => {
    const s = S[id], t0 = s.start;
    const acc = v3(0, 0, 0); for (let k = -4; k <= 4; k++) acc.add(focus(t + k * 0.06)); acc.multiplyScalar(1 / 9);
    const ov = eio(pr(t, AN.withyou - 0.55, 1.3));
    const tgA = acc.clone().add(v3(-0.05, 0.6, 0)), tgB = v3(0, 0, -5.2);
    orbit(tgA.lerp(tgB, ov), lerp(0.28 - 0.06 * Math.sin(t * 0.5), 0.12, ov), lerp(0.36, 1.02, ov), lerp(7.2, 20.5, ov));
    st.forEach((o, i) => {
      const kp = pr(t, t0 + 0.05 + i * 0.08, 0.5); o.ped.visible = kp > 0; o.ped.scale.setScalar(Math.max(1e-4, 0.6 + 0.4 * eo(kp)));
      const ki = pr(t, i ? o.a - 0.18 : t0 + 0.1, 0.5); icons[i].visible = ki > 0; icons[i].scale.setScalar(Math.max(1e-4, eb(ki) * icons[i].userData.s));
      const nxt = i < 4 ? st[i + 1].a : AN.withyou;
      const kb = pop(o.badge, t, nxt + 0.05, 0.45, 1); o.badge.rotation.y = (1 - eo(kb)) * Math.PI;
      ringAt(o.rg, t, o.a, 0.7, 0.6, 1.5);
    });
    pin.position.y = 0.95 + Math.sin(t * 2.6) * 0.06; pin.rotation.y = t;
    clip.userData.checks.forEach((c, j) => pop(c, t, AN.check + 0.15 + j * 0.2, 0.3, 1));
    tag.rotation.z = Math.sin(t * 2.2) * 0.15 + shake(t, AN.disc - 0.05, 0.25, 30, 4); tag.rotation.y = Math.sin(t * 1.1) * 0.35;
    const ks = pr(t, AN.contract + 0.05, 0.9); doc.userData.sigM.geometry.setDrawRange(0, Math.floor(80 * ks) * 6 * 6);
    const pp = doc.userData.sig.getPointAt(Math.max(0.001, ks)); doc.userData.pen.position.set(pp.x + 0.06, pp.y + 0.11, 0.06); doc.userData.pen.visible = ks < 1 && t > AN.contract - 0.1;
    const kl = pr(t, AN.launch + 0.45, 1.6), lift = kl * kl * 7.5;
    rk.position.set(0, 0.02 + lift, 0); rk.rotation.y = t * 1.5; if (lift > 7) rk.visible = false;
    rk.userData.flame.visible = kl > 0; rk.userData.flame.scale.set(0.07, 0.2 + 0.05 * Math.sin(t * 40), 0.07);
    puffs.forEach((m, j) => { const k = pr(t, AN.launch + 0.45 + j * 0.07, 1.0); m.visible = k > 0 && k < 1; m.position.set((hash(j) - 0.5) * 0.9 * k, 0.05 + k * 0.15, (hash(j + 4) - 0.5) * 0.7 * k); m.scale.setScalar(0.06 + k * 0.2); m.material.opacity = 0.8 * (1 - k); });
  };
}

// ---------- goal: "just tell us your goal" -> an arrow hits the bullseye; "we'll do the rest"
{ const g = root("goal"), id = "goal";
  floorDisc(g, 7);
  const ped = pedestal(g, [0, 0, 0], 0.9, 0.2);
  const board = group(g, [0, 1.42, 0]); board.rotation.x = -0.08;
  const rings = [[0.95, M.creamHi], [0.76, M.emerald], [0.57, M.creamHi], [0.38, M.emerald], [0.19, M.gold]];
  rings.forEach(([r, m], i) => mesh(CYL, m, board, [0, 0, i * 0.012], [r, 0.08, r], [Math.PI / 2, 0, 0]));
  mesh(new THREE.TorusGeometry(0.95, 0.04, 12, 80), M.gold, board, [0, 0, 0.02]);
  const legs = group(g, [0, 0.2, -0.2]); [-0.45, 0.45].forEach((x) => mesh(CYL, M.gold, legs, [x * 0.8, 0.6, -0.05], [0.03, 1.3, 0.03], [0.15, 0, x > 0 ? -0.2 : 0.2]));
  const arrow = group(g); // points along -z
  mesh(CYL, M.gold, arrow, [0, 0, 0.62], [0.035, 1.25, 0.035], [Math.PI / 2, 0, 0]); mesh(CONE, M.gold, arrow, [0, 0, -0.07], [0.075, 0.22, 0.075], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) { const f = group(arrow, [0, 0, 1.08]); f.rotation.z = (i * TAU) / 3 + Math.PI / 2; mesh(extrude(poly([[0, -0.1], [0.16, 0.0], [0.16, 0.2], [0, 0.16]]), 0.012, 0.006, 1), i ? M.creamHi : M.emerald, f, [0.03, 0, -0.006], 1, [Math.PI / 2, 0, 0]); }
  const wave = mesh(RING_GEO, new THREE.MeshBasicMaterial({ color: 0xf4d68c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), board, [0, 0, 0.08]);
  const hitGlow = halo(board, [0, 0, 0.3], 2.4, 0);
  const sp = sparkles(g, [[-1.1, 2.3, 0.4], [1.15, 2.0, 0.3], [-0.9, 0.8, 0.6], [1.0, 0.9, 0.5], [0.2, 2.6, 0.2], [-0.3, 0.3, 1.0]], 0.13);
  const from = v3(2.4, 2.4, 6.0), hitT = AN.target - 0.04;
  SC[id].update = (t) => {
    const s = S[id], t0 = s.start;
    const pull = eio(pr(t, AN.rest - 0.2, 1.0));
    orbit(v3(0, 1.25, 0), 0.34 - 0.12 * eio(pr(t, t0, 2.0)) + 0.06 * pull, 0.12 + 0.06 * pull, lerp(9.2, 8.4, eio(pr(t, t0, hitT - t0))) + 0.9 * pull);
    const kb = eo(pr(t, t0, 0.6)); board.scale.setScalar(Math.max(1e-4, 0.7 + 0.3 * eb(pr(t, t0, 0.6)))); board.visible = kb > 0;
    board.position.x = shake(t, hitT, 0.05, 50, 6); board.rotation.y = shake(t, hitT, 0.06, 38, 5);
    const ka = pr(t, AN.target - 0.5, hitT - (AN.target - 0.5));
    const tip = v3(0, 1.42, 0.12);
    if (ka <= 0) arrow.visible = false;
    else {
      arrow.visible = true; const e = ka < 1 ? ess(ka) : 1;
      const p = from.clone().lerp(tip, e); p.y += Math.sin(Math.PI * e) * 0.5;
      const q = from.clone().lerp(tip, Math.min(1, e + 0.02)); q.y += Math.sin(Math.PI * Math.min(1, e + 0.02)) * 0.5;
      arrow.position.copy(p); if (ka < 1) arrow.lookAt(p.clone().sub(q.sub(p).normalize()));
      if (ka >= 1) { arrow.position.copy(tip).add(v3(board.position.x, 0, 0)); arrow.rotation.x += shake(t, hitT, 0.04, 70, 7) * 0.3; }
    }
    const kw = pr(t, hitT, 0.8); wave.visible = kw > 0 && kw < 1; wave.scale.setScalar(0.2 + kw * 1.6); wave.material.opacity = 0.9 * (1 - kw);
    hitGlow.material.opacity = 0.8 * eo(pr(t, hitT, 0.2)) * (1 - 0.5 * pr(t, hitT + 0.3, 0.8));
    twinkle(sp, t, eo(pr(t, hitT, 0.4)));
  };
}

// ---------- cta: a gold property key floating above the comment box
{ const g = root("cta"), id = "cta";
  const key = goldKey(g, [0, 0, 0], 1.25);
  const kGlow = halo(g, [0, 0.62, -0.6], 3.4, 0);
  const coins = []; for (let i = 0; i < 10; i++) { const side = i % 2 ? 1 : -1; coins.push({ c: coin(g, [0, 0, 0], 0.55), x: side * (1.25 + hash(i) * 0.6), y0: hash(i + 11) * 5, z: -1.2 - hash(i + 3) * 2.2, sp: 0.16 + hash(i + 5) * 0.12 }); }
  const sp = sparkles(g, [[-1.0, 0.75, 0.5], [1.1, -0.5, 0.4], [0.7, 0.9, 0.3], [-0.85, -0.7, 0.6]], 0.11);
  SC[id].update = (t) => {
    const s = S[id], lt = t - s.start;
    cam(v3(0, 0.3, 7.4), v3(0, 0, 0));
    const k = pr(t, s.start + 0.05, 0.8); key.visible = k > 0; key.scale.setScalar(Math.max(1e-4, 0.82 * eb(k)));
    key.position.set(0.06, 0.62 + Math.sin(t * 1.8) * 0.05, 0); key.rotation.set(0.12, (1 - eo(k)) * TAU + Math.sin(t * 0.9) * 0.5, -0.06);
    kGlow.material.opacity = 0.55 * eo(k);
    coins.forEach((o, i) => { o.c.visible = true; o.c.position.set(o.x, ((o.y0 + lt * o.sp) % 5) - 2.6, o.z); o.c.rotation.set(0.3 * Math.sin(t + i), t * (0.8 + i * 0.05), 0); o.c.scale.setScalar(Math.max(1e-4, eo(pr(t, s.start + i * 0.06, 0.6)) * 0.55)); });
    twinkle(sp, t, eo(k));
  };
}

// ---------------------------------------------------------------- frame
const order = T.scenes.map((s) => s.id);
const SHIFT = { hook: 40, city: 150, find: 120, steps: 90, goal: 130, cta: 0 }; let curShift = 0;
window.__world = { scene, camera, SC, THREE, frame: (t) => frame(t) };
export function frame(t) {
  let active = order[0]; for (const id of order) if (t >= S[id].start) active = id;
  labels.forEach((L) => (L.o = 0));
  for (const id of order) SC[id].g.visible = id === active;
  const sy = SHIFT[active] || 0; if (sy !== curShift) { curShift = sy; if (sy) camera.setViewOffset(W, H, 0, -sy, W, H); else camera.clearViewOffset(); }
  SC[active].update(t);
  // scene change: quick zoom-blur dip around every cut
  let w = 0;
  for (let i = 1; i < order.length; i++) { const tb = S[order[i]].start; if (t >= tb - 0.24 && t < tb) w = Math.max(w, eio(pr(t, tb - 0.24, 0.24))); else if (t >= tb && t < tb + 0.34) w = Math.max(w, 1 - eo(pr(t, tb, 0.34))); }
  canvas.style.filter = w > 0.002 ? `blur(${(w * 16).toFixed(2)}px) brightness(${(1 + 0.28 * w).toFixed(3)})` : "none";
  canvas.style.transform = w > 0.002 ? `scale(${(1 + 0.08 * w).toFixed(4)})` : "none";
  LBL_FADE = 1 - w;
  updateBokeh(t);
  composer.render(); placeLabels();
}
