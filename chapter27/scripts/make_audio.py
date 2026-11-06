#!/usr/bin/env python3
"""CHAPTER 27 — placeholder score, sound effects and silent voiceover slots.

TEMPORARY placeholder audio, generated procedurally (no samples, no licences needed).
Replace assets/audio/score-placeholder.wav with a properly licensed cinematic track,
and assets/audio/vo/vo-0X.wav with the recorded Persian narration (see VOICEOVER.md).

Run:  python3 scripts/make_audio.py      (deterministic: same output every run)
"""
import os
import wave
import numpy as np

SR = 48000
DUR = 100.0
BPM = 72
BEAT = 60.0 / BPM
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "audio")
rng = np.random.default_rng(27)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def write(path, stereo):
    stereo = np.clip(stereo, -1, 1)
    pcm = (stereo * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.reshape(-1).tobytes())


def band_noise(d, lo, hi):
    n = int(d * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n)
    return x / (np.abs(x).max() + 1e-9)


def reverb(x, secs=3.2, mix=0.35):
    ir_t = t_axis(secs)
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 6.5 / secs)
    ir[0] = 0
    n = len(x) + len(ir)
    size = 1 << (n - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    wet /= np.abs(wet).max() + 1e-9
    dry = x / (np.abs(x).max() + 1e-9)
    return (1 - mix) * dry + mix * wet


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def piano(midi, d=4.5, vel=1.0):
    t = t_axis(d)
    f = hz(midi)
    x = np.zeros_like(t)
    for k, a in enumerate([1, 0.45, 0.22, 0.12, 0.06, 0.03], start=1):
        x += a * np.sin(2 * np.pi * f * k * 1.0007 ** k * t) * np.exp(-t * (1.1 + 0.9 * k))
    attack = np.minimum(1, t / 0.006)
    return vel * x * attack


def pad(midis, d, attack=2.5, release=3.0):
    t = t_axis(d)
    x = np.zeros_like(t)
    for m in midis:
        f = hz(m)
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            for k in range(1, 7):
                x += (1 / k) * np.sin(2 * np.pi * ff * k * t + k * 0.7) * (0.85 ** k)
    env = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    return x * np.clip(env, 0, 1) / (len(midis) * 3)


def boom(d=3.0, f0=55, f1=32, vel=1.0):
    t = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-t * 3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return vel * np.sin(ph) * np.exp(-t * 1.6)


def hit(d=0.6, lo=900, hi=5000, decay=28, body=110, vel=1.0):
    t = t_axis(d)
    crack = band_noise(d, lo, hi) * np.exp(-t * decay)
    thump = np.sin(2 * np.pi * body * t) * np.exp(-t * 14)
    return vel * (0.7 * crack + 0.6 * thump)


def whoosh(d=1.2, peak=0.8, lo=300, hi=6000, vel=1.0):
    t = t_axis(d)
    env = np.where(t < peak, (t / peak) ** 2, np.exp(-(t - peak) * 9))
    return vel * band_noise(d, lo, hi) * env


def riser(d=3.0, vel=1.0):
    t = t_axis(d)
    env = (t / d) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(180 + 900 * (t / d) ** 2) / SR)
    return vel * env * (0.6 * band_noise(d, 400, 9000) + 0.25 * tone) * np.minimum(1, (d - t) / 0.03 + 0.0)


def clunk(vel=1.0):
    # stadium light bank switching on/off: relay click + transformer thud + hum tail
    d = 1.8
    t = t_axis(d)
    click = band_noise(d, 2000, 8000) * np.exp(-t * 90)
    thud = np.sin(2 * np.pi * 62 * t) * np.exp(-t * 7)
    hum = np.sin(2 * np.pi * 100 * t) * 0.08 * np.exp(-t * 1.5)
    return vel * (0.5 * click + 0.8 * thud + hum)


def place(buf, clip, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= buf.shape[1]:
        return
    j = min(buf.shape[1], i + len(clip))
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:j] += clip[: j - i] * gain * l * 1.414
    buf[1, i:j] += clip[: j - i] * gain * r * 1.414


def beat(i):
    return i * BEAT


# ---------------------------------------------------------------- score
N = int(DUR * SR)
music = np.zeros((2, N))
tt = t_axis(DUR)

# Drone: D2 + A2, slow swell, the floor of the whole film.
drone = (np.sin(2 * np.pi * hz(38) * tt) + 0.6 * np.sin(2 * np.pi * hz(45) * tt + 1)
         + 0.25 * np.sin(2 * np.pi * hz(50) * tt + 2))
denv = np.interp(tt, [0, 3, 13, 26, 42, 44, 55, 68, 84, 96, 100],
                 [0, .35, .45, .40, .30, .18, .25, .45, .60, .45, 0])
music[0] += drone * denv * 0.22
music[1] += drone * denv * 0.22

# Chords (D minor): Dm  Bb  F  C  — one chord per bar (4 beats)
prog = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]
melody_s1 = [62, 65, 69, 67, 65, 62, 60, 62]

# S1–S2: sparse piano, one note every 2 beats from 3 s.
b = 0
for i, start in enumerate(np.arange(3.0, 25.5, BEAT * 2)):
    m = melody_s1[i % len(melody_s1)]
    place(music, piano(m, vel=0.32), start, pan=-0.2 + 0.4 * (i % 2))
    if i % 2 == 0:
        place(music, piano(prog[(i // 2) % 4][0] - 12, d=6, vel=0.28), start)

# S2: pad enters softly under the dreamer.
place(music, pad(prog[0], 13.5, attack=5, release=4), 13.0, gain=0.22)

# S3 26–42: heartbeat pulse + pad progression + piano ostinato.
for i in range(int((42 - 26.4) / BEAT)):
    at = 26.4 + beat(i)
    place(music, boom(0.9, 70, 40, vel=0.5 if i % 2 == 0 else 0.3), at)
for k in range(4):
    place(music, pad(prog[k], BEAT * 4 + 1.5, 1.2, 1.5), 26.4 + k * BEAT * 4, gain=0.24)
for i in range(int((42 - 27.2) / (BEAT / 2))):
    m = prog[(i // 8) % 4][i % 3] + 12
    place(music, piano(m, d=1.6, vel=0.12), 27.2 + i * BEAT / 2, pan=0.3)

# S4 42–55: solo piano, slow and lonely, falling line.
lonely = [69, 67, 65, 64, 62, 60, 58, 57]
for i, m in enumerate(lonely):
    place(music, piano(m, d=6, vel=0.38), 43.0 + i * BEAT * 1.9, pan=0.15)
    if i % 2 == 0:
        place(music, piano(m - 15, d=7, vel=0.22), 43.0 + i * BEAT * 1.9)

# S5 55–68: strings rise, pulse returns at 58.5, crescendo into the spike (62.9).
place(music, pad([50, 57, 62], 8.5, attack=6, release=1.0), 55.0, gain=0.30)
place(music, pad([46, 53, 58, 62], 5.5, attack=0.3, release=2), 62.9, gain=0.38)
for i in range(int((68 - 58.5) / (BEAT / 2))):
    at = 58.5 + i * BEAT / 2
    place(music, boom(0.7, 80, 45, vel=0.45 if i % 2 == 0 else 0.22), at)

# S6 68–84: drive — eighth-note ostinato + toms on the beat, pad per bar.
for k in range(5):
    place(music, pad(prog[k % 4], BEAT * 4 + 1.2, 0.6, 1.0), 68.0 + k * BEAT * 4, gain=0.30)
for i in range(int((84 - 68.0) / (BEAT / 2))):
    m = prog[(i // 8) % 4][(i * 2) % 3] + 12
    place(music, piano(m, d=1.2, vel=0.16), 68.0 + i * BEAT / 2, pan=-0.3 + 0.6 * (i % 2))
for i in range(int((84 - 68.0) / BEAT)):
    place(music, boom(0.8, 95, 50, vel=0.55), 68.0 + beat(i))

# S7 84–100: climax — big chord, rising melody, resolve on D major.
place(music, pad([38, 50, 57, 62, 66], 16, attack=0.2, release=5), 84.0, gain=0.42)
for i, m in enumerate([62, 66, 69, 74, 73, 69, 74]):
    place(music, piano(m, d=6, vel=0.40), 84.4 + i * BEAT * 1.5, pan=-0.1)

music = np.stack([reverb(music[0], 3.4, 0.38), reverb(music[1], 3.6, 0.38)])
music *= np.interp(tt, [0, 0.5, 98.0, 100], [0, 1, 1, 0])
music *= 0.89 / (np.abs(music).max() + 1e-9)   # ≈ -1 dBFS peak
score_100 = music

# ---------------------------------------------------------------- sfx (one stem, on-screen causes only)
sfx = np.zeros((2, N))
place(sfx, boom(4, 48, 30, 0.6), 0.55)                              # S1 the light opens
place(sfx, whoosh(1.4, 1.0, 200, 5000, 0.5), 24.6)                  # S2 push into the sun
place(sfx, clunk(1.0), 26.35, pan=-0.2)                             # S3 flood light on
for i, at in enumerate([27.55, 28.75, 29.95]):                      # S3 ball bounces (wide)
    place(sfx, hit(0.4, 600, 3500, 40, 140, 0.45 - 0.05 * i), at, pan=0.25)
place(sfx, hit(1.5, 300, 3000, 6, 70, 0.9), 34.95)                  # S3 slow-mo spike contact
place(sfx, boom(3, 60, 30, 0.7), 34.95)
place(sfx, hit(1.0, 250, 2500, 9, 80, 0.7), 38.95, pan=0.2)          # S3 ball hits floor
for i, at in enumerate([41.9, 42.7, 43.5]):                          # S4 lights off
    place(sfx, clunk(0.8 - 0.15 * i), at, pan=-0.4 + 0.4 * i)
place(sfx, boom(2.5, 70, 35, 0.55), 54.15)                           # S4 door closes
place(sfx, whoosh(2.0, 1.6, 200, 3000, 0.35), 55.0)                  # S5 door opens (air)
for i, at in enumerate([58.5, 58.9, 59.3]):                          # S5 light banks slam on
    place(sfx, clunk(1.0), at, pan=-0.5 + 0.5 * i)
place(sfx, whoosh(0.7, 0.55, 500, 7000, 0.45), 62.25)                # S5 jump
place(sfx, hit(1.2, 400, 6000, 10, 75, 1.0), 62.9)                   # S5 spike
place(sfx, boom(3.5, 65, 28, 0.9), 62.9)
place(sfx, hit(0.8, 300, 3000, 12, 90, 0.7), 63.3, pan=0.3)          # S5 ball floor
place(sfx, whoosh(1.0, 0.75, 400, 8000, 0.4), 67.3)                  # S5 → S6
for i, at in enumerate([70.6, 73.2, 75.8, 78.4]):                    # S6 cuts (rotated takes)
    place(sfx, whoosh(0.6 + 0.1 * (i % 3), 0.4 + 0.05 * (i % 2), 600 + 200 * i, 7000, 0.22), at - 0.4,
          pan=-0.3 + 0.2 * i)
place(sfx, riser(2.4, 0.5), 81.6)                                    # S6 → S7 riser
place(sfx, boom(5, 55, 26, 1.0), 84.0)                               # S7 impact into the sunrise
place(sfx, boom(4, 45, 28, 0.45), 92.5)                              # S7 title lands
sfx *= 0.89 / (np.abs(sfx).max() + 1e-9)
sfx_100 = sfx

# ---------------------------------------------------------------- THE GRIND (inserted at 55 s, 13 s long)
# The 100 s stems above are the original cut; the training montage is spliced in at 55 s and
# everything after it moves 13 s later (film = 113 s).
G_AT, G_LEN = 55.0, 13.0
GN = int(G_LEN * SR)
gm = np.zeros((2, GN))
gs = np.zeros((2, GN))
E = BEAT / 2                                   # eighth note at 72 BPM (0.417 s)
place(gm, pad([38, 45, 50], 11.8, attack=0.08, release=0.4), 0.0, gain=0.34)
for i in range(int(11.6 / E)):
    place(gm, boom(0.5, 110, 45, vel=0.75 if i % 2 == 0 else 0.4), i * E)
    m = [62, 65, 69, 72][i % 4] if i < 16 else [64, 67, 70, 74][i % 4]
    place(gm, piano(m, d=0.4, vel=0.2), i * E, pan=-0.35 + 0.7 * (i % 2))
place(gm, riser(3.6, 0.55), 8.0)
for at in [2.5, 4.5, 7.6, 10.0, 10.4, 10.8, 11.2]:
    place(gm, boom(1.4, 70, 30, 0.9), at)
gm[:, int(11.6 * SR):] *= 0                    # the music stops dead: he is spent
for at in [11.9, 12.18, 12.55, 12.83]:         # heartbeat
    place(gm, boom(0.35, 62, 40, 0.55), at)
gm = np.stack([reverb(gm[0], 1.8, 0.25), reverb(gm[1], 1.9, 0.25)])
gm *= 0.89 / (np.abs(gm).max() + 1e-9)
for at in [1.25, 2.35]:                        # block-jump landings
    place(gs, hit(0.7, 200, 2200, 12, 70, 0.8), at)
for i in range(12):                            # sprint footfalls
    place(gs, hit(0.15, 500, 4000, 60, 120, 0.22), 2.55 + i * 0.16, pan=-0.6 + 0.1 * i)
for k, c in enumerate([5.25, 6.2, 7.15]):        # spike after spike
    place(gs, hit(1.0, 400, 6000, 11, 75, 1.0 - 0.05 * k), c)
    place(gs, hit(0.6, 300, 3000, 14, 90, 0.5), c + 0.24, pan=0.4)
for at in [7.62, 8.3, 9.25, 9.85]:              # plate rattle on the bar
    place(gs, hit(0.5, 2500, 9000, 22, 180, 0.28), at, pan=-0.2)
for i, at in enumerate([2.5, 4.5, 7.6, 10.0, 10.4, 10.8, 11.2, 11.6]):
    place(gs, whoosh(0.5 + 0.08 * (i % 3), 0.32, 600 + 150 * (i % 4), 8000, 0.35), at - 0.32, pan=-0.3 + 0.2 * (i % 4))
for at, v in [(11.7, 0.35), (12.25, 0.28)]:      # breath out
    place(gs, whoosh(0.7, 0.12, 400, 2200, v), at)
gs *= 0.89 / (np.abs(gs).max() + 1e-9)


def splice(base, ins, at):
    i = int(at * SR)
    f = int(0.04 * SR)
    a, b = base[:, :i].copy(), base[:, i:].copy()
    a[:, -f:] *= np.linspace(1, 0, f)
    b[:, :f] *= np.linspace(0, 1, f)
    ins = ins.copy(); ins[:, :f] *= np.linspace(0, 1, f); ins[:, -f:] *= np.linspace(1, 0, f)
    return np.concatenate([a, ins, b], axis=1)


write(os.path.join(ROOT, "score-placeholder.wav"), splice(score_100, gm * 0.95, G_AT))
write(os.path.join(ROOT, "sfx.wav"), splice(sfx_100, gs, G_AT))

# ---------------------------------------------------------------- voiceover slots (silent placeholders)
VO = [(2.5, 9.5), (14.0, 23.5), (28.0, 39.5), (43.5, 53.5), (56.5, 66.0), (69.0, 79.0), (82.0, 95.5), (99.0, 109.0)]
os.makedirs(os.path.join(ROOT, "vo"), exist_ok=True)
for i, (a, z) in enumerate(VO, start=1):
    write(os.path.join(ROOT, "vo", f"vo-{i:02d}.wav"), np.zeros((2, int((z - a) * SR))))
print("ok")
