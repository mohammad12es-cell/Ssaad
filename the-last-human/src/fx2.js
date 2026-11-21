// v2 visual systems: noir rim light for characters, E.V.E. sensor vision, 2D overlay layer.
import * as THREE from "three";

// ---------- noir rim light (fresnel emission injected into standard/physical materials) ----------
export const RIM = { uRimCol: { value: new THREE.Color(0.25, 1.6, 2.0) }, uRimAmt: { value: 1.0 }, uRimPow: { value: 3.2 }, uRimDir: { value: new THREE.Vector3(0.5, 0.4, 0).normalize() } };
export function applyRim(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (!m || !m.isMeshStandardMaterial || m.userData.rim) return;
    m.userData.rim = true;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, RIM);
      sh.fragmentShader = "uniform vec3 uRimCol; uniform float uRimAmt; uniform float uRimPow; uniform vec3 uRimDir;\n" +
        sh.fragmentShader.replace("#include <opaque_fragment>", `
          { vec3 nn = normalize(normal); float fr = pow(1.0 - clamp(dot(nn, normalize(vViewPosition)), 0.0, 1.0), uRimPow);
            float side = 0.35 + 0.65 * max(dot(nn, uRimDir), 0.0);
            outgoingLight += uRimCol * uRimAmt * fr * side; }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => "rim-v2";
    m.needsUpdate = true;
  });
}

// ---------- E.V.E. sensor vision ----------
const sensorVS = /* glsl */ `
  #include <common>
  varying vec3 vN; varying vec3 vV; varying vec3 vWp;
  void main(){
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    vN = normalize(transformedNormal); vV = -mvPosition.xyz;
    vec4 wp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      wp = instanceMatrix * wp;
    #endif
    vWp = (modelMatrix * wp).xyz;
  }`;
export function makeSensor() {
  const U = { uTime: { value: 0 }, uKaelRed: { value: 0 }, uScanY: { value: 0 } };
  const env = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: sensorVS,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vWp;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float d = length(vV);
        float g = max(step(0.95, fract(vWp.y / 3.6)), step(0.965, fract((vWp.x + vWp.z) / 3.0)));
        vec3 c = vec3(0.06, 0.35, 0.45) * (0.05 + 0.8 * f + 0.25 * g) * exp(-d * 0.012);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const heat = (kael) => new THREE.ShaderMaterial({
    uniforms: U, vertexShader: sensorVS,
    fragmentShader: /* glsl */ `uniform float uTime; uniform float uKaelRed; varying vec3 vN; varying vec3 vV; varying vec3 vWp;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
        vec3 body = mix(vec3(0.16, 0.3, 0.42), vec3(0.6, 1.5, 1.8), f) * (0.4 + 1.1 * f);
        ${kael ? "body = mix(body, mix(vec3(0.45, 0.04, 0.06), vec3(2.6, 0.25, 0.3), f) * (0.45 + 1.1 * f), uKaelRed);" : ""}
        gl_FragColor = vec4(body * exp(-length(vV) * 0.02), 1.0);
      }`,
  });
  const ground = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: sensorVS,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vWp;
      void main(){
        vec2 g = abs(fract(vWp.xz / 1.2) - 0.5);
        float l = smoothstep(0.46, 0.5, max(g.x, g.y));
        float ring = smoothstep(0.9, 1.0, fract(length(vWp.xz - vec2(0.6, 0.0)) * 0.2 - uTime * 0.5));
        gl_FragColor = vec4(vec3(0.05, 0.3, 0.4) * (0.08 + l * 0.6) * exp(-length(vV) * 0.03), 1.0);
      }`,
  });
  const mats = { env, human: heat(false), kael: heat(true), ground };
  const entries = [];
  return {
    U, mats,
    register(obj, cat) { obj.traverse((o) => { if ((o.isMesh || o.isLine || o.isPoints || o.isInstancedMesh) && !o.userData.sensorCat) o.userData.sensorCat = cat; }); },
    collect(scene) { scene.traverse((o) => { if (o.isMesh || o.isLine || o.isPoints) entries.push(o); }); },
    on() {
      for (const o of entries) {
        const cat = o.userData.sensorCat || (o.isMesh ? "env" : "hide");
        o.userData._vis = o.visible; o.userData._mat = o.material;
        if (cat === "hide") o.visible = false;
        else if (cat === "keep") {}
        else o.material = mats[cat];
      }
    },
    off() { for (const o of entries) { if ("_mat" in o.userData) { o.material = o.userData._mat; o.visible = o.userData._vis; delete o.userData._mat; } } },
  };
}

// ---------- 2D overlay (counters, sensor tags, tagline) composited after post ----------
export function makeOverlay(W, H) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace;
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { map: { value: tex } }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = t; }`,
  }));
  quad.frustumCulled = false; scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let dirty = false;
  return {
    g, W, H,
    clear() { g.clearRect(0, 0, W, H); dirty = false; },
    mark() { dirty = true; },
    render(renderer) {
      if (!dirty) return;
      tex.needsUpdate = true;
      const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(null);
      renderer.render(scene, cam); renderer.autoClear = ac;
    },
  };
}
export function txt(g, s, x, y, font, col, blur = 0, align = "left", alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.font = font; g.textAlign = align; g.textBaseline = "middle";
  if (blur) { g.shadowColor = col; g.shadowBlur = blur; }
  g.fillStyle = col; g.fillText(s, x, y); g.restore();
}
