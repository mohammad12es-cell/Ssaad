// Frame renderer: headless Chromium (software WebGL) -> PNG frames
// usage: node src/render.mjs --out renders/frames --from 0 --to 1080 --workers 3 [--scale 1] [--step 1] [--only s1]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
const args = {};
for (let i = 2, a = process.argv; i < a.length; i++) {
  if (!a[i].startsWith('--')) continue;
  const k = a[i].slice(2), next = a[i + 1];
  args[k] = next !== undefined && !next.startsWith('--') ? (i++, next) : true;
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(ROOT, args.out || 'renders/frames'); fs.mkdirSync(out, { recursive: true });
const from = +(args.from ?? 0), to = +(args.to ?? 1080), workers = +(args.workers ?? 3), scale = +(args.scale ?? 1), step = +(args.step ?? 1);
const frames = (args.frames ? args.frames.split(',').map(Number) : Array.from({ length: Math.ceil((to - from) / step) }, (_, i) => from + i * step))
  .filter((f) => ('force' in args) || !fs.existsSync(path.join(out, `f${String(f).padStart(5, '0')}.png`)));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise((r) => srv.listen(0, r)); const port = srv.address().port;
const W = Math.round(1080 * scale), H = Math.round(1920 * scale);
const t0 = Date.now(); let done = 0;
async function worker(list, id) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[w${id}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`[w${id}] pageerror: ${e.message}`));
  await page.goto(`http://localhost:${port}/src/index.html?scale=${scale}${args.only ? '&only=' + args.only : ''}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 600000 });
  for (const f of list) {
    await page.evaluate((f) => window.renderFrame(f), f);
    await page.screenshot({ path: path.join(out, `f${String(f).padStart(5, '0')}.png`), type: 'png' });
    done++; if (done % 24 === 0 || done === frames.length) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${frames.length} frames  ${el.toFixed(0)}s  (${(el / done).toFixed(2)} s/frame)`); }
  }
  await browser.close();
}
const lists = Array.from({ length: workers }, () => []);
frames.forEach((f, i) => lists[i % workers].push(f));
await Promise.all(lists.map((l, i) => (l.length ? worker(l, i) : null)));
srv.close(); console.log('done', frames.length, 'frames in', ((Date.now() - t0) / 1000).toFixed(0) + 's');
