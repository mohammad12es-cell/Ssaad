#!/usr/bin/env python3
"""Voice production for THE LAST HUMAN.
Synthesises every `speech` line in src/data/dialogue.json with Piper (free, local neural TTS),
applies a per-character processing chain with ffmpeg, measures the real duration and writes
a 30 fps mouth-open envelope for lip-sync into src/data/voice.json.
usage: python3 src/audio/voice.py
"""
import json, os, re, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS = os.path.join(ROOT, "assets/voice/models")
OUT = os.path.join(ROOT, "assets/voice")
SR = 48000

# casting + acting direction (length_scale = slower delivery, noise = expressiveness)
CAST = {
    "kael":   dict(model="en_US-john-medium", length=1.3, noise=0.55, noise_w=0.7),
    "eve":    dict(model="en_GB-jenny_dioco-medium", length=1.38, noise=0.45, noise_w=0.6),
    "vex":    dict(model="en_GB-northern_english_male-medium", length=1.45, noise=0.6, noise_w=0.8),
    "child":  dict(model="en_US-amy-medium", length=1.22, noise=0.6, noise_w=0.8),
    "system": dict(model="en_US-norman-medium", length=1.15, noise=0.3, noise_w=0.4),
}
# per-character ffmpeg chains (all original processing)
FX = {
    "kael": "rubberband=pitch=0.93:formant=preserved,highpass=f=70,equalizer=f=180:t=q:w=1:g=3,equalizer=f=3500:t=q:w=1.5:g=-2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,aecho=0.8:0.4:22:0.12",
    "kael:whisper": "rubberband=pitch=0.93:formant=preserved,highpass=f=140,equalizer=f=5000:t=q:w=1:g=3,volume=0.55,acompressor=threshold=-24dB:ratio=4,aecho=0.8:0.5:30:0.18",
    "eve": "[0:a]rubberband=pitch=0.97:formant=preserved,asplit=2[a][b];[b]rubberband=pitch=0.5:formant=preserved,volume=0.16,lowpass=f=900[b2];[a][b2]amix=inputs=2:normalize=0,chorus=0.7:0.9:45|62:0.28|0.22:0.25|0.32:1.6|1.1,highpass=f=110,equalizer=f=9000:t=h:w=1:g=3,aecho=0.8:0.6:70|140|260:0.28|0.18|0.1,acompressor=threshold=-20dB:ratio=3",
    "eve:whisper": "[0:a]rubberband=pitch=0.95:formant=preserved,asplit=2[a][b];[b]rubberband=pitch=0.5:formant=preserved,volume=0.2,lowpass=f=700[b2];[a][b2]amix=inputs=2:normalize=0,highpass=f=180,volume=0.7,chorus=0.7:0.9:45|62:0.3|0.25:0.25|0.32:1.6|1.1,aecho=0.8:0.7:90|180|320:0.35|0.25|0.15",
    "eve:glitch": "[0:a]rubberband=pitch=0.96:formant=preserved,asplit=2[a][b];[b]rubberband=pitch=0.5:formant=preserved,volume=0.22,lowpass=f=900[b2];[a][b2]amix=inputs=2:normalize=0,acrusher=bits=9:mix=0.25:mode=log,vibrato=f=11:d=0.18,chorus=0.7:0.9:45|62:0.28|0.22:0.25|0.32:1.6|1.1,aecho=0.8:0.6:70|140|260:0.28|0.18|0.1",
    "vex": "rubberband=pitch=0.9:formant=preserved,vibrato=f=5.2:d=0.06,highpass=f=170,lowpass=f=6200,equalizer=f=1400:t=q:w=1:g=3,acrusher=bits=12:mix=0.12,aecho=0.8:0.5:40|95:0.22|0.12,acompressor=threshold=-20dB:ratio=3",
    "child": "rubberband=pitch=1.32,highpass=f=200,lowpass=f=7000,aecho=0.8:0.8:120|260|420:0.35|0.25|0.18,volume=1.1",
    "system": "rubberband=pitch=0.82:formant=preserved,aecho=0.9:0.9:7|13:0.55|0.4,acrusher=bits=8:mix=0.3:mode=log,highpass=f=220,lowpass=f=5200,acompressor=threshold=-18dB:ratio=4",
}

def safe(chain):
    """rubberband can emit NaNs into following IIR filters unless formats are pinned around it"""
    return re.sub(r"((?:rubberband|vibrato)=[^,\[\];]+)", r"aformat=sample_fmts=fltp,\1,aformat=sample_fmts=s16", chain)

def check(path):
    w = wave.open(path); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    sat = (np.abs(x) > 0.995).mean()
    if x.max() < 0.05 or x.min() > -0.05 or sat > 0.002 or not np.isfinite(x).all():
        print(f"BROKEN AUDIO {path}: min {x.min():.3f} max {x.max():.3f} saturated {sat:.4f}"); sys.exit(1)

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode: print(r.stderr[-1500:]); sys.exit(1)

def envelope(path):
    w = wave.open(path); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if ch > 1: x = x.reshape(-1, ch).mean(1)
    hop = sr // 30; n = int(np.ceil(len(x) / hop)); env = np.zeros(n)
    for i in range(n):
        s = x[i * hop:(i + 1) * hop]; env[i] = np.sqrt((s ** 2).mean()) if len(s) else 0
    env = env / (np.percentile(env, 95) + 1e-6); env = np.clip(env, 0, 1)
    sm = np.convolve(env, [0.25, 0.5, 0.25], "same")      # soften frame-to-frame jitter
    sm[sm < 0.12] = 0                                        # closed mouth between words
    return len(x) / sr, [round(float(v), 3) for v in sm]

def main():
    D = json.load(open(os.path.join(ROOT, "src/data/dialogue.json")))
    tmp = os.path.join(OUT, "_raw"); os.makedirs(tmp, exist_ok=True)
    res = {}
    for ln in D["lines"]:
        if ln["kind"] != "speech": continue
        c = CAST[ln["who"]]; raw = os.path.join(tmp, ln["id"] + ".wav"); out = os.path.join(OUT, ln["id"] + ".wav")
        run([sys.executable, "-m", "piper", "-m", os.path.join(MODELS, c["model"] + ".onnx"), "-f", raw,
             "--length-scale", str(ln.get("length", c["length"])), "--noise-scale", str(c["noise"]), "--noise-w-scale", str(c["noise_w"]), "--sentence-silence", "0.1"], input=ln["en"])
        key = ln["who"] + (":" + ln["fx"] if ln.get("fx") else "")
        chain = safe(FX.get(key, FX[ln["who"]]))
        # trim leading/trailing silence so `start` is the first syllable
        trim = "volume=0.6,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
        if chain.startswith("["):
            fc = f"[0:a]{trim},aresample={SR}[t];" + chain.replace("[0:a]", "[t]", 1) + ",apad=pad_dur=0.6[o]"
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-filter_complex", fc, "-map", "[o]", "-ac", "1", "-ar", str(SR), out])
        else:
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"{trim},aresample={SR},{chain},apad=pad_dur=0.6", "-ac", "1", "-ar", str(SR), out])
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-af", "alimiter=limit=0.89:level=false", "-ar", str(SR), out + ".tmp.wav"]); os.replace(out + ".tmp.wav", out)
        check(out)
        dur, env = envelope(out)
        # speech duration (without reverb tail) for subtitles
        voiced = [i for i, v in enumerate(env) if v > 0.15]
        speech = (voiced[-1] + 1) / 30 if voiced else dur
        res[ln["id"]] = {"ep": ln["ep"], "who": ln["who"], "start": ln["start"], "dur": round(dur, 3), "speech": round(min(speech, dur), 3), "env": env}
        end = ln["start"] + speech
        flag = "  <-- OVER 30s!" if end > 29.95 else ""
        print(f"{ln['id']:8s} {ln['who']:6s} start {ln['start']:5.2f} speech {speech:4.2f}s ends {end:5.2f}{flag}  \"{ln['en']}\"")
    json.dump(res, open(os.path.join(ROOT, "src/data/voice.json"), "w"))

if __name__ == "__main__":
    main()
