// Shared math / geometry helpers (deterministic: no Math.random anywhere in the film).
import * as THREE from "three";

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const easeOut = (k, p = 3) => 1 - Math.pow(1 - clamp(k), p);
export const easeIn = (k, p = 3) => Math.pow(clamp(k), p);
export const easeInOut = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash2(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
export function fbm(x, y, o = 5) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

// Hermite interpolation through keys [[t, number[] , opts?], ...] with Catmull-Rom tangents
// on non-uniform times. opts.hold = zero tangent at that key (pose holds / snaps).
export function track(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1].slice();
  if (t >= keys[n - 1][0]) return keys[n - 1][1].slice();
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const [t0, p0, o0] = keys[i], [t1, p1, o1] = keys[i + 1];
  const h = t1 - t0, u = (t - t0) / h;
  const tan = (j) => {
    const [tj, pj, oj] = keys[j];
    if ((oj && oj.hold) || j === 0 || j === n - 1) return pj.map(() => 0);
    const [ta, pa] = keys[j - 1], [tb, pb] = keys[j + 1];
    return pj.map((_, k) => (pb[k] - pa[k]) / (tb - ta));
  };
  const m0 = tan(i), m1 = tan(i + 1);
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return p0.map((_, k) => h00 * p0[k] + h10 * h * m0[k] + h01 * p1[k] + h11 * h * m1[k]);
}

// Merge (geometry, matrix, colour) parts into one non-indexed geometry with vertex colours.
export function merge(parts, withUv = false) {
  const geos = parts.map(({ g, m, c }) => {
    let q = g.index ? g.toNonIndexed() : g.clone(); if (m) q.applyMatrix4(m);
    const col = new THREE.Color(c ?? 0xffffff), n = q.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    q.setAttribute("color", new THREE.BufferAttribute(arr, 3)); return q;
  });
  let total = 0; geos.forEach((q) => (total += q.attributes.position.count));
  const out = new THREE.BufferGeometry();
  const names = [["position", 3], ["normal", 3], ["color", 3]].concat(withUv ? [["uv", 2]] : []);
  for (const [name, sz] of names) {
    const arr = new Float32Array(total * sz); let o = 0;
    geos.forEach((q) => { const a = q.attributes[name] ? q.attributes[name].array : new Float32Array(q.attributes.position.count * sz); arr.set(a, o); o += q.attributes.position.count * sz; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, sz));
  }
  return out;
}
export const M4 = (p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(...s));
export function between(a, b, r0, r1, seg = 8) {
  const d = b.clone().sub(a), L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  return { g: new THREE.CylinderGeometry(r1, r0, L, seg, 1), m: new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), q, V(1, 1, 1)) };
}
// orient a unit-height, Y-aligned, origin-centred mesh from a to b
export function place(mesh, a, b) {
  const d = b.clone().sub(a), L = d.length();
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.multiplyScalar(1 / Math.max(L, 1e-6)));
  mesh.scale.set(1, L, 1);
}
// two-bone IK: returns {E, H} (elbow/knee, effector) from root S toward target T
export function ik2(S, T, A, B, pole) {
  const d = T.clone().sub(S); let L = d.length(); L = clamp(L, Math.abs(A - B) + 1e-3, A + B - 1e-3); d.normalize();
  const x = (A * A - B * B + L * L) / (2 * L), h = Math.sqrt(Math.max(0, A * A - x * x));
  const p = pole.clone(); p.addScaledVector(d, -p.dot(d)); if (p.lengthSq() < 1e-8) p.set(0, 0, 1); p.normalize();
  return { E: S.clone().addScaledVector(d, x).addScaledVector(p, h), H: S.clone().addScaledVector(d, L) };
}
export function canvasTex(w, h, fn, { srgb = false, repeat = null } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); const id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; const [r, gg, b, a = 1] = fn(x, y); id.data[k] = 255 * clamp(r); id.data[k + 1] = 255 * clamp(gg); id.data[k + 2] = 255 * clamp(b); id.data[k + 3] = 255 * clamp(a); }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 8; return t;
}
// normal map from a height function sampled on a w*h torus-periodic grid
export function normalTex(w, h, height, strength = 4, opts = {}) {
  const H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = height(x, y);
  return canvasTex(w, h, (x, y) => {
    const dx = H[y * w + ((x + 1) % w)] - H[y * w + ((x + w - 1) % w)], dy = H[((y + 1) % h) * w + x] - H[((y + h - 1) % h) * w + x];
    const nx = -dx * strength, ny = -dy * strength, l = Math.hypot(nx, ny, 1);
    return [nx / l * 0.5 + 0.5, ny / l * 0.5 + 0.5, 1 / l * 0.5 + 0.5];
  }, opts);
}
