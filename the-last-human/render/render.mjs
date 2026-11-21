// Deterministic frame renderer: loads src/index.html in headless Chromium and captures
// every frame by calling window.renderFrame(f). Every frame is a pure function of f.
// usage: node render/render.mjs --out DIR [--from 0] [--to 899] [--step 1] [--workers 3] [--frames 12,90,400]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./server.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../src");
const args = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean).map((s) => { const [k, ...v] = s.trim().split(/\s+/); return [k, v.join(" ") || "1"]; }));
const out = path.resolve(args.out || "frames");
fs.mkdirSync(out, { recursive: true });
let list = [];
if (args.frames) list = args.frames.split(",").map(Number);
else { const a = +(args.from || 0), b = +(args.to ?? 899), st = +(args.step || 1); for (let f = a; f <= b; f += st) list.push(f); }
if (args.skip) list = list.filter((f) => !fs.existsSync(path.join(out, `f${String(f).padStart(4, "0")}.png`)));
const W = Math.max(1, Math.min(+(args.workers || 1), list.length || 1));

const { srv, url } = await serve(root);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const t0 = Date.now(); let done = 0;
async function worker(i) {
  const mine = list.filter((_, k) => k % W === i);
  if (!mine.length) return;
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[page ${i}]`, m.text()); });
  page.on("pageerror", (e) => console.log(`[page ${i}] ERROR`, e.message));
  await page.goto(`${url}/${args.page || "index.html"}?render=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  for (const f of mine) {
    const b64 = await page.evaluate((f) => window.renderFrame(f), f);
    fs.writeFileSync(path.join(out, `f${String(f).padStart(4, "0")}.png`), Buffer.from(b64.split(",")[1], "base64"));
    done++;
    if (done % 10 === 0 || done === list.length) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${done}/${list.length} frames  ${(el / done).toFixed(2)}s/frame  eta ${((list.length - done) * el / done / 60).toFixed(1)} min`);
    }
  }
  await page.close();
}
await Promise.all([...Array(W).keys()].map(worker));
await browser.close(); srv.close();
console.log(`rendered ${list.length} frames to ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
