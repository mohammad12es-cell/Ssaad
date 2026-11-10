// GLSL building blocks + the shared "firelight" system.
// Every fire in the film (fireballs, craters, the fire wave, the ring, the wall, burning blades)
// registers point-ish light sources each frame; the brightest FIRE_N are uploaded here and used by
// (a) every lit material (diffuse + glossy reflections in wet mud/armour),
// (b) rain & smoke tinting, (c) the volumetric in-scatter pass.
import * as THREE from "three";

export const FIRE_N = 20;
export const FIRE = {
  posV: { value: Array.from({ length: FIRE_N }, () => new THREE.Vector4(0, -1e4, 0, 1)) }, // view space xyz, radius
  posW: { value: Array.from({ length: FIRE_N }, () => new THREE.Vector4(0, -1e4, 0, 1)) }, // world space
  col: { value: Array.from({ length: FIRE_N }, () => new THREE.Vector3()) },
};
export const G = { // global per-frame uniforms
  time: { value: 0 }, flash: { value: 0 }, gust: { value: 1 }, cam: { value: new THREE.Vector3() },
  fogDensity: { value: 0.0042 }, fogColor: { value: new THREE.Color(0x161d27) },
  wave: { value: new THREE.Vector4(0, 0, -1, 0) },   // x0, z0 origin, front distance, active
  waveW: { value: new THREE.Vector2(0, 0) },        // spread, age
  ring: { value: new THREE.Vector4(0, 0, 0, 0) },   // cx, cz, radius, age
  wall: { value: new THREE.Vector4(-40, 0, 0, 0) }, // z, height, age, eruption spread(x)
  craters: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, 0, -1)) }, // x,z,radius,age
};

export const NOISE = /* glsl */ `
float h13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*n3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5;} return s; }
float fbm2(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<3;i++){ s+=a*n3(p); p=p*2.07+vec3(5.1,1.3,7.7); a*=0.5;} return s; }
// natural fire: ember red -> orange -> gold -> white-hot
vec3 fireRamp(float T){
  vec3 c = vec3(0.0);
  c = mix(c, vec3(0.42,0.025,0.0), smoothstep(0.0,0.2,T));
  c = mix(c, vec3(1.0,0.22,0.015), smoothstep(0.15,0.45,T));
  c = mix(c, vec3(1.0,0.55,0.12), smoothstep(0.4,0.7,T));
  c = mix(c, vec3(1.0,0.88,0.62), smoothstep(0.68,1.0,T));
  return c;
}
// the samurai's supernatural fire: crimson edges, molten-gold core
vec3 spiritRamp(float T){
  vec3 c = vec3(0.0);
  c = mix(c, vec3(0.45,0.0,0.035), smoothstep(0.0,0.2,T));
  c = mix(c, vec3(1.0,0.08,0.03), smoothstep(0.15,0.42,T));
  c = mix(c, vec3(1.0,0.42,0.1), smoothstep(0.38,0.68,T));
  c = mix(c, vec3(1.0,0.85,0.55), smoothstep(0.66,1.0,T));
  return c;
}
`;

export const FIRE_PARS = /* glsl */ `
#define FIRE_N ${FIRE_N}
uniform vec4 uFirePosV[FIRE_N];
uniform vec4 uFirePosW[FIRE_N];
uniform vec3 uFireCol[FIRE_N];
vec3 fireAtW(vec3 p){ // irradiance-ish (no normal) at a world point, for particles/rain/smoke
  vec3 s = vec3(0.0);
  for(int i=0;i<FIRE_N;i++){ vec3 d = uFirePosW[i].xyz - p; float r = uFirePosW[i].w; s += uFireCol[i] / (1.0 + dot(d,d)/(r*r)); }
  return s;
}
`;

const DIRECT = /* glsl */ `
  for (int i = 0; i < FIRE_N; i++) {
    vec3 Lv = uFirePosV[i].xyz - geometryPosition;
    float d2 = max(dot(Lv, Lv), 1e-4); float rr = uFirePosV[i].w;
    vec3 L = Lv * inversesqrt(d2);
    vec3 c = uFireCol[i] / (1.0 + d2 / (rr * rr));
    float ndl = dot(geometryNormal, L);
    reflectedLight.directDiffuse += c * (max(ndl, 0.0) * 0.82 + 0.18) * BRDF_Lambert(material.diffuseColor);
    vec3 Hh = normalize(L + geometryViewDir);
    float a = max(material.roughness, 0.05); a = a * a;
    float n = min(2.0 / (a * a) - 2.0, 3000.0);
    float spec = (n + 8.0) / 25.13 * pow(max(dot(geometryNormal, Hh), 0.0), n);
    reflectedLight.directSpecular += c * max(ndl, 0.0) * spec * material.specularColor;
  }
`;

// Patch a MeshStandard/MeshPhysical material so it receives firelight.
// extraEmissive: optional GLSL expression (vec3) using vFireW (world position) for ember glows etc.
export function fireLit(mat, { extraEmissive = null, extraPars = "", key = "" } = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, { uFirePosV: FIRE.posV, uFirePosW: FIRE.posW, uFireCol: FIRE.col, uTime: G.time, uFlash: G.flash,
      uWave: G.wave, uWaveW: G.waveW, uRing: G.ring, uWall: G.wall, uCraters: G.craters });
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + NOISE + FIRE_PARS + "varying vec3 vFireW;\nuniform float uTime, uFlash; uniform vec4 uWave, uRing, uWall; uniform vec2 uWaveW; uniform vec4 uCraters[12];\n" + extraPars)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + DIRECT)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + (extraEmissive ? `totalEmissiveRadiance += ${extraEmissive};` : ""));
    if (!sh.vertexShader.includes("varying vec3 vFireW")) {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vFireW;")
        .replace("#include <project_vertex>", `#include <project_vertex>
          { vec4 fw = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              fw = instanceMatrix * fw;
            #endif
            vFireW = (modelMatrix * fw).xyz; }`);
    }
  };
  const pk = mat.customProgramCacheKey.bind(mat);
  mat.customProgramCacheKey = () => pk() + "|fire" + key + (extraEmissive || "");
  return mat;
}

// Wind deformation for cloth / hair cards / banners (aTip: 0 root -> 1 free end).
export function windy(mat, amp, key = "") {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uTimeW = G.time; sh.uniforms.uGust = G.gust;
    sh.vertexShader = "uniform float uTimeW; uniform float uGust; attribute float aTip;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      mat4 WM = modelMatrix;
      #ifdef USE_INSTANCING
        WM = modelMatrix * instanceMatrix;
      #endif
      vec3 wp0 = (WM * vec4(position, 1.0)).xyz;
      float ph = dot(wp0.xz, vec2(1.7, 2.3)) + wp0.y * 0.5;
      float tip = pow(aTip, 1.5);
      float g = uGust * (0.75 + 0.25 * sin(uTimeW * 1.3 + ph * 0.2));
      vec3 wd = vec3(0.5 * sin(uTimeW * 8.5 + ph * 2.0 - aTip * 6.0) + 0.25 * sin(uTimeW * 17.0 + ph * 5.0 - aTip * 11.0),
                     0.18 * sin(uTimeW * 11.0 + ph * 3.0 - aTip * 8.0) + 0.2,
                     1.0 + 0.35 * sin(uTimeW * 6.0 + ph - aTip * 5.0)) * ${amp.toFixed(3)} * tip * g;
      transformed += inverse(mat3(WM)) * wd;`);
  };
  const pk = mat.customProgramCacheKey.bind(mat);
  mat.customProgramCacheKey = () => pk() + "|wind" + amp + key;
  return mat;
}
