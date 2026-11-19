// SCENE 04 — BEVERAGE: premium can, hyperreal liquid explosion forming a ring, slow motion
import * as THREE from 'three';
import { track, easeInOut, easeOut, easeIn, sstep, range, dust, backdrop, setCam, orbitPos, canvasTex, rng, radialDisc, GLSL_NOISE, lerp } from '../lib.js';

export const BURST = 1.15;
export const simTime = (lt) => { if (lt < BURST) return 0; const d = lt - BURST; return d < 0.16 ? d : 0.16 + (d - 0.16) * 0.15; };
export const HERO = new THREE.Vector3(0.95, 1.18, 1.05);

export function build(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envProduct;
  scene.add(backdrop([0, 0, 0], [0.006, 0.005, 0.004], [0, 0, 0], [0, 0.1], [0.05, 0.03, 0.012]));
  const camera = new THREE.PerspectiveCamera(32, ctx.W / ctx.H, 0.01, 200);

  // ---- can
  const can = new THREE.Group(); scene.add(can);
  const prof = [[0.0, 0.03], [0.3, 0.0], [0.42, 0.025], [0.475, 0.09], [0.5, 0.17], [0.5, 1.5], [0.47, 1.6], [0.425, 1.68], [0.415, 1.705], [0.43, 1.72], [0.425, 1.735], [0.395, 1.715], [0.385, 1.69], [0.0, 1.69]].map(([x, y]) => new THREE.Vector2(x, y));
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xd9dadc, metalness: 1, roughness: 0.22, envMapIntensity: 1.5 });
  can.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 160), alu));
  const label = canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0b0c'); gr.addColorStop(1, '#050505'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e6c27a'; g.textAlign = 'center';
    // front faces +Z: lathe u=0.25 maps to +Z side for CylinderGeometry -> centre text at x = w*0.25
    const cx = w * 0.5;
    g.font = '700 92px Syncopate'; g.fillText('LUMIQ', cx, 520);
    g.fillRect(cx - 150, 570, 300, 4);
    g.font = '500 30px Inter'; g.letterSpacing = '9px'; g.fillText('SPARKLING YUZU', cx, 640);
    g.font = '400 22px Inter'; g.letterSpacing = '7px'; g.fillText('BOTANICAL · LOW SUGAR', cx, 690);
    g.beginPath(); g.arc(cx, 290, 70, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = '#e6c27a'; g.stroke();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.moveTo(cx, 290); g.lineTo(cx + Math.cos(a) * 60, 290 + Math.sin(a) * 60); g.lineWidth = 2; g.stroke(); }
    g.font = '400 30px Inter'; g.letterSpacing = '8px'; g.fillText('330 ML', w * 0.06, 880);
    for (let i = 0; i < 2; i++) { g.fillRect(0, i ? h - 60 : 52, w, 3); }
  });
  const mr = canvasTex(2048, 1024, (g, w, h) => {
    g.fillStyle = 'rgb(0,95,90)'; g.fillRect(0, 0, w, h); // G=roughness .37, B=metalness .35
    g.fillStyle = 'rgb(0,80,165)'; g.textAlign = 'center'; const cx = w * 0.5;
    g.font = '700 92px Syncopate'; g.fillText('LUMIQ', cx, 520); g.fillRect(cx - 150, 570, 300, 4);
    g.font = '500 30px Inter'; g.letterSpacing = '9px'; g.fillText('SPARKLING YUZU', cx, 640);
    g.font = '400 22px Inter'; g.letterSpacing = '7px'; g.fillText('BOTANICAL · LOW SUGAR', cx, 690);
    g.beginPath(); g.arc(cx, 290, 70, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = 'rgb(0,80,165)'; g.stroke();
    g.font = '400 30px Inter'; g.letterSpacing = '8px'; g.fillText('330 ML', w * 0.06, 880);
    for (let i = 0; i < 2; i++) g.fillRect(0, i ? h - 60 : 52, w, 3);
  }, false);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5015, 0.5015, 1.33, 160, 1, true), new THREE.MeshPhysicalMaterial({ map: label, metalnessMap: mr, roughnessMap: mr, metalness: 1, roughness: 1, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1.6 }));
  body.position.y = 0.835; body.rotation.y = Math.PI; can.add(body);
  const tab = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 4, 12), alu); tab.rotation.z = Math.PI / 2; tab.scale.set(1, 1, 0.2); tab.position.set(0.05, 1.705, 0); can.add(tab);
  // condensation beads
  const R = rng(55), beadN = 650;
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.0, metalness: 0, transparent: true, opacity: 0.14, clearcoat: 1, envMapIntensity: 2.0, specularIntensity: 1 }), beadN);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < beadN; i++) {
    const a = R() * Math.PI * 2, y = 0.22 + R() * 1.25, s = 0.004 + Math.pow(R(), 3) * 0.013;
    pv.set(Math.sin(a) * 0.503, y, Math.cos(a) * 0.503); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
    sv.set(s, s * 1.15, s * 0.45); m4.compose(pv, q, sv); beads.setMatrixAt(i, m4);
  }
  can.add(beads);
  can.position.y = -0.1;

  // ---- liquid
  const liquidMat = new THREE.MeshPhysicalMaterial({ color: 0xf0a43a, emissive: 0x8a4a08, emissiveIntensity: 0.9, roughness: 0.03, metalness: 0, ior: 1.34, specularIntensity: 1, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0, sheen: 0.5, sheenColor: new THREE.Color(0xffd27a) });
  const DN = 2600, dropG = new THREE.IcosahedronGeometry(1, 2);
  const drops = new THREE.InstancedMesh(dropG, liquidMat, DN); drops.frustumCulled = false; scene.add(drops);
  const D = [];
  for (let i = 0; i < DN; i++) {
    const a = R() * Math.PI * 2, y = 0.25 + R() * 1.4, ring = i < 1100;
    const sp = 1.4 + Math.pow(R(), 1.5) * 5.5;
    D.push({ a, y, ring, sp, up: 0.5 + R() * 3.2, sw: (R() - 0.5) * 2.5, s: (ring ? 0.009 : 0.006) + Math.pow(R(), 5) * (ring ? 0.035 : 0.045), ph: R() * 6.28, rr: 1.15 + (R() - 0.5) * 0.35, ry: 0.85 + (R() - 0.5) * 0.25 });
  }
  const RU = { uTime: { value: 0 }, uAmp: { value: 0.05 } };
  const torusMat = liquidMat.clone();
  torusMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, RU); sh.vertexShader = `uniform float uTime, uAmp;\n${GLSL_NOISE}\n` + sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * uAmp * snoise(vec3(position*2.2 + vec3(uTime*0.8, 0.0, uTime*0.5)));`); };
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.055, 40, 360), torusMat); torus.rotation.x = Math.PI / 2 - 0.12; torus.position.y = 0.85; scene.add(torus);
  const torus2 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.022, 24, 300), torusMat); torus2.rotation.x = Math.PI / 2 + 0.22; torus2.rotation.y = 0.3; torus2.position.y = 0.95; scene.add(torus2);
  const hero = new THREE.Mesh(new THREE.SphereGeometry(0.075, 64, 32), liquidMat); hero.position.copy(HERO); scene.add(hero);

  const glow = radialDisc(2.6, new THREE.Color(0.7, 0.42, 0.14), 0.16, true); glow.rotation.x = 0; glow.position.set(0, 0.9, -3.5); scene.add(glow);
  const rimL = new THREE.DirectionalLight(0xffc070, 4); rimL.position.set(-4, 2, -4); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0xdfe8ff, 3); rimR.position.set(4, 3, -3); scene.add(rimR);
  const key = new THREE.SpotLight(0xffffff, 30, 20, 0.5, 0.8, 1.4); key.position.set(2, 5, 5); key.target = can; scene.add(key);
  const fizz = dust(1200, [5, 5, 5], { seed: 77, size: 3.5, color: [1.0, 0.85, 0.55], opacity: 0.6, y: 0.9, drift: [0, 0.32, 0] }); scene.add(fizz);

  const vel = new THREE.Vector3();
  function update(lt, opt = {}) {
    const st = simTime(lt);
    RU.uTime.value = lt * 0.6 + st * 2; fizz.material.uniforms.uTime.value = lt;
    can.rotation.y = -0.35 + lt * 0.12; can.rotation.z = 0.04 * Math.sin(lt * 0.7);
    const g = -5.0;
    for (let i = 0; i < DN; i++) {
      const d = D[i];
      if (st <= 0) { sv.setScalar(1e-5); m4.compose(pv.set(0, -50, 0), q, sv); drops.setMatrixAt(i, m4); continue; }
      const dir = new THREE.Vector3(Math.sin(d.a), 0, Math.cos(d.a));
      const tang = new THREE.Vector3(Math.cos(d.a), 0, -Math.sin(d.a));
      const p0 = dir.clone().multiplyScalar(0.5).setY(d.y);
      // ballistic burst
      pv.copy(p0).addScaledVector(dir, d.sp * st).addScaledVector(tang, d.sw * st); pv.y += d.up * st + 0.5 * g * st * st;
      vel.copy(dir).multiplyScalar(d.sp).addScaledVector(tang, d.sw); vel.y += d.up + g * st;
      if (d.ring) { // drawn into the orbiting ring structure
        const k = sstep(0.12, 0.6, st), ang = d.a + st * 1.6 + d.ph * 0.02;
        const rp = new THREE.Vector3(Math.sin(ang) * d.rr, d.ry + 0.08 * Math.sin(ang * 3 + d.ph), Math.cos(ang) * d.rr);
        pv.lerp(rp, k); vel.lerp(new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang)).multiplyScalar(2), k);
      }
      const spd = vel.length();
      q.setFromUnitVectors(up, vel.clone().normalize());
      const stretch = 1 + Math.min(spd * 0.12, 1.4);
      const appear = sstep(0, 0.03, st);
      sv.set(d.s, d.s * stretch, d.s).multiplyScalar(appear);
      m4.compose(pv, q, sv); drops.setMatrixAt(i, m4);
    }
    drops.instanceMatrix.needsUpdate = true;
    const ringK = sstep(0.2, 0.75, st);
    torus.scale.setScalar(Math.max(1e-4, ringK)); torus.rotation.z = st * 1.5; torus.visible = ringK > 0.01;
    torus2.scale.setScalar(Math.max(1e-4, sstep(0.35, 0.9, st))); torus2.rotation.z = -st * 1.2; torus2.visible = st > 0.36;
    hero.scale.setScalar(Math.max(1e-4, sstep(0.25, 0.6, st)));
    hero.position.copy(HERO).add(new THREE.Vector3(0, 0.02 * Math.sin(lt * 1.3), 0));

    if (opt.variant === 1) { setCam(camera, orbitPos([0, 0.95, 0], 2.3, 0.5 + lt * 0.12, 0.08), [0, 1.0, 0]); return; }
    if (opt.variant === 2) { setCam(camera, orbitPos([0, 0.85, 0], 6.8, 0.2 + lt * 0.05, 0.06), [0, 0.85, 0]); return; }
    if (opt.variant === 3) { setCam(camera, orbitPos([0, 0.9, 0], 5.6, -0.4 + lt * 0.1, 0.32), [0, 0.85, 0]); return; }
    // fast push-in -> slow-motion orbit -> macro -> dive into hero droplet
    const orbit = (x) => orbitPos([0, 0.4, 0], lerp(6.6, 5.4, range(x, BURST, 6.3)), lerp(0.0, 0.55, easeInOut(range(x, BURST, 6.3))), lerp(0.04, 0.12, range(x, BURST, 6.3)));
    let pos, tgt;
    if (lt < BURST) { pos = track(lt, [[0, [0, 1.1, 11.5]], [BURST, orbit(BURST), (t) => 1 - Math.pow(1 - t, 2.2)]]); tgt = [0, 0.32, 0]; }
    else if (lt < 6.3) { pos = orbit(lt); tgt = [0, 0.32, 0]; }
    else {
      const k = easeInOut(range(lt, 6.3, 7.7));
      const start = new THREE.Vector3(...orbit(6.3)), end = HERO.clone().add(new THREE.Vector3(0.0, 0.0, 0.16));
      const p = start.lerp(end, k); pos = [p.x, p.y, p.z];
      const tg = new THREE.Vector3(0, 0.32, 0).lerp(HERO, sstep(0, 0.6, range(lt, 6.3, 7.7))); tgt = [tg.x, tg.y, tg.z];
    }
    setCam(camera, pos, tgt);
  }
  return { scene, camera, update };
}
