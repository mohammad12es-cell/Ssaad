"""Render the montage from timeline.json.
usage: python3 render.py <uploads_dir> <out_dir> [preview]
"""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
UP, OUT = sys.argv[1], sys.argv[2]
PREVIEW = len(sys.argv) > 3 and sys.argv[3] == "preview"
TL = json.load(open(os.path.join(HERE, "timeline.json")))
W, H, FPS = TL["format"]["width"], TL["format"]["height"], TL["format"]["fps"]
B = 60 / TL["music"]["bpm"]
SEG = os.path.join(OUT, "segments"); os.makedirs(SEG, exist_ok=True)
WIN_H = W * 5 // 4                     # 4:5 window for horizontal footage
ENC = ["-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuv420p"]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(" ".join(cmd) + "\n" + r.stderr[-2000:])

def clampx(cx, frac):  # centre of a crop of relative width frac
    return min(max(cx, frac / 2), 1 - frac / 2)

def video_chain(s, src, n):
    pre = []
    if src.get("content_crop"): pre.append("crop=" + src["content_crop"])
    if src.get("orient"): pre.append(src["orient"])
    if src.get("grade"): pre.append(src["grade"])
    if s.get("grade"): pre.append(s["grade"])
    dur = n / FPS
    if "ramp" in s:
        t0, k = s["ramp"]["normal_for"], s["ramp"]["slow_factor"]
        speed = f"setpts='(if(lt(T,{t0}),T,{t0}+(T-{t0})*{k}))/TB'"
        factor = k
    else:
        factor = dur / (s["out"] - s["in"])
        speed = f"setpts={factor:.5f}*(PTS-STARTPTS)"
    smooth = f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" if factor > 1.2 else f"fps={FPS}"
    cx = s.get("cx", 0.5)
    if s["frame"] == "full":
        frame = (f"crop='trunc(ih*9/16/2)*2':ih:'max(0,min(iw-ih*9/16,iw*{cx}-ih*9/32))':0,"
                 f"scale={W}:{H}:flags=lanczos")
        return ",".join(pre + [speed, smooth, frame, "tpad=stop_mode=clone:stop_duration=2"])
    # window: 4:5 framed shot over a blurred, darkened extension of itself
    body = ",".join(pre + [speed, smooth, "tpad=stop_mode=clone:stop_duration=2"])
    return (f"{body},split[a][b];"
            f"[a]scale={W//4}:{H//4}:force_original_aspect_ratio=increase,crop={W//4}:{H//4},"
            f"boxblur=12:3,eq=brightness=-0.10:saturation=0.75,scale={W}:{H}[bg];"
            f"[b]crop='trunc(ih*4/5/2)*2':ih:'max(0,min(iw-ih*4/5,iw*{cx}-ih*2/5))':0,"
            f"scale={W}:{WIN_H}:flags=lanczos[fg];"
            f"[bg][fg]overlay=0:{(H-WIN_H)//2}")

def photo_chain(s, n):
    if "pan" in s:
        x0, x1 = s["pan"]
        # scale so the frame height has 4% headroom, then slide a 9:16 window across
        return (f"scale=-2:{int(H*1.04)}:flags=lanczos,"
                f"crop={W}:{H}:'(iw-{W})*({x0}+({x1}-{x0})*min(1,t/{n/FPS:.3f}))/1':'(ih-{H})/2',"
                f"fps={FPS}")
    cx, cy = s["cx"], s["cy"]
    z0, z1 = s["zoom"]
    # crop the biggest 9:16 box around (cx,cy), upscale 2x, then smooth zoompan
    crop = (f"crop='min(iw,ih*9/16)':'min(ih,iw*16/9)':"
            f"'max(0,min(iw-min(iw,ih*9/16),iw*{cx}-min(iw,ih*9/16)/2))':"
            f"'max(0,min(ih-min(ih,iw*16/9),ih*{cy}-min(ih,iw*16/9)/2))'")
    z = f"{z0}+({z1}-{z0})*on/{n}"
    return (f"{crop},scale={W*2}:{H*2}:flags=lanczos,"
            f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*{s.get("anchor_y",0.5)}':d={n}:s={W}x{H}:fps={FPS}")

def render(i, s, n):
    out = os.path.join(SEG, f"{i:02d}.mov")
    extra = round(s.get("dissolve_out", 0) * FPS)
    total = n + extra
    if s["type"] == "video":
        src = TL["sources"][s["src"]]
        span = s["out"] - s["in"] + 0.1 + (extra / FPS)
        vf = video_chain(s, src, total)
        cmd = ["ffmpeg", "-y", "-ss", str(s["in"]), "-t", f"{span:.3f}", "-i", os.path.join(UP, src["file"]),
               "-filter_complex", vf + ",setsar=1,format=yuv420p", "-frames:v", str(total), "-an", "-r", str(FPS), *ENC, out]
    else:
        vf = photo_chain(s, total)
        cmd = ["ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-i", os.path.join(UP, s["src"]),
               "-filter_complex", vf + ",setsar=1,format=yuv420p", "-frames:v", str(total), "-r", str(FPS), *ENC, out]
    run(cmd)
    return out, n, extra

# exact frame boundaries derived from cumulative beats (no drift)
jobs, cum = [], 0
for i, s in enumerate(TL["shots"]):
    a = round(cum * B * FPS); cum += s["beats"]; b = round(cum * B * FPS)
    jobs.append((i, s, b - a))
assert cum == TL["music"]["beats"], cum
with ThreadPoolExecutor(4) as ex:
    res = list(ex.map(lambda j: render(*j), jobs))
json.dump([{"file": r[0], "frames": r[1], "handle": r[2]} for r in res], open(os.path.join(SEG, "segments.json"), "w"), indent=1)
print("rendered", len(res), "shots,", sum(r[1] for r in res), "frames")
