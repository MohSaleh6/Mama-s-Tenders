# Turns a raster logo on a black background into the site's SVG files, one traced layer per brand colour.
# This is how public/img/logo.svg (round badge) and public/img/tagline.svg were made from the
# Mama's Tenders logo (900x900 JPG/PNG, black background, red + yellow + white artwork, script tagline below).
#
# Usage: python3 tools/brand/trace_logo.py <logo.png> <out-dir>
# Needs: pip install pillow numpy vtracer
#
# Tuning for another logo: COLOURS (how each layer is picked out of the image + its fill),
# MARK_Y (rows above it are the mark, rows below are the tagline) and BADGE (circle around the mark).
import re
import sys
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image, ImageFilter

MARK_Y = 790                     # tagline starts below this row (in source pixels)
BADGE = (492, 464, 395)          # badge circle: centre x, centre y, radius (source pixels)
SCALE = 2                        # trace at 2x for smoother curves
COLOURS = {
    # name: (test on r,g,b arrays, fill, region (x0, y0, x1, y1) or None for the whole mark)
    'red': (lambda r, g, b: (r > 140) & (g < 110) & (r - g > 80), '#e3262a', None),
    'yellow': (lambda r, g, b: (r > 140) & (g >= 110) & (b < 170) & ~((g < 110) & (r - g > 80)), '#f6b535', None),
    'white': (lambda r, g, b: (r > 200) & (g > 200) & (b > 190), '#f6f6f4', (200, 250, 750, 700)),
}


def trace(mask, tmp):
    size = (mask.shape[1] * SCALE, mask.shape[0] * SCALE)
    im = Image.fromarray((mask * 255).astype('uint8')).resize(size, Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(1.6)).point(lambda v: 255 if v > 127 else 0)
    Image.eval(im, lambda v: 255 - v).convert('RGB').save(tmp)  # vtracer traces the black shapes
    svg = tmp.with_suffix('.svg')
    vtracer.convert_image_to_svg_py(str(tmp), str(svg), colormode='binary', mode='spline', filter_speckle=10,
                                    corner_threshold=70, length_threshold=6.0, splice_threshold=45, path_precision=0)
    paths = re.findall(r'<path d="([^"]+)"[^>]*transform="translate\(([-\d.]+),([-\d.]+)\)"', svg.read_text())
    return ''.join(f'<path transform="translate({x} {y})" d="{re.sub(r" ([A-Z])", r"\1", d.strip())}"/>' for d, x, y in paths)


def main(src, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    px = np.array(Image.open(src).convert('RGB')).astype(int)
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    h, w = r.shape
    layers = []
    for name, (test, fill, region) in COLOURS.items():
        m = test(r, g, b)
        keep = np.zeros_like(m)
        x0, y0, x1, y1 = region or (0, 0, w, MARK_Y)
        keep[y0:y1, x0:x1] = m[y0:y1, x0:x1]
        layers.append(f'<g fill="{fill}">{trace(keep, out / f"layer-{name}.png")}</g>')
    cx, cy, rad = (v * SCALE for v in BADGE)
    (out / 'logo.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{cx - rad} {cy - rad} {rad * 2} {rad * 2}">'
        f'<circle cx="{cx}" cy="{cy}" r="{rad - 10}" fill="#0b0b0c"/>{"".join(layers)}</svg>')
    tag = COLOURS['yellow'][0](r, g, b)
    keep = np.zeros_like(tag)
    keep[MARK_Y:, :] = tag[MARK_Y:, :]
    ys, xs = np.where(keep)
    pad = 10
    box = ((xs.min() - pad) * SCALE, (ys.min() - pad) * SCALE, (xs.max() - xs.min() + pad * 2) * SCALE, (ys.max() - ys.min() + pad * 2) * SCALE)
    (out / 'tagline.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, box))}">'
        f'<g fill="{COLOURS["yellow"][1]}">{trace(keep, out / "layer-tagline.png")}</g></svg>')
    print('wrote', out / 'logo.svg', out / 'tagline.svg')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('usage: trace_logo.py <logo.png> <out-dir>')
    main(sys.argv[1], sys.argv[2])
