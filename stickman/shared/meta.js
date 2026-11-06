// Loads a built episode page and prints window.EPMETA (duration, sound cues, music) as JSON.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + process.argv[2] + '/index.html');
  await p.waitForFunction(() => window.EPMETA || false, null, { timeout: 8000 }).catch(() => {});
  const m = await p.evaluate(() => window.EPMETA || null);
  await b.close();
  if (!m) { console.error('NO META', errs.join('\n')); process.exit(1); }
  if (errs.length) console.error(errs.join('\n'));
  console.log(JSON.stringify(m));
})();
