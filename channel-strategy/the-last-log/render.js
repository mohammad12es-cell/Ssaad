const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  for (const [k, w, h] of [['avatar', 800, 800], ['banner', 2560, 1440]]) {
    await p.setViewportSize({ width: w, height: h }); await p.goto('file://' + path.resolve('brand.html') + '?k=' + k);
    await p.waitForTimeout(200); await p.screenshot({ path: k + '.png' }); }
  await b.close(); })();
