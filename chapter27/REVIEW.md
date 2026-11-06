# CHAPTER 27 — Review / delivery note

## What was built
A 100 s, 1920×1080, 24 fps cinematic birthday film in HyperFrames, seven scenes (one sub-composition
each, `compositions/s1…s7`) plus a `finish` layer (film grain re-seeded per frame, vignette, 2.39:1
letterbox). The story follows the brief exactly; no alternative storylines were built.

| # | Time | Scene | How it's made |
|---|------|-------|---------------|
| 1 | 0–13 | The Beginning | Gold line of light → light sweep across **reference photo 1** (graded with `media-treatment`) → "15 ABAN 1378 / A STORY BEGINS." |
| 2 | 13–26 | The Dreamer | Drawn dusk landscape, 3-layer parallax dolly, the boy (protagonist rig at child proportions) on a rock; push into the sun |
| 3 | 26–42 | The Warrior | Drawn arena, one flood light, dust; wide dribble → slow-mo **left-arm** spike → ball hits the floor |
| 4 | 42–55 | The Silence | Lights cut one by one, ball rolls to rest, he walks away into the door light; door closes |
| 5 | 55–68 | The Return | Door opens, he walks back in, light banks slam on, full-speed spike with camera shake |
| 6 | 68–84 | The Search | Gold line-art: independence · build · create (AI, his face in a film frame) · beyond → **reference photo 2** |
| 7 | 84–100 | Chapter 27 | Silhouette (photo-1 matte) against sunrise, camera forward, his real face revealed, final title |

## Identity
- Your real photographs are the only faces in the film: photo 1 (scenes 1, 6, 7) and photo 2 (scene 6).
  They are shown at their native aspect ratio (never stretched), graded for warmth/contrast only — no
  smoothing, no beauty filter, no face changes. Cutouts were made with `hyperframes remove-background`.
- Photo 2 had EXIF rotation; an upright copy is `assets/reference/ref-02-body-upright.jpg`. Originals untouched.
- Drawn scenes use a backlit silhouette rig (`assets/lib/figure.js`) with your curly-top hair shape and a
  lean build; he spikes with the **left** arm. No AI-generated footage was rendered (none was approved).

## Placeholders (to replace)
- **Music:** `assets/audio/score-placeholder.wav` is a procedurally generated temp score
  (`scripts/make_audio.py`). Swap the `src` of `#score` in `index.html` for a licensed track; the
  ducking under the voice stays.
- **Persian voiceover:** 7 silent slots `assets/audio/vo/vo-01…07.wav`, timed per scene. Script and
  timings in `VOICEOVER.md` (Persian text included). Record, overwrite the files, re-render.
- **AI footage (optional):** any drawn scene can be swapped for approved generated footage by adding a
  `<video>` in that scene file; your reference photos are in `assets/reference/` for guidance.

## Measured vs. looked at
- `npx hyperframes check`: passes (0 errors). Warnings kept on purpose:
  `first_frame_empty` (the film opens on black by design), `audio_clip_silent` ×7 (VO placeholders).
- Every scene and every seam was snapshotted and looked at (contact sheets, seams ±0.2 s).
- Audio was **measured, not heard**: score file −13.6 LUFS / −1.0 dBTP; final mix (silent VO slots)
  −20.3 LUFS integrated, −2.6 dBTP peak. That leaves room for the narration; after adding the voice, aim
  for about −14 LUFS for YouTube (`npx hyperframes normalize-audio`).

## Outputs
- `renders/chapter-27.mp4`: master, 531 MB, CRF 15 (ignored by git, re-create with `npm run render -- --fps 24 --quality delivery`).
- `../output/chapter-27.mp4`: YouTube upload copy, 47 MB, H.264 CRF 23 tune=grain, AAC 192k, faststart.

## Weakest shot / next steps
- Scene 6 finale: photo 2 is a lit selfie (elevator ceiling shows faintly through the curls); it reads as
  "him today" but is less integrated than the drawn scenes. A photo shot against a dark wall would fix it.
- The silhouette rig is stylised; real or approved AI footage of you playing would raise scenes 3–5 most.
- The temp score is functional, not cinematic — a licensed track is the single biggest upgrade.
