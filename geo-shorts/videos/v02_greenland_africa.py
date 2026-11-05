"""#2 The big map lie - Greenland vs Africa (Mercator)."""
import math
import numpy as np
from layers import global_layer
from overlay import draw_path, fill_geo, screen, title, country, feature, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num, move_shape, small_circle
from engine import clamp, ease, MercCam, Cam, W, H, lerp

FILE = "02-greenland-vs-africa"
MOOD = "mystery"
NARRATION = [
    ["گرینلند روی نقشه، تقریباً هم‌اندازهٔ آفریقا به نظر می‌رسد.", "اما این تصویر، یک خطای بزرگ است."],
    ["بیشتر نقشه‌های جهان با روشی به نام مرکاتور کشیده شده‌اند.",
     "در این روش، هرچه به قطب‌ها نزدیک‌تر شویم، خشکی‌ها بزرگ‌تر دیده می‌شوند."],
    ["در واقع، مساحت آفریقا حدود چهارده برابر گرینلند است.", "گرینلند حتی از الجزایر هم کوچک‌تر است!"],
    ["نقشه‌ای که هر روز می‌بینیم، شکل‌ها را درست نشان می‌دهد، اما اندازه‌ها را نه.",
     "جهان واقعی، با آنچه فکر می‌کنیم متفاوت است."],
]
GC = (72.0, -40.0)
AFC = (2.0, 19.0)
ALG = (28.2, 2.6)


def layers():
    return [global_layer()]


def post(img, t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    f = clamp(1 - abs(t - S[3]) / 0.25)  # flash on the cut to the globe
    return img * (1 - f) + f if f > 0 else img


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    gr = [r for r in country("Greenland", minarea=1.0)]
    afr = list(feature("ne_50m_admin_0_countries", "CONTINENT", "Africa", 0.3))
    alg = country("Algeria", minarea=1.0)
    if t < S[3]:
        u = ease(clamp(t / 6.0))
        cam = MercCam(lerp(-30, -15, u), lerp(52, 40, u), lerp(120, 150, u))
        if t > S[2]:
            v = ease(clamp((t - S[2]) / 2.5))
            cam = MercCam(lerp(-15, 5, v), lerp(40, 20, v), lerp(150, 110, v))
    else:
        u = ease(clamp((t - S[3]) / (S[4] - S[3])))
        cam = Cam(lerp(38, 32, u), lerp(-8, 0, u), lerp(19000, 23000, u), 0, 0, 40)

    def draw(cv, cam, t):
        title(cv, "نقشه‌ها", t, 0.3, S[1] - 0.3, y=230, size=100, color=WHITE)
        title(cv, "دروغ می‌گویند؟", t, 0.6, S[1] - 0.3, y=345, size=100, color=YEL)
        a = fade(t, 0.8, S[4] + 5)
        for r in afr:
            fill_geo(cv, cam, r, RED, 0.30 * a, step=0)
        for r in afr:
            draw_path(cv, cam, r, RED, 2, a * 0.8, 0.6, step=0, closed=True)
        if t < S[2] + 0.4 or t > S[3]:
            for r in gr:
                fill_geo(cv, cam, r, CYAN, 0.30 * a, step=0)
                draw_path(cv, cam, r, CYAN, 4, a, 1.0, step=0, closed=True)
        if t < S[2]:
            x, y, v = screen(cam, *GC)
            if v: cv.text(x, y, "گرینلند", 72, WHITE, fade(t, 1.0, S[2] - 0.2))
            x, y, v = screen(cam, *AFC)
            if v: cv.text(x, y, "آفریقا", 80, WHITE, fade(t, 1.0, S[2] - 0.2))
        if S[1] < t < S[2]:
            u = t - S[1]
            a2 = fade(t, S[1] + 0.3, S[2] - 0.1)
            for la in range(-60, 85, 15):
                draw_path(cv, cam, [(-200, la), (200, la)], (200, 210, 255), 2, a2 * 0.5, 0.2, step=0)
            for i, la in enumerate([0, 30, 50, 65, 75]):
                b = a2 * clamp((u - 1.5 - i * 0.6) / 0.5)
                draw_path(cv, cam, small_circle(la, -32, 650), YEL, 4, b, 1.0, step=0)
            cv.text(540, 470, "نقشهٔ مرکاتور", 72, YEL, fade(t, S[1] + 0.4, S[2] - 0.2), box=((10, 10, 25), 22, 170))
        if S[2] < t < S[3]:
            u = t - S[2]
            mv = ease(clamp((u - 0.4) / 2.2))
            mv2 = ease(clamp((u - (S[3] - S[2]) * 0.55) / 1.6))
            for r in gr:
                rr = move_shape(r, GC, AFC, mv)
                if mv2 > 0:
                    rr = move_shape(rr, AFC, ALG, mv2)
                fill_geo(cv, cam, rr, CYAN, 0.55, step=0)
                draw_path(cv, cam, rr, CYAN, 4, 1.0, 1.2, step=0, closed=True)
            if mv > 0.95 and mv2 < 0.05:
                cv.text(540, 470, "آفریقا " + fa_num(14) + " برابر گرینلند", 66, YEL,
                        fade(t, S[2] + 2.5, S[2] + (S[3] - S[2]) * 0.55), box=((10, 10, 25), 22, 170))
            if mv2 > 0:
                b = fade(t, S[2] + (S[3] - S[2]) * 0.55, S[3] + 0.2)
                for r in alg:
                    draw_path(cv, cam, r, YEL, 5, b, 1.0, step=0, closed=True)
                cv.text(540, 470, "کوچک‌تر از الجزایر!", 72, YEL, b, box=((10, 10, 25), 22, 170))
        if t > S[3]:
            title(cv, "اندازهٔ واقعی", t, S[3] + 0.8, S[4] + 5, y=270, size=104, color=YEL)
            x, y, v = screen(cam, *GC)
            if v: cv.text(x, y, "گرینلند", 56, WHITE, fade(t, S[3] + 0.8, S[4] + 5))
            x, y, v = screen(cam, *AFC)
            if v: cv.text(x, y, "آفریقا", 72, WHITE, fade(t, S[3] + 0.8, S[4] + 5))

    return cam, draw


AFRICA = ["Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon", "Cabo Verde",
          "Central African Republic", "Chad", "Comoros", "Democratic Republic of the Congo", "Republic of the Congo",
          "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "eSwatini", "Ethiopia", "Gabon", "Gambia", "Ghana",
          "Guinea", "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi",
          "Mali", "Mauritania", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "Senegal",
          "Sierra Leone", "Somalia", "Somaliland", "South Africa", "South Sudan", "Sudan", "Tanzania",
          "United Republic of Tanzania", "Togo", "Tunisia", "Uganda", "Western Sahara", "Zambia", "Zimbabwe"]
