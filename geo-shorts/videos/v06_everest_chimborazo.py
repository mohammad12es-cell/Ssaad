"""#6 Is Everest really the highest? (Chimborazo is farthest from Earth's centre)."""
import math
import numpy as np
from layers import global_layer, relief_layer, sentinel_layer
from overlay import draw_path, screen, title, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num
from engine import clamp, ease, W, H

FILE = "06-everest-vs-chimborazo"
MOOD = "epic"
NARRATION = [
    ["بلندترین کوه جهان کدام است؟", "شاید پاسخ، آن‌قدرها هم ساده نباشد."],
    ["قلهٔ اورست با حدود هشت هزار و هشتصد و چهل و نه متر، بلندترین قله از سطح دریاست.",
     "اما زمین یک کرهٔ کامل نیست، و در استوا برآمده‌تر است."],
    ["قلهٔ چیمبورازو در اکوادور، تقریباً روی استوا قرار دارد.",
     "به همین خاطر، قلهٔ آن دورترین نقطهٔ سطح زمین از مرکز زمین است؛ حدود دو کیلومتر دورتر از اورست."],
    ["پس اورست بلندترین قله از سطح دریاست، اما چیمبورازو به فضا نزدیک‌تر است.",
     "پاسخ درست، به این بستگی دارد که از کجا اندازه بگیریم."],
]
EV = (27.988, 86.925)
CH = (-1.469, -78.817)
EQ = [(lo, 0.0) for lo in range(-180, 181, 2)]


def layers():
    ew = sentinel_layer((85.6, 88.4, 26.9, 29.0), 0.15, months=(10, 11, 12, 1), maxcc=3)
    ew.fade_km = 0.5
    ec = sentinel_layer((86.72, 87.12, 27.85, 28.12), 0.02, months=(10, 11, 12, 1), maxcc=5)
    ec.fade_km = 0.1
    cw = sentinel_layer((-79.6, -78.0, -2.3, -0.7), 0.12, months=tuple(range(1, 13)), maxcc=15)
    cw.fade_km = 0.4
    cc = sentinel_layer((-78.98, -78.66, -1.62, -1.32), 0.02, months=tuple(range(1, 13)), maxcc=15)
    cc.fade_km = 0.1
    return [global_layer(), relief_layer((75, 98, 22, 36), 1.2, strength=0.8, exag=1.2),
            relief_layer((-85, -70, -8, 6), 1.2, strength=0.8, exag=1.2), ew, ec, cw, cc]


def post(img, t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    a = fade(t, S[3] + 0.2, S[4] + 5, 0.8)
    return img * (1 - 0.55 * a) if a > 0 else img


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, 20, 80, 16000, 0, 0),
        (S[1] - 0.4, 26.0, 86.9, 1400, 30, 0),
        (S[1] + 3.6, 27.80, 86.93, 30, 55, 0),
        (S[1] + 5.0, 27.85, 86.93, 34, 50, 10),
        (S[1] + 6.8, 27.6, 86.5, 1200, 20, 0),
        (S[2] - 0.6, 8, 60, 16000, 0, 0),
        (S[2] + 0.2, 6, 50, 16000, 0, 0),
        (S[2] + 4.0, -1.62, -78.82, 45, 35, 0),
        (S[3] - 0.3, -1.56, -78.82, 26, 40, 10),
        (S[3] + 0.8, -1.0, -78.0, 3000, 10, 0),
        (S[4], 0.0, -40.0, 30000, 0, 0),
    ]
    cam = fly(keys, t)

    def draw(cv, cam, t):
        title(cv, "بلندترین کوه", t, 0.3, S[1] - 0.3, y=230, size=100, color=WHITE)
        title(cv, "جهان کدام است؟", t, 0.6, S[1] - 0.3, y=350, size=100, color=YEL)
        if t < S[2]:
            x, y, v = screen(cam, *EV)
            if v and t > S[1] + 2.0:
                a = fade(t, S[1] + 2.0, S[1] + 5.2)
                cv.dot(x, y, 9, RED, a)
                cv.text(x, y - 130, "اورست", 76, YEL, a)
                cv.text(x, y - 50, fa_num("8,849").replace(",", "٬") + " متر", 56, WHITE, a)
        if S[2] - 3.0 < t < S[3] + 0.5:
            a = fade(t, S[2] - 2.6, S[3] + 0.4)
            draw_path(cv, cam, EQ, YEL, 4, a, 1.0, step=0)
            x, y, v = screen(cam, 0.0, 50.0)
            if v and t < S[2] + 1.0: cv.text(x, y + 60, "استوا", 60, YEL, a)
        if S[2] + 1.5 < t < S[3] + 0.5:
            x, y, v = screen(cam, *CH)
            if v:
                a = fade(t, S[2] + 2.5, S[3] + 0.3)
                cv.dot(x, y, 9, RED, a)
                cv.text(x, y - 130, "چیمبورازو", 72, YEL, a)
                cv.text(x, y - 50, "اکوادور", 52, WHITE, a)
        if t > S[3] + 0.2:
            # schematic cross-section (flattening exaggerated for clarity)
            a = fade(t, S[3] + 0.3, S[4] + 5, 0.6)
            cx, cy = 540, 980
            rx, ry = 380, 330
            pts = [(cx + rx * math.cos(q), cy + ry * math.sin(q)) for q in np.linspace(0, 2 * math.pi, 200)]
            cv.line(pts, CYAN, 4, a, 0.7)
            cv.line([(cx - rx - 40, cy), (cx + rx + 40, cy)], YEL, 3, a * 0.7, 0.4)
            cv.text(cx - rx + 10, cy + 40, "استوا", 40, YEL, a)
            cv.dot(cx, cy, 10, WHITE, a)
            cv.text(cx, cy + 50, "مرکز زمین", 40, WHITE, a)
            u = ease(clamp((t - S[3] - 0.8) / 1.5))
            for lat, col, name, val, dy in [(28.0, BLUE, "اورست", "۶۳۸۲٫۳", -1), (-1.5, RED, "چیمبورازو", "۶۳۸۴٫۴", 1)]:
                q = math.radians(-lat) if dy < 0 else math.radians(-lat)
                ex, ey = cx + rx * math.cos(q) * 1.07, cy + ry * math.sin(q) * 1.07
                px, py = cx + (ex - cx) * u, cy + (ey - cy) * u
                cv.line([(cx, cy), (px, py)], col, 7, a, 1.2)
                if u > 0.95:
                    cv.dot(ex, ey, 12, col, a)
                    lx = ex - 10
                    ly = ey - 90 if dy < 0 else ey + 75
                    cv.text(lx - 120, ly, name, 50, col, a)
                    cv.text(lx - 120, ly + 55 * (1 if dy > 0 else -1) * -1 + (60 if dy > 0 else 0), val + " کیلومتر", 42, WHITE, a)
            title(cv, "به فضا نزدیک‌تر", t, S[3] + 2.6, S[4] + 5, y=320, size=96, color=YEL)
            title(cv, "+" + fa_num(2) + " کیلومتر", t, S[3] + 3.0, S[4] + 5, y=430, size=70, color=RED)

    return cam, draw
