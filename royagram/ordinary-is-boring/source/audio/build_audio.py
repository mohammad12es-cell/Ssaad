#!/usr/bin/env python3
"""ROYAGRAM - "Ordinary Is Boring": original soundtrack, 100% synthesized (no samples, no licensed music).
usage: build_audio.py OUT_DIR
Writes stems (music / sfx / ambience, 48 kHz stereo float WAV) and mix_master.wav (-14 LUFS target, -1 dBTP ceiling).
Music is in D, Persian mode Homayoun (D Eb F# G A Bb C), played on a modal santur, strings, choir, daf and low brass.
"""
import os, sys, wave
import numpy as np
from scipy import signal

SR = 48000
DUR = 25.0
N = int(SR * DUR)
rng = np.random.default_rng(2025)
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(OUT, exist_ok=True)

def zeros(): return np.zeros((N, 2))
music, sfx, amb = zeros(), zeros(), zeros()

def t_(n): return np.arange(n) / SR
def place(bus, sig, t, gain=1.0, pan=0.0):
    """mono or stereo sig into bus at time t (s), constant-power pan -1..1"""
    s = int(round(t * SR))
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1) * np.sqrt(2)
    if s < 0: sig = sig[-s:]; s = 0
    e = min(N, s + len(sig))
    if e > s: bus[s:e] += gain * sig[: e - s]
def sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")
def filt(x, kind, f, order=2): return signal.sosfilt(sos(kind, f, order), x, axis=0)
def env_ar(n, a, r, shape=1.0):
    x = np.arange(n) / SR; A = np.minimum(1, x / max(a, 1e-4)); R = np.exp(-x / max(r, 1e-4)); return (A * R) ** shape
def adsr(n, a, d, s, r):
    x = np.arange(n) / SR; T = n / SR
    e = np.where(x < a, x / a, np.where(x < a + d, 1 - (1 - s) * (x - a) / d, s))
    return e * np.clip((T - x) / r, 0, 1)
def noise(n): return rng.uniform(-1, 1, n)
def pink(n):
    w = rng.standard_normal(n); b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w) / 4
def saw(f, n, ph=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,)); p = (np.cumsum(f) / SR + ph) % 1.0; return 2 * p - 1
def sine(f, n, ph=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,)); return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)

def reverb_ir(sec=2.4, damp=5000, pre=0.012, seed=1):
    r = np.random.default_rng(seed); n = int(sec * SR)
    x = np.arange(n) / SR; envl = np.exp(-6.9 * x / sec)
    ir = np.stack([r.standard_normal(n) * envl, r.standard_normal(n) * envl], 1)
    ir = filt(ir, "low", damp); ir = np.vstack([np.zeros((int(pre * SR), 2)), ir])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)
IR_HALL, IR_ROOM, IR_GLASS = reverb_ir(3.2, 4500, 0.02, 1), reverb_ir(0.45, 7000, 0.004, 2), reverb_ir(0.25, 9000, 0.001, 3)
def wet(bus_mono_or_st, ir, mix):
    x = bus_mono_or_st if bus_mono_or_st.ndim == 2 else np.stack([bus_mono_or_st] * 2, 1)
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - mix) + y * mix

# ---------------- notes ----------------
NOTE = {"D2": 73.42, "Eb2": 77.78, "G2": 98.0, "A2": 110.0, "Bb2": 116.54, "C3": 130.81, "D3": 146.83, "Eb3": 155.56, "F#3": 185.0, "G3": 196.0, "A3": 220.0, "Bb3": 233.08,
        "C4": 261.63, "D4": 293.66, "Eb4": 311.13, "F#4": 369.99, "G4": 392.0, "A4": 440.0, "Bb4": 466.16, "C5": 523.25, "D5": 587.33, "Eb5": 622.25, "F#5": 739.99, "G5": 783.99, "A5": 880.0, "D1": 36.71}

def santur(f, dur=2.6, vel=1.0):
    """modal hammered dulcimer: 3 detuned strings per course, stiff-string partials, hammer brightness"""
    n = int(dur * SR); x = t_(n); out = np.zeros(n)
    for cents in (-3.0, 0.0, 2.5):
        f0 = f * 2 ** (cents / 1200)
        for k in range(1, 14):
            fk = f0 * k * np.sqrt(1 + 0.00025 * k * k)
            if fk > 16000: break
            amp = (1.0 / k ** 1.05) * (1 + 0.6 * np.sin(k * 1.3)) * vel
            dec = 2.2 / (1 + 0.35 * k)
            out += amp * np.sin(2 * np.pi * fk * x + k) * np.exp(-x / dec)
    click = filt(noise(int(0.004 * SR)) * np.hanning(int(0.004 * SR)), "high", 2000) * 0.4
    out[: len(click)] += click
    return out / 6.0 * np.minimum(1, x / 0.0015)

def strings(freqs, dur, a=0.6, r=0.8, bright=2600, vib=5.2):
    n = int(dur * SR); x = t_(n); out = np.zeros((n, 2))
    for i, f in enumerate(freqs):
        for v in range(6):
            det = (v - 2.5) * 0.0028; lfo = 1 + 0.0035 * np.sin(2 * np.pi * (vib + v * 0.13) * x + v)
            s = saw(f * (1 + det) * lfo, n, ph=rng.random())
            pan = ((v / 5) * 2 - 1) * 0.7
            out[:, 0] += s * np.cos((pan + 1) * np.pi / 4); out[:, 1] += s * np.sin((pan + 1) * np.pi / 4)
    out = filt(out, "low", bright, 2); out = filt(out, "high", 70)
    return out * adsr(n, a, 0.3, 0.85, r)[:, None] / (len(freqs) * 6) * 1.6

def choir(freqs, dur, a=0.5, r=0.9):
    n = int(dur * SR); x = t_(n); src = np.zeros(n)
    for f in freqs:
        for v in range(4): src += saw(f * (1 + (v - 1.5) * 0.004) * (1 + 0.005 * np.sin(2 * np.pi * 5.5 * x + v)), n, rng.random())
    out = np.zeros(n)
    for fc, bw, g in ((720, 120, 1.0), (1150, 140, 0.6), (2650, 220, 0.25), (3300, 260, 0.12)):
        out += g * signal.sosfilt(signal.butter(2, [fc - bw / 2, fc + bw / 2], "band", fs=SR, output="sos"), src)
    return out * adsr(n, a, 0.3, 0.9, r) / (len(freqs) * 4) * 3.0

def braam(f, dur, open_t=0.25):
    n = int(dur * SR); x = t_(n); s = np.zeros(n)
    for m in (1, 2, 3, 0.5):
        for v in range(3): s += saw(f * m * (1 + (v - 1) * 0.006), n, rng.random()) / m
    cut = 180 + 2600 * np.exp(-x / (dur * 0.35)) * np.minimum(1, x / open_t)
    # time-varying lowpass via block processing
    out = np.zeros(n); blk = 1024; zi = None
    for i in range(0, n, blk):
        sosb = sos("low", float(cut[i]), 2)
        if zi is None: zi = signal.sosfilt_zi(sosb) * 0
        out[i:i + blk], zi = signal.sosfilt(sosb, s[i:i + blk], zi=zi)
    return np.tanh(out * 1.4) * env_ar(n, 0.02, dur * 0.5) * 0.5

def kick(f0=60, dur=0.9, g=1.0):
    n = int(dur * SR); x = t_(n); f = f0 * 0.5 + f0 * 1.5 * np.exp(-x * 18)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / (dur * 0.35)) + filt(noise(n), "low", 1800) * np.exp(-x * 60) * 0.3) * g
def daf_dum(g=1.0):
    n = int(0.5 * SR); x = t_(n); f = 85 + 60 * np.exp(-x * 30)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7) + filt(noise(n), "band", [150, 900]) * np.exp(-x * 40) * 0.5) * g
def daf_tak(g=1.0):
    n = int(0.3 * SR); x = t_(n)
    skin = filt(noise(n), "band", [700, 3500]) * np.exp(-x * 45)
    jingle = sum(np.sin(2 * np.pi * fj * x + j) * np.exp(-x * (14 + j)) for j, fj in enumerate((4120, 5310, 6890, 8030, 9470)))
    jingle *= filt(noise(n), "high", 3000) * 0.6 + 0.4
    return (skin * 0.7 + jingle * 0.25) * g
def jingle_roll(dur, g=1.0):
    n = int(dur * SR); x = t_(n)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 22 * x) ** 2
    return filt(noise(n), "high", 4500) * am * np.minimum(1, x / dur) ** 2 * g * 0.5
def whoosh(dur, f0, f1, g=1.0):
    n = int(dur * SR); x = t_(n); out = np.zeros(n); blk = 512; s = noise(n)
    fc = np.geomspace(f0, f1, n); zi = None
    for i in range(0, n, blk):
        lo, hi = fc[i] * 0.6, min(fc[i] * 1.6, SR / 2 - 100)
        sb = signal.butter(2, [lo, hi], "band", fs=SR, output="sos")
        if zi is None: zi = np.zeros((sb.shape[0], 2))
        out[i:i + blk], zi = signal.sosfilt(sb, s[i:i + blk], zi=zi)
    e = np.sin(np.pi * np.clip(x / dur, 0, 1)) ** 2
    return out * e * g
def riser(dur, g=1.0):
    n = int(dur * SR); x = t_(n); f = np.geomspace(110, 1400, n)
    return (whoosh(dur, 300, 9000, 0.8) + saw(f, n) * 0.08 * (x / dur) ** 2) * (x / dur) ** 1.5 * g
def impact(g=1.0, dur=3.0):
    n = int(dur * SR); x = t_(n); f = 30 + 45 * np.exp(-x * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 1.1)
    crack = filt(noise(n), "band", [200, 5000]) * np.exp(-x * 9) * 0.6
    return np.tanh((sub + crack) * 1.3) * g
def rev_cymbal(dur, g=1.0):
    n = int(dur * SR); x = t_(n)
    c = filt(noise(n), "high", 3000) * (x / dur) ** 3
    return c * g
def glass_ping(f=2650, dur=1.6, g=1.0):
    n = int(dur * SR); x = t_(n)
    parts = [(1.0, 1.0, 1.0), (2.32, 0.5, 0.6), (3.97, 0.3, 0.4), (5.7, 0.15, 0.25)]
    return sum(a * np.sin(2 * np.pi * f * m * x) * np.exp(-x / (dur * d)) for m, a, d in parts) * np.minimum(1, x / 0.0008) * g * 0.4
def drop_plink(g=1.0):
    n = int(0.35 * SR); x = t_(n)
    f = 700 + 2100 * (1 - np.exp(-x * 60))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22)
    s += filt(noise(n), "band", [1500, 7000]) * np.exp(-x * 120) * 0.4
    return s * g
def bubble(f, g=1.0):
    n = int(0.12 * SR); x = t_(n); ff = f * (1 + 2.2 * x / 0.12)
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-x * 35) * g
def tiny_horn(g=1.0):
    n = int(0.42 * SR); x = t_(n); out = np.zeros(n)
    for st, ln in ((0.0, 0.11), (0.17, 0.15)):
        m = (x >= st) & (x < st + ln); xx = x[m] - st
        tone = signal.square(2 * np.pi * 1480 * xx) * 0.5 + signal.square(2 * np.pi * 1860 * xx) * 0.5
        out[m] += tone * np.minimum(1, xx / 0.006) * np.minimum(1, (ln - xx) / 0.01)
    out = filt(out, "band", [900, 5200], 2)
    comb = np.zeros_like(out); d = int(SR / 2900)       # resonance of the glass around it
    comb[d:] = out[:-d] * 0.6; return (out + comb) * g * 0.5
def slurp(dur=0.62, g=1.0):
    n = int(dur * SR); x = t_(n); s = noise(n); out = np.zeros(n); blk = 256; zi = None
    fc = np.maximum(400, 1100 + 500 * np.sin(2 * np.pi * 7 * x) + 350 * np.sin(2 * np.pi * 13.3 * x + 1) + 900 * (x / dur))
    for i in range(0, n, blk):
        sb = signal.butter(2, [max(200, fc[i] * 0.7), fc[i] * 1.35], "band", fs=SR, output="sos")
        if zi is None: zi = np.zeros((sb.shape[0], 2))
        out[i:i + blk], zi = signal.sosfilt(sb, s[i:i + blk], zi=zi)
    gurgle = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * (24 + 10 * np.sin(2 * np.pi * 3 * x)) * x)) * 0.7
    e = np.minimum(1, x / 0.04) * np.minimum(1, (dur - x) / 0.08)
    return out * gurgle * e * g * 2.2
def clink(g=1.0):
    return glass_ping(1930, 0.9, 1.0) * g + np.pad(filt(noise(int(0.05 * SR)), "band", [250, 1200]) * np.exp(-t_(int(0.05 * SR)) * 80), (0, int(0.85 * SR))) * g * 0.5
def tick(g=1.0): n = int(0.03 * SR); return filt(noise(n), "band", [2000, 8000]) * np.exp(-t_(n) * 200) * g

# ===================== AMBIENCE =====================
room = filt(pink(N), "low", 900) * 0.022
room = np.stack([room, np.roll(room, 377)], 1)
amb += room
hiss = filt(noise(N), "high", 5000) * 0.006 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t_(N)))
steam_env = np.interp(t_(N), [0, 5, 6.5, 8, 20, 20.01, 22.1, 22.2, 25], [1, 1, 0.4, 0, 0, 1, 1, 0, 0])
amb += np.stack([hiss * steam_env] * 2, 1)
# fully in the "world" (8–20) the room disappears into the music
world = np.interp(t_(N), [0, 7.6, 8.0, 19.99, 20.0, 25], [1, 1, 0, 0, 1, 1])
amb *= world[:, None]
amb *= np.interp(t_(N), [0, 22.98, 23.0, 25], [1, 1, 0.35, 0])[:, None]

# ===================== MUSIC =====================
# 0–4: tension drone + first santur notes
place(music, strings([NOTE["D2"], NOTE["A2"]], 5.0, a=1.2, r=1.0, bright=900) * 0.9, 0.0)
place(music, wet(santur(NOTE["D5"], 3.0, 0.9), IR_HALL, 0.45), 0.32, 0.55, -0.2)
place(music, wet(santur(NOTE["A4"], 3.0, 0.7), IR_HALL, 0.45), 1.55, 0.45, 0.25)
place(music, wet(santur(NOTE["Eb5"], 3.0, 0.7), IR_HALL, 0.5), 2.7, 0.42, -0.1)
place(music, wet(santur(NOTE["D5"], 3.0, 0.6), IR_HALL, 0.5), 3.35, 0.35, 0.1)
# 4–8: rise
place(music, strings([NOTE["D3"], NOTE["F#3"], NOTE["A3"], NOTE["C4"]], 4.2, a=1.6, r=0.4, bright=1800) * 1.1, 4.0)
place(music, choir([NOTE["D4"], NOTE["A4"]], 3.0, a=1.8, r=0.3) * 0.8, 5.2)
for i, nm in enumerate(["D5", "Eb5", "F#5", "G5", "A5"]):
    place(music, wet(santur(NOTE[nm], 2.0, 0.6 + 0.08 * i), IR_HALL, 0.5), 5.6 + i * 0.42, 0.33, -0.4 + 0.2 * i)
place(music, riser(1.4, 0.55), 6.6)
# 8–14: the city — strings progression, santur ostinato (accelerating), daf
prog = [(8.0, ["D3", "F#3", "A3", "D4"]), (9.5, ["G2", "D3", "G3", "Bb3"]), (11.0, ["Eb3", "G3", "Bb3", "Eb4"]), (12.5, ["D3", "F#3", "A3", "C4"])]
for st, ch in prog: place(music, strings([NOTE[c] for c in ch], 1.9, a=0.35, r=0.5, bright=3000), st, 0.95)
place(music, choir([NOTE["D4"], NOTE["F#4"], NOTE["A4"]], 6.0, a=1.0, r=0.6) * 0.55, 8.0)
place(music, kick(55, 1.2, 1.0), 8.02, 0.9)
pattern = ["D5", "A4", "F#5", "A4", "G5", "A4", "F#5", "Eb5", "D5", "A4", "Eb5", "F#5", "G5", "F#5", "Eb5", "D5"]
t = 8.55; i = 0; ost = zeros()
while t < 14.0:
    bpm = 100 + 46 * ((t - 8.0) / 6.0) ** 1.4
    place(ost, santur(NOTE[pattern[i % 16]], 1.2, 0.55 + 0.2 * (i % 4 == 0)), t, 0.32, 0.35 * np.sin(i * 0.7))
    t += 60 / bpm / 4; i += 1
music += wet(ost, IR_HALL, 0.3)
t = 9.0; beat = 0; drums = zeros()
while t < 14.0:
    bpm = 100 + 46 * ((t - 8.0) / 6.0) ** 1.4; b = 60 / bpm
    if beat % 4 in (0, 2): place(drums, daf_dum(1.0), t, 0.9)
    else: place(drums, daf_tak(1.0), t, 0.6, 0.15)
    place(drums, daf_tak(0.45), t + b / 2, 0.35, -0.2)
    if t > 12.2: place(drums, daf_tak(0.35), t + b / 4, 0.28, 0.25); place(drums, daf_tak(0.35), t + 3 * b / 4, 0.28, -0.25)
    t += b; beat += 1
place(drums, jingle_roll(1.0, 0.8), 13.0)
music += wet(drums, IR_ROOM, 0.25)
# 14–17: wave
place(music, braam(NOTE["D1"] * 2, 3.2), 14.0, 1.1)
place(music, impact(0.9), 14.0)
place(music, strings([NOTE["G2"], NOTE["D3"], NOTE["G3"], NOTE["Bb3"]], 1.6, a=0.2, r=0.4, bright=2400), 14.0, 1.0)
place(music, strings([NOTE["Eb3"], NOTE["G3"], NOTE["Bb3"], NOTE["Eb4"]], 1.5, a=0.2, r=0.3, bright=3200), 15.55, 1.05)
for k, tt in enumerate(np.arange(14.0, 16.95, 0.42)): place(music, kick(48, 0.8, 0.75 + 0.05 * k), tt, 0.8)
t = 16.3
while t < 16.95: place(music, daf_dum(0.8), t, 0.6); t += 0.075
place(music, riser(2.0, 0.8), 15.0)
place(music, rev_cymbal(1.6, 0.5), 15.4)
# 17–20: climax
place(music, impact(1.2, 3.5), 17.0)
place(music, braam(NOTE["D1"] * 2, 3.0), 17.0, 0.9)
place(music, strings([NOTE["D3"], NOTE["A3"], NOTE["D4"], NOTE["F#4"], NOTE["A4"]], 3.05, a=0.08, r=0.02, bright=4200), 17.0, 1.3)
place(music, choir([NOTE["D4"], NOTE["F#4"], NOTE["A4"], NOTE["D5"]], 3.05, a=0.15, r=0.02) * 1.1, 17.0)
place(music, strings([NOTE["D2"], NOTE["A2"]], 3.05, a=0.05, r=0.02, bright=600), 17.0, 1.2)
t = 17.0; beat = 0; drums2 = zeros()
while t < 19.98:
    b = 60 / 140
    place(drums2, daf_dum(1.0) if beat % 2 == 0 else daf_tak(1.0), t, 0.9 if beat % 2 == 0 else 0.6)
    place(drums2, daf_tak(0.5), t + b / 2, 0.4, 0.2)
    if beat % 4 == 0: place(drums2, kick(52, 0.9, 0.9), t, 0.8)
    t += b; beat += 1
t = 19.45
while t < 19.98: place(drums2, daf_tak(0.8), t, 0.5, rng.uniform(-0.4, 0.4)); t += 0.045
music += wet(drums2, IR_ROOM, 0.25)
santur_c = zeros(); t = 17.0; i = 0
while t < 19.98:
    place(santur_c, santur(NOTE[["D5", "F#5", "A5", "F#5"][i % 4]], 1.0, 0.6), t, 0.3, 0.4 * np.sin(i)); t += 60 / 140 / 4; i += 1
music += wet(santur_c, IR_HALL, 0.25)
place(music, rev_cymbal(0.7, 0.6), 19.3)
# hard musical cut at 20.000 (abrupt silence = the twist)
cut = int(20.0 * SR); music[cut:int(23.0 * SR)] = 0
music[cut - 48:cut] *= np.linspace(1, 0, 48)[:, None]
# 23–25: logo
place(music, kick(42, 1.6, 0.7), 23.05, 0.7)
place(music, wet(glass_ping(2650, 2.0, 1.0), IR_HALL, 0.45), 23.18, 0.5)
place(music, wet(santur(NOTE["D5"], 2.0, 0.8), IR_HALL, 0.5), 23.78, 0.42)
place(music, wet(santur(NOTE["A5"], 1.8, 0.5), IR_HALL, 0.5), 23.92, 0.25, 0.3)
place(music, strings([NOTE["D3"], NOTE["A3"], NOTE["F#4"]], 1.95, a=0.4, r=0.6, bright=2000) * 0.6, 23.0)
music[int(23.0 * SR):] *= np.interp(t_(N - int(23.0 * SR)), [0, 1.55, 1.97, 2.0], [1, 1, 0, 0])[:, None]

# ===================== SFX =====================
place(sfx, wet(glass_ping(3100, 1.0, 0.35), IR_ROOM, 0.3), 0.5, 0.35, -0.1)    # the glint
rs = filt(noise(int(0.9 * SR)), "band", [400, 6000]) * (t_(int(0.9 * SR)) / 0.9) ** 3
place(sfx, rs, 3.9, 0.35)                                                     # reverse swell into the drop
place(sfx, wet(drop_plink(1.0), IR_HALL, 0.45), 4.8, 0.9)
place(sfx, wet(drop_plink(0.5) * 1.0, IR_HALL, 0.6), 4.86, 0.4, 0.2)
place(sfx, kick(38, 2.0, 1.0), 4.8, 0.9)
for k in range(14): place(sfx, bubble(rng.uniform(400, 1400), 0.3), rng.uniform(5.0, 7.8), 0.4, rng.uniform(-0.6, 0.6))
place(sfx, filt(whoosh(1.4, 120, 1600, 0.9), "low", 2500), 6.6, 0.9)           # dive
place(sfx, whoosh(0.9, 400, 5000, 0.6), 7.6, 0.7)
place(sfx, whoosh(1.1, 3000, 300, 0.6), 7.95, 0.6)                            # through the clouds
place(sfx, whoosh(0.55, 500, 3500, 1.0), 10.45, 0.9, 0.0)                      # through the arch
place(sfx, whoosh(0.7, 300, 2600, 0.8), 12.75, 0.8, -0.3)                      # between the minarets
for k in range(4): place(sfx, wet(glass_ping(rng.uniform(3200, 5200), 0.7, 0.3), IR_HALL, 0.5), 12.2 + k * 0.33, 0.25, rng.uniform(-0.7, 0.7))  # tiny bells
place(sfx, tiny_horn(0.3), 11.8, 0.25, 0.6); place(sfx, tiny_horn(0.25), 13.6, 0.2, -0.6)
crowd = filt(pink(int(5.5 * SR)), "band", [300, 2500]) * 0.06
place(sfx, crowd * adsr(len(crowd), 1.0, 0.5, 0.8, 1.0), 8.5)
roar = filt(pink(int(6.2 * SR)), "low", 700) * 0.9 + filt(noise(int(6.2 * SR)), "band", [800, 4000]) * 0.08
roar *= np.linspace(0.05, 1.0, len(roar)) ** 1.6
place(sfx, roar, 13.8, 0.8)
place(sfx, whoosh(0.8, 200, 4000, 1.0), 16.2, 0.9)
splash = filt(noise(int(2.6 * SR)), "band", [500, 9000]) * np.exp(-t_(int(2.6 * SR)) * 1.6) * 0.5
place(sfx, wet(splash, IR_HALL, 0.3), 17.0, 0.7)
for k in range(10): place(sfx, wet(glass_ping(rng.uniform(4000, 8000), 0.6, 0.15), IR_HALL, 0.4), 17.3 + k * 0.25, 0.25, rng.uniform(-0.8, 0.8))  # shimmer
sfx[int(20.0 * SR) - 48:int(20.0 * SR)] *= np.linspace(1, 0, 48)[:, None]; sfx[int(19.98 * SR):int(20.0 * SR)] *= 0
sfx[int(20.0 * SR):int(23.0 * SR)] = 0
# 20–23: the twist (dry, close, real)
place(sfx, filt(whoosh(0.45, 300, 1500, 0.25), "low", 3000), 20.28, 0.5, 0.3)  # hand moves in
place(sfx, wet(tick(0.6), IR_ROOM, 0.2), 20.86, 0.6, 0.1)                       # fingertips on glass
place(sfx, wet(filt(noise(int(0.12 * SR)), "band", [800, 3000]) * np.exp(-t_(int(0.12 * SR)) * 30) * 0.4, IR_ROOM, 0.2), 21.0, 0.6)  # lift off saucer
place(sfx, wet(tiny_horn(1.0), IR_GLASS, 0.3), 21.12, 0.55, 0.1)               # the city protests: beep-beep
place(sfx, wet(slurp(0.62, 1.0), IR_ROOM, 0.18), 21.55, 0.7, 0.0)             # Persian-style sip
place(sfx, wet(slurp(0.25, 0.6), IR_ROOM, 0.18), 22.22, 0.5, 0.0)
place(sfx, wet(clink(1.0), IR_ROOM, 0.25), 22.5, 0.55, 0.05)                  # set down, empty
place(sfx, filt(whoosh(0.35, 1200, 300, 0.2), "low", 3000), 22.65, 0.4, 0.4)
sfx[int(23.0 * SR):] *= 0.0

# ===================== MIX =====================
def write(path, x):
    x = np.clip(x, -1, 1); d = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())
mix = music * 0.85 + sfx * 0.9 + amb * 1.0
mix -= 0.0
# master: gentle glue compression + loudness target + soft ceiling
def k_weight(x):  # ITU-R BS.1770 K-weighting, exact coefficients for 48 kHz
    y = signal.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x, axis=0)
    return signal.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], y, axis=0)
def lufs(x):
    y = k_weight(x); blk = int(0.4 * SR); hop = int(0.1 * SR); L = []
    for i in range(0, len(y) - blk, hop):
        p = np.mean(np.sum(y[i:i + blk] ** 2, 1)); L.append(-0.691 + 10 * np.log10(p + 1e-12))
    L = np.array(L); L = L[L > -70]; rel = 10 * np.log10(np.mean(10 ** (L / 10))) - 10; L = L[L > rel]
    return 10 * np.log10(np.mean(10 ** (L / 10)))
loud = lufs(mix); gain = 10 ** ((-14.0 - loud) / 20)
mix *= gain
ceiling = 10 ** (-1.8 / 20)
mix = np.where(np.abs(mix) < 0.7 * ceiling, mix, np.sign(mix) * (0.7 * ceiling + (ceiling - 0.7 * ceiling) * np.tanh((np.abs(mix) - 0.7 * ceiling) / (0.3 * ceiling))))
fade = np.ones(N); fade[-int(0.03 * SR):] = np.linspace(1, 0, int(0.03 * SR)); mix *= fade[:, None]
for name, bus in (("music", music * 0.85 * gain), ("sfx", sfx * 0.9 * gain), ("ambience", amb * gain)): write(os.path.join(OUT, f"stem_{name}.wav"), bus)
write(os.path.join(OUT, "mix_master.wav"), mix)
print(f"pre-gain loudness {loud:.2f} LUFS(approx) -> gain {20*np.log10(gain):+.2f} dB; peak {np.max(np.abs(mix)):.3f}")
