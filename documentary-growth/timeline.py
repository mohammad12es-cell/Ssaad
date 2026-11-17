"""THE MEANING OF GROWTH — edit decision list.

All shot boundaries are anchored to narration line timings (L = line start, E = line end),
so cuts land on the spoken words. Crops are in normalised source coordinates:
cx, cy = crop centre, hf = crop height as a fraction of source height (9:16 window).
"""
import json, os
from lines import LINES

HERE = os.path.dirname(os.path.abspath(__file__))
UP = "/root/.claude/uploads/0512d30d-e650-59c9-870b-6a8294264adf"
SRC = {
    "shirtless": f"{UP}/294d5901-image.webp",
    "bucks":     f"{UP}/356901e7-image.webp",
    "padel_side": f"{UP}/14f6cae1-image.jpg",
    "padel_front": f"{UP}/3d3e9526-image.jpg",
    "tunnel":    f"{UP}/8f6ea1b2-image.webp",
    "office":    f"{UP}/a2c681cc-image.webp",
    "waterfall": f"{UP}/2b583e96-image.webp",
    "family":    f"{UP}/ee8d4855-image.webp",
    "friends":   f"{UP}/aca51ddf-image.jpg",
    "lake":      f"{UP}/a037f713-image.jpg",
    "money":     f"{UP}/67bef229-VID_20261117_234721_904.mp4",
}
# photos that get a person matte -> subtle 2.5D parallax (foreground and background drift apart)
MATTE = {"shirtless", "bucks", "padel_side", "padel_front", "tunnel", "office"}

INTRO = 1.9          # black + ambience before the first question
FINAL_HOLD = 2.1     # hold on last frame after the last word
FADE_OUT = 1.5

# Phrases the brief asks to emphasise (larger type)
BIG = {"q1", "q6", "t2", "w1", "e5"}
# Subtitle text overrides (display text for a line, e.g. emphasise a sub-phrase)
SUB_TEXT = {"q6": "اصلاً رشد یعنی چی؟"}


def narration_times(vo_dir):
    rep = json.load(open(f"{vo_dir}/report.json"))
    t, L, E = INTRO, {}, {}
    for lid, text, pause in LINES:
        L[lid] = t
        E[lid] = t + rep[lid]["dur"]
        t = E[lid] + pause
    return L, E


def build(vo_dir):
    L, E = narration_times(vo_dir)
    end = E["e5"] + FINAL_HOLD + FADE_OUT

    # each shot: name, src, t0, t1, crop0, crop1, grade0, grade1, extra
    # grade = (colour 0..1, warmth -1..1, exposure)
    S = []
    def shot(src, t0, t1, c0, c1, g0, g1, fade_in=0.0, fade_out=0.0, ease="inout",
             par=0.010, vstart=0.0, vrate=1.0):
        S.append(dict(src=src, t0=t0, t1=t1, c0=c0, c1=c1, g0=g0, g1=g1,
                      fade_in=fade_in, fade_out=fade_out, ease=ease, par=par,
                      vstart=vstart, vrate=vrate))

    mono = (0.0, -0.15, 0.0)
    # --- I. DARK / QUESTIONS -------------------------------------------------
    # q1 on pure black. The first portrait emerges slowly for "من کجام؟":
    # a mirror selfie with the face hidden behind the phone -> "where am I?"
    shot("shirtless", L["q2"] - 0.7, L["q4"] - 0.15,
         (0.60, 0.52, 1.00), (0.67, 0.45, 0.70), mono, mono, fade_in=1.6, fade_out=0.35, par=0.014)
    # "من باید رشد کنم..." on black (text only)
    # rapid questions: sport / education / work / money — detail crops, desaturated
    shot("padel_side", L["s1"] - 0.08, L["s2"] - 0.06,
         (0.64, 0.57, 0.46), (0.66, 0.57, 0.40), (0.12, -0.1, 0), (0.12, -0.1, 0), par=0.0)
    # education -> work: the laptop on the desk, whip down to the formal shoes
    shot("office", L["s2"] - 0.06, L["s3"] - 0.12,
         (0.25, 0.50, 0.36), (0.26, 0.50, 0.33), (0.12, -0.1, 0), (0.12, -0.1, 0), par=0.0)
    shot("office", L["s3"] - 0.12, L["s4"] - 0.06,
         (0.30, 0.80, 0.30), (0.28, 0.82, 0.28), (0.12, -0.1, 0), (0.12, -0.1, 0), par=0.0)
    # money: the bill counter
    shot("money", L["s4"] - 0.06, L["q5"] - 0.3,
         (0.5, 0.48, 0.80), (0.5, 0.46, 0.74), (0.15, -0.1, 0.45), (0.15, -0.1, 0.45),
         fade_out=0.25, par=0.0, vstart=1.2)
    # "واقعاً چی؟" / "اصلاً رشد یعنی چی؟" on black

    # --- II. AMBITION (colour returns) ----------------------------------------
    # reaching the peak: tilt up the cliff toward the top of the waterfall
    shot("waterfall", L["a1"] - 0.12, L["a2"] - 0.06,
         (0.48, 0.66, 0.55), (0.52, 0.42, 0.62), (0.35, -0.1, 0), (0.42, -0.1, 0), par=0.0)
    shot("padel_front", L["a2"] - 0.06, L["a3"] - 0.06,
         (0.53, 0.50, 0.85), (0.53, 0.40, 0.62), (0.45, -0.05, 0), (0.5, -0.05, 0), par=0.012)
    # "یک مدرک؟" -> black flash
    shot("money", L["a4"] - 0.06, L["g1"] - 0.12,
         (0.5, 0.62, 0.70), (0.5, 0.60, 0.62), (0.45, 0.0, 0), (0.5, 0.0, 0), par=0.0, vstart=9.2)
    shot("bucks", L["g1"] - 0.12, L["g3"] - 0.06,
         (0.56, 0.52, 1.00), (0.60, 0.40, 0.70), (0.55, 0.0, 0), (0.7, 0.05, 0), par=0.014)
    shot("padel_side", L["g3"] - 0.06, E["g4"] + 0.75,
         (0.47, 0.55, 1.00), (0.45, 0.50, 0.80), (0.72, 0.05, 0), (0.78, 0.1, 0),
         fade_out=0.9, par=0.012, ease="out")

    # --- III. THE TURN ------------------------------------------------------
    # "اما شاید ما یه چیزی رو فراموش کردیم..." on black; then the golden corridor
    # emerges and warms up: growth is not only going higher.
    shot("tunnel", E["t1"] - 0.5, L["w1"] - 0.25,
         (0.52, 0.52, 0.82), (0.52, 0.45, 0.62), (0.35, 0.2, -0.1), (1.0, 0.55, 0.0),
         fade_in=1.4, par=0.016, ease="out")

    # --- IV. WHAT MATTERS (warm) -------------------------------------------
    shot("friends", L["w1"] - 0.25, L["w3"] - 0.15,
         (0.30, 0.52, 1.00), (0.55, 0.50, 0.94), (0.95, 0.55, 0.05), (1.0, 0.55, 0.05),
         par=0.0, ease="lin")
    shot("family", L["w3"] - 0.15, L["w4"] - 0.2,
         (0.18, 0.52, 1.00), (0.60, 0.52, 0.96), (1.0, 0.55, 0.05), (1.0, 0.55, 0.05),
         par=0.0, ease="lin")
    shot("lake", L["w4"] - 0.2, L["e3"] - 0.1,
         (0.47, 0.55, 1.00), (0.52, 0.56, 0.80), (0.95, 0.5, 0.05), (1.0, 0.6, 0.05),
         fade_out=1.1, par=0.0, ease="inout")
    # final portrait: a real laugh. Slow zoom, then hold and fade.
    shot("office", L["e3"] - 1.2, end,
         (0.58, 0.50, 1.00), (0.70, 0.43, 0.46), (1.0, 0.6, 0.06), (1.0, 0.6, 0.06),
         fade_in=1.1, fade_out=FADE_OUT, par=0.012, ease="final")

    subs = []
    for lid, text, pause in LINES:
        t0 = L[lid] - 0.05
        t1 = E[lid] + min(max(pause, 0.15), 0.7)
        if lid == "e5":
            t1 = end - FADE_OUT - 0.2
        subs.append(dict(id=lid, text=SUB_TEXT.get(lid, text), t0=t0, t1=t1, big=lid in BIG))

    # lines spoken over black -> typography sits centre-screen
    black_lines = {"q1", "q4", "q5", "q6", "a3", "t1"}
    for s in subs:
        s["centre"] = s["id"] in black_lines

    markers = dict(L=L, E=E, end=end, cuts=sorted({round(s["t0"], 3) for s in S}))
    return S, subs, markers


if __name__ == "__main__":
    import sys
    S, subs, m = build(sys.argv[1])
    print("duration %.2f s" % m["end"])
    for s in S:
        print("%-12s %6.2f - %6.2f  (%.2f)" % (s["src"], s["t0"], s["t1"], s["t1"] - s["t0"]))
