// The Last Log: shared vector art for EP01 (Flannan Isles).
// Plain SVG strings so the same art drops straight into HyperFrames compositions.
const INK = '#2a211b', PAPER = '#efe3c8', RED = '#b3261e', SKIN = '#e0b48e';
const SERIF = "Caladea, 'Bitstream Charter', 'DejaVu Serif', serif";
const MONO = "'Courier 10 Pitch', 'DejaVu Sans Mono', monospace";

function defs() {
  return `<defs>
  <filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/>
    <feDisplacementMap in="SourceGraphic" scale="4"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7"/>
    <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .14  0 0 0 .6 0"/></filter>
  <filter id="wash"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11"/>
    <feColorMatrix values="0 0 0 0 .45  0 0 0 0 .33  0 0 0 0 .2  0 0 0 .35 0"/></filter>
  <filter id="glow"><feGaussianBlur stdDeviation="18"/></filter>
  <radialGradient id="vig" cx="50%" cy="45%" r="75%">
    <stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#1e1208" stop-opacity=".6"/></radialGradient>
  </defs>`;
}
// paper texture overlay: wash = soft watercolor blotches, grain = fine tooth
const texture = (w, h) => `<rect width="${w}" height="${h}" filter="url(#wash)"/><rect width="${w}" height="${h}" filter="url(#grain)" opacity=".45"/><rect width="${w}" height="${h}" fill="url(#vig)"/>`;

// ---------- characters (origin = between the feet, ~620px tall) ----------
function figure(o) {
  const s = o.shoulder || 95, w = o.waist || 80, rx = o.headRx || 58, hem = o.hem || -195;
  const coat = o.coat, L = o.legs || '#2b2f3a', st = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
  const arm = (side) => {
    const x = side * s, d = `M${x - side * 8},-398 Q${x + side * 26},-300 ${x + side * 12},-${o.armEnd || 212}`;
    let a = `<path d="${d}" stroke="${INK}" stroke-width="56" stroke-linecap="round" fill="none"/>
             <path d="${d}" stroke="${o.sleeve || coat}" stroke-width="45" stroke-linecap="round" fill="none"/>`;
    if (o.rolled) a += `<path d="M${x + side * 22},-285 L${x + side * 12},-216" stroke="${INK}" stroke-width="44" stroke-linecap="round"/>
             <path d="M${x + side * 22},-285 L${x + side * 12},-216" stroke="${SKIN}" stroke-width="34" stroke-linecap="round"/>`;
    return a + `<circle cx="${x + side * 12}" cy="-${(o.armEnd || 212) - 6}" r="21" fill="${SKIN}" ${st}/>`;
  };
  let g = '';
  g += `<path d="M${-w + 8},-205 L${-w + 14},-30 L-10,-30 L-4,-205Z M4,-205 L10,-30 L${w - 14},-30 L${w - 8},-205Z" fill="${L}" ${st}/>`;
  g += `<ellipse cx="${-w / 2}" cy="-18" rx="${w / 2 + 8}" ry="18" fill="#1a1512" ${st}/><ellipse cx="${w / 2}" cy="-18" rx="${w / 2 + 8}" ry="18" fill="#1a1512" ${st}/>`;
  g += arm(-1) + arm(1);
  g += `<rect x="-20" y="-445" width="40" height="40" fill="${SKIN}" ${st}/>`;
  g += `<path d="M${-s},-408 Q0,-438 ${s},-408 L${w + 10},${hem} L${-w - 10},${hem}Z" fill="${coat}" ${st}/>`;
  g += o.torso || '';
  // head
  g += `<ellipse cx="${-rx}" cy="-488" rx="11" ry="16" fill="${SKIN}" ${st}/><ellipse cx="${rx}" cy="-488" rx="11" ry="16" fill="${SKIN}" ${st}/>`;
  g += `<ellipse cx="0" cy="-490" rx="${rx}" ry="70" fill="${SKIN}" ${st}/>`;
  if (o.hair) g += `<path d="M${-rx - 2},-500 Q${-rx},-566 0,-566 Q${rx},-566 ${rx + 2},-500 Q${rx - 8},-536 0,-540 Q${-rx + 8},-536 ${-rx - 2},-500Z" fill="${o.hair}" ${st}/>`;
  if (o.whiskers) g += `<path d="M${-rx + 2},-505 Q${-rx - 10},-440 ${-rx + 26},-430 Q${-rx + 18},-470 ${-rx + 14},-505Z M${rx - 2},-505 Q${rx + 10},-440 ${rx - 26},-430 Q${rx - 18},-470 ${rx - 14},-505Z" fill="${o.whiskers}" ${st}/>`;
  if (o.beard) g += `<path d="M${-rx + 2},-492 Q${-rx},-402 0,-388 Q${rx},-402 ${rx - 2},-492 Q${rx - 12},-452 0,-448 Q${-rx + 12},-452 ${-rx + 2},-492Z" fill="${o.beard}" ${st}/>` +
    (o.fleck ? `<path d="M-30,-425 l8,-14 M10,-410 l6,-16 M30,-432 l7,-12 M-12,-404 l4,-12" stroke="${o.fleck}" stroke-width="3"/>` : '');
  const by = o.worried ? 6 : 0;
  g += `<path d="M-34,${-514 - by} L-10,${-514 + by}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M10,${-514 + by} L34,${-514 - by}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
  g += `<ellipse cx="-22" cy="-496" rx="6" ry="8" fill="${INK}"/><ellipse cx="22" cy="-496" rx="6" ry="8" fill="${INK}"/>`;
  g += `<path d="M2,-490 q8,18 -6,22" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (!o.beard) g += `<path d="M-13,-450 q13,${o.mouth ?? 3} 26,0" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  if (o.tache) g += `<path d="M-30,-462 q15,-14 30,-5 q15,-9 30,5 q-14,10 -30,3 q-16,7 -30,-3Z" fill="${o.tache}" ${st}/>`;
  g += o.hat || '';
  g += o.prop || '';
  return `<g filter="url(#ink)">${g}</g>`;
}
const buttons = (c, y0, n, dy = 38) => Array.from({ length: n }, (_, i) => `<circle cx="0" cy="${y0 + i * dy}" r="6" fill="${c}" stroke="${INK}" stroke-width="3"/>`).join('');

const CAST = {
  ducat: () => figure({ coat: '#26324a', beard: '#3a2a20', fleck: '#cfc6b8', hair: '#3a2a20',
    torso: `<path d="M0,-420 L0,-200" stroke="${INK}" stroke-width="3"/>` + buttons('#c9a227', -395, 5),
    hat: `<path d="M-62,-538 Q-60,-596 0,-598 Q60,-596 62,-538Z" fill="#26324a" stroke="${INK}" stroke-width="5"/>
          <path d="M-64,-540 q60,16 104,-2 l22,14 q-62,16 -126,4Z" fill="#141720" stroke="${INK}" stroke-width="5"/>
          <circle cx="0" cy="-565" r="10" fill="#c9a227" stroke="${INK}" stroke-width="3"/>` }),
  marshall: () => figure({ coat: '#7d7a72', headRx: 52, shoulder: 88, waist: 74, mouth: 0,
    torso: `<path d="M-40,-418 Q0,-392 40,-418 Q0,-372 -40,-418Z" fill="#6a675f" stroke="${INK}" stroke-width="4"/>` +
      [-360, -320, -280, -240].map(y => `<path d="M-70,${y} Q0,${y + 8} 70,${y}" stroke="#5c5a53" stroke-width="3" fill="none"/>`).join(''),
    hat: `<path d="M-58,-532 Q-56,-588 6,-590 Q64,-586 70,-548 L88,-536 Q30,-524 -58,-532Z" fill="#6b5a45" stroke="${INK}" stroke-width="5"/>` }),
  macarthur: () => figure({ coat: '#f1ebdd', sleeve: '#f1ebdd', rolled: true, shoulder: 112, waist: 92, headRx: 62,
    hair: '#b4562a', tache: '#b4562a', mouth: 2,
    torso: `<path d="M-84,-400 L-30,-400 L0,-330 L30,-400 L84,-400 L${92},-198 L-92,-198Z" fill="#6e4a2e" stroke="${INK}" stroke-width="5"/>` + buttons('#d8cbb0', -320, 3, 40) }),
  moore: () => figure({ coat: '#c9962a', hem: -96, legs: '#2f2a26', headRx: 54, worried: true, mouth: -4,
    torso: `<path d="M0,-420 L0,-100" stroke="${INK}" stroke-width="4"/><path d="M-60,-300 q10,60 0,140 M58,-280 q-8,70 4,150" stroke="#9c7019" stroke-width="5" fill="none"/>`,
    hat: `<ellipse cx="0" cy="-536" rx="98" ry="20" fill="#b9861f" stroke="${INK}" stroke-width="5"/>
          <path d="M-56,-540 Q-52,-596 0,-598 Q52,-596 56,-540Z" fill="#c9962a" stroke="${INK}" stroke-width="5"/>`,
    prop: `<circle cx="108" cy="-150" r="70" fill="#ffd27a" opacity=".35" filter="url(#glow)"/>
           <path d="M108,-200 v-12" stroke="${INK}" stroke-width="5"/><rect x="86" y="-200" width="44" height="64" rx="6" fill="#ffe2a0" stroke="${INK}" stroke-width="5"/>
           <path d="M86,-168 h44 M108,-200 v64" stroke="${INK}" stroke-width="3"/>` }),
  muirhead: () => figure({ coat: '#23201f', hem: -112, whiskers: '#eeeae2', hair: '#d9d4ca', headRx: 56, mouth: 0,
    torso: `<path d="M-30,-412 L0,-330 L30,-412 L18,-412 L0,-360 L-18,-412Z" fill="#f1ebdd" stroke="${INK}" stroke-width="4"/>` +
      `<path d="M-34,-410 L-6,-320 L-20,-250 M34,-410 L6,-320 L20,-250" stroke="#4a4542" stroke-width="5" fill="none"/>`,
    hat: `<ellipse cx="0" cy="-540" rx="78" ry="14" fill="#1a1817" stroke="${INK}" stroke-width="5"/>
          <path d="M-48,-542 Q-50,-610 0,-612 Q50,-610 48,-542Z" fill="#1a1817" stroke="${INK}" stroke-width="5"/>`,
    prop: `<rect x="-150" y="-236" width="46" height="60" rx="3" fill="#f4eee0" stroke="${INK}" stroke-width="5" transform="rotate(-10 -127 -206)"/>
           <path d="M-142,-222 h28 M-142,-210 h28 M-142,-198 h20" stroke="${INK}" stroke-width="2.5" transform="rotate(-10 -127 -206)"/>` }),
};
