"""Ground-locked motion graphics + Persian typography."""
import math, os, json, functools
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
from engine import W, H, ROOT, DATA, clamp, ease, ease_out

FONT_B = os.path.join(ROOT, "assets", "Vazirmatn-Black.ttf")
FONT_M = os.path.join(ROOT, "assets", "Vazirmatn-Bold.ttf")

RED = (255, 48, 48)
YEL = (255, 214, 10)
WHITE = (255, 255, 255)
CYAN = (60, 220, 255)
BLUE = (70, 150, 255)


@functools.lru_cache(None)
def font(size, black=True):
    return ImageFont.truetype(FONT_B if black else FONT_M, size, layout_engine=ImageFont.Layout.RAQM)


class Canvas:
    """Two buffers: `glow` (additive, blurred) and `over` (alpha composited)."""

    def __init__(self):
        self.over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        self.glow = Image.new("RGB", (W, H), (0, 0, 0))
        self.do = ImageDraw.Draw(self.over)
        self.dg = ImageDraw.Draw(self.glow)
        self._texts = []

    # ------------------------------------------------ primitives
    def line(self, pts, color, width=4, alpha=1.0, glow=1.0, closed=False):
        if len(pts) < 2:
            return
        pts = [tuple(map(float, p)) for p in pts]
        if closed:
            pts = pts + [pts[0]]
        if glow > 0:
            g = tuple(int(c * glow * alpha) for c in color)
            self.dg.line(pts, fill=g, width=int(width * 4), joint="curve")
        a = int(255 * alpha)
        self.do.line(pts, fill=color + (a,), width=int(width), joint="curve")

    def poly(self, pts, fill, alpha=0.3):
        if len(pts) < 3:
            return
        self.do.polygon([tuple(map(float, p)) for p in pts], fill=fill + (int(255 * alpha),))

    def circle(self, x, y, r, color, width=4, alpha=1.0, fill=None, glow=1.0):
        bb = [x - r, y - r, x + r, y + r]
        if glow > 0:
            g = tuple(int(c * glow * alpha) for c in color)
            self.dg.ellipse(bb, outline=g, width=int(width * 4))
        if fill is not None:
            self.do.ellipse(bb, fill=fill + (int(255 * alpha * 0.9),))
        self.do.ellipse(bb, outline=color + (int(255 * alpha),), width=int(width))

    def dot(self, x, y, r, color, alpha=1.0, glow=1.0):
        bb = [x - r, y - r, x + r, y + r]
        if glow:
            g = tuple(int(c * glow * alpha) for c in color)
            self.dg.ellipse([x - r * 2.5, y - r * 2.5, x + r * 2.5, y + r * 2.5], fill=g)
        self.do.ellipse(bb, fill=color + (int(255 * alpha),))

    def text(self, *a, **k):
        """Text is deferred so it always sits above shapes drawn later in the frame."""
        self._texts.append((a, k))

    def _text(self, x, y, s, size=64, color=WHITE, alpha=1.0, anchor="mm", stroke=6, black=True, shadow=True,
              box=None):
        if alpha <= 0.01 or not s:
            return
        f = font(size, black)
        a = int(255 * alpha)
        if box is not None:
            l, t, r, b = self.do.textbbox((x, y), s, font=f, anchor=anchor, direction="rtl", language="fa")
            p = box[1] if len(box) > 1 else 22
            self.do.rounded_rectangle([l - p, t - p * 0.6, r + p, b + p * 0.6], radius=18,
                                      fill=box[0] + (int(box[2] * alpha) if len(box) > 2 else int(170 * alpha),))
        if shadow:
            self.do.text((x + 3, y + 5), s, font=f, fill=(0, 0, 0, int(a * 0.55)), anchor=anchor, direction="rtl",
                         language="fa", stroke_width=stroke, stroke_fill=(0, 0, 0, int(a * 0.55)))
        self.do.text((x, y), s, font=f, fill=color + (a,), anchor=anchor, direction="rtl", language="fa",
                     stroke_width=stroke, stroke_fill=(10, 10, 14, a))

    def arrow(self, p0, p1, color, width=8, alpha=1.0, head=34):
        self.line([p0, p1], color, width, alpha)
        ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
        pts = [p1, (p1[0] - head * math.cos(ang - 0.45), p1[1] - head * math.sin(ang - 0.45)),
               (p1[0] - head * math.cos(ang + 0.45), p1[1] - head * math.sin(ang + 0.45))]
        self.do.polygon(pts, fill=color + (int(255 * alpha),))
        g = tuple(int(c * alpha) for c in color)
        self.dg.polygon(pts, fill=g)

    # ------------------------------------------------ compose
    def compose(self, base):
        """base float RGB 0..1 -> uint8 RGB with overlays."""
        for a, k in self._texts:
            self._text(*a, **k)
        self._texts = []
        g = np.asarray(self.glow, np.float32) / 255
        if g.max() > 0:
            g = cv2.GaussianBlur(g, (0, 0), 9) * 1.3 + cv2.GaussianBlur(g, (0, 0), 30) * 0.9
            base = 1 - (1 - base) * (1 - np.clip(g, 0, 1))  # screen blend
        o = np.asarray(self.over, np.float32) / 255
        a = o[..., 3:4]
        img = base * (1 - a) + o[..., :3] * a
        return (np.clip(img, 0, 1) * 255).astype(np.uint8)


# ------------------------------------------------------------ geo helpers
def densify(coords, step=0.25):
    if not step:
        return [tuple(p) for p in coords]
    out = []
    for (lo0, la0), (lo1, la1) in zip(coords[:-1], coords[1:]):
        n = max(1, int(max(abs(lo1 - lo0), abs(la1 - la0)) / step))
        for i in range(n):
            t = i / n
            out.append((lo0 + (lo1 - lo0) * t, la0 + (la1 - la0) * t))
    out.append(tuple(coords[-1]))
    return out


def project_path(cam, coords, step=0.25, alt=0.0):
    """Return list of visible screen polylines (split at horizon / off-camera)."""
    c = np.array(densify(coords, step)) if step else np.array(coords)
    sx, sy, vis = cam.project(c[:, 1], c[:, 0], alt)
    runs, cur = [], []
    for x, y, v in zip(sx, sy, vis):
        if v and -4 * W < x < 5 * W and -4 * H < y < 5 * H:
            cur.append((x, y))
        else:
            if len(cur) > 1:
                runs.append(cur)
            cur = []
    if len(cur) > 1:
        runs.append(cur)
    return runs


def draw_path(cv, cam, coords, color, width=4, alpha=1.0, glow=1.0, step=0.25, closed=False, progress=1.0, alt=0.0):
    coords = list(coords)
    if closed and coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    if progress < 1.0:
        d = densify(coords, step or 0.05)
        n = max(2, int(len(d) * clamp(progress)))
        coords, step = d[:n], 0
    for run in project_path(cam, coords, step, alt):
        cv.line(run, color, width, alpha, glow)


def fill_geo(cv, cam, ring, color, alpha=0.3, step=0.25):
    c = np.array(densify(list(ring), step))
    sx, sy, vis = cam.project(c[:, 1], c[:, 0])
    if vis.mean() < 0.98:
        return
    cv.poly(list(zip(sx, sy)), color, alpha)


def screen(cam, lat, lon, alt=0.0):
    sx, sy, vis = cam.project(np.array([lat]), np.array([lon]), alt)
    return float(sx[0]), float(sy[0]), bool(vis[0])


# ------------------------------------------------------------ Natural Earth
@functools.lru_cache(None)
def _ne(name):
    return json.load(open(os.path.join(DATA, name + ".geojson")))


def rings(geom):
    t = geom["type"]
    if t == "Polygon":
        return [geom["coordinates"][0]]
    if t == "MultiPolygon":
        return [p[0] for p in geom["coordinates"]]
    if t == "LineString":
        return [geom["coordinates"]]
    if t == "MultiLineString":
        return geom["coordinates"]
    return []


@functools.lru_cache(None)
def feature(layer, key, value, minarea=0.0):
    out = []
    for f in _ne(layer)["features"]:
        if str(f["properties"].get(key)) == value:
            for r in rings(f["geometry"]):
                if minarea:
                    a = np.array(r)
                    x, y = a[:, 0], a[:, 1]
                    ar = 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
                    if ar < minarea:
                        continue
                out.append([tuple(p) for p in r])
    if not out:
        raise KeyError((layer, key, value))
    return tuple(tuple(r) for r in out)


def simplify(ring, tol):
    import shapely.geometry as sg
    ls = sg.LineString(ring).simplify(tol)
    return list(ls.coords)


def country(name, res="50m", minarea=0.0, key="ADMIN"):
    return feature(f"ne_{res}_admin_0_countries", key, name, minarea)


def lake(name):
    return feature("ne_10m_lakes", "name", name)


# ------------------------------------------------------------ captions
def wrap_fa(s, size, maxw):
    f = font(size, False)
    words = s.split(" ")
    lines, cur = [], ""
    d = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    for w_ in words:
        t = (cur + " " + w_).strip()
        if d.textlength(t, font=f, direction="rtl", language="fa") > maxw and cur:
            lines.append(cur)
            cur = w_
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def caption(cv, s, t_in, t_out, t, y=1560, size=58):
    a = clamp((t - t_in) / 0.25) * clamp((t_out - t) / 0.25)
    if a <= 0:
        return
    lines = wrap_fa(s, size, 900)
    lh = size * 1.55
    y0 = y - (len(lines) - 1) * lh / 2
    rise = (1 - ease_out(clamp((t - t_in) / 0.35))) * 18
    for i, l in enumerate(lines):
        cv.text(W / 2, y0 + i * lh + rise, l, size, WHITE, a, stroke=5, black=False,
                box=((8, 10, 20), 20, 150))


def title(cv, s, t, t_in, t_out, y=250, size=96, color=YEL, sub=None, subcolor=WHITE):
    a = clamp((t - t_in) / 0.3) * clamp((t_out - t) / 0.3)
    if a <= 0:
        return
    sc = 0.85 + 0.15 * ease_out(clamp((t - t_in) / 0.4))
    cv.text(W / 2, y, s, int(size * sc), color, a, stroke=8)
    if sub:
        cv.text(W / 2, y + size * 1.05, sub, int(size * 0.6 * sc), subcolor, a, stroke=6)
