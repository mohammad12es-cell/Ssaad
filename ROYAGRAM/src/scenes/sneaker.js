// Original procedural performance sneaker "KINETRA AERO" — no real-brand design elements
import * as THREE from 'three';
import { clamp, lerp, sstep, canvasTex, rng, track } from '../lib.js';
import { variableTube } from './s2_perfume.js';

const L = 2.2;
const ux = (u) => (u - 0.5) * L;
export const halfW = (u) => {
  const wb = 0.29 + 0.075 * sstep(0.3, 0.72, u) - 0.035 * Math.exp(-(((u - 0.42) / 0.1) ** 2)) - 0.04 * sstep(0.85, 1.0, u);
  return wb * Math.pow(Math.max(0, Math.sin(Math.PI * clamp(u * 0.985 + 0.0075))), 0.32);
};
const y0 = (u) => 0.11 * Math.pow(sstep(0.74, 1.0, u), 1.6) + 0.025 * sstep(0.12, 0.0, u);
const thick = (u) => lerp(0.36, 0.18, sstep(0.15, 0.85, u));
export const yt = (u) => y0(u) + thick(u);
const hU = (u) => track(u, [[0, 0.56], [0.14, 0.62], [0.34, 0.57], [0.55, 0.47], [0.75, 0.33], [0.9, 0.22], [1.0, 0.1]]);
const OPEN = { c: 0.215, a: 0.165, b: 0.6 };

function upperPoint(u, phi, inflate = 0) {
  const w = halfW(u) * 0.95, c = Math.cos(phi), s = Math.max(0, Math.sin(phi));
  let y = yt(u) - 0.02 + hU(u) * Math.pow(s, 0.85);
  // collar opening -> cavity
  const du = (u - OPEN.c) / OPEN.a;
  let inside = 0;
  if (Math.abs(du) < 1) {
    const lim = OPEN.b * Math.sqrt(1 - du * du);
    inside = sstep(lim + 0.05, lim - 0.08, Math.abs(c));
    y = lerp(y, yt(u) + 0.05, inside);
  }
  const k = 1 + inflate;
  return { p: new THREE.Vector3(ux(u), y + inflate * 0.5 * s, w * c * k), inside };
}

function param(fn, nu, nv, u0, u1, v0, v1, extra) {
  const pos = [], uv = [], col = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = lerp(u0, u1, i / nu), v = lerp(v0, v1, j / nv), r = fn(u, v);
    pos.push(r.p.x, r.p.y, r.p.z); uv.push(u, (v - v0) / (v1 - v0));
    const d = 1 - (r.inside ?? 0) * 0.92; col.push(d, d, d);
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// rounded-rect cross-section loft (midsole / outsole)
function soleLoft(bot, top, scaleW, n = 4) {
  return (u, v) => {
    const w = halfW(u) * scaleW, b = bot(u), t = top(u), c = Math.cos(v), s = Math.sin(v);
    const z = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = (b + t) / 2 + (t - b) / 2 * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    return { p: new THREE.Vector3(ux(u), y, z) };
  };
}

export function buildSneaker(env) {
  const g = new THREE.Group();
  // knit texture + bump
  const R = rng(7);
  const knitDraw = (bump) => (c, w, h) => {
    c.fillStyle = bump ? '#808080' : '#1b1c1f'; c.fillRect(0, 0, w, h);
    const rows = 140, cols = 300;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = (k / cols) * w, y = (r / rows) * h, cw = w / cols, rh = h / rows;
      const v = bump ? 150 + R() * 60 : 28 + R() * 14;
      c.strokeStyle = bump ? `rgb(${v},${v},${v})` : `rgb(${v},${v + 1},${v + 4})`; c.lineWidth = rh * 0.42;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + cw / 2, y + rh * 0.8); c.lineTo(x + cw, y); c.stroke();
    }
    if (!bump) {
      // original "kinetic wave" accent in gold yarn (both sides, top centre is v=0.5)
      for (const side of [0, 1]) for (let l = 0; l < 7; l++) {
        c.strokeStyle = `rgba(216,170,88,${0.9 - l * 0.09})`; c.lineWidth = 3.2;
        c.beginPath();
        for (let i = 0; i <= 60; i++) {
          const u = 0.3 + i / 60 * 0.62, base = 0.17 + l * 0.022 + 0.13 * Math.pow(i / 60, 1.6);
          const vv = side ? 1 - base : base; const X = u * w, Y = vv * h;
          i ? c.lineTo(X, Y) : c.moveTo(X, Y);
        }
        c.stroke();
      }
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(214,170,90,${0.25 + R() * 0.4})`; c.fillRect(R() * w, R() * h, 1.6, 1.2); }
    }
  };
  const knit = canvasTex(2048, 1024, knitDraw(false));
  const knitBump = canvasTex(2048, 1024, knitDraw(true), false);
  const upperMat = new THREE.MeshPhysicalMaterial({ map: knit, bumpMap: knitBump, bumpScale: 2.2, roughness: 0.82, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x8a8a90), vertexColors: true, envMapIntensity: 1.0, side: THREE.DoubleSide });
  const upper = new THREE.Mesh(param((u, v) => upperPoint(u, v), 160, 90, 0, 1, 0, Math.PI), upperMat);
  g.add(upper);

  const foam = new THREE.MeshPhysicalMaterial({ color: 0xcfc9be, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.3, envMapIntensity: 1.0 });
  const mid = new THREE.Mesh(param(soleLoft((u) => y0(u) + 0.035, (u) => yt(u), 1.0, 5), 140, 64, 0, 1, 0, Math.PI * 2), foam);
  g.add(mid);
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.62, envMapIntensity: 0.8 });
  const out = new THREE.Mesh(param(soleLoft((u) => y0(u), (u) => y0(u) + 0.05, 1.015, 3), 140, 48, 0, 1, 0, Math.PI * 2), rubber);
  g.add(out);

  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe8bd68, metalness: 1, roughness: 0.14, clearcoat: 1, envMapIntensity: 1.7 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, envMapIntensity: 1.8 });
  // heel counter (polished gold clip)
  const heel = new THREE.Mesh(param((u, v) => upperPoint(u, v, 0.035), 30, 60, 0.0, 0.16, 0.08, Math.PI - 0.08), gold);
  heel.geometry.deleteAttribute('color');
  const hp = heel.geometry.attributes.position;
  for (let i = 0; i < hp.count; i++) { const y = hp.getY(i), u = (hp.getX(i) / L) + 0.5; hp.setY(i, Math.min(y, yt(u) + 0.25 + 0.08 * Math.sin(u * 20))); }
  heel.geometry.computeVertexNormals();
  g.add(heel);
  // toe guard (gloss black)
  const toe = new THREE.Mesh(param((u, v) => upperPoint(u, v, 0.012), 40, 80, 0.82, 1.0, 0, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.25, clearcoat: 1, envMapIntensity: 1.3, side: THREE.DoubleSide }));
  toe.geometry.deleteAttribute('color');
  const tp = toe.geometry.attributes.position;
  for (let i = 0; i < tp.count; i++) { const u = tp.getX(i) / L + 0.5; tp.setY(i, Math.min(tp.getY(i), yt(u) + 0.09)); }
  toe.geometry.computeVertexNormals();
  g.add(toe);
  // gold sculpt line around midsole
  const ring = [];
  for (let i = 0; i <= 200; i++) { const a = (i / 200) * Math.PI * 2, u = 0.5 - 0.5 * Math.cos(a), side = Math.sin(a) >= 0 ? 1 : -1;
    const uu = clamp(u, 0.004, 0.996); ring.push(new THREE.Vector3(ux(uu), lerp(y0(uu) + 0.035, yt(uu), 0.45), halfW(uu) * 1.012 * side)); }
  g.add(new THREE.Mesh(variableTube(new THREE.CatmullRomCurve3(ring, true), 400, 8, () => 0.009), gold));
  // collar padding
  const col = [];
  for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2, u = OPEN.c + OPEN.a * 1.02 * Math.cos(a);
    const cphi = OPEN.b * 1.04 * Math.sin(a), phi = Math.acos(clamp(cphi, -1, 1));
    const p = upperPoint(u, phi).p; const s = Math.sin(phi); p.y = yt(u) - 0.02 + hU(u) * Math.pow(s, 0.85); col.push(p); }
  g.add(new THREE.Mesh(variableTube(new THREE.CatmullRomCurve3(col, true), 240, 12, () => 0.04), new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.75, sheen: 1, sheenColor: new THREE.Color(0x555555) })));
  // tongue
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.12, 6, 16), new THREE.MeshPhysicalMaterial({ color: 0x1d1e21, roughness: 0.8, sheen: 1, sheenColor: new THREE.Color(0x666666) }));
  tongue.scale.set(0.7, 1, 2.2); tongue.position.set(ux(0.385), yt(0.385) + hU(0.385) - 0.02, 0); tongue.rotation.z = 0.95; g.add(tongue);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.14), gold); tab.position.set(ux(0.365), yt(0.365) + hU(0.365) + 0.05, 0); tab.rotation.z = 0.7; g.add(tab);
  // laces + eyelets
  const laceMat = new THREE.MeshPhysicalMaterial({ color: 0xe8e2d6, roughness: 0.8, sheen: 0.8, sheenColor: new THREE.Color(0xffffff) });
  for (let i = 0; i < 6; i++) {
    const u = 0.43 + i * 0.05, top = upperPoint(u, Math.PI / 2).p, w = halfW(u) * 0.95;
    const curve = new THREE.CatmullRomCurve3([-0.42, -0.2, 0, 0.2, 0.42].map((c) => { const phi = Math.acos(c); const p = upperPoint(u, phi).p; p.y += 0.022; return p; }));
    const lace = new THREE.Mesh(variableTube(curve, 30, 6, () => 0.016), laceMat); lace.scale.set(1, 1, 1); g.add(lace);
    for (const c of [-0.45, 0.45]) { const p = upperPoint(u, Math.acos(c)).p; const e = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 8, 20), chrome); e.position.copy(p); e.position.y += 0.012; e.rotation.x = Math.PI / 2; g.add(e); }
  }
  // gold stitching along the upper base
  const N = 2 * 70, st = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.006, 0.006), gold, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  let k = 0;
  for (const phi of [0.16, Math.PI - 0.16]) for (let i = 0; i < 70; i++) {
    const u = 0.06 + (i / 69) * 0.88, p = upperPoint(u, phi, 0.006).p, p2 = upperPoint(u + 0.004, phi, 0.006).p;
    q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), p2.clone().sub(p).normalize()); m.compose(p, q, sc); st.setMatrixAt(k++, m);
  }
  g.add(st);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
  return g;
}
