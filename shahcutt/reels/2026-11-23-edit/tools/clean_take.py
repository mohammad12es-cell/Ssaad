#!/usr/bin/env python3
"""Clean a Gemini TTS take: drop the click at the very start and the noise burst Gemini appends after the
final silence, fade the edges, put LEAD seconds of silence in front.
usage: python3 tools/clean_take.py IN.wav OUT.wav [LEAD]   -> prints the time shift applied to the take"""
import sys, wave
import numpy as np

src, dst = sys.argv[1], sys.argv[2]; LEAD = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
w = wave.open(src); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
n = int(0.01 * sr); k = len(x) // n
db = 20 * np.log10(np.sqrt((x[: k * n].reshape(k, n) ** 2).mean(1)) + 1e-9)
# start: first frame is a click; begin at the first quiet frame after it
a = next(i for i in range(k) if db[i] < -50) * n
# end: Gemini appends a short loud noise burst after a moment of digital silence; cut at the first
# near-silent frame of the last 0.6 s (the speech tail never drops that low)
tail0 = k - 60
b = next((i * n for i in range(tail0, k) if db[i] < -70), len(x))
y = x[a:b].copy()
fi, fo = int(0.01 * sr), int(0.04 * sr)
y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)
y = np.concatenate([np.zeros(int(LEAD * sr), np.float32), y])
with wave.open(dst, "wb") as o:
    o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
print(f"{LEAD - a / sr:.4f}")
print(f"kept {a / sr:.3f}-{b / sr:.3f}s of {len(x) / sr:.2f}s -> {len(y) / sr:.2f}s", file=sys.stderr)
