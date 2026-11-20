# ROYAGRAM — "Ordinary Is Boring" · Production report

## 1. Summary
A 25-second, 9:16 cinematic Reel. An ordinary Persian estekan of tea turns out to hold a whole golden Persian city. A drop dives us into it, a giant tea-wave lifts the city above the rim, and then someone simply drinks it. The end card reads **ROYAGRAM / SMALL THINGS. BIG WORLDS.**

Every frame and every sound was **generated procedurally in this project**: a hand-built 3D film, rendered deterministically, plus a fully synthesized soundtrack. No stock footage, no samples, no licensed music, no AI-generated media.

## 2. Tool audit (workflow steps 1–3)
| Checked | Result | Decision |
|---|---|---|
| Project files | Repo already had a Three.js r170 kit and an HTML→frames→FFmpeg workflow (Pip & Pebble episodes) | Reused Three.js r170 and the frame-capture approach |
| vidIQ MCP (MiniMax H3, Veo 3.1, Seedance, Wan, Nano Banana, music generation) | Connected, but the balance was **0 credits** (renews 2 Dec 2026). Every generation call is paid. | **Not used.** No paid access was assumed, and no fake "AI" results were substituted. |
| GPU | None (no `nvidia-smi`, CPU-only container, 4 cores, 15 GB RAM) | Rendering via WebGL2 on **SwiftShader** (CPU) in headless Chromium |
| Blender / Cycles | Not installed; CPU path tracing would take about 5–20 h for 600 frames | Not used |
| Remotion | Installable from npm, but it is also headless-Chrome screenshotting. It would only add a React layer around the same capture loop. | Replaced by an equivalent lean pipeline: a deterministic `renderAt(t)` page and a Playwright frame loop (`source/render.mjs`), with DOM/CSS typography composited in-page. FFmpeg does the encode. |
| FFmpeg 6 (libx264, AAC), Python 3.13 + NumPy, SciPy (installed), ImageMagick, Playwright + Chromium | Available | Used |

**Chosen pipeline:** Three.js r170 scene graph → custom HDR post (bokeh DOF, Unreal bloom, ACES filmic, grade, vignette, grain, chromatic aberration) → headless Chromium (SwiftShader WebGL2) → 600 lossless PNG frames → FFmpeg H.264 + AAC.

## 3. How each scene was built
| Scene | Technique |
|---|---|
| Glass (master reference) | One lathe profile (`OUTER` / `estekanGeometry()` in `source/js/table.js`) used in every table shot: thick base, waisted tulip body, flared rim, two gold bands, physically based transmission (IOR 1.5) |
| Tea | Custom shader: Beer–Lambert absorption along the chord through the glass (σ = 0.32 / 0.95 / 2.9 per cm, R/G/B), forward scattering of the back-left sun, glowing edges, slow internal motion |
| Sunlight through tea | **Analytic caustic:** every table and saucer pixel traces toward the sun, tests whether that ray passes through the tea column, and adds amber light attenuated by the chord length. The amber "shadow" is therefore physically placed. |
| Table | Procedural walnut planks in the shader, clear-coated; fine detail fades with distance to prevent moiré |
| Steam | Domain-warped fBm ribbons, backlit |
| Drop and ripple | Analytic capillary ring packets, wall reflections, impact crater, Worthington jet, slow-motion timing |
| City | 2,397 instanced adobe blocks with procedural arched windows (lit or unlit per window). Golden onion dome on a lit drum, iwan with twin minarets, a two-storey arcaded maydan with pool and cypresses, a two-tier Si-o-se-pol-style bridge (extruded pointed-arch walls), badgir windcatchers, secondary domes, masonry shader, 1,116 street lamps, 293 windcatchers, 376 moving cars |
| Sea and wave | Planar-reflection golden sea (city lights reflect in it). The giant wave is a displaced 340×240 grid with a peeling, curling lip, a translucent sun-backlit crest and a foam lip. |
| Climax | Tea surface swells to a plateau above the rim, carrying a miniature version of the same city (150 lit blocks, gold dome, minarets, lamps) plus suspended droplets |
| Twist | Hard cut to the exact opening camera. Three smooth tapered fingers (tube geometry on a curved spine) pinch the rim, the Persian way to hold a hot estekan, lift it out of frame, and return it empty. |
| End card | DOM/CSS: Cormorant Garamond wordmark with a moving gold specular sweep, a ripple ring echoing the drop, Inter tagline |

## 4. Render settings
- 1080 × 1920, 24 fps, 600 frames, PNG RGB lossless intermediates
- Scene buffer: RGBA16F, 4× MSAA; DOF: 36-tap golden-angle gather with a foreground-aware CoC; bloom: UnrealBloom (5 mips)
- Grade: ACES filmic (RRT+ODT fit), warm highlights and neutral blacks, sRGB output, 3.5% luminance-weighted grain
- Encode: `libx264 -preset slow -crf 15 -profile:v high -level 4.2 -tune film -g 48`, BT.709 tagged, `yuv420p`, `+faststart`; audio AAC-LC 320 kb/s, 48 kHz stereo
- Render time: about 6 s per table frame and about 2–3 s per city frame per worker; 2 workers in parallel on 4 CPU cores

## 5. Sound design (`source/audio/build_audio.py`)
Everything is synthesized: modal santur (three detuned strings per course, stiff-string partials), detuned-saw string ensemble, formant choir ("aah"), low-brass braam, daf (dum, tak and jingle rings), modal glass pings, filtered-noise whooshes, wave roar and splashes. Reverb is convolution with synthetic stereo impulse responses (hall, room, and a tiny "inside the glass" space).

Music is in **D, Persian mode Homayoun** (D Eb F# G A Bb C). The santur ostinato and the daf accelerate from 100 to about 146 BPM through the city. Climax at 17 s, then **hard cut to silence at exactly 20.000 s**.

Twist foley: fingertips on glass, lift-off, **a tiny "beep-beep" car horn from inside the glass** (the comedic detail), a Persian-style slurp, and the empty glass set down.

Stems are delivered in `audio/`: `stem_music.wav`, `stem_sfx.wav`, `stem_ambience.wav`, `mix_master.wav`.

## 6. Limitations (stated plainly)
1. **Native 2160 × 3840 was not rendered.** CPU-only software WebGL takes about 4× longer per frame (about 4 h), and the brief forbids upscaling, so the master is a clean native **1080 × 1920**. The scene is resolution-independent: change `W, H` in `source/js/main.js` and `post.js`, then re-run on a GPU machine for a native 4K master.
2. **Not photographic realism.** This is real-time rasterization, not path tracing. Glass, tea, caustics and DOF are physically motivated, but a trained eye will read the city and the wave as premium CG rather than live action. With credits or a GPU, the same shot plan can be upgraded by feeding these frames as structure references into an image or video model, or by re-rendering in Blender/Cycles.
3. **Hand:** a fully modelled human hand at this quality was not feasible procedurally. The twist uses three fingertips entering from above the frame for about 1.2 s.
4. **Logo:** no official ROYAGRAM logo file was supplied, so the end card uses a typographic wordmark. Replace `#logo` in `source/index.html` with the official SVG to update.
5. Persian-language text was intentionally not added. The film uses English-only typography, and Persian identity is carried visually and musically. If a Persian wordmark (e.g. «رویاگرام») is wanted, please supply the official spelling and lettering.

## 7. Quality control
(filled from measurements of the final file — see below)
