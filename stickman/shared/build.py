"""Build (and optionally render) Margin Man episodes from stickman/episodes/*.js.

  python3 stickman/shared/build.py 04-cloud 05-ladder --mode landscape --render
  python3 stickman/shared/build.py all --mode portrait --render

Each episode gets a HyperFrames project in stickman/build/<mode>/<id>/ (git-ignored):
the template, the shared scripts, its episode script, and a synthesized audio.wav made
from the sound cues the episode script records.
"""
import argparse, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # stickman/
REPO = os.path.dirname(ROOT)
sys.path.insert(0, HERE)
from sfx import Mix  # noqa: E402

MODES = {
    "portrait": dict(W=1080, H=1920, VB="0 0 1080 1920", RES="portrait",
                     CAPCSS="left: 60px; right: 60px; top: 200px; font-size: 108px;"),
    "landscape": dict(W=1920, H=1080, VB="-420 280 1920 1080", RES="landscape",
                      CAPCSS="left: 200px; right: 200px; top: 34px; font-size: 88px;"),
}

TUNES = {
    "happy": (["E4", "G4", "C5", "G4", "A4", "G4", "E4", None, "D4", "F4", "A4", "F4", "G4", "E4", "D4", None,
               "E4", "G4", "C5", "D5", "E5", "D5", "C5", None, "A4", "G4", "E4", "D4", "C4", None, "G4", None],
              ["C3", "C3", "F3", "G3", "C3", "A3", "F3", "G3"], 128, 0.12),
    "sneaky": (["A4", "C5", "E5", "C5", "D5", "C5", "A4", None, "G4", "B4", "D5", "B4", "C5", "A4", "G4", None,
                "A4", "C5", "E5", "G5", "E5", "D5", "C5", None, "D5", "C5", "A4", "G4", "A4", None, "E5", None],
               ["A3", "A3", "F3", "G3", "A3", "E3", "F3", "G3"], 136, 0.18),
    "bright": (["C5", "E5", "G5", "E5", "F5", "E5", "D5", None, "C5", "D5", "E5", "C5", "D5", None, "G4", None],
               ["C3", "A3", "F3", "G3"], 132, 0.12),
    "sad": (["E4", None, "D4", "C4", "D4", None, "E4", None], ["A3", "F3"], 96, 0.0),
    "chase": (["E5", "D5", "E5", "B4", "C5", "D5", "B4", None, "A4", "C5", "E5", "A5", "G5", "E5", "D5", None],
              ["A3", "E3", "F3", "G3"], 160, 0.22),
    "dreamy": (["G4", "B4", "D5", "B4", "C5", "E5", "D5", None, "B4", "D5", "G5", "D5", "C5", "B4", "A4", None],
               ["G3", "E3", "C3", "D3"], 104, 0.05),
}


def copy_assets(dst):
    a = os.path.join(dst, "assets")
    os.makedirs(a, exist_ok=True)
    for f in ("inky.js", "props.js", "engine.js"):
        shutil.copy(os.path.join(HERE, f), a)
    src = os.path.join(ROOT, "ep01-draw-battle", "assets")
    for f in ("gsap.min.js", "patrick-hand-latin-400-normal.woff2"):
        shutil.copy(os.path.join(src, f), a)
    shutil.copy(os.path.join(ROOT, "ep01-draw-battle", "hyperframes.json"), dst)


def write_html(dst, mode, dur):
    t = open(os.path.join(HERE, "template.html")).read()
    for k, v in {**MODES[mode], "DUR": f"{dur:g}"}.items():
        t = t.replace("{" + k + "}", str(v))
    open(os.path.join(dst, "index.html"), "w").write(t)


def make_audio(meta, path):
    m = Mix(meta["dur"], seed=abs(hash(meta.get("title", ""))) % 1000)
    music = meta["music"]
    for i, (name, t0) in enumerate(music):
        t1 = music[i + 1][1] if i + 1 < len(music) else meta["dur"]
        if name in TUNES and t1 > t0:
            mel, bass, bpm, sq = TUNES[name]
            m.tune(mel, bass, bpm=bpm, square=sq, start=t0, end=t1,
                   mel_gain=0.2 if name in ("sad", "dreamy") else 0.22)
    for cue in meta["sfx"]:
        name, t, *args = cue
        fn = getattr(m, name, None)
        if fn and t < meta["dur"]:
            fn(t, *args)
    m.write(path, mutes=[tuple(x) for x in meta["mutes"]])


def build(ep, mode, render, quality):
    src = os.path.join(ROOT, "episodes", ep + ".js")
    dst = os.path.join(ROOT, "build", mode, ep)
    os.makedirs(dst, exist_ok=True)
    copy_assets(dst)
    shutil.copy(src, os.path.join(dst, "assets", "episode.js"))
    write_html(dst, mode, 60)
    out = subprocess.run(["node", os.path.join(HERE, "meta.js"), dst], capture_output=True, text=True)
    if out.returncode:
        print(f"[{ep}] FAILED\n{out.stderr}")
        return None
    if out.stderr.strip():
        print(f"[{ep}] page errors:\n{out.stderr}")
    meta = json.loads(out.stdout.strip().splitlines()[-1])
    write_html(dst, mode, meta["dur"])
    make_audio(meta, os.path.join(dst, "assets", "audio.wav"))
    json.dump(meta, open(os.path.join(dst, "meta.json"), "w"))
    print(f"[{ep}] {meta['title']} · {meta['dur']}s")
    if render:
        o = os.path.join(ROOT, "build", "renders", mode, ep + ".mp4")
        os.makedirs(os.path.dirname(o), exist_ok=True)
        r = subprocess.run(["npx", "hyperframes", "render", dst, "-q", quality, "-o", o, "--quiet"],
                           cwd=os.path.join(REPO, "hyperframes-diya"), capture_output=True, text=True)
        print(f"[{ep}] render {'ok' if r.returncode == 0 and os.path.exists(o) else 'FAILED: ' + r.stderr[-600:]}")
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("episodes", nargs="+")
    ap.add_argument("--mode", default="landscape", choices=MODES)
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--quality", default="looks")
    a = ap.parse_args()
    eps = a.episodes
    if eps == ["all"]:
        eps = sorted(f[:-3] for f in os.listdir(os.path.join(ROOT, "episodes")) if f.endswith(".js"))
    for ep in eps:
        build(ep, a.mode, a.render, a.quality)
