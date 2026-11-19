// SCENE 01 — THE HOOK: black chrome sphere fractures into reflective glass shards
import * as THREE from 'three';
import { rng, track, easeInOut, easeIn, easeOut, sstep, range, dust, backdrop, setCam, GLSL_NOISE } from '../lib.js';

export const BURST = 1.55; // local time of fracture

export function buildShardGeometry(radius, detail, seed = 5) {
  const ico = new THREE.IcosahedronGeometry(radius, detail);
  const P = ico.attributes.position.array;
  const r = rng(seed);
  const pos = [], nor = [], cen = [], rnd = [], bar = [];
  const groups = [];
  const v = (i) => new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
  const push = (a, b, c, n, C, R, bA, bB, bC) => {
    for (const [p, bb] of [[a, bA], [b, bB], [c, bC]]) {
      pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); cen.push(C.x, C.y, C.z); rnd.push(...R); bar.push(...bb);
    }
  };
  const faces = P.length / 9;
  // outer faces first (group 0) then inner+side faces (group 1)
  const shards = [];
  for (let f = 0; f < faces; f++) {
    const a = v(f * 3), b = v(f * 3 + 1), c = v(f * 3 + 2);
    // jitter vertices slightly for irregular shards
    const C = a.clone().add(b).add(c).divideScalar(3);
    const R = [r(), r(), r(), r()];
    const depth = 0.12 + 0.22 * r();
    const ia = a.clone().multiplyScalar(1 - depth), ib = b.clone().multiplyScalar(1 - depth), ic = c.clone().multiplyScalar(1 - depth);
    shards.push({ a, b, c, ia, ib, ic, C, R });
  }
  const B0 = [1, 0, 0], B1 = [0, 1, 0], B2 = [0, 0, 1];
  for (const s of shards) {
    const n = new THREE.Vector3().subVectors(s.b, s.a).cross(new THREE.Vector3().subVectors(s.c, s.a)).normalize();
    push(s.a, s.b, s.c, n, s.C, s.R, B0, B1, B2);
  }
  const outerCount = pos.length / 3;
  for (const s of shards) {
    const n = new THREE.Vector3().subVectors(s.ib, s.ia).cross(new THREE.Vector3().subVectors(s.ic, s.ia)).normalize().negate();
    push(s.ia, s.ic, s.ib, n, s.C, s.R, B0, B2, B1);
    const side = (p, q, ip, iq) => {
      const sn = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3().subVectors(ip, p)).normalize().negate();
      push(p, ip, q, sn, s.C, s.R, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]);
      push(q, ip, iq, sn, s.C, s.R, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, 0.5]);
    };
    side(s.a, s.b, s.ia, s.ib); side(s.b, s.c, s.ib, s.ic); side(s.c, s.a, s.ic, s.ia);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aCen', new THREE.Float32BufferAttribute(cen, 3));
  g.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 4));
  g.setAttribute('aBar', new THREE.Float32BufferAttribute(bar, 3));
  g.addGroup(0, outerCount, 0);
  g.addGroup(outerCount, pos.length / 3 - outerCount, 1);
  return g;
}

// patch a physical material with the shard explosion vertex logic
export function shardMaterial(base, U) {
  base.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `attribute vec3 aCen; attribute vec4 aRnd; attribute vec3 aBar; varying vec3 vBar; varying float vHeat;
      uniform float uBurst, uCrack, uSpin, uFwd, uFront;
      mat3 rotAxis(vec3 ax, float a){ ax = normalize(ax); float s = sin(a), c = cos(a), oc = 1.0-c;
        return mat3(oc*ax.x*ax.x+c, oc*ax.x*ax.y+ax.z*s, oc*ax.z*ax.x-ax.y*s, oc*ax.x*ax.y-ax.z*s, oc*ax.y*ax.y+c, oc*ax.y*ax.z+ax.x*s, oc*ax.z*ax.x+ax.y*s, oc*ax.y*ax.z-ax.x*s, oc*ax.z*ax.z+c); }
      ` + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec3 ax = aRnd.xyz - 0.5 + vec3(0.001);
        float ang = uBurst * uSpin * (1.0 + 3.0*aRnd.w);
        mat3 R = rotAxis(ax, ang);
        objectNormal = R * objectNormal;`)
      .replace('#include <begin_vertex>', `
        vec3 dir = normalize(aCen);
        float sp = 0.55 + 1.6*aRnd.y*aRnd.y;
        vec3 off = dir * uBurst * sp + vec3(0.0, 0.0, uFwd * uBurst * (0.2 + aRnd.x));
        vec3 transformed = R * (position - aCen) + aCen + off;
        vBar = aBar;
        float dImp = distance(normalize(aCen), normalize(vec3(0.35, 0.45, 0.82)));
        float front = smoothstep(uFront, uFront - 0.35, dImp);
        vHeat = uCrack * front * step(0.6, aRnd.w);`);
    sh.fragmentShader = `varying vec3 vBar; varying float vHeat; uniform vec3 uCrackCol;\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float edge = 1.0 - smoothstep(0.0, 0.014, min(min(vBar.x, vBar.y), vBar.z));
        totalEmissiveRadiance += uCrackCol * edge * vHeat;`);
  };
  return base;
}

export function build(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.envChrome;
  scene.add(backdrop([0.0, 0.0, 0.0], [0.004, 0.004, 0.005], [0.0, 0.0, 0.0], [0, 0.0], [0.012, 0.009, 0.006]));
  const camera = new THREE.PerspectiveCamera(32, ctx.W / ctx.H, 0.05, 200);

  const U = { uBurst: { value: 0 }, uCrack: { value: 0 }, uSpin: { value: 2.0 }, uFwd: { value: 1.2 }, uFront: { value: 0 }, uCrackCol: { value: new THREE.Color(7.0, 3.6, 1.0) } };
  const geo = buildShardGeometry(1.5, 7, 5);
  const outer = shardMaterial(new THREE.MeshPhysicalMaterial({ color: 0x08080a, metalness: 1.0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }), U);
  const inner = shardMaterial(new THREE.MeshPhysicalMaterial({ color: 0x15161a, metalness: 0.2, roughness: 0.02, iridescence: 0.8, iridescenceIOR: 1.6, clearcoat: 1, envMapIntensity: 2.2, emissive: 0x000000 }), U);
  const sphere = new THREE.Mesh(geo, [outer, inner]);
  sphere.frustumCulled = false;
  scene.add(sphere);

  // inner core light that flares at fracture
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(12, 7, 2.5) }));
  scene.add(core);
  const coreLight = new THREE.PointLight(0xffc27a, 0, 30, 2);
  scene.add(coreLight);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(-3, 4, -2); scene.add(rim);

  // fine glass dust
  const glass = dust(2600, [10, 14, 26], { seed: 4, size: 5, color: [0.85, 0.9, 1.0], opacity: 0.0, drift: [0, 0.02, 0.4] });
  scene.add(glass);
  const goldDust = dust(900, [12, 16, 20], { seed: 9, size: 4, color: [1.0, 0.72, 0.35], opacity: 0.35 });
  scene.add(goldDust);

  function update(lt, opt = {}) {
    const s = Math.max(0, lt - BURST);
    // explosion distance: fast initial burst, then slow drift (slow-motion feel)
    U.uBurst.value = s > 0 ? 2.4 * (1 - Math.exp(-s * 2.6)) + 0.55 * s : 0;
    U.uCrack.value = track(lt, [[0.5, 0], [0.7, 0.8], [BURST - 0.05, 1.0, easeIn], [BURST + 0.5, 0.18], [4.5, 0.04]]);
    U.uFront.value = track(lt, [[0.5, 0.0], [BURST, 2.3, easeIn]]);
    const flare = lt < BURST ? 0 : Math.exp(-(lt - BURST) * 3.2);
    const pre = sstep(BURST - 0.5, BURST, lt) * (lt < BURST ? 1 : 0);
    core.scale.setScalar(lt < BURST ? 0.001 + pre * 0.9 : 0.9 + (1 - flare) * -0.8 + flare * 0.6);
    core.material.color.setRGB(12, 7, 2.5).multiplyScalar(lt < BURST ? pre * 0.3 : flare * 0.9);
    core.visible = lt > BURST - 0.5 && lt < BURST + 0.45;
    coreLight.intensity = (lt < BURST ? pre * 3 : flare * 30 + 1.5);
    sphere.rotation.y = lt * 0.25; sphere.rotation.x = 0.15 + lt * 0.05;
    sphere.position.y = Math.sin(lt * 1.3) * 0.03;
    glass.material.uniforms.uTime.value = lt; glass.material.uniforms.uOpacity.value = sstep(BURST, BURST + 0.3, lt) * 0.9;
    goldDust.material.uniforms.uTime.value = lt;
    // camera: slow approach, then flight through the shard field
    const z = track(lt, [[0, 12.5], [BURST, 9.6, easeOut], [2.6, 6.8, easeInOut], [4.6, -2.0, easeIn]]);
    const x = track(lt, [[0, 0.25], [BURST, 0.0], [4.6, -0.45]]);
    const y = track(lt, [[0, 0.35], [BURST, 0.1], [4.6, -0.2]]);
    const roll = track(lt, [[0, 0.0], [BURST, 0.02], [4.6, -0.22, easeIn]]);
    const shake = lt > BURST ? Math.exp(-(lt - BURST) * 5) * 0.035 : 0;
    setCam(camera, [x + shake * Math.sin(lt * 19), y + shake * Math.cos(lt * 23), z], [0, 0, z - 6], roll);
    if (opt.variant === 1) { // montage: close orbit through shards
      const a = lt * 0.6;
      setCam(camera, [Math.sin(a) * 2.4, 0.3, Math.cos(a) * 2.4], [0, 0, 0], 0.1);
    }
  }
  return { scene, camera, update };
}
