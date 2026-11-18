"""Render the v2 re-edit (picture only) from timeline2.py.

usage: python3 render2.py VO_DIR MATTE_DIR FONT_DIR OUT.mp4 HEIGHT [workers] [t0 t1]

New over v1: keyframed camera paths (speed ramps, punch-ins, holds), freeze frames,
impact-driven camera shake + zoom punch, automatic motion blur on fast moves,
flash frames, kinetic typography (pop / punch / rise) and text placed *behind* the
subject using the person matte.
"""
import sys, os, math, subprocess, multiprocessing as mp
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import timeline2 as TL

FPS = TL.FPS
VO, MATTES, FONTS, OUT, OH = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
WORKERS = int(sys.argv[6]) if len(sys.argv) > 6 else 4
OW = OH * 9 // 16
K = OH / 1920.0

SHOTS, TEXTS, HITS, FLASHES, MARK = TL.build(VO)
END = MARK["end"]
NF = int(round(END * FPS))
T_RANGE = (float(sys.argv[7]), float(sys.argv[8])) if len(sys.argv) > 8 else (0, END)
SHAKE_KINDS = {"boom", "freeze", "punch", "s1", "s2", "s3", "s4", "hit", "boom_short", "peak", "stab"}


def ease(u, kind):
    u = min(max(u, 0.0), 1.0)
    if kind == "lin":
        return u
    if kind == "out":
        return 1 - (1 - u) ** 3
    if kind == "in":
        return u ** 2.4
    if kind == "final":
        return 1 - (1 - u) ** 2.6
    return 0.5 - 0.5 * math.cos(math.pi * u)


def cam(s, t):
    keys = s["keys"]
    if t <= keys[0][0]:
        return keys[0][1]
    for (ta, ca, _), (tb, cb, eb) in zip(keys, keys[1:]):
        if t <= tb:
            e = ease((t - ta) / max(1e-6, tb - ta), eb)
            return tuple(a + (b - a) * e for a, b in zip(ca, cb))
    return keys[-1][1]


# ---------------------------------------------------------------- sources
_cache = {}
def source(name):
    if name in _cache:
        return _cache[name]
    if name == "money":
        need = set()
        for s in SHOTS:
            if s["src"] != "money":
                continue
            for k in range(int((s["t1"] - s["t0"]) * FPS) + 3):
                tv = s["vstart"] + k / FPS * s["vrate"]
                need.add(int(tv * 30))
        cap = cv2.VideoCapture(TL.SRC[name]); fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frames, i = {}, 0
        while True:
            ok, f = cap.read()
            if not ok:
                break
            if i in need:
                frames[i] = f[:, :, ::-1].copy()
            i += 1
        d = dict(video=frames, fps=fps, n=i)
        _cache[name] = d
        return d
    hf_min = min(min(k[1][2] for k in s["keys"]) for s in SHOTS if s["src"] == name)
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
    if cw > src_w:
        cw = src_w; ch = cw * 16 / 9
    x0 = min(max(cx * src_w - cw / 2, 0), src_w - cw)
    y0 = min(max(cy * src_h - ch / 2, 0), src_h - ch)
    s = OH / ch
    M = np.array([[s, 0, -x0 * s], [0, s, -y0 * s]], np.float64)
    if extra_scale != 1.0:
        M[:, :2] *= extra_scale
        M[0, 2] = (M[0, 2] - OW / 2) * extra_scale + OW / 2
        M[1, 2] = (M[1, 2] - OH / 2) * extra_scale + OH / 2
    M[0, 2] += dx; M[1, 2] += dy
    return M


def warp(img, M, interp=cv2.INTER_CUBIC):
    return cv2.warpAffine(img, M, (OW, OH), flags=interp, borderMode=cv2.BORDER_REFLECT)


def shake(t):
    dx = dy = 0.0; z = 1.0
    for h in HITS:
        d = t - h["t"]
        if h["kind"] not in SHAKE_KINDS or d < 0 or d > 0.6:
            continue
        a = h["s"] * 0.0085 * OW * math.exp(-d / 0.10)
        dx += a * math.sin(2 * math.pi * 17 * d + h["t"] * 3.1)
        dy += 0.8 * a * math.cos(2 * math.pi * 13 * d + h["t"] * 5.3)
        z += 0.028 * h["s"] * math.exp(-d / 0.085)
    return dx, dy, z


def matrices(s, t, w, h):
    te = min(t, s["freeze"]) if s["freeze"] is not None else t
    c = cam(s, te)
    dx, dy, z = shake(t)
    u = (te - s["t0"]) / max(1e-6, s["t1"] - s["t0"])
    p = s["par"] * OW * (u - 0.5) * 2
    Mf = crop_matrix(w, h, c, z, dx=dx + p, dy=dy - 0.25 * p)
    Mb = crop_matrix(w, h, c, z * (1.0 + 0.6 * s["par"] * u), dx=dx - 0.35 * p, dy=dy + 0.1 * p)
    return Mf, Mb, te


def composite(s, t):
    """returns (rgb float32, subject alpha or None)"""
    src = source(s["src"])
    if "video" in src:
        te = t
        idx = int((s["vstart"] + (t - s["t0"]) * s["vrate"]) * src["fps"])
        fr = src["video"]
        if idx not in fr:
            idx = min(fr, key=lambda k: abs(k - idx))
        im = fr[idx]; h, w = im.shape[:2]
        Mf, _, _ = matrices(s, t, w, h)
        return warp(im, Mf, cv2.INTER_LANCZOS4).astype(np.float32), None
    im = src["img"]; h, w = im.shape[:2]
    Mf, Mb, _ = matrices(s, t, w, h)
    if "alpha" in src:
        a = warp(src["alpha"], Mf, cv2.INTER_LINEAR).astype(np.float32)[..., None] / 255
        if s["par"] > 0:
            out = warp(src["bg"], Mb) * (1 - a) + warp(im, Mf) * a
        else:
            out = warp(im, Mf).astype(np.float32)
        return out, a[..., 0]
    return warp(im, Mf).astype(np.float32), None


def motion(s, t):
    src = source(s["src"])
    im = src["video"][next(iter(src["video"]))] if "video" in src else src["img"]
    h, w = im.shape[:2]
    pts = np.array([[0, 0, 1], [OW, 0, 1], [0, OH, 1], [OW, OH, 1]], np.float64).T
    A, _, _ = matrices(s, t - 1 / 96, w, h)
    B, _, _ = matrices(s, t + 1 / 96, w, h)
    ia = np.linalg.inv(np.vstack([A, [0, 0, 1]]))[:2]
    ib = np.linalg.inv(np.vstack([B, [0, 0, 1]]))[:2]
    # displacement of the output corners, measured in output pixels
    pa = A @ np.vstack([ib @ pts, np.ones(4)])
    return float(np.max(np.abs(pa - pts[:2])))


def render_shot(s, t):
    d = motion(s, t)
    n = 1 if d < 5 * K else min(7, int(d / (3.5 * K)) + 2)
    if n == 1:
        img, a = composite(s, t)
    else:
        acc = None
        for k in range(n):
            tk = t - 1 / 96 + (k + 0.5) / n * (2 / 96)
            im, a = composite(s, tk)
            acc = im if acc is None else acc + im
        img = acc / n
    u = (t - s["t0"]) / max(1e-6, s["t1"] - s["t0"])
    g = tuple(x + (y - x) * u for x, y in zip(s["g0"], s["g1"]))
    if s["look"] == "freeze" and s["freeze"] is not None and t >= s["freeze"]:
        g = (g[0] * 0.45, g[1], g[2] - 0.05)
    return img / 255, a, g


# ---------------------------------------------------------------- grade (as v1)
yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
_r = np.sqrt(((xx - OW / 2) / (OW * 0.62)) ** 2 + ((yy - OH * 0.47) / (OH * 0.60)) ** 2)
VIGN = np.clip(1 - 0.55 * np.clip(_r - 0.35, 0, None) ** 1.6, 0.25, 1)[..., None].astype(np.float32)
del yy, xx, _r

def make_grain(seed):
    rng = np.random.default_rng(seed)
    n = rng.standard_normal((int(OH / 1.6), int(OW / 1.6))).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), 0.55)
    n = cv2.resize(n, (OW, OH), interpolation=cv2.INTER_LINEAR)
    return n / (n.std() + 1e-6)
GRAIN = None

_x = np.linspace(0, 1, 4096, dtype=np.float32)
def _curve(x, contrast):
    s = x * x * (3 - 2 * x)
    y = x + contrast * (s - x)
    y = np.clip((y - 0.018) / (1 - 0.018), 0, 1)
    return 1 - (1 - y) ** 1.04
CURVES = {round(c, 2): _curve(_x, c).astype(np.float32) for c in np.arange(0.0, 0.66, 0.05)}

def grade(img, colour, warm, expo):
    if expo:
        img = img * (2.0 ** expo)
    Y = img[..., 0] * 0.2126 + img[..., 1] * 0.7152 + img[..., 2] * 0.0722
    img = Y[..., None] + colour * (img - Y[..., None])
    tint = np.array([1 + 0.07 * warm, 1 + 0.015 * warm, 1 - 0.10 * warm], np.float32)
    cool_shadow = np.array([0.985, 1.0, 1.03], np.float32)
    w = np.clip(Y, 0, 1)[..., None]
    img = img * (cool_shadow + (tint - cool_shadow) * w)
    con = round(min(0.65, max(0.0, 0.55 - 0.28 * colour)) * 20) / 20
    idx = np.clip(img * 4095, 0, 4095).astype(np.int32)
    img = CURVES[con][idx]
    if warm > 0.25:
        sm = cv2.resize(img, (OW // 6, OH // 6), interpolation=cv2.INTER_AREA)
        hi = cv2.GaussianBlur(np.clip(sm - 0.6, 0, None), (0, 0), 6)
        img = img + 0.35 * (warm - 0.25) * cv2.resize(hi, (OW, OH))
    return img


# ---------------------------------------------------------------- typography
def font_path(weight):
    return f"{FONTS}/Vazirmatn-{weight}.ttf"

def build_text(tx):
    size = int((tx["size"] or 60) * K)
    fp = font_path(tx["weight"])
    font = ImageFont.truetype(fp, size, layout_engine=ImageFont.Layout.RAQM)
    width = lambda f, s: f.getlength(s, direction="rtl", language="fa")
    if tx["fit"]:
        size = int(size * tx["fit"] * OW / width(font, tx["text"]))
        font = ImageFont.truetype(fp, size, layout_engine=ImageFont.Layout.RAQM)
    maxw = OW * 0.84
    lines = [tx["text"]]
    if width(font, tx["text"]) > maxw and not tx["fit"] and " " in tx["text"]:
        ws = tx["text"].split(" "); best = None
        for i in range(1, len(ws)):
            a, b = " ".join(ws[:i]), " ".join(ws[i:])
            m = max(width(font, a), width(font, b))
            if best is None or m < best[0]:
                best = (m, [a, b])
        lines = best[1]
    lh = int(size * 1.45)
    pad = int(size * 0.7)
    Wd = int(max(width(font, l) for l in lines)) + 2 * pad
    Hd = lh * len(lines) + 2 * pad
    lay = Image.new("L", (Wd, Hd), 0)
    d = ImageDraw.Draw(lay)
    for i, ln in enumerate(lines):
        d.text((Wd / 2, pad + lh * i + lh / 2), ln, font=font, fill=255, anchor="mm",
               direction="rtl", language="fa")
    txt = np.asarray(lay, np.float32) / 255
    tight = np.asarray(lay.filter(ImageFilter.GaussianBlur(size * 0.05)), np.float32) / 255
    wide = np.asarray(lay.filter(ImageFilter.GaussianBlur(size * 0.40)), np.float32) / 255
    k = 0.55 if tx["style"] == "huge" else 1.0
    sh = np.clip(k * (1.3 * tight + 1.9 * wide), 0, 1)
    col = np.array([1.0, 0.955, 0.875] if tx["warm"] else [0.97, 0.97, 0.97], np.float32)
    return dict(txt=txt, sh=sh, cx=tx["x"] * OW, cy=tx["y"] * OH, col=col)

TLAY = None

def anim_state(tx, t):
    a = t - tx["t0"]
    alpha, scale, dy = 1.0, 1.0, 0.0
    if tx["anim"] == "pop":
        e = min(1, a / 0.10); alpha = e; scale = 1.06 - 0.06 * e
    elif tx["anim"] == "punch":
        e = min(1, a / 0.17); scale = 1.22 - 0.22 * (1 - (1 - e) ** 3); alpha = min(1, a / 0.05)
    elif tx["anim"] == "rise":
        e = min(1, a / 0.38); alpha = e ** 0.8; dy = (1 - (1 - e) ** 3 - 1) * -0.012 * OH
    if tx["out"] == "fade":
        alpha *= max(0.0, min(1.0, (tx["t1"] - t) / 0.18))
    return alpha * tx["alpha"], scale, dy


def apply_text(img, t, subj):
    for tx, lay in zip(TEXTS, TLAY):
        if not (tx["t0"] <= t < tx["t1"]):
            continue
        al, sc, dy = anim_state(tx, t)
        if al <= 0.003:
            continue
        txt, sh = lay["txt"], lay["sh"]
        if abs(sc - 1) > 1e-3:
            nh, nw = int(txt.shape[0] * sc), int(txt.shape[1] * sc)
            txt = cv2.resize(txt, (nw, nh), interpolation=cv2.INTER_LINEAR)
            sh = cv2.resize(sh, (nw, nh), interpolation=cv2.INTER_LINEAR)
        h, w = txt.shape
        x0 = int(lay["cx"] - w / 2); y0 = int(lay["cy"] + dy - h / 2)
        xa, ya = max(0, x0), max(0, y0)
        xb, yb = min(OW, x0 + w), min(OH, y0 + h)
        if xb <= xa or yb <= ya:
            continue
        T = txt[ya - y0:yb - y0, xa - x0:xb - x0] * al
        S = sh[ya - y0:yb - y0, xa - x0:xb - x0] * al
        if tx["behind"] and subj is not None and subj[0] == tx["behind"]:
            occ = 1 - subj[1][ya:yb, xa:xb]
            T = T * occ; S = S * occ
        reg = img[ya:yb, xa:xb]
        reg *= (1 - 0.6 * S)[..., None]
        reg += (lay["col"] - reg) * T[..., None]
    return img


# ---------------------------------------------------------------- frames
def frame(n, rng):
    t = n / FPS
    act = [s for s in SHOTS if s["t0"] <= t < s["t1"]]
    subj = None
    if not act:
        img = np.zeros((OH, OW, 3), np.float32)
    else:
        layers = []
        for s in act:
            im, a, g = render_shot(s, t)
            layers.append((s, grade(im, *g), a))
        if len(layers) == 1:
            s, img, a = layers[0]
            f = 1.0
            if s["fade_in"]:
                f = min(f, (t - s["t0"]) / s["fade_in"])
            if s["fade_out"]:
                f = min(f, (s["t1"] - t) / s["fade_out"])
            f = max(0.0, min(1.0, f))
            img = img * (f * f * (3 - 2 * f))
            if a is not None:
                subj = (s["src"], a)
        else:
            (sa, A, _), (sb, B, ab) = layers[0], layers[-1]
            w = (t - sb["t0"]) / max(1e-3, sa["t1"] - sb["t0"])
            w = w * w * (3 - 2 * w)
            img = A * (1 - w) + B * w
            if ab is not None:
                subj = (sb["src"], ab)
        img = img * VIGN
    for fl in FLASHES:
        d = t - fl["t"]
        if 0 <= d < fl["d"]:
            e = fl["s"] * (1 - d / fl["d"])
            img = img + (np.array(fl["c"], np.float32) - img) * e
    img = apply_text(img, t, subj)
    gi = GRAIN[rng.integers(len(GRAIN))]
    gi = np.roll(gi, (int(rng.integers(OH)), int(rng.integers(OW))), (0, 1))
    Y = np.clip(img.mean(axis=2, keepdims=True), 0, 1)
    img = img + gi[..., None] * (0.008 + 0.028 * (Y * (1 - Y) * 4) ** 0.7)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def init(wid):
    global GRAIN, TLAY
    GRAIN = [make_grain(wid * 100 + k) for k in range(6)]
    TLAY = [build_text(tx) for tx in TEXTS]


def worker(args):
    wid, a, b, path = args
    init(wid)
    rng = np.random.default_rng(wid)
    crf = "17" if OH > 2000 else "16"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "medium" if OH > 2000 else "slow", "-tune", "grain",
                          "-crf", crf, "-pix_fmt", "yuv420p", "-color_primaries", "bt709",
                          "-color_trc", "bt709", "-colorspace", "bt709", path], stdin=subprocess.PIPE)
    for n in range(a, b):
        p.stdin.write(frame(n, rng).tobytes())
        if wid == 0 and (n - a) % 48 == 0:
            print(f"  w0 {n - a}/{b - a}", flush=True)
    p.stdin.close(); p.wait()
    if p.returncode != 0:
        raise RuntimeError(f"encoder failed for {path}")
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
