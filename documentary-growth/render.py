"""Render THE MEANING OF GROWTH (picture only) from the EDL in timeline.py.

usage: python3 render.py VO_DIR MATTE_DIR FONT_DIR OUT.mp4 HEIGHT [workers] [t0 t1]
Picture is 9:16 at 24 fps; HEIGHT 3840 -> 2160x3840 (4K), 1920 -> 1080x1920.
"""
import sys, os, math, subprocess, multiprocessing as mp
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline as TL

FPS = 24
VO, MATTES, FONTS, OUT, OH = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
WORKERS = int(sys.argv[6]) if len(sys.argv) > 6 else 4
OW = OH * 9 // 16
K = OH / 1920.0                    # resolution scale factor (1080p == 1)

SHOTS, SUBS, MARK = TL.build(VO)
END = MARK["end"]
NF = int(round(END * FPS))
T_RANGE = (float(sys.argv[7]), float(sys.argv[8])) if len(sys.argv) > 8 else (0, END)


def ease(u, kind):
    u = min(max(u, 0.0), 1.0)
    if kind == "lin":
        return u
    if kind == "out":
        return 1 - (1 - u) ** 2.2
    if kind == "final":  # long glide in, settles into a near-still hold at the end
        return 1 - (1 - u) ** 3
    return 0.5 - 0.5 * math.cos(math.pi * u)


# ---------------------------------------------------------------- sources
_cache = {}
def source(name):
    if name in _cache:
        return _cache[name]
    hf_min = min(min(s["c0"][2], s["c1"][2]) for s in SHOTS if s["src"] == name)
    if name == "money":
        cap = cv2.VideoCapture(TL.SRC[name])
        frames = []
        while True:
            ok, f = cap.read()
            if not ok:
                break
            frames.append(f[:, :, ::-1].copy())
        d = dict(video=frames, fps=cap.get(cv2.CAP_PROP_FPS) or 30.0)
        _cache[name] = d
        return d
    im = np.asarray(Image.open(TL.SRC[name]).convert("RGB"))
    H = im.shape[0]
    f = min(1.0, 1.15 * OH / (H * hf_min))
    if f < 1.0:
        im = cv2.resize(im, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    d = dict(img=im)
    if name in TL.MATTE:
        key = os.path.basename(TL.SRC[name]).split("-")[0]
        a = np.asarray(Image.open(f"{MATTES}/{key}_matte.png").convert("L"))
        a = cv2.resize(a, (im.shape[1], im.shape[0]), interpolation=cv2.INTER_LINEAR)
        # clean background plate: inpaint where the person stands (low-res, then blended back)
        s = 640.0 / max(im.shape[:2])
        sm = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        ms = cv2.resize(a, (sm.shape[1], sm.shape[0]))
        ms = cv2.dilate((ms > 40).astype(np.uint8) * 255, np.ones((15, 15), np.uint8))
        filled = cv2.inpaint(sm, ms, 9, cv2.INPAINT_TELEA)
        filled = cv2.resize(filled, (im.shape[1], im.shape[0]), interpolation=cv2.INTER_CUBIC)
        big = cv2.resize(ms, (im.shape[1], im.shape[0]))
        big = cv2.GaussianBlur(big, (0, 0), 6 * max(1, im.shape[0] / 2000)).astype(np.float32)[..., None] / 255
        d["bg"] = (im * (1 - big) + filled * big).astype(np.uint8)
        d["alpha"] = a
    _cache[name] = d
    return d


def crop_matrix(src_w, src_h, c, extra_scale=1.0, dx=0.0, dy=0.0):
    cx, cy, hf = c
    ch = hf * src_h
    cw = ch * 9 / 16
    if cw > src_w:  # source too narrow: fit width instead
        cw = src_w; ch = cw * 16 / 9
    x0 = min(max(cx * src_w - cw / 2, 0), src_w - cw)
    y0 = min(max(cy * src_h - ch / 2, 0), src_h - ch)
    s = OH / ch
    M = np.array([[s, 0, -x0 * s], [0, s, -y0 * s]], np.float64)
    if extra_scale != 1.0:  # scale about output centre
        M[:, :2] *= extra_scale
        M[0, 2] = (M[0, 2] - OW / 2) * extra_scale + OW / 2
        M[1, 2] = (M[1, 2] - OH / 2) * extra_scale + OH / 2
    M[0, 2] += dx; M[1, 2] += dy
    return M


def warp(img, M, interp=cv2.INTER_CUBIC):
    return cv2.warpAffine(img, M, (OW, OH), flags=interp, borderMode=cv2.BORDER_REFLECT)


def render_shot(s, t):
    u = (t - s["t0"]) / (s["t1"] - s["t0"])
    e = ease(u, s["ease"])
    c = tuple(a + (b - a) * e for a, b in zip(s["c0"], s["c1"]))
    g = tuple(a + (b - a) * e for a, b in zip(s["g0"], s["g1"]))
    src = source(s["src"])
    if "video" in src:
        fr = src["video"]
        i = int((s["vstart"] + (t - s["t0"]) * s["vrate"]) * src["fps"])
        im = fr[min(max(i, 0), len(fr) - 1)]
        h, w = im.shape[:2]
        out = warp(im, crop_matrix(w, h, c), cv2.INTER_LANCZOS4)
    else:
        im = src["img"]; h, w = im.shape[:2]
        if "alpha" in src and s["par"] > 0:
            p = s["par"] * OW * (e - 0.5) * 2
            Mf = crop_matrix(w, h, c, 1.0, dx=p, dy=-0.25 * p)
            Mb = crop_matrix(w, h, c, 1.0 + 0.6 * s["par"] * e, dx=-0.35 * p, dy=0.1 * p)
            fg = warp(im, Mf)
            bg = warp(src["bg"], Mb)
            a = warp(src["alpha"], Mf, cv2.INTER_LINEAR).astype(np.float32)[..., None] / 255
            out = (bg * (1 - a) + fg * a)
        else:
            out = warp(im, crop_matrix(w, h, c))
    return out.astype(np.float32) / 255, g


# ---------------------------------------------------------------- grade
yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
_r = np.sqrt(((xx - OW / 2) / (OW * 0.62)) ** 2 + ((yy - OH * 0.47) / (OH * 0.60)) ** 2)
VIGN = np.clip(1 - 0.55 * np.clip(_r - 0.35, 0, None) ** 1.6, 0.25, 1)[..., None].astype(np.float32)
del yy, xx, _r

def make_grain(seed):
    rng = np.random.default_rng(seed)
    gh, gw = int(OH / 1.6), int(OW / 1.6)
    n = rng.standard_normal((gh, gw)).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), 0.55)
    n = cv2.resize(n, (OW, OH), interpolation=cv2.INTER_LINEAR)
    return n / (n.std() + 1e-6)
GRAIN = None

# filmic tone curve as a 4096-entry LUT (deep blacks, soft shoulder)
_x = np.linspace(0, 1, 4096, dtype=np.float32)
def _curve(x, contrast):
    s = x * x * (3 - 2 * x)
    y = x + contrast * (s - x)
    y = np.clip((y - 0.018) / (1 - 0.018), 0, 1)
    return 1 - (1 - y) ** 1.04
CURVES = {round(c, 2): _curve(_x, c).astype(np.float32) for c in np.arange(0.0, 0.61, 0.05)}

def grade(img, colour, warm, expo):
    if expo:
        img = img * (2.0 ** expo)
    Y = img[..., 0] * 0.2126 + img[..., 1] * 0.7152 + img[..., 2] * 0.0722
    img = Y[..., None] + colour * (img - Y[..., None])
    # warmth: shadows stay neutral-cool, highlights carry the tint (keeps skin natural)
    tint = np.array([1 + 0.07 * warm, 1 + 0.015 * warm, 1 - 0.10 * warm], np.float32)
    cool_shadow = np.array([0.985, 1.0, 1.03], np.float32)
    w = np.clip(Y, 0, 1)[..., None]
    img = img * (cool_shadow + (tint - cool_shadow) * w)
    # contrast: stronger in the dark monochrome section, gentler in the warm ending
    con = round(min(0.6, max(0.0, 0.5 - 0.25 * colour)) * 20) / 20
    lut = CURVES[con]
    idx = np.clip(img * 4095, 0, 4095).astype(np.int32)
    img = lut[idx]
    # bloom on warm sections
    if warm > 0.25:
        sm = cv2.resize(img, (OW // 6, OH // 6), interpolation=cv2.INTER_AREA)
        hi = np.clip(sm - 0.6, 0, None)
        hi = cv2.GaussianBlur(hi, (0, 0), 6)
        img = img + 0.35 * (warm - 0.25) * cv2.resize(hi, (OW, OH))
    return img


# ---------------------------------------------------------------- typography
FONT_REG = f"{FONTS}/Vazirmatn-Regular.ttf"
FONT_BIG = f"{FONTS}/Vazirmatn-Light.ttf"

def text_layer(text, big, centre):
    size = int(92 * K) if big else int((66 if centre else 60) * K)
    font = ImageFont.truetype(FONT_BIG if big else FONT_REG, size, layout_engine=ImageFont.Layout.RAQM)
    maxw = OW * (0.86 if big else 0.80 if centre else 0.76)
    width = lambda x: font.getlength(x, direction="rtl", language="fa")
    words = text.split(" ")
    lines = [text]
    if width(text) > maxw:  # balanced two-line break: no orphan words
        best = None
        for i in range(1, len(words)):
            a, b = " ".join(words[:i]), " ".join(words[i:])
            m = max(width(a), width(b))
            if best is None or m < best[0]:
                best = (m, [a, b])
        lines = best[1]
    lh = int(size * 1.55)
    H = lh * len(lines) + int(size * 1.2)
    lay = Image.new("L", (OW, H), 0)
    d = ImageDraw.Draw(lay)
    for i, ln in enumerate(lines):
        d.text((OW / 2, int(size * 0.6) + lh * i + lh / 2), ln, font=font, fill=255,
               anchor="mm", direction="rtl", language="fa")
    tight = np.asarray(lay.filter(ImageFilter.GaussianBlur(size * 0.06)), np.float32) / 255
    wide = np.asarray(lay.filter(ImageFilter.GaussianBlur(size * 0.45)), np.float32) / 255
    txt = np.asarray(lay, np.float32) / 255
    sh = np.clip(0.85 * tight * 1.6 + 0.9 * wide * 2.2, 0, 1)
    y = (OH * 0.5 if centre else OH * 0.665) - H / 2
    return dict(txt=txt, sh=sh, y=int(y))

LAYERS = None

def apply_subs(img, t):
    for s, lay in zip(SUBS, LAYERS):
        if not (s["t0"] <= t < s["t1"]):
            continue
        fi = min(1, (t - s["t0"]) / 0.22, (s["t1"] - t) / 0.30)
        fi = max(fi, 0)
        y0 = lay["y"]; h = lay["txt"].shape[0]
        region = img[y0:y0 + h]
        region *= (1 - 0.62 * fi * lay["sh"])[..., None]
        region += (0.96 - region) * (fi * lay["txt"])[..., None]
    return img


# ---------------------------------------------------------------- frames
def frame(n, rng):
    t = n / FPS
    act = [s for s in SHOTS if s["t0"] <= t < s["t1"]]
    if not act:
        img = np.zeros((OH, OW, 3), np.float32)
        lift = 0.0
    else:
        layers = []
        for s in act:
            im, g = render_shot(s, t)
            layers.append((s, grade(im, *g)))
        if len(layers) == 1:
            s, img = layers[0]
            f = 1.0
            if s["fade_in"]:
                f = min(f, (t - s["t0"]) / s["fade_in"])
            if s["fade_out"]:
                f = min(f, (s["t1"] - t) / s["fade_out"])
            f = max(0.0, min(1.0, f))
            img = img * (f * f * (3 - 2 * f))
        else:
            (sa, a), (sb, b) = layers[0], layers[-1]
            w = (t - sb["t0"]) / max(1e-3, sa["t1"] - sb["t0"])
            w = w * w * (3 - 2 * w)
            img = a * (1 - w) + b * w
        img = img * VIGN
    img = apply_subs(img, t)
    # film grain, strongest in midtones; a little in pure black too (keeps blacks alive)
    gi = GRAIN[rng.integers(len(GRAIN))]
    gi = np.roll(gi, (int(rng.integers(OH)), int(rng.integers(OW))), (0, 1))
    Y = np.clip(img.mean(axis=2, keepdims=True), 0, 1)
    amp = 0.008 + 0.028 * (Y * (1 - Y) * 4) ** 0.7
    img = img + gi[..., None] * amp
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def worker(args):
    wid, a, b, path = args
    global GRAIN, LAYERS
    GRAIN = [make_grain(wid * 100 + k) for k in range(6)]
    LAYERS = [text_layer(s["text"], s["big"], s["centre"]) for s in SUBS]
    rng = np.random.default_rng(wid)
    crf = "17" if OH > 2000 else "16"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "slow", "-tune", "grain", "-crf", crf,
                          "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709",
                          "-colorspace", "bt709", path], stdin=subprocess.PIPE)
    for n in range(a, b):
        p.stdin.write(frame(n, rng).tobytes())
        if wid == 0 and (n - a) % 24 == 0:
            print(f"  w0 {n - a}/{b - a}", flush=True)
    p.stdin.close(); p.wait()
    return path


if __name__ == "__main__":
    a = int(T_RANGE[0] * FPS); b = min(NF, int(round(T_RANGE[1] * FPS)))
    print(f"{OW}x{OH}  {END:.2f}s  frames {a}-{b}")
    tmp = OUT + ".parts"; os.makedirs(tmp, exist_ok=True)
    edges = np.linspace(a, b, WORKERS + 1).astype(int)
    jobs = [(i, edges[i], edges[i + 1], f"{tmp}/p{i:02d}.mp4") for i in range(WORKERS)]
    with mp.get_context("fork").Pool(WORKERS) as pool:
        parts = pool.map(worker, jobs)
    with open(f"{tmp}/list.txt", "w") as f:
        for p in parts:
            f.write(f"file '{os.path.abspath(p)}'\n")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{tmp}/list.txt",
                    "-c", "copy", OUT], check=True)
    print("wrote", OUT)
