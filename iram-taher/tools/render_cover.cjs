// usage: node tools/render_cover.cjs [out.png]   (serves the project on :8791 and screenshots cover/cover.html at 1080x1920)
// Needs assets/media/cover-presenter.png from tools/cover_cutout.py (client likeness, not in git).
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, ".."), out = path.resolve(process.argv[2] || path.join(root, "renders", "iram-taher-cover.png"));
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(d); }); }).listen(8791);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  p.on("requestfailed", (q) => console.log("requestfailed", q.url()));
  await p.goto("http://localhost:8791/cover/cover.html"); await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await p.screenshot({ path: out }); console.log("wrote", out);
  await b.close(); srv.close();
})();
