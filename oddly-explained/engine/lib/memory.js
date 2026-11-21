// ODDLY EXPLAINED engine — "memory fragments" visual metaphor.
// Glowing, softly-focused vignettes (sunset, tree, house, face profile, book, waves...) drawn procedurally
// on canvases. They drift chaotically, then settle into an organised, linked lattice — a metaphor for
// sleep-related memory processing, deliberately styled as luminous cards (not anatomy, not "stored objects").
import * as THREE from 'three';
import { RNG } from './noise.js';

const AMBER = '#ffb36b', CYAN = '#4fd2ff', DEEP = '#06101f';

function vignette(kind, rng) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 192);
  const warm = rng.next() < 0.55;
  sky.addColorStop(0, warm ? '#1a2a52' : '#0b1a33'); sky.addColorStop(0.65, warm ? '#c9774a' : '#2b6f9e'); sky.addColorStop(1, warm ? '#ffcf8a' : '#9be3ff');
  g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
  g.save(); g.filter = 'blur(1.5px)';
  const ink = 'rgba(6,12,24,0.92)';
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 6; g.lineCap = 'round';
  switch (kind) {
    case 'sunset': { g.fillStyle = '#fff0c4'; g.beginPath(); g.arc(128, 128, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = ink; g.fillRect(0, 135, 256, 60); g.fillStyle = 'rgba(255,220,160,0.6)'; for (let i = 0; i < 6; i++) g.fillRect(100 - i * 3, 142 + i * 8, 56 + i * 6, 2); break; }
    case 'tree': { g.fillRect(0, 160, 256, 40); g.fillRect(122, 90, 12, 75); g.beginPath(); g.arc(128, 80, 44, 0, Math.PI * 2); g.arc(96, 98, 28, 0, Math.PI * 2); g.arc(160, 98, 30, 0, Math.PI * 2); g.fill(); break; }
    case 'house': { g.fillRect(0, 165, 256, 30); g.fillRect(80, 105, 96, 62); g.beginPath(); g.moveTo(70, 108); g.lineTo(128, 62); g.lineTo(186, 108); g.fill(); g.fillStyle = '#ffd890'; g.fillRect(96, 122, 20, 18); g.fillRect(142, 122, 20, 18); break; }
    case 'face': { g.beginPath(); g.moveTo(150, 192); g.lineTo(150, 150); g.quadraticCurveTo(130, 145, 128, 128); g.lineTo(112, 120); g.lineTo(126, 110); g.quadraticCurveTo(118, 70, 140, 50); g.quadraticCurveTo(190, 30, 200, 90); g.quadraticCurveTo(205, 140, 190, 192); g.fill(); break; }
    case 'book': { g.fillStyle = 'rgba(240,235,220,0.9)'; g.beginPath(); g.moveTo(40, 70); g.quadraticCurveTo(90, 55, 128, 75); g.lineTo(128, 160); g.quadraticCurveTo(90, 140, 40, 155); g.fill(); g.beginPath(); g.moveTo(216, 70); g.quadraticCurveTo(166, 55, 128, 75); g.lineTo(128, 160); g.quadraticCurveTo(166, 140, 216, 155); g.fill(); g.strokeStyle = 'rgba(30,40,60,0.5)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(52, 88 + i * 10); g.lineTo(116, 92 + i * 10); g.moveTo(140, 92 + i * 10); g.lineTo(204, 88 + i * 10); g.stroke(); } break; }
    case 'waves': { g.fillStyle = 'rgba(6,20,40,0.8)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, 192); for (let x = 0; x <= 256; x += 8) g.lineTo(x, 110 + k * 22 + Math.sin(x * 0.05 + k) * 8); g.lineTo(256, 192); g.fill(); } break; }
    case 'mountain': { g.beginPath(); g.moveTo(0, 192); g.lineTo(70, 80); g.lineTo(110, 125); g.lineTo(160, 60); g.lineTo(256, 170); g.lineTo(256, 192); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(160, 60); g.lineTo(145, 80); g.lineTo(175, 78); g.fill(); break; }
    case 'kite': { g.fillRect(0, 175, 256, 20); g.fillStyle = '#ff9d5c'; g.beginPath(); g.moveTo(150, 30); g.lineTo(180, 60); g.lineTo(150, 100); g.lineTo(122, 60); g.fill(); g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(150, 100); g.quadraticCurveTo(110, 150, 70, 176); g.stroke(); g.fillStyle = ink; g.fillRect(64, 150, 10, 28); g.beginPath(); g.arc(69, 144, 7, 0, 7); g.fill(); break; }
    case 'city': { for (let i = 0; i < 12; i++) { const h = 40 + rng.next() * 90; g.fillRect(i * 22, 192 - h, 18, h); } g.fillStyle = '#ffd890'; for (let i = 0; i < 30; i++) g.fillRect(rng.next() * 250, 110 + rng.next() * 70, 3, 4); break; }
    case 'bike': { g.lineWidth = 5; g.beginPath(); g.arc(80, 135, 32, 0, 7); g.stroke(); g.beginPath(); g.arc(180, 135, 32, 0, 7); g.stroke(); g.beginPath(); g.moveTo(80, 135); g.lineTo(120, 95); g.lineTo(165, 95); g.lineTo(180, 135); g.moveTo(120, 95); g.lineTo(128, 135); g.lineTo(80, 135); g.stroke(); break; }
    case 'door': { g.fillRect(0, 0, 256, 192); g.fillStyle = sky; g.fillRect(96, 40, 64, 130); g.fillStyle = ink; g.beginPath(); g.arc(128, 150, 9, 0, 7); g.fill(); g.fillRect(122, 158, 12, 14); break; }
    default: { g.beginPath(); g.arc(128, 96, 40, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  // soft vignette + light leak
  const v = g.createRadialGradient(128, 96, 40, 128, 96, 150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,6,14,0.75)'); g.fillStyle = v; g.fillRect(0, 0, 256, 192);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function buildMemories(opts = {}) {
  const rng = new RNG(opts.seed ?? 31); const group = new THREE.Group();
  const kinds = ['sunset', 'tree', 'house', 'face', 'book', 'waves', 'mountain', 'kite', 'city', 'bike', 'door'];
  // organised target lattice: hexagonal grid on a gently curved surface
  const targets = [];
  const rows = opts.rows ?? 5, cols = opts.cols ?? 4, sx = 0.78, sy = 0.66;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = (c - (cols - 1) / 2) * sx + (r % 2 ? sx / 2 : 0) - sx / 4, y = ((rows - 1) / 2 - r) * sy;
    targets.push(new THREE.Vector3(x, y, -0.18 * (x * x + y * y * 0.6)));
  }
  const cards = [];
  const plane = new THREE.PlaneGeometry(0.62, 0.465);
  const uni = { uTime: { value: 0 }, uAmp: { value: 1 }, uOrder: { value: 0 } };
  targets.forEach((tp, i) => {
    const tex = vignette(kinds[i % kinds.length], rng);
    const m = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: tex }, uTime: uni.uTime, uAmp: uni.uAmp, uOrder: uni.uOrder, uSeed: { value: rng.next() }, uGlow: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tMap; uniform float uTime, uAmp, uSeed, uOrder, uGlow; varying vec2 vUv;
        void main(){
          vec2 d = abs(vUv - 0.5) * 2.0;
          float box = max(d.x, d.y);
          float inside = smoothstep(1.0, 0.86, box);
          float edge = exp(-pow((box - 0.93) / 0.05, 2.0));
          // chromatic shimmer + scanline, so the card reads as a luminous memory trace rather than a photo
          float sh = 0.004 * sin(vUv.y * 80.0 + uTime * 6.0 + uSeed * 30.0) * (1.0 - uOrder * 0.7);
          vec3 img = vec3(texture2D(tMap, vUv + vec2(sh, 0.0)).r, texture2D(tMap, vUv).g, texture2D(tMap, vUv - vec2(sh, 0.0)).b);
          img = img * 1.25;
          float scan = 0.88 + 0.12 * sin(vUv.y * 300.0);
          vec3 frame = mix(vec3(1.0, 0.7, 0.42), vec3(0.31, 0.82, 1.0), uOrder);
          vec3 c = img * scan * inside * 0.9 + frame * edge * (0.45 + uGlow * 1.2);
          float halo = exp(-pow(max(box - 0.95, 0.0) / 0.06, 2.0)) * (1.0 - inside) * 0.4;
          c += frame * halo * (0.25 + 0.5 * uGlow);
          gl_FragColor = vec4(c * uAmp, 1.0);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: true, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(plane, m); group.add(mesh);
    cards.push({ mesh, target: tp, start: new THREE.Vector3(rng.range(-2.4, 2.4), rng.range(-2.8, 2.8), rng.range(-2.2, 1.4)), rot: new THREE.Euler(rng.range(-1.2, 1.2), rng.range(-1.4, 1.4), rng.range(-0.8, 0.8)), delay: rng.range(0, 0.35), ph: rng.range(0, 6.28), mat: m });
  });
  // links between lattice neighbours, with light running along them
  const P = [], T = [], S = [];
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
    if (targets[i].distanceTo(targets[j]) < 0.86) { const sd = rng.next(); for (const k of [0, 1]) { const p = k ? targets[j] : targets[i]; P.push(p.x, p.y, p.z); T.push(k); S.push(sd); } }
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lg.setAttribute('aT', new THREE.Float32BufferAttribute(T, 1)); lg.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 1));
  const lm = new THREE.ShaderMaterial({ uniforms: { uTime: uni.uTime, uLinks: { value: 0 }, uCol: { value: new THREE.Color(0x63d8ff) }, uCol2: { value: new THREE.Color(0xffc27a) } },
    vertexShader: `attribute float aT, aSeed; varying float vT, vS; void main(){ vT = aT; vS = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uLinks; uniform vec3 uCol, uCol2; varying float vT, vS; void main(){ float on = smoothstep(vS * 0.7, vS * 0.7 + 0.3, uLinks); float ph = fract(uTime * 0.9 + vS * 5.0); float p = exp(-pow((vT - ph)/0.08, 2.0)); gl_FragColor = vec4((uCol * 0.5 + uCol2 * p * 2.0) * on, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const links = new THREE.LineSegments(lg, lm); links.frustumCulled = false; group.add(links);

  function update(t, order, linksOn, amp) {
    uni.uTime.value = t; uni.uOrder.value = order; uni.uAmp.value = amp; lm.uniforms.uLinks.value = linksOn;
    for (const c of cards) {
      const k = Math.min(1, Math.max(0, (order - c.delay) / (1 - c.delay * 0.9)));
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const drift = new THREE.Vector3(Math.sin(t * 0.7 + c.ph) * 0.25, Math.cos(t * 0.55 + c.ph) * 0.25, Math.sin(t * 0.4 + c.ph) * 0.2).multiplyScalar(1 - e);
      c.mesh.position.lerpVectors(c.start, c.target, e).add(drift);
      c.mesh.rotation.set(c.rot.x * (1 - e) + Math.sin(t + c.ph) * 0.05 * (1 - e), c.rot.y * (1 - e), c.rot.z * (1 - e));
      c.mat.uniforms.uGlow.value = Math.max(0, Math.sin((t * 1.3 + c.ph))) * linksOn * 0.6;
    }
  }
  return { group, update, cards };
}
