#!/usr/bin/env python3
"""Edit plan for the IRAM CO. «بلک فرایدی در ارمنستان» talking head -> work/plan.json + assets/timing.js.

Word onsets come from Whisper (work/whisper.json, large-v3 on the source audio). Caption spelling is
standard Persian where the speech is colloquial or accented: «هوتل» -> «هتل», «ریزرف» -> «رزرو»,
«بلاک فرایده‌ای» -> «بلک فرایدی», «کافی» -> «کافیه», «بشید» -> «بشه».
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = [w for s in json.load(open(os.path.join(ROOT, "work", "whisper.json"), encoding="utf-8")) for w in s["words"]]
FIX = ["دوستان", "عزیز،", "اگر", "قصد", "سفر", "به", "ارمنستان", "دارید", "و", "می‌خواهید", "بلک", "فرایدی", "در", "ارمنستان",
       "باشید،", "تا", "قبل", "از", "این", "که", "ظرفیت", "هتل‌ها", "تکمیل", "بشه،", "لطفاً", "به", "فکر", "هتل‌تون", "باشید",
       "و", "هتل‌تون", "رو", "قبل", "از", "موعد", "رزرو", "کنید.", "از", "همین", "الان", "به", "فکر", "رزرو", "هتل‌تون",
       "باشید،", "فقط", "کافیه", "کلمه‌ی", "«تور»", "رو", "برای", "ما", "کامنت", "کنید", "تا", "اطلاعات", "سفر", "براتون",
       "ارسال", "بشه."]
assert len(FIX) == len(W), (len(FIX), len(W))
words = [{"w": f, "t": round(max(w["s"], 0.28) if i == 0 else w["s"], 3), "e": round(w["e"], 3)} for i, (f, w) in enumerate(zip(FIX, W))]
# «این که» shows as one caption word
LINES = [(0, 2), (2, 5), (5, 8), (8, 12), (12, 15), (15, 20), (20, 24), (24, 29), (29, 32), (32, 37), (37, 40), (40, 45),
         (45, 50), (50, 54), (54, 57), (57, 60)]
lines = [{"a": a, "b": b, "t0": words[a]["t"], "t1": words[b]["t"] if b < len(words) else 22.3} for a, b in LINES]
t = lambda i: words[i]["t"]
EV = {
    "start": 0.0, "speech": t(0), "armenia": t(6), "black": t(10), "friday": t(11), "capacity": t(20), "hotels": t(21),
    "full": t(22), "think": t(24), "reserve": t(35), "move": 13.08, "now": t(37), "now2": t(39), "comment_word": t(47),
    "tour": t(48), "comment": t(52), "info": t(55), "send": t(58), "speech_end": words[-1]["e"],
    "video_end": 22.3, "end_card": 22.05, "total": 24.6,
}
plan = {"words": words, "lines": lines, "ev": EV}
json.dump(plan, open(os.path.join(ROOT, "work", "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, "assets", "timing.js"), "w").write("window.__P=" + json.dumps(plan, ensure_ascii=False) + ";\n")
for L in lines:
    print(f"{L['t0']:6.2f}-{L['t1']:6.2f}  " + " ".join(w["w"] for w in words[L["a"]:L["b"]]))
print({k: v for k, v in EV.items()})
