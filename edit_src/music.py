import numpy as np, wave, sys

SR = 44100
BPM = 140
B = 60 / BPM            # one beat
TOTAL_BEATS = 84
N = int(TOTAL_BEATS * B * SR) + SR * 2
rng = np.random.default_rng(7)

def buf(): return np.zeros(N)
def idx(beat): return int(beat * B * SR)
def add(dst, sig, beat, gain=1.0):
    i = idx(beat); j = min(N, i + len(sig))
    if i < N: dst[i:j] += gain * sig[: j - i]

def lowpass(x, cutoff):
    # one-pole lowpass applied twice (vectorised through FFT for speed)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / (1 + (f / cutoff) ** 4) ** 0.5
    return np.fft.irfft(X * H, len(x))

def highpass(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    H = (f / cutoff) ** 4 / (1 + (f / cutoff) ** 4); H = np.sqrt(H)
    return np.fft.irfft(X * H, len(x))

def note(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)

# ---------- instruments ----------
def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 50 + 120 * np.exp(-t * 35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 9)
    click = rng.standard_normal(len(t)) * np.exp(-t * 300) * 0.3
    return np.tanh((s + click) * 2.2) * 0.9

def e808(midi, length):
    t = np.arange(int(length * SR)) / SR
    f0 = note(midi)
    f = f0 * (1 + 1.2 * np.exp(-t * 40))           # pitch drop at the attack
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t * 200) * np.exp(-t * 0.9)
    rel = np.clip((length - t) / 0.05, 0, 1)
    s = np.sin(ph) * env * rel
    return np.tanh(s * 3.0) * 0.75                  # saturation -> audible on phones

def snare():
    t = np.arange(int(0.3 * SR)) / SR
    n = highpass(rng.standard_normal(len(t)), 1800) * np.exp(-t * 16)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)
    clap = np.zeros(len(t))
    for d in (0, 0.011, 0.022):
        k = int(d * SR); clap[k:] += rng.standard_normal(len(t) - k) * np.exp(-t[: len(t) - k] * 60)
    clap = highpass(clap, 1000)
    return np.tanh((n * 0.6 + body * 0.6 + clap * 0.5) * 1.5) * 0.6

def hat(open_=False):
    L = 0.25 if open_ else 0.05
    t = np.arange(int(L * SR)) / SR
    s = highpass(rng.standard_normal(len(t)), 7000) * np.exp(-t * (12 if open_ else 90))
    return s * 0.35

def bell(midi, length=1.2):
    t = np.arange(int(length * SR)) / SR
    f = note(midi)
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 6)
         + 0.25 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 9))
    return s * np.exp(-t * 3.2) * np.minimum(1, t * 400) * 0.22

def pad(midis, length):
    t = np.arange(int(length * SR)) / SR
    s = np.zeros(len(t))
    for m in midis:
        for det in (-0.12, 0, 0.11):
            f = note(m) * 2 ** (det / 12)
            s += 2 * ((f * t + rng.random()) % 1) - 1      # saw
    s = lowpass(s, 900)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (length - t) / 0.6)
    return s * env * 0.035

def riser(length):
    t = np.arange(int(length * SR)) / SR
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t)); seg = int(0.05 * SR)
    for i in range(0, len(t), seg):          # sweeping band of noise
        c = 400 + 9000 * (i / len(t)) ** 2
        chunk = n[i:i + seg]
        out[i:i + seg] = highpass(lowpass(chunk, c * 1.5), c * 0.5)[: len(chunk)]
    return out * (t / length) ** 2 * 0.5

def impact():
    t = np.arange(int(2.5 * SR)) / SR
    boom = np.sin(2 * np.pi * (35 + 60 * np.exp(-t * 8)) * t) * np.exp(-t * 2.2)
    n = lowpass(rng.standard_normal(len(t)), 2500) * np.exp(-t * 5) * 0.4
    return np.tanh((boom + n) * 2) * 0.7

def whoosh(length=0.5):
    t = np.arange(int(length * SR)) / SR
    n = lowpass(highpass(rng.standard_normal(len(t)), 600), 5000)
    env = np.sin(np.pi * t / length) ** 2
    return n * env * 0.18

# ---------- arrangement ----------
drums, bass, music, fx = buf(), buf(), buf(), buf()
K, S = kick(), snare()
H, HO = hat(), hat(True)

# F minor, dark: Fm - Db - Bbm - C (phrygian-ish flavour)
chords = [[53, 56, 60], [49, 53, 56], [46, 49, 53], [48, 52, 55]]
roots808 = [29, 25, 22, 24]       # F1 Db1 Bb0 C1 (+ octave below for weight)
bellseq = [77, 80, 84, 80, 77, 76, 77, 72]   # F5 Ab5 C6 Ab5 F5 E5 F5 C5

def section_full(b0, b1, rolls=True):
    for bar in range(b0, b1, 4):
        ci = ((bar - 16) // 4) % 4 if bar >= 16 else (bar // 4) % 4
        # kicks / 808 pattern (per bar of 4 beats)
        for k, l in ((0, 1.5), (1.5, 1.0), (2.75, 1.25)):
            if bar + k < b1:
                add(drums, K, bar + k, 0.9)
                add(bass, e808(roots808[ci] + 12, l * B), bar + k)
        add(drums, S, bar + 2, 0.9)
        # hats: 8ths, with triplet/32nd rolls on the last beat
        for h in np.arange(0, 4, 0.5):
            add(drums, H, bar + h, 0.8 if h % 1 == 0 else 0.55)
        if rolls:
            if (bar // 4) % 2 == 1:
                for h in np.arange(3, 4, 1 / 6): add(drums, H, bar + h, 0.5)
            else:
                for h in np.arange(3.5, 4, 0.125): add(drums, H, bar + h, 0.45)
        add(drums, HO, bar + 1.5, 0.5)

def section_melody(b0, b1, gain=1.0):
    for bar in range(b0, b1, 4):
        ci = (bar // 4) % 4
        add(music, pad(chords[ci], 4 * B), bar, gain)
        for i, m in enumerate(bellseq):
            add(music, bell(m + (0 if ci in (0, 3) else -3 if i % 2 else 0)), bar + i * 0.5, gain * 0.9)

# Intro: beats 0-16 (pad + bells + sparse hats), riser into the drop
section_melody(0, 16, 0.9)
for b in np.arange(4, 16, 1): add(drums, H, b, 0.35)
add(fx, riser(4 * B), 12)
# Drop 1: 16-30
section_full(16, 30); section_melody(16, 30)
add(fx, impact(), 16, 0.9)
# Slow-motion break: 30-44 -> filtered music, long 808, no hats
brk_m, brk_b = buf(), buf()
for bar in range(30, 44, 4):
    ci = ((bar - 30) // 4) % 4
    brk_m[idx(bar):idx(bar) + int(4 * B * SR)] += 0
    add(music, pad(chords[ci], 4 * B), bar, 1.2)
    add(brk_b, e808(roots808[ci] + 12, 3.8 * B), bar, 1.0)
    add(drums, S, bar + 2, 0.35)
add(fx, impact(), 30, 0.6)
add(fx, riser(2 * B), 42)
# Drop 2: 44-76
section_full(44, 76); section_melody(44, 76)
add(fx, impact(), 44, 0.9)
# Outro 76-84: pad + final 808, fade
add(music, pad(chords[0], 8 * B), 76, 1.2)
add(bass, e808(roots808[0] + 12, 4 * B), 76)
add(fx, impact(), 76, 0.7)
for i, m in enumerate(bellseq): add(music, bell(m), 76 + i * 0.5, 0.7)

# transition whooshes at fast-cut points
for b in (4, 6, 8, 10, 11, 12, 20, 22, 24, 46, 48, 50, 51, 52, 58, 64, 66, 68, 70, 72):
    add(fx, whoosh(0.4), b - 0.45)

# filter the slow-mo break (muffled, cinematic)
i0, i1 = idx(30), idx(44)
seg = music[i0:i1].copy(); music[i0:i1] = lowpass(seg, 700) * 1.4
bass += brk_b

import numpy as _np
def rms(x,a,b): return float(_np.sqrt(_np.mean(x[idx(a):idx(b)]**2)))
for nm,x in (('drums',drums),('bass',bass),('music',music),('fx',fx)):
    print(nm, 'intro %.3f drop %.3f break %.3f'%(rms(x,0,16),rms(x,16,30),rms(x,30,44)))
mix = drums * 1.0 + bass * 0.42 + music * 2.2 + fx * 0.8
mix = highpass(mix, 28)
# glue: soft clip + normalise
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
end = int(TOTAL_BEATS * B * SR)
fade = int(3 * B * SR)
mix[end - fade:end] *= np.linspace(1, 0, fade) ** 1.5
mix = mix[:end]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89

# simple stereo width: delay the music bus slightly on one side
L = mix.copy(); R = mix.copy()
d = int(0.012 * SR)
side = (music * 1.0)[:end]; side /= (np.max(np.abs(mix)) + 1e-9)
R[d:] += 0.0
st = np.stack([L, R], 1)
out = (np.clip(st, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("wrote", sys.argv[1], end / SR, "s")
