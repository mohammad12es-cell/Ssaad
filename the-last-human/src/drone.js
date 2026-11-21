// E.V.E. surveillance drone — original design. Central iris eye, four ducted rotors,
// cyan scanning cone that turns red on detection.
import * as THREE from "three";
import { GLSL_NOISE } from "./util.js";

export function makeDrone(scene) {
  const D = {};
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const gun = new THREE.MeshPhysicalMaterial({ color: 0x1a1d26, metalness: 0.85, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x07080c, metalness: 0.6, roughness: 0.35, clearcoat: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb8c2d8, metalness: 1, roughness: 0.15 });
  const mesh = (geo, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scl); parent.add(m); return m; };

  const eyeU = { uTime: { value: 0 }, uRed: { value: 0 }, uGlitch: { value: 0 }, uBright: { value: 1 } };
  D.eyeU = eyeU;
  const statusMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.8, 3.4) });
  D.statusMat = statusMat;

  // core hull
  mesh(new THREE.SphereGeometry(0.32, 48, 32), gun, body, [0, 0, 0], [0, 0, 0], [1, 0.74, 1.05]);
  mesh(new THREE.TorusGeometry(0.325, 0.022, 10, 64), chrome, body, [0, -0.02, 0], [Math.PI / 2, 0, 0], [1, 1.05, 1]);
  mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), dark, body, [0, 0.19, -0.04], [0, 0, 0], [1, 0.55, 1.1]);
  for (let i = 0; i < 6; i++) { // hull panel ribs
    const a = (i / 6) * Math.PI * 2 + 0.26;
    mesh(new THREE.BoxGeometry(0.012, 0.16, 0.06), dark, body, [Math.sin(a) * 0.3, 0.1, Math.cos(a) * 0.31], [0, a, 0]);
  }
  // eye assembly (front +z)
  const eye = new THREE.Group(); eye.position.set(0, -0.01, 0.3); body.add(eye); D.eye = eye;
  mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.12, 48), dark, eye, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.TorusGeometry(0.185, 0.018, 12, 64), chrome, eye, [0, 0, 0.068]);
  mesh(new THREE.TorusGeometry(0.155, 0.008, 8, 64), chrome, eye, [0, 0, 0.07]);
  const iris = mesh(new THREE.CircleGeometry(0.152, 96), new THREE.ShaderMaterial({
    uniforms: eyeU,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `${GLSL_NOISE}
      uniform float uTime, uRed, uGlitch, uBright; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * 2.0;
        float fr = floor(uTime * 30.0);
        float gl = uGlitch * step(0.45, h11(fr * 1.3));
        p.x += gl * (h11(floor(p.y * 14.0) + fr) - 0.5) * 0.25;
        float r = length(p), a = atan(p.y, p.x);
        vec3 cyan = vec3(0.25, 2.6, 3.4), red = vec3(4.0, 0.25, 0.3);
        vec3 C = mix(cyan, red, uRed);
        vec3 col = vec3(0.004, 0.006, 0.01);
        // pupil core
        col += C * 1.6 * exp(-r * r / 0.012) + vec3(1.0) * exp(-r * r / 0.002) * 2.0;
        // inner iris ring with rotating scan segments
        float segs = step(0.5, fract(a / 6.2831 * 24.0 + uTime * (0.6 + uRed * 2.5)));
        float ring1 = smoothstep(0.2, 0.22, r) * (1.0 - smoothstep(0.42, 0.44, r));
        col += C * ring1 * (0.18 + 0.55 * segs) * (0.8 + 0.2 * sin(r * 80.0));
        // aperture blades (dark wedges)
        float blade = step(0.86, fract(a / 6.2831 * 8.0 + 0.04 * sin(uTime))) * smoothstep(0.44, 0.5, r) * (1.0 - smoothstep(0.7, 0.72, r));
        float ring2 = smoothstep(0.5, 0.52, r) * (1.0 - smoothstep(0.7, 0.72, r));
        col += C * ring2 * 0.22 * (1.0 - blade);
        // tick marks
        float ticks = step(0.8, fract(a / 6.2831 * 60.0)) * smoothstep(0.76, 0.78, r) * (1.0 - smoothstep(0.84, 0.86, r));
        col += C * ticks * 0.9;
        // bright outer ring
        col += C * exp(-pow((r - 0.93) / 0.025, 2.0)) * 1.4;
        // sweeping scanner arm
        float sweep = pow(max(0.0, cos(a - uTime * (2.0 + uRed * 6.0))), 40.0) * smoothstep(0.2, 0.3, r) * (1.0 - smoothstep(0.85, 0.9, r));
        col += C * sweep * 1.2;
        // glitch: dropouts + RGB split noise
        float drop = step(1.0 - uGlitch * 0.5, h21(floor(p * vec2(6.0, 18.0)) + fr));
        col *= 1.0 - drop * 0.9;
        col += vec3(1.0, 0.1, 0.2) * uGlitch * step(0.97, h21(floor(p * 40.0) + fr)) * 3.0;
        col *= uBright * (1.0 - smoothstep(0.98, 1.0, r));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), eye, [0, 0, 0.064]);
  D.iris = iris;
  // glass lens dome
  mesh(new THREE.SphereGeometry(0.16, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.32), new THREE.MeshPhysicalMaterial({ color: 0x0a1018, transparent: true, opacity: 0.18, roughness: 0.02, clearcoat: 1, metalness: 0.2 }), eye, [0, 0, -0.04], [Math.PI / 2, 0, 0]);
  const fillL = new THREE.PointLight(0x7fa8ff, 0, 3, 1.5); root.add(fillL); fillL.position.set(-0.6, 0.5, 0.9); D.fill = fillL;

  // arms + ducted rotors
  D.rotors = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const arm = new THREE.Group(); body.add(arm);
    const end = new THREE.Vector3(sx * 0.58, 0.04, sz * 0.4);
    const len = end.length();
    const a = mesh(new THREE.BoxGeometry(0.06, 0.04, len), gun, arm, [end.x / 2, 0.02, end.z / 2]); a.lookAt(end.x, 0.02, end.z);
    const duct = new THREE.Group(); duct.position.copy(end); arm.add(duct);
    mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 40, 1, true), Object.assign(dark.clone(), { side: THREE.DoubleSide }), duct);
    mesh(new THREE.TorusGeometry(0.19, 0.02, 8, 40), chrome, duct, [0, 0.035, 0], [Math.PI / 2, 0, 0]);
    mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff }), duct, [0, -0.036, 0], [Math.PI / 2, 0, 0]).material = statusMat;
    const hub = new THREE.Group(); duct.add(hub);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), chrome, hub);
    for (let b = 0; b < 3; b++) mesh(new THREE.BoxGeometry(0.34, 0.006, 0.04), dark, hub, [0, 0, 0], [0.25, (b / 3) * Math.PI, 0]);
    mesh(new THREE.CircleGeometry(0.175, 32), new THREE.MeshBasicMaterial({ color: 0x8090a0, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }), duct, [0, 0.005, 0], [-Math.PI / 2, 0, 0]);
    D.rotors.push(hub);
  }
  // antenna + sensors
  mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.28, 6), chrome, body, [0.08, 0.36, -0.12]);
  const warn = mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.2, 0.3) }), body, [0.08, 0.5, -0.12]);
  D.warn = warn;
  mesh(new THREE.SphereGeometry(0.07, 20, 12), dark, body, [0, -0.24, 0.05]);
  mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 24), statusMat, body, [0, -0.25, 0.05], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.018, 10, 8), statusMat, body, [s * 0.22, 0.02, 0.24]);

  // scan beam (cone, apex at the eye) + matching spot light
  const beamGeo = new THREE.ConeGeometry(1, 1, 64, 1, true); beamGeo.translate(0, -0.5, 0); beamGeo.rotateX(-Math.PI / 2);
  const beamU = { uTime: eyeU.uTime, uRed: eyeU.uRed, uAmt: { value: 0 }, uGlitch: eyeU.uGlitch };
  const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
    uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `${GLSL_NOISE} uniform float uTime, uRed, uAmt, uGlitch; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){
        float d = vP.z;                 // 0 at apex .. 1 at the base
        float edge = pow(1.0 - abs(dot(vN, vV)), 1.5);
        float bands = 0.55 + 0.45 * sin(d * 40.0 - uTime * 14.0);
        float sweep = smoothstep(0.0, 0.06, abs(fract(d - uTime * 0.9) - 0.5));
        vec3 C = mix(vec3(0.2, 1.8, 2.4), vec3(3.0, 0.15, 0.2), uRed);
        float a = (0.05 + 0.35 * edge) * bands * (0.6 + 0.4 * sweep) * smoothstep(0.0, 0.15, d) * (0.6 + 0.4 * d);
        a *= 1.0 - uGlitch * step(0.5, h11(floor(uTime * 30.0) * 3.3));
        gl_FragColor = vec4(C * a * uAmt * 0.55, 1.0);
      }`,
  }));
  scene.add(beam); D.beam = beam; D.beamU = beamU;
  const spot = new THREE.SpotLight(0x33e6ff, 0, 30, 0.35, 0.5, 1.2); scene.add(spot); scene.add(spot.target); D.spot = spot;

  D.root = root; D.body = body;
  const cyan = new THREE.Color(0x33e6ff), red = new THREE.Color(0xff1a2a), tmp = new THREE.Color(), eyeW = new THREE.Vector3();
  D.update = ({ t, pos, yaw = 0, pitch = 0, roll = 0, red: rd = 0, glitch = 0, beamAmt = 0, target = null, beamR = 0.9, bright = 1 }) => {
    root.position.copy(pos);
    root.position.y += Math.sin(t * 2.1) * 0.035; root.position.x += Math.sin(t * 1.3) * 0.02;
    body.rotation.set(pitch + Math.sin(t * 1.7) * 0.02, yaw, roll + Math.sin(t * 1.1) * 0.025);
    eyeU.uTime.value = t; eyeU.uRed.value = rd; eyeU.uGlitch.value = glitch; eyeU.uBright.value = bright;
    for (const [i, h] of D.rotors.entries()) h.rotation.y = t * (60 + i * 3);
    statusMat.color.copy(tmp.copy(cyan).lerp(red, rd).multiplyScalar(3));
    D.warn.visible = Math.sin(t * 9) > 0 || rd < 0.5;
    root.updateMatrixWorld(true);
    eye.getWorldPosition(eyeW);
    beamU.uAmt.value = beamAmt;
    beam.visible = beamAmt > 0.001 && !!target;
    if (target) {
      const L = eyeW.distanceTo(target);
      beam.position.copy(eyeW); beam.lookAt(target); beam.scale.set(beamR, beamR, L);
      spot.position.copy(eyeW); spot.target.position.copy(target); spot.target.updateMatrixWorld();
      spot.color.copy(tmp.copy(cyan).lerp(red, rd)); spot.intensity = beamAmt * 60; spot.distance = L * 2;
      spot.angle = Math.atan(beamR / L) * 1.25;
    } else spot.intensity = 0;
    return eyeW;
  };
  return D;
}
