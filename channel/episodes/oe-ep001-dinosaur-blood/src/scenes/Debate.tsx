import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {DISPLAY, MONO} from '../fonts';
import {Dust} from '../components/Overlays';
import {C, lerpT} from '../utils';

const Item: React.FC<{t: number; at: number; icon: 'check' | 'q'; children: React.ReactNode}> = ({t, at, icon, children}) => {
  const p = lerpT(t, at, at + 0.5, 0, 1, Easing.out(Easing.cubic));
  return (
    <div style={{display: 'flex', gap: 14, alignItems: 'flex-start', opacity: p, transform: `translateX(${(1 - p) * -24}px)`, marginBottom: 22}}>
      <div
        style={{
          flex: '0 0 34px',
          height: 34,
          borderRadius: 17,
          border: `2px solid ${icon === 'check' ? C.ivory : C.ember}`,
          color: icon === 'check' ? C.ivory : C.ember,
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {icon === 'check' ? '✓' : '?'}
      </div>
      <div style={{fontFamily: DISPLAY, fontWeight: 500, fontSize: 29, lineHeight: 1.22, color: C.ivory}}>{children}</div>
    </div>
  );
};

/** Researcher at a microscope (silhouette). */
const Researcher: React.FC<{t: number}> = ({t}) => (
  <svg viewBox="0 0 400 260" width={400} height={260} style={{position: 'absolute', left: 16, bottom: 0}}>
    <defs>
      <radialGradient id="lamp" cx="0.72" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffcf9a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffcf9a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx={285} cy={150} rx={130} ry={90} fill="url(#lamp)" opacity={0.8 + 0.1 * Math.sin(t * 2)} />
    <g fill="#070605">
      {/* desk */}
      <rect x={0} y={232} width={400} height={28} />
      {/* microscope */}
      <rect x={250} y={214} width={90} height={18} rx={4} />
      <path d="M 320 214 L 326 120 C 327 100, 312 92, 298 98 L 292 102 L 300 112 C 308 108, 312 114, 311 122 L 306 214 Z" />
      <rect x={268} y={176} width={56} height={8} rx={3} />
      <path d="M 276 96 L 296 150 L 284 156 L 262 102 Z" />
      <rect x={258} y={86} width={22} height={18} rx={4} transform="rotate(-22 269 95)" />
      {/* person: head bent to eyepiece, shoulders, arm to stage */}
      <g transform={`rotate(${Math.sin(t * 0.9) * 1.2} 170 150)`}>
        <circle cx={232} cy={92} r={30} />
        <path d="M 120 232 C 118 170, 140 130, 190 118 C 214 112, 230 116, 240 124 L 214 150 C 236 160, 262 172, 286 176 L 284 188 C 250 188, 220 182, 196 172 L 190 232 Z" />
      </g>
    </g>
    {/* sample glow on the stage */}
    <ellipse cx={296} cy={176} rx={10} ry={3} fill={C.ember} opacity={0.9} />
  </svg>
);

/** Scene 5 — split screen: what the evidence shows vs. what is still debated. */
export const Debate: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const inL = lerpT(t, 0, 0.8, 0, 1, Easing.out(Easing.cubic));
  const inR = lerpT(t, 0.35, 1.15, 0, 1, Easing.out(Easing.cubic));
  const push = lerpT(t, 0, dur, 0, 1, Easing.linear);
  const qGlow = 0.6 + 0.4 * Math.sin(t * 2.2);
  const panel: React.CSSProperties = {
    position: 'absolute',
    top: 560,
    height: 680,
    width: 430,
    borderRadius: 22,
    padding: '30px 26px',
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, rgba(36,29,24,0.92), rgba(16,13,11,0.92))',
    border: '1.5px solid rgba(232,220,196,0.18)',
    overflow: 'hidden',
  };
  const head: React.CSSProperties = {fontFamily: MONO, fontSize: 24, letterSpacing: '0.18em', marginBottom: 26};
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #1d1814 0%, #0a0807 70%)', transform: `scale(${1.02 + push * 0.04})`}}>
      <Dust seed={31} count={60} drift={0.3} opacity={0.5} color="201,183,154" />
      <div style={{...panel, left: 70, opacity: inL, transform: `translateX(${(1 - inL) * -120}px)`}}>
        <div style={{...head, color: C.ivoryDim}}>THE EVIDENCE</div>
        <Item t={t} at={0.9} icon="check">Heme B detected by chemical analysis</Item>
        <Item t={t} at={1.5} icon="check">Cell-like shapes inside blood-vessel canals</Item>
        <Item t={t} at={2.1} icon="check">Mineralized, apparently by hausmannite</Item>
        <Researcher t={t} />
      </div>
      {/* divider */}
      <div style={{position: 'absolute', left: 529, top: 560 + (1 - inR) * 340, width: 2, height: 680 * inR, background: `linear-gradient(180deg, rgba(224,102,47,0), ${C.ember}, rgba(224,102,47,0))`, boxShadow: `0 0 18px ${C.ember}`}} />
      <div style={{...panel, left: 560, opacity: inR, transform: `translateX(${(1 - inR) * 120}px)`}}>
        <div style={{...head, color: C.ember}}>THE QUESTION</div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 250,
            lineHeight: 1,
            textAlign: 'center',
            color: C.ivory,
            margin: '-6px 0 18px',
            textShadow: `0 0 ${30 + qGlow * 30}px rgba(224,102,47,${0.5 + qGlow * 0.4})`,
            transform: `perspective(600px) rotateY(${Math.sin(t * 0.8) * 16}deg)`,
          }}
        >
          ?
        </div>
        <Item t={t} at={2.6} icon="q">Not intact blood, protein or DNA</Item>
        <Item t={t} at={3.3} icon="q">Some experts question their size and shape</Item>
      </div>
    </AbsoluteFill>
  );
};
