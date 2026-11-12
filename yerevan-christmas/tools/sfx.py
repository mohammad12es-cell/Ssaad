# Subtle UI sounds for the card-style edit (pops, ticks, whooshes, a stamp, a glint), one stereo track.
import numpy as np, wave, sys
SR, T = 48000, 16.95
out = np.zeros((int(SR * T), 2), np.float32)
rng = np.random.default_rng(7)
def add(t, sig, pan=0.0, gain=1.0):
    i = int(t * SR); sig = sig[: max(0, len(out) - i)]
    out[i:i + len(sig), 0] += sig * gain * (1 - max(0, pan)); out[i:i + len(sig), 1] += sig * gain * (1 + min(0, pan))
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(t / a, 1) * np.exp(-t / d)
def pop(f0=700, f1=1300, dur=0.09):
    n = int(SR * dur); t = np.arange(n) / SR; f = f0 + (f1 - f0) * (t / dur) ** 0.5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.03)
def tick(f=2400, dur=0.04):
    n = int(SR * dur); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * 0.6 + np.sin(2 * np.pi * f * 1.5 * t) * 0.3) * env(n, 0.0005, 0.008)
def whoosh(dur=0.45, lo=300, hi=3500):
    n = int(SR * dur); x = rng.standard_normal(n); t = np.arange(n) / SR
    # one-pole low-pass with a cutoff that sweeps up then down
    fc = lo + (hi - lo) * np.sin(np.pi * t / dur) ** 2; y = np.zeros(n); s = 0.0
    for k in range(n):
        al = 1 - np.exp(-2 * np.pi * fc[k] / SR); s += al * (x[k] - s); y[k] = s
    return y * np.sin(np.pi * t / dur) ** 1.5 * 0.9
def thud(dur=0.32):
    n = int(SR * dur); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (95 * np.exp(-t * 6)) * t) * env(n, 0.001, 0.09)
    slap = rng.standard_normal(n) * env(n, 0.0005, 0.012) * 0.5
    return body + slap
def glint():
    n = int(SR * 0.9); t = np.arange(n) / SR; y = np.zeros(n)
    for j, f in enumerate([1568, 2093, 2637, 3136]):
        d = int(j * 0.06 * SR); seg = np.sin(2 * np.pi * f * t[: n - d]) * env(n - d, 0.002, 0.18); y[d:] += seg * (0.5 - j * 0.08)
    return y
# mode changes / photo changes
for t, g in [(1.02, 0.55), (4.88, 0.5), (6.20, 0.35), (7.60, 0.35), (9.25, 0.3), (12.62, 0.5), (13.98, 0.45), (15.88, 0.5)]:
    add(t, whoosh(), gain=g)
# card / row entries
for t, p in [(1.80, 0.1), (2.25, -0.1), (3.84, 0.1), (5.18, 0), (10.05, 0), (12.75, 0), (14.12, 0), (14.20, 0.1), (14.28, -0.1), (16.08, 0)]:
    add(t, pop(), pan=p, gain=0.45)
# checks and slot fills
for t in [4.28, 5.64, 6.28, 8.42, 14.30, 14.38, 14.50]:
    add(t, tick(), gain=0.5); add(t + 0.03, pop(1100, 1700, 0.07), gain=0.25)
# the clock counting up to 18:00
for k in range(7):
    add(10.68 + k * 0.075, tick(3000, 0.025), pan=0.2 * (-1) ** k, gain=0.28)
add(11.76, pop(600, 1000, 0.1), gain=0.35)
add(13.28, glint(), gain=0.22)
add(15.15, thud(), gain=0.75)
pk = np.abs(out).max(); out *= 10 ** (-18 / 20) / pk   # peaks at -18 dBFS, well under the voice
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "assets/sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok")
