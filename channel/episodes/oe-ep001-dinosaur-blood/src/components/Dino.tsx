import React from 'react';
import {C} from '../utils';

/** Original small-theropod (coelurosaur) side profile, viewBox 0 0 1000 600, facing right. */
export const BODY =
  'M 40 258 C 150 240, 300 190, 430 170 C 500 158, 590 160, 650 192 C 690 205, 710 170, 735 140 ' +
  'C 750 118, 775 105, 805 104 C 850 102, 905 115, 948 140 L 952 153 C 900 172, 840 180, 800 178 ' +
  'C 770 182, 755 200, 745 225 C 735 255, 720 285, 700 305 C 680 330, 640 345, 590 345 ' +
  'C 540 345, 480 330, 440 310 C 330 290, 180 275, 40 258 Z';
export const ARM = 'M 700 300 C 720 318, 736 334, 748 352 L 757 366 L 744 362 C 728 348, 706 332, 690 318 Z';
export const LEG =
  'M 410 205 C 480 185, 560 230, 550 300 C 545 330, 520 370, 505 410 L 495 440 L 530 515 L 575 528 ' +
  'L 572 540 L 500 542 L 478 532 L 470 450 C 465 420, 470 380, 480 350 C 470 320, 420 290, 395 250 Z';

export const DinoShape: React.FC<{fill?: string; legSwing?: number}> = ({fill = '#060505', legSwing = 0}) => (
  <g fill={fill}>
    <g transform={`rotate(${-6 + legSwing} 450 230) translate(-30 -6)`} opacity={0.85}>
      <path d={LEG} />
    </g>
    <path d={BODY} />
    <path d={ARM} />
    <g transform={`rotate(${4 - legSwing} 450 230)`}>
      <path d={LEG} />
    </g>
  </g>
);

/** Backlit silhouette in fog with a blood glow at the chest that pulses with the heartbeat. */
export const DinoSilhouette: React.FC<{glow: number; pulse: number; rim?: number; legSwing?: number}> = ({glow, pulse, rim = 1, legSwing = 0}) => (
  <svg viewBox="0 0 1000 600" width="100%" height="100%" style={{overflow: 'visible'}}>
    <defs>
      <filter id="rim" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="10" />
      </filter>
      <filter id="softglow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="22" />
      </filter>
      <clipPath id="bodyclip">
        <path d={BODY} />
        <path d={ARM} />
      </clipPath>
      <radialGradient id="bloodglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ff8a4a" stopOpacity="1" />
        <stop offset="0.35" stopColor={C.ember} stopOpacity="0.75" />
        <stop offset="1" stopColor={C.deepRed} stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* rim light halo from the fog behind */}
    <g filter="url(#rim)" opacity={0.55 * rim}>
      <DinoShape fill="#8a6e52" legSwing={legSwing} />
    </g>
    <DinoShape legSwing={legSwing} />
    {/* red glow beneath the skin */}
    <g clipPath="url(#bodyclip)" style={{mixBlendMode: 'screen'}}>
      <ellipse cx={655} cy={265} rx={150 + pulse * 25} ry={95 + pulse * 15} fill="url(#bloodglow)" opacity={glow * (0.55 + 0.45 * pulse)} filter="url(#softglow)" />
      {/* vessel hints */}
      <g stroke="#ff7040" strokeWidth={3} fill="none" opacity={glow * 0.5 * (0.5 + pulse * 0.5)} filter="url(#rim)">
        <path d="M 520 250 C 580 240, 620 270, 700 250 C 730 240, 740 200, 760 180" />
        <path d="M 560 300 C 610 290, 640 310, 690 290" />
        <path d="M 430 230 C 470 240, 500 235, 540 250" />
      </g>
    </g>
  </svg>
);
