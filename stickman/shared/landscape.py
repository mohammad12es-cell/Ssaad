"""Make landscape (1920x1080) copies of the hand-built vertical episodes ep01-ep03 for the long-form video."""
import os, re, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
GROUND = 'M-560,1250 C-200,1244 100,1256 400,1250 S800,1244 1100,1250 S1500,1256 1700,1250'
def convert(name, extra=()):
    src = os.path.join(ROOT, name); dst = os.path.join(ROOT, "build", "landscape", name)
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".hyperframes", "renders"))
    if os.path.exists(os.path.join(dst, "assets", "inky.js")): shutil.copy(os.path.join(HERE, "inky.js"), os.path.join(dst, "assets", "inky.js"))
    p = os.path.join(dst, "index.html"); s = open(p).read()
    reps = [('data-resolution="portrait"', 'data-resolution="landscape"'), ('width=1080, height=1920', 'width=1920, height=1080'),
            ('width: 1080px; height: 1920px;', 'width: 1920px; height: 1080px;'), ('data-width="1080" data-height="1920"', 'data-width="1920" data-height="1080"'),
            ('viewBox="0 0 1080 1920"', 'viewBox="-420 280 1920 1080"'), ('<rect width="1080" height="1920" fill="#fbf7ea" />', '<rect x="-1000" y="-600" width="3200" height="3200" fill="#fbf7ea" />'),
            ('x1="120" y1="0" x2="120" y2="1920"', 'x1="120" y1="-600" x2="120" y2="2600"'),
            ('for (let y = 160; y < 1920; y += 64) mk("line", { x1: 0, y1: y, x2: 1080, y2: y }', 'for (let y = -480; y < 2400; y += 64) mk("line", { x1: -1000, y1: y, x2: 2100, y2: y }'),
            ('M40,1252 C260,1244 520,1258 760,1248 S1000,1254 1040,1250', GROUND),
            ('left: 60px; right: 60px; top: 200px;', 'left: 200px; right: 200px; top: 34px;')] + list(extra)
    for a, b in reps: s = s.replace(a, b)
    s = re.sub(r'font-size: 1(0[0-9]|1[0-9])px', 'font-size: 88px', s)
    open(p, "w").write(s); print("converted", name)
convert("ep01-draw-battle")
convert("ep02-ink-blot")
convert("ep03-draw-a-friend", [('tl.to(["#pal", "#cool"], { x: "+=640", duration: 1.6', 'tl.to(["#pal", "#cool"], { x: "+=1300", duration: 2.2')])
