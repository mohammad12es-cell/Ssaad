"""#7 France - the country with the most time zones (12)."""
from layers import global_layer
from overlay import draw_path, fill_geo, screen, title, country, RED, YEL, WHITE, CYAN, BLUE
from shots import fly, fade, fa_num
from engine import clamp, ease

FILE = "07-france-time-zones"
MOOD = "warm"
NARRATION = [
    ["کدام کشور جهان، بیشترین منطقهٔ زمانی را دارد؟", "روسیه؟ آمریکا؟ نه!"],
    ["روسیه با یازده منطقهٔ زمانی، پهناورترین کشور جهان است.", "اما رکورددار، کشوری اروپایی است."],
    ["فرانسه با سرزمین‌های فرادریایی‌اش، دوازده منطقهٔ زمانی دارد.",
     "از پلی‌نزی فرانسه در اقیانوس آرام، تا جزیرهٔ رئونیون در اقیانوس هند."],
    ["به همین دلیل، وقتی پاریس در خواب است، جایی از فرانسه در روز روشن قرار دارد.",
     "گفته می‌شود خورشید، هیچ‌گاه بر خاک فرانسه غروب نمی‌کند."],
]
# (lat, lon, UTC label) - order of the westward tour
TZ = [
    (48.86, 2.35, "+۱", "پاریس"),
    (46.8, -56.2, "−۳", None),
    (4.0, -53.0, "−۳", "گویان"),
    (14.64, -61.02, "−۴", "مارتینیک"),
    (10.3, -109.22, "−۸", "کلیپرتون"),
    (-23.1, -134.97, "−۹", None),
    (-9.0, -139.5, "−۹:۳۰", None),
    (-17.65, -149.43, "−۱۰", "پلی‌نزی"),
    (-13.3, -176.2, "+۱۲", "والیس"),
    (-21.3, 165.5, "+۱۱", "کالدونیای جدید"),
    (-49.35, 70.2, "+۵", "کرگلن"),
    (-21.1, 55.5, "+۴", "رئونیون"),
    (-12.8, 45.15, "+۳", "مایوت"),
]


def layers():
    return [global_layer()]


def shot(t, tl):
    S = [s["start"] for s in tl] + [tl[-1]["end"]]
    d3 = S[3] - S[2]
    keys = [
        (0.0, 30, 40, 26000, 0, 0),
        (S[1] - 0.3, 55, 80, 17000, 0, 0),
        (S[2] - 0.6, 47, 15, 9000, 0, 0),
        (S[2] + 0.12 * d3, 30, -40, 15000, 0, 0),
        (S[2] + 0.45 * d3, 0, -115, 17000, 0, 0),
        (S[2] + 0.75 * d3, -15, -175, 17000, 0, 0),
        (S[3] + 1.5, -25, 120, 18000, 0, 0),
        (S[3] + 4.5, -25, 55, 18000, 0, 0),
        (S[4], 20, 5, 26000, 0, 0),
    ]
    cam = fly(keys, t)
    rus = country("Russia", minarea=2.0)
    fra = country("France", minarea=0.5)

    def draw(cv, cam, t):
        title(cv, "بیشترین", t, 0.3, S[1] - 0.3, y=230, size=96, color=WHITE)
        title(cv, "منطقهٔ زمانی؟", t, 0.6, S[1] - 0.3, y=345, size=104, color=YEL)
        if S[1] - 0.5 < t < S[2] + 0.3:
            a = fade(t, S[1] - 0.3, S[2] + 0.1)
            for r in rus:
                draw_path(cv, cam, r, RED, 4, a, 1.0, step=0.5, closed=True, progress=ease(clamp((t - S[1] + 0.3) / 2)))
            x, y, v = screen(cam, 62, 95)
            if v:
                cv.text(x, y - 40, "روسیه", 76, WHITE, a)
                cv.text(x, y + 60, fa_num(11) + " منطقهٔ زمانی", 56, YEL, a * clamp((t - S[1] - 1.0) / 0.5))
        if S[1] + 4.0 < t:
            a = fade(t, S[1] + 4.0, S[4] + 5)
            for r in fra:
                draw_path(cv, cam, r, BLUE, 4, a, 1.2, step=0.2, closed=True)
            x, y, v = screen(cam, 46.5, 2.5)
            if v and t < S[2] + 2:
                cv.text(x, y - 100, "فرانسه", 76, CYAN, fade(t, S[1] + 4.2, S[2] + 1.5))
        if t > S[2]:
            # territories light up one by one during the tour, stay lit afterwards
            n_on = 0
            for i, (la, lo, lab, name) in enumerate(TZ):
                on = S[2] + 0.3 + i * (S[3] + 5.0 - S[2]) / len(TZ)
                if t < on:
                    continue
                n_on = len({z[2] for z in TZ[:i + 1]})
                x, y, v = screen(cam, la, lo)
                if not v:
                    continue
                a = clamp((t - on) / 0.4)
                ph = ((t - on) * 0.8) % 1
                cv.circle(x, y, 12 + ph * 60, YEL, 3, a * (1 - ph))
                cv.dot(x, y, 10, YEL, a)
                cv.text(x, y - 55, "\u2066" + lab + "\u2069", 50, WHITE, a, box=((10, 10, 25), 12, 150))
                if name and t - on < 3.0:
                    cv.text(x, y + 60, name, 42, CYAN, a * fade(t, on, on + 3.0))
            if t < S[4] - 0.5:
                cv.text(540, 470, fa_num(n_on) + " / " + fa_num(12), 84, YEL, fade(t, S[2] + 0.3, S[4] + 5),
                        box=((10, 10, 25), 24, 170))
            title(cv, "خورشید غروب نمی‌کند", t, S[3] + 5.5, S[4] + 5, y=280, size=84, color=YEL)

    return cam, draw
