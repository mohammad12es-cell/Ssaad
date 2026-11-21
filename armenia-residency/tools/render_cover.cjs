// usage: node tools/render_cover.cjs <out-dir> [page=cover.html] [file=armenia-residency-cover.png]   (serves the project on :8796)
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, ".."), out = path.resolve(process.argv[2] || root);
const page = process.argv[3] || "cover.html", file = process.argv[4] || "armenia-residency-cover.png";
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(d); }); }).listen(8796);
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const v of ["a"]) {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    p.on("pageerror", (e) => console.log("pageerror", e.message));
    await p.goto(`http://localhost:8796/cover/${page}?v=${v}`); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    const f = path.join(out, file); await p.screenshot({ path: f }); console.log("wrote", f); await p.close();
  }
  await b.close(); srv.close();
})();
