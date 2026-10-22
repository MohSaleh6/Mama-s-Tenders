# Builds a "sign" logo as pure SVG paths: big line / small middle line between two short bars / big line,
# framed by capsule bars top and bottom (the MEAT AND CHEEZZ storefront sign). Text becomes paths, so no font ships.
# Usage: python3 tools/brand/logo.py <font.ttf> <out-dir> [TOP] [MIDDLE] [BOTTOM]
#   e.g. python3 tools/brand/logo.py Montserrat-Black.ttf tools/out/logo MEAT AND CHEEZZ
# Writes logo.svg, logo-symbol.txt (inline <symbol id="logo"> coloured by --logo-fg/--logo-bar),
# badge.svg / maskable.svg / favicon.svg (square app icons). Colours: white text, #ffd400 bars.
import uharfbuzz as hb, json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONT = sys.argv[1]; OUT = sys.argv[2]
TOP, MID, BOT = (sys.argv[3:6] + ['MEAT', 'AND', 'CHEEZZ'][len(sys.argv[3:6]):])
import os; os.makedirs(OUT, exist_ok=True)
tt = TTFont(FONT); gs = tt.getGlyphSet(); upm = tt['head'].unitsPerEm
blob = hb.Blob.from_file_path(FONT); face = hb.Face(blob); font = hb.Font(face)

def shape(text, track=0):
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True})
    names = [tt.getGlyphOrder()[i.codepoint] for i in buf.glyph_infos]
    out, x = [], 0
    for n, p in zip(names, buf.glyph_positions):
        out.append((n, x + p.x_offset)); x += p.x_advance + track
    return out, x - track

def ink_bounds(glyphs):
    xs0, xs1, ys0, ys1 = [], [], [], []
    for n, x in glyphs:
        bp = BoundsPen(gs); gs[n].draw(bp)
        if bp.bounds: a, b, c, d = bp.bounds; xs0.append(a + x); xs1.append(c + x); ys0.append(b); ys1.append(d)
    return min(xs0), max(xs1), min(ys0), max(ys1)

def path_for(text, left, right, top, track=-20, height=None):
    """Fit text horizontally into [left,right]; top = y of cap top. Returns (d, bottom_y, (x0,x1))."""
    g, _ = shape(text, track)
    x0, x1, y0, y1 = ink_bounds(g)
    s = (right - left) / (x1 - x0) if height is None else height / (y1 - y0)
    ox = left - x0 * s if height is None else (left + right) / 2 - (x0 + x1) / 2 * s
    oy = top + y1 * s
    d = []
    for n, x in g:
        sp = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
        tp = TransformPen(sp, (s, 0, 0, -s, ox + x * s, oy)); gs[n].draw(tp)
        d.append(sp.getCommands())
    return ''.join(d), top + (y1 - y0) * s, (ox + x0 * s, ox + x1 * s)

W = 400; P = 5            # half stroke padding
SW = 7                    # bar stroke width
BAR = 32                  # big bar height
y = P
bars = [(P, y, W - 2 * P, BAR)]
y += BAR + 11
meat, y, _ = path_for(TOP, 12, W - 12, y)
y += 11
ROW = 28
andd, _, (ax0, ax1) = path_for(MID, 0, W, y + 1.5, track=-10, height=ROW - 3)
bars += [(P, y, ax0 - 11 - P, ROW), (ax1 + 11, y, W - P - (ax1 + 11), ROW)]
y += ROW + 11
chz, y, _ = path_for(BOT, 10, W - 10, y)
y += 11
bars.append((P, y, W - 2 * P, BAR))
H = y + BAR + P
VB = f'0 0 {W} {H:.0f}'
rects = ''.join(f'<rect x="{x:.1f}" y="{yy:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{h/2:.1f}"/>' for x, yy, w, h in bars)
letters = meat + andd + chz

def svg(fg='#fff', bar='#ffd400', extra=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB}"{extra}>'
            f'<g fill="none" stroke="{bar}" stroke-width="{SW}">{rects}</g><path fill="{fg}" d="{letters}"/></svg>')

open(f'{OUT}/logo.svg', 'w').write(svg())
# inline sprite symbol: colours come from CSS custom properties on the <svg> that uses it
sym = (f'<symbol id="logo" viewBox="{VB}"><g fill="none" style="stroke:var(--logo-bar,#ffd400)" stroke-width="{SW}">{rects}</g>'
       f'<path style="fill:var(--logo-fg,#fff)" d="{letters}"/></symbol>')
open(f'{OUT}/logo-symbol.txt', 'w').write(sym)
# square badge (favicon / app icons): black tile, logo skewed like the social avatar
def make_badge(k):
  s = k * 512 / W; h = H * s
  return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="{{rx}}" fill="#0b0b0c"/>'
         f'<g transform="translate(256 256) skewY(-10) translate({-W*s/2:.1f} {-h/2:.1f}) scale({s:.4f})">'
         f'<g fill="none" stroke="#ffd400" stroke-width="{SW}">{rects}</g><path fill="#fff" d="{letters}"/></g></svg>')
badge = make_badge(0.74)
open(f'{OUT}/maskable.svg', 'w').write(make_badge(0.56).replace('{rx}', '0'))
open(f'{OUT}/badge.svg', 'w').write(badge.replace('{rx}', '0'))
open(f'{OUT}/favicon.svg', 'w').write(badge.replace('{rx}', '112'))
print(json.dumps({'viewBox': VB, 'ratio': round(W / H, 4), 'bytes': len(svg())}))
