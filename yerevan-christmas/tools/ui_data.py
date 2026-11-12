# Builds assets/ui-data.js: smoothed head track (for auto-reframing the top/avatar crops)
# and the voice level per video frame (drives the little audio bars).
import json, subprocess, numpy as np
tr = json.load(open("tools/track.json"))
hx = (np.array([f["hx"] for f in tr], float) - 70) * 1080 / 1072   # hx sits on the hood; the face is ~70 px left of it
fy = (np.array([f["top"] for f in tr], float) + 175) * 1080 / 1072
def smooth(a, n):
    k = np.ones(n) / n; p = np.pad(a, (n // 2, n - 1 - n // 2), mode="edge"); return np.convolve(p, k, "valid")
hx, fy = smooth(smooth(hx, 31), 15), smooth(smooth(fy, 31), 15)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "assets/voice.wav", "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
hop = 1600; n = len(a) // hop
r = np.sqrt((a[: n * hop].reshape(n, hop) ** 2).mean(1)); db = 20 * np.log10(r + 1e-6)
env = np.clip((db + 42) / 26, 0, 1)
out = {"fps": 29.97, "track": [[round(x, 1), round(y, 1)] for x, y in zip(hx, fy)], "env": [round(float(v), 2) for v in env]}
open("assets/ui-data.js", "w").write("window.UI_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
print(len(out["track"]), len(out["env"]))
