#!/usr/bin/env python3
"""Build the Armenia business reel: cleaned voice, word timings, captions, scene times, music, SFX and index.html.

usage:
  python3 build.py [TAKE.wav] [WHISPER.json]
      TAKE.wav     one Google AI Studio (Gemini TTS) take of the whole script   (default assets/vo/take_38.wav)
      WHISPER.json whisper word timings of that take (yerevan-christmas/tools/asr.py)  (default vo_words_take.json)

Writes assets/voiceover.wav, assets/music.wav, assets/sfx.wav, timing.json and index.html (from src/template.html).
"""
import json, os, re, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A = lambda *p: os.path.join(HERE, *p)
sys.path.insert(0, A("tools"))
from align import align  # noqa: E402

SCRIPT = json.load(open(A("script.json"), encoding="utf-8"))
SR = 44100


# ---------------------------------------------------------------- audio helpers
def read_audio(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def write_wav(path, x, sr=SR):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------- timing
def plain(t):
    return re.sub(r"[\[\]]", "", t)


def build_timing(words):
    segs = {s["id"]: s for s in SCRIPT["segments"]}
    by_seg = {}
    for w in words: by_seg.setdefault(w["seg"], []).append(w)
    lines = []
    for sid, s in segs.items():
        ws = by_seg[sid]; k = 0
        for li, line in enumerate(s["captions"]):
            toks = line.split()
            hi = False; items = []
            for tok in toks:
                o = tok.count("["); c = tok.count("]")
                is_hi = hi or o > 0
                w = ws[k]; k += 1
                if plain(tok) != w["w"]:
                    sys.exit(f"caption word mismatch in {sid} line {li}: {plain(tok)!r} != {w['w']!r}")
                items.append({"t": plain(tok), "s": w["s"], "e": w["e"], "hi": is_hi})
                hi = (hi or o > 0) and not c
            lines.append({"seg": sid, "words": items, "start": items[0]["s"], "end": items[-1]["e"]})
        if k != len(ws): sys.exit(f"{sid}: captions cover {k} of {len(ws)} words")
    # each line stays until the next line starts when the gap is short
    for a, b in zip(lines, lines[1:]):
        a["hold"] = b["start"] if b["start"] - a["end"] < 0.9 else a["end"] + 0.35
    lines[-1]["hold"] = lines[-1]["end"] + 0.5

    anchors = {}
    for name, ref in SCRIPT["anchors"].items():
        sid, w = ref.split(":"); n = 1
        if "#" in w: w, n = w.split("#"); n = int(n)
        hits = [x for x in by_seg[sid] if x["w"] == w]
        if len(hits) < n: sys.exit(f"anchor {name}: {ref} not found")
        anchors[name] = hits[n - 1]["s"]

    scenes = []
    for i, sc in enumerate(SCRIPT["scenes"]):
        ws = [w for sid in sc["segs"] for w in by_seg[sid]]
        scenes.append({"id": sc["id"], "first": ws[0]["s"], "last": ws[-1]["e"]})
    for i, sc in enumerate(scenes):
        if i == 0: sc["start"] = 0.0
        else:
            p = scenes[i - 1]
            sc["start"] = round(min(sc["first"] - 0.18, (p["last"] + sc["first"]) / 2), 3)
    return lines, anchors, scenes


# ---------------------------------------------------------------- music + sfx
def make_music(total, voice, path):
    rng = np.random.default_rng(7); n = int(total * SR); out = np.zeros(n)

    def add(sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: out[s:e] += g * sig[: e - s]

    def env(L, a, d):
        x = np.arange(L) / SR; return np.minimum(1, x / a) * np.exp(-x / d)

    def pluck(f, dur=0.9, d=0.3):
        L = int(dur * SR); x = np.arange(L) / SR
        s = np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x) * np.exp(-x * 6) + 0.12 * np.sin(6 * np.pi * f * x) * np.exp(-x * 9)
        return s * env(L, 0.003, d)

    def pad(fs, dur):
        L = int(dur * SR); x = np.arange(L) / SR; s = np.zeros(L)
        for f in fs:
            for det in (-0.7, 0.0, 0.8):
                ph = rng.uniform(0, 6.28)
                s += np.sin(2 * np.pi * (f + det) * x + ph) + 0.25 * np.sin(4 * np.pi * (f + det) * x + ph)
        a = np.minimum(1, x / 0.6) * np.minimum(1, (dur - x) / 0.6)
        return s * a / (3 * len(fs))

    def kick():
        L = int(0.3 * SR); x = np.arange(L) / SR; f = 48 + 100 * np.exp(-x * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 11)

    def clap():
        L = int(0.18 * SR); s = rng.uniform(-1, 1, L); s = s - np.convolve(s, np.ones(4) / 4, "same")
        x = np.arange(L) / SR; e = sum(np.exp(-np.clip(x - d, 0, None) * 60) * (x >= d) for d in (0, 0.011, 0.022))
        return s * e * 0.5 + s * np.exp(-x * 18) * 0.25

    def hat():
        L = int(0.05 * SR); s = rng.uniform(-1, 1, L); s = s - np.convolve(s, np.ones(2) / 2, "same")
        return s * env(L, 0.001, 0.012)

    bpm = 100; beat = 60 / bpm; bar = 4 * beat
    D, Fs, A_, B, G, E = 146.83, 185.0, 220.0, 246.94, 196.0, 164.81
    prog = [(D, Fs, A_), (A_ / 2 * 2, 277.18, 329.63), (B, 293.66, 369.99), (G, B, 293.66)]  # D A Bm G
    bass = [D / 2, A_ / 2, B / 2, G / 2]
    arp = [0, 2, 1, 2, 0, 2, 1, 2]
    t, k = 0.0, 0
    while t < total:
        ch = prog[k % 4]
        sc = 0.55 if k == 0 else 1.0
        add(pad(ch, bar + 0.5), t, 0.10 * sc)
        add(pluck(bass[k % 4], 1.8, 0.7), t, 0.20 * sc)
        add(pluck(bass[k % 4], 0.9, 0.3), t + 2.5 * beat, 0.10 * sc)
        for i in range(8):
            add(pluck(ch[arp[i]] * 2, 0.5, 0.16), t + i * beat / 2, (0.040 if i % 2 else 0.055) * sc)
        if k >= 1:
            for b in range(4):
                add(kick(), t + b * beat, 0.24)
                if b in (1, 3): add(clap(), t + b * beat, 0.06)
                add(hat(), t + b * beat + beat / 2, 0.07)
        t += bar; k += 1
    fi = int(0.8 * SR); out[:fi] *= np.linspace(0, 1, fi)
    fo = int(2.2 * SR); out[-fo:] *= np.linspace(1, 0, fo)
    out *= 0.28 / max(1e-6, np.abs(out).max())
    # duck ~6 dB while the narrator speaks
    v = np.pad(voice[:n], (0, max(0, n - len(voice))))
    hop = int(0.01 * SR); kk = n // hop; e = np.sqrt((v[: kk * hop].reshape(kk, hop) ** 2).mean(1))
    on = np.convolve((e > e.max() * 10 ** (-30 / 20)).astype(float), np.ones(35) / 35, "same")
    out[: kk * hop] *= np.repeat(1 - 0.5 * np.clip(on * 1.5, 0, 1), hop)
    write_wav(path, out)


def make_sfx(total, anchors, scenes, path):
    """Small UI sounds on the visual beats (kept around -20 dBFS, under the voice)."""
    rng = np.random.default_rng(3); n = int(total * SR); out = np.zeros(n)
    a = anchors

    def add(sig, t, g=1.0):
        s = int(t * SR); e = min(n, s + len(sig))
        if e > s >= 0: out[s:e] += g * sig[: e - s]

    def x_(d): return np.arange(int(d * SR)) / SR

    def whoosh(d=0.55, lo=3, hi=13):
        x = x_(d); s = rng.uniform(-1, 1, len(x)); y = np.zeros_like(s)
        # sweeping one-pole low-pass: brighter in the middle
        for i, k in enumerate(np.interp(np.arange(len(x)), [0, len(x) / 2, len(x)], [1 / hi, 1 / lo, 1 / hi])):
            y[i] = y[i - 1] + k * (s[i] - y[i - 1]) if i else 0
        return y * np.sin(np.pi * x / d) ** 2 * 3

    def pop(f=600):
        x = x_(0.12); return np.sin(2 * np.pi * (f + 900 * np.exp(-x * 60)) * x) * np.exp(-x * 38)

    def note(f, d=0.5):  # soft marimba
        x = x_(d); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 4 * f * x) * np.exp(-x * 30)) * np.exp(-x * 9) * np.minimum(1, x / 0.002)

    def chime(f=1318.5, d=0.9):
        x = x_(d); return sum(np.sin(2 * np.pi * f * m * x) * g for m, g in ((1, 1), (2.76, 0.35), (5.4, 0.12))) * np.exp(-x * 5) * np.minimum(1, x / 0.002)

    def coin(f=2400):
        x = x_(0.35); return (np.sin(2 * np.pi * f * x) + 0.6 * np.sin(2 * np.pi * f * 1.48 * x)) * np.exp(-x * 14) * np.minimum(1, x / 0.001)

    def click():
        x = x_(0.03); return rng.uniform(-1, 1, len(x)) * np.exp(-x * 220)

    def thud():
        x = x_(0.4); f = 55 + 140 * np.exp(-x * 25)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 60) * 0.4

    for sc in scenes[1:]: add(whoosh(0.5), sc["start"] - 0.28, 0.16)
    # hook
    add(pop(520), a["q"] - 0.2, 0.18); add(pop(700), a["here"] + 0.05, 0.16)
    add(click(), a["dollar"] - 0.1, 0.3)
    for i in range(7): add(coin(2200 + 180 * (i % 3)), a["dollar"] + 0.05 + i * 0.07, 0.07)
    # city: a rising pentatonic marimba note as each business lands
    names = ["shop", "office", "clinic", "factory", "workshop", "land", "beauty", "spa", "warehouse", "greenhouse", "farm", "livestock", "fish"]
    penta = [523.25, 587.33, 659.25, 783.99, 880.0]
    for i, nm in enumerate(names):
        f = penta[i % 5] * (2 if i >= 10 else 1) * (1 if i < 5 else 1.0)
        add(note(penta[i % 5] * (1 + (i // 5))), a[nm] + 0.02, 0.15)
    add(whoosh(0.8, 2, 9), a["nodiff"] - 0.2, 0.14)
    add(whoosh(0.7, 2, 8), a["armenia"] - 0.5, 0.12); add(chime(1174.7), a["armenia"] + 0.1, 0.09)
    for i in range(13): add(coin(2100 + 90 * (i % 5)), a["income"] + 0.05 + i * 0.06, 0.05)
    # find
    fs = scenes[2]["start"]
    for i in range(3): add(pop(560 + 80 * i), fs + 0.15 + i * 0.12, 0.13)
    add(whoosh(0.6, 3, 10), a["prop"] - 0.3, 0.09); add(chime(1567.98), a["prop"] + 0.55, 0.10)
    add(click(), a["rent"], 0.35); add(click(), a["buy"], 0.35); add(chime(1318.5), a["found"] + 0.05, 0.09)
    # steps
    for i, nm in enumerate(["visit", "check", "nego", "contract", "launch"]):
        add(note(penta[i] * 1.0), a[nm] + 0.02, 0.15); add(click(), a[nm] + 0.02, 0.15)
    add(whoosh(0.9, 2, 7), a["launch"] + 0.35, 0.13); add(chime(1174.7), a["withyou"] + 0.05, 0.10)
    # goal
    add(whoosh(0.45, 4, 14), a["target"] - 0.5, 0.18); add(thud(), a["target"] - 0.05, 0.3)
    add(chime(1567.98), a["withus"], 0.09)
    # cta
    add(pop(640), a["word"] - 0.35, 0.15)
    for i in range(3): add(click(), a["word"] + 0.05 + i * 0.16, 0.35)
    add(pop(880), a["comment"] + 0.1, 0.15)
    add(chime(1318.5, 1.4), scenes[-1]["last"] + 0.2, 0.10)
    out *= 10 ** (-18 / 20) / max(1e-6, np.abs(out).max())
    write_wav(path, out)


# ---------------------------------------------------------------- html
def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")


def build_html(total, lines, anchors, scenes, vo_dur):
    tpl = open(A("src", "template.html"), encoding="utf-8").read()
    bounds = {s["id"]: (s["start"], (scenes[i + 1]["start"] if i + 1 < len(scenes) else total)) for i, s in enumerate(scenes)}

    def fill(m):
        st, en = bounds[m.group(1)]
        return f'data-scene="{m.group(1)}" data-start="{st:.3f}" data-duration="{en - st:.3f}"'
    html = re.sub(r'data-scene="(\w+)"', fill, tpl)
    caps = []
    for i, L in enumerate(lines):
        ws = "".join(f'<span class="w{" hi" if w["hi"] else ""}">{esc(w["t"])}</span>' for w in L["words"])
        caps.append(f'<div id="cap{i}" class="clip cap" data-start="{L["start"] - 0.06:.3f}" data-duration="{L["hold"] - L["start"] + 0.06:.3f}" '
                    f'data-track-index="6"><div class="cap-in">{ws}</div></div>')
    timing = {"total": round(total, 3), "anchors": anchors,
              "scenes": [{"id": s["id"], "start": s["start"], "first": s["first"], "last": s["last"]} for s in scenes],
              "lines": [{"start": L["start"], "hold": L["hold"], "w": [[w["s"], w["e"]] for w in L["words"]]} for L in lines]}
    html = (html.replace("__TOTAL__", f"{total:.3f}").replace("__VO_DUR__", f"{vo_dur:.3f}")
            .replace("<!--__CAPTIONS__-->", "\n      ".join(caps))
            .replace("/*__TIMING__*/null", json.dumps(timing, ensure_ascii=False)))
    open(A("index.html"), "w", encoding="utf-8").write(html)
    return timing


def main():
    take = sys.argv[1] if len(sys.argv) > 1 else A("assets", "vo", "take_38.wav")
    wj = sys.argv[2] if len(sys.argv) > 2 else A("vo_words_take.json")
    lead = SCRIPT.get("lead", 0.3)
    shift = float(subprocess.run([sys.executable, A("tools", "clean_take.py"), take, A("assets", "voiceover.wav"), str(lead)],
                                 check=True, capture_output=True, text=True).stdout.strip())
    words = align(SCRIPT["segments"], wj, shift, take)
    lines, anchors, scenes = build_timing(words)
    voice = read_audio(A("assets", "voiceover.wav"))
    vo_dur = len(voice) / SR
    total = round(scenes[-1]["last"] + SCRIPT.get("tail", 2.6), 3)
    make_music(total, voice, A("assets", "music.wav"))
    make_sfx(total, anchors, scenes, A("assets", "sfx.wav"))
    timing = build_html(total, lines, anchors, scenes, min(vo_dur, total))
    json.dump(dict(timing, words=words), open(A("timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"total={total:.2f}s voice={vo_dur:.2f}s shift={shift:+.3f}")
    for s in scenes: print(f"  {s['id']:>6} {s['start']:6.2f}  (words {s['first']:.2f}-{s['last']:.2f})")


if __name__ == "__main__":
    main()
