# Ali Majdi — whey protein reel (v4)

Rebuilt from the original `VID_20261115_162340_546.mp4` + photos (team camp, stage medal, studio / MILADPHOTOO).

Pipeline (`scripts/`):
1. `sub_detect.py` — finds every burned-in subtitle change frame (→ `chunks.json`), used for caption timing and box removal.
2. `captions_src.py` + `words.py` — caption text per chunk, word reveal times from voice energy (→ `captions.json`).
3. `base.py` — 1080x1920 base layer: subtitle-box inpainting, reframing/crops (watermark cropped out), Ken Burns on the photos, punch-in zooms on cuts.
4. `overlay.html` + `render.js` — Vazirmatn motion graphics + kinetic captions rendered frame-by-frame with Playwright (alpha .mov).
5. `music.py` (MIDI → FluidSynth FluidR3_GM) + `sfx.py` (whooshes, booms, 808 sub) + `mix.sh` (voice cleanup, sidechain ducking, -14 LUFS).
6. `comp.sh` — color grade + overlay + audio mux.

## Style 2 — "case file" (v5)
`ali_majdi_whey_v5_case_file.mp4`: same base layer, different look. Desaturated documentary grade, red/white/black,
paper labels, typewriter text, rubber stamps, a receipt graphic, and REC viewfinder framing. Fonts: Lalezar (headlines) and Noto Kufi Arabic (captions).
Tension score at 96 BPM (`style2/music2.py`), with typewriter, stamp and shutter SFX (`style2/sfx2.py`), mixed by `style2/mix2.sh`.
Overlay: `node render.js 0 39.4333 ov2_full.mov overlay2.html`.
