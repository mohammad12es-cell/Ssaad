# TEHRAN — 323 · Cinematic Life Montage

| | |
|---|---|
| Final | `final/TEHRAN_323_cinematic_1080x1920.mp4` (1080×1920, 9:16, 30 fps, H.264 High 4.2 CRF 17, AAC 320k, 41.3 s, −13.9 LUFS) |
| Preview | `preview/TEHRAN_323_preview_540x960.mp4` |
| Timeline / edit config | `project/timeline.json` (every shot, in/out, framing, speed, and the reason it exists) |
| Music | `music/score_original_90bpm_Dminor.wav` (original composition, see below) |

## Story

| Act | Time | Beats | Idea |
|---|---|---|---|
| Opening | 0–5.3 s | 0–8 | A glowing tail-light in the dark. Then the city at night, racking into focus. |
| Development | 5.3–16 s | 8–24 | City traffic headlights match-cut to the car's own headlight. Then the owner, a lone figure in neon, the first rolling reveal, engine detail and a daylight memory. |
| Build | 16–21.3 s | 24–32 | Towering architecture, the city from above, purple cabin glow, POV onto the highway. |
| Peak | 21.3–32 s | 32–48 | On the drop, the night drive under fireworks is speed-ramped into slow motion. After that, faster one-beat cuts. |
| Breakdown | 32–34.7 s | 48–52 | The music falls away over slow-motion golden water, then a dissolve. |
| Ending | 34.7–41.3 s | 52–62 | Autumn nostalgia dissolves to Milad Tower on the final chord, a small "TEHRAN" title, and a fade to black. |

Every cut sits on a beat of the score. Frame boundaries come from cumulative beats, so the sync does not drift.

## Orientation audit
- No source file has rotation metadata.
- The Tehran reference clip is stored sideways in the pixels themselves. Each shot was rendered both clockwise and counter-clockwise and checked (`references/orientation_audit_cw_vs_ccw.jpg`). Counter-clockwise is correct for every shot: the Persian signage reads correctly and people and buildings stand upright.
- The two Mazda videos are upright. They had black bars (letterbox and pillarbox), which were cropped away and not rotated.
- All 9 photos are upright, with no EXIF orientation tag.

## Framing
- Vertical footage and photos are full-bleed, cropped around the subject. Photos get a slow push-in or pan.
- Horizontal footage either gets a cinematic crop around the subject or sits in a 4:5 frame over a blurred, darkened extension of itself. Nothing is stretched.

## Music (asset reference)
This environment blocks royalty-free libraries (Pixabay, FMA, Incompetech, archive.org), and downloading copyrighted music was ruled out. So the score is an **original composition, synthesized from scratch** by `project/score.py`, with no samples and no third-party material. You can use it freely.
- 90 BPM, D minor, i–VI–III–VII (Dm–Bb–F–C), with a piano hook.
- Drone opening → hook and pulse → tom build and riser → full peak with impact → breakdown → resolving final chord.

To swap in a licensed track you own, replace `music/…wav` and keep the 90 BPM grid (or edit `bpm` and `beats` in the timeline), then re-run the build.

## Visual sources
`51667561-TEHRAN…mp4` (reference footage, used upright), `213ceb25-VID…mp4`, `34a8dedc-VID…mp4`, and photos `dd27b8d9`, `4bfaacae`, `127f61aa`, `cbfad1ce`, `d834e0a8`, `c1db9650`, `92134b41`, `92ab6d02`, `92dc5f7d`. The reference clip's own audio is not used.

## Rebuild
```
python3 project/score.py score.wav
python3 project/render.py <uploads_dir> build
python3 project/assemble.py build score.wav final.mp4 preview.mp4
```
