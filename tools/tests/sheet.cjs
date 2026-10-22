const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.argv[2] || 'tools/out';
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [n, vp] of [['ipadP', { width: 810, height: 1080 }], ['phone', { width: 390, height: 844 }]]) {
    const p = await (await b.newContext({ viewport: vp, hasTouch: true })).newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + '/#menu', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const card = p.locator('.card[data-id="fries"]'); await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
    await card.locator('.card__hit').click();
    const shots = [];
    for (const ms of [120, 260, 700]) { await p.waitForTimeout(ms - (shots.length ? [120, 260, 700][shots.length - 1] : 0)); await p.screenshot({ path: `${OUT}/${n}-${ms}.png` }); shots.push(ms);
      console.log(n, ms + 'ms', JSON.stringify(await p.evaluate(() => { const h = document.querySelector('.si__hero').getBoundingClientRect(), i = document.querySelector('#sheetImg').getBoundingClientRect();
        return { flyers: document.querySelectorAll('.flyer').length, img: [Math.round(i.width), Math.round(i.height)], inside: i.top >= h.top - 1 && i.bottom <= h.bottom + 1, op: getComputedStyle(document.querySelector('#sheetImg')).opacity }; }))); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    // reveal wave: scroll to a fresh category and sample
    await p.evaluate(() => document.querySelector('.cat:nth-of-type(3)')?.scrollIntoView({ behavior: 'instant' }));
    await p.waitForTimeout(80);
    const s1 = await p.evaluate(() => [...document.querySelectorAll('.card.in')].slice(-6).map((c) => [c.style.getPropertyValue('--rd'), (+getComputedStyle(c).opacity).toFixed(2)]));
    await p.waitForTimeout(1500);
    const s2 = await p.evaluate(() => [...document.querySelectorAll('.card')].filter((c) => { const r = c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).map((c) => (+getComputedStyle(c).opacity).toFixed(2) + '/' + (+getComputedStyle(c.querySelector('.card__media img')).opacity).toFixed(2)));
    console.log(n, 'wave start', JSON.stringify(s1), '| settled', JSON.stringify(s2));
    await p.context().close();
  }
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
