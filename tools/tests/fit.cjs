// Measures overlaps in the story at several viewports (hero at top, combo at end).
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.argv[2] || 'tools/out';
const VPS = [[1000, 630, 'ipadL'], [1080, 680, 'ipad10L'], [1180, 700, 'ipadAirL'], [810, 1000, 'ipadP'], [1366, 900, 'desk'], [390, 664, 'iphoneSafari'], [375, 560, 'se'], [430, 800, 'promax']];
(async () => {
  const b = await chromium.launch();
  for (const [w, h, n] of VPS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100 });
    await ctx.addInitScript(() => localStorage.setItem('mc_cart', JSON.stringify([{ id: 'smash', size: '150g', qty: 2, combo: false, addons: [], note: '' }])));
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1300);
    const r = (s) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const q = e.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) }; }, s);
    const nav = await r('.logo'), copy = await r('#storyCopy'), badge = await r('.gbadge'), ctas = await r('.hero__ctas'), open = await r('.hero__open'), dock = await r('#dock'), hint = await r('#storyHint');
    const dockVis = await p.evaluate(() => document.querySelector('#dock').classList.contains('is-on') ? 'shown' : 'hidden');
    await p.screenshot({ path: `${OUT}/${n}-hero.png` });
    const H = await p.evaluate(() => document.querySelector('#top').offsetHeight - innerHeight);
    await p.evaluate((y) => scrollTo(0, y), H); await p.waitForTimeout(900);
    const head = await r('#comboHead .sectitle'), box = await r('.box'), lid = await r('#boxLid'), dip = await r('.box__dip'), cta = await r('#comboCta');
    await p.screenshot({ path: `${OUT}/${n}-combo.png` });
    const issues = [];
    if (badge.t < nav.b + 4 && badge.r > nav.l - 4 && badge.l < nav.r + 4) issues.push(`badge under logo (badge.t ${badge.t} < logo.b ${nav.b})`);
    if (copy.t < 0) issues.push('copy above viewport');
    if (open.b > h) issues.push(`open line off-screen (${open.b} > ${h})`);
    if (head.b > box.t - 6) issues.push(`price overlaps box (head.b ${head.b} box.t ${box.t})`);
    if (box.b > cta.t - 4) issues.push(`box overlaps CTA (${box.b} > ${cta.t})`);
    if (cta.b > h) issues.push('CTA off-screen');
    if (dip.b > cta.t - 2 && dip.r > cta.l && dip.l < cta.r) issues.push(`dip touches CTA (${dip.b} > ${cta.t})`);
    if (dip.l < 0 || dip.r > w) issues.push('dip off-screen');
    if (ctas.b > h - 50) issues.push(`hero buttons too low (${ctas.b})`);
    if (!dockVis.startsWith('hidden')) issues.push('dock over hero');
    console.log(n, `${w}x${h}`, issues.length ? 'ISSUES: ' + issues.join('; ') : 'ok', '| dock', dockVis, '| dip', JSON.stringify(dip), 'box', JSON.stringify(box));
    await ctx.close();
  }
  await b.close();
})();
