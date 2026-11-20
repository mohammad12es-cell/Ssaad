# ROYAGRAM — "Ordinary Is Boring" · Shot-by-shot production plan

Format: 9:16 · 1080 × 1920 master · 24 fps · 25.000 s = 600 frames
Pipeline: procedural 3D (Three.js r170, WebGL2) → headless Chromium frame capture → FFmpeg.
All sound is synthesized from scratch (Python/NumPy/SciPy), so there are no licensing questions.

## Two worlds, one glass

| World | Units | Used in |
|---|---|---|
| **Table world**: estekan (Persian tea glass), porcelain saucer with gold rim, walnut table, sunlight, steam | cm | S1, S2, S4b, S5 |
| **City world**: a Persian city on a golden tea-sea at dusk, seen from inside the glass | m | S3, S4a |

**Master glass reference:** one lathe profile (`source/js/table.js → estekanProfile()`), used in every table shot.
That keeps the proportions, tea colour, sun direction (back-left), table material and camera orientation (glass front faces +Z) identical.
**City identity:** one generator with a fixed seed. Golden onion dome, iwan portal with twin minarets, a two-tier arched bridge (Si-o-se-pol), badgir windcatchers, adobe blocks with arched lit windows, and a pool-lined maydan.

## Shots

| # | Time | Frames | World | Camera | Action | Sound |
|---|---|---|---|---|---|---|
| 1A | 0.00–4.00 | 0–95 | Table | 3/4 front, fov 26°, slow dolly in 27→19 cm with a 4° arc | Already lit at frame 0: a sun glint sweeps across the gold rim (the hook). Steam curls in backlight; amber caustic on the table. Title **ORDINARY IS BORING.** at 0.3–3.5 s | Room tone, steam hiss, soft tension drone, one santur note |
| 2A | 4.00–5.20 | 96–124 | Table | continues push, tilts up | A single tea drop falls into frame (slow motion) and hits at 4.80 s: crown ripple, Worthington jet | Reverse swell → detailed drop plink + sub boom |
| 2B | 5.20–8.00 | 125–191 | Table | booms up over the rim, looks straight down, dives | Rings spread; a tiny golden light blooms beneath the surface; the camera plunges through at 7.85 s | Underwater whoosh, bubbles, rising pad |
| 3 | 8.00–14.00 | 192–335 | City | one continuous spline flight | Drop out of golden clouds (the steam) → over the sea → low up the river → **through a bridge arch** → bank over the city → over the golden dome → **between the minarets** → over the maydan → out to the coast | Orchestral swell, tiny city ambience (bells, horns), daf rhythm accelerating |
| 4A | 14.00–17.00 | 336–407 | City | slows in awe, then races at the wave, pitches up its face | A giant golden wave rises from the sea; the city lights reflect in it; the camera climbs to the glowing crest | Braam, wave roar, risers |
| 4B | 17.00–20.00 | 408–479 | Table | low hero angle rising up the glass | Match-cut on the upward motion: the tea swells above the rim, carrying the glowing miniature city like a crown, droplets suspended | Climax impact, shimmer, cymbal swell |
| 5 | 20.00–23.00 | 480–551 | Table | **hard cut** to the exact 1A opening frame | Silence. A hand takes the glass and lifts it out of frame; a tiny "beep-beep" comes from inside the glass; a slurp; the glass comes back **empty**; ordinary table | Abrupt silence, room tone, glass handling, tiny horn, slurp, clink |
| 6 | 23.00–25.00 | 552–599 | Black | static | Gold ripple ring (echo of the drop) → **ROYAGRAM** with a light sweep → **SMALL THINGS. BIG WORLDS.** | Low bloom, glass "ting", santur tail |

### Replay hook
The end card's expanding gold ring is the drop's ripple. The last frame dissolves into a ring at the same screen position as the tea surface in frame 0, so the loop reads as one continuous gesture.

## Typography (no other on-screen text)
- `ORDINARY IS BORING.` Inter SemiBold, tracked +0.32 em, cream `#F3E6CC`, top third (inside the Reels safe zone)
- `ROYAGRAM` Cormorant Garamond SemiBold, tracked +0.2 em, gold gradient
- `SMALL THINGS. BIG WORLDS.` Inter Medium, tracked +0.42 em, cream
- Safe zone: nothing important above 220 px or below 1600 px

## Colour
Deep black `#050302`, amber `#B8560E`, golden tea `#E39A2D`, cream highlight `#F3E6CC`. Grade: ACES filmic, warm highlights, neutral blacks, light grain, vignette.
