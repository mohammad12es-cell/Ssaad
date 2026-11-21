#!/usr/bin/env python3
"""ODDLY EXPLAINED — narration + timing.
usage: tts.py VIDEO_DIR OUT_DIR

Generates each narration line with Kokoro-82M (open weights, Apache-2.0, runs locally on CPU via onnxruntime),
places lines on the timeline (config 'at', never overlapping), and finds subtitle chunk boundaries by searching
for the quietest point near each expected split. Writes:
  OUT_DIR/narration.wav   48 kHz mono, full duration
  OUT_DIR/lines/<id>.wav  individual lines (for re-editing / swapping in a human recording)
  OUT_DIR/timings.json    line + chunk timings used by subtitles and the text layer

To use an external voice recording instead: drop files named <id>.wav into VIDEO_DIR/voice/ — they are used
instead of TTS for those lines (still trimmed and placed automatically)."""
import json, os, sys, urllib.request
import numpy as np, soundfile as sf

vdir, out = sys.argv[1], sys.argv[2]
cfg = json.load(open(os.path.join(vdir, 'config.json')))
os.makedirs(os.path.join(out, 'lines'), exist_ok=True)
SR = 48000
CACHE = os.path.expanduser('~/.cache/oddly-explained/kokoro')
FILES = {'kokoro-v1.0.onnx': 'https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/kokoro-v1.0.onnx',
         'voices-v1.0.bin': 'https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/voices-v1.0.bin'}

def kokoro():
    os.makedirs(CACHE, exist_ok=True)
    for f, u in FILES.items():
        p = os.path.join(CACHE, f)
        if not os.path.exists(p):
            print('downloading', f); urllib.request.urlretrieve(u, p + '.part'); os.rename(p + '.part', p)
    from kokoro_onnx import Kokoro
    return Kokoro(os.path.join(CACHE, 'kokoro-v1.0.onnx'), os.path.join(CACHE, 'voices-v1.0.bin'))

def resample(x, sr_in, sr_out):
    if sr_in == sr_out: return x
    n = int(round(len(x) * sr_out / sr_in)); t = np.linspace(0, len(x) - 1, n)
    return np.interp(t, np.arange(len(x)), x)

def trim(x, th=0.008):
    i = np.where(np.abs(x) > th)[0]
    return x[max(0, i[0] - int(0.02 * SR)): i[-1] + int(0.06 * SR)] if len(i) else x

_wm = None
def word_starts(a):
    """Word start times (s) inside one line via faster-whisper, or None if unavailable."""
    global _wm
    try:
        from faster_whisper import WhisperModel
        os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
        _wm = _wm or WhisperModel('small.en', device='cpu', compute_type='int8')
        a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
        segs, _ = _wm.transcribe(a16, word_timestamps=True, beam_size=5)
        out = []
        for w in (w for sg in segs for w in sg.words):
            tok = w.word.strip()
            if out and (tok.startswith('-') or tok.startswith("'")): out[-1] = (out[-1][0] + tok, out[-1][1], w.end)  # 'wake' + '-like'
            else: out.append((tok, w.start, w.end))
        return out
    except Exception as e:
        print('  (whisper alignment unavailable:', e, ')'); return None

def rms_frames(x, hop=int(0.01 * SR), win=int(0.03 * SR)):
    return np.array([np.sqrt(np.mean(x[i:i + win] ** 2) + 1e-12) for i in range(0, max(1, len(x) - win), hop)]), hop

v = cfg['voice']; tts = None
total = np.zeros(int(cfg['duration'] * SR)); timings = []; cursor = 0.0
for ln in cfg['narration']:
    ext = os.path.join(vdir, 'voice', ln['id'] + '.wav')
    if os.path.exists(ext):
        a, sr = sf.read(ext); a = a.mean(1) if a.ndim > 1 else a; src = 'recording'
    else:
        tts = tts or kokoro()
        a, sr = tts.create(ln['tts'], voice=v['voice'], speed=v.get('speed', 1.0), lang=v.get('lang', 'en-us')); src = 'kokoro:' + v['voice']
    a = trim(resample(np.asarray(a, dtype=np.float64), sr, SR))
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.89
    start = max(ln['at'], cursor + 0.12); dur = len(a) / SR
    if start + dur > cfg['duration'] - 0.3: print(f"WARNING: line {ln['id']} ends at {start + dur:.2f}s (too late)")
    s0 = int(start * SR); total[s0:s0 + len(a)] += a[: len(total) - s0]
    sf.write(os.path.join(out, 'lines', ln['id'] + '.wav'), a.astype(np.float32), SR)
    # chunk splits: expected position by character share, refined to the quietest 10 ms frame within ±0.35 s
    en = ln['en']; lens = np.array([len(c) for c in en], float); cum = np.cumsum(lens)[:-1] / lens.sum()
    r, hop = rms_frames(a); splits = []
    ws = word_starts(a); nw = [len(c.split()) for c in en]
    if ws and len(ws) == sum(nw):
        k = 0
        for n in nw[:-1]:
            k += n; splits.append(float(0.5 * (ws[k - 1][2] + ws[k][1])))  # midway between last word of chunk and next word
        print('  aligned:', ' '.join(f"{w}@{st:.2f}" for w, st, _ in ws))
    elif ws: print(f'  word count mismatch ({len(ws)} vs {sum(nw)}), using pauses')
    for c in (cum if not splits else []):
        tgt = c * dur; lo, hi = int(max(0, (tgt - 0.35)) * SR / hop), int(min(dur, tgt + 0.35) * SR / hop)
        k = lo + int(np.argmin(r[lo:hi])) if hi > lo else int(tgt * SR / hop)
        splits.append(k * hop / SR + 0.015)
    bounds = [0.0] + splits + [dur]
    chunks = [{'start': round(start + bounds[i], 3), 'end': round(start + bounds[i + 1], 3), 'en': en[i], 'fa': ln['fa'][i]} for i in range(len(en))]
    timings.append({'id': ln['id'], 'start': round(start, 3), 'end': round(start + dur, 3), 'source': src, 'chunks': chunks})
    cursor = start + dur
    print(f"{ln['id']}: {start:6.2f} -> {start + dur:6.2f}s  ({src})  splits {[round(s, 2) for s in splits]}")

sf.write(os.path.join(out, 'narration.wav'), total.astype(np.float32), SR)
json.dump({'duration': cfg['duration'], 'lines': timings}, open(os.path.join(out, 'timings.json'), 'w'), ensure_ascii=False, indent=2)
print('wrote', os.path.join(out, 'narration.wav'))
