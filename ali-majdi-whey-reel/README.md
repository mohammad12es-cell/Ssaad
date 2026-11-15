# Ali Majdi — whey protein reel (v4)

Rebuilt from the original `VID_20261115_162340_546.mp4` + photos (team camp, stage medal, studio / MILADPHOTOO).

Pipeline (`scripts/`):
1. `sub_detect.py` — finds every burned-in subtitle change frame (→ `chunks.json`), used for caption timing and box removal.
2. `captions_src.py` + `words.py` — caption text per chunk, word reveal times from voice energy (→ `captions.json`).
3. `base.py` — 1080x1920 base layer: subtitle-box inpainting, reframing/crops (watermark cropped out), Ken Burns on the photos, punch-in zooms on cuts.
4. `overlay.html` + `render.js` — Vazirmatn motion graphics + kinetic captions rendered frame-by-frame with Playwright (alpha .mov).
5. `music.py` (MIDI → FluidSynth FluidR3_GM) + `sfx.py` (whooshes, booms, 808 sub) + `mix.sh` (voice cleanup, sidechain ducking, -14 LUFS).
6. `comp.sh` — color grade + overlay + audio mux.
