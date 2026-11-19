// SCENE 07 — BRAND REVEAL: shards, gold droplets and watch gears converge into the ROYAGRAM identity
import * as THREE from 'three';
import opentype from 'opentype';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { track, easeInOut, easeOut, easeIn, easeInExpo, sstep, range, dust, backdrop, setCam, rng, radialDisc, lerp } from '../lib.js';
import { gearGeometry } from './s5_watch.js';

export const T0 = 38.0;           // global start
export const REVEAL = 41.9 - T0;  // logo impact (local)
const PX = 2 * 10 * Math.tan((30 / 2) * Math.PI / 180) / 1920; // world units per px at z=0 with cam z=10

// classify contours by containment (robust to fonts with mixed winding / overlapping contours)
function containmentShapes(sp) {
  const polys = sp.subPaths.map((p) => p.getPoints(12)).filter((p) => p.length > 2);
  const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return a / 2; };
  const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
  const info = polys.map((pts, i) => {
    const probe = pts[0];
    const parents = polys.map((q, j) => (j !== i && Math.abs(area(q)) > Math.abs(area(pts)) && inside(probe, q) ? j : -1)).filter((j) => j >= 0);
    return { pts, depth: parents.length, parents };
  });
  const shapes = new Map();
  info.forEach((c, i) => { if (c.depth % 2 === 0) { const pts = area(c.pts) < 0 ? c.pts.slice().reverse() : c.pts; shapes.set(i, new THREE.Shape(pts)); } });
  info.forEach((c) => {
    if (c.depth % 2 === 1) {
      const parent = c.parents.filter((j) => info[j].depth === c.depth - 1).sort((a, b) => Math.abs(area(polys[a])) - Math.abs(area(polys[b])))[0];
      if (parent !== undefined && shapes.has(parent)) shapes.get(parent).holes.push(new THREE.Path(area(c.pts) > 0 ? c.pts.slice().reverse() : c.pts));
    }
  });
  return [...shapes.values()];
}

function glyphShapes(font, text, size, tracking) {
  const shapes = []; let x = 0; let minX = Infinity, maxX = -Infinity;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(x, 0, size);
    const sp = new THREE.ShapePath();
    for (const c of path.commands) {
      if (c.type === 'M') sp.moveTo(c.x, -c.y); else if (c.type === 'L') sp.lineTo(c.x, -c.y);
      else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y); else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
    }
    shapes.push(...containmentShapes(sp));
    const bb = path.getBoundingBox(); minX = Math.min(minX, bb.x1); maxX = Math.max(maxX, bb.x2);
    x += glyph.advanceWidth * (size / font.unitsPerEm) + tracking;
  }
  return { shapes, minX, maxX };
}

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envChrome;
  scene.add(backdrop([0, 0, 0], [0.003, 0.003, 0.003], [0, 0, 0], [0, 0.12], [0.015, 0.011, 0.006]));
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.05, 200);

  const buf = await (await fetch('/node_modules/@fontsource/syncopate/files/syncopate-latin-700-normal.woff')).arrayBuffer();
  const font = opentype.parse(buf);
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd9dade, metalness: 0.35, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 0.9 });
  chrome.envMap = ctx.envProduct;
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe9c47a, metalness: 1, roughness: 0.2, clearcoat: 1, envMapIntensity: 1.8 });
  gold.envMap = ctx.envProduct;

  // wordmark — ROYAGRAM
  const logo = new THREE.Group(); scene.add(logo);
  const size = 1, tr = 0.12;
  const wm = glyphShapes(font, 'ROYAGRAM', size, tr);
  const wg = new THREE.ExtrudeGeometry(wm.shapes, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 4, curveSegments: 10 });
  wg.computeBoundingBox();
  const bb = wg.boundingBox, wW = bb.max.x - bb.min.x, wH = bb.max.y - bb.min.y;
  wg.translate(-(bb.min.x + wW / 2), -(bb.min.y + wH / 2), -0.06);
  const word = new THREE.Mesh(wg, [chrome, gold]);
  const wordScale = (840 * PX) / wW; word.scale.setScalar(wordScale);
  word.position.y = 100 * PX; logo.add(word);

  // monogram — gold orbit ring with a chrome R (the circle motif of the film: sphere, droplet, portal, bezel)
  const mark = new THREE.Group(); mark.position.y = 410 * PX; logo.add(mark);
  const ringR = 150 * PX;
  const ringShape = new THREE.Shape(); ringShape.absarc(0, 0, ringR, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, ringR - 11 * PX, 0, Math.PI * 2, true); ringShape.holes.push(hole);
  const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 4, curveSegments: 96 }), [gold, gold]);
  ring.position.z = -0.025; mark.add(ring);
  const thin = new THREE.Mesh(new THREE.TorusGeometry(ringR + 26 * PX, 1.4 * PX, 8, 200), gold); mark.add(thin);
  const R = glyphShapes(font, 'R', 1, 0);
  const rg = new THREE.ExtrudeGeometry(R.shapes, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.025, bevelSegments: 4, curveSegments: 12 });
  rg.computeBoundingBox(); const rb = rg.boundingBox; const rW = rb.max.x - rb.min.x, rH = rb.max.y - rb.min.y;
  rg.translate(-(rb.min.x + rW / 2), -(rb.min.y + rH / 2), -0.07);
  const rMesh = new THREE.Mesh(rg, [chrome, gold]); rMesh.scale.setScalar((150 * PX) / rH); mark.add(rMesh);
  // tiny satellite on the orbit
  const sat = new THREE.Mesh(new THREE.SphereGeometry(7 * PX, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4, 1.6) })); mark.add(sat);

  // sample target points on the identity for particle convergence
  logo.updateMatrixWorld(true);
  const targets = [];
  const sampleMesh = (mesh, n) => {
    const g = mesh.geometry.clone(); g.clearGroups(); const s = new MeshSurfaceSampler(new THREE.Mesh(g)).build(); const p = new THREE.Vector3();
    for (let i = 0; i < n; i++) { s.sample(p); targets.push(p.clone().applyMatrix4(mesh.matrixWorld)); }
  };
  sampleMesh(word, 1500); sampleMesh(rMesh, 450); sampleMesh(ring, 450);

  // converging elements
  const rr = rng(88);
  const N = targets.length;
  const shardG = new THREE.TetrahedronGeometry(1, 0);
  const shardMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, metalness: 1, roughness: 0.05, clearcoat: 1, envMapIntensity: 2.0 });
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xf2bd62, metalness: 1, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.8, emissive: 0x3a2004, emissiveIntensity: 0.6 });
  const gearMat = new THREE.MeshPhysicalMaterial({ color: 0xe8c074, metalness: 1, roughness: 0.18, envMapIntensity: 1.8 });
  const kinds = [
    { mesh: new THREE.InstancedMesh(shardG, shardMat, N), size: [0.02, 0.07] },
    { mesh: new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), dropMat, N), size: [0.006, 0.022] },
    { mesh: new THREE.InstancedMesh(gearGeometry(1, 16, 0.25, 0.1, 4), gearMat, N), size: [0.025, 0.07] },
  ];
  const P = [];
  for (let i = 0; i < N; i++) {
    const k = i % 7 === 0 ? 2 : (i % 2 ? 0 : 1);
    const a = rr() * Math.PI * 2, rad = 3 + rr() * 7, h = (rr() - 0.5) * 12;
    P.push({ k, a, rad, h, z: -2 - rr() * 10, s: lerp(kinds[k].size[0], kinds[k].size[1], Math.pow(rr(), 2)), d: rr() * 0.6, ax: new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize(), spin: 1 + rr() * 4, tgt: targets[i], out: new THREE.Vector3(rr() - 0.5, rr() - 0.5, rr() * 0.5).normalize().multiplyScalar(2 + rr() * 5) });
  }
  kinds.forEach((k) => { k.mesh.frustumCulled = false; scene.add(k.mesh); });
  const counters = [0, 0, 0];
  P.forEach((p) => { p.idx = counters[p.k]++; });
  kinds.forEach((k, i) => { k.mesh.count = counters[i]; });

  const halo = radialDisc(3.0, new THREE.Color(0.6, 0.38, 0.12), 0.0, true); halo.rotation.x = 0; halo.position.set(0, 0.6, -2); scene.add(halo);
  const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 8, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(wave);
  const motes = dust(1500, [12, 18, 10], { seed: 101, size: 4, color: [1.0, 0.8, 0.5], opacity: 0.0 }); scene.add(motes);
  const sweep = new THREE.PointLight(0xfff0d0, 0, 6, 1.5); scene.add(sweep);
  const key = new THREE.DirectionalLight(0xffffff, 0.55); key.position.set(-1, 1.5, 6); scene.add(key); const key2 = new THREE.DirectionalLight(0xffe2b0, 0.3); key2.position.set(3, -1, 5); scene.add(key2);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), tmp = new THREE.Vector3();
  function update(lt, opt = {}) {
    lt = Math.max(0, lt);
    const pre = lt < REVEAL;
    const conv = (d) => easeInExpo(range(lt, 0.2 + d * 0.5, REVEAL - 0.55)) ;
    for (const p of P) {
      const c = conv(p.d);
      const swirl = p.a + lt * (0.5 + 1.8 * c) + c * 2.5;
      tmp.set(Math.cos(swirl) * p.rad * (1 - c * 0.3), p.h * (1 - c * 0.4) + Math.sin(lt + p.a) * 0.2, p.z);
      pv.copy(tmp).lerp(p.tgt, c);
      let s = p.s;
      if (!pre) { // after reveal: particles blasted outward, fading into dust
        const e = easeOut(range(lt, REVEAL, REVEAL + 2.5));
        pv.copy(p.tgt).addScaledVector(p.out, e); s = p.s * (1 - sstep(REVEAL, REVEAL + 2.0, lt)) * 0.8;
      } else s *= lerp(2.6, 0.55, c);
      q.setFromAxisAngle(p.ax, lt * p.spin * (1 - 0.7 * c));
      sv.setScalar(Math.max(s, 1e-5)); m4.compose(pv, q, sv); kinds[p.k].mesh.setMatrixAt(p.idx, m4);
    }
    kinds.forEach((k) => (k.mesh.instanceMatrix.needsUpdate = true));
    logo.visible = !pre;
    const since = lt - REVEAL;
    // logo settle: tiny push + rotation catching reflections
    logo.rotation.y = pre ? 0 : lerp(0.32, 0.0, easeOut(range(since, 0, 2.2)));
    logo.position.z = pre ? 0 : lerp(-0.6, 0.0, easeOut(range(since, 0, 1.2)));
    mark.rotation.z = 0; ring.rotation.z = since * 0.1;
    const sa = since * 1.2 + 1.0; sat.position.set(Math.cos(sa) * (ringR + 26 * PX), Math.sin(sa) * (ringR + 26 * PX), 0); sat.visible = !pre;
    sweep.intensity = pre ? 0 : 3 * sstep(0.3, 0.6, since) * (1 - sstep(2.2, 2.8, since));
    sweep.position.set(lerp(-2.2, 2.2, range(since, 0.3, 2.6)), 0.8, 1.2);
    halo.material.opacity = pre ? 0.04 + 0.16 * conv(0) : 0.11 * (0.85 + 0.15 * Math.sin(since * 2));
    const w = range(since, 0, 1.4); wave.visible = !pre && w < 1; wave.scale.setScalar(0.3 + easeOut(w) * 6); wave.material.opacity = 1 - w; wave.position.y = 410 * PX;
    motes.material.uniforms.uTime.value = lt; motes.material.uniforms.uOpacity.value = pre ? 0.3 : 0.55 * sstep(0.2, 1.5, since);
    // camera: drifting inside the vortex, then locked for the identity
    if (pre) setCam(camera, [0.6 * Math.sin(lt * 0.4), 0.3 * (1 - conv(0)), lerp(15, 10.3, easeInOut(range(lt, 0, REVEAL)))], [0, 0, 0], lerp(0.25, 0, easeInOut(range(lt, 0, REVEAL - 0.4))));
    else setCam(camera, [0, 0, lerp(10.25, 9.85, easeOut(range(since, 0, 3.1)))], [0, 0, 0]);
  }
  return { scene, camera, update };
}
