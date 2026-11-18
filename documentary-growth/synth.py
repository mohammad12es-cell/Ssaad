"""Shared synthesised instruments (piano, strings, drones, impacts, whooshes, breaths) + reverb."""
import math
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)


def hz(note):
    names = {"C": -9, "C#": -8, "Db": -8, "D": -7, "D#": -6, "Eb": -6, "E": -5, "F": -4, "F#": -3,
             "Gb": -3, "G": -2, "G#": -1, "Ab": -1, "A": 0, "A#": 1, "Bb": 1, "B": 2}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o - 4)) / 12)


def add(buf, x, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    if i < 0:
        x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += gain * x[:n]


def reverb_ir(seconds, decay, seed, bright=0.5):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    noise = r.standard_normal(n)
    # darker as it decays
    lo = signal.sosfilt(signal.butter(2, 2500, "low", fs=SR, output="sos"), noise)
    mix = np.exp(-t / (decay * 0.35))
    ir = (noise * bright * mix + lo * (1 - bright * mix)) * np.exp(-t / decay)
    ir[: int(0.018 * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2))


def stereo_reverb(x, seconds, decay, wet, seed=1):
    l = signal.fftconvolve(x, reverb_ir(seconds, decay, seed))[: len(x)]
    r = signal.fftconvolve(x, reverb_ir(seconds, decay, seed + 1))[: len(x)]
    return np.stack([x * (1 - wet) + l * wet, x * (1 - wet) + r * wet], 1)


# ------------------------------------------------------------------ instruments
def piano(f, dur, vel=0.6):
    ring = min(7.0, 2.5 + 4.0 * (220 / f) ** 0.5)
    n = int((dur + ring) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00025
    tau0 = 4.0 * (261 / f) ** 0.45
    bright = 0.6 + 0.8 * vel
    for k in range(1, 12):
        fk = k * f * math.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        a = (1.0 / k ** (1.9 - 0.6 * bright)) * (1.0 if k == 1 else 0.85)
        tau = tau0 / (1 + 0.55 * (k - 1))
        env = 0.65 * np.exp(-t / (0.18 * tau + 0.02)) + 0.35 * np.exp(-t / tau)
        det = 1 + 0.00035 * (k % 3 - 1)
        out += a * env * (np.sin(2 * np.pi * fk * t) + 0.6 * np.sin(2 * np.pi * fk * det * t + 0.3))
    att = np.minimum(1, t / 0.004)
    damp = np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.35))
    ham = rng.standard_normal(int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / (0.002 * SR))
    ham = signal.sosfilt(signal.butter(2, [200, 3000], "band", fs=SR, output="sos"), ham)
    out[: len(ham)] += 0.15 * ham
    return vel * out * att * damp / 3.0


def strings(freqs, dur, vel=0.4, attack=1.6, release=2.4, bright=0.5):
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for v in range(4):
            det = 1 + (v - 1.5) * 0.0022
            vib = 1 + 0.0025 * np.sin(2 * np.pi * (4.6 + 0.4 * v) * t + v)
            ph = 2 * np.pi * np.cumsum(f * det * vib) / SR
            kmax = int(min(14, 4500 / f))
            for k in range(1, kmax + 1):
                out += np.sin(k * ph + v) / k ** (2.0 - bright)
    env = np.minimum(1, t / attack) ** 1.5
    env *= np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 3)))
    out = signal.sosfilt(signal.butter(2, 1800 + 2500 * bright, "low", fs=SR, output="sos"), out)
    return vel * out * env / (len(freqs) * 9)


def drone(freqs, dur, vel=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for v, d in enumerate((-0.003, 0, 0.003)):
            out += np.sin(2 * np.pi * f * (1 + d) * t + v) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + v))
            out += 0.25 * np.sin(4 * np.pi * f * (1 + d) * t)
    return vel * out / (len(freqs) * 3)


def air(dur, vel=0.05, lo=300, hi=2200):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    x = signal.sosfilt(signal.butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
    t = np.arange(n) / SR
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t) * np.sin(2 * np.pi * 0.13 * t + 1)
    return vel * x * mod


def impact(vel=1.0, low=52, length=2.4):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 28 + (low - 28) * np.exp(-t / 0.35)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    thump = signal.sosfilt(signal.butter(2, 180, "low", fs=SR, output="sos"),
                           rng.standard_normal(n)) * np.exp(-t / 0.06)
    return vel * (0.9 * body + 1.6 * thump) * np.minimum(1, t / 0.002)


def drum(vel=0.6, f0=95, f1=48):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    skin = signal.sosfilt(signal.butter(2, [150, 900], "band", fs=SR, output="sos"),
                          rng.standard_normal(n)) * np.exp(-t / 0.03)
    return vel * (body + 0.5 * skin)


def whoosh(length=1.0, vel=0.25, f_from=300, f_to=3000, rev=False):
    n = int(length * SR)
    x = rng.standard_normal(n)
    fr, tt, Z = signal.stft(x, SR, nperseg=1024)
    prog = np.linspace(0, 1, Z.shape[1])
    if rev:
        prog = prog[::-1]
    fc = f_from * (f_to / f_from) ** prog
    G = np.exp(-0.5 * (np.log(fr[:, None] + 1) - np.log(fc[None, :])) ** 2 / 0.35)
    _, y = signal.istft(Z * G, SR, nperseg=1024)
    y = y[:n]
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    if rev:
        env = np.linspace(0, 1, n) ** 2.5
    return vel * y * env / (np.abs(y).max() + 1e-9)


def breath(vel=0.03, length=0.55):
    n = int(length * SR)
    x = rng.standard_normal(n)
    x = signal.sosfilt(signal.butter(2, [500, 2600], "band", fs=SR, output="sos"), x)
    env = np.sin(np.pi * np.linspace(0, 1, n) ** 0.7) ** 2
    return vel * x * env


