"""Animated 'rotate your phone' card, 1080x1920 portrait, rendered with PIL (Persian shaped via raqm).
usage: python3 rotate_prompt.py <font_dir> <duration_s> <out.mp4>
"""
import sys, math, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FD, DUR, OUT = sys.argv[1], float(sys.argv[2]), sys.argv[3]
W, H, FPS = 1080, 1920, 30
fa = ImageFont.truetype(f"{FD}/Vazirmatn-Bold.ttf", 78, layout_engine=ImageFont.Layout.RAQM)
fb = ImageFont.truetype(f"{FD}/Vazirmatn-Regular.ttf", 34)
FA_TXT, EN_TXT = "گوشی رو بچرخون", "R O T A T E   Y O U R   P H O N E"

def ease(x): x = min(max(x, 0), 1); return x * x * (3 - 2 * x)

# background: deep vignette gradient
yy, xx = np.mgrid[0:H, 0:W]
r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.43) / H) ** 2)
bg = np.clip(28 - r * 50, 6, 28)
BG = Image.fromarray(np.stack([bg * 0.9, bg * 0.95, bg * 1.1], -1).astype(np.uint8))

def phone(angle, alpha):
    s = 3  # supersample
    pw, ph = 250 * s, 470 * s
    im = Image.new("RGBA", (900 * s // 1, 900 * s // 1), (0, 0, 0, 0))
    d = ImageDraw.Draw(im); cx, cy = im.width // 2, im.height // 2
    box = [cx - pw // 2, cy - ph // 2, cx + pw // 2, cy + ph // 2]
    d.rounded_rectangle(box, radius=44 * s, outline=(255, 255, 255, alpha), width=11 * s)
    # screen + a tiny landscape "film" glyph that becomes upright when turned
    d.rounded_rectangle([cx - pw // 2 + 26 * s, cy - ph // 2 + 60 * s, cx + pw // 2 - 26 * s, cy + ph // 2 - 60 * s],
                        radius=10 * s, fill=(255, 196, 120, int(alpha * 0.18)))
    d.rounded_rectangle([cx - 28 * s, cy - ph // 2 + 24 * s, cx + 28 * s, cy - ph // 2 + 34 * s], radius=5 * s, fill=(255, 255, 255, alpha))
    d.ellipse([cx - 14 * s, cy + ph // 2 - 44 * s, cx + 14 * s, cy + ph // 2 - 16 * s], outline=(255, 255, 255, alpha), width=5 * s)
    im = im.rotate(angle, resample=Image.BICUBIC)  # positive = counter-clockwise
    return im.resize((900, 900), Image.LANCZOS)

def arrow(progress, alpha):
    s = 3; im = Image.new("RGBA", (900 * s, 900 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = im.width // 2; R = 330 * s
    # counter-clockwise arc over the top-left: from -60deg to -150deg (PIL angles are clockwise from +x)
    a0, a1 = -55, -55 - 100 * progress
    if progress > 0.02:
        d.arc([c - R, c - R, c + R, c + R], start=a1, end=a0, fill=(255, 196, 120, alpha), width=9 * s)
        th = math.radians(a1); tip = (c + R * math.cos(th), c + R * math.sin(th))
        tang = th - math.pi / 2  # direction of travel (counter-clockwise)
        L = 34 * s
        p1 = (tip[0] + L * math.cos(tang), tip[1] + L * math.sin(tang))
        n = th
        p2 = (tip[0] - L * 0.6 * math.cos(tang) + L * 0.8 * math.cos(n), tip[1] - L * 0.6 * math.sin(tang) + L * 0.8 * math.sin(n))
        p3 = (tip[0] - L * 0.6 * math.cos(tang) - L * 0.8 * math.cos(n), tip[1] - L * 0.6 * math.sin(tang) - L * 0.8 * math.sin(n))
        d.polygon([p1, p2, p3], fill=(255, 196, 120, alpha))
    return im.resize((900, 900), Image.LANCZOS)

def text_layer(alpha):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    tw = d.textlength(FA_TXT, font=fa, direction="rtl")
    d.text(((W - tw) / 2, 1320), FA_TXT, font=fa, fill=(255, 255, 255, alpha), direction="rtl")
    tw2 = d.textlength(EN_TXT, font=fb)
    d.text(((W - tw2) / 2, 1450), EN_TXT, font=fb, fill=(200, 200, 205, int(alpha * 0.8)))
    return im

n = int(round(DUR * FPS))
p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                      "-i", "-", "-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuv420p", OUT], stdin=subprocess.PIPE)
cycle = 1.9
for f in range(n):
    t = f / FPS
    fade = ease(t / 0.45) * ease((DUR - t) / 0.35)
    tc = (t - 0.35) % cycle if t > 0.35 else 0
    rot = ease((tc - 0.15) / 0.85)                       # turn
    back = ease((tc - 1.55) / 0.3)                      # quick fade back for the loop
    a_icon = int(255 * fade * (1 - 0.85 * back))
    frame = BG.copy().convert("RGBA")
    ph = phone(90 * rot, a_icon)
    ar = arrow(rot, int(230 * fade * (1 - back)))
    frame.alpha_composite(ar, ((W - 900) // 2, 760 - 450))
    frame.alpha_composite(ph, ((W - 900) // 2, 760 - 450))
    frame.alpha_composite(text_layer(int(255 * fade)))
    p.stdin.write(frame.convert("RGB").tobytes())
p.stdin.close(); p.wait()
print("prompt", n, "frames")
