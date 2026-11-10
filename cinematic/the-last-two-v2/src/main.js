// THE LAST TWO v2 — scene assembly, per-frame state, post pipeline, deterministic frame stepping.
import * as THREE from "three";
import { UnrealBloomPass } from "../lib/jsm/postprocessing/UnrealBloomPass.js";
import { V, clamp, lerp, smooth } from "./util.js";
import { G, FIRE, FIRE_N, NOISE } from "./glsl.js";
import { buildWorld } from "./world.js";
import { buildHorde } from "./orcs.js";
import { buildFire } from "./fire.js";
import { makeSamurai, applyPose, bladeWorld } from "./samurai.js";
import { MALE, FEMALE, pose, cameraAt, CUTS, FPS, WALL, WAVE, RING, wallHeight } from "./timeline.js";

const Q = new URLSearchParams(location.search);
const W = +(Q.get("w") || 3840), H = +(Q.get("h") || 2160), MB = +(Q.get("mb") || 1);
const SHUTTER = 0.5 / FPS;

// ------------------------------------------------------------------ renderer / scene
const glCanvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const out = document.getElementById("out"); out.width = W; out.height = H; const ctx2d = out.getContext("2d");
glCanvas.style.width = out.style.width = "100vw"; glCanvas.style.height = out.style.height = "auto";

const scene = new THREE.Scene();
const FOG0 = new THREE.Color(0x161d27);
scene.fog = new THREE.FogExp2(G.fogColor.value, G.fogDensity.value);
scene.background = new THREE.Color(0x161d27);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 2500);

const world = buildWorld(scene, renderer);
const horde = buildHorde(scene);
const male = makeSamurai(false), fem = makeSamurai(true);
scene.add(male.root, fem.root);
const heroes = [{ S: male, keys: MALE, phase: 0 }, { S: fem, keys: FEMALE, phase: 0.5 }];
const fire = buildFire(scene, horde, heroes);
fire.setBladeMid((Hh) => bladeWorld(Hh.S, 0.55));
scene.traverse((o) => { const m = o.material; if (m && !Array.isArray(m) && m.transparent && m.blending === THREE.AdditiveBlending) o.layers.set(1); });
console.log("particles", JSON.stringify(fire.counts), "orcs", horde.orcs.length);

function poseHero(Hh, t) { applyPose(Hh.S, pose(Hh.keys, t, Hh.phase)); Hh.S.root.updateMatrixWorld(true); }
const trailCtx = {
  bladeAt: (S, s) => bladeWorld(S, s),
  trail: (Hh, t) => { const out = []; for (let i = 0; i < 28; i++) { poseHero(Hh, t - i * 0.009); out.push({ base: bladeWorld(Hh.S, 0.05), tip: bladeWorld(Hh.S, 1.02) }); } poseHero(Hh, t); return out; },
};

// ------------------------------------------------------------------ post pipeline
const rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType) });
const rtGlow = new THREE.WebGLRenderTarget(W / 4, H / 4, { type: THREE.HalfFloatType });
const rtDof = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const rtFx = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }); rtFx.depthTexture = rtScene.depthTexture; // FX colour, depth-tested against the scene
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = (frag, uniforms) => { const m = new THREE.ShaderMaterial({ uniforms, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`, fragmentShader: frag, depthTest: false, depthWrite: false });
  const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); return { s, m }; };
const DEPTH = /* glsl */ `uniform sampler2D tDepth; uniform float uNear, uFar; float linDepth(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }`;
// volumetric in-scattering of firelight through the rain-filled air (analytic integral per source)
const glowPass = quad(/* glsl */ `
  ${DEPTH}
  uniform mat4 uProjInv, uCamWorld; uniform vec4 uFirePosW[${FIRE_N}]; uniform vec3 uFireCol[${FIRE_N}]; uniform float uDensity;
  varying vec2 vUv;
  void main(){
    vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); vec3 dv = normalize(v.xyz / v.w);
    vec3 O = (uCamWorld * vec4(0.0, 0.0, 0.0, 1.0)).xyz, D = normalize(mat3(uCamWorld) * dv);
    float L = min(linDepth(vUv) / max(1e-3, -dv.z), 600.0);
    vec3 acc = vec3(0.0);
    for (int i = 0; i < ${FIRE_N}; i++) {
      vec3 S = uFirePosW[i].xyz - O; float tc = dot(S, D); vec3 perp = S - D * tc;
      float r = uFirePosW[i].w; float h = sqrt(dot(perp, perp) + r * r * 0.35);
      acc += uFireCol[i] * (atan((L - tc) / h) - atan(-tc / h)) / h;
    }
    acc *= uDensity; gl_FragColor = vec4(acc / (1.0 + dot(acc, vec3(0.33)) * 0.5), 1.0);
  }`, { tDepth: { value: rtScene.depthTexture }, uNear: { value: 0.05 }, uFar: { value: 2500 }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
  uFirePosW: FIRE.posW, uFireCol: FIRE.col, uDensity: { value: 0.002 } });
const dofPass = quad(/* glsl */ `
  ${DEPTH}
  uniform sampler2D tColor, tGlow, tFx; uniform float uFocus, uAperture, uMaxR; uniform vec2 uRes; varying vec2 vUv;
  float coc(float d){ return clamp(uAperture * 40.0 * abs(1.0 / uFocus - 1.0 / d) * uFocus, 0.0, uMaxR) * uRes.y / 2160.0; }
  void main(){
    vec3 c0 = texture2D(tColor, vUv).rgb; float d0 = linDepth(vUv); float r0 = coc(d0);
    vec3 acc = c0; float wsum = 1.0;
    if (r0 > 0.6) {
      for (int i = 1; i < 48; i++) {
        float fi = float(i); float rr = sqrt(fi / 48.0) * r0; float a = fi * 2.39996;
        vec2 o = vec2(cos(a), sin(a)) * rr / uRes;
        float ds = linDepth(vUv + o); float rs = coc(ds);
        float w = smoothstep(rr - 1.0, rr + 0.5, ds > d0 ? min(rs, r0) : rs);
        acc += texture2D(tColor, vUv + o).rgb * w; wsum += w;
      }
    }
    gl_FragColor = vec4(acc / wsum + texture2D(tGlow, vUv).rgb + texture2D(tFx, vUv).rgb, 1.0);
  }`, { tColor: { value: rtScene.texture }, tDepth: { value: rtScene.depthTexture }, tGlow: { value: rtGlow.texture }, tFx: { value: rtFx.texture }, uNear: { value: 0.05 }, uFar: { value: 2500 },
  uFocus: { value: 10 }, uAperture: { value: 0 }, uMaxR: { value: 26 }, uRes: { value: new THREE.Vector2(W, H) } });
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.18, 0.2, 1.3);
const finalPass = quad(/* glsl */ `
  uniform sampler2D tColor; uniform float uFrame, uWhite, uExposure; uniform vec2 uRes; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uFrame*0.137)*43758.5453); }
  vec3 aces(vec3 x){ x *= 0.6; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
  void main(){
    vec2 c = vUv - 0.5; float r2 = dot(c,c); vec2 off = c * r2 * 0.005;
    vec3 col = vec3(texture2D(tColor, vUv + off).r, texture2D(tColor, vUv).g, texture2D(tColor, vUv - off).b) * uExposure;
    col = aces(col);
    col = pow(col, vec3(1.0/2.2));
    float l = dot(col, vec3(0.2126,0.7152,0.0722));
    float warm = smoothstep(0.02, 0.14, col.r - col.b);           // fire + crimson stay saturated
    vec3 cold = mix(vec3(l), col, 0.6) * vec3(0.9, 1.0, 1.12);
    col = mix(cold, col * vec3(1.05, 0.97, 0.92), warm);
    col = mix(col, col + vec3(-0.006, 0.004, 0.018), 1.0 - smoothstep(0.0, 0.35, l));
    col = clamp(col, 0.0, 1.0); col = col*col*(3.0-2.0*col)*0.3 + col*0.7;
    col *= 1.0 - smoothstep(0.18, 0.72, r2*1.9) * 0.55;
    col = mix(col, vec3(1.0), uWhite);
    col += (h(vUv*uRes) - 0.5) * 0.03;
    gl_FragColor = vec4(col, 1.0);
  }`, { tColor: { value: rtDof.texture }, uFrame: { value: 0 }, uWhite: { value: 0 }, uExposure: { value: 1 }, uRes: { value: new THREE.Vector2(W, H) } });

// ------------------------------------------------------------------ per-time state
const _v4 = new THREE.Vector4();
function setState(t) {
  G.time.value = t;
  world.updateTrebs(t);
  for (const Hh of heroes) poseHero(Hh, t);
  male.blade.material.emissiveIntensity = male.heat * male.heat * (1.6 + 0.5 * Math.sin(t * 37)); fem.blade.material.emissiveIntensity = fem.heat * fem.heat * (1.6 + 0.5 * Math.sin(t * 41 + 1));
  male.rainTex.offset.set(0, -t * 0.05);
  G.gust.value = 0.85 + 0.3 * Math.sin(t * 0.9) + 0.35 * smooth(8.8, 12, t);
  horde.update(t);
  fire.update(t, trailCtx);
  // camera
  const c = cameraAt(t);
  camera.position.copy(c.pos); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.tgt); camera.updateMatrixWorld();
  G.cam.value.copy(c.pos);
  dofPass.m.uniforms.uFocus.value = c.focus; dofPass.m.uniforms.uAperture.value = c.aperture;
  // lightning
  const { total, best } = world.flashAt(t); const f = clamp(total, 0, 2.6);
  G.flash.value = f * 0.55;
  if (best) { world.sky.material.uniforms.uBolt.value.copy(best.dir); world.bolt.position.set(best.pos[0] * 0.06, 45, best.pos[1] * 0.06); world.bolt.target.position.set(0, 0, 0);
    world.boltFar.position.set(best.pos[0], 500, best.pos[1] - Math.sign(best.pos[1]) * 150); world.boltFar.target.position.set(best.pos[0] * 0.3, 0, best.pos[1] * 0.4); }
  world.bolt.intensity = f * 3.2; world.boltFar.intensity = f * 2.2;
  world.hemi.intensity = 0.5 + f * 0.8; scene.environmentIntensity = 0.35 + f * 1.2;
  // fire in the air: fog & sky pick up the glow
  const wallAmt = t >= WALL.t0 ? clamp(wallHeight(t, 0) / 30) : 0, fireAmt = clamp(0.15 * smooth(2.2, 3, t) + 0.6 * smooth(8.9, 9.6, t) * (1 - smooth(11.5, 12.5, t) * 0.6) + 0.5 * smooth(10.55, 11, t) * (1 - smooth(11.6, 12.5, t)) + 1.3 * wallAmt, 0, 1.8);
  G.fogColor.value.copy(FOG0).multiplyScalar(1 + f * 1.3).add(new THREE.Color(0.06, 0.016, 0.004).multiplyScalar(fireAmt));
  scene.background.copy(G.fogColor.value);
  world.sky.material.uniforms.uFireSky.value = fireAmt;
  // firelight sources -> uniforms (world + view space)
  const src = fire.sources(t, heroes, c.pos);
  for (let i = 0; i < FIRE_N; i++) {
    const s = src[i];
    if (s) { FIRE.posW.value[i].set(s.p.x, s.p.y, s.p.z, s.r); FIRE.col.value[i].set(s.c[0] * s.i, s.c[1] * s.i, s.c[2] * s.i); }
    else { FIRE.posW.value[i].set(0, -1e4, 0, 1); FIRE.col.value[i].set(0, 0, 0); }
    _v4.set(FIRE.posW.value[i].x, FIRE.posW.value[i].y, FIRE.posW.value[i].z, 1).applyMatrix4(camera.matrixWorldInverse);
    FIRE.posV.value[i].set(_v4.x, _v4.y, _v4.z, FIRE.posW.value[i].w);
  }
  // shadow-casting fire key: the strongest source within reach of the heroes
  const near = src.find((s) => s.p.length() < 45 && s.i > 3);
  if (near) { world.fireKey.position.copy(near.p).add(V(0, 2.5, 0)); world.fireKey.target.position.set(0, 1, -0.5); world.fireKey.intensity = Math.min(160, near.i * 6) ; world.fireKey.color.setRGB(near.c[0], near.c[1] * 1.1, near.c[2] * 1.2); }
  else world.fireKey.intensity = 0;
  world.heroKey.intensity = t >= CUTS[0] && t < CUTS[1] ? 1.6 + f * 0.8 : t >= CUTS[2] ? 0.6 : 0.35;
  finalPass.m.uniforms.uWhite.value = clamp((total - 1.6) * 0.45, 0, 0.85) * (t > 11.5 && t < 12.6 ? 1 : 0.35);
  finalPass.m.uniforms.uExposure.value = t < CUTS[0] ? 1.0 : t < CUTS[1] ? 1.0 : t < CUTS[2] ? 0.95 : lerp(0.95, 0.7, smooth(12.4, 13.5, t));
}

const DBG = (Q.get("dbg") || "").split(",");
function renderOnce() {
  for (const d of DBG) if (d.startsWith("-")) scene.traverse((o) => { if (o.name && o.name.startsWith(d.slice(1))) o.visible = false; });
  if (DBG.includes("noglow")) glowPass.m.uniforms.uDensity.value = 0;
  if (DBG.includes("nofx")) scene.traverse((o) => { if (o.material && o.material.blending === THREE.AdditiveBlending) o.visible = false; });
  if (DBG.includes("nolight")) for (let i = 0; i < FIRE_N; i++) FIRE.col.value[i].set(0, 0, 0);
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
  const gu = glowPass.m.uniforms; gu.uProjInv.value.copy(camera.projectionMatrixInverse); gu.uCamWorld.value.copy(camera.matrixWorld);
  renderer.setRenderTarget(rtGlow); renderer.render(glowPass.s, quadCam);
  if (DBG.includes("nodof")) dofPass.m.uniforms.uAperture.value = 0;
  // additive FX layer (fire, sparks, rain, lightning glow): kept out of the DOF gather, depth-tested against the scene
  const bg = scene.background, ac = renderer.autoClear; scene.background = null; renderer.autoClear = false;
  renderer.setRenderTarget(rtFx); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
  camera.layers.set(1); renderer.render(scene, camera); camera.layers.set(0);
  scene.background = bg; renderer.autoClear = ac;
  renderer.setRenderTarget(rtDof); renderer.render(dofPass.s, quadCam);
  if (!DBG.includes("nobloom")) bloom.render(renderer, null, rtDof, 0, false);
  renderer.setRenderTarget(null); renderer.render(finalPass.s, quadCam);
}
const HALTON = [[0.5, 0.333], [0.25, 0.667], [0.75, 0.111], [0.125, 0.444], [0.625, 0.778], [0.375, 0.222], [0.875, 0.556], [0.0625, 0.889]];
window.renderFrame = (t) => {
  finalPass.m.uniforms.uFrame.value = Math.round(t * FPS);
  const seg = CUTS.filter((c) => c <= t).pop() ?? -1, next = CUTS.find((c) => c > t) ?? 99;
  for (let i = 0; i < MB; i++) {
    let ts = MB === 1 ? t : t + ((i + 0.5) / MB - 0.5) * SHUTTER;
    ts = clamp(ts, seg + 1e-4, next - 1e-4);
    setState(ts);
    if (MB > 1) camera.setViewOffset(W, H, HALTON[i % 8][0] - 0.5, HALTON[i % 8][1] - 0.5, W, H); else camera.clearViewOffset();
    renderOnce();
    ctx2d.globalAlpha = 1 / (i + 1); ctx2d.drawImage(glCanvas, 0, 0);
  }
  ctx2d.globalAlpha = 1; return true;
};
window.stats = () => { const w = 64, h = 36, rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType }); const m = quad(`uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`, { t: { value: rtScene.texture } });
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera); renderer.setRenderTarget(rt); renderer.render(m.s, quadCam); const b = new Float32Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, b);
  let mx = 0, sum = 0; for (let i = 0; i < w * h; i++) { const l = b[i * 4] + b[i * 4 + 1] + b[i * 4 + 2]; sum += l; mx = Math.max(mx, l); } return { mean: sum / w / h / 3, max: mx / 3 }; };
window.ready = true;
const tq = Q.get("t"); if (tq !== null) window.renderFrame(+tq);
