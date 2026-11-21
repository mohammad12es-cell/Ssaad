// THE LAST HUMAN — Episode 01 "NO SIGNAL". Entry point: builds the world once, then
// window.renderFrame(f) renders frame f (0..899) deterministically and returns a PNG data URL.
import * as THREE from "three";
import { buildWorld, renderReflection } from "./world.js";
import { buildPost } from "./post.js";
import { makeHuman } from "./human.js";
import { makeDrone } from "./drone.js";
import { makeEyeShot } from "./eye.js";
import { makeHud, makeTitle } from "./hud.js";
import { FPS, TOTAL_FRAMES, clamp, lerp, smooth, smoother, easeInOut, easeOut, easeIn, range, hash, cubicBezier, rng } from "./util.js";
import { SHOTS, shotAt, T, kael as kaelAt, crowdLayout, citizenState, droneState } from "./shots.js";

const W = 1080, H = 1920;
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = false;
await Promise.all(["900 40px Orbitron", "700 40px Orbitron", "700 40px Rajdhani", "600 40px Rajdhani"].map((f) => document.fonts.load(f)));

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(40, W / H, 0.02, 6000);
const world = buildWorld(scene);
const post = buildPost(renderer, scene, cam, W, H);
const eye = makeEyeShot(W, H);
const title = makeTitle(W, H);
const hud = makeHud(scene);
const drone = makeDrone(scene);
const redLight = new THREE.PointLight(0xff2030, 0, 9, 1.5); scene.add(redLight);

// ---------------- cast ----------------
// KAEL — fixed parameters, never changed between shots (character consistency)
const KAEL = makeHuman({ seed: 7, skin: 0xc4906f, hair: 0x09090c, jacket: 0x0a0b0f, pants: 0x101116, iris: ["#3a2213", "#6b4426"], hairStyle: "messy", stubble: true, scar: true, neural: false });
scene.add(KAEL.root);
const crowd = crowdLayout().map((c, i) => {
  const R = rng(100 + i);
  const skins = [0xe0b8a0, 0xc99a7e, 0x9c6b50, 0xf0cdb8, 0x7a5040, 0xd8a98a];
  const coats = [0x1e222c, 0x252a38, 0x1a2630, 0x2a2238, 0x30343f, 0x171a22];
  const hood = R() < 0.3, umb = !c.hero && R() < 0.32;
  const h = makeHuman({
    seed: 200 + i, skin: skins[i % skins.length], hair: 0x16161a, jacket: coats[Math.floor(R() * coats.length)], pants: 0x15161c,
    iris: ["#2f3b45", "#5f6f7c"], hairStyle: c.hero ? "neat" : hood ? "buzz" : (R() < 0.5 ? "neat" : "buzz"), stubble: false, scar: false, neural: true,
    coat: R() < 0.7, hood: hood && !c.hero, umbrella: umb, umbrellaCol: R() < 0.6 ? new THREE.Color(0.3, 2.6, 3.2) : new THREE.Color(1.6, 0.7, 3.2),
    height: 0.96 + R() * 0.08, build: 0.94 + R() * 0.1,
  });
  h.state.lidUp = 0.3; h.state.lidLo = 0.48; h.state.lean = 0.02;
  scene.add(h.root);
  return { c, h };
});

// ---------------- camera helpers ----------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
function setCam(pos, target, fov = 40, roll = 0) {
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(target);
  if (roll) cam.rotateZ(roll);
  cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
const headPos = (H) => { H.head.updateWorldMatrix(true, false); return H.head.getWorldPosition(new THREE.Vector3()); };
const local = (H, x, y, z) => { H.head.updateWorldMatrix(true, false); return H.head.localToWorld(new THREE.Vector3(x, y, z)); };

// ---------------- performance (characters + drone) per time ----------------
function stage(t) {
  const K = kaelAt(t);
  KAEL.root.position.set(K.x, 0, K.z); KAEL.root.rotation.y = Math.PI;
  const S = KAEL.state;
  S.phase = K.phase; S.walk = K.walk; S.lean = 0.05;
  S.lidUp = 0.36; S.lidLo = 0.5; S.brow = 0.35; S.eyeYaw = 0; S.eyePitch = -0.04; S.headYaw = 0; S.headPitch = 0.02;
  // micro-blinks (deterministic)
  const blinks = [9.4, 13.1, 19.6];
  S.blink = Math.max(0, ...blinks.map((b) => 1 - Math.abs(t - b) / 0.09));
  // 4c: slowly raises his eyes (toward the red glow above)
  const raise = smooth(range(t, 17.55, 18.6));
  S.eyePitch = lerp(-0.04, 0.32, raise); S.lidUp = lerp(0.36, 0.5, raise); S.headPitch = lerp(0.02, -0.06, raise);
  S.brow = lerp(0.35, 0.5, raise);
  // 5b: slowly turns his head toward the drone (behind him, to his right)
  const turn = easeInOut(range(t, T.turnA, T.turnB));
  S.headYaw = lerp(0, -1.05, turn); S.eyeYaw = lerp(0, -0.35, smooth(range(t, T.turnA - 0.15, T.turnA + 0.6)));
  S.eyePitch = lerp(S.eyePitch, 0.14, turn); S.headPitch = lerp(S.headPitch, -0.12, turn);
  KAEL.apply();

  // crowd
  const shadows = [[K.x, 1, K.z]];
  for (const { c, h } of crowd) {
    const s = citizenState(c, t);
    h.root.position.set(s.x, 0, s.z); h.root.rotation.y = c.dir < 0 ? Math.PI : 0;
    h.state.phase = s.phase; h.state.walk = s.walk;
    const turnK = smooth(range(t, T.headsTurn, T.headsTurn + 0.8));
    if (turnK > 0) { // all of them turn their heads toward Kael at once
      const dx = K.x - s.x, dz = K.z - s.z;
      let yaw = Math.atan2(dx, dz) - h.root.rotation.y; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      h.state.headYaw = clamp(yaw, -1.1, 1.1) * turnK;
    } else h.state.headYaw = 0;
    h.apply();
    if (h.neural) for (const g of h.neural) g.material.color.setRGB(0.3, 3.2, 3.8).multiplyScalar(0.75 + 0.25 * Math.sin(t * 3 + c.x));
    if (Math.abs(s.z - K.z) < 14) shadows.push([s.x, 1, s.z]);
  }
  shadows.sort((a, b) => Math.abs(a[2] - K.z) - Math.abs(b[2] - K.z));
  world.groundU.uShadow.value.forEach((v, i) => { const s = shadows[i]; s ? v.set(s[0], s[1], s[2]) : v.set(0, 0, -9999); });

  // drone
  const D = droneState(t, K);
  const tt = D.frozen ? T.freezeA : t > T.freezeB ? t - (T.freezeB - T.freezeA) : t;
  // beam sweeps over citizens behind Kael, then lands on him
  const near = crowd.map(({ c, h }) => ({ h, s: citizenState(c, t) })).filter(({ s }) => s.z > K.z + 0.5 && s.z < K.z + 6 && Math.abs(s.x - K.x) < 4).slice(0, 3);
  const pts = near.map(({ s }) => V(s.x, 1.2, s.z));
  while (pts.length < 3) pts.push(V(K.x + 2 - pts.length * 2, 1.2, K.z + 3));
  pts.push(V(K.x, 1.2, K.z));
  const k = clamp((t - 14.6) / (16.35 - 14.6)) * (pts.length - 1);
  const i0 = Math.min(Math.floor(k), pts.length - 2), f0 = smoother(k - i0);
  const target = pts[i0].clone().lerp(pts[i0 + 1], f0);
  if (t > 16.35) target.set(K.x, 1.15, K.z);
  target.y = 0.02;
  // drone faces its target
  const yaw = Math.atan2(target.x - D.pos.x, target.z - D.pos.z);
  const pitch = -Math.atan2(D.pos.y - 1.2, Math.hypot(target.x - D.pos.x, target.z - D.pos.z)) * 0.6;
  const glitch = (t > T.freezeA + 0.12 && t < T.freezeB + 0.1 ? 0.8 * (hash(Math.floor(t * 30)) > 0.35 ? 1 : 0.2) : 0) + (t > 26 ? 0.25 + 0.75 * smooth(range(t, 26.6, 27.9)) * (hash(Math.floor(t * 30) * 1.3) > 0.3 ? 1 : 0.3) : 0);
  const eyeW = drone.update({ t: tt, pos: D.pos, yaw, pitch, red: D.red, glitch, beamAmt: t >= T.holo + 0.4 ? D.beamAmt * 0.55 : D.beamAmt, target, beamR: t > 16.35 ? 0.75 : 0.95 });
  drone.root.visible = t > 13.9;
  drone.fill.intensity = t > 16.3 ? 2.5 : 0.8;
  world.groundU.uScanPos.value.copy(target);
  world.groundU.uScanR.value = t > 16.35 ? 0.75 : 0.95;
  world.groundU.uScanAmt.value = t > 13.9 ? D.beamAmt : 0;
  world.groundU.uScanCol.value.setRGB(lerp(0.25, 3.0, D.red), lerp(1.8, 0.15, D.red), lerp(2.4, 0.2, D.red));
  redLight.position.copy(eyeW).lerp(V(K.x, 1.6, K.z), 0.55); redLight.intensity = D.red * 22 * (t > 26 ? 0 : 1) * (0.85 + 0.15 * Math.sin(t * 9));

  // hologram panel: between drone and Kael, facing Kael
  const hk = smooth(range(t, T.holo, T.holo + 0.25));
  hud.panel.visible = t > T.holo && t < 26;
  { // position is always computed (the 5a camera aims at it before it appears)
    const toK = V(K.x - D.pos.x, 0, K.z - D.pos.z).normalize();
    hud.panel.position.copy(D.pos).addScaledVector(toK, 1.05); hud.panel.position.y -= 0.55;
    hud.panel.lookAt(hud.panel.position.clone().add(toK));
  }
  if (hud.panel.visible) {
    const flick = hash(Math.floor(t * 30) * 2.7) > 0.93 ? 0.45 : 1;
    hud.U.uAmt.value = hk * flick * (t < T.holo + 0.3 ? (hash(Math.floor(t * 60)) > 0.5 ? 1 : 0.2) : 1);
    hud.U.uGlitch.value = (t > T.holo + 1.2 && hash(Math.floor(t * 30) * 5.1) > 0.93 ? 1 : 0);
    hud.U.uTime.value = t;
    hud.draw(t - T.holo, t);
  }
  // ad malfunction
  const g = range(t, T.adsGlitchA, T.adsGlitchA + 0.2) * (1 - range(t, T.adsGlitchB, T.adsGlitchB + 0.5));
  world.adUniforms.uGlitch.value = g * (hash(Math.floor(t * 15)) > 0.25 ? 1 : 0.3) + (t > T.detect && t < T.detect + 0.4 ? 0.5 : 0);
  return { K, D, target, eyeW };
}

// street lighting rig follows the action (practical neon spill)
function lightRig(K, t) {
  const L = world.lights;
  L.cyan.position.set(K.x - 2.6, 2.6, K.z - 0.6); L.cyan.intensity = 13;
  L.violet.position.set(K.x + 2.2, 2.4, K.z + 2.4); L.violet.intensity = 16;
  L.top.position.set(K.x + 0.9, 3.2, K.z - 2.2); L.top.intensity = 9; L.top.color.set(0xe6ecff);
  L.fill.position.set(K.x, 1.7, K.z - 4); L.fill.intensity = 2.2;
}

// hero vehicles that buzz the camera during the aerial descent
function heroVehicles(t, camPos) {
  const hv = world.hero;
  const place = (v, t0, p0, vel) => {
    const p = p0.clone().addScaledVector(vel, t - t0); v.position.copy(p); v.lookAt(p.clone().add(vel)); v.visible = true;
  };
  place(hv[0], 4.3, V(-10, 205, 112), V(46, -4, -10));
  place(hv[1], 6.0, V(14, 66, 70), V(-30, 2, -22));
  place(hv[2], 7.2, V(-2.5, 20, 52), V(0, 0, -34));
}

// ---------------- the frame ----------------
const shotCam = {};
function renderCity(t, sh) {
  const st = stage(t);
  const { K } = st;
  lightRig(K, t);
  const hp = headPos(KAEL);
  const u = range(t, sh.a, sh.b);
  let exposure = 1.1, ca = 0.0015, red = 0, glitch = 0, flash = 0;
  switch (sh.id) {
    case "2-city": {
      const k = lerp(u, easeInOut(u), 0.55);
      const p = cubicBezier(V(85, 310, 175), V(30, 190, 120), V(2, 45, 75), V(1.4, 5.2, 42), k, new THREE.Vector3());
      const tg = V(lerp(-20, 0.6, smooth(u)), lerp(140, 3.0, easeInOut(u)), lerp(-260, -10, smooth(u)));
      setCam(p, tg, lerp(55, 42, u), lerp(-0.05, 0, u));
      heroVehicles(t, p);
      flash = 0.5 * (1 - range(t, 3.0, 3.25));
      break;
    }
    case "3a-track": { // low-angle tracking from in front, slow push
      const d = lerp(2.6, 1.75, easeInOut(u));
      setCam(V(K.x - 0.45 + 0.08 * Math.sin(t * 0.7), 1.18 + 0.02 * Math.sin(K.phase * 2), K.z - d), V(K.x - 0.02, hp.y - 0.22, K.z), 38);
      break;
    }
    case "3b-citizen-ear": { // insert: the neural interface behind a citizen's ear
      const C = crowd[0].h; const ear = local(C, 0.1, -0.015, -0.035);
      const a = lerp(-0.6, -0.15, easeInOut(u));
      const pos = ear.clone().add(V(-0.42 * Math.cos(a) - 0.05, 0.06, 0.5 * Math.cos(a) + 0.05));
      setCam(pos, ear.clone().add(V(0.12, -0.03, -0.1)), 36);
      break;
    }
    case "3c-kael-ear": { // Kael: no implant. Arc from behind the ear to his profile.
      const a = easeInOut(u);
      const ear = local(KAEL, -0.1, -0.01, -0.03);
      const pos = local(KAEL, lerp(-0.5, -0.58, a), lerp(0.04, 0.0, a), lerp(-0.45, 0.25, a));
      const tgt = ear.clone().lerp(local(KAEL, 0, 0.0, 0.08), smooth(range(u, 0.25, 0.95)));
      setCam(pos, tgt, lerp(34, 38, a));
      break;
    }
    case "4a-drone-descends": { // Kael walks toward camera, drone drops in behind him
      const d = lerp(5.4, 4.4, u);
      setCam(V(K.x - 0.9, 1.05, K.z - d), V(K.x + 0.3, lerp(2.6, 1.9, smooth(u)), K.z + 1.5), 44);
      break;
    }
    case "4b-drone-cu": {
      const e = st.eyeW, fwd = new THREE.Vector3(); drone.eye.getWorldDirection(fwd);
      const side = V(-fwd.z, 0, fwd.x).normalize();
      const pos = e.clone().addScaledVector(fwd, lerp(1.9, 1.55, u)).addScaledVector(side, 0.55).add(V(0, -0.35, 0));
      setCam(pos, e.clone().add(V(0, -0.08, 0)), 30);
      break;
    }
    case "4c-kael-face": {
      const pos = local(KAEL, 0.12, -0.06, 0.62 - 0.08 * u);
      setCam(pos, local(KAEL, 0, 0.01, 0), 34);
      break;
    }
    case "4d-red-light": {
      setCam(V(K.x - 1.7 + 0.25 * u, 0.42, K.z - 3.4 + 0.3 * u), V(K.x + 0.45, 2.05, K.z + 1.4), 46);
      break;
    }
    case "5a-hologram": { // from in front of Kael, past him to the drone and the hologram
      const pos = V(K.x - 1.1 + 0.2 * u, 1.45, K.z - 2.6 + 0.35 * u);
      setCam(pos, hud.panel.position.clone().add(V(0, -0.25, 0)), 34);
      break;
    }
    case "5b-head-turn": { // dramatic push + arc to a close-up as he turns toward the drone
      const a = easeInOut(u);
      const hpp = local(KAEL, 0, 0.0, 0);
      const ang = lerp(-0.25, 0.45, a), dist = lerp(1.6, 0.55, a);
      const pos = hpp.clone().add(V(Math.sin(ang) * dist + 0.1, lerp(-0.25, -0.05, a), -Math.cos(ang) * dist));
      setCam(pos, hpp.clone().add(V(0.02, -0.02, 0)), lerp(36, 30, a), lerp(0.04, -0.03, a));
      break;
    }
    case "6a-red-eye": {
      const e = st.eyeW;
      const fwd = new THREE.Vector3(); drone.eye.getWorldDirection(fwd);
      const d = lerp(0.75, 0.42, easeInOut(u));
      const jit = smooth(range(t, 26.8, 27.9)) * 0.004;
      setCam(e.clone().addScaledVector(fwd, d).add(V((hash(t * 30) - 0.5) * jit, (hash(t * 31) - 0.5) * jit, 0)), e, 30);
      glitch = (t > 26.5 ? 0.12 : 0) + smooth(range(t, 27.0, 27.95)) * (hash(Math.floor(t * 30)) > 0.45 ? 0.75 : 0.15) + (Math.abs(t - T.eveA) < 0.05 ? 0.6 : 0);
      break;
    }
  }
  if (t > T.detect && t < 20) red = 0.08;
  // never let a passer-by walk through the lens (except the deliberate ear insert)
  for (const { h } of crowd) {
    const p = h.root.position;
    h.root.visible = sh.id === "3b-citizen-ear" || Math.hypot(p.x - cam.position.x, p.z - cam.position.z) > 0.75;
  }
  world.tick(t, cam);
  renderReflection(renderer, scene, cam, world);
  post.renderPass.scene = scene; post.renderPass.camera = cam;
  renderer.toneMappingExposure = exposure;
  Object.assign(shotCam, { ca, red, glitch, flash });
}

function renderEye(t) {
  // render the real city from Kael's point of view into the cornea texture
  const ec = new THREE.PerspectiveCamera(80, 1, 0.1, 6000);
  ec.position.set(0.6, 1.75, 30); ec.lookAt(-4, 30, -140); ec.updateMatrixWorld();
  stage(Math.max(t, 0)); world.tick(t + 2.0, ec);
  drone.root.visible = false; hud.panel.visible = false;
  renderReflection(renderer, scene, ec, world);
  renderer.setRenderTarget(eye.cityRT); renderer.clear(); renderer.render(scene, ec); renderer.setRenderTarget(null);
  const U = eye.U;
  U.uTime.value = t;
  const push = easeInOut(range(t, 0, 2.7));
  const dive = easeIn(range(t, 2.72, 3.0));
  U.uZoom.value = lerp(1.0, 1.16, push) * lerp(1, 5.5, dive);
  U.uOff.value.set(0, lerp(0.0, -0.004, push));
  U.uScan.value = lerp(1.15, -0.25, range(t, 0.55, 2.25));
  U.uScanAmt.value = smooth(range(t, 0.5, 0.7)) * (1 - smooth(range(t, 2.2, 2.45)));
  U.uReticle.value = smooth(range(t, 1.45, 2.0)) * (1 - range(t, 2.6, 2.75));
  U.uPupil.value = lerp(0.074, 0.06, smooth(range(t, 1.35, 1.7)));
  U.uIris.value.set(t > 1.05 ? 0.006 : 0, t > 1.05 ? 0.002 : 0);
  U.uSweep.value = 1;
  U.uReflBoost.value = lerp(1, 2.6, dive);
  post.renderPass.scene = eye.scene; post.renderPass.camera = eye.cam;
  renderer.toneMappingExposure = 1.15;
  Object.assign(shotCam, { ca: 0.0012 + dive * 0.01, red: 0, glitch: (t > 0.55 && t < 0.62) || (t > 2.25 && t < 2.3) ? 0.35 : 0, flash: dive * 0.35 });
}

function renderTitle(t) {
  const U = title.U; U.uTime.value = t;
  const a = range(t, T.titleA, T.titleA + 0.35), b = range(t, T.subA, T.subA + 0.3);
  const flick = (k, s) => (k <= 0 ? 0 : k >= 1 ? 1 : (hash(Math.floor(t * 30) * s) > 0.4 ? k : 0.1));
  U.uA.value = flick(a, 1.7); U.uB.value = flick(b, 2.9);
  U.uGlitch.value = (1 - a) * (a > 0 ? 1 : 0) * 0.9 + (1 - b) * (b > 0 ? 0.4 : 0);
  U.uScale.value = lerp(1.0, 1.045, range(t, T.titleA, 30));
  post.renderPass.scene = title.scene; post.renderPass.camera = title.cam;
  renderer.toneMappingExposure = 1.0;
  Object.assign(shotCam, { ca: 0.001, red: 0, glitch: 0, flash: 0 });
}

function renderAt(f) {
  const t = f / FPS;
  const sh = shotAt(t);
  if (sh.id === "1-eye") renderEye(t);
  else if (sh.id === "6b-title") renderTitle(t);
  else renderCity(t, sh);
  const gu = post.grade;
  gu.uTime.value = t; gu.uSeed.value = 0;
  gu.uCA.value = shotCam.ca; gu.uRedTint.value = shotCam.red; gu.uGlitch.value = shotCam.glitch; gu.uFlash.value = shotCam.flash;
  gu.uFade.value = 1;
  gu.uGrain.value = sh.id === "6b-title" ? 0.035 : 0.05;
  post.bloom.strength = sh.id === "1-eye" ? 0.45 : sh.id === "6b-title" ? 0.35 : 0.6;
  post.composer.render();
  return { t, shot: sh.id };
}

window.renderFrame = (f) => { renderAt(f); return canvas.toDataURL("image/png"); };
window.__shots = SHOTS;
window.__dbg = { hud, cam, drone, KAEL, THREE };
window.__ready = true;

// interactive preview when opened in a normal browser (not during render)
if (!new URLSearchParams(location.search).has("render")) {
  const hudEl = document.getElementById("hud");
  let f = 0, last = 0;
  const loop = (now) => {
    if (now - last > 1000 / FPS) { last = now; const r = renderAt(f); hudEl.textContent = `frame ${f}  ${r.t.toFixed(2)}s  shot ${r.shot}`; f = (f + 1) % TOTAL_FRAMES; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  addEventListener("keydown", (e) => { if (e.key === "ArrowRight") f = Math.min(TOTAL_FRAMES - 1, f + 15); if (e.key === "ArrowLeft") f = Math.max(0, f - 15); });
}
