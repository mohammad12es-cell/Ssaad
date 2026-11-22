# frame.md: design spec for «اینو Claude ساخت»

## Canvas and delivery
- 1080×1920, 30 fps, 900 frames (30.0 s).
- Safe zone: text between x 96–984 and y 190–1460. The Reels UI covers the bottom ~420 px and the right-hand icon strip.
- Master: −14 LUFS, −1.5 dBTP, H.264 CRF 19, ≤7 Mbps (`vision-kinetic/tools/deliver.sh`).
- Real motion blur on the whip (beat 6) and on fast landings: render `--fps 240`, then `vision-kinetic/tools/shutter.sh` (180° shutter).

## Palette
| Role | Hex |
|---|---|
| Paper | `#d9d8d4` |
| Ink | `#0c0c0c` |
| Off-white (on black) | `#f2f1ed` |
| Red accent | `#c8102e` (on black `#e5243b`) |
| Green | `#0b5a40` |
| Mint highlight box | `#9ef0c8` |
| v1 white | `#ffffff` |

Grain + vignette on every scene except v1. Never change colour inside a word.

## Type
- **AbarHigh** (Regular → Black) for Persian; **Superline Italic** for «Claude». Both licensed: copy into `assets/fonts/`, never commit.
- **Tahoma** only for the broken v1.
- Rules: word-by-word animation, no `dir=rtl` on `<html>`, `font-synthesis: none`, line-height 1.25–1.4, lines ≤840 px centred by ink (`jobs-reel/tools/measure_lines.cjs`), `@font-face` with `font-display: block`, root-relative `assets/...`, GSAP vendored, Persian ی/ک, vertical bar next to Persian digits.

## Motion vocabulary (from vision-kinetic)
- Focus-pull landings: blur → sharp, scale 1.14 → 1, on a spring with overshoot.
- Hand-held camera: slow drift, short shake on landings, lean toward each new line.
- Transitions: whip (with real blur), circle wipe, tape rewind.
- Nothing is ever static.

## v1 (deliberately bad, beat 2–3)
White background, Tahoma, centred, linear motion, static camera, per-letter inline-block that breaks the letter joins, no sound, no grain. The sudden silence is the point.

## Audio plan
- Narrator: **Puck** (Gemini 3.8 Flash TTS, Google AI Studio), approved 2026-11-22; script and beat targets in `vo/script.md`.
- Reuse vision-kinetic SFX: `whoosh-dark`, `boom`, `focus-click`, `glint`, `swell`, `morph-swell`, `smash`, `ballwhoosh-rev`.
- ~10 new SFX (snap, thump, rewind, riser, REC beep…) and one music bed (decision 7: minimal electronic, drop at 22.0 s).
- Music ~15–20 dB under the voice, sidechain-ducked like the SFX (HANDOFF step 4).
- Low-pass any SFX that sits mostly above 5 kHz.
