"""Render shots for the horizontal cut. Shot boundaries follow the song's detected beat times.
usage: python3 render_h.py <uploads_dir> <build_dir> <beats.npy>
"""
import json, os, subprocess, sys
import numpy as np
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
UP, OUT, BEATS = sys.argv[1:4]
TL = json.load(open(os.path.join(HERE, "timeline_h.json")))
W, H, FPS = TL["format"]["width"], TL["format"]["height"], TL["format"]["fps"]
bt = np.load(BEATS); k0 = TL["music"]["start_beat_index"]
SEG = os.path.join(OUT, "segments"); os.makedirs(SEG, exist_ok=True)
ENC = ["-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuv420p"]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[-2500:])

def video_chain(s, src, n):
    pre = []
    if src.get("content_crop"): pre.append("crop=" + src["content_crop"])
    if src.get("orient"): pre.append(src["orient"])
    if src.get("grade"): pre.append(src["grade"])
    if s.get("grade"): pre.append(s["grade"])
    dur = n / FPS
    if "ramp" in s:
        t0, k = s["ramp"]["normal_for"], s["ramp"]["slow_factor"]
        pre.append(f"setpts='(if(lt(T,{t0}),T,{t0}+(T-{t0})*{k}))/TB'"); factor = k
    else:
        factor = dur / (s["out"] - s["in"]); pre.append(f"setpts={factor:.5f}*(PTS-STARTPTS)")
    pre.append(f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" if factor > 1.2 else f"fps={FPS}")
    pre.append("tpad=stop_mode=clone:stop_duration=2")
    if s["frame"] == "full":   # cover 16:9
        return ",".join(pre + [f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"])
    # portrait footage: centred window over a blurred, darkened extension of itself
    a, cy = s["win_aspect"], s.get("cy", 0.5)
    ww = int(H * a) // 2 * 2
    return (",".join(pre) + ",split[a][b];"
            f"[a]scale={W//4}:{H//4}:force_original_aspect_ratio=increase,crop={W//4}:{H//4},"
            f"boxblur=14:3,eq=brightness=-0.12:saturation=0.75,scale={W}:{H}[bg];"
            f"[b]crop=iw:'trunc(iw/{a}/2)*2':0:'max(0,min(ih-iw/{a},ih*{cy}-iw/{a}/2))',"
            f"scale={ww}:{H}:flags=lanczos[fg];[bg][fg]overlay=({W}-{ww})/2:0")

def photo_chain(s, n):
    cx, cy = s["cx"], s["cy"]; z0, z1 = s["zoom"]
    # biggest 16:9 box, shrunk by the starting zoom, centred on (cx, cy) and clamped
    bw = f"(min(iw,ih*16/9)/{z0})"; bh = f"(min(ih,iw*9/16)/{z0})"
    crop = f"crop='{bw}':'{bh}':'max(0,min(iw-{bw},iw*{cx}-{bw}/2))':'max(0,min(ih-{bh},ih*{cy}-{bh}/2))'"
    ay = s.get("anchor_y", 0.5)
    z = f"1+({z1/z0:.4f}-1)*on/{n}"
    return (f"{crop},scale={W*2}:{H*2}:flags=lanczos,"
            f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*{ay}':d={n}:s={W}x{H}:fps={FPS}")

def render(i, s, n):
    out = os.path.join(SEG, f"{i:02d}.mov")
    extra = round(s.get("dissolve_out", 0) * FPS); total = n + extra
    if s["type"] == "video":
        src = TL["sources"][s["src"]]
        span = s["out"] - s["in"] + 0.1 + extra / FPS
        cmd = ["ffmpeg", "-y", "-ss", str(s["in"]), "-t", f"{span:.3f}", "-i", os.path.join(UP, src["file"]),
               "-filter_complex", video_chain(s, src, total) + ",setsar=1,format=yuv420p",
               "-frames:v", str(total), "-an", "-r", str(FPS), *ENC, out]
    else:
        cmd = ["ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-i", os.path.join(UP, s["src"]),
               "-filter_complex", photo_chain(s, total) + ",setsar=1,format=yuv420p",
               "-frames:v", str(total), "-r", str(FPS), *ENC, out]
    run(cmd); return out, n, extra

start_t = bt[k0]
jobs, cum = [], 0
for i, s in enumerate(TL["shots"]):
    a = round((bt[k0 + cum] - start_t) * FPS); cum += s["beats"]; b = round((bt[k0 + cum] - start_t) * FPS)
    jobs.append((i, s, b - a))
with ThreadPoolExecutor(4) as ex:
    res = list(ex.map(lambda j: render(*j), jobs))
meta = {"montage_start_s": float(start_t), "segments": [{"file": r[0], "frames": r[1], "handle": r[2]} for r in res]}
json.dump(meta, open(os.path.join(SEG, "segments.json"), "w"), indent=1)
print("rendered", len(res), "shots,", sum(r[1] for r in res), "frames; montage starts at", round(start_t, 3))
