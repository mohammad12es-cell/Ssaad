#!/usr/bin/env python3
"""VIDEO 001 score + sound design (fully synthesized). usage: sound.py OUT_DIR
Writes OUT_DIR/music.wav, OUT_DIR/sfx.wav (stems) and OUT_DIR/score.wav (sum, pre-master).
Cues are locked to the visual timeline in scene.js."""
import os, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'engine'))
from synth import *  # noqa

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
D = 30.0
M = Bus(D, seed=11)   # music / ambience
X = Bus(D, seed=23)   # sound effects
hz = lambda m: 440 * 2 ** ((m - 69) / 12)  # MIDI -> Hz
Dm = [38, 45, 50, 53]  # D2 A2 D3 F3

# ---------------- underlying drone (whole piece, evolving filter) -------------------------
def drone(t0, t1, notes, hi, g, a=1.0, r=1.5):
    p = pad([hz(n) for n in notes], t1 - t0, a=a, r=r, voices=3, spread=0.004, kind='saw', hi=hi, bus=M)
    M.add(p, t0, g)
    sub = osc(hz(notes[0]) / 2, t1 - t0) * env_adsr(t1 - t0, a, r); M.add(sub, t0, g * 0.55)

drone(0.0, 4.4, Dm, 520, 0.55, a=0.08, r=0.6)           # hook
drone(4.0, 9.6, [38, 45, 52, 57], 900, 0.42, a=0.8)       # dive: open fifth/sus, cooler, brighter
drone(9.0, 15.6, [33, 45, 50, 52], 380, 0.5, a=1.0)       # NREM: deep, dark
drone(25.9, 30.0, [38, 45, 53, 64, 69], 1400, 0.42, a=0.05, r=1.6)  # reveal: D minor add9

# ---------------- 0.0 HOOK -----------------------------------------------------------------
X.add(impact(X, 3.5, f0=70, f1=28, body=1.2, air=0.8), 0.0, 1.0)                 # deep cinematic impact
c = crackle(X, 3.3, density=55) * np.linspace(0.3, 1.0, int(3.3 * SR)); X.add(c, 0.2, 0.22, pan=-0.2)
c2 = crackle(X, 2.0, density=35); X.add(c2, 1.4, 0.18, pan=0.4)
zap = sine_sweep(220, 2600, 1.3) * env_ad(1.3, 0.02, 0.5) * 0.35 + swept_noise(X, 1.3, 500, 7000) * env_ad(1.3, 0.05, 0.5) * 0.4
X.add(fft_filter(zap, lo=150), 1.55, 0.5, pan=0.3)                                 # pulse sweeping across network
X.add(fft_filter(noise(X, 0.25), lo=2500, hi=10000) * env_ad(0.25, 0.001, 0.04), 1.55, 0.3)
riser = swept_noise(X, 1.2, 250, 9000) * np.linspace(0, 1, int(1.2 * SR)) ** 2
X.add(riser, 2.88, 0.55); X.add(sine_sweep(110, 1100, 1.2) * np.linspace(0, 1, int(1.2 * SR)) ** 3, 2.88, 0.12)
# dive: whoomp + air
X.add(impact(X, 2.2, f0=90, f1=35, body=0.6, air=1.2), 4.04, 0.7)
X.add(swept_noise(X, 1.4, 6000, 300) * env_ad(1.4, 0.005, 0.45), 4.04, 0.45)

# ---------------- 4–9 DIVE: soft electronic pulses -----------------------------------------
notes = [62, 69, 65, 72, 74, 69, 67, 62, 74, 77, 72, 69]
step = 0.375
for i, tt in enumerate(np.arange(4.55, 9.0, step)):
    n = notes[i % len(notes)]; g = 0.16 * min(1, (tt - 4.4) / 1.0)
    pl = fft_filter(fm_bell(hz(n), 0.6, idx=1.4, ratio=2.0, d=0.16), hi=4200)
    pan = np.sin(i * 1.7) * 0.6
    M.add(pl, tt, g, pan); M.add(pl, tt + step * 2, g * 0.35, -pan); M.add(pl, tt + step * 4, g * 0.14, pan)  # ping-pong echo
X.add(fft_filter(noise(X, 5.0, 'pink'), lo=300, hi=2500) * env_adsr(5.0, 1.5, 2.0), 4.2, 0.05)  # atmospheric transition bed

# ---------------- 9–15 NREM: deep rhythmic pulses in time with the visual slow waves ---------
for tt in [9.54, 11.36, 13.18]:     # visual up-states (sync wave 0.55 Hz)
    th = sine_sweep(85, 42, 1.4) * env_ad(1.4, 0.01, 0.45)
    X.add(th, tt - 0.05, 0.75); X.add(fft_filter(noise(X, 1.6, 'pink'), hi=420) * env_adsr(1.6, 0.6, 0.9), tt - 0.4, 0.16)
swell = fft_filter(noise(M, 6.2, 'pink'), lo=80, hi=650)
swell *= (0.45 + 0.55 * np.sin(2 * np.pi * 0.55 * (tvec(6.2) + 9.0) - np.pi / 2) ** 2)[:, None] if swell.ndim == 2 else (0.45 + 0.55 * np.sin(2 * np.pi * 0.55 * (tvec(6.2) + 9.0) - np.pi / 2) ** 2)
M.add(swell * env_adsr(6.2, 1.0, 1.2), 9.0, 0.09)
for tt in [11.35, 12.45]:          # sleep-spindle sonification (matches the trace): brief waxing/waning tremolo
    L = 0.75; t = tvec(L); s = np.sin(2 * np.pi * 1320 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * t)) * np.sin(np.pi * t / L) ** 2
    M.add(s, tt - L / 2, 0.035, 0.2)
X.add(sine_sweep(160, 60, 0.6) * env_ad(0.6, 0.005, 0.2), 11.85, 0.22)  # K-complex: soft low "bloop"

# ---------------- 15–21 REM: dreamlike ambience, soft rising texture ------------------------
Bb = [46, 50, 53, 57, 64]; Gm9 = [43, 50, 53, 57, 62]
M.add(pad([hz(n) for n in Bb], 3.6, a=1.2, r=1.4, voices=3, spread=0.008, kind='tri', hi=2600, bus=M), 14.9, 0.55)
M.add(pad([hz(n) for n in Gm9], 4.0, a=1.4, r=1.6, voices=3, spread=0.008, kind='tri', hi=3200, bus=M), 17.6, 0.55)
arp = [70, 74, 77, 81, 86, 81, 77, 74, 72, 76, 79, 84, 88, 84, 79, 76]
tt = 15.3; i = 0
while tt < 21.0:
    rate = 0.36 - 0.18 * (tt - 15.3) / 5.7
    b = fm_bell(hz(arp[i % len(arp)]), 1.6, idx=2.2, ratio=3.01, d=0.7)
    M.add(b, tt, 0.05 + 0.04 * (tt - 15.3) / 5.7, np.sin(i * 2.3) * 0.7); tt += rate; i += 1
M.add(swept_noise(M, 2.2, 400, 7000) * np.linspace(0, 1, int(2.2 * SR)) ** 2, 19.0, 0.12)  # rising shimmer
X.add(fft_filter(noise(X, 1.2), lo=1500, hi=9000) * env_adsr(1.2, 0.6, 0.6), 14.6, 0.06)  # transition breath

# ---------------- 21–26 MEMORY: warm build, subtle impact ----------------------------------
F9 = [41, 48, 57, 64, 67]
p = pad([hz(n) for n in F9], 5.1, a=2.5, r=0.6, voices=3, spread=0.006, kind='saw', hi=2200, bus=M)
p *= np.linspace(0.45, 1.0, len(p))[:, None]; M.add(p, 20.9, 0.6)
warm = [65, 69, 72, 76, 79, 76, 72, 69]
tt = 21.6; i = 0
while tt < 25.6:
    rate = 0.3 - 0.12 * (tt - 21.6) / 4.0
    M.add(fft_filter(fm_bell(hz(warm[i % len(warm)]), 1.0, idx=1.6, ratio=2.0, d=0.4), hi=5000), tt, 0.06 + 0.05 * (tt - 21.6) / 4, np.sin(i * 1.3) * 0.5); tt += rate; i += 1
X.add(impact(X, 2.0, f0=75, f1=40, body=0.5, air=0.6), 24.62, 0.45)                 # lattice locks into place
for n in [65, 72, 76, 81]: M.add(fm_bell(hz(n), 2.5, idx=1.2, ratio=2.0, d=1.2), 24.62, 0.05)
X.add(swept_noise(X, 0.7, 300, 8000) * np.linspace(0, 1, int(0.7 * SR)) ** 2, 25.3, 0.5)  # suck-out into the pull back
X.add(impact(X, 2.0, f0=80, f1=34, body=0.6, air=1.0), 25.95, 0.55)
X.add(swept_noise(X, 1.6, 7000, 250) * env_ad(1.6, 0.005, 0.5), 25.95, 0.4)

# ---------------- 26–30 REVEAL + final elegant impact ---------------------------------------
X.add(impact(X, 3.2, f0=72, f1=27, body=1.3, air=1.4), 28.32, 1.0)
for n, g in [(50, 0.08), (57, 0.07), (62, 0.07), (65, 0.06), (74, 0.045)]:
    M.add(fm_bell(hz(n), 3.0, idx=1.0, ratio=2.0, d=1.6), 28.32, g)
M.add(fft_filter(noise(M, 2.0), lo=5000, hi=14000) * env_ad(2.0, 0.01, 0.7), 28.32, 0.05)

# ---------------- space, stems, sum ---------------------------------------------------------
irL = reverb_ir(M, 3.6, decay=3.2, bright=5500); irS = reverb_ir(X, 2.2, decay=1.6, bright=7000)
music = M.x + 0.42 * convolve(M.x, irL); sfx = X.x + 0.22 * convolve(X.x, irS)
music = fft_filter(music, lo=38); sfx = fft_filter(sfx, lo=32)
fade = np.ones(len(music)); fl = int(0.35 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 2
music *= fade[:, None]; sfx *= fade[:, None]
score = music + sfx
pk = np.max(np.abs(score)); g = 0.5 / pk
for name, sig in [('music', music * g), ('sfx', sfx * g), ('score', score * g)]:
    sf.write(os.path.join(out, name + '.wav'), sig.astype(np.float32), SR)
print('score peak normalised; wrote music/sfx/score to', out)
