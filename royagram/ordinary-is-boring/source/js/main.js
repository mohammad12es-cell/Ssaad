// ROYAGRAM — "Ordinary Is Boring" · deterministic film. window.renderAt(t) draws the frame at time t (seconds).
import * as THREE from 'three';
import { Track, applyCam, clamp, lerp, smooth, smoother, easeInOut, easeOut, easeIn } from './common.js';
import { Post } from './post.js';
import { buildTableWorld, SAUCER_TOP, TEA_LEVEL } from './table.js';
import { buildCityWorld, buildMiniCity } from './city.js';

const W = 1080, H = 1920, FPS = 24;
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;

const post = new Post(renderer, W, H);
const mini = buildMiniCity();
const TW = buildTableWorld(renderer, mini);
const CW = buildCityWorld(renderer);

const SURF_Y = SAUCER_TOP + TEA_LEVEL; // 7.62 cm

// ---------- Cameras ----------
// [px,py,pz, tx,ty,tz, fov, roll]
const OPEN = [-4.6, 9.6, 40.0, 0, 6.4, 0, 26, 0];
const camTable = new Track([
  [0.0, OPEN],
  [4.0, [-1.8, 8.6, 26.5, 0, 6.2, 0, 26, 0]],
  [4.8, [-0.9, 9.2, 19.5, 0, 7.0, 0, 26, 0]],
  [5.7, [-0.3, 12.8, 11.0, 0, 7.4, 0, 27, 0]],
  [6.7, [0.0, 17.0, 4.2, 0.05, SURF_Y, 0.4, 28, 0]],
  [7.45, [0.05, 12.0, 1.1, 0.1, SURF_Y - 1, 0.25, 30, 0]],
  [7.95, [0.12, SURF_Y + 0.15, 0.22, 0.12, SURF_Y - 3, 0.1, 34, 0]],
]);
const camHero = new Track([
  [17.0, [9.0, 1.2, 30.0, 0, 5.5, 0, 30, -2]],
  [18.2, [7.5, 5.0, 29.0, 0, 7.6, 0, 30, -1]],
  [20.0, [5.0, 8.5, 27.0, 0, 8.6, 0, 30, 0]],
]);

// ---------- Look (post) helpers ----------
const base = { exposure: 1.0, sat: 1.05, contrast: 1.05, vignette: 0.6, grain: 0.035, ca: 0.0022, fade: 0, flash: 0, warm: 0.06, bloom: [0.55, 0.5, 0.9], maxBlur: 20 };
const focusOn = (cam, p) => cam.position.distanceTo(p);

// ---------- Overlays ----------
const $ = (id) => document.getElementById(id);
const title = $('title'), endcard = $('endcard'), ring = $('ring'), ring2 = $('ring2'), logo = $('logo'), logoGlow = $('logoGlow'), tag = $('tag'), flare = $('flare');
function overlays(t) {
  // title 0.30 → 3.55
  const ti = smooth(0.3, 1.1, t) * (1 - smooth(3.0, 3.55, t));
  title.style.opacity = ti.toFixed(4);
  const sp = lerp(0.62, 0.32, easeOut(clamp((t - 0.3) / 1.6)));
  title.style.letterSpacing = sp + 'em'; title.style.paddingLeft = sp + 'em';
  title.style.filter = `blur(${((1 - smooth(0.3, 1.0, t)) * 10 + smooth(3.0, 3.55, t) * 6).toFixed(2)}px)`;
  // end card 23.0 → 25.0
  const on = t >= 23.0;
  endcard.style.opacity = on ? '1' : '0';
  if (on) {
    const u = t - 23.0;
    const rr = 40 + easeOut(clamp(u / 1.6)) * 760;
    ring.style.width = ring.style.height = rr + 'px'; ring.style.opacity = (smooth(0, 0.15, u) * (1 - smooth(0.6, 1.7, u))).toFixed(3);
    const r2 = 20 + easeOut(clamp((u - 0.12) / 1.8)) * 980;
    ring2.style.width = ring2.style.height = r2 + 'px'; ring2.style.opacity = (smooth(0.1, 0.3, u) * (1 - smooth(0.5, 1.9, u)) * 0.8).toFixed(3);
    const lo = smooth(0.18, 0.75, u);
    logo.style.opacity = lo; logoGlow.style.opacity = (lo * (0.35 + 0.65 * Math.exp(-Math.pow((u - 0.85) / 0.35, 2)))).toFixed(3);
    const ls = lerp(0.3, 0.2, easeOut(clamp((u - 0.18) / 1.2)));
    for (const el of [logo, logoGlow]) { el.style.letterSpacing = ls + 'em'; el.style.paddingLeft = ls + 'em'; el.style.filter = el === logo ? `blur(${((1 - smooth(0.18, 0.7, u)) * 8).toFixed(2)}px)` : 'blur(22px)'; }
    logo.style.setProperty('--sx', (lerp(-20, 120, clamp((u - 0.55) / 0.9))).toFixed(1) + '%');
    flare.style.opacity = (Math.exp(-Math.pow((u - 0.95) / 0.28, 2)) * 0.9).toFixed(3);
    flare.style.setProperty('--fx', lerp(10, 90, clamp((u - 0.55) / 0.9)) * 1 + '%');
    tag.style.opacity = smooth(0.9, 1.35, u).toFixed(3);
    tag.style.transform = `translateY(${((1 - easeOut(clamp((u - 0.9) / 0.6))) * 14).toFixed(2)}px)`;
    // final fade for a clean loop
    endcard.style.filter = `brightness(${(1 - 0.8 * smooth(1.7, 2.0, u)).toFixed(3)})`;
  }
}

// ---------- Table states ----------
function tableState(t) {
  const s = { tau: -1, glow: 0, inner: 0, dome: 0, steamA: 1, empty: false, handOn: false, lift: 0, dropY: null, miniRise: 0, droplets: 0, tableGlow: 0, shaftA: 1, dustA: 1 };
  s.glint = Math.exp(-Math.pow((t - 0.55) / 0.42, 2)); s.glintX = clamp(t / 1.2);
  if (t < 8) {
    s.tau = t >= 4.8 ? (t - 4.8) : -1;
    if (t >= 4.12 && t < 4.8) { s.dropY = lerp(24, SURF_Y + 0.15, (t - 4.12) / 0.68); s.dropStretch = 0.12; }
    s.glow = smooth(5.3, 7.2, t) * 0.8 + smooth(7.2, 7.95, t) * 0.9;
    s.steamA = 1 - smooth(5.0, 6.2, t) * 0.75;
  } else if (t >= 17 && t < 20) {
    const u = t - 17;
    s.dome = lerp(0.5, 1.75, easeOut(clamp(u / 1.6)));
    s.inner = 0.22 + 0.1 * smooth(0, 1.5, u);
    s.glow = 0.25; s.miniRise = easeOut(clamp(u / 1.4)); s.droplets = smooth(0.0, 0.6, u);
    s.tableGlow = 0.35; s.steamA = 0.3; s.shaftA = 1.5;
  } else if (t >= 20 && t < 23) {
    const u = t - 20;
    s.handOn = u > 0.25 && u < 2.98;
    const inP = easeOut(clamp((u - 0.25) / 0.5)); const outP = easeIn(clamp((u - 2.62) / 0.34));
    s.handOffset = new THREE.Vector3(lerp(3, 0, inP) + outP * 2, lerp(13, 0, inP) + outP * 14, lerp(-2, 0, inP));
    s.wrap = smooth(0.7, 0.92, u) * (1 - smooth(2.5, 2.64, u));
    const up = easeIn(clamp((u - 1.0) / 0.45)); const down = easeOut(clamp((u - 2.12) / 0.38));
    s.lift = u < 2.12 ? up * 19 : (1 - down) * 19;
    s.empty = u >= 2.1;
    s.steamA = s.empty ? 0 : 1;
  }
  return s;
}

function renderTable(t, look) {
  const st = tableState(t);
  let v;
  if (t < 8) v = camTable.at(t);
  else if (t >= 17 && t < 20) v = camHero.at(t);
  else v = OPEN.slice();
  // tiny handheld-free drift in the twist shot keeps it alive but "ordinary"
  const cam = TW.camera;
  cam.near = t > 7.3 && t < 8 ? 0.03 : 0.5; cam.updateProjectionMatrix();
  applyCam(cam, v);
  TW.update(t, st);
  // opening glint: a moving key that rakes across the rim
  const target = new THREE.Vector3(v[3], v[4], v[5]);
  look.focus = t < 8 ? (t < 5.6 ? focusOn(cam, new THREE.Vector3(0, 6.0, 0.8)) : focusOn(cam, new THREE.Vector3(0, SURF_Y, 0))) : focusOn(cam, new THREE.Vector3(0, t >= 20 ? 6 : 8.8, 1.2));
  look.aperture = t < 8 ? lerp(330, 120, smooth(5.5, 7.6, t)) : 330;
  post.render(TW.scene, cam, look);
}

// ---------- Main entry ----------
window.renderAt = (t) => {
  const look = { ...base, frame: Math.round(t * FPS) };
  overlays(t);
  if (t >= 23.0) { look.fade = 1; post.finalMat.uniforms.fade.value = 1; renderer.setRenderTarget(null); renderer.setClearColor(0x050302, 1); renderer.clear(); return; }
  if (t < 8.0) {
    look.flash = smooth(7.8, 7.98, t) * 0.8;
    look.exposure = 1.0 + smooth(0, 0.6, 0.6 - t) * 0.0;
    renderTable(t, look);
  } else if (t < 17.0) {
    look.flash = (1 - smooth(8.0, 8.22, t)) * 0.8 + smooth(16.8, 17.0, t) * 1.0;
    CW.render(t, post, look);
  } else if (t < 20.0) {
    look.flash = (1 - smooth(17.0, 17.25, t)) * 1.2 + Math.exp(-Math.pow((t - 18.3) / 0.25, 2)) * 0.25;
    look.bloom = [0.6, 0.5, 0.92]; look.warm = 0.08;
    renderTable(t, look);
  } else {
    look.bloom = [0.45, 0.5, 0.95];
    renderTable(t, look);
  }
};
window.FPS = FPS; window.TW = TW; window.post = post;
window.ready = document.fonts.ready.then(() => { window.renderAt(0); return true; });
