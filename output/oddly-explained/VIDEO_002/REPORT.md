# VIDEO 002 — production report

**Why don't you act out your dreams?** · ODDLY EXPLAINED · 30 s · 1080×1920 · 30 fps · 900 frames

## What changed vs. Video 001 (quality upgrades)

| area | Video 001 | Video 002 |
|---|---|---|
| hero asset | procedural brain | **Procedural human body + nervous system** (new `engine/lib/body.js`): an SDF body meshed with surface nets, with SDF-gradient normals. Linear-blend skinning drives a 17-bone skeleton, and nerves follow anatomical routes (spinal cord, brachial/sciatic trunks, intercostals, phrenic, cranial-to-eyes). The same mesh plays the sleeper and the holographic dream runner. |
| motion | none | **Real motion blur.** Three sub-frames per frame over a 180° shutter are accumulated in HDR, then post-processed once (`Post.renderBlurred`). |
| lighting/lens | DOF, bloom | Adds **screen-space volumetric god rays**, **anamorphic highlight streaks** and **split-tone grading**. DOF reads a depth-only pass of the skinned body, so the x-ray figure stays in focus. |
| voice | Kokoro `am_fenrir` | **Blended voice style:** 65% `am_fenrir` + 35% `am_michael`, for a deeper documentary timbre. Whisper transcribed all 6 lines word for word. |
| sound | ambient score | **Cue-locked sound design**, with each cue matching a picture event: the footsteps stop dead on "Your body isn't", the brainstem gate powers up, power-down sweeps follow each limb, ticks land on every eye saccade, breath follows the diaphragm, glitch stutters follow the gate flicker, and hits land on each RBD arm strike. |
| hook | statement title | Two-beat visual contradiction: *"In your dream, you're running."* → *"Your body isn't."* The sound of running cuts out on the second beat. |
| pipeline | — | `--resume` for restart-safe renders. Fail-fast on page errors. Stack traces in logs. |

## Scientific framing

| narration | picture | notes |
|---|---|---|
| You may dream of running while your body lies almost still | Hologram runner above a still sleeper | "Almost": small twitches do occur in REM. |
| In REM, brainstem circuits shut down signals to most muscles | Amber movement signals descend; a cyan gate turns on at the brainstem, and inhibition travels down the cord | The legend explains the colours: amber = movement signal, cyan = inhibition. |
| This temporary paralysis is REM atonia, and it helps stop you acting out dreams | Limb nerves turn from amber to cyan; muscle-tone glow drains | Arms, then legs. The trunk is only partly reduced. |
| Eyes keep darting; breathing muscles keep working | Eyes saccade under closed lids; the diaphragm contracts with each breath, and the phrenic nerve stays amber | The eye and diaphragm regions are never gated. |
| When this system fails, some people act out their dreams | The gate flickers, signals leak through, and the arm strikes out while the leg kicks | Labelled *REM sleep behavior disorder · a diagnosable sleep disorder*. |

Everything is labelled *Stylized visualization · not a medical image*, and the dream is labelled *Artistic interpretation*. No statistics are used.

## QC performed

- **Look-dev sheets.** Four iterations, which found and fixed:
  - DOF blurring the additive body (fixed with a depth-only skinned pass).
  - Hook framing cropping the runner into the title area.
  - The brainstem camera seeing only giant fragments of shoulder. Four candidate angles were compared with a debug camera override, and a head-and-neck profile was chosen.
  - The brain poking out of the skull.
  - Over-bright eyes and blue haze.
- **Motion-blur bugs.**
  - Sub-frames before t = 0 produced negative modulo indexing (`cordY[-1]`).
  - `autoClear` wiped the accumulation, leaving frames at ⅓ brightness.
  - The first design post-processed every sub-frame (10.4 s/frame); it was redesigned to accumulate HDR and post once (~4.8 s/frame).
- **Narration.** Whisper word alignment for subtitle splits. Line timing was tightened (speed 1.02, last line rephrased) when the deeper voice overran the end card.
- **Audio.** Waveform check of every SFX cue against the timeline. Loudness: -14.0 LUFS, -1.5 dBTP.
- **Final files.** `QC_REPORT.json` and a contact sheet of the encoded master.

## Limitations

- **Anatomy.** The body is a stylised mannequin, not an anatomical model. Nerve routes are simplified.
- **Voice.** Still synthetic. A human recording can be dropped into `voice/`.
- **Teaser.** The end-card promise of Part 3 (sleep paralysis) is a creative choice; edit `titles.end_q` in `config.json` to change it.
