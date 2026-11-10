// The two heroes: sculpted heads with eyes and strand hair, lamellar (kozane) armour laced plate by
// plate, hakama, armoured sleeves, full-body rig (pelvis/torso + 2-bone IK arms and legs), katanas.
import * as THREE from "three";
import { V, clamp, lerp, smooth, rng, hash2, fbm, between, place, ik2, canvasTex, normalTex } from "./util.js";
import { G, FIRE, NOISE, FIRE_PARS, fireLit, windy } from "./glsl.js";

// ------------------------------------------------------------------ shared textures
const RAIN_TEX = (() => { // droplets + running streaks, used as clearcoat normal map on lacquer/skin/steel
  const r = rng(41), W = 256, Hh = new Float32Array(W * W);
  for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * W, rad = 1.5 + r() * 4.5, streak = r() < 0.3 ? 4 + r() * 18 : 0;
    for (let yy = -rad - streak; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) {
      const yv = yy < 0 ? Math.min(0, yy + streak) : yy, d = Math.hypot(xx, yv) / rad; if (d >= 1) continue;
      const k = ((Math.floor(y + yy) + W) % W) * W + ((Math.floor(x + xx) + W) % W); Hh[k] = Math.max(Hh[k], Math.sqrt(1 - d * d) * (yy < 0 && streak ? 0.5 : 1)); } }
  const t = normalTex(W, W, (x, y) => Hh[y * W + x], 3.5, { repeat: [3, 3] }); return t;
})();
const PORES = normalTex(256, 256, (x, y) => fbm(x * 0.35, y * 0.35, 3) * 0.6 + hash2(x, y) * 0.15, 1.6, { repeat: [6, 6] });
const WEAVE = normalTex(128, 128, (x, y) => 0.5 + 0.25 * Math.sin(x * 0.785 * 4) * Math.sin(y * 0.785 * 4) + 0.2 * Math.sin(y * 0.4 + fbm(x * 0.1, y * 0.05, 2) * 6), 2.2, { repeat: [10, 10] });
const MAIL = normalTex(128, 128, (x, y) => { const cx = (x % 16) - 8, cy = (y % 16) - 8 + ((Math.floor(x / 16) % 2) * 8); const yy = ((cy + 24) % 16) - 8; const d = Math.hypot(cx, yy); return Math.exp(-Math.pow((d - 5.5) / 1.6, 2)); }, 3, { repeat: [8, 8] });
const CORD = (col) => canvasTex(32, 128, (x, y) => { const s = 0.75 + 0.25 * Math.sin((x + y) * 0.9); const c = new THREE.Color(col); return [c.r * s, c.g * s, c.b * s]; }, { srgb: true, repeat: [1, 1] });

function lacquer(color, extra = {}) {
  return fireLit(new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04,
    clearcoatNormalMap: RAIN_TEX, clearcoatNormalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.3, ...extra }));
}
const std = (o) => fireLit(new THREE.MeshStandardMaterial(o));

// ------------------------------------------------------------------ lamellar construction
// rows of overlapping kozane plates around an ellipse (θ = 0 faces forward/-z), with vertical lacing
function lamellar(parent, rows, matPlate, matLace, matEdge) {
  const plates = [], laces = [], edges = [];
  const dummy = new THREE.Object3D();
  rows.forEach((R) => {
    const { rx, rz, y, h, a0, a1, n, flare = 0.12, lean = 0, shift = [0, 0] } = R;
    for (let i = 0; i < n; i++) {
      const th = a0 + (a1 - a0) * (i + 0.5) / n;
      const px = Math.sin(th) * rx + shift[0], pz = -Math.cos(th) * rz + shift[1];
      const nx = Math.sin(th) / rx, nz = -Math.cos(th) / rz, yaw = Math.atan2(nx, nz);
      const segLen = Math.hypot(Math.cos(th) * rx, Math.sin(th) * rz) * (a1 - a0) / n * 1.18;
      dummy.position.set(px, y, pz); dummy.rotation.set(0, 0, 0); dummy.rotateY(yaw); dummy.rotateX(-(flare + lean));
      dummy.scale.set(segLen, h, 1); dummy.updateMatrix(); plates.push(dummy.matrix.clone());
      for (const off of [-0.22, 0.22]) {
        const l = dummy.clone(); l.translateX(off * segLen); l.translateZ(0.0035); l.translateY(-h * 0.12); l.scale.set(segLen * 0.2, h * 0.72, 1); l.updateMatrix(); laces.push(l.matrix.clone());
      }
      if (R.edge) { const e = dummy.clone(); e.translateY(h * 0.47); e.translateZ(0.003); e.scale.set(segLen * 1.02, 0.006, 1.4); e.updateMatrix(); edges.push(e.matrix.clone()); }
    }
  });
  const mk = (geo, mat, list) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = im.receiveShadow = true; parent.add(im); };
  mk(new THREE.BoxGeometry(1, 1, 0.0045), matPlate, plates);
  mk(new THREE.BoxGeometry(1, 1, 0.003), matLace, laces);
  mk(new THREE.BoxGeometry(1, 1, 0.004), matEdge, edges);
}

// ------------------------------------------------------------------ head
function sculptHead(fem) {
  const a = fem ? 0.071 : 0.076, b = fem ? 0.1 : 0.106, c = fem ? 0.09 : 0.095;
  const g = new THREE.SphereGeometry(1, 150, 110);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  const gs = (u, v, cu, cv, su, sv = su) => Math.exp(-((u - cu) ** 2) / (2 * su * su) - ((v - cv) ** 2) / (2 * sv * sv));
  const skin = new THREE.Color(fem ? 0xb98a70 : 0xa77a5e), lip = new THREE.Color(fem ? 0x9a5552 : 0x8a5a4e), stub = new THREE.Color(0x4a3a32);
  for (let i = 0; i < p.count; i++) {
    const dx = p.getX(i), dy = p.getY(i), dz = p.getZ(i);
    let x = dx * a, y = dy * b, z = dz * c;
    // jaw & chin taper, flatter temples, face plane
    const low = smooth(0.0, -0.95, dy);
    x *= 1 - (fem ? 0.36 : 0.28) * low; z *= 1 - 0.1 * low * (dz > 0 ? 1 : 0);
    if (dz < 0) z += (fem ? 0.006 : 0.008) * low;
    x *= 1 - 0.06 * smooth(0.3, 0.8, dy);
    const front = smooth(-0.15, -0.65, dz);
    const u = x, v = y;
    let f = 0;
    f += 0.017 * Math.exp(-((u / 0.0085) ** 2)) * smooth(0.016, 0.0, v) * smooth(-0.038, -0.024, v); // nose bridge -> tip
    f += 0.009 * gs(u, v, 0, -0.031, 0.009, 0.007);                       // nose tip
    f += 0.005 * (gs(u, v, 0.013, -0.034, 0.006) + gs(u, v, -0.013, -0.034, 0.006)); // alae
    f -= 0.0035 * gs(u, v, 0, -0.04, 0.004, 0.002);                       // under-nose
    f -= 0.013 * (gs(u, v, 0.031, 0.012, 0.015, 0.0105) + gs(u, v, -0.031, 0.012, 0.015, 0.0105)); // eye sockets
    f += 0.0065 * Math.exp(-(((v - 0.032) / 0.0075) ** 2)) * smooth(0.06, 0.035, Math.abs(u)) * (fem ? 0.6 : 1); // brow ridge
    f += 0.0075 * (gs(u, v, 0.046, -0.012, 0.016) + gs(u, v, -0.046, -0.012, 0.016));            // cheekbones
    f -= 0.004 * (gs(u, v, 0.04, -0.045, 0.012) + gs(u, v, -0.04, -0.045, 0.012));              // under-cheek hollow
    f += 0.0058 * gs(u, v, 0, -0.051, 0.019, 0.0055);  // upper lip
    f += 0.006 * gs(u, v, 0, -0.062, 0.016, 0.0055);   // lower lip
    f -= 0.0028 * gs(u, v, 0, -0.0567, 0.021, 0.0018); // mouth line
    f += 0.008 * gs(u, v, 0, -0.083, 0.019, 0.011);    // chin
    f += (fem ? 0.0 : 0.004) * (gs(u, v, 0.045, -0.07, 0.015) + gs(u, v, -0.045, -0.07, 0.015)); // strong jaw angle
    z -= f * front;
    p.setXYZ(i, x, y, z);
    // skin colour: lips, stubble, cheek warmth
    const c0 = skin.clone();
    const lips = (gs(u, v, 0, -0.051, 0.017, 0.005) + gs(u, v, 0, -0.062, 0.015, 0.005)) * front;
    c0.lerp(lip, clamp(lips * 1.2));
    if (!fem) c0.lerp(stub, clamp((smooth(-0.04, -0.075, v) * 0.55 + gs(u, v, 0, -0.045, 0.02, 0.004) * 0.5) * front * (1 - lips)) * 0.8);
    c0.lerp(new THREE.Color(0xb06a5a), 0.18 * (gs(u, v, 0.045, -0.02, 0.018) + gs(u, v, -0.045, -0.02, 0.018)) * front);
    col[i * 3] = c0.r; col[i * 3 + 1] = c0.g; col[i * 3 + 2] = c0.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return { g, a, b, c };
}
function eyeGeo() {
  const g = new THREE.SphereGeometry(0.0118, 64, 48); g.rotateX(-Math.PI / 2); // pole -> -z (looking forward)
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const ang = Math.acos(clamp(-p.getZ(i) / 0.0118, -1, 1)), az = Math.atan2(p.getY(i), p.getX(i));
    let c;
    if (ang < 0.2) c = [0.01, 0.008, 0.007];
    else if (ang < 0.5) { const s = 0.5 + 0.5 * Math.sin(az * 23) * 0.4; c = [0.16 * s + 0.04, 0.09 * s + 0.02, 0.05 * s + 0.01]; if (ang > 0.44) c = c.map((x) => x * 0.4); }
    else c = [0.62, 0.57, 0.53].map((x, k) => x - (k === 0 ? -0.04 : 0.03) * smooth(1.2, 1.7, ang));
    col.set(c, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); return g;
}

// ------------------------------------------------------------------ strand hair (thousands of lit, wind-driven strands)
const hairMat = (base) => new THREE.ShaderMaterial({
  uniforms: { uTime: G.time, uGust: G.gust, uFlash: G.flash, uBase: { value: new THREE.Color(base) }, uFirePosW: FIRE.posW, uFireCol: FIRE.col,
    uKey: { value: new THREE.Vector3(0.3, 0.6, -0.7).normalize() }, uFogD: G.fogDensity, uFogC: G.fogColor },
  vertexShader: `${FIRE_PARS}
    attribute float aT; attribute float aSeed; attribute vec3 aTan;
    uniform float uTime, uGust; varying vec3 vT; varying vec3 vW; varying float vTip; varying vec3 vFire;
    void main(){
      vec4 w = modelMatrix * vec4(position, 1.0);
      float tip = pow(aT, 1.35);
      float ph = aSeed * 6.283;
      vec3 wind = vec3(0.35 * sin(uTime*7.0 + ph + aT*5.0) + 0.15*sin(uTime*15.0 + ph*3.0 - aT*9.0),
                       0.10 + 0.12 * sin(uTime*9.0 + ph*2.0 - aT*6.0),
                       1.0 + 0.3 * sin(uTime*5.0 + ph - aT*4.0));
      w.xyz += wind * tip * 0.14 * uGust * (0.7 + 0.6*fract(aSeed*7.13));
      vT = normalize(mat3(modelMatrix) * aTan + wind * tip * 0.3);
      vW = w.xyz; vTip = aT; vFire = fireAtW(w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `uniform vec3 uBase, uKey; uniform float uFlash, uFogD; uniform vec3 uFogC; varying vec3 vT; varying vec3 vW; varying float vTip; varying vec3 vFire;
    void main(){
      vec3 Vd = normalize(cameraPosition - vW); vec3 T = normalize(vT);
      vec3 Hh = normalize(uKey + Vd); float th = dot(T, Hh); float spec = pow(sqrt(max(0.0, 1.0 - th*th)), 60.0);
      float diff = sqrt(max(0.0, 1.0 - pow(dot(T, uKey), 2.0)));
      vec3 key = vec3(0.32,0.38,0.5) * (0.35 + uFlash * 3.0);
      vec3 col = uBase * (0.08 + diff * key + vFire * 0.6) + spec * (key * 0.5 + vFire * 0.25);
      col *= mix(1.0, 0.75, vTip);
      float f = 1.0 - exp(-uFogD * length(cameraPosition - vW)); col = mix(col, uFogC * (1.0 + uFlash*1.3), f);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
function strands(curves, base) { // curves: arrays of Vector3 (root->tip), each becomes a polyline
  let segs = 0; curves.forEach((c) => (segs += c.length - 1));
  const pos = new Float32Array(segs * 6), aT = new Float32Array(segs * 2), seed = new Float32Array(segs * 2), tan = new Float32Array(segs * 6);
  let o = 0;
  curves.forEach((c, ci) => { const s = hash2(ci, 7.7);
    for (let k = 0; k < c.length - 1; k++) { const a = c[k], b = c[k + 1], d = b.clone().sub(a).normalize();
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], o * 6); aT.set([k / (c.length - 1), (k + 1) / (c.length - 1)], o * 2); seed.set([s, s], o * 2); tan.set([d.x, d.y, d.z, d.x, d.y, d.z], o * 6); o++; } });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)); g.setAttribute("aTan", new THREE.BufferAttribute(tan, 3));
  const l = new THREE.LineSegments(g, hairMat(base)); l.frustumCulled = false; return l;
}
function maleHair(H) { // long loose hair falling over the back and shoulders
  const r = rng(11), out = [];
  for (let i = 0; i < 5200; i++) {
    const th = (r() - 0.5) * 2 * Math.PI * 0.86, ph = r() * 1.0;            // azimuth around head (0 = back), elevation
    const dir = V(Math.sin(th) * Math.cos(ph * 1.2), Math.sin(ph * 1.25) * 0.95 + 0.05, Math.cos(th) * Math.cos(ph * 1.2)).normalize();
    if (dir.z < 0.0) continue; // swept back: the face stays clear
    const root = V(dir.x * H.a * 1.02, dir.y * H.b * 1.0 + 0.004, dir.z * H.c * 1.02);
    const L = 0.3 + 0.24 * r() + 0.12 * Math.max(0, Math.cos(th)), K = 12, pts = [root];
    let p = root.clone(); const out0 = dir.clone().multiplyScalar(0.012);
    for (let k = 1; k <= K; k++) {
      const s = k / K; const q = root.clone().add(out0.clone().multiplyScalar(Math.min(1, s * 4)));
      q.x *= 1 + 0.25 * s; q.y -= L * Math.pow(s, 0.9) * (dir.y > 0 ? 1 : 0.85);
      q.z += 0.06 * s * s + Math.max(0, Math.cos(th)) * 0.04 * s; q.x += (r() - 0.5) * 0.006 * s;
      // stay outside the skull / neck volume
      const e = Math.hypot(q.x / (H.a * 1.06), (q.y - 0.0) / (H.b * 1.06), q.z / (H.c * 1.06)); if (e < 1 && q.y > -0.08) q.multiplyScalar(1 / e).setY(q.y);
      if (q.y < -0.12) { q.z = Math.max(q.z, 0.05 + 0.04 * Math.cos(th)); q.x = Math.sign(q.x) * Math.max(Math.abs(q.x), 0.06 * Math.abs(Math.sin(th))); }
      pts.push(q); p = q;
    }
    out.push(pts);
  }
  return out;
}
function femaleHair(H, tie) { // pulled back tight into a high ponytail
  const r = rng(23), out = [];
  for (let i = 0; i < 2600; i++) {
    const th = (r() - 0.5) * 2 * Math.PI * 0.95, ph = r() * 1.1;
    const dir = V(Math.sin(th) * Math.cos(ph), Math.sin(ph) * 0.95 + 0.1, Math.cos(th) * Math.cos(ph)).normalize();
    if (dir.z < -0.2 && dir.y < 0.58) continue;
    const root = V(dir.x * H.a * 1.015, dir.y * H.b * 1.0 + 0.003, dir.z * H.c * 1.015), pts = [];
    for (let k = 0; k <= 8; k++) { const s = k / 8; const q = root.clone().lerp(tie, s * s * (3 - 2 * s));
      const e = Math.hypot(q.x / (H.a * 1.025), q.y / (H.b * 1.02), q.z / (H.c * 1.025)); if (e < 1) q.multiplyScalar(1 / e); pts.push(q); }
    out.push(pts);
  }
  for (let i = 0; i < 3400; i++) { // the tail
    const L = 0.42 + 0.22 * r(), a = r() * 6.283, rad = Math.sqrt(r()) * 0.018, pts = [];
    for (let k = 0; k <= 12; k++) { const s = k / 12;
      pts.push(V(tie.x + Math.cos(a) * rad * (1 + s * 1.8) + (r() - 0.5) * 0.004 * s, tie.y + 0.012 - L * Math.pow(s, 1.15) + 0.03 * Math.sin(s * 3.1), tie.z + 0.02 + Math.sin(a) * rad * (1 + s * 1.5) + 0.07 * s)); }
    out.push(pts);
  }
  return out;
}

// ------------------------------------------------------------------ katana
const HAMON = (heat) => canvasTex(64, 512, (x, y) => {
  const u = x / 63, v = y / 511;
  const uh = 0.24 + 0.055 * Math.sin(v * 58) + 0.03 * Math.sin(v * 143 + 1) + 0.02 * (fbm(v * 30, 1.3, 3) - 0.5);
  if (heat) { const k = u < 0.5 ? clamp(1 - u / 0.42) : 0.15 * clamp(1 - (u - 0.5) * 3); return [k, k, k]; }
  if (u < 0.5) { const fro = smooth(uh + 0.02, uh - 0.02, u); return [0, lerp(0.07, 0.3, fro), 0]; } // G = roughness
  return [0, u < 0.8 ? 0.05 : 0.14, 0];
});
const HAMON_C = canvasTex(64, 512, (x, y) => { const u = x / 63, v = y / 511; const uh = 0.24 + 0.055 * Math.sin(v * 58) + 0.03 * Math.sin(v * 143 + 1);
  if (u < 0.5) { const fro = smooth(uh + 0.02, uh - 0.02, u); return [lerp(0.86, 1, fro), lerp(0.88, 1, fro), lerp(0.92, 1, fro)]; } return u < 0.8 ? [0.78, 0.8, 0.84] : [0.72, 0.73, 0.76]; }, { srgb: true });
const HAMON_R = HAMON(false), HEAT = HAMON(true);
function bladeGeo() {
  const Lb = 0.72, N = 56, pos = [], nor = [], uv = [], idx = [];
  const section = (s) => {
    const w = lerp(0.031, 0.024, s), th = lerp(0.0075, 0.0055, s);
    const q = clamp((s - 0.925) / 0.075);
    const xm = -w / 2, xe = -w / 2 + w * Math.sqrt(Math.max(0, 1 - q * q)) + 0.0001;
    const xs = xm + (xe - xm) * 0.6, t2 = th * (1 - 0.55 * q) / 2;
    const cx = -0.022 * s * s, y = s * Lb;
    return [[xe, 0, 0], [xs, t2, 0.5], [xm + 0.0015, t2 * 0.75, 0.62], [xm, 0, 0.8], [xm + 0.0015, -t2 * 0.75, 0.62], [xs, -t2, 0.5]].map(([x, z, u]) => [x + cx, y, z, u]);
  };
  const faces = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]];
  faces.forEach(([a, b]) => {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) { const s = i / N, S = section(s); for (const j of [a, b]) { const [x, y, z, u] = S[j]; pos.push(x, y, z); uv.push(j === 0 ? 0 : (a === 0 || b === 0 ? 0.5 : u), s); } }
    for (let i = 0; i < N; i++) { const k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  // make sure faces point outward (flip if the winding produced inward normals)
  const n = g.attributes.normal, p = g.attributes.position; let dot = 0; for (let i = 0; i < n.count; i += 37) dot += n.getZ(i) * p.getZ(i);
  if (dot < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}
function makeKatana(fem) {
  const k = new THREE.Group();
  const blade = new THREE.Mesh(bladeGeo(), fireLit(new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: HAMON_C, metalness: 1, roughness: 1, roughnessMap: HAMON_R,
    envMapIntensity: 2.4, clearcoat: 0.5, clearcoatRoughness: 0.05, clearcoatNormalMap: RAIN_TEX, emissive: 0xff3a10, emissiveMap: HEAT, emissiveIntensity: 0 })));
  blade.castShadow = true; k.add(blade); k.userData.blade = blade;
  const gold = std({ color: 0x8c6a2c, metalness: 1, roughness: 0.32 }), iron = std({ color: 0x1d1c1e, metalness: 0.9, roughness: 0.45 });
  const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.03, 0.011), gold); habaki.position.set(-0.001, 0.015, 0); k.add(habaki);
  const sh = new THREE.Shape(); for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, r = 0.037 * (1 + 0.06 * Math.cos(a * 4)); const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.86; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const hole = (cx, cy, rx, ry) => { const h = new THREE.Path(); for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; i ? h.lineTo(x, y) : h.moveTo(x, y); } return h; };
  sh.holes.push(hole(0, 0.019, 0.0045, 0.008), hole(0, -0.019, 0.0045, 0.008));
  const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2 }); tg.rotateX(Math.PI / 2); tg.rotateY(Math.PI / 2); tg.translate(0, 0.003, 0);
  const tsuba = new THREE.Mesh(tg, fem ? gold : iron); k.add(tsuba);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0016, 6, 48), gold); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 0.86, 1); k.add(rim);
  const wrap = canvasTex(128, 256, (x, y) => { // tsuka-ito diamonds over same-gawa
    const u = (x / 128) * 4, v = (y / 256) * 12; const d = Math.abs(((u + v) % 2) - 1) + Math.abs(((u - v + 100) % 2) - 1);
    const ito = new THREE.Color(fem ? 0x5a0b12 : 0x0d0d10), same = new THREE.Color(0xd8d0c0);
    const c = d > 1.55 ? same : ito.clone().multiplyScalar(0.7 + 0.3 * Math.sin((x + y) * 0.6)); return [c.r, c.g, c.b]; }, { srgb: true });
  const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0135, 0.255, 20), std({ map: wrap, roughness: 0.7 })); tsuka.scale.set(1, 1, 0.78); tsuka.position.y = -0.133; k.add(tsuka);
  const kash = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), fem ? gold : iron); kash.position.y = -0.26; kash.scale.set(1, 0.6, 0.8); k.add(kash);
  return k;
}
export const KATANA_LEN = 0.72;

// ------------------------------------------------------------------ glove / fist wrapped around a handle (handle axis = local y)
function fistGeo() {
  const P = [];
  const add = (g, p, r = [0, 0, 0], s = [1, 1, 1]) => P.push({ g, m: new THREE.Matrix4().compose(V(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(...s)) });
  add(new THREE.SphereGeometry(1, 16, 12), [0.026, 0, 0], [0, 0, 0], [0.022, 0.046, 0.03]); // palm/back of hand
  for (let f = 0; f < 4; f++) { const y = 0.03 - f * 0.019;
    for (let s = 0; s < 3; s++) { const a = -0.3 - s * 1.0; add(new THREE.CylinderGeometry(0.0085, 0.0095, 0.024, 8), [0.024 * Math.cos(a), y, 0.024 * Math.sin(a) - 0.002], [Math.PI / 2, 0, -a], [1, 1, 1]); } }
  add(new THREE.CylinderGeometry(0.009, 0.011, 0.045, 8), [0.012, 0.05, -0.022], [0.3, 0, 0.7]); // thumb
  return mergeSimple(P);
}
function mergeSimple(parts) { const geos = parts.map(({ g, m }) => { const q = g.toNonIndexed(); q.applyMatrix4(m); q.deleteAttribute("uv"); return q; });
  let n = 0; geos.forEach((q) => (n += q.attributes.position.count)); const out = new THREE.BufferGeometry();
  for (const nm of ["position", "normal"]) { const arr = new Float32Array(n * 3); let o = 0; geos.forEach((q) => { arr.set(q.attributes[nm].array, o); o += q.attributes[nm].array.length; }); out.setAttribute(nm, new THREE.BufferAttribute(arr, 3)); }
  return out; }

function skinFill(n, fem) { const c = new THREE.Color(fem ? 0xa97a62 : 0x976a50), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); return a; }
// ------------------------------------------------------------------ the samurai
export function makeSamurai(fem) {
  const S = {};
  const scale = fem ? 0.95 : 1;
  const root = new THREE.Group(); const rig = new THREE.Group(); rig.scale.setScalar(scale); root.add(rig);
  const plateC = fem ? 0x5c0a12 : 0x0b0b0d, laceC = fem ? 0x0c0a0b : 0x4a0a10, edgeC = fem ? 0x8c6a2c : 0x3a3b40;
  const mPlate = lacquer(plateC), mPlate2 = lacquer(fem ? 0x2a0508 : 0x141417);
  const mLace = std({ color: 0xffffff, map: CORD(laceC), roughness: 0.62 });
  const mLace2 = std({ color: 0xffffff, map: CORD(fem ? 0x5c0a12 : 0x16161a), roughness: 0.62 });
  const mEdge = std({ color: edgeC, metalness: 1, roughness: 0.3 });
  const mCloth = std({ color: fem ? 0x0e0b0c : 0x101116, roughness: 0.88, normalMap: WEAVE, normalScale: new THREE.Vector2(0.6, 0.6) });
  const mSleeve = std({ color: fem ? 0x3a060b : 0x15161b, roughness: 0.8, normalMap: WEAVE });
  const mMail = std({ color: 0x2a2b2f, metalness: 0.9, roughness: 0.42, normalMap: MAIL, normalScale: new THREE.Vector2(1.2, 1.2) });
  const mIron = std({ color: 0x232428, metalness: 0.95, roughness: 0.35 });
  const mGlove = std({ color: 0x141112, roughness: 0.55 });
  const mSkin = fireLit(new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0xb8a69c, roughness: 0.62, normalMap: PORES, normalScale: new THREE.Vector2(0.45, 0.45),
    clearcoat: 0.3, clearcoatRoughness: 0.3, clearcoatNormalMap: RAIN_TEX, clearcoatNormalScale: new THREE.Vector2(0.6, 0.6), sheen: 0.25, sheenColor: new THREE.Color(0x6a3a30), sheenRoughness: 0.6 }));
  const mCollar = std({ color: fem ? 0x3a060b : 0x0d0d10, roughness: 0.8, normalMap: WEAVE });
  S.rainTex = RAIN_TEX;
  const mesh = (g, m, parent, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.rotation.set(...r); o.scale.set(...s); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };

  // pelvis & torso pivots
  const pelvis = new THREE.Group(); rig.add(pelvis);
  const torso = new THREE.Group(); torso.position.y = 0.1; pelvis.add(torso);
  // --- hips: obi, kusazuri (5 hanging lamellar flaps), saya, sash tails
  mesh(new THREE.CylinderGeometry(0.2, 0.205, 0.075, 32), mLace2, pelvis, [0, 0.095, 0], [0, 0, 0], [1, 1, 0.78]);
  const kus = [];
  for (let f = 0; f < 7; f++) { const ang = (f / 7) * Math.PI * 2;
    for (let r = 0; r < 5; r++) kus.push({ rx: 0.225 + r * 0.017, rz: 0.18 + r * 0.015, y: 0.03 - r * 0.062, h: 0.066, a0: ang - 0.47, a1: ang + 0.47, n: 8, flare: 0.17, edge: r === 4 }); }
  const kb = new THREE.Group(); pelvis.add(kb); lamellar(kb, kus, mPlate, mLace, mEdge);
  // saya (scabbard) at the left hip
  const saya = new THREE.Group(); saya.position.set(-0.2, 0.08, 0.02); saya.rotation.set(2.05, 0.2, -0.25); pelvis.add(saya);
  { const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.006, 0.25, 0), V(0.018, 0.5, 0), V(0.035, 0.76, 0)]);
    mesh(new THREE.TubeGeometry(curve, 24, 0.017, 10), lacquer(fem ? 0x4a0a10 : 0x0a0a0c), saya, [0, 0, 0], [0, 0, 0], [1, 1, 0.6]);
    mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.03, 12), mEdge, saya, [0, 0.01, 0], [0, 0, 0], [1, 1, 0.65]);
    mesh(new THREE.SphereGeometry(0.018, 12, 8), mEdge, saya, [0.035, 0.77, 0], [0, 0, 0], [1, 1, 0.65]); }
  // obi tails (wind)
  const ribbon = (w, L, segs = 16, taper = 0.4) => { const g = new THREE.PlaneGeometry(w, L, 1, segs); g.translate(0, -L / 2, 0);
    const p = g.attributes.position, tip = new Float32Array(p.count); for (let i = 0; i < p.count; i++) { const k = -p.getY(i) / L; tip[i] = k; p.setX(i, p.getX(i) * (1 - taper * k)); }
    g.setAttribute("aTip", new THREE.BufferAttribute(tip, 1)); g.computeVertexNormals(); return g; };
  const mSash = windy(std({ color: fem ? 0x6a0c14 : 0x1a0507, roughness: 0.75, side: THREE.DoubleSide, normalMap: WEAVE }), 0.28, fem ? "fs" : "ms");
  [-0.06, 0.06].forEach((x, i) => mesh(ribbon(0.07, 0.55 + i * 0.08), mSash, pelvis, [x, 0.08, 0.17], [0.25, 0, x * 2]));

  // --- torso: inner body, do lamellar (7 rows), munaita, shoulder straps, nodowa, neck
  const prof = [[0.2, 0.0], [0.205, 0.08], [0.22, 0.18], [0.232, 0.28], [0.22, 0.35], [0.17, 0.4], [0.08, 0.42]].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(new THREE.LatheGeometry(prof, 32), mCloth, torso, [0, 0, 0], [0, 0, 0], [1, 1, 0.74]);
  const doRows = []; for (let r = 0; r < 6; r++) { const y = 0.03 + r * 0.05, rr = 0.212 + Math.sin(((y + 0.02) / 0.38) * Math.PI) * 0.024;
    doRows.push({ rx: rr, rz: rr * 0.76, y: 0.27 - r * 0.05 + 0.0, h: 0.056, a0: -Math.PI, a1: Math.PI, n: 64, flare: 0.07, edge: true }); }
  lamellar(torso, doRows, mPlate, mLace, mEdge);
  mesh(new THREE.CylinderGeometry(0.17, 0.215, 0.08, 32, 1, true, -1.3, 2.6), mPlate, torso, [0, 0.335, 0], [0, Math.PI, 0], [1, 1, 0.78]).material.side = THREE.DoubleSide; // munaita (chest plate)
  [-0.1, 0.1].forEach((x) => mesh(new THREE.BoxGeometry(0.06, 0.02, 0.3), mPlate2, torso, [x, 0.405, 0.0], [0, 0, x * 0.8]));
  mesh(new THREE.CylinderGeometry(0.075, 0.12, 0.07, 24), mPlate2, torso, [0, 0.425, 0]); // nodowa
  if (!fem) mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 20), mLace, torso, [0, 0.33, 0.18], [0, 0, 0]); // agemaki knot on the back
  mesh(new THREE.CylinderGeometry(0.068, 0.085, 0.075, 24, 1, true), mCollar, torso, [0, 0.475, 0.004]).material.side = THREE.DoubleSide; // high collar (eri)
  const neck = mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.13, 20), mSkin, torso, [0, 0.49, 0.0]);
  neck.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(neck.geometry.attributes.position.count * 3).fill(0), 3)); { const ca = neck.geometry.attributes.color; const sk = new THREE.Color(fem ? 0xb98a70 : 0xa77a5e); for (let i = 0; i < ca.count; i++) ca.setXYZ(i, sk.r, sk.g, sk.b); }

  // --- head
  const head = new THREE.Group(); head.position.set(0, 0.51, -0.005); head.scale.setScalar(1.12); torso.add(head);
  const HS = sculptHead(fem); const skull = new THREE.Group(); skull.position.set(0, 0.095, -0.012); head.add(skull);
  mesh(HS.g, mSkin, skull);
  const eyeM = fireLit(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5 }));
  const EG = eyeGeo();
  [-1, 1].forEach((sd) => {
    const ex = sd * (fem ? 0.0305 : 0.0315), ey = 0.012, ez = -(HS.c * 0.9) + 0.019;
    const e = mesh(EG, eyeM, skull, [ex, ey, ez]); e.castShadow = false; e.rotation.y = -sd * 0.04;
    const lid = mesh(new THREE.SphereGeometry(0.0128, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mSkin, skull, [ex, ey, ez], [-0.25, 0, 0]); // heavy, focused upper lid
    lid.geometry.setAttribute("color", new THREE.BufferAttribute(skinFill(lid.geometry.attributes.position.count, fem), 3));
    const low = mesh(new THREE.SphereGeometry(0.0126, 24, 8, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), mSkin, skull, [ex, ey, ez], [0.1, 0, 0]);
    low.geometry.setAttribute("color", new THREE.BufferAttribute(skinFill(low.geometry.attributes.position.count, fem), 3));
    const ear = mesh(new THREE.SphereGeometry(1, 16, 12), mSkin, skull, [sd * HS.a * 0.98, -0.005, 0.012], [0, sd * 0.3, 0], [0.008, 0.028, 0.017]);
    ear.geometry = ear.geometry.clone(); ear.geometry.setAttribute("color", new THREE.BufferAttribute(skinFill(ear.geometry.attributes.position.count, fem), 3));
  });
  // eyebrows (short strands)
  const brows = []; const rb = rng(fem ? 5 : 6);
  [-1, 1].forEach((sd) => { for (let i = 0; i < 160; i++) { const u = rb(); const x = sd * (0.012 + u * 0.034), y = 0.03 + 0.004 * Math.sin(u * 3) - (fem ? 0 : 0.002) + (rb() - 0.5) * 0.004;
    const z = -(HS.c * 0.9) - 0.0 + 0.004 + Math.pow(Math.abs(x) / 0.05, 2) * 0.02; const p0 = V(x, y, z); brows.push([p0, p0.clone().add(V(sd * 0.007, 0.0015, 0.001))]); } });
  const browL = strands(brows, 0x070605); skull.add(browL);
  // hair
  if (!fem) {
    const cap = mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58), std({ color: 0x070605, roughness: 0.5 }), skull, [0, 0.006, 0.006], [0.55, 0, 0], [HS.a * 1.01, HS.b * 1.0, HS.c * 1.01]);
    skull.add(strands(maleHair(HS), 0x0b0907));
    const under = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.32, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9), windy(std({ color: 0x060504, roughness: 0.6, side: THREE.DoubleSide }), 0.06, "hairU"));
    under.geometry.translate(0, -0.16, 0); { const p = under.geometry.attributes.position, tip = new Float32Array(p.count); for (let i = 0; i < p.count; i++) tip[i] = -p.getY(i) / 0.32; under.geometry.setAttribute("aTip", new THREE.BufferAttribute(tip, 1)); }
    under.position.set(0, 0.0, 0.03); skull.add(under);
  } else {
    const tie = V(0, HS.b * 0.82, HS.c * 0.55);
    mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.6), std({ color: 0x070605, roughness: 0.45 }), skull, [0, 0.004, 0.004], [0.6, 0, 0], [HS.a * 1.012, HS.b * 1.0, HS.c * 1.012]);
    skull.add(strands(femaleHair(HS, tie), 0x0b0807));
    mesh(new THREE.TorusGeometry(0.014, 0.006, 8, 16), mLace2, skull, [tie.x, tie.y, tie.z + 0.005], [1.1, 0, 0]);
    // crimson hachimaki
    mesh(new THREE.TorusGeometry(1, 0.13, 8, 48), std({ color: 0x6a0c14, roughness: 0.7, normalMap: WEAVE }), skull, [0, 0.042, 0.004], [Math.PI / 2 - 0.22, 0, 0], [HS.a * 1.06, HS.c * 1.06, 0.075]);
    const band = windy(std({ color: 0x6a0c14, roughness: 0.7, side: THREE.DoubleSide, normalMap: WEAVE }), 0.22, "hb");
    [-0.15, 0.15].forEach((r) => mesh(ribbon(0.028, 0.46, 18, 0.15), band, skull, [r * 0.12, 0.05, HS.c * 0.98], [0.35, 0, r]));
  }

  // --- arms (in rig space, solved each frame), sode, kote, fists
  const fist = fistGeo();
  const arms = [1, -1].map((side) => {
    const a = { side };
    a.upper = new THREE.Group(); rig.add(a.upper);
    mesh(new THREE.CylinderGeometry(0.058, 0.07, 1, 16), mSleeve, a.upper, [0, 0, 0]).name = "sleeve";
    a.fore = new THREE.Group(); rig.add(a.fore);
    mesh(new THREE.CylinderGeometry(0.045, 0.055, 1, 16), mMail, a.fore);
    for (let i = 0; i < 4; i++) { const ang = -Math.PI / 2 + side * 0.4 + (i - 1.5) * 0.42;
      mesh(new THREE.BoxGeometry(0.018, 0.6, 0.006), mPlate, a.fore, [Math.cos(ang) * 0.057, 0.05, Math.sin(ang) * 0.057], [0, -ang + Math.PI / 2, 0]); }
    a.elbow = mesh(new THREE.SphereGeometry(0.06, 16, 12), mIron, rig);
    a.fist = mesh(fist, mGlove, rig);
    // sode: big shoulder guard = 6 rows of small plates, hanging from the shoulder
    a.sode = new THREE.Group(); rig.add(a.sode);
    const sodeRows = []; for (let r = 0; r < 6; r++) sodeRows.push({ rx: 0.5, rz: 0.5, y: -r * 0.052, h: 0.056, a0: -0.24, a1: 0.24, n: 9, flare: 0.05 + r * 0.012, edge: r === 5, shift: [0, 0.5] });
    const sg = new THREE.Group(); sg.rotation.y = side * Math.PI / 2; sg.position.x = side * 0.015; a.sode.add(sg);
    lamellar(sg, sodeRows, mPlate, mLace, mEdge);
    return a;
  });
  // --- legs: hakama (wide), haidate (thigh plates), suneate (shin splints), tabi/waraji
  const legs = [-1, 1].map((side) => {
    const l = { side };
    l.thigh = new THREE.Group(); rig.add(l.thigh);
    mesh(new THREE.CylinderGeometry(0.13, 0.16, 1, 18, 1, true), mCloth, l.thigh).material.side = THREE.DoubleSide;
    const hd = []; for (let r = 0; r < 4; r++) hd.push({ rx: 0.2, rz: 0.2, y: 0.4 - r * 0.16, h: 0.17, a0: -0.75, a1: 0.75, n: 7, flare: 0.04, edge: r === 3 });
    const hg = new THREE.Group(); hg.position.y = 0; l.thigh.add(hg); lamellar(hg, hd, mPlate2, mLace, mEdge);
    l.shin = new THREE.Group(); rig.add(l.shin);
    mesh(new THREE.CylinderGeometry(0.16, 0.19, 1, 18, 1, true), mCloth, l.shin).material.side = THREE.DoubleSide;
    for (let i = 0; i < 5; i++) { const ang = -Math.PI / 2 + (i - 2) * 0.3; mesh(new THREE.BoxGeometry(0.02, 0.5, 0.005), mIron, l.shin, [Math.cos(ang) * 0.075, -0.1, Math.sin(ang) * 0.075], [0, -ang + Math.PI / 2, 0]); }
    mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.5, 14), mCloth, l.shin, [0, -0.1, 0]);
    l.knee = mesh(new THREE.SphereGeometry(0.075, 14, 10), mIron, rig);
    l.foot = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), mGlove, rig);
    return l;
  });

  const kat = makeKatana(fem); rig.add(kat);
  Object.assign(S, { root, rig, pelvis, torso, head, skull, arms, legs, kat, fem, scale });
  S.blade = kat.userData.blade;
  return S;
}

// ------------------------------------------------------------------ apply a pose vector (see timeline.js)
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _v = V();
export function applyPose(S, p) {
  const [px, pz, yaw, pelY, pelZ, tYaw, tPitch, tRoll, gx, gy, gz, dx, dy, dz, roll, lfx, lfy, lfz, rfx, rfy, rfz, hYaw, hPitch, heat] = p;
  S.root.position.set(px, 0, pz); S.root.rotation.set(0, yaw, 0);
  S.pelvis.position.set(0, pelY, pelZ); S.pelvis.rotation.set(0, tYaw * 0.35, 0);
  S.torso.rotation.set(tPitch, tYaw * 0.65, tRoll, "YXZ");
  S.head.rotation.set(hPitch - tPitch * 0.6, hYaw - tYaw * 0.4, 0, "YXZ");
  S.root.updateMatrixWorld(true);
  const toRig = (obj, local) => { const w = obj.localToWorld(local.clone()); return S.rig.worldToLocal(w); };
  // katana
  const D = V(dx, dy, dz).normalize(), grip = V(gx, gy, gz);
  S.kat.position.copy(grip);
  S.kat.quaternion.setFromUnitVectors(V(0, 1, 0), D);
  // edge orientation: point the edge (local +x) away from the body / along the cut, then roll
  const edgeW = V(1, 0, 0).applyQuaternion(S.kat.quaternion), want = V(0, -1, -0.4).addScaledVector(D, -V(0, -1, -0.4).dot(D)).normalize();
  const ang = Math.atan2(V().crossVectors(edgeW, want).dot(D), edgeW.dot(want));
  S.kat.quaternion.premultiply(_q.setFromAxisAngle(D, ang + roll));
  // arms (right hand near the tsuba, left at the pommel)
  const hands = [grip.clone().addScaledVector(D, -0.05), grip.clone().addScaledVector(D, -0.19)];
  S.arms.forEach((a, i) => {
    const sh = toRig(S.torso, V(a.side * 0.205, 0.37, 0.0));
    const pole = V(a.side * 0.9, -0.7, 0.3).applyQuaternion(S.torso.getWorldQuaternion(new THREE.Quaternion()).premultiply(S.rig.getWorldQuaternion(new THREE.Quaternion()).invert()));
    const { E, H } = ik2(sh, hands[i], 0.29, 0.27, pole);
    place(a.upper, sh, E); place(a.fore, E, H); a.elbow.position.copy(E);
    a.fist.position.copy(hands[i]); a.fist.quaternion.copy(S.kat.quaternion);
    if (i === 1) a.fist.quaternion.multiply(_q.setFromAxisAngle(V(0, 1, 0), Math.PI));
    a.sode.position.copy(sh).add(V(a.side * 0.035, 0.035, 0));
    const ue = E.clone().sub(sh).normalize();
    a.sode.quaternion.copy(S.torso.getWorldQuaternion(new THREE.Quaternion()).premultiply(S.rig.getWorldQuaternion(new THREE.Quaternion()).invert()));
    a.sode.rotateX(-Math.max(-0.2, -ue.z) * 0.45); a.sode.rotateZ(a.side * Math.max(0, ue.x * a.side) * 0.5);
  });
  // legs
  const feet = [V(lfx, lfy + 0.075, lfz), V(rfx, rfy + 0.075, rfz)];
  S.legs.forEach((l, i) => {
    const hip = toRig(S.pelvis, V(l.side * 0.1, 0, 0));
    const { E, H } = ik2(hip, feet[i], 0.44, 0.44, V(l.side * 0.15, 0, -1));
    place(l.thigh, hip, E); place(l.shin, E, H); l.knee.position.copy(E).add(V(0, 0, -0.03));
    l.foot.position.copy(H).add(V(0, -0.04, -0.06)); l.foot.rotation.set(0, l.side * -0.15, 0);
  });
  // heat glow on the blade (flicker added by the caller)
  S.heat = heat;
}
export function bladeWorld(S, s = 1) { // world position along the blade (0 = tsuba, 1 = tip)
  return S.kat.localToWorld(V(-0.022 * s * s, KATANA_LEN * s, 0));
}
