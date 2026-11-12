#!/usr/bin/env python3
"""Build timing.json + index.html (+ assets/music.wav) for the Armenia investment motion graphic.

usage:
  python3 build.py vo                 # per-segment Gemini clips in assets/vo/s1.wav ... (from gen_vo.py)
  python3 build.py single FILE.wav    # one voiceover file exported from Google AI Studio
  python3 build.py guide              # draft: original video's narration as a timing guide

Writes assets/voiceover.wav, timing.json, assets/music.wav and index.html (from src/template.html).
"""
import json, os, re, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
A = lambda *p: os.path.join(HERE, *p)
SCRIPT = json.load(open(A("script.json"), encoding="utf-8"))
SEGS = SCRIPT["segments"]
LEAD = 0.45  # silence before the first word
MODE = sys.argv[1] if len(sys.argv) > 1 else "vo"


# ---------------------------------------------------------------- audio helpers
def read_wav(path, sr=24000):
    """Decode any audio file to mono float32 at `sr` via ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def write_wav(path, x, sr):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def rms_frames(x, sr, win=0.02):
    n = int(win * sr); k = len(x) // n
    return np.sqrt((x[: k * n].reshape(k, n) ** 2).mean(axis=1) + 1e-12), win


def pauses(x, sr, min_len=0.12, rel_db=-32):
    """Return [(start, end)] of quiet stretches inside speech."""
    r, win = rms_frames(x, sr)
    thr = r.max() * 10 ** (rel_db / 20)
    quiet = r < thr
    out, s = [], None
    for i, q in enumerate(quiet):
        if q and s is None: s = i
        if not q and s is not None:
            if (i - s) * win >= min_len: out.append((s * win, i * win))
            s = None
    return out


def trim(x, sr, pad=0.05):
    r, win = rms_frames(x, sr)
    on = np.where(r > r.max() * 10 ** (-38 / 20))[0]
    if not len(on): return x
    a = max(0, int((on[0] * win - pad) * sr)); b = min(len(x), int(((on[-1] + 1) * win + pad) * sr))
    return x[a:b]


# ---------------------------------------------------------------- caption timing
def plain(t):
    return re.sub(r"[\[\]«»،؛.,:!?‌ ]", "", t)


def caption_times(start, end, caps, quiet):
    """Spread caption phrases over [start, end] by letter count, snapping cuts to pauses."""
    w = np.array([len(plain(c)) + 3 for c in caps], dtype=float)
    cuts = start + (end - start) * np.cumsum(w)[:-1] / w.sum()
    mids = [(a + b) / 2 for a, b in quiet if start + 0.3 < (a + b) / 2 < end - 0.3]
    snapped = []
    for c in cuts:
        near = [m for m in mids if abs(m - c) < 0.75 and (not snapped or m > snapped[-1] + 0.4)]
        snapped.append(min(near, key=lambda m: abs(m - c)) if near else c)
    edges = [start] + snapped + [end]
    return [{"text": caps[i], "start": round(edges[i], 3), "end": round(edges[i + 1], 3)} for i in range(len(caps))]


# ---------------------------------------------------------------- layouts
def layout_vo():
    sr = 24000; gap = SCRIPT.get("gap", 0.28); t = LEAD; parts = [np.zeros(int(LEAD * sr))]; scenes = []
    for s in SEGS:
        x = trim(read_wav(A("assets", "vo", f"{s['id']}.wav"), sr), sr)
        d = len(x) / sr; q = [(a + t, b + t) for a, b in pauses(x, sr)]
        scenes.append({"id": s["id"], "start": round(t, 3), "end": round(t + d, 3), "caps": caption_times(t, t + d, s["captions"], q)})
        parts += [x, np.zeros(int(gap * sr))]; t += d + gap
    vo = np.concatenate(parts); vo *= 0.89 / max(1e-6, np.abs(vo).max())
    write_wav(A("assets", "voiceover.wav"), vo, sr)
    return scenes, len(vo) / sr, "assets/voiceover.wav"


def layout_single(path):
    """One continuous AI Studio export: cut it into the 10 segments at the longest pauses near the
    expected sentence boundaries."""
    sr = 24000; x = trim(read_wav(path, sr), sr)
    x = np.concatenate([np.zeros(int(LEAD * sr)), x]); dur = len(x) / sr
    q = pauses(x, sr, min_len=0.18)
    w = np.array([len(plain(s["text"])) for s in SEGS], float)
    expect = LEAD + (dur - LEAD) * np.cumsum(w)[:-1] / w.sum()
    bounds, last = [], LEAD
    for e in expect:
        cand = [p for p in q if p[0] > last + 1.0 and abs((p[0] + p[1]) / 2 - e) < 2.5]
        p = max(cand, key=lambda p: (p[1] - p[0]) - 0.15 * abs((p[0] + p[1]) / 2 - e)) if cand else (e, e)
        bounds.append(p); last = p[1]
    starts = [LEAD] + [b[1] for b in bounds]; ends = [b[0] for b in bounds] + [dur]
    scenes = [{"id": s["id"], "start": round(a, 3), "end": round(b, 3), "caps": caption_times(a, b, s["captions"], q)}
              for s, a, b in zip(SEGS, starts, ends)]
    write_wav(A("assets", "voiceover.wav"), x * 0.89 / max(1e-6, np.abs(x).max()), sr)
    return scenes, dur, "assets/voiceover.wav"


def layout_guide():
    src = A("assets", "guide.m4a"); sr = 24000; x = read_wav(src, sr); q = pauses(x, sr)
    scenes = [{"id": s["id"], "start": s["guide"][0] + 0.0, "end": s["guide"][1],
               "caps": caption_times(s["guide"][0] + 0.05, s["guide"][1], s["captions"], q)} for s in SEGS]
    scenes[0]["start"] = 0.0
    return scenes, len(x) / sr, "assets/guide.m4a"


# ---------------------------------------------------------------- music + sfx (all synthesized)
def make_music(total, scenes, path, sr=44100):
    rng = np.random.default_rng(11); n = int(total * sr); out = np.zeros(n)

    def add(sig, t, g=1.0):
        s = int(t * sr); e = min(n, s + len(sig))
        if e > s > -1: out[s:e] += g * sig[: e - s]

    def env(L, a, d):
        x = np.arange(L) / sr; return np.minimum(1, x / a) * np.exp(-x / d)

    def pluck(f, dur=0.9, d=0.32):
        L = int(dur * sr); x = np.arange(L) / sr
        s = np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x) + 0.12 * np.sin(6 * np.pi * f * x)
        return s * env(L, 0.004, d)

    def pad(fs, dur):
        L = int(dur * sr); x = np.arange(L) / sr; s = np.zeros(L)
        for f in fs:
            for det in (-0.6, 0.0, 0.7):
                s += np.sin(2 * np.pi * (f + det) * x + rng.uniform(0, 6.28))
        a = np.minimum(1, x / 0.9) * np.minimum(1, (dur - x) / 0.9)
        return s * a / (3 * len(fs))

    def kick():
        L = int(0.35 * sr); x = np.arange(L) / sr; f = 45 + 90 * np.exp(-x * 28)
        return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-x * 10)

    def shaker():
        L = int(0.07 * sr); s = rng.uniform(-1, 1, L); s = s - np.convolve(s, np.ones(3) / 3, "same")
        return s * env(L, 0.004, 0.018)

    def whoosh(dur=0.7):
        L = int(dur * sr); x = np.arange(L) / sr; s = rng.uniform(-1, 1, L)
        k = np.convolve(s, np.ones(9) / 9, "same"); shape = np.sin(np.pi * x / dur) ** 2
        return k * shape

    def blip(f=880):
        L = int(0.14 * sr); x = np.arange(L) / sr
        return np.sin(2 * np.pi * (f + 500 * np.exp(-x * 40)) * x) * env(L, 0.002, 0.04)

    bpm = 96; beat = 60 / bpm; bar = 4 * beat
    # A minor -> F -> C -> G (uplifting corporate loop)
    prog = [(110.0, 130.8, 164.8), (87.3, 110.0, 130.8), (130.8, 164.8, 196.0), (98.0, 123.5, 146.8)]
    arp = [0, 1, 2, 1, 2, 1, 0, 2]
    t, k = 0.0, 0
    while t < total:
        ch = prog[k % 4]
        add(pad([f * 2 for f in ch], bar + 0.6), t, 0.10)
        add(pluck(ch[0] / 2, 1.6, 0.6), t, 0.16)
        for i in range(8):
            add(pluck(ch[arp[i]] * 4, 0.6, 0.2), t + i * beat / 2, 0.050 if i % 2 else 0.065)
        if k >= 1:
            for b in range(4):
                if b % 2 == 0: add(kick(), t + b * beat, 0.22)
                add(shaker(), t + b * beat + beat / 2, 0.10)
        t += bar; k += 1
    # gentle fade in/out
    fi = int(1.2 * sr); out[:fi] *= np.linspace(0, 1, fi)
    fo = int(2.0 * sr); out[-fo:] *= np.linspace(1, 0, fo)
    # sfx: whoosh on every scene change, a blip on each caption-driven beat
    for i, s in enumerate(scenes):
        if i: add(whoosh(0.6), s["start"] - 0.35, 0.10)
        for j, c in enumerate(s["caps"]):
            add(blip(740 + 110 * (j % 3)), c["start"] + 0.08, 0.05)
    level = 0.30 if MODE == "guide" else 0.45  # the guide track already carries its own music
    out *= level / max(1e-6, np.abs(out).max())
    write_wav(path, out, sr)


# ---------------------------------------------------------------- html
def cap_html(text):
    def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")
    return re.sub(r"\[([^\]]+)\]", lambda m: f'<span class="hi">{m.group(1)}</span>', esc(text))


def build_html(scenes, total, vo_src, vo_dur):
    tpl = open(A("src", "template.html"), encoding="utf-8").read()
    ends = [scenes[i + 1]["start"] + 0.45 for i in range(len(scenes) - 1)] + [total]
    attrs = {s["id"]: (s["start"] if i else 0.0, e - (s["start"] if i else 0.0)) for i, (s, e) in enumerate(zip(scenes, ends))}

    def fill(m):
        sid = m.group(1); st, du = attrs[sid]
        return f'data-scene="{sid}" data-start="{st:.3f}" data-duration="{du:.3f}"'
    html = re.sub(r'data-scene="(\w+)"', fill, tpl)
    caps = []
    flat = [c for s in scenes for c in s["caps"]]
    for a, b in zip(flat, flat[1:]):  # bridge short gaps so captions never blink off between phrases
        if 0 < b["start"] - a["end"] < 0.8: a["end"] = b["start"]
    for s in scenes:
        for j, c in enumerate(s["caps"]):
            # each phrase stays until the next one starts (no flicker in between)
            caps.append(f'<div id="cap-{s["id"]}-{j}" class="clip cap" data-start="{c["start"]:.3f}" data-duration="{max(0.3, c["end"] - c["start"]):.3f}" '
                        f'data-track-index="6"><div class="cap-in">{cap_html(c["text"])}</div></div>')
    timing = {"total": round(total, 3), "scenes": scenes}
    html = (html.replace("__TOTAL__", f"{total:.3f}").replace("__VO_SRC__", vo_src).replace("__VO_DUR__", f"{vo_dur:.3f}")
            .replace("<!--__CAPTIONS__-->", "\n      ".join(caps))
            .replace("/*__TIMING__*/null", json.dumps(timing, ensure_ascii=False)))
    open(A("index.html"), "w", encoding="utf-8").write(html)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "vo"
    if mode == "vo": scenes, vo_dur, src = layout_vo()
    elif mode == "single": scenes, vo_dur, src = layout_single(sys.argv[2])
    elif mode == "guide": scenes, vo_dur, src = layout_guide()
    else: sys.exit(__doc__)
    total = round(scenes[-1]["end"] + SCRIPT.get("tail", 2.6), 3)
    json.dump({"mode": mode, "total": total, "voice": src, "scenes": scenes}, open(A("timing.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    make_music(total, scenes, A("assets", "music.wav"))
    build_html(scenes, total, src, min(vo_dur, total))
    print(f"mode={mode} total={total:.2f}s voice={src}")
    for s in scenes:
        print(f"  {s['id']:>4} {s['start']:6.2f}-{s['end']:6.2f}  " + " | ".join(f"{c['start']:.2f}" for c in s["caps"]))


if __name__ == "__main__":
    main()
