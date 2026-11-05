"""Narration (offline Piper Persian TTS) + procedural cinematic music bed."""
import os, wave, subprocess, hashlib, json
import numpy as np
from engine import CACHE

VOICE_DIR = os.environ.get("PIPER_VOICES", "/tmp/claude-0/tts")
VOICE = os.environ.get("PIPER_VOICE", "fa_IR-ganji")
SR = 44100
_voice = None


def _load():
    global _voice
    if _voice is None:
        from piper import PiperVoice
        name = VOICE.split("fa_IR-")[1]
        d = f"{VOICE_DIR}/vits-piper-fa_IR-{name}-medium"
        _voice = PiperVoice.load(f"{d}/fa_IR-{name}-medium.onnx", config_path=f"{d}/fa_IR-{name}-medium.onnx.json")
    return _voice


def tts(text, speed=1.0, pitch=0.93):
    """Return mono float32 @ SR. pitch<1 deepens the voice (formant-ish shift via resample)."""
    key = hashlib.md5(json.dumps([text, speed, pitch, VOICE]).encode()).hexdigest()[:14]
    out = os.path.join(CACHE, "tts", key + ".wav")
    if not os.path.exists(out):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        from piper import SynthesisConfig
        v = _load()
        raw = out + ".raw.wav"
        with wave.open(raw, "wb") as wf:
            v.synthesize_wav(text, wf, syn_config=SynthesisConfig(length_scale=1.0 / speed, noise_scale=0.6,
                                                                  noise_w_scale=0.75))
        sr = v.config.sample_rate
        # deepen: play slower (lower pitch) then time-stretch back to keep duration
        af = (f"asetrate={int(sr * pitch)},aresample={SR},atempo={1 / pitch:.5f},"
              "highpass=f=60,equalizer=f=140:t=q:w=1.0:g=4,equalizer=f=3200:t=q:w=1.2:g=2,"
              "acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=4,"
              "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.25")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", af, "-ac", "1", "-ar", str(SR), out],
                       check=True)
        os.remove(raw)
    with wave.open(out) as wf:
        a = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768
    return a


def plan(scenes, min_scene=8.0, lead=0.3, gap=0.4, tail=0.45, max_scene=11.0):
    """scenes: list of [sentence1, sentence2]. Returns timing + clips.
    Speeds a scene's voice up (<=1.18x) if it would overflow max_scene."""
    out, t0 = [], 0.0
    for sents in scenes:
        speed = 1.05
        while True:
            clips = [tts(s, speed) for s in sents]
            dur = lead + sum(len(c) for c in clips) / SR + gap * (len(clips) - 1) + tail
            if dur <= max_scene or speed >= 1.13:
                break
            speed = round(speed + 0.04, 2)
        D = max(min_scene, dur)
        cur = t0 + lead
        items = []
        for s, c in zip(sents, clips):
            items.append(dict(text=s, start=cur, end=cur + len(c) / SR, clip=c))
            cur += len(c) / SR + gap
        out.append(dict(start=t0, dur=D, end=t0 + D, lines=items, speed=speed))
        t0 += D
    return out


# ------------------------------------------------------------- music
def _env(n, a, r):
    e = np.ones(n, np.float32)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] = np.linspace(1, 0, nr)
    return e


def music(total, cuts, mood="mystery", seed=1):
    """Dark ambient pad + sub pulses + impacts on scene cuts + riser into the twist."""
    rng = np.random.default_rng(seed)
    n = int(total * SR)
    t = np.arange(n) / SR
    roots = {"mystery": [55.0, 65.41, 49.0, 58.27], "epic": [55.0, 43.65, 65.41, 49.0], "warm": [65.41, 55.0, 73.42, 49.0]}[mood]
    out = np.zeros(n, np.float32)
    seg = total / len(roots)
    for i, f0 in enumerate(roots):
        s, e = int(i * seg * SR), int(min(n, (i + 1) * seg * SR + 2.0 * SR))
        tt = t[s:e]
        chord = [1, 1.5, 2, 2.4, 3]  # root, fifth, octave, minor-ish third up, twelfth
        x = np.zeros(e - s, np.float32)
        for k, m in enumerate(chord):
            det = 1 + (rng.random() - 0.5) * 0.004
            x += np.sin(2 * np.pi * f0 * m * det * tt + rng.random() * 6) * (0.5 / (k + 1))
            x += np.sin(2 * np.pi * f0 * m * (2 - det) * tt) * (0.3 / (k + 1))
        lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * tt + i)
        out[s:e] += x * lfo * _env(e - s, 1.6, 2.0) * 0.16
    # airy noise bed
    nz = rng.standard_normal(n).astype(np.float32)
    k = np.ones(400, np.float32) / 400
    nz = np.convolve(nz, k, "same")
    out += nz * 0.25 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t))
    # slow heartbeat sub pulse
    for bt in np.arange(0.0, total, 1.6):
        s = int(bt * SR)
        L = int(0.5 * SR)
        if s + L > n:
            break
        tt = np.arange(L) / SR
        out[s:s + L] += np.sin(2 * np.pi * (48 - 20 * tt) * tt) * np.exp(-tt * 9) * 0.22
    # impacts on cuts
    for c in cuts:
        s = int(c * SR)
        L = int(2.2 * SR)
        if s + L > n:
            L = n - s
        if L <= 0:
            continue
        tt = np.arange(L) / SR
        boom = np.sin(2 * np.pi * (60 * np.exp(-tt * 3) + 28) * tt) * np.exp(-tt * 2.2) * 0.55
        hit = rng.standard_normal(L).astype(np.float32) * np.exp(-tt * 18) * 0.18
        out[s:s + L] += boom + hit
        # whoosh leading into the cut
        Lw = int(0.9 * SR)
        s0 = max(0, s - Lw)
        w_ = rng.standard_normal(s - s0).astype(np.float32)
        w_ = np.convolve(w_, np.ones(30) / 30, "same")
        out[s0:s] += w_ * np.linspace(0, 1, s - s0) ** 2 * 0.5
    out = np.tanh(out * 1.2) * 0.8
    fade = np.ones(n, np.float32)
    fade[:int(0.5 * SR)] = np.linspace(0, 1, int(0.5 * SR))
    fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR))
    return out * fade


def mix(timeline, total, path, mood="mystery", music_db=-21.0):
    n = int(total * SR) + SR
    voice = np.zeros(n, np.float32)
    for sc in timeline:
        for ln in sc["lines"]:
            s = int(ln["start"] * SR)
            c = ln["clip"]
            voice[s:s + len(c)] += c[:max(0, n - s)]
    voice /= max(1e-6, np.abs(voice).max()) / 0.89
    cuts = [sc["start"] for sc in timeline[1:]]
    m = music(n / SR, cuts, mood)
    # duck music under voice
    env = np.convolve(np.abs(voice), np.ones(4410) / 4410, "same")
    duck = 1 - 0.45 * np.clip(env / 0.08, 0, 1)
    g = 10 ** (music_db / 20)
    st = np.stack([voice + m * g * duck * 1.0, voice + m[::1] * g * duck * 0.97], 1)
    st = np.clip(st, -1, 1)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((st * 32767).astype(np.int16).tobytes())
