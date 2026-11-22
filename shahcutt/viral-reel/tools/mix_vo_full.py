#!/usr/bin/env python3
"""Place the Puck voice on the 30 s timeline -> assets/audio/vo-placed.wav (48 kHz stereo stem).

Sources (both Gemini 3.8 Flash TTS, voice Puck, same style prompt):
  S = assets/audio/vo-gemini.wav  the approved 7 s sample: lines 1-3, placed exactly as in the sample
      (the full take read L3 slower, 1.62 s, too long for the 3.05-4.2 window at atempo <= 1.08,
      and Whisper heard its «ولی» as «بلی»; HANDOFF step 1 allows this splice)
  F = assets/audio/vo-full.wav    the full take: lines 4-13
Each clip is cut in silence (silencedetect -40 dB; ~40 ms pre-roll), 5 ms fades, optional atempo,
dropped at a fixed time. The S lines are gain-matched to the F take (voiced RMS).
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, "assets", "audio")
SRC = {"S": os.path.join(AUD, "vo-gemini.wav"), "F": os.path.join(AUD, "vo-full.wav")}
DUR, FADE = 30.0, 0.005

# (src, a, b, tempo, at, label)        speech onset ~ at + 0.04 / tempo
CLIPS = [
    ("S", 0.000, 1.360, 1.00, 0.10, "L1 اینو Claude ساخت."),
    ("S", 1.470, 3.120, 1.06, 1.46, "L2 یه خط کد هم ننوشتم."),
    ("S", 3.300, 4.580, 1.06, 3.06, "L3 ولی نسخه‌ی اولش این بود."),
    ("F", 5.309, 7.390, 1.00, 4.91, "L4 کلمه به کلمه، نه حرف به حرف."),
    ("F", 7.470, 9.070, 1.00, 7.06, "L5 وگرنه حروفِ فارسی از هم جدا می‌شن."),
    ("F", 9.829, 11.760, 1.00, 9.06, "L6 دو: فنر، نه خطِ صاف."),
    ("F", 11.957, 13.050, 1.00, 11.16, "L7 که حرکت جون بگیره."),
    ("F", 13.350, 14.650, 1.00, 13.06, "L8 سه: دوربینِ دستی."),
    ("F", 14.848, 16.040, 1.00, 14.76, "L9 هیچی ثابت نمی‌مونه."),
    ("F", 16.394, 17.000, 1.00, 17.26, "L10a چهار:"),
    ("F", 17.226, 18.420, 1.00, 18.09, "L10b موشن‌بلرِ واقعی…"),
    ("F", 18.759, 19.600, 1.00, 19.76, "L10c و صدا."),
    ("F", 20.785, 21.940, 1.00, 22.06, "L11 هوش مصنوعی ابزاره."),
    ("F", 22.147, 23.770, 1.00, 23.56, "L12 چشمِ ادیتوره که خوبش می‌کنه."),
    ("F", 24.257, 27.470, 1.04, 25.66, "L13 کامنت کن «پرامپت»، تا پرامپت کامل و چک‌لیست رو برات بفرستم."),
]


def read(path):
    w = wave.open(path); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
    return x, sr


def voiced_rms(x, sr, a, b):
    seg = x[int(a * sr): int(b * sr)]; n = int(0.02 * sr)
    fr = seg[: len(seg) // n * n].reshape(-1, n); r = np.sqrt((fr ** 2).mean(1))
    r = r[r > 10 ** (-40 / 20)]
    return float(np.sqrt((r ** 2).mean()))


aud = {k: read(p) for k, p in SRC.items()}
rms = {k: np.median([voiced_rms(*aud[k], a, b) for s, a, b, *_ in CLIPS if s == k]) for k in SRC}
gain_db = {k: 20 * np.log10(rms["F"] / rms[k]) for k in SRC}
print("gain match (dB):", {k: round(v, 2) for k, v in gain_db.items()})

FMT = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
keys = list(SRC)
args = ["ffmpeg", "-y", "-v", "error"]
for k in keys:
    args += ["-i", SRC[k]]
parts, labels = [], []
for k, idx in zip(keys, range(len(keys))):
    n = sum(1 for c in CLIPS if c[0] == k)
    parts.append(f"[{idx}:a]aresample=48000,{FMT},volume={gain_db[k]:.2f}dB,asplit={n}" + "".join(f"[{k}{j}]" for j in range(n)))
cnt = {k: 0 for k in keys}
placed = []
for i, (k, a, b, tempo, at, lab) in enumerate(CLIPS):
    j = cnt[k]; cnt[k] += 1
    d = (b - a) / tempo
    ch = f"[{k}{j}]atrim={a}:{b},asetpts=PTS-STARTPTS"
    if tempo != 1.0:
        ch += f",atempo={tempo}"
    ms = int(round(at * 1000))
    ch += f",afade=t=in:st=0:d={FADE},afade=t=out:st={d - FADE:.4f}:d={FADE},adelay={ms}|{ms}[c{i}]"
    parts.append(ch); labels.append(f"[c{i}]")
    placed.append({"label": lab, "src": k, "at": at, "end": round(at + d, 3), "tempo": tempo})
    print(f"{lab:60s} {at:6.2f}-{at + d:6.2f}")
parts.append("".join(labels) + f"amix=inputs={len(CLIPS)}:normalize=0,apad=whole_dur={DUR},atrim=0:{DUR}[out]")
args += ["-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s24le", os.path.join(AUD, "vo-placed.wav")]
subprocess.run(args, check=True)
json.dump(placed, open(os.path.join(ROOT, "vo", "placed.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote assets/audio/vo-placed.wav + vo/placed.json")
