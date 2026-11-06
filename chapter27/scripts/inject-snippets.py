#!/usr/bin/env python3
"""Paste the shared SVG snippets into the scene files (idempotent).
  <!--FIGURE--> ... <!--/FIGURE-->          scripts/figure-snippet.svg
  <!--ARENA s3--> ... <!--/ARENA-->         scripts/arena-snippet.svg, ids prefixed with the scene id
"""
import glob, os, re
here = os.path.dirname(os.path.abspath(__file__))
fig = open(os.path.join(here, "figure-snippet.svg")).read().strip()
arena = open(os.path.join(here, "arena-snippet.svg")).read().strip()
for p in glob.glob(os.path.join(here, "..", "compositions", "*.html")):
    s = open(p).read()
    s2 = re.sub(r"<!--FIGURE-->(.*?<!--/FIGURE-->)?", lambda m: "<!--FIGURE-->\n" + fig + "\n<!--/FIGURE-->", s, flags=re.S)
    s2 = re.sub(r"<!--ARENA (\w+)-->(.*?<!--/ARENA-->)?",
                lambda m: "<!--ARENA " + m.group(1) + "-->\n" + arena.replace("__P__", m.group(1)) + "\n<!--/ARENA-->", s2, flags=re.S)
    if s2 != s:
        open(p, "w").write(s2); print("snippets ->", os.path.basename(p))
