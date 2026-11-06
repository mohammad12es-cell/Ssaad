// EP01 scene art on a 1920x1920 square canvas.
// The long-form film frames a 1920x1080 window, the Shorts a 1080x1920 window, from the same art.
// Depends on ../design/lib.js (defs, texture, CAST, INK, PAPER, RED, SERIF, MONO).
const W = 1920, H = 1920;
const st = (c = INK, w = 5) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const waves = (y0, n, c, op, w = W) => Array.from({ length: n }, (_, i) => {
  const y = y0 + i * 70, o = (i % 2) * 60; let d = `M${-60 + o},${y}`;
  for (let x = -60 + o; x < w + 120; x += 120) d += ` q30,-22 60,0 q30,22 60,0`;
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="4" opacity="${op}"/>`; }).join('');
const sh = (x) => `<g transform="translate(420,0)">${x}</g>`; // shift portrait-era art to centre
const stars = (n, c = '#e9e1cc') => Array.from({ length: n }, (_, i) => `<circle cx="${(i * 397) % W}" cy="${60 + (i * 211) % 560}" r="${2 + (i % 3)}" fill="${c}" opacity=".75"/>`).join('');
const sky = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
const desk = (c1, c2) => `<rect width="${W}" height="${H}" fill="${c1}"/>` + Array.from({ length: 14 }, (_, i) => `<path d="M0,${i * 140 + 40} q960,${i % 2 ? 30 : -30} ${W},0" fill="none" stroke="${c2}" stroke-width="6"/>`).join('');
const sil = (x, y, s, coat = '#14100e') => `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="0" cy="-490" rx="58" ry="70" fill="#14100e"/><path d="M-90,-410 L90,-410 L80,0 L-80,0Z" fill="${coat}" stroke="#14100e" stroke-width="20"/></g>`;
const scrib = (x, y, n, len = 300, gap = 50, c = '#5a4a3a') => Array.from({ length: n }, (_, i) => { let d = `M${x},${y + i * gap}`; for (let k = 0; k < len; k += 60) d += ` q15,-9 30,0 t30,${(i + k) % 3 - 1}`; return `<path d="${d}" fill="none" ${st(c, 3)}/>`; }).join('');

function lighthouse(mode) { // mode: off | on | dawn
  const lamp = mode === 'off' ? '#05080d' : '#ffd27a';
  return `<g filter="url(#ink)">
   <path d="M120,1400 q80,-60 160,0Z M1660,1390 q90,-70 200,0Z" fill="#2a2622" ${st()}/>
   <path d="M540,1440 L650,1160 L750,1090 L850,990 L980,955 L1120,995 L1210,1100 L1330,1190 L1400,1440Z" fill="#2a2622" ${st()}/>
   <path d="M750,1090 L800,1250 M1120,995 L1080,1180 M1210,1100 L1250,1300" ${st('#46403a', 4)} fill="none"/>
   <rect x="840" y="905" width="120" height="58" fill="#cfc4ae" ${st()}/><path d="M830,907 L900,872 L970,907Z" fill="#5a4a3a" ${st()}/>
   <path d="M952,962 L976,660 L1044,660 L1068,962Z" fill="#ddd2bc" ${st()}/><path d="M966,800 h88 M972,720 h76" ${st('#9e9583', 3)}/>
   <rect x="954" y="640" width="112" height="20" fill="#3a3430" ${st()}/>
   <rect x="976" y="572" width="68" height="68" fill="${lamp}" ${st()}/><path d="M998,572 v68 M1022,572 v68" ${st('#2a2a2a', 3)}/>
   <path d="M970,574 Q1010,520 1050,574Z" fill="#3a3430" ${st()}/><path d="M1010,532 v-22" ${st()}/>
   <path d="M580,1440 q40,-90 90,-40 q20,-70 70,-20 M1280,1440 q30,-80 80,-30 q30,-60 70,0" fill="none" ${st('#e8eadf', 6)}/></g>` +
   (mode !== 'off' ? `<circle cx="1010" cy="606" r="120" fill="#ffd27a" opacity=".5" filter="url(#glow)"/>
   <path d="M1010,600 L1960,420 L1960,800Z M1010,600 L-40,470 L-40,720Z" fill="#ffe7a8" opacity="${mode === 'dawn' ? .12 : .22}"/>` : '');
}

const SCENES = {
  dark: () => sky('sk', '#0d141f', '#2d3b48') + stars(26) +
    `<path d="M-20,560 Q300,470 620,540 Q960,460 1300,530 Q1600,480 1940,520 L1940,700 L-20,700Z" fill="#1a2430" opacity=".9"/>
     <rect y="1330" width="${W}" height="600" fill="#17232c"/>${waves(1360, 9, '#9fb3b8', .35)}` + lighthouse('off') +
    `<g filter="url(#ink)" transform="translate(1440,1300)"><path d="M-90,0 L90,0 L70,34 L-74,34Z" fill="#14100e" ${st()}/><rect x="-30" y="-46" width="44" height="46" fill="#14100e" ${st()}/>
     <rect x="-12" y="-96" width="18" height="50" fill="#14100e" ${st()}/>${[-60, -30, 0, 30, 60].map(x => `<circle cx="${x}" cy="16" r="5" fill="#ffd27a"/>`).join('')}
     <path d="M-4,-100 q-30,-40 10,-70 q-30,-40 20,-80" fill="none" stroke="#6b737a" stroke-width="16" opacity=".55"/></g>`,
  lit: () => sky('sk', '#101a29', '#3a4a58') + stars(26) +
    `<rect y="1330" width="${W}" height="600" fill="#1c2a33"/>${waves(1360, 9, '#b9c9c9', .35)}` + lighthouse('on'),
  dawn: () => sky('sk', '#e7a874', '#6d7f8f') +
    `<circle cx="1500" cy="1250" r="140" fill="#f6d39a" opacity=".8"/><rect y="1330" width="${W}" height="600" fill="#4a5a64"/>${waves(1360, 9, '#f1d6b0', .35)}` + lighthouse('dawn'),
  map: () => `<rect width="${W}" height="${H}" fill="#e6d8ba"/>` +
    Array.from({ length: 40 }, (_, i) => `<path d="M0,${i * 48} H${W}" stroke="#b9c3bf" stroke-width="2" opacity=".5"/>`).join('') +
    `<g filter="url(#ink)"><path d="M1300,260 Q1420,200 1560,260 Q1700,300 1760,420 Q1820,600 1740,760 Q1700,900 1760,1040 Q1800,1220 1680,1380 Q1600,1520 1460,1620 Q1360,1700 1240,1640 Q1300,1500 1220,1400 Q1120,1300 1180,1160 Q1240,1040 1160,940 Q1080,820 1160,700 Q1240,600 1200,480 Q1220,320 1300,260Z" fill="#cdb98f" ${st()}/>
     <path d="M1250,520 q60,40 140,10 M1300,1100 q80,-30 160,20 M1260,1400 q70,30 150,-10" fill="none" ${st('#8a7a5a', 3)}/>
     ${[[470, 770, 22], [520, 800, 14], [440, 830, 12], [560, 760, 10], [500, 860, 9], [600, 820, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#5a4a3a" ${st(INK, 3)}/>`).join('')}
     <path d="M1180,770 C1000,700 760,720 545,790" fill="none" ${st(RED, 6)} stroke-dasharray="18 14"/>
     <g transform="translate(300,1560)"><circle r="90" fill="none" ${st(INK, 4)}/><path d="M0,-120 L20,0 L0,120 L-20,0Z" fill="${INK}"/><text y="-135" text-anchor="middle" font-family="${SERIF}" font-size="44" fill="${INK}">N</text></g></g>
     <g font-family="${SERIF}" fill="${INK}" text-anchor="middle"><text x="1480" y="760" font-size="58" letter-spacing="6">ISLE OF LEWIS</text>
     <text x="500" y="690" font-size="50" letter-spacing="5">FLANNAN ISLES</text><text x="500" y="1300" font-size="60" font-style="italic" fill="#5c6b70">Atlantic Ocean</text>
     <text x="860" y="690" font-size="36" font-style="italic" fill="${RED}">about 20 miles</text><text x="1240" y="850" font-size="30" font-style="italic">Lewis harbours</text></g>`,
  island: () => `<rect width="${W}" height="${H}" fill="#e6d8ba"/>` + waves(80, 26, '#9fb0b0', .35) +
    `<g filter="url(#ink)"><path d="M520,700 Q700,480 980,520 Q1300,520 1440,720 Q1560,940 1420,1180 Q1260,1420 940,1400 Q620,1380 520,1150 Q440,920 520,700Z" fill="#c9b892" ${st()}/>
     ${[0.85, 0.7, 0.55].map(k => `<ellipse cx="980" cy="960" rx="${430 * k}" ry="${400 * k}" fill="none" ${st('#9a8a68', 3)}/>`).join('')}
     <circle cx="980" cy="900" r="34" fill="#ddd2bc" ${st()}/><circle cx="980" cy="900" r="12" fill="${INK}"/>
     <path d="M980,900 Q760,980 560,1040 M980,900 Q1200,960 1420,980" fill="none" ${st(INK, 4)} stroke-dasharray="12 10"/>
     <circle cx="545" cy="1045" r="44" fill="none" ${st(RED, 8)}/><circle cx="1430" cy="985" r="30" fill="${INK}"/></g>
     <g font-family="${MONO}" font-weight="700" text-anchor="middle"><text x="545" y="1140" font-size="44" fill="${RED}">WEST LANDING</text>
     <text x="1430" y="1070" font-size="40" fill="${INK}">EAST LANDING</text><text x="980" y="840" font-size="36" fill="${INK}">LIGHTHOUSE</text>
     <text x="980" y="1560" font-size="40" fill="#5a4a3a">EILEAN MÒR</text></g>`,
  ship: () => sky('sk', '#0b111a', '#26333f') + stars(20) +
    `<rect y="1200" width="${W}" height="720" fill="#15212a"/>${waves(1240, 10, '#9fb3b8', .3)}
     <g filter="url(#ink)"><path d="M1640,1210 q60,-70 140,0Z" fill="#221f1c" ${st()}/><rect x="1702" y="1100" width="16" height="70" fill="#cfc4ae" ${st(INK, 3)}/><rect x="1698" y="1086" width="24" height="16" fill="#05080d" ${st(INK, 3)}/>
     <path d="M140,1180 L1460,1180 L1380,1420 L240,1420Z" fill="#141110" ${st()}/><rect x="520" y="1040" width="520" height="140" fill="#1d1916" ${st()}/>
     <rect x="760" y="820" width="90" height="220" fill="#2a1f1a" ${st()}/><path d="M800,810 q-80,-90 20,-170 q-80,-90 40,-200" fill="none" stroke="#5f666c" stroke-width="40" opacity=".5"/>
     ${Array.from({ length: 12 }, (_, i) => `<circle cx="${300 + i * 95}" cy="1290" r="11" fill="#ffd27a"/>`).join('')}
     <path d="M160,1180 H1440" ${st('#3a332e', 8)}/></g>` + sil(1180, 1180, .2) + sil(1260, 1182, .19) + sil(1330, 1180, .2),
  harbour: () => sky('sk', '#3b4648', '#6e7a78') +
    `<g filter="url(#ink)"><rect y="1300" width="${W}" height="620" fill="#2e3f45"/>${waves(1330, 9, '#c8d2cf', .4)}
     <path d="M-20,1180 L900,1180 L900,1920 L-20,1920Z" fill="#6a645a" ${st()}/>${Array.from({ length: 10 }, (_, i) => `<path d="M${i * 100},1180 V1920" ${st('#4e4940', 3)}/>`).join('')}
     <path d="M960,1290 L1680,1290 L1620,1450 L1010,1450Z" fill="#20252a" ${st()}/><rect x="1180" y="1150" width="260" height="140" fill="#2c3238" ${st()}/><rect x="1260" y="980" width="56" height="170" fill="#3a2f28" ${st()}/>
     <path d="M960,1300 L880,1190 M1660,1300 L1760,1180" ${st('#c2a878', 4)}/>
     <path d="M700,1200 q60,-260 220,-180 q-30,-160 140,-120 q100,30 60,160" fill="#e8eadf" opacity=".85" ${st('#c9d1cf', 4)}/></g>
     <text x="1300" y="1400" text-anchor="middle" font-family="${MONO}" font-size="34" fill="#d8cdb6">HESPERUS</text>` +
    Array.from({ length: 70 }, (_, i) => `<path d="M${(i * 137) % W},${(i * 251) % H} l-40,110" stroke="#d9e0df" stroke-width="3" opacity=".35"/>`).join(''),
  steps: () => sky('sk', '#6a7470', '#a3aaa2') +
    `<rect y="1500" width="${W}" height="420" fill="#2f4148"/>${waves(1530, 6, '#cfd8d3', .35)}
     <g filter="url(#ink)"><path d="M-20,1920 L-20,800 Q400,640 900,620 L1500,420 L1940,400 L1940,1500 L1300,1560 L800,1920Z" fill="#3a352f" ${st()}/>
     ${Array.from({ length: 14 }, (_, i) => `<path d="M${200 + i * 90},${1760 - i * 90} h70 v-30" fill="none" ${st('#7a7064', 5)}/>`).join('')}
     <path d="M1520,420 L1536,250 L1584,250 L1600,420Z" fill="#ddd2bc" ${st()}/><rect x="1530" y="215" width="60" height="36" fill="#05080d" ${st()}/></g>`,
  interior: () => `<rect width="${W}" height="${H}" fill="#b9aa8c"/><rect y="1380" width="${W}" height="540" fill="#5a4330"/>` +
    Array.from({ length: 7 }, (_, i) => `<path d="M0,${1420 + i * 80} H${W}" stroke="#3e2e21" stroke-width="5"/>`).join('') +
    `<g filter="url(#ink)"><rect x="1360" y="420" width="260" height="320" fill="#8d9a9e" ${st()}/><path d="M1490,420 V740 M1360,580 H1620" ${st(INK, 6)}/>
     <path d="M1360,740 L1180,1400 L1700,1400 L1620,740Z" fill="#d9cfb4" opacity=".25"/>
     <path d="M300,700 H760 V1400 H300Z" fill="#8a8072" ${st()}/><path d="M380,980 H680 V1400 H380Z" fill="#1a1715" ${st()}/><rect x="270" y="660" width="520" height="50" fill="#6a5f52" ${st()}/>
     <path d="M420,1380 q40,-30 80,0 q40,-30 80,0" fill="none" ${st('#5a5550', 5)}/>
     <circle cx="1000" cy="520" r="70" fill="#efe3c8" ${st()}/><path d="M1000,520 V470 M1000,520 L1036,540" ${st(INK, 6)}/>
     <rect x="1060" y="1080" width="560" height="40" fill="#7a5a3c" ${st()}/><path d="M1090,1120 V1400 M1590,1120 V1400" ${st('#5a3f2a', 16)}/>
     <ellipse cx="1220" cy="1066" rx="60" ry="16" fill="#e8e2d2" ${st(INK, 4)}/><rect x="1400" y="1030" width="50" height="50" rx="6" fill="#e8e2d2" ${st(INK, 4)}/>
     <path d="M880,1100 V1400 M880,1100 H980 V1250 M980,1250 V1400 M880,1250 H980" fill="none" ${st('#5a3f2a', 12)}/>
     <rect x="1700" y="900" width="240" height="90" fill="#6b5440" ${st()}/><rect x="1700" y="1180" width="240" height="90" fill="#6b5440" ${st()}/><rect x="1720" y="870" width="200" height="34" fill="#d8cfbc" ${st(INK, 3)}/></g>`,
  coat: () => `<rect width="${W}" height="${H}" fill="#5e4836"/>` + Array.from({ length: 16 }, (_, i) => `<path d="M${i * 125 + 20},0 V${H}" stroke="#3d2d21" stroke-width="5"/>`).join('') +
    `<rect y="1520" width="${W}" height="400" fill="#3b2b1f"/>${Array.from({ length: 5 }, (_, i) => `<path d="M0,${1560 + i * 80} H${W}" stroke="#2a1e15" stroke-width="5"/>`).join('')}` +
    sh(`<g filter="url(#ink)"><rect x="110" y="600" width="860" height="56" fill="#7a5c42" ${st()}/>
     ${[300, 540, 780].map(x => `<circle cx="${x}" cy="628" r="9" fill="#222" ${st('#111', 3)}/><path d="M${x},630 v54 q0,30 26,24" fill="none" ${st('#1d1d1d', 12)}/>`).join('')}
     <path d="M300,690 L240,720 Q170,760 160,840 L150,1330 Q300,1350 450,1330 L440,840 Q430,760 360,720Z" fill="#a8321f" ${st()}/>
     <path d="M240,720 Q300,780 360,720 L340,700 Q300,730 260,700Z" fill="#8a2717" ${st()}/>
     <path d="M168,820 Q110,980 132,1180 L182,1178 Q170,1000 200,860Z M432,820 Q490,980 468,1180 L418,1178 Q430,1000 400,860Z" fill="#952b1a" ${st()}/>
     <path d="M300,760 V1336 M230,900 q10,180 -6,400 M372,920 q-10,200 6,390" fill="none" ${st('#6e1d12', 4)}/>
     ${[820, 920, 1020, 1120].map(y => `<circle cx="314" cy="${y}" r="8" fill="#e6d6b4" ${st('#111', 3)}/>`).join('')}</g>`),
  ghosts: () => sh([540, 780].map(x => `<path d="M${x},700 L${x - 60},730 Q${x - 130},770 ${x - 140},850 L${x - 150},1330 Q${x},1350 ${x + 150},1330 L${x + 140},850 Q${x + 130},770 ${x + 60},730Z" fill="none" stroke="#efe3c8" stroke-width="5" stroke-dasharray="16 14" opacity=".7"/>`).join('')),
  log: () => desk('#4d3524', '#3a281b') + sh(`<circle cx="900" cy="300" r="190" fill="#ffcf73" opacity=".35" filter="url(#glow)"/>
   <g filter="url(#ink)"><rect x="870" y="300" width="56" height="180" fill="#efe3c8" ${st()}/><path d="M898,300 q-14,-40 0,-70 q14,30 0,70Z" fill="#ffb43a" ${st('#b8741a', 3)}/>
   <g transform="rotate(-4 540 900)"><path d="M110,560 Q330,520 540,580 Q750,520 970,560 L970,1280 Q750,1240 540,1300 Q330,1240 110,1280Z" fill="#efe3c8" ${st()}/>
    <path d="M540,580 V1300" ${st('#8a7a63', 4)}/>${scrib(160, 640, 12, 320)}
    <text x="580" y="700" font-family="${SERIF}" font-style="italic" font-size="38" fill="#3a2a1d">Storm ended,</text>
    <text x="580" y="752" font-family="${SERIF}" font-style="italic" font-size="38" fill="#3a2a1d">sea calm.</text>
    <text x="580" y="830" font-family="${SERIF}" font-style="italic" font-size="44" fill="#3a2a1d">God is over all.</text>${scrib(590, 920, 7, 280)}</g>
   <g transform="rotate(7 300 1560)"><rect x="110" y="1400" width="380" height="290" rx="10" fill="#7a5a3c" ${st()}/><rect x="135" y="1425" width="330" height="240" fill="#2c3133" ${st('#111', 3)}/>
    <text x="155" y="1475" font-family="${MONO}" font-size="26" fill="#e8e6dc" opacity=".85">15 DEC  9 AM</text>
    <path d="M155,1515 h120 M155,1555 h170 M155,1595 h90 M155,1635 h140" ${st('#e8e6dc', 3)} opacity=".7"/></g></g>`),
  logmarks: () => sh(`<g transform="rotate(-4 540 900)"><path d="M572,816 L920,800" ${st(RED, 8)}/></g>
   <g transform="rotate(-12 700 1520)" font-family="${MONO}" font-weight="700"><rect x="500" y="1430" width="420" height="160" rx="10" fill="none" ${st(RED, 10)}/>
   <text x="710" y="1540" text-anchor="middle" font-size="76" fill="${RED}">NO RECORD</text></g>`),
  poem: () => desk('#4a3426', '#38281c') + `<g filter="url(#ink)" transform="rotate(3 960 960)">
   <path d="M330,480 Q640,440 960,500 Q1280,440 1590,480 L1590,1440 Q1280,1400 960,1460 Q640,1400 330,1440Z" fill="#efe6cf" ${st()}/><path d="M960,500 V1460" ${st('#8a7a63', 4)}/>
   <text x="645" y="600" text-anchor="middle" font-family="${SERIF}" font-size="56" font-weight="700" fill="#3a2a1d" letter-spacing="4">FLANNAN ISLE</text>
   <text x="645" y="650" text-anchor="middle" font-family="${SERIF}" font-size="28" font-style="italic" fill="#5a4a3a">a poem · 1912</text>
   ${scrib(420, 730, 4, 420, 44)}${scrib(420, 960, 4, 420, 44)}${scrib(420, 1190, 4, 420, 44)}
   <rect x="1060" y="1080" width="400" height="24" fill="#7a5a3c" ${st(INK, 4)}/><path d="M1090,1104 V1300 M1430,1104 V1300" ${st('#5a3f2a', 10)}/>
   <g transform="rotate(-70 1180 1300)"><path d="M1150,1300 V1150 H1240 V1300 M1150,1220 H1240" fill="none" ${st('#5a3f2a', 10)}/></g>
   <ellipse cx="1250" cy="1068" rx="60" ry="14" fill="#e8e2d2" ${st(INK, 4)}/><path d="M1230,1060 q20,-14 40,0" ${st('#8a6a40', 6)} fill="none"/></g>`,
  archive: () => desk('#3a2a1e', '#2c1f15') + `<g filter="url(#ink)" transform="rotate(-3 960 960)">
   <rect x="420" y="560" width="1080" height="760" rx="10" fill="#cdb27a" ${st()}/><path d="M420,600 H760 L800,520 H1100 L1140,600" fill="#d8bd86" ${st()}/>
   <rect x="520" y="660" width="880" height="560" fill="#efe6cf" ${st(INK, 3)} transform="rotate(4 960 940)"/>${scrib(600, 760, 8, 600, 52)}
   <circle cx="1380" cy="1240" r="70" fill="${RED}" ${st('#7a1a14', 5)}/><circle cx="1380" cy="1240" r="40" fill="none" ${st('#e7a49c', 4)}/>
   <rect x="560" y="1250" width="440" height="60" fill="#efe6cf" ${st(INK, 3)}/></g>
   <text x="780" y="1290" text-anchor="middle" font-family="${MONO}" font-size="34" font-weight="700" fill="${INK}" transform="rotate(-3 960 960)">CASE 01 · 1900</text>
   <g filter="url(#ink)"><circle cx="1580" cy="560" r="120" fill="#c8d6d6" opacity=".35" ${st('#2a211b', 14)}/><path d="M1490,650 L1360,800" ${st('#5a3f2a', 34)}/></g>`,
  search: () => sky('sk', '#7d8783', '#b4b9ae') +
    `<g filter="url(#ink)"><path d="M-20,1100 Q500,1000 960,1060 Q1400,1000 1940,1080 L1940,1920 L-20,1920Z" fill="#5f6b52" ${st()}/>
     <path d="M-20,1300 Q600,1220 1200,1290 Q1600,1260 1940,1300 L1940,1920 L-20,1920Z" fill="#4a5541"/>
     ${Array.from({ length: 30 }, (_, i) => `<path d="M${(i * 173) % W},${1150 + (i * 97) % 700} l10,-40 M${(i * 173) % W + 12},${1150 + (i * 97) % 700} l-6,-36" ${st('#36402f', 4)}/>`).join('')}</g>` +
    Array.from({ length: 12 }, (_, i) => `<path d="M${(i * 311) % W},${200 + i * 70} q120,-20 240,0" fill="none" stroke="#e8eadf" stroke-width="4" opacity=".4"/>`).join('') +
    sil(560, 1150, .28, '#c9962a') + sil(1060, 1110, .24) + sil(1420, 1180, .26),
  gallery: () => sky('sk', '#f0b46e', '#6a5878') + `<circle cx="1500" cy="1200" r="180" fill="#f8d79c" opacity=".8"/>
   <g filter="url(#ink)"><path d="M740,1920 L800,900 L1120,900 L1180,1920Z" fill="#d9cdb4" ${st()}/><rect x="700" y="860" width="520" height="50" fill="#3a3430" ${st()}/>
   <path d="M700,860 V760 H1220 V860 M760,760 V860 M840,760 V860 M920,760 V860 M1000,760 V860 M1080,760 V860 M1160,760 V860" fill="none" ${st('#2a2622', 7)}/>
   <rect x="820" y="520" width="280" height="240" fill="#ffd27a" ${st()}/><path d="M880,520 V760 M960,520 V760 M1040,520 V760" ${st('#2a2a2a', 6)}/><path d="M800,524 Q960,380 1120,524Z" fill="#3a3430" ${st()}/></g>
   <circle cx="960" cy="640" r="220" fill="#ffe2a0" opacity=".45" filter="url(#glow)"/>` + sil(780, 860, .24) + sil(1000, 860, .25) + sil(1150, 860, .23),
  report: () => desk('#3d2b1f', '#2e2016') + `<g filter="url(#ink)" transform="rotate(2 960 960)"><rect x="460" y="220" width="1000" height="1480" fill="#f1ead8" ${st()}/>
   <text x="960" y="360" text-anchor="middle" font-family="${MONO}" font-size="40" font-weight="700" fill="#2a2a2a" letter-spacing="4">NORTHERN LIGHTHOUSES</text>
   <text x="960" y="420" text-anchor="middle" font-family="${MONO}" font-size="30" fill="#2a2a2a">Flannan Islands · 8th January 1901</text>
   ${Array.from({ length: 20 }, (_, i) => `<path d="M560,${520 + i * 52} H${1360 - (i % 4) * 60}" ${st('#5a5a5a', 6)} stroke-dasharray="${14 + (i % 3) * 4} 10"/>`).join('')}
   <path d="M1080,1600 q40,-60 80,0 t80,-20 q30,30 70,-10" fill="none" ${st('#1b2a4a', 5)}/></g>
   <text x="960" y="1820" text-anchor="middle" font-family="${MONO}" font-size="30" fill="#d8cdb6">Reconstruction · illustrative document</text>`,
  coast: (wave = true) => sky('sk', '#4b5652', '#8b958c') + `<path d="M-20,260 Q560,170 1000,250 Q1460,160 1940,240 L1940,420 L-20,420Z" fill="#3a4441" opacity=".8"/>
   <g filter="url(#ink)"><path d="M-20,600 L300,560 L600,640 L720,760 L800,980 L840,1180 L980,1220 L1020,1480 L-20,1500Z" fill="#2c2824" ${st()}/>
   ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${620 + i * 30},${760 + i * 70} h40 v34" fill="none" ${st('#5a524a', 4)}/>`).join('')}
   <path d="M840,1150 L890,1110 L920,1135 L960,1070 L988,1090" fill="none" ${st('#1b1b1b', 9)}/><path d="M840,1180 V1110 M890,1180 V1110 M960,1200 V1075" ${st('#1b1b1b', 7)}/>
   <path d="M720,1000 L780,940 L792,960" fill="none" ${st('#1b1b1b', 10)}/><path d="M760,1050 q50,40 20,90 q-40,30 10,60 M700,1120 q60,10 90,60" fill="none" ${st('#c2a878', 5)}/>` +
   (wave ? `<path d="M1940,1520 L1940,700 Q1380,520 1180,640 Q1040,740 1110,880 Q1160,960 1260,900 Q1180,860 1210,800 Q1280,720 1380,800 Q1300,980 1180,1160 Q1080,1320 980,1520Z" fill="#2f4a52" ${st()}/>
   <path d="M1180,640 Q1040,740 1110,880 Q1160,960 1260,900 Q1180,860 1210,800 Q1280,720 1380,800" fill="none" ${st('#e8eadf', 14)}/>
   ${[[1120, 620, 14], [1070, 700, 10], [1040, 800, 8], [1160, 560, 12], [1240, 540, 9], [1020, 900, 7], [1300, 500, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e8eadf"/>`).join('')}`
   : `<path d="M1060,1480 q120,-140 260,-40 q120,-120 260,-20 q140,-110 380,0" fill="none" ${st('#e8eadf', 8)}/>`) +
   `<rect x="-20" y="1480" width="1960" height="460" fill="#203038"/>${waves(1520, 6, '#9fb3b8', .4)}</g>` +
   (wave ? sil(890, 1212, .16) + sil(940, 1214, .16) + sil(750, 1020, .16, '#f1ebdd') : ''),
  landing: () => SCENES.coast(false),
  wave: () => SCENES.coast(true),
  damage: () => `<g filter="url(#ink)"><ellipse cx="915" cy="1125" rx="110" ry="90" fill="none" ${st(RED, 8)} stroke-dasharray="20 12"/><ellipse cx="760" cy="975" rx="80" ry="70" fill="none" ${st(RED, 8)} stroke-dasharray="20 12"/></g>`,
  ring: () => `<g filter="url(#ink)"><ellipse cx="1010" cy="606" rx="92" ry="80" fill="none" ${st(RED, 7)} stroke-dasharray="22 12"/><path d="M1106,560 L1220,470" ${st(RED, 5)}/></g>
   <text x="1228" y="462" font-family="${MONO}" font-size="34" fill="${RED}" font-weight="700">NO LIGHT</text><text x="1228" y="500" font-family="${MONO}" font-size="24" fill="#e9b3a8">15 DEC 1900</text>`,
};
const OVERLAYS = ['ghosts', 'logmarks', 'damage', 'ring'];
