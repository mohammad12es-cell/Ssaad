"""Join the landscape episode renders into one long-form YouTube video with page-turn transitions.

  python3 stickman/shared/compile.py output/margin-man-lost-in-the-notebook.mp4

Writes the video plus a chapters .txt (YouTube timestamps) next to it.
Each clip gets a short frozen tail so the 0.5 s slide transition never eats any action.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
R = os.path.join(ROOT, "build", "renders", "landscape")
T = 0.5  # transition length
HAND = {"ep01-draw-battle": "Drawing Battle", "ep02-ink-blot": "Ink Blot", "ep03-draw-a-friend": "Draw a Friend"}


def order():
    eps = sorted(f[:-3] for f in os.listdir(os.path.join(ROOT, "episodes")) if f.endswith(".js"))
    intro = [e for e in eps if e.startswith("00")]
    outro = [e for e in eps if e.startswith("99")]
    finale = [e for e in eps if e.endswith("last-page")]
    mid = [e for e in eps if e not in intro + outro + finale]
    return intro + list(HAND) + mid + finale + outro


def title(ep):
    if ep in HAND:
        return HAND[ep]
    m = os.path.join(ROOT, "build", "landscape", ep, "meta.json")
    return json.load(open(m))["title"] if os.path.exists(m) else ep


def dur(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))


def main(out):
    eps = [e for e in order() if os.path.exists(os.path.join(R, e + ".mp4"))]
    missing = [e for e in order() if e not in eps]
    if missing:
        print("missing renders:", missing)
    files = [os.path.join(R, e + ".mp4") for e in eps]
    durs = [dur(f) + T for f in files]  # padded
    args, fc = [], []
    for i, f in enumerate(files):
        args += ["-i", f]
        fc.append(f"[{i}:v]fps=30,scale=1920:1080,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration={T}[v{i}]")
        fc.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo,apad=pad_dur={T}[a{i}]")
    v, a, off = "v0", "a0", 0.0
    starts = [0.0]
    trans = ["slideleft", "wipeleft"]
    for i in range(1, len(files)):
        off += durs[i - 1] - T
        starts.append(off)
        fc.append(f"[{v}][v{i}]xfade=transition={trans[i % 2]}:duration={T}:offset={off:.3f}[vx{i}]")
        fc.append(f"[{a}][a{i}]acrossfade=d={T}[ax{i}]")
        v, a = f"vx{i}", f"ax{i}"
    total = off + durs[-1]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-stats", *args, "-filter_complex", ";".join(fc), "-map", f"[{v}]", "-map", f"[{a}]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    lines = []
    # YouTube chapters must be >= 10 s: the short intro is folded into the first episode's chapter
    if eps and eps[0].startswith("00") and len(eps) > 1:
        starts = [0.0] + starts[2:]
        eps = eps[1:]
    for e, s in zip(eps, starts):
        mm, ss = divmod(int(round(s)), 60)
        t = title(e)
        if e.startswith("00"):
            t = "Intro"
        lines.append(f"{mm}:{ss:02d} {t}")
    ch = os.path.splitext(out)[0] + "-chapters.txt"
    open(ch, "w").write("\n".join(lines) + "\n")
    print(f"done: {out}  {total / 60:.2f} min, {len(eps)} parts; chapters -> {ch}")


if __name__ == "__main__":
    main(sys.argv[1])
