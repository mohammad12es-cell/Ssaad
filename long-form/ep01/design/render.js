// node render.js → out/*.png (preview stills; the Short itself is rendered by HyperFrames)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const shot = async (file, q, w, h, out) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + path.resolve(file) + q); await p.waitForTimeout(400);
    await p.screenshot({ path: 'out/' + out }); await p.close();
  };
  await shot('cast.html', '', 1920, 1080, 'cast.png');
  for (const s of ['dark', 'coat', 'log', 'wave']) await shot('scenes.html', '?s=' + s, 1080, 1920, `scene-${s}.png`);
  await b.close();
})();
