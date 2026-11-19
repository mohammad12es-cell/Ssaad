// ROYAGRAM — "Make the Impossible Visible" — deterministic film renderer
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { studioEnv, track, range, easeInOut, clamp } from './lib.js';
import { TransitionShader, GradeShader, MODES } from './post.js';
import { SHOTS, MONTAGE, gradeAt, FPS, DURATION } from './timeline.js';
import { updateOverlays } from './overlays.js';

const q = new URLSearchParams(location.search);
const SCALE = parseFloat(q.get('scale') || '1');
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
const ONLY = q.get('only'); // optional: build a subset of scenes (debug)

const canvas = document.getElementById('gl');
canvas.width = W; canvas.height = H; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
document.getElementById('ui').style.transform = `scale(${SCALE})`;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // grade pass does ACES + sRGB

const ctx = {
  renderer, W, H, SCALE,
  envChrome: studioEnv(renderer, { key: 7, fill: 2.5, gold: 9, gold2: 5 }),
  envWarm: studioEnv(renderer, { key: 4, fill: 1.2, gold: 14, gold2: 8, top: 2.0, warm: [1.0, 0.66, 0.3] }),
  envProduct: studioEnv(renderer, { key: 6, fill: 3.0, gold: 6, gold2: 4, top: 4, front: 1.0 }),
};

const mods = {
  s1: './scenes/s1_hook.js', s2: './scenes/s2_perfume.js', s3: './scenes/s3_sneaker.js',
  s4: './scenes/s4_beverage.js', s5: './scenes/s5_watch.js', s7: './scenes/s7_reveal.js',
};
await Promise.all(['700 100px Syncopate', '400 60px Syncopate', '300 60px Inter', '500 60px Inter', '400 60px Inter', '600 60px Inter'].map((f) => document.fonts.load(f)));
const scenes = {};
for (const [k, path] of Object.entries(mods)) {
  if (ONLY && !ONLY.split(',').includes(k)) continue;
  const m = await import(path);
  scenes[k] = await m.build(ctx);
}
await document.fonts.ready;

const rtOpts = { type: THREE.HalfFloatType, samples: 4, colorSpace: THREE.LinearSRGBColorSpace };
const rts = [0, 1, 2].map(() => new THREE.WebGLRenderTarget(W, H, rtOpts));
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
const trans = new ShaderPass(TransitionShader);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.65, 0.92);
const grade = new ShaderPass(GradeShader);
composer.addPass(trans); composer.addPass(bloom); composer.addPass(grade);
trans.uniforms.uAspect.value = W / H;
grade.uniforms.uRes.value.set(W, H);

const wireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.62, 0.25), wireframe: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });

function renderShot(spec, rt) {
  const sc = scenes[spec.scene];
  if (!sc) { renderer.setRenderTarget(rt); renderer.setClearColor(0x000000); renderer.clear(); return; }
  sc.update(spec.lt, spec.opt || {});
  renderer.setRenderTarget(rt);
  if (spec.wire) { const bg = sc.scene.background; sc.scene.overrideMaterial = wireMat; sc.scene.background = null; renderer.setClearColor(0x020203); renderer.clear(); renderer.render(sc.scene, sc.camera); sc.scene.overrideMaterial = null; sc.scene.background = bg; }
  else renderer.render(sc.scene, sc.camera);
}

// resolve what is on screen at global time t
function resolve(t) {
  // montage window
  if (t >= MONTAGE.start && t < MONTAGE.end) return MONTAGE.at(t);
  const active = SHOTS.filter((s) => t >= s.start && t < s.end);
  if (active.length === 0) return { mode: MODES.A, a: { scene: null } };
  const a = active[0], b = active[1];
  const specA = { scene: a.scene, lt: t - a.start + (a.offset || 0), opt: a.opt };
  if (!b || !a.out) return { mode: MODES.A, a: specA };
  const p = range(t, b.start, a.end);
  return { mode: a.out.mode, p, center: a.out.center, a: specA, b: { scene: b.scene, lt: t - b.start + (b.offset || 0), opt: b.opt } };
}

window.renderFrame = (frame) => {
  const t = frame / FPS;
  const r = resolve(t);
  renderShot(r.a, rts[0]);
  if (r.b) renderShot(r.b, rts[1]);
  if (r.c) renderShot(r.c, rts[2]);
  const U = trans.uniforms;
  U.tA.value = rts[0].texture; U.tB.value = rts[1].texture; U.tC.value = rts[2].texture;
  U.uMode.value = r.mode; U.uP.value = r.p ?? 0; U.uTime.value = t;
  if (r.center) U.uCenter.value.set(...r.center); else U.uCenter.value.set(0.5, 0.5);
  if (r.slide) U.uSlide.value.set(...r.slide);
  const g = gradeAt(t);
  const G = grade.uniforms;
  G.uTime.value = t; G.uExposure.value = g.exposure; G.uFade.value = g.fade; G.uFlash.value = g.flash; G.uVig.value = g.vig; G.uCA.value = g.ca; G.uLetter.value = g.letter || 0;
  bloom.strength = g.bloom;
  renderer.setRenderTarget(null);
  composer.render();
  updateOverlays(t, r);
  return true;
};

window.__meta = { FPS, DURATION, W, H };
window.__ready = true;
