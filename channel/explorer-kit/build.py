"""Explorer series builder.

usage: python3 build.py <episode_dir> [--no-voice]

<episode_dir> holds episode.json, vo/lines.txt (one line per scene) and scenes.js.
Steps: Kokoro TTS per line (free, offline, via sherpa-onnx) -> soundtrack mix with a
generated music bed -> vo/timing.json -> copies kit assets -> writes index.html.
Set KOKORO_DIR to the extracted kokoro-en-v0_19 model folder.
"""
import json, os, pathlib, shutil, sys
import numpy as np, soundfile as sf

KIT = pathlib.Path(__file__).parent
EP = pathlib.Path(sys.argv[1]).resolve()
cfg = json.loads((EP / "episode.json").read_text())
lines = [l for l in (EP / "vo" / "lines.txt").read_text().strip().split("\n") if l.strip()]
caps = cfg["captions"]
assert len(caps) == len(lines), (len(caps), len(lines))
kinds = cfg.get("kinds") or ["vec"] * len(lines)
wavdir = EP / "vo" / "wav"

if "--no-voice" not in sys.argv:
    import sherpa_onnx
    d = os.environ.get("KOKORO_DIR")
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=f"{d}/model.onnx", voices=f"{d}/voices.bin",
                                                       tokens=f"{d}/tokens.txt", data_dir=f"{d}/espeak-ng-data"), num_threads=4)))
    wavdir.mkdir(parents=True, exist_ok=True)
    for f in wavdir.glob("*.wav"): f.unlink()
    for i, l in enumerate(lines, 1):
        a = tts.generate(l, sid=cfg.get("voice", 9), speed=cfg.get("speed", 1.0))
        s = np.array(a.samples); nz = np.where(np.abs(s) > 0.01)[0]; s = s[max(nz[0] - 1000, 0): nz[-1] + 2400]
        sf.write(wavdir / f"s{i:02d}.wav", s, a.sample_rate)

# ---- timing + mix ----
gap, lead = cfg.get("gap", 0.3), 0.15
t, scenes, vo, sr = lead, [], [], 24000
for i in range(1, len(lines) + 1):
    a, sr = sf.read(wavdir / f"s{i:02d}.wav")
    hold = cfg.get("hold", {}).get(str(i), 0)  # extra seconds of picture after a line
    scenes.append({"start": round(t, 3), "vo": round(len(a) / sr, 3)}); vo.append((t, a)); t += len(a) / sr + gap + hold
total = round(t + 0.5, 2)
for i, s in enumerate(scenes): s["end"] = round(scenes[i + 1]["start"] if i + 1 < len(scenes) else total, 3)
N = int(total * sr); out = np.zeros(N); tt = np.arange(N) / sr
for st, a in vo: k = int(st * sr); out[k:k + len(a)] += a * 0.95
# music bed: plucked melody in a Persian-flavoured mode over a soft drone (seeded per episode)
rng = np.random.default_rng(cfg.get("seed", 1))
root = cfg.get("root", 146.83)
mode = [1, 16 / 15, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2]
beat = 60 / cfg.get("bpm", 112); bed = np.zeros(N); deg = 0
for k in range(int(total / beat)):
    if k % 8 == 7: continue
    deg = int(np.clip(deg + rng.choice([-2, -1, -1, 0, 1, 1, 2]), 0, 7))
    f = root * mode[deg]; st = int(k * beat * sr); L = int(0.8 * sr); x = np.arange(L) / sr
    tone = (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x) + 0.15 * np.sin(6 * np.pi * f * x)) * np.exp(-x * 6)
    seg = bed[st:st + L]; seg += tone[:len(seg)] * (1.0 if k % 2 == 0 else 0.7)
drone = 0.3 * np.sin(2 * np.pi * root / 2 * tt) + 0.12 * np.sin(2 * np.pi * root * 0.75 * tt)
bed = (bed + drone) * cfg.get("music", 0.04)
out += bed * np.minimum(1, np.minimum(tt / 1.0, (total - tt) / 1.5))
out /= max(1, np.abs(out).max() / 0.97)
(EP / "assets").mkdir(exist_ok=True)
sf.write(EP / "assets" / "audio.wav", out.astype(np.float32), sr, subtype="PCM_16")
(EP / "vo" / "timing.json").write_text(json.dumps({"total": total, "scenes": scenes}, indent=1))

# ---- assets + html ----
for f in ["lib.js", "gsap.min.js", "fredoka-latin-700-normal.woff2"]: shutil.copy(KIT / f, EP / "assets" / f)
clips = []
for i, s in enumerate(scenes, 1):
    st = 0 if i == 1 else s["start"]; du = round(s["end"] - st, 3)
    if kinds[i - 1] == "photo":
        clips.append(f'<div id="p{i}" class="clip photo" data-start="{st}" data-duration="{du}" data-track-index="1"><div class="cam">'
                     f'<img class="ph" src="assets/hero.png" alt="" /><svg class="ov" viewBox="0 0 1080 1919"><g id="ov{i}"></g></svg></div></div>')
    else:
        clips.append(f'<svg id="v{i}" class="clip stage" data-start="{st}" data-duration="{du}" data-track-index="2" viewBox="0 0 1080 1920"><g id="g{i}"></g></svg>')
    clips.append(f'<div id="c{i}" class="clip cap" data-start="{st}" data-duration="{du}" data-track-index="3"><div class="card">{caps[i - 1]}</div></div>')
html = (KIT / "template.html.tpl").read_text().replace("__TOTAL__", str(total)).replace("__CLIPS__", "\n      ".join(clips))
html = html.replace("__SCENES__", json.dumps([s["start"] for s in scenes]))
(EP / "index.html").write_text(html)
print(EP.name, "total", total, "s")
