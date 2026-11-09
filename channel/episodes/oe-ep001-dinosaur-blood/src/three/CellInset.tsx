import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {makeCellGeometry} from './CanalShot';

const Scene: React.FC<{fossil: boolean}> = ({fossil}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const geo = useMemo(() => (fossil ? makeCellGeometry(0.2, 0.78, 11) : makeCellGeometry(0, 1)), [fossil]);
  return (
    <>
      <color attach="background" args={[fossil ? '#120c09' : '#140a09']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 6]} intensity={2.6} color="#ffe4c2" />
      <pointLight position={[-4, -2, -3]} intensity={30} color="#e0662f" />
      <mesh geometry={geo} rotation={[0.9 + Math.sin(t * 0.6) * 0.15, t * 0.5, 0.2]} scale={1.55}>
        {fossil ? (
          <meshStandardMaterial color="#7a4128" roughness={0.97} flatShading emissive="#e0662f" emissiveIntensity={0.18} />
        ) : (
          <meshPhysicalMaterial color="#b3261e" roughness={0.35} clearcoat={0.6} sheen={0.5} sheenColor={new THREE.Color('#ff8070')} emissive="#5a0c08" emissiveIntensity={0.3} />
        )}
      </mesh>
    </>
  );
};

export const CellInset: React.FC<{fossil: boolean; size: number}> = ({fossil, size}) => (
  <ThreeCanvas width={size} height={size} camera={{fov: 35, position: [0, 0, 7]}} gl={{antialias: true}}>
    <Scene fossil={fossil} />
  </ThreeCanvas>
);
