"""Assemble rendered shots -> graded master + preview.
usage: python3 assemble.py <build_dir> <music.wav> <final.mp4> <preview.mp4>
"""
import json, os, subprocess, sys, re
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD, MUSIC, FINAL, PREV = sys.argv[1:5]
TL = json.load(open(os.path.join(HERE, "timeline.json")))
FPS = TL["format"]["fps"]; B = 60 / TL["music"]["bpm"]
segs = json.load(open(os.path.join(BUILD, "segments", "segments.json")))
shots = TL["shots"]
total = sum(s["frames"] for s in segs) / FPS
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

inputs, fc, groups, cur = [], [], [], None
for i, (s, g) in enumerate(zip(shots, segs)):
    inputs += ["-i", g["file"]]
    if cur is None:
        cur = {"label": f"[{i}:v]", "len": 0}
    else:
        prev = shots[i - 1]
        d = prev.get("dissolve_out", 0)
        if d:
            out = f"[x{i}]"
            fc.append(f"{cur['label']}[{i}:v]xfade=transition=fade:duration={round(d*FPS)/FPS:.4f}:offset={cur['len']/FPS:.4f}{out}")
            cur["label"] = out
        else:
            groups.append(cur["label"]); cur = {"label": f"[{i}:v]", "len": 0}
    cur["len"] += g["frames"]
groups.append(cur["label"])
fc.append("".join(groups) + f"concat=n={len(groups)}:v=1:a=0[cat]")

# title timing: last shot
start_last = sum(s["frames"] for s in segs[:-1]) / FPS
last = shots[-1]
t0 = start_last + 1.0
title = last.get("title", "")
alpha = f"if(lt(t,{t0:.2f}),0,if(lt(t,{t0+1.2:.2f}),(t-{t0:.2f})/1.2,1))"
grade = ",".join([
    # filmic tone: gentle S-curve keeping shadow detail, cool shadows / warm highlights
    "curves=master='0/0.02 0.18/0.13 0.5/0.5 0.82/0.86 1/0.97'",
    "colorbalance=rs=-0.035:gs=-0.005:bs=0.045:rm=0.01:bm=-0.01:rh=0.05:gh=0.015:bh=-0.04",
    "eq=saturation=0.92",
    "vignette=angle=PI/5:mode=forward",
    "noise=c0s=5:c0f=t+u:c1s=2:c1f=t+u:c2s=2:c2f=t+u",
    f"drawtext=fontfile={FONT}:text='{title}':fontsize=40:fontcolor=white@0.9:x=(w-tw)/2:y=h*0.80:alpha='{alpha}'",
    f"fade=in:st=0:d={shots[0].get('fade_in', 0.5)}",
    f"fade=out:st={total - last.get('fade_out', 1.0):.3f}:d={last.get('fade_out', 1.0)}",
    "format=yuv420p",
])
fc.append(f"[cat]{grade},split[m][p];[p]scale=540:960:flags=lanczos[pv]")

# two-pass loudness normalisation of the score (-14 LUFS, -1.5 dBTP)
m = subprocess.run(["ffmpeg", "-i", MUSIC, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                   capture_output=True, text=True).stderr
j = json.loads(re.findall(r"\{[^{}]+\}", m)[-1])
an = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
      f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,"
      f"afade=in:d=0.6,afade=out:st={total-2.2:.3f}:d=2.2,aresample=48000")
na = len(segs)
fc.append(f"[{na}:a]{an},asplit[am][ap]")
cmd = ["ffmpeg", "-y", "-v", "error", *inputs, "-i", MUSIC, "-filter_complex", ";".join(fc),
       "-map", "[m]", "-map", "[am]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high",
       "-level", "4.2", "-r", str(FPS), "-g", "60", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart",
       "-t", f"{total:.3f}", FINAL,
       "-map", "[pv]", "-map", "[ap]", "-c:v", "libx264", "-preset", "medium", "-crf", "26",
       "-r", str(FPS), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-t", f"{total:.3f}", PREV]
subprocess.run(cmd, check=True)
print("done", total, "s")
