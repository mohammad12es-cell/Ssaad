#!/usr/bin/env python3
"""Word onsets on the 30 s timeline -> vo/cues.json.

Whisper (vo/whisper-full.json, run on the placed stem) gives the words; a word whose Whisper
start falls inside a silence (silencedetect -40 dB on vo-placed.wav) starts at that silence's end.
The script's spelling replaces Whisper's (it hears «بلی» for «ولی» even on the approved sample).
"""
import json, os, re, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = [w for s in json.load(open(os.path.join(ROOT, "vo", "whisper-full.json"), encoding="utf-8")) for w in s["words"]]
log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", os.path.join(ROOT, "assets", "audio", "vo-placed.wav"),
                      "-af", "silencedetect=n=-40dB:d=0.04", "-f", "null", "-"], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
SIL = list(zip(st, en + [30.0] * (len(st) - len(en))))
SCRIPT = ("اینو Claude ساخت. یه خط کد‌هم ننوشتم. ولی نسخه‌ی اولش این بود. کلمه به کلمه، نه حرف به حرف. "
          "وگرنه حروفِ فارسی از‌هم جدا می‌شن. دو: فنر، نه‌خطِ صاف. که حرکت جون بگیره. سه: دوربینِ دستی. "
          "هیچی ثابت نمی‌مونه. چهار: موشن‌بلرِ واقعی، و صدا. هوش مصنوعی ابزاره. چشمِ ادیتوره که خوبش می‌کنه. "
          "کامنت کن «پرامپت»، تا پرامپت کامل چک‌لیست رو برات بفرستم.").split()
assert len(SCRIPT) == len(W), (len(SCRIPT), len(W))
out, used = [], set()
for sw, w in zip(SCRIPT, W):
    s = w["s"]
    for a, b in SIL:   # inside a pause, or a micro-pause (plosive closure) ending just after the Whisper start
        if b in used:
            continue
        if a - 0.02 <= s < b or (b - a < 0.3 and s - 0.1 <= b <= s + 0.3):
            kind = "pause" if a - 0.02 <= s < b else "micro"
            s = b; used.add(b)
            break
    else:
        kind = ""
    out.append({"kind": kind, "ws": w["s"], "w": sw.replace("‌", " ") if sw in ("کد‌هم", "از‌هم", "نه‌خطِ") else sw,
                "heard": w["w"], "s": round(s, 3), "e": round(w["e"], 3)})
# keep onsets in order: a micro-snap that lands on the next word is undone; else push the next word
for i in range(1, len(out)):
    p, c = out[i - 1], out[i]
    if c["s"] - p["s"] < 0.08:
        if p["kind"] == "micro" and p["ws"] < c["s"] - 0.08:
            p["s"] = p["ws"]
        else:
            c["s"] = round(p["s"] + 0.12, 3)
# checked by hand against the envelope: «تا» starts right after the 26.67-26.81 pause
OVERRIDE = {55: 26.805, 56: 26.95}
for i, t in OVERRIDE.items():
    out[i]["s"] = t
json.dump({"words": out, "silences": SIL}, open(os.path.join(ROOT, "vo", "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for o in out:
    print(f"{o['s']:6.2f} {o['w']}  ({o['heard']})")
