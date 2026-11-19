# ADAM BARFI | آدم برفی — Black Friday Reel

Black Friday campaign reel for ADAM BARFI. It runs 25.7 s at 1080×1920, 30 fps.
The offer is **up to 30% off**, ordered through **Instagram Direct**.

## Deliverables (`output/`)

| File | What it is |
|---|---|
| `ADAM_BARFI_BlackFriday_Reel_1080x1920.mp4` | Instagram Reel export (H.264 High, CRF 17, AAC 256k, faststart) |
| `ADAM_BARFI_BlackFriday_MASTER.mov` | High-quality master (H.264 CRF 10 picture + 24-bit PCM audio) |
| `STEM_voiceover_fa.wav` | Persian female voiceover only (48 kHz / 24-bit) |
| `STEM_music.wav` | Original music only |
| `STEM_sfx.wav` | Sound design only (impacts, whooshes, risers, shimmer) |
| `MIX_full.wav` | Final mix, −14 LUFS / −1 dBTP |

## Source material used

- `assets/footage/storefront.mp4`: the main footage (21.9 s, 464×848). It shows the burgundy velvet garland, the tree, the ADAM BARFI sign and the flower storefront.
- `assets/footage/fur_coat_mirror.mp4`: a 13.3 s mirror clip of the faux-fur coat. It is used as fashion inserts.
- `assets/photos/*`: 8 product photos. They are used as runway-style inserts.

Nothing has been generated or invented. There are no fictional products, models, prices, testimonials or usernames.

## Footage rescue: what was kept and what was cut

| Source | Kept | Cut and why |
|---|---|---|
| storefront 0.1–1.2 s | Opening hook: velvet garland, slowed to 0.7× | — |
| storefront 1.3–3.5 s | Background for the 30% reveal, slowed to 0.55× and darkened | — |
| storefront 4.05–5.0 s | Hook, second angle | — |
| storefront 7.0–8.2 s | Brand scene: the tree reveals the sign | — |
| storefront 9.45–11.25 s | Sign fully visible. Used for the brand scene and the end card, with a +1.6° roll fix to level the sign | — |
| storefront 11.3–17.0 s | — | Camera tilt and roll, blur, Gucci boxes in frame |
| storefront 17.2–18.7 s | Wide shot of the flower storefront | 18.7–21.9: glass-door reflections, repeated content |
| fur clip 4.55–5.55 s, 7.0–7.5 s | Coat movement, strongest poses | 0–4.5: walking approach. 8–13: repeated poses and pull-back |

Processing (`src/01_prep_footage.sh`):
- Two-pass vid.stab with gentle smoothing, so the real camera move is kept.
- Temporal denoise.
- Lanczos upscale and mild sharpening.

The grade is a filmic S-curve with lifted blacks and rolled-off highlights:
- Burgundy shadows and champagne highlights.
- Saturation pulled down a little on the very magenta store footage.
- Vignette and fine film grain.

Slow motion uses frame blending. The only zooms are gentle push-ins of 3–8%.

## Edit at 120 BPM (beat = 0.5 s, every cut is on the grid)

| Time | Scene | Picture | Text | VO |
|---|---|---|---|---|
| 0.0–3.2 | 01 Hook | black frame, then velvet garland in slow motion | **BLACK / FRIDAY.** | یه فرصت خاص… |
| 3.2–7.2 | 02 Brand | tree → ADAM BARFI sign, light sweep | ADAM BARFI · آدم برفی · THE BLACK FRIDAY EDITION | بلک فرایدی آدم برفی شروع شد! |
| 7.2–12.2 | 03 Fashion | storefront, fur coat, 4 product inserts with punch-in cuts | YOUR STYLE. / YOUR MOMENT. · این بلک فرایدی… · STYLE GETS COLDER. / THE DEALS GET HOTTER. | (music) |
| 12.2–18.2 | 04 Discount | velvet garland, darkened, then product montage | BLACK FRIDAY → UP TO → **30 % OFF** · تا ۳۰٪ تخفیف ویژه | با تخفیف‌های ویژه، تا سی درصد… / وقتشه… |
| 18.2–25.7 | 05 CTA | the ADAM BARFI sign (bookend) | full lockup + برای سفارش، همین حالا دایرکت بده + Direct pill | برای سفارش… / آدم برفی؛ استایل تو، انتخاب تو. |

The "30" lands on the spoken «سی». The voice timing was checked with Whisper word timestamps.
The end card is fully on screen from about 20.4 s, so it stays readable for over 5 seconds.
All key text sits inside the Instagram Reels safe area: nothing important below y≈1540 or behind the right-hand icons.

## Instagram username slot

The CTA leaves a reserved line under the "ORDER VIA INSTAGRAM DIRECT" pill. No username was invented.
To add the real handle, re-render the picture and re-export:

```bash
HANDLE=@your_real_handle python3 src/render.py && ./src/03_export.sh
```

## Rebuild from scratch (editable project)

```bash
pip install opencv-python-headless scipy soundfile pillow numpy piper-tts
./src/01_prep_footage.sh      # stabilise / denoise / upscale -> build/
./src/00_voiceover.sh         # Persian VO (Piper, fa_IR-magnoliasis, female) -> audio/vo/
python3 src/02_audio.py       # music + sfx + VO processing + mix -> audio/
python3 src/render.py         # picture -> build/picture.mp4   (--stills 5.5,14.5 for QC frames)
./src/03_export.sh            # deliverables -> output/
```

- `src/timeline.py`: the edit decision list (shots, speeds, zooms, VO placement). Change it to re-cut.
- `src/render.py`: grade, typography, motion graphics and transitions. All text elements are in `build_graphics()`.
- `src/02_audio.py`: the music arrangement and sound design.
- To use a human voice actor, put `vo1.wav … vo6.wav` (same lines as `audio/voiceover_script.txt`) in `audio/vo/` and re-run `02_audio.py` and `03_export.sh`.

## Music and fonts licensing

- The music comes in two parts.
  - 0–7 s, Christmas: *Deck the Halls*, a public-domain carol, on music box, piano, glockenspiel and sleigh bells.
  - From 7.2 s, after a riser and snare build: a high-energy original electro-house track in G minor. It has a four-on-the-floor beat with sidechain pump, rolling 16th-note bass, supersaw stabs and a lead hook. The bigger second drop lands on the 30% hit.
  - Every sound is synthesised in `src/02_audio.py` with no samples, so there are no copyright claims.
- The default cut has no narration: music, sound effects and Persian on-screen text only. `NARRATION=1` restores the voiceover version.
- The voice is Piper TTS `fa_IR-magnoliasis-medium`. See that model's card on Hugging Face for its licence.
- The fonts are Playfair Display, Cormorant Garamond, Montserrat and Vazirmatn. All are under the SIL Open Font License.
