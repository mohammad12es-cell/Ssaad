import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {ALBA_DIR, atmosphereMaterial, glowMaterial, marsTextures, starGeometry} from './mars';
import {cl, dotTexture} from './common';

const SUN = new THREE.Vector3(-0.75, 0.38, 0.55).normalize();
const ss = (x: number) => x * x * (3 - 2 * x);
const mix3 = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);

/** Stylized trace-gas orbiter: gold-foil bus, two long solar wings, high-gain antenna. Artist's rendering. */
const Spacecraft: React.FC<{pos: THREE.Vector3; look: THREE.Vector3}> = ({pos, look}) => {
  const ref = useMemo(() => new THREE.Object3D(), []);
  ref.position.copy(pos);
  ref.lookAt(look);
  const panel = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#16233d'; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = '#5b7bb0'; g.lineWidth = 1;
    for (let x = 0; x <= 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    for (let y = 0; y <= 64; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <group position={ref.position} quaternion={ref.quaternion} scale={0.07}>
      <mesh>
        <boxGeometry args={[0.9, 0.9, 1.3]} />
        <meshStandardMaterial color="#d4a94a" metalness={0.85} roughness={0.32} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.05, 0, 0]}>
            <boxGeometry args={[1.2, 0.05, 0.05]} />
            <meshStandardMaterial color="#9a9a9a" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[s * 2.9, 0, 0]}>
            <boxGeometry args={[3.0, 0.03, 0.9]} />
            <meshStandardMaterial map={panel} metalness={0.5} roughness={0.35} emissive="#0c1426" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.75, -0.1]} rotation={[-0.4, 0, 0]}>
        <sphereGeometry args={[0.55, 32, 12, 0, Math.PI * 2, 0, 0.9]} />
        <meshStandardMaterial color="#e8e4dc" side={THREE.DoubleSide} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.2, 0.75]}>
        <cylinderGeometry args={[0.18, 0.22, 0.25, 16]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
};

const Scene: React.FC<{b1: number; b2: number; detectAt: number; spin0: number}> = ({b1, b2, detectAt, spin0}) => {
  const t = useCurrentFrame() / 30;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tex = marsTextures();
  const atmo = useMemo(() => atmosphereMaterial(SUN), []);
  const glow = useMemo(() => glowMaterial(), []);
  const stars = useMemo(() => starGeometry(), []);

  // planet orientation: tilt so Alba Mons (40.5°N) faces the camera, slow spin
  const tilt = 0.62;
  const spin = spin0 + (t - b1 - 5) * 0.015;
  const planetQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, spin, 0, 'XYZ'));
  const albaW = ALBA_DIR.clone().applyQuaternion(planetQ);

  // spacecraft path (S2): arc in front of the planet
  const k = cl((t - b1 + 0.6) / (b2 - b1 + 0.6));
  const a0 = new THREE.Vector3(-1.0, 0.45, 1.05).normalize().multiplyScalar(1.5);
  const a1 = new THREE.Vector3(0.55, 0.85, 1.05).normalize().multiplyScalar(1.5);
  const sc = a0.clone().lerp(a1, k).normalize().multiplyScalar(1.5);
  const scNext = a0.clone().lerp(a1, Math.min(1, k + 0.02)).normalize().multiplyScalar(1.5);

  // ── camera director
  const P0 = new THREE.Vector3(0.0, 0.1, 6.4), L0 = new THREE.Vector3(0, 0.0, 0);
  const P1 = new THREE.Vector3(-0.1, 0.25, 4.5), L1 = new THREE.Vector3(0, 0.05, 0);
  const follow = sc.clone().multiplyScalar(1.55).add(new THREE.Vector3(0.12, 0.18, 0.35));
  const followL = sc.clone().lerp(new THREE.Vector3(0, 0, 0), 0.12);
  const topP = albaW.clone().multiplyScalar(2.6 - ss(cl((t - (b2 - 2.6)) / 2.6)) * 0.85);
  const topL = albaW.clone();
  let P: THREE.Vector3, Lk: THREE.Vector3;
  if (t < b1 - 0.4) {
    const u = ss(cl(t / (b1 - 0.4)));
    P = mix3(P0, P1, u); Lk = mix3(L0, L1, u);
  } else if (t < b1 + 3.6) {
    const u = ss(cl((t - (b1 - 0.4)) / 1.6));
    P = mix3(P1, follow, u); Lk = mix3(L1, followL, u);
  } else {
    const u = ss(cl((t - (b1 + 3.6)) / 2.2));
    P = mix3(follow, topP, u); Lk = mix3(followL, topL, u);
  }
  camera.position.copy(P);
  camera.up.set(0, 1, 0);
  camera.lookAt(Lk);
  camera.fov = 34;
  camera.near = 0.01;
  camera.updateProjectionMatrix();

  // shader uniforms
  glow.uniforms.uTime.value = t;
  glow.uniforms.uGlow.value = 0.95 * cl((t - 1.4) / 3.0) * (1 - 0.5 * cl((t - b1) / 2));
  glow.uniforms.uRing.value = cl((t - detectAt) / 1.6);
  glow.uniforms.uRingAmp.value = t > detectAt ? 1 - cl((t - detectAt - 1.0) / 0.8) : 0;
  glow.uniforms.uArea.value = cl((t - detectAt - 0.8) / 0.8);
  const beam = t > detectAt - 0.4 ? Math.sin(Math.PI * cl((t - detectAt + 0.4) / 2.6)) : 0;
  const beamTo = albaW.clone().multiplyScalar(1.03);
  const beamMid = sc.clone().add(beamTo).multiplyScalar(0.5);
  const beamLen = sc.distanceTo(beamTo);
  const beamQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamTo.clone().sub(sc).normalize());

  return (
    <>
      <color attach="background" args={['#020203']} />
      <points geometry={stars}>
        <pointsMaterial size={0.12} vertexColors map={dotTexture()} transparent depthWrite={false} sizeAttenuation />
      </points>
      <ambientLight intensity={0.04} color="#6f8fb8" />
      <directionalLight position={SUN.clone().multiplyScalar(10)} intensity={3.4} color="#fff1e0" />
      <group quaternion={planetQ}>
        <mesh>
          <sphereGeometry args={[1, 160, 120]} />
          <meshStandardMaterial map={tex.map} bumpMap={tex.bump} bumpScale={1.6} roughness={0.95} metalness={0} />
        </mesh>
        <mesh material={glow}>
          <sphereGeometry args={[1.004, 128, 96]} />
        </mesh>
      </group>
      <mesh material={atmo} scale={1.035}>
        <sphereGeometry args={[1, 96, 64]} />
      </mesh>
      {t > b1 - 1.2 && <Spacecraft pos={sc} look={scNext} />}
      {beam > 0 && (
        <mesh position={beamMid} quaternion={beamQ}>
          <cylinderGeometry args={[0.0025, 0.0025, beamLen, 8]} />
          <meshBasicMaterial color="#cfe4ff" transparent opacity={0.8 * beam} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </>
  );
};

export const SpaceShot: React.FC<{b1: number; b2: number; detectAt: number}> = (p) => {
  // spin so Alba Mons faces +z at b1 + 5 s
  const v = ALBA_DIR;
  const spin0 = Math.atan2(-v.x, v.z);
  return (
    <ThreeCanvas width={1080} height={1920} camera={{fov: 34, position: [0, 0, 6]}} gl={{antialias: true}}>
      <Scene {...p} spin0={spin0} />
    </ThreeCanvas>
  );
};
