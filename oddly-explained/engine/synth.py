"""ODDLY EXPLAINED engine — tiny numpy synthesis toolkit for original sound design (no samples, no licences).
All functions return float64 arrays at SR; stereo buses are (N, 2)."""
import numpy as np

SR = 48000


class Bus:
    def __init__(self, dur, seed=1):
        self.n = int(dur * SR); self.x = np.zeros((self.n, 2)); self.rng = np.random.default_rng(seed)

    def add(self, sig, t, gain=1.0, pan=0.0):
        s = int(t * SR)
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
        if s < 0: sig = sig[-s:]; s = 0
        e = min(self.n, s + len(sig))
        if e > s: self.x[s:e] += gain * sig[: e - s]


def tvec(dur): return np.arange(int(dur * SR)) / SR


def env_ad(dur, a=0.01, d=0.5, curve=1.0):
    t = tvec(dur); return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d) ** curve


def env_adsr(dur, a, r):
    t = tvec(dur); return np.minimum(1, t / max(a, 1e-4)) * np.minimum(1, np.maximum(0, dur - t) / max(r, 1e-4))


def sine_sweep(f0, f1, dur, curve='exp'):
    t = tvec(dur); k = t / dur
    f = f0 * (f1 / f0) ** k if curve == 'exp' else f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def osc(f, dur, kind='sine', detune=0.0, phase=0.0):
    t = tvec(dur); ph = (f * (1 + detune)) * t + phase
    if kind == 'sine': return np.sin(2 * np.pi * ph)
    if kind == 'saw': return 2 * (ph % 1) - 1
    if kind == 'tri': return 2 * np.abs(2 * (ph % 1) - 1) - 1
    raise ValueError(kind)


def fft_filter(x, lo=None, hi=None, slope=2.0):
    """Smooth band filter in the frequency domain (lo = highpass corner, hi = lowpass corner)."""
    n = len(x); N = 1 << (n - 1).bit_length(); X = np.fft.rfft(x, N, axis=0); f = np.fft.rfftfreq(N, 1 / SR)
    g = np.ones_like(f)
    if hi: g *= 1 / (1 + (f / hi) ** (2 * slope))
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    if x.ndim == 2: g = g[:, None]
    return np.fft.irfft(X * g, N, axis=0)[:n]


def noise(bus, dur, color='white'):
    x = bus.rng.standard_normal(int(dur * SR))
    if color == 'pink':
        N = 1 << (len(x) - 1).bit_length(); X = np.fft.rfft(x, N); f = np.fft.rfftfreq(N, 1 / SR); X /= np.sqrt(np.maximum(f, 20)); x = np.fft.irfft(X, N)[: len(x)]
        x /= np.std(x) + 1e-9
    return x


def swept_noise(bus, dur, f0, f1, q=0.25, blocks=48):
    """Band of noise whose centre moves from f0 to f1 (risers / whooshes). Overlap-added FFT blocks."""
    n = int(dur * SR); out = np.zeros(n); B = n // blocks; win = np.hanning(2 * B)
    for i in range(blocks + 1):
        s = (i - 1) * B; seg = bus.rng.standard_normal(2 * B)
        fc = f0 * (f1 / f0) ** min(1, max(0, i / blocks))
        seg = fft_filter(seg, lo=fc * (1 - q), hi=fc * (1 + q), slope=1.5) * win
        a, b = max(0, s), min(n, s + 2 * B)
        if b > a: out[a:b] += seg[a - s: b - s]
    return out / (np.max(np.abs(out)) + 1e-9)


def reverb_ir(bus, dur=2.8, decay=1.2, bright=6000, predelay=0.012):
    n = int(dur * SR); t = np.arange(n) / SR
    ir = bus.rng.standard_normal((n, 2)) * np.exp(-t / (decay / 6.9))[:, None]
    ir = fft_filter(ir, hi=bright, slope=1.0); ir[: int(predelay * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2, 0, keepdims=True))


def convolve(x, ir):
    n = len(x) + len(ir) - 1; N = 1 << (n - 1).bit_length()
    if x.ndim == 1: x = np.stack([x, x], 1)
    Y = np.fft.rfft(x, N, axis=0) * np.fft.rfft(ir, N, axis=0)
    return np.fft.irfft(Y, N, axis=0)[: len(x)]


def fm_bell(f, dur, idx=3.0, ratio=3.5, d=1.2):
    t = tvec(dur); e = np.exp(-t / d)
    return np.sin(2 * np.pi * f * t + idx * e * np.sin(2 * np.pi * f * ratio * t)) * env_ad(dur, 0.003, d)


def pad(freqs, dur, a=1.5, r=2.0, voices=3, spread=0.006, kind='saw', hi=1800, bus=None):
    out = np.zeros((int(dur * SR), 2))
    for f in freqs:
        for v in range(voices):
            dt = (v - (voices - 1) / 2) * spread; ph = (bus.rng.random() if bus else 0.0)
            s = osc(f, dur, kind, detune=dt, phase=ph); pan = (v / max(1, voices - 1)) * 2 - 1 if voices > 1 else 0
            out[:, 0] += s * (1 - pan) * 0.5; out[:, 1] += s * (1 + pan) * 0.5
    out = fft_filter(out, lo=60, hi=hi, slope=1.5)
    return out * env_adsr(dur, a, r)[:, None] / (len(freqs) * voices) * 2


def crackle(bus, dur, density=40, hi=9000):
    """Electrical crackle: sparse sharp clicks and micro-zaps."""
    n = int(dur * SR); x = np.zeros(n)
    k = bus.rng.poisson(density * dur)
    for _ in range(k):
        p = bus.rng.integers(0, n); L = bus.rng.integers(30, 600)
        burst = bus.rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * bus.rng.uniform(0.2, 1)
        e = min(n, p + L); x[p:e] += burst[: e - p]
    return fft_filter(x, lo=1500, hi=hi, slope=1.2)


def impact(bus, dur=3.0, f0=62, f1=30, body=1.0, air=0.5):
    """Cinematic low impact: pitched sub drop + lowpassed noise body + transient click."""
    sub = sine_sweep(f0, f1, dur) * env_ad(dur, 0.004, dur * 0.35)
    thud = fft_filter(noise(bus, dur), hi=180, slope=2) * env_ad(dur, 0.002, 0.25) * 3.0
    click = fft_filter(noise(bus, 0.03), lo=2000, hi=8000) * env_ad(0.03, 0.0005, 0.006)
    s = sub * 0.9 + thud * 0.35 * body
    s[: len(click)] += click * 0.4
    sh = fft_filter(noise(bus, dur), lo=3000, hi=12000) * env_ad(dur, 0.01, 0.6) * air * 0.12
    return s + sh


def soft_limit(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)
