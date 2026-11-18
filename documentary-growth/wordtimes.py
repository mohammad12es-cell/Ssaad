"""Word-level timing for each narration line (Whisper word timestamps on the trimmed take).
Writes word_times.json: {line_id: [[word, t0, t1], ...]} relative to the line start."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lines import LINES
from trimdur import trimmed
from faster_whisper import WhisperModel
vo = sys.argv[1]
m = WhisperModel("medium", device="cpu", compute_type="int8")
out = {}
for lid, text, _ in LINES:
    x, sr = trimmed(f"{vo}/{lid}.wav")
    n = int(len(x) * 16000 / sr)
    y = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    pad = 0.25
    y = np.concatenate([np.zeros(int(pad * 16000), np.float32), y, np.zeros(4000, np.float32)])
    segs, _ = m.transcribe(y, language="fa", beam_size=5, word_timestamps=True)
    ws = [[w.word.strip(), round(max(0, w.start - pad), 3), round(max(0, w.end - pad), 3)]
          for s in segs for w in s.words]
    out[lid] = ws
    print(lid, ws, flush=True)
json.dump(out, open(f"{vo}/word_times.json", "w"), ensure_ascii=False, indent=0)
