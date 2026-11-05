"""Render one short: python3 video.py <module> [--preview t1,t2,...] [--workers N]"""
import sys, os, time, importlib, subprocess, argparse, multiprocessing as mp
import numpy as np
from engine import W, H, ROOT, render, cinematic_grade, make_stars
from overlay import Canvas, caption
import audio

FPS = 30
OUT = os.path.join(ROOT, "out")
os.makedirs(OUT, exist_ok=True)

G = {}


def frame(t):
    mod, L, tl, stars = G["mod"], G["layers"], G["tl"], G["stars"]
    cam, draw = mod.shot(t, tl)
    if hasattr(cam, "render_self"):
        base = cinematic_grade(np.clip(cam.render_self(L), 0, 1))
    else:
        base, info = render(cam, L, cinematic_grade, stars, haze=getattr(mod, "HAZE", 1.0))
    if hasattr(mod, "post"):
        base = mod.post(base, t, tl)
    cv = Canvas()
    if draw:
        draw(cv, cam, t)
    # captions
    for sc in tl:
        for ln in sc["lines"]:
            caption(cv, ln["text"], ln["start"] - 0.05, ln["end"] + 0.25, t)
    return cv.compose(base)


def worker(args):
    idx, f0, f1, path = args
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    t0 = time.time()
    for i in range(f0, f1):
        p.stdin.write(frame(i / FPS).tobytes())
        if idx == 0 and (i - f0) % 60 == 0:
            done = (i - f0 + 1) / (f1 - f0)
            print(f"   {G['name']}: {done*100:4.0f}%  ({time.time()-t0:5.0f}s)", flush=True)
    p.stdin.close()
    p.wait()
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mod")
    ap.add_argument("--preview", default="")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    sys.path.insert(0, os.path.join(ROOT, "videos"))
    mod = importlib.import_module(a.mod)
    tl = audio.plan(mod.NARRATION)
    total = tl[-1]["end"]
    print(a.mod, "scenes:", [round(s["dur"], 2) for s in tl], "total", round(total, 2), "speeds", [s["speed"] for s in tl])
    G.update(mod=mod, layers=mod.layers(), tl=tl, stars=make_stars(), name=a.mod)
    if a.preview:
        from PIL import Image
        ims = []
        for t in [float(x) for x in a.preview.split(",")]:
            ims.append(Image.fromarray(frame(t)).resize((W // 3, H // 3)))
        sheet = Image.new("RGB", (W // 3 * len(ims), H // 3))
        for i, im in enumerate(ims):
            sheet.paste(im, (i * W // 3, 0))
        p = os.path.join(OUT, f"{a.mod}_preview.jpg")
        sheet.save(p, quality=88)
        print(p)
        return
    nf = int(round(total * FPS))
    k = a.workers
    bounds = [int(nf * i / k) for i in range(k + 1)]
    work = os.path.join(OUT, "work_" + a.mod)
    os.makedirs(work, exist_ok=True)
    jobs = [(i, bounds[i], bounds[i + 1], os.path.join(work, f"part{i}.mp4")) for i in range(k)]
    with mp.get_context("fork").Pool(k) as pool:
        parts = pool.map(worker, jobs)
    lst = os.path.join(work, "list.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    wav = os.path.join(work, "mix.wav")
    audio.mix(tl, total, wav, getattr(mod, "MOOD", "mystery"))
    final = os.path.join(OUT, f"{mod.FILE}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav,
                    "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final],
                   check=True)
    print("DONE", final)


if __name__ == "__main__":
    main()
