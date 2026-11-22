#!/usr/bin/env python3
"""Procedural music bed for viral-reel (decision 7: minimal electronic with a drop).

120 BPM, 1 bar = 2.0 s, so the drop lands on a downbeat at 22.0 s (bar 11) and the bed
ends on a decaying tail at 30.0 s for the loop back to frame 0.

Arrangement (times in s; cues from vo/cues.json where a section follows the voice):
  0.00-4.95  no music (hook keeps its SFX; v1 is total silence)
  4.95       soft pulse + pad (fix 1)
  9.0        hats (fix 2)
  13.0       pluck arp (fix 3)
  t_sound    «و صدا»: kick + sub bass enter (fix 4, the mute icon turns into a waveform)
  21.0-22.0  riser; 21.75 everything but the riser cuts out
  22.0       DROP: impact + full groove + clap
  29.0-30.0  low-pass sweep down + fade to a reverb tail

out: assets/audio/music.wav (48 kHz stereo, 24-bit)
"""
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 30.0
BEAT = 0.5
N = int(DUR * SR)
rng = np.random.default_rng(22)

cues = {}
cp = os.path.join(ROOT, "vo", "cues.json")
if os.path.exists(cp):
    cues = json.load(open(cp, encoding="utf-8"))
T_SOUND = cues.get("tSound", 20.4)       # «و صدا» onset
T_DROP = 22.0


def xs(d): return np.arange(int(d * SR)) / SR
def note(m): return 440.0 * 2 ** ((m - 69) / 12)


def onepole_lp(x, fc):
    """one-pole low-pass; fc may be a per-sample array"""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y


def hp(x, fc):
    return x - onepole_lp(x, fc)


# ---------------------------------------------------------------- voices
def kick():
    x = xs(0.45); f = 46 + 120 * np.exp(-x * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 6.5)
    clk = rng.uniform(-1, 1, len(x)) * np.exp(-x * 600) * 0.25
    return np.tanh((body + clk) * 1.6) / np.tanh(1.6)


def soft_kick():  # the fix-1 pulse: muffled, round
    x = xs(0.35); f = 44 + 50 * np.exp(-x * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)


def hat(d=0.05):
    x = xs(d); s = rng.uniform(-1, 1, len(x))
    s = s - np.convolve(s, np.ones(3) / 3, "same")
    return s * np.exp(-x * 80)


def clap():
    x = xs(0.25); s = rng.uniform(-1, 1, len(x))
    s = s - np.convolve(s, np.ones(8) / 8, "same")
    s = np.convolve(s, np.ones(3) / 3, "same")
    e = sum(np.exp(-np.clip(x - o, 0, None) * 55) * (x >= o) for o in (0, 0.011, 0.022)) / 3
    return s * e


def sub(m, d):
    x = xs(d); f = note(m)
    y = np.sin(2 * np.pi * f * x) + 0.18 * np.sin(4 * np.pi * f * x)
    env = np.minimum(1, x / 0.006) * np.minimum(1, (d - x) / 0.03)
    return np.tanh(y * env * 1.4) * 0.8


def pluck(m, d=0.45):
    x = xs(d); f = note(m)
    mod = np.sin(2 * np.pi * f * 2 * x) * 1.6 * np.exp(-x * 14)
    return np.sin(2 * np.pi * f * x + mod) * np.exp(-x * 7) * np.minimum(1, x / 0.002)


def pad_chord(ms, d, side):
    x = xs(d); y = np.zeros(len(x))
    for m in ms:
        f = note(m)
        for det, ph in ((-0.12, 0.3), (0.1, 1.9)):
            ff = f * 2 ** ((det + side * 0.05) / 12)
            y += sum(np.sin(2 * np.pi * ff * k * x + ph * k) / k for k in (1, 2, 3, 4))
    env = np.minimum(1, x / 0.35) * np.minimum(1, (d - x) / 0.35)
    return y / (2 * len(ms)) * env


def riser(d):
    x = xs(d); u = x / d
    tone = np.sin(2 * np.pi * np.cumsum(220 + 1200 * u ** 2.2) / SR) * 0.35
    nz = rng.uniform(-1, 1, len(x))
    return (tone + nz * 0.5) * u ** 2.5, 400 + 7000 * u ** 2


def impact():
    x = xs(2.2); f = 34 + 80 * np.exp(-x * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.4)
    return np.tanh(boom * 1.8) / np.tanh(1.8)


def crash(d=2.6):
    x = xs(d); s = rng.uniform(-1, 1, len(x)); s = s - np.convolve(s, np.ones(2) / 2, "same")
    return s * np.exp(-x * 1.9) * np.minimum(1, x / 0.003)


# ---------------------------------------------------------------- arrangement
L = {k: np.zeros((N, 2)) for k in ("pulse", "kick", "clap", "hat", "bass", "arp", "pad", "fx")}


def put(k, sig, t, g=1.0, pan=0.0):
    s = int(round(t * SR)); e = min(N, s + len(sig))
    if e <= s or s < 0: return
    sig = sig[: e - s] * g
    L[k][s:e, 0] += sig * np.sqrt(0.5 * (1 - pan)); L[k][s:e, 1] += sig * np.sqrt(0.5 * (1 + pan))


def win(a, b, ramp=0.03):
    """gain mask 1 inside [a,b) with short ramps"""
    m = np.zeros(N); s, e = int(a * SR), min(N, int(b * SR)); r = int(ramp * SR)
    if e > s:
        m[s:e] = 1
        k = min(r, (e - s) // 2)
        if k: m[s:s + k] = np.linspace(0, 1, k); m[e - k:e] = np.linspace(1, 0, k)
    return m


PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (60, [60, 64, 67]), (55, [55, 59, 62])]  # Am F C G
for bar in range(15):
    t = bar * 2.0
    root, ch = PROG[bar % 4]
    put("pad", pad_chord([m for m in ch], 2.4, -1), t, 1.0, -0.6)
    put("pad", pad_chord([m for m in ch], 2.4, 1), t, 1.0, 0.6)
    for b in range(4):
        tb = t + b * BEAT
        put("pulse", soft_kick(), tb, 1.0)
        put("kick", kick(), tb, 1.0)
        if b in (1, 3): put("clap", clap(), tb, 1.0, 0.05)
        put("hat", hat(), tb + BEAT / 2, 1.0, 0.25); put("hat", hat(0.03), tb + BEAT * 0.75, 0.35, -0.25)
        for h in (0, 1):  # offbeat-pumped sub, octave jump on the last 8th of the bar
            m = root - 24 + (12 if (b == 3 and h == 1) else 0)
            put("bass", sub(m, BEAT / 2 * 0.92), tb + h * BEAT / 2, 1.0)
    arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
    for j, m in enumerate(arp):
        put("arp", pluck(m + 12), t + j * BEAT / 2, 1.0, (-0.45, 0.45)[j % 2])

# arp ping-pong echo (dotted 8th)
d = int(0.375 * SR); echo = np.zeros_like(L["arp"])
echo[d:, 0] = L["arp"][:-d, 1] * 0.35; echo[2 * d:, 1] = L["arp"][:-2 * d, 0] * 0.2
L["arp"] += echo

r, fc = riser(1.0)
rs = int(21.0 * SR); seg = onepole_lp(r, fc)
L["fx"][rs:rs + len(seg), 0] += seg * 0.5; L["fx"][rs:rs + len(seg), 1] += seg * 0.5
put("fx", impact(), T_DROP, 1.1)
put("fx", crash(), T_DROP, 0.35, 0.0)

# ---------------------------------------------------------------- automation
cut = win(0, 21.75) + win(T_DROP, 30.0)            # pre-drop gap 21.75-22.0
G = {
    "pad":   (win(4.95, 29.95, 0.6) * 0.32) * np.minimum(1, cut + 0.0),
    "pulse": win(4.95, T_SOUND, 0.02) * 0.55,
    "hat":   (win(9.0, T_SOUND, 0.05) * 0.10 + win(T_SOUND, 30.0, 0.05) * 0.22) * cut,
    "arp":   (win(13.0, T_SOUND, 0.05) * 0.10 + win(T_SOUND, 30.0, 0.05) * 0.17) * cut,
    "kick":  (win(T_SOUND, 21.75, 0.01) * 0.55 + win(T_DROP, 29.0, 0.01) * 0.85),
    "bass":  (win(T_SOUND, 21.75, 0.01) * 0.30 + win(T_DROP, 29.5, 0.01) * 0.42),
    "clap":  win(T_DROP, 29.0, 0.01) * 0.32,
    "fx":    np.ones(N),
}
mix = np.zeros((N, 2))
for k, sig in L.items():
    mix += sig * G[k][:, None]

# pad / hats darker before the drop, open after it
t = np.arange(N) / SR
fc = np.interp(t, [0, 9, 17, 21, 22, 29, 30], [700, 900, 1300, 3000, 9000, 9000, 500])
mix = np.stack([onepole_lp(mix[:, c], fc) for c in (0, 1)], 1)

# cheap stereo room: two decorrelated decaying-noise IRs, FFT convolution
ir_n = int(1.2 * SR); xi = np.arange(ir_n) / SR
irs = [rng.uniform(-1, 1, ir_n) * np.exp(-xi * 4.5) for _ in (0, 1)]
for ir in irs: ir[: int(0.012 * SR)] = 0
wet = np.zeros_like(mix)
for c in (0, 1):
    nfft = 1 << int(np.ceil(np.log2(N + ir_n)))
    y = np.fft.irfft(np.fft.rfft(hp(mix[:, c], 250), nfft) * np.fft.rfft(irs[c], nfft), nfft)[:N]
    wet[:, c] = y / np.sqrt(np.sum(irs[c] ** 2))
mix = mix + wet * 0.16

mix *= np.interp(t, [0, 29.0, 30.0], [1, 1, 0.0])[:, None] ** 1.5
mix[t < 4.95] = 0
peak = np.max(np.abs(mix)); mix = mix / peak * 0.89

out = os.path.join(ROOT, "assets", "audio", "music.wav")
pcm = (np.clip(mix, -1, 1) * (2 ** 23 - 1)).astype(np.int32)
b = np.zeros((N * 2, 3), dtype=np.uint8); flat = pcm.reshape(-1)
for k in range(3): b[:, k] = (flat >> (8 * k)) & 0xFF
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b.tobytes())
print(f"music.wav {DUR}s, t_sound={T_SOUND:.2f}, drop={T_DROP}")
