"""Assemble horizontal master + Instagram (rotated, with rotate-phone prompt) + preview.
usage: python3 assemble_h.py <build_dir> <song.mp3> <prompt.mp4> <out_dir>
"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD, SONG, PROMPT, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
TL = json.load(open(os.path.join(HERE, "timeline_h.json")))
FPS = TL["format"]["fps"]; W, H = TL["format"]["width"], TL["format"]["height"]
meta = json.load(open(os.path.join(BUILD, "segments", "segments.json")))
segs, shots = meta["segments"], TL["shots"]
t_song0 = round(meta["montage_start_s"] * FPS) / FPS      # song time where the montage starts (= prompt length)
total = sum(s["frames"] for s in segs) / FPS
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def sh(cmd): subprocess.run(cmd, check=True)

# ---------- 1. graded picture-only montage (intermediate, near-lossless)
inputs, fc, groups, cur = [], [], [], None
for i, (s, g) in enumerate(zip(shots, segs)):
    inputs += ["-i", g["file"]]
    if cur is None: cur = {"label": f"[{i}:v]", "len": 0}
    else:
        d = shots[i - 1].get("dissolve_out", 0)
        if d:
            fc.append(f"{cur['label']}[{i}:v]xfade=transition=fade:duration={round(d*FPS)/FPS:.4f}:offset={cur['len']/FPS:.4f}[x{i}]")
            cur["label"] = f"[x{i}]"
        else:
            groups.append(cur["label"]); cur = {"label": f"[{i}:v]", "len": 0}
    cur["len"] += g["frames"]
groups.append(cur["label"])
fc.append("".join(groups) + f"concat=n={len(groups)}:v=1:a=0[cat]")
last = shots[-1]; t0 = total - segs[-1]["frames"] / FPS + 1.0
alpha = f"if(lt(t,{t0:.2f}),0,if(lt(t,{t0+1.2:.2f}),(t-{t0:.2f})/1.2,1))"
grade = ",".join([
    "curves=master='0/0.02 0.18/0.13 0.5/0.5 0.82/0.86 1/0.97'",
    "colorbalance=rs=-0.035:gs=-0.005:bs=0.045:rm=0.01:bm=-0.01:rh=0.05:gh=0.015:bh=-0.04",
    "eq=saturation=0.92", "vignette=angle=PI/5",
    "noise=c0s=5:c0f=t+u:c1s=2:c1f=t+u:c2s=2:c2f=t+u",
    f"drawtext=fontfile={FONT}:text='{last.get('title','')}':fontsize=46:fontcolor=white@0.9:x=(w-tw)/2:y=h*0.80:alpha='{alpha}'",
    f"fade=in:st=0:d={shots[0].get('fade_in', 0.3)}",
    f"fade=out:st={total - last.get('fade_out', 1.0):.3f}:d={last.get('fade_out', 1.0)}", "format=yuv420p"])
fc.append(f"[cat]{grade}[v]")
MONT = os.path.join(BUILD, "montage_graded.mov")
sh(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(fc), "-map", "[v]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "10", "-r", str(FPS), MONT])

# ---------- 2. audio: two-pass loudness normalisation to -14 LUFS / -1.5 dBTP
def loud(start, dur, fade_in):
    base = f"atrim=start={start:.4f}:duration={dur:.4f},asetpts=PTS-STARTPTS"
    m = subprocess.run(["ffmpeg", "-i", SONG, "-af", base + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    j = json.loads(re.findall(r"\{[^{}]+\}", m)[-1])
    return (base + f",loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
            f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,"
            f"afade=in:d={fade_in},afade=out:st={dur-2.6:.3f}:d=2.6,aresample=48000")
X264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p",
        "-r", str(FPS), "-g", "60", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart"]

# master 16:9: montage + song from the first downbeat
sh(["ffmpeg", "-y", "-v", "error", "-i", MONT, "-i", SONG, "-filter_complex", f"[1:a]{loud(t_song0, total, 0.12)}[a]",
    "-map", "0:v", "-map", "[a]", *X264, "-t", f"{total:.3f}", os.path.join(OUT, "TEHRAN_323_horizontal_1920x1080.mp4")])

# instagram 9:16: rotate-phone prompt (song intro) + montage rotated 90deg clockwise
ig_total = t_song0 + total
fc = (f"[0:v]fps={FPS},format=yuv420p,setsar=1[p];[1:v]transpose=1,setsar=1[r];[p][r]concat=n=2:v=1:a=0,split[v][pv];"
      f"[pv]scale=540:960:flags=lanczos[pv2];[2:a]{loud(0, ig_total, 0.4)},asplit[a][ap]")
sh(["ffmpeg", "-y", "-v", "error", "-i", PROMPT, "-i", MONT, "-i", SONG, "-filter_complex", fc,
    "-map", "[v]", "-map", "[a]", *X264, "-t", f"{ig_total:.3f}", os.path.join(OUT, "TEHRAN_323_instagram_1080x1920_rotate.mp4"),
    "-map", "[pv2]", "-map", "[ap]", "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart", "-t", f"{ig_total:.3f}", os.path.join(OUT, "TEHRAN_323_instagram_preview_540x960.mp4")])
print("montage", round(total, 3), "s; instagram", round(ig_total, 3), "s")
