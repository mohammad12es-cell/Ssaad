// ODDLY EXPLAINED engine — cinematic post chain.
// scene (MSAA, HDR, depth) -> depth-of-field -> bloom -> grade (ACES, lift, CA, zoom blur, vignette, grain, fade)
import * as THREE from 'three';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';

const VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function quad(material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  m.frustumCulled = false;
  const s = new THREE.Scene(); s.add(m);
  return { scene: s, material };
}

export class Post {
  constructor(renderer, W, H, opts = {}) {
    this.r = renderer; this.W = W; this.H = H;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { ...hf, samples: opts.samples ?? 4 });
    this.rtScene.depthTexture = new THREE.DepthTexture(W, H);
    this.rtScene.depthTexture.type = THREE.UnsignedIntType;
    this.rtA = new THREE.WebGLRenderTarget(W, H, hf);
    const hw = W >> 1, hh = H >> 1, qw = W >> 2, qh = H >> 2;
    this.rtH1 = new THREE.WebGLRenderTarget(hw, hh, hf); this.rtH2 = new THREE.WebGLRenderTarget(hw, hh, hf);
    this.rtQ1 = new THREE.WebGLRenderTarget(qw, qh, hf); this.rtQ2 = new THREE.WebGLRenderTarget(qw, qh, hf);

    this.params = { focus: 5, focusRange: 3, maxCoc: 1, exposure: 1, bloom: 0.9, bloomRadius: 0.55, bloomThreshold: 0.72,
      vignette: 0.6, grain: 0.022, ca: 0.002, zoom: 0, zoomCenter: [0.5, 0.5], fade: 0, flash: 0, lift: [0.003, 0.007, 0.018], saturation: 1.0, tint: [1, 1, 1] };

    // CoC + downsample
    this.cocQ = quad(new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, near: { value: 0.1 }, far: { value: 100 }, focus: { value: 5 }, range: { value: 3 }, maxCoc: { value: 1 } },
      vertexShader: VS, fragmentShader: /* glsl */`
        uniform sampler2D tColor, tDepth; uniform float near, far, focus, range, maxCoc; varying vec2 vUv;
        float linZ(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
        void main(){
          vec3 c = texture2D(tColor, vUv).rgb;
          float d = texture2D(tDepth, vUv).x;
          float z = d >= 0.99999 ? far : linZ(d);
          float coc = clamp((abs(z - focus) - range * 0.25) / range, 0.0, 1.0) * maxCoc;
          gl_FragColor = vec4(c, z < focus ? -coc : coc); // signed: negative = foreground
        }`, depthTest: false, depthWrite: false }));
    const blurFS = /* glsl */`
      uniform sampler2D tIn; uniform vec2 dir; varying vec2 vUv;
      void main(){
        vec4 acc = vec4(0.0); float wsum = 0.0;
        for (int i = -6; i <= 6; i++) {
          float fi = float(i); float w = exp(-fi * fi / 18.0);
          vec4 s = texture2D(tIn, vUv + dir * fi);
          float ww = w * (0.1 + abs(s.a)); // CoC-weighted to limit sharp-over-blur halos
          acc += vec4(s.rgb * ww, s.a * w); wsum += ww;
        }
        gl_FragColor = vec4(acc.rgb / wsum, acc.a / 7.52);
      }`;
    this.blurQ = quad(new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS, fragmentShader: blurFS, depthTest: false, depthWrite: false }));
    this.dofQ = quad(new THREE.ShaderMaterial({
      uniforms: { tSharp: { value: null }, tDepth: { value: null }, tB1: { value: null }, tB2: { value: null }, near: { value: 0.1 }, far: { value: 100 }, focus: { value: 5 }, range: { value: 3 }, maxCoc: { value: 1 } },
      vertexShader: VS, fragmentShader: /* glsl */`
        uniform sampler2D tSharp, tDepth, tB1, tB2; uniform float near, far, focus, range, maxCoc; varying vec2 vUv;
        float linZ(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
        void main(){
          vec3 s = texture2D(tSharp, vUv).rgb;
          float d = texture2D(tDepth, vUv).x;
          float z = d >= 0.99999 ? far : linZ(d);
          float coc = clamp((abs(z - focus) - range * 0.25) / range, 0.0, 1.0) * maxCoc;
          vec4 b1 = texture2D(tB1, vUv); vec4 b2 = texture2D(tB2, vUv);
          coc = max(coc, -b2.a * 1.5); // blurry foreground bleeds over sharper things behind it
          vec3 c = mix(s, b1.rgb, smoothstep(0.0, 0.45, coc));
          c = mix(c, b2.rgb, smoothstep(0.4, 1.0, coc));
          gl_FragColor = vec4(c, 1.0);
        }`, depthTest: false, depthWrite: false }));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.55, 0.72);

    this.finalQ = quad(new THREE.ShaderMaterial({
      uniforms: { tIn: { value: null }, res: { value: new THREE.Vector2(W, H) }, time: { value: 0 }, exposure: { value: 1 }, vignette: { value: 0.5 }, grain: { value: 0.04 },
        ca: { value: 0.002 }, zoom: { value: 0 }, zoomCenter: { value: new THREE.Vector2(0.5, 0.5) }, fade: { value: 0 }, flash: { value: 0 }, lift: { value: new THREE.Vector3() }, saturation: { value: 1 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
      vertexShader: VS, fragmentShader: /* glsl */`
        uniform sampler2D tIn; uniform vec2 res, zoomCenter; uniform float time, exposure, vignette, grain, ca, zoom, fade, flash, saturation; uniform vec3 lift, tint; varying vec2 vUv;
        vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
        float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        vec3 samp(vec2 uv){
          vec2 dc = uv - 0.5; float r2 = dot(dc, dc);
          vec2 off = dc * ca * (1.0 + 4.0 * r2);
          return vec3(texture2D(tIn, uv - off).r, texture2D(tIn, uv).g, texture2D(tIn, uv + off).b);
        }
        void main(){
          vec3 c;
          if (zoom > 0.001) {
            vec3 acc = vec3(0.0); vec2 d = vUv - zoomCenter;
            for (int i = 0; i < 16; i++) { float k = 1.0 - zoom * float(i) / 16.0; acc += samp(zoomCenter + d * k); }
            c = acc / 16.0;
          } else c = samp(vUv);
          c *= exposure * tint;
          c = aces(c);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, saturation);
          c = c + lift * (1.0 - c);
          vec2 q = vUv - 0.5; q.x *= res.x / res.y;
          float v = smoothstep(0.95, 0.15, length(q * vec2(1.0, 0.82)));
          c *= mix(1.0 - vignette, 1.0, v);
          c = mix(c, vec3(1.0), flash);
          c *= 1.0 - fade;
          float g = h12(gl_FragCoord.xy + fract(time * 13.7) * 917.0) - 0.5;
          c += g * grain * (0.35 + 0.65 * (1.0 - l));
          c = pow(max(c, 0.0), vec3(1.0 / 2.2));
          gl_FragColor = vec4(c, 1.0);
        }`, depthTest: false, depthWrite: false }));
  }

  pass(q, target) { this.r.setRenderTarget(target); this.r.render(q.scene, this.cam); }

  render(scene, camera, time) {
    const r = this.r, P = this.params;
    r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
    const dofOn = P.maxCoc > 0.001;
    let src = this.rtScene;
    if (dofOn) {
      const cu = this.cocQ.material.uniforms;
      cu.tColor.value = this.rtScene.texture; cu.tDepth.value = this.rtScene.depthTexture; cu.near.value = camera.near; cu.far.value = camera.far;
      cu.focus.value = P.focus; cu.range.value = P.focusRange; cu.maxCoc.value = P.maxCoc;
      this.pass(this.cocQ, this.rtH1);
      const bu = this.blurQ.material.uniforms; const hw = this.W >> 1, hh = this.H >> 1, qw = this.W >> 2, qh = this.H >> 2;
      bu.tIn.value = this.rtH1.texture; bu.dir.value.set(1.4 / hw, 0); this.pass(this.blurQ, this.rtH2);
      bu.tIn.value = this.rtH2.texture; bu.dir.value.set(0, 1.4 / hh); this.pass(this.blurQ, this.rtH1);
      bu.tIn.value = this.rtH1.texture; bu.dir.value.set(2.0 / qw, 0); this.pass(this.blurQ, this.rtQ1);
      bu.tIn.value = this.rtQ1.texture; bu.dir.value.set(0, 2.0 / qh); this.pass(this.blurQ, this.rtQ2);
      const du = this.dofQ.material.uniforms;
      du.tSharp.value = this.rtScene.texture; du.tDepth.value = this.rtScene.depthTexture; du.tB1.value = this.rtH1.texture; du.tB2.value = this.rtQ2.texture;
      du.near.value = camera.near; du.far.value = camera.far; du.focus.value = P.focus; du.range.value = P.focusRange; du.maxCoc.value = P.maxCoc;
      this.pass(this.dofQ, this.rtA);
      src = this.rtA;
    } else {
      // copy MSAA scene into a plain target for bloom
      const du = this.dofQ.material.uniforms; du.tSharp.value = this.rtScene.texture; du.tDepth.value = this.rtScene.depthTexture;
      du.tB1.value = this.rtScene.texture; du.tB2.value = this.rtScene.texture; du.maxCoc.value = 0;
      this.pass(this.dofQ, this.rtA); src = this.rtA;
    }
    if (P.bloom > 0.001) {
      this.bloom.strength = P.bloom; this.bloom.radius = P.bloomRadius; this.bloom.threshold = P.bloomThreshold;
      this.bloom.render(r, null, src, 0, false);
    }
    const fu = this.finalQ.material.uniforms;
    fu.tIn.value = src.texture; fu.time.value = time; fu.exposure.value = P.exposure; fu.vignette.value = P.vignette; fu.grain.value = P.grain; fu.ca.value = P.ca;
    fu.zoom.value = P.zoom; fu.zoomCenter.value.set(P.zoomCenter[0], P.zoomCenter[1]); fu.fade.value = P.fade; fu.flash.value = P.flash;
    fu.lift.value.set(...P.lift); fu.saturation.value = P.saturation; fu.tint.value.set(...P.tint);
    this.pass(this.finalQ, null);
  }
}
