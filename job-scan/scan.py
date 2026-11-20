"""List open job ads in content creation / short-form video / video editing from Armenian job sites.

Usage: python3 job-scan/scan.py OUT.json
Writes [{site, url, title, company, deadline, apply_email}] for ads whose title looks relevant.
Sites: staff.am, job.am (rendered with Playwright), jobfinder.am, myjob.am, hr.am, thejobs.am.
list.am refuses automated requests (403) and is skipped.
"""
import html
import json
import os
import re
import subprocess
import sys
import time

UA = "video-edit-tool/1.0 (generic client)"
HERE = os.path.dirname(os.path.abspath(__file__))
RELEVANT = re.compile(
    r"video|vide[oa]|reel|content|kontent|smm|social|sotsial|media|creative|kreat|multimedia|motion|"
    r"editor|montaj|montazh|videograf|tiktok|youtube|creator|producer|post.?production|filmmak|"
    r"վիդեո|մոնտաժ|կոնտենտ|ռիլ|սոցիալ|մեդիա|կրեատ|видео|монтаж|контент|smm|рилс",
    re.I,
)
EXCLUDE = re.compile(r"game.?presenter|live.?dealer|surveillance|tesahsk|տեսահսկ|shuffler|croupier|крупье|engineer|accountant", re.I)


def get(url, timeout=30):
    r = subprocess.run(["curl", "-sS", "-L", "-g", "-A", UA, "--max-time", str(timeout), url], capture_output=True, text=True, errors="ignore")
    return r.stdout


def jsonld_job(s):
    for m in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', s, flags=re.S):
        try:
            j = json.loads(m)
        except Exception:
            continue
        for x in j if isinstance(j, list) else [j]:
            if isinstance(x, dict) and x.get("@type") == "JobPosting":
                return x
    return None


def relevant(*texts):
    t = " ".join(x or "" for x in texts)
    return bool(RELEVANT.search(t)) and not EXCLUDE.search(t)


def staff():
    links = set()
    for k in ["video", "reel", "content", "smm", "editor", "editing", "motion", "creative", "multimedia",
              "videographer", "tiktok", "youtube", "social+media", "creator", "montage"]:
        for p in (1, 2, 3):
            s = get(f"https://staff.am/en/jobs?key_word={k}&page={p}")
            found = set(re.findall(r'href="(/en/jobs/[a-z-]+/[^"]+)"', s))
            links |= found
            if len(found) < 50:
                break
            time.sleep(0.6)
    for c in ["marketing", "content-writing", "art-design", "web-design", "journalism", "tv-radio"]:
        for p in (1, 2, 3, 4):
            s = get(f"https://staff.am/en/jobs/{c}?page={p}")
            found = set(re.findall(rf'href="(/en/jobs/{c}/[^"]+)"', s))
            links |= found
            if len(found) < 50:
                break
            time.sleep(0.6)
    out = []
    for l in sorted(links):
        if not relevant(l.split("/en/jobs/")[1]) and "video-amp-photo-production" not in l:
            continue
        s = get("https://staff.am" + l)
        j = jsonld_job(s) or {}
        m = re.search(r'\\"hrMail\\":\\"([^\\"]*)\\"', s)
        out.append(dict(site="staff.am", url="https://staff.am" + l, title=j.get("title"),
                        company=((j.get("hiringOrganization") or {}).get("name") or "").strip(),
                        deadline=(j.get("validThrough") or "")[:10], apply_email=m.group(1) if m else None))
        time.sleep(0.4)
    return out


def jobam():
    # The listing is rendered by JavaScript: Marketing (2), Content/Mass media (21), Art/Design (15), Entertainment (27).
    tmp = os.path.join(os.environ.get("TMPDIR", "/tmp"), "jobam_links.json")
    env = dict(os.environ, SCROLLS="8")
    subprocess.run(["node", os.path.join(HERE, "links.cjs"), tmp, "https://job.am/en/jobs?I=21&I=2&I=15&I=27"], env=env, capture_output=True)
    try:
        links = json.load(open(tmp))[0].get("links", [])
    except Exception:
        return []
    seen, out = set(), []
    for l in links:
        h = l["href"].split("?")[0]
        if "/en/job/" not in h or h in seen or "boosted" in l["href"]:
            continue
        seen.add(h)
        if not relevant(h, l["text"]):
            continue
        j = jsonld_job(get(h)) or {}
        out.append(dict(site="job.am", url=h, title=j.get("title") or l["text"],
                        company=((j.get("hiringOrganization") or {}).get("name") or "").strip(),
                        deadline=(j.get("validThrough") or "")[:10], apply_email=None))
        time.sleep(0.4)
    return out


def jobfinder():
    out, seen = [], set()
    for q in ["fields%5B%5D=73", "fields%5B%5D=189", "position=video", "position=SMM", "position=content", "position=reel"]:
        s = get(f"https://jobfinder.am/jobs?{q}")
        for h, t in re.findall(r'href="(https://jobfinder\.am/jobs/[^"?]+/[0-9]+)"\s+class="j-position"\s*>([^<]*)<', s):
            t = re.sub(r"\s+", " ", t).strip()
            if h in seen or not relevant(h, t):
                continue
            seen.add(h)
            d = get(h)
            m = re.search(r"Վերջնաժամկետ`?\s*(?:<[^>]+>\s*)*([0-9]{2}/[0-9]{2}/[0-9]{4})", d)
            dl = "-".join(reversed(m.group(1).split("/"))) if m else ""
            out.append(dict(site="jobfinder.am", url=h, title=t, company="", deadline=dl, apply_email=None))
        time.sleep(0.5)
    return out


def myjob():
    out, seen = [], set()
    for p in range(1, 60):
        s = get(f"https://www.myjob.am/Default.aspx?pg={p}")
        items = re.findall(r'href="(Announcement\.aspx\?jobId=\d+)"><div class="shortJobContainer">.*?shortJobPosition">(.*?)</div>'
                           r'<div class="shortJobCompany">(.*?)</div>.*?shortJobDeadline">(.*?)</div>', s, flags=re.S)
        new = [i for i in items if i[0] not in seen]
        if not new:
            break
        for u, t, c, d in new:
            seen.add(u)
            t, c = html.unescape(t).strip(), html.unescape(c).strip()
            if relevant(t):
                out.append(dict(site="myjob.am", url="https://www.myjob.am/" + u, title=t, company=c, deadline=d.strip(), apply_email=None))
        time.sleep(0.5)
    return out


def hram():
    s = get("https://www.hr.am/search-posting")
    m = re.search(r'<script id="ng-state" type="application/json">(.*?)</script>', s, flags=re.S)
    out = []
    if not m:
        return out
    for v in json.loads(m.group(1)).values():
        if isinstance(v, dict) and str(v.get("u", "")).endswith("announcement-search"):
            for a in v["b"]["data"]["announcements"]["items"]:
                if relevant(a.get("title")):
                    out.append(dict(site="hr.am", url=f"https://www.hr.am/announcement/{a['announcementId']}", title=a.get("title"),
                                    company=a.get("customerName"), deadline=(a.get("deadlineDate") or "")[:10], apply_email=None))
    return out


def thejobs():
    s = get("https://thejobs.am/jobs")
    out, seen = [], set()
    for h in re.findall(r'href="(https://thejobs\.am/job/[^"]+)"', s):
        if h in seen:
            continue
        seen.add(h)
        if relevant(h.rsplit("/", 1)[-1]):
            out.append(dict(site="thejobs.am", url=h, title=h.rsplit("/", 1)[-1], company="", deadline="", apply_email=None))
    return out


def main():
    res = []
    for name, fn in [("staff.am", staff), ("job.am", jobam), ("jobfinder.am", jobfinder), ("myjob.am", myjob), ("hr.am", hram), ("thejobs.am", thejobs)]:
        try:
            r = fn()
        except Exception as e:  # one site failing must not stop the others
            print(f"{name}: failed: {e}", file=sys.stderr)
            r = []
        print(f"{name}: {len(r)}", file=sys.stderr)
        res += r
    json.dump(res, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
    print(len(res), "relevant ads")


if __name__ == "__main__":
    main()
