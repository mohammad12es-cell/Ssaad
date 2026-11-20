#!/usr/bin/env python3
"""THE LAST HUMAN — original score + sound design engine (100% synthesised, no samples).
usage: python3 src/audio/score.py 1        -> build/audio/ep01_mix.wav (+ stems)
Reads the episode's cue sheet (src/episodes/sound/epXX.json) and voice.json, renders
music / ambience / sfx / dialogue buses, ducks music under dialogue and writes a stereo 48 kHz mix.

Series sound identity:
  * "Neo-Eden motif": minor-6th falling figure D–Bb–A over a sub pulse (heard on every reveal)
  * E.V.E's tone: glassy sine cluster with slow chorus (heard whenever she is present)
  * Glitch language: bit-crushed bursts + pitch-stepped blips, always stereo-split
"""
import json, os, sys, wave
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 48000
EP = int(sys.argv[1])
CUE = json.load(open(os.path.join(ROOT, f"src/episodes/sound/ep{EP:02d}.json")))
DUR = float(CUE.get("duration", 30.0)); N = int(round(DUR * SR))
rng = np.random.default_rng(1000 + EP)
bus = {k: np.zeros((2, N)) for k in ("music", "amb", "sfx", "voice")}

# ------------------------------------------------------------------ primitives
def T(d): return np.arange(int(round(d * SR))) / SR
def note(n): return 440.0 * 2 ** ((n - 69) / 12)            # midi -> Hz
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
def nm(s):  # "D2" -> midi
    p, o = (s[:-1], int(s[-1])); return 12 * (o + 1) + NOTE[p]
def env_adsr(L, a=0.01, d=0.1, s=0.7, r=0.2):
    a_, d_, r_ = int(round(a * SR)), int(round(d * SR)), int(round(r * SR)); s_ = max(0, L - a_ - d_ - r_)
    e = np.concatenate([np.linspace(0, 1, a_, endpoint=False), np.linspace(1, s, d_, endpoint=False), np.full(s_, s), np.linspace(s, 0, r_)])[:L]
    return np.pad(e, (0, L - len(e)))
def expd(L, tau): return np.exp(-np.arange(L) / SR / tau)
def saw(f, t, ph=0.0): return 2 * ((f * t + ph) % 1) - 1
def sq(f, t): return np.sign(np.sin(2 * np.pi * f * t))
def lp(x, fc, o=2): b, a = signal.butter(o, min(fc, SR / 2 - 100) / (SR / 2)); return signal.lfilter(b, a, x)
def hp(x, fc, o=2): b, a = signal.butter(o, fc / (SR / 2), "high"); return signal.lfilter(b, a, x)
def bp(x, lo, hi, o=2): b, a = signal.butter(o, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], "band"); return signal.lfilter(b, a, x)
def sweep_lp(x, f0, f1):  # time-varying lowpass via block processing
    out = np.zeros_like(x); B = 2048; zi = None
    for i in range(0, len(x), B):
        fc = f0 * (f1 / f0) ** (i / max(1, len(x))); b, a = signal.butter(2, min(fc, SR / 2 - 200) / (SR / 2))
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[i:i + B], zi = signal.lfilter(b, a, x[i:i + B], zi=zi)
    return out
def noise(L): return rng.uniform(-1, 1, L)
def pink(L):
    w = np.fft.rfft(rng.standard_normal(L)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), L) * 8
def brown(L): x = np.cumsum(rng.standard_normal(L)); x = hp(x, 15); return x / (np.abs(x).max() + 1e-9)
def add(b, x, t, g=1.0, pan=0.0):
    s = int(round(t * SR)); e = min(N, s + len(x))
    if e <= s or s < 0 and e <= 0: return
    if s < 0: x = x[-s:]; s = 0; e = min(N, len(x))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[b][0, s:e] += x[: e - s] * g * l * 1.414; bus[b][1, s:e] += x[: e - s] * g * r * 1.414
def ir(decay=2.0, bright=6000, pre=0.02):
    L = int(round(decay * SR)); x = noise(L) * expd(L, decay / 6.5); x = lp(x, bright); x[: int(round(pre * SR))] *= 0; return x / np.abs(x).sum() * 40
def reverb(x, decay=2.0, mix=0.3, bright=6000):
    y = signal.fftconvolve(x, ir(decay, bright))[: len(x)]; return x * (1 - mix) + y * mix
def sat(x, k=2.0): return np.tanh(x * k) / np.tanh(k)

# ------------------------------------------------------------------ music
def pad(t0, t1, notes, g=0.12, bright=1400, detune=0.12, pan=0.0, swell=1.5):
    L = int(round((t1 - t0) * SR)); t = T(t1 - t0); x = np.zeros(L)
    for n in notes:
        f = note(nm(n))
        for d in (-detune, 0, detune): x += saw(f * 2 ** (d / 12), t, rng.random())
    x = lp(x / (3 * len(notes)), bright) * env_adsr(L, swell, 0.5, 0.85, min(2.0, (t1 - t0) * 0.3))
    x *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t)
    add("music", reverb(x, 3.5, 0.45, 5000), t0, g, pan - 0.2); add("music", reverb(x, 3.0, 0.45, 5000), t0, g * 0.9, pan + 0.2)
def subpulse(t0, t1, root="D1", bpm=96, g=0.3, div=2):
    b = 60 / bpm / div; f = note(nm(root)); t = t0
    while t < t1 - 0.05:
        L = int(round(b * 0.9 * SR)); tt = T(b * 0.9); x = np.sin(2 * np.pi * f * tt) * expd(L, b * 0.5) + 0.3 * sat(np.sin(2 * np.pi * f * 2 * tt), 3) * expd(L, b * 0.2)
        add("music", x, t, g); t += b
def arp(t0, t1, seq, bpm=96, g=0.06, div=4, bright=2600, pan=0.3):
    b = 60 / bpm / div; t = t0; i = 0
    while t < t1 - 0.02:
        n = seq[i % len(seq)]
        if n != "-":
            f = note(nm(n)); L = int(round(b * 1.6 * SR)); tt = T(b * 1.6)
            x = lp(saw(f, tt) * 0.6 + sq(f * 1.003, tt) * 0.4, bright * (1 + 0.5 * np.sin(i * 0.37))) * expd(L, b * 0.55)
            add("music", reverb(x, 1.6, 0.3), t, g, pan * (1 if i % 2 else -1))
        t += b; i += 1
def braam(t, root="D1", g=0.35, d=2.6):
    L = int(round(d * SR)); tt = T(d); f = note(nm(root)); x = np.zeros(L)
    for k, m in enumerate((1, 1.5, 2, 3)):
        for dt in (-0.1, 0.1): x += saw(f * m * 2 ** (dt / 12), tt, rng.random()) / (k + 1)
    x = sat(sweep_lp(x, 1800, 160), 2.5) * env_adsr(L, 0.02, 0.4, 0.6, d * 0.6)
    add("music", reverb(x, 3.0, 0.35), t, g, -0.15); add("music", reverb(x, 3.0, 0.35), t, g, 0.15)
def motif(t, g=0.1, oct=4, bpm=72):
    """Neo-Eden motif: D – Bb – A (falling minor 6th, resolve down a semitone)"""
    b = 60 / bpm
    for i, (n, l) in enumerate((("D", 1.0), ("Bb", 0.75), ("A", 1.6))):
        f = note(nm(f"{n}{oct}")); tt = T(l * b); L = len(tt)
        x = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2.01 * tt) + 0.12 * saw(f, tt)) * env_adsr(L, 0.04, 0.2, 0.7, l * b * 0.5)
        add("music", reverb(x, 4.0, 0.55, 7000), t + sum(v for _, v in (("D", 1.0), ("Bb", 0.75), ("A", 1.6))[:i]) * b, g, 0.1 * (i - 1))
def eve_tone(t0, t1, g=0.08):
    L = int(round((t1 - t0) * SR)); tt = T(t1 - t0); x = np.zeros(L)
    for f in (note(nm("A5")), note(nm("E6")), note(nm("C#6")), note(nm("A6")) * 1.003):
        x += np.sin(2 * np.pi * f * tt + 2 * np.sin(2 * np.pi * 0.21 * tt)) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.07 + f / 40000) * tt))
    x = x / 4 * env_adsr(L, 1.2, 0.5, 0.8, 1.2); add("music", reverb(x, 5, 0.6, 9000), t0, g, -0.3); add("music", reverb(x, 5, 0.6, 9000), t0, g, 0.3)
def heartbeat(t0, t1, bpm=58, g=0.4):
    t = t0; b = 60 / bpm
    while t < t1:
        for o, a in ((0, 1.0), (0.23, 0.7)):
            L = int(round(0.25 * SR)); tt = T(0.25); x = np.sin(2 * np.pi * (50 + 30 * np.exp(-tt * 30)) * tt) * expd(L, 0.07)
            add("music", lp(x, 200), t + o, g * a)
        t += b
def drums(t0, t1, bpm=96, g=0.5, pattern="x...x.x.x...x..."):
    b = 60 / bpm / 4; t = t0; i = 0
    while t < t1 - 0.01:
        c = pattern[i % len(pattern)]
        if c in "xX": kick(t, g * (1.2 if c == "X" else 1))
        if c == "s": snare(t, g * 0.6)
        if c == "h": add("music", hp(noise(int(round(0.05 * SR))), 7000) * expd(int(round(0.05 * SR)), 0.012), t, g * 0.25, 0.3)
        t += b; i += 1

# ------------------------------------------------------------------ sfx library
def kick(t, g=0.6):
    L = int(round(0.5 * SR)); tt = T(0.5); f = 42 + 110 * np.exp(-tt * 28); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(L, 0.16)
    add("sfx", sat(x, 1.5), t, g)
def snare(t, g=0.4):
    L = int(round(0.3 * SR)); x = bp(noise(L), 900, 7000) * expd(L, 0.07) + 0.4 * np.sin(2 * np.pi * 190 * T(0.3)) * expd(L, 0.05)
    add("sfx", reverb(x, 1.2, 0.3), t, g)
def impact(t, g=0.8, size=1.0):
    """deep cinematic hit: sub drop + noise body + long tail"""
    L = int(round(3.5 * SR)); tt = T(3.5); f = 30 + 70 * np.exp(-tt * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(L, 0.9 * size)
    body = lp(noise(L), 700) * expd(L, 0.25 * size) * 0.6
    crack = hp(noise(L), 2500) * expd(L, 0.03) * 0.4
    x = sat(sub + body + crack, 1.6); add("sfx", reverb(x, 4.5, 0.4, 3000), t, g, -0.05); add("sfx", reverb(x, 4.5, 0.4, 3000), t, g, 0.05)
def boom(t, g=0.6): impact(t, g, 0.7)
def subdrop(t, g=0.6, d=1.6):
    L = int(round(d * SR)); tt = T(d); f = 90 * np.exp(-tt * 2.2) + 28; add("sfx", np.sin(2 * np.pi * np.cumsum(f) / SR) * env_adsr(L, 0.01, 0.2, 0.8, d * 0.6), t, g)
def whoosh(t, g=0.4, d=1.0, pan=0.0, hi=4000):
    L = int(round(d * SR)); x = sweep_lp(noise(L), 300, hi) * np.sin(np.linspace(0, np.pi, L)) ** 2
    add("sfx", x, t, g, pan)
def riser(t, d=3.0, g=0.3, f0=120, f1=1600):
    L = int(round(d * SR)); tt = T(d); f = f0 * (f1 / f0) ** (tt / d)
    x = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * bp(noise(L), 400, 6000) * (tt / d)
    x *= (tt / d) ** 2; add("sfx", reverb(x, 2, 0.35), t, g)
def reverse_swell(t, d=1.5, g=0.4):
    L = int(round(d * SR)); x = reverb(hp(noise(L), 300) * expd(L, 0.2), 2.5, 0.8)[::-1]; add("sfx", x, t, g)
def glitch(t, g=0.35, d=0.25, pan=None):
    L = int(round(d * SR)); tt = T(d); x = np.zeros(L); k = 0
    while k < L:
        s = int(round(rng.uniform(0.008, 0.04) * SR)); kind = rng.integers(0, 4); seg = np.arange(s) / SR
        if kind == 0: y = np.sign(np.sin(2 * np.pi * rng.uniform(200, 3000) * seg))
        elif kind == 1: y = noise(s)
        elif kind == 2: y = np.sin(2 * np.pi * rng.uniform(800, 5000) * seg)
        else: y = np.zeros(s)
        y = np.round(y * 6) / 6; x[k:k + s] = y[: L - k]; k += s
    x *= 0.6; add("sfx", x, t, g, rng.uniform(-0.7, 0.7) if pan is None else pan)
def blip(t, g=0.18, f=1800, d=0.07, pan=0.0):
    L = int(round(d * SR)); add("sfx", np.sin(2 * np.pi * f * T(d)) * env_adsr(L, 0.002, 0.02, 0.6, d * 0.5), t, g, pan)
def scanbeep(t0, t1, g=0.12, rate=6):
    t = t0; i = 0
    while t < t1: blip(t, g, 1400 + 300 * (i % 3), 0.05, 0.4 * np.sin(i)); t += 1 / rate; i += 1
def scan_sweep(t, d=1.2, g=0.18):
    L = int(round(d * SR)); tt = T(d); f = 300 + 2600 * (tt / d); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + bp(noise(L), 2000, 8000) * 0.2
    add("sfx", x * np.sin(np.linspace(0, np.pi, L)), t, g)
def error_buzz(t, g=0.3, d=0.6):
    L = int(round(d * SR)); tt = T(d); x = sat(sq(110, tt) * 0.5 + sq(116, tt) * 0.5, 2) * (sq(8, tt) > 0) * env_adsr(L, 0.005, 0.05, 0.8, 0.05)
    add("sfx", lp(x, 3000), t, g)
def alarm(t0, t1, g=0.16):
    t = t0; i = 0
    while t < t1:
        d = 0.32; L = int(round(d * SR)); tt = T(d); f = 880 if i % 2 == 0 else 660
        add("sfx", reverb(sq(f, tt) * 0.4 * env_adsr(L, 0.01, 0.05, 0.8, 0.05), 1.5, 0.3), t, g, 0.25 * (1 if i % 2 else -1)); t += d; i += 1
def zap(t, g=0.3, d=0.4):
    L = int(round(d * SR)); x = np.zeros(L)
    for k in range(int(d * 60)):
        s = rng.integers(0, L - 400); w = rng.integers(60, 400); x[s:s + w] += noise(w) * rng.uniform(0.3, 1)
    add("sfx", hp(x, 1500) * expd(L, d * 0.5), t, g, rng.uniform(-0.5, 0.5))
def hum(t0, t1, f=60, g=0.08, pan=0.0):
    L = int(round((t1 - t0) * SR)); tt = T(t1 - t0); x = (sat(np.sin(2 * np.pi * f * tt), 3) + 0.4 * np.sin(2 * np.pi * f * 3 * tt)) * env_adsr(L, 0.3, 0.1, 1, 0.4)
    add("sfx", lp(x, 1500), t0, g, pan)
def neural_hum(t, g=0.12):
    d = 0.9; L = int(round(d * SR)); tt = T(d); x = np.sin(2 * np.pi * 2093 * tt) * 0.3 + np.sin(2 * np.pi * 523 * tt + 3 * np.sin(2 * np.pi * 7 * tt)) * 0.5
    add("sfx", reverb(x * env_adsr(L, 0.05, 0.2, 0.5, 0.5), 2, 0.4), t, g, 0.3)
def footsteps(t0, t1, rate=1.9, g=0.25, wet=True, heavy=False):
    t = t0; i = 0
    while t < t1:
        L = int(round(0.25 * SR)); tt = T(0.25)
        thump = np.sin(2 * np.pi * (70 if not heavy else 45) * tt) * expd(L, 0.04)
        sp = bp(noise(L), 1500, 7000) * expd(L, 0.05) * (0.5 if wet else 0.15)
        add("sfx", thump * (2.5 if heavy else 1) + sp, t, g * (0.85 + 0.3 * rng.random()), 0.15 * (1 if i % 2 else -1)); t += 1 / rate; i += 1
def robot_step(t, g=0.6):
    L = int(round(1.2 * SR)); tt = T(1.2); x = np.zeros(L)
    for f, a, d in ((47, 1.0, 0.35), (163, 0.4, 0.2), (431, 0.25, 0.15), (977, 0.15, 0.1), (1733, 0.1, 0.06)): x += np.sin(2 * np.pi * f * tt) * a * expd(L, d)
    x += lp(noise(L), 800) * expd(L, 0.06) * 0.6 + bp(noise(L), 1500, 6000) * expd(L, 0.08) * 0.3
    add("sfx", reverb(sat(x, 1.8), 2.2, 0.3), t, g)
def robot_steps(t0, t1, rate=1.0, g=0.5):
    t = t0
    while t < t1: robot_step(t, g); t += 1 / rate
def servo(t, d=0.5, g=0.15, f0=300, f1=900):
    L = int(round(d * SR)); tt = T(d); f = f0 + (f1 - f0) * np.sin(np.linspace(0, np.pi / 2, L)); x = sat(saw(1, 0) if False else np.sin(2 * np.pi * np.cumsum(f) / SR), 3) * 0.4 + saw(f0 / 2, tt) * 0.1
    add("sfx", bp(x, 200, 5000) * env_adsr(L, 0.03, 0.05, 0.8, 0.1), t, g, 0.2)
def debris(t, g=0.4, d=1.2):
    L = int(round(d * SR)); x = np.zeros(L)
    for k in range(40):
        s = int(rng.beta(1, 3) * L * 0.9); w = int(round(0.03 * SR)); seg = bp(noise(w), rng.uniform(800, 3000), 9000) * expd(w, 0.01); x[s:s + w] += seg[: L - s] * rng.uniform(0.2, 1)
    add("sfx", reverb(x, 1.8, 0.25), t, g, rng.uniform(-0.4, 0.4))
def glass(t, g=0.4):
    L = int(round(1.5 * SR)); tt = T(1.5); x = hp(noise(L), 3000) * expd(L, 0.12)
    for f in rng.uniform(2500, 9000, 14): x += np.sin(2 * np.pi * f * tt) * expd(L, rng.uniform(0.05, 0.4)) * 0.15
    add("sfx", reverb(x, 2, 0.3), t, g)
def hydraulic(t, d=1.6, g=0.35):
    L = int(round(d * SR)); tt = T(d); hiss = bp(noise(L), 2500, 10000) * env_adsr(L, 0.02, 0.3, 0.6, d * 0.6)
    clunk = np.sin(2 * np.pi * 70 * tt) * expd(L, 0.08); motor = sat(saw(55 + 20 * tt / d, tt), 2) * 0.15 * env_adsr(L, 0.1, 0.2, 0.7, 0.3)
    add("sfx", reverb(hiss * 0.5 + clunk + lp(motor, 600), 2.5, 0.35), t, g)
def drone_engine(t0, t1, g=0.25, approach=True):
    L = int(round((t1 - t0) * SR)); tt = T(t1 - t0); f = 165 + 25 * np.sin(2 * np.pi * 0.3 * tt)
    x = sat(saw(f, tt) * (0.6 + 0.4 * np.sin(2 * np.pi * 58 * tt)), 2) * 0.5 + bp(noise(L), 300, 2500) * 0.4
    a = (np.linspace(0.15, 1, L) if approach else np.ones(L)) * env_adsr(L, 0.4, 0.1, 1, 0.4)
    add("sfx", lp(x, 2400) * a, t0, g, -0.1)
def beam_on(t, g=0.35):
    d = 1.4; L = int(round(d * SR)); tt = T(d); f = 60 + 40 * (1 - np.exp(-tt * 4))
    x = sat(saw(f, tt) + saw(f * 1.5, tt) * 0.5, 2.5) * env_adsr(L, 0.01, 0.2, 0.6, 0.6); add("sfx", reverb(lp(x, 2000), 2, 0.3), t, g)
    zap(t, g * 0.6, 0.3)
def flash_white(t, g=0.4):
    d = 3.0; L = int(round(d * SR)); tt = T(d); x = np.zeros(L)
    for f in (2093, 2637, 3136, 4186): x += np.sin(2 * np.pi * f * tt)
    add("sfx", reverb(x / 4 * expd(L, 1.2), 4, 0.6, 12000), t, g); reverse_swell(t - 1.5, 1.5, g)
def tinnitus(t0, t1, g=0.05):
    L = int(round((t1 - t0) * SR)); add("sfx", np.sin(2 * np.pi * 7800 * T(t1 - t0)) * env_adsr(L, 0.5, 0.1, 1, 1.5), t0, g)
def typing(t0, t1, g=0.12, rate=14):
    t = t0
    while t < t1:
        L = int(round(0.03 * SR)); add("sfx", bp(noise(L), 2000, 8000) * expd(L, 0.006), t, g * rng.uniform(0.5, 1), rng.uniform(-0.3, 0.3)); t += rng.exponential(1 / rate)
def data_stream(t0, t1, g=0.06):
    t = t0
    while t < t1: blip(t, g * rng.uniform(0.3, 1), rng.choice([1200, 1600, 2400, 3200, 4800]), 0.025, rng.uniform(-0.8, 0.8)); t += rng.exponential(0.05)
def bubbles(t0, t1, g=0.08):
    t = t0
    while t < t1:
        d = 0.08; L = int(round(d * SR)); tt = T(d); f = rng.uniform(300, 1200) * (1 + tt * 6); add("sfx", np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(L, 0.02), t, g * rng.uniform(0.3, 1), rng.uniform(-0.5, 0.5)); t += rng.exponential(0.15)
def breath(t, g=0.18, d=1.4):
    L = int(round(d * SR)); x = bp(noise(L), 400, 3000) * np.sin(np.linspace(0, np.pi, L)) ** 1.5; add("sfx", x, t, g)
def shutdown(t, g=0.4, d=2.5):
    L = int(round(d * SR)); tt = T(d); f = 900 * np.exp(-tt * 1.6) + 30; add("sfx", reverb(sat(saw(1, 0) if False else np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * saw(f / 2, tt), 2) * env_adsr(L, 0.01, 0.1, 0.9, 0.4), 3, 0.4), t, g)
def stutter_cut(t, g=0.4): glitch(t, g, 0.18, 0); subdrop(t, g, 1.0)

# ------------------------------------------------------------------ ambience
def rain_amb(t0, t1, g=0.25, muffled=False):
    L = int(round((t1 - t0) * SR)); x = pink(L) * 0.25; drops = np.zeros(L)
    for k in range(int((t1 - t0) * 400)):
        s = rng.integers(0, L - 300); w = rng.integers(40, 300); drops[s:s + w] += noise(w) * expd(w, 0.002) * rng.uniform(0.1, 1)
    x = lp(bp(x, 300, 6000), 5000) * 0.8 + bp(drops, 1500, 7000) * 0.35
    if muffled: x = lp(x, 900) * 1.5
    e = env_adsr(L, 0.6, 0.1, 1, 0.6)
    add("amb", x * e, t0, g, -0.4); add("amb", np.roll(x, 3331) * e, t0, g, 0.4)
def city_amb(t0, t1, g=0.18):
    L = int(round((t1 - t0) * SR)); tt = T(t1 - t0); x = lp(brown(L), 220) * 1.4 + 0.08 * np.sin(2 * np.pi * 55 * tt)
    for k in range(3):  # distant sirens
        s = rng.uniform(0, max(0.1, (t1 - t0) - 4)); d = 4; f = 700 + 150 * np.sin(2 * np.pi * 0.7 * T(d)); y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_adsr(int(round(d * SR)), 1, 0.2, 0.8, 1.5) * 0.04
        y = reverb(lp(y, 2000), 3, 0.7); add("amb", y, t0 + s, g, rng.uniform(-0.8, 0.8))
    add("amb", x * env_adsr(L, 0.8, 0.1, 1, 0.8), t0, g)
def crowd_amb(t0, t1, g=0.12):
    L = int(round((t1 - t0) * SR)); x = bp(pink(L), 250, 2500) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.4 * T(t1 - t0))); add("amb", x * env_adsr(L, 0.5, 0.1, 1, 0.5), t0, g)
def room_tone(t0, t1, g=0.12, f=48):
    L = int(round((t1 - t0) * SR)); tt = T(t1 - t0); x = lp(brown(L), 300) + 0.15 * np.sin(2 * np.pi * f * tt) + 0.05 * np.sin(2 * np.pi * f * 2.5 * tt)
    add("amb", x * env_adsr(L, 0.8, 0.1, 1, 0.8), t0, g)
def drips(t0, t1, g=0.12):
    t = t0
    while t < t1:
        d = 0.15; tt = T(d); f = rng.uniform(900, 2200) * (1 + tt * 3); add("amb", reverb(np.sin(2 * np.pi * np.cumsum(f) / SR) * expd(int(round(d * SR)), 0.03), 2.5, 0.5), t, g, rng.uniform(-0.6, 0.6)); t += rng.exponential(0.9)
def wind(t0, t1, g=0.12):
    L = int(round((t1 - t0) * SR)); x = sweep_lp(pink(L), 300, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * T(t1 - t0))); add("amb", x * env_adsr(L, 1, 0.1, 1, 1), t0, g)

FN = {k: v for k, v in globals().items() if callable(v) and not k.startswith("_")}

def main():
    for c in CUE["cues"]:
        name, t = c[0], c[1]; kw = c[2] if len(c) > 2 else {}
        if isinstance(kw, list): FN[name](t, *kw)
        else: FN[name](t, **kw)
    # dialogue from voice.json
    V = json.load(open(os.path.join(ROOT, "src/data/voice.json")))
    vox_env = np.zeros(N)
    for lid, v in V.items():
        if v["ep"] != EP: continue
        w = wave.open(os.path.join(ROOT, "assets/voice", lid + ".wav")); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
        if w.getframerate() != SR: x = signal.resample_poly(x, SR, w.getframerate())
        pan = {"eve": 0.0, "vex": 0.0, "kael": 0.0, "child": 0.0, "system": 0.0}.get(v["who"], 0)
        add("voice", x, v["start"], CUE.get("voice_gain", {}).get(v["who"], 1.0), pan)
        s = int(round(v["start"] * SR)); e = min(N, s + len(x)); vox_env[s:e] = np.maximum(vox_env[s:e], 1)
    # duck music & ambience under dialogue (smoothed sidechain)
    k = int(round(0.25 * SR)); sm = np.convolve(vox_env, np.ones(k) / k, "same")
    for b, depth in (("music", 0.45), ("amb", 0.35)): bus[b] *= 1 - depth * sm
    G = CUE.get("bus_gain", {})
    mix = sum(bus[b] * G.get(b, 1.0) for b in bus)
    # silence regions (hard cuts)
    for a, b in CUE.get("silence", []):
        s, e = int(round(a * SR)), int(round(b * SR)); fade = int(round(0.004 * SR)); mix[:, s:s + fade] *= np.linspace(1, 0, fade); mix[:, s + fade:e] = 0
    mix = np.tanh(mix * 0.9) / np.tanh(0.9)  # soft clip / glue
    peak = np.abs(mix).max(); mix = mix / peak * 0.89 if peak > 0.89 else mix
    out = os.path.join(ROOT, "build/audio"); os.makedirs(out, exist_ok=True)
    def wr(path, x):
        w = wave.open(path, "w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x.T, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    wr(os.path.join(out, f"ep{EP:02d}_mix.wav"), mix)
    for b in bus: wr(os.path.join(out, f"ep{EP:02d}_{b}.wav"), bus[b] / max(1e-9, np.abs(bus[b]).max()) * 0.8)
    print(f"ep{EP:02d}: {DUR}s mix peak {np.abs(mix).max():.2f}")

if __name__ == "__main__":
    main()
