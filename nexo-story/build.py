#!/usr/bin/env python3
"""NEXO story reel: word timings, captions, scene times, music, SFX and index.html.
usage: python3 build.py   (needs assets/voiceover.wav = cleaned + tightened Gemini take, vo_words.json = whisper words of it)
Voice pipeline: gen_vo.py -> tools/clean_take.py -> tools/tighten.py -> whisper (yerevan-christmas/tools/asr.py)."""
import json, os, re, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); A = lambda *p: os.path.join(HERE, *p)
sys.path.insert(0, A("tools"))
from align import align  # noqa: E402

SCRIPT = json.load(open(A("script.json"), encoding="utf-8")); SR = 44100


def read_audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def write_wav(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def timing(words):
    by = {}
    for w in words: by.setdefault(w["seg"], []).append(w)
    lines = []
    for s in SCRIPT["segments"]:
        ws = by[s["id"]]; k = 0
        for li, line in enumerate(s["captions"]):
            hi = False; items = []
            for tok in line.split():
                o, c = tok.count("["), tok.count("]"); w = ws[k]; k += 1
                if re.sub(r"[\[\]]", "", tok) != w["w"]: sys.exit(f"caption mismatch {s['id']}:{li} {tok!r} != {w['w']!r}")
                items.append({"t": re.sub(r"[\[\]]", "", tok), "s": w["s"], "e": w["e"], "hi": hi or o > 0}); hi = (hi or o > 0) and not c
            lines.append({"words": items, "start": items[0]["s"], "end": items[-1]["e"]})
        if k != len(ws): sys.exit(f"{s['id']}: captions cover {k}/{len(ws)} words")
    for a, b in zip(lines, lines[1:]): a["hold"] = b["start"] if b["start"] - a["end"] < 0.9 else a["end"] + 0.35
    lines[-1]["hold"] = lines[-1]["end"] + 0.5
    an = {}
    for name, ref in SCRIPT["anchors"].items():
        sid, w = ref.split(":"); hits = [x for x in by[sid] if x["w"] == w]
        if not hits: sys.exit(f"anchor {name} {ref} missing")
        an[name] = hits[0]["s"]
    sc = []
    for i, d in enumerate(SCRIPT["scenes"]):
        ws = [w for sid in d["segs"] for w in by[sid]]; sc.append({"id": d["id"], "first": ws[0]["s"], "last": ws[-1]["e"]})
    for i, s in enumerate(sc): s["start"] = 0.0 if i == 0 else round(min(s["first"] - 0.15, (sc[i - 1]["last"] + s["first"]) / 2), 3)
    return lines, an, sc


# ---------------------------------------------------------------- music: D Hijaz plucks; tense -> lift at NEXO -> full at "free" -> resolve
rng = np.random.default_rng(9)
def xs(d): return np.arange(int(d * SR)) / SR
def pluck(f, d=0.9, bright=0.5):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(d * SR))
    for i in range(len(out)):
        j = i % N; nx = (j + 1) % N; out[i] = buf[j]; buf[j] = 0.996 * (bright * buf[j] + (1 - bright) * buf[nx])
    return out * np.minimum(1, xs(d) / 0.002)
def pad(fs, d):
    x = xs(d); s = sum(np.sin(2 * np.pi * (f + det) * x + rng.uniform(0, 6)) for f in fs for det in (-0.6, 0, 0.7))
    return s / (3 * len(fs)) * np.minimum(1, x / 1.0) * np.minimum(1, (d - x) / 1.0)
def doum():
    x = xs(0.35); f = 70 + 60 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)
def tek():
    x = xs(0.09); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(3) / 3, "same"); return (s * 0.6 + np.sin(2 * np.pi * 1900 * x) * 0.5) * np.exp(-x * 60)
def whoosh(d=0.5, lo=3, hi=14):
    x = xs(d); s = rng.uniform(-1, 1, len(x)); y = np.zeros_like(s); ks = np.interp(np.arange(len(x)), [0, len(x) / 2, len(x)], [1 / hi, 1 / lo, 1 / hi])
    for i in range(1, len(x)): y[i] = y[i - 1] + ks[i] * (s[i] - y[i - 1])
    return y * np.sin(np.pi * x / d) ** 2 * 3
def pop(f=600): x = xs(0.12); return np.sin(2 * np.pi * (f + 900 * np.exp(-x * 60)) * x) * np.exp(-x * 36)
def chime(f=1318.5, d=1.0):
    x = xs(d); return sum(np.sin(2 * np.pi * f * m * x) * g for m, g in ((1, 1), (2.76, 0.3), (5.4, 0.1))) * np.exp(-x * 4.5) * np.minimum(1, x / 0.002)
def tick(f): x = xs(0.18); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 3 * f * x) * np.exp(-x * 40)) * np.exp(-x * 22) * np.minimum(1, x / 0.001)
def shimmer(d=1.0):
    out = np.zeros(int(d * SR))
    for i in range(14):
        c = chime(2200 + 260 * (i % 6), 0.5) * 0.25; s = int(i * d / 14 * SR); e = min(len(out), s + len(c)); out[s:e] += c[: e - s]
    return out
def stamp():
    x = xs(0.5); f = 60 + 120 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 10) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 45) * 0.5
def impact():
    x = xs(1.2); f = 45 + 60 * np.exp(-x * 12); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 3.5) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 25) * 0.25


def make_audio(total, an, sc, voice):
    n = int(total * SR); mus, sfx = np.zeros(n), np.zeros(n)
    def add(buf, sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: buf[s:e] += g * sig[: e - s]
    b = 60 / 104
    D4, Eb4, Fs4, G4, A4, Bb4, C5, D5 = 293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33
    add(mus, pad([73.42, 110.0, 146.83], total), 0, 0.12)
    # 1) the question: sparse low plucks, no beat
    for i, t in enumerate(np.arange(0.2, an["nexo"] - 0.3, 2 * b)):
        add(mus, pluck([146.83, 155.56, 146.83, 130.81][i % 4], 1.6, 0.4), t, 0.22)
    # 2) from NEXO: the groove and the melody
    motif = [(0, D5, 1), (0.5, C5, 0.5), (0.75, Bb4, 0.5), (1, A4, 1), (2, Bb4, 0.5), (2.5, A4, 0.5), (3, Fs4, 0.6), (3.5, G4, 0.5)]
    motif2 = [(0, A4, 1), (0.5, Bb4, 0.5), (1, C5, 1), (1.5, Bb4, 0.5), (2, A4, 0.5), (2.5, G4, 0.5), (3, Fs4, 0.7), (3.5, Eb4, 0.4)]
    t0, end = an["nexo"] - 0.1, total - 2.6
    k = 0
    while t0 + k * 4 * b < end:
        bt = t0 + k * 4 * b; big = bt >= an["free"] - 0.2
        for st, f, g in (motif if k % 2 == 0 else motif2):
            tt = bt + st * b
            if tt < end: add(mus, pluck(f, 0.8, 0.55), tt, 0.14 * g); big and add(mus, pluck(f * 2, 0.5, 0.6), tt, 0.05 * g)
        for st in (0, 1.5, 2):
            if bt + st * b < end: add(mus, doum(), bt + st * b, 0.3)
        for st in (0.5, 1.0, 2.5, 3.0, 3.5):
            if bt + st * b < end: add(mus, tek(), bt + st * b, 0.09 if big else 0.06)
        add(mus, pluck(146.83, 1.6, 0.5), bt, 0.18); k += 1
    for f, d in ((146.83, 0), (220.0, 0.06), (293.66, 0.12), (369.99, 0.18), (440.0, 0.24)): add(mus, pluck(f, 2.8, 0.6), end + d, 0.15)
    add(mus, pad([146.83, 220.0, 293.66, 369.99], 2.6), end, 0.1)
    fi = int(0.6 * SR); mus[:fi] *= np.linspace(0, 1, fi); fo = int(1.4 * SR); mus[-fo:] *= np.linspace(1, 0, fo)
    # sfx on the visual beats
    for s in sc[1:]: add(sfx, whoosh(0.45), s["start"] - 0.25, 0.32)
    add(sfx, chime(987.8, 1.2), an["q"] + 0.05, 0.22)
    for i, k2 in enumerate(["visaQ", "workQ", "famQ"]): add(sfx, pop(520 + 70 * i), an[k2] - 0.02, 0.35)
    add(sfx, impact(), an["nexo"] - 0.05, 0.3); add(sfx, shimmer(1.0), an["lit"] - 0.1, 0.35)
    add(sfx, stamp(), an["visa"] + 0.35, 0.45); add(sfx, tick(1174.7), an["check"], 0.3)
    add(sfx, whoosh(0.6, 2, 9), an["company"] - 0.2, 0.25); add(sfx, pop(700), an["res"] + 0.05, 0.4)
    for i in range(3): add(sfx, pop(760 + 90 * i), an["spouse"] + 0.05 + i * 0.16, 0.35)
    add(sfx, stamp(), an["free"] - 0.05, 0.55); add(sfx, shimmer(1.2), an["free"] + 0.15, 0.45)
    add(sfx, tick(1046.5), an["parents"] + 0.2, 0.3); add(sfx, whoosh(1.1, 2, 7), an["transfer"] + 0.1, 0.3)
    for i in range(3): add(sfx, tick(1174.7 + 150 * i), an["legal"] + 0.3 + i * 0.35, 0.3)
    add(sfx, shimmer(1.4), an["today"], 0.35); add(sfx, pop(640), an["af"] - 0.05, 0.35); add(sfx, pop(720), an["ir"] - 0.05, 0.35)
    add(sfx, impact(), an["consult"] - 0.2, 0.35); add(sfx, shimmer(1.0), total - 2.2, 0.3)
    mus *= 0.30 / max(1e-6, np.abs(mus).max())
    v = np.pad(voice[:n], (0, max(0, n - len(voice)))); hop = int(0.01 * SR); kk = n // hop
    e = np.sqrt((v[: kk * hop].reshape(kk, hop) ** 2).mean(1)); on = np.convolve((e > e.max() * 10 ** (-30 / 20)).astype(float), np.ones(35) / 35, "same")
    mus[: kk * hop] *= np.repeat(1 - 0.5 * np.clip(on * 1.5, 0, 1), hop)
    sfx *= 10 ** (-17 / 20) / max(1e-6, np.abs(sfx).max())
    write_wav(A("assets", "music.wav"), mus); write_wav(A("assets", "sfx.wav"), sfx)


def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")


def build_html(total, lines, an, sc, vo_dur):
    tpl = open(A("src", "template.html"), encoding="utf-8").read()
    bounds = {s["id"]: (s["start"], sc[i + 1]["start"] if i + 1 < len(sc) else total) for i, s in enumerate(sc)}
    html = re.sub(r'data-scene="(\w+)"', lambda m: f'data-scene="{m.group(1)}" data-start="{bounds[m.group(1)][0]:.3f}" data-duration="{bounds[m.group(1)][1] - bounds[m.group(1)][0]:.3f}"', tpl)
    caps = []
    for i, L in enumerate(lines):
        ws = "".join(f'<span class="w{" hi" if w["hi"] else ""}"><i></i><span>{esc(w["t"])}</span></span>' for w in L["words"])
        caps.append(f'<div id="cap{i}" class="clip cap" data-start="{L["start"] - 0.06:.3f}" data-duration="{L["hold"] - L["start"] + 0.06:.3f}" data-track-index="9"><div class="cap-in">{ws}</div></div>')
    T = {"total": total, "anchors": an, "scenes": [{"id": s["id"], "start": s["start"], "first": s["first"], "last": s["last"]} for s in sc],
         "lines": [{"start": L["start"], "hold": L["hold"], "w": [[w["s"], w["e"]] for w in L["words"]]} for L in lines]}
    S = {s["id"]: s for s in sc}
    html = (html.replace("__FOLDER_START__", f'{S["reveal"]["start"]:.3f}').replace("__FOLDER_DUR__", f'{S["family"]["start"] - S["reveal"]["start"]:.3f}')
            .replace("__CARDS_START__", f'{S["path"]["start"]:.3f}').replace("__CARDS_DUR__", f'{S["care"]["start"] - S["path"]["start"]:.3f}'))
    html = (html.replace("__TOTAL__", f"{total:.3f}").replace("__VO_DUR__", f"{vo_dur:.3f}").replace("<!--__CAPTIONS__-->", "\n      ".join(caps))
            .replace("/*__TIMING__*/null", json.dumps(T, ensure_ascii=False)))
    open(A("index.html"), "w", encoding="utf-8").write(html); return T


def main():
    words = align(SCRIPT["segments"], A("vo_words.json"), 0.0, A("assets", "voiceover.wav"))
    lines, an, sc = timing(words)
    voice = read_audio(A("assets", "voiceover.wav")); vo_dur = len(voice) / SR
    total = round(sc[-1]["last"] + SCRIPT.get("tail", 2.4), 2)
    make_audio(total, an, sc, voice)
    T = build_html(total, lines, an, sc, min(vo_dur, total))
    json.dump(dict(T, words=words), open(A("timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"total={total:.2f}s voice={vo_dur:.2f}s")
    for s in sc: print(f"  {s['id']:>7} {s['start']:6.2f}  ({s['first']:.2f}-{s['last']:.2f})")
    print({k: round(v, 2) for k, v in an.items()})


if __name__ == "__main__":
    main()
