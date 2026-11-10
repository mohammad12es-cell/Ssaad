// Fire, smoke, sparks. Everything is analytic in time (particles carry spawn time + initial state and
// are evaluated on the GPU), so any frame can be rendered independently and deterministically.
import * as THREE from "three";
import { V, clamp, lerp, smooth, rng, hash2 } from "./util.js";
import { G, NOISE, FIRE_PARS, FIRE } from "./glsl.js";
import { groundH } from "./terrain.js";
import { FIREBALLS, fireballPos, WAVE, RING, WALL, waveFront, waveHalfWidth, waveHeight, ringRadius, ringHeight, wallHeight } from "./timeline.js";

const QUAD = (() => { const g = new THREE.InstancedBufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; })();
const COMMON_U = () => ({ uTime: G.time, uFlash: G.flash, uFogD: G.fogDensity, uFogC: G.fogColor, uFirePosW: FIRE.posW, uFireCol: FIRE.col, uRes: { value: 2160 } });

// ------------------------------------------------------------------ analytic particles
const PV = /* glsl */ `
${NOISE}
${FIRE_PARS}
attribute vec3 iP0, iV0; attribute vec2 iT, iSize; attribute vec4 iPar; attribute vec2 iSeedHue;
uniform float uTime, uRes;
varying vec2 vUv; varying float vK, vSeed, vHue, vInt, vDist; varying vec3 vFire; varying float vAge;
vec3 posAt(float age){
  float dr = max(iPar.x, 0.001);
  vec3 p = iP0 + iV0 * (1.0 - exp(-dr * age)) / dr + vec3(0.0, 0.5 * iPar.y * age * age, 0.0);
  p += vec3(0.9, 0.0, 1.6) * age * age * 0.18 * iPar.z;                         // storm wind shears rising fire/smoke
  p += iPar.z * age * vec3(sin(age * 2.3 + iSeedHue.x * 40.0), 0.3 * sin(age * 1.7 + iSeedHue.x * 13.0), cos(age * 2.1 + iSeedHue.x * 23.0));
  return p;
}`;
function particleMaterial(kind) {
  const vs = PV + /* glsl */ `
  void main(){
    float age = uTime - iT.x; float k = age / iT.y;
    if (k < 0.0 || k > 1.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
    vec3 p = posAt(age);
    float sz = mix(iSize.x, iSize.y, ${kind === "spark" ? "1.0" : "sqrt(k)"});
    vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 wp;
    ${kind === "flame" ? `
      vec3 toC = normalize(cameraPosition - p); vec3 r = normalize(cross(vec3(0.0,1.0,0.0), toC) + 1e-4); vec3 u = normalize(cross(toC, r));
      wp = p + r * position.x * sz + u * (position.y * 1.35 + 1.35) * sz;` : kind === "smoke" ? `
      float a = iSeedHue.x * 6.283 + age * (fract(iSeedHue.x * 7.0) - 0.5) * 0.6;
      vec2 c = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
      wp = p + camR * c.x * sz + camU * c.y * sz;` : `
      vec3 p2 = posAt(max(0.0, age - 0.045));
      vec4 a = viewMatrix * vec4(p, 1.0), b = viewMatrix * vec4(p2, 1.0);
      vec3 dir = a.xyz - b.xyz; float L = length(dir) + 1e-4; dir /= L;
      vec3 side = normalize(cross(dir, vec3(0.0, 0.0, 1.0)) + 1e-4);
      float w = sz * max(1.0, -a.z) / uRes * 2.2;
      vec3 vp = mix(b.xyz, a.xyz, position.y * 0.5 + 0.5) + side * position.x * w;
      wp = (inverse(viewMatrix) * vec4(vp, 1.0)).xyz;`}
    vUv = position.xy; vK = k; vSeed = iSeedHue.x; vHue = iSeedHue.y; vInt = iPar.w; vAge = age;
    vDist = length(cameraPosition - wp);
    vFire = ${kind === "smoke" ? "fireAtW(p)" : "vec3(0.0)"};
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;
  const fs = NOISE + /* glsl */ `
  uniform float uTime, uFlash, uFogD; uniform vec3 uFogC;
  varying vec2 vUv; varying float vK, vSeed, vHue, vInt, vDist; varying vec3 vFire; varying float vAge;
  void main(){
    float fog = exp(-uFogD * vDist);
    ${kind === "flame" ? `
      vec2 uv = vUv;
      float n = fbm3(vec3(uv.x * 1.7, uv.y * 1.1 - vAge * 2.8, vSeed * 17.0 + vAge * 0.9));
      float n2 = fbm2(vec3(uv * 3.3 + vec2(0.0, -vAge * 5.0), vSeed * 5.0));
      float w = 1.0 + (uv.y + 1.0) * 0.75;
      float r = length(vec2(uv.x * w, (uv.y + 0.35) * 0.72));
      float d = 1.0 - r + (n - 0.5) * 0.95 + (n2 - 0.5) * 0.35;
      float heat = (1.0 - vK) * (1.0 - vK * 0.4);
      float T = clamp(d * 1.5, 0.0, 1.0) * heat;
      vec3 col = mix(fireRamp(T), spiritRamp(T), vHue) * (0.1 + 1.7 * T * T * T) * vInt;
      float win = (1.0 - smoothstep(0.6, 1.0, abs(uv.x))) * smoothstep(-1.0, -0.45, uv.y) * (1.0 - smoothstep(0.7, 1.0, uv.y));
      float a = smoothstep(0.0, 0.35, d) * smoothstep(0.0, 0.08, vK + 0.02) * win;
      gl_FragColor = vec4(col * fog, a);` : kind === "smoke" ? `
      float n = fbm3(vec3(vUv * 1.4, vSeed * 9.0 + vAge * 0.35));
      float d = 1.0 - length(vUv) + (n - 0.5) * 1.0;
      float a = smoothstep(0.0, 0.7, d) * (1.0 - smoothstep(0.55, 1.0, length(vUv))) * smoothstep(0.0, 0.15, vK) * (1.0 - smoothstep(0.55, 1.0, vK)) * vInt;
      vec3 col = mix(vec3(0.018, 0.019, 0.022), vec3(0.07, 0.072, 0.078), n) * (1.0 + uFlash * 3.0) + min(vFire, vec3(4.0)) * 0.025 * (0.4 + n);
      col = mix(col, uFogC * (1.0 + uFlash * 1.3), 1.0 - fog);
      gl_FragColor = vec4(col, a * 0.85);` : `
      float a = (1.0 - abs(vUv.x)) * (1.0 - smoothstep(0.6, 1.0, abs(vUv.y)));
      float T = (1.0 - vK) * 0.85 + 0.15;
      vec3 col = mix(fireRamp(T), spiritRamp(T), vHue) * (0.5 + 2.2 * T) * vInt;
      gl_FragColor = vec4(col * fog, a * (1.0 - vK * 0.5));`}
  }`;
  return new THREE.ShaderMaterial({ uniforms: COMMON_U(), vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false,
    blending: kind === "smoke" ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide });
}
class Particles {
  constructor(kind) { this.kind = kind; this.data = []; }
  emit(t0, life, p0, v0, size0, size1, drag = 1, buoy = 0, turb = 0, inten = 1, seed = 0, hue = 0) { this.data.push([p0[0], p0[1], p0[2], v0[0], v0[1], v0[2], t0, life, size0, size1, drag, buoy, turb, inten, seed, hue]); }
  build(scene, order) {
    const n = this.data.length, g = QUAD.clone(); g.instanceCount = n;
    const mk = (name, sz, off) => { const a = new Float32Array(n * sz); this.data.forEach((d, i) => { for (let k = 0; k < sz; k++) a[i * sz + k] = d[off + k]; }); g.setAttribute(name, new THREE.InstancedBufferAttribute(a, sz)); };
    mk("iP0", 3, 0); mk("iV0", 3, 3); mk("iT", 2, 6); mk("iSize", 2, 8); mk("iPar", 4, 10); mk("iSeedHue", 2, 14);
    this.mesh = new THREE.Mesh(g, particleMaterial(this.kind)); this.mesh.name = 'p_' + this.kind; this.mesh.frustumCulled = false; this.mesh.renderOrder = order; scene.add(this.mesh);
    return this;
  }
}

// ------------------------------------------------------------------ CPU-placed flame sprites (torches, burning bodies, fireball cores, blades)
export class FlameSprites {
  constructor(scene, max, hue = 0) {
    const g = QUAD.clone(); this.max = max; g.instanceCount = 0;
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.par = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("iPos", this.pos); g.setAttribute("iPar", this.par);
    const m = new THREE.ShaderMaterial({ uniforms: { ...COMMON_U(), uHue: { value: hue } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec3 iPos, iPar; varying vec2 vUv; varying float vSeed, vInt, vDist;
        void main(){ vec3 toC = normalize(cameraPosition - iPos); vec3 r = normalize(cross(vec3(0.0,1.0,0.0), toC) + 1e-4); vec3 u = normalize(cross(toC, r));
          vec3 wp = iPos + r * position.x * iPar.x + u * (position.y * 1.5 + 1.5) * iPar.x;
          vUv = position.xy; vSeed = iPar.z; vInt = iPar.y; vDist = length(cameraPosition - wp); gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
      fragmentShader: NOISE + `uniform float uTime, uFogD, uHue; varying vec2 vUv; varying float vSeed, vInt, vDist;
        void main(){ vec2 uv = vUv; float t = uTime;
          float n = fbm3(vec3(uv.x * 1.8 + vSeed * 7.0, uv.y * 1.2 - t * 3.2, vSeed * 13.0 + t * 0.7));
          float n2 = fbm2(vec3(uv * 3.6 + vec2(vSeed, -t * 6.0), vSeed * 3.0 + t));
          float w = 1.0 + (uv.y + 1.0) * 0.9; float r = length(vec2(uv.x * w, (uv.y + 0.45) * 0.68));
          float d = 1.0 - r + (n - 0.5) * 1.0 + (n2 - 0.5) * 0.4; float T = clamp(d * 1.45, 0.0, 1.0);
          vec3 col = mix(fireRamp(T), spiritRamp(T), uHue) * (0.1 + 1.8 * T * T * T) * vInt;
          float win = (1.0 - smoothstep(0.6, 1.0, abs(uv.x))) * smoothstep(-1.0, -0.45, uv.y) * (1.0 - smoothstep(0.7, 1.0, uv.y));
          gl_FragColor = vec4(col * exp(-uFogD * vDist), smoothstep(0.0, 0.3, d) * win); }` });
    this.mesh = new THREE.Mesh(g, m); this.mesh.name = 'sprite'; this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; scene.add(this.mesh); this.g = g;
  }
  set(list) { const n = Math.min(list.length, this.max);
    for (let i = 0; i < n; i++) { const f = list[i]; this.pos.setXYZ(i, f.p.x, f.p.y, f.p.z); this.par.setXYZ(i, f.s, f.i, f.seed ?? hash2(i, 5.3)); }
    this.g.instanceCount = n; this.pos.needsUpdate = this.par.needsUpdate = true; }
}

// ------------------------------------------------------------------ fire sheets: the wave, the ring, the wall
function sheetMaterial(shape, seed) {
  return new THREE.ShaderMaterial({
    uniforms: { ...COMMON_U(), uSeed: { value: seed }, uA: { value: new THREE.Vector4() }, uB: { value: new THREE.Vector4() }, uInt: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform vec4 uA, uB; uniform float uTime; varying vec2 vUv; varying float vLen, vH, vDist, vEdge;
      float gh(vec2 p){ return 9.0 * smoothstep(45.0, 260.0, -p.y); }
      void main(){
        float u = position.x, v = position.y; vec3 wp; float H;
        ${shape === "wave" ? `
          // uA = (originX, originZ, frontDist, height)  uB = (halfWidth, layerOffset, dirX, 0)
          float lat = (u * 2.0 - 1.0) * uB.x;
          float along = uA.z - uB.y - pow(abs(u * 2.0 - 1.0), 2.0) * uB.x * 0.32;
          vec2 xz = vec2(uA.x + uB.z * along + lat, uA.y - along);
          H = uA.w * (1.0 - 0.55 * pow(abs(u * 2.0 - 1.0), 2.0));
          wp = vec3(xz.x, gh(xz) + v * H * 1.7 - 0.45, xz.y); vLen = uB.x * 2.0; vEdge = 1.0 - pow(abs(u * 2.0 - 1.0), 6.0);` :
        shape === "ring" ? `
          // uA = (cx, cz, radius, height)
          float a = u * 6.2831853; vec2 xz = uA.xy + vec2(cos(a), sin(a)) * uA.z;
          H = uA.w * (0.85 + 0.15 * sin(a * 7.0 + uTime));
          wp = vec3(xz.x, gh(xz) + v * H * 1.7 - 0.45, xz.y); vLen = 6.2831853 * uA.z; vEdge = 1.0;` : `
          // uA = (z, t0, spread, time)  uB = (surgeT, layer, x0, x1)
          float x = mix(uB.z, uB.w, u); float t0 = uA.y + abs(x) / uA.z; float age = uA.w - t0;
          float rise = age <= 0.0 ? 0.0 : (1.0 - pow(1.0 - clamp(age / 0.75, 0.0, 1.0), 3.0)) * 30.0;
          float surge = 12.0 * exp(-pow((uA.w - uB.x - 0.12) / 0.35, 2.0)) + 9.0 * smoothstep(uB.x, uB.x + 0.4, uA.w);
          H = age <= 0.0 ? 0.0 : (rise + surge) * (0.75 + 0.25 * sin(x * 0.05 + uB.y * 3.0));
          vec2 xz = vec2(x, uA.x + uB.y);
          wp = vec3(x, gh(xz) + v * H * 1.7 - 0.5, xz.y); vLen = abs(uB.w - uB.z); vEdge = smoothstep(0.0, 0.03, u) * (1.0 - smoothstep(0.97, 1.0, u));`}
        vUv = vec2(u, v); vH = H; vDist = length(cameraPosition - wp);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: NOISE + /* glsl */ `
      uniform float uTime, uSeed, uInt, uFogD; varying vec2 vUv; varying float vLen, vH, vDist, vEdge;
      void main(){
        if (vH < 0.05) discard;
        float X = vUv.x * vLen, Y = vUv.y * vH, t = uTime;
        float s = 4.0 / max(vH, 2.0);
        float tongues = fbm2(vec3(X * 0.75 * s, t * 1.1, uSeed));
        float top = mix(0.3, 1.0, tongues);
        float n = fbm3(vec3(X * 1.6 * s, Y * 0.9 * s - t * 3.0, uSeed + t * 0.25));
        float n2 = fbm2(vec3(X * 4.5 * s, Y * 2.6 * s - t * 6.0, uSeed * 2.0 + 3.0));
        float y = vUv.y * 1.7 / top;
        float d = 1.0 - y + (n - 0.5) * 0.95 + (n2 - 0.5) * 0.4;
        float T = clamp(d * 0.75, 0.0, 1.0) * (0.75 + 0.25 * n2);
        float a = smoothstep(0.0, 0.4, d) * vEdge * uInt * smoothstep(0.0, 0.06, vUv.y + 0.02);
        vec3 col = spiritRamp(T) * (0.1 + 1.4 * T * T * T);
        gl_FragColor = vec4(col * exp(-uFogD * vDist * 0.7), a);
      }`,
  });
}
function sheet(scene, shape, segs, seed) {
  const g = new THREE.PlaneGeometry(1, 1, segs, 12); g.translate(0.5, 0.5, 0);
  const m = new THREE.Mesh(g, sheetMaterial(shape, seed)); m.name = 'sheet_' + shape; m.frustumCulled = false; m.renderOrder = 7; m.visible = false; scene.add(m); return m;
}

// ------------------------------------------------------------------ sword-swing fire trail (ribbon of past blade positions)
export class SwingTrail {
  constructor(scene, n = 28) {
    this.n = n; const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3); this.uv = new THREE.BufferAttribute(new Float32Array(n * 2 * 2), 2);
    g.setAttribute("position", this.pos); g.setAttribute("uv", this.uv);
    const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...COMMON_U(), uInt: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
      fragmentShader: NOISE + `uniform float uTime, uInt; varying vec2 vUv; void main(){
        float n = fbm3(vec3(vUv.x * 6.0 - uTime * 3.0, vUv.y * 4.0, uTime * 2.0));
        float d = (1.0 - vUv.x) * (0.35 + 0.65 * vUv.y) + (n - 0.5) * 0.7; float T = clamp(d * 1.3, 0.0, 1.0);
        gl_FragColor = vec4(spiritRamp(T) * (0.25 + 2.6 * T * T * T) * uInt, smoothstep(0.0, 0.3, d) * smoothstep(0.0, 0.15, vUv.y)); }` }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; scene.add(this.mesh);
  }
  set(samples, inten) { // samples: [{base, tip}] newest first
    for (let i = 0; i < this.n; i++) { const s = samples[Math.min(i, samples.length - 1)];
      const b = s.base.clone().lerp(s.tip, 0.15);
      this.pos.setXYZ(i * 2, b.x, b.y, b.z); this.pos.setXYZ(i * 2 + 1, s.tip.x, s.tip.y, s.tip.z);
      this.uv.setXY(i * 2, i / (this.n - 1), 0); this.uv.setXY(i * 2 + 1, i / (this.n - 1), 1); }
    this.pos.needsUpdate = this.uv.needsUpdate = true; this.mesh.material.uniforms.uInt.value = inten; this.mesh.visible = inten > 0.01;
  }
}

// ------------------------------------------------------------------ everything fire, pre-emitted
export function buildFire(scene, horde, heroes) {
  const R = rng(4242);
  const flames = new Particles("flame"), smoke = new Particles("smoke"), sparks = new Particles("spark");
  const rs = (a, b) => a + (b - a) * R();
  const gy = (x, z) => groundH(x, z);
  const craters = [];
  // ---- orc catapult fireballs
  for (const f of FIREBALLS) {
    for (let ts = Math.max(-1, f.tL); ts < f.tI; ts += 1 / 110) { const p = fireballPos(f, ts); const pn = fireballPos(f, ts + 0.01); const v = pn.sub(p).multiplyScalar(100);
      flames.emit(ts, rs(0.35, 0.7), [p.x + rs(-0.4, 0.4), p.y + rs(-0.4, 0.4), p.z + rs(-0.4, 0.4)], [v.x * 0.05 + rs(-1, 1), v.y * 0.05 + rs(0, 1.5), v.z * 0.05 + rs(-1, 1)], rs(1.2, 1.8), rs(2.6, 4.2), 2, 2, 0.8, 1.0, R(), 0);
      if (R() < 0.8) smoke.emit(ts + 0.05, rs(1.4, 2.4), [p.x + rs(-0.5, 0.5), p.y, p.z + rs(-0.5, 0.5)], [rs(-2, 2), rs(0.5, 2), rs(-2, 2)], rs(1.0, 1.6), rs(5, 8), 1, 0.4, 2.2, 0.45, R());
      if (R() < 0.5) sparks.emit(ts, rs(0.4, 1.0), [p.x, p.y, p.z], [rs(-6, 6), rs(-2, 6), rs(-6, 6)], rs(1.2, 2.2), 1, 1.5, -6, 0.5, 0.8, R(), 0);
    }
    const [x, z] = f.to, y = gy(x, z) + 0.2, tI = f.tI;
    for (let i = 0; i < 90; i++) { const a = R() * 6.283, el = rs(0.15, 1.2), sp = rs(5, 16);
      flames.emit(tI + rs(0, 0.08), rs(0.45, 1.1), [x, y + 0.3, z], [Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp * 0.8 + 2, Math.sin(a) * Math.cos(el) * sp], rs(1.5, 2.5), rs(4, 7), 3, 3, 1.2, 1.3, R(), 0); }
    for (let i = 0; i < 180; i++) { const a = R() * 6.283, el = rs(0.3, 1.4), sp = rs(9, 30);
      sparks.emit(tI + rs(0, 0.1), rs(0.6, 1.8), [x, y + 0.4, z], [Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp, Math.sin(a) * Math.cos(el) * sp], rs(1.5, 3), 1, 0.6, -9.8, 0.2, 1.2, R(), 0); }
    for (let i = 0; i < 70; i++) { const a = R() * 6.283, sp = rs(4, 11); // flung mud
      smoke.emit(tI, rs(0.6, 1.1), [x, y + 0.3, z], [Math.cos(a) * sp, rs(4, 11), Math.sin(a) * sp], rs(0.15, 0.3), rs(0.25, 0.4), 0.5, -9.8, 0, 1.6, R()); }
    for (let i = 0; i < 18; i++) smoke.emit(tI + rs(0.05, 0.5), rs(3.5, 6), [x + rs(-1, 1), y + 1, z + rs(-1, 1)], [rs(-2, 2), rs(3, 7), rs(-2, 2)], rs(3, 5), rs(14, 22), 1.2, 0.3, 1.5, 0.9, R());
    // crater keeps burning
    craters.push({ x, z, t0: tI, r: 2.6 });
    for (let ts = tI + 0.1; ts < 15.2; ts += 1 / 26) { const a = R() * 6.283, rr = Math.sqrt(R()) * 2.0;
      flames.emit(ts, rs(0.6, 1.2), [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr], [rs(-0.3, 0.3), rs(1.5, 3), rs(-0.3, 0.3)], rs(0.6, 1.0), rs(1.2, 2.2), 1.5, 2.5, 0.6, 0.9, R(), 0);
      if (R() < 0.12) smoke.emit(ts, rs(4, 6), [x + rs(-1, 1), y + 2, z + rs(-1, 1)], [rs(-0.5, 0.5), rs(1.5, 3), rs(-0.5, 0.5)], rs(2, 3), rs(10, 16), 0.6, 0.2, 1.2, 0.8, R());
      if (R() < 0.6) sparks.emit(ts, rs(1.2, 2.5), [x + rs(-1, 1), y + 0.8, z + rs(-1, 1)], [rs(-1, 1), rs(2, 5), rs(-1, 1)], rs(1, 1.8), 1, 0.8, 0.6, 1.2, 0.9, R(), 0); }
  }
  // ---- HIS fire wave (spirit fire)
  const WX = -0.75, WZ = -1.2;
  for (let ts = WAVE.t0; ts < WAVE.t0 + 2.8; ts += 1 / 220) {
    const d = waveFront(ts), hw = waveHalfWidth(d), H = waveHeight(ts, d); if (H < 0.3) continue;
    const lat = rs(-1, 1) * hw, along = d - Math.pow(Math.abs(lat / hw), 2) * hw * 0.32 - rs(0, 2.5), x = WX + WAVE.dirX * along + lat, z = WZ - along;
    flames.emit(ts, rs(0.35, 0.75), [x, gy(x, z), z], [rs(-1, 1), rs(3, 7) * H / 6, -rs(10, 22)], rs(1.2, 2.0) * H / 6, rs(3, 5) * H / 6, 2.5, 4, 1.0, 1.4, R(), 1);
    if (R() < 0.5) sparks.emit(ts, rs(0.8, 2.0), [x, gy(x, z) + rs(0, H), z], [rs(-4, 4), rs(2, 12), -rs(10, 30)], rs(1.5, 2.6), 1, 1.0, -5, 0.8, 1.2, R(), 1);
    if (R() < 0.18) smoke.emit(ts + 0.25, rs(3, 5), [x, gy(x, z) + H, z], [rs(-1, 1), rs(3, 6), -rs(1, 4)], rs(3, 5), rs(12, 20), 1, 0.3, 1.5, 0.8, R());
    // burning trail left on the ground
    if (R() < 0.45) { const back = rs(2, Math.max(3, d - 1)), l2 = rs(-1, 1) * waveHalfWidth(back) * 0.8, x2 = WX + l2, z2 = WZ - back;
      flames.emit(ts + rs(0.1, 0.6), rs(0.8, 1.6), [x2, gy(x2, z2), z2], [rs(-0.3, 0.3), rs(1.5, 3), rs(-0.3, 0.3)], rs(0.5, 0.9), rs(1.2, 2.2), 1.5, 2, 0.5, 0.9, R(), 1); }
  }
  // the strike itself: a blast of embers off the blade
  for (let i = 0; i < 260; i++) { const a = rs(-1.3, 1.3); sparks.emit(WAVE.t0 + rs(-0.04, 0.06), rs(0.5, 1.4), [WX + rs(-0.3, 0.3), 1.0 + rs(-0.2, 0.3), WZ + 0.4], [Math.sin(a) * rs(5, 15), rs(0, 9), -Math.cos(a) * rs(10, 30)], rs(1.6, 3), 1, 1.2, -6, 0.3, 1.5, R(), 1); }
  // ---- HER ring of fire
  const RX = 0.52, RZ = -0.1;
  for (let ts = RING.t0; ts < RING.t0 + 2.4; ts += 1 / 240) {
    const r = ringRadius(ts), H = ringHeight(ts), a = R() * 6.283, rr = r - rs(0, 1.8), x = RX + Math.cos(a) * rr, z = RZ + Math.sin(a) * rr;
    flames.emit(ts, rs(0.35, 0.8), [x, gy(x, z), z], [Math.cos(a) * rs(6, 14), rs(3, 7) * H / 6, Math.sin(a) * rs(6, 14)], rs(1.0, 1.8) * H / 6, rs(2.5, 4.5) * H / 6, 2.5, 4, 1, 1.4, R(), 1);
    if (R() < 0.45) sparks.emit(ts, rs(0.8, 2.0), [x, gy(x, z) + rs(0, H), z], [Math.cos(a) * rs(8, 25), rs(2, 12), Math.sin(a) * rs(8, 25)], rs(1.5, 2.6), 1, 1.0, -5, 0.8, 1.2, R(), 1);
    if (R() < 0.15) smoke.emit(ts + 0.3, rs(3, 5), [x, gy(x, z) + H, z], [Math.cos(a) * 2, rs(3, 6), Math.sin(a) * 2], rs(3, 5), rs(12, 20), 1, 0.3, 1.5, 0.8, R());
    if (R() < 0.35 && r > 4) { const b = rs(3, r), a2 = R() * 6.283, x2 = RX + Math.cos(a2) * b, z2 = RZ + Math.sin(a2) * b;
      flames.emit(ts + rs(0.1, 0.5), rs(0.8, 1.6), [x2, gy(x2, z2), z2], [0, rs(1.5, 3), 0], rs(0.4, 0.8), rs(1.0, 2.0), 1.5, 2, 0.5, 0.85, R(), 1); }
  }
  for (let i = 0; i < 320; i++) { const a = R() * 6.283; sparks.emit(RING.t0 + rs(-0.05, 0.08), rs(0.5, 1.5), [RX + Math.cos(a) * 0.9, rs(0.6, 1.2), RZ + Math.sin(a) * 0.9], [Math.cos(a) * rs(10, 30), rs(0, 7), Math.sin(a) * rs(10, 30)], rs(1.6, 3), 1, 1.2, -6, 0.3, 1.5, R(), 1); }
  // ---- THE WALL
  for (let ts = WALL.t0; ts < 15.2; ts += 1 / 700) {
    const x = (R() < 0.75 ? rs(-1, 1) * 90 : rs(-1, 1) * 260), H = wallHeight(ts, x); if (H < 1) continue;
    const z = WALL.z + rs(-5, 5);
    flames.emit(ts, rs(0.6, 1.2), [x, gy(x, z), z], [rs(-2, 2), rs(8, 16) * H / 30, rs(-2, 2)], rs(3, 5) * H / 30, rs(8, 14) * H / 30, 2, 6, 2, 0.75, R(), 1);
    if (R() < 0.35) sparks.emit(ts, rs(1.2, 3), [x, gy(x, z) + rs(0, H * 0.7), z], [rs(-6, 6), rs(10, 30), rs(-4, 8)], rs(2, 3.5), 1, 0.7, -4, 2.5, 1.2, R(), 1);
    if (R() < 0.08) smoke.emit(ts + 0.4, rs(4, 7), [x, gy(x, z) + H * 0.9, z], [rs(-2, 2), rs(6, 12), rs(-1, 3)], rs(8, 12), rs(30, 50), 0.7, 0.4, 2.5, 0.9, R());
  }
  // ---- fallen, burning orcs: embers & smoke from where they land
  for (const o of horde.orcs) { const h = o.hit; if (!h || o.lod === 2) continue; if (hash2(o.x, o.z0) > 0.55) continue;
    const st = horde.state(o, h.t + h.land + 0.05), y = gy(st.x, st.z);
    for (let ts = h.t; ts < Math.min(15.2, h.t + 5); ts += 0.12) {
      if (R() < 0.5) sparks.emit(ts, rs(0.8, 1.8), [st.x + rs(-0.6, 0.6), y + rs(0.2, 1.2), st.z + rs(-0.6, 0.6)], [rs(-1, 1), rs(2, 5), rs(-1, 1)], rs(1.2, 2), 1, 0.8, 0.6, 1.2, 0.9, R(), 1);
      if (R() < 0.08) smoke.emit(ts, rs(3, 5), [st.x, y + 1.5, st.z], [rs(-0.5, 0.5), rs(1.5, 3), rs(-0.5, 0.5)], rs(1.5, 2.5), rs(7, 11), 0.6, 0.2, 1.2, 0.7, R()); } }
  // ---- drifting embers around the heroes once the fire starts
  for (let i = 0; i < 2600; i++) { const ts = rs(2.2, 15.2), a = R() * 6.283, rr = rs(1.5, 30);
    sparks.emit(ts, rs(2, 4), [Math.cos(a) * rr, rs(0, 3), Math.sin(a) * rr + 6], [rs(-0.5, 0.5), rs(0.6, 2), rs(0.5, 2)], rs(0.8, 1.5), 0.6, 0.5, 0.4, 1.2, 0.7, R(), ts > 9 ? 1 : 0); }

  smoke.build(scene, 3); flames.build(scene, 5); sparks.build(scene, 9);
  const counts = { flames: flames.data.length, smoke: smoke.data.length, sparks: sparks.data.length };
  flames.data = smoke.data = sparks.data = null;

  // sheets
  const waveS = [0, 1.6, 3.2].map((off, i) => Object.assign(sheet(scene, "wave", 120, 3 + i * 7.1), { off }));
  const ringS = [0, 1.3, 2.6].map((off, i) => Object.assign(sheet(scene, "ring", 260, 11 + i * 5.3), { off }));
  const wallS = [0, -4, 4, -8].map((off, i) => Object.assign(sheet(scene, "wall", 600, 21 + i * 4.7), { off }));
  // sprites
  const natural = new FlameSprites(scene, 6000, 0), spirit = new FlameSprites(scene, 600, 1);
  const trailM = new SwingTrail(scene), trailF = new SwingTrail(scene);

  function update(t, ctx) {
    // sheets
    const d = waveFront(t), wh = waveHeight(t, d);
    waveS.forEach((m) => { m.visible = wh > 0.05; const u = m.material.uniforms; u.uA.value.set(WX, WZ, d, wh * (1 - m.off * 0.12)); u.uB.value.set(waveHalfWidth(d), m.off, WAVE.dirX, 0); });
    const rr = ringRadius(t), rh = ringHeight(t);
    ringS.forEach((m) => { m.visible = rh > 0.05; m.material.uniforms.uA.value.set(RX, RZ, Math.max(0.5, rr - m.off), rh * (1 - m.off * 0.15)); });
    wallS.forEach((m, i) => { m.visible = t >= WALL.t0; const u = m.material.uniforms; u.uA.value.set(WALL.z, WALL.t0, WALL.spread, t); u.uB.value.set(WALL.surge, m.off, -270, 270); u.uInt.value = i ? 0.3 : 0.45; });
    // sprites: fireball cores, torches, burning bodies
    const nat = [], spi = [];
    for (const f of FIREBALLS) if (t >= f.tL - 1 && t < f.tI) { const p = fireballPos(f, t); nat.push({ p, s: 2.2, i: 2.2, seed: f.id * 0.13 }, { p: p.clone().add(V(0, -0.3, 0)), s: 1.4, i: 3.5, seed: f.id * 0.29 + 0.5 }); }
    horde.torchFlames(t, nat);
    const burning = []; horde.burningBodies(t, burning); burning.forEach((b) => spi.push(b));
    craters.forEach((c, i) => { if (t > c.t0) nat.push({ p: V(c.x, groundH(c.x, c.z) - 0.1, c.z), s: 1.5 * smooth(c.t0, c.t0 + 0.3, t), i: 1.1, seed: i * 0.37 }); });
    // burning blades
    for (const H of heroes) { if (H.S.heat < 0.5) continue; for (let k = 1; k <= 7; k++) { const s = k / 7; const p = ctx.bladeAt(H.S, s);
      spi.push({ p, s: (0.06 + 0.05 * s) * H.S.heat, i: 0.9 * H.S.heat, seed: k * 0.17 + (H.S.fem ? 0.5 : 0) }); } }
    natural.set(nat); spirit.set(spi);
    // trails
    trailM.set(ctx.trail(heroes[0], t), smooth(8.78, 8.84, t) * (1 - smooth(9.05, 9.3, t)) * 0.7);
    trailF.set(ctx.trail(heroes[1], t), smooth(10.12, 10.2, t) * (1 - smooth(10.6, 10.85, t)) * 0.7);
    // ground ember uniforms
    G.wave.value.set(WX, WZ, d, t >= WAVE.t0 ? 1 - smooth(12, 15, t) * 0.5 : 0); G.waveW.value.set(0, t - WAVE.t0);
    G.ring.value.set(RX, RZ, rr, t >= RING.t0 ? 1 : 0);
    G.wall.value.set(WALL.z, 1, t - WALL.t0, t >= WALL.t0 ? 1 : 0);
    craters.forEach((c, i) => G.craters.value[i].set(c.x, c.z, c.r, t > c.t0 ? t - c.t0 : -1));
  }
  // light sources for this frame
  function sources(t, heroesArr, camPos) {
    const S = [];
    const add = (p, col, inten, r) => S.push({ p, c: col, i: inten, r });
    const NAT = [1, 0.42, 0.12], SPI = [1, 0.26, 0.09];
    for (const f of FIREBALLS) {
      if (t >= f.tL && t < f.tI) add(fireballPos(f, t), NAT, 9, 9);
      const age = t - f.tI; if (age >= 0) { const [x, z] = f.to; add(V(x, groundH(x, z) + 1.5, z), NAT, 70 * Math.exp(-age * 5) + 5.5 * (0.85 + 0.15 * Math.sin(t * 23 + f.id)), 7 + 8 * Math.exp(-age * 4)); }
    }
    const d = waveFront(t), wh = waveHeight(t, d);
    if (wh > 0.1) for (let k = -2; k <= 2; k++) { const hw = waveHalfWidth(d), lat = k / 2 * hw * 0.8; add(V(WX + lat, 2.5, WZ - d + Math.pow(k / 2, 2) * hw * 0.25), SPI, 26 * wh / 7, 9 + d * 0.06); }
    if (wh > 0.1) add(V(WX, 1.0, WZ - Math.max(2, d * 0.4)), SPI, 14 * wh / 7, 8);
    const rr = ringRadius(t), rh = ringHeight(t);
    if (rh > 0.1) for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; add(V(RX + Math.cos(a) * rr, 2.2, RZ + Math.sin(a) * rr), SPI, 22 * rh / 6.5, 8 + rr * 0.08); }
    if (t >= WALL.t0) for (let x = Math.round(camPos.x / 25) * 25 - 150; x <= camPos.x + 150; x += 25) { const H = wallHeight(t, x); if (H > 0.5) add(V(x, H * 0.35, WALL.z), SPI, 70 * H / 30, 16 + H * 0.4); }
    for (const H of heroesArr) if (H.S.heat > 0.05) add(bladeMid(H), SPI, 2.2 * H.S.heat * (0.85 + 0.15 * Math.sin(t * 31 + (H.S.fem ? 2 : 0))), 1.4);
    S.forEach((s) => (s.pr = s.i * s.r * s.r / (s.r * s.r + Math.max(0, s.p.distanceTo(camPos) - s.r * 2) ** 2)));
    S.sort((a, b) => b.pr - a.pr);
    return S;
  }
  let bladeMid = () => V();
  return { update, sources, counts, setBladeMid: (f) => (bladeMid = f), craters };
}

// ground ember glow (scorched, glowing earth under all the fires) — GLSL for terrain emissive
export const EMBER_GLSL = /* glsl */ `
vec3 emberGlow(vec3 p){
  vec3 g = vec3(0.0);
  float n = fbm2(vec3(p.xz * 0.45, uTime * 0.5));
  float cr = smoothstep(0.45, 0.62, fbm2(vec3(p.xz * 1.3, 7.0))) ;
  for (int i = 0; i < 12; i++) { vec4 c = uCraters[i]; if (c.w < 0.0) continue; float d = length(p.xz - c.xy);
    g += vec3(1.0, 0.32, 0.06) * (1.0 - smoothstep(0.0, c.z * 1.4, d)) * (0.03 + 1.2 * cr * n) * 1.2 * smoothstep(0.0, 0.3, c.w); }
  if (uWave.w > 0.0) { float dd = uWave.y - p.z; float hw = 1.6 + 0.47 * dd; float lat = abs(p.x - uWave.x);
    float inT = step(0.5, dd) * (1.0 - smoothstep(uWave.z - 2.0, uWave.z + 1.0, dd)) * (1.0 - smoothstep(hw * 0.55, hw, lat));
    float age = max(0.0, (uWave.z - dd) / 44.0);
    g += vec3(1.0, 0.16, 0.05) * inT * (0.03 + 1.3 * cr * n) * (0.3 + 1.2 * exp(-age * 1.5)) * uWave.w; }
  if (uRing.w > 0.0) { float d = length(p.xz - uRing.xy); float r = uRing.z;
    g += vec3(1.0, 0.15, 0.05) * (1.0 - smoothstep(r - 2.5, r + 0.5, d)) * smoothstep(1.6, 4.0, d) * (0.03 + 1.3 * cr * n) * (0.3 + 1.2 * exp(-(r - d) * 0.15)); }
  if (uWall.w > 0.0) { float age = uWall.z - abs(p.x) / 420.0; float d = abs(p.z - uWall.x);
    g += vec3(1.0, 0.22, 0.05) * (1.0 - smoothstep(0.0, 12.0, d)) * smoothstep(0.0, 0.4, age) * (0.08 + 1.4 * cr * n) * 1.5; }
  return g * 0.5;
}`;
