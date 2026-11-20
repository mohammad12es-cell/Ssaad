# THE LAST HUMAN — Season 01

A 10-episode, 30-second-per-episode vertical (9:16) cyberpunk animated series, produced entirely
with code: **Remotion + Three.js + React** for picture, a **numpy/scipy synthesiser** for the score and
sound design, **Piper** (free, local, neural TTS) for the voices and **FFmpeg** for mixing,
mastering and delivery. No paid APIs, no generative image/video services, no stock footage, no samples.

| | |
|---|---|
| Episodes | 10 × 30.000 s (900 frames) — 5:00 total |
| Format | 1080×1920, 30 fps, H.264 High / yuv420p, AAC 256 kb/s 48 kHz stereo, −14 LUFS |
| Language | English dialogue |
| Deliverables | Main (English audio + Persian subtitles) · International (English subtitles) · Clean master |

## What is actually animated (and what is not)

Every frame is a real-time 3D render of a procedurally built scene; nothing is a still image with a zoom.

* **Real 3D motion** — characters are rigged procedural models (hips/spine/chest/neck/head, two-bone arms and legs)
  driven by walk / run / crouch / reach cycles; faces have rotating eyeballs, blinking lids, brow
  expressions and an audio-driven lip-sync mouth; drones, the Hunter robot, flying traffic, rain,
  crowds, smashed market stalls (ballistic debris), doors, the glass chamber, derezzing towers.
* **Real virtual cinematography** — every shot is a moving 3D camera (crane, orbit, tracking, push-in,
  low angle, OTS, macro) with handheld noise, impact shake, and depth-of-field / rack focus computed from the depth buffer.
* **2D layers** — HUD graphics (drone scanner, robot vision, title bug, final title) and subtitles are 2D
  overlays by design. Screens inside the world (billboards, terminals) are live canvases or *live 3D
  renders* (the facial-recognition billboard shows a real-time render of Kael's face, not a picture).

### Honest limitations
* No GPU in the production container: WebGL runs on SwiftShader (CPU). Look and complexity were tuned
  to render in reasonable time; there is no ray tracing, no hair simulation, no cloth simulation.
* Characters are stylised procedural models (sculpted sphere heads, painted textures), not hand-sculpted
  production rigs. Lip-sync is amplitude-driven (jaw/lip open), not phoneme-accurate visemes.
* Voices are Piper TTS with per-character processing — natural-sounding but not human performances.
  Swap in recorded actors by replacing `assets/voice/<line>.wav` and re-running the mix (lip-sync
  envelopes are recomputed from the audio).

## Character bible (enforced in code)

All appearances are built from `src/characters/Cast.ts` through one rig builder (`Human.ts`), so faces,
hair, outfits and proportions cannot drift between episodes.

| Character | Spec |
|---|---|
| **KAEL** | 25, lean athletic build, short messy black hair, dark-brown eyes, scar above the **left** eyebrow, black techwear jacket with metal shoulder plates / zip / cuffs and thin cyan seams. **No neural link.** Variants: child (Ep03 memory, no scar yet), the Original (Ep08, bodysuit), the real human (Ep10) — same face, eyes and scar. |
| **E.V.E** | Holographic AI: silver hair (long, swaying strands), glowing cyan eyes, elegant gown silhouette, fresnel/scanline hologram shader with glitch & dissolve. Voice: calm, synthetic, doubled with a sub-octave and chorus. |
| **DR. VEX** | Older scientist, white receding hair and beard, worn lab coat. Seen as warm reality only in the memory (Ep03); otherwise as a pale-blue holographic recording. |
| Citizens | Varied coats/skin/hair, **every one has a glowing cyan neural link behind the ear** (Kael's absence of one is the series' first visual clue). |

## Series sound identity
* Neo-Eden motif: falling D–B♭–A figure over sub pulses (every reveal).
* E.V.E's tone: glassy A-major sine cluster with slow chorus whenever she is present.
* Glitch language: bit-crushed bursts and stepped blips, stereo-scattered.
* All music and effects are synthesised in `src/audio/score.py` (original; no samples).

## Project layout

```
src/
  characters/   Human.ts (rig + face + hair builder), Cast.ts (character bible), Crowd.ts, Machines.ts (drone, robot)
  environments/ City.ts (Neo-Eden), Interiors.ts (tunnels, labs, chamber, simulation field, glass chamber, core, memory lab, real lab, market), Lighting.ts
  scenes/       street.ts (reusable street set), tests.ts (look-dev scenes)
  episodes/     ep01.ts … ep10.ts (shot lists + blocking), common.ts (lip-sync, HUD kit), sound/epXX.json (cue sheets)
  camera/       Camera.ts (shot system: lens, easing, handheld, impact shake, rack focus)
  effects/      materials.ts (hologram, beams), Rain.ts, FaceFeed.ts (live render-to-texture screens)
  engine/       Stage.ts (renderer + post pipeline), textures.ts (procedural painterly textures), env.ts
  audio/        voice.py (Piper casting + processing + lip-sync envelopes), score.py (synth score + SFX + mixer)
  components/   SceneCanvas.tsx (Remotion ↔ Three bridge), Subtitles.tsx (FA/EN subtitle layer)
  data/         dialogue.json (all lines, EN + FA, highlights), voice.json (generated timing + envelopes)
assets/   fonts (Vazirmatn), voice (rendered lines + Piper model cards), textures/models (procedural — none needed)
scripts/  render_episode.sh, validate.py, compile_season.sh, contact_sheet.py, stills.sh, write_srt.ts
output/   episodes/{main_fa,international_en,clean}, season/, subtitles/, previews/, qc/
```

## Rendering

Requirements: Node 18+, Python 3.10+ with `numpy scipy piper-tts`, FFmpeg, a Chromium/Chrome headless shell.

```bash
npm install
pip install numpy scipy piper-tts
# Piper voices (free): en_US-john-medium, en_GB-jenny_dioco-medium, en_GB-northern_english_male-medium,
# en_US-amy-medium, en_US-norman-medium  ->  assets/voice/models/  (from huggingface.co/rhasspy/piper-voices)
python3 src/audio/voice.py              # synthesise + process all dialogue, write lip-sync data
scripts/render_episode.sh 1             # one episode: audio, picture, FA/EN subtitle layers, 3 MP4s, SRTs, QC
for i in $(seq 1 10); do scripts/render_episode.sh $i; done
scripts/compile_season.sh               # 5-minute compilations (3 versions) + season SRTs
python3 scripts/contact_sheet.py        # preview contact sheet
npm run studio                          # interactive preview (Remotion Studio)
```

`remotion.config.ts` points at the container's headless Chromium and uses SwiftShader (`--gl=swangle`);
on a machine with a GPU, remove the browser override and use `--gl=angle` for much faster renders.
Quality knobs (internal 3D render scale, MSAA samples, shadows) are passed as input props:
`--props='{"quality":{"scale":1,"samples":4,"shadows":true}}'`.

## Subtitles (Persian RTL)
* Persian subtitles are laid out by Chrome (HarfBuzz shaping + ICU bidi) in `dir="rtl"` with **Vazirmatn**,
  rendered as a transparent ProRes 4444 layer and composited onto the clean master — so all three versions
  share frame-identical picture timing.
* libass was tested first and **rejected**: it shaped Persian letters correctly but broke bidi word order once
  inline highlight tags split a line.
* Speech cues follow the measured voice timing; on-screen English text (e.g. *UNKNOWN HUMAN DETECTED*) gets a
  Persian translation cue in the main version. Highlighted words are cyan and used sparingly.
* SRT files (UTF-8 with BOM, RLM-prefixed Persian lines) are in `output/subtitles/` and `output/season/`.

## Quality control
`scripts/validate.py N` checks every deliverable: exact 30.000 s / 900 frames / 1080×1920 / 30 fps / yuv420p,
AAC 48 kHz stereo, −14 ±1.5 LUFS, true peak ≤ −1 dBTP, no unintended black (>0.4 s) or frozen (>1.5 s) picture
(intentional story beats are whitelisted: Ep01 cut to black, Ep09 white-out, Ep10 opening darkness), and that every
subtitle is visible at its cue and fully inside the safe area. Reports: `output/qc/*.json`.

## Credits & licences
* Code, models, textures, music and sound effects: original, generated by this project.
* Fonts: Vazirmatn (SIL OFL 1.1), Orbitron & Rajdhani via @fontsource (SIL OFL 1.1).
* Voices — Piper TTS (MIT) with these voice models:
  Kael: `en_US-john-medium` (public domain) · E.V.E: `en_GB-jenny_dioco-medium` (Jenny dataset licence — attribution; verify for commercial use) ·
  Dr. Vex: `en_GB-northern_english_male-medium` (CC BY-SA 4.0) · child (Ep03): `en_US-amy-medium` (Mimic 3 dataset licence; verify) ·
  system voice: `en_US-norman-medium` (public domain). Model cards are kept in `assets/voice/models/*.MODEL_CARD`.
* Remotion is free for individuals and small companies; larger companies need a Remotion company licence.
* Visual quality reference: Arcane (Fortiche/Riot) — used only as a bar for painterly lighting; no characters, designs or assets were copied.
