# ODDLY EXPLAINED — production pipeline

A repeatable pipeline for short 9:16 3D science films. All visuals and audio are **procedural and generated locally**: no stock footage, no paid APIs, no samples.

Video 001, *What happens when you fall asleep?*, is the first title built on it. Video 002, *Why don't you act out your dreams?*, is the second.

```
oddly-explained/
├── build.sh                         one command: narration → score → 3D → text → mix → encode → QC
├── engine/                          reusable across videos
│   ├── render_frames.js             deterministic frame renderer (Playwright + headless Chromium/WebGL2)
│   ├── compose.py                   audio mix + loudness, SRT, text layers, MP4 encodes, preview, QC report
│   ├── tts.py                       Kokoro-82M narration, line placement, Whisper word-aligned subtitle splits
│   ├── synth.py                     numpy sound-design toolkit (impacts, risers, pads, bells, crackle, reverb)
│   ├── contact_sheet.py             QC contact sheets with frame/timecode labels
│   ├── lib/                         3D assets + rendering (ES modules, Three.js r170)
│   │   ├── stage.js                 time-from-frame-index harness
│   │   ├── post.js                  MSAA HDR → depth of field → bloom → ACES grade, CA, zoom blur, grain, fades
│   │   ├── brain.js                 procedural brain: gyri/sulci, Sylvian fissure, central sulcus, cerebellum, stem, surface network
│   │   ├── neurons.js               neuron field (somas, branching tapered dendrites, axons, boutons) + activity shader, bokeh motes, light shafts
│   │   ├── dreams.js                dream fragments (floating island, melting clock, distant figure, colour forms)
│   │   ├── memory.js                memory-fragment cards that settle into a linked lattice
│   │   ├── body.js                  procedural human: SDF + surface nets, 17-bone skinning, nervous system with per-region gates, hologram twin
│   │   ├── noise.js / geom.js       seeded RNG + simplex noise (JS + GLSL), geometry helpers
│   ├── fonts/                       Montserrat, Inter, Vazirmatn (SIL OFL; licences included)
│   └── vendor/                      three.module.js r170 + UnrealBloomPass (MIT)
└── videos/001-falling-asleep/
    ├── config.json                  timeline, narration, EN/FA subtitle chunks, EN/FA titles  ← single source of truth
    ├── scene.js / scene.html        the 3D film (text-free) + stylised EEG-like HUD
    ├── text.html                    title/subtitle/end-card layer, rendered per language with transparency
    └── sound.py                     the score, cue-locked to the picture
```

## Requirements

- Node 18+ with `playwright` and its Chromium (`require('playwright')` must work). No GPU is needed: SwiftShader WebGL2 works. A GPU just makes rendering faster.
- Python 3.10+ with `numpy`, `soundfile`, `Pillow`, `kokoro-onnx` (pulls in `onnxruntime`), and optionally `faster-whisper` for word-accurate subtitle timing.
- FFmpeg with libx264 and the `loudnorm`, `sidechaincompress` and `ebur128` filters.

```bash
pip install numpy soundfile pillow kokoro-onnx faster-whisper
```

The Kokoro model (~350 MB, Apache-2.0) downloads to `~/.cache/oddly-explained/kokoro` on first run. Whisper `small.en` goes to the Hugging Face cache. If the Xet transfer fails behind a proxy, set `HF_HUB_DISABLE_XET=1`.

## Build

```bash
./build.sh videos/001-falling-asleep             # full build → ../output/oddly-explained/VIDEO_001/
./build.sh videos/001-falling-asleep --preview   # look-dev: 30-frame contact sheet at 1/3 res in ~1 min
WORKERS=4 OUT=/some/dir ./build.sh videos/001-falling-asleep
```

On a 4-core CPU-only container the 3D layer takes ~2.6 s/frame (~40 min for 900 frames). Everything else takes under 5 min.

Individual steps:

```bash
node engine/render_frames.js --page videos/001-falling-asleep/scene.html --list 0,150,450 --scale 0.5 --out /tmp/look
node engine/render_frames.js --page videos/001-falling-asleep/scene.html --frames 270-449 --out build/001/frames3d   # re-render a range
python3 engine/compose.py videos/001-falling-asleep build/001 OUT --steps encode,qc
```

`render_frames.js` takes extra page parameters through `--query`, e.g. `--query "dbg=nopost"` (disables post effects in `scene.js`) or `--query "samples=0"`.

## Outputs

| file | contents |
|---|---|
| `VIDEO_001_EN.mp4` | picture + English titles + burned-in English subtitles + mix |
| `VIDEO_001_FA.mp4` | picture + Persian titles + burned-in Persian subtitles (Vazirmatn, RTL) + English narration mix |
| `VIDEO_001_CLEAN.mp4` | text-free master (no titles/subtitles/end-card text) + mix; carries **soft** EN and FA subtitle tracks |
| `VIDEO_001_EN.srt`, `VIDEO_001_FA.srt` | editable subtitles (FA lines wrapped in RLM marks for bidi-safe players) |
| `VIDEO_001_PREVIEW.mp4` | 540×960 lightweight preview |
| `VIDEO_001_CONTACT.jpg`, `VIDEO_001_POSTER.jpg` | contact sheet (every 1.5 s) and thumbnail candidate |
| `QC_REPORT.json` | measured resolution, fps, frame count, duration, loudness, true peak, black segments |

All videos are 1080×1920, 30 fps, exactly 900 frames, H.264 High@4.2 yuv420p BT.709 at CRF 18 capped at 14 Mb/s (~50 MB per file), with AAC 256 kb/s audio normalised to -14 LUFS / -1.5 dBTP.

The stylised HUD trace (with its N1/N2/N3/REM stage abbreviations) belongs to the picture layer, so it also appears in CLEAN.

## Making the next video

1. Copy `videos/001-falling-asleep` to `videos/002-<slug>`.
2. Edit `config.json`: timeline, narration lines (`tts` is what the voice says; `en`/`fa` are the subtitle chunks), and titles.
3. Write `scene.js` from the engine assets. Everything must be a pure function of `t`, with no `Math.random()` or wall-clock time.
4. Write `sound.py`, placing cues at the same timestamps as the picture.
5. Iterate with `--preview` and contact sheets, then run the full build.

**Swapping in a human voice.** Drop `n1.wav … n6.wav` into `videos/<id>/voice/`. `tts.py` uses those files instead of the TTS, then trims, places and aligns them automatically.

## Quality features (opt-in per film)

- **Motion blur**: set `"motionBlur": { "samples": 3, "shutter": 0.5 }` in `config.json`. Sub-frames are accumulated in HDR and post-processed once. Use `--query mb=1` for fast look-dev.
- **God rays, anamorphic streaks, split toning**: set `post.params.rays/raysPos`, `streak`, and `split` in the scene. All are off by default.
- **Voice blending**: `"voice": { "blend": { "am_fenrir": 0.65, "am_michael": 0.35 } }` mixes Kokoro voice styles.
- **Long renders**: `render_frames.js --resume` skips frames already on disk. A page error during boot fails immediately, with a stack trace.

## Determinism

The 3D layer derives everything from the frame index, and every procedural asset is seeded. Re-rendering any frame range reproduces those frames, so ranges can be patched or split across machines.

Film grain is also a pure function of frame time, so it repeats exactly too.
