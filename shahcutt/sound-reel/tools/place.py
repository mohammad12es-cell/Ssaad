#!/usr/bin/env python3
"""Place the Puck take on the 32.5 s timeline and map every word onto it.

in : assets/audio/vo-full.wav (one generation), vo/whisper-full-raw.json (Whisper on that take)
out: assets/audio/vo-placed.wav (48 kHz stereo stem), vo/words.json (timeline word onsets), vo/timeline.json

Clips are cut in silence (~40 ms pre-roll), 5 ms fades. A word's timeline onset is its source onset mapped
through its clip; a word that starts a clip, or that follows a micro-pause, starts at that pause's end.
"""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO = os.path.join(ROOT, "assets", "audio", "vo-full.wav")
DUR, FADE = 32.5, 0.005

# (src_a, src_b, tempo, at, label)
CLIPS = [
    (0.224, 2.06, 1.0, 0.11, "L1"),
    (2.249, 3.93, 1.0, 2.36, "L2"),
    (4.798, 5.86, 1.0, 7.86, "L3"),
    (6.424, 7.25, 1.0, 9.01, "L4"),
    (7.396, 9.73, 1.0, 9.91, "L5"),
    (9.982, 11.16, 1.0, 12.31, "L6a"),
    (11.220, 12.27, 1.0, 13.51, "L6b"),
    (12.370, 13.30, 1.0, 14.58, "L6c"),
    (13.840, 16.65, 1.0, 15.71, "L7"),
    (16.712, 20.10, 1.0, 19.66, "L8"),
    (20.660, 22.14, 1.0, 23.11, "L9"),
    (23.232, 25.93, 1.0, 28.86, "L10"),
]
# the script's spelling for each Whisper word, in order
LINES = ["صدای این ویدیو رو هم Claude ساخت.", "اول، بدون طراحی صدا ببین.", "حس نداره، نه؟", "سه تا قانون.",
         "یک: هر حرکت، صدای خودش رو داره.", "ووش برای جا به جایی،", "کلیک برای متن،", "بوم برای ضربه.",
         "دو: قبل از ضربه‌ی اصلی، یه لحظه سکوت.", "سه: موزیک همیشه زیر صدای گوینده است. نه‌روش.",
         "حالا همون، با طراحی صدا.", "کامنت کن «صدا»، تا لیست صداهای این ریل رو برات بفرستم."]
assert len(LINES) == len(CLIPS)
SCRIPT = [w for ln in LINES for w in ln.split()]
LINE_OF = [i for i, ln in enumerate(LINES) for _ in ln.split()]

# ---- place the stem
FMT = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
parts = [f"[0:a]aresample=48000,{FMT},asplit={len(CLIPS)}" + "".join(f"[v{i}]" for i in range(len(CLIPS)))]
for i, (a, b, tempo, at, lab) in enumerate(CLIPS):
    d = (b - a) / tempo; ms = int(round(at * 1000))
    ch = f"[v{i}]atrim={a}:{b},asetpts=PTS-STARTPTS" + (f",atempo={tempo}" if tempo != 1.0 else "")
    parts.append(ch + f",afade=t=in:st=0:d={FADE},afade=t=out:st={d - FADE:.4f}:d={FADE},adelay={ms}|{ms}[c{i}]")
parts.append("".join(f"[c{i}]" for i in range(len(CLIPS))) + f"amix=inputs={len(CLIPS)}:normalize=0,apad=whole_dur={DUR},atrim=0:{DUR}[out]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", VO, "-filter_complex", ";".join(parts), "-map", "[out]",
                "-c:a", "pcm_s24le", os.path.join(ROOT, "assets", "audio", "vo-placed.wav")], check=True)

# ---- words onto the timeline
log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", VO, "-af", "silencedetect=n=-40dB:d=0.04", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
SIL = list(zip(st, en))
W = [w for s in json.load(open(os.path.join(ROOT, "vo", "whisper-full-raw.json"), encoding="utf-8")) for w in s["words"]]
assert len(W) == len(SCRIPT), (len(W), len(SCRIPT))
out, used = [], set()
for sw, w in zip(SCRIPT, W):
    s = w["s"]
    for a, b in SIL:
        if b in used:
            continue
        if a - 0.02 <= s < b or (b - a < 0.3 and s - 0.1 <= b <= s + 0.3):
            s = b; used.add(b); break
    k = len(out); li = LINE_OF[k]
    a, b, tempo, at, lab = CLIPS[li]
    first = k == 0 or LINE_OF[k - 1] != li
    t = at + 0.04 / tempo if first else at + max(0.0, s - a) / tempo
    out.append({"w": sw.replace("‌", " ") if sw == "نه‌روش." else sw, "heard": w["w"], "line": lab,
                "src": round(s, 3), "t": round(t, 3)})
for i in range(1, len(out)):  # keep onsets in order
    if out[i]["t"] - out[i - 1]["t"] < 0.08:
        out[i]["t"] = round(out[i - 1]["t"] + 0.1, 3)
json.dump(out, open(os.path.join(ROOT, "vo", "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump([{"label": c[4], "at": c[3], "end": round(c[3] + (c[1] - c[0]) / c[2], 3)} for c in CLIPS],
          open(os.path.join(ROOT, "vo", "timeline.json"), "w"), indent=1)
for c in CLIPS:
    ws = [o for o in out if o["line"] == c[4]]
    print(f"{c[4]:4s} {c[3]:6.2f}-{c[3] + (c[1] - c[0]) / c[2]:6.2f}  " + " ".join(f"{o['w']}@{o['t']:.2f}" for o in ws))
