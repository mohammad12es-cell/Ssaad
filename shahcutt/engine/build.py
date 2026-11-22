#!/usr/bin/env python3
"""@shahcutt reel engine: word timings, karaoke captions, beats, music, SFX and index.html.

usage: python3 build.py [VOICE.wav] [WHISPER.json]
  VOICE.wav     narration (default assets/voiceover.wav = cleaned + tightened Gemini take)
  WHISPER.json  whisper word timings of that narration (default vo_words.json)

script.json:
  segments: [{id, text, captions:[...], tts?}]           captions use [word] for a red highlight
  beats:    [{at:"s1:word[#n]", kind, ...}]              one on screen at a time, in order
    kind hook|text: lines:[...]   ([x] = red glow)
    kind stat:      n, suffix?, label, good?
    kind rule:      num, lines:[...]
    kind chart:     title, bars:[{v, label, good?, show?}], suffix?     show = text printed instead of v (e.g. "۵ تا ۷")
    kind list:      title, rows:[{at:"s7:word", text}]               result checklist, each row ticks in on its word
    kind cta:       lines:[...], word, word_at:"s9:«word»"
    hook/text may add segs:N  -> a row of N Instagram story bars above the lines that fill one by one
Voice pipeline: gen_vo.py -> tools/clean_take.py -> tools/tighten.py -> whisper (yerevan-christmas/tools/asr.py)."""
import json, os, re, shutil, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); A = lambda *p: os.path.join(HERE, *p)
sys.path.insert(0, A("tools"))
from align import align  # noqa: E402

SCRIPT = json.load(open(A("script.json"), encoding="utf-8")); SR = 44100
SEG_T0, SEG_DT = -0.4, 0.065  # hook story bars: bar i fills at SEG_T0 + i*SEG_DT (the first few are already full on frame 0)
FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def read_audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def write_wav(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def word_time(by, ref):
    sid, w = ref.split(":", 1); n = 1
    if "#" in w: w, n = w.split("#"); n = int(n)
    hits = [x for x in by[sid] if x["w"] == w]
    if len(hits) < n: sys.exit(f"word {ref} not found in {sid}: {[x['w'] for x in by[sid]]}")
    return hits[n - 1]["s"]


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
    beats = []
    for i, b in enumerate(SCRIPT["beats"]):
        st = 0.0 if i == 0 else word_time(by, b["at"]) - 0.05
        d = dict(b, start=round(st, 3))
        if b["kind"] == "cta": d["wordAt"] = round(word_time(by, b["word_at"]), 3)
        if b["kind"] == "list": d["rowsAt"] = [round(word_time(by, r["at"]), 3) for r in b["rows"]]
        beats.append(d)
    for a, b in zip(beats, beats[1:]):
        if b["start"] <= a["start"]: sys.exit(f"beats out of order at {b['at']}")
    return lines, beats, words[-1]["e"]


# ---------------------------------------------------------------- sound kit (synthesized, deterministic)
rng = np.random.default_rng(23)
def xs(d): return np.arange(int(d * SR)) / SR
def pluck(f, d=0.6, bright=0.55):
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(d * SR))
    for i in range(len(out)):
        j = i % N; nx = (j + 1) % N; out[i] = buf[j]; buf[j] = 0.995 * (bright * buf[j] + (1 - bright) * buf[nx])
    return out * np.minimum(1, xs(d) / 0.002)
def pad(fs, d):
    x = xs(d); s = sum(np.sin(2 * np.pi * (f + det) * x + rng.uniform(0, 6)) for f in fs for det in (-0.7, 0, 0.6))
    return s / (3 * len(fs)) * np.minimum(1, x / 1.5) * np.minimum(1, (d - x) / 1.2)
def kick():
    x = xs(0.4); f = 48 + 90 * np.exp(-x * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
def hat():
    x = xs(0.06); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(4) / 4, "same"); return s * np.exp(-x * 70)
def whoosh(d=0.45, lo=3, hi=16):
    x = xs(d); s = rng.uniform(-1, 1, len(x)); y = np.zeros_like(s); ks = np.interp(np.arange(len(x)), [0, len(x) / 2, len(x)], [1 / hi, 1 / lo, 1 / hi])
    for i in range(1, len(x)): y[i] = y[i - 1] + ks[i] * (s[i] - y[i - 1])
    return y * np.sin(np.pi * x / d) ** 2 * 3
def impact():
    x = xs(1.0); f = 40 + 70 * np.exp(-x * 14); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 4) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 30) * 0.3
def pop(f=650): x = xs(0.12); return np.sin(2 * np.pi * (f + 900 * np.exp(-x * 60)) * x) * np.exp(-x * 36)
def tick(f=1500): x = xs(0.05); return np.sin(2 * np.pi * f * x) * np.exp(-x * 90)
def riser(d=0.7):
    x = xs(d); f = 300 + 900 * (x / d) ** 2; return np.sin(2 * np.pi * np.cumsum(f) / SR) * (x / d) * 0.5
def click(f=3400): x = xs(0.05); return (np.sin(2 * np.pi * f * x) * 0.6 + rng.uniform(-1, 1, len(x)) * 0.4) * np.exp(-x * 100)
def chime(f=1318.5, d=0.9): x = xs(d); return sum(np.sin(2 * np.pi * f * m * x) * g for m, g in ((1, 1), (2.76, 0.3))) * np.exp(-x * 5) * np.minimum(1, x / 0.002)


def make_audio(total, beats, voice):
    n = int(total * SR); mus, sfx = np.zeros(n), np.zeros(n)
    def add(buf, sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: buf[s:e] += g * sig[: e - s]
    b = 60 / 104
    add(mus, pad([55.0, 82.41, 110.0, 130.81], total), 0, 0.14)                  # A minor bed
    line = [220.0, 261.63, 329.63, 293.66, 261.63, 246.94, 220.0, 196.0]
    k = 0; t = 0.0
    while t < total - 2.2:
        add(mus, kick(), t, 0.5)
        if k % 2: add(mus, kick(), t + 0.75 * b, 0.25)
        for st in (0.5, 1.5, 2.5, 3.5): add(mus, hat(), t + st * b, 0.12)
        for j in range(4): add(mus, pluck(line[(k * 4 + j) % 8], 0.5), t + j * b, 0.1)
        t += 4 * b; k += 1
    add(mus, pad([110.0, 164.81, 220.0, 261.63], 2.4), total - 2.4, 0.12)
    fi = int(0.4 * SR); mus[:fi] *= np.linspace(0, 1, fi); fo = int(1.2 * SR); mus[-fo:] *= np.linspace(1, 0, fo)
    add(sfx, impact(), 0.02, 0.5)
    for i in range(beats[0].get("segs", 0)):
        t = SEG_T0 + i * SEG_DT
        if t > 0: add(sfx, tick(1700 + 9 * i), t, 0.07)
    for bt in beats[1:]:
        t0 = bt["start"]; add(sfx, whoosh(), t0 - 0.2, 0.3)
        if bt["kind"] == "stat":
            add(sfx, impact(), t0 + 0.02, 0.35)
            for i in range(10): add(sfx, tick(1200 + 60 * i), t0 + 0.05 + i * 0.07, 0.2)
        elif bt["kind"] == "chart": add(sfx, riser(0.7), t0 + 0.2, 0.3); add(sfx, pop(780), t0 + 0.75, 0.3); add(sfx, pop(980), t0 + 1.2, 0.3)
        elif bt["kind"] == "rule": add(sfx, pop(560 + 90 * int(str(bt.get("num", "1")).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")) or 1)), t0 + 0.02, 0.4)
        elif bt["kind"] == "list":
            add(sfx, pop(620), t0 + 0.02, 0.25)
            for i, ra in enumerate(bt["rowsAt"]): add(sfx, pop(700 + 140 * i), ra, 0.35); add(sfx, chime(1046.5 * 2 ** (i * 4 / 12), 0.7), ra + 0.05, 0.16)
        elif bt["kind"] == "cta":
            for i in range(5): add(sfx, click(), bt["wordAt"] + 0.04 + i * 0.1, 0.3)
            add(sfx, chime(1568.0, 1.0), bt["wordAt"] + 0.6, 0.25)
        else: add(sfx, pop(620), t0 + 0.02, 0.25)
    mus *= 0.30 / max(1e-6, np.abs(mus).max())
    v = np.pad(voice[:n], (0, max(0, n - len(voice)))); hop = int(0.01 * SR); kk = n // hop
    e = np.sqrt((v[: kk * hop].reshape(kk, hop) ** 2).mean(1)); on = np.convolve((e > e.max() * 10 ** (-30 / 20)).astype(float), np.ones(35) / 35, "same")
    mus[: kk * hop] *= np.repeat(1 - 0.55 * np.clip(on * 1.5, 0, 1), hop)
    sfx *= 10 ** (-16 / 20) / max(1e-6, np.abs(sfx).max())
    write_wav(A("assets", "music.wav"), mus); write_wav(A("assets", "sfx.wav"), sfx)


def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")
def rich(s): return re.sub(r"\[([^\]]+)\]", r"<em>\1</em>", esc(s))


def beat_html(b):
    k = b["kind"]
    if k in ("hook", "text"):
        segs = f'<div class="segs">{"<i><b></b></i>" * b["segs"]}</div>' if b.get("segs") else ""
        inner = segs + "".join(f'<span class="ln">{rich(x)}</span>' for x in b["lines"])
    elif k == "stat":
        inner = (f'<div class="val{" good" if b.get("good") else ""}" data-n="{b["n"]}" data-suf="{esc(b.get("suffix", ""))}">۰{esc(b.get("suffix", ""))}</div>'
                 f'<div class="lab">{rich(b["label"])}</div>')
    elif k == "rule":
        inner = f'<div class="num">{esc(str(b["num"]))}</div>' + "".join(f'<span class="ln">{rich(x)}</span>' for x in b["lines"])
    elif k == "chart":
        mx = max(x["v"] for x in b["bars"]); suf = esc(b.get("suffix", "٪"))
        val = lambda x: f'<span dir="rtl">{esc(x["show"])}</span>' if "show" in x else str(x["v"]).translate(FA).replace(".", "٫") + suf
        bars = "".join(f'<div class="bar{" good" if x.get("good") else ""}"><div class="v">{val(x)}</div>'
                       f'<div class="col" style="height:{int(380 * x["v"] / mx)}px"></div><div class="lb">{esc(x["label"])}</div></div>' for x in b["bars"])
        inner = f'<div class="title">{rich(b["title"])}</div><div class="bars">{bars}</div>'
    elif k == "list":
        inner = f'<div class="ttl">{rich(b["title"])}</div>' + "".join(
            f'<div class="row"><span class="ck"><svg viewBox="0 0 64 64"><path d="M15 33 L27 45 L49 20" /></svg></span><span class="rt">{rich(r["text"])}</span></div>' for r in b["rows"])
    elif k == "cta":
        inner = ("".join(f'<span class="ln">{rich(x)}</span>' for x in b["lines"]) +
                 f'<div class="cbox"><div class="av"></div><div class="field"><div class="word">{esc(b["word"])}</div><div class="caret"></div></div>'
                 '<div class="send"><svg width="60" height="60" viewBox="0 0 64 64"><path d="M54,10 L8,30 L26,36 L32,56 Z" fill="#07070a" /></svg></div></div>')
    else:
        sys.exit(f"unknown beat kind {k}")
    return inner


def build_html(total, lines, beats, vo_dur):
    tpl = open(A("src", "template.html"), encoding="utf-8").read()
    bh = []
    for i, b in enumerate(beats):
        end = beats[i + 1]["start"] + 0.05 if i + 1 < len(beats) else total
        bh.append(f'<div id="b{i}" class="clip beat k-{b["kind"]}" data-start="{b["start"]:.3f}" data-duration="{end - b["start"]:.3f}" data-track-index="2"><div class="b-in">{beat_html(b)}</div></div>')
    caps = []
    for i, L in enumerate(lines):
        ws = "".join(f'<span class="w{" hi" if w["hi"] else ""}"><i></i><span>{esc(w["t"])}</span></span>' for w in L["words"])
        caps.append(f'<div id="cap{i}" class="clip cap" data-start="{L["start"] - 0.06:.3f}" data-duration="{L["hold"] - L["start"] + 0.06:.3f}" data-track-index="9"><div class="cap-in">{ws}</div></div>')
    T = {"total": total, "segT0": SEG_T0, "segDt": SEG_DT, "beats": [{"kind": b["kind"], "start": b["start"], **{k: b[k] for k in ("wordAt", "rowsAt", "segs") if k in b}} for b in beats],
         "lines": [{"start": L["start"], "hold": L["hold"], "w": [[w["s"], w["e"]] for w in L["words"]]} for L in lines]}
    html = (tpl.replace("__TOTAL__", f"{total:.3f}").replace("__VO_DUR__", f"{vo_dur:.3f}").replace("<!--__BEATS__-->", "\n        ".join(bh))
            .replace("<!--__CAPTIONS__-->", "\n      ".join(caps)).replace("/*__TIMING__*/null", json.dumps(T, ensure_ascii=False)))
    open(A("index.html"), "w", encoding="utf-8").write(html); return T


def main():
    vpath = sys.argv[1] if len(sys.argv) > 1 else A("assets", "voiceover.wav")
    wjson = sys.argv[2] if len(sys.argv) > 2 else A("vo_words.json")
    if os.path.abspath(vpath) != A("assets", "voiceover.wav"): write_wav(A("assets", "voiceover.wav"), read_audio(vpath))
    if os.path.abspath(wjson) != A("vo_words.json"): shutil.copy(wjson, A("vo_words.json"))
    words = align(SCRIPT["segments"], A("vo_words.json"), 0.0, A("assets", "voiceover.wav"))
    lines, beats, last = timing(words)
    voice = read_audio(A("assets", "voiceover.wav")); vo_dur = len(voice) / SR
    total = round(last + SCRIPT.get("tail", 2.2), 2)
    make_audio(total, beats, voice)
    T = build_html(total, lines, beats, min(vo_dur, total))
    json.dump(dict(T, words=words), open(A("timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"total={total:.2f}s voice={vo_dur:.2f}s beats={len(beats)}")
    for b in beats: print(f"  {b['start']:6.2f} {b['kind']}")


if __name__ == "__main__":
    main()
