import subprocess, os, sys
from concurrent.futures import ThreadPoolExecutor

U = "/root/.claude/uploads/4bf93bfe-0d79-5262-9603-327768896405/"
S = os.path.dirname(os.path.abspath(__file__))
SEG = os.path.join(S, "segs"); os.makedirs(SEG, exist_ok=True)
TEH = U + "51667561-TEHRAN_is_the_most_vibrant_city_in_IRAN_tehran_tehranpic_tehrangeles_tehran_iran_____.mp4"
V1 = U + "213ceb25-VID_20261120_195847_542.mp4"   # day roll shots (letterboxed)
V2 = U + "34a8dedc-VID_20261120_195822_956.mp4"   # night drive, fireworks (pillarboxed)
P = lambda n: U + n
FPS, W, H = 30, 720, 1280
B = 60 / 140

# (kind, source, in, out, beats, opts)
# opts: rot = rotate 90° clockwise (Tehran sideways style), crop = letterbox crop,
#       slow = use motion interpolation, flash = white flash in, punch = zoom punch on cut
clips = [
    # ---- intro: Tehran night (base video) ----
    ("v", TEH, 0.90, 2.20, 4, dict()),
    ("v", TEH, 0.40, 0.90, 2, dict(slow=True)),
    ("v", TEH, 3.90, 4.80, 2, dict(punch=True)),
    ("i", P("4bfaacae-image.jpg"), 0, 0, 2, dict(rot=True, zoom="in", punch=True)),
    ("v", TEH, 2.20, 2.45, 1, dict(punch=True)),
    ("v", TEH, 2.85, 3.10, 1, dict(punch=True)),
    ("i", P("dd27b8d9-image.jpg"), 0, 0, 2, dict(rot=True, zoom="out", punch=True)),
    ("v", TEH, 3.25, 3.90, 2, dict(slow=True, dark=True)),
    # ---- drop 1 ----
    ("v", V1, 0.0, 1.70, 4, dict(crop="1024:580:0:350", rot=True, flash=True)),
    ("i", P("127f61aa-image.jpg"), 0, 0, 2, dict(rot=True, zoom="in", punch=True)),
    ("i", P("cbfad1ce-image.jpg"), 0, 0, 2, dict(rot=True, zoom="out", punch=True)),
    ("v", V1, 7.00, 9.60, 4, dict(crop="1024:580:0:350", rot=True, punch=True)),
    ("v", TEH, 4.80, 6.30, 4, dict(slow=True)),
    # ---- slow-motion hero: night drive + fireworks ----
    ("v", V2, 1.75, 4.75, 14, dict(crop="720:1280:152:0", slow=True, flash=True)),
    # ---- drop 2 ----
    ("i", P("92134b41-image.jpg"), 0, 0, 2, dict(rot=True, zoom="in", flash=True)),
    ("i", P("c1db9650-image.jpg"), 0, 0, 2, dict(zoom="in", punch=True)),
    ("v", TEH, 9.70, 10.20, 1, dict(punch=True)),
    ("v", TEH, 8.80, 9.25, 1, dict(punch=True)),
    ("v", V1, 11.0, 13.5, 6, dict(crop="1024:580:0:350", rot=True, punch=True)),
    ("v", TEH, 7.74, 8.80, 6, dict(slow=True)),
    ("i", P("92ab6d02-image.jpg"), 0, 0, 2, dict(zoom="in", punch=True)),
    ("i", P("d834e0a8-image.jpg"), 0, 0, 2, dict(zoom="out", punch=True)),
    ("i", P("92dc5f7d-image.jpg"), 0, 0, 2, dict(zoom="in", punch=True)),
    ("v", TEH, 6.35, 7.00, 2, dict(punch=True)),
    ("v", V1, 18.0, 22.0, 4, dict(crop="1024:580:0:350", rot=True, punch=True)),
    # ---- outro: Milad tower ----
    ("v", TEH, 10.25, 13.0, 8, dict(slow=True, outro=True)),
]

def cover():  # scale to cover 720x1280 then centre-crop
    return f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}"

def punch_f():
    return (f"scale=w='{W}*(1+0.10*exp(-t*9))':h=-2:eval=frame:flags=bicubic,"
            f"crop={W}:{H}:(iw-{W})/2:(ih-{H})/2")

def build(i, c, start_frame, nframes):
    kind, src, a, b, beats, o = c
    out = os.path.join(SEG, f"{i:02d}.mp4")
    dur = nframes / FPS
    post = []
    if o.get("punch"): post.append(punch_f())
    if o.get("flash"): post.append("fade=in:st=0:d=0.25:color=white")
    if o.get("dark"): post.append("fade=out:st=%.3f:d=0.2" % (dur - 0.2))
    post.append(f"setsar=1,format=yuv420p")
    if kind == "v":
        f = []
        if o.get("crop"): f.append("crop=" + o["crop"])
        if o.get("rot"): f.append("transpose=1")
        f.append(cover())
        factor = dur / (b - a)
        f.append(f"setpts={factor:.5f}*(PTS-STARTPTS)")
        if o.get("slow") and factor > 1.15:
            f.append(f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
        f.append(f"fps={FPS}")
        f.append(f"tpad=stop_mode=clone:stop_duration=1")
        vf = ",".join(f + post)
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-t", str(b - a + 0.05), "-i", src,
               "-vf", vf, "-frames:v", str(nframes), "-an", "-c:v", "libx264", "-preset", "medium",
               "-crf", "16", "-r", str(FPS), out]
    else:
        f = []
        if o.get("rot"): f.append("transpose=1")
        # big intermediate for smooth Ken Burns
        f.append(f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase:flags=lanczos,crop={W*2}:{H*2}")
        z = (f"1.0+0.12*on/{nframes}" if o.get("zoom") == "in" else f"1.12-0.12*on/{nframes}")
        f.append(f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={nframes}:s={W}x{H}:fps={FPS}")
        vf = ",".join(f + post)
        cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", src, "-vf", vf,
               "-frames:v", str(nframes), "-c:v", "libx264", "-preset", "medium", "-crf", "16",
               "-r", str(FPS), out]
    subprocess.run(cmd, check=True)
    return out

jobs = []; cum = 0
for i, c in enumerate(clips):
    s = round(cum * B * FPS); cum += c[4]; e = round(cum * B * FPS)
    jobs.append((i, c, s, e - s))
print("total beats", cum, "seconds", cum * B)
with ThreadPoolExecutor(4) as ex:
    outs = list(ex.map(lambda j: build(*j), jobs))
with open(os.path.join(SEG, "list.txt"), "w") as fh:
    for o in outs: fh.write(f"file '{o}'\n")
print("segments done")
