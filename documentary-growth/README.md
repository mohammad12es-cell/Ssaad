# THE MEANING OF GROWTH — personal documentary short (9:16, 24 fps, ~66 s)

Built from the 10 uploaded photos + the bill-counter clip. Nothing is generated or re-drawn:
every frame is a real photo, reframed with camera moves, a 2.5D parallax (person matte),
grading, film grain and Persian subtitles. Voice, music and sound design are produced here.

## Pipeline
| step | script | notes |
|---|---|---|
| narration takes | `pick_takes.py` | Piper `fa_IR-ganji-medium` (deep male, ~98 Hz). Several spellings × takes per line; Whisper-medium picks the take that matches the script. |
| tempo + timings | `tempo.py` | +3.5 % tempo (pitch kept), writes `report.json` durations |
| edit decision list | `timeline.py` | shots, crops, grades and subtitle timing — all anchored to narration lines |
| person mattes | `matte.py` | MODNet (onnx) → foreground/background split for parallax |
| picture | `render.py` | `python3 render.py VO MATTES FONTS out.mp4 1920` (1080p) or `3840` (4K) |
| score + mix | `audio.py` | synthesised piano / strings / drones / impacts / whooshes / breaths; voice EQ, ducking; stems written next to the mix |
| QA stills | `stills.py` | contact sheet of chosen timestamps |

Final mix is loudness-normalised to −14 LUFS / −1.5 dBTP (ffmpeg loudnorm, two pass) and muxed with AAC 320k.

## Structure
1. **Questions (mono)** — black → mirror selfie, face hidden behind the phone ("من کجام؟"); rapid detail cuts for sport / study / work / money.
2. **Ambition (colour returns)** — waterfall tilt-up, padel, cash, gym, the backhand — percussion builds and stops dead.
3. **The turn** — black and silence: «اما شاید ما یه چیزی رو فراموش کردیم...»; the golden corridor warms up.
4. **What matters (warm)** — friends, family, the lake. Final portrait: a real laugh, slow push-in, hold, fade.
