// Shared helpers: math, easing, deterministic RNG, time-knotted camera splines, GLSL noise.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const smoother = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Non-uniform (time-knotted) Catmull-Rom over arrays of numbers (Barry-Goldman).
// keys: [[t, [v0, v1, ...]], ...]. C1-continuous in time, so the camera never jerks at a key.
export class Track {
  constructor(keys) {
    this.k = keys.slice().sort((a, b) => a[0] - b[0]);
    const n = this.k.length;
    if (n >= 2) {
      const [t0, v0] = this.k[0], [t1, v1] = this.k[1];
      const [ta, va] = this.k[n - 2], [tb, vb] = this.k[n - 1];
      this.pre = [2 * t0 - t1, v0.map((x, i) => 2 * x - v1[i])];
      this.post = [2 * tb - ta, vb.map((x, i) => 2 * x - va[i])];
    }
  }
  at(t) {
    const k = this.k, n = k.length;
    if (n === 1 || t <= k[0][0]) return k[0][1].slice();
    if (t >= k[n - 1][0]) return k[n - 1][1].slice();
    let i = 0; while (i < n - 2 && t > k[i + 1][0]) i++;
    const P0 = i === 0 ? this.pre : k[i - 1], P1 = k[i], P2 = k[i + 1], P3 = i + 2 >= n ? this.post : k[i + 2];
    const [t0, a] = P0, [t1, b] = P1, [t2, c] = P2, [t3, d] = P3;
    return b.map((_, j) => {
      const A1 = ((t1 - t) * a[j] + (t - t0) * b[j]) / (t1 - t0);
      const A2 = ((t2 - t) * b[j] + (t - t1) * c[j]) / (t2 - t1);
      const A3 = ((t3 - t) * c[j] + (t - t2) * d[j]) / (t3 - t2);
      const B1 = ((t2 - t) * A1 + (t - t0) * A2) / (t2 - t0);
      const B2 = ((t3 - t) * A2 + (t - t1) * A3) / (t3 - t1);
      return ((t2 - t) * B1 + (t - t1) * B2) / (t2 - t1);
    });
  }
}

// Apply [px,py,pz, tx,ty,tz, fov, roll(deg)] to a camera.
export function applyCam(cam, v) {
  cam.position.set(v[0], v[1], v[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(v[3], v[4], v[5]);
  if (v[6] !== undefined && cam.fov !== v[6]) { cam.fov = v[6]; cam.updateProjectionMatrix(); }
  if (v[7]) cam.rotateZ(THREE.MathUtils.degToRad(v[7]));
  cam.updateMatrixWorld();
}

export const GLSL_NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
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
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm3(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
float fbm5(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*snoise(p); p=p*2.01+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
`;

export function fsQuad(material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { mesh, render(renderer, target) { renderer.setRenderTarget(target); renderer.render(scene, cam); } };
}

// Soft round sprite texture for particles.
export function dotTexture(size = 64, hard = 0.0) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = size / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(Math.max(0.01, hard), 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); return t;
}
