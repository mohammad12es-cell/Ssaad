// ODDLY EXPLAINED engine — procedural human body + nervous system (stylised, x-ray "glass" figure).
//
// Body surface: signed-distance model (round cones + ellipsoids, smooth-unioned, facial features carved)
// meshed with naive surface nets, normals from the SDF gradient. Linear-blend skinned to a 17-bone skeleton,
// so the same mesh can sleep, twitch or run. Nerves are tapered tubes along anatomical routes
// (spinal cord, brachial/lumbosacral trunks, intercostals, phrenic, cranial-to-eyes, descending motor tract),
// skinned to the same bones. Every nerve carries a region id so a shader can gate signals per region.
//
// Rest pose: standing, y up, +z = front (face), +x = subject's LEFT, height ~1.84, A-pose arms.
import * as THREE from 'three';
import { RNG } from './noise.js';
import { taperedTube, mergeGeometries } from './geom.js';

// ---------------------------------------------------------------- skeleton
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const REGION = { CORD: 0, ARMS: 1, LEGS: 2, TRUNK: 3, BREATH: 4, EYES: 5, BRAIN: 6 };

function makeSkeleton() {
  const J = {
    pelvis: V(0, 0.95), spine: V(0, 1.15), chest: V(0, 1.36), neck: V(0, 1.52), head: V(0, 1.62), top: V(0, 1.84),
  };
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    J['sh' + k] = V(0.19 * s, 1.44); J['el' + k] = V(0.352 * s, 1.205, -0.01); J['wr' + k] = V(0.5 * s, 0.995, 0.01); J['hd' + k] = V(0.592 * s, 0.858, 0.025);
    J['hp' + k] = V(0.095 * s, 0.9); J['kn' + k] = V(0.108 * s, 0.5, 0.01); J['an' + k] = V(0.114 * s, 0.085, -0.02); J['to' + k] = V(0.12 * s, 0.02, 0.15);
  }
  // bone: [name, headJoint, tailJoint, parent, region]
  const B = [
    ['pelvis', 'pelvis', 'spine', -1, REGION.TRUNK], ['spine', 'spine', 'chest', 0, REGION.TRUNK], ['chest', 'chest', 'neck', 1, REGION.TRUNK],
    ['neck', 'neck', 'head', 2, REGION.TRUNK], ['head', 'head', 'top', 3, REGION.EYES],
    ['uarmL', 'shL', 'elL', 2, REGION.ARMS], ['farmL', 'elL', 'wrL', 5, REGION.ARMS], ['handL', 'wrL', 'hdL', 6, REGION.ARMS],
    ['uarmR', 'shR', 'elR', 2, REGION.ARMS], ['farmR', 'elR', 'wrR', 8, REGION.ARMS], ['handR', 'wrR', 'hdR', 9, REGION.ARMS],
    ['thighL', 'hpL', 'knL', 0, REGION.LEGS], ['shinL', 'knL', 'anL', 11, REGION.LEGS], ['footL', 'anL', 'toL', 12, REGION.LEGS],
    ['thighR', 'hpR', 'knR', 0, REGION.LEGS], ['shinR', 'knR', 'anR', 14, REGION.LEGS], ['footR', 'anR', 'toR', 15, REGION.LEGS],
  ];
  const bones = B.map(([name, h, t, parent, region], i) => ({ i, name, head: J[h], tail: J[t], parent, region }));
  const byName = Object.fromEntries(bones.map((b) => [b.name, b]));
  return { J, bones, byName };
}

// ---------------------------------------------------------------- SDF primitives
const tmp = new THREE.Vector3();
function sdRoundCone(px, py, pz, a, b, r1, r2) { // Inigo Quilez
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a.x, pay = py - a.y, paz = pz - a.z;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
function sdEllipsoid(px, py, pz, c, r) {
  const x = (px - c.x) / r.x, y = (py - c.y) / r.y, z = (pz - c.z) / r.z;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const x1 = x / r.x, y1 = y / r.y, z1 = z / r.z; const k1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
  return k0 * (k0 - 1) / k1;
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

function bodyPrims(S) {
  const { J } = S; const P = [];
  const rc = (a, b, r1, r2, k = 0.035) => P.push({ t: 'rc', a, b, r1, r2, k, c: a.clone().add(b).multiplyScalar(0.5), R: a.distanceTo(b) / 2 + Math.max(r1, r2) });
  const el = (c, r, k = 0.035) => P.push({ t: 'el', c, r, k, R: Math.max(r.x, r.y, r.z) });
  // head & face
  el(V(0, 1.712, 0.008), V(0.083, 0.108, 0.1), 0.03);
  el(V(0, 1.632, 0.038), V(0.062, 0.05, 0.062), 0.035);           // jaw
  rc(V(0, 1.708, 0.094), V(0, 1.668, 0.118), 0.011, 0.017, 0.012);   // nose
  rc(V(-0.052, 1.742, 0.08), V(0.052, 1.742, 0.08), 0.013, 0.013, 0.02); // brow ridge
  for (const s of [1, -1]) el(V(0.087 * s, 1.7, -0.005), V(0.014, 0.03, 0.02), 0.012); // ears
  rc(V(0, 1.5, -0.005), V(0, 1.645, 0.0), 0.056, 0.05, 0.04);          // neck
  // torso
  el(V(0, 1.335, 0.0), V(0.168, 0.165, 0.103), 0.05);
  el(V(0, 1.13, 0.008), V(0.138, 0.15, 0.092), 0.06);
  el(V(0, 0.955, -0.005), V(0.165, 0.11, 0.1), 0.06);
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    rc(V(0.09 * s, 1.455, -0.01), J['sh' + k], 0.062, 0.058, 0.04);   // trapezius/shoulder
    rc(J['sh' + k], J['el' + k], 0.052, 0.04, 0.03);
    rc(J['el' + k], J['wr' + k], 0.041, 0.027, 0.02);
    rc(J['wr' + k], J['hd' + k], 0.03, 0.022, 0.015);
    rc(J['wr' + k].clone().lerp(J['hd' + k], 0.2).add(V(0, 0, 0.025)), J['wr' + k].clone().lerp(J['hd' + k], 0.55).add(V(-0.01 * s, 0, 0.05)), 0.012, 0.01, 0.012); // thumb
    rc(J['hp' + k], J['kn' + k], 0.088, 0.054, 0.05);
    rc(J['kn' + k], J['an' + k], 0.052, 0.032, 0.025);
    el(J['kn' + k].clone().lerp(J['an' + k], 0.28).add(V(0, 0, -0.025)), V(0.048, 0.11, 0.045), 0.03); // calf
    rc(J['an' + k].clone().add(V(0, 0, -0.035)), J['to' + k], 0.034, 0.026, 0.025);
  }
  return P;
}

function bodySDF(P, x, y, z) {
  let d = 1e9;
  for (const p of P) {
    const dx = x - p.c.x, dy = y - p.c.y, dz = z - p.c.z;
    if (Math.sqrt(dx * dx + dy * dy + dz * dz) - p.R > d + p.k) continue; // cheap reject
    const v = p.t === 'rc' ? sdRoundCone(x, y, z, p.a, p.b, p.r1, p.r2) : sdEllipsoid(x, y, z, p.c, p.r);
    d = smin(d, v, p.k);
  }
  // carve shallow eye sockets so closed lids read as a face
  for (const s of [1, -1]) { const ex = x - 0.034 * s, ey = y - 1.713, ez = z - 0.1; d = smax(d, -(Math.sqrt(ex * ex + ey * ey + ez * ez) - 0.013), 0.016); }
  return d;
}

// naive surface nets (Lysenko) over a regular grid
function surfaceNets(f, bmin, bmax, h) {
  const nx = Math.ceil((bmax.x - bmin.x) / h) + 1, ny = Math.ceil((bmax.y - bmin.y) / h) + 1, nz = Math.ceil((bmax.z - bmin.z) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[i + nx * (j + ny * k)] = f(bmin.x + i * h, bmin.y + j * h, bmin.z + k * h);
  const idx = (i, j, k) => i + nx * (j + ny * k);
  const vid = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1); const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const P = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = F[idx(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t; sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t; sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t; n++;
    }
    vid[cid(i, j, k)] = P.length / 3;
    P.push(bmin.x + (i + sx / n) * h, bmin.y + (j + sy / n) * h, bmin.z + (k + sz / n) * h);
  }
  const I = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = F[idx(i, j, k)] < 0;
    // x-edge (i,j,k)->(i+1,j,k): cells sharing it vary in j,k
    if (i < nx - 1 && (F[idx(i + 1, j, k)] < 0) !== a) quad(cid(i, j, k), cid(i, j - 1, k), cid(i, j - 1, k - 1), cid(i, j, k - 1), a);
    if (j < ny - 1 && (F[idx(i, j + 1, k)] < 0) !== a) quad(cid(i, j, k), cid(i, j, k - 1), cid(i - 1, j, k - 1), cid(i - 1, j, k), a);
    if (k < nz - 1 && (F[idx(i, j, k + 1)] < 0) !== a) quad(cid(i, j, k), cid(i - 1, j, k), cid(i - 1, j - 1, k), cid(i, j - 1, k), a);
  }
  function quad(c0, c1, c2, c3, flip) {
    const q = [vid[c0], vid[c1], vid[c2], vid[c3]]; if (q.some((x) => x < 0)) return;
    if (flip) I.push(q[0], q[1], q[2], q[0], q[2], q[3]); else I.push(q[0], q[2], q[1], q[0], q[3], q[2]);
  }
  return { P, I };
}

function distSeg(p, a, b) { const ab = tmp.copy(b).sub(a); const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); }

// skin weights: nearest bone + its parent/children only (avoids hands welding to thighs), softmax on distance
function skinWeights(S, p) {
  const d = S.bones.map((b) => distSeg(p, b.head, b.tail));
  let b0 = 0; for (let i = 1; i < d.length; i++) if (d[i] < d[b0]) b0 = i;
  const cand = S.bones.filter((b) => b.i === b0 || b.i === S.bones[b0].parent || b.parent === b0).map((b) => b.i);
  const w = cand.map((i) => Math.exp(-(d[i] - d[b0]) / 0.018));
  const order = cand.map((c, k) => [c, w[k]]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = order.reduce((s, x) => s + x[1], 0);
  const idx = [0, 0, 0, 0], wt = [0, 0, 0, 0]; order.forEach(([c, ww], k) => { idx[k] = c; wt[k] = ww / sum; });
  return { idx, wt, region: S.bones[b0].region };
}

const SKIN_VS = /* glsl */`
  uniform mat4 uBones[17];
  attribute vec4 aSkinIdx; attribute vec4 aSkinW;
  vec4 skinPos(vec3 p){ return aSkinW.x * (uBones[int(aSkinIdx.x)] * vec4(p, 1.0)) + aSkinW.y * (uBones[int(aSkinIdx.y)] * vec4(p, 1.0))
                                + aSkinW.z * (uBones[int(aSkinIdx.z)] * vec4(p, 1.0)) + aSkinW.w * (uBones[int(aSkinIdx.w)] * vec4(p, 1.0)); }
  vec3 skinNrm(vec3 n){ return normalize(mat3(uBones[int(aSkinIdx.x)]) * n * aSkinW.x + mat3(uBones[int(aSkinIdx.y)]) * n * aSkinW.y
                                       + mat3(uBones[int(aSkinIdx.z)]) * n * aSkinW.z + mat3(uBones[int(aSkinIdx.w)]) * n * aSkinW.w); }
`;

function addSkin(S, g, regionOverride = null) {
  const p = g.attributes.position; const n = p.count; const SI = new Float32Array(n * 4), SW = new Float32Array(n * 4), RG = new Float32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, i); const s = skinWeights(S, v); SI.set(s.idx, i * 4); SW.set(s.wt, i * 4); RG[i] = regionOverride ?? s.region; }
  g.setAttribute('aSkinIdx', new THREE.BufferAttribute(SI, 4)); g.setAttribute('aSkinW', new THREE.BufferAttribute(SW, 4));
  if (!g.attributes.aRegion) g.setAttribute('aRegion', new THREE.BufferAttribute(RG, 1));
}

// ---------------------------------------------------------------- materials
function glassMaterial(bonesU) {
  return new THREE.ShaderMaterial({
    uniforms: { uBones: bonesU, uTime: { value: 0 }, uAmp: { value: 1 }, uRim: { value: new THREE.Color(0x52c8ff) }, uWarm: { value: new THREE.Color(0xff9a4a) },
      uTone: { value: [0, 0, 0, 0, 0, 0, 0] }, uScan: { value: 0 } },
    vertexShader: SKIN_VS + /* glsl */`
      attribute float aRegion; varying vec3 vN, vW, vL; varying float vRegion;
      void main(){ vec4 p = skinPos(position); vec4 w = modelMatrix * p; vW = w.xyz; vL = position; vRegion = aRegion;
        vN = normalize(mat3(modelMatrix) * skinNrm(normal)); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmp, uTone[7], uScan; uniform vec3 uRim, uWarm; varying vec3 vN, vW, vL; varying float vRegion;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float ndv = abs(dot(N, V));
        float fr = pow(1.0 - ndv, 3.0);
        int r = int(vRegion + 0.5); float tone = 0.0;
        for (int i = 0; i < 7; i++) if (i == r) tone = uTone[i];
        vec3 c = uRim * (0.02 + 0.9 * fr) + uWarm * tone * (0.05 + 0.18 * (1.0 - fr));
        c += uRim * 0.06 * pow(max(dot(N, normalize(vec3(-0.3, 0.9, 0.4))), 0.0), 8.0);
        float sc = smoothstep(0.985, 1.0, sin(vL.y * 160.0 - uTime * 3.0)) * uScan; c += uRim * sc * 0.25;
        gl_FragColor = vec4(c * uAmp, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

function holoMaterial(bonesU) {
  return new THREE.ShaderMaterial({
    uniforms: { uBones: bonesU, uTime: { value: 0 }, uAmp: { value: 1 }, uCol: { value: new THREE.Color(0x6fd6ff) }, uCol2: { value: new THREE.Color(0xffb36b) } },
    vertexShader: SKIN_VS + /* glsl */`
      varying vec3 vN, vW, vL;
      void main(){ vec4 p = skinPos(position); vec4 w = modelMatrix * p; vW = w.xyz; vL = position;
        vN = normalize(mat3(modelMatrix) * skinNrm(normal)); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmp; uniform vec3 uCol, uCol2; varying vec3 vN, vW, vL;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(N, V)), 2.0);
        float scan = 0.55 + 0.45 * smoothstep(0.3, 1.0, sin(vL.y * 220.0 - uTime * 9.0));
        float band = smoothstep(0.92, 1.0, sin(vL.y * 9.0 - uTime * 4.0));
        vec3 c = mix(uCol, uCol2, smoothstep(0.6, 1.8, vL.y)) * (0.05 + 1.1 * fr) * scan + uCol * band * 0.35;
        gl_FragColor = vec4(c * uAmp, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

function nerveMaterial(bonesU) {
  return new THREE.ShaderMaterial({
    uniforms: { uBones: bonesU, uTime: { value: 0 }, uAmp: { value: 1 }, uGate: { value: [1, 1, 1, 1, 1, 1, 1] }, uCmd: { value: 1 }, uInhib: { value: 0 },
      uAmber: { value: new THREE.Color(0xffa24a) }, uCyan: { value: new THREE.Color(0x3cc8ff) }, uRate: { value: 1.0 } },
    vertexShader: SKIN_VS + /* glsl */`
      uniform float uGate[7]; attribute float aU, aSeed, aRegion; varying vec3 vN, vW; varying float vU, vSeed, vGate, vRegion;
      void main(){ vU = aU; vSeed = aSeed; vRegion = aRegion;
        int r = int(aRegion + 0.5); float g = 1.0; for (int i = 0; i < 7; i++) if (i == r) g = uGate[i]; vGate = g;
        vec4 p = skinPos(position); vec4 w = modelMatrix * p; vW = w.xyz; vN = normalize(mat3(modelMatrix) * skinNrm(normal));
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmp, uCmd, uInhib, uRate; uniform vec3 uAmber, uCyan; varying vec3 vN, vW; varying float vU, vSeed, vGate, vRegion;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(N, V)), 1.5);
        // motor command pulses travel outward (aU = path length from the cord); when the region is gated they die out quickly
        float ph = fract(uTime * 0.9 * uRate + vSeed * 3.7);
        float front = ph * 1.6 - 0.1;
        float pulse = exp(-pow((vU - front) / 0.035, 2.0)) * uCmd;
        float reach = mix(exp(-max(vU - 0.02, 0.0) * 40.0), 1.0, vGate);
        pulse *= reach;
        // inhibition: cyan shimmer descending the cord and lingering on gated nerves
        float ih = (1.0 - vGate) * uInhib;
        float shimmer = 0.5 + 0.5 * sin(vU * 60.0 + uTime * 6.0 + vSeed * 20.0);
        vec3 base = mix(uCyan * 0.25 * (0.5 + 0.5 * shimmer) * ih + uCyan * 0.04, uAmber * 0.22, vGate * 0.85);
        vec3 c = base * (0.6 + 0.8 * fr) + mix(uAmber, vec3(1.0), 0.3) * pulse * 2.2;
        gl_FragColor = vec4(c * uAmp, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

// ---------------------------------------------------------------- nerves
function buildNerves(S, rng) {
  const { J } = S; const geos = [];
  const add = (pts, r0, r1, region, u0 = 0, branches = 0, bl = 0.06) => {
    const t = taperedTube(pts, r0, r1, 6, u0, rng.next());
    addSkin(S, t.geometry, region); geos.push(t.geometry);
    for (let b = 0; b < branches; b++) { // small muscular branches
      const k = 0.15 + 0.8 * rng.next(); const p0 = t.curve.getPointAt(k); const tan = t.curve.getTangentAt(k);
      const side = new THREE.Vector3(rng.next() - 0.5, rng.next() - 0.5, rng.next() - 0.5).cross(tan).normalize();
      const p1 = p0.clone().addScaledVector(tan, bl * 0.6).addScaledVector(side, bl * 0.5), p2 = p1.clone().addScaledVector(tan, bl * 0.5).addScaledVector(side, bl * 0.4);
      const bt = taperedTube([p0, p1, p2], r1 * 0.9, r1 * 0.4, 4, u0 + t.length * k, rng.next()); addSkin(S, bt.geometry, region); geos.push(bt.geometry);
    }
    return t;
  };
  // descending motor tract (brain) + spinal cord
  for (const s of [1, -1]) add([V(0.03 * s, 1.79, 0.0), V(0.02 * s, 1.72, -0.005), V(0.008 * s, 1.655, -0.015), V(0, 1.62, -0.025)], 0.006, 0.005, REGION.BRAIN);
  const cordPts = [V(0, 1.625, -0.025), V(0, 1.52, -0.045), V(0, 1.4, -0.065), V(0, 1.25, -0.07), V(0, 1.1, -0.06), V(0, 0.98, -0.05)];
  add(cordPts, 0.012, 0.007, REGION.CORD);
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R'; const sh = J['sh' + k], el = J['el' + k], wr = J['wr' + k], hd = J['hd' + k];
    // arm: brachial plexus -> along the limb (slightly anterior) -> digits
    const arm = [V(0.012 * s, 1.47, -0.05), V(0.09 * s, 1.45, -0.03), sh.clone().add(V(0, -0.02, 0.0)), sh.clone().lerp(el, 0.5).add(V(0, 0, 0.02)), el.clone().add(V(0, 0, 0.015)), el.clone().lerp(wr, 0.5).add(V(0, 0, 0.012)), wr.clone()];
    const ta = add(arm, 0.0065, 0.004, REGION.ARMS, 0, 7, 0.07);
    const dir = hd.clone().sub(wr).normalize(); const perp = new THREE.Vector3(0, 0, 1).cross(dir).normalize();
    for (let f = 0; f < 4; f++) { const o = (f - 1.5) * 0.014; add([wr.clone(), wr.clone().addScaledVector(dir, 0.06).addScaledVector(perp, o), hd.clone().addScaledVector(perp, o * 1.6).addScaledVector(dir, 0.03)], 0.003, 0.0018, REGION.ARMS, ta.length); }
    // leg: lumbosacral -> sciatic down the back of the thigh -> tibial -> foot
    const hp = J['hp' + k], kn = J['kn' + k], an = J['an' + k], to = J['to' + k];
    const leg = [V(0.01 * s, 1.0, -0.05), V(0.06 * s, 0.93, -0.06), hp.clone().add(V(0, -0.04, -0.05)), hp.clone().lerp(kn, 0.5).add(V(0, 0, -0.04)), kn.clone().add(V(0, 0, -0.03)), kn.clone().lerp(an, 0.5).add(V(0, 0, -0.02)), an.clone().add(V(0, 0, -0.005))];
    const tl = add(leg, 0.0085, 0.005, REGION.LEGS, 0, 8, 0.09);
    for (let f = 0; f < 4; f++) { const o = (f - 1.5) * 0.016; add([an.clone(), an.clone().lerp(to, 0.5).add(V(o * s, -0.015, 0)), to.clone().add(V(o * s, 0, 0.01))], 0.0035, 0.002, REGION.LEGS, tl.length); }
    // intercostal nerves wrapping the ribcage
    for (let r = 0; r < 7; r++) {
      const y = 1.43 - r * 0.045; const rx = 0.13 + 0.03 * Math.sin((r / 6) * Math.PI), rz = 0.095; const pts = [];
      for (let a = 0; a <= 8; a++) { const th = (a / 8) * Math.PI * 0.92; pts.push(V(Math.sin(th) * rx * s, y - 0.02 * Math.sin(th), -Math.cos(th) * rz)); }
      add(pts, 0.003, 0.002, REGION.TRUNK);
    }
    // phrenic nerve: neck (C3–C5) down to the diaphragm — stays active in REM
    add([V(0.02 * s, 1.55, -0.03), V(0.045 * s, 1.47, 0.0), V(0.06 * s, 1.36, 0.035), V(0.075 * s, 1.24, 0.03), V(0.06 * s, 1.205, 0.0)], 0.004, 0.003, REGION.BREATH);
    // cranial route to the eye muscles
    add([V(0.004 * s, 1.63, -0.012), V(0.016 * s, 1.67, 0.03), V(0.03 * s, 1.705, 0.07), V(0.034 * s, 1.712, 0.085)], 0.0018, 0.0014, REGION.EYES);
  }
  const g = mergeGeometries(geos.map((x) => { for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'aU', 'aSeed', 'aSkinIdx', 'aSkinW', 'aRegion'].includes(k)) x.deleteAttribute(k); return x; }));
  return g;
}

// ---------------------------------------------------------------- public: build + pose
export function buildBody(opts = {}) {
  const S = makeSkeleton(); const rng = new RNG(opts.seed ?? 12);
  const P = bodyPrims(S); const f = (x, y, z) => bodySDF(P, x, y, z);
  const h = opts.res ?? 0.0075;
  const t0 = performance.now();
  const sn = surfaceNets(f, V(-0.68, -0.03, -0.18), V(0.68, 1.88, 0.22), h);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(sn.P, 3));
  g.setIndex(sn.P.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(sn.I, 1) : new THREE.Uint16BufferAttribute(sn.I, 1));
  // normals from the SDF gradient (smooth, independent of mesh topology)
  const N = new Float32Array(sn.P.length); const e = h * 0.5;
  for (let i = 0; i < sn.P.length; i += 3) {
    const x = sn.P[i], y = sn.P[i + 1], z = sn.P[i + 2];
    const nx = f(x + e, y, z) - f(x - e, y, z), ny = f(x, y + e, z) - f(x, y - e, z), nz = f(x, y, z + e) - f(x, y, z - e); const l = Math.hypot(nx, ny, nz) || 1;
    N[i] = nx / l; N[i + 1] = ny / l; N[i + 2] = nz / l;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  addSkin(S, g);
  const meshMs = performance.now() - t0;

  const bonesU = { value: Array.from({ length: 17 }, () => new THREE.Matrix4()) };
  const glass = glassMaterial(bonesU);
  const hull = new THREE.Mesh(g, glass); hull.frustumCulled = false; hull.renderOrder = 2;
  const ng = buildNerves(S, rng); const nmat = nerveMaterial(bonesU);
  const nerves = new THREE.Mesh(ng, nmat); nerves.frustumCulled = false; nerves.renderOrder = 1;
  const group = new THREE.Group(); group.add(nerves); group.add(hull);

  // pose: map bone name -> Euler (radians) about the bone's head joint, in the parent's frame
  const local = new THREE.Matrix4(), T = new THREE.Matrix4(), Ti = new THREE.Matrix4(), R = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler();
  const world = S.bones.map(() => new THREE.Matrix4());
  function setPose(pose = {}) {
    for (const b of S.bones) {
      const r = pose[b.name] || [0, 0, 0];
      eul.set(r[0], r[1], r[2], 'XYZ'); q.setFromEuler(eul); R.makeRotationFromQuaternion(q);
      T.makeTranslation(b.head.x, b.head.y, b.head.z); Ti.makeTranslation(-b.head.x, -b.head.y, -b.head.z);
      local.copy(T).multiply(R).multiply(Ti);
      if (b.parent < 0) world[b.i].copy(local); else world[b.i].copy(world[b.parent]).multiply(local);
      bonesU.value[b.i].copy(world[b.i]);
    }
  }
  setPose({});
  return { group, hull, nerves, glass, nerveMat: nmat, bonesU, skeleton: S, setPose, boneWorld: world, stats: { verts: sn.P.length / 3, tris: sn.I.length / 3, nerveVerts: ng.attributes.position.count, meshMs } };
}

// A second figure sharing the mesh, drawn as a hologram (the dream runner). Owns its own bones.
export function hologramOf(body) {
  const bonesU = { value: Array.from({ length: 17 }, () => new THREE.Matrix4()) };
  const mat = holoMaterial(bonesU);
  const mesh = new THREE.Mesh(body.hull.geometry, mat); mesh.frustumCulled = false;
  const S = body.skeleton; const world = S.bones.map(() => new THREE.Matrix4());
  const local = new THREE.Matrix4(), T = new THREE.Matrix4(), Ti = new THREE.Matrix4(), R = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler();
  function setPose(pose = {}) {
    for (const b of S.bones) {
      const r = pose[b.name] || [0, 0, 0]; eul.set(r[0], r[1], r[2], 'XYZ'); q.setFromEuler(eul); R.makeRotationFromQuaternion(q);
      T.makeTranslation(b.head.x, b.head.y, b.head.z); Ti.makeTranslation(-b.head.x, -b.head.y, -b.head.z); local.copy(T).multiply(R).multiply(Ti);
      if (b.parent < 0) world[b.i].copy(local); else world[b.i].copy(world[b.parent]).multiply(local);
      bonesU.value[b.i].copy(world[b.i]);
    }
  }
  return { mesh, material: mat, setPose, boneWorld: world, bonesU };
}

// Poses ----------------------------------------------------------------------------------------
// Arms rest at the sides from the A-pose: rotate upper arms about z toward the body.
export function sleepPose(t = 0, extra = {}) {
  const br = 0.012 * Math.sin(t * 2 * Math.PI / 4.2); // slow breathing
  return {
    chest: [br, 0, 0], spine: [br * 0.5, 0, 0],
    uarmL: [0.04, 0, -0.42], uarmR: [0.04, 0, 0.42], farmL: [-0.15, 0, -0.05], farmR: [-0.15, 0, 0.05],
    handL: [0, 0, -0.1], handR: [0, 0, 0.1],
    thighL: [0, 0, 0.03], thighR: [0, 0, -0.03], footL: [0.35, 0, 0], footR: [0.35, 0, 0], head: [0.08, 0, 0],
    ...extra,
  };
}

export function runPose(phase) {
  const s = Math.sin(phase), c = Math.cos(phase);
  return {
    pelvis: [0, 0.12 * s, 0], spine: [0.12, -0.1 * s, 0], chest: [0.05, -0.12 * s, 0], head: [-0.12, 0.08 * s, 0],
    uarmL: [0.75 * s, 0, -0.5], farmL: [-1.4, 0, 0], uarmR: [-0.75 * s, 0, 0.5], farmR: [-1.4, 0, 0],
    thighL: [-0.85 * s - 0.1, 0, 0.02], shinL: [0.25 + 0.9 * Math.max(0, -c) + 0.3 * Math.max(0, s), 0, 0],
    thighR: [0.85 * s - 0.1, 0, -0.02], shinR: [0.25 + 0.9 * Math.max(0, c) + 0.3 * Math.max(0, -s), 0, 0],
    footL: [0.2 * s, 0, 0], footR: [-0.2 * s, 0, 0],
  };
}

// Depth-only twin of a skinned mesh, drawn last (renderOrder 100) so post DOF sees the body surface
// without the depth buffer hiding the x-ray nerves drawn before it.
export function depthOnly(geometry, bonesU) {
  const m = new THREE.ShaderMaterial({ uniforms: { uBones: bonesU }, vertexShader: SKIN_VS + `void main(){ gl_Position = projectionMatrix * viewMatrix * modelMatrix * skinPos(position); }`,
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); }', colorWrite: false, depthWrite: true, transparent: true });
  const mesh = new THREE.Mesh(geometry, m); mesh.frustumCulled = false; mesh.renderOrder = 100; return mesh;
}
