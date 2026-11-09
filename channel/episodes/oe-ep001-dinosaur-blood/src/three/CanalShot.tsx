import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {fbm3, heartbeat, mulberry32} from '../utils';
import {cl, dotTexture, easeInOut} from './common';

const RADIUS = 1.7;

const useCurve = () =>
  useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.7) * 2.2, Math.cos(i * 0.45) * 1.6, -i * 6));
    return new THREE.CatmullRomCurve3(pts);
  }, []);

/** Procedural canal-wall texture: lamellar mineralized bone with dark mineral speckles. */
const useWallTexture = () =>
  useMemo(() => {
    const w = 1024, h = 256;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h;
        const a = v * Math.PI * 2;
        // seamless around circumference
        const n = fbm3(u * 24, Math.cos(a) * 2, Math.sin(a) * 2, 5);
        const lam = 0.5 + 0.5 * Math.sin(u * 220 + n * 9);
        const grain = fbm3(u * 160, Math.cos(a) * 14, Math.sin(a) * 14, 2);
        let r = 70 + n * 90 + lam * 26 + grain * 30;
        let gg = 54 + n * 70 + lam * 18 + grain * 22;
        let b = 40 + n * 52 + lam * 12 + grain * 16;
        if (grain > 0.68) { r *= 0.35; gg *= 0.32; b *= 0.3; } // manganese-dark specks
        if (grain < 0.22) { r += 40; gg += 30; b += 18; } // bright crystals
        const i = (y * w + x) * 4;
        img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

/** Biconcave, oval disc; `rough` adds mineral grain (fossil) vs smooth (modern). */
export const makeCellGeometry = (rough: number, oval: number, seed = 1) => {
  const g = new THREE.SphereGeometry(1, 64, 40);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const rxz = Math.sqrt(v.x * v.x + v.z * v.z);
    v.y *= 0.2 + 0.52 * Math.pow(rxz, 1.4);
    v.z *= oval;
    if (rough > 0) {
      const n = fbm3(v.x * 6 + seed, v.y * 6, v.z * 6, 3) - 0.5;
      v.multiplyScalar(1 + n * rough);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};

type Cell = {p: THREE.Vector3; q: THREE.Quaternion; s: number; d: number};

const Scene: React.FC<{cellsIn: number; dissolveStart: number; dissolveEnd: number}> = ({cellsIn, dissolveStart, dissolveEnd}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const curve = useCurve();
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 700, RADIUS, 56, false), [curve]);
  const wall = useWallTexture();

  const cells = useMemo<Cell[]>(() => {
    const r = mulberry32(2026);
    const out: Cell[] = [];
    for (let i = 0; i < 52; i++) {
      const u = 0.115 + r() * 0.2;
      const p = curve.getPointAt(u);
      const T = curve.getTangentAt(u);
      const N = new THREE.Vector3(0, 1, 0).cross(T).normalize();
      const Bv = T.clone().cross(N).normalize();
      const a = r() * Math.PI * 2;
      const rad = (0.62 + 0.38 * Math.sqrt(r())) * (RADIUS - 0.5);
      p.add(N.multiplyScalar(Math.cos(a) * rad)).add(Bv.multiplyScalar(Math.sin(a) * rad));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28));
      out.push({p, q, s: 0.26 + r() * 0.12, d: r()});
    }
    return out;
  }, [curve]);
  const cellGeo = useMemo(() => makeCellGeometry(0.16, 0.78, 3), []);
  const cellMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#7a3a22', roughness: 0.95, metalness: 0.05, flatShading: true, emissive: new THREE.Color('#e0662f'), emissiveIntensity: 0, transparent: true}), []);
  const inst = useMemo(() => {
    const m = new THREE.InstancedMesh(cellGeo, cellMat, cells.length);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return m;
  }, [cellGeo, cellMat, cells.length]);

  // mineral particles released when the "cells" dissolve
  const PER = 80;
  const partBase = useMemo(() => {
    const r = mulberry32(9);
    const out = new Float32Array(cells.length * PER * 6);
    cells.forEach((c, ci) => {
      for (let k = 0; k < PER; k++) {
        const dir = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
        const o = (ci * PER + k) * 6;
        out.set([c.p.x, c.p.y, c.p.z, dir.x * c.s * (0.3 + r()), dir.y * c.s * (0.3 + r()), dir.z * c.s * (0.3 + r())], o);
      }
    });
    return out;
  }, [cells]);
  const partGeo = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(cells.length * PER * 3), 3)), [cells.length]);
  const partMat = useMemo(() => new THREE.PointsMaterial({map: dotTexture(), size: 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ff9a5c', opacity: 0}), []);

  // floating mineral crystals in the lumen
  const crystals = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({length: 90}, () => {
      const u = r() * 0.36;
      const p = curve.getPointAt(u);
      const T = curve.getTangentAt(u);
      const N = new THREE.Vector3(0, 1, 0).cross(T).normalize();
      const Bv = T.clone().cross(N).normalize();
      const a = r() * Math.PI * 2, rad = RADIUS * (0.72 + r() * 0.2);
      p.add(N.multiplyScalar(Math.cos(a) * rad)).add(Bv.multiplyScalar(Math.sin(a) * rad));
      return {p, s: 0.03 + r() * 0.07, rx: r() * 6, ry: r() * 6, v: r()};
    });
  }, [curve]);

  // ── camera: fast entry, then slow tracking
  const s = t;
  const u = 0.003 + easeInOut(cl(s / 2.2)) * 0.028 + Math.max(0, s - 1.1) * 0.0094 - Math.max(0, s - 12) * 0.0035;
  const p = curve.getPointAt(Math.min(0.98, u));
  const look = curve.getPointAt(Math.min(0.99, u + 0.03));
  const sway = new THREE.Vector3(Math.sin(t * 0.5) * 0.18, Math.cos(t * 0.37) * 0.14, 0);
  camera.position.copy(p).add(sway);
  camera.lookAt(look);
  camera.rotateZ(Math.sin(t * 0.2) * 0.08);
  camera.fov = 62;
  camera.updateProjectionMatrix();

  // ── cells: glow reveal, heartbeat-synced pulse, dissolve
  const appear = cl((t - cellsIn) / 2.2);
  const pulse = heartbeat(t, cellsIn + 0.5, 1.4);
  const dis = cl((t - dissolveStart) / (dissolveEnd - dissolveStart));
  cellMat.emissiveIntensity = appear * (0.28 + 0.4 * pulse) * (1 - dis);
  cellMat.opacity = appear;
  const m4 = new THREE.Matrix4();
  cells.forEach((c, i) => {
    const local = cl((dis * 1.6 - c.d * 0.6));
    const sc = c.s * (0.6 + 0.4 * appear) * (1 - local);
    const rot = c.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 0.08 * (c.d - 0.5)));
    m4.compose(c.p, rot, new THREE.Vector3(sc, sc, sc));
    inst.setMatrixAt(i, m4);
  });
  inst.instanceMatrix.needsUpdate = true;
  inst.visible = appear > 0;

  const pa = (partGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
  for (let i = 0; i < cells.length * PER; i++) {
    const b = i * 6;
    const local = cl((dis * 1.6 - cells[Math.floor(i / PER)].d * 0.6));
    const spread = local * (1 + local * 2.5);
    pa[i * 3] = partBase[b] + partBase[b + 3] * (1 + spread * 3);
    pa[i * 3 + 1] = partBase[b + 1] + partBase[b + 4] * (1 + spread * 3) - local * local * 0.4;
    pa[i * 3 + 2] = partBase[b + 2] + partBase[b + 5] * (1 + spread * 3);
  }
  partGeo.attributes.position.needsUpdate = true;
  partMat.opacity = dis > 0 ? Math.sin(Math.PI * cl(dis * 1.15)) * 0.9 : 0;
  partMat.color.set(dis < 0.5 ? '#ff9a5c' : '#c9b79a');

  return (
    <>
      <color attach="background" args={['#060504']} />
      <fogExp2 attach="fog" args={['#0a0706', 0.075]} />
      <ambientLight intensity={0.12} color="#c8b08e" />
      <pointLight position={camera.position.clone().add(new THREE.Vector3(0.3, 0.5, 0))} intensity={18} distance={18} decay={1.6} color="#ffd2a0" />
      <pointLight position={look.clone()} intensity={6 + appear * 6 * (1 + pulse)} distance={10} decay={1.5} color="#e0662f" />
      <mesh geometry={tube}>
        <meshStandardMaterial map={wall} bumpMap={wall} bumpScale={2.2} side={THREE.BackSide} roughness={0.82} metalness={0.05} emissive="#1a120c" emissiveIntensity={0.4} />
      </mesh>
      {crystals.map((c, i) => (
        <mesh key={i} position={c.p} rotation={[c.rx + t * 0.2 * c.v, c.ry + t * 0.15, 0]} scale={c.s}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5e4a38" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <primitive object={inst} />
      <points geometry={partGeo} material={partMat} />
    </>
  );
};

export const CanalShot: React.FC<{cellsIn: number; dissolveStart: number; dissolveEnd: number}> = (p) => (
  <ThreeCanvas width={1080} height={1920} camera={{fov: 62, near: 0.02, far: 60}} gl={{antialias: true}}>
    <Scene {...p} />
  </ThreeCanvas>
);
