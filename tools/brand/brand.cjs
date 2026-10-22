// Renders the share image (public/img/og.jpg) and the app icons (public/icons/*) from public/img/logo.svg.
// Usage (dev server running): node tools/brand/brand.cjs
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = require('path').resolve(__dirname, '../../public');
const fonts = `@font-face{font-family:Alfa;src:url(${B}/fonts/alfaslab-latin.woff2)}@font-face{font-family:Baloo;src:url(${B}/fonts/baloo-arabic.woff2)}@font-face{font-family:Cairo;src:url(${B}/fonts/cairo-latin.woff2);font-weight:400 800}`;
// pad = space around the badge (maskable icons need ~20% safe zone)
const icon = (size, pad) => `<!doctype html><html><head><style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#0d0b09;display:grid;place-items:center}img{width:${100 - pad * 2}%;height:auto}</style></head><body><img src="${B}/img/logo.svg"></body></html>`;
const og = `<!doctype html><html><head><style>${fonts}html,body{margin:0;width:1200px;height:630px;background:#0d0b09;overflow:hidden;color:#fbf3e4}
.bolt{position:absolute;top:0;bottom:0;right:-40px;width:640px;background:#ffb81c;clip-path:polygon(62% 0,100% 0,74% 38%,96% 38%,30% 100%,48% 52%,22% 52%)}
.food{position:absolute;right:20px;top:150px;width:640px;filter:drop-shadow(0 30px 40px rgba(0,0,0,.55))}
.c{position:absolute;left:70px;top:60px;width:560px}
.lg{display:flex;align-items:center;gap:20px}.lg img:first-child{width:190px}.lg img:last-child{width:300px}
h2{margin:26px 0 0;font-family:Baloo;font-weight:800;font-size:60px;line-height:1.15;direction:rtl;text-align:left;color:#ffb81c}
p{margin:14px 0 0;font:700 25px Cairo,sans-serif;color:#e6dbc6}
.b{display:inline-flex;gap:10px;align-items:center;margin-top:26px;padding:10px 20px;border-radius:14px;background:#211c16;font:800 26px Cairo,sans-serif}
.b em{font-style:normal;color:#ffb81c}
</style></head><body><div class="bolt"></div><img class="food" src="${B}/img/story/tenders-1000.webp"><div class="c"><div class="lg"><img src="${B}/img/logo.svg"><img src="${B}/img/tagline.svg"></div><h2>تندرز حار أو عادي بعمّان</h2><p>Chicken tenders, wings &amp; sandwiches · 4 branches in Amman</p><div class="b"><em>★ 4.9</em> Google · 13,000+ reviews</div></div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shot = async (html, w, h, path, type = 'png') => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path, type, ...(type === 'jpeg' ? { quality: 84 } : {}) });
  };
  for (const s of [192, 512]) await shot(icon(s, 4), s, s, `${OUT}/icons/icon-${s}.png`);
  await shot(icon(512, 16), 512, 512, `${OUT}/icons/icon-maskable-512.png`);
  await shot(icon(180, 6), 180, 180, `${OUT}/icons/apple-touch-icon.png`);
  await shot(og, 1200, 630, `${OUT}/img/og.jpg`, 'jpeg');
  await browser.close();
  console.log('done');
})();
