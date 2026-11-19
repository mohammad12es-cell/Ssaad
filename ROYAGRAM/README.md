# ROYAGRAM — "Make the Impossible Visible" (launch film)

45-second vertical (9:16, 24 fps) creative showreel for ROYAGRAM. It contains four original concept campaigns (fragrance, sneaker, beverage, watch), a showreel montage built from those shots, and a 3D brand reveal.

## Deliverables (`deliverables/`)
| File | What it is |
|---|---|
| `ROYAGRAM_Launch_45s_1080x1920_Subtitled.mp4` | **Main Reels upload.** H.264 High, CRF 14, AAC 320k, subtitles burned in |
| `ROYAGRAM_Launch_45s_1080x1920_NoSubs.mp4` | Clean version, no subtitles |
| `ROYAGRAM_Launch_45s_2160x3840_UHD-upscale.mp4` | UHD master, Lanczos upscale of the 1080p render (see MANIFEST) |
| `ROYAGRAM_Cutdown_15s_1080x1920.mp4` | 15-second cutdown (beat-aligned edit + re-mixed audio) |
| `ROYAGRAM_Launch_EN.srt` | Subtitle file (also the VO script and timing sheet) |
| `audio/` | Final mix (48 kHz / 24-bit WAV, −14 LUFS), cutdown mix, and Music / SFX / VO stems |
| `thumbnails/` | Three alternative cover frames (1080×1920 JPG) |
| `INSTAGRAM_CAPTION.txt` | Caption, hashtags, alt text |

See **MANIFEST.md** for the shot-by-shot asset manifest, methods, status, and known limitations.

## Rebuild from source
Requirements: Node 22 with Playwright + Chromium, FFmpeg, and Python 3 with `numpy scipy soundfile` (plus `kokoro-onnx` only if you regenerate the voice).
```bash
cd ROYAGRAM && npm install                       # three@0.170, opentype.js, Syncopate font
node src/render.mjs --out renders/frames --workers 3        # 1080 PNG frames (~45 min, CPU)
#   native 4K:  node src/render.mjs --out renders/frames4k --scale 2
python audio/build_audio.py audio/mix            # score + SFX + VO mix + cutdown mix
python src/deliver.py                            # encode + package everything into deliverables/
```
Preview a single frame: serve the folder and open `src/index.html`, then call `renderFrame(n)` in the console.

### Source map
- `src/timeline.js`: master timeline (shot windows, transitions, montage edit, grade curve)
- `src/scenes/s1_hook.js … s7_reveal.js`: one module per scene; `sneaker.js` is the procedural shoe
- `src/post.js`: story-motivated transitions (refraction, liquid zoom, smear, iris, split, wipe) and the film grade (ACES, split-tone, grain, vignette)
- `src/overlays.js` + `src/index.html`: typography layer
- `audio/build_audio.py` + `audio/cues.json`: procedural score and sound design, cue sheet synced to picture
- `audio/vo/*.wav`: the seven narration lines. Replace them with a voice-actor recording and re-run the audio build.
