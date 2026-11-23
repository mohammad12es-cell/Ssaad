# VERIFY: IRAM CO. «بلک فرایدی در ارمنستان» talking-head edit (v1, 2026-11-23)

## Source
`taher_iramco.mp4`:
- 22.36 s, 2160x3840 H.264 at 29.97 fps, AAC 48 kHz stereo, −16.4 LUFS.
- One continuous talk, recorded on a lav mic (noise floor about −49 dB between words). There are no pauses to cut and no flubs.
- The camera moves from a square with a fountain to a park, through a 1.4 s crossfade baked into the source (12.55–13.95 s, measured by fitting each frame as a blend of a 12.3 s and a 14.0 s frame).

## Edit decisions
- **No silence or mistake cuts.** The take is tight. Whisper large-v3 found 60 words and no repeats.
- **Crossfade removed.** The video cuts at 12.6 s and resumes from source 13.9 s, so the double image never shows.
  - The gap is covered by a full-screen IRAM interstitial: the gold HOTEL key card taps a lock, a green light comes on, and «رزرو شد» appears.
  - It opens from the booking card and closes with a gold light sweep.
  - The voice and captions run on underneath, so nothing he says is lost.
- **Captions** (Persian, word by word, IRAM style): Vazirmatn 900 at 60 px, y ≈ 1150; the current word sits on a gold pill.
  - Spelling follows standard Persian where the speech is colloquial or accented: «هوتل» → «هتل», «ریزرف» → «رزرو», «بلاک فرایده‌ای» → «بلک فرایدی».
- **Graphics on his words:**

| Time | Words | Graphic |
|---|---|---|
| 1.3 s | «ارمنستان» | dotted flight arc, ARMENIA |
| 4.0 s | «بلک فرایدی» | black and gold BLACK FRIDAY tag swings in, camera punch-in |
| 7.0–8.6 s | «ظرفیت هتل‌ها تکمیل» | hotel capacity bar fills and turns red, «تکمیل!» stamp |
| 9.1 s | — | «رزرو هتل / قبل از تکمیل ظرفیت» card |
| 12.4–13.9 s | — | key-card interstitial |
| 14.0 s | — | clock + «تا دیر نشده» |
| 17.4–21.8 s | «تور», «ارسال» | comment box types «تور», «اطلاعات سفر» DM chip, a paper plane flies to it |
| 22.05 s | — | end card in IRAM house style: cream fog, logo, IRAMCO.ORG, «کامنت کن تور» |

- **Brand:**
  - Stacked IRAM logo top-right while he speaks, as in IRAM's own reels.
  - Palette: forest green, metallic gold, cream.
  - The logo PNG's grey halo was cleaned for the cream end card (`assets/iram-logo-clean.png`).
- **Colour grade and cinematic lighting** (`tools/cinegrade.py`, baked into `assets/media/taher-graded.mp4`):
  - MODNet person matte, keeping only the presenter, smoothed over time.
  - Background: −0.7 EV, cooler, slightly desaturated, soft defocus (normalised convolution, so his edges don't halo).
  - Him: warm key light on the head from frame-left, cool rim on the far edge, +6 % saturation.
  - Whole frame: filmic S-curve, emerald shadows / gold highlights (IRAM palette), vignette, lifted blacks (never crushed).
  - Before/after sheet: `grade_before_after.jpg`.
- **Sound:**
  - His own lav voice: high-pass 85 Hz, light denoise, −2 dB at 300 Hz, +2.5 dB at 3.5 kHz, light de-ess, 3:1 compression.
  - IRAM house music kit: Karplus-Strong plucks over an A drone; the doum-tek groove enters on «بلک فرایدی»; closing chord on the logo. About 16 dB under the voice and ducked.
  - One effect per graphic.
  - Mastered to −14 LUFS, true peak ≤ −1.5 dBTP.

## Checks
- `hyperframes lint`: 0 errors. Two warnings, both intended: the logo icon is used twice, and the caption pill's `z-index: -1` sits inside an isolated stacking context.
- Snapshots of every graphic, the interstitial in and out, and the end card were checked:
  - no overlap of graphics with his face after the fixes (the ARMENIA title and the BLACK FRIDAY tag were moved up and left)
  - captions legible
  - nothing outside the safe area
- Render (`hyperframes render --quality delivery`, exit 0) + master (`tools/deliver.sh`):
  - `renders/iram-taher-v1.mp4`: 1080x1920, 24.6 s, 738 frames, H.264 at 5.1 Mbps
  - audio: −14.1 LUFS integrated, LRA 0.9 LU, sample peak −3.0 dBFS
- Frames at 12.5, 13.0, 13.6, 13.9, 14.0, 14.6 and 15.5 s were checked: the interstitial opens over the first shot and slides up to show the park.
  - There is no black frame and no source crossfade ghost.
  - The caption lines hand over without overlapping (14.3–14.7 s checked frame by frame).
- Cover: `renders/iram-taher-v1-cover.jpg` (4.6 s: BLACK FRIDAY tag + «بلک فرایدی»).

## Limitations
- The matte follows the person, not a face model. When he turns, the key light follows the head blob, not his actual eyes.
- The lighting is relit from the existing image, so it cannot create real shadows.
- His name and role are not on screen. The file name says "taher", but nothing confirms his full name or title.
- IRAMCO.ORG comes from IRAM's earlier film; check it is still current.
