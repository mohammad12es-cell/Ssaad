// SHOT 1 — Kael's right eye in extreme close-up. Full-screen procedural shader.
// The cornea reflects a live render of Neo-Eden (tCity), so the reflection is the real city.
import * as THREE from "three";
import { GLSL_NOISE } from "./util.js";

export function makeEyeShot(W, H) {
  const cityRT = new THREE.WebGLRenderTarget(768, 768, { type: THREE.HalfFloatType });
  const U = {
    tCity: { value: cityRT.texture }, uTime: { value: 0 }, uAspect: { value: W / H },
    uZoom: { value: 1 }, uOff: { value: new THREE.Vector2() }, uIris: { value: new THREE.Vector2() },
    uPupil: { value: 0.072 }, uScan: { value: -1 }, uScanAmt: { value: 0 }, uReticle: { value: 0 },
    uSweep: { value: 0 }, uReflBoost: { value: 1 }, uBlink: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: /* glsl */ `${GLSL_NOISE}
      uniform sampler2D tCity; uniform float uTime, uAspect, uZoom, uPupil, uScan, uScanAmt, uReticle, uSweep, uReflBoost, uBlink;
      uniform vec2 uOff, uIris; varying vec2 vUv;
      float upperLid(float x){ return mix(0.15, -0.19, uBlink) - 1.45 * x * x + 0.04 * x - 0.6 * x * x * x; }
      float lowerLid(float x){ return -0.168 + 0.95 * x * x - 0.2 * x * x * x; }
      float skinH(vec2 p){
        float yu = upperLid(p.x), yl = lowerLid(p.x);
        float h = 0.0;
        float a = (p.y - yu) / 0.1; h += 0.03 * sin(clamp(a, 0.0, 1.0) * 3.14159) * step(0.0, a);
        h += 0.06 * smoothstep(yu + 0.1, 0.55, p.y);
        h -= 0.012 * exp(-pow((p.y - yu - 0.1) / 0.012, 2.0));                // crease
        float b = (yl - p.y) / 0.07; h += 0.022 * sin(clamp(b, 0.0, 1.0) * 3.14159) * step(0.0, b);
        h += 0.04 * smoothstep(yl - 0.07, -0.55, p.y);
        h += 0.0018 * (vnoise(p * 260.0) - 0.5) + 0.0009 * (vnoise(p * 900.0) - 0.5);  // pores
        return h;
      }
      float lashes(vec2 p, bool upper){
        float acc = 0.0;
        float cw = upper ? 0.0055 : 0.009;
        float ci = floor(p.x / cw);
        for (int k = -4; k <= 4; k++) {
          float c = ci + float(k);
          float x0 = (c + 0.5 + (h11(c * 1.7) - 0.5) * 0.6) * cw;
          float y0 = upper ? upperLid(x0) : lowerLid(x0);
          float len = upper ? (0.045 + 0.04 * h11(c * 3.1)) * (1.0 - 0.6 * smoothstep(0.1, 0.5, abs(x0))) : 0.022 + 0.015 * h11(c * 5.3);
          float tilt = x0 * 1.6 + (h11(c * 9.1) - 0.5) * 0.5;
          vec2 d = normalize(vec2(tilt, upper ? 1.0 : -1.0));
          vec2 q = p - vec2(x0, y0);
          float s = clamp(dot(q, d), 0.0, len);
          vec2 pt = d * s + vec2(sign(x0) * 0.35, upper ? -0.05 : 0.02) * s * s / len;
          float w = (upper ? 0.0016 : 0.001) * (1.0 - 0.8 * s / len);
          acc = max(acc, 1.0 - smoothstep(w * 0.3, w, length(q - pt)));
        }
        return acc;
      }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) / uZoom + uOff;
        float t = uTime;
        float yu = upperLid(p.x), yl = lowerLid(p.x);
        float inEye = smoothstep(-0.002, 0.002, yu - p.y) * smoothstep(-0.002, 0.002, p.y - yl);
        // ---------------- skin ----------------
        float e = 0.0015;
        float h0 = skinH(p);
        vec3 n = normalize(vec3(-(skinH(p + vec2(e, 0.)) - h0) / e, -(skinH(p + vec2(0., e)) - h0) / e, 1.0));
        vec3 L1 = normalize(vec3(-0.65, 0.6, 0.55)), L2 = normalize(vec3(0.8, -0.15, 0.45));
        vec3 skinAlb = vec3(0.5, 0.31, 0.23);
        vec3 skin = skinAlb * (vec3(0.2, 0.75, 1.0) * max(dot(n, L1), 0.0) * 0.55 + vec3(0.55, 0.38, 1.0) * max(dot(n, L2), 0.0) * 0.45 + vec3(0.04, 0.035, 0.07));
        skin += skinAlb * vec3(0.5, 0.18, 0.12) * 0.12;                                  // subsurface warmth
        vec3 hv = normalize(L1 + vec3(0, 0, 1)); skin += vec3(0.3, 0.8, 1.0) * pow(max(dot(n, hv), 0.0), 60.0) * 0.25;
        skin *= 0.8 + 0.2 * smoothstep(0.0, 0.03, abs(p.y - yu - 0.1));
        skin *= 1.0 - 0.55 * exp(-pow((p.y - yu) / 0.012, 2.0)) * step(yu, p.y);     // lid margin shadow
        skin += vec3(0.4, 0.2, 0.2) * exp(-pow((p.y - yl + 0.004) / 0.004, 2.0)) * 0.6;  // waterline
        // moving light from passing traffic
        skin *= 1.0 + uSweep * 0.6 * exp(-pow((p.x + p.y * 0.4 - (fract(t * 0.35) * 2.0 - 1.0)) / 0.25, 2.0));
        // water beads on the skin
        for (int i = 0; i < 7; i++) {
          float fi = float(i);
          vec2 c = vec2((h11(fi * 3.7) - 0.5) * 0.55, mix(0.22, 0.48, h11(fi * 5.1)) * (h11(fi * 7.7) > 0.4 ? 1.0 : -0.75));
          c.y -= t * 0.004 * h11(fi);
          float r = 0.004 + 0.007 * h11(fi * 9.3);
          float d = length(p - c);
          float drop = 1.0 - smoothstep(r * 0.9, r, d);
          skin = mix(skin, skin * 0.6 + vec3(0.1, 0.25, 0.35) * 0.3, drop * 0.7);
          skin += vec3(0.8, 1.0, 1.1) * exp(-pow(length(p - c - vec2(-0.35, 0.4) * r) / (r * 0.22), 2.0)) * drop;
        }
        // ---------------- eyeball ----------------
        vec2 q = p - uIris;
        float R = 0.44;
        float rr = length(q);
        vec3 en = normalize(vec3(q, sqrt(max(R * R - rr * rr, 0.0))));
        float ri = 0.172;
        vec3 scl = vec3(0.62, 0.6, 0.64);
        scl *= 1.0 - 0.25 * smoothstep(0.25, 0.55, abs(p.x));
        float veins = smoothstep(0.62, 0.7, fbm(vec2(atan(q.y, q.x) * 6.0, rr * 14.0))) * smoothstep(0.24, 0.5, rr);
        scl = mix(scl, vec3(0.6, 0.22, 0.22), veins * 0.35);
        float ang = abs(atan(q.y, q.x));
        float fib = fbm(vec2(ang * 18.0, rr * 30.0)) * 0.6 + vnoise(vec2(ang * 90.0, rr * 6.0)) * 0.4;
        vec3 irisC = mix(vec3(0.03, 0.015, 0.008), vec3(0.17, 0.085, 0.04), fib * smoothstep(0.2, 0.08, rr) + 0.25 * fib);
        irisC *= 0.7 + 0.7 * exp(-pow((rr - 0.09) / 0.028, 2.0));                      // collarette
        irisC *= smoothstep(ri + 0.004, ri - 0.03, rr);                                  // limbal ring
        float pupil = smoothstep(uPupil + 0.003, uPupil - 0.003, rr);
        vec3 eyeC = mix(scl, irisC, smoothstep(ri + 0.004, ri - 0.004, rr));
        eyeC = mix(eyeC, vec3(0.004), pupil);
        float lightE = 0.35 + 0.65 * max(dot(en, normalize(vec3(-0.4, 0.5, 0.8))), 0.0);
        eyeC *= lightE * vec3(0.75, 0.9, 1.05);
        // lid occlusion on the eyeball
        float occ = smoothstep(0.0, 0.05, yu - p.y) * (0.55 + 0.45 * smoothstep(0.0, 0.03, p.y - yl));
        eyeC *= mix(0.2, 1.0, occ);
        // cornea reflection of the city (convex-mirror mapping)
        vec2 ruv = vec2(0.5 - en.x * 0.9, 0.42 + en.y * 0.9);
        ruv += (vec2(vnoise(p * 30.0 + t * 0.2), vnoise(p * 30.0 + 7.0)) - 0.5) * 0.004;
        vec3 city = texture2D(tCity, ruv).rgb; city = city / (1.0 + city) * 1.6;
        float cornea = smoothstep(ri + 0.03, ri - 0.01, rr);
        float reflK = mix(0.1, 0.32, cornea) * (0.5 + 0.5 * occ) * uReflBoost * (1.0 + 1.2 * pupil);
        vec3 refl = city * reflK;
        // digital scan sweeping across the reflection
        float sy = uScan;
        vec2 rq = ruv;
        float line = exp(-pow((rq.y - sy) / 0.006, 2.0));
        float trail = smoothstep(sy - 0.25, sy, rq.y) * step(rq.y, sy);
        vec2 grid = abs(fract(rq * vec2(42.0, 42.0)) - 0.5);
        float gl = (1.0 - smoothstep(0.0, 0.06, min(grid.x, grid.y))) * trail;
        float dots = step(0.82, h21(floor(rq * 42.0) + floor(t * 12.0))) * trail;
        vec3 scanC = vec3(0.2, 1.8, 2.6);
        refl += scanC * (line * 1.8 + gl * 0.35 + dots * 0.4) * uScanAmt;
        // reticle locking onto the pupil
        float rt = abs(rr - mix(0.16, 0.095, uReticle)) ; float ret = exp(-pow(rt / 0.0018, 2.0)) * step(0.5, fract(atan(q.y, q.x) / 6.2831 * 12.0 + t * 0.3));
        refl += scanC * ret * uReticle * 0.9 * step(0.01, uReticle);
        eyeC += refl;
        // specular highlights: a neon strip + soft window
        vec2 hp = p - uIris - vec2(-0.085, 0.075);
        eyeC += vec3(0.8, 1.0, 1.1) * exp(-pow(hp.x / 0.03, 2.0) - pow(hp.y / 0.011, 2.0)) * 1.6;
        eyeC += vec3(0.7, 0.5, 1.0) * exp(-pow((p.x - uIris.x - 0.11) / 0.012, 2.0) - pow((p.y - uIris.y + 0.03) / 0.04, 2.0)) * 0.5;
        eyeC += vec3(0.8, 0.95, 1.0) * exp(-pow((p.y - yl - 0.006) / 0.003, 2.0)) * 0.35;   // tear meniscus
        vec3 col = mix(skin, eyeC, inEye);
        float la = max(lashes(p, true) * step(yu - 0.003, p.y), lashes(p, false) * step(p.y, yl + 0.002));
        col = mix(col, vec3(0.006, 0.006, 0.01), la * 0.95);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { scene, cam, U, cityRT };
}
