import json, re, sys, wave, subprocess
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig
voice = PiperVoice.load(sys.argv[1])
lines = [re.sub(r"^\d+\.\s*", "", l).strip() for l in open("SCRIPT.md").read().split("## Script")[1].splitlines() if re.match(r"^\d+\.", l)]
cfg = SynthesisConfig(length_scale=1.02, noise_scale=0.6, noise_w_scale=0.7)
sr = voice.config.sample_rate
gaps = [0.55, 0.45, 0.6, 0.45, 0.55, 0.45, 0.6, 0.35, 0.65, 0.55, 0.6, 0.0]
out, words, t = [], [], 0.35
out.append(np.zeros(int(0.35 * sr), np.int16))
for i, line in enumerate(lines):
    chunks = list(voice.synthesize(line, syn_config=cfg))
    a = np.concatenate([c.audio_int16_array for c in chunks])
    # trim leading/trailing near-silence
    nz = np.where(np.abs(a) > 300)[0]; a = a[max(0, nz[0] - 200): nz[-1] + 400]
    dur = len(a) / sr
    toks = line.split(); L = sum(len(w) + 1 for w in toks); acc = 0
    for w in toks:
        s = t + dur * acc / L; acc += len(w) + 1; e = t + dur * acc / L
        words.append({"line": i + 1, "word": w, "start": round(s, 3), "end": round(e, 3)})
    out.append(a); t += dur
    g = gaps[i] if i < len(gaps) else 0.5
    out.append(np.zeros(int(g * sr), np.int16)); t += g
audio = np.concatenate(out)
w = wave.open("voice/voice.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(audio.tobytes()); w.close()
json.dump(words, open("voice/words.json", "w"), indent=1)
lines_t = {}
for x in words: lines_t.setdefault(x["line"], [x["start"], x["end"]]); lines_t[x["line"]][1] = x["end"]
json.dump(lines_t, open("voice/lines.json", "w"), indent=1)
print("total", round(len(audio) / sr, 2), "s"); [print(k, v) for k, v in lines_t.items()]
