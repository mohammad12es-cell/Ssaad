// ODDLY EXPLAINED engine — procedural human brain asset.
// Built entirely from seeded math: two cerebral hemispheres with gyri/sulci (noise-derived folds plus
// hand-placed Sylvian fissure and central sulcus), a foliated cerebellum and a brainstem.
// Coordinates: +x = subject's right, +y = up, +z = anterior (front). Overall length ~1.85 units.
// Exposes a surface neural network (stylised; not a map of real connections) whose edges can light up.
import * as THREE from 'three';
import { mergeVertices } from './geom.js';
import { Simplex3, RNG, GLSL_NOISE } from './noise.js';

const N = new Simplex3(1337), N2 = new Simplex3(4242);

function hemiShape(d, side) {
  let [x, y, z] = d;
  let px = x * 0.64, py = y * 0.6, pz = z * 0.93;
  const back = Math.max(0, -z);
  px *= 1 + 0.09 * back - 0.06 * Math.max(0, z);
  py *= 1 + 0.07 * back;
  // flatten base
  if (py < 0) py *= 0.62;
  // frontal lobe sits slightly lower, occipital pole a bit pointed
  py -= 0.04 * Math.max(0, z) * Math.max(0, z);
  pz *= 1 + 0.04 * Math.pow(back, 3);
  // temporal lobe bulge (lower, lateral, front-middle)
  const tl = Math.exp(-((pz - 0.18) ** 2) / 0.12 - ((py + 0.2) ** 2) / 0.02) * Math.max(0, x);
  py -= 0.1 * tl; px += 0.05 * tl;
  // medial wall: compress the inner half so the hemispheres meet along a flat longitudinal fissure
  let lx = px;
  if (lx < 0) lx = lx * (0.16 + 0.84 * Math.exp(-((lx / 0.07) ** 2)));
  const X = side * (lx + 0.64 * 0.16 + 0.004);
  return [X, py, pz, lx];
}

function foldField(p, side) {
  // domain-warped simplex; zero-crossings become sulci
  const [x, y, z] = p;
  const s = side * 7.31;
  const wx = N2.noise(x * 2.2 + s, y * 2.2, z * 2.2) * 0.22;
  const wy = N2.noise(x * 2.2 + 11.1, y * 2.2 + s, z * 2.2) * 0.22;
  const wz = N2.noise(x * 2.2 - 5.3, y * 2.2, z * 2.2 + s) * 0.22;
  const qx = (x + wx) * 4.6, qy = (y + wy) * 4.9, qz = (z + wz) * 4.2;
  // two octaves: extra octave breaks up the concentric "fingerprint" contours a single noise produces
  const f1 = N.noise(qx + s, qy, qz) + 0.55 * N.noise(qx * 2.3 + 3.3, qy * 2.3 + s, qz * 2.3);
  const f2 = N.noise(qx * 3.1 - 7.7, qy * 3.1, qz * 3.1 + s);
  return [f1, f2];
}

function distToSeg(py, pz, a, b) {
  const vy = b[0] - a[0], vz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((py - a[0]) * vy + (pz - a[1]) * vz) / (vy * vy + vz * vz)));
  const dy = py - (a[0] + vy * t), dz = pz - (a[1] + vz * t);
  return Math.sqrt(dy * dy + dz * dz);
}

function buildHemisphere(side, detail) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const pos = g.attributes.position; const n = pos.count;
  const cav = new Float32Array(n);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const dx = pos.getX(i), dy = pos.getY(i), dz = pos.getZ(i);
    const [X, Y, Z, lx] = hemiShape([dx, dy, dz], side);
    // outward direction for displacement (approximate surface normal of the base shape)
    let nx = X - side * 0.12, ny = Y + 0.05, nz = Z * 0.7;
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const [f1, f2] = foldField([X, Y, Z], side);
    const medial = Math.exp(-((lx + 0.06) ** 2) / 0.0012) * (lx < 0.02 ? 1 : 0); // inner wall: shallower folds
    let sul = Math.exp(-((f1 / 0.16) ** 2));
    let sul2 = Math.exp(-((f2 / 0.07) ** 2)) * 0.18 * (1 - sul);
    // Sylvian (lateral) fissure: runs from front-lower, back and slightly up, on the lateral face
    const lat = Math.max(0, Math.min(1, (lx - 0.25) / 0.2));
    const syl = Math.exp(-((distToSeg(Y, Z, [-0.13, 0.5], [0.1, -0.28]) / 0.03) ** 2)) * lat;
    // central sulcus: from the vertex near midline, down and forward to the Sylvian fissure
    const cen = Math.exp(-((distToSeg(Y, Z, [0.56, -0.08], [0.02, 0.12]) / 0.022) ** 2)) * (Y > -0.02 ? 1 : 0);
    const groove = Math.min(1.25, sul + sul2 + 1.4 * syl + 0.9 * cen);
    const gyrus = 0.014 * Math.min(1, Math.abs(f1) / 0.45);
    let disp = -0.03 * groove + gyrus;
    disp *= 1 - 0.6 * medial;
    out[i * 3] = X + nx * disp; out[i * 3 + 1] = Y + ny * disp; out[i * 3 + 2] = Z + nz * disp;
    cav[i] = Math.min(1, groove);
  }
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  g.setAttribute('cav', new THREE.BufferAttribute(cav, 1));
  g.computeVertexNormals();
  return g;
}

function buildCerebellum(detail) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const pos = g.attributes.position, n = pos.count, cav = new Float32Array(n), out = new Float32Array(n * 3);
  const C = [0, -0.3, -0.55];
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let px = x * 0.5, py = y * 0.21, pz = z * 0.29;
    py *= 1 - 0.25 * Math.exp(-(px * px) / 0.006); // vermis dip
    if (py > 0) py *= 0.8;
    // folia: thin, roughly parallel transverse ridges that curve around the lobe
    const phase = py * 62 + pz * pz * 30 + px * px * 12 + N.noise(px * 4, py * 4, pz * 4) * 1.5;
    const fol = Math.pow(Math.abs(Math.sin(phase)), 0.6);
    const disp = -0.014 * (1 - fol);
    const l = Math.hypot(px, py * 2, pz) || 1;
    out[i * 3] = C[0] + px + (px / l) * disp; out[i * 3 + 1] = C[1] + py + (py * 2 / l) * disp; out[i * 3 + 2] = C[2] + pz + (pz / l) * disp;
    cav[i] = 1 - fol;
  }
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  g.setAttribute('cav', new THREE.BufferAttribute(cav, 1));
  g.computeVertexNormals();
  return g;
}

function buildStem() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    let r = 0.085 + 0.03 * Math.exp(-((t - 0.32) ** 2) / 0.01) - 0.018 * t; // pons bulge
    if (t < 0.04) r *= t / 0.04 * 0.5 + 0.5;
    pts.push(new THREE.Vector2(Math.max(0.01, r), -t * 0.5));
  }
  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateX(0.32); g.translate(0, -0.16, -0.18);
  const cav = new Float32Array(g.attributes.position.count).fill(0.55);
  g.setAttribute('cav', new THREE.BufferAttribute(cav, 1));
  return g;
}

const TISSUE_VS = /* glsl */`
  attribute float cav;
  varying vec3 vN, vW; varying float vCav;
  void main(){
    vCav = cav;
    vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const TISSUE_FS = /* glsl */`
  ${GLSL_NOISE}
  uniform float uTime, uWaveFront, uWaveAmp, uGlow, uOpacity, uInner;
  uniform vec3 uWaveDir, uRim, uKey, uBase, uDeep;
  varying vec3 vN, vW; varying float vCav;
  void main(){
    vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
    if (!gl_FrontFacing) N = -N;
    float ndv = max(dot(N, V), 0.0);
    float fres = pow(1.0 - ndv, 2.6);
    vec3 L1 = normalize(vec3(-0.6, 0.75, 0.55)); // warm key
    vec3 L2 = normalize(vec3(0.8, 0.2, -0.7));   // cool back/fill
    float n1 = snoise(vW * 22.0) * 0.5 + 0.5;
    float wrap1 = max((dot(N, L1) + 0.35) / 1.35, 0.0);
    float wrap2 = max((dot(N, L2) + 0.2) / 1.2, 0.0);
    vec3 alb = mix(uBase, uDeep, smoothstep(0.1, 0.9, vCav));
    alb *= 0.85 + 0.3 * n1;
    vec3 col = alb * (uKey * wrap1 * 0.85 + uRim * wrap2 * 0.45 + vec3(0.02, 0.025, 0.045));
    // wet specular sheen
    vec3 H = normalize(L1 + V); float sp = pow(max(dot(N, H), 0.0), 48.0) * (1.0 - vCav) * (0.5 + 0.5 * n1);
    col += uKey * sp * 0.55;
    vec3 H2 = normalize(L2 + V); col += uRim * pow(max(dot(N, H2), 0.0), 30.0) * 0.35;
    // translucency: light scattering through thin gyral crowns
    float sss = pow(max(dot(V, -L1 + N * 0.4), 0.0), 3.0) * (1.0 - vCav);
    col += uKey * sss * 0.18;
    col += uRim * fres * 0.5;
    // stylised activity: light pooling in sulci + travelling wave front
    float vein = smoothstep(0.35, 0.9, snoise(vW * 9.0 + vec3(0.0, uTime * 0.25, 0.0)) * 0.5 + 0.5);
    float front = exp(-pow((dot(vW, uWaveDir) - uWaveFront) / 0.07, 2.0)) * uWaveAmp;
    col += uRim * (vCav * 0.45 * uInner * (0.4 + vein));
    col += mix(uRim, vec3(1.0), 0.35) * front * (0.5 + 0.8 * vein) * (0.4 + vCav);
    col += uRim * uGlow * (0.3 + 0.7 * vein) * fres;
    gl_FragColor = vec4(col, uOpacity);
  }`;

export function makeTissueMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uWaveFront: { value: -10 }, uWaveAmp: { value: 0 }, uGlow: { value: 0.2 }, uOpacity: { value: 1 }, uInner: { value: 0.5 },
      uWaveDir: { value: new THREE.Vector3(0, 0, 1) },
      uRim: { value: new THREE.Color(opts.rim ?? 0x2fb8ff) }, uKey: { value: new THREE.Color(opts.key ?? 0xe79a62) },
      uBase: { value: new THREE.Color(opts.base ?? 0x8c8a98) }, uDeep: { value: new THREE.Color(opts.deep ?? 0x10131f) },
    },
    vertexShader: TISSUE_VS, fragmentShader: TISSUE_FS, transparent: false,
  });
}

// --- stylised surface network -------------------------------------------------------------
function buildNetwork(hemis, rng, count = 1000) {
  const nodes = [];
  for (const g of hemis) {
    const p = g.attributes.position, nrm = g.attributes.normal, cav = g.attributes.cav;
    let guard = 0;
    while (nodes.length < count * (hemis.indexOf(g) + 1) / hemis.length && guard++ < 200000) {
      const i = Math.floor(rng.next() * p.count);
      if (cav.getX(i) > 0.25) continue;
      const o = 0.008;
      nodes.push(new THREE.Vector3(p.getX(i) + nrm.getX(i) * o, p.getY(i) + nrm.getY(i) * o, p.getZ(i) + nrm.getZ(i) * o));
    }
  }
  // origin for the "lights up one by one" reveal: occipital-top region
  const origin = new THREE.Vector3(0.15, 0.45, -0.35);
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    const near = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue; const d = nodes[i].distanceToSquared(nodes[j]);
      if (d < 0.022) near.push([d, j]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(3, near.length); k++) if (near[k][1] > i || rng.next() < 0.3) edges.push([i, near[k][1]]);
  }
  const SEG = 6;
  const P = [], T = [], S = [], O = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const [i, j] of edges) {
    const seed = rng.next(); const ord = Math.min(nodes[i].distanceTo(origin), nodes[j].distanceTo(origin));
    const lift = 0.012 + 0.02 * rng.next();
    for (let s = 0; s < SEG; s++) {
      for (const tt of [s / SEG, (s + 1) / SEG]) {
        c.lerpVectors(nodes[i], nodes[j], tt);
        const bulge = Math.sin(Math.PI * tt) * lift; const len = c.length();
        c.multiplyScalar((len + bulge) / len);
        P.push(c.x, c.y, c.z); T.push(tt); S.push(seed); O.push(ord);
      }
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  lg.setAttribute('aT', new THREE.Float32BufferAttribute(T, 1));
  lg.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 1));
  lg.setAttribute('aOrd', new THREE.Float32BufferAttribute(O, 1));
  const lineMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uWave: { value: -10 }, uAmp: { value: 1 }, uRate: { value: 0.6 }, uC1: { value: new THREE.Color(0x39c6ff) }, uC2: { value: new THREE.Color(0xffb36b) } },
    vertexShader: /* glsl */`attribute float aT, aSeed, aOrd; varying float vT, vSeed, vOrd; varying vec3 vW;
      void main(){ vT = aT; vSeed = aSeed; vOrd = aOrd; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`uniform float uTime, uReveal, uWave, uAmp, uRate; uniform vec3 uC1, uC2; varying float vT, vSeed, vOrd; varying vec3 vW;
      void main(){
        float on = smoothstep(uReveal, uReveal - 0.12, vOrd);
        float ph = fract(uTime * uRate * (0.6 + vSeed) + vSeed * 7.0);
        float pulse = exp(-pow((vT - ph) / 0.07, 2.0)) * step(0.55, fract(vSeed * 13.0));
        float wave = exp(-pow((vOrd - uWave) / 0.09, 2.0));
        vec3 c = uC1 * (0.12 + 1.6 * pulse) + uC2 * pulse * 0.8 + mix(uC1, vec3(1.0), 0.5) * wave * 2.4;
        float a = on * uAmp * (0.3 + 0.7 * max(pulse, wave));
        gl_FragColor = vec4(c * a, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const lines = new THREE.LineSegments(lg, lineMat);
  // nodes as glowing points
  const NP = [], NO = [], NS = [];
  for (const nd of nodes) { NP.push(nd.x, nd.y, nd.z); NO.push(nd.distanceTo(origin)); NS.push(rng.next()); }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(NP, 3));
  pg.setAttribute('aOrd', new THREE.Float32BufferAttribute(NO, 1));
  pg.setAttribute('aSeed', new THREE.Float32BufferAttribute(NS, 1));
  const ptMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uWave: { value: -10 }, uAmp: { value: 1 }, uSize: { value: 30 }, uC1: lineMat.uniforms.uC1, uC2: lineMat.uniforms.uC2 },
    vertexShader: /* glsl */`attribute float aOrd, aSeed; uniform float uTime, uReveal, uWave, uSize; varying float vA, vW2, vS;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        float on = smoothstep(uReveal, uReveal - 0.08, aOrd); vW2 = exp(-pow((aOrd - uWave)/0.09, 2.0));
        float tw = 0.5 + 0.5 * sin(uTime * (2.0 + 3.0 * aSeed) + aSeed * 40.0);
        vA = on * (0.35 + 0.65 * tw); vS = aSeed;
        gl_PointSize = uSize * (0.5 + 0.8 * tw + 1.5 * vW2) / -mv.z; }`,
    fragmentShader: /* glsl */`uniform float uAmp; uniform vec3 uC1, uC2; varying float vA, vW2, vS;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float g = exp(-r * r * 40.0) + 0.25 * exp(-r * r * 8.0);
        vec3 c = mix(uC1, uC2, step(0.8, vS)) * (1.2 + 2.5 * vW2);
        gl_FragColor = vec4(c * g * vA * uAmp, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const points = new THREE.Points(pg, ptMat);
  return { lines, points, lineMat, ptMat, nodes, origin };
}

export function buildBrain(opts = {}) {
  const detail = opts.detail ?? 96;
  const rng = new RNG(opts.seed ?? 7);
  const group = new THREE.Group();
  const mat = makeTissueMaterial(opts);
  const L = buildHemisphere(-1, detail), R = buildHemisphere(1, detail);
  const cb = buildCerebellum(Math.round(detail * 0.6));
  const st = buildStem();
  for (const g of [L, R, cb, st]) group.add(new THREE.Mesh(g, mat));
  const net = buildNetwork([L, R], rng, opts.nodes ?? 800);
  group.add(net.lines); group.add(net.points);
  return { group, material: mat, net, geometries: { L, R, cb, st } };
}
