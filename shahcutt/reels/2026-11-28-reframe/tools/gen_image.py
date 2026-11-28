#!/usr/bin/env python3
"""Generate one image with Gemini (Nano Banana Pro) -> PNG.

usage: GEMINI_API_KEY=... python3 tools/gen_image.py OUT.png ASPECT "prompt" [--model gemini-3-pro-image] [--size 2K]
ASPECT is 9:16, 16:9, 1:1 ... The key is read from the environment only; it is never written anywhere.
"""
import base64, json, os, sys, urllib.error, urllib.request

out, aspect, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
model = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else "gemini-3-pro-image"
size = sys.argv[sys.argv.index("--size") + 1] if "--size" in sys.argv else "2K"
body = {"contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect, "imageSize": size}}}
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                             data=json.dumps(body).encode(), method="POST",
                             headers={"Content-Type": "application/json", "x-goog-api-key": os.environ.get("GEMINI_API_KEY", "")})
try:
    r = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f"HTTP {e.code}: {e.read().decode()[:600]}")
for c in r.get("candidates", []):
    for p in c.get("content", {}).get("parts", []):
        d = p.get("inlineData") or p.get("inline_data")
        if d:
            open(out, "wb").write(base64.b64decode(d["data"])); print(f"{out}: {d.get('mimeType')} via {model}"); sys.exit(0)
sys.exit("no image in response: " + json.dumps(r)[:600])
