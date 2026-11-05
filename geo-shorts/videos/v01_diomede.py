"""#1 Diomede islands - tomorrow island & yesterday island."""
from layers import global_layer, relief_layer, sentinel_layer
from overlay import draw_path, screen, title, country, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num
from engine import clamp, ease

FILE = "01-diomede-islands"
MOOD = "mystery"
NARRATION = [
    ["آیا می‌دانید در کجای جهان، می‌توان از امروز به فردا نگاه کرد؟", "پاسخ، در تنگهٔ برینگ است."],
    ["در این تنگه، دو جزیرهٔ دیومید تنها حدود چهار کیلومتر از هم فاصله دارند.",
     "دیومید بزرگ متعلق به روسیه است، و دیومید کوچک متعلق به آمریکا."],
    ["اما خط بین‌المللی تغییر تاریخ، درست از میان این دو جزیره می‌گذرد.",
     "به همین دلیل، ساعت آن‌ها حدود بیست و یک ساعت با هم اختلاف دارد."],
    ["از همین رو، به آن‌ها جزیرهٔ فردا و جزیرهٔ دیروز می‌گویند.",
     "دو همسایهٔ نزدیک، که هر کدام در روزی متفاوت قرار دارند."],
]
BIG = (65.78, -169.06)
LITTLE = (65.755, -168.93)
IDL = [(-168.98, 68.3), (-168.98, 64.6)]


def layers():
    w = sentinel_layer((-172.8, -165.2, 64.7, 67.2), 0.15, months=(6, 7, 8, 9), years=(2023, 2022, 2021, 2024), maxcc=8)
    w.fade_km = 0.5
    c = sentinel_layer((-169.25, -168.75, 65.66, 65.86), 0.02, months=(6, 7, 8, 9), years=(2023, 2022, 2021, 2024), maxcc=8)
    c.fade_km = 0.1
    return [global_layer(), relief_layer((-180, -155, 58, 72), 1.5, strength=0.7), w, c]


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, 45, -175, 15000, 0, 0),
        (S[1] - 0.5, 64.6, -169, 1300, 25, 0),
        (S[1] + 3.5, 65.70, -168.99, 60, 20, 0),
        (S[2] - 0.3, 65.755, -168.99, 24, 12, 0),
        (S[3] - 0.3, 65.755, -168.99, 28, 12, 0),
        (S[3] + 4.0, 65.74, -168.99, 42, 18, 0),
        (S[4], 65.62, -168.99, 150, 30, 0),
    ]
    cam = fly(keys, t)

    def draw(cv, cam, t):
        title(cv, "از امروز", t, 0.3, S[1] - 0.3, y=230, size=96, color=WHITE)
        title(cv, "فردا را ببینید؟", t, 0.6, S[1] - 0.3, y=350, size=104, color=YEL)
        if t < S[1] + 1:
            x, y, v = screen(cam, 65.75, -169.0)
            a = fade(t, 1.0, S[1] + 0.8)
            if v:
                for k in range(3):
                    ph = (t * 0.7 + k / 3) % 1
                    cv.circle(x, y, 20 + ph * 150, RED, 5, (1 - ph) * a)
        if S[1] < t < S[3]:
            a = fade(t, S[1] + 0.5, S[2] + 0.3)
            x, y, v = screen(cam, 66.0, -171.2)
            if v: cv.text(x, y, "روسیه", 64, WHITE, a)
            x, y, v = screen(cam, 65.4, -166.8)
            if v: cv.text(x, y, "آمریکا", 64, WHITE, a)
        if S[1] + 3 < t < S[4] + 1:
            a = fade(t, S[1] + 3.2, S[4] + 5)
            xb, yb, vb = screen(cam, *BIG)
            xl, yl, vl = screen(cam, *LITTLE)
            if vb and vl:
                cv.text(xb - 40, yb - 150, "دیومید بزرگ", 50, WHITE, a)
                cv.text(xl + 40, yl + 150, "دیومید کوچک", 50, WHITE, a)
                if t < S[2] + 0.5:
                    b = fade(t, S[1] + 4.2, S[2] + 0.3)
                    cv.line([(xb + 60, yb + 10), (xl - 60, yl - 10)], YEL, 5, b, 0.6)
                    cv.text((xb + xl) / 2, (yb + yl) / 2 - 70, "≈ " + fa_num(3.8) + " کیلومتر", 50, YEL, b,
                            box=((10, 10, 20), 18, 160))
        if t > S[2] + 0.2:
            a = fade(t, S[2] + 0.2, S[4] + 5)
            draw_path(cv, cam, IDL, YEL, 6, a, 1.2, step=0.01, progress=ease(clamp((t - S[2] - 0.2) / 2.0)))
            x, y, v = screen(cam, 65.9, -168.98)
            if v and t < S[3]:
                cv.text(540, 470, "خط تغییر تاریخ", 70, YEL, fade(t, S[2] + 1.5, S[3] - 0.2))
            if S[2] + 4 < t < S[3]:
                b = fade(t, S[2] + 4.2, S[3] - 0.2)
                cv.text(540, 600, fa_num(21) + " ساعت اختلاف", 72, RED, b, box=((15, 5, 5), 22, 180))
        if t > S[3]:
            a = fade(t, S[3] + 0.6, S[4] + 5)
            xb, yb, vb = screen(cam, *BIG)
            xl, yl, vl = screen(cam, *LITTLE)
            cv.text(270, 600, "فردا", 110, YEL, a)
            cv.text(810, 600, "دیروز", 110, CYAN, a)
            title(cv, "جزیرهٔ فردا و دیروز", t, S[3] + 5.0, S[4] + 5, y=300, size=84, color=WHITE)

    return cam, draw
