"""Original soundtrack, sound design and mix for the ADAM BARFI Black Friday reel.
Music: Christmas opening (music box + sleigh bells on the public-domain Jingle Bells
melody) turning into a modern festive half-time beat.

Everything here is synthesised from scratch (no samples, no licensed music):
  - music  : 120 BPM dark fashion-runway electronic, D minor (i-VI-iv-V)
  - sfx    : bass impacts, whooshes, risers, metallic shimmer, typography ticks
  - vo     : Persian female voiceover lines, cleaned (HPF, presence EQ, compression, small room)
Outputs (48 kHz, 24-bit WAV):
  audio/stem_music.wav  audio/stem_sfx.wav  audio/stem_vo.wav  audio/mix.wav
"""
import os, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from timeline import b, BEAT, DURATION, VO

ROOT = os.path.join(os.path.dirname(__file__), '..')
SR = 48000
N = int((DURATION + 0.05) * SR)
rng = np.random.default_rng(7)


def buf():
    return np.zeros((N, 2), np.float32)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)


def place(dst, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    if i >= N:
        return
    n = min(len(sig), N - i)
    if i < 0:
        sig = sig[-i:]; n = min(len(sig), N); i = 0
    dst[i:i + n] += sig[:n] * gain


def env(n, a, d):  # attack/decay exponential envelope (seconds)
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    if a > 0:
        e *= np.clip(t / a, 0, 1)
    return e


def reverb(x, secs=2.2, damp=5000, wet=0.3, seed=1):
    r = np.random.default_rng(seed)
    n = int(secs * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-t / (secs / 6.9))[:, None]
    ir = lp(ir, damp)
    ir[:int(0.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 1.6


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ instruments
def kick(punch=1.0):
    n = int(0.55 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.28)
    click = hp(rng.standard_normal(n) * np.exp(-t / 0.004), 2500) * 0.35 * punch
    return np.tanh((s + click) * 1.6) * 0.9


def clap():
    n = int(0.45 * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        e += np.where(t >= o, np.exp(-(t - o) / (0.008 if o < 0.02 else 0.16)), 0)
    return bp(nz * e, 900, 5200) * 0.5


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR); t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 7500, 4) * np.exp(-t / (0.09 if open_ else 0.014))
    return s * (0.22 if open_ else 0.28)


def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    ph = (t * f * (1 + detune) + rng.random()) % 1.0
    return 2 * ph - 1


def pad_chord(notes, dur):
    n = int(dur * SR)
    L = np.zeros(n); R = np.zeros(n)
    for m in notes:
        for d in (-0.006, -0.002, 0.003, 0.007):
            s = saw(mtof(m), n, d)
            L += s * (0.6 + d * 40); R += s * (0.6 - d * 40)
    t = np.arange(n) / SR
    a = np.clip(t / 0.35, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    out = np.stack([L, R], 1) * a[:, None] / (len(notes) * 4)
    return out


def bass_note(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = saw(mtof(m), n) * 0.6 + np.sin(2 * np.pi * mtof(m) * t) * 0.9
    e = np.exp(-t / 0.05)
    s = lp(s, 380) * (1 - e) + lp(s, 1300) * e   # filter-envelope pluck
    return np.tanh(s * 1.8 * np.exp(-t / 0.22)) * 0.55


def pluck(m, dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (saw(mtof(m), n) * 0.5 + np.sign(np.sin(2 * np.pi * mtof(m) * t)) * 0.3)
    e = np.exp(-t / 0.03)
    s = lp(s, 1200) * (1 - e) + lp(s, 6200) * e
    return s * np.exp(-t / 0.12) * 0.22


def impact(size=1.0):
    n = int(3.2 * SR); t = np.arange(n) / SR
    f = 32 + 60 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.9 * size))
    nz = lp(rng.standard_normal(n), 1800) * np.exp(-t / 0.18) * 0.6
    crack = hp(rng.standard_normal(n), 3000) * np.exp(-t / 0.01) * 0.4
    s = np.tanh((sub * 1.3 + nz + crack) * 1.4)
    st = np.stack([s, s], 1)
    return reverb(st, 2.8, 3500, 0.35, seed=3) * 0.9 * min(1.0, size)


def whoosh(dur=0.6, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = rng.standard_normal((n, 2))
    out = np.zeros((n, 2))
    k = 12
    for i in range(k):  # sweep a band across the noise
        fr = i / (k - 1)
        fc = 300 * (40 ** (fr if up else 1 - fr))
        seg = bp(nz, fc * 0.7, min(fc * 1.4, 20000))
        w = np.exp(-((t / dur - fr) ** 2) / 0.012)
        out += seg * w[:, None]
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return out * shape[:, None] * 0.45


def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    fr = t / dur
    nz = rng.standard_normal((n, 2))
    out = np.zeros((n, 2))
    for i in range(10):
        a = i / 9
        fc = 400 * 25 ** a
        w = np.exp(-((fr - a) ** 2) / 0.03)
        out += bp(nz, fc * 0.8, min(fc * 1.25, 20000)) * w[:, None]
    f = 200 * 8 ** fr
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    out += tone[:, None]
    return out * (fr ** 2)[:, None] * 0.5


def shimmer(dur=2.2, base=86):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for i, m in enumerate([base, base + 7, base + 12, base + 15, base + 19, base + 24]):
        f = mtof(m)
        tr = 0.6 + 0.4 * np.sin(2 * np.pi * (7 + i * 1.3) * t + i)
        s = np.sin(2 * np.pi * f * t + i) * np.exp(-t / (0.5 + 0.12 * i)) * tr
        d = int((0.012 * i) * SR)
        s = np.concatenate([np.zeros(d), s[:n - d]])
        pan = (i % 2) * 2 - 1
        out[:, 0] += s * (0.6 - 0.3 * pan); out[:, 1] += s * (0.6 + 0.3 * pan)
    out += hp(rng.standard_normal((n, 2)), 9000) * np.exp(-t / 0.4)[:, None] * 0.05
    return reverb(out * 0.09, 2.5, 9000, 0.45, seed=5)


def tick():
    n = int(0.25 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.012) * 0.5
    s += hp(rng.standard_normal(n), 4000) * np.exp(-t / 0.006) * 0.4
    s += np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.06) * 0.6
    return s * 0.35


# ------------------------------------------------------------------ arrangement
# "Christmas into Black Friday": opens as a music-box / sleigh-bell Christmas piece playing the
# public-domain "Jingle Bells" chorus, then the same melody turns into a modern half-time
# festive beat. 120 BPM, G major.
# Every note and sound is synthesised here (original arrangement, no samples).

def celesta(m, dur=1.6, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = mtof(m)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9)
         + 0.45 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.35)
         + 0.25 * bright * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t / 0.12)
         + 0.12 * bright * np.sin(2 * np.pi * f * 6.1 * t) * np.exp(-t / 0.05))
    s *= np.clip(t / 0.002, 0, 1)
    return s * 0.30


def glock(m, dur=2.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = mtof(m)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.2)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.06)) * np.exp(-t / 0.7)
    return s * 0.18


def sleigh(g=1.0):
    n = int(0.18 * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in (5200, 6300, 7400, 8900, 10300):
        s += np.sin(2 * np.pi * f * (1 + 0.003 * rng.standard_normal()) * t + rng.random() * 6)
    s = s * np.exp(-t / 0.05) / 5
    s += hp(rng.standard_normal(n), 6000) * np.exp(-t / 0.03) * 0.5
    return s * 0.22 * g


def strings(notes, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for m in notes:
        for d in (-0.004, 0.0, 0.004):
            vib = 1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + rng.random() * 6)
            ph = np.cumsum(mtof(m) * (1 + d) * vib) / SR
            s = 2 * (ph % 1) - 1
            out[:, 0 if d < 0 else 1] += s
            if d == 0:
                out += s[:, None] * 0.5
    out = lp(out, 2600)
    a = np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.35, 0, 1)
    return out * a[:, None] / (len(notes) * 3) * 0.8


def stab(notes):
    n = int(0.6 * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        for d in (-0.005, 0.005):
            s += saw(mtof(m), n, d)
    s = lp(s, 3200) * np.exp(-t / 0.16)
    return s / len(notes) * 0.25


def bass808(m, dur, glide_from=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f0 = mtof(m)
    if glide_from is not None:
        f = f0 + (mtof(glide_from) - f0) * np.exp(-t / 0.05)
    else:
        f = np.full(n, f0)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    s = np.tanh(s * 2.2) * np.exp(-t / 0.9) * np.clip((dur - t) / 0.03, 0, 1)
    return s * 0.55


def snare():
    n = int(0.4 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    nz = bp(rng.standard_normal(n), 1500, 9000) * np.exp(-t / 0.13)
    return (body * 0.6 + nz) * 0.45


# G major, Jingle Bells changes: | G | G | G | G | C | G | D | G |  (then bars 1-4 again)
_G = (43, [62, 67, 71, 74]); _C = (48, [60, 64, 67, 72]); _D = (38, [62, 66, 69, 74])
CH = [_G, _G, _G, _G, _C, _G, _D, _G]


def chord_at(k):
    i = int(k // 4)
    return CH[i % 8] if i < 8 else CH[(i - 8) % 4]


music = buf()
drums = buf()
bells = buf()
sfx = buf()

TOTAL_BEATS = int((DURATION - b(0)) / BEAT) + 1
END_K = 48

# 1) "Jingle Bells" (J. Pierpont, 1857, public domain) chorus melody: (beat-in-bar, midi, beats)
B4, C5, D5, G4, A4 = 71, 72, 74, 67, 69
BARS_A = [[(0, B4, 1), (1, B4, 1), (2, B4, 2)],
          [(0, B4, 1), (1, B4, 1), (2, B4, 2)],
          [(0, B4, 1), (1, D5, 1), (2, G4, 1.5), (3.5, A4, 0.5)],
          [(0, B4, 4)]]
BARS_B = [[(0, C5, 1), (1, C5, 1), (2, C5, 1.5), (3.5, C5, 0.5)],
          [(0, C5, 1), (1, B4, 1), (2, B4, 1), (3, B4, 0.5), (3.5, B4, 0.5)],
          [(0, D5, 1), (1, D5, 1), (2, C5, 1), (3, A4, 1)],
          [(0, G4, 4)]]
MELODY = []
for bar, notes in enumerate(BARS_A + BARS_B + BARS_A):
    for off, m, d in notes:
        MELODY.append((bar * 4 + off, m, d))
for k, m, d in MELODY:
    if k >= END_K:
        break
    if k < 14 or 24 <= k < 28 or k >= 36:
        place(bells, celesta(m + 12, dur=max(1.2, d * BEAT + 0.8)), b(k), 1.0, pan=-0.15)   # music box
        if k >= 6 and not (24 <= k < 28):
            place(bells, glock(m + 12), b(k), 0.4, pan=0.3)
    else:
        place(bells, pluck(m + 12, max(0.3, d * BEAT)), b(k), 1.4, pan=-0.1)               # bright synth lead
        place(bells, celesta(m + 24, bright=0.6), b(k), 0.5, pan=0.25)
# bell "answers" (G-D-G arpeggio) on the long held notes
for k0 in (12, 28, 44):
    for i, m in enumerate((79, 74, 83, 86)):
        place(bells, glock(m), b(k0 + 1 + i * 0.5), 0.45, pan=0.35)

# 2) pads / strings
for bar in range(0, END_K + 4, 4):
    root, notes = chord_at(bar)
    if bar < 6:
        place(music, strings(notes, 4 * BEAT + 0.4), b(bar), 0.6)
    elif 24 <= bar < 28:
        place(music, strings(notes + [notes[1] + 12], 4 * BEAT + 0.4), b(bar), 0.9)
    else:
        place(music, strings(notes, 4 * BEAT + 0.4), b(bar), 0.75)
        place(music, pad_chord(notes, 4 * BEAT + 0.3), b(bar), 0.25)
music = reverb(music, 3.0, 6000, 0.3, seed=11)

# 3) sleigh bells: 8ths in the intro, 16ths in the drops
for kk in np.arange(0, END_K, 0.25):
    q = kk % 1
    accent = 1.0 if abs(q) < 1e-6 or abs(q - 0.5) < 1e-6 else 0.55
    if kk < 14 and abs(q - 0.25) > 1e-6 and abs(q - 0.75) > 1e-6:
        place(bells, sleigh(accent * (1.1 if kk < 6 else 1.0)), b(kk), 1.0, pan=0.4)
    elif (14 <= kk < 23.5) or (28 <= kk < 44):
        place(bells, sleigh(accent), b(kk), 1.0, pan=0.4)
music += reverb(bells, 2.4, 9000, 0.32, seed=13)

# 4) modern beat (enters on the scene-3 drop)
K = kick()
SN = snare()
CLP = clap()
for kk in np.arange(0, END_K, 0.25):
    tb = b(kk)
    drop = (14 <= kk < 23.5) or (28 <= kk < 36)
    soft = 36 <= kk < 44
    build = 10 <= kk < 14
    pos = kk % 4
    if drop or soft:
        if pos in (0.0, 1.5, 2.75) or (pos == 3.5 and int(kk // 4) % 2):
            place(drums, K, tb, 0.95 if drop else 0.6)
        if pos == 2.0:
            place(drums, SN, tb, 0.9 if drop else 0.55)
            place(drums, CLP, tb, 0.6 if drop else 0.3)
        g = 0.32 if abs(kk % 0.5) < 1e-6 else 0.18
        place(drums, hat(), tb, g, pan=0.25)
    elif build and abs(kk % 1) < 1e-6:
        place(drums, lp(K, 300 + 2000 * (kk - 10) / 4), tb, 0.5 + 0.4 * (kk - 10) / 4)
    elif kk in (24, 25, 26, 27):
        place(drums, lp(K, 280), tb, 0.55)
# hat triplet rolls at phrase ends
for k0 in (17, 21, 31, 35):
    for i in range(6):
        place(drums, hat(), b(k0 + 0.5 + i / 6), 0.25 + 0.03 * i, pan=0.25)
# snare build into BLACK FRIDAY and into 30
for k0, k1, stp, g in ((20, 23.5, 0.25, 0.5), (26, 27.75, 0.125, 0.6)):
    steps = np.arange(k0, k1, stp)
    for i, kk in enumerate(steps):
        place(drums, SN, b(kk), g * (0.3 + 0.7 * i / len(steps)), pan=0.1)

# 5) 808 bass with glides + string stabs
prev = None
for kk in np.arange(14, 44, 2):
    if 23.5 <= kk < 28:
        prev = None
        continue
    root, notes = chord_at(kk)
    m = root - 12 if root > 40 else root
    m += 12
    place(drums, bass808(m, BEAT * 1.9, prev), b(kk), 0.85 if kk < 36 else 0.55)
    prev = m
    if kk < 36 and kk % 4 == 0:
        place(music, stab(notes), b(kk), 1.0)
        place(music, stab(notes), b(kk + 1.5), 0.6)

music += drums

# ------------------------------------------------------------------ sound design
place(sfx, impact(0.7), b(0), 0.5)               # soft boom under the opening bell
place(sfx, reverb(np.stack([glock(79, 3.0) + celesta(67, 3.0)] * 2, 1), 3.0, 9000, 0.5, seed=4), b(0), 2.2)
place(sfx, impact(0.8), b(6), 0.7)
place(sfx, impact(1.0), b(24), 0.9)
place(sfx, impact(1.4), b(28), 1.05)          # the 30% hit
place(sfx, impact(0.6), b(36), 0.55)
place(sfx, impact(1.5), b(48), 1.0)            # final brand impact
for k in (6, 14, 24, 32, 36, 40):
    place(sfx, whoosh(0.55), b(k) - 0.45, 0.55)
for k in (17, 19, 20, 21, 22, 23, 33, 34, 35):  # quick runway cut swishes
    place(sfx, whoosh(0.25, up=(k % 2 == 0)), b(k) - 0.18, 0.22)
place(sfx, riser(b(24) - b(20)), b(20), 0.5)
place(sfx, riser(b(28) - b(25)), b(25), 0.75)
place(sfx, riser(b(48) - b(44)), b(44), 0.35)
for k, base in ((6.5, 86), (28.1, 86), (40, 91), (48.1, 86)):
    place(sfx, shimmer(2.4, base), b(k), 1.0)
for tt in (b(0.4), b(1.4), b(14.4), b(17.1), b(19.1), b(21.1), b(26), b(40.3), b(41.4), b(42.7)):
    place(sfx, tick(), tt, 0.55)


# ------------------------------------------------------------------ voiceover
def load_vo(path):
    x, sr = sf.read(path, dtype='float32')
    if x.ndim > 1:
        x = x.mean(1)
    if sr != SR:
        from math import gcd
        g = gcd(SR, sr)
        x = resample_poly(x, SR // g, sr // g).astype(np.float32)
    # trim leading/trailing silence
    a = np.abs(x); thr = 0.01
    idx = np.where(a > thr)[0]
    x = x[max(0, idx[0] - 240): idx[-1] + 2400]
    return x


def process_vo(x):
    x = hp(x, 95, 2)
    x = x + bp(x, 2500, 5500, 1) * 0.35          # presence
    x = x + lp(x, 220, 1) * 0.15                 # warmth
    # simple compressor (RMS, 4:1 above -20 dBFS)
    e = np.sqrt(lp(x ** 2, 30, 1).clip(1e-9))
    thr = 10 ** (-20 / 20)
    g = np.where(e > thr, (thr / e) ** 0.75, 1.0)
    x = x * g
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    return x


vo = buf()
VOD = os.path.join(ROOT, 'audio', 'vo')
for fname, start in VO:
    p = os.path.join(VOD, fname)
    if not os.path.exists(p):
        p = os.path.join(VOD, 'raw_' + fname)
    x = process_vo(load_vo(p))
    place(vo, x, start, 0.70)
if VO:
    vo = reverb(vo, 0.7, 6000, 0.08, seed=21)  # small, expensive-sounding room

# ------------------------------------------------------------------ mix
vo_env = np.sqrt(lp(vo.mean(1) ** 2, 8, 1).clip(0)) if VO else np.zeros(N)
duck = 1.0 - 0.6 * np.clip(vo_env / 0.05, 0, 1)        # ~ -8 dB under VO
duck = lp(duck, 6, 1)[:, None]

music *= 0.42
sfx = np.tanh(sfx * 0.36 * 1.2) / 1.2   # soft-limit stacked impacts
# fades
fade = np.ones((N, 1)); tail = int(0.35 * SR)
fade[-tail:, 0] = np.linspace(1, 0, tail) ** 2
mix = (music * duck + sfx + vo) * fade
mix = np.tanh(mix * 1.05) / np.tanh(1.05)

os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
stems = [('stem_music', music * fade), ('stem_sfx', sfx * fade), ('mix_pre', mix)]
if VO:
    stems.append(('stem_vo', vo * fade))
elif os.path.exists(os.path.join(ROOT, 'audio', 'stem_vo.wav')):
    os.remove(os.path.join(ROOT, 'audio', 'stem_vo.wav'))
for name, x in stems:
    sf.write(os.path.join(ROOT, 'audio', name + '.wav'), np.clip(x, -1, 1), SR, subtype='PCM_24')

# loudness: -14 LUFS integrated, -1 dBTP (Instagram/Reels target)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(ROOT, 'audio', 'mix_pre.wav'),
                '-af', 'loudnorm=I=-14:TP=-1.0:LRA=9', '-ar', str(SR), '-c:a', 'pcm_s24le',
                os.path.join(ROOT, 'audio', 'mix.wav')], check=True)
os.remove(os.path.join(ROOT, 'audio', 'mix_pre.wav'))
print('audio done ->', os.path.join(ROOT, 'audio'))
