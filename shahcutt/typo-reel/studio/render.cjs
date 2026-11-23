// usage: node studio/render.cjs [out.png]   renders studio/studio.html (2x) -> assets/studio.png (1080x1920, downscaled)
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const root = path.resolve(__dirname, ".."), out = path.resolve(process.argv[2] || path.join(root, "assets", "studio.png"));
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(d); }); }).listen(8792);
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log("pageerror", e.message)); p.on("console", (m) => { if (m.type() === "error") console.log("console", m.text()); });
  await p.goto("http://localhost:8792/studio/studio.html"); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const tmp = out.replace(/\.png$/, "@2x.png"); await p.screenshot({ path: tmp });
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-vf", "scale=1080:1920:flags=lanczos", out]); fs.unlinkSync(tmp);
  console.log("wrote", out); await b.close(); srv.close();
})();
