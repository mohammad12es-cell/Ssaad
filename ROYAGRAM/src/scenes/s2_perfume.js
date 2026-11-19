// SCENE 02 — PERFUME: glass flacon above a black ocean, golden liquid waves forming around it
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { track, easeInOut, easeOut, easeIn, sstep, range, dust, backdrop, setCam, orbitPos, canvasTex, lightShaft, GLSL_NOISE, lerp } from '../lib.js';

// tube with variable radius along a curve (for liquid ribbons)
export function variableTube(curve, segs, radial, rFn) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, P = curve.getPointAt(u), N = frames.normals[i], B = frames.binormals[i], r = rFn(u);
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2, c = Math.cos(v), s = Math.sin(v);
      const n = new THREE.Vector3(c * N.x + s * B.x, c * N.y + s * B.y, c * N.z + s * B.z);
      pos.push(P.x + r * n.x, P.y + r * n.y, P.z + r * n.z); nor.push(n.x, n.y, n.z); uv.push(u, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// liquid-metal material: noise displacement + reveal along the curve
export function liquidMetal(params, U) {
  const m = new THREE.MeshPhysicalMaterial(params);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `uniform float uTime, uAmp; varying float vU;\n${GLSL_NOISE}\n` + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = position; vU = uv.x;
      float n = snoise(vec3(position*1.7 + vec3(0.0, -uTime*0.9, uTime*0.4)));
      transformed += normal * n * uAmp;`);
    sh.fragmentShader = `uniform float uReveal, uTail; varying float vU;\n` + sh.fragmentShader.replace('void main() {', `void main() { if (vU > uReveal || vU < uTail) discard;`);
  };
  return m;
}

export function build(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envWarm;
  scene.fog = new THREE.FogExp2(0x040302, 0.045);
  const bd = backdrop([0.0, 0.0, 0.0], [0.03, 0.017, 0.006], [0.0, 0.0, 0.0], [0, 0.0], [0.09, 0.05, 0.015]);
  scene.add(bd);
  const camera = new THREE.PerspectiveCamera(30, ctx.W / ctx.H, 0.02, 200);
  const T = { uTime: { value: 0 } };

  // --- ocean
  const OU = { uTime: { value: 0 }, uGoldR: { value: 0 }, uGold: { value: new THREE.Color(0xa8762a) } };
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(90, 90, 260, 260).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: 0.1, metalness: 0.0, clearcoat: 0.6, envMapIntensity: 1.3 }));
  ocean.material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, OU);
    const H = `
      float waveH(vec2 p, float t){
        float h = 0.0;
        h += 0.085*sin(dot(p, vec2(0.9, 0.4))*0.9 + t*0.9);
        h += 0.06*sin(dot(p, vec2(-0.5, 0.8))*1.4 + t*1.2);
        h += 0.03*sin(dot(p, vec2(0.2, -1.0))*2.6 + t*1.7);
        h += 0.018*snoise(vec3(p*0.9, t*0.35));
        float r = length(p);
        float g = smoothstep(uGoldR, uGoldR - 1.2, r);
        h += g * 0.07 * sin(r*5.0 - t*3.2) * smoothstep(0.0, 0.8, r);
        return h; }`;
    sh.vertexShader = `uniform float uTime, uGoldR; varying vec3 vWP;\n${GLSL_NOISE}\n${H}\n` + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `
        float e = 0.08; vec2 p0 = position.xz;
        float h0 = waveH(p0, uTime), hx = waveH(p0 + vec2(e,0.0), uTime), hz = waveH(p0 + vec2(0.0,e), uTime);
        vec3 objectNormal = normalize(vec3(-(hx-h0)/e, 1.0, -(hz-h0)/e));`)
      .replace('#include <begin_vertex>', `vec3 transformed = position; transformed.y += h0;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n vWP = (modelMatrix*vec4(transformed,1.0)).xyz;`);
    sh.fragmentShader = `uniform float uGoldR, uTime; uniform vec3 uGold; varying vec3 vWP;\n` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float rr = length(vWP.xz); float gm = smoothstep(uGoldR, uGoldR - 1.2, rr);
        diffuseColor.rgb = mix(diffuseColor.rgb, uGold, gm);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 1.0, gm);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.3, gm);`);
  };
  scene.add(ocean);

  // --- flacon
  const bottle = new THREE.Group(); scene.add(bottle);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.015, transmission: 1, thickness: 0.55, ior: 1.52, dispersion: 0.35, specularIntensity: 1, envMapIntensity: 1.6, attenuationColor: new THREE.Color(0xfff2dc), attenuationDistance: 2.5, clearcoat: 1, clearcoatRoughness: 0.0 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.12, 1.5, 0.62, 8, 0.14), glass); bottle.add(body);
  const juice = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.0, 0.42, 6, 0.1), new THREE.MeshPhysicalMaterial({ color: 0xa85a0a, emissive: 0x3a1802, emissiveIntensity: 0.55, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, sheen: 0.6, sheenColor: new THREE.Color(0xffc060), envMapIntensity: 1.3 }));
  juice.position.y = -0.2; bottle.add(juice);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.08, 0.5, 2, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.05, thickness: 0.2, envMapIntensity: 1.5 }));
  base.position.y = -0.68; bottle.add(base);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe9bf6a, metalness: 1, roughness: 0.16, clearcoat: 0.6, envMapIntensity: 1.5 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05, envMapIntensity: 1.8 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.16, 48), chrome); neck.position.y = 0.83; bottle.add(neck);
  const cap = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.58, 0.66, 6, 0.07), gold); cap.position.y = 1.2; bottle.add(cap);
  const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.035, 64), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, metalness: 1, roughness: 0.2 })); capBand.position.y = 0.95; bottle.add(capBand);
  // gold-foil label printed on the glass
  const labelTex = canvasTex(1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '700 118px Syncopate'; g.fillText('ORVANE', w / 2, 470);
    g.fillRect(w / 2 - 150, 520, 300, 3);
    g.font = '300 64px Inter'; g.fillText('Nº 7', w / 2, 625);
    g.font = '500 34px Inter'; g.letterSpacing = '12px'; g.fillText('EAU DE PARFUM', w / 2, 720);
    g.font = '400 26px Inter'; g.fillText('PARIS  ·  100 ML', w / 2, 775);
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshPhysicalMaterial({ color: 0xf1cf86, alphaMap: labelTex, transparent: true, metalness: 1, roughness: 0.22, envMapIntensity: 1.8, depthWrite: false }));
  label.position.set(0, 0.0, 0.312); bottle.add(label);
  bottle.position.set(0, 1.55, 0);

  // contact glow on the water
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.3, 0.08), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.position.y = 0.12; scene.add(pool);

  // --- golden liquid ribbons
  const RU = { uTime: T.uTime, uAmp: { value: 0.035 }, uReveal: { value: 0 }, uTail: { value: -1 } };
  const ribbons = new THREE.Group(); scene.add(ribbons);
  const rmat = liquidMetal({ color: 0xf5c060, metalness: 1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.2, emissive: 0x7a4608, emissiveIntensity: 0.35 }, RU);
  rmat.envMap = ctx.envProduct;
  const mkHelix = (r0, y0, y1, turns, ph, wob) => new THREE.CatmullRomCurve3(Array.from({ length: 90 }, (_, i) => {
    const u = i / 89, a = ph + u * turns * Math.PI * 2, r = r0 + wob * Math.sin(u * 9 + ph);
    return new THREE.Vector3(Math.cos(a) * r, lerp(y0, y1, u) + 0.12 * Math.sin(u * 13 + ph), Math.sin(a) * r);
  }));
  const R1 = new THREE.Mesh(variableTube(mkHelix(1.05, 0.2, 2.9, 1.6, 0, 0.15), 500, 14, (u) => 0.075 * Math.pow(Math.sin(Math.PI * u), 0.6) + 0.006), rmat);
  const R2 = new THREE.Mesh(variableTube(mkHelix(1.35, 0.15, 2.2, 1.2, 2.4, 0.2), 400, 12, (u) => 0.045 * Math.pow(Math.sin(Math.PI * u), 0.7) + 0.004), rmat);
  const R3 = new THREE.Mesh(variableTube(mkHelix(0.85, 0.4, 3.2, 1.0, 4.1, 0.1), 300, 10, (u) => 0.03 * Math.pow(Math.sin(Math.PI * u), 0.7) + 0.003), rmat);
  ribbons.add(R1, R2, R3);
  // splash droplets orbiting with the ribbons
  const dropN = 60, dropG = new THREE.SphereGeometry(1, 16, 10);
  const drops = new THREE.InstancedMesh(dropG, new THREE.MeshPhysicalMaterial({ color: 0xf2b54c, metalness: 1, roughness: 0.08, envMapIntensity: 1.6 }), dropN);
  const dropData = Array.from({ length: dropN }, (_, i) => ({ a: (i * 2.399) % (Math.PI * 2), r: 0.9 + ((i * 0.618) % 1) * 0.9, y: 0.3 + ((i * 0.381) % 1) * 2.6, s: 0.008 + ((i * 0.7311) % 1) * 0.018, w: 0.2 + ((i * 0.1234) % 1) * 0.5 }));
  scene.add(drops);

  // --- atmosphere
  const shaft = lightShaft(0.15, 2.2, 9, [1.0, 0.75, 0.4], 0.16); shaft.position.set(0, 9.5, 0); scene.add(shaft);
  const shaft2 = lightShaft(0.1, 1.2, 8, [1.0, 0.85, 0.6], 0.08); shaft2.position.set(-1.2, 9, -1.5); shaft2.rotation.z = -0.12; scene.add(shaft2);
  const goldDust = dust(1400, [14, 6, 14], { seed: 21, size: 5, color: [1.0, 0.72, 0.36], opacity: 0.6, y: 2, drift: [0.03, 0.04, 0] }); scene.add(goldDust);
  const rim = new THREE.DirectionalLight(0xffd08a, 3.5); rim.position.set(0, 4, -6); scene.add(rim);
  const key = new THREE.SpotLight(0xfff0dd, 60, 20, 0.5, 0.6, 1.5); key.position.set(-2, 7, 3); key.target = bottle; scene.add(key);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  function update(lt, opt = {}) {
    T.uTime.value = lt; OU.uTime.value = lt; goldDust.material.uniforms.uTime.value = lt; shaft.material.uniforms.uTime.value = lt;
    OU.uGoldR.value = track(lt, [[0.6, 0.0], [3.5, 2.4, easeOut]]);
    pool.material.opacity = sstep(0.6, 2.5, lt) * 0.28;
    RU.uReveal.value = track(lt, [[0.5, 0.0], [3.2, 1.0, easeOut]]);
    RU.uTail.value = -1;
    ribbons.rotation.y = -lt * 0.35;
    bottle.position.y = 1.55 + Math.sin(lt * 1.1) * 0.04;
    bottle.rotation.y = 0.25 * Math.sin(lt * 0.25) + 0.15;
    for (let i = 0; i < dropN; i++) {
      const d = dropData[i], a = d.a - lt * d.w, vis = sstep(0.8 + d.y * 0.4, 1.4 + d.y * 0.4, lt);
      pv.set(Math.cos(a) * d.r, d.y + 0.1 * Math.sin(lt * 1.3 + i), Math.sin(a) * d.r);
      sv.setScalar(d.s * vis + 1e-4); m4.compose(pv, q, sv); drops.setMatrixAt(i, m4);
    }
    drops.instanceMatrix.needsUpdate = true;

    const C = [0, 1.5, 0];
    if (opt.variant === 1) { const a = 0.35 + lt * 0.18; setCam(camera, orbitPos([0, 2.1, 0], 3.4, a, 0.1), [0, 1.95, 0]); return; }
    if (opt.variant === 2) { setCam(camera, orbitPos(C, 5.2, 0.35 + lt * 0.08, 0.05), [0, 1.45, 0]); return; }
    if (opt.variant === 3) { setCam(camera, [lt * 0.4 - 1.0, 0.35, 8.5], [0, 1.4, 0], 0.02); return; }
    // hero move: dolly-in -> orbit -> push into the liquid
    const az = track(lt, [[0, 0.05], [3.4, 0.12], [6.5, 1.2, easeInOut], [7.5, 1.32]]);
    const rad = track(lt, [[0, 14.0], [3.4, 6.4, easeOut], [6.5, 5.4], [7.5, 0.15, easeIn]]);
    const el = track(lt, [[0, 0.02], [3.4, 0.08], [6.5, 0.16], [7.5, 0.0]]);
    const tgt = track(lt, [[0, [0, 1.35, 0]], [6.5, [0, 1.5, 0]], [7.5, [0, 1.35, 0]]]);
    setCam(camera, orbitPos(tgt, rad, az, el), tgt, 0.01 * Math.sin(lt * 0.5));
  }
  return { scene, camera, update };
}
