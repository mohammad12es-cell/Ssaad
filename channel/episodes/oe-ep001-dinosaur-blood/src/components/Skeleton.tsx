import React, {useMemo} from 'react';
import {C} from '../utils';

type P = [number, number];
// Spine midline in the same 1000x600 space as the silhouette (tail tip → skull).
const SPINE: P[] = [
  [50, 259], [150, 245], [250, 222], [340, 200], [430, 186], [520, 178], [600, 186], [660, 202], [700, 188], [725, 160], [752, 136], [785, 126],
];

const catmull = (pts: P[], n: number): P[] => {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

const SKULL = 'M 772 118 C 800 98, 880 106, 946 140 L 950 152 C 905 160, 845 166, 800 164 C 776 160, 762 138, 772 118 Z';
const JAW = 'M 790 168 C 840 176, 900 172, 946 158 L 944 166 C 900 182, 840 186, 796 178 Z';

const LegBones: React.FC<{dx?: number; dy?: number; rot?: number}> = ({dx = 0, dy = 0, rot = 0}) => {
  const hip: P = [440, 215], knee: P = [545, 305], ankle: P = [490, 440], toe: P = [572, 534];
  return (
    <g transform={`translate(${dx} ${dy}) rotate(${rot} 440 215)`}>
      <path d={`M ${hip[0]} ${hip[1]} Q 510 240 ${knee[0]} ${knee[1]}`} strokeWidth={13} />
      <path d={`M ${knee[0]} ${knee[1]} Q 525 380 ${ankle[0]} ${ankle[1]}`} strokeWidth={10} />
      <path d={`M ${ankle[0]} ${ankle[1]} L ${toe[0] - 10} ${toe[1] - 4}`} strokeWidth={8} />
      <path d={`M ${toe[0] - 12} ${toe[1] - 5} L ${toe[0] + 8} ${toe[1] - 2} M ${toe[0] - 16} ${toe[1] - 4} L ${toe[0] - 2} ${toe[1] + 6} M ${ankle[0] - 2} ${ankle[1] + 8} L ${ankle[0] - 22} ${ankle[1] + 50}`} strokeWidth={5} />
      <circle cx={knee[0]} cy={knee[1]} r={8} strokeWidth={4} />
      <circle cx={ankle[0]} cy={ankle[1]} r={6} strokeWidth={4} />
    </g>
  );
};

/** Procedural theropod skeleton. `draw` 0..1 reveals bones from tail to head. */
export const Skeleton: React.FC<{draw?: number; glow?: number; legSwing?: number; color?: string}> = ({draw = 1, glow = 0.6, legSwing = 0, color = C.ivory}) => {
  const {verts, ribs} = useMemo(() => {
    const pts = catmull(SPINE, 6);
    const verts = pts.map((p, i) => {
      const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
      const ang = Math.atan2(q[1] - o[1], q[0] - o[0]);
      const frac = i / pts.length;
      const size = frac < 0.3 ? 3 + frac * 20 : frac > 0.85 ? 7 : 9;
      return {p, ang, size, frac};
    });
    const ribs: {d: string; frac: number}[] = [];
    for (let x = 505; x <= 685; x += 16) {
      const top = 180 + ((x - 505) / 180) * 18;
      const len = 120 - Math.abs(x - 600) * 0.5;
      ribs.push({
        d: `M ${x} ${top} C ${x + 18} ${top + len * 0.4}, ${x + 12} ${top + len * 0.85}, ${x - 6} ${top + len}`,
        frac: 0.45 + ((x - 505) / 180) * 0.3,
      });
    }
    return {verts, ribs};
  }, []);
  const vis = (frac: number) => Math.max(0, Math.min(1, (draw * 1.25 - frac) * 6));
  return (
    <svg viewBox="0 0 1000 600" width="100%" height="100%" style={{overflow: 'visible'}}>
      <defs>
        <filter id="boneglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#boneglow)" stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.55 + glow * 0.45}}>
        {/* far leg */}
        <g opacity={0.45 * vis(0.35)}>
          <LegBones dx={-30} dy={-6} rot={-6 + legSwing} />
        </g>
        {/* vertebrae */}
        {verts.map((v, i) => (
          <g key={i} opacity={vis(v.frac)} transform={`translate(${v.p[0]} ${v.p[1]}) rotate(${(v.ang * 180) / Math.PI})`}>
            <rect x={-v.size * 0.7} y={-v.size * 0.55} width={v.size * 1.4} height={v.size * 1.1} rx={v.size * 0.4} fill={color} fillOpacity={0.85} strokeWidth={1.5} />
            {v.frac > 0.25 && v.frac < 0.8 && <line x1={0} y1={-v.size * 0.5} x2={-3} y2={-v.size * 1.9} strokeWidth={3} />}
            {v.frac < 0.4 && <line x1={0} y1={v.size * 0.5} x2={-2} y2={v.size * 1.6} strokeWidth={2} />}
          </g>
        ))}
        {/* ribs */}
        {ribs.map((r, i) => (
          <path key={i} d={r.d} strokeWidth={4} opacity={vis(r.frac) * 0.9} />
        ))}
        {/* pelvis */}
        <g opacity={vis(0.38)}>
          <path d="M 395 192 C 420 168, 480 166, 500 190 C 490 210, 430 214, 395 192 Z" strokeWidth={5} fill={color} fillOpacity={0.12} />
          <path d="M 455 205 L 490 300 L 470 306" strokeWidth={8} />
          <path d="M 430 208 L 410 270" strokeWidth={6} />
        </g>
        {/* arm */}
        <g opacity={vis(0.72)}>
          <path d="M 688 268 L 712 312 L 742 352" strokeWidth={6} />
          <path d="M 742 352 L 756 366 M 742 352 L 748 370" strokeWidth={3} />
        </g>
        {/* near leg */}
        <g opacity={vis(0.4)}>
          <LegBones rot={4 - legSwing} />
        </g>
        {/* skull */}
        <g opacity={vis(0.92)}>
          <path d={SKULL} strokeWidth={4} fill={color} fillOpacity={0.14} />
          <path d={JAW} strokeWidth={3} fill={color} fillOpacity={0.1} />
          <circle cx={812} cy={128} r={11} strokeWidth={3} />
          <ellipse cx={870} cy={140} rx={22} ry={9} strokeWidth={3} />
          <path d="M 860 160 L 862 168 M 880 158 L 882 166 M 900 155 L 902 163 M 920 151 L 921 158" strokeWidth={2} />
        </g>
      </g>
    </svg>
  );
};
