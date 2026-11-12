import sys, json, wave, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=4, download_root=sys.argv[3])
w_ = wave.open(sys.argv[1]); audio = np.frombuffer(w_.readframes(w_.getnframes()), dtype=np.int16).astype(np.float32) / 32768
segs, info = m.transcribe(audio, language="fa", word_timestamps=True, beam_size=5, vad_filter=False,
                          initial_prompt="سرمایه‌گذاری در ارمنستان، اقامت، ایروان، دامپروری، کشاورزی.")
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text.strip(), "words": [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for w in s.words]})
    print(f"{s.start:6.2f}-{s.end:6.2f} {s.text.strip()}")
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
