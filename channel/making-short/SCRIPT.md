# How These Shorts Are Made (60 s, cartoon-3d-short skill)

## Facts (all from this project; source: this repository and the channel's own stats)
- Pip & Pebble episodes are not drawn by hand: characters are SVG shapes (circles, ellipses, one curve for the smile), animated with GSAP in HTML (channel/2d-kit, channel/episodes).
- HyperFrames plays the page in headless Chrome and captures every frame at 30 fps, then FFmpeg encodes the MP4.
- The music and sound effects are synthesized from sine waves, noise and plucked-string math (channel/3d-kit/sfx.py); no instruments or samples.
- A 14 s episode renders in about 20 s on this server.
- The channel started posting on 5 Nov 2026; after 16 episodes the most-watched short (1,371 views) is the alarm-clock episode.

## Script (~3.2 words/s)
1. This cartoon frog has never been drawn by hand. Not even once.
2. Every frame of him is a few lines of code.
3. In November, a tiny channel called Pip and Pebble started posting shorts. A frog who rushes. A snail who always wins.
4. First, the frog is built from circles. One for the body, two for the eyes, and one curve for the smile.
5. Then the code tells him where to be, thirty times every second.
6. Then the music. No instruments. Just math. Sine waves, stacked until they sound like a song.
7. Then a browser plays it all, takes a picture of every single frame, and glues them into a video.
8. Luckily, the computer never gets tired.
9. Unluckily, it never gets the joke either.
10. Think of a flipbook. The code draws every page. The browser flips them.
11. Sixteen episodes later, the most watched one is about an alarm clock.
12. And this video? Same recipe. Just a few more pages.
