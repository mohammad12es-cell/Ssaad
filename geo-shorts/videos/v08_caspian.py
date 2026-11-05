"""#8 Caspian Sea - actually the world's largest lake."""
import json, os
import numpy as np
from layers import global_layer, relief_layer, sentinel_layer
from overlay import draw_path, fill_geo, screen, title, country, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num, move_shape
from engine import clamp, ease, DATA

FILE = "08-caspian-sea"
MOOD = "epic"
NARRATION = [
    ["بزرگ‌ترین دریاچهٔ جهان را احتمالاً دیده‌اید، اما آن را دریا می‌نامید.", "نامش، دریای خزر است."],
    ["خزر هیچ راهی به اقیانوس‌های آزاد ندارد، و پنج کشور در کرانه‌های آن قرار گرفته‌اند.",
     "ایران، روسیه، قزاقستان، ترکمنستان و آذربایجان."],
    ["مساحت آن حدود سیصد و هفتاد هزار کیلومتر مربع است؛ بیشتر از مساحت کشور آلمان.",
     "و سطح آبش، حدود بیست و هشت متر پایین‌تر از سطح آب‌های آزاد است."],
    ["پس دریای خزر، در واقع بزرگ‌ترین دریاچهٔ کرهٔ زمین است.", "دریاچه‌ای که تقریباً به وسعت یک کشور است."],
]
CENTER = (41.9, 50.6)
LABELS = [("ایران", 36.6, 52.5), ("روسیه", 46.2, 45.2), ("قزاقستان", 46.0, 53.5), ("ترکمنستان", 39.6, 54.6),
          ("آذربایجان", 40.4, 47.6)]


def caspian():
    d = json.load(open(os.path.join(DATA, "ne_50m_coastline.geojson")))
    for f in d["features"]:
        g = f["geometry"]
        cs = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
        for c in cs:
            a = np.array(c)
            if a[:, 0].min() > 45 and a[:, 0].max() < 56 and a[:, 1].min() > 35 and a[:, 1].max() < 48 and len(a) > 50:
                return [tuple(p) for p in c]


CAS = caspian()


def layers():
    w = sentinel_layer((45.6, 56.2, 35.8, 47.8), 0.45, months=(6, 7, 8, 9), maxcc=3)
    w.fade_km = 1.6
    return [global_layer(), relief_layer((35, 65, 30, 52), 1.5, strength=0.7), w]


def post(img, t, tl):
    """Even out the Caspian water (Sentinel tiles from different dates differ)."""
    lum = img.mean(-1, keepdims=True)
    blue = img[..., 2:3] - img[..., 0:1]
    m = np.clip((0.2 - lum) / 0.08, 0, 1) * np.clip(blue * 8 + 0.6, 0, 1)
    deep = np.array([0.03, 0.12, 0.26], np.float32)
    return img * (1 - 0.6 * m) + deep * (0.6 * m)


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, 30, 30, 16000, 0, 0),
        (S[1] - 0.4, 38.5, 50.5, 3400, 20, 0),
        (S[2] - 0.5, 40.5, 50.6, 2300, 15, 0),
        (S[3] - 0.4, 41.0, 50.6, 2200, 10, 0),
        (S[3] + 3.0, 39.0, 50.8, 900, 40, 0),
        (S[4], 37.0, 51.0, 2600, 30, 0),
    ]
    cam = fly(keys, t)
    ger = country("Germany", minarea=1.0)

    def draw(cv, cam, t):
        title(cv, "بزرگ‌ترین دریاچهٔ", t, 0.3, S[1] - 0.3, y=230, size=96, color=WHITE)
        title(cv, "جهان کجاست؟", t, 0.6, S[1] - 0.3, y=345, size=104, color=YEL)
        a = fade(t, 1.8, S[4] + 5)
        draw_path(cv, cam, CAS, CYAN, 5, a, 1.2, step=0.1, closed=True, progress=ease(clamp((t - 1.8) / 2.5)))
        x, y, v = screen(cam, *CENTER)
        if v and t < S[1] + 0.5:
            cv.text(x, y, "دریای خزر", 76, YEL, fade(t, 3.0, S[1] + 0.3))
        if S[1] + 3.0 < t < S[2] + 0.3:
            for i, (n, la, lo) in enumerate(LABELS):
                x, y, v = screen(cam, la, lo)
                if v:
                    cv.text(x, y, n, 58, WHITE, fade(t, S[1] + 3.2 + i * 0.6, S[2] + 0.1), box=((10, 10, 20), 14, 140))
        if S[2] < t < S[3] + 0.3:
            u = t - S[2]
            a = fade(t, S[2] + 0.2, S[3] + 0.1)
            mv = ease(clamp((u - 0.5) / 2.0))
            for r in ger:
                rr = move_shape(r, (51.1, 10.4), CENTER, mv, spin=-25 * mv)
                fill_geo(cv, cam, rr, RED, 0.28 * a, step=0)
                draw_path(cv, cam, rr, RED, 4, a, 1.0, step=0, closed=True)
            if u > 0.5:
                gl = move_shape([(10.4, 51.1)], (51.1, 10.4), CENTER, mv)[0]
                x, y, v = screen(cam, gl[1], gl[0])
                if v: cv.text(x, y, "آلمان", 60, WHITE, a)
            cv.text(540, 470, "≈ " + fa_num("371,000").replace(",", "٬") + " کیلومتر مربع", 60, YEL,
                    fade(t, S[2] + 2.0, S[3] + 0.1), box=((10, 10, 20), 22, 170))
            if u > (S[3] - S[2]) * 0.55:
                cv.text(540, 600, fa_num(28) + " متر پایین‌تر از سطح دریا", 64, CYAN,
                        fade(t, S[2] + (S[3] - S[2]) * 0.55, S[3] + 0.1), box=((5, 15, 30), 22, 170))
        if t > S[3]:
            title(cv, "بزرگ‌ترین دریاچهٔ", t, S[3] + 1.0, S[4] + 5, y=250, size=92, color=WHITE)
            title(cv, "کرهٔ زمین", t, S[3] + 1.3, S[4] + 5, y=365, size=110, color=YEL)

    return cam, draw
