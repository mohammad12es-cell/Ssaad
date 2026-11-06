// Bake every scene, overlay and character to PNG in ./assets (texture/filters rendered once).
const { chromium } = require('playwright'); const path = require('path');
const scenes = ['dark','lit','dawn','map','island','ship','harbour','steps','interior','coat','ghosts','log','logmarks','poem','archive','search','gallery','report','landing','wave','damage','ring'];
const chars = ['ducat','marshall','macarthur','moore','muirhead'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const url = (q) => 'file://' + path.resolve('art.html') + q;
  for (const s of scenes) { await p.setViewportSize({ width: 1920, height: 1920 }); await p.goto(url('?s=' + s)); await p.waitForTimeout(150);
    await p.screenshot({ path: `assets/${s}.png`, omitBackground: true }); }
  for (const c of chars) { await p.setViewportSize({ width: 700, height: 700 }); await p.goto(url('?c=' + c)); await p.waitForTimeout(100);
    await p.screenshot({ path: `assets/char-${c}.png`, omitBackground: true }); }
  await b.close();
})();
