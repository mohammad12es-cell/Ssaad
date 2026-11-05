# Explorer kit

Shared pipeline for the "Explorer's Ledger" English Shorts (episodes ep06 to ep15).

- `lib.js`: the explorer character (`HERO`), supporting cast (`PERSON`), props and GSAP timeline helpers
- `template.html.tpl`: the HyperFrames page; each episode adds its own `scenes.js`
- `build.py <episode_dir>`: Kokoro TTS per line, then the soundtrack mix, `vo/timing.json`, assets and `index.html`

Voice: Kokoro `kokoro-en-v0_19` (speaker 9, bm_george) from the sherpa-onnx GitHub releases; set `KOKORO_DIR`.
