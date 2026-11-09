import * as THREE from 'three';
import {fbm3, mulberry32} from '../utils';

/** Unit vector for (lon°E, lat°) matching THREE.SphereGeometry UVs with u = (lon + 180) / 360. */
export const lonLat = (lon: number, lat: number) => {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) * Math.PI) / 180;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
};
// Alba Mons ≈ 40.5°N, 109.6°W
export const ALBA = {lon: -109.6, lat: 40.5};
export const ALBA_DIR = lonLat(ALBA.lon, ALBA.lat);

let cached: {map: THREE.CanvasTexture; bump: THREE.CanvasTexture} | null = null;

/** Procedural Mars albedo + bump (artistic, not spacecraft imagery). Cached per page. */
export const marsTextures = () => {
  if (cached) return cached;
  const W = 1536, H = 768;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(W, H);
  const hv = document.createElement('canvas');
  hv.width = W; hv.height = H;
  const hg = hv.getContext('2d')!;
  const himg = hg.createImageData(W, H);
  const dust = [201, 122, 69], dark = [96, 46, 30], light = [226, 160, 108];
  const v = new THREE.Vector3();
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y / H) * 180;
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * 360 - 180;
      v.copy(lonLat(lon, lat));
      const n1 = fbm3(v.x * 1.8 + 5, v.y * 1.8, v.z * 1.8, 5);
      const n2 = fbm3(v.x * 6 + 1, v.y * 6, v.z * 6, 4);
      const n3 = fbm3(v.x * 24, v.y * 24, v.z * 24, 2);
      let dk = Math.min(1, Math.max(0, (n1 - 0.5) * 6));
      // darker volcanic plains around Tharsis
      const th = Math.exp(-((lon + 105) ** 2 / 900 + (lat - 10) ** 2 / 700));
      dk = Math.min(1, dk + th * 0.25);
      const li = Math.max(0, (n2 - 0.55) * 3);
      const sh = 0.82 + 0.36 * n3;
      let r = (dust[0] * (1 - dk) + dark[0] * dk) * (1 - li * 0.3) + light[0] * li * 0.3;
      let gg = (dust[1] * (1 - dk) + dark[1] * dk) * (1 - li * 0.3) + light[1] * li * 0.3;
      let b = (dust[2] * (1 - dk) + dark[2] * dk) * (1 - li * 0.3) + light[2] * li * 0.3;
      // polar caps
      const capN = Math.min(1, Math.max(0, (lat - 80 + (n2 - 0.5) * 8) / 3));
      const capS = Math.min(1, Math.max(0, (-lat - 84 + (n2 - 0.5) * 6) / 3));
      const cap = Math.max(capN, capS);
      r = r * sh * (1 - cap) + 236 * cap; gg = gg * sh * (1 - cap) + 230 * cap; b = b * sh * (1 - cap) + 222 * cap;
      const i = (y * W + x) * 4;
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
      const h = 110 + n2 * 80 + n3 * 50 - dk * 20;
      himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = h; himg.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  hg.putImageData(himg, 0, 0);
  const toXY = (lon: number, lat: number) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  // Alba Mons: broad shield + concentric graben (fissure arcs)
  const [ax, ay] = toXY(ALBA.lon, ALBA.lat);
  const sx = 1 / Math.cos((ALBA.lat * Math.PI) / 180);
  for (const [ctx, isH] of [[g, false], [hg, true]] as const) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.scale(sx, 1);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
    sh.addColorStop(0, isH ? 'rgba(255,255,255,0.5)' : 'rgba(150,80,50,0.45)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isH ? 'rgba(0,0,0,0.7)' : 'rgba(50,22,12,0.45)';
    ctx.lineWidth = 1.2;
    const rr = mulberry32(40);
    for (let k = 0; k < 22; k++) {
      const rad = 34 + k * 2.6 + rr() * 3;
      const a0 = -Math.PI * 0.85 + rr() * 0.4, a1 = a0 + 0.5 + rr() * 0.7;
      ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, rad, a0 + Math.PI, a1 + Math.PI * 0.9); ctx.stroke();
    }
    ctx.restore();
  }
  // craters
  const rr = mulberry32(7);
  for (let k = 0; k < 300; k++) {
    const lon = rr() * 360 - 180, lat = Math.asin(rr() * 2 - 1) * (180 / Math.PI) * 0.92;
    const rad = 1.2 + Math.pow(rr(), 5) * 18;
    const [cx, cy] = toXY(lon, lat);
    const s = 1 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    for (const [ctx, isH] of [[g, false], [hg, true]] as const) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, 1);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rad * 1.25);
      gr.addColorStop(0, isH ? 'rgba(0,0,0,0.35)' : 'rgba(80,38,24,0.22)');
      gr.addColorStop(0.7, isH ? 'rgba(0,0,0,0.18)' : 'rgba(90,42,26,0.12)');
      gr.addColorStop(0.84, isH ? 'rgba(255,255,255,0.15)' : 'rgba(225,165,118,0.12)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rad * 1.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(hv);
  cached = {map, bump};
  return cached;
};

/** Atmospheric limb glow: thin blue scattering on the lit limb, dusty toward the terminator. */
export const atmosphereMaterial = (sunDir: THREE.Vector3) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {uSun: {value: sunDir.clone().normalize()}, uStrength: {value: 1}},
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = normalize(mat3(modelMatrix)*normal);
      vec4 mv = viewMatrix*w; vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uStrength; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.2);
        float lit = clamp(dot(vW, uSun) * 0.8 + 0.35, 0.0, 1.0);
        vec3 col = mix(vec3(0.85,0.45,0.25), vec3(0.45,0.68,0.95), f);
        gl_FragColor = vec4(col * f * lit * 1.5 * uStrength, 1.0); }`,
  });

/** Subsurface glow + "detected region" ring, drawn on a shell just above the surface. */
export const glowMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {uDir: {value: ALBA_DIR.clone()}, uGlow: {value: 0}, uRing: {value: 0}, uRingAmp: {value: 0}, uTime: {value: 0}, uArea: {value: 0}},
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uDir; uniform float uGlow, uRing, uRingAmp, uTime, uArea; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){
        float d = acos(clamp(dot(vP, uDir), -1.0, 1.0));
        float flick = 0.75 + 0.25*sin(uTime*2.3 + vP.x*40.0) * sin(uTime*1.7 + vP.y*35.0);
        float glow = uGlow * exp(-d*d/0.006) * flick;
        float ring = uRingAmp * exp(-pow((d - uRing*0.22)/0.006, 2.0));
        float area = uArea * smoothstep(0.13, 0.12, d) * 0.12;
        float edge = uArea * exp(-pow((d - 0.125)/0.003, 2.0)) * 0.9;
        vec3 col = vec3(1.0,0.42,0.12)*glow + vec3(0.95,0.92,0.85)*(ring + edge + area);
        gl_FragColor = vec4(col, 1.0); }`,
  });

/** Starfield points on a large sphere. */
export const starGeometry = (n = 2500) => {
  const r = mulberry32(99);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos.set([s * Math.cos(a) * 60, u * 60, s * Math.sin(a) * 60], i * 3);
    const b = 0.35 + Math.pow(r(), 3) * 0.9, blue = r() > 0.7 ? 1 : 0;
    col.set([b * (blue ? 0.8 : 1), b * (blue ? 0.88 : 0.95), b * (blue ? 1.1 : 0.88)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
};
