"""Original score + sound design for THE EVOLUTION (130 s, 48 kHz stereo).

Every cue is placed on the same timeline as index.html (see TIMING there).
Run:  python3 tools/score.py assets/score_raw.wav
Then loudness-normalise with ffmpeg (see README.md).
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 130.0
N = int(SR * DUR)
rng = np.random.default_rng(27)

dry = np.zeros((N, 2))
send = np.zeros((N, 2))  # reverb bus


def T(sec):
    return np.arange(int(sec * SR)) / SR


def place(sig, t0, gain=1.0, pan=0.0, rev=0.3):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    s = np.stack([sig * l, sig * r], 1) * gain
    dry[i : i + len(sig)] += s
    send[i : i + len(sig)] += s * rev


def env(n, a, r, total):
    t = np.arange(n) / SR
    e = np.ones(n)
    if a > 0:
        e = np.minimum(e, t / a)
    if r > 0:
        e = np.minimum(e, np.clip((total - t) / r, 0, 1))
    return e


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


# ---------- instruments ----------
def piano(f, dur=4.0):
    t = T(dur)
    s = np.zeros_like(t)
    for k in range(1, 8):
        fk = f * k * (1 + 0.0004 * k * k)
        s += np.sin(2 * np.pi * fk * t) / k**1.6 * np.exp(-t * (0.9 + 0.7 * k))
    s *= np.minimum(1, t / 0.004)
    return s * env(len(t), 0, 0.3, dur)


def pad(freqs, dur, a=2.5, r=3.0, bright=0.25):
    t = T(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for d in (-0.0018, 0.0, 0.0021):
            ph = rng.uniform(0, 2 * np.pi)
            s += np.sin(2 * np.pi * f * (1 + d) * t + ph)
            s += bright * np.sin(2 * np.pi * 2 * f * (1 + d) * t + ph) * 0.5
    s *= 1 + 0.12 * np.sin(2 * np.pi * 0.17 * t)
    return s / (len(freqs) * 3) * env(len(t), a, r, dur)


def strings(freqs, dur, a=3.0, r=1.0):
    t = T(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for d in (-0.003, 0.0, 0.0032):
            vib = 1 + 0.002 * np.sin(2 * np.pi * 5.1 * t + rng.uniform(0, 6))
            ph = 2 * np.pi * np.cumsum(f * (1 + d) * vib) / SR
            for k in range(1, 9):
                s += np.sin(k * ph) / k * (0.85 ** k)
    s = lowpass(s / (len(freqs) * 3), 2600)
    return s * env(len(t), a, r, dur)


def bounce(strength=1.0):
    t = T(0.35)
    f = 70 + 80 * np.exp(-t / 0.02)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    click = np.diff(rng.normal(0, 1, len(t) + 1)) * np.exp(-t / 0.004) * 0.25
    return (body + click) * strength


def step():
    t = T(0.18)
    return (np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.03)
            + lowpass(rng.normal(0, 1, len(t)), 900) * np.exp(-t / 0.02) * 0.8)


def tick():
    t = T(0.05)
    return np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.006) + np.sin(2 * np.pi * 1200 * t) * np.exp(-t / 0.01) * 0.4


def heart():
    t = T(0.5)
    lub = np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.06)
    dub = np.zeros_like(t)
    o = int(0.24 * SR)
    dub[o:] = (np.sin(2 * np.pi * 62 * t[: len(t) - o]) * np.exp(-t[: len(t) - o] / 0.05)) * 0.7
    return lub + dub


def kick(d=0.45):
    t = T(d)
    f = 42 + 110 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d / 3.2))


def impact(d=4.0):
    t = T(d)
    sub = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 1.1)
    nz = lowpass(rng.normal(0, 1, len(t)), 500) * np.exp(-t / 0.5) * 2.5
    return sub + nz


def riser(d):
    t = T(d)
    nz = rng.normal(0, 1, len(t))
    hp = nz - lowpass(nz, 300)
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / d) ** 2) / SR) * 0.25
    return (hp * 0.35 + sweep) * (t / d) ** 2.2


def hum(d=0.9):
    t = T(d)
    s = sum(np.sin(2 * np.pi * 100 * k * t) / k for k in (1, 2, 3, 5))
    clk = np.diff(rng.normal(0, 1, len(t) + 1)) * np.exp(-t / 0.003)
    return (s * 0.25 * np.exp(-t / 0.35) + clk * 0.6)


def pluck(f, d=0.9):
    t = T(d)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.22) * np.minimum(1, t / 0.003)


def beep(f=1250, d=0.12):
    t = T(d)
    return np.tanh(3 * np.sin(2 * np.pi * f * t)) * env(len(t), 0.004, 0.02, d)


def noise_bed(d, cutoff, a=1.0, r=1.0):
    return lowpass(rng.normal(0, 1, int(d * SR)), cutoff) * env(int(d * SR), a, r, d)


NOTE = {n: 440 * 2 ** ((i - 9) / 12 + o - 4)
        for o in range(0, 8)
        for i, n0 in enumerate("C C# D D# E F F# G G# A A# B".split())
        for n in [f"{n0}{o}"]}
NOTE.update({k.replace("A#", "Bb").replace("D#", "Eb"): v for k, v in list(NOTE.items())})


def ch(*names):
    return [NOTE[n] for n in names]


# ---------- CHAPTER 1 · THE COLLAPSE (0–17) ----------
place(noise_bed(17, 250, 3, 2), 0, 0.05, 0, 0.0)  # empty-arena room tone
t, gap, amp = 0.6, 0.95, 1.0
while gap > 0.08:
    place(bounce(amp), t, 0.55, -0.2, 0.9)
    t += gap
    gap *= 0.8
    amp *= 0.8
place(pad(ch("D2", "A2", "F3"), 17.5, 4, 3), 2.0, 0.22)
for tt, n in [(4.0, "A4"), (7.5, "F4"), (9.5, "E4"), (12.0, "D4"), (14.5, "C4"), (16.0, "A3")]:
    place(piano(NOTE[n], 5), tt, 0.16, 0.25, 0.7)
for i in range(7):  # he walks away
    place(step(), 12.2 + i * 0.58, 0.18 * (1 - i / 9), 0.1, 0.8)

# ---------- CHAPTER 2 · THE REBIRTH (17–35) ----------
place(impact(3), 17.0, 0.28)
for i, tt in enumerate([18.0, 18.45, 18.9, 19.35, 19.8, 20.25]):  # gym lights
    place(hum(), tt, 0.10, (-1) ** i * 0.5, 0.4)
place(pad(ch("Bb1", "F2", "D3"), 10.5, 3, 1), 17.5, 0.24)
place(riser(3.0), 24.0, 0.35, 0, 0.3)
place(impact(4), 27.0, 0.7)
place(pad(ch("D2", "A2", "D3", "F3"), 9, 0.5, 2), 27.0, 0.3)
for i in range(16):  # disciplined pulse
    tt = 27.0 + 0.5 * i
    place(kick(), tt, 0.45 if i % 2 == 0 else 0.22, 0, 0.15)
for tt in (29.0, 31.0, 33.0):
    place(impact(2), tt, 0.25)

# ---------- CHAPTER 3 · THE MIND (35–55) ----------
place(piano(NOTE["D3"], 6), 35.0, 0.2, 0, 0.8)
place(pad(ch("D2", "A2", "Eb3"), 11.5, 3, 0.4, 0.1), 35.0, 0.16)
for i in range(10):
    place(tick(), 36.5 + i, 0.08, 0.6, 0.2)
hb = 41.0
while hb < 46.0:
    place(heart(), hb, 0.55, 0, 0.1)
    hb += 0.9 - 0.35 * (hb - 41) / 5
place(noise_bed(8, 400, 1.5, 2), 47.0, 0.06, 0, 0.2)  # night wind / far traffic
place(pad(ch("F2", "C3", "A3", "D4"), 8.5, 3, 2), 47.0, 0.2)
for tt, n in [(49.0, "A4"), (51.0, "C5"), (53.0, "D5")]:
    place(piano(NOTE[n], 5), tt, 0.14, -0.2, 0.8)

# ---------- CHAPTER 4 · KNOWLEDGE (55–77) ----------
place(impact(3), 55.0, 0.25)
place(pad(ch("F2", "C3", "A3"), 11, 2, 1), 55.0, 0.2)
place(pad(ch("D2", "A2", "F3", "C4"), 12, 1, 2), 65.0, 0.2)
penta = ch("D4", "F4", "G4", "A4", "C5", "D5", "F5", "A5")
k = 0
tt = 57.0
while tt < 77.0:
    pat = [0, 2, 4, 6, 7, 5, 3, 1]
    f = penta[pat[k % 8]]
    place(pluck(f), tt, 0.05 + 0.05 * (tt - 57) / 20, (k % 2) * 0.6 - 0.3, 0.5)
    k += 1
    tt += 0.25
for tt in (60.0, 62.0, 64.0, 66.0, 68.0, 70.0, 72.0, 74.0, 76.0):
    place(kick(0.6), tt, 0.25, 0, 0.2)

# ---------- CHAPTER 5 · THE INVISIBLE BATTLE (77–95) ----------
place(impact(3), 77.0, 0.22)
place(pad(ch("G1", "D2", "Bb2"), 12.5, 3, 1.5, 0.1), 77.0, 0.22)
place(noise_bed(5.5, 2500, 1, 1) * 0.6, 84.0, 0.10, 0, 0.3)  # rain on glass
for i in range(60):
    place(tick() * 0.5, 84.0 + rng.uniform(0, 5), 0.02, rng.uniform(-1, 1), 0.5)
for tt, n in [(80.0, "Bb3"), (84.5, "D4"), (87.0, "A3")]:
    place(piano(NOTE[n], 5), tt, 0.14, 0, 0.8)
for i in range(4):  # alarm 06:00
    place(beep(), 89.0 + i * 0.22, 0.12, 0.3, 0.1)
place(pad(ch("Bb1", "F2", "D3", "F3"), 6, 0.3, 1), 89.8, 0.26)
for tt in (90.0, 91.0, 92.0, 93.0, 94.0):
    place(kick(), tt, 0.5, 0, 0.2)
    place(impact(1.2), tt, 0.1)

# ---------- CHAPTER 6 · BEYOND (95–112) ----------
prog = [(95.0, 99.0, ("D3", "F3", "A3", "D2")),
        (99.0, 102.0, ("Bb2", "D3", "F3", "Bb1")),
        (102.0, 104.0, ("F2", "A2", "C3", "F3")),
        (104.0, 106.0, ("C3", "E3", "G3", "C2")),
        (106.0, 112.0, ("D3", "F#3", "A3", "D2", "D4"))]
for a, b, notes in prog:
    place(strings(ch(*notes), b - a + 0.6, a=0.6 if a > 95 else 2.5, r=0.5), a, 0.34 + 0.06 * (a - 95) / 11)
tt, gap = 96.0, 0.8
while tt < 106.0:
    place(kick(), tt, 0.55, 0, 0.15)
    tt += gap
    gap = max(0.2, gap * 0.94)
place(riser(3.0), 103.0, 0.45)
place(impact(5), 106.0, 0.9)
for tt, n in [(106.0, "A4"), (107.5, "D5"), (109.0, "F#5"), (110.5, "A5")]:
    place(piano(NOTE[n], 4), tt, 0.2, 0, 0.7)

# hard cut to black at 112
cut = int(112.0 * SR)
dry[cut:] = 0
send[cut:] = 0

# ---------- FINAL MESSAGE (112–130) ----------
place(piano(NOTE["D3"], 6) + piano(NOTE["A3"], 6), 113.5, 0.2, 0, 0.8)
place(piano(NOTE["F3"], 6) + piano(NOTE["C4"], 6), 118.0, 0.2, 0, 0.8)
place(impact(5), 123.0, 0.55)
place(pad(ch("D2", "A2", "F#3", "D4"), 7, 0.8, 4.5, 0.35), 123.0, 0.32)
for tt, n in [(125.5, "A4"), (126.4, "F#4"), (127.3, "D5")]:
    place(piano(NOTE[n], 4), tt, 0.16, 0, 0.8)

# ---------- reverb + master ----------
ir_t = T(3.2)
ir = np.stack([rng.normal(0, 1, len(ir_t)), rng.normal(0, 1, len(ir_t))], 1) * np.exp(-ir_t / 0.75)[:, None]
ir[:, 0] = lowpass(ir[:, 0], 5000)
ir[:, 1] = lowpass(ir[:, 1], 5000)
ir /= np.sqrt((ir**2).sum(0))
L = 1 << int(np.ceil(np.log2(N + len(ir))))
wet = np.stack([np.fft.irfft(np.fft.rfft(send[:, c], L) * np.fft.rfft(ir[:, c], L), L)[:N] for c in (0, 1)], 1)
mix = dry + wet * 0.9
mix = np.tanh(mix * 1.4) / 1.4
end = np.clip((DUR - np.arange(N) / SR) / 2.0, 0, 1)
mix *= end[:, None]
mix /= np.abs(mix).max() / 0.89

pcm = (mix * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1], f"{DUR:.0f}s")
