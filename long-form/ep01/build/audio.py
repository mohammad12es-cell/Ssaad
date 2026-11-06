"""Original sound design: synthesized score + ambience + SFX, ducked under the VO.
usage: python3 audio.py film|s1|s2|s3  → out/<name>-mix.wav (then loudness-normalised by ffmpeg)
Everything here is generated from oscillators and noise: no third-party audio.
"""
import json, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(7)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def norm(x): return x / (np.max(np.abs(x)) + 1e-9)
def env(n, a, r):  # attack/release envelope in seconds
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-3)) * np.exp(-t / r)

SEA = {'dark', 'lit', 'dawn', 'ship', 'landing', 'wave', 'steps', 'search', 'gallery', 'harbour'}

def score(n, dark=True):
    t = np.arange(n) / SR
    root = [73.42, 110.0, 146.83, 174.61]  # D2 A2 D3 F3: D minor drone
    pad = sum(np.sin(2 * np.pi * f * t + i) * (0.6 if i < 2 else 0.35) + 0.5 * np.sin(2 * np.pi * f * 1.004 * t) for i, f in enumerate(root))
    pad *= 0.55 + 0.45 * np.sin(2 * np.pi * t / 23.0) ** 2
    pad = lp(pad, 900)
    # sparse "music box" motif: decaying sine notes every ~7s
    mot = np.zeros(n); notes = [587.33, 698.46, 880.0, 659.25, 587.33, 523.25, 587.33]
    for k, s0 in enumerate(np.arange(2.0, n / SR - 2, 7.0)):
        f = notes[k % len(notes)]; m = int(3.5 * SR); i0 = int(s0 * SR); m = min(m, n - i0)
        tt = np.arange(m) / SR; tone = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * env(m, 0.005, 1.1)
        mot[i0:i0 + m] += tone
    return norm(pad) * 0.8 + norm(mot) * 0.25

def sea(n):
    b = np.cumsum(rng.standard_normal(n)); b = hp(b, 40); b = lp(b, 700)
    t = np.arange(n) / SR; swell = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.3)) ** 2
    return norm(b) * swell
def wind(n):
    t = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 300, 1400)) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * t / 5.1)))
def rain(n): return norm(hp(rng.standard_normal(n), 2500)) * 0.6
def room(n): return norm(lp(rng.standard_normal(n), 220)) * 0.5

def stamp():
    m = int(0.5 * SR); t = np.arange(m) / SR
    thump = np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.09); click = lp(rng.standard_normal(m), 3000) * np.exp(-t / 0.02)
    return norm(thump + 0.6 * click)
def crash():
    m = int(4.0 * SR); t = np.arange(m) / SR
    return norm(lp(rng.standard_normal(m), 1200) * np.minimum(1, t / 0.4) * np.exp(-t / 1.2))
def whoosh():
    m = int(0.9 * SR); t = np.arange(m) / SR
    return norm(bp(rng.standard_normal(m), 400, 2500)) * np.sin(np.pi * t / 0.9) ** 2

def mix(name):
    story = json.load(open('story.json'))[name]; tim = json.load(open(f'out/{name}-timing.json'))
    vo, vsr = sf.read(f'out/{name}-vo.wav'); assert vsr == 24000
    vo = np.interp(np.arange(int(len(vo) * SR / vsr)) / SR, np.arange(len(vo)) / vsr, vo)
    n = len(vo); amb = np.zeros(n); fx = np.zeros(n)
    # shot boundaries: a shot spans from its line start (minus lead) to the next line start
    starts = [0.0] + [l['start'] - 0.35 for l in tim['lines'][1:]]
    bounds = list(zip(starts, starts[1:] + [n / SR]))
    layers = {'sea': sea(n), 'wind': wind(n), 'rain': rain(n), 'room': room(n)}
    for (a, b), sh in zip(bounds, story):
        i, j = int(a * SR), int(b * SR); fade = np.minimum(1, np.minimum(np.arange(j - i), np.arange(j - i)[::-1]) / (0.5 * SR))
        lay = ['sea'] if sh['s'] in SEA else ['room']
        if sh.get('sfx') == 'rain': lay += ['rain']
        if sh.get('sfx') == 'wind' or sh['s'] == 'search': lay += ['wind']
        for L in lay: amb[i:j] += layers[L][i:j] * fade * (0.6 if L == 'rain' else 1)
        def put(sig, at, g):
            k = int(at * SR); m = min(len(sig), n - k); fx[k:k + m] += sig[:m] * g
        put(whoosh(), a, 0.25)
        for ov in sh.get('ov', []):
            if ov.get('sfx') == 'stamp': put(stamp(), a + (b - a) * ov['at'], 0.9)
        if sh.get('sfx') == 'wave': put(crash(), a + 0.6, 0.7)
    mus = score(n)
    # duck bed under the voice
    act = lp(np.abs(vo) > 0.01, 3).astype(float); act = np.clip(lp(act, 2), 0, 1)
    duck = 1 - 0.55 * act
    bed = (mus * 0.16 + amb * 0.12) * duck
    out = vo * 0.9 + bed + fx * 0.35
    out = out / max(1.0, np.max(np.abs(out)) / 0.95)
    sf.write(f'out/{name}-mix.wav', np.stack([out, out], 1).astype(np.float32), SR)
    print(name, 'mixed', round(n / SR, 1), 's')

if __name__ == '__main__': mix(sys.argv[1])
