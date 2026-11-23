#!/usr/bin/env python3
"""Audio for the IRAM CO. Black Friday talking head -> assets/audio/{voice,music,sfx,mix}.wav (48 kHz).

voice: the speaker's own lav track, lightly cleaned (high-pass, gentle denoise, -2 dB mud at 300 Hz,
       +2.5 dB presence at 3.5 kHz, light de-ess, 3:1 compression).
music: the IRAM CO. house sound kit (Karplus-Strong plucks over an A drone, doum-tek groove, the same
       functions as armenia-residency/build.py), 100 BPM, ducked under the voice, closing chord on the logo.
sfx:   one sound per graphic event in work/plan.json.
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, *p)
P = json.load(open(A("work", "plan.json"), encoding="utf-8")); EV = P["ev"]
SR = 48000; TOTAL = EV["total"]; N = int(TOTAL * SR)

# ---------------------------------------------------------------- voice
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", A("work", "voice-raw.wav"), "-af",
                "highpass=f=85,afftdn=nr=6:nf=-45,equalizer=f=300:t=q:w=1.2:g=-2,equalizer=f=3500:t=q:w=1.0:g=2.5,"
                "deesser=i=0.3,acompressor=threshold=-22dB:ratio=3:attack=8:release=160:makeup=4dB,"
                f"apad=whole_dur={TOTAL},atrim=0:{TOTAL}", "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", A("work", "voice.wav")], check=True)
w = wave.open(A("work", "voice.wav")); voice = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
voice = np.pad(voice[:N], (0, max(0, N - len(voice))))

# ---------------------------------------------------------------- IRAM CO. sound kit (as in armenia-residency/build.py)
rng = np.random.default_rng(11)
def xs(d): return np.arange(int(d * SR)) / SR
def pluck(f, d=0.9, bright=0.5):
    Np = int(SR / f); buf = rng.uniform(-1, 1, Np); out = np.zeros(int(d * SR))
    for i in range(len(out)):
        j = i % Np; nx = (j + 1) % Np; out[i] = buf[j]; buf[j] = 0.996 * (bright * buf[j] + (1 - bright) * buf[nx])
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
def click(f=3200):
    x = xs(0.06); return (np.sin(2 * np.pi * f * x) * 0.6 + rng.uniform(-1, 1, len(x)) * 0.5) * np.exp(-x * 90)
def stamp():
    x = xs(0.5); f = 60 + 120 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 10) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 45) * 0.5
def tick(f): x = xs(0.18); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 3 * f * x) * np.exp(-x * 40)) * np.exp(-x * 22) * np.minimum(1, x / 0.001)
def impact():
    x = xs(1.2); f = 45 + 60 * np.exp(-x * 12); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 3.5) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 25) * 0.25

mus, sfx = np.zeros(N), np.zeros(N)
def add(buf, sig, t, g=1.0):
    s = int(t * SR); e = min(N, s + len(sig))
    if e > s >= 0: buf[s:e] += g * sig[: e - s]

# ---------------------------------------------------------------- music: A drone, E-Dashti-flavoured pluck motif, doum-tek groove
b = 60 / 100
A3, B3, C4, D4, E4, G4, A4, B4, C5, D5, E5 = 220.0, 246.94, 261.63, 293.66, 329.63, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25
END = EV["end_card"]
add(mus, pad([110.0, 164.81, 220.0], TOTAL), 0, 0.12)
motif = [(0, E5, 1), (0.5, D5, 0.5), (0.75, C5, 0.5), (1, B4, 1), (2, C5, 0.5), (2.5, B4, 0.5), (3, A4, 0.7), (3.5, G4, 0.5)]
motif2 = [(0, A4, 1), (0.5, B4, 0.5), (1, C5, 1), (1.5, D5, 0.5), (2, C5, 0.5), (2.5, B4, 0.5), (3, A4, 0.8), (3.5, E4, 0.4)]
k, t0 = 0, 0.05
while t0 + k * 4 * b < END:
    bt = t0 + k * 4 * b; big = bt >= EV["black"] - 0.3
    for st, f, g in (motif if k % 2 == 0 else motif2):
        tt = bt + st * b
        if tt < END: add(mus, pluck(f, 0.8, 0.55), tt, 0.13 * g)
        if tt < END and big: add(mus, pluck(f * 2, 0.5, 0.6), tt, 0.04 * g)
    if bt >= EV["black"] - 0.3:                         # the groove comes in with «بلک فرایدی»
        for st in (0, 1.5, 2):
            if bt + st * b < END: add(mus, doum(), bt + st * b, 0.28)
        for st in (0.5, 1.0, 2.5, 3.0, 3.5):
            if bt + st * b < END: add(mus, tek(), bt + st * b, 0.07)
    add(mus, pluck(110.0, 1.6, 0.5), bt, 0.18); k += 1
for f, d in ((110.0, 0), (164.81, 0.06), (220.0, 0.12), (277.18, 0.18), (329.63, 0.24)): add(mus, pluck(f, 2.6, 0.6), END + d, 0.15)
add(mus, pad([110.0, 164.81, 220.0, 277.18], TOTAL - END), END, 0.1)
fi = int(0.3 * SR); mus[:fi] *= np.linspace(0, 1, fi); fo = int(1.2 * SR); mus[-fo:] *= np.linspace(1, 0, fo)

# ---------------------------------------------------------------- sfx on the graphics (times mirror index.html)
add(sfx, whoosh(0.5), EV["armenia"] - 0.25, 0.25)                       # route arc
add(sfx, impact(), EV["black"] - 0.02, 0.35); add(sfx, pop(560), EV["black"], 0.35)   # Black Friday tag drops in
add(sfx, shimmer(0.7), EV["friday"] + 0.1, 0.18)
for i in range(6): add(sfx, tick(1100 + 90 * i), EV["capacity"] + i * 0.17, 0.18)     # capacity meter fills
add(sfx, stamp(), EV["full"], 0.5)                                       # «تکمیل»
add(sfx, pop(620), EV["think"] + 0.05, 0.3)                              # booking card
# interstitial (index.html I0 = 12.42, I1 = 13.9): wipe in, key card slides up, taps the lock, green light, wipe out
add(sfx, whoosh(0.4, 3, 14), 12.36, 0.3); add(sfx, whoosh(0.45, 2, 10), 12.66, 0.28); add(sfx, click(2400), 13.15, 0.5)
add(sfx, chime(1760.0, 1.0), 13.26, 0.24); add(sfx, shimmer(0.6), 13.3, 0.15); add(sfx, whoosh(0.6, 2, 12), 13.55, 0.32)
for i in range(7): add(sfx, tick(1400 if i % 2 else 1050), 14.0 + i * 0.3, 0.16)  # the clock
for i in range(3): add(sfx, click(3600 + 200 * (i % 2)), EV["tour"] + 0.04 + i * 0.1, 0.25)  # typing «تور»
add(sfx, pop(820), EV["comment"] + 0.05, 0.4)
add(sfx, whoosh(0.6, 2, 12), EV["send"] - 0.15, 0.3); add(sfx, pop(900), EV["send"] + 0.35, 0.3)  # paper plane
add(sfx, shimmer(1.1), END + 0.1, 0.3); add(sfx, chime(1318.5, 1.6), END + 0.35, 0.2)

# ---------------------------------------------------------------- mix: music ducked under the voice
hop = int(0.01 * SR); kk = N // hop
e = np.sqrt((voice[: kk * hop].reshape(kk, hop) ** 2).mean(1)); on = np.convolve((e > e.max() * 10 ** (-32 / 20)).astype(float), np.ones(30) / 30, "same")
duck = np.repeat(1 - 0.55 * np.clip(on * 1.6, 0, 1), hop); duck = np.pad(duck, (0, N - len(duck)), constant_values=1)
mus = mus / max(1e-6, np.abs(mus).max()) * 0.30 * duck
sfx = sfx / max(1e-6, np.abs(sfx).max()) * 10 ** (-15 / 20)
mix = voice * 0.92 + mus + sfx
def wr(path, x):
    st = np.stack([x, x], 1); pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as o:
        o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(pcm.tobytes())
for name, x in (("voice", voice), ("music", mus), ("sfx", sfx), ("mix", mix)):
    wr(A("assets", "audio", f"{name}.wav"), x)
print("audio done", TOTAL, "s; peak mix", round(float(np.abs(mix).max()), 3))
