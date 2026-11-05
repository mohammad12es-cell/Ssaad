# EP05 (3D cinematic): "First come, first served" 🥬

Matches the reference video's style: Pixar-like 3D, cinematic 16:9 shots inside a vertical 9:16 frame, a fixed meme caption on top, golden-hour light, fast cuts, music only, a twist ending.

## Format
- Final video: 1080×1920. A 16:9 picture in the middle, black bars above and below.
- Fixed top caption, white bold text on black, shown the whole time:
  **"When the buffet says 'first come, first served' 🥬"**
- 16 shots × 3–4 s ≈ 55 s. Generate every shot in **16:9**.
- Sound: an epic trailer-style instrumental and SFX, no dialogue.

## Step 1: character reference images (generate first, reuse in every shot)
Style tag to append to every prompt:
`Pixar-style 3D animation, cinematic lighting, golden hour, shallow depth of field, highly detailed, expressive cartoon character, 16:9`

**PIP:** `A cute chubby green frog character named Pip, big round glossy eyes on top of his head, pink cheeks, wide smile, light-green belly, small arms and legs, energetic and impulsive personality, wearing a tiny red racing headband, full body, neutral background` + style tag

**PEBBLE:** `A cute small snail character named Pebble, soft yellow body, glossy coral-red spiral shell, long eye stalks, calm confident smirk, wearing tiny black sunglasses, cool laid-back personality, full body, neutral background` + style tag

**OFFICER BEETLE:** `A big muscular brown beetle police officer, huge black mustache, aviator sunglasses, blue police cap with gold badge, arms crossed, holding a red STOP sign, grumpy` + style tag

## Step 2: shots (image-to-video; attach the character reference)
| # | Sec | Shot | Prompt |
|---|---|---|---|
| 1 | 3 | Hook: phone close-up | Close-up of a tiny leaf-shaped smartphone lying on moss, a notification pops up: "🥬 FREE LETTUCE BUFFET – first come, first served!", warm bokeh garden background |
| 2 | 3 | Pebble reads it | Extreme close-up of Pebble the snail's eyes on stalks widening, sunglasses sliding down his nose, reflection of the phone screen in the lenses |
| 3 | 3 | Pip reads it | Pip the frog in his lily-pad house reading the same phone, slowly turns to camera with a determined competitive look, dramatic rim light |
| 4 | 3 | Pip ties headband | Slow-motion close-up of Pip tying a red headband, sunset light, epic heroic mood |
| 5 | 3 | Pip launches | Pip the frog leaps off his lily pad at super speed, water splash explodes behind him, motion blur, camera low angle |
| 6 | 4 | Garden road chase | Tracking shot following Pip hopping super fast along a dirt garden path between giant flowers, dust trail, golden hour sun flare |
| 7 | 3 | Pebble is calm | Pebble the snail calmly puts on his sunglasses, smirks at camera, completely relaxed while dust from Pip settles around him |
| 8 | 3 | Slow-mo ladybug | Ultra slow-motion low-angle shot: a tiny ladybug slowly crossing the dirt path, a blade of grass in focus, Pip skidding to a stop in the background, dust cloud |
| 9 | 3 | Officer Beetle | Officer Beetle steps out with arms crossed holding a STOP sign, whistle in mouth, mustache twitching, heroic low angle |
| 10 | 3 | Pip begs | Pip the frog pleading with puppy eyes in front of the giant beetle cop, sweat drop, comedic |
| 11 | 3 | SHELL MODE | Pebble pulls into his shell, the shell glows and starts spinning, sparks and wind, epic power-up moment, camera orbit |
| 12 | 4 | Shell jump | Pebble's spinning shell races down the path with a fire trail, ramps off a pebble and flies over Pip and Officer Beetle in slow motion, both look up with jaws dropped |
| 13 | 3 | Arrival | The spinning shell drifts and skids to a perfect stop in front of a red mushroom house, Pebble pops out wearing sunglasses |
| 14 | 4 | Door opens | The mushroom house door opens, warm golden light pours out revealing a glowing mountain of fresh lettuce, sparkles, angelic mood |
| 15 | 4 | Twist | Pip bursts through the door panting, sees an empty plate; Pebble sits on top with a round full belly, smiles and lets out a big burp |
| 16 | 4 | Loop | Close-up of the leaf phone buzzing again: "🥬 Buffet REFILLED!". Pip's and Pebble's eyes snap to each other, cut to black |

## Step 3: assembly (Claude does this)
Send the 16 clips back. Claude cuts them, adds the black bars and the fixed caption, an original trailer-style score and SFX, and exports a 1080×1920 video for YouTube Shorts and Instagram Reels.

## Tools that can generate the clips (from a phone)
- **Syntx.ai** (the reference video was made with it; works in Telegram)
- **Kling AI** or **Hailuo (MiniMax)** mobile apps
- vidIQ generate_video (≈16 credits/second, so a ~55 s film ≈ 900 credits)
