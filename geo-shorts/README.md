# Geo Shorts — Persian geography facts (9:16)

Ten vertical YouTube Shorts in Persian. Each one uses real satellite imagery, a 3D globe camera,
ground-locked motion graphics, offline Persian narration, and a procedural music bed.

| # | File | Topic |
|---|------|-------|
| 1 | `01-diomede-islands.mp4` | جزیرهٔ فردا و دیروز (دیومید) |
| 2 | `02-greenland-vs-africa.mp4` | دروغ نقشه‌ها: گرینلند و آفریقا |
| 3 | `03-lut-desert.mp4` | دشت لوت، داغ‌ترین سطح زمین |
| 4 | `04-point-nemo.mp4` | پوینت نمو، تنهاترین نقطهٔ اقیانوس |
| 5 | `05-bir-tawil.mp4` | بیر طویل، سرزمین بی‌صاحب |
| 6 | `06-everest-vs-chimborazo.mp4` | اورست یا چیمبورازو؟ |
| 7 | `07-france-time-zones.mp4` | فرانسه و ۱۲ منطقهٔ زمانی |
| 8 | `08-caspian-sea.mp4` | خزر، بزرگ‌ترین دریاچهٔ جهان |
| 9 | `09-lake-baikal.mp4` | بایکال، یک‌پنجم آب شیرین جهان |
| 10 | `10-dead-sea.mp4` | دریای مرده، پایین‌ترین نقطهٔ خشکی |

Titles, descriptions and hashtags are in `META.md`.

## How it works

- `src/engine.py`: a ray-traced spherical Earth. Each pixel's ray gives a lat/lon, which samples the finest imagery
  layer that covers it, plus atmosphere, haze and a cinematic grade.
- `src/layers.py` builds the imagery layers:
  - NASA Blue Marble with relief shading for the whole planet.
  - AWS Terrarium DEM hillshade for regional relief.
  - Real Sentinel-2 L2A true-colour mosaics from the AWS open-data bucket. Clear scenes are chosen automatically and
    gaps between orbit swaths are filled.
- `src/overlay.py`: glowing outlines, markers, arrows and Persian typography (Vazirmatn, RAQM shaping).
- `src/audio.py`: Piper `fa_IR-ganji` voice (offline), pitched down a little, plus generated music with impacts.
- `src/video.py`: times each scene from the narration, renders with 4 worker processes, and muxes the audio
  loudness-normalised to −14 LUFS.
- `videos/vNN_*.py`: one story per file, with the narration, camera keyframes and graphics.

```bash
python3 src/video.py v10_deadsea --preview 2,10,20,30   # contact sheet
python3 src/video.py v10_deadsea                        # full render -> out/10-dead-sea.mp4
```

Data credits: Copernicus Sentinel-2 (ESA), NASA Blue Marble, Natural Earth, Mapzen/AWS Terrain Tiles,
Vazirmatn font (OFL), Piper TTS voices.
