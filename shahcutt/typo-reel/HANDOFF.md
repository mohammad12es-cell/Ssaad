# HANDOFF: typo-reel «۵ اشتباه تایپوگرافی فارسیِ هوش مصنوعی» (series part 3 of 3)

## Status (2026-11-23)
- **v1 built and sent:** `renders/typo-reel-v1.mp4`.
  - 22.5 s, 675 frames, 1080×1920 at 30 fps.
  - −14.4 LUFS, true peak −3.1 dBTP. Cover: `renders/typo-reel-v1-cover.png`.
- **Not published.** That needs Shahin's approval of the video, the caption, the account, regular or Trial, and the AI label.

## Brief
- Shahin uploaded a 7.5 s reference and asked for the next episode of his page in that style («همینقدر نرم و شیک و مینیمال»), using the reanimate skill.
- Part 2's caption and DM promised part 3: «۵ اشتباه تایپوگرافی فارسیِ هوش مصنوعی».
- Motion spec, rounds and verification:
  - `../.reanimate/ref-minimal/spec.md`
  - `../.reanimate/ref-minimal/report.md`

## Structure
| time (s) | beat | device |
|---|---|---|
| 0–4.60 | «هوش مصنوعی / فارسی رو / بلد نیست.» → «ولی تو / فارسی رو / بلدی.» | A: focus pull, glass card, crosses, squares, brush write-on. B: card → check badge, word swap, yellow circle. C1: smear exit |
| 4.60–5.965 | black: «۵ اشتباه تایپوگرافی / فارسی / هوش مصنوعی» | C: hard cut, rotating arcs, slow settle |
| 5.965 + 2.7·k | 5 mistakes: «حروف جدا», «برعکس», «نیم‌فاصله», «ی و ک عربی», «عدد انگلیسی» | A, then the B fix (badge number → check, circle), then the C1 exit |
| 19.47–22.5 | «کامنت کن / تایپ.» + «تا چک‌لیست تایپوگرافی فارسی رو برات بفرستم», bubbles, «قسمت ۳ از ۳» | E |

## Build
- **Studio:** `studio/studio.html` (three.js) → `node studio/render.cjs` → `assets/studio.png`.
  - The still is static, rendered once at 2x and downscaled.
  - It shows an empty black director's chair with «SHAHCUTT» on the backrest, a soft overhead spotlight with a real shadow, a beam and a curtain.
- **Composition:** `index.html` (HyperFrames 0.8.137, GSAP). Every element is written in the HTML; there is one timeline.
- **Fonts:**
  - Abar High Light and Black: licensed, gitignored, copied from `../sound-reel/assets/fonts`.
  - Noto Nastaliq Urdu 700 (OFL): `assets/fonts-ofl`.
- **Sound:** `python3 tools/make_sfx.py` → `assets/audio/mix.wav`.
  - Sound design only, like the reference.
  - The fix chime rises a step each mistake.
- **Render:** `npx --yes hyperframes@0.8.137 render . -o renders/typo-raw.mp4 --quality delivery` (about 1 min).
- **Master:** `LIMIT=0.56 bash tools/deliver.sh renders/typo-raw.mp4 renders/typo-reel-v1.mp4 22.5 assets/audio/mix.wav`.
  - `LIMIT` −5 dBFS keeps AAC overshoot on these sharp transients under −1 dBTP.

## v2 (2026-11-27, Shahin's notes: letters cut, add a voice, use the reference's own sound effects)
- **Text:**
  - Every gradient word lost its dots and tails outside the element box. That is how background-clip text works.
    - `.big`, `#bBig` and `.cta` now have padding (.32em top, .5em bottom) with a matching negative margin; gradient stops are re-mapped.
  - The Nastaliq line used the Urdu final «ی», so «فارسی» read as «فارسید». It is now Mirza Bold (OFL), with the write-on mask ±400 px.
  - Aref Ruqaa was tried and dropped: its flat final «ی» also reads as cut.
  - `tools/clipcheck.cjs` seeks the real timeline and compares every text styled vs unclipped: **0 clipped** in 32 elements.
- **Sound:** `tools/ref_sfx.py` rebuilds the reference's sound design from measurements.
  - Tones: partial tracking (the high C ~1046 Hz with harmonics, E4 336 Hz, 895 Hz, C5 ~525 Hz, the end cluster).
  - Noise: band envelopes every 5.3 ms per channel (14 bands above 150 Hz, 4 below).
  - New oscillators and noise; no samples of the original.
  - Envelope correlation with the reference 0.96-0.996 per band; 90 % of 50-ms windows within 2.5-6.8 dB.
  - `tools/make_sfx.py <ref-rebuilt.wav>` places it by device: hook as is, and per mistake the reference's cut-in (E), morph (B) and exit (C1). The CTA uses the reference's ending; the quiet drone loops underneath.
  - To regenerate, run `ref_sfx.py` on the reference audio (kept outside git) → `assets/audio/ref-rebuilt.wav`.
- **Render:** `renders/typo-reel-v2.mp4`: 22.5 s, 675 frames, −14.7 LUFS (the reference is −14.8), −2.8 dBTP.
- **Voice: blocked.** There is no valid Gemini key in this environment.
  - The script is ready in `vo/script.md` (Puck, 9 lines with start times).
  - Shahin adds the key as a network secret: host generativelanguage.googleapis.com, header x-goog-api-key.

## v3 (2026-11-27): the voice
- **Voice:** Gemini 3.8 Flash TTS, Puck, one take of `vo/script.md` (25.1 s).
  - Whisper (`work/whisper.json`) confirms all 9 lines, word for word.
  - `tools/place_vo.py` finds the 14 speech chunks by loudness and keeps each «number،» with its phrase (0.22 s gap). Lines start at 0.30 / 3.00 / 4.60 / 6.08 / 8.70 / 11.40 / 14.08 / 16.80 / 19.45 s; no overlaps.
  - The reel is now **23.4 s** so the 3.6 s CTA line fits.
- **Mix:** `tools/mix.py`: voice −16 LUFS, the reference sound design −21 LUFS plus a 4 dB duck while he speaks.
  - Run `make_sfx.py assets/audio/ref-rebuilt.wav --total 23.4` first.
- **Master:** `tools/deliver.sh renders/typo-raw.mp4 renders/typo-reel-v3.mp4 23.4 assets/audio/mix.wav`.
  - Result: 702 frames, −14.2 LUFS, −2.5 dBTP.
- **The key is never stored.** It is passed inline as `GEMINI_API_KEY` only.

## Still to do
- Shahin's notes on v1.
- Caption (POST.md) and the ManyChat texts for «تایپ».
  - The CTA promises a Persian typography checklist; it does not exist yet.
- Publishing, only after explicit approval.
