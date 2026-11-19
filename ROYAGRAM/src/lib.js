// ROYAGRAM film engine — shared utilities
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const easeInOutQuint = (t) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
export const range = (t, a, b) => clamp((t - a) / (b - a));
export const backOut = (t, s = 1.4) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };

// keyframe track: [[t, v], ...] with per-segment easing
export function track(t, keys, ease = easeInOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) {
      const e = (keys[i + 1][2] || ease)((t - t0) / (t1 - t0));
      if (Array.isArray(v0)) return v0.map((v, j) => lerp(v, v1[j], e));
      return lerp(v0, v1, e);
    }
  }
  return keys[keys.length - 1][1];
}

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// value noise for CPU-side terrain etc.
export function makeNoise2(seed = 3) {
  const r = rng(seed), P = new Float32Array(512);
  for (let i = 0; i < 512; i++) P[i] = r();
  const h = (x, y) => P[((x & 255) + ((y & 255) * 57)) & 511];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
  };
}

// GLSL noise helpers (Ashima simplex 3D, MIT)
export const GLSL_NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
`;

// HDR studio environment built from emissive softboxes (no external HDRIs)
export function studioEnv(renderer, opts = {}) {
  const s = new THREE.Scene();
  const bg = opts.bg ?? 0.004;
  const room = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(bg, bg, bg), side: THREE.BackSide }));
  s.add(room);
  const panel = (w, h, pos, col, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m); return m;
  };
  const warm = opts.warm ?? [1.0, 0.72, 0.38];
  panel(14, 3, [0, 18, 2], [1, 1, 1], opts.top ?? 3.2);            // overhead softbox
  panel(2.2, 22, [-16, 2, 6], [1, 1, 1], opts.key ?? 6.0);         // left strip
  panel(2.2, 22, [16, 2, -4], [1, 1, 1], opts.fill ?? 2.2);        // right strip
  panel(10, 1.6, [6, -1, -16], warm, opts.gold ?? 7.0);            // gold kicker behind
  panel(1.4, 14, [-8, 4, -14], warm, opts.gold2 ?? 4.0);           // gold rim strip
  panel(6, 6, [0, 2, 18], [1, 1, 1], opts.front ?? 0.6);           // soft front fill
  if (opts.floorGlow) panel(30, 30, [0, -20, 0], warm, opts.floorGlow);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  return rt.texture;
}

export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// soft contact shadow / glow disc
export function radialDisc(radius, color, opacity, additive = false) {
  const tex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({
    map: tex, color, transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// gradient backdrop sphere
export function backdrop(top, mid, bottom, glowPos = [0, 0.1], glowCol = [0, 0, 0], radius = 80) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(...top) }, mid: { value: new THREE.Color(...mid) }, bottom: { value: new THREE.Color(...bottom) }, glow: { value: new THREE.Color(...glowCol) }, gdir: { value: new THREE.Vector2(...glowPos) }, uMix: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, mid, bottom, glow; uniform vec2 gdir; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(mid, top, pow(clamp(y,0.0,1.0),0.6)) : mix(mid, bottom, pow(clamp(-y,0.0,1.0),0.5));
        float g = exp(-pow(length(vec2(atan(vDir.x,-vDir.z), y) - gdir), 2.0) * 4.0); c += glow * g; gl_FragColor = vec4(c,1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

// sparkle / dust points with additive shader
export function dust(count, spread, opts = {}) {
  const r = rng(opts.seed ?? 11);
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * spread[0]; pos[i * 3 + 1] = (r() - 0.5) * spread[1] + (opts.y ?? 0); pos[i * 3 + 2] = (r() - 0.5) * spread[2];
    rnd[i * 4] = r(); rnd[i * 4 + 1] = r(); rnd[i * 4 + 2] = r(); rnd[i * 4 + 3] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: opts.size ?? 6 }, uColor: { value: new THREE.Color(...(opts.color ?? [1.0, 0.8, 0.45])) }, uOpacity: { value: opts.opacity ?? 1 }, uDrift: { value: new THREE.Vector3(...(opts.drift ?? [0.02, 0.05, 0])) }, uH: { value: 1920 } },
    vertexShader: `attribute vec4 aRnd; uniform float uTime, uSize, uH; uniform vec3 uDrift; varying float vA;
      void main(){ vec3 p = position + uDrift * uTime * (0.5 + aRnd.x) + 0.08*vec3(sin(uTime*0.7+aRnd.y*6.28), cos(uTime*0.5+aRnd.z*6.28), sin(uTime*0.6+aRnd.w*6.28));
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
        float tw = 0.55 + 0.45*sin(uTime*(1.5+aRnd.w*3.0) + aRnd.x*40.0);
        vA = tw * (0.35 + 0.65*aRnd.z);
        vA *= smoothstep(0.8, 2.5, -mv.z);
        gl_PointSize = min(uSize * (0.4 + aRnd.y) * (6.0 / max(0.5,-mv.z)), 9.0) * (uH/1920.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){ vec2 d = gl_PointCoord-0.5; float r = length(d); float a = smoothstep(0.5,0.0,r); a = a*a; gl_FragColor = vec4(uColor*a*vA*uOpacity*2.0, 1.0); }`,
  });
  const p = new THREE.Points(g, mat); p.frustumCulled = false;
  return p;
}

// volumetric light cone (additive shaft)
export function lightShaft(radiusTop, radiusBottom, height, color, opacity) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48, 1, true);
  geo.translate(0, -height / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(...color) }, uOpacity: { value: opacity }, uH: { value: height }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; uniform float uH;
      void main(){ vY = -position.y/uH; vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition-wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity, uTime; varying vec3 vN; varying vec3 vV; varying float vY;
      ${GLSL_NOISE}
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float fall = pow(1.0-vY, 1.6) * smoothstep(0.0,0.08,vY);
        float n = 0.75 + 0.25*snoise(vec3(vN.x*3.0, vY*4.0 - uTime*0.2, vN.z*3.0));
        gl_FragColor = vec4(uColor * f * fall * uOpacity * n, 1.0); }`,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false;
  return m;
}

export function setCam(cam, pos, target, roll = 0) {
  cam.position.set(...pos);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(...target);
}

export function orbitPos(center, radius, azim, elev) {
  return [center[0] + radius * Math.cos(elev) * Math.sin(azim), center[1] + radius * Math.sin(elev), center[2] + radius * Math.cos(elev) * Math.cos(azim)];
}
