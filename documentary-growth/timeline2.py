"""THE MEANING OF GROWTH — re-edit (v2). Edit decision list.

Same photos, same narration, same message as v1; new structure, rhythm and typography.
Everything is anchored to the narration: L[id] / E[id] = line start / end, and
W(id, i) / WE(id, i) = start / end of script word i (Whisper word timestamps).

Camera paths are keyframed: keys = [(abs_time, (cx, cy, hf), ease_into_this_key), ...]
cx, cy = crop centre (normalised source coords), hf = crop height / source height (9:16 window).
"""
import json, os
from lines import LINES
from timeline import SRC, MATTE  # sources and matte list unchanged

FPS = 24
HOOK_Q1 = 4.6         # first narrated word
FINAL_HOLD = 1.5      # hold after the last word, then hard cut to black
TAIL_BLACK = 1.0      # black after the cut while the last chord rings out

PAUSE = dict(q1=.45, q2=.35, q3=.35, q4=.45, s1=.06, s2=.06, s3=.06, s4=.30, q5=.35, q6=.50,
             a1=.75, a2=.10, a3=.06, a4=.30, g1=.20, g2=.08, g3=.08, g4=.90,
             t1=.70, t2=.35, t3=.05, t4=.40, w1=.40, w2=.12, w3=.15, w4=.45,
             e1=.30, e2=.50, e3=.15, e4=.20, e5=0.0)

TEXT = {lid: t for lid, t, _ in LINES}

# grades: (colour 0..1, warmth -1..1, exposure)
MONO = (0.0, -0.15, 0.0)
COLD = (0.3, -0.2, 0.0)
WARM = (1.0, 0.58, 0.05)


def _words(lid):
    return TEXT[lid].split(" ")


def build(vo_dir):
    rep = json.load(open(f"{vo_dir}/report.json"))
    wt = json.load(open(f"{vo_dir}/word_times.json"))
    t, L, E = HOOK_Q1, {}, {}
    for lid, _, _ in LINES:
        L[lid] = t
        E[lid] = t + rep[lid]["dur"]
        t = E[lid] + PAUSE[lid]

    def _map(lid, i, end=False):
        """time of script word i (start, or end) via character-fraction alignment."""
        sw = _words(lid)
        tot = sum(len(w) for w in sw)
        f = sum(len(w) for w in sw[: i + (1 if end else 0)]) / tot
        ws = wt.get(lid) or []
        if not ws:
            return L[lid] + f * (E[lid] - L[lid])
        wtot = sum(len(w[0]) for w in ws) or 1
        acc = 0
        for w, a, b in ws:
            nxt = acc + len(w)
            if (nxt / wtot) >= f - 1e-6 if end else (nxt / wtot) > f + 1e-6:
                if end:
                    return min(E[lid], L[lid] + b)
                return min(E[lid], L[lid] + a)
            acc = nxt
        return E[lid] if end else L[lid] + ws[-1][1]

    W = lambda lid, i: _map(lid, i) if i > 0 else L[lid]
    WE = lambda lid, i: _map(lid, i, end=True)
    END_HOLD = E["e5"] + FINAL_HOLD
    END = END_HOLD + TAIL_BLACK

    shots, texts, hits, flashes = [], [], [], []

    def shot(src, t0, t1, keys, g0, g1=None, **kw):
        d = dict(src=src, t0=t0, t1=t1, keys=keys, g0=g0, g1=g1 or g0, par=0.0, freeze=None,
                 vstart=0.0, vrate=1.0, fade_in=0.0, fade_out=0.0, look=None)
        d.update(kw)
        shots.append(d)
        return d

    def text(s, t0, t1, style="sub", **kw):
        d = dict(text=s, t0=t0, t1=t1, style=style, x=0.5, y=0.72, size=None, fit=None,
                 weight="SemiBold", anim="pop", out="fade", behind=None, warm=False, alpha=1.0)
        d.update(kw)
        texts.append(d)

    def hit(tm, strength, kind):
        hits.append(dict(t=tm, s=strength, kind=kind))

    # ===================================================================== HOOK
    # three striking cuts: extreme close-up / violent zoom-out / freeze frame
    shot("padel_front", 0.00, 0.38, [(0.00, (0.525, 0.31, 0.30), "lin"), (0.10, (0.525, 0.30, 0.21), "out")],
         (0.2, -0.25, 0.1))
    hit(0.00, 1.0, "boom")
    shot("waterfall", 0.38, 0.80, [(0.38, (0.43, 0.53, 0.15), "lin"), (0.80, (0.47, 0.50, 0.80), "out")],
         (0.25, -0.2, 0.0))
    hit(0.38, 0.7, "suck")
    shot("tunnel", 0.80, 1.42, [(0.80, (0.52, 0.44, 0.62), "lin"), (0.90, (0.52, 0.43, 0.40), "out")],
         MONO, freeze=0.90, look="freeze", par=0.0)
    hit(0.90, 0.9, "freeze")
    flashes.append(dict(t=0.90, d=0.09, c=(1, 1, 1), s=0.55))
    # the hook question, on black
    text("اگه به همه چیزایی", 1.55, 4.25, style="hook", y=0.40, size=74, weight="Bold", anim="rise", out="cut")
    text("که می‌خوای برسی...", 2.15, 4.25, style="hook", y=0.47, size=74, weight="Bold", anim="rise", out="cut")
    text("چی؟", 3.25, 4.25, style="hook", y=0.60, size=230, weight="Black", anim="punch", out="cut")
    hit(3.25, 0.8, "stab")

    # ================================================================ QUESTIONS
    q1a, q1b = W("q1", 0), W("q1", 1)
    shot("bucks", L["q1"] - 0.12, L["q2"] - 0.04,
         [(L["q1"] - 0.12, (0.56, 0.47, 0.95), "lin"), (L["q2"] - 0.04, (0.58, 0.42, 0.80), "inout")],
         MONO, par=0.014)
    text("خوشبختی", q1a, L["q2"] - 0.04, style="huge", y=0.22, fit=0.82, weight="Black", anim="punch",
         out="cut", behind="bucks")
    text("کجاست؟", q1b, L["q2"] - 0.04, y=0.72, out="cut")
    hit(q1a, 0.9, "boom")
    # punch-in: same photo, the phone hiding the face
    shot("bucks", L["q2"] - 0.04, L["q3"] - 0.05,
         [(L["q2"] - 0.04, (0.62, 0.30, 0.31), "lin"), (L["q3"] - 0.05, (0.62, 0.30, 0.27), "lin")], MONO)
    text("من کجام؟", L["q2"], L["q3"] - 0.05, out="cut")
    hit(L["q2"] - 0.04, 0.5, "punch")
    # match cut mirror -> mirror (phone lands where the phone was), slow pull back
    shot("shirtless", L["q3"] - 0.05, L["q4"] - 0.06,
         [(L["q3"] - 0.05, (0.69, 0.44, 0.33), "lin"), (L["q4"] - 0.06, (0.63, 0.49, 0.88), "inout")],
         MONO, par=0.016)
    text("چرا همیشه احساس می‌کنم", L["q3"], W("q3", 4), out="cut")
    text("باید بیشتر از این باشم؟", W("q3", 4), L["q4"] - 0.06, out="cut")
    hit(L["q3"] - 0.05, 0.25, "soft")
    # sudden silence
    text("من باید رشد کنم...", L["q4"], E["q4"] + 0.35, style="centre", y=0.5, size=60, weight="Medium",
         anim="rise")

    # rapid fire — one photo and one word per spoken word
    # people, not objects: the athlete's stance / him at his workspace (no zoom) / the forward lunge
    rapid = [("s1", "padel_front", (0.55, 0.52, 0.95), (0.55, 0.50, 0.82), "ورزش؟", 0.70, 0.13, 140, "out"),
             ("s2", "office", (0.45, 0.50, 1.00), (0.48, 0.50, 1.00), "تحصیل؟", 0.40, 0.20, 112, "lin"),
             ("s3", "padel_side", (0.42, 0.58, 1.00), (0.42, 0.55, 0.72), "کار؟", 0.72, 0.17, 190, "out")]
    nxt = {"s1": "s2", "s2": "s3", "s3": "s4"}
    for lid, src, c0, c1, word, x, y, size, ez in rapid:
        a, b = L[lid] - 0.04, L[nxt[lid]] - 0.04
        shot(src, a, b, [(a, c0, "lin"), (b, c1, ez)], (0.1, -0.15, 0.0), par=0.014 if src in MATTE else 0.0)
        text(word, L[lid], b, style="kinetic", x=x, y=y, size=size, weight="Black", anim="pop", out="cut")
        hit(a, 0.6, lid)
    a = L["s4"] - 0.04
    shot("money", a, L["q5"] - 0.05, [(a, (0.5, 0.50, 0.62), "lin"), (L["q5"] - 0.05, (0.5, 0.50, 0.52), "lin")],
         (0.15, -0.15, 0.4), vstart=1.0)
    text("پول؟", L["s4"], L["q5"] - 0.05, style="kinetic", y=0.24, size=160, weight="Black", out="cut")
    hit(a, 0.7, "s4")
    # freeze the money; the colour drains out
    fz = L["q5"] - 0.05
    shot("money", fz, L["q6"] - 0.06, [(fz, (0.5, 0.52, 0.52), "lin"), (L["q6"] - 0.06, (0.5, 0.55, 0.40), "inout")],
         (0.15, -0.15, 0.4), (0.0, -0.1, -0.2), vstart=1.0 + (fz - a), vrate=0.0, look="freeze")
    flashes.append(dict(t=fz, d=0.08, c=(1, 1, 1), s=0.35))
    hit(fz, 0.6, "tapestop")
    text("واقعاً چی؟", L["q5"], L["q6"] - 0.06, out="cut")
    # black: kinetic stack
    text("اصلاً", L["q6"], L["a1"] - 0.1, style="centre", y=0.39, size=72, weight="Bold", anim="pop", out="cut")
    text("رشد", W("q6", 1), L["a1"] - 0.1, style="centre", y=0.515, fit=0.62, weight="Black", anim="punch",
         out="cut")
    text("یعنی چی؟", W("q6", 2), L["a1"] - 0.1, style="centre", y=0.655, size=72, weight="Bold", anim="pop",
         out="cut")
    hit(W("q6", 1), 1.0, "boom")

    # ================================================================ AMBITION
    a0 = L["a1"] - 0.1
    up0, up1 = L["a2"] - 0.42, L["a2"] - 0.06
    shot("waterfall", a0, up1,
         [(a0, (0.43, 0.53, 0.27), "lin"), (up0, (0.43, 0.53, 0.22), "inout"), (up1, (0.56, 0.18, 0.42), "in")],
         (0.42, -0.1, 0.0), (0.5, -0.05, 0.0))
    text("رسیدن به قله؟", L["a1"], up0, out="fade")
    hit(a0, 0.5, "riser_hit")
    b0, b1 = L["a2"] - 0.06, L["a3"] - 0.04
    shot("padel_front", b0, b1, [(b0, (0.53, 0.42, 0.70), "lin"), (b1, (0.53, 0.40, 0.60), "lin")],
         (0.55, -0.05, 0.0), par=0.014)
    text("یک", L["a2"], W("a2", 2), y=0.72, out="cut")
    text("دستاورد", W("a2", 1), b1, style="huge", y=0.23, fit=0.92, weight="Black", anim="punch", out="cut",
         behind="padel_front")
    text("ورزشی؟", W("a2", 2), b1, y=0.72, out="cut")
    hit(b0, 0.6, "hit"); hit(W("a2", 1), 0.8, "boom_short")
    c0_, c1_ = L["a3"] - 0.04, L["a4"] - 0.04
    shot("office", c0_, c1_, [(c0_, (0.12, 0.47, 0.30), "lin"), (c1_, (0.13, 0.47, 0.25), "lin")], (0.5, -0.1, 0))
    text("یک مدرک؟", L["a3"], c1_, style="kinetic", x=0.56, y=0.30, size=96, weight="ExtraBold", out="cut")
    hit(c0_, 0.65, "hit")
    # three accelerating cuts on the money
    m = [c1_, c1_ + 0.42, c1_ + 0.80, L["g1"] - 0.10]
    for (vs, c) , i in zip([(9.4, (0.5, 0.66, 0.62)), (3.2, (0.5, 0.50, 0.32)), (11.6, (0.5, 0.72, 0.50))], range(3)):
        shot("money", m[i], m[i + 1], [(m[i], c, "lin"), (m[i + 1], (c[0], c[1], c[2] * 0.9), "lin")],
             (0.55, -0.05, 0.25), vstart=vs)
        hit(m[i], 0.45 + 0.15 * i, "hit")
    text("یک حساب بانکی", L["a4"], m[3], style="kinetic", y=0.30, size=82, weight="ExtraBold", out="cut")
    text("پر؟", W("a4", 3), m[3], style="kinetic", y=0.44, size=170, weight="Black", anim="punch", out="cut")

    # strength: punch-in on "قوی‌تر"
    g0_ = L["g1"] - 0.10
    pq = W("g2", 3)
    g_end = L["g3"] - 0.03
    shot("shirtless", g0_, pq, [(g0_, (0.60, 0.52, 1.00), "lin"), (pq, (0.60, 0.50, 0.90), "inout")],
         (0.6, 0.0, 0.0), par=0.016)
    shot("shirtless", pq, g_end, [(pq, (0.52, 0.56, 0.52), "lin"), (g_end, (0.52, 0.56, 0.48), "lin")],
         (0.65, 0.0, 0.0))
    hit(g0_, 0.7, "hit"); hit(pq, 0.75, "punch")
    text("شاید همه این‌ها", L["g1"], W("g1", 3), out="cut")
    text("بخشی از رشد باشن...", W("g1", 3), L["g2"] - 0.02, out="cut")
    text("شاید رشد یعنی", L["g2"], pq, out="cut")
    text("قوی‌تر شدن،", pq, g_end, style="kinetic", y=0.70, size=104, weight="Black", out="cut")
    # learning: speed ramp, then the freeze on "شکست خوردن"
    fr = WE("g4", 1)
    shot("padel_side", g_end, W("g4", 2) - 0.02,
         [(g_end, (0.42, 0.56, 1.00), "lin"), (g_end + 0.22, (0.42, 0.53, 0.80), "out"),
          (fr, (0.42, 0.53, 0.74), "lin")],
         (0.7, 0.05, 0.0), par=0.012, freeze=fr, look="freeze")
    flashes.append(dict(t=fr, d=0.08, c=(1, 1, 1), s=0.45))
    hit(g_end, 0.6, "hit"); hit(fr, 0.8, "freeze")
    text("یاد گرفتن،", L["g3"], L["g4"], out="cut")
    text("شکست خوردن", L["g4"], W("g4", 2) - 0.02, style="kinetic", y=0.70, size=96, weight="Black", out="cut")
    # back up
    u0 = W("g4", 2) - 0.02
    u1 = E["g4"] + 0.12
    shot("padel_front", u0, u1, [(u0, (0.55, 0.56, 1.00), "lin"), (u1, (0.54, 0.46, 0.74), "out")],
         (0.75, 0.1, 0.05), par=0.016)
    text("و دوباره بلند شدن.", u0, u1, out="cut")
    hit(u0, 0.8, "hit"); hit(E["g4"] - 0.05, 1.0, "peak")

    # ============================================ THE TWIST: stop everything
    stop = u1                      # music is cut here; hard black
    t1v = E["g4"] + 0.55           # a new world fades up
    MARK = dict(stop=stop, t1v=t1v)
    # intimate, warm: his face at the family table (we will only see the table later)
    shot("family", t1v, L["t2"] + 0.4,
         [(t1v, (0.175, 0.37, 0.40), "lin"), (L["t2"] + 0.4, (0.178, 0.37, 0.34), "lin")],
         WARM, fade_in=0.6)
    text("اما شاید", L["t1"], W("t1", 2), weight="Medium", anim="rise", warm=True)
    text("ما یه چیزی رو فراموش کردیم...", W("t1", 2), L["t2"] - 0.2, weight="Medium", anim="rise", warm=True)
    # "not only higher": the climb seen again — this time the camera comes DOWN
    w0, w1 = L["t2"] - 0.6, L["t3"] - 0.04
    shot("waterfall", w0, w1, [(w0, (0.58, 0.20, 0.44), "lin"), (w1, (0.44, 0.52, 0.30), "inout")],
         (0.75, 0.45, 0.05))
    text("شاید رشد", L["t2"], W("t2", 2), weight="Medium", anim="rise", warm=True)
    text("فقط بالاتر رفتن نیست.", W("t2", 2), w1, size=76, weight="Bold", anim="rise", warm=True)
    # match cut on the figure: arms open -> arms raised, the golden corridor
    x0, x1 = w1, L["w1"] - 0.05
    shot("tunnel", x0, x1, [(x0, (0.517, 0.50, 0.80), "lin"), (x1, (0.517, 0.45, 0.56), "inout")],
         WARM, par=0.016)
    text("شاید رشد یعنی", L["t3"], W("t3", 3), weight="Medium", anim="rise", warm=True)
    text("در کنار تمام هدف‌هات،", W("t3", 3), L["t4"], weight="Medium", anim="rise", warm=True)
    text("بتونی از زندگی", L["t4"], W("t4", 3), weight="Medium", anim="rise", warm=True)
    text("هم لذت ببری.", W("t4", 3), x1, weight="Medium", anim="rise", warm=True)

    # ============================================================ WHAT MATTERS
    f0, f1 = L["w1"] - 0.05, L["w2"] - 0.05
    shot("friends", f0, f1, [(f0, (0.50, 0.30, 0.56), "lin"), (f1, (0.48, 0.30, 0.50), "lin")], WARM)
    text("یعنی", L["w1"], f1, y=0.58, weight="Medium", anim="rise", warm=True)
    text("حال خوب...", W("w1", 1), f1, style="huge", y=0.68, fit=0.78, weight="ExtraBold", anim="rise",
         warm=True)
    shot("friends", f1, L["w3"] - 0.05,
         [(f1, (0.30, 0.52, 1.00), "lin"), (L["w3"] - 0.05, (0.60, 0.50, 0.95), "lin")], WARM)
    text("دوستانی که", L["w2"], W("w2", 2), weight="Medium", anim="rise", warm=True)
    text("کنارت هستن،", W("w2", 2), L["w3"] - 0.05, weight="Medium", anim="rise", warm=True)
    # the close-up from the twist widens: the whole family table
    shot("family", L["w3"] - 0.05, L["w4"] - 0.1,
         [(L["w3"] - 0.05, (0.20, 0.52, 1.00), "lin"), (L["w4"] - 0.1, (0.60, 0.52, 0.96), "lin")], WARM)
    text("خانواده‌ای که", L["w3"], W("w3", 2), weight="Medium", anim="rise", warm=True)
    text("دوستشون داری،", W("w3", 2), L["w4"] - 0.1, weight="Medium", anim="rise", warm=True)
    k0 = L["w4"] - 0.5
    shot("lake", k0, L["e1"] - 0.05, [(k0, (0.47, 0.55, 1.00), "lin"), (L["e1"] - 0.05, (0.50, 0.56, 0.90), "inout")],
         (0.95, 0.5, 0.05))
    text("آرامشی که", L["w4"], W("w4", 2), weight="Medium", anim="rise", warm=True)
    text("با هیچ دستاوردی", W("w4", 2), W("w4", 5), weight="Medium", anim="rise", warm=True)
    text("قابل خریدن نیست.", W("w4", 5), L["e1"] - 0.1, weight="Medium", anim="rise", warm=True)
    # callback to the opening question: the same mirror, the same word — now in warm light
    shot("bucks", L["e1"] - 0.05, L["e2"] - 0.05,
         [(L["e1"] - 0.05, (0.57, 0.45, 0.90), "lin"), (L["e2"] - 0.05, (0.57, 0.44, 0.84), "lin")],
         (0.85, 0.45, 0.05), par=0.014)
    text("شاید", L["e1"], W("e1", 1), weight="Medium", anim="rise", warm=True)
    text("خوشبختی", W("e1", 1), L["e2"] - 0.05, style="huge", y=0.22, fit=0.82, weight="Bold", anim="rise",
         out="cut", behind="bucks", warm=True)
    text("مقصد نباشه...", W("e1", 2), L["e2"] - 0.05, weight="Medium", anim="rise", out="cut", warm=True)
    shot("lake", L["e2"] - 0.05, L["e3"] + 0.1,
         [(L["e2"] - 0.05, (0.42, 0.62, 0.44), "lin"), (L["e3"] + 0.1, (0.42, 0.62, 0.40), "lin")],
         (1.0, 0.6, 0.05))
    text("شاید بخشی از مسیر باشه.", L["e2"], L["e3"] - 0.1, weight="Medium", anim="rise", warm=True)
    # the strongest portrait: a real laugh. Extremely slow push-in, hold, hard cut to black.
    o0 = L["e3"] - 0.8
    shot("office", o0, END_HOLD, [(o0, (0.60, 0.50, 1.00), "lin"), (END_HOLD, (0.70, 0.43, 0.50), "final")],
         WARM, par=0.012)
    text("و شاید رشد واقعی،", L["e3"], L["e4"] - 0.05, weight="Medium", anim="rise", warm=True)
    text("اینه که در مسیر", L["e4"], W("e4", 4), weight="Medium", anim="rise", warm=True)
    text("رسیدن به آدمی که", W("e4", 4), W("e4", 7), weight="Medium", anim="rise", warm=True)
    text("می‌خوای بشی،", W("e4", 7), L["e5"] - 0.05, weight="Medium", anim="rise", warm=True)
    text("خودت", L["e5"], END_HOLD, style="huge", y=0.21, fit=0.66, weight="Black", anim="rise", out="cut",
         behind="office", warm=True)
    text("رو فراموش نکنی.", W("e5", 1), END_HOLD, y=0.72, weight="SemiBold", anim="rise", out="cut", warm=True)

    MARK.update(L=L, E=E, end=END, end_hold=END_HOLD, hook_text=1.55, chi=3.25)
    return shots, texts, hits, flashes, MARK


if __name__ == "__main__":
    import sys
    S, T, H, F, M = build(sys.argv[1])
    print("duration %.2f s  (hold ends %.2f)" % (M["end"], M["end_hold"]))
    for s in S:
        print("%-12s %6.2f - %6.2f  (%.2f)" % (s["src"], s["t0"], s["t1"], s["t1"] - s["t0"]))
