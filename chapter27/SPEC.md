# CHAPTER 27 — Spec

GOAL:    The viewer (and the subject) ends feeling that 27 years of struggle were the prologue — the
         story is not over. Last frame: his real face, lit by sunrise, under "CHAPTER 27".
OUTPUT:  HyperFrames, 1920 x 1080, 24 fps, 16:9 (YouTube)
TIME:    113 s x 24 = 2712 frames (v2: +13 s training montage at 55 s). Placeholder score at 72 BPM → 20 frames per beat, bar = 80 frames (3.333 s).

LOOK:    Medium = "light in a dark room": every scene is near-black, lit by ONE warm source.
         ground   #0a0806 (warm black), never pure #000 except the head/tail of the film
         brown    #2a1c12 / #3d2a1b (mid-shadows, court wood, hills)
         gold     #c9a45c (the one accent: the light source, the title)
         highlight#f1dcaa (only the hottest point of the light)
         type     display = Cinzel 400/700, tracking +0.18em, 96–168 px; quiet line = Montserrat 300/500,
                  tracking +0.5em, 26–30 px, colour #cbb48a at 85%
         letterbox 2.39:1 — 138 px bars top and bottom, always on (#000)
         grain    feTurbulence 0.65, 7% opacity overlay, re-seeded per frame (deterministic, frame index)
         vignette radial, 0 at 55% radius → 0.65 black at corners
         photographs: graded through `hyperframes media-treatment` (warm, crushed blacks, no beauty filter),
                  never stretched — object-fit: contain/cover at native aspect only
OBJECTS: Protagonist = the subject from assets/reference (ref-01 face, ref-02 body). In drawn scenes he is a
         backlit silhouette with his curly-top hair shape, lean build, LEFT-handed (spikes with the left arm).
         The boy (Scene 2) = the same silhouette at child proportions (head 1:5 of height).
         Volleyball court = honey-brown wood in perspective, white lines, net with white top tape and posts,
         one overhead stadium light rig per bank.
MOTION:  enter = expo.out / power4.out; camera = power2.inOut / sine.inOut (slow, 8–14 s per push);
         exit = power3.in, 40% shorter than entrance; titles land and hold still.
         Letters 0.1 s apart (names / dates), words 0.08 s apart. Slow-mo spike = 3.5 s for a 0.9 s action.
SHOTS:
  S1  0.0–13.0   Black → a thin gold line of light opens at centre (0.5–3 s) → light becomes a sweep across
                 his real photo, #6 on the volleyball court (ref-03) left→right (3–9 s) → "15 ABAN 1378" per letter (4.0 s) and
                 "A STORY BEGINS." (6.2 s). Hand-off: portrait sinks to black, the gold line remains = horizon.
  S2 13.0–26.0   Horizon line becomes a dusk sky. Boy silhouette on a rock, left third, looking right to the
                 low sun. 12 s dolly-in 1.0→1.12 with 3-layer parallax. Grass sways. Hand-off: push into the sun,
                 frame whites out to gold.
  S3 26.0–42.0   Gold bloom resolves into a stadium flood light. Empty arena, one light cone, dust in it.
                 Wide (26–31): he bounces the ball. Low-angle (31–38): slow-mo left-arm spike, sweat + ball
                 impact. Floor (38–42): ball hits, dust ring. Hand-off: lights cut, one by one.
  S4 42.0–55.0   Same court, cold & dim. Ball alone rolls to rest. He walks away toward a door of light at
                 the back, shrinking; the door closes → black (54.2).
  S4b 55.0–68.0 THE GRIND: one light, every night. Hard cuts on the beat with gold flash frames:
                 block jumps at the net → sprint the court → spike after spike → barbell squats → four 0.4 s
                 hits of all of it → spent, hands on knees, he looks up at the light. "DAY 001 → 730" rolls.
                 Music stops dead at 66.6, heartbeat only, black.
  S5 68.0–81.0   The door opens again. He walks in; light banks slam on (58.5). Run-up, jump, spike at full
                 speed with camera shake; dust shock ring. Hand-off: impact flash → gold line art.
  S6 81.0–97.0   "The Search": gold line-art on deep brown, cut every ~2.6 s: rising graph (independence) →
                 a storefront drawn line by line (business) → a node network that becomes a film frame
                 (AI content) → globe arc with a plane (abroad) → his real photo (ref-04 gym photo, graded), lines
                 orbiting him. Hand-off: the photo darkens to silhouette.
  S7 97.0–113.0  Sunrise behind his silhouette (ref-01 cutout as a matte). Camera moves forward 1.0→1.15.
                 The light comes round and reveals his real face (91 s). "CHAPTER 27" per letter (92.5),
                 "THE STORY CONTINUES." (95.0). Hold. Fade to black 98.8–100.
SOUND:   placeholder score (assets/audio/score-placeholder.wav, generated, replace with a licensed track):
         drone + sparse piano (S1–S2), pulse (S3), solo piano (S4), rise (S5), drive (S6), climax (S7).
         SFX on screen actions only: light clunks, ball hits, spike impacts, door.
         Persian voiceover: 7 placeholder lines (assets/audio/vo/vo-0X.wav), see VOICEOVER.md.
         Music ducks to 0.35 under each line.
BANNED:  glowing orbs / neon / lens-flare stars; three cards in a row; corner labels or HUD; text that moves
         after it lands; every element fading up; crossfading one world into another; centred-everything
         (S2/S3 subjects sit on thirds); any AI face; stretched photos; beauty filters.
QA:      t=1.5 (line), 7.0 (portrait + date), 20 (boy), 34 (spike apex), 47 (walk away), 62 (return spike),
         72/77/81 (search), 93 (face reveal), 97 (final title).
