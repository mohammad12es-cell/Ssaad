#!/usr/bin/env python3
"""Automated QC of the final Reel: format, frame count, decode errors, black frames, flicker, audio loudness.
usage: qc.py FINAL.mp4 FRAMES_DIR"""
import json, subprocess, sys, glob
import numpy as np
from PIL import Image

mp4, frames = sys.argv[1], sys.argv[2]
def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)
rep = {}
p = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", mp4]).stdout)
v = [s for s in p["streams"] if s["codec_type"] == "video"][0]; a = [s for s in p["streams"] if s["codec_type"] == "audio"][0]
rep["video"] = f'{v["codec_name"]} {v["profile"]} {v["width"]}x{v["height"]} {v["pix_fmt"]} {v["r_frame_rate"]} fps, frames={v.get("nb_frames")}, colour={v.get("color_space")}/{v.get("color_primaries")}/{v.get("color_transfer")}'
rep["audio"] = f'{a["codec_name"]} {a["sample_rate"]} Hz {a["channels"]} ch {int(a.get("bit_rate", 0))//1000} kb/s'
rep["duration"] = f'{float(p["format"]["duration"]):.3f} s, size {int(p["format"]["size"])/1e6:.1f} MB'
dec = run(["ffmpeg", "-v", "error", "-i", mp4, "-f", "null", "-"]); rep["decode_errors"] = dec.stderr.strip() or "none"
bd = run(["ffmpeg", "-hide_banner", "-i", mp4, "-vf", "blackdetect=d=0.04:pix_th=0.06", "-an", "-f", "null", "-"])
rep["blackdetect"] = [l.split("blackdetect ")[1] for l in bd.stderr.splitlines() if "black_start" in l] or "none"
eb = run(["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]).stderr
summ = eb[eb.rfind("Summary:"):]
rep["loudness"] = " | ".join(l.strip() for l in summ.splitlines() if l.strip().startswith(("I:", "LRA:", "Peak:")))
# per-frame luma from lossless frames: corruption / flicker / black checks
files = sorted(glob.glob(frames + "/*.png")); L = []
for f in files:
    im = np.asarray(Image.open(f).convert("L").resize((135, 240)), dtype=np.float32) / 255; L.append(im.mean())
L = np.array(L); rep["frames_on_disk"] = len(files)
rep["luma_min_max"] = f"{L.min():.3f} .. {L.max():.3f}"
d = np.diff(L); spikes = [i + 1 for i in range(1, len(d)) if abs(d[i]) > 0.08 and abs(d[i - 1]) > 0.08 and np.sign(d[i]) != np.sign(d[i - 1])]
rep["single_frame_luma_spikes(flicker)"] = spikes or "none"
cuts = [(i + 1, round(float(d[i]), 3)) for i in range(len(d)) if abs(d[i]) > 0.12]
rep["large_luma_changes(intended cuts/flashes)"] = cuts
rep["near_black_frames(<0.01)"] = [i for i, x in enumerate(L) if x < 0.01] or "none"
print(json.dumps(rep, indent=2, default=str))
