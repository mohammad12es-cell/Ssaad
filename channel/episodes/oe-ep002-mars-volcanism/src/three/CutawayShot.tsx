import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {atmosphereMaterial, marsTextures} from './mars';
import {NOISE} from './glsl';
import {cl, dotTexture} from './common';

const ss = (x: number) => x * x * (3 - 2 * x);
const A = Math.PI / 4; // wedge from phi = A to A + π/2, opening toward +z
const dirOf = (phi: number) => new THREE.Vector3(-Math.cos(phi), 0, Math.sin(phi));
const LAT0 = (40.5 * Math.PI) / 180;
const SUN = new THREE.Vector3(-0.6, 0.5, 0.65).normalize();

/** Cut-face shader: exaggerated crust, convecting mantle, core; optional magma chamber + gas pathways. */
const faceMaterial = (chamber: boolean) =>
  new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {uTime: {value: 0}, uReveal: {value: 0}, uPaths: {value: 0}, uChamber: {value: chamber ? 1 : 0}, uLat0: {value: LAT0}},
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `${NOISE}
      uniform float uTime, uReveal, uPaths, uChamber, uLat0; varying vec2 vP;
      void main(){
        float r = length(vP); float lat = atan(vP.y, vP.x);
        vec3 col;
        float n = fbm(vec3(vP*5.0, uTime*0.08));
        if (r > 0.88) {               // crust (thickness exaggerated)
          float strata = sin(r*260.0 + n*6.0)*0.5+0.5;
          col = mix(vec3(0.36,0.2,0.13), vec3(0.55,0.33,0.2), strata*0.6 + n*0.3);
          col *= 0.75 + 0.35*smoothstep(0.88, 1.0, r);
        } else if (r > 0.5) {          // mantle with slow convection
          float c = fbm(vec3(vP*3.0 + vec2(sin(uTime*0.1), cos(uTime*0.13))*0.3, uTime*0.05));
          col = mix(vec3(0.22,0.07,0.04), vec3(0.55,0.17,0.06), smoothstep(-0.2, 0.6, c) * (1.0 - (r-0.5)/0.38*0.5));
        } else {                        // core
          col = mix(vec3(0.95,0.55,0.22), vec3(0.55,0.28,0.12), r/0.5) * (0.85 + 0.15*n);
        }
        col += vec3(0.9,0.6,0.35) * exp(-pow((r-0.88)/0.003,2.0))*0.35;
        col += vec3(0.9,0.5,0.25) * exp(-pow((r-0.5)/0.004,2.0))*0.35;
        if (uChamber > 0.5) {
          float dr = r - 0.935; float dt = (lat - uLat0) * r;
          float e = (dr*dr)/(0.022*0.022) + (dt*dt)/(0.075*0.075);
          float m = fbm(vec3(dr*60.0, dt*30.0, uTime*0.4));
          float body = smoothstep(1.25, 0.75, e + m*0.4);
          vec3 magma = mix(vec3(1.0,0.35,0.06), vec3(1.0,0.78,0.35), smoothstep(0.2, 0.9, 1.0 - e + m*0.3));
          col = mix(col, magma, body * uReveal);
          col += vec3(1.0,0.4,0.1) * exp(-e*0.25) * 0.35 * uReveal;
          // gas pathways (dashed, moving outward)
          for (int k = -1; k <= 1; k++) {
            float la = uLat0 + float(k)*0.035 + sin(r*120.0)*0.002*float(k);
            float d = abs(lat - la) * r;
            float on = step(0.955, r) * step(r, 1.0);
            float dash = step(0.45, fract(r*140.0 - uTime*1.6));
            col += vec3(1.0,0.85,0.6) * smoothstep(0.0022, 0.0008, d) * dash * on * uPaths;
          }
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

export const labelTexture = (text: string, color = "#f2ead8") => {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d')!;
  g.font = '500 44px "OE Mono", monospace';
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 48);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const Scene: React.FC<{revealAt: number; pushAt: number; dur: number}> = ({revealAt, pushAt, dur}) => {
  const t = useCurrentFrame() / 30;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tex = marsTextures();
  const map = useMemo(() => {
    const m = tex.map.clone();
    m.wrapS = THREE.RepeatWrapping;
    m.repeat.x = 0.75;
    m.offset.x = (A + Math.PI / 2) / (Math.PI * 2);
    m.needsUpdate = true;
    return m;
  }, [tex]);
  const faceA = useMemo(() => faceMaterial(true), []);
  const faceB = useMemo(() => faceMaterial(false), []);
  const atmo = useMemo(() => atmosphereMaterial(SUN), []);
  const label = useMemo(() => labelTexture('ALBA MONS'), []);
  const half = useMemo(() => new THREE.CircleGeometry(1, 160, -Math.PI / 2, Math.PI), []);

  const tilt = 0.22;
  const groupQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0));
  const dA = dirOf(A);
  const chamberW = dA.clone().multiplyScalar(0.935 * Math.cos(LAT0)).add(new THREE.Vector3(0, 0.935 * Math.sin(LAT0), 0)).applyQuaternion(groupQ);
  const surfW = dA.clone().multiplyScalar(Math.cos(LAT0)).add(new THREE.Vector3(0, Math.sin(LAT0), 0)).applyQuaternion(groupQ);
  const nA = new THREE.Vector3(0, 1, 0).cross(dA).normalize().applyQuaternion(groupQ);

  faceA.uniforms.uTime.value = t;
  faceB.uniforms.uTime.value = t;
  faceA.uniforms.uReveal.value = cl((t - revealAt) / 1.2);
  faceA.uniforms.uPaths.value = cl((t - revealAt - 1.0) / 1.0);

  // camera: slow orbit on the wide cutaway, then push toward the chamber
  const orbit = 0.25 - t * 0.03;
  const wide = new THREE.Vector3(Math.sin(orbit) * 3.9, 0.9, Math.cos(orbit) * 3.9);
  const close = chamberW.clone().add(nA.clone().multiplyScalar(0.34)).add(surfW.clone().multiplyScalar(0.12));
  const k = ss(cl((t - pushAt) / (dur - pushAt - 0.2)));
  camera.position.copy(wide.clone().lerp(close, k));
  camera.lookAt(new THREE.Vector3(0, 0.1, 0).lerp(chamberW, Math.min(1, k * 1.4)));
  camera.fov = 36;
  camera.updateProjectionMatrix();

  const lblOpacity = cl((t - 0.6) / 0.6) * (1 - k);
  return (
    <>
      <color attach="background" args={['#030304']} />
      <ambientLight intensity={0.1} />
      <directionalLight position={SUN.clone().multiplyScalar(10)} intensity={3.2} color="#fff0de" />
      <group quaternion={groupQ}>
        <mesh>
          <sphereGeometry args={[1, 160, 120, A + Math.PI / 2, Math.PI * 1.5]} />
          <meshStandardMaterial map={map} bumpMap={tex.bump} bumpScale={2} roughness={0.95} side={THREE.FrontSide} />
        </mesh>
        <mesh geometry={half} material={faceA} rotation={[0, Math.PI + A, 0]} />
        <mesh geometry={half} material={faceB} rotation={[0, Math.PI + A + Math.PI / 2, 0]} />
      </group>
      <mesh material={atmo} scale={1.03}>
        <sphereGeometry args={[1, 96, 64]} />
      </mesh>
      {/* Alba Mons marker */}
      <sprite position={surfW.clone().multiplyScalar(1.01)} scale={0.07}>
        <spriteMaterial map={dotTexture()} color="#fff2dc" transparent opacity={lblOpacity} depthTest={false} />
      </sprite>
      <sprite position={surfW.clone().multiplyScalar(1.2).add(new THREE.Vector3(-0.1, 0.06, 0))} scale={[0.6, 0.11, 1]}>
        <spriteMaterial map={label} transparent opacity={lblOpacity} depthTest={false} />
      </sprite>
    </>
  );
};

export const CutawayShot: React.FC<{revealAt: number; pushAt: number; dur: number}> = (p) => (
  <ThreeCanvas width={1080} height={1920} camera={{fov: 36, near: 0.01, far: 100}} gl={{antialias: true}}>
    <Scene {...p} />
  </ThreeCanvas>
);
