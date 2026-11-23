#!/usr/bin/env python3
"""Sound design for typo-reel -> assets/audio/mix.wav (48 kHz stereo, 22.5 s).

Like the reference there is no voice and no music bed: one sound per device, near-silence in between
(a faint low room tone keeps it from dropping to digital zero). Times mirror index.html:
hook 0-4.60, black 4.60-5.965, mistakes at 5.965 + 2.7*k, CTA 19.47-22.5.
Mastered later by tools/deliver.sh (-14 LUFS).
"""
import os, wave
import numpy as np

SR = 48000; TOTAL = 22.5; N = int(TOTAL * SR)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(23)
L = np.zeros(N); R = np.zeros(N)

def xs(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.005, rel=None):
    x = xs(d); e = np.minimum(1, x / max(a, 1e-4))
    return e * (np.exp(-x * (rel if rel else 0)) if rel else 1)
def lp(sig, k):                       # one-pole low-pass, k in (0,1]: higher = brighter
    y = np.zeros_like(sig); acc = 0.0
    for i in range(len(sig)): acc += k * (sig[i] - acc); y[i] = acc
    return y
def put(sig, t, g=1.0, pan=0.0):      # pan -1 (left) .. 1 (right)
    s = int(t * SR); e = min(N, s + len(sig))
    if e <= s or s < 0: return
    gl, gr = np.sqrt((1 - pan) / 2) * g, np.sqrt((1 + pan) / 2) * g
    L[s:e] += gl * sig[: e - s]; R[s:e] += gr * sig[: e - s]
def put_pan(sig, t, g, p0, p1):       # pan moving across the sound
    s = int(t * SR); e = min(N, s + len(sig)); n = e - s
    if n <= 0: return
    p = np.linspace(p0, p1, n); L[s:e] += np.sqrt((1 - p) / 2) * g * sig[:n]; R[s:e] += np.sqrt((1 + p) / 2) * g * sig[:n]

def whoosh(d, lo=0.02, hi=0.35, shape="bell"):
    x = xs(d); n = rng.uniform(-1, 1, len(x)); k = np.interp(x, [0, d * 0.6, d], [lo, hi, lo])
    y = np.zeros_like(n); a = 0.0
    for i in range(len(n)): a += k[i] * (n[i] - a); y[i] = a
    e = np.sin(np.pi * np.clip(x / d, 0, 1)) ** (2 if shape == "bell" else 1)
    if shape == "rise": e = (x / d) ** 2.2 * np.minimum(1, (d - x) / 0.02)
    if shape == "rev": e = (x / d) ** 3 * np.minimum(1, (d - x) / 0.01)
    return y * e * 3.2
def thump(f0=55, d=0.6, drop=70, decay=7):
    x = xs(d); f = f0 + drop * np.exp(-x * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * decay) * np.minimum(1, x / 0.002)
def click(f=2600, d=0.05, decay=120):
    x = xs(d); return (np.sin(2 * np.pi * f * x) * 0.7 + rng.uniform(-1, 1, len(x)) * 0.35) * np.exp(-x * decay)
def blip(f, d=0.07): x = xs(d); return np.sin(2 * np.pi * f * x) * np.exp(-x * 55) * np.minimum(1, x / 0.001)
def chime(f=1567.98, d=1.4):
    x = xs(d); s = sum(np.sin(2 * np.pi * f * m * x + m) * g for m, g in ((1, 1), (2.0, 0.35), (2.76, 0.22), (5.4, 0.06)))
    return s * np.exp(-x * 3.2) * np.minimum(1, x / 0.003)
def shimmer(d=0.5, base=3200):
    out = np.zeros(int(d * SR))
    for i in range(10):
        c = chime(base + 380 * (i % 5), 0.35) * 0.22; s = int(i * d / 10 * SR); e = min(len(out), s + len(c)); out[s:e] += c[: e - s]
    return out * np.linspace(1, 0.6, len(out))
def scribble(d=0.26):
    x = xs(d); n = rng.uniform(-1, 1, len(x)); n = n - lp(n, 0.25)            # pencil: bright scratchy noise
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 23 * x) ** 2; return n * am * np.sin(np.pi * x / d) ** 0.7 * 0.8
def boom(d=1.1):
    x = xs(d); f = 38 + 50 * np.exp(-x * 9); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 3.1)
    return s + lp(rng.uniform(-1, 1, len(x)), 0.05) * np.exp(-x * 14) * 2.0
def riser(d):
    x = xs(d); f = 180 * 2 ** (x / d * 2.3); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (whoosh(d, 0.01, 0.25, "rise") * 0.8 + tone * (x / d) ** 2) * np.minimum(1, (d - x) / 0.01)
def bloop(f=520): x = xs(0.16); fr = f * (1 + 0.6 * np.exp(-x * 30)); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-x * 22)

# ---------- room tone (very low) + a dark drone that dips at the cuts
x = xs(TOTAL); tone = lp(rng.uniform(-1, 1, N), 0.01) * 0.6
drone = sum(np.sin(2 * np.pi * f * x + p) for f, p in ((55.0, 0), (82.41, 1.1), (110.0, 2.3))) / 3
bed = (tone * 0.5 + drone * 0.35) * np.clip(x / 0.6, 0, 1) * np.clip((TOTAL - x) / 1.5, 0, 1)
put(bed, 0, 0.018)

# ---------- hook 0 - 4.60
put(thump(48, 0.7, 40, 6), 0.02, 0.35); put(whoosh(0.45, 0.01, 0.12), 0.0, 0.22)        # focus pull in
put(whoosh(0.4, 0.02, 0.3), 0.03, 0.18, -0.1)                                            # card slides down
for k, pan in enumerate((0.7, -0.7, -0.5)): put(whoosh(0.22, 0.05, 0.6), 0.03 + k * 0.03, 0.12, pan)   # crosses fly in
for k in range(5): put(blip(1800 + 180 * k), 0.23 + k * 0.07, 0.10, 0.35 - 0.17 * k)    # loading squares, right to left
put_pan(whoosh(0.62, 0.03, 0.55), 0.18, 0.55, 0.6, -0.6)                                 # the brush stroke, right to left
put(thump(70, 0.35, 90, 14), 0.83, 0.45); put(click(3400, 0.04), 0.83, 0.12)             # big word lands
put(shimmer(0.45), 0.87, 0.16)                                                           # script write-on
put(riser(0.6), 2.4, 0.42)                                                               # into the morph
put(boom(1.2), 3.0, 0.75); put(click(2200, 0.05, 90), 3.0, 0.3)                          # the morph hit
put(click(3000, 0.03, 160), 2.9, 0.18, 0.2)                                              # cursor click on the bar
put(chime(1567.98, 1.3), 3.2, 0.16); put(scribble(0.26), 3.2, 0.2, -0.2)                 # check + circle
put_pan(whoosh(0.6, 0.02, 0.5), 3.93, 0.45, -0.3, 0.8)                                   # text smears out right
put(whoosh(0.14, 0.05, 0.4, "rev"), 4.46, 0.3)                                           # defocus suck
# ---------- black, 4.60 - 5.97
put(thump(45, 0.8, 60, 5), 4.6, 0.6); put(whoosh(0.5, 0.03, 0.5), 4.6, 0.25, 0.5)        # hard cut
put(shimmer(0.6, 2600), 4.66, 0.08)
put(whoosh(0.35, 0.04, 0.45), 5.12, 0.16, -0.4)                                          # swish
put(whoosh(0.24, 0.02, 0.5, "rev"), 5.73, 0.45)                                          # reverse into the cut
# ---------- five mistakes
for k in range(5):
    t = 5.965 + 2.7 * k
    put(thump(50, 0.7, 55, 6), t, 0.65 if k == 0 else 0.4); put(whoosh(0.35, 0.03, 0.35), t, 0.2)
    for j, pan in enumerate((0.7, -0.7, -0.5)): put(blip(2400 + 200 * j, 0.05), t + j * 0.04, 0.07, pan)
    put(thump(72, 0.3, 90, 15), t + 0.1, 0.35); put(shimmer(0.35, 3000 + 150 * k), t + 0.1, 0.11)
    put(click(3000, 0.03, 160), t + 1.38, 0.2, 0.2)                                     # cursor clicks the badge
    put(whoosh(0.16, 0.05, 0.5), t + 1.4, 0.18)                                          # the wrong form blurs out
    put(thump(80, 0.28, 120, 16), t + 1.53, 0.3)
    put(chime(1567.98 * (1, 1.122, 1.26, 1.335, 1.498)[k], 1.1), t + 1.53, 0.15)         # the fix, a step higher each time
    put(scribble(0.25), t + 1.55, 0.16, -0.2)
    put_pan(whoosh(0.5, 0.02, 0.5), t + 2.2, 0.38, -0.3, 0.8)                             # exit
    put(whoosh(0.13, 0.05, 0.4, "rev"), t + 2.57, 0.22)
# ---------- CTA 19.47 - 22.5
put(thump(45, 0.9, 60, 4.5), 19.47, 0.62); put(whoosh(0.5, 0.03, 0.4), 19.47, 0.24)
put(thump(70, 0.35, 90, 12), 19.57, 0.4); put(shimmer(0.8, 2400), 19.6, 0.15)
for k in range(3): put(bloop(640 + 160 * k), 19.6 + 0.1 * k, 0.1, -0.5)
x = xs(2.6); pad = sum(np.sin(2 * np.pi * f * x) for f in (220.0, 277.18, 329.63, 440.0)) / 4
put(pad * np.minimum(1, x / 0.8) * np.minimum(1, (2.6 - x) / 1.2), 19.8, 0.05)

mix = np.stack([L, R], 1); pk = np.abs(mix).max(); mix = mix / pk * 0.89
os.makedirs(os.path.join(ROOT, "assets", "audio"), exist_ok=True)
with wave.open(os.path.join(ROOT, "assets", "audio", "mix.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
print("mix.wav", TOTAL, "s; raw peak", round(float(pk), 2))
