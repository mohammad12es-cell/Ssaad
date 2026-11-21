// v2 "STRINGS": the neural network made visible. Every connected mind sends a thread of light
// from its implant up to E.V.E.'s eye on the spire. Screen-space-width lines with data packets.
import * as THREE from "three";
import { rng } from "./util.js";
import { FOG, GLSL_FOG } from "./world.js";

export const SPIRE_EYE = new THREE.Vector3(0, 640, -523);

export function makeThreads(scene, nDynamic, W, H) {
  const R = rng(9001);
  const statics = [];
  // distant street-level minds along the avenue and across the city (no bodies needed: fog hides them)
  const AVE = 240;
  for (let i = 0; i < AVE; i++) statics.push([(R() - 0.5) * 17, 1.7, -40 - R() * 240]);
  for (let i = 0; i < 2600; i++) {
    const a = R() * Math.PI * 2, r = 60 + Math.pow(R(), 0.7) * 650;
    statics.push([Math.cos(a) * r, 2 + Math.pow(R(), 3) * 220, -520 + Math.sin(a) * r * 1.1]);
  }
  const N = nDynamic + statics.length;
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, 1, 0, 1, -1, 0], 3)); // x: s along, y: side
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const aA = new Float32Array(N * 3), aB = new Float32Array(N * 3), aS = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const p = i < nDynamic ? [0, -100, 0] : statics[i - nDynamic];
    aA.set(p, i * 3);
    const ang = R() * Math.PI * 2, rr = 6 + R() * 30;
    if (i < nDynamic + AVE) aB.set([p[0] + (R() - 0.5) * 30, 330, p[2] - 70 + (R() - 0.5) * 30], i * 3);
    else aB.set([SPIRE_EYE.x + Math.cos(ang) * rr, SPIRE_EYE.y + Math.sin(ang) * rr * 0.8, SPIRE_EYE.z], i * 3);
    aS.set([R(), i < nDynamic ? 1 : i < nDynamic + AVE ? 0.22 + R() * 0.2 : 0.55 + R() * 0.45], i * 2);
  }
  const attrA = new THREE.InstancedBufferAttribute(aA, 3); attrA.setUsage(THREE.DynamicDrawUsage);
  const attrB = new THREE.InstancedBufferAttribute(aB, 3); attrB.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("aA", attrA); geo.setAttribute("aB", attrB); geo.setAttribute("aS", new THREE.InstancedBufferAttribute(aS, 2));
  geo.instanceCount = N;
  const U = {
    ...FOG, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) }, uCam: { value: new THREE.Vector3() },
    uRed: { value: 0 }, uRedWave: { value: -1 }, uHero: { value: 0 }, uGrowHero: { value: 1e5 }, uOthers: { value: 1 }, uGain: { value: 1 }, uFlicker: { value: 0 }, uMinPx: { value: 1.8 }, uPulseRate: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aA; attribute vec3 aB; attribute vec2 aS;
      uniform vec2 uRes; uniform float uMinPx; uniform int uHero;
      varying float vS; varying float vLen; varying vec3 vW; varying vec2 vSeed; varying float vSide; varying float vHero;
      void main(){
        float s = position.x;
        vec3 VA = (viewMatrix * vec4(aA, 1.0)).xyz, VB = (viewMatrix * vec4(aB, 1.0)).xyz;
        float zc = -0.05, tA = 0.0, tB = 1.0;
        if (VA.z > zc && VB.z > zc) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        if (VA.z > zc) tA = (zc - VA.z) / (VB.z - VA.z);
        if (VB.z > zc) tB = (zc - VA.z) / (VB.z - VA.z);
        float so = mix(tA, tB, s);
        vec4 CA = projectionMatrix * vec4(mix(VA, VB, tA), 1.0), CB = projectionMatrix * vec4(mix(VA, VB, tB), 1.0);
        vec2 dir = normalize((CB.xy / CB.w - CA.xy / CA.w) * uRes + 1e-5);
        vec2 n = vec2(-dir.y, dir.x);
        vec4 C = projectionMatrix * vec4(mix(VA, VB, so), 1.0);
        float focal = projectionMatrix[1][1] * uRes.y * 0.5;
        float px = max(uMinPx, 0.009 * focal / max(C.w, 0.01));
        C.xy += n * position.y * px / uRes * C.w;
        vHero = gl_InstanceID == uHero ? 1.0 : 0.0;
        vW = mix(aA, aB, so); vS = so; vLen = length(aB - aA); vSeed = aS; vSide = position.y;
        gl_Position = C;
      }`,
    fragmentShader: /* glsl */ `${GLSL_FOG}
      uniform float uTime, uRed, uRedWave, uGain, uFlicker, uPulseRate, uGrowHero, uOthers; uniform vec3 uCam;
      varying float vS; varying float vLen; varying vec3 vW; varying vec2 vSeed; varying float vSide; varying float vHero;
      float h11(float p){ return fract(sin(p*127.1)*43758.5453); }
      void main(){
        float d = vS * vLen;                                   // meters from the implant
        float core = 1.0 - abs(vSide);
        float base = 0.42 + 0.15 * sin(d * 0.05 - uTime * 2.0 + vSeed.x * 40.0);
        float p = fract(d / 7.0 - uTime * 3.2 * uPulseRate + vSeed.x * 13.0);
        float packet = smoothstep(0.94, 1.0, p) * 2.6;
        float nearFade = smoothstep(0.0, 0.25, d);             // emerge out of the implant
        vec3 cy = vec3(0.25, 1.6, 2.2);
        vec3 rd = vec3(2.6, 0.12, 0.18);
        float wave = (1.0 - smoothstep(uRedWave - 40.0, uRedWave, vLen - d)) * step(0.0, uRedWave);
        vec3 col = mix(cy, rd, clamp(uRed + wave, 0.0, 1.0)) * (base + packet) * core * nearFade;
        col *= vSeed.y * uGain * (1.0 - uFlicker * step(0.5, h11(floor(uTime * 30.0) + vSeed.x * 91.0)));
        if (vHero > 0.5) { float q = (d - uGrowHero) / 0.6; float tip = exp(-q * q); col *= step(d, uGrowHero); col += mix(cy, rd, uRed) * tip * 4.0 * core * step(uGrowHero, 900.0); }
        else col *= uOthers;
        float fogK = 1.0 - exp(-length(vW - uCam) * 0.0022);
        col *= 1.0 - fogK * 0.85;
        col *= 1.0 - smoothstep(0.86, 1.0, vS);
        col = min(col, vec3(3.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 4; scene.add(mesh);
  const tmp = new THREE.Vector3();
  return {
    mesh, U,
    setDynamic(i, a, b) { attrA.setXYZ(i, a.x, a.y, a.z); attrB.setXYZ(i, b.x, b.y, b.z); },
    commit(t, cam) { attrA.needsUpdate = true; attrB.needsUpdate = true; U.uTime.value = t; U.uCam.value.copy(cam.position); },
  };
}
