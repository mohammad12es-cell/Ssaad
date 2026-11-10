#!/usr/bin/env python3
"""THE LAST TWO v2 — original synthesized score + sound design (no samples).
usage: audio.py OUT.wav  -> exactly 15.000 s, 48 kHz, stereo, 24-bit.
Every cue below is locked to src/timeline.js (fireballs, lightning, the strike, the ring, the wall)."""
import sys, wave
import numpy as np

SR = 48000; T = 15.0; N = int(SR * T)
rng = np.random.default_rng(2027)
L = np.zeros(N); R = np.zeros(N)

def tx(n): return np.arange(n) / SR
def filt(x, lo=0.0, hi=None, slope=1.0):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-6; g = np.ones_like(f)
    if lo > 0: g *= 1 / np.sqrt(1 + (lo / f) ** (4 * slope))
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (4 * slope))
    return np.fft.irfft(X * g, len(x))
def add(sig, t, g=1.0, pan=0.0):
    if t < 0: sig = sig[int(-t * SR):]; t = 0
    s = int(t * SR); e = min(N, s + len(sig))
    if e <= s: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[s:e] += g * l * 1.414 * sig[: e - s]; R[s:e] += g * r * 1.414 * sig[: e - s]
def noise(n): return rng.standard_normal(n)
def brown(n):
    b = np.cumsum(noise(n)); b -= np.convolve(b, np.ones(4801) / 4801, "same"); return b / (np.abs(b).max() + 1e-9)
def saw(fc): ph = np.cumsum(fc) / SR; return 2 * (ph % 1) - 1
def norm(x): return x / (np.abs(x).max() + 1e-9)
def sweep_band(n, f0, f1, q=0.25):
    """noise whose band centre glides f0 -> f1 (whooshes); STFT-free: crossfade a few fixed bands"""
    out = np.zeros(n); k = np.linspace(0, 1, n); bands = np.geomspace(f0, f1, 8)
    for i, fc in enumerate(bands):
        w = np.exp(-((k * 7 - i) ** 2) / 1.2); out += filt(noise(n), fc * (1 - q), fc * (1 + q)) * w
    return out

# ---------------------------------------------------------------- beds: rain, wind
for arr in (L, R):
    arr += (filt(noise(N), 400, 9000) * 0.05 + filt(noise(N), 80, 600) * 0.05 + filt((rng.random(N) < 0.004) * noise(N), 1500, 12000) * 0.25) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * tx(N) + rng.random()))
w = filt(noise(N), 150, 900, 0.7) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * tx(N)) ** 2); L += w * 0.04; R += np.roll(w, 2400) * 0.04

# ---------------------------------------------------------------- thunder (with distance delay)
def thunder(t, dist, size):
    dur = 2.8 + size * 2.5; n = int(dur * SR); x = tx(n); am = np.ones(n)
    for _ in range(int(4 + size * 4)): c = rng.uniform(0.05, dur * 0.7); am += rng.uniform(0.5, 1.6) * np.exp(-((x - c) / rng.uniform(0.08, 0.35)) ** 2)
    rum = filt((brown(n) * 0.7 + filt(noise(n), 20, 160) * 0.6) * am, 18, 220 + 500 / (1 + dist)) * np.minimum(1, x / (0.04 + dist * 0.12)) * np.exp(-x / (0.9 + size * 0.8))
    add(norm(rum), t + dist * 0.35, 0.5 * size, rng.uniform(-0.4, 0.4))
    if dist < 1.0:
        cn = int(0.6 * SR); cx = tx(cn); crack = filt(noise(cn), 900, 9000) * np.exp(-cx / 0.05) + filt(noise(cn), 120, 1500) * np.exp(-cx / 0.18) * 0.8
        add(norm(crack), t + dist * 0.1, 0.45 * size * (1 - dist))
for t, d, s in [(1.15, 1.6, 0.55), (4.85, 0.7, 1.0), (7.05, 0.5, 0.9), (11.9, 0.0, 1.45), (14.42, 0.45, 1.0)]: thunder(t, d, s)

# ---------------------------------------------------------------- fire sound kit
def roar(dur, bright=900, flick=6.0):
    n = int(dur * SR); x = tx(n)
    body = filt(brown(n), 30, bright) * 0.8 + filt(noise(n), 200, bright * 2.5) * 0.25
    am = 0.75 + 0.25 * np.sin(2 * np.pi * flick * x + rng.random() * 6) * np.sin(2 * np.pi * flick * 0.37 * x)
    crackle = filt((rng.random(n) < 0.0025) * noise(n) * 3, 1500, 9000)
    return norm(body * am) + crackle * 0.35
def whoomph(size=1.0):
    n = int(1.6 * SR); x = tx(n)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 110 * np.exp(-x * 7)) / SR) * np.exp(-x / (0.35 * size))
    gust = filt(noise(n), 60, 900) * np.minimum(1, x / 0.03) * np.exp(-x / (0.3 * size))
    return norm(sub * 0.9 + gust * 0.8)
def whoosh(dur, f0, f1):
    n = int(dur * SR); x = tx(n); e = np.sin(np.pi * np.clip(x / dur, 0, 1)) ** 1.5
    return norm(sweep_band(n, f0, f1) * e)
def explosion(size=1.0):
    n = int(2.5 * SR); x = tx(n)
    boom = filt(brown(n), 20, 300) * np.minimum(1, x / 0.006) * np.exp(-x / (0.45 * size))
    crack = filt(noise(n), 700, 8000) * np.exp(-x / 0.06)
    debris = filt((rng.random(n) < 0.004) * noise(n) * np.exp(-x / 0.6), 800, 6000) * 2
    return norm(boom * 1.2 + crack * 0.6 + debris * 0.4)

# ---------------------------------------------------------------- orc catapult volleys
FB = [2.2, 2.42, 2.66, 2.9, 5.0, 5.22, 5.45, 5.7]
for i, tI in enumerate(FB):
    tL = tI - 2.6
    if tL >= 0:  # launch: trebuchet thunk + rope creak, far away
        n = int(0.8 * SR); x = tx(n); thunk = filt(noise(n), 40, 300) * np.exp(-x / 0.12) + np.sin(2 * np.pi * 55 * x) * np.exp(-x / 0.2)
        add(norm(thunk), tL + 0.9, 0.12, rng.uniform(-0.6, 0.6))
    add(whoosh(1.0, 300, 1400), tI - 0.85, 0.22, rng.uniform(-0.7, 0.7))        # incoming roar overhead
    add(explosion(1.0 + 0.2 * (i % 2)), tI, 0.55 if tI < 3 else 0.42, rng.uniform(-0.6, 0.6))
add(roar(12.5, 700, 4.0), 2.3, 0.06, -0.3); add(roar(10, 650, 5.0), 5.0, 0.07, 0.3)  # craters keep burning

# ---------------------------------------------------------------- orc horde: war drums & chants (pumping weapons), charge, screams
for b in np.arange(0, 4.6, 0.75):
    n = int(0.9 * SR); x = tx(n); dr = np.sin(2 * np.pi * np.cumsum(46 + 50 * np.exp(-x * 20)) / SR) * np.exp(-x / 0.25)
    add(norm(dr), b, 0.28, -0.1)
    ch = np.zeros(int(0.45 * SR)); xx = tx(len(ch))
    for v in range(14): ch += saw(np.full(len(ch), rng.uniform(80, 130)) * (1 - 0.15 * xx)) * rng.uniform(0.5, 1)
    ch = (filt(ch, 250, 700) + filt(ch, 900, 1300) * 0.5) * np.minimum(1, xx / 0.03) * np.exp(-xx / 0.18)
    add(norm(ch), b + 0.06, 0.12, 0.1)
n = int(6.5 * SR); x = tx(n); horde = np.zeros(n)
for v in range(48):
    st = rng.uniform(0, 3); ln = rng.uniform(1.5, 3.5); fc = rng.uniform(70, 140) * (1 + 0.25 * np.clip((x - st) / 0.4, 0, 1)) * (1 + 0.03 * np.sin(2 * np.pi * rng.uniform(5, 8) * x))
    horde += (saw(fc) + 0.2 * noise(n)) * np.clip((x - st) / 0.3, 0, 1) * np.clip((st + ln - x) / 0.6, 0, 1)
horde = norm((filt(horde, 200, 650) + filt(horde, 900, 1300) * 0.4) * np.linspace(0.3, 1.0, n))
add(horde, 4.4, 0.15, -0.15); add(np.roll(horde, 3000), 4.4, 0.15, 0.2)
add(norm(filt(noise(int(7 * SR)), 25, 120) * np.linspace(0, 1, int(7 * SR)) ** 1.5), 4.6, 0.2)   # thousands of feet
def screams(t, dur, g):
    n = int(dur * SR); x = tx(n); s = np.zeros(n)
    for v in range(30):
        st = rng.uniform(0, dur * 0.5); fc = rng.uniform(220, 420) * (1 + 0.4 * np.clip((x - st) / 0.2, 0, 1)) * (1 - 0.3 * np.clip((x - st - 0.3) / 0.8, 0, 1))
        s += saw(fc) * np.clip((x - st) / 0.05, 0, 1) * np.exp(-np.maximum(0, x - st) / rng.uniform(0.4, 0.9))
    add(norm(filt(s, 500, 2400)), t, g, rng.uniform(-0.3, 0.3))
screams(9.75, 2.0, 0.13); screams(10.75, 1.8, 0.12); screams(12.55, 2.2, 0.1)

# ---------------------------------------------------------------- orchestra
D2 = 73.42
def section(freqs, dur, gain, attack, bright, detune=0.004, voices=5, vib=4.8, open_to=None):
    n = int(dur * SR); x = tx(n); out = np.zeros(n)
    for f in freqs:
        for v in range(voices):
            d = 1 + detune * (v - voices / 2) / voices * 2
            out += saw(f * d * (1 + 0.0025 * np.sin(2 * np.pi * (vib + v * 0.3) * x + v))) / voices
    o = filt(out, 30, bright)
    if open_to: o = o * 0.5 + filt(out, 30, open_to) * np.linspace(0, 0.7, n)
    e = np.minimum(1, x / attack) ** 2; e[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR)); return o * e * gain
s = section([D2, D2 * 1.5, D2 * 2, D2 * 2.378], 12.0, 0.1, 3.0, 900) * np.linspace(0.6, 1.2, int(12 * SR))
add(s, 0, 1, -0.25); add(np.roll(s, 900), 0, 1, 0.25)
for f, t0, d in [(D2 * 2, 1.6, 1.4), (D2 * 2.378, 3.0, 1.2), (D2 * 2.245, 4.2, 1.2), (D2 * 1.5, 5.4, 1.8)]:
    add(section([f], d, 0.09, 0.3, 1400, voices=4), t0, 1, 0.1)
# hero shot: a held, aching high string line over the drone
add(section([D2 * 4, D2 * 4.756], 2.6, 0.05, 0.6, 3000, voices=6, vib=5.5), 6.0, 1, 0.2)
add(section([D2, D2 * 1.5, D2 * 2, D2 * 2.378, D2 * 3], 2.9, 0.13, 2.2, 700, open_to=2600), 6.0, 1)   # brass swell into the strike
# action: driving low ostinato under the fire attacks
for k, t0 in enumerate(np.arange(8.9, 11.9, 0.25)):
    add(section([D2 if k % 4 != 3 else D2 * 1.19], 0.22, 0.12, 0.01, 1100, voices=3), t0, 1, -0.2 if k % 2 else 0.2)
add(section([D2 * 2, D2 * 2.67, D2 * 3, D2 * 4], 3.0, 0.07, 0.4, 2600), 8.92, 1, 0.3)                 # brass stabs ringing out
clim = section([D2 / 2, D2, D2 * 1.5, D2 * 2, D2 * 2.378, D2 * 2.67, D2 * 3], 3.1, 0.17, 0.3, 2600)
add(clim, 11.9, 1)
n = int(3.1 * SR); x = tx(n)
add(section([D2 * 8, D2 * 9.51, D2 * 12], 3.1, 0.05, 0.4, 7000) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * x)), 11.9, 1, 0.3)
ch = section([D2 * 2, D2 * 3, D2 * 4.756], 3.1, 0.25, 0.6, 4000, voices=7, vib=5.5); add(filt(ch, 600, 900) * 1.2 + filt(ch, 1100, 1300) * 0.6, 11.9, 0.75, -0.2)

# ---------------------------------------------------------------- taiko: builds from the hero shot to the final second
def taiko(size=1.0):
    n = int(1.4 * SR); x = tx(n)
    return np.sin(2 * np.pi * np.cumsum((48 + 70 * np.exp(-x * 18)) / size) / SR) * np.exp(-x / (0.35 * size)) + filt(noise(n), 150, 2500) * np.exp(-x / 0.02) * 0.5
def shime(): n = int(0.25 * SR); x = tx(n); return filt(noise(n), 800, 6000) * np.exp(-x / 0.03) * 0.5 + np.sin(2 * np.pi * 420 * x) * np.exp(-x / 0.05) * 0.3
hits = []; t = 6.0; gap = 0.8
while t < 8.75: hits.append((t, 0.5 + (t - 6) * 0.12)); t += gap; gap = max(0.2, gap * 0.82)
hits += [(8.92, 1.4), (9.75, 1.1), (10.55, 1.4), (11.9, 1.5), (12.45, 1.5)]
t = 12.95; gap = 0.42
while t < 14.3: hits.append((t, 0.8 + (t - 12.9) * 0.2)); t += gap; gap = max(0.12, gap * 0.84)
for ht, g in hits: add(taiko(1.0 + 0.25 * (g > 1.2)), ht, 0.38 * g, rng.uniform(-0.3, 0.3)); add(shime(), ht + 0.18, 0.15 * g, 0.5)

# ---------------------------------------------------------------- the heroes: foley + supernatural fire
def metal(freqs, dur, tau): n = int(dur * SR); x = tx(n); return sum(np.sin(2 * np.pi * f * x) * np.exp(-x / tau) / len(freqs) for f in freqs)
for ft, g in [(0.9, 0.09), (3.4, 0.08), (6.3, 0.09), (8.3, 0.14), (10.05, 0.14), (12.2, 0.1), (13.1, 0.1)]:
    add(metal([1830, 2711, 3905, 5120], 0.25, 0.04) + filt(noise(int(0.25 * SR)), 2000, 8000) * np.exp(-tx(int(0.25 * SR)) / 0.02) * 0.4, ft, g, rng.uniform(-0.5, 0.5))
n = int(0.6 * SR); add(filt(noise(n) * (0.5 + 0.5 * np.sin(2 * np.pi * 37 * tx(n))), 300, 1800) * np.sin(np.pi * tx(n) / 0.6), 6.95, 0.12, -0.2)  # he tightens his grip
n = int(1.6 * SR); x = tx(n); add((filt(noise(n), 3000, 12000) * np.exp(-x / 0.25) * 0.3 + metal([3120, 4470, 6230, 8010], 1.6, 0.6)) * np.minimum(1, x / 0.05), 6.9, 0.12, 0.35)  # she raises her blade
# HIS STRIKE: wind-up, whoosh, ignition, the wave roaring away, the impact on the horde
add(whoosh(0.5, 400, 2500), 8.45, 0.18, 0.2)
add(whoosh(0.28, 600, 5000), 8.76, 0.35, -0.2)
add(whoomph(1.3), 8.92, 0.75)
wv = roar(2.6, 1400, 9.0) * np.linspace(1, 0.25, int(2.6 * SR)); add(wv, 8.92, 0.42, -0.1)
add(explosion(1.4), 9.75, 0.6, 0.0)
# HER SPIN: rising spiral whoosh, the ring bursting outward
n = int(0.5 * SR); add(whoosh(0.5, 300, 4000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tx(n))), 10.08, 0.38, 0.0)
add(whoomph(1.4), 10.55, 0.8)
add(roar(2.2, 1300, 7.0) * np.linspace(1, 0.3, int(2.2 * SR)), 10.55, 0.4, 0.15)
add(explosion(1.2), 10.85, 0.32, 0.3)
# THE WALL: eruption, sustained inferno, final surge
add(whoomph(2.0), 12.45, 0.9)
n = int(2.6 * SR); add(roar(2.6, 1100, 5.0) * np.minimum(1, tx(n) / 0.4), 12.45, 0.5)
add(sweep_band(int(1.9 * SR), 200, 2500) * np.linspace(0, 1, int(1.9 * SR)) ** 2 * 0.25, 12.55, 1.0)  # rising riser to the end
# footsteps in the mud as they advance
for k, ts in enumerate(np.arange(12.4, 14.9, 0.25)):
    n = int(0.18 * SR); x = tx(n); add(filt(noise(n), 200, 2200) * np.exp(-x / 0.04) + filt(noise(n), 60, 300) * np.exp(-x / 0.06), ts, 0.09, -0.3 if k % 2 else 0.3)

# ---------------------------------------------------------------- final cinematic bass impact
n = int(0.6 * SR); x = tx(n)
add(np.sin(2 * np.pi * np.cumsum(28 + 90 * np.exp(-x * 9)) / SR) * np.exp(-x / 0.35) + filt(noise(n), 30, 400) * np.exp(-x / 0.12) * 0.5, 14.42, 0.95)
add(metal([96, 143.5, 211], 0.6, 0.3), 14.42, 0.25)

# ---------------------------------------------------------------- reverb + master
def reverb(x, seconds=2.6, seed=1):
    r = np.random.default_rng(seed); n = int(seconds * SR); tt = tx(n)
    ir = filt(r.standard_normal(n) * np.exp(-tt / (seconds / 6.9)), 60, 6000); ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    F = 1 << (len(x) + n - 1).bit_length(); y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[: len(x)]
    return y / (np.abs(ir).sum() ** 0.5 * 4)
mix = np.stack([L + 0.5 * reverb(L, seed=1), R + 0.5 * reverb(R, seed=2)], 1)
mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.8) / np.tanh(1.8)
f = int(0.02 * SR); mix[:f] *= np.linspace(0, 1, f)[:, None]; f = int(0.25 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None] ** 1.5
mix *= 0.93
pcm = (np.clip(mix, -1, 1) * (2 ** 23 - 1)).astype(np.int32)
with wave.open(sys.argv[1], "wb") as wf:
    wf.setnchannels(2); wf.setsampwidth(3); wf.setframerate(SR); wf.writeframes(np.frombuffer(pcm.astype("<i4").tobytes(), np.uint8).reshape(-1, 4)[:, :3].tobytes())
print("wrote", sys.argv[1], f"{N / SR:.3f}s")
