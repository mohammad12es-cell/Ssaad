"""Original cinematic score for the montage — composed & synthesised from scratch (no samples).
90 BPM, D minor, progression i–VI–III–VII (Dm–Bb–F–C), 62 beats ≈ 41.3 s.
Sections (beats):  0-8 opening | 8-24 development | 24-32 build | 32-48 peak | 48-52 breakdown | 52-62 ending
"""
import numpy as np, wave, sys, json

SR = 44100
BPM = 90
B = 60 / BPM
TOTAL = 62
N = int((TOTAL * B + 1.0) * SR)
rng = np.random.default_rng(11)

def idx(b): return int(round(b * B * SR))
def mt(m): return 440 * 2 ** ((m - 69) / 12)
def buf(): return np.zeros(N)
def add(dst, sig, beat, g=1.0):
    i = idx(beat); j = min(N, i + len(sig))
    if 0 <= i < N: dst[i:j] += g * sig[: j - i]

def filt(x, lo=None, hi=None, order=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    H = np.ones_like(f)
    if hi: H *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: H *= 1 / np.sqrt(1 + (lo / f) ** (2 * order))
    return np.fft.irfft(X * H, len(x))

def conv(x, ir):
    n = len(x) + len(ir); nf = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[: len(x)]

def make_ir(rt60, seed, damp=6000):
    r = np.random.default_rng(seed)
    t = np.arange(int(rt60 * 1.2 * SR)) / SR
    ir = r.standard_normal(len(t)) * np.exp(-6.9 * t / rt60)
    ir = filt(ir, lo=120, hi=damp); ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt(np.sum(ir ** 2))
IRL, IRR = make_ir(3.2, 1), make_ir(3.2, 2)

def reverb(x):
    return conv(x, IRL), conv(x, IRR)

# ------------------------------------------------ instruments
def piano(m, dur, vel=0.8):
    f0 = mt(m); L = dur + 2.5
    t = np.arange(int(L * SR)) / SR
    s = np.zeros(len(t)); Binh = 0.00035
    for k in range(1, 11):
        fk = f0 * k * np.sqrt(1 + Binh * k * k)
        if fk > 16000: break
        amp = (1 / k ** 1.25) * (vel ** (0.3 * k))
        dec = 0.55 + 0.42 * k + f0 / 900
        s += amp * np.sin(2 * np.pi * fk * t + rng.random() * 6.28) * np.exp(-t * dec)
    hammer = filt(rng.standard_normal(len(t)) * np.exp(-t * 180), hi=3000) * 0.05
    rel = np.clip((dur + 0.25 - t) / 0.25, 0, 1) * 0.85 + 0.15 * np.exp(-np.maximum(0, t - dur) * 2)
    att = np.minimum(1, t / 0.003)
    return (s + hammer) * att * rel * vel * 0.25

def strings(ms, dur, bright=1600):
    L = dur + 0.5
    t = np.arange(int(L * SR)) / SR
    s = np.zeros(len(t))
    for m in ms:
        for d in (-0.09, -0.03, 0.03, 0.09):
            f = mt(m) * 2 ** (d / 12)
            vib = 1 + 0.003 * np.sin(2 * np.pi * 5.1 * t + rng.random() * 6)
            ph = np.cumsum(f * vib) / SR + rng.random()
            s += 2 * (ph % 1) - 1
    s = filt(s, lo=90, hi=bright)
    env = np.minimum(1, t / 0.9) * np.clip((L - t) / 0.7, 0, 1)
    return s * env * 0.022

def sub(m, dur):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * mt(m) * t) + 0.25 * np.sin(4 * np.pi * mt(m) * t)
    env = np.minimum(1, t / 0.02) * np.clip((dur - t) / 0.1, 0, 1)
    return np.tanh(s * env * 1.5) * 0.35

def pluck(m, vel=1.0):
    t = np.arange(int(0.45 * SR)) / SR
    f = mt(m)
    s = (2 * ((f * t) % 1) - 1) * 0.5 + np.sin(2 * np.pi * f * t)
    s = filt(s * np.exp(-t * 9), hi=2600)
    return s * vel * 0.09

def kick(big=False):
    t = np.arange(int((1.2 if big else 0.5) * SR)) / SR
    f = 42 + 110 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.5 if big else 7))
    click = filt(rng.standard_normal(len(t)) * np.exp(-t * 400), hi=5000) * 0.25
    return np.tanh((s + click) * 1.8) * 0.8

def snare():
    t = np.arange(int(0.45 * SR)) / SR
    n = filt(rng.standard_normal(len(t)), lo=1500, hi=9000) * np.exp(-t * 13)
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 22)
    return np.tanh((n * 0.7 + body * 0.6) * 1.4) * 0.5

def tom(m):
    t = np.arange(int(0.6 * SR)) / SR
    f = mt(m) * (1 + 0.5 * np.exp(-t * 30))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
    return np.tanh(s * 2) * 0.45

def hat(v=1.0):
    t = np.arange(int(0.06 * SR)) / SR
    return filt(rng.standard_normal(len(t)), lo=8000) * np.exp(-t * 70) * 0.12 * v

def riser(beats):
    L = int(beats * B * SR); t = np.arange(L) / (L)
    n = rng.standard_normal(L); out = np.zeros(L); seg = 2048
    for i in range(0, L, seg):
        c = 300 + 8000 * (i / L) ** 2.2
        ch = n[i:i + seg]; out[i:i + seg] = filt(ch, lo=c * 0.5, hi=c * 1.6)[: len(ch)]
    return out * t ** 2.5 * 0.14

def impact():
    t = np.arange(int(3.5 * SR)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.3)
    n = filt(rng.standard_normal(len(t)), hi=1800) * np.exp(-t * 3.5) * 0.5
    return np.tanh((boom + n) * 1.6) * 0.6

def swell(beats):  # reversed-piano-like swell
    L = int(beats * B * SR); t = np.arange(L) / L
    s = np.zeros(L)
    for m in (50, 57, 62, 65):
        s += np.sin(2 * np.pi * mt(m) * np.arange(L) / SR)
    return filt(s, hi=2500) * t ** 3 * 0.06

# ------------------------------------------------ harmony / melody
CH = {"Dm": [50, 53, 57], "Bb": [46, 50, 53], "F": [45, 48, 53], "C": [43, 48, 52]}
ROOT = {"Dm": 38, "Bb": 34, "F": 41, "C": 36}
PROG = ["Dm", "Bb", "F", "C"]
# hook: (beat offset within 4-bar phrase, midi, length in beats)
HOOK = [(0, 69, 1), (1, 74, 1), (2, 77, 1.5), (3.5, 76, .5),
        (4, 74, 1), (5, 77, 1), (6, 81, 1.5), (7.5, 79, .5),
        (8, 77, 1), (9, 76, 1), (10, 72, 2),
        (12, 76, 1), (13, 74, 1), (14, 72, 1), (15, 74, 1)]

piano_b, str_b, sub_b, arp_b, dr_b, fx_b, dry_b = (buf() for _ in range(7))

def chord_at(beat): return PROG[int(beat // 4) % 4]

def play_hook(b0, b1, octave=0, vel=0.8):
    for start in range(b0, b1, 16):
        for off, m, l in HOOK:
            if start + off < b1:
                add(piano_b, piano(m + octave, l * B, vel), start + off)

def play_left_hand(b0, b1, vel=0.5):
    for b in range(b0, b1, 4):
        c = CH[chord_at(b)]
        add(piano_b, piano(c[0] - 12, 3.8 * B, vel), b)
        add(piano_b, piano(c[1], 1.8 * B, vel * 0.7), b + 1)
        add(piano_b, piano(c[2], 1.8 * B, vel * 0.7), b + 2)

def play_strings(b0, b1, up=0, bright=1600, g=1.0):
    for b in range(b0, b1, 4):
        add(str_b, strings([n + up for n in CH[chord_at(b)]] + [CH[chord_at(b)][0] + 12 + up], 4 * B, bright), b, g)

def play_sub(b0, b1, g=1.0):
    for b in range(b0, b1, 4):
        add(sub_b, sub(ROOT[chord_at(b)], 3.9 * B), b, g)

def play_arp(b0, b1, vel=1.0):
    for b in np.arange(b0, b1, 0.5):
        c = CH[chord_at(b)]; seq = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 24]
        add(arp_b, pluck(seq[int(b * 2) % 4], vel), b)

# OPENING 0-8: dark drone, single piano notes, swell
add(str_b, strings([38, 45, 50], 8 * B, bright=500), 0, 1.6)
for b, m in ((0, 74), (2, 69), (3, 72), (5, 77), (6, 76)):
    add(piano_b, piano(m, 2 * B, 0.55), b)
add(fx_b, swell(2), 6)
# DEVELOPMENT 8-24
play_hook(8, 24, 0, 0.75); play_left_hand(8, 24, 0.45)
play_strings(8, 24, bright=1100, g=0.8); play_sub(16, 24, 0.6)
play_arp(16, 24, 0.55)
for b in np.arange(16, 24, 2): add(dr_b, kick(), b, 0.4)
# BUILD 24-32
play_hook(24, 32, 0, 0.8); play_strings(24, 32, bright=2200, g=1.0); play_sub(24, 32, 0.8)
play_arp(24, 31.5, 0.8)
for b in np.arange(24, 28, 1): add(dr_b, tom(45), b, 0.6)
for b in np.arange(28, 30, 0.5): add(dr_b, tom(47), b, 0.7)
for b in np.arange(30, 31.5, 0.25): add(dr_b, tom(50), b, 0.5 + (b - 30) * 0.3)
add(fx_b, riser(7.5), 24)
# PEAK 32-48
add(fx_b, impact(), 32, 1.0)
play_hook(32, 48, 12, 0.85); play_left_hand(32, 48, 0.5)
play_strings(32, 48, up=12, bright=3200, g=1.1); play_strings(32, 48, up=0, bright=1500, g=0.8)
play_sub(32, 48, 1.0); play_arp(32, 48, 1.0)
for bar in range(32, 48, 4):
    add(dr_b, kick(True), bar, 0.9); add(dr_b, kick(), bar + 1.5, 0.6); add(dr_b, kick(), bar + 2.75, 0.5)
    add(dr_b, snare(), bar + 2, 0.75)
    for h in np.arange(0, 4, 0.5): add(dr_b, hat(1.0 if h % 1 else 0.6), bar + h)
for b in np.arange(46, 48, 0.25): add(dr_b, tom(50 - int((b - 46) * 2)), b, 0.45)
# BREAKDOWN 48-52: everything drops, soft piano + wide strings
add(fx_b, impact(), 48, 0.5)
add(str_b, strings([50, 57, 62, 65], 4 * B, bright=900), 48, 1.2)
for off, m, l in HOOK[:4]: add(piano_b, piano(m, l * B, 0.55), 48 + off)
# ENDING 52-62: hook resolves, final chord rings
for off, m, l in HOOK[8:12]: add(piano_b, piano(m, l * B, 0.65), 52 + (off - 8))
play_strings(52, 56, bright=1300, g=0.9); play_sub(52, 56, 0.5)
add(piano_b, piano(38, 6 * B, 0.6), 56); add(piano_b, piano(50, 6 * B, 0.5), 56)
add(piano_b, piano(57, 6 * B, 0.5), 56); add(piano_b, piano(62, 6 * B, 0.6), 56)
add(piano_b, piano(65, 6 * B, 0.45), 56.05)
add(str_b, strings([38, 50, 57, 62], 6 * B, bright=1000), 56, 1.2)
add(fx_b, impact(), 56, 0.35)

# ------------------------------------------------ mix
pL, pR = reverb(piano_b); sL, sR = reverb(str_b); aL, aR = reverb(arp_b); dL, dR = reverb(dr_b * 0.5)
L = piano_b * 0.9 + pL * 0.45 + str_b * 0.55 + sL * 0.75 + arp_b * 0.5 + aL * 0.3 + dr_b + dL * 0.3 + sub_b + fx_b * 0.8
R = piano_b * 0.9 + pR * 0.45 + str_b * 0.55 + sR * 0.75 + arp_b * 0.5 + aR * 0.3 + dr_b + dR * 0.3 + sub_b + fx_b * 0.8
st = np.stack([L, R], 1)
st = filt(st[:, 0], lo=25), filt(st[:, 1], lo=25)
st = np.stack(st, 1)
st = np.tanh(st * 1.2) / np.tanh(1.2)
end = int(TOTAL * B * SR)
st = st[:end]
fo = int(2.2 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
fi = int(0.4 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
st /= np.max(np.abs(st)); st *= 0.93
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print("score", end / SR, "s")
