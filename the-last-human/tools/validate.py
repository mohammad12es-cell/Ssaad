#!/usr/bin/env python3
"""Validate the deliverables: duration, frame count, fps, resolution, codecs, audio, subtitles."""
import json, os, subprocess, sys
import numpy as np
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(root)
def probe(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", p], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)
def frame(p, t):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", p, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(1920, 1080).astype(float)
ok = True
def check(cond, msg):
    global ok; ok &= bool(cond); print(("  PASS " if cond else "  FAIL ") + msg)
VER = next((a.split("=")[1] for a in sys.argv[1:] if a.startswith("--version=")), "")
TAG = f"EP01_{VER.upper()}" if VER else "EP01"; OUT = f"output/{VER}" if VER else "output"
files = [f"THE_LAST_HUMAN_{TAG}_FA.mp4", f"THE_LAST_HUMAN_{TAG}_EN.mp4", f"THE_LAST_HUMAN_{TAG}_CLEAN.mp4"]
for f in files:
    p = os.path.join(OUT, f); print(f)
    d = probe(p); v = [s for s in d["streams"] if s["codec_type"] == "video"][0]; a = [s for s in d["streams"] if s["codec_type"] == "audio"]
    check(v["codec_name"] == "h264" and v["pix_fmt"] == "yuv420p", f"video h264 {v['pix_fmt']} {v.get('profile')}")
    check(v["width"] == 1080 and v["height"] == 1920, f"resolution {v['width']}x{v['height']} (9:16)")
    check(v["r_frame_rate"] == "30/1" and v["avg_frame_rate"] == "30/1", f"frame rate {v['r_frame_rate']} avg {v['avg_frame_rate']}")
    check(int(v["nb_read_frames"]) == 900, f"frames {v['nb_read_frames']}")
    check(abs(float(v["duration"]) - 30.0) < 0.001, f"video duration {v['duration']}s")
    check(len(a) == 1 and a[0]["codec_name"] == "aac" and a[0]["channels"] == 2, f"audio {a[0]['codec_name']} {a[0]['sample_rate']} Hz {a[0]['channels']}ch")
    check(abs(float(a[0]["duration"]) - 30.0) < 0.03, f"audio duration {a[0]['duration']}s")
    check(abs(float(d["format"]["duration"]) - 30.0) < 0.03, f"container duration {d['format']['duration']}s")
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "null", "-"], capture_output=True, text=True)
    check(r.returncode == 0 and not r.stderr.strip(), "full decode without errors")
print("subtitles (difference vs CLEAN in the subtitle band)")
clean = os.path.join(OUT, files[2])
band = (slice(1380, 1520), slice(60, 1020))
checks = [(files[0], 27.2, True), (files[1], 27.2, True), (files[0], 21.8, True), (files[1], 21.8, False), (files[0], 12.0, False), (files[1], 12.0, False)]
if VER: checks = [(files[0], 26.8, True), (files[1], 26.8, True), (files[0], 22.5, True), (files[1], 22.5, False), (files[0], 9.0, False), (files[1], 9.0, False)]
for f, t, expect in checks:
    diff = np.abs(frame(os.path.join(OUT, f), t)[band] - frame(clean, t)[band]).mean()
    check((diff > 4) == expect, f"{f.split('_')[-1]} @ {t}s subtitle {'present' if expect else 'absent'} (mean diff {diff:.1f})")
for s in (f"{TAG}_FA.srt", f"{TAG}_EN.srt"):
    txt = open(os.path.join(OUT, s), encoding="utf-8").read()
    check("-->" in txt, f"{s} readable UTF-8 SRT")
check("«این غیرممکنه.»" in open(os.path.join(OUT, f"{TAG}_FA.srt"), encoding="utf-8").read(), "Persian line exact")
check("That is impossible." in open(os.path.join(OUT, f"{TAG}_EN.srt"), encoding="utf-8").read(), "English line exact")
print("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED"); sys.exit(0 if ok else 1)
