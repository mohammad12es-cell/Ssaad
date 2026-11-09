# ODDLY EXPLAINED — Episode 002: Mars Isn't Dead

YouTube Short · 1080×1920 · 30 fps · 48.6 s · H.264 + AAC → `output/oddly_explained_ep002.mp4`

Same pipeline as Episode 001 (Kokoro TTS → synthesized SFX → Remotion/Three.js → FFmpeg mix), plus:
- **Word-level animated captions.** `scripts/tts.py` estimates word timings from phoneme lengths and anchors them to the pauses it detects in the audio at punctuation (Whisper weights can't be downloaded in this environment).
- **Continuous camera.** One shot runs from the Mars approach through the orbiter follow to the Alba Mons orbital view. Scenes are joined by a zoom-through, whip pans, an iris, a ground-line wipe and a vertical push, not plain fades.
- **Evidence language.** Solid ivory = **observed** (HCl above fissures). Dashed blue = **inferred / visualization** (magma, subsurface water, microbes).
- **No duplicate text.** Headlines never repeat the narration; captions carry the narration.

```bash
npm install && npm run build   # sfx → silent render → ffmpeg mix
```

## Science check (2026-11-09)
- Mège et al., *Science Advances* (2026). Hydrogen chloride was measured by the ESA–Roscosmos ExoMars **Trace Gas Orbiter** (ACS spectrometer) above fresh, narrow fissures imaged by its CaSSIS camera on **Alba Mons** (~40.5°N, 109.6°W). The detection was made during aphelion season.
- Interpretation: most likely volcanic seepage from magmatic bodies at depth. **No new lava flow or eruption has been observed.**
- HCl is not a biosignature. The study doesn't show liquid water or a habitable environment. The life scene is explicitly hypothetical.
- Narration changes from the brief: "a mysterious volcanic gas" became "a mysterious gas linked to volcanoes", because HCl isn't only volcanic. "Mars' enormous volcanic regions" became "the enormous volcanic regions of Mars" for clean TTS pronunciation.
