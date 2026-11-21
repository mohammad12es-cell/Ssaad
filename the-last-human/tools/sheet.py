#!/usr/bin/env python3
"""Contact sheet of rendered frames. usage: sheet.py DIR OUT.png [cols] [frame,frame,...]"""
import sys, os, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
files = sorted(glob.glob(os.path.join(d, "f*.png")))
if len(sys.argv) > 4: want = {int(x) for x in sys.argv[4].split(",")}; files = [f for f in files if int(os.path.basename(f)[1:5]) in want]
tw, th = 270, 480
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), "black")
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((tw, th))
    ImageDraw.Draw(im).text((6, 6), os.path.basename(f)[1:5], fill=(255, 255, 0))
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
sheet.save(out)
