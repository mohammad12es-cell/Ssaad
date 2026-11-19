"""ADAM BARFI — Black Friday reel renderer (picture).

  python3 src/render.py                    # full render -> build/picture.mp4 (+ mux via 03_export.sh)
  python3 src/render.py --stills 1.0,5.5   # QC stills -> build/stills/
  HANDLE=@yourshop python3 src/render.py   # put the real Instagram handle in the CTA slot

Pipeline per output frame:
  source fetch (frame-blended slow motion / speed ramps) -> reframe (gentle zoom, roll fix)
  -> colour grade (burgundy/champagne look) -> scene gradients -> typography & motion graphics
  -> light transitions -> vignette + film grain -> encoder
"""
import os, sys, math, subprocess, argparse
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from timeline import FPS, W, H, b, BEAT, DURATION, SHOTS, HANDLE, NARRATION

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FONTS = os.path.join(ROOT, 'assets', 'fonts')
BUILD = os.path.join(ROOT, 'build')

# ------------------------------------------------------------------ palette
IVORY = (246, 239, 228)
GOLD_STOPS = [(0.0, (250, 236, 205)), (0.38, (224, 194, 132)), (0.52, (178, 134, 66)),
              (0.62, (205, 166, 98)), (1.0, (243, 221, 170))]
BURGUNDY_BLACK = np.array([20, 5, 9], np.float32) / 255.0
BURGUNDY = np.array([88, 14, 34], np.float32) / 255.0


def F(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


SERIF_BLACK = 'playfair-display-latin-900-normal.woff2'
SERIF_XB = 'playfair-display-latin-800-normal.woff2'
SERIF_B = 'playfair-display-latin-700-normal.woff2'
SERIF_SB = 'playfair-display-latin-600-normal.woff2'
SERIF_I = 'playfair-display-latin-600-italic.woff2'
SERIF_IR = 'playfair-display-latin-400-italic.woff2'
CORM_I = 'cormorant-garamond-latin-600-italic.woff2'
SANS_M = 'montserrat-latin-500-normal.woff2'
SANS_SB = 'montserrat-latin-600-normal.woff2'
SANS_B = 'montserrat-latin-700-normal.woff2'
FA_BLACK = 'Vazirmatn-Black.ttf'
FA_BOLD = 'Vazirmatn-Bold.ttf'
FA_MED = 'Vazirmatn-Medium.ttf'


# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b_=1.0):
    return max(a, min(b_, x))


def ease_out_cubic(x):
    x = clamp(x); return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x); return x * x * (3 - 2 * x)


def ease_out_expo(x):
    x = clamp(x); return 1 if x >= 1 else 1 - 2 ** (-10 * x)


# ------------------------------------------------------------------ text rendering
def gold_fill(h, w):
    ys = np.linspace(0, 1, h)
    cols = np.zeros((h, 3), np.float32)
    pos = [s[0] for s in GOLD_STOPS]
    for c in range(3):
        cols[:, c] = np.interp(ys, pos, [s[1][c] for s in GOLD_STOPS])
    return np.repeat(cols[:, None, :], w, 1) / 255.0


def render_text(text, font_file, size, tracking=0, fill='ivory', rtl=False, max_w=None, pad=40):
    """returns float32 RGBA (premultiplied) and anchor offset; text box centred."""
    font = F(font_file, size)
    if rtl:
        tw = font.getlength(text, direction='rtl', language='fa')
        if max_w and tw > max_w:
            return render_text(text, font_file, int(size * max_w / tw), tracking, fill, rtl, None, pad)
        asc, desc = font.getmetrics()
        img = Image.new('L', (int(tw) + pad * 2, asc + desc + pad * 2), 0)
        ImageDraw.Draw(img).text((pad, pad), text, font=font, fill=255, direction='rtl', language='fa')
    else:
        widths = [font.getlength(ch) for ch in text]
        tw = sum(widths) + tracking * (len(text) - 1)
        if max_w and tw > max_w:
            s = max_w / tw
            return render_text(text, font_file, int(size * s), tracking * s, fill, rtl, None, pad)
        asc, desc = font.getmetrics()
        img = Image.new('L', (int(math.ceil(tw)) + pad * 2, asc + desc + pad * 2), 0)
        d = ImageDraw.Draw(img)
        x = pad
        for ch, wch in zip(text, widths):
            d.text((x, pad), ch, font=font, fill=255)
            x += wch + tracking
    a = np.asarray(img, np.float32) / 255.0
    # trim to ink bbox (+pad) so vertical centring is optical
    ys, xs = np.where(a > 0.01)
    if len(ys):
        y0, y1 = max(0, ys.min() - pad // 2), min(a.shape[0], ys.max() + pad // 2)
        x0, x1 = max(0, xs.min() - pad // 2), min(a.shape[1], xs.max() + pad // 2)
        a = a[y0:y1, x0:x1]
    h, w = a.shape
    if fill == 'gold':
        rgb = gold_fill(h, w)
    else:
        col = IVORY if fill == 'ivory' else fill
        rgb = np.ones((h, w, 3), np.float32) * (np.array(col, np.float32) / 255.0)
    return np.dstack([rgb * a[..., None], a])


def add_shadow(rgba, radius=18, strength=0.55, offset=(0, 6)):
    a = rgba[..., 3]
    pad = radius * 2
    h, w = a.shape
    big = np.zeros((h + pad * 2, w + pad * 2, 4), np.float32)
    sh = cv2.GaussianBlur(np.pad(a, pad), (0, 0), radius) * strength
    M = np.float32([[1, 0, offset[0]], [0, 1, offset[1]]])
    sh = cv2.warpAffine(sh, M, (w + pad * 2, h + pad * 2))
    big[..., 3] = sh
    big[..., :3] = 0
    big[pad:pad + h, pad:pad + w] = over(big[pad:pad + h, pad:pad + w], rgba)
    return big


def over(dst, src):
    """premultiplied src over premultiplied dst (both RGBA float)"""
    a = src[..., 3:4]
    out = src + dst * (1 - a)
    return out


class Text:
    """An animated text element. cx, cy = centre in frame px."""

    def __init__(self, text, font, size, cx, cy, t_in, t_out, fill='ivory', tracking=0, rtl=False,
                 anim='rise', max_w=900, shadow=True, track_from=None, shimmer=None, dur_in=0.45,
                 dur_out=0.22, scale_from=1.3):
        self.__dict__.update(locals())
        self.cache = {}
        self.static = self._make(tracking)

    def _make(self, tracking):
        key = round(tracking, 1)
        if key in self.cache:
            return self.cache[key]
        img = render_text(self.text, self.font, self.size, tracking, self.fill, self.rtl, self.max_w)
        if self.shadow:
            img = add_shadow(img)
        self.cache[key] = img
        return img

    def frame(self, t):
        if t < self.t_in or t > self.t_out + self.dur_out:
            return None
        p = (t - self.t_in) / self.dur_in
        q = clamp((t - self.t_out) / self.dur_out) if t > self.t_out else 0.0
        alpha = ease_out_cubic(p) * (1 - ease_in_out(q))
        dy = 0.0
        scale = 1.0
        img = self.static
        wipe = None
        if self.anim == 'rise':
            dy = 34 * (1 - ease_out_cubic(p)) - 18 * ease_in_out(q)
        elif self.anim == 'track':
            tr = self.track_from + (self.tracking - self.track_from) * ease_out_expo((t - self.t_in) / 1.4)
            img = self._make(tr)
            dy = -12 * ease_in_out(q)
        elif self.anim == 'wipe':
            wipe = ease_out_cubic((t - self.t_in) / (self.dur_in * 1.6))
            alpha = (1 - ease_in_out(q))
        elif self.anim == 'scale':
            k = ease_out_expo((t - self.t_in) / 0.7)
            scale = self.scale_from + (1 - self.scale_from) * k
            alpha = clamp((t - self.t_in) / 0.12) * (1 - ease_in_out(q))
        if alpha <= 0.001:
            return None
        out = img
        if scale != 1.0:
            out = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        out = out * alpha
        if wipe is not None:
            h, w = out.shape[:2]
            xs = np.arange(w, dtype=np.float32) / w
            if self.rtl:
                xs = 1 - xs
            edge = wipe * 1.25 - 0.125
            m = np.clip((edge - xs) / 0.12 + 0.5, 0, 1)
            out = out * m[None, :, None]
        if self.shimmer and self.shimmer[0] <= t <= self.shimmer[1]:
            out = shimmer(out, (t - self.shimmer[0]) / (self.shimmer[1] - self.shimmer[0]))
        return out, self.cx, self.cy + dy


def shimmer(img, prog):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    pos = -0.3 * w + prog * (w * 1.6)
    d = (xx + yy * 0.45 - pos) / (w * 0.07)
    band = np.exp(-d * d)[..., None] * 0.75
    out = img.copy()
    out[..., :3] = np.clip(out[..., :3] + band * out[..., 3:4] * np.array([1.0, 0.95, 0.85], np.float32), 0, None)
    return out


class Rule:
    """thin gold hairline that grows from the centre"""

    def __init__(self, cx, cy, width, t_in, t_out, thick=2):
        self.__dict__.update(locals())
        g = gold_fill(8, width)[4]
        self.line = np.zeros((thick + 4, width, 4), np.float32)
        a = np.zeros((thick + 4, width), np.float32); a[2:2 + thick] = 1
        a[1] = a[2 + thick] = 0.35
        fade = np.minimum(1, np.minimum(np.arange(width), np.arange(width)[::-1]) / 60.0)
        a *= fade[None]
        self.line[..., :3] = g[None] * a[..., None]
        self.line[..., 3] = a

    def frame(self, t):
        if t < self.t_in or t > self.t_out + 0.25:
            return None
        p = ease_out_expo((t - self.t_in) / 0.8)
        q = 1 - ease_in_out((t - self.t_out) / 0.25) if t > self.t_out else 1
        w = max(2, int(self.width * p))
        x0 = (self.width - w) // 2
        return self.line[:, x0:x0 + w] * q, self.cx, self.cy


class Pill:
    """CTA: rounded gold outline with a paper-plane (direct message) icon + label"""

    def __init__(self, cx, cy, t_in, t_out, label='ORDER VIA INSTAGRAM DIRECT'):
        self.__dict__.update(locals())
        S = 3  # supersample
        w, h = 780, 104
        img = Image.new('L', (w * S, h * S), 0)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([2 * S, 2 * S, (w - 2) * S, (h - 2) * S], radius=(h // 2 - 2) * S, outline=255, width=2 * S)
        # paper plane icon
        ix, iy, s = 70 * S, h // 2 * S, 25 * S
        tip = (ix + s, iy - s)
        poly = [(ix - s, iy - s * 0.15), tip, (ix + s * 0.15, iy + s)]
        d.line(poly + [poly[0]], fill=255, width=int(2.6 * S), joint='curve')
        d.line([tip, (ix - s * 0.25, iy + s * 0.2)], fill=255, width=int(2.6 * S))
        font = F(SANS_SB, 29 * S)
        x = 122 * S
        for ch in label:
            d.text((x, iy), ch, font=font, fill=255, anchor='lm')
            x += font.getlength(ch) + 4.2 * S
        img = img.resize((w, h), Image.LANCZOS)
        a = np.asarray(img, np.float32) / 255
        rgb = gold_fill(h, w)
        # fill a faint burgundy glass behind the outline
        bg = Image.new('L', (w, h), 0)
        ImageDraw.Draw(bg).rounded_rectangle([3, 3, w - 3, h - 3], radius=h // 2 - 3, fill=255)
        ba = np.asarray(bg, np.float32) / 255 * 0.55
        base = np.dstack([np.ones((h, w, 3), np.float32) * BURGUNDY_BLACK * ba[..., None], ba])
        self.img = over(base, np.dstack([rgb * a[..., None], a]))

    def frame(self, t):
        if t < self.t_in:
            return None
        p = ease_out_cubic((t - self.t_in) / 0.5)
        img = self.img * p
        if self.t_in + 1.1 <= t <= self.t_in + 2.1:
            img = shimmer(img, (t - self.t_in - 1.1) / 1.0)
        return img, self.cx, self.cy + 20 * (1 - p)


def blit(frame, item):
    img, cx, cy = item
    h, w = img.shape[:2]
    x0 = int(round(cx - w / 2)); y0 = int(round(cy - h / 2))
    fx0, fy0 = max(0, x0), max(0, y0)
    fx1, fy1 = min(W, x0 + w), min(H, y0 + h)
    if fx1 <= fx0 or fy1 <= fy0:
        return
    sub = img[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0]
    region = frame[fy0:fy1, fx0:fx1]
    frame[fy0:fy1, fx0:fx1] = sub[..., :3] + region * (1 - sub[..., 3:4])


# ------------------------------------------------------------------ sources
class Clip:
    def __init__(self, path):
        cap = cv2.VideoCapture(path)
        frames = []
        while True:
            ok, fr = cap.read()
            if not ok:
                break
            frames.append(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB))
        self.frames = frames
        self.n = len(frames)

    def get(self, t):
        f = clamp(t * FPS, 0, self.n - 1)
        i = int(f); a = f - i
        A = self.frames[i].astype(np.float32)
        if a < 0.04 or i + 1 >= self.n:
            return A / 255
        B = self.frames[i + 1].astype(np.float32)
        return (A * (1 - a) + B * a) / 255


_photo_cache = {}


def photo(name, cx, cy):
    key = (name, cx, cy)
    if key in _photo_cache:
        return _photo_cache[key]
    im = cv2.cvtColor(cv2.imread(os.path.join(ROOT, 'assets', 'photos', name)), cv2.COLOR_BGR2RGB)
    h, w = im.shape[:2]
    s = max(W / w, H / h) * 1.0
    im = cv2.resize(im, (int(w * s + 0.5), int(h * s + 0.5)), interpolation=cv2.INTER_LANCZOS4)
    h, w = im.shape[:2]
    x0 = int(clamp(cx * w - W / 2, 0, w - W)); y0 = int(clamp(cy * h - H / 2, 0, h - H))
    out = im[y0:y0 + H, x0:x0 + W].astype(np.float32) / 255
    # light clean-up for phone photos: gentle denoise + sharpen
    out = np.clip(out + (out - cv2.GaussianBlur(out, (0, 0), 1.2)) * 0.35, 0, 1)
    _photo_cache[key] = out
    return out


def reframe(img, zoom, roll=0.0, punch=1.0):
    z = zoom * punch
    if abs(z - 1) < 1e-4 and abs(roll) < 1e-4:
        return img
    M = cv2.getRotationMatrix2D((W / 2, H / 2), roll, z)
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)


# ------------------------------------------------------------------ grade
def build_lut():
    x = np.linspace(0, 1, 1024)
    # filmic S-curve with gently lifted blacks and rolled-off highlights
    toe = 0.025
    y = 1 / (1 + np.exp(-(x - 0.5) * 6.2))
    y = (y - y[0]) / (y[-1] - y[0])
    y = 0.55 * y + 0.45 * x
    y = toe + y * (0.955 - toe)
    return x, y


LUT_X, LUT_Y = build_lut()


def grade(img, kind):
    x = img
    if kind == 'store':
        x = x * 0.94
        sat = 0.86
    elif kind == 'photo':
        x = x * 0.93
        sat = 0.95
    else:
        x = x * 0.95
        sat = 0.92
    L = (x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722)[..., None]
    x = L + (x - L) * sat
    x = np.interp(np.clip(x, 0, 1), LUT_X, LUT_Y).astype(np.float32)
    L = (x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722)[..., None]
    sh = (1 - L) ** 2
    hi = L ** 2
    x = x + sh * np.array([0.030, -0.012, 0.004], np.float32) + hi * np.array([0.020, 0.008, -0.022], np.float32)
    return np.clip(x, 0, 1)


def gradient_mask(kind, strength):
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    if kind == 'bottom':
        m = np.clip((yy - 0.40) / 0.45, 0, 1) ** 1.3
    elif kind == 'top':
        m = np.clip((0.32 - yy) / 0.32, 0, 1) ** 1.2
    elif kind == 'center':
        m = np.exp(-((yy - 0.5) / 0.32) ** 2)
    return (m * strength)[..., None]


_vig = None


def vignette():
    global _vig
    if _vig is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
        _vig = (1 - 0.42 * np.clip(r, 0, 1.4) ** 2.2)[..., None].astype(np.float32)
    return _vig


rng = np.random.default_rng(3)
GRAIN = [cv2.resize(rng.standard_normal((H // 2, W // 2)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
         for _ in range(8)]


def grain(img, i, amt=0.028):
    g = GRAIN[i % 8]
    L = img.mean(2, keepdims=True)
    w = 0.5 + 0.8 * L * (1 - L) * 2
    return img + g[..., None] * amt * w


def light_sweep(img, prog, strength=0.55):
    """warm champagne light passing diagonally - used on scene transitions"""
    if prog <= 0 or prog >= 1:
        return img
    yy, xx = np.mgrid[0:H:4, 0:W:4].astype(np.float32)
    pos = -0.4 * W + prog * (W * 1.8)
    d = (xx * 1.0 + (H - yy) * 0.35 - pos) / (W * 0.28)
    m = np.exp(-d * d) * math.sin(math.pi * prog) * strength
    m = cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
    col = np.array([1.0, 0.86, 0.62], np.float32)
    return img + (1 - img) * m * col


# ------------------------------------------------------------------ typography timeline
def build_graphics():
    G = []
    # SCENE 01
    G.append(Text('BLACK', SERIF_BLACK, 250, W / 2, 800, b(0.4), b(5.55), fill='ivory', tracking=10,
                  anim='track', track_from=70, max_w=880))
    G.append(Text('FRIDAY.', SERIF_BLACK, 250, W / 2, 1030, b(1.4), b(5.55), fill='gold', tracking=4,
                  anim='track', track_from=50, max_w=900, shimmer=(b(2.2), b(4.2))))
    G.append(Rule(W / 2, 1210, 300, b(2.0), b(5.5)))
    G.append(Text('یه فرصت خاص، برای یه استایل متفاوت', FA_MED, 54, W / 2, 1300, b(2.6), b(5.55), rtl=True,
                  anim='wipe', max_w=860))
    # SCENE 02
    G.append(Text('ADAM BARFI', SERIF_SB, 128, W / 2, 1100, b(6.4), b(13.6), fill='gold', tracking=22,
                  anim='track', track_from=70, max_w=900, shimmer=(b(7.5), b(9.5))))
    G.append(Text('آدم برفی', FA_BOLD, 92, W / 2, 1228, 5.10, b(13.6), rtl=True, anim='wipe', dur_in=0.5))
    G.append(Rule(W / 2, 1318, 520, 5.40, b(13.6)))
    G.append(Text('THE BLACK FRIDAY EDITION', SANS_M, 34, W / 2, 1372, 5.60, b(13.6), tracking=11, anim='rise'))
    G.append(Text('بلک فرایدی آدم برفی شروع شد!', FA_BOLD, 58, W / 2, 1468, 5.95, b(13.6), fill='gold', rtl=True,
                  anim='wipe', max_w=860))
    # SCENE 03
    G.append(Text('YOUR STYLE.', SERIF_XB, 150, W / 2, 1120, b(14.4), b(18.6), anim='rise', max_w=880))
    G.append(Text('YOUR MOMENT.', SERIF_I, 150, W / 2, 1275, b(17), b(18.6), fill='gold', anim='rise', max_w=900))
    G.append(Text('این بلک فرایدی، استایل متفاوتی رو تجربه کن.', FA_MED, 50, W / 2, 1410, b(17.6), b(18.6),
                  rtl=True, anim='wipe', max_w=860))
    G.append(Text('STYLE GETS COLDER.', SANS_SB, 58, W / 2, 1140, b(19.15), b(23.55), tracking=7, anim='rise', max_w=860))
    G.append(Text('THE DEALS GET HOTTER.', SERIF_XB, 110, W / 2, 1260, b(21.1), b(23.55), fill='gold', anim='rise',
                  max_w=880, shimmer=(b(21.8), b(23.3))))
    # SCENE 04 — discount
    G.append(Text('BLACK FRIDAY', SANS_SB, 56, W / 2, 470, b(24.05), b(31.7), tracking=20, anim='track', track_from=56))
    G.append(Rule(W / 2, 535, 380, b(24.6), b(31.7)))
    G.append(Text('UP TO', SERIF_I, 118, W / 2, 660, b(26), b(31.7), anim='rise'))
    G.append(Text('30', SERIF_BLACK, 620, W / 2 - 115, 985, b(28), b(31.7), fill='gold', anim='scale', scale_from=1.35,
                  max_w=760, shimmer=(b(28.6), b(30.4))))
    G.append(Text('%', SERIF_B, 300, W / 2 + 335, 905, b(28) + 0.1, b(31.7), fill='gold', anim='scale', scale_from=1.5,
                  shimmer=(b(28.8), b(30.6))))
    G.append(Text('OFF', SANS_B, 118, W / 2 + 335, 1135, b(28.4), b(31.7), tracking=10, anim='rise'))
    G.append(Text('تا ۳۰٪ تخفیف ویژه', FA_BLACK, 92, W / 2, 1375, b(29.2), b(31.7), rtl=True, anim='wipe'))
    # pinned compact lockup over product montage
    G.append(Text('UP TO 30% OFF', SERIF_XB, 104, W / 2, 300, b(32), b(35.6), fill='gold', anim='rise',
                  shimmer=(b(32.4), b(34))))
    G.append(Text('تا ۳۰٪ تخفیف ویژه', FA_BOLD, 54, W / 2, 415, b(32.3), b(35.6), rtl=True, anim='wipe'))
    G.append(Text('وقتشه استایل مورد علاقه‌تو انتخاب کنی', FA_BOLD, 60, W / 2, 1400, b(32.4), b(35.6), rtl=True,
                  anim='wipe', max_w=860))
    # SCENE 05 — CTA end card
    T = 1e9
    G.append(Text('ADAM BARFI', SERIF_SB, 122, W / 2, 905, b(40.3), T, fill='gold', tracking=22, anim='track',
                  track_from=64, max_w=900, shimmer=(b(47.8), b(49.6))))
    G.append(Text('آدم برفی؛ استایل تو، انتخاب تو', FA_BOLD, 64, W / 2, 1025, b(40.8), T, rtl=True, anim='wipe',
                  max_w=860))
    G.append(Rule(W / 2, 1100, 560, b(41.1), T))
    G.append(Text('BLACK FRIDAY  ·  UP TO 30% OFF', SANS_SB, 40, W / 2, 1160, b(41.4), T, tracking=7, anim='rise', max_w=860))
    G.append(Text('YOUR NEXT FAVORITE LOOK IS WAITING.', CORM_I, 58, W / 2, 1238, b(41.8), T, fill='gold', anim='rise', max_w=880))
    G.append(Text('برای سفارش، همین حالا دایرکت بده', FA_BOLD, 64, W / 2, 1345, b(42.2), T, rtl=True, anim='wipe', max_w=860))
    G.append(Pill(W / 2, 1470, b(42.7), T))
    if HANDLE:
        G.append(Text(HANDLE, SANS_SB, 40, W / 2, 1570, b(43.2), T, tracking=3, anim='rise'))
    return G


# per-scene legibility gradients: (t0, t1, kind, strength)
GRADS = [
    (0, b(6), 'center', 0.55),
    (b(6), b(14), 'bottom', 0.88),
    (b(14), b(24), 'bottom', 0.90),
    (b(24), b(32), 'center', 0.35),
    (b(32), b(36), 'top', 0.85),
    (b(32), b(36), 'bottom', 0.80),
    (b(40), 99, 'bottom', 0.92),
]
SWEEPS = [(b(6) - 0.25, 0.55), (b(14) - 0.25, 0.5), (b(36) - 0.25, 0.6), (b(40) - 0.25, 0.5)]
GLOWS = [(b(28), 0.45), (b(24), 0.25), (b(48), 0.3)]  # warm bloom pulses on impacts
PUNCH_CUTS = [b(k) for k in (17, 19, 20, 21, 22, 23, 32, 33, 34, 35, 36)]


def shot_at(t):
    for s in SHOTS:
        if s[0] <= t < s[1]:
            return s
    return SHOTS[-1]


def render_frame(i, clips, G):
    t = i / FPS
    o0, o1, src, sin, speed, prm = shot_at(t)
    lt = t - o0
    u = lt / max(1e-6, o1 - o0)
    if src == 'black':
        img = np.zeros((H, W, 3), np.float32)
        kind = 'black'
    elif src in clips:
        if isinstance(speed, tuple):  # speed ramp (ease between s0 and s1)
            s0, s1 = speed
            n = 64
            us = np.linspace(0, u, n)
            sp = s0 + (s1 - s0) * np.array([ease_in_out(v) for v in us])
            st = sin + np.trapezoid(sp, us * (o1 - o0)) if u > 0 else sin
        else:
            st = sin + lt * speed
        img = clips[src].get(st)
        kind = src if src == 'store' else 'fur'
    else:
        img = photo(src, prm.get('cx', 0.5), prm.get('cy', 0.5))
        kind = 'photo'
    if kind != 'black':
        z0, z1 = prm.get('zoom', (1, 1))
        zoom = z0 + (z1 - z0) * ease_in_out(u)
        punch = 1.0
        for c in PUNCH_CUTS:
            if 0 <= t - c < 0.2:
                punch = 1 + 0.035 * (1 - ease_out_cubic((t - c) / 0.2))
        img = reframe(img, zoom, prm.get('roll', 0.0), punch)
        img = grade(img, kind)
        dim = prm.get('dim', 0)
        if dim:
            img = img * (1 - dim) + BURGUNDY_BLACK * dim
    for g0, g1, kind_, s in GRADS:
        if g0 <= t < g1:
            m = gradient_mask(kind_, s)
            tint = BURGUNDY_BLACK if kind_ != 'center' else BURGUNDY * 0.35
            img = img * (1 - m) + tint * m
    for t_s, s in SWEEPS:
        img = light_sweep(img, (t - t_s) / 0.55, s)
    for t_g, s in GLOWS:
        if 0 <= t - t_g < 0.6:
            k = (1 - (t - t_g) / 0.6) ** 2 * s
            img = img + (1 - img) * k * np.array([0.55, 0.32, 0.18], np.float32)
    img = img * vignette()
    for el in G:
        it = el.frame(t)
        if it is not None:
            blit(img, it)
    img = grain(img, i)
    # fade from black at the very top (first visible frame eases in on the impact)
    if t < b(0) + 0.12 and t >= b(0):
        img *= 0.35 + 0.65 * (t - b(0)) / 0.12
    return np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--stills', default='')
    ap.add_argument('--out', default=os.path.join(BUILD, 'picture.mp4'))
    a = ap.parse_args()
    clips = {'store': Clip(os.path.join(BUILD, 'store.mp4')), 'fur': Clip(os.path.join(BUILD, 'fur.mp4'))}
    G = build_graphics()
    if a.stills:
        os.makedirs(os.path.join(BUILD, 'stills'), exist_ok=True)
        for ts in a.stills.split(','):
            i = int(round(float(ts) * FPS))
            fr = render_frame(i, clips, G)
            cv2.imwrite(os.path.join(BUILD, 'stills', f'still_{float(ts):05.2f}.jpg'),
                        cv2.cvtColor(fr, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
        print('stills done')
        return
    n = int(round(DURATION * FPS))
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
           '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv420p',
           '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', a.out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(render_frame(i, clips, G).tobytes())
        if i % 60 == 0:
            print(f'frame {i}/{n}', flush=True)
    p.stdin.close(); p.wait()
    print('picture ->', a.out)


if __name__ == '__main__':
    main()
