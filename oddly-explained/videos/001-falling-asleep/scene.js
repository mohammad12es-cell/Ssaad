// ODDLY EXPLAINED — VIDEO 001 — "What happens when you fall asleep?"
// 3D layer (no text). Fully deterministic: every value is a function of t (seconds).
//
//  0.0– 4.0  HOOK    brain floats, network lights up node by node, pulse sweeps across, rapid push-in
//  4.0– 9.0  DIVE    through the surface into a field of neurons; amber -> cyan; spikes travel along axons
//  9.0–15.0  NREM    synchronised slow up/down waves across the field; stylised trace N1 -> N2 (spindles, K-complex) -> N3 (slow waves)
// 15.0–21.0  REM     desynchronised fast activity; dream fragments (island, clock, distant figure, colour) — artistic
// 21.0–26.0  MEMORY  luminous memory vignettes drift, then settle into a linked lattice — visual metaphor
// 26.0–30.0  REVEAL  pull back out to the whole glowing brain, fade, end card (text layer)
import * as THREE from 'three';
import { buildBrain } from '/engine/lib/brain.js';
import { buildNeuronField, buildMotes, buildShafts } from '/engine/lib/neurons.js';
import { buildIsland, buildClock, buildSilhouette, buildBlobs } from '/engine/lib/dreams.js';
import { buildMemories } from '/engine/lib/memory.js';
import { RNG, Simplex3, GLSL_NOISE, clamp, smooth, lerp, easeInOut, easeOut, easeIn, easeOutExpo } from '/engine/lib/noise.js';

const seg = (t, a, b) => clamp((t - a) / (b - a));
const win = (t, a, b, fi = 0.5, fo = 0.5) => smooth(a, a + fi, t) * (1 - smooth(b - fo, b, t));
const AMBER = new THREE.Color(0xffa24a), CYAN = new THREE.Color(0x3cc8ff), DEEPBLUE = new THREE.Color(0x2f7dff), ICE = new THREE.Color(0x8fe6ff);

function backdrop(colTop, colBot) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTop: { value: new THREE.Color(colTop) }, uBot: { value: new THREE.Color(colBot) }, uAmp: { value: 1 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `${GLSL_NOISE} uniform float uTime, uAmp; uniform vec3 uTop, uBot; varying vec3 vD;
      void main(){ float h = vD.y * 0.5 + 0.5; vec3 c = mix(uBot, uTop, smoothstep(0.1, 0.9, h));
        float n = snoise(vD * 2.2 + vec3(0.0, 0.0, uTime * 0.03)) * 0.5 + 0.5; float n2 = snoise(vD * 6.0 - uTime * 0.02) * 0.5 + 0.5;
        c *= 0.55 + 0.7 * n * n + 0.2 * n2; gl_FragColor = vec4(c * uAmp, 1.0); }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), m); s.frustumCulled = false; s.renderOrder = -10;
  return { mesh: s, mat: m };
}

function halo(color, size) {
  const m = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(color) }, uAmp: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uAmp; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float g = exp(-r * r * 5.0) * 0.6 + exp(-r * r * 30.0) * 0.4; gl_FragColor = vec4(uCol * g * uAmp, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
}

export async function create(stage) {
  const { W, H, post } = stage;
  const q = new URLSearchParams(location.search);
  await document.fonts.load('600 20px Montserrat');

  // ---------------------------------------------------------------- BRAIN SCENE
  const A = new THREE.Scene();
  const camA = new THREE.PerspectiveCamera(34, W / H, 0.01, 120);
  const bdA = backdrop(0x0a1630, 0x010207); A.add(bdA.mesh);
  const brain = buildBrain({ detail: Number(q.get('detail') || 104), nodes: 850 });
  const pivot = new THREE.Group(); pivot.add(brain.group); A.add(pivot);
  const haloA = halo(0x1b6dff, 5.5); haloA.position.set(0, 0.1, -1.6); haloA.material.uniforms.uAmp.value = 0.75; A.add(haloA);
  const motesA = buildMotes({ seed: 8, count: 900, box: [5, 7, 4, -6] }); A.add(motesA.points);
  const surfA = new THREE.Vector3(0.64, 0.22, 0.02);   // right lateral parietal: dive-in point
  const surfB = new THREE.Vector3(-0.42, 0.5, 0.42);   // left frontal: pull-back start point

  // ---------------------------------------------------------------- MICRO SCENE
  const B = new THREE.Scene();
  const camB = new THREE.PerspectiveCamera(50, W / H, 0.02, 90);
  const bdB = backdrop(0x061024, 0x000104); bdB.mat.uniforms.uAmp.value = 0.7; B.add(bdB.mesh);
  // camera path through tissue: speed profile integrated numerically so it is the same for any frame
  const vel = (t) => {
    let v = lerp(0.85, 0.5, smooth(8.6, 9.6, t));
    v = lerp(v, 1.05, smooth(14.6, 15.6, t));
    v = lerp(v, 0.3, smooth(20.6, 21.8, t));
    v += 9 * Math.exp(-Math.max(0, t - 4.0) * 4.5) * (t >= 4.0 ? 1 : 0);
    return v;
  };
  const sCache = new Map();
  const sAt = (t) => {
    const key = Math.round(t * 600); if (sCache.has(key)) return sCache.get(key);
    let s = 0; const dt = 1 / 600; for (let x = 4.0; x < t; x += dt) s += vel(x) * dt;
    s -= 3.2 * easeIn(seg(t, 25.25, 25.95)); // snap back out
    sCache.set(key, s); return s;
  };
  const pathAt = (s) => new THREE.Vector3(0.45 * Math.sin(s * 0.21), 0.3 * Math.sin(s * 0.17 + 1.0), 6 - s);
  const camAt = (t) => pathAt(sAt(t));

  const rng = new RNG(2024); const cells = []; const heroes = [];
  // portrait frame is narrow: heroes sit mostly above/below the path, camera turns toward them as it glides past
  const heroTimes = [[5.5, 0.5, 0.72], [7.6, -0.55, -0.78], [10.0, 0.5, -0.8], [12.1, -0.5, 0.75], [14.2, 0.45, 0.8]];
  for (const [th, ox, oy] of heroTimes) { const c = camAt(th); const p = new THREE.Vector3(c.x + ox, c.y + oy, c.z - 3.6); cells.push({ pos: p, scale: 0.95 }); heroes.push(p); }
  for (let i = 0; i < 56; i++) {
    const z = 9 - i * 0.6 + rng.range(-0.3, 0.3); const pc = pathAt(6 - z);
    const a = rng.range(0, Math.PI * 2), r = rng.range(2.1, 4.4);
    const p = new THREE.Vector3(pc.x + Math.cos(a) * r * 0.85, pc.y + Math.sin(a) * r * 1.25, z);
    if (heroes.some((h) => h.distanceTo(p) < 1.4)) continue;
    cells.push({ pos: p, scale: rng.range(0.85, 1.3) });
  }
  for (let i = 0; i < 12; i++) { const z = 6 - i * 2.6; const pc = pathAt(6 - z); const a = rng.range(0, 6.28); cells.push({ pos: new THREE.Vector3(pc.x + Math.cos(a) * 6.5, pc.y + Math.sin(a) * 8, z - 3), scale: 2.0 }); }
  const avoid = (p, d) => {
    const pc = pathAt(6 - p.z); const dx = p.x - pc.x, dy = p.y - pc.y; const r = Math.hypot(dx, dy); const R = 1.05;
    if (r < R) { const k = R / Math.max(r, 1e-3); p.x = pc.x + dx * k; p.y = pc.y + dy * k; d.x += dx / Math.max(r, 1e-3) * 0.8; d.y += dy / Math.max(r, 1e-3) * 0.8; return true; }
    return false;
  };
  const field = buildNeuronField({ cells, seed: 77, avoid }); B.add(field.mesh);
  const motesB = buildMotes({ seed: 9, count: 2600, box: [6, 9, 10, -26] }); B.add(motesB.points);
  const shaftsB = buildShafts({ seed: 5, count: 7, area: [-5, 5, 6, -24], color: 0x3fa8ff }); B.add(shaftsB.group);

  // dream fragments (REM)
  const island = buildIsland(); const clock = buildClock(); const figure = buildSilhouette(); const blobs = buildBlobs();
  const place = (obj, t, off) => { const c = camAt(t); obj.position.set(c.x + off[0], c.y + off[1], c.z + off[2]); };
  place(island.object, 16.35, [-0.35, 0.3, -3.6]); island.object.scale.setScalar(0.7); island.object.rotation.set(0.25, 0.4, 0.05);
  place(clock.object, 18.0, [0.3, 0.0, -3.4]); clock.object.scale.setScalar(0.55); clock.object.rotation.set(0.1, -0.45, 0.15);
  place(figure.object, 19.5, [0.1, -0.95, -7.5]); figure.object.scale.setScalar(0.55);
  place(blobs.object, 20.5, [0, 0.1, -3.6]); blobs.object.scale.setScalar(0.7);
  for (const o of [island.object, clock.object, figure.object, blobs.object]) B.add(o);

  // memory lattice
  const mem = buildMemories({ rows: 6, cols: 3 });
  const memC = camAt(23.6); mem.group.position.set(memC.x, memC.y + 0.15, memC.z - 5.0); B.add(mem.group);

  // ---------------------------------------------------------------- HUD (stylised EEG-like trace)
  const ctx = stage.hudCtx; const S = W / 1080;
  const nz = new Simplex3(55);
  const stageOf = (tau) => (tau < 10.9 ? 'N1' : tau < 12.9 ? 'N2' : tau < 15.0 ? 'N3' : 'REM');
  function eeg(tau) {
    // Shapes follow textbook descriptions (N1: low-amplitude mixed/theta; N2: sleep spindles + K-complex;
    // N3: high-amplitude slow waves; REM: low-amplitude mixed-frequency, wake-like). Time axis is compressed.
    const st = stageOf(tau); const n = nz.noise(tau * 30, 0, 0) * 0.08;
    if (st === 'N1') return 0.18 * Math.sin(tau * 2 * Math.PI * 5.5) + 0.1 * Math.sin(tau * 2 * Math.PI * 7.3 + 1) + 0.08 * Math.sin(tau * 2 * Math.PI * 11) + n;
    if (st === 'N2') {
      let v = 0.16 * Math.sin(tau * 2 * Math.PI * 5) + 0.06 * Math.sin(tau * 2 * Math.PI * 8.3) + n;
      for (const c of [11.35, 12.45]) { const e = Math.exp(-Math.pow((tau - c) / 0.18, 2)); v += 0.32 * e * Math.sin(tau * 2 * Math.PI * 13); }
      const k = tau - 11.85; v += -0.95 * Math.exp(-Math.pow((k - 0.05) / 0.07, 2)) + 0.55 * Math.exp(-Math.pow((k - 0.28) / 0.13, 2));
      return v;
    }
    if (st === 'N3') { const a = smooth(12.9, 13.5, tau); return a * (0.8 * Math.sin(tau * 2 * Math.PI * 1.2 + 0.4) + 0.2 * Math.sin(tau * 2 * Math.PI * 1.9)) + 0.08 * Math.sin(tau * 2 * Math.PI * 9) + n; }
    return 0.12 * Math.sin(tau * 2 * Math.PI * 6.5) + 0.08 * Math.sin(tau * 2 * Math.PI * 17 + 2) + 0.06 * Math.sin(tau * 2 * Math.PI * 23) + n * 1.4
      + 0.18 * Math.max(0, Math.sin(tau * 2 * Math.PI * 0.9)) * ((tau * 3) % 1); // occasional sawtooth-like bursts
  }
  function drawHud(t) {
    ctx.clearRect(0, 0, W, H);
    const a = win(t, 9.25, 21.0, 0.6, 0.6); if (a <= 0.001) return;
    const x0 = 110 * S, x1 = 970 * S, yc = 1262 * S, hh = 62 * S, win_s = 2.4;
    ctx.save(); ctx.globalAlpha = a;
    // glass panel
    const grd = ctx.createLinearGradient(0, yc - hh * 1.9, 0, yc + hh * 1.4); grd.addColorStop(0, 'rgba(10,30,60,0.0)'); grd.addColorStop(0.5, 'rgba(10,30,60,0.32)'); grd.addColorStop(1, 'rgba(10,30,60,0.0)');
    ctx.fillStyle = grd; ctx.fillRect(x0 - 30 * S, yc - hh * 1.9, x1 - x0 + 60 * S, hh * 3.3);
    // feather the panel horizontally so it has no hard side edges
    const fx = ctx.createLinearGradient(x0 - 30 * S, 0, x1 + 30 * S, 0); fx.addColorStop(0, 'rgba(0,0,0,0)'); fx.addColorStop(0.18, 'rgba(0,0,0,1)'); fx.addColorStop(0.82, 'rgba(0,0,0,1)'); fx.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = fx; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(120,200,255,0.16)'; ctx.lineWidth = 1 * S;
    for (let i = 0; i <= 8; i++) { const x = x0 + (x1 - x0) * i / 8; ctx.beginPath(); ctx.moveTo(x, yc - hh); ctx.lineTo(x, yc + hh); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
    // trace
    const N = 520; const col = t < 15 ? 'rgba(110,215,255,1)' : 'rgba(255,190,120,1)';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [lw, al] of [[7 * S, 0.12], [3.2 * S, 0.35], [1.6 * S, 1.0]]) {
      ctx.beginPath(); ctx.strokeStyle = col; ctx.globalAlpha = a * al; ctx.lineWidth = lw;
      for (let i = 0; i <= N; i++) {
        const u = i / N; const tau = t - win_s * (1 - u); const x = x0 + (x1 - x0) * u;
        const fadeIn = smooth(9.25, 9.6, tau);
        const y = yc - eeg(tau) * hh * fadeIn;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // write head
    const yh = yc - eeg(t) * hh; ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 18 * S;
    ctx.beginPath(); ctx.arc(x1, yh, 5 * S, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    // stage labels
    const cur = stageOf(t); ctx.font = `600 ${24 * S}px Montserrat`; ctx.textBaseline = 'middle';
    const labels = ['N1', 'N2', 'N3', 'REM']; let x = x0;
    for (const l of labels) {
      const on = l === cur; ctx.globalAlpha = a * (on ? 1 : 0.32); ctx.fillStyle = on ? (l === 'REM' ? '#ffc27a' : '#8fe6ff') : '#9fb6d0';
      ctx.fillText(l, x, yc - hh * 1.45); const w = ctx.measureText(l).width;
      if (on) { ctx.fillRect(x, yc - hh * 1.45 + 18 * S, w, 2.5 * S); }
      x += w + 34 * S;
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- FRAME
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function frameBrain(t) {
    const P = post.params;
    const ry = -0.55 + 0.1 * t; pivot.rotation.set(0.08 + 0.03 * Math.sin(t * 0.7), ry, 0.0);
    pivot.position.y = 0.04 * Math.sin(t * 0.9);
    pivot.updateMatrixWorld(true);
    const U = brain.material.uniforms; const L = brain.net.lineMat.uniforms, Pt = brain.net.ptMat.uniforms;
    U.uTime.value = t; L.uTime.value = t; Pt.uTime.value = t;
    motesA.material.uniforms.uTime.value = t; motesA.material.uniforms.uH.value = H; bdA.mat.uniforms.uTime.value = t;
    let camPos, look;
    if (t < 4.2) {
      // HOOK: reveal network node by node, pulse sweep at ~1.7s, then rapid push into the cortex
      const reveal = lerp(-0.1, 1.9, easeInOut(seg(t, 0.15, 2.6)));
      L.uReveal.value = reveal; Pt.uReveal.value = reveal;
      const wave = lerp(-0.3, 2.2, seg(t, 1.55, 2.9)); L.uWave.value = wave; Pt.uWave.value = wave;
      L.uAmp.value = 1.0; Pt.uAmp.value = 1.0;
      U.uWaveDir.value.set(0, 0, 1); U.uWaveFront.value = lerp(-1.1, 1.1, seg(t, 1.55, 2.9)); U.uWaveAmp.value = 1.3 * win(t, 1.5, 3.0, 0.15, 0.3);
      U.uGlow.value = 0.25 + 0.35 * win(t, 1.5, 3.2, 0.2, 0.8); U.uInner.value = 0.35 + 0.4 * seg(t, 0.5, 3.0);
      const d = lerp(7.3, 5.7, easeOut(seg(t, 0, 2.9))); const az = lerp(1.05, 0.72, easeInOut(seg(t, 0, 3.0))); const el = lerp(0.32, 0.18, seg(t, 0, 3));
      const orbit = new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
      const S0 = surfA.clone().applyMatrix4(pivot.matrixWorld);
      const nrm = S0.clone().sub(tmp.set(0, 0, 0).applyMatrix4(pivot.matrixWorld)).normalize();
      const k = Math.pow(seg(t, 2.75, 4.05), 2.6);
      camPos = orbit.clone().lerp(S0.clone().addScaledVector(nrm, 0.015), k);
      look = new THREE.Vector3(0, 0, 0).lerp(S0, Math.min(1, k * 1.4));
      Object.assign(P, { focus: lerp(d - 0.45, 0.25, k), focusRange: lerp(2.2, 0.5, k), maxCoc: 0.55, exposure: 1.0 + 0.6 * k,
        bloom: 0.85 + 0.8 * k, bloomRadius: 0.6, bloomThreshold: 0.62, zoom: 0.55 * Math.pow(seg(t, 3.3, 4.05), 1.5), flash: 0.55 * Math.pow(seg(t, 3.8, 4.05), 2),
        fade: 1 - smooth(0.0, 0.25, t), ca: 0.002 + 0.006 * k });
      bdA.mat.uniforms.uAmp.value = 1;
    } else {
      // REVEAL: start on the cortex surface and pull back to the whole brain
      L.uReveal.value = 3; Pt.uReveal.value = 3; L.uAmp.value = 1.15; Pt.uAmp.value = 1.15;
      const wave = ((t - 26.0) * 1.25) % 2.6 - 0.3; L.uWave.value = wave; Pt.uWave.value = wave;
      U.uWaveDir.value.set(0, 0, -1); U.uWaveFront.value = lerp(-1.1, 1.1, seg(t, 26.3, 27.6)); U.uWaveAmp.value = 0.9 * win(t, 26.2, 27.8, 0.2, 0.4);
      U.uGlow.value = 0.45; U.uInner.value = 0.75;
      const k = easeOutExpo(seg(t, 25.95, 28.0));
      const az = lerp(-0.85, -0.45, seg(t, 26, 30)); const el = 0.2; const d = 6.3 + 0.25 * seg(t, 28, 30);
      const orbit = new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d + 0.05, Math.cos(az) * Math.cos(el) * d);
      const S1 = surfB.clone().applyMatrix4(pivot.matrixWorld);
      const nrm = S1.clone().normalize();
      const start = S1.clone().addScaledVector(nrm, 0.04);
      camPos = start.clone().lerp(orbit, k);
      look = S1.clone().lerp(new THREE.Vector3(0, -0.02, 0), Math.min(1, k * 1.3));
      Object.assign(P, { focus: camPos.length() * 0.97, focusRange: lerp(0.6, 2.4, k), maxCoc: 0.5, exposure: lerp(1.25, 1.05, k), bloom: lerp(1.2, 0.95, k), bloomRadius: 0.6, bloomThreshold: 0.6,
        zoom: 0.5 * (1 - smooth(25.95, 26.9, t)), flash: 0.5 * Math.pow(1 - smooth(25.95, 26.3, t), 2), ca: 0.002 + 0.005 * (1 - k),
        fade: 0.72 * smooth(28.0, 28.7, t) + 0.28 * smooth(29.1, 29.75, t) });
    }
    camA.position.copy(camPos); camA.lookAt(look);
    motesA.material.uniforms.uFocus.value = P.focus; motesA.material.uniforms.uRange.value = P.focusRange * 1.5;
    Object.assign(P, { vignette: 0.62, grain: 0.022, lift: [0.002, 0.006, 0.016], saturation: 1.0, tint: [1, 1, 1] });
    return { scene: A, camera: camA };
  }

  function frameMicro(t) {
    const P = post.params; const U = field.material.uniforms;
    const s = sAt(t); const c = pathAt(s); const ahead = pathAt(s + 3);
    const sway = new THREE.Vector3(0.25 * Math.sin(t * 0.5), 0.18 * Math.sin(t * 0.37 + 1), 0);
    camB.position.copy(c);
    const look = ahead.clone().add(sway);
    // REM: gentle roll + slight look toward the passing fragments; MEMORY: lock onto lattice
    // turn partly toward the hero neuron currently being passed
    { let hw = 0; const hl = new THREE.Vector3(); for (const h of heroes) { const d = h.z < c.z ? c.z - h.z : -1; if (d > 0.5) { const w = Math.exp(-Math.pow((d - 2.6) / 1.3, 2)); hl.addScaledVector(h, w); hw += w; } }
      if (hw > 1e-3) look.lerp(hl.multiplyScalar(1 / hw), Math.min(1, hw) * 0.45); }
    const memLook = mem.group.position.clone();
    look.lerp(memLook, smooth(21.0, 22.6, t) * (1 - smooth(25.2, 25.8, t)));
    camB.up.set(Math.sin(0.06 * Math.sin(t * 0.8) * smooth(15, 16, t) * (1 - smooth(20.5, 21.5, t))), 1, 0).normalize();
    camB.lookAt(look);
    camB.updateMatrixWorld(true);
    // activity modes
    const nrem = smooth(8.9, 10.0, t) * (1 - smooth(14.7, 15.4, t));
    const rem = smooth(14.8, 15.6, t) * (1 - smooth(20.8, 21.8, t));
    const memo = smooth(20.8, 21.8, t);
    U.uTime.value = t;
    U.uFire.value = 1.0 * (1 - nrem) * (1 - rem * 0.4) * (1 - memo * 0.6);
    U.uSync.value = nrem * 1.1; U.uSyncFreq.value = 0.55; U.uSyncK.value = 0.22;
    U.uDesync.value = rem;
    U.uMix.value = smooth(4.6, 8.6, t);
    U.uColB.value.copy(CYAN).lerp(DEEPBLUE, nrem * 0.6).lerp(ICE, rem * 0.25);
    U.uColA.value.copy(AMBER);
    if (rem > 0 || memo > 0) U.uMix.value = lerp(U.uMix.value, 0.62, rem) * (1 - memo) + memo * 0.45;
    U.uBase.value = 0.5 + 0.04 * nrem;
    U.uFogDensity.value = 0.085 + 0.05 * rem + 0.07 * memo;
    U.uFogColor.value.set(0x02050d);
    for (const m of shaftsB.mats) { m.uniforms.uTime.value = t; m.uniforms.uAmp.value = 1 + nrem * 0.6; m.uniforms.uCol.value.copy(U.uColB.value); }
    const mu = motesB.material.uniforms; mu.uTime.value = t; mu.uH.value = H; mu.uMix.value = 0.25 + 0.6 * U.uMix.value; mu.uAmp.value = 0.85;
    bdB.mat.uniforms.uTime.value = t;
    // focus: soft-weight heroes at ~3 units ahead; in REM/MEMORY track fragments / lattice
    const fwd = tmp.set(0, 0, -1).applyQuaternion(camB.quaternion);
    let fs = 0.15 * 3.2, ws = 0.15;
    for (const h of heroes) { const d = tmp2.copy(h).sub(c).dot(fwd); if (d > 0.6) { const w = Math.exp(-Math.pow((d - 3.0) / 1.1, 2)); fs += w * d; ws += w; } }
    let focus = fs / ws;
    const dreamTargets = [[island.object, 15.0, 17.35], [clock.object, 16.8, 19.2], [figure.object, 18.4, 20.6], [blobs.object, 19.6, 21.4]];
    for (const [o, a, b] of dreamTargets) { const w = win(t, a, b, 0.5, 0.5); focus = lerp(focus, tmp2.copy(o.position).sub(c).dot(fwd), w * 0.9); }
    focus = lerp(focus, mem.group.position.distanceTo(c), smooth(21.0, 22.0, t));
    // dream fragments: dissolve in/out
    const show = (u, a, b) => { u.uShow.value = win(t, a, b, 0.8, 0.7); u.uTime.value = t; return u.uShow.value; };
    island.object.visible = show(island.uniforms, 15.0, 17.35) > 0.001; island.object.rotation.y = 0.4 + t * 0.12;
    clock.object.visible = show(clock.uniforms, 16.7, 19.3) > 0.001; clock.uniforms.uBend.value = 0.3 + 0.5 * seg(t, 16.7, 19.0);
    clock.hands[0].rotation.z = -t * 0.6; clock.hands[1].rotation.z = -t * 2.6;
    figure.uniforms.uShow.value = win(t, 18.3, 20.7, 0.9, 0.7); figure.object.visible = figure.uniforms.uShow.value > 0.001; figure.halo.material.uniforms.uTime.value = t;
    figure.halo.lookAt(camB.position);
    blobs.object.visible = show(blobs.uniforms, 19.5, 21.6) > 0.001;
    for (const b of blobs.blobs) b.mesh.position.copy(b.base).add(tmp.set(Math.sin(t * 0.8 + b.ph) * 0.3, Math.cos(t * 0.6 + b.ph) * 0.3, 0));
    // memory lattice
    const memAmp = win(t, 20.9, 26.2, 0.9, 0.4);
    mem.group.visible = memAmp > 0.001;
    mem.update(t, easeInOut(seg(t, 22.3, 24.7)), seg(t, 23.3, 25.0), memAmp * 1.1);
    mem.group.quaternion.copy(camB.quaternion);
    // post
    const enter = 1 - smooth(4.03, 4.45, t);
    const exit = smooth(25.55, 25.95, t);
    Object.assign(P, { focus: Math.max(0.6, focus), focusRange: 2.0 + 0.4 * memo + 2.5 * (1 - smooth(4.4, 5.8, t)), maxCoc: 0.75, exposure: 1.0 + 0.25 * enter + 0.15 * exit - 0.08 * memo,
      bloom: 0.85 + 0.4 * enter + 0.15 * rem - 0.15 * memo + 0.35 * exit, bloomRadius: 0.62, bloomThreshold: 0.62, zoom: 0.5 * Math.pow(enter, 2.0) + 0.4 * Math.pow(exit, 1.6),
      flash: 0.5 * (1 - smooth(4.03, 4.2, t)) + 0.45 * Math.pow(smooth(25.8, 25.95, t), 2), ca: 0.0022 + 0.006 * (enter + exit) + 0.0015 * rem, fade: 0,
      vignette: 0.6 + 0.08 * nrem, grain: 0.024, lift: [0.002, 0.006, 0.018], saturation: 1.0 + 0.1 * rem, tint: [1, 1, 1] });
    mu.uFocus.value = P.focus; mu.uRange.value = P.focusRange;
    if (dbg.includes('nopost')) Object.assign(P, { zoom: 0, flash: 0, bloom: 0, maxCoc: 0, exposure: 1 });
    if (dbg.includes('nodof')) P.maxCoc = 0;
    if (dbg.includes('nobloom')) P.bloom = 0;
    return { scene: B, camera: camB };
  }

  const dbg = q.get('dbg') || '';
  if (dbg.includes('noshaft')) shaftsB.group.visible = false;
  if (dbg.includes('nomote')) motesB.points.visible = false;
  if (dbg.includes('nobd')) bdB.mesh.visible = false;
  return {
    frame(t) {
      drawHud(t);
      return t < 4.05 || t >= 25.95 ? frameBrain(t) : frameMicro(t);
    },
  };
}
