#!/usr/bin/env python3
"""THE LAST TWO — original synthesized score + sound design (no samples).
usage: audio.py OUT.wav     -> 15.000 s, 48 kHz, stereo, 24-bit
Sync points match the lightning EVENTS and story beats in scene.js."""
import sys, wave
import numpy as np

SR = 48000; T = 15.0; N = int(SR * T)
rng = np.random.default_rng(2026)
L = np.zeros(N); Rt = np.zeros(N)

def t_axis(n): return np.arange(n) / SR
def spec_filter(x, lo=0.0, hi=None, slope=1.0):
    """zero-phase band filter via FFT with soft (butterworth-like) edges"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-6
    g = np.ones_like(f)
    if lo > 0: g *= 1 / np.sqrt(1 + (lo / f) ** (4 * slope))
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (4 * slope))
    return np.fft.irfft(X * g, len(x))
def add(sig, t, g=1.0, pan=0.0):
    s = int(t * SR); e = min(N, s + len(sig))
    if e <= s: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[s:e] += g * l * 1.414 * sig[: e - s]; Rt[s:e] += g * r * 1.414 * sig[: e - s]
def env_adsr(n, a, d_tau=None, release=0.05, sustain=1.0):
    x = t_axis(n); e = np.minimum(1, x / max(a, 1e-4))
    if d_tau: e = e * (sustain + (1 - sustain) * np.exp(-np.maximum(0, x - a) / d_tau))
    rel = int(release * SR); e[-rel:] *= np.linspace(1, 0, rel); return e
def noise(n): return rng.standard_normal(n)
def brown(n):
    b = np.cumsum(noise(n)); b -= np.convolve(b, np.ones(4801) / 4801, "same"); return b / (np.abs(b).max() + 1e-9)
def saw(freq_curve):
    ph = np.cumsum(freq_curve) / SR; return 2 * (ph % 1) - 1

# ---------------------------------------------------------------- rain bed (stereo, decorrelated)
for ch, arr in ((0, L), (1, Rt)):
    n = noise(N)
    rain = spec_filter(n, 400, 9000) * 0.05 + spec_filter(noise(N), 80, 600) * 0.05
    patter = spec_filter((rng.random(N) < 0.004) * noise(N), 1500, 12000) * 0.25  # individual drops
    swell = 0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t_axis(N) + ch)
    arr += (rain + patter) * swell
# wind gusts
w = spec_filter(noise(N), 150, 900, 0.7); wenv = 0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * t_axis(N)) ** 2
L += w * wenv * 0.04; Rt += np.roll(w, 2400) * wenv * 0.04

# ---------------------------------------------------------------- thunder
def thunder(t, dist, size):
    """crack (if close) + long rolling rumble"""
    dur = 2.8 + size * 2.5; n = int(dur * SR); x = t_axis(n)
    rum = brown(n) * 0.7 + spec_filter(noise(n), 20, 160) * 0.6
    am = np.ones(n)
    for k in range(int(4 + size * 4)):  # rolls
        c = rng.uniform(0.05, dur * 0.7); am += rng.uniform(0.5, 1.6) * np.exp(-((x - c) / rng.uniform(0.08, 0.35)) ** 2)
    rum = spec_filter(rum * am, 18, 220 + 500 / (1 + dist)) * np.minimum(1, x / (0.04 + dist * 0.12)) * np.exp(-x / (0.9 + size * 0.8))
    rum /= np.abs(rum).max() + 1e-9
    add(rum, t + dist * 0.35, 0.55 * size, rng.uniform(-0.4, 0.4))
    if dist < 1.0:
        cn = int(0.6 * SR); cx = t_axis(cn)
        crack = spec_filter(noise(cn), 900, 9000) * np.exp(-cx / 0.05) + spec_filter(noise(cn), 120, 1500) * np.exp(-cx / 0.18) * 0.8
        add(crack / np.abs(crack).max(), t + dist * 0.1, 0.5 * size * (1 - dist))
for t, dist, size in [(1.55, 1.6, 0.55), (4.9, 0.7, 0.9), (7.15, 1.4, 0.5), (9.25, 0.6, 0.85), (11.9, 0.0, 1.45), (14.42, 0.5, 0.9)]:
    thunder(t, dist, size)

# ---------------------------------------------------------------- orchestra: low strings drone, brass swells, high tremolo
D2 = 73.42
def section(freqs, t0, t1, gain, attack, bright, detune=0.004, voices=5, vib=4.8, cutoff_end=None):
    n = int((t1 - t0) * SR); x = t_axis(n); out = np.zeros(n)
    for f in freqs:
        for v in range(voices):
            d = 1 + detune * (v - voices / 2) / voices * 2
            fc = f * d * (1 + 0.0025 * np.sin(2 * np.pi * (vib + v * 0.3) * x + v))
            out += saw(fc) / voices
    out = spec_filter(out, 30, bright)
    if cutoff_end:  # filter opening for crescendo: crossfade dark->bright
        out = out * 0.5 + spec_filter(out, 30, cutoff_end) * np.linspace(0, 0.6, n)
    e = np.minimum(1, x / attack) ** 2; e[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR))
    return out * e * gain
strings = section([D2, D2 * 1.5, D2 * 2, D2 * 2.378], 0.0, 12.0, 0.11, 3.5, 900)
strings *= np.linspace(0.6, 1.25, len(strings))
add(strings, 0.0, 1.0, -0.25); add(np.roll(strings, 900), 0.0, 1.0, 0.25)
# minor-key motif in the cellos: D - F - E - A(low)
for (f, t0, d) in [(D2 * 2, 2.0, 1.6), (D2 * 2.378, 3.6, 1.2), (D2 * 2.245, 4.8, 1.2), (D2 * 1.5, 6.0, 2.2)]:
    add(section([f], 0, d, 0.09, 0.35, 1400, voices=4), t0, 1.0, 0.1)
brass = section([D2, D2 * 1.5, D2 * 2, D2 * 2.378, D2 * 3], 7.6, 12.0, 0.13, 2.6, 700, cutoff_end=2600)
add(brass, 7.6, 1.0)
# climax chord after the great flash: Dm with Bb colour, high tremolo strings
climax = section([D2 / 2, D2, D2 * 1.5, D2 * 2, D2 * 2.378, D2 * 2.67, D2 * 3], 11.9, 14.45, 0.16, 0.25, 2600)
add(climax, 11.9, 1.0)
n = int(2.55 * SR); x = t_axis(n)
trem = section([D2 * 8, D2 * 9.51, D2 * 12], 0, 2.55, 0.05, 0.4, 7000) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * x))
add(trem, 11.9, 1.0, 0.3)
# choir-like "ah" pad (formant filtered saws) under the climax
ch = section([D2 * 2, D2 * 3, D2 * 4.756], 0, 2.55, 0.25, 0.6, 4000, voices=7, vib=5.5)
ch = spec_filter(ch, 600, 900) * 1.2 + spec_filter(ch, 1100, 1300) * 0.6
add(ch, 11.9, 0.7, -0.2)

# ---------------------------------------------------------------- war drums (taiko), building to the end
def taiko(size=1.0):
    n = int(1.4 * SR); x = t_axis(n)
    f = (48 + 70 * np.exp(-x * 18)) / size
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / (0.35 * size))
    skin = spec_filter(noise(n), 150, 2500) * np.exp(-x / 0.02) * 0.5
    return body + skin
def shime():
    n = int(0.25 * SR); x = t_axis(n)
    return spec_filter(noise(n), 800, 6000) * np.exp(-x / 0.03) * 0.5 + np.sin(2 * np.pi * 420 * x) * np.exp(-x / 0.05) * 0.3
hits = []
t = 8.0; gap = 0.75
while t < 11.85:
    hits.append((t, 0.5 + (t - 8) * 0.1)); t += gap; gap = max(0.27, gap * 0.9)
hits += [(11.9, 1.3)]
t = 12.35; gap = 0.42
while t < 14.3:
    hits.append((t, 0.8 + (t - 12) * 0.12)); t += gap; gap = max(0.14, gap * 0.85)
for (ht, g) in hits:
    add(taiko(1.0 + 0.2 * (g > 1)), ht, 0.42 * g, rng.uniform(-0.3, 0.3))
    add(shime(), ht + 0.18, 0.18 * g, 0.5)

# ---------------------------------------------------------------- orc horde: distant war cries swelling as they charge
n = int(6.0 * SR); x = t_axis(n); horde = np.zeros(n)
for v in range(40):
    f0 = rng.uniform(70, 140); st = rng.uniform(0, 2.5); ln = rng.uniform(1.5, 3.5)
    fc = f0 * (1 + 0.25 * np.clip((x - st) / 0.4, 0, 1)) * (1 + 0.03 * np.sin(2 * np.pi * rng.uniform(5, 8) * x))
    voice = saw(fc) + 0.6 * noise(n) * 0.3
    e = np.clip((x - st) / 0.3, 0, 1) * np.clip((st + ln - x) / 0.6, 0, 1)
    horde += voice * e
horde = spec_filter(horde, 200, 650) + spec_filter(horde, 900, 1300) * 0.4  # growl formants, distance-darkened
horde *= np.linspace(0.3, 1.0, n); horde /= np.abs(horde).max()
add(horde, 9.3, 0.17, -0.1); add(np.roll(horde, 3000), 9.3, 0.17, 0.2)
# stampede: low earth rumble of thousands of feet
stamp = spec_filter(noise(n), 25, 120) * np.linspace(0, 1, n) ** 1.5
add(stamp / np.abs(stamp).max(), 9.4, 0.22)

# ---------------------------------------------------------------- foley: armour, grip, blade
def metal(freqs, dur, tau):
    n = int(dur * SR); x = t_axis(n)
    return sum(np.sin(2 * np.pi * f * x) * np.exp(-x / tau) / len(freqs) for f in freqs)
for (ft, g) in [(0.8, 0.10), (3.3, 0.08), (6.4, 0.1), (9.0, 0.18), (9.15, 0.12), (13.0, 0.1)]:  # lamellar plates shifting
    add(metal([1830, 2711, 3905, 5120], 0.25, 0.04) + spec_filter(noise(int(0.25 * SR)), 2000, 8000) * np.exp(-t_axis(int(0.25 * SR)) / 0.02) * 0.4, ft, g, rng.uniform(-0.5, 0.5))
n = int(0.6 * SR); creak = spec_filter(noise(n) * (0.5 + 0.5 * np.sin(2 * np.pi * 37 * t_axis(n))), 300, 1800) * np.sin(np.pi * t_axis(n) / 0.6)
add(creak, 8.95, 0.12, -0.2)  # leather grip tightening
n = int(1.8 * SR); x = t_axis(n)  # blade raise: rising metallic shing
shing = spec_filter(noise(n), 3000, 12000) * np.exp(-x / 0.25) * 0.3 + metal([3120, 4470, 6230, 8010], 1.8, 0.6)
add(shing * np.minimum(1, x / 0.05), 9.8, 0.16, 0.35)

# ---------------------------------------------------------------- final cinematic bass impact
n = int(0.6 * SR); x = t_axis(n)
sub = np.sin(2 * np.pi * np.cumsum(28 + 90 * np.exp(-x * 9)) / SR) * np.exp(-x / 0.35)
boom = spec_filter(noise(n), 30, 400) * np.exp(-x / 0.12)
impact = sub * 1.0 + boom * 0.5
add(impact, 14.42, 0.9)
add(metal([96, 143.5, 211], 0.6, 0.3), 14.42, 0.25)  # gong-like body

# ---------------------------------------------------------------- reverb (stereo convolution) + master
def reverb(x, seconds=2.6, seed=1):
    r = np.random.default_rng(seed); n = int(seconds * SR); tt = t_axis(n)
    ir = r.standard_normal(n) * np.exp(-tt / (seconds / 6.9)); ir = spec_filter(ir, 60, 6000); ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    m = len(x) + n; F = 1 << (m - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[: len(x)]
    return y / (np.abs(ir).sum() ** 0.5 * 4)
wetL, wetR = reverb(L, seed=1), reverb(Rt, seed=2)
L2, R2 = L + 0.55 * wetL, Rt + 0.55 * wetR
mix = np.stack([L2, R2], 1)
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) / np.tanh(1.6)  # glue / soft clip
fade = int(0.02 * SR); mix[:fade] *= np.linspace(0, 1, fade)[:, None]
fo = int(0.25 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix *= 0.93
pcm = (np.clip(mix, -1, 1) * (2 ** 23 - 1)).astype(np.int32)
b = np.frombuffer(pcm.astype("<i4").tobytes(), np.uint8).reshape(-1, 4)[:, :3].tobytes()
with wave.open(sys.argv[1], "wb") as wf:
    wf.setnchannels(2); wf.setsampwidth(3); wf.setframerate(SR); wf.writeframes(b)
print("wrote", sys.argv[1], f"{N / SR:.3f}s")
