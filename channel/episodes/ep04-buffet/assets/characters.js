// Shared SVG character art for Pip (frog) & Pebble (snail)
window.PIP = (x, y, s = 1) => `
<g transform="translate(${x},${y}) scale(${s})">
  <ellipse cx="0" cy="150" rx="190" ry="40" fill="rgba(0,0,0,0.18)"/>
  <path d="M-190,60 C-200,-80 -120,-150 0,-150 C120,-150 200,-80 190,60 C180,140 100,165 0,165 C-100,165 -180,140 -190,60 Z" fill="#5fcf6a"/>
  <path d="M-120,70 C-110,140 110,140 120,70 C80,40 -80,40 -120,70 Z" fill="#c9f2a8"/>
  <circle cx="-85" cy="-150" r="78" fill="#5fcf6a"/><circle cx="85" cy="-150" r="78" fill="#5fcf6a"/>
  <circle cx="-85" cy="-152" r="58" fill="#fff"/><circle cx="85" cy="-152" r="58" fill="#fff"/>
  <circle cx="-74" cy="-145" r="30" fill="#1b1a2e"/><circle cx="96" cy="-145" r="30" fill="#1b1a2e"/>
  <circle cx="-64" cy="-158" r="10" fill="#fff"/><circle cx="106" cy="-158" r="10" fill="#fff"/>
  <path d="M-95,-20 C-50,35 50,35 95,-20" fill="none" stroke="#1b1a2e" stroke-width="14" stroke-linecap="round"/>
  <ellipse cx="-130" cy="-10" rx="26" ry="16" fill="#ff8fb1" opacity="0.8"/><ellipse cx="130" cy="-10" rx="26" ry="16" fill="#ff8fb1" opacity="0.8"/>
</g>`;
window.PEBBLE = (x, y, s = 1) => `
<g transform="translate(${x},${y}) scale(${s})">
  <ellipse cx="0" cy="92" rx="170" ry="26" fill="rgba(0,0,0,0.18)"/>
  <path d="M-170,80 C-170,40 -120,30 -60,30 L120,30 C150,30 165,-10 160,-60 C175,-60 190,-20 185,20 C180,70 150,90 100,90 L-150,90 Z" fill="#ffd166"/>
  <line x1="150" y1="-50" x2="135" y2="-120" stroke="#ffd166" stroke-width="12" stroke-linecap="round"/>
  <line x1="172" y1="-45" x2="190" y2="-115" stroke="#ffd166" stroke-width="12" stroke-linecap="round"/>
  <circle cx="133" cy="-128" r="18" fill="#fff"/><circle cx="192" cy="-123" r="18" fill="#fff"/>
  <circle cx="137" cy="-125" r="8" fill="#1b1a2e"/><circle cx="196" cy="-120" r="8" fill="#1b1a2e"/>
  <path d="M150,0 C160,14 175,14 182,2" fill="none" stroke="#1b1a2e" stroke-width="6" stroke-linecap="round"/>
  <circle cx="-20" cy="-40" r="105" fill="#ff7b6b"/>
  <path d="M-20,-40 m0,-80 a80,80 0 1,1 -1,0 M-20,-40 m0,-55 a55,55 0 1,0 1,0 M-20,-40 m0,-30 a30,30 0 1,1 -1,0" fill="none" stroke="#c94f63" stroke-width="10"/>
  <circle cx="-55" cy="-95" r="14" fill="#fff" opacity="0.6"/>
</g>`;
