const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => { window.__ls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ls.push({ v: e.value, t: Math.round(e.startTime), s: e.sources.map((s) => ({ n: s.node?.id || s.node?.className || s.node?.nodeName, p: [s.previousRect.y, s.previousRect.height], c: [s.currentRect.y, s.currentRect.height] })) }); }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  console.log(JSON.stringify(await p.evaluate(() => window.__ls), null, 0));
  await b.close();
})();
