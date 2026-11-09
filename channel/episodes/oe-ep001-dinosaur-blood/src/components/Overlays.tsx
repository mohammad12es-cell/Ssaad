import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {DISPLAY, MONO} from '../fonts';
import {subtitles} from '../timeline';
import {C, lerpT, mulberry32, window01} from '../utils';
import {Easing} from 'remotion';

/** Volumetric-looking fog: large soft blobs drifting at different depths. */
export const Fog: React.FC<{seed?: number; count?: number; color?: string; opacity?: number; speed?: number; y?: [number, number]; blur?: number}> = ({
  seed = 1,
  count = 9,
  color = '120,100,82',
  opacity = 0.22,
  speed = 1,
  y = [0, 1920],
  blur = 60,
}) => {
  const frame = useCurrentFrame();
  const blobs = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: count}, () => ({
      x: r() * 1400 - 160,
      y: y[0] + r() * (y[1] - y[0]),
      w: 500 + r() * 900,
      h: 220 + r() * 420,
      v: (0.4 + r() * 1.2) * (r() > 0.5 ? 1 : -1),
      a: 0.4 + r() * 0.6,
      ph: r() * 6.28,
    }));
  }, [seed, count, y]);
  const t = frame / 30;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', filter: `blur(${blur}px)`}}>
      {blobs.map((b, i) => {
        const x = ((b.x + t * b.v * 28 * speed + 1600) % 1800) - 300;
        const a = b.a * (0.75 + 0.25 * Math.sin(t * 0.6 + b.ph));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - b.w / 2,
              top: b.y - b.h / 2 + Math.sin(t * 0.3 + b.ph) * 30,
              width: b.w,
              height: b.h,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, rgba(${color},${opacity * a}) 0%, rgba(${color},0) 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Floating dust motes catching light. */
export const Dust: React.FC<{seed?: number; count?: number; color?: string; area?: [number, number, number, number]; drift?: number; size?: number; opacity?: number}> = ({
  seed = 3,
  count = 70,
  color = '232,220,196',
  area = [0, 0, 1080, 1920],
  drift = 1,
  size = 1,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const motes = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: count}, () => ({x: r(), y: r(), z: r(), ph: r() * 6.28, v: 0.3 + r()}));
  }, [seed, count]);
  const [ax, ay, aw, ah] = area;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <defs>
        <filter id={`dustblur${seed}`}>
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <g filter={`url(#dustblur${seed})`}>
        {motes.map((m, i) => {
          const x = ax + ((m.x * aw + Math.sin(t * 0.4 * m.v + m.ph) * 40 + t * 12 * drift * m.v) % aw);
          const y = ay + ((m.y * ah - t * 18 * drift * m.v + ah * 10) % ah);
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 * m.v + m.ph));
          return <circle key={i} cx={x} cy={y} r={(1 + m.z * 3.2) * size} fill={`rgba(${color},${0.55 * tw * opacity})`} />;
        })}
      </g>
    </svg>
  );
};

/** Cinematic grade: vignette, warm/cool split, animated film grain. */
export const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,24,28,0.18) 0%, rgba(0,0,0,0) 40%, rgba(40,22,10,0.16) 100%)', mixBlendMode: 'soft-light'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.85) 100%)'}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.09, mixBlendMode: 'overlay'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 17} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** On-screen headline (inside Shorts safe area). */
export const Headline: React.FC<{text: string; from: number; to: number; y?: number; size?: number; accent?: boolean}> = ({text, from, to, y = 300, size = 78, accent = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const vis = window01(t, from, to, 0.6, 0.5);
  if (vis <= 0) return null;
  const inP = lerpT(t, from, from + 0.9, 0, 1, Easing.out(Easing.cubic));
  const outP = lerpT(t, to - 0.5, to);
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        width: 860,
        top: y,
        textAlign: 'center',
        opacity: vis,
        transform: `translateY(${(1 - inP) * 26 - outP * 18}px)`,
        filter: `blur(${(1 - inP) * 10 + outP * 6}px)`,
      }}
    >
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: `${0.02 + (1 - inP) * 0.12}em`,
          color: C.ivory,
          textShadow: '0 4px 30px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)',
        }}
      >
        {text}
      </div>
      {accent && (
        <div
          style={{
            margin: '22px auto 0',
            height: 4,
            width: 180 * inP,
            background: `linear-gradient(90deg, rgba(224,102,47,0), ${C.ember}, rgba(224,102,47,0))`,
            boxShadow: `0 0 16px ${C.ember}`,
          }}
        />
      )}
    </div>
  );
};

/** Small label that marks reconstructions as visualizations. */
export const VizTag: React.FC<{text: string; from: number; to: number; y?: number}> = ({text, from, to, y = 196}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const vis = window01(t, from, to, 0.4, 0.4);
  if (vis <= 0) return null;
  return (
    <div style={{position: 'absolute', top: y, left: 0, width: 960, display: 'flex', justifyContent: 'center', opacity: vis * 0.92}}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 23,
          letterSpacing: '0.14em',
          color: C.ivoryDim,
          padding: '9px 18px',
          border: '1.5px solid rgba(232,220,196,0.35)',
          borderRadius: 6,
          background: 'rgba(10,8,7,0.55)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{width: 10, height: 10, borderRadius: 5, background: C.ember, boxShadow: `0 0 10px ${C.ember}`}} />
        {text}
      </div>
    </div>
  );
};

/** Subtitles: concise phrases, bottom-center, clear of Shorts UI on the right/bottom. */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const cur = subtitles.find((s) => t >= s.start - 0.05 && t < s.end + 0.05);
  if (!cur) return null;
  const inP = lerpT(t, cur.start - 0.05, cur.start + 0.12, 0, 1, Easing.out(Easing.quad));
  return (
    <div style={{position: 'absolute', top: 1335, left: 90, width: 840, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 50,
          lineHeight: 1.2,
          textAlign: 'center',
          color: '#f4ecdc',
          padding: '12px 24px',
          borderRadius: 14,
          background: 'rgba(8,6,5,0.62)',
          opacity: inP,
          transform: `translateY(${(1 - inP) * 10}px) scale(${0.97 + 0.03 * inP})`,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {cur.text}
      </div>
    </div>
  );
};
