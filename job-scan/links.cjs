// Usage: node links.cjs <out.json> <url>...  -> [{url, links:[{href,text}]}]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, ...urls] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ userAgent: 'video-edit-tool/1.0 (generic client)', locale: 'en-US' });
  const res = [];
  for (const u of urls) {
    const p = await ctx.newPage();
    try {
      await p.goto(u, { waitUntil: 'networkidle', timeout: 45000 });
      for (let i = 0; i < +(process.env.SCROLLS || 0); i++) { await p.mouse.wheel(0, 6000); await p.waitForTimeout(1500); }
      await p.waitForTimeout(1500);
      const links = await p.$$eval('a', as => as.map(a => ({ href: a.href, text: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160) })));
      res.push({ url: u, links });
    } catch (e) { res.push({ url: u, error: String(e).slice(0, 200) }); }
    await p.close();
  }
  await b.close();
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
})();
