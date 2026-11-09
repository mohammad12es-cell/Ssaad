"""Original sound design for Ep002, synthesized from oscillators and noise (no samples, no music).
Usage: python sfx.py <audio_dir>"""
import sys, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeline import build, end

SR = 48000
d = sys.argv[1]
tl = build(f"{d}/vo.json"); END = end(f"{d}/vo.json")
N = int(END * SR); L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(2002); T = np.arange(N) / SR
lp = lambda x, f, o=2: sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
hp = lambda x, f, o=2: sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
bp = lambda x, a, b, o=2: sosfilt(butter(o, [a, b], "band", fs=SR, output="sos"), x)
env = lambda n, tau: np.exp(-np.arange(n) / (tau * SR))
def win(a, b, fi=1.0, fo=1.0):
    return np.clip(np.minimum((T - a) / fi, (b - T) / fo), 0, 1)
def place(sig, at, g=1.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i+n] += sig[:n] * g * np.sqrt(1 - pan); R[i:i+n] += sig[:n] * g * np.sqrt(1 + pan)
def impact(dur=2.6, f0=120, f1=30, noise=0.6):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 5)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.8) + lp(rng.standard_normal(n), 700) * env(n, 0.15) * noise
    return np.tanh(s * 1.7) * 0.8
def whoosh(dur=1.4, lo=200, hi=3000):
    n = int(dur * SR); e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    a = bp(rng.standard_normal(n), lo, hi) * e; return a / np.abs(a).max() * 0.5
def riser(dur=1.6):
    n = int(dur * SR); x = hp(rng.standard_normal(n), 1800); return x / np.abs(x).max() * np.linspace(0, 1, n) ** 3 * 0.3
def beep(f, dur=0.09):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.004) * env(n, 0.03) * 0.25
def bell(f, dur=3.0):
    n = int(dur * SR); t = np.arange(n) / SR
    return sum(np.sin(2*np.pi*f*m*t)*a for m, a in [(1, 1), (2.76, .3), (5.4, .1)]) * env(n, 0.8) * np.minimum(1, t/0.01) * 0.22
def drip(f):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f + 900 * np.exp(-t * 40)) * t) * env(n, 0.06) * 0.3

s = [c["start"] for c in tl]
B = [0] + [x - 0.15 for x in s[1:]]
# Bed: thin Martian wind (gusting band noise) + deep space drone
gust = 0.5 + 0.5 * np.sin(2*np.pi*0.11*T) * np.sin(2*np.pi*0.037*T + 1)
wind = bp(rng.standard_normal(N), 250, 1400) * 0.05 * gust
drone = (np.sin(2*np.pi*36.7*T) * .5 + np.sin(2*np.pi*55*T + np.sin(2*np.pi*.15*T)) * .25 + np.sin(2*np.pi*73.4*T) * .12 * (0.6 + .4*np.sin(2*np.pi*.08*T)))
fade = np.minimum(1, T / 1.0) * np.clip((END - T) / 1.5, 0, 1)
wind_amt = win(0, B[1] + 0.5) * 0.6 + win(B[2], B[3] + 1) * 1.0 + win(B[4], B[5] + 0.5) * 0.8
bed = (drone * 0.2 + wind * wind_amt) * fade
L += bed; R += bed * 0.96
# Subterranean rumble rising through the magma scenes
rum = lp(rng.standard_normal(N), 70, 4) * 0.9 * (0.6 + 0.4 * np.sin(2*np.pi*0.4*T) ** 2)
rum_amt = win(0.6, B[1], 1.5, 0.8) * 0.4 + win(B[3], B[5] + 0.8, 2.0, 1.5) * 1.0
L += rum * rum_amt * fade; R += rum * rum_amt * fade
# 1) Hook
place(impact(), 0.02, 1.0)
# 2) Spacecraft: pass-by whoosh + telemetry blips when the gas is detected
place(whoosh(2.0, 120, 2200), B[1] - 0.6, 0.7, -0.4)
for k, f in enumerate([1320, 1760, 1320, 1980]):
    place(beep(f), s[1] + 3.0 + k * 0.16, 0.8, 0.3)
place(bell(880), s[1] + 3.7, 0.4, 0.2)
# 3) Dive to the fissure, gas hiss
place(riser(1.4), B[2] - 1.4, 0.7); place(impact(2.0, 90, 28, 0.9), B[2] - 0.02, 0.6)
hiss = hp(rng.standard_normal(N), 2500) * 0.045 * win(B[2] + 1.0, B[3] + 0.3, 1.5, 0.8) * (0.7 + 0.3 * np.sin(2*np.pi*0.7*T))
L += hiss; R += hiss
for k, f in enumerate([987.8, 1318.5]):
    place(bell(f), s[2] + 0.75 + k * 0.4, 0.35, -0.3 + 0.6 * k)
# 4) Cutaway: whoosh + heat pops
place(whoosh(1.6, 180, 2500), B[3] - 0.8, 0.7, 0.3)
pr = np.random.default_rng(4)
for k in range(28):
    at = B[3] + 2.0 + pr.random() * (B[5] - B[3] - 2.5)
    n = int(0.12 * SR); pop = lp(pr.standard_normal(n), 300) * env(n, 0.02) * 0.6
    place(pop, at, 0.5, pr.random() - 0.5)
# 5) Twist: "But no new eruption…" — rumble cut + low hit
place(impact(2.4, 70, 26, 0.3), s[4] + 4.45, 0.75)
# 6) Underground water: drips and soft resonance
place(whoosh(1.5, 100, 1200), B[5] - 0.7, 0.6)
for k, (f, dt) in enumerate([(1500, 0.6), (1900, 1.7), (1300, 2.9), (1700, 4.1), (2100, 5.2)]):
    place(drip(f), B[5] + dt, 0.6, -0.5 + 0.25 * k)
place(bell(523.3, 4), B[5] + 1.2, 0.3)
# 7) Brand
place(riser(1.2), B[6] - 1.2, 0.5); place(impact(3.0, 100, 30), B[6] + 0.05, 0.85)

mix = np.stack([L, R], 1); mix /= max(1.0, np.abs(mix).max() / 0.89)
sf.write(f"{d}/fx.wav", mix.astype(np.float32), SR, subtype="PCM_24")
print("fx.wav", END, "scene starts", [round(b, 2) for b in B])
