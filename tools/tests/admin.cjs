const { chromium } = require('playwright');
const OUT = process.argv[2] || 'tools/out';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const menu = async () => (await (await ctx.request.get(BASE + '/api/menu')).json());
  await page.goto(BASE + '/admin/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/a-01-login.png` });
  await page.fill('#pw', 'wrong');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForTimeout(500);
  log('wrong pw error:', await page.textContent('#loginErr'));
  await page.fill('#pw', 'change-me');
  await page.click('#loginForm button[type="submit"]');
  await page.waitForSelector('#view-overview .kpis', { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/a-02-overview.png`, fullPage: true });
  log('kpis:', await page.$$eval('.kpi b', (e) => e.map((x) => x.textContent).join(' | ')));
  // menu
  await page.click('[data-view="menu"]');
  await page.waitForSelector('.row[data-id="smash"]');
  await page.screenshot({ path: `${OUT}/a-03-menu.png` });
  // featured toggle on eminem
  await page.click('.row[data-id="eminem"] .star');
  await page.waitForTimeout(400);
  // sold out at mecca for madonna
  await page.locator('.row[data-id="madonna"] label:has(input[data-branch="mecca"])').click();
  await page.waitForTimeout(400);
  // global sold out for sia
  await page.locator('.row[data-id="sia"] label:has(input[data-act="available"])').click();
  await page.waitForTimeout(500);
  let m = await menu();
  const it = (id) => m.items.find((i) => i.id === id);
  log('eminem featured:', it('eminem').featured, '| madonna unavailable:', JSON.stringify(it('madonna').unavailable), '| sia sold_out:', it('sia').sold_out);
  // edit smash price
  await page.click('.row[data-id="smash"] [data-act="edit"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/a-04-editor.png` });
  await page.fill('#edSizes .size[data-i="0"] [data-k="price"]', '4.25');
  await page.fill('#edForm [name="desc_en"]', 'Smashed Angus beef, beef bacon, caramelized onions, cheddar, secret sauce');
  // upload a photo
  await page.setInputFiles('#edFile', require('path').resolve(__dirname, '../../public/img/menu/smash.webp'));
  await page.waitForFunction(() => document.querySelector('#edPrev img')?.src.includes('/img/u/'), null, { timeout: 8000 });
  const up = await page.getAttribute('#edPrev img', 'src');
  log('uploaded image:', up);
  await page.click('#edSave');
  await page.waitForTimeout(700);
  m = await menu();
  log('smash 100g price:', it('smash').sizes[0].price, '| image:', it('smash').image);
  const img = await ctx.request.get(BASE + it('smash').image);
  log('uploaded img served:', img.status(), img.headers()['content-type'], img.headers()['cache-control']);
  // create item
  await page.click('#newItem');
  await page.waitForTimeout(400);
  await page.fill('#edForm [name="name_ar"]', 'برغر تجربة');
  await page.fill('#edForm [name="name_en"]', 'Test Burger');
  await page.locator('#edForm [data-preset="beef"]').click();
  await page.click('#edSave');
  await page.waitForTimeout(700);
  m = await menu();
  log('new item created:', Boolean(it('test-burger')), it('test-burger')?.sizes.length, 'sizes');
  // delete it
  await page.click('.row[data-id="test-burger"] [data-act="edit"]');
  await page.waitForTimeout(300);
  page.once('dialog', (d) => d.accept());
  await page.click('#edDelete');
  await page.waitForTimeout(600);
  m = await menu();
  log('new item deleted:', !it('test-burger'));
  // branches
  await page.click('[data-view="branches"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/a-05-branches.png`, fullPage: true });
  await page.fill('form[data-id="mecca"] [name="whatsapp"]', '962777000111');
  await page.click('form[data-id="mecca"] button[type="submit"]');
  await page.waitForTimeout(500);
  m = await menu();
  log('mecca whatsapp:', m.branches.find((b) => b.id === 'mecca').whatsapp);
  // settings
  await page.click('[data-view="settings"]');
  await page.waitForTimeout(300);
  await page.fill('#setForm [name="announcement_ar"]', 'عرض الويكند: الكومبو بـ ١ دينار بس!');
  await page.fill('#setForm [name="announcement_en"]', 'Weekend deal: combo for just 1 JD!');
  await page.fill('#setForm [name="combo_price"]', '1.00');
  await page.fill('#setForm [name="instagram"]', 'https://instagram.com/meatandcheezz');
  await page.click('#setForm button[type="submit"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/a-06-settings.png`, fullPage: true });
  m = await menu();
  log('settings:', m.settings.combo_price, m.settings.announcement_en, m.settings.instagram);
  // bad input validation
  await page.fill('#setForm [name="instagram"]', 'http://insecure');
  await page.click('#setForm button[type="submit"]');
  await page.waitForTimeout(400);
  log('validation toast:', await page.textContent('.toast--err').catch(() => 'none'));
  // english admin + mobile screenshot
  await page.click('.top [data-lang]');
  await page.click('[data-view="menu"]');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/a-07-menu-mobile-en.png` });
  // unauthenticated API access is refused
  const anon = await chromium.launch().then((b) => b.newContext()).then((c) => c.request.get(BASE + '/api/admin/menu'));
  log('anon admin api status:', anon.status());
  const csrf = await ctx.request.patch(BASE + '/api/admin/items/smash', { data: { featured: 0 } });
  log('no-header write status:', csrf.status());
  log(errors.join('\n') || 'no errors');
  await browser.close();
  process.exit(0);
})();
