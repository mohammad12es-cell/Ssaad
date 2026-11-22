#!/usr/bin/env python3
"""SFX for the full 30 s reel -> assets/audio/sfx-full.wav (48 kHz stereo).

Beats 1-2 (group A) are the approved sample's cues, cut hard at 3.89 s so v1 plays in total silence.
New cues follow the word onsets in vo/words.json and the visual events in index.html.
New sounds are synthesized here (assets/sfx/gen/); all of them sit mostly below 5 kHz.
"""
import os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "assets", "sfx")
GEN = os.path.join(SFX, "gen")
OUT = os.path.join(ROOT, "assets", "audio")
DUR = 30.0
SR = 48000
os.makedirs(GEN, exist_ok=True)
rng = np.random.default_rng(5)


def xs(d): return np.arange(int(d * SR)) / SR


def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc); y[i] = acc
    return y


def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    p = os.path.join(GEN, name)
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
    return p


x = xs(0.18)
snap = (np.sin(2 * np.pi * 2300 * x) * np.exp(-x * 160) * 0.5 + lp(rng.uniform(-1, 1, len(x)), 3000) * np.exp(-x * 120)
        + np.sin(2 * np.pi * np.cumsum(140 * np.exp(-x * 30) + 60) / SR) * np.exp(-x * 30) * 0.9)
G = {"snap": save("snap.wav", snap)}
x = xs(0.05); G["tick"] = save("tick.wav", np.sin(2 * np.pi * 1250 * x) * np.exp(-x * 120) + lp(rng.uniform(-1, 1, len(x)), 2500) * np.exp(-x * 200) * 0.6)
x = xs(0.09); G["dead"] = save("dead.wav", lp(np.sin(2 * np.pi * 520 * x) * np.exp(-x * 70) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 150) * 0.4, 1500))
x = xs(0.32); G["draw"] = save("draw.wav", lp(rng.uniform(-1, 1, len(x)), 2200) * np.sin(np.pi * x / 0.32) ** 2)
x = xs(0.36); u = x / 0.36
sw = np.zeros(len(x)); src = rng.uniform(-1, 1, len(x)); acc = 0.0
for i in range(len(x)):
    a = 1 - np.exp(-2 * np.pi * (300 + 2600 * u[i] ** 2) / SR); acc += a * (src[i] - acc); sw[i] = acc
G["swish"] = save("swish.wav", sw * u ** 1.5 * np.minimum(1, (1 - u) / 0.1))
x = xs(0.3); G["thump"] = save("thump.wav", np.sin(2 * np.pi * np.cumsum(45 + 45 * np.exp(-x * 25)) / SR) * np.exp(-x * 11))
x = xs(0.075); G["beep"] = save("beep.wav", np.sin(2 * np.pi * 1000 * x) * np.minimum(1, x / 0.004) * np.minimum(1, (0.075 - x) / 0.01))
x = xs(0.32); G["crack"] = save("crack.wav", lp(rng.uniform(-1, 1, len(x)), 3500) * np.exp(-x * 60)
                                 + np.sin(2 * np.pi * np.cumsum(320 * np.exp(-x * 9) + 70) / SR) * np.exp(-x * 9) * 0.7)
x = xs(0.28); G["zzt"] = save("zzt.wav", lp((np.sign(np.sin(2 * np.pi * 180 * x)) * 0.4 + rng.uniform(-1, 1, len(x)) * 0.3)
                                            * (np.floor(x * 30) % 2 == 0), 1800) * np.sin(np.pi * x / 0.28))

REW = os.path.join(OUT, "rewind.wav")  # from the sample (tools/mix_sfx.py)


def s(name):
    return G.get(name) or (name if os.path.isabs(name) else os.path.join(SFX, name))


# ---- group A: the approved sample, unchanged
A = ([(0.10, "focus-click.mp3", 0.9), (0.45, "focus-click.mp3", 0.9), (0.85, "boom.mp3", 1.0)]
     + [(t, "focus-click-n.wav", 0.45) for t in (1.35, 1.47, 1.59, 1.71, 1.83)]
     + [(2.40, "whoosh-dark.mp3", 0.8)]
     + [(t, "focus-click-n.wav", 0.4) for t in (2.68, 2.80, 2.92, 3.08, 3.18)]
     + [(3.30, REW, 0.9)])

# ---- beat 3: fix 1 (word by word)
B = ([(4.95, "focus-click-n.wav", 0.6), (5.48, "snap", 0.55), (5.52, "focus-click.mp3", 0.85), (5.52, "boom.mp3", 0.6)]
     + [(t, "focus-click-n.wav", 0.35) for t in (5.62, 5.72, 5.82)]
     + [(t, "focus-click-n.wav", 0.3) for t in (5.98, 6.18, 6.44, 6.56)]
     + [(6.75, "glint-n.wav", 0.45)]
     + [(t, "tick", 0.16) for t in (7.23, 7.42, 7.60, 7.86, 8.26)]
     + [(8.00, "crack", 0.45), (8.42, "snap", 0.45), (8.78, "whoosh-dark.mp3", 0.55)])
# ---- beat 4: fix 2 (spring)
C = ([(9.10, "focus-click-n.wav", 0.5), (9.12, "draw", 0.25), (9.45, "focus-click.mp3", 0.7), (9.45, "swish", 0.35),
      (9.61, "thump", 0.6)]
     + [(t, "focus-click-n.wav", 0.28) for t in (10.16, 10.30, 10.53)]
     + [(10.18, "draw", 0.22), (10.72, "dead", 0.5), (11.26, "whoosh-dark.mp3", 0.3), (11.48, "thump", 0.5),
        (11.90, "dead", 0.45), (12.04, "tick", 0.25), (12.76, "whoosh-dark.mp3", 0.55)])
# ---- beat 5: fix 3 (hand-held)
D = ([(13.10, "focus-click-n.wav", 0.45), (13.14, "beep", 0.22), (13.30, "beep", 0.22), (13.57, "focus-click.mp3", 0.75),
      (13.78, "boom.mp3", 0.85)]
     + [(t, "focus-click-n.wav", 0.28) for t in (14.80, 15.01, 15.46)]
     + [(16.20, "zzt", 0.25), (16.92, "whoosh-dark.mp3", 0.95)])
# ---- beat 6: fix 4 (motion blur + sound)
E = [(17.30, "focus-click-n.wav", 0.5), (18.08, "whoosh-dark.mp3", 0.7), (18.51, "whoosh-dark.mp3", 0.45),
     (17.55, "dead", 0.4), (19.92, "glint-n.wav", 0.45)]
# ---- beat 7: drop + outro
F = ([(22.00, "smash.mp3", 0.75)]
     + [(t, "focus-click-n.wav", 0.32) for t in (22.00, 22.25, 22.50, 22.75)]
     + [(22.10, "focus-click-n.wav", 0.3), (22.22, "focus-click-n.wav", 0.3), (22.58, "boom.mp3", 0.6),
        (23.38, "whoosh-dark.mp3", 0.7), (23.60, "boom.mp3", 0.8), (23.98, "focus-click.mp3", 0.6)]
     + [(t, "focus-click-n.wav", 0.25) for t in (24.34, 24.48, 24.72)])
# ---- beat 8: CTA + loop
H = ([(25.42, "whoosh-dark.mp3", 0.6), (25.70, "focus-click-n.wav", 0.45), (25.96, "focus-click-n.wav", 0.45),
      (26.14, "focus-click.mp3", 0.6), (26.14, "glint-n.wav", 0.5), (26.80, "swell.mp3", 0.55)]
     + [(t, "tick", 0.15) for t in (26.95, 27.08, 27.46, 27.86, 28.02, 28.18)]
     + [(28.85, "glint-n.wav", 0.25), (29.40, "ballwhoosh-rev.wav", 0.45)])

FF = ["ffmpeg", "-y", "-v", "error"]


def bus(cues, name, cut=None):
    args, fc = list(FF), []
    for i, (t, nm, vol) in enumerate(cues):
        args += ["-i", s(nm)]
        tone = ",lowpass=f=7000" if "glint" in nm else ""
        fc.append(f"[{i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo{tone},volume={vol},"
                  f"adelay=delays={int(round(t * 1000))}:all=1,apad=whole_dur={DUR},atrim=0:{DUR}[a{i}]")
    tail = f",afade=t=out:st={cut}:d=0.01" if cut else ""
    fc.append("".join(f"[a{i}]" for i in range(len(cues))) + f"amix=inputs={len(cues)}:normalize=0:duration=longest{tail},atrim=0:{DUR}[out]")
    p = os.path.join(OUT, f"sfx-{name}.wav")
    subprocess.run(args + ["-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", "-c:a", "pcm_f32le", p], check=True)
    return p


parts = [bus(A, "A", 3.89)] + [bus(c, n) for c, n in ((B, "B"), (C, "C"), (D, "D"), (E, "E"), (F, "F"), (H, "H"))]
args = list(FF)
for p in parts:
    args += ["-i", p]
fc = "".join(f"[{i}:a]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0:duration=longest,atrim=0:{DUR}[out]"
subprocess.run(args + ["-filter_complex", fc, "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s24le",
                       os.path.join(OUT, "sfx-full.wav")], check=True)
for p in parts:
    os.remove(p)
print("ok: assets/audio/sfx-full.wav", sum(len(c) for c in (A, B, C, D, E, F, H)), "cues")
