// TABLE WORLD (units: cm). The estekan, saucer, walnut table, sunlight, steam, the drop, the hand.
import * as THREE from 'three';
import { GLSL_NOISE, rng, clamp, lerp, smooth, easeInOut, easeOut, easeIn, dotTexture } from './common.js';

export const SUN_DIR = new THREE.Vector3(-0.62, 0.55, -0.56).normalize(); // toward the sun: back-left, low
export const SAUCER_TOP = 0.42;          // glass sits here
export const TEA_LEVEL = 7.2;            // glass-local tea height
export const GLASS_H = 8.64;

// ---------- Master glass profile (the single reference used in every shot) ----------
const OUTER = [[2.02, 0.0], [2.16, 0.1], [2.21, 0.5], [2.14, 1.35], [1.97, 2.45], [1.82, 3.5], [1.78, 4.3], [1.85, 5.15], [2.03, 6.05], [2.3, 7.05], [2.53, 7.95], [2.66, 8.55]];
function sampleCurve(keys, n) {
  const c = new THREE.SplineCurve(keys.map(([r, y]) => new THREE.Vector2(r, y)));
  return c.getSpacedPoints(n);
}
const OUT_PTS = sampleCurve(OUTER, 80);
export function glassRadiusAt(y) { // outer radius at glass-local height y
  for (let i = 1; i < OUT_PTS.length; i++) if (OUT_PTS[i].y >= y) { const a = OUT_PTS[i - 1], b = OUT_PTS[i]; return lerp(a.x, b.x, (y - a.y) / (b.y - a.y || 1)); }
  return OUT_PTS[OUT_PTS.length - 1].x;
}
const WALL = 0.085, BASE_IN = 0.85;
export const innerRadiusAt = (y) => glassRadiusAt(y) - WALL;

function estekanGeometry() {
  const pts = [new THREE.Vector2(0.001, 0.07), new THREE.Vector2(1.7, 0.0)];
  OUT_PTS.forEach((p) => pts.push(p.clone()));
  pts.push(new THREE.Vector2(2.67, 8.6), new THREE.Vector2(2.64, 8.645), new THREE.Vector2(2.6, 8.645), new THREE.Vector2(2.575, 8.6));
  for (let i = OUT_PTS.length - 1; i >= 0; i--) {
    const p = OUT_PTS[i]; if (p.y < BASE_IN + 0.15) break;
    pts.push(new THREE.Vector2(p.x - WALL, p.y));
  }
  const rb = innerRadiusAt(BASE_IN + 0.15);
  pts.push(new THREE.Vector2(rb - 0.08, BASE_IN + 0.02), new THREE.Vector2(rb - 0.3, BASE_IN - 0.02), new THREE.Vector2(0.001, BASE_IN - 0.05));
  pts.reverse(); // so lathe faces point outward
  const g = new THREE.LatheGeometry(pts, 128);
  g.computeVertexNormals();
  return g;
}

function teaBodyGeometry(level) {
  const pts = [new THREE.Vector2(0.001, BASE_IN - 0.03)];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const y = lerp(BASE_IN + 0.03, level, i / steps);
    pts.push(new THREE.Vector2(innerRadiusAt(Math.max(y, BASE_IN + 0.15)) - 0.004, y));
  }
  pts.push(new THREE.Vector2(0.001, level));
  pts.reverse();
  const g = new THREE.LatheGeometry(pts, 96); g.computeVertexNormals(); return g;
}

// ---------- Environment (studio + window) ----------
function buildEnvScene() {
  const s = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { sun: { value: SUN_DIR } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 sun; varying vec3 vD; void main(){
      float g = 0.012 + 0.03*smoothstep(-0.3,0.6,vD.y);
      float w = pow(max(dot(vD,sun),0.),6.0);
      vec3 c = vec3(g*0.9,g*0.8,g*0.7) + vec3(1.0,0.62,0.3)*w*1.6;
      gl_FragColor=vec4(c,1.); }`,
  }));
  s.add(sky);
  const panel = (w, h, col, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(look); s.add(m);
  };
  panel(14, 30, new THREE.Color(2.6, 2.3, 2.0), new THREE.Vector3(-26, 8, 18), new THREE.Vector3(0, 4, 0));   // key softbox
  panel(3, 34, new THREE.Color(1.6, 1.5, 1.4), new THREE.Vector3(26, 6, 6), new THREE.Vector3(0, 4, 0));      // strip
  panel(20, 12, new THREE.Color(5.0, 3.3, 1.8), SUN_DIR.clone().multiplyScalar(40), new THREE.Vector3(0, 0, 0)); // sun window
  panel(30, 4, new THREE.Color(0.9, 0.75, 0.6), new THREE.Vector3(0, 32, 4), new THREE.Vector3(0, 0, 0));    // top kicker
  return s;
}

// ---------- Shader chunks ----------
const RIPPLE_GLSL = /* glsl */`
uniform float uTau;      // seconds since drop impact (negative = none)
uniform float uDome;     // climax swell height (cm)
uniform float uWaveT;    // climax time
uniform float uR;        // surface radius
float ripple(vec2 p){
  float r = length(p); float h = 0.0;
  if (uTau > 0.0) {
    float tau = uTau;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float c = 1.55 + fi*0.55;              // ring speeds (cm/s, slow-motion)
      float k = 9.0 + fi*5.0;
      float front = c*tau;
      float env = exp(-pow((r - front + 0.25)/(0.38+0.1*fi), 2.0));
      float envR = exp(-pow(((2.0*uR - r) - front + 0.25)/(0.45+0.1*fi), 2.0)) * 0.55; // reflection off the glass wall
      h += (0.075 - fi*0.018) * exp(-tau*(0.55+fi*0.25)) * (env*cos(k*(r-front)) + envR*cos(k*((2.0*uR-r)-front)));
    }
    h -= 0.32 * exp(-r*r/0.10) * exp(-tau*7.0) * cos(tau*10.0); // impact crater
  }
  if (uDome > 0.0) {
    float q = clamp(r/uR, 0.0, 1.0);
    h += uDome * (1.0 - q*q*q*q);
    h += 0.12*uDome/2.6 * sin(r*5.0 - uWaveT*7.0) * (1.0-q) * q * 3.0;
  }
  return h;
}`;

function teaUniforms(env) {
  return {
    uEnv: { value: env }, uSun: { value: SUN_DIR }, uGlow: { value: 0 }, uGlowPos: { value: new THREE.Vector3() },
    uInner: { value: 0 }, uTime: { value: 0 }, uTau: { value: -1 }, uDome: { value: 0 }, uWaveT: { value: 0 }, uR: { value: 2.2 },
    uLevel: { value: TEA_LEVEL }, uBase: { value: BASE_IN }, uThin: { value: 1 },
  };
}

const TEA_BODY_FRAG = /* glsl */`
uniform samplerCube uEnv; uniform vec3 uSun; uniform float uGlow, uInner, uTime, uLevel, uBase, uThin; uniform vec3 uGlowPos;
varying vec3 vWP; varying vec3 vWN; varying vec3 vLP;
${GLSL_NOISE}
void main(){
  vec3 V = normalize(cameraPosition - vWP); vec3 N = normalize(vWN);
  vec2 Nh = normalize(N.xz + 1e-5); vec2 Vh = normalize(V.xz + 1e-5);
  float r = length(vLP.xz) + 0.001;
  float chord = 2.0 * r * max(dot(Nh, Vh), 0.05) * uThin;      // light path through the tea column
  vec3 sigma = vec3(0.32, 0.95, 2.9);                             // strong blue absorption = amber
  vec3 T = exp(-sigma * chord);
  float fwd = max(-dot(uSun, -V), 0.0);                           // forward scattering towards camera
  float hgt = clamp((vLP.y - uBase) / (uLevel - uBase), 0.0, 1.0);
  vec3 sunCol = vec3(1.0, 0.8, 0.55);
  vec3 c = sunCol * T * (0.28 + 1.7 * pow(fwd, 2.0)) * (0.45 + 0.55*hgt);
  float NV = max(dot(N, V), 0.0);
  c += vec3(1.0, 0.48, 0.10) * pow(1.0 - NV, 1.6) * (0.25 + 0.6*fwd) * uThin;   // glowing edges
  float exitSide = pow(max(dot(normalize(vLP.xz + 1e-4), -normalize(uSun.xz)), 0.0), 3.0);
  c += vec3(1.0, 0.5, 0.12) * exitSide * 0.22 * smoothstep(0.3, 1.0, hgt);      // sun exits front-right
  c += vec3(0.20, 0.035, 0.004) * 0.18;                           // deep body tone
  float sh = fbm3(vec3(vLP.xz*0.7, vLP.y*0.5 - uTime*0.15));
  c *= 0.92 + 0.14*sh;
  // golden light beneath the surface
  float gd = length(vLP - uGlowPos);
  c += vec3(1.0, 0.62, 0.22) * uGlow * (exp(-gd*gd*1.2)*6.0 + exp(-gd*0.9)*1.2);
  c += vec3(1.0, 0.5, 0.14) * uInner * exp(-(uLevel - vLP.y)*0.55) * (2.0 + 4.0*T.g) * (0.7+0.3*sh);
  gl_FragColor = vec4(c, 1.0);
}`;

const TEA_VERT = /* glsl */`
varying vec3 vWP; varying vec3 vWN; varying vec3 vLP;
void main(){ vLP = position; vec4 w = modelMatrix*vec4(position,1.); vWP=w.xyz; vWN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`;

const SURFACE_VERT = /* glsl */`
${RIPPLE_GLSL}
varying vec3 vWP; varying vec2 vP;
void main(){ vec3 p = position; vP = p.xz; p.y += ripple(p.xz); vec4 w = modelMatrix*vec4(p,1.); vWP=w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

const SURFACE_FRAG = /* glsl */`
${RIPPLE_GLSL}
uniform samplerCube uEnv; uniform vec3 uSun; uniform float uGlow, uInner, uTime; uniform vec3 uGlowPos;
varying vec3 vWP; varying vec2 vP;
${GLSL_NOISE}
void main(){
  float e = 0.015;
  float hx = ripple(vP + vec2(e,0.)) - ripple(vP - vec2(e,0.));
  float hz = ripple(vP + vec2(0.,e)) - ripple(vP - vec2(0.,e));
  vec3 N = normalize(vec3(-hx/(2.*e), 1.0, -hz/(2.*e)));
  float micro = snoise(vec3(vP*6.0, uTime*0.4));
  N = normalize(N + vec3(micro*0.025, 0., snoise(vec3(vP*6.0+9.0, uTime*0.4))*0.025));
  vec3 V = normalize(cameraPosition - vWP);
  float NV = max(dot(N,V),0.0);
  float F = 0.02 + 0.98*pow(1.0-NV, 5.0);
  vec3 R = reflect(-V, N);
  vec3 env = textureCube(uEnv, R).rgb;
  float r = length(vP);
  // looking down into tea: deep amber, lit from the sun side + the golden light below
  vec2 refr = vP + N.xz*0.6;
  vec3 deep = vec3(0.16, 0.045, 0.006) * (0.7 + 0.6*smoothstep(uR, 0.0, length(refr - vec2(-0.5,-0.4))));
  vec3 sunCol = vec3(1.0,0.8,0.55);
  deep += sunCol * vec3(0.55,0.2,0.03) * pow(max(dot(normalize(vec3(-uSun.x,0.,-uSun.z)), normalize(vec3(refr.x,0.,refr.y)+1e-4)),0.),2.0) * smoothstep(0.0,uR,length(refr))*0.6;
  float gd = length(refr - uGlowPos.xz);
  deep += vec3(1.0,0.45,0.1) * uGlow * (exp(-gd*gd*2.5)*0.75 + exp(-gd*1.2)*0.25);
  deep += vec3(1.0,0.55,0.18) * uInner * 1.4;
  float spec = pow(max(dot(R, uSun),0.0), 900.0) * 60.0 + pow(max(dot(R, uSun),0.0), 60.0)*0.6;
  vec3 c = mix(deep, env*1.2, F) + sunCol*spec;
  c += vec3(1.0,0.7,0.4) * smoothstep(uR-0.12, uR, r) * 0.35; // meniscus glint
  gl_FragColor = vec4(c, 1.0);
}`;

// Caustic + glow injected into table and saucer materials.
const CAUSTIC_GLSL = /* glsl */`
uniform vec3 uSunD; uniform vec3 uGlassPos; uniform float uTeaTop, uTeaBot, uCaus, uTime, uGlowAmt; varying vec3 vWP2;
${GLSL_NOISE}
vec3 causticAt(vec3 P){
  vec3 L = uSunD; vec2 q = P.xz - uGlassPos.xz; vec2 l = L.xz;
  float s = -dot(q,l)/dot(l,l); if (s < 0.0) return vec3(0.);
  vec2 cxz = q + s*l; float d = length(cxz);
  float y = P.y + s*L.y - uGlassPos.y;
  float R = 1.95; float x = d / R;
  if (x > 1.08) return vec3(0.);
  float chord = 2.0*R*sqrt(max(1.0 - x*x, 0.02));
  vec3 T = exp(-vec3(0.32,0.95,2.9)*chord*0.55);
  float side = sign(dot(vec2(-l.y,l.x), cxz));
  float focus = exp(-pow((x*side - 0.12)/0.16, 2.0))*2.4 + 0.45;    // cylinder lens focuses to a bright core
  float ripple = 0.75 + 0.5*fbm3(vec3(P.xz*1.3, uTime*0.35));
  float edge = smoothstep(uTeaBot-0.2, uTeaBot+1.2, y) * smoothstep(uTeaTop+0.2, uTeaTop-1.0, y) * smoothstep(1.08, 0.8, x);
  float far = exp(-s*0.05);
  return vec3(1.0,0.72,0.42) * T * focus * ripple * edge * far;
}`;

function injectCaustic(mat, U) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP2 = (modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + CAUSTIC_GLSL + (mat.userData.wood ? WOOD_GLSL : ''))
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += causticAt(vWP2) * uCaus * 1.8;
        float gdist = length(vWP2.xz - uGlassPos.xz);
        totalEmissiveRadiance += vec3(1.0,0.55,0.18) * uGlowAmt * (exp(-gdist*gdist*0.035)*0.8 + exp(-gdist*0.45)*0.6);`);
    if (mat.userData.wood) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = woodColor(vWP2.xz);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = woodRough(vWP2.xz);');
    }
  };
}

const WOOD_GLSL = /* glsl */`
vec3 woodColor(vec2 p){
  p = p.yx;
  vec2 q = vec2(p.x*0.11, p.y*0.9);
  float warp = fbm3(vec3(q*vec2(0.6,0.25), 2.0))*0.9;
  float rings = sin((p.y*0.7 + warp*0.22 + fbm3(vec3(p.x*0.012, p.y*0.05, 5.0))*0.9)*3.0)*0.5+0.5;
  float dcam = length(cameraPosition.xz - vWP2.xz) + abs(cameraPosition.y);
  float fine = 1.0 - smoothstep(14.0, 40.0, dcam);              // fade fine detail with distance (no moire)
  float fibers = mix(0.5, snoise(vec3(p.x*0.12, p.y*6.0, 1.0))*0.5+0.5, fine);
  float pores = smoothstep(0.55, 0.9, snoise(vec3(p.x*0.4, p.y*16.0, 3.0))) * fine;
  vec3 dark = vec3(0.02, 0.009, 0.005), mid = vec3(0.05, 0.024, 0.011), light = vec3(0.085, 0.045, 0.022);
  vec3 c = mix(dark, mid, smoothstep(0.15, 0.85, rings));
  c = mix(c, light, smoothstep(0.7, 1.0, rings)*0.6);
  c *= 0.82 + 0.3*fibers;
  c *= 1.0 - pores*0.35;
  return c;
}
float woodRough(vec2 p){ return 0.28 + 0.18*(snoise(vec3(p.y*0.15, p.x*6.0, 7.0))*0.5+0.5); }`;

// ---------- Steam ----------
function steamMaterial(seed) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uSeed: { value: seed } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime, uAlpha, uSeed; varying vec2 vUv; ${GLSL_NOISE}
      void main(){
        vec2 p = vUv; float t = uTime;
        vec2 cm = vec2((p.x-0.5)*4.6, p.y*13.0);
        vec2 w = vec2(fbm3(vec3(cm*0.35 - vec2(0., t*0.5), uSeed)), fbm3(vec3(cm*0.35 + 5.0 - vec2(0., t*0.5), uSeed+3.)));
        float sway = sin(cm.y*0.45 - t*0.8 + uSeed)*0.35*p.y + w.x*1.1*p.y;
        float x = cm.x - sway;
        float width = mix(0.35, 1.7, pow(p.y, 0.8));
        float core = exp(-pow(x/width, 2.0));
        float n = fbm5(vec3(x*0.9 + w.y*0.8, cm.y*0.55 - t*0.9, t*0.1 + uSeed*3.0));
        float wisp = smoothstep(-0.05, 0.6, n) * core;
        float a = wisp * smoothstep(0.0, 0.15, p.y) * pow(1.0 - p.y, 2.0) * uAlpha;
        gl_FragColor = vec4(vec3(1.0, 0.88, 0.74) * a * 0.22, 1.0);
      }`,
  });
}

// ---------- Hand ----------
// The Persian way to hold a hot estekan: a pinch at the rim. Only the fingertips enter the frame, from above.
// Each finger is one smooth tapered tube along a curved spine (no capsule "links").
function fingerGeometry(spine, r0, sides = 20, rows = 44) {
  const curve = new THREE.CatmullRomCurve3(spine, false, 'centripetal');
  const pos = new Float32Array((rows + 1) * (sides + 1) * 3);
  const idx = [];
  const frames = curve.computeFrenetFrames(rows, false);
  for (let i = 0; i <= rows; i++) {
    const u = i / rows; const c = curve.getPointAt(u);
    // taper + rounded tip (u=0 is the tip) + slight knuckle bulges
    const tip = Math.sqrt(Math.min(1, u / 0.07));
    const rr = r0 * (0.86 + 0.24 * u) * tip * (1 + 0.05 * Math.exp(-Math.pow((u - 0.36) / 0.05, 2)) + 0.06 * Math.exp(-Math.pow((u - 0.68) / 0.06, 2)));
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.86;
      const k = (i * (sides + 1) + j) * 3;
      pos[k] = c.x + N.x * x + B.x * y; pos[k + 1] = c.y + N.y * x + B.y * y; pos[k + 2] = c.z + N.z * x + B.z * y;
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function buildHand(skin, nailMat) {
  const g = new THREE.Group();
  const rad = (phi) => new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi));
  const fingers = [ // contact angle, contact height, radius, bend directions [out, up, +x]
    { phi: 1.62, y: 8.1, r: 0.66, len: 11.5, dir: [[0.35, 1, 0.25], [0.8, 1, 0.7], [0.9, 0.8, 1.0]] },  // thumb (front)
    { phi: -1.35, y: 8.25, r: 0.56, len: 12, dir: [[0.2, 1, 0.1], [0.55, 1, 0.3], [0.5, 1, 0.5]] },    // index (back)
    { phi: -0.8, y: 7.95, r: 0.58, len: 12.5, dir: [[0.25, 1, 0.1], [0.65, 1, 0.35], [0.5, 1, 0.5]] },  // middle (right-back)
  ];
  const meshes = fingers.map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), skin); m.castShadow = true; g.add(m); return m; });
  const nails = fingers.map(() => { const n = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 12), nailMat); n.visible = false; return n; });
  g.userData.pose = (wrap) => {
    const open = 1 - wrap;
    fingers.forEach((f, k) => {
      const rr = glassRadiusAt(f.y) + f.r * 0.8 + open * 0.8;
      let p = rad(f.phi).multiplyScalar(rr); p.y = f.y;
      const spine = [p.clone()];
      const segL = [f.len * 0.2, f.len * 0.25, f.len * 0.55];
      f.dir.forEach(([o, u, xr], i) => {
        const d = rad(f.phi).multiplyScalar(o + (i === 0 ? open * 0.4 : 0)).add(new THREE.Vector3(xr, u, 0)).normalize();
        p = p.clone().add(d.multiplyScalar(segL[i])); spine.push(p);
      });
      meshes[k].geometry.dispose(); meshes[k].geometry = fingerGeometry(spine, f.r);
      const tip = spine[0]; const out = rad(f.phi);
      const n = nails[k];
      n.position.copy(tip).add(out.clone().multiplyScalar(f.r * 0.62)); n.position.y += 0.55;
      n.lookAt(n.position.clone().add(out)); n.rotateX(-0.35);
    });
  };
  g.userData.pose(1);
  return g;
}

// ---------- Build ----------
export function buildTableWorld(renderer, mini) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.004, 0.003, 0.002);
  const camera = new THREE.PerspectiveCamera(26, 1080 / 1920, 0.5, 900);

  const envScene = buildEnvScene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(envScene, 0.02).texture;
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT); cubeCam.update(renderer, envScene);
  scene.environment = envTex; scene.environmentIntensity = 0.55;

  // lights
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.8, 0.58), 5.0);
  sun.position.copy(SUN_DIR).multiplyScalar(60); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 20, far: 110 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const glint = new THREE.PointLight(new THREE.Color(1.0, 0.86, 0.66), 0, 0, 2); scene.add(glint);
  const fill = new THREE.DirectionalLight(new THREE.Color(0.75, 0.82, 1.0), 0.18); fill.position.set(20, 15, 40); scene.add(fill);

  // shared caustic uniforms
  const CU = { uSunD: { value: SUN_DIR }, uGlassPos: { value: new THREE.Vector3(0, SAUCER_TOP, 0) }, uTeaTop: { value: TEA_LEVEL }, uTeaBot: { value: BASE_IN }, uCaus: { value: 1 }, uTime: { value: 0 }, uGlowAmt: { value: 0 } };

  // table
  const tableMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, clearcoat: 0.75, clearcoatRoughness: 0.14, envMapIntensity: 0.6 });
  tableMat.userData.wood = true; injectCaustic(tableMat, CU);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), tableMat);
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

  // backdrop: deep black room with a warm out-of-focus window glow and bokeh
  const back = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: true,
    uniforms: { sun: { value: SUN_DIR }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 sun; uniform float uTime; varying vec3 vD; ${GLSL_NOISE}
      void main(){
        vec3 sd = normalize(vec3(sun.x, 0.22, sun.z));
        float w = pow(max(dot(vD, sd),0.), 3.0);
        vec3 c = vec3(0.003,0.002,0.0015) + vec3(0.55,0.26,0.08)*w*0.22 + vec3(1.0,0.6,0.25)*pow(max(dot(vD,sd),0.),40.0)*0.5;
        // soft bokeh discs
        for (int i=0;i<9;i++){ float fi=float(i);
          vec3 bd = normalize(sd + vec3(sin(fi*2.1)*0.35, cos(fi*1.7)*0.12+0.05, sin(fi*3.3)*0.3));
          float d = acos(clamp(dot(vD,bd),-1.,1.));
          float rad = 0.035 + 0.02*fract(fi*0.37);
          c += vec3(1.0,0.62,0.3) * smoothstep(rad, rad*0.8, d) * (0.06 + 0.05*fract(fi*0.61)) * w*2.0;
        }
        gl_FragColor = vec4(c,1.); }`,
  }));
  back.position.y = 0; scene.add(back);

  // saucer (porcelain, gold rim)
  const sp = [[0.001, 0.4], [3.05, 0.4], [3.25, 0.44], [4.7, 0.6], [5.55, 0.86], [5.82, 0.98], [5.86, 1.03], [5.78, 1.05], [5.55, 0.98], [4.7, 0.73], [3.3, 0.5], [3.12, 0.3], [3.1, 0.02], [2.9, 0.0], [2.75, 0.18], [0.001, 0.22]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const saucerGeo = new THREE.LatheGeometry(sp.reverse(), 128); saucerGeo.computeVertexNormals();
  const porcelain = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.93, 0.88, 0.8), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.2 });
  injectCaustic(porcelain, CU);
  const saucer = new THREE.Mesh(saucerGeo, porcelain); saucer.castShadow = true; saucer.receiveShadow = true; scene.add(saucer);
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.74, 0.34), metalness: 1, roughness: 0.22, envMapIntensity: 1.6 });
  const sRim = new THREE.Mesh(new THREE.TorusGeometry(5.82, 0.045, 10, 160), gold); sRim.rotation.x = Math.PI / 2; sRim.position.y = 1.02; scene.add(sRim);
  const sRing = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.03, 8, 120), gold); sRing.rotation.x = Math.PI / 2; sRing.position.y = 0.455; scene.add(sRing);

  // sugar cubes (behind left, will sit in soft focus)
  const sugarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.95, 0.93, 0.88), roughness: 0.95 });
  const sugarGeo = new THREE.BoxGeometry(1.15, 1.0, 1.15, 2, 2, 2);
  [[-9.2, 0.5, -5.5, 0.4], [-7.6, 0.5, -6.6, -0.3], [-8.5, 1.5, -6.0, 0.9]].forEach(([x, y, z, r]) => { const m = new THREE.Mesh(sugarGeo, sugarMat); m.position.set(x, y, z); m.rotation.y = r; m.castShadow = m.receiveShadow = true; scene.add(m); });

  // ----- glass group (everything that moves with the glass) -----
  const glassG = new THREE.Group(); glassG.position.y = SAUCER_TOP; scene.add(glassG);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.015, transmission: 1, thickness: 0.35, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.5, clearcoat: 0.3 });
  const glass = new THREE.Mesh(estekanGeometry(), glassMat); glassG.add(glass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.645, 0.028, 10, 180), gold); rim.rotation.x = Math.PI / 2; rim.position.y = 8.57; glassG.add(rim);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(2.56, 0.016, 8, 180), gold); rim2.rotation.x = Math.PI / 2; rim2.position.y = 8.25; glassG.add(rim2);

  const TU = teaUniforms(cubeRT.texture);
  const teaMat = new THREE.ShaderMaterial({ uniforms: TU, vertexShader: TEA_VERT, fragmentShader: TEA_BODY_FRAG });
  const teaBody = new THREE.Mesh(teaBodyGeometry(TEA_LEVEL), teaMat); teaBody.castShadow = true; glassG.add(teaBody);
  const rTop = innerRadiusAt(TEA_LEVEL) - 0.005; TU.uR.value = rTop;
  const surfGeo = new THREE.CircleGeometry(rTop, 160); // radial resolution for the ripple:
  const sg = new THREE.RingGeometry(0.0, rTop, 192, 72); sg.rotateX(-Math.PI / 2);
  const surfMat = new THREE.ShaderMaterial({ uniforms: TU, vertexShader: SURFACE_VERT, fragmentShader: SURFACE_FRAG });
  const surface = new THREE.Mesh(sg, surfMat); surface.position.y = TEA_LEVEL; glassG.add(surface);
  surfGeo.dispose();

  // residue for the empty glass
  const residue = new THREE.Mesh(teaBodyGeometry(BASE_IN + 0.12), new THREE.ShaderMaterial({ uniforms: { ...TU, uThin: { value: 0.25 } }, vertexShader: TEA_VERT, fragmentShader: TEA_BODY_FRAG }));
  residue.visible = false; glassG.add(residue);

  // Worthington jet + the drop
  const dropMat = new THREE.ShaderMaterial({ uniforms: { ...TU, uThin: { value: 0.35 } }, vertexShader: TEA_VERT, fragmentShader: TEA_BODY_FRAG });
  const dropSpec = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.0, thickness: 0.3, ior: 1.33, transparent: true, opacity: 0.0 });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 24), dropMat); drop.scale.set(1, 1.18, 1); scene.add(drop);
  const dropShell = new THREE.Mesh(new THREE.SphereGeometry(0.215, 32, 24), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.5, envMapIntensity: 3, blending: THREE.AdditiveBlending, depthWrite: false }));
  drop.add(dropShell); dropSpec.dispose();
  const jetMat = new THREE.ShaderMaterial({ uniforms: { ...TU, uThin: { value: 6.0 } }, vertexShader: TEA_VERT, fragmentShader: TEA_BODY_FRAG });
  const jet = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 1, 6, 16), jetMat); jet.visible = false; glassG.add(jet);
  const jetBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), jetMat); jetBall.visible = false; glassG.add(jetBall);

  // climax droplets (suspended)
  const R = rng(77);
  const droplets = [];
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035 + R() * 0.07, 14, 10), dropMat);
    m.add(new THREE.Mesh(m.geometry, dropShell.material));
    m.userData = { a: R() * Math.PI * 2, r: 1.2 + R() * 3.4, y: 8.5 + R() * 5.0, s: 0.4 + R() * 0.9, ph: R() * 6 };
    m.visible = false; glassG.add(m); droplets.push(m);
  }

  // steam ribbons
  const steam = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4 + i * 0.6, 13 + i * 1.5), steamMaterial(i * 1.7 + 0.3));
    m.geometry.translate(0, (13 + i * 1.5) / 2, 0);
    m.position.set((i - 1.5) * 0.35, TEA_LEVEL + SAUCER_TOP - 0.2, (i % 2) * 0.3 - 0.15);
    m.renderOrder = 10; scene.add(m); steam.push(m);
  }

  // light shafts behind the glass
  const shafts = [];
  const shaftMat = (seed) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uA: { value: 1 }, uSeed: { value: seed } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime,uA,uSeed; varying vec2 vUv; ${GLSL_NOISE}
      void main(){ float x = vUv.x; float a = smoothstep(0.,0.5,x)*smoothstep(1.,0.5,x);
        float n = 0.6+0.4*snoise(vec3(vUv.x*3.0, vUv.y*1.5 - uTime*0.05, uSeed));
        a *= smoothstep(0.0,0.35,vUv.y)*smoothstep(1.0,0.6,vUv.y)*n;
        gl_FragColor = vec4(vec3(1.0,0.7,0.38)*a*0.05*uA,1.); }`,
  });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4 + i * 1.6, 150), shaftMat(i * 3.1));
    m.position.copy(SUN_DIR.clone().multiplyScalar(60)).add(new THREE.Vector3(i * 4 - 8, -10, -18 - i * 6));
    const dir = SUN_DIR.clone().negate();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    m.position.copy(new THREE.Vector3(-6 + i * 5, 0, -28 - i * 5)).add(SUN_DIR.clone().multiplyScalar(70));
    scene.add(m); shafts.push(m);
  }

  // dust motes
  const nD = 110; const dp = new Float32Array(nD * 3); const ds = new Float32Array(nD);
  for (let i = 0; i < nD; i++) { dp[i * 3] = (R() - 0.5) * 50; dp[i * 3 + 1] = R() * 34; dp[i * 3 + 2] = -8 - R() * 40; ds[i] = R(); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dustGeo.setAttribute('seed', new THREE.BufferAttribute(ds, 1));
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 1 }, map: { value: dotTexture(64, 0.3) } },
    vertexShader: `attribute float seed; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; p.x += sin(uTime*0.2+seed*30.)*0.8 + uTime*0.25; p.y += sin(uTime*0.15+seed*20.)*0.6 - uTime*0.12;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = (0.9 + seed*1.8) * 520.0 / -mv.z; vA = 0.35+0.65*fract(seed*7.3); }`,
    fragmentShader: `uniform sampler2D map; uniform float uA; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(1.0,0.75,0.45)*a*vA*0.22*uA,1.); }`,
  }));
  scene.add(dust);

  // hand
  const skin = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.6, 0.39, 0.29), roughness: 0.6, envMapIntensity: 0.45, sheen: 0.5, sheenColor: new THREE.Color(0.9, 0.45, 0.35), sheenRoughness: 0.6, clearcoat: 0.05, emissive: new THREE.Color(0.05, 0.012, 0.006) });
  const nailMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.86, 0.66, 0.6), roughness: 0.25, clearcoat: 0.8, envMapIntensity: 0.6 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.6, 0.39, 0.29), roughness: 0.6 });
  const hand = buildHand(skin, nailMat); hand.visible = false; glassG.add(hand);

  // miniature city (climax): provided by the city module, scaled to cm
  if (mini) { mini.visible = false; glassG.add(mini); }

  const W = { glint, scene, camera, glassG, glass, teaBody, surface, residue, TU, CU, drop, jet, jetBall, droplets, steam, shafts, dust, hand, mini, sun, back };

  W.update = (t, st) => {
    // st: {tau, glow, inner, dome, waveT, steamA, teaVisible, empty, handOn, wrap, handOffset, lift, dropY, miniRise}
    TU.uTime.value = t; TU.uTau.value = st.tau ?? -1; TU.uGlow.value = st.glow ?? 0; TU.uInner.value = st.inner ?? 0;
    TU.uDome.value = st.dome ?? 0; TU.uWaveT.value = t; TU.uGlowPos.value.set(0.15, TEA_LEVEL - 1.2, 0.1);
    CU.uTime.value = t; CU.uGlowAmt.value = st.tableGlow ?? 0;
    CU.uCaus.value = st.empty ? 0 : (1 + (st.inner ?? 0) * 0.6);
    const lift = st.lift ?? 0;
    glassG.position.set(0, SAUCER_TOP + lift, 0);
    CU.uGlassPos.value.copy(glassG.position);
    teaBody.visible = surface.visible = !st.empty; residue.visible = !!st.empty;
    steam.forEach((m, i) => {
      m.material.uniforms.uTime.value = t + i * 3.0; m.material.uniforms.uAlpha.value = st.steamA ?? 1;
      m.visible = (st.steamA ?? 1) > 0.001;
      m.position.y = TEA_LEVEL + SAUCER_TOP - 0.2 + lift;
      m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z) + (i - 1.5) * 0.25;
    });
    shafts.forEach((m) => { m.material.uniforms.uTime.value = t; m.material.uniforms.uA.value = st.shaftA ?? 1; });
    dust.material.uniforms.uTime.value = t; dust.material.uniforms.uA.value = st.dustA ?? 1;
    back.material.uniforms.uTime.value = t;
    const gk = st.glint ?? 0; glint.intensity = gk * 700; glint.position.set(lerp(-14, 14, st.glintX ?? 0), 24, 6);
    // drop
    if (st.dropY !== undefined && st.dropY !== null) { drop.visible = true; drop.position.set(0.15, st.dropY, 0.1); drop.scale.set(1, 1.18 + (st.dropStretch ?? 0), 1); } else drop.visible = false;
    // jet
    const tau = st.tau ?? -1;
    if (tau > 0.12 && tau < 1.05) {
      const k = Math.sin(Math.PI * clamp((tau - 0.12) / 0.8));
      jet.visible = true; jet.scale.set(1 - 0.3 * k, Math.max(0.01, k * 0.7), 1 - 0.3 * k); jet.position.set(0.15, TEA_LEVEL + k * 0.32, 0.1);
      jetBall.visible = tau > 0.45; jetBall.position.set(0.15, TEA_LEVEL + 0.85 * Math.sin(Math.PI * clamp((tau - 0.3) / 0.75)) + 0.2, 0.1);
      jetBall.scale.setScalar(1 - 0.4 * clamp((tau - 0.7) / 0.35));
      if (jetBall.position.y < TEA_LEVEL + 0.1) jetBall.visible = false;
    } else { jet.visible = false; jetBall.visible = false; }
    // droplets
    const dA = st.droplets ?? 0;
    droplets.forEach((m) => {
      const u = m.userData; m.visible = dA > 0.01;
      if (!m.visible) return;
      const a = u.a + t * 0.25 * u.s; const y = u.y - 1.5 + dA * 1.5 + Math.sin(t * u.s + u.ph) * 0.35;
      m.position.set(Math.cos(a) * u.r, y + (st.dome ?? 0) * 0.6, Math.sin(a) * u.r);
      m.scale.setScalar(dA);
    });
    // hand
    hand.visible = !!st.handOn;
    if (hand.visible) { hand.userData.pose(st.wrap ?? 1); hand.position.copy(st.handOffset || new THREE.Vector3()); }
    // mini city
    if (mini) {
      mini.visible = (st.miniRise ?? 0) > 0.001;
      if (mini.visible) { mini.position.y = 0; mini.userData.update(t, st.dome ?? 0, st.miniRise, TU.uR.value, TEA_LEVEL); }
    }
  };
  return W;
}
