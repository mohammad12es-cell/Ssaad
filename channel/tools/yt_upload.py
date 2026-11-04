#!/usr/bin/env python3
"""Upload a video to YouTube with the Data API v3 (stdlib only).

Needs env vars YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
(refresh token with the https://www.googleapis.com/auth/youtube.upload scope).

usage: yt_upload.py VIDEO.mp4 META.json
META.json: {"title":..., "description":..., "tags":[...], "categoryId":"1",
            "privacyStatus":"private|unlisted|public", "publishAt":"2026-11-06T17:00:00Z" (optional),
            "madeForKids": false,
            "localizations": {"fa": {"title":..., "description":...}, "es": {...}} (optional)}
"""
import json, os, sys, urllib.parse, urllib.request

def token():
    data = urllib.parse.urlencode({
        "client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen("https://oauth2.googleapis.com/token", data) as r:
        return json.load(r)["access_token"]

def main(video, meta_path):
    meta = json.load(open(meta_path))
    status = {"privacyStatus": meta.get("privacyStatus", "private"),
              "selfDeclaredMadeForKids": bool(meta.get("madeForKids", False))}
    if meta.get("publishAt"):
        status["privacyStatus"] = "private"; status["publishAt"] = meta["publishAt"]
    body = {"snippet": {"title": meta["title"], "description": meta["description"], "tags": meta.get("tags", []),
                        "categoryId": meta.get("categoryId", "1"), "defaultLanguage": "en", "defaultAudioLanguage": "en"},
            "status": status}
    parts = "snippet,status"
    if meta.get("localizations"):
        body["localizations"] = meta["localizations"]; parts += ",localizations"
    size = os.path.getsize(video); tok = token()
    req = urllib.request.Request(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=" + parts,
        data=json.dumps(body).encode(), method="POST",
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8",
                 "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)})
    with urllib.request.urlopen(req) as r:
        loc = r.headers["Location"]
    with open(video, "rb") as f:
        up = urllib.request.Request(loc, data=f.read(), method="PUT",
                                    headers={"Authorization": f"Bearer {tok}", "Content-Type": "video/mp4"})
        with urllib.request.urlopen(up) as r:
            res = json.load(r)
    print(json.dumps({"id": res["id"], "url": f"https://youtube.com/shorts/{res['id']}",
                      "status": res.get("status")}, indent=2))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
