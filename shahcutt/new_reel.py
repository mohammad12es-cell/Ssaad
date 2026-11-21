#!/usr/bin/env python3
"""Scaffold a new @shahcutt reel: python3 shahcutt/new_reel.py <slug>  ->  shahcutt/reels/<slug>/ (a HyperFrames project).
Then write its script.json, generate the voice (gen_vo.py), clean/tighten it, transcribe it and run build.py."""
import json, os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
slug = sys.argv[1]; dst = os.path.join(HERE, "reels", slug)
if os.path.exists(dst): sys.exit(f"{dst} exists")
shutil.copytree(os.path.join(HERE, "engine"), dst, ignore=shutil.ignore_patterns("__pycache__", "index.html", "timing.json", "vo_words*.json", "voiceover.wav", "music.wav", "sfx.wav"))
os.makedirs(os.path.join(dst, "assets", "vo"), exist_ok=True)
json.dump({"id": f"shahcutt-{slug}", "name": f"shahcutt-{slug}"}, open(os.path.join(dst, "meta.json"), "w"), indent=2)
print(dst)
