"""#10 Dead Sea - lowest point on land."""
import math
from layers import global_layer, relief_layer, sentinel_layer
from overlay import draw_path, lake, screen, title, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num
from engine import clamp, ease, ease_out

FILE = "10-dead-sea"
MOOD = "mystery"
NARRATION = [
    ["پایین‌ترین نقطهٔ خشکیِ زمین کجاست؟", "پاسخ، در دل خاورمیانه پنهان است."],
    ["دریای مُرده، در شکافی عمیق میان اردن و فلسطین آرمیده است.",
     "آبِ آن چنان شور است که بدن انسان، بی‌هیچ تلاشی بر سطحش شناور می‌ماند."],
    ["ساحل این دریاچه، بیش از چهارصد و سی متر پایین‌تر از سطح دریاست.",
     "و شگفت آنکه، سطح آن هر سال حدود یک متر دیگر فرو می‌نشیند."],
    ["دلیل این فرونشست، برداشت گسترده از آبِ رود اردن است.",
     "پایین‌ترین نقطهٔ خشکیِ زمین، آرام‌آرام در حال کوچک شدن است."],
]

DS = (31.53, 35.50)
JORDAN = [(35.573, 32.71), (35.565, 32.55), (35.575, 32.40), (35.555, 32.25), (35.535, 32.10), (35.52, 31.95),
          (35.535, 31.85), (35.555, 31.76)]


def layers():
    w = sentinel_layer((34.3, 36.7, 30.2, 33.1), 0.16, months=(4, 5, 6, 9, 10))
    w.fade_km = 0.45
    c = sentinel_layer((35.25, 35.75, 30.95, 31.85), 0.025, months=(4, 5, 6, 9, 10))
    c.fade_km = 0.12
    return [global_layer(), relief_layer((25, 50, 20, 42), 1.2, strength=0.7), w, c]


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, 24, 30, 16000, 0, 0, 40),
        (S[1] - 0.6, 30.4, 35.5, 700, 25, 0, 40),
        (S[1] + 3.0, 30.95, 35.5, 150, 40, 0, 40),
        (S[2] - 0.6, 31.15, 35.47, 75, 42, 0, 40),
        (S[2] + 1.5, 31.40, 35.47, 95, 12, 0, 40),
        (S[3] - 0.8, 31.42, 35.47, 85, 8, 0, 40),
        (S[3] + 3.2, 31.6, 35.55, 220, 30, 0, 40),
        (S[4], 31.1, 35.5, 420, 18, 0, 40),
    ]
    cam = fly(keys, t)
    ds_ring = lake("Dead Sea")

    def draw(cv, cam, t):
        # scene 1: pulse on the target + hook title
        if t < S[2]:
            x, y, v = screen(cam, *DS)
            if v:
                for k in range(3):
                    ph = ((t * 0.7 + k / 3) % 1.0)
                    cv.circle(x, y, 20 + ph * 160, RED, 5, (1 - ph) * fade(t, 0.6, S[1] + 0.8))
                cv.dot(x, y, 9, RED, fade(t, 0.4, S[1] + 0.8))
        title(cv, "پایین‌ترین نقطهٔ", t, 0.3, S[1] - 0.3, y=230, size=92, color=WHITE)
        title(cv, "خشکی زمین؟", t, 0.6, S[1] - 0.3, y=345, size=110, color=YEL)
        # scene 2: outline + country labels
        if S[1] + 0.3 < t:
            a = fade(t, S[1] + 0.3, S[4] + 5, 0.6)
            for r in ds_ring:
                draw_path(cv, cam, r, RED, 5, a, 1.0, step=0.02, closed=True,
                          progress=ease(clamp((t - S[1] - 0.3) / 2.0)))
        if S[1] < t < S[2]:
            a = fade(t, S[1] + 1.2, S[2] - 0.2)
            x, y, v = screen(cam, 31.35, 35.85)
            if v: cv.text(x, y, "اردن", 66, WHITE, a)
            x, y, v = screen(cam, 31.5, 35.18)
            if v: cv.text(x, y, "فلسطین", 66, WHITE, a)
            x, y, v = screen(cam, 31.55, 35.50)
            if v: cv.text(x, y, "دریای مرده", 54, YEL, fade(t, S[1] + 2.2, S[2] - 0.2))
        # scene 3: sea-level gauge
        if S[2] < t < S[3]:
            u = t - S[2]
            a = fade(t, S[2] + 0.2, S[3] - 0.15)
            y0, y1 = 520, 1180
            yy = y0 + (y1 - y0) * ease(clamp(u / 2.2))
            cv.line([(90, y0), (990, y0)], CYAN, 5, a, 0.8)
            cv.text(540, y0 - 55, "سطح دریا  " + fa_num(0) + " متر", 52, CYAN, a)
            cv.arrow((540, y0 + 10), (540, yy), RED, 9, a)
            cv.text(790, (y0 + yy) / 2, fa_num(430) + " متر", 84, YEL, a * clamp((u - 1.0) / 0.5))
            cv.text(790, (y0 + yy) / 2 + 85, "پایین‌تر", 56, WHITE, a * clamp((u - 1.0) / 0.5))
            if u > 4.0:
                b = fade(t, S[2] + 4.0, S[3] - 0.15)
                cv.text(540, 1290, "هر سال حدود " + fa_num(1) + " متر", 60, YEL, b, box=((120, 10, 10), 24, 190))
                for k in range(3):
                    ph = ((u * 0.9 + k / 3) % 1.0)
                    cv.arrow((300 + k * 240, 1340 + ph * 40), (300 + k * 240, 1390 + ph * 40), RED, 6, b * (1 - ph))
        # scene 4: Jordan river & diversion arrows
        if S[3] < t:
            u = t - S[3]
            a = fade(t, S[3] + 0.2, S[4] + 9)
            draw_path(cv, cam, JORDAN, BLUE, 5, a * (1 - 0.6 * clamp((u - 3) / 2)), 1.0, step=0.01,
                      progress=ease(clamp(u / 2.2)))
            for (lo, la), side in [(JORDAN[1], 1), (JORDAN[3], -1), (JORDAN[5], 1)]:
                x, y, v = screen(cam, la, lo)
                if v and u > 1.5:
                    b = a * clamp((u - 1.5) / 0.5) * (1 - clamp((u - 5.5) / 0.6))
                    cv.arrow((x, y), (x + side * 120, y - 30), RED, 6, b, 26)
            x, y, v = screen(cam, 32.25, 35.70)
            if v: cv.text(x, y, "رود اردن", 54, CYAN, fade(t, S[3] + 1.0, S[3] + 5.5))
            title(cv, "در حال کوچک شدن", t, S[3] + 5.2, S[4] + 5, y=300, size=96, color=YEL)

    return cam, draw
