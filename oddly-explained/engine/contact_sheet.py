#!/usr/bin/env python3
"""Contact sheet for QC: contact_sheet.py FRAMES_DIR OUT.jpg [--fps 30] [--cols 6] [--width 1800] [--frames 0,30,...]
Labels each tile with frame number and timecode."""
import sys, os, glob, argparse
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('out'); ap.add_argument('--fps', type=float, default=30)
ap.add_argument('--cols', type=int, default=6); ap.add_argument('--width', type=int, default=1800); ap.add_argument('--frames', default=None)
a = ap.parse_args()
files = sorted(glob.glob(os.path.join(a.dir, 'f*.png')))
if a.frames: want = set(int(x) for x in a.frames.split(',')); files = [f for f in files if int(os.path.basename(f)[1:5]) in want]
if not files: sys.exit('no frames')
im0 = Image.open(files[0]); tw = a.width // a.cols; th = int(tw * im0.height / im0.width)
rows = (len(files) + a.cols - 1) // a.cols
sheet = Image.new('RGB', (tw * a.cols, th * rows), (20, 20, 20)); d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', max(11, tw // 14))
except Exception: font = ImageFont.load_default()
for k, f in enumerate(files):
    n = int(os.path.basename(f)[1:5]); im = Image.open(f).convert('RGBA')
    bg = Image.new('RGBA', im.size, (40, 40, 40, 255)); im = Image.alpha_composite(bg, im).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (k % a.cols) * tw, (k // a.cols) * th; sheet.paste(im, (x, y))
    d.text((x + 6, y + 4), f'{n} | {n / a.fps:05.2f}s', fill=(255, 220, 120), font=font)
sheet.save(a.out, quality=88); print(a.out, sheet.size)
