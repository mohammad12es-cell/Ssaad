// ODDLY EXPLAINED — VIDEO 002 — "Why don't you act out your dreams?"  (REM atonia)
// 3D layer, deterministic in t.
//
//  0.0– 4.6  HOOK        a glass sleeper lies still; above, their dream-self sprints (hologram); push toward the head
//  4.6–10.5  BRAINSTEM   x-ray into the head: motor commands descend; a brainstem gate switches on, inhibition runs down the cord
// 10.5–16.2  ATONIA      overhead: limb nerves go from amber (movement signal) to cyan (inhibited); muscle tone drains
// 16.2–21.8  EXCEPTIONS  eyes keep darting under closed lids; the diaphragm keeps breathing (phrenic nerve stays active)
// 21.8–26.5  RBD         the gate glitches, signals leak through, the arm and leg act out the dream
// 26.5–30.0  RESOLVE     gate restored, body still, the dream runs on above; fade to end card
import * as THREE from 'three';
import { buildBody, hologramOf, sleepPose, runPose, REGION, depthOnly } from '/engine/lib/body.js';
import { buildBrain } from '/engine/lib/brain.js';
import { buildMotes } from '/engine/lib/neurons.js';
import { RNG, GLSL_NOISE, clamp, smooth, lerp, easeInOut } from '/engine/lib/noise.js';

const seg = (t, a, b) => clamp((t - a) / (b - a));
const win = (t, a, b, fi = 0.5, fo = 0.5) => smooth(a, a + fi, t) * (1 - smooth(b - fo, b, t));
const h1 = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };

// rest (standing) -> world (lying on the back, head toward -z, face up)
const ROOT = new THREE.Matrix4().makeTranslation(0, 0.13, 0.92).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
const W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(ROOT);

function additive(fs, uniforms = {}, vs) {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uAmp: { value: 1 }, ...uniforms },
    vertexShader: vs || `varying vec2 vUv; varying vec3 vN, vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: fs, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
}

export async function create(stage) {
  const { W: SW, H: SH, post } = stage;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, SW / SH, 0.01, 80);

  // ------------------------------------------------------------ environment
  const bd = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `${GLSL_NOISE} uniform float uTime; varying vec3 vD; void main(){ float h = vD.y * 0.5 + 0.5;
      vec3 c = mix(vec3(0.004, 0.006, 0.014), vec3(0.03, 0.06, 0.13), smoothstep(0.35, 1.0, h));
      float n = snoise(vD * 2.5 + uTime * 0.02) * 0.5 + 0.5; c *= 0.6 + 0.8 * n * n; gl_FragColor = vec4(c, 1.0); }` }));
  bd.frustumCulled = false; scene.add(bd);
  // sleeping platform: dark disc with faint concentric rings and a soft pool of light under the body
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 128), additive(/* glsl */`
    ${GLSL_NOISE} uniform float uTime, uAmp; varying vec2 vUv; varying vec3 vW;
    void main(){ vec2 p = vW.xz; float r = length(p * vec2(1.25, 0.62));
      float pool = exp(-r * r * 2.2) * 0.22;
      float rings = smoothstep(0.03, 0.0, abs(fract(r * 7.0 - uTime * 0.05) - 0.5) - 0.47) * exp(-r * 1.2) * 0.12;
      float grid = (smoothstep(0.012, 0.0, abs(fract(p.x * 6.0) - 0.5) - 0.488) + smoothstep(0.012, 0.0, abs(fract(p.y * 6.0) - 0.5) - 0.488)) * exp(-r * 1.6) * 0.05;
      vec3 c = vec3(0.12, 0.42, 0.9) * (pool + rings + grid);
      gl_FragColor = vec4(c * uAmp * smoothstep(1.0, 0.7, r / 2.4), 1.0); }`));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.0; scene.add(floor);
  const motes = buildMotes({ seed: 31, count: 1400, box: [2.5, 2.2, 2.5, -2.5] }); motes.points.position.y = 1.0; scene.add(motes.points);
  // overhead "moonlight" (also feeds the god-ray pass)
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), additive(`uniform float uAmp; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * (exp(-r*r*14.0) * 1.6 + exp(-r*r*3.0) * 0.12) * uAmp, 1.0); }`));
  moon.position.set(-0.6, 3.2, -1.4); scene.add(moon);

  // ------------------------------------------------------------ the sleeper
  const body = buildBody({ seed: 12 }); console.warn('body', JSON.stringify(body.stats));
  const figure = new THREE.Group(); figure.matrixAutoUpdate = false; figure.matrix.copy(ROOT); figure.add(body.group); figure.add(depthOnly(body.hull.geometry, body.bonesU)); scene.add(figure);
  const S = body.skeleton; const headBone = S.byName.head.i, spineBone = S.byName.spine.i;
  const attach = (obj, bone) => { obj.matrixAutoUpdate = false; obj.userData.bone = bone; obj.userData.local = obj.matrix.clone(); figure.add(obj); return obj; };
  const updAttach = (obj) => obj.matrix.multiplyMatrices(body.boneWorld[obj.userData.bone], obj.userData.local);

  // brain inside the head
  const brain = buildBrain({ detail: 64, nodes: 420, seed: 3 });
  const brainObj = new THREE.Group(); brainObj.add(brain.group);
  brainObj.matrix.compose(new THREE.Vector3(0, 1.738, 0.006), new THREE.Quaternion(), new THREE.Vector3(0.077, 0.077, 0.077));
  attach(brainObj, headBone);
  // eyes (under closed lids)
  const eyeMat = additive(/* glsl */`uniform float uAmp, uTime; varying vec3 vN, vW; varying vec2 vUv;
    void main(){ vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
      gl_FragColor = vec4((vec3(1.0, 0.68, 0.36) * (0.25 + fr) ) * uAmp, 1.0); }`);
  const irisMat = additive(`uniform float uAmp; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(vec3(1.0, 0.85, 0.6) * (smoothstep(1.0, 0.5, r) * 1.5 + smoothstep(0.35, 0.0, r) * 2.0) * uAmp, 1.0); }`);
  const eyes = [];
  for (const s of [1, -1]) {
    const pivot = new THREE.Group(); pivot.matrix.makeTranslation(0.034 * s, 1.713, 0.086);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 24, 16), eyeMat);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.0062, 24), irisMat); iris.position.z = 0.0124;
    const inner = new THREE.Group(); inner.add(ball); inner.add(iris); pivot.add(inner);
    attach(pivot, headBone); eyes.push(inner);
  }
  // diaphragm: dome sheet of radial muscle fibres under the ribs
  const diaGeo = new THREE.SphereGeometry(1, 64, 16, 0, Math.PI * 2, 0, 1.25);
  const diaMat = additive(/* glsl */`uniform float uAmp, uTime, uAct; varying vec2 vUv; varying vec3 vN, vW;
    void main(){ float fib = 0.5 + 0.5 * cos(vUv.x * 6.28318 * 48.0); fib = pow(fib, 3.0);
      vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(normalize(vN), V)), 1.5);
      vec3 c = vec3(1.0, 0.55, 0.25) * (0.12 + 0.6 * fib) * (0.25 + uAct) + vec3(0.3, 0.75, 1.0) * fr * 0.15;
      gl_FragColor = vec4(c * uAmp * (0.3 + 0.7 * smoothstep(0.0, 0.5, vUv.y)), 1.0); }`, { uAct: { value: 0 } });
  diaMat.side = THREE.DoubleSide;
  const dia = new THREE.Mesh(diaGeo, diaMat);
  const diaObj = new THREE.Group(); diaObj.add(dia); attach(diaObj, spineBone);
  // brainstem gate: a ring around the brainstem + inhibition rings travelling down the cord
  const ringMat = additive(/* glsl */`uniform float uAmp, uTime, uGlitch; varying vec2 vUv; varying vec3 vW;
    void main(){ float sh = 0.75 + 0.25 * sin(vUv.x * 80.0 + uTime * 14.0); vec3 c = mix(vec3(0.3, 0.85, 1.0), vec3(1.0, 0.35, 0.15), uGlitch) * sh * 2.6;
      gl_FragColor = vec4(c * uAmp, 1.0); }`, { uGlitch: { value: 0 } });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0028, 12, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.updateMatrix();
  const ringObj = new THREE.Group(); ringObj.add(ring); ringObj.matrix.makeTranslation(0, 1.595, -0.028); attach(ringObj, S.byName.neck.i);
  const waveRings = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0018, 8, 64), ringMat.clone()); m.rotation.x = Math.PI / 2; scene.add(m); waveRings.push(m); }
  const cordY = [[1.6, -0.028], [1.52, -0.045], [1.4, -0.065], [1.25, -0.07], [1.1, -0.06], [0.98, -0.05]];
  const cordAt = (u) => { const f = u * (cordY.length - 1), i = Math.min(cordY.length - 2, Math.floor(f)), k = f - i; return [lerp(cordY[i][0], cordY[i + 1][0], k), lerp(cordY[i][1], cordY[i + 1][1], k)]; };

  // ------------------------------------------------------------ the dream (hologram runner + motion streaks)
  const holo = hologramOf(body);
  const dream = new THREE.Group(); dream.add(holo.mesh); const holoDepth = depthOnly(body.hull.geometry, holo.bonesU); dream.add(holoDepth); scene.add(dream);
  dream.position.set(0, 0.44, -0.45); dream.scale.setScalar(0.36);
  const rng = new RNG(77); const NS = 260; const SP = new Float32Array(NS * 2 * 3), ST = new Float32Array(NS * 2), SS = new Float32Array(NS * 2);
  for (let i = 0; i < NS; i++) { const x = rng.range(-0.5, 0.5), y = rng.range(0.45, 1.6), z = rng.range(-1.6, 0.8), sd = rng.next();
    for (const k of [0, 1]) { SP.set([x, y, z], (i * 2 + k) * 3); ST[i * 2 + k] = k; SS[i * 2 + k] = sd; } }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(SP, 3)); sg.setAttribute('aT', new THREE.BufferAttribute(ST, 1)); sg.setAttribute('aSeed', new THREE.BufferAttribute(SS, 1));
  const streakMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uAmp: { value: 1 } },
    vertexShader: `attribute float aT, aSeed; uniform float uTime; varying float vA, vT; void main(){ vec3 p = position; float sp = 1.4 + 1.6 * aSeed;
      p.z = mod(p.z + 1.6 - uTime * sp, 2.4) - 1.6; p.z += aT * (0.08 + 0.12 * aSeed); vT = aT; vA = 0.4 + 0.6 * aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uAmp; varying float vA, vT; void main(){ gl_FragColor = vec4(vec3(0.5, 0.82, 1.0) * vA * vT * uAmp * 0.9, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const streaks = new THREE.LineSegments(sg, streakMat); streaks.frustumCulled = false; scene.add(streaks);
  // dream thread: particles rising from the sleeper's head to the dream
  const NT = 180; const TP = new Float32Array(NT * 3), TS = new Float32Array(NT);
  for (let i = 0; i < NT; i++) TS[i] = rng.next();
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(TP, 3)); tg.setAttribute('aSeed', new THREE.BufferAttribute(TS, 1));
  const head = W(0, 1.78, 0.0), dreamFeet = new THREE.Vector3(0, 0.62, -0.42);
  const threadMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uAmp: { value: 1 }, uA: { value: head }, uB: { value: new THREE.Vector3(0, 0.78, -0.45) } },
    vertexShader: `attribute float aSeed; uniform float uTime; uniform vec3 uA, uB; varying float vA;
      void main(){ float k = fract(aSeed + uTime * 0.22); vec3 m = mix(uA, uB, 0.5) + vec3(0.0, 0.05, 0.1);
        vec3 p = mix(mix(uA, m, k), mix(m, uB, k), k); float s = sin(aSeed * 91.0); p += vec3(sin(k * 9.0 + s * 6.0), cos(k * 7.0 + s * 4.0), sin(k * 5.0 + s)) * 0.025 * sin(k * 3.1416);
        vA = sin(k * 3.1416); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 12.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uAmp; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.55, 0.85, 1.0) * exp(-r*r*30.0) * vA * uAmp, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const thread = new THREE.Points(tg, threadMat); thread.frustumCulled = false; scene.add(thread);

  // ------------------------------------------------------------ camera choreography (move-and-hold keys)
  const K = [
    { t: 0.0,  p: [2.8, 0.62, -0.32], l: [0, 0.5, -0.45], u: [0, 1, 0], f: 34 },
    { t: 2.7,  p: [2.3, 0.56, -0.42], l: [0, 0.46, -0.5], u: [0, 1, 0], f: 34 },
    { t: 5.4,  p: [0.8, 0.32, -0.84], l: [0, 0.12, -0.74], u: [0, 1, 0], f: 34 },
    { t: 8.2,  p: [0.74, 0.42, -0.72], l: [0, 0.11, -0.62], u: [0, 1, 0], f: 34 },
    { t: 10.2, p: [0.62, 0.95, -0.5], l: [0, 0.09, -0.36], u: [0, 1, 0], f: 34 },
    { t: 11.8, p: [0.22, 3.25, 0.06], l: [0, 0.1, 0.02], u: [0, 0, -1], f: 34 },
    { t: 16.0, p: [0.12, 2.9, 0.0], l: [0, 0.1, 0.0], u: [0, 0, -1], f: 34 },
    { t: 17.1, p: [0.0, 0.62, -0.5], l: [0, 0.2, -0.78], u: [0, 0, -1], f: 30 },
    { t: 19.0, p: [0.0, 0.56, -0.53], l: [0, 0.2, -0.78], u: [0, 0, -1], f: 30 },
    { t: 20.1, p: [0.26, 0.86, -0.12], l: [0, 0.14, -0.3], u: [0, 0, -1], f: 34 },
    { t: 21.7, p: [0.22, 0.8, -0.16], l: [0, 0.14, -0.3], u: [0, 0, -1], f: 34 },
    { t: 22.9, p: [0.42, 2.05, -0.02], l: [0, 0.14, -0.12], u: [0, 0, -1], f: 34 },
    { t: 26.4, p: [0.32, 1.95, -0.02], l: [0, 0.14, -0.12], u: [0, 0, -1], f: 34 },
    { t: 28.7, p: [2.6, 0.85, 0.1], l: [0, 0.66, -0.45], u: [0, 1, 0], f: 34 },
    { t: 30.5, p: [2.75, 0.9, 0.15], l: [0, 0.68, -0.45], u: [0, 1, 0], f: 34 },
  ];
  const V3 = (a) => new THREE.Vector3(...a);
  function camAt(t) {
    let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1]; const k = easeInOut(seg(t, a.t, b.t));
    return { p: V3(a.p).lerp(V3(b.p), k), l: V3(a.l).lerp(V3(b.l), k), u: V3(a.u).lerp(V3(b.u), k).normalize(), f: lerp(a.f, b.f, k) };
  }

  // ------------------------------------------------------------ timeline state
  function state(t) {
    const brainstemOn = smooth(6.4, 7.4, t);
    // gates: 1 = movement signals reach the region, 0 = inhibited
    let arms = 1 - smooth(11.0, 12.6, t), legs = 1 - smooth(12.0, 13.8, t), trunk = 1 - 0.75 * smooth(12.8, 14.4, t);
    // RBD: inhibition fails in bursts
    const rbd = win(t, 22.3, 26.2, 0.4, 0.6);
    const flick = (h1(Math.floor(t * 14)) > 0.35 ? 1 : 0.3);
    arms = Math.max(arms, rbd * flick); legs = Math.max(legs, rbd * 0.85 * (h1(Math.floor(t * 11) + 5) > 0.4 ? 1 : 0.3));
    return { brainstemOn, arms, legs, trunk, rbd };
  }
  function saccade(t) { // eye position: holds with quick jumps, as in REM
    const n = Math.floor(t * 2.6); const f = t * 2.6 - n; const a = h1(n) * 2 - 1, b = h1(n + 1) * 2 - 1;
    const k = smooth(0.0, 0.12, f); return lerp(a, b, k);
  }

  const tmp = new THREE.Vector3();
  function frame(t) {
    const P = post.params; const st = state(t);
    // ---- pose
    const rbdArm = st.rbd; const punch = Math.max(0, Math.sin((t - 22.4) * 5.2)) * rbdArm;
    const pose = sleepPose(t, {
      uarmR: [0.04 - 1.25 * rbdArm - 0.5 * punch, 0.2 * rbdArm, 0.42 - 0.2 * rbdArm], farmR: [-0.15 - 1.1 * rbdArm + 0.9 * punch, 0, 0.05],
      thighL: [-0.55 * rbdArm * (0.5 + 0.5 * Math.sin((t - 22.6) * 4.1)), 0, 0.03], shinL: [0.6 * rbdArm * (0.5 + 0.5 * Math.sin((t - 22.6) * 4.1 + 1.2)), 0, 0],
      handL: [0, 0, -0.1 + 0.15 * rbdArm * Math.sin(t * 9)],
    });
    body.setPose(pose);
    for (const o of [brainObj, eyes[0].parent, eyes[1].parent, diaObj, ringObj]) updAttach(o);
    // ---- breathing / diaphragm (keeps working throughout)
    const br = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 4.2 - Math.PI / 2);
    diaObj.userData.local.compose(new THREE.Vector3(0, 1.17 - 0.012 * br, 0.005), new THREE.Quaternion(), new THREE.Vector3(0.122, 0.05 - 0.018 * br, 0.085)); updAttach(diaObj);
    diaMat.uniforms.uAct.value = 0.35 + 0.65 * br; diaMat.uniforms.uTime.value = t;
    const dShow = 0.35 + 0.65 * win(t, 18.7, 22.2, 0.6, 0.6);
    diaMat.uniforms.uAmp.value = dShow * (1 - smooth(28.5, 29.4, t));
    // ---- eyes
    const sx = saccade(t) * 0.42, sy = (h1(Math.floor(t * 2.6) + 9) - 0.5) * 0.2;
    for (const e of eyes) e.rotation.set(sy, sx, 0);
    const eyeAmp = 0.5 + 0.9 * win(t, 16.3, 19.6, 0.5, 0.6);
    eyeMat.uniforms.uAmp.value = eyeAmp * 0.25; irisMat.uniforms.uAmp.value = eyeAmp * 0.45;
    // ---- nerves + tone
    const NU = body.nerveMat.uniforms; NU.uTime.value = t;
    NU.uGate.value = [1, st.arms, st.legs, st.trunk, 1, 1, 1];
    NU.uInhib.value = st.brainstemOn; NU.uCmd.value = 1.0; NU.uRate.value = 1 + 0.6 * st.rbd;
    NU.uAmp.value = 1.0 + 0.6 * win(t, 4.8, 10.6, 0.8, 0.8);
    const tone0 = 0.42;
    body.glass.uniforms.uTone.value = [tone0, tone0 * st.arms, tone0 * st.legs, tone0 * st.trunk, tone0, tone0, tone0];
    body.glass.uniforms.uTime.value = t; body.glass.uniforms.uScan.value = 0.6 * win(t, 10.8, 15.8, 0.6, 0.8);
    body.glass.uniforms.uAmp.value = 1.0 - 0.72 * win(t, 4.2, 10.5, 1.2, 0.9) - 0.4 * win(t, 16.6, 21.6, 0.6, 0.6);
    // brain
    const BU = brain.material.uniforms, BL = brain.net.lineMat.uniforms, BP = brain.net.ptMat.uniforms;
    BU.uTime.value = t; BL.uTime.value = t; BP.uTime.value = t; BL.uReveal.value = 3; BP.uReveal.value = 3;
    BL.uWave.value = ((t * 0.9) % 2.2) - 0.3; BP.uWave.value = BL.uWave.value; BP.uSize.value = 3.0;
    BU.uGlow.value = 0.6; BU.uInner.value = 0.9; BU.uWaveAmp.value = 0.8; BU.uWaveDir.value.set(0, -1, 0); BU.uWaveFront.value = 1.0 - ((t * 0.7) % 2.2);
    brain.group.visible = true; brain.material.uniforms.uOpacity && (brain.material.uniforms.uGlow.value *= 1 - 0.6 * win(t, 16.4, 19.6, 0.5, 0.5));
    // brainstem gate
    ringMat.uniforms.uTime.value = t; ringMat.uniforms.uGlitch.value = st.rbd * (h1(Math.floor(t * 18)) > 0.5 ? 1 : 0.2);
    ringMat.uniforms.uAmp.value = st.brainstemOn * (1 - 0.7 * st.rbd * (h1(Math.floor(t * 18) + 3) > 0.5 ? 1 : 0)) * (1 + 0.8 * win(t, 6.4, 8.2, 0.2, 1.2));
    waveRings.forEach((m, i) => {
      const u = (((t * 0.55 + i / 4) % 1) + 1) % 1; const [y, z] = cordAt(u); // u wraps: t can be slightly negative (motion-blur sub-frames)
      m.position.copy(W(0, y, z)); m.rotation.set(0, 0, 0); m.rotation.x = 0; // ring lies across the cord (cord runs along world z when lying)
      m.material.uniforms.uAmp.value = st.brainstemOn * Math.sin(u * Math.PI) * 0.7 * (1 - st.rbd) * (1 - smooth(16.0, 17.0, t) * 0.6);
      m.material.uniforms.uTime.value = t; m.scale.setScalar(1 + 0.3 * u);
    });
    // ---- dream
    const dreamAmp = win(t, -1, 5.4, 0.1, 1.0) + win(t, 26.6, 31, 1.0, 0.1) * 1.0;
    holo.setPose(runPose(t * 8.5)); holo.material.uniforms.uTime.value = t; holo.material.uniforms.uAmp.value = dreamAmp * 1.15;
    dream.position.y = 0.44 + 0.015 * Math.abs(Math.sin(t * 8.5));
    holo.mesh.visible = holoDepth.visible = dream.visible = dreamAmp > 0.002;
    streakMat.uniforms.uTime.value = t; streakMat.uniforms.uAmp.value = dreamAmp; streaks.visible = dreamAmp > 0.002;
    threadMat.uniforms.uTime.value = t; threadMat.uniforms.uAmp.value = dreamAmp; thread.visible = dreamAmp > 0.002;
    // ---- environment
    bd.material.uniforms.uTime.value = t; floor.material.uniforms.uTime.value = t;
    floor.material.uniforms.uAmp.value = 0.6 - 0.4 * win(t, 4.6, 10.4, 0.8, 0.8);
    motes.material.uniforms.uTime.value = t; motes.material.uniforms.uH.value = SH; motes.material.uniforms.uAmp.value = 0.6;
    moon.lookAt(cam.position);
    // ---- camera
    const c = camAt(t);
    const qo = new URLSearchParams(location.search).get('cam'); if (qo) { const v = qo.split(',').map(Number); c.p.set(v[0], v[1], v[2]); c.l.set(v[3], v[4], v[5]); c.u.set(0, 1, 0); }
    const shake = st.rbd * 0.006; c.p.x += Math.sin(t * 37) * shake; c.p.z += Math.cos(t * 29) * shake;
    cam.position.copy(c.p); cam.up.copy(c.u); cam.lookAt(c.l); cam.fov = c.f; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    const focus = c.p.distanceTo(c.l);
    motes.material.uniforms.uFocus.value = focus; motes.material.uniforms.uRange.value = focus * 0.5;
    // god-ray source: project the moon into screen space
    tmp.copy(moon.position).project(cam);
    Object.assign(P, {
      focus, focusRange: Math.max(0.12, focus * 0.35), maxCoc: 0.6, exposure: 0.95, bloom: 0.75 + 0.25 * st.rbd, bloomRadius: 0.6, bloomThreshold: 0.62,
      rays: 0.4 * (1 - 0.7 * win(t, 4.8, 10.4, 0.8, 0.8)) * (1 - 0.6 * win(t, 10.8, 26.6, 0.8, 0.8)), raysPos: [tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5], raysThreshold: 0.5,
      streak: 0.35, streakThreshold: 0.85, streakTint: [0.5, 0.78, 1.0], split: 0.35,
      zoom: 0.35 * win(t, 3.6, 5.6, 1.0, 0.8) + 0.25 * win(t, 10.3, 11.9, 0.5, 0.9),
      flash: 0, ca: 0.0018 + 0.004 * st.rbd, vignette: 0.6, grain: 0.02, lift: [0.002, 0.005, 0.014], saturation: 1.05, tint: [1, 1, 1],
      fade: 0.55 * (1 - smooth(0, 0.18, t)) + smooth(28.4, 29.3, t) * 0.85,
    });
    return { scene, camera: cam };
  }
  return { frame };
}
