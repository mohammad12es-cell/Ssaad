#!/usr/bin/env python3
"""THE LAST HUMAN — EP01 v2 "STRINGS" — sound design. All synthesized (numpy only).
Concept: the network has a heartbeat — a mechanical pulse locked to the crowd's footsteps.
Kael walks off the beat. In close-ups we hear HIS heartbeat: organic, irregular.
When the crowd freezes, the network pulse stops dead.

usage: python3 audio/build_audio_v2.py [--voice audio/voice/eve_line.wav] [--voice-at 26.0] [--out build/audio_v2]
"""
import argparse, os, wave
import numpy as np

ap = argparse.ArgumentParser()
here = os.path.dirname(os.path.abspath(__file__))
ap.add_argument("--voice", default=os.path.join(here, "voice", "eve_line.wav"))
ap.add_argument("--voice-at", type=float, default=26.0)
ap.add_argument("--voice-raw", action="store_true")
ap.add_argument("--out", default=os.path.join(here, "..", "build", "audio_v2"))
args = ap.parse_args()

SR = 48000; DUR = 30.0; N = int(SR * DUR)
rng = np.random.default_rng(2077)
t = np.arange(N) / SR

def fft_filter(x, lo=None, hi=None, order=2):
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * g, n)
def bandpass(x, fc, q=6):
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(X / (1 + (q * (f / fc - fc / np.maximum(f, 1e-3))) ** 2) ** 0.5, n)
def env_ad(n, a, d):
    x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def ramp(t0, t1, v0, v1): return np.interp(t, [t0, t1], [v0, v1], left=v0, right=v1)
def window(a, b, fi=0.05, fo=0.05): return np.clip((t - a) / fi, 0, 1) * np.clip((b - t) / fo, 0, 1)
def place(dst, sig, at, gain=1.0, pan=0.0):
    s = int(at * SR); e = min(N, s + len(sig))
    if e <= s or s >= N or s < 0: return
    seg = sig[: e - s] * gain
    dst[0, s:e] += seg * np.sqrt(0.5 * (1 - pan)); dst[1, s:e] += seg * np.sqrt(0.5 * (1 + pan))
def stereo(m, pan=0.0): return np.stack([m * np.sqrt(0.5 * (1 - pan)), m * np.sqrt(0.5 * (1 + pan))])
def noise(n): return rng.standard_normal(n)
def brown(n):
    b = np.cumsum(noise(n)); b -= fft_filter(b, hi=2); return b / (np.abs(b).max() + 1e-9)
def reverb(x, secs=2.2, wet=0.3, hi=6000, seed=3):
    r = np.random.default_rng(seed); L = int(secs * SR)
    ir = r.standard_normal(L) * np.exp(-np.arange(L) / SR * (6.9 / secs)); ir = fft_filter(ir, hi=hi); ir[:int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)); n = len(x) + L
    return x * (1 - wet) + np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)] * wet
def saw(f, n, ph=0.0): x = (np.arange(n) / SR * f + ph) % 1.0; return 2 * x - 1
def sweep(f0, f1, dur, geo=True):
    n = int(dur * SR); f = np.geomspace(f0, f1, n) if geo else np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(f) / SR)
def norm(x, peak=1.0): return x / (np.abs(x).max() + 1e-9) * peak
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def kick(f0=48, f1=140, dur=0.45, dec=8):
    n = int(dur * SR); x = np.arange(n) / SR; return np.sin(2 * np.pi * np.cumsum(f0 + f1 * np.exp(-x * 35)) / SR) * np.exp(-x * dec)

music = np.zeros((2, N)); amb = np.zeros((2, N)); sfx = np.zeros((2, N)); vox = np.zeros((2, N))
CROWD_STOP = 19.25; HEADS = 19.85; DETECT = 16.2; CUT = 28.0

# ================= THE NETWORK PULSE (machine heartbeat, locked to the crowd's steps: 1.8 Hz) =================
beat = 1 / 1.8
for k in range(80):
    at = 0.8 + k * beat
    if at >= CROWD_STOP: break
    if abs(at - 11.3) < beat * 0.6: continue           # the network skips a beat when the count is off by one
    g = 0.55 if at < 3 else 0.45
    place(music, kick(44, 90, 0.35, 11) * 0.8, at, g)
    n = int(0.06 * SR); place(music, bandpass(noise(n), 6500, 4) * env_ad(n, 0.001, 0.015), at, 0.25, 0.3)   # glassy tick
    n = int(0.12 * SR); place(music, np.sin(2 * np.pi * 1318.5 * np.arange(n) / SR) * env_ad(n, 0.002, 0.04), at + beat / 2, 0.035, -0.3)

# ================= SCORE =================
sub = np.sin(2 * np.pi * 36.7 * t) * 0.6 + np.sin(2 * np.pi * 73.4 * t) * 0.2
sub *= (0.35 + 0.65 * ramp(12, 26, 0, 1)) * (1 - 0.7 * window(19.3, 21.4, 0.05, 0.6)) * window(0, CUT, 0.3, 0.01)
music += stereo(sub * 0.45)
# "choir of minds": formant-filtered saw chords, swelling in the aerial reveal
def choir(notes, a, b, vowel=(730, 1090, 2440), g=1.0):
    n = int((b - a) * SR); out = np.zeros(n)
    for m in notes:
        for d in (-0.08, 0.0, 0.09):
            out += saw(mtof(m) * 2 ** (d / 12), n, rng.random()) * (1 + 0.15 * np.sin(2 * np.pi * 5.1 * np.arange(n) / SR + rng.random() * 6))
    v = sum(bandpass(out, f, 5) * w for f, w in zip(vowel, (1.0, 0.6, 0.25)))
    fade = np.minimum(1, np.minimum(np.arange(n), n - np.arange(n)) / (0.8 * SR))
    return v * fade * g
ch = choir([50, 57, 62, 65, 69], 1.0, 8.2, g=1.0) + 0
place(music, ch, 1.0, 0.06, -0.35); place(music, choir([50, 57, 62, 65, 69], 1.0, 8.2), 1.0, 0.06, 0.35)
place(music, choir([46, 53, 58, 62, 65], 7.6, 12.6, (500, 900, 2400)), 7.6, 0.05, 0.0)
place(music, choir([46, 53, 58, 61, 64], 11.2, 12.8, (500, 900, 2400)), 11.2, 0.035, 0.2)            # dissonance at the miscount
place(music, choir([43, 50, 55, 58, 63], 12.4, 19.3, (400, 800, 2300)), 12.4, 0.055, 0.0)
place(music, choir([45, 52, 57, 58, 64], 21.4, 26.0, (350, 700, 2200)), 21.4, 0.06, 0.0)
for c in range(2): music[c] = reverb(music[c], 3.2, 0.35, 5000, 40 + c)
# tension ostinato after detection (16ths, opening filter)
step = 60 / 108 / 4; ost = np.zeros(N); seq = [50, 62, 57, 62, 53, 62, 58, 65]; k = 0; tt = 21.5
while tt < 25.9:
    n = int(step * SR * 0.9); x = saw(mtof(seq[k % 8] + (12 if tt > 24 and k % 4 == 3 else 0)), n) * env_ad(n, 0.002, 0.07)
    s = int(tt * SR); ost[s:s + n] += x[: N - s]; k += 1; tt += step
mk = np.clip((t - 21.5) / 4.4, 0, 1)
ost = (fft_filter(ost, hi=600) * (1 - mk) + fft_filter(ost, hi=3500) * mk) * window(21.5, 25.95, 0.6, 0.03)
music += stereo(ost * 0.32, 0.12)
n = int(3.4 * SR); x = np.arange(n) / SR
place(music, fft_filter(noise(n), lo=800, hi=9000) * (x / x[-1]) ** 2 * 0.22 + sweep(110, 880, 3.4) * (x / x[-1]) ** 3 * 0.1, 22.5)
music *= np.clip(1 - 0.85 * window(25.6, CUT, 0.1, 0.02), 0, 1)

# ================= KAEL'S HEART (organic, irregular) =================
for at in list(np.arange(17.0, 19.0, 0.86)) + list(np.arange(23.5, 25.5, 0.62)):
    at += rng.uniform(-0.03, 0.03)
    place(sfx, kick(38, 40, 0.3, 14), at, 0.5); place(sfx, kick(34, 30, 0.3, 16), at + 0.17, 0.3)

# ================= AMBIENCE =================
rain = fft_filter(noise(N), lo=500, hi=9000) * 0.18 + fft_filter(noise(N), lo=2500, hi=12000) * 0.07
drops = np.zeros(N); idx = rng.integers(0, N, 9000); drops[idx] = rng.uniform(-1, 1, len(idx)); drops = fft_filter(drops, lo=1500, hi=8000) * 0.6
rg = 0.4 * (1 - 0.45 * window(3.2, 7.4, 0.5, 0.5)) * (1 - 0.6 * window(14.5, 17.0, 0.02, 0.02)) * (1 - 0.5 * window(25.6, CUT, 0.1, 0.05)) * window(0, CUT, 0.01, 0.01)
amb += np.stack([rain + drops, np.roll(rain, 1234) + np.roll(drops, 777)]) * rg
wind = fft_filter(brown(N), lo=80, hi=700) * window(3.0, 7.6, 0.8, 0.3) * 0.5     # altitude wind in the rise
amb += stereo(wind)
hum = fft_filter(brown(N), hi=180) * 0.6
amb += stereo(hum * (0.18 + 0.4 * window(7.5, CROWD_STOP, 0.3, 0.15)) * window(0, CUT, 0.01, 0.01))
# sensor POV: the world heard through a machine (band-limited hiss + carrier)
sens = bandpass(noise(N), 2200, 2) * 0.12 + np.sin(2 * np.pi * 7800 * t) * 0.01
amb += stereo(sens * window(14.5, 17.0, 0.01, 0.01))

# ================= SFX =================
n = int(4.0 * SR); x = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-x * 6)) / SR) * np.exp(-x * 1.1) + fft_filter(noise(n), hi=200) * np.exp(-x * 2.5) * 0.6, 0.0, 0.85)
n = int(1.6 * SR); x = np.arange(n) / SR                                   # implant electrical hum
place(sfx, (np.sign(np.sin(2 * np.pi * 60 * x)) * 0.3 + np.sin(2 * np.pi * 120 * x)) * np.exp(-x * 1.5) * 0.4, 0.0, 0.25, -0.2)
zing = sweep(300, 5200, 1.0) * np.linspace(1, 0, int(1.0 * SR)) ** 1.5      # the thread shoots up
place(sfx, fft_filter(zing, hi=9000), 0.12, 0.18, 0.1)
place(sfx, fft_filter(noise(int(1.0 * SR)), lo=2000, hi=12000) * np.linspace(1, 0, int(1.0 * SR)) ** 2, 0.12, 0.12)
for k in range(28):                                                         # counter ticks
    at = 4.3 + k * 0.105; nn = int(0.015 * SR); place(sfx, bandpass(noise(nn), 4000, 3) * env_ad(nn, 0.0005, 0.004), at, 0.08, 0.2)
# crowd steps (on the network beat) vs Kael's (off the beat)
def step_sound(g=1.0, wet=1.0):
    nn = int(0.16 * SR); xx = np.arange(nn) / SR
    return (np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-xx * 60)) / SR) * np.exp(-xx * 40) * 0.7 + fft_filter(noise(nn), lo=1200, hi=7000) * np.exp(-xx * 30) * 0.5 * wet) * g
for k in range(80):
    at = 0.8 + k * beat
    if at < 7.5: continue
    if at >= CROWD_STOP: break
    if 14.5 < at < 17.0: continue
    place(sfx, step_sound(0.9, 0.7), at, 0.24, -0.15); place(sfx, step_sound(0.6, 0.5), at + 0.007, 0.14, 0.6)
for i in range(60):
    at = (np.pi * (i + 1) - 1.9) / (2 * np.pi * 0.82)
    if at < 7.5: continue
    if at > 17.8: break
    if 14.5 < at < 17.0: continue
    place(sfx, step_sound(), at, 0.34, 0.05)
# counter miscount glitch
n = int(0.5 * SR); xx = np.arange(n) / SR
place(sfx, np.sign(np.sin(2 * np.pi * 220 * xx * (1 + (np.floor(xx * 30) % 3)))) * (np.floor(xx * 24) % 2) * np.exp(-xx * 4), 11.15, 0.12)
place(sfx, sweep(1400, 1320, 1.2) * np.exp(-np.arange(int(1.2 * SR)) / SR * 2), 11.2, 0.06, 0.4)
# drone descent through the strings
hn = int((26.8 - 12.4) * SR); x = np.arange(hn) / SR
hov = sum(np.sin(2 * np.pi * f * x + 0.5 * np.sin(2 * np.pi * 7.3 * x)) * a for f, a in [(122, 0.5), (244, 0.25), (366, 0.12), (980, 0.05)]) + fft_filter(noise(hn), lo=1800, hi=6000) * 0.15
hov *= np.minimum(1, x / 1.2) * (1 - 0.6 * ((x > 14.5 - 12.4) & (x < 17.0 - 12.4)))
fz = (x > DETECT - 12.4) & (x < 16.9 - 12.4); hov[fz] *= 0.35
place(sfx, hov, 12.4, 0.22, 0.35)
n = int(1.8 * SR); xx = np.arange(n) / SR
place(sfx, fft_filter(noise(n), lo=150, hi=2500) * np.sin(np.pi * xx / xx[-1]) ** 2, 12.5, 0.35, 0.3)
# sensor: lock ticks on citizens, then hunting stutter, then detection hit
for at in (14.75, 15.05, 15.3):
    nn = int(0.09 * SR); place(sfx, np.sin(2 * np.pi * 2093 * np.arange(nn) / SR) * env_ad(nn, 0.001, 0.03), at, 0.14, 0.2)
    place(sfx, np.sin(2 * np.pi * 2637 * np.arange(nn) / SR) * env_ad(nn, 0.001, 0.03), at + 0.06, 0.1, 0.2)
n = int((DETECT - 15.55) * SR); xx = np.arange(n) / SR
place(sfx, np.sign(np.sin(2 * np.pi * (900 + 600 * np.floor(xx * 40 % 5)) * xx)) * (np.floor(xx * 33) % 2) * 0.5, 15.55, 0.07, 0.1)
n = int(1.2 * SR); xx = np.arange(n) / SR
hit = kick(40, 120, 1.2, 3) + np.sign(np.sin(2 * np.pi * 110 * xx)) * np.exp(-xx * 3) * 0.4 + fft_filter(noise(n), lo=1500) * np.exp(-xx * 8) * 0.6
place(sfx, hit, DETECT, 0.55)
for k in range(4):
    n = int(0.55 * SR); xx = np.arange(n) / SR
    place(sfx, fft_filter((np.sin(2 * np.pi * 220 * xx) + 0.4 * np.sin(2 * np.pi * 330 * xx)) * env_ad(n, 0.02, 0.3), hi=1500), 16.5 + k * 0.7, 0.1 * (1 - k * 0.15))
# THE RED WAVE: E.V.E.'s attention falls down every string
n = int(1.6 * SR); xx = np.arange(n) / SR
place(sfx, sweep(3000, 60, 1.6) * np.exp(-xx * 1.2) * 0.5 + fft_filter(noise(n), lo=200, hi=5000) * np.exp(-xx * 2) * 0.4, 19.0, 0.45)
place(sfx, kick(30, 60, 2.0, 1.5), 19.6, 0.6)
# all heads turn at once: a wide, dry, synchronized rustle
n = int(0.7 * SR); xx = np.arange(n) / SR
rus = fft_filter(noise(n), lo=600, hi=5000) * np.sin(np.pi * xx / xx[-1]) ** 2
place(sfx, rus, HEADS, 0.22, -0.8); place(sfx, np.roll(rus, 400), HEADS + 0.01, 0.22, 0.8)
# hologram + sparse alarm
n = int(0.5 * SR); place(sfx, sweep(300, 2400, 0.5) * env_ad(n, 0.005, 0.25) * 0.5 + fft_filter(noise(n), lo=3000) * env_ad(n, 0.002, 0.05), 21.5, 0.25)
for k in range(8):
    n = int(0.24 * SR); xx = np.arange(n) / SR
    place(sfx, fft_filter(np.sign(np.sin(2 * np.pi * 880 * xx)) * 0.3 + np.sin(2 * np.pi * 440 * xx), hi=3000) * env_ad(n, 0.004, 0.1), 21.7 + k * 0.48, 0.07, -0.25)
n = int(1.6 * SR); xx = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * 49 * xx) * np.sin(np.pi * xx / xx[-1]) ** 2, 23.7, 0.32)
# E.V.E.'s eye + the spire
place(sfx, sweep(1900, 2300, 1.3, False) * np.linspace(0, 1, int(1.3 * SR)) * 0.25, 25.5, 0.1)
n = int(1.3 * SR); xx = np.arange(n) / SR
spire = sum(np.sin(2 * np.pi * f * xx) * a for f, a in [(41.2, 1.0), (82.4, 0.5), (123.5, 0.25), (164.8, 0.12)]) * np.minimum(1, xx / 0.2)
place(sfx, spire, 26.8, 0.4)
for at in (25.8, 26.45, 26.9, 27.35, 27.7, 27.88):
    n = int(0.09 * SR); xx = np.arange(n) / SR
    place(sfx, np.sign(np.sin(2 * np.pi * rng.uniform(100, 600) * xx)) * (np.floor(xx * 90) % 2) + fft_filter(noise(n), lo=3000) * 0.5, at, 0.11, rng.uniform(-0.5, 0.5))
# CUT TO BLACK
n = int(2.0 * SR); xx = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(28 + 90 * np.exp(-xx * 9)) / SR) * np.exp(-xx * 1.0) + fft_filter(noise(n), hi=400) * np.exp(-xx * 4) * 0.8 + fft_filter(noise(n), lo=2000) * np.exp(-xx * 30) * 0.4, CUT, 1.0)
n = int(1.8 * SR); xx = np.arange(n) / SR
place(sfx, sum(np.sin(2 * np.pi * f * xx) for f in (587.3, 880, 1174.7)) * np.exp(-xx * 1.6) * np.minimum(1, xx / 0.05) * 0.15, 28.2, 0.5)
# "1 UNACCOUNTED": one last network tick that glitches
place(sfx, kick(44, 90, 0.35, 11) * 0.8, 29.0, 0.35)
n = int(0.18 * SR); xx = np.arange(n) / SR
place(sfx, np.sign(np.sin(2 * np.pi * 1318.5 * xx * (1 + 0.5 * (np.floor(xx * 60) % 2)))) * np.exp(-xx * 12), 29.02, 0.07)

# ================= VOICE =================
def read_wav(p):
    w = wave.open(p); sr = w.getframerate(); chn = w.getnchannels(); sw = w.getsampwidth()
    raw = np.frombuffer(w.readframes(w.getnframes()), {2: np.int16, 4: np.int32}[sw]).astype(np.float64) / {2: 32768.0, 4: 2147483648.0}[sw]
    if chn > 1: raw = raw.reshape(-1, chn).mean(1)
    if sr != SR: raw = np.interp(np.arange(int(len(raw) * SR / sr)) / SR, np.arange(len(raw)) / sr, raw)
    return raw
voice_ok = os.path.exists(args.voice)
if voice_ok:
    v = norm(read_wav(args.voice), 0.9)
    if not args.voice_raw:
        v = fft_filter(v, lo=140, hi=7500); n = len(v); xx = np.arange(n) / SR
        dbl = np.concatenate([np.zeros(int(0.011 * SR)), np.interp(np.arange(n) * 1.006, np.arange(n), v, right=0)])[:n]
        v = v * 0.85 + v * np.sin(2 * np.pi * 38 * xx) * 0.12 + dbl * 0.3
        st = int(1.05 * SR)
        if st + 1200 < n: v[st:st + 1200] = v[st - 1200:st] * 0.7
        v = reverb(np.concatenate([v, np.zeros(int(2.5 * SR))]), 2.6, 0.32, 5000, 11)
    place(vox, v, args.voice_at, 1.15)
    vox[:, int(CUT * SR):] *= np.linspace(1, 0, N - int(CUT * SR)) ** 4

# ================= MIX =================
for c in range(2): music[c] = fft_filter(music[c], lo=25); sfx[c] = fft_filter(sfx[c], lo=22)
duck = 1 - 0.55 * window(args.voice_at - 0.1, args.voice_at + 1.6, 0.1, 0.2)
mix = (music * 0.8 + amb * 0.7 + sfx) * duck + vox
mix = np.stack([reverb(mix[0], 1.2, 0.08, 7000, 21), reverb(mix[1], 1.2, 0.08, 7000, 22)])
mix = np.tanh(mix / np.abs(mix).max() * 3.4) * 0.74
mix[:, -int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
os.makedirs(args.out, exist_ok=True)
def write(p, x):
    x = np.clip(x, -1, 1); w = wave.open(p, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x.T * 32767).astype("<i2").tobytes()); w.close()
write(os.path.join(args.out, "mix.wav"), mix)
for name, s in [("music", music), ("ambience", amb), ("sfx", sfx), ("voice", vox)]:
    write(os.path.join(args.out, f"stem_{name}.wav"), norm(s, 0.9) if np.abs(s).max() > 0 else s)
print(f"v2 mix.wav {N / SR:.3f}s; voice {'yes' if voice_ok else 'MISSING'} at {args.voice_at}s")
