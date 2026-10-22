# Remove backgrounds (product cut-outs with transparency), trimmed to the visible pixels.
# Usage: python3 tools/images/cutout.py in1.png out1.png [in2.png out2.png ...]
# Needs: pip install "rembg[cpu]" pillow   (model isnet-general-use downloads on first run)
import sys
from PIL import Image
from rembg import remove, new_session

session = new_session('isnet-general-use')
pairs = sys.argv[1:]
if not pairs or len(pairs) % 2:
    sys.exit(__doc__ or 'usage: cutout.py in.png out.png [in out ...]')
for src, dst in zip(pairs[0::2], pairs[1::2]):
    cut = remove(Image.open(src).convert('RGB'), session=session)
    box = cut.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    cut = cut.crop(box)
    cut.save(dst)
    print(dst, cut.size)
