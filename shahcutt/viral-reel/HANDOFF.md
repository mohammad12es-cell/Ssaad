# HANDOFF: viral-reel «اینو Claude ساخت»

## Status (2026-11-22)
- Research, analysis and 3 scenarios are done. Shahin picked Scenario 1.
- The storyboard is published as a private Artifact: https://claude.ai/artifact/6XT2iCuWTUEybdEyMp2uRH (source `storyboard.html`).
- **His decisions** (he accepted every recommended option):

  | Decision | Choice |
  |---|---|
  | Account | shahcutt |
  | Name on screen | Claude |
  | Freebie | «پرامپت فارسی + چک‌لیست PDF» (never the persian-video-studio skill) |
  | Comment replies | ManyChat auto-DM |
  | Voice | **Puck** (Gemini 3.8 Flash TTS, Google AI Studio), approved |
  | Trial Reel | yes, Hook B |
  | Music | minimal electronic with a drop |

- **7 s animated sample** (beats 1–3: hook → tape rewind → raw v1 → «ساخت. کلمه به کلمه، نه حرف به حرف»), 0 credits.
  - No music in the sample; it comes in the full build. SFX are reused from `vision-kinetic/`.
  - Strike fixed: «نه» sits outside `.inner`, so the red line covers only «حرف به حرف» (checked on frame 6.9 s).
  - Mastered and sent: `renders/viral-reel-sample.mp4`, 7.000 s, 6.67 Mbps, I −14.2 LUFS, TP −1.8 dBFS, LRA 5.4.
  - Then voiced with Puck: `renders/viral-reel-sample-vo.mp4` (details at the bottom). Sent.
- **«Approved, build it» (2026-11-22):** the full 30 s v1 was built in the cloud session (claude.ai/code, repo `mohammad12es-cell/Ssaad`, folder `shahcutt/viral-reel/`). See «Full build v1» at the bottom.
- Credits spent: 0 (ElevenLabs untouched; AI Studio is free on his PRO sign-in).
- Moved from session `local_acada1bd…` (131k context) to a 1M-context session on 2026-11-22. Only one session works on these files at a time.

## Files
- `index.html`: the 7 s sample (HyperFrames 0.8.137, GSAP timeline `main`).
  - Layers: `#sA` (hook, paper) → `#sv1` (white, raw v1 with per-letter spans, broken joins on purpose) → `#sB` (circle wipe, «ساخت.» + strike).
  - Helpers `land()` (focus-pull spring) and `shake()`; seeded RNGs.
- `tools/mix_sfx.py`: pre-mixes the SFX cues into `assets/audio/sfx-mix.wav` (7 s, 48 kHz). Group A is cut hard at 3.89 s so v1 plays in silence. Each cue is padded to full length (`apad` + `atrim`), otherwise amix stops at the first input.
- `tools/deliver.sh [raw] [out] [dur] [audio]`: iterated static gain → 192 kHz `alimiter` at −3 dBFS (AAC overshoots ~1 dB) until I ≈ −14 LUFS, H.264 CRF 19 maxrate 6.6M (+192k AAC ≤7 Mbps), 30 fps.
  - loudnorm was dropped: transient SFX peaks kept it at −15.1 LUFS and the AAC peak landed at −1.2 dBFS.
- `renders/sample-raw.mp4` → `renders/viral-reel-sample.mp4`.
- `BRIEF.md`, `frame.md`, `storyboard.md` / `storyboard.html`.

## Next: full 30 s build (approved, start at step 1)
1. **Full Puck VO in AI Studio** (Claude in Chrome, his real Chrome, PRO sign-in; open a new tab, close it after).
   - `https://aistudio.google.com/generate-speech` → "Create new dialog" → single speaker, voice **Puck** → paste the style instructions and the 13-line text from `vo/script.md` → Run → download.
   - **Never** click "Create new voice" (Voice Design, paid), never open the full voice list, never add an API key ("No API key selected" is fine).
   - Copy the newest `%USERPROFILE%\Downloads\Generated Audio *.wav` to `assets/audio/vo-full.wav` (24 kHz mono).
   - If lines 1–4 sound worse than the approved sample, splice them from `assets/audio/vo-gemini.wav` (cut in silence, 5 ms fades, match gain).
   - Generate once; don't re-run to retry. Shahin judges accent and tone himself.
2. **Whisper word timings:** `~/.persian-video-studio/whisper-venv/Scripts/python.exe ~/.claude/skills/persian-video-studio/scripts/timing/whisper_words.py` (cuda; output is a JSON list of `{"w","s","e","p"}`) → `vo/whisper-full.json`. Check every word against the script.
3. **Place the lines:** generalize `tools/mix_vo.py` to `DUR = 30.0` and one CLIP per line, landing on the targets in `vo/script.md` (keep 4.2–4.95 s silent for the raw v1). atempo ≤1.08 if a line runs long.
4. **Music:** minimal electronic, riser from ~21 s, the **drop at 22.0 s** (beat 7, «هوش مصنوعی ابزاره»), ending on a loop-able tail at 30 s.
   - Google AI Studio music (Lyria) only if it's free on his PRO sign-in; otherwise a procedural numpy bed (kick, hats, sub, pad, riser) in `tools/make_music.py`.
   - Bed ~15–20 dB under the voice, sidechain-ducked like the SFX. More SFX per `frame.md` (low-pass anything shrill above 5 kHz).
5. **Composition:** extend `index.html` from 7 s to the 8 beats of `storyboard.md` (900 frames @ 30 fps): fix 1 letters join → fix 2 spring graph (ζ 0.32, ω 12) → fix 3 hand-held viewfinder → fix 4 whip blur + mute → waveform → close (circle wipe, «چشمِ ادیتوره» in red, the drop) → CTA (mint box, «قسمت ۱ از ۳», loop back to frame 0).
   - Retime every text cue to the Whisper word onsets (the sample's line 4 text was ~1 s late: 5.95/6.30 vs speech 4.96/6.11).
   - Keep the Persian type rules of `CLAUDE.md` (word by word, safe zone x 96–984, y 190–1460, ≤840 px lines).
6. **Render + master:** `npx --yes hyperframes@0.8.137 render` (optionally `--fps 240` + `vision-kinetic/tools/shutter.sh` for real motion blur) → `bash tools/deliver.sh renders/full-raw.mp4 renders/viral-reel-v1.mp4 30 assets/audio/mix-full.wav` (−14 LUFS, ≤−1.5 dBTP, ≤7 Mbps).
7. **Check frames** (every beat + the loop point), then send Shahin the MP4 and wait for his notes.
8. Publish on Instagram only after he explicitly approves the video, caption, account, Trial Reel (Hook B variant) and AI label.

## Constraints
- The repo is public: never commit the Abar or Superline files in `assets/fonts/`, and never publish an Artifact that embeds them.
- On Instagram, only read (signed in as `shahinmirshahi_` in his Chrome).
- vidIQ has 0 credits; WebSearch and Agent failed in this session.

## Voice-over on the sample (2026-11-22)
- **Engine:** Google AI Studio, "Gemini 3.8 Flash TTS", voice **Puck** ("Upbeat · Middle pitch"), on Shahin's PRO sign-in (no API key, no billing). Voice Design and the full voice list need the paid tier; not used.
- **Style prompt:** `Persian (Farsi), natural Tehrani accent. Young male creator talking to camera on an Instagram reel: confident, punchy, a little cheeky, conversational, not a radio announcer. Fast pace, short clear pauses between sentences. Say "Claude" the English way (کلاد).`
- **Source:** `%USERPROFILE%\Downloads\Generated Audio November 22, 2026 - 8_16PM.wav` → `assets/audio/vo-gemini.wav` (24 kHz mono, 7.08 s, −17.9 LUFS).
- **Whisper** (`vo/whisper-gemini.json`, large-v3-turbo on cuda): all 19 words right; «کلاد» confirmed; «کد هم» comes out as colloquial «کدَم».
- **Placement** (`tools/mix_vo.py`): cut in silence with 5 ms fades, 48 kHz stereo. L2 and L3 at atempo 1.06, L4 at 1.04. Speech: L1 0.28–1.39, L2 1.50–2.97, L3 3.10–4.19, gap 4.19–4.96 (raw v1), L4a 4.96–5.94, L4b 6.11–6.88.
- **Mix:** SFX −7 dB static, then sidechain-ducked under the VO (threshold 0.03, ratio 4, attack 5 ms, release 250 ms). Pre-master `assets/audio/mix-vo.wav` (−17.7 LUFS); voice stem `assets/audio/vo-placed.wav`.
- **Master:** `renders/viral-reel-sample-vo.mp4`, 7.000 s, 6.52 Mbps, −14.1 LUFS, −2.7 dBTP.
- **For the full reel:** the line-4 text appears at 5.95/6.30, so the voice leads it slightly; retime the animation cues to the VO onsets above.

## Full build v1 (cloud session, 2026-11-22)
Built in a Linux cloud container (no access to Shahin's Chrome, so no AI Studio UI). Fonts came from his upload and stay out of git (`.gitignore`).

1. **VO** (`tools/gen_vo.py`): Gemini API, the same model as AI Studio (`gemini-3.8-flash-tts`), voice Puck, the style prompt and 13-line text of `vo/script.md`, generated once → `assets/audio/vo-full.wav` (27.84 s, 24 kHz). Used Shahin's own Gemini key (from his chat, env var only, never written to a file).
2. **Whisper** (large-v3, CPU) on the full take and on the placed stem → `vo/whisper-full-raw.json`, `vo/whisper-full.json`. Every word matches the script except: «کد هم» → «کدَم» (colloquial, as in the sample), «از هم» → «ازَم», «پرامپت» → «پرامت» (Whisper drops the پ), and «ولی» → «بلی». It also hears «بلی» on the approved sample, so that one is Whisper, not the voice.
3. **Placement** (`tools/mix_vo_full.py` → `assets/audio/vo-placed.wav`, `vo/placed.json`):
   - L1–L3 are the approved sample's lines (`vo-gemini.wav`, placed exactly as in the sample, −1.87 dB to match the new take). The full take read L3 in 1.62 s, too long for 3.05–4.2 s at atempo ≤1.08 (HANDOFF step 1 allows this splice).
   - L4–L13 come from the full take. L10 is split in 3 so «…و صدا» gets its pause; L13 runs at atempo 1.04.
   - The raw v1 stays silent 4.19–4.95 s.
   - The CTA starts at 25.70 s, not the script's 26.6 s. L13 is 3.1 s long and has to end before the 29.4 s loop-out.
   - Word onsets: `tools/cues.py` → `vo/words.json` (Whisper starts snapped to the end of pauses, with one manual override).
4. **Music** (`tools/make_music.py` → `assets/audio/music.wav`, procedural: Lyria isn't reachable from the cloud):
   - 120 BPM, Am F C G.
   - Pulse and pad from 4.95 s, hats from 9 s, pluck arp from 13 s, kick and sub from 20.0 s («صدا»).
   - Riser 21–22 s, everything cut 21.75–22.0 s, **drop at 22.0 s** (impact + crash + clap), low-pass fade to silence by 30.0 s for the loop.
5. **SFX** (`tools/mix_sfx_full.py` → `assets/audio/sfx-full.wav`):
   - Group A is the sample's cues, cut at 3.89 s.
   - New cues for beats 3–8 reuse the vision-kinetic files plus synthesized snap / tick / dead tick / draw / swish / thump / REC beep / crack / lens zzt (`assets/sfx/gen/`, all mostly below 5 kHz). The glints are low-passed at 7 kHz.
6. **Mix** (`tools/mix_full.py -7 -3` → `assets/audio/mix-full.wav`): SFX −7 dB, music −3 dB, both sidechain-ducked under the voice. During speech the music sits ~15–20 dB under the voice.
7. **Composition** (`index.html`, 900 frames, one GSAP timeline `main`; the old 7 s sample is `work/sample-index.html`, not committed):
   - **0–4.95 s:** the approved sample, unchanged.
   - **Beat 3:** v1 letters spread and snap (4.98 / 5.30), circle wipe at 5.50 s, «نه حرف به حرف» on its onsets, strike at 6.75 s, line 5 word by word. On «جدا» the letters of «ساخت.» come apart and spring back.
   - **Beat 4:** axes draw. The spring curve (ζ 0.32, ω 12) with its dot draws on «فنر»; the straight line with a dead stop draws on «نه خطِ صاف»; on «که حرکت جون بگیره» two chips race to the same target.
   - **Beat 5:** viewfinder corners, REC with the real timecode, hand-held float + lean + shake, focus hunting, then a whip-out with an SVG directional blur.
   - **Beat 6 (dark):** whip-in. «موشن‌بلرِ» and «واقعی» whip in with trailing copies. The mute icon's X goes on «و»; on «صدا» the 24 mint bars follow the real music spectrum (`tools/bars.py` → `assets/bars.js`). Push-in, then a hold at 21.75 s.
   - **Beat 7a (22.0 s drop, paper):** white flash, «هوش مصنوعی ابزاره.», the 4 fixes as pills on 8th notes, kick pulse every beat.
   - **Beat 7b:** circle wipe to black, «چشمِ ادیتوره» in red, «که خوبش می‌کنه.».
   - **Beat 8:** circle wipe to paper, «کامنت کن», «پرامپت» in the mint box (spring + shine), «قسمت ۱ از ۳», the line on its word onsets. Everything leaves 29.40–29.85 s → empty paper = frame 0.
8. **Render + master:** `npx --yes hyperframes@0.8.137 render . -o renders/full-raw.mp4 --quality delivery`, then `bash tools/deliver.sh renders/full-raw.mp4 renders/viral-reel-v1.mp4 30 assets/audio/mix-full.wav` (`deliver.sh` now skips `cygpath` on Linux).

**Differences from the local setup**
- **Font:** Tahoma isn't installed in the cloud, so the broken v1 falls back to DejaVu Sans. It still looks like the generic default font.
- **Motion blur:** no 240 fps / shutter pass yet. The whips use an SVG directional blur and the words use trailing copies.

**Still to do**
- Shahin's notes on v1.
- Hook B variant for the Trial Reel: needs 2 new VO lines, «هوش مصنوعی اینو تحویلم داد» and «۴ تا اصلاح بعد…».
- The freebie («پرامپت فارسی + چک‌لیست PDF»).
- The ManyChat DM text.
- Publishing, after his explicit OK.
