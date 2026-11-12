#!/usr/bin/env python3
"""Persian voiceover via Google AI Studio (Gemini API text-to-speech), one clip per script segment.

usage:
  python3 gen_vo.py                      # all segments -> assets/vo/s1.wav ...
  python3 gen_vo.py --only s3,s7         # redo some segments
  python3 gen_vo.py --voice Orus --model gemini-2.5-pro-preview-tts
  python3 gen_vo.py --list               # show the TTS models this key can use

API key: a network secret for generativelanguage.googleapis.com (the session proxy injects it into the
x-goog-api-key header), or GEMINI_API_KEY in the environment. Then run: python3 build.py vo
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
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:400]
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                wait = 8 * (attempt + 1); print(f"  HTTP {e.code}, retry in {wait}s: {msg[:120]}"); time.sleep(wait); continue
            sys.exit(f"HTTP {e.code}: {msg}")


def tts_models():
    names = [m["name"].split("/")[-1] for m in call("/models?pageSize=1000").get("models", [])]
    return [n for n in names if "tts" in n]


def pick_model(models):
    def score(n):
        return ("pro" in n) * 10 + ("preview" not in n) * 2 + sum(c.isdigit() and int(c) for c in n.split("-tts")[0]) * 0.1
    return max(models, key=score)


def synth(model, voice, style, text):
    body = {
        "contents": [{"parts": [{"text": f"{style}\n\n{text}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    res = call(f"/models/{model}:generateContent", body)
    part = res["candidates"][0]["content"]["parts"][0]["inlineData"]
    rate = 24000
    for tok in part.get("mimeType", "").split(";"):
        if tok.strip().startswith("rate="): rate = int(tok.split("=")[1])
    return base64.b64decode(part["data"]), rate


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model"); ap.add_argument("--voice", default=SCRIPT["voice"]["voiceName"])
    ap.add_argument("--only"); ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    models = tts_models()
    if a.list:
        print("\n".join(models)); return
    if not models and not a.model: sys.exit("no TTS model visible for this key")
    model = a.model or pick_model(models)
    only = set(a.only.split(",")) if a.only else None
    os.makedirs(os.path.join(HERE, "assets", "vo"), exist_ok=True)
    print(f"model={model} voice={a.voice}")
    for s in SCRIPT["segments"]:
        if only and s["id"] not in only: continue
        pcm, rate = synth(model, a.voice, SCRIPT["voice"]["style"], s["text"])
        out = os.path.join(HERE, "assets", "vo", f"{s['id']}.wav")
        with wave.open(out, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
        print(f"  {s['id']}: {len(pcm) / 2 / rate:.2f}s -> {os.path.relpath(out, HERE)}")


if __name__ == "__main__":
    main()
