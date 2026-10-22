#!/usr/bin/env bash
# Regression checks against a running dev server (npm run dev, default http://127.0.0.1:8787).
# Usage: tools/test.sh            -> core checks (fast)
#        tools/test.sh all        -> also screenshots of every section and the scroll story
# Screenshots land in tools/out/ (git-ignored). Needs Playwright + Chromium:
#   cloud sandbox: preinstalled (NODE_PATH below);  elsewhere: npm i -D playwright && npx playwright install chromium
set -u
cd "$(dirname "$0")/.."
[ -d /opt/node-tools/node_modules ] && export NODE_PATH=/opt/node-tools/node_modules
export BASE="${BASE:-http://127.0.0.1:8787}"
OUT=tools/out; mkdir -p "$OUT"
curl -s -o /dev/null "$BASE/robots.txt" || { echo "No server at $BASE — run: npm run dev"; exit 1; }
fail=0
run() { echo "── $1"; shift; "$@" || { echo "   FAILED"; fail=1; }; }
run "i18n keys (every t('key') exists in ar + en)"   node tools/tests/i18n-keys.mjs
run "order flow: sheet → cart → checkout → WhatsApp" node tools/tests/flow.cjs "$OUT"
run "screen fit: hero/meal-box overlaps on 8 sizes"     node tools/tests/fit.cjs "$OUT"
run "item sheet photo stays inside + card reveal"    node tools/tests/sheet.cjs "$OUT"
run "no sideways overflow on phones"                 node tools/tests/ovf.cjs "$OUT"
run "layout shift while loading (expect ~0)"         node tools/tests/cls.cjs
run "no 404s / failed requests"                      node tools/tests/img404.cjs
if [ "${1:-}" = all ]; then
  run "section screenshots (mobile + desktop)"       node tools/tests/shots.cjs "$OUT"
  run "scroll-story frames"                          node tools/tests/story.cjs "$OUT"
  run "header lean + branch photos"                  node tools/tests/lean.cjs "$OUT"
fi
echo; [ $fail = 0 ] && echo "All checks ran. Read the output above: ISSUES / pageerror / missing lines mean something to fix." || echo "Some checks FAILED (see above)."
exit $fail
