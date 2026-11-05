"""Camera keyframing helpers."""
import math
from engine import Cam, ease, clamp, lerp, slerp_ll


def fly(keys, t):
    """keys: list of (time, lat, lon, alt, tilt, head[, fov]). Smooth piecewise ease, log-altitude."""
    if t <= keys[0][0]:
        k = keys[0]
        return Cam(k[1], k[2], k[3], k[4], k[5], k[6] if len(k) > 6 else 40)
    for a, b in zip(keys[:-1], keys[1:]):
        if t <= b[0]:
            u = ease((t - a[0]) / max(1e-6, b[0] - a[0]))
            lat, lon = slerp_ll((a[1], a[2]), (b[1], b[2]), u)
            alt = math.exp(lerp(math.log(a[3]), math.log(b[3]), u))
            fa = a[6] if len(a) > 6 else 40
            fb = b[6] if len(b) > 6 else 40
            dh = (b[5] - a[5] + 180) % 360 - 180
            return Cam(lat, lon, alt, lerp(a[4], b[4], u), a[5] + dh * u, lerp(fa, fb, u))
    k = keys[-1]
    return Cam(k[1], k[2], k[3], k[4], k[5], k[6] if len(k) > 6 else 40)


def drift(cam, t, amt=0.02, period=9.0):
    """Subtle hand-held-free cinematic drift: slow heading sway."""
    cam.head += math.sin(t * 2 * math.pi / period) * amt * 20
    return cam


def scene_of(tl, t):
    for i, s in enumerate(tl):
        if t < s["end"]:
            return i, (t - s["start"])
    return len(tl) - 1, t - tl[-1]["start"]


def fa_num(s):
    return str(s).translate(str.maketrans("0123456789.-", "۰۱۲۳۴۵۶۷۸۹٫−"))


def fade(t, a, b, d=0.35):
    return clamp((t - a) / d) * clamp((b - t) / d)


import numpy as np


def _xyz(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)


def move_shape(ring, src, dst, u=1.0, spin=0.0):
    """Rigidly rotate a lon/lat ring on the sphere so `src` (lat,lon) goes to `dst` - keeps true size."""
    a, b = _xyz(*src), _xyz(*dst)
    ax = np.cross(a, b)
    s = np.linalg.norm(ax)
    ang = math.atan2(s, float(np.dot(a, b))) * u
    pts = _xyz(np.array([p[1] for p in ring]), np.array([p[0] for p in ring]))
    def rot(v, k, th):
        k = k / max(np.linalg.norm(k), 1e-12)
        return v * math.cos(th) + np.cross(k, v) * math.sin(th) + np.outer(v @ k, k) * (1 - math.cos(th))
    if s > 1e-9:
        pts = rot(pts, ax, ang)
    if spin:
        c = rot(a[None], ax, ang)[0] if s > 1e-9 else a
        pts = rot(pts, c, math.radians(spin) * u)
    lat = np.degrees(np.arcsin(np.clip(pts[:, 2], -1, 1)))
    lon = np.degrees(np.arctan2(pts[:, 1], pts[:, 0]))
    return list(zip(lon, lat))


def small_circle(lat, lon, radius_km, n=180):
    """Ring of points at a fixed great-circle distance from a centre."""
    d = radius_km / 6371.0
    la, lo = math.radians(lat), math.radians(lon)
    out = []
    for i in range(n + 1):
        b = 2 * math.pi * i / n
        la2 = math.asin(math.sin(la) * math.cos(d) + math.cos(la) * math.sin(d) * math.cos(b))
        lo2 = lo + math.atan2(math.sin(b) * math.sin(d) * math.cos(la), math.cos(d) - math.sin(la) * math.sin(la2))
        out.append((math.degrees(lo2), math.degrees(la2)))
    return out


def gc_path(a, b, n=100):
    """Great-circle (lon,lat) points from a=(lat,lon) to b."""
    from engine import slerp_ll
    return [tuple(reversed(slerp_ll(a, b, i / n))) for i in range(n + 1)]


def unwrap(ring):
    """Make longitudes continuous (for shapes crossing the antimeridian)."""
    out = [ring[0]]
    for lo, la in ring[1:]:
        p = out[-1][0]
        while lo - p > 180: lo -= 360
        while lo - p < -180: lo += 360
        out.append((lo, la))
    return out
