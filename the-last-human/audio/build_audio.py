#!/usr/bin/env python3
"""THE LAST HUMAN — EP01 sound design. Everything is synthesized here (original audio, no samples,
no copyrighted music). Only dependency: numpy.

usage: python3 audio/build_audio.py [--voice audio/voice/eve_line.wav] [--voice-at 26.35] [--out build/audio]

Writes stems (music, ambience, sfx, voice) and the final stereo mix (48 kHz, exactly 30.000 s).
To replace E.V.E.'s voice with a real recording, pass --voice path/to/take.wav (any sample rate, mono or
stereo); the processing chain (band-limit, doubler, subtle ring-mod, reverb) is applied automatically.
Use --voice-raw to bypass the processing if the take is already treated.
"""
import argparse, os, wave
import numpy as np

ap = argparse.ArgumentParser()
here = os.path.dirname(os.path.abspath(__file__))
ap.add_argument("--voice", default=os.path.join(here, "voice", "eve_line.wav"))
ap.add_argument("--voice-at", type=float, default=26.35)
ap.add_argument("--voice-raw", action="store_true")
ap.add_argument("--out", default=os.path.join(here, "..", "build", "audio"))
args = ap.parse_args()

SR = 48000; DUR = 30.0; N = int(SR * DUR)
rng = np.random.default_rng(1307)
t = np.arange(N) / SR

# ---------------- dsp helpers ----------------
def fft_filter(x, lo=None, hi=None, order=2):
    """zero-phase spectral band filter (smooth butterworth-like magnitude)"""
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * g, n)
def env_ad(n, a, d):
    x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def ramp(t0, t1, v0, v1):
    return np.interp(t, [t0, t1], [v0, v1], left=v0, right=v1)
def window(a, b, fi=0.05, fo=0.05):
    return np.clip((t - a) / fi, 0, 1) * np.clip((b - t) / fo, 0, 1)
def place(dst, sig, at, gain=1.0, pan=0.0):
    s = int(at * SR); e = min(N, s + len(sig))
    if e <= s or s >= N: return
    seg = sig[: e - s] * gain
    dst[0, s:e] += seg * np.sqrt(0.5 * (1 - pan)); dst[1, s:e] += seg * np.sqrt(0.5 * (1 + pan))
def stereo(m, pan=0.0):
    return np.stack([m * np.sqrt(0.5 * (1 - pan)), m * np.sqrt(0.5 * (1 + pan))])
def noise(n): return rng.standard_normal(n)
def brown(n):
    b = np.cumsum(noise(n)); b -= fft_filter(b, hi=2); return b / (np.abs(b).max() + 1e-9)
def reverb(x, secs=2.2, wet=0.3, hi=6000, seed=3):
    r = np.random.default_rng(seed); L = int(secs * SR)
    ir = r.standard_normal(L) * np.exp(-np.arange(L) / SR * (6.9 / secs)); ir = fft_filter(ir, hi=hi); ir[:int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    n = len(x) + L; y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    return x * (1 - wet) + y * wet
def saw(f, n, ph=0.0):
    x = (np.arange(n) / SR * f + ph) % 1.0; return 2 * x - 1
def norm(x, peak=1.0): return x / (np.abs(x).max() + 1e-9) * peak
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

music = np.zeros((2, N)); amb = np.zeros((2, N)); sfx = np.zeros((2, N)); vox = np.zeros((2, N))

# ================= MUSIC: dark atmospheric electronic score (D minor) =================
# sub-bass drone throughout, swelling with tension
sub = np.sin(2 * np.pi * 36.7 * t) * 0.6 + np.sin(2 * np.pi * 73.4 * t + 0.3 * np.sin(2 * np.pi * 0.2 * t)) * 0.25
sub *= (0.55 + 0.45 * ramp(14, 26, 0, 1)) * (1 - window(28.0, 30.5, 0.005, 0.1)) * window(0, 28.0, 0.01, 0.02)
music += stereo(sub * 0.5)
# pad chords: Dm9 -> Bbmaj7 -> Gm9 -> A7sus(b9) feel, detuned saw stacks, low-passed
chords = [(0, [50, 57, 62, 65, 69]), (8, [46, 53, 58, 62, 65]), (14, [43, 50, 55, 58, 62]), (20, [45, 52, 57, 58, 64])]
pad = np.zeros((2, N))
for ci, (start, notes) in enumerate(chords):
    end = chords[ci + 1][0] if ci + 1 < len(chords) else 28.0
    a, b = int(max(0, start - 0.6) * SR), int(min(28.0, end + 0.6) * SR); n = b - a
    seg = np.zeros((2, n))
    for k, m in enumerate(notes):
        for d, pan in [(-0.11, -0.7), (0.0, 0.0), (0.13, 0.7)]:
            seg += stereo(saw(mtof(m) * 2 ** (d / 12), n, rng.random()), pan) * 0.06
    fade = np.minimum(1, np.minimum(np.arange(n), n - np.arange(n)) / (0.6 * SR))
    seg *= fade
    pad[:, a:b] += seg
for ch in range(2): pad[ch] = fft_filter(pad[ch], hi=900, order=2)
pad *= (0.5 + 0.7 * ramp(3, 8, 0, 1)) * (1 - 0.6 * window(20.8, 26.0, 0.3, 0.2)) * window(0.0, 28.0, 0.8, 0.02)
pad = np.stack([reverb(pad[0], 3.0, 0.45, 4000, 5), reverb(pad[1], 3.0, 0.45, 4000, 6)])
music += pad * 0.9
# pulse ostinato: enters with the drone, rises in shot 5 (16ths, filter opens)
bpm = 100; step = 60 / bpm / 4
ost = np.zeros(N)
seq = [50, 62, 57, 62, 53, 62, 57, 65]
k = 0; tt = 14.0
while tt < 26.0:
    m = seq[k % len(seq)] + (12 if tt > 23 and k % 4 == 3 else 0)
    n = int(step * SR * 0.9); x = saw(mtof(m), n) * env_ad(n, 0.002, 0.07)
    s = int(tt * SR); ost[s:s + n] += x[: N - s]
    k += 1; tt += step
ost_lo = fft_filter(ost, hi=700); ost_hi = fft_filter(ost, hi=3500)
mixk = np.clip((t - 20.0) / 6.0, 0, 1)
ost = (ost_lo * (1 - mixk) + ost_hi * mixk) * ramp(14, 26, 0.15, 0.55) * window(14.0, 26.0, 1.0, 0.03)
music += stereo(ost * 0.5, 0.15) + stereo(np.roll(ost, int(0.3 * SR)) * 0.18, -0.4)
# heartbeat-like kick from detection to the reveal
for bt in np.arange(16.55, 26.0, 60 / 72):
    n = int(0.35 * SR); x = np.arange(n) / SR; f = 42 + 90 * np.exp(-x * 35)
    place(music, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9), bt, 0.55 * (0.6 + 0.4 * (bt - 16.5) / 9.5))
# rising riser into shot 6
n = int(3.6 * SR); x = np.arange(n) / SR
riser = fft_filter(noise(n), lo=800, hi=9000) * (x / x[-1]) ** 2 * 0.25 + np.sin(2 * np.pi * np.cumsum(np.geomspace(110, 880, n)) / SR) * (x / x[-1]) ** 3 * 0.12
place(music, riser, 22.4, 1.0)
# music drops away for E.V.E.
music *= np.clip(1 - 0.85 * window(26.0, 28.0, 0.08, 0.02), 0, 1)

# ================= AMBIENCE: rain, city, traffic =================
rain = fft_filter(noise(N), lo=500, hi=9000) * 0.18 + fft_filter(noise(N), lo=2500, hi=12000) * 0.08
drops = np.zeros(N); idx = rng.integers(0, N, 9000); drops[idx] = rng.uniform(-1, 1, len(idx))
drops = fft_filter(drops, lo=1500, hi=8000) * 0.6
rain_l = rain + drops; rain_r = np.roll(rain, 1234) + np.roll(drops, 777)
rgain = 0.35 + 0.25 * ramp(2.8, 3.4, 0, 1) - 0.1 * window(0, 3.0, 0.01, 0.2)
rgain = rgain * (1 - 0.5 * window(20.8, 26.0, 0.25, 0.2)) * (1 - 0.6 * window(26.0, 28.0, 0.1, 0.05)) * window(0, 28.0, 0.01, 0.01)
amb += np.stack([rain_l, rain_r]) * rgain
# city hum + distant traffic bed
hum = fft_filter(brown(N), hi=180) * 0.6 + np.sin(2 * np.pi * 55 * t) * 0.03 + np.sin(2 * np.pi * 110.4 * t) * 0.015
cgain = (0.15 + 0.5 * window(3.0, 20.8, 0.4, 0.4)) * window(0, 28.0, 0.01, 0.01)
amb += stereo(hum * cgain)
# distant engines / sirens-like synthetic tones (no real siren)
for at, f0, f1, d, pan, g in [(3.4, 180, 120, 2.5, -0.6, 0.12), (5.0, 220, 160, 2.2, 0.5, 0.12), (9.5, 150, 110, 3.0, 0.7, 0.07), (12.5, 200, 140, 2.0, -0.5, 0.06)]:
    n = int(d * SR); x = np.arange(n) / SR; f = np.geomspace(f0, f1, n)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    whoosh = fft_filter(noise(n), lo=300, hi=2500)
    shape = np.sin(np.pi * x / d) ** 2
    place(amb, (tone * 0.4 + whoosh * 0.6) * shape, at, g, pan)
# hero flyby whooshes near the camera in the aerial shot
for at, pan, g in [(4.0, -0.8, 0.5), (5.7, 0.7, 0.4), (7.0, 0.0, 0.45)]:
    n = int(1.3 * SR); x = np.arange(n) / SR
    w = fft_filter(noise(n), lo=200, hi=4000) * np.exp(-((x - 0.65) / 0.25) ** 2)
    eng = np.sin(2 * np.pi * np.cumsum(np.interp(x, [0, 0.65, 1.3], [260, 200, 140])) / SR) * np.exp(-((x - 0.65) / 0.3) ** 2)
    place(amb, w * 0.7 + eng * 0.3, at, g, pan)

# ================= SFX =================
# SHOT 1: deep cinematic hit on frame 0, low rumble, digital interference, scan sweep
n = int(4.0 * SR); x = np.arange(n) / SR
boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-x * 6)) / SR) * np.exp(-x * 1.1)
boom += fft_filter(noise(n), hi=200) * np.exp(-x * 2.5) * 0.6
place(sfx, boom, 0.0, 0.9)
rum = fft_filter(brown(int(3.2 * SR)), hi=90) * 1.2
place(sfx, rum * np.minimum(1, np.arange(len(rum)) / (0.2 * SR)), 0.0, 0.6)
for k in range(26):  # digital interference crackle
    at = rng.uniform(0.15, 2.9); n = int(rng.uniform(0.01, 0.05) * SR)
    c = np.sign(np.sin(2 * np.pi * rng.uniform(800, 4000) * np.arange(n) / SR)) * env_ad(n, 0.001, 0.02)
    place(sfx, c, at, 0.05, rng.uniform(-0.6, 0.6))
n = int(1.75 * SR); x = np.arange(n) / SR
scan = np.sin(2 * np.pi * np.cumsum(np.geomspace(2400, 600, n)) / SR) * 0.3 * (np.sin(2 * np.pi * 24 * x) > 0) * np.sin(np.pi * x / x[-1])
place(sfx, fft_filter(scan, hi=5000), 0.55, 0.22)
# reticle lock blips + dive whoosh into the city
for at in (1.5, 1.62, 1.74): place(sfx, np.sin(2 * np.pi * 1760 * np.arange(int(0.05 * SR)) / SR) * env_ad(int(0.05 * SR), 0.001, 0.02), at, 0.12)
n = int(0.6 * SR); x = np.arange(n) / SR
place(sfx, fft_filter(noise(n), lo=400, hi=8000) * (x / x[-1]) ** 2.5, 2.45, 0.45)
place(sfx, boom[: int(1.5 * SR)] * 0.6, 3.0, 0.5)

# SHOT 3: footsteps on wet pavement. Kael (0.82 Hz cycle => 1.64 steps/s) vs the synced crowd (1.8 steps/s)
def step_sound(g=1.0, wet=1.0):
    n = int(0.16 * SR); x = np.arange(n) / SR
    thud = np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-x * 60)) / SR) * np.exp(-x * 40)
    splash = fft_filter(noise(n), lo=1200, hi=7000) * np.exp(-x * 30) * wet
    return (thud * 0.7 + splash * 0.5) * g
k_phase0 = 1.9
for i in range(200):
    # Kael: phase(t) = 1.9 + 2π·0.82·t until he stops (~16.9 s); a step at every half cycle
    at = (np.pi * (i + 1) - k_phase0) / (2 * np.pi * 0.82)
    if at < 8.0: continue
    if at > 17.4: break
    place(sfx, step_sound(), at, 0.32 * (0.6 if at > 16.9 else 1), 0.05)
for i in range(200):
    at = i / 1.8
    if at < 8.0: continue
    if at > 20.9: break
    place(sfx, step_sound(0.9, 0.7), at, 0.22, -0.1)
    place(sfx, step_sound(0.6, 0.5), at + 0.008, 0.12, 0.6)
# all footsteps stop at once -> the silence

# SHOT 4: drone hover, servos, scanning pulses, detection glitch, warning tone
hover_n = int((26.0 - 13.9) * SR); x = np.arange(hover_n) / SR
hov = sum(np.sin(2 * np.pi * f * x + 0.5 * np.sin(2 * np.pi * 7.3 * x)) * a for f, a in [(122, 0.5), (244, 0.25), (366, 0.12), (980, 0.05)])
hov += fft_filter(noise(hover_n), lo=1800, hi=6000) * 0.15
hov *= np.minimum(1, x / 1.5) * (0.6 + 0.4 * np.clip((x - 0.0) / 2.0, 0, 1))
fz = (x > 16.55 - 13.9) & (x < 17.25 - 13.9); hov[fz] *= 0.35   # freeze dips the rotors
place(sfx, hov, 13.9, 0.22, 0.35)
for at in (14.2, 15.3): # servo chirps as it descends/aims
    n = int(0.25 * SR); xx = np.arange(n) / SR
    place(sfx, np.sin(2 * np.pi * np.cumsum(np.linspace(600, 1300, n)) / SR) * (np.sin(2 * np.pi * 60 * xx) > 0) * env_ad(n, 0.01, 0.12), at, 0.08, 0.4)
for at in np.arange(14.65, 16.5, 0.42): # cyan scanning pulses
    n = int(0.22 * SR); xx = np.arange(n) / SR
    place(sfx, np.sin(2 * np.pi * np.cumsum(np.geomspace(1400, 900, n)) / SR) * env_ad(n, 0.003, 0.08), at, 0.16, 0.3)
# detection: sudden digital glitch + low warning tone
n = int(0.75 * SR); xx = np.arange(n) / SR
gl = np.sign(np.sin(2 * np.pi * 180 * xx * (1 + 3 * (np.floor(xx * 40) % 3)))) * (np.floor(xx * 33) % 2) * np.exp(-xx * 2)
gl += fft_filter(noise(n), lo=2000) * (np.floor(xx * 25) % 2) * 0.5
place(sfx, gl, 16.55, 0.22)
for k2 in range(5):
    n = int(0.55 * SR); xx = np.arange(n) / SR
    w = (np.sin(2 * np.pi * 220 * xx) + 0.4 * np.sin(2 * np.pi * 330 * xx)) * env_ad(n, 0.02, 0.3)
    place(sfx, fft_filter(w, hi=1500), 16.7 + k2 * 0.7, 0.12 * (1 - k2 * 0.12))

# SHOT 5: hologram appears, alarm pulse, digital distortion, ads malfunction
n = int(0.5 * SR); xx = np.arange(n) / SR
place(sfx, np.sin(2 * np.pi * np.cumsum(np.geomspace(300, 2400, n)) / SR) * env_ad(n, 0.005, 0.25) * 0.5 + fft_filter(noise(n), lo=3000) * env_ad(n, 0.002, 0.05), 20.2, 0.25)
for k2 in range(12):  # alarm pulse
    at = 20.4 + k2 * 0.48; n = int(0.24 * SR); xx = np.arange(n) / SR
    a = np.sign(np.sin(2 * np.pi * 880 * xx)) * 0.3 + np.sin(2 * np.pi * 440 * xx)
    place(sfx, fft_filter(a, hi=3000) * env_ad(n, 0.004, 0.1), at, 0.09 * (1 - 0.04 * k2), -0.25)
for k2 in range(30):  # ad malfunction crackles
    at = rng.uniform(20.5, 22.8); n = int(rng.uniform(0.02, 0.09) * SR)
    c = fft_filter(noise(n), lo=500, hi=6000) * (np.floor(np.arange(n) / SR * 120) % 2)
    place(sfx, c, at, 0.12, rng.uniform(-0.9, 0.9))
n = int(1.6 * SR); xx = np.arange(n) / SR   # head turn: low drone swell
place(sfx, np.sin(2 * np.pi * 49 * xx) * np.sin(np.pi * xx / xx[-1]) ** 2, 23.7, 0.35)

# SHOT 6: eye whine + glitch bursts, then CUT TO BLACK with a massive bass impact
n = int(2.0 * SR); xx = np.arange(n) / SR
whine = np.sin(2 * np.pi * np.cumsum(np.linspace(1900, 2300, n)) / SR) * (xx / xx[-1]) * 0.25
place(sfx, whine, 26.0, 0.1)
for at in (26.3, 26.95, 27.4, 27.7, 27.85):
    n = int(0.09 * SR); xx = np.arange(n) / SR
    place(sfx, np.sign(np.sin(2 * np.pi * rng.uniform(100, 600) * xx)) * (np.floor(xx * 90) % 2) + fft_filter(noise(n), lo=3000) * 0.5, at, 0.12, rng.uniform(-0.5, 0.5))
n = int(2.0 * SR); xx = np.arange(n) / SR
impact = np.sin(2 * np.pi * np.cumsum(28 + 90 * np.exp(-xx * 9)) / SR) * np.exp(-xx * 1.0) * 1.0
impact += fft_filter(noise(n), hi=400) * np.exp(-xx * 4) * 0.8 + fft_filter(noise(n), lo=2000) * np.exp(-xx * 30) * 0.4
place(sfx, impact, 28.0, 1.0)
n = int(1.8 * SR); xx = np.arange(n) / SR   # title shimmer
place(sfx, sum(np.sin(2 * np.pi * f * xx) for f in (587.3, 880, 1174.7)) * np.exp(-xx * 1.6) * np.minimum(1, xx / 0.05) * 0.15, 28.2, 0.5)

# ================= VOICE: E.V.E. =================
def read_wav(p):
    w = wave.open(p); sr = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth()
    raw = np.frombuffer(w.readframes(w.getnframes()), {2: np.int16, 4: np.int32}[sw]).astype(np.float64)
    raw /= {2: 32768.0, 4: 2147483648.0}[sw]
    if ch > 1: raw = raw.reshape(-1, ch).mean(1)
    if sr != SR: raw = np.interp(np.arange(int(len(raw) * SR / sr)) / SR, np.arange(len(raw)) / sr, raw)
    return raw
voice_ok = os.path.exists(args.voice)
if voice_ok:
    v = read_wav(args.voice)
    v = norm(v - v.mean(), 0.9)
    if not args.voice_raw:
        v = fft_filter(v, lo=140, hi=7500)
        n = len(v); xx = np.arange(n) / SR
        ring = v * np.sin(2 * np.pi * 38 * xx)                            # subtle synthetic ring-mod
        dbl = np.interp(np.arange(n) * 1.006, np.arange(n), v, right=0)   # doubler, slightly detuned
        dbl = np.concatenate([np.zeros(int(0.011 * SR)), dbl])[:n]
        v = v * 0.85 + ring * 0.12 + dbl * 0.3
        st = int(1.05 * SR)                                                # "-ble": tiny digital stutter
        if st + 1200 < n: v[st:st + 1200] = v[st - 1200:st] * 0.7
        v = np.concatenate([v, np.zeros(int(2.5 * SR))])
        v = reverb(v, secs=2.4, wet=0.28, hi=5000, seed=11)
    place(vox, v, args.voice_at, 1.15)
    vox[:, int(28.0 * SR):] *= np.linspace(1, 0, N - int(28.0 * SR)) ** 4  # tail ducks under the impact

# ================= MIX =================
for ch in range(2):
    music[ch] = fft_filter(music[ch], lo=25)
    sfx[ch] = fft_filter(sfx[ch], lo=22)
# sidechain-ish duck under dialogue
duck = 1 - 0.55 * window(args.voice_at - 0.1, args.voice_at + 1.6, 0.1, 0.2)
mix = (music * 0.8 + amb * 0.7 + sfx) * duck + vox
# gentle bus glue + limiter (soft clip) at -1 dBFS
mix = reverb(mix[0], 1.2, 0.08, 7000, 21), reverb(mix[1], 1.2, 0.08, 7000, 22)
mix = np.stack(mix)
peak = np.abs(mix).max(); mix = mix / peak * 1.9
mix = np.tanh(mix) * 0.891
mix[:, -int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))

os.makedirs(args.out, exist_ok=True)
def write(p, x):
    x = np.clip(x, -1, 1); w = wave.open(p, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x.T * 32767).astype("<i2").tobytes()); w.close()
write(os.path.join(args.out, "mix.wav"), mix)
for name, s in [("music", music), ("ambience", amb), ("sfx", sfx), ("voice", vox)]:
    write(os.path.join(args.out, f"stem_{name}.wav"), norm(s, 0.9) if np.abs(s).max() > 0 else s)
print(f"mix.wav {N / SR:.3f}s {SR} Hz stereo; voice: {'yes' if voice_ok else 'MISSING'} at {args.voice_at}s; peak {np.abs(mix).max():.3f}")
