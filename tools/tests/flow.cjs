const { chromium } = require('playwright');
const OUT = process.argv[2] || 'tools/out';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'ar-JO' });
  await ctx.route(/wa\.me/, (r) => r.fulfill({ status: 200, body: 'wa stub' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(BASE + '/#menu', { waitUntil: 'networkidle' });
  await page.waitForSelector('.card[data-id="tenders-meal"]');
  await page.locator('.card[data-id="tenders-meal"] .card__add').scrollIntoViewIfNeeded();
  await page.locator('.card[data-id="tenders-meal"] .card__add').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/f-01-sheet.png` });
  await page.locator('#sheetBody label:has(input[name="size"][value="5pc"])').click();
  await page.locator('#sheetBody label:has(input[name="heat"][value="mild"])').click();
  await page.locator('#sheetBody label:has(input[name="dip"][value="dip-ranch"])').click();
  await page.locator('#sheetBody label:has(input[name="upsize"])').click();
  log('checked:', await page.$$eval('#sheetBody input:checked', (e) => e.map((x) => x.value).join(',')));
  await page.fill('#sheetBody textarea[name="note"]', 'بدون كولسلو');
  await page.waitForTimeout(900);
  log('sheet total (1x):', await page.getAttribute('#sheetTotal', 'aria-label'));
  await page.locator('#sheetBody').evaluate((el) => el.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/f-02-sheet-config.png` });
  await page.click('#sheetQty [data-q="1"]');
  await page.waitForTimeout(300);
  log('sheet total (2x):', await page.getAttribute('#sheetTotal', 'aria-label'));
  await page.click('#sheetAdd');
  await page.waitForTimeout(1300);
  log('cart count after tenders:', await page.textContent('#cartCount'));
  // quick add fries (single size, no options)
  // wings: flavour choice
  await page.locator('.card[data-id="wings-solo"] .card__add').scrollIntoViewIfNeeded();
  await page.locator('.card[data-id="wings-solo"] .card__add').click();
  await page.waitForTimeout(700);
  await page.locator('#sheetBody label:has(input[name="flavour"][value="dynamite"])').click();
  await page.click('#sheetAdd');
  await page.waitForTimeout(1300);
  // fries (sheet: two sizes)
  await page.locator('.mini[data-id="water"] [data-add]').scrollIntoViewIfNeeded();
  await page.locator('.mini[data-id="water"] [data-add]').click();
  await page.waitForTimeout(1000);
  // sauce large
  await page.locator('.mini[data-id="dip-bbq"] [data-size="3pc"]').scrollIntoViewIfNeeded();
  await page.locator('.mini[data-id="dip-bbq"] [data-size="3pc"]').click();
  await page.waitForTimeout(1000);
  log('cart count:', await page.textContent('#cartCount'), 'dock total:', await page.textContent('#dockTotal'));
  await page.click('#dockCart');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/f-03-cart.png` });
  log('cart total:', await page.getAttribute('#cartTotal', 'aria-label'));
  await page.click('#cartNext');
  await page.waitForTimeout(700);
  await page.click('#cartNext'); // try without details
  await page.waitForTimeout(500);
  log('invalid fields:', await page.$$eval('#checkoutForm .is-bad', (els) => els.length));
  await page.screenshot({ path: `${OUT}/f-04-form-errors.png` });
  await page.locator('#formBranches label:has(input[value="khalda"])').click();
  await page.fill('#fName', 'محمد');
  await page.fill('#fPhone', '٠٧٩١٢٣٤٥٦٧');
  // delivery → this branch only does pickup, so Talabat is offered and checkout is blocked
  await page.locator('#modeSeg label:has(input[value="delivery"])').click();
  await page.waitForTimeout(300);
  log('delivery: talabat card shown:', await page.isVisible('#talabatCard'), '| next disabled:', await page.isDisabled('#cartNext'), '| talabat href:', await page.getAttribute('#talabatBtn', 'href'));
  await page.screenshot({ path: `${OUT}/f-05a-talabat.png` });
  await page.locator('#modeSeg label:has(input[value="pickup"])').click();
  await page.waitForTimeout(300);
  await page.locator('#timeChips label:has(input[value="later"])').click();
  await page.waitForTimeout(200);
  const opts = await page.$$eval('#fTime option', (o) => o.map((x) => x.textContent));
  log('time slots:', opts.slice(0, 4).join(' | '), `(${opts.length})`);
  await page.fill('#fNotes', 'رنّوا الجرس مرتين');
  await page.screenshot({ path: `${OUT}/f-05-form.png` });
  await page.click('#cartNext');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/f-06-review.png` });
  const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('#cartNext')]);
  const url = popup.url();
  log('wa url prefix:', url.slice(0, 40));
  log('---- message ----\n' + decodeURIComponent(url.split('text=')[1]) + '\n-----------------');
  await popup.close();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/f-07-done.png` });
  // close drawer -> cart cleared
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  log('cart count after send+close:', await page.$eval('#cartCount', (e) => e.hidden ? 'hidden' : e.textContent));
  // reorder
  await page.click('#dockCart');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/f-08-empty.png` });
  await page.click('[data-reorder]');
  await page.waitForTimeout(500);
  log('after reorder count:', await page.textContent('#cartCount'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  // English
  await page.evaluate(() => scrollTo(0, 0));
  await page.click('#langBtn');
  await page.waitForTimeout(1200);
  log('lang:', await page.evaluate(() => document.documentElement.lang + ' ' + document.documentElement.dir));
  await page.screenshot({ path: `${OUT}/f-09-en-hero.png` });
  await page.click('#dockCart').catch(() => page.click('#cartBtn'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/f-10-en-cart.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  // map
  await page.evaluate(() => document.querySelector('#branches').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(900);
  log('map src 1:', (await page.getAttribute('#branchMap', 'src') || '').slice(0, 140));
  await page.locator('.bcard[data-map="mecca-mall"]').click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(500);
  log('map src 2:', (await page.getAttribute('#branchMap', 'src') || '').slice(0, 140));
  log('map open:', await page.getAttribute('#mapOpen', 'href'));
  await page.screenshot({ path: `${OUT}/f-11-map.png` });
  // branch picker
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.click('#branchChip');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/f-12-branch.png` });
  await page.click('#bmList [data-pick="mecca-mall"]');
  await page.waitForTimeout(700);
  log('branch chip:', await page.textContent('#branchChipText'));
  // search
  await page.evaluate(() => document.querySelector('#menu').scrollIntoView({ behavior: 'instant' }));
  await page.click('#searchToggle');
  await page.fill('#search', 'جبنة');
  await page.waitForTimeout(500);
  log('search visible items:', await page.$$eval('[data-search]:not([hidden])', (e) => e.map((x) => x.dataset.id).join(',')));
  await page.screenshot({ path: `${OUT}/f-13-search.png` });
  log(errors.join('\n') || 'no errors');
  await browser.close();
})();
