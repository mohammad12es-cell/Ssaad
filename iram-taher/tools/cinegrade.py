#!/usr/bin/env python3
"""Cinematic grade + relight for the IRAM CO. talking head.

usage: python tools/cinegrade.py <source.mp4> <out.mp4> <models_dir> [--frames 0,200,500 --stills outdir]

Per frame (1080x1920):
  1. person matte (MODNet, presenter = largest central blob, temporal smoothing)
  2. global correction: highlights down, shadows up (Natural Portrait ranges)
  3. background (1-matte): -0.45 EV, cooler, 15 % less saturation, soft defocus by normalised convolution
     (the subject's colour never bleeds into the blurred background)
  4. subject: warm key light on the head from frame-left (soft radial falloff that follows the head),
     a thin cool rim on the far edge
  5. filmic S-curve, emerald shadows / gold highlights split tone (IRAM CO. palette), gentle vignette
Everything is a function of the frame alone (no randomness), so re-running gives the same pixels.
"""
import argparse, glob, os, subprocess, sys
import numpy as np, cv2, onnxruntime as ort

W, H = 1080, 1920
ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out"); ap.add_argument("models")
ap.add_argument("--frames", default=""); ap.add_argument("--stills", default="")
a = ap.parse_args()

so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(glob.glob(a.models + "/models--Xenova--modnet/snapshots/*/onnx/model.onnx")[0], so,
                            providers=["CPUExecutionProvider"])


def matte(rgb):
    h, w = rgb.shape[:2]; Hm = 768; Wm = int(round(w * Hm / h / 32) * 32)
    x = (cv2.resize(rgb, (Wm, Hm), interpolation=cv2.INTER_AREA) - 0.5) / 0.5
    m = sess.run(None, {"input": x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
    m = cv2.resize(m, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1)
    n, lab, st, _ = cv2.connectedComponentsWithStats((m > 0.5).astype(np.uint8), 8)
    best, bestA = 0, 0
    for k in range(1, n):
        x0, y0, bw, bh, area = st[k]
        if x0 < w * 0.75 and x0 + bw > w * 0.25 and area > bestA: best, bestA = k, area
    if best:
        keep = cv2.dilate((lab == best).astype(np.uint8), np.ones((25, 25), np.uint8))
        m = m * cv2.GaussianBlur(keep.astype(np.float32), (31, 31), 0)
    return m, (st[best] if best else None)


def lin(x): return np.power(np.clip(x, 0, 1), 2.2)
def gam(x): return np.power(np.clip(x, 0, 1), 1 / 2.2)
def luma(x): return x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722
def sat(x, s):
    l = luma(x)[..., None]; return l + (x - l) * s


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = 1 - 0.30 * np.clip(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.45) / (H * 0.62)) ** 2, 0, 1.6)


def grade(bgr, m, head):
    img = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    # 1. global correction (display space): highlights -0.10, shadows +0.08
    l = luma(img)[..., None]
    img = img - 0.10 * np.clip((l - 0.6) / 0.4, 0, 1) * img + 0.08 * np.clip((0.35 - l) / 0.35, 0, 1) * (1 - img) * 0.5
    L = lin(img)
    m3 = m[..., None]
    # 3. background: darker, cooler, softer (normalised convolution keeps the subject out of the blur)
    bgw = (1 - m) ** 2
    num = cv2.GaussianBlur(L * bgw[..., None], (0, 0), 5.0); den = cv2.GaussianBlur(bgw, (0, 0), 5.0)[..., None] + 1e-4
    bg = np.where(den > 0.02, num / den, L)
    bg = bg * 2 ** -0.70 * np.array([0.94, 0.99, 1.06], np.float32)
    bg = sat(bg, 0.92)
    # 4. subject: warm key on the head from frame-left, cool rim on the far edge
    hx, hy, hr = head
    d2 = ((xx - (hx - 0.35 * hr)) / (1.9 * hr)) ** 2 + ((yy - hy) / (2.3 * hr)) ** 2
    key = np.exp(-d2 * 1.4)[..., None]
    side = np.clip(0.5 + (hx - xx) / (3.0 * hr), 0, 1)[..., None]           # brighter on frame-left
    sub = L * (1 + 0.55 * key * (0.5 + 0.5 * side)) * (1 + key * np.array([0.07, 0.0, -0.09], np.float32))
    sub = sat(sub * (0.90 + 0.10 * side), 1.06)                                       # a little fall-off on the far side
    edge = np.clip(m - cv2.erode(m, np.ones((7, 7), np.uint8)), 0, 1)
    rim = cv2.GaussianBlur(edge, (0, 0), 2.0)[..., None] * np.clip((xx - hx) / (2.5 * hr), 0, 1)[..., None]
    sub = sub + rim * 0.16 * np.array([0.85, 0.95, 1.0], np.float32)
    out = sub * m3 + bg * (1 - m3)
    # 5. filmic curve, emerald shadows / gold highlights, vignette
    d = gam(out)
    d = d + 0.24 * (d - 0.5) * (1 - np.abs(2 * d - 1))                        # filmic S-curve
    l = luma(d)[..., None]
    sh = np.clip(1 - l / 0.45, 0, 1); hi = np.clip((l - 0.55) / 0.45, 0, 1)
    d = d + sh * 0.05 * np.array([-0.6, 0.35, 0.15], np.float32) + hi * 0.045 * np.array([0.5, 0.25, -0.6], np.float32)
    d = d * VIG[..., None]
    d = 0.012 + d * (1 - 0.012)                                                 # lifted blacks, never crushed
    return cv2.cvtColor((np.clip(d, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR)


cap = cv2.VideoCapture(a.src)
want = set(int(f) for f in a.frames.split(",") if f) if a.frames else None
writer = None
if not want:
    writer = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", "30000/1001",
                               "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", a.out], stdin=subprocess.PIPE)
prev, head_s, i = None, None, 0
while True:
    ok, f = cap.read()
    if not ok: break
    if want is not None and i not in want and i > max(want):
        break
    f = cv2.resize(f, (W, H), interpolation=cv2.INTER_AREA)
    if want is not None and i not in want:
        i += 1; continue
    rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    m, st = matte(rgb)
    if prev is not None: m = 0.8 * m + 0.2 * prev
    prev = m
    # head: top of the presenter blob, centred on its upper columns (smoothed over time)
    if st is not None:
        x0, y0, bw, bh, _ = st
        top = m[y0:y0 + max(10, int(bh * 0.12)), x0:x0 + bw]
        cols = np.where(top.max(0) > 0.5)[0]
        cx = x0 + (cols.mean() if len(cols) else bw / 2); hr = max(60.0, bh * 0.075)
        cur = np.array([cx, y0 + hr * 1.1, hr])
        head_s = cur if head_s is None else 0.85 * head_s + 0.15 * cur
    hd = head_s if head_s is not None else np.array([W / 2, H * 0.3, 120])
    if want is None or i in want:
        g = grade(f, m, hd)
        if writer: writer.stdin.write(g.tobytes())
        if a.stills and i in (want or ()):
            os.makedirs(a.stills, exist_ok=True)
            cv2.imwrite(f"{a.stills}/before_{i:04d}.jpg", f, [cv2.IMWRITE_JPEG_QUALITY, 90])
            cv2.imwrite(f"{a.stills}/after_{i:04d}.jpg", g, [cv2.IMWRITE_JPEG_QUALITY, 90])
            cv2.imwrite(f"{a.stills}/matte_{i:04d}.jpg", (m * 255).astype(np.uint8))
    i += 1
    if i % 100 == 0: print("frames", i, flush=True)
if writer:
    writer.stdin.close(); writer.wait()
print("done", i)
