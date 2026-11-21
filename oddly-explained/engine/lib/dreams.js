// ODDLY EXPLAINED engine — dream-imagery fragments (explicitly artistic, not biological).
// Every fragment shares a "dream" look so it can't be mistaken for anatomy: iridescent holographic shading,
// noise-dissolve edges, chromatic shimmer. Each builder returns { object, uniforms }.
// uniforms.uShow (0..1) dissolves the fragment in/out.
import * as THREE from 'three';
import { RNG, Simplex3, GLSL_NOISE } from './noise.js';
import { mergeVertices } from './geom.js';

const DREAM_FS_HEAD = /* glsl */`
  ${GLSL_NOISE}
  uniform float uTime, uShow; uniform vec3 uColA, uColB;
  varying vec3 vN, vW, vL; varying float vDepth;
  vec3 iri(float x){ return 0.5 + 0.5 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67))); }
  float dissolve(){ float n = snoise(vL * 3.0 + uTime * 0.2) * 0.5 + 0.5; return smoothstep(n - 0.08, n + 0.08, uShow * 1.15 - 0.05); }
`;
const DREAM_VS = /* glsl */`
  uniform float uTime, uBend; varying vec3 vN, vW, vL; varying float vDepth;
  void main(){
    vec3 p = position; vL = position;
    vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
    vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
  }`;

function dreamMaterial(fsBody, extraUniforms = {}, vs = DREAM_VS) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uShow: { value: 0 }, uBend: { value: 0 }, uColA: { value: new THREE.Color(0xffb36b) }, uColB: { value: new THREE.Color(0x46cfff) }, ...extraUniforms },
    vertexShader: vs, fragmentShader: DREAM_FS_HEAD + fsBody, transparent: true, depthWrite: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

// Shared fragment body: holographic shading with fresnel + iridescence.
const HOLO = /* glsl */`
  void main(){
    float a = dissolve(); if (a < 0.01) discard;
    vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
    float fr = pow(1.0 - abs(dot(N, V)), 2.0);
    float band = 0.5 + 0.5 * sin(vL.y * 40.0 - uTime * 2.0);
    vec3 base = mix(uColB, uColA, smoothstep(-0.4, 0.6, vL.y + 0.2 * snoise(vL * 2.0 + uTime * 0.1)));
    vec3 c = base * (0.18 + 0.5 * fr) + iri(fr * 0.8 + vL.y * 0.3 + uTime * 0.05) * fr * 0.35;
    c *= 0.85 + 0.15 * band;
    float edge = smoothstep(0.0, 0.25, a) * (1.0 - smoothstep(0.25, 0.9, a));
    c += mix(uColA, vec3(1.0), 0.3) * edge * 0.7;
    gl_FragColor = vec4(c * a * 0.6, 1.0);
  }`;

export function buildIsland(seed = 11) {
  const rng = new RNG(seed); const n = new Simplex3(seed); const group = new THREE.Group();
  // inverted rocky cone
  const rock = new THREE.ConeGeometry(1, 1.6, 48, 24, true); rock.rotateX(Math.PI); rock.translate(0, -0.8, 0);
  const p = rock.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.28 * n.fbm(v.x * 2, v.y * 2.5, v.z * 2, 3); p.setXYZ(i, v.x * k, v.y, v.z * k); }
  rock.computeVertexNormals();
  // terrain top with hills
  const top = new THREE.CircleGeometry(1.0, 64, 0, Math.PI * 2); top.rotateX(-Math.PI / 2);
  const tg = new THREE.PlaneGeometry(2, 2, 64, 64); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position; const keep = [];
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i); const r = Math.hypot(x, z); const h = r < 1 ? 0.25 * Math.max(0, n.fbm(x * 1.5, 0, z * 1.5, 4) + 0.3) * (1 - r * r) : -0.05; tp.setY(i, h); }
  // clip to disk by collapsing outside points onto the rim
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i); const r = Math.hypot(x, z); if (r > 1) { tp.setX(i, x / r); tp.setZ(i, z / r); tp.setY(i, 0); } }
  tg.computeVertexNormals();
  const uniforms = { uTime: { value: 0 }, uShow: { value: 0 }, uBend: { value: 0 }, uColA: { value: new THREE.Color(0xffb36b) }, uColB: { value: new THREE.Color(0x46cfff) } };
  const mk = (g) => { const m = dreamMaterial(HOLO); m.uniforms = uniforms; return new THREE.Mesh(g, m); };
  group.add(mk(rock)); group.add(mk(tg));
  // a few slender trees
  for (let i = 0; i < 7; i++) {
    const a = rng.range(0, 6.28), r = rng.range(0.1, 0.75); const h = rng.range(0.25, 0.5);
    const tr = new THREE.ConeGeometry(0.06, h, 8); tr.translate(Math.cos(a) * r, 0.18 + h / 2, Math.sin(a) * r);
    group.add(mk(tr));
  }
  // waterfall: particles streaming off the edge into the void
  const W = 420; const P = new Float32Array(W * 3), S = new Float32Array(W);
  for (let i = 0; i < W; i++) { S[i] = rng.next(); P[i * 3] = 0.95 + rng.range(-0.04, 0.04); P[i * 3 + 1] = 0; P[i * 3 + 2] = rng.range(-0.08, 0.08); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(P, 3)); wg.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
  const wm = new THREE.ShaderMaterial({ uniforms,
    vertexShader: `attribute float aSeed; uniform float uTime, uShow; varying float vA; void main(){ float ph = fract(aSeed + uTime * 0.35); vec3 p = position; p.y -= ph * ph * 2.4; p.x += ph * 0.25; vA = (1.0 - ph) * uShow; vec4 mv = modelViewMatrix * vec4(p,1.0); gl_PointSize = 34.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColB; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float g = exp(-r*r*30.0); gl_FragColor = vec4(mix(uColB, vec3(1.0), 0.4) * g * vA * 0.8, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const wf = new THREE.Points(wg, wm); wf.frustumCulled = false; group.add(wf);
  return { object: group, uniforms };
}

export function buildClock() {
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uShow: { value: 0 }, uBend: { value: 0.0 }, uColA: { value: new THREE.Color(0xffc27a) }, uColB: { value: new THREE.Color(0x46cfff) } };
  // vertex shader that "melts" the clock: droops downward away from a fold line and ripples over time
  const VS = /* glsl */`
    uniform float uTime, uBend; varying vec3 vN, vW, vL; varying float vDepth;
    vec3 melt(vec3 p){
      float d = max(0.0, p.x + 0.15);
      p.y -= uBend * d * d * 1.25;
      p.z += uBend * 0.25 * sin(p.y * 3.0 + uTime * 1.3) * d;
      p.x -= uBend * 0.18 * d * d;
      return p;
    }
    void main(){
      vec3 p = melt(position); vL = position;
      vec3 e = vec3(0.01, 0.0, 0.0);
      vec3 n = normalize(mat3(modelMatrix) * normal);
      vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = n;
      vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
    }`;
  const mk = (g, body = HOLO) => { const m = dreamMaterial(body, {}, VS); m.uniforms = uniforms; return new THREE.Mesh(g, m); };
  const face = new THREE.CylinderGeometry(1, 1, 0.06, 96, 1); face.rotateX(Math.PI / 2);
  group.add(mk(face));
  const rim = new THREE.TorusGeometry(1.03, 0.05, 12, 120); group.add(mk(rim));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2; const big = i % 3 === 0;
    const tk = new THREE.BoxGeometry(big ? 0.05 : 0.025, big ? 0.18 : 0.1, 0.04); tk.translate(0, 0.84, 0.05); tk.rotateZ(-a);
    group.add(mk(tk));
  }
  const hh = new THREE.BoxGeometry(0.06, 0.5, 0.03); hh.translate(0, 0.25, 0.08);
  const mh = new THREE.BoxGeometry(0.04, 0.75, 0.03); mh.translate(0, 0.37, 0.1);
  const hm = mk(hh), mm = mk(mh); group.add(hm); group.add(mm);
  return { object: group, uniforms, hands: [hm, mm] };
}

export function buildSilhouette() {
  // A distant human figure seen as a dark shape against a glowing haze.
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({ uniforms: { uShow: { value: 0 }, uRim: { value: new THREE.Color(0x8fdcff) } },
    vertexShader: `varying vec3 vN, vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uShow; uniform vec3 uRim; varying vec3 vN, vW; void main(){ vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(normalize(vN), V)), 3.0); gl_FragColor = vec4(vec3(0.01, 0.02, 0.04) + uRim * fr * 0.45, uShow * 0.92); }`,
    transparent: true, depthWrite: true });
  const add = (g, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); group.add(m); };
  add(new THREE.SphereGeometry(0.11, 24, 16), 0, 1.62, 0);
  add(new THREE.CapsuleGeometry(0.16, 0.5, 8, 16), 0, 1.18, 0);
  add(new THREE.CapsuleGeometry(0.065, 0.55, 6, 12), -0.23, 1.12, 0, 0, 0.12);
  add(new THREE.CapsuleGeometry(0.065, 0.55, 6, 12), 0.23, 1.12, 0, 0, -0.12);
  add(new THREE.CapsuleGeometry(0.08, 0.75, 6, 12), -0.09, 0.45, 0, 0, 0.03);
  add(new THREE.CapsuleGeometry(0.08, 0.75, 6, 12), 0.09, 0.45, 0, 0, -0.03);
  // glowing haze behind the figure
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShaderMaterial({ uniforms: { uShow: mat.uniforms.uShow, uTime: { value: 0 }, uCol: { value: new THREE.Color(0x3aa8ff) }, uCol2: { value: new THREE.Color(0xffb36b) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `${GLSL_NOISE} uniform float uShow, uTime; uniform vec3 uCol, uCol2; varying vec2 vUv; void main(){ vec2 d = vUv - vec2(0.5, 0.42); float r = length(d * vec2(1.0, 0.8));
      float n = snoise(vec3(vUv * 3.0, uTime * 0.15)) * 0.5 + 0.5; float g = exp(-r * r * 22.0) * (1.0 - smoothstep(0.3, 0.5, r)) * (0.7 + 0.3 * n) + 0.35 * exp(-pow((vUv.y - 0.2) / 0.05, 2.0)) * (1.0 - smoothstep(0.05, 0.3, abs(vUv.x - 0.5)));
      gl_FragColor = vec4(mix(uCol, uCol2, (1.0 - smoothstep(0.0, 0.3, r))) * g * uShow * 0.9, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 1.2, -0.6); group.add(halo);
  return { object: group, uniforms: mat.uniforms, halo };
}

export function buildBlobs(seed = 4) {
  const rng = new RNG(seed); const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uShow: { value: 0 }, uBend: { value: 0 }, uColA: { value: new THREE.Color(0xffa24a) }, uColB: { value: new THREE.Color(0x3cc8ff) } };
  const VS = /* glsl */`
    ${GLSL_NOISE}
    uniform float uTime, uBend; attribute float aK; varying vec3 vN, vW, vL; varying float vDepth;
    void main(){
      vec3 p = position; float k = snoise(p * 1.6 + vec3(uTime * 0.35, uTime * 0.2, aK * 5.0));
      p += normal * k * 0.28; vL = position + k;
      vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
    }`;
  const FS = /* glsl */`
    void main(){
      float a = dissolve(); if (a < 0.01) discard;
      vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(N, V)), 1.6);
      vec3 c = iri(vL.x * 0.4 + vL.y * 0.3 + uTime * 0.08) * (0.15 + 0.85 * fr);
      c = mix(c, mix(uColB, uColA, 0.5 + 0.5 * sin(vL.z * 3.0 + uTime)), 0.7);
      gl_FragColor = vec4(c * a * (0.18 + 0.42 * fr), 1.0);
    }`;
  const blobs = [];
  for (let i = 0; i < 5; i++) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(rng.range(0.35, 0.7), 24)); g.computeVertexNormals();
    const K = new Float32Array(g.attributes.position.count).fill(rng.next()); g.setAttribute('aK', new THREE.BufferAttribute(K, 1));
    const m = dreamMaterial(FS, {}, VS); m.uniforms = uniforms;
    const mesh = new THREE.Mesh(g, m); mesh.position.set(rng.range(-1.6, 1.6), rng.range(-1.4, 1.4), rng.range(-1.2, 1.2));
    blobs.push({ mesh, base: mesh.position.clone(), ph: rng.range(0, 6.28) }); group.add(mesh);
  }
  // a twisting ribbon of colour
  const rib = new THREE.PlaneGeometry(6, 0.35, 200, 2);
  const rp = rib.attributes.position;
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i); const a = x * 1.1; rp.setXYZ(i, x, Math.sin(a) * 0.9 + y * Math.cos(a * 1.5), Math.cos(a * 0.8) * 0.9 + y * Math.sin(a * 1.5)); }
  rib.computeVertexNormals();
  const ribM = dreamMaterial(HOLO); ribM.uniforms = uniforms; const ribbon = new THREE.Mesh(rib, ribM); // available, not added by default
  return { object: group, uniforms, blobs, ribbon };
}
