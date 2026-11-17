"""Score, sound design and narration mix for THE MEANING OF GROWTH.

Everything is synthesised here (original music, no samples): a modelled piano, string pads,
drones and air, low cinematic impacts, whooshes and breaths — all placed against the
narration timings from timeline.py.

usage: python3 audio.py VO_DIR OUT.wav
"""
import sys, os, json, math, wave
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline as TL
from lines import LINES
from trimdur import trimmed

SR = 48000
VO, OUT = sys.argv[1], sys.argv[2]
SHOTS, SUBS, M = TL.build(VO)
L, E, END = M["L"], M["E"], M["end"]
N = int((END + 0.5) * SR)
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


# ------------------------------------------------------------------ score
mus = np.zeros(N)       # piano / tonal (mono, reverbed later)
pads = np.zeros(N)
fx = np.zeros(N)        # impacts / whooshes (gets its own reverb)
dry = np.zeros(N)       # breaths etc.

t_build = L["s1"] - 0.08
t_stop = E["g4"] + 0.55                # the brief musical pause
t_warm = E["t1"] - 0.5                 # warm section begins with the corridor
t_res = L["e5"] - 0.1                  # final resolution

# I. lonely piano + air: A minor, sparse, rubato
air_bed = air(END + 0.5, 0.035)
air_env = np.interp(np.arange(N) / SR, [0, 1.5, t_build, t_stop, t_stop + 1, t_warm, END - 2, END],
                    [0, 1, 1.1, 0.9, 0.5, 0.35, 0.2, 0])
fx += air_bed[:N] * air_env
add(pads, drone([hz("A1"), hz("E2")], t_stop + 1.5, 0.22) *
    np.interp(np.arange(int((t_stop + 1.5) * SR)) / SR, [0, 3, t_stop - 1, t_stop + 1.5], [0, 1, 1.3, 0]), 0)

motif = [(0.9, "A2", 0.45, 3.0), (0.9, "E4", 0.32, 2.0), (2.6, "C5", 0.30, 1.6), (4.1, "B4", 0.26, 1.5),
         (5.5, "E4", 0.22, 1.3), (6.6, "F2", 0.38, 3.0), (6.6, "A4", 0.26, 1.5), (8.1, "C5", 0.28, 1.4),
         (9.5, "E5", 0.30, 1.6), (10.9, "D5", 0.24, 1.2), (12.0, "C2", 0.36, 3.0), (12.0, "B4", 0.24, 1.4)]
for tt, nt, v, d in motif:
    if tt < t_build - 0.4:
        add(mus, piano(hz(nt), d, v), tt)

# II. ambition: 72 bpm grid from the first fast cut; Am F C G, building
bpm = 72.0
beat = 60 / bpm
chords = [("A2", ["A3", "C4", "E4"], ["A4", "C5", "E5"]), ("F2", ["F3", "A3", "C4"], ["F4", "A4", "C5"]),
          ("C3", ["G3", "C4", "E4"], ["G4", "C5", "E5"]), ("G2", ["G3", "B3", "D4"], ["G4", "B4", "D5"])]
nbeats = int((t_stop - t_build) / beat) + 1
for b in range(nbeats):
    tb = t_build + b * beat
    if tb >= t_stop - 0.05:
        break
    prog = (tb - t_build) / (t_stop - t_build)
    bass, mid, hi = chords[(b // 4) % 4]
    if b % 4 == 0:
        add(mus, piano(hz(bass), beat * 4, 0.35 + 0.35 * prog), tb)
        if tb + beat * 4 > L["a1"] - 1:
            add(pads, strings([hz(n) for n in mid], beat * 4, 0.25 + 0.55 * prog, attack=0.9,
                              release=1.2, bright=0.3 + 0.5 * prog), tb)
    # eighth-note ostinato
    for h in range(2):
        idx = (b * 2 + h) % 3
        note = (hi if prog > 0.45 else mid)[idx]
        add(mus, piano(hz(note), beat / 2, 0.16 + 0.26 * prog), tb + h * beat / 2)
    # deep percussion once the ambition section starts
    if tb >= L["a1"] - 0.2:
        if b % 2 == 0:
            add(fx, drum(0.32 + 0.45 * prog), tb)
        if prog > 0.6 and b % 4 == 3:
            add(fx, drum(0.22, 140, 70), tb + beat / 2)

# III. the pause: everything stops; a single high note answers the question
add(mus, piano(hz("E5"), 2.5, 0.20), E["t1"] + 0.1)

# IV. warm: C major, slower, broken chords; strings swell under "حال خوب / خانواده"
bpm2 = 64.0
beat2 = 60 / bpm2
warm = [("F2", ["F3", "A3", "C4", "E4"], "A4"), ("C2", ["E3", "G3", "C4", "D4"], "G4"),
        ("A2", ["E3", "A3", "C4", "G4"], "E4"), ("G2", ["D3", "G3", "B3", "D4"], "D4")]
bar = 0
tb = t_warm
while tb < t_res - beat2 * 2:
    bass, notes, top = warm[bar % 4]
    vel = 0.30 + 0.12 * math.sin(min(1, (tb - t_warm) / (t_res - t_warm)) * math.pi)
    add(mus, piano(hz(bass), beat2 * 4, vel + 0.05), tb)
    for i, nt in enumerate(notes):
        add(mus, piano(hz(nt), beat2 * 2.5, vel * 0.55), tb + i * beat2 * 0.5 + 0.02 * i)
    add(mus, piano(hz(top.replace("4", "5")), beat2 * 2, vel * 0.5), tb + beat2 * 2.5)
    if tb >= L["w1"] - 1.0:
        add(pads, strings([hz(n) for n in notes[:3]], beat2 * 4, 0.30, attack=2.0, release=2.8, bright=0.35), tb)
    bar += 1
    tb = t_warm + bar * beat2 * 4

# resolution: C major add9, rings through the hold
for nt, v in (("C2", 0.42), ("G2", 0.3), ("E3", 0.28), ("G3", 0.25), ("D4", 0.2), ("E4", 0.22), ("C5", 0.2)):
    add(mus, piano(hz(nt), END - t_res, v), t_res + 0.03 * ("CGEDC".find(nt[0]) + 1))
add(pads, strings([hz("C3"), hz("G3"), hz("E4")], END - t_res - 1.5, 0.28, attack=2.5, release=2.0, bright=0.3), t_res)

# ------------------------------------------------------------------ sound design
cuts = [s["t0"] for s in SHOTS]
add(fx, impact(0.30, 45, 3.0), L["q1"] - 0.15)                       # first question
add(fx, whoosh(1.8, 0.10, 2000, 250, rev=True), L["q2"] - 1.9)         # the portrait emerges
add(fx, breath(0.05), L["q3"] - 0.6)
for k in ("s1", "s2", "s3", "s4"):
    add(fx, whoosh(0.35, 0.12, 600, 4000), L[k] - 0.3)
    add(fx, impact(0.18, 70, 0.8), L[k] - 0.07)
add(fx, impact(0.75, 48, 3.0), L["q6"] - 0.06)                       # "رشد یعنی چی؟"
add(fx, whoosh(0.7, 0.16, 300, 3500, rev=True), L["a1"] - 0.75)
for k, v in (("a1", 0.55), ("a2", 0.45), ("a3", 0.35), ("a4", 0.45), ("g1", 0.5)):
    add(fx, impact(v, 55, 2.0), L[k] - 0.1)
add(fx, impact(0.95, 42, 3.5), E["g4"] - 0.1)                        # peak, then silence
add(fx, breath(0.045, 0.6), L["t1"] - 0.75)
add(fx, whoosh(2.2, 0.08, 3000, 400, rev=True), E["t1"] - 2.4)        # the corridor opens
add(fx, whoosh(0.9, 0.05, 1500, 300), L["w1"] - 0.6)
add(fx, breath(0.035, 0.5), L["e3"] - 0.65)
add(fx, whoosh(2.0, 0.06, 2500, 300, rev=True), L["e3"] - 2.0)

# ------------------------------------------------------------------ narration
vo = np.zeros(N)
from scipy.signal import resample_poly
for lid, text, pause in LINES:
    x, sr = trimmed(f"{VO}/{lid}.wav")
    x = resample_poly(x, 320, 147) if sr == 22050 else x
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.085      # even level line to line
    fade = int(0.01 * SR)
    x[:fade] *= np.linspace(0, 1, fade); x[-fade * 3:] *= np.linspace(1, 0, fade * 3)
    add(vo, x, L[lid])
# voice EQ: clean lows, a little chest warmth, tame synthetic fizz
vo = signal.sosfilt(signal.butter(2, 75, "high", fs=SR, output="sos"), vo)
b, a = signal.iirpeak(170 / (SR / 2), 0.9)
vo = vo + 0.22 * signal.lfilter(b, a, vo)
vo = signal.sosfilt(signal.butter(2, 8500, "low", fs=SR, output="sos"), vo)
# gentle compression
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, "low", fs=SR, output="sos"), vo ** 2) + 1e-12)
gain = np.minimum(1, (0.11 / env) ** 0.35)
vo = vo * gain
vo_st = stereo_reverb(vo, 1.2, 0.35, 0.10, seed=11)

# ------------------------------------------------------------------ mix
music = stereo_reverb(mus, 4.0, 1.6, 0.42, seed=3) + stereo_reverb(pads, 4.0, 1.8, 0.35, seed=5)
fxs = stereo_reverb(fx, 4.0, 1.5, 0.30, seed=9)
# music stops for the pause (keeps the reverb tails — they are already rendered)
t_axis = np.arange(N) / SR
# duck music under the voice (-7 dB), smooth
venv = signal.sosfilt(signal.butter(1, 3, "low", fs=SR, output="sos"), np.abs(vo))
duck = 1 - 0.70 * np.clip(venv / 0.03, 0, 1)
music *= duck[:, None]
fxs *= (0.35 + 0.65 * duck)[:, None]
master = 0.95 * vo_st + 0.44 * music + 0.32 * fxs
def _db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for nm, (a_, b_) in dict(I=(0, t_build), II=(t_build, t_stop), turn=(t_stop, t_warm + 2), IV=(t_warm + 2, END)).items():
    i0, i1 = int(a_ * SR), int(b_ * SR)
    act = np.abs(vo[i0:i1]) > 0.01
    v = 0.95 * vo_st[i0:i1][act]; m = 0.44 * music[i0:i1][act]; f = 0.32 * fxs[i0:i1][act]
    print(f"{nm:5s} voice {_db(v):6.1f}  music {_db(m):6.1f}  fx {_db(f):6.1f}  (music-only {_db(0.44*music[i0:i1]):6.1f})")
fade_out = np.clip((END - t_axis) / TL.FADE_OUT, 0, 1) ** 1.5
master *= fade_out[:, None]
master[: int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
master = master[: int(END * SR)]
master /= np.abs(master).max() / 0.89
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((master * 32767).astype(np.int16).tobytes())
# stems for remixing
for name, x in (("voice", vo_st), ("music", music), ("fx", fxs)):
    x = x[: int(END * SR)]
    with wave.open(OUT.replace(".wav", f"_{name}.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x / (np.abs(x).max() + 1e-9) * 0.89, -1, 1) * 32767).astype(np.int16).tobytes())
print("audio", OUT, round(END, 2), "s")
