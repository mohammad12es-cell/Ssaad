<!doctype html>
<html lang="fa" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Vazirmatn"; font-weight: 900; src: url("assets/vazirmatn-arabic-900-normal.woff2") format("woff2"); }
      @font-face { font-family: "Vazirmatn"; font-weight: 700; src: url("assets/vazirmatn-arabic-700-normal.woff2") format("woff2"); }
      :root { --paper: #fbf8f1; --ink: #111111; --navy: #1b2a4a; --gold: #ffd400; --orange: #ff7a1a; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--paper); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Vazirmatn", sans-serif;
        background: radial-gradient(circle at 30% 20%, #ffffff 0%, var(--paper) 60%, #f3eee2 100%); }
      .clip { position: absolute; inset: 0; }
      svg.stage { width: 1080px; height: 1920px; }
      .photo { overflow: hidden; background: #fff; }
      .cam { position: absolute; left: 0; top: 0; width: 1080px; height: 1919px; transform-origin: 0 0; }
      .cam img, .cam svg { position: absolute; left: 0; top: 0; width: 1080px; height: 1919px; }
      .cap { inset: auto 0 auto 0; top: 120px; height: 300px; display: flex; justify-content: center; align-items: flex-start; pointer-events: none; }
      .card { direction: rtl; max-width: 1010px; text-align: center; background: var(--navy); color: #fff; font-weight: 900;
        font-size: 64px; line-height: 1.35; padding: 22px 40px 28px; border-radius: 34px; border: 7px solid var(--ink);
        box-shadow: 0 10px 0 rgba(0,0,0,0.25); }
      .hl { color: var(--gold); }
      .hl2 { color: #cfd8e3; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="__TOTAL__" data-width="1080" data-height="1920">
      __CLIPS__
      <audio id="sound" src="assets/audio.wav" data-start="0" data-duration="__TOTAL__" data-volume="1"></audio>
    </div>

    <script>
      const S = __SCENES__;
      const $ = (id) => document.getElementById(id);
      const K = "#111";
      // ---------- characters ----------
      const arm = (side) => {
        const m = side === "L" ? -1 : 1;
        return `<g class="arm${side}">
          <path d="M${m*95},-560 L${m*150},-555 L${m*155},-455 L${m*100},-450 Z" fill="#ff7a1a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
          <line x1="${m*128}" y1="-455" x2="${m*150}" y2="-370" stroke="${K}" stroke-width="15" stroke-linecap="round"/>
          <circle cx="${m*152}" cy="-345" r="34" fill="#fff" stroke="${K}" stroke-width="8"/></g>`;
      };
      const FACE = () => `
        <ellipse class="eye" cx="-48" cy="-735" rx="17" ry="28" fill="${K}"/><ellipse class="eye" cx="48" cy="-735" rx="17" ry="28" fill="${K}"/>
        <circle cx="-42" cy="-745" r="5" fill="#fff"/><circle cx="54" cy="-745" r="5" fill="#fff"/>
        <g class="brows" fill="none" stroke="${K}" stroke-width="10" stroke-linecap="round">
          <path class="bl" d="M-82,-795 Q-52,-812 -22,-798"/><path class="br" d="M22,-798 Q52,-812 82,-795"/></g>
        <ellipse class="mO" cx="0" cy="-655" rx="22" ry="27" fill="#e0404a" stroke="${K}" stroke-width="7" opacity="0"/>
        <path class="mS" d="M-42,-672 Q0,-628 42,-672" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round" opacity="0"/>
        <path class="mG" d="M-52,-678 Q0,-605 52,-678 Z" fill="#e0404a" stroke="${K}" stroke-width="8" stroke-linejoin="round" opacity="0"/>
        <path class="mF" d="M-26,-662 L26,-662" stroke="${K}" stroke-width="9" stroke-linecap="round" opacity="0"/>`;
      const HERO = (id, x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><g id="${id}"><g class="rig">
        <ellipse cx="0" cy="6" rx="175" ry="26" fill="rgba(0,0,0,0.12)"/>
        <g stroke="${K}" stroke-width="9" stroke-linejoin="round">
          <path d="M-80,-330 L-84,-72 L-20,-72 L-14,-330 Z" fill="#6b3e1f"/><path d="M14,-330 L20,-72 L84,-72 L80,-330 Z" fill="#6b3e1f"/>
          <path d="M-104,-82 L-14,-82 L-14,-10 Q-14,4 -28,4 L-112,4 Q-128,4 -124,-14 Z" fill="#4a2a14"/>
          <path d="M14,-82 L104,-82 L124,-14 Q128,4 112,4 L28,4 Q14,4 14,-10 Z" fill="#4a2a14"/></g>
        ${arm("L")}
        <path d="M-118,-562 Q-124,-440 -108,-318 L108,-318 Q124,-440 118,-562 Q0,-592 -118,-562 Z" fill="#ff7a1a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
        <rect x="-110" y="-342" width="220" height="24" fill="#4a2a14" stroke="${K}" stroke-width="6"/>
        <path d="M-44,-578 L0,-525 L44,-578" fill="none" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M-98,-556 L96,-392" stroke="${K}" stroke-width="28" stroke-linecap="round"/><path d="M-98,-556 L96,-392" stroke="#7a4a24" stroke-width="16" stroke-linecap="round"/>
        <rect x="52" y="-420" width="118" height="100" rx="16" fill="#7a4a24" stroke="${K}" stroke-width="8"/>
        <path d="M52,-404 Q111,-370 170,-404 L170,-420 L52,-420 Z" fill="#5b3216" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
        ${arm("R")}
        <line x1="0" y1="-575" x2="0" y2="-612" stroke="${K}" stroke-width="14"/>
        <g class="head">
          <circle cx="0" cy="-735" r="135" fill="#fff" stroke="${K}" stroke-width="10"/>
          ${FACE()}
          <g transform="rotate(-6 0 -840)">
            <ellipse cx="0" cy="-838" rx="228" ry="50" fill="#9a5a2a" stroke="${K}" stroke-width="9"/>
            <path d="M-126,-840 Q-122,-965 -40,-958 Q0,-932 40,-958 Q122,-965 126,-840 Q0,-818 -126,-840 Z" fill="#9a5a2a" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
            <path d="M-125,-872 Q0,-852 125,-872 L126,-842 Q0,-820 -126,-842 Z" fill="#5b3216"/></g>
        </g></g></g></g>`;
      // Generic Achaemenid-era worker (simple, respectful); woman variant has a long dress and head covering
      const WORKER = (id, x, y, s, woman) => `<g transform="translate(${x},${y}) scale(${s})"><g id="${id}"><g class="rig">
        <ellipse cx="0" cy="6" rx="150" ry="24" fill="rgba(0,0,0,0.12)"/>
        <g stroke="${K}" stroke-width="14" stroke-linecap="round"><line x1="-40" y1="-250" x2="-50" y2="0"/><line x1="40" y1="-250" x2="50" y2="0"/></g>
        <g class="armL"><line x1="-95" y1="-540" x2="-150" y2="-370" stroke="${K}" stroke-width="15" stroke-linecap="round"/><circle cx="-152" cy="-350" r="30" fill="#fff" stroke="${K}" stroke-width="8"/></g>
        ${woman
          ? `<path d="M-100,-565 Q0,-595 100,-565 L150,-60 Q0,-30 -150,-60 Z" fill="#2a9d8f" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
             <path d="M-110,-330 Q0,-310 110,-330" fill="none" stroke="#f4d58d" stroke-width="14"/>`
          : `<path d="M-105,-565 Q0,-595 105,-565 L125,-240 Q0,-220 -125,-240 Z" fill="#c8a165" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>
             <rect x="-112" y="-360" width="224" height="22" fill="#7a4a24" stroke="${K}" stroke-width="6"/>`}
        <g class="armR"><line x1="95" y1="-540" x2="150" y2="-370" stroke="${K}" stroke-width="15" stroke-linecap="round"/><circle cx="152" cy="-350" r="30" fill="#fff" stroke="${K}" stroke-width="8"/></g>
        <line x1="0" y1="-575" x2="0" y2="-612" stroke="${K}" stroke-width="14"/>
        <g class="head">
          ${woman ? `<path d="M-160,-700 Q-160,-900 0,-905 Q160,-900 160,-700 L175,-520 Q0,-540 -175,-520 Z" fill="#a23b3b" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>` : ""}
          <circle cx="0" cy="-735" r="125" fill="#fff" stroke="${K}" stroke-width="10"/>
          ${FACE()}
          ${woman ? `<path d="M-128,-760 Q-120,-890 0,-892 Q120,-890 128,-760 Q60,-830 0,-835 Q-60,-830 -128,-760 Z" fill="#a23b3b" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>`
                  : `<path d="M-118,-790 Q-110,-905 0,-905 Q110,-905 118,-790 Q0,-815 -118,-790 Z" fill="#e8d3a8" stroke="${K}" stroke-width="9" stroke-linejoin="round"/>`}
        </g></g></g></g>`;

      // ---------- props ----------
      const wedges = (w, h, col) => {
        let o = "";
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
          const x = -w / 2 + 40 + c * ((w - 80) / 2.4), y = -h / 2 + 50 + r * ((h - 90) / 3.6);
          o += `<path d="M${x},${y} l22,-10 l0,20 Z M${x + 22},${y} l28,0" fill="${col}" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`;
          o += `<path d="M${x + 10},${y + 26} l0,-14 l12,7 Z" fill="${col}"/>`;
        }
        return o;
      };
      const TAB = (x, y, s, kind, rot = 0, cls = "") => {
        const c = { gold: ["#f7c21b", "#c98a00", "#a86f00"], silver: ["#dfe5ec", "#9aa6b5", "#6f7b8a"], clay: ["#d98e55", "#a8602c", "#7f411c"] }[kind];
        return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})"><g class="${cls}">
          <rect x="-150" y="-180" width="300" height="360" rx="22" fill="${c[0]}" stroke="${K}" stroke-width="10"/>
          <rect x="-130" y="-160" width="260" height="320" rx="14" fill="none" stroke="${c[1]}" stroke-width="5"/>
          ${wedges(300, 360, c[2])}</g></g>`;
      };
      const COIN = (x, y, s = 1, cls = "coin") => `<g transform="translate(${x},${y}) scale(${s})"><g class="${cls}">
        <circle r="36" fill="#f7c21b" stroke="${K}" stroke-width="7"/><circle r="23" fill="none" stroke="#c98a00" stroke-width="5"/>
        <path d="M-6,-12 L6,-12 L6,12 L-6,12 Z" fill="#c98a00"/></g></g>`;
      const SPARK = (x, y, s = 1, cls = "spk") => `<g transform="translate(${x},${y}) scale(${s})"><path class="${cls}" d="M0,-40 Q6,-6 40,0 Q6,6 0,40 Q-6,6 -40,0 Q-6,-6 0,-40 Z" fill="#ffd400" stroke="${K}" stroke-width="5" stroke-linejoin="round"/></g>`;
      const BANG = (x, y, s = 1, cls = "bang") => `<g transform="translate(${x},${y}) scale(${s})"><g class="${cls}">
        <path d="M-30,-70 L-10,-70 L-18,10 Z" fill="#ffc400"/><path d="M20,-62 L40,-58 L14,14 Z" fill="#ffc400"/></g></g>`;
      const SACK = (x, y, s = 1, cls = "sack") => `<g transform="translate(${x},${y}) scale(${s})"><g class="${cls}">
        <path d="M-70,0 Q-80,-90 -30,-110 L-40,-135 L40,-135 L30,-110 Q80,-90 70,0 Q0,20 -70,0 Z" fill="#d8b57a" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M-36,-112 L36,-112" stroke="#7a4a24" stroke-width="10"/>
        <path d="M-20,-60 q8,-14 16,0 q8,14 16,0 M-24,-30 q10,-14 20,0 q10,14 20,0" fill="none" stroke="#a8812f" stroke-width="6"/></g></g>`;
      const BARLEY = (x, y, s = 1) => {
        let g = `<line x1="0" y1="90" x2="0" y2="-80" stroke="#b9892a" stroke-width="8" stroke-linecap="round"/>`;
        for (let k = 0; k < 5; k++) g += `<ellipse cx="-16" cy="${-70 + k * 26}" rx="12" ry="20" transform="rotate(-25 -16 ${-70 + k * 26})" fill="#f0c24b" stroke="${K}" stroke-width="5"/><ellipse cx="16" cy="${-58 + k * 26}" rx="12" ry="20" transform="rotate(25 16 ${-58 + k * 26})" fill="#f0c24b" stroke="${K}" stroke-width="5"/>`;
        return `<g transform="translate(${x},${y}) scale(${s})"><g class="icon">${g}</g></g>`;
      };
      const JAR = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><g class="icon">
        <path d="M-25,-90 L25,-90 L22,-60 Q70,-30 55,40 Q40,90 0,92 Q-40,90 -55,40 Q-70,-30 -22,-60 Z" fill="#b5562e" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M-22,-65 Q-60,-70 -48,-20 M22,-65 Q60,-70 48,-20" fill="none" stroke="${K}" stroke-width="7"/>
        <ellipse cx="0" cy="-90" rx="25" ry="8" fill="#7b2d5b" stroke="${K}" stroke-width="5"/></g></g>`;
      const SHEEP = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><g class="icon">
        <g stroke="${K}" stroke-width="8" stroke-linecap="round"><line x1="-35" y1="20" x2="-35" y2="70"/><line x1="35" y1="20" x2="35" y2="70"/></g>
        <path d="M-70,0 Q-80,-45 -40,-50 Q-25,-80 10,-62 Q45,-82 62,-45 Q90,-20 70,15 Q60,45 20,38 Q-10,55 -35,38 Q-75,40 -70,0 Z" fill="#fff" stroke="${K}" stroke-width="7" stroke-linejoin="round"/>
        <ellipse cx="78" cy="-30" rx="26" ry="20" fill="#333" stroke="${K}" stroke-width="5"/><circle cx="86" cy="-34" r="4" fill="#fff"/></g></g>`;
      const COLUMN = (x, y, s, cls) => `<g transform="translate(${x},${y}) scale(${s})"><g class="${cls}">
        <rect x="-70" y="-40" width="140" height="40" rx="8" fill="#e8d3a8" stroke="${K}" stroke-width="8"/>
        <rect x="-45" y="-640" width="90" height="600" fill="#efdcb5" stroke="${K}" stroke-width="8"/>
        <g stroke="#c9ae7c" stroke-width="5"><line x1="-20" y1="-630" x2="-20" y2="-50"/><line x1="0" y1="-630" x2="0" y2="-50"/><line x1="20" y1="-630" x2="20" y2="-50"/></g>
        <path d="M-60,-640 L60,-640 L70,-700 L-70,-700 Z" fill="#e8d3a8" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M-130,-700 Q-150,-770 -90,-780 L-20,-770 L-20,-700 Z M130,-700 Q150,-770 90,-780 L20,-770 L20,-700 Z" fill="#e8d3a8" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>
        <circle cx="-110" cy="-750" r="7" fill="${K}"/><circle cx="110" cy="-750" r="7" fill="${K}"/>
        <rect x="-150" y="-800" width="300" height="24" rx="6" fill="#d9c08f" stroke="${K}" stroke-width="7"/></g></g>`;
      const BOX = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})">
        <g class="glow" opacity="0"><path d="M-60,-60 L-150,-260 L-40,-90 Z M0,-70 L0,-300 L30,-90 Z M60,-60 L170,-250 L60,-100 Z" fill="#ffd400" stroke="${K}" stroke-width="5"/></g>
        <rect x="-110" y="-70" width="220" height="130" rx="10" fill="#b9b2a6" stroke="${K}" stroke-width="9"/>
        <path d="M-80,-30 L80,-30 M-80,10 L80,10" stroke="#8f887d" stroke-width="6"/>
        <g class="lid"><rect x="-122" y="-100" width="244" height="36" rx="8" fill="#a39b8e" stroke="${K}" stroke-width="9"/></g></g>`;
      const DOC = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><g class="doc">
        <rect x="-160" y="-210" width="320" height="420" rx="18" fill="#fffaf0" stroke="${K}" stroke-width="10"/>
        <circle cx="90" cy="-140" r="36" fill="#f7c21b" stroke="${K}" stroke-width="7"/>
        <path d="M72,-150 L80,-170 L90,-152 L100,-170 L108,-150 Z" fill="#a86f00"/>
        ${[0, 1, 2, 3].map((k) => `<path class="chk" d="M105,${-50 + k * 70} l16,16 l30,-34" fill="none" stroke="#2a9d8f" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><line x1="70" y1="${-36 + k * 70}" x2="-120" y2="${-36 + k * 70}" stroke="#c9c2b2" stroke-width="12" stroke-linecap="round"/>`).join("")}
        </g></g>`;
      const ARROW2 = (y, cls) => `<g class="${cls}"><path d="M150,${y} L930,${y}" stroke="${K}" stroke-width="14" stroke-linecap="round"/>
        <path d="M150,${y} l40,-30 M150,${y} l40,30 M930,${y} l-40,-30 M930,${y} l-40,30" stroke="${K}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="110" cy="${y}" r="26" fill="#2a9d8f" stroke="${K}" stroke-width="7"/><circle cx="970" cy="${y}" r="26" fill="#e0404a" stroke="${K}" stroke-width="7"/></g>`;
      const PHONE = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><g class="phone">
        <rect x="-95" y="-180" width="190" height="360" rx="28" fill="#222" stroke="${K}" stroke-width="8"/>
        <rect x="-78" y="-150" width="156" height="290" rx="10" fill="#eaf4ff"/>
        <rect x="-55" y="-120" width="110" height="200" fill="#fff" stroke="#9aa6b5" stroke-width="4"/>
        ${[0, 1, 2, 3, 4].map((k) => `<line x1="-40" y1="${-95 + k * 34}" x2="${k % 2 ? 20 : 40}" y2="${-95 + k * 34}" stroke="#9aa6b5" stroke-width="8" stroke-linecap="round"/>`).join("")}
        </g></g>`;
      const POOF = (x, y) => `<g transform="translate(${x},${y})"><g class="poof" opacity="0">${[[-60, -20, 60], [40, -50, 70], [70, 40, 55], [-30, 60, 60], [0, 0, 70]].map((c) => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="#e3e3e3" stroke="${K}" stroke-width="6"/>`).join("")}</g></g>`;
      const HEART = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><path class="heart" d="M0,30 C-60,-10 -45,-60 -12,-50 Q0,-45 0,-30 Q0,-45 12,-50 C45,-60 60,-10 0,30 Z" fill="#e0404a" stroke="${K}" stroke-width="6"/></g>`;
      const BABY = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><g class="baby">
        <ellipse cx="0" cy="0" rx="85" ry="55" fill="#fff3d6" stroke="${K}" stroke-width="8"/>
        <circle cx="-38" cy="-8" r="38" fill="#fff" stroke="${K}" stroke-width="7"/>
        <path d="M-52,-10 q6,6 12,0 M-30,-10 q6,6 12,0" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/></g></g>`;
      const BUBBLE = (x, y) => `<g transform="translate(${x},${y})"><g class="bubble">
        <rect x="-170" y="-110" width="340" height="200" rx="40" fill="#fff" stroke="${K}" stroke-width="10"/>
        <path d="M-60,88 L-110,160 L0,88" fill="#fff" stroke="${K}" stroke-width="10" stroke-linejoin="round"/>
        <path d="M-58,90 L2,90" stroke="#fff" stroke-width="14"/>
        <circle class="dot" cx="-70" cy="-10" r="22" fill="#ff7a1a"/><circle class="dot" cx="0" cy="-10" r="22" fill="#ff7a1a"/><circle class="dot" cx="70" cy="-10" r="22" fill="#ff7a1a"/></g></g>`;
      const PLUS = (x, y) => `<g transform="translate(${x},${y})"><path class="plus" d="M-18,-60 L18,-60 L18,-18 L60,-18 L60,18 L18,18 L18,60 L-18,60 L-18,18 L-60,18 L-60,-18 L-18,-18 Z" fill="#2a9d8f" stroke="${K}" stroke-width="7" stroke-linejoin="round"/></g>`;

      // ---------- build scenes ----------
      const put = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
      put("ov1", SPARK(620, 1060, 0.9) + SPARK(980, 1180, 0.7) + SPARK(900, 980, 0.6));
      put("g2", COLUMN(700, 1700, 1.05, "col1") + COLUMN(940, 1700, 0.8, "col2") + HERO("h2", 300, 1720, 0.9));
      put("ov3", BOX(850, 905, 0.85));
      put("ov4", TAB(600, 1320, 0.55, "silver", -12, "silv") + SPARK(930, 1000, 0.8) + SPARK(640, 1110, 0.6));
      put("g5", ARROW2(620, "arr") + DOC(780, 1260, 0.95) + HERO("h5", 330, 1760, 0.85));
      put("ov6", [0, 1, 2, 3, 4].map((k) => COIN(150 + (k - 2) * 30, 1430, 0.9, "jc")).join("") + SPARK(320, 1380, 0.6));
      put("ov7", BANG(700, 1400, 1.2) + SPARK(1000, 1520, 0.7) + SPARK(640, 1600, 0.5));
      put("g8", Array.from({ length: 16 }, (_, k) => TAB(560 + (k % 4) * 120 + ((k * 37) % 30), 1720 - Math.floor(k / 4) * 120, 0.42, "clay", ((k * 47) % 30) - 15, "rain")).join("") + HERO("h8", 250, 1780, 0.8));
      put("g9", TAB(560, 1040, 1.45, "clay", 0, "ledger") + BARLEY(700, 890, 0.85) + JAR(700, 1050, 0.75) + SHEEP(690, 1215, 0.8) + HERO("h9", 230, 1840, 0.6));
      put("g10", WORKER("w10", 790, 1720, 0.85, false) + SACK(420, 1640, 1.2) + COIN(520, 1430, 1.2, "pay") + HERO("h10", 280, 1720, 0.85));
      put("g11", WORKER("w11", 790, 1720, 0.85, true) + SACK(560, 1660, 1.1) + HERO("h11", 260, 1720, 0.85));
      put("g12", WORKER("w12", 800, 1720, 0.85, true) + BABY(650, 1440, 1.0) + PLUS(440, 1060) + SACK(500, 1660, 0.9, "x1") + SACK(560, 1290, 0.8, "x2") + HEART(830, 860, 1.2) + HEART(960, 980, 0.9) + HERO("h12", 220, 1760, 0.7));
      put("g14", PHONE(800, 980, 1.15) + POOF(800, 980) + TAB(290, 980, 0.9, "clay", -6, "keep") + SPARK(140, 760, 0.9) + SPARK(440, 1200, 0.7) + HERO("h14", 540, 1840, 0.6));
      put("g15", BUBBLE(790, 690) + HERO("h15", 470, 1800, 1.0));

      // ---------- timeline ----------
      const tl = gsap.timeline({ paused: true });
      const at = (i, dt) => S[i - 1] + dt;
      const camTo = (fx, fy, s) => {
        let x = 540 - fx * s, y = 1000 - fy * s;
        x = Math.min(0, Math.max(1080 - 1080 * s, x)); y = Math.min(0, Math.max(1920 - 1919 * s, y));
        return { x, y, scale: s };
      };
      const cam = (i, from, to, ease = "sine.inOut") => {
        const el = `#p${i} .cam`, dur = (S[i] ?? __TOTAL__) - S[i - 1];
        tl.set(el, { transformOrigin: "0 0", ...camTo(...from) }, Math.max(0, S[i - 1] - 0.01));
        tl.to(el, { ...camTo(...to), duration: dur, ease }, S[i - 1]);
      };
      const pop = (sel, t, d = 0.35) => tl.fromTo(sel, { scale: 0, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: d, ease: "back.out(2.2)", transformOrigin: "50% 50%" }, t);
      const mouth = (h, m, t) => { tl.set(`#${h} .mO, #${h} .mS, #${h} .mG, #${h} .mF`, { opacity: 0 }, t); tl.set(`#${h} .${m}`, { opacity: 1 }, t); };
      const brows = (h, dy, t, d = 0.2) => tl.to(`#${h} .brows`, { y: dy, duration: d, ease: "back.out(2)" }, t);
      const blink = (h, t) => tl.to(`#${h} .eye`, { scaleY: 0.1, transformOrigin: "50% 50%", duration: 0.07, yoyo: true, repeat: 1 }, t);
      const armR = (h, r, t, d = 0.35) => tl.to(`#${h} .armR`, { rotation: r, svgOrigin: "110 -545", duration: d, ease: "back.out(1.6)" }, t);
      const armL = (h, r, t, d = 0.35) => tl.to(`#${h} .armL`, { rotation: r, svgOrigin: "-110 -545", duration: d, ease: "back.out(1.6)" }, t);
      const bob = (h, i, amp = 10) => {
        const dur = (S[i] ?? __TOTAL__) - S[i - 1];
        const n = Math.max(1, Math.floor(dur / 0.6));
        tl.fromTo(`#${h} .rig`, { y: 0 }, { y: -amp, duration: 0.3, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, S[i - 1]);
      };
      const enter = (i) => tl.fromTo(`#g${i}`, { opacity: 0, scale: 1.05, svgOrigin: "540 1100" }, { opacity: 1, scale: 1, svgOrigin: "540 1100", duration: 0.25, ease: "power2.out" }, S[i - 1]);
      for (let i = 1; i <= 15; i++) tl.fromTo(`#c${i} .card`, { y: -40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, i === 1 ? 0.05 : S[i - 1] + 0.05);

      // 1 hook: photo, push in toward the gold tablet
      cam(1, [540, 960, 1.0], [792, 1180, 1.45]);
      tl.fromTo("#ov1 .spk", { scale: 0, rotation: 0, transformOrigin: "50% 50%" }, { scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.25, ease: "back.out(2)" }, 1.4);
      tl.to("#ov1 .spk", { scale: 0.6, duration: 0.4, yoyo: true, repeat: 3, stagger: 0.15, transformOrigin: "50% 50%" }, 2.4);

      // 2 Darius begins building: columns rise
      enter(2); bob("h2", 2, 8); mouth("h2", "mS", S[1]);
      tl.fromTo("#g2 .col1", { scaleY: 0, svgOrigin: "0 0" }, { scaleY: 1, svgOrigin: "0 0", duration: 1.2, ease: "power3.out" }, at(2, 0.4));
      tl.fromTo("#g2 .col2", { scaleY: 0, svgOrigin: "0 0" }, { scaleY: 1, svgOrigin: "0 0", duration: 1.2, ease: "power3.out" }, at(2, 1.3));
      armR("h2", -105, at(2, 0.3)); brows("h2", -14, at(2, 0.3)); blink("h2", at(2, 2.6)); mouth("h2", "mG", at(2, 2.4));

      // 3 1933: stone boxes under the Apadana
      cam(3, [746, 690, 1.7], [760, 1000, 1.35]);
      tl.fromTo("#ov3", { y: 220, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)" }, at(3, 0.8));
      tl.to("#ov3 .lid", { y: -70, rotation: -18, svgOrigin: "-122 -100", duration: 0.5, ease: "back.out(2)" }, at(3, 2.6));
      tl.to("#ov3 .glow", { opacity: 1, duration: 0.3 }, at(3, 2.8));
      tl.to("#ov3 .glow", { scale: 1.15, svgOrigin: "0 -60", duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, at(3, 3.1));

      // 4 gold... and silver
      cam(4, [792, 1234, 1.6], [792, 1234, 2.1], "power2.out");
      pop("#ov4 .silv", at(4, 0.95), 0.4);
      tl.fromTo("#ov4 .spk", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.4, stagger: 0.2, ease: "back.out(2)" }, at(4, 0.2));

      // 5 empire resume
      enter(5); bob("h5", 5, 8); mouth("h5", "mS", S[4]);
      armR("h5", -95, at(5, 0.2)); armL("h5", 95, at(5, 0.2)); brows("h5", -12, at(5, 0.2));
      tl.fromTo("#g5 .arr", { scaleX: 0, svgOrigin: "540 620", opacity: 0 }, { scaleX: 1, svgOrigin: "540 620", opacity: 1, duration: 0.7, ease: "power3.out" }, at(5, 0.3));
      pop("#g5 .doc", at(5, 2.2), 0.45);
      tl.fromTo("#g5 .chk", { opacity: 0, scale: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.2, stagger: 0.25, ease: "back.out(3)" }, at(5, 2.7));
      armR("h5", -20, at(5, 2.2)); armL("h5", 20, at(5, 2.2)); mouth("h5", "mG", at(5, 3.0)); blink("h5", at(5, 3.6));

      // 6 coins under the boxes
      cam(6, [300, 1300, 1.5], [143, 1560, 2.0]);
      tl.set("#ov6 .jc", { opacity: 0 }, S[5]);
      tl.fromTo("#ov6 .jc", { y: 0, opacity: 1 }, { keyframes: { y: [0, -260, -150] }, x: (k) => (k - 2) * 60, duration: 0.8, stagger: 0.15, ease: "power1.out" }, at(6, 0.9));
      tl.to("#ov6 .jc", { rotation: 360, transformOrigin: "50% 50%", duration: 0.8, stagger: 0.15 }, at(6, 0.9));
      tl.fromTo("#ov6 .spk", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(2)" }, at(6, 1.8));

      // 7 the real treasure: clay tablets
      cam(7, [700, 1500, 1.6], [872, 1687, 2.0], "power2.out");
      pop("#ov7 .bang", at(7, 0.7), 0.3);
      tl.fromTo("#ov7 .spk", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.35, stagger: 0.2, ease: "back.out(2)" }, at(7, 0.9));

      // 8 thousands of tablets
      enter(8); mouth("h8", "mO", S[7]); brows("h8", -18, at(8, 0.2)); armL("h8", 150, at(8, 0.3)); armR("h8", -40, at(8, 0.3));
      tl.fromTo("#g8 .rain", { y: -1500, opacity: 1 }, { y: 0, duration: 0.55, stagger: 0.16, ease: "bounce.out" }, at(8, 0.1));
      tl.to("#h8 .rig", { y: -40, duration: 0.15, yoyo: true, repeat: 5, ease: "sine.inOut" }, at(8, 2.6));

      // 9 barley, wine, sheep — accounting in cuneiform
      enter(9); bob("h9", 9, 6); mouth("h9", "mS", S[8]); armR("h9", -120, at(9, 0.2));
      tl.fromTo("#g9 .ledger", { scale: 0.6, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", transformOrigin: "50% 50%" }, at(9, 0.1));
      tl.fromTo("#g9 .icon", { scale: 0, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, transformOrigin: "50% 50%", duration: 0.35, stagger: 0.75, ease: "back.out(2.5)" }, at(9, 0.5));
      mouth("h9", "mG", at(9, 2.9)); blink("h9", at(9, 3.4));

      // 10 wages and rations
      enter(10); bob("w10", 10, 6); mouth("h10", "mS", S[9]); mouth("w10", "mF", S[9]);
      tl.fromTo("#g10 .sack", { x: -60, opacity: 0 }, { x: 230, opacity: 1, duration: 0.8, ease: "power2.out" }, at(10, 0.3));
      pop("#g10 .pay", at(10, 0.9), 0.35);
      tl.to("#g10 .pay", { y: 60, x: 200, duration: 0.6, ease: "power2.in" }, at(10, 1.5));
      mouth("w10", "mG", at(10, 1.4)); brows("w10", -14, at(10, 1.4));
      tl.to("#w10 .rig", { y: -60, duration: 0.2, yoyo: true, repeat: 3, ease: "power1.out" }, at(10, 1.5));
      armR("h10", -30, at(10, 0.3));

      // 11 women worked and received rations too
      enter(11); bob("w11", 11, 6); mouth("w11", "mS", S[10]); mouth("h11", "mS", S[10]);
      pop("#g11 .sack", at(11, 0.5), 0.4);
      armR("h11", -150, at(11, 1.0)); brows("h11", -12, at(11, 1.0)); mouth("h11", "mG", at(11, 1.2));
      armL("w11", 30, at(11, 0.6)); blink("w11", at(11, 2.0));

      // 12 extra rations for new mothers
      enter(12); bob("w12", 12, 5); mouth("w12", "mS", S[11]); mouth("h12", "mO", S[11]); brows("h12", -18, at(12, 0.4));
      pop("#g12 .baby", at(12, 0.4), 0.4);
      pop("#g12 .plus", at(12, 1.3), 0.4);
      pop("#g12 .x1", at(12, 1.7), 0.35); pop("#g12 .x2", at(12, 2.0), 0.35);
      tl.fromTo("#g12 .heart", { scale: 0, y: 40, transformOrigin: "50% 50%" }, { scale: 1, y: -30, transformOrigin: "50% 50%", duration: 0.6, stagger: 0.3, ease: "back.out(2)" }, at(12, 2.6));
      mouth("h12", "mG", at(12, 3.2)); tl.to("#h12 .rig", { rotation: -6, svgOrigin: "0 0", duration: 0.15, yoyo: true, repeat: 7 }, at(12, 3.3));

      // 13 2500 years ago this place kept books: pull back to the key art
      cam(13, [379, 987, 1.8], [540, 960, 1.0], "power2.inOut");

      // 14 our payslip gets lost; their clay survived
      enter(14); bob("h14", 14, 6); mouth("h14", "mF", S[13]); brows("h14", 8, at(14, 0.2));
      pop("#g14 .phone", at(14, 0.1), 0.35);
      tl.to("#g14 .phone", { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.25, ease: "power2.in" }, at(14, 1.5));
      tl.to("#g14 .poof", { opacity: 1, duration: 0.05 }, at(14, 1.6));
      tl.fromTo("#g14 .poof", { scale: 0.3, transformOrigin: "50% 50%" }, { scale: 1.3, transformOrigin: "50% 50%", duration: 0.5, ease: "power2.out" }, at(14, 1.6));
      tl.to("#g14 .poof", { opacity: 0, duration: 0.3 }, at(14, 2.1));
      armL("h14", 70, at(14, 1.6)); armR("h14", -70, at(14, 1.6));
      pop("#g14 .keep", at(14, 2.2), 0.45);
      tl.fromTo("#g14 .spk", { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.4, stagger: 0.2, ease: "back.out(2)" }, at(14, 2.5));
      mouth("h14", "mG", at(14, 2.4)); brows("h14", -12, at(14, 2.4)); armL("h14", 0, at(14, 2.6)); armR("h14", -100, at(14, 2.6));

      // 15 call to action
      enter(15); bob("h15", 15, 8); mouth("h15", "mG", S[14]); brows("h15", -12, at(15, 0.2));
      armR("h15", -125, at(15, 0.2));
      pop("#g15 .bubble", at(15, 0.5), 0.45);
      tl.fromTo("#g15 .dot", { y: 0 }, { y: -26, duration: 0.25, yoyo: true, repeat: 7, stagger: 0.12, ease: "sine.inOut" }, at(15, 1.0));
      blink("h15", at(15, 2.4));

      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
