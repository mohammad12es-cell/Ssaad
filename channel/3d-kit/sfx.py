#!/usr/bin/env python3
"""Pip & Pebble sound builder. usage: sfx.py CUES.json OUT.wav
CUES.json: {"duration": 16, "cues": [["ding", 0.4], ["drums", 5.5, 8.0, false], ...]}
Everything is synthesized here (original audio, no samples)."""
import json, sys, wave
import numpy as np

cfg = json.load(open(sys.argv[1]))
sr = 44100; T = float(cfg["duration"]); n = int(sr * T); out = np.zeros(n); rng = np.random.default_rng(int(cfg.get("seed", 7)))

def add(sig, t, g=1.0):
    s = int(t * sr); e = min(n, s + len(sig))
    if e > s: out[s:e] += g * sig[: e - s]
def env(L, a=0.005, d=0.2):
    x = np.arange(L) / sr; return np.minimum(1, x / a) * np.exp(-x / d)
def tone(f, dur, d=0.15):
    L = int(dur * sr); x = np.arange(L) / sr; return np.sin(2 * np.pi * f * x) * env(L, 0.004, d)
def saw(f, dur, d=0.3, a=0.01):
    L = int(dur * sr); x = np.arange(L) / sr; return (2 * ((f * x) % 1) - 1) * env(L, a, d)
def sweep(f0, f1, dur, amp=0.3):
    L = int(dur * sr); f = np.geomspace(f0, f1, L); return amp * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.linspace(1, 0.2, L)
def noise(dur, amp, d):
    L = int(dur * sr); return amp * rng.uniform(-1, 1, L) * env(L, 0.003, d)
def lp(x, k): return np.convolve(x, np.ones(k) / k, "same")
def kick():
    L = int(0.3 * sr); x = np.arange(L) / sr; f = 50 + 120 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-x * 9)
def snare(): return lp(noise(0.2, 0.6, 0.07), 2) + 0.3 * tone(200, 0.2, 0.05)
def hat(): return noise(0.05, 0.25, 0.012)
def chord(fs, t, dur, g):
    for f in fs: add(lp(saw(f, dur, dur * 0.6, 0.02), 6), t, g)
def ks(f, dur, amp=0.25, dec=0.994):
    N = int(sr / f); b = rng.uniform(-1, 1, N); L = int(sr * dur); y = np.zeros(L)
    for i in range(L): y[i] = b[i % N]; b[i % N] = dec * 0.5 * (b[i % N] + b[(i + 1) % N])
    return y * amp

def drums(t0, t1, dbl=False, bpm=140):
    b = 60 / bpm; t = t0; k = 0
    while t < t1:
        add(kick() if k % 2 == 0 else snare(), t, 0.8 if k % 2 == 0 else 0.5); add(hat(), t + b / 2, 0.6)
        if dbl: add(hat(), t + b / 4, 0.4); add(hat(), t + 3 * b / 4, 0.4)
        if k % 4 == 0: chord((73.4, 110, 146.8), t, b * 1.8, 0.07)
        else: add(lp(saw(73.4, b * 0.9, 0.15), 5), t, 0.08)
        t += b; k += 1

def bed(kind, t0, t1, g=1.0):
    if kind == "sneaky":  # minor pizzicato tiptoe, 100 bpm
        b = 60 / 100; notes = [146.8, 0, 174.6, 0, 164.8, 0, 146.8, 138.6]; t = t0; k = 0
        while t < t1:
            f = notes[k % 8]
            if f: add(ks(f * 2, 0.25, 0.18 * g, 0.985), t)
            if k % 2 == 0: add(tone(73.4, 0.18, 0.06), t, 0.35 * g)
            t += b / 2; k += 1
    elif kind == "happy":  # bouncy major plucks, 120 bpm
        b = 0.5; ch = [(261.6, 329.6, 392), (220, 261.6, 329.6), (174.6, 220, 261.6), (196, 246.9, 293.7)]; t = t0; k = 0
        while t < t1:
            for f in ch[(k // 4) % 4]: add(ks(f, 0.4, 0.06 * g), t + (0 if k % 2 == 0 else b / 2))
            add(tone(65 if k % 2 == 0 else 98, 0.2, 0.07), t, 0.25 * g); t += b; k += 1
    elif kind == "night":  # crickets + soft pad
        L = int((t1 - t0) * sr); x = np.arange(L) / sr
        cr = np.sin(2 * np.pi * 4200 * x) * (np.sin(2 * np.pi * 28 * x) > 0.6) * (np.sin(2 * np.pi * 0.9 * x) > 0) * 0.03
        add(cr * g, t0)
        for f in (110, 164.8, 220): add(lp(saw(f, t1 - t0, (t1 - t0), 0.8), 20), t0, 0.02 * g)

C = {
    "ding": lambda t: (add(tone(1568, 0.5, 0.25), t, 0.35), add(tone(2093, 0.6, 0.3), t + 0.12, 0.3)),
    "boom": lambda t: (add(lp(noise(1.0, 0.4, 0.4), 30), t), add(kick(), t, 0.9), chord((55, 82.4, 110), t, 1.2, 0.12)),
    "riser": lambda t, d=1.3: add(sweep(200, 1200, d, 0.12), t),
    "whoosh": lambda t: add(lp(noise(0.5, 0.5, 0.25), 10), t),
    "glint": lambda t: (add(tone(2637, 0.4, 0.2), t, 0.25), add(tone(3520, 0.4, 0.2), t + 0.05, 0.2)),
    "screech": lambda t: add(lp(noise(0.7, 0.5, 0.5), 3) * np.linspace(1, 0.2, int(0.7 * sr)), t),
    "whomp": lambda t: add(sweep(300, 60, 1.2, 0.4), t),
    "wahwah": lambda t: (add(sweep(400, 250, 0.35, 0.3), t), add(sweep(330, 180, 0.7, 0.3), t + 0.35)),
    "hit": lambda t: (add(kick(), t, 1.0), chord((73.4, 110, 146.8, 220), t, 0.8, 0.12)),
    "jump": lambda t: (add(sweep(400, 1400, 0.5, 0.25), t), add(sweep(1400, 400, 0.5, 0.2), t + 0.5)),
    "skid": lambda t: add(lp(noise(0.6, 0.6, 0.3), 3), t),
    "pop": lambda t: add(tone(600, 0.08, 0.03), t, 0.45),
    "creak": lambda t: add(sweep(180, 120, 0.6, 0.12), t),
    "angelic": lambda t: (chord((523.3, 659.3, 784, 1046.5), t, 1.8, 0.06), [add(tone(f, 0.6, 0.3), t + j * 0.1, 0.15) for j, f in enumerate((1046.5, 1318.5, 1568, 2093))]),
    "bang": lambda t: (add(noise(0.12, 0.7, 0.05), t), add(kick(), t, 0.7)),
    "pant": lambda t, k=4: [add(lp(noise(0.18, 0.25, 0.08), 20), t + i * 0.25) for i in range(int(k))],
    "burp": lambda t: add(lp((2 * ((np.arange(int(0.7 * sr)) / sr * (85 + 20 * np.sin(2 * np.pi * 14 * np.arange(int(0.7 * sr)) / sr))) % 1) - 1) * np.minimum(1, np.arange(int(0.7 * sr)) / sr / 0.03) * np.exp(-np.arange(int(0.7 * sr)) / sr * 2.5), 8), t, 0.45),
    "sad": lambda t: (add(sweep(392, 370, 0.35, 0.25), t), add(sweep(370, 349, 0.35, 0.25), t + 0.35), add(sweep(349, 262, 0.9, 0.25), t + 0.7)),
    "splash": lambda t: add(lp(noise(0.8, 0.9, 0.22), 4), t),
    "growl": lambda t: add(lp((2 * ((np.arange(int(0.9 * sr)) / sr * (55 + 12 * np.sin(2 * np.pi * 9 * np.arange(int(0.9 * sr)) / sr))) % 1) - 1) * np.sin(np.linspace(0, np.pi, int(0.9 * sr))), 12), t, 0.5),
    "tiptoe": lambda t, k=6, step=0.45: [add(tone(1200 + (i % 2) * 300, 0.06, 0.02), t + i * step, 0.25) for i in range(int(k))],
    "sparkle": lambda t: [add(tone(f, 0.5, 0.25), t + j * 0.07, 0.15) for j, f in enumerate((1568, 2093, 2637, 3136))],
    "bonk": lambda t: (add(tone(140, 0.3, 0.1), t, 0.5), add(noise(0.1, 0.4, 0.04), t)),
    "fall": lambda t: add(sweep(1500, 300, 0.8, 0.22), t),
    "rumble": lambda t, d=3.0: add(lp(noise(d, 0.25, d), 50), t),
    "error": lambda t: (add(tone(220, 0.25, 0.2), t, 0.3), add(tone(185, 0.4, 0.3), t + 0.22, 0.3)),
    "connect": lambda t: [add(tone(f, 0.25, 0.15), t + j * 0.09, 0.25) for j, f in enumerate((880, 1108.7, 1318.5))],
    "powerdown": lambda t: add(sweep(900, 80, 0.8, 0.3), t),
    "rustle": lambda t, d=0.6: add(lp(noise(d, 0.35, d * 0.6), 6), t),
    "click": lambda t: add(noise(0.03, 0.6, 0.006), t),
}

for cue in cfg["cues"]:
    name, *args = cue
    if name == "drums": drums(*args)
    elif name == "bed": bed(*args)
    else: C[name](*args)
fade = np.ones(n); fl = int(0.6 * sr); fade[-fl:] = np.linspace(1, 0.4, fl); out *= fade
out /= max(1e-6, np.max(np.abs(out))) * 1.1
w = wave.open(sys.argv[2], "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
