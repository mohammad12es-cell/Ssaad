// Usage: node pagetexts.cjs <urls.txt> <out.json> : visible body text of each URL
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [inp, out] = process.argv.slice(2);
  const urls = fs.readFileSync(inp, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  const b = await chromium.launch();
  const ctx = await b.newContext({ userAgent: 'video-edit-tool/1.0 (generic client)', locale: 'en-US' });
  const res = [];
  for (const u of urls) {
    const p = await ctx.newPage();
    try { await p.goto(u, { waitUntil: 'networkidle', timeout: 45000 }); res.push({ url: u, text: (await p.innerText('body')).replace(/\n\s*\n+/g, '\n') }); }
    catch (e) { res.push({ url: u, error: String(e).slice(0, 200) }); }
    await p.close(); await new Promise(r => setTimeout(r, 600));
  }
  await b.close();
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(res.length);
})();
