# ROYAGRAM — "Ordinary Is Boring" (Instagram Reel)

| Deliverable | Path |
|---|---|
| Final Reel (1080×1920, 24 fps, 25 s, H.264 + AAC) | `final/ROYAGRAM_Ordinary-Is-Boring_Reel_1080x1920_24fps.mp4` |
| Thumbnail (frame grab, 9:16) + 4:5 grid crop | `final/thumbnail_1080x1920.jpg`, `final/thumbnail_grid_1080x1350.jpg` |
| Cover image (designed, 9:16) | `final/cover_1080x1920.jpg` |
| Sound design: master mix + stems | `audio/` |
| Project source (3D film, renderer, audio, assembly) | `source/` |
| Shot plan | `docs/SHOT_PLAN.md` |
| Production report (tools, settings, limitations, QC) | `docs/PRODUCTION_REPORT.md` |

## Rebuild from source
```bash
cd royagram/ordinary-is-boring
node source/render.mjs /path/to/frames 0 600        # 600 PNG frames (headless Chromium, WebGL2)
python3 source/audio/build_audio.py audio            # stems + mix_master.wav
bash source/assemble.sh /path/to/frames              # final MP4
```
Requirements: Node 18+, Playwright with Chromium, Python 3 with NumPy and SciPy, and FFmpeg with libx264.
