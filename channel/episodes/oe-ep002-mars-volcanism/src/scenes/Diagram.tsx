import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {DISPLAY, MONO} from '../fonts';
import {C, lerpT} from '../utils';

/** Observed (solid, ivory) vs inferred (dashed, blue) — a schematic cross-section. */
export const Diagram: React.FC<{dur: number; noEruptAt: number}> = ({dur, noEruptAt}) => {
  const t = useCurrentFrame() / 30;
  const draw = (a: number, b: number) => lerpT(t, a, b, 0, 1, Easing.inOut(Easing.cubic));
  const surf = draw(0.1, 0.8), plume = draw(0.6, 1.5), magma = draw(1.6, 2.6), paths = draw(2.4, 3.4), noE = draw(noEruptAt, noEruptAt + 0.6);
  const push = lerpT(t, 0, dur, 0, 1, Easing.linear);
  const flow = (t * 40) % 40;
  const label = (x: number, y: number, kind: 'obs' | 'inf', title: string, sub: string, p: number) => (
    <g opacity={p} transform={`translate(${x} ${y + (1 - p) * 14})`}>
      <rect x={0} y={0} width={kind === 'obs' ? 380 : 400} height={92} rx={10} fill="rgba(6,6,8,0.75)" stroke={kind === 'obs' ? C.ivory : C.sky} strokeWidth={2} strokeDasharray={kind === 'obs' ? undefined : '10 7'} />
      <text x={20} y={36} fontFamily={MONO} fontSize={22} letterSpacing="3" fill={kind === 'obs' ? C.lava : C.sky}>{kind === 'obs' ? '● OBSERVED' : '○ INFERRED'}</text>
      <text x={20} y={72} fontFamily={DISPLAY} fontWeight={700} fontSize={30} fill={C.ivory}>{title}</text>
      <text x={kind === 'obs' ? 360 : 380} y={72} textAnchor="end" fontFamily={MONO} fontSize={19} fill={C.ivoryDim}>{sub}</text>
    </g>
  );
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #1a1210 0%, #070606 75%)'}}>
      <svg width={1080} height={1920} style={{transform: `scale(${1 + push * 0.05})`, transformOrigin: '50% 55%'}}>
        <defs>
          <linearGradient id="crust" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6b3a24" />
            <stop offset="1" stopColor="#1c100b" />
          </linearGradient>
          <radialGradient id="mag" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff9a4a" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ff5a1a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="ground"><rect x={0} y={860} width={1080 * surf} height={700} /></clipPath>
        </defs>
        {/* ground cross-section */}
        <g clipPath="url(#ground)">
          <path d="M 0 880 C 200 870, 380 875, 500 880 L 530 940 L 560 880 C 700 872, 900 878, 1080 870 L 1080 1560 L 0 1560 Z" fill="url(#crust)" />
          {Array.from({length: 7}, (_, i) => (
            <path key={i} d={`M 0 ${960 + i * 75} C 300 ${950 + i * 75}, 700 ${975 + i * 75}, 1080 ${955 + i * 75}`} stroke="rgba(0,0,0,0.25)" strokeWidth={2} fill="none" />
          ))}
          <path d="M 0 880 C 200 870, 380 875, 500 880 L 530 940 L 560 880 C 700 872, 900 878, 1080 870" stroke={C.ivory} strokeWidth={3} fill="none" />
        </g>
        {/* observed: gas plume above the fissure (solid) */}
        <g opacity={plume}>
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M ${515 + k * 15} 880 C ${490 + k * 30} ${800 - k * 10}, ${560 - k * 20} ${740}, ${520 + k * 25} ${660 + k * 10}`} stroke="rgba(207,224,240,0.55)" strokeWidth={14 - k * 3} strokeLinecap="round" fill="none" strokeDasharray="2 22" strokeDashoffset={-flow - k * 7} />
          ))}
          {Array.from({length: 9}, (_, k) => {
            const life = ((t * 0.35 + k / 9) % 1);
            return <circle key={`w${k}`} cx={530 + Math.sin(life * 6 + k) * 30 * life} cy={870 - life * 280} r={14 + life * 46} fill={`rgba(207,224,240,${0.16 * Math.sin(Math.PI * life)})`} />;
          })}
          <path d="M 455 600 L 440 600 L 440 860 L 455 860 M 605 600 L 620 600 L 620 860 L 605 860" stroke={C.ivory} strokeWidth={3} fill="none" />
        </g>
        {/* inferred: magma body at depth (dashed) */}
        <g opacity={magma}>
          <ellipse cx={530} cy={1360} rx={250} ry={95} fill="url(#mag)" opacity={0.75 + 0.15 * Math.sin(t * 2)} />
          <ellipse cx={530} cy={1360} rx={250} ry={95} fill="none" stroke={C.sky} strokeWidth={3} strokeDasharray="16 12" strokeDashoffset={-t * 10} />
          <text x={530} y={1378} textAnchor="middle" fontFamily={DISPLAY} fontWeight={900} fontSize={54} fill="rgba(255,240,220,0.85)">?</text>
        </g>
        <g opacity={paths} stroke={C.sky} strokeWidth={3} fill="none" strokeDasharray="8 10" strokeDashoffset={-flow}>
          <path d="M 500 1268 C 495 1150, 520 1030, 528 945" />
          <path d="M 560 1268 C 570 1150, 540 1030, 532 945" />
        </g>
        {label(80, 560, 'obs', 'HCl gas above fissures', 'ORBITER', plume)}
        {label(600, 1000, 'inf', 'Magma at depth', 'NOT SEEN', magma)}
        {/* no eruption */}
        <g opacity={noE} transform={`translate(540 1600) scale(${0.9 + 0.1 * noE})`}>
          <rect x={-330} y={-50} width={660} height={92} rx={46} fill="rgba(6,6,8,0.8)" stroke={C.lava} strokeWidth={2.5} />
          <text x={-270} y={14} fontFamily={DISPLAY} fontWeight={900} fontSize={44} fill={C.lava}>✕</text>
          <text x={-220} y={12} fontFamily={MONO} fontSize={26} letterSpacing="2" fill={C.ivory}>NEW ERUPTION: NOT SEEN</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
