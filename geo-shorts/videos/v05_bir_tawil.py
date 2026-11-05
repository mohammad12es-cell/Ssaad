"""#5 Bir Tawil - the land nobody wants."""
from layers import global_layer, relief_layer, sentinel_layer
from overlay import draw_path, fill_geo, screen, title, country, feature, RED, YEL, WHITE, CYAN
from shots import fly, fade, fa_num
from engine import clamp, ease

FILE = "05-bir-tawil"
MOOD = "mystery"
NARRATION = [
    ["در جهان، سرزمینی وجود دارد که هیچ کشوری ادعای مالکیت آن را ندارد.", "نامش، بیر طویل است."],
    ["بیر طویل در مرز میان مصر و سودان قرار دارد، و حدود دو هزار کیلومتر مربع وسعت دارد.",
     "علت این وضعیت، دو خط مرزی متفاوت از دوران استعمار است."],
    ["هر دو کشور، منطقهٔ ارزشمند حلایب در کنار دریای سرخ را می‌خواهند.",
     "و پذیرفتن بیر طویل، یعنی چشم‌پوشی از حلایب."],
    ["به همین دلیل، بیر طویل یکی از معدود سرزمین‌های بی‌صاحب کرهٔ زمین است.",
     "بیابانی خالی، که هیچ کشوری آن را نمی‌خواهد."],
]
BT = (21.88, 33.7)
HAL = (22.6, 35.6)
P22 = [(31.4, 22.0), (37.2, 22.0)]


def layers():
    w = sentinel_layer((31.8, 37.6, 19.6, 23.9), 0.2, months=(1, 2, 3, 11, 12), maxcc=2)
    w.fade_km = 0.6
    c = sentinel_layer((33.05, 34.25, 21.6, 22.15), 0.03, months=(1, 2, 3, 11, 12), maxcc=2)
    c.fade_km = 0.12
    return [global_layer(), relief_layer((24, 44, 14, 32), 1.2, strength=0.7), w, c]


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    keys = [
        (0.0, 15, 25, 15000, 0, 0),
        (S[1] - 0.4, 20.5, 33.7, 1500, 20, 0),
        (S[1] + 3.0, 21.85, 33.7, 170, 20, 0),
        (S[2] - 0.5, 21.9, 33.9, 260, 15, 0),
        (S[2] + 2.2, 22.1, 34.8, 650, 15, 0),
        (S[3] - 0.5, 22.1, 34.7, 650, 15, 0),
        (S[3] + 3.5, 21.85, 33.7, 120, 25, 0),
        (S[4], 21.85, 33.65, 60, 35, 0),
    ]
    cam = fly(keys, t)
    bt = feature("ne_10m_admin_0_disputed_areas", "BRK_NAME", "Bir Tawil")
    hal = feature("ne_10m_admin_0_disputed_areas", "BRK_NAME", "Halayib Triangle")
    egy = country("Egypt", minarea=1.0)
    sud = country("Sudan", minarea=1.0)

    def draw(cv, cam, t):
        title(cv, "زمینی که", t, 0.3, S[1] - 0.3, y=230, size=96, color=WHITE)
        title(cv, "هیچ کشوری نمی‌خواهد", t, 0.6, S[1] - 0.3, y=345, size=92, color=YEL)
        a = fade(t, 2.0, S[2] + 0.5)
        for r in egy + sud:
            draw_path(cv, cam, r, WHITE, 3, a * 0.8, 0.5, step=0.1, closed=True)
        x, y, v = screen(cam, 26.5, 30.5)
        if v: cv.text(x, y, "مصر", 72, WHITE, fade(t, S[1] - 0.2, S[1] + 2.5))
        x, y, v = screen(cam, 16.5, 30.5)
        if v: cv.text(x, y, "سودان", 72, WHITE, fade(t, S[1] - 0.2, S[1] + 2.5))
        if t > 3.0:
            a = fade(t, 3.0, S[4] + 5)
            pr = ease(clamp((t - 3.0) / 2.5))
            for r in bt:
                fill_geo(cv, cam, r, YEL, 0.18 * a, step=0.05)
                draw_path(cv, cam, r, YEL, 5, a, 1.2, step=0.02, closed=True, progress=pr)
        if S[1] < t < S[2] + 1:
            x, y, v = screen(cam, *BT)
            if v: cv.text(x, y - 10, "بیر طویل", 66, YEL, fade(t, S[1] + 0.8, S[2] - 0.2))
            if t > S[1] + 2.5:
                cv.text(540, 470, "≈ " + fa_num("2,060").replace(",", "٬") + " کیلومتر مربع", 60, WHITE,
                        fade(t, S[1] + 2.5, S[2] - 0.2), box=((10, 10, 20), 20, 160))
        if S[1] + 5.0 < t < S[4]:
            a = fade(t, S[1] + 5.0, S[3] + 1.0)
            draw_path(cv, cam, P22, CYAN, 4, a, 0.8, step=0.05, progress=ease(clamp((t - S[1] - 5.0) / 1.6)))
        if t > S[2]:
            a = fade(t, S[2] + 0.4, S[4] + 1.0)
            pr = ease(clamp((t - S[2] - 0.4) / 2.0))
            for r in hal:
                fill_geo(cv, cam, r, RED, 0.22 * a, step=0.05)
                draw_path(cv, cam, r, RED, 5, a, 1.2, step=0.02, closed=True, progress=pr)
            if t < S[3]:
                x, y, v = screen(cam, *HAL)
                if v: cv.text(x, y, "حلایب", 70, RED, fade(t, S[2] + 1.2, S[3] - 0.2))
                x, y, v = screen(cam, 22.0, 37.0)
                if v: cv.text(x + 40, y + 120, "دریای سرخ", 52, CYAN, fade(t, S[2] + 1.6, S[3] - 0.2))
                b = fade(t, S[2] + 3.6, S[3] - 0.2)
                xb, yb, vb = screen(cam, *BT)
                xh, yh, vh = screen(cam, *HAL)
                if vb and vh:
                    cv.arrow((xb, yb), (xh - 60, yh + 20), WHITE, 6, b)
        if t > S[3]:
            title(cv, "سرزمین بی‌صاحب", t, S[3] + 4.0, S[4] + 5, y=280, size=100, color=YEL)

    return cam, draw
