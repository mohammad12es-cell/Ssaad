// Build a HyperFrames project from story.json + narration timings.
// usage: node compose.js film|s1|s2|s3   → out/proj-<name>/index.html (+ assets)
const fs = require('fs'), path = require('path');
const name = process.argv[2], film = name === 'film';
const story = JSON.parse(fs.readFileSync('story.json'))[name];
const tim = JSON.parse(fs.readFileSync(`out/${name}-timing.json`));
const Wv = film ? 1920 : 1080, Hv = film ? 1080 : 1920, A = 1920, D = tim.duration, XF = 0.5;
const HOOK = { s1: 'The last words of<br>3 missing men…', s2: '3 men vanished.<br>1 coat stayed.', s3: 'Why did all 3<br>leave the light?' };
const dir = `out/proj-${name}`; fs.mkdirSync(dir + '/assets', { recursive: true });
const used = new Set(['gsap.min.js']);
const r = (x) => Math.round(x * 1000) / 1000;
const clampT = (fx, fy, s) => {
  const tx = Math.min(0, Math.max(Wv - A * s, Wv / 2 - fx * s)), ty = Math.min(0, Math.max(Hv - A * s, Hv / 2 - fy * s));
  return { x: r(tx), y: r(ty), scale: r(s) };
};
const CAM = { push: [1.0, 1.12], pull: [1.14, 1.0], hold: [1.03, 1.07], panU: [1.06, 1.06] };

let html = '', js = '', track = 0;
const starts = story.map((_, i) => i === 0 ? 0 : r(tim.lines[i].start - 0.35 - (story[i].title ? 2.5 : 0)));
story.forEach((sh, i) => {
  const st = starts[i], en = i < story.length - 1 ? r(starts[i + 1] + XF) : D, d = r(en - st);
  const [s0, s1] = CAM[sh.c] || CAM.hold, f = sh.f || [960, 960];
  const fy0 = sh.c === 'panU' ? 1350 : f[1], fy1 = sh.c === 'panU' ? 650 : f[1];
  used.add(sh.s + '.png');
  let inner = `<img class="bg" src="assets/${sh.s}.png" />`;
  (sh.ov || []).forEach((o, k) => {
    const id = `o${i}_${k}`;
    if (o.img) { used.add(o.img + '.png'); inner += `<img id="${id}" class="bg" src="assets/${o.img}.png" style="opacity:0" />`;
      js += `tl.fromTo("#${id}",{opacity:0,scale:1.06},{opacity:1,scale:1,duration:0.35,ease:"power3.out"},${r(st + d * o.at)});\n`; }
    if (o.char) { used.add(`char-${o.char}.png`); const w = 700 * o.sc;
      inner += `<img id="${id}" class="ch" src="assets/char-${o.char}.png" style="left:${r(o.x - 350 * o.sc)}px;top:${r(o.y - 660 * o.sc)}px;width:${r(w)}px" />`;
      if (o.move) js += `tl.to("#${id}",{x:${o.move[0]},y:${o.move[1]},duration:${r(d - 0.5)},ease:"none"},${st});\n`;
      else js += `tl.fromTo("#${id}",{y:0},{y:-8,duration:${r(d / 4)},yoyo:true,repeat:3,ease:"sine.inOut"},${st});\n`; }
  });
  html += `<div id="c${i}" class="clip" data-start="${st}" data-duration="${d}" data-track-index="${track}"><div id="w${i}" class="world">${inner}</div></div>\n`;
  track = 1 - track;
  const a = clampT(f[0], fy0, s0), b = clampT(f[0], fy1, s1);
  js += `tl.fromTo("#w${i}",${JSON.stringify(a)},{...${JSON.stringify(b)},duration:${d},ease:"sine.inOut"},${st});\n`;
  if (i > 0) js += `tl.fromTo("#c${i}",{opacity:0},{opacity:1,duration:${XF},ease:"none"},${st});\n`;
  const lt = tim.lines[i];
  if (sh.lab) html += `<div id="l${i}" class="clip lab" data-start="${r(lt.start)}" data-duration="${r(Math.min(5, lt.end - lt.start))}" data-track-index="3">${sh.lab}</div>\n`;
  if (sh.title) { const [t1, t2] = sh.title.split('|');
    html += `<div id="t${i}" class="clip card" data-start="${r(st + 0.3)}" data-duration="${r(lt.start - st + 0.4)}" data-track-index="4"><div class="t1">${t1}</div><div class="t2">${t2}</div></div>\n`;
    js += `tl.fromTo("#t${i}",{opacity:0,y:20},{opacity:1,y:0,duration:0.6},${r(st + 0.3)});\n`; }
  if (sh.end) { const [t1, t2] = sh.end.split('|'), es = r(lt.end + 0.3);
    html += `<div id="e${i}" class="clip card" data-start="${es}" data-duration="${r(D - es)}" data-track-index="4"><div class="t1">${t1}</div><div class="t2">${t2}</div></div>\n`;
    js += `tl.fromTo("#e${i}",{opacity:0},{opacity:1,duration:0.8},${es});\n`; }
  if (!film) { // burned captions: 2–4 word chunks timed by character share
    const words = sh.t.split(' '), chunks = []; let cur = [];
    words.forEach(w => { cur.push(w); if (cur.length >= 4 || (cur.length >= 2 && /[.,?!:]$/.test(w))) { chunks.push(cur.join(' ')); cur = []; } });
    if (cur.length) chunks.push(cur.join(' '));
    const tot = chunks.reduce((s, c) => s + c.length, 0); let t = lt.start;
    chunks.forEach((c, k) => { const dd = (lt.end - lt.start) * c.length / tot;
      html += `<div id="k${i}_${k}" class="clip cap" data-start="${r(t)}" data-duration="${r(dd)}" data-track-index="5">${c}</div>\n`;
      js += `tl.fromTo("#k${i}_${k}",{scale:0.85},{scale:1,duration:0.12,ease:"back.out(3)"},${r(t)});\n`; t += dd; });
  }
});
if (!film) { html += `<div id="hook" class="clip hook" data-start="0" data-duration="3.2" data-track-index="6">${HOOK[name]}</div>\n`;
  js += `tl.fromTo("#hook",{opacity:0,y:-30},{opacity:1,y:0,duration:0.35,ease:"power2.out"},0.05);\n`; }

const css = `@font-face{font-family:LogSerif;font-weight:700;src:url(assets/Caladea-Bold.ttf)}
@font-face{font-family:LogMono;font-weight:700;src:url(assets/DejaVuSansMono-Bold.ttf)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${Wv}px;height:${Hv}px;overflow:hidden;background:#111}
#root{position:relative;width:${Wv}px;height:${Hv}px;overflow:hidden}
.clip{position:absolute;inset:0;overflow:hidden}
.world{position:absolute;left:0;top:0;width:${A}px;height:${A}px;transform-origin:0 0}
.bg{position:absolute;left:0;top:0;width:${A}px;height:${A}px;transform-origin:50% 50%}
.ch{position:absolute}
.lab{inset:auto;left:${film ? 90 : 60}px;bottom:${film ? 90 : 520}px;padding:14px 26px;background:rgba(30,20,12,.72);color:#efe3c8;
 font:700 ${film ? 34 : 38}px LogMono,monospace;letter-spacing:2px;border-left:8px solid #b3261e}
.card{display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(20,14,9,.55);color:#efe3c8;text-align:center}
.t1{font:700 ${film ? 120 : 110}px LogSerif,serif;letter-spacing:12px}
.t2{margin-top:18px;font:700 ${film ? 40 : 44}px LogMono,monospace;color:#e46a5e;letter-spacing:4px}
.cap{inset:auto;left:60px;right:60px;bottom:200px;text-align:center;color:#fff8e8;font:700 84px LogSerif,serif;line-height:1.05;
 -webkit-text-stroke:14px #1e140c;paint-order:stroke fill}
.hook{inset:auto;left:50px;right:50px;top:200px;text-align:center;color:#fff8e8;font:700 92px LogSerif,serif;line-height:1.05;
 -webkit-text-stroke:16px #b3261e;paint-order:stroke fill}`;

const doc = `<!doctype html>
<html lang="en" data-resolution="${film ? 'landscape' : 'portrait'}">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=${Wv}, height=${Hv}" />
<script src="assets/gsap.min.js"></script><style>${css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${Wv}" data-height="${Hv}">
${html}<audio id="sound" src="assets/audio.wav" data-start="0" data-duration="${D}" data-volume="1"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
</script>
</body></html>`;
fs.writeFileSync(dir + '/index.html', doc);
fs.writeFileSync(dir + '/hyperframes.json', JSON.stringify({ paths: { assets: 'assets' } }, null, 1));
for (const u of used) fs.copyFileSync(u === 'gsap.min.js' ? '../../../channel/episodes/ep03-rain/assets/gsap.min.js' : 'assets/' + u, `${dir}/assets/${u}`);
fs.copyFileSync('/usr/share/fonts/truetype/crosextra/Caladea-Bold.ttf', dir + '/assets/Caladea-Bold.ttf');
fs.copyFileSync('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', dir + '/assets/DejaVuSansMono-Bold.ttf');
fs.copyFileSync(`out/${name}-audio.wav`, `${dir}/assets/audio.wav`);
console.log(name, 'shots', story.length, 'duration', D, 'assets', used.size);
