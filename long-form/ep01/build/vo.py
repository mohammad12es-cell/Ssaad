"""Generate narration with Kokoro (Apache-2.0, local) and write per-project timings + SRT.
usage: python3 vo.py film|s1|s2|s3 [target_seconds]
"""
import json, sys, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

M = '/tmp/claude-0/kokoro/'
SAY = {'Eilean Mòr': 'Ellan More', '1899': 'eighteen ninety-nine', '1900': 'nineteen hundred',
       '1901': 'nineteen oh one', '1912': 'nineteen twelve', '1971': 'nineteen seventy-one',
       'Archtor': 'Ark-tor', 'Muirhead': 'Mure-head', 'MacArthur': 'Mac Arthur'}
VOICE, LANG, SR = 'bm_george', 'en-gb', 24000

def tts(k, text, speed):
    for a, b in SAY.items(): text = text.replace(a, b)
    audio, sr = k.create(text, voice=VOICE, speed=speed, lang=LANG)
    return audio

def build(name, target):
    lines = json.load(open('story.json'))[name]
    k = Kokoro(M + 'kokoro-v1.0.onnx', M + 'voices-v1.0.bin')
    short = name != 'film'
    speed = 1.0 if short else 0.95
    clips = [tts(k, l['t'], speed) for l in lines]
    speech = sum(len(c) for c in clips) / SR
    lead, tail = (0.3, 1.2) if short else (1.0, 4.0)
    extra = sum(2.5 for l in lines if l.get('title')) + (0 if short else 3.0)
    gap = (target - speech - lead - tail - extra) / max(1, len(lines) - 1)
    if short and not 0.25 <= gap <= 0.6:  # re-speak at a fitted speed, then gap 0.4s
        speed = max(0.9, min(1.25, speed * speech / (target - lead - tail - 0.4 * (len(lines) - 1))))
        clips = [tts(k, l['t'], speed) for l in lines]; speech = sum(len(c) for c in clips) / SR
        gap = (target - speech - lead - tail) / max(1, len(lines) - 1)
    gap = max(0.25, min(1.6, gap))
    out, t, timing = [np.zeros(int(lead * SR), np.float32)], lead, []
    for i, (l, c) in enumerate(zip(lines, clips)):
        if l.get('title'): out.append(np.zeros(int(2.5 * SR), np.float32)); t += 2.5
        d = len(c) / SR; timing.append({'start': round(t, 3), 'end': round(t + d, 3)}); out.append(c.astype(np.float32)); t += d
        if i < len(lines) - 1: out.append(np.zeros(int(gap * SR), np.float32)); t += gap
    if not short: out.append(np.zeros(int(3.0 * SR), np.float32)); t += 3.0
    out.append(np.zeros(int(tail * SR), np.float32)); t += tail
    sf.write(f'out/{name}-vo.wav', np.concatenate(out), SR)
    json.dump({'duration': round(t, 3), 'speed': speed, 'gap': gap, 'lines': timing}, open(f'out/{name}-timing.json', 'w'), indent=1)
    # SRT: split each line into sentences, time by character share
    srt, n = [], 1
    fmt = lambda s: f'{int(s//3600):02}:{int(s%3600//60):02}:{int(s%60):02},{int(s%1*1000):03}'
    for l, tm in zip(lines, timing):
        parts = [p for p in re.split(r'(?<=[.?!:])\s+', l['t']) if p]; tot = sum(len(p) for p in parts); s = tm['start']
        for p in parts:
            e = s + (tm['end'] - tm['start']) * len(p) / tot; srt.append(f'{n}\n{fmt(s)} --> {fmt(e)}\n{p}\n'); n += 1; s = e
    open(f'out/{name}.srt', 'w').write('\n'.join(srt))
    print(name, 'duration', round(t, 1), 'speech', round(speech, 1), 'gap', round(gap, 2), 'speed', round(speed, 3))

if __name__ == '__main__':
    import os; os.makedirs('out', exist_ok=True)
    build(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else (480 if sys.argv[1] == 'film' else 30))
