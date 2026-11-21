// Post-processing chain: scene -> bloom -> ACES tone map -> cinematic grade
// (blue-lifted blacks, vignette, chromatic aberration, film grain, digital glitch, fade).
import * as THREE from "three";
import { EffectComposer } from "./vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "./vendor/jsm/postprocessing/ShaderPass.js";
import { GLSL_NOISE } from "./util.js";

export function buildPost(renderer, scene, camera, W, H) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.6, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) },
      uGlitch: { value: 0 }, uCA: { value: 0.0015 }, uFade: { value: 1 }, uVig: { value: 0.9 }, uGrain: { value: 0.05 },
      uRedTint: { value: 0 }, uFlash: { value: 0 }, uSeed: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `${GLSL_NOISE}
      uniform sampler2D tDiffuse; uniform float uTime, uGlitch, uCA, uFade, uVig, uGrain, uRedTint, uFlash, uSeed; uniform vec2 uRes;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        float fr = floor(uTime * 30.0) + uSeed;
        // block / line glitch
        if (uGlitch > 0.0) {
          float row = floor(uv.y * mix(12.0, 60.0, h11(fr)));
          float on = step(1.0 - uGlitch * 0.6, h11(row * 3.1 + fr));
          uv.x += on * (h11(row + fr * 1.7) - 0.5) * 0.18 * uGlitch;
          vec2 blk = floor(uv * vec2(8.0, 14.0));
          float b = step(1.0 - uGlitch * 0.25, h21(blk + fr));
          uv += b * (vec2(h21(blk+fr+1.), h21(blk+fr+2.)) - 0.5) * 0.06;
        }
        vec2 c = uv - 0.5;
        float ca = uCA + uGlitch * 0.012;
        vec3 col;
        col.r = texture2D(tDiffuse, uv + c * ca * 2.0 + vec2(uGlitch*0.006, 0.)).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - c * ca * 2.0 - vec2(uGlitch*0.006, 0.)).b;
        // grade: cool shadows, slightly crushed blacks, keep neon highlights
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, col * vec3(0.92, 1.0, 1.08), 0.5);
        col += vec3(0.004, 0.008, 0.022) * (1.0 - smoothstep(0.0, 0.25, l));
        col = mix(vec3(l), col, 1.08);
        col = mix(col, vec3(l * 1.25, l * 0.18, l * 0.22), uRedTint);
        // vignette (taller frame: elliptical)
        vec2 vc = (vUv - 0.5) * vec2(1.0, 0.75);
        col *= mix(1.0, smoothstep(0.85, 0.15, length(vc) * 1.25), uVig);
        // grain + glitch scanlines
        float gr = h21(vUv * uRes + fr * 13.7) - 0.5;
        col += gr * uGrain * (0.4 + 0.6 * (1.0 - l));
        col *= 1.0 - uGlitch * 0.25 * step(0.5, fract(vUv.y * uRes.y * 0.25));
        col += uFlash;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0) * uFade, 1.0);
      }`,
  });
  composer.addPass(grade);
  return { composer, renderPass, bloom, grade: grade.uniforms };
}
