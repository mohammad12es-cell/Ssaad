# VIDEO 001 — production report

**What happens when you fall asleep?** · ODDLY EXPLAINED · 30 s · 1080×1920 · 30 fps · 900 frames

## Tools actually used

| stage | tool | notes |
|---|---|---|
| 3D | **Three.js r170** (vendored), custom GLSL shaders | All geometry is procedural and seeded. No models, textures or stock footage. |
| frame rendering | **Playwright + headless Chromium**, WebGL2 on **SwiftShader** (CPU) | The container has no GPU; the render took ~2.6 s per 1080×1920 frame with 3 workers. |
| post | own chain (`engine/lib/post.js`) + Three's UnrealBloomPass | 4× MSAA HDR, depth-based DOF with signed CoC, bloom, ACES, CA, zoom blur, grain, fades |
| text / subtitles | HTML/CSS layer rendered with transparency in Chromium | Chromium's shaping gives correct Persian joining, ZWNJ and bidi. Fonts: Montserrat, Inter, Vazirmatn (OFL). |
| narration | **Kokoro-82M** (open weights, Apache-2.0) via `kokoro-onnx`, voice `am_fenrir`, natural speed | Runs locally on CPU; no paid API. |
| subtitle timing | **faster-whisper small.en** word timestamps | Also serves as an intelligibility check: the transcript matched the script word for word, and "NREM" was recognised. |
| score / SFX | numpy synthesis (`engine/synth.py`, `sound.py`) | Impacts, crackle, risers, plucks, pads, FM bells, FFT reverb. No samples. |
| mix / master / encode | **FFmpeg 6.1** | Voice EQ/compression, sidechain ducking, two-pass loudnorm to -14 LUFS / -1.5 dBTP, libx264 CRF 16, AAC 256k |

**Not used, and why.**

- **React + Remotion.** The timeline is a pure `t → state` function inside one page per layer. That gives the same frame-exact determinism without a bundler, Remotion's license terms or the Chrome headless-shell download.
- **Android-specific tooling.** This ran in a cloud Linux container, not on a phone.

## Scientific framing

| claim in narration | how the picture treats it |
|---|---|
| Brain activity changes in coordinated stages; it doesn't "switch off" | Activity never stops in any shot; the hook title says so explicitly. |
| NREM brain-wave patterns change across stages | Stylised EEG-like trace progresses N1 (low-amplitude mixed/theta) → N2 (sleep spindles + a K-complex) → N3 (high-amplitude slow waves). The neuron field shows synchronised up/down waves. Labelled *Stylized EEG-like trace*, time axis compressed. |
| REM activity is more wake-like; vivid dreams are especially common | Trace becomes low-amplitude and mixed-frequency; neurons switch to desynchronised fast activity. The narration says dreams are *especially common* in REM, not exclusive to it. |
| Sleep supports memory processing and learning | Memory vignettes settling into a linked lattice, labelled *Visual metaphor*. |

- **Dream imagery** (island, melting clock, distant figure, colour forms) has a distinct holographic, dissolving look and the label *Artistic interpretation of dream imagery*.
- **The microscopic and brain scenes** carry *Stylized visualization · not a brain recording*.
- **No numbers** are stated anywhere. Stage percentages, wave frequencies and durations are deliberately omitted.

## Quality control actually performed

1. **Look-dev contact sheets** at ⅓ and full resolution, across 6 iterations. Issues found and fixed:
   - DOF blurred everything (foreground-bleed term mixed in the background's CoC).
   - Cortex folds looked like fingerprints (fixed with two-octave domain-warped folds).
   - Cerebellar folia fanned out radially instead of running parallel.
   - Washed-out NREM glow; faceted somas (flat normals).
   - Additive objects not writing depth, so DOF blurred them.
   - Hero neurons outside the narrow 9:16 frame.
   - Amber→cyan transition passing through grey (now a per-cell cascade).
   - Over-long white flashes at transitions; cracked dream blobs (unwelded vertices).
2. **Pass isolation** (with/without post, shafts, motes, backdrop) to find what caused the grey entry transition.
3. **Narration**: Whisper transcription of the rendered narration, plus word-aligned subtitle split points (one split had been 0.4 s off with silence detection alone).
4. **Subtitles**: programmatic check for overlapping cues (one 60 ms overlap per split was found and fixed) and minimum cue duration (0.96 s).
5. **Audio**: spectrogram and waveform inspection, plus per-stem band analysis. A suspected 1.1 kHz whine was traced and ruled out (a display artifact plus voice formants). Sub-audible 27 Hz energy was found and high-passed.
6. **Full-resolution render review.** Contact sheets every 15th frame of the 900-frame render found a square-edged glow behind the distant figure, and a hard-edged HUD panel at 9–21 s. Both were isolated with post on/off/DOF/bloom passes, fixed (radial falloff reaching zero, horizontally feathered panel), and frames 277–630 were re-rendered.
   - Reversed-edge `smoothstep` calls (undefined in GLSL) were found in other shaders. Their output was verified visually under SwiftShader, so they were left unchanged to avoid a full re-render. Fix them before rendering on other GPUs.
7. **Final files**: `QC_REPORT.json` (ffprobe-counted frames, resolution, fps, EBU R128 loudness, true peak, black-segment detection) and a contact sheet of the encoded EN master.

## Known limitations / next steps

- **Voice.** Kokoro is good but still synthetic. For a flagship release, record a human voice: drop files into `voice/` and the pipeline re-times everything.
- **Render speed.** It is CPU-only. On a machine with a GPU, the same command renders several times faster.
- **Brain anatomy.** The brain is procedurally *plausible*, not atlas-accurate: noise-generated gyri plus hand-placed major fissures.
