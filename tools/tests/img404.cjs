const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
(async () => {
  const b = await chromium.launch(); const bad = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    for (const u of ['/', '/404.html', '/admin/']) { await p.goto(BASE + u, { waitUntil: 'networkidle' }); await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } }); await p.waitForTimeout(800); }
  }
  console.log(bad.filter(x => !x.includes('/api/admin/me')).join('\n') || 'no failed requests');
  await b.close();
})();
