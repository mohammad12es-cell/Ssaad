#!/usr/bin/env python3
"""Festive bed for the Yerevan Christmas edit: FM bells, soft pad, sleigh shaker, transition whooshes.
Everything is synthesized here and ducked under the presenter's voice.
usage: python3 tools/music.py assets/music.wav [assets/voice.wav]"""
import sys, wave, numpy as np
sr, T = 44100, 16.95; n = int(sr * T); out = np.zeros(n); rng = np.random.default_rng(5)
def add(sig, t, g=1.0):
    s = int(t * sr); e = min(n, s + len(sig))
    if e > s >= 0: out[s:e] += g * sig[: e - s]
def bell(f, dur=1.6):
    x = np.arange(int(dur * sr)) / sr; mod = np.sin(2 * np.pi * f * 3.5 * x) * 2.2 * np.exp(-x * 4)
    return np.sin(2 * np.pi * f * x + mod) * np.exp(-x * 2.6) * np.minimum(1, x / 0.003)
def pad(fs, dur):
    x = np.arange(int(dur * sr)) / sr; s = sum(np.sin(2 * np.pi * (f + d) * x) for f in fs for d in (-0.5, 0.6)) / (2 * len(fs))
    return s * np.minimum(1, x / 0.8) * np.minimum(1, (dur - x) / 0.8)
def shaker():
    L = int(0.08 * sr); s = rng.uniform(-1, 1, L); s = s - np.convolve(s, np.ones(4) / 4, "same"); return s * np.exp(-np.arange(L) / sr * 45)
def whoosh(d=0.7):
    L = int(d * sr); x = np.arange(L) / sr; s = np.convolve(rng.uniform(-1, 1, L), np.ones(12) / 12, "same"); return s * np.sin(np.pi * x / d) ** 2
bpm = 104; b = 60 / bpm
prog = [(261.6, 329.6, 392.0), (220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (196.0, 246.9, 293.7)]  # C Am F G
mel = [784, 659, 698, 784, 880, 784, 659, 587]
t, k = 0.0, 0
while t < T:
    ch = prog[k % 4]; add(pad([f for f in ch], 4 * b + 0.8), t, 0.12)
    for i in range(8):
        if (k + i) % 3 != 2: add(bell(mel[(i + k * 2) % 8] * (0.5 if i % 2 else 1), 1.4), t + i * b / 2, 0.03)
        add(shaker(), t + i * b / 2 + b / 4, 0.05)
    t += 4 * b; k += 1
for tw in (4.85, 9.62): add(whoosh(0.7), tw - 0.35, 0.09)
for tp in (0.35, 2.25, 5.2, 6.2, 7.65, 10.05, 13.05, 14.1, 15.1): add(bell(1568, 0.9), tp, 0.02)
fi = int(0.6 * sr); out[:fi] *= np.linspace(0, 1, fi); fo = int(1.4 * sr); out[-fo:] *= np.linspace(1, 0, fo)
out *= 0.15 / np.abs(out).max()
# duck under the voice: -7 dB while he talks, smooth attack/release
if len(sys.argv) > 2:
    with wave.open(sys.argv[2]) as v:
        ch, vsr = v.getnchannels(), v.getframerate(); x = np.frombuffer(v.readframes(v.getnframes()), dtype=np.int16).astype(float) / 32768
    x = x.reshape(-1, ch).mean(axis=1); hop = vsr // 100; r = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same")[::hop])
    talk = (r > r.max() * 10 ** (-30 / 20)).astype(float); env = np.zeros_like(talk); g = 0.0
    for i, a in enumerate(talk): g = g + (a - g) * (0.35 if a > g else 0.06); env[i] = g
    duck = 1 - (1 - 10 ** (-7 / 20)) * np.interp(np.arange(n) / sr, np.arange(len(env)) / 100, env)
    out *= duck
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
