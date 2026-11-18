"""Score, sound design and mix for the v2 re-edit (timeline2.py).

An evolving soundtrack, not one piano bed:
  hook      — three distinct impacts (boom / suck / freeze), mysterious drone, a stab on «چی؟»
  questions — each question has its own sonic identity; total silence on «من باید رشد کنم...»
  rapid     — one percussive identity per word (ورزش / تحصیل / کار / پول), a tape-stop freeze
  ambition  — a riser into an accelerating percussion engine (100 bpm, 8ths -> 16ths)
  THE CUT   — the music is cut dead; room tone only; a single piano note
  warm      — a new theme: intimate piano, then strings; restrained resolution on «خودت»

usage: python3 audio2.py VO_DIR OUT.wav
"""
import sys, os, wave, math
import numpy as np
from scipy import signal
from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline2 as TL
from lines import LINES
from trimdur import trimmed
from synth import SR, add, air, breath, drone, drum, hz, impact, piano, stereo_reverb, strings, whoosh, rng

VO, OUT = sys.argv[1], sys.argv[2]
INSTR = len(sys.argv) > 3 and sys.argv[3] == "instrumental"   # no narration: music speaks the lines
SHOTS, TEXTS, HITS, FLASHES, M = TL.build(VO)
L, E, END = M["L"], M["E"], M["end"]
N = int((END + 0.2) * SR)
t_ax = np.arange(N) / SR

mus = np.zeros(N); pads = np.zeros(N); fx = np.zeros(N)       # pre-cut buses
warm_mus = np.zeros(N); warm_pads = np.zeros(N)               # post-cut buses
room = np.zeros(N)


# ---------------------------------------------------------------- extra instruments
def riser(length, vel=0.2, f0=80, f1=900):
    n = int(length * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / length) ** 1.6
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    noise = whoosh(length, 1.0, 400, 6000, rev=True)
    env = (t / length) ** 2.2
    return vel * (0.5 * tone * env + 0.9 * noise)


def stab(vel=0.6):
    s = strings([hz("A2"), hz("E3"), hz("A3"), hz("C4")], 0.35, vel, attack=0.01, release=1.4, bright=0.8)
    return s + impact(0.6 * vel, 50, 2.0)[: len(s)] if len(s) <= int(2.0 * SR) else s


def metal(vel=0.3, f=420):
    n = int(1.6 * SR); t = np.arange(n) / SR
    out = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t / (0.5 / r)) / r for r in (1.0, 2.76, 5.40, 8.93))
    return vel * out * np.minimum(1, t / 0.001)


def tick(vel=0.25):
    n = int(0.05 * SR)
    x = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.003 * SR))
    return vel * signal.sosfilt(signal.butter(2, 2500, "high", fs=SR, output="sos"), x)


def tapestop(length=0.6, vel=0.35):
    n = int(length * SR); t = np.arange(n) / SR
    f = 220 * (1 - t / length) ** 2 + 25
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + np.sin(2 * np.pi * np.cumsum(f / 2) / SR)
    x = signal.sosfilt(signal.butter(2, 900, "low", fs=SR, output="sos"), x)
    return vel * x * (1 - t / length) ** 0.5


def heartbeat(vel=0.35):
    a = drum(vel, 70, 40)
    out = np.zeros(int(0.9 * SR)); out[: len(a)] += a[: len(out)]
    b = drum(vel * 0.6, 65, 38)
    i = int(0.22 * SR); out[i:] += b[: len(out) - i]
    return out


def tremolo_strings(freqs, dur, vel=0.2):
    s = strings(freqs, dur, vel, attack=dur * 0.8, release=0.6, bright=0.6)
    tt = np.arange(len(s)) / SR
    return s * (0.65 + 0.35 * np.sin(2 * np.pi * 9 * tt))


def sub(vel=0.5, f=42, length=1.2):
    n = int(length * SR); t = np.arange(n) / SR
    return vel * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.45) * np.minimum(1, t / 0.003)


# ---------------------------------------------------------------- hook (0 – 4.25)
for h in HITS:
    k, tm, s = h["kind"], h["t"], h["s"]
    if k == "boom":
        add(fx, impact(0.9 * s, 46, 3.0), tm); add(fx, sub(0.5 * s), tm)
    elif k == "boom_short":
        add(fx, impact(0.6 * s, 58, 1.4), tm)
    elif k == "suck":
        add(fx, whoosh(0.42, 0.35 * s, 5000, 200), tm - 0.05); add(fx, drum(0.4 * s, 120, 60), tm)
    elif k == "freeze":
        add(fx, impact(0.7 * s, 60, 1.8), tm); add(fx, metal(0.18 * s, 610), tm)
        add(fx, whoosh(0.3, 0.2 * s, 6000, 1500), tm)
    elif k == "stab":
        add(fx, stab(0.9 * s), tm)
    elif k == "punch":
        add(fx, drum(0.55 * s, 140, 55), tm); add(fx, tick(0.3), tm)
    elif k == "soft":
        add(fx, whoosh(0.6, 0.1, 300, 2000), tm - 0.3)
    elif k == "s1":   # sport: taiko
        add(fx, drum(0.8, 105, 48), tm); add(fx, sub(0.35, 48, 0.8), tm)
    elif k == "s2":   # education: clean tick + paper air
        add(fx, tick(0.5), tm); add(fx, tick(0.3), tm + 0.06); add(fx, whoosh(0.25, 0.12, 2500, 7000), tm - 0.1)
    elif k == "s3":   # work: metal
        add(fx, metal(0.3, 330), tm); add(fx, drum(0.4, 160, 80), tm)
    elif k == "s4":   # money: sub + bright ping
        add(fx, sub(0.6, 40, 1.0), tm); add(fx, metal(0.15, 1250), tm + 0.02)
    elif k == "tapestop":
        add(fx, tapestop(0.65, 0.4), tm)
    elif k == "riser_hit":
        add(fx, impact(0.45, 50, 2.5), tm)
    elif k == "hit":
        add(fx, drum(0.55 * s + 0.2, 100, 48), tm); add(fx, impact(0.35 * s, 55, 1.2), tm)
    elif k == "peak":
        add(fx, impact(1.0, 40, 3.0), tm); add(fx, drum(0.9, 90, 42), tm)

# mysterious bed under the hook text, heartbeat, then silence before the first question
add(pads, drone([hz("A1"), hz("E2")], 2.9, 0.20) * np.linspace(0.2, 1, int(2.9 * SR)), M["hook_text"] - 0.1)
add(fx, whoosh(1.4, 0.10, 3000, 300, rev=True), M["chi"] - 1.4)
for tb in (1.65, 2.45):
    add(fx, heartbeat(0.32), tb)
add(mus, piano(hz("E5"), 1.0, 0.18), M["hook_text"] + 0.1)
add(mus, piano(hz("C5"), 1.0, 0.16), M["hook_text"] + 1.0)

# ---------------------------------------------------------------- questions
q1 = L["q1"]
add(pads, drone([hz("A1"), hz("E2"), hz("A2")], L["q4"] - q1, 0.22) *
    np.interp(np.arange(int((L["q4"] - q1) * SR)) / SR, [0, 0.6, L["q4"] - q1 - 0.3, L["q4"] - q1], [0, 1, 1, 0]), q1)
add(fx, air(L["q4"] - q1, 0.03), q1)
add(mus, piano(hz("A4"), 1.2, 0.22), L["q1"] + 0.6)            # q1: deep boom + one low note (from hits)
add(mus, piano(hz("E5"), 1.2, 0.26), L["q2"] + 0.05)           # q2: a single high note
add(pads, tremolo_strings([hz("A3"), hz("C4"), hz("E4")], L["q4"] - L["q3"], 0.28), L["q3"])  # q3: rising tremolo
if not INSTR:
    add(fx, breath(0.05, 0.5), L["q4"] - 0.55)                    # q4: silence, a breath

# ---------------------------------------------------------------- ambition: riser -> percussion engine
add(pads, strings([hz("A2"), hz("E3"), hz("A3")], L["a2"] - L["a1"], 0.35, attack=0.2, release=0.8, bright=0.4),
    L["a1"] - 0.1)
add(fx, heartbeat(0.4), L["a1"] + 0.2)
add(fx, riser(L["a2"] - 0.06 - (L["a1"] + 0.3), 0.22), L["a1"] + 0.3)
bpm = 100.0; beat = 60 / bpm
g_start = L["a2"] - 0.06
stop = M["stop"]
chords = [("A2", ["A3", "C4", "E4"]), ("F2", ["F3", "A3", "C4"]), ("D2", ["D3", "F3", "A3"]), ("E2", ["E3", "G#3", "B3"])]
nb = int((stop - g_start) / beat) + 1
for b in range(nb):
    tb = g_start + b * beat
    if tb >= stop - 0.02:
        break
    prog = (tb - g_start) / (stop - g_start)
    bass, tri = chords[(b // 4) % 4]
    if b % 4 == 0:
        add(pads, strings([hz(n) for n in tri], beat * 4, 0.3 + 0.4 * prog, attack=0.15, release=0.5,
                          bright=0.4 + 0.4 * prog), tb)
        add(mus, piano(hz(bass), beat * 4, 0.45 + 0.3 * prog), tb)
        add(fx, sub(0.35 + 0.3 * prog, hz(bass) / 2 if hz(bass) > 80 else hz(bass), 1.4), tb)
    # string/piano ostinato: 8ths, then 16ths in the final stretch
    div = 4 if prog > 0.55 else 2
    for h in range(div):
        nt = tri[(b * div + h) % 3]
        nt = nt[:-1] + str(int(nt[-1]) + 1) if prog > 0.4 else nt
        add(mus, piano(hz(nt), beat / div, 0.12 + 0.2 * prog), tb + h * beat / div)
    # percussion
    if b % 2 == 0:
        add(fx, drum(0.35 + 0.4 * prog, 95, 45), tb)
    else:
        add(fx, drum(0.18 + 0.25 * prog, 150, 75), tb)
    if prog > 0.3:
        add(fx, tick(0.10 + 0.12 * prog), tb + beat / 2)
    if prog > 0.65:
        add(fx, drum(0.15 + 0.2 * prog, 180, 90), tb + 0.75 * beat)
add(fx, riser(stop - (L["g4"] - 0.6), 0.25, 120, 1800), L["g4"] - 0.6)

# ---------------------------------------------------------------- instrumental melody
# Without narration, each subtitle reveal gets a melodic phrase: a note on the line, a second
# on its phrase break — the music "speaks" the line. Chord tones follow the section harmony.
bpm2 = 66.0; b2 = 60 / bpm2   # warm-theme tempo/harmony (same values as below)
warm = [("F2", ["C4", "F4", "A4", "E5"]), ("C2", ["C4", "E4", "G4", "D5"]),
        ("A1", ["C4", "E4", "A4", "B4"]), ("G1", ["B3", "D4", "G4", "A4"])]
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
def chord_pcs(t):
    if t < g_start:
        return ["A", "C", "E"]
    if t < stop:
        b = int((t - g_start) / beat)
        return [n[:-1] for n in chords[(b // 4) % 4][1]]
    if t < L["t2"] - 0.6:
        return ["E", "G", "B"]
    bar_i = int((t - (L["t2"] - 0.6)) / (b2 * 4))
    return [n[:-1] for n in warm[bar_i % 4][1]]
def midi(n, o):
    return 12 * (o + 1) + NAMES.index(n)
def nearest(pcs, ref, lo=69, hi=88, direction=0):
    cands = [midi(p, o) for p in pcs for o in (4, 5, 6) if lo <= midi(p, o) <= hi]
    if direction:
        dc = [c for c in cands if (c - ref) * direction > 0] or cands
        return min(dc, key=lambda c: abs(c - ref))
    return min(cands, key=lambda c: (abs(c - ref) if c != ref else 99))
def mhz(m):
    return 440.0 * 2 ** ((m - 69) / 12)
if INSTR:
    prev = 76
    for k, (lid, text, _) in enumerate(LINES):
        t0 = L[lid]
        warm_part = t0 >= stop
        pcs = chord_pcs(t0 + 0.01)
        direction = 1 if k % 3 != 2 else -1
        n1 = nearest(pcs, prev, direction=direction)
        dur = E[lid] - t0
        bus = warm_mus if warm_part else mus
        v = 0.30 if warm_part else 0.24
        add(bus, piano(mhz(n1), max(0.4, dur * 0.6), v), t0)
        if not warm_part and g_start <= t0 < stop:       # ambition: octave doubling for weight
            add(bus, piano(mhz(n1 - 12), max(0.3, dur * 0.5), v * 0.7), t0)
        if dur > 1.3:                                   # second note on the phrase break
            n2 = nearest(chord_pcs(t0 + dur * 0.55), n1, direction=-direction)
            add(bus, piano(mhz(n2), max(0.4, dur * 0.45), v * 0.85), t0 + dur * 0.55)
            prev = n2
        else:
            prev = n1
        if warm_part and lid in ("w1", "w4", "e2", "e4"):  # strings carry the long warm lines
            add(warm_pads, strings([mhz(prev)], dur + 0.6, 0.16, attack=0.8, release=1.6, bright=0.4), t0)

# ---------------------------------------------------------------- THE CUT
# everything pre-cut is rendered with its reverb, then cut dead at `stop`
music_pre = stereo_reverb(mus, 3.5, 1.4, 0.38, seed=3) + stereo_reverb(pads, 3.5, 1.6, 0.30, seed=5)
fx_pre = stereo_reverb(fx, 3.0, 1.2, 0.25, seed=9)
cut = np.ones(N)
i0 = int(stop * SR); fade = int(0.015 * SR)
cut[i0:] = 0; cut[i0 - fade:i0] = np.linspace(1, 0, fade)
music_pre *= cut[:, None]; fx_pre *= cut[:, None]

# room tone only; a single note after the line
room += air(END + 0.3, 0.006, 200, 1200)[:N] * np.clip((t_ax - stop) / 0.4, 0, 1)
add(warm_mus, piano(hz("E5"), 2.5, 0.20), E["t1"] + 0.15)

# ---------------------------------------------------------------- warm theme (new key: C major)
t_w = L["t2"] - 0.6
bpm2 = 66.0; b2 = 60 / bpm2
warm = [("F2", ["C4", "F4", "A4", "E5"]), ("C2", ["C4", "E4", "G4", "D5"]),
        ("A1", ["C4", "E4", "A4", "B4"]), ("G1", ["B3", "D4", "G4", "A4"])]
bar = 0; tb = t_w
t_res = L["e5"] - 0.02
while tb < t_res - b2:
    bass, notes = warm[bar % 4]
    prog = (tb - t_w) / (t_res - t_w)
    vel = 0.28 + 0.14 * math.sin(min(1, prog) * math.pi)
    add(warm_mus, piano(hz(bass), b2 * 4, vel + 0.06), tb)
    for i, nt in enumerate(notes):
        add(warm_mus, piano(hz(nt), b2 * 2, vel * 0.5), tb + i * b2 * 0.5)
    if tb > L["w1"] - 1.2:
        add(warm_pads, strings([hz(n) for n in notes[:3]], b2 * 4, 0.22 + 0.12 * math.sin(prog * math.pi),
                               attack=1.8, release=2.4, bright=0.35), tb)
    if L["w3"] - 1 < tb < L["e3"]:      # cello line
        add(warm_pads, strings([hz(bass[:-1] + str(int(bass[-1]) + 1))], b2 * 4, 0.20, attack=1.2,
                               release=2.0, bright=0.3), tb)
    bar += 1
    tb = t_w + bar * b2 * 4
# resolution on «خودت»
for nt, v in (("C2", 0.42), ("G2", 0.30), ("E3", 0.28), ("G3", 0.25), ("D4", 0.20), ("E4", 0.22), ("C5", 0.20)):
    add(warm_mus, piano(hz(nt), END - t_res, v), t_res + 0.02)
add(warm_pads, strings([hz("C3"), hz("G3"), hz("E4"), hz("G4")], END - t_res, 0.30, attack=1.6, release=1.2,
                       bright=0.3), t_res)
add(fx_pre_post := np.zeros(N), whoosh(1.5, 0.05, 2500, 300, rev=True), L["e3"] - 1.4)
music_post = stereo_reverb(warm_mus, 4.0, 1.7, 0.42, seed=13) + stereo_reverb(warm_pads, 4.0, 1.8, 0.35, seed=15)
music_post += stereo_reverb(fx_pre_post, 2.0, 1.0, 0.3, seed=17)

# ---------------------------------------------------------------- narration (as v1)
vo = np.zeros(N)
for lid, text, _ in LINES:
    x, sr = trimmed(f"{VO}/{lid}.wav")
    x = resample_poly(x, 320, 147) if sr == 22050 else x
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.085
    f = int(0.01 * SR)
    x[:f] *= np.linspace(0, 1, f); x[-f * 3:] *= np.linspace(1, 0, f * 3)
    add(vo, x, L[lid])
vo = signal.sosfilt(signal.butter(2, 75, "high", fs=SR, output="sos"), vo)
bb, aa = signal.iirpeak(170 / (SR / 2), 0.9)
vo = vo + 0.22 * signal.lfilter(bb, aa, vo)
vo = signal.sosfilt(signal.butter(2, 8500, "low", fs=SR, output="sos"), vo)
env = np.sqrt(signal.sosfilt(signal.butter(1, 12, "low", fs=SR, output="sos"), vo ** 2) + 1e-12)
vo = vo * np.minimum(1, (0.11 / env) ** 0.35)
vo_st = stereo_reverb(vo, 1.2, 0.35, 0.10, seed=11)
# warm section: a touch closer / more intimate (less room)
venv = signal.sosfilt(signal.butter(1, 3, "low", fs=SR, output="sos"), np.abs(vo))
duck = 1 - 0.70 * np.clip(venv / 0.03, 0, 1)

if INSTR:
    duck = np.ones(N); vo_st = vo_st * 0
music = (music_pre + music_post) * duck[:, None]
fxs = fx_pre * (0.22 + 0.78 * duck)[:, None]
if INSTR:
    master = 0.62 * music + 0.34 * fxs + np.stack([room, room], 1)
else:
    master = 0.95 * vo_st + 0.44 * music + 0.30 * fxs + np.stack([room, room], 1)
# tail: after the cut to black the last chord rings out and fades
tail = np.clip((END - t_ax) / TL.TAIL_BLACK, 0, 1) ** 1.3
master *= tail[:, None]
master = master[: int(END * SR)]

def _db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for nm, (a_, b_) in dict(hook=(0, L["q1"]), questions=(L["q1"], L["a1"]), ambition=(L["a1"], stop),
                         warm=(stop, END)).items():
    i0, i1 = int(a_ * SR), int(b_ * SR)
    act = np.abs(vo[i0:i1]) > 0.01
    if INSTR: act[:] = False
    if act.any():
        print(f"{nm:9s} voice {_db(0.95*vo_st[i0:i1][act]):6.1f}  music {_db(0.44*music[i0:i1][act]):6.1f}  "
              f"fx {_db(0.30*fxs[i0:i1][act]):6.1f}  (between lines: music {_db(0.44*music[i0:i1][~act]):6.1f})")
    else:
        print(f"{nm:9s} (no voice)  music {_db(0.44*music[i0:i1]):6.1f}  fx {_db(0.30*fxs[i0:i1]):6.1f}")

master /= np.abs(master).max() / 0.89
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((master * 32767).astype(np.int16).tobytes())
print("audio", OUT, round(END, 2), "s")
