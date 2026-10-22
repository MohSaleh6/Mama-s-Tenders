const { chromium } = require('playwright');
const OUT = process.argv[2] || 'tools/out';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'ar-JO' })).newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  console.log(await p.evaluate(() => {
    const out = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sx: scrollX, bodyOv: getComputedStyle(document.body).overflowX, htmlOv: getComputedStyle(document.documentElement).overflowX, vv: visualViewport.width, iw: innerWidth };
    out.body = document.body.getBoundingClientRect().width; out.main = document.querySelector('main').getBoundingClientRect().width;
    out.cont = [...document.querySelectorAll('.container')].map(e => Math.round(e.getBoundingClientRect().left)+'..'+Math.round(e.getBoundingClientRect().right)).join(' ');
    out.wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).slice(0, 25).map(e => e.tagName+'.'+e.className+'#'+e.id+' '+Math.round(e.getBoundingClientRect().left)+'..'+Math.round(e.getBoundingClientRect().right)+' '+getComputedStyle(e).position);
    return JSON.stringify(out, null, 1);
  }));
  await p.screenshot({ path: `${OUT}/ovf.png` });
  console.log(await p.evaluate(() => { const h = document.querySelector('.hero__title'); const r = h.getBoundingClientRect(); const c = document.querySelector('#storyCopy').getBoundingClientRect(); const pin = document.querySelector('#storyPin').getBoundingClientRect(); return `title ${r.left}..${r.right} copy ${c.left}..${c.right} pin ${pin.left}..${pin.right} tf ${getComputedStyle(document.querySelector('#storyCopy')).transform}`; }));
  await b.close();
})();
