"""Narration with Kokoro (local neural TTS) + approximate word timings for animated captions.
Word timing: phoneme-length proportional, anchored to pauses detected in the audio at punctuation.
Usage: python tts.py <model_dir> <out_dir> [speed]"""
import sys, re, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from kokoro_onnx.tokenizer import Tokenizer

LINES = [
    "We thought Mars was a dead planet. But what if something is still burning beneath its surface?",
    "A European spacecraft has detected a mysterious gas linked to volcanoes, above cracks on the Red Planet.",
    "It's called hydrogen chloride. On Earth, this gas can escape from volcanic systems when hot magma moves underground.",
    "The gas was detected above fissures near Alba Mons, one of the enormous volcanic regions of Mars.",
    "Scientists think magma could still be moving deep beneath the Martian surface. But no new eruption has actually been observed.",
    "And if underground heat meets water, could Mars still hide places where microbial life might survive?",
    "Oddly Explained.",
]
model_dir, out = sys.argv[1], sys.argv[2]
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
k = Kokoro(f"{model_dir}/kokoro-v1.0.onnx", f"{model_dir}/voices-v1.0.bin")
tok = Tokenizer()
voice = 0.6 * k.get_voice_style("am_onyx") + 0.4 * k.get_voice_style("am_michael")

def pauses(a, sr):
    hop = int(sr * 0.01)
    rms = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    thr = rms.max() * 0.04
    out, run = [], None
    for i, r in enumerate(rms):
        if r < thr:
            run = i if run is None else run
        elif run is not None:
            if i - run >= 9: out.append((run * 0.01, i * 0.01))
            run = None
    return out

info = []
for i, line in enumerate(LINES):
    audio, sr = k.create(line, voice=voice, speed=speed, lang="en-us")
    a = np.abs(audio); idx = np.where(a > 0.01)[0]
    audio = audio[max(0, idx[0] - 800): idx[-1] + 2400]
    dur = len(audio) / sr
    sf.write(f"{out}/vo{i+1}.wav", audio, sr)
    words = line.split()
    ph = [max(2, len(tok.phonemize(re.sub(r"[^\w']", "", w), "en-us"))) + 2 for w in words]
    ps = [p for p in pauses(audio, sr) if 0.05 < p[0] < dur - 0.15]
    # anchors: (word index after which a pause occurs, pause start, pause end)
    punct = [j for j, w in enumerate(words[:-1]) if re.search(r"[,.?:;]$", w)]
    tot = sum(ph); cum = np.cumsum(ph) / tot
    anchors, used = [], -1
    for j in punct:
        exp = cum[j] * dur
        cands = [(abs((p[0] + p[1]) / 2 - exp), n) for n, p in enumerate(ps) if n > used]
        if cands:
            d, n = min(cands)
            if d < 0.8:
                anchors.append((j, ps[n][0], ps[n][1])); used = n
    # distribute words between anchors
    times, seg_start, w0 = [], 0.05, 0
    for (j, pa, pb) in anchors + [(len(words) - 1, dur - 0.08, dur)]:
        seg = ph[w0:j + 1]; span = pa - seg_start; t = seg_start
        for n, p in enumerate(seg):
            d = span * p / sum(seg)
            times.append({"w": words[w0 + n], "start": round(t, 3), "end": round(t + d, 3)}); t += d
        seg_start, w0 = pb, j + 1
    info.append({"file": f"vo{i+1}.wav", "text": line, "duration": round(dur, 3), "words": times})
    print(i + 1, round(dur, 2), [(w["w"], w["start"]) for w in times][:4], "anchors", len(anchors), "/", len(punct))
json.dump(info, open(f"{out}/vo.json", "w"), indent=1)
print("total", round(sum(x["duration"] for x in info), 2))
