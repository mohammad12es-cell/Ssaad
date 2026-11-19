# ROYAGRAM — Launch Film · Production Manifest

**Film:** "Make the Impossible Visible" · 45 s · 9:16 · 24 fps · master 1080×1920
**Pipeline:** Every shot is rendered procedurally with three.js (r170) in headless Chromium (software WebGL, Playwright), deterministically, one frame at a time. FFmpeg encodes the frames. Audio is synthesized in Python (numpy/scipy). The voice is a local open-weights TTS (Kokoro-82M, Apache-2.0).
**No stock footage, no photographs, no paid APIs, no external generation services.** No local image or video diffusion model was available on this machine (CPU only, no GPU), so nothing in this film is "AI-generated imagery" in the diffusion sense. All visuals are original real-time 3D: procedural geometry, physically based materials, and custom shaders.

## Shot list

| # | Time | Shot | Assets (all original, built in code) | Method | Status |
|---|------|------|---------------------------------------|--------|--------|
| 01 | 00:00–00:04.3 | **Hook.** A black chrome sphere develops glowing gold cracks from an impact point, fractures into 1,280 reflective shards, and the camera flies through them. Type: ORDINARY IS NOT THE LIMIT. | Shard geometry (icosphere → extruded prisms), vertex-shader explosion, iridescent inner faces, glass dust | `src/scenes/s1_hook.js` | Final |
| T1 | 03.8–04.3 | Glass shards → perfume reflections | Noise-refraction dissolve | `post.js` mode REFRACT | Final |
| 02 | 00:03.8–00:11.3 | **Perfume "ORVANE Nº7".** A glass flacon (transmission, dispersion, IOR 1.52) above a black ocean of Gerstner waves. Liquid-gold ribbons spiral up around it and the sea turns to gold beneath. Dolly-in, then orbit, then a push into the liquid. | Flacon, gold cap, gold-foil label, ocean shader, variable-radius liquid ribbons, light shafts, gold dust | `s2_perfume.js` | Final |
| T2 | 10.6–11.3 | Push into the perfume → golden liquid → portal | Radial zoom blur into a gold caustic field | mode LIQUIDZOOM | Final |
| 03 | 00:10.6–00:18.3 | **Sneaker "KINETRA AERO".** An original performance sneaker emerges from a gold portal. Desert dunes at dusk turn into night as black monoliths with gold light lines rise out of the sand. Speed-ramped orbit, then a low hero angle, then a fast dart out of frame. | Procedural sneaker (lofted midsole and outsole, knit upper with collar cavity, laces, eyelets, gold heel counter, toe guard, stitching, knit bump texture), dunes, portal shader, 22 monoliths, mega-ring | `sneaker.js`, `s3_sneaker.js` | Final |
| T3 | 17.6–18.3 | Sneaker motion blur → beverage liquid | Directional smear with a liquid edge | mode SMEAR | Final |
| 04 | 00:17.6–00:25.3 | **Beverage "LUMIQ".** A premium can with condensation. A fast push-in, then the liquid erupts and the shot drops to slow motion (time × 0.15). 2,600 droplets, 1,100 of which are drawn into an orbiting ring, plus two liquid tori. Ends on a dive into a single hero droplet. | Lathe can, PBR label with metal/roughness map, 650 condensation beads, instanced droplet simulation | `s4_beverage.js` | Final |
| T4 | 24.6–25.3 | Droplet → watch component | Iris with refractive rim | mode IRIS | Final |
| 05 | 00:24.6–00:31.0 | **Watch "VERANTH Calibre 01".** Macro on the gear train, then an orbit around an exploded view: case back, rotor, perlage plate, 6 gears with ruby jewels, balance wheel, bridge, dial, applied indices, hands, sapphire crystal, bezel, crown, strap. Staggered assembly, a light sweep, and a ticking seconds hand. | Procedural gear geometry, perlage, sunburst dial and bezel textures | `s5_watch.js` | Final |
| 06 | 00:31.0–00:38.0 | **Showreel montage.** Re-renders the film's own scenes from new camera angles: a viewfinder frame for VIDEO PRODUCTION, a wireframe-to-final wipe for AI VISUALS, a three-panel editorial split for CREATIVE EDITING, and a kinetic exploded watch for MOTION DESIGN. Cuts land on the beat. | Scenes 1–5 with alternate cameras | `timeline.js` MONTAGE | Final |
| 07 | 00:38.0–00:45.0 | **Brand reveal.** Chrome shards, gold droplets and watch gears spiral in and converge on points sampled from the logo surface. 0.4 s of silence and near-black, then impact: a 3D ROYAGRAM wordmark and monogram (chrome faces, gold bevels), a shockwave, and the final message. | 3D extruded wordmark and "R in orbit" monogram from Syncopate Bold outlines (opentype.js) | `s7_reveal.js` | Final, but the logo is a **placeholder** (see below) |

## Typography
- Display: **Syncopate Bold** (SIL OFL, @fontsource). UI and body: **Inter** (SIL OFL).
- All on-screen copy is live DOM text composited per frame, so it renders crisp and correctly spelled. Copy is checked against the brief in QC.
- Safe zones: key copy sits between y = 250 and y = 1540 (of 1920) and within x = 70–1010. Subtitles sit in the top band (y ≈ 255) because the lower third carries product tags and Instagram's caption UI.

## Audio
| Element | Method | Status |
|---|---|---|
| Score: dark electronic cinematic in D minor, 120 BPM; minimal opening, build, powerful middle, emotional final peak, controlled silence at 41.50–41.90 s, Dm(add9) bloom | Procedural synthesis (`audio/build_audio.py`) | Final, original |
| Sound design: glass shatter, metallic impacts, sub booms, reverse swells, risers, whooshes, liquid, portal hum, monolith rumble, slow-motion splash, mechanical clicks synced to each component lock, ticks | Procedural synthesis, cue sheet `audio/cues.json` (synced to picture events) | Final, original |
| Voiceover (7 lines) | Kokoro-82M local TTS (voice blend am_michael/am_fenrir, speed 0.88), EQ and compression | Final synthetic voice. Every line verified word-for-word by local Whisper ASR, both solo and in the final mix |
| Mix | Ducking under VO, limiter, −14 LUFS integrated target (measured −13.7 LUFS, −1.3 dBTP) | Final |

## Known limitations (stated plainly)
1. **Not photoreal footage.** The film is high-end real-time CG made with procedural geometry. It's art-directed, but a GPU path tracer (Blender/Cycles, Octane) or hand-modelled hero assets would give more realistic materials, especially the sneaker's fabric and the liquids. Those tools and a GPU weren't available here.
2. **Logo placeholder.** No official ROYAGRAM logo was found in the project. The wordmark and monogram were designed for this film. To swap in the official mark, replace the geometry in `src/scenes/s7_reveal.js` (an SVG can be loaded with three's SVGLoader in the same place).
3. **4K master is an upscale.** `ROYAGRAM_Launch_45s_2160x3840_UHD-upscale.mp4` is a Lanczos upscale of the 1080×1920 render. A native 4K render is supported (`node src/render.mjs --scale 2`) but takes about 3 hours on this 4-core CPU-only machine.
4. **Synthetic voice.** The narration is a high-quality local TTS, not a human voice actor. For a paid campaign, re-record the 7 lines with a voice actor using `deliverables/ROYAGRAM_Launch_EN.srt` as the script and timing sheet. The mix rebuilds automatically from `audio/vo/*.wav`.
5. Product brands ORVANE, KINETRA, LUMIQ and VERANTH are fictional. No real client logos are used.

## Quality control (performed on the encoded deliverables)
| Check | Result |
|---|---|
| Duration / resolution / fps | 45.000 s · 1,080 frames · 1080×1920 · 24 fps (UHD 2160×3840). Cutdown 15.000 s · 360 frames |
| Codec | H.264 High, yuv420p, BT.709, faststart · AAC-LC 320 kbps 48 kHz stereo |
| Black frames / gaps | Only the intentional 0.375 s brand-reveal beat (41.54–41.92 s; cutdown 11.54–11.92 s). No other black frames or gaps |
| Audio sync | Picture silence and audio silence coincide (41.50–41.90 s). Impacts are cued to picture events in `audio/cues.json`. VO lines land at their scene windows (ASR timestamps 0–3 s, 5–7, 14–16, 20–23, 27–29, 33–36, 37–41) |
| Loudness / clipping | Master −13.7 LUFS integrated, −1.4 dBFS peak after AAC (−1.3 dBTP WAV), 0 clipped samples. Cutdown −13.9 LUFS, −0.9 dBFS peak |
| Voiceover | Local Whisper (small.en) transcribes all 7 lines word-for-word, both from the dry VO and from the final mix over music and SFX |
| Typography | All on-screen copy checked on rendered frames: ORDINARY IS NOT THE LIMIT. · VIDEO PRODUCTION · AI VISUALS · CREATIVE EDITING · MOTION DESIGN · ROYAGRAM · WE MAKE IDEAS VISIBLE. · LET'S CREATE SOMETHING UNEXPECTED. · DM US FOR YOUR NEXT PROJECT. |
| Product consistency | Each product is one persistent asset, reused unchanged between its campaign and the montage |
| Safe margins | Key copy sits within x 105–975 and y 255–1540 of 1080×1920 |
| Issues found and fixed during QC | Crack glow covered the whole sphere; fracture flash blew out to white; nested-transmission perfume liquid rendered invisible; can label wrapped and was unreadable; product tags overlapped products; sneaker silhouette too low; portal opening overexposed; watch plates flared; montage wireframe bloomed white; logo "R" glyph rendered hollow (font contour winding; fixed with containment-based hole detection); logo overexposed; delivery bitrate too high (28 → 14 Mbps); cutdown sneaker beat replaced with the hero angle |

## Bug-fix pass (v2)
Found by an automated per-frame analysis (frame-to-frame luminance jumps, black/clipped pixels) plus visual inspection of every flagged frame. Unexplained frame jumps dropped from 15 to 0; the remaining flagged frames are the intentional speed-ramp orbit.
| Bug | Where | Root cause | Fix |
|---|---|---|---|
| Square light blobs, gray/black rectangles | 0.6 s, 1.6 s, 2.6 s, 24.9 s, 34.5 s | NaN/Inf HDR pixels (HalfFloat overflow) smeared into blocks by the bloom mip chain | Sanitize NaN and clamp HDR before bloom (`post.js`) |
| Huge square dust sprites near the camera | Hook, montage | Point size unbounded as depth → 0 | Cap point size, fade near-camera points (`lib.js`) |
| Strobing during the shatter | 1.6–2.3 s | Camera shake at 90 rad/s aliased at 24 fps | Lower-frequency, smaller shake |
| Flat orange disc left after the explosion | 2.6 s, montage | Core light mesh never hidden | Hide core after the flare |
| White flash, camera flies through portal ring | 14.3–14.5 s | Orbit path crossed the portal disc | Portal closes before the orbit |
| Light-bar flash / monolith blacking out frame | 14.5–15 s | First monoliths sat on the orbit path | Monoliths moved outward |
| Lug flash on the watch | 28.8 s | Mirror-polished flat boxes | Brushed finish on lugs |
| Black first frame | 0.0 s | Fade-in started from full black | Shorter, partial fade-in |
| Fragile CLI parsing / encode args | `render.mjs`, `deliver.py` | String-split argv; hard-coded slice | Proper parser; helper function |
