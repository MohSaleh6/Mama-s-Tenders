const { chromium } = require('playwright');
const OUT = process.argv[2] || 'tools/out';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1000, height: 630 } });
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.mouse.move(500, 300);
  const samples = [];
  for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 140); await p.waitForTimeout(30); samples.push(await p.evaluate(() => document.querySelector('#nav').style.getPropertyValue('--lean'))); }
  await p.waitForTimeout(1500);
  const settled = await p.evaluate(() => document.querySelector('#nav').style.getPropertyValue('--lean'));
  console.log('lean while scrolling:', samples.join(' '), '| after stop:', settled);
  await p.evaluate(() => document.querySelector('#branches').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(1600);
  console.log('branch photos:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.bcard__photo img')].map((i) => [i.alt, i.complete && i.naturalWidth, Math.round(i.getBoundingClientRect().width)]))));
  console.log('revealed cards', await p.evaluate(() => document.querySelectorAll('.bcard.in').length), 'icons visible:', await p.evaluate(() => [...document.querySelectorAll('.bcard.in .ic')].every((i) => getComputedStyle(i).opacity === '1')));
  await p.screenshot({ path: `${OUT}/branches-1000.png` });
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
