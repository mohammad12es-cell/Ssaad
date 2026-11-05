"""#3 Lut desert - hottest land surface measured."""
import math
import numpy as np
import cv2
from layers import global_layer, relief_layer, sentinel_layer
from overlay import draw_path, screen, title, country, RED, YEL, WHITE, CYAN
from shots import fly, fade, fa_num, small_circle
from engine import clamp, ease, W, H

FILE = "03-lut-desert"
MOOD = "epic"
NARRATION = [
    ["داغ‌ترین سطح زمین، در کجای جهان ثبت شده است؟", "پاسخ، در ایران است."],
    ["دشت لوت در جنوب شرق ایران، با تپه‌های شنی عظیم و کلوت‌های شگفت‌انگیزش شناخته می‌شود.",
     "این بیابان، یکی از گرم‌ترین و خشک‌ترین نقاط کرهٔ زمین است."],
    ["در سال دو هزار و پنج، ماهواره‌های ناسا دمای سطح زمین را در اینجا بیش از هفتاد درجهٔ سانتی‌گراد اندازه گرفتند.",
     "این، داغ‌ترین سطحی بود که تا آن زمان روی زمین ثبت شده بود."],
    ["امروز، دشت لوت در فهرست میراث جهانی یونسکو قرار دارد.",
     "و نخستین اثر طبیعی ایران است، که به این فهرست راه یافت."],
]
LUT = (30.3, 58.6)
KALUT = (30.45, 57.85)


def layers():
    w = sentinel_layer((56.4, 60.6, 28.4, 32.4), 0.2, months=(4, 5, 10, 11), maxcc=2)
    w.fade_km = 0.6
    c = sentinel_layer((57.55, 58.25, 30.15, 30.85), 0.025, months=(4, 5, 10, 11), maxcc=2)
    c.fade_km = 0.12
    return [global_layer(), relief_layer((44, 64, 24, 40), 1.2, strength=0.7), w, c]


def post(img, t, tl):
    """Red heat-map wash during the twist."""
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    a = fade(t, S[2] + 0.3, S[3] + 0.3, 0.8)
    if a <= 0:
        return img
    lum = img.mean(-1)
    pulse = 0.85 + 0.15 * math.sin(t * 5)
    heat = np.stack([np.clip(lum * 2.2, 0, 1), np.clip(lum * 1.4 - 0.35, 0, 1) * 0.8, lum * 0.15], -1)
    k = a * 0.7 * pulse
    return img * (1 - k) + heat * k


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, 25, 45, 15000, 0, 0),
        (S[1] - 0.4, 30.5, 55.0, 2600, 15, 0),
        (S[1] + 3.0, 29.6, 58.4, 420, 35, 0),
        (S[2] - 0.5, 30.15, 57.9, 70, 50, 0),
        (S[2] + 2.0, 30.3, 58.2, 260, 25, 0),
        (S[3] - 0.5, 30.2, 58.4, 380, 20, 0),
        (S[3] + 3.5, 30.25, 57.88, 45, 55, 20),
        (S[4], 30.35, 57.9, 30, 60, 30),
    ]
    cam = fly(keys, t)
    iran = country("Iran", minarea=1.0)

    def draw(cv, cam, t):
        title(cv, "داغ‌ترین سطح", t, 0.3, S[1] - 0.3, y=230, size=100, color=WHITE)
        title(cv, "کرهٔ زمین کجاست؟", t, 0.6, S[1] - 0.3, y=350, size=96, color=YEL)
        a = fade(t, 2.0, S[1] + 2.5)
        for r in iran:
            draw_path(cv, cam, r, RED, 5, a, 1.0, step=0.2, closed=True, progress=ease(clamp((t - 2.0) / 2.5)))
        x, y, v = screen(cam, 32.5, 54.0)
        if v: cv.text(x, y, "ایران", 80, WHITE, fade(t, 3.5, S[1] + 1.5))
        if S[1] < t < S[2]:
            x, y, v = screen(cam, *LUT)
            if v: cv.text(x, y - 40, "دشت لوت", 76, YEL, fade(t, S[1] + 1.2, S[1] + 3.6))
            x, y, v = screen(cam, *KALUT)
            if v: cv.text(x + 160, y - 380, "کلوت‌ها", 70, YEL, fade(t, S[1] + 4.0, S[2] - 0.2))
        if S[2] < t < S[3]:
            u = t - S[2]
            a = fade(t, S[2] + 0.6, S[3] - 0.1)
            # thermometer
            x0, y0, y1 = 540, 470, 1130
            lvl = ease(clamp((u - 0.5) / 2.8))
            cv.do.rounded_rectangle([x0 - 34, y0, x0 + 34, y1], radius=34, outline=(255, 255, 255, int(220 * a)), width=6)
            ytop = min(y1 - 16, y1 - (y1 - y0 - 30) * lvl)
            cv.do.rounded_rectangle([x0 - 20, ytop, x0 + 20, y1 - 14], radius=20, fill=(255, 40, 30, int(255 * a)))
            cv.dg.rounded_rectangle([x0 - 20, ytop, x0 + 20, y1 - 14], radius=20, fill=(int(255 * a), int(40 * a), 0))
            cv.dot(x0, y1 + 30, 58, RED, a, 1.0)
            temp = 70.7 * lvl
            cv.text(x0, y0 - 90, fa_num(f"{temp:.1f}") + "°", 130, YEL, a)
            cv.text(x0, y1 + 140, "سال " + fa_num(2005), 60, WHITE, a * clamp((u - 2.5) / 0.5))
        if t > S[3]:
            title(cv, "میراث جهانی یونسکو", t, S[3] + 0.8, S[4] + 5, y=260, size=88, color=YEL)
            title(cv, fa_num(2016), t, S[3] + 1.4, S[4] + 5, y=370, size=70, color=WHITE)

    return cam, draw
