// The Stage: one renderer + scene + camera + cinematic post pipeline.
// Pipeline: scene -> MSAA HDR target (with depth) -> bloom -> final composite shader
// (depth-of-field / rack focus, chromatic aberration, glitch, grade, grain, vignette, paint texture, flash/fade).
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { painted } from "./textures";

export type Post = {
  exposure: number; bloom: number; bloomRadius: number; bloomThreshold: number;
  focus: number; aperture: number; // focus distance (m) + blur strength (px at infinity-ish)
  ca: number; grain: number; vignette: number; glitch: number; glitchSeed: number; scan: number;
  flash: number; fade: number; saturation: number; contrast: number; paint: number;
  lift: THREE.Color; gain: THREE.Color; tint: THREE.Color; tintAmt: number;
  shake: number; // informational, applied by camera rig
  bars: number; // cinematic bars (0..1) for flashback / memory moments
};
export const defaultPost = (): Post => ({
  exposure: 1.0, bloom: 0.9, bloomRadius: 0.55, bloomThreshold: 0.62,
  focus: 6, aperture: 0, ca: 0.0015, grain: 0.05, vignette: 0.55, glitch: 0, glitchSeed: 0, scan: 0,
  flash: 0, fade: 0, saturation: 1.08, contrast: 1.08, paint: 0.09,
  lift: new THREE.Color(0.01, 0.0, 0.035), gain: new THREE.Color(1.0, 0.98, 1.06), tint: new THREE.Color(0.4, 0.3, 1.0), tintAmt: 0,
  shake: 0, bars: 0,
});

const FINAL = {
  uniforms: {
    tColor: { value: null }, tDepth: { value: null }, tPaint: { value: null },
    res: { value: new THREE.Vector2() }, srcRes: { value: new THREE.Vector2() }, near: { value: 0.1 }, far: { value: 500 }, time: { value: 0 },
    focus: { value: 6 }, aperture: { value: 0 }, ca: { value: 0 }, grain: { value: 0 }, vignette: { value: 0 },
    glitch: { value: 0 }, gseed: { value: 0 }, scan: { value: 0 }, flash: { value: 0 }, fade: { value: 0 },
    saturation: { value: 1 }, contrast: { value: 1 }, paint: { value: 0 }, exposure: { value: 1 },
    lift: { value: new THREE.Color() }, gain: { value: new THREE.Color(1, 1, 1) }, tint: { value: new THREE.Color() }, tintAmt: { value: 0 }, bars: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    precision highp float;
    #include <packing>
    uniform sampler2D tColor, tDepth, tPaint; uniform vec2 res, srcRes; uniform float near, far, time, focus, aperture, ca, grain, vignette,
      glitch, gseed, scan, flash, fade, saturation, contrast, paint, exposure, tintAmt, bars; uniform vec3 lift, gain, tint;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x; return -perspectiveDepthToViewZ(d, near, far); }
    float coc(float z){ return clamp(abs(z - focus) / max(z, 0.01) * aperture * (srcRes.y / 1920.0), 0.0, 22.0); }
    void main(){
      vec2 uv = vUv;
      // --- digital glitch: block displacement + line tears
      if (glitch > 0.001) {
        float row = floor(uv.y * 48.0); float r = h(vec2(row, floor(gseed)));
        float on = step(1.0 - glitch * 0.6, r);
        uv.x += (h(vec2(row, gseed + 1.7)) - 0.5) * 0.25 * glitch * on;
        float band = step(0.985 - glitch * 0.05, h(vec2(floor(uv.y * 220.0), floor(gseed * 3.0))));
        uv.x += band * 0.02 * glitch;
      }
      // --- depth of field (gather, golden-angle spiral)
      vec3 col = texture2D(tColor, uv).rgb;
      if (aperture > 0.0) {
        float c0 = coc(viewZ(uv));
        if (c0 > 0.6) {
          vec3 acc = col; float wsum = 1.0;
          for (int i = 1; i < 18; i++) {
            float fi = float(i); float rr = sqrt(fi / 17.0) * c0; float a = fi * 2.39996;
            vec2 o = vec2(cos(a), sin(a)) * rr / srcRes;
            float cs = coc(viewZ(uv + o));
            float w = clamp(cs / max(rr, 0.5), 0.0, 1.0) + 0.15; // prefer samples that are themselves blurry (reduces halo)
            acc += texture2D(tColor, uv + o).rgb * w; wsum += w;
          }
          col = acc / wsum;
        }
      }
      // --- chromatic aberration (radial) + extra split while glitching
      vec2 d = (uv - 0.5); float k = ca + glitch * 0.012;
      col.r = mix(col.r, texture2D(tColor, uv + d * k * 2.0).r, 0.85);
      col.b = mix(col.b, texture2D(tColor, uv - d * k * 2.0).b, 0.85);
      col *= exposure;
      // --- ACES-ish filmic tonemap
      col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
      // --- grade: lift / gain / saturation / contrast / tint
      col = col * gain + lift * (1.0 - col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.5) * contrast + 0.5;
      col = mix(col, col * tint * 1.6, tintAmt);
      // --- painterly canvas: brush texture modulates value, strongest in mid-tones
      vec3 p = texture2D(tPaint, vUv * vec2(1.6, 2.8)).rgb;
      float mid = 4.0 * l * (1.0 - l);
      col *= 1.0 + (p.r - 0.5) * paint * (0.6 + mid);
      // --- scanlines / vignette / grain
      col *= 1.0 - scan * (0.5 + 0.5 * sin(vUv.y * res.y * 1.4 + time * 30.0));
      float v = smoothstep(0.95, 0.25, length((vUv - 0.5) * vec2(0.9, 1.15)));
      col *= mix(1.0, v, vignette);
      col += (h(vUv * res + fract(time * 7.13) * 100.0) - 0.5) * grain;
      col = mix(col, vec3(1.0), flash);
      col = mix(col, vec3(0.0), fade);
      float bar = step(vUv.y, bars * 0.085) + step(1.0 - bars * 0.085, vUv.y);
      col = mix(col, vec3(0.0), bar);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export class Stage {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera;
  post: Post = defaultPost(); W: number; H: number;
  /** 2D HUD layer composited over the film (drone scanners, terminals, titles). Cleared every frame. */
  hud!: CanvasRenderingContext2D;
  private rt: THREE.WebGLRenderTarget; private bloom: UnrealBloomPass; private quad: FullScreenQuad; private mat: THREE.ShaderMaterial;
  /** per-frame hooks (rain, particles, holograms) */
  tickers: ((t: number) => void)[] = [];
  /** shader materials that need the global clock */
  timed: { uniforms: { time: { value: number } } }[] = [];

  /** quality: internal 3D render scale (HUD/subtitles stay full-res), MSAA samples, shadows */
  Q = { scale: 1, samples: 4, shadows: true };
  constructor(canvas: HTMLCanvasElement, W = 1080, H = 1920, q: Partial<{ scale: number; samples: number; shadows: boolean }> = {}) {
    this.W = W; this.H = H; Object.assign(this.Q, q);
    const RW = Math.round(W * this.Q.scale), RH = Math.round(H * this.Q.scale);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1); this.renderer.setSize(W, H, false);
    this.renderer.toneMapping = THREE.NoToneMapping; // tonemapped in the final pass
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.Q.shadows; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 600);
    this.camera.filmGauge = 35;
    const depthTexture = new THREE.DepthTexture(RW, RH); depthTexture.type = THREE.FloatType;
    this.rt = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: this.Q.samples, depthTexture, colorSpace: THREE.LinearSRGBColorSpace });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(RW / 2, RH / 2), 0.9, 0.55, 0.62);
    this.mat = new THREE.ShaderMaterial({ ...FINAL, uniforms: THREE.UniformsUtils.clone(FINAL.uniforms), depthTest: false, depthWrite: false });
    this.mat.uniforms.tPaint.value = painted("canvas-grain", "#808080", ["#ffffff", "#000000", "#9a9a9a", "#606060"], { size: 512, n: 2600, len: 34, alpha: 0.18, seed: 3 });
    this.quad = new FullScreenQuad(this.mat);
  }

  /** set lens in mm (35mm-equivalent on the long side) */
  lens(mm: number) { this.camera.setFocalLength(mm); }

  render(t: number) {
    for (const f of this.tickers) f(t);
    for (const m of this.timed) m.uniforms.time.value = t;
    const P = this.post, r = this.renderer, u = this.mat.uniforms;
    this.camera.updateMatrixWorld();
    r.setRenderTarget(this.rt); r.clear(); r.render(this.scene, this.camera);
    if (P.bloom > 0) {
      this.bloom.strength = P.bloom; this.bloom.radius = P.bloomRadius; this.bloom.threshold = P.bloomThreshold;
      this.bloom.render(r, null as any, this.rt, 0, false);
    }
    r.setRenderTarget(null);
    u.tColor.value = this.rt.texture; u.tDepth.value = this.rt.depthTexture;
    u.res.value.set(this.W, this.H); u.srcRes.value.set(this.rt.width, this.rt.height); u.near.value = this.camera.near; u.far.value = this.camera.far; u.time.value = t;
    for (const k of ["focus", "aperture", "ca", "grain", "vignette", "glitch", "scan", "flash", "fade", "saturation", "contrast", "paint", "exposure", "tintAmt", "bars"] as const) u[k].value = (P as any)[k];
    u.gseed.value = P.glitchSeed; u.lift.value.copy(P.lift); u.gain.value.copy(P.gain); u.tint.value.copy(P.tint);
    this.quad.render(r);
  }
}
