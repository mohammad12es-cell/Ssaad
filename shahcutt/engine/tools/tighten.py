#!/usr/bin/env python3
"""Tighten a cleaned narration: cap every pause at CAP seconds (10 ms crossfades), then speed up by TEMPO
(ffmpeg atempo keeps the pitch). usage: python3 tools/tighten.py IN.wav OUT.wav [CAP=0.4] [TEMPO=1.04]"""
import subprocess, sys, wave
import numpy as np

src, dst = sys.argv[1], sys.argv[2]; CAP = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4; TEMPO = float(sys.argv[4]) if len(sys.argv) > 4 else 1.04
w = wave.open(src); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
n = int(0.01 * sr); k = len(x) // n
db = 20 * np.log10(np.sqrt((x[: k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)
quiet = db < -48; keep = np.ones(len(x), bool); s = None; cut = 0.0
first = int(np.argmax(~quiet))  # leave the lead-in silence alone
for i in range(first, k + 1):
    q = quiet[i] if i < k else False
    if q and s is None: s = i
    if not q and s is not None:
        d = (i - s) * 0.01
        if d > CAP:
            a = int((s + CAP / 2 / 0.01) * n); b = int((i - CAP / 2 / 0.01) * n)
            keep[a:b] = False; cut += (b - a) / sr
        s = None
y = x[keep]
tmp = dst + ".tmp.wav"
with wave.open(tmp, "wb") as o:
    o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"atempo={TEMPO}", dst], check=True)
subprocess.run(["rm", "-f", tmp])
print(f"cut {cut:.2f}s of pauses, {len(x) / sr:.2f}s -> {len(y) / sr / TEMPO:.2f}s")
