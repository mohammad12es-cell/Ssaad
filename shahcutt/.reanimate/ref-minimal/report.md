# ref-minimal → typo-reel: verification report

**Fidelity: mixed.**
- The reference's five devices are cloned motion-faithfully. They are timed beat for beat in the hook (0–5.97 s) and the CTA (19.47 s on).
- The new parts are:
  - Persian copy for @shahcutt part 3
  - the empty director's chair instead of the seated man
  - five mistake beats built from devices A, B and C

**Reference:** Shahin's upload (7.54 s, 720x1280, 30 fps), read at 30 fps (`ref30/frames`).

**Clone:** `shahcutt/typo-reel/renders/typo-reel-v1.mp4` (22.5 s, 1080x1920, 30 fps), captured the same way (`frames.ts --fps 30`).

**How it was checked:**
- `compare.ts` on frame sets clipped to matching windows (`seg/`, `--offset 0`) and `sheet.ts compare`.
- `events.py`: the activity curve of each section, its correlation, the biggest single-frame change, the smoothed peak, and the motion windows.
- Pixel mismatch is not a criterion here (different copy and subject by design). It is reported only as a trend.

## Rounds
| round | change | result |
|---|---|---|
| 1 | first build from spec.md | cut at 4.600 s on the exact frame; intro, black and CTA settle too fast (front-loaded expo) |
| 2 | focus pulls power3.out 0.6 s; black group x over 1.0 s expo.out; stronger smear | black corr 0.66 → 0.97; CTA 0.92 → 0.95 |
| 3 | new word settles in 0.35 s power3.out; card morph 0.45 s; intro pull 0.7 s | morph corr 0.79 → 0.86 |
| 4 | first frame after black dark and soft; longer CTA settle; bigger crosses; brighter glass | intro corr 0.95 |
| 5 | cut back at 5.965 s (ref frame 179); dim only after black; master limiter −5 dBFS | hook `compare.ts` **PASS** |
| 6 | E4 measured again: the CTA block slides ~5 % of the height over 0.75 s (spec said 2 %) | CTA corr 0.99 |
| 7 | bubbles drift 1.25 s | no change in `compare.ts` (too small at 720 px) |
| 8 | CTA scale settles over 1.3 s (the ref's whole spotlight area is still settling 6.6–7.2 s) | CTA end −500 → −233 ms |

## Last round (8)
| section / spec rows | timing (`compare.ts`: start / end / dur) | activity curve (corr, biggest frame, smoothed peak) | result |
|---|---|---|---|
| hook 0–5.97 s (A1–C6) | +0.067 / 0.000 / −0.067 s | – | **pass** (limit 0.08 s) |
| intro 0–1.5 s (A1–A7) | – | 0.95; 0 ms; +33 ms | pass |
| morph 2.6–3.9 s (B0–B6) | – | 0.85; −100 ms; −33 ms | pass on peak; see residual 1 |
| black 4.62–5.92 s (C4–C6) | – | 0.97; +33 ms; 0 ms | pass |
| hard cuts 4.600 / 5.965 s (C3, E1) | same frame as the ref | – | pass |
| CTA 19.47 s + 1.4 s (E1–E5) | 0.000 / −0.233 / −0.233 s; peak −0.1 s | 0.99; 0 ms; +33 ms | **fails `compare.ts` end and peak**, see residual 2 |

Sheets:
- `compare-8-hook/sheets/compare-01..06.png`
- `compare-8-cta/sheets/compare-01..02.png`
- section curves in `clone-8/events.md`

## Residuals
1. **Morph window narrower** (motion > 35 % of max: ref 2.90–3.47 s, clone 3.03–3.30 s).
   - Every element starts on its spec time: card 2.90, swap 3.00/3.13, check and circle 3.20.
   - The reference's glass card shrinks over a lit man, which changes many pixels; ours shrinks over a dark background. The difference is in how much shows, not when.
2. **CTA end of motion −233 ms, peak −100 ms** (`compare.ts`).
   - The reference keeps settling until 1.23 s after the cut: the whole spotlight area, in a camera-compressed video, plus slow bubble drift.
   - Ours settles by 1.0 s. The last sub-pixel scale steps of a clean render stay under `compare.ts`'s pixel threshold at 720 px.
   - `compare.ts` puts our peak on the cut frame, because we cut from the studio rather than from black. The section's activity curve matches the reference closely: corr 0.99, biggest change on the same frame.
   - Thresholds were not relaxed. A ninth round could add a slow push over the whole CTA hold if the end metric matters.
