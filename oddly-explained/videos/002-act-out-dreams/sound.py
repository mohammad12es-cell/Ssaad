#!/usr/bin/env python3
"""VIDEO 002 score + sound design (fully synthesized). usage: sound.py OUT_DIR
Cue times mirror scene.js (gates, saccades, breathing, RBD punches)."""
import os, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'engine'))
from synth import *  # noqa

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
D = 30.0
M = Bus(D, seed=5); X = Bus(D, seed=9)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
h1 = lambda x: (np.sin(x * 127.1) * 43758.5453) % 1.0  # same hash as scene.js

def braam(dur, notes, hi0=200, hi1=2400, g=1.0):
    """Cinematic brass-like swell: detuned saws whose filter opens over time (block-wise)."""
    n = int(dur * SR); outp = np.zeros((n, 2)); B = 12; L = n // B + 1
    raw = pad([hz(m) for m in notes], dur, a=0.02, r=dur * 0.6, voices=5, spread=0.009, kind='saw', hi=20000, bus=M)
    for b in range(B):
        s, e = b * L, min(n, (b + 1) * L + 2048)
        fc = hi0 * (hi1 / hi0) ** (b / (B - 1)) if b < B * 0.4 else hi1 * (hi0 / hi1) ** ((b - B * 0.4) / (B * 0.6))
        seg = fft_filter(raw[s:e], hi=fc, slope=2); w = np.ones(e - s); fade = min(1024, e - s)
        if b > 0: w[:fade] = np.linspace(0, 1, fade)
        if e < n: w[-fade:] = np.linspace(1, 0, fade)
        outp[s:e] += seg * w[:, None]
    return outp * g

def step(g=1.0):  # muffled footstep
    th = sine_sweep(95, 45, 0.18) * env_ad(0.18, 0.002, 0.05)
    cl = fft_filter(noise(X, 0.05), lo=300, hi=1800) * env_ad(0.05, 0.001, 0.012)
    s = th.copy(); s[: len(cl)] += cl * 0.5; return s * g

# ---------------- HOOK: dream running ------------------------------------------------------------
M.add(braam(4.2, [33, 45, 52, 57], 150, 1800), 0.0, 0.5)
X.add(impact(X, 3.0, f0=68, f1=30, body=1.1, air=0.6), 0.0, 0.85)
for i, tt in enumerate(np.arange(0.12, 2.32, 60 / 168)):           # running footsteps (stop dead at 2.3)
    X.add(fft_filter(step(), hi=700), tt, 0.55 + 0.1 * (i % 2), pan=0.25 if i % 2 else -0.25)
M.add(fft_filter(noise(M, 2.3, 'pink'), lo=2000, hi=9000) * env_adsr(2.3, 0.3, 0.05), 0.05, 0.06)  # wind of running
# "YOUR BODY ISN'T." — the dream sound is sucked away, a dry low hit, silence-ish
X.add(swept_noise(X, 0.5, 6000, 200)[::-1] * np.linspace(0, 1, int(0.5 * SR)) ** 2, 1.82, 0.35)
X.add(impact(X, 2.2, f0=55, f1=28, body=1.3, air=0.2), 2.32, 0.9)
M.add(pad([hz(m) for m in [45, 52, 57, 60]], 2.6, a=0.6, r=1.0, voices=3, spread=0.004, kind='tri', hi=900, bus=M), 2.4, 0.35)
# push into the head
X.add(swept_noise(X, 1.6, 250, 7000) * np.linspace(0, 1, int(1.6 * SR)) ** 2.2, 3.7, 0.4)
X.add(impact(X, 2.0, f0=80, f1=36, body=0.6, air=0.9), 5.3, 0.55)

# ---------------- BRAINSTEM: commands tick, then the gate powers up ---------------------------
drone = pad([hz(m) for m in [33, 40, 45, 48]], 6.4, a=1.0, r=1.2, voices=3, spread=0.004, kind='saw', hi=520, bus=M); M.add(drone, 4.6, 0.45)
for k in range(6):  # amber motor-command pulses (~1.1 s apart, like the nerve pulses)
    tt = 5.2 + k * 1.11
    M.add(fft_filter(fm_bell(hz(64 if k % 2 else 67), 0.5, idx=1.0, ratio=2.0, d=0.12), hi=3000), tt, 0.09 * (1 - 0.5 * (tt > 7.4)), pan=0.3)
X.add(sine_sweep(120, 1400, 1.0) * env_adsr(1.0, 0.8, 0.2) * 0.35 + swept_noise(X, 1.0, 400, 8000) * np.linspace(0, 1, int(SR)) ** 2 * 0.3, 6.4, 0.5)
X.add(impact(X, 2.8, f0=60, f1=32, body=0.8, air=1.3), 7.38, 0.7)               # gate switches on
for m, g in [(69, 0.05), (76, 0.045), (81, 0.04), (88, 0.03)]: M.add(fm_bell(hz(m), 3.5, idx=0.8, ratio=3.0, d=1.6), 7.38, g)
hum_t = tvec(3.2); hum = (np.sin(2 * np.pi * 220 * hum_t) + 0.5 * np.sin(2 * np.pi * 330.5 * hum_t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.55 * hum_t)) * env_adsr(3.2, 0.6, 1.0)
M.add(fft_filter(hum, hi=1200), 7.4, 0.06)                                         # gate hum (cyan)

# ---------------- ATONIA: limbs power down ---------------------------------------------------------
M.add(pad([hz(m) for m in [40, 47, 52, 55, 59]], 6.2, a=1.5, r=1.6, voices=3, spread=0.006, kind='tri', hi=1600, bus=M), 10.3, 0.5)
X.add(impact(X, 2.0, f0=70, f1=34, body=0.4, air=0.5), 11.85, 0.4)
for t0, dur, pan in [(11.0, 1.6, -0.4), (12.0, 1.8, 0.4), (12.8, 1.6, 0.0)]:     # arms, legs, trunk switch off
    sw = sine_sweep(880, 110, dur) * env_adsr(dur, 0.05, 0.6) * 0.25 + swept_noise(X, dur, 5000, 300) * env_adsr(dur, 0.1, 0.6) * 0.25
    X.add(fft_filter(sw, hi=6000), t0, 0.45, pan)
for m in [76, 71, 67, 64, 59]: M.add(fm_bell(hz(m), 1.4, idx=0.9, ratio=2.0, d=0.6), 11.0 + (76 - m) * 0.18, 0.035)

# ---------------- EXCEPTIONS: eye ticks + breathing ------------------------------------------------
M.add(pad([hz(m) for m in [45, 52, 57, 59, 64]], 5.8, a=1.0, r=1.4, voices=3, spread=0.007, kind='tri', hi=2400, bus=M), 16.1, 0.42)
for n in range(int(16.2 * 2.6), int(19.6 * 2.6) + 1):                              # saccade jumps (scene.js: holds + quick jumps)
    tt = n / 2.6
    if 16.2 <= tt <= 19.6:
        tk = fft_filter(noise(X, 0.03), lo=2500, hi=9000) * env_ad(0.03, 0.0005, 0.006)
        X.add(tk + 0.4 * np.sin(2 * np.pi * 2400 * tvec(0.03)) * env_ad(0.03, 0.0005, 0.008), tt, 0.18, pan=(h1(n + 1) * 2 - 1) * 0.6)
br_t = tvec(5.4) + 17.4; br = 0.5 + 0.5 * np.sin(br_t * 2 * np.pi / 4.2 - np.pi / 2)
air = fft_filter(noise(X, 5.4, 'pink'), lo=250, hi=2600) * np.abs(np.gradient(br)) * SR * 0.9
X.add(air * env_adsr(5.4, 0.6, 0.6), 17.4, 0.35)                                    # breathing (diaphragm keeps working)
X.add(sine_sweep(55, 50, 5.4) * (0.4 + 0.6 * br) * env_adsr(5.4, 0.5, 0.6), 17.4, 0.12)

# ---------------- RBD: the switch fails -------------------------------------------------------------
M.add(braam(4.4, [34, 41, 46, 49], 150, 1400), 22.0, 0.45)
for k in range(int(22.3 * 14), int(26.1 * 14)):                                    # glitch stutters synced to the gate flicker
    tt = k / 14
    if h1(k) > 0.35:
        gl = fft_filter(noise(X, 1 / 14), lo=800, hi=7000) * env_ad(1 / 14, 0.001, 0.02) * (0.5 + 0.5 * h1(k + 3))
        X.add(gl, tt, 0.16, pan=(h1(k + 7) * 2 - 1) * 0.7)
for tt in [22.70, 23.91, 25.12]:                                                    # arm strikes (punch peaks)
    X.add(impact(X, 1.2, f0=110, f1=45, body=0.9, air=0.4), tt - 0.05, 0.6)
    X.add(swept_noise(X, 0.25, 600, 5000) * env_ad(0.25, 0.01, 0.08), tt - 0.2, 0.25)
X.add(swept_noise(X, 0.8, 300, 7000) * np.linspace(0, 1, int(0.8 * SR)) ** 2, 25.6, 0.3)

# ---------------- RESOLVE ----------------------------------------------------------------------------
M.add(pad([hz(m) for m in [41, 48, 53, 57, 64, 67]], 3.6, a=0.4, r=1.6, voices=3, spread=0.006, kind='saw', hi=2000, bus=M), 26.4, 0.45)
for i, tt in enumerate(np.arange(26.9, 28.3, 60 / 168)):                             # the dream runs on, softly
    X.add(fft_filter(step(), hi=600), tt, 0.22, pan=0.25 if i % 2 else -0.25)
X.add(impact(X, 3.0, f0=72, f1=27, body=1.2, air=1.3), 28.42, 0.95)                 # end card
for m, g in [(53, 0.07), (60, 0.06), (65, 0.06), (69, 0.05), (77, 0.04)]: M.add(fm_bell(hz(m), 2.6, idx=1.0, ratio=2.0, d=1.4), 28.42, g)

# ---------------- space + stems ------------------------------------------------------------------------
irL = reverb_ir(M, 3.8, decay=3.4, bright=6000); irS = reverb_ir(X, 2.0, decay=1.4, bright=7500)
music = M.x + 0.45 * convolve(M.x, irL); sfx = X.x + 0.24 * convolve(X.x, irS)
music = fft_filter(music, lo=38); sfx = fft_filter(sfx, lo=32)
fade = np.ones(len(music)); fl = int(0.4 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 2
music *= fade[:, None]; sfx *= fade[:, None]
score = music + sfx; g = 0.5 / np.max(np.abs(score))
for name, sig in [('music', music * g), ('sfx', sfx * g), ('score', score * g)]: sf.write(os.path.join(out, name + '.wav'), sig.astype(np.float32), SR)
print('wrote music/sfx/score ->', out)
