#!/usr/bin/env python3
"""IRAM CO. "one door, three keys": word timings, captions, scene times, music, SFX and index.html.

usage: python3 build.py [VOICE.wav] [WHISPER.json]
  VOICE.wav     the narration (default assets/voiceover.wav = cleaned + tightened Gemini take)
  WHISPER.json  whisper word timings of that narration (default vo_words.json)
Voice pipeline: gen_vo.py -> tools/clean_take.py -> tools/tighten.py -> whisper (yerevan-christmas/tools/asr.py)."""
import json, os, re, shutil, subprocess, sys, wave
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
    lines[-1]["hold"] = lines[-1]["end"] + 0.6
    an = {}
    for name, ref in SCRIPT["anchors"].items():
        sid, w = ref.split(":"); n = 1
        if "#" in w: w, n = w.split("#"); n = int(n)
        hits = [x for x in by[sid] if x["w"] == w]
        if len(hits) < n: sys.exit(f"anchor {name} {ref} missing")
        an[name] = hits[n - 1]["s"]
    sc = []
    for d in SCRIPT["scenes"]:
        ws = [w for sid in d["segs"] for w in by[sid]]; sc.append({"id": d["id"], "first": ws[0]["s"], "last": ws[-1]["e"]})
    for i, s in enumerate(sc): s["start"] = 0.0 if i == 0 else round(min(s["first"] - 0.15, (sc[i - 1]["last"] + s["first"]) / 2), 3)
    return lines, an, sc


# ---------------------------------------------------------------- sound kit (all synthesized, deterministic)
rng = np.random.default_rng(11)
def xs(d): return np.arange(int(d * SR)) / SR
def pluck(f, d=0.9, bright=0.5):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(d * SR))
    for i in range(len(out)):
        j = i % N; nx = (j + 1) % N; out[i] = buf[j]; buf[j] = 0.996 * (bright * buf[j] + (1 - bright) * buf[nx])
    return out * np.minimum(1, xs(d) / 0.002)
def pad(fs, d, att=1.2):
    x = xs(d); s = sum(np.sin(2 * np.pi * (f + det) * x + rng.uniform(0, 6)) for f in fs for det in (-0.6, 0, 0.7))
    return s / (3 * len(fs)) * np.minimum(1, x / att) * np.minimum(1, (d - x) / 1.0)
def doum():
    x = xs(0.35); f = 68 + 60 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)
def tek():
    x = xs(0.09); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(3) / 3, "same"); return (s * 0.6 + np.sin(2 * np.pi * 1900 * x) * 0.5) * np.exp(-x * 60)
def whoosh(d=0.5, lo=3, hi=14):
    x = xs(d); s = rng.uniform(-1, 1, len(x)); y = np.zeros_like(s); ks = np.interp(np.arange(len(x)), [0, len(x) / 2, len(x)], [1 / hi, 1 / lo, 1 / hi])
    for i in range(1, len(x)): y[i] = y[i - 1] + ks[i] * (s[i] - y[i - 1])
    return y * np.sin(np.pi * x / d) ** 2 * 3
def pop(f=600): x = xs(0.12); return np.sin(2 * np.pi * (f + 900 * np.exp(-x * 60)) * x) * np.exp(-x * 36)
def chime(f=1318.5, d=1.0):
    x = xs(d); return sum(np.sin(2 * np.pi * f * m * x) * g for m, g in ((1, 1), (2.76, 0.3), (5.4, 0.1))) * np.exp(-x * 4.5) * np.minimum(1, x / 0.002)
def shimmer(d=1.0):
    out = np.zeros(int(d * SR))
    for i in range(14):
        c = chime(2200 + 260 * (i % 6), 0.5) * 0.25; s = int(i * d / 14 * SR); e = min(len(out), s + len(c)); out[s:e] += c[: e - s]
    return out
def click(f=3200):  # metal key click
    x = xs(0.06); return (np.sin(2 * np.pi * f * x) * 0.6 + rng.uniform(-1, 1, len(x)) * 0.5) * np.exp(-x * 90)
def clunk():  # lock bolt sliding home
    x = xs(0.35); f = 140 + 220 * np.exp(-x * 40)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 14) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 60) * 0.6
    c = click(2400); o = int(0.05 * SR); y[o:o + len(c)] += c[: len(y) - o] * 0.6
    return y
def buzz(d=0.6):  # wrong key: a low rattling buzz
    x = xs(d); return np.sign(np.sin(2 * np.pi * 110 * x)) * 0.35 * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 14 * x))) * np.minimum(1, x / 0.01) * np.minimum(1, (d - x) / 0.08)
def rattle(d=0.8):
    out = np.zeros(int(d * SR))
    for i in range(9):
        c = clunk() * (0.5 + 0.5 * rng.random()); s = int((i * d / 9 + rng.uniform(0, 0.02)) * SR); e = min(len(out), s + len(c)); out[s:e] += c[: e - s] * (1 - i / 10)
    return out
def stamp():
    x = xs(0.5); f = 60 + 120 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 10) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 45) * 0.5
def coin(f=2600):
    x = xs(0.35); return sum(np.sin(2 * np.pi * f * m * x) * g for m, g in ((1, 1), (1.48, 0.5), (2.3, 0.25))) * np.exp(-x * 11)
def tick(f): x = xs(0.18); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 3 * f * x) * np.exp(-x * 40)) * np.exp(-x * 22) * np.minimum(1, x / 0.001)
def creak(d=1.4):  # door hinge creak: a slow, wavering friction tone
    x = xs(d); f = 180 + 60 * np.sin(2 * np.pi * 0.9 * x) + 30 * np.sin(2 * np.pi * 7.3 * x)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 23 * x)); return tone * am * np.sin(np.pi * x / d) * 0.6
def impact():
    x = xs(1.2); f = 45 + 60 * np.exp(-x * 12); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 3.5) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 25) * 0.25


def make_audio(total, an, sc, voice):
    n = int(total * SR); mus, sfx = np.zeros(n), np.zeros(n)
    S = {s["id"]: s for s in sc}
    def add(buf, sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: buf[s:e] += g * sig[: e - s]
    b = 60 / 100
    # E Dashti-flavoured line over an A drone; groove starts at the first key, opens up with the door
    A3, C4, D4, E4, F4, G4, A4, B4, C5, D5, E5 = 220.0, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25
    add(mus, pad([110.0, 164.81, 220.0], total), 0, 0.12)
    for i, t in enumerate(np.arange(0.2, S["key1"]["start"], 2 * b)):
        add(mus, pluck([110.0, 116.54, 110.0, 98.0][i % 4], 1.8, 0.4), t, 0.22)
    motif = [(0, E5, 1), (0.5, D5, 0.5), (0.75, C5, 0.5), (1, B4, 1), (2, C5, 0.5), (2.5, B4, 0.5), (3, A4, 0.7), (3.5, G4, 0.5)]
    motif2 = [(0, A4, 1), (0.5, B4, 0.5), (1, C5, 1), (1.5, D5, 0.5), (2, C5, 0.5), (2.5, B4, 0.5), (3, A4, 0.8), (3.5, E4, 0.4)]
    t0, end = S["key1"]["start"] - 0.05, total - 2.7
    k = 0
    while t0 + k * 4 * b < end:
        bt = t0 + k * 4 * b; big = bt >= S["open"]["start"] - 0.2; quiet = S["check"]["start"] - 0.1 <= bt < S["check"]["start"] + 3.5
        for st, f, g in (motif if k % 2 == 0 else motif2):
            tt = bt + st * b
            if tt < end and not quiet: add(mus, pluck(f, 0.8, 0.55), tt, 0.13 * g); big and add(mus, pluck(f * 2, 0.5, 0.6), tt, 0.05 * g)
        for st in (0, 1.5, 2):
            if bt + st * b < end: add(mus, doum(), bt + st * b, 0.28)
        for st in (0.5, 1.0, 2.5, 3.0, 3.5):
            if bt + st * b < end: add(mus, tek(), bt + st * b, 0.09 if big else 0.055)
        add(mus, pluck(110.0, 1.6, 0.5), bt, 0.18); k += 1
    for f, d in ((110.0, 0), (164.81, 0.06), (220.0, 0.12), (277.18, 0.18), (329.63, 0.24)): add(mus, pluck(f, 2.9, 0.6), end + d, 0.15)
    add(mus, pad([110.0, 164.81, 220.0, 277.18], 2.7), end, 0.1)
    fi = int(0.5 * SR); mus[:fi] *= np.linspace(0, 1, fi); fo = int(1.4 * SR); mus[-fo:] *= np.linspace(1, 0, fo)

    # sfx on the visual beats (key times mirror assets/world.js KEYT)
    for s in sc[1:]: add(sfx, whoosh(0.45), s["start"] - 0.25, 0.25)
    add(sfx, rattle(0.85), an["none"] - 0.02, 0.55)
    for i in range(3): add(sfx, tick(880 + 120 * i), an["ways"] + 0.1 + i * 0.18, 0.25)
    keyt = [(an["k1"] - 0.1, an["path1"] - 0.2), (an["k2"] - 0.1, an["work"]), (an["k3"] - 0.1, an["uni"])]
    for fly, ins in keyt:
        add(sfx, whoosh(0.9, 2, 10), fly, 0.35); add(sfx, shimmer(0.6), fly + 0.7, 0.15)
        add(sfx, click(), ins + 0.45, 0.5); add(sfx, click(2600), ins + 0.55, 0.4)
    add(sfx, click(2000), an["alone"] - 0.2, 0.5); add(sfx, buzz(0.7), an["alone"] + 0.05, 0.25); add(sfx, rattle(0.5), an["alone"] + 0.4, 0.3)
    add(sfx, pop(560), an["biz"] - 0.08, 0.3); add(sfx, pop(640), an["legal"] - 0.06, 0.35)
    add(sfx, stamp(), an["checked"] + 0.05, 0.45); add(sfx, clunk(), an["checked"] + 0.65, 0.6); add(sfx, chime(1318.5, 1.1), an["checked"] + 0.75, 0.22)
    add(sfx, pop(620), an["permit"] - 0.08, 0.35); add(sfx, clunk(), an["res2"] + 0.35, 0.6); add(sfx, chime(1480.0, 1.1), an["res2"] + 0.45, 0.22)
    add(sfx, pop(600), an["lang"] - 0.08, 0.3); add(sfx, pop(680), an["uni"] - 0.08, 0.3); add(sfx, pop(760), an["easy"] - 0.03, 0.3)
    add(sfx, clunk(), an["easy"] + 0.35, 0.6); add(sfx, chime(1661.2, 1.2), an["easy"] + 0.45, 0.24)
    for i in range(12): add(sfx, coin(2300 + 140 * (i % 5)), an["money"] + 0.25 + i * 0.13, 0.18)
    for i in range(6): add(sfx, tick(1400 if i % 2 else 1050), an["time"] + i * 0.3, 0.22)
    for i in range(3): add(sfx, pop(700 + 90 * i), an["which"] - 0.05 + i * 0.35, 0.3)
    add(sfx, chime(1318.5, 1.0), an["act"], 0.22)
    add(sfx, clunk(), S["open"]["start"] - 0.15, 0.5); add(sfx, creak(1.5), S["open"]["start"] + 0.05, 0.28); add(sfx, whoosh(1.6, 2, 7), S["open"]["start"] + 0.9, 0.35)
    add(sfx, impact(), an["free"] - 0.35, 0.3); add(sfx, shimmer(1.3), an["free"], 0.4)
    for i in range(5): add(sfx, click(3600 + 200 * (i % 2)), an["word"] + 0.04 + i * 0.1, 0.25)
    add(sfx, pop(820), an["comment"] + 0.1, 0.4); add(sfx, shimmer(1.0), total - 2.3, 0.3)

    mus *= 0.30 / max(1e-6, np.abs(mus).max())
    v = np.pad(voice[:n], (0, max(0, n - len(voice)))); hop = int(0.01 * SR); kk = n // hop
    e = np.sqrt((v[: kk * hop].reshape(kk, hop) ** 2).mean(1)); on = np.convolve((e > e.max() * 10 ** (-30 / 20)).astype(float), np.ones(35) / 35, "same")
    mus[: kk * hop] *= np.repeat(1 - 0.5 * np.clip(on * 1.5, 0, 1), hop)
    sfx *= 10 ** (-16 / 20) / max(1e-6, np.abs(sfx).max())
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
    html = (html.replace("__TOTAL__", f"{total:.3f}").replace("__VO_DUR__", f"{vo_dur:.3f}").replace("<!--__CAPTIONS__-->", "\n      ".join(caps))
            .replace("/*__TIMING__*/null", json.dumps(T, ensure_ascii=False)))
    open(A("index.html"), "w", encoding="utf-8").write(html); return T


def main():
    vpath = sys.argv[1] if len(sys.argv) > 1 else A("assets", "voiceover.wav")
    wjson = sys.argv[2] if len(sys.argv) > 2 else A("vo_words.json")
    if os.path.abspath(vpath) != A("assets", "voiceover.wav"):
        write_wav(A("assets", "voiceover.wav"), read_audio(vpath))
    if os.path.abspath(wjson) != A("vo_words.json"): shutil.copy(wjson, A("vo_words.json"))
    words = align(SCRIPT["segments"], A("vo_words.json"), 0.0, A("assets", "voiceover.wav"))
    lines, an, sc = timing(words)
    voice = read_audio(A("assets", "voiceover.wav")); vo_dur = len(voice) / SR
    total = round(sc[-1]["last"] + SCRIPT.get("tail", 2.6), 2)
    make_audio(total, an, sc, voice)
    T = build_html(total, lines, an, sc, min(vo_dur, total))
    json.dump(dict(T, words=words), open(A("timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"total={total:.2f}s voice={vo_dur:.2f}s")
    for s in sc: print(f"  {s['id']:>6} {s['start']:6.2f}  ({s['first']:.2f}-{s['last']:.2f})")
    print({k: round(v, 2) for k, v in an.items()})


if __name__ == "__main__":
    main()
