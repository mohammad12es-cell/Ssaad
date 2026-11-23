#!/usr/bin/env python3
"""Per-frame levels from the real audio -> assets/meters.js (window.METERS).

vo  = the voice stem, mus = the music after sidechain ducking (as in the mix), mix = the full mix.
Values are dBFS RMS per 30 fps frame (floor -60). Rule 2's waveform and rule 3's meters read them.
"""
import json, os, subprocess
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets", "audio")
SC = json.load(open(os.path.join(ROOT, "tools", "scenes.json"))); DUR = SC["total"]; FPS = 30
FMT = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
fc = (f"[0:a]{FMT}[k];[1:a]{FMT},volume=-3dB[m];"
      "[m][k]sidechaincompress=threshold=0.02:ratio=5:attack=10:release=350[out]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{A}/vo-placed.wav", "-i", f"{A}/music.wav", "-filter_complex", fc,
                "-map", "[out]", "-c:a", "pcm_s16le", os.path.join(ROOT, "work", "mus-ducked.wav")], check=True)
def frames(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32); n = 1600; nf = int(DUR * FPS)
    x = np.pad(x, (0, max(0, nf * n - len(x))))[: nf * n].reshape(nf, n)
    return np.maximum(-60, 20 * np.log10(np.sqrt((x ** 2).mean(1)) + 1e-9)).round(1).tolist()
M = {"fps": FPS, "vo": frames(f"{A}/vo-placed.wav"), "mus": frames(os.path.join(ROOT, "work", "mus-ducked.wav")),
     "mix": frames(f"{A}/mix-full.wav")}
open(os.path.join(ROOT, "assets", "meters.js"), "w").write("window.METERS=" + json.dumps(M, separators=(",", ":")) + ";\n")
v, m = np.array(M["vo"]), np.array(M["mus"]); r3 = slice(int(19.66 * FPS), int(23.05 * FPS))
talk = v[r3] > -40
print("frames", len(v), "| rule 3: music while talking %.1f dB, between words %.1f dB" % (m[r3][talk].mean(), m[r3][~talk].mean()))
