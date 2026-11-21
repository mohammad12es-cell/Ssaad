// Character builder shared by Kael and the citizens of Neo-Eden.
// One builder + fixed parameters = identical appearance in every shot.
import * as THREE from "three";
import { rng, clamp, smooth } from "./util.js";

const G = (a, b) => Math.exp(-(a * a + b * b));
const rangeK = (v, a, b) => clamp((v - a) / (b - a));

// ---------------- head sculpt (unit space: crown y=+1, chin y≈-1, face toward +z) ----------------
function sculpt(px, py, pz) {
  const ox = px, oy = py, oz = pz;
  let x = px * 0.77, y = py, z = pz * 0.9;
  if (oz < 0) z *= 1.1 + 0.06 * smooth(rangeK(oy, -0.2, 0.6));          // cranium
  const jt = smooth(rangeK(oy, 0.0, -0.95));
  x *= 1 - 0.42 * jt;                                                     // jaw taper
  if (oz < 0.2) z *= 1 - 0.38 * jt * smooth(rangeK(oz, 0.2, -0.4));       // jaw recedes into neck at the back
  if (oy > 0.55) { x *= 1 - 0.08 * smooth(rangeK(oy, 0.55, 1)); }         // narrower top
  const front = smooth(rangeK(oz, 0.25, 0.8));
  const ax = Math.abs(x);
  let dz = 0;
  dz += 0.07 * G(x / 0.52, (y - 0.25) / 0.075);                           // brow ridge
  dz -= 0.09 * G((ax - 0.3) / 0.15, (y - 0.08) / 0.1);                    // eye sockets
  dz += 0.045 * G((ax - 0.47) / 0.13, (y + 0.08) / 0.1);                  // cheekbones
  dz -= 0.035 * G((ax - 0.42) / 0.12, (y + 0.36) / 0.14);                 // under-cheek hollow
  // nose
  if (y < 0.2 && y > -0.42) {
    const tip = clamp((0.18 - y) / 0.44);
    const a = y > -0.27 ? 0.035 + 0.24 * Math.pow(tip, 1.6) : 0.275 * (1 - smooth(rangeK(y, -0.27, -0.37)));
    dz += a * Math.exp(-Math.pow(x / (0.055 + 0.06 * tip), 2));
    dz += 0.05 * G((ax - 0.1) / 0.05, (y + 0.3) / 0.045);                 // alae
  }
  dz += 0.04 * G(x / 0.05, (y + 0.42) / 0.05) * 0.4;                      // philtrum
  dz += 0.05 * G(x / 0.17, (y + 0.49) / 0.035);                           // upper lip
  dz += 0.06 * G(x / 0.14, (y + 0.58) / 0.045);                           // lower lip
  dz -= 0.03 * G(x / 0.2, (y + 0.535) / 0.012);                           // mouth line
  dz -= 0.02 * G(x / 0.16, (y + 0.67) / 0.04);                            // chin crease
  dz += 0.09 * G(x / 0.2, (y + 0.82) / 0.1);                              // chin
  z += dz * front;
  return [x, y, z];
}
function regionColors(ox, oy, oz, x, y, kind) {
  // returns skin tint multipliers for lips / stubble / eye shadow / cheeks
  const front = smooth(rangeK(oz, 0.2, 0.8));
  const ax = Math.abs(x);
  const lips = (G(x / 0.16, (y + 0.49) / 0.03) + G(x / 0.13, (y + 0.58) / 0.04)) * front;
  const eye = G((ax - 0.3) / 0.17, (y - 0.08) / 0.12) * front;
  const cheek = G((ax - 0.42) / 0.14, (y + 0.15) / 0.13) * front;
  const stub = kind.stubble ? smooth(rangeK(-y, 0.38, 0.62)) * (1 - G(x / 0.22, (y + 0.52) / 0.09) * 0.8) * smooth(rangeK(oz, -0.3, 0.3)) : 0;
  return { lips: clamp(lips), eye: clamp(eye), cheek: clamp(cheek), stub: clamp(stub) };
}

function irisTexture(col1, col2, seed) {
  const R = rng(seed), c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d"), cx = 256, cy = 256;
  const sg = g.createRadialGradient(cx, cy, 120, cx, cy, 256); sg.addColorStop(0, "#efeae6"); sg.addColorStop(0.75, "#dcd2cc"); sg.addColorStop(1, "#b99a94");
  g.fillStyle = sg; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(170,40,40,0.25)"; g.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) { const a = R() * 6.28; let r = 250; g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); let aa = a; for (let k = 0; k < 6; k++) { r -= 14; aa += (R() - 0.5) * 0.15; g.lineTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r); } g.stroke(); }
  const IR = 138;
  const ig = g.createRadialGradient(cx, cy, 20, cx, cy, IR); ig.addColorStop(0, col2); ig.addColorStop(0.55, col1); ig.addColorStop(0.92, col1); ig.addColorStop(1, "#050302");
  g.fillStyle = ig; g.beginPath(); g.arc(cx, cy, IR, 0, 7); g.fill();
  for (let i = 0; i < 420; i++) { const a = R() * 6.283; g.strokeStyle = `rgba(${R() < 0.5 ? "120,80,45" : "20,10,5"},${0.25 + R() * 0.35})`; g.lineWidth = 0.8 + R() * 1.6; g.beginPath(); g.moveTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42); const r2 = 70 + R() * 66; g.lineTo(cx + Math.cos(a + (R() - 0.5) * 0.1) * r2, cy + Math.sin(a + (R() - 0.5) * 0.1) * r2); g.stroke(); }
  g.strokeStyle = "rgba(10,5,2,0.9)"; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, IR - 4, 0, 7); g.stroke();
  g.fillStyle = "#020101"; g.beginPath(); g.arc(cx, cy, 46, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

const cache = {};
function headGeometry() {
  if (cache.head) return cache.head;
  const geo = new THREE.SphereGeometry(1, 128, 96);
  const p = geo.attributes.position, orig = p.array.slice();
  for (let i = 0; i < p.count; i++) { const [x, y, z] = sculpt(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); }
  geo.computeVertexNormals();
  geo.userData.orig = orig;
  cache.head = geo; return geo;
}

// --------------- builder ---------------
export function makeHuman(o = {}) {
  const opt = {
    seed: 1, skin: 0xc8957a, hair: 0x0a0a0d, jacket: 0x0a0b0f, pants: 0x111218, iris: ["#3a2213", "#6b4426"],
    hairStyle: "messy", stubble: true, scar: true, neural: false, coat: false, hood: false, umbrella: false,
    height: 1.0, build: 1.0, ...o,
  };
  const R = rng(opt.seed);
  const root = new THREE.Group();
  const H = {};

  const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, sheen: 0.25, sheenColor: new THREE.Color(0xffb090), sheenRoughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.35 });
  const skinPlain = new THREE.MeshPhysicalMaterial({ color: opt.skin, roughness: 0.5, sheen: 0.25, sheenColor: new THREE.Color(0xffb090), sheenRoughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.35 });
  const jacketMat = new THREE.MeshPhysicalMaterial({ color: opt.jacket, roughness: 0.62, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color(0x2a3040) });
  const pantsMat = new THREE.MeshStandardMaterial({ color: opt.pants, roughness: 0.75 });
  const bootMat = new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.3, clearcoat: 1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b8, metalness: 1, roughness: 0.22 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2a2e38, metalness: 0.9, roughness: 0.3 });
  const hairMat = new THREE.MeshPhysicalMaterial({ color: opt.hair, roughness: 0.38, sheen: 0.6, sheenColor: new THREE.Color(0x3a4050), sheenRoughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  const gloveMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: 0.35, clearcoat: 0.6 });

  const mesh = (geo, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl); parent.add(m); return m;
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 16).translate(0, -len / 2 - r * 0.2, 0);

  // ---- skeleton ----
  const hips = new THREE.Group(); hips.position.y = 0.95 * opt.height; root.add(hips);
  const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
  const chest = new THREE.Group(); chest.position.y = 0.22; spine.add(chest);
  const neck = new THREE.Group(); neck.position.y = 0.33; chest.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.172, 0.014); neck.add(head);
  Object.assign(H, { root, hips, spine, chest, neck, head });

  // ---- torso (shaped capsule) ----
  const tg = new THREE.CapsuleGeometry(1, 1, 12, 32);
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); const k = clamp((y + 1.5) / 3);  // 0 bottom .. 1 top
      const w = (0.15 + 0.065 * smooth(rangeK(k, 0.2, 0.75)) - 0.03 * smooth(rangeK(k, 0.85, 1))) * opt.build;
      const d = 0.105 + 0.03 * smooth(rangeK(k, 0.3, 0.7)) - 0.02 * smooth(rangeK(k, 0.85, 1));
      p.setXYZ(i, p.getX(i) * w, -0.27 + k * 0.62, p.getZ(i) * d);
    } tg.computeVertexNormals(); }
  mesh(tg, jacketMat, chest, [0, 0, 0]);
  const pelvis = mesh(new THREE.SphereGeometry(1, 24, 16), pantsMat, hips, [0, -0.02, 0], [0, 0, 0], [0.165 * opt.build, 0.12, 0.11]);
  // jacket hem / long coat skirt
  const hemLen = opt.coat ? 0.68 : 0.13;
  const skirt = mesh(new THREE.CylinderGeometry(0.158 * opt.build, (opt.coat ? 0.27 : 0.172) * opt.build, hemLen, 28, 1, true), jacketMat, chest, [0, -0.27 - hemLen / 2 + 0.04, 0], [0, 0, 0], [1, 1, 0.72]);
  skirt.material = jacketMat.clone(); skirt.material.side = THREE.DoubleSide;
  // high collar
  mesh(new THREE.CylinderGeometry(0.078, 0.098, 0.075, 24, 1, true), Object.assign(jacketMat.clone(), { side: THREE.DoubleSide }), chest, [0, 0.345, -0.012]);
  // metallic details: zipper, collar rings, shoulder plates, chest seam
  mesh(new THREE.BoxGeometry(0.008, 0.5, 0.006), metalMat, chest, [0.025, 0.05, 0.133]);
  mesh(new THREE.TorusGeometry(0.079, 0.004, 6, 24), gunMat, chest, [0, 0.382, -0.012], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.07, 0.006, 0.05), metalMat, chest, [s * 0.15, 0.3, 0.06], [0.4, 0, -s * 0.35]);
    mesh(new THREE.BoxGeometry(0.06, 0.006, 0.004), metalMat, chest, [s * 0.1, 0.17, 0.142], [0, 0, s * 0.15]);
    mesh(new THREE.BoxGeometry(0.004, 0.16, 0.004), metalMat, chest, [s * 0.11, 0.0, 0.133]);
  }

  // ---- neck & head ----
  mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.2, 20), skinPlain, neck, [0, 0.08, -0.005]);
  const headScale = 0.118;
  const hs = new THREE.Group(); hs.scale.setScalar(headScale); head.add(hs); H.headMesh = hs;
  const hg = headGeometry().clone();
  { // vertex colours
    const base = new THREE.Color(opt.skin), lip = new THREE.Color(opt.skin).lerp(new THREE.Color(0x8a3c40), 0.5);
    const stub = new THREE.Color(opt.skin).multiplyScalar(0.62).lerp(new THREE.Color(0x3a3a48), 0.25);
    const eyeC = new THREE.Color(opt.skin).multiplyScalar(0.8).lerp(new THREE.Color(0x6a4a5a), 0.2);
    const cheekC = new THREE.Color(opt.skin).lerp(new THREE.Color(0xd06a5a), 0.2);
    const orig = hg.userData.orig || headGeometry().userData.orig, p = hg.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const r = regionColors(orig[i * 3], orig[i * 3 + 1], orig[i * 3 + 2], p.getX(i), p.getY(i), opt);
      c.copy(base).lerp(cheekC, r.cheek * 0.6).lerp(eyeC, r.eye * 0.5).lerp(lip, r.lips).lerp(stub, r.stub * 0.55);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    hg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  }
  const headMesh = mesh(hg, skinMat, hs);
  const ray = new THREE.Raycaster();
  headMesh.updateMatrixWorld();
  const surfZ = (x, y) => { ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1)); const h = ray.intersectObject(headMesh); return h.length ? h[0].point.z : 0.8; };
  const surfX = (y, z, s) => { ray.set(new THREE.Vector3(s * 5, y, z), new THREE.Vector3(-s, 0, 0)); const h = ray.intersectObject(headMesh); return h.length ? h[0].point.x : s * 0.8; };

  // eyes
  const irisMat = new THREE.MeshPhysicalMaterial({ map: irisTexture(opt.iris[0], opt.iris[1], opt.seed + 5), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 });
  const lidMat = skinPlain;
  H.eyes = []; H.lids = [];
  for (const s of [-1, 1]) {
    const ex = s * 0.3, ey = 0.075, er = 0.13;
    const ez = surfZ(ex, ey) - er + 0.035;
    const eg = new THREE.SphereGeometry(er, 40, 28);
    { const p = eg.attributes.position, uv = eg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / er * 0.5 + 0.5, p.getY(i) / er * 0.5 + 0.5); }
    // planar UV only valid on the front hemisphere; the back is never visible
    const eyeGroup = new THREE.Group(); eyeGroup.position.set(ex, ey, ez); hs.add(eyeGroup);
    const ball = mesh(eg, irisMat, eyeGroup); H.eyes.push(ball);
    const up = mesh(new THREE.SphereGeometry(er * 1.07, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), lidMat, eyeGroup);
    const lo = mesh(new THREE.SphereGeometry(er * 1.06, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidMat, eyeGroup);
    // lash line
    // lash line on the upper lid rim (front half)
    mesh(new THREE.TorusGeometry(er * 1.075, 0.012, 6, 40, Math.PI), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6 }), up, [0, 0, 0], [Math.PI / 2, 0, 0]);
    eyeGroup.rotation.y = s * 0.12; // slight outward splay
    H.lids.push({ up, lo, s });
  }
  // eyebrows (tubes laid on the surface)
  H.brows = [];
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8, x = s * (0.1 + u * 0.42), y = 0.215 + 0.06 * Math.sin(u * Math.PI * 0.85) - 0.02 * u;
      pts.push(new THREE.Vector3(x, y, surfZ(x, y) + 0.012));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const bg = new THREE.TubeGeometry(curve, 24, 0.032, 6, false);
    { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const x = Math.abs(p.getX(i)); const taper = 1 - 0.55 * smooth(rangeK(x, 0.35, 0.52)); const cy = 0.215 + 0.04; p.setY(i, cy + (p.getY(i) - cy) * 1.0); } }
    const brow = mesh(bg, new THREE.MeshStandardMaterial({ color: 0x0c0a0a, roughness: 0.8 }), hs);
    brow.scale.set(1, 0.85, 1);
    H.brows.push({ m: brow, s });
  }
  { // mouth line
    const pts = []; for (let k = 0; k <= 10; k++) { const x = -0.15 + k * 0.03, y = -0.535 + 0.012 * Math.pow(Math.abs(x) / 0.15, 2); pts.push(new THREE.Vector3(x, y, surfZ(x, y) - 0.004)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.011, 5), new THREE.MeshStandardMaterial({ color: 0x2a1212, roughness: 0.6 }), hs);
  }
  if (opt.scar) { // Kael: small scar above his LEFT eyebrow (character's left = +x)
    const pts = [[0.27, 0.43], [0.31, 0.37], [0.345, 0.3]].map(([x, y]) => new THREE.Vector3(x, y, surfZ(x, y) + 0.006));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011, 5), new THREE.MeshPhysicalMaterial({ color: 0xe8b0a4, roughness: 0.25, clearcoat: 0.6 }), hs);
  }
  // ears
  for (const s of [-1, 1]) {
    const ey = -0.06, ez = -0.06;
    const ex = surfX(ey, ez, s);
    const ear = new THREE.Group(); ear.position.set(ex - s * 0.03, ey, ez); ear.rotation.set(-0.12, s * -0.35, s * 0.05); hs.add(ear);
    mesh(new THREE.SphereGeometry(1, 20, 16), skinPlain, ear, [s * 0.04, 0, 0], [0, 0, 0], [0.06, 0.25, 0.15]);
    mesh(new THREE.TorusGeometry(1, 0.09, 8, 24, Math.PI * 1.45), skinPlain, ear, [s * 0.06, 0.02, -0.01], [0, Math.PI / 2, -Math.PI * 0.2], [0.21, 0.14, 0.12]);
    mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(opt.skin).multiplyScalar(0.7), roughness: 0.7 }), ear, [s * 0.075, -0.03, 0.02], [0, 0, 0], [0.02, 0.08, 0.05]);
    if (opt.neural) { // neural interface implant behind the ear
      const nd = new THREE.Group(); nd.position.set(ex - s * 0.02, -0.13, -0.3); nd.rotation.z = -s * Math.PI / 2; hs.add(nd);
      mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.05, 24), gunMat, nd);
      const glow = mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 3.2, 3.8) }), nd, [0, 0.028, 0], [Math.PI / 2, 0, 0]);
      mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 4, 4.5) }), nd, [0, 0.03, 0]);
      mesh(new THREE.BoxGeometry(0.012, 0.012, 0.18), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.6, 2.0) }), nd, [0, 0.025, 0.12]);
      H.neural = H.neural || []; H.neural.push(glow);
    }
  }
  // hair
  if (opt.hairStyle !== "none") {
    const hairline = (oy, oz) => oz > 0 ? 0.42 + 0.12 * oz : 0.42 + (oz < -0.3 ? -1.05 * (-oz - 0.3) / 0.7 : 0) - 0.2 * Math.min(1, -oz / 0.3);
    const src = headGeometry(), sp = src.attributes.position, sn = src.attributes.normal, orig = src.userData.orig;
    const keep = [], pos = [];
    for (let i = 0; i < sp.count; i++) {
      const oy = orig[i * 3 + 1], oz = orig[i * 3 + 2], ox = orig[i * 3];
      const lim = hairline(oy, oz) + (Math.abs(ox) > 0.6 && oz > -0.4 && oz < 0.5 ? 0.12 : 0);
      keep.push(oy > lim);
      const th = opt.hairStyle === "buzz" ? 0.03 : opt.hairStyle === "neat" ? 0.045 : 0.07;
      const k = Math.max(-1, Math.min(1, (oy - lim) / 0.05));
      const off = k >= 0 ? th * Math.min(1, 0.35 + k) : -0.06 * -k;
      pos.push(sp.getX(i) + sn.getX(i) * off, sp.getY(i) + sn.getY(i) * off, sp.getZ(i) + sn.getZ(i) * off);
    }
    const capG = new THREE.BufferGeometry(); capG.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); capG.setIndex(Array.from(src.index.array)); capG.computeVertexNormals();
    mesh(capG, hairMat, hs);
    if (opt.hairStyle === "messy" || opt.hairStyle === "neat") {
      const neat = opt.hairStyle === "neat";
      // flat tapered locks combed from the crown whorl, lying on the scalp with a messy lift
      const lock = new THREE.CylinderGeometry(1, 1, 1, 8, 8); lock.translate(0, 0.5, 0);
      { const p = lock.attributes.position; for (let i = 0; i < p.count; i++) {
          const y = p.getY(i), tp = Math.pow(1 - y, 0.75) * (0.55 + 0.45 * Math.sin(Math.min(1, y * 3) * 1.57));
          p.setXYZ(i, p.getX(i) * tp * 0.5, y, p.getZ(i) * tp * 0.09 + 0.16 * y - 0.3 * y * y);
        } lock.computeVertexNormals(); }
      const whorl = new THREE.Vector3(0.05, 0.85, -0.5);
      const mats = []; const n = new THREE.Vector3(), pnt = new THREE.Vector3(), t = new THREE.Vector3(), x = new THREE.Vector3();
      let tries = 0;
      while (mats.length < 300 && tries < 40000) {
        tries++; const i = Math.floor(R() * sp.count); if (!keep[i]) continue;
        const oy = orig[i * 3 + 1], oz = orig[i * 3 + 2];
        pnt.set(sp.getX(i), sp.getY(i), sp.getZ(i)); n.set(sn.getX(i), sn.getY(i), sn.getZ(i));
        const fr = oz > 0.3 && oy < 0.85;
        t.copy(pnt).sub(whorl); t.addScaledVector(n, -t.dot(n)); if (t.lengthSq() < 1e-4) t.set(0, 0, 1);
        t.normalize();
        if (fr) t.lerp(new THREE.Vector3(R() < 0.5 ? 0.35 : -0.25, -1, 0.15), 0.35).addScaledVector(n, -t.dot(n)).normalize();
        t.applyAxisAngle(n, (R() - 0.5) * (neat ? 0.25 : 1.1));
        const lift = neat ? -0.05 : (R() - 0.3) * 0.35;
        t.addScaledVector(n, lift).normalize();
        const nn = n.clone().addScaledVector(t, -n.dot(t)).normalize();
        x.crossVectors(t, nn);
        const back = oz < -0.2 || (Math.abs(orig[i * 3]) > 0.55 && oy < 0.45);
        const L = neat ? 0.2 + R() * 0.08 : (fr ? 0.36 : back ? 0.2 : 0.3) + R() * (back ? 0.1 : 0.2), Wd = 0.16 + R() * 0.12;
        const m = new THREE.Matrix4().makeBasis(x.clone().multiplyScalar(Wd), t.clone().multiplyScalar(L), nn.clone().multiplyScalar(L));
        m.setPosition(pnt.clone().addScaledVector(n, 0.035));
        mats.push(m);
      }
      const im = new THREE.InstancedMesh(lock, hairMat, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m)); hs.add(im);
    }
  }
  if (opt.hood) {
    const hood = mesh(new THREE.SphereGeometry(1.18, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), jacketMat, hs, [0, 0.05, -0.12], [-0.45, 0, 0], [0.98, 1.05, 1.08]);
    hood.material = jacketMat.clone(); hood.material.side = THREE.DoubleSide;
  }

  // ---- arms ----
  H.arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.195 * opt.build, 0.265, -0.01); chest.add(sh);
    mesh(new THREE.SphereGeometry(0.066, 16, 12), jacketMat, sh, [-s * 0.01, -0.015, 0]);
    mesh(cap(0.062, 0.19), jacketMat, sh);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    mesh(new THREE.SphereGeometry(0.056, 12, 10), jacketMat, el);
    mesh(cap(0.05, 0.19), jacketMat, el);
    mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 18), metalMat, el, [0, -0.2, 0], [Math.PI / 2, 0, 0]);
    const wr = new THREE.Group(); wr.position.y = -0.265; el.add(wr);
    mesh(new THREE.CapsuleGeometry(0.036, 0.05, 4, 10), gloveMat, wr, [0, -0.05, 0.005], [0, 0, 0], [1, 1, 0.62]);
    mesh(new THREE.CapsuleGeometry(0.03, 0.06, 4, 10), gloveMat, wr, [0, -0.11, 0.012], [0.25, 0, 0], [1.05, 1, 0.6]);
    mesh(new THREE.CapsuleGeometry(0.013, 0.04, 4, 8), gloveMat, wr, [-s * -0.03, -0.06, 0.03], [0.4, 0, s * 0.5]);
    H.arms.push({ sh, el, wr, s });
  }
  // ---- legs ----
  H.legs = [];
  for (const s of [-1, 1]) {
    const th = new THREE.Group(); th.position.set(s * 0.092 * opt.build, -0.04, 0); hips.add(th);
    mesh(cap(0.075, 0.33), pantsMat, th);
    const kn = new THREE.Group(); kn.position.y = -0.445; th.add(kn);
    mesh(new THREE.SphereGeometry(0.066, 12, 10), pantsMat, kn);
    mesh(cap(0.058, 0.34), pantsMat, kn);
    const an = new THREE.Group(); an.position.y = -0.44; kn.add(an);
    mesh(new THREE.BoxGeometry(0.1, 0.1, 0.25), bootMat, an, [0, -0.015, 0.05]);
    mesh(new THREE.CylinderGeometry(0.062, 0.06, 0.12, 14), bootMat, an, [0, 0.05, 0]);
    mesh(new THREE.BoxGeometry(0.104, 0.02, 0.255), gunMat, an, [0, -0.06, 0.05]);
    H.legs.push({ th, kn, an, s });
  }
  // ---- umbrella (citizens) ----
  if (opt.umbrella) {
    const u = new THREE.Group(); H.arms[1].wr.add(u); u.position.set(0, -0.08, 0.02);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.95, 8), metalMat, u, [0, 0.45, 0]);
    const canopy = mesh(new THREE.ConeGeometry(0.58, 0.22, 16, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x0a1820, transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide }), u, [0, 0.98, 0]);
    mesh(new THREE.TorusGeometry(0.58, 0.012, 6, 48), new THREE.MeshBasicMaterial({ color: opt.umbrellaCol || new THREE.Color(0.3, 2.6, 3.2) }), u, [0, 0.87, 0], [Math.PI / 2, 0, 0]);
    H.umbrella = u;
  }

  // ---------------- pose ----------------
  H.state = { walk: 0, phase: 0, headYaw: 0, headPitch: 0, eyeYaw: 0, eyePitch: 0, lidUp: 0.42, lidLo: 0.5, brow: 0, blink: 0, lean: 0.04 };
  H.apply = () => {
    const S = H.state, ph = S.phase, w = S.walk;
    const sn = Math.sin(ph), cs = Math.cos(ph);
    hips.position.y = 0.95 * opt.height + w * (0.025 * Math.abs(Math.cos(ph)) - 0.02);
    hips.rotation.y = w * 0.09 * sn; hips.rotation.z = w * 0.035 * cs;
    spine.rotation.set(S.lean + w * 0.04, -w * 0.12 * sn, -w * 0.02 * cs);
    chest.rotation.set(0, 0, 0);
    neck.rotation.set(0.04 + S.headPitch * 0.35, S.headYaw * 0.4 + w * 0.06 * sn, 0);
    head.rotation.set(S.headPitch * 0.65, S.headYaw * 0.6, 0);
    for (const L of H.legs) {
      const p = ph + (L.s > 0 ? 0 : Math.PI);
      L.th.rotation.x = -w * 0.42 * Math.sin(p);
      L.kn.rotation.x = w * (0.55 * Math.max(0, Math.sin(p - 1.3)) + 0.12);
      L.an.rotation.x = w * 0.2 * Math.sin(p - 0.5) - L.kn.rotation.x * 0.3 - L.th.rotation.x * 0.3;
    }
    for (const A of H.arms) {
      const p = ph + (A.s > 0 ? Math.PI : 0);
      if (opt.umbrella && A.s > 0) { A.sh.rotation.set(-1.05, 0, 0.18); A.el.rotation.set(-1.0, 0.2, 0); A.wr.rotation.set(0.5, 0, 0); continue; }
      A.sh.rotation.set(-w * 0.38 * Math.sin(p) + 0.05, 0, A.s * 0.05);
      A.el.rotation.set(-0.25 - w * 0.25 * (1 + Math.sin(p)) * 0.5, 0, 0);
      A.wr.rotation.set(0, A.s * 0.15, 0);
    }
    for (const e of H.eyes) e.rotation.set(-S.eyePitch, S.eyeYaw, 0);
    const bl = S.blink;
    for (const l of H.lids) {
      l.up.rotation.x = -(S.lidUp * (1 - bl)) + S.eyePitch * 0.4;
      l.lo.rotation.x = S.lidLo * (1 - bl * 0.3) - S.eyePitch * 0.15;
    }
    for (const b of H.brows) { b.m.position.y = -S.brow * 0.03; b.m.rotation.z = b.s * -S.brow * 0.08; }
  };
  H.apply();
  return H;
}
