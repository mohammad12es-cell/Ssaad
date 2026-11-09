import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {DinoSilhouette} from '../components/Dino';
import {Skeleton} from '../components/Skeleton';
import {Dust, Fog} from '../components/Overlays';
import {lerpT, mulberry32} from '../utils';

/** Araucaria-like conifer: tall bare trunk, flat umbrella crown tiers. */
const tree = (x: number, base: number, h: number, w: number) => {
  const top = base - h;
  let d = `M ${x - w * 0.03} ${base} L ${x - w * 0.015} ${top + h * 0.18} L ${x + w * 0.015} ${top + h * 0.18} L ${x + w * 0.03} ${base} Z `;
  for (let k = 0; k < 4; k++) {
    const y = top + k * h * 0.07;
    const ww = w * (0.45 + k * 0.18);
    d += `M ${x - ww / 2} ${y + h * 0.05} Q ${x} ${y - h * 0.04} ${x + ww / 2} ${y + h * 0.05} Q ${x} ${y + h * 0.02} ${x - ww / 2} ${y + h * 0.05} Z `;
  }
  return d;
};

/** Scene 2a — Early Cretaceous NE Brazil at dusk; the animal fades to its skeleton. */
export const Landscape: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const cam = lerpT(t, 0, dur, 0, 1);
  const flesh = 1 - lerpT(t, 0.9, 2.0);
  const bones = lerpT(t, 1.0, 2.3);
  const sink = lerpT(t, 2.3, dur, 0, 1);
  const trees = useMemo(() => {
    const r = mulberry32(42);
    return {
      far: Array.from({length: 14}, (_, i) => tree(i * 90 + r() * 60 - 40, 1160, 180 + r() * 120, 120 + r() * 60)).join(' '),
      near: Array.from({length: 5}, (_, i) => tree(i * 300 + r() * 120 - 80, 1330, 520 + r() * 220, 300 + r() * 120)).join(' '),
    };
  }, []);
  const layer = (depth: number) => ({transform: `translateX(${-cam * 120 * depth}px) scale(${1 + cam * 0.08 * depth})`, transformOrigin: '50% 60%'});
  return (
    <AbsoluteFill style={{background: '#0b0907', filter: `brightness(${1 - sink * 0.6})`}}>
      {/* sky */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #0c0b0b 0%, #1d1713 35%, #4a3527 58%, #6b4430 63%, #2a1e17 70%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(circle at 66% 60%, rgba(224,102,47,0.55) 0%, rgba(184,68,44,0.18) 12%, rgba(0,0,0,0) 30%)'}} />
      <AbsoluteFill style={layer(0.2)}>
        <svg width={1080} height={1920}>
          <path d="M -100 1170 L 60 1110 L 140 1090 L 220 1100 L 260 1060 L 380 1050 L 420 1080 L 560 1085 L 610 1040 L 760 1035 L 800 1075 L 980 1080 L 1200 1120 L 1200 1300 L -100 1300 Z" fill="#2a2019" />
        </svg>
      </AbsoluteFill>
      <Fog seed={5} count={8} color="140,100,72" opacity={0.28} y={[1000, 1250]} blur={50} speed={0.5} />
      <AbsoluteFill style={layer(0.45)}>
        <svg width={1080} height={1920}>
          <path d={trees.far} fill="#1a1410" />
          {/* lagoon */}
          <rect x={-200} y={1160} width={1500} height={140} fill="#2b1f18" />
          <rect x={-200} y={1168} width={1500} height={90} fill="url(#water)" />
          <defs>
            <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#8a4a2c" stopOpacity="0.55" />
              <stop offset="1" stopColor="#1a120d" stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({length: 8}, (_, i) => (
            <rect key={i} x={560 + Math.sin(t * 1.5 + i) * 30 - i * 6} y={1172 + i * 10} width={220 - i * 18} height={2} fill="#ff9a5c" opacity={0.35 - i * 0.035} />
          ))}
        </svg>
      </AbsoluteFill>
      {/* ground */}
      <AbsoluteFill style={layer(0.8)}>
        <svg width={1080} height={1920}>
          <path d="M -200 1290 C 200 1260, 600 1300, 1300 1270 L 1300 1920 L -200 1920 Z" fill="#120e0b" />
        </svg>
      </AbsoluteFill>
      {/* the animal → its skeleton */}
      <div style={{position: 'absolute', left: 150 - cam * 70, top: 920 + sink * 160, width: 780, height: 468, ...{transform: `scale(${1 + cam * 0.1})`}}}>
        <div style={{position: 'absolute', inset: 0, opacity: flesh}}>
          <DinoSilhouette glow={0.25} pulse={0.3} rim={0.8} legSwing={Math.sin(t * 2.4) * 3 * flesh} />
        </div>
        <div style={{position: 'absolute', inset: 0, opacity: bones * (1 - sink * 0.8)}}>
          <Skeleton draw={bones} glow={0.6 + 0.4 * (1 - sink)} />
        </div>
      </div>
      <AbsoluteFill style={layer(1.4)}>
        <svg width={1080} height={1920}>
          <path d={trees.near} fill="#060504" />
        </svg>
      </AbsoluteFill>
      <Fog seed={8} count={6} color="120,90,70" opacity={0.25} y={[1250, 1800]} blur={80} speed={1} />
      <Dust seed={7} count={50} drift={0.6} opacity={0.6} area={[0, 700, 1080, 1100]} />
    </AbsoluteFill>
  );
};
