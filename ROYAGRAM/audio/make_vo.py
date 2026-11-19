#!/usr/bin/env python3
"""Generate the 7 narration lines with Kokoro-82M (Apache-2.0, runs locally on CPU).
usage: python make_vo.py MODEL_DIR(kokoro-v1.0.onnx + voices-v1.0.bin) OUT_DIR   (pip install kokoro-onnx soundfile)"""
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro(sys.argv[1]+"/kokoro-v1.0.onnx", sys.argv[1]+"/voices-v1.0.bin")
out = sys.argv[2]
lines = {
 "vo01": "What if ordinary... could become extraordinary?",
 "vo02": "A feeling. A world. A story.",
 "vo03": "A product becomes an experience.",
 "vo04": "And an idea... becomes unforgettable.",
 "vo05": "Every detail has a purpose.",
 "vo06": "From creative vision, to professional execution.",
 "vo07": "Your vision. Our creativity. Let's make it real.",
}
voice = 0.6*k.get_voice_style("am_michael") + 0.4*k.get_voice_style("am_fenrir")
for key, txt in lines.items():
    a, sr = k.create(txt, voice=voice, speed=0.88, lang="en-us")
    sf.write(f"{out}/{key}.wav", a, sr)
    print(key, sr, round(len(a)/sr,2))
