// Offline renderer for THE LAST TWO v2: steps the film at exactly 24 fps in headless Chromium.
//   node render.mjs --preview 1.5,4.9,7.3 [--w 1920 --h 1080 --mb 1]  -> PNG stills in ./preview
//   node render.mjs --segdir DIR --from 0 --to 360 [--mb 3]            -> resumable 1-second near-lossless segments
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const dir = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const W = +(args.w || 3840), H = +(args.h || 2160), MB = +(args.mb || (args.preview ? 1 : 3));
const FPS = 24, SEG = +(args.seg || 6);

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = http.createServer((req, res) => {
  const p = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(dir) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-watchdog", "--js-flags=--max-old-space-size=8192"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("console", (m) => console.log("[page]", m.text().slice(0, 400)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.setDefaultTimeout(0);
await page.goto(`http://localhost:${port}/index.html?w=${W}&h=${H}&mb=${MB}&dbg=${args.dbg || ''}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 0 });
const grab = async () => page.locator("#out").screenshot({ type: "png" });

if (args.preview) {
  const pdir = path.join(dir, args.pdir || "preview"); fs.mkdirSync(pdir, { recursive: true });
  for (const t of args.preview.split(",").map(Number)) {
    const t0 = Date.now(); await page.evaluate((t) => window.renderFrame(t), t);
    fs.writeFileSync(path.join(pdir, `t${t.toFixed(2)}.png`), await grab());
    console.log(`t=${t} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} else {
  const from = +(args.from || 0), to = +(args.to || 15 * FPS), sd = args.segdir; fs.mkdirSync(sd, { recursive: true });
  for (let s0 = from; s0 < to; s0 += SEG) {
    const file = path.join(sd, `seg${String(s0).padStart(4, "0")}.mkv`);
    if (fs.existsSync(file)) { console.log("skip", file); continue; }
    const tmp = file + ".part.mkv";
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "8", "-pix_fmt", "yuv444p", tmp], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let f = s0; f < Math.min(to, s0 + SEG); f++) {
      await page.evaluate((t) => window.renderFrame(t), f / FPS);
      const buf = await grab(); if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r)); fs.renameSync(tmp, file);
    console.log(`segment ${s0} done, ${((Date.now() - t0) / 1000 / SEG).toFixed(1)}s/frame`);
  }
}
await browser.close(); server.close();
