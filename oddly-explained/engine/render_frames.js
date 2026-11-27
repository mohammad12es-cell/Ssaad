#!/usr/bin/env node
// ODDLY EXPLAINED engine — deterministic frame renderer.
// Serves the project over a local HTTP server, opens a page in headless Chromium (WebGL2 via SwiftShader
// or a real GPU when present) and captures frames by calling window.OE.renderFrame(i).
//
// usage: node engine/render_frames.js --page videos/001-falling-asleep/scene.html --out build/frames3d
//          [--frames 0-899 | --list 0,30,60] [--scale 0.5] [--workers 2] [--transparent] [--query a=b] [--resume]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) { if (av[i].startsWith('--')) { const k = av[i].slice(2); const v = av[i + 1] && !av[i + 1].startsWith('--') ? av[++i] : true; args[k] = v; } }
const ROOT = path.resolve(__dirname, '..');
const page = args.page; const out = path.resolve(args.out || 'build/frames');
const scale = Number(args.scale || 1); const workers = Number(args.workers || 1);
fs.mkdirSync(out, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const probe = await browser.newPage();
  const q = `scale=${scale}` + (args.query ? `&${args.query}` : '');
  const url = `http://127.0.0.1:${port}/${page}?${q}`;
  const cfgPage = await probe.evaluate(async (u) => { const r = await fetch(u.replace(/\/[^/]*$/, '/config.json')); return r.ok ? r.json() : null; }, url).catch(() => null);
  await probe.close();
  const W = Math.round((cfgPage?.width || 1080) * scale), H = Math.round((cfgPage?.height || 1920) * scale);
  let frames = [];
  if (args.list) frames = String(args.list).split(',').map(Number);
  else { const [a, b] = String(args.frames || `0-${Math.round((cfgPage?.duration || 30) * (cfgPage?.fps || 30)) - 1}`).split('-').map(Number); for (let i = a; i <= b; i++) frames.push(i); }
  if (args.resume) { // skip frames already rendered (restart-safe long renders)
    const before = frames.length; frames = frames.filter((i) => { const f = path.join(out, `f${String(i).padStart(4, '0')}.png`); return !(fs.existsSync(f) && fs.statSync(f).size > 0); });
    console.log(`resume: ${before - frames.length} frames already done, ${frames.length} to render`);
  }
  const t0 = Date.now(); let done = 0;
  const chunks = Array.from({ length: workers }, (_, w) => frames.filter((_, i) => i % workers === w));
  await Promise.all(chunks.map(async (list, w) => {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[page ${w}] ${m.text()}`); });
    p.on('pageerror', (e) => console.error(`[page ${w}] ${e.stack || e.message}`));
    await p.goto(url);
    let bootErr; const failed = new Promise((_, rej) => p.on('pageerror', (e) => { bootErr = e; rej(new Error(`page error during boot: ${e.message}`)); }));
    failed.catch(() => {});
    await Promise.race([p.waitForFunction(() => window.__ready === true, null, { timeout: 600000 }), failed]); // fail fast instead of waiting for the timeout
    for (const i of list) {
      await p.evaluate((i) => window.OE.renderFrame(i), i);
      await p.screenshot({ path: path.join(out, `f${String(i).padStart(4, '0')}.png`), omitBackground: !!args.transparent, type: 'png' });
      done++;
      if (done % 10 === 0 || done === frames.length) {
        const el = (Date.now() - t0) / 1000; process.stdout.write(`\r${done}/${frames.length} frames  ${(el / done).toFixed(2)}s/frame  eta ${((frames.length - done) * el / done / 60).toFixed(1)}min   `);
      }
    }
    await ctx.close();
  }));
  console.log(`\nrendered ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${out}`);
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
