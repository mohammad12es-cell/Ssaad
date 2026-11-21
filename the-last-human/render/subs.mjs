// Renders every SRT cue to a transparent 1080x1920 PNG using Chromium's text engine
// (HarfBuzz shaping + bidi), so Persian is always shaped and ordered correctly.
// usage: node render/subs.mjs            -> build/subs/{fa,en}/cueN.png + cues.json
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const fontDir = path.join(root, "src", "fonts");
const font = (f) => `data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, f)).toString("base64")}`;

export function parseSrt(txt) {
  const ts = (s) => { const [h, m, r] = s.trim().split(":"); const [sec, ms] = r.split(","); return +h * 3600 + +m * 60 + +sec + +ms / 1000; };
  return txt.replace(/\r/g, "").trim().split(/\n\n+/).map((b) => {
    const lines = b.split("\n"); const [a, z] = lines[1].split("-->");
    return { start: ts(a), end: ts(z), text: lines.slice(2).join("\n") };
  });
}

const VERSION = (process.argv.find((a) => a.startsWith("--version=")) || "").split("=")[1] || "";
const SUBDIR = VERSION ? path.join("subtitles", VERSION) : "subtitles";
const OUTDIR = VERSION ? path.join("build", "subs_" + VERSION) : path.join("build", "subs");
const LANGS = { fa: { file: "EP01_FA.srt", dir: "rtl", size: 58 }, en: { file: "EP01_EN.srt", dir: "ltr", size: 56 } };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const out = {};
for (const [lang, cfg] of Object.entries(LANGS)) {
  const cues = parseSrt(fs.readFileSync(path.join(root, SUBDIR, cfg.file), "utf8"));
  const dir = path.join(root, OUTDIR, lang); fs.mkdirSync(dir, { recursive: true });
  out[lang] = [];
  for (const [i, c] of cues.entries()) {
    const top = c.text.startsWith("{\\an8}"); c.text = c.text.replace(/^\{\\an\d\}/, "");
    const html = `<!doctype html><html lang="${lang}" dir="${cfg.dir}"><head><meta charset="utf-8"><style>
      @font-face { font-family: Vazirmatn; font-weight: 700; src: url(${font("vazirmatn-arabic-700-normal.woff2")}) format("woff2"); unicode-range: U+0600-06FF, U+200C-200F, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FEFC; }
      @font-face { font-family: Vazirmatn; font-weight: 700; src: url(${font("vazirmatn-latin-700-normal.woff2")}) format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
      html, body { margin: 0; width: 1080px; height: 1920px; background: transparent; }
      .sub { position: absolute; left: 90px; right: 90px; top: ${top ? 330 : 1400}px; text-align: center; direction: ${cfg.dir}; unicode-bidi: plaintext;
        font-family: Vazirmatn, sans-serif; font-weight: 700; font-size: ${cfg.size}px; line-height: 1.55; color: #fff;
        text-shadow: 0 3px 10px rgba(0,0,0,.9), 0 0 3px rgba(0,0,0,.95), 0 0 22px rgba(0,0,0,.55); white-space: pre-line; }
    </style></head><body><div class="sub">${c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div></body></html>`;
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    // shrink long single-line cues so they never wrap awkwardly
    await page.evaluate(() => { const el = document.querySelector(".sub"); let fs = parseFloat(getComputedStyle(el).fontSize);
      const lh = () => parseFloat(getComputedStyle(el).lineHeight); while (el.scrollHeight > lh() * 1.2 && !el.textContent.includes("\n") && fs > 40) { fs -= 2; el.style.fontSize = fs + "px"; } });
    const ok = await page.evaluate(() => document.fonts.check("700 58px Vazirmatn", "ابن"));
    if (!ok) throw new Error("Vazirmatn failed to load");
    const file = path.join(dir, `cue${i + 1}.png`);
    await page.screenshot({ path: file, omitBackground: true });
    out[lang].push({ ...c, png: path.relative(root, file) });
  }
}
fs.writeFileSync(path.join(root, OUTDIR, "cues.json"), JSON.stringify(out, null, 2));
await browser.close();
console.log("subtitle overlays:", Object.entries(out).map(([k, v]) => `${k}=${v.length}`).join(" "));
