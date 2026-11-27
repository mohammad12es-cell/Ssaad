// Finds clipped letters: seeks the real timeline to moments where each text is fully on screen, screenshots each
// text element as styled and again with every clip removed (background-clip, clip-path, filter), and counts ink
// pixels present only in the unclipped version. usage: node tools/clipcheck.cjs
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path");
const { PNG } = require(path.join(process.env.HOME, ".claude/skills/reanimate/scripts/node_modules/pngjs"));
const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".otf": "font/otf", ".woff2": "font/woff2", ".wav": "audio/wav" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(d); }); }).listen(8794);
const M = [5.965, 8.665, 11.365, 14.065, 16.765];
const checks = [[2.5, ["#hS1", "#hScr", "#hW"]], [3.85, ["#hS2", "#hR"]], [5.3, ["#bTop", "#bBig", "#bBot"]],
  ...M.flatMap((t, k) => [[t + 1.25, [`#gM${k + 1} .sm`, `#gM${k + 1} .scr`, `#gM${k + 1} .w`]], [t + 2.05, [`#gM${k + 1} .r`]]]),
  [21.8, ["#cS", "#cW", "#cSub", "#part"]]];
const ink = (buf) => { const p = PNG.sync.read(buf); const m = new Uint8Array(p.width * p.height);
  for (let i = 0; i < m.length; i++) { const r = p.data[i * 4], g = p.data[i * 4 + 1], b = p.data[i * 4 + 2]; m[i] = (0.3 * r + 0.59 * g + 0.11 * b) > 70 ? 1 : 0; } return { m, w: p.width, h: p.height }; };
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto("http://localhost:8794/index.html"); await pg.waitForTimeout(2500);
  if (!(await pg.evaluate(() => !!(window.__timelines && window.__timelines.main)))) throw new Error("timeline not registered");
  await pg.evaluate(() => document.fonts.ready);
  // a plain black backdrop so only text ink counts
  await pg.addStyleTag({ content: "#studioWrap,#cardSvg,#badgeIn,.xx,#cursor,#circleSvg,#strokeSvg,.sq,#dots,#blackGlow,#arcs,#bubbles{visibility:hidden!important} #black{background:#000!important}" });
  let bad = 0;
  for (const [t, sels] of checks) {
    await pg.evaluate((t) => { window.__timelines.main.seek(t, false); document.querySelector("#stage").style.filter = "none"; }, t);
    for (const sel of sels) {
      const box = await pg.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top - 260), width: 1080, height: Math.min(1920 - Math.max(0, r.top - 260), r.height + 520), op: getComputedStyle(e).opacity }; }, sel);
      const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
      // hide every other text element so neighbours do not count
      await pg.evaluate((sel) => { document.querySelectorAll(".ln,#part").forEach((e) => { if (e !== document.querySelector(sel)) e.dataset.v = e.style.visibility, e.style.visibility = "hidden"; }); }, sel);
      const A = ink(await pg.screenshot({ clip }));
      await pg.evaluate((sel) => { const e = document.querySelector(sel); e.dataset.s = e.getAttribute("style") || "";
        for (const x of [e, ...e.querySelectorAll("*")]) { x.style.setProperty("background", "none", "important"); x.style.setProperty("-webkit-text-fill-color", "#bdbdbd", "important"); x.style.setProperty("color", "#bdbdbd", "important"); x.style.setProperty("clip-path", "none", "important"); x.style.setProperty("filter", "none", "important"); x.style.setProperty("overflow", "visible", "important"); } }, sel);
      const B = ink(await pg.screenshot({ clip }));
      await pg.evaluate((sel) => { const e = document.querySelector(sel); e.setAttribute("style", e.dataset.s); for (const x of e.querySelectorAll("*")) x.removeAttribute("style");
        document.querySelectorAll(".ln,#part").forEach((x) => { if (x.dataset.v !== undefined) { x.style.visibility = x.dataset.v; delete x.dataset.v; } }); }, sel);
      let miss = 0, y0 = 1e9, y1 = -1;
      for (let i = 0; i < A.m.length; i++) if (B.m[i] && !A.m[i]) { miss++; const y = Math.floor(i / A.w); if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const tot = B.m.reduce((s, v) => s + v, 0), pct = tot ? (100 * miss / tot) : 0;
      if (pct > 0.5) bad++;
      console.log(`${t.toFixed(2).padStart(6)}s ${sel.padEnd(14)} ink ${String(tot).padStart(6)}  missing ${String(miss).padStart(5)} (${pct.toFixed(1)} %)` + (miss ? `  rows ${y0 + box.y}-${y1 + box.y}` : "") + (pct > 0.5 ? "  <-- CLIPPED" : ""));
    }
  }
  console.log(bad ? `\n${bad} element(s) clipped` : "\nno clipped text");
  await b.close(); srv.close();
})();
