// THE LAST TWO — 15s procedural dark-fantasy cinematic.
// Everything is generated here: geometry, textures, lights, weather, camera.
// The page exposes window.renderFrame(t) so an offline renderer can step it
// deterministically at 24 fps (see render.mjs).
import * as THREE from "three";
import { EffectComposer } from "./lib/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./lib/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "./lib/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "./lib/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./lib/jsm/postprocessing/OutputPass.js";

const Q = new URLSearchParams(location.search);
const W = +(Q.get("w") || 1920), H = +(Q.get("h") || 1080);
const MB = +(Q.get("mb") || 1);          // motion-blur subframes
const FPS = 24, SHUTTER = 0.5 / FPS;     // 180-degree shutter

// ------------------------------------------------------------------ helpers
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
function fbm(x, y, o = 5) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
// Catmull-Rom through uniformly spaced keys -> C1-continuous camera motion
function cr(keys, t) {
  const n = keys.length - 1; const t0 = keys[0][0], t1 = keys[n][0];
  let u = clamp((t - t0) / (t1 - t0)) * n; const i = Math.min(n - 1, Math.floor(u)); u -= i;
  const p = (j) => keys[clamp(j, 0, n)][1];
  const a = p(i - 1), b = p(i), c = p(i + 1), d = p(i + 2);
  return b.map((_, k) => 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u * u * u));
}

// Merge many (geometry, matrix, color) parts into one non-indexed geometry with vertex colours.
function merge(parts) {
  const geos = parts.map(({ g, m, c }) => {
    let q = g.index ? g.toNonIndexed() : g.clone(); q.applyMatrix4(m);
    const col = new THREE.Color(c), n = q.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    q.setAttribute("color", new THREE.BufferAttribute(arr, 3)); return q;
  });
  let total = 0; geos.forEach((q) => (total += q.attributes.position.count));
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"]) {
    const arr = new Float32Array(total * 3); let o = 0;
    geos.forEach((q) => { arr.set(q.attributes[name].array, o); o += q.attributes[name].array.length; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}
const M4 = (p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => new THREE.Matrix4().compose(V(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(...s));
function between(a, b, r0, r1, seg = 8) { // matrix + geometry for a cylinder from a to b
  const d = b.clone().sub(a), L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  return { g: new THREE.CylinderGeometry(r1, r0, L, seg, 1), m: new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), q, V(1, 1, 1)) };
}
function place(mesh, a, b) { // orient a unit-height Y cylinder mesh from a to b
  const d = b.clone().sub(a), L = d.length();
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.multiplyScalar(1 / L));
  mesh.scale.set(1, L, 1);
}

// ------------------------------------------------------------------ renderer
const glCanvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const out = document.getElementById("out"); out.width = W; out.height = H;
const ctx = out.getContext("2d");
glCanvas.style.width = out.style.width = "100vw"; glCanvas.style.height = out.style.height = "auto";

const scene = new THREE.Scene();
const FOG = new THREE.Color(0x161d27);
scene.fog = new THREE.FogExp2(FOG.clone(), 0.0042);
scene.background = FOG.clone();
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 2500);

const U = { time: { value: 0 }, flash: { value: 0 }, gust: { value: 1 }, cam: { value: V() } };

// ------------------------------------------------------------------ environment map (storm sky for reflections)
function envTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#0d121a"); gr.addColorStop(0.42, "#2c3747"); gr.addColorStop(0.5, "#56657a"); gr.addColorStop(0.56, "#1c2129"); gr.addColorStop(1, "#060606");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "rgba(190,210,255,0.9)"; g.fillRect(200, 40, 140, 60); // a bright cloud bank (lightning-lit) behind the army
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromEquirectangular(envTexture()).texture;
scene.environmentIntensity = 0.35;

// ------------------------------------------------------------------ sky dome with animated storm clouds
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 64, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uTime: U.time, uFlash: U.flash, uBolt: { value: V(0, 0.3, -1) }, uFog: { value: FOG } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `
    varying vec3 vDir; uniform float uTime, uFlash; uniform vec3 uBolt, uFog;
    float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
    float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float fbm(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*n3(p); p=p*2.07+vec3(1.3,0.7,2.1); a*=0.5;} return s; }
    void main(){
      vec3 d = normalize(vDir);
      float el = d.y;
      vec2 uv = d.xz / max(0.08, el + 0.12);
      float c = fbm(vec3(uv*1.3 + vec2(uTime*0.05, uTime*0.11), uTime*0.06));
      float c2 = fbm(vec3(uv*3.1 - vec2(uTime*0.09, 0.0), 3.0 + uTime*0.1));
      float cloud = smoothstep(0.32, 0.78, c*0.75 + c2*0.35);
      vec3 base = mix(vec3(0.075,0.095,0.125), vec3(0.012,0.016,0.024), smoothstep(-0.02, 0.45, el));
      vec3 col = base * (0.55 + 0.9*cloud);
      // lightning: clouds glow around the bolt direction, plus a global flash
      float near = pow(max(0.0, dot(d, normalize(uBolt))), 6.0);
      vec3 lit = vec3(0.62,0.72,1.0) * uFlash * (0.12 + 1.1*near) * (0.3 + 1.1*cloud);
      col += lit;
      // horizon haze matches fog
      col = mix(col, uFog*(1.0+uFlash*2.5), smoothstep(0.16, -0.01, el));
      gl_FragColor = vec4(col, 1.0);
    }`,
}));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

// ------------------------------------------------------------------ terrain
const groundH = (x, z) => {
  const r = Math.hypot(x, z);
  const big = (fbm(x / 160 + 3.1, z / 160 + 7.7, 4) - 0.5) * 7 * smooth(18, 120, r);
  const ruts = (fbm(x / 3.2, z / 3.2, 3) - 0.5) * 0.16;
  const ridge = smooth(30, 260, -z) * 9 + smooth(260, 700, -z) * 14; // the horde holds a slow rise
  return big + ruts + ridge * (1 - smooth(250, 500, Math.abs(x)) * 0.5) - 0.02;
};
function mudTextures() {
  const N = 512, c1 = document.createElement("canvas"), c2 = document.createElement("canvas"), c3 = document.createElement("canvas");
  [c1, c2, c3].forEach((c) => { c.width = c.height = N; });
  const g1 = c1.getContext("2d"), g2 = c2.getContext("2d"), g3 = c3.getContext("2d");
  const i1 = g1.createImageData(N, N), i2 = g2.createImageData(N, N), i3 = g3.createImageData(N, N);
  const hgt = new Float32Array(N * N);
  // tileable noise via periodic sampling on a torus
  const tile = (x, y, f, o) => { const a = (x / N) * Math.PI * 2, b = (y / N) * Math.PI * 2; return fbm(Math.cos(a) * f + 10, Math.sin(a) * f + Math.cos(b) * f + 20, o) * 0.5 + fbm(Math.sin(b) * f + 30, Math.cos(a + b) * f * 0.7 + 40, o) * 0.5; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hh = tile(x, y, 2.2, 5), fine = tile(x, y, 9, 3);
    hgt[y * N + x] = hh + fine * 0.15;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = y * N + x, hh = hgt[k];
    const puddle = smooth(0.47, 0.43, hh); // low areas hold water
    const tone = 0.06 + 0.06 * hgt[k] + 0.03 * hash2(x, y);
    i1.data[k * 4] = 255 * lerp(tone * 1.05, 0.03, puddle); i1.data[k * 4 + 1] = 255 * lerp(tone * 0.93, 0.035, puddle); i1.data[k * 4 + 2] = 255 * lerp(tone * 0.82, 0.045, puddle); i1.data[k * 4 + 3] = 255;
    const rough = lerp(0.8 - 0.15 * hgt[k], 0.32, puddle);
    i2.data[k * 4] = i2.data[k * 4 + 1] = i2.data[k * 4 + 2] = 255 * rough; i2.data[k * 4 + 3] = 255;
    const hx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x + N - 1) % N)], hy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x];
    const s = 7 * (1 - puddle);
    const nx = -hx * s, ny = -hy * s, nz = 1, l = Math.hypot(nx, ny, nz);
    i3.data[k * 4] = 255 * (nx / l * 0.5 + 0.5); i3.data[k * 4 + 1] = 255 * (ny / l * 0.5 + 0.5); i3.data[k * 4 + 2] = 255 * (nz / l * 0.5 + 0.5); i3.data[k * 4 + 3] = 255;
  }
  g1.putImageData(i1, 0, 0); g2.putImageData(i2, 0, 0); g3.putImageData(i3, 0, 0);
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(220, 220); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: mk(c1, true), roughnessMap: mk(c2), normalMap: mk(c3) };
}
{
  const g = new THREE.PlaneGeometry(1800, 1800, 256, 256); g.rotateX(-Math.PI / 2);
  // concentrate resolution near the samurai by warping the grid radially
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z = p.getZ(i); const r = Math.hypot(x, z);
    if (r > 0) { const k = Math.pow(r / 900, 1.9) * 900 / r; x *= k; z *= k; }
    p.setXYZ(i, x, groundH(x, z), z);
  }
  g.computeVertexNormals();
  const tx = mudTextures();
  const mat = new THREE.MeshStandardMaterial({ ...tx, color: 0xffffff, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.7 });
  const ground = new THREE.Mesh(g, mat); ground.receiveShadow = true; scene.add(ground);
}

// ------------------------------------------------------------------ lights
const hemi = new THREE.HemisphereLight(0x3a4a62, 0x0b0906, 0.55); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x7d93b3, 0.55); moon.position.set(-30, 40, -60); scene.add(moon); // cold back rim
const fill = new THREE.DirectionalLight(0x8899b8, 0.3);
const kick = new THREE.SpotLight(0x9fb4d6, 6, 14, 0.5, 0.8); kick.position.set(1.5, 3.2, -6); kick.target.position.set(0, 1.4, 0); scene.add(kick, kick.target); // lightning bounce rim for the close-up fill.position.set(40, 12, 30); scene.add(fill);
const bolt = new THREE.DirectionalLight(0xc9d8ff, 0); bolt.castShadow = true;
bolt.shadow.mapSize.set(2048, 2048); Object.assign(bolt.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 120 });
bolt.shadow.bias = -0.0004; bolt.shadow.normalBias = 0.02; bolt.shadow.radius = 3;
scene.add(bolt); scene.add(bolt.target);
// lightning far-field: lights the army from behind / above
const boltFar = new THREE.DirectionalLight(0xb9c9ff, 0); scene.add(boltFar); scene.add(boltFar.target);

// ------------------------------------------------------------------ wind-driven cloth/hair material
function windMat(params, amp) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time; sh.uniforms.uGust = U.gust;
    sh.vertexShader = "uniform float uTime; uniform float uGust; attribute float aTip;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      mat4 WM = modelMatrix;
      #ifdef USE_INSTANCING
        WM = modelMatrix * instanceMatrix;
      #endif
      vec3 wp0 = (WM * vec4(position, 1.0)).xyz;
      float ph = dot(wp0.xz, vec2(1.7, 2.3)) + wp0.y * 0.5;
      float tip = pow(aTip, 1.5);
      float g = uGust * (0.75 + 0.25 * sin(uTime * 1.3 + ph * 0.2));
      vec3 wd = vec3(0.55 * sin(uTime * 8.5 + ph * 2.0 - aTip * 6.0) + 0.25 * sin(uTime * 17.0 + ph * 5.0 - aTip * 11.0),
                     0.18 * sin(uTime * 11.0 + ph * 3.0 - aTip * 8.0) + 0.25,
                     1.0 + 0.35 * sin(uTime * 6.0 + ph - aTip * 5.0)) * ${amp.toFixed(3)} * tip * g;
      transformed += inverse(mat3(WM)) * wd;`);
  };
  m.customProgramCacheKey = () => "wind" + amp;
  return m;
}
function ribbon(w, L, segs = 14, taper = 0.6) { // hangs down from y=0, aTip 0 at root -> 1 at tip
  const g = new THREE.PlaneGeometry(w, L, 1, segs); g.translate(0, -L / 2, 0);
  const p = g.attributes.position, tip = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const k = -p.getY(i) / L; tip[i] = k; p.setX(i, p.getX(i) * (1 - taper * k)); }
  g.setAttribute("aTip", new THREE.BufferAttribute(tip, 1)); g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------ samurai
const steelMat = new THREE.MeshPhysicalMaterial({ color: 0xd5dbe3, metalness: 1, roughness: 0.13, envMapIntensity: 2.2, clearcoat: 0.6 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0x6b5328, metalness: 1, roughness: 0.35 });
const skinMat = new THREE.MeshPhysicalMaterial({ color: 0x8a6650, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.2, sheen: 0.3 }); // rain-wet skin
const ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 1, roughness: 0.45, envMapIntensity: 0.6 });
const blackMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.4 });

function makeSamurai(fem) {
  const s = fem ? 0.94 : 1;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(s); root.add(body);
  const lac = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, metalness: 0.15, envMapIntensity: 1.4 });
  const plate = lac(fem ? 0x520a10 : 0x0a0a0c);
  const plate2 = lac(fem ? 0x1a0306 : 0x111114);
  const lace = new THREE.MeshStandardMaterial({ color: fem ? 0x070506 : 0x3a080c, roughness: 0.7 });
  const cloth = new THREE.MeshStandardMaterial({ color: fem ? 0x0c0a0b : 0x101116, roughness: 0.78 });
  const add = (g, m, p = [0, 0, 0], r = [0, 0, 0], sc = [1, 1, 1], par = body) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.rotation.set(...r); o.scale.set(...sc); o.castShadow = o.receiveShadow = true; par.add(o); return o; };

  // legs: wide hakama + armoured thigh apron + shin guards
  const feet = [V(-0.17, 0.06, -0.2), V(0.19, 0.06, 0.16)];
  feet.forEach((f, i) => {
    const hip = V(i ? 0.11 : -0.11, 0.92, 0);
    const knee = hip.clone().lerp(f, 0.5).add(V(0, 0.02, -0.06));
    const up = between(hip, knee, 0.17, 0.15, 14), lo = between(knee, f, 0.2, 0.17, 14);
    add(up.g, cloth).applyMatrix4(up.m); add(lo.g, cloth).applyMatrix4(lo.m);
    const sh = between(knee.clone().add(V(0, -0.02, -0.05)), f.clone().add(V(0, 0.1, -0.06)), 0.085, 0.075, 10);
    add(sh.g, plate2).applyMatrix4(sh.m);
    add(new THREE.BoxGeometry(0.11, 0.07, 0.26), blackMat, [f.x, 0.035, f.z - 0.05]);
  });
  // kusazuri (tassets): 5 hanging lamellar flaps with lacing rows
  for (let k = 0; k < 5; k++) {
    const a0 = -Math.PI / 2 + (k - 2) * 1.26 + Math.PI; // spread around waist; flap 2 faces forward (-z)
    for (let r = 0; r < 4; r++) {
      const rad = 0.24 + r * 0.022, y = 1.0 - r * 0.068;
      add(new THREE.CylinderGeometry(rad, rad + 0.02, 0.06, 10, 1, true, a0 - 0.5, 1.0), plate, [0, y, 0], [0, 0, 0], [1, 1, 0.82]).material.side = THREE.DoubleSide;
      add(new THREE.CylinderGeometry(rad + 0.004, rad + 0.006, 0.01, 10, 1, true, a0 - 0.5, 1.0), lace, [0, y + 0.033, 0], [0, 0, 0], [1, 1, 0.82]);
    }
  }
  // obi + do (cuirass) built as a lathe with lamellar ridges
  add(new THREE.CylinderGeometry(0.205, 0.215, 0.07, 24), lace, [0, 1.04, 0], [0, 0, 0], [1, 1, 0.78]);
  const prof = [[0.2, 1.06], [0.205, 1.14], [0.22, 1.25], [0.23, 1.35], [0.215, 1.43], [0.17, 1.48], [0.08, 1.5]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(prof, 28), plate, [0, 0, 0], [0, 0, 0], [1, 1, 0.74]);
  for (let r = 0; r < 6; r++) {
    const y = 1.1 + r * 0.06, rad = 0.207 + Math.sin(((y - 1.06) / 0.42) * Math.PI) * 0.024;
    add(new THREE.TorusGeometry(rad, 0.006, 6, 40), r % 2 ? lace : ironMat, [0, y, 0], [Math.PI / 2, 0, 0], [1, 0.74, 1]);
  }
  // nodowa + neck + head
  add(new THREE.CylinderGeometry(0.07, 0.11, 0.08, 16), plate2, [0, 1.5, 0]);
  add(new THREE.CylinderGeometry(0.052, 0.058, 0.14, 12), skinMat, [0, 1.56, 0.0]);
  const head = new THREE.Group(); head.position.set(0, 1.68, -0.01); body.add(head);
  add(new THREE.SphereGeometry(1, 32, 24), skinMat, [0, 0, 0], [0, 0, 0], fem ? [0.088, 0.112, 0.102] : [0.094, 0.118, 0.106], head);
  add(new THREE.SphereGeometry(1, 20, 14), skinMat, [0, -0.055, -0.03], [0, 0, 0], fem ? [0.07, 0.06, 0.075] : [0.082, 0.07, 0.08], head); // jaw
  add(new THREE.ConeGeometry(0.016, 0.05, 8), skinMat, [0, -0.0, -0.11], [-1.35, 0, 0], [1, 1, 0.8], head); // nose
  add(new THREE.BoxGeometry(0.15, 0.018, 0.03), skinMat, [0, 0.035, -0.088], [0.25, 0, 0], [1, 1, 1], head); // brow ridge
  [-0.034, 0.034].forEach((x) => add(new THREE.SphereGeometry(0.011, 10, 8), blackMat, [x, 0.014, -0.094], [0, 0, 0], [1, 0.55, 0.5], head));
  const hairMat = windMat({ color: 0x070605, roughness: 0.38, side: THREE.DoubleSide }, fem ? 0.1 : 0.13);
  add(new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: 0x070605, roughness: 0.4 }), [0, 0.016, 0.008], [-0.25, 0, 0], fem ? [0.096, 0.12, 0.112] : [0.102, 0.124, 0.115], head);
  const hair = [];
  if (!fem) { // long loose hair, falling behind the shoulders
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * (0.3 + 1.4 * (i / 21)) + Math.PI / 2;
      const card = new THREE.Mesh(ribbon(0.06, 0.42 + 0.12 * hash2(i, 3), 14, 0.5), hairMat);
      card.position.set(Math.cos(a) * 0.09, 0.05, Math.sin(a) * 0.1 + 0.01);
      card.rotation.set(0.2 * Math.sin(a), -a + Math.PI / 2, -0.12 * Math.cos(a)); card.castShadow = true; head.add(card); hair.push(card);
    }
    add(new THREE.CylinderGeometry(0.02, 0.025, 0.05, 10), lace, [0, 0.12, 0.05], [0.4, 0, 0], [1, 1, 1], head); // small topknot tie
  } else { // high ponytail + crimson hachimaki tails
    const tie = new THREE.Group(); tie.position.set(0, 0.1, 0.075); tie.rotation.x = 0.5; head.add(tie);
    add(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshStandardMaterial({ color: 0x070605, roughness: 0.4 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], tie);
    for (let i = 0; i < 12; i++) {
      const card = new THREE.Mesh(ribbon(0.05, 0.5 + 0.1 * hash2(i, 9), 14, 0.7), hairMat);
      card.rotation.set(0.15 * Math.sin(i), (i / 12) * Math.PI * 2, 0.1 * Math.cos(i * 2)); card.castShadow = true; tie.add(card); hair.push(card);
    }
    add(new THREE.TorusGeometry(1, 0.12, 6, 40), new THREE.MeshStandardMaterial({ color: 0x5a0a10, roughness: 0.65 }), [0, 0.045, 0.005], [Math.PI / 2 - 0.25, 0, 0], [0.1, 0.112, 0.1], head);
    const bandMat = windMat({ color: 0x5a0a10, roughness: 0.65, side: THREE.DoubleSide }, 0.16);
    [-0.12, 0.12].forEach((r) => { const b = new THREE.Mesh(ribbon(0.03, 0.42, 16, 0.2), bandMat); b.position.set(r * 0.12, 0.05, 0.1); b.rotation.set(0.3, 0, r); head.add(b); hair.push(b); });
  }

  // shoulders, arms (posed every frame by 2-bone IK), sode shoulder plates
  const arm = (side) => {
    const S = V(side * 0.215, 1.43, 0.0);
    const sode = new THREE.Group(); body.add(sode);
    for (let r = 0; r < 5; r++) {
      add(new THREE.BoxGeometry(0.018, 0.05, 0.15 + r * 0.006), plate, [side * (0.0 + r * 0.009), -r * 0.05, 0.01], [0, 0, side * 0.12], [1, 1, 1], sode);
      add(new THREE.BoxGeometry(0.022, 0.007, 0.155 + r * 0.006), lace, [side * (0.0 + r * 0.009), -r * 0.05 + 0.026, 0.01], [0, 0, side * 0.12], [1, 1, 1], sode);
    }
    const upper = add(new THREE.CylinderGeometry(0.052, 0.062, 1, 12), cloth);
    const fore = add(new THREE.CylinderGeometry(0.046, 0.056, 1, 12), plate2);
    const elbow = add(new THREE.SphereGeometry(0.058, 12, 10), plate2);
    const hand = add(new THREE.BoxGeometry(0.075, 0.1, 0.07), blackMat);
    return { S, sode, upper, fore, elbow, hand, side };
  };
  const arms = [arm(1), arm(-1)];

  // katana
  const kat = new THREE.Group(); body.add(kat);
  { const bl = new THREE.BoxGeometry(0.028, 0.74, 0.006, 1, 24, 1); const p = bl.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.37; const w = 1 - 0.55 * smooth(0.62, 0.74, y); p.setX(i, p.getX(i) * w + 0.06 * (y / 0.74) ** 2); if (y > 0.73) p.setX(i, p.getX(i) * 0.2); }
    bl.translate(0, 0.37 + 0.012, 0); bl.computeVertexNormals();
    add(bl, steelMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], kat);
    add(new THREE.CylinderGeometry(0.042, 0.042, 0.008, 20), goldMat, [0, 0, 0], [0, 0, 0], [1, 1, 0.75], kat); // tsuba
    add(new THREE.CylinderGeometry(0.016, 0.014, 0.27, 10), new THREE.MeshStandardMaterial({ color: fem ? 0x2a0508 : 0x0b0b0e, roughness: 0.8 }), [0, -0.135, 0], [0, 0, 0], [1, 1, 0.8], kat);
    add(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 10), goldMat, [0, -0.272, 0], [0, 0, 0], [1, 1, 0.8], kat);
  }
  return { root, body, arms, kat, hair, head, fem, s };
}
const A = 0.30, B = 0.27; // upper / fore arm lengths
function poseSamurai(sm, grip, dir, edgeRoll = 0, breathe = 0) {
  // grip: tsuba position, dir: blade direction (both body-local, unscaled body units)
  const D = dir.clone().normalize();
  sm.kat.position.copy(grip);
  sm.kat.quaternion.setFromUnitVectors(V(0, 1, 0), D);
  sm.kat.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), edgeRoll));
  const hands = [grip.clone().addScaledVector(D, -0.055), grip.clone().addScaledVector(D, -0.205)];
  sm.arms.forEach((a, i) => {
    const S = a.S.clone().add(V(0, breathe, 0)), Hh = hands[i];
    const d = Hh.clone().sub(S); let L = d.length(); L = Math.min(L, A + B - 0.005); d.normalize();
    const x = (A * A - B * B + L * L) / (2 * L), h = Math.sqrt(Math.max(0, A * A - x * x));
    const pole = V(a.side * 0.9, -0.6, 0.35); pole.addScaledVector(d, -pole.dot(d)).normalize();
    const E = S.clone().addScaledVector(d, x).addScaledVector(pole, h);
    const Hn = S.clone().addScaledVector(d, L);
    place(a.upper, S, E); place(a.fore, E, Hn); a.elbow.position.copy(E);
    a.hand.position.copy(Hn); a.hand.quaternion.copy(sm.kat.quaternion);
    a.sode.position.set(S.x + a.side * 0.05, S.y + 0.02, S.z);
    const ue = E.clone().sub(S).normalize();
    a.sode.rotation.set(-Math.max(0, -ue.z) * 0.25, 0, 0);
  });
}
const male = makeSamurai(false), fem = makeSamurai(true);
male.root.position.set(-0.52, 0, 0.05); male.root.rotation.y = -0.06;
fem.root.position.set(0.5, 0, -0.08); fem.root.rotation.y = 0.1;
scene.add(male.root, fem.root);

// rain drips falling from blade tips and armour edges near the heroes
const dripGeo = new THREE.BufferGeometry(); const DRIPS = 60;
dripGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DRIPS * 6), 3));
const drips = new THREE.LineSegments(dripGeo, new THREE.LineBasicMaterial({ color: 0x9fb3cc, transparent: true, opacity: 0.55 }));
drips.frustumCulled = false; scene.add(drips);

// ------------------------------------------------------------------ the horde
const skin = 0x26302a, iron = 0x1b1c1f, rust = 0x2c211b, bone = 0x7d7461, leather = 0x1e1712;
function orcParts(variant, r) {
  const P = [];
  const S = (p, s, c, rot = [0, 0, 0], seg = [9, 7]) => P.push({ g: new THREE.SphereGeometry(1, seg[0], seg[1]), m: M4(p, rot, s), c });
  const C = (a, b, r0, r1, c, seg = 7) => { const q = between(V(...a), V(...b), r0, r1, seg); P.push({ ...q, c }); };
  const Bx = (p, s, c, rot = [0, 0, 0]) => P.push({ g: new THREE.BoxGeometry(1, 1, 1), m: M4(p, rot, s), c });
  const Cn = (p, rad, h, c, rot = [0, 0, 0]) => P.push({ g: new THREE.ConeGeometry(rad, h, 6), m: M4(p, rot), c });
  C([-0.26, 1.1, 0], [-0.34, 0.05, -0.1], 0.17, 0.13, skin); C([0.26, 1.1, 0], [0.34, 0.05, 0.14], 0.17, 0.13, skin);
  Bx([-0.34, 0.06, 0.0], [0.24, 0.12, 0.38], leather); Bx([0.34, 0.06, 0.24], [0.24, 0.12, 0.38], leather);
  C([0, 0.85, 0], [0, 1.25, 0], 0.42, 0.36, rust, 9);
  S([0, 1.7, 0.08], [0.56, 0.6, 0.44], skin, [0.3, 0, 0]);
  S([0, 1.68, 0.2], [0.5, 0.42, 0.33], iron, [0.35, 0, 0]); // chest plate
  S([0, 2.12, 0.36], [0.2, 0.22, 0.22], skin);
  Bx([0, 2.02, 0.48], [0.26, 0.12, 0.16], skin, [0.2, 0, 0]);
  Cn([-0.09, 2.08, 0.57], 0.025, 0.12, bone); Cn([0.09, 2.08, 0.57], 0.025, 0.12, bone);
  if (r() < 0.6) { S([0, 2.2, 0.34], [0.23, 0.17, 0.24], iron); Cn([0, 2.42, 0.32], 0.05, 0.28, iron); }
  [-1, 1].forEach((sd) => {
    S([sd * 0.56, 1.98, 0.02], [0.3, 0.22, 0.3], iron);
    Cn([sd * 0.66, 2.2, 0.02], 0.05, 0.25, iron, [0, 0, -sd * 0.5]); Cn([sd * 0.52, 2.22, -0.08], 0.05, 0.22, iron, [0, 0, -sd * 0.2]);
  });
  const hR = [0.68, 1.15, 0.32], hL = [-0.66, 1.25, 0.34];
  C([0.56, 1.92, 0], hR, 0.14, 0.11, skin); C([-0.56, 1.92, 0], hL, 0.14, 0.11, skin);
  S(hR, [0.12, 0.12, 0.12], skin); S(hL, [0.12, 0.12, 0.12], skin);
  if (variant === 0) { // great axe held upright
    C([0.7, 0.4, 0.34], [0.7, 3.2, 0.3], 0.04, 0.035, leather, 5);
    Bx([0.92, 2.85, 0.3], [0.42, 0.62, 0.04], iron); Bx([0.48, 2.85, 0.3], [0.2, 0.42, 0.04], iron);
  } else if (variant === 1) { // tower shield + cleaver
    P.push({ g: new THREE.CylinderGeometry(0.5, 0.5, 0.06, 10), m: M4([-0.62, 1.45, 0.55], [Math.PI / 2, 0, 0], [1, 1, 1.25]), c: iron });
    Cn([-0.62, 1.45, 0.61], 0.09, 0.14, bone, [Math.PI / 2, 0, 0]);
    Bx([0.72, 1.75, 0.34], [0.16, 1.05, 0.04], iron, [0.2, 0, 0]);
  } else { // pike with jagged head
    C([0.68, -0.2, 0.2], [0.75, 4.4, 0.45], 0.035, 0.03, leather, 5);
    Cn([0.76, 4.65, 0.47], 0.07, 0.5, iron); Bx([0.76, 4.35, 0.46], [0.36, 0.06, 0.04], iron);
  }
  return merge(P);
}
function orcLow(variant) {
  const P = [];
  P.push({ g: new THREE.BoxGeometry(0.9, 1.3, 0.6), m: M4([0, 1.55, 0.05], [0.3, 0, 0]), c: skin });
  P.push({ g: new THREE.BoxGeometry(0.55, 1.0, 0.5), m: M4([0, 0.5, 0]), c: leather });
  P.push({ g: new THREE.BoxGeometry(1.35, 0.35, 0.55), m: M4([0, 2.0, 0]), c: iron });
  P.push({ g: new THREE.BoxGeometry(0.34, 0.36, 0.38), m: M4([0, 2.2, 0.3]), c: skin });
  if (variant === 0) { P.push({ g: new THREE.BoxGeometry(0.07, 2.8, 0.07), m: M4([0.7, 1.8, 0.3]), c: leather }); P.push({ g: new THREE.BoxGeometry(0.6, 0.6, 0.05), m: M4([0.85, 2.85, 0.3]), c: iron }); }
  else if (variant === 1) P.push({ g: new THREE.BoxGeometry(0.9, 1.1, 0.07), m: M4([-0.55, 1.45, 0.5]), c: iron });
  else P.push({ g: new THREE.BoxGeometry(0.06, 4.6, 0.06), m: M4([0.72, 2.1, 0.32], [0.05, 0, 0]), c: leather });
  return merge(P);
}
const orcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.9 });
const R = rng(1337);
const army = []; // {x,z,rot,scale,tStart,lane,variant,lod,idx}
// formation: regiments separated by lanes, front line ~70 m away, depth to the horizon
for (let row = 0; row < 150; row++) {
  const z = -60 - row * 2.9 - (row > 18 ? (row - 18) * 0.6 : 0);
  const width = 120 + row * 4.5;
  const sp = row < 20 ? 2.15 : 2.6 + row * 0.01;
  for (let x = -width; x <= width; x += sp) {
    const reg = Math.floor((x + 1000) / 26);
    if (((x + 1000) % 26) < 2.2 && row > 1) continue; // lanes between regiments
    if (R() < 0.06) continue;
    const jx = x + (R() - 0.5) * sp * 0.6, jz = z + (R() - 0.5) * 1.1;
    const lod = row < 22 && Math.abs(jx) < 150 ? 0 : 1;
    army.push({ x: jx, z: jz, rot: (R() - 0.5) * 0.25 - jx * 0.0012, scale: 1.2 + R() * 0.35, tStart: 9.0 + row * 0.045 + R() * 0.35 + (reg % 3) * 0.08, variant: R() < 0.45 ? 0 : R() < 0.55 ? 1 : 2, lod, ph: R() * 6.28, spd: 6.4 + R() * 1.6 });
  }
}
const groups = {};
army.forEach((o) => { const k = o.lod + "_" + o.variant; (groups[k] = groups[k] || []).push(o); });
const armyMeshes = [];
for (const k in groups) {
  const [lod, variant] = k.split("_").map(Number);
  const geo = lod === 0 ? orcParts(variant, rng(variant * 7 + 3)) : orcLow(variant);
  const im = new THREE.InstancedMesh(geo, orcMat, groups[k].length);
  im.frustumCulled = false; scene.add(im); armyMeshes.push({ im, list: groups[k] });
}
// war banners: tattered crimson cloth on tall poles, one per regiment chunk
const banners = army.filter((o, i) => o.lod === 0 ? hash2(i, 1) < 0.03 : hash2(i, 2) < 0.004);
const poleIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 6.5, 5).translate(0, 3.25, 0), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.8 }), banners.length);
const flagGeo = (() => { const g = new THREE.PlaneGeometry(1.4, 2.6, 6, 12); const p = g.attributes.position, tip = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.7; tip[i] = x / 1.4; p.setY(i, p.getY(i) - 0.15 * x * x); }
  g.translate(0.7 * 0 + 0.0, 5.0, 0); g.rotateY(Math.PI / 2); g.setAttribute("aTip", new THREE.BufferAttribute(tip, 1)); return g; })();
const flagTex = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 128); g.fillStyle = "#000";
  for (let i = 0; i < 40; i++) { const x = 40 + Math.random() * 24, y = Math.random() * 128; g.beginPath(); g.moveTo(64, y); g.lineTo(x, y + 4 + Math.random() * 10); g.lineTo(64, y + 14); g.fill(); }
  for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(Math.random() * 64, Math.random() * 128, 2 + Math.random() * 4, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); return t; })();
const flagMat = windMat({ color: 0x4a070c, roughness: 0.7, side: THREE.DoubleSide, alphaMap: flagTex, alphaTest: 0.5 }, 0.55);
const flagIM = new THREE.InstancedMesh(flagGeo, flagMat, banners.length);
poleIM.frustumCulled = flagIM.frustumCulled = false; scene.add(poleIM, flagIM);

const groundCache = new Map();
const gH = (x, z) => groundH(x, z);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpP = V(), tmpS = V();
function charge(o, t) { // distance travelled toward the heroes
  const dt = t - o.tStart; if (dt <= 0) return 0;
  const a = 2.6, tv = o.spd / a; return dt < tv ? 0.5 * a * dt * dt : 0.5 * a * tv * tv + o.spd * (dt - tv);
}
function orcMatrix(o, t) {
  const d = charge(o, t), run = clamp((t - o.tStart) * 1.2);
  const x = o.x, z = o.z + d;
  const stride = (t - o.tStart) * (2.6 + o.spd * 0.18) * Math.PI;
  const bob = run * Math.abs(Math.sin(stride + o.ph)) * 0.22 + (1 - run) * 0.02 * Math.sin(t * 1.7 + o.ph);
  tmpP.set(x, gH(x, z) + bob * o.scale, z);
  tmpE.set(run * (0.32 + 0.06 * Math.sin(stride * 2 + o.ph)), o.rot * (1 - run * 0.6) + run * 0.08 * Math.sin(stride + o.ph), run * 0.07 * Math.sin(stride + o.ph));
  tmpQ.setFromEuler(tmpE); tmpS.setScalar(o.scale);
  return tmpM.compose(tmpP, tmpQ, tmpS);
}
function updateArmy(t) {
  for (const { im, list } of armyMeshes) { list.forEach((o, i) => im.setMatrixAt(i, orcMatrix(o, t))); im.instanceMatrix.needsUpdate = true; }
  banners.forEach((o, i) => { const m = orcMatrix(o, t); poleIM.setMatrixAt(i, m); flagIM.setMatrixAt(i, m); });
  poleIM.instanceMatrix.needsUpdate = flagIM.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------ rain
function rainLayer(count, box, alpha, seed) {
  const r = rng(seed), g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 6), sd = new Float32Array(count * 6), tail = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) { const a = r(), b = r(), c = r(); for (let k = 0; k < 2; k++) { sd.set([a, b, c], (i * 2 + k) * 3); tail[i * 2 + k] = k; } }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("seed", new THREE.BufferAttribute(sd, 3)); g.setAttribute("tail", new THREE.BufferAttribute(tail, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.time, uFlash: U.flash, uCam: U.cam, uBox: { value: V(...box) }, uVel: { value: V(1.4, -13.5, 3.2) }, uA: { value: alpha } },
    vertexShader: `attribute vec3 seed; attribute float tail; uniform float uTime; uniform vec3 uCam, uBox, uVel; varying float vA; varying float vT;
      void main(){
        vec3 v = uVel * (0.85 + 0.3*fract(seed.x*71.3));
        vec3 p = seed*uBox + v*uTime;
        vec3 base = uCam - uBox*0.5;
        p = base + mod(p - base, uBox);
        p -= v * 0.045 * tail;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        float d = -mv.z;
        vA = smoothstep(0.25, 1.4, d) * (1.0 - smoothstep(uBox.z*0.3, uBox.z*0.5, d)) * (0.5 + 0.5*fract(seed.y*53.1));
        vT = tail;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uFlash, uA; varying float vA; varying float vT;
      void main(){ gl_FragColor = vec4(vec3(0.62,0.7,0.82) * (0.55 + uFlash*1.4), vA * uA * (1.0 - 0.6*vT)); }`,
  });
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; scene.add(l); return l;
}
rainLayer(45000, [60, 30, 60], 0.16, 11);
rainLayer(3500, [9, 7, 9], 0.3, 12);
rainLayer(9000, [240, 60, 240], 0.06, 13);
// splashes on the ground
{
  const n = 9000, r = rng(77), g = new THREE.BufferGeometry(), sd = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) sd[i] = r();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute("seed", new THREE.BufferAttribute(sd, 4));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.time, uFlash: U.flash, uCam: U.cam, uH: { value: H } },
    vertexShader: `attribute vec4 seed; uniform float uTime, uH; uniform vec3 uCam; varying float vP;
      void main(){ float B = 36.0; vec2 base = uCam.xz - B*0.5; vec2 xz = base + mod(seed.xy*B - base, B);
        float ph = fract(uTime*(2.2+seed.z) + seed.w); vP = ph;
        vec4 mv = modelViewMatrix * vec4(xz.x, 0.02, xz.y, 1.0);
        gl_PointSize = (ph < 0.14 ? (2.0 + 40.0*ph) : 0.0) * uH / 1080.0 * 6.0 / max(1.0, -mv.z);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uFlash; varying float vP; void main(){ vec2 c = gl_PointCoord*2.0-1.0; float r = length(c);
      float ring = smoothstep(0.65,0.9,r)*smoothstep(1.0,0.9,r); gl_FragColor = vec4(vec3(0.6,0.68,0.8)*(0.6+uFlash*2.5), ring*(1.0-vP/0.14)*0.35); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p);
}
// low ground mist sheets drifting over the battlefield
{
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); const id = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const a = (x / 256) * Math.PI * 2, b = (y / 256) * Math.PI * 2;
    const v = fbm(Math.cos(a) * 1.5 + 5, Math.sin(a) * 1.5 + Math.cos(b) * 1.5, 5) * fbm(Math.sin(b) * 1.5 + 9, Math.cos(b) * 1.2 + 3, 4);
    const k = (y * 256 + x) * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = 255; id.data[k + 3] = 255 * smooth(0.12, 0.45, v); }
  g.putImageData(id, 0, 0); const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mist = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
    uniforms: { map: { value: tex }, uTime: U.time, uFlash: U.flash, uCam: U.cam },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D map; uniform float uTime, uFlash; uniform vec3 uCam; varying vec2 vUv; varying vec3 vW;
      void main(){ float a = texture2D(map, vW.xz/90.0 + vec2(uTime*0.012, uTime*0.03)).a * texture2D(map, vW.xz/37.0 - vec2(uTime*0.02, -uTime*0.04)).a;
        float d = distance(vW, uCam); a *= smoothstep(4.0, 22.0, d) * (1.0 - smoothstep(380.0, 700.0, d));
        gl_FragColor = vec4(vec3(0.2,0.23,0.28)*(1.0+uFlash*0.8), a*0.32); }` });
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), mist); m.position.y = 0.6 + i * 1.3; m.renderOrder = 2; scene.add(m); }
}

// ------------------------------------------------------------------ lightning
const EVENTS = [
  { t: 1.55, pos: [-210, -520], strokes: [0, 0.07, 0.17], amp: 0.55 },
  { t: 4.9, pos: [55, -300], strokes: [0, 0.06, 0.14, 0.33], amp: 1.0 },
  { t: 7.15, pos: [-120, -380], strokes: [0, 0.05], amp: 0.45 },
  { t: 9.25, pos: [-35, -240], strokes: [0, 0.08, 0.2], amp: 0.95 },
  { t: 11.9, pos: [15, -190], strokes: [0, 0.05, 0.11, 0.2, 0.38], amp: 1.7 },
  { t: 14.42, pos: [120, -330], strokes: [0, 0.06, 0.15], amp: 1.05 },
];
function boltGeo(top, bottom, r, depth = 0) {
  const pts = [top, bottom];
  let segs = [[top, bottom]];
  for (let it = 0; it < 7; it++) {
    const next = []; const off = top.distanceTo(bottom) * 0.18 / Math.pow(1.75, it);
    for (const [a, b] of segs) {
      const m = a.clone().lerp(b, 0.5).add(V((r() - 0.5) * 2 * off, (r() - 0.5) * off * 0.4, (r() - 0.5) * 2 * off));
      next.push([a, m], [m, b]);
      if (depth < 1 && it > 1 && it < 5 && r() < 0.18) { const dir = b.clone().sub(a); const e = m.clone().add(dir.multiplyScalar(2.5 + r() * 3)).add(V((r() - 0.5) * off * 6, -off * 2, (r() - 0.5) * off * 4)); next.branch = next.branch || []; next.branch.push([m, e]); }
    }
    segs = next; if (next.branch) segs.branches = (segs.branches || []).concat(next.branch);
  }
  const parts = segs.map(([a, b]) => { const q = between(a, b, depth ? 0.5 : 1.1, depth ? 0.5 : 1.1, 4); return { ...q, c: 0xffffff }; });
  let geo = merge(parts);
  return { geo, branches: segs.branches || [] };
}
const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 5.4, 9.0), fog: false, transparent: true, toneMapped: true });
EVENTS.forEach((e, i) => {
  const r = rng(900 + i), [x, z] = e.pos;
  const top = V(x + (r() - 0.5) * 80, 260, z - 40), bot = V(x, gH(x, z), z);
  const { geo, branches } = boltGeo(top, bot, r);
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(geo, boltMat));
  branches.slice(0, 10).forEach((bb) => { const sub = boltGeo(bb[0], bb[1], r, 1); grp.add(new THREE.Mesh(sub.geo, boltMat)); });
  grp.visible = false; scene.add(grp); e.mesh = grp; e.dir = V(x, 120, z).normalize();
});
function flashAt(t) { // returns {total, dominant event, boltVisible}
  let total = 0, best = null, bestV = 0;
  for (const e of EVENTS) {
    let v = 0; const dt = t - e.t;
    if (dt >= -0.01) { for (const s of e.strokes) { const d = dt - s; if (d >= 0) v += Math.exp(-d * 22) + 0.25 * Math.exp(-d * 4); } v += 0.05 * Math.exp(-Math.max(0, dt) * 1.5) * (dt >= 0 ? 1 : 0); }
    v *= e.amp; total += v; if (v > bestV) { bestV = v; best = e; }
    e.mesh.visible = dt >= 0 && dt < e.strokes[e.strokes.length - 1] + 0.09;
    if (e.mesh.visible) { let on = 0; for (const s of e.strokes) { const d = dt - s; if (d >= 0) on = Math.max(on, Math.exp(-d * 30)); } boltMat.opacity = clamp(0.25 + on); }
  }
  return { total, best };
}

// ------------------------------------------------------------------ camera
const DEG = Math.PI / 180;
// shot A (0-12s): one continuous move — push in from behind, orbit, settle into a low-angle hero close-up
const KA = [
  [0, [0, 46, 8.6, 0, 2.6, -60, 38]],
  [3, [4, 22, 5.0, 0, 2.0, -40, 37]],
  [6, [38, 8.0, 2.2, 0, 1.6, -8, 36]],
  [9, [56, 3.3, 1.0, -0.7, 2.4, -4.2, 40]],
  [12, [46, 2.3, 0.6, -1.0, 3.0, -4.5, 42]],
];
// shot B (12-15s): flash-cut behind the pair, pull back and rise to reveal the charge
function cameraAt(t) {
  if (t < 11.92) {
    const [th, Rr, h, tx, ty, tz, fov] = cr(KA, t);
    return { pos: V(Math.sin(th * DEG) * Rr, h, Math.cos(th * DEG) * Rr), tgt: V(tx, ty, tz), fov };
  }
  const k = clamp((t - 11.92) / 3.08), e = 1 - Math.pow(1 - k, 2.4);
  const pos = V(lerp(0.75, 0.0, e), lerp(1.05, 5.6, e), lerp(2.9, 19.5, e));
  const tgt = V(lerp(0.05, 0, e), lerp(1.7, 2.4, e), lerp(-30, -60, e));
  return { pos, tgt, fov: lerp(33, 40, e) };
}

// ------------------------------------------------------------------ post
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 0 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.5, 0.9); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uFrame: { value: 0 }, uWhite: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFrame, uWhite; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uFrame*0.137)*43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c,c);
      vec2 off = c * r2 * 0.006;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      // keep crimson, pull everything else toward cold steel
      float red = smoothstep(0.03, 0.12, col.r - max(col.g, col.b));
      vec3 cold = mix(vec3(l), col, 0.62) * vec3(0.9, 1.0, 1.12);
      col = mix(cold, col * vec3(1.08, 0.92, 0.92), red);
      // split-tone: blue-black shadows, neutral-cool highlights
      col = mix(col, col + vec3(-0.006, 0.004, 0.018), 1.0 - smoothstep(0.0, 0.35, l));
      col = clamp(col, 0.0, 1.0); col = col*col*(3.0-2.0*col)*0.35 + col*0.65; // gentle S-curve
      col *= 1.0 - smoothstep(0.18, 0.72, r2*1.9) * 0.62; // vignette
      col = mix(col, vec3(1.0), uWhite);
      col += (h(vUv*uRes) - 0.5) * 0.035; // film grain
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(grade);

// ------------------------------------------------------------------ per-time state
function setState(t) {
  U.time.value = t;
  // characters: subtle breathing, then the beats of the close-up
  const br = Math.sin(t * 1.6) * 0.004;
  const tighten = smooth(8.9, 9.6, t) - 0.35 * smooth(9.6, 10.2, t);
  const mGrip = V(0.03, 1.13 - tighten * 0.01, -0.36 - tighten * 0.015);
  const mDir = V(0.02, 0.5 + tighten * 0.06, -1);
  poseSamurai(male, mGrip, mDir, 0.0, br);
  male.arms.forEach((a) => a.hand.scale.set(1 + tighten * 0.08, 1 - tighten * 0.05, 1 + tighten * 0.08));
  const raise = smooth(9.7, 11.3, t);
  const fGrip = V(lerp(0.06, 0.02, raise), lerp(1.04, 1.24, raise), lerp(-0.3, -0.34, raise));
  const fDir = V(lerp(0.16, 0.04, raise), lerp(-0.42, 0.95, raise), -1);
  poseSamurai(fem, fGrip, fDir, lerp(0.3, 0.0, raise), Math.sin(t * 1.6 + 1) * 0.004);
  male.head.rotation.set(-0.04 + 0.03 * smooth(9.2, 10.5, t), 0.04, 0); fem.head.rotation.set(-0.06 + 0.04 * raise, -0.05, 0);
  U.gust.value = 0.8 + 0.3 * Math.sin(t * 0.9) + 0.25 * smooth(9, 12, t);

  // water dripping off blade tips and armour
  const pa = dripGeo.attributes.position; const r = rng(5);
  for (let i = 0; i < DRIPS; i++) {
    const sm = i % 2 ? fem : male; const src = V();
    if (i < 16) { sm.kat.localToWorld(src.set(0.06, 0.74, 0)); } else { sm.body.localToWorld(src.set((r() - 0.5) * 0.5, 0.75 + r() * 0.3, (r() - 0.5) * 0.3)); }
    const per = 0.45 + r() * 0.5, ph = ((t + r() * per) % per) / per, fall = 0.5 * 9.8 * (ph * per) ** 2;
    pa.setXYZ(i * 2, src.x, src.y - fall, src.z); pa.setXYZ(i * 2 + 1, src.x, src.y - fall - 0.025 - ph * 0.08, src.z);
  }
  pa.needsUpdate = true;

  updateArmy(t);
  // lightning
  const { total, best } = flashAt(t);
  const f = clamp(total, 0, 2.6);
  U.flash.value = f * 0.55;
  if (best) {
    sky.material.uniforms.uBolt.value.copy(best.dir);
    bolt.position.set(best.pos[0] * 0.06, 45, best.pos[1] * 0.06); bolt.target.position.set(0, 0, 0);
    boltFar.position.set(best.pos[0], 500, best.pos[1] - 150); boltFar.target.position.set(best.pos[0] * 0.3, 0, best.pos[1] + 200);
  }
  bolt.intensity = f * 3.2; boltFar.intensity = f * 2.2;
  hemi.intensity = 0.55 + f * 0.8;
  scene.environmentIntensity = 0.35 + f * 1.2;
  scene.fog.color.copy(FOG).multiplyScalar(1 + f * 1.3);
  scene.background.copy(scene.fog.color);
  grade.uniforms.uWhite.value = clamp((total - 1.6) * 0.45, 0, 0.85) * (t > 11.5 && t < 12.6 ? 1 : 0.4);

  const c = cameraAt(t);
  camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.tgt);
  U.cam.value.copy(c.pos);
}

const HALTON = [[0.5, 0.333], [0.25, 0.667], [0.75, 0.111], [0.125, 0.444], [0.625, 0.778], [0.375, 0.222], [0.875, 0.556], [0.0625, 0.889]];
window.renderFrame = (t) => {
  const frame = Math.round(t * FPS);
  grade.uniforms.uFrame.value = frame;
  const cut = 11.92; // never blur across the cut
  for (let i = 0; i < MB; i++) {
    let ts = MB === 1 ? t : t + ((i + 0.5) / MB - 0.5) * SHUTTER;
    if (t < cut && ts >= cut) ts = cut - 0.001; if (t >= cut && ts < cut) ts = cut;
    setState(ts);
    if (MB > 1) camera.setViewOffset(W, H, HALTON[i % 8][0] - 0.5, HALTON[i % 8][1] - 0.5, W, H); else camera.clearViewOffset();
    composer.render();
    ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(glCanvas, 0, 0);
  }
  ctx.globalAlpha = 1;
  return true;
};
window.ready = true;
const tq = Q.get("t"); if (tq !== null) window.renderFrame(+tq);
