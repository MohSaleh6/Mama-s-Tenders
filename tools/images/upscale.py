# 4x AI upscale of one region of a (low-res) photo, e.g. a burger cut from a PDF menu page. CPU only, tiled.
# Model: Real-ESRGAN x4 ONNX from Hugging Face (GitHub release downloads are blocked in the cloud sandbox):
#   curl -L -o tools/out/esrgan.onnx https://huggingface.co/imgdesignart/realesrgan-x4-onnx/resolve/main/onnx/model.onnx
# Usage: python3 tools/images/upscale.py <model.onnx> <page.jpg> <out.png> <left,top,right,bottom>
# Needs: pip install onnxruntime numpy pillow
import sys, numpy as np, onnxruntime as ort
from PIL import Image
sess = ort.InferenceSession(sys.argv[1], providers=['CPUExecutionProvider'])
src = Image.open(sys.argv[2]).convert('RGB')
box = tuple(int(v) for v in sys.argv[4].split(','))
img = np.asarray(src.crop(box), dtype=np.float32) / 255.0
H, W, _ = img.shape
T, O, S = 64, 8, 4                      # tile, overlap, scale
step = T - 2 * O
ph, pw = (-(H) % step) + 2 * O, (-(W) % step) + 2 * O
pad = np.pad(img, ((O, ph - O), (O, pw - O), (0, 0)), mode='reflect')
out = np.zeros(((H + ph - 2 * O) * S, (W + pw - 2 * O) * S, 3), np.float32)
tiles = []
for y in range(0, pad.shape[0] - T + 1, step):
    for x in range(0, pad.shape[1] - T + 1, step):
        tiles.append((y, x))
batch = 16
for i in range(0, len(tiles), batch):
    chunk = tiles[i:i + batch]
    inp = np.stack([pad[y:y + T, x:x + T].transpose(2, 0, 1) for y, x in chunk])
    res = []
    for t in inp:  # model has fixed batch 1
        res.append(sess.run(None, {'input.1': t[None]})[0][0])
    for (y, x), r in zip(chunk, res):
        r = r.transpose(1, 2, 0)[O * S:(T - O) * S, O * S:(T - O) * S]
        out[y * S:y * S + step * S, x * S:x * S + step * S] = r
out = out[:H * S, :W * S]
Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8)).save(sys.argv[3])
print('upscaled', W, H, '->', W * S, H * S, 'tiles', len(tiles))
