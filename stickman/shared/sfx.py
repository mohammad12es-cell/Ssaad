"""Margin Man shared audio: an original-tune generator and synthesized sound effects (no samples)."""
import wave
import numpy as np

SR = 44100
NOTE = {}
for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]):
    for o in range(2, 7):
        NOTE[f"{n}{o}"] = 440.0 * 2 ** ((i - 9) / 12 + (o - 4))


class Mix:
    def __init__(self, dur, seed=4):
        self.dur, self.n = dur, int(SR * dur)
        self.fx = np.zeros(self.n)
        self.music = np.zeros(self.n)
        self.rng = np.random.default_rng(seed)

    # ---------- primitives ----------
    def put(self, buf, t, sig, gain=1.0):
        i = int(t * SR)
        j = min(self.n, i + len(sig))
        if j > i:
            buf[i:j] += sig[: j - i] * gain

    @staticmethod
    def tt(d):
        return np.arange(int(d * SR)) / SR

    def env(self, d, a=0.005, r=None):
        t = self.tt(d)
        e = np.minimum(1, t / a)
        return e * (np.exp(-t / r) if r else np.clip((d - t) / max(d * 0.3, 1e-3), 0, 1))

    @staticmethod
    def lp(x, k):
        return np.convolve(x, np.ones(k) / k, mode="same")

    def noise(self, d):
        return self.rng.standard_normal(int(d * SR))

    def pluck(self, f, d=0.22, r=0.09, square=0.12):
        t = self.tt(d)
        s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + square * np.sign(np.sin(2 * np.pi * f * t))
        return s * self.env(d, r=r)

    def sweep(self, f_of_t, d):
        f = f_of_t(self.tt(d))
        return np.sin(2 * np.pi * np.cumsum(f) / SR)

    # ---------- music ----------
    def tune(self, melody, bass, bpm=128, mel_gain=0.22, bass_gain=0.3, square=0.12, start=0.0, end=None):
        step = 60 / bpm / 2
        t, k = start, 0
        end = self.dur if end is None else end
        while t < end:
            m = melody[k % len(melody)]
            if m:
                self.put(self.music, t, self.pluck(NOTE[m], square=square), mel_gain)
            if k % 4 == 0:
                b = bass[(k // 4) % len(bass)]
                if b:
                    self.put(self.music, t, self.pluck(NOTE[b], 0.45, 0.2), bass_gain)
            if k % 2 == 0:
                self.put(self.music, t, self.lp(self.noise(0.03), 2) * self.env(0.03, r=0.008), 0.05)
            t += step
            k += 1

    def gate(self, mutes=(), fade_out=0.6):
        g = np.ones(self.n)
        f = int(0.08 * SR)
        for a, b in mutes:
            a, b = int(a * SR), int(b * SR)
            g[a:b] = 0
            g[max(0, a - f):a] = np.linspace(1, 0, a - max(0, a - f))
            g[b:b + f] = np.linspace(0, 1, len(g[b:b + f]))
        k = int((self.dur - fade_out) * SR)
        g[k:] *= np.linspace(1, 0, self.n - k)
        return g

    # ---------- effects ----------
    def scribble(self, t0, d, gain=0.35):
        n = self.noise(d)
        hp = n - self.lp(n, 6)
        am = 0.55 + 0.45 * np.sin(2 * np.pi * 14 * self.tt(d)) ** 2
        self.put(self.fx, t0, hp * am * self.env(d, a=0.02), gain)

    def thud(self, t0, f0=110, d=0.35, gain=0.9):
        self.put(self.fx, t0, self.sweep(lambda t: f0 * np.exp(-t * 6), d) * self.env(d, r=0.1), gain)
        self.put(self.fx, t0, self.lp(self.noise(0.08), 8) * self.env(0.08, r=0.02), gain * 0.6)

    def splat(self, t0, gain=0.7):
        self.put(self.fx, t0, self.lp(self.noise(0.25), 5) * self.env(0.25, r=0.05), gain)
        self.thud(t0, 160, 0.2, gain * 0.6)

    def whoosh(self, t0, d=0.35, gain=0.3):
        n = self.lp(self.noise(d), 12)
        self.put(self.fx, t0, n * np.sin(np.pi * self.tt(d) / d) ** 2, gain)

    def ha(self, t0, gain=0.35, f=170):
        for i in range(3):
            d, ff = 0.12, f - i * 12
            t = self.tt(d)
            s = np.sign(np.sin(2 * np.pi * ff * t)) * 0.5 + np.sin(4 * np.pi * ff * t)
            self.put(self.fx, t0 + i * 0.17, self.lp(s, 5) * self.env(d, a=0.01), gain)

    def pop(self, t0, f=900, gain=0.4):
        t = self.tt(0.08)
        self.put(self.fx, t0, np.sin(2 * np.pi * (f + 1800 * t) * t) * self.env(0.08, r=0.02), gain)

    def ding(self, t0, gain=0.35):
        t = self.tt(1.0)
        self.put(self.fx, t0, (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2352 * t)) * np.exp(-t * 4), gain)

    def rub(self, t0, d, gain=0.4):
        n = self.noise(d)
        s = self.lp(n, 4) - self.lp(n, 30)
        am = 0.35 + 0.65 * np.abs(np.sin(2 * np.pi * 4.1 * self.tt(d)))
        self.put(self.fx, t0, s * am * self.env(d, a=0.03), gain)

    def boing(self, t0, gain=0.45):
        s = self.sweep(lambda t: 180 + 520 * (1 - np.exp(-t * 5)) + 35 * np.sin(2 * np.pi * 14 * t), 0.6)
        self.put(self.fx, t0, s * self.env(0.6, r=0.25), gain)

    def gulp(self, t0, gain=0.3, f=500):
        self.put(self.fx, t0, self.sweep(lambda t: f - 1600 * t, 0.18) * self.env(0.18, r=0.06), gain)

    def blip(self, t0, f=600, gain=0.3, up=True):
        s = self.sweep(lambda t: f * (1 + (2 if up else -0.6) * t / 0.12), 0.12)
        self.put(self.fx, t0, s * self.env(0.12, r=0.05), gain)

    def slam(self, t0, gain=0.8):
        self.thud(t0, 80, 0.4, gain)
        self.put(self.fx, t0, self.lp(self.noise(0.12), 3) * self.env(0.12, r=0.03), gain * 0.5)

    def rumble(self, t0, d, gain=0.5):
        n = self.lp(self.noise(d), 60)
        self.put(self.fx, t0, n / (np.max(np.abs(n)) + 1e-9) * self.env(d, a=0.2), gain)

    def crunch(self, t0, gain=0.5):
        for i in range(4):
            self.put(self.fx, t0 + i * 0.09, (self.noise(0.06) - self.lp(self.noise(0.06), 3)) * self.env(0.06, r=0.015), gain)

    def bark(self, t0, gain=0.4):
        s = self.sweep(lambda t: 420 + 300 * np.sin(np.pi * t / 0.14), 0.14)
        self.put(self.fx, t0, self.lp(np.sign(s) * 0.4 + s, 3) * self.env(0.14, a=0.01), gain)

    def burp(self, t0, gain=0.5):
        s = self.sweep(lambda t: 90 + 25 * np.sin(2 * np.pi * 30 * t), 0.5)
        self.put(self.fx, t0, self.lp(np.sign(s), 8) * self.env(0.5, a=0.02), gain)

    def steps(self, t0, n, every=0.18, gain=0.25):
        for i in range(n):
            self.put(self.fx, t0 + i * every, self.lp(self.noise(0.04), 6) * self.env(0.04, r=0.01), gain)

    # ---------- output ----------
    def write(self, path, mutes=()):
        out = self.fx + self.music * self.gate(mutes)
        out /= max(1e-6, np.max(np.abs(out))) / 0.9
        pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
        with wave.open(path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(np.repeat(pcm[:, None], 2, axis=1).tobytes())
