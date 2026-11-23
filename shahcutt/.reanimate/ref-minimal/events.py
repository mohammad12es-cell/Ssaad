#!/usr/bin/env python3
"""Motion-timing check for a mixed-fidelity clone: per-frame activity (mean |frame - previous|) of reference and
clone over matching windows, and the times of the key events from spec.md.

usage: events.py <ref_frames_dir> <clone_frames_dir> <ref_t0> <clone_t0> <dur> <label>
Frames are 1-based PNGs at 30 fps (frames.ts output). Both sets are reduced to 180x320 grey.
Events: the strongest single-frame spike (a hard cut), the peak of the smoothed curve, and the windows where the
smoothed activity is above 35 % of its maximum (start, end).
"""
import glob, sys
import numpy as np
from PIL import Image

ref_dir, cl_dir, r0, c0, dur, label = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
FPS = 30

def curve(d, t0):
    fs = sorted(glob.glob(d + "/*.png")); i0 = int(round(t0 * FPS)); n = int(round(dur * FPS))
    fr = [np.asarray(Image.open(f).convert("L").resize((180, 320)), dtype=float) for f in fs[i0:i0 + n + 1]]
    a = np.array([np.abs(fr[i] - fr[i - 1]).mean() for i in range(1, len(fr))])
    return a

def windows(a, frac=0.35):
    s = np.convolve(a, np.ones(5) / 5, "same"); thr = s.max() * frac; on = s > thr; out = []; i = 0
    while i < len(on):
        if on[i]:
            j = i
            while j + 1 < len(on) and on[j + 1]: j += 1
            out.append(((i + 1) / FPS, (j + 1) / FPS)); i = j + 1
        else: i += 1
    return out, int(np.argmax(s)) + 1

ra, ca = curve(ref_dir, r0), curve(cl_dir, c0)
n = min(len(ra), len(ca)); ra, ca = ra[:n], ca[:n]
rn, cn = ra / ra.max(), ca / ca.max()
corr = float(np.corrcoef(np.convolve(rn, np.ones(5) / 5, "same"), np.convolve(cn, np.ones(5) / 5, "same"))[0, 1])
rw, rp = windows(ra); cw, cp = windows(ca)
rs, cs = int(np.argmax(ra)) + 1, int(np.argmax(ca)) + 1
print(f"## {label}: ref {r0:.2f}-{r0 + dur:.2f} s vs clone {c0:.2f}-{c0 + dur:.2f} s ({n} frames)")
print(f"- activity-curve correlation (normalised, 5-frame smooth): {corr:.2f}")
print(f"- biggest single-frame change: ref {rs / FPS:.3f} s, clone {cs / FPS:.3f} s, diff {(cs - rs) / FPS * 1000:+.0f} ms")
print(f"- smoothed peak: ref {rp / FPS:.3f} s, clone {cp / FPS:.3f} s, diff {(cp - rp) / FPS * 1000:+.0f} ms")
print(f"- motion windows (>35 % of max): ref {[(round(a, 2), round(b, 2)) for a, b in rw]}")
print(f"                                 clone {[(round(a, 2), round(b, 2)) for a, b in cw]}")
print("\n```\n t(s)  ref                          clone")
for i in range(0, n, 3):
    print(f"{(i + 1) / FPS:5.2f}  {'#' * int(rn[i] * 28):28s} {'#' * int(cn[i] * 28)}")
print("```")
