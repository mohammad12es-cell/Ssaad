"""Synthesize an original sound-design stem (drone, impacts, heartbeat, whooshes, shimmer).
No samples or music libraries: everything is generated from oscillators and noise.
Usage: python sfx.py <audio_dir>"""
import sys, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeline import build, END

SR = 48000
d = sys.argv[1]
tl = build(f"{d}/vo.json")
N = int(END * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(115)
t_all = np.arange(N) / SR

def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)

def place(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i+n] += sig[:n] * gain * np.sqrt(0.5 * (1 - pan)) * 1.414
    R[i:i+n] += sig[:n] * gain * np.sqrt(0.5 * (1 + pan)) * 1.414

def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))

def impact(dur=2.5, f0=110, f1=32):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 6)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.7)
    noise = lp(rng.standard_normal(n), 900) * env_exp(n, 0.12) * 0.6
    return np.tanh((body + noise) * 1.6) * 0.8

def thump(f=52):
    n = int(0.35 * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (f + 30 * np.exp(-t * 30)) * t) * env_exp(n, 0.07)
    return lp(s, 200) * 1.2

def heartbeat(start, stop, period=1.05, gain=0.6):
    t = start
    while t < stop:
        place(thump(54), t, gain); place(thump(48), t + 0.24, gain * 0.7)
        t += period

def whoosh(dur=1.2, lo=300, hi=3500):
    n = int(dur * SR); x = rng.standard_normal(n)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    a = bp(x, lo, hi) * e
    return a / (np.abs(a).max() + 1e-9) * 0.5

def riser(dur=1.5):
    n = int(dur * SR); x = hp(rng.standard_normal(n), 1500)
    e = np.linspace(0, 1, n) ** 3
    return x / np.abs(x).max() * e * 0.35

def bell(f, dur=3.0):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * m * t) * a for m, a in [(1, 1), (2.76, 0.35), (5.4, 0.12)])
    return s * env_exp(n, 0.9) * np.minimum(1, t / 0.01) * 0.25

# 1) Drone bed: low sines with slow beating + filtered brown noise
drone = (np.sin(2*np.pi*41.2*t_all) * 0.5 + np.sin(2*np.pi*41.7*t_all) * 0.4
         + np.sin(2*np.pi*61.7*t_all) * 0.22 * (0.6 + 0.4*np.sin(2*np.pi*0.07*t_all))
         + np.sin(2*np.pi*82.4*t_all + np.sin(2*np.pi*0.2*t_all)) * 0.12)
brown = lp(np.cumsum(rng.standard_normal(N)) * 0.002, 400)
brown = brown - lp(brown, 20)
air = bp(rng.standard_normal(N), 2000, 6000) * 0.012 * (0.5 + 0.5*np.sin(2*np.pi*0.05*t_all))
fade = np.minimum(1, t_all / 2.5) * np.minimum(1, (END - t_all) / 2.0)
bed = (drone * 0.22 + brown * 0.6 + air) * fade
L += bed; R += bed * 0.97

s = [c["start"] for c in tl]           # scene starts follow narration starts
# 2) Opening impact + heartbeat under the hook
place(impact(), 0.05, 0.9)
heartbeat(1.4, s[1] - 0.5, 1.05, 0.55)
# 3) Scene transitions: whooshes leading into each scene
for i, at in enumerate(s[1:], 1):
    w = whoosh(1.3 if i != 2 else 1.8, 250 if i != 2 else 150, 3000)
    place(w, at - (0.9 if i != 2 else 1.3), 0.8, pan=(-0.3 if i % 2 else 0.3))
place(impact(1.8, 90, 30), s[1] - 0.05, 0.45)          # cut to fossil
place(riser(1.6), s[2] - 1.6, 0.6)                      # dive into the bone
# 4) Heme reveal shimmer
for k, (f, dt) in enumerate([(880, 0), (1318.5, 0.35), (1174.7, 0.7)]):
    place(bell(f), s[2] + 4.2 + dt, 0.5, pan=(-0.4 + 0.4 * k))
# 5) Cells: faint slow heartbeat, glow tones
heartbeat(s[3] + 0.5, s[4] - 1.0, 1.4, 0.3)
place(bell(659.3, 4), s[3] + 1.0, 0.35, -0.3); place(bell(987.8, 4), s[3] + 4.5, 0.3, 0.3)
# 6) Twist: hard low hit at "But here's the catch"
place(impact(2.8, 140, 28), s[4] - 0.02, 1.0)
place(bell(466.2, 4), s[4] + 4.0, 0.3)
# 7) Ending: riser into the logo, final hit
place(riser(2.0), 43.0 - 2.0, 0.5)
place(impact(3.0, 100, 30), 43.0, 0.8)

mix = np.stack([L, R], 1)
mix /= max(1.0, np.abs(mix).max() / 0.89)
sf.write(f"{d}/fx.wav", mix.astype(np.float32), SR, subtype="PCM_24")
print("fx.wav", END, "s; scene starts:", s)
