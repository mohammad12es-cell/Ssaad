"""#4 Point Nemo - the loneliest spot in the ocean."""
import math
import numpy as np
from layers import global_layer
from overlay import draw_path, screen, title, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num, small_circle, gc_path
from engine import clamp, ease, ease_out

FILE = "04-point-nemo"
MOOD = "mystery"
NARRATION = [
    ["دورافتاده‌ترین نقطهٔ اقیانوس‌های جهان کجاست؟", "جایی که نزدیک‌ترین انسان‌ها، گاهی در فضا هستند!"],
    ["این نقطه، پوینت نمو نام دارد، و در میانهٔ اقیانوس آرام جنوبی قرار گرفته است.",
     "نزدیک‌ترین خشکی به آن، حدود دو هزار و هفتصد کیلومتر فاصله دارد."],
    ["اما ایستگاه فضایی بین‌المللی، در ارتفاع حدود چهارصد کیلومتری زمین می‌چرخد.",
     "پس وقتی از بالای این نقطه می‌گذرد، فضانوردان نزدیک‌ترین انسان‌ها هستند."],
    ["به همین دلیل، ماهواره‌ها و ایستگاه‌های فضایی از کار افتاده را، در همین منطقه سقوط می‌دهند.",
     "پوینت نمو، گورستان فضاپیماهای جهان است."],
]
NEMO = (-48.877, -123.393)
LAND = [(-24.67, -124.78), (-27.20, -109.45), (-72.9, -126.2)]  # Ducie, Motu Nui, Maher Is.
INC = 51.64


def orbit(n=720):
    """ISS ground track great circle (inclination 51.6 deg) passing over Point Nemo."""
    i = math.radians(INC)
    su = math.sin(math.radians(NEMO[0])) / math.sin(i)
    u0 = math.pi - math.asin(su)  # descending pass
    off = math.atan2(math.cos(i) * math.sin(u0), math.cos(u0))
    om = math.radians(NEMO[1]) - off
    pts = []
    for k in range(n + 1):
        u = u0 - math.pi + 2 * math.pi * k / n
        lat = math.asin(math.sin(i) * math.sin(u))
        lon = om + math.atan2(math.cos(i) * math.sin(u), math.cos(u))
        pts.append(((math.degrees(lon) + 180) % 360 - 180, math.degrees(lat)))
    return pts, u0


ORB, U0 = orbit()


def iss_at(frac):
    """Position along orbit; frac=0.5 is directly above Nemo."""
    i = math.radians(INC)
    u = U0 - math.pi + 2 * math.pi * frac
    off = math.atan2(math.cos(i) * math.sin(U0), math.cos(U0))
    om = math.radians(NEMO[1]) - off
    lat = math.asin(math.sin(i) * math.sin(u))
    lon = om + math.atan2(math.cos(i) * math.sin(u), math.cos(u))
    return math.degrees(lat), (math.degrees(lon) + 180) % 360 - 180


def layers():
    return [global_layer()]


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, -10, -100, 22000, 0, 0),
        (S[1] - 0.3, -46, -123.4, 12000, 0, 0),
        (S[1] + 2.8, -47, -123.4, 15500, 0, 0),
        (S[2] - 0.5, -47, -123.4, 16500, 0, 0),
        (S[2] + 2.5, -56, -123.4, 1500, 65, 0),
        (S[3] - 0.3, -57, -123.4, 1400, 68, 0),
        (S[3] + 3.0, -52, -123.4, 3200, 40, 0),
        (S[4], -45, -123.4, 9000, 10, 0),
    ]
    cam = fly(keys, t)

    def draw(cv, cam, t):
        title(cv, "تنهاترین نقطهٔ", t, 0.3, S[1] - 0.3, y=230, size=96, color=WHITE)
        title(cv, "اقیانوس‌ها", t, 0.6, S[1] - 0.3, y=345, size=110, color=YEL)
        x, y, v = screen(cam, *NEMO)
        if v and t > 1.0:
            a = fade(t, 1.0, S[4] + 5)
            for k in range(3):
                ph = (t * 0.6 + k / 3) % 1
                cv.circle(x, y, 14 + ph * 110, RED, 4, (1 - ph) * a * (1 if t < S[2] else 0.4))
            cv.dot(x, y, 10, RED, a)
            if S[1] < t < S[2]:
                cv.text(x, y + 90, "پوینت نمو", 62, YEL, fade(t, S[1] + 0.4, S[2] - 0.2))
        if S[1] + 3.0 < t < S[2] + 1.0:
            u = t - S[1] - 3.0
            a = fade(t, S[1] + 3.0, S[2] + 0.8)
            draw_path(cv, cam, small_circle(*NEMO, 2688), CYAN, 4, a, 0.9, step=0, progress=ease(clamp(u / 2.0)))
            for p in LAND:
                draw_path(cv, cam, gc_path(NEMO, p, 60), WHITE, 3, a * clamp((u - 1.5) / 0.5), 0.5, step=0)
                xx, yy, vv = screen(cam, *p)
                if vv: cv.dot(xx, yy, 8, YEL, a * clamp((u - 1.5) / 0.5))
            xx, yy, vv = screen(cam, -36.0, -124.3)
            if vv: cv.text(xx + 150, yy, fa_num(2688) + " کیلومتر", 54, CYAN, a * clamp((u - 2) / 0.5),
                           box=((5, 10, 25), 18, 160))
        # ISS
        if t > S[2] - 0.2:
            u = t - S[2]
            a = fade(t, S[2] - 0.2, S[4] + 5)
            draw_path(cv, cam, ORB, (230, 230, 255), 2, a * 0.7, 0.6, step=0, alt=408)
            frac = 0.5 + (u - 4.0) * 0.004
            la, lo = iss_at(frac)
            xi, yi, vi = screen(cam, la, lo, 408)
            if vi:
                cv.dot(xi, yi, 12, WHITE, a, 1.5)
                cv.text(xi, yi - 70, "ایستگاه فضایی", 52, WHITE, a * fade(t, S[2] + 0.5, S[3] - 0.2))
            xn, yn, vn = screen(cam, *NEMO)
            xa, ya, va = screen(cam, NEMO[0], NEMO[1], 408)
            if vn and va and t < S[3]:
                b = fade(t, S[2] + 2.5, S[3] - 0.2)
                cv.line([(xn, yn), (xa, ya)], YEL, 5, b, 0.8)
                cv.text(xn + 190, (yn + ya) / 2, fa_num(400) + " کیلومتر", 60, YEL, b, box=((20, 15, 5), 18, 170))
        # spacecraft cemetery: re-entry streaks
        if t > S[3] + 0.5:
            u = t - S[3] - 0.5
            a = fade(t, S[3] + 0.5, S[4] + 5)
            rng = np.random.default_rng(7)
            for k in range(9):
                st = rng.random() * 5.0
                ph = (u - st) / 1.6
                if 0 < ph < 1:
                    la0 = NEMO[0] + rng.uniform(-6, 6)
                    lo0 = NEMO[1] + rng.uniform(-10, 10)
                    x0, y0, v0 = screen(cam, la0 + 9, lo0 - 14, 600 * (1 - ph) + 50)
                    x1, y1, v1 = screen(cam, la0 + 9 * (1 - ph) * 0.3, lo0 - 14 * (1 - ph) * 0.3, 50 + 500 * (1 - ph) * 0.3)
                    if v0 and v1:
                        cv.line([(x0, y0), (x1, y1)], (255, 170, 60), 4, a * (1 - ph) ** 0.5, 1.5)
                        cv.dot(x1, y1, 7, (255, 230, 170), a * (1 - ph) ** 0.5, 1.5)
            title(cv, "گورستان فضاپیماها", t, S[3] + 4.0, S[4] + 5, y=280, size=92, color=YEL)

    return cam, draw
