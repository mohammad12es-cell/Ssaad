// usage: node tools/render_cover.cjs <out-dir>   (serves the project on :8790 and screenshots both variants)
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, ".."), out = path.resolve(process.argv[2] || root);
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(d); }); }).listen(8790);
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const v of ["a", "b"]) {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    p.on("pageerror", (e) => console.log("pageerror", e.message));
    await p.goto(`http://localhost:8790/cover/cover.html?v=${v}`); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const f = path.join(out, `yerevan-christmas-cover-${v}.png`); await p.screenshot({ path: f }); console.log("wrote", f); await p.close();
  }
  await b.close(); srv.close();
})();
