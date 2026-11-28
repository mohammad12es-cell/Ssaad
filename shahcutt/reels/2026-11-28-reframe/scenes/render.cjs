// usage: node scenes/render.cjs [scene ...]   renders scenes/scenes.html?s=<scene> at 2x -> assets/img/<scene>.png
// studio/person are 16:9 (1920x1080, the "horizontal footage"); the others are 9:16 (1080x1920). person keeps its alpha.
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const root = path.resolve(__dirname, ".."), outDir = path.join(root, "assets", "img"); fs.mkdirSync(outDir, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(d); }); }).listen(8793);
const all = process.argv.slice(2).length ? process.argv.slice(2) : ["studio", "person", "clock", "tvs", "hill"];
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const s of all) {
    const wide = s === "studio" || s === "person", W = wide ? 1920 : 1080, H = wide ? 1080 : 1920;
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    p.on("pageerror", (e) => console.log(s, "pageerror", e.message)); p.on("console", (m) => { if (m.type() === "error") console.log(s, "console", m.text()); });
    await p.goto(`http://localhost:8793/scenes/scenes.html?s=${s}`); await p.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
    const tmp = path.join(outDir, `${s}@2x.png`), out = path.join(outDir, `${s}.png`);
    await p.screenshot({ path: tmp, omitBackground: true });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-vf", `scale=${W}:${H}:flags=lanczos`, out]); fs.unlinkSync(tmp);
    console.log("wrote", out); await p.close();
  }
  await b.close(); srv.close();
})();
