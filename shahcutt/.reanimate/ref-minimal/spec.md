# ref-minimal motion spec

Target: uploaded reference `ref.mp4` (7.54 s, 720x1280, 30 fps), all of it.
Destination: `shahcutt/typo-reel/` (HyperFrames 0.8.137: HTML + GSAP, a three.js still for the spotlight studio), 1080x1920 at 30 fps.
Fidelity: **mixed**.
- The reference's five devices are cloned motion-faithfully: timing ±80 ms, the easing family, order and direction.
- Additions:
  - new copy: @shahcutt series part 3 «۵ اشتباه تایپوگرافی فارسیِ هوش مصنوعی», Persian, RTL
  - an empty director's chair instead of the seated man
  - five mistake beats built from devices A, B and C
  - a CTA built from device E
- The first 5.97 s of the reel follow the reference beat for beat, so they can be compared directly; the CTA is compared against ref 5.97–7.54 s.

Reference capture: `frames.ts --in ref.mp4 --out ref30/frames --fps 30` (+ `ref/frames` at 10 fps for sheets).
- Activity curve: frame-difference script, numbers in the session.
- Sheets: `ref/sheets/*`, `sheets30/{a_intro,b_morph,c_out,d_final}.png`.

## Structure (static, at rest, in % of the frame)
| element | role (ref → clone) | box at rest | notes |
|---|---|---|---|
| studio | seated man under a top spotlight, floor light pool, black falloff → empty director's chair, same light | figure x 38–62 %, y 40–80 %; pool y 78–92 % | static camera |
| glass card | frosted rounded rect behind the type | x 23–77 %, y 6–68 %, radius ≈ 10 % of width | 1 px light border, inner glow; light bar on top edge (x 45–55 %, y 6.5 %) |
| loading squares | 5 yellow rounded squares, row | x 32–68 %, y 33 % | |
| small line | thin white sans ("You're not" → «هوش مصنوعی») | centre, y 22 % | |
| script line | yellow script + small white word ("competing on" → «فارسی رو», Nastaliq) | centre, y 25.5 % | |
| big word | heavy sans, white with a soft vertical gradient; yellow full stop | centre, y 30 %, ≈ 40 % of the width | |
| crosses | 4 yellow crosses: big right of the big word, medium top-left, two small left | | idle rotation |
| cursor | white triangle pointer | enters top-right | |
| badge | small glass rounded square + white check (after the morph) | x 43–57 %, y 9–15 % | |
| circle | yellow hand-drawn loop around the big word | ≈ x 15–85 %, y 18–45 % | |
| black scene | black, faint dot grid, centred type, two white arc brackets | type x 5–75 %, y 36–58 % | |
| bubbles | three outlined thought bubbles, top-left of the final word | | |

## Timeline (t = 0 at the first frame)
| # | element | property | from → to | start ms | duration ms | easing | notes / source |
|---|---|---|---|---|---|---|---|
| A1 | whole frame | blur, scale, brightness | ~30 px, 1.06, dim → 0, 1, 1 | 0 | 700 | ease-out (power3, fitted in rounds 2–4) | activity peak 130 ms, rest by 550 ms (a_intro #0–13) |
| A2 | glass card + light bar | y, opacity | −8 % of height, 0 → 0, 1 | 30 | 500 | ease-out | bar y 5 % → 6.5 % (a_intro #2–16) |
| A3 | crosses | x/y from the frame edges, rotation | off-frame → rest, ±180° | 30 | 370 | ease-out (back) | then idle rotation ≈ 90°/s |
| A4 | loading squares | opacity per square | 0 → 1 | 230 | 70 each | step | 5 squares, stagger 70 ms; fade out 670–870 ms |
| A5 | brush stroke | path draw, right → left | – | 200 | 530 | ease-in-out | white comet tail; reveals the small line 330–500 ms; curls out on the left |
| A6 | big word | blur, scale, opacity | 10 px, 1.15, 0 → 0, 1, 1 | 830 | 200 | ease-out | replaces the squares (#26–30) |
| A7 | script word | write-on (clip), glow | 0 → 100 % | 870 | 330 | ease-in-out | yellow glow fades by 1300 ms |
| B0 | cursor | x, y | top-right → light bar | 1200 | 1700 | ease-in-out | "clicks" at ~2950 |
| B1 | glass card | w, h, y, radius | card → badge | 2900 | 370 | ease-in-out | activity plateau 3100–3270 (b_morph #87–98) |
| B2 | "not" / old small word | blur, opacity | → 8 px, 0 | 3000 | 130 | ease-in | the small line re-centres |
| B3 | big word swap | old: blur out; new: blur 10 → 0, scale 1.3 → 1 | | 3000 / 3130 | 130 / 200 | in / out-expo | |
| B4 | crosses | scale | 1 → 0 | 3000 | 130 | ease-in | |
| B5 | badge check | burst, then the check scales in | 0 → 1 | 3200 | 130 | back-out | |
| B6 | circle | draw-on | 0 → 100 % | 3200 | 250 | ease-out | holds, fades 3600–4000 |
| C1 | small + script lines | x, motion smear (yellow) | 0 → +60 % width | 3930 / 4130 | 530 / 340 | ease-in | staggered 200 ms (c_out #118–134) |
| C2 | whole frame | blur | 0 → 10 px | 4470 | 100 | ease-in | defocus before the cut |
| C3 | — | hard cut to black | | 4600 | 0 | | spike in the activity curve (30.6) |
| C4 | black type group | x, blur | +25 % width, 12 px → 0 | 4600 | 230 | ease-out | rest by 4830 (c_out #138–145) |
| C5 | arcs | rotation | continuous | 4600 | – | linear | slow |
| C6 | black group | slow drift; then blur, scale down | 0 → 6 px, 1 → 0.96 | 4830 / 5730 | 900 / 200 | linear / ease-in | |
| E1 | — | hard cut back to the studio | | 5970 | 0 | | spike 25.2 |
| E2 | whole frame | blur, scale | ~30 px, 1.08 → 0, 1 | 5970 | 450 | ease-out | activity rest ~6550 |
| E3 | small line | blur, opacity | 8 px, 0 → 0, 1 | 6000 | 170 | ease-out | |
| E4 | small line + big word | blur, scale; y | 10 px, 1.2 → 0, 1 (300 ms); y −5 % → 0 (750 ms) | 6000 / 6070 | 300 / 750 | ease-out (power3) | corrected in round 6: the whole block slides down ~100 px at 1080x1920 (d_final #183–198) |
| E5 | bubbles | x, y, opacity | from the top-right → rest | 6000 | 600 | ease-out | stagger ~100 ms |

Trigger: plays from load. Total 7540 ms. Last visible change: ~7000 ms.

## Style facts
- Black #000 with a warm-grey light pool; white #fff; acid yellow ≈ #e6f23a with glow.
- Glass: white 4–6 % fill, 1 px white 14 % border.
- Type: a heavy grotesk for the big word, a light grotesk for the small line, a yellow script for the accent word.
- Clone:
  - Abar High (Shahin's licensed Persian font; Black for the big word, Light for the small line)
  - Noto Nastaliq Urdu (OFL) for the yellow script word, the Persian counterpart of an English script
- Sound: no voice and no music bed. Sound design only, each sound on a device:
  - whoosh 0.6–0.95 s
  - riser into an impact at 3.0 s, with a low tail to 4.0 s
  - whoosh at 4.4 s
  - swish at 5.2 s
  - hit at 5.9 s, then a decaying tail
  - near-silence (−40 dB) between them
  - Integrated −14.8 LUFS.

## Additions
- Copy (Persian, RTL), following the reference's three-line build of small line, script line and big word:
  - **Hook:**
    - «هوش مصنوعی / فارسی رو / بلد نیست.»
    - morph to «ولی تو / فارسی رو / بلدی.»
    - black: «۵ اشتباه تایپوگرافی / فارسی / هوش مصنوعی»
  - **Five mistake beats.** Each is 2.7 s of device A (the wrong form, with crosses), device B (morph to the right form: badge «n» → check, circle) and device C1 (exit):
    1. حروف جدا: «ف‌ا‌ر‌س‌ی» → «فارسی»
    2. برعکس: «تسرد» → «درست»
    3. نیم‌فاصله: «می شه» → «می‌شه»
    4. ی و ک عربی: «شيك» → «شیک»
    5. عدد انگلیسی: «3 روز» → «۳ روز»
  - **CTA (device E):** «کامنت کن / تایپ.», bubbles, «قسمت ۳ از ۳».
- The comparison covers the hook (0–5.97 s) against the reference 0–5.97 s, and the CTA against the reference 5.97–7.54 s. The mistake beats reuse the same tweens; they are checked by their own timings, not against reference pixels.
