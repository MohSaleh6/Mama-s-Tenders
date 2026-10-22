// Mama's Tenders — customer site
// Vanilla JS, no dependencies. Arabic-first, RTL-aware.
import { DICT, QUOTES, FLAVOURS, DIP_COLORS } from './i18n.js?v=562dd9a3d1';

/* ════════════════════════ utilities ════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const raf2 = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
const idle = (fn, timeout = 700) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 60));
// Elements shown with showPopover() sit above open <dialog>s (top layer).
function topLayer(el, parent = document.body) {
  parent.append(el);
  if (el.showPopover) { el.setAttribute('popover', 'manual'); try { el.showPopover(); } catch { /* ignore */ } }
  return el;
}
const vibrate = (ms = 12) => { try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(ms); } catch { /* ignore */ } };

/* ════════════════════════ state ════════════════════════ */
const S = {
  lang: html.lang === 'en' ? 'en' : 'ar',
  menu: null,
  items: {},
  cats: {},
  branches: {},
  branchId: store.get('mt_branch', null),
  cart: store.get('mt_cart', []),
  step: 0,
  sent: null,
  geo: null,
};

const t = (key, vars) => {
  let s = DICT[S.lang][key] ?? DICT.ar[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
};
const L = (obj, field) => (obj ? obj[`${field}_${S.lang}`] || obj[`${field}_ar`] || obj[`${field}_en`] || '' : '');
const other = (obj, field) => (obj ? obj[`${field}_${S.lang === 'ar' ? 'en' : 'ar'}`] || '' : '');
const money = (fils) => (Math.round(fils) / 1000).toFixed(2);
const priceText = (fils) => `${money(fils)} ${t('cur')}`;
const smImg = (src) => (src && src.startsWith('/img/menu/') ? src.replace(/\.webp$/, '-sm.webp') : src);

/* ════════════════════════ time & branches ════════════════════════ */
function ammanNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
}
const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h % 24) * 60 + (m || 0); };
function fmtClock(min) {
  const d = new Date(Date.UTC(2020, 0, 1, Math.floor(min / 60) % 24, min % 60));
  return new Intl.DateTimeFormat(S.lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(d);
}
function isOpenAt(b, m) {
  const o = toMin(b.open_time), c = toMin(b.close_time);
  if (o === c) return true;
  return o < c ? m >= o && m < c : m >= o || m < c;
}
function branchStatus(b) {
  const open = isOpenAt(b, ammanNow());
  return { open, label: open ? t('openUntil', { t: fmtClock(toMin(b.close_time)) }) : t('opensAt', { t: fmtClock(toMin(b.open_time)) }) };
}
const branch = () => (S.branchId && S.branches[S.branchId]) || null;

/* ════════════════════════ i18n ════════════════════════ */
function applyStatic() {
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  });
  document.title = t('title');
  const lb = $('#langBtn');
  lb.textContent = t('langBtn');
  lb.setAttribute('aria-label', t('langLabel'));
  lb.lang = S.lang === 'ar' ? 'en' : 'ar';
}

function setLang(lang) {
  if (lang === S.lang) return;
  const run = () => {
    S.lang = lang;
    store.set('mt_lang', lang);
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    applyStatic();
    renderAll();
    story.remeasure?.();
    renderCart();
    if (S.step === 1) renderForm();
    if (S.step === 2 && !S.sent) renderReceipt(false);
  };
  if (document.startViewTransition && !reduced) document.startViewTransition(run);
  else run();
}

/* ════════════════════════ menu data ════════════════════════ */
async function fetchJSON(url, ms = 6000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function ingest(menu) {
  S.menu = menu;
  S.items = Object.fromEntries(menu.items.map((i) => [i.id, i]));
  S.cats = Object.fromEntries(menu.categories.map((c) => [c.id, c]));
  S.branches = Object.fromEntries(menu.branches.map((b) => [b.id, b]));
  if (S.branchId && !S.branches[S.branchId]) S.branchId = null;
  // Drop cart lines that no longer exist
  const before = S.cart.length;
  S.cart = S.cart.filter((l) => S.items[l.id] && S.items[l.id].sizes.some((s) => s.id === l.size));
  if (S.cart.length !== before) { saveCart(); toast(t('unavailableDropped'), 'close'); }
}

async function loadMenu() {
  const cached = store.get('mt_menu_cache', null);
  if (cached?.items) {
    ingest(cached);
    renderAll();
  }
  let fresh = null;
  try {
    fresh = await fetchJSON('/api/menu');
  } catch {
    try { fresh = await fetchJSON('/data/menu.json'); } catch { /* offline */ }
  }
  if (!fresh) return;
  const sig = (m) => JSON.stringify({ ...m, version: 0 });
  if (!cached || sig(cached) !== sig(fresh)) {
    store.set('mt_menu_cache', fresh);
    ingest(fresh);
    renderAll();
  }
}

const isOut = (item, bid = S.branchId) => Boolean(item.sold_out) || Boolean(bid && item.unavailable?.includes(bid));
const minPrice = (item) => Math.min(...item.sizes.map((s) => s.price));
const optsOf = (item) => item?.options || [];
const has = (item, opt) => optsOf(item).includes(opt);
const dipsList = () => S.menu.items.filter((i) => i.is_dip && !isOut(i));
const piecesOf = (size) => { const m = /^(\d+)pc$/.exec(size.id); return m ? Number(m[1]) : null; };
const upsizePrice = () => Number(S.menu?.settings?.combo_price || 0);
const talabatUrl = () => S.menu?.settings?.talabat || '';

/* ════════════════════════ rendering ════════════════════════ */
let firstRender = true;
function renderAll() {
  if (!S.menu) return;
  renderHeroMeta();
  renderBranchChip();
  updateCartBadges(false);
  const rest = [renderMenu, renderBranches, renderQuotes, renderFooter];
  if (firstRender) {
    firstRender = false;
    const target = location.hash.length > 1 && location.hash !== '#top' ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) {
      // deep link (e.g. /#branches): render everything now, then land on the section once the layout is final
      rest.forEach((fn) => fn());
      requestAnimationFrame(() => { if (!userMoved) target.scrollIntoView({ behavior: 'instant', block: 'start' }); });
      return;
    }
    // spread the first render over idle periods so the hero paints and settles first
    const next = () => { const fn = rest.shift(); if (fn) { fn(); idle(next, 400); } };
    idle(next, 300);
  } else rest.forEach((fn) => fn());
}
let userMoved = false;
['wheel', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, () => { userMoved = true; }, { once: true, passive: true }));

function renderHeroMeta() {
  const st = S.menu.settings || {};
  const rating = st.google_rating || '4.9';
  const reviews = Number(st.google_reviews || 13000);
  $('#gScore').textContent = rating;
  $('#rvScore').textContent = rating;
  $('#gCount').textContent = `+${reviews.toLocaleString('en-US')}`;

  // Live open/closed for the hero: open if any branch is open, "till" the latest closing among the open ones
  const bs = Object.values(S.branches);
  const now = ammanNow();
  const open = bs.filter((b) => isOpenAt(b, now));
  const left = (b) => (toMin(b.close_time) - now + 1440) % 1440 || 1440;
  $('#heroDot').classList.toggle('is-closed', !open.length);
  if (open.length) {
    const last = open.reduce((a, b) => (left(b) > left(a) ? b : a));
    $('#heroOpen').textContent = t('heroOpen', { t: fmtClock(toMin(last.close_time)) });
  } else if (bs.length) {
    const soon = bs.reduce((a, b) => (((toMin(b.open_time) - now + 1440) % 1440) < ((toMin(a.open_time) - now + 1440) % 1440) ? b : a));
    $('#heroOpen').textContent = t('heroClosed', { t: fmtClock(toMin(soon.open_time)) });
  }

  // Talabat links
  const tal = talabatUrl();
  $$('#heroTalabat, #footTalabat, #talabatBtn').forEach((a) => { a.hidden = !tal; if (tal) a.href = tal; });

  // The full-meal scene sells the 5-piece tenders meal
  const meal = S.items['tenders-meal'];
  const size = meal && (meal.sizes.find((s) => s.id === $('[data-open-meal]').dataset.size) || meal.sizes[meal.sizes.length - 1]);
  $('#mealPrice').textContent = size ? money(size.price) : '';
  $('#mealCtaPcs').textContent = size ? `${size[S.lang]} · ${money(size.price)}` : '';

  // Announcement
  const ann = L(st, 'announcement');
  const bar = $('#announce');
  bar.hidden = !ann;
  if (ann) $('#announceText').textContent = ann;
}

function tagChips(item, withNote = false) {
  const map = { spicy: 'chili', grilled: 'grill', signature: 'star', new: 'bolt' };
  let out = (item.tags || []).filter((x) => map[x]).map((x) => `<span class="tag tag--${x}">${icon(map[x])}${esc(t(`tag_${x}`))}</span>`).join('');
  if (withNote && L(item, 'note')) out += `<span class="tag tag--note">${esc(L(item, 'note'))}</span>`;
  return out;
}

// Price "ticket" like the in-store menu boards: [ 3 pcs | 4.50 ]
function ticket(item) {
  const s = item.sizes;
  const lo = s.reduce((a, b) => (b.price < a.price ? b : a));
  const label = s.length > 1 ? t('from') : (s[0].id === 'one' ? '' : s[0][S.lang]);
  return `<span class="ticket">${label ? `<i>${esc(label)}</i>` : ''}<b>${money(lo.price)}</b></span>`;
}

function cardHTML(item, idx) {
  const out = isOut(item);
  const name = L(item, 'name');
  const search = `${item.name_ar} ${item.name_en} ${item.desc_ar} ${item.desc_en}`;
  return `<article class="card reveal${out ? ' is-out' : ''}" data-id="${esc(item.id)}" data-search="${esc(norm(search))}" style="--rd:${(idx % 3) * 70}ms">
    ${out ? `<span class="stamp">${esc(t('soldOut'))}</span>` : ''}
    <button class="card__hit" type="button" data-open="${esc(item.id)}" aria-label="${esc(name)}"></button>
    <div class="card__media"><img src="${esc(item.image)}" alt="" loading="lazy" decoding="async" width="560" height="420"></div>
    <div class="card__body">
      <h4 class="card__title">${esc(name)}<span class="card__alt">${esc(other(item, 'name'))}</span></h4>
      <p class="card__desc">${esc(L(item, 'desc'))}</p>
      <div class="card__tags">${tagChips(item, true)}</div>
      <div class="card__foot">
        ${ticket(item)}
        <button class="card__add" type="button" data-quick="${esc(item.id)}" aria-label="${esc(`${t('addToOrder')}: ${name}`)}" ${out ? 'disabled' : ''}>${icon('plus')}<span>${esc(t('add'))}</span></button>
      </div>
    </div>
  </article>`;
}

function swatch(item, tag = 'span') {
  const c = DIP_COLORS[item.id];
  return c ? `<${tag} class="swatch" style="--c:${c}"></${tag}>` : '';
}
function miniIcon(item) {
  if (item.category_id === 'drinks') return 'can';
  if (item.category_id === 'sweets') return 'cookie';
  if (item.category_id === 'dips') return 'drop';
  return 'tender';
}

function miniHTML(item) {
  const out = isOut(item);
  const search = `${item.name_ar} ${item.name_en} ${item.desc_ar} ${item.desc_en}`;
  const sub = [L(item, 'desc'), L(item, 'note')].filter(Boolean).join(' · ') || (out ? t('soldOut') : other(item, 'name'));
  const multi = item.sizes.length > 1;
  const dot = swatch(item);
  return `<div class="mini reveal${out ? ' is-out' : ''}" data-id="${esc(item.id)}" data-search="${esc(norm(search))}">
    <span class="mini__ic">${dot || icon(miniIcon(item))}</span>
    <div class="mini__body"><h4>${esc(L(item, 'name'))}${(item.tags || []).includes('spicy') ? icon('chili', 'mini__hot') : ''}</h4><small>${esc(out ? t('soldOut') : sub)}</small></div>
    <div class="mini__sizes">${item.sizes.map((s) => `<button class="mini__btn" type="button" data-add="${esc(item.id)}" data-size="${esc(s.id)}" aria-label="${esc(`${t('addToOrder')}: ${L(item, 'name')} ${multi ? s[S.lang] : ''}`)}" ${out ? 'disabled' : ''}>${icon('plus')}${multi ? `<small>${esc(s[S.lang])}</small> ` : ''}${money(s.price)}</button>`).join('')}</div>
  </div>`;
}

function renderPicks() {
  const picks = S.menu.items.filter((i) => i.featured && i.image && !isOut(i));
  $('#picksWrap').hidden = !picks.length;
  $('#picks').innerHTML = picks.map((i) => `<button class="pick" type="button" data-open="${esc(i.id)}">
    <span class="pick__img"><img src="${esc(smImg(i.image))}" alt="" loading="lazy" decoding="async" width="220" height="165"></span>
    <b>${esc(L(i, 'name'))}</b><span class="pick__price">${money(minPrice(i))} <small>${esc(t('cur'))}</small></span></button>`).join('');
}

function renderMenu() {
  const body = $('#menuBody');
  const cats = S.menu.categories;
  const byCat = {};
  for (const it of S.menu.items) (byCat[it.category_id] ||= []).push(it);

  body.innerHTML = cats.filter((c) => byCat[c.id]?.length).map((c) => {
    const items = byCat[c.id];
    const withImg = items.filter((i) => i.image);
    const noImg = items.filter((i) => !i.image);
    return `<section class="cat" id="cat-${esc(c.id)}" data-cat="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
      <div class="cat__head"><h3 id="h-${esc(c.id)}">${esc(L(c, 'name'))}</h3><p>${esc(L(c, 'tagline'))}</p></div>
      ${withImg.length ? `<div class="grid">${withImg.map(cardHTML).join('')}</div>` : ''}
      ${noImg.length ? `<div class="minis"${withImg.length ? ' style="margin-top:18px"' : ''}>${noImg.map(miniHTML).join('')}</div>` : ''}
    </section>`;
  }).join('');

  const tabs = $('#tabs');
  tabs.querySelectorAll('button').forEach((b) => b.remove());
  tabs.insertAdjacentHTML('beforeend', cats.filter((c) => byCat[c.id]?.length).map((c, i) =>
    `<button type="button" role="tab" aria-selected="${i === 0}" data-tab="${esc(c.id)}" aria-controls="cat-${esc(c.id)}">${esc(L(c, 'name'))}</button>`).join(''));

  const b = branch();
  $('#menuBranchNote').textContent = b ? t('menuSubBranch', { b: L(b, 'name') }) : t('menuSub');

  renderPicks();
  observeReveals();
  setupScrollSpy();
  const activeTab = $('#tabs button[aria-selected="true"]');
  if (activeTab) requestAnimationFrame(() => moveInk(activeTab, false));
  if ($('#search').value) runSearch();
}

const BRANCH_PHOTOS = {
  'marj-al-hamam': '/img/branches/marj-al-hamam',
  'seventh-circle': '/img/branches/seventh-circle',
  'mecca-mall': '/img/branches/mecca-mall',
  khalda: '/img/branches/khalda',
};
const branchPhoto = (b) => {
  const base = BRANCH_PHOTOS[b.id];
  if (!base) return '';
  return `<figure class="bcard__photo"><img src="${base}-800.webp" srcset="${base}-480.webp 480w, ${base}-800.webp 800w" sizes="(min-width: 900px) 520px, 92vw" alt="${esc(t('branchPhoto', { b: L(b, 'name') }))}" width="800" height="500" loading="lazy" decoding="async"></figure>`;
};
function renderBranches() {
  const wrap = $('#branchCards');
  wrap.innerHTML = Object.values(S.branches).map((b) => {
    const st = branchStatus(b);
    const waText = encodeURIComponent(t('waHi'));
    return `<article class="bcard reveal${S.branchId === b.id ? ' is-selected' : ''}${mapBranch === b.id ? ' is-mapped' : ''}" data-map="${esc(b.id)}">
      ${branchPhoto(b)}
      <div class="bcard__top">
        <div><h3>${esc(L(b, 'name'))}</h3><p class="bcard__addr">${esc(L(b, 'address'))}</p></div>
        <span class="status${st.open ? '' : ' is-closed'}"><i class="dot${st.open ? '' : ' is-closed'}"></i>${esc(st.label)}</span>
      </div>
      <div class="bcard__meta">
        <span>${icon('star')}<b>${esc(Number(b.rating).toFixed(1))}</b>&nbsp;${esc(t('reviewsN', { n: Number(b.reviews).toLocaleString('en-US') }))}</span>
        <span>${icon('clock')}<span dir="auto">${esc(t('hours', { o: fmtClock(toMin(b.open_time)), c: fmtClock(toMin(b.close_time)) }))}</span></span>
        <span>${icon(b.delivery ? 'scooter' : 'store')}${esc(b.delivery ? t('deliveryOn') : t('pickupOnly'))}</span>
      </div>
      <div class="bcard__actions">
        <button class="btn btn--gold" type="button" data-order-branch="${esc(b.id)}">${icon('bag')}${esc(t('orderHere'))}</button>
        ${b.maps_url ? `<a class="btn btn--ghost" href="${esc(b.maps_url)}" target="_blank" rel="noopener">${icon('pin')}${esc(t('directions'))}</a>` : ''}
        ${b.whatsapp ? `<a class="btn btn--wa" href="https://wa.me/${esc(b.whatsapp)}?text=${waText}" target="_blank" rel="noopener">${icon('wa')}${esc(t('whatsapp'))}</a>` : ''}
        ${b.phone ? `<a class="btn btn--ghost" href="tel:${esc(b.phone)}" aria-label="${esc(`${t('call')} ${L(b, 'name')}`)}">${icon('phone')}${esc(t('call'))}</a>` : ''}
      </div>
    </article>`;
  }).join('');
  observeReveals();
  setMap(S.branches[mapBranch] ? mapBranch : S.branches[S.branchId] ? S.branchId : Object.keys(S.branches)[0]);
}

// Real Google map of the selected branch (lazy: only loads near the section)
let mapBranch = null, mapReady = false;
function mapQuery(b) {
  try {
    const q = new URL(b.maps_url).searchParams.get('query') || new URL(b.maps_url).searchParams.get('q');
    if (q) return q;
  } catch { /* not a URL */ }
  return `Mama's Tenders ${b.name_en} Amman`;
}
function setMap(id) {
  const b = S.branches[id];
  if (!b) return;
  mapBranch = id;
  $$('.bcard').forEach((c) => c.classList.toggle('is-mapped', c.dataset.map === id));
  const open = $('#mapOpen');
  open.href = b.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(b))}`;
  if (!mapReady) return;
  const q = encodeURIComponent(mapQuery(b).replace(/!/g, '')).replace(/%20/g, '+');
  const src = `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${q}!6i16`;
  const frame = $('#branchMap');
  if (frame.src !== src) frame.src = src;
}
function setupMap() {
  const frame = $('#branchMap');
  frame.addEventListener('load', () => { if (frame.src) frame.classList.add('is-loaded'); });
  const start = () => { mapReady = true; if (mapBranch) setMap(mapBranch); };
  if (!('IntersectionObserver' in window)) { start(); return; }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' });
  io.observe($('#branches'));
}

function renderQuotes() {
  $('#quotes').innerHTML = QUOTES.map((q) => `<figure class="quote reveal">
    <div class="quote__stars">${icon('star').repeat(5)}</div>
    <p lang="en" dir="ltr">“${esc(q.t)}”</p>
    <small>${icon('google')}${esc(t('gReview'))}${S.branches[q.b] ? ` · ${esc(L(S.branches[q.b], 'name'))}` : ''}</small>
  </figure>`).join('');
  observeReveals();
}

function renderFooter() {
  const st = S.menu.settings || {};
  const socials = [['instagram', 'insta'], ['tiktok', 'tiktok'], ['facebook', 'fb']]
    .filter(([k]) => st[k]).map(([k, ic]) => `<a href="${esc(st[k])}" target="_blank" rel="noopener" aria-label="${k}">${icon(ic)}</a>`).join('');
  $('#socials').innerHTML = socials;
  $('#footBranches').innerHTML = `<h3>${esc(t('navBranches'))}</h3>` + Object.values(S.branches).map((b) =>
    `<a href="${esc(b.maps_url || '#branches')}" target="_blank" rel="noopener">${esc(L(b, 'name'))} — ${esc(L(b, 'address'))}</a>`).join('');
  const first = Object.values(S.branches)[0];
  if (first?.phone) { const fp = $('#footPhone'); fp.href = `tel:${first.phone}`; fp.textContent = prettyPhone(first.phone); }
  if (first?.whatsapp) { const fw = $('#footWa'); fw.href = `https://wa.me/${first.whatsapp}`; fw.textContent = `WhatsApp ${prettyPhone(first.whatsapp)}`; }
  $('#year').textContent = String(new Date().getFullYear());
}

function prettyPhone(p) {
  const d = String(p).replace(/\D/g, '');
  if (d.startsWith('9627') && d.length === 12) return `+962 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  if (d.startsWith('962') && d.length === 11) return `+962 ${d[3]} ${d.slice(4, 7)} ${d.slice(7)}`;
  return p;
}

function renderBranchChip() {
  const b = branch();
  const chip = $('#branchChip');
  chip.classList.toggle('is-set', Boolean(b));
  $('#branchChipText').textContent = b ? L(b, 'name') : t('pickBranch');
}

/* ════════════════════════ search ════════════════════════ */
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
}
let searchTimer;
function runSearch() {
  const q = norm($('#search').value).trim();
  const words = q.split(/\s+/).filter(Boolean);
  let any = false;
  $$('.cat').forEach((cat) => {
    let visible = 0;
    cat.querySelectorAll('[data-search]').forEach((el) => {
      const ok = !words.length || words.every((w) => el.dataset.search.includes(w));
      el.hidden = !ok;
      if (ok) { visible++; el.classList.add('in'); }
    });
    cat.hidden = visible === 0;
    if (visible) any = true;
  });
  $('#picksWrap').classList.toggle('is-searching', Boolean(words.length));
  $('#menuEmpty').hidden = any;
}

/* ════════════════════════ tabs & scroll-spy ════════════════════════ */
function moveInk(btn, smooth = true) {
  const ink = $('#tabsInk');
  if (!btn || !ink) return;
  if (!smooth) ink.style.transition = 'none';
  ink.style.width = `${btn.offsetWidth}px`;
  ink.style.transform = `translateX(${btn.offsetLeft}px)`;
  if (!smooth) requestAnimationFrame(() => { ink.style.transition = ''; });
}
function setActiveTab(id, scrollTabs = true) {
  const btn = $(`#tabs button[data-tab="${CSS.escape(id)}"]`);
  if (!btn || btn.getAttribute('aria-selected') === 'true') return;
  $$('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
  moveInk(btn);
  if (scrollTabs) {
    const tabs = $('#tabs');
    const tr = tabs.getBoundingClientRect(), br = btn.getBoundingClientRect();
    tabs.scrollBy({ left: br.left + br.width / 2 - (tr.left + tr.width / 2), behavior: reduced ? 'auto' : 'smooth' });
  }
}
let spy, spyLock = 0;
function setupScrollSpy() {
  spy?.disconnect();
  spy = new IntersectionObserver((entries) => {
    if (Date.now() < spyLock) return;
    for (const e of entries) if (e.isIntersecting) setActiveTab(e.target.dataset.cat);
  }, { rootMargin: '-38% 0px -55% 0px' });
  $$('.cat').forEach((c) => spy.observe(c));
}

/* ════════════════════════ reveal ════════════════════════ */
let revealer;
function observeReveals() {
  if (reduced || !('IntersectionObserver' in window)) { $$('.reveal').forEach((el) => el.classList.add('in')); return; }
  revealer ||= new IntersectionObserver((entries) => {
    // cards that appear together come in as a short wave
    let n = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.style.setProperty('--rd', `${Math.min(n++, 5) * 70}ms`);
      e.target.classList.add('in');
      revealer.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal:not(.in)').forEach((el) => revealer.observe(el));
}

/* ════════════════════════ odometer ════════════════════════ */
function odo(el, text) {
  if (!el) return;
  text = String(text);
  if (el.dataset.v === text) return;
  const prev = el.dataset.v;
  el.dataset.v = text;
  el.setAttribute('aria-label', text);
  if (reduced || !prev || prev.length !== text.length || !el.querySelector('.odo__d')) {
    el.innerHTML = [...text].map((ch) => /\d/.test(ch)
      ? `<span class="odo__d" aria-hidden="true"><span class="odo__col" style="transform:translateY(${prev ? 0 : -Number(ch) * 1.15}em)">${'0123456789'.split('').map((d) => `<span>${d}</span>`).join('')}</span></span>`
      : `<span class="odo__c" aria-hidden="true">${esc(ch)}</span>`).join('');
    if (!prev) return;
  }
  const cols = el.querySelectorAll('.odo__d .odo__col');
  let i = 0;
  raf2(() => {
    for (const ch of text) if (/\d/.test(ch)) cols[i++].style.transform = `translateY(${-Number(ch) * 1.15}em)`;
  });
}

/* ════════════════════════ toasts ════════════════════════ */
function toast(msg, ic = 'check', opts = {}) {
  const el = document.createElement('div');
  el.className = `toast${ic === 'check' ? '' : ' toast--info'}`;
  const lead = opts.img
    ? `<span class="toast__img"><img src="${esc(opts.img)}" alt="" width="44" height="36"></span>`
    : `<span class="toast__ic">${icon(ic)}</span>`;
  el.innerHTML = `${lead}<span class="toast__txt"><b>${esc(msg)}</b>${opts.sub ? `<small>${esc(opts.sub)}</small>` : ''}</span>${opts.img ? `<span class="toast__ok">${icon('check')}</span>` : ''}<i class="toast__bar"></i>`;
  const box = $('#toasts');
  box.append(el);
  if (box.showPopover) { try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch { /* ignore */ } }
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2400);
  while (box.children.length > 3) box.firstElementChild.remove();
}

/* ════════════════════════ dialogs ════════════════════════ */
function openDialog(dlg) {
  if (dlg.open) return;
  dlg.showModal();
  html.classList.add('lock');
  raf2(() => dlg.classList.add('is-in'));
}
function closeDialog(dlg) {
  if (!dlg.open) return Promise.resolve();
  return new Promise((resolve) => {
    dlg.classList.remove('is-in');
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      dlg.close();
      dlg.style.removeProperty('--drag');
      if (!$$('dialog[open]').length) html.classList.remove('lock');
      resolve();
    };
    const panel = dlg.firstElementChild;
    panel.addEventListener('transitionend', (e) => { if (e.target === panel) fin(); });
    setTimeout(fin, reduced ? 10 : 620);
  });
}
function wireDialog(dlg, onClose) {
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); onClose ? onClose() : closeDialog(dlg); });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) onClose ? onClose() : closeDialog(dlg);
  });
}

/* ════════════════════════ fly to cart ════════════════════════ */
function cartTarget() {
  const dock = $('#dock');
  const nav = $('#nav');
  const navVisible = !nav.classList.contains('is-hidden');
  if (dock.classList.contains('is-on') && (innerWidth < 900 || !navVisible)) return $('.dock__bag');
  return navVisible ? $('#cartBtn') : $('.dock__bag');
}
function fly(fromEl, src) {
  const target = cartTarget();
  const done = () => {
    target.classList.remove('gulp');
    void target.offsetWidth;
    target.classList.add('gulp');
    updateCartBadges(true);
  };
  if (!fromEl || reduced) { done(); return; }
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = clamp(Math.min(a.width, a.height || a.width), 44, 150);
  let el;
  if (src) { el = new Image(); el.src = src; el.alt = ''; }
  else { el = document.createElement('div'); el.style.cssText = 'border-radius:50%;background:var(--gold);box-shadow:0 0 0 6px rgba(255,184,28,.25)'; }
  el.className = 'flyer';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  topLayer(el);
  const sx = a.left + a.width / 2 - size / 2, sy = a.top + a.height / 2 - size / 2;
  const ex = b.left + b.width / 2 - size / 2, ey = b.top + b.height / 2 - size / 2;
  const cx = (sx + ex) / 2, cy = Math.min(sy, ey) - 140;
  const frames = [];
  for (let i = 0; i <= 18; i++) {
    const p = i / 18, q = 1 - p;
    const x = q * q * sx + 2 * q * p * cx + p * p * ex;
    const y = q * q * sy + 2 * q * p * cy + p * p * ey;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${1 - p * 0.82}) rotate(${p * -40}deg)`, opacity: p > 0.92 ? 0 : 1, offset: p });
  }
  const anim = el.animate(frames, { duration: 760, easing: 'cubic-bezier(.45,.05,.55,.95)' });
  anim.onfinish = () => { el.remove(); done(); };
  // +1 pop
  const plus = document.createElement('span');
  plus.className = 'plusone';
  plus.textContent = '+1';
  plus.style.left = `${a.left + a.width / 2}px`;
  plus.style.top = `${a.top}px`;
  topLayer(plus);
  plus.animate([{ transform: 'translate(-50%, 0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -30px) scale(1.2)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%, -60px) scale(1)', opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => plus.remove();
}

/* ════════════════════════ cart model ════════════════════════ */
// A line: { id, size, qty, upsize, heat, flavour, dip, note } — heat/flavour/dip only when the item offers them
const lineKey = (l) => [l.id, l.size, l.upsize ? 1 : 0, l.heat || '', l.flavour || '', l.dip || '', (l.note || '').trim()].join('|');
function saveCart() { store.set('mt_cart', S.cart); }
function linePrice(l) {
  const item = S.items[l.id];
  if (!item) return 0;
  const size = item.sizes.find((s) => s.id === l.size) || item.sizes[0];
  const up = l.upsize && has(item, 'upsize') ? upsizePrice() : 0;
  return (size.price + up) * l.qty;
}
const cartTotal = () => S.cart.reduce((s, l) => s + linePrice(l), 0);
const cartCount = () => S.cart.reduce((s, l) => s + l.qty, 0);

function addLine(line) {
  const k = lineKey(line);
  const existing = S.cart.find((l) => lineKey(l) === k);
  if (existing) existing.qty = clamp(existing.qty + line.qty, 1, 50);
  else S.cart.push({ ...line, k });
  S.sent = null;
  saveCart();
  renderCart();
  vibrate();
}

function updateCartBadges(bump) {
  const n = cartCount();
  const c = $('#cartCount');
  c.hidden = n === 0;
  c.textContent = String(n);
  $('#dockCount').textContent = String(n);
  $('#dockTotal').textContent = n ? priceText(cartTotal()) : '';
  $('#dock').classList.toggle('is-empty', n === 0);
  if (bump && n) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  updateDock();
}

// Labels for a line's choices, e.g. ["Spicy", "Flavour: BBQ", "Dip: Ranch", "Upsized"]
function choiceLabels(l) {
  const out = [];
  if (l.heat) out.push(t(`heat_${l.heat}`));
  if (l.flavour) out.push(`${t('flavourLbl')}: ${t(`flv_${l.flavour}`)}`);
  if (l.dip && S.items[l.dip]) out.push(`${t('dipLbl')}: ${L(S.items[l.dip], 'name')}`);
  if (l.upsize) out.push(t('upsizeLbl'));
  return out;
}

/* ════════════════════════ item sheet ════════════════════════ */
const sheet = $('#sheet');
let current = null; // { item, qty }

function openSheet(id, fromImg, opts = {}) {
  const item = S.items[id];
  if (!item) return;
  const out = isOut(item);
  const b = branch();
  current = { item, qty: 1 };
  const pcs = item.sizes.map(piecesOf);
  const isPcs = pcs.every((n) => n);
  const defaultSize = item.sizes.find((s) => s.id === opts.size) || item.sizes[item.sizes.length > 2 ? 1 : 0];
  const dips = has(item, 'dip') ? dipsList() : [];
  const sameName = (a, c) => a.name_en.toLowerCase().includes(c) ? 1 : 0;
  const defaultDip = dips.find((d) => sameName(d, 'mama')) || dips[0];

  $('#sheetBody').innerHTML = `
    <div class="si__hero">
      ${item.image ? `<img id="sheetImg" src="${esc(item.image)}" alt="${esc(L(item, 'name'))}" width="560" height="420">` : `<span class="si__ic">${swatch(item) || icon(miniIcon(item))}</span>`}
      <div class="si__flames" id="siFlames" aria-hidden="true">${icon('flame')}${icon('flame')}${icon('flame')}</div>
    </div>
    <h2 class="si__title" id="sheetTitle">${esc(L(item, 'name'))}</h2>
    <div class="si__alt">${esc(other(item, 'name'))}</div>
    <div class="card__tags" style="margin-top:10px">${tagChips(item, true)}</div>
    ${L(item, 'desc') ? `<p class="si__desc">${esc(L(item, 'desc'))}</p>` : ''}
    ${out ? `<div class="si__out">${esc(item.sold_out || !b ? t('soldOut') : t('soldOutAt', { b: L(b, 'name') }))}</div>` : ''}
    ${item.sizes.length > 1 ? `
      <div class="si__sec">
        <h4>${esc(isPcs ? t('choosePcs') : t('chooseSize'))}${isPcs ? `<small>${esc(t('pcsHint'))}</small>` : ''}</h4>
        <div class="sizes" role="radiogroup">
          ${item.sizes.map((s) => `<label><input type="radio" name="size" value="${esc(s.id)}" ${s.id === defaultSize.id ? 'checked' : ''}><span><b>${esc(s[S.lang])}</b><small>${money(s.price)}</small></span></label>`).join('')}
        </div>
        ${isPcs ? `<div class="pc-meter" id="pcMeter" aria-hidden="true">${icon('tender').repeat(Math.min(6, Math.max(...pcs)))}<b id="pcCount"></b></div>` : ''}
      </div>` : ''}
    ${has(item, 'heat') ? `
      <div class="si__sec"><h4>${esc(t('heatTitle'))}</h4>
        <div class="heat" role="radiogroup">
          <label class="heat__opt heat__opt--spicy"><input type="radio" name="heat" value="spicy" checked><span>${icon('flame')}<b>${esc(t('heat_spicy'))}</b><small>${esc(t('heatSpicySub'))}</small></span></label>
          <label class="heat__opt heat__opt--mild"><input type="radio" name="heat" value="mild"><span>${icon('leaf')}<b>${esc(t('heat_mild'))}</b><small>${esc(t('heatMildSub'))}</small></span></label>
        </div></div>` : ''}
    ${has(item, 'flavour') ? `
      <div class="si__sec"><h4>${esc(t('flavourTitle'))}</h4>
        <div class="choices" role="radiogroup">${FLAVOURS.map((f, i) => `<label><input type="radio" name="flavour" value="${f.id}" ${i === 0 ? 'checked' : ''}><span><i class="swatch" style="--c:${f.c}"></i>${esc(t(`flv_${f.id}`))}</span></label>`).join('')}</div></div>` : ''}
    ${dips.length ? `
      <div class="si__sec"><h4>${esc(t('dipTitle'))}<small>${esc(t('dipHint'))}</small></h4>
        <div class="choices" role="radiogroup">${dips.map((d) => `<label><input type="radio" name="dip" value="${esc(d.id)}" ${d === defaultDip ? 'checked' : ''}><span>${swatch(d, 'i')}${esc(L(d, 'name'))}</span></label>`).join('')}</div></div>` : ''}
    ${has(item, 'upsize') ? `
      <div class="si__sec">
        <label class="opt"><input type="checkbox" name="upsize"><span class="opt__ic">${icon('fries')}${icon('can')}</span>
          <span class="opt__body"><b>${esc(t('upsizeTitle'))}</b><small>${esc(t('upsizeDesc'))}</small></span>
          <span class="opt__price">+${money(upsizePrice())}</span><span class="opt__sw"></span></label>
      </div>` : ''}
    <div class="si__sec"><h4>${esc(t('noteTitle'))}</h4>
      <textarea class="si__note" name="note" rows="1" maxlength="140" placeholder="${esc(t('notePh'))}"></textarea></div>`;

  $('#sheetAdd').disabled = out;
  $('#sheetQtyVal').textContent = '1';
  $('#sheetTotal').dataset.v = '';
  updateSheet();
  openDialog(sheet);
  $('#sheetBody').scrollTop = 0;

  // the photo rises into place inside the sheet (stays clipped to its own area)
  const target = $('#sheetImg');
  if (target && !reduced) {
    target.animate([
      { transform: 'translateY(26px) scale(.86)', opacity: 0 },
      { transform: 'none', opacity: 1 },
    ], { duration: 520, delay: 90, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  }
}

function readSheet() {
  const body = $('#sheetBody');
  const { item } = current;
  const val = (name) => body.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const line = {
    id: item.id,
    size: val('size') || item.sizes[0].id,
    qty: current.qty,
    upsize: Boolean(body.querySelector('input[name="upsize"]')?.checked),
    note: (body.querySelector('textarea[name="note"]')?.value || '').trim().slice(0, 140),
  };
  if (has(item, 'heat')) line.heat = val('heat') || 'spicy';
  if (has(item, 'flavour')) line.flavour = val('flavour') || FLAVOURS[0].id;
  if (has(item, 'dip') && val('dip')) line.dip = val('dip');
  return line;
}

function updateSheet() {
  if (!current) return;
  const line = readSheet();
  odo($('#sheetTotal'), money(linePrice(line)));
  const size = current.item.sizes.find((s) => s.id === line.size);
  const n = size && piecesOf(size);
  const meter = $('#pcMeter');
  if (meter && n) {
    $$('.ic', meter).forEach((ic, i) => ic.classList.toggle('on', i < n));
    $('#pcCount').textContent = n > 6 ? `×${n}` : '';
  }
  $('#siFlames')?.classList.toggle('on', line.heat === 'spicy' || (current.item.tags || []).includes('spicy') && !line.heat);
}

$('#sheetBody').addEventListener('change', updateSheet);
$('#sheetQty').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-q]');
  if (!btn || !current) return;
  current.qty = clamp(current.qty + Number(btn.dataset.q), 1, 50);
  $('#sheetQtyVal').textContent = String(current.qty);
  updateSheet();
});
$('#sheetAdd').addEventListener('click', () => {
  if (!current) return;
  const line = readSheet();
  const img = $('#sheetImg');
  addLine(line);
  const src = current.item.image ? smImg(current.item.image) : '';
  const rect = img || $('#sheetAdd');
  fly(rect, src);
  toast(t('added'), 'check', { img: src, sub: L(current.item, 'name') });
  closeDialog(sheet);
  current = null;
});
wireDialog(sheet, () => { closeDialog(sheet); current = null; });

// drag the sheet down to dismiss (mobile)
(() => {
  const grab = $('#sheetGrab');
  let y0 = 0, dy = 0, t0 = 0, dragging = false;
  grab.addEventListener('pointerdown', (e) => {
    dragging = true; y0 = e.clientY; dy = 0; t0 = performance.now();
    grab.setPointerCapture(e.pointerId);
    sheet.classList.add('is-dragging');
  });
  grab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.setProperty('--drag', `${dy}px`);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('is-dragging');
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > 120 || v > 0.6) { closeDialog(sheet); current = null; }
    else sheet.style.setProperty('--drag', '0px');
  };
  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
})();

function quickAdd(id, sizeId, fromEl) {
  const item = S.items[id];
  if (!item || isOut(item)) return;
  addLine({ id, size: sizeId || item.sizes[0].id, qty: 1, upsize: false, note: '' });
  const img = fromEl?.closest('.card, .up')?.querySelector('img');
  const src = item.image ? smImg(item.image) : '';
  fly(img || fromEl, src);
  toast(t('added'), 'check', { img: src, sub: L(item, 'name') });
}

/* ════════════════════════ cart drawer ════════════════════════ */
const drawer = $('#cart');

function openCart() {
  if (S.sent && S.step === 2) renderDone();
  else goStep(0, false);
  renderCart();
  openDialog(drawer);
}
function closeCart() {
  closeDialog(drawer).then(() => {
    if (S.sent) { S.cart = []; saveCart(); S.sent = null; goStep(0, false); renderCart(); }
  });
}
wireDialog(drawer, closeCart);

function renderCart() {
  const box = $('#cartLines');
  if (!S.menu) return;
  if (!S.cart.length) {
    const last = store.get('mt_last_order', null);
    box.innerHTML = `<div class="empty"><div class="empty__plate">${icon('tender')}</div>
      <h3>${esc(t('emptyTitle'))}</h3><p>${esc(t('emptyDesc'))}</p>
      <button class="btn btn--gold" type="button" data-browse>${esc(t('browseMenu'))}</button>
      ${last?.lines?.length ? `<button class="btn btn--ghost" type="button" data-reorder>${icon('arrow', 'flip-rtl')}${esc(t('reorder'))}</button>` : ''}</div>`;
  } else {
    box.innerHTML = S.cart.map((l) => {
      const item = S.items[l.id];
      if (!item) return '';
      const size = item.sizes.find((s) => s.id === l.size);
      const opts = [
        item.sizes.length > 1 && size ? size[S.lang] : '',
        ...choiceLabels(l),
        l.note ? `“${l.note}”` : '',
      ].filter(Boolean).join(' · ');
      return `<div class="cline" data-k="${esc(l.k)}">
        <div class="cline__img">${item.image ? `<img src="${esc(smImg(item.image))}" alt="" loading="lazy" width="220" height="165">` : swatch(item) || icon(miniIcon(item))}</div>
        <div><p class="cline__name">${esc(L(item, 'name'))}</p>${opts ? `<p class="cline__opts">${esc(opts)}</p>` : ''}
          ${isOut(item) ? `<p class="cline__opts" style="color:#ff8a73">${esc(t('soldOut'))}</p>` : ''}</div>
        <div class="cline__side">
          <span class="cline__price">${money(linePrice(l))}</span>
          <div class="qty qty--sm"><button type="button" data-dq="-1" aria-label="${esc(t('less'))}">${icon(l.qty === 1 ? 'trash' : 'minus')}</button><output>${l.qty}</output><button type="button" data-dq="1" aria-label="${esc(t('more'))}">${icon('plus')}</button></div>
        </div>
      </div>`;
    }).join('');
  }

  // upsell
  const sides = ['fries', 'cheese-balls', 'mozzarella', 'onion-rings', 'coleslaw', 'garlic-toast', 'cookies']
    .map((id) => S.items[id]).filter((i) => i && i.image && !isOut(i) && !S.cart.some((l) => l.id === i.id)).slice(0, 5);
  $('#upsell').innerHTML = S.cart.length && sides.length ? `<h4>${esc(t('upsellTitle'))}</h4><div class="upsell__row">${sides.map((i) =>
    `<div class="up"><img src="${esc(smImg(i.image))}" alt="" loading="lazy" width="220" height="150"><b>${esc(L(i, 'name'))}</b>
      <button class="mini__btn" type="button" data-add="${esc(i.id)}" data-size="${esc(i.sizes[0].id)}" aria-label="${esc(`${t('addToOrder')}: ${L(i, 'name')}`)}">${icon('plus')}${money(i.sizes[0].price)}</button></div>`).join('')}</div>` : '';

  odo($('#cartTotal'), money(cartTotal()));
  updateFoot();
  updateCartBadges(false);
}

$('#cartLines').addEventListener('click', (e) => {
  if (e.target.closest('[data-browse]')) { closeCart(); setTimeout(() => $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 250); return; }
  if (e.target.closest('[data-reorder]')) {
    const last = store.get('mt_last_order', null);
    if (last?.lines) {
      for (const l of last.lines) if (S.items[l.id] && !isOut(S.items[l.id])) addLine({ ...l });
      toast(t('reordered'));
    }
    return;
  }
  const btn = e.target.closest('[data-dq]');
  if (!btn) return;
  const row = btn.closest('.cline');
  const line = S.cart.find((l) => l.k === row.dataset.k);
  if (!line) return;
  line.qty += Number(btn.dataset.dq);
  vibrate(8);
  if (line.qty <= 0) {
    S.cart = S.cart.filter((l) => l !== line);
    saveCart();
    row.classList.add('is-leaving');
    setTimeout(renderCart, reduced ? 0 : 320);
    toast(t('removed'), 'trash');
  } else {
    line.qty = Math.min(line.qty, 50);
    saveCart();
    renderCart();
  }
  S.sent = null;
});

const PANE_REVIEW_HTML = $('#paneReview').innerHTML;
function goStep(n, animate = true) {
  if (!S.sent && !$('#receipt')) $('#paneReview').innerHTML = PANE_REVIEW_HTML;
  S.step = n;
  const track = $('#cartTrack');
  if (!animate) { track.style.transition = 'none'; requestAnimationFrame(() => { track.style.transition = ''; }); }
  track.style.setProperty('--step', String(n));
  ['#paneCart', '#paneDetails', '#paneReview'].forEach((sel, i) => { $(sel).inert = i !== n; });
  $$('#cartSteps li').forEach((li, i) => li.classList.toggle('on', i <= n));
  $('#cartBack').hidden = n === 0 || Boolean(S.sent);
  updateFoot();
  if (n === 1) renderForm();
  if (n === 2 && !S.sent) renderReceipt(true);
  const pane = [$('#paneCart'), $('#paneDetails'), $('#paneReview')][n];
  if (pane) pane.scrollTop = 0;
}

// Delivery picked, but the chosen branch (or, before choosing, every branch) only does pickup → send them to Talabat
function deliveryBlocked() {
  if (getMode() !== 'delivery') return false;
  const id = form.querySelector('input[name="branch"]:checked')?.value || S.branchId;
  const b = S.branches[id];
  return b ? !b.delivery : !Object.values(S.branches).some((x) => x.delivery);
}

function updateFoot() {
  const btn = $('#cartNext');
  const label = $('#cartNextLabel');
  const st = S.menu?.settings || {};
  btn.disabled = false;
  if (S.sent) { label.textContent = t('newOrder'); }
  else if (S.step === 0) { label.textContent = S.cart.length ? t('checkout') : t('browseMenu'); }
  else if (S.step === 1) label.textContent = t('review');
  else label.textContent = t('sendWa');
  btn.classList.toggle('btn--wa', S.step === 2 && !S.sent);
  btn.classList.toggle('btn--gold', !(S.step === 2 && !S.sent));
  const note = $('#cartNote');
  if (st.orders_enabled === '0') { note.textContent = t('ordersOff'); if (S.step > 0 && !S.sent) btn.disabled = true; return; }
  if (S.step === 1 && deliveryBlocked()) { btn.disabled = true; note.textContent = t('noDelivery'); return; }
  note.textContent = S.step >= 1 && getMode() === 'delivery' && !S.sent ? (L(st, 'delivery_note') || t('deliveryNoteDefault')) : '';
}

$('#cartNext').addEventListener('click', () => {
  if (S.sent) { S.cart = []; saveCart(); S.sent = null; goStep(0); renderCart(); return; }
  if (S.step === 0) {
    if (!S.cart.length) { closeCart(); setTimeout(() => $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 250); return; }
    goStep(1);
  } else if (S.step === 1) {
    if (validateForm()) goStep(2);
  } else if (S.step === 2) {
    sendOrder();
  }
});
$('#cartBack').addEventListener('click', () => goStep(Math.max(0, S.step - 1)));

/* ─── checkout form ─── */
const form = $('#checkoutForm');
const getMode = () => form.querySelector('input[name="mode"]:checked')?.value || 'pickup';

function syncMode() {
  const blocked = deliveryBlocked();
  $('#talabatCard').hidden = !blocked || !talabatUrl();
  $('#addrField').hidden = getMode() !== 'delivery' || blocked;
  updateFoot();
}

function renderForm() {
  const saved = store.get('mt_customer', {});
  if (!form.dataset.filled) {
    form.dataset.filled = '1';
    if (saved.name) $('#fName').value = saved.name;
    if (saved.phone) $('#fPhone').value = saved.phone;
    if (saved.address) $('#fAddr').value = saved.address;
    if (saved.mode) { const r = form.querySelector(`input[name="mode"][value="${saved.mode}"]`); if (r) r.checked = true; }
  }
  $('#formBranches').innerHTML = Object.values(S.branches).map((b) => {
    const st = branchStatus(b);
    return `<label><input type="radio" name="branch" value="${esc(b.id)}" ${S.branchId === b.id ? 'checked' : ''}><span><b>${esc(L(b, 'name'))}</b><small class="${st.open ? '' : 'is-closed'}">${esc(st.label)}</small></span></label>`;
  }).join('');
  renderTimes();
  syncMode();
}

function renderTimes() {
  const sel = $('#fTime');
  const later = form.querySelector('input[name="when"]:checked')?.value === 'later';
  sel.hidden = !later;
  const b = branch() || Object.values(S.branches)[0];
  if (!b) return;
  const prev = sel.value;
  const now = ammanNow();
  let start = Math.ceil((now + 30) / 15) * 15;
  const slots = [];
  for (let m = start; m < start + 24 * 60 && slots.length < 20; m += 15) {
    const mm = m % (24 * 60);
    // must be open at the slot and still open 15 min later
    if (isOpenAt(b, mm) && isOpenAt(b, (mm + 15) % 1440)) slots.push(mm);
  }
  sel.innerHTML = slots.map((m) => {
    const v = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    return `<option value="${v}">${esc(fmtClock(m))}</option>`;
  }).join('');
  if (prev && slots.some((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` === prev)) sel.value = prev;
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'mode') syncMode();
  if (e.target.name === 'branch') { selectBranch(e.target.value, false); renderTimes(); syncMode(); }
  if (e.target.name === 'when') renderTimes();
  e.target.closest('.field')?.classList.remove('is-bad');
});
form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-bad'));
form.addEventListener('submit', (e) => e.preventDefault());

$('#locBtn').addEventListener('click', () => {
  const btn = $('#locBtn');
  if (!navigator.geolocation) { toast(t('locFail'), 'close'); return; }
  btn.classList.add('is-busy');
  btn.querySelector('span').textContent = t('locating');
  navigator.geolocation.getCurrentPosition((pos) => {
    S.geo = { lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) };
    btn.classList.remove('is-busy');
    btn.classList.add('is-done');
    btn.querySelector('span').textContent = t('locDone');
    $('#addrField').classList.remove('is-bad');
  }, () => {
    btn.classList.remove('is-busy');
    btn.querySelector('span').textContent = t('shareLoc');
    toast(t('locFail'), 'close');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
});

function normPhone(v) {
  let d = String(v || '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  d = d.replace(/[^\d+]/g, '');
  if (d.startsWith('+962')) d = `0${d.slice(4)}`;
  else if (d.startsWith('00962')) d = `0${d.slice(5)}`;
  else if (d.startsWith('962')) d = `0${d.slice(3)}`;
  else if (/^7[789]\d{7}$/.test(d)) d = `0${d}`;
  return /^07[789]\d{7}$/.test(d) ? d : null;
}

function bad(sel) {
  const f = $(sel).closest('.field');
  f.classList.remove('is-bad');
  void f.offsetWidth;
  f.classList.add('is-bad');
  return f;
}

function validateForm() {
  // allow Arabic-Indic digits in the phone field
  const phoneEl = $('#fPhone');
  phoneEl.value = phoneEl.value.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
  const firstBad = [];
  const branchId = form.querySelector('input[name="branch"]:checked')?.value;
  if (!branchId) { firstBad.push(bad('#formBranches')); toast(t('needBranch'), 'pin'); }
  if ($('#fName').value.trim().length < 2) firstBad.push(bad('#fName'));
  if (!normPhone($('#fPhone').value)) firstBad.push(bad('#fPhone'));
  const mode = getMode();
  if (mode === 'delivery' && !deliveryBlocked() && $('#fAddr').value.trim().length < 4 && !S.geo) firstBad.push(bad('#fAddr'));
  if (firstBad.length) { firstBad[0].scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); return false; }

  const b = S.branches[branchId];
  if (!b.accepting) { toast(t('notAccepting'), 'close'); return false; }
  if (mode === 'delivery' && !b.delivery) { toast(t('noDelivery'), 'close'); return false; }
  const outs = S.cart.filter((l) => isOut(S.items[l.id], branchId)).map((l) => L(S.items[l.id], 'name'));
  if (outs.length) { toast(t('outWarn', { list: outs.join(S.lang === 'ar' ? '، ' : ', ') }), 'close'); return false; }

  store.set('mt_customer', { name: $('#fName').value.trim(), phone: $('#fPhone').value.trim(), address: $('#fAddr').value.trim(), mode });
  return true;
}

/* ─── receipt & WhatsApp ─── */
function newOrderId() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(5));
  return `MT-${[...r].map((x) => abc[x % abc.length]).join('')}`;
}

function orderData() {
  const b = branch();
  const when = form.querySelector('input[name="when"]:checked')?.value === 'later' && $('#fTime').value
    ? fmtClock(toMin($('#fTime').value)) : t('asap');
  return {
    id: S.orderId ||= newOrderId(),
    branch: b,
    mode: getMode(),
    name: $('#fName').value.trim(),
    phone: normPhone($('#fPhone').value) || $('#fPhone').value.trim(),
    address: getMode() === 'delivery' ? $('#fAddr').value.trim() : '',
    geo: getMode() === 'delivery' ? S.geo : null,
    when,
    notes: $('#fNotes').value.trim(),
    lines: S.cart.map((l) => ({ ...l, item: S.items[l.id], price: linePrice(l) })),
    total: cartTotal(),
  };
}

function lineOpts(l) {
  const out = [];
  if (l.heat) out.push(`${l.heat === 'spicy' ? '🌶️ ' : ''}${t(`heat_${l.heat}`)}`);
  if (l.flavour) out.push(`${t('flavourLbl')}: ${t(`flv_${l.flavour}`)}`);
  if (l.dip && S.items[l.dip]) out.push(`${t('dipLbl')}: ${L(S.items[l.dip], 'name')}`);
  if (l.upsize) out.push(`${t('upsizeTitle')} (+${money(upsizePrice())})`);
  if (l.note) out.push(`${t('noteLbl')}: ${l.note}`);
  return out;
}

function buildMessage(o) {
  const ar = S.lang === 'ar';
  const sep = '━━━━━━━━━━━━━━';
  const rows = [];
  rows.push(ar ? '🍗 *طلب جديد — MAMA’S TENDERS*' : '🍗 *New order — MAMA’S TENDERS*');
  rows.push(`${ar ? 'رقم الطلب' : 'Order no.'}: *${o.id}*`);
  rows.push(`${ar ? 'الفرع' : 'Branch'}: ${L(o.branch, 'name')}`);
  rows.push(`${ar ? 'النوع' : 'Type'}: ${o.mode === 'delivery' ? `${t('delivery')} 🛵` : `${t('pickup')} 🏪`}`);
  rows.push(sep);
  for (const l of o.lines) {
    const size = l.item.sizes.length > 1 || l.item.sizes[0].id !== 'one' ? (l.item.sizes.find((s) => s.id === l.size) || {})[S.lang] : '';
    const nm = ar ? `${l.item.name_ar} (${l.item.name_en})` : l.item.name_en;
    rows.push(`*${l.qty}× ${nm}*${size ? ` — ${size}` : ''}`);
    for (const opt of lineOpts(l)) rows.push(`   ▫️ ${opt}`);
    rows.push(`   = ${priceText(l.price)}`);
  }
  rows.push(sep);
  rows.push(`*${t('total')}: ${priceText(o.total)}*`);
  if (o.mode === 'delivery') rows.push(`_${L(S.menu.settings, 'delivery_note') || t('deliveryNoteDefault')}_`);
  rows.push(sep);
  rows.push(`👤 ${t('name')}: ${o.name}`);
  rows.push(`📞 ${t('phone')}: ${o.phone}`);
  if (o.mode === 'delivery') {
    if (o.address) rows.push(`📍 ${t('address')}: ${o.address}`);
    if (o.geo) rows.push(`🗺️ ${ar ? 'الموقع' : 'Location'}: https://maps.google.com/?q=${o.geo.lat},${o.geo.lng}`);
  }
  rows.push(`⏰ ${t('time')}: ${o.when}`);
  if (o.notes) rows.push(`📝 ${t('notes')}: ${o.notes}`);
  return rows.join('\n');
}

function renderReceipt(animate) {
  const o = orderData();
  const r = $('#receipt');
  const kv = [
    [t('branch'), L(o.branch, 'name')],
    [t('orderType'), o.mode === 'delivery' ? t('delivery') : t('pickup')],
    [t('name'), o.name],
    [t('phone'), o.phone],
    ...(o.mode === 'delivery' ? [[t('address'), [o.address, o.geo ? '📍 GPS' : ''].filter(Boolean).join(' · ')]] : []),
    [t('time'), o.when],
    ...(o.notes ? [[t('notes'), o.notes]] : []),
  ];
  r.innerHTML = `<h3>MAMA’S TENDERS</h3><div class="rc-sub">${esc(t('receiptSub'))}</div><hr>
    ${o.lines.map((l) => {
      const size = l.item.sizes.length > 1 || l.item.sizes[0].id !== 'one' ? (l.item.sizes.find((s) => s.id === l.size) || {})[S.lang] : '';
      return `<div class="rc-row"><span>${l.qty}× ${esc(L(l.item, 'name'))}${size ? ` · ${esc(size)}` : ''}</span><span>${money(l.price)}</span></div>
        ${lineOpts(l).map((x) => `<div class="rc-opts">${esc(x)}</div>`).join('')}`;
    }).join('')}
    <hr><div class="rc-row rc-total"><span>${esc(t('total'))}</span><span>${esc(priceText(o.total))}</span></div>
    ${o.mode === 'delivery' ? `<div class="rc-opts" style="padding:0">${esc(L(S.menu.settings, 'delivery_note') || t('deliveryNoteDefault'))}</div>` : ''}
    <hr><dl class="rc-kv">${kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="rc-code">${esc(o.id)}</div>`;
  const b = o.branch;
  if (b && !branchStatus(b).open && o.when === t('asap')) toast(t('closedWarn'), 'clock');
  r.classList.remove('print');
  if (animate && !reduced) { void r.offsetWidth; r.classList.add('print'); }
  else r.style.clipPath = 'none';
}

function sendOrder() {
  const o = orderData();
  if (!o.branch) { goStep(1); toast(t('needBranch'), 'pin'); return; }
  const msg = buildMessage(o);
  const url = `https://wa.me/${o.branch.whatsapp}?text=${encodeURIComponent(msg)}`;

  // Log for the dashboard (fire-and-forget; never blocks the customer)
  const payload = JSON.stringify({
    id: o.id, branch_id: o.branch.id, mode: o.mode, name: o.name, phone: o.phone, lang: S.lang,
    lines: o.lines.map((l) => ({ item_id: l.id, size_id: l.size, qty: l.qty, upsize: l.upsize, heat: l.heat, flavour: l.flavour, dip: l.dip, note: l.note })),
  });
  try {
    const ok = navigator.sendBeacon?.('/api/orders', new Blob([payload], { type: 'application/json' }));
    if (!ok) fetch('/api/orders', { method: 'POST', body: payload, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch { /* ignore */ }

  // Must stay synchronous inside the click so pop-up blockers allow it
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();

  store.set('mt_last_order', { lines: S.cart.map(({ k, ...l }) => l), at: Date.now() });
  S.sent = { id: o.id, url };
  S.orderId = null;
  renderDone();
  confetti($('#cartNext'));
}

function renderDone() {
  goStep(2, false);
  $('#paneReview').innerHTML = `<div class="done"><div class="done__check">${icon('check')}</div>
    <h3>${esc(t('doneTitle'))}</h3><p>${esc(t('doneDesc'))}</p>
    <a class="btn btn--wa" href="${esc(S.sent.url)}" target="_blank" rel="noopener">${icon('wa')}${esc(t('openWaAgain'))}</a></div>`;
  $('#cartBack').hidden = true;
  updateFoot();
}

/* ════════════════════════ branch picker ════════════════════════ */
const branchModal = $('#branchModal');
wireDialog(branchModal);
function openBranchPicker() {
  $('#bmList').innerHTML = Object.values(S.branches).map((b) => {
    const st = branchStatus(b);
    return `<button type="button" data-pick="${esc(b.id)}"><span class="bm__pin">${icon('pin')}</span>
      <span class="bm__body"><b>${esc(L(b, 'name'))}</b><small>${esc(L(b, 'address'))}</small>
      <span class="status${st.open ? '' : ' is-closed'}"><i class="dot${st.open ? '' : ' is-closed'}"></i>${esc(st.label)}</span></span></button>`;
  }).join('');
  openDialog(branchModal);
}
$('#bmList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pick]');
  if (!btn) return;
  selectBranch(btn.dataset.pick);
  closeDialog(branchModal);
});
function selectBranch(id, announce = true) {
  if (!S.branches[id]) return;
  const changed = S.branchId !== id;
  S.branchId = id;
  store.set('mt_branch', id);
  renderBranchChip();
  if (changed) {
    renderMenu();
    renderBranches();
    renderCart();
  }
  if (announce) toast(t('branchSet', { b: L(S.branches[id], 'name') }), 'pin');
}

function confetti(origin) {
  if (reduced || !origin) return;
  const r = origin.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 3;
  const colors = ['#ffb81c', '#e3262a', '#ffd166', '#fff4e0', '#f08b2f'];
  for (let i = 0; i < 34; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    const s = 6 + Math.random() * 8;
    p.style.cssText = `width:${s}px;height:${s * (Math.random() > .5 ? 1 : .45)}px;background:${colors[i % colors.length]};left:${cx}px;top:${cy}px;${Math.random() > .7 ? 'border-radius:50%;' : ''}`;
    topLayer(p);
    const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 180;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 120;
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx * 1.2}px, ${dy + 260}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => p.remove();
  }
}

/* ════════════════════════ opening story (pinned, scroll-scrubbed) ════════════════════════
   Only transform + opacity change while scrolling, so it stays smooth on phones and iPads.
   0.00 hero → 0.12 zoom → 0.22 gold stage, mama's recipe (4 steps) → 0.46 red stage, CRUNCH!
   → 0.62 the meal box rises → 0.66 tenders drop in → toast / fries / drink / dip → 0.85 lid closes → CTA */
const ASPECT = 1000 / 567; // public/img/story/tenders-*.webp
const story = { p: 0 };
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeBack = (x) => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const mix = (a, b, x) => a + (b - a) * x;
const mixR = (a, b, x) => ({ x: mix(a.x, b.x, x), y: mix(a.y, b.y, x), w: mix(a.w, b.w, x) });

const BOX_RATIO = 1.55; // matches .box aspect-ratio
function setupStory() {
  const sec = $('#top');
  const pin = $('#storyPin');
  const tp = $('#tp');
  const shadow = $('#tpShadow');
  const copy = $('#storyCopy');
  const slot = $('#heroSlot');
  const decor = $('#storyDecor');
  const gold = $('#storyGold');
  const red = $('#storyRed');
  const recipe = $('#recipe');
  const recipeHead = $('.recipe__head');
  const recipeSlot = $('#recipeSlot');
  const steps = $$('#steps li');
  const impact = $('#impact');
  const meal = $('#meal');
  const mealHead = $('#mealHead');
  const box = $('#box');
  const boxSlot = $('#boxSlot');
  const back = $('.box__back'), front = $('.box__front'), lid = $('#boxLid');
  const toastImg = $('.box__toast'), fries = $('.box__fries'), cup = $('.box__cup'), dip = $('.box__dip');
  const cta = $('#mealCta');
  const hint = $('#storyHint');
  const nav = $('#nav');

  let M = null, lastP = -1, ticking = false, active = true;

  // fit a photo of ASPECT inside a box, centred
  const fit = (r, pad = 0) => {
    const w = Math.min(r.w * (1 - pad * 2), r.h * (1 - pad * 2) * ASPECT);
    return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - w / ASPECT) / 2, w };
  };

  const measure = () => {
    const vw = pin.clientWidth, vh = pin.clientHeight;
    const pr = pin.getBoundingClientRect();
    const rel = (r) => ({ x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height });
    const mobile = vw < 900;
    const navH = nav.offsetHeight || 64;
    const hero = fit(rel(slot.getBoundingClientRect()), mobile ? 0.02 : 0.04);
    const zw = Math.min(vw * (mobile ? 0.94 : 0.62), (vh - navH - 60) * 0.8 * ASPECT, 820);
    const zoom = { x: (vw - zw) / 2, y: navH + (vh - navH - zw / ASPECT) / 2, w: zw };
    const stack = fit(rel(recipeSlot.getBoundingClientRect()));
    const iw = Math.min(vw * (mobile ? 0.84 : 0.46), (vh * 0.42) * ASPECT, 640);
    const imp = { x: (vw - iw) / 2, y: (vh - iw / ASPECT) / 2, w: iw };
    // fit the meal box between the price heading and the buttons, whatever the screen height
    const headBottom = mealHead.offsetTop + mealHead.offsetHeight;
    const ctaTop = cta.offsetTop;
    const room = Math.max(120, ctaTop - headBottom - 40);
    const bw = Math.round(Math.min(600, vw * 0.9, room * BOX_RATIO));
    box.style.setProperty('--bw', `${bw}px`);
    box.style.top = `${Math.round(headBottom + 18 + (room - bw / BOX_RATIO) / 2)}px`;
    box.style.bottom = 'auto';
    const b = rel(boxSlot.getBoundingClientRect());
    const inBox = { x: b.x, y: b.y, w: b.w };
    const base = Math.ceil(Math.max(hero.w, zoom.w, stack.w, imp.w, inBox.w));
    tp.style.width = `${base}px`;
    M = { vw, vh, mobile, hero, zoom, stack, imp, inBox, base };
  };

  const set = (el, prop, val) => { if (el._v?.[prop] !== val) { (el._v ||= {})[prop] = val; el.style[prop] = val; } };

  const render = () => {
    ticking = false;
    if (!M) measure();
    const span = Math.max(1, sec.offsetHeight - pin.clientHeight);
    const p = reduced ? 0 : clamp(-sec.getBoundingClientRect().top / span, 0, 1);
    if (Math.abs(p - lastP) < 0.0004 && M.done) return;
    M.done = true;
    story.p = p;

    // the tenders' path (scaled and turned around their centre)
    const tA = easeIO(seg(p, 0, 0.12)), tB = easeIO(seg(p, 0.12, 0.22));
    const tI = easeIO(seg(p, 0.46, 0.52)), tC = easeIO(seg(p, 0.66, 0.76));
    let r = mixR(M.hero, M.zoom, tA);
    r = mixR(r, M.stack, tB);
    r = mixR(r, M.imp, tI);
    r = mixR(r, M.inBox, tC);
    const crunch = seg(p, 0.505, 0.525) * (1 - seg(p, 0.53, 0.58));
    const sc = (r.w / M.base) * (1 + 0.1 * crunch);
    const rot = -6 * easeIO(seg(p, 0.2, 0.44)) * (1 - tI) + 4 * crunch;
    const H0 = M.base / ASPECT;
    const tx = r.x + r.w / 2 - M.base / 2, ty = r.y + r.w / ASPECT / 2 - H0 / 2;
    set(tp, 'transform', `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`);
    set(shadow, 'opacity', String(Math.max(0, 1 - seg(p, 0.03, 0.14)) + 0.8 * seg(p, 0.52, 0.55) * (1 - seg(p, 0.62, 0.66))));

    // hero copy fades away first
    const fade = seg(p, 0, 0.08);
    set(copy, 'opacity', String(1 - fade));
    set(copy, 'transform', `translate3d(0,${(-50 * fade).toFixed(1)}px,0)`);
    set(copy, 'visibility', fade >= 1 ? 'hidden' : 'visible');
    set(decor, 'opacity', String(1 - seg(p, 0.03, 0.12)));
    set(slot, 'opacity', String(1 - seg(p, 0.03, 0.12)));
    set(hint, 'opacity', String(1 - seg(p, 0, 0.03)));

    // gold stage for the recipe, red stage for the CRUNCH
    const g = seg(p, 0.08, 0.18) * (1 - seg(p, 0.46, 0.5));
    set(gold, 'opacity', g.toFixed(3));
    set(red, 'opacity', (seg(p, 0.46, 0.5) * (1 - seg(p, 0.6, 0.68))).toFixed(3));
    nav.classList.toggle('on-gold', g > 0.5);

    // mama's recipe
    const recipeIn = seg(p, 0.18, 0.24) * (1 - seg(p, 0.41, 0.45));
    set(recipe, 'visibility', recipeIn > 0 ? 'visible' : 'hidden');
    set(recipeHead, 'opacity', recipeIn.toFixed(3));
    steps.forEach((li, i) => {
      const s = seg(p, 0.23 + i * 0.035, 0.27 + i * 0.035) * (1 - seg(p, 0.41, 0.44));
      set(li, 'opacity', s.toFixed(3));
      set(li, 'transform', `translate3d(0,${((1 - s) * 18).toFixed(1)}px,0)`);
    });

    // CRUNCH!
    set(impact, 'opacity', (seg(p, 0.505, 0.52) * (1 - seg(p, 0.6, 0.64))).toFixed(3));
    if (lastP < 0.515 && p >= 0.515) {
      impact.style.setProperty('--cx', `${(r.x + r.w / 2).toFixed(0)}px`);
      impact.style.setProperty('--cy', `${(r.y + r.w / ASPECT / 2).toFixed(0)}px`);
      impact.classList.remove('go'); void impact.offsetWidth; impact.classList.add('go');
      vibrate([20, 30, 12]);
    }

    // the meal box (kept hidden until its scene so it never paints or shifts while off-stage)
    set(meal, 'visibility', p > 0.58 ? 'visible' : 'hidden');
    const riseY = ((1 - easeOut(seg(p, 0.61, 0.69))) * M.vh * 0.9).toFixed(1);
    set(back, 'transform', `translate3d(0,${riseY}px,0)`);
    set(front, 'transform', `translate3d(0,${riseY}px,0)`);
    const head2 = seg(p, 0.63, 0.69);
    set(mealHead, 'opacity', head2.toFixed(3));
    set(mealHead, 'transform', `translate3d(0,${((1 - head2) * 24).toFixed(1)}px,0)`);
    const drop = (el, a, b2, rot0) => {
      const x = seg(p, a, b2);
      set(el, 'transform', `translate3d(0,${((1 - easeBack(x)) * -M.vh).toFixed(1)}px,0) rotate(${((1 - x) * rot0).toFixed(1)}deg)`);
    };
    drop(toastImg, 0.73, 0.79, -16);
    drop(fries, 0.75, 0.81, -20);
    drop(cup, 0.77, 0.83, 16);
    drop(dip, 0.79, 0.85, -12);
    const close = seg(p, 0.85, 0.92);
    set(lid, 'transform', `translate3d(0,${riseY}px,0) perspective(1400px) rotateX(${(-112 + 112 * easeIO(close)).toFixed(2)}deg)`);
    const ctaT = seg(p, 0.91, 0.95);
    set(cta, 'opacity', ctaT.toFixed(3));
    set(cta, 'transform', `translate3d(0,${((1 - ctaT) * 18).toFixed(1)}px,0)`);
    cta.classList.toggle('on', ctaT > 0.5);
    lastP = p;
  };

  const kick = () => { if (!ticking && active) { ticking = true; requestAnimationFrame(render); } };
  const remeasure = () => { M = null; lastP = -1; kick(); };
  if (reduced) sec.classList.add('is-static');
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) kick(); }, { rootMargin: '100px 0px' }).observe(sec);
  addEventListener('scroll', kick, { passive: true });
  // iOS fires resize when the address bar shows/hides; only re-measure on real size changes
  let lastW = innerWidth, lastH = innerHeight, rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 160) { lastW = innerWidth; lastH = innerHeight; remeasure(); }
    }, 150);
  }, { passive: true });
  document.fonts?.ready.then(remeasure);
  addEventListener('load', remeasure, { once: true });
  story.remeasure = remeasure;
  measure();
  render();
  tp.classList.add('is-ready');
}

/* ════════════════════════ scroll-driven bits ════════════════════════ */
function setupScroll() {
  const nav = $('#nav');
  const menubar = $('#menubar');
  let lastY = scrollY, ticking = false;
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  const update = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 10);
    const delta = y - lastY;
    if (!html.classList.contains('lock') && Math.abs(delta) > 4) {
      if (delta > 0 && y > 700) nav.classList.add('is-hidden');
      else if (delta < 0) nav.classList.remove('is-hidden');
    }
    if (y < 200) nav.classList.remove('is-hidden');
    lastY = y;
    menubar.classList.toggle('is-stuck', menubar.getBoundingClientRect().top <= (nav.classList.contains('is-hidden') ? 1 : nav.offsetHeight + 1));
    updateDock();
  };
  addEventListener('scroll', kick, { passive: true });
  update();

  // header logo + icons lean a little with scroll speed, then ease back (one CSS variable, only while moving)
  if (reduced) return;
  const dock = $('#dock');
  let lean = 0, leanY = scrollY, leaning = 0;
  const step = () => {
    const y = scrollY;
    const target = clamp((y - leanY) * 0.3, -7, 7);
    leanY = y;
    lean += (target - lean) * 0.16;
    const settled = Math.abs(lean) < 0.04 && Math.abs(target) < 0.04;
    const v = settled ? '0deg' : `${lean.toFixed(2)}deg`;
    nav.style.setProperty('--lean', v);
    dock.style.setProperty('--lean', v);
    leaning = settled ? 0 : requestAnimationFrame(step);
    if (settled) lean = 0;
  };
  addEventListener('scroll', () => { if (!leaning) leaning = requestAnimationFrame(step); }, { passive: true });
}

function updateDock() {
  const dock = $('#dock');
  const sec = $('#top');
  const storyEnd = sec.offsetTop + sec.offsetHeight - innerHeight * 0.6;
  // stay out of the way of the hero buttons and the story; the header cart button is always there
  const show = scrollY > storyEnd;
  dock.classList.toggle('is-on', show && !html.classList.contains('lock'));
}

/* ════════════════════════ global events ════════════════════════ */
document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) {
    const card = open.closest('.card, .pick');
    openSheet(open.dataset.open, card?.querySelector('img'));
    return;
  }
  const quick = e.target.closest('[data-quick]');
  if (quick) {
    const item = S.items[quick.dataset.quick];
    if (!item) return;
    if (item.sizes.length === 1 && !optsOf(item).length) quickAdd(item.id, null, quick);
    else openSheet(item.id, quick.closest('.card')?.querySelector('img'));
    return;
  }
  const add = e.target.closest('[data-add]');
  if (add) { quickAdd(add.dataset.add, add.dataset.size, add); return; }
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    const sec = $(`#cat-${CSS.escape(tab.dataset.tab)}`);
    spyLock = Date.now() + 900;
    $$('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
    moveInk(tab);
    const tabs = $('#tabs');
    const tr = tabs.getBoundingClientRect(), br = tab.getBoundingClientRect();
    tabs.scrollBy({ left: br.left + br.width / 2 - (tr.left + tr.width / 2), behavior: reduced ? 'auto' : 'smooth' });
    sec?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  const mapCard = e.target.closest('[data-map]');
  if (mapCard && !e.target.closest('a, button')) { setMap(mapCard.dataset.map); return; }
  const ob = e.target.closest('[data-order-branch]');
  if (ob) { selectBranch(ob.dataset.orderBranch); $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return; }
  const om = e.target.closest('[data-open-meal]');
  if (om) { openSheet(om.dataset.openMeal, $('#tpImg'), { size: om.dataset.size }); return; }
  if (e.target.closest('[data-open-cart]')) openCart();
});

$('#cartBtn').addEventListener('click', openCart);
$('#dockCart').addEventListener('click', openCart);
$('#branchChip').addEventListener('click', () => S.menu && openBranchPicker());
$('#langBtn').addEventListener('click', () => setLang(S.lang === 'ar' ? 'en' : 'ar'));
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 110);
  $('#searchToggle').classList.toggle('has-q', Boolean($('#search').value));
});
$('#searchToggle').addEventListener('click', () => {
  const bar = $('#menubar');
  const on = !bar.classList.contains('is-searching');
  bar.classList.toggle('is-searching', on);
  $('#searchToggle').setAttribute('aria-expanded', String(on));
  if (on) $('#search').focus({ preventScroll: true });
});
// "/" jumps to search on desktop
addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.target.closest?.('input, textarea, select') || html.classList.contains('lock')) return;
  e.preventDefault();
  $('#menubar').classList.add('is-searching');
  $('#menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  setTimeout(() => $('#search').focus({ preventScroll: true }), reduced ? 0 : 450);
});
addEventListener('resize', () => { const a = $('#tabs button[aria-selected="true"]'); if (a) moveInk(a, false); }, { passive: true });
addEventListener('storage', (e) => { if (e.key === 'mt_cart') { S.cart = store.get('mt_cart', []); renderCart(); } });

// refresh open/closed labels every minute
setInterval(() => { if (S.menu) { renderHeroMeta(); } }, 60000);

/* ════════════════════════ boot ════════════════════════ */
if (S.lang !== 'ar') applyStatic();
try { $('#toasts').setAttribute('popover', 'manual'); $('#toasts').showPopover?.(); } catch { /* ignore */ }
setupStory();
setupScroll();
setupMap();
observeReveals();
renderCart();
loadMenu().finally(() => $('#menuSkeleton')?.remove());
