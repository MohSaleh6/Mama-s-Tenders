# Restaurant site template — MAMA'S TENDERS, Amman

A fast, Arabic-first restaurant website. Customers browse the menu, build an order (pieces/sizes, spicy or mild, wings/bites flavour, the dip that comes with the meal, upsize, notes) and send it to the branch on **WhatsApp**, already formatted. Home delivery links out to Talabat. The owner edits everything at **/admin**. It runs on **Cloudflare Workers + D1 + static assets** with plain HTML/CSS/JS and no framework or build step.

This repo was rebranded from the Meat & Cheezz template. If it is copied for **another restaurant**, follow "Rebranding for a new restaurant" below and remove every trace of Mama's Tenders. `README.md` is the owner-facing write-up (features, admin, deploy); update it too.

## How it fits together
| Path | What it is |
|---|---|
| `src/index.js` | Worker router: `GET /api/menu`, `POST /api/orders` (re-prices from D1, never trusts the browser; 30 per 10 min per IP), `/api/admin/*`, `/img/u/:id` (uploaded photos) |
| `src/seed.js` | On first request to an empty D1, creates tables and loads `public/data/menu.json`. A fresh database seeds itself, with no manual migration needed |
| `src/auth.js`, `src/http.js` | Admin login: HMAC cookie, `ADMIN_PASSWORD` secret, 8 failures per 15 min lockout. Writes need header `x-mc-admin: 1`. Validation helpers |
| `data/menu.mjs` | **Source of truth for the starting menu**: categories, items (prices in fils, 1 JD = 1000; `options` = any of `heat`/`flavour`/`dip`/`upsize`; `is_dip` = offered as the meal's dip), branches (hours, WhatsApp, maps URL), settings (`combo_price` is the upsize price). `npm run seed:build` writes `migrations/0002_seed.sql` and `public/data/menu.json` |
| `public/index.html` | The one page: header, scroll story (`#top`: hero → recipe → CRUNCH! → meal box), Mama's picks + menu, branches + Google map, reviews, footer, cart drawer (with the Talabat card), item sheet, branch picker |
| `public/js/app.js` | All site logic: rendering, cart, checkout, WhatsApp message, scroll story, reveals |
| `public/js/i18n.js` | **All Arabic + English copy** (`ar` / `en` dictionaries; HTML uses `data-i18n="key"`), plus `FLAVOURS` (ids must match `FLAVOURS` in `src/index.js`), `DIP_COLORS` (swatch per dip id) and `QUOTES` (real Google reviews) |
| `public/css/site.css` | All styles. Brand colours are tokens at the top (`--gold`, `--red`, `--ink`, …). RTL via logical properties |
| `public/admin/` | Owner dashboard: items, per-size prices, order options, photos, sold-out (global or per branch), featured (Mama's picks), categories, branches, settings, orders log |
| `public/_headers` | CSP (allows the `google.com` map iframe) and long caching for `?v=` hashed assets |
| `scripts/stamp.mjs` | `npm run stamp` content-hashes CSS/JS URLs (`?v=`). **Run it after every CSS/JS edit**, or browsers keep the old file for a year |
| `tools/` | Brand, image and test tooling (see below). Not deployed |

Local dev: `npm install && npm run dev` serves on http://127.0.0.1:8787 with a local D1. Put `ADMIN_PASSWORD=...` in `.dev.vars` (copy `.dev.vars.example`).

## Rebranding for a new restaurant (checklist)
1. **Cloudflare**: in `wrangler.jsonc` set a new `name` and a **new** D1 `database_name` + `database_id` (create the database first). Never reuse another client's database id, or they'd share menu and orders. The Meat & Cheezz Worker and database live in the **same Cloudflare account** as `mamastenders`, so a wrong name/id would overwrite a live client. In `package.json`, set the name. Set the `ADMIN_PASSWORD` secret in the dashboard.
2. **Menu & branches**: rewrite `data/menu.mjs` from their menu (photos of the menu boards, Talabat listing, link-in-bio), then `npm run seed:build`. Each branch needs id, names, address, hours (`open_time`/`close_time`, past-midnight closing supported), WhatsApp in international format, `maps_url`, rating/reviews, delivery flag. Settings: upsize price (`combo_price`), Google rating/count, delivery note, socials, Talabat link.
   - Item `options` drive the item sheet and are re-checked by the server: `heat` (spicy/mild), `flavour` (list in `FLAVOURS`, both `src/index.js` and `i18n.js`), `dip` (choose from items with `is_dip`), `upsize` (+`combo_price`). Sizes with ids like `5pc` show the pieces meter.
   - The Talabat listing is the easiest source of descriptions and product photos: `https://www.talabat.com/jordan/restaurant/<branchId>/<slug>?aid=<areaId>` has the whole menu in `__NEXT_DATA__` (the branch id is the `vendor/<id>` in its image URLs). Its prices are marked up; use in-store prices.
   - Google Maps data (hours, phone, coordinates, ratings) comes from the `search?tbm=map` response when searching the brand in Maps; place pages and photo galleries only load in a headful browser (`xvfb-run` + Playwright with the Chromium in `/opt/pw-browsers`).
3. **Copy**: every user-facing string in `public/js/i18n.js` (both languages), plus the static text, `<title>`, meta/OG tags and JSON-LD in `public/index.html`, `public/manifest.webmanifest`, `public/404.html`, the admin title in `public/admin/admin.js` + `index.html`, and the WhatsApp message header in `buildMessage` in `app.js` (search `طلب جديد`).
4. **Brand-specific code in `app.js`**:
   - `BRANCH_PHOTOS`, which maps branch id to `public/img/branches/<id>-480|800.webp`.
   - The `mapQuery()` fallback text, and the upsell id list in `renderCart`.
   - `data-open-meal="tenders-meal" data-size="5pc"` in `index.html` (the item and size the meal-box CTA opens; its price is shown in the scene).
   - The phone formatting, which is Jordan (+962). Adapt it for another country, along with the server check in `src/index.js` and the currency label (JD/fils) in `i18n.js`.
5. **Logo**: a raster logo on black → `python3 tools/brand/trace_logo.py <logo.png> tools/out/logo` writes `logo.svg` (round badge, one traced layer per brand colour) and `tagline.svg`. Tune the colour tests, `MARK_Y` and `BADGE` at the top of the script for another logo. Copy them to `public/img/`, and `logo.svg` to `public/favicon.svg`. The logo is used as an `<img>` (multi-colour), not an inline symbol. A real vector logo from the client goes in the same places.
6. **Colours & fonts**: the tokens at the top of `site.css` (`--gold`, `--red`, …) and the `@font-face` rules (Latin display, Arabic display, body). Check contrast of text on the brand colour.
7. **Photos** (`tools/images/cutout.py` removes backgrounds; crop the source first when it has text or props in it):
   - **Menu**: cut-outs on transparency, `public/img/menu/<item-id>.webp` (560 px) + `-sm.webp` (220 px).
   - **Story**: one hero photo in `public/img/story/` (`tenders-640/800/1000.webp`) plus the box pieces (`toast`, `fries`, `dip`). `ASPECT` in `app.js` and the `.tp`/`.box__slot` aspect ratios in `site.css` must match the hero photo. The recipe steps are `s0t`–`s3t` in `i18n.js`.
   - **Branches**: storefront photos from the Google Maps gallery, cropped 16:10. **Crop out neighbouring shops' signs**, especially competitors.
8. **Share image + app icons**: `node tools/brand/brand.cjs` with the dev server running. It renders `public/img/og.jpg` and `public/icons/*` from `public/img/logo.svg`. Edit the OG text in `brand.cjs` first, then bump `og.jpg?v=` in `index.html`.
9. **Tests**: the scripts use this menu's ids (`tenders-meal`, `wings-solo`, `fries`, `water`, `dip-bbq`, `dip-ranch`, `big-mama`, `rocket`, `cookies`, branches `khalda`, `mecca-mall`). Update them to the new menu's ids.
10. `npm run stamp`, then run `tools/test.sh all`, then update `README.md`.

## Rules learned the hard way (keep them)
- **Smoothness on iPhone/iPad Safari comes first.**
  - Animate only `transform` and `opacity`.
  - No `backdrop-filter`, no blur or drop-shadow filters on big moving layers, no per-frame `clip-path`, no canvas particles, no giant text strokes.
  - The scroll story re-measures only on a real resize, never when the iOS address bar shows or hides.
  - Below-the-fold sections use `content-visibility: auto`.
- **Safari layout traps**:
  - Give images an explicit size instead of a percentage height inside a grid. Safari can resolve the percentage to the image's natural size; that's what made the item-sheet photo blow up.
  - Size things from the screen height too (`svh`). iPad landscape inside Safari is only about 1000×630.
- **Nothing may overlap on any screen.**
  - Hero logo and phone tenders photo size come from `100svh`, with `align-content: safe center`.
  - The meal box is measured in JS (`measure()` in `setupStory`) to fit between the price and the buttons.
  - The cart dock hides during the hero and story.
  - `tools/tests/fit.cjs` checks 8 screen sizes; keep it at "ok" everywhere.
- **Top layer**: toasts, the fly-to-cart image and confetti use `showPopover()` so they sit above open `<dialog>`s. Give popovers explicit sizes, or Safari's default popover styles stretch them (the "giant white pill" bug). Don't fly copies of images *over* a dialog; animate inside it.
- **Layout shift ~0**:
  - Preload the font used above the fold.
  - Keep off-stage scenes `visibility: hidden` until their turn.
  - Check with `tools/tests/cls.cjs`.
- **Keep it simple.** The owner asked for "smooth, simple, not stuffed", with generous spacing. Motion is subtle:
  - Cards reveal in a short wave.
  - Icons pop in once.
  - The header logo leans with scroll speed.
- **Wording**:
  - Write Arabic in Jordanian dialect («فاتحين» not «مفتوحين», «هلّق», «بدك»…).
  - Write the brand name in Latin letters (no Arabic transliteration of the name).
- **Text in the right direction**: put `lang="en" dir="ltr"` on English-only text inside Arabic pages. Use logical CSS properties (`inset-inline-start`, `margin-inline`, …). `--dir` is -1 in RTL for direction-aware transforms.
- Lighthouse mobile target is 90+ (Mama's Tenders: 97, with Accessibility, Best Practices and SEO at 100).

## Tools (`tools/`)
- `tools/test.sh [all]`: regression checks against the dev server, including:
  - the order flow down to the exact WhatsApp text
  - screen fit on 8 sizes
  - the item-sheet photo
  - sideways overflow
  - layout shift
  - failed requests
  - i18n keys
  
  `all` adds screenshots of every section and the story frames into `tools/out/`. **Look at the screenshots**, especially the iPad sizes.
- Other tests in `tools/tests/`: `admin.cjs` (admin CRUD, which changes local data, so reset `.wrangler/state` afterwards) and `map.cjs` (map loads; run Chromium with `--proxy-server` in the sandbox).
- Lighthouse: `CHROME_PATH=<chromium> npx lighthouse http://127.0.0.1:8787/ --form-factor=mobile --chrome-flags="--headless=new --no-sandbox"`.
- `tools/images/upscale.py`: 4× Real-ESRGAN upscale of a region of a PDF/menu page. The model download URL is in the file header.
- `tools/images/cutout.py`: background removal (rembg).
- `tools/images/webp.py`: WebP export at the sizes the site expects.
- `tools/brand/trace_logo.py`: traces a raster logo into the badge + tagline SVGs (see the rebranding checklist).
- `tools/brand/brand.cjs`: renders the share image and app icons.
- Python deps: `pip install pillow numpy onnxruntime "rembg[cpu]" vtracer`.

## Deploy
Workers Builds is connected to the GitHub branch. The deploy command is `npx wrangler deploy`, with no build command, because hashed URLs are committed via `npm run stamp`. Pushing to the branch redeploys. On a new account, create the D1 database first and put its id in `wrangler.jsonc`. The empty database seeds itself on the first request. Set the `ADMIN_PASSWORD` secret (and optionally `SESSION_SECRET`, any long random string) under Worker → Settings → Variables and Secrets.

## Ordering beyond WhatsApp (discussed, not built)
Orders already pass through `POST /api/orders` (server re-pricing), so that's the hook for sending them to a POS API (e.g. Foodics), a connector service (Deliverect/Otter/UrbanPiper) or a live orders screen + cloud printer. Without a human reading WhatsApp, add phone verification (OTP), online payment or a staff "accept" step against prank orders.
