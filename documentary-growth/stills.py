import sys, os, numpy as np
sys.argv = ["render.py", sys.argv[1], sys.argv[2], sys.argv[3], "/dev/null", sys.argv[4]] + sys.argv[5:]
sys.path.insert(0, "/home/user/Ssaad/documentary-growth")
import render as R
from PIL import Image
R.GRAIN = [R.make_grain(k) for k in range(2)]
R.LAYERS = [R.text_layer(s["text"], s["big"], s["centre"]) for s in R.SUBS]
rng = np.random.default_rng(0)
ts = [float(x) for x in os.environ["TS"].split(",")]
ims = [Image.fromarray(R.frame(int(t * R.FPS), rng)) for t in ts]
w, h = ims[0].size; s = 360 / w
ims = [i.resize((360, int(h * s))) for i in ims]
cols = 6; rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 360, rows * ims[0].height), "gray")
for k, i in enumerate(ims): sheet.paste(i, ((k % cols) * 360, (k // cols) * i.height))
sheet.save(os.environ["OUTF"])
