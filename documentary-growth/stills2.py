"""Contact sheet of v2 frames: python3 stills2.py VO MATTES FONTS HEIGHT 't1,t2,...' out.jpg"""
import sys, os, numpy as np
ts, outf = sys.argv[5], sys.argv[6]
sys.argv = ["render2.py", sys.argv[1], sys.argv[2], sys.argv[3], "/dev/null", sys.argv[4]]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render2 as R
from PIL import Image
R.init(0)
rng = np.random.default_rng(0)
ims = [Image.fromarray(R.frame(int(round(float(t) * R.FPS)), rng)) for t in ts.split(",")]
w, h = ims[0].size; tw = 300; th = int(h * tw / w)
cols = 8; rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), "gray")
for k, i in enumerate(ims):
    sheet.paste(i.resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
sheet.save(outf)
