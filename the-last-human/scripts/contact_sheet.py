#!/usr/bin/env python3
"""Season preview contact sheet: 10 episodes x 6 frames, labelled with episode titles and timecodes."""
import subprocess, os, json
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TITLES = ["NO SIGNAL", "THE GLITCH", "FORBIDDEN MEMORY", "THE HUNTER", "DR. VEX", "THE TRUTH", "NOT HUMAN", "THE ORIGINAL", "SYSTEM FAILURE", "THE LAST HUMAN"]
TIMES = [1.5, 6.5, 11.5, 17.5, 23.5, 28.5]
TW, TH = 216, 384; PAD = 10; LAB = 64
font = ImageFont.truetype(os.path.join(ROOT, "assets/fonts/Vazirmatn-Bold.ttf"), 22); small = ImageFont.truetype(os.path.join(ROOT, "assets/fonts/Vazirmatn-Medium.ttf"), 15)
W = PAD + len(TIMES) * (TW + PAD); H = 90 + 10 * (TH + LAB + PAD)
sheet = Image.new("RGB", (W, H), "#07070d"); d = ImageDraw.Draw(sheet)
d.text((PAD, 24), "THE LAST HUMAN — SEASON 01 — PREVIEW CONTACT SHEET (Main version: English audio + Persian subtitles)", fill="#9fe9ff", font=font)
for e in range(10):
    f = os.path.join(ROOT, f"output/episodes/main_fa/TLH_S01E{e+1:02d}_FA.mp4"); y = 90 + e * (TH + LAB + PAD)
    d.text((PAD, y + 8), f"EP{e+1:02d} — {TITLES[e]}", fill="#ffffff", font=font)
    for j, t in enumerate(TIMES):
        r = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", str(t), "-i", f, "-frames:v", "1", "-vf", f"scale={TW}:{TH}", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
        x = PAD + j * (TW + PAD)
        if r.stdout:
            import io; sheet.paste(Image.open(io.BytesIO(r.stdout)), (x, y + LAB - 22))
        d.text((x + 4, y + LAB - 20), f"{t:.1f}s", fill="#9fe9ff", font=small)
out = os.path.join(ROOT, "output/previews/TLH_S01_contact_sheet.jpg"); sheet.save(out, quality=90); print("contact sheet", out, sheet.size)
