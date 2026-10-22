# Restaurant site template (built first for MEAT AND CHEEZZ, Amman)

A fast, Arabic-first restaurant website. Customers browse the menu, build an order (sizes, combo, add-ons, notes) and send it to the branch on **WhatsApp**, already formatted. The owner edits everything at **/admin**. It runs on **Cloudflare Workers + D1 + static assets** with plain HTML/CSS/JS and no framework or build step.

If this repo was copied for a **new restaurant**, follow "Rebranding for a new restaurant" below and remove every trace of Meat & Cheezz. `README.md` is the owner-facing write-up (features, admin, deploy); update it too.

## How it fits together
| Path | What it is |
|---|---|
| `src/index.js` | Worker router: `GET /api/menu`, `POST /api/orders` (re-prices from D1, never trusts the browser; 30 per 10 min per IP), `/api/admin/*`, `/img/u/:id` (uploaded photos) |
| `src/seed.js` | On first request to an empty D1, creates tables and loads `public/data/menu.json`. A fresh database seeds itself, with no manual migration needed |
| `src/auth.js`, `src/http.js` | Admin login: HMAC cookie, `ADMIN_PASSWORD` secret, 8 failures per 15 min lockout. Writes need header `x-mc-admin: 1`. Validation helpers |
| `data/menu.mjs` | **Source of truth for the starting menu**: categories, items (prices in fils, 1 JD = 1000), branches (hours, WhatsApp, maps URL), settings. `npm run seed:build` writes `migrations/0002_seed.sql` and `public/data/menu.json` |
| `public/index.html` | The one page: header, scroll story (`#top`), menu, branches + Google map, reviews, footer, cart drawer, item sheet, branch picker |
| `public/js/app.js` | All site logic: rendering, cart, checkout, WhatsApp message, scroll story, reveals |
| `public/js/i18n.js` | **All Arabic + English copy** (`ar` / `en` dictionaries). HTML uses `data-i18n="key"` |
| `public/css/site.css` | All styles. Brand colours are tokens at the top (`--yellow`, `--ink`, …). RTL via logical properties |
| `public/admin/` | Owner dashboard: items, per-size prices, photos, sold-out (global or per branch), featured, categories, branches, settings, orders log |
| `public/_headers` | CSP (allows the `google.com` map iframe) and long caching for `?v=` hashed assets |
| `scripts/stamp.mjs` | `npm run stamp` content-hashes CSS/JS URLs (`?v=`). **Run it after every CSS/JS edit**, or browsers keep the old file for a year |
| `tools/` | Brand, image and test tooling (see below). Not deployed |

Local dev: `npm install && npm run dev` serves on http://127.0.0.1:8787 with a local D1. Put `ADMIN_PASSWORD=...` in `.dev.vars` (copy `.dev.vars.example`).

## Rebranding for a new restaurant (checklist)
1. **Cloudflare**: in `wrangler.jsonc` set a new `name` and a **new** D1 `database_name` + `database_id` (create the database first). Never reuse another client's database id, or they'd share menu and orders. In `package.json`, set the name. Set the `ADMIN_PASSWORD` secret in the dashboard.
2. **Menu & branches**: rewrite `data/menu.mjs` from their menu (PDF, photos, link-in-bio), then `npm run seed:build`. Each branch needs id, names, address, hours (`open_time`/`close_time`, past-midnight closing supported), WhatsApp in international format, `maps_url`, rating/reviews, delivery flag. Settings: combo price, Google rating/count, delivery note, socials.
3. **Copy**: every user-facing string in `public/js/i18n.js` (both languages), plus the static text, `<title>`, meta/OG tags and JSON-LD in `public/index.html`, `public/manifest.webmanifest`, `public/404.html`, the admin title in `public/admin/admin.js`, and the WhatsApp message header in `buildMessage` in `app.js` (search `طلب جديد`).
4. **Brand-specific code in `app.js`**:
   - `BRANCH_PHOTOS`, which maps branch id to `public/img/branches/<id>-480|800.webp`.
   - The `mapQuery()` fallback text.
   - The phone formatting, which is Jordan (+962). Adapt it for another country, along with the server check in `src/index.js` and the currency label (JD/fils) in `i18n.js`.
5. **Logo**: `python3 tools/brand/logo.py <heavy-font.ttf> tools/out/logo TOP MIDDLE BOTTOM`. This turns the text into paths, so no font ships. Copy `logo.svg` to `public/img/logo.svg`, `favicon.svg` to `public/`, and paste `logo-symbol.txt` over the `<symbol id="logo">` in `index.html`'s sprite. If the client has a real vector logo, use it in the same places instead. The layout (bars + three lines) matches the Meat & Cheezz sign, so edit `logo.py` for other shapes.
6. **Colours**: the tokens at the top of `site.css`. Check contrast of text on the brand colour.
7. **Photos**:
   - **Menu**: cut-outs on transparency, `public/img/menu/<item-id>.webp` (560 px) + `-sm.webp` (220 px).
   - **Story**: one hero dish in `public/img/story/` (`smash-640/1000.webp` and the fries/dip pieces). The story's 5 layer cuts (`CUTS`, `L_MID`, `ASPECT` in `app.js`) are hand-tuned to that exact photo. For a new dish, re-tune them by checking `tools/tests/story.cjs` frames.
   - **Branches**: storefront photos. **Crop out neighbouring shops' signs**, especially competitors.
   - Rename `data-open-combo="smash"` (the item the combo CTA opens) and the story label keys `l0t`–`l4t`.
8. **Share image + app icons**: `node tools/brand/brand.cjs tools/out/logo` with the dev server running. It renders `public/img/og.jpg` and `public/icons/*`. Edit the OG text in `brand.cjs` first, then bump `og.jpg?v=` in `index.html`.
9. **Tests**: the scripts use Meat & Cheezz item and branch ids (`smash`, `french-fries`, `sauce-ranch`, `extra-cheezzy`, `abdoun`, `mecca`). Update them to the new menu's ids.
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
  - Hero logo and phone burger photo size come from `100svh`, with `align-content: safe center`.
  - The combo box is measured in JS (`measure()` in `setupStory`) to fit between the price and the buttons.
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
  - Write Arabic in Jordanian dialect (the owner chose «فاتحين» over «مفتوحين», and «خبز» over «بريوش»).
  - Write the brand name in Latin letters (no Arabic transliteration of the name).
- **Text in the right direction**: put `lang="en" dir="ltr"` on English-only text inside Arabic pages. Use logical CSS properties (`inset-inline-start`, `margin-inline`, …). `--dir` is -1 in RTL for direction-aware transforms.
- Lighthouse mobile target is 90+ (it was 92–95, with Accessibility, Best Practices and SEO at 100).

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
- `tools/brand/logo.py`: generates the logo files (see the rebranding checklist).
- `tools/brand/brand.cjs`: renders the share image and app icons.
- Python deps: `pip install pillow numpy onnxruntime "rembg[cpu]" fonttools uharfbuzz`.

## Deploy
Workers Builds is connected to the GitHub branch. The deploy command is `npx wrangler deploy`, with no build command, because hashed URLs are committed via `npm run stamp`. Pushing to the branch redeploys. On a new account, create the D1 database first and put its id in `wrangler.jsonc`. The empty database seeds itself on the first request. Set the `ADMIN_PASSWORD` secret (and optionally `SESSION_SECRET`, any long random string) under Worker → Settings → Variables and Secrets.

## Ordering beyond WhatsApp (discussed, not built)
Orders already pass through `POST /api/orders` (server re-pricing), so that's the hook for sending them to a POS API (e.g. Foodics), a connector service (Deliverect/Otter/UrbanPiper) or a live orders screen + cloud printer. Without a human reading WhatsApp, add phone verification (OTP), online payment or a staff "accept" step against prank orders.
