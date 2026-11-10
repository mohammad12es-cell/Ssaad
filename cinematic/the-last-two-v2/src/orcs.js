// The horde: ~28k orcs in three levels of detail. Front ranks have articulated arms/legs (run cycle,
// weapon pumps on the war-drum beat), glowing eyes, five weapon kits, torches and banners.
// Reactions to the heroes' fire (wave / ring / wall) are pre-simulated deterministically at load.
import * as THREE from "three";
import { V, clamp, lerp, smooth, rng, hash2, merge, M4, between, normalTex } from "./util.js";
import { fireLit, windy } from "./glsl.js";
import { groundH } from "./terrain.js";
import { WAVE, RING, WALL, waveFront, waveHalfWidth, waveHeight, ringRadius, wallHeight } from "./timeline.js";

const SKIN = 0x2b3326, SKIN2 = 0x353a2a, IRON = 0x1d1e21, RUST = 0x2e231c, BONE = 0x8a816c, LEATHER = 0x201811, CLOTH = 0x2a0d0c;
const S = (P, p, s, c, r = [0, 0, 0], seg = [12, 9]) => P.push({ g: new THREE.SphereGeometry(1, seg[0], seg[1]), m: M4(p, r, s), c });
const C = (P, a, b, r0, r1, c, seg = 9) => P.push({ ...between(V(...a), V(...b), r0, r1, seg), c });
const B = (P, p, s, c, r = [0, 0, 0]) => P.push({ g: new THREE.BoxGeometry(1, 1, 1), m: M4(p, r, s), c });
const K = (P, p, rad, h, c, r = [0, 0, 0]) => P.push({ g: new THREE.ConeGeometry(rad, h, 7), m: M4(p, r), c });

// ---- body (pelvis, torso, head, armour) in orc space; orc faces +z
function bodyParts(variant, r) {
  const P = [];
  const armored = variant === 1 || variant === 3 || r() < 0.4;
  C(P, [0, 0.98, 0], [0, 1.28, 0], 0.42, 0.38, LEATHER, 12);                     // belt / hips
  B(P, [0, 0.72, 0.3], [0.42, 0.55, 0.05], CLOTH, [0.12, 0, 0]); B(P, [0, 0.74, -0.3], [0.46, 0.55, 0.05], CLOTH, [-0.1, 0, 0]);
  for (let i = -2; i <= 2; i++) B(P, [i * 0.17, 0.92, 0.33], [0.15, 0.3, 0.04], IRON, [0.18, 0, 0]);   // tassets
  S(P, [0, 1.62, 0.04], [0.56, 0.62, 0.44], SKIN, [0.25, 0, 0]);                // torso mass
  S(P, [0, 1.42, 0.24], [0.4, 0.36, 0.26], SKIN2, [0.2, 0, 0]);                 // gut
  [-1, 1].forEach((sd) => { S(P, [sd * 0.19, 1.86, 0.3], [0.24, 0.17, 0.13], SKIN, [0.3, 0, sd * 0.15]); // pecs
    for (let k = 0; k < 3; k++) S(P, [sd * 0.1, 1.62 - k * 0.12, 0.42 - k * 0.01], [0.09, 0.06, 0.05], SKIN2); });                       // abs
  if (armored) { S(P, [0, 1.8, 0.2], [0.5, 0.42, 0.32], IRON, [0.3, 0, 0]); for (let k = 0; k < 4; k++) C(P, [-0.48, 1.55 - k * 0.1, 0.18], [0.48, 1.55 - k * 0.1, 0.18], 0.03, 0.03, RUST, 6); }
  else { C(P, [-0.42, 2.0, 0.25], [0.35, 1.35, 0.42], 0.035, 0.035, LEATHER, 6); C(P, [0.42, 2.0, 0.25], [-0.35, 1.35, 0.42], 0.035, 0.035, LEATHER, 6); }
  S(P, [0, 2.06, 0.02], [0.34, 0.22, 0.28], SKIN);                              // traps
  // head: low brow, heavy jaw, tusks, pointed ears
  S(P, [0, 2.2, 0.3], [0.2, 0.21, 0.22], SKIN);
  B(P, [0, 2.27, 0.48], [0.3, 0.06, 0.08], SKIN2, [0.3, 0, 0]);                  // brow ridge
  B(P, [0, 2.07, 0.43], [0.32, 0.15, 0.22], SKIN, [0.15, 0, 0]);                // jaw
  S(P, [0, 2.17, 0.53], [0.06, 0.05, 0.05], SKIN2);                             // nose
  [-1, 1].forEach((sd) => { K(P, [sd * 0.1, 2.15, 0.56], 0.028, 0.16, BONE, [0.2, 0, -sd * 0.25]); K(P, [sd * 0.22, 2.24, 0.26], 0.05, 0.22, SKIN, [0, 0, -sd * 1.3]); });
  if (variant !== 4 && r() < 0.65) { // helmet with horns / crest spikes
    S(P, [0, 2.3, 0.28], [0.24, 0.18, 0.26], IRON);
    if (r() < 0.5) [-1, 1].forEach((sd) => { C(P, [sd * 0.18, 2.36, 0.25], [sd * 0.38, 2.6, 0.18], 0.05, 0.03, BONE, 7); K(P, [sd * 0.45, 2.78, 0.12], 0.035, 0.32, BONE, [-0.3, 0, -sd * 0.6]); });
    else for (let k = 0; k < 4; k++) K(P, [0, 2.48 + k * 0.02, 0.38 - k * 0.12], 0.035, 0.24 + k * 0.03, IRON, [-0.2, 0, 0]);
  }
  [-1, 1].forEach((sd) => { S(P, [sd * 0.6, 2.02, 0.0], [0.34, 0.26, 0.34], IRON); // pauldrons with spikes
    for (let k = 0; k < 3; k++) K(P, [sd * (0.62 + k * 0.05), 2.26, -0.12 + k * 0.12], 0.05, 0.28, IRON, [0, 0, -sd * 0.55]); });
  if (variant === 3) { K(P, [-0.18, 2.5, -0.25], 0.06, 0.8, BONE, [-0.4, 0, 0.2]); K(P, [0.18, 2.5, -0.25], 0.06, 0.8, BONE, [-0.4, 0, -0.2]); } // trophy spikes
  return merge(P);
}
// ---- limbs in joint space (origin at shoulder/hip, hanging down -y)
function armParts(side, variant, r) {
  const P = [];
  C(P, [0, 0, 0], [0, -0.55, 0], 0.16, 0.14, SKIN); S(P, [0, -0.2, 0.04], [0.15, 0.2, 0.15], SKIN2);
  C(P, [0, -0.55, 0], [0, -1.02, 0.02], 0.14, 0.12, SKIN); C(P, [0, -0.7, 0], [0, -0.98, 0.02], 0.15, 0.135, IRON);
  S(P, [0, -1.1, 0.03], [0.14, 0.15, 0.14], SKIN);
  if (side > 0) { // weapon hand
    if (variant === 0) { C(P, [0, -1.1, -0.5], [0, -1.1, 1.75], 0.045, 0.04, LEATHER, 6); B(P, [0, -0.86, 1.5], [0.05, 0.62, 0.5], IRON); B(P, [0, -1.32, 1.5], [0.05, 0.3, 0.26], IRON); }
    else if (variant === 1) { C(P, [0, -1.1, -0.9], [0, -1.1, 2.7], 0.04, 0.035, LEATHER, 6); K(P, [0, -1.1, 2.95], 0.07, 0.5, IRON, [Math.PI / 2, 0, 0]); B(P, [0, -1.1, 2.6], [0.45, 0.05, 0.05], IRON); }
    else if (variant === 2) { B(P, [0, -1.1, 0.95], [0.05, 0.2, 1.7], IRON); B(P, [0, -1.1, 0.06], [0.36, 0.06, 0.08], IRON); B(P, [0, -1.02, 1.6], [0.05, 0.12, 0.35], IRON); }
    else if (variant === 3) { C(P, [0, -1.1, -0.4], [0, -1.1, 1.5], 0.05, 0.05, LEATHER, 6); B(P, [0, -1.1, 1.55], [0.42, 0.42, 0.62], IRON); K(P, [0, -1.1, 1.95], 0.1, 0.3, IRON, [Math.PI / 2, 0, 0]); }
    else { B(P, [0, -1.1, 0.75], [0.05, 0.16, 1.3], IRON); }
  } else {
    if (variant === 1 || variant === 3) { P.push({ g: new THREE.CylinderGeometry(0.62, 0.62, 0.07, 14), m: M4([-0.1, -0.85, 0.32], [Math.PI / 2, 0, 0], [1, 1, 1.3]), c: IRON }); K(P, [-0.1, -0.85, 0.42], 0.11, 0.2, BONE, [Math.PI / 2, 0, 0]); }
    if (variant === 4) { C(P, [0, -1.1, -0.2], [0, -1.1, 0.75], 0.035, 0.045, LEATHER, 6); C(P, [0, -1.1, 0.68], [0, -1.1, 0.8], 0.07, 0.06, RUST, 7); }
  }
  return merge(P);
}
function legParts() {
  const P = [];
  C(P, [0, 0, 0], [0, -0.55, 0.02], 0.2, 0.16, SKIN); C(P, [0, -0.55, 0.02], [0, -1.02, 0], 0.16, 0.12, SKIN);
  C(P, [0, -0.6, 0.06], [0, -0.98, 0.05], 0.16, 0.14, IRON); S(P, [0, -0.56, 0.12], [0.12, 0.11, 0.08], IRON);
  B(P, [0, -1.06, 0.1], [0.24, 0.12, 0.42], LEATHER);
  return merge(P);
}
function lod1(variant, r) { // whole orc, arms raised, single static mesh
  const P = [];
  const body = bodyParts(variant, r); P.push({ g: body, m: new THREE.Matrix4(), c: null, keep: true });
  const add = (geo, m) => P.push({ g: geo, m, c: null, keep: true });
  add(armParts(1, variant, r), M4([0.6, 1.95, 0], [-2.4, 0, -0.15])); add(armParts(-1, variant, r), M4([-0.6, 1.95, 0], [-0.5, 0, 0.1]));
  add(legParts(), M4([-0.27, 1.1, 0], [0.2, 0, 0])); add(legParts(), M4([0.27, 1.1, 0], [-0.3, 0, 0]));
  const geos = P.map(({ g, m }) => { const q = g.clone(); q.applyMatrix4(m); return q; });
  let n = 0; geos.forEach((q) => (n += q.attributes.position.count)); const out = new THREE.BufferGeometry();
  for (const nm of ["position", "normal", "color"]) { const arr = new Float32Array(n * 3); let o = 0; geos.forEach((q) => { arr.set(q.attributes[nm].array, o); o += q.attributes[nm].array.length; }); out.setAttribute(nm, new THREE.BufferAttribute(arr, 3)); }
  return out;
}
function lod2(variant) {
  const P = [];
  B(P, [0, 1.6, 0.05], [1.0, 1.25, 0.65], SKIN, [0.3, 0, 0]); B(P, [0, 0.55, 0], [0.62, 1.1, 0.5], LEATHER); B(P, [0, 2.02, 0], [1.4, 0.38, 0.6], IRON); B(P, [0, 2.25, 0.3], [0.36, 0.38, 0.4], SKIN);
  if (variant === 1) B(P, [0.72, 2.6, 0.3], [0.06, 4.6, 0.06], LEATHER);
  else if (variant === 3 || variant === 0) { B(P, [0.72, 2.3, 0.3], [0.07, 2.6, 0.07], LEATHER); B(P, [0.85, 3.4, 0.3], [0.6, 0.55, 0.06], IRON); }
  else B(P, [0.72, 2.4, 0.3], [0.08, 1.9, 0.08], IRON);
  if (variant === 1 || variant === 3) B(P, [-0.6, 1.5, 0.5], [1.0, 1.2, 0.07], IRON);
  return merge(P);
}

// ------------------------------------------------------------------ formation + fire reactions
export function buildHorde(scene) {
  const R = rng(1337);
  const orcs = [];
  for (let row = 0; row < 150; row++) {
    const z = -60 - row * 2.9 - (row > 18 ? (row - 18) * 0.6 : 0);
    const width = 130 + row * 4.8, sp = row < 16 ? 2.35 : 2.7 + row * 0.01;
    for (let x = -width; x <= width; x += sp) {
      const reg = Math.floor((x + 1000) / 26);
      if (((x + 1000) % 26) < 2.4 && row > 1) continue;
      if (R() < 0.05) continue;
      const jx = x + (R() - 0.5) * sp * 0.55, jz = z + (R() - 0.5) * 1.1;
      const lod = row < 14 && Math.abs(jx) < 96 ? 0 : row < 42 && Math.abs(jx) < 230 ? 1 : 2;
      const v = R(); const variant = v < 0.3 ? 0 : v < 0.52 ? 1 : v < 0.7 ? 2 : v < 0.82 ? 3 : 4;
      orcs.push({ x: jx, z0: jz, row, rot: (R() - 0.5) * 0.25 - jx * 0.001, scale: (variant === 3 ? 1.5 : 1.25) + R() * 0.25, tStart: 4.4 + row * 0.05 + R() * 0.35 + (reg % 3) * 0.08,
        spd: 6.2 + R() * 1.8, variant, lod, ph: R() * 6.283, seed: R(), hit: null });
    }
  }
  // deterministic pre-simulation of who the fire catches, and when
  const charge = (o, t) => { const dt = t - o.tStart; if (dt <= 0) return 0; const a = 2.6, tv = o.spd / a; return dt < tv ? 0.5 * a * dt * dt : 0.5 * a * tv * tv + o.spd * (dt - tv); };
  const WX = -0.75, WZ = -1.2, RX = 0.52, RZ = -0.1;
  for (const o of orcs) {
    if (o.row > 60) continue;
    for (let t = 8.8; t <= 15; t += 1 / 48) {
      const z = o.z0 + charge(o, t), x = o.x;
      const dd = WZ - z, F = waveFront(t);
      if (t >= WAVE.t0 && dd > 0 && dd <= F && dd > F - 9 && Math.abs(x - WX - WAVE.dirX * dd) <= waveHalfWidth(dd) && waveHeight(t, dd) > 0.6) { o.hit = { t, type: 0, x, z, dir: [0.15 * Math.sign(x - WX) * Math.min(1, Math.abs(x - WX) / 20), -1] }; break; }
      const rr = Math.hypot(x - RX, z - RZ), rad = ringRadius(t);
      if (t >= RING.t0 && t < RING.t0 + 2.2 && rr <= rad && rr > rad - 6) { o.hit = { t, type: 1, x, z, dir: [(x - RX) / rr, (z - RZ) / rr] }; break; }
      if (t >= WALL.t0 + Math.abs(x) / WALL.spread && z >= WALL.z - 7 && wallHeight(t, x) > 3) { o.hit = { t: Math.max(t, WALL.t0 + Math.abs(x) / WALL.spread + 0.05 * hash2(x, z)), type: 2, x, z, dir: [0, -1] }; break; }
    }
    if (o.hit) { const h = o.hit; const pw = [11, 13, 6][h.type] * (0.7 + 0.6 * o.seed); h.vh = pw; h.vy = [6.5, 7.5, 9][h.type] * (0.7 + 0.6 * hash2(o.x, 3)); h.land = (2 * h.vy) / 9.8; h.spin = (hash2(o.x, o.z0) - 0.5) * 2; }
  }
  // ---- meshes
  const mat = fireLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3, envMapIntensity: 0.8,
    normalMap: normalTex(128, 128, (x, y) => Math.sin(x * 0.9) * Math.sin(y * 0.7) * 0.2 + hash2(x, y) * 0.3, 1.5, { repeat: [4, 4] }) }), { key: "orc" });
  const byKey = {};
  orcs.forEach((o) => { const k = o.lod + "_" + o.variant; (byKey[k] = byKey[k] || []).push(o); });
  const groups = [];
  const charColor = new THREE.Color();
  for (const k in byKey) {
    const [lod, variant] = k.split("_").map(Number), list = byKey[k], r = rng(variant * 31 + lod);
    const parts = lod === 0 ? [bodyParts(variant, r), armParts(1, variant, r), armParts(-1, variant, r), legParts(), legParts()] : [lod === 1 ? lod1(variant, r) : lod2(variant)];
    const ims = parts.map((g) => { const im = new THREE.InstancedMesh(g, mat, list.length); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = lod === 0;
      for (let i = 0; i < list.length; i++) im.setColorAt(i, charColor.setRGB(1, 1, 1)); scene.add(im); return im; });
    let eyes = null;
    if (lod === 0) { eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.55, 0.12) }), list.length * 2); eyes.frustumCulled = false; scene.add(eyes); }
    groups.push({ lod, variant, list, ims, eyes });
  }
  // banners carried on poles strapped to some backs
  const bearers = orcs.filter((o, i) => (o.lod === 0 ? hash2(i, 1) < 0.035 : o.lod === 1 ? hash2(i, 2) < 0.012 : false));
  const poleIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 6.0, 5).translate(0, 4.0, -0.3), fireLit(new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.8 })), bearers.length);
  const flagGeo = (() => { const g = new THREE.PlaneGeometry(1.5, 2.8, 6, 12); const p = g.attributes.position, tip = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.75; tip[i] = x / 1.5; p.setY(i, p.getY(i) - 0.15 * x * x); }
    g.translate(0.75, 5.4, -0.3); g.rotateY(Math.PI / 2); g.setAttribute("aTip", new THREE.BufferAttribute(tip, 1)); return g; })();
  const flagTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 128; const g = c.getContext("2d"); const rr = rng(9);
    g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 128); g.fillStyle = "#000";
    for (let i = 0; i < 40; i++) { const x = 40 + rr() * 24, y = rr() * 128; g.beginPath(); g.moveTo(64, y); g.lineTo(x, y + 4 + rr() * 10); g.lineTo(64, y + 14); g.fill(); }
    for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(rr() * 64, rr() * 128, 2 + rr() * 4, 0, 7); g.fill(); }
    return new THREE.CanvasTexture(c); })();
  const flagIM = new THREE.InstancedMesh(flagGeo, fireLit(windy(new THREE.MeshStandardMaterial({ color: 0x4a070c, roughness: 0.7, side: THREE.DoubleSide, alphaMap: flagTex, alphaTest: 0.5 }), 0.55, "flag"), { key: "flag" }), bearers.length);
  poleIM.frustumCulled = flagIM.frustumCulled = false; scene.add(poleIM, flagIM);
  const torchers = orcs.filter((o) => o.variant === 4 && o.lod <= 1);

  // ---- per-frame
  const mRoot = new THREE.Matrix4(), mPart = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = V(), s = V(), joint = new THREE.Matrix4();
  const beat = (t) => { let v = 0; for (let b = 0; b < 4.6; b += 0.75) v += Math.exp(-Math.pow((t - b - 0.06) / 0.11, 2)); return v; };
  function state(o, t) {
    const run = clamp((t - o.tStart) * 1.1), dz = charge(o, t);
    let x = o.x, z = o.z0 + dz, y = 0, pitch = run * (0.3 + 0.05 * Math.sin((t - o.tStart) * 9 + o.ph)), roll = 0, yaw = o.rot * (1 - run * 0.6), burn = 0, flail = 0;
    const stride = (t - o.tStart) * (2.4 + o.spd * 0.16) * Math.PI;
    y = run * Math.abs(Math.sin(stride + o.ph)) * 0.2 + (1 - run) * 0.02 * Math.sin(t * 1.7 + o.ph);
    const h = o.hit;
    if (h && t >= h.t) {
      const tau = t - h.t, k = 2.2, fly = Math.min(tau, h.land);
      const d = h.vh * (1 - Math.exp(-k * fly)) / k;
      x = h.x + h.dir[0] * d; z = h.z + h.dir[1] * d;
      y = Math.max(0, h.vy * fly - 4.9 * fly * fly);
      const fall = smooth(0, h.land * 1.05, tau);
      pitch = lerp(pitch, (h.dir[1] < 0 ? -1.45 : 1.45), fall) + (tau < h.land ? h.spin * 0.6 * Math.sin(tau * 6) : 0); roll = h.spin * 1.2 * fall;
      yaw = h.type === 1 ? Math.atan2(-h.dir[0], -h.dir[1]) : yaw;
      burn = clamp(tau / 0.6); flail = 1 - fall;
    }
    return { x, y, z, pitch, roll, yaw, run, stride, burn, flail };
  }
  function update(t) {
    for (const G of groups) {
      const { lod, list, ims, eyes } = G;
      for (let i = 0; i < list.length; i++) {
        const o = list[i], st = state(o, t);
        p.set(st.x, groundH(st.x, st.z) + st.y * o.scale, st.z); e.set(st.pitch, st.yaw, st.roll, "YXZ"); q.setFromEuler(e); s.setScalar(o.scale);
        mRoot.compose(p, q, s);
        if (st.burn > 0) { const c = 1 - 0.78 * st.burn; for (const im of ims) im.setColorAt(i, charColor.setRGB(c * 1.05, c * 0.9, c * 0.85)); }
        else if (o.hit) for (const im of ims) im.setColorAt(i, charColor.setRGB(1, 1, 1));
        if (lod > 0) { ims[0].setMatrixAt(i, mRoot); continue; }
        ims[0].setMatrixAt(i, mRoot);
        const pump = (1 - st.run) * beat(t) * 0.55;
        const fl = st.flail;
        const armR = lerp(-0.45 - pump * 2.2, -2.5 + 0.25 * Math.sin(st.stride * 2 + o.ph), st.run) + fl * 1.5 * Math.sin(t * 13 + o.ph);
        const armL = lerp(-0.25 - pump * 0.6, 0.5 * Math.sin(st.stride + o.ph) - 0.3, st.run) - fl * 1.2 * Math.sin(t * 11 + o.ph * 2);
        const legA = 0.75 * Math.sin(st.stride + o.ph) * st.run + fl * 0.8 * Math.sin(t * 10 + o.ph);
        const set = (im, px, py, ang, rz) => { joint.compose(V(px, py, 0), q.setFromEuler(e.set(ang, 0, rz)), V(1, 1, 1)); mPart.multiplyMatrices(mRoot, joint); im.setMatrixAt(i, mPart); };
        set(ims[1], 0.6, 1.95, armR, -0.12); set(ims[2], -0.6, 1.95, armL, 0.12);
        set(ims[3], -0.27, 1.1, -legA, 0); set(ims[4], 0.27, 1.1, legA, 0);
        for (const sd of [0, 1]) { joint.makeTranslation(sd ? 0.075 : -0.075, 2.21, 0.5); mPart.multiplyMatrices(mRoot, joint); eyes.setMatrixAt(i * 2 + sd, mPart); }
      }
      for (const im of ims) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
      if (eyes) eyes.instanceMatrix.needsUpdate = true;
    }
    bearers.forEach((o, i) => { const st = state(o, t); p.set(st.x, groundH(st.x, st.z) + st.y * o.scale, st.z); e.set(st.pitch, st.yaw, st.roll, "YXZ"); q.setFromEuler(e); s.setScalar(o.scale);
      mRoot.compose(p, q, s); poleIM.setMatrixAt(i, mRoot); flagIM.setMatrixAt(i, mRoot); });
    poleIM.instanceMatrix.needsUpdate = flagIM.instanceMatrix.needsUpdate = true;
  }
  // world positions of torch flames and burning bodies (for flame sprites)
  function torchFlames(t, out) {
    for (const o of torchers) { const st = state(o, t); if (st.burn > 0.5) continue;
      p.set(st.x, groundH(st.x, st.z) + st.y * o.scale, st.z); e.set(st.pitch, st.yaw, st.roll, "YXZ"); q.setFromEuler(e); s.setScalar(o.scale); mRoot.compose(p, q, s);
      const armL = lerp(-0.25, 0.5 * Math.sin(st.stride + o.ph) - 0.3, st.run);
      const lodArm = o.lod === 0 ? armL : -0.5;
      joint.compose(V(-0.6, 1.95, 0), q.setFromEuler(e.set(lodArm, 0, 0.12)), V(1, 1, 1)); mPart.multiplyMatrices(mRoot, joint);
      out.push({ p: V(0, -1.1, 0.85).applyMatrix4(mPart), s: 0.55 * o.scale, i: 0.9 }); }
  }
  function burningBodies(t, out) {
    for (const o of orcs) { const h = o.hit; if (!h || t < h.t) continue; const st = state(o, t); const age = t - h.t;
      const life = 1 - smooth(3.5, 6.5, age);
      if (life <= 0) continue;
      out.push({ p: V(st.x, groundH(st.x, st.z) + st.y * o.scale + 0.9 * o.scale * (1 - 0.6 * smooth(0, h.land, age)), st.z), s: (1.4 + 0.8 * o.seed) * o.scale * smooth(0, 0.25, age) * life, i: 1.2 * life, seed: o.seed }); }
  }
  return { orcs, update, torchFlames, burningBodies, state };
}
