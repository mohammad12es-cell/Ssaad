# HANDOFF: sound-reel «بی‌صدا یا باصدا؟» (series part 2 of 3)

## Status (2026-11-23)
- **v1 built and sent to Shahin:** `renders/sound-reel-v1.mp4`, 32.5 s, 975 frames, 1080×1920 @ 30 fps, −14.1 LUFS, peak −2.8 dBFS.
- **Published 2026-11-23** (regular Reel + AI label): https://www.instagram.com/reel/DgFX0hRHN-w/. The ManyChat texts for «صدا» are in MANYCHAT.md.

## Brief
- Shahin's request: find today's trends, extract the formula for his niche, write the scenario, build it in the style of his reference video, and voice it with Google AI Studio.
- He picked scenario 1 of 3 («بی‌صدا یا باصدا؟»). It is the part 2 his part-1 caption promised.
- Reference: https://cdn.revid.ai/static/claude-motion-graphics/shneural-2103151003272962130.mp4
  - 32 s, music only.
  - Two 15 s takes of one motion brief, each opened by a title card.
  - Cuts every 0.5–1.5 s on the beat.
  - Heavy grotesk type, HUD labels, chrome 3D shapes, dot grids.
  - Lime #caff23 / black / off-white #ecebe5.
- The trend analysis is logged in `../PLAYBOOK.md` §2 (update 2026-11-23) and §8.

## Build
- **VO:** `tools/gen_vo.py`. Gemini 3.8 Flash TTS (the AI Studio model), voice Puck, style prompt and text in `vo/script.md`, one take (26.36 s).
- **Word timings:** Whisper → `vo/whisper-full-raw.json`.
- **Placement:** `tools/place.py`.
  - 12 clips, cut in silence → `assets/audio/vo-placed.wav`.
  - Word onsets on the timeline → `vo/words.json`.
  - Whisper heard «صداهای» as «صدای» and «بفرستم» as «بفرستن» in the last line. Shahin should listen to it.
- **Scenes:** `tools/scenes.json` → `tools/timing.py` → `assets/timing.js`, read by `index.html` and `assets/world.js`.

| Scene | Time (s) |
|---|---|
| hook | 0–2.3 |
| card A | 2.3–4.0 |
| clip A (no SFX) | 4.0–7.75 |
| dead (frozen, grey, «حس نداره، نه؟») | 7.75–8.95 |
| «۳ تا قانون» | 8.95–9.9 |
| rule 1: whoosh / click / boom on their words | 9.9–15.6 |
| rule 2: silence 18.45–19.0, hit at 19.0 | 15.6–19.6 |
| rule 3: meters from the real audio | 19.6–23.0 |
| card B | 23.0–25.0 |
| clip B (full SFX) | 25.0–28.75 |
| CTA «صدا», loop-out from 31.95 | 28.75–32.5 |

- **Audio:**
  - `tools/make_music.py`: 120 BPM, Am F C G, sections by scene.
    - tape-stop on «dead»
    - riser into total silence, then the drop
    - clip B gets an exact copy of clip A's music
  - `tools/mix_sfx.py`: the clip's sound design plays only in clip B.
  - `tools/mix_full.py -7 -3`: SFX −7 dB, music −3 dB, both ducked under the voice.
  - `tools/meters.py` → `assets/meters.js` (per-frame voice, ducked music and mix levels).
- **3D:** `assets/world.js` (Three.js r170).
  - Chrome torus knot, lime-chrome star and ring, burst shards at the hit.
  - Three PMREM studios: dark-with-lime for lime scenes, dark, and light.
- **Render:** `npx --yes hyperframes@0.8.137 render . -o renders/full-raw.mp4 --quality delivery` (2 min 49 s).
- **Master:** `bash tools/deliver.sh renders/full-raw.mp4 renders/sound-reel-v1.mp4 32.5 assets/audio/mix-full.wav`.
  - `deliver.sh` now pads the audio and cuts with `-t`, not `-shortest`. `-shortest` dropped 4 frames.
- **Fonts:** Abar High and Superline are licensed and stay out of git. JetBrains Mono (OFL) is in `assets/fonts-ofl/`.

## Still to do
- Shahin's notes on v1.
- The «صدا» freebie (the reel's sound list with timing and levels + the 3 rules) and its ManyChat texts.
- Publishing, only after his explicit approval of the video, caption, account, regular-or-Trial choice and AI label.
