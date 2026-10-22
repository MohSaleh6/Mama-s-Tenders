const { chromium } = require('playwright');
const OUT = process.argv[2] || 'tools/out';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
(async () => {
  const b = await chromium.launch({ args: ['--proxy-server=' + process.env.HTTPS_PROXY] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-JO', ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/#branches', { waitUntil: 'load' });
  await p.waitForTimeout(9000);
  console.log('loaded class:', await p.getAttribute('#branchMap', 'class'));
  await p.screenshot({ path: `${OUT}/map-d1.png` });
  await p.click('.bcard[data-map="mecca"] h3');
  await p.waitForTimeout(8000);
  await p.screenshot({ path: `${OUT}/map-d2.png` });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
