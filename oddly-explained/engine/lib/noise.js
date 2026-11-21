// ODDLY EXPLAINED engine — deterministic random + 3D simplex noise.
// Everything procedural in the engine is seeded so every render is bit-for-bit repeatable.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) { this.r = mulberry32(seed); }
  next() { return this.r(); }
  range(a, b) { return a + (b - a) * this.r(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
  gauss() { const u = Math.max(1e-9, this.r()), v = this.r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // uniform direction on unit sphere
  dir() { const z = this.range(-1, 1), t = this.range(0, Math.PI * 2), r = Math.sqrt(1 - z * z); return [r * Math.cos(t), r * Math.sin(t), z]; }
}

const G3 = 1 / 6;
const grad3 = new Float32Array([1,1,0, -1,1,0, 1,-1,0, -1,-1,0, 1,0,1, -1,0,1, 1,0,-1, -1,0,-1, 0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1]);

export class Simplex3 {
  constructor(seed = 1) {
    const rnd = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    this.perm = new Uint8Array(512); this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { this.perm[i] = p[i & 255]; this.permMod12[i] = this.perm[i] % 12; }
  }
  noise(x, y, z) {
    const perm = this.perm, pm = this.permMod12;
    const s = (x + y + z) / 3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0, t0, g;
    t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { g = pm[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n += t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0 + grad3[g + 2] * z0); }
    t0 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t0 > 0) { g = pm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t0 *= t0; n += t0 * t0 * (grad3[g] * x1 + grad3[g + 1] * y1 + grad3[g + 2] * z1); }
    t0 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t0 > 0) { g = pm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t0 *= t0; n += t0 * t0 * (grad3[g] * x2 + grad3[g + 1] * y2 + grad3[g + 2] * z2); }
    t0 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t0 > 0) { g = pm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t0 *= t0; n += t0 * t0 * (grad3[g] * x3 + grad3[g + 1] * y3 + grad3[g + 2] * z3); }
    return 32 * n; // ~[-1,1]
  }
  fbm(x, y, z, oct = 4, lac = 2.0, gain = 0.5) {
    let a = 1, f = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) { s += a * this.noise(x * f, y * f, z * f); n += a; a *= gain; f *= lac; }
    return s / n;
  }
}

// GLSL simplex noise (Ashima / Ian McEwan, MIT) shared by shaders.
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
`;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
