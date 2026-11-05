"""#9 Lake Baikal - a fifth of the world's unfrozen surface fresh water."""
import math
from layers import global_layer, relief_layer, sentinel_layer
from overlay import draw_path, screen, title, lake, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num
from engine import clamp, ease

FILE = "09-lake-baikal"
MOOD = "warm"
NARRATION = [
    ["دریاچه‌ای در جهان هست، که از همهٔ دریاچه‌های بزرگ آمریکای شمالی آب بیشتری دارد.", "نامش، بایکال است."],
    ["بایکال در جنوب سیبری روسیه قرار دارد، و با حدود هزار و ششصد و چهل متر عمق، عمیق‌ترین دریاچهٔ جهان است.",
     "طول آن، بیش از ششصد کیلومتر است."],
    ["این دریاچه به‌تنهایی، حدود یک‌پنجم آب شیرین سطحی و یخ‌نزدهٔ جهان را در خود جای داده است.",
     "یعنی بیشتر از هر دریاچهٔ دیگری روی زمین."],
    ["بایکال با حدود بیست و پنج میلیون سال عمر، کهن‌ترین دریاچهٔ جهان به شمار می‌رود.",
     "گنجینه‌ای از آب، در قلب سیبری."],
]
GL = ["Lake Superior", "Lake Michigan", "Lake Huron", "Lake Erie", "Lake Ontario"]
BAI = (53.5, 108.0)
ENDS = [(51.7, 103.9), (55.75, 109.5)]


def layers():
    w = sentinel_layer((102.8, 111.0, 50.9, 56.3), 0.3, months=(7, 8, 9), maxcc=3)
    w.fade_km = 1.0
    c = sentinel_layer((106.6, 108.6, 52.6, 53.6), 0.05, months=(7, 8, 9), maxcc=3)
    c.fade_km = 0.2
    return [global_layer(), relief_layer((95, 120, 46, 60), 1.2, strength=0.75), w, c]


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, 44, -84, 6500, 0, 0),
        (S[1] * 0.55, 46, -84, 5200, 10, 0),
        (S[1] + 0.5, 50, 100, 9000, 0, 0),
        (S[1] + 3.5, 52.9, 107.4, 1500, 15, 30),
        (S[2] - 0.3, 53.1, 107.6, 1450, 12, 30),
        (S[3] - 0.3, 53.0, 107.5, 1300, 15, 30),
        (S[3] + 4.0, 52.85, 107.0, 45, 55, 40),
        (S[4], 53.0, 107.3, 35, 58, 45),
    ]
    cam = fly(keys, t)
    gl = [r for n in GL for r in lake(n)]
    bai = lake("Lake Baikal")

    def draw(cv, cam, t):
        if t < S[1] + 0.3:
            a = fade(t, 0.5, S[1] * 0.6)
            for r in gl:
                draw_path(cv, cam, r, CYAN, 4, a, 1.0, step=0.1, closed=True)
            title(cv, "دریاچه‌های بزرگ", t, 0.3, S[1] * 0.6, y=230, size=96, color=WHITE)
            title(cv, "آمریکای شمالی", t, 0.6, S[1] * 0.6, y=345, size=84, color=CYAN)
        a = fade(t, S[1] - 1.0, S[4] + 5)
        for r in bai:
            draw_path(cv, cam, r, YEL, 4, a, 1.0, step=0.05, closed=True)
        if S[1] - 1.5 < t < S[2] + 0.3:
            x, y, v = screen(cam, *BAI)
            if v: cv.text(x + 140, y, "بایکال", 80, YEL, fade(t, S[1] - 1.0, S[2] + 0.1))
            title(cv, "بیشتر از همه!", t, S[1] - 1.2, S[1] + 2.0, y=300, size=96, color=YEL)
        if S[1] + 3.5 < t < S[3] + 0.3:
            a = fade(t, S[1] + 3.5, S[2] + 0.1)
            cv.text(540, 470, "عمق: " + fa_num("1,640").replace(",", "٬") + " متر", 68, CYAN, a,
                    box=((5, 15, 30), 22, 170))
            if t > S[2] - 3.5:
                b = fade(t, S[2] - 3.5, S[2] + 0.1)
                p = [screen(cam, *e) for e in ENDS]
                if p[0][2] and p[1][2]:
                    cv.line([p[0][:2], p[1][:2]], RED, 5, b, 0.8)
                    cv.text(540, 600, "طول: بیش از " + fa_num(600) + " کیلومتر", 60, RED, b, box=((25, 5, 5), 20, 170))
        if S[2] < t < S[3] + 0.3:
            u = t - S[2]
            a = fade(t, S[2] + 0.2, S[3] + 0.1)
            cx, cy, r = 540, 760, 230
            cv.do.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(20, 40, 80, int(200 * a)))
            ang = 72 * ease(clamp((u - 0.4) / 1.6))
            cv.do.pieslice([cx - r, cy - r, cx + r, cy + r], -90, -90 + ang, fill=(60, 200, 255, int(255 * a)))
            cv.circle(cx, cy, r, CYAN, 4, a, glow=0.8)
            cv.text(cx, cy + r + 90, "≈ " + fa_num(20) + "٪ آب شیرین سطحی جهان", 54, WHITE, a * clamp((u - 1.6) / 0.5))
            cv.text(cx, cy, "یک‌پنجم", 84, WHITE, a * clamp((u - 1.0) / 0.5))
        if t > S[3]:
            title(cv, "کهن‌ترین دریاچهٔ جهان", t, S[3] + 0.6, S[4] + 5, y=260, size=84, color=YEL)
            title(cv, "≈ " + fa_num(25) + " میلیون سال", t, S[3] + 1.2, S[4] + 5, y=370, size=66, color=WHITE)

    return cam, draw
