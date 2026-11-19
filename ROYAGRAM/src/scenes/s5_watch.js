// SCENE 05 — WATCH: precise exploded view assembling into the final timepiece
import * as THREE from 'three';
import { track, easeInOut, easeOut, easeInOutQuint, sstep, range, dust, backdrop, setCam, orbitPos, canvasTex, rng, lerp, backOut } from '../lib.js';

export function gearGeometry(R, teeth, depth, hole = 0.08, spokes = 5) {
  const s = new THREE.Shape();
  const td = R * 0.09;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2, da = (Math.PI * 2) / teeth;
    const pts = [[a0, R - td], [a0 + da * 0.18, R + td * 0.2], [a0 + da * 0.5, R + td * 0.2], [a0 + da * 0.68, R - td]];
    for (const [a, r] of pts) (i === 0 && a === a0) ? s.moveTo(Math.cos(a) * r, Math.sin(a) * r) : s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, R * hole * 2.2, 0, Math.PI * 2, true); s.holes.push(h);
  if (R > 0.12) for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2, w = (Math.PI * 2) / spokes * 0.32, r0 = R * 0.3, r1 = R * 0.72;
    const p = new THREE.Path(); p.absarc(0, 0, r1, a - w, a + w, false); p.absarc(0, 0, r0, a + w * 0.9, a - w * 0.9, true); p.closePath(); s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function build(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envProduct;
  scene.add(backdrop([0, 0, 0], [0.008, 0.007, 0.006], [0, 0, 0], [0, 0.05], [0.04, 0.028, 0.014]));
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.02, 200);

  const steel = new THREE.MeshPhysicalMaterial({ color: 0xf2f3f5, metalness: 1, roughness: 0.1, envMapIntensity: 1.6, clearcoat: 0.4 });
  const brushed = new THREE.MeshPhysicalMaterial({ color: 0xb4b8be, metalness: 1, roughness: 0.55, envMapIntensity: 0.55 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe8c074, metalness: 1, roughness: 0.14, envMapIntensity: 1.8, clearcoat: 0.6 });
  const roseGold = new THREE.MeshPhysicalMaterial({ color: 0xc98f5c, metalness: 1, roughness: 0.5, envMapIntensity: 0.55 });
  const ruby = new THREE.MeshPhysicalMaterial({ color: 0xb0102a, roughness: 0.05, metalness: 0, clearcoat: 1, emissive: 0x300008, envMapIntensity: 2 });

  const watch = new THREE.Group(); scene.add(watch);
  const parts = []; // {obj, base:Vector3, ex:Vector3, order, spin}
  const add = (obj, z, ez, order, extra = {}) => { obj.position.z = z; watch.add(obj); parts.push({ obj, base: obj.position.clone(), ex: new THREE.Vector3(extra.ex ?? 0, extra.ey ?? 0, ez), order, rot0: obj.rotation.z, spin: extra.spin ?? 0, tilt: extra.tilt ?? 0 }); return obj; };

  // case middle with lugs
  const caseProf = [[0.88, -0.17], [0.97, -0.17], [1.01, -0.12], [1.03, 0.0], [1.01, 0.12], [0.97, 0.17], [0.88, 0.17]].map(([x, y]) => new THREE.Vector2(x, y));
  const caseG = new THREE.Group();
  const cm = new THREE.Mesh(new THREE.LatheGeometry(caseProf, 128), steel); cm.rotation.x = Math.PI / 2; caseG.add(cm);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const lug = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.24, 1, 1, 1), brushed); lug.position.set(sx * 0.6, sy * 0.98, -0.03); lug.rotation.z = sx * sy * -0.18; caseG.add(lug); }
  add(caseG, 0, 0, 5);
  // crown
  const crown = new THREE.Group();
  const knurl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 24), gold); knurl.rotation.z = Math.PI / 2; knurl.position.x = 1.13; crown.add(knurl);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), steel); stem.rotation.z = Math.PI / 2; stem.position.x = 1.04; crown.add(stem);
  add(crown, 0, 0, 6, { ex: 1.4 });
  // caseback, rotor, movement
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.9, 0.06, 96), brushed); back.rotation.x = Math.PI / 2; add(back, -0.2, -2.9, 0);
  const rotorShape = new THREE.Shape(); rotorShape.absarc(0, 0, 0.84, 0, Math.PI, false); rotorShape.absarc(0, 0, 0.12, Math.PI, 0, true);
  const rotor = new THREE.Mesh(new THREE.ExtrudeGeometry(rotorShape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 48 }), roseGold);
  add(rotor, -0.16, -2.35, 1, { spin: 1.4 });
  const perlage = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#9a9ea6'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 34) for (let x = (y / 34) % 2 ? 17 : 0; x < w; x += 34) { const gr = g.createRadialGradient(x, y, 0, x, y, 24); gr.addColorStop(0, '#e9ecf0'); gr.addColorStop(0.6, '#a0a4ac'); gr.addColorStop(1, '#7d828a'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill(); } });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.05, 96), new THREE.MeshPhysicalMaterial({ map: perlage, metalness: 1, roughness: 0.5, envMapIntensity: 0.5 }));
  plate.rotation.x = Math.PI / 2; add(plate, -0.11, -1.75, 2);
  // gear train
  const R = rng(12);
  const gearSpec = [[0.0, 0.0, 0.3, 48, gold], [0.42, 0.22, 0.2, 36, gold], [-0.38, 0.3, 0.17, 30, brushed], [0.2, -0.45, 0.14, 26, gold], [-0.25, -0.42, 0.12, 22, gold], [0.55, -0.15, 0.09, 18, brushed]];
  gearSpec.forEach(([x, y, r, n, mat], i) => {
    const g = new THREE.Group();
    const gm = new THREE.Mesh(gearGeometry(r, n, 0.03), mat); g.add(gm);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 12), steel); pin.rotation.x = Math.PI / 2; g.add(pin);
    const jw = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), ruby); jw.position.z = 0.04; g.add(jw);
    g.position.set(x, y, 0);
    add(g, -0.05 + i * 0.005, -1.1 + i * 0.12, 3, { spin: (i % 2 ? -1 : 1) * (1.2 / r) * 0.12 });
  });
  // balance wheel
  const bal = new THREE.Group(); bal.position.set(-0.5, -0.05, 0);
  bal.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 12, 64), gold));
  for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.016, 0.01), gold); sp.rotation.z = (k / 3) * Math.PI; bal.add(sp); }
  const hair = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.004, 6, 64), steel); bal.add(hair);
  add(bal, -0.02, -0.55, 3, { spin: 0 });
  const balRef = parts[parts.length - 1];
  // bridge
  const bridgeShape = new THREE.Shape(); bridgeShape.moveTo(-0.75, 0.2); bridgeShape.quadraticCurveTo(0, 0.55, 0.7, 0.35); bridgeShape.lineTo(0.72, 0.18); bridgeShape.quadraticCurveTo(0, 0.36, -0.72, 0.04); bridgeShape.closePath();
  const bridge = new THREE.Mesh(new THREE.ExtrudeGeometry(bridgeShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }), brushed);
  add(bridge, 0.0, -0.3, 4);
  // dial
  const dialTex = canvasTex(1024, 1024, (g, w, h) => {
    const c = w / 2; g.fillStyle = '#060607'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 720; i++) { const a = (i / 720) * Math.PI * 2, v = 10 + 16 * (0.5 + 0.5 * Math.sin(a * 2)); g.strokeStyle = `rgb(${v},${v},${v + 2})`; g.lineWidth = 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); g.stroke(); }
    g.strokeStyle = '#cfa75e'; g.lineWidth = 2;
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, r0 = i % 5 ? 470 : 455; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * 492, c + Math.sin(a) * 492); g.stroke(); }
    g.fillStyle = '#e8c88a'; g.textAlign = 'center';
    g.font = '700 54px Syncopate'; g.fillText('VERANTH', c, 330);
    g.font = '500 24px Inter'; g.letterSpacing = '10px'; g.fillStyle = '#cfcfd2'; g.fillText('AUTOMATIC', c, 690); g.font = '400 20px Inter'; g.fillText('CALIBRE 01 · SWISS MADE', c, 728);
  });
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.87, 128), new THREE.MeshPhysicalMaterial({ map: dialTex, metalness: 0.6, roughness: 0.3, clearcoat: 1, envMapIntensity: 1.0 }));
  add(dial, 0.06, 0.95, 6);
  // applied 3D indices
  const idx = new THREE.Group();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, big = i % 3 === 0; const b = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.05 : 0.035, big ? 0.19 : 0.13, 0.03), gold); b.position.set(Math.sin(a) * 0.68, Math.cos(a) * 0.68, 0); b.rotation.z = -a; idx.add(b); }
  add(idx, 0.08, 1.35, 7);
  // hands (10:10)
  const handShape = (len, w) => { const s = new THREE.Shape(); s.moveTo(-w, -0.08); s.lineTo(w, -0.08); s.lineTo(w * 0.7, len * 0.82); s.lineTo(0, len); s.lineTo(-w * 0.7, len * 0.82); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1 }); };
  const hourH = new THREE.Mesh(handShape(0.45, 0.035), gold); hourH.rotation.z = -(10 / 12) * Math.PI * 2 - (10 / 60) * (Math.PI / 6);
  const minH = new THREE.Mesh(handShape(0.66, 0.025), gold); minH.rotation.z = -(10 / 60) * Math.PI * 2;
  const secH = new THREE.Group(); const sh = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.82, 0.006), new THREE.MeshPhysicalMaterial({ color: 0xffd28a, metalness: 1, roughness: 0.1 })); sh.position.y = 0.26; secH.add(sh); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 24), gold); cap.rotation.x = Math.PI / 2; secH.add(cap);
  add(hourH, 0.11, 1.75, 8); add(minH, 0.125, 2.05, 8); add(secH, 0.14, 2.35, 9);
  const secRef = parts[parts.length - 1];
  // crystal + bezel
  const crystal = new THREE.Mesh(new THREE.SphereGeometry(2.6, 96, 24, 0, Math.PI * 2, 0, 0.355), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.08, roughness: 0.0, ior: 1.77, envMapIntensity: 0.55, clearcoat: 0.3, specularIntensity: 0.6 }));
  crystal.rotation.x = Math.PI / 2; crystal.position.set(0, 0, 0); const crystalG = new THREE.Group(); crystal.position.z = -2.6 * Math.cos(0.355) + 0.0; crystalG.add(crystal);
  add(crystalG, 0.17, 2.75, 10);
  const bezelProf = [[0.86, 0.0], [1.02, 0.0], [1.02, 0.05], [0.97, 0.1], [0.88, 0.1], [0.86, 0.06]].map(([x, y]) => new THREE.Vector2(x, y));
  const bezelTex = canvasTex(2048, 64, (g, w, h) => { g.fillStyle = '#0a0a0b'; g.fillRect(0, 0, w, h); g.fillStyle = '#e2bf78'; for (let i = 0; i < 60; i++) g.fillRect((i / 60) * w, 0, i % 5 ? 3 : 8, h * (i % 5 ? 0.5 : 0.9)); });
  const bezel = new THREE.Mesh(new THREE.LatheGeometry(bezelProf, 160), new THREE.MeshPhysicalMaterial({ map: bezelTex, metalness: 0.4, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.5 }));
  bezel.rotation.x = Math.PI / 2; add(bezel, 0.16, 3.2, 11);
  // strap
  const strapMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0x444444), clearcoat: 0.3 });
  for (const sy of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.98, 2.4, 0.12, 2, 48, 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.2, a = y / 2.6; p.setY(i, Math.sin(a) * 2.6 * (1 - 0.0) / 1 * 0.95 * sy + sy * 1.05 - sy * 0.0); p.setZ(i, p.getZ(i) - (1 - Math.cos(a)) * 2.6 - 0.05); }
    g.computeVertexNormals();
    const st = new THREE.Mesh(g, strapMat); add(st, 0, -0.6, 0, { ey: sy * 1.2 });
  }

  const sweep = new THREE.SpotLight(0xffffff, 0, 14, 0.25, 0.6, 1.2); sweep.position.set(-3, 4, 4); scene.add(sweep); scene.add(sweep.target);
  const rim = new THREE.DirectionalLight(0xffc680, 1.1); rim.position.set(3, 2, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.8); fill.position.set(-4, -1, 3); scene.add(fill);
  const motes = dust(700, [6, 9, 6], { seed: 61, size: 3, color: [1.0, 0.85, 0.6], opacity: 0.35 }); scene.add(motes);

  const ASM = 2.75;
  function update(lt, opt = {}) {
    motes.material.uniforms.uTime.value = lt;
    const asmK = (order) => easeInOutQuint(range(lt, ASM + order * 0.13, ASM + order * 0.13 + 0.62));
    for (const p of parts) {
      const k = 1 - asmK(p.order);
      const drift = 0.05 * Math.sin(lt * 0.8 + p.order) * k;
      p.obj.position.set(p.base.x + p.ex.x * k, p.base.y + p.ex.y * k + drift, p.base.z + p.ex.z * k);
      if (p.spin) p.obj.rotation.z = p.rot0 + lt * p.spin;
    }
    balRef.obj.rotation.z = 0.9 * Math.sin(lt * 2 * Math.PI * 2.0);
    // seconds hand: ticking 4 beats/sec sweep
    const ticks = Math.floor(lt * 4) / 4; secRef.obj.rotation.z = -(ticks / 60) * Math.PI * 2 - 0.4;
    // whole watch tilts: face-up stack during explosion -> facing camera
    const fin = easeInOut(range(lt, ASM + 0.6, ASM + 2.4));
    watch.rotation.set(lerp(-1.22, -0.18, fin), lerp(0.35, -0.28, fin) + 0.08 * Math.sin(lt * 0.4), lerp(0.25, 0.0, fin));
    sweep.intensity = 35 * sstep(4.7, 5.0, lt) * (1 - sstep(6.0, 6.4, lt));
    sweep.target.position.set(lerp(-1.4, 1.4, range(lt, 4.7, 6.3)), 0.2, 0);

    if (opt.variant === 1) { setCam(camera, orbitPos([0, 0.2, 0], 12.5, 0.6 + lt * 0.25, 0.1), [0, 0.3, 0]); return; }
    if (opt.variant === 2) { setCam(camera, orbitPos([0, 0, 0], 15, 0.15, 0.05), [0, -0.1, 0]); return; }
    const pos = track(lt, [[0, [1.1, -0.6, 1.7]], [0.9, [3.2, 0.2, 9.5], easeOut], [2.75, [-3.6, 0.9, 12.8], easeInOut], [4.8, [1.2, 0.4, 8.8], easeInOut], [6.4, [0.7, 0.3, 7.9], easeInOut]]);
    const tgt = track(lt, [[0, [0.15, -0.95, -0.3]], [0.9, [0, 0.0, 0]], [2.75, [0, 0.2, 0]], [4.8, [0, -0.05, 0]]]);
    setCam(camera, pos, tgt);
  }
  return { scene, camera, update };
}
