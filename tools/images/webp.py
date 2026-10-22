# Export a transparent PNG as WebP at several widths.
# Usage: python3 tools/images/webp.py <in.png> <out-prefix> <spec>[,<spec>...] [quality=80]
#   spec = <width> -> <out-prefix>-<width>.webp,  or <width>:<suffix> -> <out-prefix><suffix>.webp
#   menu photos (site expects <id>.webp + <id>-sm.webp):  webp.py cut/big-mama.png public/img/menu/big-mama 560:,220:-sm
#   story tenders (tenders-640.webp + tenders-1000.webp):  webp.py cut/tenders-hd.png public/img/story/tenders 640,1000
import sys
from PIL import Image

src, prefix = sys.argv[1], sys.argv[2]
quality = int(sys.argv[4]) if len(sys.argv) > 4 else 80
im = Image.open(src).convert('RGBA')
for spec in sys.argv[3].split(','):
    w, _, suffix = spec.partition(':')
    out = f'{prefix}{suffix if ":" in spec else "-" + w}.webp'
    c = im.copy()
    c.thumbnail((int(w), int(w) * 3), Image.LANCZOS)
    c.save(out, 'WEBP', quality=quality, method=6)
    print(out, c.size)
