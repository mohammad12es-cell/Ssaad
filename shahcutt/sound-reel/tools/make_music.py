#!/usr/bin/env python3
"""Procedural music for «بی‌صدا یا باصدا؟» -> assets/audio/music.wav (48 kHz stereo, 24-bit).

120 BPM, 1 bar = 2.0 s from t = 0. Sections follow the scene table (tools/scenes.json):
  hook full groove | card A filtered | clip A full groove | dead: tape-stop to a thin pad | rule 1 kick+hats+bass |
  rule 2 full groove + riser, TOTAL silence 18.45-19.0, drop at 19.0 | rule 3 full groove (ducked in the mix) |
  card B filtered | clip B = an exact copy of clip A's music | CTA lighter groove, low-pass fade to silence at 32.5.
"""
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SC = json.load(open(os.path.join(ROOT, "tools", "scenes.json")))
SR, BEAT = 48000, 0.5
DUR = SC["total"]; N = int(DUR * SR)
CLIP_A, CLIP_B, CLIP_LEN = SC["clipA"], SC["clipB"], SC["clipLen"]
SIL0, DROP = SC["silence"], SC["drop"]
rng = np.random.default_rng(31)


def xs(d): return np.arange(int(d * SR)) / SR
def note(m): return 440.0 * 2 ** ((m - 69) / 12)


def onepole_lp(x, fc):
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y


def kick():
    x = xs(0.42); f = 48 + 130 * np.exp(-x * 34)
    b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
    return np.tanh((b + rng.uniform(-1, 1, len(x)) * np.exp(-x * 700) * 0.3) * 1.8) / np.tanh(1.8)


def hat(d=0.05):
    x = xs(d); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(3) / 3, "same"); return s * np.exp(-x * 85)


def clap():
    x = xs(0.24); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(8) / 8, "same")
    e = sum(np.exp(-np.clip(x - o, 0, None) * 50) * (x >= o) for o in (0, 0.01, 0.021)) / 3
    return np.convolve(s, np.ones(3) / 3, "same") * e


def sub(m, d):
    x = xs(d); f = note(m)
    y = np.sin(2 * np.pi * f * x) + 0.25 * np.sin(4 * np.pi * f * x) + 0.1 * np.sin(6 * np.pi * f * x)
    return np.tanh(y * np.minimum(1, x / 0.005) * np.minimum(1, (d - x) / 0.02) * 1.6) * 0.8


def stab(ms, d=0.22):  # short bright chord stab, the hook of the groove
    x = xs(d); y = sum(np.sign(np.sin(2 * np.pi * note(m) * x)) * 0.3 + np.sin(2 * np.pi * note(m) * x) for m in ms)
    return y / len(ms) * np.exp(-x * 14) * np.minimum(1, x / 0.003)


def pad(ms, d, side):
    x = xs(d); y = np.zeros(len(x))
    for m in ms:
        for det in (-0.1, 0.09):
            f = note(m) * 2 ** ((det + side * 0.04) / 12)
            y += sum(np.sin(2 * np.pi * f * k * x + k) / k for k in (1, 2, 3))
    return y / (2 * len(ms)) * np.minimum(1, x / 0.3) * np.minimum(1, (d - x) / 0.3)


L = {k: np.zeros((N, 2)) for k in ("kick", "clap", "hat", "bass", "stab", "pad", "fx")}


def put(k, sig, t, g=1.0, pan=0.0):
    s = int(round(t * SR)); e = min(N, s + len(sig))
    if e <= s or s < 0: return
    sig = sig[: e - s] * g
    L[k][s:e, 0] += sig * np.sqrt(0.5 * (1 - pan)); L[k][s:e, 1] += sig * np.sqrt(0.5 * (1 + pan))


PROG = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]  # Am F C G, 1 bar each
nbar = int(np.ceil(DUR / 2.0))
for bar in range(nbar):
    t = bar * 2.0; root, ch = PROG[bar % 4]
    put("pad", pad(ch, 2.4, -1), t, 1.0, -0.6); put("pad", pad(ch, 2.4, 1), t, 1.0, 0.6)
    for b in range(4):
        tb = t + b * BEAT
        put("kick", kick(), tb)
        if b in (1, 3): put("clap", clap(), tb, 1.0, 0.05)
        put("hat", hat(), tb + 0.25, 1.0, 0.3); put("hat", hat(0.03), tb + 0.125, 0.3, -0.3); put("hat", hat(0.03), tb + 0.375, 0.3, -0.3)
        for h in range(4):  # 16th-note sub, root with an octave jump
            if h == 0 and b in (0, 2): continue  # leave room for the kick
            put("bass", sub(root - 12 + (12 if h == 3 else 0), BEAT / 4 * 0.9), tb + h * BEAT / 4)
    for o in (0.0, 0.75, 1.5):  # syncopated stabs
        put("stab", stab([m + 12 for m in ch]), t + o, 1.0, 0.2 if o else -0.2)

# riser into the silence, then the drop
x = xs(1.0); u = x / 1.0
riser = (np.sin(2 * np.pi * np.cumsum(200 + 1400 * u ** 2.3) / SR) * 0.35 + rng.uniform(-1, 1, len(x)) * 0.45) * u ** 2.4
riser = onepole_lp(riser, 500 + 7000 * u ** 2)
put("fx", riser, SIL0 - 1.0, 0.55)
x = xs(2.4); f = 32 + 85 * np.exp(-x * 9)
put("fx", np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.2) * 1.8), DROP, 1.0)
x = xs(2.6); s = rng.uniform(-1, 1, len(x)); put("fx", (s - np.convolve(s, np.ones(2) / 2, "same")) * np.exp(-x * 1.8), DROP, 0.3)


def win(a, b, ramp=0.02):
    m = np.zeros(N); s, e = int(a * SR), min(N, int(b * SR)); r = int(ramp * SR)
    if e > s:
        m[s:e] = 1; k = min(r, (e - s) // 2)
        if k: m[s:s + k] = np.linspace(0, 1, k); m[e - k:e] = np.linspace(1, 0, k)
    return m


S = {s["id"]: s for s in SC["scenes"]}
def sc(i): return S[i]["start"], S[i]["end"]

full = ["hook", "clipA", "r2", "r3", "clipB"]
G = {k: np.zeros(N) for k in L}
for i in full:
    a, b = sc(i)
    for k, g in (("kick", 0.8), ("clap", 0.3), ("hat", 0.2), ("bass", 0.42), ("stab", 0.16), ("pad", 0.22)):
        G[k] += win(a, b, 0.01) * g
for i in ("cardA", "cardB"):
    a, b = sc(i); G["pad"] += win(a, b, 0.02) * 0.3; G["bass"] += win(a, b, 0.02) * 0.18; G["hat"] += win(a, b, 0.02) * 0.08
a, b = sc("dead"); G["pad"] += win(a, b, 0.05) * 0.22
a, b = sc("three"); G["pad"] += win(a, b, 0.05) * 0.26; G["kick"] += win(a, b) * 0.5
a, b = sc("r1")
for k, g in (("kick", 0.7), ("hat", 0.18), ("bass", 0.36), ("pad", 0.2)):
    G[k] += win(a, b, 0.01) * g
a, b = sc("cta")
for k, g in (("kick", 0.7), ("hat", 0.18), ("bass", 0.34), ("stab", 0.12), ("pad", 0.24)):
    G[k] += win(a, b, 0.01) * g
G["fx"][:] = 1.0
mix = sum(L[k] * G[k][:, None] for k in L)

# filters: cards and dead/three muffled, CTA closes down to the loop
t = np.arange(N) / SR
fc = np.full(N, 12000.0)
for i, f in (("cardA", 700), ("cardB", 700), ("dead", 500), ("three", 900)):
    a, b = sc(i); fc[(t >= a) & (t < b)] = f
a, b = sc("cta"); m = (t >= b - 0.9); fc[m] = np.interp(t[m], [b - 0.9, b], [12000, 300])
mix = np.stack([onepole_lp(mix[:, c], fc) for c in (0, 1)], 1)

# tape-stop as the clip «dies»: the music under it slows to a stop
a, b = sc("dead"); s0 = int(a * SR); m = int(0.5 * SR); seg = mix[s0: s0 + 2 * m].copy()
rate = np.linspace(1, 0, m) ** 1.3; pos = np.clip(np.cumsum(rate), 0, len(seg) - 2); i0 = pos.astype(int); fr = (pos - i0)[:, None]
ts = (seg[i0] * (1 - fr) + seg[i0 + 1] * fr) * (np.linspace(1, 0, m) ** 0.5)[:, None]
mix[s0: s0 + m] = ts + mix[s0: s0 + m] * win(a, a + 0.5)[s0: s0 + m, None] * 0  # replace
pad_only = (L["pad"] * 0.22)[s0 + m: int(b * SR)]
mix[s0 + m: int(b * SR)] = onepole_lp(pad_only[:, 0], 500)[:, None] * np.linspace(0, 1, len(pad_only))[:, None]

# TOTAL silence before the hit
mix[int(SIL0 * SR): int(DROP * SR)] = 0
fade = int(0.01 * SR); mix[int(SIL0 * SR) - fade: int(SIL0 * SR)] *= np.linspace(1, 0, fade)[:, None]

# clip B gets exactly clip A's music
na = int(CLIP_LEN * SR); A0, B0 = int(CLIP_A * SR), int(CLIP_B * SR); xf = int(0.015 * SR)
seg = mix[A0: A0 + na].copy(); env = np.ones(na); env[:xf] = np.linspace(0, 1, xf); env[-xf:] = np.linspace(1, 0, xf)
mix[B0: B0 + na] = mix[B0: B0 + na] * (1 - env[:, None]) + seg * env[:, None]

mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
pcm = (np.clip(mix, -1, 1) * (2 ** 23 - 1)).astype(np.int32).reshape(-1)
b3 = np.zeros((len(pcm), 3), np.uint8)
for k in range(3): b3[:, k] = (pcm >> (8 * k)) & 0xFF
with wave.open(os.path.join(ROOT, "assets", "audio", "music.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b3.tobytes())
print(f"music.wav {DUR}s")
