#!/usr/bin/env python3
"""Assemble a 2D (ep01–ep03 style) Pip & Pebble episode.
usage: make2d.py SPEC.json OUT_DIR
SPEC: {"id","duration","sky":[top,mid,bottom],"svg": file (world markup, inside the 1.35x zoom group),
       "svgTop": optional file (markup above the zoom group, e.g. phone cards), "script": file (GSAP code using tl, pop, $),
       "captions":[[id,start,dur,text]], "cues":[...]}"""
import json, os, shutil, subprocess, sys

spec = json.load(open(sys.argv[1])); out = sys.argv[2]; here = os.path.dirname(os.path.abspath(sys.argv[1]))
root = os.path.dirname(os.path.abspath(__file__)); repo = os.path.abspath(os.path.join(root, ".."))
src_assets = os.path.join(repo, "episodes", "ep03-rain", "assets")
os.makedirs(os.path.join(out, "assets"), exist_ok=True)
for f in ["gsap.min.js", "characters.js", "fredoka-latin-700-normal.woff2", "fredoka-latin-500-normal.woff2"]:
    shutil.copy(os.path.join(src_assets, f), os.path.join(out, "assets", f))
shutil.copy(os.path.join(repo, "episodes", "ep03-rain", "hyperframes.json"), os.path.join(out, "hyperframes.json"))
json.dump({"id": spec["id"], "name": spec["id"]}, open(os.path.join(out, "meta.json"), "w"), indent=2)
json.dump({"name": spec["id"], "private": True, "type": "module"}, open(os.path.join(out, "package.json"), "w"), indent=2)
rd = lambda k: open(os.path.join(here, spec[k])).read() if spec.get(k) else ""
D = spec["duration"]; sky = spec.get("sky", ["#6fd3ff", "#b8ecff", "#e8fbff"])
caps = "\n".join(f'<div id="{c[0]}" class="clip cap" data-start="{c[1]}" data-duration="{c[2]}" data-track-index="1">{c[3]}</div>' for c in spec["captions"])
pops = "\n".join(f'      pop("#{c[0]}", {c[1] + 0.02});' for c in spec["captions"])
html = f"""<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <script src="assets/characters.js"></script>
    <style>
      @font-face {{ font-family: "Fredoka"; font-weight: 700; src: url("assets/fredoka-latin-700-normal.woff2") format("woff2"); }}
      @font-face {{ font-family: "Fredoka"; font-weight: 500; src: url("assets/fredoka-latin-500-normal.woff2") format("woff2"); }}
      :root {{ --ground: {sky[0]}; --ink: #ffffff; --stroke: #2b2a6e; --font-display: "Fredoka", sans-serif; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--ground); }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; font-family: var(--font-display); }}
      .clip {{ position: absolute; inset: 0; }}
      svg.stage {{ width: 1080px; height: 1920px; }}
      .cap {{ position: absolute; left: 50px; right: 50px; top: 250px; bottom: auto; text-align: center; color: var(--ink); font-weight: 700; font-size: 96px; line-height: 1.05;
        -webkit-text-stroke: 16px var(--stroke); paint-order: stroke fill; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{D}" data-width="1080" data-height="1920">
      <svg id="world" class="clip stage" data-start="0" data-duration="{D}" data-track-index="0" viewBox="0 0 1080 1920">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky[0]}" /><stop offset="0.6" stop-color="{sky[1]}" /><stop offset="1" stop-color="{sky[2]}" /></linearGradient>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6c4" /><stop offset="0.5" stop-color="#ffd27a" stop-opacity="0.7" /><stop offset="1" stop-color="#ffb347" stop-opacity="0" /></radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#sky)" />
        {rd("svgBack")}
        <g id="zoom" transform="translate(540,1300) scale(1.35) translate(-540,-1300)">
          <path d="M0,1250 C300,1180 700,1320 1080,1230 L1080,1920 L0,1920 Z" fill="{spec.get("hill1", "#8be08f")}" />
          <path d="M0,1520 C320,1470 760,1580 1080,1500 L1080,1920 L0,1920 Z" fill="{spec.get("hill2", "#5fcf6a")}" />
          {rd("svg")}
        </g>
        {rd("svgTop")}
      </svg>
      {caps}
      <audio id="sound" src="assets/audio.wav" data-start="0" data-duration="{D}" data-volume="1"></audio>
    </div>
    <script>
      const NS = "http://www.w3.org/2000/svg";
      const $ = (id) => document.getElementById(id);
      const mk = (tag, attrs, parent) => {{ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }};
      const pipSVG = (s = 0.5) => `<g transform="scale(${{s}})">${{PIP(0, -165, 1)}}</g>`;
      const pebSVG = (s = 0.5, shades = false) => `<g transform="scale(${{s}})">${{PEBBLE(0, -92, 1)}}${{shades ? `<g><rect x="105" y="-245" width="62" height="44" rx="14" fill="#111"/><rect x="167" y="-240" width="62" height="44" rx="14" fill="#111"/><rect x="150" y="-232" width="30" height="8" fill="#111"/><rect x="115" y="-238" width="18" height="8" rx="4" fill="#fff" opacity=".6"/></g>` : ""}}</g>`;
      // eyelids for Pip (scaled 0.5): eye centres (+/-42.5, -158.5), r 29
      const lidsSVG = (s = 0.5) => `<g transform="scale(${{s / 0.5}})"><circle cx="-42.5" cy="-158.5" r="31" fill="#5fcf6a"/><circle cx="42.5" cy="-158.5" r="31" fill="#5fcf6a"/><path d="M-62,-156 C-50,-146 -35,-146 -23,-156 M23,-156 C35,-146 50,-146 62,-156" stroke="#1b1a2e" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
      const winkSVG = (s = 0.5) => `<g transform="scale(${{s / 0.5}})"><circle cx="42.5" cy="-158.5" r="31" fill="#5fcf6a"/><path d="M23,-156 C35,-146 50,-146 62,-156" stroke="#1b1a2e" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
      const star = (x, y, s) => `M${{x}},${{y - s}} L${{x + s * 0.25}},${{y - s * 0.25}} L${{x + s}},${{y}} L${{x + s * 0.25}},${{y + s * 0.25}} L${{x}},${{y + s}} L${{x - s * 0.25}},${{y + s * 0.25}} L${{x - s}},${{y}} L${{x - s * 0.25}},${{y - s * 0.25}} Z`;
      const tl = gsap.timeline({{ paused: true }});
      const pop = (id, t) => tl.fromTo(id, {{ scale: 0.4, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.22, ease: "back.out(2.5)" }}, t);
      // dust/splash puff helper: creates n circles in group g around (x,y) and animates them at t
      function puff(g, x, y, t, color = "#e8d6b0", n = 6, spread = 60) {{
        const els = []; for (let i = 0; i < n; i++) els.push(mk("circle", {{ cx: x, cy: y, r: 22 + (i % 3) * 8, fill: color, opacity: 0 }}, $(g)));
        els.forEach((e, i) => tl.fromTo(e, {{ opacity: 0.9, x: 0, y: 0, scale: 0.5, transformOrigin: "50% 50%" }}, {{ opacity: 0, x: (i - n / 2) * spread * 0.5, y: -40 - (i % 2) * 40, scale: 1.8, transformOrigin: "50% 50%", duration: 0.7, immediateRender: false }}, t));
        tl.set(els, {{ opacity: 0 }}, 0);
      }}
{rd("script")}
{pops}
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""
open(os.path.join(out, "index.html"), "w").write(html)
json.dump({"duration": D, "seed": 7, "cues": spec["cues"]}, open(os.path.join(out, "cues.json"), "w"))
subprocess.run([sys.executable, "-I", os.path.join(repo, "3d-kit", "sfx.py"), os.path.join(out, "cues.json"), os.path.join(out, "assets", "audio.wav")], check=True)
print("built", out)
