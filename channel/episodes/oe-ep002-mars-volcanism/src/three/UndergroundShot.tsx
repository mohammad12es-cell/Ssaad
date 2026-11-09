import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {NOISE} from './glsl';
import {labelTexture} from './CutawayShot';
import {mulberry32} from '../utils';
import {cl} from './common';

const ss = (x: number) => x * x * (3 - 2 * x);
const WATER = new THREE.Vector2(0.2, -9.2);

/** Subsurface cross-section (hypothetical illustration): regolith, basalt, ice-rich layer, warm brine pocket. */
const sectionMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {uTime: {value: 0}, uWater: {value: WATER}},
    vertexShader: `varying vec2 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `${NOISE}
      uniform float uTime; uniform vec2 uWater; varying vec2 vP;
      void main(){
        float y = vP.y; float n = fbm(vec3(vP*1.6, 1.0)); float fine = fbm(vec3(vP*9.0, 3.0));
        vec3 col;
        if (y > 1.2) { col = mix(vec3(0.16,0.09,0.06), vec3(0.03,0.03,0.05), smoothstep(1.2, 3.0, y)); }
        else {
          vec3 regolith = vec3(0.55,0.3,0.18), basalt = vec3(0.17,0.11,0.09), ice = vec3(0.62,0.78,0.92);
          float strata = sin(y*7.0 + n*4.0)*0.5+0.5;
          col = mix(regolith, basalt, smoothstep(0.6, -1.5, -y + n*0.6 - 1.6) );
          col = mix(basalt * (0.8+0.4*strata), col, smoothstep(-1.8, -0.4, y + n*0.5));
          float iceL = smoothstep(-3.6, -4.0, y + n*0.5) * smoothstep(-6.8, -6.3, y + n*0.5);
          vec3 iceCol = ice * (0.62 + 0.18*fine + 0.2*n) * (0.92 + 0.08*sin(vP.x*6.0 + n*8.0));
          col = mix(col, iceCol * 0.8, iceL * 0.8);
          col *= 0.88 + 0.24*fine;
          // warm water pocket
          vec2 d = (vP - uWater) / vec2(2.3, 1.15);
          float e = dot(d, d) + n*0.25;
          float pocket = smoothstep(1.05, 0.9, e);
          float caustic = fbm(vec3(vP*3.0, uTime*0.35)); caustic = pow(1.0 - abs(caustic), 6.0);
          vec3 water = mix(vec3(0.02,0.08,0.12), vec3(0.1,0.3,0.4), smoothstep(-0.6, 1.0, d.y*-0.6 + 0.2)) + vec3(0.35,0.6,0.75)*caustic*0.16;
          col += vec3(0.85,0.35,0.12) * exp(-max(e-1.0, 0.0)*2.2) * 0.22 * (1.0 - pocket);   // warmth around it
          col = mix(col, water, pocket);
          col += vec3(0.6,0.85,1.0) * exp(-pow((e-1.0)/0.04, 2.0)) * 0.25;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

const Scene: React.FC<{dur: number}> = ({dur}) => {
  const t = useCurrentFrame() / 30;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const sec = useMemo(sectionMaterial, []);
  sec.uniforms.uTime.value = t;
  const rocks = useMemo(() => {
    const r = mulberry32(8);
    return Array.from({length: 45}, () => ({p: new THREE.Vector3((r() - 0.5) * 8, 1 - r() * 13, 0.6 + r() * 1.6), s: 0.04 + r() * 0.14, rot: r() * 6, ice: false}));
  }, []);
  const ice = useMemo(() => {
    const r = mulberry32(12);
    return Array.from({length: 40}, () => ({p: new THREE.Vector3((r() - 0.5) * 6, -3.8 - r() * 2.8, 0.4 + r() * 2.2), s: 0.04 + r() * 0.12, rot: r() * 6}));
  }, []);
  const microbes = useMemo(() => {
    const r = mulberry32(21);
    return Array.from({length: 26}, () => ({x: WATER.x + (r() - 0.5) * 3.2, y: WATER.y + (r() - 0.5) * 1.5, a: r() * 6.28, v: 0.3 + r() * 0.5, s: 0.6 + r() * 0.6}));
  }, []);
  const lblIce = useMemo(() => labelTexture('ICE-RICH LAYER', '#bcd6ee'), []);
  const lblWater = useMemo(() => labelTexture('WARM WATER?', '#9fd0ee'), []);

  // camera: continuous descent, then push in on the water pocket
  const d = ss(cl(t / (dur * 0.62)));
  const push = ss(cl((t - dur * 0.5) / (dur * 0.5)));
  camera.position.set(0.15 + Math.sin(t * 0.4) * 0.1, 1.8 - d * 10.6, 7.2 - push * 3.0);
  camera.lookAt(new THREE.Vector3(0.15, 1.2 - d * 10.4, 0));
  camera.fov = 44;
  camera.updateProjectionMatrix();
  const mic = cl((t - dur * 0.55) / 1.2);

  return (
    <>
      <color attach="background" args={['#050404']} />
      <ambientLight intensity={0.35} />
      <pointLight position={[WATER.x, WATER.y, 2.5]} intensity={8} distance={8} color="#7fc4e8" />
      <pointLight position={[0, camera.position.y + 1, 4]} intensity={14} distance={9} color="#ffd7b0" />
      <mesh material={sec} position={[0, -5, 0]}>
        <planeGeometry args={[14, 22, 1, 1]} />
      </mesh>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} rotation={[r.rot, r.rot * 0.7, 0]} scale={r.s}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#2a1a12" roughness={1} flatShading />
        </mesh>
      ))}
      {ice.map((c, i) => (
        <mesh key={`i${i}`} position={c.p} rotation={[c.rot + t * 0.05, c.rot, 0]} scale={c.s}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#cfe6ff" emissive="#3a6a96" emissiveIntensity={0.4} roughness={0.15} metalness={0.1} transparent opacity={0.85} />
        </mesh>
      ))}
      {microbes.map((m, i) => (
        <mesh key={`m${i}`} position={[m.x + Math.sin(t * m.v + m.a) * 0.15, m.y + Math.cos(t * m.v * 0.8 + m.a) * 0.1, 0.06]} rotation={[0, 0, m.a + t * 0.2 * m.v]} scale={m.s}>
          <capsuleGeometry args={[0.025, 0.09, 4, 10]} />
          <meshBasicMaterial color="#0a1a22" transparent opacity={0.75 * mic} />
        </mesh>
      ))}
      <sprite position={[1.6, -4.4, 0.3]} scale={[1.4, 0.26, 1]}>
        <spriteMaterial map={lblIce} transparent opacity={cl((t - 1.0) / 0.6)} depthTest={false} />
      </sprite>
      <sprite position={[WATER.x, WATER.y + 1.45, 0.3]} scale={[1.3, 0.24, 1]}>
        <spriteMaterial map={lblWater} transparent opacity={cl((t - dur * 0.45) / 0.6) * (1 - cl((t - dur * 0.7) / 0.5))} depthTest={false} />
      </sprite>
    </>
  );
};

export const UndergroundShot: React.FC<{dur: number}> = (p) => (
  <ThreeCanvas width={1080} height={1920} camera={{fov: 44, near: 0.05, far: 60}} gl={{antialias: true}}>
    <Scene {...p} />
  </ThreeCanvas>
);
