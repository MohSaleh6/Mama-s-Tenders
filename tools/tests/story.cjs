const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.argv[2] || 'tools/out';
const only = process.argv[3];
const PS = [0, 0.3, 0.55, 0.6, 0.63, 0.66, 0.7, 0.75, 0.8, 0.86, 0.92, 1];
(async () => {
  const browser = await chromium.launch();
  for (const [n, vp] of [['m', { width: 390, height: 844 }], ['d', { width: 1440, height: 900 }]]) {
    if (only && only !== n) continue;
    const ctx = await browser.newContext({ viewport: vp, hasTouch: n === 'm' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    for (const p of PS) {
      await page.evaluate((p) => {
        const sec = document.querySelector('#top');
        const span = sec.offsetHeight - innerHeight;
        const top = sec.getBoundingClientRect().top + scrollY;
        document.documentElement.style.scrollBehavior = 'auto';
        scrollTo(0, top + span * p);
      }, p);
      await page.waitForTimeout(p === 0.57 ? 120 : 450);
      await page.screenshot({ path: `${OUT}/s-${n}-${String(Math.round(p * 100)).padStart(3, '0')}.png` });
    }
    console.log(n, errs.join(' | ') || 'no errors');
    await ctx.close();
  }
  await browser.close();
})();
