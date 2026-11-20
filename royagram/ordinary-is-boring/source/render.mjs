// Frame renderer: serves ./source over HTTP, drives headless Chromium (WebGL2 via SwiftShader), writes PNG frames.
// usage: node render.mjs OUT_DIR [startFrame] [endFrame(excl)] [step] [--times t1,t2,...]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };
const args = process.argv.slice(2);
const out = args[0]; fs.mkdirSync(out, { recursive: true });
let times = null; const ti = args.indexOf('--times'); if (ti >= 0) times = args[ti + 1].split(',').map(Number);
const start = +(args[1] ?? 0), end = +(args[2] ?? 600), step = +(args[3] ?? 1);
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.waitForFunction(() => window.ready !== undefined, null, { timeout: 120000 });
await page.evaluate(() => window.ready);
const list = times ? times.map((t) => ({ t, name: `t${t.toFixed(2)}` })) : [];
if (!times) for (let f = start; f < end; f += step) list.push({ t: f / 24, name: String(f).padStart(4, '0') });
const t0 = Date.now();
for (const { t, name } of list) {
  const a = Date.now();
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  await page.screenshot({ path: path.join(out, `${name}.png`), type: 'png' });
  console.log(`${name} t=${t.toFixed(3)} ${(Date.now() - a)}ms`);
}
console.log(`done ${list.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close(); server.close();
