"""Build and cache imagery layers.

global_layer()            NASA Blue Marble + relief shading (whole planet)
relief_layer(bbox, z)     Blue Marble colour upsampled + AWS Terrarium DEM hillshade
sentinel_layer(bbox, km)  Real Sentinel-2 L2A true-colour mosaic (AWS open data)
"""
import os, io, math, json, hashlib, concurrent.futures as cf
import numpy as np
import cv2
import requests
from engine import Layer, DATA, CACHE

os.makedirs(CACHE, exist_ok=True)
os.environ.setdefault("CURL_CA_BUNDLE", "/root/.ccr/ca-bundle.crt")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "4")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")


def _key(*a):
    return hashlib.md5(json.dumps(a).encode()).hexdigest()[:12]


def _save(name, img, bbox):
    cv2.imwrite(os.path.join(CACHE, name + ".png"), cv2.cvtColor((np.clip(img, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    json.dump(bbox, open(os.path.join(CACHE, name + ".json"), "w"))


def _load(name):
    p = os.path.join(CACHE, name + ".png")
    if not os.path.exists(p):
        return None
    img = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    return img, json.load(open(os.path.join(CACHE, name + ".json")))


def hillshade(z, km_px, az=270.0, alt=35.0, exag=1.0):
    """z in metres, km_px pixel size -> 0..1 shade (lit from the west by default)."""
    gy, gx = np.gradient(z.astype(np.float32), km_px * 1000)
    gx, gy = gx * exag, gy * exag
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    azr, altr = math.radians(360 - az + 90), math.radians(alt)
    sh = np.sin(altr) * np.cos(slope) + np.cos(altr) * np.sin(slope) * np.cos(azr - aspect)
    return np.clip(sh, 0, 1)


# ------------------------------------------------------------- global
_BM = None


def bm():
    global _BM
    if _BM is None:
        _BM = cv2.cvtColor(cv2.imread(os.path.join(DATA, "earth-blue-marble.jpg")), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    return _BM


def global_layer():
    c = _load("global_v2")
    if c is None:
        img = bm().copy()
        h, w = img.shape[:2]
        topo = cv2.imread(os.path.join(DATA, "earth-topology.png"), 0).astype(np.float32)
        topo = cv2.resize(topo, (w, h), interpolation=cv2.INTER_CUBIC)
        water = cv2.imread(os.path.join(DATA, "earth-water.png"), 0).astype(np.float32) / 255
        water = cv2.resize(water, (w, h))
        sh = hillshade(topo * 25.0, 40075 / w)
        land = 1 - water
        img = img * (1 - land[..., None] * 0.45 + land[..., None] * 0.45 * sh[..., None] * 1.35)
        # deepen and saturate the oceans
        deep = np.array([0.02, 0.10, 0.30], np.float32)
        img = img * (1 - water[..., None] * 0.35) + deep * water[..., None] * 0.35
        _save("global_v2", img, [-180, 180, -90, 90])
        c = (np.clip(img, 0, 1), [-180, 180, -90, 90])
    return Layer(c[0], tuple(c[1]), wrap=True, name="global")


# ------------------------------------------------------------- terrarium DEM
TERR = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def _tile(z, x, y):
    p = os.path.join(CACHE, "terr", f"{z}_{x}_{y}.png")
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        for _ in range(4):
            try:
                r = requests.get(TERR.format(z=z, x=x, y=y), timeout=60)
                r.raise_for_status()
                open(p, "wb").write(r.content)
                break
            except Exception:
                pass
    im = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2RGB).astype(np.float32)
    return im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768


def dem(bbox, km_px):
    """Elevation (m) on an equirectangular grid covering bbox at ~km_px."""
    lon0, lon1, lat0, lat1 = bbox
    mid = math.radians((lat0 + lat1) / 2)
    z = int(np.clip(round(math.log2(40075 * math.cos(mid) / 256 / km_px)), 1, 13))
    n = 2 ** z
    h = int(round((lat1 - lat0) * 111.195 / km_px))
    w = int(round((lon1 - lon0) * 111.195 * math.cos(mid) / km_px))
    lons = np.linspace(lon0, lon1, w)
    lats = np.linspace(lat1, lat0, h)
    X = (lons + 180) / 360 * n
    Y = (1 - np.log(np.tan(np.radians(lats)) + 1 / np.cos(np.radians(lats))) / math.pi) / 2 * n
    tx0, tx1 = int(X.min()), int(X.max())
    ty0, ty1 = int(Y.min()), int(Y.max())
    tiles = {}
    with cf.ThreadPoolExecutor(16) as ex:
        futs = {ex.submit(_tile, z, tx % n, ty): (tx, ty) for tx in range(tx0, tx1 + 1) for ty in range(ty0, ty1 + 1)}
        for fu, k in futs.items():
            tiles[k] = fu.result()
    mosaic = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), np.float32)
    for (tx, ty), t in tiles.items():
        mosaic[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = t
    mx = ((X - tx0) * 256 - 0.5).astype(np.float32)
    my = ((Y - ty0) * 256 - 0.5).astype(np.float32)
    MX, MY = np.meshgrid(mx, my)
    return cv2.remap(mosaic, MX, MY, cv2.INTER_LINEAR), (w, h)


def relief_layer(bbox, km_px=1.0, exag=2.0, strength=0.55):
    name = "relief_" + _key(bbox, km_px, exag, strength)
    c = _load(name)
    if c is None:
        z, (w, h) = dem(bbox, km_px)
        lon0, lon1, lat0, lat1 = bbox
        B = bm()
        bh, bw = B.shape[:2]
        lons = np.linspace(lon0, lon1, w)
        lats = np.linspace(lat1, lat0, h)
        MX, MY = np.meshgrid(((lons + 180) / 360 * bw - 0.5).astype(np.float32), ((90 - lats) / 180 * bh - 0.5).astype(np.float32))
        col = cv2.remap(B, MX, MY, cv2.INTER_CUBIC)
        sh = hillshade(z, km_px, exag=exag)
        land = (z > 1).astype(np.float32)
        land = cv2.GaussianBlur(land, (0, 0), 1.0)
        mod = 1 - strength + strength * sh * 1.45
        img = col * (1 - land[..., None] + land[..., None] * mod[..., None])
        c = (np.clip(img, 0, 1), list(bbox))
        _save(name, c[0], c[1])
    return Layer(c[0], tuple(c[1]), name="relief")


def dem_layer_raw(bbox, km_px):
    return dem(bbox, km_px)


# ------------------------------------------------------------- Sentinel-2
def _tiles_for(bbox, step_km=40):
    import mgrs
    m = mgrs.MGRS()
    lon0, lon1, lat0, lat1 = bbox
    out = set()
    ny = max(2, int((lat1 - lat0) * 111 / step_km) + 2)
    for lat in np.linspace(lat0, lat1, ny):
        nx = max(2, int((lon1 - lon0) * 111 * math.cos(math.radians(lat)) / step_km) + 2)
        for lon in np.linspace(lon0, lon1, nx):
            out.add(m.toMGRS(float(lat), float(lon), MGRSPrecision=0))
    from s2 import resolve
    out = {resolve(t) for t in out}
    out.discard(None)
    return sorted(out)


def sentinel_layer(bbox, km_px=0.05, months=(5, 6, 7, 8, 9), years=(2023, 2022, 2024), maxcc=3.0,
                   match_bm=0.7, gain=1.0, prefer=None):
    import rasterio
    from rasterio.warp import reproject, Resampling
    from rasterio.transform import from_bounds
    from s2 import best
    name = "s2_" + _key(bbox, km_px, months, years, maxcc, match_bm, gain, prefer)
    c = _load(name)
    if c is None:
        lon0, lon1, lat0, lat1 = bbox
        h = int(round((lat1 - lat0) * 111.195 / km_px))
        w = int(round((lon1 - lon0) * 111.195 * math.cos(math.radians((lat0 + lat1) / 2)) / km_px))
        dst_t = from_bounds(lon0, lat0, lon1, lat1, w, h)
        tiles = _tiles_for(bbox)
        print("  s2 tiles", len(tiles), tiles[:6], "...", flush=True)

        def find(t):
            try:
                lst = best(t, years=years, months=months, maxcc=maxcc, n=400)
            except Exception as e:
                return []
            if prefer and t in prefer:
                lst = [prefer[t]] + lst
            # best scene, plus complementary ones when it has swath gaps
            sel = [lst[0]]
            if lst[0][2] > 1.0:
                # a scene from the other orbit has a clearly different no-data share
                other = [x for x in lst[1:] if abs(x[2] - lst[0][2]) > 5 and x[1] < max(maxcc * 4, 15)]
                sel += other[:1]
            return [(t, x) for x in sel]

        with cf.ThreadPoolExecutor(12) as ex:
            found = [x for l in ex.map(find, tiles) for x in l]
        mosaic = np.zeros((3, h, w), np.float32)
        filled = np.zeros((h, w), bool)

        def read(item):
            t, s = item
            if s is None:
                return None
            href = s[3]
            buf = np.zeros((3, h, w), np.float32)
            src_res_km = 0.01
            ovr = None
            for k, f in enumerate([2, 4, 8, 16]):
                if src_res_km * f <= km_px * 1.1:
                    ovr = k
            for attempt in range(3):
                try:
                    kw = {} if ovr is None else {"overview_level": ovr}
                    with rasterio.open("/vsicurl/" + href, **kw) as d:
                        arr = d.read().astype(np.float32)
                        reproject(arr, buf, src_transform=d.transform, src_crs=d.crs, dst_transform=dst_t,
                                  dst_crs="EPSG:4326", resampling=Resampling.bilinear, src_nodata=0, dst_nodata=0)
                    return buf, s[1]
                except Exception as e:
                    err = e
            print("   read fail", t, err, flush=True)
            return None

        # composite best (least cloudy) first, in small batches to bound memory
        found.sort(key=lambda f: f[1][1] if f[1] else 999)
        with cf.ThreadPoolExecutor(4) as ex:
            for i in range(0, len(found), 4):
                for r in ex.map(read, found[i:i + 4]):
                    if r is None:
                        continue
                    buf, cc = r
                    m = (buf.sum(0) > 0) & ~filled
                    mosaic[:, m] = buf[:, m]
                    filled |= m
                    del buf
        img = mosaic.transpose(1, 2, 0) / 255.0
        valid = filled
        # tone: TCI is already a display stretch; just tame highlights a little
        img = np.clip(img * gain, 0, 1) ** 1.12
        if match_bm:
            B = bm()
            bh, bw = B.shape[:2]
            lons = np.linspace(lon0, lon1, w)
            lats = np.linspace(lat1, lat0, h)
            MX, MY = np.meshgrid(((lons + 180) / 360 * bw - 0.5).astype(np.float32), ((90 - lats) / 180 * bh - 0.5).astype(np.float32))
            col = cv2.remap(B, MX, MY, cv2.INTER_LINEAR)
            for ch in range(3):
                a, b = img[..., ch][valid], col[..., ch][valid]
                k = (b.std() + 1e-4) / (a.std() + 1e-4)
                adj = (img[..., ch] - a.mean()) * k + b.mean()
                img[..., ch] = img[..., ch] * (1 - match_bm) + adj * match_bm
        alpha = cv2.GaussianBlur(valid.astype(np.float32), (0, 0), 3)
        alpha = np.clip((alpha - 0.5) * 2.2 + 0.5, 0, 1) * valid
        rgba = np.dstack([np.clip(img, 0, 1), alpha])
        p = os.path.join(CACHE, name + ".png")
        cv2.imwrite(p, cv2.cvtColor((rgba * 255).astype(np.uint8), cv2.COLOR_RGBA2BGRA))
        json.dump(list(bbox), open(os.path.join(CACHE, name + ".json"), "w"))
    p = os.path.join(CACHE, name + ".png")
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    im = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255
    bbox = tuple(json.load(open(os.path.join(CACHE, name + ".json"))))
    return Layer(im, bbox, name="s2")
