"""Tiny ray-traced globe renderer for vertical geography shorts.

A camera floats above a spherical Earth.  Every output pixel is a ray; where it
hits the sphere we look up lat/lon and sample the finest imagery layer that
covers that spot (global Blue Marble -> regional relief -> Sentinel-2).
Overlays (borders, outlines, markers, Persian labels) are projected with the
same camera so they stay locked to the ground.
"""
import math, os, json
import numpy as np
import cv2

R = 6371.0  # km
W, H = 1080, 1920
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CACHE = os.path.join(ROOT, "cache")


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):  # smooth in-out
    x = clamp(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = clamp(x)
    return x ** 3


def lerp(a, b, t):
    return a + (b - a) * t


def ll2xyz(lat, lon, r=R):
    la, lo = np.radians(lat), np.radians(lon)
    return np.stack([r * np.cos(la) * np.cos(lo), r * np.cos(la) * np.sin(lo), r * np.sin(la)], -1)


def slerp_ll(a, b, t):
    """Great-circle interpolation between (lat,lon) pairs."""
    pa, pb = ll2xyz(*a, r=1.0), ll2xyz(*b, r=1.0)
    d = float(np.clip(np.dot(pa, pb), -1, 1))
    om = math.acos(d)
    if om < 1e-9:
        return a
    p = (math.sin((1 - t) * om) * pa + math.sin(t * om) * pb) / math.sin(om)
    return (math.degrees(math.asin(p[2])), math.degrees(math.atan2(p[1], p[0])))


# ---------------------------------------------------------------- layers
class Layer:
    """Equirectangular RGB raster (float32 0..1) with a mip pyramid."""

    def __init__(self, img, bbox, wrap=False, feather=0.04, name=""):
        self.bbox = bbox  # lon0, lon1, lat0, lat1
        self.wrap = wrap
        self.name = name
        self.feather = feather
        img = img.astype(np.float32)
        self.pyr = [img]
        while min(self.pyr[-1].shape[:2]) > 64:
            self.pyr.append(cv2.pyrDown(self.pyr[-1]))
        lon0, lon1, lat0, lat1 = bbox
        h, w = img.shape[:2]
        self.km_px = (lat1 - lat0) / h * 111.195
        self.fade_km = None  # if set: layer dissolves in as screen km/px drops below this

    def level_for(self, km_px):
        lv = 0
        while lv + 1 < len(self.pyr) and self.km_px * 2 ** (lv + 1) <= km_px * 1.25:
            lv += 1
        return lv

    def sample(self, lat, lon, km_px):
        lon0, lon1, lat0, lat1 = self.bbox
        lv = self.level_for(km_px)
        img = self.pyr[lv]
        h, w = img.shape[:2]
        u = (lon - lon0) / (lon1 - lon0)
        v = (lat1 - lat) / (lat1 - lat0)
        if self.wrap:
            u = np.mod(u, 1.0)
        mx = (u * w - 0.5).astype(np.float32)
        my = (v * h - 0.5).astype(np.float32)
        border = cv2.BORDER_WRAP if self.wrap else cv2.BORDER_REPLICATE
        rgb = cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=border)
        if self.wrap:
            a = np.ones(lat.shape, np.float32)
        else:
            f = self.feather
            a = (np.clip(u / f, 0, 1) * np.clip((1 - u) / f, 0, 1) *
                 np.clip(v / f, 0, 1) * np.clip((1 - v) / f, 0, 1)).astype(np.float32)
            a = a * a * (3 - 2 * a)
            if img.shape[2] == 4:
                a = a * rgb[..., 3]
        if self.fade_km:
            a = a * clamp((self.fade_km - km_px) / (self.fade_km * 0.5))
        return rgb[..., :3], a


# ---------------------------------------------------------------- camera
class Cam:
    def __init__(self, lat, lon, alt, tilt=0.0, head=0.0, fov=40.0, roll=0.0):
        self.lat, self.lon, self.alt, self.tilt, self.head, self.fov, self.roll = lat, lon, alt, tilt, head, fov, roll

    def basis(self):
        T = ll2xyz(self.lat, self.lon)
        n = T / R
        la, lo = math.radians(self.lat), math.radians(self.lon)
        east = np.array([-math.sin(lo), math.cos(lo), 0.0])
        north = np.array([-math.sin(la) * math.cos(lo), -math.sin(la) * math.sin(lo), math.cos(la)])
        hd = math.radians(self.head)
        hdir = math.cos(hd) * north + math.sin(hd) * east
        t = math.radians(self.tilt)
        f = -n * math.cos(t) + hdir * math.sin(t)
        up = n * math.sin(t) + hdir * math.cos(t)
        # camera sits so that the look-at target is `alt` km away along -f,
        # measured so altitude above target stays ~alt for small tilts
        dist = self.alt / max(math.cos(t), 0.15)
        C = T - f * dist
        r = np.cross(f, up)
        if self.roll:
            ro = math.radians(self.roll)
            r, up = r * math.cos(ro) + up * math.sin(ro), up * math.cos(ro) - r * math.sin(ro)
        return C, f, up, r

    def project(self, lat, lon, alt=0.0):
        """lat/lon arrays -> screen x,y and visibility mask."""
        C, f, up, r = self.basis()
        P = ll2xyz(np.asarray(lat, float), np.asarray(lon, float), R + alt)
        D = P - C
        z = D @ f
        ty = math.tan(math.radians(self.fov) / 2)
        tx = ty * W / H
        x = (D @ r) / np.maximum(z, 1e-6) / tx
        y = (D @ up) / np.maximum(z, 1e-6) / ty
        sx = (x + 1) * 0.5 * W
        sy = (1 - y) * 0.5 * H
        Pn = P / np.linalg.norm(P, axis=-1, keepdims=True)
        vis = (z > 0) & (np.sum(Pn * (C - P), -1) > -1e-3 * R)
        return sx, sy, vis


# precomputed half-resolution screen grid (geometry is smooth -> upsample)
GW, GH = W // 2, H // 2
_gx, _gy = np.meshgrid((np.arange(GW) + 0.5) / GW * 2 - 1, 1 - (np.arange(GH) + 0.5) / GH * 2)


SPACE = np.array([0.01, 0.015, 0.035], np.float32)
ATMO = np.array([0.35, 0.6, 1.0], np.float32)
HAZE = np.array([0.62, 0.74, 0.92], np.float32)


def _up(a):
    return cv2.resize(a.astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)


def render(cam, layers, grade=None, stars=None, haze=1.0):
    C, f, up, r = cam.basis()
    ty = math.tan(math.radians(cam.fov) / 2)
    tx = ty * W / H
    d = f[None, None, :] + (_gx * tx)[..., None] * r + (_gy * ty)[..., None] * up
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    b = d @ C
    CC = float(C @ C)
    c = CC - R * R
    disc = b * b - c
    hitf = ((disc > 0) & (b < 0)).astype(np.float32)
    sq = np.sqrt(np.maximum(disc, 0))
    t = np.where(hitf > 0, -b - sq, -b)  # misses: closest approach point
    P = C + d * t[..., None]
    Pn = P / np.linalg.norm(P, axis=-1, keepdims=True)
    lat = np.degrees(np.arcsin(np.clip(Pn[..., 2], -1, 1)))
    rlon = np.degrees(np.arctan2(Pn[..., 1], Pn[..., 0])) - cam.lon
    rlon = (rlon + 180) % 360 - 180
    cosi = np.clip(-(d * Pn).sum(-1), 0.0, 1.0)
    dmin = np.sqrt(np.maximum(CC - b * b, 0)) - R

    alt = math.sqrt(CC) - R
    pix_ang = 2 * ty / H
    cb = float(f @ C)
    cdisc = cb * cb - c
    tc = -cb - math.sqrt(cdisc) if (cdisc > 0 and cb < 0) else alt
    km_px = max(tc * pix_ang, 1e-4)

    hit = _up(hitf)
    hit = np.clip((hit - 0.5) * 1.6 + 0.5, 0, 1)
    lat = _up(lat).astype(np.float64)
    lon = _up(rlon).astype(np.float64) + cam.lon
    t = _up(t)
    cosi = _up(cosi)
    dmin = _up(dmin)
    bneg = _up((b < 0).astype(np.float32))

    out = np.zeros((H, W, 3), np.float32)
    acc = np.zeros((H, W), np.float32)
    for L in sorted(layers, key=lambda L: L.km_px):
        if acc.min() > 0.999:
            break
        rgb, a = L.sample(lat, lon, km_px)
        a = a * (1 - acc)
        out += rgb * a[..., None]
        acc += a
    shade = (0.55 + 0.45 * np.sqrt(cosi))[..., None]
    ground = out * shade
    hz_scale = max(alt, 2.0) * 6.0
    hz = (1 - np.exp(-np.maximum(t - alt, 0) / hz_scale)) * 0.55 * haze
    rim = (1 - cosi) ** 3 * 0.65
    hz = np.clip(hz + rim * min(1.0, alt / 3000), 0, 0.85)[..., None]
    ground = ground * (1 - hz) + HAZE * hz

    scale = max(60.0, alt * 0.03)
    glow = np.exp(-np.maximum(dmin, 0) / scale) * bneg
    sky_lowalt = clamp(1 - alt / 400.0)
    skyc = SPACE * (1 - sky_lowalt) + np.array([0.38, 0.55, 0.85], np.float32) * sky_lowalt
    sky = skyc + ATMO * glow[..., None] * 0.9
    if stars is not None and sky_lowalt < 0.5:
        sky = sky + stars * (1 - sky_lowalt * 2)
    hm = hit[..., None]
    img = ground * hm + sky * (1 - hm)
    if grade is not None:
        img = grade(img)
    return np.clip(img, 0, 1), dict(km_px=km_px, alt=alt)


def make_stars(seed=3):
    rng = np.random.default_rng(seed)
    s = np.zeros((H, W, 3), np.float32)
    n = 900
    ys, xs = rng.integers(0, H, n), rng.integers(0, W, n)
    v = rng.random(n) ** 3 * 0.8
    s[ys, xs] = v[:, None]
    return cv2.GaussianBlur(s, (3, 3), 0.6)


def cinematic_grade(img):
    """Warm highlights, deep blue water, contrast; plus vignette."""
    g = img
    lum = g.mean(-1, keepdims=True)
    g = lum + (g - lum) * 1.18  # saturation
    g = np.clip(g, 0, 1)
    g = g * g * (3 - 2 * g) * 0.35 + g * 0.65  # s-curve contrast
    g = g * np.array([1.04, 1.0, 0.96], np.float32)
    return g * _VIG[..., None]


_vy, _vx = np.mgrid[0:H, 0:W]
_VIG = (1 - 0.38 * (((_vx - W / 2) / (W * 0.75)) ** 2 + ((_vy - H / 2) / (H * 0.7)) ** 2)).astype(np.float32)
_VIG = np.clip(_VIG, 0.45, 1)


class MercCam:
    """Flat Web-Mercator map camera (for the 'map lies' story)."""

    def __init__(self, lon, lat, span):
        self.lon, self.lat, self.span = lon, lat, span  # span: degrees of longitude across the frame

    def _k(self):
        return W / math.radians(self.span)

    @staticmethod
    def Y(lat):
        lat = np.clip(lat, -85, 85)
        return np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))

    def project(self, lat, lon, alt=0.0):
        lat, lon = np.asarray(lat, float), np.asarray(lon, float)
        k = self._k()
        sx = W / 2 + np.radians(lon - self.lon) * k
        sy = H / 2 - (self.Y(lat) - self.Y(self.lat)) * k
        return sx, sy, np.ones(sx.shape, bool)

    def render_self(self, layers):
        k = self._k()
        xs = np.arange(W) + 0.5
        ys = np.arange(H) + 0.5
        lon = self.lon + np.degrees((xs - W / 2) / k)
        Yv = self.Y(self.lat) - (ys - H / 2) / k
        lat = np.degrees(2 * np.arctan(np.exp(Yv)) - np.pi / 2)
        LON, LAT = np.meshgrid(lon, lat)
        km_px = math.radians(self.span) / W * R
        out = np.zeros((H, W, 3), np.float32)
        acc = np.zeros((H, W), np.float32)
        for L in sorted(layers, key=lambda L: L.km_px):
            rgb, a = L.sample(LAT, LON, km_px)
            a = a * (1 - acc)
            out += rgb * a[..., None]
            acc += a
        return out
