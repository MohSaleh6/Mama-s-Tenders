const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = require('path').resolve(__dirname, '../../public');
const fonts = `@font-face{font-family:Anton;src:url(${B}/fonts/anton-latin.woff2)}@font-face{font-family:Lalezar;src:url(${B}/fonts/lalezar-arabic.woff2)}@font-face{font-family:Cairo;src:url(${B}/fonts/cairo-arabic.woff2);font-weight:400 800}@font-face{font-family:CairoL;src:url(${B}/fonts/cairo-latin.woff2);font-weight:400 800}`;
const L = process.argv[2] || 'tools/out/logo'; // folder written by logo.py
const fs = require('fs');
const icon = (size, file = 'badge.svg') => `<!doctype html><html><head><style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}svg{display:block;width:100%;height:100%}</style></head><body>${fs.readFileSync(`${L}/${file}`, 'utf8')}</body></html>`;
const og = `<!doctype html><html><head><style>${fonts}html,body{margin:0;width:1200px;height:630px;background:#0b0b0c;overflow:hidden;color:#f6f3ea}
.slab{position:absolute;top:-10%;bottom:-10%;right:-8%;width:54%;background:#ffd400;transform:skewX(-14deg)}
img{position:absolute;right:28px;top:110px;width:580px;filter:drop-shadow(0 30px 40px rgba(0,0,0,.55))}
.c{position:absolute;left:70px;top:70px}.lg{position:static;display:block;width:300px;filter:none;margin-bottom:6px}
h1{margin:0;font-family:Anton;font-weight:400;font-size:120px;line-height:.9}h1 span{color:#ffd400}h1 small{font-size:.42em;letter-spacing:.12em;color:#a9a59a;vertical-align:middle}
h2{margin:18px 0 0;font-family:Lalezar;font-weight:400;font-size:58px;line-height:1.1;direction:rtl;text-align:left;color:#ffd400}
p{margin:22px 0 0;max-width:600px;white-space:nowrap;font:700 23px CairoL, Cairo, sans-serif;color:#d9d5c9}
.b{display:inline-flex;gap:10px;align-items:center;margin-top:26px;padding:10px 20px;border-radius:99px;background:#1c1c1f;font:800 26px CairoL, sans-serif}
.b em{font-style:normal;color:#ffd400}
</style></head><body><div class="slab"></div><img src="${B}/img/story/smash-1000.webp"><div class="c"><img class="lg" src="${B}/img/logo.svg"><h2>برغر أنجوس بعمّان</h2><p>Angus burgers in Amman · Abdoun &amp; Mecca St.</p><div class="b"><em>★ 4.9</em> Google · 7,400+ reviews</div></div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(B + '/robots.txt');
  for (const s of [192, 512]) {
    await page.setViewportSize({ width: s, height: s });
    await page.setContent(icon(s));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${OUT}/icons/icon-${s}.png` });
  }
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(icon(512, 'maskable.svg'));
  await page.screenshot({ path: `${OUT}/icons/icon-maskable-512.png` });
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(icon(180));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/icons/apple-touch-icon.png` });
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(og, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/img/og.jpg`, type: 'jpeg', quality: 84 });
  await browser.close();
  console.log('done');
})();
