"""Contact sheet of rendered episodes: one row per episode, frames every few seconds."""
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

def frames(mp4, step, w):
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]))
    tmp = tempfile.mkdtemp()
    out = []
    t = 0.4
    while t < d:
        f = os.path.join(tmp, f"{t:.1f}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t}", "-i", mp4, "-frames:v", "1", "-vf", f"scale={w}:-1", f])
        if os.path.exists(f):
            out.append((t, Image.open(f).convert("RGB")))
        t += step
    return out

def main(dst, step, mp4s, w=320):
    rows = [(os.path.basename(m), frames(m, step, w)) for m in mp4s]
    cols = max(len(r[1]) for r in rows)
    h = rows[0][1][0][1].height
    sheet = Image.new("RGB", (cols * (w + 4), len(rows) * (h + 22)), "#222")
    dr = ImageDraw.Draw(sheet)
    for ri, (name, fr) in enumerate(rows):
        y = ri * (h + 22)
        for ci, (t, im) in enumerate(fr):
            sheet.paste(im, (ci * (w + 4), y + 20))
            dr.text((ci * (w + 4) + 4, y + 4), f"{name} {t:.1f}s", fill="#fff")
    sheet.save(dst)
    print(dst, sheet.size)

if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]), sys.argv[3:])
