#!/usr/bin/env python3
"""Assemble a 3D Pip & Pebble episode project.
usage: make_episode.py SPEC.json OUT_DIR
SPEC: {"id","duration","caption","night","overlays":[{"id","text","style"}], "script": "<file with render(t, k) body>", "cues": [...]}"""
import json, os, shutil, subprocess, sys

spec = json.load(open(sys.argv[1])); out = sys.argv[2]
kit = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(out, "assets"), exist_ok=True)
for f in ["kit.js", "three.module.js", "gsap.min.js", "fredoka-latin-500-normal.woff2", "fredoka-latin-700-normal.woff2"]:
    shutil.copy(os.path.join(kit, f), os.path.join(out, "assets", f))
shutil.copytree(os.path.join(kit, "jsm"), os.path.join(out, "assets", "jsm"), dirs_exist_ok=True)
for f in ["hyperframes.json"]:
    shutil.copy(os.path.join(kit, "..", "episodes", "ep05-3d-buffet-film", f), os.path.join(out, f))
json.dump({"id": spec["id"], "name": spec["id"]}, open(os.path.join(out, "meta.json"), "w"), indent=2)
json.dump({"name": spec["id"], "private": True, "type": "module"}, open(os.path.join(out, "package.json"), "w"), indent=2)

D = spec["duration"]
script = open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), spec["script"])).read()
overlays = "\n".join(f'<div id="{o["id"]}" class="fx" style="{o["style"]}">{o["text"]}</div>' for o in spec.get("overlays", []))
html = f"""<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <script type="importmap">{{ "imports": {{ "three": "./assets/three.module.js" }} }}</script>
    <style>
      @font-face {{ font-family: "Fredoka"; font-weight: 700; src: url("assets/fredoka-latin-700-normal.woff2") format("woff2"); }}
      @font-face {{ font-family: "Fredoka"; font-weight: 500; src: url("assets/fredoka-latin-500-normal.woff2") format("woff2"); }}
      :root {{ --ground: #000; --ink: #fff; --font-display: "Fredoka", sans-serif; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; font-family: var(--font-display); background: #000; }}
      .clip {{ position: absolute; inset: 0; }}
      #topcap {{ position: absolute; left: 70px; right: 70px; top: 360px; text-align: center; color: var(--ink); font-weight: 700; font-size: 66px; line-height: 1.15; }}
      #brand {{ position: absolute; left: 0; right: 0; top: 1340px; text-align: center; color: #9a9ab5; font-weight: 500; font-size: 42px; }}
      #film {{ position: absolute; left: 0; top: 656px; width: 1080px; height: 607.5px; overflow: hidden; }}
      #gl {{ position: absolute; inset: 0; width: 1080px; height: 607.5px; display: block; }}
      #vig {{ position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%); }}
      #flash {{ position: absolute; inset: 0; background: #fff; opacity: 0; }}
      .fx {{ position: absolute; font-weight: 700; color: #fff; -webkit-text-stroke: 12px #2b2a6e; paint-order: stroke fill; opacity: 0; white-space: nowrap; }}
      .card {{ -webkit-text-stroke: 0; background: #fff; color: #2b2a6e; border-radius: 26px; padding: 18px 28px; font-size: 40px; box-shadow: 0 12px 40px rgba(0,0,0,.35); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{D}" data-width="1080" data-height="1920">
      <div id="caps" class="clip" data-start="0" data-duration="{D}" data-track-index="1">
        <div id="topcap">{spec["caption"]}</div>
        <div id="brand">Pip &amp; Pebble 🐸🐌</div>
      </div>
      <div id="filmClip" class="clip" data-start="0" data-duration="{D}" data-track-index="0">
        <div id="film">
          <canvas id="gl" width="1440" height="810"></canvas>
          <div id="vig"></div>
          {overlays}
          <div id="flash"></div>
        </div>
      </div>
      <audio id="sound" src="assets/audio.wav" data-start="0" data-duration="{D}" data-volume="1"></audio>
    </div>
    <script type="module">
      import {{ build, THREE, v3, lerp, cl, ease, easeIn }} from "./assets/kit.js";
      const K = build({{ canvas: document.getElementById("gl"), night: {str(spec.get("night", False)).lower()} }});
      const $ = (id) => document.getElementById(id);
      const show = (id, on) => {{ $(id).style.opacity = on ? 1 : 0; }};
      const OVER = {json.dumps([o["id"] for o in spec.get("overlays", [])])};
{script}
      function frame(t) {{ K.reset(t); OVER.forEach((id) => show(id, false)); $("flash").style.opacity = 0; render(t); K.render(); }}
      const state = {{ t: 0 }};
      frame(0);
      const tl = gsap.timeline({{ paused: true }});
      tl.fromTo(state, {{ t: 0 }}, {{ t: {D}, duration: {D}, ease: "none", onUpdate: () => frame(state.t) }}, 0);
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""
open(os.path.join(out, "index.html"), "w").write(html)
json.dump({"duration": D, "seed": 7, "cues": spec["cues"]}, open(os.path.join(out, "cues.json"), "w"))
subprocess.run([sys.executable, "-I", os.path.join(kit, "sfx.py"), os.path.join(out, "cues.json"), os.path.join(out, "assets", "audio.wav")], check=True)
print("built", out)
