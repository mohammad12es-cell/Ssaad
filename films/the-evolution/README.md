# THE EVOLUTION — Chapter 27

A 130-second vertical (1080×1920, 30 fps) cinematic birthday film made in HyperFrames.

| Time | Chapter | What you see |
|---|---|---|
| 0–17 s | I · The Collapse | Black opening with a ball bouncing and fading away, then the real court photo (cold grade, dust in the arena light). He recedes into the dark. |
| 17–35 s | II · The Physical Rebirth | Gym ceiling lights switch on one by one. Photo 1 (the slimmer physique) is aligned to photo 2 (the current physique), and a warm light front sweeps up the frame to transform one into the other. Then detail punch-ins on the beat: *Consistency · Patience · Control*. |
| 35–55 s | III · The Mind That Never Stops | 03:00 → 03:47 on an amber clock, moonlight through the blinds, racing thoughts and a heartbeat. *He gets up.* A walk down a wet night street toward the city lights. |
| 55–77 s | IV · The Pursuit of Knowledge | A biomechanics analysis of a volleyball spike jump: joint angles, muscles that light up as they activate, a ground-reaction-force curve. Then a neural-network universe (neuroscience → AI) and a constellation of subjects collapsing into one point of light. |
| 77–95 s | V · The Invisible Battle | A notebook of unfinished ideas, rain on a window at 04:12, *Is this the right direction?* Then a 06:00 alarm: *Wake · Train · Learn · Build · Try again.* |
| 95–112 s | VI · Beyond the Old Identity | An accelerating intercut of every chapter under *The Athlete · Student · Creator · Thinker · Seeker · Builder*. It ends on the current photo in warm light. |
| 112–130 s | Final | *I am not chasing who I was.* / *I am building who I could become.* / **CHAPTER 27 — THE EVOLUTION** |

The only images of the protagonist are the two real photographs in `assets/`. No face or body is generated. Everything else is drawn procedurally, frame by frame, in `index.html`. The score and sound design are original, synthesized by `tools/score.py`.

## Commands

```bash
cd films/the-evolution
npm run score     # rebuild assets/score.wav from tools/score.py (numpy + ffmpeg)
npx hyperframes snapshot --at 5,25,60,108   # check frames
npm run check     # lint + runtime checks
npm run render    # → output/the-evolution-chapter27.mp4 (delivery quality)
```
