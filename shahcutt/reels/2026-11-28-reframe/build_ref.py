#!/usr/bin/env python3
"""2026-11-28 reel, v2: the same voice and script, rebuilt in the look of Shahin's reference (light studio, ice-blue
3D type, blue stripes, full-frame 3D scenes, raw-vs-edited split cards, pixel-dissolve cuts, a ring end card).

usage: python3 build_ref.py [VOICE.wav] [WHISPER.json]     -> index.html, assets/music.wav, assets/sfx.wav, timing.json
Scenes are cut on the spoken words (script.json + Whisper). The 3D plates in assets/img come from scenes/scenes.html
(node scenes/render.cjs); a generated image with the same name can replace any of them.
"""
import json, os, random, sys
import numpy as np
import build as B

A = B.A; esc = B.esc
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
SR = B.SR


def ice(text, size, at=None, cls="", ltr=False):
    t = esc(text); d = f' data-at="{at:.3f}"' if at is not None else ""
    return (f'<span class="ice {cls}"{d} style="font-size:{size}px"{" dir=ltr" if ltr else ""}>'
            f'<span class="ex">{t}</span><span class="fc">{t}</span></span>')


def ln(text, cls, at=None):
    d = f' data-in="{at:.3f}"' if at is not None else ""
    return f'<div class="{cls}"{d}>{B.rich(text)}</div>'


def foot(cls, w, grey=False, ghosts=False, crop=True):
    h = round(w * 9 / 16); cw = round(h * 9 / 16); g = "_grey" if grey else ""
    s = f'<div class="foot {cls}" style="width:{w}px;height:{h}px"><img class="pl" src="assets/img/studio{g}.png" alt="">'
    if ghosts: s += '<img class="pp pg" src="assets/img/person.png" alt=""><img class="pp pg" src="assets/img/person.png" alt="">'
    s += f'<img class="pp" src="assets/img/person{g}.png" alt="">'
    if crop: s += f'<div class="crop" style="width:{cw}px;margin-left:{-cw / 2:.1f}px"><span class="tg">9:16</span></div><span class="tg t0">16:9</span>'
    return s + "</div>"


def vert(w, h):
    """the 9:16 crop of the studio plate, subject centred (plate scaled to the card height)"""
    pw = h * 16 / 9; left = (w - pw) / 2
    return (f'<div class="vin" style="width:{pw:.1f}px;height:{h}px;left:{left:.1f}px"><img class="pl" src="assets/img/studio.png" alt="">'
            f'<img class="pp" src="assets/img/person.png" alt=""></div>')


MARK = ('<svg class="mk" viewBox="0 0 200 200" width="230" height="230"><defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#1f6fe0"/></linearGradient></defs>'
        '<rect x="52" y="18" width="96" height="164" rx="24" fill="none" stroke="url(#mg)" stroke-width="16"/>'
        '<path d="M86 72 L124 100 L86 128 Z" fill="url(#mg)"/></svg>')
HAND = '<svg class="hand" width="96" height="124" viewBox="0 0 60 78"><path d="M3 3 L3 62 L18 48 L29 74 L40 69 L29 44 L49 44 Z" /></svg>'


def main():
    vpath = sys.argv[1] if len(sys.argv) > 1 else A("assets", "voiceover.wav")
    wjson = sys.argv[2] if len(sys.argv) > 2 else A("vo_words.json")
    if os.path.abspath(vpath) != A("assets", "voiceover.wav"): B.write_wav(A("assets", "voiceover.wav"), B.read_audio(vpath))
    words = B.align(B.SCRIPT["segments"], wjson, 0.0, A("assets", "voiceover.wav"))
    lines, beats, last = B.timing(words)
    by = {}
    for w in words: by.setdefault(w["seg"], []).append(w)
    t = lambda ref: B.word_time(by, ref)
    voice = B.read_audio(A("assets", "voiceover.wav")); vo_dur = len(voice) / SR
    total = round(last + 2.7, 2)
    end_at = round(words[-1]["e"] + 0.55, 3)
    ui = {b["at"].split(":")[0]: b for b in beats if b["kind"] == "ui" and b["view"] in ("menu", "dialog")}
    cut = [("hook", 0.0), ("button", t("s2:پریمیر") - 0.05), ("center", t("s2:سوژه") - 0.05), ("hill", t("s3:من") - 0.05),
           ("clock", t("s3:این") - 0.05), ("step1", t("s4:یک:") - 0.05), ("step2", t("s5:دو:") - 0.05), ("step3", t("s6:سه:") - 0.05),
           ("fast", t("s7:اگه") - 0.05), ("split", t("s8:پریمیر") - 0.05), ("cta", t("s9:کلمه‌ی") - 0.05), ("loop", t("s10:دیگه") - 0.05),
           ("end", end_at)]
    PIX = {"hill", "step1", "cta", "end"}                       # these cuts get the pixel dissolve, the rest a push
    K = {"press": t("s2:دکمه"), "morph": t("s2:عمودیش"), "count": t("s3:۵۰۰"), "click3": t("s3:سه"), "kli": t("s3:کلی"),
         "taand": t("s7:تند"), "faster": t("s7:فستر"), "amudi": t("s8:عمودی"), "dast": t("s8:دست"), "tools": t("s9:۷"),
         "word": t("s9:«پریمیر»"), "dige": t("s10:دیگه"), "dasti": t("s10:دستی"), "krap": t("s10:کراپ")}
    K = {k: round(v, 3) for k, v in K.items()}
    scenes = []
    for i, (name, st) in enumerate(cut):
        en = cut[i + 1][1] if i + 1 < len(cut) else total
        scenes.append({"name": name, "start": round(st, 3), "end": round(en, 3), "pix": name in PIX})
    S = {s["name"]: s for s in scenes}
    for k, seg in (("step1", "s4"), ("step2", "s5"), ("step3", "s6")): S[k]["acts"] = ui[seg]["acts"]; S[k]["view"] = ui[seg]["view"]

    # ---------------------------------------------------------------- scene markup
    sp = lambda k: S[k]["start"] + 0.12
    inner = {
        "hook": ('<div class="bg light"></div><div class="hk">' + ln("ویدیوی افقی رو", "l1") + ice("دستی", 300) + ln("کراپ نکن!", "l2") + "</div>"
                 + foot("f-hook", 900)),
        "button": ('<div class="bg stripes"><i class="floor"></i></div><div class="btxt"><span class="pill">Premiere Pro</span>'
                   + ln("یه [دکمه] داره", "l2 w", sp("button")) + "</div>"
                   f'<div class="mA"><img src="assets/img/studio_person.png" alt=""></div><div class="mB">{vert(360, 640)}</div>'
                   '<div class="gbtn"><svg width="64" height="64" viewBox="0 0 64 64"><path d="M6 22 V6 H22 M42 6 H58 V22 M58 42 V58 H42 M22 58 H6 V42" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                   '<span>Auto Reframe</span></div><div class="brip"></div>' + HAND),
        "center": (f'<div class="cv"><div class="world">{vert(1080, 1920).replace("vin", "vin w2")}</div></div>'
                   '<div class="fr916"><i class="c c1"></i><i class="c c2"></i><i class="c c3"></i><i class="c c4"></i><span class="tg">9:16</span></div>'
                   '<div class="ctxt"><i class="fade"></i>' + ln("سوژه همیشه", "l1", sp("center")) + ice("وسط کادر", 200, sp("center") + 0.25) + "</div>"),
        "hill": ('<div class="plate"><img src="assets/img/hill.png" alt=""></div><div class="htxt">'
                 + ice("۰+", 330, K["count"] - 0.05, "num", ltr=True) + ln("پروژه‌ی ادیت، توی ۳ استودیو", "l2", K["count"] + 0.35) + "</div>"),
        "clock": ('<div class="plate"><img src="assets/img/clock.png" alt=""></div><div class="ktxt"><div class="kn">'
                  + ice("۳", 420, K["click3"] - 0.05) + ln("کلیک", "kw", K["click3"] + 0.2) + "</div>"
                  + ln("کلی [وقتت] رو نجات می‌ده", "kl", K["kli"]) + "</div>"),
        "fast": ('<div class="bg light"></div><div class="ftxt">' + ln("سوژه‌ت [تند] حرکت می‌کنه؟", "l1", sp("fast"))
                 + ice("Faster Motion", 150, K["faster"] - 0.05, "lat", ltr=True) + "</div>" + foot("f-fast", 900, ghosts=True)),
        "split": ('<div class="bg light"></div>' + ln("سکانس اصلی · ۱۶:۹", "lab0", sp("split"))
                  + f'<div class="c16">{foot("f-split", 600, grey=True, crop=False)}</div>'
                  f'<div class="c916">{vert(400, 711)}<span class="tg">9:16</span></div>'
                  + ln("سکانس [عمودی] جدید", "lab1", K["amudi"]) + ln("✓ سکانس اصلی دست‌نخورده", "lab2", K["dast"])),
        "cta": ('<div class="plate"><img src="assets/img/tvs.png" alt=""></div><div class="ctop">' + ice("۷ ابزار", 230, sp("cta") + 0.1)
                + ln("خودکار پریمیر، با مسیر دقیق", "l2", sp("cta") + 0.4) + "</div>"
                '<div class="cbox"><div class="av"></div><div class="field"><div class="word">پریمیر</div><div class="caret"></div></div>'
                '<div class="send"><svg width="56" height="56" viewBox="0 0 64 64"><path d="M54,10 L8,30 L26,36 L32,56 Z" fill="#fff" /></svg></div></div>'),
        "loop": ('<div class="bg stripes"><i class="floor"></i></div><div class="lp">' + ln("دیگه", "w1", K["dige"] - 0.05)
                 + ice("دستی", 330, K["dasti"] - 0.05) + ln("کراپ نکن", "w2", K["krap"] - 0.05) + "</div>"),
        "end": ('<div class="bg sky"></div><div class="mark"><i class="rp r1"></i><i class="rp r2"></i>' + MARK + "</div>"
                '<div class="handle" dir="ltr">' + "".join(f"<span>{c}</span>" for c in "@shahcutt") + "</div>"
                + ln("تدوین ریلز · موشن گرافیک", "sub", end_at + 0.9)),
    }
    heads = {"step1": ("۱", "راست‌کلیک روی [سکانس]"), "step2": ("۲", "نسبت تصویر رو [عمودی] کن"), "step3": ("۳", "دیفالت، بعد [کریت]")}
    for k, (n, h) in heads.items():
        b = ui[{"step1": "s4", "step2": "s5", "step3": "s6"}[k]]
        inner[k] = ('<div class="bg light"></div><div class="bignum">' + ice(n, 760, None, "faint") + "</div>"
                    f'<div class="stxt"><span class="pill">مرحله {n}</span>' + ln(h, "l2", sp(k)) + "</div>"
                    f'<div class="ui v-{b["view"]}">{B.ui_html(b)}</div>')
    sh = []
    for i, s in enumerate(scenes):
        sh.append(f'<div id="sc{i}" class="clip scene sc-{s["name"]}" data-start="{s["start"]:.3f}" data-duration="{s["end"] - s["start"]:.3f}" '
                  f'data-track-index="1"><div class="si">{inner[s["name"]]}</div></div>')
    # pixel dissolves: a 9x16 grid of squares that fill in over the outgoing scene and clear off the new one
    rnd = random.Random(11); px = []; trs = []
    for s in scenes:
        if not s["pix"]: continue
        tc = s["start"]; trs.append(tc); sq = []
        for r in range(16):
            for c in range(9):
                d1 = rnd.random() * 0.2; d2 = rnd.random() * 0.2; col = rnd.choice(["#ffffff", "#d6eeff", "#9fd3ff", "#4aa3f5", "#2f8cff"])
                sq.append(f'<i style="left:{c * 120}px;top:{r * 120}px;background:{col}" data-a="{d1:.3f}" data-b="{d2:.3f}"></i>')
        px.append(f'<div class="clip pix" data-start="{tc - 0.34:.3f}" data-duration="0.62" data-track-index="8" data-tc="{tc:.3f}">{"".join(sq)}</div>')
    caps = []
    dark = [(S[k]["start"], S[k]["end"]) for k in ("button", "clock", "cta", "loop")]   # blue stripes, the dark clock, the blue TV screens
    for i, L in enumerate(lines):
        ws = "".join(f'<span class="w{" hi" if w["hi"] else ""}"><i></i><span>{esc(w["t"])}</span></span>' for w in L["words"])
        od = " on-dark" if any(a <= L["start"] < b for a, b in dark) else ""
        caps.append(f'<div id="cap{i}" class="clip cap{od}" data-start="{L["start"] - 0.06:.3f}" data-duration="{L["hold"] - L["start"] + 0.06:.3f}" data-track-index="9"><div class="cap-in">{ws}</div></div>')
    T = {"total": total, "scenes": scenes, "k": K, "end": end_at,
         "lines": [{"start": L["start"], "hold": L["hold"], "w": [[w["s"], w["e"]] for w in L["words"]]} for L in lines]}
    tpl = open(A("src", "ref.html"), encoding="utf-8").read()
    html = (tpl.replace("__TOTAL__", f"{total:.3f}").replace("__VO_DUR__", f"{min(vo_dur, total):.3f}")
            .replace("<!--__SCENES__-->", "\n      ".join(sh)).replace("<!--__PIX__-->", "\n      ".join(px))
            .replace("<!--__CAPTIONS__-->", "\n      ".join(caps)).replace("/*__TIMING__*/null", json.dumps(T, ensure_ascii=False)))
    open(A("index.html"), "w", encoding="utf-8").write(html)
    make_audio(total, scenes, K, trs, end_at, voice)
    json.dump(dict(T, words=words), open(A("timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"total={total:.2f}s voice={vo_dur:.2f}s scenes={len(scenes)} end card at {end_at:.2f}s")
    for s in scenes: print(f"  {s['start']:6.2f}-{s['end']:6.2f} {s['name']}{'  (pixel cut)' if s['pix'] else ''}")


# ---------------------------------------------------------------- sound: a bright bed and the reference's kind of sound design
def glitch(d=0.5):
    """pixel-dissolve sound: a spray of short square blips at seeded random pitches"""
    out = np.zeros(int(d * SR)); r = np.random.default_rng(3)
    for k in range(int(d * 70)):
        s = int(r.uniform(0, d - 0.03) * SR); n = int(r.uniform(0.008, 0.025) * SR); f = r.choice([880, 1175, 1568, 2093, 2637, 3136])
        x = np.arange(n) / SR; out[s:s + n] += np.sign(np.sin(2 * np.pi * f * x)) * np.exp(-x * 90) * 0.5
    return out * np.sin(np.pi * np.arange(len(out)) / len(out)) ** 0.7


def bloom(d=1.6):
    x = B.xs(d); return sum(np.sin(2 * np.pi * f * x) * g for f, g in ((523.25, 1), (659.25, 0.7), (783.99, 0.6), (1046.5, 0.35))) * np.exp(-x * 2.2) * np.minimum(1, x / 0.01)


def make_audio(total, scenes, K, trs, end_at, voice):
    n = int(total * SR); mus, sfx = np.zeros(n), np.zeros(n)
    def add(buf, sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: buf[s:e] += g * sig[: e - s]
    bpm = 100; b = 60 / bpm
    chords = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]]   # C Am F G
    t0 = 0.0; k = 0
    while t0 < total:
        ch = chords[k % 4]; add(mus, B.pad([c / 2 for c in ch], 4 * b + 0.6), t0, 0.16)
        for j in range(8):
            add(mus, B.pluck(ch[j % 3] * (2 if j % 4 == 3 else 1), 0.35, 0.7), t0 + j * b / 2, 0.07)
        if t0 < end_at - 0.2:
            for j in range(4): add(mus, B.kick(), t0 + j * b, 0.28); add(mus, B.hat(), t0 + j * b + b / 2, 0.09)
        t0 += 4 * b; k += 1
    fi = int(0.3 * SR); mus[:fi] *= np.linspace(0, 1, fi); fo = int(1.4 * SR); mus[-fo:] *= np.linspace(1, 0, fo)
    add(sfx, B.impact(), 0.0, 0.35)
    for s in scenes[1:]:
        if s["pix"]: add(sfx, glitch(0.62), s["start"] - 0.34, 0.5)
        else: add(sfx, B.whoosh(0.4, 4, 18), s["start"] - 0.22, 0.42)
    S = {s["name"]: s for s in scenes}
    add(sfx, B.click(2400), K["press"], 0.6); add(sfx, B.pop(520), K["press"] + 0.02, 0.4)               # the big button
    add(sfx, B.whoosh(0.35, 6, 20), K["morph"] - 0.05, 0.4); add(sfx, B.pop(880), K["morph"] + 0.3, 0.35)  # 16:9 -> 9:16
    add(sfx, B.pop(700), S["center"]["start"] + 0.35, 0.3)
    for i in range(14): add(sfx, B.tick(1300 + 40 * i), K["count"] + i * 0.06, 0.22)                     # 0 -> 500
    add(sfx, B.impact(), K["count"] - 0.02, 0.3)
    add(sfx, B.impact(), K["click3"] - 0.02, 0.32); add(sfx, B.click(2800), K["click3"] + 0.25, 0.35)
    for name in ("step1", "step2", "step3"):
        for x in S[name]["acts"]:
            add(sfx, B.whoosh(0.3, 6, 22), x["t"] - 0.42, 0.1); add(sfx, B.click(2800 if x["a"] != "rc" else 2300), x["t"], 0.5)
            if x["a"] in ("rc", "open"): add(sfx, B.pop(760), x["t"] + 0.05, 0.22)
            if x["a"] == "pick": add(sfx, B.pop(980), x["t"] + 0.06, 0.25)
            if x["a"] == "btn": add(sfx, B.chime(1568.0, 0.9), x["t"] + 0.06, 0.22)
    for i in range(5): add(sfx, B.whoosh(0.22, 8, 26), S["fast"]["start"] + 0.2 + i * 0.4, 0.14)        # whip moves
    add(sfx, B.impact(), K["faster"] - 0.02, 0.28)
    add(sfx, B.riser(0.6), K["amudi"] - 0.55, 0.25); add(sfx, B.pop(900), K["amudi"], 0.35); add(sfx, B.chime(1318.5, 0.8), K["dast"] + 0.05, 0.18)
    for i in range(6): add(sfx, B.click(), K["word"] + 0.04 + i * 0.085, 0.3)
    add(sfx, B.chime(1568.0, 1.0), K["word"] + 0.6, 0.22)
    add(sfx, B.impact(), K["dasti"] - 0.02, 0.32)
    add(sfx, bloom(), end_at + 0.05, 0.3); add(sfx, B.whoosh(0.6, 3, 12), end_at + 0.1, 0.25)
    for i in range(9): add(sfx, B.tick(2000 + 50 * i), end_at + 0.45 + i * 0.05, 0.12)
    mus *= 0.30 / max(1e-6, np.abs(mus).max())
    v = np.pad(voice[:n], (0, max(0, n - len(voice)))); hop = int(0.01 * SR); kk = n // hop
    e = np.sqrt((v[: kk * hop].reshape(kk, hop) ** 2).mean(1)); on = np.convolve((e > e.max() * 10 ** (-30 / 20)).astype(float), np.ones(35) / 35, "same")
    mus[: kk * hop] *= np.repeat(1 - 0.55 * np.clip(on * 1.5, 0, 1), hop)
    sfx *= 10 ** (-15 / 20) / max(1e-6, np.abs(sfx).max())
    B.write_wav(A("assets", "music.wav"), mus); B.write_wav(A("assets", "sfx.wav"), sfx)


if __name__ == "__main__":
    main()
