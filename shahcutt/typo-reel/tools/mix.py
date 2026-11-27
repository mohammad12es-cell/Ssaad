#!/usr/bin/env python3
"""Final mix: voice on top, the reference sound design under it.
usage: mix.py <vo-placed.wav> <sfx.wav> <out mix.wav>
Both stems are loudness-matched first (voice -16 LUFS, sound design -21 LUFS, measured with ffmpeg ebur128), then the
sound design is ducked a further 4 dB while the voice speaks (10 ms attack, 250 ms release)."""
import re, subprocess, sys, wave
import numpy as np
SR = 48000
def rd(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768
def lufs(p):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", e)[-1])
vo, sfx, out = sys.argv[1:4]
V, S = rd(vo), rd(sfx); n = min(len(V), len(S)); V, S = V[:n], S[:n]
V *= 10 ** ((-16 - lufs(vo)) / 20); S *= 10 ** ((-21 - lufs(sfx)) / 20)
h = int(0.01 * SR); k = n // h
e = np.sqrt((V[:k * h, 0].reshape(k, h) ** 2).mean(1)); on = (e > 10 ** (-45 / 20)).astype(float)
g = np.zeros(k); a, r = 1.0, 0.04                      # per-10ms smoothing: fast attack, ~250 ms release
for i in range(k): g[i] = g[i - 1] + (on[i] - g[i - 1]) * (a if on[i] > g[i - 1] else r) if i else on[i]
duck = 10 ** (-4 * np.repeat(g, h) / 20); duck = np.pad(duck, (0, n - len(duck)), constant_values=1)
M = V + S * duck[:, None]
pk = np.abs(M).max(); M = M / pk * 0.95 if pk > 0.95 else M        # headroom; loudness is set by the master
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(M, -1, 1) * 32767).astype(np.int16).tobytes())
print("mix peak", round(float(np.abs(M).max()), 3))
