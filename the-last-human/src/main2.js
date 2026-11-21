// THE LAST HUMAN — EP01 "NO SIGNAL" — v2 "STRINGS" (director's cut).
// Every connected mind in Neo-Eden is tied to E.V.E. by a thread of light. One man has none.
import * as THREE from "three";
import { buildWorld, renderReflection } from "./world.js";
import { buildPost } from "./post.js";
import { makeHuman } from "./human.js";
import { makeDrone } from "./drone.js";
import { makeHud, makeTitle } from "./hud.js";
import { makeThreads, SPIRE_EYE } from "./threads.js";
import { RIM, applyRim, makeSensor, makeOverlay, txt } from "./fx2.js";
import { FPS, TOTAL_FRAMES, clamp, lerp, smooth, smoother, easeInOut, easeOut, easeIn, range, hash, cubicBezier, rng } from "./util.js";
import { crowdLayout } from "./shots.js";

const W = 1080, H = 1920;
export const T = {
  kaelStop: 17.3, crowdStop: 19.25, redWave: 19.0, headsTurn: 19.85, tagHunt: 15.55, detect: 16.2,
  freezeA: 16.2, freezeB: 16.9, holo: 21.5, turnA: 23.6, turnB: 25.2, eveA: 26.0, cut: 28.0, titleA: 28.2, subA: 28.6, tag: 29.0,
};
export const SHOTS = [
  { id: "1-strings", a: 0, b: 3 }, { id: "2-mind", a: 3, b: 7.5 }, { id: "3a-track", a: 7.5, b: 10.2 }, { id: "3b-gap", a: 10.2, b: 12.5 },
  { id: "4a-descent", a: 12.5, b: 14.5 }, { id: "4b-sensor", a: 14.5, b: 17.0 }, { id: "4c-face", a: 17.0, b: 19.0 },
  { id: "5a-wave", a: 19.0, b: 21.5 }, { id: "5b-holo", a: 21.5, b: 23.5 }, { id: "5c-turn", a: 23.5, b: 25.5 },
  { id: "6a-red-eye", a: 25.5, b: 26.8 }, { id: "6b-spire", a: 26.8, b: 28.0 }, { id: "7-title", a: 28.0, b: 30.0 },
];
const shotAt = (t) => SHOTS.find((s) => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];

// ---------------- kinematics ----------------
const KAEL_X = 0.6, KAEL_Z0 = 27.0, SPEED = 1.3;
const kaelWalk = (t) => 1 - smooth(range(t, T.kaelStop, T.kaelStop + 1.0));
const crowdWalk = (t) => 1 - smooth(range(t, T.crowdStop, T.crowdStop + 0.3));
const kin = { kz: [], kph: [], cz: [], cph: [] };
{ let kz = KAEL_Z0, kph = 1.9, cz = 0, cph = 0; const DT = 1 / (FPS * 4);
  for (let i = 0; i <= (TOTAL_FRAMES + 2) * 4; i++) { const t = i * DT;
    if (i % 4 === 0) { kin.kz.push(kz); kin.kph.push(kph); kin.cz.push(cz); kin.cph.push(cph); }
    const kw = kaelWalk(t), cw = crowdWalk(t);
    kz -= SPEED * kw * DT; kph += 2 * Math.PI * 0.82 * kw * DT; cz -= SPEED * cw * DT; cph += 2 * Math.PI * 0.9 * cw * DT; } }
const sample = (arr, t) => { const x = t * FPS, i = Math.floor(x), k = x - i; return lerp(arr[Math.min(i, arr.length - 1)], arr[Math.min(i + 1, arr.length - 1)], k); };
const kaelAt = (t) => ({ x: KAEL_X, z: sample(kin.kz, t), phase: sample(kin.kph, t), walk: kaelWalk(t) });
const citizenAt = (c, t) => { const cz = sample(kin.cz, t), ph = sample(kin.cph, t);
  return { x: c.x, z: c.dir < 0 ? KAEL_Z0 + c.dz + cz : -2 + c.dz - cz, phase: ph + (c.dir > 0 ? Math.PI : 0), walk: crowdWalk(t) }; };

// ---------------- build ----------------
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
await Promise.all(["900 40px Orbitron", "700 40px Orbitron", "500 40px Orbitron", "700 40px Rajdhani", "600 40px Rajdhani", "500 40px Rajdhani"].map((f) => document.fonts.load(f)));

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(40, W / H, 0.02, 6000);
const world = buildWorld(scene);
scene.traverse((o) => { if (o.isHemisphereLight) o.intensity = 0.22; if (o.isDirectionalLight) o.intensity = 0.45; });
for (const v of world.hero) v.visible = false; // no scripted fly-bys in this cut
// E.V.E.'s eye on the spire must burn through the cloud layer
const [eyeRing, eyeCore] = world.spireEye;
for (const m of [eyeRing, eyeCore]) { m.material.fog = false; m.material.needsUpdate = true; }
const halo = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.ShaderMaterial({
  uniforms: { uCol: { value: new THREE.Color(0.3, 1.8, 2.4) }, uAmt: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 uCol; uniform float uAmt; varying vec2 vUv; void main(){ float r = length(vUv-0.5)*2.0; gl_FragColor = vec4(uCol * (exp(-r*r*6.0)*0.9 + exp(-r*r*40.0)) * uAmt, 1.0); }`,
}));
halo.position.copy(SPIRE_EYE).add(new THREE.Vector3(0, 0, 4)); scene.add(halo);

const post = buildPost(renderer, scene, cam, W, H);
const title = makeTitle(W, H);
const hud = makeHud(scene);
const drone = makeDrone(scene);
const redLight = new THREE.PointLight(0xff2030, 0, 9, 1.5); scene.add(redLight);
const overlay = makeOverlay(W, H);
const sensor = makeSensor();

// cast — Kael: identical parameters in every shot; in this cut he wears the long version of his black jacket
const KAEL = makeHuman({ seed: 7, skin: 0xc4906f, hair: 0x09090c, jacket: 0x07080b, pants: 0x0c0d11, iris: ["#3a2213", "#6b4426"], hairStyle: "messy", stubble: true, scar: true, neural: false, coat: true });
scene.add(KAEL.root);
const crowd = crowdLayout().map((c, i) => {
  const R = rng(100 + i);
  const skins = [0xe0b8a0, 0xc99a7e, 0x9c6b50, 0xf0cdb8, 0x7a5040, 0xd8a98a];
  const coats = [0x111318, 0x15171e, 0x10161b, 0x17131d, 0x1a1c22, 0x0e1014];
  const hood = R() < 0.3, umb = !c.hero && R() < 0.25;
  const h = makeHuman({
    seed: 200 + i, skin: skins[i % skins.length], hair: 0x111114, jacket: coats[Math.floor(R() * coats.length)], pants: 0x101116,
    iris: ["#2f3b45", "#5f6f7c"], hairStyle: c.hero ? "neat" : hood ? "buzz" : (R() < 0.5 ? "neat" : "buzz"), stubble: false, scar: false, neural: true,
    coat: R() < 0.75, hood: hood && !c.hero, umbrella: umb, umbrellaCol: R() < 0.6 ? new THREE.Color(0.3, 2.6, 3.2) : new THREE.Color(1.6, 0.7, 3.2),
    height: 0.96 + R() * 0.08, build: 0.94 + R() * 0.1,
  });
  h.state.lidUp = 0.3; h.state.lidLo = 0.48; h.state.lean = 0.02;
  scene.add(h.root);
  return { c, h };
});
applyRim(KAEL.root); for (const { h } of crowd) applyRim(h.root);
const threads = makeThreads(scene, crowd.length, W, H);

// sensor categories
sensor.register(threads.mesh, "keep");
for (const { h } of crowd) { (h.neural || []).forEach((g) => sensor.register(g, "keep")); sensor.register(h.root, "human"); }
sensor.register(KAEL.root, "kael");
sensor.register(world.ground, "ground");
for (const o of [drone.root, drone.beam, hud.panel, world.rain, halo, ...world.fogCards]) sensor.register(o, "hide");
scene.traverse((o) => { if (o.isMesh && o.geometry?.parameters?.radius === 3500) sensor.register(o, "hide");
  if (o.isMesh && o.material?.blending === THREE.AdditiveBlending && !o.userData.sensorCat) sensor.register(o, "hide"); });
sensor.collect(scene);

// ---------------- helpers ----------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function setCam(pos, target, fov = 40, roll = 0) {
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(target); if (roll) cam.rotateZ(roll);
  cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
const local = (h, x, y, z) => { h.head.updateWorldMatrix(true, false); return h.head.localToWorld(new THREE.Vector3(x, y, z)); };
const implant = (h) => local(h, 0.094, -0.015, -0.035);
const toScreen = (p) => { const v = p.clone().project(cam); return v.z > 1 || v.z < -1 ? null : { x: (v.x * 0.5 + 0.5) * W, y: (1 - (v.y * 0.5 + 0.5)) * H, d: cam.position.distanceTo(p) }; };
const fmt = (n) => n.toLocaleString("en-US");

// ---------------- performance ----------------
function stage(t) {
  const K = kaelAt(t);
  KAEL.root.position.set(K.x, 0, K.z); KAEL.root.rotation.y = Math.PI;
  const S = KAEL.state;
  S.phase = K.phase; S.walk = K.walk; S.lean = 0.05;
  S.lidUp = 0.36; S.lidLo = 0.5; S.brow = 0.4; S.eyeYaw = 0; S.eyePitch = -0.04; S.headYaw = 0; S.headPitch = 0.02;
  S.blink = Math.max(0, ...[8.9, 13.0, 18.95].map((b) => 1 - Math.abs(t - b) / 0.09));
  const raise = smooth(range(t, 17.5, 18.6));
  S.eyePitch = lerp(-0.04, 0.32, raise); S.lidUp = lerp(0.36, 0.5, raise); S.headPitch = lerp(0.02, -0.06, raise); S.brow = lerp(0.4, 0.55, raise);
  const turn = easeInOut(range(t, T.turnA, T.turnB));
  S.headYaw = lerp(0, -1.05, turn); S.eyeYaw = lerp(0, -0.35, smooth(range(t, T.turnA - 0.15, T.turnA + 0.6)));
  S.eyePitch = lerp(S.eyePitch, 0.14, turn); S.headPitch = lerp(S.headPitch, -0.12, turn);
  KAEL.apply();

  const shadows = [[K.x, 1, K.z]];
  crowd.forEach(({ c, h }, i) => {
    const s = citizenAt(c, t);
    h.root.position.set(s.x, 0, s.z); h.root.rotation.y = c.dir < 0 ? Math.PI : 0;
    h.state.phase = s.phase; h.state.walk = s.walk;
    const tk = smooth(range(t, T.headsTurn, T.headsTurn + 0.8));
    if (tk > 0) { let yaw = Math.atan2(K.x - s.x, K.z - s.z) - h.root.rotation.y; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)); h.state.headYaw = clamp(yaw, -1.2, 1.2) * tk; h.state.headPitch = 0; }
    else h.state.headYaw = 0;
    h.apply();
    const pulse = 0.75 + 0.25 * Math.sin(t * 3 + c.x);
    const red = smooth(range(t, T.redWave + 0.9, T.redWave + 1.4));
    const ecu = t < 1.2 ? lerp(0.45, 1, smooth(range(t, 0.0, 1.2))) : 1; // the opening ECU must not blow out
    for (const g of h.neural || []) g.material.color.setRGB(lerp(0.3, 3.4, red), lerp(3.2, 0.2, red), lerp(3.8, 0.3, red)).multiplyScalar(pulse * (i === 0 ? ecu : 1));
    if (Math.abs(s.z - K.z) < 14) shadows.push([s.x, 1, s.z]);
  });
  shadows.sort((a, b) => Math.abs(a[2] - K.z) - Math.abs(b[2] - K.z));
  world.groundU.uShadow.value.forEach((v, i) => { const s = shadows[i]; s ? v.set(s[0], s[1], s[2]) : v.set(0, 0, -9999); });

  // drone: descends behind Kael through the threads
  const d = range(t, 12.5, 14.4);
  const dpos = V(K.x + 1.3, lerp(14, 3.3, easeOut(d)), K.z + lerp(4.6, 3.6, d));
  const red = smooth(range(t, T.detect, T.detect + 0.12));
  const frozen = t > T.freezeA && t < T.freezeB;
  const tt = frozen ? T.freezeA : t > T.freezeB ? t - (T.freezeB - T.freezeA) : t;
  const near = crowd.map(({ c }) => citizenAt(c, t)).filter((s) => s.z > K.z - 5 && s.z < K.z + 1.5 && Math.abs(s.x - K.x) < 3.5 && Math.abs(s.x - K.x) > 0.6).sort((a, b) => b.x - a.x).slice(0, 3);
  const pts = near.map((s) => V(s.x, 1.55, s.z));
  while (pts.length < 3) pts.push(V(K.x + 2 - pts.length * 2, 1.55, K.z + 3));
  pts.push(V(K.x, 1.62, K.z));
  const k = clamp((t - 14.3) / (T.tagHunt - 14.3)) * (pts.length - 1);
  const i0 = Math.min(Math.floor(k), pts.length - 2), f0 = smoother(k - i0);
  const look = pts[i0].clone().lerp(pts[i0 + 1], f0);
  if (t > T.tagHunt) look.set(K.x, 1.62, K.z);
  const ground = look.clone(); ground.y = 0.02;
  const yaw = Math.atan2(look.x - dpos.x, look.z - dpos.z);
  const pitch = -Math.atan2(dpos.y - 1.2, Math.hypot(look.x - dpos.x, look.z - dpos.z)) * 0.6;
  const glitch = (t > T.freezeA + 0.1 && t < T.freezeB + 0.1 ? 0.8 * (hash(Math.floor(t * 30)) > 0.35 ? 1 : 0.2) : 0) + (t > 25.5 ? 0.25 + 0.75 * smooth(range(t, 26.2, 27.6)) * (hash(Math.floor(t * 30) * 1.3) > 0.3 ? 1 : 0.3) : 0);
  const beamAmt = smooth(range(t, 14.2, 14.5)) * (t >= T.holo + 0.4 ? 0.55 : 1);
  const eyeW = drone.update({ t: tt, pos: dpos, yaw, pitch, red, glitch, beamAmt, target: ground, beamR: t > T.tagHunt ? 0.75 : 0.95 });
  drone.root.visible = t > 12.4;
  drone.fill.intensity = t > 16 ? 2.5 : 0.8;
  world.groundU.uScanPos.value.copy(ground); world.groundU.uScanR.value = t > T.tagHunt ? 0.75 : 0.95;
  world.groundU.uScanAmt.value = t > 12.4 ? beamAmt : 0;
  world.groundU.uScanCol.value.setRGB(lerp(0.25, 3.0, red), lerp(1.8, 0.15, red), lerp(2.4, 0.2, red));
  redLight.position.copy(eyeW).lerp(V(K.x, 1.6, K.z), 0.55); redLight.intensity = red * 22 * (t > 25.5 ? 0 : 1) * (0.85 + 0.15 * Math.sin(t * 9));

  // hologram (position always valid: the 5b camera aims at it)
  const toK = V(K.x - dpos.x, 0, K.z - dpos.z).normalize();
  hud.panel.position.copy(dpos).addScaledVector(toK, 1.05); hud.panel.position.y -= 0.55;
  hud.panel.lookAt(hud.panel.position.clone().add(toK));
  hud.panel.visible = t > T.holo && t < 25.5;
  if (hud.panel.visible) {
    const hk = smooth(range(t, T.holo, T.holo + 0.25));
    const flick = hash(Math.floor(t * 30) * 2.7) > 0.93 ? 0.45 : 1;
    hud.U.uAmt.value = hk * flick * (t < T.holo + 0.3 ? (hash(Math.floor(t * 60)) > 0.5 ? 1 : 0.2) : 1);
    hud.U.uGlitch.value = (t > T.holo + 1.0 && hash(Math.floor(t * 30) * 5.1) > 0.93 ? 1 : 0);
    hud.U.uTime.value = t; hud.draw(t - T.holo, t);
  }
  // ads stutter when the network panics
  world.adUniforms.uGlitch.value = range(t, 19.4, 19.6) * (1 - range(t, 23.0, 23.5)) * (hash(Math.floor(t * 15)) > 0.25 ? 1 : 0.3) + (t > T.detect && t < T.detect + 0.4 ? 0.5 : 0);

  // the network
  crowd.forEach(({ h }, i) => { const a = implant(h); threads.setDynamic(i, a, a.clone().add(V(Math.sin(i * 2.3) * 8, 330, -70 + Math.cos(i * 1.7) * 10))); });
  const U = threads.U;
  U.uRedWave.value = t > T.redWave ? (t - T.redWave) * 700 : -1;
  U.uRed.value = smooth(range(t, 26.8, 27.2)) * 0;
  U.uPulseRate.value = t > T.crowdStop ? lerp(1, 0.05, range(t, T.crowdStop, T.crowdStop + 0.6)) : 1;
  U.uFlicker.value = t > 26.8 && t < 28 ? 0.5 * smooth(range(t, 26.8, 27.6)) : 0;
  U.uHero.value = 0; U.uGrowHero.value = t < 3 ? lerp(0, 1200, easeIn(range(t, 0.12, 1.1))) : 1e5;
  U.uOthers.value = t < 3 ? smooth(range(t, 0.7, 1.8)) : 1;
  U.uGain.value = 1;
  // E.V.E.'s eye
  const eyeRed = smooth(range(t, T.redWave, T.redWave + 0.6));
  eyeRing.material.color.setRGB(lerp(0.6, 4.0, eyeRed), lerp(2.6, 0.25, eyeRed), lerp(3.6, 0.3, eyeRed));
  eyeCore.material.color.setRGB(lerp(1.5, 4.5, eyeRed), lerp(3.5, 0.4, eyeRed), lerp(4.0, 0.4, eyeRed));
  halo.material.uniforms.uCol.value.setRGB(lerp(0.3, 2.6, eyeRed), lerp(1.8, 0.15, eyeRed), lerp(2.4, 0.2, eyeRed));
  halo.material.uniforms.uAmt.value = t > 26.8 ? (hash(Math.floor(t * 30) * 3.3) > 0.25 ? 1 : 0.25) : 1;
  halo.lookAt(cam.position);
  // rim light follows the story: cyan -> red once he is found
  RIM.uRimCol.value.setRGB(lerp(0.25, 2.4, red * 0.85), lerp(1.6, 0.25, red * 0.85), lerp(2.0, 0.3, red * 0.85));
  return { K, eyeW, look, red };
}

function lightRig(K) {
  const L = world.lights;
  L.cyan.position.set(K.x - 2.4, 2.8, K.z + 1.8); L.cyan.intensity = 18;          // back-left rim
  L.violet.position.set(K.x + 2.4, 2.4, K.z + 2.2); L.violet.intensity = 16;      // back-right rim
  L.top.position.set(K.x + 1.0, 2.6, K.z - 2.2); L.top.intensity = 3.2; L.top.color.set(0xd8e2ff); // soft low key
  L.fill.position.set(K.x, 1.6, K.z - 4); L.fill.intensity = 0.8;
}

// ---------------- overlays ----------------
const COUNT = 41207553;
function drawCounter(t, a, glitchExtra) {
  const g = overlay.g; const alpha = a;
  const y = 1560;
  txt(g, "E.V.E. // NEO-EDEN NEURAL NETWORK", W / 2, y - 92, "600 30px Rajdhani", "#7fefff", 8, "center", alpha * 0.85);
  g.save(); g.globalAlpha = alpha * 0.6; g.fillStyle = "#39e6ff"; g.fillRect(W / 2 - 230, y - 62, 460, 2); g.restore();
  if (!glitchExtra) {
    const n = COUNT - Math.max(0, Math.floor((7.0 - t) * 1.7));
    txt(g, fmt(n), W / 2, y, "700 76px Orbitron", "#bff8ff", 26, "center", alpha);
    txt(g, `${fmt(n)} / ${fmt(n)}  MINDS CONNECTED`, W / 2, y + 70, "600 32px Rajdhani", "#7fefff", 8, "center", alpha * 0.9);
  } else {
    const fl = hash(Math.floor(t * 30) * 1.9) > 0.3;
    txt(g, fmt(COUNT), W / 2, y, "700 76px Orbitron", "#bff8ff", 26, "center", alpha);
    g.save(); g.font = "600 34px Rajdhani"; const w1 = g.measureText(`${fmt(COUNT)} / `).width, w2 = g.measureText(fmt(COUNT + 1)).width; g.restore();
    const x0 = W / 2 - (w1 + w2) / 2;
    txt(g, `${fmt(COUNT)} / `, x0, y + 70, "600 34px Rajdhani", "#7fefff", 8, "left", alpha);
    txt(g, fmt(COUNT + 1), x0 + w1, y + 70, "600 34px Rajdhani", fl ? "#ff2a44" : "#ff8a96", 18, "left", alpha);
    txt(g, "SYNC  99.9999976 %", W / 2, y + 122, "600 30px Rajdhani", "#ff6070", 10, "center", alpha * (fl ? 1 : 0.5));
  }
  overlay.mark();
}
function corners(g, x, y, w, h, col, L = 22, lw = 3) {
  g.save(); g.strokeStyle = col; g.lineWidth = lw; g.shadowColor = col; g.shadowBlur = 10;
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { g.beginPath(); g.moveTo(cx, cy + sy * L); g.lineTo(cx, cy); g.lineTo(cx + sx * L, cy); g.stroke(); }
  g.restore();
}
function drawSensor(t, st) {
  const g = overlay.g;
  // frame + scanlines
  g.save(); g.globalAlpha = 0.07; g.fillStyle = "#9ff"; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1); g.restore();
  corners(g, 40, 40, W - 80, H - 80, "#39e6ff", 70, 4);
  txt(g, "E.V.E. VISION  ·  UNIT 7-31", 80, 100, "600 34px Rajdhani", "#7fefff", 8);
  txt(g, `REC ● ${(t * 1000).toFixed(0).padStart(6, "0")}`, W - 80, 100, "600 34px Rajdhani", hash(Math.floor(t * 2)) > 0.2 ? "#ff4a5a" : "#7fefff", 8, "right");
  txt(g, `SUBJECTS IN VIEW: ${crowd.length + 1}`, 80, H - 100, "600 30px Rajdhani", "#7fefff", 6);
  // tags
  crowd.forEach(({ c, h }, i) => {
    if (!h.root.visible) return;
    const p = toScreen(local(h, 0, 0.02, 0)); if (!p || p.d > 22) return;
    const s = 900 / p.d, x = p.x - s * 0.18, y = p.y - s * 0.22, w = s * 0.36, hh = s * 0.44;
    if (x < 0 || x > W || y < 0 || y > H) return;
    corners(g, x, y, w, hh, "rgba(57,230,255,0.85)", Math.max(8, s * 0.07), 2);
    const id = `CTZ-${(4120 + i * 37) % 9999}-${String((i * 53) % 97).padStart(2, "0")}`;
    if (p.d < 14) { txt(g, id, x, y - 16, `600 ${Math.max(16, Math.min(28, s * 0.07))}px Rajdhani`, "#9ff", 4); txt(g, "LINKED ✓", x, y + hh + 16, `600 ${Math.max(14, Math.min(24, s * 0.06))}px Rajdhani`, "#39e6ff", 4); }
  });
  // Kael
  const kp = toScreen(local(KAEL, 0, 0.02, 0));
  if (kp) {
    const s = 900 / kp.d, w = s * 0.42, hh = s * 0.5, x = kp.x - w / 2, y = kp.y - hh / 2;
    const hunting = t > T.tagHunt && t < T.detect, found = t >= T.detect;
    const col = found ? "#ff2a44" : hunting ? "#ffd25a" : "rgba(57,230,255,0.85)";
    corners(g, x, y, w, hh, col, Math.max(10, s * 0.09), found ? 4 : 2);
    if (hunting || found) {
      const chars = "█▓▒░#?0123456789ABCDEF";
      const scr = Array.from({ length: 9 }, (_, k) => chars[Math.floor(hash(Math.floor(t * 30) * 7 + k) * chars.length)]).join("");
      txt(g, found ? "ID: NULL" : `ID: ${scr}`, x, y - 22, "700 30px Rajdhani", col, 10);
      txt(g, found ? "NO SIGNAL" : "RESOLVING LINK…", x + w / 2, y + hh + 44, found ? "900 52px Orbitron" : "600 30px Rajdhani", col, found ? 28 : 8, "center", found ? (hash(Math.floor(t * 30)) > 0.15 ? 1 : 0.3) : 1);
      // crosshair lock
      g.save(); g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = 0.8;
      g.beginPath(); g.moveTo(kp.x, 0); g.lineTo(kp.x, y - 50); g.moveTo(kp.x, y + hh + 90); g.lineTo(kp.x, H); g.moveTo(0, kp.y); g.lineTo(x - 30, kp.y); g.moveTo(x + w + 30, kp.y); g.lineTo(W, kp.y); g.stroke(); g.restore();
    }
  }
  overlay.mark();
}

// ---------------- shots ----------------
const shotState = {};
function renderCity(t, sh) {
  const st = stage(t); const { K } = st;
  lightRig(K);
  const u = range(t, sh.a, sh.b);
  let ca = 0.0015, red = 0, glitch = 0, flash = 0, exposure = 1.0, useSensor = false;
  const hero = crowd[0].h;
  switch (sh.id) {
    case "1-strings": {
      const I = implant(hero), dir = V(0, 330, -70).normalize();
      const k = easeInOut(range(t, 0.2, 3.0)) * 0.85 + range(t, 0, 3.0) * 0.15;
      const pos = I.clone().add(V(lerp(-0.34, -2.6, k), lerp(0.1, 5.4, k), lerp(0.32, 4.8, k)));
      const tgt = I.clone().add(V(0, -0.02, 0)).addScaledVector(dir, lerp(0.0, 40, Math.pow(k, 1.2)));
      setCam(pos, tgt, lerp(32, 52, k), lerp(0.06, 0, k));
      exposure = lerp(0.55, 1.0, smooth(range(t, 0.0, 1.6)));
      break;
    }
    case "2-mind": {
      const k = easeInOut(u);
      const P0 = V(KAEL_X - 0.15 - 2.4, 6.9, KAEL_Z0 - 0.35 - 3.9 + 4.6);
      const p = cubicBezier(P0, V(-3, 40, 14), V(-6, 150, -20), V(-14, 205, -75), lerp(u, k, 0.7), new THREE.Vector3());
      const tgt = V(-0.6, 6.0, -10).lerp(SPIRE_EYE, smooth(range(u, 0.0, 0.85)));
      setCam(p, tgt, lerp(50, 46, u));
      break;
    }
    case "3a-track": {
      const d = lerp(2.5, 1.85, easeInOut(u));
      setCam(V(K.x - 0.45, 1.02, K.z - d), V(K.x - 0.02, 1.62, K.z), 40);
      break;
    }
    case "3b-gap": {
      // side tracking: strings above every head, nothing above his
      const k = easeInOut(u);
      setCam(V(K.x + lerp(0.5, 0.35, k), lerp(0.75, 0.6, k), K.z + lerp(2.4, 1.9, k)), V(K.x - 0.2, lerp(3.2, 5.0, k), K.z - 4.5), 50, lerp(-0.04, 0.02, k));
      break;
    }
    case "4a-descent": {
      setCam(V(K.x - 0.9, 0.85, K.z - 3.0), V(K.x + 0.9, lerp(8.0, 3.4, easeOut(range(t, 12.5, 14.4))), K.z + 3.6), 46);
      break;
    }
    case "4b-sensor": {
      useSensor = true;
      const fwd = new THREE.Vector3(); drone.eye.getWorldDirection(fwd);
      const lock = smooth(range(t, T.tagHunt, T.tagHunt + 0.35));
      setCam(st.eyeW.clone().addScaledVector(fwd, 0.25), st.look, lerp(40, 22, lock), (hash(Math.floor(t * 8)) - 0.5) * 0.004);
      glitch = (Math.abs(t - T.detect) < 0.07 ? 0.7 : 0) + (t > T.detect ? 0.06 : 0);
      flash = t > T.detect ? 0.25 * Math.exp(-(t - T.detect) * 10) : 0;
      exposure = 1.1;
      break;
    }
    case "4c-face": {
      setCam(local(KAEL, 0.12, -0.05, 0.6 - 0.08 * u), local(KAEL, 0, 0.01, 0), 34);
      break;
    }
    case "5a-wave": {
      setCam(V(K.x + 0.42, 1.86, K.z + 1.55 - 0.35 * u), V(K.x - 0.15, 1.75, K.z - 14), 42);
      break;
    }
    case "5b-holo": {
      setCam(V(K.x - 1.1 + 0.2 * u, 1.45, K.z - 2.6 + 0.35 * u), hud.panel.position.clone().add(V(0, -0.25, 0)), 34);
      break;
    }
    case "5c-turn": {
      const a = easeInOut(u), hp = local(KAEL, 0, 0, 0), ang = lerp(-0.25, 0.45, a), dist = lerp(1.6, 0.55, a);
      setCam(hp.clone().add(V(Math.sin(ang) * dist + 0.1, lerp(-0.25, -0.05, a), -Math.cos(ang) * dist)), hp.clone().add(V(0.02, -0.02, 0)), lerp(36, 30, a), lerp(0.04, -0.03, a));
      break;
    }
    case "6a-red-eye": {
      const fwd = new THREE.Vector3(); drone.eye.getWorldDirection(fwd);
      setCam(st.eyeW.clone().addScaledVector(fwd, lerp(0.7, 0.42, easeInOut(u))), st.eyeW, 30);
      glitch = 0.1 + smooth(range(t, 26.2, 26.8)) * (hash(Math.floor(t * 30)) > 0.45 ? 0.6 : 0.1);
      break;
    }
    case "6b-spire": {
      const p = V(-40 + 12 * u, 430, -210 - 30 * u);
      setCam(p, SPIRE_EYE.clone().add(V(0, -6, 0)), lerp(30, 22, easeInOut(u)), 0.03);
      glitch = smooth(range(t, 27.1, 27.95)) * (hash(Math.floor(t * 30) * 1.7) > 0.4 ? 0.8 : 0.15);
      flash = t > 27.9 ? 0.3 : 0;
      break;
    }
  }
  // never let a passer-by walk through the lens (except the implant close-up)
  for (const { h } of crowd) { const p = h.root.position; h.root.visible = (sh.id === "1-strings" && h === hero) || Math.hypot(p.x - cam.position.x, p.z - cam.position.z) > 0.75; }
  if (t > T.detect && t < 19) red = 0.06;
  threads.commit(t, cam);
  world.tick(t, cam);
  sensor.U.uTime.value = t; sensor.U.uKaelRed.value = smooth(range(t, T.detect, T.detect + 0.1));
  if (useSensor) { sensor.on(); scene.background = new THREE.Color(0); }
  else renderReflection(renderer, scene, cam, world);
  post.renderPass.scene = scene; post.renderPass.camera = cam;
  renderer.toneMappingExposure = exposure;
  Object.assign(shotState, { ca, red, glitch, flash, useSensor, st });
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
  Object.assign(shotState, { ca: 0.001, red: 0, glitch: 0, flash: 0, useSensor: false });
}

function renderAt(f) {
  const t = f / FPS, sh = shotAt(t);
  overlay.clear();
  scene.background = new THREE.Color(0x020309);
  if (sh.id === "7-title") renderTitle(t); else renderCity(t, sh);
  const gu = post.grade;
  gu.uTime.value = t; gu.uCA.value = shotState.ca; gu.uRedTint.value = shotState.red; gu.uGlitch.value = shotState.glitch; gu.uFlash.value = shotState.flash;
  gu.uFade.value = 1; gu.uGrain.value = sh.id === "7-title" ? 0.035 : 0.055; gu.uVig.value = 1.0;
  post.bloom.strength = shotState.useSensor ? 0.9 : sh.id === "7-title" ? 0.35 : 0.75;
  post.composer.render();
  if (shotState.useSensor) sensor.off();
  // overlays
  if (sh.id === "2-mind") drawCounter(t, smooth(range(t, 4.2, 4.8)) * (1 - smooth(range(t, 7.2, 7.5))), false);
  if (sh.id === "3b-gap" && t > 11.15) drawCounter(t, smooth(range(t, 11.15, 11.35)) * (hash(Math.floor(t * 30) * 4.4) > 0.08 ? 1 : 0.2), true);
  if (sh.id === "4b-sensor") drawSensor(t, shotState.st);
  if (sh.id === "7-title" && t > T.tag) {
    const k = range(t, T.tag, T.tag + 0.4), on = k >= 1 || hash(Math.floor(t * 30) * 6.1) > 0.45;
    txt(overlay.g, "41,207,553 / 41,207,554", W / 2, H * 0.47 + 250, "600 30px Rajdhani", "#ff8a96", 8, "center", on ? 0.75 * Math.min(1, k * 2) : 0.1);
    txt(overlay.g, "1  UNACCOUNTED", W / 2, H * 0.47 + 300, "700 36px Orbitron", "#ff2a44", 20, "center", on ? Math.min(1, k * 2) : 0.15);
    overlay.mark();
  }
  overlay.render(renderer);
  return { t, shot: sh.id };
}

window.renderFrame = (f) => { renderAt(f); return canvas.toDataURL("image/png"); };
window.__shots = SHOTS; window.__ready = true;
if (!new URLSearchParams(location.search).has("render")) {
  const hudEl = document.getElementById("hud"); let f = 0, last = 0;
  const loop = (now) => { if (now - last > 1000 / FPS) { last = now; const r = renderAt(f); hudEl.textContent = `frame ${f}  ${r.t.toFixed(2)}s  ${r.shot}`; f = (f + 1) % TOTAL_FRAMES; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  addEventListener("keydown", (e) => { if (e.key === "ArrowRight") f = Math.min(TOTAL_FRAMES - 1, f + 15); if (e.key === "ArrowLeft") f = Math.max(0, f - 15); });
}
