#!/usr/bin/env python3
"""Final pre-master: voice + SFX + music -> assets/audio/mix-full.wav (48 kHz stereo).

SFX and music are static-gained, then sidechain-ducked under the voice (as in the sample:
threshold 0.03, ratio 4, attack 5 ms, release 250 ms). Music sits ~15-20 dB under the voice.
tools/deliver.sh then masters it to -14 LUFS / -1.5 dBTP.
"""
import os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets", "audio")
SFX_DB = float(sys.argv[1]) if len(sys.argv) > 1 else -7.0
MUS_DB = float(sys.argv[2]) if len(sys.argv) > 2 else -12.0
DUR = 30.0
FMT = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
fc = ";".join([
    f"[0:a]{FMT},asplit=3[vo][k1][k2]",
    f"[1:a]{FMT},volume={SFX_DB}dB[sfx0]",
    f"[2:a]{FMT},volume={MUS_DB}dB[mus0]",
    "[sfx0][k1]sidechaincompress=threshold=0.03:ratio=4:attack=5:release=250[sfx]",
    "[mus0][k2]sidechaincompress=threshold=0.02:ratio=5:attack=10:release=350[mus]",
    f"[vo][sfx][mus]amix=inputs=3:normalize=0,atrim=0:{DUR}[out]",
])
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(A, "vo-placed.wav"), "-i", os.path.join(A, "sfx-full.wav"),
                "-i", os.path.join(A, "music.wav"), "-filter_complex", fc, "-map", "[out]", "-c:a", "pcm_s24le",
                os.path.join(A, "mix-full.wav")], check=True)
print(f"mix-full.wav (sfx {SFX_DB} dB, music {MUS_DB} dB)")
