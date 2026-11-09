# ODDLY EXPLAINED — Episode 001: Dinosaur Blood… 115 Million Years Later?

YouTube Short · 1080×1920 · 30 fps · 45 s · H.264 → `output/oddly_explained_ep001.mp4`

## Pipeline
| Step | Tool | Files |
|---|---|---|
| Narration | Kokoro neural TTS (local, `am_onyx`/`am_michael` blend) | `scripts/tts.py` → `public/audio/vo*.wav`, `vo.json` |
| Sound design | Synthesized with NumPy/SciPy (no samples, no music) | `scripts/sfx.py` → `public/audio/fx.wav` |
| Picture | Remotion 4 + Three.js (`@remotion/three`) | `src/` |
| Mix + encode | FFmpeg (VO EQ/compression, side-chain ducking, loudnorm −14 LUFS, x264) | `scripts/mix.sh` |

Timing is data-driven: scene cuts and subtitles are derived from the narration clip durations
(`src/timeline.ts` ⇄ `scripts/timeline.py`), so regenerating the voice keeps everything in sync.

## Build
```bash
npm install
# Kokoro models (once): kokoro-v1.0.onnx + voices-v1.0.bin from
# github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 into ./models
npm run tts        # optional: regenerate narration
npm run build      # sfx → remotion render (silent) → ffmpeg mix → output/oddly_explained_ep001.mp4
npm run studio     # interactive preview
```

## Scientific check (verified 2026-11-09)
- Species: ***Aratasaurus museunacionali*** — coelurosaurian theropod, Early Cretaceous (~115 Ma), Ceará, NE Brazil.
- Paper: Grice et al., "Heme signatures in mineralized red blood cells within vascular canals of a
  115-million-year-old dinosaur bone", *PNAS* 123(46), e2614248123 (2026).
- **heme** (US spelling): heme B and an altered derivative detected by HPLC–MS; the structures are mineralized
  (hausmannite, Mn₃O₄ proposed). Not intact blood, hemoglobin protein, or DNA. Some researchers (e.g. Mary
  Schweitzer) question whether the structures are red blood cells (size/shape).
- All 3D/illustrated imagery is labeled on screen as reconstruction/visualization.
