# MAMA'S TENDERS

A fast, animated, Arabic-first ordering website for **Mama's Tenders** (Amman: Marj Al Hamam, 7th Circle, Mecca Mall, Khalda). Customers browse the menu, pick **spicy or mild**, their wings/bites flavour and the dip that comes with their meal, then send the order to the branch on **WhatsApp** as a neatly formatted message. Home delivery goes to the restaurant's **Talabat** page. The owner manages everything from a password-protected **dashboard** at `/admin`.

**Stack:** Cloudflare Workers + D1 + Workers Static Assets. No frameworks, no build step, no runtime dependencies. Vanilla JS/CSS, self-hosted fonts.

---

## 1. What's in it

| Part | What | Where |
|---|---|---|
| Data model | categories, items with per-size prices (in fils, 1 JD = 1000), tags, **order options per item** (spicy/mild, flavour, dip, upsize), dips, per-branch sold-out, branches, settings, uploaded photos, order log | `migrations/0001_schema.sql` |
| Menu | prices from the in-store counter menu (2026), descriptions from the restaurant's Talabat listing, one source file that generates the seed SQL and a static fallback JSON | `data/menu.mjs` → `npm run seed:build` |
| API (Worker) | public menu, order logging with server-side re-pricing, admin CRUD, photo upload, stats | `src/` |
| Customer site | Arabic RTL first, one-tap English, animated, mobile-first, WhatsApp checkout | `public/index.html`, `public/css`, `public/js` |
| Dashboard | login, stats, menu editor, sold-out per item and per branch, photos, branches, settings | `public/admin/` |

---

## 2. Customer site

**Brand**
- **Logo**: the rooster badge, traced from the official logo into a sharp multi-colour SVG (`public/img/logo.svg`), plus the "…its mama's way" script as `public/img/tagline.svg`. Used in the header, hero, meal box, footer, dashboard, 404, favicon, app icons and share image.
- Colours from the logo: warm black, **Mama's gold** (`--gold`) and **rooster red** (`--red`). Headings in a heavy slab (Alfa Slab One, like the shop sign) with a rounded heavy Arabic (Baloo Bhaijaan 2); body text in Cairo.
- Prices are shown as **tickets** like the in-store menu boards: `[ 3 pcs | 4.50 ]`.
- The brand name stays in Latin letters in both languages.

**Opening scroll story (pinned, scroll-scrubbed), starring the tenders**
1. **Hero**: a pile of crispy tenders over a giant gold lightning bolt (the bolt from the rooster), the Google badge (4.9 · 13,000+ reviews), the rooster badge + tagline, **Order now** / **Our branches**, live open/closed status and a "Home delivery? Order on Talabat" link.
2. **Mama's recipe** (gold "wax paper" stage): the tenders move to the centre and four steps appear around them: fresh chicken breast · Mama's secret marinade · hand-breaded · spicy or mild.
3. **CRUNCH!** (red stage): the tenders bump, two gold bolts pop and a ring ripples out.
4. **The full meal**: a black Mama's box rises, the tenders drop in, then garlic toast, crinkle fries, a branded drink and dips; the lid closes. "Order the tenders meal · 5 pcs" opens the sheet on the 5-piece meal.
- Only `transform` and `opacity` animate; no blur, backdrop filters, canvas or per-frame clip-paths. Re-measured only on real resizes (not the iOS address bar). Reduced-motion users get the static hero.

**Menu & ordering**
- **Mama's picks** rail (items marked ⭐ in the dashboard), then a sticky category bar with a sliding indicator, scroll-spy and Arabic-aware search (`/` on desktop).
- 9 sections: Tenders, Sandwiches (all meals with fries & a drink), Wings, Bites, Kids Meals, Sides, Dips (colour swatches like the sauce dots on the counter menu), Cookies, Drinks.
- **Item sheet** (bottom sheet on mobile, drag down to dismiss):
  - pieces picker with a row of tenders that fills up as you pick more,
  - **Spicy / Mild** toggle (flames appear on the photo when it's spicy),
  - **flavour** for wings & bites (Original, BBQ, Dynamite, Buffalo, Honey Mustard, Sweet Chili),
  - **the dip that comes with the meal** (free, defaults to Mama's Sauce),
  - **Upsize your meal** (+1.00), kitchen note, quantity and a rolling odometer price.
- Add to cart: the photo flies into the bag, +1 pop, haptic buzz.
- Cart drawer with quantity steppers, "Goes great with" sides, and **Reorder last time**.
- **Checkout**: pickup at a branch (live open/closed), name + Jordanian phone validation (Arabic digits accepted), ASAP or a 15-minute slot inside the branch's hours, notes. Choosing **delivery** at a pickup-only branch shows **"Home delivery is through Talabat"** with a button to the Talabat page (if a branch is switched to "delivery available" in the dashboard, the normal address + location flow is used instead).
- A thermal receipt "prints", then **Send on WhatsApp** opens `wa.me/962775866660` with:

```
🍗 *طلب جديد — MAMA’S TENDERS*
رقم الطلب: *MT-TSMV4*
الفرع: خلدا
النوع: استلام من الفرع 🏪
━━━━━━━━━━━━━━
*2× وجبة تندرز (Tenders Meal)* — 5 قطع
   ▫️ عادي
   ▫️ الصوص: رانش
   ▫️ كبّر الوجبة (+1.00)
   ▫️ ملاحظة: بدون كولسلو
   = 14.50 د.أ
*1× وينجز سولو (Wings Solo)* — 4 قطع
   ▫️ النكهة: دايناميت
   = 2.50 د.أ
━━━━━━━━━━━━━━
*المجموع: 17.00 د.أ*
━━━━━━━━━━━━━━
👤 الاسم: محمد
📞 رقم الهاتف: 0791234567
⏰ الوقت: 6:30 م
```

Every order is also logged (fire-and-forget) for the dashboard. The server **re-prices** each order from the database, and only accepts spicy/mild, flavour, dip and upsize on items that offer them.

**Branches & reviews**
- Four branch cards with real photos from each branch's Google Maps listing, live open/closed, rating, hours, Order here, Directions, WhatsApp and Call. Tapping a card moves the embedded Google map (no API key) to that branch.
- Four real Google reviews, one from each branch.

**Other details**: sold-out tape (globally or per branch), View Transition language switch, cached menu with `/data/menu.json` fallback, installable (manifest + icons), Open Graph image, `Restaurant` JSON-LD with all four branches, custom 404, native `<dialog>`s, focus styles and reduced-motion support.

### Lighthouse (mobile, local dev server, no compression)

| Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|
| **97** | **100** | **100** | **100** |

LCP 2.5 s · TBT 10 ms · CLS 0 · Speed Index 1.5 s (simulated slow 4G). Production adds Cloudflare's brotli and edge caching.

---

## 3. Dashboard (`/admin`)

- **Login**: one password, stored as a Worker secret. HMAC-signed `HttpOnly; Secure; SameSite=Strict` cookie (7 days), 8 failed attempts per 15 minutes per IP.
- **Overview**: orders and sales today, last 7 days, average order, a 14-day chart, split by branch, top items, recent orders (click for details, spicy/mild, flavour, dip, upsize, and a WhatsApp button to the customer).
- **Menu**: search/filter; per item ⭐ featured (Mama's picks), **Available everywhere**, and a switch **per branch**. Item editor: photo upload (resized to WebP in the browser) or pick an existing one, Arabic/English names, ingredients and notes, sizes and prices with presets (3/4/5 pcs, Meal, Dip 1/3, single size), tags (spicy, grilled, fan favourite, new), **order options** (spicy or mild, flavour, dip with the meal, upsize), and "dip choice for meals".
- **Categories**: rename, reorder, hide, add.
- **Branches**: names, addresses, **WhatsApp number** (orders go here), phone, Google Maps link, opening hours, rating, delivery on/off, accepting online orders on/off.
- **Settings**: upsize price, homepage rating, delivery note, announcement bar, Instagram/TikTok/Facebook/Talabat links, master online-ordering switch.

---

## 4. Project structure

> Reusing this for another restaurant? Read `CLAUDE.md`: it has the rebranding checklist, the lessons learned and the `tools/` scripts.

```
data/menu.mjs              ← the menu (single source of truth for the seed)
migrations/                ← D1 schema + generated seed
scripts/build-seed.mjs     ← data/menu.mjs → migrations/0002_seed.sql + public/data/menu.json
scripts/stamp.mjs          ← content-hash ?v= for CSS/JS (runs before dev/deploy)
src/index.js               ← Worker: router, menu, orders, admin API, images
src/auth.js, src/http.js   ← sessions, rate limiting, validation helpers
public/                    ← static site (index.html, css/, js/, img/, fonts/, admin/, _headers)
wrangler.jsonc             ← Worker `mamastenders` + D1 `mamastenders` + assets
```

---

## 5. Deploy (Cloudflare Workers + D1)

The D1 database **`mamastenders`** (id `4b5a6ffa-…`) is created and bound in `wrangler.jsonc`, and the Worker is named **`mamastenders`**, so it never touches another site's Worker or data.

**The database sets itself up.** On the first API request, `src/seed.js` creates the tables and loads the starter menu, branches and settings from `public/data/menu.json`. It only inserts what is missing, so dashboard edits are never overwritten.

**Steps**
1. In Cloudflare, **Workers & Pages → Create → Import a repository**, pick this repo/branch, deploy command `npx wrangler deploy`, no build command (or run `npm run deploy` locally after `npx wrangler login`).
2. **Set the dashboard password**: Worker `mamastenders` → Settings → Variables and Secrets → add `ADMIN_PASSWORD` (Secret) and optionally `SESSION_SECRET` (any long random string).
3. Open `https://mamastenders.<your-subdomain>.workers.dev/admin`, sign in and check branches, hours and WhatsApp.
4. Optional custom domain: Worker → Settings → Domains & Routes.

**Run locally**

```bash
npm install
cp .dev.vars.example .dev.vars        # ADMIN_PASSWORD=change-me for local only
npm run dev                           # http://localhost:8787  and  /admin
```

**Changing the seed menu later**: edit `data/menu.mjs`, run `npm run seed:build`. On a live database, use the dashboard instead (re-running the seed would overwrite dashboard edits).

---

## 6. Confirm with the owner

- **WhatsApp**: all four branches send orders to **077 586 6660** (`962775866660`). Calls go to the number on Google Maps, **06 566 6660**. Give each branch its own number in Branches if needed.
- **Delivery**: set to *pickup on WhatsApp, delivery on Talabat* for every branch. Switch a branch's "Delivery available" on to take delivery orders on WhatsApp too.
- **Opening hours** (Google Maps, 22 Oct 2026): 7th Circle 11 AM–2 AM; Mecca Mall 11 AM–12 AM; Khalda 11 AM–1 AM (Thu–Fri until 2 AM — the site uses the 1 AM closing every day). **Marj Al Hamam has no hours on Google**, so it is set to 11 AM–1 AM; please confirm.
- **Prices**: from the counter menu photo ("all prices are inclusive"). Sandwich prices are the meal prices (fries + drink), "Upsize your meal" is +1 JD. Not on the counter menu and so not included: Truffle Chicken, The Square, Snack Box, Share Box (add them in the dashboard with in-store prices).
- **Photos**: product photos from the restaurant's Talabat listing with backgrounds removed; storefront photos from each branch's Google Maps gallery (7th Circle uses an interior shot). Upload originals per item from the dashboard for even sharper images.
- **Ratings**: Marj Al Hamam 4.9 (2,859), 7th Circle 4.8 (4,371), Mecca Mall 4.9 (2,719), Khalda 4.9 (3,056) — editable.
