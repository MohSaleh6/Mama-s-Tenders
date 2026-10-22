const { chromium } = require('playwright');
const OUT = process.argv[2] || 'tools/out';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [name, vp, mobile] of [['m', { width: 390, height: 844 }, true], ['d', { width: 1440, height: 900 }, false]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: false, hasTouch: mobile, locale: 'ar-JO' });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] ${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}-01-hero.png` });
    const sections = ['#menu', '#branches', '#reviews', '.foot'];
    let i = 2;
    for (const s of sections) {
      await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ behavior: 'instant', block: 'start' }), s);
      if (false) {
        await page.evaluate(() => window.scrollBy(0, innerHeight * 0.8));
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${name}-${String(i++).padStart(2, '0')}-${s.replace(/[#.]/,'')}.png` });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errors.join('\n') || 'no console errors');
})();
