// ODDLY EXPLAINED engine — geometry helpers (no external deps beyond three).
import * as THREE from 'three';

// Weld duplicate vertices (position only) so displaced surfaces stay watertight with smooth normals.
export function mergeVertices(geo, tol = 1e-5) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.attributes.position; const n = pos.count;
  const map = new Map(); const out = []; const idx = new Uint32Array(n);
  const inv = 1 / tol;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = `${Math.round(x * inv)}_${Math.round(y * inv)}_${Math.round(z * inv)}`;
    let k = map.get(key);
    if (k === undefined) { k = out.length / 3; out.push(x, y, z); map.set(key, k); }
    idx[i] = k;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

// Tapered tube along a polyline. Adds attributes:
//   aU    — distance travelled from the path start (+ uOffset), for signals that propagate along branches
//   aSeed — per-tube random value
export function taperedTube(points, r0, r1, radial = 8, uOffset = 0, seed = 0) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const segs = Math.max(4, Math.round(curve.getLength() * 10));
  const frames = curve.computeFrenetFrames(segs, false);
  const P = [], Nn = [], U = [], S = [], I = [];
  const len = curve.getLength();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const p = curve.getPointAt(t);
    const r = r0 + (r1 - r0) * Math.pow(t, 0.8);
    const Nf = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2; const ca = Math.cos(a), sa = Math.sin(a);
      const nx = ca * Nf.x + sa * B.x, ny = ca * Nf.y + sa * B.y, nz = ca * Nf.z + sa * B.z;
      P.push(p.x + r * nx, p.y + r * ny, p.z + r * nz); Nn.push(nx, ny, nz); U.push(uOffset + t * len); S.push(seed);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    I.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setAttribute('aU', new THREE.Float32BufferAttribute(U, 1));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 1));
  g.setIndex(I);
  return { geometry: g, length: len, curve };
}

// Merge many indexed geometries that share the same attribute set.
export function mergeGeometries(list) {
  const names = Object.keys(list[0].attributes);
  const data = {}; for (const n of names) data[n] = [];
  const I = []; let off = 0;
  for (const g of list) {
    for (const n of names) { const a = g.attributes[n]; for (let i = 0; i < a.array.length; i++) data[n].push(a.array[i]); }
    const idx = g.index.array; for (let i = 0; i < idx.length; i++) I.push(idx[i] + off);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  for (const n of names) out.setAttribute(n, new THREE.Float32BufferAttribute(data[n], list[0].attributes[n].itemSize));
  out.setIndex(off > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1));
  return out;
}
