#!/usr/bin/env python3
"""Persian voiceover via Google AI Studio (Gemini API text-to-speech): the whole script in ONE take,
so the delivery and pacing stay continuous.

usage:
  GEMINI_API_KEY=... python3 gen_vo.py [--model gemini-2.5-pro-preview-tts] [--voice Charon] [--out assets/vo/take1.wav]
  python3 gen_vo.py --list        # TTS models this key can use

Then: python3 build.py assets/vo/take1.wav   (cleans the take, aligns the captions and writes index.html)
"""
import argparse, base64, json, os, sys, time, urllib.error, urllib.request, wave

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://generativelanguage.googleapis.com/v1beta"
SCRIPT = json.load(open(os.path.join(HERE, "script.json"), encoding="utf-8"))


def call(path, body=None):
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "injected-by-proxy"
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"x-goog-api-key": key, "Content-Type": "application/json"},
                                 method="POST" if body is not None else "GET")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:400]
            if e.code in (500, 502, 503, 504) and attempt < 3:
                wait = 10 * (attempt + 1); print(f"  HTTP {e.code}, retry in {wait}s: {msg[:120]}"); time.sleep(wait); continue
            sys.exit(f"HTTP {e.code}: {msg}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gemini-2.5-pro-preview-tts")
    ap.add_argument("--voice", default=SCRIPT["voice"]["voiceName"])
    ap.add_argument("--out", default="assets/vo/take1.wav")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.list:
        print("\n".join(m["name"].split("/")[-1] for m in call("/models?pageSize=1000").get("models", []) if "tts" in m["name"]))
        return
    text = "\n".join(s.get("tts", s["text"]) for s in SCRIPT["segments"])
    body = {
        "contents": [{"parts": [{"text": f"{SCRIPT['voice']['style']}\n\n{text}"}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": a.voice}}}},
    }
    print(f"model={a.model} voice={a.voice} chars={len(text)}")
    res = call(f"/models/{a.model}:generateContent", body)
    part = res["candidates"][0]["content"]["parts"][0]["inlineData"]
    rate = 24000
    for tok in part.get("mimeType", "").split(";"):
        if tok.strip().startswith("rate="): rate = int(tok.split("=")[1])
    pcm = base64.b64decode(part["data"])
    out = os.path.join(HERE, a.out); os.makedirs(os.path.dirname(out), exist_ok=True)
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    print(f"  {len(pcm) / 2 / rate:.2f}s -> {os.path.relpath(out, HERE)}")


if __name__ == "__main__":
    main()
