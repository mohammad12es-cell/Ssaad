// Offline renderer: steps the scene at exactly 24 fps and pipes frames into ffmpeg.
//   node render.mjs --preview 0,4,8,12,14.9 [--w 960 --h 540]   -> PNG stills in ./preview
//   node render.mjs --out video.mp4 [--from 0 --to 360 --mb 3]  -> silent H.264 video (frames [from,to))
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const dir = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const W = +(args.w || 1920), H = +(args.h || 1080), MB = +(args.mb || (args.preview ? 1 : 3));
const FPS = 24, FRAMES = 15 * FPS;

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = http.createServer((req, res) => {
  const p = path.join(dir, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(dir) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-watchdog"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.setDefaultTimeout(0);
await page.goto(`http://localhost:${port}/index.html?w=${W}&h=${H}&mb=${MB}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 0 });
const grab = async () => page.locator("#out").screenshot({ type: "png" });

if (args.preview) {
  fs.mkdirSync(path.join(dir, "preview"), { recursive: true });
  for (const t of args.preview.split(",").map(Number)) {
    const t0 = Date.now(); await page.evaluate((t) => window.renderFrame(t), t);
    fs.writeFileSync(path.join(dir, "preview", `t${t.toFixed(2)}.png`), await grab());
    console.log(`t=${t} ${Date.now() - t0}ms`);
  }
} else {
  const from = +(args.from || 0), to = +(args.to || FRAMES);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-tune", "film", args.out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / FPS);
    const buf = await grab();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 12 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / (f - from + 1) / 1000).toFixed(2)}s/frame`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
}
await browser.close(); server.close();
