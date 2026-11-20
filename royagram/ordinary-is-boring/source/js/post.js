// Post pipeline: HDR scene → depth-aware bokeh DOF → bloom → ACES + grade + vignette + grain + CA → screen.
import * as THREE from 'three';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { fsQuad } from './common.js';

export class Post {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { ...opts, samples: 4 });
    this.rtScene.depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedIntType);
    this.rtDof = new THREE.WebGLRenderTarget(W, H, opts);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.55, 0.85);

    this.dofMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tDepth: { value: null }, near: { value: 0.1 }, far: { value: 100 },
        focus: { value: 10 }, aperture: { value: 0 }, maxBlur: { value: 18 }, res: { value: new THREE.Vector2(W, H) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
      fragmentShader: /* glsl */`
        #include <packing>
        uniform sampler2D tColor, tDepth; uniform float near, far, focus, aperture, maxBlur; uniform vec2 res; varying vec2 vUv;
        float vz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }
        float coc(float z){ return clamp(aperture * abs(1.0/focus - 1.0/z), 0.0, maxBlur); }
        void main(){
          vec3 c0 = texture2D(tColor, vUv).rgb;
          if (aperture <= 0.0) { gl_FragColor = vec4(c0,1.); return; }
          float z0 = vz(vUv); float k0 = coc(z0);
          vec3 acc = c0; float ws = 1.0;
          const int N = 36;
          for (int i = 0; i < N; i++) {
            float fi = float(i) + 0.5;
            float r = sqrt(fi / float(N)) * maxBlur;
            float th = fi * 2.39996323;
            vec2 uv = vUv + vec2(cos(th), sin(th)) * r / res;
            float z = vz(uv); float k = coc(z);
            if (z > z0) k = min(k, k0);          // background can't smear over a sharper foreground
            float w = smoothstep(r - 1.5, r + 0.5, k);
            acc += texture2D(tColor, uv).rgb * w; ws += w;
          }
          gl_FragColor = vec4(acc / ws, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.dofQ = fsQuad(this.dofMat);

    this.finalMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, exposure: { value: 1 }, sat: { value: 1.05 }, contrast: { value: 1.06 },
        vignette: { value: 0.55 }, grain: { value: 0.035 }, frame: { value: 0 }, ca: { value: 0.0025 },
        fade: { value: 0 }, flash: { value: 0 }, flashColor: { value: new THREE.Color(1.0, 0.58, 0.22) },
        warm: { value: 0.06 }, res: { value: new THREE.Vector2(W, H) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tColor; uniform float exposure, sat, contrast, vignette, grain, frame, ca, fade, flash, warm; uniform vec3 flashColor; uniform vec2 res; varying vec2 vUv;
        vec3 RRTAndODTFit(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
        vec3 aces(vec3 c){
          const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));
          const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));
          c*=1.0/0.6; c=I*c; c=RRTAndODTFit(c); c=O*c; return clamp(c,0.,1.);
        }
        float h(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
        vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1.0/2.4))-0.055, step(0.0031308,c)); }
        void main(){
          vec2 d = vUv - 0.5;
          vec3 c;
          c.r = texture2D(tColor, vUv - d*ca).r;
          c.g = texture2D(tColor, vUv).g;
          c.b = texture2D(tColor, vUv + d*ca).b;
          c = c*exposure + flash*flashColor;
          c = aces(c);
          float l = dot(c, vec3(0.2126,0.7152,0.0722));
          c = mix(vec3(l), c, sat);
          c = mix(c, c*vec3(1.0+warm, 1.0+warm*0.25, 1.0-warm*0.7), smoothstep(0.05,0.6,l)); // warm highlights, neutral blacks
          vec3 s = toSRGB(c);
          s = (s-0.5)*contrast+0.5;
          float v = smoothstep(1.05, 0.25, length(d*vec2(1.0,1.15)));
          s *= mix(1.0, v, vignette);
          s += (h(vUv*res + frame*17.13) - 0.5) * grain * (1.0 - 0.6*l);
          s *= (1.0 - fade);
          gl_FragColor = vec4(clamp(s,0.,1.), 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.finalQ = fsQuad(this.finalMat);
  }

  // look: {focus, aperture, maxBlur, bloom:[strength,radius,threshold], exposure, ...final uniforms}
  render(scene, camera, look, preRender) {
    const r = this.r;
    if (preRender) preRender();
    r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
    const u = this.dofMat.uniforms;
    u.tColor.value = this.rtScene.texture; u.tDepth.value = this.rtScene.depthTexture;
    u.near.value = camera.near; u.far.value = camera.far;
    u.focus.value = look.focus ?? 10; u.aperture.value = look.aperture ?? 0; u.maxBlur.value = look.maxBlur ?? 18;
    this.dofQ.render(r, this.rtDof);
    const b = look.bloom || [0.6, 0.5, 0.85];
    this.bloom.strength = b[0]; this.bloom.radius = b[1]; this.bloom.threshold = b[2];
    if (b[0] > 0) this.bloom.render(r, null, this.rtDof, 0, false);
    const f = this.finalMat.uniforms; f.tColor.value = this.rtDof.texture;
    for (const k of ['exposure', 'sat', 'contrast', 'vignette', 'grain', 'frame', 'ca', 'fade', 'flash', 'warm']) if (look[k] !== undefined) f[k].value = look[k];
    if (look.flashColor) f.flashColor.value.set(...look.flashColor);
    this.finalQ.render(r, null);
  }
}
