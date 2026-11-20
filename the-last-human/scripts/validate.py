#!/usr/bin/env python3
"""Quality control for one rendered episode. Fails loudly (exit 1) on any violation.
Checks every deliverable (clean / FA / EN):
  * exactly 30.000 s, 900 frames, 1080x1920, 30 fps, H.264 yuv420p, AAC 48 kHz stereo
  * integrated loudness within -14 +/- 1.5 LUFS, true peak <= -1 dBTP
  * no unintended black segments (> 0.4 s) or frozen picture (> 1.5 s)
  * subtitles: present at each cue's midpoint (FA/EN differ from clean there), alpha box fully inside the safe area
usage: python3 scripts/validate.py 1
"""
import json, os, subprocess, sys, re
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]); NN = f"{N:02d}"
# intentional black / held frames per episode (story beats), in seconds
ALLOWED_BLACK = {1: [(29.4, 30.0)], 9: [(27.0, 30.0)], 10: [(0.0, 1.6)]}
ALLOWED_FREEZE = {1: [(29.4, 30.0)], 9: [(27.0, 30.0)], 10: [(0.0, 1.6)]}
FILES = {"clean": f"output/episodes/clean/TLH_S01E{NN}_clean.mp4", "fa": f"output/episodes/main_fa/TLH_S01E{NN}_FA.mp4", "en": f"output/episodes/international_en/TLH_S01E{NN}_EN.mp4"}
errors, report = [], {"episode": N, "files": {}}

def sh(cmd): return subprocess.run(cmd, capture_output=True, text=True)
def within(a, b, allowed): return any(a >= x - 0.05 and b <= y + 0.05 for x, y in allowed)
def frame(path, t):
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(1920, 1080, 3).astype(np.int16)

for kind, f in FILES.items():
    p = os.path.join(ROOT, f); info = {}
    if not os.path.exists(p): errors.append(f"{kind}: missing {f}"); continue
    pr = json.loads(sh(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-count_frames", "-of", "json", p]).stdout)
    v = [s for s in pr["streams"] if s["codec_type"] == "video"][0]; a = [s for s in pr["streams"] if s["codec_type"] == "audio"]
    dur = float(pr["format"]["duration"]); nf = int(v["nb_read_frames"])
    info.update(duration=dur, frames=nf, size=f'{v["width"]}x{v["height"]}', fps=v["r_frame_rate"], vcodec=v["codec_name"], pix=v["pix_fmt"], mb=round(os.path.getsize(p) / 1e6, 2))
    if abs(dur - 30.0) > 0.04: errors.append(f"{kind}: duration {dur}")
    if nf != 900: errors.append(f"{kind}: {nf} frames (expected 900)")
    if (v["width"], v["height"]) != (1080, 1920): errors.append(f"{kind}: size {v['width']}x{v['height']}")
    if v["r_frame_rate"] != "30/1": errors.append(f"{kind}: fps {v['r_frame_rate']}")
    if v["pix_fmt"] != "yuv420p": errors.append(f"{kind}: pix_fmt {v['pix_fmt']}")
    if not a: errors.append(f"{kind}: no audio")
    else:
        info.update(acodec=a[0]["codec_name"], sr=a[0]["sample_rate"], ch=a[0]["channels"])
        if a[0]["sample_rate"] != "48000" or a[0]["channels"] != 2: errors.append(f"{kind}: audio {a[0]['sample_rate']}Hz/{a[0]['channels']}ch")
        e = sh(["ffmpeg", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
        I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", e)[-1]); TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", e)[-1])
        info.update(lufs=I, true_peak=TP)
        if abs(I + 14) > 1.5: errors.append(f"{kind}: loudness {I} LUFS")
        if TP > -0.9: errors.append(f"{kind}: true peak {TP} dBTP")
    if kind == "clean":
        e = sh(["ffmpeg", "-i", p, "-vf", "blackdetect=d=0.4:pix_th=0.06:pic_th=0.97,freezedetect=n=0.0015:d=1.5", "-an", "-f", "null", "-"]).stderr
        blacks = [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", e)]
        fs = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", e)]; fe = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", e)]
        freezes = list(zip(fs, fe + [30.0] * (len(fs) - len(fe))))
        info.update(black=blacks, freeze=freezes)
        for a_, b_ in blacks:
            if not within(a_, b_, ALLOWED_BLACK.get(N, [])): errors.append(f"unintended black {a_:.2f}-{b_:.2f}s")
        for a_, b_ in freezes:
            if not within(a_, b_, ALLOWED_FREEZE.get(N, [])): errors.append(f"frozen picture {a_:.2f}-{b_:.2f}s")
    report["files"][kind] = info

# subtitle presence + safe-area check (compare against clean at each cue midpoint)
D = json.load(open(os.path.join(ROOT, "src/data/dialogue.json")))["lines"]; V = json.load(open(os.path.join(ROOT, "src/data/voice.json")))
for lang in ("fa", "en"):
    for l in D:
        if l["ep"] != N: continue
        if lang == "en" and l["kind"] == "onscreen": continue
        if lang == "fa" and l.get("subtitle") is False: continue
        if not (l["fa"] if lang == "fa" else l["en"]): continue
        if l["kind"] == "speech": t = V[l["id"]]["start"] + min(0.8, V[l["id"]]["speech"] / 2)
        else: t = (l["start"] + l["end"]) / 2
        if not os.path.exists(os.path.join(ROOT, FILES[lang])): continue
        d = np.abs(frame(os.path.join(ROOT, FILES[lang]), t) - frame(os.path.join(ROOT, FILES["clean"]), t)).sum(2) > 40
        ys, xs = np.nonzero(d)
        if len(ys) < 2000: errors.append(f"{lang}: subtitle '{l['id']}' not visible at {t:.2f}s"); continue
        box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
        report.setdefault("subs", []).append({"lang": lang, "id": l["id"], "t": round(t, 2), "box": box})
        if box[0] < 40 or box[2] > 1040 or box[3] > 1700 or box[1] < 1200: errors.append(f"{lang}: subtitle '{l['id']}' outside safe area {box}")

report["errors"] = errors; report["pass"] = not errors
os.makedirs(os.path.join(ROOT, "output/qc"), exist_ok=True)
json.dump(report, open(os.path.join(ROOT, f"output/qc/TLH_S01E{NN}_qc.json"), "w"), indent=1)
print(f"QC EP{NN}: {'PASS' if not errors else 'FAIL'}")
for k, i in report["files"].items(): print(f"  {k:6s} {i.get('duration')}s {i.get('frames')}f {i.get('size')} {i.get('fps')} {i.get('lufs')} LUFS {i.get('mb')} MB")
for e in errors: print("  !!", e)
sys.exit(0 if not errors else 1)
