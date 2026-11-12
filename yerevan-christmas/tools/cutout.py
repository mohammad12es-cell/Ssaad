import sys, glob, numpy as np, onnxruntime as ort, cv2
src, out, models = sys.argv[1], sys.argv[2], sys.argv[3]
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(glob.glob(models + "/models--onnx-community--BiRefNet_lite-ONNX/snapshots/*/onnx/model.onnx")[0], so, providers=["CPUExecutionProvider"])
img = cv2.imread(src); h, w = img.shape[:2]; rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
x = (cv2.resize(rgb, (1024, 1024), interpolation=cv2.INTER_AREA) - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
a = sess.run(None, {"input_image": x.transpose(2, 0, 1)[None].astype(np.float32)})[-1][0, 0]; a = 1 / (1 + np.exp(-a))
a = cv2.resize(a, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1)
a = np.clip((a - 0.08) / 0.84, 0, 1)  # firm up the edges
ys, xs = np.where(a > 0.1); pad = 12
y0, y1, x0, x1 = max(0, ys.min() - pad), min(h, ys.max() + pad), max(0, xs.min() - pad), min(w, xs.max() + pad)
rgba = np.dstack([img, (a * 255).astype(np.uint8)])[y0:y1, x0:x1]
cv2.imwrite(out, rgba); print("cut", rgba.shape)
chk = (rgba[..., :3] * (rgba[..., 3:] / 255) + np.array([33, 64, 26]) * (1 - rgba[..., 3:] / 255)).astype(np.uint8); cv2.imwrite(out.replace(".png", "_check.jpg"), chk)
