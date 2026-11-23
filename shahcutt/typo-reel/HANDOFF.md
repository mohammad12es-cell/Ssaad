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

## Still to do
- Shahin's notes on v1.
- Caption (POST.md) and the ManyChat texts for «تایپ».
  - The CTA promises a Persian typography checklist; it does not exist yet.
- Publishing, only after explicit approval.
