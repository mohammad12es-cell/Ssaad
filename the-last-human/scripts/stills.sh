#!/usr/bin/env bash
# Render key frames of an episode at half resolution and tile them into a review sheet.
# usage: scripts/stills.sh Ep01 "30 120 240 ..." out_dir
set -e
cd "$(dirname "$0")/.."
COMP=$1; FRAMES=$2; OUT=${3:-output/previews/$COMP}; mkdir -p "$OUT"
npx remotion bundle src/index.ts --out-dir /tmp/claude-0/tlh-bundle >/dev/null 2>&1 || true
for f in $FRAMES; do npx remotion still /tmp/claude-0/tlh-bundle "$COMP" "$OUT/f$(printf %04d $f).png" --frame=$f --scale=0.5 2>&1 | grep -iE "^error|Error:" || true; done
python3 - "$OUT" <<'PY'
import sys,glob
from PIL import Image, ImageDraw
fs=sorted(glob.glob(sys.argv[1]+'/f*.png')); ims=[Image.open(f).resize((270,480)) for f in fs]
cols=min(5,len(ims)); rows=(len(ims)+cols-1)//cols; sheet=Image.new('RGB',(cols*270,rows*500),'#111')
d=ImageDraw.Draw(sheet)
for i,(f,im) in enumerate(zip(fs,ims)):
    x,y=(i%cols)*270,(i//cols)*500; sheet.paste(im,(x,y)); fr=int(f.split('/f')[-1][:4]); d.text((x+6,y+484),f"{fr/30:.1f}s",fill='#ccc')
sheet.save(sys.argv[1]+'/sheet.png'); print('sheet', sheet.size)
PY
