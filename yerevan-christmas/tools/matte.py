import sys, glob, numpy as np, onnxruntime as ort, cv2, os
src, outdir, models = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(outdir, exist_ok=True)
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(glob.glob(models + "/models--Xenova--modnet/snapshots/*/onnx/model.onnx")[0], so, providers=["CPUExecutionProvider"])
cap = cv2.VideoCapture(src); i = 0; prev = None
while True:
    ok, img = cap.read()
    if not ok: break
    h, w = img.shape[:2]; rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    H = 768; Wd = int(round(w * H / h / 32) * 32)
    x = (cv2.resize(rgb, (Wd, H), interpolation=cv2.INTER_AREA) - 0.5) / 0.5
    a = sess.run(None, {"input": x.transpose(2, 0, 1)[None]})[0][0, 0]
    a = cv2.resize(a, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1)
    # keep only the presenter: the largest blob touching the central band
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8), 8)
    best, bestA = 0, 0
    for k in range(1, n):
        x0, y0, bw, bh, area = st[k]
        if x0 < w * 0.75 and x0 + bw > w * 0.25 and area > bestA: best, bestA = k, area
    if best:
        keep = cv2.dilate((lab == best).astype(np.uint8), np.ones((25, 25), np.uint8))
        keep = cv2.GaussianBlur(keep.astype(np.float32), (31, 31), 0)
        a = a * keep
    if prev is not None: a = 0.82 * a + 0.18 * prev
    prev = a
    rgba = np.dstack([img, (a * 255).astype(np.uint8)])
    cv2.imwrite(f"{outdir}/m_{i:04d}.png", rgba, [cv2.IMWRITE_PNG_COMPRESSION, 1]); i += 1
    if i % 100 == 0: print("frames", i, flush=True)
print("done", i)
