import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {cl, dotTexture} from './common';

type Atom = {p: THREE.Vector3; el: 'C' | 'N' | 'O' | 'Fe'; order: number};
type Bond = {a: number; b: number};

/**
 * Stylized ball-and-stick heme B (Fe-protoporphyrin IX): porphyrin macrocycle with Fe at the centre,
 * 4 methyl, 2 vinyl and 2 propionate side chains. Planar layout, approximate geometry (visualization).
 */
const buildHeme = () => {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const add = (x: number, y: number, z: number, el: Atom['el'], order: number) => {
    atoms.push({p: new THREE.Vector3(x, y, z), el, order});
    return atoms.length - 1;
  };
  const pol = (r: number, a: number, z = 0) => [Math.cos(a) * r, Math.sin(a) * r, z] as const;
  const fe = add(0, 0, 0, 'Fe', 0);
  const alpha: number[][] = [];
  const beta: number[][] = [];
  for (let k = 0; k < 4; k++) {
    const th = (k * Math.PI) / 2;
    const n = add(...pol(2.0, th), 'N', 1);
    bonds.push({a: fe, b: n});
    const a1 = add(...pol(2.95, th - 0.4), 'C', 2), a2 = add(...pol(2.95, th + 0.4), 'C', 2);
    const b1 = add(...pol(4.25, th - 0.26), 'C', 3), b2 = add(...pol(4.25, th + 0.26), 'C', 3);
    bonds.push({a: n, b: a1}, {a: n, b: a2}, {a: a1, b: b1}, {a: b1, b: b2}, {a: b2, b: a2});
    alpha.push([a1, a2]);
    beta.push([b1, b2]);
  }
  for (let k = 0; k < 4; k++) {
    const meso = add(...pol(3.45, (k * Math.PI) / 2 + Math.PI / 4), 'C', 3);
    bonds.push({a: alpha[k][1], b: meso}, {a: meso, b: alpha[(k + 1) % 4][0]});
  }
  // substituents on β carbons: Me, vinyl, Me, vinyl, Me, propionate, propionate, Me
  const subs = ['Me', 'V', 'Me', 'V', 'Me', 'P', 'P', 'Me'];
  beta.flat().forEach((bi, idx) => {
    const b = atoms[bi].p;
    const dir = b.clone().normalize();
    const sgn = idx % 2 === 0 ? -1 : 1;
    const side = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.35 * sgn);
    const c1p = b.clone().add(dir.clone().multiplyScalar(1.45)).add(side);
    const c1 = add(c1p.x, c1p.y, c1p.z, 'C', 4);
    bonds.push({a: bi, b: c1});
    if (subs[idx] === 'V') {
      const c2p = c1p.clone().add(dir.clone().multiplyScalar(1.0)).add(side.clone().multiplyScalar(2.4)).add(new THREE.Vector3(0, 0, 0.4));
      const c2 = add(c2p.x, c2p.y, c2p.z, 'C', 5);
      bonds.push({a: c1, b: c2});
    } else if (subs[idx] === 'P') {
      const zdir = new THREE.Vector3(0, 0, idx === 5 ? 1 : -1);
      const c2p = c1p.clone().add(dir.clone().multiplyScalar(0.9)).add(zdir.clone().multiplyScalar(1.0));
      const c3p = c2p.clone().add(dir.clone().multiplyScalar(0.7)).add(zdir.clone().multiplyScalar(1.15));
      const c2 = add(c2p.x, c2p.y, c2p.z, 'C', 5);
      const c3 = add(c3p.x, c3p.y, c3p.z, 'C', 6);
      const o1p = c3p.clone().add(dir.clone().multiplyScalar(1.0)).add(side.clone().multiplyScalar(1.6));
      const o2p = c3p.clone().add(zdir.clone().multiplyScalar(1.15)).sub(side.clone().multiplyScalar(1.6));
      const o1 = add(o1p.x, o1p.y, o1p.z, 'O', 7);
      const o2 = add(o2p.x, o2p.y, o2p.z, 'O', 7);
      bonds.push({a: c1, b: c2}, {a: c2, b: c3}, {a: c3, b: o1}, {a: c3, b: o2});
    }
  });
  return {atoms, bonds};
};

const RAD = {C: 0.36, N: 0.4, O: 0.38, Fe: 0.62};
const COL = {C: '#d9ccb3', N: '#7f93a6', O: '#c4472c', Fe: '#ff8a3d'};

const Scene: React.FC<{appear: number; exit: number}> = ({appear, exit}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const {atoms, bonds} = useMemo(buildHeme, []);
  const mats = useMemo(
    () => ({
      C: new THREE.MeshStandardMaterial({color: COL.C, roughness: 0.35, metalness: 0.1}),
      N: new THREE.MeshStandardMaterial({color: COL.N, roughness: 0.35, metalness: 0.1}),
      O: new THREE.MeshStandardMaterial({color: COL.O, roughness: 0.35, metalness: 0.1}),
      Fe: new THREE.MeshStandardMaterial({color: COL.Fe, roughness: 0.25, metalness: 0.3, emissive: new THREE.Color('#e0662f'), emissiveIntensity: 1.2}),
      bond: new THREE.MeshStandardMaterial({color: '#9c8f7a', roughness: 0.5}),
    }),
    [],
  );
  const sph = useMemo(() => new THREE.SphereGeometry(1, 32, 20), []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.1, 0.1, 1, 12), []);
  const build = cl((t - appear) / 2.0); // atoms appear from Fe outward
  const out = cl((t - exit) / 0.8);
  const vis = (order: number) => cl(build * 8 - order) * (1 - out);
  const up = new THREE.Vector3(0, 1, 0);
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 8]} intensity={2.4} color="#ffe6c4" />
      <pointLight position={[-6, -3, -4]} intensity={60} color="#e0662f" distance={20} />
      <group rotation={[0.35 + Math.sin(t * 0.3) * 0.12, Math.sin(t * 0.35) * 0.65, t * 0.12]} scale={0.95 + 0.05 * build}>
        {atoms.map((a, i) => {
          const v = vis(a.order);
          if (v <= 0) return null;
          return <mesh key={i} geometry={sph} material={mats[a.el]} position={a.p} scale={RAD[a.el] * (0.3 + 0.7 * v)} />;
        })}
        {bonds.map((b, i) => {
          const A = atoms[b.a], Bt = atoms[b.b];
          const v = Math.min(vis(A.order), vis(Bt.order));
          if (v <= 0) return null;
          const mid = A.p.clone().add(Bt.p).multiplyScalar(0.5);
          const d = Bt.p.clone().sub(A.p);
          const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
          return <mesh key={`b${i}`} geometry={cyl} material={mats.bond} position={mid} quaternion={q} scale={[v, d.length(), v]} />;
        })}
        {/* iron glow */}
        <sprite scale={3.2 * (1 + 0.08 * Math.sin(t * 3))}>
          <spriteMaterial map={dotTexture()} color="#ff7a32" transparent opacity={0.55 * vis(0)} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
    </>
  );
};

export const HemeShot: React.FC<{appear: number; exit: number; size: number}> = ({size, ...p}) => (
  <ThreeCanvas width={size} height={size} camera={{fov: 35, position: [0, 0, 22]}} gl={{antialias: true, alpha: true}}>
    <Scene {...p} />
  </ThreeCanvas>
);
