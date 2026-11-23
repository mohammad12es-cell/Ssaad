#!/usr/bin/env python3
"""Presenter cut-out for the IRAM-style cover: one 4K source frame -> RGBA PNG (waist-up), graded to match the reel.

usage: cover_cutout.py <source.mp4> <t seconds> <out.png> <models dir>
The matte (MODNet) runs on a crop around him so it gets more pixels than a full-frame pass; the edge is then
eased with a small blur so hair does not look cut with scissors. The grade follows tools/cinegrade.py in spirit:
warm key, gentle S-curve, emerald shadows / gold highlights, +6 % saturation.
"""
import glob, subprocess, sys
import numpy as np, cv2, onnxruntime as ort

src, t, out, models = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
W, H = 2160, 3840
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                     capture_output=True).stdout
img = np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0

sess = ort.InferenceSession(glob.glob(models + "/models--Xenova--modnet/snapshots/*/onnx/model.onnx")[0], providers=["CPUExecutionProvider"])
def matte(rgb, Hm=1024):
    h, w = rgb.shape[:2]; Wm = int(round(w * Hm / h / 32) * 32)
    x = (cv2.resize(rgb, (Wm, Hm), interpolation=cv2.INTER_AREA) - 0.5) / 0.5
    m = sess.run(None, {"input": x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1)

# coarse pass to find him, then a fine pass on a crop around him
m0 = matte(img, 768)
ys, xs = np.where(m0 > 0.5)
x0, x1 = max(0, xs.min() - 160), min(W, xs.max() + 160); y0 = max(0, ys.min() - 160); y1 = min(H, y0 + int((x1 - x0) * 1.6))
crop = img[y0:y1, x0:x1]
m = matte(crop, 1024)
n, lab, st, _ = cv2.connectedComponentsWithStats((m > 0.5).astype(np.uint8), 8)
k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); keep = cv2.dilate((lab == k).astype(np.uint8), np.ones((21, 21), np.uint8)).astype(np.float32)
m = m * cv2.GaussianBlur(keep, (31, 31), 0)
m = cv2.GaussianBlur(m, (5, 5), 0)
m = np.clip((m - 0.04) / 0.92, 0, 1)

# grade
L = crop.mean(-1, keepdims=True)
c = crop * (1 + 0.10 * np.array([0.6, 0.15, -0.5]))                      # warm key
c = L + (c - L) * 1.06                                                     # +6 % saturation
c = np.clip(c, 0, 1); c = c + 0.22 * (3 * c * c - 2 * c ** 3 - c)    # S-curve (blend toward smoothstep)
lum = c.mean(-1, keepdims=True)
c = c + 0.04 * (1 - lum) ** 2 * np.array([-0.6, 0.35, 0.15]) + 0.035 * lum ** 2 * np.array([0.5, 0.25, -0.6])
c = np.clip(c, 0, 1)

# edge decontamination: semi-transparent edge pixels still carry the pale building behind him;
# pull their colour toward the nearby solid-foreground colour
solid = (m > 0.95).astype(np.float32)[..., None]
fg = cv2.GaussianBlur(c * solid, (0, 0), 9) / np.maximum(cv2.GaussianBlur(solid[..., 0], (0, 0), 9), 1e-4)[..., None]
mix = np.clip((1 - m) * 1.6, 0, 1)[..., None] * (m > 0.01)[..., None]
c = np.clip(c * (1 - mix) + fg * mix, 0, 1)

rgba = np.dstack([c, m]); rgba = (rgba * 255 + 0.5).astype(np.uint8)
cv2.imwrite(out, cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
print("cut-out", out, rgba.shape[1], "x", rgba.shape[0], "from crop", (x0, y0, x1, y1))
