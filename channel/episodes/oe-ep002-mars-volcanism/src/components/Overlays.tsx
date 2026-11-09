import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {DISPLAY, MONO} from '../fonts';
import {captions} from '../timeline';
import {C, lerpT, mulberry32, window01} from '../utils';

/** Cinematic grade: vignette, cool-top / warm-bottom split, animated film grain. */
export const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(40,70,110,0.16) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(70,28,10,0.18) 100%)', mixBlendMode: 'soft-light'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 62% at 50% 48%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.45) 85%, rgba(0,0,0,0.75) 100%)'}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.08, mixBlendMode: 'overlay'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 17} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Top headline. A dark scrim behind it keeps it readable over bright Mars. */
export const Headline: React.FC<{text: string; from: number; to: number; y?: number; size?: number; color?: string}> = ({text, from, to, y = 290, size = 80, color = C.ivory}) => {
  const t = useCurrentFrame() / 30;
  const vis = window01(t, from, to, 0.5, 0.4);
  if (vis <= 0) return null;
  const inP = lerpT(t, from, from + 0.8, 0, 1, Easing.out(Easing.cubic));
  const outP = lerpT(t, to - 0.4, to);
  const words = text.split(' ');
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: y + 380, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)', opacity: vis}} />
      <div style={{position: 'absolute', left: 90, width: 860, top: y, textAlign: 'center', opacity: vis, transform: `translateY(${-outP * 16}px)`, filter: `blur(${outP * 5}px)`}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1.04, letterSpacing: '0.01em', color, textShadow: '0 4px 28px rgba(0,0,0,0.9)'}}>
          {words.map((w, i) => {
            const p = lerpT(t, from + i * 0.07, from + i * 0.07 + 0.45, 0, 1, Easing.out(Easing.back(1.6)));
            return (
              <span key={i} style={{display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${0.85 + 0.15 * p})`, marginRight: '0.24em'}}>
                {w}
              </span>
            );
          })}
        </div>
        <div style={{margin: '20px auto 0', height: 4, width: 200 * inP, background: `linear-gradient(90deg, rgba(255,122,42,0), ${C.lava}, rgba(255,122,42,0))`, boxShadow: `0 0 16px ${C.lava}`}} />
      </div>
    </>
  );
};

/** Evidence-status tag: OBSERVED (solid, ivory) vs VISUALIZATION / HYPOTHESIS (dashed, blue). */
export const Tag: React.FC<{text: string; from: number; to: number; kind?: 'observed' | 'viz' | 'render'; y?: number}> = ({text, from, to, kind = 'viz', y = 200}) => {
  const t = useCurrentFrame() / 30;
  const vis = window01(t, from, to, 0.35, 0.35);
  if (vis <= 0) return null;
  const col = kind === 'observed' ? C.ivory : kind === 'viz' ? C.sky : C.ivoryDim;
  return (
    <div style={{position: 'absolute', top: y, left: 0, width: 960, display: 'flex', justifyContent: 'center', opacity: vis}}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 24,
          letterSpacing: '0.14em',
          color: col,
          padding: '9px 18px',
          border: `2px ${kind === 'observed' ? 'solid' : 'dashed'} ${col}`,
          borderRadius: 6,
          background: 'rgba(6,6,8,0.62)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{width: 10, height: 10, borderRadius: 5, background: kind === 'observed' ? C.lava : 'transparent', border: kind === 'observed' ? 'none' : `2px solid ${col}`}} />
        {text}
      </div>
    </div>
  );
};

/** Animated captions: word-by-word reveal with the spoken word highlighted. */
export const Captions: React.FC = () => {
  const t = useCurrentFrame() / 30;
  const g = captions.find((c) => t >= c.start - 0.08 && t < c.end);
  if (!g) return null;
  const gin = lerpT(t, g.start - 0.08, g.start + 0.1, 0, 1, Easing.out(Easing.quad));
  return (
    <div style={{position: 'absolute', top: 1330, left: 80, width: 860, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 60,
          lineHeight: 1.18,
          textAlign: 'center',
          padding: '12px 26px',
          borderRadius: 16,
          background: 'rgba(6,5,5,0.66)',
          opacity: gin,
          transform: `scale(${0.96 + 0.04 * gin})`,
        }}
      >
        {g.words.map((w, i) => {
          const on = t >= w.start - 0.03;
          const active = t >= w.start - 0.03 && t < w.end;
          const p = lerpT(t, w.start - 0.06, w.start + 0.08, 0, 1, Easing.out(Easing.back(2)));
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: i < g.words.length - 1 ? '0.26em' : 0,
                color: active ? '#ffb27a' : on ? '#f6eee2' : 'rgba(246,238,226,0.35)',
                transform: `translateY(${(1 - p) * 8}px) scale(${active ? 1.06 : 1})`,
                textShadow: active ? '0 0 18px rgba(255,122,42,0.6)' : '0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Floating dust motes. */
export const Dust: React.FC<{seed?: number; count?: number; color?: string; opacity?: number; drift?: number}> = ({seed = 3, count = 60, color = '255,210,170', opacity = 1, drift = 1}) => {
  const t = useCurrentFrame() / 30;
  const motes = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: count}, () => ({x: r(), y: r(), z: r(), ph: r() * 6.28, v: 0.3 + r()}));
  }, [seed, count]);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {motes.map((m, i) => {
        const x = (m.x * 1080 + Math.sin(t * 0.4 * m.v + m.ph) * 40 + t * 14 * drift * m.v) % 1080;
        const y = (m.y * 1920 - t * 20 * drift * m.v + 19200) % 1920;
        return <circle key={i} cx={x} cy={y} r={1 + m.z * 3} fill={`rgba(${color},${0.5 * opacity * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 * m.v + m.ph)))})`} />;
      })}
    </svg>
  );
};
