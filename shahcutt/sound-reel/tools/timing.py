#!/usr/bin/env python3
"""scenes.json + vo/words.json -> assets/timing.js (window.__T), read by index.html and assets/world.js."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "tools", "scenes.json")))
W = json.load(open(os.path.join(ROOT, "vo", "words.json"), encoding="utf-8"))
lines = {}
for o in W:
    lines.setdefault(o["line"], []).append(o["t"])
T["w"] = lines
T["cue"] = {"whoosh": lines["L6a"][0], "click": lines["L6b"][0], "boom": lines["L6c"][0]}
T["loopOut"] = round(T["total"] - 0.55, 3)
open(os.path.join(ROOT, "assets", "timing.js"), "w").write("window.__T=" + json.dumps(T, ensure_ascii=False) + ";\n")
print({k: len(v) for k, v in lines.items()}, T["cue"], "loopOut", T["loopOut"])
