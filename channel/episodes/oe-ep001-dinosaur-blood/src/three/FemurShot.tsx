import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {fbm3, mulberry32} from '../utils';
import {cl, dotTexture, easeIn, easeInOut, shaftMaterial} from './common';

/** Fossil hind-limb bone emerging from rock (3D reconstruction). */
const useBoneGeometry = () =>
  useMemo(() => {
    const prof: [number, number][] = [
      [0.001, -3.25], [0.3, -3.2], [0.52, -2.98], [0.6, -2.6], [0.5, -2.1], [0.34, -1.5], [0.27, -0.6], [0.26, 0.2],
      [0.29, 1.2], [0.4, 1.9], [0.58, 2.45], [0.62, 2.85], [0.5, 3.15], [0.28, 3.3], [0.001, 3.34],
    ];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const base = new THREE.Color('#8c7656'), dark = new THREE.Color('#4a3a2c'), stain = new THREE.Color('#6b3a24');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // flatten slightly, add condyle bulges and surface pitting
      const n = fbm3(v.x * 3, v.y * 3, v.z * 3, 4);
      const condyle = v.y < -2.4 ? 1 + 0.25 * Math.max(0, Math.sin(Math.atan2(v.z, v.x) * 2)) : 1;
      const k = (1 + (n - 0.5) * 0.12) * condyle;
      v.x *= k;
      v.z *= k * 0.86;
      pos.setXYZ(i, v.x, v.y, v.z);
      const m = fbm3(v.x * 1.6 + 7, v.y * 1.2, v.z * 1.6, 5);
      const c = base.clone().lerp(dark, Math.max(0, (m - 0.42) * 2.2));
      if (fbm3(v.x * 4, v.y * 4 + 3, v.z * 4, 3) > 0.62) c.lerp(stain, 0.5);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

const useRockGeometry = () =>
  useMemo(() => {
    const g = new THREE.PlaneGeometry(22, 22, 220, 220);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const a = new THREE.Color('#5c4a3a'), b = new THREE.Color('#2e241c'), c2 = new THREE.Color('#7a604a');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      // bone axis runs along x (rotated group); keep a cradle around it
      const dz = Math.abs(z + x * 0.12);
      const cradle = Math.exp(-Math.pow(dz / 0.9, 2)) * (Math.abs(x) < 3.6 ? 1 : 0.3);
      const h = (fbm3(x * 0.45, z * 0.45, 1, 5) - 0.5) * 1.1 * (1 - 0.85 * cradle) + cradle * 0.04;
      const strata = Math.sin(z * 2.2 + fbm3(x * 0.6, z * 0.6, 4) * 3) * 0.04;
      pos.setY(i, h + strata - 0.05);
      const m = fbm3(x * 1.3, z * 1.3, 9, 4);
      const col = a.clone().lerp(b, cl((m - 0.35) * 2)).lerp(c2, cl((0.4 - m) * 3) * 0.6);
      colors.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

const useDust = (n: number) =>
  useMemo(() => {
    const r = mulberry32(77);
    const base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const h = r() * 7;
      const rad = (0.3 + h * 0.3) * Math.sqrt(r());
      const a = r() * Math.PI * 2;
      base.set([Math.cos(a) * rad, h, Math.sin(a) * rad], i * 3);
    }
    return base;
  }, [n]);

const Scene: React.FC<{orbitEnd: number; diveEnd: number}> = ({orbitEnd, diveEnd}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const bone = useBoneGeometry();
  const rock = useRockGeometry();
  const dustBase = useDust(420);
  const dustGeo = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(dustBase.length), 3)), [dustBase]);
  const shaft = useMemo(() => shaftMaterial('#ffcf9a', 0.16), []);

  // dust drift
  const arr = (dustGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
  for (let i = 0; i < arr.length; i += 3) {
    const ph = i * 0.37;
    arr[i] = dustBase[i] + Math.sin(t * 0.3 + ph) * 0.25;
    arr[i + 1] = ((dustBase[i + 1] + t * 0.12 * (0.5 + (i % 7) / 7)) % 7) + 0.1;
    arr[i + 2] = dustBase[i + 2] + Math.cos(t * 0.25 + ph) * 0.25;
  }
  dustGeo.attributes.position.needsUpdate = true;

  // camera: smooth orbit, then accelerating dive into the bone surface
  const orbitA = -0.9 + Math.min(t, orbitEnd) * 0.16;
  const dv = easeIn(cl((t - orbitEnd) / (diveEnd - orbitEnd)));
  const radius = 7.6 - easeInOut(cl(t / orbitEnd)) * 1.2;
  const R = radius * (1 - dv) + 0.3 * dv;
  const hgt = 4.4 - easeInOut(cl(t / orbitEnd)) * 1.4;
  const Hc = hgt * (1 - dv) + 0.25 * dv;
  const target = new THREE.Vector3(0.15 * dv, 0.05, 0.0);
  camera.position.set(Math.sin(orbitA) * R, Hc, Math.cos(orbitA) * R);
  camera.lookAt(target);
  camera.fov = 34 - dv * 8;
  camera.updateProjectionMatrix();

  return (
    <>
      <color attach="background" args={['#070605']} />
      <fogExp2 attach="fog" args={['#0b0908', 0.045]} />
      <ambientLight intensity={0.14} color="#b8a48a" />
      <hemisphereLight args={['#3a3028', '#050404', 0.25]} />
      <spotLight position={[1.2, 8, 1.5]} angle={0.42} penumbra={0.85} intensity={300} distance={30} decay={2} color="#ffd6a3" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <pointLight position={[-4, 0.8, -3]} intensity={8} color="#e0662f" distance={12} />
      {/* light shaft */}
      <mesh position={[0.6, 4.2, 0.75]} rotation={[0.1, 0, -0.14]} material={shaft}>
        <coneGeometry args={[3.2, 8.4, 48, 1, true]} />
      </mesh>
      <group rotation={[0, 0.12, Math.PI / 2]} position={[0, 0.0, 0]} scale={0.5}>
        <mesh geometry={bone} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.86} metalness={0.02} />
        </mesh>
        {/* femoral-head style process */}
        <mesh position={[0.42, 2.95, 0]} castShadow>
          <sphereGeometry args={[0.42, 32, 24]} />
          <meshStandardMaterial color="#8e7658" roughness={0.9} />
        </mesh>
      </group>
      <mesh geometry={rock} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.97} flatShading />
      </mesh>
      <points geometry={dustGeo} position={[0.6, 0, 0.7]}>
        <pointsMaterial map={dotTexture()} size={0.05} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#ffe2bb" opacity={0.8} />
      </points>
    </>
  );
};

export const FemurShot: React.FC<{orbitEnd: number; diveEnd: number}> = (p) => (
  <ThreeCanvas width={1080} height={1920} shadows camera={{fov: 38, position: [0, 3, 6], near: 0.05, far: 80}} gl={{antialias: true}}>
    <Scene {...p} />
  </ThreeCanvas>
);
