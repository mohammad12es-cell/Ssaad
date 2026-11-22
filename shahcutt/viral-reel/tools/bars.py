#!/usr/bin/env python3
"""Per-frame band levels of the music for beat 6's waveform -> assets/bars.js (window.BARS).

24 log-spaced bands, 30 fps, frames F0..F1 (19.90-21.75 s), 0..1, fast attack / slower release.
The bars in index.html read BARS[frame - F0], so they move with the real music.
"""
import json, os, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
w = wave.open(os.path.join(ROOT, "assets", "audio", "music.wav")); sr = w.getframerate(); n = w.getnframes()
raw = np.frombuffer(w.readframes(n), np.uint8).reshape(-1, 3)
v = (raw[:, 0].astype(np.int32) | (raw[:, 1].astype(np.int32) << 8) | (raw[:, 2].astype(np.int32) << 16))
v = np.where(v >= 1 << 23, v - (1 << 24), v).astype(np.float64) / (1 << 23)
x = v.reshape(-1, 2).mean(1)
F0, F1, NB, win = 597, 656, 24, 2048
edges = np.geomspace(40, 9000, NB + 1)
fr = np.fft.rfftfreq(win, 1 / sr); hann = np.hanning(win)
rows = []
for f in range(F0, F1):
    c = int(f / 30 * sr); seg = x[max(0, c - win // 2): c + win // 2]
    seg = np.pad(seg, (0, win - len(seg))) * hann
    X = np.abs(np.fft.rfft(seg))
    rows.append([X[(fr >= edges[i]) & (fr < edges[i + 1])].mean() if np.any((fr >= edges[i]) & (fr < edges[i + 1])) else 0 for i in range(NB)])
B = 20 * np.log10(np.array(rows) + 1e-6)
B = np.clip((B - (B.max() - 42)) / 42, 0, 1)
out = np.zeros_like(B)
for i in range(len(B)):
    prev = out[i - 1] if i else np.zeros(NB)
    out[i] = np.where(B[i] > prev, B[i], prev * 0.72 + B[i] * 0.28)
open(os.path.join(ROOT, "assets", "bars.js"), "w").write(
    f"window.BARS={{f0:{F0},nb:{NB},d:{json.dumps([[round(float(a), 2) for a in r] for r in out])}}};\n")
print("bars.js", out.shape, "mean", out.mean().round(2))
