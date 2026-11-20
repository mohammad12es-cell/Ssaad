// CITY WORLD (units: m). A Persian city on a golden tea-sea at dusk, the world inside the glass.
// Also exports the miniature (cm) version used when the city rises above the rim.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js';
import { GLSL_NOISE, rng, clamp, lerp, smooth, smoother, easeInOut, easeOut, easeIn, Track, applyCam, dotTexture } from './common.js';

const SUN = new THREE.Vector3(-0.78, 0.085, 0.62).normalize(); // toward the low sun, over the sea
const FOG = new THREE.Color(0.2, 0.085, 0.024);
const LAND_Y = 1.5, RIVER = 18, COAST = 60;

// ---------- shapes ----------
function archPath(path, cx, w, yb, ys, ha) { // pointed (Persian) arch opening as a hole path
  path.moveTo(cx - w / 2, yb); path.lineTo(cx - w / 2, ys);
  path.quadraticCurveTo(cx - w / 2, ys + ha * 0.82, cx, ys + ha);
  path.quadraticCurveTo(cx + w / 2, ys + ha * 0.82, cx + w / 2, ys);
  path.lineTo(cx + w / 2, yb); path.lineTo(cx - w / 2, yb);
}
function archWall(len, h, depth, rows) { // rows: [{w, yb, ys, ha, step, offset}]
  const s = new THREE.Shape(); s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.lineTo(-len / 2, 0);
  for (const r of rows) for (let x = -len / 2 + r.offset; x <= len / 2 - r.offset + 0.01; x += r.step) { const p = new THREE.Path(); archPath(p, x, r.w, r.yb, r.ys, r.ha); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -depth / 2); return g;
}
export function domeGeometry(R, H, seg = 64) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI / 2;
    const r = R * Math.cos(a) * (1 + 0.13 * Math.sin(2 * a)) * (1 - 0.1 * Math.pow(a / (Math.PI / 2), 3));
    pts.push(new THREE.Vector2(Math.max(r, 0.001), H * Math.pow(Math.sin(a), 1.1)));
  }
  pts.push(new THREE.Vector2(0.001, H * 1.06));
  const g = new THREE.LatheGeometry(pts.reverse().reverse(), seg); g.computeVertexNormals(); return g;
}

// ---------- materials ----------
const WINDOW_GLSL = /* glsl */`
varying vec3 vWP_; varying vec3 vWN_; varying float vLY; varying float vH; varying float vSeed;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }`;
function windowMaterial(opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + WINDOW_GLSL)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 lp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp; vH = length(instanceMatrix[1].xyz); vSeed = h12(instanceMatrix[3].xz*0.137);
          vWN_ = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
        #else
          vH = 10.0; vSeed = 0.5; vWN_ = normalize(mat3(modelMatrix) * objectNormal);
        #endif
        vWP_ = (modelMatrix * lp).xyz; vLY = position.y;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + WINDOW_GLSL)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 n = normalize(vWN_);
          float wall = 1.0 - step(0.5, abs(n.y));
          float u = abs(n.x) > abs(n.z) ? vWP_.z : vWP_.x;
          float v = vLY * vH;
          vec2 cell = vec2(u / 3.3 + vSeed*7.0, (v - 0.9) / 3.2);
          vec2 f = fract(cell); vec2 id = floor(cell);
          float arch = 0.6 + 0.16 * (1.0 - min(abs(f.x - 0.5) * 6.0, 1.0));
          float win = step(0.32, f.x) * step(f.x, 0.68) * step(0.18, f.y) * step(f.y, arch);
          win *= step(0.0, cell.y) * step(v + 1.4, vH);
          float rnd = h12(id + vec2(vSeed * 91.0, floor(n.x * 2.0 + n.z * 3.0) * 13.0));
          float lit = step(0.38, rnd);
          vec3 wc = mix(vec3(1.0, 0.46, 0.13), vec3(1.0, 0.72, 0.4), h12(id * 1.7 + vSeed));
          totalEmissiveRadiance += win * wall * lit * wc * (1.6 + 4.0 * rnd);
          diffuseColor.rgb *= 1.0 - win * wall * 0.85;
          float ao = 0.35 + 0.65 * smoothstep(0.0, 7.0, v);
          diffuseColor.rgb *= ao;
          diffuseColor.rgb *= 0.92 + 0.16 * h12(floor(vWP_.xz*0.5) + vSeed);
        }`);
  };
  return m;
}

// sky colour (shared by sky dome and the fog of custom shaders)
const SKY_GLSL = /* glsl */`
uniform vec3 uSun; uniform float uTime;
vec3 skyCol(vec3 d){
  float y = d.y;
  vec3 hor = vec3(1.1, 0.5, 0.14), mid = vec3(0.2, 0.07, 0.018), top = vec3(0.025, 0.009, 0.003);
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.12, y)); c = mix(c, top, smoothstep(0.1, 0.55, y));
  c = mix(c, vec3(0.32,0.12,0.03), smoothstep(0.0, -0.1, y));
  float s = max(dot(d, uSun), 0.0);
  c += vec3(1.0, 0.55, 0.18) * pow(s, 8.0) * 1.2 + vec3(1.0, 0.75, 0.4) * pow(s, 90.0) * 3.0;
  c += vec3(1.0, 0.9, 0.7) * smoothstep(0.9993, 0.99965, s) * 6.0;
  return c;
}`;

// ---------- City generator ----------
function buildCity(scene, env, R) {
  const stone = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.62, 0.47, 0.32), roughness: 0.82, envMap: env, envMapIntensity: 0.4 });
  stone.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSW; varying vec3 vSN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSW = (modelMatrix*vec4(transformed,1.0)).xyz; vSN = normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSW; varying vec3 vSN;\n' + GLSL_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float u = abs(vSN.x) > abs(vSN.z) ? vSW.z : vSW.x;
          float row = floor(vSW.y / 0.55);
          float bx = fract((u + mod(row,2.0)*0.6) / 1.2); float by = fract(vSW.y / 0.55);
          float mortar = max(smoothstep(0.93, 0.99, by), smoothstep(0.95, 0.995, bx)) * step(abs(vSN.y), 0.5);
          float n = snoise(vec3(vSW*0.35)) * 0.5 + snoise(vec3(vSW*2.1)) * 0.25;
          diffuseColor.rgb *= (0.86 + 0.18*n) * (1.0 - mortar*0.45) * (0.9 + 0.2*hash12(vec2(row, floor((u + mod(row,2.0)*0.6)/1.2))));
          float band = step(abs(vSN.y), 0.5) * smoothstep(0.0, 0.05, abs(fract(vSW.y/6.0)-0.5)-0.44);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1,0.22,0.24), band*0.0);
        }`);
  };
  const stoneDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.32, 0.22, 0.14), roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.7, 0.3), metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.6 });
  const cream = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.86, 0.74, 0.56), roughness: 0.55, envMap: env, envMapIntensity: 0.7 });
  const glowWarm = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 2.6, 0.9) });
  const glowRecess = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.75, 0.25) });
  const cypress = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.06, 0.03), roughness: 1 });
  const houseMat = windowMaterial({ envMap: env, envMapIntensity: 0.35 });
  const lamps = []; // [x,y,z]

  // land plateaus and embankments
  const land = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.2, 0.13, 0.08), roughness: 0.95 });
  for (const side of [-1, 1]) {
    const w = 1600; const m = new THREE.Mesh(new THREE.BoxGeometry(w, LAND_Y + 6, 1700), land);
    m.position.set(side * (RIVER + w / 2), (LAND_Y - 6) / 2, COAST - 850); scene.add(m);
  }
  // promenade lamps along the coast and the river
  for (let x = -700; x <= 700; x += 11) if (Math.abs(x) > RIVER + 2) lamps.push([x, LAND_Y + 3.2, COAST - 1.5]);
  for (let z = COAST - 4; z > -650; z -= 11) { lamps.push([-RIVER - 1.5, LAND_Y + 3.2, z]); lamps.push([RIVER + 1.5, LAND_Y + 3.2, z]); }

  // roads (for traffic + keeping buildings off them)
  const roads = [
    { a: [-640, -30], b: [-RIVER - 6, -30] }, { a: [RIVER + 6, -30], b: [640, -30] },
    { a: [-RIVER - 8, 50], b: [-RIVER - 8, -640] }, { a: [RIVER + 8, 50], b: [RIVER + 8, -640] },
    { a: [-640, -260], b: [-RIVER - 6, -260] }, { a: [RIVER + 6, -260], b: [640, -260] },
    { a: [170, 50], b: [170, -640] }, { a: [-180, 50], b: [-180, -640] }, { a: [-640, 40], b: [-RIVER - 6, 40] }, { a: [RIVER + 6, 40], b: [640, 40] },
  ];
  const onRoad = (x, z, pad) => roads.some(({ a, b }) => {
    const minx = Math.min(a[0], b[0]) - pad, maxx = Math.max(a[0], b[0]) + pad, minz = Math.min(a[1], b[1]) - pad, maxz = Math.max(a[1], b[1]) + pad;
    return x > minx && x < maxx && z > minz && z < maxz;
  });
  for (const { a, b } of roads) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.floor(L / 16);
    const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    for (let i = 0; i <= n; i++) for (const s of [-1, 1]) lamps.push([a[0] + dx * i * 16 - dz * s * 6.5, LAND_Y + 3.6, a[1] + dz * i * 16 + dx * s * 6.5]);
  }

  // ----- Mosque complex (east bank) -----
  const MX = 70, MZ = -165;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(36, 20, 36), stone); hall.position.set(MX, LAND_Y + 10, MZ); scene.add(hall);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(13.2, 13.6, 9, 48), cream); drum.position.set(MX, LAND_Y + 24.5, MZ); scene.add(drum);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), glowWarm); w.position.set(MX + Math.cos(a) * 13.45, LAND_Y + 24.5, MZ + Math.sin(a) * 13.45); w.lookAt(MX + Math.cos(a) * 30, LAND_Y + 24.5, MZ + Math.sin(a) * 30); scene.add(w); }
  const dome = new THREE.Mesh(domeGeometry(13.8, 27), gold); dome.position.set(MX, LAND_Y + 29, MZ); scene.add(dome);
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 8), gold); fin.position.set(MX, LAND_Y + 29 + 30.5, MZ); scene.add(fin);
  const finB = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), gold); finB.position.set(MX, LAND_Y + 29 + 30, MZ); scene.add(finB);
  // iwan portal facing the maydan (south)
  const iwanG = (() => { const s = new THREE.Shape(); s.moveTo(-16, 0); s.lineTo(16, 0); s.lineTo(16, 36); s.lineTo(-16, 36); s.lineTo(-16, 0); const p = new THREE.Path(); archPath(p, 0, 17, 0, 19, 11); s.holes.push(p); const g = new THREE.ExtrudeGeometry(s, { depth: 9, bevelEnabled: false, curveSegments: 16 }); return g; })();
  const iwan = new THREE.Mesh(iwanG, stone); iwan.position.set(MX, LAND_Y, MZ + 18); scene.add(iwan);
  const recess = new THREE.Mesh(new THREE.PlaneGeometry(17, 30), glowRecess); recess.position.set(MX, LAND_Y + 15, MZ + 18.5); scene.add(recess);
  const iwanTrim = new THREE.Mesh(new THREE.BoxGeometry(32.5, 1.0, 9.6), gold); iwanTrim.position.set(MX, LAND_Y + 36.2, MZ + 22.5); scene.add(iwanTrim);
  for (const s of [-1, 1]) { // minarets
    const x = MX + s * 13, z = MZ + 30;
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.3, 46, 24), cream); sh.position.set(x, LAND_Y + 23, z); scene.add(sh);
    const bal = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 2.2, 1.6, 24), stone); bal.position.set(x, LAND_Y + 46.8, z); scene.add(bal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.18, 6, 32), glowWarm); ring.rotation.x = Math.PI / 2; ring.position.set(x, LAND_Y + 47.8, z); scene.add(ring);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 7, 20), cream); up.position.set(x, LAND_Y + 51, z); scene.add(up);
    const cap = new THREE.Mesh(domeGeometry(1.9, 4.5, 24), gold); cap.position.set(x, LAND_Y + 54.5, z); scene.add(cap);
    for (let k = 0; k < 6; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4), glowWarm); const a = (k / 6) * Math.PI * 2; w.position.set(x + Math.cos(a) * 1.52, LAND_Y + 51, z + Math.sin(a) * 1.52); w.lookAt(x + Math.cos(a) * 5, LAND_Y + 51, z + Math.sin(a) * 5); scene.add(w); }
  }
  // ----- Maydan (plaza) with two-storey arcades -----
  const PX0 = 34, PX1 = 106, PZ0 = -138, PZ1 = -42;
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(PX1 - PX0, PZ1 - PZ0), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.34, 0.24, 0.15), roughness: 0.6, envMap: env, envMapIntensity: 0.5 }));
  paving.rotation.x = -Math.PI / 2; paving.position.set((PX0 + PX1) / 2, LAND_Y + 0.02, (PZ0 + PZ1) / 2); scene.add(paving);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(10, 70), new THREE.MeshStandardMaterial({ color: 0x050302, metalness: 1, roughness: 0.04, envMap: env, envMapIntensity: 1.3 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(70, LAND_Y + 0.06, -90); scene.add(pool);
  const rows = [{ w: 3.0, yb: 0.35, ys: 3.2, ha: 2.4, step: 4.4, offset: 2.6 }, { w: 2.4, yb: 7.0, ys: 8.4, ha: 1.9, step: 4.4, offset: 2.6 }];
  const wallSpec = [
    { len: PX1 - PX0, x: (PX0 + PX1) / 2, z: PZ1, ry: 0 },
    { len: PZ1 - PZ0 - 4, x: PX0, z: (PZ0 + PZ1) / 2, ry: Math.PI / 2 },
    { len: PZ1 - PZ0 - 4, x: PX1, z: (PZ0 + PZ1) / 2, ry: Math.PI / 2 },
    { len: 22, x: PX0 + 11, z: PZ0, ry: 0 }, { len: 22, x: PX1 - 11, z: PZ0, ry: 0 },
  ];
  for (const w of wallSpec) {
    const g = archWall(w.len, 12, 1.2, rows);
    const m = new THREE.Mesh(g, stone); m.position.set(w.x, LAND_Y - 0.33, w.z); m.rotation.y = w.ry; scene.add(m);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w.len, 11), glowRecess); back.position.set(w.x, LAND_Y + 5.5, w.z); back.rotation.y = w.ry;
    const out = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), w.ry);
    const sign = (new THREE.Vector3(70 - w.x, 0, -90 - w.z).dot(out) > 0) ? -1 : 1;
    back.position.addScaledVector(out, sign * 4); back.lookAt(back.position.clone().addScaledVector(out, -sign)); scene.add(back);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w.len, 0.8, 9), stone); roof.position.set(w.x, LAND_Y + 12.2, w.z); roof.rotation.y = w.ry; roof.position.addScaledVector(out, sign * 3.8); scene.add(roof);
  }
  // cypress rows along the pool
  const cyG = new THREE.ConeGeometry(1.1, 9, 10); cyG.translate(0, 4.5, 0);
  const cyI = new THREE.InstancedMesh(cyG, cypress, 40); let ci = 0; const mtx = new THREE.Matrix4();
  for (let z = -124; z <= -56 && ci < 40; z += 7) for (const x of [61, 79]) { mtx.makeScale(1, 0.9 + R() * 0.3, 1).setPosition(x, LAND_Y, z); cyI.setMatrixAt(ci++, mtx); }
  cyI.count = ci; scene.add(cyI);
  for (let z = -130; z <= -50; z += 9) { lamps.push([PX0 + 6, LAND_Y + 3, z]); lamps.push([PX1 - 6, LAND_Y + 3, z]); }

  // ----- Bridge (two-tier arcade, Si-o-se-pol style) -----
  const BL = RIVER * 2 + 8;
  const bridgeRows = [{ w: 4.4, yb: 0.4, ys: 5.0, ha: 3.6, step: 6, offset: BL / 2 - 12 }, { w: 1.6, yb: 9.4, ys: 10.2, ha: 1.3, step: 3, offset: 1.6 }];
  const bridge = new THREE.Mesh(archWall(BL, 14, 11, bridgeRows), stone); bridge.position.set(0, -1.6, 0); scene.add(bridge);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(BL + 4, 0.6, 12), stoneDark); deck.position.set(0, 12.3, 0); scene.add(deck);
  for (let x = -12; x <= 12; x += 6) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), glowWarm); l.position.set(x, 6.2, 0); scene.add(l); }
  for (let x = -BL / 2 + 1.6; x <= BL / 2 - 1.5; x += 3) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), glowRecess); l.position.set(x, 9.0, 0); scene.add(l); }
  for (let x = -BL / 2; x <= BL / 2; x += 4) lamps.push([x, 13.6, 5.6], [x, 13.6, -5.6]);
  // a second, distant bridge upriver
  const bridge2 = new THREE.Mesh(archWall(BL, 9, 8, [{ w: 3.4, yb: 0.4, ys: 3.4, ha: 2.6, step: 5, offset: 2.5 }]), stone); bridge2.position.set(0, -1.6, -330); scene.add(bridge2);

  // ----- Houses, domes, windcatchers -----
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const houses = [];
  const nearMosque = (x, z) => x > PX0 - 6 && x < PX1 + 6 && z > MZ - 26 && z < PZ1 + 6;
  for (let gx = -620; gx <= 620; gx += 13) for (let gz = 52; gz >= -640; gz -= 13) {
    const x = gx + (R() - 0.5) * 4, z = gz + (R() - 0.5) * 4;
    if (Math.abs(x) < RIVER + 14) continue;
    if (onRoad(x, z, 8) || nearMosque(x, z)) continue;
    if (Math.abs(x) < 36 && Math.abs(z) < 16) continue; // bridge heads
    const d = Math.hypot(x - 40, z + 120);
    if (R() < smooth(300, 640, d)) continue;
    const w = 7 + R() * 5, dd = 7 + R() * 5, h = 5 + R() * 7 + (R() < 0.08 ? 8 : 0);
    houses.push({ x, z, w, d: dd, h, r: (R() < 0.5 ? 0 : Math.PI / 2) + (R() - 0.5) * 0.06 });
  }
  const hI = new THREE.InstancedMesh(box, houseMat, houses.length);
  const col = new THREE.Color();
  houses.forEach((b, i) => {
    mtx.compose(new THREE.Vector3(b.x, LAND_Y, b.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.r), new THREE.Vector3(b.w, b.h, b.d));
    hI.setMatrixAt(i, mtx);
    const k = R(); col.setRGB(lerp(0.58, 0.8, k), lerp(0.43, 0.6, k), lerp(0.28, 0.4, k)); hI.setColorAt(i, col);
  });
  scene.add(hI);
  // small domes on some roofs, windcatchers on others
  const smallDome = domeGeometry(1, 1.25, 20);
  const sd = houses.filter(() => R() < 0.13); const sdI = new THREE.InstancedMesh(smallDome, cream, sd.length);
  sd.forEach((b, i) => { const s = Math.min(b.w, b.d) * 0.36; mtx.makeScale(s, s, s).setPosition(b.x, LAND_Y + b.h, b.z); sdI.setMatrixAt(i, mtx); }); scene.add(sdI);
  const wc = houses.filter(() => R() < 0.12);
  const wcG = (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; })();
  const wcMat = windowMaterial({ envMap: env, envMapIntensity: 0.3 });
  const wcI = new THREE.InstancedMesh(wcG, wcMat, wc.length);
  wc.forEach((b, i) => { mtx.makeScale(3.2, b.h + 7, 3.2).setPosition(b.x + b.w * 0.25, LAND_Y, b.z - b.d * 0.25); wcI.setMatrixAt(i, mtx); col.setRGB(0.7, 0.55, 0.38); wcI.setColorAt(i, col); }); scene.add(wcI);
  const capG = new THREE.BoxGeometry(3.8, 0.6, 3.8); const capI = new THREE.InstancedMesh(capG, stone, wc.length);
  wc.forEach((b, i) => { mtx.makeTranslation(b.x + b.w * 0.25, LAND_Y + b.h + 7.3, b.z - b.d * 0.25); capI.setMatrixAt(i, mtx); }); scene.add(capI);
  // windcatcher slits (dark) — four faces
  const slitG = new THREE.PlaneGeometry(0.35, 4.2); const slitI = new THREE.InstancedMesh(slitG, new THREE.MeshBasicMaterial({ color: 0x0a0503 }), wc.length * 12); let si = 0;
  const q = new THREE.Quaternion();
  wc.forEach((b) => { const cx = b.x + b.w * 0.25, cz = b.z - b.d * 0.25, y = LAND_Y + b.h + 4.4;
    for (let f = 0; f < 4; f++) { const a = f * Math.PI / 2; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); const nx = Math.sin(a), nz = Math.cos(a);
      for (let k = -1; k <= 1; k++) { mtx.compose(new THREE.Vector3(cx + nx * 1.61 + nz * k * 0.9, y, cz + nz * 1.61 - nx * k * 0.9), q, new THREE.Vector3(1, 1, 1)); slitI.setMatrixAt(si++, mtx); } } });
  scene.add(slitI);
  // more minarets and secondary blue-gold domes across the skyline
  for (let i = 0; i < 9; i++) {
    let x, z; do { x = (R() - 0.5) * 900; z = -80 - R() * 520; } while (Math.abs(x) < RIVER + 30 || onRoad(x, z, 10) || (x > -40 && x < 160 && z > -300));
    const dm = new THREE.Mesh(domeGeometry(6 + R() * 3, 11 + R() * 4, 40), i % 3 === 0 ? gold : cream); dm.position.set(x, LAND_Y + 12, z); scene.add(dm);
    const bs = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 12, 32), stone); bs.position.set(x, LAND_Y + 6, z); scene.add(bs);
    const mn = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 30, 16), cream); mn.position.set(x + 11, LAND_Y + 15, z + 4); scene.add(mn);
    const mc = new THREE.Mesh(domeGeometry(1.3, 3, 16), gold); mc.position.set(x + 11, LAND_Y + 30, z + 4); scene.add(mc);
  }

  // ----- lamps -----
  const lampG = new THREE.SphereGeometry(0.42, 8, 6);
  const lampI = new THREE.InstancedMesh(lampG, new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.0, 1.1) }), lamps.length);
  lamps.forEach((p, i) => { mtx.makeTranslation(p[0], p[1], p[2]); lampI.setMatrixAt(i, mtx); }); scene.add(lampI);

  // ----- traffic -----
  const lanes = [];
  for (const { a, b } of roads) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    for (const dir of [1, -1]) { const n = Math.floor(L / 34); for (let i = 0; i < n; i++) lanes.push({ a, dx, dz, L, dir, off: R() * L, sp: 9 + R() * 6, lane: dir * 1.8 }); }
  }
  const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.3, 4.2), new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 0.4, metalness: 0.5, envMap: env }), lanes.length);
  const head = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.35, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 7, 4.5) }), lanes.length);
  const tail = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.3, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.35, 0.08) }), lanes.length);
  scene.add(carBody, head, tail);
  const updTraffic = (t) => {
    lanes.forEach((c, i) => {
      let s = (c.off + c.sp * t * c.dir) % c.L; if (s < 0) s += c.L;
      const x = c.a[0] + c.dx * s - c.dz * c.lane, z = c.a[1] + c.dz * s + c.dx * c.lane;
      const yaw = Math.atan2(c.dx * c.dir, c.dz * c.dir);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      mtx.compose(new THREE.Vector3(x, LAND_Y + 0.75, z), q, new THREE.Vector3(1, 1, 1)); carBody.setMatrixAt(i, mtx);
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      mtx.compose(new THREE.Vector3(x + fx * 2.12, LAND_Y + 0.75, z + fz * 2.12), q, new THREE.Vector3(1, 1, 1)); head.setMatrixAt(i, mtx);
      mtx.compose(new THREE.Vector3(x - fx * 2.12, LAND_Y + 0.85, z - fz * 2.12), q, new THREE.Vector3(1, 1, 1)); tail.setMatrixAt(i, mtx);
    });
    carBody.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = tail.instanceMatrix.needsUpdate = true;
  };
  // boats on the river (lantern boats)
  return { updTraffic, houses };
}

// ---------- World ----------
export function buildCityWorld(renderer) {
  const R = rng(1405);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG, 0.00075);
  const camera = new THREE.PerspectiveCamera(48, 1080 / 1920, 0.1, 9000);
  const U = { uSun: { value: SUN }, uTime: { value: 0 } };

  // sky
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `${SKY_GLSL} ${GLSL_NOISE} varying vec3 vD;
      void main(){ vec3 d = normalize(vD); vec3 c = skyCol(d);
        // the underside of the tea surface, far above: slow caustic lattice
        vec2 p = d.xz / max(d.y, 0.05) * 3.0;
        float k = abs(snoise(vec3(p*0.6, uTime*0.2))); k = pow(1.0 - k, 14.0);
        
        vec2 q = d.xz / (d.y + 0.08);
        float cl = fbm3(vec3(q.x*0.35, q.y*1.6, uTime*0.02));
        c = mix(c, c*vec3(1.2,1.0,0.8) + vec3(0.12,0.04,0.01), smoothstep(0.15,0.65,cl)*smoothstep(0.015,0.06,d.y)*smoothstep(0.3,0.08,d.y)*0.55);
        gl_FragColor = vec4(c,1.); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 64, 32), skyMat); sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);

  // env for metals: sky only
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), skyMat));
  const env = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0).texture;

  // lights
  const sunL = new THREE.DirectionalLight(new THREE.Color(1.0, 0.58, 0.26), 1.5); sunL.position.copy(SUN).multiplyScalar(1000); scene.add(sunL);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.85, 0.45, 0.16), new THREE.Color(0.06, 0.02, 0.006), 0.22));

  // mountains
  const mg = new THREE.CylinderGeometry(2600, 2600, 1, 256, 8, true);
  const mp = mg.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), z = mp.getZ(i), y = mp.getY(i);
    const a = Math.atan2(z, x);
    const hgt = 120 + 140 * Math.abs(Math.sin(a * 3.0 + 1.0)) + 70 * Math.sin(a * 11.0) + 35 * Math.sin(a * 37.0);
    mp.setY(i, y > 0 ? hgt * (z < 0 ? 1.0 : 0.15) : -10);
  }
  mg.computeVertexNormals();
  const mountains = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ color: new THREE.Color(0.18, 0.08, 0.03), roughness: 1, side: THREE.DoubleSide }));
  scene.add(mountains);

  const city = buildCity(scene, env, R);

  // ----- sea + giant wave (shared shading) -----
  const rtRefl = new THREE.WebGLRenderTarget(540, 960, { type: THREE.HalfFloatType });
  const reflCam = new THREE.PerspectiveCamera();
  const SU = {
    ...U, tRefl: { value: rtRefl.texture }, reflVP: { value: new THREE.Matrix4() }, uFogD: { value: 0.00075 },
    uWZ: { value: 2000 }, uWH: { value: 0 }, uWave: { value: 0 },
  };
  const SEA_COMMON = /* glsl */`
    uniform sampler2D tRefl; uniform mat4 reflVP; uniform float uFogD, uWZ, uWH, uWave;
    ${SKY_GLSL}
    ${GLSL_NOISE}
    float swell(vec2 p){ return 0.35*sin(p.x*0.045 + p.y*0.03 + uTime*0.9) + 0.25*sin(p.x*-0.03 + p.y*0.06 + uTime*1.2) + 0.12*sin(p.x*0.13 + p.y*0.09 + uTime*1.7); }
    vec3 waveDisp(vec2 p){ // giant wave: returns (dx, dy, dz)
      if (uWave <= 0.0) return vec3(0.0);
      float peak = exp(-pow((p.x - 40.0)/520.0, 2.0));
      float H = uWH * (0.25 + 0.75*peak) * (0.9 + 0.1*sin(p.x*0.011)) * smoothstep(1600.0, 1000.0, abs(p.x - 40.0));
      float d = p.y - uWZ;
      float back = exp(-pow(max(d,0.0)/(1.3*H + 70.0), 1.4));
      float front = exp(-pow(max(-d,0.0)/(0.28*H + 10.0), 2.0));
      float sh = d >= 0.0 ? back : front;
      float y = H * sh;
      float curl = pow(sh, 4.0) * H * (0.25 + 0.6*peak);
      return vec3(0.0, y, -curl);
    }`;
  const seaVert = /* glsl */`${SEA_COMMON}
    varying vec3 vWP; varying vec3 vN; varying float vCrest;
    void main(){
      vec3 p = (modelMatrix*vec4(position,1.)).xyz;
      vec3 d0 = waveDisp(p.xz);
      float e = 2.0;
      vec3 dx = waveDisp(p.xz + vec2(e,0.)) + vec3(e,0.,0.);
      vec3 dz = waveDisp(p.xz + vec2(0.,e)) + vec3(0.,0.,e);
      vec3 N = normalize(cross(dz - d0, dx - d0));
      vN = N; vCrest = uWH > 0.0 ? clamp(d0.y / max(uWH,1.0), 0.0, 1.0) : 0.0;
      p += d0; p.y += swell(p.xz)*0.0;
      vWP = p; gl_Position = projectionMatrix*viewMatrix*vec4(p,1.);
    }`;
  const seaFrag = /* glsl */`${SEA_COMMON}
    varying vec3 vWP; varying vec3 vN; varying float vCrest;
    void main(){
      vec2 p = vWP.xz; float t = uTime;
      float e = 0.6;
      float n1 = snoise(vec3(p*0.045, t*0.25)) + 0.5*snoise(vec3(p*0.11, t*0.35)) + 0.25*snoise(vec3(p*0.3, t*0.5));
      float n2 = snoise(vec3((p+vec2(e,0.))*0.045, t*0.25)) + 0.5*snoise(vec3((p+vec2(e,0.))*0.11, t*0.35)) + 0.25*snoise(vec3((p+vec2(e,0.))*0.3, t*0.5));
      float n3 = snoise(vec3((p+vec2(0.,e))*0.045, t*0.25)) + 0.5*snoise(vec3((p+vec2(0.,e))*0.11, t*0.35)) + 0.25*snoise(vec3((p+vec2(0.,e))*0.3, t*0.5));
      float flatW = smoothstep(0.75, 0.98, vN.y);
      vec3 N = normalize(vN + vec3(-(n2-n1), 0.0, -(n3-n1)) * mix(0.1, 0.55, flatW));
      float streak = 0.35*snoise(vec3(p.x*0.09, vWP.y*0.012 - t*0.5, t*0.2)) + 0.15*snoise(vec3(p.x*0.3, vWP.y*0.03 - t*0.8, 3.0));
      vec3 V = normalize(cameraPosition - vWP); float dist = length(cameraPosition - vWP);
      float NV = max(dot(N,V), 0.0);
      float F = 0.05 + 0.95*pow(1.0 - NV, 4.0);
      vec4 rp = reflVP * vec4(vWP.x, 0.0, vWP.z, 1.0);
      vec2 ruv = rp.xy / rp.w * 0.5 + 0.5; ruv += N.xz * 0.035 * clamp(60.0/ (dist+20.0), 0.2, 1.0);
      ruv.y += vWP.y * 0.0;
      vec3 refl = texture2D(tRefl, clamp(ruv, 0.001, 0.999)).rgb;
      vec3 R = reflect(-V, N);
      vec3 skyR = min(skyCol(normalize(vec3(R.x, abs(R.y)+0.02, R.z))), vec3(1.3, 0.7, 0.25)) * (0.8 + 0.35*streak);
      refl = mix(skyR, refl, flatW);
      vec3 deep = vec3(0.09, 0.03, 0.006);
      float face = 1.0 - flatW;
      deep = mix(deep, vec3(0.05, 0.016, 0.003) * (0.8 + 0.5*streak), face);
      refl *= mix(1.0, 0.3, face);
      vec3 c = mix(deep, refl, clamp(F*1.15 + 0.12*flatW + 0.04, 0.0, 1.0));
      float s = max(dot(R, uSun), 0.0);
      c += vec3(1.0, 0.7, 0.35) * (pow(s, 350.0) * 10.0 + pow(s, 24.0) * 0.3) * flatW;
      // translucent golden crest (sun behind the wave)
      float back = pow(max(dot(-V, -uSun) * -1.0, 0.0), 1.0);
      float thin = pow(smoothstep(0.5, 1.0, vCrest), 2.0) * face;
      float backlit = pow(max(dot(normalize(vec3(-V.x, 0.0, -V.z)), normalize(vec3(uSun.x,0.0,uSun.z))),0.0),2.0);
      c += vec3(1.0, 0.5, 0.12) * thin * (0.5 + 3.5*backlit) * (0.6 + 0.4*snoise(vec3(p.x*0.02, vWP.y*0.02, t*0.6)));
      c += vec3(0.9, 0.36, 0.07) * pow(vCrest, 1.6) * face * (0.22 + 0.5*backlit) * (0.7 + 0.6*streak);
      c += vec3(1.0, 0.82, 0.55) * smoothstep(0.86, 0.99, vCrest) * face * 2.6 * smoothstep(-0.3, 0.5, snoise(vec3(p.x*0.06, vWP.y*0.04, t*1.2))); // foam lip
      float fogA = 1.0 - exp(-dist * uFogD);
      c = mix(c, skyCol(normalize(vec3(-V.x, max(-V.y, 0.0)*0.3 + 0.02, -V.z))) * 0.75, fogA * mix(1.0, 0.25, face));
      gl_FragColor = vec4(c, 1.0);
    }`;
  const seaMat = new THREE.ShaderMaterial({ uniforms: SU, vertexShader: seaVert, fragmentShader: seaFrag, side: THREE.DoubleSide });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000, 1, 1), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0; scene.add(sea);
  const waveGeo = new THREE.PlaneGeometry(3400, 1100, 340, 240); waveGeo.rotateX(-Math.PI / 2);
  const wave = new THREE.Mesh(waveGeo, seaMat); wave.position.set(60, 0.08, 0); wave.visible = false; wave.frustumCulled = false; scene.add(wave);

  // spray along the crest
  const nS = 1800; const sp = new Float32Array(nS * 3); const sd = new Float32Array(nS);
  for (let i = 0; i < nS; i++) { sp[i * 3] = (R() - 0.5) * 1800 + 60; sp[i * 3 + 1] = R(); sp[i * 3 + 2] = R(); sd[i] = R(); }
  const sprayGeo = new THREE.BufferGeometry(); sprayGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sprayGeo.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const spray = new THREE.Points(sprayGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...SU, map: { value: dotTexture(64, 0.2) } },
    vertexShader: `${SEA_COMMON} attribute float seed; varying float vA;
      void main(){ float x = position.x; float ph = fract(position.y + uTime*0.35*(0.5+seed));
        vec2 base = vec2(x, uWZ + 0.0); vec3 d = waveDisp(base);
        vec3 p = vec3(x, d.y, uWZ + d.z) + vec3(0., ph*uWH*0.35, (position.z-0.3)*30.0 + ph*25.0);
        vec4 mv = viewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = clamp((1.0 + seed*3.0) * 300.0 / -mv.z, 0.0, 14.0); vA = (1.0-ph) * uWave * step(30.0, uWH) * smoothstep(30.0, 120.0, -mv.z); }`,
    fragmentShader: `uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(1.0,0.8,0.5)*a*vA*0.6,1.); }`,
  }));
  spray.frustumCulled = false; spray.visible = false; // spray disabled (read as a line artifact)

  // floating golden motes / bubbles (we are inside the tea)
  const nB = 2200; const bp = new Float32Array(nB * 3); const bs = new Float32Array(nB);
  for (let i = 0; i < nB; i++) { bp[i * 3] = (R() - 0.5) * 900; bp[i * 3 + 1] = R() * 160; bp[i * 3 + 2] = 120 - R() * 520; bs[i] = R(); }
  const bubGeo = new THREE.BufferGeometry(); bubGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bubGeo.setAttribute('seed', new THREE.BufferAttribute(bs, 1));
  const bubbles = new THREE.Points(bubGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, map: { value: dotTexture(64, 0.55) } },
    vertexShader: `attribute float seed; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime*(1.5+seed*3.0), 160.0); p.x += sin(uTime*0.7 + seed*40.0)*1.5;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = clamp((0.25 + seed*0.5) * 1100.0 / -mv.z, 0.0, 16.0); vA = (0.3 + 0.7*seed) * smoothstep(2.0, 12.0, -mv.z); }`,
    fragmentShader: `uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(1.0,0.72,0.38)*a*vA*0.5,1.); }`,
  }));
  bubbles.frustumCulled = false; scene.add(bubbles);

  // clouds (the steam, seen from inside): camera descends through them at 8.0–8.8
  const clouds = [];
  const cloudMat = (seed) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { ...U, uSeed: { value: seed }, uA: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying float vDist; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vDist = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime, uSeed, uA; varying vec2 vUv; varying float vDist; ${GLSL_NOISE}
      void main(){ vec2 p = vUv - 0.5; float r = length(p*vec2(1.0,1.6));
        float n = fbm5(vec3(vUv*3.0, uSeed + uTime*0.05));
        float a = smoothstep(0.5, 0.0, r + n*0.25) * smoothstep(-0.2, 0.4, n + 0.2);
        a *= smoothstep(8.0, 70.0, vDist) * uA;
        vec3 c = mix(vec3(0.75,0.36,0.11), vec3(1.4,0.9,0.5), smoothstep(-0.3,0.5,n + p.y));
        gl_FragColor = vec4(c*0.45, a*0.5); }`,
  });
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(260 + R() * 160, 160 + R() * 80), cloudMat(R() * 10));
    m.position.set((R() - 0.5) * 500, 170 + R() * 110, 680 - R() * 560); m.userData.spin = R() * 6; scene.add(m); clouds.push(m);
  }

  // ----- camera flight (one continuous move) -----
  const fly = new Track([
    [8.0, [20, 330, 760, 0, 40, 150, 52, 0]],
    [8.8, [12, 150, 430, 0, 8, 40, 50, 0]],
    [9.6, [3, 26, 150, 0, 5, 0, 48, 0]],
    [10.3, [0.6, 4.2, 38, 0, 3.9, -20, 50, 0]],
    [10.75, [0, 3.7, -6, 0, 4.4, -70, 52, 0]],
    [11.35, [6, 13, -72, 45, 22, -135, 50, -9]],
    [11.95, [44, 52, -205, 70, 44, -160, 48, -6]],
    [12.5, [69, 72, -184, 70, 46, -110, 48, 0]],
    [13.0, [70, 41, -134, 70, 30, -60, 50, 0]],
    [13.55, [70, 30, -64, 62, 22, 90, 50, 2]],
    [14.0, [62, 30, 4, 30, 28, 300, 50, -2]],
    [15.0, [150, 22, 110, -60, 50, 520, 52, 5]],
    [15.75, [150, 12, 205, -40, 62, 470, 54, 7]],
    [16.35, [95, 32, 262, -20, 115, 400, 56, 4]],
    [16.75, [45, 85, 300, 0, 172, 390, 58, 0]],
    [17.0, [22, 125, 320, 10, 212, 385, 60, 0]],
  ]);
  const waveZ = (t) => lerp(700, 335, smoother(13.8, 17.0, t));
  const waveH = (t) => lerp(55, 150, smooth(13.6, 16.3, t));

  const W = { scene, camera };
  const tmpV = new THREE.Vector3();
  W.render = (t, post, look) => {
    U.uTime.value = t;
    city.updTraffic(t);
    applyCam(camera, fly.at(t));
    // wave
    const wOn = t >= 13.4;
    wave.visible = wOn;
    SU.uWave.value = wOn ? 1 : 0; SU.uWZ.value = waveZ(t); SU.uWH.value = wOn ? waveH(t) : 0;
    wave.position.z = SU.uWZ.value + 100;
    clouds.forEach((m) => { m.visible = t < 9.3; m.quaternion.copy(camera.quaternion); m.rotateZ(m.userData.spin); m.material.uniforms.uA.value = 1 - smooth(8.9, 9.3, t); });
    // reflection pass
    reflCam.copy(camera);
    reflCam.position.set(camera.position.x, -camera.position.y, camera.position.z);
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    tmpV.copy(camera.position).add(fwd); tmpV.y = -tmpV.y;
    reflCam.up.set(0, 1, 0); reflCam.lookAt(tmpV); reflCam.updateMatrixWorld(); reflCam.updateProjectionMatrix();
    SU.reflVP.value.multiplyMatrices(reflCam.projectionMatrix, reflCam.matrixWorldInverse);
    const pre = () => {
      sea.visible = false; const wv = wave.visible; wave.visible = false; const bv = bubbles.visible; bubbles.visible = false;
      const cv = clouds.map((c) => c.visible); clouds.forEach((c) => (c.visible = false));
      renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05)];
      renderer.setRenderTarget(rtRefl); renderer.clear(); renderer.render(scene, reflCam);
      renderer.clippingPlanes = [];
      sea.visible = true; wave.visible = wv; bubbles.visible = bv; clouds.forEach((c, i) => (c.visible = cv[i]));
    };
    // focus: the thing ahead
    look.focus = t < 13.6 ? 60 : (t < 15.6 ? 400 : 120);
    look.aperture = t > 10.0 && t < 11.0 ? 25 : 0; // shallow focus only when skimming the water
    look.focus = t > 10.0 && t < 11.0 ? 14 : look.focus;
    look.bloom = [0.7, 0.5, 0.9]; look.exposure = (t > 14.2 ? 0.78 : 0.95) * (1.0 - 0.35 * smooth(16.5, 16.95, t)) * (1.0 - 0.25 * (1 - smooth(8.0, 8.6, t)));
    post.render(scene, camera, look, pre);
  };
  return W;
}

// ---------- Miniature city (cm) for the climax above the rim ----------
export function buildMiniCity() {
  const R = rng(99);
  const g = new THREE.Group();
  const winCanvas = document.createElement('canvas'); winCanvas.width = 64; winCanvas.height = 64;
  const cx = winCanvas.getContext('2d'); cx.fillStyle = '#7a5a3a'; cx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { if (R() < 0.6) { cx.fillStyle = R() < 0.5 ? '#ffb455' : '#ff9a30'; cx.fillRect(x * 16 + 5, y * 16 + 4, 6, 9); } else { cx.fillStyle = '#2a1a10'; cx.fillRect(x * 16 + 5, y * 16 + 4, 6, 9); } }
  const winTex = new THREE.CanvasTexture(winCanvas); winTex.colorSpace = THREE.SRGBColorSpace; winTex.magFilter = THREE.NearestFilter;
  const houseMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.75, 0.58, 0.4), roughness: 0.8, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 2.2, map: winTex });
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.7, 0.3), metalness: 1, roughness: 0.25, emissive: new THREE.Color(0.35, 0.16, 0.04) });
  const cream = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.9, 0.78, 0.6), roughness: 0.5, emissive: new THREE.Color(0.12, 0.06, 0.02) });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3, 1) });
  const items = [];
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const n = 150; const hI = new THREE.InstancedMesh(box, houseMat, n); g.add(hI);
  const hs = [];
  for (let i = 0; i < n; i++) {
    let r, a; do { r = 0.62 + Math.sqrt(R()) * 1.45; a = R() * Math.PI * 2; } while (false);
    hs.push({ r, a, w: 0.09 + R() * 0.12, d: 0.09 + R() * 0.12, h: 0.1 + R() * 0.22 + (R() < 0.1 ? 0.18 : 0) });
  }
  const dm = new THREE.Mesh(domeGeometry(0.42, 0.78, 48), gold); g.add(dm);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.3, 32), cream); g.add(drum);
  const mins = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 10), cream); const c = new THREE.Mesh(domeGeometry(0.05, 0.12, 10), gold); const l = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 12), glow); l.rotation.x = Math.PI / 2; g.add(m, c, l); return { m, c, l }; });
  const lampsI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 6, 4), glow, 120); g.add(lampsI);
  const lampP = []; for (let i = 0; i < 120; i++) lampP.push({ r: 0.5 + R() * 1.6, a: R() * Math.PI * 2 });
  const mtx = new THREE.Matrix4(); const q = new THREE.Quaternion();
  // surface height function must match the tea surface: provided via update
  g.userData.update = (t, dome, rise, R0, level) => {
    const surf = (r) => level + dome * Math.max(0, 1 - Math.pow(r / R0, 4));
    const sink = (1 - rise);
    hs.forEach((b, i) => {
      const x = Math.cos(b.a) * b.r, z = Math.sin(b.a) * b.r; const y = surf(b.r) - sink * (b.h + 0.25) - 0.03;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.a);
      mtx.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(b.w, b.h, b.d)); hI.setMatrixAt(i, mtx);
    });
    hI.instanceMatrix.needsUpdate = true;
    const yc = surf(0) - sink * 1.4;
    drum.position.set(0, yc + 0.15, 0); dm.position.set(0, yc + 0.28, 0);
    mins.forEach((o, i) => { const x = (i ? 1 : -1) * 0.58, z = 0.3; const yb = surf(Math.hypot(x, z)) - sink * 1.8; o.m.position.set(x, yb + 0.75, z); o.c.position.set(x, yb + 1.5, z); o.l.position.set(x, yb + 1.3, z); });
    lampP.forEach((p, i) => { mtx.makeTranslation(Math.cos(p.a) * p.r, surf(p.r) - sink * 0.5 + 0.02, Math.sin(p.a) * p.r); lampsI.setMatrixAt(i, mtx); });
    lampsI.instanceMatrix.needsUpdate = true;
  };
  return g;
}
