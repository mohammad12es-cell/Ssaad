# EP01 · Scene breakdown and AI prompts

> Time column is based on a 12 min cut; at the current ~7 min script, scale each time by 0.6.

**Do not generate yet.** These are image and video prompts. Paid generation needs approval first.

## Global style block (prepend to EVERY prompt)
> Ink-and-watercolor archival illustration, muted sepia and slate-blue palette, visible paper grain, loose ink linework, a single accent of signal red only where noted, cinematic 16:9 composition, soft volumetric light, no text, no logos, not photorealistic.

Negative: `photorealistic, photo, modern objects, text, watermark, extra fingers, distorted faces, gore`

## Character consistency
- **James Ducat:** ~40s, full dark beard flecked grey, heavy navy keeper's jacket with brass buttons, peaked cap.
- **Thomas Marshall:** late 20s, clean-shaven, narrow face, flat cap, grey wool jersey.
- **Donald MacArthur:** ~40s, broad build, ginger moustache, rolled sleeves, waistcoat, no coat.
- **Joseph Moore:** young, slight, worried eyes, long oilskin coat, carrying a lantern.
- **Muirhead:** older, white side-whiskers, black frock coat, notebook.

Generate a **character sheet** (front / three-quarter / profile) for each person first. Reuse it as the reference image (character reference / image-to-video) in every scene. Keep faces small or in shadow, which hides drift and suits the mood.
**These are illustrations, not portraits** of the real men (no verified photos are used). Put an "Illustration" lower-third on the first appearance.

## Camera legend
`PUSH` slow push-in · `PAN-L/R` lateral pan · `TILT-U/D` · `PARALLAX` 2.5D layer split · `HOLD` static with drifting particles. Default clip: 4–6s.
Execution: AI stills → 2.5D parallax/zoom in HyperFrames (cheapest). Use an image-to-video model only for the ★ shots.

| S | Time | Visual prompt (after the style block) | Camera | SFX / music |
|---|---|---|---|---|
| 1 | 0:00 | Dim lighthouse kitchen, wooden chair tipped over on flagstones, plate with half-eaten bread, oil lamp guttering; red accent on the tipped chair | PUSH ★ | Low drone, wind through a gap, a single clock tick |
| 2 | 0:10 | Tiny lighthouse atop a black rock in a vast stormy Atlantic, aerial view, dusk | PULL-BACK | Waves, rising strings pad |
| 3 | 0:20 | The same kitchen image, desaturating into paper; red ink strike-through lines draw across the chair and plate | HOLD + ink animation (HyperFrames) | Music cuts to silence, a pen scratch |
| 4 | 0:35 | Archive desk: folder labeled only with a red wax seal, hands opening it | TILT-D | Paper rustle, title sting |
| 5 | 0:45 | Map of the Outer Hebrides in ink, a red dotted line from Lewis to the Flannans | PAN-R | Soft piano motif (theme) |
| 6 | 1:10 | Lighthouse on the summit of Eilean Mòr, first beam sweeping at night, 1899 | PUSH | Distant foghorn |
| 7 | 1:30 | Three keepers lined up outside the tower door (use the character sheets), overcast | PARALLAX | Wind, gulls |
| 8 | 1:55 | Small rowing boat battling swell below sheer cliffs | PAN-L ★ | Heavy swell, oars |
| 9 | 2:20 | Ink diagram of the island with two landing points labeled by red markers (labels added in HyperFrames) | PUSH on the west marker | A low "plant" tone |
| 10 | 3:00 | Steamship at night, deck crew looking at a dark silhouette of the tower with no light | PAN-R ★ | Ship engine, sea |
| 11 | 3:30 | Telegraph office / harbour at Leith, papers passed hand to hand | HOLD | Telegraph clicks |
| 12 | 3:55 | Steam tender Hesperus pinned in harbour by storm waves | PUSH | Storm, rain |
| 13 | 4:20 | Captain on deck, a flare arcing over an unanswered island | TILT-U | Horn blast, rocket hiss, then silence |
| 14 | 4:40 | Joseph Moore climbing steep stone steps alone, lantern in hand | TILT-U | Footsteps, wind |
| 15 | 5:00 | Interior, cold empty hearth, neat bunks, grey light | slow PAN-L | Room tone, a single drip |
| 16 | 5:15 | A hallway hook with ONE oilskin coat (red accent), two empty hooks | PUSH ★ | Heartbeat-like low thud |
| 17 | 5:30 | Three small figures searching cliff tops in wind | PARALLAX | Shouted names fading |
| 18 | 5:40 | The archive folder; two stacks of paper labeled LEGEND / RECORD (labels in HyperFrames) | HOLD | Music shift to investigative pulse |
| 19 | 6:00 | 1910s book page with a poem shape (unreadable text), ink drawing of a tipped chair | PUSH | Page turn |
| 20 | 6:40 | Old logbook with frantic handwriting (illegible), candle | PUSH | Pen scratching faster |
| 21 | 7:05 | Slate with chalk weather marks beside a calm, neat logbook; red stamp "NO RECORD" (HyperFrames overlay) | HOLD | Stamp thud |
| 22 | 7:30 | Split image: left a raging storm, right the same sea calm under stars | WIPE L→R | Storm cutting to calm |
| 23 | 7:50 | Montage recap: empty station, one coat, map pin on the west landing | Quick cuts (1.5s) | Theme motif |
| 24 | 8:00 | Muirhead stepping off a boat, notebook in hand | PAN-R | Gulls, boots on rock |
| 25 | 8:30 | West landing: bent iron railings, a broken crane, ropes strewn over high rocks | slow PUSH ★ | Low swell, metal creak |
| 26 | 9:10 | Typed report page (illegible) dated January 1901; a red underline animates | HOLD | Typewriter keys |
| 27 | 9:40 | Reconstruction: two keepers in oilskins at the landing, a third running down the steps in shirtsleeves | PARALLAX ★ | Rising wind |
| 28 | 10:05 | A towering wave over the landing, figures small, silhouetted | PUSH ★ (no gore, no bodies) | Massive wave, then silence |
| 29 | 10:30 | Empty lighthouse at dawn, a door ajar | HOLD | Sparse piano |
| 30 | 11:00 | Open sea, nothing on the water | PULL-BACK | Waves |
| 31 | 11:20 | Three silhouettes on the gallery of the lighthouse, looking out, warm light | PUSH | Theme, full |
| 32 | 11:35 | Lighthouse beam sweeping across the camera | HOLD | Swell of strings |
| 33 | 11:45 | Modern-era lighthouse still shining, stars | PULL-BACK | Soft resolve |
| 34 | 11:55 | Archive folder closes; "Case 01 closed?" text (HyperFrames) | HOLD | End sting |

## Music and sound
- **Music:** a single recurring piano + low-strings theme. Sources: the YouTube Audio Library (check the attribution column) or a licensed library (Artlist / Epidemic Sound, keep the licence certificate in `copyright-checks/ep01/`). Our own synthesized pads are also fine.
- **SFX:** licensed packs or the YouTube Audio Library. Log each pack.
- **Mix:** narration at −14 LUFS integrated for the final master. Duck music −12 dB under the VO.
