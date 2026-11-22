#!/usr/bin/env python3
"""«قبل و بعد از ادیت»: a custom film on top of the reel engine.

The same sentence is shown finished, then flat, then rebuilt live inside an editor (cursor, inspector, timeline with
keyframes and a waveform), then flat again and finished again (the one big reveal). The music is built layer by layer
with the steps and stops dead on every «before».

usage: python3 film.py VOICE.wav WHISPER.json   -> assets/voiceover.wav, music.wav, sfx.wav, index.html, timing.json
Motion language: Energetic. Entrances 0.1-0.25 s expo-out, overshoot only on hero hits, hard cuts with an RGB glitch
only at the two contrast cuts, one wow moment (the final reveal). Grid: 120 BPM, every hit lands on a beat."""
import json, os, shutil, sys
import numpy as np
import build as E   # the reel engine in this folder: timing, audio helpers, captions

A = E.A; SR = E.SR; S = E.SCRIPT
BEAT = 0.5          # 120 BPM
rng = np.random.default_rng(7)


def cue_times(words):
    by = {}
    for w in words: by.setdefault(w["seg"], []).append(w)
    return {k: round(E.word_time(by, v) - 0.04, 3) for k, v in S["cues"].items()}


def grid(a, b, step=BEAT):
    k = int(np.ceil(a / step - 1e-6)); out = []
    while k * step < b - 1e-6: out.append(round(k * step, 3)); k += 1
    return out


def hits_for(C, total):
    return {
        "a1": grid(0.5, C["tB1"] - 0.15),
        "s2": grid(C["tMove"], C["tS3"] - 0.15),
        "s3": grid(C["tSound"], C["tAgain"] - 0.1),
        "a2": [C["tA2"]] + grid(C["tA2"] + 0.4, C["tCta"] - 0.1),
        "cta": grid(C["tCta"] + 0.5, total - 1.2, 1.0),
    }


# ------------------------------------------------------------------ music: one groove, built layer by layer
def note(f): return 440.0 * 2 ** ((f - 69) / 12)
def env(n, a=0.004, r=0.2):
    x = np.arange(n) / SR; return np.minimum(1, x / a) * np.exp(-x / r)
def saw(f, d, h=8):
    x = E.xs(d); return sum(np.sin(2 * np.pi * f * k * x) / k for k in range(1, h + 1)) * 0.6
def clap():
    x = E.xs(0.22); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(6) / 6, "same")
    e = sum(np.exp(-np.clip(x - o, 0, None) * 60) * (x >= o) for o in (0, 0.012, 0.024)) / 3
    return s * e * 0.9
def sub_kick():
    x = E.xs(0.5); f = 42 + 110 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 6) + np.sin(2 * np.pi * 3000 * x) * np.exp(-x * 400) * 0.2
def crash(d=1.8):
    x = E.xs(d); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(3) / 3, "same"); return s * np.exp(-x * 2.6) * 0.6
def zap(d=0.26):
    x = E.xs(d); s = rng.uniform(-1, 1, len(x)); gate = (np.floor(x * 38) % 2 == 0).astype(float)
    tone = np.sign(np.sin(2 * np.pi * (180 + 900 * x / d) * x)) * 0.5
    y = (s * 0.6 + tone) * gate * np.exp(-x * 7); return np.round(y * 6) / 6
def boing(f0=300, f1=900, d=0.22):
    x = E.xs(d); f = f0 + (f1 - f0) * (1 - np.exp(-x * 25)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 14)


def stems(total):
    n = int(total * SR); L = {k: np.zeros(n) for k in ("kick", "clap", "hat", "bass", "arp", "pad")}
    def put(k, sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: L[k][s:e] += g * sig[: e - s]
    prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (60, [60, 64, 67]), (55, [55, 59, 62])]   # Am F C G, 1 bar = 2 s
    bar = 4 * BEAT; t = 0.0; i = 0
    while t < total:
        root, ch = prog[i % 4]
        put("pad", E.pad([note(m) for m in ch] + [note(root - 12)], bar + 0.6), t, 0.5)
        for b in range(4):
            tb = t + b * BEAT
            put("kick", sub_kick(), tb, 0.9)
            if b in (1, 3): put("clap", clap(), tb, 0.55)
            put("hat", E.hat(), tb + BEAT / 2, 0.35); put("hat", E.hat(), tb + BEAT * 0.75, 0.12)
            for h in (0, 1):
                bn = root - 24 + (12 if (b * 2 + h) % 4 == 3 else 0)
                sg = saw(note(bn), BEAT / 2) * env(int(BEAT / 2 * SR), 0.003, 0.09); put("bass", sg, tb + h * BEAT / 2, 0.55)
        arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
        for j, m in enumerate(arp): put("arp", E.pluck(note(m + 12), 0.4, 0.6), t + j * BEAT / 2, 0.22)
        t += bar; i += 1
    return L


def mask(n, wins, ramp=0.02):
    m = np.zeros(n); r = int(ramp * SR)
    for a, b in wins:
        s, e = max(0, int(a * SR)), min(n, int(b * SR))
        if e <= s: continue
        seg = np.ones(e - s)
        k = min(r, len(seg) // 2)
        if k: seg[:k] = np.linspace(0, 1, k); seg[-k:] = np.linspace(1, 0, k)
        m[s:e] = np.maximum(m[s:e], seg)
    return m


def tape_stop(x, t, d=0.42):
    """the music under it slows to a stop: read the next stretch at a falling rate"""
    s = int(t * SR); m = int(d * SR); seg = x[s: s + m * 2]
    if len(seg) < 4: return np.zeros(m)
    rate = np.linspace(1, 0, m) ** 1.3; pos = np.cumsum(rate); pos = np.clip(pos, 0, len(seg) - 2)
    i = pos.astype(int); f = pos - i; y = seg[i] * (1 - f) + seg[i + 1] * f
    return y * np.linspace(1, 0, m) ** 0.5


def make_audio(total, C, H, voice):
    n = int(total * SR); L = stems(total); end = total
    full = [(0, C["tB1"]), (C["tA2"], end)]
    W = {"pad": full + [(C["tSteps"], C["tB2"])],
         "arp": full + [(C["tBig"], C["tAgain"])],
         "hat": full + [(C["tS2"], C["tAgain"])], "bass": full + [(C["tS2"], C["tAgain"])],
         "kick": full + [(C["tS3"], C["tAgain"])], "clap": full + [(C["tS3"], C["tAgain"])]}
    raw = sum(L[k] for k in L)
    mus = sum(L[k] * mask(n, W[k]) for k in L)
    for t in (C["tB1"], C["tB2"]):                       # the music stops dead on every «before»
        y = tape_stop(raw, t); s = int(t * SR); e = min(n, s + len(y)); mus[s:e] += y[: e - s] * 0.9
    fo = int(1.4 * SR); mus[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    fi = int(0.05 * SR); mus[:fi] *= np.linspace(0, 1, fi)
    # duck under the voice
    v = np.pad(voice[:n], (0, max(0, n - len(voice)))); hop = int(0.01 * SR); kk = n // hop
    e_ = np.sqrt((v[: kk * hop].reshape(kk, hop) ** 2).mean(1)); on = np.convolve((e_ > e_.max() * 10 ** (-30 / 20)).astype(float), np.ones(25) / 25, "same")
    mus[: kk * hop] *= np.repeat(1 - 0.5 * np.clip(on * 1.5, 0, 1), hop)
    mus *= 0.32 / max(1e-6, np.abs(mus).max())

    sfx = np.zeros(n)
    def add(sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: sfx[s:e] += g * sig[: e - s]
    add(E.impact(), 0.0, 0.55); add(crash(1.2), 0.0, 0.25)
    for k, h in enumerate(H["a1"] + H["s3"] + H["a2"][1:]):
        add(E.whoosh(0.26, 4, 18), h - 0.12, 0.32) if k % 2 == 0 else (add(E.click(2600), h, 0.42), add(E.pop(900), h, 0.22))
    for t in (C["tB1"], C["tB2"]): add(zap(), t - 0.02, 0.5)
    add(E.whoosh(0.5, 2, 10), C["tSteps"] - 0.05, 0.4)
    for t in (C["tS1"], C["tS2"], C["tS3"]): add(E.pop(700), t, 0.4); add(E.tick(2400), t + 0.03, 0.3)
    buzz = np.sign(np.sin(2 * np.pi * 150 * E.xs(0.16))) * np.exp(-E.xs(0.16) * 8) * 0.5
    add(buzz, C["tBigAll"], 0.5); add(buzz, C["tBigAll"] + 0.2, 0.5); add(E.impact(), C["tBigAll"], 0.35)
    add(E.boing(500, 900, 0.25) if hasattr(E, "boing") else boing(500, 900, 0.25), C["tWhole"], 0.25)
    for j in range(3): add(E.pop(620 + 160 * j), C["tThree"] + 0.14 * j, 0.35)
    add(E.whoosh(0.4, 3, 12), C["tBuild"], 0.3)
    for t in (C["tClick"] - 0.1, C["tClick"] + 0.06): add(E.click(3800), t, 0.55)
    add(boing(280, 820), C["tBig"], 0.45); add(E.chime(1760, 0.5), C["tColor"] + 0.02, 0.18)
    add(E.whoosh(0.4, 3, 14)[::-1], C["tAgain"] - 0.1, 0.35)
    add(E.riser(max(0.4, C["tB2"] - C["tAgain"])), C["tAgain"], 0.35)
    add(E.whoosh(0.5, 2, 16)[::-1], C["tA2"] - 0.5, 0.45)
    add(E.impact(), C["tA2"], 0.9); add(sub_kick(), C["tA2"], 0.7); add(crash(2.0), C["tA2"], 0.45)
    add(E.whoosh(0.45, 2, 12), C["tCta"] - 0.15, 0.35)
    for i in range(5): add(E.click(), C["tWord"] + 0.04 + i * 0.1, 0.32)
    add(E.chime(1568.0, 1.0), C["tWord"] + 0.6, 0.25)
    sfx *= 10 ** (-15 / 20) / max(1e-6, np.abs(sfx).max())
    E.write_wav(A("assets", "music.wav"), mus); E.write_wav(A("assets", "sfx.wav"), sfx)


# ------------------------------------------------------------------ html
CLIP_X0, CLIP_W = 0, 690     # the timeline's clip area (px inside .lanes)

def build_html(total, lines, C, H, vo_dur):
    tpl = open(A("src", "film.html"), encoding="utf-8").read()
    span = C["tAgain"] - C["tSteps"]
    X = lambda t: round(CLIP_X0 + CLIP_W * min(1, max(0, (t - C["tSteps"]) / span)), 1)
    kf_v1 = f'<i class="kf" id="kf1" style="left:{X(C["tBig"])}px"></i>'
    kf_v2 = "".join(f'<i class="kf kf2" style="left:{X(h)}px"></i>' for h in H["s2"])
    wav = "".join(f'<i class="wv" style="left:{X(h) - 9}px"><b></b><b></b><b></b><b></b></i>' for h in H["s3"])
    seeded = np.random.default_rng(11)
    sparks = "".join(f'<i class="sp" style="left:{seeded.uniform(4, 96):.1f}%;top:{seeded.uniform(10, 95):.1f}%;--s:{seeded.uniform(0.5, 1.4):.2f}"></i>' for _ in range(36))
    burst = "".join('<i class="pt"></i>' for _ in range(64))
    caps = []
    for i, Ln in enumerate(lines):
        ws = "".join(f'<span class="w{" hi" if w["hi"] else ""}"><i></i><span>{E.esc(w["t"])}</span></span>' for w in Ln["words"])
        caps.append(f'<div id="cap{i}" class="clip cap" data-start="{Ln["start"] - 0.06:.3f}" data-duration="{Ln["hold"] - Ln["start"] + 0.06:.3f}" data-track-index="9"><div class="cap-in">{ws}</div></div>')
    T = {"total": total, "C": C, "H": H, "span": span, "clipW": CLIP_W,
         "lines": [{"start": Ln["start"], "hold": Ln["hold"], "w": [[w["s"], w["e"]] for w in Ln["words"]]} for Ln in lines]}
    html = (tpl.replace("__TOTAL__", f"{total:.3f}").replace("__VO_DUR__", f"{vo_dur:.3f}")
            .replace("<!--__KF1__-->", kf_v1).replace("<!--__KF2__-->", kf_v2).replace("<!--__WAVES__-->", wav)
            .replace("<!--__SPARKS__-->", sparks).replace("<!--__BURST__-->", burst)
            .replace("<!--__CAPTIONS__-->", "\n      ".join(caps)).replace("/*__TIMING__*/null", json.dumps(T, ensure_ascii=False)))
    open(A("index.html"), "w", encoding="utf-8").write(html)
    return T


def main():
    vpath, wjson = sys.argv[1], sys.argv[2]
    E.write_wav(A("assets", "voiceover.wav"), E.read_audio(vpath)); shutil.copy(wjson, A("vo_words.json"))
    words = E.align(S["segments"], A("vo_words.json"), 0.0, A("assets", "voiceover.wav"))
    lines, _, last = E.timing(words)
    for Ln in lines: Ln["start"] = Ln["start"]
    voice = E.read_audio(A("assets", "voiceover.wav")); vo_dur = len(voice) / SR
    total = round(last + S.get("tail", 2.4), 2)
    C = cue_times(words); H = hits_for(C, total)
    make_audio(total, C, H, voice)
    T = build_html(total, lines, C, H, min(vo_dur, total))
    json.dump(dict(T, words=words), open(A("timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"total={total:.2f}s voice={vo_dur:.2f}s")
    for k, v in C.items(): print(f"  {k:7s} {v:6.2f}")


if __name__ == "__main__":
    main()
