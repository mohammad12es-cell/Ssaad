#!/usr/bin/env python3
"""Remove the short take-join dissolves baked into the source video.

The source editor joined his takes with ~8-10 frame cross-dissolves, which show as a double face.
Measured by fitting each frame as a linear blend of a frame before and after the join (alpha ramps
0 -> 1 linearly across the blended frames):

    join  blended frames   time
    1     181-189          6.04-6.31 s
    2     241-248          8.04-8.27 s
    3     272-279          9.08-9.31 s
    4     500-506          16.68-16.88 s
    (the long 12.55-13.95 s crossfade is covered by the key-card interstitial in index.html)

Each join becomes a hard cut at the middle of the dissolve. The L clean frames before it and the L clean
frames after it are stretched over the blended frames (about half speed), so the frame count, and with it
the sound and every graphic, stay exactly in sync. index.html adds a small zoom bump on each cut (CUTS).

usage: fix_dissolves.py <in.mp4> <out.mp4>
"""
import subprocess, sys
import numpy as np

W, H, L = 1080, 1920, 5
JOINS = [(181, 189), (241, 248), (272, 279), (500, 506)]   # first and last blended frame

def build_map(n):
    m = list(range(n)); cuts = []
    for d0, d1 in JOINS:
        a, b = d0 - 1, d1 + 1                  # last clean frame before, first clean frame after
        c = (d0 + d1 + 1) // 2                 # output frame where the cut lands
        s0, e1 = a - L, b + L
        for k in range(s0, c):                 # [s0, c) shows source [s0, a]
            m[k] = round(s0 + (k - s0) * (a - s0) / max(1, c - 1 - s0))
        for k in range(c, e1 + 1):             # [c, e1] shows source [b, e1]
            m[k] = round(b + (k - c) * (e1 - b) / max(1, e1 - c))
        cuts.append(c)
    assert all(m[i] <= m[i + 1] for i in range(n - 1)), "map must not go backwards"
    return m, cuts

def main(src, dst):
    n = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries",
                            "stream=nb_read_frames", "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip())
    m, cuts = build_map(n)
    rd = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    wr = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "30000/1001",
                           "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", dst], stdin=subprocess.PIPE)
    fsz = W * H * 3; buf = {}; nxt = 0
    for k in range(n):
        while nxt <= m[k]:
            buf[nxt] = rd.stdout.read(fsz); nxt += 1
        wr.stdin.write(buf[m[k]])
        for j in [j for j in buf if j < m[k]]: del buf[j]
    rd.stdout.close(); rd.wait(); wr.stdin.close(); wr.wait()
    fps = 30000 / 1001
    print("frames", n, "cuts at", [f"{c} ({c / fps:.3f} s)" for c in cuts])

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
