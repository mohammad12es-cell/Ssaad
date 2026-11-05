// Explorer kit: shared character art, props and timeline helpers.
// Expects globals S (scene start times), TOTAL and tl (paused GSAP timeline) defined before this script.
const K = "#111";
const $ = (id) => document.getElementById(id);
const put = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

// ---------- faces & characters ----------
const FACE = () => `
  <ellipse class="eye" cx="-48" cy="-735" rx="17" ry="28" fill="${K}"/><ellipse class="eye" cx="48" cy="-735" rx="17" ry="28" fill="${K}"/>
  <circle cx="-42" cy="-745" r="5" fill="#fff"/><circle cx="54" cy="-745" r="5" fill="#fff"/>
  <g class="brows" fill="none" stroke="${K}" stroke-width="10" stroke-linecap="round">
    <path d="M-82,-795 Q-52,-812 -22,-798"/><path d="M22,-798 Q52,-812 82,-795"/></g>
  <ellipse class="mO" cx="0" cy="-655" rx="22" ry="27" fill="#e0404a" stroke="${K}" stroke-width="7" opacity="0"/>
  <path class="mS" d="M-42,-672 Q0,-628 42,-672" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round" opacity="0"/>
  <path class="mG" d="M-52,-678 Q0,-605 52,-678 Z" fill="#e0404a" stroke="${K}" stroke-width="8" stroke-linejoin="round" opacity="0"/>
  <path class="mF" d="M-26,-662 L26,-662" stroke="${K}" stroke-width="9" stroke-linecap="round" opacity="0"/>`;

const sleeveArm = (side, col) => {
  const m = side === "L" ? -1 : 1;
  return `<g class="arm${side}">
    <path d="M${m * 95},-560 L${m * 150},-555 L${m * 155},-455 L${m * 100},-450 Z" fill="${col}" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
    <line x1="${m * 128}" y1="-455" x2="${m * 150}" y2="-370" stroke="${K}" stroke-width="15" stroke-linecap="round"/>
    <circle cx="${m * 152}" cy="-345" r="34" fill="#fff" stroke="${K}" stroke-width="8"/></g>`;
};
const stickArm = (side) => {
  const m = side === "L" ? -1 : 1;
  return `<g class="arm${side}"><line x1="${m * 95}" y1="-540" x2="${m * 150}" y2="-370" stroke="${K}" stroke-width="15" stroke-linecap="round"/>
    <circle cx="${m * 152}" cy="-350" r="30" fill="#fff" stroke="${K}" stroke-width="8"/></g>`;
};

// The main character: explorer with brown hat, orange shirt, satchel, white gloves. Origin = feet centre.
const HERO = (id, x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><g id="${id}"><g class="rig">
  <ellipse cx="0" cy="6" rx="175" ry="26" fill="rgba(0,0,0,0.12)"/>
  <g stroke="${K}" stroke-width="9" stroke-linejoin="round">
    <path d="M-80,-330 L-84,-72 L-20,-72 L-14,-330 Z" fill="#6b3e1f"/><path d="M14,-330 L20,-72 L84,-72 L80,-330 Z" fill="#6b3e1f"/>
    <path d="M-104,-82 L-14,-82 L-14,-10 Q-14,4 -28,4 L-112,4 Q-128,4 -124,-14 Z" fill="#4a2a14"/>
    <path d="M14,-82 L104,-82 L124,-14 Q128,4 112,4 L28,4 Q14,4 14,-10 Z" fill="#4a2a14"/></g>
  ${sleeveArm("L", "#ff7a1a")}
  <path d="M-118,-562 Q-124,-440 -108,-318 L108,-318 Q124,-440 118,-562 Q0,-592 -118,-562 Z" fill="#ff7a1a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
  <rect x="-110" y="-342" width="220" height="24" fill="#4a2a14" stroke="${K}" stroke-width="6"/>
  <path d="M-44,-578 L0,-525 L44,-578" fill="none" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M-98,-556 L96,-392" stroke="${K}" stroke-width="28" stroke-linecap="round"/><path d="M-98,-556 L96,-392" stroke="#7a4a24" stroke-width="16" stroke-linecap="round"/>
  <rect x="52" y="-420" width="118" height="100" rx="16" fill="#7a4a24" stroke="${K}" stroke-width="8"/>
  <path d="M52,-404 Q111,-370 170,-404 L170,-420 L52,-420 Z" fill="#5b3216" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
  ${sleeveArm("R", "#ff7a1a")}
  <line x1="0" y1="-575" x2="0" y2="-612" stroke="${K}" stroke-width="14"/>
  <g class="head">
    <circle cx="0" cy="-735" r="135" fill="#fff" stroke="${K}" stroke-width="10"/>
    ${FACE()}
    <g transform="rotate(-6 0 -840)">
      <ellipse cx="0" cy="-838" rx="228" ry="50" fill="#9a5a2a" stroke="${K}" stroke-width="9"/>
      <path d="M-126,-840 Q-122,-965 -40,-958 Q0,-932 40,-958 Q122,-965 126,-840 Q0,-818 -126,-840 Z" fill="#9a5a2a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
      <path d="M-125,-872 Q0,-852 125,-872 L126,-842 Q0,-820 -126,-842 Z" fill="#5b3216"/></g>
  </g></g></g></g>`;

// Supporting cast. o = { body, robe: "tunic"|"long"|"dress"|"suit", hat: "cap"|"qajar"|"tophat"|"helmet"|"scarf"|"crown"|"none", beard }
const PERSON = (id, x, y, s, o = {}) => {
  const body = o.body || "#c8a165", robe = o.robe || "tunic", hat = o.hat || "cap";
  const bodies = {
    tunic: `<path d="M-105,-565 Q0,-595 105,-565 L125,-240 Q0,-220 -125,-240 Z" fill="${body}" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
            <rect x="-112" y="-360" width="224" height="22" fill="#7a4a24" stroke="${K}" stroke-width="6"/>`,
    long: `<path d="M-105,-565 Q0,-595 105,-565 L140,-50 Q0,-30 -140,-50 Z" fill="${body}" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
           <rect x="-114" y="-380" width="228" height="26" fill="#f2e6c9" stroke="${K}" stroke-width="6"/>`,
    dress: `<path d="M-100,-565 Q0,-595 100,-565 L150,-60 Q0,-30 -150,-60 Z" fill="${body}" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
            <path d="M-110,-330 Q0,-310 110,-330" fill="none" stroke="#f4d58d" stroke-width="14"/>`,
    suit: `<path d="M-110,-565 Q0,-595 110,-565 L118,-300 L-118,-300 Z" fill="${body}" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
           <path d="M-30,-575 L0,-470 L30,-575" fill="#fff" stroke="${K}" stroke-width="6"/><path d="M-10,-540 L10,-540 L0,-470 Z" fill="#b3263a"/>
           <g stroke="${K}" stroke-width="9"><path d="M-80,-300 L-80,-70 L-20,-70 L-20,-300 Z M20,-300 L20,-70 L80,-70 L80,-300 Z" fill="#2b2b3a"/></g>`,
    armor: `<path d="M-110,-565 Q0,-595 110,-565 L120,-300 Q0,-280 -120,-300 Z" fill="#b3263a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
            <path d="M-90,-540 L90,-540 L80,-380 L-80,-380 Z" fill="#d4a84a" stroke="${K}" stroke-width="7"/>`,
  };
  const legs = robe === "long" || robe === "dress" ? "" :
    `<g stroke="${K}" stroke-width="14" stroke-linecap="round"><line x1="-40" y1="-250" x2="-50" y2="0"/><line x1="40" y1="-250" x2="50" y2="0"/></g>`;
  const back = hat === "scarf" ? `<path d="M-160,-700 Q-160,-900 0,-905 Q160,-900 160,-700 L175,-520 Q0,-540 -175,-520 Z" fill="${o.scarf || "#a23b3b"}" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>` : "";
  const hats = {
    none: "",
    cap: `<path d="M-118,-790 Q-110,-905 0,-905 Q110,-905 118,-790 Q0,-815 -118,-790 Z" fill="#e8d3a8" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>`,
    qajar: `<path d="M-95,-830 L-80,-1010 L80,-1010 L95,-830 Q0,-815 -95,-830 Z" fill="#4a2a14" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>`,
    tophat: `<rect x="-150" y="-860" width="300" height="34" rx="14" fill="#222" stroke="${K}" stroke-width="8"/><rect x="-95" y="-1030" width="190" height="180" rx="10" fill="#222" stroke="${K}" stroke-width="8"/><rect x="-95" y="-890" width="190" height="26" fill="#b3263a"/>`,
    helmet: `<path d="M-135,-720 Q-140,-900 0,-900 Q140,-900 135,-720 L95,-720 L95,-780 L-95,-780 L-95,-720 Z" fill="#d4a84a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
             <path d="M-110,-900 Q0,-1040 110,-900 Q0,-950 -110,-900 Z" fill="#d1343e" stroke="${K}" stroke-width="8"/>`,
    crown: `<path d="M-100,-840 L-110,-990 L-55,-935 L0,-1010 L55,-935 L110,-990 L100,-840 Q0,-820 -100,-840 Z" fill="#f7c21b" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>`,
    scarf: `<path d="M-128,-760 Q-120,-890 0,-892 Q120,-890 128,-760 Q60,-830 0,-835 Q-60,-830 -128,-760 Z" fill="${o.scarf || "#a23b3b"}" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>`,
  };
  const mask = o.mask ? `<path d="M-118,-700 Q0,-660 118,-700 L105,-640 Q0,-600 -105,-640 Z" fill="${o.mask}" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>` : "";
  const beard = o.beard ? `<path d="M-80,-660 Q-70,-560 0,-555 Q70,-560 80,-660 Q40,-625 0,-630 Q-40,-625 -80,-660 Z" fill="${o.beard}" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>` : "";
  return `<g transform="translate(${x},${y}) scale(${s})"><g id="${id}"><g class="rig">
    <ellipse cx="0" cy="6" rx="150" ry="24" fill="rgba(0,0,0,0.12)"/>
    ${legs}${stickArm("L")}${bodies[robe]}${stickArm("R")}
    <line x1="0" y1="-575" x2="0" y2="-612" stroke="${K}" stroke-width="14"/>
    <g class="head">${back}<circle cx="0" cy="-735" r="125" fill="#fff" stroke="${K}" stroke-width="10"/>${FACE()}${beard}${mask}${hats[hat]}</g>
  </g></g></g>`;
};

// ---------- props (origin = centre unless noted) ----------
const g = (x, y, s, cls, inner, rot = 0) => `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})"><g class="${cls}">${inner}</g></g>`;
const wedges = (w, h, col) => {
  let o = "";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const x = -w / 2 + 40 + c * ((w - 80) / 2.4), y = -h / 2 + 50 + r * ((h - 90) / 3.6);
    o += `<path d="M${x},${y} l22,-10 l0,20 Z M${x + 22},${y} l28,0" fill="${col}" stroke="${col}" stroke-width="7" stroke-linecap="round"/><path d="M${x + 10},${y + 26} l0,-14 l12,7 Z" fill="${col}"/>`;
  }
  return o;
};
const TAB = (x, y, s, kind, rot = 0, cls = "tab") => {
  const c = { gold: ["#f7c21b", "#c98a00", "#a86f00"], silver: ["#dfe5ec", "#9aa6b5", "#6f7b8a"], clay: ["#d98e55", "#a8602c", "#7f411c"] }[kind];
  return g(x, y, s, cls, `<rect x="-150" y="-180" width="300" height="360" rx="22" fill="${c[0]}" stroke="${K}" stroke-width="10"/>
    <rect x="-130" y="-160" width="260" height="320" rx="14" fill="none" stroke="${c[1]}" stroke-width="5"/>${wedges(300, 360, c[2])}`, rot);
};
const COIN = (x, y, s = 1, cls = "coin", sym = "bar") => g(x, y, s, cls, `<circle r="36" fill="#f7c21b" stroke="${K}" stroke-width="7"/><circle r="23" fill="none" stroke="#c98a00" stroke-width="5"/>
  ${sym === "bar" ? `<path d="M-6,-12 L6,-12 L6,12 L-6,12 Z" fill="#c98a00"/>` : `<text x="0" y="12" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="#a86f00">${sym}</text>`}`);
// big daric: kneeling archer on a gold coin
const DARIC = (x, y, s = 1, cls = "daric") => g(x, y, s, cls, `<path d="M-200,10 Q-210,-170 -20,-200 Q190,-215 205,-10 Q215,175 10,200 Q-190,210 -200,10 Z" fill="#f7c21b" stroke="${K}" stroke-width="12"/>
  <path d="M-165,10 Q-170,-140 -15,-165 Q155,-178 168,-8 Q178,145 8,165 Q-158,172 -165,10 Z" fill="none" stroke="#c98a00" stroke-width="8"/>
  <g fill="#a86f00" stroke="#7a5200" stroke-width="5" stroke-linejoin="round">
    <circle cx="-20" cy="-95" r="26"/><path d="M-45,-120 L-30,-150 L-10,-150 L5,-120 Z"/>
    <path d="M-40,-70 L10,-70 L30,20 L-10,30 Z"/><path d="M-10,30 L60,40 L70,110 L45,110 L40,65 L-20,60 Z"/><path d="M-20,40 L-90,90 L-75,110 L-5,70 Z"/>
    <path d="M10,-60 L80,-40" stroke-width="12"/></g>
  <path d="M85,-120 Q140,-40 85,40" fill="none" stroke="#7a5200" stroke-width="10"/><line x1="85" y1="-120" x2="85" y2="40" stroke="#7a5200" stroke-width="4"/>`);
const SPARK = (x, y, s = 1, cls = "spk") => `<g transform="translate(${x},${y}) scale(${s})"><path class="${cls}" d="M0,-40 Q6,-6 40,0 Q6,6 0,40 Q-6,6 -40,0 Q-6,-6 0,-40 Z" fill="#ffd400" stroke="${K}" stroke-width="5" stroke-linejoin="round"/></g>`;
const BANG = (x, y, s = 1, cls = "bang") => g(x, y, s, cls, `<path d="M-30,-70 L-10,-70 L-18,10 Z" fill="#ffc400"/><path d="M20,-62 L40,-58 L14,14 Z" fill="#ffc400"/>`);
const SACK = (x, y, s = 1, cls = "sack", mark = "") => g(x, y, s, cls, `<path d="M-70,0 Q-80,-90 -30,-110 L-40,-135 L40,-135 L30,-110 Q80,-90 70,0 Q0,20 -70,0 Z" fill="#d8b57a" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M-36,-112 L36,-112" stroke="#7a4a24" stroke-width="10"/>
  ${mark ? `<text x="0" y="-22" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="64" fill="#7a4a24">${mark}</text>` : `<path d="M-20,-60 q8,-14 16,0 q8,14 16,0 M-24,-30 q10,-14 20,0 q10,14 20,0" fill="none" stroke="#a8812f" stroke-width="6"/>`}`);
const BARLEY = (x, y, s = 1, cls = "icon") => {
  let o = `<line x1="0" y1="90" x2="0" y2="-80" stroke="#b9892a" stroke-width="8" stroke-linecap="round"/>`;
  for (let k = 0; k < 5; k++) o += `<ellipse cx="-16" cy="${-70 + k * 26}" rx="12" ry="20" transform="rotate(-25 -16 ${-70 + k * 26})" fill="#f0c24b" stroke="${K}" stroke-width="5"/><ellipse cx="16" cy="${-58 + k * 26}" rx="12" ry="20" transform="rotate(25 16 ${-58 + k * 26})" fill="#f0c24b" stroke="${K}" stroke-width="5"/>`;
  return g(x, y, s, cls, o);
};
const JAR = (x, y, s = 1, cls = "icon") => g(x, y, s, cls, `<path d="M-25,-90 L25,-90 L22,-60 Q70,-30 55,40 Q40,90 0,92 Q-40,90 -55,40 Q-70,-30 -22,-60 Z" fill="#b5562e" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M-22,-65 Q-60,-70 -48,-20 M22,-65 Q60,-70 48,-20" fill="none" stroke="${K}" stroke-width="7"/><ellipse cx="0" cy="-90" rx="25" ry="8" fill="#7b2d5b" stroke="${K}" stroke-width="5"/>`);
const SHEEP = (x, y, s = 1, cls = "icon") => g(x, y, s, cls, `<g stroke="${K}" stroke-width="8" stroke-linecap="round"><line x1="-35" y1="20" x2="-35" y2="70"/><line x1="35" y1="20" x2="35" y2="70"/></g>
  <path d="M-70,0 Q-80,-45 -40,-50 Q-25,-80 10,-62 Q45,-82 62,-45 Q90,-20 70,15 Q60,45 20,38 Q-10,55 -35,38 Q-75,40 -70,0 Z" fill="#fff" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
  <ellipse cx="78" cy="-30" rx="26" ry="20" fill="#333" stroke="${K}" stroke-width="5"/><circle cx="86" cy="-34" r="4" fill="#fff"/>`);
// column: origin at its base
const COLUMN = (x, y, s, cls) => g(x, y, s, cls, `<rect x="-70" y="-40" width="140" height="40" rx="8" fill="#e8d3a8" stroke="${K}" stroke-width="8"/>
  <rect x="-45" y="-640" width="90" height="600" fill="#efdcb5" stroke="${K}" stroke-width="8"/>
  <g stroke="#c9ae7c" stroke-width="5"><line x1="-20" y1="-630" x2="-20" y2="-50"/><line x1="0" y1="-630" x2="0" y2="-50"/><line x1="20" y1="-630" x2="20" y2="-50"/></g>
  <path d="M-60,-640 L60,-640 L70,-700 L-70,-700 Z" fill="#e8d3a8" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M-130,-700 Q-150,-770 -90,-780 L-20,-770 L-20,-700 Z M130,-700 Q150,-770 90,-780 L20,-770 L20,-700 Z" fill="#e8d3a8" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>
  <circle cx="-110" cy="-750" r="7" fill="${K}"/><circle cx="110" cy="-750" r="7" fill="${K}"/>
  <rect x="-150" y="-800" width="300" height="24" rx="6" fill="#d9c08f" stroke="${K}" stroke-width="7"/>`);
const BOX = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})">
  <g class="glow" opacity="0"><path d="M-60,-60 L-150,-260 L-40,-90 Z M0,-70 L0,-300 L30,-90 Z M60,-60 L170,-250 L60,-100 Z" fill="#ffd400" stroke="${K}" stroke-width="5"/></g>
  <rect x="-110" y="-70" width="220" height="130" rx="10" fill="#b9b2a6" stroke="${K}" stroke-width="9"/>
  <path d="M-80,-30 L80,-30 M-80,10 L80,10" stroke="#8f887d" stroke-width="6"/>
  <g class="lid"><rect x="-122" y="-100" width="244" height="36" rx="8" fill="#a39b8e" stroke="${K}" stroke-width="9"/></g></g>`;
const DOC = (x, y, s, cls = "doc", seal = true) => g(x, y, s, cls, `<rect x="-160" y="-210" width="320" height="420" rx="18" fill="#fffaf0" stroke="${K}" stroke-width="10"/>
  ${seal ? `<circle cx="90" cy="-140" r="36" fill="#f7c21b" stroke="${K}" stroke-width="7"/><path d="M72,-150 L80,-170 L90,-152 L100,-170 L108,-150 Z" fill="#a86f00"/>` : ""}
  ${[0, 1, 2, 3].map((k) => `<path class="chk" d="M-130,${-50 + k * 70} l16,16 l30,-34" fill="none" stroke="#2a9d8f" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><line x1="-70" y1="${-36 + k * 70}" x2="120" y2="${-36 + k * 70}" stroke="#c9c2b2" stroke-width="12" stroke-linecap="round"/>`).join("")}`);
// contract scroll with red wax seal
const SCROLL = (x, y, s, cls = "scroll") => g(x, y, s, cls, `<rect x="-150" y="-200" width="300" height="400" fill="#f6e7c4" stroke="${K}" stroke-width="9"/>
  <rect x="-175" y="-230" width="350" height="44" rx="22" fill="#d9b77a" stroke="${K}" stroke-width="8"/><rect x="-175" y="186" width="350" height="44" rx="22" fill="#d9b77a" stroke="${K}" stroke-width="8"/>
  ${[0, 1, 2, 3].map((k) => `<line x1="-110" y1="${-130 + k * 55}" x2="${k % 2 ? 60 : 110}" y2="${-130 + k * 55}" stroke="#b8a27a" stroke-width="12" stroke-linecap="round"/>`).join("")}
  <circle cx="70" cy="120" r="42" fill="#c62f36" stroke="${K}" stroke-width="7"/><circle cx="70" cy="120" r="22" fill="none" stroke="#8e1c22" stroke-width="5"/>`);
const ARROW2 = (y, cls, x1 = 150, x2 = 930) => `<g class="${cls}"><path d="M${x1},${y} L${x2},${y}" stroke="${K}" stroke-width="14" stroke-linecap="round"/>
  <path d="M${x1},${y} l40,-30 M${x1},${y} l40,30 M${x2},${y} l-40,-30 M${x2},${y} l-40,30" stroke="${K}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="${x1 - 40}" cy="${y}" r="26" fill="#2a9d8f" stroke="${K}" stroke-width="7"/><circle cx="${x2 + 40}" cy="${y}" r="26" fill="#e0404a" stroke="${K}" stroke-width="7"/></g>`;
const ARROW = (x1, y1, x2, y2, cls = "arrow") => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 40;
  const p = (da) => `${x2 - h * Math.cos(a + da)},${y2 - h * Math.sin(a + da)}`;
  return `<g class="${cls}"><path d="M${x1},${y1} L${x2},${y2} M${p(0.5)} L${x2},${y2} L${p(-0.5)}" fill="none" stroke="${K}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g>`;
};
const PHONE = (x, y, s, cls = "phone") => g(x, y, s, cls, `<rect x="-95" y="-180" width="190" height="360" rx="28" fill="#222" stroke="${K}" stroke-width="8"/>
  <rect x="-78" y="-150" width="156" height="290" rx="10" fill="#eaf4ff"/><rect x="-55" y="-120" width="110" height="200" fill="#fff" stroke="#9aa6b5" stroke-width="4"/>
  ${[0, 1, 2, 3, 4].map((k) => `<line x1="-40" y1="${-95 + k * 34}" x2="${k % 2 ? 20 : 40}" y2="${-95 + k * 34}" stroke="#9aa6b5" stroke-width="8" stroke-linecap="round"/>`).join("")}`);
const POOF = (x, y, cls = "poof") => `<g transform="translate(${x},${y})"><g class="${cls}" opacity="0">${[[-60, -20, 60], [40, -50, 70], [70, 40, 55], [-30, 60, 60], [0, 0, 70]].map((c) => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="#e3e3e3" stroke="${K}" stroke-width="6"/>`).join("")}</g></g>`;
const HEART = (x, y, s = 1, cls = "heart") => `<g transform="translate(${x},${y}) scale(${s})"><path class="${cls}" d="M0,30 C-60,-10 -45,-60 -12,-50 Q0,-45 0,-30 Q0,-45 12,-50 C45,-60 60,-10 0,30 Z" fill="#e0404a" stroke="${K}" stroke-width="6"/></g>`;
const BABY = (x, y, s, cls = "baby") => g(x, y, s, cls, `<ellipse cx="0" cy="0" rx="85" ry="55" fill="#fff3d6" stroke="${K}" stroke-width="8"/><circle cx="-38" cy="-8" r="38" fill="#fff" stroke="${K}" stroke-width="7"/>
  <path d="M-52,-10 q6,6 12,0 M-30,-10 q6,6 12,0" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>`);
const BUBBLE = (x, y, cls = "bubble") => g(x, y, 1, cls, `<rect x="-170" y="-110" width="340" height="200" rx="40" fill="#fff" stroke="${K}" stroke-width="10"/>
  <path d="M-60,88 L-110,160 L0,88" fill="#fff" stroke="${K}" stroke-width="10" stroke-linejoin="round"/><path d="M-58,90 L2,90" stroke="#fff" stroke-width="14"/>
  <circle class="dot" cx="-70" cy="-10" r="22" fill="#ff7a1a"/><circle class="dot" cx="0" cy="-10" r="22" fill="#ff7a1a"/><circle class="dot" cx="70" cy="-10" r="22" fill="#ff7a1a"/>`);
const PLUS = (x, y, cls = "plus") => `<g transform="translate(${x},${y})"><path class="${cls}" d="M-18,-60 L18,-60 L18,-18 L60,-18 L60,18 L18,18 L18,60 L-18,60 L-18,18 L-60,18 L-60,-18 L-18,-18 Z" fill="#2a9d8f" stroke="${K}" stroke-width="7" stroke-linejoin="round"/></g>`;
const NOSIGN = (x, y, s = 1, cls = "nosign") => g(x, y, s, cls, `<circle r="120" fill="none" stroke="#d1343e" stroke-width="26"/><line x1="-85" y1="85" x2="85" y2="-85" stroke="#d1343e" stroke-width="26"/>`);
const CROSS = (x, y, s = 1, cls = "cross") => g(x, y, s, cls, `<path d="M-90,-90 L90,90 M90,-90 L-90,90" stroke="#d1343e" stroke-width="30" stroke-linecap="round"/>`);
const LABEL = (x, y, txt, cls = "label", size = 64, fill = "#fff", bg = "#1b2a4a", w = null) => {
  const ww = w || Math.max(160, txt.length * size * 0.64 + 60);
  return g(x, y, 1, cls, `<rect x="${-ww / 2}" y="${-size * 0.85}" width="${ww}" height="${size * 1.6}" rx="${size * 0.4}" fill="${bg}" stroke="${K}" stroke-width="7"/>
    <text x="0" y="${size * 0.32}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fill}">${txt}</text>`);
};
const QALYAN = (x, y, s = 1, cls = "qalyan") => g(x, y, s, cls, `<path d="M-80,0 Q-100,-120 0,-140 Q100,-120 80,0 Q0,30 -80,0 Z" fill="#3fa7c9" stroke="${K}" stroke-width="8"/>
  <rect x="-16" y="-330" width="32" height="200" fill="#c9a24b" stroke="${K}" stroke-width="7"/><path d="M-55,-330 L55,-330 L35,-390 L-35,-390 Z" fill="#b5562e" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M-40,-400 Q0,-430 40,-400" fill="none" stroke="#e0404a" stroke-width="10"/><path d="M60,-60 Q160,-80 180,40" fill="none" stroke="#6b3e1f" stroke-width="12" stroke-linecap="round"/>`);
const SHOP = (x, y, s = 1, cls = "shop", lit = false) => g(x, y, s, cls, `<rect x="-120" y="-260" width="240" height="260" fill="#efdcb5" stroke="${K}" stroke-width="8"/>
  <path d="M-80,0 L-80,-130 Q0,-220 80,-130 L80,0 Z" fill="${lit ? "#ffe680" : "#6b5a44"}" stroke="${K}" stroke-width="8"/>
  <rect x="-140" y="-290" width="280" height="36" fill="#b5562e" stroke="${K}" stroke-width="7"/>`);
const SHUTTER = (x, y, s = 1, cls = "shut") => g(x, y, s, cls, `<rect x="-80" y="-170" width="160" height="170" fill="#9aa6b5" stroke="${K}" stroke-width="7"/>${[0, 1, 2, 3, 4].map((k) => `<line x1="-80" y1="${-140 + k * 30}" x2="80" y2="${-140 + k * 30}" stroke="#6f7b8a" stroke-width="6"/>`).join("")}`);
const STATION = (x, y, s = 1, cls = "station") => g(x, y, s, cls, `<rect x="-70" y="-110" width="140" height="110" fill="#efdcb5" stroke="${K}" stroke-width="7"/><path d="M-90,-110 L0,-170 L90,-110 Z" fill="#b5562e" stroke="${K}" stroke-width="7" stroke-linejoin="round"/><rect x="-22" y="-60" width="44" height="60" fill="#6b5a44" stroke="${K}" stroke-width="6"/>`);
// horse + rider (rider in a simple tunic) facing right; origin at hooves
const RIDER = (x, y, s = 1, cls = "rider", col = "#2a9d8f") => g(x, y, s, cls, `<g class="legs" stroke="${K}" stroke-width="16" stroke-linecap="round"><line x1="-110" y1="-120" x2="-140" y2="0"/><line x1="-70" y1="-120" x2="-50" y2="0"/><line x1="70" y1="-120" x2="40" y2="0"/><line x1="110" y1="-120" x2="140" y2="0"/></g>
  <path d="M-160,-150 Q-170,-230 -60,-235 L110,-235 Q170,-230 165,-150 Q120,-100 -120,-105 Q-160,-110 -160,-150 Z" fill="#a0632f" stroke="${K}" stroke-width="9"/>
  <path d="M120,-220 L190,-330 Q230,-350 250,-310 L210,-250 L150,-160 Z" fill="#a0632f" stroke="${K}" stroke-width="9" stroke-linejoin="round"/><circle cx="215" cy="-312" r="7" fill="${K}"/>
  <path d="M-160,-170 Q-230,-150 -230,-80" fill="none" stroke="#5b3216" stroke-width="18" stroke-linecap="round"/><path d="M150,-300 Q120,-260 130,-230" fill="none" stroke="#5b3216" stroke-width="16"/>
  <path d="M-40,-235 L-20,-400 L60,-400 L60,-235 Z" fill="${col}" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>
  <line x1="40" y1="-380" x2="150" y2="-300" stroke="${K}" stroke-width="13" stroke-linecap="round"/>
  <circle cx="20" cy="-470" r="70" fill="#fff" stroke="${K}" stroke-width="9"/><ellipse cx="42" cy="-475" rx="10" ry="16" fill="${K}"/><path d="M30,-440 Q50,-430 65,-445" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/>
  <path d="M-55,-500 Q-40,-560 20,-560 Q85,-560 92,-500 Q20,-515 -55,-500 Z" fill="#e8d3a8" stroke="${K}" stroke-width="8"/>`);
const ENVELOPE = (x, y, s = 1, cls = "env") => g(x, y, s, cls, `<rect x="-90" y="-60" width="180" height="120" rx="10" fill="#fffaf0" stroke="${K}" stroke-width="8"/><path d="M-90,-60 L0,15 L90,-60" fill="none" stroke="${K}" stroke-width="8" stroke-linejoin="round"/><circle cx="0" cy="15" r="18" fill="#c62f36" stroke="${K}" stroke-width="5"/>`);
const POSTOFFICE = (x, y, s = 1, cls = "po") => g(x, y, s, cls, `<rect x="-380" y="-60" width="760" height="60" fill="#e9e4d8" stroke="${K}" stroke-width="8"/>
  ${[-300, -180, -60, 60, 180, 300].map((cx) => `<rect x="${cx - 26}" y="-420" width="52" height="360" fill="#f4f0e6" stroke="${K}" stroke-width="7"/>`).join("")}
  <rect x="-400" y="-520" width="800" height="100" fill="#e9e4d8" stroke="${K}" stroke-width="8"/><rect x="-360" y="-500" width="720" height="60" fill="#fff" stroke="#b9b2a6" stroke-width="5"/>
  <g class="inscr">${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<rect x="${-340 + k * 86}" y="-484" width="66" height="28" rx="6" fill="#8f887d"/>`).join("")}</g>
  <path d="M-420,-520 L0,-640 L420,-520 Z" fill="#e9e4d8" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>`);
const SNOW = (x, y, s = 1, cls = "wx") => g(x, y, s, cls, `<g stroke="#5fa8d3" stroke-width="10" stroke-linecap="round"><line x1="0" y1="-50" x2="0" y2="50"/><line x1="-43" y1="-25" x2="43" y2="25"/><line x1="-43" y1="25" x2="43" y2="-25"/></g>`);
const RAIN = (x, y, s = 1, cls = "wx") => g(x, y, s, cls, `<path d="M-60,0 Q-70,-60 -10,-60 Q10,-100 50,-70 Q90,-60 70,0 Z" fill="#c9d6e3" stroke="${K}" stroke-width="7"/><g stroke="#3f8fd6" stroke-width="9" stroke-linecap="round"><line x1="-30" y1="20" x2="-40" y2="60"/><line x1="10" y1="20" x2="0" y2="60"/><line x1="50" y1="20" x2="40" y2="60"/></g>`);
const SUN = (x, y, s = 1, cls = "wx") => g(x, y, s, cls, `<circle r="45" fill="#ffc400" stroke="${K}" stroke-width="7"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<line x1="${Math.cos(k * 0.785) * 62}" y1="${Math.sin(k * 0.785) * 62}" x2="${Math.cos(k * 0.785) * 85}" y2="${Math.sin(k * 0.785) * 85}" stroke="#ffc400" stroke-width="10" stroke-linecap="round"/>`).join("")}`);
const MOON = (x, y, s = 1, cls = "wx") => g(x, y, s, cls, `<path d="M20,-60 Q-60,-40 -50,20 Q-35,75 40,60 Q-20,40 -15,-5 Q-10,-45 20,-60 Z" fill="#2b3a67" stroke="${K}" stroke-width="6"/>`);
const CALENDAR = (x, y, s, txt, cls = "cal") => g(x, y, s, cls, `<rect x="-130" y="-120" width="260" height="250" rx="20" fill="#fff" stroke="${K}" stroke-width="9"/><rect x="-130" y="-120" width="260" height="70" rx="20" fill="#e0404a" stroke="${K}" stroke-width="9"/>
  <circle cx="-70" cy="-120" r="12" fill="${K}"/><circle cx="70" cy="-120" r="12" fill="${K}"/><text x="0" y="80" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${txt.length > 4 ? Math.min(96, 225 / (txt.length * 0.56)) : 96}" fill="${K}">${txt}</text>`);
const GENERATOR = (x, y, s = 1, cls = "gen") => g(x, y, s, cls, `<rect x="-170" y="-160" width="250" height="160" rx="16" fill="#2f6b4f" stroke="${K}" stroke-width="9"/>
  <g class="coil">${[0, 1, 2, 3, 4].map((k) => `<rect x="${-150 + k * 44}" y="-140" width="30" height="120" rx="8" fill="#c77b3a" stroke="${K}" stroke-width="5"/>`).join("")}</g>
  <g transform="translate(150,-120)"><g class="fly"><circle r="110" fill="#4a5560" stroke="${K}" stroke-width="10"/><circle r="70" fill="none" stroke="#2b333b" stroke-width="10"/>
    ${[0, 1, 2, 3, 4, 5].map((k) => `<line x1="0" y1="0" x2="${Math.cos(k * 1.047) * 100}" y2="${Math.sin(k * 1.047) * 100}" stroke="#2b333b" stroke-width="10"/>`).join("")}<circle r="18" fill="#c9a24b" stroke="${K}" stroke-width="6"/></g></g>
  <rect x="-200" y="0" width="420" height="34" rx="8" fill="#6b5a44" stroke="${K}" stroke-width="8"/>`);
const BULB = (x, y, s = 1, cls = "bulb", lit = true) => g(x, y, s, cls, `<g class="rays" opacity="${lit ? 1 : 0}">${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<line x1="${Math.cos(k * 0.785) * 110}" y1="${-20 + Math.sin(k * 0.785) * 110}" x2="${Math.cos(k * 0.785) * 150}" y2="${-20 + Math.sin(k * 0.785) * 150}" stroke="#ffc400" stroke-width="12" stroke-linecap="round"/>`).join("")}</g>
  <circle class="glass" cx="0" cy="-20" r="75" fill="${lit ? "#ffe680" : "#f2f2f2"}" stroke="${K}" stroke-width="9"/><path d="M-20,-20 L-10,10 L0,-20 L10,10 L20,-20" fill="none" stroke="#c98a00" stroke-width="6"/>
  <rect x="-35" y="50" width="70" height="55" rx="8" fill="#9aa6b5" stroke="${K}" stroke-width="8"/><line x1="0" y1="105" x2="0" y2="140" stroke="${K}" stroke-width="8"/>`);
const LANTERN = (x, y, s = 1, cls = "lantern") => g(x, y, s, cls, `<path d="M-30,-130 Q0,-170 30,-130" fill="none" stroke="${K}" stroke-width="8"/><rect x="-55" y="-130" width="110" height="30" rx="6" fill="#c9a24b" stroke="${K}" stroke-width="7"/>
  <path d="M-50,-100 L50,-100 L40,40 L-40,40 Z" fill="#fff3c2" stroke="${K}" stroke-width="7"/><path class="flame" d="M0,-60 Q25,-20 0,10 Q-25,-20 0,-60 Z" fill="#ff9a1a"/><rect x="-60" y="40" width="120" height="26" rx="6" fill="#c9a24b" stroke="${K}" stroke-width="7"/>`);
// signpost: origin at base; board text optional
const SIGNPOST = (x, y, s = 1, cls = "sign", txt = "", bg = "#fffaf0", fill = "#111", size = 54) => g(x, y, s, cls, `<rect x="-12" y="-560" width="24" height="560" fill="#2f6b4f" stroke="${K}" stroke-width="7"/>
  <g class="board"><rect x="-230" y="-600" width="460" height="130" rx="16" fill="${bg}" stroke="${K}" stroke-width="9"/>
  <text x="0" y="-518" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fill}">${txt}</text></g>`);
const SWITCH = (x, y, s = 1, cls = "switch") => g(x, y, s, cls, `<rect x="-70" y="-110" width="140" height="220" rx="16" fill="#fff" stroke="${K}" stroke-width="8"/><g class="toggle"><rect x="-28" y="-60" width="56" height="70" rx="10" fill="#e9e4d8" stroke="${K}" stroke-width="7"/></g>`);
const SKYLINE = (x, y, s = 1, cls = "sky") => g(x, y, s, cls, `${[[-300, 160, 220], [-160, 120, 300], [-30, 140, 180], [110, 110, 260], [240, 150, 200]].map((b) => `<rect x="${b[0]}" y="${-b[2]}" width="${b[1]}" height="${b[2]}" fill="#e8d3a8" stroke="${K}" stroke-width="7"/>${[0, 1].map((r) => `<rect class="win" x="${b[0] + 25}" y="${-b[2] + 40 + r * 70}" width="34" height="40" fill="#6b5a44"/><rect class="win" x="${b[0] + b[1] - 59}" y="${-b[2] + 40 + r * 70}" width="34" height="40" fill="#6b5a44"/>`).join("")}`).join("")}
  <path d="M-20,-180 Q40,-300 100,-180 Z" fill="#3fa7c9" stroke="${K}" stroke-width="7"/>`);
const SCALE = (x, y, s = 1, cls = "scale") => g(x, y, s, cls, `<rect x="-14" y="-300" width="28" height="300" fill="#c9a24b" stroke="${K}" stroke-width="7"/><rect x="-90" y="-20" width="180" height="30" rx="8" fill="#c9a24b" stroke="${K}" stroke-width="7"/>
  <g class="beam"><rect x="-220" y="-315" width="440" height="22" rx="10" fill="#c9a24b" stroke="${K}" stroke-width="7"/>
  <path d="M-200,-300 L-260,-180 L-140,-180 Z M200,-300 L140,-180 L260,-180 Z" fill="none" stroke="${K}" stroke-width="5"/>
  <path d="M-275,-180 L-125,-180 Q-200,-130 -275,-180 Z M125,-180 L275,-180 Q200,-130 125,-180 Z" fill="#d4a84a" stroke="${K}" stroke-width="7"/></g>`);
const LUMPS = (x, y, s = 1, cls = "lumps") => g(x, y, s, cls, `<path d="M-60,0 Q-70,-50 -30,-55 Q-20,-80 10,-60 Q50,-70 55,-30 Q75,0 40,10 Q0,20 -60,0 Z" fill="#9aa6b5" stroke="${K}" stroke-width="7"/><path d="M-10,-20 Q0,-45 25,-35 Q40,-15 20,0 Q0,5 -10,-20 Z" fill="#d4a84a" stroke="${K}" stroke-width="6"/>`);
const POUND = (x, y, s = 1, cls = "pound") => SACK(x, y, s, cls, "£");

// ---------- timeline helpers ----------
const at = (i, dt) => S[i - 1] + dt;
const dur = (i) => (S[i] ?? TOTAL) - S[i - 1];
const camTo = (fx, fy, s) => {
  let x = 540 - fx * s, y = 1000 - fy * s;
  x = Math.min(0, Math.max(1080 - 1080 * s, x)); y = Math.min(0, Math.max(1920 - 1919 * s, y));
  return { x, y, scale: s };
};
const cam = (i, from, to, ease = "sine.inOut") => {
  const el = `#p${i} .cam`;
  tl.set(el, { transformOrigin: "0 0", ...camTo(...from) }, Math.max(0, S[i - 1] - 0.01));
  tl.to(el, { ...camTo(...to), duration: dur(i), ease }, S[i - 1]);
};
const pop = (sel, t, d = 0.35) => tl.fromTo(sel, { scale: 0, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: d, ease: "back.out(2.2)", transformOrigin: "50% 50%" }, t);
const popAll = (sel, t, stagger = 0.2, d = 0.35) => tl.fromTo(sel, { scale: 0, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: d, stagger, ease: "back.out(2.2)", transformOrigin: "50% 50%" }, t);
const hide = (sel, t, d = 0.25) => tl.to(sel, { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: d, ease: "power2.in" }, t);
const sparkle = (sel, t) => tl.fromTo(sel, { scale: 0, rotation: 0, transformOrigin: "50% 50%" }, { scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.4, stagger: 0.18, ease: "back.out(2)" }, t);
const mouth = (h, m, t) => { tl.set(`#${h} .mO, #${h} .mS, #${h} .mG, #${h} .mF`, { opacity: 0 }, t); tl.set(`#${h} .${m}`, { opacity: 1 }, t); };
const brows = (h, dy, t, d = 0.2) => tl.to(`#${h} .brows`, { y: dy, duration: d, ease: "back.out(2)" }, t);
const blink = (h, t) => tl.to(`#${h} .eye`, { scaleY: 0.1, transformOrigin: "50% 50%", duration: 0.07, yoyo: true, repeat: 1 }, t);
const armR = (h, r, t, d = 0.35) => tl.to(`#${h} .armR`, { rotation: r, svgOrigin: "110 -545", duration: d, ease: "back.out(1.6)" }, t);
const armL = (h, r, t, d = 0.35) => tl.to(`#${h} .armL`, { rotation: r, svgOrigin: "-110 -545", duration: d, ease: "back.out(1.6)" }, t);
const bob = (h, i, amp = 10) => {
  const n = Math.max(1, Math.floor(dur(i) / 0.6));
  tl.fromTo(`#${h} .rig`, { y: 0 }, { y: -amp, duration: 0.3, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, S[i - 1]);
};
const hop = (h, t, n = 2, amp = 50) => tl.to(`#${h} .rig`, { y: -amp, duration: 0.18, yoyo: true, repeat: n * 2 - 1, ease: "power1.out" }, t);
const shake = (h, t, n = 4) => tl.to(`#${h} .rig`, { rotation: -6, svgOrigin: "0 0", duration: 0.12, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, t);
const enter = (i) => tl.fromTo(`#g${i}`, { opacity: 0, scale: 1.05, svgOrigin: "540 1100" }, { opacity: 1, scale: 1, svgOrigin: "540 1100", duration: 0.25, ease: "power2.out" }, S[i - 1]);
const spin = (sel, t, d, turns = 1) => tl.fromTo(sel, { rotation: 0, transformOrigin: "50% 50%" }, { rotation: 360 * turns, transformOrigin: "50% 50%", duration: d, ease: "none" }, t);
const slide = (sel, t, fromX, fromY = 0, d = 0.6, ease = "power3.out") => tl.fromTo(sel, { x: fromX, y: fromY, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: d, ease }, t);
// standard per-scene setup: entrance (vector scenes), hero bob + default face
const scene = (i, hero, face = "mS") => { enter(i); if (hero) { bob(hero, i, 8); mouth(hero, face, S[i - 1]); blink(hero, at(i, Math.min(2.2, dur(i) - 0.4))); } };

// ---------- props added for parts 6-10 ----------
// camel facing right; origin at feet
const CAMEL = (x, y, s = 1, cls = "camel", load = true) => g(x, y, s, cls, `<g class="legs" stroke="${K}" stroke-width="16" stroke-linecap="round"><line x1="-120" y1="-150" x2="-130" y2="0"/><line x1="-80" y1="-150" x2="-70" y2="0"/><line x1="80" y1="-150" x2="70" y2="0"/><line x1="115" y1="-150" x2="130" y2="0"/></g>
  <path d="M-170,-170 Q-180,-260 -110,-270 Q-80,-360 -20,-300 Q20,-370 80,-290 Q150,-280 160,-190 Q140,-130 -140,-130 Q-175,-135 -170,-170 Z" fill="#d6a55c" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M140,-220 Q200,-260 200,-360 Q205,-410 250,-410 Q290,-405 285,-375 L235,-360 Q235,-260 180,-180 Z" fill="#d6a55c" stroke="${K}" stroke-width="9" stroke-linejoin="round"/><circle cx="255" cy="-392" r="7" fill="${K}"/>
  ${load ? `<rect x="-120" y="-380" width="110" height="90" rx="10" fill="#b5562e" stroke="${K}" stroke-width="7"/><rect x="10" y="-370" width="100" height="80" rx="10" fill="#2a9d8f" stroke="${K}" stroke-width="7"/>` : ""}
  <path d="M-170,-170 Q-215,-150 -210,-90" fill="none" stroke="#8a6232" stroke-width="12" stroke-linecap="round"/>`);
const CARAVANSERAI = (x, y, s = 1, cls = "serai") => g(x, y, s, cls, `<rect x="-360" y="-300" width="720" height="300" fill="#e3c48f" stroke="${K}" stroke-width="9"/>
  <rect x="-400" y="-340" width="80" height="340" fill="#d8b57a" stroke="${K}" stroke-width="8"/><rect x="320" y="-340" width="80" height="340" fill="#d8b57a" stroke="${K}" stroke-width="8"/>
  <rect x="-120" y="-400" width="240" height="400" fill="#d8b57a" stroke="${K}" stroke-width="9"/>
  <path d="M-75,0 L-75,-200 Q0,-300 75,-200 L75,0 Z" fill="#6b5a44" stroke="${K}" stroke-width="8"/>
  <path class="gate" d="M-75,0 L-75,-200 Q0,-300 75,-200 L75,0 Z" fill="#8a6232" stroke="${K}" stroke-width="8"/>
  ${[-290, -200, 200, 290].map((cx) => `<path d="M${cx - 30},-120 L${cx - 30},-190 Q${cx},-235 ${cx + 30},-190 L${cx + 30},-120 Z" fill="#6b5a44" stroke="${K}" stroke-width="6"/>`).join("")}
  <path d="M-130,-400 L-130,-430 L130,-430 L130,-400 Z" fill="#3fa7c9" stroke="${K}" stroke-width="7"/>`);
const BANKNOTE = (x, y, s = 1, cls = "note", ink = "#2f6b4f", mark = "") => g(x, y, s, cls, `<rect x="-170" y="-90" width="340" height="180" rx="10" fill="#f2ead3" stroke="${K}" stroke-width="8"/>
  <rect x="-150" y="-70" width="300" height="140" rx="6" fill="none" stroke="${ink}" stroke-width="6"/>
  ${[0, 1, 2].map((k) => `<line x1="${-110 + k * 30}" y1="-40" x2="${-110 + k * 30}" y2="40" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>`).join("")}
  <circle cx="60" cy="0" r="42" fill="none" stroke="${ink}" stroke-width="7"/>${mark ? `<text x="60" y="16" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="${ink}">${mark}</text>` : `<rect x="40" y="-20" width="40" height="40" fill="${ink}"/>`}`);
const SILK = (x, y, s = 1, cls = "silk", col = "#e0407a") => g(x, y, s, cls, `<rect x="-120" y="-60" width="240" height="120" rx="20" fill="${col}" stroke="${K}" stroke-width="8"/>
  <path d="M-80,-60 Q-70,0 -80,60 M-20,-60 Q-10,0 -20,60 M40,-60 Q50,0 40,60" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="8"/>
  <ellipse cx="-120" cy="0" rx="26" ry="60" fill="#c9a24b" stroke="${K}" stroke-width="7"/><ellipse cx="120" cy="0" rx="26" ry="60" fill="#c9a24b" stroke="${K}" stroke-width="7"/>`);
const DOMEBLD = (x, y, s = 1, cls = "dome", col = "#e3c48f", cross = false) => g(x, y, s, cls, `<rect x="-200" y="-250" width="400" height="250" fill="${col}" stroke="${K}" stroke-width="9"/>
  <path d="M-150,-250 Q-150,-470 0,-470 Q150,-470 150,-250 Z" fill="${cross ? "#c9a24b" : "#3fa7c9"}" stroke="${K}" stroke-width="9"/>
  ${cross ? `<path d="M-10,-470 L-10,-560 M-40,-530 L20,-530" stroke="${K}" stroke-width="12" stroke-linecap="round"/>` : `<circle cx="0" cy="-485" r="16" fill="#c9a24b" stroke="${K}" stroke-width="6"/>`}
  <path d="M-50,0 L-50,-120 Q0,-190 50,-120 L50,0 Z" fill="#6b5a44" stroke="${K}" stroke-width="7"/>`);
// carpet with simple deer/rider/griffin-like motifs; origin centre
const CARPET = (x, y, s = 1, cls = "carpet") => g(x, y, s, cls, `<rect x="-260" y="-300" width="520" height="600" rx="10" fill="#a8323a" stroke="${K}" stroke-width="10"/>
  <rect x="-225" y="-265" width="450" height="530" fill="none" stroke="#f2d27a" stroke-width="14"/>
  <rect x="-170" y="-210" width="340" height="420" fill="#c94a4a" stroke="#f2d27a" stroke-width="8"/>
  ${[[-80, -120], [80, -120], [-80, 0], [80, 0], [-80, 120], [80, 120]].map((p, k) => `<g transform="translate(${p[0]},${p[1]})">${k % 2 ? `<path d="M-35,20 L-30,-10 Q-10,-30 20,-15 L35,-35 L30,0 L25,20 M-25,20 L-25,35 M20,20 L20,35" fill="#f2d27a" stroke="#5b1a1f" stroke-width="5" stroke-linejoin="round"/>` : `<rect x="-25" y="-25" width="50" height="50" transform="rotate(45)" fill="#2b6f8a" stroke="#f2d27a" stroke-width="6"/>`}</g>`).join("")}
  ${Array.from({ length: 13 }, (_, k) => `<line x1="${-240 + k * 40}" y1="300" x2="${-240 + k * 40}" y2="335" stroke="#f2ead3" stroke-width="8"/><line x1="${-240 + k * 40}" y1="-300" x2="${-240 + k * 40}" y2="-335" stroke="#f2ead3" stroke-width="8"/>`).join("")}`);
const ICE = (x, y, s = 1, cls = "ice") => g(x, y, s, cls, `<path d="M-300,-260 L280,-290 L320,250 L-280,280 Z" fill="rgba(160,215,245,0.55)" stroke="#3f8fd6" stroke-width="10" stroke-linejoin="round"/>
  <path d="M-230,-200 L-120,-220 M200,180 L260,90 M-200,200 L-150,120" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`);
const MOUNTAINS = (x, y, s = 1, cls = "mtn") => g(x, y, s, cls, `<path d="M-500,0 L-250,-380 L-120,-200 L80,-460 L500,0 Z" fill="#9aa6b5" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M-250,-380 L-200,-300 L-260,-290 L-300,-310 Z M80,-460 L150,-360 L60,-350 L20,-380 Z" fill="#fff" stroke="${K}" stroke-width="6" stroke-linejoin="round"/>`);
const MOUND = (x, y, s = 1, cls = "mound") => g(x, y, s, cls, `<path d="M-340,0 Q-250,-260 0,-270 Q250,-260 340,0 Z" fill="#8a6232" stroke="${K}" stroke-width="9"/><path d="M-120,-150 Q0,-190 120,-150" fill="none" stroke="#6b4a24" stroke-width="10"/>`);
const DEER = (x, y, s = 1, cls = "icon") => g(x, y, s, cls, `<g stroke="${K}" stroke-width="10" stroke-linecap="round"><line x1="-50" y1="10" x2="-55" y2="80"/><line x1="40" y1="10" x2="45" y2="80"/></g>
  <ellipse cx="0" cy="0" rx="80" ry="38" fill="#b5772e" stroke="${K}" stroke-width="7"/><path d="M60,-10 L95,-70 L120,-60 L95,-5 Z" fill="#b5772e" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M100,-68 L90,-120 M90,-100 L70,-115 M105,-70 L130,-115 M120,-95 L140,-100" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/>`);
// chess king piece; origin at base
const CHESSKING = (x, y, s = 1, cls = "king") => g(x, y, s, cls, `<rect x="-100" y="-40" width="200" height="40" rx="10" fill="#f4f0e6" stroke="${K}" stroke-width="9"/>
  <path d="M-70,-40 Q-55,-160 -40,-220 L40,-220 Q55,-160 70,-40 Z" fill="#f4f0e6" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
  <ellipse cx="0" cy="-230" rx="65" ry="22" fill="#f4f0e6" stroke="${K}" stroke-width="8"/><path d="M-45,-250 Q-50,-320 0,-330 Q50,-320 45,-250 Z" fill="#f4f0e6" stroke="${K}" stroke-width="8"/>
  <path d="M0,-330 L0,-400 M-30,-370 L30,-370" stroke="${K}" stroke-width="14" stroke-linecap="round"/>`);
const CHECKER = (x, y, s = 1, cls = "checker", n = 6) => g(x, y, s, cls, `<rect x="${-n * 30}" y="${-n * 30}" width="${n * 60}" height="${n * 60}" fill="#f4f0e6" stroke="${K}" stroke-width="9"/>
  ${Array.from({ length: n * n }, (_, k) => ((k % n) + Math.floor(k / n)) % 2 ? `<rect x="${-n * 30 + (k % n) * 60}" y="${-n * 30 + Math.floor(k / n) * 60}" width="60" height="60" fill="#2f6b4f"/>` : "").join("")}
  <rect x="${-n * 30}" y="${-n * 30}" width="${n * 60}" height="${n * 60}" fill="none" stroke="${K}" stroke-width="9"/>`);
const CHEQUE = (x, y, s = 1, cls = "cheque") => g(x, y, s, cls, `<rect x="-260" y="-110" width="520" height="220" rx="12" fill="#eaf4ea" stroke="${K}" stroke-width="8"/>
  <line x1="-220" y1="-40" x2="120" y2="-40" stroke="#9ab59a" stroke-width="10" stroke-linecap="round"/><line x1="-220" y1="10" x2="40" y2="10" stroke="#9ab59a" stroke-width="10" stroke-linecap="round"/>
  <rect x="140" y="-70" width="90" height="50" rx="6" fill="#fff" stroke="#9ab59a" stroke-width="5"/><path d="M60,70 Q100,30 130,70 T210,60" fill="none" stroke="#1b2a4a" stroke-width="7" stroke-linecap="round"/>`);
const WALLET = (x, y, s = 1, cls = "wallet") => g(x, y, s, cls, `<rect x="-200" y="-140" width="400" height="280" rx="30" fill="#7a4a24" stroke="${K}" stroke-width="10"/>
  <rect x="-170" y="-170" width="230" height="80" rx="8" fill="#7fbf7f" stroke="${K}" stroke-width="7" transform="rotate(-8)"/>
  <path d="M60,-50 L200,-50 L200,60 L60,60 Q30,5 60,-50 Z" fill="#5b3216" stroke="${K}" stroke-width="8"/><circle cx="110" cy="5" r="16" fill="#c9a24b" stroke="${K}" stroke-width="5"/>`);
const BIGTEXT = (x, y, txt, cls = "word", size = 130, fill = "#111") => `<g transform="translate(${x},${y})"><g class="${cls}"><text x="0" y="0" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${size}" fill="${fill}" stroke="#fff" stroke-width="10" paint-order="stroke">${txt}</text></g></g>`;
