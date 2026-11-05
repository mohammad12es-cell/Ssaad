"""Synthesizes the episode's original music and sound effects (no samples, no third-party audio)."""
import sys, wave
import numpy as np

SR, DUR = 44100, 20.0
N = int(SR * DUR)
rng = np.random.default_rng(4)
mix = np.zeros(N)
music = np.zeros(N)


def put(buf, t, sig, gain=1.0):
    i = int(t * SR)
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def tt(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=0.005, r=None):
    t = tt(d)
    e = np.minimum(1, t / a)
    return e * (np.exp(-t / r) if r else np.clip((d - t) / max(d * 0.3, 1e-3), 0, 1))


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")


def pluck(f, d=0.22, r=0.09):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sign(np.sin(2 * np.pi * f * t))) * env(d, r=r)


def noise(d):
    return rng.standard_normal(int(d * SR))


# ---------- music: a bouncy original tune, 128 BPM, C major ----------
BEAT = 60 / 128
NOTE = {"C4": 261.6, "D4": 293.7, "E4": 329.6, "F4": 349.2, "G4": 392.0, "A4": 440.0, "B4": 493.9,
        "C5": 523.3, "D5": 587.3, "E5": 659.3, "G5": 784.0, "A3": 220.0, "G3": 196.0, "F3": 174.6, "C3": 130.8, "E3": 164.8}
melody = ["E4", "G4", "C5", "G4", "A4", "G4", "E4", None, "D4", "F4", "A4", "F4", "G4", "E4", "D4", None,
          "E4", "G4", "C5", "D5", "E5", "D5", "C5", None, "A4", "G4", "E4", "D4", "C4", None, "G4", None]
bass = ["C3", "C3", "F3", "G3", "C3", "A3", "F3", "G3"]
t = 0.0
k = 0
while t < DUR:
    m = melody[k % len(melody)]
    if m:
        put(music, t, pluck(NOTE[m]), 0.22)
    if k % 4 == 0:
        b = NOTE[bass[(k // 4) % len(bass)]]
        put(music, t, pluck(b, 0.45, 0.2), 0.3)
    if k % 2 == 0:  # soft tick
        put(music, t, lowpass(noise(0.03), 2) * env(0.03, r=0.008), 0.05)
    t += BEAT / 2
    k += 1

# duck the music for the "wait—" beat, then bring it back
g = np.ones(N)
a, b = int(14.15 * SR), int(15.75 * SR)
g[a:b] = 0.0
fade = int(0.08 * SR)
g[a - fade:a] = np.linspace(1, 0, fade)
g[b:b + fade] = np.linspace(0, 1, fade)
g[int(19.4 * SR):] = np.linspace(1, 0, N - int(19.4 * SR))
mix += music * g


# ---------- sound effects ----------
def scribble(t0, d, gain=0.35):
    n = noise(d)
    hp = n - lowpass(n, 6)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * 14 * tt(d)) ** 2
    put(mix, t0, hp * am * env(d, a=0.02), gain)


def thud(t0, f0=110, d=0.35, gain=0.9):
    tx = tt(d)
    f = f0 * np.exp(-tx * 6)
    put(mix, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, r=0.1), gain)
    put(mix, t0, lowpass(noise(0.08), 8) * env(0.08, r=0.02), gain * 0.6)


def whoosh(t0, d=0.35, gain=0.3):
    n = lowpass(noise(d), 12)
    put(mix, t0, n * np.sin(np.pi * tt(d) / d) ** 2, gain)


def ha(t0, gain=0.35):
    for i in range(3):
        d = 0.12
        f = 170 - i * 12
        tx = tt(d)
        s = np.sign(np.sin(2 * np.pi * f * tx)) * 0.5 + np.sin(2 * np.pi * f * 2 * tx)
        put(mix, t0 + i * 0.17, lowpass(s, 5) * env(d, a=0.01), gain)


def pop(t0, f=900, gain=0.4):
    tx = tt(0.08)
    put(mix, t0, np.sin(2 * np.pi * (f + 1800 * tx) * tx) * env(0.08, r=0.02), gain)


def ding(t0, gain=0.35):
    tx = tt(1.0)
    put(mix, t0, (np.sin(2 * np.pi * 1568 * tx) + 0.5 * np.sin(2 * np.pi * 2352 * tx)) * np.exp(-tx * 4), gain)


def rub(t0, d, gain=0.4):
    n = noise(d)
    s = lowpass(n, 4) - lowpass(n, 30)
    am = 0.35 + 0.65 * np.abs(np.sin(2 * np.pi * 4.1 * tt(d)))
    put(mix, t0, s * am * env(d, a=0.03), gain)


def boing(t0, gain=0.45):
    tx = tt(0.6)
    f = 180 + 520 * (1 - np.exp(-tx * 5)) + 35 * np.sin(2 * np.pi * 14 * tx)
    put(mix, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.6, r=0.25), gain)


def gulp(t0, gain=0.3):
    tx = tt(0.18)
    f = 500 - 1600 * tx
    put(mix, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.18, r=0.06), gain)


whoosh(0.0, 0.32)
thud(0.32, 90, 0.5, 1.0)
scribble(1.0, 0.75)
pop(1.8, 700)
scribble(2.4, 0.85, 0.42)
ha(3.3)
gulp(3.45)
scribble(4.2, 0.85)
scribble(5.5, 1.0, 0.42)
pop(6.72, 300, 0.5)
thud(6.95, 220, 0.12, 0.3)
ha(7.15)
scribble(7.85, 0.45)
ding(8.32)
scribble(8.6, 0.8)
pop(9.45, 1200, 0.3)
whoosh(9.7, 0.3, 0.35)
rub(10.0, 2.2)
pop(12.3, 1000, 0.35)
pop(12.7, 1100, 0.3)
whoosh(13.55, 0.3, 0.3)
rub(13.6, 0.6, 0.45)
thud(14.38, 140, 0.3, 0.8)
gulp(14.9, 0.35)
scribble(15.8, 0.95)
boing(16.95)
pop(17.55, 800, 0.3)

mix /= max(1e-6, np.max(np.abs(mix))) / 0.9
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
stereo = np.repeat(pcm[:, None], 2, axis=1)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "assets/audio.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(stereo.tobytes())
print("ok")
