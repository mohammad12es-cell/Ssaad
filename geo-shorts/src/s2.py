"""Find clear Sentinel-2 L2A scenes on the public AWS sentinel-cogs bucket."""
import re, json, os, requests, functools, concurrent.futures as cf
B = "https://sentinel-cogs.s3.us-west-2.amazonaws.com"
CACHE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache", "s2idx")
os.makedirs(CACHE, exist_ok=True)
S = requests.Session()


def _get(url, **kw):
    for i in range(4):
        try:
            r = S.get(url, timeout=60, **kw)
            r.raise_for_status()
            return r
        except Exception as e:
            err = e
    raise err


def ls(prefix):
    r = _get(B, params={"list-type": "2", "prefix": prefix, "delimiter": "/"}).text
    return re.findall(r"<Prefix>([^<]*)</Prefix>", r)[1:]


def item(p):
    name = p.rstrip("/").split("/")[-1]
    c = os.path.join(CACHE, name + ".json")
    if os.path.exists(c):
        return json.load(open(c))
    it = _get(f"{B}/{p}{name}.json").json()
    pr = it["properties"]
    small = dict(cc=pr.get("eo:cloud_cover", 100), nd=pr.get("s2:nodata_pixel_percentage", 100),
                 href=it["assets"]["visual"]["href"], dt=pr["datetime"])
    json.dump(small, open(c, "w"))
    return small


def scenes(tile, years, months):
    z, band, sq = tile[:2], tile[2], tile[3:]
    prefixes = [f"sentinel-s2-l2a-cogs/{int(z)}/{band}/{sq}/{y}/{m}/" for y in years for m in months]
    with cf.ThreadPoolExecutor(8) as ex:
        ps = [p for l in ex.map(ls, prefixes) for p in l]
        its = list(ex.map(item, ps))
    return [(i["cc"] + i["nd"] * 0.5, i["cc"], i["nd"], i["href"], i["dt"]) for i in its if i["cc"] <= 100]


BANDS = "CDEFGHJKLMNPQRSTUVWX"


@functools.lru_cache(None)
def resolve(tile):
    """MGRS band letters at band edges differ from the S2 tile names: probe neighbours."""
    z, band, sq = tile[:2], tile[2], tile[3:]
    i = BANDS.index(band)
    for b in [band] + [BANDS[j] for j in (i + 1, i - 1) if 0 <= j < len(BANDS)]:
        if ls(f"sentinel-s2-l2a-cogs/{int(z)}/{b}/{sq}/"):
            return z + b + sq
    return None


def best(tile, years=(2023, 2022), months=range(1, 13), maxcc=5, **kw):
    tile = resolve(tile)
    if tile is None:
        raise LookupError("no tile")
    out = scenes(tile, years[:1], months)
    if not out or min(o[0] for o in out) > maxcc:
        out += scenes(tile, years[1:], months)
    if not out:
        out = scenes(tile, (2021, 2020), range(1, 13))
    if not out:
        raise LookupError(tile)
    out.sort()
    if kw.get("n"):
        return out[:kw["n"]]
    return out[0]


if __name__ == "__main__":
    import sys
    print(best(sys.argv[1]))
