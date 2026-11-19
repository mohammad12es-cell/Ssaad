#!/usr/bin/env python3
"""ROYAGRAM launch film — original procedural score, sound design and mix.
Everything is synthesised here from oscillators and noise (no samples, no copyrighted material).
usage: python build_audio.py OUT_DIR [--cut]   (needs numpy, scipy, soundfile; ffmpeg on PATH for loudness)
Writes: music.wav, sfx.wav, vo.wav, mix.wav (48 kHz / 24-bit stereo) — or cutdown_mix.wav with --cut
"""
import sys, os, json, subprocess, numpy as np, soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

SR = 48000
DUR = 45.0
N = int(SR * (DUR + 0.5))
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(2026)
BPM = 120; BEAT = 60 / BPM
HUSH0, HUSH1 = 41.50, 41.90   # controlled silence before the brand reveal

def buf(): return np.zeros((N, 2))
def tt(n): return np.arange(n) / SR
def note(m): return 440.0 * 2 ** ((m - 69) / 12)
def sos(kind, f, order=2, sr=SR):
    f = np.clip(np.atleast_1d(f), 20, sr / 2 - 100)
    return signal.butter(order, f if len(f) > 1 else f[0], btype=kind, fs=sr, output='sos')
def filt(x, kind, f, order=2): return signal.sosfilt(sos(kind, f, order), x, axis=0)
def env_adsr(n, a, d, s, r, sus_len=None):
    a, d, r = int(a * SR) + 1, int(d * SR) + 1, int(r * SR) + 1
    sl = max(0, n - a - d - r) if sus_len is None else max(0, int(sus_len * SR))
    e = np.concatenate([np.linspace(0, 1, a), np.linspace(1, s, d), np.full(sl, s), np.linspace(s, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]
def place(dst, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if x.ndim == 1 and dst.ndim == 2: x = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], 1) * np.sqrt(2)
    j = min(N, i + len(x));
    if i < 0: x = x[-i:]; i = 0
    dst[i:j] += x[: j - i] * gain
def saw(f, n, phase=0.0):
    ph = np.cumsum(np.broadcast_to(f, (n,)) / SR) + phase
    return 2 * (ph % 1.0) - 1
def tvlp(x, cut_curve, block=512):
    """time-varying low-pass via blockwise state-carrying biquads"""
    y = np.zeros_like(x); zi = None
    for b in range(0, len(x), block):
        s = sos('low', cut_curve[min(b, len(cut_curve) - 1)])
        if zi is None: zi = np.zeros((s.shape[0], 2) + x.shape[1:])
        y[b:b + block], zi = signal.sosfilt(s, x[b:b + block], axis=0, zi=zi)
    return y
def reverb_ir(seconds, decay, seed=1, bright=6000):
    r = np.random.default_rng(seed); n = int(seconds * SR)
    e = np.exp(-np.arange(n) / SR * decay)
    ir = np.stack([r.standard_normal(n) * e, r.standard_normal(n) * e], 1)
    ir = filt(ir, 'low', bright); ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum() / 2)
IR_HALL = reverb_ir(4.2, 1.6, 3, 5200)
IR_ROOM = reverb_ir(1.2, 4.5, 4, 8000)
def verb(x, ir, wet):
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x + y * wet
def curve(points, n=N):
    t = np.array([p[0] for p in points]); v = np.array([p[1] for p in points])
    return np.interp(tt(n), t, v)

# ---------------------------------------------------------------- MUSIC
def music():
    M = buf(); T = tt(N)
    # Sub drone (D1) + fifth, swelling across the film
    dr = np.sin(2 * np.pi * note(26) * T) + 0.35 * np.sin(2 * np.pi * note(33) * T) + 0.2 * np.sin(2 * np.pi * note(38) * T + np.sin(T * 0.3))
    dr *= curve([(0, 0.0), (0.4, 0.28), (4, 0.32), (11, 0.4), (25, 0.45), (38, 0.55), (41.4, 0.7)])
    place(M, dr * 0.5, 0)
    # metallic resonance bed for the hook (inharmonic, slow beating)
    met = sum(np.sin(2 * np.pi * f * T + p) * a for f, a, p in [(146.8, 0.3, 0), (293.0, 0.15, 1), (441.3, 0.08, 2), (627.0, 0.05, 3), (912.0, 0.03, 4)])
    met *= curve([(0, 0), (0.3, 0.25), (1.5, 0.45), (1.6, 0.1), (4.2, 0.05), (5, 0)]) * (1 + 0.3 * np.sin(2 * np.pi * 0.7 * T))
    place(M, np.stack([met, np.roll(met, 900)], 1) * 0.35, 0)

    chords = {  # D minor world
        'Dm': [50, 53, 57, 62], 'Bb': [46, 50, 53, 58], 'Gm': [43, 50, 55, 58], 'A': [45, 52, 57, 61],
        'F': [41, 48, 53, 57], 'C': [48, 52, 55, 60], 'Dm9': [50, 53, 57, 64], 'Bbmaj7': [46, 50, 53, 57],
    }
    prog = [(4, 'Dm'), (8, 'Bb'), (12, 'Gm'), (16, 'A'), (18, 'Dm'), (20, 'Bb'), (22, 'Gm'), (24, 'A'), (25, 'Dm'), (28, 'Bb'), (31, 'Dm'), (33, 'Bb'), (35, 'Gm'), (37, 'A'), (38, 'Bb'), (39, 'C'), (40, 'Dm'), (41.5, None)]
    # String/synth pad: detuned saws, slow attack, opening filter
    pad = np.zeros((N, 2))
    for (t0, ch), (t1, _) in zip(prog[:-1], prog[1:]):
        n = int((t1 - t0 + 1.2) * SR)
        for k, m in enumerate(chords[ch]):
            for d, pan in [(-0.08, -0.7), (0.0, 0.0), (0.09, 0.7)]:
                f = note(m + 12 if t0 >= 38 and k > 1 else m) * 2 ** (d / 12)
                x = saw(f, n, rng.random()) * env_adsr(n, 0.7, 0.4, 0.85, 1.2, sus_len=t1 - t0 - 1.1)
                place(pad, x * 0.06, t0, pan=pan)
    pad = tvlp(pad, curve([(0, 600), (4, 700), (11, 1100), (18, 1800), (25, 1300), (31, 2600), (38, 3800), (41.5, 5200)]))
    pad *= curve([(0, 0), (4, 0.0), (5, 0.55), (11, 0.6), (18, 0.75), (25, 0.6), (31, 0.85), (38, 1.1), (41.4, 1.25)])[:, None]
    M += verb(pad, IR_HALL, 0.45)

    # choir-ish formant layer for the final peak
    ch = np.zeros((N, 2))
    for t0, c in [(38, 'Bb'), (39, 'C'), (40, 'Dm')]:
        n = int((1.0 + 0.6) * SR) if t0 < 40 else int(1.7 * SR)
        for m in chords[c]:
            x = saw(note(m + 12) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * tt(n))), n)
            v = filt(x, 'band', [600, 900]) + 0.6 * filt(x, 'band', [1100, 1400])
            place(ch, v * env_adsr(n, 0.25, 0.2, 0.9, 0.5) * 0.18, t0, pan=rng.uniform(-0.5, 0.5))
    M += verb(ch, IR_HALL, 0.8)

    # Bass ostinato — 8ths, D minor, filter opening with the story
    bass = np.zeros(N)
    pat = [38, 38, 50, 38, 41, 38, 48, 33]
    roots = {'Dm': 0, 'Bb': -4, 'Gm': -7, 'A': -5, 'C': -2, 'F': -9}
    def root_at(t):
        r = 0
        for t0, c in prog[:-1]:
            if t >= t0 and c: r = roots.get(c[:2] if c[:2] in roots else c[:1], 0)
        return r
    t = 4.0; i = 0
    while t < HUSH0 - 0.01:
        step = BEAT / 2 if t < 31 or t >= 38 else BEAT / 4
        if 25 <= t < 31: step = BEAT / 2
        m = pat[i % 8] + root_at(t); n = int(step * SR * 0.95)
        x = saw(note(m), n) * 0.7 + 0.5 * np.sign(np.sin(2 * np.pi * note(m - 12) * tt(n)))
        acc = 1.0 if i % 4 == 0 else 0.72
        place(bass, x * env_adsr(n, 0.004, 0.12, 0.5, 0.03) * acc * 0.3, t)
        t += step; i += 1
    bass = signal.sosfilt(sos('low', 180), bass)  # warmth
    bassm = np.stack([bass, bass], 1)
    bassm = tvlp(bassm, curve([(4, 220), (11, 380), (18, 700), (25, 420), (31, 1100), (38, 1500), (41.5, 2000)]))
    bassm *= curve([(4, 0), (5.5, 0.8), (11, 0.9), (18, 1.0), (41.4, 1.1)])[:, None]
    M += bassm

    # Arpeggiated pluck 16ths with ping-pong delay (11 -> 38)
    arp = np.zeros((N, 2)); t = 11.0; i = 0
    while t < 38.0:
        c = 'Dm'
        for t0, cc in prog[:-1]:
            if t >= t0 and cc: c = cc
        notes = chords[c]; m = notes[[0, 2, 1, 3, 2, 1][i % 6]] + 12
        n = int(0.22 * SR); x = (saw(note(m), n) + saw(note(m) * 1.003, n)) * np.exp(-tt(n) * 18)
        place(arp, filt(x, 'low', 2400) * 0.07, t, pan=0.5 if i % 2 else -0.5)
        t += BEAT / 4 if t < 25 or t >= 31 else BEAT / 2; i += 1
    d = int(0.375 * SR); arpd = arp.copy(); arpd[d:, 0] += arp[:-d, 1] * 0.45; arpd[2 * d:, 1] += arp[:-2 * d, 0] * 0.3
    M += verb(arpd * curve([(11, 0), (12, 1), (25, 0.6), (31, 1), (38, 0.7)])[:, None], IR_HALL, 0.3)

    # Drums
    dr = np.zeros((N, 2))
    def kick(t, g=1.0):
        n = int(0.5 * SR); tn = tt(n); f = 45 + 110 * np.exp(-tn * 28)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tn * 7) + 0.3 * filt(rng.standard_normal(n), 'high', 2500) * np.exp(-tn * 120)
        place(dr, np.tanh(x * 1.6) * 0.55 * g, t)
    def snare(t, g=1.0):
        n = int(0.4 * SR); tn = tt(n)
        x = filt(rng.standard_normal(n), 'band', [1200, 7000]) * np.exp(-tn * 16) + 0.5 * np.sin(2 * np.pi * 190 * tn) * np.exp(-tn * 22)
        place(dr, verb(np.stack([x, x], 1), IR_ROOM, 0.5) * 0.28 * g, t)
    def hat(t, g=1.0, open_=False):
        n = int((0.25 if open_ else 0.05) * SR); tn = tt(n)
        x = filt(rng.standard_normal(n), 'high', 8000) * np.exp(-tn * (14 if open_ else 90))
        place(dr, x * 0.07 * g, t, pan=0.3)
    def tom(t, f, g=1.0):
        n = int(0.6 * SR); tn = tt(n); x = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-tn * 20))) / SR) * np.exp(-tn * 6)
        place(dr, verb(np.stack([x, x], 1), IR_HALL, 0.4) * 0.3 * g, t)
    b = 0
    t = 7.0
    while t < HUSH0 - 0.05:
        beat = round((t - 7.0) / BEAT)
        if t < 11: (kick(t, 0.55) if beat % 4 == 0 else None)
        elif t < 18: (kick(t, 0.8) if beat % 2 == 0 else None); (snare(t, 0.6) if beat % 4 == 2 else None); hat(t + BEAT / 2, 0.5)
        elif t < 25: kick(t, 0.95); (snare(t) if beat % 2 == 1 else None); hat(t + BEAT / 2); hat(t + BEAT / 4, 0.4); hat(t + 3 * BEAT / 4, 0.4)
        elif t < 31: (kick(t, 0.85) if beat % 2 == 0 else None); (snare(t, 0.7) if beat % 4 == 2 else None)
        elif t < 38: kick(t, 1.0); (snare(t, 1.05) if beat % 2 == 1 else None); [hat(t + k * BEAT / 4, 0.7 if k else 0.4) for k in range(4)]
        else: kick(t, 1.1); (snare(t, 1.1) if beat % 2 == 1 else None); hat(t + BEAT / 2, 0.8, open_=True)
        t += BEAT
    for t0 in [24.0, 30.0, 37.0, 40.5]:
        for k, f in enumerate([180, 150, 120, 95]): tom(t0 + k * BEAT / 4 * (1 if t0 != 40.5 else 1.0), f, 0.9)
    M += dr

    # Brass stabs (detuned saws through formant) on big moments
    for t0, c in [(18.75, 'Dm'), (31.0, 'Dm'), (34.7, 'Bb'), (38.0, 'Bb'), (40.0, 'Dm')]:
        n = int(0.9 * SR)
        for m in chords[c]:
            x = saw(note(m), n) + saw(note(m) * 1.006, n)
            x = filt(x, 'low', 1800) * env_adsr(n, 0.01, 0.25, 0.35, 0.4)
            place(M, verb(np.stack([x, x], 1), IR_HALL, 0.5) * 0.05, t0)

    # controlled silence: hard gate everything (incl. tails)
    g = np.ones(N); i0, i1 = int(HUSH0 * SR), int(HUSH1 * SR); f = int(0.025 * SR)
    g[i0 - f:i0] = np.linspace(1, 0, f); g[i0:] = 0
    M *= g[:, None]

    # Ending: Dm(add9) bloom + bell motif after the reveal
    end = np.zeros((N, 2)); n = int(3.3 * SR)
    for m in [38, 50, 57, 62, 64, 69]:
        for dd, pan in [(-0.06, -0.6), (0.06, 0.6)]:
            x = saw(note(m) * 2 ** (dd / 12), n) * env_adsr(n, 0.35, 0.5, 0.7, 1.6)
            place(end, filt(x, 'low', 1600 if m > 50 else 600) * 0.05, HUSH1, pan=pan)
    for k, m in enumerate([74, 81, 86, 88]):
        nn = int(2.6 * SR); tn = tt(nn)
        x = (np.sin(2 * np.pi * note(m) * tn) + 0.3 * np.sin(2 * np.pi * note(m) * 2.76 * tn) * np.exp(-tn * 3)) * np.exp(-tn * 1.6)
        place(end, x * 0.07, HUSH1 + 0.45 + k * 0.38, pan=[-0.4, 0.4, -0.2, 0.2][k])
    M += verb(end, IR_HALL, 0.7)
    return M

# ---------------------------------------------------------------- SOUND DESIGN
def sfx(cues):
    S = buf()
    def noise(n): return rng.standard_normal(n)
    def boom(t, g=1.0, f0=95, f1=32, dec=2.2):
        n = int(3.0 * SR); tn = tt(n); f = f1 + (f0 - f1) * np.exp(-tn * 6)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tn * dec) + 0.4 * filt(noise(n), 'low', 300) * np.exp(-tn * 5)
        place(S, verb(np.stack([x, x], 1), IR_HALL, 0.25) * 0.75 * g, t)
    def metal(t, g=1.0, base=240.0, dec=2.0):
        n = int(3.5 * SR); tn = tt(n)
        x = sum(np.sin(2 * np.pi * base * r * tn + rng.random() * 6) * np.exp(-tn * dec * (1 + r * 0.4)) * a for r, a in [(1, 1), (2.76, 0.6), (5.40, 0.4), (8.93, 0.25), (13.3, 0.15)])
        x += filt(noise(n), 'band', [2000, 9000]) * np.exp(-tn * 40) * 0.6
        place(S, verb(np.stack([x, np.roll(x, 300)], 1), IR_HALL, 0.4) * 0.18 * g, t)
    def shatter(t, g=1.0, dur=1.6):
        n = int((dur + 0.3) * SR); out = np.zeros((n, 2)); tn = tt(n)
        body = filt(noise(n), 'high', 2500) * np.exp(-tn * 5.5); out += np.stack([body, np.roll(body, 200)], 1) * 0.35
        for k in range(260):  # glass tinkles
            t0 = abs(rng.normal(0, 0.18)) + rng.random() * dur * 0.6 * rng.random(); m = int(0.12 * SR); f = rng.uniform(2200, 11000)
            ping = np.sin(2 * np.pi * f * tt(m)) * np.exp(-tt(m) * rng.uniform(30, 70)) * rng.uniform(0.05, 0.25) * np.exp(-t0 * 1.2)
            i = int(t0 * SR); pan = rng.uniform(-1, 1)
            if i + m < n: out[i:i + m, 0] += ping * (1 - pan) / 2; out[i:i + m, 1] += ping * (1 + pan) / 2
        place(S, verb(out, IR_HALL, 0.35) * 0.55 * g, t)
    def whoosh(t, dur=0.8, g=1.0, f0=300, f1=3000, pan=0.0):
        n = int(dur * SR); x = noise(n); fc = np.geomspace(f0, f1, n)
        y = tvlp(np.stack([x, x], 1), fc, 256); y = y - tvlp(y, fc * 0.3, 256)
        e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2; y *= e[:, None]
        place(S, verb(y, IR_HALL, 0.2) * 0.9 * g, t - dur * 0.6, pan=0)
    def riser(t_end, dur, g=1.0):
        n = int(dur * SR); tn = tt(n); x = filt(noise(n), 'high', 800) * (tn / dur) ** 2.2
        f = 200 * 2 ** (tn / dur * 3); tone = saw(f, n) * (tn / dur) ** 3 * 0.25
        y = np.stack([x + tone, np.roll(x, 400) + tone], 1)
        y = verb(y, IR_HALL, 0.4)[:n]; place(S, filt(y, 'low', 9000) * 0.35 * g, t_end - dur)
    def reverse_swell(t_end, dur=1.2, g=1.0):
        n = int(dur * SR); x = filt(noise(n), 'band', [400, 6000]) * np.exp(-tt(n) * 3.5)
        y = verb(np.stack([x, x], 1), IR_HALL, 1.2)[:n][::-1]
        place(S, y * 0.35 * g, t_end - dur)
    def click(t, g=1.0, f=3200):
        n = int(0.06 * SR); tn = tt(n); x = (np.sin(2 * np.pi * f * tn) + 0.6 * np.sin(2 * np.pi * f * 1.73 * tn)) * np.exp(-tn * 160) + filt(noise(n), 'high', 4000) * np.exp(-tn * 300)
        place(S, verb(np.stack([x, x], 1), IR_ROOM, 0.3) * 0.22 * g, t)
    def liquid(t, dur, g=1.0, density=14):
        n = int(dur * SR); out = np.zeros(n)
        for k in range(int(density * dur)):
            t0 = rng.random() * dur; m = int(0.08 * SR); tn = tt(m); f0 = rng.uniform(300, 900)
            b = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.5 * tn / 0.08)) / SR) * np.exp(-tn * 45) * rng.uniform(0.2, 0.6)
            i = int(t0 * SR);
            if i + m < n: out[i:i + m] += b
        swell = filt(noise(n), 'low', 400) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * tt(n))) * 0.4
        y = np.stack([out + swell, np.roll(out, 700) + swell], 1) * np.sin(np.pi * np.linspace(0, 1, n))[:, None] ** 0.3
        place(S, verb(y, IR_HALL, 0.35) * 0.18 * g, t)
    def splash(t, g=1.0, slow=True):
        n = int(3.0 * SR); tn = tt(n)
        x = filt(noise(n), 'band', [150, 2500] if slow else [500, 8000]) * np.exp(-tn * (1.6 if slow else 6))
        y = verb(np.stack([x, np.roll(x, 500)], 1), IR_HALL, 0.8)
        place(S, y * 0.35 * g, t); liquid(t, 2.5, 0.8 * g, density=30)
    def crackle(t0, t1, g=1.0):
        t = t0
        while t < t1:
            k = (t - t0) / (t1 - t0); click(t, g * (0.2 + 0.8 * k), rng.uniform(1500, 5000)); t += max(0.012, 0.16 * (1 - k) ** 2 * rng.random() + 0.01)
    def hum(t, dur, f=110, g=1.0):
        n = int(dur * SR); tn = tt(n)
        x = sum(np.sin(2 * np.pi * f * h * tn * (1 + 0.002 * np.sin(2 * np.pi * 0.3 * tn * h))) / h for h in [1, 2, 3, 4.01, 6])
        x += filt(noise(n), 'band', [f * 2, f * 8]) * 0.3
        e = np.minimum(1, np.minimum(tn / 0.5, (dur - tn) / 0.8)).clip(0)
        place(S, np.stack([x, np.roll(x, 300)], 1) * e[:, None] * 0.08 * g, t)
    def rumble(t, dur, g=1.0):
        n = int(dur * SR); tn = tt(n); x = filt(noise(n), 'low', 120) * 2 + filt(noise(n), 'band', [200, 900]) * 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * tn))
        e = np.sin(np.pi * tn / dur) ** 0.6; place(S, np.stack([x, np.roll(x, 900)], 1) * e[:, None] * 0.25 * g, t)
    def air(t, dur, g=1.0, f=(300, 2000)):
        n = int(dur * SR); x = filt(noise(n), 'band', list(f)); e = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5
        place(S, np.stack([x, np.roll(x, 1200)], 1) * e[:, None] * 0.05 * g, t)
    def tick(t, g=1.0): click(t, 0.45 * g, 5200)
    def ting(t, g=1.0):
        n = int(2.0 * SR); tn = tt(n); x = sum(np.sin(2 * np.pi * f * tn) * np.exp(-tn * d) for f, d in [(2349, 2.5), (3520, 3.2), (4699, 4)]) * 0.3
        place(S, verb(np.stack([x, x], 1), IR_HALL, 0.6) * 0.12 * g, t)

    F = dict(boom=boom, metal=metal, shatter=shatter, whoosh=whoosh, riser=riser, reverse_swell=reverse_swell, click=click, liquid=liquid,
             splash=splash, crackle=crackle, hum=hum, rumble=rumble, air=air, tick=tick, ting=ting)
    for c in cues:
        kw = {k: v for k, v in c.items() if k not in ('fx', 't', 'note')}
        F[c['fx']](c['t'], **kw) if 't' in c else F[c['fx']](**kw)
    # same controlled silence for the design layer, then reveal hits are added after
    g = np.ones(N); i0 = int(HUSH0 * SR); f = int(0.02 * SR); g[i0 - f:i0] = np.linspace(1, 0, f); g[i0:int(HUSH1 * SR)] = 0
    S *= g[:, None]
    return S, F

def post_reveal(S, F, cues):
    for c in cues:
        kw = {k: v for k, v in c.items() if k not in ('fx', 't', 'note')}
        F[c['fx']](c['t'], **kw)

# ---------------------------------------------------------------- VOICE
def voice(vo_cues, vodir):
    V = buf()
    for c in vo_cues:
        x, sr = sf.read(os.path.join(vodir, c['file']))
        if x.ndim > 1: x = x.mean(1)
        x = signal.resample_poly(x, SR, sr)
        x = filt(x, 'high', 75)
        pres = filt(x, 'band', [2500, 5000]); warm = filt(x, 'band', [120, 300])
        x = x + 0.35 * pres + 0.25 * warm
        # gentle compression
        e = uniform_filter1d(np.abs(x), int(0.02 * SR)) + 1e-6; thr = np.percentile(e, 90) * 0.5
        gr = np.where(e > thr, (thr / e) ** 0.45, 1.0); x = x * gr
        x = x / (np.abs(x).max() + 1e-9) * 0.9
        place(V, x, c['t'])
    V = verb(V, IR_ROOM, 0.08)
    return V

def duck(M, V, depth_db=-7):
    e = uniform_filter1d(np.abs(V).mean(1), int(0.08 * SR)); e = maximum_filter1d(e, int(0.25 * SR))
    k = np.clip(e / (e.max() + 1e-9) * 4, 0, 1); k = uniform_filter1d(k, int(0.15 * SR))
    g = 10 ** (depth_db * k / 20)
    return M * g[:, None]

def limiter(x, ceil_db=-1.6, look=0.004):
    c = 10 ** (ceil_db / 20); L = int(look * SR)
    pk = maximum_filter1d(np.abs(x).max(1), 2 * L + 1)
    gr = np.minimum(1.0, c / (pk + 1e-9))
    gr = minimum_filter1d(gr, 2 * L + 1); gr = uniform_filter1d(gr, 2 * L + 1)
    y = x * gr[:, None]
    return np.clip(y, -c, c)

def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(r.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0]); tp = float(r.split('True peak:')[1].split('Peak:')[1].split('dBFS')[0])
    return I, tp

def master(M, S, V, out, target=-14.0):
    mix = M * 0.85 + S * 1.0
    mix = duck(mix, V) + V * 1.0
    mix = filt(mix, 'high', 25)
    mix = mix[: int(DUR * SR)]
    fo = int(0.3 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    tmp = out + '.tmp.wav'
    for it in range(3):
        y = limiter(mix); sf.write(tmp, y, SR, subtype='PCM_24'); I, tp = lufs(tmp)
        if abs(I - target) < 0.4: break
        mix = mix * 10 ** ((target - I) / 20)
    os.replace(tmp, out); return lufs(out)

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    cues = json.load(open(os.path.join(HERE, 'cues.json')))
    M = music(); S, F = sfx(cues['sfx']); post_reveal(S, F, cues['reveal']); V = voice(cues['vo'], os.path.join(HERE, 'vo'))
    for name, x in [('music', M), ('sfx', S), ('vo', V)]:
        y = x[: int(DUR * SR)]; sf.write(os.path.join(out, f'stem_{name}.wav'), y / (np.abs(y).max() + 1e-9) * 0.89, SR, subtype='PCM_24')
    I, tp = master(M, S, V, os.path.join(out, 'mix.wav'))
    print(f'mix.wav  integrated {I:.1f} LUFS  true-peak {tp:.1f} dBTP')
    # ---- 15-second cutdown: same edit decision list as deliver.py, beat-aligned (120 BPM) so the score stays on the grid
    EDL = json.load(open(os.path.join(HERE, '..', 'src', 'cutdown_edl.json')))
    xf = int(0.02 * SR)
    def cut(x):
        parts = []
        for a, b in EDL['segments']:
            seg = x[int(a * SR):int(b * SR)].copy(); seg[:xf] *= np.linspace(0, 1, xf)[:, None]; seg[-xf:] *= np.linspace(1, 0, xf)[:, None]; parts.append(seg)
        y = np.concatenate(parts); return np.pad(y, ((0, N - len(y)), (0, 0)))
    Mc, Sc = cut(M), cut(S)
    Vc = voice(EDL['vo'], os.path.join(HERE, 'vo'))
    globals()['DUR'] = EDL['duration']
    I, tp = master(Mc, Sc, Vc, os.path.join(out, 'cutdown_mix.wav'))
    print(f'cutdown_mix.wav  integrated {I:.1f} LUFS  true-peak {tp:.1f} dBTP')
