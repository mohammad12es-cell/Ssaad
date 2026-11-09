import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {fbm3, mulberry32} from '../utils';
import {cl, dotTexture} from './common';

const ss = (x: number) => x * x * (3 - 2 * x);
/** Fissure centre-lines (z as a function of x): long, narrow graben. */
const FISSURES = [(x: number) => 0.12 * Math.sin(x * 0.25) + 0.02 * x, (x: number) => 3.2 + 0.18 * Math.sin(x * 0.2 + 1), (x: number) => -3.6 + 0.1 * Math.sin(x * 0.3 + 2)];
const WIDTHS = [0.28, 0.16, 0.14];

const useTerrain = () =>
  useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60, 360, 360);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const dust = new THREE.Color('#b8693d'), dark = new THREE.Color('#5a2c1c'), light = new THREE.Color('#d99a68'), crack = new THREE.Color('#1c0d08');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h = (fbm3(x * 0.08, z * 0.08, 3, 5) - 0.5) * 3.2 + (fbm3(x * 0.6, z * 0.6, 7, 3) - 0.5) * 0.35;
      let cr = 0;
      FISSURES.forEach((fz, k) => {
        const d = Math.abs(z - fz(x));
        const w = WIDTHS[k] * (0.8 + 0.4 * fbm3(x * 0.3, k, 1, 2));
        const trough = Math.exp(-Math.pow(d / w, 4));
        const rim = Math.exp(-Math.pow((d - w * 1.6) / (w * 0.8), 2)) * 0.08;
        h += -trough * 0.9 + rim;
        cr = Math.max(cr, trough);
      });
      pos.setY(i, h);
      const n = fbm3(x * 0.35, z * 0.35, 11, 4);
      const c = dust.clone().lerp(dark, cl((n - 0.45) * 3)).lerp(light, cl((0.42 - n) * 4) * 0.5).lerp(crack, cr * 0.95);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);

/** Sky dome: dusky Martian sky, blue glow around the low Sun. */
const skyMaterial = () =>
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {uSun: {value: new THREE.Vector3(-0.8, 0.12, -0.6).normalize()}},
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vD;
      void main(){ float h = clamp(vD.y, -0.1, 1.0);
        vec3 col = mix(vec3(0.42,0.24,0.16), vec3(0.05,0.05,0.07), smoothstep(0.0, 0.5, h));
        float s = max(dot(vD, uSun), 0.0);
        col += vec3(0.35,0.55,0.85) * pow(s, 18.0) * 0.9 + vec3(0.9,0.95,1.0) * pow(s, 600.0);
        gl_FragColor = vec4(col, 1.0); }`,
  });

type Mol = {x: number; z: number; t0: number; sp: number; ph: number; rot: THREE.Euler};

const Scene: React.FC<{mode: 'dive' | 'top'; dur: number; heroAt: number}> = ({mode, dur, heroAt}) => {
  const t = useCurrentFrame() / 30;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const terrain = useTerrain();
  const sky = useMemo(skyMaterial, []);
  const mols = useMemo<Mol[]>(() => {
    const r = mulberry32(17);
    return Array.from({length: 150}, () => {
      const x = -6 + r() * 12;
      return {x, z: FISSURES[0](x) + (r() - 0.5) * 0.25, t0: r() * 6, sp: 0.25 + r() * 0.3, ph: r() * 6.28, rot: new THREE.Euler(r() * 6, r() * 6, r() * 6)};
    });
  }, []);
  const hGeo = useMemo(() => new THREE.SphereGeometry(1, 20, 14), []);
  const hMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#f2efe8', roughness: 0.3, emissive: '#3a3a3a'}), []);
  const clMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#9fd18a', roughness: 0.3, emissive: '#1c3318'}), []);
  const instH = useMemo(() => new THREE.InstancedMesh(hGeo, hMat, 150), [hGeo, hMat]);
  const instCl = useMemo(() => new THREE.InstancedMesh(hGeo, clMat, 150), [hGeo, clMat]);
  const haze = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({length: 40}, () => ({x: -5 + r() * 10, t0: r() * 8, s: 1 + r() * 1.5}));
  }, []);

  // molecules rise from the main fissure and fade by scale near the top
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), off = new THREE.Vector3();
  const emit = cl(t / 1.5);
  mols.forEach((m, i) => {
    const life = ((t * m.sp + m.t0) % 3.2) / 3.2;
    const y = -0.5 + life * 4.2;
    const s = 0.06 * Math.sin(Math.PI * life) * emit;
    const x = m.x + Math.sin(t * 0.8 + m.ph) * 0.25 * life;
    const z = m.z + Math.cos(t * 0.6 + m.ph) * 0.25 * life;
    q.setFromEuler(new THREE.Euler(m.rot.x + t, m.rot.y + t * 0.7, m.rot.z));
    off.set(1.7 * s, 0, 0).applyQuaternion(q);
    m4.compose(new THREE.Vector3(x, y, z).add(off), q, new THREE.Vector3(s * 0.65, s * 0.65, s * 0.65));
    instH.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s * 1.15, s * 1.15, s * 1.15));
    instCl.setMatrixAt(i, m4);
  });
  instH.instanceMatrix.needsUpdate = true;
  instCl.instanceMatrix.needsUpdate = true;

  // camera
  if (mode === 'dive') {
    const d = ss(cl(t / 3.2));
    const P = new THREE.Vector3(-1.5 + t * 0.12, 9 - d * 7.6, 6 - d * 3.6);
    const L = new THREE.Vector3(0.3 + t * 0.18, 0.4 * d, FISSURES[0](0.3 + t * 0.18));
    camera.position.copy(P);
    camera.lookAt(L);
    camera.fov = 52;
  } else {
    const P = new THREE.Vector3(0.6 + t * 0.15, 7.2 - t * 0.35, 0.8);
    camera.position.copy(P);
    camera.up.set(0, 0, -1);
    camera.lookAt(new THREE.Vector3(0.6 + t * 0.15, 0, 0.4));
    camera.fov = 50;
  }
  camera.updateProjectionMatrix();

  // hero HCl molecule (dive mode only)
  const hero = mode === 'dive' ? cl((t - heroAt) / 0.8) * (1 - cl((t - dur + 0.6) / 0.6)) : 0;
  const heroPos = camera.position.clone().add(new THREE.Vector3().subVectors(new THREE.Vector3(0.3 + t * 0.18, 0.4, 0), camera.position).normalize().multiplyScalar(1.6)).add(new THREE.Vector3(0.0, 0.22 + (t - heroAt) * 0.05, 0));

  return (
    <>
      <mesh material={sky} scale={80}>
        <sphereGeometry args={[1, 48, 24]} />
      </mesh>
      <fog attach="fog" args={['#3a2014', 8, 40]} />
      <hemisphereLight args={['#6d7f9a', '#3a1f12', 0.55]} />
      <directionalLight position={[-8, 3.2, -6]} intensity={3.2} color="#ffe2c4" />
      <directionalLight position={[6, 5, 6]} intensity={0.5} color="#8fb0d8" />
      <mesh geometry={terrain}>
        <meshStandardMaterial vertexColors roughness={0.96} />
      </mesh>
      <primitive object={instH} />
      <primitive object={instCl} />
      {haze.map((h, i) => {
        const life = ((t * 0.18 + h.t0) % 1.6) / 1.6;
        return (
          <sprite key={i} position={[h.x, -0.2 + life * 3.5, FISSURES[0](h.x)]} scale={h.s * (0.6 + life * 1.6)}>
            <spriteMaterial map={dotTexture()} color="#cfe0f0" transparent opacity={0.07 * Math.sin(Math.PI * life) * emit} depthWrite={false} />
          </sprite>
        );
      })}
      {hero > 0 && (
        <group position={heroPos} rotation={[0.25, 0.5 + Math.sin(t * 0.7) * 0.5, 0.15]} scale={0.095 * (0.6 + 0.4 * hero)}>
          <mesh position={[-0.45, 0, 0]} material={clMat} scale={0.9}>
            <sphereGeometry args={[1, 40, 28]} />
          </mesh>
          <mesh position={[0.95, 0, 0]} material={hMat} scale={0.5}>
            <sphereGeometry args={[1, 32, 20]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0.25, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 1.2, 16]} />
            <meshStandardMaterial color="#d8d2c4" />
          </mesh>
          <sprite scale={4}>
            <spriteMaterial map={dotTexture()} color="#9fd18a" transparent opacity={0.18 * hero} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      )}
    </>
  );
};

export const SurfaceShot: React.FC<{mode: 'dive' | 'top'; dur: number; heroAt?: number}> = ({heroAt = 1, ...p}) => (
  <ThreeCanvas width={1080} height={1920} camera={{fov: 52, near: 0.05, far: 200}} gl={{antialias: true}}>
    <Scene {...p} heroAt={heroAt} />
  </ThreeCanvas>
);
