// Compositing: story-motivated transitions + cinematic grade
import * as THREE from 'three';
import { GLSL_NOISE } from './lib.js';

export const MODES = { A: 0, FADE: 1, REFRACT: 2, LIQUIDZOOM: 3, SMEAR: 4, IRIS: 5, SPLIT: 6, WIPE: 7, FLASH: 8 };

export const TransitionShader = {
  uniforms: {
    tDiffuse: { value: null }, tA: { value: null }, tB: { value: null }, tC: { value: null },
    uMode: { value: 0 }, uP: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1080 / 1920 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uGold: { value: new THREE.Color(1.6, 0.95, 0.32) },
    uSlide: { value: new THREE.Vector3(0, 0, 0) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tA, tB, tC; uniform int uMode; uniform float uP, uTime, uAspect; uniform vec2 uCenter; uniform vec3 uGold; uniform vec3 uSlide;
    varying vec2 vUv;
    ${GLSL_NOISE}
    vec3 zoomBlur(sampler2D t, vec2 uv, vec2 c, float amt){ vec3 acc = vec3(0.0); float w = 0.0;
      for(int i=0;i<20;i++){ float k = float(i)/19.0; float s = 1.0 - amt*k; float wt = 1.0 - 0.6*k; acc += texture2D(t, c + (uv-c)*s).rgb*wt; w += wt; } return acc/w; }
    vec3 dirBlur(sampler2D t, vec2 uv, vec2 d){ vec3 acc = vec3(0.0); for(int i=0;i<24;i++){ float k = float(i)/23.0 - 0.5; acc += texture2D(t, uv + d*k).rgb; } return acc/24.0; }
    vec3 liquid(vec2 uv, float t){ // golden liquid caustic field
      vec2 q = vec2(uv.x/uAspect*0.5, uv.y);
      float n = snoise(vec3(q*3.0, t*0.6)) * 0.5 + snoise(vec3(q*7.0 + 3.1, t*0.9)) * 0.25;
      float c = pow(1.0 - abs(snoise(vec3(q*5.0 + n, t*0.7))), 6.0);
      return uGold * (0.16 + 0.2*n) + vec3(1.9, 1.25, 0.5) * c * 0.7; }
    void main(){
      vec2 uv = vUv; float p = uP; vec3 col;
      if (uMode == 0) { col = texture2D(tA, uv).rgb; }
      else if (uMode == 1) { col = mix(texture2D(tA, uv).rgb, texture2D(tB, uv).rgb, p); }
      else if (uMode == 2) { // glass refraction dissolve
        vec2 q = vec2(uv.x/uAspect, uv.y);
        float n1 = snoise(vec3(q*4.0, uTime*0.5)); float n2 = snoise(vec3(q*4.0 + 7.3, uTime*0.5));
        float bell = sin(3.14159*p);
        vec2 off = vec2(n1, n2) * 0.05 * bell;
        vec3 a = texture2D(tA, uv + off).rgb; vec3 b = texture2D(tB, uv - off*0.7).rgb;
        float field = snoise(vec3(q*2.2, 1.7))*0.5+0.5;
        float m = smoothstep(field - 0.25, field + 0.05, p*1.35 - 0.1);
        float rimv = (1.0 - abs(m*2.0-1.0)); col = mix(a, b, m) + vec3(1.2,1.1,1.0)*pow(rimv,3.0)*0.35*bell;
      }
      else if (uMode == 3) { // push into liquid -> gold -> next world
        vec3 L = liquid(uv, uTime);
        if (p < 0.55) { float q = p/0.55; vec3 a = zoomBlur(tA, uv, uCenter, q*q*0.6); col = mix(a, L, smoothstep(0.35, 1.0, q)); }
        else { float q = (p-0.55)/0.45; vec3 b = zoomBlur(tB, uv, vec2(0.5), (1.0-q)*0.4); col = mix(L, b, smoothstep(0.0, 0.85, q)); }
      }
      else if (uMode == 4) { // motion smear becomes liquid
        float s = smoothstep(0.0, 0.6, p) * (1.0 - smoothstep(0.6, 1.0, p));
        vec3 a = dirBlur(tA, uv, vec2(0.45*smoothstep(0.0,0.6,p), 0.0));
        vec3 b = dirBlur(tB, uv, vec2(0.35*(1.0-smoothstep(0.45,1.0,p)), 0.0));
        float edge = 1.15 - p*1.5 + 0.07*snoise(vec3(uv.y*6.0, uv.x*2.0, uTime*1.3));
        float m = smoothstep(edge-0.04, edge+0.04, uv.x);
        vec3 L = liquid(uv*vec2(0.4,1.0) + vec2(uTime*0.4,0.0), uTime*2.0);
        col = mix(a, b, m) + L * 0.9 * (1.0 - abs(m*2.0-1.0)) * s;
      }
      else if (uMode == 5) { // droplet iris with refractive rim
        vec2 d = uv - uCenter; d.x /= uAspect; float r = length(d);
        float R = p*p*1.25;
        float lens = smoothstep(R, R - 0.12, r);
        vec2 bend = -normalize(d + 1e-5) * (1.0 - lens) * 0.06 * smoothstep(R+0.02, R-0.02, r);
        vec3 b = texture2D(tB, uv + bend).rgb;
        vec3 a = zoomBlur(tA, uv, uCenter, p*0.25);
        float inside = smoothstep(R + 0.005, R - 0.005, r);
        float ring = exp(-pow((r - R)/0.012, 2.0));
        col = mix(a, b, inside) + vec3(2.5, 2.1, 1.6) * ring * (1.0 - p) * 0.8;
      }
      else if (uMode == 6) { // editorial triptych
        float x = uv.x; int panel = x < 0.3333 ? 0 : (x < 0.6666 ? 1 : 2);
        float lx = fract(x*3.0);
        vec2 puv = vec2(0.3333 + lx*0.3333, uv.y);
        vec3 sl = uSlide;
        if (panel == 0) { puv.y += sl.x; col = texture2D(tA, puv).rgb; }
        else if (panel == 1) { puv.y -= sl.y; col = texture2D(tB, puv).rgb; }
        else { puv.y += sl.z; col = texture2D(tC, puv).rgb; }
        float off = panel == 0 ? sl.x : (panel == 1 ? -sl.y : sl.z);
        if (puv.y < 0.0 || puv.y > 1.0) col = vec3(0.0);
        float sep = min(abs(x-0.3333), abs(x-0.6666));
        col = mix(col, vec3(1.8, 1.25, 0.55), smoothstep(0.0022, 0.0008, sep));
      }
      else if (uMode == 7) { // concept-to-final wipe
        float line = (uv.y*0.6 + uv.x*0.4);
        float e = p*1.3 - 0.15;
        float m = smoothstep(e-0.01, e+0.01, line);
        vec3 a = texture2D(tA, uv).rgb, b = texture2D(tB, uv).rgb;
        col = mix(b, a, m) + vec3(2.4, 1.6, 0.6) * exp(-pow((line-e)/0.006, 2.0));
      }
      else { // 8 flash cut
        col = p < 0.5 ? texture2D(tA, uv).rgb : texture2D(tB, uv).rgb;
        col += vec3(3.0, 2.6, 2.1) * pow(1.0 - abs(p*2.0 - 1.0), 4.0);
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uExposure: { value: 1 }, uFade: { value: 0 }, uFlash: { value: 0 },
    uVig: { value: 0.55 }, uGrain: { value: 0.035 }, uCA: { value: 0.0018 }, uRes: { value: new THREE.Vector2(1080, 1920) }, uLetter: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uExposure, uFade, uFlash, uVig, uGrain, uCA, uLetter; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
    vec3 aces(vec3 x){ // ACES fitted (Hill)
      const mat3 i = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
      const mat3 o = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
      x = i*x; vec3 a = x*(x+0.0245786)-0.000090537; vec3 b = x*(0.983729*x+0.4329510)+0.238081; return clamp(o*(a/b), 0.0, 1.0); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
    void main(){
      vec2 uv = vUv; vec2 d = uv - 0.5;
      vec3 c;
      c.r = texture2D(tDiffuse, uv - d*uCA).r; c.g = texture2D(tDiffuse, uv).g; c.b = texture2D(tDiffuse, uv + d*uCA).b;
      c *= uExposure;
      c = aces(c * 1.35);
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      // split tone: neutral-cool shadows, warm gold highlights
      c = mix(c, c * vec3(0.94, 0.98, 1.06), (1.0 - smoothstep(0.0, 0.35, l)) * 0.6);
      c = mix(c, c * vec3(1.06, 1.0, 0.9), smoothstep(0.45, 1.0, l) * 0.5);
      c = mix(vec3(l), c, 1.04);
      c = clamp(c, 0.0, 1.0);
      c = c*c*(3.0-2.0*c)*0.22 + c*0.78; // gentle S-curve
      float v = smoothstep(0.95, 0.25, length(d*vec2(1.0, 0.82)));
      c *= mix(1.0, v, uVig);
      c = toSRGB(c);
      float g = hash(uv*uRes + fract(uTime*24.0)*917.0) - 0.5;
      c += g * uGrain * (1.0 - 0.5*l);
      c = mix(c, vec3(1.0), uFlash);
      c *= 1.0 - uFade;
      if (abs(uv.y - 0.5) > 0.5 - uLetter) c = vec3(0.0);
      gl_FragColor = vec4(c, 1.0);
    }`,
};
