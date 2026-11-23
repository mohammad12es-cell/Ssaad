#!/usr/bin/env python3
"""Full Puck VO in ONE generation (Gemini 3.8 Flash TTS, the same model and voice as AI Studio).

reads vo/script.md (the "Style instructions" and "Text (one generation)" sections)
writes assets/audio/vo-full.wav (24 kHz mono, 16-bit)

usage: GEMINI_API_KEY=... python3 tools/gen_vo.py [--model gemini-3.8-flash-tts] [--voice Puck]
Generate once; never re-run to retry a take.
"""
import argparse, base64, json, os, re, sys, urllib.error, urllib.request, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://generativelanguage.googleapis.com/v1beta"


def sections():
    md = open(os.path.join(ROOT, "vo", "script.md"), encoding="utf-8").read()
    def sec(title):
        m = re.search(r"^## " + re.escape(title) + r"[^\n]*\n(.*?)(?=^## |\Z)", md, re.S | re.M)
        return m.group(1).strip()
    return sec("Style instructions"), sec("Text")


def call(path, body=None):
    key = os.environ.get("GEMINI_API_KEY") or "injected-by-proxy"
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"x-goog-api-key": key, "Content-Type": "application/json"},
                                 method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gemini-3.8-flash-tts")
    ap.add_argument("--voice", default="Puck")
    ap.add_argument("--out", default="assets/audio/vo-full.wav")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    if a.list:
        print("\n".join(m["name"].split("/")[-1] for m in call("/models?pageSize=1000").get("models", []) if "tts" in m["name"]))
        return
    style, text = sections()
    out = os.path.join(ROOT, a.out)
    if os.path.exists(out):
        sys.exit(f"{a.out} already exists: generate once, never re-run to retry")
    body = {"contents": [{"parts": [{"text": f"{style}\n\n{text}"}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": a.voice}}}}}
    print(f"model={a.model} voice={a.voice} lines={len(text.splitlines())}")
    res = call(f"/models/{a.model}:generateContent", body)
    part = res["candidates"][0]["content"]["parts"][0]["inlineData"]
    rate = 24000
    for tok in part.get("mimeType", "").split(";"):
        if tok.strip().startswith("rate="):
            rate = int(tok.split("=")[1])
    pcm = base64.b64decode(part["data"])
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    print(f"{len(pcm) / 2 / rate:.2f}s at {rate} Hz -> {a.out}")


if __name__ == "__main__":
    main()
