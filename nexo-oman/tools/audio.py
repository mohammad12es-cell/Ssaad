#!/usr/bin/env python3
"""Synthesize the 15 s soundtrack for the NEXO Oman reel: Hijaz-mode plucked strings, darbuka-style
percussion, pad, plus UI sounds on every visual beat (times match the GSAP timeline in index.html).
usage: python3 tools/audio.py  -> assets/audio.wav"""
import os, wave
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, TOTAL = 44100, 15.0
rng = np.random.default_rng(5)
n = int(TOTAL * SR)
mus, sfx = np.zeros(n), np.zeros(n)


def add(buf, sig, t, g=1.0):
    s = int(t * SR); e = min(n, s + len(sig))
    if e > s >= 0: buf[s:e] += g * sig[: e - s]


def xs(d): return np.arange(int(d * SR)) / SR


def pluck(f, d=0.9, bright=0.5):  # Karplus-Strong string (oud-like)
    N = int(SR / f); buf = rng.uniform(-1, 1, N); out = np.zeros(int(d * SR))
    for i in range(len(out)):
        j = i % N; nx = (j + 1) % N
        out[i] = buf[j]; buf[j] = 0.996 * (bright * buf[j] + (1 - bright) * buf[nx])
    return out * np.minimum(1, xs(d) / 0.002)


def pad(fs, d):
    x = xs(d); s = sum(np.sin(2 * np.pi * (f + det) * x + rng.uniform(0, 6)) for f in fs for det in (-0.6, 0, 0.7))
    return s / (3 * len(fs)) * np.minimum(1, x / 0.8) * np.minimum(1, (d - x) / 0.8)


def doum():
    x = xs(0.35); f = 70 + 60 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)


def tek():
    x = xs(0.09); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(3) / 3, "same")
    return (s * 0.6 + np.sin(2 * np.pi * 1900 * x) * 0.5) * np.exp(-x * 60)


def whoosh(d=0.5, lo=3, hi=14):
    x = xs(d); s = rng.uniform(-1, 1, len(x)); y = np.zeros_like(s); ks = np.interp(np.arange(len(x)), [0, len(x) / 2, len(x)], [1 / hi, 1 / lo, 1 / hi])
    for i in range(1, len(x)): y[i] = y[i - 1] + ks[i] * (s[i] - y[i - 1])
    return y * np.sin(np.pi * x / d) ** 2 * 3


def pop(f=600):
    x = xs(0.12); return np.sin(2 * np.pi * (f + 900 * np.exp(-x * 60)) * x) * np.exp(-x * 36)


def chime(f=1318.5, d=1.0):
    x = xs(d); return sum(np.sin(2 * np.pi * f * m * x) * g for m, g in ((1, 1), (2.76, 0.3), (5.4, 0.1))) * np.exp(-x * 4.5) * np.minimum(1, x / 0.002)


def tick(f):
    x = xs(0.18); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 3 * f * x) * np.exp(-x * 40)) * np.exp(-x * 22) * np.minimum(1, x / 0.001)


def shimmer(d=1.0):
    out = np.zeros(int(d * SR))
    for i in range(14):
        c = chime(2200 + 260 * (i % 6), 0.5) * 0.25; s = int(i * d / 14 * SR); e = min(len(out), s + len(c)); out[s:e] += c[: e - s]
    return out


def impact():
    x = xs(1.2); f = 45 + 60 * np.exp(-x * 12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 3.5) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 25) * 0.25


def riser(d):
    x = xs(d); s = rng.uniform(-1, 1, len(x)); y = np.convolve(s, np.ones(6) / 6, "same")
    return y * (x / d) ** 2 * 0.8 + np.sin(2 * np.pi * (200 + 600 * (x / d) ** 2) * x) * (x / d) ** 2 * 0.15


# ---------------------------------------------------------------- music (112 bpm, D Hijaz)
bpm = 112; b = 60 / bpm
D4, Eb4, Fs4, G4, A4, Bb4, C5, D5 = 293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33
add(mus, pad([146.83, 220.0, 293.66], 15.0), 0, 0.10)
add(mus, pad([73.42, 110.0], 15.0), 0, 0.10)
add(mus, riser(1.4), 0.0, 0.05)
motif = [(0, D5, 1), (0.5, C5, 0.5), (0.75, Bb4, 0.5), (1, A4, 1), (2, Bb4, 0.5), (2.5, A4, 0.5), (3, Fs4, 0.6), (3.5, G4, 0.5)]
motif2 = [(0, A4, 1), (0.5, Bb4, 0.5), (1, C5, 1), (1.5, Bb4, 0.5), (2, A4, 0.5), (2.5, G4, 0.5), (3, Fs4, 0.7), (3.5, Eb4, 0.4)]
t0 = 1.55  # groove starts with the maroon badge
bars = int((12.1 - t0) / (4 * b)) + 1
for k in range(bars):
    bt = t0 + k * 4 * b
    for st, f, g in (motif if k % 2 == 0 else motif2):
        tt = bt + st * b
        if tt < 12.0: add(mus, pluck(f, 0.8, 0.55), tt, 0.16 * g)
    for st in (0, 1.5, 2):  # maqsum: D T - T D - T -
        tt = bt + st * b
        if tt < 12.05: add(mus, doum(), tt, 0.32)
    for st in (0.5, 1.0, 2.5, 3.0, 3.5):
        tt = bt + st * b
        if tt < 12.05: add(mus, tek(), tt, 0.10)
    add(mus, pluck(73.42 * 2, 1.6, 0.5), bt, 0.2)
# final chord after the CTA hit
for f, d in ((146.83, 0), (220.0, 0.06), (293.66, 0.12), (369.99, 0.18), (440.0, 0.24)):
    add(mus, pluck(f, 2.6, 0.6), 12.1 + d, 0.16)
add(mus, pad([146.83, 220.0, 293.66, 369.99], 2.9), 12.1, 0.12)
fo = int(1.2 * SR); mus[-fo:] *= np.linspace(1, 0, fo)

# ---------------------------------------------------------------- sfx (times = index.html beats)
add(sfx, shimmer(0.9), 0.1, 0.5); add(sfx, whoosh(0.7, 2, 10), 0.5, 0.35); add(sfx, impact(), 1.45, 0.25)
add(sfx, tick(1046.5), 0.78, 0.25); add(sfx, tick(1174.7), 1.02, 0.25); add(sfx, pop(560), 1.55, 0.45); add(sfx, shimmer(0.7), 1.65, 0.3)
add(sfx, whoosh(0.45), 3.4, 0.4); add(sfx, pop(640), 3.72, 0.35); add(sfx, pop(700), 4.05, 0.4); add(sfx, pop(760), 4.22, 0.4)
add(sfx, whoosh(1.1, 2, 7), 4.6, 0.32); add(sfx, pop(820), 5.55, 0.45); add(sfx, chime(1567.98, 1.0), 5.6, 0.25)
add(sfx, whoosh(0.45), 6.4, 0.4); add(sfx, pop(520), 6.78, 0.35)
for i, f in enumerate([880.0, 987.8, 1108.7, 1174.7, 1318.5, 1480.0, 1568.0]):
    add(sfx, tick(f), 7.05 + i * 0.62, 0.32)
add(sfx, shimmer(0.6), 9.75, 0.35)
add(sfx, whoosh(0.5), 11.9, 0.4); add(sfx, impact(), 12.1, 0.4); add(sfx, pop(600), 12.6, 0.4); add(sfx, shimmer(1.0), 14.0, 0.3)

mus *= 0.42 / max(1e-6, np.abs(mus).max()); sfx *= 0.32 / max(1e-6, np.abs(sfx).max())
mix = np.clip(mus + sfx, -1, 1)
with wave.open(os.path.join(HERE, "assets", "audio.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("assets/audio.wav", round(len(mix) / SR, 2), "s, peak", round(float(np.abs(mix).max()), 3))
