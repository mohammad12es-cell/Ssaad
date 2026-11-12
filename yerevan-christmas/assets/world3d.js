// Yerevan Christmas edit: 3D props that live BEHIND the presenter (transparent canvas between the
// background and the cutout). Pure function of film time t; driven by the HyperFrames root timeline.
import * as THREE from "three";
import { RoomEnvironment } from "./jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./jsm/geometries/RoundedBoxGeometry.js";

const W = 1080, H = 1920, BEAT = window.__BEATS;
const cl = (x) => Math.max(0, Math.min(1, x)), pr = (t, t0, d) => cl((t - t0) / d), lerp = (a, b, k) => a + (b - a) * k;
const eo = (k) => 1 - Math.pow(1 - k, 3), eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eb = (k) => { const a = 1.70158, b = a + 1; return k <= 0 ? 0 : 1 + b * Math.pow(k - 1, 3) + a * Math.pow(k - 1, 2); };
const ebn = (k) => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; };
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// window (in, out) envelope: pop in over din, shrink out over dout
const env = (t, a, b, din = 0.5, dout = 0.3) => (t < a || t > b ? 0 : Math.min(eb(pr(t, a, din)), 1 - eo(pr(t, b - dout, dout))));

const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8;
scene.add(new THREE.HemisphereLight(0xfff0d0, 0x0b2017, 0.55));
const key = new THREE.DirectionalLight(0xffe4b8, 1.8); key.position.set(-4, 6, 8); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fe8bd, 1.0); rim.position.set(5, 2, -4); scene.add(rim);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60); camera.position.set(0, 0, 15); camera.lookAt(0, 0, 0);
// screen pixels -> world units on the z=0 plane
const wx = (px) => (px / W - 0.5) * 4.52, wy = (py) => (0.5 - py / H) * 8.04;

const phys = (o) => new THREE.MeshPhysicalMaterial(o), std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  gold: phys({ color: 0xf2c56b, metalness: 1, roughness: 0.22, clearcoat: 0.4 }),
  goldSatin: std({ color: 0xdcab55, metalness: 1, roughness: 0.38 }),
  copper: std({ color: 0xe29a62, metalness: 1, roughness: 0.3 }),
  emerald: phys({ color: 0x23744c, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
  emeraldDeep: phys({ color: 0x1a5a3c, roughness: 0.35, clearcoat: 0.8 }),
  cream: phys({ color: 0xeee2c8, roughness: 0.5, clearcoat: 0.3 }),
  dark: std({ color: 0x0b2218, roughness: 0.45 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  red: phys({ color: 0xb3262e, roughness: 0.45, clearcoat: 0.5 }),
};
const SPH = new THREE.SphereGeometry(1, 32, 20), CYL = new THREE.CylinderGeometry(1, 1, 1, 40), CONE = new THREE.ConeGeometry(1, 1, 40);
const mesh = (geo, mat, parent, p = [0, 0, 0], s = 1, r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); typeof s === "number" ? m.scale.setScalar(s) : m.scale.set(...s); m.rotation.set(...r); parent.add(m); return m; };
const group = (parent, p = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99);
function starShape(n, R, r) { const s = new THREE.Shape(); for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n + Math.PI / 2, k = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * k, Math.sin(a) * k) : s.moveTo(Math.cos(a) * k, Math.sin(a) * k); } s.closePath(); return s; }
const extrude = (shape, depth, bevel = 0.02) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 20 });
const setScale = (o, k) => { o.visible = k > 0.001; o.scale.setScalar(Math.max(1e-4, k)); };

// ---------------------------------------------------------------- props
// Christmas tree (rises beside the presenter)
const tree = group(scene); const treeIn = group(tree);
[[0.66, 0.78, 0.0], [0.54, 0.7, 0.5], [0.42, 0.6, 0.95], [0.29, 0.5, 1.35]].forEach(([r, h, y], i) => mesh(CONE, i % 2 ? M.emeraldDeep : M.emerald, treeIn, [0, y + h / 2, 0], [r, h, r]));
mesh(CYL, M.dark, treeIn, [0, -0.12, 0], [0.12, 0.3, 0.12]);
const garland = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 60 }, (_, i) => { const u = i / 59, a = u * Math.PI * 7, r = lerp(0.64, 0.12, u); return v3(Math.cos(a) * r, 0.12 + u * 1.65, Math.sin(a) * r); })), 240, 0.014, 6);
mesh(garland, M.gold, treeIn);
const baubles = Array.from({ length: 16 }, (_, i) => { const u = 0.08 + (i / 16) * 0.82, a = i * 2.39, r = lerp(0.6, 0.14, u) + 0.02; return mesh(SPH, i % 3 === 0 ? M.copper : M.gold, treeIn, [Math.cos(a) * r, 0.1 + u * 1.7, Math.sin(a) * r], 0.05); });
const tstar = mesh(extrude(starShape(5, 0.2, 0.085), 0.05, 0.015), M.gold, treeIn, [0, 2.0, -0.03]);
const starGlow = mesh(SPH, M.glow, treeIn, [0, 2.0, 0.02], 0.045);

// gifts (fall behind the presenter)
const gifts = Array.from({ length: 7 }, (_, i) => { const g = group(scene); const body = [M.emerald, M.cream, M.red, M.emeraldDeep][i % 4], rib = i % 4 === 1 ? M.red : M.gold;
  const s = 0.28 + hash(i) * 0.14; mesh(rbox(s, s, s, 0.03), body, g); mesh(rbox(s * 1.02, s * 1.02, s * 0.16, 0.01), rib, g); mesh(rbox(s * 0.16, s * 1.02, s * 1.02, 0.01), rib, g);
  [-1, 1].forEach((d) => mesh(new THREE.TorusGeometry(s * 0.14, s * 0.04, 8, 24), rib, g, [d * s * 0.12, s * 0.55, 0], 1, [0, 0, d * 0.6])); return { g, x: (i / 6 - 0.5) * 3.8 + (hash(i + 3) - 0.5) * 0.4, d: hash(i + 9) * 0.5, s }; });

// music notes (rise)
const noteGeo = (() => { const g = new THREE.Group(); mesh(SPH, M.gold, g, [0, 0, 0], [0.11, 0.08, 0.06], [0, 0, 0.4]); mesh(CYL, M.gold, g, [0.09, 0.22, 0], [0.016, 0.44, 0.016]); mesh(rbox(0.13, 0.04, 0.03, 0.01), M.gold, g, [0.15, 0.42, 0], 1, [0, 0, -0.5]); return g; })();
const notes = Array.from({ length: 9 }, (_, i) => { const g = noteGeo.clone(); scene.add(g); return { g, x: (hash(i + 20) - 0.5) * 4.2, d: i * 0.12, sp: 0.8 + hash(i + 21) * 0.6 }; });

// confetti
const confM = [M.gold, M.emerald, M.cream, M.copper].map((m) => { const c = m.clone(); c.side = THREE.DoubleSide; return c; });
const confetti = Array.from({ length: 70 }, (_, i) => ({ m: mesh(new THREE.PlaneGeometry(0.07, 0.12), confM[i % 4], scene), x: (hash(i + 40) - 0.5) * 4.6, y0: 4.2 + hash(i + 41) * 2.5, sp: 1.3 + hash(i + 42) * 1.2, ph: hash(i + 43) * 6 }));

// clock (spins to 18:00)
const clock = group(scene); const clockIn = group(clock);
mesh(CYL, M.cream, clockIn, [0, 0, 0], [0.62, 0.1, 0.62], [Math.PI / 2, 0, 0]); mesh(new THREE.TorusGeometry(0.64, 0.06, 16, 64), M.gold, clockIn);
for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(rbox(i % 3 ? 0.03 : 0.05, i % 3 ? 0.08 : 0.13, 0.03, 0.01), M.goldSatin, clockIn, [Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0.06], 1, [0, 0, -a]); }
const hourH = group(clockIn, [0, 0, 0.08]); mesh(rbox(0.06, 0.32, 0.03, 0.02), M.emeraldDeep, hourH, [0, 0.14, 0]);
const minH = group(clockIn, [0, 0, 0.1]); mesh(rbox(0.04, 0.48, 0.03, 0.015), M.emerald, minH, [0, 0.21, 0]);
mesh(SPH, M.gold, clockIn, [0, 0, 0.12], 0.05);
[-1, 1].forEach((s) => mesh(SPH, M.gold, clockIn, [s * 0.42, 0.62, -0.05], 0.13));

// calendar (page flips to 1 December; the text is HTML pinned to the page)
const cal = group(scene); const calIn = group(cal);
mesh(rbox(1.05, 1.15, 0.16, 0.06), M.emerald, calIn, [0, 0, -0.06]); mesh(rbox(1.05, 0.26, 0.17, 0.05), M.gold, calIn, [0, 0.47, -0.055]);
const pageM = new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 0.7, side: THREE.DoubleSide });
mesh(new THREE.PlaneGeometry(0.92, 0.78), pageM, calIn, [0, -0.08, 0.035]);
const flip = group(calIn, [0, 0.31, 0.04]); mesh(new THREE.PlaneGeometry(0.92, 0.78), pageM, flip, [0, -0.39, 0.002]);
[-0.28, 0.28].forEach((x) => mesh(new THREE.TorusGeometry(0.07, 0.02, 10, 24), M.goldSatin, calIn, [x, 0.6, 0.02], 1, [0, Math.PI / 2, 0]));

// location pin
const pin = group(scene); const pinIn = group(pin);
mesh(new THREE.LatheGeometry([[0, -0.9], [0.08, -0.68], [0.25, -0.33], [0.44, 0.0], [0.53, 0.28], [0.52, 0.52], [0.43, 0.76], [0.26, 0.92], [0, 0.97]].map(([x, y]) => new THREE.Vector2(x, y)), 48), M.gold, pinIn, [0, 0, 0], 0.75);
mesh(CYL, M.emerald, pinIn, [0, 0.33, 0.34], [0.2, 0.06, 0.2], [Math.PI / 2, 0, 0]);
const ring = mesh(new THREE.TorusGeometry(0.4, 0.02, 8, 48), M.goldSatin, pin, [0, -0.7, 0], 1, [Math.PI / 2, 0, 0]);

// sparkles for the end card
const SPK = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 1); s.quadraticCurveTo(0.12, 0.12, 1, 0); s.quadraticCurveTo(0.12, -0.12, 0, -1); s.quadraticCurveTo(-0.12, -0.12, -1, 0); s.quadraticCurveTo(-0.12, 0.12, 0, 1); return s; })());
const sparks = Array.from({ length: 10 }, (_, i) => ({ m: mesh(SPK, M.glow, scene), x: (hash(i + 70) - 0.5) * 4.1, y: wy(230 + hash(i + 71) * 420), ph: i * 1.3 }));

// snow
const snow = (() => { const n = 120, pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfbf3df, size: 7, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false })); scene.add(pts); return { pts, pos, n }; })();

// ---------------------------------------------------------------- frame
const Bt = (k) => BEAT[k];
export function frame(t) {
  // snow everywhere, gentle drift
  for (let i = 0; i < snow.n; i++) { const sp = 0.25 + hash(i + 3) * 0.35, y0 = hash(i + 9) * 9; snow.pos[i * 3] = (hash(i) - 0.5) * 5 + Math.sin(t * 0.7 + i) * 0.12; snow.pos[i * 3 + 1] = 4.5 - ((y0 + t * sp) % 9); snow.pos[i * 3 + 2] = (hash(i + 5) - 0.5) * 3; }
  snow.pts.geometry.attributes.position.needsUpdate = true;

  // tree: rises beside him while he says "first Christmas tree in Armenia"
  { const [a, b] = Bt("tree"), k = env(t, a, b, 0.9, 0.3); tree.visible = k > 0.001; const side = BEAT.treeSide;
    tree.position.set(wx(side), wy(1010) - (1 - eo(pr(t, a, 0.9))) * 2.6, -0.4); tree.scale.setScalar(Math.max(1e-4, 1.15 * (t > b - 0.3 ? 1 - eo(pr(t, b - 0.3, 0.3)) : 1)));
    treeIn.rotation.y = t * 0.5; baubles.forEach((m, i) => m.scale.setScalar(0.05 * (0.85 + 0.25 * Math.sin(t * 6 + i)))); tstar.rotation.z = Math.sin(t * 2) * 0.1; starGlow.scale.setScalar(0.045 + 0.02 * Math.sin(t * 8)); }
  // gifts fall while "with Santa Claus"
  { const [a, b] = Bt("gifts"); gifts.forEach((o, i) => { const u = pr(t, a + o.d, 1.2), out = 1 - eo(pr(t, b - 0.25, 0.25)); o.g.visible = u > 0 && t < b;
      o.g.position.set(o.x, lerp(4.6, wy(820), ebn(u)), -0.6); o.g.rotation.set(t * 1.3 + i, t * 0.9 + i * 2, (1 - u) * 2); o.g.scale.setScalar(Math.max(1e-4, out)); }); }
  // notes rise while "happy concerts"
  { const [a, b] = Bt("notes"); notes.forEach((o, i) => { const u = pr(t, a + o.d, 1.6 / o.sp); o.g.visible = t >= a + o.d && t < b;
      o.g.position.set(o.x + Math.sin(t * 2 + i) * 0.15, lerp(wy(1050), 4.4, eo(u)), 0.2); o.g.rotation.set(0, Math.sin(t * 2 + i) * 0.8, Math.sin(t * 3 + i) * 0.25); o.g.scale.setScalar(1.25 * (1 - eo(pr(t, b - 0.25, 0.25)))); }); }
  // confetti while "exciting programs"
  { const [a, b] = Bt("confetti"); confetti.forEach((o, i) => { const dt = t - a; o.m.visible = dt > 0 && t < b; if (!o.m.visible) return;
      o.m.position.set(o.x + Math.sin(dt * 2 + o.ph) * 0.2, o.y0 - dt * o.sp - 1.6, -0.2 + (i % 5) * 0.12); o.m.rotation.set(dt * 4 + o.ph, dt * 3 + o.ph, dt * 2); }); }
  // clock spins to 18:00
  { const [a, b] = Bt("clock"), k = env(t, a, b, 0.55, 0.3); setScale(clock, k * 1.05); clock.position.set(wx(BEAT.clockX), wy(470), 0.3);
    clockIn.rotation.set(0.12 * Math.sin(t * 1.3), -0.35 + 0.15 * Math.sin(t * 0.9), 0);
    const sp = eio(pr(t, a + 0.3, 1.3)); minH.rotation.z = -sp * Math.PI * 2 * 6; hourH.rotation.z = -sp * Math.PI; }
  // calendar flips to 1 December
  { const [a, b] = Bt("calendar"), k = env(t, a, b, 0.5, 0.3); setScale(cal, k * 1.1); cal.position.set(wx(BEAT.calX), wy(470), 0.3); calIn.rotation.set(0.1, -0.3 + 0.1 * Math.sin(t), 0);
    const f = eio(pr(t, a + 0.25, 0.38)); flip.rotation.x = -f * Math.PI * 0.98; flip.visible = f < 0.99; }
  // location pin drops in
  { const [a, b] = Bt("pin"), u = pr(t, a, 0.7), k = t >= a && t <= b ? 1 - eo(pr(t, b - 0.3, 0.3)) : 0; setScale(pin, k * 1.1);
    pin.position.set(wx(BEAT.pinX), wy(470) + (1 - ebn(u)) * 3, 0.3); pinIn.rotation.y = t * 1.2; ring.scale.setScalar(Math.max(1e-4, 0.6 + 0.4 * eo(pr(t, a + 0.5, 0.6)))); }
  // sparkles on the end card
  { const [a] = Bt("end"); sparks.forEach((o) => { const k = pr(t, a + o.ph * 0.08, 0.4); o.m.visible = k > 0; o.m.position.set(o.x, o.y, 0.5); o.m.scale.setScalar(Math.max(1e-4, k * 0.13 * (0.55 + 0.45 * Math.sin(t * 5 + o.ph)))); o.m.rotation.z = t * 0.7 + o.ph; }); }

  renderer.render(scene, camera);
  // HTML text pinned to the calendar page
  const ct = document.getElementById("calText"); if (ct) { const [a, b] = Bt("calendar"); const vis = t > a + 0.5 && t < b - 0.12; ct.style.opacity = vis ? cl((t - a - 0.5) / 0.2) : 0;
    if (vis) { cal.updateWorldMatrix(true, true); const p = v3(0, -0.08, 0.05).applyMatrix4(calIn.matrixWorld).project(camera); ct.style.transform = `translate(${((p.x + 1) / 2) * W}px, ${((1 - p.y) / 2) * H}px) translate(-50%, -50%) scale(${cal.scale.x / 1.1})`; } }
}
